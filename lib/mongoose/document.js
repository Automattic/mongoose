var sys = require('sys')
  , Subclass = require('./util').subclass
  , Schema = require('./schema')
  , EventEmitter = require('events').EventEmitter
  , Query = require("./query")
  , ObjectID = require("../../support/node-mongodb-native/lib/mongodb").ObjectID;

/**
 * @constructor
 * Can be used in either of the following 2 ways:
 * - new Document(callback, obj [, hydrate]);
 * - new Document(obj [, hydrate]);
 */
var Document = function(callback, obj, hydrate){
  // Bundle all properties we don't want to enumerate through under _
  Object.defineProperty(this, '_', {value: {
    doc: {}, // The hash/json representation of the document
    pres: {}, // A hash mapping method names to the lists of functions that should be executed before those methods are invoked
    posts: {}, // A hash mapping method names to the lists of functions that should be executed before those methods are invoked
    arrays: {}, 
    dirty: {}, // Keeps track of which property paths have been assigned a new value
    hydrated: {}, // properties that have been hydrated, only set when hydrate flag = true
    errors: []
  }});
  Object.defineProperty(this, '_getters', {value: {}, enumerable: false});
  var idx = (typeof arguments[0] == 'function') ? 1 : 0;
  this.isNew = !arguments[idx+1];
  this.init((idx) ? arguments[0] : null, arguments[idx], this.isNew);
};

sys.inherits(Document, EventEmitter);

Object.defineProperty(Document.prototype, 'isNew',{
  get: function(){ return this._.isNew; },
  set: function(val){ this._.isNew = val; }
});

Document.prototype.hydrated = function(path){
  return !!this._.hydrated[path];
};

Document.prototype.isDirty = function(path){
  return !!this._.dirty[path];
};

Document.prototype.inspect = function(){
  return '[' 
    + this._schema._name 
    + ' ' + sys.inspect(this._)
    + ']';
};

Document.prototype._setData = function(struct, obj, val, path, override){
  var p = path || [], count = flag = 0, i, l, prop, schema = this._schema, curpath;
  for(i=0,l=struct.length; i<l; i++){
    prop = struct[i];
    count++;
    if(typeof prop == 'string'){
      curpath = p.concat(prop).join('.');
      if(obj.hasOwnProperty(prop)){
        flag++;
        if(schema.paths[curpath].type == 'array'){
          this._.arrays[curpath] = new EmbeddedArray(obj[prop], curpath, schema.paths[curpath], this, !override);
          val[prop] = this._.arrays[curpath];
          if(!override){
            this._.hydrated[curpath] = true;
            this.emit('hydrate', [curpath,val[prop]]);
          } else this._.dirty[curpath] = [];
        }
        else if(schema.paths[curpath].type != 'virtual') {
          if(override){
            this.set(curpath, obj[prop]);
          } else {
            val[prop] = obj[prop];
            this._.hydrated[curpath] = true;
            this.emit('hydrate', [curpath,val[prop]]);
          }
        }
      } else if(override && (typeof schema.paths[curpath]._default == 'function')){ // set defaults 
          this.set(curpath, schema.paths[curpath]._default.apply(this));
      } 
    } else {
      prop = struct[i][0];
      if(obj.hasOwnProperty(prop) && !Array.isArray(obj[prop]) && typeof obj[prop] == 'object'){
        flag++;
        val[prop] = (val[prop] == undefined) ? {} : val[prop];
        var children = this._setData(struct[i][1], obj[prop], val[prop], p.concat(prop), override);
        count += children[0];
        flag += children[1];
      }
    }
  }
  if(!override && flag == count) this._.hydrated[ (p.length) ? p.join('.') : ''] = true; 
  return [count, flag];
};

Document.prototype._run = function(name, fn, args){
  var args = Array.prototype.slice.call(args),
      callback = args.shift(),
      pres = (this._schema._pres[name] || []).concat(this._.pres[name] || []),
      posts = (this._schema._posts[name] || []).concat(this._.posts[name] || []),
      override = this._schema._overrides[name],
      self = this;
  
  if(name == 'init'){
    var dataName = (args[1]) ? 'merge' : 'hydrate';
        pres = pres.concat(this._schema._pres[dataName] || [], this._.pres[dataName] || []);
        posts = posts.concat(this._schema._posts[dataName] || [], this._.posts[dataName] || []);
  }
  
  var total = pres.length,
      process = function(){
        if(--total === 0) complete.apply(self);
      },
      complete = function(){
        if(name == 'save'){
          self._validate(override, fn, args);
        } else {
          if(override) override.apply(self, [fn.bind(self)].concat(args));
          else fn.apply(this, args);
        }
      };
  
  if(posts.length){
    callback = (function(n, cb){
        return function(){
          if(cb) cb.apply(null,arguments);
          if(name != 'save' || this._.errors.length == 0) 
            for(var i=0, l=posts.length; i<l; i++) posts[i](self);
        }
    })(name, callback);
  }
  args.unshift(callback);
      
  if(total)
    for(var i=0, l=pres.length; i<l; i++) pres[i](process);
  else
    complete.apply(self);
};

