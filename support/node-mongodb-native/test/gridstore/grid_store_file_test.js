var mongodb = process.env['TEST_NATIVE'] != null ? require('../../lib/mongodb').native() : require('../../lib/mongodb').pure();

var testCase = require('../../deps/nodeunit').testCase,
  debug = require('util').debug
  inspect = require('util').inspect,
  nodeunit = require('../../deps/nodeunit'),
  Db = mongodb.Db,
  Cursor = mongodb.Cursor,
  Collection = mongodb.Collection,
  GridStore = mongodb.GridStore,
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

  shouldCorrectlyWriteASmallPayload : function(test) {
    var gridStore = new GridStore(client, "test_gs_small_write", "w");
    gridStore.open(function(err, gridStore) {
      gridStore.write("hello world!", function(err, gridStore) {
        gridStore.close(function(err, result) {
          client.collection('fs.files', function(err, collection) {
            collection.find({'filename':'test_gs_small_write'}, function(err, cursor) {
              cursor.toArray(function(err, items) {
                test.equal(1, items.length);
                var item = items[0];
                test.ok(item._id instanceof client.bson_serializer.ObjectID || Object.prototype.toString.call(item._id) === '[object ObjectID]');
  
                client.collection('fs.chunks', function(err, collection) {
                  collection.find({'files_id':item._id}, function(err, cursor) {
                    cursor.toArray(function(err, items) {
                      test.equal(1, items.length);
                      test.done();
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
  
  shouldCorrectlyWriteSmallFileUsingABuffer : function(test) {
    var gridStore = new GridStore(client, "test_gs_small_write_with_buffer", "w");
    gridStore.open(function(err, gridStore) {
      var data = new Buffer("hello world", "utf8");
    
      gridStore.writeBuffer(data, function(err, gridStore) {
        gridStore.close(function(err, result) {
          client.collection('fs.files', function(err, collection) {
            collection.find({'filename':'test_gs_small_write_with_buffer'}, function(err, cursor) {
              cursor.toArray(function(err, items) {
                test.equal(1, items.length);
                var item = items[0];
                test.ok(item._id instanceof client.bson_serializer.ObjectID || Object.prototype.toString.call(item._id) === '[object ObjectID]');
  
                client.collection('fs.chunks', function(err, collection) {
                  collection.find({'files_id':item._id}, function(err, cursor) {
                    cursor.toArray(function(err, items) {
                      test.equal(1, items.length);
                      test.done();
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
  
  shouldSaveSmallFileToGridStore : function(test) {
    var gridStore = new GridStore(client, "test_gs_small_file", "w");
    gridStore.open(function(err, gridStore) {
      gridStore.write("hello world!", function(err, gridStore) {
        gridStore.close(function(err, result) {
          client.collection('fs.files', function(err, collection) {
            collection.find({'filename':'test_gs_small_file'}, function(err, cursor) {
              cursor.toArray(function(err, items) {
                test.equal(1, items.length);
  
                // Read test of the file
                GridStore.read(client, 'test_gs_small_file', function(err, data) {
                  test.equal('hello world!', data);
                  test.done();
                });
              });
            });
          });
        });
      });
    });
  },
  
  shouldCorrectlyOverwriteFile : function(test) {
    var gridStore = new GridStore(client, "test_gs_overwrite", "w");
    gridStore.open(function(err, gridStore) {
      gridStore.write("hello world!", function(err, gridStore) {
        gridStore.close(function(err, result) {
          var gridStore2 = new GridStore(client, "test_gs_overwrite", "w");
          gridStore2.open(function(err, gridStore) {
            gridStore2.write("overwrite", function(err, gridStore) {
              gridStore2.close(function(err, result) {
  
                // Assert that we have overwriten the data
                GridStore.read(client, 'test_gs_overwrite', function(err, data) {
                  test.equal('overwrite', data);
                  test.done();
                });
              });
            });
          });
        });
      });
    });
  },
  
  shouldCorrectlySeekWithBuffer : function(test) {
    var gridStore = new GridStore(client, "test_gs_seek_with_buffer", "w");
    gridStore.open(function(err, gridStore) {
      var data = new Buffer("hello, world!", "utf8");
      gridStore.writeBuffer(data, function(err, gridStore) {
        gridStore.close(function(result) {
          var gridStore2 = new GridStore(client, "test_gs_seek_with_buffer", "r");
          gridStore2.open(function(err, gridStore) {
            gridStore.seek(0, function(err, gridStore) {
              gridStore.getc(function(err, chr) {
                test.equal('h', chr);
              });
            });
          });
  
          var gridStore3 = new GridStore(client, "test_gs_seek_with_buffer", "r");
          gridStore3.open(function(err, gridStore) {
            gridStore.seek(7, function(err, gridStore) {
              gridStore.getc(function(err, chr) {
                test.equal('w', chr);
              });
            });
          });
  
          var gridStore4 = new GridStore(client, "test_gs_seek_with_buffer", "r");
          gridStore4.open(function(err, gridStore) {
            gridStore.seek(4, function(err, gridStore) {
              gridStore.getc(function(err, chr) {
                test.equal('o', chr);
              });
            });
          });
  
          var gridStore5 = new GridStore(client, "test_gs_seek_with_buffer", "r");
          gridStore5.open(function(err, gridStore) {
            gridStore.seek(-1, GridStore.IO_SEEK_END, function(err, gridStore) {
              gridStore.getc(function(err, chr) {
                test.equal('!', chr);
              });
            });
          });
  
          var gridStore6 = new GridStore(client, "test_gs_seek_with_buffer", "r");
          gridStore6.open(function(err, gridStore) {
            gridStore.seek(-6, GridStore.IO_SEEK_END, function(err, gridStore) {
              gridStore.getc(function(err, chr) {
                test.equal('w', chr);
              });
            });
          });
  
          var gridStore7 = new GridStore(client, "test_gs_seek_with_buffer", "r");
          gridStore7.open(function(err, gridStore) {
            gridStore.seek(7, GridStore.IO_SEEK_CUR, function(err, gridStore) {
              gridStore.getc(function(err, chr) {
                test.equal('w', chr);
  
                gridStore.seek(-1, GridStore.IO_SEEK_CUR, function(err, gridStore) {
                  gridStore.getc(function(err, chr) {
                    test.equal('w', chr);
  
                    gridStore.seek(-4, GridStore.IO_SEEK_CUR, function(err, gridStore) {
                      gridStore.getc(function(err, chr) {
                        test.equal('o', chr);
  
                        gridStore.seek(3, GridStore.IO_SEEK_CUR, function(err, gridStore) {
                          gridStore.getc(function(err, chr) {
                            test.equal('o', chr);
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
  
  shouldCorrectlySeekWithString : function(test) {
    var gridStore = new GridStore(client, "test_gs_seek", "w");
    gridStore.open(function(err, gridStore) {
      gridStore.write("hello, world!", function(err, gridStore) {
        gridStore.close(function(result) {
          var gridStore2 = new GridStore(client, "test_gs_seek", "r");
          gridStore2.open(function(err, gridStore) {
            gridStore.seek(0, function(err, gridStore) {
              gridStore.getc(function(err, chr) {
                test.equal('h', chr);
              });
            });
          });
  
          var gridStore3 = new GridStore(client, "test_gs_seek", "r");
          gridStore3.open(function(err, gridStore) {
            gridStore.seek(7, function(err, gridStore) {
              gridStore.getc(function(err, chr) {
                test.equal('w', chr);
              });
            });
          });
  
          var gridStore4 = new GridStore(client, "test_gs_seek", "r");
          gridStore4.open(function(err, gridStore) {
            gridStore.seek(4, function(err, gridStore) {
              gridStore.getc(function(err, chr) {
                test.equal('o', chr);
              });
            });
          });
  
          var gridStore5 = new GridStore(client, "test_gs_seek", "r");
          gridStore5.open(function(err, gridStore) {
            gridStore.seek(-1, GridStore.IO_SEEK_END, function(err, gridStore) {
              gridStore.getc(function(err, chr) {
                test.equal('!', chr);
              });
            });
          });
  
          var gridStore6 = new GridStore(client, "test_gs_seek", "r");
          gridStore6.open(function(err, gridStore) {
            gridStore.seek(-6, GridStore.IO_SEEK_END, function(err, gridStore) {
              gridStore.getc(function(err, chr) {
                test.equal('w', chr);
              });
            });
          });
  
          var gridStore7 = new GridStore(client, "test_gs_seek", "r");
          gridStore7.open(function(err, gridStore) {
            gridStore.seek(7, GridStore.IO_SEEK_CUR, function(err, gridStore) {
              gridStore.getc(function(err, chr) {
                test.equal('w', chr);
  
                gridStore.seek(-1, GridStore.IO_SEEK_CUR, function(err, gridStore) {
                  gridStore.getc(function(err, chr) {
                    test.equal('w', chr);
  
                    gridStore.seek(-4, GridStore.IO_SEEK_CUR, function(err, gridStore) {
                      gridStore.getc(function(err, chr) {
                        test.equal('o', chr);
  
                        gridStore.seek(3, GridStore.IO_SEEK_CUR, function(err, gridStore) {
                          gridStore.getc(function(err, chr) {
                            test.equal('o', chr);
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
  
  shouldCorrectlyAppendToFile : function(test) {
    var fs_client = new Db(MONGODB, new Server("127.0.0.1", 27017, {auto_reconnect: false}), {native_parser: (process.env['TEST_NATIVE'] != null)});
    fs_client.bson_deserializer = client.bson_deserializer;
    fs_client.bson_serializer = client.bson_serializer;
    fs_client.pkFactory = client.pkFactory;
  
    fs_client.open(function(err, fs_client) {
      fs_client.dropDatabase(function(err, done) {
        var gridStore = new GridStore(fs_client, "test_gs_append", "w");
        gridStore.open(function(err, gridStore) {
          gridStore.write("hello, world!", function(err, gridStore) {
            gridStore.close(function(err, result) {
  
              var gridStore2 = new GridStore(fs_client, "test_gs_append", "w+");
              gridStore2.open(function(err, gridStore) {
                gridStore.write(" how are you?", function(err, gridStore) {
                  gridStore.close(function(err, result) {
  
                    fs_client.collection('fs.chunks', function(err, collection) {
                      collection.count(function(err, count) {
                        test.equal(1, count);
  
                        GridStore.read(fs_client, 'test_gs_append', function(err, data) {
                          test.equal("hello, world! how are you?", data);
                          
                          fs_client.close();
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
  },
  
  shouldCorrectlyRewingAndTruncateOnWrite : function(test) {
    var gridStore = new GridStore(client, "test_gs_rewind_and_truncate_on_write", "w");
    gridStore.open(function(err, gridStore) {
      gridStore.write("hello, world!", function(err, gridStore) {
        gridStore.close(function(err, result) {

          var gridStore2 = new GridStore(client, "test_gs_rewind_and_truncate_on_write", "w");
          gridStore2.open(function(err, gridStore) {
            gridStore.write('some text is inserted here', function(err, gridStore) {
              gridStore.rewind(function(err, gridStore) {
                gridStore.write('abc', function(err, gridStore) {
                  gridStore.close(function(err, result) {

                    GridStore.read(client, 'test_gs_rewind_and_truncate_on_write', function(err, data) {
                      test.equal("abc", data);
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
  
  shouldCorrectlyExecuteGridstoreTell : function(test) {
    var gridStore = new GridStore(client, "test_gs_tell", "w");
    gridStore.open(function(err, gridStore) {
      gridStore.write("hello, world!", function(err, gridStore) {
        gridStore.close(function(err, result) {
          var gridStore2 = new GridStore(client, "test_gs_tell", "r");
          gridStore2.open(function(err, gridStore) {
            gridStore.read(5, function(err, data) {
              test.equal("hello", data);
  
              gridStore.tell(function(err, position) {
                test.equal(5, position);
                test.done();
              })
            });
          });
        });
      });
    });
  },
  
  shouldCorrectlySaveEmptyFile : function(test) {
    var fs_client = new Db(MONGODB, new Server("127.0.0.1", 27017, {auto_reconnect: false}), {native_parser: (process.env['TEST_NATIVE'] != null)});
    fs_client.bson_deserializer = client.bson_deserializer;
    fs_client.bson_serializer = client.bson_serializer;
    fs_client.pkFactory = client.pkFactory;
  
    fs_client.open(function(err, fs_client) {
      fs_client.dropDatabase(function(err, done) {
        var gridStore = new GridStore(fs_client, "test_gs_save_empty_file", "w");
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
                    
                  fs_client.close();
                  test.done();
                });
              });
            });
          });
        });
      });
    });
  },  
  
  shouldCorrectlyDetectEOF : function(test) {
    var gridStore = new GridStore(client, 'test_gs_empty_file_eof', "w");
    gridStore.open(function(err, gridStore) {
      gridStore.close(function(err, gridStore) {
        var gridStore2 = new GridStore(client, 'test_gs_empty_file_eof', "r");
        gridStore2.open(function(err, gridStore) {
          test.equal(true, gridStore.eof());
          test.done();
        })
      });
    });
  },
  
  shouldEnsureThatChunkSizeCannotBeChangedDuringRead : function(test) {
    var gridStore = new GridStore(client, "test_gs_cannot_change_chunk_size_on_read", "w");
    gridStore.open(function(err, gridStore) {
      gridStore.write("hello, world!", function(err, gridStore) {
        gridStore.close(function(err, result) {
  
          var gridStore2 = new GridStore(client, "test_gs_cannot_change_chunk_size_on_read", "r");
          gridStore2.open(function(err, gridStore) {
            gridStore.chunkSize = 42;
            test.equal(Chunk.DEFAULT_CHUNK_SIZE, gridStore.chunkSize);
            test.done();
          });
        });
      });
    });
  },
  
  shouldEnsureChunkSizeCannotChangeAfterDataHasBeenWritten : function(test) {
    var gridStore = new GridStore(client, "test_gs_cannot_change_chunk_size_after_data_written", "w");
    gridStore.open(function(err, gridStore) {
      gridStore.write("hello, world!", function(err, gridStore) {
        gridStore.chunkSize = 42;
        test.equal(Chunk.DEFAULT_CHUNK_SIZE, gridStore.chunkSize);
        test.done();
      });
    });
  },
  
  // checks if 8 bit values will be preserved in gridstore
  shouldCorrectlyStore8bitValues : function(test) {
    var gridStore = new GridStore(client, "test_gs_check_high_bits", "w");
    var data = new Buffer(255);
    for(var i=0; i<255; i++){
        data[i] = i;
    }
  
    gridStore.open(function(err, gridStore) {
      gridStore.write(data, function(err, gridStore) {
        gridStore.close(function(err, result) {
          // Assert that we have overwriten the data
          GridStore.read(client, 'test_gs_check_high_bits', function(err, fileData) {
            // change testvalue into a string like "0,1,2,...,255"
            test.equal(Array.prototype.join.call(data),
                    Array.prototype.join.call(new Buffer(fileData, "binary")));
            test.done();
          });
        });
      });
    });
  },
  
  shouldAllowChangingChunkSize : function(test) {
    var gridStore = new GridStore(client, "test_change_chunk_size", "w");
    gridStore.open(function(err, gridStore) {
      gridStore.chunkSize = 42
  
      gridStore.write('foo', function(err, gridStore) {
        gridStore.close(function(err, result) {
          var gridStore2 = new GridStore(client, "test_change_chunk_size", "r");
          gridStore2.open(function(err, gridStore) {
            test.equal(42, gridStore.chunkSize);
            test.done();
          });
        });
      });
    });
  },
  
  shouldAllowChangingChunkSizeAtCreationOfGridStore : function(test) {
    var gridStore = new GridStore(client, "test_change_chunk_size", "w", {'chunk_size':42});
    gridStore.open(function(err, gridStore) {
      gridStore.write('foo', function(err, gridStore) {
        gridStore.close(function(err, result) {
          var gridStore2 = new GridStore(client, "test_change_chunk_size", "r");
          gridStore2.open(function(err, gridStore) {
            test.equal(42, gridStore.chunkSize);
            test.done();
          });
        });
      });
    });
  },
  
  shouldCorrectlyCalculateMD5 : function(test) {
    var gridStore = new GridStore(client, "new-file", "w");
    gridStore.open(function(err, gridStore) {
      gridStore.write('hello world\n', function(err, gridStore) {
        gridStore.close(function(err, result) {
          var gridStore2 = new GridStore(client, "new-file", "r");
          gridStore2.open(function(err, gridStore) {
            test.equal("6f5902ac237024bdd0c176cb93063dc4", gridStore.md5);
            gridStore.md5 = "can't do this";
            test.equal("6f5902ac237024bdd0c176cb93063dc4", gridStore.md5);
  
            var gridStore2 = new GridStore(client, "new-file", "w");
            gridStore2.open(function(err, gridStore) {
              gridStore.close(function(err, result) {
                var gridStore3 = new GridStore(client, "new-file", "r");
                gridStore3.open(function(err, gridStore) {
                  test.equal("d41d8cd98f00b204e9800998ecf8427e", gridStore.md5);
                  test.done();
                });
              })
            })
          });
        });
      });
    });
  },
  
  shouldCorrectlyUpdateUploadDate : function(test) {
    var now = new Date();
    var originalFileUploadDate = null;
  
    var gridStore = new GridStore(client, "test_gs_upload_date", "w");
    gridStore.open(function(err, gridStore) {
      gridStore.write('hello world\n', function(err, gridStore) {
        gridStore.close(function(err, result) {
  
          var gridStore2 = new GridStore(client, "test_gs_upload_date", "r");
          gridStore2.open(function(err, gridStore) {
            test.ok(gridStore.uploadDate != null);
            originalFileUploadDate = gridStore.uploadDate;
  
            gridStore2.close(function(err, result) {
              var gridStore3 = new GridStore(client, "test_gs_upload_date", "w");
              gridStore3.open(function(err, gridStore) {
                gridStore3.write('new data', function(err, gridStore) {
                  gridStore3.close(function(err, result) {
                    var fileUploadDate = null;
  
                    var gridStore4 = new GridStore(client, "test_gs_upload_date", "r");
                    gridStore4.open(function(err, gridStore) {
                      test.equal(originalFileUploadDate.getTime(), gridStore.uploadDate.getTime());
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
  
  shouldCorrectlySaveContentType : function(test) {
    var ct = null;
  
    var gridStore = new GridStore(client, "test_gs_content_type", "w");
    gridStore.open(function(err, gridStore) {
      gridStore.write('hello world\n', function(err, gridStore) {
        gridStore.close(function(err, result) {
  
          var gridStore2 = new GridStore(client, "test_gs_content_type", "r");
          gridStore2.open(function(err, gridStore) {
            ct = gridStore.contentType;
            test.equal(GridStore.DEFAULT_CONTENT_TYPE, ct);
  
            var gridStore3 = new GridStore(client, "test_gs_content_type", "w+");
            gridStore3.open(function(err, gridStore) {
              gridStore.contentType = "text/html";
              gridStore.close(function(err, result) {
                var gridStore4 = new GridStore(client, "test_gs_content_type", "r");
                gridStore4.open(function(err, gridStore) {
                  test.equal("text/html", gridStore.contentType);
                  test.done();
                });
              })
            });
          });
        });
      });
    });
  },
  
  shouldCorrectlySaveContentTypeWhenPassedInAtGridStoreCreation : function(test) {
    var gridStore = new GridStore(client, "test_gs_content_type_option", "w", {'content_type':'image/jpg'});
    gridStore.open(function(err, gridStore) {
      gridStore.write('hello world\n', function(err, gridStore) {
        gridStore.close(function(result) {
  
          var gridStore2 = new GridStore(client, "test_gs_content_type_option", "r");
          gridStore2.open(function(err, gridStore) {
            test.equal('image/jpg', gridStore.contentType);
            test.done();
          });
        });
      });
    });
  },
  
  shouldCorrectlyReportIllegalMode : function(test) {
    var gridStore = new GridStore(client, "test_gs_unknown_mode", "x");
    gridStore.open(function(err, gridStore) {
      test.ok(err instanceof Error);
      test.equal("Illegal mode x", err.message);
      test.done();
    });
  },
  
  shouldCorrectlySaveAndRetrieveFileMetadata : function(test) {
    var gridStore = new GridStore(client, "test_gs_metadata", "w", {'content_type':'image/jpg'});
    gridStore.open(function(err, gridStore) {
      gridStore.write('hello world\n', function(err, gridStore) {
        gridStore.close(function(err, result) {
  
          var gridStore2 = new GridStore(client, "test_gs_metadata", "r");
          gridStore2.open(function(err, gridStore) {
            test.equal(null, gridStore.metadata);
  
            var gridStore3 = new GridStore(client, "test_gs_metadata", "w+");
            gridStore3.open(function(err, gridStore) {
              gridStore.metadata = {'a':1};
              gridStore.close(function(err, result) {
  
                var gridStore4 = new GridStore(client, "test_gs_metadata", "r");
                gridStore4.open(function(err, gridStore) {
                  test.equal(1, gridStore.metadata.a);
                  test.done();
                });
              });
            });
          });
        });
      });
    });
  },  
  
  shouldNotThrowErrorOnClose : function(test) {
    var gridStore = new GridStore(client, "test_gs_metadata", "w", {'content_type':'image/jpg'});
    gridStore.open(function(err, gridStore) {
      gridStore.write('hello world\n', function(err, gridStore) {
        gridStore.close(function(err, result) {
  
          var gridStore2 = new GridStore(client, "test_gs_metadata", "r");
          gridStore2.open(function(err, gridStore) {
            gridStore.close(function(err, fo) {
              test.ok(err == null);
              test.ok(fo == null);
              test.done();
            })
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