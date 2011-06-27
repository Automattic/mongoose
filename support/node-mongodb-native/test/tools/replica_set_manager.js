var debug = require('util').debug,
  inspect = require('util').inspect,
  path = require('path'),
  fs = require('fs'),
  exec = require('child_process').exec,
  spawn = require('child_process').spawn,
  Connection = require('../../lib/mongodb').Connection,
  Db = require('../../lib/mongodb').Db,
  Server = require('../../lib/mongodb').Server,
  Step = require("../../deps/step/lib/step");  

var ReplicaSetManager = exports.ReplicaSetManager = function(options) {
  options = options == null ? {} : options;
  
  this.startPort = options["start_port"] || 30000;
  this.ports = [];
  this.name = options["name"] != null ? options["name"] : "replica-set-foo";
  this.host = options["host"] != null ? options["host"] : "localhost";
  this.retries = options["retries"] != null ? options["retries"] : 60;
  this.config = {"_id": this.name, "members": []};
  this.durable = options["durable"] != null ? options["durable"] : false;
  this.path = path.resolve("data");
  
  this.arbiterCount = options["arbiter_count"] != null ? options["arbiter_count"] : 2;
  this.secondaryCount = options["secondary_count"] != null ? options["secondary_count"] : 1;
  this.passiveCount = options["passive_count"] != null ? options["passive_count"] : 1;
  this.primaryCount = 1;
  
  this.count = this.primaryCount + this.passiveCount + this.arbiterCount + this.secondaryCount;
  if(this.count > 7) {
    throw new Error("Cannot create a replica set with #{node_count} nodes. 7 is the max.");
  }
  
  this.mongods = {};
  var self = this;
  
  // Add a handler for errors that bubble up all the way
  // process.on('uncaughtException', function (err) {
  //   debug("============================================================= uncaught Exception")
  //   debug(inspect(err))
  //   // Kill all mongod servers and cleanup before exiting
  //   self.killAll(function() {
  //     // Force exit
  //     process.exit();
  //   })  
  // });  
}

ReplicaSetManager.prototype.secondaries = function(callback) {
  return this.allHostPairsWithState(2, callback);
}

ReplicaSetManager.prototype.arbiters = function(callback) {
  return this.allHostPairsWithState(7, callback);
}

ReplicaSetManager.prototype.primary = function(callback) {
  return this.allHostPairsWithState(1, function(err, items) {
    if(items.length == 0) {
      return callback(null, null);
    } else {
      return callback(null, items[0]);
    }
  });
}

ReplicaSetManager.prototype.allHostPairsWithState = function(state, callback) {
  this.ensureUp(function(err, status) {
    if(err != null) return callback(err, null);

    var members = status["members"];
    // Get the correct state memebers
    var nodes = members.filter(function(value) {
      return value["state"] == state;
    });    
    
    // Filter out address of the server
    var servers = nodes.map(function(item) {
      return item["name"];
    });

    // Map nodes
    return callback(null, servers);
  })            
}

ReplicaSetManager.prototype.startSet = function(killall, callback) {
  var self = this;
  // Unpack callback and variables
  var args = Array.prototype.slice.call(arguments, 0);
  callback = args.pop();
  killall = args.length ? args.shift() : true;  

  debug("** Starting a replica set with " + this.count + " nodes");

  // Kill all existing mongod instances
  exec(killall ? 'killall mongod' : '', function(err, stdout, stderr) {
    var n = 0;

    Step(
        function startPrimaries() {
          var group = this.group();
          // Start primary instances
          for(n = 0; n < (self.primaryCount + self.secondaryCount); n++) {
            self.initNode(n, {}, group());
          }  
          
          // Start passive instances
          for(var i = 0; i < self.passiveCount; i++) {
            self.initNode(n, {priority:0}, group())
            n = n + 1;
          }
          
          // Start arbiter instances
          for(var i = 0; i < self.arbiterCount; i++) {
            self.initNode(n, {arbiterOnly:true}, group());
            n = n + 1;
          }          
        },
        
        function finishUp(err, values) {
          self.numberOfInitiateRetries = 0;
          // Initiate
          self.initiate(function(err, result) {
            if(err != null) return callback(err, null);
            self.ensureUpRetries = 0;

            // Ensure all the members are up
            // process.stdout.write("** Ensuring members are up...");
            debug("** Ensuring members are up...");
            // Let's ensure everything is up
            self.ensureUp(function(err, result) {
              if(err != null) return callback(err, null);
              // Return a correct result
              callback(null, result);
            })            
          });          
        }
    );
  })
}

