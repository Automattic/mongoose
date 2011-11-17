
/**
 * Test dependencies.
 */

var start = require('./common')
  , should = require('should')
  , mongoose = start.mongoose
  , random = require('../lib/utils').random
  , Query = require('../lib/query')
  , Schema = mongoose.Schema
  , SchemaType = mongoose.SchemaType
  , CastError = SchemaType.CastError
  , ObjectId = Schema.ObjectId
  , MongooseBuffer = mongoose.Types.Buffer
  , DocumentObjectId = mongoose.Types.ObjectId
  , fs = require('fs')

var names = fs.readFileSync(__dirname + '/testnames.txt', 'utf8').split(' ')

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

function assignExports () {
  exports['cursor stream'] = function () {
    var db = start()
      , P = db.model('PersonForStream', collection)
      , i = 0

    var stream = P.find({}).stream();
    stream.on('data', function (doc) {
      console.error(doc);
      if (!(++i % 100)) {
        console.error('pausing...');
        stream.pause();
        setTimeout(function () {
          console.error('... resuming');
          stream.resume();
        }, 1000);
      }
    });
    stream.on('error', function (err) {
      console.error('ERROR!');
      console.error(err.stack);
    });
    stream.on('close', function () {
      console.error('closed');
      P.remove(function () {
        db.close();
      });
    });
  }

  exports['cursor stream pipe'] = function () {
    var db = start()
      , P = db.model('PersonForStream', collection)
      , filename = '/tmp/_mongoose_stream_out.txt'
      , out = fs.createWriteStream(filename)

    var stream = P.find({}).stream();
    stream.pipe(out);

    stream.on('error', function (err) {
      console.error('ERROR!');
      console.error(err.stack);
    });
    stream.on('close', function () {
      console.error('closed');
      P.remove(function () {
        db.close();
      });
    });
  }
}
