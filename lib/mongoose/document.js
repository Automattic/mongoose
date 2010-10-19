var sys = require('sys')
  , Schema = require('./schema')
  , EventEmitter = require('events').EventEmitter
  , Writer = require("./query").Writer
  , ObjectID = require("../../support/node-mongodb-native/lib/mongodb").ObjectID;

/**
 * @constructor
 * This is what every model class inherits from. i.e., mongoose.User inherits
 * from Document.
 * Can be used in either of the following 2 ways:
 * - new Document(callback, obj, hydrate);
 * - new Document(obj, hydrate);
 */
var Document = function(callback, obj, hydrate){
  // Bundle all properties we don't want to enumerate through under _
  Object.defineProperty(this, '_', {value: {
    doc: {}, // The hash/json representation of the document
    pres: {}, // A hash mapping method/task names to the lists of functions that should be executed before those methods are invoked
    posts: {}, // A hash mapping method names to the lists of functions that should be executed before those methods are invoked
    arrays: {},
    dirty: {}, // Keeps track of which property paths have been assigned a new value
    hydrated: {}, // Keeps track of which properties we have hydrated
    errors: []
  }, enumerable: false});
  
  var idx = (typeof arguments[0] == 'function') ? 1 : 0;
  this.isNew = !arguments[idx+1];
  this.init((idx) ? arguments[0] : null, arguments[idx], this.isNew);
};
sys.inherits(Document, EventEmitter);

Object.defineProperty(Document.prototype, 'isNew',{
  get: function(){ return this._.isNew; },
  set: function(val){ this._.isNew = val; },
  enumerable: false
});

Document.prototype.hydrated = function(path){
  return !!this._.hydrated[path];
};

Document.prototype.isDirty = function(path){
  return !!this._.dirty[path];
};

/**
 * An important method that powers the Hook methods: init, hydrate, and merge.
 * @param {Array} struct is an array of members that can be either:
 *   1. A model attribute name that define this (for cases where this is embedded in another document)
 *   2. Or an array (pair) [the attribute name, array of sub attribute names of the attribute name]

 * @param {Object} obj is the hash of data changes we want to make
 * @param {Object} val
 * @param {Array} path is the array of property names that define this (for cases where this is embedded in another document)
 * @param {Boolean} override is true if we don't want hydration; false if we do want hydration
 * @return {Array} [count, flag]
 */
