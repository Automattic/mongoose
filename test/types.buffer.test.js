
/**
 * Module dependencies.
 */

var start = require('./common')
  , should = require('should')
  , mongoose = require('./common').mongoose
  , Schema = mongoose.Schema
  , random = require('../lib/utils').random
  , MongooseBuffer = mongoose.Types.Buffer;

// can't index Buffer fields yet

function valid (v) {
  return !v || v.length > 10;
}

var subBuf = new Schema({
    name: String
  , buf: { type: Buffer, validate: [valid, 'valid failed'], required: true }
});

var UserBuffer = new Schema({
    name: String
  , serial: Buffer
  , array: [Buffer]
  , required: { type: Buffer, required: true, index: true }
  , sub: [subBuf]
});

// Dont put indexed models on the default connection, it
// breaks index.test.js tests on a "pure" default conn.
// mongoose.model('UserBuffer', UserBuffer);

/**
 * Test.
 */

module.exports = {

  'test that a mongoose buffer behaves and quacks like an buffer': function(){
    var a = new MongooseBuffer;

    a.should.be.an.instanceof(Buffer);
    a.should.be.an.instanceof(MongooseBuffer);
    Buffer.isBuffer(a).should.be.true;

    var a = new MongooseBuffer([195, 188, 98, 101, 114]);
    var b = new MongooseBuffer("buffer shtuffs are neat");
    var c = new MongooseBuffer('aGVsbG8gd29ybGQ=', 'base64');

    a.toString('utf8').should.equal('über');
    b.toString('utf8').should.equal('buffer shtuffs are neat');
    c.toString('utf8').should.equal('hello world');
  },

  'buffer validation': function () {
    var db = start()
      , User = db.model('UserBuffer', UserBuffer, 'usersbuffer_' + random());

    User.on('index', function () {
      var t = new User({
          name: 'test validation'
      });

      t.validate(function (err) {
        err.message.should.eql('Validation failed');
        err.errors.required.type.should.equal('required');
        t.required = 20;
        t.save(function (err) {
          err.name.should.eql('CastError');
          err.type.should.eql('buffer');
          err.value.should.equal(20);
          err.message.should.eql('Cast to buffer failed for value "20"');
          t.required = new Buffer("hello");

          t.sub.push({ name: 'Friday Friday' });
          t.save(function (err) {
            err.message.should.eql('Validation failed');
            err.errors.buf.type.should.equal('required');
            t.sub[0].buf = new Buffer("well well");
            t.save(function (err) {
              err.message.should.eql('Validation failed');
              err.errors.buf.type.should.equal('valid failed');

              t.sub[0].buf = new Buffer("well well well");
              t.validate(function (err) {
                db.close();
                should.strictEqual(null, err);
              });
            });
          });
        });
      });
    })
  },

  'buffer storage': function(){
    var db = start()
      , User = db.model('UserBuffer', UserBuffer, 'usersbuffer_' + random());

    User.on('index', function () {
      var sampleBuffer = new Buffer([123, 223, 23, 42, 11]);

      var tj = new User({
          name: 'tj'
        , serial: sampleBuffer
        , required: new Buffer(sampleBuffer)
      });

      tj.save(function (err) {
        should.equal(null, err);
        User.find({}, function (err, users) {
          db.close();
          should.equal(null, err);
          users.should.have.length(1);
          var user = users[0];
          var base64 = sampleBuffer.toString('base64');
          should.equal(base64,
                       user.serial.toString('base64'), 'buffer mismatch');
          should.equal(base64,
                       user.required.toString('base64'), 'buffer mismatch');
        });
      });
    });
  },

  'test write markModified': function(){
    var db = start()
      , User = db.model('UserBuffer', UserBuffer, 'usersbuffer_' + random());

    User.on('index', function () {
      var sampleBuffer = new Buffer([123, 223, 23, 42, 11]);

      var tj = new User({
          name: 'tj'
        , serial: sampleBuffer
        , required: sampleBuffer
      });

      tj.save(function (err) {
        should.equal(null, err);

        tj.serial.write('aa', 1, 'ascii');
        tj.isModified('serial').should.be.true;

        tj.save(function (err) {
          should.equal(null, err);

          User.findById(tj._id, function (err, user) {
            db.close();
            should.equal(null, err);

            var expectedBuffer = new Buffer([123, 97, 97, 42, 11]);

            should.equal(expectedBuffer.toString('base64'),
                         user.serial.toString('base64'), 'buffer mismatch');

            tj.isModified('required').should.be.false;
            tj.serial.copy(tj.required, 1);
            tj.isModified('required').should.be.true;
            should.equal('e3thYSo=', tj.required.toString('base64'));

            // buffer method tests
            var fns = {
                'writeUInt8': function () {
                  reset(tj);
                  tj.isModified('required').should.be.false;
                  tj.required.writeUInt8(0x3, 0, 'big');
                  tj.isModified('required').should.be.true;
                }
              , 'writeUInt16': function () {
                  reset(tj);
                  tj.isModified('required').should.be.false;
                  tj.required.writeUInt16(0xbeef, 0, 'little');
                  tj.isModified('required').should.be.true;
                }
              , 'writeUInt16LE': function () {
                  reset(tj);
                  tj.isModified('required').should.be.false;
                  tj.required.writeUInt16LE(0xbeef, 0);
                  tj.isModified('required').should.be.true;
                }
              , 'writeUInt16BE': function () {
                  reset(tj);
                  tj.isModified('required').should.be.false;
                  tj.required.writeUInt16BE(0xbeef, 0);
                  tj.isModified('required').should.be.true;
                }
              , 'writeUInt32': function () {
                  reset(tj);
                  tj.isModified('required').should.be.false;
                  tj.required.writeUInt32(0xfeedface, 0, 'little');
                  tj.isModified('required').should.be.true;
                }
              , 'writeUInt32LE': function () {
                  reset(tj);
                  tj.isModified('required').should.be.false;
                  tj.required.writeUInt32LE(0xfeedface, 0);
                  tj.isModified('required').should.be.true;
                }
              , 'writeUInt32BE': function () {
                  reset(tj);
                  tj.isModified('required').should.be.false;
                  tj.required.writeUInt32BE(0xfeedface, 0);
                  tj.isModified('required').should.be.true;
                }
              , 'writeInt8': function () {
                  reset(tj);
                  tj.isModified('required').should.be.false;
                  tj.required.writeInt8(-5, 0, 'big');
                  tj.isModified('required').should.be.true;
                }
              , 'writeInt16': function () {
                  reset(tj);
                  tj.isModified('required').should.be.false;
                  tj.required.writeInt16(0x0023, 2, 'little');
                  tj.isModified('required').should.be.true;
                  tj.required[2].should.eql(0x23);
                  tj.required[3].should.eql(0x00);
                }
              , 'writeInt16LE': function () {
                  reset(tj);
                  tj.isModified('required').should.be.false;
                  tj.required.writeInt16LE(0x0023, 2);
                  tj.isModified('required').should.be.true;
                  tj.required[2].should.eql(0x23);
                  tj.required[3].should.eql(0x00);
                }
              , 'writeInt16BE': function () {
                  reset(tj);
                  tj.isModified('required').should.be.false;
                  tj.required.writeInt16BE(0x0023, 2);
                  tj.isModified('required').should.be.true;
                }
              , 'writeInt32': function () {
                  reset(tj);
                  tj.isModified('required').should.be.false;
                  tj.required.writeInt32(0x23, 0, 'big');
                  tj.isModified('required').should.be.true;
                  tj.required[0].should.eql(0x00);
                  tj.required[1].should.eql(0x00);
                  tj.required[2].should.eql(0x00);
                  tj.required[3].should.eql(0x23);
                  tj.required = new Buffer(8);
                }
              , 'writeInt32LE': function () {
                  tj.required = new Buffer(8);
                  reset(tj);
                  tj.isModified('required').should.be.false;
                  tj.required.writeInt32LE(0x23, 0);
                  tj.isModified('required').should.be.true;
                }
              , 'writeInt32BE': function () {
                  tj.required = new Buffer(8);
                  reset(tj);
                  tj.isModified('required').should.be.false;
                  tj.required.writeInt32BE(0x23, 0);
                  tj.isModified('required').should.be.true;
                  tj.required[0].should.eql(0x00);
                  tj.required[1].should.eql(0x00);
                  tj.required[2].should.eql(0x00);
                  tj.required[3].should.eql(0x23);
                }
              , 'writeFloat': function () {
                  tj.required = new Buffer(16);
                  reset(tj);
                  tj.isModified('required').should.be.false;
                  tj.required.writeFloat(2.225073858507201e-308, 0, 'big');
                  tj.isModified('required').should.be.true;
                  tj.required[0].should.eql(0x00);
                  tj.required[1].should.eql(0x0f);
                  tj.required[2].should.eql(0xff);
                  tj.required[3].should.eql(0xff);
                  tj.required[4].should.eql(0xff);
                  tj.required[5].should.eql(0xff);
                  tj.required[6].should.eql(0xff);
                  tj.required[7].should.eql(0xff);
                }
              , 'writeFloatLE': function () {
                  tj.required = new Buffer(16);
                  reset(tj);
                  tj.isModified('required').should.be.false;
                  tj.required.writeFloatLE(2.225073858507201e-308, 0);
                  tj.isModified('required').should.be.true;
                }
              , 'writeFloatBE': function () {
                  tj.required = new Buffer(16);
                  reset(tj);
                  tj.isModified('required').should.be.false;
                  tj.required.writeFloatBE(2.225073858507201e-308, 0);
                  tj.isModified('required').should.be.true;
                }
              , 'writeDoubleLE': function () {
                  tj.required = new Buffer(8);
                  reset(tj);
                  tj.isModified('required').should.be.false;
                  tj.required.writeDoubleLE(0xdeadbeefcafebabe, 0);
                  tj.isModified('required').should.be.true;
                }
              , 'writeDoubleBE': function () {
                  tj.required = new Buffer(8);
                  reset(tj);
                  tj.isModified('required').should.be.false;
                  tj.required.writeDoubleBE(0xdeadbeefcafebabe, 0);
                  tj.isModified('required').should.be.true;
                }
              , 'fill': function () {
                  tj.required = new Buffer(8);
                  reset(tj);
                  tj.isModified('required').should.be.false;
                  tj.required.fill(0);
                  tj.isModified('required').should.be.true;
                  for (var i = 0; i < tj.required.length; i++) {
                    tj.required[i].should.eql(0);
                  }
                }
              , 'set': function () {
                  reset(tj);
                  tj.isModified('required').should.be.false;
                  tj.required.set(0, 1);
                  tj.isModified('required').should.be.true;
                }
            };

            var keys = Object.keys(fns)
              , i = keys.length
              , key

            while (i--) {
              key = keys[i];
              if (Buffer.prototype[key]) {
                fns[key]();
              }
            }
          });
        });
      });
    });

    function reset (model) {
      // internal
      model._activePaths.clear('modify');
      model.schema.requiredPaths.forEach(function (path) {
        model._activePaths.require(path);
      });
    }
  }
};
