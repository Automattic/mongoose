var Writer = this.Writer = function(onExec){
  this._query = {};
  this._hydrate = null;
  this._options = {};
  this._onExec = onExec;
};

Writer.prototype.where = function(query){
  if (arguments.length == 1 && typeof query == 'object'){
    for (var i in arguments[0]) this.where(i, query[i]);
  } else if (arguments.length == 2) {
    this._query[query] = arguments[1];
  }
  return this;
};

Writer.prototype.exec = function(){
  if (!this.__promise){
    this.__promise = new Promise();
    if (this._onExec) this._onExec(this._query, this._options, this.__promise)
  }
  return this.__promise;
};

Writer.prototype.hydrate = function(hydrate){
  if (arguments.length == 1 && typeof hydrate == 'object'){
    for (var i in hydrate) this.hydrate(i, hydrate[i]);
  } else if (arguments.length == 2) {
    if (this._hydrate === null) this._hydrate = {};
    this._hydrate[hydrate] = arguments[1];
  }
  return this;
};

Writer.prototype.add = function(){
  var promise = this.exec();
  return promise.add.apply(promise, arguments);
};

var Promise = this.Promise = function(){
  this._queues = [[]];
};

Promise.prototype.stash = function(){
  this._queues.push([]);
  return this;
};

Promise.prototype._queue = function(method, args){
  for (var i = this._queues.length - 1; i >= 0; i--){
    if (this._queues[i] !== null){
      this._queues[i].push([method, args]);
      return this;
    }
  }
  if (args[0]) this['_' + method](args[0], this.data);
  return this;
};

Promise.prototype.complete = function(data){
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
};

Promise.prototype.add = function(){
  return this._queue('add', arguments);
};

Promise.prototype._add = function(callback, data){
  callback.call(this, data);
};

// add option altering ones automatically
['sort', 'limit', 'skip', 'snapshot', 'group'].forEach(function(option){
  Writer.prototype[option] = function(o){
    this._options[option] = o;
    return this;
  };
});

var CollectionPromise = this.CollectionPromise = function(){
  Promise.call(this);
};

require('sys').inherits(CollectionPromise, Promise);

CollectionPromise.prototype._one = function(callback, data){
  callback.call(this, data[0] || null);
};

CollectionPromise.prototype._first = function(callback, data){
  callback.call(this, data[0] || null);
};

CollectionPromise.prototype._last = function(callback, data){
  callback.call(this, data[data.length - 1] || null);
};

CollectionPromise.prototype._get = function(callback, data){
  callback.call(this, data);
};

CollectionPromise.prototype._all = function(callback, data){
  callback.call(this, data);
};

['all', 'get', 'last', 'first', 'one'].forEach(function(method){
  // we make sure the promised methods trigger execution automatically of the writer
  Writer.prototype[method] = function(){
    var promise = this.exec();
    return promise[method].apply(promise, arguments);
  };
  
  // we wrap the methods in the promise
  CollectionPromise.prototype[method] = function(){
    return this._queue(method, arguments);
  };
});