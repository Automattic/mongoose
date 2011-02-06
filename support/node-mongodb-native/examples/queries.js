GLOBAL.DEBUG = true;

sys = require("sys");
test = require("assert");

var Db = require('../lib/mongodb').Db,
  Connection = require('../lib/mongodb').Connection,
    Server = require('../lib/mongodb').Server,
  // BSON = require('../lib/mongodb').BSONPure;
  BSON = require('../lib/mongodb').BSONNative;

var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
var port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : Connection.DEFAULT_PORT;



sys.puts("Connecting to " + host + ":" + port);

var db = new Db('node-mongo-examples', new Server(host, port, {}), {native_parser:true});
db.open(function(err, db) {
  db.dropDatabase(function() {
    // Fetch the collection test
    db.collection('test', function(err, collection) {
      // Remove all records in collection if any
      collection.remove(function(err, collection) {
        // Insert three records
        collection.insert([{'a':1}, {'a':2}, {'b':3}], function(docs) {
          // Count the number of records
          collection.count(function(err, count) {
            sys.puts("There are " + count + " records.");
          });
          
          // Find all records. find() returns a cursor
          collection.find(function(err, cursor) {
            // Print each row, each document has an _id field added on insert
            // to override the basic behaviour implement a primary key factory
            // that provides a 12 byte value
            sys.puts("Printing docs from Cursor Each")
            cursor.each(function(err, doc) {
              if(doc != null) sys.puts("Doc from Each " + sys.inspect(doc));
            })                    
          });
          // Cursor has an to array method that reads in all the records to memory
          collection.find(function(err, cursor) {
            cursor.toArray(function(err, docs) {
              sys.puts("Printing docs from Array")
              docs.forEach(function(doc) {
                sys.puts("Doc from Array " + sys.inspect(doc));
              });
            });
          });
          
          // Different methods to access records (no printing of the results)
          
          // Locate specific document by key
          collection.find({'a':1}, function(err, cursor) {
            cursor.nextObject(function(err, doc) {            
              sys.puts("Returned #1 documents");
            });
          });
          
          // Find records sort by 'a', skip 1, limit 2 records
          // Sort can be a single name, array, associate array or ordered hash
          collection.find({}, {'skip':1, 'limit':1, 'sort':'a'}, function(err, cursor) {
            cursor.toArray(function(err, docs) {            
              sys.puts("Returned #" + docs.length + " documents");
            })          
          });
          
          // Find all records with 'a' > 1, you can also use $lt, $gte or $lte
          collection.find({'a':{'$gt':1}}, function(err, cursor) {
            cursor.toArray(function(err, docs) {
              sys.puts("Returned #" + docs.length + " documents");
            });
          });
          
          collection.find({'a':{'$gt':1, '$lte':3}}, function(err, cursor) {
            cursor.toArray(function(err, docs) {
              sys.puts("Returned #" + docs.length + " documents");
            });          
          });
          
          // Find all records with 'a' in a set of values
          collection.find({'a':{'$in':[1,2]}}, function(err, cursor) {
            cursor.toArray(function(err, docs) {
              sys.puts("Returned #" + docs.length + " documents");
            });          
          });
          
          // Find by regexp
          collection.find({'a':/[1|2]/}, function(err, cursor) {
            cursor.toArray(function(err, docs) {
              sys.puts("Returned #" + docs.length + " documents");
            });          
          });

          // Print Query explanation
          collection.find({'a':/[1|2]/}, function(err, cursor) {
            cursor.explain(function(err, doc) {
              sys.puts("-------------------------- Explanation");
              sys.puts(sys.inspect(doc));
            })
          });

          // Use a hint with a query, hint's can also be store in the collection
          // and will be applied to each query done through the collection.
          // Hint's can also be specified by query which will override the 
          // hint's associated with the collection
          collection.createIndex('a', function(err, indexName) {
            collection.hint = 'a';

            // You will see a different explanation now that the hint was set
            collection.find({'a':/[1|2]/}, function(err, cursor) {
              cursor.explain(function(err, doc) {
                sys.puts("-------------------------- Explanation");
                sys.puts(sys.inspect(doc));
              })
            });

            collection.find({'a':/[1|2]/}, {'hint':'a'}, function(err, cursor) {
              cursor.explain(function(err, doc) {
                sys.puts("-------------------------- Explanation");
                sys.puts(sys.inspect(doc));
                db.close();
              })
            });
          });    
        });
      });
    });    
  });
});
