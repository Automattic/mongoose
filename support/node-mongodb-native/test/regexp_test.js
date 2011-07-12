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
  
  // shouldCorrectlyInsertSimpleRegExpDocument : function(test) {
  //   var regexp = /foobar/i;
  // 
  //   client.createCollection('test_regex', function(err, collection) {
  //     collection.insert({'b':regexp}, {safe:true}, function(err, ids) {
  //       collection.find({}, {'fields': ['b']}, function(err, cursor) {
  //         cursor.toArray(function(err, items) {
  //           test.equal(("" + regexp), ("" + items[0].b));
  //           // Let's close the db
  //           test.done();
  //         });
  //       });
  //     });
  //   });
  // },
  
  shouldCorrectlyInsertSimpleUTF8Regexp : function(test) {
    var regexp = /foobaré/;
  
    client.createCollection('test_utf8_regex', function(err, collection) {
      collection.insert({'b':regexp}, {safe:true}, function(err, ids) {
        collection.find({}, {'fields': ['b']}, function(err, cursor) {
          cursor.toArray(function(err, items) {
            test.equal(("" + regexp), ("" + items[0].b));
            // Let's close the db
            test.done();
          });
        });
      });
    });    
  },
  
  // shouldCorrectlyFindDocumentsByRegExp : function(test) {
  //   // Serialized regexes contain extra trailing chars. Sometimes these trailing chars contain / which makes
  //   // the original regex invalid, and leads to segmentation fault.
  //   client.createCollection('test_regex_serialization', function(err, collection) {
  //     collection.insert({keywords: ["test", "segmentation", "fault", "regex", "serialization", "native"]}, {safe:true}, function(err, r) {
  //       
  //       var count = 20,
  //           run = function(i) {
  //             // search by regex            
  //             collection.findOne({keywords: {$all: [/ser/, /test/, /seg/, /fault/, /nat/]}}, function(err, item) {            
  //               test.equal(6, item.keywords.length);              
  //               if (i === 0) {
  //                test.done()
  //              }
  //             });
  //           };
  //       // loop a few times to catch the / in trailing chars case
  //       while (count--) {
  //         run(count);
  //       }
  //     });      
  //   });    
  // }
})

// Stupid freaking workaround due to there being no way to run setup once for each suite
var numberOfTestsRun = Object.keys(tests).length;
// Assign out tests
module.exports = tests;