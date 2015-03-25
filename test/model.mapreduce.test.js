
/**
 * Test dependencies.
 */

var start = require('./common')
  , mongoose = start.mongoose
  , assert = require('assert')
  , random = require('../lib/utils').random
  , Query = require('../lib/query')
  , Schema = mongoose.Schema
  , SchemaType = mongoose.SchemaType
  , ObjectId = Schema.Types.ObjectId
  , DocumentObjectId = mongoose.Types.ObjectId
  , DocumentArray = mongoose.Types.DocumentArray
  , EmbeddedDocument = mongoose.Types.Embedded
  , MongooseArray = mongoose.Types.Array
  , MongooseError = mongoose.Error;

/**
 * Setup.
 */

var Comments = new Schema();

Comments.add({
    title     : String
  , date      : Date
  , body      : String
  , comments  : [Comments]
});

var BlogPost = new Schema({
    title     : String
  , author    : String
  , slug      : String
  , date      : Date
  , meta      : {
        date      : Date
      , visitors  : Number
    }
  , published : Boolean
  , mixed     : {}
  , numbers   : [Number]
  , owners    : [ObjectId]
  , comments  : [Comments]
});


var collection = 'mapreduce_' + random();
mongoose.model('MapReduce', BlogPost);

describe('model: mapreduce:', function(){
  it('works', function(done){
    var db = start()
      , MR = db.model('MapReduce', collection)

    var magicID;
    var id = new mongoose.Types.ObjectId;
    var authors = 'aaron guillermo brian nathan'.split(' ');
    var num = 10;
    var docs = [];
    for (var i = 0; i< num; ++i)
      docs.push({ author: authors[i%authors.length], owners: [id], published: true });

    MR.create(docs, function (err, insertedDocs) {
      assert.ifError(err);

      var a = insertedDocs[0];
      var b = insertedDocs[1];
      magicID = b._id;

      var o = {
          map: function () { emit(this.author, 1) }
        , reduce: function (k, vals) { return vals.length }
      }

      MR.mapReduce(o, function (err, ret, stats) {
        assert.ifError(err);
        assert.ok(Array.isArray(ret));
        assert.ok(stats);
        ret.forEach(function (res) {
          if ('aaron' == res._id) assert.equal(3, res.value);
          if ('guillermo' == res._id) assert.equal(3, res.value);
          if ('brian' == res._id) assert.equal(2, res.value);
          if ('nathan' == res._id) assert.equal(2, res.value);
        });

        var o = {
            map: function () { emit(this.author, 1) }
          , reduce: function (k, vals) { return vals.length }
          , query: { author: 'aaron', published: 1, owners: id }
        }

        MR.mapReduce(o, function (err, ret, stats) {
          assert.ifError(err);

          assert.ok(Array.isArray(ret));
          assert.equal(1, ret.length);
          assert.equal('aaron', ret[0]._id);
          assert.equal(3, ret[0].value);
          assert.ok(stats);

          modeling();
        });
      });

      function modeling () {
        var o = {
            map: function () { emit(this.author, { own: magicID }) }
          , scope: { magicID: magicID }
          , reduce: function (k, vals) { return { own: vals[0].own, count: vals.length }}
          , out: { replace: '_mapreduce_test_' + random() }
        }

        MR.mapReduce(o, function (err, ret, stats) {
          assert.ifError(err);

          // ret is a model
          assert.ok(!Array.isArray(ret));
          assert.equal('function', typeof ret.findOne);
          assert.equal('function', typeof ret.mapReduce);

          // queries work
          ret.where('value.count').gt(1).sort({_id: 1}).exec(function (err, docs) {
            assert.ifError(err);
            assert.equal('aaron', docs[0]._id);
            assert.equal('brian', docs[1]._id);
            assert.equal('guillermo', docs[2]._id);
            assert.equal('nathan', docs[3]._id);

            // update casting works
            ret.findOneAndUpdate({ _id: 'aaron' }, { published: true }, { 'new': true }, function (err, doc) {
              assert.ifError(err);
              assert.ok(doc);
              assert.equal('aaron', doc._id);
              assert.equal(true, doc.published);

              // ad-hoc population works
              ret
              .findOne({ _id: 'aaron' })
              .populate({ path: 'value.own', model: 'MapReduce' })
              .exec(function (err, doc) {
                db.close();
                assert.ifError(err);
                assert.equal('guillermo', doc.value.own.author);
                done();
              })
            });
          });
        });
      }
    });
  })

  it('withholds stats with false verbosity', function(done){
    var db = start()
      , MR = db.model('MapReduce', collection)

    var o = {
        map: function () {}
      , reduce: function () { return 'test' }
      , verbose: false
    }

    MR.mapReduce(o, function (err, results, stats){
      assert.equal('undefined', typeof stats);
      db.close(done);
    });
  });

  describe('promises (gh-1628)', function () {
    it('are returned', function(done){
      var db = start()
        , MR = db.model('MapReduce', collection)

      var o = {
          map: function () {}
        , reduce: function () { return 'test' }
      }

      var promise = MR.mapReduce(o, function(){});
      assert.ok(promise instanceof mongoose.Promise);

      db.close(done);
    });

    it('allow not passing a callback', function(done){
      var db = start()
        , MR = db.model('MapReduce', collection)

      var o = {
          map: function () { emit(this.author, 1) }
        , reduce: function (k, vals) { return vals.length }
        , query: { author: 'aaron', published: 1 }
      }

      function validate (ret, stats) {
        assert.ok(Array.isArray(ret));
        assert.equal(1, ret.length);
        assert.equal('aaron', ret[0]._id);
        assert.equal(3, ret[0].value);
        assert.ok(stats);
      }

      function finish () {
        db.close(done);
      }

      var promise;

      assert.doesNotThrow(function(){
        promise = MR.mapReduce(o);
      })

      promise.then(validate, assert.ifError).then(finish).end();
    })

  });
});
