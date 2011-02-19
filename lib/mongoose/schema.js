
/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter
  , Types = require('./schema/index')
  , VirtualType = require('./virtualtype')
  , utils = require('./utils')
  , NamedScope = require('./namedscope')
  , Query = require('./query');

/**
 * Schema constructor.
 *
 * @param {Object} definition
 * @api public
 */

function Schema (obj, options) {
  this.paths = {};
  this.virtuals = {};
  this.inherits = {};
  this.callQueue = [];
  this._indexes = [];
  this.methods = {};
  this.statics = {};
  this.tree = {};

  // set options
  this.options = utils.options({
      safe: true
    , 'use$SetOnSave': true
  }, options);

  // build paths
  if (obj)
    this.add(obj);

  if (!this.paths['_id'])
    this.add({ _id: {type: ObjectId, auto: true} });

  this.virtual('id').get(function () {
    return this._id.toString();
  });
};

/**
 * Inherit from EventEmitter.
 */

Schema.prototype.__proto__ = EventEmitter.prototype;

/**
 * Schema by paths
 *
 * Example (embedded doc):
 *    {
 *        'test'       : SchemaType,
 *      , 'test.test'  : SchemaType,
 *      , 'first_name' : SchemaType
 *    }
 *
 * @api private
 */

Schema.prototype.paths;

/**
 * Schema as a tree
 *
 * Example:
 *    {
 *        '_id'     : ObjectId
 *      , 'nested'  : {
 *            'key': String
 *        }
 *    }
 *
 * @api private
 */

Schema.prototype.tree;

/**
 * Sets the keys
 *
 * @param {Object} keys
 * @param {String} prefix
 * @api public
 */

Schema.prototype.add = function (obj, prefix) {
  prefix = prefix || '';
  for (var i in obj){
    // make sure set of keys are in `tree`
    if (!prefix && !this.tree[i])
      this.tree[i] = obj[i];

    if (obj[i].constructor == Object && (!obj[i].type || obj[i].__nested)) {
      if (Object.keys(obj[i]).length)
        this.add(obj[i], prefix + i + '.');
      else
        this.path(prefix + i, obj[i]); // mixed type
    } else
      this.path(prefix + i, obj[i]);
  }
};

/**
 * Sets a path (if arity 2)
 * Gets a path (if arity 1)
 *
 * @param {String} path
 * @param {Object} constructor
 * @api public
 */

Schema.prototype.path = function (path, obj) {
  if (obj == undefined)
    return this.paths[path];

  if (obj.constructor != Object)
    obj = { type: obj };

  var type = obj.type || {}; // defaults to mixed

  if (type.constructor == Object)
    this.paths[path] = new Types.Mixed(path, obj);
  else if (Array.isArray(type) || type == Array){
    // if it was specified through { type } look for `cast`
    var cast = type == Array ? obj.cast : type[0];

    if (cast instanceof Schema)
      this.paths[path] = new Types.DocumentArray(path, cast, obj);
    else 
      this.paths[path] = new Types.Array(path, cast, obj);
  } else
    this.paths[path] = new Types[type.name](path, obj);

  return this;
};

/**
 * Iterates through the schema's paths, passing the path string and type object
 * to the callback.
 *
 * @param {Function} callback function - fn(pathstring, type)
 * @return {Schema} this for chaining
 * @api public
 */

Schema.prototype.eachPath = function (fn) {
  for (var k in this.paths)
    if (this.paths.hasOwnProperty(k))
      fn(k, this.paths[k]);
  return this;
};

/**
 * Returns an Array of path strings that are required.
 * @api public
 */

Object.defineProperty(Schema.prototype, 'requiredPaths', {
  get: function () {
    var paths = this.paths
      , pathnames = Object.keys(paths)
      , i = pathnames.length
      , pathname, path
      , requiredPaths = [];
    while (i--) {
      pathname = pathnames[i];
      path = paths[pathname];
      if (path.isRequired) requiredPaths.push(pathname);
    }
    return requiredPaths;
  }
});

/**
 * Given a path, returns whether it is a real, virtual, or
 * ad-hoc/undefined path
 *
 * @param {String} path
 * @return {String}
 * @api public
 */
Schema.prototype.pathType = function (path) {
  if (path in this.paths) return 'real';
  if (path in this.virtuals) return 'virtual';
  return 'adhocOrUndefined';
};

/**
 * Adds a method call to the queue
 *
 * @param {String} method name
 * @param {Array} arguments
 * @api private
 */

Schema.prototype.queue = function(name, args){
  this.callQueue.push([name, args]);
  return this;
};

