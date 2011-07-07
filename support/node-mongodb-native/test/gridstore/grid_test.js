var mongodb = process.env['TEST_NATIVE'] != null ? require('../../lib/mongodb').native() : require('../../lib/mongodb').pure();

var testCase = require('../../deps/nodeunit').testCase,
  debug = require('util').debug
  inspect = require('util').inspect,
  nodeunit = require('../../deps/nodeunit'),
  Db = mongodb.Db,
  Cursor = mongodb.Cursor,
  Collection = mongodb.Collection,
  GridStore = mongodb.GridStore,
  Grid = mongodb.Grid,
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

  shouldPutAndGetFileCorrectlyToGridUsingObjectId : function(test) {
    var grid = new Grid(client, 'fs');    
    var originalData = new Buffer('Hello world');
    // Write data to grid
    grid.put(originalData, {}, function(err, result) {
      // Fetch the content
      grid.get(result._id, function(err, data) {
        test.deepEqual(originalData.toString('base64'), data.toString('base64'));
        
        // Should fail due to illegal objectID
        grid.get('not an id', function(err, result) {
          test.ok(err != null);
          
          test.done();
        })        
      })
    })
  },
  
  shouldFailToPutFileDueToDataObjectNotBeingBuffer : function(test) {
    var grid = new Grid(client, 'fs');    
    var originalData = 'Hello world';
    // Write data to grid
    grid.put(originalData, {}, function(err, result) {
      test.ok(err != null);
      test.done();
    })    
  },
  
  shouldCorrectlyWriteFileAndThenDeleteIt : function(test) {
    var grid = new Grid(client, 'fs');    
    var originalData = new Buffer('Hello world');
    // Write data to grid
    grid.put(originalData, {}, function(err, result) {
  
      // Delete file
      grid.delete(result._id, function(err, result2) {
        test.equal(null, err);
        test.equal(true, result2);
        
        // Fetch the content
        grid.get(result._id, function(err, data) {
          test.ok(err != null);
          test.equal(null, data);
          test.done();
        })
      });
    })    
  }
})

// Stupid freaking workaround due to there being no way to run setup once for each suite
var numberOfTestsRun = Object.keys(tests).length;
// Assign out tests
module.exports = tests;