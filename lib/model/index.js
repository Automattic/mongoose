
var object = require('../utils/object'),
    EventEmitter = require('events').EventEmitter,
    Static = require('./static').Static,
    Sugar = require('./sugar').Sugar,
    Plugin = require('./plugin').Plugin,
    sys = require('sys'),
    
    Model = function(instance){
      EventEmitter.call(this);
      this.mongoose = instance;
      this.mongoose.addDefiner('model',this.define);
      this.Plugin = new Plugin(instance);
    };
    
    Model.prototype = {
      
      models : {},
      
      get : function(name,store,noSchema){

        noSchema = noSchema || false;
        if(!(store instanceof this.mongoose.Storage)){
          store = this.mongoose.connect(store);
          if(!(store instanceof this.mongoose.Storage)) return false;
        }
        // noSchema check?
        if(noSchema){
          if(!this.models[name+':noSchema'])
            this.models[name+':noSchema'] = { definition : { name : name }, collection : name, binds : {} };
          name += ':noSchema';
        }
        
        if(!this.models[name]) return this.emit('error','Model ['+name+'] is not defined.');
        if(!this.models[name].binds[store.id])
          this.models[name].binds[store.id] = this.compile(name,store);
        
        return this.models[name].binds[store.id];
      },
      
      define : function(model){
        if(!model.name) return false;
        if(!this.models[model.name]){
          var collection = (model.collection || model.name);
          this.models[model.name] = { definition : model, collection : collection, binds : {} };
        }
        else this.emit('error','Model ['+model.name+'] is already defined.');
      },
      
      compile : function(name,store){

        var Mongoose = this.mongoose,
            def = object.clone(this.models[name].definition),
            collection = this.models[name].collection,

        model = (function(){
          return function(obj){
            Mongoose.Model.instance(this,def);
            Mongoose.Schema.instance(this,model,def.schema);
            return this;
          }
        })();
        
        model.name = collection; // collection = collection event loop... hmmm...FIXME

        this.Plugin.filter(def); // allow plugins to do there thing before compiling.

        if(!def.static) def.static = {};
    
        object.merge(def.static,Static);
        object.merge(def.static,EventEmitter.prototype);

        // sets all properties defined in the key 'static'
        // binds functions to the 'model', will bind functions 1 level deep ( functions within an object )        
        for(prop in def.static){
          if(typeof def.static[prop] == 'function') model[prop] = def.static[prop].bind(model);
          else if(def.static[prop] instanceof Array) model[prop] = def.static[prop];
          else if(typeof def.static[prop] == 'object'){
            model[prop] = {}; // object should be checked before blowing away
            for(prop2 in def.static[prop])
              model[prop][prop2] = (typeof def.static[prop][prop2] == 'function') 
                ? def.static[prop][prop2].bind(model) 
                : def.static[prop][prop2];
          }
          else model[prop] = def.static[prop];
        }

        process.EventEmitter.call(model);

        if(store.collections[collection]) // this sucks.. needs to check connect and set loaded = true  FIXME
          model.collection = store.collections[collection];
        else{
          store.collection(collection,function(aCollection){
            sys.puts('called collection');
            model.collection = aCollection;
            model.loaded = true;
            model.dequeue();
          });
        }

        return model;
      },
      
      instance : function(scope,def){
        // sets all properties defined in the key 'exports'
        // binds functions to an 'instance', will bind functions 1 level deep ( functions within an object )
        for(prop in def.exports){
          if(typeof def.exports[prop] == 'function') def[prop] = def.exports[prop].bind(scope);
          else if(typeof def.exports[prop] == 'object'){
            def[prop] = {}; // object should be checked before blowing away
            for(prop2 in def.exports[prop]) 
              def[prop][prop2] = (typeof def.exports[prop][prop2] == 'function') 
                ? def.exports[prop][prop2].bind(scope) 
                : def.exports[prop][prop2];
          }
          else def[prop] = def.exports[prop];
        }
      }
      
    };
    
    
this.Model = Model;