/**
 * @param {Function} override
 * @param {Function} fn
 * @param {Array} args
 */
Document.prototype._validate = function(override, fn, args){
  var path, def, validators, validator, cb, i, l, v, len, self = this,
      toValidate = [],
      dirty = Object.keys(this._.dirty), 
      grandtotal = 0,
      
  complete = function () {
    if(--grandtotal <= 0) {
      if(override){
        override.apply(self, [fn.bind(self)].concat(args));
      } else {
        fn.apply(self,args); 
      }
    }
  };
  
  for(i=0, l=dirty.length; i<l; i++){
    path = dirty[i];
    def = this._schema.paths[path];
    validators = (def && typeof def.validators == 'object') ? Object.keys(def.validators) : [];
    
    if(validators.length){
      grandtotal += validators.length;
      for(v=0,len=validators.length; v<len; v++){
        validator = validators[v];
        cb = (function(v,p,t,scope){
          return function(passed,msg){
            if(!passed) scope._.errors.push({type: 'validation', name: v, path: p, schema: t, msg: msg}); 
            complete();
          };
        })(validator, path, def.type, self);
        toValidate.push([def.validators[validator], [this._get(path), cb]]);
      }
    }
  }
  
  for(var i=0,l=toValidate.length; i<l; i++){ 
    toValidate[i][0].apply(this, toValidate[i][1]);
  }
  if(!toValidate.length) complete();
};

/**
 * @param {String} path is the relative (to this._.doc) path of keys that locates a particular property. An example is "user.name.first"
 * @return {Object} the embedded document located at the path
 */
Document.prototype._get = function(path){
  var parts = path.split('.'), doc = this._.doc;
  for (var i = 0, l = parts.length; i < l; i++){
    doc = doc[parts[i]];
    if (typeof doc == 'undefined'){
      return undefined;
    }
  }
  return doc;
};

/**
 * Looks up path in this._schema.paths hash and returns the appropriate value that should
 * correspond to the path in this document. What is returned depends on the type that is
 * located at the path.
 * @param {String} path is string representing a chain of keys to traverse inside the document
 * @return
 */
Document.prototype.get = function(path){
  var type = this._schema.paths[path], i, l, prop, val = this._get(path);
  if(!type) return undefined;
  if(type.type == 'object'){
   //
  } else if(type.type == 'array'){
    return this._.arrays[path];
  } else {
   if(typeof type._castGet == 'function') val = type._castGet.apply(this,[val,path,type]);
   for(i=0,l=type.getters.length; i<l; i++) val = type.getters[i].apply(this,[val,path,type]);
   return val;
  }
};

/**
 * Sets a value at the location defined by the path in the document.
 * Marks the path as dirty.
 * @param {String} path is string representing a chain of keys to traverse inside the document
 * @param {Object} val is the value we want to set the value located at path to
 */
Document.prototype._set = function(path,val){
  var parts = path.split('.'), doc = this._.doc, prev = this._.doc;
  for (var i = 0, l = parts.length-1; i < l; i++){
    doc = doc[parts[i]];
    if (typeof doc == 'undefined'){
      doc = prev = prev[parts[i]] = {};
    }
  }
  if (doc[parts[parts.length-1]] !== val) {
    doc[parts[parts.length-1]] = val;
    this._.dirty[path] = true;
  }
};

Document.prototype.set = function(path,val){
  var type = this._schema.paths[path], i, l, prop, val;
  if(!type) return;
  if(type.type == 'object'){
    for(prop in val) this.set(path+'.'+prop,val[i]);
  } else if(type.type == 'array'){
    this._set(path,val);
  } else {
    var setters = type._strict ? type.strictSetters : type.setters;
    for(i=setters.length-1, l=0; i>=0; i--) {
      // Attempt type coercion
      try {
        var ret = setters[i].apply(this,[val,path,type]);
        // Coercion failure
        if (Error == ret) {
          var err = new Error('failed to cast ' + path + ' value of ' + JSON.stringify(val) + ' to ' + type.type);
          this._.errors.push(err); 
        } else {
          val = ret;
        }
      } catch (err) {
        this._.errors.push(err);
      }
    }
    if(typeof type._castSet == 'function') val = type._castSet.apply(this,[val,path,type]);
    if(type.type != 'virtual') this._set(path,val);
  }
};

