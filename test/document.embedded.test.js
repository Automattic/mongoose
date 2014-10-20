
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
 *
 */

var createModelWithPreHook = function (modelName, parentCallback, childCallback, otherChildCallback) {
  var childSchema = new Schema({ name: String});
  var otherChildSchema = new Schema({ name: String});
  var parentSchema = new Schema({ name: String, children: [childSchema], otherChildren: [otherChildSchema] });

  childSchema.pre('save', function (next) {
    if (childCallback)
      childCallback();
    next();
  });

  otherChildSchema.pre('save', function (next) {
    if (otherChildSchema)
      otherChildSchema();
    next();
  });

  parentSchema.pre('save', function (next) {
    if (parentCallback)
      parentCallback();
    next();
  });
  mongoose.model(modelName, parentSchema);
};

/**
 * Test
 */

describe('saving', function () {
  describe('a document with an embedded schema', function () {
    it('should save the whole document as always', function (done) {
      saveSampleDocument(function (err, db, M, doc) {
        assert.ifError(err);
        doc.name = changedName;
        doc.cats[0].name = changedName;
        doc.cats[1].name = changedName;
        var called = false
          , sentUpdate;
        buildUpdateReplacement(doc, function (match, update) {
          assert.equal(called, false);
          called = true;
          sentUpdate = update;
        });
        doc.save(function (err, doc) {
          assert.ifError(err);
          assert.equal(doc.isModified(), false);
          M.findById(doc.id, function (err, doc) {
            db.close();
            assert.ifError(err);
            assert.equal(doc.name, changedName);
            assert.equal(doc.cats[0].name, changedName);
            assert.equal(doc.cats[1].name, changedName);
            done();
          });
        });
      });
    });
  });

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
          assert.ifError(err);
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
      var mongo26_or_greater = false;

      before(function(done) {
        start.mongodVersion(function (err, version) {
          assert.ifError(err);
          mongo26_or_greater = 2 < version[0] || (2 == version[0] && 6 <= version[1]);
          done();
        });
      });

      it('should still save the correct embedded document', function (done) {
        saveSampleDocument(function (err, db, M, doc) {
          assert.ifError(err);
          var lotOfCats = [];
          for (var i = 0; i < 1000; i++) {
            lotOfCats.push({ _id: new DocumentObjectId(), name: 'Kitten ' + (1000 + i) });
          }
          var update = {};
          if (mongo26_or_greater) {
            update = { $push: { cats: { $each: lotOfCats, $position: 0 } } };
          } else {
            lotOfCats.push(doc.cats[0].toObject());
            lotOfCats.push(doc.cats[1].toObject());
            update = { $set: { cats: lotOfCats } };
          }
          M.collection.update({ _id: doc._id }, update, function (err, modified) {
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

  describe('should trigger hooks as expected', function () {
    it('should call custom pre hooks for the main document and each modified embedded document', function (done) {
      var parentCalls = 0
        , childCalls = 0
        , modelName = 'document.embedded.pre_hook_test_1';
      createModelWithPreHook(modelName, function () { parentCalls++; }, function () { childCalls++; });

      var db = start()
        , Parent = db.model(modelName);
      var doc = new Parent({ name: 'name', children: [ { name: 'name1' }, { name: 'name2' } ] });
      doc.save(function (err, doc) {
        db.close();
        assert.ifError(err);
        assert.equal(parentCalls, 1, 'only one parent call should have been made (' + parentCalls + ' found)');
        assert.equal(childCalls, 2, 'only two child calls should have been made (' + childCalls + ' found)');
        done();
      });
    });

    it('multiple embedded changes, one embedded save and then a parent document save', function (done) {
      var parentCalls = 0
        , childCalls = 0
        , modelName = 'document.embedded.pre_hook_test_2';
      createModelWithPreHook(modelName, function () { parentCalls++; }, function () { childCalls++; });

      var db = start()
        , Parent = db.model(modelName);
      var doc = new Parent({ name: 'name', children: [ { name: 'name1' }, { name: 'name2' } ] });
      doc.save(function (err, doc) {
        assert.ifError(err);
        parentCalls = childCalls = 0;
        doc.name = changedName;
        doc.children[1].name = changedName;
        doc.children[0].name = changedName;
        doc.children[1].save(function (err) {
          assert.ifError(err);
          assert.equal(parentCalls, 0, 'no parent call should have been made (' + parentCalls + ' found)');
          assert.equal(childCalls, 1, 'only one child call should have been made (' + childCalls + ' found)');
          parentCalls = childCalls = 0;
          doc.save(function (err) {
            db.close();
            assert.ifError(err);
            assert.equal(parentCalls, 1, 'only one parent call should have been made (' + parentCalls + ' found)');
            assert.equal(childCalls, 1, 'only one child call should have been made (' + childCalls + ' found)');
            done();
          });
        });
      });
    });

    it('embedded change, embedded save, twice, and then whole parent document', function (done) {
      var parentCalls = 0
        , childCalls = 0
        , modelName = 'document.embedded.pre_hook_test_3';
      createModelWithPreHook(modelName, function () { parentCalls++; }, function () { childCalls++; });

      var db = start()
        , Parent = db.model(modelName);
      var doc = new Parent({ name: 'name', children: [ { name: 'name1' }, { name: 'name2' } ] });
      doc.save(function (err, doc) {
        assert.ifError(err);
        parentCalls = childCalls = 0;
        doc.name = changedName;
        doc.children[1].name = changedName;
        doc.children[1].save(function (err) {
          assert.ifError(err);
          assert.equal(parentCalls, 0, 'no parent call should have been made (' + parentCalls + ' found)');
          assert.equal(childCalls, 1, 'only one child call should have been made (' + childCalls + ' found)');
          parentCalls = childCalls = 0;
          doc.children[0].name = changedName;
          doc.children[0].save(function (err) {
            assert.ifError(err);
            assert.equal(parentCalls, 0, 'no parent call should have been made (' + parentCalls + ' found)');
            assert.equal(childCalls, 1, 'only one child call should have been made (' + childCalls + ' found)');
            parentCalls = childCalls = 0;
            doc.save(function (err) {
              db.close();
              assert.ifError(err);
              assert.equal(parentCalls, 1, 'only one parent call should have been made (' + parentCalls + ' found)');
              assert.equal(childCalls, 0, 'only one child call should have been made (' + childCalls + ' found)');
              done();
            });
          });
        });
      });
    });

    it('multiple embedded changes', function (done) {
      var parentCalls = 0
        , childCalls = 0
        , modelName = 'document.embedded.pre_hook_test_4';
      createModelWithPreHook(modelName, function () { parentCalls++; }, function () { childCalls++; });

      var db = start()
        , Parent = db.model(modelName);
      var doc = new Parent({ name: 'name', children: [ { name: 'name1' }, { name: 'name2' } ] });
      doc.save(function (err, doc) {
        assert.ifError(err);
        parentCalls = childCalls = 0;
        doc.name = changedName;
        doc.children = [ { name: 'child1' }, { name: 'child2' } ];
        doc.children[1].name = changedName;
        doc.save(function (err) {
          db.close();
          assert.ifError(err);
          assert.equal(parentCalls, 1, 'no parent call should have been made (' + parentCalls + ' found)');
          assert.equal(childCalls, 2, 'only one child call should have been made (' + childCalls + ' found)');
          done();
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
