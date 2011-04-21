GLOBAL.DEBUG = true;

sys = require("sys");
test = require("assert");

var Db = require('../lib/mongodb').Db,
  connect = require('../lib/mongodb').connect;

sys.puts('Connecting to ' + Db.DEFAULT_URL);
connect(Db.DEFAULT_URL, function(err, db) {
  db.dropDatabase(function(err, result) {
    db.collection('test', function(err, collection) {
      collection.insert({'a':1});
      db.close();
    });
  });
});
