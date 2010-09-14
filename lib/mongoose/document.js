var sys = require('sys')
  , EventEmitter = require('events').EventEmitter;

var Document = this.Base = function(obj){
  this.hydrate(obj);
  this._pres = {};
  this._posts = {};
};

Document.prototype._run = function(name, fn, args){
  var pres = this._schema._pres[name], 
      override = this._schema._overrides[name],
      self = this;
  if (this._pres[name] && this._pres[name].length){
    pres = this._schema._posts[name].concat(this._pres[name]);
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

Document.prototype.get = function(path){
  
};

Document.prototype.set = function(path){
  
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
  // perform hydration
});

var Model = this.Model = function(){
  
};

Model.find = function(){
  
};

Model.count = function(){
  
};

Model.remove = function(){
  
};

sys.inherits(Model, Document);

defineMethod(Model, 'save', function(obj){
  // call parent save()
});

defineMethod(Model, 'remove', function(obj){
  // call parent save()
});

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

function defineMethod(ctor, name, fn){
  ctor.prototype[name] = function(){
    return this._run(name, fn, arguments);
  };
};