Document.prototype._setData = function(struct, obj, val, path, override){
  // TODO Doc.compileEtters has a similar function format. Factor out common pattern.
  var p = path || [],
      count = flag = 0, // flag is the cardinality of the intersection between struct attribute names and obj key names
      i, l, prop, 
      schema = this._schema,
      curpath;
  for(i=0,l=struct.length; i<l; i++, count++){
    prop = struct[i];
    if(typeof prop == 'string'){
      curpath = p.concat(prop).join('.');
      if(obj.hasOwnProperty(prop)){ // If we're trying to modify a registered attribute
        flag++;
        if(schema.paths[curpath].type == 'array'){ // Handle embedded array
          this._.arrays[curpath] = new EmbeddedArray(obj[prop], curpath, schema.paths[curpath], this, !override);
          val[prop] = this._.arrays[curpath].arr;
          if(!override){
            this._.hydrated[curpath] = true;
            this.emit('hydrate', [curpath,val[prop]]); // TODO Where are our listeners?
          } else {
            this._.dirty[curpath] = [];
          }
        } else if(schema.paths[curpath].type != 'virtual') {
          if(override){
            this.set(curpath, obj[prop]);
          } else {
            val[prop] = obj[prop];
            this._.hydrated[curpath] = true;
            this.emit('hydrate', [curpath,val[prop]]); // TODO Where are our listeners?
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

/**
 * This is called every time we run a hook.
 * Standard and custom hooks are compiled into the model at runtime.
 * When we call a hook -- e.g., user.save(...) -- we are really just calling
 * a wrapper function around Document.prototype._run (See Doc.Statics.defineHook 
 * where we call _run from.)
 *
 * _run does the following:
 * - Setup:
 *   1. If the hook is 'init' and we are passing args, then add the pre and post actions of 'merge'
 *      to 'init' pre and post actions
 *      Else If the hook is 'init' and we are not passing args, then add the pre and post actions 
 *      of 'hydrate' to 'init' pre and post actions
 *   2. Adds the post actions to the hook (aka task) callback that gets run after hook invocation
 * - Invocation:
 *   1. Invoke all the pre actions
 *   2a. If the hook/task is 'save', then call _validate(override, fn, args)
 *   2b. If the hook/task is not 'save', then call override to invoke the function or (if no
 *       override) then just invoke the function.
 *   
 * @param {String} name is the name of the hook.
 * @param {Function} fn is the function that is invoked when we run this hook
 * @param {typeof arguments} args are the arguments that the fn will accept on invocation.
 *  The typical arguments will be of the form (callback, )
 */
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
 
  // Add post actions to the callback 
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
  var path, def, validators, validator, cb, v, len, self = this,
      toValidate = [],
      dirty = this._.dirty,
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
 
  for (path in dirty) { 
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
 * Gets the value located at path.
 * @param {String} path is the relative (to this._.doc) path of keys that locates a particular property. An example is "user.name.first"
 * @return {Object} the value located at the path
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
 * Used from Doc.compileEtters
 * @param {String} path is string representing a chain of keys to traverse inside the document
 * @return
 */
Document.prototype.get = function(path){
  var type = this._schema.paths[path], i, l, prop, val = this._get(path);
  if(!type) return undefined;
  if(type.type == 'object'){
   // TODO
  } else if(type.type == 'array'){
    return this._.arrays[path];
  } else if (type.type === "dbref") {
    // TODO
    return this._.dbrefs[path];
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
  } else if (type.type === "dbref") {
    // TODO
  } else {
    for(i=type.setters.length-1, l=0; i>=0; i--) val = type.setters[i].apply(this,[val,path,type]);
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

// TODO Test
// TODO Handle type 'array'
Document.prototype._getDirty = function () {
  var dirtyJSON = {};
  for (var path in this._.dirty) {
    if (this.isDirty(path)) {
      dirtyJSON[path] = this._.doc[path];
    }
  }
};

/**
 * @constructor
 * @param {Array} arr
 * @param {String} path is the property path to the array
 * @param {Schema} schema
 * @param {Object} scope
 * @param {Boolean} hydrate
 */
var EmbeddedArray = function(arr, path, schema, scope, hydrate){
  var arr = (Array.isArray(arr)) ? arr : [];
  this.path = path;
  this.schema = schema;
  this.scope = scope;
  this.arr = [];
  this._getters = [];
  this._setters = [];
  if(schema.options instanceof this.scope._schema.constructor){
    var schema = schema.options, prop, 
        embeddedDoc = function(){
          Document.apply(this, arguments);
        };
    sys.inherits(embeddedDoc, schema._model);
    module.exports.defineMethod(embeddedDoc, '_getters', {});

 //   for(prop in schema._hooks) module.exports.defineHook(embeddedDoc, prop, schema.options._hooks[prop]);
//    for(prop in schema._methods) module.exports.defineMethod(embeddedDoc, prop, schema.options._methods[prop]);
    module.exports.compileEtters(schema.options._struct, embeddedDoc.prototype);
    
    this._doc = embeddedDoc;
    this.docs = [];
  } else {
    if(hydrate) this.arr = arr;
    else{
      for(var i=0,l=arr.length; i<l; i++) this.set(i, arr[i]);
    }
    
  }
};

Object.defineProperty(EmbeddedArray.prototype, 'length',{
  get: function(){ return this.arr.length },
  enumerable: false
});

EmbeddedArray.prototype._get = function(idx){
  var val = this.arr[idx];
  for(i=0,l=this._getters.length; i<l; i++) val = this._getters[i].apply(this.scope,[val,path,this.schema]);
  return val;
};

  
EmbeddedArray.prototype.get = function(idx){
    return (this._doc) ? this.docs[idx] : this._get(idx); 
};

EmbeddedArray.prototype._set = function(idx, val){
  var val;
  for(i=0,l=this._setters.length; i<l; i++) val = this._setters[i].apply(this.scope,[val,path,this.schema]);
  this.arr[idx] = val;
};
  
EmbeddedArray.prototype.set = function(idx, val){
    if(this._doc){
      this._doc[idx] = new this._doc(val);
      this.arr = this._doc[idx]._.doc;
    } else {
      this._set(idx, val);
    }
    if(!this.scope._.dirty[this.path]) this.scope._.dirty[this.path] = [];
    this.scope._.dirty[this.path].push(idx);
};

EmbeddedArray.prototype.push = function(){
  for(var i=0,l=arguments.length; i<l; i++) this.set(this.arr.length, arguments[i]);
  return this;
};

EmbeddedArray.prototype.pull = function(atomic){
  // remove 
};

EmbeddedArray.prototype.pop = function(atomic){
  // remove end
};

EmbeddedArray.prototype.shift = function(){
  // remove front
};

EmbeddedArray.prototype.unshift = function(){
  // add front
};

EmbeddedArray.prototype.splice = function(index, howMany, el1, elN){
  
};

EmbeddedArray.prototype.forEach = function(fn, scope){
  for(var i=0,l=this.arr; i<l; i++) fn.apply(scope, [this.get(i), i]);
  return this;
};

EmbeddedArray.prototype.toJSON = function(){
  return Array.prototype.slice.call(this, 0);
};

var EmbeddedDocument = this.EmbeddedDocuemnt = function(){
  
};
sys.inherits(EmbeddedDocument, Document);


module.exports = {
  
  Document: Document,
  
  EmbeddedArray: EmbeddedArray,
  
  EmbeddedDocument: EmbeddedDocument,
  
  Hooks: {

    /**
     * @param {Function} fn is the callback function to call after setting the data
     * @param {Object} obj is the data we're trying to project onto this // TODO
     * @param {Boolean} isNew is true if the Document instance is not yet persisted in mongodb
     * @return {Document} this
     */
    init: function(fn, obj, isNew){
      // this._schema.struct is setup when we use the attribute factory method defined within Mongoose.prototype.type.
      // e.g., 
      // document('user')
      //  .string('username')
      // Here, 'username' would be added to this._schema._struct where this is the Document instance
      this._setData(this._schema._struct, obj || {}, this._.doc, [], isNew);
      if(fn) fn();
      return this;
    },

    /**
     * @param {Function} fn is the callback function to call after setting the data
     * @param {Object} obj is the data we're trying to project onto this // TODO
     * @param {Boolean} isNew is true if the Document instance is not yet persisted in mongodb
     * @return {Document} this
     */
    hydrate: function(fn, obj){
      this._setData(this._schema._struct, obj || {}, this._.doc, [], false);
      if(fn) fn();
      return this;
    },

    /**
     * @param {Function} fn is the callback function to call after setting the data
     * @param {Object} obj is the data we're trying to project onto this // TODO
     * @return {Document} this
     */
    merge: function(fn, obj){
      this._setData(this._schema._struct, obj || {}, this._.doc, [], true);
      if(fn) fn();
      return this;
    },

    /**
     * Saves this to mongodb.
     * If this has any validation errors, then
     * 1. Don't talk to mongodb.
     * 2. Just invoke the callback, passing the errors to it.
     *
     * Otherwise...
     * If this is new, then
     * 1. Save to the JSON representation of this to the collection.
     * 2. Flag this as being not new.
     * 3. Invoke the (optional) callback
     * If this is not new, then
     * 1. Update the dirty attributes of this via the collection.
     * 2. Invoke the (optional) callback
     *
     * @param {Function} fn is the optional callback with function profile fn(errors, record)
     * @return {Document} this
     */
    save: function(fn){
      var self = this;
      if(this._.errors.length){
        if(fn) fn(this._.errors, this);
        return this;
      }

      if(this.isNew){
        this._collection.save(this._.doc, function(){
          self.isNew = false;
          // TODO Is _id ever set here?
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

    /**
     * Removes this from mongodb.
     * If this is new (not persisted to the db), then just invoke the callback fn.
     * If this is not new (persisted to the db), then remove the object by delegating
     * to the mongodb collection (which is linked to the connection), passing the
     * callback fn to be called upon removal.
     * @param {Function} fn is the callback function
     * @return {Document} this
     */
    remove: function(fn){
      if (this.isNew){
        if (fn) fn();
        return this;
      }
      this._collection.remove({ _id: this._id }, fn || function(){});
      return this;    
    } 

  },
 
  // Class methods to be defined on each model class 
  Statics: {

    /**
     * Returns a new Writer that finds the query
     * @param {Object} where defines the conditions of the query
     * @param {Boolean} hydrate
     * @return {Writer}
     */
    find: function(where, hydrate){
      if (arguments.length == 3) throw new Error('Subsets are not implemented yet.');
      var _where = where || {}, self = this, casters = this.prototype._casters = this.prototype._casters || {}, cast = this.prototype._cast,
      _writer = new Writer(function(query, options, promise){
        self._collection.find(query, options, function(err, cursor){
          if (err) return self._connection._error(err);
          var results = [];
          cursor.each(function(err, doc){
            if (err) return self._connection._error(err);
            if(doc != null){
              if ('$err' in doc) return self._connection._error(doc['$err']); 
              results.push((hydrate !== false) ? new self(doc, true) : doc);
            } else {
              promise.complete(results);
            }
          });
        });
      }),

      castsub = function(path,obj){
       for(var key in {$in: 1, $nin: 1, $all: 1})
        if(Array.isArray(obj[key])) 
          for(var i=0,l=obj[key].length; i<l; i++) 
            obj[key][i] = cast(casters[path], obj[key][i]);
       return obj;
      };

       for(var i in _where){
         _writer.where(i, ((!casters[i]) ? _where[i] :
            (!Array.isArray(_where[i]) && typeof _where[i] == 'object') ?
            castsub(i, _where[i]) : cast(casters[i], _where[i])));
       }
      return _writer;
    },

    /**
     * A special case of find, where we find by the primary key/id.
     * @param {ObjectID|String} id is either an ObjectID or a hex string
     * @param {Function} fn is the callback with profile fn(record)
     * @param {Boolean} hydrate
     * @return {Writer}
     */
    findById: function(id, fn, hydrate){
      id = (id instanceof ObjectID || id.toHexString) ? id : ObjectID.createFromHexString(id);
      var writer = this.find({_id: id}, hydrate);
      if (fn) return writer.first(fn);
      return writer;
    },

    /**
     * Removes records that match a particular query from mongodb.
     * @param {Object} where is the set of conditions. Anything matching these will be removed.
     * @param {Function} fn is the callback with profile fn()
     * @return {Function} the constructor model class
     */
    remove: function(where, fn){
      var self = this;
      this._collection.remove(where || {}, function(err){
        if (err) return self._connection._error(err);
        fn();
      });
      return this;
    },

    /**
     * @param {Object} where is the set of conditions. Anything matching these will be counted.
     * @param {Function} fn is the callback with profile fn(count)
     * @return {Function} the constructor model class
     */
    count: function(where, fn){
      var self = this;
      this._collection.count(where || {}, function(err, count){
        if (err) return self._connection._error(err);
        fn(count);
      });
      return this;
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
      value: fn,
      enumerable: false
    })
  },
  
  /**
   * Adds an un-enumerable hook to the constructor's prototype.
   * This is how custom hooks as well as standard hooks (init, hydrate, merge, save, remove)
   * are compiled into the model (from Connection.prototype._compile(modelName))
   * @param {Function} ctor is the constructor whose prototype we want to extend
   * @param {String} name is the name of the method or task that we want to define the hook relative to
   * @param {Function} fn is the function we want to run
   */
  defineHook: function(ctor, name, fn){
    Object.defineProperty(ctor.prototype, name, {
      value: function(){
        return this._run(name, fn, arguments);
      }, 
      enumerable: false
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
   * @param {Array} path is an optional array of attributes representing an attribute chain
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
