// GH-407

var start = require('./common'),
    assert = require('power-assert'),
    mongoose = start.mongoose;

describe('crash: (gh-407)', function() {
  it('test mongodb crash with invalid objectid string', function(done) {
    var db = mongoose.createConnection('mongodb://localhost/test-crash');

    var IndexedGuy = new mongoose.Schema({
      name: {type: String}
    });

    var Guy = db.model('Guy', IndexedGuy);
    Guy.find({
      _id: {
        $in: [
          '4e0de2a6ee47bff98000e145',
          '4e137bd81a6a8e00000007ac',
          '',
          '4e0e2ca0795666368603d974']
      }
    }, function(err) {
      db.close(done);

      try {
        assert.equal(err.message,
          'Cast to ObjectId failed for value "" at path "_id" for model "Guy"');
      } catch (er) {
        console.error(err);
        throw er;
      }
    });
  });
});
