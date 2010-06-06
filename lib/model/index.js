
var object = require('../utils/object'),
    EventEmitter = require('events').EventEmitter,
    Static = require('./static').Static,
    Plugin = require('./plugin').Plugin,
    Document = require('./document').Document,
    ObjectID = require('mongodb/bson/bson').ObjectID,
    sys = require('sys'),
    
    Model = function(instance){
      EventEmitter.call(this);
      this.mongoose = instance;
      this.mongoose.addDefiner('model',this);
      this.Plugin = new Plugin(instance);
    };
    
    Model.prototype = {
      
      ObjectID : ObjectID,
      
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
        
        if(!this.models[name]) return this.mongoose.emit('error','Model ['+name+'] is not defined.');
        if(!this.models[name].binds[store.id])
          this.models[name].binds[store.id] = this.compile(name,store);
        
        return this.models[name].binds[store.id];
      },
      
      define : function(){
        if(arguments.length == 2){ // all for a name?
          var model = arguments[1];
          model.name = arguments[0];
        } else model = arguments[0];
        
        if(!model.name) return false;
        if(!this.models[model.name]){
          var collection = (model.collection || model.name);
          this.models[model.name] = { definition : model, collection : collection, binds : {} };
        }
        else this.mongoose.emit('error','Model ['+model.name+'] is already defined.');
      },
      
      close : function(){
        for(i in this.models){
          for(b in this.models[i].binds){
            var model = this.models[i].binds[b];
            model.halt();
            model.clear();
            model.collection = null;
            model.loaded = false;
          }
        }
      },
      
      compile : function(name,store){

        var Mongoose = this.mongoose,
            def = object.clone(this.models[name].definition),
            collection = this.models[name].collection,

        model = (function(){
              return function(obj,clean){ // clean is passed internally when fetched from db

                var types = object.clone(def.types), getters = object.clone(def.getters), setters = object.clone(def.setters), strict = def.strict;
                if(!(obj._id instanceof ObjectID)) obj._id = new ObjectID(); // make sure we have an ObjectID
                Document.call(this,obj,types,getters,setters,strict);
         //       if(!clean) doc.__dirty = true;
                return this; 
              }
            })();

        model.name = collection; // collection = collection event loop... hmmm...FIXME
        model.collectionName = collection;

        addMethods(model,Static,true,model);
        addMethods(model,EventEmitter.prototype,true,model);

        // model instances
        addMethods(model.prototype,{
          parent : object.parent, 
          save : function(callback){
            var self = this, meta = this.__meta__;
            if(meta.removed == true) return this;
            if(meta.saving){
              meta.saveAgain = true;
            } else {
             model.save(this.__doc,function(){
               meta.saving = false;
               if(meta.removed) return self.remove();
               if(meta.saveAgain){
                 meta.saveAgain = false;
                 self.save();
               }
               if(typeof callback == 'function') callback(self);
             });
            }
            return this;
          },

          remove : function(callback){
            var self = this, meta = this.__meta__;
            meta.removed = true;
            if(meta.saving) return this;
            model.remove({_id : self._id},function(){
              if(typeof callback == 'function') callback(self);
            });
          }

        });
        
        if(!def.strict) def.strict = false;
        if(!def.types) def.types = [];
        if(!def.getters) def.getters = {};
        if(!def.setters) def.setters = {};
        if(!def.methods) def.methods = {};
        if(!def.static) def.static = {};
        

        this.Plugin.preFilter(model,def); // allow plugins to do there thing before compiling.
        this.Plugin.filter(model,def);

        addMethods(model.prototype,def.methods);
        addMethods(model,def.static,true,model);

        process.EventEmitter.call(model);
        
        model.store = store;

        if(store.collections[collection]) // this sucks.. needs to check connect and set loaded = true  FIXME
          model.collection = store.collections[collection];
        else{
          store.collection(collection,function(aCollection){
            model.collection = aCollection;
            model.loaded = true;
            
            aCollection.indexInformation(function(err,info){

              if(!def.indexes) return;
              def.indexes.forEach(function(idx){
                var key = '';
                if(Object.prototype.toString.call(idx) === '[object Array]'){
                  for(i=0,l=idx.length; i < l; i++){
                    if(i) key += '_';
                    key += idx[i][0] +'_1';
                  }
                } else key = idx + '_1';
                if(!info[key]) aCollection.createIndex(idx,function(){});
              });
            });
            
            model.dequeue();
          });
        }

        return model;
      }
      
    };
    
    
this.Model = Model;