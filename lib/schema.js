/*!
 * Module dependencies.
 */

var readPref = require('./drivers').ReadPreference;
var EventEmitter = require('events').EventEmitter;
var VirtualType = require('./virtualtype');
var utils = require('./utils');
var MongooseTypes;
var Kareem = require('kareem');
var each = require('async/each');
var SchemaType = require('./schematype');
var mpath = require('mpath');

var IS_KAREEM_HOOK = {
  count: true,
  find: true,
  findOne: true,
  findOneAndUpdate: true,
  findOneAndRemove: true,
  insertMany: true,
  update: true,
  updateMany: true,
  updateOne: true
};

/**
 * Schema constructor.
 *
 * ####Example:
 *
 *     var child = new Schema({ name: String });
 *     var schema = new Schema({ name: String, age: Number, children: [child] });
 *     var Tree = mongoose.model('Tree', schema);
 *
 *     // setting schema options
 *     new Schema({ name: String }, { _id: false, autoIndex: false })
 *
 * ####Options:
 *
 * - [autoIndex](/docs/guide.html#autoIndex): bool - defaults to null (which means use the connection's autoIndex option)
 * - [bufferCommands](/docs/guide.html#bufferCommands): bool - defaults to true
 * - [capped](/docs/guide.html#capped): bool - defaults to false
 * - [collection](/docs/guide.html#collection): string - no default
 * - [emitIndexErrors](/docs/guide.html#emitIndexErrors): bool - defaults to false.
 * - [id](/docs/guide.html#id): bool - defaults to true
 * - [_id](/docs/guide.html#_id): bool - defaults to true
 * - `minimize`: bool - controls [document#toObject](#document_Document-toObject) behavior when called manually - defaults to true
 * - [read](/docs/guide.html#read): string
 * - [safe](/docs/guide.html#safe): bool - defaults to true.
 * - [shardKey](/docs/guide.html#shardKey): bool - defaults to `null`
 * - [strict](/docs/guide.html#strict): bool - defaults to true
 * - [toJSON](/docs/guide.html#toJSON) - object - no default
 * - [toObject](/docs/guide.html#toObject) - object - no default
 * - [typeKey](/docs/guide.html#typeKey) - string - defaults to 'type'
 * - [useNestedStrict](/docs/guide.html#useNestedStrict) - boolean - defaults to false
 * - [validateBeforeSave](/docs/guide.html#validateBeforeSave) - bool - defaults to `true`
 * - [versionKey](/docs/guide.html#versionKey): string - defaults to "__v"
 *
 * ####Note:
 *
 * _When nesting schemas, (`children` in the example above), always declare the child schema first before passing it into its parent._
 *
 * @param {Object} definition
 * @param {Object} [options]
 * @inherits NodeJS EventEmitter http://nodejs.org/api/events.html#events_class_events_eventemitter
 * @event `init`: Emitted after the schema is compiled into a `Model`.
 * @api public
 */

function Schema(obj, options) {
  if (!(this instanceof Schema)) {
    return new Schema(obj, options);
  }

  this.obj = obj;
  this.paths = {};
  this.aliases = {};
  this.subpaths = {};
  this.virtuals = {};
  this.singleNestedPaths = {};
  this.nested = {};
  this.inherits = {};
  this.callQueue = [];
  this._indexes = [];
  this.methods = {};
  this.statics = {};
  this.tree = {};
  this.query = {};
  this.childSchemas = [];
  this.plugins = [];

  this.s = {
    hooks: new Kareem(),
    kareemHooks: IS_KAREEM_HOOK
  };

  this.options = this.defaultOptions(options);

  // build paths
  if (obj) {
    this.add(obj);
  }

  // check if _id's value is a subdocument (gh-2276)
  var _idSubDoc = obj && obj._id && utils.isObject(obj._id);

  // ensure the documents get an auto _id unless disabled
  var auto_id = !this.paths['_id'] &&
      (!this.options.noId && this.options._id) && !_idSubDoc;

  if (auto_id) {
    var _obj = {_id: {auto: true}};
    _obj._id[this.options.typeKey] = Schema.ObjectId;
    this.add(_obj);
  }

  // ensure the documents receive an id getter unless disabled
  var autoid = !this.paths['id'] &&
      (!this.options.noVirtualId && this.options.id);
  if (autoid) {
    this.virtual('id').get(idGetter);
  }

  for (var i = 0; i < this._defaultMiddleware.length; ++i) {
    var m = this._defaultMiddleware[i];
    this[m.kind](m.hook, !!m.isAsync, m.fn);
  }

  if (this.options.timestamps) {
    this.setupTimestamp(this.options.timestamps);
  }

  // Assign virtual properties based on alias option
  aliasFields(this);
}

/*!
 * Create virtual properties with alias field
 */
function aliasFields(schema) {
  for (var path in schema.paths) {
    if (!schema.paths[path].options) continue;

    var prop = schema.paths[path].path;
    var alias = schema.paths[path].options.alias;

    if (alias) {
      if ('string' === typeof alias && alias.length > 0) {
        if (schema.aliases[alias])
          throw new Error('Duplicate alias, alias ' + alias + ' is used more than once');
        else
          schema.aliases[alias] = prop;

        schema
          .virtual(alias)
          .get((function(p) {
            return function() {
              return this.get(p);
            };
          })(prop))
          .set((function(p) {
            return function(v) {
              return this.set(p, v);
            };
          })(prop));
      } else {
        throw new Error('Invalid value for alias option on ' + prop + ', got ' + alias);
      }
    }
  }
}

/*!
 * Returns this documents _id cast to a string.
 */

function idGetter() {
  if (this._id != null) {
    return String(this._id);
  }

  return null;
}

/*!
 * Inherit from EventEmitter.
 */
Schema.prototype = Object.create(EventEmitter.prototype);
Schema.prototype.constructor = Schema;
Schema.prototype.instanceOfSchema = true;

/**
 * Default middleware attached to a schema. Cannot be changed.
 *
 * This field is used to make sure discriminators don't get multiple copies of
 * built-in middleware. Declared as a constant because changing this at runtime
 * may lead to instability with Model.prototype.discriminator().
 *
 * @api private
 * @property _defaultMiddleware
 */
