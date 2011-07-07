var mongodb = process.env['TEST_NATIVE'] != null ? require('../../lib/mongodb').native() : require('../../lib/mongodb').pure();

var testCase = require('../../deps/nodeunit').testCase,
  debug = require('util').debug
  inspect = require('util').inspect,
  nodeunit = require('../../deps/nodeunit'),
  fs = require('fs'),
  Db = mongodb.Db,
  Cursor = mongodb.Cursor,
  Collection = mongodb.Collection,
  GridStore = mongodb.GridStore,
  Chunk = mongodb.Chunk,
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

  shouldCorrectlyReadFileUsingStream : function(test) {
    var gridStoreR = new GridStore(client, "test_gs_read_stream", "r");
    var gridStoreW = new GridStore(client, "test_gs_read_stream", "w");
    var data = fs.readFileSync("./test/gridstore/test_gs_weird_bug.png", 'binary');

    var readLen = 0;
    var gotEnd = 0;

    gridStoreW.open(function(err, gs) {
      gs.write(data, function(err, gs) {
        gs.close(function(err, result) {
          gridStoreR.open(function(err, gs) {
            var stream = gs.stream(true);
            stream.on("data", function(chunk) {
              readLen += chunk.length;
            });
            stream.on("end", function() {
              ++gotEnd;
            });
            stream.on("close", function() {
              test.equal(data.length, readLen);
              test.equal(1, gotEnd);
              test.done();
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