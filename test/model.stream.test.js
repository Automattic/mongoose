
/**
 * Test dependencies.
 */

var start = require('./common')
  , assert = require('assert')
  , mongoose = start.mongoose
  , utils = require('../lib/utils')
  , random = utils.random
  , Query = require('../lib/query')
  , Schema = mongoose.Schema
  , SchemaType = mongoose.SchemaType
  , CastError = SchemaType.CastError
  , ObjectId = Schema.ObjectId
  , MongooseBuffer = mongoose.Types.Buffer
  , DocumentObjectId = mongoose.Types.ObjectId
  , fs = require('fs')

var names = ('Aaden Aaron Adrian Aditya Agustin Jim Bob Jonah Frank Sally Lucy').split(' ');

/**
 * Setup.
 */

var Person = new Schema({
    name: String
});

mongoose.model('PersonForStream', Person);
var collection = 'personforstream_' + random();

describe('cursor stream:', function(){
  before(function (done) {
    var db = start()
      , P = db.model('PersonForStream', collection)

    var people = names.map(function (name) {
      return { name: name };
    });

    P.create(people, function (err) {
      assert.ifError(err);
      db.close();
      done();
    });
  });

  it('works', function(done){
    var db = start()
      , P = db.model('PersonForStream', collection)
      , i = 0
      , closed = 0
      , paused = 0
      , resumed = 0
      , err

    var stream = P.find({}).stream();

    stream.on('data', function (doc) {
      assert.strictEqual(true, !! doc.name);
      assert.strictEqual(true, !! doc._id);

      if (paused > 0 && 0 === resumed) {
        err = new Error('data emitted during pause');
        return cb();
      }

      if (++i === 3) {
        assert.equal(false, stream.paused);
        stream.pause();
        assert.equal(true, stream.paused);
        paused++;

        setTimeout(function () {
          assert.equal(true, stream.paused);
          resumed++;
          stream.resume();
          assert.equal(false, stream.paused);
        }, 20);
      }
    });

    stream.on('error', function (er) {
      err = er;
      cb();
    });

    stream.on('close', function () {
      closed++;
      cb();
    });

    function cb () {
      db.close();
      assert.strictEqual(undefined, err);
      assert.equal(i, names.length);
      assert.equal(1, closed);
      assert.equal(1, paused);
      assert.equal(1, resumed);
      assert.equal(true, stream._cursor.isClosed());
      done();
    }
  });

  it('immediately destroying a stream prevents the query from executing', function(done){
    var db = start()
      , P = db.model('PersonForStream', collection)
      , i = 0

    var stream = P.where('name', 'Jonah').select('name').findOne().stream();

    stream.on('data', function () {
      i++;
    })
    stream.on('close', cb);
    stream.on('error', cb);

    stream.destroy();

    function cb (err) {
      assert.ifError(err);
      assert.equal(0, i);
      process.nextTick(function () {
        db.close();
        assert.strictEqual(null, stream._fields);
        done();
      })
    }
  });

  it('destroying a stream stops it', function(done){
    var db = start()
      , P = db.model('PersonForStream', collection)
      , finished = 0
      , i = 0

    var stream = P.where('name').exists().limit(10).select('_id').stream();

    assert.strictEqual(null, stream._destroyed);
    assert.equal(true, stream.readable);

    stream.on('data', function (doc) {
      assert.strictEqual(undefined, doc.name);
      if (++i === 5) {
        stream.destroy();
        assert.equal(false, stream.readable);
      }
    });

    stream.on('close', cb);
    stream.on('error', cb);

    function cb (err) {
      ++finished;
      setTimeout(function () {
        db.close();
        assert.strictEqual(undefined, err);
        assert.equal(5, i);
        assert.equal(1, finished);
        assert.equal(true, stream._destroyed);
        assert.equal(false, stream.readable);
        assert.equal(true, stream._cursor.isClosed());
        done();
      }, 100)
    }
  });

  it('errors', function(done){
    var db = start({ server: { auto_reconnect: false }})
      , P = db.model('PersonForStream', collection)
      , finished = 0
      , closed = 0
      , i = 0

    var stream = P.find().batchSize(5).stream();

    stream.on('data', function (doc) {
      if (++i === 5) {
        db.close();
      }
    });

    stream.on('close', function () {
      closed++;
    });

    stream.on('error', cb);

    function cb (err) {
      ++finished;
      setTimeout(function () {
        assert.equal('no open connections', err.message);
        assert.equal(i, 5);
        assert.equal(1, closed);
        assert.equal(1, finished);
        assert.equal(stream._destroyed,true);
        assert.equal(stream.readable, false);
        assert.equal(stream._cursor.isClosed(), true);
        done();
      }, 100)
    }
  })

  it('pipe', function(done){
    var db = start()
      , P = db.model('PersonForStream', collection)
      , filename = '/tmp/_mongoose_stream_out.txt'
      , out = fs.createWriteStream(filename)

    var stream = P.find().sort('name').limit(20).stream();
    stream.pipe(out);

    stream.on('error', cb);
    stream.on('close', cb);

    function cb (err) {
      db.close();
      assert.ifError(err);
      var contents = fs.readFileSync(filename, 'utf8');
      assert.ok(/Aaden/.test(contents));
      assert.ok(/Aaron/.test(contents));
      assert.ok(/Adrian/.test(contents));
      assert.ok(/Aditya/.test(contents));
      assert.ok(/Agustin/.test(contents));
      fs.unlink(filename);
      done();
    }
  })

  it('lean', function(done){
    var db = start()
      , P = db.model('PersonForStream', collection)
      , i = 0
      , closed = 0
      , err

    var stream = P.find({}).lean().stream();

    stream.on('data', function (doc) {
      assert.strictEqual(false, doc instanceof mongoose.Document);
      i++;
    });

    stream.on('error', function (er) {
      err = er;
      cb();
    });

    stream.on('close', function () {
      closed++;
      cb();
    });

    function cb () {
      db.close();
      assert.strictEqual(undefined, err);
      assert.equal(i, names.length);
      assert.equal(1, closed);
      assert.equal(true, stream._cursor.isClosed());
      done();
    }
  });
});