Object.defineProperty(Schema.prototype, '_defaultMiddleware', {
  configurable: false,
  enumerable: false,
  writable: false,
  value: [
    {
      kind: 'pre',
      hook: 'remove',
      isAsync: true,
      fn: function(next, done) {
        if (this.ownerDocument) {
          done();
          next();
          return;
        }

        var subdocs = this.$__getAllSubdocs();

        if (!subdocs.length) {
          done();
          next();
          return;
        }

        each(subdocs, function(subdoc, cb) {
          subdoc.remove({ noop: true }, function(err) {
            cb(err);
          });
        }, function(error) {
          if (error) {
            done(error);
            return;
          }
          next();
          done();
        });
      }
    }
  ]
});


/**
 * The original object passed to the schema constructor
 *
 * ####Example:
 *
 *     var schema = new Schema({ a: String }).add({ b: String });
 *     schema.obj; // { a: String }
 *
 * @api public
 * @property obj
 */

Schema.prototype.obj;

/**
 * Schema as flat paths
 *
 * ####Example:
 *     {
 *         '_id'        : SchemaType,
 *       , 'nested.key' : SchemaType,
 *     }
 *
 * @api private
 * @property paths
 */

Schema.prototype.paths;

/**
 * Schema as a tree
 *
 * ####Example:
 *     {
 *         '_id'     : ObjectId
 *       , 'nested'  : {
 *             'key' : String
 *         }
 *     }
 *
 * @api private
 * @property tree
 */

Schema.prototype.tree;

/**
 * Returns a deep copy of the schema
 *
 * @return {Schema} the cloned schema
 * @api public
 */

Schema.prototype.clone = function() {
  var s = new Schema(this.obj, this.options);
  // Clone the call queue
  s.callQueue = this.callQueue.map(function(f) { return f; });
  s.methods = utils.clone(this.methods);
  s.statics = utils.clone(this.statics);
  s.plugins = Array.prototype.slice.call(this.plugins);
  s._indexes = utils.clone(this._indexes);
  s.s.hooks = this.s.hooks.clone();
  return s;
};

/**
 * Returns default options for this schema, merged with `options`.
 *
 * @param {Object} options
 * @return {Object}
 * @api private
 */

Schema.prototype.defaultOptions = function(options) {
  if (options && options.safe === false) {
    options.safe = {w: 0};
  }

  if (options && options.safe && options.safe.w === 0) {
    // if you turn off safe writes, then versioning goes off as well
    options.versionKey = false;
  }

  options = utils.options({
    strict: true,
    bufferCommands: true,
    capped: false, // { size, max, autoIndexId }
    versionKey: '__v',
    discriminatorKey: '__t',
    minimize: true,
    autoIndex: null,
    shardKey: null,
    read: null,
    validateBeforeSave: true,
    // the following are only applied at construction time
    noId: false, // deprecated, use { _id: false }
    _id: true,
    noVirtualId: false, // deprecated, use { id: false }
    id: true,
    typeKey: 'type',
    retainKeyOrder: false
  }, options);

  if (options.read) {
    options.read = readPref(options.read);
  }

  return options;
};

/**
 * Adds key path / schema type pairs to this schema.
 *
 * ####Example:
 *
 *     var ToySchema = new Schema;
 *     ToySchema.add({ name: 'string', color: 'string', price: 'number' });
 *
 * @param {Object} obj
 * @param {String} prefix
 * @api public
 */

Schema.prototype.add = function add(obj, prefix) {
  prefix = prefix || '';
  var keys = Object.keys(obj);

  for (var i = 0; i < keys.length; ++i) {
    var key = keys[i];

    if (obj[key] == null) {
      throw new TypeError('Invalid value for schema path `' + prefix + key + '`');
    }

    if (Array.isArray(obj[key]) && obj[key].length === 1 && obj[key][0] == null) {
      throw new TypeError('Invalid value for schema Array path `' + prefix + key + '`');
    }

    if (utils.isObject(obj[key]) &&
        (!obj[key].constructor || utils.getFunctionName(obj[key].constructor) === 'Object') &&
        (!obj[key][this.options.typeKey] || (this.options.typeKey === 'type' && obj[key].type.type))) {
      if (Object.keys(obj[key]).length) {
        // nested object { last: { name: String }}
        this.nested[prefix + key] = true;
        this.add(obj[key], prefix + key + '.');
      } else {
        if (prefix) {
          this.nested[prefix.substr(0, prefix.length - 1)] = true;
        }
        this.path(prefix + key, obj[key]); // mixed type
      }
    } else {
      if (prefix) {
        this.nested[prefix.substr(0, prefix.length - 1)] = true;
      }
      this.path(prefix + key, obj[key]);
    }
  }
};

/**
 * Reserved document keys.
 *
 * Keys in this object are names that are rejected in schema declarations b/c they conflict with mongoose functionality. Using these key name will throw an error.
 *
 *      on, emit, _events, db, get, set, init, isNew, errors, schema, options, modelName, collection, _pres, _posts, toObject
 *
 * _NOTE:_ Use of these terms as method names is permitted, but play at your own risk, as they may be existing mongoose document methods you are stomping on.
 *
 *      var schema = new Schema(..);
 *      schema.methods.init = function () {} // potentially breaking
 */

Schema.reserved = Object.create(null);
var reserved = Schema.reserved;
// Core object
reserved['prototype'] =
// EventEmitter
reserved.emit =
reserved.on =
reserved.once =
reserved.listeners =
reserved.removeListener =
// document properties and functions
reserved.collection =
reserved.db =
reserved.errors =
reserved.init =
reserved.isModified =
reserved.isNew =
reserved.get =
reserved.modelName =
reserved.save =
reserved.schema =
reserved.set =
reserved.toObject =
reserved.validate =
reserved.remove =
// hooks.js
reserved._pres = reserved._posts = 1;

/*!
 * Document keys to print warnings for
 */

var warnings = {};
warnings.increment = '`increment` should not be used as a schema path name ' +
    'unless you have disabled versioning.';

