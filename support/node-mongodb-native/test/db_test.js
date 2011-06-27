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

  // Test the auto connect functionality of the db
  shouldCorrectlyPerformAutomaticConnect : function(test) {
    var automatic_connect_client = new Db(MONGODB, new Server("127.0.0.1", 27017, {auto_reconnect: true}), {native_parser: (process.env['TEST_NATIVE'] != null)});
    automatic_connect_client.bson_deserializer = client.bson_deserializer;
    automatic_connect_client.bson_serializer = client.bson_serializer;
    automatic_connect_client.pkFactory = client.pkFactory;
  
    automatic_connect_client.open(function(err, automatic_connect_client) {
      // Listener for closing event
      var closeListener = function(has_error) {
        // Remove the listener for the close to avoid loop
        automatic_connect_client.removeListener("close", closeListener);
        // Let's insert a document
        automatic_connect_client.collection('test_object_id_generation.data2', function(err, collection) {
          // Insert another test document and collect using ObjectId
          collection.insert({"name":"Patty", "age":34}, {safe:true}, function(err, ids) {
            test.equal(1, ids.length);
            test.ok(ids[0]._id.toHexString().length == 24);
  
            collection.findOne({"name":"Patty"}, function(err, document) {
              test.equal(ids[0]._id.toHexString(), document._id.toHexString());
              // Let's close the db
              automatic_connect_client.close();
              test.done();
            });
          });
        });
      };
      
      // Add listener to close event
      automatic_connect_client.on("close", closeListener);
      automatic_connect_client.close();
    });    
  },
  
  // Test that error conditions are handled correctly
  shouldCorrectlyHandleConnectionErrors : function(test) {
    // Test error handling for single server connection
    var serverConfig = new Server("127.0.0.1", 21017, {auto_reconnect: true});
    var error_client = new Db(MONGODB, serverConfig, {native_parser: (process.env['TEST_NATIVE'] != null) ? true : false});
      
    error_client.on("error", function(err) {});
    error_client.on("close", function(connection) {
      test.ok(typeof connection == typeof serverConfig);
      test.equal("127.0.0.1", connection.host);
      test.equal(21017, connection.port);
      test.equal(true, connection.autoReconnect);
      test.done();
    });
    error_client.open(function(err, error_client) {});
  },
  
  shouldCorrectlyExecuteEvalFunctions : function(test) {
    client.eval('function (x) {return x;}', [3], function(err, result) {
      test.equal(3, result);
    });
  
    client.eval('function (x) {db.test_eval.save({y:x});}', [5], function(err, result) {
      // Locate the entry
      client.collection('test_eval', function(err, collection) {
        collection.findOne(function(err, item) {
          test.equal(5, item.y);
        });
      });
    });
  
    client.eval('function (x, y) {return x + y;}', [2, 3], function(err, result) {
      test.equal(5, result);
    });
  
    client.eval('function () {return 5;}', function(err, result) {
      test.equal(5, result);
    });
  
    client.eval('2 + 3;', function(err, result) {
      test.equal(5, result);
    });
  
    client.eval(new client.bson_serializer.Code("2 + 3;"), function(err, result) {
      test.equal(5, result);
    });
  
    client.eval(new client.bson_serializer.Code("return i;", {'i':2}), function(err, result) {
      test.equal(2, result);
    });
  
    client.eval(new client.bson_serializer.Code("i + 3;", {'i':2}), function(err, result) {
      test.equal(5, result);
    });
  
    client.eval("5 ++ 5;", function(err, result) {
      test.ok(err instanceof Error);
      test.ok(err.message != null);
      // Let's close the db
      test.done();
    });
  },  
  
  shouldCorrectlyDereferenceDbRef : function(test) {
    client.createCollection('test_deref', function(err, collection) {
      collection.insert({'a':1}, {safe:true}, function(err, ids) {
        collection.remove({}, {safe:true}, function(err, result) {
          collection.count(function(err, count) {
            test.equal(0, count);
  
            // Execute deref a db reference
            client.dereference(new client.bson_serializer.DBRef("test_deref", new client.bson_serializer.ObjectID()), function(err, result) {
              collection.insert({'x':'hello'}, {safe:true}, function(err, ids) {
                collection.findOne(function(err, document) {
                  test.equal('hello', document.x);
  
                  client.dereference(new client.bson_serializer.DBRef("test_deref", document._id), function(err, result) {
                    test.equal('hello', document.x);

                    client.dereference(new client.bson_serializer.DBRef("test_deref", 4), function(err, result) {
                      var obj = {'_id':4};

                      collection.insert(obj, {safe:true}, function(err, ids) {
                        client.dereference(new client.bson_serializer.DBRef("test_deref", 4), function(err, document) {

                          test.equal(obj['_id'], document._id);
                          collection.remove({}, {safe:true}, function(err, result) {
                            collection.insert({'x':'hello'}, {safe:true}, function(err, ids) {
                              client.dereference(new client.bson_serializer.DBRef("test_deref", null), function(err, result) {
                                test.equal(null, result);
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
          })
        })
      })
    });
  },  
  
  shouldCorrectlyRenameCollection : function(test) {
    client.createCollection('test_rename_collection', function(err, collection) {
      client.createCollection('test_rename_collection2', function(err, collection) {
        client.collection('test_rename_collection', function(err, collection1) {
          client.collection('test_rename_collection2', function(err, collection2) {
            // Assert rename
            collection1.rename(5, function(err, collection) {
              test.ok(err instanceof Error);
              test.equal("collection name must be a String", err.message);
            });
  
            collection1.rename("", function(err, collection) {
              test.ok(err instanceof Error);
              test.equal("collection names cannot be empty", err.message);
            });
  
            collection1.rename("te$t", function(err, collection) {
              test.ok(err instanceof Error);
              test.equal("collection names must not contain '$'", err.message);
            });
  
            collection1.rename(".test", function(err, collection) {
              test.ok(err instanceof Error);
              test.equal("collection names must not start or end with '.'", err.message);
            });
  
            collection1.rename("test.", function(err, collection) {
              test.ok(err instanceof Error);
              test.equal("collection names must not start or end with '.'", err.message);
            });
  
            collection1.rename("tes..t", function(err, collection) {
              test.equal("collection names cannot be empty", err.message);
            });
  
            collection1.count(function(err, count) {
              test.equal(0, count);
  
              collection1.insert([{'x':1}, {'x':2}], {safe:true}, function(err, docs) {
                collection1.count(function(err, count) {
                  test.equal(2, count);
  
                  collection1.rename('test_rename_collection2', function(err, collection) {
                    test.ok(err instanceof Error);
                    test.ok(err.message.length > 0);
  
                    collection1.rename('test_rename_collection3', function(err, collection) {
                      test.equal("test_rename_collection3", collection.collectionName);
  
                      // Check count
                      collection.count(function(err, count) {
                        test.equal(2, count);
                        // Let's close the db
                        test.done();
                      });
                    });
                  });
                });
              })
            })
  
            collection2.count(function(err, count) {
              test.equal(0, count);
            })
          });
        });
      });
    });
  },  
  
  shouldCorrectlyHandleFailedConnection : function(test) {
    var fs_client = new Db(MONGODB, new Server("127.0.0.1", 27117, {auto_reconnect: false}), {native_parser: (process.env['TEST_NATIVE'] != null)});
    fs_client.bson_deserializer = client.bson_deserializer;
    fs_client.bson_serializer = client.bson_serializer;
    fs_client.pkFactory = client.pkFactory;  
    fs_client.open(function(err, fs_client) {
      test.ok(err != null)
      test.done();
    })
  },

  shouldCorrectlyResaveDBRef :  function(test) {
    client.dropCollection('test_resave_dbref', function() {
        client.createCollection('test_resave_dbref', function(err, collection) {
            test.ifError(err);
            collection.insert({'name': 'parent'}, {safe : true}, function(err, objs) {
                 test.ok(objs && objs.length == 1 && objs[0]._id != null);
                 var parent = objs[0];
                 var child = {'name' : 'child', 'parent' : new client.bson_serializer.DBRef("test_resave_dbref",  parent._id)};
                 collection.insert(child, {safe : true}, function(err, objs) {
                     test.ifError(err);
                     collection.findOne({'name' : 'child'}, function(err, child) { //Child deserialized
                          test.ifError(err);
                          test.ok(child != null);
                          collection.save(child, {save : true}, function(err) {
                             test.ifError(err); //Child node with dbref resaved!
                             collection.findOne({'parent' : new client.bson_serializer.DBRef("test_resave_dbref",  parent._id)},
                             function(err, child) {
                                 test.ifError(err);
                                 test.ok(child != null);//!!!! Main test point!
                                 test.done();
                             })
                          });
                     });
                 });
            });
        });
    });
  }

})

// Stupid freaking workaround due to there being no way to run setup once for each suite
var numberOfTestsRun = Object.keys(tests).length;
// Assign out tests
module.exports = tests;