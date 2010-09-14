var sys = require('sys')
  , EventEmitter = require('events').EventEmitter;

var Document = this.Base = function(obj){
  this.hydrate(obj);
};

Document.prototype._run = function(name, fn, args){
  var pres = this._schema._pres[name], 
      override = this._schema._overrides[name],
      self = this;
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

sys.inherits(Document, EventEmitter);

defineMethod(Document, 'hydrate', function(obj){
  // perform hydration
});

var Model = this.Model = function(){
  
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