/**
 * Gets/sets schema paths.
 *
 * Sets a path (if arity 2)
 * Gets a path (if arity 1)
 *
 * ####Example
 *
 *     schema.path('name') // returns a SchemaType
 *     schema.path('name', Number) // changes the schemaType of `name` to Number
 *
 * @param {String} path
 * @param {Object} constructor
 * @api public
 */

Schema.prototype.path = function(path, obj) {
  if (obj === undefined) {
    if (this.paths[path]) {
      return this.paths[path];
    }
    if (this.subpaths[path]) {
      return this.subpaths[path];
    }
    if (this.singleNestedPaths[path]) {
      return this.singleNestedPaths[path];
    }

    // subpaths?
    return /\.\d+\.?.*$/.test(path)
        ? getPositionalPath(this, path)
        : undefined;
  }

  // some path names conflict with document methods
  if (reserved[path]) {
    throw new Error('`' + path + '` may not be used as a schema pathname');
  }

  if (warnings[path]) {
    console.log('WARN: ' + warnings[path]);
  }

  // update the tree
  var subpaths = path.split(/\./),
      last = subpaths.pop(),
      branch = this.tree;

  subpaths.forEach(function(sub, i) {
    if (!branch[sub]) {
      branch[sub] = {};
    }
    if (typeof branch[sub] !== 'object') {
      var msg = 'Cannot set nested path `' + path + '`. '
          + 'Parent path `'
          + subpaths.slice(0, i).concat([sub]).join('.')
          + '` already set to type ' + branch[sub].name
          + '.';
      throw new Error(msg);
    }
    branch = branch[sub];
  });

  branch[last] = utils.clone(obj);

  this.paths[path] = Schema.interpretAsType(path, obj, this.options);

  if (this.paths[path].$isSingleNested) {
    for (var key in this.paths[path].schema.paths) {
      this.singleNestedPaths[path + '.' + key] =
          this.paths[path].schema.paths[key];
    }
    for (key in this.paths[path].schema.singleNestedPaths) {
      this.singleNestedPaths[path + '.' + key] =
          this.paths[path].schema.singleNestedPaths[key];
    }

    this.childSchemas.push(this.paths[path].schema);
  } else if (this.paths[path].$isMongooseDocumentArray) {
    this.childSchemas.push(this.paths[path].schema);
  }
  return this;
};

/**
 * Converts type arguments into Mongoose Types.
 *
 * @param {String} path
 * @param {Object} obj constructor
 * @api private
 */

Schema.interpretAsType = function(path, obj, options) {
  if (obj.constructor) {
    var constructorName = utils.getFunctionName(obj.constructor);
    if (constructorName !== 'Object') {
      var oldObj = obj;
      obj = {};
      obj[options.typeKey] = oldObj;
    }
  }

  // Get the type making sure to allow keys named "type"
  // and default to mixed if not specified.
  // { type: { type: String, default: 'freshcut' } }
  var type = obj[options.typeKey] && (options.typeKey !== 'type' || !obj.type.type)
      ? obj[options.typeKey]
      : {};

  if (utils.getFunctionName(type.constructor) === 'Object' || type === 'mixed') {
    return new MongooseTypes.Mixed(path, obj);
  }

  if (Array.isArray(type) || Array === type || type === 'array') {
    // if it was specified through { type } look for `cast`
    var cast = (Array === type || type === 'array')
        ? obj.cast
        : type[0];

    if (cast && cast.instanceOfSchema) {
      return new MongooseTypes.DocumentArray(path, cast, obj);
    }

    if (Array.isArray(cast)) {
      return new MongooseTypes.Array(path, Schema.interpretAsType(path, cast, options), obj);
    }

    if (typeof cast === 'string') {
      cast = MongooseTypes[cast.charAt(0).toUpperCase() + cast.substring(1)];
    } else if (cast && (!cast[options.typeKey] || (options.typeKey === 'type' && cast.type.type))
        && utils.getFunctionName(cast.constructor) === 'Object') {
      if (Object.keys(cast).length) {
        // The `minimize` and `typeKey` options propagate to child schemas
        // declared inline, like `{ arr: [{ val: { $type: String } }] }`.
        // See gh-3560
        var childSchemaOptions = {minimize: options.minimize};
        if (options.typeKey) {
          childSchemaOptions.typeKey = options.typeKey;
        }
        //propagate 'strict' option to child schema
        if (options.hasOwnProperty('strict')) {
          childSchemaOptions.strict = options.strict;
        }
        var childSchema = new Schema(cast, childSchemaOptions);
        childSchema.$implicitlyCreated = true;
        return new MongooseTypes.DocumentArray(path, childSchema, obj);
      } else {
        // Special case: empty object becomes mixed
        return new MongooseTypes.Array(path, MongooseTypes.Mixed, obj);
      }
    }

    if (cast) {
      type = cast[options.typeKey] && (options.typeKey !== 'type' || !cast.type.type)
          ? cast[options.typeKey]
          : cast;

      name = typeof type === 'string'
          ? type
          : type.schemaName || utils.getFunctionName(type);

      if (!(name in MongooseTypes)) {
        throw new TypeError('Undefined type `' + name + '` at array `' + path +
          '`');
      }
    }

    return new MongooseTypes.Array(path, cast || MongooseTypes.Mixed, obj, options);
  }

  if (type && type.instanceOfSchema) {
    return new MongooseTypes.Embedded(type, path, obj);
  }

  var name;
  if (Buffer.isBuffer(type)) {
    name = 'Buffer';
  } else {
    name = typeof type === 'string'
        ? type
      // If not string, `type` is a function. Outside of IE, function.name
      // gives you the function name. In IE, you need to compute it
        : type.schemaName || utils.getFunctionName(type);
  }

  if (name) {
    name = name.charAt(0).toUpperCase() + name.substring(1);
  }

  if (undefined == MongooseTypes[name]) {
    throw new TypeError('Undefined type `' + name + '` at `' + path +
        '`\n  Did you try nesting Schemas? ' +
        'You can only nest using refs or arrays.');
  }

  obj = utils.clone(obj, { retainKeyOrder: true });
  if (!('runSettersOnQuery' in obj)) {
    obj.runSettersOnQuery = options.runSettersOnQuery;
  }
  return new MongooseTypes[name](path, obj);
};

