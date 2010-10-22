
/**
 * Initialize a new `Query` with the given _onExec_ callback,
 * which is invoked when the query is "kicked" by a method requesting
 * the data such as `Query#all()`.
 *
 * @param {Function} onExec
 * @api private
 */

var Query = module.exports = function Query(onExec){
  this._query = {};
  this._hydrate = null;
  this._options = {};
  this._onExec = onExec;
  this._queue = [];
};

/**
 * Extend the current query with the additional `query` conditions, for
 * example `where({ 'name.first': 'Nathan' })`, or alternatively provide a key
 * and value `where('name.first', 'Nathan')`.
 *
 * @param {String|Object} query
 * @param {Mixed} val
 * @return {Query} for chaining
 * @api public
 */

Query.prototype.where = 
Query.prototype.find = function(query){
  switch (arguments.length) {
    case 1:
      for (var i in query) this.where(i, query[i]);
      break;
    case 2:
      this._query[query] = arguments[1];
      break;
  }
  return this;
};

/**
 * Execute the `Query` and callback the _onExec_ function
 * given to `Query()`.
 *
 * @return {Query} for chaining
 * @api private
 */

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

/**
 * Limit the query to the first `n` documents, defaulting to 1.
 * A function may be passed as the first argument, in which case
 * the first doc is passed, or combined with `first(n, callback)`
 * which essentially aliases `first(n).all(callback)`.
 *
 *
 * @param {Number|Function} n
 * @param {Function} fn
 * @return {Query} for chaining
 * @api public
 */

Query.prototype.first = function(n, fn){
  if ('function' == typeof n) fn = n, n = 1;
  this.limit(n || 1);
  if (fn) {
    if (n > 1) {
      this.all(fn);
    } else {
      this.all(function(docs){
        fn(docs[0]);
      });
    }
  }
  return this;
};

/**
 * Enqueue the given `method` call.
 *
 * @param {String} method
 * @param {Arguments} args
 * @return {Query} for chaining
 * @api private
 */

Query.prototype.enqueue = function(method, args){
  this._queue.push([method, args]);
  return this;
};

Query.prototype.complete = function(data){
  for (var i = 0, len = this._queue.length; i < len; ++i) {
    var call = this._queue[i]
      , method = call[0]
      , fn = call[1][0];
    this['_' + method](fn, data);
  }
  this._queue = [];
  return this;
};

Query.prototype.add = function(){
  return this.enqueue('add', arguments);
};

Query.prototype._add = function(callback, data){
  callback.call(this, data);
};

// Modifiers

['sort', 'limit', 'skip', 'snapshot', 'group'].forEach(function(option){
  Query.prototype[option] = function(obj){
    this._options[option] = obj;
    return this;
  };
});

// Kickers

/**
 * Get last in data-set.
 */

Query.prototype._last = function(callback, data){
  callback.call(this, data[data.length - 1]);
};

/**
 * Get first in data-set.
 */

Query.prototype._one = function(callback, data){
  callback.call(this, data[0]);
};

/**
 * Get entire data-set.
 */

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

['all', 'one', 'last'].forEach(function(method){
  Query.prototype[method] = function(){
    return this.enqueue(method, arguments).exec();
  };
});
