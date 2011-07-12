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
// var MONGODB = 'ruby-test-db';
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
  
  // // Gridstore tests
  // shouldCorrectlyExecuteGridStoreExistsByObjectId : function(test) {
  //   var gridStore = new GridStore(client, null, "w");
  //   gridStore.open(function(err, gridStore) {
  //     gridStore.write("hello world!", function(err, gridStore) {
  //       gridStore.close(function(err, result) {          
  //         GridStore.exist(client, result._id, function(err, result) {
  //           test.equal(true, result);
  //         })
  // 
  //         GridStore.exist(client, new client.bson_serializer.ObjectID(), function(err, result) {
  //           test.equal(false, result);
  //         });
  //           
  //         GridStore.exist(client, new client.bson_serializer.ObjectID(), 'another_root', function(err, result) {
  //           test.equal(false, result);
  //           test.done();
  //         });
  //       });
  //     });
  //   });
  // },
  // 
  // shouldCorrectlySafeFileAndReadFileByObjectId : function(test) {
  //   var gridStore = new GridStore(client, null, "w");
  //   gridStore.open(function(err, gridStore) {
  //     gridStore.write("hello world!", function(err, gridStore) {
  //       gridStore.close(function(err, result) {          
  //         
  //         // Let's read the file using object Id
  //         GridStore.read(client, result._id, function(err, data) {
  //           test.equal('hello world!', data);
  //           test.done();
  //         });          
  //       });
  //     });
  //   });    
  // },
  // 
  // shouldCorrectlyExecuteGridStoreExists : function(test) {
  //   var gridStore = new GridStore(client, "foobar", "w");
  //   gridStore.open(function(err, gridStore) {
  //     gridStore.write("hello world!", function(err, gridStore) {
  //       gridStore.close(function(err, result) {          
  //         GridStore.exist(client, 'foobar', function(err, result) {
  //           test.equal(true, result);
  //         });
  // 
  //         GridStore.exist(client, 'does_not_exist', function(err, result) {
  //           test.equal(false, result);
  //         });
  // 
  //         GridStore.exist(client, 'foobar', 'another_root', function(err, result) {
  //           test.equal(false, result);
  //           test.done();
  //         });
  //       });
  //     });
  //   });
  // },
  // 
  // shouldCorrectlyExecuteGridStoreList : function(test) {
  //   var gridStore = new GridStore(client, "foobar2", "w");
  //   gridStore.open(function(err, gridStore) {
  //     gridStore.write("hello world!", function(err, gridStore) {
  //       gridStore.close(function(err, result) {
  //         GridStore.list(client, function(err, items) {
  //           var found = false;
  //           items.forEach(function(filename) {
  //             if(filename == 'foobar2') found = true;
  //           });
  // 
  //           test.ok(items.length >= 1);
  //           test.ok(found);
  //         });
  //         
  //         GridStore.list(client, {id:true}, function(err, items) {
  //           var found = false;
  //           items.forEach(function(id) {
  //             test.ok(typeof id == 'object');
  //           });
  // 
  //           test.ok(items.length >= 1);
  //         });          
  // 
  //         GridStore.list(client, 'fs', function(err, items) {
  //           var found = false;
  //           items.forEach(function(filename) {
  //             if(filename == 'foobar2') found = true;
  //           });
  // 
  //           test.ok(items.length >= 1);
  //           test.ok(found);
  //         });
  // 
  //         GridStore.list(client, 'my_fs', function(err, items) {
  //           var found = false;
  //           items.forEach(function(filename) {
  //             if(filename == 'foobar2') found = true;
  //           });
  // 
  //           test.ok(items.length >= 0);
  //           test.ok(!found);
  // 
  //           var gridStore2 = new GridStore(client, "foobar3", "w");
  //           gridStore2.open(function(err, gridStore) {
  //             gridStore2.write('my file', function(err, gridStore) {
  //               gridStore.close(function(err, result) {
  //                 GridStore.list(client, function(err, items) {
  //                   var found = false;
  //                   var found2 = false;
  //                   items.forEach(function(filename) {
  //                     if(filename == 'foobar2') found = true;
  //                     if(filename == 'foobar3') found2 = true;
  //                   });
  // 
  //                   test.ok(items.length >= 2);
  //                   test.ok(found);
  //                   test.ok(found2);
  //                   
  //                   test.done();
  //                 });
  //               });
  //             });
  //           });
  //         });
  //       });
  //     });
  //   });
  // },
  // 
  // shouldCorrectlyPeformGridStoreReadLength : function(test) {
  //   var gridStore = new GridStore(client, "test_gs_read_length", "w");
  //   gridStore.open(function(err, gridStore) {
  //     gridStore.write("hello world!", function(err, gridStore) {
  //       gridStore.close(function(err, result) {
  //         // Assert that we have overwriten the data
  //         GridStore.read(client, 'test_gs_read_length', 5, function(err, data) {
  //           test.equal('hello', data);
  //           test.done();
  //         });
  //       });
  //     });
  //   });
  // },
  
  shouldCorrectlyReadFromFileWithOffset : function(test) {
    var gridStore = new GridStore(client, "test_gs_read_with_offset", "w");
    gridStore.open(function(err, gridStore) {
      gridStore.write("hello, world!", function(err, gridStore) {
        gridStore.close(function(err, result) {
          // Assert that we have overwriten the data
          GridStore.read(client, 'test_gs_read_with_offset', 5, 7, function(err, data) {
            test.equal('world', data);
          });
  
          GridStore.read(client, 'test_gs_read_with_offset', null, 7, function(err, data) {
            test.equal('world!', data);
            test.done();
          });
        });
      });
    });
  },  
  
  shouldCorrectlyHandleMultipleChunkGridStore : function(test) {
    var fs_client = new Db(MONGODB, new Server("127.0.0.1", 27017, {auto_reconnect: false}), {native_parser: (process.env['TEST_NATIVE'] != null)});
    fs_client.bson_deserializer = client.bson_deserializer;
    fs_client.bson_serializer = client.bson_serializer;
    fs_client.pkFactory = client.pkFactory;
  
    fs_client.open(function(err, fs_client) {
      fs_client.dropDatabase(function(err, done) {
        var gridStore = new GridStore(fs_client, "test_gs_multi_chunk", "w");
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
  
                      GridStore.read(fs_client, 'test_gs_multi_chunk', function(err, data) {
                        test.equal(512*3, data.length);                        
                        fs_client.close();
                        
                        test.done();
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
  
  shouldCorrectlyReadlinesAndPutLines : function(test) {
    var gridStore = new GridStore(client, "test_gs_puts_and_readlines", "w");
    gridStore.open(function(err, gridStore) {
      gridStore.puts("line one", function(err, gridStore) {
        gridStore.puts("line two\n", function(err, gridStore) {
          gridStore.puts("line three", function(err, gridStore) {
            gridStore.close(function(err, result) {
              GridStore.readlines(client, 'test_gs_puts_and_readlines', function(err, lines) {
                test.deepEqual(["line one\n", "line two\n", "line three\n"], lines);
                test.done();
              });
            });
          });
        });
      });
    });
  },
  
  shouldCorrectlyHandleUnlinkingWeirdName : function(test) {
    var fs_client = new Db(MONGODB, new Server("127.0.0.1", 27017, {auto_reconnect: false}), {native_parser: (process.env['TEST_NATIVE'] != null)});
    fs_client.bson_deserializer = client.bson_deserializer;
    fs_client.bson_serializer = client.bson_serializer;
    fs_client.pkFactory = client.pkFactory;
  
    fs_client.open(function(err, fs_client) {
      fs_client.dropDatabase(function(err, done) {
        var gridStore = new GridStore(fs_client, "9476700.937375426_1271170118964-clipped.png", "w", {'root':'articles'});
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
                  GridStore.unlink(fs_client, '9476700.937375426_1271170118964-clipped.png', {'root':'articles'}, function(err, gridStore) {
                    fs_client.collection('articles.files', function(err, collection) {
                      collection.count(function(err, count) {
                        test.equal(0, count);
                      })
                    });
  
                    fs_client.collection('articles.chunks', function(err, collection) {
                      collection.count(function(err, count) {
                        test.equal(0, count);
  
                        fs_client.close();
                        test.done();
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
  
  shouldCorrectlyUnlink : function(test) {
    var fs_client = new Db(MONGODB, new Server("127.0.0.1", 27017, {auto_reconnect: false}), {native_parser: (process.env['TEST_NATIVE'] != null)});
    fs_client.bson_deserializer = client.bson_deserializer;
    fs_client.bson_serializer = client.bson_serializer;
    fs_client.pkFactory = client.pkFactory;
  
    fs_client.open(function(err, fs_client) {
      fs_client.dropDatabase(function(err, done) {
        var gridStore = new GridStore(fs_client, "test_gs_unlink", "w");
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
                  GridStore.unlink(fs_client, 'test_gs_unlink', function(err, gridStore) {
                    fs_client.collection('fs.files', function(err, collection) {
                      collection.count(function(err, count) {
                        test.equal(0, count);
                      })
                    });
  
                    fs_client.collection('fs.chunks', function(err, collection) {
                      collection.count(function(err, count) {
                        test.equal(0, count);
                          
                        fs_client.close();
                        test.done();
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
  
  shouldCorrectlyUnlinkAnArrayOfFiles : function(test) {
    var fs_client = new Db(MONGODB, new Server("127.0.0.1", 27017, {auto_reconnect: false}), {native_parser: (process.env['TEST_NATIVE'] != null)});
    fs_client.bson_deserializer = client.bson_deserializer;
    fs_client.bson_serializer = client.bson_serializer;
    fs_client.pkFactory = client.pkFactory;
  
    fs_client.open(function(err, fs_client) {
      fs_client.dropDatabase(function(err, done) {
        var gridStore = new GridStore(fs_client, "test_gs_unlink_as_array", "w");
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
                  GridStore.unlink(fs_client, ['test_gs_unlink_as_array'], function(err, gridStore) {
                    fs_client.collection('fs.files', function(err, collection) {
                      collection.count(function(err, count) {
                        test.equal(0, count);
                      })
                    });
  
                    fs_client.collection('fs.chunks', function(err, collection) {
                      collection.count(function(err, count) {
                        test.equal(0, count);
                        fs_client.close();
                        
                        test.done();
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
  
  shouldCorrectlyWriteFileToGridStore: function(test) {
    var gridStore = new GridStore(client, 'test_gs_writing_file', 'w');
    var fileSize = fs.statSync('./test/gridstore/test_gs_weird_bug.png').size;
    var data = fs.readFileSync('./test/gridstore/test_gs_weird_bug.png', 'binary');
    
    gridStore.open(function(err, gridStore) {
      gridStore.writeFile('./test/gridstore/test_gs_weird_bug.png', function(err, doc) {
        GridStore.read(client, 'test_gs_writing_file', function(err, fileData) {
          test.equal(data, fileData)
          test.equal(fileSize, fileData.length);
          
          // Ensure we have a md5
          var gridStore2 = new GridStore(client, 'test_gs_writing_file', 'r');
          gridStore2.open(function(err, gridStore2) {
            test.ok(gridStore2.md5 != null)            
            test.done();
          });          
        });
      });
    });
  },
  
  shouldCorrectlyWriteFileToGridStoreUsingObjectId: function(test) {
    var gridStore = new GridStore(client, null, 'w');
    var fileSize = fs.statSync('./test/gridstore/test_gs_weird_bug.png').size;
    var data = fs.readFileSync('./test/gridstore/test_gs_weird_bug.png', 'binary');
    
    gridStore.open(function(err, gridStore) {
      gridStore.writeFile('./test/gridstore/test_gs_weird_bug.png', function(err, doc) {
        
        GridStore.read(client, doc._id, function(err, fileData) {
          test.equal(data, fileData)
          test.equal(fileSize, fileData.length);
          
          // Ensure we have a md5
          var gridStore2 = new GridStore(client, doc._id, 'r');
          gridStore2.open(function(err, gridStore2) {
            test.ok(gridStore2.md5 != null)            
            test.done();
          });          
        });
      });
    });
  },
  
  shouldCorrectlyPerformWorkingFiledRead : function(test) {
    var gridStore = new GridStore(client, "test_gs_working_field_read", "w");
    var data = fs.readFileSync("./test/gridstore/test_gs_working_field_read.pdf", 'binary');
  
    gridStore.open(function(err, gridStore) {
      gridStore.write(data, function(err, gridStore) {
        gridStore.close(function(err, result) {
          // Assert that we have overwriten the data
          GridStore.read(client, 'test_gs_working_field_read', function(err, fileData) {
            test.equal(data.length, fileData.length);
            test.done();
          });
        });
      });
    });
  },   
  
  shouldCorrectlyReadAndWriteFile : function(test) {
    var gridStore = new GridStore(client, "test_gs_weird_bug", "w");
    var data = fs.readFileSync("./test/gridstore/test_gs_weird_bug.png", 'binary');
  
    gridStore.open(function(err, gridStore) {
      gridStore.write(data, function(err, gridStore) {
        gridStore.close(function(err, result) {
          // Assert that we have overwriten the data
          GridStore.read(client, 'test_gs_weird_bug', function(err, fileData) {
            test.equal(data.length, fileData.length);
            test.done();
          });
        });
      });
    });
  },  
  
  shouldCorrectlyReadAndWriteFileByObjectId : function(test) {
    var gridStore = new GridStore(client, null, "w");
    var data = fs.readFileSync("./test/gridstore/test_gs_weird_bug.png", 'binary');
  
    gridStore.open(function(err, gridStore) {
      gridStore.write(data, function(err, gridStore) {
        gridStore.close(function(err, result) {
  
          // Assert that we have overwriten the data
          GridStore.read(client, result._id, function(err, fileData) {
            test.equal(data.length, fileData.length);
            test.done();
          });
        });
      });
    });
  },  
  
  shouldCorrectlyWriteAndReadJpgImage : function(test) {
    var data = fs.readFileSync('./test/gridstore/iya_logo_final_bw.jpg').toString('binary');
    
    var gs = new GridStore(client, "test", "w");
    gs.open(function(err, gs) {
      gs.write(data, function(err, gs) {
        gs.close(function(err, gs) {
          
          // Open and read
          var gs2 = new GridStore(client, "test", "r");
          gs2.open(function(err, gs) {
            gs2.seek(0, function() {
              gs2.read(0, function(err, data2) {
                test.equal(data, data2);
                test.done();                          
              });
            });
          });
        });
      })
    })    
  },
  
  shouldCorrectlyReadAndWriteBuffersMultipleChunks : function(test) {
    var gridStore = new GridStore(client, null, 'w');
    // Force multiple chunks to be stored
    gridStore.chunkSize = 5000;
    var fileSize = fs.statSync('./test/gridstore/test_gs_weird_bug.png').size;
    var data = fs.readFileSync('./test/gridstore/test_gs_weird_bug.png');
    
    gridStore.open(function(err, gridStore) {
        
      // Write the file using writeBuffer
      gridStore.writeBuffer(data, function(err, doc) {
        gridStore.close(function(err, doc) {
  
          // Read the file using readBuffer
          new GridStore(client, doc._id, 'r').open(function(err, gridStore) {
            gridStore.readBuffer(function(err, data2) {
              test.equal(data.toString('base64'), data2.toString('base64'));
              test.done();            
            })
          });          
        });
      })        
    });
  },
  
  shouldCorrectlyReadAndWriteBuffersSingleChunks : function(test) {
    var gridStore = new GridStore(client, null, 'w');
    // Force multiple chunks to be stored
    var fileSize = fs.statSync('./test/gridstore/test_gs_weird_bug.png').size;
    var data = fs.readFileSync('./test/gridstore/test_gs_weird_bug.png');
    
    gridStore.open(function(err, gridStore) {
        
      // Write the file using writeBuffer
      gridStore.writeBuffer(data, function(err, doc) {
        gridStore.close(function(err, doc) {
  
          // Read the file using readBuffer
          new GridStore(client, doc._id, 'r').open(function(err, gridStore) {
            gridStore.readBuffer(function(err, data2) {
              test.equal(data.toString('base64'), data2.toString('base64'));
              test.done();            
            })
          });          
        });
      })        
    });
  },
  
  shouldCorrectlyReadAndWriteBuffersUsingNormalWriteWithMultipleChunks : function(test) {
    var gridStore = new GridStore(client, null, 'w');
    // Force multiple chunks to be stored
    gridStore.chunkSize = 5000;
    var fileSize = fs.statSync('./test/gridstore/test_gs_weird_bug.png').size;
    var data = fs.readFileSync('./test/gridstore/test_gs_weird_bug.png');
    
    gridStore.open(function(err, gridStore) {
        
      // Write the buffer using the .write method that should use writeBuffer correctly
      gridStore.write(data, function(err, doc) {
        gridStore.close(function(err, doc) {
  
          // Read the file using readBuffer
          new GridStore(client, doc._id, 'r').open(function(err, gridStore) {
            gridStore.readBuffer(function(err, data2) {
              test.equal(data.toString('base64'), data2.toString('base64'));
              test.done();            
            })
          });          
        });
      })        
    });
  },
  
  shouldCorrectlyReadAndWriteBuffersSingleChunksAndVerifyExistance : function(test) {
    var gridStore = new GridStore(client, null, 'w');
    // Force multiple chunks to be stored
    var fileSize = fs.statSync('./test/gridstore/test_gs_weird_bug.png').size;
    var data = fs.readFileSync('./test/gridstore/test_gs_weird_bug.png');
    
    gridStore.open(function(err, gridStore) {
        
      // Write the file using writeBuffer
      gridStore.writeBuffer(data, function(err, doc) {
        gridStore.close(function(err, doc) {
  
          // Read the file using readBuffer
          GridStore.exist(client, doc._id, function(err, result) {
            test.equal(null, err);
            test.equal(true, result);
  
            client.close();
            test.done();
          });          
        });
      })        
    });
  },  
  
  shouldCorrectlySaveDataByObjectID : function(test) {
    var id = new client.bson_serializer.ObjectID();
    var gridStore = new GridStore(client, id, 'w');
  
    gridStore.open(function(err, gridStore) {
      gridStore.write('bar', function(err, gridStore) {
        gridStore.close(function(err, result) {
  
          GridStore.exist(client, id, function(err, result) {
            test.equal(null, err);
            test.equal(true, result);
  
            client.close();
            test.done();
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