
/**
 * Test dependencies.
 */

var start = require('./common')
  , should = require('should')
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

;(function setup () {
  var db = start()
    , P = db.model('PersonForStream', collection)

  var people = names.map(function (name) {
    return { name: name };
  });

  P.create(people, function (err) {
    should.strictEqual(null, err);
    db.close();
    assignExports();
  });
})()

function assignExports () { var o = {

  'cursor stream': function () {
    var db = start()
      , P = db.model('PersonForStream', collection)
      , i = 0
      , closed = 0
      , paused = 0
      , resumed = 0
      , err

    var stream = P.find({}).stream();

    stream.on('data', function (doc) {
      should.strictEqual(true, !! doc.name);
      should.strictEqual(true, !! doc._id);

      if (paused > 0 && 0 === resumed) {
        err = new Error('data emitted during pause');
        return done();
      }

      if (++i === 3) {
        stream.paused.should.be.false;
        stream.pause();
        stream.paused.should.be.true;
        paused++;

        setTimeout(function () {
          stream.paused.should.be.true;
          resumed++;
          stream.resume();
          stream.paused.should.be.false;
        }, 20);
      }
    });

    stream.on('error', function (er) {
      err = er;
      done();
    });

    stream.on('close', function () {
      closed++;
      done();
    });

    function done () {
      db.close();
      should.strictEqual(undefined, err);
      should.equal(i, names.length);
      closed.should.equal(1);
      paused.should.equal(1);
      resumed.should.equal(1);
      stream._cursor.isClosed().should.be.true;
    }
  }

, 'immediately destroying a stream prevents the query from executing': function () {
    var db = start()
      , P = db.model('PersonForStream', collection)
      , i = 0

    var stream = P.where('name', 'Jonah').select('name').findOne().stream();

    stream.on('data', function () {
      i++;
    })
    stream.on('close', done);
    stream.on('error', done);

    stream.destroy();

    function done (err) {
      should.strictEqual(undefined, err);
      i.should.equal(0);
      process.nextTick(function () {
        db.close();
        should.strictEqual(null, stream._fields);
      })
    }
  }

, 'destroying a stream stops it': function () {
    var db = start()
      , P = db.model('PersonForStream', collection)
      , finished = 0
      , i = 0

    var stream = P.where('name').$exists().limit(10).only('_id').stream();

    should.strictEqual(null, stream._destroyed);
    stream.readable.should.be.true;

    stream.on('data', function (doc) {
      should.strictEqual(undefined, doc.name);
      if (++i === 5) {
        stream.destroy();
        stream.readable.should.be.false;
      }
    });

    stream.on('close', done);
    stream.on('error', done);

    function done (err) {
      ++finished;
      setTimeout(function () {
        db.close();
        should.strictEqual(undefined, err);
        i.should.equal(5);
        finished.should.equal(1);
        stream._destroyed.should.equal(true);
        stream.readable.should.be.false;
        stream._cursor.isClosed().should.be.true;
      }, 150)
    }
  }

, 'cursor stream errors': function () {
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

    stream.on('error', done);

    function done (err) {
      ++finished;
      setTimeout(function () {
        should.equal('no open connections', err.message);
        i.should.equal(5);
        closed.should.equal(1);
        finished.should.equal(1);
        stream._destroyed.should.equal(true);
        stream.readable.should.be.false;
        stream._cursor.isClosed().should.be.true;
      }, 150)
    }
  }

, 'cursor stream pipe': function () {
    var db = start()
      , P = db.model('PersonForStream', collection)
      , filename = '/tmp/_mongoose_stream_out.txt'
      , out = fs.createWriteStream(filename)

    var stream = P.find().sort('name', 1).limit(20).stream();
    stream.pipe(out);

    stream.on('error', done);
    stream.on('close', done);

    function done (err) {
      db.close();
      should.strictEqual(undefined, err);
      var contents = fs.readFileSync(filename, 'utf8');
      ;/Aaden/.test(contents).should.be.true;
      ;/Aaron/.test(contents).should.be.true;
      ;/Adrian/.test(contents).should.be.true;
      ;/Aditya/.test(contents).should.be.true;
      ;/Agustin/.test(contents).should.be.true;
      fs.unlink(filename);
    }
  }
}

// end exports

utils.merge(exports, o);

}
