/*!
 * Module dependencies.
 */

var NodeJSDocument = require('./document');
var EventEmitter = require('events').EventEmitter;
var MongooseError = require('./error');
var Schema = require('./schema');
var ObjectId = require('./types/objectid');
var utils = require('./utils');
var ValidationError = MongooseError.ValidationError;
var InternalCache = require('./internal');
var PromiseProvider = require('./promise_provider');
var VersionError = require('./error').VersionError;

var Embedded;

/**
 * Document constructor.
 *
 * @param {Object} obj the values to set
 * @param {Object} [fields] optional object containing the fields which were selected in the query returning this document and any populated paths data
 * @param {Boolean} [skipId] bool, should we auto create an ObjectId _id
 * @inherits NodeJS EventEmitter http://nodejs.org/api/events.html#events_class_events_eventemitter
 * @event `init`: Emitted on a document after it has was retrieved from the db and fully hydrated by Mongoose.
 * @event `save`: Emitted when the document is successfully saved
 * @api private
 */

function Document(obj, schema, fields, skipId, skipInit) {
  if (!(this instanceof Document)) {
    return new Document(obj, schema, fields, skipId, skipInit);
  }


  if (utils.isObject(schema) && !schema.instanceOfSchema) {
    schema = new Schema(schema);
  }

  // When creating EmbeddedDocument, it already has the schema and he doesn't need the _id
  schema = this.schema || schema;

  // Generate ObjectId if it is missing, but it requires a scheme
  if (!this.schema && schema.options._id) {
    obj = obj || {};

    if (obj._id === undefined) {
      obj._id = new ObjectId();
    }
  }

  if (!schema) {
    throw new MongooseError.MissingSchemaError();
  }

  this.$__setSchema(schema);

  this.$__ = new InternalCache;
  this.$__.emitter = new EventEmitter();
  this.isNew = true;
  this.errors = undefined;

  if (typeof fields === 'boolean') {
    this.$__.strictMode = fields;
    fields = undefined;
  } else {
    this.$__.strictMode = this.schema.options && this.schema.options.strict;
    this.$__.selected = fields;
  }

  var required = this.schema.requiredPaths();
  for (var i = 0; i < required.length; ++i) {
    this.$__.activePaths.require(required[i]);
  }

  this.$__.emitter.setMaxListeners(0);
  this._doc = this.$__buildDoc(obj, fields, skipId);

  if (!skipInit && obj) {
    this.init(obj);
  }

  this.$__registerHooksFromSchema();

  // apply methods
  for (var m in schema.methods) {
    this[m] = schema.methods[m];
  }
  // apply statics
  for (var s in schema.statics) {
    this[s] = schema.statics[s];
  }
}

/*!
 * Inherit from the NodeJS document
 */

Document.prototype = Object.create(NodeJSDocument.prototype);
Document.prototype.constructor = Document;

/*!
 * Browser doc exposes the event emitter API
 */

Document.$emitter = new EventEmitter();

utils.each(
    ['on', 'once', 'emit', 'listeners', 'removeListener', 'setMaxListeners',
      'removeAllListeners', 'addListener'],
    function(emitterFn) {
      Document[emitterFn] = function() {
        return Document.$emitter[emitterFn].apply(Document.$emitter, arguments);
      };
    });

/*!
 * Executes methods queued from the Schema definition
 *
 * @api private
 * @method $__registerHooksFromSchema
 * @deprecated
 * @memberOf Document
 */

