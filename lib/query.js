var object = require('./util').object,
    writerOptions = ['sort', 'limit', 'skip', 'snapshot', 'group'],
    promised = ['all', 'get', 'last', 'first', 'one'],
    Class = require('./util').Class,

// todo add sugar

Writer = this.Writer = Class({
  
  init: function(onExec){
    this._query = {};
    this._options = {};
    this._onExec = onExec;
  },
  
  where: function(){
    if (arguments.length == 1){
      this._query = object.mixin(true, this._query, arguments[0]);
    } else if (arguments.length == 2) {
      this._query[arguments[0]] = arguments[1];
    }
    return this;
  },
  
  exec: function(){
    if (!this.__promise){
      this.__promise = new Promise();
      if (this._onExec) this._onExec(this._query, this._options)
    }
    return this.__promise;
  }
  
}),

Promise = this.Promise = Class({
  
  init: function(){
    this._queues = [[]];
  },
  
  stash: function(){
    this._queues.push([]);
    return this;
  },
  
  _queue: function(method, args){
    for (var i = this._queues.length - 1; i >= 0; i--){
      if (this._queues[i] !== null){
        this._queues[i].push([method, args]);
        return this;
      }
    }
    this['_' + method](args[0], this.data);
    return this;
  },
  
  complete: function(data){
    for (var i = 0, l = this._queues.length; i < l; i++){
      if (this._queues[i] !== null){
        this._queues[i].forEach(function(call){
          this['_' + call[0]](call[1][0], data);
        }, this);
        this._queues[i] = null;
        this.data = data;
        return this;
      }
    }
    return this;
  },
  
  _one: function(callback, data){
    callback(data[0] || null);
  },
  
  _first: function(callback, data){
    callback(data[0] || null);
  },
  
  _last: function(callback, data){
    callback(data[data.length - 1] || null);
  },
  
  _get: function(callback, data){
    callback(data);
  },
  
  _all: function(callback, data){
    callback(data);
  }
  
});

// add option altering ones automatically
writerOptions.forEach(function(option){
  Writer.prototype[option] = function(o){
    this._options[option] = o;
    return this;
  };
});

promised.forEach(function(method){
  // we make sure the promised methods trigger execution automatically of the writer
  Writer.prototype[method] = function(){
    var promise = this.exec();
    promise[method].apply(promise, arguments);
    return promise;
  };
  
  // we wrap the methods in the promise
  Promise.prototype[method] = function(){
    return this._queue(method, arguments);
  };
});