GLOBAL.DEBUG = true;

sys = require("sys");
test = require("assert");

var Db = require('../lib/mongodb').Db,
  Connection = require('../lib/mongodb').Connection,
  Server = require('../lib/mongodb').Server,
  Cursor = require('../lib/mongodb').Cursor;

var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
var port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : Connection.DEFAULT_PORT;

Slave = function() {
  this.running = false;
  this.callbacks = [];
  //no native_parser right now (because timestamps)
  //no strict mode (because system db signed with $  db.js line 189)
  //connect without dbName for querying not only "local" db
  sys.puts("Connecting to " + host + ":" + port);
  this.db = new Db('', new Server(host, port, {}), {});
}

//start watching
Slave.prototype.start = function() {
  var self = this;
  if (this.running) return;
  
  this.db.open(function(err, db) {
    if (err) {
      sys.puts('> MongoSlave error' + err);
      process.exit(1);
    }

    db.collection('local.oplog.$main', function(err, collection) {
      if (! collection) {
        sys.puts('> MongoSlave - local.oplog.$main not found');
        self.stop();
        return false;
      }
      
      process.on('SIGINT', function () {
        self.stop(); //tailable cursor should be stopped manually
      });

      //get last row for init TS
      collection.find({}, {'limit': 1, 'sort': [['$natural', -1]]}, function(err, cursor) {
        cursor.toArray(function(err, items) {
          if (items.length) {
            sys.puts('> MongoSlave started');
            self.running = true;
            self._runSlave(collection, items[0]['ts']);
          } else if (err) {
            sys.puts(err);
            self.stop();
          }
        });
      });
    });
  });
}

//stop watching
Slave.prototype.stop = function() {
  if (!this.running) return;
  sys.puts('> MongoSlave stopped');
  this.running = false;
  this.db.close();
}

Slave.prototype._runSlave = function(collection, time) {

  var self = this;
  
  //watch oplog INFINITE (until Slave.stop())
  collection.find({'ts': {'$gt': time}}, {'tailable': 1, 'sort': [['$natural', 1]]}, function(err, cursor) {
    cursor.each(function(err, item) {
      if (cursor.state == Cursor.CLOSED) { //broken cursor
        self.running && self._runSlave(collection, time);
        return;
      }
      time = item['ts'];

      switch(item['op']) {
        case 'i': //inserted
          self._emitObj(item['o']);
          break;
        case 'u': //updated
          self.db.collection(item['ns'], function(err, collection) {
            collection.findOne(item['o2']['_id'], {}, function(err, item) {
              item && self._emitObj(item);
            });
          });
          break;
        case 'd': //deleted
          //nothing to do
          break;
      }
    });
  });
}

Slave.prototype._emitObj = function (obj) {
  for(var i in this.callbacks) this.callbacks[i].call(this, obj);
}

Slave.prototype.onObject = function(callback) {
  this.callbacks.push(callback);
}


//just for example
var watcher = new Slave();

watcher.onObject(function(obj) {
  sys.puts(sys.inspect(obj));
});

watcher.start();