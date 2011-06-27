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

  shouldCorrectlyExtractIndexInformation : function(test) {
    client.createCollection('test_index_information', function(err, collection) {
      collection.insert({a:1}, {safe:true}, function(err, ids) {
        // Create an index on the collection
        client.createIndex(collection.collectionName, 'a', function(err, indexName) {
          test.equal("a_1", indexName);
          // Let's fetch the index information
          client.indexInformation(collection.collectionName, function(err, collectionInfo) {
            test.ok(collectionInfo['_id_'] != null);
            test.equal('_id', collectionInfo['_id_'][0][0]);
            test.ok(collectionInfo['a_1'] != null);
            test.deepEqual([["a", 1]], collectionInfo['a_1']);
  
            client.indexInformation(function(err, collectionInfo2) {
              var count1 = 0, count2 = 0;
              // Get count of indexes
              for(var i in collectionInfo) { count1 += 1;}
              for(var i in collectionInfo2) { count2 += 1;}
  
              // Tests
              test.ok(count2 >= count1);
              test.ok(collectionInfo2['_id_'] != null);
              test.equal('_id', collectionInfo2['_id_'][0][0]);
              test.ok(collectionInfo2['a_1'] != null);
              test.deepEqual([["a", 1]], collectionInfo2['a_1']);
              test.ok((collectionInfo[indexName] != null));
              test.deepEqual([["a", 1]], collectionInfo[indexName]);
  
              // Let's close the db
              test.done();
            });
          });
        });
      })
    });    
  },
  
  shouldCorrectlyHandleMultipleColumnIndexes : function(test) {
    client.createCollection('test_multiple_index_cols', function(err, collection) {
      collection.insert({a:1}, function(err, ids) {
        // Create an index on the collection
        client.createIndex(collection.collectionName, [['a', -1], ['b', 1], ['c', -1]], function(err, indexName) {
          test.equal("a_-1_b_1_c_-1", indexName);
          // Let's fetch the index information
          client.indexInformation(collection.collectionName, function(err, collectionInfo) {
            var count1 = 0;
            // Get count of indexes
            for(var i in collectionInfo) { count1 += 1;}
  
            // Test
            test.equal(2, count1);
            test.ok(collectionInfo[indexName] != null);
            test.deepEqual([['a', -1], ['b', 1], ['c', -1]], collectionInfo[indexName]);
  
            // Let's close the db
            test.done();
          });
        });
      });
    });    
  },
  
  shouldCorrectlyHandleUniqueIndex : function(test) {
    // Create a non-unique index and test inserts
    client.createCollection('test_unique_index', function(err, collection) {
      client.createIndex(collection.collectionName, 'hello', function(err, indexName) {
        // Insert some docs
        collection.insert([{'hello':'world'}, {'hello':'mike'}, {'hello':'world'}], {safe:true}, function(err, errors) {
          // Assert that we have no erros
          client.error(function(err, errors) {
            test.equal(1, errors.length);
            test.equal(null, errors[0].err);
    
            // Create a unique index and test that insert fails
            client.createCollection('test_unique_index2', function(err, collection) {
              client.createIndex(collection.collectionName, 'hello', {unique:true}, function(err, indexName) {
                // Insert some docs
                collection.insert([{'hello':'world'}, {'hello':'mike'}, {'hello':'world'}], {safe:true}, function(err, ids) {          
                  test.ok(err != null);
                  test.done();
                });
              });
            });    
          });
        });
      });
    });  
  },
  
  shouldCorrectlyCreateSubfieldIndex : function(test) {
    // Create a non-unique index and test inserts
    client.createCollection('test_index_on_subfield', function(err, collection) {
      collection.insert([{'hello': {'a':4, 'b':5}}, {'hello': {'a':7, 'b':2}}, {'hello': {'a':4, 'b':10}}], {safe:true}, function(err, ids) {
        // Assert that we have no erros
        client.error(function(err, errors) {
          test.equal(1, errors.length);
          test.ok(errors[0].err == null);

          // Create a unique subfield index and test that insert fails
          client.createCollection('test_index_on_subfield2', function(err, collection) {
            client.createIndex(collection.collectionName, 'hello.a', true, function(err, indexName) {
              collection.insert([{'hello': {'a':4, 'b':5}}, {'hello': {'a':7, 'b':2}}, {'hello': {'a':4, 'b':10}}], {safe:true}, function(err, ids) {
                // Assert that we have erros
                test.ok(err != null);
                test.done();
              });
            });
          });    
        });
      });
    });  
  },
  
  shouldCorrectlyDropIndexes : function(test) {
    client.createCollection('test_drop_indexes', function(err, collection) {
      collection.insert({a:1}, {safe:true}, function(err, ids) {
        // Create an index on the collection
        client.createIndex(collection.collectionName, 'a', function(err, indexName) {
          test.equal("a_1", indexName);
          // Drop all the indexes
          collection.dropIndexes(function(err, result) {
            test.equal(true, result);
  
            collection.indexInformation(function(err, result) {
              test.ok(result['a_1'] == null);
              test.done();
            })
          })
        });
      })
    });
  },  
  
  shouldCorrectlyHandleDistinctIndexes : function(test) {
    client.createCollection('test_distinct_queries', function(err, collection) {
      collection.insert([{'a':0, 'b':{'c':'a'}},
        {'a':1, 'b':{'c':'b'}},
        {'a':1, 'b':{'c':'c'}},
        {'a':2, 'b':{'c':'a'}}, {'a':3}, {'a':3}], {safe:true}, function(err, ids) {
          collection.distinct('a', function(err, docs) {
            test.deepEqual([0, 1, 2, 3], docs.sort());
          });
  
          collection.distinct('b.c', function(err, docs) {
            test.deepEqual(['a', 'b', 'c'], docs.sort());
            test.done();
          });
      })
    });
  },  
  
  shouldCorrectlyExecuteEnsureIndex : function(test) {
    client.createCollection('test_ensure_index', function(err, collection) {
      // Create an index on the collection
      client.ensureIndex(collection.collectionName, 'a', function(err, indexName) {
        test.equal("a_1", indexName);
        // Let's fetch the index information
        client.indexInformation(collection.collectionName, function(err, collectionInfo) {
          test.ok(collectionInfo['_id_'] != null);
          test.equal('_id', collectionInfo['_id_'][0][0]);
          test.ok(collectionInfo['a_1'] != null);
          test.deepEqual([["a", 1]], collectionInfo['a_1']);
  
          client.ensureIndex(collection.collectionName, 'a', function(err, indexName) {
            test.equal("a_1", indexName);
            // Let's fetch the index information
            client.indexInformation(collection.collectionName, function(err, collectionInfo) {
              test.ok(collectionInfo['_id_'] != null);
              test.equal('_id', collectionInfo['_id_'][0][0]);
              test.ok(collectionInfo['a_1'] != null);
              test.deepEqual([["a", 1]], collectionInfo['a_1']);
              // Let's close the db
              test.done();
            });
          });
        });
      });
    })
  },  
  
  shouldCorrectlyCreateAndUseSparseIndex : function(test) {
    client.createCollection('create_and_use_sparse_index_test', function(err, r) {
      client.collection('create_and_use_sparse_index_test', function(err, collection) {
        
        collection.ensureIndex({title:1}, {sparse:true}, function(err, indexName) {
          collection.insert([{name:"Jim"}, {name:"Sarah", title:"Princess"}], {safe:true}, function(err, result) {            
            collection.find({title:{$ne:null}}).sort({title:1}).toArray(function(err, items) {
              test.equal(1, items.length);
              test.equal("Sarah", items[0].name);

              test.done();
            })
          });          
        })
      })
    })    
  },  
})

// Stupid freaking workaround due to there being no way to run setup once for each suite
var numberOfTestsRun = Object.keys(tests).length;
// Assign out tests
module.exports = tests;