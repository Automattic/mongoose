require.paths.unshift('../lib');

var Db = require('mongodb').Db,
  Server = require('mongodb').Server,
  ObjectID = require('mongodb').ObjectID,
  Cursor = require('mongodb').Cursor,
  Collection = require('mongodb').Collection,
  sys = require('sys');

new Db('streaming_benchmark', new Server("127.0.0.1", 27017, {auto_reconnect: true}), {}).open(function(err, client) {
  client.collection('streaming_benchmark', function(err, collection) {
    collection.remove({}, function(err, result) {
      // Benchmark
      var started_at = new Date().getTime(); 
      // Add documents
      for(var i = 0; i < 100000; i++) {
        collection.save({'i':i, 'a':i, 'c':i, 'd':{'i':i}}, function(err, result){});
      }    
      sys.puts("save recs: " + ((new Date().getTime() - started_at)/1000) + "seconds"); 

      // Benchmark
      var started_at = new Date().getTime(); 
      var count = 0; 
      collection.find(function(err, cursor) { 
        var stream = cursor.streamRecords(function(er,item) {}); 
        stream.addListener('end', function() { 
          client.close(); 
        });
        stream.addListener('data',function(data){ 
          if(count == 0) started_at = new Date().getTime();           
          count++; 
          if ((count%10000)==0) sys.puts("recs:" + count + " :: " + 
            ((new Date().getTime() - started_at)/1000) + "seconds"); 
        }); 
      });          
    })
  })
});