/**
 * Iterates the schemas paths similar to Array#forEach.
 *
 * The callback is passed the pathname and schemaType as arguments on each iteration.
 *
 * @param {Function} fn callback function
 * @return {Schema} this
 * @api public
 */

Schema.prototype.eachPath = function(fn) {
  var keys = Object.keys(this.paths),
      len = keys.length;

  for (var i = 0; i < len; ++i) {
    fn(keys[i], this.paths[keys[i]]);
  }

  return this;
};

/**
 * Returns an Array of path strings that are required by this schema.
 *
 * @api public
 * @param {Boolean} invalidate refresh the cache
 * @return {Array}
 */

Schema.prototype.requiredPaths = function requiredPaths(invalidate) {
  if (this._requiredpaths && !invalidate) {
    return this._requiredpaths;
  }

  var paths = Object.keys(this.paths),
      i = paths.length,
      ret = [];

  while (i--) {
    var path = paths[i];
    if (this.paths[path].isRequired) {
      ret.push(path);
    }
  }
  this._requiredpaths = ret;
  return this._requiredpaths;
};

/**
 * Returns indexes from fields and schema-level indexes (cached).
 *
 * @api private
 * @return {Array}
 */

Schema.prototype.indexedPaths = function indexedPaths() {
  if (this._indexedpaths) {
    return this._indexedpaths;
  }
  this._indexedpaths = this.indexes();
  return this._indexedpaths;
};

/**
 * Returns the pathType of `path` for this schema.
 *
 * Given a path, returns whether it is a real, virtual, nested, or ad-hoc/undefined path.
 *
 * @param {String} path
 * @return {String}
 * @api public
 */

Schema.prototype.pathType = function(path) {
  if (path in this.paths) {
    return 'real';
  }
  if (path in this.virtuals) {
    return 'virtual';
  }
  if (path in this.nested) {
    return 'nested';
  }
  if (path in this.subpaths) {
    return 'real';
  }
  if (path in this.singleNestedPaths) {
    return 'real';
  }

  if (/\.\d+\.|\.\d+$/.test(path)) {
    return getPositionalPathType(this, path);
  }
  return 'adhocOrUndefined';
};

/**
 * Returns true iff this path is a child of a mixed schema.
 *
 * @param {String} path
 * @return {Boolean}
 * @api private
 */

Schema.prototype.hasMixedParent = function(path) {
  var subpaths = path.split(/\./g);
  path = '';
  for (var i = 0; i < subpaths.length; ++i) {
    path = i > 0 ? path + '.' + subpaths[i] : subpaths[i];
    if (path in this.paths &&
        this.paths[path] instanceof MongooseTypes.Mixed) {
      return true;
    }
  }

  return false;
};

/**
 * Setup updatedAt and createdAt timestamps to documents if enabled
 *
 * @param {Boolean|Object} timestamps timestamps options
 * @api private
 */
Schema.prototype.setupTimestamp = function(timestamps) {
  if (timestamps) {
    var createdAt = timestamps.createdAt || 'createdAt';
    var updatedAt = timestamps.updatedAt || 'updatedAt';
    var schemaAdditions = {};

    var parts = createdAt.split('.');
    var i;
    var cur = schemaAdditions;
    if (this.pathType(createdAt) === 'adhocOrUndefined') {
      for (i = 0; i < parts.length; ++i) {
        cur[parts[i]] = (i < parts.length - 1 ?
          cur[parts[i]] || {} :
          Date);
      }
    }

    parts = updatedAt.split('.');
    cur = schemaAdditions;
    if (this.pathType(createdAt) === 'adhocOrUndefined') {
      for (i = 0; i < parts.length; ++i) {
        cur[parts[i]] = (i < parts.length - 1 ?
          cur[parts[i]] || {} :
          Date);
      }
    }

    this.add(schemaAdditions);

    this.pre('save', function(next) {
      var defaultTimestamp = new Date();
      var auto_id = this._id && this._id.auto;

      if (!this.get(createdAt) && this.isSelected(createdAt)) {
        this.set(createdAt, auto_id ? this._id.getTimestamp() : defaultTimestamp);
      }

      if (this.isNew || this.isModified()) {
        this.set(updatedAt, this.isNew ? this.get(createdAt) : defaultTimestamp);
      }

      next();
    });

    var genUpdates = function(currentUpdate, overwrite) {
      var now = new Date();
      var updates = {};
      var _updates = updates;
      if (overwrite) {
        if (currentUpdate && currentUpdate.$set) {
          currentUpdate = currentUpdate.$set;
          updates.$set = {};
          _updates = updates.$set;
        }
        if (!currentUpdate[updatedAt]) {
          _updates[updatedAt] = now;
        }
        if (!currentUpdate[createdAt]) {
          _updates[createdAt] = now;
        }
        return updates;
      }
      updates = { $set: {} };
      currentUpdate = currentUpdate || {};

      if (!currentUpdate.$currentDate || !currentUpdate.$currentDate[updatedAt]) {
        updates.$set[updatedAt] = now;
      }

      if (currentUpdate[createdAt]) {
        delete currentUpdate[createdAt];
      }
      if (currentUpdate.$set && currentUpdate.$set[createdAt]) {
        delete currentUpdate.$set[createdAt];
      }

      updates.$setOnInsert = {};
      updates.$setOnInsert[createdAt] = now;

      return updates;
    };

    this.methods.initializeTimestamps = function() {
      if (!this.get(createdAt)) {
        this.set(createdAt, new Date());
      }
      if (!this.get(updatedAt)) {
        this.set(updatedAt, new Date());
      }
      return this;
    };

    this.pre('findOneAndUpdate', function(next) {
      var overwrite = this.options.overwrite;
      this.findOneAndUpdate({}, genUpdates(this.getUpdate(), overwrite), {
        overwrite: overwrite
      });
      applyTimestampsToChildren(this);
      next();
    });

    this.pre('update', function(next) {
      var overwrite = this.options.overwrite;
      this.update({}, genUpdates(this.getUpdate(), overwrite), {
        overwrite: overwrite
      });
      applyTimestampsToChildren(this);
      next();
    });
  }
};

