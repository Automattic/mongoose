GLOBAL.DEBUG = true;

sys = require("sys");
test = require("assert");

var Db = require('../lib/mongodb').Db,
  Connection = require('../lib/mongodb').Connection,
  Server = require('../lib/mongodb').Server,
  BSON = require('../lib/mongodb').BSONPure;
  // BSON = require('../lib/mongodb').BSONNative;

sys.puts('Connecting to ' + (process.env.MONGO_URL || Db.DEFAULT_URL));
connect(process.env.MONGO_URL, function(err, db) {
  db.dropDatabase(function(err, result) {
    db.collection('test', function(err, collection) {
      collection.insert({'a':1});
      db.close();
    });
  });
});
