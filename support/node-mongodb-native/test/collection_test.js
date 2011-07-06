var mongodb = process.env['TEST_NATIVE'] != null ? require('../lib/mongodb').native() : require('../lib/mongodb').pure();

var testCase = require('../deps/nodeunit').testCase,
  debug = require('util').debug
  inspect = require('util').inspect,
  nodeunit = require('../deps/nodeunit'),
  Db = mongodb.Db,
  Cursor = mongodb.Cursor,
  Collection = mongodb.Collection,
  Step = require("../deps/step/lib/step"),
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

  // Test the creation of a collection on the mongo db
  shouldCorrectExecuteBasicCollectionMethods : function(test) {
    client.createCollection('test_collection_methods', function(err, collection) {
      // Verify that all the result are correct coming back (should contain the value ok)
      test.equal('test_collection_methods', collection.collectionName);
      // Let's check that the collection was created correctly
      client.collectionNames(function(err, documents) {
        var found = false;
        documents.forEach(function(document) {
          if(document.name == "integration_tests_.test_collection_methods") found = true;
        });
        test.ok(true, found);
        // Rename the collection and check that it's gone
        client.renameCollection("test_collection_methods", "test_collection_methods2", function(err, reply) {
          test.equal(1, reply.documents[0].ok);
          // Drop the collection and check that it's gone
          client.dropCollection("test_collection_methods2", function(err, result) {
            test.equal(true, result);
            test.done();
          })
        });
      });
    })    
  },
  
  // Test the access to collections
  shouldAccessToCollections : function(test) {
    // Create two collections
    client.createCollection('test.spiderman', function(r) {
      client.createCollection('test.mario', function(r) {
        // Insert test documents (creates collections)
        client.collection('test.spiderman', function(err, spiderman_collection) {
          spiderman_collection.insert({foo:5}, {safe:true}, function(err, r) {
            
            client.collection('test.mario', function(err, mario_collection) {
              mario_collection.insert({bar:0}, {safe:true}, function(err, r) {
                // Assert collections
                client.collections(function(err, collections) {
                  var found_spiderman = false;
                  var found_mario = false;
                  var found_does_not_exist = false;

                  collections.forEach(function(collection) {
                    if(collection.collectionName == "test.spiderman") found_spiderman = true;
                    if(collection.collectionName == "test.mario") found_mario = true;
                    if(collection.collectionName == "does_not_exist") found_does_not_exist = true;
                  });

                  test.ok(found_spiderman);
                  test.ok(found_mario);
                  test.ok(!found_does_not_exist);
                  test.done();
                });                
              });
            });
          });
        });
      });
    });    
  },
  
  // Test dropping of collections
  shouldCorrectlyDropCollection : function(test) {
    client.createCollection('test_drop_collection2', function(err, r) {
      client.dropCollection('test_drop_collection', function(err, r) {
        test.ok(err instanceof Error);
        test.equal("ns not found", err.message);
        var found = false;
        // Ensure we don't have the collection in the set of names
        client.collectionNames(function(err, replies) {
          replies.forEach(function(err, document) {
            if(document.name == "test_drop_collection") {
              found = true;
              return;
            }
          });
          // If we have an instance of the index throw and error
          if(found) throw new Error("should not fail");
          // Let's close the db
          test.done();
        });
      });
    });    
  },
  
  // Test dropping using the collection drop command
  shouldCorrectlyDropCollectionWithDropFunction : function(test) {
    client.createCollection('test_other_drop', function(err, r) {
      client.collection('test_other_drop', function(err, collection) {
        collection.drop(function(err, reply) {
          // Ensure we don't have the collection in the set of names
          client.collectionNames(function(err, replies) {
            var found = false;
            replies.forEach(function(document) {
              if(document.name == "test_other_drop") {
                found = true;
                return;
              }
            });
            // If we have an instance of the index throw and error
            if(found) throw new Error("should not fail");
            // Let's close the db
            test.done();
          });
        });
      });
    });    
  },
  
  shouldCorrectlyRetriveCollectionNames : function(test) {
    client.createCollection('test_collection_names', function(err, r) {
      client.collectionNames(function(err, documents) {
        var found = false;
        var found2 = false;
        documents.forEach(function(document) {
          if(document.name == MONGODB + '.test_collection_names') found = true;
        });
        test.ok(found);
        // Insert a document in an non-existing collection should create the collection
        client.collection('test_collection_names2', function(err, collection) {
          collection.insert({a:1}, {safe:true}, function(err, r) {
            client.collectionNames(function(err, documents) {
              documents.forEach(function(document) {
                if(document.name == MONGODB + '.test_collection_names2') found = true;
                if(document.name == MONGODB + '.test_collection_names') found2 = true;
              });
  
              test.ok(found);
              test.ok(found2);
              // Let's close the db
              test.done();
            });            
          })
        });
      });
    });    
  },
  
  shouldCorrectlyRetrieveCollectionInfo : function(test) {
    client.createCollection('test_collections_info', function(err, r) {
      client.collectionsInfo(function(err, cursor) {
        test.ok((cursor instanceof Cursor));
        // Fetch all the collection info
        cursor.toArray(function(err, documents) {
          test.ok(documents.length > 1);
  
          var found = false;
          documents.forEach(function(document) {
            if(document.name == MONGODB + '.test_collections_info') found = true;
          });
          test.ok(found);
          // Let's close the db
          test.done();
        });
      });
    });    
  },
  
  shouldCorrectlyRetriveCollectionOptions : function(test) {
    client.createCollection('test_collection_options', {'capped':true, 'size':1024}, function(err, collection) {
      test.ok(collection instanceof Collection);
      test.equal('test_collection_options', collection.collectionName);
      // Let's fetch the collection options
      collection.options(function(err, options) {
        test.equal(true, options.capped);
        test.equal(1024, options.size);
        test.equal("test_collection_options", options.create);
        // Let's close the db
        test.done();
      });
    });    
  },
  
  shouldEnsureStrictAccessCollection : function(test) {
    var error_client = new Db(MONGODB, new Server("127.0.0.1", 27017, {auto_reconnect: false}), {strict:true, native_parser: (process.env['TEST_NATIVE'] != null)});
    error_client.bson_deserializer = client.bson_deserializer;
    error_client.bson_serializer = client.bson_serializer;
    error_client.pkFactory = client.pkFactory;
  
    test.equal(true, error_client.strict);
    error_client.open(function(err, error_client) {
      error_client.collection('does-not-exist', function(err, collection) {
        test.ok(err instanceof Error);
        test.equal("Collection does-not-exist does not exist. Currently in strict mode.", err.message);
      });
  
      error_client.createCollection('test_strict_access_collection', function(err, collection) {
        error_client.collection('test_strict_access_collection', function(err, collection) {
          test.ok(collection instanceof Collection);
          // Let's close the db
          error_client.close();
          test.done();
        });
      });
    });
  },  
  
  shouldPerformStrictCreateCollection : function(test) {
    var error_client = new Db(MONGODB, new Server("127.0.0.1", 27017, {auto_reconnect: false}), {strict:true, native_parser: (process.env['TEST_NATIVE'] != null)});
    error_client.bson_deserializer = client.bson_deserializer;
    error_client.bson_serializer = client.bson_serializer;
    error_client.pkFactory = client.pkFactory;
    test.equal(true, error_client.strict);
  
    error_client.open(function(err, error_client) {
      error_client.createCollection('test_strict_create_collection', function(err, collection) {
        test.ok(collection instanceof Collection);
  
        // Creating an existing collection should fail
        error_client.createCollection('test_strict_create_collection', function(err, collection) {
          test.ok(err instanceof Error);
          test.equal("Collection test_strict_create_collection already exists. Currently in strict mode.", err.message);
  
          // Switch out of strict mode and try to re-create collection
          error_client.strict = false;
          error_client.createCollection('test_strict_create_collection', function(err, collection) {
            test.ok(collection instanceof Collection);
  
            // Let's close the db
            error_client.close();
            test.done();
          });
        });
      });
    });
  },  
  
  shouldFailToInsertDueToIllegalKeys : function(test) {
    client.createCollection('test_invalid_key_names', function(err, collection) {
      // Legal inserts
      collection.insert([{'hello':'world'}, {'hello':{'hello':'world'}}], {safe:true}, function(err, r) {        
        // Illegal insert for key
        collection.insert({'$hello':'world'}, {safe:true}, function(err, doc) {
          test.ok(err instanceof Error);
          test.equal("key $hello must not start with '$'", err.message);
        });

        collection.insert({'hello':{'$hello':'world'}}, {safe:true}, function(err, doc) {
          test.ok(err instanceof Error);
          test.equal("key $hello must not start with '$'", err.message);
        });

        collection.insert({'he$llo':'world'}, {safe:true}, function(err, docs) {
          test.ok(docs[0].constructor == Object);
        })

        collection.insert({'hello':{'hell$o':'world'}}, {safe:true}, function(err, docs) {
          test.ok(err == null);
        })

        collection.insert({'.hello':'world'}, {safe:true}, function(err, doc) {
          test.ok(err instanceof Error);
          test.equal("key .hello must not contain '.'", err.message);
        });

        collection.insert({'hello':{'.hello':'world'}}, {safe:true}, function(err, doc) {
          test.ok(err instanceof Error);
          test.equal("key .hello must not contain '.'", err.message);
        });

        collection.insert({'hello.':'world'}, {safe:true}, function(err, doc) {
          test.ok(err instanceof Error);
          test.equal("key hello. must not contain '.'", err.message);
        });

        collection.insert({'hello':{'hello.':'world'}}, {safe:true}, function(err, doc) {
          test.ok(err instanceof Error);
          test.equal("key hello. must not contain '.'", err.message);
          // Let's close the db
          test.done();
        });
      });
    });
  },  
  
  shouldFailDueToIllegalCollectionNames : function(test) {
    client.collection(5, function(err, collection) {
      test.equal("collection name must be a String", err.message);
    });
  
    client.collection("", function(err, collection) {
      test.equal("collection names cannot be empty", err.message);
    });
  
    client.collection("te$t", function(err, collection) {
      test.equal("collection names must not contain '$'", err.message);
    });
  
    client.collection(".test", function(err, collection) {
      test.equal("collection names must not start or end with '.'", err.message);
    });
  
    client.collection("test.", function(err, collection) {
      test.equal("collection names must not start or end with '.'", err.message);
    });
  
    client.collection("test..t", function(err, collection) {
      test.equal("collection names cannot be empty", err.message);
  
      // Let's close the db
      test.done();
    });
  },  
  
  // Test the count result on a collection that does not exist
  shouldCorrectlyCountOnNonExistingCollection : function(test) {
    client.collection('test_multiple_insert_2', function(err, collection) {
      collection.count(function(err, count) {
        test.equal(0, count);
        // Let's close the db
        test.done();
      });
    });
  },  
  
  shouldCorrectlyExecuteSave : function(test) {
    client.createCollection('test_save', function(err, collection) {
      var doc = {'hello':'world'};
      collection.save(doc, {safe:true}, function(err, docs) {
        test.ok(docs._id instanceof client.bson_serializer.ObjectID || Object.prototype.toString.call(docs._id) === '[object ObjectID]');
        collection.count(function(err, count) {
          test.equal(1, count);
          doc = docs;
  
          collection.save(doc, {safe:true}, function(err, doc) {
            collection.count(function(err, count) {
              test.equal(1, count);
            });
  
            collection.findOne(function(err, doc) {
              test.equal('world', doc.hello);
  
              // Modify doc and save
              doc.hello = 'mike';
              collection.save(doc, {safe:true}, function(err, doc) {
                collection.count(function(err, count) {
                  test.equal(1, count);
                });
  
                collection.findOne(function(err, doc) {
                  test.equal('mike', doc.hello);
  
                  // Save another document
                  collection.save({hello:'world'}, {safe:true}, function(err, doc) {
                    collection.count(function(err, count) {
                      test.equal(2, count);
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
  },
  
  shouldCorrectlySaveDocumentWithLongValue : function(test) {
    client.createCollection('test_save_long', function(err, collection) {
      collection.insert({'x':client.bson_serializer.Long.fromNumber(9223372036854775807)}, {safe:true}, function(err, r) {
        collection.findOne(function(err, doc) {
          test.ok(client.bson_serializer.Long.fromNumber(9223372036854775807).equals(doc.x));
          // Let's close the db
          test.done();
        });        
      });
    });
  },
    
  shouldSaveObjectThatHasIdButDoesNotExistInCollection : function(test) {
    client.createCollection('test_save_with_object_that_has_id_but_does_not_actually_exist_in_collection', function(err, collection) {
      var a = {'_id':'1', 'hello':'world'};
      collection.save(a, {safe:true}, function(err, docs) {
        collection.count(function(err, count) {
          test.equal(1, count);
  
          collection.findOne(function(err, doc) {
            test.equal('world', doc.hello);
  
            doc.hello = 'mike';
            collection.save(doc, {safe:true}, function(err, doc) {
              collection.count(function(err, count) {
                test.equal(1, count);
              });
  
              collection.findOne(function(err, doc) {
                test.equal('mike', doc.hello);
                // Let's close the db
                test.done();
              });
            });
          });
        });
      });
    });
  },  
  
  shouldCorrectlyPerformUpsert : function(test) {
    client.createCollection('test_should_correctly_do_upsert', function(err, collection) {
      var id = new client.bson_serializer.ObjectID(null)
      var doc = {_id:id, a:1};

      Step(
        function test1() {
          var self = this;
          
  
          collection.update({"_id":id}, doc, {upsert:true, safe:true}, function(err, result) {
            test.equal(null, err);        
            test.equal(1, result);
  
            collection.findOne({"_id":id}, self);
          });          
        },
        
        function test2(err, doc) {
          var self = this;
          test.equal(1, doc.a);
          
          id = new client.bson_serializer.ObjectID(null)
          doc = {_id:id, a:2};
          
          collection.update({"_id":id}, doc, {safe:true, upsert:true}, function(err, result) {
            test.equal(null, err);
            test.equal(1, result);
  
            collection.findOne({"_id":id}, self);
          });          
        },
        
        function test3(err, doc) {
          var self = this;
          test.equal(2, doc.a);          
  
          collection.update({"_id":id}, doc, {safe:true, upsert:true}, function(err, result) {
            test.equal(null, err);
            test.equal(1, result);
  
            collection.findOne({"_id":id}, function(err, doc) {
              test.equal(2, doc.a);
              test.done();                        
            });
          });
        }        
      );                  
    });
  },
  
  shouldCorrectlyUpdateWithNoDocs : function(test) {
    client.createCollection('test_should_correctly_do_update_with_no_docs', function(err, collection) {
      var id = new client.bson_serializer.ObjectID(null)
      var doc = {_id:id, a:1};
      collection.update({"_id":id}, doc, {safe:true}, function(err, numberofupdateddocs) {
        test.equal(null, err);
        test.equal(0, numberofupdateddocs);
  
        test.done();
      });
    });
  },
  
  shouldCorrectlyExecuteInsertUpdateDeleteSafeMode : function(test) {
    client.createCollection('test_should_execute_insert_update_delete_safe_mode', function(err, collection) {
      test.ok(collection instanceof Collection);
      test.equal('test_should_execute_insert_update_delete_safe_mode', collection.collectionName);
  
      collection.insert({i:1}, {safe:true}, function(err, ids) {
        test.equal(1, ids.length);
        test.ok(ids[0]._id.toHexString().length == 24);
  
        // Update the record
        collection.update({i:1}, {"$set":{i:2}}, {safe:true}, function(err, result) {
          test.equal(null, err);
          test.equal(1, result);
        
          // Remove safely
          collection.remove({}, {safe:true}, function(err, result) {
            test.equal(null, err);            
            
            test.done();
          });
        });
      });
    });
  },  
  
  shouldPerformMultipleSaves : function(test) {
     client.createCollection("multiple_save_test", function(err, collection) {
       //insert new user
       collection.save({
         name: 'amit',
         text: 'some text'
       }, {safe:true}, function(err, r) {
         collection.find({}, {name: 1}).limit(1).toArray(function(err, users){
           user = users[0]
           if(err) {
             throw new Error(err)
           } else if(user) {
             user.pants = 'worn'

             collection.save(user, {safe:true}, function(err, result){
               test.equal(null, err);
               test.equal(1, result);

              test.done();
             })
           }
         });         
       })
    });
  },
  
  shouldCorrectlySaveDocumentWithNestedArray : function(test) {
    var db = new Db(MONGODB, new Server('localhost', 27017, {auto_reconnect: true}), {native_parser: (process.env['TEST_NATIVE'] != null)});
    db.bson_deserializer = client.bson_deserializer;
    db.bson_serializer = client.bson_serializer;
    db.pkFactory = client.pkFactory;
  
    db.open(function(err, db) {
      db.createCollection("save_error_on_save_test", function(err, collection) {      
        // Create unique index for username
        collection.createIndex([['username', 1]], true, function(err, result) {
          //insert new user
          collection.save({
            email: 'email@email.com',
            encrypted_password: 'password',
            friends: 
              [ '4db96b973d01205364000006',
                '4db94a1948a683a176000001',
                '4dc77b24c5ba38be14000002' ],
            location: [ 72.4930088, 23.0431957 ],
            name: 'Amit Kumar',
            password_salt: 'salty',
            profile_fields: [],
            username: 'amit' }, {safe:true}, function(err, doc){
          
              collection.find({}).limit(1).toArray(function(err, users){
                test.equal(null, err);        
                user = users[0]
                user.friends.splice(1,1)
  
                collection.save(user, function(err, doc){
                  test.equal(null, err);    
  
                  // Update again
                  collection.update({_id:new client.bson_serializer.ObjectID(user._id.toString())}, {friends:user.friends}, {upsert:true, safe:true}, function(err, result) {
                  test.equal(null, err);
                  test.equal(1, result);                
  
                  db.close();
                  test.done();
                });             
              });
            });        
          });
        })
      });
    });
  },
  
  shouldPeformCollectionRemoveWithNoCallback : function(test) {
     client.collection("remove_with_no_callback_bug_test", function(err, collection) {
       collection.save({a:1}, {safe:true}, function(){
         collection.save({b:1}, {safe:true}, function(){
           collection.save({c:1}, {safe:true}, function(){
             collection.remove({a:1}, {safe:true}, function() {
               // Let's perform a count
               collection.count(function(err, count) {
                 test.equal(null, err);    
                 test.equal(2, count);
  
                test.done();
               });               
             })             
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