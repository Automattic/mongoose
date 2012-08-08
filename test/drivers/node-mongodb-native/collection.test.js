
/**
 * Module dependencies.
 */

var start = require('../../common')
  , assert = require('assert')
  , mongoose = start.mongoose
  , Schema = mongoose.Schema;

/**
 * Setup.
 */

mongoose.model('NativeDriverTest', new Schema({
    title: String
}));

/**
 * Test.
 */

describe('drivers: native:', function(){

  it('sparse index works', function(done){
    var db = start()
      , NativeTestCollection = db.model('NativeDriverTest');

    NativeTestCollection.collection.ensureIndex({ title: 1 }, { sparse: true }, function (err) {
      assert.ifError(err);
      NativeTestCollection.collection.getIndexes(function (err, indexes) {
        db.close();
        assert.ifError(err);
        assert.ok(indexes instanceof Object);
        assert.deepEqual(indexes.title_1, [['title', 1]]);
        done();
      });
    });
  });

  it('traditional ensureIndex spec syntax for fields works', function(done){
    var db = start()
      , NativeTestCollection = db.model('NativeDriverTest');

    NativeTestCollection.collection.ensureIndex([['a', 1]], function () {
      db.close();
      done();
    });
  });

  it('unique index failure passes error', function(done){
    var db = start()
      , schema = new Schema({ title: String })
      , NativeTestCollection = db.model('NativeDriverTestUnique', schema)

    NativeTestCollection.create({ title: 'x' }, {title:'x'}, function (err) {
      assert.ifError(err);

      NativeTestCollection.collection.ensureIndex({ title: 1 }, { unique: true, safe: true }, function (err) {
        db.close();
        assert.ok(/E11000 duplicate key error index/.test(err.message));
        done();
      });
    });
  })

})
