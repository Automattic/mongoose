GLOBAL.DEBUG = true;

sys = require("sys"),
debug = require('util').debug,
inspect = require('util').inspect,
test = require("assert");

var Db = require('../lib/mongodb').Db,
  Connection = require('../lib/mongodb').Connection,
  Server = require('../lib/mongodb').Server,
  BSON = require('../lib/mongodb').BSONNative;

var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
var port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : Connection.DEFAULT_PORT;

sys.puts("Connecting to " + host + ":" + port);
var db = new Db('node-mongo-examples', new Server(host, port, {}), {native_parser:true});
db.open(function(err, db) {
  db.dropDatabase(function(err, result) {
    db.collection('test', function(err, collection) {      
      // Erase all records from the collection, if any
      collection.remove({}, function(err, result) {
        // Insert 3 records
        for(var i = 0; i < 3; i++) {
          collection.insert({'a':i});
        }
        
        collection.count(function(err, count) {
          sys.puts("There are " + count + " records in the test collection. Here they are:");

          collection.find(function(err, cursor) {
            cursor.each(function(err, item) {
              if(item != null) {
                sys.puts(sys.inspect(item));
                sys.puts("created at " + new Date(item._id.generationTime) + "\n")
              }
              // Null signifies end of iterator
              if(item == null) {                
                // Destory the collection
                collection.drop(function(err, collection) {
                  db.close();
                });
              }
            });
          });          
        });
      });      
    });
  });
});