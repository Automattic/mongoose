var noReplicasetStart = process.env['NO_REPLICASET_START'] != null ? true : false;

var testCase = require('../../deps/nodeunit').testCase,
  debug = require('util').debug
  inspect = require('util').inspect,
  ReplicaSetManager = require('../tools/replica_set_manager').ReplicaSetManager,
  Db = require('../../lib/mongodb').Db,
  ReplSetServers = require('../../lib/mongodb').ReplSetServers,
  Server = require('../../lib/mongodb').Server,
  Step = require("../../deps/step/lib/step");  

// Keep instance of ReplicaSetManager
var serversUp = false;
var retries = 120;
// var RS = null;

var ensureConnection = function(test, numberOfTries, callback) {
  // debug("=========================================== ensureConnection::" + numberOfTries)
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
      // RS = new ReplicaSetManager({retries:120, arbiter_count:0, passive_count:1});
      RS = new ReplicaSetManager({retries:120});
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
  
  shouldCorrectlyInsertAfterPrimaryComesBackUp : function(test) {
    // debug("=========================================== shouldWorkCorrectlyWithInserts")
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
      // Check if we got an error
      if(err != null) debug("shouldWorkCorrectlyWithInserts :: " + inspect(err));
  
      // Drop collection on replicaset
      p_db.dropCollection('testsets', function(err, r) {
        if(err != null) debug("shouldWorkCorrectlyWithInserts :: " + inspect(err));
        // Recreate collection on replicaset
        p_db.createCollection('testsets', function(err, collection) {
          if(err != null) debug("shouldWorkCorrectlyWithInserts :: " + inspect(err));  
          // Insert a dummy document
          collection.insert({a:20}, {safe: {w:2, wtimeout: 10000}}, function(err, r) {            
            // Kill the primary and attemp to insert
            // Ensure replication happened in time
            setTimeout(function() {
              // Kill the primary
              RS.killPrimary(function(node) {
                // Attempt insert (should fail)
                collection.insert({a:30}, {safe: {w:2, wtimeout: 10000}}, function(err, r) {
                  if(err != null) {
                    collection.insert({a:30}, {safe: true}, function(err, r) {
                      // Peform a count
                      collection.count(function(err, count) {
                        test.equal(2, count);
                        test.done();
                      });
                    });                                          
                  }
                });
              });
            }, 2000);            
          });
        });
      });
    });
  },

  shouldCorrectlyQueryAfterPrimaryComesBackUp : function(test) {
    // debug("=========================================== shouldWorkCorrectlyWithInserts")
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
      // Check if we got an error
      if(err != null) debug("shouldWorkCorrectlyWithInserts :: " + inspect(err));

      // Drop collection on replicaset
      p_db.dropCollection('testsets', function(err, r) {
        if(err != null) debug("shouldWorkCorrectlyWithInserts :: " + inspect(err));
        // Recreate collection on replicaset
        p_db.createCollection('testsets', function(err, collection) {
          if(err != null) debug("shouldWorkCorrectlyWithInserts :: " + inspect(err));  
          // Insert a dummy document
          collection.insert({a:20}, {safe: {w:2, wtimeout: 10000}}, function(err, r) {            
            // Kill the primary and attemp to insert
            // Ensure replication happened in time
            setTimeout(function() {
              // Kill the primary
              RS.killPrimary(function(node) {
                // Ok let's execute same query a couple of times
                collection.find({}).toArray(function(err, items) {
                  test.ok(err != null);
                  
                  // debug(" 1 =============================== err :: " + inspect(err))
                  // debug(inspect(items))

                  collection.find({}).toArray(function(err, items) {
                    // debug(" 2 =============================== err :: " + inspect(err))
                    // debug(inspect(items))

                    test.ok(err == null);
                    test.equal(1, items.length);

                    collection.find({}).toArray(function(err, items) {
                      // debug(" 2 =============================== err :: " + inspect(err))
                      // debug(inspect(items))

                      test.ok(err == null);
                      test.equal(1, items.length);
                  
                      test.done();
                    });
                  });
                });
              });
            }, 2000);            
          });
        });
      });
    });
  },

  shouldWorkCorrectlyWithInserts : function(test) {
    // debug("=========================================== shouldWorkCorrectlyWithInserts")
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
      if(err != null) debug("shouldWorkCorrectlyWithInserts :: " + inspect(err));
      // Drop collection on replicaset
      p_db.dropCollection('testsets', function(err, r) {
        if(err != null) debug("shouldWorkCorrectlyWithInserts :: " + inspect(err));
        // Recreate collection on replicaset
        p_db.createCollection('testsets', function(err, collection) {
          if(err != null) debug("shouldWorkCorrectlyWithInserts :: " + inspect(err));
          
          // Insert a dummy document
          collection.insert({a:20}, {safe: {w:2, wtimeout: 10000}}, function(err, r) {
            if(err != null) debug("shouldWorkCorrectlyWithInserts :: " + inspect(err));
            
            // Execute a count
            collection.count(function(err, c) {
              if(err != null) debug("shouldWorkCorrectlyWithInserts :: " + inspect(err));
  
              test.equal(1, c);
              // Close starting connection
              p_db.close();
  
              // Ensure replication happened in time
              setTimeout(function() {
                // Kill the primary
                RS.killPrimary(function(node) {
  
                  // Ensure valid connection
                  // Do inserts
                  ensureConnection(test, retries, function(err, p_db) {
                    if(err != null) debug("shouldWorkCorrectlyWithInserts :: " + inspect(err));
  
                    test.ok(err == null);
                    test.equal(true, p_db.serverConfig.isConnected());
  
                    p_db.collection('testsets', function(err, collection) {
                      if(err != null) debug("shouldWorkCorrectlyWithInserts :: " + inspect(err));
  
                      // Execute a set of inserts
                      Step(
                        function inserts() {
                          var group = this.group();
                          collection.save({a:30}, {safe:true}, group());
                          collection.save({a:40}, {safe:true}, group());
                          collection.save({a:50}, {safe:true}, group());
                          collection.save({a:60}, {safe:true}, group());
                          collection.save({a:70}, {safe:true}, group());
                        },
  
                        function finishUp(err, values) {                        
                          // Restart the old master and wait for the sync to happen
                          RS.restartKilledNodes(function(err, result) {
                            if(err != null) debug("shouldWorkCorrectlyWithInserts :: " + inspect(err));
  
                            if(err != null) throw err;
                            // Contains the results
                            var results = [];
  
                            // Just wait for the results
                            setTimeout(function() {
  
                              // Ensure the connection
                              ensureConnection(test, retries, function(err, p_db) {
                                if(err != null) debug("shouldWorkCorrectlyWithInserts :: " + inspect(err));
  
                                // Get the collection
                                p_db.collection('testsets', function(err, collection) {
                                  if(err != null) debug("shouldWorkCorrectlyWithInserts :: " + inspect(err));
  
                                  collection.find().each(function(err, item) {
                                    if(err != null) debug("shouldWorkCorrectlyWithInserts :: " + inspect(err));
  
                                    if(item == null) {
                                      // Ensure we have the correct values
                                      test.equal(6, results.length);
                                      [20, 30, 40, 50, 60, 70].forEach(function(a) {
                                        test.equal(1, results.filter(function(element) {
                                          return element.a == a;
                                        }).length);
                                      });                                    
  
                                      // Run second check
                                      collection.save({a:80}, {safe:true}, function(err, r) {
                                        if(err != null) debug("shouldWorkCorrectlyWithInserts :: " + inspect(err));
  
                                        collection.find().toArray(function(err, items) {
                                          if(err != null) debug("shouldWorkCorrectlyWithInserts :: " + inspect(err));
  
                                          // Ensure we have the correct values
                                          test.equal(7, items.length);
  
                                          [20, 30, 40, 50, 60, 70, 80].forEach(function(a) {
                                            test.equal(1, items.filter(function(element) {
                                              return element.a == a;
                                            }).length);
                                          });                                                                              
  
                                          p_db.close();
                                          test.done();                                                    
                                        });
                                      });                                    
                                    } else {
                                      results.push(item);
                                    }
                                  });
                                });
                              });                            
                            }, 1000);                          
                          })
                        }                      
                      );
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

















