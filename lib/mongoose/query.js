
/**
 * Initialize a new `Query`.
 *
 * An additional `query` can be passed, to copy its state for expanding
 * upon an already executed query.
 *
 * @param {Schema} schema
 * @param {Query} query
 * @api private
 */

var Query = module.exports = function Query(schema, query){
  query = query || {};
  this._query = query._query || {};
  this._hydrate = query._hydrate || null;
  this._options = query._options || {};
  this._schema = schema;
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
Query.prototype.find = function(query, val){
  if (undefined !== val) {
    this._query[query] = val;
  } else if (query) {
    for (var key in query) {
      this._query[key] = query[key];
    }
  }
  return this;
};

/**
 * Execute and pass the first doc to `fn`.
 *
 * @param {Function} fn
 * @return {Query}
 * @api public
 */

Query.prototype.one = function(fn){
  return this.exec(function(docs){
    fn(docs[0]);
  });
};

/**
 * Execute the query invoking `fn`, returning a new `Query`
 * which can be used to extend the query without
 * mutating the previous.
 *
 * @param {Function} fn
 * @return {Query}
 * @api public
 */

Query.prototype.all =
Query.prototype.exec = function(fn){
  var self = this
    , schema = this._schema;
  schema._collection.find(this._query, this._options, function(err, cursor){
    if (err) return self._connection._error(err);
    var results = [];
    cursor.each(function(err, doc){
      if (err) return self._connection._error(err);
      if (null == doc) return fn(results);
      if (doc.$err) return self._connection._error(doc.$err);
      // TODO: hydrate option back in
      results.push(new schema(doc, true));
    });
  });
  return new Query(schema, this);
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

// Modifiers

['sort', 'limit', 'skip', 'snapshot', 'group'].forEach(function(option){
  Query.prototype[option] = function(obj){
    this._options[option] = obj;
    return this;
  };
});