ReplicaSetManager.prototype.initiate = function(callback) {
  var self = this;
  // Get master connection
  self.getConnection(function(err, connection) {    
    if(err != null) return callback(err, null);   
    // debug("=================================================== replicaset config")
    // debug(inspect(self.config))
     
    // Set replica configuration
    connection.admin().command({replSetInitiate:self.config}, function(err, result) {
      // If we have an error let's 
      if(err != null) {
        // Retry a number of times
        if(self.numberOfInitiateRetries < self.retries) {
          setTimeout(function() {
            self.numberOfInitiateRetries = self.numberOfInitiateRetries + 1;
            self.initiate(callback);
          }, 1000);          
        }
      } else {
        self.numberOfInitiateRetries = 0;
        callback(null, null);        
      }      
    });    
  });
}

// Get absolute path
var getPath = function(self, name) {
  return path.join(self.path, name);
}

ReplicaSetManager.prototype.initNode = function(n, fields, callback) {
  var self = this;
  this.mongods[n] = this.mongods[n] == null ? {} : this.mongods[n];
  var port = this.startPort + n;
  this.ports.push(port);
  this.mongods[n]["port"] = port;
  this.mongods[n]["db_path"] = getPath(this, "rs-" + port);
  this.mongods[n]["log_path"] = getPath(this, "log-" + port);
  this.up = false;
  
  // Add extra fields provided
  for(var name in fields) {
    this.mongods[n][name] = fields[name];
  }
  
  // debug("================================================== initNode")
  // debug(inspect(this.mongods[n]));
  
  // Perform cleanup of directories
  exec("rm -rf " + self.mongods[n]["db_path"], function(err, stdout, stderr) {
    // debug("======================================== err1::" + err)
    
    if(err != null) return callback(err, null);
    
    // Create directory
    exec("mkdir -p " + self.mongods[n]["db_path"], function(err, stdout, stderr) {
      // debug("======================================== err2::" + err)

      if(err != null) return callback(err, null);

      // debug("= ======================================= start1::" + self.mongods[n]["start"])

      self.mongods[n]["start"] = self.startCmd(n);
      self.start(n, function() {
        // Add instance to list of members
        var member = {"_id": n, "host": self.host + ":" + self.mongods[n]["port"]};   
        if(self.mongods[n]['arbiterOnly']) {
          member['arbiterOnly'] = true;
        }
        self.config["members"].push(member);
        // Return
        return callback();
      });      
    });    
  });
}

ReplicaSetManager.prototype.killAll = function(callback) {
  exec('killall mongod', function(err, stdout, stderr) {
    return callback();
  });  
}

ReplicaSetManager.prototype.kill = function(node, signal, callback) {
  var self = this;
  // Unpack callback and variables
  var args = Array.prototype.slice.call(arguments, 1);
  callback = args.pop();
  signal = args.length ? args.shift() : 2;

  debug("** Killing node with pid " + this.mongods[node]["pid"] + " at port " + this.mongods[node]['port']);
  var command = "kill -" + signal + " " + this.mongods[node]["pid"];
  // Kill process
  exec(command,
    function (error, stdout, stderr) {
      console.log('stdout: ' + stdout);
      console.log('stderr: ' + stderr);
      if (error !== null) {
        console.log('exec error: ' + error);
      }

      self.mongods[node]["up"] = false;
      // Wait for 5 seconds to give the server time to die a proper death
      setTimeout(callback, 20000);
  });  
}

