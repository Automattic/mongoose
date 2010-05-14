
var object = require('../utils/object'),
    EventEmitter = require('events').EventEmitter,
    Static = require('./static').Static,
    Plugin = require('./plugin').Plugin,
    ObjectID = require('mongodb/bson/bson').ObjectID,
    sys = require('sys'),
    
    parent = function(){
      if(!this.__meta__.$caller) return;
      var name = this.__meta__.$caller.$name, parent = this.__meta__.$caller.$parent;
      var previous = (parent) ? parent : null;
      if(!previous) return;
      return previous.apply(this,arguments);
    },
    
    isObject = function(obj){ return Object.prototype.toString.call(obj) == "[object Object]"; },
    
    addNonEnumerableProperty = function(o,k,v){
      Object.defineProperty(o, k, { value : v, writable : true, enumerable : false, configurable : true });
    },
    
    addGetter = function(o,k,v,enum){
      Object.defineProperty(o,k, { get : v, enumerable : !!enum, configurable : true });
    },
    
    addSetter = function(o,k,v,enum){
      Object.defineProperty(o,k, { set : v, enumerable : !!enum, configurable : true });
    }
    
    addMethods = function(obj,methods,enum,scope){
      var enum = enum || false, scope = scope || null;

      for(prop in methods){
        if(obj[prop] instanceof Function){
          var parent = obj[prop];
          var func = methods[prop];

          var wrapper = function(){
            this.__meta__.$caller = wrapper;
            var result = func.apply(this,arguments);
            this.__meta__.$caller = null;
            return result;
          }
          if(scope) wrapper = wrapper.bind(scope);
          wrapper.$name = prop;
          wrapper.$parent = parent;

          if(!enum) addNonEnumerableProperty(obj,prop,wrapper);
          else obj[prop] = wrapper;

        } else if(isObject(methods[prop])){
          if(!obj[prop]){
            if(!enum) addNonEnumerableProperty(obj,prop,{});
            else obj[prop] = {};
          }
          addMethods(obj[prop],methods[prop],scope);
        }
        else{
          if(!enum) addNonEnumerableProperty(obj,prop,methods[prop]);
          else obj[prop] = methods[prop];
        }
      }
    },
    
    buildDefinition = function(to,type,getters,setters,data,store,scope){

      for(prop in type){

        getter = (getters == undefined || getters[prop] == undefined) ? undefined : getters[prop];
        setter = (setters == undefined || setters[prop] == undefined) ? undefined : setters[prop];
        data = (data == undefined) ? undefined : data;
        if(isObject(type[prop])){
          to[prop] = {}; store[prop] = {};
          if(data[prop]==undefined) data[prop] = {};
          buildDefinition(to[prop],type[prop],getter,setter,data[prop],store[prop],scope);
        } else {

          to.__defineGetter__(prop,(function(){
            var s = store, key = prop, get = (getter) ? getter.bind(scope) : getter;
            return function(){
              if(get instanceof Function) return get(s[key]);
              else return s[key];
            }.bind(scope);
          })());

          to.__defineSetter__(prop,(function(){
            var s = store, key = prop, t = type, set = (setter) ? setter.bind(scope) : setter;
            return function(val){
              //if(!(val) instanceof t[key]) return;
              if(set instanceof Function) s[key] = set(val);
              else s[key] = val;
              if(!this.__meta__.isDirty){
                this.__meta__.isDirty = true;
        //        model.addDirty(this);
              }
            }.bind(scope);
          })());

          to[prop] = (data) ? data[prop] : undefined;

        }
      }
    },
    
    addCustomGetters = function(obj,getters,scope,isSet){
      for(prop in getters){
        if(!obj[prop]){
          if(!isObject(getters[prop])){
            if(!isSet) addGetter(obj,prop,getters[prop].bind(scope));
            else addSetter(obj,prop,getters[prop](scope));
          } else {
            addNonEnumerableProperty(obj,prop,{});
            addCustomGetters(obj[prop],getters[prop],scope,isSet);
          }
        }
      }
    },
    
    addCustomValues = function(obj,type,store){
      for(prop in obj){
        if(isObject(obj[prop]) && type[prop]){
          addCustomValues(obj[prop],type[prop],store[prop]);
        }
        else if(!type[prop]){
          store[prop] = obj[prop];
        }
      }
    },
    
    addCustomDocProperties = function(obj,type,getters,setters,scope){
      for(prop in obj){
        getter = (getters == undefined || getters[prop] == undefined) ? undefined : getters[prop];
        setter = (setters == undefined || setters[prop] == undefined) ? undefined : setters[prop];
        if(!type[prop]){ // add strict handling TODO
          if(!isObject(obj[prop])){
            obj.__defineGetter__(prop,(function(){
              var key = prop, get = getters.bind(scope), store = obj;
              return function(){
                if(get instanceof Function) return get(store[key]);
                else return store[key];
              }.bind(scope);
            })());
            obj.__defineSetter__(prop,(function(){
              var key = prop, set = setter.bind(scope), store = obj;
              return function(){
                if(set instanceof Function) store[key] = set(val);
                      else s[key] = val;
                      if(!this.__meta__.isDirty){
                        this.__meta__.isDirty = true;
                //        model.addDirty(this);
                      }
              }.bind(scope);
            })());            
            
          }
        }
      }
    },
    
    Model = function(instance){
      EventEmitter.call(this);
      this.mongoose = instance;
      this.mongoose.addDefiner('model',this);
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
          return function(obj){
            if(obj._id) obj._id = { id : obj._id.id };
            else obj._id = { id : new ObjectID().toHexString() }
            buildDefinition(this,model.__meta__.type,def.getters,def.setters,obj,this.__meta__.doc,this);
            addCustomValues(obj,model.__meta__.type,this);
            addCustomGetters(this,def.getters,this);
            addCustomGetters(this,def.setters,this,true);
            return this;  
          }
        })();

        model.name = collection; // collection = collection event loop... hmmm...FIXME
        model.collectionName = collection;

        addMethods(model,{ parent : parent, __meta__ : {type : {} } },false,model);
        addMethods(model,Static,true,model);
        addMethods(model,EventEmitter.prototype,true,model);

        addMethods(model.prototype,{ 
          parent : parent, 
          save : function(key,val){
            if(key){
              if(val){
                var keys = key.split('.'), x = obj = {};
                for(i = 0, l = keys.length-1; i < l; i++) x = x[keys[i]] = {};
                x[keys[keys.length-1]] = val;
                object.merge(this,obj);
              } else object.merge(this,key);
            }
            
            var self = this, meta = this.__meta__;
            if(meta.removed == true) return this;
            if(meta.saving == true){
              meta.saveAgain = true;
            } else {
             model.save(this,true).then(function(){ 
                meta.saving = false;
                if(meta.removed) return self.remove();
                if(meta.saveAgain){
                 meta.saveAgain = false;
                  self.save();
                } 
              }); 
            }
            return this;
          },
          
          remove : function(){
            var self = this, meta = this.__meta__;
            meta.removed = true;
            if(meta.saving) return this;
            model.remove({_id : self._id}).run(function(){
              
            });
          },
          
          __meta__ : { doc : {} }
        });

        this.Plugin.preFilter(model,def); // allow plugins to do there thing before compiling.
        
        model.__meta__.type = def.types || {};
        if(!model.__meta__.type._id) model.__meta__.type._id = String;

        this.Plugin.filter(model,def);
        
        if(!def.getters) def.getters = {};
        if(!def.setters) def.setters = {};

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
            
            model.indexInformation().execute(function(info){
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