/**
 * Adds fn to the list of functions we'd like to invoke before we invoke the function known
 * as method.
 * @param {String} method is the name of the method that we'd like fn to run before
 * @param {Function} fn is the callback we'd like to run just before the function named method is invoked
 * @return {Document} this
 */
Document.prototype.pre = function(method, fn){
  if (!(method in this._.pres)) this._.pres[method] = [];
  this._.pres[method].push(fn);
  return this;
};

/**
 * The mirror sibling function to Document.prototype.pre.
 * Adds fn to the list of functions we'd like to invoke before we invoke the function known
 * as method.
 * @param {String} method is the name of the method that we'd like fn to run after
 * @param {Function} fn is the callback we'd like to run just after the function named method is invoked
 * @return {Document} this
 */
Document.prototype.post = function(method, fn){
  if (!(method in this._.posts)) this._.posts[method] = [];
  this._.posts[method].push(fn);
  return this;
};

Document.prototype.toObject = Document.prototype.toJSON = function () {
  return this._.doc;
};

Document.prototype.toJSON = function(){
  return this._.doc;
};


var EmbeddedArray = Subclass(Array, {
  /**
   * @constructor
   * @param {Array} arr
   * @param {String} path is the property path to the array
   * @param {Schema} schema
   * @param {Object} scope
   * @param {Boolean} hydrate
   */
  constructor: function(arr, path, schema, scope, hydrate){
    var arr = (Array.isArray(arr)) ? arr : [];
    Object.defineProperty(this, '_', {
      value: {
        path: path,
        schema: schema,
        scope: scope,
        getters: schema.getters,
        setters: schema.setters,
        validators: schema.validators
      }
    });
    
    if(scope._schema._embedded[path]){
      this._.doc = scope._schema._embedded[path];
      this._.docs = [];
    }
    
    if(hydrate){
      if(this._.doc) for(var i=0,l=arr.length; i<l; i++) this[i] = new this._.doc(arr[i]);
      else for(var i=0,l=arr.length; i<l; i++) this[i] = arr[i];
    }
    else{
      for(var i=0,l=arr.length; i<l; i++) this.set(i, arr[i]);
    }
  },
  
  _get: function(idx){
    var val = this[idx];
    for(i=0,l=this._.getters.length; i<l; i++) val = this._.getters[i].apply(this._.scope,[val,this._.path,this._.schema]);
    return val;
  },
  
  'get': function(idx){
    return (this._.doc) ? this._.docs[idx] : this._get(idx); 
  },
  
  _set: function(idx, val){
    var val;
    for(i=0,l=this._.setters.length; i<l; i++) val = this._.setters[i].apply(this._.scope,[val,this._.path,this._.schema]);
    this[idx] = val[0];
  },
  
  'set': function(idx, val){
    if(this._.doc){
      this._.docs[idx] = new this._.doc(val);
      this[idx] = this._.docs[idx]._.doc;
    } else {
      this._set(idx, val);
    }
    if(!this._.scope._.dirty[this._.path]) this._.scope._.dirty[this._.path] = [];
    this._.scope._.dirty[this._.path].push(idx);
  },
  
  push: function(){
    for(var i=0,l=arguments.length; i<l; i++) this.set(this.length, arguments[i]);
    return this;    
  },
  
  forEach: function(fn, scope){
    for(var i=0,l=this.length; i<l; i++) fn.apply(scope, [this.get(i), i]);
    return this;
  }
  
});

var EmbeddedDocument = this.EmbeddedDocuemnt = function(){
  
};
sys.inherits(EmbeddedDocument, Document);