Document.prototype.$__registerHooksFromSchema = function() {
  Embedded = Embedded || require('./types/embedded');
  var Promise = PromiseProvider.get();

  var _this = this;
  var q = _this.schema && _this.schema.callQueue;
  var toWrapEl;
  var len;
  var i;
  var j;
  var pointCut;
  var keys;
  if (!q.length) {
    return _this;
  }

  // we are only interested in 'pre' hooks, and group by point-cut
  var toWrap = { post: [] };
  var pair;

  for (i = 0; i < q.length; ++i) {
    pair = q[i];
    if (pair[0] !== 'pre' && pair[0] !== 'post' && pair[0] !== 'on') {
      _this[pair[0]].apply(_this, pair[1]);
      continue;
    }
    var args = [].slice.call(pair[1]);
    pointCut = pair[0] === 'on' ? 'post' : args[0];
    if (!(pointCut in toWrap)) {
      toWrap[pointCut] = {post: [], pre: []};
    }
    if (pair[0] === 'post') {
      toWrap[pointCut].post.push(args);
    } else if (pair[0] === 'on') {
      toWrap[pointCut].push(args);
    } else {
      toWrap[pointCut].pre.push(args);
    }
  }

  // 'post' hooks are simpler
  len = toWrap.post.length;
  toWrap.post.forEach(function(args) {
    _this.on.apply(_this, args);
  });
  delete toWrap.post;

  // 'init' should be synchronous on subdocuments
  if (toWrap.init && _this instanceof Embedded) {
    if (toWrap.init.pre) {
      toWrap.init.pre.forEach(function(args) {
        _this.$pre.apply(_this, args);
      });
    }
    if (toWrap.init.post) {
      toWrap.init.post.forEach(function(args) {
        _this.$post.apply(_this, args);
      });
    }
    delete toWrap.init;
  } else if (toWrap.set) {
    // Set hooks also need to be sync re: gh-3479
    if (toWrap.set.pre) {
      toWrap.set.pre.forEach(function(args) {
        _this.$pre.apply(_this, args);
      });
    }
    if (toWrap.set.post) {
      toWrap.set.post.forEach(function(args) {
        _this.$post.apply(_this, args);
      });
    }
    delete toWrap.set;
  }

  keys = Object.keys(toWrap);
  len = keys.length;
  for (i = 0; i < len; ++i) {
    pointCut = keys[i];
    // this is so we can wrap everything into a promise;
    var newName = ('$__original_' + pointCut);
    if (!_this[pointCut]) {
      continue;
    }
    _this[newName] = _this[pointCut];
    _this[pointCut] = (function(_newName) {
      return function wrappedPointCut() {
        var args = [].slice.call(arguments);
        var lastArg = args.pop();
        var fn;
        var originalError = new Error();
        var $results;
        if (lastArg && typeof lastArg !== 'function') {
          args.push(lastArg);
        } else {
          fn = lastArg;
        }

        var promise = new Promise.ES6(function(resolve, reject) {
          args.push(function(error) {
            if (error) {
              // gh-2633: since VersionError is very generic, take the
              // stack trace of the original save() function call rather
              // than the async trace
              if (error instanceof VersionError) {
                error.stack = originalError.stack;
              }
              _this.$__handleReject(error);
              reject(error);
              return;
            }

            // There may be multiple results and promise libs other than
            // mpromise don't support passing multiple values to `resolve()`
            $results = Array.prototype.slice.call(arguments, 1);
            resolve.apply(promise, $results);
          });

          _this[_newName].apply(_this, args);
        });
        if (fn) {
          if (_this.constructor.$wrapCallback) {
            fn = _this.constructor.$wrapCallback(fn);
          }
          return promise.then(
            function() {
              process.nextTick(function() {
                fn.apply(null, [null].concat($results));
              });
            },
            function(error) {
              process.nextTick(function() {
                fn(error);
              });
            });
        }
        return promise;
      };
    })(newName);

    toWrapEl = toWrap[pointCut];
    var _len = toWrapEl.pre.length;
    args;
    for (j = 0; j < _len; ++j) {
      args = toWrapEl.pre[j];
      args[0] = newName;
      _this.$pre.apply(_this, args);
    }

    _len = toWrapEl.post.length;
    for (j = 0; j < _len; ++j) {
      args = toWrapEl.post[j];
      args[0] = newName;
      _this.$post.apply(_this, args);
    }
  }
  return _this;
};

/*!
 * Module exports.
 */

Document.ValidationError = ValidationError;
module.exports = exports = Document;
