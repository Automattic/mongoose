GLOBAL.DEBUG = true;

sys = require("sys");
debug = require('util').debug,
inspect = require('util').inspect,
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
  db.dropDatabase(function(err, result){
    db.dropCollection('test', function(err, result) {
      db.createCollection('test', function(err, collection) {

        // Erase all records in collection
        collection.remove({}, function(err, r) {
          db.admin(function(err, admin) {

            // Profiling level set/get
            admin.profilingLevel(function(err, profilingLevel) {
              sys.puts("Profiling level: " + profilingLevel);
            });

            // Start profiling everything
            admin.setProfilingLevel('all', function(err, level) {
              sys.puts("Profiling level: " + level);            

              // Read records, creating a profiling event
              collection.find(function(err, cursor) {
                cursor.toArray(function(err, items) {
                  // Stop profiling
                  admin.setProfilingLevel('off', function(err, level) {
                    // Print all profiling info
                    admin.profilingInfo(function(err, info) {
                      sys.puts(sys.inspect(info));

                      // Validate returns a hash if all is well or return an error hash if there is a
                      // problem.
                      admin.validateCollection(collection.collectionName, function(err, result) {
                        sys.puts(result.result);
                        db.close();
                      });
                    });
                  });
                });
              });            
            });
          });
        });
      });    
    });    
  });
});