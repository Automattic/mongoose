
require('./lib/utils/proto');

var mongo = require('./lib/support/mongodb/lib/mongodb/'),
    connections = {},
    
    Storage = function(uri,options){
      
      this.uri = uri;
      this.db = this.getDatabaseInstance(uri);
      
      this.db.open(function(err,connection){
        this.loaded = (err) ? false : connection;
        this.dequeue();
      }.bind(this));
      
    };
    
    Storage.prototype = {
        
        loaded : false,
        halted : false,
        collections : {},
        buffer : [],
        
        getDatabaseInstance : function(uri){
          var conn = this._process(uri);
          
          if(conn instanceof Object) // simple (single server)
              return new mongo.Db(conn.db, new mongo.Server(conn.host, conn.port || 27017, options));
          elseif(conn.length == 2) // server pair
              return new mongo.Db(conn[0].db, new mongo.ServerPair(
                new mongo.Server(conn[0].host, conn[0].port || 27017, options),
                new mongo.Server(conn[1].host, conn[1].port || 27017, options);
              ));
          else // cluster (master and multiple slaves)
            return new mongo.Db(conn[0].db, new mongo.ServerCluster(
              conn.map(function(server){
                new mongo.Server(server.host, server.port || 27017, options);
              })
            ));          
        },
        
        dequeue : function(){
          if(!this.buffer.length || !this.loaded || this.halted) return;
          var op = this.buffer.shift();
          op.args.push(op.callback || function(){})
          this.db[op.name].apply(this.collection,op.args);
          this.dequeue();
        }, 
        
        halt : function(){
          this.halted = true;
          return this;
        },
        
        resume : function(){
          this.halted = false;
          this.dequeue();
          return this;
        },
        
        clear : function(){
          this.buffer = [];
          return this;
        },       
        
        collection : function(){ return this._cmd('collection',Array.prototype.slice.call(arguments,0)); },
        close : function(){ return this._cmd('close', Array.prototype.slice.call(arguments,0)); },
        
        _cmd : function(cmd,args){
          var operation = { 
                name : cmd,
                callback : (args.length) ? ( (args[args.length-1] instanceof Function) ? args.pop() : null ) : null,
                args : args 
              };
              
          this.buffer.push(operation);
          this.dequeue();
        },
        
        _parse : function(uri){
          var connections = str.split(',').map(function(conn,idx){
              var a = conn.match(/^(?:(.+):\/\/(?:(.+?):(.+?)@)?)?(?:(.+?)(?::([0-9]+?))?(?:\/(.+?))?)$/);
              return { 'type' : a[1], 'user' : a[2], 'password' : a[3], 'host' : a[4], 'port' : a[5] || 27017, 'db' : a[6] };
          });
          return (connections.length == 1) ? connections[0] : connections;         
        }
    };

this.connect = function(uri,options){
  if(!connections[uri]) connections[uri] = new Storage(uri,options);
  return connections[uri];
}