GLOBAL.DEBUG = true;

// require.paths.unshift("../external-libs/bson");

sys = require("sys");
test = require("assert");

var Db = require('../lib/mongodb').Db,
  Connection = require('../lib/mongodb').Connection,
  Server = require('../lib/mongodb').Server,
  BSON = require('../lib/mongodb').BSONPure;
  // BSON = require('../lib/mongodb').BSONNative;

var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
var port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : Connection.DEFAULT_PORT;

sys.puts("Connecting to " + host + ":" + port);
var db = new Db('node-mongo-examples', new Server(host, port, {}), {});
db.open(function(err, db) {
  db.collection('test', function(err, collection) {        
    // Remove all existing documents in collection
    collection.remove(function(err, collection) {      
      // Insert record with all the available types of values
      collection.insert({
        'array':[1,2,3], 
        'string':'hello', 
        'hash':{'a':1, 'b':2}, 
        'date':new Date(),          // Stores only milisecond resolution
        'oid':new BSON.ObjectID(),
        'binary':new BSON.Binary("123"),
        'int':42,
        'float':33.3333,
        'regexp':/foobar/i,
        'regexp2':/foobar2/,
        'boolean':true,
        'where':new BSON.Code('this.x == 3'),
        'dbref':new BSON.DBRef(collection.collectionName, new BSON.ObjectID()),
        'null':null
        }, function(err, doc) {
          // Locate the first document
          collection.findOne(function(err, document) {
            sys.puts(sys.inspect(document));            
            collection.remove(function(err, collection) {
              db.close();
            });
          })
        });
    });
  });
});