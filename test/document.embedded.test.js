
/**
 * Module dependencies.
 */

var start = require('./common')
  , mongoose = start.mongoose
  , assert = require('assert')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId
  , Document = require('../lib/document')
  , EmbeddedDocument = require('../lib/types/embedded')
  , DocumentObjectId = mongoose.Types.ObjectId;


/**
 * Setup
 */

var CatSchema = new Schema({
  name: String
});

var CatOwnerSchema = new Schema({
  name: String,
  cats: [CatSchema]
});

var modelName = 'document.embedded.catowner';
mongoose.model(modelName, CatOwnerSchema);

var changedName = 'Changed name';

/**
 * This method will replace the doc collection's update method and notify the callback with the match and update params.
 * After being executed once, it will restore the original method.
 */

var buildUpdateReplacement = function (doc, callback) {
  var oldUpdate = doc.collection.update;
  doc.collection.update = function (match, update, options, cb) {
    callback(match, update);
    doc.collection.update = oldUpdate;
    oldUpdate.bind(doc.collection).apply(doc, arguments);
  }
};

/**
 * This method returns a saved document like this: { name: 'John Doe', cats: [ { name: 'Kitty 1' }, { name: 'Kitty 2' } ] }
 */
var saveSampleDocument = function (done) {
  var db = start()
    , M = db.model(modelName);

  var doc = new M;

  doc.name = 'John Doe';
  doc.cats.push(doc.cats.create({ name: 'Kitty 1' }));
  doc.cats.push(doc.cats.create({ name: 'Kitty 2' }));

  doc.save(function (err) {
    done(err, db, M, doc);
  });
};

/**
 * Test
 */

describe('saving', function () {
  describe('an embedded document', function () {
    it('should save changes by locating its id', function (done) {
      saveSampleDocument(function (err, db, M, doc) {
        assert.ifError(err);
        var firstCat = doc.cats[0];
        var catId = firstCat.id;
        firstCat.name = changedName;
        var matchSent, updateSent, called;
        buildUpdateReplacement(doc, function (match, update) {
          called = true;
          matchSent = match;
          updateSent = update;
        });
        firstCat.save(function (err) {
          assert.equal(true, called);
          assert.equal(catId, matchSent['cats._id']);
          assert.equal(1, Object.keys(updateSent).length);
          assert.equal('$set', Object.keys(updateSent)[0]);
          assert.equal(1, Object.keys(updateSent.$set).length);
          assert.equal('cats.$.name', Object.keys(updateSent.$set)[0]);
          assert.equal(changedName, updateSent.$set['cats.$.name']);
          M.findById(doc.id, function (err, foundDoc) {
            db.close();
            assert.ifError(err);
            assert.equal(doc.id, foundDoc.id);
            assert.equal(changedName, foundDoc.cats[0].name);
            done();
          });
        });
      });
    });

    it('should leave other paths untouched when saving', function (done) {
      saveSampleDocument(function (err, db, M, doc) {
        assert.ifError(err);
        var newName = 'John';
        doc.name = newName;
        var firstCat = doc.cats[0];
        firstCat.name = changedName;
        firstCat.save(function (err) {
          assert.ifError(err);
          assert.equal(1, doc.modifiedPaths().length);
          assert.equal('name', doc.modifiedPaths()[0]);
          M.findById(doc.id, function (err, foundDoc) {
            db.close();
            assert.ifError(err);
            assert.equal(doc.id, foundDoc.id);
            assert.notEqual(newName, foundDoc.name);
            done();
          });
        });
      });
    });

    it('should include an error in the callback function when is new', function (done) {
      var db = start()
        , M = db.model(modelName);

      var doc = new M;

      doc.name = 'John Doe';
      doc.cats.push(doc.cats.create({ name: 'Kitty 1' }));
      doc.cats[0].save(function (err) {
        db.close();
        assert.notEqual(err, null);
        done();
      });
    });

    describe('upon an external change in its array element position', function () {
      it('should still save the correct embedded document', function (done) {
        saveSampleDocument(function (err, db, M, doc) {
          assert.ifError(err);
          var lotOfCats = [];
          for (var i = 0; i < 1000; i++) {
            lotOfCats.push({ _id: new DocumentObjectId(), name: 'Kitten ' + (1000 + i) });
          }
          M.collection.update({ _id: doc._id }, { $push: { cats: { $each: lotOfCats, $position: 0 } } }, function (err, modified) {
            assert.ifError(err);
            assert.equal(1, modified);
            var firstCat = doc.cats[0];
            firstCat.name = changedName;
            firstCat.save(function (err) {
              assert.ifError(err);
              M.findById(doc.id, function (err, foundDoc) {
                db.close();
                assert.ifError(err);
                assert.equal(doc.id, foundDoc.id);
                assert.equal(changedName, foundDoc.cats.id(firstCat.id).name);
                done();
              });
            });
          });
        });
      });
    });
  });

  afterEach(function (done) {
    var db = start()
      , M = db.model(modelName);

    M.collection.remove({}, function (err) {
      assert.ifError(err);
      db.close();
      done();
    })
  });
});
