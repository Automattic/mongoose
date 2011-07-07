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
var client = new Db(MONGODB, new Server("127.0.0.1", 27017, {auto_reconnect: true, poolSize: 4}), {native_parser: (process.env['TEST_NATIVE'] != null)});

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

  // Test the generation of the object ids
  shouldCorrectlyGenerateObjectID : function(test) {
    var number_of_tests_done = 0;
  
    client.collection('test_object_id_generation.data', function(err, collection) {
      // Insert test documents (creates collections and test fetch by query)
      collection.insert({name:"Fred", age:42}, {safe:true}, function(err, ids) {
        test.equal(1, ids.length);
        test.ok(ids[0]['_id'].toHexString().length == 24);
        // Locate the first document inserted
        collection.findOne({name:"Fred"}, function(err, document) {
          test.equal(ids[0]['_id'].toHexString(), document._id.toHexString());
          number_of_tests_done++;
        });
      });
  
      // Insert another test document and collect using ObjectId
      collection.insert({name:"Pat", age:21}, {safe:true}, function(err, ids) {
        test.equal(1, ids.length);
        test.ok(ids[0]['_id'].toHexString().length == 24);
        // Locate the first document inserted
        collection.findOne(ids[0]['_id'], function(err, document) {
          test.equal(ids[0]['_id'].toHexString(), document._id.toHexString());
          number_of_tests_done++;
        });
      });
  
      // Manually created id
      var objectId = new client.bson_serializer.ObjectID(null);
      // Insert a manually created document with generated oid
      collection.insert({"_id":objectId, name:"Donald", age:95}, {safe:true}, function(err, ids) {
        test.equal(1, ids.length);
        test.ok(ids[0]['_id'].toHexString().length == 24);
        test.equal(objectId.toHexString(), ids[0]['_id'].toHexString());
        // Locate the first document inserted
        collection.findOne(ids[0]['_id'], function(err, document) {
          test.equal(ids[0]['_id'].toHexString(), document._id.toHexString());
          test.equal(objectId.toHexString(), document._id.toHexString());
          number_of_tests_done++;
        });
      });
    });
  
    var intervalId = setInterval(function() {
      if(number_of_tests_done == 3) {
        clearInterval(intervalId);
        test.done();
      }
    }, 100);    
  },
  
  shouldCorrectlyTransformObjectIDToAndFromHexString : function(test) {
    var objectId = new client.bson_serializer.ObjectID(null);
    var originalHex= objectId.toHexString();

    var newObjectId= new client.bson_serializer.ObjectID.createFromHexString(originalHex)
    newHex= newObjectId.toHexString();
    test.equal(originalHex, newHex);
    test.done();
  },
  
  // Use some other id than the standard for inserts
  shouldCorrectlyCreateOIDNotUsingObjectID : function(test) {
    client.createCollection('test_non_oid_id', function(err, collection) {
      var date = new Date();
      date.setUTCDate(12);
      date.setUTCFullYear(2009);
      date.setUTCMonth(11 - 1);
      date.setUTCHours(12);
      date.setUTCMinutes(0);
      date.setUTCSeconds(30);
  
      collection.insert({'_id':date}, {safe:true}, function(err, ids) {
        collection.find({'_id':date}, function(err, cursor) {
          cursor.toArray(function(err, items) {
            test.equal(("" + date), ("" + items[0]._id));
  
            // Let's close the db
            test.done();
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