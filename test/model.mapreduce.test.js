
/**
 * Test dependencies.
 */

var start = require('./common')
  //, should = require('should')
  , mongoose = start.mongoose
  , assert = require('assert')
  , random = require('../lib/utils').random
  , Query = require('../lib/query')
  , Schema = mongoose.Schema
  , SchemaType = mongoose.SchemaType
  , CastError = SchemaType.CastError
  , ValidatorError = SchemaType.ValidatorError
  , ValidationError = mongoose.Document.ValidationError
  , ObjectId = Schema.ObjectId
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

module.exports = {

  'test map reduce': function () {
    var db = start()
      , MR = db.model('MapReduce', collection)

    var authors = 'aaron guillermo brian nathan'.split(' ');
    var num = 10;
    var docs = [];
    for (var i = 0; i< num; ++i)
      docs.push({ author: authors[i%authors.length] });

    //mongoose.set('debug', true);
    MR.create(docs, function (err) {
      if (err) throw err;

      var o = {
          map: function () { emit(this.author, 1) }
        , reduce: function (k, vals) { return vals.length }
      }

      MR.mapReduce(o, function (err, ret, stats) {
        if (err) throw err;
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
          , query: { author: 'aaron' }
        }

        MR.mapReduce(o, function (err, ret, stats) {
          if (err) throw err;

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
            map: function () { emit(this.author, 1) }
          , reduce: function (k, vals) { return vals.length }
          , out: { replace: '_mapreduce_test_' + random() }
        }

        MR.mapReduce(o, function (err, ret, stats) {
          if (err) throw err;

          // ret is a model
          assert.ok(!Array.isArray(ret));
          assert.equal('function', typeof ret.findOne);
          assert.equal('function', typeof ret.mapReduce);

          // queries work
          ret.where('value').gt(1).sort({_id: 1}).exec(function (err, docs) {
            if (err) throw err;
            assert.equal('aaron', docs[0]._id);
            assert.equal('brian', docs[1]._id);
            assert.equal('guillermo', docs[2]._id);
            assert.equal('nathan', docs[3]._id);

            // update casting works
            ret.findOneAndUpdate({ _id: 'aaron' }, { updated: true }, function (err, doc) {
              db.close();
              if (err) throw err;
              assert.ok(doc);
              assert.equal('aaron', doc._id);
              assert.equal(true, doc.updated);
            });
          });
        });
      }
    });

  }

}
