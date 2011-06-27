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
  // Replica configuration
  var replSet = new ReplSetServers( [ 
      // new Server( RS.host, RS.ports[1], { auto_reconnect: true } ),
      new Server( RS.host, RS.ports[0], { auto_reconnect: true } ),
      // new Server( RS.host, RS.ports[2], { auto_reconnect: true } )
    ], 
    {rs_name:RS.name, read_secondary:true}
  );
  
  if(numberOfTries <= 0) return callback(new Error("could not connect correctly"), null);

  var db = new Db('ruby-test-db', replSet);
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

  // shouldReadPrimary : function(test) {
  //   // debug("=========================================== shouldReadPrimary")
  //   // Replica configuration
  //   var replSet = new ReplSetServers( [ 
  //       new Server( RS.host, RS.ports[0], { auto_reconnect: true } ),
  //     ], 
  //     {rs_name:RS.name, read_secondary:true}
  //   );
  // 
  //   // Insert some data
  //   var db = new Db('integration_test_', replSet);
  //   db.open(function(err, p_db) {
  //     if(err != null) debug("shouldReadPrimary :: " + inspect(err));
  //     // Drop collection on replicaset
  //     p_db.dropCollection('testsets', function(err, r) {
  //       if(err != null) debug("shouldReadPrimary :: " + inspect(err));
  // 
  //       test.equal(false, p_db.serverConfig.isReadPrimary());
  //       test.equal(false, p_db.serverConfig.isPrimary());
  //       test.done();
  //     });
  //   })                
  // },
  // 
  // shouldCorrectlyTestConnection : function(test) {
  //   // debug("=========================================== shouldCorrectlyTestConnection")
  //   // Replica configuration
  //   var replSet = new ReplSetServers( [ 
  //       new Server( RS.host, RS.ports[0], { auto_reconnect: true } ),
  //     ], 
  //     {rs_name:RS.name, read_secondary:true}
  //   );
  // 
  //   // Insert some data
  //   var db = new Db('integration_test_', replSet);
  //   db.open(function(err, p_db) {
  //     if(err != null) debug("shouldReadPrimary :: " + inspect(err));
  // 
  //     // Drop collection on replicaset
  //     p_db.dropCollection('testsets', function(err, r) {
  //       if(err != null) debug("shouldReadPrimary :: " + inspect(err));
  // 
  //       test.ok(p_db.serverConfig.primary != null);
  //       test.ok(p_db.serverConfig.read != null);
  //       test.ok(p_db.serverConfig.primary.port != p_db.serverConfig.read.port);
  //       test.done();
  //     });
  //   })
  // },
  
  shouldCorrectlyQuerySecondaries : function(test) {
    // debug("=========================================== shouldCorrectlyQuerySecondaries")
    var self = this;
    // Replica configuration
    var replSet = new ReplSetServers( [ 
        new Server( RS.host, RS.ports[0], { auto_reconnect: true } ),
      ], 
      {rs_name:RS.name, read_secondary:true}
    );

    // Insert some data
    var db = new Db('ruby-test-db', replSet);
    db.open(function(err, p_db) {
      if(err != null) debug("shouldReadPrimary :: " + inspect(err));

      p_db.createCollection("test-sets", {safe:{w:3, wtimeout:10000}}, function(err, collection) {
        if(err != null) debug("shouldReadPrimary :: " + inspect(err));

        Step(
          function inserts() {
            var group = this.group();
            collection.save({a:20}, group());
            collection.save({a:30}, group());
            collection.save({a:40}, group());
          },
          
          function done(err, values) {
            if(err != null) debug("shouldReadPrimary :: " + inspect(err));
            var results = [];
            
            retryEnsure(60, function(done) {
              results = [];
              
              collection.find().each(function(err, item) {                
                if(item == null) {
                  var correct = 0;
                  // Check all the values
                  var r = [20, 30, 40];
                  for(var i = 0; i < r.length; i++) {
                    correct += results.filter(function(element) {
                      return element.a == r[i];
                    }).length;                  
                  }                  
                  return correct == 3 ? done(true) : done(false);
                } else {
                  results.push(item);
                }
              });
            }, function(err, result) {
              if(err != null) debug("shouldReadPrimary :: " + inspect(err));
              test.ifError(err);
              
              // Ensure replication happened in time
              setTimeout(function() {
                // Kill the primary
                RS.killPrimary(function(node) {

                  //
                  //  Retry again to read the docs with primary dead
                  retryEnsure(60, function(done) {
                    results = [];

                    collection.find().each(function(err, item) {
                      if(err != null) debug("shouldReadPrimary :: " + inspect(err));

                      if(item == null) {
                        var correct = 0;
                        // Check all the values
                        var r = [20, 30, 40];
                        for(var i = 0; i < r.length; i++) {
                          correct += results.filter(function(element) {
                            return element.a == r[i];
                          }).length;                  
                        }                  
                        return correct == 3 ? done(true) : done(false);
                      } else {
                        results.push(item);
                      }
                    });
                  }, function(err, result) {
                    test.ifError(err);

                    test.done();
                    p_db.close();
                  })
                });              
              }, 2000);
            })
          }
        );
      });      
    })    
  }
})

var retryEnsure = function(numberOfRetries, execute, callback) {
  execute(function(done) {
    if(done) {
      return callback(null, null);              
    } else {
      numberOfRetries = numberOfRetries - 1;

      if(numberOfRetries <= 0) {
        return callback(new Error("Failed to execute command"), null);
      } else {
        setTimeout(function() {
          retryEnsure(numberOfRetries, execute, callback);
        }, 1000);
      }        
    }
  });
}

















