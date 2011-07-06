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

  shouldCorrectlyExecuteGroupFunction : function(test) {
    client.createCollection('test_group', function(err, collection) {
      collection.group([], {}, {"count":0}, "function (obj, prev) { prev.count++; }", function(err, results) {
        test.deepEqual([], results);
      });
  
      collection.group([], {}, {"count":0}, "function (obj, prev) { prev.count++; }", true, function(err, results) {
        test.deepEqual([], results);
  
        // Trigger some inserts
        collection.insert([{'a':2}, {'b':5}, {'a':1}], {safe:true}, function(err, ids) {
          collection.group([], {}, {"count":0}, "function (obj, prev) { prev.count++; }", function(err, results) {
            test.equal(3, results[0].count);

            collection.group([], {}, {"count":0}, "function (obj, prev) { prev.count++; }", true, function(err, results) {
              test.equal(3, results[0].count);
  
              collection.group([], {'a':{'$gt':1}}, {"count":0}, "function (obj, prev) { prev.count++; }", function(err, results) {
                test.equal(1, results[0].count);

                collection.group([], {'a':{'$gt':1}}, {"count":0}, "function (obj, prev) { prev.count++; }", true, function(err, results) {
                  test.equal(1, results[0].count);

                  // Insert some more test data
                  collection.insert([{'a':2}, {'b':3}], {safe:true}, function(err, ids) {
                    collection.group(['a'], {}, {"count":0}, "function (obj, prev) { prev.count++; }", function(err, results) {
                      test.equal(2, results[0].a);
                      test.equal(2, results[0].count);
                      test.equal(null, results[1].a);
                      test.equal(2, results[1].count);
                      test.equal(1, results[2].a);
                      test.equal(1, results[2].count);

                      collection.group({'a':true}, {}, {"count":0}, function (obj, prev) { prev.count++; }, true, function(err, results) {
                        test.equal(2, results[0].a);
                        test.equal(2, results[0].count);
                        test.equal(null, results[1].a);
                        test.equal(2, results[1].count);
                        test.equal(1, results[2].a);
                        test.equal(1, results[2].count);

                        collection.group([], {}, {}, "5 ++ 5", function(err, results) {
                          test.ok(err instanceof Error);
                          test.ok(err.message != null);
                          
                          var keyf = function(doc) { return {a: doc.a}; };
                          collection.group(keyf, {a: {$gt: 0}}, {"count": 0, "value": 0},  function(obj, prev) { prev.count++; prev.value += obj.a; }, true, function(err, results) {
                            results.sort(function(a, b) { return b.count - a.count; });
                            test.equal(2, results[0].count);
                            test.equal(2, results[0].a);
                            test.equal(4, results[0].value);
                            test.equal(1, results[1].count);
                            test.equal(1, results[1].a);
                            test.equal(1, results[1].value);

                            collection.group([], {}, {}, "5 ++ 5", true, function(err, results) {
                              test.ok(err instanceof Error);
                              test.ok(err.message != null);
                              // Let's close the db
                              test.done();
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
    });
  },  
  
  // Mapreduce tests functions
  shouldPerformSimpleMapReduceFunctions : function(test) {
    client.createCollection('test_map_reduce_functions', function(err, collection) {
      collection.insert([{'user_id':1}, {'user_id':2}], {safe:true}, function(err, r) {
        // String functions
        var map = function() { emit(this.user_id, 1); };
        var reduce = function(k,vals) { return 1; };

        collection.mapReduce(map, reduce, function(err, collection) {
          collection.findOne({'_id':1}, function(err, result) {
            test.equal(1, result.value);
          });

          collection.findOne({'_id':2}, function(err, result) {
            test.equal(1, result.value);
            test.done();
          });
        });        
      });  
    });
  },
  
  //map/reduce inline option test
  shouldPerformMapReduceFunctionInline : function(test) {
    // Parse version of server if available
    var version = client.version != null ? parseInt(client.version.replace(/\./g, '')) : 0;
    if(version >= 176) {
      client.createCollection('test_map_reduce_functions_inline', function(err, collection) {
        collection.insert([{'user_id':1}, {'user_id':2}], {safe:true}, function(err, r) {
          // String functions
          var map = function() { emit(this.user_id, 1); };
          var reduce = function(k,vals) { return 1; };

          collection.mapReduce(map, reduce, {out : {inline: 1}}, function(err, results) {
            test.equal(2, results.length);
            test.done();
          });          
        });
      });      
    } else {
      test.done();
    }
  },
  
  // Mapreduce different test
  shouldPerformMapReduceInContext : function(test) {
    client.createCollection('test_map_reduce_functions_scope', function(err, collection) {
      collection.insert([{'user_id':1, 'timestamp':new Date()}, {'user_id':2, 'timestamp':new Date()}], {safe:true}, function(err, r) {
        var map = function(){
            emit(test(this.timestamp.getYear()), 1);
        }

        var reduce = function(k, v){
            count = 0;
            for(i = 0; i < v.length; i++) {
                count += v[i];
            }
            return count;
        }

        var t = function(val){ return val+1; }

        collection.mapReduce(map, reduce, {scope:{test:new client.bson_serializer.Code(t.toString())}}, function(err, collection) {
          collection.find(function(err, cursor) {
            cursor.toArray(function(err, results) {
              test.equal(2, results[0].value)
              test.done();
            })
          })
        });        
      });  
    });
  },
  
  // Mapreduce tests
  shouldPerformMapReduceWithStringFunctions : function(test) {
    client.createCollection('test_map_reduce', function(err, collection) {
      collection.insert([{'user_id':1}, {'user_id':2}], {safe:true}, function(err, r) {
        // String functions
        var map = "function() { emit(this.user_id, 1); }";
        var reduce = "function(k,vals) { return 1; }";

        collection.mapReduce(map, reduce, function(err, collection) {
          collection.findOne({'_id':1}, function(err, result) {
            test.equal(1, result.value);
          });

          collection.findOne({'_id':2}, function(err, result) {
            test.equal(1, result.value);
            test.done();
          });
        });        
      });  
    });
  },
  
  shouldPerformMapReduceWithParametersBeingFunctions : function(test) {
    client.createCollection('test_map_reduce_with_functions_as_arguments', function(err, collection) {
      collection.insert([{'user_id':1}, {'user_id':2}], {safe:true}, function(err, r) {
        // String functions
        var map = function() { emit(this.user_id, 1); };
        var reduce = function(k,vals) { return 1; };

        collection.mapReduce(map, reduce, function(err, collection) {
          collection.findOne({'_id':1}, function(err, result) {
            test.equal(1, result.value);
          });
          collection.findOne({'_id':2}, function(err, result) {
            test.equal(1, result.value);
            test.done();
          });
        });        
      });  
    });
  },
  
  shouldPerformMapReduceWithCodeObjects : function(test) {
    client.createCollection('test_map_reduce_with_code_objects', function(err, collection) {
      collection.insert([{'user_id':1}, {'user_id':2}], {safe:true}, function(err, r) {
        // String functions
        var map = new client.bson_serializer.Code("function() { emit(this.user_id, 1); }");
        var reduce = new client.bson_serializer.Code("function(k,vals) { return 1; }");

        collection.mapReduce(map, reduce, function(err, collection) {
          collection.findOne({'_id':1}, function(err, result) {
            test.equal(1, result.value);
          });
          collection.findOne({'_id':2}, function(err, result) {
            test.equal(1, result.value);
            test.done();
          });
        });        
      });  
    });
  },
  
  shouldPerformMapReduceWithOptions : function(test) {
    client.createCollection('test_map_reduce_with_options', function(err, collection) {
      collection.insert([{'user_id':1}, {'user_id':2}, {'user_id':3}], {safe:true}, function(err, r) {
        // String functions
        var map = new client.bson_serializer.Code("function() { emit(this.user_id, 1); }");
        var reduce = new client.bson_serializer.Code("function(k,vals) { return 1; }");

        collection.mapReduce(map, reduce, {'query': {'user_id':{'$gt':1}}}, function(err, collection) {
          collection.count(function(err, count) {
            test.equal(2, count);

            collection.findOne({'_id':2}, function(err, result) {
              test.equal(1, result.value);
            });
            collection.findOne({'_id':3}, function(err, result) {
              test.equal(1, result.value);
              test.done();
            });
          });
        });        
      });  
    });
  },
  
  shouldHandleMapReduceErrors : function(test) {
    client.createCollection('test_map_reduce_error', function(err, collection) {
      collection.insert([{'user_id':1}, {'user_id':2}, {'user_id':3}], {safe:true}, function(err, r) {
        // String functions
        var map = new client.bson_serializer.Code("function() { throw 'error'; }");
        var reduce = new client.bson_serializer.Code("function(k,vals) { throw 'error'; }");

        collection.mapReduce(map, reduce, {'query': {'user_id':{'$gt':1}}}, function(err, r) {
          test.ok(err != null);
          test.done();
        });        
      });  
    });
  },  
})

// Stupid freaking workaround due to there being no way to run setup once for each suite
var numberOfTestsRun = Object.keys(tests).length;
// Assign out tests
module.exports = tests;