GLOBAL.DEBUG = true;

sys = require("sys");
test = require("assert");
var mongo = require('../lib/mongodb'),
  ObjectID = require('../lib/mongodb/bson/bson').ObjectID,
  Cursor = require('../lib/mongodb/cursor').Cursor,
  OrderedHash = require('../lib/mongodb/bson/collections').OrderedHash,
  Collection = require('../lib/mongodb/collection').Collection,
  BinaryParser = require('../lib/mongodb/bson/binary_parser').BinaryParser,
  Buffer = require('buffer').Buffer,
  fs = require('fs'),
  Script = process.binding('evals').Script;

/*******************************************************************************************************
  Integration Tests
*******************************************************************************************************/
var all_tests = {

  // Test unicode characters
  test_unicode_characters : function() {
    client.createCollection('unicode_test_collection', function(err, collection) {
      var test_strings = ["ouooueauiOUOOUEAUI", "öüóőúéáűíÖÜÓŐÚÉÁŰÍ"];
      collection.insert({id: 0, text: test_strings[0]}, function(err, ids) {
        collection.insert({id: 1, text: test_strings[1]}, function(err, ids) {
          collection.find(function(err, cursor) {
            cursor.each(function(err, item) {
              if(item !== null) {
                test.equal(test_strings[item.id], item.text);
              }
            });

            finished_test({test_unicode_characters:'ok'});
          });
        });
      });
    });
  },

  // Test the creation of a collection on the mongo db
  test_collection_methods : function() {
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
            finished_test({test_collection_methods:'ok'});
          })
        });
      });
    })
  },

  // Test the authentication method for the user
  test_authentication : function() {
    var user_name = 'spongebob';
    var password = 'password';

    client.authenticate('admin', 'admin', function(err, replies) {
      test.ok(err instanceof Error);
      test.ok(!replies);

      // Add a user
      client.addUser(user_name, password, function(err, result) {
        client.authenticate(user_name, password, function(err, replies) {
          test.ok(replies);
          finished_test({test_authentication:'ok'});
        });      
      });    
    });
  },

  // Test the access to collections
  test_collections : function() {  
    // Create two collections
    client.createCollection('test.spiderman', function(r) {
      client.createCollection('test.mario', function(r) {
        // Insert test documents (creates collections)
        client.collection('test.spiderman', function(err, spiderman_collection) {
          spiderman_collection.insert(new mongo.OrderedHash().add("foo", 5));        
        });

        client.collection('test.mario', function(err, mario_collection) {
          mario_collection.insert(new mongo.OrderedHash().add("bar", 0));        
        });

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
          finished_test({test_collections:'ok'});
        });
      });
    });  
  },

  // Test the generation of the object ids
  test_object_id_generation : function() {
    var number_of_tests_done = 0;

    client.collection('test_object_id_generation.data', function(err, collection) {
      // Insert test documents (creates collections and test fetch by query)
      collection.insert(new mongo.OrderedHash().add("name", "Fred").add("age", 42), function(err, ids) {
        test.equal(1, ids.length);    
        test.ok(ids[0].get('_id').toHexString().length == 24);
        // Locate the first document inserted
        collection.findOne(new mongo.OrderedHash().add("name", "Fred"), function(err, document) {
          test.equal(ids[0].get('_id').toHexString(), document._id.toHexString());
          number_of_tests_done++;
        });      
      });

      // Insert another test document and collect using ObjectId
      collection.insert(new mongo.OrderedHash().add("name", "Pat").add("age", 21), function(err, ids) {
        test.equal(1, ids.length);  
        test.ok(ids[0].get('_id').toHexString().length == 24);
        // Locate the first document inserted
        collection.findOne(ids[0].get('_id'), function(err, document) {
          test.equal(ids[0].get('_id').toHexString(), document._id.toHexString());
          number_of_tests_done++;
        });      
      });

      // Manually created id
      var objectId = new mongo.ObjectID(null);

      // Insert a manually created document with generated oid
      collection.insert(new mongo.OrderedHash().add("_id", objectId).add("name", "Donald").add("age", 95), function(err, ids) {
        test.equal(1, ids.length);  
        test.ok(ids[0].get('_id').toHexString().length == 24);
        test.equal(objectId.toHexString(), ids[0].get('_id').toHexString());
        // Locate the first document inserted
        collection.findOne(ids[0].get('_id'), function(err, document) {
          test.equal(ids[0].get('_id').toHexString(), document._id.toHexString());
          test.equal(objectId.toHexString(), document._id.toHexString());
          number_of_tests_done++;
        });      
      });    
    });

    var intervalId = setInterval(function() {
      if(number_of_tests_done == 3) {
        clearInterval(intervalId);
        finished_test({test_object_id_generation:'ok'});
      }
    }, 100);    
  },

  test_object_id_to_and_from_hex_string : function() {
      var objectId = new mongo.ObjectID(null);
      var originalHex= objectId.toHexString();

      var newObjectId= new mongo.ObjectID.createFromHexString(originalHex)
      newHex= newObjectId.toHexString();    
      test.equal(originalHex, newHex);
      finished_test({test_object_id_to_and_from_hex_string:'ok'});
  },

  // Test the auto connect functionality of the db
  test_automatic_reconnect : function() {
    var automatic_connect_client = new mongo.Db('integration_tests_', new mongo.Server("127.0.0.1", 27017, {auto_reconnect: true}), {});
    automatic_connect_client.open(function(err, automatic_connect_client) {
      // Listener for closing event
      var closeListener = function(has_error) {
        // Remove the listener for the close to avoid loop
        automatic_connect_client.serverConfig.masterConnection.removeListener("close", closeListener);
        // Let's insert a document
        automatic_connect_client.collection('test_object_id_generation.data2', function(err, collection) {
          // Insert another test document and collect using ObjectId
          collection.insert({"name":"Patty", "age":34}, function(err, ids) {
            test.equal(1, ids.length);    
            test.ok(ids[0]._id.toHexString().length == 24);

            collection.findOne({"name":"Patty"}, function(err, document) {
              test.equal(ids[0]._id.toHexString(), document._id.toHexString());
              // Let's close the db 
              finished_test({test_automatic_reconnect:'ok'});    
              automatic_connect_client.close();
            });      
          });        
        });
      };    
      // Add listener to close event
      automatic_connect_client.serverConfig.masterConnection.addListener("close", closeListener);
      automatic_connect_client.serverConfig.masterConnection.connection.end();
    });  
  },

  // Test that error conditions are handled correctly
  test_connection_errors : function() {
    // Test error handling for single server connection
    var serverConfig = new mongo.Server("127.0.0.1", 21017, {auto_reconnect: true});
    var error_client = new mongo.Db('integration_tests_', serverConfig, {});

    error_client.addListener("error", function(err) {});
    error_client.addListener("close", function(connection) {
      test.ok(typeof connection == typeof serverConfig);
      test.equal("127.0.0.1", connection.host);
      test.equal(21017, connection.port);
      test.equal(true, connection.autoReconnect);
    });
    error_client.open(function(err, error_client) {});    

    // Test error handling for server pair (works for cluster aswell)
    var serverConfig = new mongo.Server("127.0.0.1", 21017, {});
    var normalServer = new mongo.Server("127.0.0.1", 27017);
    var serverPairConfig = new mongo.ServerPair(normalServer, serverConfig);
    var error_client_pair = new mongo.Db('integration_tests_21', serverPairConfig, {});

    var closeListener = function(connection) {
      test.ok(typeof connection == typeof serverConfig);
      test.equal("127.0.0.1", connection.host);
      test.equal(21017, connection.port);
      test.equal(false, connection.autoReconnect);
        // Let's close the db
      finished_test({test_connection_errors:'ok'});
      error_client_pair.removeListener("close", closeListener);
      normalServer.close();
    };

    error_client_pair.addListener("error", function(err) {});
    error_client_pair.addListener("close", closeListener);
    error_client_pair.open(function(err, error_client_pair) {});
  },

  // Test the error reporting functionality
  test_error_handling : function() {
    var error_client = new mongo.Db('integration_tests2_', new mongo.Server("127.0.0.1", 27017, {auto_reconnect: false}), {});  
    error_client.open(function(err, error_client) {
      error_client.resetErrorHistory(function() {
        error_client.error(function(err, documents) {
          test.equal(true, documents[0].ok);                
          test.equal(0, documents[0].n);    

          // Force error on server
          error_client.executeDbCommand({forceerror: 1}, function(err, r) {
            test.equal(0, r.documents[0].ok);                
            test.ok(r.documents[0].errmsg.length > 0);    
            // // Check for previous errors
            error_client.previousErrors(function(err, documents) {
              test.equal(true, documents[0].ok);                
              test.equal(1, documents[0].nPrev);    
              test.equal("forced error", documents[0].err);
              // Check for the last error
              error_client.error(function(err, documents) {
                test.equal("forced error", documents[0].err);    
                // Force another error
                error_client.collection('test_error_collection', function(err, collection) {
                  collection.findOne(new mongo.OrderedHash().add("name", "Fred"), function(err, document) {              
                    // Check that we have two previous errors
                    error_client.previousErrors(function(err, documents) {
                      test.equal(true, documents[0].ok);                
                      test.equal(2, documents[0].nPrev);    
                      test.equal("forced error", documents[0].err);

                      error_client.resetErrorHistory(function() {
                        error_client.previousErrors(function(err, documents) {
                          test.equal(true, documents[0].ok);                
                          test.equal(-1, documents[0].nPrev);                        

                          error_client.error(function(err, documents) {
                            test.equal(true, documents[0].ok);                
                            test.equal(0, documents[0].n);

                            // Let's close the db 
                            finished_test({test_error_handling:'ok'}); 
                            error_client.close();
                          });
                        })
                      });
                    });
                  });
                });
              })          
            });
          });
        });
      });
    });
  },

  // Test the last status functionality of the driver
  test_last_status : function() {  
    client.createCollection('test_last_status', function(err, collection) {
      test.ok(collection instanceof Collection);
      test.equal('test_last_status', collection.collectionName);

      // Get the collection
      client.collection('test_last_status', function(err, collection) {
        // Remove all the elements of the collection
        collection.remove(function(err, collection) {
          // Check update of a document
          collection.insert(new mongo.OrderedHash().add("i", 1), function(err, ids) {
            test.equal(1, ids.length);    
            test.ok(ids[0].get('_id').toHexString().length == 24);        

            // Update the record
            collection.update(new mongo.OrderedHash().add("i", 1), new mongo.OrderedHash().add("$set", new mongo.OrderedHash().add("i", 2)), function(err, result) {
              // Check for the last message from the server
              client.lastStatus(function(err, status) {
                test.equal(true, status.documents[0].ok);                
                test.equal(true, status.documents[0].updatedExisting);                
                // Check for failed update of document
                collection.update(new mongo.OrderedHash().add("i", 1), new mongo.OrderedHash().add("$set", new mongo.OrderedHash().add("i", 500)), function(err, result) {
                  client.lastStatus(function(err, status) {
                    test.equal(true, status.documents[0].ok);                
                    test.equal(false, status.documents[0].updatedExisting);                

                    // Check safe update of a document
                    collection.insert(new mongo.OrderedHash().add("x", 1), function(err, ids) {
                      collection.update(new mongo.OrderedHash().add("x", 1), new mongo.OrderedHash().add("$set", new mongo.OrderedHash().add("x", 2)), {'safe':true}, function(err, document) {
                        test.ok(document instanceof OrderedHash);
                        test.ok(document.get('$set') instanceof OrderedHash);
                      });

                      collection.update(new mongo.OrderedHash().add("y", 1), new mongo.OrderedHash().add("$set", new mongo.OrderedHash().add("y", 2)), {'safe':true}, function(err, document) {
                        test.ok(err instanceof Error);
                        test.equal("Failed to update document", err.message);

                        // Let's close the db 
                        finished_test({test_last_status:'ok'});                     
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

  // Test clearing out of the collection
  test_clear : function() {
    client.createCollection('test_clear', function(err, r) {
      client.collection('test_clear', function(err, collection) {
        collection.insert(new mongo.OrderedHash().add("i", 1), function(err, ids) {
          collection.insert(new mongo.OrderedHash().add("i", 2), function(err, ids) {
            collection.count(function(err, count) {
              test.equal(2, count);    
              // Clear the collection
              collection.remove(function(err, collection) {
                collection.count(function(err, count) {
                  test.equal(0, count);    
                  // Let's close the db 
                  finished_test({test_clear:'ok'}); 
                });
              });        
            });
          });
        });          
      });    
    });  
  },

  // Test insert of documents
  test_insert : function() {
    client.createCollection('test_insert', function(err, r) {
      client.collection('test_insert', function(err, collection) {
        for(var i = 1; i < 1000; i++) {
          collection.insert(new mongo.OrderedHash().add('c', i), function(err, r) {});
        }

        collection.insert(new mongo.OrderedHash().add('a', 2), function(err, r) {
          collection.insert(new mongo.OrderedHash().add('a', 3), function(err, r) {
            collection.count(function(err, count) {
              test.equal(1001, count);
              // Locate all the entries using find
              collection.find(function(err, cursor) {
                cursor.toArray(function(err, results) {
                  test.equal(1001, results.length);
                  test.ok(results[0] != null);

                  // Let's close the db 
                  finished_test({test_insert:'ok'}); 
                });
              });          
            });        
          });
        });      
      });    
    });
  },

  // Test multiple document insert
  test_multiple_insert : function() {
    client.createCollection('test_multiple_insert', function(err, r) {
      var collection = client.collection('test_multiple_insert', function(err, collection) {
        var docs = [new mongo.OrderedHash().add('a', 1), new mongo.OrderedHash().add('a', 2)];

        collection.insert(docs, function(err, ids) {
          ids.forEach(function(doc) {
            test.ok(((doc.get('_id')) instanceof ObjectID));
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
              finished_test({test_multiple_insert:'ok'}); 
            });
          });
        });      
      });
    });  
  },

  // Test the count result on a collection that does not exist
  test_count_on_nonexisting : function() {
    client.collection('test_multiple_insert', function(err, collection) {
      collection.count(function(err, count) {  
        test.equal(0, count);
        // Let's close the db 
        finished_test({test_count_on_nonexisting:'ok'}); 
      });    
    });
  },

  // Test a simple find
  test_find_simple : function() {
    client.createCollection('test_find_simple', function(err, r) {
      var collection = client.collection('test_find_simple', function(err, collection) {
        var doc1 = null;
        var doc2 = null;

        // Insert some test documents
        collection.insert([new mongo.OrderedHash().add('a', 2), new mongo.OrderedHash().add('b', 3)], function(err, docs) {doc1 = docs[0]; doc2 = docs[1]});
        // Ensure correct insertion testing via the cursor and the count function
        collection.find(function(err, cursor) {
          cursor.toArray(function(err, documents) {
            test.equal(2, documents.length);
          })            
        });    
        collection.count(function(err, count) {
          test.equal(2, count);      
        });
        // Fetch values by selection    
        collection.find({'a': doc1.a}, function(err, cursor) {
          cursor.toArray(function(err, documents) {
            test.equal(1, documents.length);
            test.equal(doc1.a, documents[0].a);
            // Let's close the db 
            finished_test({test_find_simple:'ok'}); 
          });
        });      
      });
    });
  },

  // Test advanced find
  // Test advanced find
  test_find_advanced : function() {
    client.createCollection('test_find_advanced', function(err, r) {
      var collection = client.collection('test_find_advanced', function(err, collection) {
        var doc1 = null, doc2 = null, doc3 = null;

        // Insert some test documents
        collection.insert([new mongo.OrderedHash().add('a', 1), new mongo.OrderedHash().add('a', 2), new mongo.OrderedHash().add('b', 3)], function(err, docs) {
            var doc1 = docs[0], doc2 = docs[1], doc3 = docs[2];
        
            // Locate by less than
            collection.find({'a':{'$lt':10}}, function(err, cursor) {
              cursor.toArray(function(err, documents) {
                test.equal(2, documents.length);
                // Check that the correct documents are returned
                var results = [];
                // Check that we have all the results we want
                documents.forEach(function(doc) {
                  if(doc.a == 1 || doc.a == 2) results.push(1);
                });
                test.equal(2, results.length);
              });
            });    

            // Locate by greater than
            collection.find({'a':{'$gt':1}}, function(err, cursor) {
              cursor.toArray(function(err, documents) {
                test.equal(1, documents.length);
                test.equal(2, documents[0].a);
              });
            });    

            // Locate by less than or equal to
            collection.find({'a':{'$lte':1}}, function(err, cursor) {
              cursor.toArray(function(err, documents) {
                test.equal(1, documents.length);
                test.equal(1, documents[0].a);
              });
            });    

            // Locate by greater than or equal to
            collection.find({'a':{'$gte':1}}, function(err, cursor) {
              cursor.toArray(function(err, documents) {
                test.equal(2, documents.length);
                // Check that the correct documents are returned
                var results = [];
                // Check that we have all the results we want
                documents.forEach(function(doc) {
                  if(doc.a == 1 || doc.a == 2) results.push(1);
                });
                test.equal(2, results.length);
              });
            });    

            // Locate by between
            collection.find({'a':{'$gt':1, '$lt':3}}, function(err, cursor) {
              cursor.toArray(function(err, documents) {
                test.equal(1, documents.length);
                test.equal(2, documents[0].a);
              });
            });    

            // Locate in clause
            collection.find({'a':{'$in':[1,2]}}, function(err, cursor) {
              cursor.toArray(function(err, documents) {
                test.equal(2, documents.length);
                // Check that the correct documents are returned
                var results = [];
                // Check that we have all the results we want
                documents.forEach(function(doc) {
                  if(doc.a == 1 || doc.a == 2) results.push(1);
                });
                test.equal(2, results.length);    
              });
            });
            
            // Locate in _id clause
            collection.find({'_id':{'$in':[doc1.values._id, doc2.values._id]}}, function(err, cursor) {
              cursor.toArray(function(err, documents) {
                test.equal(2, documents.length);
                // Check that the correct documents are returned
                var results = [];
                // Check that we have all the results we want
                documents.forEach(function(doc) {
                  if(doc.a == 1 || doc.a == 2) results.push(1);
                });
                test.equal(2, results.length);
                // Let's close the db 
                finished_test({test_find_advanced:'ok'});     
              });
            });
        });
      });
    });
  },

  // Test sorting of results
  test_find_sorting : function() {
    client.createCollection('test_find_sorting', function(err, r) {
      client.collection('test_find_sorting', function(err, collection) {
        var doc1 = null, doc2 = null, doc3 = null, doc4 = null;
        // Insert some test documents
        collection.insert([new mongo.OrderedHash().add('a', 1).add('b', 2), 
            new mongo.OrderedHash().add('a', 2).add('b', 1), 
            new mongo.OrderedHash().add('a', 3).add('b', 2),
            new mongo.OrderedHash().add('a', 4).add('b', 1)
          ], function(err, docs) {doc1 = docs[0]; doc2 = docs[1]; doc3 = docs[2]; doc4 = docs[3]});

        // Test sorting (ascending)
        collection.find({'a': {'$lt':10}}, {'sort': [['a', 1]]}, function(err, cursor) {
          cursor.toArray(function(err, documents) {
            test.equal(4, documents.length);
            test.equal(1, documents[0].a);
            test.equal(2, documents[1].a);
            test.equal(3, documents[2].a);
            test.equal(4, documents[3].a);
          });
        });

        // Test sorting (descending)
        collection.find({'a': {'$lt':10}}, {'sort': [['a', -1]]}, function(err, cursor) {
          cursor.toArray(function(err, documents) {
            test.equal(4, documents.length);
            test.equal(4, documents[0].a);
            test.equal(3, documents[1].a);
            test.equal(2, documents[2].a);
            test.equal(1, documents[3].a);
          });
        });

        // Sorting using array of names, assumes ascending order
        collection.find({'a': {'$lt':10}}, {'sort': ['a']}, function(err, cursor) {
          cursor.toArray(function(err, documents) {
            test.equal(4, documents.length);
            test.equal(1, documents[0].a);
            test.equal(2, documents[1].a);
            test.equal(3, documents[2].a);
            test.equal(4, documents[3].a);
          });
        });

        // Sorting using single name, assumes ascending order
        collection.find({'a': {'$lt':10}}, {'sort': 'a'}, function(err, cursor) {
          cursor.toArray(function(err, documents) {
            test.equal(4, documents.length);
            test.equal(1, documents[0].a);
            test.equal(2, documents[1].a);
            test.equal(3, documents[2].a);
            test.equal(4, documents[3].a);
          });
        });

        collection.find({'a': {'$lt':10}}, {'sort': ['b', 'a']}, function(err, cursor) {
          cursor.toArray(function(err, documents) {
            test.equal(4, documents.length);
            test.equal(2, documents[0].a);
            test.equal(4, documents[1].a);
            test.equal(1, documents[2].a);
            test.equal(3, documents[3].a);
          });
        });

        // Sorting using empty array, no order guarantee should not blow up
        collection.find({'a': {'$lt':10}}, {'sort': []}, function(err, cursor) {
          cursor.toArray(function(err, documents) {
            test.equal(4, documents.length);
            // Let's close the db 
            finished_test({test_find_sorting:'ok'});     
          });
        });

        // Sorting using ordered hash
        collection.find({'a': {'$lt':10}}, {'sort': new mongo.OrderedHash().add('a', -1)}, function(err, cursor) {
          cursor.toArray(function(err, documents) {
            // Fail test if not an error
            test.ok(err instanceof Error);
            test.equal("Error: Invalid sort argument was supplied", err.message);
          });
        });            
      });
    });  
  },

  // Test the limit function of the db
  test_find_limits : function() {
    client.createCollection('test_find_limits', function(err, r) {
      client.collection('test_find_limits', function(err, collection) {
        var doc1 = null, doc2 = null, doc3 = null, doc4 = null;

        // Insert some test documents
        collection.insert([new mongo.OrderedHash().add('a', 1), 
            new mongo.OrderedHash().add('b', 2), 
            new mongo.OrderedHash().add('c', 3),
            new mongo.OrderedHash().add('d', 4)
          ], function(err, docs) {doc1 = docs[0]; doc2 = docs[1]; doc3 = docs[2]; doc4 = docs[3]});

        // Test limits
        collection.find({}, {'limit': 1}, function(err, cursor) {
          cursor.toArray(function(err, documents) {
            test.equal(1, documents.length);        
          });
        });    

        collection.find({}, {'limit': 2}, function(err, cursor) {        
          cursor.toArray(function(err, documents) {
            test.equal(2, documents.length);        
          });
        });    

        collection.find({}, {'limit': 3}, function(err, cursor) {
          cursor.toArray(function(err, documents) {
            test.equal(3, documents.length);        
          });
        });    

        collection.find({}, {'limit': 4}, function(err, cursor) {
          cursor.toArray(function(err, documents) {
            test.equal(4, documents.length);        
          });
        });    

        collection.find({}, {}, function(err, cursor) {
          cursor.toArray(function(err, documents) {
            test.equal(4, documents.length);        
          });
        });    

        collection.find({}, {'limit':99}, function(err, cursor) {
          cursor.toArray(function(err, documents) {
            test.equal(4, documents.length);        
            // Let's close the db 
            finished_test({test_find_limits:'ok'});     
          });
        });          
      });
    });  
  },

  // Find no records
  test_find_one_no_records : function() {
    client.createCollection('test_find_one_no_records', function(err, r) {
      client.collection('test_find_one_no_records', function(err, collection) {
        collection.find({'a':1}, {}, function(err, cursor) {
          cursor.toArray(function(err, documents) {
            test.equal(0, documents.length);        
            // Let's close the db 
            finished_test({test_find_one_no_records:'ok'});     
          });
        });              
      });
    });  
  },

  // Test dropping of collections
  test_drop_collection : function() {
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
              break;
            }
          });        
          // Let's close the db 
          finished_test({test_drop_collection:'ok'});     
          // If we have an instance of the index throw and error
          if(found) throw new Error("should not fail");
        });
      });
    });
  },

  // Test dropping using the collection drop command
  test_other_drop : function() {
    client.createCollection('test_other_drop', function(err, r) {
      client.collection('test_other_drop', function(err, collection) {
        collection.drop(function(err, reply) {
          // Ensure we don't have the collection in the set of names
          client.collectionNames(function(err, replies) {
            var found = false;
            replies.forEach(function(document) {
              if(document.name == "test_other_drop") {
                found = true;
                break;
              }
            });        
            // Let's close the db 
            finished_test({test_other_drop:'ok'});     
            // If we have an instance of the index throw and error
            if(found) throw new Error("should not fail");
          });      
        });      
      });        
    });
  },

  test_collection_names : function() {
    client.createCollection('test_collection_names', function(err, r) {
      client.collectionNames(function(err, documents) {
        var found = false;
        var found2 = false;
        documents.forEach(function(document) {
          if(document.name == 'integration_tests_.test_collection_names') found = true;
        });
        test.ok(found);
        // Insert a document in an non-existing collection should create the collection
        client.collection('test_collection_names2', function(err, collection) {
          collection.insert({a:1})
          client.collectionNames(function(err, documents) {
            documents.forEach(function(document) {
              if(document.name == 'integration_tests_.test_collection_names2') found = true;
              if(document.name == 'integration_tests_.test_collection_names') found2 = true;
            });        

            test.ok(found);      
            test.ok(found2);      
          });
          // Let's close the db 
          finished_test({test_collection_names:'ok'});             
        });
      });    
    });
  },

  test_collections_info : function() {
    client.createCollection('test_collections_info', function(err, r) {
      client.collectionsInfo(function(err, cursor) {
        test.ok((cursor instanceof Cursor));
        // Fetch all the collection info
        cursor.toArray(function(err, documents) {
          test.ok(documents.length > 1);

          var found = false;
          documents.forEach(function(document) {
            if(document.name == 'integration_tests_.test_collections_info') found = true;
          });
          test.ok(found);
        });    
        // Let's close the db 
        finished_test({test_collections_info:'ok'});         
      });
    });
  },

  test_collection_options : function() {
    client.createCollection('test_collection_options', {'capped':true, 'size':1024}, function(err, collection) {    
      test.ok(collection instanceof Collection);
      test.equal('test_collection_options', collection.collectionName);
      // Let's fetch the collection options
      collection.options(function(err, options) {
        test.equal(true, options.capped);
        test.equal(1024, options.size);
        test.equal("test_collection_options", options.create);
        // Let's close the db 
        finished_test({test_collection_options:'ok'});         
      });
    });
  },

  test_index_information : function() {
    client.createCollection('test_index_information', function(err, collection) {    
      collection.insert({a:1}, function(err, ids) {
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
              finished_test({test_index_information:'ok'});                 
            });          
          });
        });      
      })
    });
  },

  test_multiple_index_cols : function() {
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
            finished_test({test_multiple_index_cols:'ok'});                 
          });        
        });
      });
    });
  },

  test_unique_index : function() {
    // Create a non-unique index and test inserts
    client.createCollection('test_unique_index', function(err, collection) {    
      client.createIndex(collection.collectionName, 'hello', function(err, indexName) {
        // Insert some docs
        collection.insert([{'hello':'world'}, {'hello':'mike'}, {'hello':'world'}], function(err, ids) {
          // Assert that we have no erros
          client.error(function(err, errors) {
            test.equal(1, errors.length);
            test.equal(null, errors[0].err);
          });
        });
      });        
    });

    // Create a unique index and test that insert fails
    client.createCollection('test_unique_index2', function(err, collection) {    
      client.createIndex(collection.collectionName, 'hello', true, function(err, indexName) {
        // Insert some docs
        collection.insert([{'hello':'world'}, {'hello':'mike'}, {'hello':'world'}], function(err, ids) {
          // Assert that we have erros
          client.error(function(err, errors) {
            test.equal(1, errors.length);
            test.ok(errors[0].err != null);
            // Let's close the db 
            finished_test({test_unique_index:'ok'});                 
          });
        });
      });        
    });  
  },

  test_index_on_subfield : function() {
    // Create a non-unique index and test inserts
    client.createCollection('test_index_on_subfield', function(err, collection) {  
      collection.insert([{'hello': {'a':4, 'b':5}}, {'hello': {'a':7, 'b':2}}, {'hello': {'a':4, 'b':10}}], function(err, ids) {
        // Assert that we have no erros
        client.error(function(err, errors) {
          test.equal(1, errors.length);
          test.ok(errors[0].err == null);
        });      
      });  
    });

    // Create a unique subfield index and test that insert fails
    client.createCollection('test_index_on_subfield2', function(err, collection) {  
      client.createIndex(collection.collectionName, 'hello.a', true, function(err, indexName) {
        collection.insert([{'hello': {'a':4, 'b':5}}, {'hello': {'a':7, 'b':2}}, {'hello': {'a':4, 'b':10}}], function(err, ids) {
          // Assert that we have erros
          client.error(function(err, errors) {
            test.equal(1, errors.length);
            test.ok(errors[0].err != null);
            // Let's close the db 
            finished_test({test_index_on_subfield:'ok'});                 
          });
        });  
      });
    });  
  },

  test_array : function() {
    // Create a non-unique index and test inserts
    client.createCollection('test_array', function(err, collection) {  
      collection.insert({'b':[1, 2, 3]}, function(err, ids) {
        collection.find(function(err, cursor) {
          cursor.toArray(function(err, documents) {
            test.deepEqual([1, 2, 3], documents[0].b);
            // Let's close the db 
            finished_test({test_array:'ok'});                 
          });
        }, {});
      });
    });
  },

  test_regex : function() {
    var regexp = /foobar/i;

    client.createCollection('test_regex', function(err, collection) {  
      collection.insert({'b':regexp}, function(err, ids) {
        collection.find({}, {'fields': ['b']}, function(err, cursor) {
          cursor.toArray(function(err, items) {
            test.equal(("" + regexp), ("" + items[0].b));
            // Let's close the db 
            finished_test({test_regex:'ok'});                 
          });
        });
      });
    });
  },

  // Use some other id than the standard for inserts
  test_non_oid_id : function() {
    client.createCollection('test_non_oid_id', function(err, collection) {  
      var date = new Date();
      date.setUTCDate(12);
      date.setUTCFullYear(2009);
      date.setUTCMonth(11 - 1);
      date.setUTCHours(12);
      date.setUTCMinutes(0);
      date.setUTCSeconds(30);

      collection.insert({'_id':date}, function(err, ids) {      
        collection.find({'_id':date}, function(err, cursor) {
          cursor.toArray(function(err, items) {
            test.equal(("" + date), ("" + items[0]._id));

            // Let's close the db 
            finished_test({test_non_oid_id:'ok'});                 
          });
        });      
      });    
    });
  },

  test_strict_access_collection : function() {
    var error_client = new mongo.Db('integration_tests_', new mongo.Server("127.0.0.1", 27017, {auto_reconnect: false}), {strict:true});
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
          finished_test({test_strict_access_collection:'ok'});                 
          error_client.close();
        });
      });
    });
  },

  test_strict_create_collection : function() {
    var error_client = new mongo.Db('integration_tests_', new mongo.Server("127.0.0.1", 27017, {auto_reconnect: false}), {strict:true});
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
            finished_test({test_strict_create_collection:'ok'});                 
            error_client.close();
          });                
        });
      });
    });  
  },

  test_to_a : function() {
    client.createCollection('test_to_a', function(err, collection) {
      test.ok(collection instanceof Collection);
      collection.insert({'a':1}, function(err, ids) {
        collection.find({}, function(err, cursor) {
          cursor.toArray(function(err, items) {          
            // Should fail if called again (cursor should be closed)
            cursor.toArray(function(err, items) {
              test.ok(err instanceof Error);
              test.equal("Cursor is closed", err.message);

              // Each should allow us to iterate over the entries due to cache
              cursor.each(function(err, item) {
                if(item != null) {
                  test.equal(1, item.a);                
                  // Let's close the db 
                  finished_test({test_to_a:'ok'});                 
                }
              });
            });
          });
        });      
      });    
    });
  },

  test_to_a_after_each : function() {
    client.createCollection('test_to_a_after_each', function(err, collection) {
      test.ok(collection instanceof Collection);
      collection.insert({'a':1}, function(err, ids) {
        collection.find(function(err, cursor) {
          cursor.each(function(err, item) {
            if(item == null) {
              cursor.toArray(function(err, items) {
                test.ok(err instanceof Error);
                test.equal("Cursor is closed", err.message);                            

                // Let's close the db 
                finished_test({test_to_a_after_each:'ok'});                 
              });
            };
          });
        });
      });
    });
  },

  test_where : function() {
    client.createCollection('test_where', function(err, collection) {
      test.ok(collection instanceof Collection);
      collection.insert([{'a':1}, {'a':2}, {'a':3}], function(err, ids) {
        collection.count(function(err, count) {
          test.equal(3, count);

          // Let's test usage of the $where statement
          collection.find({'$where':new mongo.Code('this.a > 2')}, function(err, cursor) {
            cursor.count(function(err, count) {
              test.equal(1, count);
            });          
          });

          collection.find({'$where':new mongo.Code('this.a > i', new mongo.OrderedHash().add('i', 1))}, function(err, cursor) {
            cursor.count(function(err, count) {
              test.equal(2, count);

              // Let's close the db 
              finished_test({test_where:'ok'});                 
            });
          });
        });
      });    
    });
  },

  test_eval : function() {
    client.eval('function (x) {return x;}', [3], function(err, result) {
      test.equal(3, result);
    });

    client.eval('function (x) {db.test_eval.save({y:x});}', [5], function(err, result) {
      test.equal(null, result)        
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

    client.eval(new mongo.Code("2 + 3;"), function(err, result) {
      test.equal(5, result);            
    });

    client.eval(new mongo.Code("return i;", {'i':2}), function(err, result) {
      test.equal(2, result);            
    });

    client.eval(new mongo.Code("i + 3;", {'i':2}), function(err, result) {
      test.equal(5, result);            
    });

    client.eval("5 ++ 5;", function(err, result) {
      test.ok(err instanceof Error);
      test.ok(err.message != null);
      // Let's close the db 
      finished_test({test_eval:'ok'});                             
    });
  },

  test_hint : function() {
    client.createCollection('test_hint', function(err, collection) {
      collection.insert({'a':1}, function(err, ids) {
        client.createIndex(collection.collectionName, "a", function(err, indexName) {
          collection.find({'a':1}, {'hint':'a'}, function(err, cursor) {
            cursor.toArray(function(err, items) {
              test.equal(1, items.length);
            });
          });     

          collection.find({'a':1}, {'hint':['a']}, function(err, cursor) {
            cursor.toArray(function(err, items) {
              test.equal(1, items.length);
            });
          });        

          collection.find({'a':1}, {'hint':{'a':1}}, function(err, cursor) {
            cursor.toArray(function(err, items) {
              test.equal(1, items.length);
            });
          });      

          // Modify hints
          collection.hint = 'a';
          test.equal(1, collection.hint.get('a'));
          collection.find({'a':1}, function(err, cursor) {
            cursor.toArray(function(err, items) {
              test.equal(1, items.length);
            });
          });   

          collection.hint = ['a'];
          test.equal(1, collection.hint.get('a'));
          collection.find({'a':1}, function(err, cursor) {
            cursor.toArray(function(err, items) {
              test.equal(1, items.length);
            });
          });   

          collection.hint = {'a':1};
          test.equal(1, collection.hint.get('a'));
          collection.find({'a':1}, function(err, cursor) {
            cursor.toArray(function(err, items) {
              test.equal(1, items.length);
            });
          });           

          collection.hint = null;
          test.ok(collection.hint == null);
          collection.find({'a':1}, function(err, cursor) {
            cursor.toArray(function(err, items) {
              test.equal(1, items.length);
              // Let's close the db 
              finished_test({test_hint:'ok'});                             
            });
          });           
        });
      });
    });
  },

  test_group : function() {
    client.createCollection('test_group', function(err, collection) {
      collection.group([], {}, {"count":0}, "function (obj, prev) { prev.count++; }", function(err, results) {
        test.deepEqual([], results);
      });

      collection.group([], {}, {"count":0}, "function (obj, prev) { prev.count++; }", true, function(err, results) {
        test.deepEqual([], results);

        // Trigger some inserts
        collection.insert([{'a':2}, {'b':5}, {'a':1}], function(err, ids) {
          collection.group([], {}, {"count":0}, "function (obj, prev) { prev.count++; }", function(err, results) {
            test.equal(3, results[0].count);
          });        

          collection.group([], {}, {"count":0}, "function (obj, prev) { prev.count++; }", true, function(err, results) {
            test.equal(3, results[0].count);
          });        

          collection.group([], {'a':{'$gt':1}}, {"count":0}, "function (obj, prev) { prev.count++; }", function(err, results) {
            test.equal(1, results[0].count);
          });

          collection.group([], {'a':{'$gt':1}}, {"count":0}, "function (obj, prev) { prev.count++; }", true, function(err, results) {
            test.equal(1, results[0].count);

            // Insert some more test data
            collection.insert([{'a':2}, {'b':3}], function(err, ids) {
              collection.group(['a'], {}, {"count":0}, "function (obj, prev) { prev.count++; }", function(err, results) {
                test.equal(2, results[0].a);
                test.equal(2, results[0].count);
                test.equal(null, results[1].a);
                test.equal(2, results[1].count);
                test.equal(1, results[2].a);
                test.equal(1, results[2].count);
              });

              collection.group(['a'], {}, {"count":0}, "function (obj, prev) { prev.count++; }", true, function(err, results) {
                test.equal(2, results[0].a);
                test.equal(2, results[0].count);
                test.equal(null, results[1].a);
                test.equal(2, results[1].count);
                test.equal(1, results[2].a);
                test.equal(1, results[2].count);
              });

              collection.group([], {}, {}, "5 ++ 5", function(err, results) {
                test.ok(err instanceof Error);
                test.ok(err.message != null);
              });

              collection.group([], {}, {}, "5 ++ 5", true, function(err, results) {
                test.ok(err instanceof Error);
                test.ok(err.message != null);
                // Let's close the db 
                finished_test({test_group:'ok'});                                   
              });
            });          
          });        
        });      
      });
    });
  },

  test_deref : function() {
    client.createCollection('test_deref', function(err, collection) {
      collection.insert({'a':1}, function(err, ids) {
        collection.remove(function(err, result) {
          collection.count(function(err, count) {
            test.equal(0, count);          

            // Execute deref a db reference
            client.dereference(new mongo.DBRef("test_deref", new mongo.ObjectID()), function(err, result) {
              collection.insert({'x':'hello'}, function(err, ids) {
                collection.findOne(function(err, document) {
                  test.equal('hello', document.x);

                  client.dereference(new mongo.DBRef("test_deref", document._id), function(err, result) {
                    test.equal('hello', document.x);
                  });
                });
              });            
            });

            client.dereference(new mongo.DBRef("test_deref", 4), function(err, result) {
              var obj = {'_id':4};

              collection.insert(obj, function(err, ids) {
                client.dereference(new mongo.DBRef("test_deref", 4), function(err, document) {
                  test.equal(obj['_id'], document._id);

                  collection.remove(function(err, result) {
                    collection.insert({'x':'hello'}, function(err, ids) {
                      client.dereference(new mongo.DBRef("test_deref", null), function(err, result) {
                        test.equal(null, result);
                        // Let's close the db 
                        finished_test({test_deref:'ok'});                                   
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

  test_save : function() {
    client.createCollection('test_save', function(err, collection) {
      var doc = {'hello':'world'};
      collection.save(doc, function(err, docs) {
        test.ok(docs._id instanceof ObjectID);
        collection.count(function(err, count) {
          test.equal(1, count);
          doc = docs;

          collection.save(doc, function(err, doc) {
            collection.count(function(err, count) {
              test.equal(1, count);                        
            });

            collection.findOne(function(err, doc) {
              test.equal('world', doc.hello);

              // Modify doc and save
              doc.hello = 'mike';
              collection.save(doc, function(err, doc) {
                collection.count(function(err, count) {
                  test.equal(1, count);                        
                });

                collection.findOne(function(err, doc) {
                  test.equal('mike', doc.hello);

                  // Save another document
                  collection.save(new mongo.OrderedHash().add('hello', 'world'), function(err, doc) {
                    collection.count(function(err, count) {
                      test.equal(2, count);                        
                      // Let's close the db 
                      finished_test({test_save:'ok'});                                   
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

  test_save_long : function() {
    client.createCollection('test_save_long', function(err, collection) {
      collection.insert({'x':mongo.Long.fromNumber(9223372036854775807)});
      collection.findOne(function(err, doc) {
        test.ok(mongo.Long.fromNumber(9223372036854775807).equals(doc.x));
        // Let's close the db 
        finished_test({test_save_long:'ok'});                                   
      });
    });
  },

  test_find_by_oid : function() {
    client.createCollection('test_find_by_oid', function(err, collection) {
      collection.save({'hello':'mike'}, function(err, docs) {
        test.ok(docs._id instanceof ObjectID);

        collection.findOne({'_id':docs._id}, function(err, doc) {
          test.equal('mike', doc.hello);

          var id = doc._id.toString();
          collection.findOne({'_id':new mongo.ObjectID(id)}, function(err, doc) {
            test.equal('mike', doc.hello);          
            // Let's close the db 
            finished_test({test_find_by_oid:'ok'});                                   
          });        
        });      
      });    
    });
  },

  test_save_with_object_that_has_id_but_does_not_actually_exist_in_collection : function() {
    client.createCollection('test_save_with_object_that_has_id_but_does_not_actually_exist_in_collection', function(err, collection) {
      var a = {'_id':'1', 'hello':'world'};
      collection.save(a, function(err, docs) {
        collection.count(function(err, count) {
          test.equal(1, count);

          collection.findOne(function(err, doc) {
            test.equal('world', doc.hello);

            doc.hello = 'mike';
            collection.save(doc, function(err, doc) {
              collection.count(function(err, count) {
                test.equal(1, count);
              });

              collection.findOne(function(err, doc) {
                test.equal('mike', doc.hello);
                // Let's close the db 
                finished_test({test_save_with_object_that_has_id_but_does_not_actually_exist_in_collection:'ok'});                                   
              });
            });          
          });        
        });
      });    
    });
  },

  test_invalid_key_names : function() {
    client.createCollection('test_invalid_key_names', function(err, collection) {
      // Legal inserts
      collection.insert([{'hello':'world'}, {'hello':{'hello':'world'}}]);
      // Illegal insert for key
      collection.insert({'$hello':'world'}, function(err, doc) {
        test.ok(err instanceof Error);
        test.equal("key $hello must not start with '$'", err.message);            
      });

      collection.insert({'hello':{'$hello':'world'}}, function(err, doc) {
        test.ok(err instanceof Error);
        test.equal("key $hello must not start with '$'", err.message);              
      });

      collection.insert({'he$llo':'world'}, function(err, docs) {
        test.ok(docs[0].constructor == Object);
      })

      collection.insert(new mongo.OrderedHash().add('hello', new mongo.OrderedHash().add('hell$o', 'world')), function(err, docs) {
        test.ok(docs[0] instanceof OrderedHash);
      })

      collection.insert({'.hello':'world'}, function(err, doc) {
        test.ok(err instanceof Error);
        test.equal("key .hello must not contain '.'", err.message);            
      });

      collection.insert({'hello':{'.hello':'world'}}, function(err, doc) {
        test.ok(err instanceof Error);
        test.equal("key .hello must not contain '.'", err.message);            
      });

      collection.insert({'hello.':'world'}, function(err, doc) {
        test.ok(err instanceof Error);
        test.equal("key hello. must not contain '.'", err.message);            
      });

      collection.insert({'hello':{'hello.':'world'}}, function(err, doc) {
        test.ok(err instanceof Error);
        test.equal("key hello. must not contain '.'", err.message);            
        // Let's close the db 
        finished_test({test_invalid_key_names:'ok'});                                   
      });    
    });
  },

  test_collection_names2 : function() {
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
      finished_test({test_collection_names2:'ok'});                                   
    });  
  },

  test_rename_collection : function() {
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

              collection1.insert([{'x':1}, {'x':2}], function(err, docs) {
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
                        finished_test({test_rename_collection:'ok'});                                   
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

  test_explain : function() {
    client.createCollection('test_explain', function(err, collection) {
      collection.insert({'a':1});
      collection.find({'a':1}, function(err, cursor) {
        cursor.explain(function(err, explaination) {
          test.ok(explaination.cursor != null);
          test.ok(explaination.n.constructor == Number);
          test.ok(explaination.millis.constructor == Number);
          test.ok(explaination.nscanned.constructor == Number);

          // Let's close the db 
          finished_test({test_explain:'ok'});                                   
        });
      });
    });
  },

  test_count : function() {
    client.createCollection('test_count', function(err, collection) {
      collection.find(function(err, cursor) {
        cursor.count(function(err, count) {
          test.equal(0, count);

          for(var i = 0; i < 10; i++) {
            collection.insert({'x':i});
          }

          collection.find(function(err, cursor) {
            cursor.count(function(err, count) {
              test.equal(10, count);
              test.ok(count.constructor == Number);
            });
          });

          collection.find({}, {'limit':5}, function(err, cursor) {
            cursor.count(function(err, count) {
              test.equal(10, count);            
            });
          });

          collection.find({}, {'skip':5}, function(err, cursor) {
            cursor.count(function(err, count) {
              test.equal(10, count);            
            });
          });

          collection.find(function(err, cursor) {
            cursor.count(function(err, count) {
              test.equal(10, count);

              cursor.each(function(err, item) {
                if(item == null) {
                  cursor.count(function(err, count2) {
                    test.equal(10, count2);                  
                    test.equal(count, count2);                  
                    // Let's close the db 
                    finished_test({test_count:'ok'});                                   
                  });
                }
              });
            });
          });

          client.collection('acollectionthatdoesn', function(err, collection) {
            collection.count(function(err, count) {
              test.equal(0, count);          
            });
          })
        });
      });
    });
  },

  test_sort : function() {
    client.createCollection('test_sort', function(err, collection) {
      for(var i = 0; i < 5; i++) {
        collection.insert({'a':i});
      }

      collection.find(function(err, cursor) {      
        cursor.sort(['a', 1], function(err, cursor) {
          test.ok(cursor instanceof Cursor);
          test.deepEqual(['a', 1], cursor.sortValue);
        });      
      });

      collection.find(function(err, cursor) {
        cursor.sort('a', 1, function(err, cursor) {
          cursor.nextObject(function(err, doc) {
            test.equal(0, doc.a);
          });
        });
      });

      collection.find(function(err, cursor) {
        cursor.sort('a', -1, function(err, cursor) {
          cursor.nextObject(function(err, doc) {
            test.equal(4, doc.a);
          });
        });
      });

      collection.find(function(err, cursor) {
        cursor.sort('a', "asc", function(err, cursor) {
          cursor.nextObject(function(err, doc) {
            test.equal(0, doc.a);
          });
        });
      });

      collection.find(function(err, cursor) {
        cursor.sort([['a', -1], ['b', 1]], function(err, cursor) {
          test.ok(cursor instanceof Cursor);
          test.deepEqual([['a', -1], ['b', 1]], cursor.sortValue);
        });
      });

      collection.find(function(err, cursor) {
        cursor.sort('a', 1, function(err, cursor) {
          cursor.sort('a', -1, function(err, cursor) {
            cursor.nextObject(function(err, doc) {
              test.equal(4, doc.a);
            });          
          })
        });      
      });

      collection.find(function(err, cursor) {
        cursor.sort('a', -1, function(err, cursor) {
          cursor.sort('a', 1, function(err, cursor) {
            cursor.nextObject(function(err, doc) {
              test.equal(0, doc.a);
            });          
          })
        });      
      });    

      collection.find(function(err, cursor) {
        cursor.nextObject(function(err, doc) {
          cursor.sort(['a'], function(err, cursor) {
            test.ok(err instanceof Error);
            test.equal("Cursor is closed", err.message);          

            // Let's close the db 
            finished_test({test_sort:'ok'});                                   
          }); 
        });          
      }); 

      collection.find(function(err, cursor) {
        cursor.sort('a', 25, function(err, cursor) {
          cursor.nextObject(function(err, doc) {
            test.ok(err instanceof Error);
            test.equal("Error: Illegal sort clause, must be of the form [['field1', '(ascending|descending)'], ['field2', '(ascending|descending)']]", err.message);
          });
        });
      });

      collection.find(function(err, cursor) {
        cursor.sort(25, function(err, cursor) {
          cursor.nextObject(function(err, doc) {
            test.ok(err instanceof Error);
            test.equal("Error: Illegal sort clause, must be of the form [['field1', '(ascending|descending)'], ['field2', '(ascending|descending)']]", err.message);
          });
        });
      });           
    });
  },

  test_cursor_limit : function() {
    client.createCollection('test_cursor_limit', function(err, collection) {
      for(var i = 0; i < 10; i++) {
        collection.save({'x':1}, function(err, document) {});
      }

      collection.find(function(err, cursor) {
        cursor.count(function(err, count) {
          test.equal(10, count);
        });
      });

      collection.find(function(err, cursor) {
        cursor.limit(5, function(err, cursor) {
          cursor.toArray(function(err, items) {
            test.equal(5, items.length);
            // Let's close the db 
            finished_test({test_cursor_limit:'ok'});                                   
          });
        });
      });
    });
  },

  test_limit_exceptions : function() {
    client.createCollection('test_limit_exceptions', function(err, collection) {
      collection.insert({'a':1}, function(err, docs) {});
      collection.find(function(err, cursor) {
        cursor.limit('not-an-integer', function(err, cursor) {
          test.ok(err instanceof Error);
          test.equal("limit requires an integer", err.message);
        });
      });

      collection.find(function(err, cursor) {
        cursor.nextObject(function(err, doc) {
          cursor.limit(1, function(err, cursor) {
            test.ok(err instanceof Error);
            test.equal("Cursor is closed", err.message);
            // Let's close the db 
            finished_test({test_limit_exceptions:'ok'});                                   
          });
        });
      });       

      collection.find(function(err, cursor) {
        cursor.close(function(err, cursor) {        
          cursor.limit(1, function(err, cursor) {
            test.ok(err instanceof Error);
            test.equal("Cursor is closed", err.message);
          });
        });
      });
    });
  },

  test_skip : function() {
    client.createCollection('test_skip', function(err, collection) {
      for(var i = 0; i < 10; i++) { collection.insert({'x':i}); }

      collection.find(function(err, cursor) {
        cursor.count(function(err, count) {
          test.equal(10, count);
        });
      });

      collection.find(function(err, cursor) {
        cursor.toArray(function(err, items) {
          test.equal(10, items.length);

          collection.find(function(err, cursor) {
            cursor.skip(2, function(err, cursor) {
              cursor.toArray(function(err, items2) {
                test.equal(8, items2.length);          

                // Check that we have the same elements
                var numberEqual = 0;
                var sliced = items.slice(2, 10);

                for(var i = 0; i < sliced.length; i++) {
                  if(sliced[i].x == items2[i].x) numberEqual = numberEqual + 1;
                }
                test.equal(8, numberEqual);          

                // Let's close the db 
                finished_test({test_skip:'ok'});                                   
              });
            });
          });
        });
      });    
    });
  },

  test_skip_exceptions : function() {
    client.createCollection('test_skip_exceptions', function(err, collection) {
      collection.insert({'a':1}, function(err, docs) {});
      collection.find(function(err, cursor) {
        cursor.skip('not-an-integer', function(err, cursor) {
          test.ok(err instanceof Error);
          test.equal("skip requires an integer", err.message);
        });
      });

      collection.find(function(err, cursor) {
        cursor.nextObject(function(err, doc) {
          cursor.skip(1, function(err, cursor) {
            test.ok(err instanceof Error);
            test.equal("Cursor is closed", err.message);
            // Let's close the db 
            finished_test({test_skip_exceptions:'ok'});                                   
          });
        });
      });       

      collection.find(function(err, cursor) {
        cursor.close(function(err, cursor) {        
          cursor.skip(1, function(err, cursor) {
            test.ok(err instanceof Error);
            test.equal("Cursor is closed", err.message);
          });
        });
      });
    });  
  },

  test_limit_skip_chaining : function() {
    client.createCollection('test_limit_skip_chaining', function(err, collection) {
      for(var i = 0; i < 10; i++) { collection.insert({'x':1}); }

      collection.find(function(err, cursor) {
        cursor.toArray(function(err, items) {
          test.equal(10, items.length);

          collection.find(function(err, cursor) {
            cursor.limit(5, function(err, cursor) {
              cursor.skip(3, function(err, cursor) {
                cursor.toArray(function(err, items2) {
                  test.equal(5, items2.length);                

                  // Check that we have the same elements
                  var numberEqual = 0;
                  var sliced = items.slice(3, 8);

                  for(var i = 0; i < sliced.length; i++) {
                    if(sliced[i].x == items2[i].x) numberEqual = numberEqual + 1;
                  }
                  test.equal(5, numberEqual);          

                  // Let's close the db 
                  finished_test({test_limit_skip_chaining:'ok'});                                   
                });
              });
            });
          });        
        });
      });    
    });
  },

  test_close_no_query_sent : function() {
    client.createCollection('test_close_no_query_sent', function(err, collection) {
      collection.find(function(err, cursor) {
        cursor.close(function(err, cursor) {
          test.equal(true, cursor.isClosed());
          // Let's close the db 
          finished_test({test_close_no_query_sent:'ok'});                                   
        });
      });
    });
  },

  test_refill_via_get_more : function() {
    client.createCollection('test_refill_via_get_more', function(err, collection) {
      for(var i = 0; i < 1000; i++) { collection.save({'a': i}, function(err, doc) {}); }

      collection.count(function(err, count) {
        test.equal(1000, count);
      });      

      var total = 0;
      collection.find(function(err, cursor) {
        cursor.each(function(err, item) {
          if(item != null) {
            total = total + item.a;
          } else {
            test.equal(499500, total); 

            collection.count(function(err, count) {
              test.equal(1000, count);
            });                  

            collection.count(function(err, count) {
              test.equal(1000, count);

              var total2 = 0;
              collection.find(function(err, cursor) {
                cursor.each(function(err, item) {
                  if(item != null) {
                    total2 = total2 + item.a;
                  } else {
                    test.equal(499500, total2); 
                    collection.count(function(err, count) {
                      test.equal(1000, count);
                      test.equal(total, total2);
                      // Let's close the db 
                      finished_test({test_refill_via_get_more:'ok'});                                   
                    });                  
                  }
                });
              });
            });
          }
        });
      });  
    });
  },

  test_refill_via_get_more_alt_coll : function() {
    client.createCollection('test_refill_via_get_more_alt_coll', function(err, collection) {
      for(var i = 0; i < 1000; i++) {
        collection.save({'a': i}, function(err, doc) {});
      }

      collection.count(function(err, count) {
        test.equal(1000, count);
      });      

      var total = 0;
      collection.find(function(err, cursor) {
        cursor.each(function(err, item) {
          if(item != null) {
            total = total + item.a;
          } else {
            test.equal(499500, total); 

            collection.count(function(err, count) {
              test.equal(1000, count);
            });                  

            collection.count(function(err, count) {
              test.equal(1000, count);

              var total2 = 0;
              collection.find(function(err, cursor) {
                cursor.each(function(err, item) {
                  if(item != null) {
                    total2 = total2 + item.a;
                  } else {
                    test.equal(499500, total2); 
                    collection.count(function(err, count) {
                      test.equal(1000, count);
                      test.equal(total, total2);
                      // Let's close the db 
                      finished_test({test_refill_via_get_more_alt_coll:'ok'});                                   
                    });                  
                  }
                });
              });
            });
          }
        });
      });  
    });
  },

  test_close_after_query_sent : function() {
    client.createCollection('test_close_after_query_sent', function(err, collection) {
      collection.insert({'a':1});
      collection.find({'a':1}, function(err, cursor) {
        cursor.nextObject(function(err, item) {
          cursor.close(function(err, cursor) {
            test.equal(true, cursor.isClosed());
            // Let's close the db 
            finished_test({test_close_after_query_sent:'ok'});                                   
          })
        });
      });
    });
  },

  // test_kill_cursors : function() {
  //   var test_kill_cursors_client = new mongo.Db('integration_tests4_', new mongo.Server("127.0.0.1", 27017, {auto_reconnect: true}), {});
  //   test_kill_cursors_client.open(function(err, test_kill_cursors_client) {
  //     var number_of_tests_done = 0;
  // 
  //     test_kill_cursors_client.dropCollection('test_kill_cursors', function(err, collection) {      
  //       test_kill_cursors_client.createCollection('test_kill_cursors', function(err, collection) {
  //         test_kill_cursors_client.cursorInfo(function(err, cursorInfo) {
  //           var clientCursors = cursorInfo.clientCursors_size;
  //           var byLocation = cursorInfo.byLocation_size;
  // 
  //           for(var i = 0; i < 1000; i++) {
  //             collection.save({'i': i}, function(err, doc) {});
  //           }
  // 
  //           test_kill_cursors_client.cursorInfo(function(err, cursorInfo) {
  //             test.equal(clientCursors, cursorInfo.clientCursors_size);
  //             test.equal(byLocation, cursorInfo.byLocation_size);
  // 
  //             for(var i = 0; i < 10; i++) {
  //               collection.findOne(function(err, item) {});
  //             }
  // 
  //             test_kill_cursors_client.cursorInfo(function(err, cursorInfo) {
  //               test.equal(clientCursors, cursorInfo.clientCursors_size);
  //               test.equal(byLocation, cursorInfo.byLocation_size);
  // 
  //               for(var i = 0; i < 10; i++) {
  //                 collection.find(function(err, cursor) {
  //                   cursor.nextObject(function(err, item) {
  //                     cursor.close(function(err, cursor) {});
  // 
  //                     if(i == 10) {
  //                       test_kill_cursors_client.cursorInfo(function(err, cursorInfo) {
  //                         test.equal(clientCursors, cursorInfo.clientCursors_size);
  //                         test.equal(byLocation, cursorInfo.byLocation_size);
  // 
  //                         collection.find(function(err, cursor) {
  //                           cursor.nextObject(function(err, item) {
  //                             test_kill_cursors_client.cursorInfo(function(err, cursorInfo) {
  //                               test.equal(clientCursors, cursorInfo.clientCursors_size);                  
  //                               test.equal(byLocation, cursorInfo.byLocation_size);
  // 
  //                               cursor.close(function(err, cursor) {
  //                                 test_kill_cursors_client.cursorInfo(function(err, cursorInfo) {
  //                                   test.equal(clientCursors, cursorInfo.clientCursors_size);
  //                                   test.equal(byLocation, cursorInfo.byLocation_size);
  // 
  //                                   collection.find({}, {'limit':10}, function(err, cursor) {
  //                                     cursor.nextObject(function(err, item) {                                      
  //                                       test_kill_cursors_client.cursorInfo(function(err, cursorInfo) {
  //                                         test_kill_cursors_client.cursorInfo(function(err, cursorInfo) {
  //                                           test.equal(clientCursors, cursorInfo.clientCursors_size);
  //                                           test.equal(byLocation, cursorInfo.byLocation_size);
  //                                           number_of_tests_done = 1;
  //                                         });
  //                                       });
  //                                     });
  //                                   });
  //                                 });
  //                               });                  
  //                             });
  //                           });
  //                         });
  //                       });
  //                     }
  //                   });
  //                 });
  //               }
  //             });        
  //           });      
  //         });
  //       });
  //     });
  // 
  //     var intervalId = setInterval(function() {
  //       if(number_of_tests_done == 1) {
  //         clearInterval(intervalId);
  //         finished_test({test_kill_cursors:'ok'});
  //         test_kill_cursors_client.close();
  //       }
  //     }, 100);        
  //   });  
  // },

  test_count_with_fields : function() {
    client.createCollection('test_count_with_fields', function(err, collection) {
      collection.save({'x':1, 'a':2}, function(err, doc) {
        collection.find({}, {'fields':['a']}, function(err, cursor) {
          cursor.toArray(function(err, items) {
            test.equal(1, items.length);
            test.equal(2, items[0].a);
            test.equal(null, items[0].x);
          });
        });

        collection.findOne({}, {'fields':['a']}, function(err, item) {
          test.equal(2, item.a);
          test.equal(null, item.x);
          finished_test({test_count_with_fields:'ok'});
        });
      });
    });
  },

  // Gridstore tests
  test_gs_exist : function() {
    var gridStore = new mongo.GridStore(client, "foobar", "w");
    gridStore.open(function(err, gridStore) {    
      gridStore.write("hello world!", function(err, gridStore) {
        gridStore.close(function(err, result) {
          mongo.GridStore.exist(client, 'foobar', function(err, result) {
            test.equal(true, result);
          });

          mongo.GridStore.exist(client, 'does_not_exist', function(err, result) {
            test.equal(false, result);
          });

          mongo.GridStore.exist(client, 'foobar', 'another_root', function(err, result) {
            test.equal(false, result);
            finished_test({test_gs_exist:'ok'});        
          });
        });
      });
    });
  },

  test_gs_list : function() {
    var gridStore = new mongo.GridStore(client, "foobar2", "w");
    gridStore.open(function(err, gridStore) {    
      gridStore.write("hello world!", function(err, gridStore) {
        gridStore.close(function(err, result) {
          mongo.GridStore.list(client, function(err, items) {
            var found = false;
            items.forEach(function(filename) {
              if(filename == 'foobar2') found = true;
            });

            test.ok(items.length >= 1);
            test.ok(found);
          });

          mongo.GridStore.list(client, 'fs', function(err, items) {
            var found = false;
            items.forEach(function(filename) {
              if(filename == 'foobar2') found = true;
            });

            test.ok(items.length >= 1);
            test.ok(found);
          });

          mongo.GridStore.list(client, 'my_fs', function(err, items) {
            var found = false;
            items.forEach(function(filename) {
              if(filename == 'foobar2') found = true;
            });

            test.ok(items.length >= 0);
            test.ok(!found);

            var gridStore2 = new mongo.GridStore(client, "foobar3", "w");
            gridStore2.open(function(err, gridStore) {    
              gridStore2.write('my file', function(err, gridStore) {
                gridStore.close(function(err, result) {                
                  mongo.GridStore.list(client, function(err, items) {
                    var found = false;
                    var found2 = false;
                    items.forEach(function(filename) {
                      if(filename == 'foobar2') found = true;
                      if(filename == 'foobar3') found2 = true;
                    });

                    test.ok(items.length >= 2);
                    test.ok(found);
                    test.ok(found2);
                    finished_test({test_gs_list:'ok'});        
                  });
                });
              });
            });          
          });
        });
      });
    });  
  },

  test_gs_small_write : function() {
    var gridStore = new mongo.GridStore(client, "test_gs_small_write", "w");
    gridStore.open(function(err, gridStore) {    
      gridStore.write("hello world!", function(err, gridStore) {
        gridStore.close(function(err, result) {
          client.collection('fs.files', function(err, collection) {
            collection.find({'filename':'test_gs_small_write'}, function(err, cursor) {
              cursor.toArray(function(err, items) {
                test.equal(1, items.length);
                var item = items[0];
                test.ok(item._id instanceof ObjectID);

                client.collection('fs.chunks', function(err, collection) {
                  collection.find({'files_id':item._id}, function(err, cursor) {
                    cursor.toArray(function(err, items) {
                      test.equal(1, items.length);                  
                      finished_test({test_gs_small_write:'ok'});        
                    })
                  });              
                });
              });
            });
          });        
        });
      });
    });  
  },

  test_gs_small_file : function() {
    var gridStore = new mongo.GridStore(client, "test_gs_small_file", "w");
    gridStore.open(function(err, gridStore) {    
      gridStore.write("hello world!", function(err, gridStore) {
        gridStore.close(function(err, result) {
          client.collection('fs.files', function(err, collection) {
            collection.find({'filename':'test_gs_small_file'}, function(err, cursor) {
              cursor.toArray(function(err, items) {
                test.equal(1, items.length);

                // Read test of the file
                mongo.GridStore.read(client, 'test_gs_small_file', function(err, data) {
                  test.equal('hello world!', data);
                  finished_test({test_gs_small_file:'ok'});        
                });              
              });
            });
          });        
        });
      });
    });      
  },

  test_gs_overwrite : function() {
    var gridStore = new mongo.GridStore(client, "test_gs_overwrite", "w");
    gridStore.open(function(err, gridStore) {    
      gridStore.write("hello world!", function(err, gridStore) {
        gridStore.close(function(err, result) {
          var gridStore2 = new mongo.GridStore(client, "test_gs_overwrite", "w");
          gridStore2.open(function(err, gridStore) {    
            gridStore2.write("overwrite", function(err, gridStore) {
              gridStore2.close(function(err, result) {

                // Assert that we have overwriten the data
                mongo.GridStore.read(client, 'test_gs_overwrite', function(err, data) {
                  test.equal('overwrite', data);
                  finished_test({test_gs_overwrite:'ok'});        
                });                            
              });
            });
          });                
        });
      });
    });        
  },

  test_gs_read_length : function() {
    var gridStore = new mongo.GridStore(client, "test_gs_read_length", "w");
    gridStore.open(function(err, gridStore) {    
      gridStore.write("hello world!", function(err, gridStore) {
        gridStore.close(function(err, result) {
          // Assert that we have overwriten the data
          mongo.GridStore.read(client, 'test_gs_read_length', 5, function(err, data) {
            test.equal('hello', data);
            finished_test({test_gs_read_length:'ok'});        
          });                            
        });
      });
    });          
  },

  test_gs_read_with_offset : function() {
    var gridStore = new mongo.GridStore(client, "test_gs_read_with_offset", "w");
    gridStore.open(function(err, gridStore) {    
      gridStore.write("hello, world!", function(err, gridStore) {
        gridStore.close(function(err, result) {
          // Assert that we have overwriten the data
          mongo.GridStore.read(client, 'test_gs_read_with_offset', 5, 7, function(err, data) {
            test.equal('world', data);
          });

          mongo.GridStore.read(client, 'test_gs_read_with_offset', null, 7, function(err, data) {
            test.equal('world!', data);
            finished_test({test_gs_read_with_offset:'ok'});        
          });
        });
      });
    });            
  },

  test_gs_seek : function() {
    var gridStore = new mongo.GridStore(client, "test_gs_seek", "w");
    gridStore.open(function(err, gridStore) {    
      gridStore.write("hello, world!", function(err, gridStore) {
        gridStore.close(function(result) {        
          var gridStore2 = new mongo.GridStore(client, "test_gs_seek", "r");
          gridStore2.open(function(err, gridStore) {    
            gridStore.seek(0, function(err, gridStore) {
              gridStore.getc(function(err, chr) {
                test.equal('h', chr);
              });
            });
          });

          var gridStore3 = new mongo.GridStore(client, "test_gs_seek", "r");
          gridStore3.open(function(err, gridStore) {    
            gridStore.seek(7, function(err, gridStore) {
              gridStore.getc(function(err, chr) {
                test.equal('w', chr);
              });
            });
          });

          var gridStore4 = new mongo.GridStore(client, "test_gs_seek", "r");
          gridStore4.open(function(err, gridStore) {    
            gridStore.seek(4, function(err, gridStore) {
              gridStore.getc(function(err, chr) {
                test.equal('o', chr);
              });
            });
          });

          var gridStore5 = new mongo.GridStore(client, "test_gs_seek", "r");
          gridStore5.open(function(err, gridStore) {    
            gridStore.seek(-1, mongo.GridStore.IO_SEEK_END, function(err, gridStore) {
              gridStore.getc(function(err, chr) {
                test.equal('!', chr);
              });
            });
          });

          var gridStore6 = new mongo.GridStore(client, "test_gs_seek", "r");
          gridStore6.open(function(err, gridStore) {    
            gridStore.seek(-6, mongo.GridStore.IO_SEEK_END, function(err, gridStore) {
              gridStore.getc(function(err, chr) {
                test.equal('w', chr);
              });
            });
          });

          var gridStore7 = new mongo.GridStore(client, "test_gs_seek", "r");
          gridStore7.open(function(err, gridStore) {    
            gridStore.seek(7, mongo.GridStore.IO_SEEK_CUR, function(err, gridStore) {
              gridStore.getc(function(err, chr) {
                test.equal('w', chr);

                gridStore.seek(-1, mongo.GridStore.IO_SEEK_CUR, function(err, gridStore) {
                  gridStore.getc(function(err, chr) {
                    test.equal('w', chr);

                    gridStore.seek(-4, mongo.GridStore.IO_SEEK_CUR, function(err, gridStore) {
                      gridStore.getc(function(err, chr) {
                        test.equal('o', chr);

                        gridStore.seek(3, mongo.GridStore.IO_SEEK_CUR, function(err, gridStore) {
                          gridStore.getc(function(err, chr) {
                            test.equal('o', chr);
                            finished_test({test_gs_seek:'ok'});        
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

  test_gs_multi_chunk : function() {
    var fs_client = new mongo.Db('integration_tests_10', new mongo.Server("127.0.0.1", 27017, {auto_reconnect: false}));
    fs_client.open(function(err, fs_client) {
      fs_client.dropDatabase(function(err, done) {
        var gridStore = new mongo.GridStore(fs_client, "test_gs_multi_chunk", "w");
        gridStore.open(function(err, gridStore) {    
          gridStore.chunkSize = 512;
          var file1 = ''; var file2 = ''; var file3 = '';
          for(var i = 0; i < gridStore.chunkSize; i++) { file1 = file1 + 'x'; }
          for(var i = 0; i < gridStore.chunkSize; i++) { file2 = file2 + 'y'; }
          for(var i = 0; i < gridStore.chunkSize; i++) { file3 = file3 + 'z'; }

          gridStore.write(file1, function(err, gridStore) {
            gridStore.write(file2, function(err, gridStore) {
              gridStore.write(file3, function(err, gridStore) {
                gridStore.close(function(err, result) {
                  fs_client.collection('fs.chunks', function(err, collection) {
                    collection.count(function(err, count) {
                      test.equal(3, count);

                      mongo.GridStore.read(fs_client, 'test_gs_multi_chunk', function(err, data) {
                        test.equal(512*3, data.length);
                        finished_test({test_gs_multi_chunk:'ok'});                    
                        fs_client.close();
                      });              
                    })
                  });
                });
              });
            });
          });
        });                        
      });
    });
  },

  test_gs_puts_and_readlines : function() {
    var gridStore = new mongo.GridStore(client, "test_gs_puts_and_readlines", "w");
    gridStore.open(function(err, gridStore) {    
      gridStore.puts("line one", function(err, gridStore) {
        gridStore.puts("line two\n", function(err, gridStore) {
          gridStore.puts("line three", function(err, gridStore) {          
            gridStore.close(function(err, result) {
              mongo.GridStore.readlines(client, 'test_gs_puts_and_readlines', function(err, lines) {
                test.deepEqual(["line one\n", "line two\n", "line three\n"], lines);
                finished_test({test_gs_puts_and_readlines:'ok'});                    
              });
            });
          });
        });
      });
    });            
  },

  test_gs_weird_name_unlink : function() {
    var fs_client = new mongo.Db('awesome_f0eabd4b52e30b223c010000', new mongo.Server("127.0.0.1", 27017, {auto_reconnect: false}));
    fs_client.open(function(err, fs_client) {
      fs_client.dropDatabase(function(err, done) {
        var gridStore = new mongo.GridStore(fs_client, "9476700.937375426_1271170118964-clipped.png", "w", {'root':'articles'});
        gridStore.open(function(err, gridStore) {    
          gridStore.write("hello, world!", function(err, gridStore) {
            gridStore.close(function(err, result) {
              fs_client.collection('articles.files', function(err, collection) {
                collection.count(function(err, count) {
                  test.equal(1, count);
                })
              });

              fs_client.collection('articles.chunks', function(err, collection) {
                collection.count(function(err, count) {
                  test.equal(1, count);

                  // Unlink the file
                  mongo.GridStore.unlink(fs_client, '9476700.937375426_1271170118964-clipped.png', {'root':'articles'}, function(err, gridStore) {
                    fs_client.collection('articles.files', function(err, collection) {
                      collection.count(function(err, count) {
                        test.equal(0, count);
                      })
                    });

                    fs_client.collection('articles.chunks', function(err, collection) {
                      collection.count(function(err, count) {
                        test.equal(0, count);

                        finished_test({test_gs_unlink:'ok'});       
                        fs_client.close();
                      })
                    });
                  });
                })
              });
            });
          });
        });              
      });
    });

  },

  test_gs_unlink : function() {
    var fs_client = new mongo.Db('integration_tests_11', new mongo.Server("127.0.0.1", 27017, {auto_reconnect: false}));
    fs_client.open(function(err, fs_client) {
      fs_client.dropDatabase(function(err, done) {
        var gridStore = new mongo.GridStore(fs_client, "test_gs_unlink", "w");
        gridStore.open(function(err, gridStore) {    
          gridStore.write("hello, world!", function(err, gridStore) {
            gridStore.close(function(err, result) {
              fs_client.collection('fs.files', function(err, collection) {
                collection.count(function(err, count) {
                  test.equal(1, count);
                })
              });

              fs_client.collection('fs.chunks', function(err, collection) {
                collection.count(function(err, count) {
                  test.equal(1, count);

                  // Unlink the file
                  mongo.GridStore.unlink(fs_client, 'test_gs_unlink', function(err, gridStore) {
                    fs_client.collection('fs.files', function(err, collection) {
                      collection.count(function(err, count) {
                        test.equal(0, count);
                      })
                    });

                    fs_client.collection('fs.chunks', function(err, collection) {
                      collection.count(function(err, count) {
                        test.equal(0, count);

                        finished_test({test_gs_unlink:'ok'});       
                        fs_client.close();
                      })
                    });
                  });
                })
              });
            });
          });
        });              
      });
    });
  },

  test_gs_append : function() {
    var fs_client = new mongo.Db('integration_tests_12', new mongo.Server("127.0.0.1", 27017, {auto_reconnect: false}));
    fs_client.open(function(err, fs_client) {
      fs_client.dropDatabase(function(err, done) {
        var gridStore = new mongo.GridStore(fs_client, "test_gs_append", "w");
        gridStore.open(function(err, gridStore) {    
          gridStore.write("hello, world!", function(err, gridStore) {
            gridStore.close(function(err, result) {

              var gridStore2 = new mongo.GridStore(fs_client, "test_gs_append", "w+");
              gridStore2.open(function(err, gridStore) {
                gridStore.write(" how are you?", function(err, gridStore) {
                  gridStore.close(function(err, result) {

                    fs_client.collection('fs.chunks', function(err, collection) {
                      collection.count(function(err, count) {
                        test.equal(1, count);

                        mongo.GridStore.read(fs_client, 'test_gs_append', function(err, data) {
                          test.equal("hello, world! how are you?", data);                        
                          finished_test({test_gs_append:'ok'});       
                          fs_client.close();
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

  test_gs_rewind_and_truncate_on_write : function() {
    var gridStore = new mongo.GridStore(client, "test_gs_rewind_and_truncate_on_write", "w");
    gridStore.open(function(err, gridStore) {    
      gridStore.write("hello, world!", function(err, gridStore) {
        gridStore.close(function(err, result) {
          var gridStore2 = new mongo.GridStore(client, "test_gs_rewind_and_truncate_on_write", "w");
          gridStore2.open(function(err, gridStore) {
            gridStore.write('some text is inserted here', function(err, gridStore) {
              gridStore.rewind(function(err, gridStore) {
                gridStore.write('abc', function(err, gridStore) {
                  gridStore.close(function(err, result) {
                    mongo.GridStore.read(client, 'test_gs_rewind_and_truncate_on_write', function(err, data) {
                      test.equal("abc", data);
                      finished_test({test_gs_rewind_and_truncate_on_write:'ok'});       
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

  test_gs_tell : function() {
    var gridStore = new mongo.GridStore(client, "test_gs_tell", "w");
    gridStore.open(function(err, gridStore) {    
      gridStore.write("hello, world!", function(err, gridStore) {
        gridStore.close(function(err, result) {
          var gridStore2 = new mongo.GridStore(client, "test_gs_tell", "r");
          gridStore2.open(function(err, gridStore) {
            gridStore.read(5, function(err, data) {
              test.equal("hello", data);

              gridStore.tell(function(err, position) {
                test.equal(5, position);              
                finished_test({test_gs_tell:'ok'});       
              })            
            });
          });
        });
      });
    });                  
  },

  test_gs_save_empty_file : function() {
    var fs_client = new mongo.Db('integration_tests_13', new mongo.Server("127.0.0.1", 27017, {auto_reconnect: false}));
    fs_client.open(function(err, fs_client) {
      fs_client.dropDatabase(function(err, done) {
        var gridStore = new mongo.GridStore(fs_client, "test_gs_save_empty_file", "w");
        gridStore.open(function(err, gridStore) {    
          gridStore.write("", function(err, gridStore) {
            gridStore.close(function(err, result) {
              fs_client.collection('fs.files', function(err, collection) {
                collection.count(function(err, count) {
                  test.equal(1, count);
                });
              });

              fs_client.collection('fs.chunks', function(err, collection) {
                collection.count(function(err, count) {
                  test.equal(0, count);

                  finished_test({test_gs_save_empty_file:'ok'});       
                  fs_client.close();
                });
              });            
            });
          });
        });              
      });
    });    
  },

  test_gs_empty_file_eof : function() {
    var gridStore = new mongo.GridStore(client, 'test_gs_empty_file_eof', "w");
    gridStore.open(function(err, gridStore) {
      gridStore.close(function(err, gridStore) {      
        var gridStore2 = new mongo.GridStore(client, 'test_gs_empty_file_eof', "r");
        gridStore2.open(function(err, gridStore) {
          test.equal(true, gridStore.eof());
          finished_test({test_gs_empty_file_eof:'ok'});       
        })
      });
    });
  },

  test_gs_cannot_change_chunk_size_on_read : function() {
    var gridStore = new mongo.GridStore(client, "test_gs_cannot_change_chunk_size_on_read", "w");
    gridStore.open(function(err, gridStore) {    
      gridStore.write("hello, world!", function(err, gridStore) {
        gridStore.close(function(err, result) {

          var gridStore2 = new mongo.GridStore(client, "test_gs_cannot_change_chunk_size_on_read", "r");
          gridStore2.open(function(err, gridStore) {
            gridStore.chunkSize = 42; 
            test.equal(mongo.Chunk.DEFAULT_CHUNK_SIZE, gridStore.chunkSize);
            finished_test({test_gs_cannot_change_chunk_size_on_read:'ok'});       
          });        
        });
      });
    });            
  },

  test_gs_cannot_change_chunk_size_after_data_written : function() {
    var gridStore = new mongo.GridStore(client, "test_gs_cannot_change_chunk_size_after_data_written", "w");
    gridStore.open(function(err, gridStore) {    
      gridStore.write("hello, world!", function(err, gridStore) {
        gridStore.chunkSize = 42; 
        test.equal(mongo.Chunk.DEFAULT_CHUNK_SIZE, gridStore.chunkSize);
        finished_test({test_gs_cannot_change_chunk_size_after_data_written:'ok'});       
      });
    });              
  },

  test_change_chunk_size : function() {
    var gridStore = new mongo.GridStore(client, "test_change_chunk_size", "w");
    gridStore.open(function(err, gridStore) {   
      gridStore.chunkSize = 42

      gridStore.write('foo', function(err, gridStore) {
        gridStore.close(function(err, result) {
          var gridStore2 = new mongo.GridStore(client, "test_change_chunk_size", "r");
          gridStore2.open(function(err, gridStore) {
            test.equal(42, gridStore.chunkSize);
            finished_test({test_change_chunk_size:'ok'});       
          });
        });
      });
    });
  },

  test_gs_chunk_size_in_option : function() {
    var gridStore = new mongo.GridStore(client, "test_change_chunk_size", "w", {'chunk_size':42});
    gridStore.open(function(err, gridStore) {   
      gridStore.write('foo', function(err, gridStore) {
        gridStore.close(function(err, result) {
          var gridStore2 = new mongo.GridStore(client, "test_change_chunk_size", "r");
          gridStore2.open(function(err, gridStore) {
            test.equal(42, gridStore.chunkSize);
            finished_test({test_gs_chunk_size_in_option:'ok'});       
          });
        });
      });
    });
  },

  test_gs_md5 : function() {
    var gridStore = new mongo.GridStore(client, "new-file", "w");
    gridStore.open(function(err, gridStore) {   
      gridStore.write('hello world\n', function(err, gridStore) {
        gridStore.close(function(err, result) {
          var gridStore2 = new mongo.GridStore(client, "new-file", "r");
          gridStore2.open(function(err, gridStore) {
            test.equal("6f5902ac237024bdd0c176cb93063dc4", gridStore.md5);          
            gridStore.md5 = "can't do this";
            test.equal("6f5902ac237024bdd0c176cb93063dc4", gridStore.md5);

            var gridStore2 = new mongo.GridStore(client, "new-file", "w");
            gridStore2.open(function(err, gridStore) {
              gridStore.close(function(err, result) {
                var gridStore3 = new mongo.GridStore(client, "new-file", "r");
                gridStore3.open(function(err, gridStore) {
                  test.equal("d41d8cd98f00b204e9800998ecf8427e", gridStore.md5);                

                  finished_test({test_gs_chunk_size_in_option:'ok'});       
                });
              })
            })
          });
        });
      });
    });  
  },

  test_gs_upload_date : function() {
    var now = new Date();
    var originalFileUploadDate = null;

    var gridStore = new mongo.GridStore(client, "test_gs_upload_date", "w");
    gridStore.open(function(err, gridStore) {   
      gridStore.write('hello world\n', function(err, gridStore) {
        gridStore.close(function(err, result) {

          var gridStore2 = new mongo.GridStore(client, "test_gs_upload_date", "r");
          gridStore2.open(function(err, gridStore) {
            test.ok(gridStore.uploadDate != null);
            originalFileUploadDate = gridStore.uploadDate;

            gridStore2.close(function(err, result) {
              var gridStore3 = new mongo.GridStore(client, "test_gs_upload_date", "w");
              gridStore3.open(function(err, gridStore) {
                gridStore3.write('new data', function(err, gridStore) {
                  gridStore3.close(function(err, result) {
                    var fileUploadDate = null;

                    var gridStore4 = new mongo.GridStore(client, "test_gs_upload_date", "r");
                    gridStore4.open(function(err, gridStore) {
                      test.equal(originalFileUploadDate.getTime(), gridStore.uploadDate.getTime());
                      finished_test({test_gs_upload_date:'ok'});       
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

  test_gs_content_type : function() {
    var ct = null;

    var gridStore = new mongo.GridStore(client, "test_gs_content_type", "w");
    gridStore.open(function(err, gridStore) {   
      gridStore.write('hello world\n', function(err, gridStore) {
        gridStore.close(function(err, result) {

          var gridStore2 = new mongo.GridStore(client, "test_gs_content_type", "r");
          gridStore2.open(function(err, gridStore) {
            ct = gridStore.contentType;
            test.equal(mongo.GridStore.DEFAULT_CONTENT_TYPE, ct);

            var gridStore3 = new mongo.GridStore(client, "test_gs_content_type", "w+");
            gridStore3.open(function(err, gridStore) {
              gridStore.contentType = "text/html";
              gridStore.close(function(err, result) {              
                var gridStore4 = new mongo.GridStore(client, "test_gs_content_type", "r");
                gridStore4.open(function(err, gridStore) {
                  test.equal("text/html", gridStore.contentType);
                  finished_test({test_gs_content_type:'ok'});       
                });                            
              })
            });          
          });
        });
      });
    });  
  },

  test_gs_content_type_option : function() {
    var gridStore = new mongo.GridStore(client, "test_gs_content_type_option", "w", {'content_type':'image/jpg'});
    gridStore.open(function(err, gridStore) {   
      gridStore.write('hello world\n', function(err, gridStore) {
        gridStore.close(function(result) {

          var gridStore2 = new mongo.GridStore(client, "test_gs_content_type_option", "r");
          gridStore2.open(function(err, gridStore) {
            test.equal('image/jpg', gridStore.contentType);
            finished_test({test_gs_content_type_option:'ok'});       
          });        
        });
      });
    });  
  },

  test_gs_unknown_mode : function() {
    var gridStore = new mongo.GridStore(client, "test_gs_unknown_mode", "x");
    gridStore.open(function(err, gridStore) {
      test.ok(err instanceof Error);
      test.equal("Illegal mode x", err.message);
      finished_test({test_gs_unknown_mode:'ok'});       
    });  
  },

  test_gs_metadata : function() {
    var gridStore = new mongo.GridStore(client, "test_gs_metadata", "w", {'content_type':'image/jpg'});
    gridStore.open(function(err, gridStore) {   
      gridStore.write('hello world\n', function(err, gridStore) {
        gridStore.close(function(err, result) {

          var gridStore2 = new mongo.GridStore(client, "test_gs_metadata", "r");
          gridStore2.open(function(err, gridStore) {
            test.equal(null, gridStore.metadata);

            var gridStore3 = new mongo.GridStore(client, "test_gs_metadata", "w+");
            gridStore3.open(function(err, gridStore) {
              gridStore.metadata = {'a':1};
              gridStore.close(function(err, result) {

                var gridStore4 = new mongo.GridStore(client, "test_gs_metadata", "r");
                gridStore4.open(function(err, gridStore) {
                  test.equal(1, gridStore.metadata.a);
                  finished_test({test_gs_metadata:'ok'});       
                });                
              });
            });                
          });                
        });
      });
    });    
  },

  test_admin_default_profiling_level : function() {
    var fs_client = new mongo.Db('admin_test_1', new mongo.Server("127.0.0.1", 27017, {auto_reconnect: false}));
    fs_client.open(function(err, fs_client) {
      fs_client.dropDatabase(function(err, done) {
        fs_client.collection('test', function(err, collection) {
          collection.insert({'a':1}, function(err, doc) {
            fs_client.admin(function(err, adminDb) {
              adminDb.profilingLevel(function(err, level) {
                test.equal("off", level);
                finished_test({test_admin_default_profiling_level:'ok'});       
                fs_client.close();
              });
            });          
          });
        });
      });
    });    
  },

  test_admin_change_profiling_level : function() {
    var fs_client = new mongo.Db('admin_test_2', new mongo.Server("127.0.0.1", 27017, {auto_reconnect: false}));
    fs_client.open(function(err, fs_client) {
      fs_client.dropDatabase(function(err, done) {
        fs_client.collection('test', function(err, collection) {
          collection.insert({'a':1}, function(err, doc) {
            fs_client.admin(function(err, adminDb) {
              adminDb.setProfilingLevel('slow_only', function(err, level) {              
                adminDb.profilingLevel(function(err, level) {
                  test.equal('slow_only', level);

                  adminDb.setProfilingLevel('off', function(err, level) {              
                    adminDb.profilingLevel(function(err, level) {
                      test.equal('off', level);

                      adminDb.setProfilingLevel('all', function(err, level) {              
                        adminDb.profilingLevel(function(err, level) {
                          test.equal('all', level);

                          adminDb.setProfilingLevel('medium', function(err, level) {              
                            test.ok(err instanceof Error);
                            test.equal("Error: illegal profiling level value medium", err.message);

                            finished_test({test_admin_change_profiling_level:'ok'});       
                            fs_client.close();                          
                          });
                        })
                      });
                    })
                  });
                })
              });
            });          
          });
        });
      });
    });      
  },

  test_admin_profiling_info : function() {
    var fs_client = new mongo.Db('admin_test_3', new mongo.Server("127.0.0.1", 27017, {auto_reconnect: false}));
    fs_client.open(function(err, fs_client) {
      fs_client.dropDatabase(function(err, done) {
        fs_client.collection('test', function(err, collection) {
          collection.insert({'a':1}, function(doc) {
            fs_client.admin(function(err, adminDb) {
              adminDb.setProfilingLevel('all', function(err, level) {
                collection.find(function(err, cursor) {
                  cursor.toArray(function(err, items) {                  
                    adminDb.setProfilingLevel('off', function(err, level) {
                      adminDb.profilingInfo(function(err, infos) {
                        test.ok(infos.constructor == Array);
                        test.ok(infos.length >= 1);
                        test.ok(infos[0].ts.constructor == Date);
                        test.ok(infos[0].info.constructor == String);
                        test.ok(infos[0].millis.constructor == Number);

                        finished_test({test_admin_profiling_info:'ok'});       
                        fs_client.close();                          
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

  test_admin_validate_collection : function() {
    var fs_client = new mongo.Db('admin_test_4', new mongo.Server("127.0.0.1", 27017, {auto_reconnect: false}));
    fs_client.open(function(err, fs_client) {
      fs_client.dropDatabase(function(err, done) {
        fs_client.collection('test', function(err, collection) {
          collection.insert({'a':1}, function(err, doc) {
            fs_client.admin(function(err, adminDb) {
              adminDb.validatCollection('test', function(err, doc) {
                test.ok(doc.result != null);
                test.ok(doc.result.match(/firstExtent/) != null);

                finished_test({test_admin_validate_collection:'ok'});       
                fs_client.close();                          
              });
            });          
          });
        });
      });
    });          
  },
  test_custom_primary_key_generator : function() {    
    // Custom factory (need to provide a 12 byte array);
    CustomPKFactory = function() {}
    CustomPKFactory.prototype = new Object();
    CustomPKFactory.createPk = function() {  
      return new mongo.ObjectID("aaaaaaaaaaaa");
    }

    var p_client = new mongo.Db('integration_tests_20', new mongo.Server("127.0.0.1", 27017, {}), {'pk':CustomPKFactory});
    p_client.open(function(err, p_client) {
      p_client.dropDatabase(function(err, done) {    
        p_client.createCollection('test_custom_key', function(err, collection) {
          collection.insert({'a':1}, function(err, doc) {
            collection.find({'_id':new mongo.ObjectID("aaaaaaaaaaaa")}, function(err, cursor) {
              cursor.toArray(function(err, items) {
                test.equal(1, items.length);

                finished_test({test_custom_primary_key_generator:'ok'});       
                p_client.close();
              });
            });
          });
        });
      });
    });      
  },

  // Mapreduce tests
  test_map_reduce : function() {
    client.createCollection('test_map_reduce', function(err, collection) {
      collection.insert([{'user_id':1}, {'user_id':2}]);

      // String functions
      var map = "function() { emit(this.user_id, 1); }";
      var reduce = "function(k,vals) { return 1; }";

      collection.mapReduce(map, reduce, function(err, collection) {
        collection.findOne({'_id':1}, function(err, result) {
          test.equal(1, result.value);
        });

        collection.findOne({'_id':2}, function(err, result) {
          test.equal(1, result.value);
          finished_test({test_map_reduce:'ok'});       
        });
      });    
    });
  },

  test_map_reduce_with_functions_as_arguments : function() {
    client.createCollection('test_map_reduce_with_functions_as_arguments', function(err, collection) {
      collection.insert([{'user_id':1}, {'user_id':2}]);

      // String functions
      var map = function() { emit(this.user_id, 1); };
      var reduce = function(k,vals) { return 1; };

      collection.mapReduce(map, reduce, function(err, collection) {
        collection.findOne({'_id':1}, function(err, result) {
          test.equal(1, result.value);
        });
        collection.findOne({'_id':2}, function(err, result) {
          test.equal(1, result.value);
          finished_test({test_map_reduce_with_functions_as_arguments:'ok'});       
        });
      });    
    });  
  },

  test_map_reduce_with_code_objects : function() {
    client.createCollection('test_map_reduce_with_code_objects', function(err, collection) {
      collection.insert([{'user_id':1}, {'user_id':2}]);

      // String functions
      var map = new mongo.Code("function() { emit(this.user_id, 1); }");
      var reduce = new mongo.Code("function(k,vals) { return 1; }");

      collection.mapReduce(map, reduce, function(err, collection) {
        collection.findOne({'_id':1}, function(err, result) {
          test.equal(1, result.value);
        });
        collection.findOne({'_id':2}, function(err, result) {
          test.equal(1, result.value);
          finished_test({test_map_reduce_with_code_objects:'ok'});       
        });
      });    
    });    
  },

  test_map_reduce_with_options : function() {
    client.createCollection('test_map_reduce_with_options', function(err, collection) {
      collection.insert([{'user_id':1}, {'user_id':2}, {'user_id':3}]);

      // String functions
      var map = new mongo.Code("function() { emit(this.user_id, 1); }");
      var reduce = new mongo.Code("function(k,vals) { return 1; }");

      collection.mapReduce(map, reduce, {'query': {'user_id':{'$gt':1}}}, function(err, collection) {
        collection.count(function(err, count) {
          test.equal(2, count);

          collection.findOne({'_id':2}, function(err, result) {
            test.equal(1, result.value);
          });
          collection.findOne({'_id':3}, function(err, result) {
            test.equal(1, result.value);
            finished_test({test_map_reduce_with_options:'ok'});       
          });
        });
      });    
    });    
  },

  test_map_reduce_error : function() {
    client.createCollection('test_map_reduce_error', function(err, collection) {
      collection.insert([{'user_id':1}, {'user_id':2}, {'user_id':3}]);

      // String functions
      var map = new mongo.Code("function() { emit(this.user_id, 1); }");
      var reduce = new mongo.Code("function(k,vals) { throw 'error'; }");

      collection.mapReduce(map, reduce, {'query': {'user_id':{'$gt':1}}}, function(err, collection) {
        test.ok(err != null);
        finished_test({test_map_reduce_error:'ok'});       
      });    
    });      
  },

  test_drop_indexes : function() {
    client.createCollection('test_drop_indexes', function(err, collection) {    
      collection.insert({a:1}, function(err, ids) {
        // Create an index on the collection
        client.createIndex(collection.collectionName, 'a', function(err, indexName) {
          test.equal("a_1", indexName);

          // Drop all the indexes
          collection.dropIndexes(function(err, result) {
            test.equal(true, result);          

            collection.indexInformation(function(err, result) {
              test.ok(result['a_1'] == null);
              finished_test({test_drop_indexes:'ok'});       
            })
          })
        });      
      })
    });  
  },

  test_add_and_remove_user : function() {
    var user_name = 'spongebob2';
    var password = 'password';

    var p_client = new mongo.Db('integration_tests_', new mongo.Server("127.0.0.1", 27017, {auto_reconnect: true}), {});
    p_client.open(function(err, automatic_connect_client) {
      p_client.authenticate('admin', 'admin', function(err, replies) {
        test.ok(err instanceof Error);

        // Add a user
        p_client.addUser(user_name, password, function(err, result) {
          p_client.authenticate(user_name, password, function(err, replies) {
            test.ok(replies);

            // Remove the user and try to authenticate again
            p_client.removeUser(user_name, function(err, result) {
              p_client.authenticate(user_name, password, function(err, replies) {
                test.ok(err instanceof Error);

                finished_test({test_add_and_remove_user:'ok'});
                p_client.close();
              });          
            });        
          });      
        });    
      });
    });
  },

  test_distinct_queries : function() {
    client.createCollection('test_distinct_queries', function(err, collection) {    
      collection.insert([{'a':0, 'b':{'c':'a'}},
        {'a':1, 'b':{'c':'b'}},
        {'a':1, 'b':{'c':'c'}},
        {'a':2, 'b':{'c':'a'}}, {'a':3}, {'a':3}], function(err, ids) {
          collection.distinct('a', function(err, docs) {
            test.deepEqual([0, 1, 2, 3], docs.sort());
          });

          collection.distinct('b.c', function(err, docs) {
            test.deepEqual(['a', 'b', 'c'], docs.sort());
            finished_test({test_distinct_queries:'ok'});
          });
      })
    });    
  },

  test_all_serialization_types : function() {
    client.createCollection('test_all_serialization_types', function(err, collection) {    
      var date = new Date();
      var oid = new mongo.ObjectID();
      var string = 'binstring'
      var bin = new mongo.Binary()
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
        'where': new mongo.Code('this.a > i', new mongo.OrderedHash().add('i', 1)),
        'dbref': new mongo.DBRef('namespace', oid, 'integration_tests_')
      }

      collection.insert(motherOfAllDocuments, function(err, docs) {
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
          test.equal(motherOfAllDocuments.where.scope.get('i'), doc.where.scope.i);
          test.equal(motherOfAllDocuments.dbref.namespace, doc.dbref.namespace);
          test.equal(motherOfAllDocuments.dbref.oid.toHexString(), doc.dbref.oid.toHexString());
          test.equal(motherOfAllDocuments.dbref.db, doc.dbref.db);        
          finished_test({test_all_serialization_types:'ok'});      
        })      
      });    
    });    
  },

  test_should_correctly_retrieve_one_record : function() {
    var p_client = new mongo.Db('integration_tests_', new mongo.Server("127.0.0.1", 27017, {auto_reconnect: true}), {});
    p_client.open(function(err, p_client) {
      client.createCollection('test_should_correctly_retrieve_one_record', function(err, collection) {    
        collection.insert({'a':0});

        p_client.collection('test_should_correctly_retrieve_one_record', function(err, usercollection) {
          usercollection.findOne({'a': 0}, function(err, result) {          
            finished_test({test_should_correctly_retrieve_one_record:'ok'});      
            p_client.close();
          });
        });
      });
    });
  },

  test_should_correctly_save_unicode_containing_document : function() {
    var doc = {statuses_count: 1687
    , created_at: 'Mon Oct 22 14:55:08 +0000 2007'
    , description: 'NodeJS hacker, Cofounder of Debuggable, CakePHP core alumnus'
    , favourites_count: 6
    , profile_sidebar_fill_color: 'EADEAA'
    , screen_name: 'felixge'
    , status: 
       { created_at: 'Fri Mar 12 08:59:44 +0000 2010'
       , in_reply_to_screen_name: null
       , truncated: false
       , in_reply_to_user_id: null
       , source: '<a href="http://www.atebits.com/" rel="nofollow">Tweetie</a>'
       , favorited: false
       , in_reply_to_status_id: null
       , id: 10364119169
       , text: '#berlin #snow = #fail : ('
       }
    , contributors_enabled: false
    , following: null
    , geo_enabled: false
    , time_zone: 'Eastern Time (US & Canada)'
    , profile_sidebar_border_color: 'D9B17E'
    , url: 'http://debuggable.com'
    , verified: false
    , location: 'Berlin'
    , profile_text_color: '333333'
    , notifications: null
    , profile_background_image_url: 'http://s.twimg.com/a/1268354287/images/themes/theme8/bg.gif'
    , protected: false
    , profile_link_color: '9D582E'
    , followers_count: 840
    , name: 'Felix Geisend\u00f6rfer'
    , profile_background_tile: false
    , id: 9599342
    , lang: 'en'
    , utc_offset: -18000
    , friends_count: 450
    , profile_background_color: '8B542B'
    , profile_image_url: 'http://a3.twimg.com/profile_images/107142257/passbild-square_normal.jpg'
    };

    client.createCollection('test_should_correctly_save_unicode_containing_document', function(err, collection) {    
      doc['_id'] = 'felixge';

      collection.save(doc, function(err, doc) {
        collection.findOne(function(err, doc) {
          test.equal('felixge', doc._id);        
          finished_test({test_should_correctly_save_unicode_containing_document:'ok'});      
        });
      });
    });
  },

  test_should_deserialize_large_integrated_array : function() {
    client.createCollection('test_should_deserialize_large_integrated_array', function(err, collection) {    
      var doc = {'a':0,
        'b':['tmp1', 'tmp2', 'tmp3', 'tmp4', 'tmp5', 'tmp6', 'tmp7', 'tmp8', 'tmp9', 'tmp10', 'tmp11', 'tmp12', 'tmp13', 'tmp14', 'tmp15', 'tmp16']
      };
      // Insert the collection
      collection.insert(doc);
      // Fetch and check the collection
      collection.findOne({'a': 0}, function(err, result) {         
        test.deepEqual(doc.a, result.a);
        test.deepEqual(doc.b, result.b);
        finished_test({test_should_deserialize_large_integrated_array:'ok'});      
      });
    });
  },

  test_find_one_error_handling : function() {
    client.createCollection('test_find_one_error_handling', function(err, collection) {    
      // Try to fetch an object using a totally invalid and wrong hex string... what we're interested in here
      // is the error handling of the findOne Method     
      try {
        collection.findOne({"_id":ObjectID.createFromHexString('5e9bd59248305adf18ebc15703a1')}, function(err, result) {});      
      } catch (err) {
        finished_test({test_find_one_error_handling:'ok'});      
      }
    });  
  },

  // test_force_binary_error : function() {
  //   client.createCollection('test_force_binary_error', function(err, collection) {    
  //     // Try to fetch an object using a totally invalid and wrong hex string... what we're interested in here
  //     // is the error handling of the findOne Method     
  //     var result= "";
  //     var hexString = "5e9bd59248305adf18ebc15703a1";
  //     for(var index=0 ; index < hexString.length; index+=2) {
  //         var string= hexString.substr(index, 2);
  //         var number= parseInt(string, 16);
  //         result+= BinaryParser.fromByte(number);
  //     }
  // 
  //     // Generate a illegal ID
  //     var id = ObjectID.createFromHexString('5e9bd59248305adf18ebc157');
  //     id.id = result;
  //     
  //     // Execute with error
  //     collection.findOne({"_id": id}, function(err, result) {
  //       // test.equal(undefined, result)
  //       test.ok(err != null)
  //       finished_test({test_force_binary_error:'ok'});      
  //     });      
  //   });  
  // },

  test_gs_weird_bug : function() {
    var gridStore = new mongo.GridStore(client, "test_gs_weird_bug", "w");
    var data = fs.readFileSync("./integration/test_gs_weird_bug.png", 'binary');

    gridStore.open(function(err, gridStore) {    
      gridStore.write(data, function(err, gridStore) {
        gridStore.close(function(err, result) {
          // Assert that we have overwriten the data
          mongo.GridStore.read(client, 'test_gs_weird_bug', function(err, fileData) {
            test.equal(data.length, fileData.length);
            finished_test({test_gs_weird_bug:'ok'});        
          });
        });
      });
    });            
  },

  test_gs_working_field_read : function() {
    var gridStore = new mongo.GridStore(client, "test_gs_working_field_read", "w");
    var data = fs.readFileSync("./integration/test_gs_working_field_read.pdf", 'binary');

    gridStore.open(function(err, gridStore) {    
      gridStore.write(data, function(err, gridStore) {
        gridStore.close(function(err, result) {
          // Assert that we have overwriten the data
          mongo.GridStore.read(client, 'test_gs_working_field_read', function(err, fileData) {
            test.equal(data.length, fileData.length);
            finished_test({test_gs_working_field_read:'ok'});        
          });
        });
      });
    });            
  },

  // Test field select with options
  test_field_select_with_options : function() {
    client.createCollection('test_field_select_with_options', function(err, r) {
      var collection = client.collection('test_field_select_with_options', function(err, collection) {
        var docCount = 25, docs = [];

        // Insert some test documents
        while(docCount--) docs.push(new mongo.OrderedHash().add('a',docCount).add('b',docCount));
        collection.insert(docs, function(err,retDocs){ docs = retDocs; });

        collection.find({},{ 'a' : 1},{ limit : 3, sort : [['a',-1]] },function(err,cursor){
          cursor.toArray(function(err,documents){
            test.equal(3,documents.length);
            documents.forEach(function(doc,idx){
              test.equal(undefined,doc.b); // making sure field select works
              test.equal((24-idx),doc.a); // checking limit sort object with field select
            });
          });
        });

        collection.find({},{},10,3,function(err,cursor){
          cursor.toArray(function(err,documents){
            test.equal(3,documents.length);
            documents.forEach(function(doc,idx){
              test.equal(doc.a,doc.b); // making sure empty field select returns properly
              test.equal((14-idx),doc.a); // checking skip and limit in args
            });
            finished_test({test_field_select_with_options:'ok'}); 
          });
        });      
      });
    });
  },

  // Test findAndModify a document
  test_find_and_modify_a_document : function() {
    client.createCollection('test_find_and_modify_a_document', function(err, collection) {
      // Test return new document on change
      collection.insert({'a':1, 'b':2}, function(err, doc) {
        // Let's modify the document in place
        collection.findAndModify({'a':1}, [['a', 1]], {'$set':{'b':3}}, true, function(err, updated_doc) {
          test.equal(1, updated_doc.a);
          test.equal(3, updated_doc.b);        
        })
      });

      // Test return old document on change
      collection.insert({'a':2, 'b':2}, function(err, doc) {
        // Let's modify the document in place
        collection.findAndModify({'a':2}, [['a', 1]], {'$set':{'b':3}}, function(err, updated_doc) {
          test.equal(2, updated_doc.a);
          test.equal(2, updated_doc.b);        
        })
      });

      // Test remove object on change
      collection.insert({'a':3, 'b':2}, function(err, doc) {
        // Let's modify the document in place
        collection.findAndModify({'a':3}, [], {'$set':{'b':3}}, true, true, function(err, updated_doc) {
          test.equal(3, updated_doc.a);
          test.equal(2, updated_doc.b);        
          finished_test({test_find_and_modify_a_document:'ok'}); 
        })
      });    
    });  
  },

  /*
    test_pair : function() {
      var p_client = new mongo.Db('integration_tests_21', new mongo.ServerPair(new mongo.Server("127.0.0.1", 27017, {}), new mongo.Server("127.0.0.1", 27018, {})), {});
      p_client.open(function(err, p_client) {    
        p_client.dropDatabase(function(err, done) {    
          test.ok(p_client.masterConnection != null);
          test.equal(2, p_client.connections.length);

          test.ok(p_client.serverConfig.leftServer.master);
          test.assertFalse(p_client.serverConfig.rightServer.master);

          p_client.createCollection('test_collection', function(err, collection) {
            collection.insert({'a':1}, function(err, doc) {
              collection.find(function(err, cursor) {
                cursor.toArray(function(err, items) {
                  test.equal(1, items.length);

                  finished_test({test_pair:'ok'});       
                  p_client.close();
                });
              });
            });
          });
        });
      });    
    },

    test_cluster : function() {
      var p_client = new mongo.Db('integration_tests_22', new mongo.ServerCluster([new mongo.Server("127.0.0.1", 27017, {}), new mongo.Server("127.0.0.1", 27018, {})]), {});
      p_client.open(function(err, p_client) {
        p_client.dropDatabase(function(err, done) {    
          test.ok(p_client.masterConnection != null);
          test.equal(2, p_client.connections.length);

          test.equal(true, p_client.serverConfig.servers[0].master);
          test.equal(false, p_client.serverConfig.servers[1].master);

          p_client.createCollection('test_collection', function(err, collection) {
            collection.insert({'a':1}, function(err, doc) {
              collection.find(function(err, cursor) {
                cursor.toArray(function(err, items) {
                  test.equal(1, items.length);

                  finished_test({test_cluster:'ok'});       
                  p_client.close();
                });
              });
            });
          });
        });
      });    
    },

    test_slave_connection :function() {
      var p_client = new mongo.Db('integration_tests_23', new mongo.Server("127.0.0.1", 27018, {}));
      p_client.open(function(err, p_client) {
        test.equal(null, err);
        finished_test({test_slave_connection:'ok'});
        p_client.close();
      });          
    }
  */  
  
  test_ensure_index : function() {
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
              finished_test({test_ensure_index:'ok'});                 
            });
          });      
        });
      });      
    })
  },
  
  test_insert_and_update_with_new_script_context: function() {
    new mongo.Db('test-db', new mongo.Server('localhost', 27017, {auto_reconnect: true}, {})).open(function(err, db) {
      //convience curried handler for functions of type 'a -> (err, result)
      function getResult(callback){
        return function(error, result) {
          test.ok(error == null);
          callback(result);
        }
      };

      db.collection('users', getResult(function(user_collection){
        user_collection.remove(function(err, result) {
          //first, create a user object   
          var newUser = { name : 'Test Account', settings : {} };
          user_collection.insert([newUser],  getResult(function(users){
              var user = users[0];

              var scriptCode = "settings.block = []; settings.block.push('test');";
              var context = { settings : { thisOneWorks : "somestring" } };

              Script.runInNewContext(scriptCode, context, "testScript");

              //now create update command and issue it
              var updateCommand = { $set : context };

              user_collection.update({_id : user._id}, updateCommand, null, 
                getResult(function(updateCommand) {
                  // Fetch the object and check that the changes are persisted
                  user_collection.findOne({_id : user._id}, function(err, doc) {
                    test.ok(err == null);
                    test.equal("Test Account", doc.name);
                    test.equal("somestring", doc.settings.thisOneWorks);
                    test.equal("test", doc.settings.block[0]);

                    // Let's close the db 
                    finished_test({test_insert_and_update_with_new_script_context:'ok'});
                    db.close();
                  });
                })
              );        
          }));          
        });
      }));      
    });
  },
  
  test_all_serialization_types_new_context : function() {
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
        "motherOfAllDocuments['where'] = new mongo.Code('this.a > i', new mongo.OrderedHash().add('i', 1));" +
        "motherOfAllDocuments['dbref'] = new mongo.DBRef('namespace', motherOfAllDocuments['oid'], 'integration_tests_');";
      
      var context = { motherOfAllDocuments : {}, mongo:mongo, date:date};
      // Execute function in context
      Script.runInNewContext(scriptCode, context, "testScript");
      // sys.puts(sys.inspect(context.motherOfAllDocuments))
      var motherOfAllDocuments = context.motherOfAllDocuments;

      collection.insert(context.motherOfAllDocuments, function(err, docs) {
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
           test.equal(motherOfAllDocuments.where.scope.get('i'), doc.where.scope.i);
           test.equal(motherOfAllDocuments.dbref.namespace, doc.dbref.namespace);
           test.equal(motherOfAllDocuments.dbref.oid.toHexString(), doc.dbref.oid.toHexString());
           test.equal(motherOfAllDocuments.dbref.db, doc.dbref.db);        
           finished_test({test_all_serialization_types_new_context:'ok'});      
         })      
       });    
    });    
  },  
};

/*******************************************************************************************************
  Setup For Running Tests
*******************************************************************************************************/
var client_tests = {};

if(process.argv[2]){
  var test_arg = process.argv[2];
  if(test_arg == 'all') client_tests = all_tests;
  else {
    test_arg.split(',').forEach(function(aTest){
      if(all_tests[aTest]) client_tests[aTest] = all_tests[aTest];
    });
  }
} else client_tests = all_tests;

var client_tests_keys = [];
for(key in client_tests) client_tests_keys.push(key);

// Set up the client connection
var client = new mongo.Db('integration_tests_', new mongo.Server("127.0.0.1", 27017, {}), {});
client.open(function(err, client) {
  // Do cleanup of the db
  client.dropDatabase(function() {
    // Run  all the tests
    run_tests();  
    // Start the timer that checks that all the tests have finished or failed
    ensure_tests_finished();  
  });
});

function ensure_tests_finished() {
  var intervalId = setInterval(function() {
    if(finished_tests.length >= client_tests_keys.length) {
      // Print out the result
      sys.puts("= Final Checks =========================================================");
      // Stop interval timer and close db connection
      clearInterval(intervalId);      
      // Ensure we don't have any more cursors hanging about
      client.cursorInfo(function(err, cursorInfo) {
        sys.puts(sys.inspect(cursorInfo));
        client.close();
      });
    }
  }, 100);
};

// All the finished client tests
var finished_tests = [];

// Run all the tests
function run_tests() {
  // client_tests = client_tests.sort(randOrd);
  // Run all the tests
  client_tests_keys.forEach(function(t){
  //  sys.puts('....starting...'+t);
    var function_name = t;
    try{
      client_tests[function_name]();
    } catch(error){
      sys.puts(sys.inspect(error));
     // var obj = {}; obj[function_name] = error;
      finished_test({function_name:error});
    }
  });
}


function finished_test(test_object) {
  for(var name in test_object) {
    sys.puts("= executing test: " + name + " [" + test_object[name] + "]");
  }  
  finished_tests.push(test_object);
}

function randOrd() {
  return (Math.round(Math.random()) - 0.5); 
}

/**
  Helper Utilities for the testing
**/
function locate_collection_by_name(collectionName, collections) {
  var foundObject = null;
  collections.forEach(function(collection) {
    if(collection.collectionName == collectionName) foundObject = collection;
  });
  return foundObject;
}