/**
 * Defines a pre for the document
 *
 * @param {String} method
 * @param {Function} callback
 * @api public
 */

Schema.prototype.pre = function(){
  return this.queue('pre', arguments);
};

/**
 * Defines a post for the document
 *
 * @param {String} method
 * @param {Function} callback
 * @api public
 */

Schema.prototype.post = function(method, fn){
  return this.queue('on', arguments);
};

/**
 * Registers a plugin for this schema
 *
 * @param {Function} plugin callback
 * @api public
 */

Schema.prototype.plugin = function (fn, opts) {
  fn(this, opts);
  return this;
};

/**
 * Adds a method
 *
 * @param {String} method name
 * @param {Function} handler
 * @api public
 */

Schema.prototype.method = function (name, fn) {
  if ('string' != typeof name)
    for (var i in name)
      this.methods[i] = name[i];
  else
    this.methods[name] = fn;
  return this;
};

/**
 * Defines a static method
 *
 * @param {String} name
 * @param {Function} handler
 * @api public
 */

Schema.prototype.static = function(name, fn) {
  if ('string' != typeof name)
    for (var i in name)
      this.statics[i] = name[i];
  else
    this.statics[name] = fn;
  return this;
};

/**
 * Defines an index (most likely compound)
 * Example:
 *    schema.index({ first: 1, last: -1 })
 *
 * @param {Object} field
 * @param {Object} optional options object
 * @api public
 */

Schema.prototype.index = function (fields, options) {
  this._indexes.push([fields, options || {}]);
  return this;
};

/**
 * Sets/gets an option
 *
 * @param {String} key
 * @param {Object} optional value
 * @api public
 */

Schema.prototype.set = function (key, value) {
  if (arguments.length == 1)
    return this.options[key];
  this.options[key] = value;
  return this;
};

/**
 * Compiles indexes from fields and schema-level indexes
 *
 * @api public
 */

Schema.prototype.__defineGetter__('indexes', function () {
  var index
    , indexes = []
    , seenSchemas = [];

  function collectIndexes (paths, prefix) {
    prefix = prefix || '';

    for (var i in paths){
      if (paths[i]) {
        if (paths[i] instanceof Types.DocumentArray) {
          // avoid recursion
          if (!(~seenSchemas.indexOf(paths[i].schema))) {
            seenSchemas.push(paths[i].schema);
            collectIndexes(paths[i].schema.paths, i + '.');
          }
        } else {
          index = paths[i]._index;

          if (index !== false && index !== null){
            var field = {};
            field[prefix + i] = 1;
            indexes.push([field, index.constructor == Object ? index : {} ]);
          }
        }
      }
    }
  }

  collectIndexes(this.paths);

  return indexes.concat(this._indexes);
});

/**
 * Retrieves or creates the virtual type with the given name.
 *
 * @param {String} name
 * @return {VirtualType}
 */

Schema.prototype.virtual = function (name) {
  var virtuals = this.virtuals || (this.virtuals = {})
  return virtuals[name] || (virtuals[name] = this.tree[name] = new VirtualType()); 
};

/**
 * Fetches the virtual type with the given name.
 * Should be distinct from virtual because virtual auto-defines a new VirtualType
 * if the path doesn't exist.
 *
 * @param {String} name
 * @return {VirtualType}
 */

Schema.prototype.virtualpath = function (name) {
  return this.virtuals[name];
};

Schema.prototype.namedScope = function (name, fn) {
  var namedScopes = this.namedScopes || (this.namedScopes = new NamedScope)
    , newScope = Object.create(namedScopes)
    , allScopes = namedScopes.scopesByName || (namedScopes.scopesByName = {});
  allScopes[name] = newScope;
  newScope.name = name;
  newScope.block = fn;
  newScope.query = new Query();
  newScope.decorate(namedScopes, {
    block0: function (block) {
      return function () {
        block.call(this.query);
        return this;
      };
    },
    blockN: function (block) {
      return function () {
        block.apply(this.query, arguments);
        return this;
      };
    },
    basic: function (query) {
      return function () {
        this.query.find(query);
        return this;
      };
    }
  });
  return newScope;
};

/**
 * ObjectId schema identifier. Not an actual ObjectId, only used for Schemas.
 *
 * @api public
 */

function ObjectId () {
  throw new Error('This is an abstract interface. Its only purpose is to mark '
                + 'fields as ObjectId in the schema creation.');
}

/**
 * Module exports.
 */

module.exports = exports = Schema;

exports.Types = Types;

exports.ObjectId = ObjectId;
