var mongodb = process.env['TEST_NATIVE'] != null ? require('../lib/mongodb').native() : require('../lib/mongodb').pure();

var testCase = require('../deps/nodeunit').testCase,
  debug = require('util').debug
  inspect = require('util').inspect,
  nodeunit = require('../deps/nodeunit'),
  Db = mongodb.Db,
  Cursor = mongodb.Cursor,
  Collection = mongodb.Collection,
  Server = mongodb.Server;

var MONGODB = 'integration_tests';
var client = new Db(MONGODB, new Server("127.0.0.1", 27017, {auto_reconnect: true, poolSize: 4, native_parser: (process.env['TEST_NATIVE'] != null) ? true : false}));

// Define the tests, we want them to run as a nested test so we only clean up the 
// db connection once
var tests = testCase({
  setUp: function(callback) {
    client.open(function(err, db_p) {
      if(numberOfTestsRun == Object.keys(tests).length) {
        // If first test drop the db
        client.dropDatabase(function(err, done) {
          callback();
        });                
      } else {
        return callback();        
      }      
    });
  },
  
  tearDown: function(callback) {
    numberOfTestsRun = numberOfTestsRun - 1;
    // Drop the database and close it
    if(numberOfTestsRun <= 0) {
      // client.dropDatabase(function(err, done) {
        client.close();
        callback();
      // });        
    } else {
      client.close();
      callback();        
    }      
  },

  shouldCreateRecordsWithCustomPKFactory : function(test) {
    // Custom factory (need to provide a 12 byte array);
    CustomPKFactory = function() {}
    CustomPKFactory.prototype = new Object();
    CustomPKFactory.createPk = function() {
      return new client.bson_serializer.ObjectID("aaaaaaaaaaaa");
    }
  
    var p_client = new Db(MONGODB, new Server("127.0.0.1", 27017), {'pk':CustomPKFactory, native_parser: (process.env['TEST_NATIVE'] != null)});
    p_client.bson_deserializer = client.bson_deserializer;
    p_client.bson_serializer = client.bson_serializer;
  
    p_client.open(function(err, p_client) {
      p_client.dropDatabase(function(err, done) {
        p_client.createCollection('test_custom_key', function(err, collection) {
          collection.insert({'a':1}, {safe:true}, function(err, doc) {
            collection.find({'_id':new client.bson_serializer.ObjectID("aaaaaaaaaaaa")}, function(err, cursor) {
              cursor.toArray(function(err, items) {
                test.equal(1, items.length);
  
                p_client.close();
                test.done();
              });
            });
          });
        });
      });
    });
  },
})

// Stupid freaking workaround due to there being no way to run setup once for each suite
var numberOfTestsRun = Object.keys(tests).length;
// Assign out tests
module.exports = tests;