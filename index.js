
var fs = require('fs'),
    path = require('path'),
    sys = require('sys'),
    object = require('./lib/utils/object'),
    EventEmitter = require('events').EventEmitter,
    Script = process.binding('evals').Script,
    Storage = require('./lib/storage').Storage,
    Model = require('./lib/model/').Model,
    Schema = require('./lib/schema').Schema,
    Plugin = require('./lib/model/plugin').Plugin,

    Mongoose = (function(){

      var API = function(){
        EventEmitter.call(this);
        this.Schema = new Schema(this);
        this.Model = new Model(this);
        return this;
      };
      
      API.prototype = {
        
        loaded : false,
        
        options : {
          strict : true,
          sandboxName : 'Mongoose',
          loadAddons : false,
          activeStoreEnabled : true,
          activeStore : false,
          connections : {},
        },
        
        connections : {},
        
        defineTypes : {},
        
        Instance : API,
        Storage : Storage,
        
        configure : function(options){
         object.merge(this.options,options);
         object.merge(this.connections,this.options.connections);
         if(this.options.loadAddons){
           this.load('./schema/types');
           this.load('./schema/validators');
           this.load('./model/plugins');
         }
         this.loaded = true;
         return this;
        },
        
        load : function(resourcePath){
          var stats = fs.statSync(resourcePath),
              files = [];
              
          if(stats.isFile()) files = [resourcePath];    
          if(stats.isDirectory()) 
            files = fs.readdirSync(resourcePath).map(function(file){
              return path.join(resourcePath,file);
            });
          
          files.forEach(function(file){
              if(fs.statSync(file).isFile())
                var sandbox = {},
                    code = fs.readFileSync(file);
           //         sandbox[this.options.sandboxName] = this;
          //          sandbox['Model'] = this.Model;
          //          sandbox['require'] = require;
                    var Mongoose = this;
                    var Model = Mongoose.Model;
                    eval(code);
             //       Script.runInThisContext(code /*,sandbox */);
            }.bind(this)); 
        },
        
        connect : function(uri,options){
          var uri = uri;
          if(!this.loaded) this.configure();
          if(!uri){
            if(this.options.activeStoreEnabled){
              if(this.options.activeStore) uri = this.options.activeStore;
            }
            else {
              this.emit('error','activeStore not enabled or specify. Use an URI with connect');
              return false;
            }
          }
          if(!this.connections[uri]) this.connections[uri] = uri;
          
          if(typeof this.connections[uri] == 'string') this.connections[uri] = this.parseURI(this.connections[uri]);
          if(this.connections[uri] instanceof Array) this.connections[uri] = new Storage(this,this.connections[uri],options);
          if(this.options.activeStoreEnabled) this.options.activeStore = uri;
          return this.connections[uri];
        },
        
        noSchema : function(collection,store){
          if(!(store instanceof Storage)){
            store = this.connect(store);
            if(!(store instanceof Storage)) return false;
          }
          return this.Model.get(collection,store,true);
        },
        
        define : function(type,obj){
          var definer = this.defineTypes[type];
          if(definer && (typeof definer.define == 'function')) definer.define(obj);
          else this.emit('error','Define type ['+type+'] is invalid');
        },
        
        get : function(model,store){
          return this.Model.get(model,store)
        },
        
        close : function(){
          for(conn in this.connections) 
            if(this.connections[conn] instanceof Storage) this.connections[conn].close();
        },
                
        parseURI : function(uri){
          return uri.split(',').map(function(conn,idx){
              var a = conn.match(/^(?:(.+):\/\/(?:(.+?):(.+?)@)?)?(?:(.+?)(?::([0-9]+?))?(?:\/(.+?))?)$/);
              return { 'type' : a[1], 'user' : a[2], 'password' : a[3], 'host' : a[4], 'port' : a[5], 'db' : a[6] };
          });
        },
        
        addDefiner : function(name,callback){
          if(this.defineTypes[name] && (typeof this.defineTypes[name] == 'function'))
            this.emit('error','Definer ['+name+'] already exists');
          else this.defineTypes[name] = callback;
        },
        
        merge : object.merge
        
      };
      
      for(i in EventEmitter.prototype) API.prototype[i] = EventEmitter.prototype[i];
      
      return new API();

    })();

this.Mongoose = Mongoose;