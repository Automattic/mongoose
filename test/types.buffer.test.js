
/**
 * Module dependencies.
 */

var start = require('./common')
  , assert = require('assert')
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

describe('types.buffer', function(){

  it('test that a mongoose buffer behaves and quacks like an buffer', function(){
    var a = new MongooseBuffer;

    assert.ok(a instanceof Buffer);
    assert.ok(a instanceof MongooseBuffer);
    assert.equal(true, Buffer.isBuffer(a));

    var a = new MongooseBuffer([195, 188, 98, 101, 114]);
    var b = new MongooseBuffer("buffer shtuffs are neat");
    var c = new MongooseBuffer('aGVsbG8gd29ybGQ=', 'base64');

    assert.equal(a.toString('utf8'), 'über');
    assert.equal(b.toString('utf8'), 'buffer shtuffs are neat');
    assert.equal(c.toString('utf8'), 'hello world');
  });

  it('buffer validation', function (done) {
    var db = start()
      , User = db.model('UserBuffer', UserBuffer, 'usersbuffer_' + random());

    User.on('index', function () {
      var t = new User({
          name: 'test validation'
      });

      t.validate(function (err) {
        assert.equal(err.message,'Validation failed');
        assert.equal(err.errors.required.type,'required');
        t.required = 20;
        t.save(function (err) {
          assert.equal(err.name, 'CastError');
          assert.equal(err.type, 'buffer');
          assert.equal(err.value, 20);
          assert.equal(err.message, 'Cast to buffer failed for value "20"');
          t.required = new Buffer("hello");

          t.sub.push({ name: 'Friday Friday' });
          t.save(function (err) {
            assert.equal(err.message,'Validation failed');
            assert.equal(err.errors['sub.0.buf'].type,'required');
            t.sub[0].buf = new Buffer("well well");
            t.save(function (err) {
              assert.equal(err.message,'Validation failed');
              assert.equal(err.errors['sub.0.buf'].type,'valid failed');

              t.sub[0].buf = new Buffer("well well well");
              t.validate(function (err) {
                db.close();
                assert.ifError(err);
                done();
              });
            });
          });
        });
      });
    });
  });

  it('buffer storage', function(done){
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
        assert.ifError(err);
        User.find({}, function (err, users) {
          db.close();
          assert.ifError(err);
          assert.equal(users.length, 1);
          var user = users[0];
          var base64 = sampleBuffer.toString('base64');
          assert.equal(base64,
                       user.serial.toString('base64'), 'buffer mismatch');
          assert.equal(base64,
                       user.required.toString('base64'), 'buffer mismatch');
          done();
        });
      });
    });
  });

  it('test write markModified', function(done){
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
        assert.ifError(err);

        tj.serial.write('aa', 1, 'ascii');
        assert.equal(true, tj.isModified('serial'));

        tj.save(function (err) {
          assert.ifError(err);

          User.findById(tj._id, function (err, user) {
            db.close();
            assert.ifError(err);

            var expectedBuffer = new Buffer([123, 97, 97, 42, 11]);

            assert.equal(expectedBuffer.toString('base64'),
                         user.serial.toString('base64'), 'buffer mismatch');

            assert.equal(false, tj.isModified('required'));
            tj.serial.copy(tj.required, 1);
            assert.equal(true, tj.isModified('required'));
            assert.equal('e3thYSo=', tj.required.toString('base64'));

            function not (tj) {
              assert.equal(false, tj.isModified('required'))
            }

            function is (tj) {
              assert.equal(true, tj.isModified('required'));
            }

            // buffer method tests
            var fns = {
                'writeUInt8': function () {
                  reset(tj);
                  not(tj);
                  tj.required.writeUInt8(0x3, 0, 'big');
                  is(tj);
                }
              , 'writeUInt16': function () {
                  reset(tj);
                  not(tj);
                  tj.required.writeUInt16(0xbeef, 0, 'little');
                  is(tj);
                }
              , 'writeUInt16LE': function () {
                  reset(tj);
                  not(tj);
                  tj.required.writeUInt16LE(0xbeef, 0);
                  is(tj);
                }
              , 'writeUInt16BE': function () {
                  reset(tj);
                  not(tj);
                  tj.required.writeUInt16BE(0xbeef, 0);
                  is(tj);
                }
              , 'writeUInt32': function () {
                  reset(tj);
                  not(tj);
                  tj.required.writeUInt32(0xfeedface, 0, 'little');
                  is(tj);
                }
              , 'writeUInt32LE': function () {
                  reset(tj);
                  not(tj);
                  tj.required.writeUInt32LE(0xfeedface, 0);
                  is(tj);
                }
              , 'writeUInt32BE': function () {
                  reset(tj);
                  not(tj);
                  tj.required.writeUInt32BE(0xfeedface, 0);
                  is(tj);
                }
              , 'writeInt8': function () {
                  reset(tj);
                  not(tj);
                  tj.required.writeInt8(-5, 0, 'big');
                  is(tj);
                }
              , 'writeInt16': function () {
                  reset(tj);
                  not(tj);
                  tj.required.writeInt16(0x0023, 2, 'little');
                  is(tj);
                  assert.equal(tj.required[2], 0x23);
                  assert.equal(tj.required[3], 0x00);
                }
              , 'writeInt16LE': function () {
                  reset(tj);
                  not(tj);
                  tj.required.writeInt16LE(0x0023, 2);
                  is(tj);
                  assert.equal(tj.required[2], 0x23);
                  assert.equal(tj.required[3], 0x00);
                }
              , 'writeInt16BE': function () {
                  reset(tj);
                  not(tj);
                  tj.required.writeInt16BE(0x0023, 2);
                  is(tj);
                }
              , 'writeInt32': function () {
                  reset(tj);
                  not(tj);
                  tj.required.writeInt32(0x23, 0, 'big');
                  is(tj);
                  assert.equal(tj.required[0], 0x00);
                  assert.equal(tj.required[1], 0x00);
                  assert.equal(tj.required[2], 0x00);
                  assert.equal(tj.required[3], 0x23);
                  tj.required = new Buffer(8);
                }
              , 'writeInt32LE': function () {
                  tj.required = new Buffer(8);
                  reset(tj);
                  not(tj);
                  tj.required.writeInt32LE(0x23, 0);
                  is(tj);
                }
              , 'writeInt32BE': function () {
                  tj.required = new Buffer(8);
                  reset(tj);
                  not(tj);
                  tj.required.writeInt32BE(0x23, 0);
                  is(tj);
                  assert.equal(tj.required[0], 0x00);
                  assert.equal(tj.required[1], 0x00);
                  assert.equal(tj.required[2], 0x00);
                  assert.equal(tj.required[3], 0x23);
                }
              , 'writeFloat': function () {
                  tj.required = new Buffer(16);
                  reset(tj);
                  not(tj);
                  tj.required.writeFloat(2.225073858507201e-308, 0, 'big');
                  is(tj);
                  assert.equal(tj.required[0], 0x00);
                  assert.equal(tj.required[1], 0x0f);
                  assert.equal(tj.required[2], 0xff);
                  assert.equal(tj.required[3], 0xff);
                  assert.equal(tj.required[4], 0xff);
                  assert.equal(tj.required[5], 0xff);
                  assert.equal(tj.required[6], 0xff);
                  assert.equal(tj.required[7], 0xff);
                }
              , 'writeFloatLE': function () {
                  tj.required = new Buffer(16);
                  reset(tj);
                  not(tj);
                  tj.required.writeFloatLE(2.225073858507201e-308, 0);
                  is(tj);
                }
              , 'writeFloatBE': function () {
                  tj.required = new Buffer(16);
                  reset(tj);
                  not(tj);
                  tj.required.writeFloatBE(2.225073858507201e-308, 0);
                  is(tj);
                }
              , 'writeDoubleLE': function () {
                  tj.required = new Buffer(8);
                  reset(tj);
                  not(tj);
                  tj.required.writeDoubleLE(0xdeadbeefcafebabe, 0);
                  is(tj);
                }
              , 'writeDoubleBE': function () {
                  tj.required = new Buffer(8);
                  reset(tj);
                  not(tj);
                  tj.required.writeDoubleBE(0xdeadbeefcafebabe, 0);
                  is(tj);
                }
              , 'fill': function () {
                  tj.required = new Buffer(8);
                  reset(tj);
                  not(tj);
                  tj.required.fill(0);
                  is(tj);
                  for (var i = 0; i < tj.required.length; i++) {
                    assert.strictEqual(tj.required[i], 0);
                  }
                }
              , 'set': function () {
                  reset(tj);
                  not(tj);
                  tj.required.set(0, 1);
                  is(tj);
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
            done();
          });
        });
      });
    });

    function reset (model) {
      // internal
      model._activePaths.clear('modify');
      model.schema.requiredPaths().forEach(function (path) {
        model._activePaths.require(path);
      });
    }
  });

})
