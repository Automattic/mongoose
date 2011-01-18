GLOBAL.DEBUG = true;

sys = require("sys");
test = require("mjsunit");

var mongo = require('../lib/mongodb');

var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
var port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : mongo.Connection.DEFAULT_PORT;

sys.puts(">> Connecting to " + host + ":" + port);
var db1 = new mongo.Db('node-mongo-examples', new mongo.Server(host, port, {}), {});
db1.open(function(err, db) {
  // Write a new file
  var gridStore = new mongo.GridStore(db, "foobar", "w");
  gridStore.open(function(err, gridStore) {    
    gridStore.write("hello world!", function(err, gridStore) {
      gridStore.close(function(err, result) {
        // Read the file and dump the contents
        dump(db, 'foobar');
  
        // Append more data
        gridStore = new mongo.GridStore(db, 'foobar', "w+");
        gridStore.open(function(err, gridStore) {
          gridStore.write('\n', function(err, gridStore) {
            gridStore.puts('line two', function(err, gridStore) {
              gridStore.close(function(err, result) {
                dump(db, 'foobar');          
  
                // Overwrite
                gridStore = new mongo.GridStore(db, 'foobar', "w");
                gridStore.open(function(err, gridStore) {
                  gridStore.write('hello, sailor!', function(err, gridStore) {
                    gridStore.close(function(err, result) {
                      dump(db, 'foobar', function() {
                        db.close();                        
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

var db2 = new mongo.Db('node-mongo-examples', new mongo.Server(host, port, {}), {});
db2.open(function(err, db) {
  // File existence tests
  var gridStore = new mongo.GridStore(db, "foobar2", "w");
  gridStore.open(function(err, gridStore) {    
    gridStore.write( 'hello sailor', function(err, gridStore) {
      gridStore.close(function(err, result) {
        mongo.GridStore.exist(db, 'foobar2', function(err, result) {
          sys.puts("File 'foobar2' exists: " + result);
        });
        
        mongo.GridStore.exist(db, 'does-not-exist', function(err, result) {
          sys.puts("File 'does-not-exist' exists: " + result);
        });
        
        // Read with offset(uses seek)
        mongo.GridStore.read(db, 'foobar2', 6, 7, function(err, data) {
          sys.puts(data);
        });

        // Rewind/seek/tell
        var gridStore2 = new mongo.GridStore(db, 'foobar2', 'w');
        gridStore2.open(function(err, gridStore) {
          gridStore.write('hello, world!', function(err, gridStore){});
          gridStore.rewind(function(){});
          gridStore.write('xyzzz', function(err, gridStore){});
          gridStore.tell(function(tell) {
            sys.puts("tell: " + tell);       // Should be 5
          });
          gridStore.seek(4, function(err, gridStore){});
          gridStore.write('y', function(){});
          gridStore.close(function() {
            dump(db, 'foobar2');

            // Unlink file (delete)
            mongo.GridStore.unlink(db, 'foobar2', function(err, gridStore) {
              mongo.GridStore.exist(db, 'foobar2', function(err, result) {
                sys.puts("File 'foobar2' exists: " + result);
                db.close();
              });
            });
          });
        });
      });
    });
  });
});

var db3 = new mongo.Db('node-mongo-examples', new mongo.Server(host, port, {}), {});
db3.open(function(err, db) {
  // Metadata
  var gridStore = new mongo.GridStore(db, "foobar3", "w");
  gridStore.open(function(err, gridStore) {    
    gridStore.write('hello, world!', function(err, gridStore){});
    gridStore.close(function(err, gridStore) {
      gridStore = new mongo.GridStore(db, 'foobar3', "r");
      gridStore.open(function(err, gridStore) {
        sys.puts("contentType: " + gridStore.contentType);
        sys.puts("uploadDate: " + gridStore.uploadDate);
        sys.puts("chunkSize: " + gridStore.chunkSize);
        sys.puts("metadata: " + gridStore.metadata);          
      });
      
      // Add some metadata
      gridStore = new mongo.GridStore(db, 'foobar3', "w+");
      gridStore.open(function(err, gridStore) {
        gridStore.contentType = 'text/xml';
        gridStore.metadata = {'a':1};
        gridStore.close(function(err, gridStore) {
          // Print the metadata
          gridStore = new mongo.GridStore(db, 'foobar3', "r");
          gridStore.open(function(err, gridStore) {
            sys.puts("contentType: " + gridStore.contentType);
            sys.puts("uploadDate: " + gridStore.uploadDate);
            sys.puts("chunkSize: " + gridStore.chunkSize);
            sys.puts("metadata: " + gridStore.metadata);          
            db.close();
          });            
        });
      });        
    });
  });
  
  // You can also set meta data when initially writing to a file
  // setting root means that the file and its chunks are stored in a different root
  // collection: instead of gridfs.files and gridfs.chunks, here we use
  // my_files.files and my_files.chunks      
  var gridStore = new mongo.GridStore(db, "foobar3", "w", {'content_type':'text/plain', 
    'metadata':{'a':1}, 'chunk_size': 1024*4, 'root':'my_files'});
  gridStore.open(function(err, gridStore) {    
    gridStore.write('hello, world!', function(err, gridStore){});
    gridStore.close(function() {
    });
  });
});

function dump(db, filename, callback) {
  mongo.GridStore.read(db, filename, function(err, data) {
    sys.puts(data);
    if(callback != null) callback();
  }); 
}