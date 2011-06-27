var noReplicasetStart = process.env['NO_REPLICASET_START'] != null ? true : false;

var testCase = require('../../deps/nodeunit').testCase,
  debug = require('util').debug
  inspect = require('util').inspect,
  ReplicaSetManager = require('../tools/replica_set_manager').ReplicaSetManager,
  Db = require('../../lib/mongodb').Db,
  ReplSetServers = require('../../lib/mongodb').ReplSetServers,
  Server = require('../../lib/mongodb').Server;

// Keep instance of ReplicaSetManager
var serversUp = false;
var retries = 120;

var ensureConnection = function(test, numberOfTries, callback) {
  // Replica configuration
  var replSet = new ReplSetServers( [ 
      new Server( RS.host, RS.ports[1], { auto_reconnect: true } ),
      new Server( RS.host, RS.ports[0], { auto_reconnect: true } ),
      new Server( RS.host, RS.ports[2], { auto_reconnect: true } )
    ], 
    {rs_name:RS.name}
  );
  
  if(numberOfTries <= 0) return callback(new Error("could not connect correctly"), null);

  var db = new Db('integration_test_', replSet);
  db.open(function(err, p_db) {
    if(err != null) {
      db.close();
      // Wait for a sec and retry
      setTimeout(function() {
        numberOfTries = numberOfTries - 1;
        ensureConnection(test, numberOfTries, callback);
      }, 1000);
    } else {
      return callback(null, p_db);
    }    
  })            
}

module.exports = testCase({
  setUp: function(callback) {
    // Create instance of replicaset manager but only for the first call
    if(!serversUp && !noReplicasetStart) {
      serversUp = true;
      RS = new ReplicaSetManager();
      RS.startSet(true, function(err, result) {      
        if(err != null) throw err;
        // Finish setup
        callback();      
      });      
    } else {
      RS.restartKilledNodes(function(err, result) {
        if(err != null) throw err;
        callback();        
      })
    }
  },
  
  tearDown: function(callback) {
    RS.restartKilledNodes(function(err, result) {
      if(err != null) throw err;
      callback();        
    })
  },

  shouldRetrieveCorrectCountAfterInsertionReconnect : function(test) {
    // debug("=========================================== shouldRetrieveCorrectCountAfterInsertionReconnect")
    // Replica configuration
    var replSet = new ReplSetServers( [ 
        new Server( RS.host, RS.ports[1], { auto_reconnect: true } ),
        new Server( RS.host, RS.ports[0], { auto_reconnect: true } ),
        new Server( RS.host, RS.ports[2], { auto_reconnect: true } )
      ], 
      {rs_name:RS.name}
    );

    // Insert some data
    var db = new Db('integration_test_', replSet);
    db.open(function(err, p_db) {
      // debug("====================================================== 1")
      if(err != null) debug("shouldRetrieveCorrectCountAfterInsertionReconnect :: " + inspect(err));
      // Drop collection on replicaset
      p_db.dropCollection('testsets', function(err, r) {
        // debug("====================================================== 2")
        if(err != null) debug("shouldRetrieveCorrectCountAfterInsertionReconnect :: " + inspect(err));

        // Recreate collection on replicaset
        p_db.createCollection('testsets', function(err, collection) {
          // debug("====================================================== 3")
          if(err != null) debug("shouldRetrieveCorrectCountAfterInsertionReconnect :: " + inspect(err));
          
          // Insert a dummy document
          collection.insert({a:20}, {safe: {w:2, wtimeout: 10000}}, function(err, r) {
            // debug("====================================================== 4")
            if(err != null) debug("shouldRetrieveCorrectCountAfterInsertionReconnect :: " + inspect(err));
            
            // Execute a count
            collection.count(function(err, c) {
              // debug("====================================================== 5")
              if(err != null) debug("shouldRetrieveCorrectCountAfterInsertionReconnect :: " + inspect(err));

              test.equal(1, c);
              // Close starting connection
              p_db.close();
              
              // Ensure replication happened in time
              setTimeout(function() {
                // Kill the primary
                RS.killPrimary(function(node) {
                  // debug("====================================================== 6")

                  // Ensure valid connection
                  // Do inserts
                  ensureConnection(test, retries, function(err, p_db) {
                    // debug("====================================================== 7")
                    if(err != null) debug("shouldRetrieveCorrectCountAfterInsertionReconnect :: " + inspect(err));

                    test.ok(err == null);
                    test.equal(true, p_db.serverConfig.isConnected());

                    p_db.collection('testsets', function(err, collection) {
                      // debug("====================================================== 8")
                      if(err != null) debug("shouldRetrieveCorrectCountAfterInsertionReconnect :: " + inspect(err));

                      collection.insert({a:30}, {safe:true}, function(err, r) {  
                        // debug("====================================================== 9")
                        if(err != null) debug("shouldRetrieveCorrectCountAfterInsertionReconnect :: " + inspect(err));

                        collection.insert({a:40}, {safe:true}, function(err, r) {
                          // debug("====================================================== 10")
                          if(err != null) debug("shouldRetrieveCorrectCountAfterInsertionReconnect :: " + inspect(err));

                          // Execute count
                          collection.count(function(err, c) {
                            // debug("====================================================== 11")
                            if(err != null) debug("shouldRetrieveCorrectCountAfterInsertionReconnect :: " + inspect(err));

                            test.equal(3, c);

                            p_db.close();
                            test.done();          
                          });
                        });
                      });
                    });
                  });        
                });              
              }, 2000);
            })
          })
        });
      });
    })                
  }
})

















