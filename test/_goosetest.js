
var mongoose = require('../../');
var Schema = mongoose.Schema;
var assert = require('assert')

console.log('\n===========');
console.log('    mongoose version: %s', mongoose.version);
console.log('========\n\n');

var dbname = 'goosetest-{NAME}';
mongoose.connect('localhost', dbname);
mongoose.connection.on('error', function () {
  console.error('connection error', arguments);
});


var schema = new Schema({
    name: String
});

var A = mongoose.model('A', schema);


mongoose.connection.on('open', function () {
  var a = new A({ name: '{NAME}' });

  a.save(function (err) {
    if (err) return done(err);

    A.findById(a, function (err, doc) {
      console.log(arguments);
      done(err);
    })
  })
});

function done (err) {
  if (err) console.error(err.stack);
  mongoose.connection.db.dropDatabase(function () {
    mongoose.connection.close();
  });
}
