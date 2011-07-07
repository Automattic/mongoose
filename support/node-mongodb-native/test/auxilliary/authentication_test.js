var mongodb = process.env['TEST_NATIVE'] != null ? require('../../lib/mongodb').native() : require('../../lib/mongodb').pure();

var testCase = require('../../deps/nodeunit').testCase,
  debug = require('util').debug
  inspect = require('util').inspect,
  nodeunit = require('../../deps/nodeunit'),
  Db = mongodb.Db,
  Cursor = mongodb.Cursor,
  Collection = mongodb.Collection,
  Server = mongodb.Server,
  ServerManager = require('../../test/tools/server_manager').ServerManager,
  Step = require("../../deps/step/lib/step");  

var MONGODB = 'integration_tests';
var client = new Db(MONGODB, new Server("127.0.0.1", 27017, {auto_reconnect: true, poolSize: 1}), {native_parser: (process.env['TEST_NATIVE'] != null)});
var serverManager = null;

// Define the tests, we want them to run as a nested test so we only clean up the 
// db connection once
var tests = testCase({
  setUp: function(callback) {
    callback();
  },
  
  tearDown: function(callback) {
    serverManager.stop(9, function(err, result) {
      callback();
    });
  },

  shouldCorrectlyAuthenticate : function(test) {
    var db1 = new Db('mongo-ruby-test-auth1', new Server("127.0.0.1", 27017, {auto_reconnect: true}), {native_parser: (process.env['TEST_NATIVE'] != null)});
    var db2 = new Db('mongo-ruby-test-auth2', new Server("127.0.0.1", 27017, {auto_reconnect: true}), {native_parser: (process.env['TEST_NATIVE'] != null)});
    var admin = new Db('admin', new Server("127.0.0.1", 27017, {auto_reconnect: true}), {native_parser: (process.env['TEST_NATIVE'] != null)});
    
    Step(
      function bootTheServerWithNoAuth() {
        serverManager = new ServerManager({auth:false, purgedirectories:true})
        serverManager.start(true, this);
      },
      
      function openDbs() {
        db1.open(this.parallel());
        db2.open(this.parallel());
        admin.open(this.parallel());
      },
      
      function addAdminUserToDatabase(err, db1, db2, admin) {
        test.equal(null, err);        
        admin.addUser('admin', 'admin', this);
      },
      
      function restartServerInAuthMode(err, result) {
        test.equal(null, err);
        test.equal('7c67ef13bbd4cae106d959320af3f704', result.shift().pwd);

        db1.close();
        db2.close();
        admin.close();

        serverManager = new ServerManager({auth:true, purgedirectories:false})
        serverManager.start(true, this);
      },
      
      function openDbs() {
        db1.open(this.parallel());
        db2.open(this.parallel());
        admin.open(this.parallel());
      },
      
      function authenticateAdminUser(err) {
        test.equal(null, err);        

        admin.authenticate('admin', 'admin', this.parallel());
        db1.admin().authenticate('admin', 'admin', this.parallel());
        db2.admin().authenticate('admin', 'admin', this.parallel());
      },
      
      function addDbUsersForAuthentication(err, result1, result2, result3) {
        test.equal(null, err);
        test.ok(result1);
        test.ok(result2);
        test.ok(result3);
        
        db1.addUser('user1', 'secret', this.parallel());
        db2.addUser('user2', 'secret', this.parallel());
      },
      
      function closeAdminConnection(err, result1, result2) {
        test.ok(err == null);
        test.ok(result1 != null);
        test.ok(result2 != null);

        admin.logout(this.parallel());
        db1.admin().logout(this.parallel());
        db2.admin().logout(this.parallel());
      },
      
      function failAuthenticationWithDbs(err, result) {
        var self = this;

        db1.collection('stuff', function(err, collection) {
          collection.insert({a:2}, {safe:true}, self.parallel());
        });        

        db2.collection('stuff', function(err, collection) {
          collection.insert({a:2}, {safe:true}, self.parallel());
        });        
      },
      
      function authenticateAgainstDbs(err, result) {
        test.ok(err != null);
                
        db1.authenticate('user1', 'secret', this.parallel());
        db2.authenticate('user2', 'secret', this.parallel());        
      },
      
      function correctlyInsertRowToDbs(err, result1, result2) {
        var self = this;
        test.ok(err == null);
        test.ok(result1);
        test.ok(result2);
        
        db1.collection('stuff', function(err, collection) {
          collection.insert({a:2}, {safe:true}, self.parallel());
        });        
        
        db2.collection('stuff', function(err, collection) {
          collection.insert({a:2}, {safe:true}, self.parallel());
        });                
      },
      
      function validateCorrectInsertsAndBounceServer(err, result1, result2) {
        test.ok(err == null);
        test.ok(result1 != null);
        test.ok(result2 != null);
        
        serverManager = new ServerManager({auth:true, purgedirectories:false})
        serverManager.start(true, this);
      },
      
      function reconnectAndVerifyThatAuthIsAutomaticallyApplied() {
        var self = this;
        db1.collection('stuff', function(err, collection) {
          collection.find().toArray(function(err, items) {
            test.ok(err == null);
            test.equal(1, items.length);

            db1.collection('stuff', function(err, collection) {
              collection.insert({a:2}, {safe:true}, self.parallel());
            });        

            db2.collection('stuff', function(err, collection) {
              collection.insert({a:2}, {safe:true}, self.parallel());
            });                            
          })
        });        
      },
      
      function logoutDb1(err, result1, result2) {
        test.ok(err == null);
        test.ok(result1 != null);
        test.ok(result2 != null);
        
        db1.logout(this);
      },
      
      function insertShouldFail(err, result) {
        var self = this;
        db1.collection('stuff', function(err, collection) {
          collection.insert({a:2}, {safe:true}, self.parallel());
        });                      
      },
      
      function logoutDb2(err, result) {
        test.ok(err != null);

        db2.logout(this);
      },
      
      function insertShouldFail(err, result) {        
        var self = this;
        db2.collection('stuff', function(err, collection) {
          collection.insert({a:2}, {safe:true}, function(err, result) {
            test.ok(err != null);
            test.done();
          });
        });                      
      }
    )
  },
})

// Assign out tests
module.exports = tests;