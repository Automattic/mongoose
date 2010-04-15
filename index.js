
require('./lib/utils/proto');

var  Class = require('./lib/support/class/lib/class').Class,
    sys = require('sys'),
    connections = {},
    mongo = require('./lib/support/mongodb/lib/mongodb/');
    
    
    Storage = new Class({

        connection : false,
        collections : [],
        queue : [],

        constructor : function(id,options){
          
          this.id = id;
          
          process.EventEmitter.call(this);
          
          this.db = new mongo.Db(options.master.name, new mongo.Server(options.master.host, options.master.port, {}), {});
          this.db.open(this.connected.bind(this));
        },

        connected : function(err,connection){
          this.connection = (err) ? false : connection;
          if(!err) this.emit('connected');
          this.dequeue();
        },

        openCollection : function(name,callback){
          this.queue.push(['collection',name,function(err,collection){
              if(err){
                sys.puts('----- error with open collection ------');
                sys.puts(sys.inspect(err));
                sys.puts('---------------------------------------\n');
                return;
              } else {
                this.collections[name] = collection;
                callback(collection);
              }
          }.bind(this)]);

        },

        dequeue : function(){
          if(!this.queue.length || !this.connection)  return;
          var op = this.queue.shift();
          this.db[op.shift()].apply(this.db,op);
          this.dequeue();
        }


    });

    Storage.include(process.EventEmitter.prototype);
        

this.configure = function(obj){
  for(i in obj){
    if(!connections[i]) connections[i] = obj[i];
  }
  return this;
}

this.connect = function(id){
  if(!connections[id]) return false;
  if(!connections[id].instance) connections[id].instance = new Storage(id,connections[id]);
  return connections[id].instance;
}