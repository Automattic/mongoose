var debug = require('util').debug,
  inspect = require('util').inspect,
  path = require('path'),
  fs = require('fs'),
  exec = require('child_process').exec,
  spawn = require('child_process').spawn,
  Connection = require('../../lib/mongodb').Connection,
  Db = require('../../lib/mongodb').Db,
  Server = require('../../lib/mongodb').Server;
  
var ServerManager = exports.ServerManager = function(options) {
  options = options == null ? {} : options;
  // Basic unpack values
  this.path = path.resolve("data");
  this.port = options["start_port"] != null ? options["start_port"] : 27017;  
  this.db_path = getPath(this, "data-" + this.port);
  this.log_path = getPath(this, "log-" + this.port);
  this.durable = options["durable"] != null ? options["durable"] : false;   
  this.auth = options['auth'] != null ? options['auth'] : false; 
  this.purgedirectories = options['purgedirectories'] != null ? options['purgedirectories'] : true;

  // Server status values
  this.up = false;
  this.pid = null;
}

// Start up the server instance
ServerManager.prototype.start = function(killall, callback) {
  var self = this;
  // Unpack callback and variables
  var args = Array.prototype.slice.call(arguments, 0);
  callback = args.pop();
  killall = args.length ? args.shift() : true;  
  // Create start command
  var startCmd = generateStartCmd({log_path: self.log_path, 
    db_path: self.db_path, port: self.port, durable: self.durable, auth:self.auth});
  
  exec(killall ? 'killall mongod' : '', function(err, stdout, stderr) {
    if(self.purgedirectories) {
      // Remove directory
      exec("rm -rf " + self.db_path, function(err, stdout, stderr) {
        if(err != null) return callback(err, null);    
        // Create directory
        exec("mkdir -p " + self.db_path, function(err, stdout, stderr) {
          if(err != null) return callback(err, null);
          // Start up mongod process
          var mongodb = exec(startCmd,
            function (error, stdout, stderr) {
              // console.log('stdout: ' + stdout);
              // console.log('stderr: ' + stderr);
              if (error !== null) {
                console.log('exec error: ' + error);
              }
          });

          // Wait for a half a second then save the pids
          setTimeout(function() {        
            // Mark server as running
            self.up = true;
            self.pid = fs.readFileSync(path.join(self.db_path, "mongod.lock"), 'ascii').trim();
            // Callback
            callback();
          }, 500);
        });    
      });        
    } else {
      // Ensure we remove the lock file as we are not purging the directory
      fs.unlinkSync(path.join(self.db_path, "mongod.lock"));
      
      // Start up mongod process
      var mongodb = exec(startCmd,
        function (error, stdout, stderr) {
          if (error !== null) {
            console.log('exec error: ' + error);
          }
      });

      // Wait for a half a second then save the pids
      setTimeout(function() {        
        // Mark server as running
        self.up = true;
        self.pid = fs.readFileSync(path.join(self.db_path, "mongod.lock"), 'ascii').trim();
        // Callback
        callback();
      }, 500);      
    }
  });
}

ServerManager.prototype.stop = function(signal, callback) {
  var self = this;
  // Unpack callback and variables
  var args = Array.prototype.slice.call(arguments, 0);
  callback = args.pop();
  signal = args.length ? args.shift() : 2;  
  // Stop the server
  var command = "kill -" + signal + " " + self.pid;
  // Kill process
  exec(command,
    function (error, stdout, stderr) {
      // console.log('stdout: ' + stdout);
      // console.log('stderr: ' + stderr);
      if (error !== null) {
        console.log('exec error: ' + error);
      }

      self.up = false;
      // Wait for a second
      setTimeout(callback, 1000);
  });    
}

// Get absolute path
var getPath = function(self, name) {
  return path.join(self.path, name);
}

// Generate start command
var generateStartCmd = function(options) {
  // Create boot command
  var startCmd = "mongod --logpath '" + options['log_path'] + "' " +
      " --dbpath " + options['db_path'] + " --port " + options['port'] + " --fork";
  startCmd = options['durable'] ? startCmd + "  --dur" : startCmd;
  startCmd = options['auth'] ? startCmd + "  --auth" : startCmd;
  return startCmd;
}