ReplicaSetManager.prototype.killPrimary = function(signal, callback) {
  var self = this;
  // Unpack callback and variables
  var args = Array.prototype.slice.call(arguments, 0);
  callback = args.pop();  
  signal = args.length ? args.shift() : 2;
  
  this.getNodeWithState(1, function(err, node) {
    if(err != null) return callback(err, null);    

    // Kill process and return node reference
    self.kill(node, signal, function() {
      // Wait for a while before passing back
      callback(null, node);        
    })    
  });
}

ReplicaSetManager.prototype.killSecondary = function(callback) {
  var self = this;
  
  this.getNodeWithState(2, function(err, node) {
    if(err != null) return callback(err, null);
    // Kill process and return node reference
    self.kill(node, function() {
      callback(null, node);
    })    
  });  
}

ReplicaSetManager.prototype.stepDownPrimary = function(callback) {
  var self = this;

  this.getNodeWithState(1, function(err, primary) {
    self.getConnection(primary, function(err, connection) {
      if(err) return callback(err, null);

      // Closes the connection so never gets a response
      connection.admin().command({"replSetStepDown": 90});
      // Call back
      return callback(null, null);
    });
  });
}

ReplicaSetManager.prototype.getNodeFromPort = function(port, callback) {
  var self = this;
  var nodes = Object.keys(this.mongods).filter(function(key, index, array) {
    return self.mongods[key]["port"] == port;
  });
  // Return first node
  callback(null, nodes.length > 0 ? nodes.shift() : null);
}

ReplicaSetManager.prototype.getNodeWithState = function(state, callback) {
  var self = this;
  self.ensureUpRetries = 0;
  self.ensureUp(function(err, status) {
    if(err != null) return callback(err, null);
    
    var node = status["members"].filter(function(element, index, array) {
      return element["state"] == state;
    }).shift();
        
    if(node != null) {
      var hostPort = node["name"].split(":");
      var port = hostPort[1] != null ? parseInt(hostPort[1]) : 27017;
      var key = Object.keys(self.mongods).filter(function(element, index, array) {
        return self.mongods[element]["port"] == port;
      }).shift();
      return callback(null, key);
    } else {
      return callback(null, false);
    }
  });
}

ReplicaSetManager.prototype.ensureUp = function(callback) {
  var self = this;
  
  // Write out the ensureUp
  // process.stdout.write(".");  
  if(!self.up) process.stdout.write(".");
  // Retry check for server up sleeping inbetween
  self.retriedConnects = 0;
  // Attemp to retrieve a connection
  self.getConnection(function(err, connection) {
    // If we have an error or no connection object retry
    if(err != null || connection == null) {
      setTimeout(function() {
        self.ensureUpRetries++;
        self.ensureUp(callback);
      }, 1000)
      // Return
      return;      
    }
    
    // Check repl set get status
    connection.admin().command({"replSetGetStatus": 1}, function(err, object) {
      /// Get documents
      var documents = object.documents;
      // Get status object
      var status = documents[0];

      // If no members set
      if(status["members"] == null || err != null) {
        // Ensure we perform enough retries
        if(self.ensureUpRetries <  self.retries) {
          setTimeout(function() {
            self.ensureUpRetries++;
            self.ensureUp(callback);
          }, 1000)
        } else {
          return callback(new Error("Operation Failure"), null);          
        }                
      } else {
        // Establish all health member
        var healthyMembers = status.members.filter(function(element) {
          return element["health"] == 1 && [1, 2, 7].indexOf(element["state"]) != -1             
        });
        
        var stateCheck = status["members"].filter(function(element, indexOf, array) {
          return element["state"] == 1;
        });

        if(healthyMembers.length == status.members.length && stateCheck.length > 0) {
          // process.stdout.write("all members up! \n\n");  
          if(!self.up) process.stdout.write("all members up!\n\n")
          self.up = true;
          return callback(null, status);
        } else {
          // Ensure we perform enough retries
          if(self.ensureUpRetries <  self.retries) {
            setTimeout(function() {
              self.ensureUpRetries++;
              self.ensureUp(callback);
            }, 1000)
          } else {
            return callback(new Error("Operation Failure"), null);          
          }        
        }        
      }      
    });
  });
}

