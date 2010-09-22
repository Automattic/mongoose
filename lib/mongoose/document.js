var sys = require('sys')
  , EventEmitter = require('events').EventEmitter;

var Document = this.Base = function(obj,hydrate){
  this._pres = {};
  this._posts = {};
  this.__doc = {};
  this._dirty = {};
  this._hydrated = {};
  this.isNew = !hydrate;
  if(hydrate) this.hydrate(obj);
  else this.mixin(obj);
};
sys.inherits(Document, EventEmitter);

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
            this.emit('hydrate', [curpath,obj,prop]);
          }
        }
        else {
          if(override){
            this.set(curpath, obj[prop]);
          } else {
            val[prop] = obj[prop];
            this.emit('hydrate', [curpath,obj,prop]);
          }
        }
        if(!override) this._hydrated[curpath] = true;
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
  if(!override && flag == count) this._hydrated[ (p.length) ? p.join('.') : ''] = true; 
  return [count, flag];
};

Document.prototype._run = function(name, fn, args){
  var pres = this._schema._pres[name] || [], 
      override = this._schema._overrides[name],
      self = this;
  if (this._pres[name] && this._pres[name].length){
    pres = this._schema._pres[name].concat(this._pres[name]);
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
  var parts = path.split('.'), doc = this.__doc;
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
  var parts = path.split('.'), doc = this.__doc;
  for (var i = 0, l = parts.length-1; i < l; i++){
    doc = doc[parts[i]];
    if (typeof doc == 'undefined'){
      return undefined;
    }
  }
  doc[parts[parts.length-1]] = val;
  this._dirty[path] = true;
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
    this._set(path,val);
  }
};

Document.prototype.pre = function(method, fn){
  if (!(method in this._pres)) this._pres[method] = [];
  this._pres[method].push(fn);
  return this;
};

Document.prototype.post = function(method, fn){
  if (!(method in this._posts)) this._posts[method] = [];
  this._posts[method].push(fn);
  return this;
};

Document.prototype.hydrated = function(path){
  return !!this._hydrated[path];
};

var Model = function(obj,flag){
  Document.call(this,obj,flag);
};
sys.inherits(Model, Document);


var EmbeddedArray = function(){
  
};
EmbeddedArray.prototype.__proto__ = Array.prototype;

var EmbeddedDocument = this.EmbeddedDocuemnt = function(){
  
};
sys.inherits(EmbeddedDocument, Document);


var Hooks = {
  
  hydrate: function(obj){
    this._setData(this._schema._struct, obj || {}, this.__doc, [], false);
    return this;
  },

  mixin: function(obj){
    this._setData(this._schema._struct, obj || {}, this.__doc, [], true);
    return this;
  },
  
  save: function(obj){
    // call parent save()
  },
  
  remove: function(){
    
  } 
  
};

var Statics = {
  
};

module.exports = {
  
  Document: Document,
  
  EmbeddedArray: EmbeddedArray,
  
  EmbeddedDocument: EmbeddedDocument,
  
  Model: Model,
  
  Hooks: Hooks,
  
  Statics: Statics,
  
  defineMethod: defineMethod
};


function defineMethod(ctor, name, fn){
  ctor.prototype[name] = function(){
    return this._run(name, fn, arguments);
  };
};