
/**
 * Module dependencies.
 */

var start = require('./common')
  , should = require('should')
  , mongoose = require('./common').mongoose
  , Schema = mongoose.Schema
  , random = require('mongoose/utils').random
  , MongooseBuffer = mongoose.Types.Buffer;

var UserBuffer = new Schema({
    name: String
  , serial: Buffer
});

mongoose.model('UserBuffer', UserBuffer);

/**
 * Test.
 */

module.exports = {

  'test that a mongoose buffer behaves and quacks like an buffer': function(){
    var a = new MongooseBuffer;

    a.should.be.an.instanceof(Buffer);
    a.should.be.an.instanceof(MongooseBuffer);
    Buffer.isBuffer(a).should.be.true;
  },

  'test storage': function(){
    var db = start()
      , User = db.model('UserBuffer', 'usersbuffer_' + random());

    var sampleBuffer = new Buffer([123, 223, 23, 42, 11]);

    var tj = new User({
        name: 'tj'
      , serial: sampleBuffer
    });

    tj.save(function (err) {
      should.equal(null, err, 'error in callback');
      User.find({}, function (err, users) {
        db.close();
        should.equal(null, err, 'error in callback');
        users.should.have.length(1);
        var user = users[0];
        should.equal(sampleBuffer.toString('base64'),
                     user.serial.toString('base64'), 'buffer mismatch');
      });
    });
  },

  'test write markModified': function(){
    var db = start()
      , User = db.model('UserBuffer', 'usersbuffer_' + random());

    var sampleBuffer = new Buffer([123, 223, 23, 42, 11]);

    var tj = new User({
        name: 'tj'
      , serial: sampleBuffer
    });

    tj.save(function (err) {
      should.equal(null, err, 'error in callback');

      tj.serial.write('aa', 1, 'ascii');
      tj.save(function (err) {
        should.equal(null, err, 'error in callback');

        User.find({}, function (err, users) {
          db.close();
          should.equal(null, err, 'error in callback');
          users.should.have.length(1);
          var user = users[0];

          var expectedBuffer = new Buffer([123, 97, 97, 42, 11]);

          should.equal(expectedBuffer.toString('base64'),
                       user.serial.toString('base64'), 'buffer mismatch');
        });
      });
    });
  }
};
