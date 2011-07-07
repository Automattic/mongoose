var mongodb = process.env['TEST_NATIVE'] != null ? require('../../lib/mongodb').native() : require('../../lib/mongodb').pure();

var testCase = require('../../deps/nodeunit').testCase,
  debug = require('util').debug
  inspect = require('util').inspect,
  nodeunit = require('../../deps/nodeunit'),
  Db = mongodb.Db,
  Cursor = mongodb.Cursor,
  Collection = mongodb.Collection,
  Server = mongodb.Server,
  ReplSetServers = mongodb.ReplSetServers,
  ReplicaSetManager = require('../../test/tools/replica_set_manager').ReplicaSetManager,
  Step = require("../../deps/step/lib/step");  

var MONGODB = 'integration_tests';
// var client = new Db(MONGODB, new Server("127.0.0.1", 27017, {auto_reconnect: true, poolSize: 1}), {native_parser: (process.env['TEST_NATIVE'] != null)});
var serverManager = null;

// Define the tests, we want them to run as a nested test so we only clean up the 
// db connection once
var tests = testCase({
  setUp: function(callback) {
    RS = new ReplicaSetManager({retries:120, auth:true});
    RS.startSet(true, function(err, result) {      
      if(err != null) throw err;
      // Finish setup
      callback();      
    });      
  },
  
  tearDown: function(callback) {
    RS.killAll(function() {
      callback();      
    })
  },

  shouldCorrectlyAuthenticate : function(test) {
    var replSet = new ReplSetServers( [ 
        new Server( RS.host, RS.ports[1], { auto_reconnect: true } ),
        new Server( RS.host, RS.ports[0], { auto_reconnect: true } ),
        new Server( RS.host, RS.ports[2], { auto_reconnect: true } )
      ], 
      {rs_name:RS.name}
    );
    
    // Connect to the replicaset
    var slaveDb = null;
    var db = new Db('foo', replSet, {native_parser: (process.env['TEST_NATIVE'] != null)});
    db.open(function(err, p_db) {
      Step(
        function addUser() {
          db.admin().addUser("me", "secret", this);
        },
        
        function ensureFailingInsert(err, result) {
          var self = this;
          test.equal(null, err);
          test.ok(result != null);

          db.collection("stuff", function(err, collection) {
            collection.insert({a:2}, {safe: {w: 3}}, self);
          });                  
        },
        
        function authenticate(err, result) {
          test.ok(err != null);
          
          db.admin().authenticate("me", "secret", this);
        },
        
        function insertShouldSuccedNow(err, result) {
          var self = this;
          test.equal(null, err);
          test.ok(result);

          db.collection("stuff", function(err, collection) {
            collection.insert({a:2}, {safe: {w: 3}}, self);
          });                            
        }, 
        
        function queryShouldExecuteCorrectly(err, result) {
          var self = this;
          test.equal(null, err);
          
          db.collection("stuff", function(err, collection) {
            collection.findOne(self);
          });                            
        },
        
        function logout(err, item) {
          test.ok(err == null);
          test.equal(2, item.a);
          
          db.admin().logout(this);
        },
        
        function findShouldFailDueToLoggedOut(err, result) {
          var self = this;
          test.equal(null, err);
          
          db.collection("stuff", function(err, collection) {
            collection.findOne(self);
          });
        },
        
        function sameShouldApplyToRandomSecondaryServer(err, result) {
          var self = this;
          test.ok(err != null);
          
          slaveDb = new Db('foo', new Server(db.serverConfig.secondaries[0].host
                    , db.serverConfig.secondaries[0].port, {auto_reconnect: true, poolSize: 1}), {native_parser: (process.env['TEST_NATIVE'] != null), slave_ok:true});
          slaveDb.open(function(err, slaveDb) {            
            slaveDb.collection('stuff', function(err, collection) {
              collection.findOne(self)
            })            
          });
        }, 
        
        function shouldCorrectlyAuthenticateAgainstSecondary(err, result) {
          test.ok(err != null)
          
          slaveDb.admin().authenticate('me', 'secret', this);
        },
        
        function shouldCorrectlyInsertItem(err, result) {
          var self = this;          
          test.equal(null, err);
          test.ok(result);
          
          slaveDb.collection('stuff', function(err, collection) {
            collection.findOne(self)
          })                      
        },
        
        function finishUp(err, item) {
          test.ok(err == null);
          test.equal(2, item.a);          
          
          test.done();
        }
      )      
    });
  }
})

// Assign out tests
module.exports = tests;