
/**
 * Module dependencies.
 */

var start = require('../../common')
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

module.exports = {

  'test that trying to implement a sparse index throws an error': function () {
      var db = start()
        , NativeTestCollection = db.model('NativeDriverTest');

      NativeTestCollection.collection.ensureIndex({ title: 1 }, { sparse: true }, function (err) {
        err.should.be.an.instanceof(Error);
        /driver only implements/.test(err.message).should.be.true;
        db.close();
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
