var mongodb = process.env['TEST_NATIVE'] != null ? require('../lib/mongodb').native() : require('../lib/mongodb').pure();

var testCase = require('../deps/nodeunit').testCase,
  debug = require('util').debug
  inspect = require('util').inspect,
  nodeunit = require('../deps/nodeunit'),
  Db = mongodb.Db,
  Cursor = mongodb.Cursor,
  Script = require('vm'),
  Collection = mongodb.Collection,
  Server = mongodb.Server,
  Step = require("../deps/step/lib/step"),
  ServerManager = require('./tools/server_manager').ServerManager;  

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
        // Close the client
        client.close();        
        callback();
      // });        
    } else {
      client.close();
      callback();        
    }      
  },

  shouldForceMongoDbServerToAssignId : function(test) {
    /// Set up server with custom pk factory
    var db = new Db(MONGODB, new Server('localhost', 27017, {auto_reconnect: true}), {native_parser: (process.env['TEST_NATIVE'] != null), 'forceServerObjectId':true});
    db.bson_deserializer = client.bson_deserializer;
    db.bson_serializer = client.bson_serializer;
  
    db.open(function(err, client) {
      client.createCollection('test_insert2', function(err, r) {
        client.collection('test_insert2', function(err, collection) {
    
          Step(
            function inserts() {
              var group = this.group();
              
              for(var i = 1; i < 1000; i++) {
                collection.insert({c:i}, group());
              }            
            },
            
            function done(err, result) {
              collection.insert({a:2}, {safe:true}, function(err, r) {
                collection.insert({a:3}, {safe:true}, function(err, r) {
                  collection.count(function(err, count) {
                    test.equal(1001, count);
                    // Locate all the entries using find
                    collection.find(function(err, cursor) {
                      cursor.toArray(function(err, results) {
                        test.equal(1001, results.length);
                        test.ok(results[0] != null);
    
                        client.close();
                        // Let's close the db
                        test.done();
                      });
                    });
                  });
                });
              });            
            }
          )  
        });
      });    
    });    
  },
  
  shouldCorrectlyPerformBasicInsert : function(test) {
    client.createCollection('test_insert', function(err, r) {
      client.collection('test_insert', function(err, collection) {
  
        Step(
          function inserts() {
            var group = this.group();
            
            for(var i = 1; i < 1000; i++) {
              collection.insert({c:i}, group());
            }            
          },
          
          function done(err, result) {
            collection.insert({a:2}, {safe:true}, function(err, r) {
              collection.insert({a:3}, {safe:true}, function(err, r) {
                collection.count(function(err, count) {
                  test.equal(1001, count);
                  // Locate all the entries using find
                  collection.find(function(err, cursor) {
                    cursor.toArray(function(err, results) {
                      test.equal(1001, results.length);
                      test.ok(results[0] != null);
  
                      // Let's close the db
                      test.done();
                    });
                  });
                });
              });
            });            
          }
        )  
      });
    });    
  },
  
  // Test multiple document insert
  shouldCorrectlyHandleMultipleDocumentInsert : function(test) {
    client.createCollection('test_multiple_insert', function(err, r) {
      var collection = client.collection('test_multiple_insert', function(err, collection) {
        var docs = [{a:1}, {a:2}];
  
        collection.insert(docs, {safe:true}, function(err, ids) {
          ids.forEach(function(doc) {
            test.ok(((doc['_id']) instanceof client.bson_serializer.ObjectID || Object.prototype.toString.call(doc['_id']) === '[object ObjectID]'));
          });
  
          // Let's ensure we have both documents
          collection.find(function(err, cursor) {
            cursor.toArray(function(err, docs) {
              test.equal(2, docs.length);
              var results = [];
              // Check that we have all the results we want
              docs.forEach(function(doc) {
                if(doc.a == 1 || doc.a == 2) results.push(1);
              });
              test.equal(2, results.length);
              // Let's close the db
              test.done();
            });
          });
        });
      });
    });    
  },
  
  shouldCorrectlyInsertAndRetrieveLargeIntegratedArrayDocument : function(test) {
    client.createCollection('test_should_deserialize_large_integrated_array', function(err, collection) {
      var doc = {'a':0,
        'b':['tmp1', 'tmp2', 'tmp3', 'tmp4', 'tmp5', 'tmp6', 'tmp7', 'tmp8', 'tmp9', 'tmp10', 'tmp11', 'tmp12', 'tmp13', 'tmp14', 'tmp15', 'tmp16']
      };
      // Insert the collection
      collection.insert(doc, {safe:true}, function(err, r) {
        // Fetch and check the collection
        collection.findOne({'a': 0}, function(err, result) {
          test.deepEqual(doc.a, result.a);
          test.deepEqual(doc.b, result.b);
          test.done();
        });        
      });
    });
  },  
  
  shouldCorrectlyInsertAndRetrieveDocumentWithAllTypes : function(test) {
    client.createCollection('test_all_serialization_types', function(err, collection) {
      var date = new Date();
      var oid = new client.bson_serializer.ObjectID();
      var string = 'binstring'
      var bin = new client.bson_serializer.Binary()
      for(var index = 0; index < string.length; index++) {
        bin.put(string.charAt(index))
      }
  
      var motherOfAllDocuments = {
        'string': 'hello',
        'array': [1,2,3],
        'hash': {'a':1, 'b':2},
        'date': date,
        'oid': oid,
        'binary': bin,
        'int': 42,
        'float': 33.3333,
        'regexp': /regexp/,
        'boolean': true,
        'long': date.getTime(),
        'where': new client.bson_serializer.Code('this.a > i', {i:1}),
        'dbref': new client.bson_serializer.DBRef('namespace', oid, 'integration_tests_')
      }
  
      collection.insert(motherOfAllDocuments, {safe:true}, function(err, docs) {
        collection.findOne(function(err, doc) {
          // // Assert correct deserialization of the values
          test.equal(motherOfAllDocuments.string, doc.string);
          test.deepEqual(motherOfAllDocuments.array, doc.array);
          test.equal(motherOfAllDocuments.hash.a, doc.hash.a);
          test.equal(motherOfAllDocuments.hash.b, doc.hash.b);
          test.equal(date.getTime(), doc.long);
          test.equal(date.toString(), doc.date.toString());
          test.equal(date.getTime(), doc.date.getTime());
          test.equal(motherOfAllDocuments.oid.toHexString(), doc.oid.toHexString());
          test.equal(motherOfAllDocuments.binary.value(), doc.binary.value());
  
          test.equal(motherOfAllDocuments.int, doc.int);
          test.equal(motherOfAllDocuments.long, doc.long);
          test.equal(motherOfAllDocuments.float, doc.float);
          test.equal(motherOfAllDocuments.regexp.toString(), doc.regexp.toString());
          test.equal(motherOfAllDocuments.boolean, doc.boolean);
          test.equal(motherOfAllDocuments.where.code, doc.where.code);
          test.equal(motherOfAllDocuments.where.scope['i'], doc.where.scope.i);
  
          test.equal(motherOfAllDocuments.dbref.namespace, doc.dbref.namespace);
          test.equal(motherOfAllDocuments.dbref.oid.toHexString(), doc.dbref.oid.toHexString());
          test.equal(motherOfAllDocuments.dbref.db, doc.dbref.db);
          
          test.done();
        })
      });
    });
  },  
  
  shouldCorrectlyInsertAndUpdateDocumentWithNewScriptContext: function(test) {
    var db = new Db(MONGODB, new Server('localhost', 27017, {auto_reconnect: true}), {native_parser: (process.env['TEST_NATIVE'] != null)});
    db.bson_deserializer = client.bson_deserializer;
    db.bson_serializer = client.bson_serializer;
    db.pkFactory = client.pkFactory;
  
    db.open(function(err, db) {
      //convience curried handler for functions of type 'a -> (err, result)
      function getResult(callback){
        return function(error, result) {
          test.ok(error == null);
          return callback(result);
        }
      };
  
      db.collection('users', getResult(function(user_collection){
        user_collection.remove({}, {safe:true}, function(err, result) {
          //first, create a user object
          var newUser = { name : 'Test Account', settings : {} };
          user_collection.insert([newUser], {safe:true}, getResult(function(users){
              var user = users[0];
  
              var scriptCode = "settings.block = []; settings.block.push('test');";
              var context = { settings : { thisOneWorks : "somestring" } };
  
              Script.runInNewContext(scriptCode, context, "testScript");
  
              //now create update command and issue it
              var updateCommand = { $set : context };
  
              user_collection.update({_id : user._id}, updateCommand, {safe:true},
                getResult(function(updateCommand) {
                  // Fetch the object and check that the changes are persisted
                  user_collection.findOne({_id : user._id}, function(err, doc) {
                    test.ok(err == null);
                    test.equal("Test Account", doc.name);
                    test.equal("somestring", doc.settings.thisOneWorks);
                    test.equal("test", doc.settings.block[0]);
  
                    // Let's close the db                    
                    db.close();
                    test.done();
                  });
                })
              );
          }));
        });
      }));
    });
  },
  
  shouldCorrectlySerializeDocumentWithAllTypesInNewContext : function(test) {
    client.createCollection('test_all_serialization_types_new_context', function(err, collection) {
      var date = new Date();
      var scriptCode =
        "var string = 'binstring'\n" +
        "var bin = new mongo.Binary()\n" +
        "for(var index = 0; index < string.length; index++) {\n" +
        "  bin.put(string.charAt(index))\n" +
        "}\n" +
        "motherOfAllDocuments['string'] = 'hello';" +
        "motherOfAllDocuments['array'] = [1,2,3];" +
        "motherOfAllDocuments['hash'] = {'a':1, 'b':2};" +
        "motherOfAllDocuments['date'] = date;" +
        "motherOfAllDocuments['oid'] = new mongo.ObjectID();" +
        "motherOfAllDocuments['binary'] = bin;" +
        "motherOfAllDocuments['int'] = 42;" +
        "motherOfAllDocuments['float'] = 33.3333;" +
        "motherOfAllDocuments['regexp'] = /regexp/;" +
        "motherOfAllDocuments['boolean'] = true;" +
        "motherOfAllDocuments['long'] = motherOfAllDocuments['date'].getTime();" +
        "motherOfAllDocuments['where'] = new mongo.Code('this.a > i', {i:1});" +
        "motherOfAllDocuments['dbref'] = new mongo.DBRef('namespace', motherOfAllDocuments['oid'], 'integration_tests_');";
  
      var context = { motherOfAllDocuments : {}, mongo:client.bson_serializer, date:date};
      // Execute function in context
      Script.runInNewContext(scriptCode, context, "testScript");
      // sys.puts(sys.inspect(context.motherOfAllDocuments))
      var motherOfAllDocuments = context.motherOfAllDocuments;
  
      collection.insert(context.motherOfAllDocuments, {safe:true}, function(err, docs) {
         collection.findOne(function(err, doc) {
           // Assert correct deserialization of the values
           test.equal(motherOfAllDocuments.string, doc.string);
           test.deepEqual(motherOfAllDocuments.array, doc.array);
           test.equal(motherOfAllDocuments.hash.a, doc.hash.a);
           test.equal(motherOfAllDocuments.hash.b, doc.hash.b);
           test.equal(date.getTime(), doc.long);
           test.equal(date.toString(), doc.date.toString());
           test.equal(date.getTime(), doc.date.getTime());
           test.equal(motherOfAllDocuments.oid.toHexString(), doc.oid.toHexString());
           test.equal(motherOfAllDocuments.binary.value, doc.binary.value);
  
           test.equal(motherOfAllDocuments.int, doc.int);
           test.equal(motherOfAllDocuments.long, doc.long);
           test.equal(motherOfAllDocuments.float, doc.float);
           test.equal(motherOfAllDocuments.regexp.toString(), doc.regexp.toString());
           test.equal(motherOfAllDocuments.boolean, doc.boolean);
           test.equal(motherOfAllDocuments.where.code, doc.where.code);
           test.equal(motherOfAllDocuments.where.scope['i'], doc.where.scope.i);
           test.equal(motherOfAllDocuments.dbref.namespace, doc.dbref.namespace);
           test.equal(motherOfAllDocuments.dbref.oid.toHexString(), doc.dbref.oid.toHexString());
           test.equal(motherOfAllDocuments.dbref.db, doc.dbref.db);
           
           test.done();
         })
       });
    });
  },  
  
  shouldCorrectlyDoToJsonForLongValue : function(test) {
    client.createCollection('test_to_json_for_long', function(err, collection) {
      test.ok(collection instanceof Collection);
  
      collection.insertAll([{value: client.bson_serializer.Long.fromNumber(32222432)}], {safe:true}, function(err, ids) {
        collection.findOne({}, function(err, item) {
          test.equal("32222432", item.value.toJSON())
          
          test.done();
        });
      });
    });        
  },  
  
  shouldCorrectlyInsertAndUpdateWithNoCallback : function(test) {
    var db = new Db(MONGODB, new Server('localhost', 27017, {auto_reconnect: true, poolSize: 1}), {native_parser: (process.env['TEST_NATIVE'] != null)});
    db.bson_deserializer = client.bson_deserializer;
    db.bson_serializer = client.bson_serializer;
    db.pkFactory = client.pkFactory;
  
    db.open(function(err, client) {
      client.createCollection('test_insert_and_update_no_callback', function(err, collection) {
        // Insert the update
        collection.insert({i:1}, {safe:true})
        // Update the record
        collection.update({i:1}, {"$set":{i:2}}, {safe:true})
      
        // Make sure we leave enough time for mongodb to record the data
        setTimeout(function() {
          // Locate document
          collection.findOne({}, function(err, item) {
            test.equal(2, item.i)
  
            client.close();
            test.done();            
          });                
        }, 100)
      })
    });
  },
  
  shouldInsertAndQueryTimestamp : function(test) {
    client.createCollection('test_insert_and_query_timestamp', function(err, collection) {
      // Insert the update
      collection.insert({i:client.bson_serializer.Timestamp.fromNumber(100), j:client.bson_serializer.Long.fromNumber(200)}, {safe:true}, function(err, r) {
        // Locate document
        collection.findOne({}, function(err, item) {
          test.equal(100, item.i.toNumber())
          test.equal(200, item.j.toNumber())
  
          test.done();
        });                
      })
    })
  },
  
  shouldCorrectlyInsertAndQueryUndefined : function(test) {
    client.createCollection('test_insert_and_query_undefined', function(err, collection) {
      // Insert the update
      collection.insert({i:undefined}, {safe:true}, function(err, r) {
        // Locate document
        collection.findOne({}, function(err, item) {
          test.equal(null, item.i)
  
          test.done();
        });        
      })
    })
  },
  
  shouldCorrectlySerializeDBRefToJSON : function(test) {
    var dbref = new client.bson_serializer.DBRef("foo",
                                                 client.bson_serializer.ObjectID.createFromHexString("fc24a04d4560531f00000000"),
                                                 null);
    JSON.stringify(dbref);
    test.done();
  },
  
  shouldCorrectlyPerformSafeInsert : function(test) {
    var fixtures = [{
        name: "empty", array: [], bool: false, dict: {}, float: 0.0, string: ""
      }, {
        name: "not empty", array: [1], bool: true, dict: {x: "y"}, float: 1.0, string: "something"
      }, {
        name: "simple nested", array: [1, [2, [3]]], bool: true, dict: {x: "y", array: [1,2,3,4], dict: {x: "y", array: [1,2,3,4]}}, float: 1.5, string: "something simply nested"
      }];
  
  
    client.createCollection('test_safe_insert', function(err, collection) {
      Step(
        function inserts() {
          var group = this.group();
          
          for(var i = 0; i < fixtures.length; i++) {
            collection.insert(fixtures[i], {safe:true}, group());
          }          
        },
        
        function done() {
          collection.count(function(err, count) {
            test.equal(3, count);
  
            collection.find().toArray(function(err, docs) {
              test.equal(3, docs.length)
            });
          });
  
  
          collection.find({}, {}, function(err, cursor) {
            var counter = 0;
  
            cursor.each(function(err, doc) {
              if(doc == null) {
                test.equal(3, counter);            
                test.done();
              } else {
                counter = counter + 1;
              }          
            });
          });          
        }
      )          
    })
  },  
  
  shouldThrowErrorIfSerializingFunction : function(test) {
    client.createCollection('test_should_throw_error_if_serializing_function', function(err, collection) {
      // Insert the update
      collection.insert({i:1, z:function() { return 1} }, {safe:true}, function(err, result) {
        collection.findOne({_id:result[0]._id}, function(err, object) {
          test.equal(null, object.z);
          test.equal(1, object.i);
  
          test.done();
        })        
      })
    })    
  }, 
  
  shouldCorrectlyInsertDocumentWithUUID : function(test) {
     client.collection("insert_doc_with_uuid", function(err, collection) {
       collection.insert({_id : "12345678123456781234567812345678", field: '1'}, {safe:true}, function(err, result) {
         test.equal(null, err);
  
       collection.find({_id : "12345678123456781234567812345678"}).toArray(function(err, items) {
         test.equal(null, err);
         test.equal(items[0]._id, "12345678123456781234567812345678")
         test.equal(items[0].field, '1')
          
          // Generate a binary id
          var binaryUUID = new client.bson_serializer.Binary('00000078123456781234567812345678', client.bson_serializer.BSON.BSON_BINARY_SUBTYPE_UUID);
  
          collection.insert({_id : binaryUUID, field: '2'}, {safe:true}, function(err, result) {
           collection.find({_id : binaryUUID}).toArray(function(err, items) {
             test.equal(null, err);
              test.equal(items[0].field, '2')
  
              test.done();
           });
          });
         })              
       });     
     });
  },  
  
  shouldCorrectlyCallCallbackWithDbDriverInStrictMode : function(test) {
    var db = new Db(MONGODB, new Server('localhost', 27017, {auto_reconnect: true, poolSize: 1}), {strict:true, native_parser: (process.env['TEST_NATIVE'] != null)});
    db.bson_deserializer = client.bson_deserializer;
    db.bson_serializer = client.bson_serializer;
    db.pkFactory = client.pkFactory;
  
    db.open(function(err, client) {
      client.createCollection('test_insert_and_update_no_callback_strict', function(err, collection) {
        collection.insert({_id : "12345678123456781234567812345678", field: '1'}, {safe:true}, function(err, result) {
          test.equal(null, err);

          collection.update({ '_id': "12345678123456781234567812345678" }, { '$set': { 'field': 0 }}, function(err, numberOfUpdates) {
            test.equal(null, err);
            test.equal(1, numberOfUpdates);            
            
            db.close();
            test.done();
          });                
        });
      });
    });
  },
  
  shouldCorrectlyInsertDBRefWithDbNotDefined : function(test) {
    client.createCollection('shouldCorrectlyInsertDBRefWithDbNotDefined', function(err, collection) {
      var doc = {_id: new client.bson_serializer.ObjectID()};
      var doc2 = {_id: new client.bson_serializer.ObjectID()};
      var doc3 = {_id: new client.bson_serializer.ObjectID()};
      collection.insert(doc, {safe:true}, function(err, result) {
        // Create object with dbref
        doc2.ref = new client.bson_serializer.DBRef('shouldCorrectlyInsertDBRefWithDbNotDefined', doc._id);
        doc3.ref = new client.bson_serializer.DBRef('shouldCorrectlyInsertDBRefWithDbNotDefined', doc._id, MONGODB);

        collection.insert([doc2, doc3], {safe:true}, function(err, result) {
          // Get all items
          collection.find().toArray(function(err, items) {
            test.equal("shouldCorrectlyInsertDBRefWithDbNotDefined", items[1].ref.namespace);
            test.equal(doc._id.toString(), items[1].ref.oid.toString());
            test.equal(null, items[1].ref.db);

            test.equal("shouldCorrectlyInsertDBRefWithDbNotDefined", items[2].ref.namespace);
            test.equal(doc._id.toString(), items[2].ref.oid.toString());
            test.equal(MONGODB, items[2].ref.db);

            test.done();          
          })          
        });
      });
    });    
  }
})

// Stupid freaking workaround due to there being no way to run setup once for each suite
var numberOfTestsRun = Object.keys(tests).length;
// Assign out tests
module.exports = tests;