// Restart 
ReplicaSetManager.prototype.restartKilledNodes = function(callback) {
  var self = this;

  var nodes = Object.keys(self.mongods).filter(function(key) {
    return self.mongods[key]["up"] == false;
  });

  Step(
    // Start all nodes
    function start() {
      var group = this.group();
      // Start all nodes
      for(var i = 0; i < nodes.length; i++) {
        self.start(nodes[i], group());
      }
    },
    
    function finished() {
      self.ensureUp(callback);        
    }
  )
  // 
  // nodes.forEach(function(node) {
  //   self.start(node, function() {});
  // });
  // 
  // self.ensureUp(callback);  
}

ReplicaSetManager.prototype.getConnection = function(node, callback) {
  var self = this;
  // Unpack callback and variables
  var args = Array.prototype.slice.call(arguments, 0);
  callback = args.pop();  
  node = args.length ? args.shift() : null;
  
  if(node == null) {
    var keys = Object.keys(this.mongods);
    for(var i = 0; i < keys.length; i++) {
      var key = keys[i];
      // Locate first db that's runing and is not an arbiter
      if(this.mongods[keys[i]]["arbiterOnly"] == null && this.mongods[key]["up"]) {
        node = keys[i];
        break;
      }
    }
  }
    
  // Fire up the connection to check if we are running
  // var db = new Db('node-mongo-blog', new Server(host, port, {}), {native_parser:true});
  var connection = new Db("", new Server(this.host, this.mongods[node]["port"], {}));
  connection.open(function(err, connection) {
    // We need to retry if we have not finished up the number of retries
    if(err != null && self.retriedConnects < self.retries) {
      // Sleep for a second then retry
      setTimeout(function() {
        // Update retries
        self.retriedConnects++;        
        // Perform anothe reconnect
        self.getConnection(node, callback);              
      }, 1000)      
    } else if(err != null && self.retriedConnects >= self.retries){
      callback(new Error("Failed to reconnect"), null);
    } else {
      callback(null, connection);
    }
  })
}

// Fire up the mongodb instance
var start = ReplicaSetManager.prototype.start = function(node, callback) {
  var self = this;
  // Start up mongod process
  // debug("======================================================================================= starting process")
  // debug(self.mongods[node]["start"])
  
  var mongodb = exec(self.mongods[node]["start"],
    function (error, stdout, stderr) {
      console.log('stdout: ' + stdout);
      console.log('stderr: ' + stderr);
      if (error !== null) {
        console.log('exec error: ' + error);
      }
  });
      
  // Wait for a half a second then save the pids
  setTimeout(function() {
    // Mark server as running
    self.mongods[node]["up"] = true;
    self.mongods[node]["pid"]= fs.readFileSync(path.join(self.mongods[node]["db_path"], "mongod.lock"), 'ascii').trim();
    // Callback
    callback();
  }, 5000);
}

ReplicaSetManager.prototype.restart = start;

ReplicaSetManager.prototype.startCmd = function(n) {
  // Create boot command
  this.mongods[n]["start"] = "mongod --noprealloc --smallfiles --replSet " + this.name + " --logpath '" + this.mongods[n]['log_path'] + "' " +
      " --dbpath " + this.mongods[n]['db_path'] + " --port " + this.mongods[n]['port'] + " --fork";
  this.mongods[n]["start"] = this.durable ? this.mongods[n]["start"] + "  --dur" : this.mongods[n]["start"];
  // debug("================================================== start server")
  // debug(this.mongods[n]["start"])  
  return this.mongods[n]["start"];
}













