
var Query = module.exports = function Query(onExec){
  this._query = {};
  this._hydrate = null;
  this._options = {};
  this._onExec = onExec;
  this._queues = [[]];
};

Query.prototype.where  = Query.prototype.find = function(query){
  if (arguments.length == 1 && typeof query == 'object'){
    for (var i in arguments[0]) this.where(i, query[i]);
  } else if (arguments.length == 2) {
    this._query[query] = arguments[1];
  }
  return this;
};

Query.prototype.exec = function(){
  if (this._onExec) this._onExec(this._query, this._options);
  return this;
};

/**
 * @param {Object} hydrate
 * @param {Object} ?? optional 2nd argument
 * @return {Query} this
 */
Query.prototype.hydrate = function(hydrate){
  if (arguments.length == 1 && typeof hydrate == 'object'){
    for (var i in hydrate) this.hydrate(i, hydrate[i]);
  } else if (arguments.length == 2) {
    if (this._hydrate === null) this._hydrate = {};
    this._hydrate[hydrate] = arguments[1];
  }
  return this;
};

Query.prototype.add = function(){
  var promise = this.exec();
  return promise.add.apply(promise, arguments);
};

Query.prototype.stash = function(){
  this._queues.push([]);
  return this;
};

Query.prototype._queue = function(method, args){
  for (var i = this._queues.length - 1; i >= 0; i--){
    if (this._queues[i] !== null){
      this._queues[i].push([method, args]);
      return this;
    }
  }
  if (args[0]) this['_' + method](args[0], this.data);
  return this;
};

Query.prototype.complete = function(data){
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

Query.prototype.add = function(){
  return this._queue('add', arguments);
};

Query.prototype._add = function(callback, data){
  callback.call(this, data);
};

// add option altering ones automatically
['sort', 'limit', 'skip', 'snapshot', 'group'].forEach(function(option){
  Query.prototype[option] = function(o){
    this._options[option] = o;
    return this;
  };
});

Query.prototype._one = function(callback, data){
  callback.call(this, data[0] || null);
};

Query.prototype._first = function(callback, data){
  callback.call(this, data[0] || null);
};

Query.prototype._last = function(callback, data){
  callback.call(this, data[data.length - 1] || null);
};

Query.prototype._get = function(callback, data){
  callback.call(this, data);
};

Query.prototype._all = function(callback, data){
  callback.call(this, data);
};

/**
 * Kickers.
 * 
 * By design "kickers" execute the query, and deal with the response.
 * Util a query is executed, you may chain method calls, essential `Query`
 * becomes a promise itself.
 */

['all', 'get', 'last', 'first', 'one'].forEach(function(method){
  Query.prototype[method] = function(){
    return this._queue(method, arguments).exec();
  };
});