module.exports = {
  
  Document: Document,
  
  EmbeddedArray: EmbeddedArray,
  
  EmbeddedDocument: EmbeddedDocument,
  
  Hooks: {

    init: function(fn, obj, isNew){
      this._setData(this._schema._struct, obj || {}, this._.doc, [], isNew);
      if(fn) fn();
      return this;
    },

    hydrate: function(fn, obj){
      this._setData(this._schema._struct, obj || {}, this._.doc, [], false);
      if(fn) fn();
      return this;
    },

    merge: function(fn, obj){
      this._setData(this._schema._struct, obj || {}, this._.doc, [], true);
      if(fn) fn();
      return this;
    },

    save: function(fn){
        var self = this;
        if(this._.errors.length){
          var errors = this._.errors;
          this._.errors = [];
          if(fn) fn(errors, this);
          return;
        }

        if(this.isNew){
          this._collection.save(this._.doc, function(err){
            self.isNew = false;
            if(fn) fn(null, self);
          });
        } else {
          this._collection.update({_id: this._id},{$set: this._getDirty()},function(){
            self._dirty = {};
            if(fn) fn(null, self);
          });
        }
      return this;
    },

    remove: function(fn){
      if (this.isNew){
        if (fn) fn();
        return this;
      }
      this._collection.remove({ _id: this._id }, fn || function(){});
      return this;    
    } 

  },
  
  Statics: {

    find: function(where, hydrate){
      // Shortcut for this.findById()
      if (where instanceof ObjectID) {
        return this.findById.apply(this, arguments);
      }

      var query = new Query(this);
      return query.find.apply(query, arguments);
    },

    findById: function(id, fn, hydrate){
      id = (id instanceof ObjectID || id.toHexString) ? id : ObjectID.createFromHexString(id);
      var writer = this.find({_id: id}, hydrate);
      if (fn) return writer.first(fn);
      return writer;    
    },
    
    all: function(fn){
      return this.find().all(fn);
    },
    
    first: function(n, fn){
      return this.find().first(n, fn);
    },

    remove: function(where, fn){
      var self = this;
      this._collection.remove(where || {}, function(err){
        if (err) return self._connection._error(err);
        fn();
      });
      return this;    
    },

    count: function(where, fn){
      var self = this;
      if ('function' == typeof where) fn = where, where = {};
      this._collection.count(where || {}, function(err, count){
        if (err) return self._connection._error(err);
        fn(count);
      });
      return this;  
    },
    
    drop: function(fn){
      var self = this;
      this._collection.drop(function(err, ok){
        if (err) return self._connection._error(err);
        fn(ok);
      });
    }
    
  },
 
  /**
   * Adds an un-enumerable method to the constructor's prototype.
   * @param {Function} ctor is the constructor whose prototype we want to extend
   * @param {String} name is the name of the method
   * @param {Function} fn is the value of the getter
   */ 
  defineMethod: function(ctor, name, fn){
    Object.defineProperty(ctor.prototype, name, {
      value: fn
    });
  },
  
  /**
   * Adds an un-enumerable hook to the constructor's prototype.
   * @param {Function} ctor is the constructor whose prototype we want to extend
   * @param {String} name is the name of the hook
   * @param {Function} fn is the function we want to run
   */
  defineHook: function(ctor, name, fn){
    Object.defineProperty(ctor.prototype, name, {
      value: function(){
        return this._run(name, fn, arguments);
      }
    });
  },
 
  /**
   * Defines the getters and setters on the prototype
   * Used in Connection.prototype._compile as:
   *   Doc.compileEtters(schema._struct, model.prototype)
   * Used in EmbeddedArray constructor
   * @param {Array} struct is an array of either:
   *                1. The string names of the model's attributes
   *                2. Elements of the form [attribute name, subtype struct]
   * @param {Object} prototype is the prototype of the model we want to define etters for
   * @param {String} path is an optional array of attributes representing an attribute chain
   * @param {Object} scope is an optional model
   */
  compileEtters: function(struct,prototype,path,scope){
    var p = path || [], i, l, prop, curpath;
    for(i=0,l=struct.length; i<l; i++){
      prop = struct[i];
      if(typeof prop == 'string'){
        curpath = p.concat(prop).join('.');
        Object.defineProperty(prototype, prop, {
          get: (function(path,bind){
            return function(){
              if(bind) return bind.get(path);
              else return this.get(path);
            }
          })(curpath,scope),
          set: (function(path,bind){
            return function(val){
              if(bind) bind.set(path,val);
              else this.set(path,val);
            }
          })(curpath,scope),
          enumerable: true
        });
      } else {
        prop = struct[i][0],
        curpath = p.concat(prop).join('.');
        Object.defineProperty(prototype, prop, {
          get: (function(path,p,struct,scp){
            return function(){
              var scope = scp || this;
              if(!(path in scope._getters)){
                var nested = function(){};
                module.exports.compileEtters(struct, nested.prototype, p, scope);
                scope._getters[path] = new nested();
              }
              return scope._getters[path];
            }
          })(curpath,p.concat(prop),struct[i][1], scope),
          enumerable: true
        });
      }
    }
  }
  
};
