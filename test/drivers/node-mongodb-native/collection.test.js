
/**
 * Module dependencies.
 */

var start = require('../../common')
  , mongoose = start.mongoose
  , should = require('should')
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

module.exports = {

  'test that trying to implement a sparse index works': function () {
    var db = start()
      , NativeTestCollection = db.model('NativeDriverTest');

    NativeTestCollection.collection.ensureIndex({ title: 1 }, { sparse: true }, function (err) {
      should.strictEqual(!!err, false);
      NativeTestCollection.collection.getIndexes(function (err, indexes) {
        db.close();
        should.strictEqual(!!err, false);
        indexes.should.be.instanceof(Object);
        indexes['title_1'].should.eql([['title', 1]]);
      });
    });
  },

  'test that the -native traditional ensureIndex spec syntax for fields works': function () {
    var db = start()
      , NativeTestCollection = db.model('NativeDriverTest');

    NativeTestCollection.collection.ensureIndex([['a', 1]], function () {
      db.close();
    });
  },

  'unique index fails passes error': function () {
    var db = start()
      , schema = new Schema({ title: String })
      , NativeTestCollection = db.model('NativeDriverTestUnique', schema)

    NativeTestCollection.create({ title: 'x' }, {title:'x'}, function (err) {
      should.strictEqual(!!err, false);

      NativeTestCollection.collection.ensureIndex({ title: 1 }, { unique: true }, function (err) {
        ;/E11000 duplicate key error index/.test(err.message).should.equal(true);

        db.close();
      });
    });
  }
};
