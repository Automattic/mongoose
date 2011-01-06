GLOBAL.DEBUG = true;

sys = require("sys");
test = require("assert");

var Db = require('../lib/mongodb').Db,
  Connection = require('../lib/mongodb').Connection,
  Server = require('../lib/mongodb').Server,
  // BSON = require('../lib/mongodb').BSONPure;
  BSON = require('../lib/mongodb').BSONNative;

var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
var port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : Connection.DEFAULT_PORT;

sys.puts("Connecting to " + host + ":" + port);
var db = new Db('node-mongo-examples', new Server(host, port, {}), {native_parser:true});
db.open(function(err, db) {
  db.dropCollection('test', function(err, result) {
    // A capped collection has a max size and optionally a max number of records.
    // Old records get pushed out by new ones once the size or max num records is
    // reached.
    db.createCollection('test', {'capped':true, 'size':1024, 'max':12}, function(err, collection) {      
      for(var i = 0; i < 100; i++) { collection.insert({'a':i}); }
      
      // We will only see the last 12 records
      collection.find(function(err, cursor) {
        cursor.toArray(function(err, items) {
          sys.puts("The number of records: " + items.length);
          db.close();
        })
      })
    });    
  });
});