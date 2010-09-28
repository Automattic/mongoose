var sys = require('sys')
  , EventEmitter = require('events').EventEmitter;

var Document = this.Base = function(callback, obj, hydrate){
  Object.defineProperty(this, '_', {value: {
    doc: {},
    pres: {},
    posts: {},
    dirty: {},
    hydrated: {},
    errors: []
  }, enumerable: false});
  
  var idx = (typeof arguments[0] == 'function') ? 1 : 0;
  
  this.isNew = !arguments[idx+1];
//  this[this.isNew ? 'merge' : 'hydrate']( (idx) ? arguments[0] : null, arguments[idx] );
  this.init((idx) ? arguments[0] : null, arguments[idx], this.isNew);
};
inherits(Document, EventEmitter);

Object.defineProperty(Document.prototype, 'isNew',{
  get: function(){ return this._.isNew; },
  set: function(val){ this._.isNew = val; },
  enumerable: false
});

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
          if(override){
            this.set(curpath, new EmbeddedArray(obj[prop]));
          } else {
            val[prop] = new EmbeddedArray(obj[prop]);
            this._.hydrated[curpath] = true;
            this.emit('hydrate', [curpath,val[prop]]);
          }
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
      if(obj.hasOwnProperty(prop) &&
      (Object.prototype.toString.call(obj[prop]) == '[object Object]')){
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
      pres = this._schema._pres[name] || [],
      posts = this._schema._posts[name] || [],
      override = this._schema._overrides[name],
      self = this;
  if (this._.pres[name] && this._.pres[name].length){
    pres = pres.concat(this._.pres[name]);
  }
  if (this._.posts[name] && this._.posts[name].length){
    posts = posts.concat(this._.posts[name]);
  }
  
  if(name == 'init'){
    var dataName = (args[1]) ? 'merge' : 'hydrate';
        pres = pres.concat(this._schema._pres[dataName] || []);
        posts = posts.concat(this._schema._posts[dataName] || []);

    if (this._.pres[dataName] && this._.pres[dataName].length){
      pres = pres.concat(this._.pres[dataName]);
    }
    if (this._.posts[dataName] && this._.posts[dataName].length){
      posts = posts.concat(this._.posts[dataName]);
    }
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
            posts.forEach(function(fn){ 
              fn.call(self); 
            });
        }
    })(name, callback);
  }
  args.unshift(callback);
      
  if(total){
    pres.forEach(function(fn){ 
      fn(process); 
    });
  }
  else{
    complete.apply(self);
  }
};

