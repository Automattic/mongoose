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
  db.dropCollection('does-not-exist', function(err, result) {
    db.createCollection('test', function(err, collection) {
      db.strict = true;
      
      // Can't reference collections that does not exist in strict mode
      db.collection('does-not-exist', function(err, collection) {
        if(err instanceof Error) {
          sys.puts("expected error: " + err.message);
        }

        // Can't create collections that does not exist in strict mode
        db.createCollection('test', function(err, collection) {
          if(err instanceof Error) {
            sys.puts("expected error: " + err.message);
          }        

          // Remove the strict mode
          db.strict = false;
          db.dropCollection('test', function(err, collection) {
            db.close();
          });
        });
      });
    });
  });
});