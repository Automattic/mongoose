var testCase = require('../deps/nodeunit').testCase,
  debug = require('util').debug
  inspect = require('util').inspect,
  nodeunit = require('../deps/nodeunit'),
  Db = require('../lib/mongodb').Db,
  Cursor = require('../lib/mongodb').Cursor,
  Step = require("../deps/step/lib/step"),
  Collection = require('../lib/mongodb').Collection,
  Server = require('../lib/mongodb').Server;

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

  shouldCorrectlyExecuteToArray : function(test) {
    // Create a non-unique index and test inserts
    client.createCollection('test_array', function(err, collection) {
      collection.insert({'b':[1, 2, 3]}, {safe:true}, function(err, ids) {
        collection.find().toArray(function(err, documents) {
          test.deepEqual([1, 2, 3], documents[0].b);
          // Let's close the db
          test.done();
        });
      });
    });    
  },
  
  shouldCorrectlyExecuteToArrayAndFailOnFurtherCursorAccess : function(test) {
    client.createCollection('test_to_a', function(err, collection) {
      test.ok(collection instanceof Collection);
      collection.insert({'a':1}, {safe:true}, function(err, ids) {
        collection.find({}, function(err, cursor) {
          cursor.toArray(function(err, items) {
            // Should fail if called again (cursor should be closed)
            cursor.toArray(function(err, items) {
              test.ok(err instanceof Error);
              test.equal("Cursor is closed", err.message);
  
              // Should fail if called again (cursor should be closed)
              cursor.each(function(err, item) {
                test.ok(err instanceof Error);
                test.equal("Cursor is closed", err.message);
                // Let's close the db
                test.done();
              });
            });
          });
        });
      });
    });
  }, 
  
  shouldCorrectlyFailToArrayDueToFinishedEachOperation : function(test) {
    client.createCollection('test_to_a_after_each', function(err, collection) {
      test.ok(collection instanceof Collection);
      collection.insert({'a':1}, {safe:true}, function(err, ids) {
        collection.find(function(err, cursor) {
          cursor.each(function(err, item) {
            if(item == null) {
              cursor.toArray(function(err, items) {
                test.ok(err instanceof Error);
                test.equal("Cursor is closed", err.message);
  
                // Let's close the db
                test.done();
              });
            };
          });
        });
      });
    });
  },  
  
  shouldCorrectlyExecuteCursorExplain : function(test) {
    client.createCollection('test_explain', function(err, collection) {
      collection.insert({'a':1}, {safe:true}, function(err, r) {
        collection.find({'a':1}, function(err, cursor) {
          cursor.explain(function(err, explaination) {
            test.ok(explaination.cursor != null);
            test.ok(explaination.n.constructor == Number);
            test.ok(explaination.millis.constructor == Number);
            test.ok(explaination.nscanned.constructor == Number);

            // Let's close the db
            test.done();
          });
        });        
      });
    });
  }, 
  
  shouldCorrectlyExecuteCursorCount : function(test) {
    client.createCollection('test_count', function(err, collection) {
      collection.find(function(err, cursor) {
        cursor.count(function(err, count) {
          test.equal(0, count);

          Step(
            function insert() {
              var group = this.group();

              for(var i = 0; i < 10; i++) {
                collection.insert({'x':i}, {safe:true}, group());
              }
            }, 
            
            function finished() {
              collection.find().count(function(err, count) {
                  test.equal(10, count);
                  test.ok(count.constructor == Number);
              });

              collection.find({}, {'limit':5}).count(function(err, count) {
                test.equal(10, count);
              });

              collection.find({}, {'skip':5}).count(function(err, count) {
                test.equal(10, count);
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
                        test.done();
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
            }
          )
        });
      });
    });
  },
  
  shouldCorrectlyExecuteSortOnCursor : function(test) {
    client.createCollection('test_sort', function(err, collection) {
      Step(
        function insert() {
          var group = this.group();

          for(var i = 0; i < 5; i++) {
            collection.insert({'a':i}, {safe:true}, group());
          }
        }, 
        
        function finished() {
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
                // Let's close the db
                test.done();
              });
            });
          });
        }
      );
    });
  },
  
  shouldCorrectlyThrowErrorOnToArrayWhenMissingCallback : function(test) {
    client.createCollection('test_to_array', function(err, collection) {
      Step(
        function insert() {
          var group = this.group();

          for(var i = 0; i < 2; i++) {
            collection.save({'x':1}, {safe:true}, group());
          }
        }, 
        
        function finished() {
          collection.find(function(err, cursor) {
            test.throws(function () {
              cursor.toArray();
            });
            test.done();
          });
        }
      )        
    });
  },
  
  shouldThrowErrorOnEachWhenMissingCallback : function(test) {
    client.createCollection('test_each', function(err, collection) {
      Step(
        function insert() {
          var group = this.group();

          for(var i = 0; i < 2; i++) {
            collection.save({'x':1}, {safe:true}, group());
          }
        }, 
        
        function finished() {  
          collection.find(function(err, cursor) {
            test.throws(function () {
              cursor.each();
            });
            test.done();
          });
        }
      )
    });
  },

  shouldCorrectlyHandleLimitOnCursor : function(test) {
    client.createCollection('test_cursor_limit', function(err, collection) {
      Step(
        function insert() {
          var group = this.group();

          for(var i = 0; i < 10; i++) {
            collection.save({'x':1}, {safe:true}, group());
          }
        }, 
        
        function finished() {
          collection.find().count(function(err, count) {
            test.equal(10, count);
          });
  
          collection.find(function(err, cursor) {
            cursor.limit(5, function(err, cursor) {
              cursor.toArray(function(err, items) {
                test.equal(5, items.length);
                // Let's close the db
                test.done();
              });
            });
          });
        }
      );
    });
  },
  
  shouldCorrectlyReturnErrorsOnIllegalLimitValues : function(test) {
    client.createCollection('test_limit_exceptions', function(err, collection) {
      collection.insert({'a':1}, {safe:true}, function(err, docs) {});
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
          });
        });
      });
  
      collection.find(function(err, cursor) {
        cursor.close(function(err, cursor) {
          cursor.limit(1, function(err, cursor) {
            test.ok(err instanceof Error);
            test.equal("Cursor is closed", err.message);

            test.done();
          });
        });
      });
    });
  },
  
  shouldCorrectlySkipRecordsOnCursor : function(test) {
    client.createCollection('test_skip', function(err, collection) {
      Step(
        function insert() {
          var group = this.group();

          for(var i = 0; i < 10; i++) {
            collection.insert({'x':i}, {safe:true}, group());
          }
        }, 
        
        function finished() {
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
                    test.done();
                  });
                });
              });
            });
          });
        }
      )
    });
  },
  
  shouldCorrectlyReturnErrorsOnIllegalSkipValues : function(test) {
    client.createCollection('test_skip_exceptions', function(err, collection) {
      collection.insert({'a':1}, {safe:true}, function(err, docs) {});
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
          });
        });
      });
  
      collection.find(function(err, cursor) {
        cursor.close(function(err, cursor) {
          cursor.skip(1, function(err, cursor) {
            test.ok(err instanceof Error);
            test.equal("Cursor is closed", err.message);
            
            test.done();
          });
        });
      });
    });
  },
  
  shouldReturnErrorsOnIllegalBatchSizes : function(test) {
    client.createCollection('test_batchSize_exceptions', function(err, collection) {
      collection.insert({'a':1}, {safe:true}, function(err, docs) {});
      collection.find(function(err, cursor) {
        cursor.batchSize('not-an-integer', function(err, cursor) {
          test.ok(err instanceof Error);
          test.equal("batchSize requires an integer", err.message);
        });
      });
  
      collection.find(function(err, cursor) {
        cursor.nextObject(function(err, doc) {
          cursor.nextObject(function(err, doc) {
            cursor.batchSize(1, function(err, cursor) {
              test.ok(err instanceof Error);
              test.equal("Cursor is closed", err.message);
            });
          });
        });
      });
  
      collection.find(function(err, cursor) {
        cursor.close(function(err, cursor) {
          cursor.batchSize(1, function(err, cursor) {
            test.ok(err instanceof Error);
            test.equal("Cursor is closed", err.message);
            
            test.done();
          });
        });
      });
    });
  },

  shouldCorrectlyHandleChangesInBatchSizes : function(test) {
    client.createCollection('test_not_multiple_batch_size', function(err, collection) {
      var records = 6;
      var batchSize = 2;
      var docs = [];
      for(var i = 0; i < records; i++) {
        docs.push({'a':i});
      }

      collection.insert(docs, {safe:true}, function() {
        collection.find({}, {batchSize : batchSize}, function(err, cursor) {
          //1st
          cursor.nextObject(function(err, items) {
            //cursor.items should contain 1 since nextObject already popped one
            test.equal(1, cursor.items.length);
            test.ok(items != null);

            //2nd
            cursor.nextObject(function(err, items) {
              test.equal(0, cursor.items.length);
              test.ok(items != null);

              //test batch size modification on the fly
              batchSize = 3;
              cursor.batchSize(batchSize);

              //3rd
              cursor.nextObject(function(err, items) {
                test.equal(2, cursor.items.length);
                test.ok(items != null);

                //4th
                cursor.nextObject(function(err, items) {
                  test.equal(1, cursor.items.length);
                  test.ok(items != null);

                  //5th
                  cursor.nextObject(function(err, items) {
                    test.equal(0, cursor.items.length);
                    test.ok(items != null);

                    //6th
                    cursor.nextObject(function(err, items) {
                      test.equal(0, cursor.items.length);
                      test.ok(items != null);

                      //No more
                      cursor.nextObject(function(err, items) {
                        test.ok(items == null);
                        test.ok(cursor.isClosed());
                        
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
  },
  
  shouldCorrectlyHandleBatchSize : function(test) {
    client.createCollection('test_multiple_batch_size', function(err, collection) {
      //test with the last batch that is a multiple of batchSize
      var records = 4;
      var batchSize = 2;
      var docs = [];
      for(var i = 0; i < records; i++) {
        docs.push({'a':i});
      }

      collection.insert(docs, {safe:true}, function() {
        collection.find({}, {batchSize : batchSize}, function(err, cursor) {
          //1st
          cursor.nextObject(function(err, items) {
            test.equal(1, cursor.items.length);
            test.ok(items != null);

            //2nd
            cursor.nextObject(function(err, items) {
              test.equal(0, cursor.items.length);
              test.ok(items != null);

              //3rd
              cursor.nextObject(function(err, items) {
                test.equal(1, cursor.items.length);
                test.ok(items != null);

                //4th
                cursor.nextObject(function(err, items) {
                  test.equal(0, cursor.items.length);
                  test.ok(items != null);

                  //No more
                  cursor.nextObject(function(err, items) {
                    test.ok(items == null);
                    test.ok(cursor.isClosed());
                    
                    test.done();
                  });
                });
              });
            });
          });
        });
      });
    });
  },

  shouldHandleWhenLimitBiggerThanBatchSize : function(test) {
    client.createCollection('test_limit_greater_than_batch_size', function(err, collection) {
      var limit = 4;
      var records = 10;
      var batchSize = 3;
      var docs = [];
      for(var i = 0; i < records; i++) {
        docs.push({'a':i});
      }

      collection.insert(docs, {safe:true}, function() {
        collection.find({}, {batchSize : batchSize, limit : limit}, function(err, cursor) {
          //1st
          cursor.nextObject(function(err, items) {
            test.equal(2, cursor.items.length);

            //2nd
            cursor.nextObject(function(err, items) {
              test.equal(1, cursor.items.length);

              //3rd
              cursor.nextObject(function(err, items) {
                test.equal(0, cursor.items.length);

                //4th
                cursor.nextObject(function(err, items) {
                  test.equal(0, cursor.items.length);
  
                  //No more
                  cursor.nextObject(function(err, items) {
                    test.ok(items == null);
                    test.ok(cursor.isClosed());
                    
                    test.done();
                  });
                });
              });
            });
          });
        });
      });
    });
  },

  shouldHandleLimitLessThanBatchSize : function(test) {
    client.createCollection('test_limit_less_than_batch_size', function(err, collection) {
      var limit = 2;
      var records = 10;
      var batchSize = 4;
      var docs = [];
      for(var i = 0; i < records; i++) {
        docs.push({'a':i});
      }

      collection.insert(docs, {safe:true}, function() {
        collection.find({}, {batchSize : batchSize, limit : limit}, function(err, cursor) {
          //1st
          cursor.nextObject(function(err, items) {
            test.equal(1, cursor.items.length);

            //2nd
            cursor.nextObject(function(err, items) {
              test.equal(0, cursor.items.length);

              //No more
              cursor.nextObject(function(err, items) {
                test.ok(items == null);
                test.ok(cursor.isClosed());

                test.done();
              });
            });
          });
        });
      });
    });
  },

  shouldHandleSkipLimitChaining : function(test) {
    client.createCollection('test_limit_skip_chaining', function(err, collection) {
      Step(
        function insert() {
          var group = this.group();

          for(var i = 0; i < 10; i++) {
            collection.insert({'x':1}, {safe:true}, group());
          }
        }, 
        
        function finished() {
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
                      test.done();
                    });
                  });
                });
              });
            });
          });
        }
      )      
    });
  },
  
  shouldCorrectlyHandleLimitSkipChainingInline : function(test) {
    client.createCollection('test_limit_skip_chaining_inline', function(err, collection) {
      Step(
        function insert() {
          var group = this.group();

          for(var i = 0; i < 10; i++) {
            collection.insert({'x':1}, {safe:true}, group());
          }
        }, 
        
        function finished() {
          collection.find(function(err, cursor) {
            cursor.toArray(function(err, items) {
              test.equal(10, items.length);

              collection.find(function(err, cursor) {
                cursor.limit(5).skip(3).toArray(function(err, items2) {
                  test.equal(5, items2.length);

                  // Check that we have the same elements
                  var numberEqual = 0;
                  var sliced = items.slice(3, 8);

                  for(var i = 0; i < sliced.length; i++) {
                    if(sliced[i].x == items2[i].x) numberEqual = numberEqual + 1;
                  }
                  test.equal(5, numberEqual);

                  // Let's close the db
                  test.done();
                });
              });
            });
          });
        }
      )
    });
  },
  
  shouldCloseCursorNoQuerySent : function(test) {
    client.createCollection('test_close_no_query_sent', function(err, collection) {
      collection.find(function(err, cursor) {
        cursor.close(function(err, cursor) {
          test.equal(true, cursor.isClosed());
          // Let's close the db
          test.done();
        });
      });
    });
  },
  
  shouldCorrectlyRefillViaGetMoreCommand : function(test) {
    client.createCollection('test_refill_via_get_more', function(err, collection) {
      Step(
        function insert() {
          var group = this.group();

          for(var i = 0; i < 1000; i++) { 
            collection.save({'a': i}, {safe:true}, group()); 
          }
        }, 
        
        function finished() {
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
                          test.done();
                        });
                      }
                    });
                  });
                });
              }
            });
          });
        }
      )      
    });
  },
  
  shouldCorrectlyRefillViaGetMoreAlternativeCollection : function(test) {
    client.createCollection('test_refill_via_get_more_alt_coll', function(err, collection) {

      Step(
        function insert() {
          var group = this.group();

          for(var i = 0; i < 1000; i++) { 
            collection.save({'a': i}, {safe:true}, group()); 
          }
        }, 
        
        function finished() {
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
                          test.done();
                        });
                      }
                    });
                  });
                });
              }
            });
          });
        }
      )
    });
  },
  
  shouldCloseCursorAfterQueryHasBeenSent : function(test) {
    client.createCollection('test_close_after_query_sent', function(err, collection) {
      collection.insert({'a':1}, {safe:true}, function(err, r) {
        collection.find({'a':1}, function(err, cursor) {
          cursor.nextObject(function(err, item) {
            cursor.close(function(err, cursor) {
              test.equal(true, cursor.isClosed());
              // Let's close the db
              test.done();
            })
          });
        });        
      });
    });
  },    
  
  shouldCorrectlyExecuteCursorCountWithFields : function(test) {
    client.createCollection('test_count_with_fields', function(err, collection) {
      collection.save({'x':1, 'a':2}, {safe:true}, function(err, doc) {
        collection.find({}, {'fields':['a']}).toArray(function(err, items) {
          test.equal(1, items.length);
          test.equal(2, items[0].a);
          test.equal(null, items[0].x);
        });
  
        collection.findOne({}, {'fields':['a']}, function(err, item) {
          test.equal(2, item.a);
          test.equal(null, item.x);
          test.done();
        });
      });
    });
  },

  shouldCorrectlyCountWithFieldsUsingExclude : function(test) {
    client.createCollection('test_count_with_fields_using_exclude', function(err, collection) {
      collection.save({'x':1, 'a':2}, {safe:true}, function(err, doc) {
        collection.find({}, {'fields':{'x':0}}).toArray(function(err, items) {
          test.equal(1, items.length);
          test.equal(2, items[0].a);
          test.equal(null, items[0].x);            
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