Document.prototype._validate = function(override, fn, args){
  var path, def, validators, i, l, v, len, self = this,
      toValidate = [],
      dirty = Object.keys(this._.dirty), 
      grandtotal = 0,
      
  complete = function(){
    if(--grandtotal === 0) {
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
    validators = Object.keys(def.validators);
    
    if(validators.length){
      grandtotal += validators.length;
      for(v=0,len=validators.length; v<len; v++){
        var validator = validators[v];
        var cb = (function(v,p,t,scope){
          return function(passed,msg){
            if(!passed){
              scope._.errors.push({type: 'validation', name: v, path: p, schema: t, msg: msg});
            } 
            complete();
          };
        })(validator, path, type, self);
        toValidate.push([def.validators[validator], [this._get(path), cb]]);
      }
    }
  }
  
  for(i=0,l=toValidate.length; i<l; i++){
    toValidate[i][0].apply(this, toValidate[i][1]);
  }

};

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

Document.prototype.get = function(path){
  var type = this._schema.paths[path], i, l, prop, val = this._get(path);
  if(!type) return undefined;
  if(type.type == 'object'){
    
  } else if(type.type == 'array'){
    
  } else {
   if(typeof type._castGet == 'function') val = type._castGet.apply(this,[val,path,type]);
   for(i=0,l=type.getters.length; i<l; i++) val = type.getters[i].apply(this,[val,path,type]);
   return val;
  }
};

Document.prototype._set = function(path,val){
  var parts = path.split('.'), doc = this._.doc, prev = this._.doc;
  for (var i = 0, l = parts.length-1; i < l; i++){
    doc = doc[parts[i]];
    if (typeof doc == 'undefined'){
      doc = prev = prev[parts[i]] = {};
    }
  }
  doc[parts[parts.length-1]] = val;
  this._.dirty[path] = true;
};

Document.prototype.set = function(path,val){
  var type = this._schema.paths[path], i, l, prop, val;
  if(!type) return;
  if(type.type == 'object'){
    for(prop in val) this.set(path+'.'+prop,val[i]);
  } else if(type.type == 'array'){
    
  } else {
    for(i=type.setters.length-1, l=0; i>=0; i--){
      val = type.setters[i].apply(this,[val,path,type]);
    }
    if(typeof type._castSet == 'function'){
      val = type._castSet.apply(this,[val,path,type]);
    }
    if(type.type != 'virtual') this._set(path,val);
  }
};

Document.prototype.pre = function(method, fn){
  if (!(method in this._.pres)) this._.pres[method] = [];
  this._.pres[method].push(fn);
  return this;
};

Document.prototype.post = function(method, fn){
  if (!(method in this._.posts)) this._.posts[method] = [];
  this._.posts[method].push(fn);
  return this;
};

Document.prototype.hydrated = function(path){
  return !!this._.hydrated[path];
};

Document.prototype.isDirty = function(path){
  return !!this._.dirty[path];
};

var EmbeddedArray = function(arr,type){
  
  var arr = (arr instanceof Array) ? arr : [];
  
  this.push(); // hack to initialize 'length' so we can hide it
  
  Object.defineProperty(this, 'length', {
    value: arr.length,
    enumerable: false,
    configurable: false
  });
  
  Object.defineProperty(this, 'type', {
    value: type,
    enumerable: false
  });
  
  for(i=0,l=arr.length; i<l; i++){
    this.push(arr[i]);
  }
};

EmbeddedArray.prototype = {
  
  __proto__ : [], // this instanceof Array == true
  
  // special
  
  get: function(){
    
  },
  
  set: function(){
    
  },
  
  //...
  
  // mutators
  
  pop: function(){
    
  },
  
  push: function(){
    
  },
  
  reverse: function(){
    
  },
  
  shift: function(){
    
  },
  
  sort: function(){
    
  },
  
  splice: function(){
    
  },
  
  unshift: function(){
    
  },
  
  // accessors
  
  concat: function(){
    
  },
  
  join: function(){
    
  },
  
  toString: function(){

  },
  
  indexOf: function(){
    
  },
  
  lastIndexOf: function(){
    
  },
  
  // iterators
  
  filter: function(){
    
  },
  
  forEach: function(){
    
  },
  
  every: function(){
    
  },
  
  map: function(){
    
  },
  
  some: function(){
    
  }

};

var EmbeddedDocument = this.EmbeddedDocuemnt = function(){
  
};
inherits(EmbeddedDocument, Document);


var Hooks = {
  
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
        if(fn) fn(null, this)
        return;
      }
      
      if(this.isNew){
        this._collection.save(this._.doc, function(){
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
  
};

var Statics = {
  find: function(where, hydrate){
    if (arguments.length == 3) throw new Error('Subsets are not implemented yet.');
    var _where = where || {}, self = this, casters = this.prototype._casters, cast = this.prototype._cast,
    _writer = new query.Writer(function(query, options, promise){
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
  
  findById: function(id, fn, hydrate){
    id = (id instanceof ObjectID || id.toHexString) ? id : ObjectID.createFromHexString(id);
    var writer = this.find({_id: id}, hydrate);
    if (fn) return writer.first(fn);
    return writer;    
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
    this._collection.count(where || {}, function(err, count){
      if (err) return self._connection._error(err);
      fn(count);
    });
    return this;    
  }
};

module.exports = {
  
  Document: Document,
  
  EmbeddedArray: EmbeddedArray,
  
  EmbeddedDocument: EmbeddedDocument,
  
  Hooks: Hooks,
  
  Statics: Statics,
  
  defineMethod: defineMethod,
  
  defineHook: defineHook,
  
  compileEtters: compileEtters,
  
  inherits: inherits
};


function defineMethod(ctor, name, fn){
  Object.defineProperty(ctor.prototype, name, {
    value: fn,
    enumerable: false
  })
};

function defineHook(ctor, name, fn){
  Object.defineProperty(ctor.prototype, name, {
    value: function(){
      return this._run(name, fn, arguments);
    }, 
    enumerable: false
  });
};


function compileEtters(struct,prototype,model,path,scope){
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
      var prop = struct[i][0],
      curpath = p.concat(prop).join('.');
      Object.defineProperty(prototype, prop, {
        get: (function(path,p,struct,scp){
          return function(){
            var scope = scp || this;
            if(!(path in scope._getters)){
              var nested = function(){};
               compileEtters(struct, nested.prototype, model, p, scope);
              scope._getters[path] = new nested();
            }
            return scope._getters[path];
          }
        })(curpath,p.concat(prop),struct[i][1], scope),
        enumerable: true
      });
    }
  }
};


function inherits (ctor, superCtor) {
    Object.defineProperty(ctor,'super_', { value: superCtor, enumerable: true });
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
            value: ctor,
            enumerable: false
        }
    });
};