/*!
 * ignore
 */

function applyTimestampsToChildren(query) {
  var now = new Date();
  var update = query.getUpdate();
  var keys = Object.keys(update);
  var key;
  var schema = query.model.schema;
  var len;
  var createdAt;
  var updatedAt;
  var timestamps;
  var path;

  var hasDollarKey = keys.length && keys[0].charAt(0) === '$';

  if (hasDollarKey) {
    if (update.$push) {
      for (key in update.$push) {
        var $path = schema.path(key);
        if (update.$push[key] &&
            $path &&
            $path.$isMongooseDocumentArray &&
            $path.schema.options.timestamps) {
          timestamps = $path.schema.options.timestamps;
          createdAt = timestamps.createdAt || 'createdAt';
          updatedAt = timestamps.updatedAt || 'updatedAt';
          if (update.$push[key].$each) {
            update.$push[key].$each.forEach(function(subdoc) {
              subdoc[updatedAt] = now;
              subdoc[createdAt] = now;
            });
          } else {
            update.$push[key][updatedAt] = now;
            update.$push[key][createdAt] = now;
          }
        }
      }
    }
    if (update.$set) {
      for (key in update.$set) {
        path = schema.path(key);
        if (!path) {
          continue;
        }
        if (Array.isArray(update.$set[key]) && path.$isMongooseDocumentArray) {
          len = update.$set[key].length;
          timestamps = schema.path(key).schema.options.timestamps;
          if (timestamps) {
            createdAt = timestamps.createdAt || 'createdAt';
            updatedAt = timestamps.updatedAt || 'updatedAt';
            for (var i = 0; i < len; ++i) {
              update.$set[key][i][updatedAt] = now;
              update.$set[key][i][createdAt] = now;
            }
          }
        } else if (update.$set[key] && path.$isSingleNested) {
          timestamps = schema.path(key).schema.options.timestamps;
          if (timestamps) {
            createdAt = timestamps.createdAt || 'createdAt';
            updatedAt = timestamps.updatedAt || 'updatedAt';
            update.$set[key][updatedAt] = now;
            update.$set[key][createdAt] = now;
          }
        }
      }
    }
  }
}

/*!
 * ignore
 */

function getPositionalPathType(self, path) {
  var subpaths = path.split(/\.(\d+)\.|\.(\d+)$/).filter(Boolean);
  if (subpaths.length < 2) {
    return self.paths[subpaths[0]];
  }

  var val = self.path(subpaths[0]);
  var isNested = false;
  if (!val) {
    return val;
  }

  var last = subpaths.length - 1,
      subpath,
      i = 1;

  for (; i < subpaths.length; ++i) {
    isNested = false;
    subpath = subpaths[i];

    if (i === last && val && !/\D/.test(subpath)) {
      if (val.$isMongooseDocumentArray) {
        var oldVal = val;
        val = new SchemaType(subpath);
        val.cast = function(value, doc, init) {
          return oldVal.cast(value, doc, init)[0];
        };
        val.caster = oldVal.caster;
        val.schema = oldVal.schema;
      } else if (val instanceof MongooseTypes.Array) {
        // StringSchema, NumberSchema, etc
        val = val.caster;
      } else {
        val = undefined;
      }
      break;
    }

    // ignore if its just a position segment: path.0.subpath
    if (!/\D/.test(subpath)) {
      continue;
    }

    if (!(val && val.schema)) {
      val = undefined;
      break;
    }

    var type = val.schema.pathType(subpath);
    isNested = (type === 'nested');
    val = val.schema.path(subpath);
  }

  self.subpaths[path] = val;
  if (val) {
    return 'real';
  }
  if (isNested) {
    return 'nested';
  }
  return 'adhocOrUndefined';
}


/*!
 * ignore
 */

function getPositionalPath(self, path) {
  getPositionalPathType(self, path);
  return self.subpaths[path];
}

/**
 * Adds a method call to the queue.
 *
 * @param {String} name name of the document method to call later
 * @param {Array} args arguments to pass to the method
 * @api public
 */

Schema.prototype.queue = function(name, args) {
  this.callQueue.push([name, args]);
  return this;
};

/**
 * Defines a pre hook for the document.
 *
 * ####Example
 *
 *     var toySchema = new Schema(..);
 *
 *     toySchema.pre('save', function (next) {
 *       if (!this.created) this.created = new Date;
 *       next();
 *     })
 *
 *     toySchema.pre('validate', function (next) {
 *       if (this.name !== 'Woody') this.name = 'Woody';
 *       next();
 *     })
 *
 * @param {String} method
 * @param {Function} callback
 * @see hooks.js https://github.com/bnoguchi/hooks-js/tree/31ec571cef0332e21121ee7157e0cf9728572cc3
 * @api public
 */

Schema.prototype.pre = function() {
  var name = arguments[0];
  if (IS_KAREEM_HOOK[name]) {
    this.s.hooks.pre.apply(this.s.hooks, arguments);
    return this;
  }
  return this.queue('pre', arguments);
};

/**
 * Defines a post hook for the document
 *
 *     var schema = new Schema(..);
 *     schema.post('save', function (doc) {
 *       console.log('this fired after a document was saved');
 *     });
 *
 *     schema.post('find', function(docs) {
 *       console.log('this fired after you run a find query');
 *     });
 *
 *     var Model = mongoose.model('Model', schema);
 *
 *     var m = new Model(..);
 *     m.save(function(err) {
 *       console.log('this fires after the `post` hook');
 *     });
 *
 *     m.find(function(err, docs) {
 *       console.log('this fires after the post find hook');
 *     });
 *
 * @param {String} method name of the method to hook
 * @param {Function} fn callback
 * @see middleware http://mongoosejs.com/docs/middleware.html
 * @see hooks.js https://www.npmjs.com/package/hooks-fixed
 * @see kareem http://npmjs.org/package/kareem
 * @api public
 */

