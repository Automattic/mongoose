/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter
  , VirtualType = require('./virtualtype')
  , utils = require('./utils')
  , NamedScope
  , Query
  , Types

/**
 * Schema constructor.
 *
 * @param {Object} definition
 * @api public
 */

function Schema (obj, options) {
  if (!(this instanceof Schema))
    return new Schema(obj, options);

  this.paths = {};
  this.subpaths = {};
  this.virtuals = {};
  this.nested = {};
  this.inherits = {};
  this.callQueue = [];
  this._indexes = [];
  this.methods = {};
  this.statics = {};
  this.tree = {};
  this._requiredpaths = undefined;

  // set options
  this.options = utils.options({
      safe: true
    , strict: true
    , capped: false // { size, max, autoIndexId }
    , versionKey: '__v'
    , minimize: true
    , autoIndex: true
  }, options);

  // build paths
  if (obj) {
    this.add(obj);
  }

  if (!this.paths['_id'] && !this.options.noId) {
    this.add({ _id: {type: ObjectId, auto: true} });
  }

  if (!this.paths['id'] && !this.options.noVirtualId) {
    this.virtual('id').get(function () {
      if (this.__id) {
        return this.__id;
      }

      return this.__id = null == this._id
        ? null
        : this._id.toString();
    });
  }

  delete this.options.noVirtualId;

  // versioning not directly added to schema b/c we only want
  // it in the top level document, not embedded ones.
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

Schema.prototype.add = function add (obj, prefix) {
  prefix = prefix || '';
  for (var i in obj) {
    if (null == obj[i]) {
      throw new TypeError('Invalid value for schema path `'+ prefix + i +'`');
    }

    if (obj[i].constructor.name == 'Object' && (!obj[i].type || obj[i].type.type)) {
      if (Object.keys(obj[i]).length) {
        // nested object { last: { name: String }}
        this.nested[prefix + i] = true;
        this.add(obj[i], prefix + i + '.');
      }
      else
        this.path(prefix + i, obj[i]); // mixed type
    } else
      this.path(prefix + i, obj[i]);
  }
};

/**
 * Reserved document keys.
 *
 * Keys in this object are names that are rejected
 * in schema declarations b/c they conflict with
 * mongoose functionality.
 */

var reserved = Object.create(null);
reserved.on =
reserved.db =
reserved.init =
reserved.model =
reserved.isNew =
reserved.errors =
reserved.schema =
reserved.modelName =
reserved.collection = 1;

/**
 * Sets a path (if arity 2)
 * Gets a path (if arity 1)
 *
 * @param {String} path
 * @param {Object} constructor
 * @api public
 */

Schema.prototype.path = function (path, obj) {
  if (obj == undefined) {
    if (this.paths[path]) return this.paths[path];
    if (this.subpaths[path]) return this.subpaths[path];

    // subpaths?
    return /\.\d+\.?/.test(path)
      ? getPositionalPath(this, path)
      : undefined;
  }

  // some path names conflict with document methods
  if (reserved[path]) {
    throw new Error("`" + path + "` may not be used as a schema pathname");
  }

  // update the tree
  var subpaths = path.split(/\./)
    , last = subpaths.pop()
    , branch = this.tree;

  subpaths.forEach(function(path) {
    if (!branch[path]) branch[path] = {};
    branch = branch[path];
  });

  branch[last] = utils.clone(obj);

  this.paths[path] = Schema.interpretAsType(path, obj);
  return this;
};

/**
 * Converts -- e.g., Number, [SomeSchema],
 * { type: String, enum: ['m', 'f'] } -- into
 * the appropriate Mongoose Type, which we use
 * later for casting, validation, etc.
 * @param {String} path
 * @param {Object} constructor
 */

Schema.interpretAsType = function (path, obj) {
  if (obj.constructor.name != 'Object')
    obj = { type: obj };

  // Get the type making sure to allow keys named "type"
  // and default to mixed if not specified.
  // { type: { type: String, default: 'freshcut' } }
  var type = obj.type && !obj.type.type
    ? obj.type
    : {};

  if ('Object' == type.constructor.name || 'mixed' == type) {
    return new Types.Mixed(path, obj);
  }

  if (Array.isArray(type) || Array == type || 'array' == type) {
    // if it was specified through { type } look for `cast`
    var cast = (Array == type || 'array' == type)
      ? obj.cast
      : type[0];

    if (cast instanceof Schema) {
      return new Types.DocumentArray(path, cast, obj);
    }

    if ('string' == typeof cast) {
      cast = Types[cast.charAt(0).toUpperCase() + cast.substring(1)];
    } else if (cast && !cast.type
                    && 'Object' == cast.constructor.name
                    && Object.keys(cast).length) {
      return new Types.DocumentArray(path, new Schema(cast), obj);
    }

    return new Types.Array(path, cast || Types.Mixed, obj);
  }

  var name = 'string' == typeof type
    ? type
    : type.name;

  if (name) {
    name = name.charAt(0).toUpperCase() + name.substring(1);
  }

  if (undefined == Types[name]) {
    throw new TypeError('Undefined type at `' + path +
        '`\n  Did you try nesting Schemas? ' +
        'You can only nest using refs or arrays.');
  }

  return new Types[name](path, obj);
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
  var keys = Object.keys(this.paths)
    , len = keys.length;

  for (var i = 0; i < len; ++i) {
    fn(keys[i], this.paths[keys[i]]);
  }

  return this;
};

/**
 * Returns an Array of path strings that are required.
 * @api public
 */

Schema.prototype.requiredPaths = function requiredPaths () {
  if (this._requiredpaths) return this._requiredpaths;

  var paths = Object.keys(this.paths)
    , i = paths.length
    , ret = [];

  while (i--) {
    var path = paths[i];
    if (this.paths[path].isRequired) ret.push(path);
  }

  return this._requiredpaths = ret;
}

/**
 * Given a path, returns whether it is a real, virtual,
 * nested, or ad-hoc/undefined path.
 *
 * @param {String} path
 * @return {String}
 * @api public
 */

Schema.prototype.pathType = function (path) {
  if (path in this.paths) return 'real';
  if (path in this.virtuals) return 'virtual';
  if (path in this.nested) return 'nested';
  if (path in this.subpaths) return 'real';

  if (/\.\d+\.?/.test(path) && getPositionalPath(this, path)) {
    return 'real';
  } else {
    return 'adhocOrUndefined'
  }
};

function getPositionalPath (self, path) {
  var subpaths = path.split(/\.(\d+)\.?/).filter(Boolean);
  if (subpaths.length < 2) {
    return self.paths[subpaths[0]];
  }

  var val = self.path(subpaths[0])
    , last = subpaths.length - 1
    , subpath;

  for (var i = 1; i < subpaths.length; ++i) {
    var subpath = subpaths[i];

    if (i === last &&
        val &&
        !val.schema &&
        !/\D/.test(subpath) &&
        val instanceof Types.Array) {
      // StringSchema, NumberSchema, etc
      val = val.caster;
      continue;
    }

    // 'path.0.subpath'
    if (!/\D/.test(subpath)) continue;
    val = val.schema.path(subpath);
  }

  return self.subpaths[path] = val;
}

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

Schema.prototype.indexes = function () {
  var indexes = []
    , seenSchemas = [];

  collectIndexes(this);

  return indexes;

  function collectIndexes (schema, prefix) {
    if (~seenSchemas.indexOf(schema)) return;
    seenSchemas.push(schema);

    var index;
    var paths = schema.paths;
    prefix = prefix || '';

    for (var i in paths) {
      if (paths[i]) {
        if (paths[i] instanceof Types.DocumentArray) {
          collectIndexes(paths[i].schema, i + '.');
        } else {
          index = paths[i]._index;

          if (index !== false && index !== null){
            var field = {};
            field[prefix + i] = '2d' === index ? index : 1;
            var options = 'Object' === index.constructor.name ? index : {};
            if (!('background' in options)) options.background = true;
            indexes.push([field, options]);
          }
        }
      }
    }

    if (prefix) {
      fixSubIndexPaths(schema, prefix);
    } else {
      schema._indexes.forEach(function (index) {
        if (!('background' in index[1])) index[1].background = true;
      });
      indexes = indexes.concat(schema._indexes);
    }
  }

  /**
   * Checks for indexes added to subdocs using Schema.index().
   * These indexes need their paths prefixed properly.
   *
   * schema._indexes = [ [indexObj, options], [indexObj, options] ..]
   */

  function fixSubIndexPaths (schema, prefix) {
    var subindexes = schema._indexes
      , len = subindexes.length
      , indexObj
      , newindex
      , klen
      , keys
      , key
      , i = 0
      , j

    for (i = 0; i < len; ++i) {
      indexObj = subindexes[i][0];
      keys = Object.keys(indexObj);
      klen = keys.length;
      newindex = {};

      // use forward iteration, order matters
      for (j = 0; j < klen; ++j) {
        key = keys[j];
        newindex[prefix + key] = indexObj[key];
      }

      indexes.push([newindex, subindexes[i][1]]);
    }
  }

}

/**
 * Retrieves or creates the virtual type with the given name.
 *
 * @param {String} name
 * @return {VirtualType}
 */

Schema.prototype.virtual = function (name, options) {
  var virtuals = this.virtuals;
  var parts = name.split('.');
  return virtuals[name] = parts.reduce(function (mem, part, i) {
    mem[part] || (mem[part] = (i === parts.length-1)
                            ? new VirtualType(options)
                            : {});
    return mem[part];
  }, this.tree);
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

// require down here because of reference issues
exports.Types = Types = require('./schema/index');
NamedScope = require('./namedscope')
Query = require('./query');

exports.ObjectId = ObjectId;

