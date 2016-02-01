var mongoose = require('../');
var Schema = mongoose.Schema;
var docs = process.argv[2] ? process.argv[2] | 0 : 100;

var A = mongoose.model('A', Schema({name: 'string'}));

var nested = Schema({
  a: {type: Schema.ObjectId, ref: 'A'}
});

var B = mongoose.model('B', Schema({
  as: [{type: Schema.ObjectId, ref: 'A'}],
  a: {type: Schema.ObjectId, ref: 'A'},
  nested: [nested]
}));

var start;
var count = 0;

mongoose.connect('localhost', 'benchmark-populate', function(err) {
  if (err) {
    return done(err);
  }

  A.create({name: 'wooooooooooooooooooooooooooooooooooooooooot'}, function(err, a) {
    if (err) {
      return done(err);
    }

    var pending = docs;
    for (var i = 0; i < pending; ++i) {
      new B({
        as: [a, a, a, a, a, a, a, a, a, a, a, a, a, a, a, a, a],
        a: a,
        nested: [{a: a}, {a: a}, {a: a}, {a: a}, {a: a}, {a: a}]
      }).save(function(err) {
        if (err) {
          return done(err);
        }
        --pending;
        if (pending === 0) {
          // console.log('inserted %d docs. beginning test ...', docs);
          start = Date.now();
          test();
        }
      });
    }
  });
});

function test() {
  var pending = 2;

  B.find().populate('as').populate('a').populate('nested.a').exec(handle);
  B.findOne().populate('as').populate('a').populate('nested.a').exec(handle);

  function handle(err) {
    if (err) {
      throw err;
    }
    count++;

    if (Date.now() - start > 1000 * 20) {
      return done();
    }

    if (--pending === 0) {
      return test();
    }
  }
}


function done(err) {
  if (err) {
    console.error(err.stack);
  }

  mongoose.connection.db.dropDatabase(function() {
    mongoose.disconnect();
    console.log('%d completed queries on mongoose version %s', count, mongoose.version);
  });
}