Schema.prototype.post = function(method, fn) {
  if (IS_KAREEM_HOOK[method]) {
    this.s.hooks.post.apply(this.s.hooks, arguments);
    return this;
  }
  // assuming that all callbacks with arity < 2 are synchronous post hooks
  if (fn.length < 2) {
    return this.queue('on', [arguments[0], function(doc) {
      return fn.call(doc, doc);
    }]);
  }

  if (fn.length === 3) {
    this.s.hooks.post(method + ':error', fn);
    return this;
  }

  return this.queue('post', [arguments[0], function(next) {
    // wrap original function so that the callback goes last,
    // for compatibility with old code that is using synchronous post hooks
    var _this = this;
    var args = Array.prototype.slice.call(arguments, 1);
    fn.call(this, this, function(err) {
      return next.apply(_this, [err].concat(args));
    });
  }]);
};

/**
 * Registers a plugin for this schema.
 *
 * @param {Function} plugin callback
 * @param {Object} [opts]
 * @see plugins
 * @api public
 */

Schema.prototype.plugin = function(fn, opts) {
  if (typeof fn !== 'function') {
    throw new Error('First param to `schema.plugin()` must be a function, ' +
      'got "' + (typeof fn) + '"');
  }

  if (opts &&
      opts.deduplicate) {
    for (var i = 0; i < this.plugins.length; ++i) {
      if (this.plugins[i].fn === fn) {
        return this;
      }
    }
  }
  this.plugins.push({ fn: fn, opts: opts });

  fn(this, opts);
  return this;
};

/**
 * Adds an instance method to documents constructed from Models compiled from this schema.
 *
 * ####Example
 *
 *     var schema = kittySchema = new Schema(..);
 *
 *     schema.method('meow', function () {
 *       console.log('meeeeeoooooooooooow');
 *     })
 *
 *     var Kitty = mongoose.model('Kitty', schema);
 *
 *     var fizz = new Kitty;
 *     fizz.meow(); // meeeeeooooooooooooow
 *
 * If a hash of name/fn pairs is passed as the only argument, each name/fn pair will be added as methods.
 *
 *     schema.method({
 *         purr: function () {}
 *       , scratch: function () {}
 *     });
 *
 *     // later
 *     fizz.purr();
 *     fizz.scratch();
 *
 * @param {String|Object} method name
 * @param {Function} [fn]
 * @api public
 */

Schema.prototype.method = function(name, fn) {
  if (typeof name !== 'string') {
    for (var i in name) {
      this.methods[i] = name[i];
    }
  } else {
    this.methods[name] = fn;
  }
  return this;
};

/**
 * Adds static "class" methods to Models compiled from this schema.
 *
 * ####Example
 *
 *     var schema = new Schema(..);
 *     schema.static('findByName', function (name, callback) {
 *       return this.find({ name: name }, callback);
 *     });
 *
 *     var Drink = mongoose.model('Drink', schema);
 *     Drink.findByName('sanpellegrino', function (err, drinks) {
 *       //
 *     });
 *
 * If a hash of name/fn pairs is passed as the only argument, each name/fn pair will be added as statics.
 *
 * @param {String|Object} name
 * @param {Function} [fn]
 * @api public
 */

Schema.prototype.static = function(name, fn) {
  if (typeof name !== 'string') {
    for (var i in name) {
      this.statics[i] = name[i];
    }
  } else {
    this.statics[name] = fn;
  }
  return this;
};

/**
 * Defines an index (most likely compound) for this schema.
 *
 * ####Example
 *
 *     schema.index({ first: 1, last: -1 })
 *
 * @param {Object} fields
 * @param {Object} [options] Options to pass to [MongoDB driver's `createIndex()` function](http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#createIndex)
 * @param {String} [options.expires=null] Mongoose-specific syntactic sugar, uses [ms](https://www.npmjs.com/package/ms) to convert `expires` option into seconds for the `expireAfterSeconds` in the above link.
 * @api public
 */

Schema.prototype.index = function(fields, options) {
  options || (options = {});

  if (options.expires) {
    utils.expires(options);
  }

  this._indexes.push([fields, options]);
  return this;
};

/**
 * Sets/gets a schema option.
 *
 * ####Example
 *
 *     schema.set('strict'); // 'true' by default
 *     schema.set('strict', false); // Sets 'strict' to false
 *     schema.set('strict'); // 'false'
 *
 * @param {String} key option name
 * @param {Object} [value] if not passed, the current option value is returned
 * @see Schema ./
 * @api public
 */

Schema.prototype.set = function(key, value, _tags) {
  if (arguments.length === 1) {
    return this.options[key];
  }

  switch (key) {
    case 'read':
      this.options[key] = readPref(value, _tags);
      break;
    case 'safe':
      this.options[key] = value === false
          ? {w: 0}
          : value;
      break;
    case 'timestamps':
      this.setupTimestamp(value);
      this.options[key] = value;
      break;
    default:
      this.options[key] = value;
  }

  return this;
};

/**
 * Gets a schema option.
 *
 * @param {String} key option name
 * @api public
 */

Schema.prototype.get = function(key) {
  return this.options[key];
};

/**
 * The allowed index types
 *
 * @static indexTypes
 * @receiver Schema
 * @api public
 */

var indexTypes = '2d 2dsphere hashed text'.split(' ');

Object.defineProperty(Schema, 'indexTypes', {
  get: function() {
    return indexTypes;
  },
  set: function() {
    throw new Error('Cannot overwrite Schema.indexTypes');
  }
});

/**
 * Compiles indexes from fields and schema-level indexes
 *
 * @api public
 */

