var query = require('query'),
    
Model = this.Model = Class({
  
  extend: {
    find: function(hydrate){
      this._connection.
    }
  },
  
  init: function(){
    this.isNew = true;
    this.isDirty = false;
  },
  
  _set: function(path){
    var parts = path.split('.'), doc = this.__doc, dirty = false;
    for (var i = 0, l = parts.length; i < l; i++){
      doc = doc[i];
      if (!dirty && (typeof doc == 'object' || (i + 1 == l))){
        dirty = true;
        this._dirty = true;
      }
    }
  },
  
  _get: function(path){
    var parts = path.split('.'), doc = this.__doc;
    for (var i = 0, l = parts.length; i < l; i++){
      doc = doc[i];
      if (typeof doc == 'object' && i + 1 !== l){
        throw new Error("Can't access " + path);
      }
    }
    return doc;
  },
  
  _hydrate: function(doc){
    this.isNew = false;
    Object.merge(this.__doc, doc);
  },
  
  isDirty: function(n){
    if (typeof n == 'string') return n in this._dirty;
    return !!Object.keys(this._dirty).length;
  },
  
  toObject: function(){
    return this.__doc;
  },
  
  save: function(fn){
    this._connection.save(this.__doc, fn);
  }
  
});