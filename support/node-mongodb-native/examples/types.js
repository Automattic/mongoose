GLOBAL.DEBUG = true;

sys = require("sys");
test = require("mjsunit");

var mongo = require('../lib/mongodb');

var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
var port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : mongo.Connection.DEFAULT_PORT;

sys.puts("Connecting to " + host + ":" + port);
var db = new mongo.Db('node-mongo-examples', new mongo.Server(host, port, {}), {});
db.open(function(err, db) {
  db.collection('test', function(err, collection) {    
    // Remove all existing documents in collection
    collection.remove(function(err, collection) {      
      // Insert record with all the available types of values
      collection.insert({'array':[1,2,3], 
        'string':'hello', 
        'hash':{'a':1, 'b':2}, 
        'date':new Date(),          // Stores only milisecond resolution
        'oid':new mongo.ObjectID(),
        'binary':new mongo.Binary([1,2,3]),
        'int':42,
        'float':33.3333,
        'regexp':/foobar/i,
        'boolean':true,
        'where':new mongo.Code('this.x == 3'),
        'dbref':new mongo.DBRef(collection.collectionName, new mongo.ObjectID()),
        'null':null}, function(err, doc) {
          
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