Schema.prototype.indexes = function() {
  'use strict';

  var indexes = [];
  var schemaStack = [];

  var collectIndexes = function(schema, prefix) {
    // Ignore infinitely nested schemas, if we've already seen this schema
    // along this path there must be a cycle
    if (schemaStack.indexOf(schema) !== -1) {
      return;
    }
    schemaStack.push(schema);

    prefix = prefix || '';
    var key, path, index, field, isObject, options, type;
    var keys = Object.keys(schema.paths);

    for (var i = 0; i < keys.length; ++i) {
      key = keys[i];
      path = schema.paths[key];

      if ((path instanceof MongooseTypes.DocumentArray) || path.$isSingleNested) {
        collectIndexes(path.schema, prefix + key + '.');
      } else {
        index = path._index || (path.caster && path.caster._index);

        if (index !== false && index !== null && index !== undefined) {
          field = {};
          isObject = utils.isObject(index);
          options = isObject ? index : {};
          type = typeof index === 'string' ? index :
              isObject ? index.type :
                  false;

          if (type && ~Schema.indexTypes.indexOf(type)) {
            field[prefix + key] = type;
          } else if (options.text) {
            field[prefix + key] = 'text';
            delete options.text;
          } else {
            field[prefix + key] = 1;
          }

          delete options.type;
          if (!('background' in options)) {
            options.background = true;
          }

          indexes.push([field, options]);
        }
      }
    }

    schemaStack.pop();

    if (prefix) {
      fixSubIndexPaths(schema, prefix);
    } else {
      schema._indexes.forEach(function(index) {
        if (!('background' in index[1])) {
          index[1].background = true;
        }
      });
      indexes = indexes.concat(schema._indexes);
    }
  };

  collectIndexes(this);
  return indexes;

  /*!
   * Checks for indexes added to subdocs using Schema.index().
   * These indexes need their paths prefixed properly.
   *
   * schema._indexes = [ [indexObj, options], [indexObj, options] ..]
   */

  function fixSubIndexPaths(schema, prefix) {
    var subindexes = schema._indexes,
        len = subindexes.length,
        indexObj,
        newindex,
        klen,
        keys,
        key,
        i = 0,
        j;

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
};

/**
 * Creates a virtual type with the given name.
 *
 * @param {String} name
 * @param {Object} [options]
 * @return {VirtualType}
 */

Schema.prototype.virtual = function(name, options) {
  if (options && options.ref) {
    if (!options.localField) {
      throw new Error('Reference virtuals require `localField` option');
    }

    if (!options.foreignField) {
      throw new Error('Reference virtuals require `foreignField` option');
    }

    this.pre('init', function(next, obj) {
      if (mpath.has(name, obj)) {
        var _v = mpath.get(name, obj);
        if (!this.$$populatedVirtuals) {
          this.$$populatedVirtuals = {};
        }

        if (options.justOne) {
          this.$$populatedVirtuals[name] = Array.isArray(_v) ?
            _v[0] :
            _v;
        } else {
          this.$$populatedVirtuals[name] = Array.isArray(_v) ?
            _v :
            _v == null ? [] : [_v];
        }

        mpath.unset(name, obj);
      }
      if (this.ownerDocument) {
        next();
        return this;
      } else {
        next();
      }
    });

    var virtual = this.virtual(name);
    virtual.options = options;
    return virtual.
      get(function() {
        if (!this.$$populatedVirtuals) {
          this.$$populatedVirtuals = {};
        }
        if (name in this.$$populatedVirtuals) {
          return this.$$populatedVirtuals[name];
        }
        return null;
      }).
      set(function(_v) {
        if (!this.$$populatedVirtuals) {
          this.$$populatedVirtuals = {};
        }

        if (options.justOne) {
          this.$$populatedVirtuals[name] = Array.isArray(_v) ?
            _v[0] :
            _v;

          if (typeof this.$$populatedVirtuals[name] !== 'object') {
            this.$$populatedVirtuals[name] = null;
          }
        } else {
          this.$$populatedVirtuals[name] = Array.isArray(_v) ?
            _v :
            _v == null ? [] : [_v];

          this.$$populatedVirtuals[name] = this.$$populatedVirtuals[name].filter(function(doc) {
            return doc && typeof doc === 'object';
          });
        }
      });
  }

  var virtuals = this.virtuals;
  var parts = name.split('.');

  if (this.pathType(name) === 'real') {
    throw new Error('Virtual path "' + name + '"' +
      ' conflicts with a real path in the schema');
  }

  virtuals[name] = parts.reduce(function(mem, part, i) {
    mem[part] || (mem[part] = (i === parts.length - 1)
        ? new VirtualType(options, name)
        : {});
    return mem[part];
  }, this.tree);

  return virtuals[name];
};

/*!
 * ignore
 */

Schema.prototype._getVirtual = function(name) {
  return _getVirtual(this, name);
};

/*!
 * ignore
 */

function _getVirtual(schema, name) {
  if (schema.virtuals[name]) {
    return schema.virtuals[name];
  }
  var parts = name.split('.');
  var cur = '';
  var nestedSchemaPath = '';
  for (var i = 0; i < parts.length; ++i) {
    cur += (cur.length > 0 ? '.' : '') + parts[i];
    if (schema.virtuals[cur]) {
      if (i === parts.length - 1) {
        schema.virtuals[cur].$nestedSchemaPath = nestedSchemaPath;
        return schema.virtuals[cur];
      }
      continue;
    } else if (schema.paths[cur] && schema.paths[cur].schema) {
      schema = schema.paths[cur].schema;
      nestedSchemaPath += (nestedSchemaPath.length > 0 ? '.' : '') + cur;
      cur = '';
    } else {
      return null;
    }
  }
}

/**
 * Returns the virtual type with the given `name`.
 *
 * @param {String} name
 * @return {VirtualType}
 */

Schema.prototype.virtualpath = function(name) {
  return this.virtuals[name];
};

/**
 * Removes the given `path` (or [`paths`]).
 *
 * @param {String|Array} path
 *
 * @api public
 */
Schema.prototype.remove = function(path) {
  if (typeof path === 'string') {
    path = [path];
  }
  if (Array.isArray(path)) {
    path.forEach(function(name) {
      if (this.path(name)) {
        delete this.paths[name];

        var pieces = name.split('.');
        var last = pieces.pop();
        var branch = this.tree;
        for (var i = 0; i < pieces.length; ++i) {
          branch = branch[pieces[i]];
        }
        delete branch[last];
      }
    }, this);
  }
};

/**
 * Loads an ES6 class into a schema. Maps setters + getters, static methods, and instance methods to schema virtuals, statics, and methods.
 *
 * @param {Function} model
 */
Schema.prototype.loadClass = function(model, virtualsOnly) {
  if (model === Object.prototype ||
      model === Function.prototype ||
      model.prototype.hasOwnProperty('$isMongooseModelPrototype')) {
    return this;
  }

  this.loadClass(Object.getPrototypeOf(model));

  // Add static methods
  if (!virtualsOnly) {
    Object.getOwnPropertyNames(model).forEach(function(name) {
      if (name.match(/^(length|name|prototype)$/)) {
        return;
      }
      var method = Object.getOwnPropertyDescriptor(model, name);
      if (typeof method.value === 'function') {
        this.static(name, method.value);
      }
    }, this);
  }

  // Add methods and virtuals
  Object.getOwnPropertyNames(model.prototype).forEach(function(name) {
    if (name.match(/^(constructor)$/)) {
      return;
    }
    var method = Object.getOwnPropertyDescriptor(model.prototype, name);
    if (!virtualsOnly) {
      if (typeof method.value === 'function') {
        this.method(name, method.value);
      }
    }
    if (typeof method.get === 'function') {
      this.virtual(name).get(method.get);
    }
    if (typeof method.set === 'function') {
      this.virtual(name).set(method.set);
    }
  }, this);

  return this;
};

/*!
 * ignore
 */

Schema.prototype._getSchema = function(path) {
  var _this = this;
  var pathschema = _this.path(path);
  var resultPath = [];

  if (pathschema) {
    pathschema.$fullPath = path;
    return pathschema;
  }

  function search(parts, schema) {
    var p = parts.length + 1,
        foundschema,
        trypath;

    while (p--) {
      trypath = parts.slice(0, p).join('.');
      foundschema = schema.path(trypath);
      if (foundschema) {
        resultPath.push(trypath);

        if (foundschema.caster) {
          // array of Mixed?
          if (foundschema.caster instanceof MongooseTypes.Mixed) {
            foundschema.caster.$fullPath = resultPath.join('.');
            return foundschema.caster;
          }

          // Now that we found the array, we need to check if there
          // are remaining document paths to look up for casting.
          // Also we need to handle array.$.path since schema.path
          // doesn't work for that.
          // If there is no foundschema.schema we are dealing with
          // a path like array.$
          if (p !== parts.length && foundschema.schema) {
            var ret;
            if (parts[p] === '$') {
              if (p + 1 === parts.length) {
                // comments.$
                return foundschema;
              }
              // comments.$.comments.$.title
              ret = search(parts.slice(p + 1), foundschema.schema);
              if (ret) {
                ret.$isUnderneathDocArray = ret.$isUnderneathDocArray ||
                  !foundschema.schema.$isSingleNested;
              }
              return ret;
            }
            // this is the last path of the selector
            ret = search(parts.slice(p), foundschema.schema);
            if (ret) {
              ret.$isUnderneathDocArray = ret.$isUnderneathDocArray ||
                !foundschema.schema.$isSingleNested;
            }
            return ret;
          }
        }

        foundschema.$fullPath = resultPath.join('.');

        return foundschema;
      }
    }
  }

  // look for arrays
  return search(path.split('.'), _this);
};

/*!
 * ignore
 */

Schema.prototype._getPathType = function(path) {
  var _this = this;
  var pathschema = _this.path(path);

  if (pathschema) {
    return 'real';
  }

  function search(parts, schema) {
    var p = parts.length + 1,
        foundschema,
        trypath;

    while (p--) {
      trypath = parts.slice(0, p).join('.');
      foundschema = schema.path(trypath);
      if (foundschema) {
        if (foundschema.caster) {
          // array of Mixed?
          if (foundschema.caster instanceof MongooseTypes.Mixed) {
            return { schema: foundschema, pathType: 'mixed' };
          }

          // Now that we found the array, we need to check if there
          // are remaining document paths to look up for casting.
          // Also we need to handle array.$.path since schema.path
          // doesn't work for that.
          // If there is no foundschema.schema we are dealing with
          // a path like array.$
          if (p !== parts.length && foundschema.schema) {
            if (parts[p] === '$') {
              if (p === parts.length - 1) {
                return { schema: foundschema, pathType: 'nested' };
              }
              // comments.$.comments.$.title
              return search(parts.slice(p + 1), foundschema.schema);
            }
            // this is the last path of the selector
            return search(parts.slice(p), foundschema.schema);
          }
          return {
            schema: foundschema,
            pathType: foundschema.$isSingleNested ? 'nested' : 'array'
          };
        }
        return { schema: foundschema, pathType: 'real' };
      } else if (p === parts.length && schema.nested[trypath]) {
        return { schema: schema, pathType: 'nested' };
      }
    }
    return { schema: foundschema || schema, pathType: 'undefined' };
  }

  // look for arrays
  return search(path.split('.'), _this);
};


/*!
 * Module exports.
 */

module.exports = exports = Schema;

// require down here because of reference issues

/**
 * The various built-in Mongoose Schema Types.
 *
 * ####Example:
 *
 *     var mongoose = require('mongoose');
 *     var ObjectId = mongoose.Schema.Types.ObjectId;
 *
 * ####Types:
 *
 * - [String](#schema-string-js)
 * - [Number](#schema-number-js)
 * - [Boolean](#schema-boolean-js) | Bool
 * - [Array](#schema-array-js)
 * - [Buffer](#schema-buffer-js)
 * - [Date](#schema-date-js)
 * - [ObjectId](#schema-objectid-js) | Oid
 * - [Mixed](#schema-mixed-js)
 *
 * Using this exposed access to the `Mixed` SchemaType, we can use them in our schema.
 *
 *     var Mixed = mongoose.Schema.Types.Mixed;
 *     new mongoose.Schema({ _user: Mixed })
 *
 * @api public
 */

Schema.Types = MongooseTypes = require('./schema/index');

/*!
 * ignore
 */

exports.ObjectId = MongooseTypes.ObjectId;
