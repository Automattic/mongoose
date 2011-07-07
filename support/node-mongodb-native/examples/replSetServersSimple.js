GLOBAL.DEBUG = true;

sys = require("sys");
test = require("assert");

var Db = require('../lib/mongodb').Db,
  Admin = require('../lib/mongodb').Admin,
  DbCommand = require('../lib/mongodb/commands/db_command').DbCommand,
  Connection = require('../lib/mongodb').Connection,
  Server = require('../lib/mongodb').Server,
  // BSON = require('../lib/mongodb').BSONPure;
  ReplSetServers = require('../lib/mongodb').ReplSetServers,
   CheckMaster = require('../lib/mongodb').CheckMaster,
    BSON = require('../lib/mongodb').BSONNative;

var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
var port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : Connection.DEFAULT_PORT;

var port1 = 27018;
var port2 = 27019;


sys.puts("Connecting to " + host + ":" + port);
sys.puts("Connecting to " + host + ":" + port1);
sys.puts("Connecting to " + host + ":" + port2);

var server = new Server(host, port, {});
var server1 = new Server(host, port1, {});
var server2 = new Server(host, port2, {});
var servers = new Array();
servers[0] = server2;
servers[1] = server1;
servers[2] = server;

var replStat = new ReplSetServers(servers);


 var db = new Db('mongo-example', replStat, {native_parser:true});

db.open(function(err, db) {

  db.dropDatabase(function(err, result) {
          db.collection('test', function(err, collection) {
      collection.remove(function(err, collection) {
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



