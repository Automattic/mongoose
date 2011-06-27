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

  // Test a simple find
  shouldCorrectlyPerformSimpleFind : function(test) {
    client.createCollection('test_find_simple', function(err, r) {
      var collection = client.collection('test_find_simple', function(err, collection) {
        var doc1 = null;
        var doc2 = null;
  
        // Insert some test documents
        collection.insert([{a:2}, {b:3}], {safe:true}, function(err, docs) {
          doc1 = docs[0]; 
          doc2 = docs[1]

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
              test.done();
            });
          });
        });
      });
    });    
  },
  
  // Test a simple find chained
  shouldCorrectlyPeformSimpleChainedFind : function(test) {
    client.createCollection('test_find_simple_chained', function(err, r) {
      var collection = client.collection('test_find_simple_chained', function(err, collection) {
        var doc1 = null;
        var doc2 = null;
  
        // Insert some test documents
        collection.insert([{a:2}, {b:3}], {safe:true}, function(err, docs) {
          doc1 = docs[0]; 
          doc2 = docs[1]

          // Ensure correct insertion testing via the cursor and the count function
          collection.find().toArray(function(err, documents) {
            test.equal(2, documents.length);
          });
          collection.count(function(err, count) {
            test.equal(2, count);
          });
          // Fetch values by selection
          collection.find({'a': doc1.a}).toArray(function(err, documents) {
            test.equal(1, documents.length);
            test.equal(doc1.a, documents[0].a);
            // Let's close the db
            test.done();
          });
        });
      });
    });    
  },
  
  // Test advanced find
  shouldCorrectlyPeformAdvancedFinds : function(test) {
    client.createCollection('test_find_advanced', function(err, r) {
      var collection = client.collection('test_find_advanced', function(err, collection) {
        var doc1 = null, doc2 = null, doc3 = null;
  
        // Insert some test documents
        collection.insert([{a:1}, {a:2}, {b:3}], {safe:true}, function(err, docs) {
          var doc1 = docs[0], doc2 = docs[1], doc3 = docs[2];
  
          // Locate by less than
          collection.find({'a':{'$lt':10}}).toArray(function(err, documents) {
            test.equal(2, documents.length);
            // Check that the correct documents are returned
            var results = [];
            // Check that we have all the results we want
            documents.forEach(function(doc) {
              if(doc.a == 1 || doc.a == 2) results.push(1);
            });
            test.equal(2, results.length);
          });
  
          // Locate by greater than
          collection.find({'a':{'$gt':1}}).toArray(function(err, documents) {
            test.equal(1, documents.length);
            test.equal(2, documents[0].a);
          });
  
          // Locate by less than or equal to
          collection.find({'a':{'$lte':1}}).toArray(function(err, documents) {
            test.equal(1, documents.length);
            test.equal(1, documents[0].a);
          });
  
          // Locate by greater than or equal to
          collection.find({'a':{'$gte':1}}).toArray(function(err, documents) {
            test.equal(2, documents.length);
            // Check that the correct documents are returned
            var results = [];
            // Check that we have all the results we want
            documents.forEach(function(doc) {
              if(doc.a == 1 || doc.a == 2) results.push(1);
            });
            test.equal(2, results.length);
          });
  
          // Locate by between
          collection.find({'a':{'$gt':1, '$lt':3}}).toArray(function(err, documents) {
            test.equal(1, documents.length);
            test.equal(2, documents[0].a);
          });
  
          // Locate in clause
          collection.find({'a':{'$in':[1,2]}}).toArray(function(err, documents) {
            test.equal(2, documents.length);
            // Check that the correct documents are returned
            var results = [];
            // Check that we have all the results we want
            documents.forEach(function(doc) {
              if(doc.a == 1 || doc.a == 2) results.push(1);
            });
            test.equal(2, results.length);
          });
  
          // Locate in _id clause
          collection.find({'_id':{'$in':[doc1['_id'], doc2['_id']]}}).toArray(function(err, documents) {
            test.equal(2, documents.length);
            // Check that the correct documents are returned
            var results = [];
            // Check that we have all the results we want
            documents.forEach(function(doc) {
              if(doc.a == 1 || doc.a == 2) results.push(1);
            });
            test.equal(2, results.length);
            // Let's close the db
            test.done();
          });
        });
      });
    });    
  },
  
  // Test sorting of results
  shouldCorrectlyPerformFindWithSort : function(test) {
    client.createCollection('test_find_sorting', function(err, r) {
      client.collection('test_find_sorting', function(err, collection) {
        var doc1 = null, doc2 = null, doc3 = null, doc4 = null;
        // Insert some test documents
        collection.insert([{a:1, b:2},
            {a:2, b:1},
            {a:3, b:2},
            {a:4, b:1}
          ], {safe:true}, function(err, docs) {
            doc1 = docs[0]; 
            doc2 = docs[1]; 
            doc3 = docs[2]; 
            doc4 = docs[3]

            // Test sorting (ascending)
            collection.find({'a': {'$lt':10}}, {'sort': [['a', 1]]}).toArray(function(err, documents) {
              test.equal(4, documents.length);
              test.equal(1, documents[0].a);
              test.equal(2, documents[1].a);
              test.equal(3, documents[2].a);
              test.equal(4, documents[3].a);

              // Test sorting (descending)
              collection.find({'a': {'$lt':10}}, {'sort': [['a', -1]]}).toArray(function(err, documents) {
                test.equal(4, documents.length);
                test.equal(4, documents[0].a);
                test.equal(3, documents[1].a);
                test.equal(2, documents[2].a);
                test.equal(1, documents[3].a);

                // Test sorting (descending), sort is hash
                collection.find({'a': {'$lt':10}}, {sort: {a: -1}}).toArray(function(err, documents) {
                  test.equal(4, documents.length);
                  test.equal(4, documents[0].a);
                  test.equal(3, documents[1].a);
                  test.equal(2, documents[2].a);
                  test.equal(1, documents[3].a);

                  // Sorting using array of names, assumes ascending order
                  collection.find({'a': {'$lt':10}}, {'sort': ['a']}).toArray(function(err, documents) {
                    test.equal(4, documents.length);
                    test.equal(1, documents[0].a);
                    test.equal(2, documents[1].a);
                    test.equal(3, documents[2].a);
                    test.equal(4, documents[3].a);

                    // Sorting using single name, assumes ascending order
                    collection.find({'a': {'$lt':10}}, {'sort': 'a'}).toArray(function(err, documents) {
                      test.equal(4, documents.length);
                      test.equal(1, documents[0].a);
                      test.equal(2, documents[1].a);
                      test.equal(3, documents[2].a);
                      test.equal(4, documents[3].a);

                      // Sorting using single name, assumes ascending order, sort is hash
                      collection.find({'a': {'$lt':10}}, {sort: {'a':1}}).toArray(function(err, documents) {
                        test.equal(4, documents.length);
                        test.equal(1, documents[0].a);
                        test.equal(2, documents[1].a);
                        test.equal(3, documents[2].a);
                        test.equal(4, documents[3].a);

                        collection.find({'a': {'$lt':10}}, {'sort': ['b', 'a']}).toArray(function(err, documents) {
                          test.equal(4, documents.length);
                          test.equal(2, documents[0].a);
                          test.equal(4, documents[1].a);
                          test.equal(1, documents[2].a);
                          test.equal(3, documents[3].a);

                          // Sorting using empty array, no order guarantee should not blow up
                          collection.find({'a': {'$lt':10}}, {'sort': []}).toArray(function(err, documents) {
                            test.equal(4, documents.length);

                            /* NONACTUAL */
                            // Sorting using ordered hash
                            collection.find({'a': {'$lt':10}}, {'sort': {a:-1}}).toArray(function(err, documents) {
                              // Fail test if not an error
                              test.equal(4, documents.length);
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
  },
  
  // Test the limit function of the db
  shouldCorrectlyPerformFindWithLimit : function(test) {
    client.createCollection('test_find_limits', function(err, r) {
      client.collection('test_find_limits', function(err, collection) {
        var doc1 = null, doc2 = null, doc3 = null, doc4 = null;
  
        // Insert some test documents
        collection.insert([{a:1},
            {b:2},
            {c:3},
            {d:4}
          ], {safe:true}, function(err, docs) {
            doc1 = docs[0]; 
            doc2 = docs[1]; 
            doc3 = docs[2]; 
            doc4 = docs[3]

            // Test limits
            collection.find({}, {'limit': 1}).toArray(function(err, documents) {
              test.equal(1, documents.length);
            });

            collection.find({}, {'limit': 2}).toArray(function(err, documents) {
              test.equal(2, documents.length);
            });

            collection.find({}, {'limit': 3}).toArray(function(err, documents) {
              test.equal(3, documents.length);
            });

            collection.find({}, {'limit': 4}).toArray(function(err, documents) {
              test.equal(4, documents.length);
            });

            collection.find({}, {}).toArray(function(err, documents) {
              test.equal(4, documents.length);
            });

            collection.find({}, {'limit':99}).toArray(function(err, documents) {
              test.equal(4, documents.length);
              // Let's close the db
              test.done();
            });
        });  
      });
    });    
  },
  
  // Test find by non-quoted values (issue #128)
  shouldCorrectlyFindWithNonQuotedValues : function(test) {
    client.createCollection('test_find_non_quoted_values', function(err, r) {
      client.collection('test_find_non_quoted_values', function(err, collection) {
        // insert test document
        collection.insert([{ a: 19, b: 'teststring', c: 59920303 },
                           { a: "19", b: 'teststring', c: 3984929 }], {safe:true} , function(err, r) {
                             
           collection.find({ a: 19 }).toArray(function(err, documents) {
             test.equal(1, documents.length);
             test.done();
           });
        });        
      });
    });    
  },
  
  // Test for querying embedded document using dot-notation (issue #126)
  shouldCorrectlyFindEmbeddedDocument : function(test) {
    client.createCollection('test_find_embedded_document', function(err, r) {
      client.collection('test_find_embedded_document', function(err, collection) {
        // insert test document
        collection.insert([{ a: { id: 10, value: 'foo' }, b: 'bar', c: { id: 20, value: 'foobar' }},
                           { a: { id: 11, value: 'foo' }, b: 'bar2', c: { id: 20, value: 'foobar' }}], {safe:true}, function(err, r) {
                             
           // test using integer value
           collection.find({ 'a.id': 10 }).toArray(function(err, documents) {
             test.equal(1, documents.length);
             test.equal('bar', documents[0].b);
           });

           // test using string value
           collection.find({ 'a.value': 'foo' }).toArray(function(err, documents) {
             // should yield 2 documents
             test.equal(2, documents.length);
             test.equal('bar', documents[0].b);
             test.equal('bar2', documents[1].b);
             test.done();
           });
        });        
      });
    });    
  },
  
  // Find no records
  shouldCorrectlyFindNoRecords : function(test) {
    client.createCollection('test_find_one_no_records', function(err, r) {
      client.collection('test_find_one_no_records', function(err, collection) {
        collection.find({'a':1}, {}).toArray(function(err, documents) {
          test.equal(0, documents.length);
          // Let's close the db
          test.done();
        });
      });
    });    
  },
  
  shouldCorrectlyPerformFindByWhere : function(test) {
    client.createCollection('test_where', function(err, collection) {
      test.ok(collection instanceof Collection);
      collection.insert([{'a':1}, {'a':2}, {'a':3}], {safe:true}, function(err, ids) {
        collection.count(function(err, count) {
          test.equal(3, count);
  
          // Let's test usage of the $where statement
          collection.find({'$where':new client.bson_serializer.Code('this.a > 2')}).count(function(err, count) {
            test.equal(1, count);
          });
  
          collection.find({'$where':new client.bson_serializer.Code('this.a > i', {i:1})}).count(function(err, count) {
            test.equal(2, count);

            // Let's close the db
            test.done();
          });
        });
      });
    });
  },  
  
  shouldCorrectlyPerformFindsWithHintTurnedOn : function(test) {
    client.createCollection('test_hint', function(err, collection) {
      collection.insert({'a':1}, {safe:true}, function(err, ids) {
        client.createIndex(collection.collectionName, "a", function(err, indexName) {
          collection.find({'a':1}, {'hint':'a'}).toArray(function(err, items) {
            test.equal(1, items.length);
          });
  
          collection.find({'a':1}, {'hint':['a']}).toArray(function(err, items) {
            test.equal(1, items.length);
          });
  
          collection.find({'a':1}, {'hint':{'a':1}}).toArray(function(err, items) {
            test.equal(1, items.length);
          });
  
          // Modify hints
          collection.hint = 'a';
          test.equal(1, collection.hint['a']);
          collection.find({'a':1}).toArray(function(err, items) {
            test.equal(1, items.length);
          });
  
          collection.hint = ['a'];
          test.equal(1, collection.hint['a']);
          collection.find({'a':1}).toArray(function(err, items) {
            test.equal(1, items.length);
          });
  
          collection.hint = {'a':1};
          test.equal(1, collection.hint['a']);
          collection.find({'a':1}).toArray(function(err, items) {
            test.equal(1, items.length);
          });
  
          collection.hint = null;
          test.ok(collection.hint == null);
          collection.find({'a':1}).toArray(function(err, items) {
            test.equal(1, items.length);
            // Let's close the db
            test.done();
          });
        });
      });
    });
  },  
  
  shouldCorrectlyPerformFindByObjectID : function(test) {
    client.createCollection('test_find_by_oid', function(err, collection) {
      collection.save({'hello':'mike'}, {safe:true}, function(err, docs) {
        test.ok(docs._id instanceof client.bson_serializer.ObjectID || Object.prototype.toString.call(docs._id) === '[object ObjectID]');
  
        collection.findOne({'_id':docs._id}, function(err, doc) {
          test.equal('mike', doc.hello);
  
          var id = doc._id.toString();
          collection.findOne({'_id':new client.bson_serializer.ObjectID(id)}, function(err, doc) {
            test.equal('mike', doc.hello);
            // Let's close the db
            test.done();
          });
        });
      });
    });
  },  
  
  shouldCorrectlyRetrieveSingleRecord : function(test) {
    var p_client = new Db(MONGODB, new Server("127.0.0.1", 27017, {auto_reconnect: true}), {native_parser: (process.env['TEST_NATIVE'] != null)});
    p_client.bson_deserializer = client.bson_deserializer;
    p_client.bson_serializer = client.bson_serializer;
    p_client.pkFactory = client.pkFactory;
  
    p_client.open(function(err, p_client) {
      client.createCollection('test_should_correctly_retrieve_one_record', function(err, collection) {
        collection.insert({'a':0}, {safe:true}, function(err, r) {
          p_client.collection('test_should_correctly_retrieve_one_record', function(err, usercollection) {
            usercollection.findOne({'a': 0}, function(err, result) {
              p_client.close();

              test.done();
            });
          });          
        });  
      });
    });
  }, 
  
  shouldCorrectlyHandleError : function(test) {
    client.createCollection('test_find_one_error_handling', function(err, collection) {
      // Try to fetch an object using a totally invalid and wrong hex string... what we're interested in here
      // is the error handling of the findOne Method
      try {
        collection.findOne({"_id":client.bson_serializer.ObjectID.createFromHexString('5e9bd59248305adf18ebc15703a1')}, function(err, result) {});
      } catch (err) {
        test.done();
      }
    });
  },   
  
  // Test field select with options
  shouldCorrectlyPerformFindWithOptions : function(test) {
    client.createCollection('test_field_select_with_options', function(err, r) {
      var collection = client.collection('test_field_select_with_options', function(err, collection) {
        var docCount = 25, docs = [];
  
        // Insert some test documents
        while(docCount--) docs.push({a:docCount, b:docCount});
        collection.insert(docs, {safe:true}, function(err,retDocs) { 
          docs = retDocs; 

          collection.find({},{ 'a' : 1},{ limit : 3, sort : [['a',-1]] }).toArray(function(err,documents){
            test.equal(3,documents.length);
            documents.forEach(function(doc,idx){
              test.equal(undefined,doc.b); // making sure field select works
              test.equal((24-idx),doc.a); // checking limit sort object with field select
            });
          });

          collection.find({},{},10,3).toArray(function(err,documents){
            test.equal(3,documents.length);
            documents.forEach(function(doc,idx){
              test.equal(doc.a,doc.b); // making sure empty field select returns properly
              test.equal((14-idx),doc.a); // checking skip and limit in args
            });

            test.done();
          });
        });  
      });
    });
  },
  
  // Test findAndModify a document
  shouldCorrectlyFindAndModifyDocument : function(test) {
    client.createCollection('test_find_and_modify_a_document', function(err, collection) {
      // Test return new document on change
      collection.insert({'a':1, 'b':2}, {safe:true}, function(err, doc) {
        // Let's modify the document in place
        collection.findAndModify({'a':1}, [['a', 1]], {'$set':{'b':3}}, {'new': true}, function(err, updated_doc) {
          test.equal(1, updated_doc.a);
          test.equal(3, updated_doc.b);
        })
      });
  
      // Test return old document on change
      collection.insert({'a':2, 'b':2}, {safe:true}, function(err, doc) {
        // Let's modify the document in place
        collection.findAndModify({'a':2}, [['a', 1]], {'$set':{'b':3}}, {safe:true}, function(err, updated_doc) {
          test.equal(2, updated_doc.a);
          test.equal(2, updated_doc.b);
        })
      });
  
      // Test remove object on change
      collection.insert({'a':3, 'b':2}, {safe:true}, function(err, doc) {
        // Let's modify the document in place
        collection.findAndModify({'a':3}, [], {'$set':{'b':3}}, {'new': true, remove: true}, function(err, updated_doc) {
          test.equal(3, updated_doc.a);
          test.equal(2, updated_doc.b);
        })
      });

      // Let's upsert!
      collection.findAndModify({'a':4}, [], {'$set':{'b':3}}, {'new': true, upsert: true}, function(err, updated_doc) {
        test.equal(4, updated_doc.a);
        test.equal(3, updated_doc.b);
      });

      // Test selecting a subset of fields
      collection.insert({a: 100, b: 101}, {safe:true}, function (err, ids) {
        collection.findAndModify({'a': 100}, [], {'$set': {'b': 5}}, {'new': true, fields: {b: 1}}, function (err, updated_doc) {
          test.equal(2, Object.keys(updated_doc).length);
          test.equal(ids[0]['_id'].toHexString(), updated_doc._id.toHexString());
          test.equal(5, updated_doc.b);
          test.equal("undefined", typeof updated_doc.a);
          
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