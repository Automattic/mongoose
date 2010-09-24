var sys = require('sys')
  , EventEmitter = require('events').EventEmitter;

var Document = this.Base = function(obj,hydrate){
  Object.defineProperty(this, '_', {value: {
    doc: {},
    pres: {},
    posts: {},
    dirty: {},
    hydrated: {}
  }, enumerable: false});
  this.isNew = !hydrate;
  if(hydrate) this.hydrate(obj);
  else this.merge(obj);
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
            this.emit('hydrate', [curpath,obj,prop]);
          }
        }
        else if(schema.paths[curpath].type != 'virtual') {
          if(override){
            this.set(curpath, obj[prop]);
          } else {
            val[prop] = obj[prop];
            this._.hydrated[curpath] = true;
            this.emit('hydrate', [curpath,obj,prop]);
          }
        }
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
  var pres = this._schema._pres[name] || [], 
      override = this._schema._overrides[name],
      self = this;
  if (this._.pres[name] && this._.pres[name].length){
    pres = this._schema._pres[name].concat(this._.pres[name]);
  }
  if (pres){
    var total = pres.length;
    function complete(){
      if (--total === 0){
        if (override){
          override.apply(self, [fn.bind(self)].concat(Array.prototype.slice.call(args)));
        } else {
          fn.apply(this, args);
        }
      }
    };
    if(pres.length){
      pres.forEach(function(fn){
        fn(complete);
      }); 
    } else {
      if(override){
          override.apply(self, [fn.bind(self)].concat(Array.prototype.slice.call(args)));
        } else {
          fn.apply(this, args);
      }
    }
  }
  return this;
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

var EmbeddedArray = function(){
  
};
EmbeddedArray.prototype.__proto__ = Array.prototype;

var EmbeddedDocument = this.EmbeddedDocuemnt = function(){
  
};
inherits(EmbeddedDocument, Document);


var Hooks = {
  
  hydrate: function(obj,complete){
    this._setData(this._schema._struct, obj || {}, this._.doc, [], false);
    return this;
  },

  merge: function(obj,complete){
    this._setData(this._schema._struct, obj || {}, this._.doc, [], true);
    return this;
  },
  
  save: function(fn){
    var self = this;
    if(this.isNew){
      this._collection.save(this._.doc, function(){
        self.isNew = false;
        if(fn) fn();
      });
    } else {
      this._collection.update({_id: this._id},{$set: this._getDirty()},function(){
        self._dirty = {};
        if(fn) fn();
      });
    }
    return this;
  },
  
  remove: function(){
    if (this.isNew){
      if (fn) fn();
      return this;
    }
    this._collection.remove({ _id: this._id }, fn || function(){});
    return this;    
  } 
  
};

var Statics = {
  find: function(){
    
  },
  
  findById: function(){
    
  },
  
  remove: function(){
    
  },
  
  count: function(){
    
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