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
  db.collection('test', function(err, collection) {
    
    // Remove all existing documents in collection
    collection.remove(function(err, collection) {
      
      // Insert 3 records
      for(var i = 0; i < 3; i++) {
        collection.insert({'a':i});
      }
      
      // Show collection names in the database
      db.collectionNames(function(err, names) {
        names.forEach(function(name) {
          sys.puts(sys.inspect(name));          
        });
      });
      
      // More information about each collection
      db.collectionsInfo(function(err, cursor) {
        cursor.toArray(function(err, items) {
          items.forEach(function(item) {
            sys.puts(sys.inspect(item));          
          });        
        });
      })  
      
      // Index information
      db.createIndex('test', 'a', function(err, indexName) {
        db.indexInformation('test', function(err, doc) {
          sys.puts(sys.inspect(doc));                    
          collection.drop(function(err, result) {
            db.close();
          });
        });
      });
    });
  });
});