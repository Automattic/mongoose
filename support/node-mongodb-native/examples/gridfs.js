GLOBAL.DEBUG = true;

sys = require("sys");
test = require("assert");

var Db = require('../lib/mongodb').Db,
  Connection = require('../lib/mongodb').Connection,
  Server = require('../lib/mongodb').Server,
  GridStore = require('../lib/mongodb').GridStore,
  // BSON = require('../lib/mongodb').BSONPure;
  BSON = require('../lib/mongodb').BSONNative;

var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
var port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : Connection.DEFAULT_PORT;

sys.puts(">> Connecting to " + host + ":" + port);
var db1 = new Db('node-mongo-examples', new Server(host, port, {}), {native_parser:true});
db1.open(function(err, db) {
  // Write a new file
  var gridStore = new GridStore(db, "foobar", "w");
  gridStore.open(function(err, gridStore) {    
    gridStore.write("hello world!", function(err, gridStore) {
      gridStore.close(function(err, result) {
        // Read the file and dump the contents
        dump(db, 'foobar');
  
        // Append more data
        gridStore = new GridStore(db, 'foobar', "w+");
        gridStore.open(function(err, gridStore) {
          gridStore.write('\n', function(err, gridStore) {
            gridStore.puts('line two', function(err, gridStore) {
              gridStore.close(function(err, result) {
                dump(db, 'foobar');          
  
                // Overwrite
                gridStore = new GridStore(db, 'foobar', "w");
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

var db2 = new Db('node-mongo-examples', new Server(host, port, {}), {native_parser:true});
db2.open(function(err, db) {
  // File existence tests
  var gridStore = new GridStore(db, "foobar2", "w");
  gridStore.open(function(err, gridStore) {    
    gridStore.write( 'hello sailor', function(err, gridStore) {
      gridStore.close(function(err, result) {
        GridStore.exist(db, 'foobar2', function(err, result) {
          sys.puts("File 'foobar2' exists: " + result);
        });
        
        GridStore.exist(db, 'does-not-exist', function(err, result) {
          sys.puts("File 'does-not-exist' exists: " + result);
        });
        
        // Read with offset(uses seek)
        GridStore.read(db, 'foobar2', 6, 7, function(err, data) {
          sys.puts(data);
        });

        // Rewind/seek/tell
        var gridStore2 = new GridStore(db, 'foobar2', 'w');
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
            GridStore.unlink(db, 'foobar2', function(err, gridStore) {
              GridStore.exist(db, 'foobar2', function(err, result) {
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

var db3 = new Db('node-mongo-examples', new Server(host, port, {}), {native_parser:true});
db3.open(function(err, db) {
  // Metadata
  var gridStore = new GridStore(db, "foobar3", "w");
  gridStore.open(function(err, gridStore) {    
    gridStore.write('hello, world!', function(err, gridStore){});
    gridStore.close(function(err, gridStore) {
      gridStore = new GridStore(db, 'foobar3', "r");
      gridStore.open(function(err, gridStore) {
        sys.puts("contentType: " + gridStore.contentType);
        sys.puts("uploadDate: " + gridStore.uploadDate);
        sys.puts("chunkSize: " + gridStore.chunkSize);
        sys.puts("metadata: " + gridStore.metadata);          
      });
      
      // Add some metadata
      gridStore = new GridStore(db, 'foobar3', "w+");
      gridStore.open(function(err, gridStore) {
        gridStore.contentType = 'text/xml';
        gridStore.metadata = {'a':1};
        gridStore.close(function(err, gridStore) {
          // Print the metadata
          gridStore = new GridStore(db, 'foobar3', "r");
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
  var gridStore = new GridStore(db, "foobar3", "w", {'content_type':'text/plain', 
    'metadata':{'a':1}, 'chunk_size': 1024*4, 'root':'my_files'});
  gridStore.open(function(err, gridStore) {    
    gridStore.write('hello, world!', function(err, gridStore){});
    gridStore.close(function() {
    });
  });
});

function dump(db, filename, callback) {
  GridStore.read(db, filename, function(err, data) {
    sys.puts(data);
    if(callback != null) callback();
  }); 
}