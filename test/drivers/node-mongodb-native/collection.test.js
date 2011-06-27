
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
  }

};
