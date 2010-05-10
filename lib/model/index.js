
var object = require('../utils/object'),
    EventEmitter = require('events').EventEmitter,
    Static = require('./static').Static,
    Plugin = require('./plugin').Plugin,
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
              if(!(val) instanceof t[key]) return;
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
            else addSetter(obj,prop,getters[prop].bind(scope));
          } else {
            addNonEnumerableProperty(obj,prop,{});
            addCustomGetters(obj[prop],getters[prop],scope,isSet);
          }
        }
      }
    },
    /*
    addCustomDocProperties = function(obj,type,getters,setters,scope){
      for(prop in obj){
        getter = (getters == undefined || getters[prop] == undefined) ? undefined : getters[prop];
        setter = (setters == undefined || setters[prop] == undefined) ? undefined : setters[prop];
        if(!type[prop]){ // add strict handling TODO
          if(!isObject()){
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
    */
    
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
        
        if(!this.models[name]) return this.emit('error','Model ['+name+'] is not defined.');
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
        else this.emit('error','Model ['+model.name+'] is already defined.');
      },
      
      compile : function(name,store){

        var Mongoose = this.mongoose,
            def = object.clone(this.models[name].definition),
            collection = this.models[name].collection,

        model = (function(){
          return function(obj){
            buildDefinition(this,model.__meta__.type,def.getters,def.setters,obj,this.__meta__.doc,this);
        //    addCustomDocProperties(this.__meta__doc,model.__meta__.type,this);
            addCustomGetters(this,def.getters,this);
            addCustomGetters(this,def.setters,this,true);
            return this;  
          }
        })();
        
        model.name = collection; // collection = collection event loop... hmmm...FIXME
        
        addMethods(model,{ parent : parent, __meta__ : {type : {} } },false,model);
        addMethods(model,Static,true,model);
        addMethods(model,EventEmitter.prototype,true,model);

        addMethods(model.prototype,{ 
          parent : parent, 
          save : function(){ model.save(this.__meta__.doc);},
          __meta__ : { doc : {} }
        });

        this.Plugin.preFilter(model,def); // allow plugins to do there thing before compiling.
        
        model.__meta__.type = def.types;

        this.Plugin.filter(model,def);

        addMethods(model.prototype,def.methods);

        addMethods(model,def.static,true,model);

        process.EventEmitter.call(model);

        if(store.collections[collection]) // this sucks.. needs to check connect and set loaded = true  FIXME
          model.collection = store.collections[collection];
        else{
          store.collection(collection,function(aCollection){
            model.collection = aCollection;
            model.loaded = true;
            model.dequeue();
          });
        }

        return model;
      }
      
    };
    
    
this.Model = Model;