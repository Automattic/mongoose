var writerOptions = ['sort', 'limit', 'skip', 'snapshot', 'group'], 
    promised = ['all', 'get', 'last', 'first', 'one'],

// todo add sugar

Writer = this.Writer = Class({
  
  _options: {},
  
  _query: {},
  
  init: function(onExec){
    this._onExec = onExec;
  },
  
  where: function(){
    if (arguments.length == 1){
      Object.merge(this._query, arguments[0]);
    } else if (arguments.length == 2) {
      this._query[arguments[0]] = arguments[1];
    }
    return this;
  },
  
  exec: function(){
    if (!this.__promise){
      this.__promise = new Promise();
      this._onExec(this._query, this._options)
    }
    return this.__promise;
  }
  
}),

Promise = this.Promise = Class({
  
  init: function(){
    this._queues = [];
  },
  
  stash: function(){
    this._queues.push([]);
  },
  
  _queue: function(method, args){
    for (var i = 0, l = this._queues.length; i < l; i++){
      if (this._queues[i] !== null){
        this._queues[i].push([method, args]);
        return;
      }
    }
    this[method](args[0], this.data);
  },
  
  complete: function(data){
    for (var i = 0, l = this._queues.length; i < l; i++){
      if (this._queues[i] !== null){
        this._queues[i].forEach(function(call){
          this[call[0]](call[1][0], data);
        });
        this._queues[i] = null;
      }
    }
    this.data = data;
  },
  
  one: function(callback, data){
    callback(data[0] || null);
  },
  
  first: function(callback, data){
    callback(data[0] || null);
  },
  
  last: function(callback, data){
    callback(data[data.length - 1] || null);
  },
  
  get: function(callback, data){
    callback(data);
  },
  
  all: function(callback, data){
    callback(data);
  }
  
});

// add option altering ones automatically
writerOptions.forEach(function(option){
  Writer.prototype[option] = function(o){
    this._options[options] = o;
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
  var defined = Promise.prototype[method];
  Promise.prototype[method] = function(){
    return this._queue(method, arguments);
  };
});