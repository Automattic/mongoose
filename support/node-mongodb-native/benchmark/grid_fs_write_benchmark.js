require.paths.unshift('../lib');

var Db = require('mongodb').Db,
  Server = require('mongodb').Server,
  ObjectID = require('mongodb').ObjectID,
  Cursor = require('mongodb').Cursor,
  Collection = require('mongodb').Collection,
  Buffer = require('buffer').Buffer,
  GridStore = require('mongodb').GridStore,
  sys = require('util');

var simulated_buffer = new Buffer(1024*1000*10).toString();

new Db('grid_fs_write_benchmark', new Server("127.0.0.1", 27017, {auto_reconnect: true}), {}).open(function(err, new_client) {
  new_client.dropDatabase(function(err, result) {
    new_client.close();

    for(var i = 0; i < 1; i++) {
      new Db('grid_fs_write_benchmark', new Server("127.0.0.1", 27017, {auto_reconnect: true}), {}).open(function(err, client) {
        var gridStore = new GridStore(client, "foobar" + i, "w");
        gridStore.open(function(err, gridStore) {    
          gridStore.write(simulated_buffer.toString(), function(err, gridStore) {
            // sys.puts("========================== wrote file: " + "foobar" + i);              
            gridStore.close(function(err, result) {
              client.close();
              // sys.puts("========================== close file: " + "foobar" + i);              
            });
          });
        });    
        // write_files.push(writeFile)        
      });    
    }
  })  
});
