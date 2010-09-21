var sys = require('sys')
  , EventEmitter = require('events').EventEmitter;

var Document = this.Base = function(obj,isOld){
  this._pres = {};
  this._posts = {};
  this.__doc = {};
  this._dirty = {};
  this._hydrated = {};
  this.isNew = !isOld;
  this.hydrate(obj);
};

sys.inherits(Document, EventEmitter);

Document.prototype._hydrate = function(struct, obj, val, path){
  var p = path || [], count = 0, hydrated = 0, i, l, prop, schema = this._schema, curpath;
  for(i=0,l=struct.length; i<l; i++){
    prop = struct[i];
    count++;
    if(typeof prop == 'string'){
      curpath = p.concat(prop).join('.');
      if(obj.hasOwnProperty(prop)){
        hydrated++;
        if(schema.paths[curpath].type == 'array') this.set(curpath, new EmbeddedArray());
        else this.set(curpath,obj[prop]); 
        this._hydrated[curpath] = true;
      }
    } else {
      prop = struct[i][0];
      if(obj.hasOwnProperty(prop) &&
      (Object.prototype.toString.call(obj[prop]) == '[object Object]')){
        hydrated++;
        var children = this._hydrate(struct[i][1], obj[prop], p.concat(prop));
        count += children[0];
        hydrated += children[1];
      }
    }
  }
  if(hydrated == count) this._hydrated[ (p.length) ? p.join('.') : ''] = true; 
  return [count, hydrated];
};

Document.prototype._run = function(name, fn, args){
  var pres = this._schema._pres[name], 
      override = this._schema._overrides[name],
      self = this;
  if (this._pres[name] && this._pres[name].length){
    pres = this._schema._pres[name].concat(this._pres[name]);
  }
  if (pres && pres.length){
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
    pres.forEach(function(fn){
      fn(complete);
    });
  }
  return this;
};

Document.prototype.hydrated = function(path){
  return !!this._hydrated[path];
};

Document.prototype.get = function(path){
  var type = this._schema[path], i, l, prop, val = this._get(path);
  if(!type) return undefined;
  if(type.type == 'object'){
    
  } else if(type.type == 'array'){
    
  } else {
   if(typeof type._castGet == 'function') val = type._castGet.apply(this,[val,path,type]);
   for(i=0,l=type.getters.length; i<l; i++) val = type.getters[i].apply(this,[val,path,type]);
   return val;
  }
};

Document.prototype.set = function(path,val){
  var type = this._schema[path], i, l, prop, val;
  if(!type) return;
  if(type.type == 'object'){
    for(prop in val) this.set(path+'.'+prop,val[i]);
  } else if(type.type == 'array'){
    
  } else {
    if(typeof type._castSet == 'function') val = type._castSet.apply(this,[val,path,type]);
    for(i=type.setters.length-1, l=0; i>=0; i--) val = type.setters[i].apply(this,[val,path,type]);
    this._set(path,val);
  }
};

Document.prototype.pre = function(){
  if (!(method in this._pres)) this._pres[method] = [];
  this._pres[method].push(fn);
  return this;
};

Document.prototype.post = function(){
  if (!(method in this._posts)) this._posts[method] = [];
  this._posts[method].push(fn);
  return this;
};

sys.inherits(Document, EventEmitter);

defineMethod(Document, 'hydrate', function(obj){
  this._hydrate(this._struct,obj);
  return this;
});

defineMethod(Document, 'save', function(obj){
  // call parent save()
});

defineMethod(Document, 'remove', function(obj){
  // call parent save()
});

var Model = this.Model = function(obj,flag){
  Document.call(this,obj,flag);
};

Model.find = function(){
  
};

Model.count = function(){
  
};

Model.remove = function(){
  
};
sys.inherits(Model, Document);
Model.prototype.__proto__ = Document.prototype;


var EmbeddedDocument = this.EmbeddedDocuemnt = function(){
  
};

sys.inherits(EmbeddedDocument, Document);

defineMethod(EmbeddedDocument, 'save', function(obj){
  // call parent save()
});

defineMethod(EmbeddedDocument, 'remove', function(obj){
  // if parent is an array, remove from list
  // call parent remove()
});


var EmbeddedArray = function(){
  
};

EmbeddedArray.prototype.__proto__ = Array.prototype;


function defineMethod(ctor, name, fn){
  ctor.prototype[name] = function(){
    return this._run(name, fn, arguments);
  };
};