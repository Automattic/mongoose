GLOBAL.DEBUG = true;

sys = require("sys");
test = require("mjsunit");

var mongo = require('../lib/mongodb');

var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
var port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : mongo.Connection.DEFAULT_PORT;

sys.puts("Connecting to " + host + ":" + port);
var db = new mongo.Db('node-mongo-examples', new mongo.Server(host, port, {}), {});
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