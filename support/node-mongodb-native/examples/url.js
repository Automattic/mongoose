GLOBAL.DEBUG = true;

sys = require("sys");
test = require("mjsunit");

var mongo = require('../lib/mongodb');

sys.puts('Connecting to ' + (process.env.MONGO_URL || mongo.Db.DEFAULT_URL));
mongo.connect(process.env.MONGO_URL, function(err, db) {
  db.dropDatabase(function(err, result) {
    db.collection('test', function(err, collection) {
      collection.insert({'a':1});
      db.close();
    });
  });
});
