(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * ES6 Promise wrapper constructor.
 *
 * Promises are returned from executed queries. Example:
 *
 *     var query = Candy.find({ bar: true });
 *     var promise = query.exec();
 *
 * DEPRECATED. Mongoose 5.0 will use native promises by default (or bluebird,
 * if native promises are not present) but still
 * support plugging in your own ES6-compatible promises library. Mongoose 5.0
 * will **not** support mpromise.
 *
 * @param {Function} fn a function which will be called when the promise is resolved that accepts `fn(err, ...){}` as signature
 * @api public
 */

function ES6Promise() {
  throw new Error('Can\'t use ES6 promise with mpromise style constructor');
}

ES6Promise.use = function(Promise) {
  ES6Promise.ES6 = Promise;
};

module.exports = ES6Promise;

},{}],2:[function(require,module,exports){
(function (Buffer){
/* eslint-env browser */

var PromiseProvider = require('./promise_provider');

/**
 * The Mongoose [Promise](#promise_Promise) constructor.
 *
 * @method Promise
 * @api public
 */

Object.defineProperty(exports, 'Promise', {
  get: function() {
    return PromiseProvider.get();
  },
  set: function(lib) {
    PromiseProvider.set(lib);
  }
});

/**
 * Storage layer for mongoose promises
 *
 * @method PromiseProvider
 * @api public
 */

exports.PromiseProvider = PromiseProvider;

/**
 * The [MongooseError](#error_MongooseError) constructor.
 *
 * @method Error
 * @api public
 */

exports.Error = require('./error');

/**
 * The Mongoose [Schema](#schema_Schema) constructor
 *
 * ####Example:
 *
 *     var mongoose = require('mongoose');
 *     var Schema = mongoose.Schema;
 *     var CatSchema = new Schema(..);
 *
 * @method Schema
 * @api public
 */

exports.Schema = require('./schema');

/**
 * The various Mongoose Types.
 *
 * ####Example:
 *
 *     var mongoose = require('mongoose');
 *     var array = mongoose.Types.Array;
 *
 * ####Types:
 *
 * - [ObjectId](#types-objectid-js)
 * - [Buffer](#types-buffer-js)
 * - [SubDocument](#types-embedded-js)
 * - [Array](#types-array-js)
 * - [DocumentArray](#types-documentarray-js)
 *
 * Using this exposed access to the `ObjectId` type, we can construct ids on demand.
 *
 *     var ObjectId = mongoose.Types.ObjectId;
 *     var id1 = new ObjectId;
 *
 * @property Types
 * @api public
 */
exports.Types = require('./types');

/**
 * The Mongoose [VirtualType](#virtualtype_VirtualType) constructor
 *
 * @method VirtualType
 * @api public
 */
exports.VirtualType = require('./virtualtype');

/**
 * The various Mongoose SchemaTypes.
 *
 * ####Note:
 *
 * _Alias of mongoose.Schema.Types for backwards compatibility._
 *
 * @property SchemaTypes
 * @see Schema.SchemaTypes #schema_Schema.Types
 * @api public
 */

exports.SchemaType = require('./schematype.js');

/**
 * Internal utils
 *
 * @property utils
 * @api private
 */

exports.utils = require('./utils.js');

/**
 * The Mongoose browser [Document](#document-js) constructor.
 *
 * @method Document
 * @api public
 */
exports.Document = require('./document_provider.js')();

/*!
 * Module exports.
 */

if (typeof window !== 'undefined') {
  window.mongoose = module.exports;
  window.Buffer = Buffer;
}

}).call(this,require("buffer").Buffer)
},{"./document_provider.js":6,"./error":12,"./promise_provider":25,"./schema":26,"./schematype.js":41,"./types":48,"./utils.js":51,"./virtualtype":52,"buffer":84}],3:[function(require,module,exports){
/*!
 * Module dependencies.
 */

var NodeJSDocument = require('./document'),
    EventEmitter = require('events').EventEmitter,
    MongooseError = require('./error'),
    Schema = require('./schema'),
    ObjectId = require('./types/objectid'),
    utils = require('./utils'),
    ValidationError = MongooseError.ValidationError,
    InternalCache = require('./internal');

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

  // var schema = this.schema;

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
 * Module exports.
 */
Document.ValidationError = ValidationError;
module.exports = exports = Document;

},{"./document":5,"./error":12,"./internal":23,"./schema":26,"./types/objectid":49,"./utils":51,"events":87}],4:[function(require,module,exports){
/*!
 * Module dependencies.
 */

var utils = require('./utils');
var Types = require('./schema/index');

var ALLOWED_GEOWITHIN_GEOJSON_TYPES = ['Polygon', 'MultiPolygon'];

/**
 * Handles internal casting for queries
 *
 * @param {Schema} schema
 * @param {Object} obj Object to cast
 * @api private
 */
module.exports = function cast(schema, obj) {
  var paths = Object.keys(obj),
      i = paths.length,
      _keys,
      any$conditionals,
      schematype,
      nested,
      path,
      type,
      val;

  while (i--) {
    path = paths[i];
    val = obj[path];

    if (path === '$or' || path === '$nor' || path === '$and') {
      var k = val.length;

      while (k--) {
        val[k] = cast(schema, val[k]);
      }
    } else if (path === '$where') {
      type = typeof val;

      if (type !== 'string' && type !== 'function') {
        throw new Error('Must have a string or function for $where');
      }

      if (type === 'function') {
        obj[path] = val.toString();
      }

      continue;
    } else if (path === '$elemMatch') {
      val = cast(schema, val);
    } else {
      if (!schema) {
        // no casting for Mixed types
        continue;
      }

      schematype = schema.path(path);

      if (!schematype) {
        // Handle potential embedded array queries
        var split = path.split('.'),
            j = split.length,
            pathFirstHalf,
            pathLastHalf,
            remainingConds;

        // Find the part of the var path that is a path of the Schema
        while (j--) {
          pathFirstHalf = split.slice(0, j).join('.');
          schematype = schema.path(pathFirstHalf);
          if (schematype) {
            break;
          }
        }

        // If a substring of the input path resolves to an actual real path...
        if (schematype) {
          // Apply the casting; similar code for $elemMatch in schema/array.js
          if (schematype.caster && schematype.caster.schema) {
            remainingConds = {};
            pathLastHalf = split.slice(j).join('.');
            remainingConds[pathLastHalf] = val;
            obj[path] = cast(schematype.caster.schema, remainingConds)[pathLastHalf];
          } else {
            obj[path] = val;
          }
          continue;
        }

        if (utils.isObject(val)) {
          // handle geo schemas that use object notation
          // { loc: { long: Number, lat: Number }

          var geo = '';
          if (val.$near) {
            geo = '$near';
          } else if (val.$nearSphere) {
            geo = '$nearSphere';
          } else if (val.$within) {
            geo = '$within';
          } else if (val.$geoIntersects) {
            geo = '$geoIntersects';
          } else if (val.$geoWithin) {
            geo = '$geoWithin';
          }

          if (!geo) {
            continue;
          }

          var numbertype = new Types.Number('__QueryCasting__');
          var value = val[geo];

          if (val.$maxDistance != null) {
            val.$maxDistance = numbertype.castForQuery(val.$maxDistance);
          }
          if (val.$minDistance != null) {
            val.$minDistance = numbertype.castForQuery(val.$minDistance);
          }

          if (geo === '$within') {
            var withinType = value.$center
                || value.$centerSphere
                || value.$box
                || value.$polygon;

            if (!withinType) {
              throw new Error('Bad $within paramater: ' + JSON.stringify(val));
            }

            value = withinType;
          } else if (geo === '$near' &&
              typeof value.type === 'string' && Array.isArray(value.coordinates)) {
            // geojson; cast the coordinates
            value = value.coordinates;
          } else if ((geo === '$near' || geo === '$nearSphere' || geo === '$geoIntersects') &&
              value.$geometry && typeof value.$geometry.type === 'string' &&
              Array.isArray(value.$geometry.coordinates)) {
            if (value.$maxDistance != null) {
              value.$maxDistance = numbertype.castForQuery(value.$maxDistance);
            }
            if (value.$minDistance != null) {
              value.$minDistance = numbertype.castForQuery(value.$minDistance);
            }
            if (utils.isMongooseObject(value.$geometry)) {
              value.$geometry = value.$geometry.toObject({ transform: false });
            }
            value = value.$geometry.coordinates;
          } else if (geo === '$geoWithin') {
            if (value.$geometry) {
              if (utils.isMongooseObject(value.$geometry)) {
                value.$geometry = value.$geometry.toObject({ virtuals: false });
              }
              var geoWithinType = value.$geometry.type;
              if (ALLOWED_GEOWITHIN_GEOJSON_TYPES.indexOf(geoWithinType) === -1) {
                throw new Error('Invalid geoJSON type for $geoWithin "' +
                  geoWithinType + '", must be "Polygon" or "MultiPolygon"');
              }
              value = value.$geometry.coordinates;
            } else {
              value = value.$box || value.$polygon || value.$center ||
                value.$centerSphere;
              if (utils.isMongooseObject(value)) {
                value = value.toObject({ virtuals: false });
              }
            }
          }

          _cast(value, numbertype);
        }
      } else if (val === null || val === undefined) {
        obj[path] = null;
        continue;
      } else if (val.constructor.name === 'Object') {
        any$conditionals = Object.keys(val).some(function(k) {
          return k.charAt(0) === '$' && k !== '$id' && k !== '$ref';
        });

        if (!any$conditionals) {
          obj[path] = schematype.castForQuery(val);
        } else {
          var ks = Object.keys(val),
              $cond;

          k = ks.length;

          while (k--) {
            $cond = ks[k];
            nested = val[$cond];

            if ($cond === '$exists') {
              if (typeof nested !== 'boolean') {
                throw new Error('$exists parameter must be Boolean');
              }
              continue;
            }

            if ($cond === '$type') {
              if (typeof nested !== 'number' && typeof nested !== 'string') {
                throw new Error('$type parameter must be number or string');
              }
              continue;
            }

            if ($cond === '$not') {
              if (nested && schematype && !schematype.caster) {
                _keys = Object.keys(nested);
                if (_keys.length && _keys[0].charAt(0) === '$') {
                  for (var key in nested) {
                    nested[key] = schematype.castForQuery(key, nested[key]);
                  }
                } else {
                  val[$cond] = schematype.castForQuery('$eq', nested);
                }
                continue;
              }
              cast(schematype.caster ? schematype.caster.schema : schema, nested);
            } else {
              val[$cond] = schematype.castForQuery($cond, nested);
            }
          }
        }
      } else {
        obj[path] = schematype.castForQuery(val);
      }
    }
  }

  return obj;
};

function _cast(val, numbertype) {
  if (Array.isArray(val)) {
    val.forEach(function(item, i) {
      if (Array.isArray(item) || utils.isObject(item)) {
        return _cast(item, numbertype);
      }
      val[i] = numbertype.castForQuery(item);
    });
  } else {
    var nearKeys = Object.keys(val);
    var nearLen = nearKeys.length;
    while (nearLen--) {
      var nkey = nearKeys[nearLen];
      var item = val[nkey];
      if (Array.isArray(item) || utils.isObject(item)) {
        _cast(item, numbertype);
        val[nkey] = item;
      } else {
        val[nkey] = numbertype.castForQuery(item);
      }
    }
  }
}

},{"./schema/index":33,"./utils":51}],5:[function(require,module,exports){
(function (process,Buffer){
/*!
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter;
var MongooseError = require('./error');
var MixedSchema = require('./schema/mixed');
var Schema = require('./schema');
var ObjectExpectedError = require('./error/objectExpected');
var StrictModeError = require('./error/strict');
var ValidatorError = require('./schematype').ValidatorError;
var VersionError = require('./error').VersionError;
var utils = require('./utils');
var clone = utils.clone;
var isMongooseObject = utils.isMongooseObject;
var inspect = require('util').inspect;
var ValidationError = MongooseError.ValidationError;
var InternalCache = require('./internal');
var deepEqual = utils.deepEqual;
var hooks = require('hooks-fixed');
var PromiseProvider = require('./promise_provider');
var DocumentArray;
var MongooseArray;
var Embedded;
var flatten = require('./services/common').flatten;

/**
 * Document constructor.
 *
 * @param {Object} obj the values to set
 * @param {Object} [fields] optional object containing the fields which were selected in the query returning this document and any populated paths data
 * @param {Boolean} [skipId] bool, should we auto create an ObjectId _id
 * @inherits NodeJS EventEmitter http://nodejs.org/api/events.html#events_class_events_eventemitter
 * @event `init`: Emitted on a document after it has was retreived from the db and fully hydrated by Mongoose.
 * @event `save`: Emitted when the document is successfully saved
 * @api private
 */

function Document(obj, fields, skipId) {
  this.$__ = new InternalCache;
  this.$__.emitter = new EventEmitter();
  this.isNew = true;
  this.errors = undefined;

  var schema = this.schema;

  if (typeof fields === 'boolean') {
    this.$__.strictMode = fields;
    fields = undefined;
  } else {
    this.$__.strictMode = schema.options && schema.options.strict;
    this.$__.selected = fields;
  }

  var required = schema.requiredPaths(true);
  for (var i = 0; i < required.length; ++i) {
    this.$__.activePaths.require(required[i]);
  }

  this.$__.emitter.setMaxListeners(0);
  this._doc = this.$__buildDoc(obj, fields, skipId);

  if (obj) {
    if (obj instanceof Document) {
      this.isNew = obj.isNew;
    }
    this.set(obj, undefined, true);
  }

  if (!schema.options.strict && obj) {
    var _this = this,
        keys = Object.keys(this._doc);

    keys.forEach(function(key) {
      if (!(key in schema.tree)) {
        defineKey(key, null, _this);
      }
    });
  }

  this.$__registerHooksFromSchema();
}

/*!
 * Document exposes the NodeJS event emitter API, so you can use
 * `on`, `once`, etc.
 */
utils.each(
    ['on', 'once', 'emit', 'listeners', 'removeListener', 'setMaxListeners',
      'removeAllListeners', 'addListener'],
    function(emitterFn) {
      Document.prototype[emitterFn] = function() {
        return this.$__.emitter[emitterFn].apply(this.$__.emitter, arguments);
      };
    });

Document.prototype.constructor = Document;

/**
 * The documents schema.
 *
 * @api public
 * @property schema
 */

Document.prototype.schema;

/**
 * Boolean flag specifying if the document is new.
 *
 * @api public
 * @property isNew
 */

Document.prototype.isNew;

/**
 * The string version of this documents _id.
 *
 * ####Note:
 *
 * This getter exists on all documents by default. The getter can be disabled by setting the `id` [option](/docs/guide.html#id) of its `Schema` to false at construction time.
 *
 *     new Schema({ name: String }, { id: false });
 *
 * @api public
 * @see Schema options /docs/guide.html#options
 * @property id
 */

Document.prototype.id;

/**
 * Hash containing current validation errors.
 *
 * @api public
 * @property errors
 */

Document.prototype.errors;

/**
 * Builds the default doc structure
 *
 * @param {Object} obj
 * @param {Object} [fields]
 * @param {Boolean} [skipId]
 * @return {Object}
 * @api private
 * @method $__buildDoc
 * @memberOf Document
 */

Document.prototype.$__buildDoc = function(obj, fields, skipId) {
  var doc = {};
  var exclude = null;
  var keys;
  var ki;
  var _this = this;

  // determine if this doc is a result of a query with
  // excluded fields

  if (fields && utils.getFunctionName(fields.constructor) === 'Object') {
    keys = Object.keys(fields);
    ki = keys.length;

    if (ki === 1 && keys[0] === '_id') {
      exclude = !!fields[keys[ki]];
    } else {
      while (ki--) {
        if (keys[ki] !== '_id' &&
            (!fields[keys[ki]] || typeof fields[keys[ki]] !== 'object')) {
          exclude = !fields[keys[ki]];
          break;
        }
      }
    }
  }

  var paths = Object.keys(this.schema.paths),
      plen = paths.length,
      ii = 0;

  for (; ii < plen; ++ii) {
    var p = paths[ii];

    if (p === '_id') {
      if (skipId) {
        continue;
      }
      if (obj && '_id' in obj) {
        continue;
      }
    }

    var type = this.schema.paths[p];
    var path = p.split('.');
    var len = path.length;
    var last = len - 1;
    var curPath = '';
    var doc_ = doc;
    var i = 0;
    var included = false;

    for (; i < len; ++i) {
      var piece = path[i],
          def;

      curPath += piece;

      // support excluding intermediary levels
      if (exclude === true) {
        if (curPath in fields) {
          break;
        }
      } else if (fields && curPath in fields) {
        included = true;
      }

      if (i === last) {
        if (fields && exclude !== null) {
          if (exclude === true) {
            // apply defaults to all non-excluded fields
            if (p in fields) {
              continue;
            }

            def = type.getDefault(_this, false);
            if (typeof def !== 'undefined') {
              doc_[piece] = def;
              _this.$__.activePaths.default(p);
            }
          } else if (included) {
            // selected field
            def = type.getDefault(_this, false);
            if (typeof def !== 'undefined') {
              doc_[piece] = def;
              _this.$__.activePaths.default(p);
            }
          }
        } else {
          def = type.getDefault(_this, false);
          if (typeof def !== 'undefined') {
            doc_[piece] = def;
            _this.$__.activePaths.default(p);
          }
        }
      } else {
        doc_ = doc_[piece] || (doc_[piece] = {});
        curPath += '.';
      }
    }
  }

  return doc;
};

/**
 * Initializes the document without setters or marking anything modified.
 *
 * Called internally after a document is returned from mongodb.
 *
 * @param {Object} doc document returned by mongo
 * @param {Function} fn callback
 * @api public
 */

Document.prototype.init = function(doc, opts, fn) {
  // do not prefix this method with $__ since its
  // used by public hooks

  if (typeof opts === 'function') {
    fn = opts;
    opts = null;
  }

  this.isNew = false;

  // handle docs with populated paths
  // If doc._id is not null or undefined
  if (doc._id !== null && doc._id !== undefined &&
    opts && opts.populated && opts.populated.length) {
    var id = String(doc._id);
    for (var i = 0; i < opts.populated.length; ++i) {
      var item = opts.populated[i];
      this.populated(item.path, item._docs[id], item);
    }
  }

  init(this, doc, this._doc);
  this.$__storeShard();

  this.emit('init', this);
  if (fn) {
    fn(null);
  }
  return this;
};

/*!
 * Init helper.
 *
 * @param {Object} self document instance
 * @param {Object} obj raw mongodb doc
 * @param {Object} doc object we are initializing
 * @api private
 */

function init(self, obj, doc, prefix) {
  prefix = prefix || '';

  var keys = Object.keys(obj),
      len = keys.length,
      schema,
      path,
      i;

  while (len--) {
    i = keys[len];
    path = prefix + i;
    schema = self.schema.path(path);

    if (!schema && utils.isObject(obj[i]) &&
        (!obj[i].constructor || utils.getFunctionName(obj[i].constructor) === 'Object')) {
      // assume nested object
      if (!doc[i]) {
        doc[i] = {};
      }
      init(self, obj[i], doc[i], path + '.');
    } else {
      if (obj[i] === null) {
        doc[i] = null;
      } else if (obj[i] !== undefined) {
        if (schema) {
          try {
            doc[i] = schema.cast(obj[i], self, true);
          } catch (e) {
            self.invalidate(e.path, new ValidatorError({
              path: e.path,
              message: e.message,
              type: 'cast',
              value: e.value
            }));
          }
        } else {
          doc[i] = obj[i];
        }
      }
      // mark as hydrated
      if (!self.isModified(path)) {
        self.$__.activePaths.init(path);
      }
    }
  }
}

/**
 * Stores the current values of the shard keys.
 *
 * ####Note:
 *
 * _Shard key values do not / are not allowed to change._
 *
 * @api private
 * @method $__storeShard
 * @memberOf Document
 */

Document.prototype.$__storeShard = function() {
  // backwards compat
  var key = this.schema.options.shardKey || this.schema.options.shardkey;
  if (!(key && utils.getFunctionName(key.constructor) === 'Object')) {
    return;
  }

  var orig = this.$__.shardval = {},
      paths = Object.keys(key),
      len = paths.length,
      val;

  for (var i = 0; i < len; ++i) {
    val = this.getValue(paths[i]);
    if (isMongooseObject(val)) {
      orig[paths[i]] = val.toObject({depopulate: true});
    } else if (val !== null && val !== undefined && val.valueOf &&
          // Explicitly don't take value of dates
        (!val.constructor || utils.getFunctionName(val.constructor) !== 'Date')) {
      orig[paths[i]] = val.valueOf();
    } else {
      orig[paths[i]] = val;
    }
  }
};

/*!
 * Set up middleware support
 */

for (var k in hooks) {
  if (k === 'pre' || k === 'post') {
    Document.prototype['$' + k] = Document['$' + k] = hooks[k];
  } else {
    Document.prototype[k] = Document[k] = hooks[k];
  }
}

/**
 * Sends an update command with this document `_id` as the query selector.
 *
 * ####Example:
 *
 *     weirdCar.update({$inc: {wheels:1}}, { w: 1 }, callback);
 *
 * ####Valid options:
 *
 *  - same as in [Model.update](#model_Model.update)
 *
 * @see Model.update #model_Model.update
 * @param {Object} doc
 * @param {Object} options
 * @param {Function} callback
 * @return {Query}
 * @api public
 */

Document.prototype.update = function update() {
  var args = utils.args(arguments);
  args.unshift({_id: this._id});
  return this.constructor.update.apply(this.constructor, args);
};

/**
 * Sets the value of a path, or many paths.
 *
 * ####Example:
 *
 *     // path, value
 *     doc.set(path, value)
 *
 *     // object
 *     doc.set({
 *         path  : value
 *       , path2 : {
 *            path  : value
 *         }
 *     })
 *
 *     // on-the-fly cast to number
 *     doc.set(path, value, Number)
 *
 *     // on-the-fly cast to string
 *     doc.set(path, value, String)
 *
 *     // changing strict mode behavior
 *     doc.set(path, value, { strict: false });
 *
 * @param {String|Object} path path or object of key/vals to set
 * @param {Any} val the value to set
 * @param {Schema|String|Number|Buffer|*} [type] optionally specify a type for "on-the-fly" attributes
 * @param {Object} [options] optionally specify options that modify the behavior of the set
 * @api public
 */

Document.prototype.set = function(path, val, type, options) {
  if (type && utils.getFunctionName(type.constructor) === 'Object') {
    options = type;
    type = undefined;
  }

  var merge = options && options.merge,
      adhoc = type && type !== true,
      constructing = type === true,
      adhocs;

  var strict = options && 'strict' in options
      ? options.strict
      : this.$__.strictMode;

  if (adhoc) {
    adhocs = this.$__.adhocPaths || (this.$__.adhocPaths = {});
    adhocs[path] = Schema.interpretAsType(path, type, this.schema.options);
  }

  if (typeof path !== 'string') {
    // new Document({ key: val })

    if (path === null || path === void 0) {
      var _ = path;
      path = val;
      val = _;
    } else {
      var prefix = val
          ? val + '.'
          : '';

      if (path instanceof Document) {
        if (path.$__isNested) {
          path = path.toObject();
        } else {
          path = path._doc;
        }
      }

      var keys = Object.keys(path);
      var i = keys.length;
      var pathtype;
      var key;

      if (i === 0 && !this.schema.options.minimize) {
        if (val) {
          this.set(val, {});
        }
        return this;
      }

      while (i--) {
        key = keys[i];
        var pathName = prefix + key;
        pathtype = this.schema.pathType(pathName);

        if (path[key] !== null
            && path[key] !== void 0
              // need to know if plain object - no Buffer, ObjectId, ref, etc
            && utils.isObject(path[key])
            && (!path[key].constructor || utils.getFunctionName(path[key].constructor) === 'Object')
            && pathtype !== 'virtual'
            && pathtype !== 'real'
            && !(this.$__path(pathName) instanceof MixedSchema)
            && !(this.schema.paths[pathName] &&
            this.schema.paths[pathName].options &&
            this.schema.paths[pathName].options.ref)) {
          this.set(path[key], prefix + key, constructing);
        } else if (strict) {
          // Don't overwrite defaults with undefined keys (gh-3981)
          if (constructing && path[key] === void 0 &&
              this.get(key) !== void 0) {
            continue;
          }

          if (pathtype === 'real' || pathtype === 'virtual') {
            // Check for setting single embedded schema to document (gh-3535)
            if (this.schema.paths[pathName] &&
                this.schema.paths[pathName].$isSingleNested &&
                path[key] instanceof Document) {
              path[key] = path[key].toObject({virtuals: false});
            }
            this.set(prefix + key, path[key], constructing);
          } else if (pathtype === 'nested' && path[key] instanceof Document) {
            this.set(prefix + key,
                path[key].toObject({transform: false}), constructing);
          } else if (strict === 'throw') {
            if (pathtype === 'nested') {
              throw new ObjectExpectedError(key, path[key]);
            } else {
              throw new StrictModeError(key);
            }
          }
        } else if (path[key] !== void 0) {
          this.set(prefix + key, path[key], constructing);
        }
      }

      return this;
    }
  }

  // ensure _strict is honored for obj props
  // docschema = new Schema({ path: { nest: 'string' }})
  // doc.set('path', obj);
  var pathType = this.schema.pathType(path);
  if (pathType === 'nested' && val) {
    if (utils.isObject(val) &&
        (!val.constructor || utils.getFunctionName(val.constructor) === 'Object')) {
      if (!merge) {
        this.setValue(path, null);
        cleanModifiedSubpaths(this, path);
      }

      if (Object.keys(val).length === 0) {
        this.setValue(path, {});
        this.markModified(path);
        cleanModifiedSubpaths(this, path);
      } else {
        this.set(val, path, constructing);
      }
      return this;
    }
    this.invalidate(path, new MongooseError.CastError('Object', val, path));
    return this;
  }

  var schema;
  var parts = path.split('.');

  if (pathType === 'adhocOrUndefined' && strict) {
    // check for roots that are Mixed types
    var mixed;

    for (i = 0; i < parts.length; ++i) {
      var subpath = parts.slice(0, i + 1).join('.');
      schema = this.schema.path(subpath);
      if (schema instanceof MixedSchema) {
        // allow changes to sub paths of mixed types
        mixed = true;
        break;
      }
    }

    if (!mixed) {
      if (strict === 'throw') {
        throw new StrictModeError(path);
      }
      return this;
    }
  } else if (pathType === 'virtual') {
    schema = this.schema.virtualpath(path);
    schema.applySetters(val, this);
    return this;
  } else {
    schema = this.$__path(path);
  }

  var pathToMark;

  // When using the $set operator the path to the field must already exist.
  // Else mongodb throws: "LEFT_SUBFIELD only supports Object"

  if (parts.length <= 1) {
    pathToMark = path;
  } else {
    for (i = 0; i < parts.length; ++i) {
      subpath = parts.slice(0, i + 1).join('.');
      if (this.isDirectModified(subpath) // earlier prefixes that are already
            // marked as dirty have precedence
          || this.get(subpath) === null) {
        pathToMark = subpath;
        break;
      }
    }

    if (!pathToMark) {
      pathToMark = path;
    }
  }

  // if this doc is being constructed we should not trigger getters
  var priorVal = constructing
      ? undefined
      : this.getValue(path);

  if (!schema) {
    this.$__set(pathToMark, path, constructing, parts, schema, val, priorVal);
    return this;
  }

  var shouldSet = true;
  try {
    // If the user is trying to set a ref path to a document with
    // the correct model name, treat it as populated
    var didPopulate = false;
    if (schema.options &&
        schema.options.ref &&
        val instanceof Document &&
        schema.options.ref === val.constructor.modelName) {
      if (this.ownerDocument) {
        this.ownerDocument().populated(this.$__fullPath(path),
          val._id, {model: val.constructor});
      } else {
        this.populated(path, val._id, {model: val.constructor});
      }
      didPopulate = true;
    }

    var popOpts;
    if (schema.options &&
        Array.isArray(schema.options.type) &&
        schema.options.type.length &&
        schema.options.type[0].ref &&
        Array.isArray(val) &&
        val.length > 0 &&
        val[0] instanceof Document &&
        val[0].constructor.modelName &&
        schema.options.type[0].ref === val[0].constructor.modelName) {
      if (this.ownerDocument) {
        popOpts = { model: val[0].constructor };
        this.ownerDocument().populated(this.$__fullPath(path),
          val.map(function(v) { return v._id; }), popOpts);
      } else {
        popOpts = { model: val[0].constructor };
        this.populated(path, val.map(function(v) { return v._id; }), popOpts);
      }
      didPopulate = true;
    }
    val = schema.applySetters(val, this, false, priorVal);

    if (!didPopulate && this.$__.populated) {
      delete this.$__.populated[path];
    }

    this.$markValid(path);
  } catch (e) {
    this.invalidate(path,
      new MongooseError.CastError(schema.instance, val, path, e));
    shouldSet = false;
  }

  if (schema.$isSingleNested) {
    cleanModifiedSubpaths(this, path);
  }

  if (shouldSet) {
    this.$__set(pathToMark, path, constructing, parts, schema, val, priorVal);
  }

  return this;
};

/*!
 * ignore
 */

function cleanModifiedSubpaths(doc, path) {
  var _modifiedPaths = Object.keys(doc.$__.activePaths.states.modify);
  var _numModifiedPaths = _modifiedPaths.length;
  for (var j = 0; j < _numModifiedPaths; ++j) {
    if (_modifiedPaths[j].indexOf(path + '.') === 0) {
      delete doc.$__.activePaths.states.modify[_modifiedPaths[j]];
    }
  }
}

/**
 * Determine if we should mark this change as modified.
 *
 * @return {Boolean}
 * @api private
 * @method $__shouldModify
 * @memberOf Document
 */

Document.prototype.$__shouldModify = function(pathToMark, path, constructing, parts, schema, val, priorVal) {
  if (this.isNew) {
    return true;
  }

  if (undefined === val && !this.isSelected(path)) {
    // when a path is not selected in a query, its initial
    // value will be undefined.
    return true;
  }

  if (undefined === val && path in this.$__.activePaths.states.default) {
    // we're just unsetting the default value which was never saved
    return false;
  }

  // gh-3992: if setting a populated field to a doc, don't mark modified
  // if they have the same _id
  if (this.populated(path) &&
      val instanceof Document &&
      deepEqual(val._id, priorVal)) {
    return false;
  }

  if (!deepEqual(val, priorVal || this.get(path))) {
    return true;
  }

  if (!constructing &&
      val !== null &&
      val !== undefined &&
      path in this.$__.activePaths.states.default &&
      deepEqual(val, schema.getDefault(this, constructing))) {
    // a path with a default was $unset on the server
    // and the user is setting it to the same value again
    return true;
  }
  return false;
};

/**
 * Handles the actual setting of the value and marking the path modified if appropriate.
 *
 * @api private
 * @method $__set
 * @memberOf Document
 */

Document.prototype.$__set = function(pathToMark, path, constructing, parts, schema, val, priorVal) {
  Embedded = Embedded || require('./types/embedded');

  var shouldModify = this.$__shouldModify(pathToMark, path, constructing, parts,
    schema, val, priorVal);
  var _this = this;

  if (shouldModify) {
    this.markModified(pathToMark, val);

    // handle directly setting arrays (gh-1126)
    MongooseArray || (MongooseArray = require('./types/array'));
    if (val && val.isMongooseArray) {
      val._registerAtomic('$set', val);

      // Small hack for gh-1638: if we're overwriting the entire array, ignore
      // paths that were modified before the array overwrite
      this.$__.activePaths.forEach(function(modifiedPath) {
        if (modifiedPath.indexOf(path + '.') === 0) {
          _this.$__.activePaths.ignore(modifiedPath);
        }
      });
    }
  }

  var obj = this._doc;
  var i = 0;
  var l = parts.length;
  var cur = '';

  for (; i < l; i++) {
    var next = i + 1;
    var last = next === l;
    cur += (cur ? '.' + parts[i] : parts[i]);

    if (last) {
      obj[parts[i]] = val;
    } else {
      if (obj[parts[i]] && utils.getFunctionName(obj[parts[i]].constructor) === 'Object') {
        obj = obj[parts[i]];
      } else if (obj[parts[i]] && obj[parts[i]] instanceof Embedded) {
        obj = obj[parts[i]];
      } else if (obj[parts[i]] && obj[parts[i]].$isSingleNested) {
        obj = obj[parts[i]];
      } else if (obj[parts[i]] && Array.isArray(obj[parts[i]])) {
        obj = obj[parts[i]];
      } else {
        this.set(cur, {});
        obj = obj[parts[i]];
      }
    }
  }
};

/**
 * Gets a raw value from a path (no getters)
 *
 * @param {String} path
 * @api private
 */

Document.prototype.getValue = function(path) {
  return utils.getValue(path, this._doc);
};

/**
 * Sets a raw value for a path (no casting, setters, transformations)
 *
 * @param {String} path
 * @param {Object} value
 * @api private
 */

Document.prototype.setValue = function(path, val) {
  utils.setValue(path, val, this._doc);
  return this;
};

/**
 * Returns the value of a path.
 *
 * ####Example
 *
 *     // path
 *     doc.get('age') // 47
 *
 *     // dynamic casting to a string
 *     doc.get('age', String) // "47"
 *
 * @param {String} path
 * @param {Schema|String|Number|Buffer|*} [type] optionally specify a type for on-the-fly attributes
 * @api public
 */

Document.prototype.get = function(path, type) {
  var adhoc;
  if (type) {
    adhoc = Schema.interpretAsType(path, type, this.schema.options);
  }

  var schema = this.$__path(path) || this.schema.virtualpath(path),
      pieces = path.split('.'),
      obj = this._doc;

  for (var i = 0, l = pieces.length; i < l; i++) {
    obj = obj === null || obj === void 0
        ? undefined
        : obj[pieces[i]];
  }

  if (adhoc) {
    obj = adhoc.cast(obj);
  }

  // Check if this path is populated - don't apply getters if it is,
  // because otherwise its a nested object. See gh-3357
  if (schema && !this.populated(path)) {
    obj = schema.applyGetters(obj, this);
  }

  return obj;
};

/**
 * Returns the schematype for the given `path`.
 *
 * @param {String} path
 * @api private
 * @method $__path
 * @memberOf Document
 */

Document.prototype.$__path = function(path) {
  var adhocs = this.$__.adhocPaths,
      adhocType = adhocs && adhocs[path];

  if (adhocType) {
    return adhocType;
  }
  return this.schema.path(path);
};

/**
 * Marks the path as having pending changes to write to the db.
 *
 * _Very helpful when using [Mixed](./schematypes.html#mixed) types._
 *
 * ####Example:
 *
 *     doc.mixed.type = 'changed';
 *     doc.markModified('mixed.type');
 *     doc.save() // changes to mixed.type are now persisted
 *
 * @param {String} path the path to mark modified
 * @api public
 */

Document.prototype.markModified = function(path) {
  this.$__.activePaths.modify(path);
};

/**
 * Clears the modified state on the specified path.
 *
 * ####Example:
 *
 *     doc.foo = 'bar';
 *     doc.unmarkModified('foo');
 *     doc.save() // changes to foo will not be persisted
 *
 * @param {String} path the path to unmark modified
 * @api public
 */

Document.prototype.unmarkModified = function(path) {
  this.$__.activePaths.init(path);
};

/**
 * Don't run validation on this path or persist changes to this path.
 *
 * ####Example:
 *
 *     doc.foo = null;
 *     doc.$ignore('foo');
 *     doc.save() // changes to foo will not be persisted and validators won't be run
 *
 * @param {String} path the path to ignore
 * @api public
 */

Document.prototype.$ignore = function(path) {
  this.$__.activePaths.ignore(path);
};

/**
 * Returns the list of paths that have been modified.
 *
 * @return {Array}
 * @api public
 */

Document.prototype.modifiedPaths = function() {
  var directModifiedPaths = Object.keys(this.$__.activePaths.states.modify);
  return directModifiedPaths.reduce(function(list, path) {
    var parts = path.split('.');
    return list.concat(parts.reduce(function(chains, part, i) {
      return chains.concat(parts.slice(0, i).concat(part).join('.'));
    }, []).filter(function(chain) {
      return (list.indexOf(chain) === -1);
    }));
  }, []);
};

/**
 * Returns true if this document was modified, else false.
 *
 * If `path` is given, checks if a path or any full path containing `path` as part of its path chain has been modified.
 *
 * ####Example
 *
 *     doc.set('documents.0.title', 'changed');
 *     doc.isModified()                      // true
 *     doc.isModified('documents')           // true
 *     doc.isModified('documents.0.title')   // true
 *     doc.isModified('documents otherProp') // true
 *     doc.isDirectModified('documents')     // false
 *
 * @param {String} [path] optional
 * @return {Boolean}
 * @api public
 */

Document.prototype.isModified = function(paths) {
  if (paths) {
    if (!Array.isArray(paths)) {
      paths = paths.split(' ');
    }
    var modified = this.modifiedPaths();
    var directModifiedPaths = Object.keys(this.$__.activePaths.states.modify);
    var isModifiedChild = paths.some(function(path) {
      return !!~modified.indexOf(path);
    });
    return isModifiedChild || paths.some(function(path) {
      return directModifiedPaths.some(function(mod) {
        return mod === path || path.indexOf(mod + '.') === 0;
      });
    });
  }
  return this.$__.activePaths.some('modify');
};

/**
 * Checks if a path is set to its default.
 *
 * ####Example
 *
 *     MyModel = mongoose.model('test', { name: { type: String, default: 'Val '} });
 *     var m = new MyModel();
 *     m.$isDefault('name');               // true
 *
 * @param {String} [path]
 * @return {Boolean}
 * @method $isDefault
 * @api public
 */

Document.prototype.$isDefault = function(path) {
  return (path in this.$__.activePaths.states.default);
};

/**
 * Returns true if `path` was directly set and modified, else false.
 *
 * ####Example
 *
 *     doc.set('documents.0.title', 'changed');
 *     doc.isDirectModified('documents.0.title') // true
 *     doc.isDirectModified('documents') // false
 *
 * @param {String} path
 * @return {Boolean}
 * @api public
 */

Document.prototype.isDirectModified = function(path) {
  return (path in this.$__.activePaths.states.modify);
};

/**
 * Checks if `path` was initialized.
 *
 * @param {String} path
 * @return {Boolean}
 * @api public
 */

Document.prototype.isInit = function(path) {
  return (path in this.$__.activePaths.states.init);
};

/**
 * Checks if `path` was selected in the source query which initialized this document.
 *
 * ####Example
 *
 *     Thing.findOne().select('name').exec(function (err, doc) {
 *        doc.isSelected('name') // true
 *        doc.isSelected('age')  // false
 *     })
 *
 * @param {String} path
 * @return {Boolean}
 * @api public
 */

Document.prototype.isSelected = function isSelected(path) {
  if (this.$__.selected) {
    if (path === '_id') {
      return this.$__.selected._id !== 0;
    }

    var paths = Object.keys(this.$__.selected),
        i = paths.length,
        inclusive = false,
        cur;

    if (i === 1 && paths[0] === '_id') {
      // only _id was selected.
      return this.$__.selected._id === 0;
    }

    while (i--) {
      cur = paths[i];
      if (cur === '_id') {
        continue;
      }
      inclusive = !!this.$__.selected[cur];
      break;
    }

    if (path in this.$__.selected) {
      return inclusive;
    }

    i = paths.length;
    var pathDot = path + '.';

    while (i--) {
      cur = paths[i];
      if (cur === '_id') {
        continue;
      }

      if (cur.indexOf(pathDot) === 0) {
        return inclusive;
      }

      if (pathDot.indexOf(cur + '.') === 0) {
        return inclusive;
      }
    }

    return !inclusive;
  }

  return true;
};

/**
 * Executes registered validation rules for this document.
 *
 * ####Note:
 *
 * This method is called `pre` save and if a validation rule is violated, [save](#model_Model-save) is aborted and the error is returned to your `callback`.
 *
 * ####Example:
 *
 *     doc.validate(function (err) {
 *       if (err) handleError(err);
 *       else // validation passed
 *     });
 *
 * @param {Object} optional options internal options
 * @param {Function} callback optional callback called after validation completes, passing an error if one occurred
 * @return {Promise} Promise
 * @api public
 */

Document.prototype.validate = function(options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = null;
  }

  this.$__validate(callback);
};

/*!
 * ignore
 */

function _getPathsToValidate(doc) {
  // only validate required fields when necessary
  var paths = Object.keys(doc.$__.activePaths.states.require).filter(function(path) {
    if (!doc.isSelected(path) && !doc.isModified(path)) {
      return false;
    }
    var p = doc.schema.path(path);
    if (typeof p.originalRequiredValue === 'function') {
      return p.originalRequiredValue.call(doc);
    }
    return true;
  });

  paths = paths.concat(Object.keys(doc.$__.activePaths.states.init));
  paths = paths.concat(Object.keys(doc.$__.activePaths.states.modify));
  paths = paths.concat(Object.keys(doc.$__.activePaths.states.default));

  // gh-661: if a whole array is modified, make sure to run validation on all
  // the children as well
  for (var i = 0; i < paths.length; ++i) {
    var path = paths[i];
    var val = doc.getValue(path);
    if (val && val.isMongooseArray && !Buffer.isBuffer(val) && !val.isMongooseDocumentArray) {
      var numElements = val.length;
      for (var j = 0; j < numElements; ++j) {
        paths.push(path + '.' + j);
      }
    }
  }

  var flattenOptions = { skipArrays: true };
  for (i = 0; i < paths.length; ++i) {
    var pathToCheck = paths[i];
    if (doc.schema.nested[pathToCheck]) {
      var _v = doc.getValue(pathToCheck);
      if (isMongooseObject(_v)) {
        _v = _v.toObject({ transform: false });
      }
      var flat = flatten(_v, '', flattenOptions);
      var _subpaths = Object.keys(flat).map(function(p) {
        return pathToCheck + '.' + p;
      });
      paths = paths.concat(_subpaths);
    }
  }

  return paths;
}

/*!
 * ignore
 */

Document.prototype.$__validate = function(callback) {
  var _this = this;
  var _complete = function() {
    var err = _this.$__.validationError;
    _this.$__.validationError = undefined;
    _this.emit('validate', _this);
    if (err) {
      for (var key in err.errors) {
        // Make sure cast errors persist
        if (!_this.__parent && err.errors[key] instanceof MongooseError.CastError) {
          _this.invalidate(key, err.errors[key]);
        }
      }

      return err;
    }
  };

  // only validate required fields when necessary
  var paths = _getPathsToValidate(this);

  if (paths.length === 0) {
    process.nextTick(function() {
      var err = _complete();
      if (err) {
        callback(err);
        return;
      }
      callback();
    });
  }

  var validating = {},
      total = 0;

  var complete = function() {
    var err = _complete();
    if (err) {
      callback(err);
      return;
    }
    callback();
  };

  var validatePath = function(path) {
    if (validating[path]) {
      return;
    }

    validating[path] = true;
    total++;

    process.nextTick(function() {
      var p = _this.schema.path(path);
      if (!p) {
        return --total || complete();
      }

      // If user marked as invalid or there was a cast error, don't validate
      if (!_this.$isValid(path)) {
        --total || complete();
        return;
      }

      var val = _this.getValue(path);
      p.doValidate(val, function(err) {
        if (err) {
          _this.invalidate(path, err, undefined, true);
        }
        --total || complete();
      }, _this);
    });
  };

  paths.forEach(validatePath);
};

/**
 * Executes registered validation rules (skipping asynchronous validators) for this document.
 *
 * ####Note:
 *
 * This method is useful if you need synchronous validation.
 *
 * ####Example:
 *
 *     var err = doc.validateSync();
 *     if ( err ){
 *       handleError( err );
 *     } else {
 *       // validation passed
 *     }
 *
 * @param {Array|string} pathsToValidate only validate the given paths
 * @return {MongooseError|undefined} MongooseError if there are errors during validation, or undefined if there is no error.
 * @api public
 */

Document.prototype.validateSync = function(pathsToValidate) {
  var _this = this;

  if (typeof pathsToValidate === 'string') {
    pathsToValidate = pathsToValidate.split(' ');
  }

  // only validate required fields when necessary
  var paths = _getPathsToValidate(this);

  if (pathsToValidate && pathsToValidate.length) {
    var tmp = [];
    for (var i = 0; i < paths.length; ++i) {
      if (pathsToValidate.indexOf(paths[i]) !== -1) {
        tmp.push(paths[i]);
      }
    }
    paths = tmp;
  }

  var validating = {};

  paths.forEach(function(path) {
    if (validating[path]) {
      return;
    }

    validating[path] = true;

    var p = _this.schema.path(path);
    if (!p) {
      return;
    }
    if (!_this.$isValid(path)) {
      return;
    }

    var val = _this.getValue(path);
    var err = p.doValidateSync(val, _this);
    if (err) {
      _this.invalidate(path, err, undefined, true);
    }
  });

  var err = _this.$__.validationError;
  _this.$__.validationError = undefined;
  _this.emit('validate', _this);

  if (err) {
    for (var key in err.errors) {
      // Make sure cast errors persist
      if (err.errors[key] instanceof MongooseError.CastError) {
        _this.invalidate(key, err.errors[key]);
      }
    }
  }

  return err;
};

/**
 * Marks a path as invalid, causing validation to fail.
 *
 * The `errorMsg` argument will become the message of the `ValidationError`.
 *
 * The `value` argument (if passed) will be available through the `ValidationError.value` property.
 *
 *     doc.invalidate('size', 'must be less than 20', 14);

 *     doc.validate(function (err) {
 *       console.log(err)
 *       // prints
 *       { message: 'Validation failed',
 *         name: 'ValidationError',
 *         errors:
 *          { size:
 *             { message: 'must be less than 20',
 *               name: 'ValidatorError',
 *               path: 'size',
 *               type: 'user defined',
 *               value: 14 } } }
 *     })
 *
 * @param {String} path the field to invalidate
 * @param {String|Error} errorMsg the error which states the reason `path` was invalid
 * @param {Object|String|Number|any} value optional invalid value
 * @param {String} [kind] optional `kind` property for the error
 * @return {ValidationError} the current ValidationError, with all currently invalidated paths
 * @api public
 */

Document.prototype.invalidate = function(path, err, val, kind) {
  if (!this.$__.validationError) {
    this.$__.validationError = new ValidationError(this);
  }

  if (this.$__.validationError.errors[path]) {
    return;
  }

  if (!err || typeof err === 'string') {
    err = new ValidatorError({
      path: path,
      message: err,
      type: kind || 'user defined',
      value: val
    });
  }

  if (this.$__.validationError === err) {
    return this.$__.validationError;
  }

  this.$__.validationError.errors[path] = err;
  return this.$__.validationError;
};

/**
 * Marks a path as valid, removing existing validation errors.
 *
 * @param {String} path the field to mark as valid
 * @api private
 * @method $markValid
 * @receiver Document
 */

Document.prototype.$markValid = function(path) {
  if (!this.$__.validationError || !this.$__.validationError.errors[path]) {
    return;
  }

  delete this.$__.validationError.errors[path];
  if (Object.keys(this.$__.validationError.errors).length === 0) {
    this.$__.validationError = null;
  }
};

/**
 * Checks if a path is invalid
 *
 * @param {String} path the field to check
 * @method $isValid
 * @api private
 * @receiver Document
 */

Document.prototype.$isValid = function(path) {
  return !this.$__.validationError || !this.$__.validationError.errors[path];
};

/**
 * Resets the internal modified state of this document.
 *
 * @api private
 * @return {Document}
 * @method $__reset
 * @memberOf Document
 */

Document.prototype.$__reset = function reset() {
  var _this = this;
  DocumentArray || (DocumentArray = require('./types/documentarray'));

  this.$__.activePaths
  .map('init', 'modify', function(i) {
    return _this.getValue(i);
  })
  .filter(function(val) {
    return val && val instanceof Array && val.isMongooseDocumentArray && val.length;
  })
  .forEach(function(array) {
    var i = array.length;
    while (i--) {
      var doc = array[i];
      if (!doc) {
        continue;
      }
      doc.$__reset();
    }
  });

  // clear atomics
  this.$__dirty().forEach(function(dirt) {
    var type = dirt.value;
    if (type && type._atomics) {
      type._atomics = {};
    }
  });

  // Clear 'dirty' cache
  this.$__.activePaths.clear('modify');
  this.$__.activePaths.clear('default');
  this.$__.validationError = undefined;
  this.errors = undefined;
  _this = this;
  this.schema.requiredPaths().forEach(function(path) {
    _this.$__.activePaths.require(path);
  });

  return this;
};

/**
 * Returns this documents dirty paths / vals.
 *
 * @api private
 * @method $__dirty
 * @memberOf Document
 */

Document.prototype.$__dirty = function() {
  var _this = this;

  var all = this.$__.activePaths.map('modify', function(path) {
    return {
      path: path,
      value: _this.getValue(path),
      schema: _this.$__path(path)
    };
  });

  // gh-2558: if we had to set a default and the value is not undefined,
  // we have to save as well
  all = all.concat(this.$__.activePaths.map('default', function(path) {
    if (path === '_id' || !_this.getValue(path)) {
      return;
    }
    return {
      path: path,
      value: _this.getValue(path),
      schema: _this.$__path(path)
    };
  }));

  // Sort dirty paths in a flat hierarchy.
  all.sort(function(a, b) {
    return (a.path < b.path ? -1 : (a.path > b.path ? 1 : 0));
  });

  // Ignore "foo.a" if "foo" is dirty already.
  var minimal = [],
      lastPath,
      top;

  all.forEach(function(item) {
    if (!item) {
      return;
    }
    if (item.path.indexOf(lastPath) !== 0) {
      lastPath = item.path + '.';
      minimal.push(item);
      top = item;
    } else {
      // special case for top level MongooseArrays
      if (top.value && top.value._atomics && top.value.hasAtomics()) {
        // the `top` array itself and a sub path of `top` are being modified.
        // the only way to honor all of both modifications is through a $set
        // of entire array.
        top.value._atomics = {};
        top.value._atomics.$set = top.value;
      }
    }
  });

  top = lastPath = null;
  return minimal;
};

/*!
 * Compiles schemas.
 */

function compile(tree, proto, prefix, options) {
  var keys = Object.keys(tree),
      i = keys.length,
      limb,
      key;

  while (i--) {
    key = keys[i];
    limb = tree[key];

    defineKey(key,
        ((utils.getFunctionName(limb.constructor) === 'Object'
        && Object.keys(limb).length)
        && (!limb[options.typeKey] || (options.typeKey === 'type' && limb.type.type))
            ? limb
            : null)
        , proto
        , prefix
        , keys
        , options);
  }
}

// gets descriptors for all properties of `object`
// makes all properties non-enumerable to match previous behavior to #2211
function getOwnPropertyDescriptors(object) {
  var result = {};

  Object.getOwnPropertyNames(object).forEach(function(key) {
    result[key] = Object.getOwnPropertyDescriptor(object, key);
    result[key].enumerable = true;
  });

  return result;
}

/*!
 * Defines the accessor named prop on the incoming prototype.
 */

function defineKey(prop, subprops, prototype, prefix, keys, options) {
  var path = (prefix ? prefix + '.' : '') + prop;
  prefix = prefix || '';

  if (subprops) {
    Object.defineProperty(prototype, prop, {
      enumerable: true,
      configurable: true,
      get: function() {
        var _this = this;
        if (!this.$__.getters) {
          this.$__.getters = {};
        }

        if (!this.$__.getters[path]) {
          var nested = Object.create(Object.getPrototypeOf(this), getOwnPropertyDescriptors(this));

          // save scope for nested getters/setters
          if (!prefix) {
            nested.$__.scope = this;
          }

          // shadow inherited getters from sub-objects so
          // thing.nested.nested.nested... doesn't occur (gh-366)
          var i = 0,
              len = keys.length;

          for (; i < len; ++i) {
            // over-write the parents getter without triggering it
            Object.defineProperty(nested, keys[i], {
              enumerable: false,    // It doesn't show up.
              writable: true,       // We can set it later.
              configurable: true,   // We can Object.defineProperty again.
              value: undefined      // It shadows its parent.
            });
          }

          Object.defineProperty(nested, 'toObject', {
            enumerable: true,
            configurable: true,
            writable: false,
            value: function() {
              return _this.get(path);
            }
          });

          Object.defineProperty(nested, 'toJSON', {
            enumerable: true,
            configurable: true,
            writable: false,
            value: function() {
              return _this.get(path);
            }
          });

          Object.defineProperty(nested, '$__isNested', {
            enumerable: true,
            configurable: true,
            writable: false,
            value: true
          });

          compile(subprops, nested, path, options);
          this.$__.getters[path] = nested;
        }

        return this.$__.getters[path];
      },
      set: function(v) {
        if (v instanceof Document) {
          v = v.toObject({ transform: false });
        }
        return (this.$__.scope || this).set(path, v);
      }
    });
  } else {
    Object.defineProperty(prototype, prop, {
      enumerable: true,
      configurable: true,
      get: function() {
        return this.get.call(this.$__.scope || this, path);
      },
      set: function(v) {
        return this.set.call(this.$__.scope || this, path, v);
      }
    });
  }
}

/**
 * Assigns/compiles `schema` into this documents prototype.
 *
 * @param {Schema} schema
 * @api private
 * @method $__setSchema
 * @memberOf Document
 */

Document.prototype.$__setSchema = function(schema) {
  compile(schema.tree, this, undefined, schema.options);
  this.schema = schema;
};


/**
 * Get active path that were changed and are arrays
 *
 * @api private
 * @method $__getArrayPathsToValidate
 * @memberOf Document
 */

Document.prototype.$__getArrayPathsToValidate = function() {
  DocumentArray || (DocumentArray = require('./types/documentarray'));

  // validate all document arrays.
  return this.$__.activePaths
  .map('init', 'modify', function(i) {
    return this.getValue(i);
  }.bind(this))
  .filter(function(val) {
    return val && val instanceof Array && val.isMongooseDocumentArray && val.length;
  }).reduce(function(seed, array) {
    return seed.concat(array);
  }, [])
  .filter(function(doc) {
    return doc;
  });
};


/**
 * Get all subdocs (by bfs)
 *
 * @api private
 * @method $__getAllSubdocs
 * @memberOf Document
 */

Document.prototype.$__getAllSubdocs = function() {
  DocumentArray || (DocumentArray = require('./types/documentarray'));
  Embedded = Embedded || require('./types/embedded');

  function docReducer(seed, path) {
    var val = this[path];

    if (val instanceof Embedded) {
      seed.push(val);
    }
    if (val && val.$isSingleNested) {
      seed = Object.keys(val._doc).reduce(docReducer.bind(val._doc), seed);
      seed.push(val);
    }
    if (val && val.isMongooseDocumentArray) {
      val.forEach(function _docReduce(doc) {
        if (!doc || !doc._doc) {
          return;
        }
        if (doc instanceof Embedded) {
          seed.push(doc);
        }
        seed = Object.keys(doc._doc).reduce(docReducer.bind(doc._doc), seed);
      });
    } else if (val instanceof Document && val.$__isNested) {
      val = val.toObject();
      if (val) {
        seed = Object.keys(val).reduce(docReducer.bind(val), seed);
      }
    }
    return seed;
  }

  var subDocs = Object.keys(this._doc).reduce(docReducer.bind(this), []);

  return subDocs;
};

/**
 * Executes methods queued from the Schema definition
 *
 * @api private
 * @method $__registerHooksFromSchema
 * @memberOf Document
 */

Document.prototype.$__registerHooksFromSchema = function() {
  Embedded = Embedded || require('./types/embedded');
  var Promise = PromiseProvider.get();

  var _this = this;
  var q = _this.schema && _this.schema.callQueue;
  if (!q.length) {
    return _this;
  }

  // we are only interested in 'pre' hooks, and group by point-cut
  var toWrap = q.reduce(function(seed, pair) {
    if (pair[0] !== 'pre' && pair[0] !== 'post' && pair[0] !== 'on') {
      _this[pair[0]].apply(_this, pair[1]);
      return seed;
    }
    var args = [].slice.call(pair[1]);
    var pointCut = pair[0] === 'on' ? 'post' : args[0];
    if (!(pointCut in seed)) {
      seed[pointCut] = {post: [], pre: []};
    }
    if (pair[0] === 'post') {
      seed[pointCut].post.push(args);
    } else if (pair[0] === 'on') {
      seed[pointCut].push(args);
    } else {
      seed[pointCut].pre.push(args);
    }
    return seed;
  }, {post: []});

  // 'post' hooks are simpler
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

  Object.keys(toWrap).forEach(function(pointCut) {
    // this is so we can wrap everything into a promise;
    var newName = ('$__original_' + pointCut);
    if (!_this[pointCut]) {
      return;
    }
    _this[newName] = _this[pointCut];
    _this[pointCut] = function wrappedPointCut() {
      var args = [].slice.call(arguments);
      var lastArg = args.pop();
      var fn;
      var originalStack = new Error().stack;
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
              error.stack = originalStack;
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

        _this[newName].apply(_this, args);
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

    toWrap[pointCut].pre.forEach(function(args) {
      args[0] = newName;
      _this.$pre.apply(_this, args);
    });
    toWrap[pointCut].post.forEach(function(args) {
      args[0] = newName;
      _this.$post.apply(_this, args);
    });
  });
  return _this;
};

Document.prototype.$__handleReject = function handleReject(err) {
  // emit on the Model if listening
  if (this.listeners('error').length) {
    this.emit('error', err);
  } else if (this.constructor.listeners && this.constructor.listeners('error').length) {
    this.constructor.emit('error', err);
  } else if (this.listeners && this.listeners('error').length) {
    this.emit('error', err);
  }
};

/**
 * Internal helper for toObject() and toJSON() that doesn't manipulate options
 *
 * @api private
 * @method $toObject
 * @memberOf Document
 */

Document.prototype.$toObject = function(options, json) {
  var defaultOptions = {transform: true, json: json};

  if (options && options.depopulate && !options._skipDepopulateTopLevel && this.$__.wasPopulated) {
    // populated paths that we set to a document
    return clone(this._id, options);
  }

  // If we're calling toObject on a populated doc, we may want to skip
  // depopulated on the top level
  if (options && options._skipDepopulateTopLevel) {
    options._skipDepopulateTopLevel = false;
  }

  // When internally saving this document we always pass options,
  // bypassing the custom schema options.
  if (!(options && utils.getFunctionName(options.constructor) === 'Object') ||
      (options && options._useSchemaOptions)) {
    if (json) {
      options = this.schema.options.toJSON ?
        clone(this.schema.options.toJSON) :
        {};
      options.json = true;
      options._useSchemaOptions = true;
    } else {
      options = this.schema.options.toObject ?
        clone(this.schema.options.toObject) :
        {};
      options.json = false;
      options._useSchemaOptions = true;
    }
  }

  for (var key in defaultOptions) {
    if (options[key] === undefined) {
      options[key] = defaultOptions[key];
    }
  }

  ('minimize' in options) || (options.minimize = this.schema.options.minimize);

  // remember the root transform function
  // to save it from being overwritten by sub-transform functions
  var originalTransform = options.transform;

  var ret = clone(this._doc, options) || {};

  if (options.getters) {
    applyGetters(this, ret, 'paths', options);
    // applyGetters for paths will add nested empty objects;
    // if minimize is set, we need to remove them.
    if (options.minimize) {
      ret = minimize(ret) || {};
    }
  }

  if (options.virtuals || options.getters && options.virtuals !== false) {
    applyGetters(this, ret, 'virtuals', options);
  }

  if (options.versionKey === false && this.schema.options.versionKey) {
    delete ret[this.schema.options.versionKey];
  }

  var transform = options.transform;

  // In the case where a subdocument has its own transform function, we need to
  // check and see if the parent has a transform (options.transform) and if the
  // child schema has a transform (this.schema.options.toObject) In this case,
  // we need to adjust options.transform to be the child schema's transform and
  // not the parent schema's
  if (transform === true ||
      (this.schema.options.toObject && transform)) {
    var opts = options.json ? this.schema.options.toJSON : this.schema.options.toObject;

    if (opts) {
      transform = (typeof options.transform === 'function' ? options.transform : opts.transform);
    }
  } else {
    options.transform = originalTransform;
  }

  if (typeof transform === 'function') {
    var xformed = transform(this, ret, options);
    if (typeof xformed !== 'undefined') {
      ret = xformed;
    }
  }

  return ret;
};

/**
 * Converts this document into a plain javascript object, ready for storage in MongoDB.
 *
 * Buffers are converted to instances of [mongodb.Binary](http://mongodb.github.com/node-mongodb-native/api-bson-generated/binary.html) for proper storage.
 *
 * ####Options:
 *
 * - `getters` apply all getters (path and virtual getters)
 * - `virtuals` apply virtual getters (can override `getters` option)
 * - `minimize` remove empty objects (defaults to true)
 * - `transform` a transform function to apply to the resulting document before returning
 * - `depopulate` depopulate any populated paths, replacing them with their original refs (defaults to false)
 * - `versionKey` whether to include the version key (defaults to true)
 * - `retainKeyOrder` keep the order of object keys. If this is set to true, `Object.keys(new Doc({ a: 1, b: 2}).toObject())` will always produce `['a', 'b']` (defaults to false)
 *
 * ####Getters/Virtuals
 *
 * Example of only applying path getters
 *
 *     doc.toObject({ getters: true, virtuals: false })
 *
 * Example of only applying virtual getters
 *
 *     doc.toObject({ virtuals: true })
 *
 * Example of applying both path and virtual getters
 *
 *     doc.toObject({ getters: true })
 *
 * To apply these options to every document of your schema by default, set your [schemas](#schema_Schema) `toObject` option to the same argument.
 *
 *     schema.set('toObject', { virtuals: true })
 *
 * ####Transform
 *
 * We may need to perform a transformation of the resulting object based on some criteria, say to remove some sensitive information or return a custom object. In this case we set the optional `transform` function.
 *
 * Transform functions receive three arguments
 *
 *     function (doc, ret, options) {}
 *
 * - `doc` The mongoose document which is being converted
 * - `ret` The plain object representation which has been converted
 * - `options` The options in use (either schema options or the options passed inline)
 *
 * ####Example
 *
 *     // specify the transform schema option
 *     if (!schema.options.toObject) schema.options.toObject = {};
 *     schema.options.toObject.transform = function (doc, ret, options) {
 *       // remove the _id of every document before returning the result
 *       delete ret._id;
 *       return ret;
 *     }
 *
 *     // without the transformation in the schema
 *     doc.toObject(); // { _id: 'anId', name: 'Wreck-it Ralph' }
 *
 *     // with the transformation
 *     doc.toObject(); // { name: 'Wreck-it Ralph' }
 *
 * With transformations we can do a lot more than remove properties. We can even return completely new customized objects:
 *
 *     if (!schema.options.toObject) schema.options.toObject = {};
 *     schema.options.toObject.transform = function (doc, ret, options) {
 *       return { movie: ret.name }
 *     }
 *
 *     // without the transformation in the schema
 *     doc.toObject(); // { _id: 'anId', name: 'Wreck-it Ralph' }
 *
 *     // with the transformation
 *     doc.toObject(); // { movie: 'Wreck-it Ralph' }
 *
 * _Note: if a transform function returns `undefined`, the return value will be ignored._
 *
 * Transformations may also be applied inline, overridding any transform set in the options:
 *
 *     function xform (doc, ret, options) {
 *       return { inline: ret.name, custom: true }
 *     }
 *
 *     // pass the transform as an inline option
 *     doc.toObject({ transform: xform }); // { inline: 'Wreck-it Ralph', custom: true }
 *
 * _Note: if you call `toObject` and pass any options, the transform declared in your schema options will __not__ be applied. To force its application pass `transform: true`_
 *
 *     if (!schema.options.toObject) schema.options.toObject = {};
 *     schema.options.toObject.hide = '_id';
 *     schema.options.toObject.transform = function (doc, ret, options) {
 *       if (options.hide) {
 *         options.hide.split(' ').forEach(function (prop) {
 *           delete ret[prop];
 *         });
 *       }
 *       return ret;
 *     }
 *
 *     var doc = new Doc({ _id: 'anId', secret: 47, name: 'Wreck-it Ralph' });
 *     doc.toObject();                                        // { secret: 47, name: 'Wreck-it Ralph' }
 *     doc.toObject({ hide: 'secret _id' });                  // { _id: 'anId', secret: 47, name: 'Wreck-it Ralph' }
 *     doc.toObject({ hide: 'secret _id', transform: true }); // { name: 'Wreck-it Ralph' }
 *
 * Transforms are applied _only to the document and are not applied to sub-documents_.
 *
 * Transforms, like all of these options, are also available for `toJSON`.
 *
 * See [schema options](/docs/guide.html#toObject) for some more details.
 *
 * _During save, no custom options are applied to the document before being sent to the database._
 *
 * @param {Object} [options]
 * @return {Object} js object
 * @see mongodb.Binary http://mongodb.github.com/node-mongodb-native/api-bson-generated/binary.html
 * @api public
 */

Document.prototype.toObject = function(options) {
  return this.$toObject(options);
};

/*!
 * Minimizes an object, removing undefined values and empty objects
 *
 * @param {Object} object to minimize
 * @return {Object}
 */

function minimize(obj) {
  var keys = Object.keys(obj),
      i = keys.length,
      hasKeys,
      key,
      val;

  while (i--) {
    key = keys[i];
    val = obj[key];

    if (utils.isObject(val)) {
      obj[key] = minimize(val);
    }

    if (undefined === obj[key]) {
      delete obj[key];
      continue;
    }

    hasKeys = true;
  }

  return hasKeys
      ? obj
      : undefined;
}

/*!
 * Applies virtuals properties to `json`.
 *
 * @param {Document} self
 * @param {Object} json
 * @param {String} type either `virtuals` or `paths`
 * @return {Object} `json`
 */

function applyGetters(self, json, type, options) {
  var schema = self.schema,
      paths = Object.keys(schema[type]),
      i = paths.length,
      path;

  while (i--) {
    path = paths[i];

    var parts = path.split('.'),
        plen = parts.length,
        last = plen - 1,
        branch = json,
        part;

    for (var ii = 0; ii < plen; ++ii) {
      part = parts[ii];
      if (ii === last) {
        branch[part] = clone(self.get(path), options);
      } else {
        branch = branch[part] || (branch[part] = {});
      }
    }
  }

  return json;
}

/**
 * The return value of this method is used in calls to JSON.stringify(doc).
 *
 * This method accepts the same options as [Document#toObject](#document_Document-toObject). To apply the options to every document of your schema by default, set your [schemas](#schema_Schema) `toJSON` option to the same argument.
 *
 *     schema.set('toJSON', { virtuals: true })
 *
 * See [schema options](/docs/guide.html#toJSON) for details.
 *
 * @param {Object} options
 * @return {Object}
 * @see Document#toObject #document_Document-toObject
 * @api public
 */

Document.prototype.toJSON = function(options) {
  return this.$toObject(options, true);
};

/**
 * Helper for console.log
 *
 * @api public
 */

Document.prototype.inspect = function(options) {
  var isPOJO = options &&
    utils.getFunctionName(options.constructor) === 'Object';
  var opts;
  if (isPOJO) {
    opts = options;
    opts.minimize = false;
    opts.retainKeyOrder = true;
  }
  return this.toObject(opts);
};

/**
 * Helper for console.log
 *
 * @api public
 * @method toString
 */

Document.prototype.toString = function() {
  return inspect(this.inspect());
};

/**
 * Returns true if the Document stores the same data as doc.
 *
 * Documents are considered equal when they have matching `_id`s, unless neither
 * document has an `_id`, in which case this function falls back to using
 * `deepEqual()`.
 *
 * @param {Document} doc a document to compare
 * @return {Boolean}
 * @api public
 */

Document.prototype.equals = function(doc) {
  if (!doc) {
    return false;
  }

  var tid = this.get('_id');
  var docid = doc.get ? doc.get('_id') : doc;
  if (!tid && !docid) {
    return deepEqual(this, doc);
  }
  return tid && tid.equals
      ? tid.equals(docid)
      : tid === docid;
};

/**
 * Populates document references, executing the `callback` when complete.
 * If you want to use promises instead, use this function with
 * [`execPopulate()`](#document_Document-execPopulate)
 *
 * ####Example:
 *
 *     doc
 *     .populate('company')
 *     .populate({
 *       path: 'notes',
 *       match: /airline/,
 *       select: 'text',
 *       model: 'modelName'
 *       options: opts
 *     }, function (err, user) {
 *       assert(doc._id === user._id) // the document itself is passed
 *     })
 *
 *     // summary
 *     doc.populate(path)                   // not executed
 *     doc.populate(options);               // not executed
 *     doc.populate(path, callback)         // executed
 *     doc.populate(options, callback);     // executed
 *     doc.populate(callback);              // executed
 *     doc.populate(options).execPopulate() // executed, returns promise
 *
 *
 * ####NOTE:
 *
 * Population does not occur unless a `callback` is passed *or* you explicitly
 * call `execPopulate()`.
 * Passing the same path a second time will overwrite the previous path options.
 * See [Model.populate()](#model_Model.populate) for explaination of options.
 *
 * @see Model.populate #model_Model.populate
 * @see Document.execPopulate #document_Document-execPopulate
 * @param {String|Object} [path] The path to populate or an options object
 * @param {Function} [callback] When passed, population is invoked
 * @api public
 * @return {Document} this
 */

Document.prototype.populate = function populate() {
  if (arguments.length === 0) {
    return this;
  }

  var pop = this.$__.populate || (this.$__.populate = {});
  var args = utils.args(arguments);
  var fn;

  if (typeof args[args.length - 1] === 'function') {
    fn = args.pop();
  }

  // allow `doc.populate(callback)`
  if (args.length) {
    // use hash to remove duplicate paths
    var res = utils.populate.apply(null, args);
    for (var i = 0; i < res.length; ++i) {
      pop[res[i].path] = res[i];
    }
  }

  if (fn) {
    var paths = utils.object.vals(pop);
    this.$__.populate = undefined;
    paths.__noPromise = true;
    this.constructor.populate(this, paths, fn);
  }

  return this;
};

/**
 * Explicitly executes population and returns a promise. Useful for ES2015
 * integration.
 *
 * ####Example:
 *
 *     var promise = doc.
 *       populate('company').
 *       populate({
 *         path: 'notes',
 *         match: /airline/,
 *         select: 'text',
 *         model: 'modelName'
 *         options: opts
 *       }).
 *       execPopulate();
 *
 *     // summary
 *     doc.execPopulate().then(resolve, reject);
 *
 *
 * @see Document.populate #document_Document-populate
 * @api public
 * @return {Promise} promise that resolves to the document when population is done
 */

Document.prototype.execPopulate = function() {
  var Promise = PromiseProvider.get();
  var _this = this;
  return new Promise.ES6(function(resolve, reject) {
    _this.populate(function(error, res) {
      if (error) {
        reject(error);
      } else {
        resolve(res);
      }
    });
  });
};

/**
 * Gets _id(s) used during population of the given `path`.
 *
 * ####Example:
 *
 *     Model.findOne().populate('author').exec(function (err, doc) {
 *       console.log(doc.author.name)         // Dr.Seuss
 *       console.log(doc.populated('author')) // '5144cf8050f071d979c118a7'
 *     })
 *
 * If the path was not populated, undefined is returned.
 *
 * @param {String} path
 * @return {Array|ObjectId|Number|Buffer|String|undefined}
 * @api public
 */

Document.prototype.populated = function(path, val, options) {
  // val and options are internal

  if (val === null || val === void 0) {
    if (!this.$__.populated) {
      return undefined;
    }
    var v = this.$__.populated[path];
    if (v) {
      return v.value;
    }
    return undefined;
  }

  // internal

  if (val === true) {
    if (!this.$__.populated) {
      return undefined;
    }
    return this.$__.populated[path];
  }

  this.$__.populated || (this.$__.populated = {});
  this.$__.populated[path] = {value: val, options: options};
  return val;
};

/**
 * Takes a populated field and returns it to its unpopulated state.
 *
 * ####Example:
 *
 *     Model.findOne().populate('author').exec(function (err, doc) {
 *       console.log(doc.author.name); // Dr.Seuss
 *       console.log(doc.depopulate('author'));
 *       console.log(doc.author); // '5144cf8050f071d979c118a7'
 *     })
 *
 * If the path was not populated, this is a no-op.
 *
 * @param {String} path
 * @see Document.populate #document_Document-populate
 * @api public
 */

Document.prototype.depopulate = function(path) {
  var populatedIds = this.populated(path);
  if (!populatedIds) {
    return;
  }
  delete this.$__.populated[path];
  this.set(path, populatedIds);
};


/**
 * Returns the full path to this document.
 *
 * @param {String} [path]
 * @return {String}
 * @api private
 * @method $__fullPath
 * @memberOf Document
 */

Document.prototype.$__fullPath = function(path) {
  // overridden in SubDocuments
  return path || '';
};

/*!
 * Module exports.
 */

Document.ValidationError = ValidationError;
module.exports = exports = Document;

}).call(this,require("g5I+bs"),require("buffer").Buffer)
},{"./error":12,"./error/objectExpected":17,"./error/strict":19,"./internal":23,"./promise_provider":25,"./schema":26,"./schema/mixed":34,"./schematype":41,"./services/common":42,"./types/array":44,"./types/documentarray":46,"./types/embedded":47,"./utils":51,"buffer":84,"events":87,"g5I+bs":133,"hooks-fixed":88,"util":138}],6:[function(require,module,exports){
'use strict';

/* eslint-env browser */

/*!
 * Module dependencies.
 */
var Document = require('./document.js');
var BrowserDocument = require('./browserDocument.js');

/**
 * Returns the Document constructor for the current context
 *
 * @api private
 */
module.exports = function() {
  if (typeof window !== 'undefined' && typeof document !== 'undefined' && document === window.document) {
    return BrowserDocument;
  }
  return Document;
};

},{"./browserDocument.js":3,"./document.js":5}],7:[function(require,module,exports){
/*!
 * ignore
 */

module.exports = function() {};

},{}],8:[function(require,module,exports){

/*!
 * Module dependencies.
 */

var Binary = require('bson').Binary;

/*!
 * Module exports.
 */

module.exports = exports = Binary;

},{"bson":66}],9:[function(require,module,exports){
/*!
 * Module exports.
 */

exports.Binary = require('./binary');
exports.ObjectId = require('./objectid');
exports.ReadPreference = require('./ReadPreference');

},{"./ReadPreference":7,"./binary":8,"./objectid":10}],10:[function(require,module,exports){

/*!
 * [node-mongodb-native](https://github.com/mongodb/node-mongodb-native) ObjectId
 * @constructor NodeMongoDbObjectId
 * @see ObjectId
 */

var ObjectId = require('bson').ObjectID;

/*!
 * ignore
 */

module.exports = exports = ObjectId;

},{"bson":66}],11:[function(require,module,exports){
(function (global){
/*!
 * ignore
 */

var driver;

if (typeof window === 'undefined') {
  driver = require(global.MONGOOSE_DRIVER_PATH || './node-mongodb-native');
} else {
  driver = require('./browser');
}

/*!
 * ignore
 */

module.exports = driver;

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./browser":9}],12:[function(require,module,exports){

/**
 * MongooseError constructor
 *
 * @param {String} msg Error message
 * @inherits Error https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error
 */

function MongooseError(msg) {
  Error.call(this);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this);
  } else {
    this.stack = new Error().stack;
  }
  this.message = msg;
  this.name = 'MongooseError';
}

/*!
 * Inherits from Error.
 */

MongooseError.prototype = Object.create(Error.prototype);
MongooseError.prototype.constructor = Error;

/*!
 * Module exports.
 */

module.exports = exports = MongooseError;

/**
 * The default built-in validator error messages.
 *
 * @see Error.messages #error_messages_MongooseError-messages
 * @api public
 */

MongooseError.messages = require('./error/messages');

// backward compat
MongooseError.Messages = MongooseError.messages;

/*!
 * Expose subclasses
 */

MongooseError.CastError = require('./error/cast');
MongooseError.ValidationError = require('./error/validation');
MongooseError.ValidatorError = require('./error/validator');
MongooseError.VersionError = require('./error/version');
MongooseError.OverwriteModelError = require('./error/overwriteModel');
MongooseError.MissingSchemaError = require('./error/missingSchema');
MongooseError.DivergentArrayError = require('./error/divergentArray');

},{"./error/cast":13,"./error/divergentArray":14,"./error/messages":15,"./error/missingSchema":16,"./error/overwriteModel":18,"./error/validation":20,"./error/validator":21,"./error/version":22}],13:[function(require,module,exports){
/*!
 * Module dependencies.
 */

var MongooseError = require('../error.js');
var util = require('util');

/**
 * Casting Error constructor.
 *
 * @param {String} type
 * @param {String} value
 * @inherits MongooseError
 * @api private
 */

function CastError(type, value, path, reason) {
  var stringValue = util.inspect(value);
  stringValue = stringValue.replace(/^'/, '"').replace(/'$/, '"');
  if (stringValue.charAt(0) !== '"') {
    stringValue = '"' + stringValue + '"';
  }
  MongooseError.call(this, 'Cast to ' + type + ' failed for value ' +
    stringValue + ' at path "' + path + '"');
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this);
  } else {
    this.stack = new Error().stack;
  }
  this.name = 'CastError';
  this.kind = type;
  this.value = value;
  this.path = path;
  this.reason = reason;
}

/*!
 * Inherits from MongooseError.
 */

CastError.prototype = Object.create(MongooseError.prototype);
CastError.prototype.constructor = MongooseError;


/*!
 * exports
 */

module.exports = CastError;

},{"../error.js":12,"util":138}],14:[function(require,module,exports){

/*!
 * Module dependencies.
 */

var MongooseError = require('../error.js');

/*!
 * DivergentArrayError constructor.
 *
 * @inherits MongooseError
 */

function DivergentArrayError(paths) {
  var msg = 'For your own good, using `document.save()` to update an array '
          + 'which was selected using an $elemMatch projection OR '
          + 'populated using skip, limit, query conditions, or exclusion of '
          + 'the _id field when the operation results in a $pop or $set of '
          + 'the entire array is not supported. The following '
          + 'path(s) would have been modified unsafely:\n'
          + '  ' + paths.join('\n  ') + '\n'
          + 'Use Model.update() to update these arrays instead.';
          // TODO write up a docs page (FAQ) and link to it

  MongooseError.call(this, msg);
  Error.captureStackTrace && Error.captureStackTrace(this, arguments.callee);
  this.name = 'DivergentArrayError';
}

/*!
 * Inherits from MongooseError.
 */

DivergentArrayError.prototype = Object.create(MongooseError.prototype);
DivergentArrayError.prototype.constructor = MongooseError;


/*!
 * exports
 */

module.exports = DivergentArrayError;

},{"../error.js":12}],15:[function(require,module,exports){

/**
 * The default built-in validator error messages. These may be customized.
 *
 *     // customize within each schema or globally like so
 *     var mongoose = require('mongoose');
 *     mongoose.Error.messages.String.enum  = "Your custom message for {PATH}.";
 *
 * As you might have noticed, error messages support basic templating
 *
 * - `{PATH}` is replaced with the invalid document path
 * - `{VALUE}` is replaced with the invalid value
 * - `{TYPE}` is replaced with the validator type such as "regexp", "min", or "user defined"
 * - `{MIN}` is replaced with the declared min value for the Number.min validator
 * - `{MAX}` is replaced with the declared max value for the Number.max validator
 *
 * Click the "show code" link below to see all defaults.
 *
 * @static messages
 * @receiver MongooseError
 * @api public
 */

var msg = module.exports = exports = {};

msg.general = {};
msg.general.default = 'Validator failed for path `{PATH}` with value `{VALUE}`';
msg.general.required = 'Path `{PATH}` is required.';

msg.Number = {};
msg.Number.min = 'Path `{PATH}` ({VALUE}) is less than minimum allowed value ({MIN}).';
msg.Number.max = 'Path `{PATH}` ({VALUE}) is more than maximum allowed value ({MAX}).';

msg.Date = {};
msg.Date.min = 'Path `{PATH}` ({VALUE}) is before minimum allowed value ({MIN}).';
msg.Date.max = 'Path `{PATH}` ({VALUE}) is after maximum allowed value ({MAX}).';

msg.String = {};
msg.String.enum = '`{VALUE}` is not a valid enum value for path `{PATH}`.';
msg.String.match = 'Path `{PATH}` is invalid ({VALUE}).';
msg.String.minlength = 'Path `{PATH}` (`{VALUE}`) is shorter than the minimum allowed length ({MINLENGTH}).';
msg.String.maxlength = 'Path `{PATH}` (`{VALUE}`) is longer than the maximum allowed length ({MAXLENGTH}).';

},{}],16:[function(require,module,exports){

/*!
 * Module dependencies.
 */

var MongooseError = require('../error.js');

/*!
 * MissingSchema Error constructor.
 *
 * @inherits MongooseError
 */

function MissingSchemaError(name) {
  var msg = 'Schema hasn\'t been registered for model "' + name + '".\n'
          + 'Use mongoose.model(name, schema)';
  MongooseError.call(this, msg);
  Error.captureStackTrace && Error.captureStackTrace(this, arguments.callee);
  this.name = 'MissingSchemaError';
}

/*!
 * Inherits from MongooseError.
 */

MissingSchemaError.prototype = Object.create(MongooseError.prototype);
MissingSchemaError.prototype.constructor = MongooseError;

/*!
 * exports
 */

module.exports = MissingSchemaError;

},{"../error.js":12}],17:[function(require,module,exports){
/*!
 * Module dependencies.
 */

var MongooseError = require('../error.js');

/**
 * Strict mode error constructor
 *
 * @param {String} type
 * @param {String} value
 * @inherits MongooseError
 * @api private
 */

function ObjectExpectedError(path, val) {
  MongooseError.call(this, 'Tried to set nested object field `' + path +
    '` to primitive value `' + val + '` and strict mode is set to throw.');
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this);
  } else {
    this.stack = new Error().stack;
  }
  this.name = 'ObjectExpectedError';
  this.path = path;
}

/*!
 * Inherits from MongooseError.
 */

ObjectExpectedError.prototype = Object.create(MongooseError.prototype);
ObjectExpectedError.prototype.constructor = MongooseError;

module.exports = ObjectExpectedError;

},{"../error.js":12}],18:[function(require,module,exports){

/*!
 * Module dependencies.
 */

var MongooseError = require('../error.js');

/*!
 * OverwriteModel Error constructor.
 *
 * @inherits MongooseError
 */

function OverwriteModelError(name) {
  MongooseError.call(this, 'Cannot overwrite `' + name + '` model once compiled.');
  Error.captureStackTrace && Error.captureStackTrace(this, arguments.callee);
  this.name = 'OverwriteModelError';
}

/*!
 * Inherits from MongooseError.
 */

OverwriteModelError.prototype = Object.create(MongooseError.prototype);
OverwriteModelError.prototype.constructor = MongooseError;

/*!
 * exports
 */

module.exports = OverwriteModelError;

},{"../error.js":12}],19:[function(require,module,exports){
/*!
 * Module dependencies.
 */

var MongooseError = require('../error.js');

/**
 * Strict mode error constructor
 *
 * @param {String} type
 * @param {String} value
 * @inherits MongooseError
 * @api private
 */

function StrictModeError(path) {
  MongooseError.call(this, 'Field `' + path + '` is not in schema and strict ' +
    'mode is set to throw.');
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this);
  } else {
    this.stack = new Error().stack;
  }
  this.name = 'StrictModeError';
  this.path = path;
}

/*!
 * Inherits from MongooseError.
 */

StrictModeError.prototype = Object.create(MongooseError.prototype);
StrictModeError.prototype.constructor = MongooseError;

module.exports = StrictModeError;

},{"../error.js":12}],20:[function(require,module,exports){
/*!
 * Module requirements
 */

var MongooseError = require('../error.js');

/**
 * Document Validation Error
 *
 * @api private
 * @param {Document} instance
 * @inherits MongooseError
 */

function ValidationError(instance) {
  if (instance && instance.constructor.name === 'model') {
    MongooseError.call(this, instance.constructor.modelName + ' validation failed');
  } else {
    MongooseError.call(this, 'Validation failed');
  }
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this);
  } else {
    this.stack = new Error().stack;
  }
  this.name = 'ValidationError';
  this.errors = {};
  if (instance) {
    instance.errors = this.errors;
  }
}

/*!
 * Inherits from MongooseError.
 */

ValidationError.prototype = Object.create(MongooseError.prototype);
ValidationError.prototype.constructor = MongooseError;


/**
 * Console.log helper
 */

ValidationError.prototype.toString = function() {
  var ret = this.name + ': ';
  var msgs = [];

  Object.keys(this.errors).forEach(function(key) {
    if (this === this.errors[key]) {
      return;
    }
    msgs.push(String(this.errors[key]));
  }, this);

  return ret + msgs.join(', ');
};

/*!
 * Module exports
 */

module.exports = exports = ValidationError;

},{"../error.js":12}],21:[function(require,module,exports){
/*!
 * Module dependencies.
 */

var MongooseError = require('../error.js');

/**
 * Schema validator error
 *
 * @param {Object} properties
 * @inherits MongooseError
 * @api private
 */

function ValidatorError(properties) {
  var msg = properties.message;
  if (!msg) {
    msg = MongooseError.messages.general.default;
  }

  var message = this.formatMessage(msg, properties);
  MongooseError.call(this, message);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this);
  } else {
    this.stack = new Error().stack;
  }
  this.properties = properties;
  this.name = 'ValidatorError';
  this.kind = properties.type;
  this.path = properties.path;
  this.value = properties.value;
}

/*!
 * Inherits from MongooseError
 */

ValidatorError.prototype = Object.create(MongooseError.prototype);
ValidatorError.prototype.constructor = MongooseError;

/*!
 * The object used to define this validator. Not enumerable to hide
 * it from `require('util').inspect()` output re: gh-3925
 */

Object.defineProperty(ValidatorError.prototype, 'properties', {
  enumerable: false,
  writable: true,
  value: null
});

/*!
 * Formats error messages
 */

ValidatorError.prototype.formatMessage = function(msg, properties) {
  var propertyNames = Object.keys(properties);
  for (var i = 0; i < propertyNames.length; ++i) {
    var propertyName = propertyNames[i];
    if (propertyName === 'message') {
      continue;
    }
    msg = msg.replace('{' + propertyName.toUpperCase() + '}', properties[propertyName]);
  }
  return msg;
};

/*!
 * toString helper
 */

ValidatorError.prototype.toString = function() {
  return this.message;
};

/*!
 * exports
 */

module.exports = ValidatorError;

},{"../error.js":12}],22:[function(require,module,exports){
'use strict';

/*!
 * Module dependencies.
 */

var MongooseError = require('../error.js');

/**
 * Version Error constructor.
 *
 * @inherits MongooseError
 * @api private
 */

function VersionError(doc) {
  MongooseError.call(this, 'No matching document found for id "' + doc._id +
    '"');
  this.name = 'VersionError';
}

/*!
 * Inherits from MongooseError.
 */

VersionError.prototype = Object.create(MongooseError.prototype);
VersionError.prototype.constructor = MongooseError;

/*!
 * exports
 */

module.exports = VersionError;

},{"../error.js":12}],23:[function(require,module,exports){
/*!
 * Dependencies
 */

var StateMachine = require('./statemachine');
var ActiveRoster = StateMachine.ctor('require', 'modify', 'init', 'default', 'ignore');

module.exports = exports = InternalCache;

function InternalCache() {
  this.strictMode = undefined;
  this.selected = undefined;
  this.shardval = undefined;
  this.saveError = undefined;
  this.validationError = undefined;
  this.adhocPaths = undefined;
  this.removing = undefined;
  this.inserting = undefined;
  this.version = undefined;
  this.getters = {};
  this._id = undefined;
  this.populate = undefined; // what we want to populate in this doc
  this.populated = undefined;// the _ids that have been populated
  this.wasPopulated = false; // if this doc was the result of a population
  this.scope = undefined;
  this.activePaths = new ActiveRoster;

  // embedded docs
  this.ownerDocument = undefined;
  this.fullPath = undefined;
}

},{"./statemachine":43}],24:[function(require,module,exports){
/*!
 * Module dependencies
 */

var MPromise = require('mpromise');
var util = require('util');

/**
 * Promise constructor.
 *
 * Promises are returned from executed queries. Example:
 *
 *     var query = Candy.find({ bar: true });
 *     var promise = query.exec();
 *
 * DEPRECATED. Mongoose 5.0 will use native promises by default (or bluebird,
 * if native promises are not present) but still
 * support plugging in your own ES6-compatible promises library. Mongoose 5.0
 * will **not** support mpromise.
 *
 * @param {Function} fn a function which will be called when the promise is resolved that accepts `fn(err, ...){}` as signature
 * @inherits mpromise https://github.com/aheckmann/mpromise
 * @inherits NodeJS EventEmitter http://nodejs.org/api/events.html#events_class_events_eventemitter
 * @event `err`: Emits when the promise is rejected
 * @event `complete`: Emits when the promise is fulfilled
 * @api public
 * @deprecated
 */

function Promise(fn) {
  MPromise.call(this, fn);
}

/**
 * ES6-style promise constructor wrapper around mpromise.
 *
 * @param {Function} resolver
 * @return {Promise} new promise
 * @api public
 */
Promise.ES6 = function(resolver) {
  var promise = new Promise();

  // No try/catch for backwards compatibility
  resolver(
    function() {
      promise.complete.apply(promise, arguments);
    },
    function(e) {
      promise.error(e);
    });

  return promise;
};

/*!
 * Inherit from mpromise
 */

Promise.prototype = Object.create(MPromise.prototype, {
  constructor: {
    value: Promise,
    enumerable: false,
    writable: true,
    configurable: true
  }
});

/*!
 * ignore
 */

Promise.prototype.then = util.deprecate(Promise.prototype.then,
  'Mongoose: mpromise (mongoose\'s default promise library) is deprecated, ' +
  'plug in your own promise library instead: ' +
  'http://mongoosejs.com/docs/promises.html');

/**
 * ES6-style `.catch()` shorthand
 *
 * @method catch
 * @memberOf Promise
 * @param {Function} onReject
 * @return {Promise}
 * @api public
 */

Promise.prototype.catch = function(onReject) {
  return this.then(null, onReject);
};

/*!
 * Override event names for backward compatibility.
 */

Promise.SUCCESS = 'complete';
Promise.FAILURE = 'err';

/**
 * Adds `listener` to the `event`.
 *
 * If `event` is either the success or failure event and the event has already been emitted, the`listener` is called immediately and passed the results of the original emitted event.
 *
 * @see mpromise#on https://github.com/aheckmann/mpromise#on
 * @method on
 * @memberOf Promise
 * @param {String} event
 * @param {Function} listener
 * @return {Promise} this
 * @api public
 */

/**
 * Rejects this promise with `reason`.
 *
 * If the promise has already been fulfilled or rejected, not action is taken.
 *
 * @see mpromise#reject https://github.com/aheckmann/mpromise#reject
 * @method reject
 * @memberOf Promise
 * @param {Object|String|Error} reason
 * @return {Promise} this
 * @api public
 */

/**
 * Rejects this promise with `err`.
 *
 * If the promise has already been fulfilled or rejected, not action is taken.
 *
 * Differs from [#reject](#promise_Promise-reject) by first casting `err` to an `Error` if it is not `instanceof Error`.
 *
 * @api public
 * @param {Error|String} err
 * @return {Promise} this
 */

Promise.prototype.error = function(err) {
  if (!(err instanceof Error)) {
    if (err instanceof Object) {
      err = util.inspect(err);
    }
    err = new Error(err);
  }
  return this.reject(err);
};

/**
 * Resolves this promise to a rejected state if `err` is passed or a fulfilled state if no `err` is passed.
 *
 * If the promise has already been fulfilled or rejected, not action is taken.
 *
 * `err` will be cast to an Error if not already instanceof Error.
 *
 * _NOTE: overrides [mpromise#resolve](https://github.com/aheckmann/mpromise#resolve) to provide error casting._
 *
 * @param {Error} [err] error or null
 * @param {Object} [val] value to fulfill the promise with
 * @api public
 * @deprecated
 */

Promise.prototype.resolve = function(err) {
  if (err) return this.error(err);
  return this.fulfill.apply(this, Array.prototype.slice.call(arguments, 1));
};

/**
 * Adds a single function as a listener to both err and complete.
 *
 * It will be executed with traditional node.js argument position when the promise is resolved.
 *
 *     promise.addBack(function (err, args...) {
 *       if (err) return handleError(err);
 *       console.log('success');
 *     })
 *
 * Alias of [mpromise#onResolve](https://github.com/aheckmann/mpromise#onresolve).
 *
 * _Deprecated. Use `onResolve` instead._
 *
 * @method addBack
 * @param {Function} listener
 * @return {Promise} this
 * @deprecated
 */

Promise.prototype.addBack = Promise.prototype.onResolve;

/**
 * Fulfills this promise with passed arguments.
 *
 * @method fulfill
 * @receiver Promise
 * @see https://github.com/aheckmann/mpromise#fulfill
 * @param {any} args
 * @api public
 * @deprecated
 */

/**
 * Fulfills this promise with passed arguments.
 *
 * Alias of [mpromise#fulfill](https://github.com/aheckmann/mpromise#fulfill).
 *
 * _Deprecated. Use `fulfill` instead._
 *
 * @method complete
 * @receiver Promise
 * @param {any} args
 * @api public
 * @deprecated
 */

Promise.prototype.complete = MPromise.prototype.fulfill;

/**
 * Adds a listener to the `complete` (success) event.
 *
 * Alias of [mpromise#onFulfill](https://github.com/aheckmann/mpromise#onfulfill).
 *
 * _Deprecated. Use `onFulfill` instead._
 *
 * @method addCallback
 * @param {Function} listener
 * @return {Promise} this
 * @api public
 * @deprecated
 */

Promise.prototype.addCallback = Promise.prototype.onFulfill;

/**
 * Adds a listener to the `err` (rejected) event.
 *
 * Alias of [mpromise#onReject](https://github.com/aheckmann/mpromise#onreject).
 *
 * _Deprecated. Use `onReject` instead._
 *
 * @method addErrback
 * @param {Function} listener
 * @return {Promise} this
 * @api public
 * @deprecated
 */

Promise.prototype.addErrback = Promise.prototype.onReject;

/**
 * Creates a new promise and returns it. If `onFulfill` or `onReject` are passed, they are added as SUCCESS/ERROR callbacks to this promise after the nextTick.
 *
 * Conforms to [promises/A+](https://github.com/promises-aplus/promises-spec) specification.
 *
 * ####Example:
 *
 *     var promise = Meetups.find({ tags: 'javascript' }).select('_id').exec();
 *     promise.then(function (meetups) {
 *       var ids = meetups.map(function (m) {
 *         return m._id;
 *       });
 *       return People.find({ meetups: { $in: ids }).exec();
 *     }).then(function (people) {
 *       if (people.length < 10000) {
 *         throw new Error('Too few people!!!');
 *       } else {
 *         throw new Error('Still need more people!!!');
 *       }
 *     }).then(null, function (err) {
 *       assert.ok(err instanceof Error);
 *     });
 *
 * @see promises-A+ https://github.com/promises-aplus/promises-spec
 * @see mpromise#then https://github.com/aheckmann/mpromise#then
 * @method then
 * @memberOf Promise
 * @param {Function} onFulFill
 * @param {Function} onReject
 * @return {Promise} newPromise
 * @deprecated
 */

/**
 * Signifies that this promise was the last in a chain of `then()s`: if a handler passed to the call to `then` which produced this promise throws, the exception will go uncaught.
 *
 * ####Example:
 *
 *     var p = new Promise;
 *     p.then(function(){ throw new Error('shucks') });
 *     setTimeout(function () {
 *       p.fulfill();
 *       // error was caught and swallowed by the promise returned from
 *       // p.then(). we either have to always register handlers on
 *       // the returned promises or we can do the following...
 *     }, 10);
 *
 *     // this time we use .end() which prevents catching thrown errors
 *     var p = new Promise;
 *     var p2 = p.then(function(){ throw new Error('shucks') }).end(); // <--
 *     setTimeout(function () {
 *       p.fulfill(); // throws "shucks"
 *     }, 10);
 *
 * @api public
 * @see mpromise#end https://github.com/aheckmann/mpromise#end
 * @method end
 * @memberOf Promise
 * @deprecated
 */

/*!
 * expose
 */

module.exports = Promise;

},{"mpromise":121,"util":138}],25:[function(require,module,exports){
/*!
 * Module dependencies.
 */

var MPromise = require('./promise');

/**
 * Helper for multiplexing promise implementations
 *
 * @api private
 */

var Promise = {
  _promise: MPromise
};

/**
 * Get the current promise constructor
 *
 * @api private
 */
Promise.get = function() {
  return Promise._promise;
};

/**
 * Set the current promise constructor
 *
 * @api private
 */

Promise.set = function(lib) {
  if (lib === MPromise) {
    return Promise.reset();
  }
  Promise._promise = require('./ES6Promise');
  Promise._promise.use(lib);
  require('mquery').Promise = Promise._promise.ES6;
};

/**
 * Resets to using mpromise
 *
 * @api private
 */

Promise.reset = function() {
  Promise._promise = MPromise;
};

module.exports = Promise;

},{"./ES6Promise":1,"./promise":24,"mquery":126}],26:[function(require,module,exports){
(function (Buffer){
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

var IS_KAREEM_HOOK = {
  count: true,
  find: true,
  findOne: true,
  findOneAndUpdate: true,
  findOneAndRemove: true,
  insertMany: true,
  update: true
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
  this._requiredpaths = undefined;
  this.discriminatorMapping = undefined;
  this._indexedpaths = undefined;
  this.query = {};
  this.childSchemas = [];

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
    obj = {_id: {auto: true}};
    obj._id[this.options.typeKey] = Schema.ObjectId;
    this.add(obj);
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
}

/*!
 * Returns this documents _id cast to a string.
 */

function idGetter() {
  if (this.$__._id) {
    return this.$__._id;
  }

  this.$__._id = this._id == null
      ? null
      : String(this._id);
  return this.$__._id;
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
      hook: 'save',
      fn: function(next, options) {
        var _this = this;
        // Nested docs have their own presave
        if (this.ownerDocument) {
          return next();
        }

        var hasValidateBeforeSaveOption = options &&
            (typeof options === 'object') &&
            ('validateBeforeSave' in options);

        var shouldValidate;
        if (hasValidateBeforeSaveOption) {
          shouldValidate = !!options.validateBeforeSave;
        } else {
          shouldValidate = this.schema.options.validateBeforeSave;
        }

        // Validate
        if (shouldValidate) {
          // HACK: use $__original_validate to avoid promises so bluebird doesn't
          // complain
          if (this.$__original_validate) {
            this.$__original_validate({__noPromise: true}, function(error) {
              return _this.schema.s.hooks.execPost('save:error', _this, [_this], { error: error }, function(error) {
                next(error);
              });
            });
          } else {
            this.validate({__noPromise: true}, function(error) {
              return _this.schema.s.hooks.execPost('save:error', _this, [ _this], { error: error }, function(error) {
                next(error);
              });
            });
          }
        } else {
          next();
        }
      }
    },
    {
      kind: 'pre',
      hook: 'save',
      isAsync: true,
      fn: function(next, done) {
        var _this = this;
        var subdocs = this.$__getAllSubdocs();

        if (!subdocs.length || this.$__preSavingFromParent) {
          done();
          next();
          return;
        }

        each(subdocs, function(subdoc, cb) {
          subdoc.$__preSavingFromParent = true;
          subdoc.save(function(err) {
            cb(err);
          });
        }, function(error) {
          for (var i = 0; i < subdocs.length; ++i) {
            delete subdocs[i].$__preSavingFromParent;
          }
          if (error) {
            return _this.schema.s.hooks.execPost('save:error', _this, [_this], { error: error }, function(error) {
              done(error);
            });
          }
          next();
          done();
        });
      }
    },
    {
      kind: 'pre',
      hook: 'validate',
      isAsync: true,
      fn: function(next, done) {
        // Hack to ensure that we always wrap validate() in a promise
        next();
        done();
      }
    },
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

        if (!subdocs.length || this.$__preSavingFromParent) {
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
    typeKey: 'type'
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

    schemaAdditions[updatedAt] = Date;

    if (!this.paths[createdAt]) {
      schemaAdditions[createdAt] = Date;
    }

    this.add(schemaAdditions);

    this.pre('save', function(next) {
      var defaultTimestamp = new Date();
      var auto_id = this._id && this._id.auto;

      if (!this[createdAt] && this.isSelected(createdAt)) {
        this[createdAt] = auto_id ? this._id.getTimestamp() : defaultTimestamp;
      }

      if (this.isNew || this.isModified()) {
        this[updatedAt] = this.isNew ? this[createdAt] : defaultTimestamp;
      }

      next();
    });

    var genUpdates = function() {
      var now = new Date();
      var updates = { $set: {}, $setOnInsert: {} };
      updates.$set[updatedAt] = now;
      updates.$setOnInsert[createdAt] = now;

      return updates;
    };

    this.methods.initializeTimestamps = function() {
      if (!this[createdAt]) {
        this[createdAt] = new Date();
      }
      if (!this[updatedAt]) {
        this[updatedAt] = new Date();
      }
      return this;
    };

    this.pre('findOneAndUpdate', function(next) {
      this.findOneAndUpdate({}, genUpdates());
      applyTimestampsToChildren(this);
      next();
    });

    this.pre('update', function(next) {
      this.update({}, genUpdates());
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
        if (update.$push[key] &&
            schema.path(key).$isMongooseDocumentArray &&
            schema.path(key).schema.options.timestamps) {
          timestamps = schema.path(key).schema.options.timestamps;
          createdAt = timestamps.createdAt || 'createdAt';
          updatedAt = timestamps.updatedAt || 'updatedAt';
          update.$push[key][updatedAt] = now;
          update.$push[key][createdAt] = now;
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
 *     shema.post('find', function(docs) {
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
  var seenPrefix = {};

  var collectIndexes = function(schema, prefix) {
    if (seenPrefix[prefix]) {
      return;
    }
    seenPrefix[prefix] = true;

    prefix = prefix || '';
    var key, path, index, field, isObject, options, type;
    var keys = Object.keys(schema.paths);

    for (var i = 0; i < keys.length; ++i) {
      key = keys[i];
      path = schema.paths[key];

      if ((path instanceof MongooseTypes.DocumentArray) || path.$isSingleNested) {
        collectIndexes(path.schema, key + '.');
      } else {
        index = path._index;

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
      if (name in obj) {
        if (!this.$$populatedVirtuals) {
          this.$$populatedVirtuals = {};
        }

        if (options.justOne) {
          this.$$populatedVirtuals[name] = Array.isArray(obj[name]) ?
            obj[name][0] :
            obj[name];
        } else {
          this.$$populatedVirtuals[name] = Array.isArray(obj[name]) ?
            obj[name] :
            obj[name] == null ? [] : [obj[name]];
        }

        delete obj[name];
      }
      next();
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
      set(function(v) {
        if (!this.$$populatedVirtuals) {
          this.$$populatedVirtuals = {};
        }
        this.$$populatedVirtuals[name] = v;
      });
  }

  var virtuals = this.virtuals;
  var parts = name.split('.');
  virtuals[name] = parts.reduce(function(mem, part, i) {
    mem[part] || (mem[part] = (i === parts.length - 1)
        ? new VirtualType(options, name)
        : {});
    return mem[part];
  }, this.tree);
  return virtuals[name];
};

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
            if (parts[p] === '$') {
              // comments.$.comments.$.title
              return search(parts.slice(p + 1), foundschema.schema);
            }
            // this is the last path of the selector
            return search(parts.slice(p), foundschema.schema);
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

}).call(this,require("buffer").Buffer)
},{"./drivers":11,"./schema/index":33,"./schematype":41,"./utils":51,"./virtualtype":52,"async/each":54,"buffer":84,"events":87,"kareem":91}],27:[function(require,module,exports){
/*!
 * Module dependencies.
 */

var SchemaType = require('../schematype');
var CastError = SchemaType.CastError;
var Types = {
  Boolean: require('./boolean'),
  Date: require('./date'),
  Number: require('./number'),
  String: require('./string'),
  ObjectId: require('./objectid'),
  Buffer: require('./buffer')
};
var MongooseArray = require('../types').Array;
var EmbeddedDoc = require('../types').Embedded;
var Mixed = require('./mixed');
var cast = require('../cast');
var util = require('util');
var utils = require('../utils');
var castToNumber = require('./operators/helpers').castToNumber;
var geospatial = require('./operators/geospatial');

/**
 * Array SchemaType constructor
 *
 * @param {String} key
 * @param {SchemaType} cast
 * @param {Object} options
 * @inherits SchemaType
 * @api public
 */

function SchemaArray(key, cast, options, schemaOptions) {
  var typeKey = 'type';
  if (schemaOptions && schemaOptions.typeKey) {
    typeKey = schemaOptions.typeKey;
  }

  if (cast) {
    var castOptions = {};

    if (utils.getFunctionName(cast.constructor) === 'Object') {
      if (cast[typeKey]) {
        // support { type: Woot }
        castOptions = utils.clone(cast); // do not alter user arguments
        delete castOptions[typeKey];
        cast = cast[typeKey];
      } else {
        cast = Mixed;
      }
    }

    // support { type: 'String' }
    var name = typeof cast === 'string'
        ? cast
        : utils.getFunctionName(cast);

    var caster = name in Types
        ? Types[name]
        : cast;

    this.casterConstructor = caster;
    if (typeof caster === 'function') {
      this.caster = new caster(null, castOptions);
    } else {
      this.caster = caster;
    }

    if (!(this.caster instanceof EmbeddedDoc)) {
      this.caster.path = key;
    }
  }

  SchemaType.call(this, key, options, 'Array');

  var defaultArr;
  var fn;

  if (this.defaultValue) {
    defaultArr = this.defaultValue;
    fn = typeof defaultArr === 'function';
  }

  if (!('defaultValue' in this) || this.defaultValue !== void 0) {
    this.default(function() {
      var arr = fn ? defaultArr() : defaultArr || [];
      // Leave it up to `cast()` to convert the array
      return arr;
    });
  }
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
SchemaArray.schemaName = 'Array';

/*!
 * Inherits from SchemaType.
 */
SchemaArray.prototype = Object.create(SchemaType.prototype);
SchemaArray.prototype.constructor = SchemaArray;

/**
 * Check if the given value satisfies a required validator. The given value
 * must be not null nor undefined, and have a non-zero length.
 *
 * @param {Any} value
 * @return {Boolean}
 * @api public
 */

SchemaArray.prototype.checkRequired = function(value) {
  return !!(value && value.length);
};

/**
 * Overrides the getters application for the population special-case
 *
 * @param {Object} value
 * @param {Object} scope
 * @api private
 */

SchemaArray.prototype.applyGetters = function(value, scope) {
  if (this.caster.options && this.caster.options.ref) {
    // means the object id was populated
    return value;
  }

  return SchemaType.prototype.applyGetters.call(this, value, scope);
};

/**
 * Casts values for set().
 *
 * @param {Object} value
 * @param {Document} doc document that triggers the casting
 * @param {Boolean} init whether this is an initialization cast
 * @api private
 */

SchemaArray.prototype.cast = function(value, doc, init) {
  if (Array.isArray(value)) {
    if (!value.length && doc) {
      var indexes = doc.schema.indexedPaths();

      for (var i = 0, l = indexes.length; i < l; ++i) {
        var pathIndex = indexes[i][0][this.path];
        if (pathIndex === '2dsphere' || pathIndex === '2d') {
          return;
        }
      }
    }

    if (!(value && value.isMongooseArray)) {
      value = new MongooseArray(value, this.path, doc);
    } else if (value && value.isMongooseArray) {
      // We need to create a new array, otherwise change tracking will
      // update the old doc (gh-4449)
      value = new MongooseArray(value, this.path, doc);
    }

    if (this.caster) {
      try {
        for (i = 0, l = value.length; i < l; i++) {
          value[i] = this.caster.cast(value[i], doc, init);
        }
      } catch (e) {
        // rethrow
        throw new CastError('[' + e.kind + ']', util.inspect(value), this.path, e);
      }
    }

    return value;
  }
  // gh-2442: if we're loading this from the db and its not an array, mark
  // the whole array as modified.
  if (!!doc && !!init) {
    doc.markModified(this.path);
  }
  return this.cast([value], doc, init);
};

/**
 * Casts values for queries.
 *
 * @param {String} $conditional
 * @param {any} [value]
 * @api private
 */

SchemaArray.prototype.castForQuery = function($conditional, value) {
  var handler,
      val;

  if (arguments.length === 2) {
    handler = this.$conditionalHandlers[$conditional];

    if (!handler) {
      throw new Error('Can\'t use ' + $conditional + ' with Array.');
    }

    val = handler.call(this, value);
  } else {
    val = $conditional;
    var proto = this.casterConstructor.prototype;
    var method = proto && (proto.castForQuery || proto.cast);
    var caster = this.caster;

    if (Array.isArray(val)) {
      val = val.map(function(v) {
        if (utils.isObject(v) && v.$elemMatch) {
          return v;
        }
        if (method) {
          v = method.call(caster, v);
        }
        return v;
      });
    } else if (method) {
      val = method.call(caster, val);
    }
  }

  return val;
};

function cast$all(val) {
  if (!Array.isArray(val)) {
    val = [val];
  }

  val = val.map(function(v) {
    if (utils.isObject(v)) {
      var o = {};
      o[this.path] = v;
      return cast(this.casterConstructor.schema, o)[this.path];
    }
    return v;
  }, this);

  return this.castForQuery(val);
}

function cast$elemMatch(val) {
  var keys = Object.keys(val);
  var numKeys = keys.length;
  var key;
  var value;
  for (var i = 0; i < numKeys; ++i) {
    key = keys[i];
    value = val[key];
    if (key.indexOf('$') === 0 && value) {
      val[key] = this.castForQuery(key, value);
    }
  }

  return cast(this.casterConstructor.schema, val);
}

var handle = SchemaArray.prototype.$conditionalHandlers = {};

handle.$all = cast$all;
handle.$options = String;
handle.$elemMatch = cast$elemMatch;
handle.$geoIntersects = geospatial.cast$geoIntersects;
handle.$or = handle.$and = function(val) {
  if (!Array.isArray(val)) {
    throw new TypeError('conditional $or/$and require array');
  }

  var ret = [];
  for (var i = 0; i < val.length; ++i) {
    ret.push(cast(this.casterConstructor.schema, val[i]));
  }

  return ret;
};

handle.$near =
handle.$nearSphere = geospatial.cast$near;

handle.$within =
handle.$geoWithin = geospatial.cast$within;

handle.$size =
handle.$minDistance =
handle.$maxDistance = castToNumber;

handle.$eq =
handle.$gt =
handle.$gte =
handle.$in =
handle.$lt =
handle.$lte =
handle.$ne =
handle.$nin =
handle.$regex = SchemaArray.prototype.castForQuery;

/*!
 * Module exports.
 */

module.exports = SchemaArray;

},{"../cast":4,"../schematype":41,"../types":48,"../utils":51,"./boolean":28,"./buffer":29,"./date":30,"./mixed":34,"./number":35,"./objectid":36,"./operators/geospatial":38,"./operators/helpers":39,"./string":40,"util":138}],28:[function(require,module,exports){
/*!
 * Module dependencies.
 */

var utils = require('../utils');

var SchemaType = require('../schematype');

/**
 * Boolean SchemaType constructor.
 *
 * @param {String} path
 * @param {Object} options
 * @inherits SchemaType
 * @api public
 */

function SchemaBoolean(path, options) {
  SchemaType.call(this, path, options, 'Boolean');
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
SchemaBoolean.schemaName = 'Boolean';

/*!
 * Inherits from SchemaType.
 */
SchemaBoolean.prototype = Object.create(SchemaType.prototype);
SchemaBoolean.prototype.constructor = SchemaBoolean;

/**
 * Check if the given value satisfies a required validator. For a boolean
 * to satisfy a required validator, it must be strictly equal to true or to
 * false.
 *
 * @param {Any} value
 * @return {Boolean}
 * @api public
 */

SchemaBoolean.prototype.checkRequired = function(value) {
  return value === true || value === false;
};

/**
 * Casts to boolean
 *
 * @param {Object} value
 * @api private
 */

SchemaBoolean.prototype.cast = function(value) {
  if (value === null) {
    return value;
  }
  if (value === '0') {
    return false;
  }
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return !!value;
};

SchemaBoolean.$conditionalHandlers =
    utils.options(SchemaType.prototype.$conditionalHandlers, {});

/**
 * Casts contents for queries.
 *
 * @param {String} $conditional
 * @param {any} val
 * @api private
 */

SchemaBoolean.prototype.castForQuery = function($conditional, val) {
  var handler;
  if (arguments.length === 2) {
    handler = SchemaBoolean.$conditionalHandlers[$conditional];

    if (handler) {
      return handler.call(this, val);
    }

    return this.cast(val);
  }

  return this.cast($conditional);
};

/*!
 * Module exports.
 */

module.exports = SchemaBoolean;

},{"../schematype":41,"../utils":51}],29:[function(require,module,exports){
(function (Buffer){
/*!
 * Module dependencies.
 */

var handleBitwiseOperator = require('./operators/bitwise');
var utils = require('../utils');

var MongooseBuffer = require('../types').Buffer;
var SchemaType = require('../schematype');

var Binary = MongooseBuffer.Binary;
var CastError = SchemaType.CastError;
var Document;

/**
 * Buffer SchemaType constructor
 *
 * @param {String} key
 * @param {Object} options
 * @inherits SchemaType
 * @api public
 */

function SchemaBuffer(key, options) {
  SchemaType.call(this, key, options, 'Buffer');
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
SchemaBuffer.schemaName = 'Buffer';

/*!
 * Inherits from SchemaType.
 */
SchemaBuffer.prototype = Object.create(SchemaType.prototype);
SchemaBuffer.prototype.constructor = SchemaBuffer;

/**
 * Check if the given value satisfies a required validator. To satisfy a
 * required validator, a buffer must not be null or undefined and have
 * non-zero length.
 *
 * @param {Any} value
 * @param {Document} doc
 * @return {Boolean}
 * @api public
 */

SchemaBuffer.prototype.checkRequired = function(value, doc) {
  if (SchemaType._isRef(this, value, doc, true)) {
    return !!value;
  }
  return !!(value && value.length);
};

/**
 * Casts contents
 *
 * @param {Object} value
 * @param {Document} doc document that triggers the casting
 * @param {Boolean} init
 * @api private
 */

SchemaBuffer.prototype.cast = function(value, doc, init) {
  var ret;
  if (SchemaType._isRef(this, value, doc, init)) {
    // wait! we may need to cast this to a document

    if (value === null || value === undefined) {
      return value;
    }

    // lazy load
    Document || (Document = require('./../document'));

    if (value instanceof Document) {
      value.$__.wasPopulated = true;
      return value;
    }

    // setting a populated path
    if (Buffer.isBuffer(value)) {
      return value;
    } else if (!utils.isObject(value)) {
      throw new CastError('buffer', value, this.path);
    }

    // Handle the case where user directly sets a populated
    // path to a plain object; cast to the Model used in
    // the population query.
    var path = doc.$__fullPath(this.path);
    var owner = doc.ownerDocument ? doc.ownerDocument() : doc;
    var pop = owner.populated(path, true);
    ret = new pop.options.model(value);
    ret.$__.wasPopulated = true;
    return ret;
  }

  // documents
  if (value && value._id) {
    value = value._id;
  }

  if (value && value.isMongooseBuffer) {
    return value;
  }

  if (Buffer.isBuffer(value)) {
    if (!value || !value.isMongooseBuffer) {
      value = new MongooseBuffer(value, [this.path, doc]);
    }

    return value;
  } else if (value instanceof Binary) {
    ret = new MongooseBuffer(value.value(true), [this.path, doc]);
    if (typeof value.sub_type !== 'number') {
      throw new CastError('buffer', value, this.path);
    }
    ret._subtype = value.sub_type;
    return ret;
  }

  if (value === null) {
    return value;
  }

  var type = typeof value;
  if (type === 'string' || type === 'number' || Array.isArray(value)) {
    if (type === 'number') {
      value = [value];
    }
    ret = new MongooseBuffer(value, [this.path, doc]);
    return ret;
  }

  throw new CastError('buffer', value, this.path);
};

/*!
 * ignore
 */
function handleSingle(val) {
  return this.castForQuery(val);
}

SchemaBuffer.prototype.$conditionalHandlers =
    utils.options(SchemaType.prototype.$conditionalHandlers, {
      $bitsAllClear: handleBitwiseOperator,
      $bitsAnyClear: handleBitwiseOperator,
      $bitsAllSet: handleBitwiseOperator,
      $bitsAnySet: handleBitwiseOperator,
      $gt: handleSingle,
      $gte: handleSingle,
      $lt: handleSingle,
      $lte: handleSingle
    });

/**
 * Casts contents for queries.
 *
 * @param {String} $conditional
 * @param {any} [value]
 * @api private
 */

SchemaBuffer.prototype.castForQuery = function($conditional, val) {
  var handler;
  if (arguments.length === 2) {
    handler = this.$conditionalHandlers[$conditional];
    if (!handler) {
      throw new Error('Can\'t use ' + $conditional + ' with Buffer.');
    }
    return handler.call(this, val);
  }
  val = $conditional;
  return this.cast(val).toObject({ transform: false });
};

/*!
 * Module exports.
 */

module.exports = SchemaBuffer;

}).call(this,require("buffer").Buffer)
},{"../schematype":41,"../types":48,"../utils":51,"./../document":5,"./operators/bitwise":37,"buffer":84}],30:[function(require,module,exports){
/*!
 * Module requirements.
 */

var MongooseError = require('../error');
var utils = require('../utils');

var SchemaType = require('../schematype');

var CastError = SchemaType.CastError;

/**
 * Date SchemaType constructor.
 *
 * @param {String} key
 * @param {Object} options
 * @inherits SchemaType
 * @api public
 */

function SchemaDate(key, options) {
  SchemaType.call(this, key, options, 'Date');
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
SchemaDate.schemaName = 'Date';

/*!
 * Inherits from SchemaType.
 */
SchemaDate.prototype = Object.create(SchemaType.prototype);
SchemaDate.prototype.constructor = SchemaDate;

/**
 * Declares a TTL index (rounded to the nearest second) for _Date_ types only.
 *
 * This sets the `expireAfterSeconds` index option available in MongoDB >= 2.1.2.
 * This index type is only compatible with Date types.
 *
 * ####Example:
 *
 *     // expire in 24 hours
 *     new Schema({ createdAt: { type: Date, expires: 60*60*24 }});
 *
 * `expires` utilizes the `ms` module from [guille](https://github.com/guille/) allowing us to use a friendlier syntax:
 *
 * ####Example:
 *
 *     // expire in 24 hours
 *     new Schema({ createdAt: { type: Date, expires: '24h' }});
 *
 *     // expire in 1.5 hours
 *     new Schema({ createdAt: { type: Date, expires: '1.5h' }});
 *
 *     // expire in 7 days
 *     var schema = new Schema({ createdAt: Date });
 *     schema.path('createdAt').expires('7d');
 *
 * @param {Number|String} when
 * @added 3.0.0
 * @return {SchemaType} this
 * @api public
 */

SchemaDate.prototype.expires = function(when) {
  if (!this._index || this._index.constructor.name !== 'Object') {
    this._index = {};
  }

  this._index.expires = when;
  utils.expires(this._index);
  return this;
};

/**
 * Check if the given value satisfies a required validator. To satisfy
 * a required validator, the given value must be an instance of `Date`.
 *
 * @param {Any} value
 * @param {Document} doc
 * @return {Boolean}
 * @api public
 */

SchemaDate.prototype.checkRequired = function(value) {
  return value instanceof Date;
};

/**
 * Sets a minimum date validator.
 *
 * ####Example:
 *
 *     var s = new Schema({ d: { type: Date, min: Date('1970-01-01') })
 *     var M = db.model('M', s)
 *     var m = new M({ d: Date('1969-12-31') })
 *     m.save(function (err) {
 *       console.error(err) // validator error
 *       m.d = Date('2014-12-08');
 *       m.save() // success
 *     })
 *
 *     // custom error messages
 *     // We can also use the special {MIN} token which will be replaced with the invalid value
 *     var min = [Date('1970-01-01'), 'The value of path `{PATH}` ({VALUE}) is beneath the limit ({MIN}).'];
 *     var schema = new Schema({ d: { type: Date, min: min })
 *     var M = mongoose.model('M', schema);
 *     var s= new M({ d: Date('1969-12-31') });
 *     s.validate(function (err) {
 *       console.log(String(err)) // ValidationError: The value of path `d` (1969-12-31) is before the limit (1970-01-01).
 *     })
 *
 * @param {Date} value minimum date
 * @param {String} [message] optional custom error message
 * @return {SchemaType} this
 * @see Customized Error Messages #error_messages_MongooseError-messages
 * @api public
 */

SchemaDate.prototype.min = function(value, message) {
  if (this.minValidator) {
    this.validators = this.validators.filter(function(v) {
      return v.validator !== this.minValidator;
    }, this);
  }

  if (value) {
    var msg = message || MongooseError.messages.Date.min;
    msg = msg.replace(/{MIN}/, (value === Date.now ? 'Date.now()' : this.cast(value).toString()));
    var _this = this;
    this.validators.push({
      validator: this.minValidator = function(val) {
        var min = (value === Date.now ? value() : _this.cast(value));
        return val === null || val.valueOf() >= min.valueOf();
      },
      message: msg,
      type: 'min',
      min: value
    });
  }

  return this;
};

/**
 * Sets a maximum date validator.
 *
 * ####Example:
 *
 *     var s = new Schema({ d: { type: Date, max: Date('2014-01-01') })
 *     var M = db.model('M', s)
 *     var m = new M({ d: Date('2014-12-08') })
 *     m.save(function (err) {
 *       console.error(err) // validator error
 *       m.d = Date('2013-12-31');
 *       m.save() // success
 *     })
 *
 *     // custom error messages
 *     // We can also use the special {MAX} token which will be replaced with the invalid value
 *     var max = [Date('2014-01-01'), 'The value of path `{PATH}` ({VALUE}) exceeds the limit ({MAX}).'];
 *     var schema = new Schema({ d: { type: Date, max: max })
 *     var M = mongoose.model('M', schema);
 *     var s= new M({ d: Date('2014-12-08') });
 *     s.validate(function (err) {
 *       console.log(String(err)) // ValidationError: The value of path `d` (2014-12-08) exceeds the limit (2014-01-01).
 *     })
 *
 * @param {Date} maximum date
 * @param {String} [message] optional custom error message
 * @return {SchemaType} this
 * @see Customized Error Messages #error_messages_MongooseError-messages
 * @api public
 */

SchemaDate.prototype.max = function(value, message) {
  if (this.maxValidator) {
    this.validators = this.validators.filter(function(v) {
      return v.validator !== this.maxValidator;
    }, this);
  }

  if (value) {
    var msg = message || MongooseError.messages.Date.max;
    msg = msg.replace(/{MAX}/, (value === Date.now ? 'Date.now()' : this.cast(value).toString()));
    var _this = this;
    this.validators.push({
      validator: this.maxValidator = function(val) {
        var max = (value === Date.now ? value() : _this.cast(value));
        return val === null || val.valueOf() <= max.valueOf();
      },
      message: msg,
      type: 'max',
      max: value
    });
  }

  return this;
};

/**
 * Casts to date
 *
 * @param {Object} value to cast
 * @api private
 */

SchemaDate.prototype.cast = function(value) {
  // If null or undefined
  if (value === null || value === void 0 || value === '') {
    return null;
  }

  if (value instanceof Date) {
    if (isNaN(value.valueOf())) {
      throw new CastError('date', value, this.path);
    }

    return value;
  }

  var date;

  if (typeof value === 'boolean') {
    throw new CastError('date', value, this.path);
  }

  if (value instanceof Number || typeof value === 'number'
      || String(value) == Number(value)) {
    // support for timestamps
    date = new Date(Number(value));
  } else if (value.valueOf) {
    // support for moment.js
    date = new Date(value.valueOf());
  }

  if (!isNaN(date.valueOf())) {
    return date;
  }

  throw new CastError('date', value, this.path);
};

/*!
 * Date Query casting.
 *
 * @api private
 */

function handleSingle(val) {
  return this.cast(val);
}

SchemaDate.prototype.$conditionalHandlers =
    utils.options(SchemaType.prototype.$conditionalHandlers, {
      $gt: handleSingle,
      $gte: handleSingle,
      $lt: handleSingle,
      $lte: handleSingle
    });


/**
 * Casts contents for queries.
 *
 * @param {String} $conditional
 * @param {any} [value]
 * @api private
 */

SchemaDate.prototype.castForQuery = function($conditional, val) {
  var handler;

  if (arguments.length !== 2) {
    return this.cast($conditional);
  }

  handler = this.$conditionalHandlers[$conditional];

  if (!handler) {
    throw new Error('Can\'t use ' + $conditional + ' with Date.');
  }

  return handler.call(this, val);
};

/*!
 * Module exports.
 */

module.exports = SchemaDate;

},{"../error":12,"../schematype":41,"../utils":51}],31:[function(require,module,exports){
/* eslint no-empty: 1 */

/*!
 * Module dependencies.
 */

var ArrayType = require('./array');
var CastError = require('../error/cast');
var MongooseDocumentArray = require('../types/documentarray');
var SchemaType = require('../schematype');
var Subdocument = require('../types/embedded');
var util = require('util');

/**
 * SubdocsArray SchemaType constructor
 *
 * @param {String} key
 * @param {Schema} schema
 * @param {Object} options
 * @inherits SchemaArray
 * @api public
 */

function DocumentArray(key, schema, options) {
  // compile an embedded document for this schema
  function EmbeddedDocument() {
    Subdocument.apply(this, arguments);
  }

  EmbeddedDocument.prototype = Object.create(Subdocument.prototype);
  EmbeddedDocument.prototype.$__setSchema(schema);
  EmbeddedDocument.schema = schema;

  // apply methods
  for (var i in schema.methods) {
    EmbeddedDocument.prototype[i] = schema.methods[i];
  }

  // apply statics
  for (i in schema.statics) {
    EmbeddedDocument[i] = schema.statics[i];
  }

  EmbeddedDocument.options = options;

  ArrayType.call(this, key, EmbeddedDocument, options);

  this.schema = schema;
  this.$isMongooseDocumentArray = true;
  var fn = this.defaultValue;

  if (!('defaultValue' in this) || fn !== void 0) {
    this.default(function() {
      var arr = fn.call(this);
      if (!Array.isArray(arr)) {
        arr = [arr];
      }
      // Leave it up to `cast()` to convert this to a documentarray
      return arr;
    });
  }
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
DocumentArray.schemaName = 'DocumentArray';

/*!
 * Inherits from ArrayType.
 */
DocumentArray.prototype = Object.create(ArrayType.prototype);
DocumentArray.prototype.constructor = DocumentArray;

/**
 * Performs local validations first, then validations on each embedded doc
 *
 * @api private
 */

DocumentArray.prototype.doValidate = function(array, fn, scope, options) {
  var _this = this;
  SchemaType.prototype.doValidate.call(this, array, function(err) {
    if (err) {
      return fn(err);
    }

    var count = array && array.length;
    var error;

    if (!count) {
      return fn();
    }
    if (options && options.updateValidator) {
      return fn();
    }

    // handle sparse arrays, do not use array.forEach which does not
    // iterate over sparse elements yet reports array.length including
    // them :(

    function callback(err) {
      if (err) {
        error = err;
      }
      --count || fn(error);
    }

    for (var i = 0, len = count; i < len; ++i) {
      // sidestep sparse entries
      var doc = array[i];
      if (!doc) {
        --count || fn(error);
        continue;
      }

      // If you set the array index directly, the doc might not yet be
      // a full fledged mongoose subdoc, so make it into one.
      if (!(doc instanceof Subdocument)) {
        doc = array[i] = new _this.casterConstructor(doc, array, undefined,
            undefined, i);
      }

      // HACK: use $__original_validate to avoid promises so bluebird doesn't
      // complain
      if (doc.$__original_validate) {
        doc.$__original_validate({__noPromise: true}, callback);
      } else {
        doc.validate({__noPromise: true}, callback);
      }
    }
  }, scope);
};

/**
 * Performs local validations first, then validations on each embedded doc.
 *
 * ####Note:
 *
 * This method ignores the asynchronous validators.
 *
 * @return {MongooseError|undefined}
 * @api private
 */

DocumentArray.prototype.doValidateSync = function(array, scope) {
  var schemaTypeError = SchemaType.prototype.doValidateSync.call(this, array, scope);
  if (schemaTypeError) {
    return schemaTypeError;
  }

  var count = array && array.length,
      resultError = null;

  if (!count) {
    return;
  }

  // handle sparse arrays, do not use array.forEach which does not
  // iterate over sparse elements yet reports array.length including
  // them :(

  for (var i = 0, len = count; i < len; ++i) {
    // only first error
    if (resultError) {
      break;
    }
    // sidestep sparse entries
    var doc = array[i];
    if (!doc) {
      continue;
    }

    var subdocValidateError = doc.validateSync();

    if (subdocValidateError) {
      resultError = subdocValidateError;
    }
  }

  return resultError;
};

/**
 * Casts contents
 *
 * @param {Object} value
 * @param {Document} document that triggers the casting
 * @api private
 */

DocumentArray.prototype.cast = function(value, doc, init, prev, options) {
  var selected,
      subdoc,
      i;

  if (!Array.isArray(value)) {
    // gh-2442 mark whole array as modified if we're initializing a doc from
    // the db and the path isn't an array in the document
    if (!!doc && init) {
      doc.markModified(this.path);
    }
    return this.cast([value], doc, init, prev);
  }

  if (!(value && value.isMongooseDocumentArray) &&
      (!options || !options.skipDocumentArrayCast)) {
    value = new MongooseDocumentArray(value, this.path, doc);
    if (prev && prev._handlers) {
      for (var key in prev._handlers) {
        doc.removeListener(key, prev._handlers[key]);
      }
    }
  } else if (value && value.isMongooseDocumentArray) {
    // We need to create a new array, otherwise change tracking will
    // update the old doc (gh-4449)
    value = new MongooseDocumentArray(value, this.path, doc);
  }

  i = value.length;

  while (i--) {
    if (!value[i]) {
      continue;
    }
    // Check if the document has a different schema (re gh-3701)
    if ((value[i] instanceof Subdocument) &&
        value[i].schema !== this.casterConstructor.schema) {
      value[i] = value[i].toObject({transform: false});
    }
    if (!(value[i] instanceof Subdocument) && value[i]) {
      if (init) {
        selected || (selected = scopePaths(this, doc.$__.selected, init));
        subdoc = new this.casterConstructor(null, value, true, selected, i);
        value[i] = subdoc.init(value[i]);
      } else {
        try {
          subdoc = prev.id(value[i]._id);
        } catch (e) {
        }

        if (prev && subdoc) {
          // handle resetting doc with existing id but differing data
          // doc.array = [{ doc: 'val' }]
          subdoc.set(value[i]);
          // if set() is hooked it will have no return value
          // see gh-746
          value[i] = subdoc;
        } else {
          try {
            subdoc = new this.casterConstructor(value[i], value, undefined,
                undefined, i);
            // if set() is hooked it will have no return value
            // see gh-746
            value[i] = subdoc;
          } catch (error) {
            var valueInErrorMessage = util.inspect(value[i]);
            throw new CastError('embedded', valueInErrorMessage,
              value._path, error);
          }
        }
      }
    }
  }

  return value;
};

/*!
 * Scopes paths selected in a query to this array.
 * Necessary for proper default application of subdocument values.
 *
 * @param {DocumentArray} array - the array to scope `fields` paths
 * @param {Object|undefined} fields - the root fields selected in the query
 * @param {Boolean|undefined} init - if we are being created part of a query result
 */

function scopePaths(array, fields, init) {
  if (!(init && fields)) {
    return undefined;
  }

  var path = array.path + '.',
      keys = Object.keys(fields),
      i = keys.length,
      selected = {},
      hasKeys,
      key;

  while (i--) {
    key = keys[i];
    if (key.indexOf(path) === 0) {
      hasKeys || (hasKeys = true);
      selected[key.substring(path.length)] = fields[key];
    }
  }

  return hasKeys && selected || undefined;
}

/*!
 * Module exports.
 */

module.exports = DocumentArray;

},{"../error/cast":13,"../schematype":41,"../types/documentarray":46,"../types/embedded":47,"./array":27,"util":138}],32:[function(require,module,exports){
'use strict';

/*!
 * Module dependencies.
 */

var SchemaType = require('../schematype');
var Subdocument = require('../types/subdocument');
var castToNumber = require('./operators/helpers').castToNumber;
var geospatial = require('./operators/geospatial');

module.exports = Embedded;

/**
 * Sub-schema schematype constructor
 *
 * @param {Schema} schema
 * @param {String} key
 * @param {Object} options
 * @inherits SchemaType
 * @api public
 */

function Embedded(schema, path, options) {
  var _embedded = function(value, path, parent) {
    var _this = this;
    Subdocument.apply(this, arguments);
    this.$parent = parent;
    if (parent) {
      parent.on('save', function() {
        _this.emit('save', _this);
      });

      parent.on('isNew', function(val) {
        _this.isNew = val;
        _this.emit('isNew', val);
      });
    }
  };
  _embedded.prototype = Object.create(Subdocument.prototype);
  _embedded.prototype.$__setSchema(schema);
  _embedded.schema = schema;
  _embedded.$isSingleNested = true;
  _embedded.prototype.$basePath = path;
  _embedded.prototype.toBSON = function() {
    return this.toObject({ transform: false });
  };

  // apply methods
  for (var i in schema.methods) {
    _embedded.prototype[i] = schema.methods[i];
  }

  // apply statics
  for (i in schema.statics) {
    _embedded[i] = schema.statics[i];
  }

  this.caster = _embedded;
  this.schema = schema;
  this.$isSingleNested = true;
  SchemaType.call(this, path, options, 'Embedded');
}

Embedded.prototype = Object.create(SchemaType.prototype);

/**
 * Special case for when users use a common location schema to represent
 * locations for use with $geoWithin.
 * https://docs.mongodb.org/manual/reference/operator/query/geoWithin/
 *
 * @param {Object} val
 * @api private
 */

Embedded.prototype.$conditionalHandlers.$geoWithin = function(val) {
  return { $geometry: this.castForQuery(val.$geometry) };
};

/*!
 * ignore
 */

Embedded.prototype.$conditionalHandlers.$near =
Embedded.prototype.$conditionalHandlers.$nearSphere = geospatial.cast$near;

Embedded.prototype.$conditionalHandlers.$within =
Embedded.prototype.$conditionalHandlers.$geoWithin = geospatial.cast$within;

Embedded.prototype.$conditionalHandlers.$geoIntersects =
  geospatial.cast$geoIntersects;

Embedded.prototype.$conditionalHandlers.$minDistance = castToNumber;
Embedded.prototype.$conditionalHandlers.$maxDistance = castToNumber;

/**
 * Casts contents
 *
 * @param {Object} value
 * @api private
 */

Embedded.prototype.cast = function(val, doc, init) {
  if (val && val.$isSingleNested) {
    return val;
  }
  var subdoc = new this.caster(void 0, doc ? doc.$__.selected : void 0, doc);
  if (init) {
    subdoc.init(val);
  } else {
    subdoc.set(val, undefined, true);
  }
  return subdoc;
};

/**
 * Casts contents for query
 *
 * @param {string} [$conditional] optional query operator (like `$eq` or `$in`)
 * @param {any} value
 * @api private
 */

Embedded.prototype.castForQuery = function($conditional, val) {
  var handler;
  if (arguments.length === 2) {
    handler = this.$conditionalHandlers[$conditional];
    if (!handler) {
      throw new Error('Can\'t use ' + $conditional);
    }
    return handler.call(this, val);
  }
  val = $conditional;
  if (val == null) {
    return val;
  }

  return new this.caster(val);
};

/**
 * Async validation on this single nested doc.
 *
 * @api private
 */

Embedded.prototype.doValidate = function(value, fn) {
  SchemaType.prototype.doValidate.call(this, value, function(error) {
    if (error) {
      return fn(error);
    }
    if (!value) {
      return fn(null);
    }
    value.validate(fn, {__noPromise: true});
  });
};

/**
 * Synchronously validate this single nested doc
 *
 * @api private
 */

Embedded.prototype.doValidateSync = function(value) {
  var schemaTypeError = SchemaType.prototype.doValidateSync.call(this, value);
  if (schemaTypeError) {
    return schemaTypeError;
  }
  if (!value) {
    return;
  }
  return value.validateSync();
};

},{"../schematype":41,"../types/subdocument":50,"./operators/geospatial":38,"./operators/helpers":39}],33:[function(require,module,exports){

/*!
 * Module exports.
 */

exports.String = require('./string');

exports.Number = require('./number');

exports.Boolean = require('./boolean');

exports.DocumentArray = require('./documentarray');

exports.Embedded = require('./embedded');

exports.Array = require('./array');

exports.Buffer = require('./buffer');

exports.Date = require('./date');

exports.ObjectId = require('./objectid');

exports.Mixed = require('./mixed');

// alias

exports.Oid = exports.ObjectId;
exports.Object = exports.Mixed;
exports.Bool = exports.Boolean;

},{"./array":27,"./boolean":28,"./buffer":29,"./date":30,"./documentarray":31,"./embedded":32,"./mixed":34,"./number":35,"./objectid":36,"./string":40}],34:[function(require,module,exports){
/*!
 * Module dependencies.
 */

var SchemaType = require('../schematype');
var utils = require('../utils');

/**
 * Mixed SchemaType constructor.
 *
 * @param {String} path
 * @param {Object} options
 * @inherits SchemaType
 * @api public
 */

function Mixed(path, options) {
  if (options && options.default) {
    var def = options.default;
    if (Array.isArray(def) && def.length === 0) {
      // make sure empty array defaults are handled
      options.default = Array;
    } else if (!options.shared && utils.isObject(def) && Object.keys(def).length === 0) {
      // prevent odd "shared" objects between documents
      options.default = function() {
        return {};
      };
    }
  }

  SchemaType.call(this, path, options, 'Mixed');
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
Mixed.schemaName = 'Mixed';

/*!
 * Inherits from SchemaType.
 */
Mixed.prototype = Object.create(SchemaType.prototype);
Mixed.prototype.constructor = Mixed;

/**
 * Casts `val` for Mixed.
 *
 * _this is a no-op_
 *
 * @param {Object} value to cast
 * @api private
 */

Mixed.prototype.cast = function(val) {
  return val;
};

/**
 * Casts contents for queries.
 *
 * @param {String} $cond
 * @param {any} [val]
 * @api private
 */

Mixed.prototype.castForQuery = function($cond, val) {
  if (arguments.length === 2) {
    return val;
  }
  return $cond;
};

/*!
 * Module exports.
 */

module.exports = Mixed;

},{"../schematype":41,"../utils":51}],35:[function(require,module,exports){
(function (Buffer){
/*!
 * Module requirements.
 */

var SchemaType = require('../schematype');
var CastError = SchemaType.CastError;
var handleBitwiseOperator = require('./operators/bitwise');
var MongooseError = require('../error');
var utils = require('../utils');
var Document;

/**
 * Number SchemaType constructor.
 *
 * @param {String} key
 * @param {Object} options
 * @inherits SchemaType
 * @api public
 */

function SchemaNumber(key, options) {
  SchemaType.call(this, key, options, 'Number');
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
SchemaNumber.schemaName = 'Number';

/*!
 * Inherits from SchemaType.
 */
SchemaNumber.prototype = Object.create(SchemaType.prototype);
SchemaNumber.prototype.constructor = SchemaNumber;

/**
 * Check if the given value satisfies a required validator.
 *
 * @param {Any} value
 * @param {Document} doc
 * @return {Boolean}
 * @api public
 */

SchemaNumber.prototype.checkRequired = function checkRequired(value, doc) {
  if (SchemaType._isRef(this, value, doc, true)) {
    return !!value;
  }
  return typeof value === 'number' || value instanceof Number;
};

/**
 * Sets a minimum number validator.
 *
 * ####Example:
 *
 *     var s = new Schema({ n: { type: Number, min: 10 })
 *     var M = db.model('M', s)
 *     var m = new M({ n: 9 })
 *     m.save(function (err) {
 *       console.error(err) // validator error
 *       m.n = 10;
 *       m.save() // success
 *     })
 *
 *     // custom error messages
 *     // We can also use the special {MIN} token which will be replaced with the invalid value
 *     var min = [10, 'The value of path `{PATH}` ({VALUE}) is beneath the limit ({MIN}).'];
 *     var schema = new Schema({ n: { type: Number, min: min })
 *     var M = mongoose.model('Measurement', schema);
 *     var s= new M({ n: 4 });
 *     s.validate(function (err) {
 *       console.log(String(err)) // ValidationError: The value of path `n` (4) is beneath the limit (10).
 *     })
 *
 * @param {Number} value minimum number
 * @param {String} [message] optional custom error message
 * @return {SchemaType} this
 * @see Customized Error Messages #error_messages_MongooseError-messages
 * @api public
 */

SchemaNumber.prototype.min = function(value, message) {
  if (this.minValidator) {
    this.validators = this.validators.filter(function(v) {
      return v.validator !== this.minValidator;
    }, this);
  }

  if (value !== null && value !== undefined) {
    var msg = message || MongooseError.messages.Number.min;
    msg = msg.replace(/{MIN}/, value);
    this.validators.push({
      validator: this.minValidator = function(v) {
        return v == null || v >= value;
      },
      message: msg,
      type: 'min',
      min: value
    });
  }

  return this;
};

/**
 * Sets a maximum number validator.
 *
 * ####Example:
 *
 *     var s = new Schema({ n: { type: Number, max: 10 })
 *     var M = db.model('M', s)
 *     var m = new M({ n: 11 })
 *     m.save(function (err) {
 *       console.error(err) // validator error
 *       m.n = 10;
 *       m.save() // success
 *     })
 *
 *     // custom error messages
 *     // We can also use the special {MAX} token which will be replaced with the invalid value
 *     var max = [10, 'The value of path `{PATH}` ({VALUE}) exceeds the limit ({MAX}).'];
 *     var schema = new Schema({ n: { type: Number, max: max })
 *     var M = mongoose.model('Measurement', schema);
 *     var s= new M({ n: 4 });
 *     s.validate(function (err) {
 *       console.log(String(err)) // ValidationError: The value of path `n` (4) exceeds the limit (10).
 *     })
 *
 * @param {Number} maximum number
 * @param {String} [message] optional custom error message
 * @return {SchemaType} this
 * @see Customized Error Messages #error_messages_MongooseError-messages
 * @api public
 */

SchemaNumber.prototype.max = function(value, message) {
  if (this.maxValidator) {
    this.validators = this.validators.filter(function(v) {
      return v.validator !== this.maxValidator;
    }, this);
  }

  if (value !== null && value !== undefined) {
    var msg = message || MongooseError.messages.Number.max;
    msg = msg.replace(/{MAX}/, value);
    this.validators.push({
      validator: this.maxValidator = function(v) {
        return v == null || v <= value;
      },
      message: msg,
      type: 'max',
      max: value
    });
  }

  return this;
};

/**
 * Casts to number
 *
 * @param {Object} value value to cast
 * @param {Document} doc document that triggers the casting
 * @param {Boolean} init
 * @api private
 */

SchemaNumber.prototype.cast = function(value, doc, init) {
  if (SchemaType._isRef(this, value, doc, init)) {
    // wait! we may need to cast this to a document

    if (value === null || value === undefined) {
      return value;
    }

    // lazy load
    Document || (Document = require('./../document'));

    if (value instanceof Document) {
      value.$__.wasPopulated = true;
      return value;
    }

    // setting a populated path
    if (typeof value === 'number') {
      return value;
    } else if (Buffer.isBuffer(value) || !utils.isObject(value)) {
      throw new CastError('number', value, this.path);
    }

    // Handle the case where user directly sets a populated
    // path to a plain object; cast to the Model used in
    // the population query.
    var path = doc.$__fullPath(this.path);
    var owner = doc.ownerDocument ? doc.ownerDocument() : doc;
    var pop = owner.populated(path, true);
    var ret = new pop.options.model(value);
    ret.$__.wasPopulated = true;
    return ret;
  }

  var val = value && value._id
      ? value._id // documents
      : value;

  if (!isNaN(val)) {
    if (val === null) {
      return val;
    }
    if (val === '') {
      return null;
    }
    if (typeof val === 'string' || typeof val === 'boolean') {
      val = Number(val);
    }
    if (val instanceof Number) {
      return val;
    }
    if (typeof val === 'number') {
      return val;
    }
    if (val.toString && !Array.isArray(val) && val.toString() == Number(val)) {
      return new Number(val);
    }
  }

  throw new CastError('number', value, this.path);
};

/*!
 * ignore
 */

function handleSingle(val) {
  return this.cast(val);
}

function handleArray(val) {
  var _this = this;
  if (!Array.isArray(val)) {
    return [this.cast(val)];
  }
  return val.map(function(m) {
    return _this.cast(m);
  });
}

SchemaNumber.prototype.$conditionalHandlers =
    utils.options(SchemaType.prototype.$conditionalHandlers, {
      $bitsAllClear: handleBitwiseOperator,
      $bitsAnyClear: handleBitwiseOperator,
      $bitsAllSet: handleBitwiseOperator,
      $bitsAnySet: handleBitwiseOperator,
      $gt: handleSingle,
      $gte: handleSingle,
      $lt: handleSingle,
      $lte: handleSingle,
      $mod: handleArray
    });

/**
 * Casts contents for queries.
 *
 * @param {String} $conditional
 * @param {any} [value]
 * @api private
 */

SchemaNumber.prototype.castForQuery = function($conditional, val) {
  var handler;
  if (arguments.length === 2) {
    handler = this.$conditionalHandlers[$conditional];
    if (!handler) {
      throw new Error('Can\'t use ' + $conditional + ' with Number.');
    }
    return handler.call(this, val);
  }
  val = this.cast($conditional);
  return val;
};

/*!
 * Module exports.
 */

module.exports = SchemaNumber;

}).call(this,require("buffer").Buffer)
},{"../error":12,"../schematype":41,"../utils":51,"./../document":5,"./operators/bitwise":37,"buffer":84}],36:[function(require,module,exports){
(function (Buffer){
/* eslint no-empty: 1 */

/*!
 * Module dependencies.
 */

var SchemaType = require('../schematype'),
    CastError = SchemaType.CastError,
    oid = require('../types/objectid'),
    utils = require('../utils'),
    Document;

/**
 * ObjectId SchemaType constructor.
 *
 * @param {String} key
 * @param {Object} options
 * @inherits SchemaType
 * @api public
 */

function ObjectId(key, options) {
  SchemaType.call(this, key, options, 'ObjectID');
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
ObjectId.schemaName = 'ObjectId';

/*!
 * Inherits from SchemaType.
 */
ObjectId.prototype = Object.create(SchemaType.prototype);
ObjectId.prototype.constructor = ObjectId;

/**
 * Adds an auto-generated ObjectId default if turnOn is true.
 * @param {Boolean} turnOn auto generated ObjectId defaults
 * @api public
 * @return {SchemaType} this
 */

ObjectId.prototype.auto = function(turnOn) {
  if (turnOn) {
    this.default(defaultId);
    this.set(resetId);
  }

  return this;
};

/**
 * Check if the given value satisfies a required validator.
 *
 * @param {Any} value
 * @param {Document} doc
 * @return {Boolean}
 * @api public
 */

ObjectId.prototype.checkRequired = function checkRequired(value, doc) {
  if (SchemaType._isRef(this, value, doc, true)) {
    return !!value;
  }
  return value instanceof oid;
};

/**
 * Casts to ObjectId
 *
 * @param {Object} value
 * @param {Object} doc
 * @param {Boolean} init whether this is an initialization cast
 * @api private
 */

ObjectId.prototype.cast = function(value, doc, init) {
  if (SchemaType._isRef(this, value, doc, init)) {
    // wait! we may need to cast this to a document

    if (value === null || value === undefined) {
      return value;
    }

    // lazy load
    Document || (Document = require('./../document'));

    if (value instanceof Document) {
      value.$__.wasPopulated = true;
      return value;
    }

    // setting a populated path
    if (value instanceof oid) {
      return value;
    } else if (Buffer.isBuffer(value) || !utils.isObject(value)) {
      throw new CastError('ObjectId', value, this.path);
    }

    // Handle the case where user directly sets a populated
    // path to a plain object; cast to the Model used in
    // the population query.
    var path = doc.$__fullPath(this.path);
    var owner = doc.ownerDocument ? doc.ownerDocument() : doc;
    var pop = owner.populated(path, true);
    var ret = value;
    if (!doc.$__.populated ||
        !doc.$__.populated[path] ||
        !doc.$__.populated[path].options ||
        !doc.$__.populated[path].options.options ||
        !doc.$__.populated[path].options.options.lean) {
      ret = new pop.options.model(value);
      ret.$__.wasPopulated = true;
    }

    return ret;
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (value instanceof oid) {
    return value;
  }

  if (value._id) {
    if (value._id instanceof oid) {
      return value._id;
    }
    if (value._id.toString instanceof Function) {
      try {
        return new oid(value._id.toString());
      } catch (e) {
      }
    }
  }

  if (value.toString instanceof Function) {
    try {
      return new oid(value.toString());
    } catch (err) {
      throw new CastError('ObjectId', value, this.path);
    }
  }

  throw new CastError('ObjectId', value, this.path);
};

/*!
 * ignore
 */

function handleSingle(val) {
  return this.cast(val);
}

ObjectId.prototype.$conditionalHandlers =
    utils.options(SchemaType.prototype.$conditionalHandlers, {
      $gt: handleSingle,
      $gte: handleSingle,
      $lt: handleSingle,
      $lte: handleSingle
    });

/**
 * Casts contents for queries.
 *
 * @param {String} $conditional
 * @param {any} [val]
 * @api private
 */

ObjectId.prototype.castForQuery = function($conditional, val) {
  var handler;
  if (arguments.length === 2) {
    handler = this.$conditionalHandlers[$conditional];
    if (!handler) {
      throw new Error('Can\'t use ' + $conditional + ' with ObjectId.');
    }
    return handler.call(this, val);
  }
  return this.cast($conditional);
};

/*!
 * ignore
 */

function defaultId() {
  return new oid();
}

function resetId(v) {
  this.$__._id = null;
  return v;
}

/*!
 * Module exports.
 */

module.exports = ObjectId;

}).call(this,require("buffer").Buffer)
},{"../schematype":41,"../types/objectid":49,"../utils":51,"./../document":5,"buffer":84}],37:[function(require,module,exports){
(function (Buffer){
/*!
 * Module requirements.
 */

var CastError = require('../../error/cast');

/*!
 * ignore
 */

function handleBitwiseOperator(val) {
  var _this = this;
  if (Array.isArray(val)) {
    return val.map(function(v) {
      return _castNumber(_this.path, v);
    });
  } else if (Buffer.isBuffer(val)) {
    return val;
  }
  // Assume trying to cast to number
  return _castNumber(_this.path, val);
}

/*!
 * ignore
 */

function _castNumber(path, num) {
  var v = Number(num);
  if (isNaN(v)) {
    throw new CastError('number', num, path);
  }
  return v;
}

module.exports = handleBitwiseOperator;

}).call(this,require("buffer").Buffer)
},{"../../error/cast":13,"buffer":84}],38:[function(require,module,exports){
/*!
 * Module requirements.
 */

var castArraysOfNumbers = require('./helpers').castArraysOfNumbers;
var castToNumber = require('./helpers').castToNumber;

/*!
 * ignore
 */

exports.cast$geoIntersects = cast$geoIntersects;
exports.cast$near = cast$near;
exports.cast$within = cast$within;

function cast$near(val) {
  var SchemaArray = require('../array');

  if (Array.isArray(val)) {
    castArraysOfNumbers(val, this);
    return val;
  }

  _castMinMaxDistance(this, val);

  if (val && val.$geometry) {
    return cast$geometry(val, this);
  }

  return SchemaArray.prototype.castForQuery.call(this, val);
}

function cast$geometry(val, self) {
  switch (val.$geometry.type) {
    case 'Polygon':
    case 'LineString':
    case 'Point':
      castArraysOfNumbers(val.$geometry.coordinates, self);
      break;
    default:
      // ignore unknowns
      break;
  }

  _castMinMaxDistance(this, val);

  return val;
}

function cast$within(val) {
  _castMinMaxDistance(this, val);

  if (val.$box || val.$polygon) {
    var type = val.$box ? '$box' : '$polygon';
    val[type].forEach(function(arr) {
      if (!Array.isArray(arr)) {
        var msg = 'Invalid $within $box argument. '
            + 'Expected an array, received ' + arr;
        throw new TypeError(msg);
      }
      arr.forEach(function(v, i) {
        arr[i] = castToNumber.call(this, v);
      });
    });
  } else if (val.$center || val.$centerSphere) {
    type = val.$center ? '$center' : '$centerSphere';
    val[type].forEach(function(item, i) {
      if (Array.isArray(item)) {
        item.forEach(function(v, j) {
          item[j] = castToNumber.call(this, v);
        });
      } else {
        val[type][i] = castToNumber.call(this, item);
      }
    });
  } else if (val.$geometry) {
    cast$geometry(val, this);
  }

  return val;
}

function cast$geoIntersects(val) {
  var geo = val.$geometry;
  if (!geo) {
    return;
  }

  cast$geometry(val, this);
  return val;
}

function _castMinMaxDistance(self, val) {
  if (val.$maxDistance) {
    val.$maxDistance = castToNumber.call(self, val.$maxDistance);
  }
  if (val.$minDistance) {
    val.$minDistance = castToNumber.call(self, val.$minDistance);
  }
}

},{"../array":27,"./helpers":39}],39:[function(require,module,exports){
'use strict';

/*!
 * Module requirements.
 */

var Types = {
  Number: require('../number')
};

/*!
 * @ignore
 */

exports.castToNumber = castToNumber;
exports.castArraysOfNumbers = castArraysOfNumbers;

/*!
 * @ignore
 */

function castToNumber(val) {
  return Types.Number.prototype.cast.call(this, val);
}

function castArraysOfNumbers(arr, self) {
  arr.forEach(function(v, i) {
    if (Array.isArray(v)) {
      castArraysOfNumbers(v, self);
    } else {
      arr[i] = castToNumber.call(self, v);
    }
  });
}

},{"../number":35}],40:[function(require,module,exports){
(function (Buffer){
/*!
 * Module dependencies.
 */

var SchemaType = require('../schematype');
var CastError = SchemaType.CastError;
var MongooseError = require('../error');
var utils = require('../utils');
var Document;

/**
 * String SchemaType constructor.
 *
 * @param {String} key
 * @param {Object} options
 * @inherits SchemaType
 * @api public
 */

function SchemaString(key, options) {
  this.enumValues = [];
  this.regExp = null;
  SchemaType.call(this, key, options, 'String');
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
SchemaString.schemaName = 'String';

/*!
 * Inherits from SchemaType.
 */
SchemaString.prototype = Object.create(SchemaType.prototype);
SchemaString.prototype.constructor = SchemaString;

/**
 * Adds an enum validator
 *
 * ####Example:
 *
 *     var states = 'opening open closing closed'.split(' ')
 *     var s = new Schema({ state: { type: String, enum: states }})
 *     var M = db.model('M', s)
 *     var m = new M({ state: 'invalid' })
 *     m.save(function (err) {
 *       console.error(String(err)) // ValidationError: `invalid` is not a valid enum value for path `state`.
 *       m.state = 'open'
 *       m.save(callback) // success
 *     })
 *
 *     // or with custom error messages
 *     var enu = {
 *       values: 'opening open closing closed'.split(' '),
 *       message: 'enum validator failed for path `{PATH}` with value `{VALUE}`'
 *     }
 *     var s = new Schema({ state: { type: String, enum: enu })
 *     var M = db.model('M', s)
 *     var m = new M({ state: 'invalid' })
 *     m.save(function (err) {
 *       console.error(String(err)) // ValidationError: enum validator failed for path `state` with value `invalid`
 *       m.state = 'open'
 *       m.save(callback) // success
 *     })
 *
 * @param {String|Object} [args...] enumeration values
 * @return {SchemaType} this
 * @see Customized Error Messages #error_messages_MongooseError-messages
 * @api public
 */

SchemaString.prototype.enum = function() {
  if (this.enumValidator) {
    this.validators = this.validators.filter(function(v) {
      return v.validator !== this.enumValidator;
    }, this);
    this.enumValidator = false;
  }

  if (arguments[0] === void 0 || arguments[0] === false) {
    return this;
  }

  var values;
  var errorMessage;

  if (utils.isObject(arguments[0])) {
    values = arguments[0].values;
    errorMessage = arguments[0].message;
  } else {
    values = arguments;
    errorMessage = MongooseError.messages.String.enum;
  }

  for (var i = 0; i < values.length; i++) {
    if (undefined !== values[i]) {
      this.enumValues.push(this.cast(values[i]));
    }
  }

  var vals = this.enumValues;
  this.enumValidator = function(v) {
    return undefined === v || ~vals.indexOf(v);
  };
  this.validators.push({
    validator: this.enumValidator,
    message: errorMessage,
    type: 'enum',
    enumValues: vals
  });

  return this;
};

/**
 * Adds a lowercase setter.
 *
 * ####Example:
 *
 *     var s = new Schema({ email: { type: String, lowercase: true }})
 *     var M = db.model('M', s);
 *     var m = new M({ email: 'SomeEmail@example.COM' });
 *     console.log(m.email) // someemail@example.com
 *
 * @api public
 * @return {SchemaType} this
 */

SchemaString.prototype.lowercase = function() {
  return this.set(function(v, self) {
    if (typeof v !== 'string') {
      v = self.cast(v);
    }
    if (v) {
      return v.toLowerCase();
    }
    return v;
  });
};

/**
 * Adds an uppercase setter.
 *
 * ####Example:
 *
 *     var s = new Schema({ caps: { type: String, uppercase: true }})
 *     var M = db.model('M', s);
 *     var m = new M({ caps: 'an example' });
 *     console.log(m.caps) // AN EXAMPLE
 *
 * @api public
 * @return {SchemaType} this
 */

SchemaString.prototype.uppercase = function() {
  return this.set(function(v, self) {
    if (typeof v !== 'string') {
      v = self.cast(v);
    }
    if (v) {
      return v.toUpperCase();
    }
    return v;
  });
};

/**
 * Adds a trim setter.
 *
 * The string value will be trimmed when set.
 *
 * ####Example:
 *
 *     var s = new Schema({ name: { type: String, trim: true }})
 *     var M = db.model('M', s)
 *     var string = ' some name '
 *     console.log(string.length) // 11
 *     var m = new M({ name: string })
 *     console.log(m.name.length) // 9
 *
 * @api public
 * @return {SchemaType} this
 */

SchemaString.prototype.trim = function(shouldTrim) {
  if (arguments.length > 0 && !shouldTrim) {
    return this;
  }
  return this.set(function(v, self) {
    if (typeof v !== 'string') {
      v = self.cast(v);
    }
    if (v) {
      return v.trim();
    }
    return v;
  });
};

/**
 * Sets a minimum length validator.
 *
 * ####Example:
 *
 *     var schema = new Schema({ postalCode: { type: String, minlength: 5 })
 *     var Address = db.model('Address', schema)
 *     var address = new Address({ postalCode: '9512' })
 *     address.save(function (err) {
 *       console.error(err) // validator error
 *       address.postalCode = '95125';
 *       address.save() // success
 *     })
 *
 *     // custom error messages
 *     // We can also use the special {MINLENGTH} token which will be replaced with the minimum allowed length
 *     var minlength = [5, 'The value of path `{PATH}` (`{VALUE}`) is shorter than the minimum allowed length ({MINLENGTH}).'];
 *     var schema = new Schema({ postalCode: { type: String, minlength: minlength })
 *     var Address = mongoose.model('Address', schema);
 *     var address = new Address({ postalCode: '9512' });
 *     address.validate(function (err) {
 *       console.log(String(err)) // ValidationError: The value of path `postalCode` (`9512`) is shorter than the minimum length (5).
 *     })
 *
 * @param {Number} value minimum string length
 * @param {String} [message] optional custom error message
 * @return {SchemaType} this
 * @see Customized Error Messages #error_messages_MongooseError-messages
 * @api public
 */

SchemaString.prototype.minlength = function(value, message) {
  if (this.minlengthValidator) {
    this.validators = this.validators.filter(function(v) {
      return v.validator !== this.minlengthValidator;
    }, this);
  }

  if (value !== null && value !== undefined) {
    var msg = message || MongooseError.messages.String.minlength;
    msg = msg.replace(/{MINLENGTH}/, value);
    this.validators.push({
      validator: this.minlengthValidator = function(v) {
        return v === null || v.length >= value;
      },
      message: msg,
      type: 'minlength',
      minlength: value
    });
  }

  return this;
};

/**
 * Sets a maximum length validator.
 *
 * ####Example:
 *
 *     var schema = new Schema({ postalCode: { type: String, maxlength: 9 })
 *     var Address = db.model('Address', schema)
 *     var address = new Address({ postalCode: '9512512345' })
 *     address.save(function (err) {
 *       console.error(err) // validator error
 *       address.postalCode = '95125';
 *       address.save() // success
 *     })
 *
 *     // custom error messages
 *     // We can also use the special {MAXLENGTH} token which will be replaced with the maximum allowed length
 *     var maxlength = [9, 'The value of path `{PATH}` (`{VALUE}`) exceeds the maximum allowed length ({MAXLENGTH}).'];
 *     var schema = new Schema({ postalCode: { type: String, maxlength: maxlength })
 *     var Address = mongoose.model('Address', schema);
 *     var address = new Address({ postalCode: '9512512345' });
 *     address.validate(function (err) {
 *       console.log(String(err)) // ValidationError: The value of path `postalCode` (`9512512345`) exceeds the maximum allowed length (9).
 *     })
 *
 * @param {Number} value maximum string length
 * @param {String} [message] optional custom error message
 * @return {SchemaType} this
 * @see Customized Error Messages #error_messages_MongooseError-messages
 * @api public
 */

SchemaString.prototype.maxlength = function(value, message) {
  if (this.maxlengthValidator) {
    this.validators = this.validators.filter(function(v) {
      return v.validator !== this.maxlengthValidator;
    }, this);
  }

  if (value !== null && value !== undefined) {
    var msg = message || MongooseError.messages.String.maxlength;
    msg = msg.replace(/{MAXLENGTH}/, value);
    this.validators.push({
      validator: this.maxlengthValidator = function(v) {
        return v === null || v.length <= value;
      },
      message: msg,
      type: 'maxlength',
      maxlength: value
    });
  }

  return this;
};

/**
 * Sets a regexp validator.
 *
 * Any value that does not pass `regExp`.test(val) will fail validation.
 *
 * ####Example:
 *
 *     var s = new Schema({ name: { type: String, match: /^a/ }})
 *     var M = db.model('M', s)
 *     var m = new M({ name: 'I am invalid' })
 *     m.validate(function (err) {
 *       console.error(String(err)) // "ValidationError: Path `name` is invalid (I am invalid)."
 *       m.name = 'apples'
 *       m.validate(function (err) {
 *         assert.ok(err) // success
 *       })
 *     })
 *
 *     // using a custom error message
 *     var match = [ /\.html$/, "That file doesn't end in .html ({VALUE})" ];
 *     var s = new Schema({ file: { type: String, match: match }})
 *     var M = db.model('M', s);
 *     var m = new M({ file: 'invalid' });
 *     m.validate(function (err) {
 *       console.log(String(err)) // "ValidationError: That file doesn't end in .html (invalid)"
 *     })
 *
 * Empty strings, `undefined`, and `null` values always pass the match validator. If you require these values, enable the `required` validator also.
 *
 *     var s = new Schema({ name: { type: String, match: /^a/, required: true }})
 *
 * @param {RegExp} regExp regular expression to test against
 * @param {String} [message] optional custom error message
 * @return {SchemaType} this
 * @see Customized Error Messages #error_messages_MongooseError-messages
 * @api public
 */

SchemaString.prototype.match = function match(regExp, message) {
  // yes, we allow multiple match validators

  var msg = message || MongooseError.messages.String.match;

  var matchValidator = function(v) {
    if (!regExp) {
      return false;
    }

    var ret = ((v != null && v !== '')
        ? regExp.test(v)
        : true);
    return ret;
  };

  this.validators.push({
    validator: matchValidator,
    message: msg,
    type: 'regexp',
    regexp: regExp
  });
  return this;
};

/**
 * Check if the given value satisfies a required validator.
 *
 * @param {Any} value
 * @param {Document} doc
 * @return {Boolean}
 * @api public
 */

SchemaString.prototype.checkRequired = function checkRequired(value, doc) {
  if (SchemaType._isRef(this, value, doc, true)) {
    return !!value;
  }
  return (value instanceof String || typeof value === 'string') && value.length;
};

/**
 * Casts to String
 *
 * @api private
 */

SchemaString.prototype.cast = function(value, doc, init) {
  if (SchemaType._isRef(this, value, doc, init)) {
    // wait! we may need to cast this to a document

    if (value === null || value === undefined) {
      return value;
    }

    // lazy load
    Document || (Document = require('./../document'));

    if (value instanceof Document) {
      value.$__.wasPopulated = true;
      return value;
    }

    // setting a populated path
    if (typeof value === 'string') {
      return value;
    } else if (Buffer.isBuffer(value) || !utils.isObject(value)) {
      throw new CastError('string', value, this.path);
    }

    // Handle the case where user directly sets a populated
    // path to a plain object; cast to the Model used in
    // the population query.
    var path = doc.$__fullPath(this.path);
    var owner = doc.ownerDocument ? doc.ownerDocument() : doc;
    var pop = owner.populated(path, true);
    var ret = new pop.options.model(value);
    ret.$__.wasPopulated = true;
    return ret;
  }

  // If null or undefined
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== 'undefined') {
    // handle documents being passed
    if (value._id && typeof value._id === 'string') {
      return value._id;
    }

    // Re: gh-647 and gh-3030, we're ok with casting using `toString()`
    // **unless** its the default Object.toString, because "[object Object]"
    // doesn't really qualify as useful data
    if (value.toString && value.toString !== Object.prototype.toString) {
      return value.toString();
    }
  }

  throw new CastError('string', value, this.path);
};

/*!
 * ignore
 */

function handleSingle(val) {
  return this.castForQuery(val);
}

function handleArray(val) {
  var _this = this;
  if (!Array.isArray(val)) {
    return [this.castForQuery(val)];
  }
  return val.map(function(m) {
    return _this.castForQuery(m);
  });
}

SchemaString.prototype.$conditionalHandlers =
    utils.options(SchemaType.prototype.$conditionalHandlers, {
      $all: handleArray,
      $gt: handleSingle,
      $gte: handleSingle,
      $lt: handleSingle,
      $lte: handleSingle,
      $options: handleSingle,
      $regex: handleSingle,
      $not: handleSingle
    });

/**
 * Casts contents for queries.
 *
 * @param {String} $conditional
 * @param {any} [val]
 * @api private
 */

SchemaString.prototype.castForQuery = function($conditional, val) {
  var handler;
  if (arguments.length === 2) {
    handler = this.$conditionalHandlers[$conditional];
    if (!handler) {
      throw new Error('Can\'t use ' + $conditional + ' with String.');
    }
    return handler.call(this, val);
  }
  val = $conditional;
  if (Object.prototype.toString.call(val) === '[object RegExp]') {
    return val;
  }
  return this.cast(val);
};

/*!
 * Module exports.
 */

module.exports = SchemaString;

}).call(this,require("buffer").Buffer)
},{"../error":12,"../schematype":41,"../utils":51,"./../document":5,"buffer":84}],41:[function(require,module,exports){
(function (Buffer){
/*!
 * Module dependencies.
 */

var utils = require('./utils');
var MongooseError = require('./error');
var CastError = MongooseError.CastError;
var ValidatorError = MongooseError.ValidatorError;

/**
 * SchemaType constructor
 *
 * @param {String} path
 * @param {Object} [options]
 * @param {String} [instance]
 * @api public
 */

function SchemaType(path, options, instance) {
  this.path = path;
  this.instance = instance;
  this.validators = [];
  this.setters = [];
  this.getters = [];
  this.options = options;
  this._index = null;
  this.selected;

  for (var i in options) {
    if (this[i] && typeof this[i] === 'function') {
      // { unique: true, index: true }
      if (i === 'index' && this._index) {
        continue;
      }

      var opts = Array.isArray(options[i])
          ? options[i]
          : [options[i]];

      this[i].apply(this, opts);
    }
  }
}

/**
 * Sets a default value for this SchemaType.
 *
 * ####Example:
 *
 *     var schema = new Schema({ n: { type: Number, default: 10 })
 *     var M = db.model('M', schema)
 *     var m = new M;
 *     console.log(m.n) // 10
 *
 * Defaults can be either `functions` which return the value to use as the default or the literal value itself. Either way, the value will be cast based on its schema type before being set during document creation.
 *
 * ####Example:
 *
 *     // values are cast:
 *     var schema = new Schema({ aNumber: { type: Number, default: 4.815162342 }})
 *     var M = db.model('M', schema)
 *     var m = new M;
 *     console.log(m.aNumber) // 4.815162342
 *
 *     // default unique objects for Mixed types:
 *     var schema = new Schema({ mixed: Schema.Types.Mixed });
 *     schema.path('mixed').default(function () {
 *       return {};
 *     });
 *
 *     // if we don't use a function to return object literals for Mixed defaults,
 *     // each document will receive a reference to the same object literal creating
 *     // a "shared" object instance:
 *     var schema = new Schema({ mixed: Schema.Types.Mixed });
 *     schema.path('mixed').default({});
 *     var M = db.model('M', schema);
 *     var m1 = new M;
 *     m1.mixed.added = 1;
 *     console.log(m1.mixed); // { added: 1 }
 *     var m2 = new M;
 *     console.log(m2.mixed); // { added: 1 }
 *
 * @param {Function|any} val the default value
 * @return {defaultValue}
 * @api public
 */

SchemaType.prototype.default = function(val) {
  if (arguments.length === 1) {
    if (val === void 0) {
      this.defaultValue = void 0;
      return void 0;
    }
    this.defaultValue = val;
    return this.defaultValue;
  } else if (arguments.length > 1) {
    this.defaultValue = utils.args(arguments);
  }
  return this.defaultValue;
};

/**
 * Declares the index options for this schematype.
 *
 * ####Example:
 *
 *     var s = new Schema({ name: { type: String, index: true })
 *     var s = new Schema({ loc: { type: [Number], index: 'hashed' })
 *     var s = new Schema({ loc: { type: [Number], index: '2d', sparse: true })
 *     var s = new Schema({ loc: { type: [Number], index: { type: '2dsphere', sparse: true }})
 *     var s = new Schema({ date: { type: Date, index: { unique: true, expires: '1d' }})
 *     Schema.path('my.path').index(true);
 *     Schema.path('my.date').index({ expires: 60 });
 *     Schema.path('my.path').index({ unique: true, sparse: true });
 *
 * ####NOTE:
 *
 * _Indexes are created in the background by default. Specify `background: false` to override._
 *
 * [Direction doesn't matter for single key indexes](http://www.mongodb.org/display/DOCS/Indexes#Indexes-CompoundKeysIndexes)
 *
 * @param {Object|Boolean|String} options
 * @return {SchemaType} this
 * @api public
 */

SchemaType.prototype.index = function(options) {
  this._index = options;
  utils.expires(this._index);
  return this;
};

/**
 * Declares an unique index.
 *
 * ####Example:
 *
 *     var s = new Schema({ name: { type: String, unique: true }});
 *     Schema.path('name').index({ unique: true });
 *
 * _NOTE: violating the constraint returns an `E11000` error from MongoDB when saving, not a Mongoose validation error._
 *
 * @param {Boolean} bool
 * @return {SchemaType} this
 * @api public
 */

SchemaType.prototype.unique = function(bool) {
  if (this._index === false) {
    if (!bool) {
      return;
    }
    throw new Error('Path "' + this.path + '" may not have `index` set to ' +
      'false and `unique` set to true');
  }
  if (this._index == null || this._index === true) {
    this._index = {};
  } else if (typeof this._index === 'string') {
    this._index = {type: this._index};
  }

  this._index.unique = bool;
  return this;
};

/**
 * Declares a full text index.
 *
 * ###Example:
 *
 *      var s = new Schema({name : {type: String, text : true })
 *      Schema.path('name').index({text : true});
 * @param {Boolean} bool
 * @return {SchemaType} this
 * @api public
 */

SchemaType.prototype.text = function(bool) {
  if (this._index === null || this._index === undefined ||
    typeof this._index === 'boolean') {
    this._index = {};
  } else if (typeof this._index === 'string') {
    this._index = {type: this._index};
  }

  this._index.text = bool;
  return this;
};

/**
 * Declares a sparse index.
 *
 * ####Example:
 *
 *     var s = new Schema({ name: { type: String, sparse: true })
 *     Schema.path('name').index({ sparse: true });
 *
 * @param {Boolean} bool
 * @return {SchemaType} this
 * @api public
 */

SchemaType.prototype.sparse = function(bool) {
  if (this._index === null || this._index === undefined ||
    typeof this._index === 'boolean') {
    this._index = {};
  } else if (typeof this._index === 'string') {
    this._index = {type: this._index};
  }

  this._index.sparse = bool;
  return this;
};

/**
 * Adds a setter to this schematype.
 *
 * ####Example:
 *
 *     function capitalize (val) {
 *       if (typeof val !== 'string') val = '';
 *       return val.charAt(0).toUpperCase() + val.substring(1);
 *     }
 *
 *     // defining within the schema
 *     var s = new Schema({ name: { type: String, set: capitalize }})
 *
 *     // or by retreiving its SchemaType
 *     var s = new Schema({ name: String })
 *     s.path('name').set(capitalize)
 *
 * Setters allow you to transform the data before it gets to the raw mongodb document and is set as a value on an actual key.
 *
 * Suppose you are implementing user registration for a website. Users provide an email and password, which gets saved to mongodb. The email is a string that you will want to normalize to lower case, in order to avoid one email having more than one account -- e.g., otherwise, avenue@q.com can be registered for 2 accounts via avenue@q.com and AvEnUe@Q.CoM.
 *
 * You can set up email lower case normalization easily via a Mongoose setter.
 *
 *     function toLower (v) {
 *       return v.toLowerCase();
 *     }
 *
 *     var UserSchema = new Schema({
 *       email: { type: String, set: toLower }
 *     })
 *
 *     var User = db.model('User', UserSchema)
 *
 *     var user = new User({email: 'AVENUE@Q.COM'})
 *     console.log(user.email); // 'avenue@q.com'
 *
 *     // or
 *     var user = new User
 *     user.email = 'Avenue@Q.com'
 *     console.log(user.email) // 'avenue@q.com'
 *
 * As you can see above, setters allow you to transform the data before it gets to the raw mongodb document and is set as a value on an actual key.
 *
 * _NOTE: we could have also just used the built-in `lowercase: true` SchemaType option instead of defining our own function._
 *
 *     new Schema({ email: { type: String, lowercase: true }})
 *
 * Setters are also passed a second argument, the schematype on which the setter was defined. This allows for tailored behavior based on options passed in the schema.
 *
 *     function inspector (val, schematype) {
 *       if (schematype.options.required) {
 *         return schematype.path + ' is required';
 *       } else {
 *         return val;
 *       }
 *     }
 *
 *     var VirusSchema = new Schema({
 *       name: { type: String, required: true, set: inspector },
 *       taxonomy: { type: String, set: inspector }
 *     })
 *
 *     var Virus = db.model('Virus', VirusSchema);
 *     var v = new Virus({ name: 'Parvoviridae', taxonomy: 'Parvovirinae' });
 *
 *     console.log(v.name);     // name is required
 *     console.log(v.taxonomy); // Parvovirinae
 *
 * @param {Function} fn
 * @return {SchemaType} this
 * @api public
 */

SchemaType.prototype.set = function(fn) {
  if (typeof fn !== 'function') {
    throw new TypeError('A setter must be a function.');
  }
  this.setters.push(fn);
  return this;
};

/**
 * Adds a getter to this schematype.
 *
 * ####Example:
 *
 *     function dob (val) {
 *       if (!val) return val;
 *       return (val.getMonth() + 1) + "/" + val.getDate() + "/" + val.getFullYear();
 *     }
 *
 *     // defining within the schema
 *     var s = new Schema({ born: { type: Date, get: dob })
 *
 *     // or by retreiving its SchemaType
 *     var s = new Schema({ born: Date })
 *     s.path('born').get(dob)
 *
 * Getters allow you to transform the representation of the data as it travels from the raw mongodb document to the value that you see.
 *
 * Suppose you are storing credit card numbers and you want to hide everything except the last 4 digits to the mongoose user. You can do so by defining a getter in the following way:
 *
 *     function obfuscate (cc) {
 *       return '****-****-****-' + cc.slice(cc.length-4, cc.length);
 *     }
 *
 *     var AccountSchema = new Schema({
 *       creditCardNumber: { type: String, get: obfuscate }
 *     });
 *
 *     var Account = db.model('Account', AccountSchema);
 *
 *     Account.findById(id, function (err, found) {
 *       console.log(found.creditCardNumber); // '****-****-****-1234'
 *     });
 *
 * Getters are also passed a second argument, the schematype on which the getter was defined. This allows for tailored behavior based on options passed in the schema.
 *
 *     function inspector (val, schematype) {
 *       if (schematype.options.required) {
 *         return schematype.path + ' is required';
 *       } else {
 *         return schematype.path + ' is not';
 *       }
 *     }
 *
 *     var VirusSchema = new Schema({
 *       name: { type: String, required: true, get: inspector },
 *       taxonomy: { type: String, get: inspector }
 *     })
 *
 *     var Virus = db.model('Virus', VirusSchema);
 *
 *     Virus.findById(id, function (err, virus) {
 *       console.log(virus.name);     // name is required
 *       console.log(virus.taxonomy); // taxonomy is not
 *     })
 *
 * @param {Function} fn
 * @return {SchemaType} this
 * @api public
 */

SchemaType.prototype.get = function(fn) {
  if (typeof fn !== 'function') {
    throw new TypeError('A getter must be a function.');
  }
  this.getters.push(fn);
  return this;
};

/**
 * Adds validator(s) for this document path.
 *
 * Validators always receive the value to validate as their first argument and must return `Boolean`. Returning `false` means validation failed.
 *
 * The error message argument is optional. If not passed, the [default generic error message template](#error_messages_MongooseError-messages) will be used.
 *
 * ####Examples:
 *
 *     // make sure every value is equal to "something"
 *     function validator (val) {
 *       return val == 'something';
 *     }
 *     new Schema({ name: { type: String, validate: validator }});
 *
 *     // with a custom error message
 *
 *     var custom = [validator, 'Uh oh, {PATH} does not equal "something".']
 *     new Schema({ name: { type: String, validate: custom }});
 *
 *     // adding many validators at a time
 *
 *     var many = [
 *         { validator: validator, msg: 'uh oh' }
 *       , { validator: anotherValidator, msg: 'failed' }
 *     ]
 *     new Schema({ name: { type: String, validate: many }});
 *
 *     // or utilizing SchemaType methods directly:
 *
 *     var schema = new Schema({ name: 'string' });
 *     schema.path('name').validate(validator, 'validation of `{PATH}` failed with value `{VALUE}`');
 *
 * ####Error message templates:
 *
 * From the examples above, you may have noticed that error messages support basic templating. There are a few other template keywords besides `{PATH}` and `{VALUE}` too. To find out more, details are available [here](#error_messages_MongooseError.messages)
 *
 * ####Asynchronous validation:
 *
 * Passing a validator function that receives two arguments tells mongoose that the validator is an asynchronous validator. The first argument passed to the validator function is the value being validated. The second argument is a callback function that must called when you finish validating the value and passed either `true` or `false` to communicate either success or failure respectively.
 *
 *     schema.path('name').validate(function (value, respond) {
 *       doStuff(value, function () {
 *         ...
 *         respond(false); // validation failed
 *       })
 *     }, '{PATH} failed validation.');
 *
 *     // or with dynamic message
 *
 *     schema.path('name').validate(function (value, respond) {
 *       doStuff(value, function () {
 *         ...
 *         respond(false, 'this message gets to the validation error');
 *       });
 *     }, 'this message does not matter');
 *
 * You might use asynchronous validators to retreive other documents from the database to validate against or to meet other I/O bound validation needs.
 *
 * Validation occurs `pre('save')` or whenever you manually execute [document#validate](#document_Document-validate).
 *
 * If validation fails during `pre('save')` and no callback was passed to receive the error, an `error` event will be emitted on your Models associated db [connection](#connection_Connection), passing the validation error object along.
 *
 *     var conn = mongoose.createConnection(..);
 *     conn.on('error', handleError);
 *
 *     var Product = conn.model('Product', yourSchema);
 *     var dvd = new Product(..);
 *     dvd.save(); // emits error on the `conn` above
 *
 * If you desire handling these errors at the Model level, attach an `error` listener to your Model and the event will instead be emitted there.
 *
 *     // registering an error listener on the Model lets us handle errors more locally
 *     Product.on('error', handleError);
 *
 * @param {RegExp|Function|Object} obj validator
 * @param {String} [errorMsg] optional error message
 * @param {String} [type] optional validator type
 * @return {SchemaType} this
 * @api public
 */

SchemaType.prototype.validate = function(obj, message, type) {
  if (typeof obj === 'function' || obj && utils.getFunctionName(obj.constructor) === 'RegExp') {
    var properties;
    if (message instanceof Object && !type) {
      properties = utils.clone(message);
      if (!properties.message) {
        properties.message = properties.msg;
      }
      properties.validator = obj;
      properties.type = properties.type || 'user defined';
    } else {
      if (!message) {
        message = MongooseError.messages.general.default;
      }
      if (!type) {
        type = 'user defined';
      }
      properties = {message: message, type: type, validator: obj};
    }
    this.validators.push(properties);
    return this;
  }

  var i,
      length,
      arg;

  for (i = 0, length = arguments.length; i < length; i++) {
    arg = arguments[i];
    if (!(arg && utils.getFunctionName(arg.constructor) === 'Object')) {
      var msg = 'Invalid validator. Received (' + typeof arg + ') '
          + arg
          + '. See http://mongoosejs.com/docs/api.html#schematype_SchemaType-validate';

      throw new Error(msg);
    }
    this.validate(arg.validator, arg);
  }

  return this;
};

/**
 * Adds a required validator to this SchemaType. The validator gets added
 * to the front of this SchemaType's validators array using `unshift()`.
 *
 * ####Example:
 *
 *     var s = new Schema({ born: { type: Date, required: true })
 *
 *     // or with custom error message
 *
 *     var s = new Schema({ born: { type: Date, required: '{PATH} is required!' })
 *
 *     // or through the path API
 *
 *     Schema.path('name').required(true);
 *
 *     // with custom error messaging
 *
 *     Schema.path('name').required(true, 'grrr :( ');
 *
 *     // or make a path conditionally required based on a function
 *     var isOver18 = function() { return this.age >= 18; };
 *     Schema.path('voterRegistrationId').required(isOver18);
 *
 * The required validator uses the SchemaType's `checkRequired` function to
 * determine whether a given value satisfies the required validator. By default,
 * a value satisfies the required validator if `val != null` (that is, if
 * the value is not null nor undefined). However, most built-in mongoose schema
 * types override the default `checkRequired` function:
 *
 * @param {Boolean} required enable/disable the validator
 * @param {String} [message] optional custom error message
 * @return {SchemaType} this
 * @see Customized Error Messages #error_messages_MongooseError-messages
 * @see SchemaArray#checkRequired #schema_array_SchemaArray.checkRequired
 * @see SchemaBoolean#checkRequired #schema_boolean_SchemaBoolean-checkRequired
 * @see SchemaBuffer#checkRequired #schema_buffer_SchemaBuffer.schemaName
 * @see SchemaNumber#checkRequired #schema_number_SchemaNumber-min
 * @see SchemaObjectId#checkRequired #schema_objectid_ObjectId-auto
 * @see SchemaString#checkRequired #schema_string_SchemaString-checkRequired
 * @api public
 */

SchemaType.prototype.required = function(required, message) {
  if (required === false) {
    this.validators = this.validators.filter(function(v) {
      return v.validator !== this.requiredValidator;
    }, this);

    this.isRequired = false;
    return this;
  }

  var _this = this;
  this.isRequired = true;

  this.requiredValidator = function(v) {
    // in here, `this` refers to the validating document.
    // no validation when this path wasn't selected in the query.
    if ('isSelected' in this && !this.isSelected(_this.path) && !this.isModified(_this.path)) {
      return true;
    }

    return ((typeof required === 'function') && !required.apply(this)) ||
        _this.checkRequired(v, this);
  };
  this.originalRequiredValue = required;

  if (typeof required === 'string') {
    message = required;
    required = undefined;
  }

  var msg = message || MongooseError.messages.general.required;
  this.validators.unshift({
    validator: this.requiredValidator,
    message: msg,
    type: 'required'
  });

  return this;
};

/**
 * Gets the default value
 *
 * @param {Object} scope the scope which callback are executed
 * @param {Boolean} init
 * @api private
 */

SchemaType.prototype.getDefault = function(scope, init) {
  var ret = typeof this.defaultValue === 'function'
      ? this.defaultValue.call(scope)
      : this.defaultValue;

  if (ret !== null && ret !== undefined) {
    var casted = this.cast(ret, scope, init);
    if (casted && casted.$isSingleNested) {
      casted.$parent = scope;
    }
    return casted;
  }
  return ret;
};

/**
 * Applies setters
 *
 * @param {Object} value
 * @param {Object} scope
 * @param {Boolean} init
 * @api private
 */

SchemaType.prototype.applySetters = function(value, scope, init, priorVal, options) {
  var v = value,
      setters = this.setters,
      len = setters.length,
      caster = this.caster;

  while (len--) {
    v = setters[len].call(scope, v, this);
  }

  if (Array.isArray(v) && caster && caster.setters) {
    var newVal = [];
    for (var i = 0; i < v.length; i++) {
      newVal.push(caster.applySetters(v[i], scope, init, priorVal));
    }
    v = newVal;
  }

  if (v === null || v === undefined) {
    return v;
  }

  // do not cast until all setters are applied #665
  v = this.cast(v, scope, init, priorVal, options);

  return v;
};

/**
 * Applies getters to a value
 *
 * @param {Object} value
 * @param {Object} scope
 * @api private
 */

SchemaType.prototype.applyGetters = function(value, scope) {
  var v = value,
      getters = this.getters,
      len = getters.length;

  if (!len) {
    return v;
  }

  while (len--) {
    v = getters[len].call(scope, v, this);
  }

  return v;
};

/**
 * Sets default `select()` behavior for this path.
 *
 * Set to `true` if this path should always be included in the results, `false` if it should be excluded by default. This setting can be overridden at the query level.
 *
 * ####Example:
 *
 *     T = db.model('T', new Schema({ x: { type: String, select: true }}));
 *     T.find(..); // field x will always be selected ..
 *     // .. unless overridden;
 *     T.find().select('-x').exec(callback);
 *
 * @param {Boolean} val
 * @return {SchemaType} this
 * @api public
 */

SchemaType.prototype.select = function select(val) {
  this.selected = !!val;
  return this;
};

/**
 * Performs a validation of `value` using the validators declared for this SchemaType.
 *
 * @param {any} value
 * @param {Function} callback
 * @param {Object} scope
 * @api private
 */

SchemaType.prototype.doValidate = function(value, fn, scope) {
  var err = false,
      path = this.path,
      count = this.validators.length;

  if (!count) {
    return fn(null);
  }

  var validate = function(ok, validatorProperties) {
    if (err) {
      return;
    }
    if (ok === undefined || ok) {
      --count || fn(null);
    } else {
      err = new ValidatorError(validatorProperties);
      fn(err);
    }
  };

  var _this = this;
  this.validators.forEach(function(v) {
    if (err) {
      return;
    }

    var validator = v.validator;

    var validatorProperties = utils.clone(v);
    validatorProperties.path = path;
    validatorProperties.value = value;

    if (validator instanceof RegExp) {
      validate(validator.test(value), validatorProperties);
    } else if (typeof validator === 'function') {
      if (value === undefined && !_this.isRequired) {
        validate(true, validatorProperties);
        return;
      }
      if (validator.length === 2) {
        var returnVal = validator.call(scope, value, function(ok, customMsg) {
          if (typeof returnVal === 'boolean') {
            return;
          }
          if (customMsg) {
            validatorProperties.message = customMsg;
          }
          validate(ok, validatorProperties);
        });
        if (typeof returnVal === 'boolean') {
          validate(returnVal, validatorProperties);
        }
      } else {
        validate(validator.call(scope, value), validatorProperties);
      }
    }
  });
};

/**
 * Performs a validation of `value` using the validators declared for this SchemaType.
 *
 * ####Note:
 *
 * This method ignores the asynchronous validators.
 *
 * @param {any} value
 * @param {Object} scope
 * @return {MongooseError|undefined}
 * @api private
 */

SchemaType.prototype.doValidateSync = function(value, scope) {
  var err = null,
      path = this.path,
      count = this.validators.length;

  if (!count) {
    return null;
  }

  var validate = function(ok, validatorProperties) {
    if (err) {
      return;
    }
    if (ok !== undefined && !ok) {
      err = new ValidatorError(validatorProperties);
    }
  };

  var _this = this;
  if (value === undefined && !_this.isRequired) {
    return null;
  }

  this.validators.forEach(function(v) {
    if (err) {
      return;
    }

    var validator = v.validator;
    var validatorProperties = utils.clone(v);
    validatorProperties.path = path;
    validatorProperties.value = value;

    if (validator instanceof RegExp) {
      validate(validator.test(value), validatorProperties);
    } else if (typeof validator === 'function') {
      // if not async validators
      if (validator.length !== 2) {
        validate(validator.call(scope, value), validatorProperties);
      }
    }
  });

  return err;
};

/**
 * Determines if value is a valid Reference.
 *
 * @param {SchemaType} self
 * @param {Object} value
 * @param {Document} doc
 * @param {Boolean} init
 * @return {Boolean}
 * @api private
 */

SchemaType._isRef = function(self, value, doc, init) {
  // fast path
  var ref = init && self.options && self.options.ref;

  if (!ref && doc && doc.$__fullPath) {
    // checks for
    // - this populated with adhoc model and no ref was set in schema OR
    // - setting / pushing values after population
    var path = doc.$__fullPath(self.path);
    var owner = doc.ownerDocument ? doc.ownerDocument() : doc;
    ref = owner.populated(path);
  }

  if (ref) {
    if (value == null) {
      return true;
    }
    if (!Buffer.isBuffer(value) &&  // buffers are objects too
        value._bsontype !== 'Binary' // raw binary value from the db
        && utils.isObject(value)    // might have deselected _id in population query
    ) {
      return true;
    }
  }

  return false;
};

/*!
 * ignore
 */

function handleSingle(val) {
  return this.castForQuery(val);
}

/*!
 * ignore
 */

function handleArray(val) {
  var _this = this;
  if (!Array.isArray(val)) {
    return [this.castForQuery(val)];
  }
  return val.map(function(m) {
    return _this.castForQuery(m);
  });
}

/*!
 * ignore
 */

SchemaType.prototype.$conditionalHandlers = {
  $all: handleArray,
  $eq: handleSingle,
  $in: handleArray,
  $ne: handleSingle,
  $nin: handleArray
};

/**
 * Cast the given value with the given optional query operator.
 *
 * @param {String} [$conditional] query operator, like `$eq` or `$in`
 * @param {any} val
 * @api private
 */

SchemaType.prototype.castForQuery = function($conditional, val) {
  var handler;
  if (arguments.length === 2) {
    handler = this.$conditionalHandlers[$conditional];
    if (!handler) {
      throw new Error('Can\'t use ' + $conditional);
    }
    return handler.call(this, val);
  }
  val = $conditional;
  return this.cast(val);
};

/**
 * Default check for if this path satisfies the `required` validator.
 *
 * @param {any} val
 * @api private
 */

SchemaType.prototype.checkRequired = function(val) {
  return val != null;
};

/*!
 * Module exports.
 */

module.exports = exports = SchemaType;

exports.CastError = CastError;

exports.ValidatorError = ValidatorError;

}).call(this,require("buffer").Buffer)
},{"./error":12,"./utils":51,"buffer":84}],42:[function(require,module,exports){
(function (Buffer){
'use strict';

/*!
 * Module dependencies.
 */

var ObjectId = require('../types/objectid');
var utils = require('../utils');

exports.flatten = flatten;
exports.modifiedPaths = modifiedPaths;

/*!
 * ignore
 */

function flatten(update, path, options) {
  var keys;
  if (update && utils.isMongooseObject(update) && !Buffer.isBuffer(update)) {
    keys = Object.keys(update.toObject({ transform: false }));
  } else {
    keys = Object.keys(update || {});
  }

  var numKeys = keys.length;
  var result = {};
  path = path ? path + '.' : '';

  for (var i = 0; i < numKeys; ++i) {
    var key = keys[i];
    var val = update[key];
    result[path + key] = val;
    if (shouldFlatten(val)) {
      if (options && options.skipArrays && Array.isArray(val)) {
        continue;
      }
      var flat = flatten(val, path + key);
      for (var k in flat) {
        result[k] = flat[k];
      }
      if (Array.isArray(val)) {
        result[path + key] = val;
      }
    }
  }

  return result;
}

/*!
 * ignore
 */

function modifiedPaths(update, path, result) {
  var keys = Object.keys(update || {});
  var numKeys = keys.length;
  result = result || {};
  path = path ? path + '.' : '';

  for (var i = 0; i < numKeys; ++i) {
    var key = keys[i];
    var val = update[key];

    result[path + key] = true;
    if (utils.isMongooseObject(val) && !Buffer.isBuffer(val)) {
      val = val.toObject({ transform: false });
    }
    if (shouldFlatten(val)) {
      modifiedPaths(val, path + key, result);
    }
  }

  return result;
}

/*!
 * ignore
 */

function shouldFlatten(val) {
  return val &&
    typeof val === 'object' &&
    !(val instanceof Date) &&
    !(val instanceof ObjectId) &&
    (!Array.isArray(val) || val.length > 0) &&
    !(val instanceof Buffer);
}

}).call(this,require("buffer").Buffer)
},{"../types/objectid":49,"../utils":51,"buffer":84}],43:[function(require,module,exports){

/*!
 * Module dependencies.
 */

var utils = require('./utils');

/*!
 * StateMachine represents a minimal `interface` for the
 * constructors it builds via StateMachine.ctor(...).
 *
 * @api private
 */

var StateMachine = module.exports = exports = function StateMachine() {
};

/*!
 * StateMachine.ctor('state1', 'state2', ...)
 * A factory method for subclassing StateMachine.
 * The arguments are a list of states. For each state,
 * the constructor's prototype gets state transition
 * methods named after each state. These transition methods
 * place their path argument into the given state.
 *
 * @param {String} state
 * @param {String} [state]
 * @return {Function} subclass constructor
 * @private
 */

StateMachine.ctor = function() {
  var states = utils.args(arguments);

  var ctor = function() {
    StateMachine.apply(this, arguments);
    this.paths = {};
    this.states = {};
    this.stateNames = states;

    var i = states.length,
        state;

    while (i--) {
      state = states[i];
      this.states[state] = {};
    }
  };

  ctor.prototype = new StateMachine();

  states.forEach(function(state) {
    // Changes the `path`'s state to `state`.
    ctor.prototype[state] = function(path) {
      this._changeState(path, state);
    };
  });

  return ctor;
};

/*!
 * This function is wrapped by the state change functions:
 *
 * - `require(path)`
 * - `modify(path)`
 * - `init(path)`
 *
 * @api private
 */

StateMachine.prototype._changeState = function _changeState(path, nextState) {
  var prevBucket = this.states[this.paths[path]];
  if (prevBucket) delete prevBucket[path];

  this.paths[path] = nextState;
  this.states[nextState][path] = true;
};

/*!
 * ignore
 */

StateMachine.prototype.clear = function clear(state) {
  var keys = Object.keys(this.states[state]),
      i = keys.length,
      path;

  while (i--) {
    path = keys[i];
    delete this.states[state][path];
    delete this.paths[path];
  }
};

/*!
 * Checks to see if at least one path is in the states passed in via `arguments`
 * e.g., this.some('required', 'inited')
 *
 * @param {String} state that we want to check for.
 * @private
 */

StateMachine.prototype.some = function some() {
  var _this = this;
  var what = arguments.length ? arguments : this.stateNames;
  return Array.prototype.some.call(what, function(state) {
    return Object.keys(_this.states[state]).length;
  });
};

/*!
 * This function builds the functions that get assigned to `forEach` and `map`,
 * since both of those methods share a lot of the same logic.
 *
 * @param {String} iterMethod is either 'forEach' or 'map'
 * @return {Function}
 * @api private
 */

StateMachine.prototype._iter = function _iter(iterMethod) {
  return function() {
    var numArgs = arguments.length,
        states = utils.args(arguments, 0, numArgs - 1),
        callback = arguments[numArgs - 1];

    if (!states.length) states = this.stateNames;

    var _this = this;

    var paths = states.reduce(function(paths, state) {
      return paths.concat(Object.keys(_this.states[state]));
    }, []);

    return paths[iterMethod](function(path, i, paths) {
      return callback(path, i, paths);
    });
  };
};

/*!
 * Iterates over the paths that belong to one of the parameter states.
 *
 * The function profile can look like:
 * this.forEach(state1, fn);         // iterates over all paths in state1
 * this.forEach(state1, state2, fn); // iterates over all paths in state1 or state2
 * this.forEach(fn);                 // iterates over all paths in all states
 *
 * @param {String} [state]
 * @param {String} [state]
 * @param {Function} callback
 * @private
 */

StateMachine.prototype.forEach = function forEach() {
  this.forEach = this._iter('forEach');
  return this.forEach.apply(this, arguments);
};

/*!
 * Maps over the paths that belong to one of the parameter states.
 *
 * The function profile can look like:
 * this.forEach(state1, fn);         // iterates over all paths in state1
 * this.forEach(state1, state2, fn); // iterates over all paths in state1 or state2
 * this.forEach(fn);                 // iterates over all paths in all states
 *
 * @param {String} [state]
 * @param {String} [state]
 * @param {Function} callback
 * @return {Array}
 * @private
 */

StateMachine.prototype.map = function map() {
  this.map = this._iter('map');
  return this.map.apply(this, arguments);
};

},{"./utils":51}],44:[function(require,module,exports){
(function (Buffer){
/*!
 * Module dependencies.
 */

var EmbeddedDocument = require('./embedded');
var Document = require('../document');
var ObjectId = require('./objectid');
var utils = require('../utils');
var isMongooseObject = utils.isMongooseObject;

/**
 * Mongoose Array constructor.
 *
 * ####NOTE:
 *
 * _Values always have to be passed to the constructor to initialize, otherwise `MongooseArray#push` will mark the array as modified._
 *
 * @param {Array} values
 * @param {String} path
 * @param {Document} doc parent document
 * @api private
 * @inherits Array
 * @see http://bit.ly/f6CnZU
 */

function MongooseArray(values, path, doc) {
  var arr = [].concat(values);

  var keysMA = Object.keys(MongooseArray.mixin);
  var numKeys = keysMA.length;
  for (var i = 0; i < numKeys; ++i) {
    arr[keysMA[i]] = MongooseArray.mixin[keysMA[i]];
  }

  arr._path = path;
  arr.isMongooseArray = true;
  arr.validators = [];
  arr._atomics = {};
  arr._schema = void 0;

  // Because doc comes from the context of another function, doc === global
  // can happen if there was a null somewhere up the chain (see #3020)
  // RB Jun 17, 2015 updated to check for presence of expected paths instead
  // to make more proof against unusual node environments
  if (doc && doc instanceof Document) {
    arr._parent = doc;
    arr._schema = doc.schema.path(path);
  }

  return arr;
}

MongooseArray.mixin = {
  /*!
   * ignore
   */
  toBSON: function() {
    return this.toObject({ transform: false });
  },

  /**
   * Stores a queue of atomic operations to perform
   *
   * @property _atomics
   * @api private
   */

  _atomics: undefined,

  /**
   * Parent owner document
   *
   * @property _parent
   * @api private
   * @receiver MongooseArray
   */

  _parent: undefined,

  /**
   * Casts a member based on this arrays schema.
   *
   * @param {any} value
   * @return value the casted value
   * @method _cast
   * @api private
   * @receiver MongooseArray
   */

  _cast: function(value) {
    var populated = false;
    var Model;

    if (this._parent) {
      populated = this._parent.populated(this._path, true);
    }

    if (populated && value !== null && value !== undefined) {
      // cast to the populated Models schema
      Model = populated.options.model;

      // only objects are permitted so we can safely assume that
      // non-objects are to be interpreted as _id
      if (Buffer.isBuffer(value) ||
          value instanceof ObjectId || !utils.isObject(value)) {
        value = {_id: value};
      }

      // gh-2399
      // we should cast model only when it's not a discriminator
      var isDisc = value.schema && value.schema.discriminatorMapping &&
          value.schema.discriminatorMapping.key !== undefined;
      if (!isDisc) {
        value = new Model(value);
      }
      return this._schema.caster.cast(value, this._parent, true);
    }

    return this._schema.caster.cast(value, this._parent, false);
  },

  /**
   * Marks this array as modified.
   *
   * If it bubbles up from an embedded document change, then it takes the following arguments (otherwise, takes 0 arguments)
   *
   * @param {EmbeddedDocument} embeddedDoc the embedded doc that invoked this method on the Array
   * @param {String} embeddedPath the path which changed in the embeddedDoc
   * @method _markModified
   * @api private
   * @receiver MongooseArray
   */

  _markModified: function(elem, embeddedPath) {
    var parent = this._parent,
        dirtyPath;

    if (parent) {
      dirtyPath = this._path;

      if (arguments.length) {
        if (embeddedPath != null) {
          // an embedded doc bubbled up the change
          dirtyPath = dirtyPath + '.' + this.indexOf(elem) + '.' + embeddedPath;
        } else {
          // directly set an index
          dirtyPath = dirtyPath + '.' + elem;
        }
      }

      parent.markModified(dirtyPath);
    }

    return this;
  },

  /**
   * Register an atomic operation with the parent.
   *
   * @param {Array} op operation
   * @param {any} val
   * @method _registerAtomic
   * @api private
   * @receiver MongooseArray
   */

  _registerAtomic: function(op, val) {
    if (op === '$set') {
      // $set takes precedence over all other ops.
      // mark entire array modified.
      this._atomics = {$set: val};
      return this;
    }

    var atomics = this._atomics;

    // reset pop/shift after save
    if (op === '$pop' && !('$pop' in atomics)) {
      var _this = this;
      this._parent.once('save', function() {
        _this._popped = _this._shifted = null;
      });
    }

    // check for impossible $atomic combos (Mongo denies more than one
    // $atomic op on a single path
    if (this._atomics.$set ||
        Object.keys(atomics).length && !(op in atomics)) {
      // a different op was previously registered.
      // save the entire thing.
      this._atomics = {$set: this};
      return this;
    }

    var selector;

    if (op === '$pullAll' || op === '$pushAll' || op === '$addToSet') {
      atomics[op] || (atomics[op] = []);
      atomics[op] = atomics[op].concat(val);
    } else if (op === '$pullDocs') {
      var pullOp = atomics['$pull'] || (atomics['$pull'] = {});
      if (val[0] instanceof EmbeddedDocument) {
        selector = pullOp['$or'] || (pullOp['$or'] = []);
        Array.prototype.push.apply(selector, val.map(function(v) {
          return v.toObject({transform: false});
        }));
      } else {
        selector = pullOp['_id'] || (pullOp['_id'] = {$in: []});
        selector['$in'] = selector['$in'].concat(val);
      }
    } else {
      atomics[op] = val;
    }

    return this;
  },

  /**
   * Depopulates stored atomic operation values as necessary for direct insertion to MongoDB.
   *
   * If no atomics exist, we return all array values after conversion.
   *
   * @return {Array}
   * @method $__getAtomics
   * @memberOf MongooseArray
   * @api private
   */

  $__getAtomics: function() {
    var ret = [];
    var keys = Object.keys(this._atomics);
    var i = keys.length;

    if (i === 0) {
      ret[0] = ['$set', this.toObject({depopulate: 1, transform: false})];
      return ret;
    }

    while (i--) {
      var op = keys[i];
      var val = this._atomics[op];

      // the atomic values which are arrays are not MongooseArrays. we
      // need to convert their elements as if they were MongooseArrays
      // to handle populated arrays versus DocumentArrays properly.
      if (isMongooseObject(val)) {
        val = val.toObject({depopulate: 1, transform: false});
      } else if (Array.isArray(val)) {
        val = this.toObject.call(val, {depopulate: 1, transform: false});
      } else if (val.valueOf) {
        val = val.valueOf();
      }

      if (op === '$addToSet') {
        val = {$each: val};
      }

      ret.push([op, val]);
    }

    return ret;
  },

  /**
   * Returns the number of pending atomic operations to send to the db for this array.
   *
   * @api private
   * @return {Number}
   * @method hasAtomics
   * @receiver MongooseArray
   */

  hasAtomics: function hasAtomics() {
    if (!(this._atomics && this._atomics.constructor.name === 'Object')) {
      return 0;
    }

    return Object.keys(this._atomics).length;
  },

  /**
   * Internal helper for .map()
   *
   * @api private
   * @return {Number}
   * @method _mapCast
   * @receiver MongooseArray
   */
  _mapCast: function(val, index) {
    return this._cast(val, this.length + index);
  },

  /**
   * Wraps [`Array#push`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/push) with proper change tracking.
   *
   * @param {Object} [args...]
   * @api public
   * @method push
   * @receiver MongooseArray
   */

  push: function() {
    var values = [].map.call(arguments, this._mapCast, this);
    values = this._schema.applySetters(values, this._parent, undefined,
        undefined, {skipDocumentArrayCast: true});
    var ret = [].push.apply(this, values);

    // $pushAll might be fibbed (could be $push). But it makes it easier to
    // handle what could have been $push, $pushAll combos
    this._registerAtomic('$pushAll', values);
    this._markModified();
    return ret;
  },

  /**
   * Pushes items to the array non-atomically.
   *
   * ####NOTE:
   *
   * _marks the entire array as modified, which if saved, will store it as a `$set` operation, potentially overwritting any changes that happen between when you retrieved the object and when you save it._
   *
   * @param {any} [args...]
   * @api public
   * @method nonAtomicPush
   * @receiver MongooseArray
   */

  nonAtomicPush: function() {
    var values = [].map.call(arguments, this._mapCast, this);
    var ret = [].push.apply(this, values);
    this._registerAtomic('$set', this);
    this._markModified();
    return ret;
  },

  /**
   * Pops the array atomically at most one time per document `save()`.
   *
   * #### NOTE:
   *
   * _Calling this mulitple times on an array before saving sends the same command as calling it once._
   * _This update is implemented using the MongoDB [$pop](http://www.mongodb.org/display/DOCS/Updating/#Updating-%24pop) method which enforces this restriction._
   *
   *      doc.array = [1,2,3];
   *
   *      var popped = doc.array.$pop();
   *      console.log(popped); // 3
   *      console.log(doc.array); // [1,2]
   *
   *      // no affect
   *      popped = doc.array.$pop();
   *      console.log(doc.array); // [1,2]
   *
   *      doc.save(function (err) {
   *        if (err) return handleError(err);
   *
   *        // we saved, now $pop works again
   *        popped = doc.array.$pop();
   *        console.log(popped); // 2
   *        console.log(doc.array); // [1]
   *      })
   *
   * @api public
   * @method $pop
   * @memberOf MongooseArray
   * @see mongodb http://www.mongodb.org/display/DOCS/Updating/#Updating-%24pop
   * @method $pop
   * @receiver MongooseArray
   */

  $pop: function() {
    this._registerAtomic('$pop', 1);
    this._markModified();

    // only allow popping once
    if (this._popped) {
      return;
    }
    this._popped = true;

    return [].pop.call(this);
  },

  /**
   * Wraps [`Array#pop`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/pop) with proper change tracking.
   *
   * ####Note:
   *
   * _marks the entire array as modified which will pass the entire thing to $set potentially overwritting any changes that happen between when you retrieved the object and when you save it._
   *
   * @see MongooseArray#$pop #types_array_MongooseArray-%24pop
   * @api public
   * @method pop
   * @receiver MongooseArray
   */

  pop: function() {
    var ret = [].pop.call(this);
    this._registerAtomic('$set', this);
    this._markModified();
    return ret;
  },

  /**
   * Atomically shifts the array at most one time per document `save()`.
   *
   * ####NOTE:
   *
   * _Calling this mulitple times on an array before saving sends the same command as calling it once._
   * _This update is implemented using the MongoDB [$pop](http://www.mongodb.org/display/DOCS/Updating/#Updating-%24pop) method which enforces this restriction._
   *
   *      doc.array = [1,2,3];
   *
   *      var shifted = doc.array.$shift();
   *      console.log(shifted); // 1
   *      console.log(doc.array); // [2,3]
   *
   *      // no affect
   *      shifted = doc.array.$shift();
   *      console.log(doc.array); // [2,3]
   *
   *      doc.save(function (err) {
   *        if (err) return handleError(err);
   *
   *        // we saved, now $shift works again
   *        shifted = doc.array.$shift();
   *        console.log(shifted ); // 2
   *        console.log(doc.array); // [3]
   *      })
   *
   * @api public
   * @memberOf MongooseArray
   * @method $shift
   * @see mongodb http://www.mongodb.org/display/DOCS/Updating/#Updating-%24pop
   */

  $shift: function $shift() {
    this._registerAtomic('$pop', -1);
    this._markModified();

    // only allow shifting once
    if (this._shifted) {
      return;
    }
    this._shifted = true;

    return [].shift.call(this);
  },

  /**
   * Wraps [`Array#shift`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/unshift) with proper change tracking.
   *
   * ####Example:
   *
   *     doc.array = [2,3];
   *     var res = doc.array.shift();
   *     console.log(res) // 2
   *     console.log(doc.array) // [3]
   *
   * ####Note:
   *
   * _marks the entire array as modified, which if saved, will store it as a `$set` operation, potentially overwritting any changes that happen between when you retrieved the object and when you save it._
   *
   * @api public
   * @method shift
   * @receiver MongooseArray
   */

  shift: function() {
    var ret = [].shift.call(this);
    this._registerAtomic('$set', this);
    this._markModified();
    return ret;
  },

  /**
   * Pulls items from the array atomically. Equality is determined by casting
   * the provided value to an embedded document and comparing using
   * [the `Document.equals()` function.](./api.html#document_Document-equals)
   *
   * ####Examples:
   *
   *     doc.array.pull(ObjectId)
   *     doc.array.pull({ _id: 'someId' })
   *     doc.array.pull(36)
   *     doc.array.pull('tag 1', 'tag 2')
   *
   * To remove a document from a subdocument array we may pass an object with a matching `_id`.
   *
   *     doc.subdocs.push({ _id: 4815162342 })
   *     doc.subdocs.pull({ _id: 4815162342 }) // removed
   *
   * Or we may passing the _id directly and let mongoose take care of it.
   *
   *     doc.subdocs.push({ _id: 4815162342 })
   *     doc.subdocs.pull(4815162342); // works
   *
   * The first pull call will result in a atomic operation on the database, if pull is called repeatedly without saving the document, a $set operation is used on the complete array instead, overwriting possible changes that happened on the database in the meantime.
   *
   * @param {any} [args...]
   * @see mongodb http://www.mongodb.org/display/DOCS/Updating/#Updating-%24pull
   * @api public
   * @method pull
   * @receiver MongooseArray
   */

  pull: function() {
    var values = [].map.call(arguments, this._cast, this),
        cur = this._parent.get(this._path),
        i = cur.length,
        mem;

    while (i--) {
      mem = cur[i];
      if (mem instanceof Document) {
        var some = values.some(function(v) {
          return mem.equals(v);
        });
        if (some) {
          [].splice.call(cur, i, 1);
        }
      } else if (~cur.indexOf.call(values, mem)) {
        [].splice.call(cur, i, 1);
      }
    }

    if (values[0] instanceof EmbeddedDocument) {
      this._registerAtomic('$pullDocs', values.map(function(v) {
        return v._id || v;
      }));
    } else {
      this._registerAtomic('$pullAll', values);
    }

    this._markModified();
    return this;
  },

  /**
   * Wraps [`Array#splice`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/splice) with proper change tracking and casting.
   *
   * ####Note:
   *
   * _marks the entire array as modified, which if saved, will store it as a `$set` operation, potentially overwritting any changes that happen between when you retrieved the object and when you save it._
   *
   * @api public
   * @method splice
   * @receiver MongooseArray
   */

  splice: function splice() {
    var ret, vals, i;

    if (arguments.length) {
      vals = [];
      for (i = 0; i < arguments.length; ++i) {
        vals[i] = i < 2
            ? arguments[i]
            : this._cast(arguments[i], arguments[0] + (i - 2));
      }
      ret = [].splice.apply(this, vals);
      this._registerAtomic('$set', this);
      this._markModified();
    }

    return ret;
  },

  /**
   * Wraps [`Array#unshift`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/unshift) with proper change tracking.
   *
   * ####Note:
   *
   * _marks the entire array as modified, which if saved, will store it as a `$set` operation, potentially overwritting any changes that happen between when you retrieved the object and when you save it._
   *
   * @api public
   * @method unshift
   * @receiver MongooseArray
   */

  unshift: function() {
    var values = [].map.call(arguments, this._cast, this);
    values = this._schema.applySetters(values, this._parent);
    [].unshift.apply(this, values);
    this._registerAtomic('$set', this);
    this._markModified();
    return this.length;
  },

  /**
   * Wraps [`Array#sort`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/sort) with proper change tracking.
   *
   * ####NOTE:
   *
   * _marks the entire array as modified, which if saved, will store it as a `$set` operation, potentially overwritting any changes that happen between when you retrieved the object and when you save it._
   *
   * @api public
   * @method sort
   * @receiver MongooseArray
   */

  sort: function() {
    var ret = [].sort.apply(this, arguments);
    this._registerAtomic('$set', this);
    this._markModified();
    return ret;
  },

  /**
   * Adds values to the array if not already present.
   *
   * ####Example:
   *
   *     console.log(doc.array) // [2,3,4]
   *     var added = doc.array.addToSet(4,5);
   *     console.log(doc.array) // [2,3,4,5]
   *     console.log(added)     // [5]
   *
   * @param {any} [args...]
   * @return {Array} the values that were added
   * @receiver MongooseArray
   * @api public
   * @method addToSet
   */

  addToSet: function addToSet() {
    var values = [].map.call(arguments, this._mapCast, this);
    values = this._schema.applySetters(values, this._parent);
    var added = [];
    var type = '';
    if (values[0] instanceof EmbeddedDocument) {
      type = 'doc';
    } else if (values[0] instanceof Date) {
      type = 'date';
    }

    values.forEach(function(v) {
      var found;
      switch (type) {
        case 'doc':
          found = this.some(function(doc) {
            return doc.equals(v);
          });
          break;
        case 'date':
          var val = +v;
          found = this.some(function(d) {
            return +d === val;
          });
          break;
        default:
          found = ~this.indexOf(v);
      }

      if (!found) {
        [].push.call(this, v);
        this._registerAtomic('$addToSet', v);
        this._markModified();
        [].push.call(added, v);
      }
    }, this);

    return added;
  },

  /**
   * Sets the casted `val` at index `i` and marks the array modified.
   *
   * ####Example:
   *
   *     // given documents based on the following
   *     var Doc = mongoose.model('Doc', new Schema({ array: [Number] }));
   *
   *     var doc = new Doc({ array: [2,3,4] })
   *
   *     console.log(doc.array) // [2,3,4]
   *
   *     doc.array.set(1,"5");
   *     console.log(doc.array); // [2,5,4] // properly cast to number
   *     doc.save() // the change is saved
   *
   *     // VS not using array#set
   *     doc.array[1] = "5";
   *     console.log(doc.array); // [2,"5",4] // no casting
   *     doc.save() // change is not saved
   *
   * @return {Array} this
   * @api public
   * @method set
   * @receiver MongooseArray
   */

  set: function set(i, val) {
    var value = this._cast(val, i);
    value = this._schema.caster instanceof EmbeddedDocument ?
        value :
        this._schema.caster.applySetters(val, this._parent)
    ;
    this[i] = value;
    this._markModified(i);
    return this;
  },

  /**
   * Returns a native js Array.
   *
   * @param {Object} options
   * @return {Array}
   * @api public
   * @method toObject
   * @receiver MongooseArray
   */

  toObject: function(options) {
    if (options && options.depopulate) {
      return this.map(function(doc) {
        return doc instanceof Document
            ? doc.toObject(options)
            : doc;
      });
    }

    return this.slice();
  },

  /**
   * Helper for console.log
   *
   * @api public
   * @method inspect
   * @receiver MongooseArray
   */

  inspect: function() {
    return JSON.stringify(this);
  },

  /**
   * Return the index of `obj` or `-1` if not found.
   *
   * @param {Object} obj the item to look for
   * @return {Number}
   * @api public
   * @method indexOf
   * @receiver MongooseArray
   */

  indexOf: function indexOf(obj) {
    if (obj instanceof ObjectId) {
      obj = obj.toString();
    }
    for (var i = 0, len = this.length; i < len; ++i) {
      if (obj == this[i]) {
        return i;
      }
    }
    return -1;
  }
};

/**
 * Alias of [pull](#types_array_MongooseArray-pull)
 *
 * @see MongooseArray#pull #types_array_MongooseArray-pull
 * @see mongodb http://www.mongodb.org/display/DOCS/Updating/#Updating-%24pull
 * @api public
 * @memberOf MongooseArray
 * @method remove
 */

MongooseArray.mixin.remove = MongooseArray.mixin.pull;

/*!
 * Module exports.
 */

module.exports = exports = MongooseArray;

}).call(this,require("buffer").Buffer)
},{"../document":5,"../utils":51,"./embedded":47,"./objectid":49,"buffer":84}],45:[function(require,module,exports){
(function (Buffer){
/*!
 * Module dependencies.
 */

var Binary = require('../drivers').Binary,
    utils = require('../utils');

/**
 * Mongoose Buffer constructor.
 *
 * Values always have to be passed to the constructor to initialize.
 *
 * @param {Buffer} value
 * @param {String} encode
 * @param {Number} offset
 * @api private
 * @inherits Buffer
 * @see http://bit.ly/f6CnZU
 */

function MongooseBuffer(value, encode, offset) {
  var length = arguments.length;
  var val;

  if (length === 0 || arguments[0] === null || arguments[0] === undefined) {
    val = 0;
  } else {
    val = value;
  }

  var encoding;
  var path;
  var doc;

  if (Array.isArray(encode)) {
    // internal casting
    path = encode[0];
    doc = encode[1];
  } else {
    encoding = encode;
  }

  var buf = new Buffer(val, encoding, offset);
  utils.decorate(buf, MongooseBuffer.mixin);
  buf.isMongooseBuffer = true;

  // make sure these internal props don't show up in Object.keys()
  Object.defineProperties(buf, {
    validators: {value: []},
    _path: {value: path},
    _parent: {value: doc}
  });

  if (doc && typeof path === 'string') {
    Object.defineProperty(buf, '_schema', {
      value: doc.schema.path(path)
    });
  }

  buf._subtype = 0;
  return buf;
}

/*!
 * Inherit from Buffer.
 */

// MongooseBuffer.prototype = new Buffer(0);

MongooseBuffer.mixin = {

  /**
   * Parent owner document
   *
   * @api private
   * @property _parent
   * @receiver MongooseBuffer
   */

  _parent: undefined,

  /**
   * Default subtype for the Binary representing this Buffer
   *
   * @api private
   * @property _subtype
   * @receiver MongooseBuffer
   */

  _subtype: undefined,

  /**
   * Marks this buffer as modified.
   *
   * @api private
   * @method _markModified
   * @receiver MongooseBuffer
   */

  _markModified: function() {
    var parent = this._parent;

    if (parent) {
      parent.markModified(this._path);
    }
    return this;
  },

  /**
   * Writes the buffer.
   *
   * @api public
   * @method write
   * @receiver MongooseBuffer
   */

  write: function() {
    var written = Buffer.prototype.write.apply(this, arguments);

    if (written > 0) {
      this._markModified();
    }

    return written;
  },

  /**
   * Copies the buffer.
   *
   * ####Note:
   *
   * `Buffer#copy` does not mark `target` as modified so you must copy from a `MongooseBuffer` for it to work as expected. This is a work around since `copy` modifies the target, not this.
   *
   * @return {Number} The number of bytes copied.
   * @param {Buffer} target
   * @method copy
   * @receiver MongooseBuffer
   */

  copy: function(target) {
    var ret = Buffer.prototype.copy.apply(this, arguments);

    if (target && target.isMongooseBuffer) {
      target._markModified();
    }

    return ret;
  }
};

/*!
 * Compile other Buffer methods marking this buffer as modified.
 */

(
// node < 0.5
    'writeUInt8 writeUInt16 writeUInt32 writeInt8 writeInt16 writeInt32 ' +
    'writeFloat writeDouble fill ' +
    'utf8Write binaryWrite asciiWrite set ' +

// node >= 0.5
    'writeUInt16LE writeUInt16BE writeUInt32LE writeUInt32BE ' +
    'writeInt16LE writeInt16BE writeInt32LE writeInt32BE ' +
    'writeFloatLE writeFloatBE writeDoubleLE writeDoubleBE'
).split(' ').forEach(function(method) {
  if (!Buffer.prototype[method]) {
    return;
  }
  MongooseBuffer.mixin[method] = function() {
    var ret = Buffer.prototype[method].apply(this, arguments);
    this._markModified();
    return ret;
  };
});

/**
 * Converts this buffer to its Binary type representation.
 *
 * ####SubTypes:
 *
 *   var bson = require('bson')
 *   bson.BSON_BINARY_SUBTYPE_DEFAULT
 *   bson.BSON_BINARY_SUBTYPE_FUNCTION
 *   bson.BSON_BINARY_SUBTYPE_BYTE_ARRAY
 *   bson.BSON_BINARY_SUBTYPE_UUID
 *   bson.BSON_BINARY_SUBTYPE_MD5
 *   bson.BSON_BINARY_SUBTYPE_USER_DEFINED
 *
 *   doc.buffer.toObject(bson.BSON_BINARY_SUBTYPE_USER_DEFINED);
 *
 * @see http://bsonspec.org/#/specification
 * @param {Hex} [subtype]
 * @return {Binary}
 * @api public
 * @method toObject
 * @receiver MongooseBuffer
 */

MongooseBuffer.mixin.toObject = function(options) {
  var subtype = typeof options === 'number'
      ? options
      : (this._subtype || 0);
  return new Binary(this, subtype);
};

/**
 * Determines if this buffer is equals to `other` buffer
 *
 * @param {Buffer} other
 * @return {Boolean}
 * @method equals
 * @receiver MongooseBuffer
 */

MongooseBuffer.mixin.equals = function(other) {
  if (!Buffer.isBuffer(other)) {
    return false;
  }

  if (this.length !== other.length) {
    return false;
  }

  for (var i = 0; i < this.length; ++i) {
    if (this[i] !== other[i]) {
      return false;
    }
  }

  return true;
};

/**
 * Sets the subtype option and marks the buffer modified.
 *
 * ####SubTypes:
 *
 *   var bson = require('bson')
 *   bson.BSON_BINARY_SUBTYPE_DEFAULT
 *   bson.BSON_BINARY_SUBTYPE_FUNCTION
 *   bson.BSON_BINARY_SUBTYPE_BYTE_ARRAY
 *   bson.BSON_BINARY_SUBTYPE_UUID
 *   bson.BSON_BINARY_SUBTYPE_MD5
 *   bson.BSON_BINARY_SUBTYPE_USER_DEFINED
 *
 *   doc.buffer.subtype(bson.BSON_BINARY_SUBTYPE_UUID);
 *
 * @see http://bsonspec.org/#/specification
 * @param {Hex} subtype
 * @api public
 * @method subtype
 * @receiver MongooseBuffer
 */

MongooseBuffer.mixin.subtype = function(subtype) {
  if (typeof subtype !== 'number') {
    throw new TypeError('Invalid subtype. Expected a number');
  }

  if (this._subtype !== subtype) {
    this._markModified();
  }

  this._subtype = subtype;
};

/*!
 * Module exports.
 */

MongooseBuffer.Binary = Binary;

module.exports = MongooseBuffer;

}).call(this,require("buffer").Buffer)
},{"../drivers":11,"../utils":51,"buffer":84}],46:[function(require,module,exports){
(function (Buffer){
/*!
 * Module dependencies.
 */

var MongooseArray = require('./array'),
    ObjectId = require('./objectid'),
    ObjectIdSchema = require('../schema/objectid'),
    utils = require('../utils'),
    Document = require('../document');

/**
 * DocumentArray constructor
 *
 * @param {Array} values
 * @param {String} path the path to this array
 * @param {Document} doc parent document
 * @api private
 * @return {MongooseDocumentArray}
 * @inherits MongooseArray
 * @see http://bit.ly/f6CnZU
 */

function MongooseDocumentArray(values, path, doc) {
  var arr = [].concat(values);
  arr._path = path;

  var props = {
    isMongooseArray: true,
    isMongooseDocumentArray: true,
    validators: [],
    _atomics: {},
    _schema: void 0,
    _handlers: void 0
  };

  // Values always have to be passed to the constructor to initialize, since
  // otherwise MongooseArray#push will mark the array as modified to the parent.
  var keysMA = Object.keys(MongooseArray.mixin);
  var numKeys = keysMA.length;
  for (var j = 0; j < numKeys; ++j) {
    arr[keysMA[j]] = MongooseArray.mixin[keysMA[j]];
  }

  var keysMDA = Object.keys(MongooseDocumentArray.mixin);
  numKeys = keysMDA.length;
  for (var i = 0; i < numKeys; ++i) {
    arr[keysMDA[i]] = MongooseDocumentArray.mixin[keysMDA[i]];
  }

  var keysP = Object.keys(props);
  numKeys = keysP.length;
  for (var k = 0; k < numKeys; ++k) {
    arr[keysP[k]] = props[keysP[k]];
  }

  // Because doc comes from the context of another function, doc === global
  // can happen if there was a null somewhere up the chain (see #3020 && #3034)
  // RB Jun 17, 2015 updated to check for presence of expected paths instead
  // to make more proof against unusual node environments
  if (doc && doc instanceof Document) {
    arr._parent = doc;
    arr._schema = doc.schema.path(path);
    arr._handlers = {
      isNew: arr.notify('isNew'),
      save: arr.notify('save')
    };

    doc.on('save', arr._handlers.save);
    doc.on('isNew', arr._handlers.isNew);
  }

  return arr;
}

/*!
 * Inherits from MongooseArray
 */
// MongooseDocumentArray.mixin = Object.create( MongooseArray.mixin );
MongooseDocumentArray.mixin = {
  /*!
   * ignore
   */
  toBSON: function() {
    return this.toObject({ transform: false });
  },

  /**
   * Overrides MongooseArray#cast
   *
   * @method _cast
   * @api private
   * @receiver MongooseDocumentArray
   */

  _cast: function(value, index) {
    if (value instanceof this._schema.casterConstructor) {
      if (!(value.__parent && value.__parentArray)) {
        // value may have been created using array.create()
        value.__parent = this._parent;
        value.__parentArray = this;
      }
      value.__index = index;
      return value;
    }

    if (value === undefined || value === null) {
      return null;
    }

    // handle cast('string') or cast(ObjectId) etc.
    // only objects are permitted so we can safely assume that
    // non-objects are to be interpreted as _id
    if (Buffer.isBuffer(value) ||
        value instanceof ObjectId || !utils.isObject(value)) {
      value = {_id: value};
    }
    return new this._schema.casterConstructor(value, this, undefined, undefined, index);
  },

  /**
   * Searches array items for the first document with a matching _id.
   *
   * ####Example:
   *
   *     var embeddedDoc = m.array.id(some_id);
   *
   * @return {EmbeddedDocument|null} the subdocument or null if not found.
   * @param {ObjectId|String|Number|Buffer} id
   * @TODO cast to the _id based on schema for proper comparison
   * @method id
   * @api public
   * @receiver MongooseDocumentArray
   */

  id: function(id) {
    var casted,
        sid,
        _id;

    try {
      var casted_ = ObjectIdSchema.prototype.cast.call({}, id);
      if (casted_) {
        casted = String(casted_);
      }
    } catch (e) {
      casted = null;
    }

    for (var i = 0, l = this.length; i < l; i++) {
      _id = this[i].get('_id');

      if (_id === null || typeof _id === 'undefined') {
        continue;
      } else if (_id instanceof Document) {
        sid || (sid = String(id));
        if (sid == _id._id) {
          return this[i];
        }
      } else if (!(id instanceof ObjectId) && !(_id instanceof ObjectId)) {
        if (utils.deepEqual(id, _id)) {
          return this[i];
        }
      } else if (casted == _id) {
        return this[i];
      }
    }

    return null;
  },

  /**
   * Returns a native js Array of plain js objects
   *
   * ####NOTE:
   *
   * _Each sub-document is converted to a plain object by calling its `#toObject` method._
   *
   * @param {Object} [options] optional options to pass to each documents `toObject` method call during conversion
   * @return {Array}
   * @method toObject
   * @api public
   * @receiver MongooseDocumentArray
   */

  toObject: function(options) {
    return this.map(function(doc) {
      return doc && doc.toObject(options) || null;
    });
  },

  /**
   * Helper for console.log
   *
   * @method inspect
   * @api public
   * @receiver MongooseDocumentArray
   */

  inspect: function() {
    return Array.prototype.slice.call(this);
  },

  /**
   * Creates a subdocument casted to this schema.
   *
   * This is the same subdocument constructor used for casting.
   *
   * @param {Object} obj the value to cast to this arrays SubDocument schema
   * @method create
   * @api public
   * @receiver MongooseDocumentArray
   */

  create: function(obj) {
    return new this._schema.casterConstructor(obj);
  },

  /**
   * Creates a fn that notifies all child docs of `event`.
   *
   * @param {String} event
   * @return {Function}
   * @method notify
   * @api private
   * @receiver MongooseDocumentArray
   */

  notify: function notify(event) {
    var _this = this;
    return function notify(val) {
      var i = _this.length;
      while (i--) {
        if (!_this[i]) {
          continue;
        }
        switch (event) {
          // only swap for save event for now, we may change this to all event types later
          case 'save':
            val = _this[i];
            break;
          default:
            // NO-OP
            break;
        }
        _this[i].emit(event, val);
      }
    };
  }

};

/*!
 * Module exports.
 */

module.exports = MongooseDocumentArray;

}).call(this,require("buffer").Buffer)
},{"../document":5,"../schema/objectid":36,"../utils":51,"./array":44,"./objectid":49,"buffer":84}],47:[function(require,module,exports){
/* eslint no-func-assign: 1 */

/*!
 * Module dependencies.
 */

var Document = require('../document_provider')();
var PromiseProvider = require('../promise_provider');

/**
 * EmbeddedDocument constructor.
 *
 * @param {Object} obj js object returned from the db
 * @param {MongooseDocumentArray} parentArr the parent array of this document
 * @param {Boolean} skipId
 * @inherits Document
 * @api private
 */

function EmbeddedDocument(obj, parentArr, skipId, fields, index) {
  if (parentArr) {
    this.__parentArray = parentArr;
    this.__parent = parentArr._parent;
  } else {
    this.__parentArray = undefined;
    this.__parent = undefined;
  }
  this.__index = index;

  Document.call(this, obj, fields, skipId);

  var _this = this;
  this.on('isNew', function(val) {
    _this.isNew = val;
  });
}

/*!
 * Inherit from Document
 */
EmbeddedDocument.prototype = Object.create(Document.prototype);
EmbeddedDocument.prototype.constructor = EmbeddedDocument;

EmbeddedDocument.prototype.toBSON = function() {
  return this.toObject({ transform: false });
};

/**
 * Marks the embedded doc modified.
 *
 * ####Example:
 *
 *     var doc = blogpost.comments.id(hexstring);
 *     doc.mixed.type = 'changed';
 *     doc.markModified('mixed.type');
 *
 * @param {String} path the path which changed
 * @api public
 * @receiver EmbeddedDocument
 */

EmbeddedDocument.prototype.markModified = function(path) {
  this.$__.activePaths.modify(path);
  if (!this.__parentArray) {
    return;
  }

  if (this.isNew) {
    // Mark the WHOLE parent array as modified
    // if this is a new document (i.e., we are initializing
    // a document),
    this.__parentArray._markModified();
  } else {
    this.__parentArray._markModified(this, path);
  }
};

/*!
 * ignore
 */

EmbeddedDocument.prototype.populate = function() {
  throw new Error('Mongoose does not support calling populate() on nested ' +
    'docs. Instead of `doc.arr[0].populate("path")`, use ' +
    '`doc.populate("arr.0.path")`');
};

/**
 * Used as a stub for [hooks.js](https://github.com/bnoguchi/hooks-js/tree/31ec571cef0332e21121ee7157e0cf9728572cc3)
 *
 * ####NOTE:
 *
 * _This is a no-op. Does not actually save the doc to the db._
 *
 * @param {Function} [fn]
 * @return {Promise} resolved Promise
 * @api private
 */

EmbeddedDocument.prototype.save = function(fn) {
  var Promise = PromiseProvider.get();
  return new Promise.ES6(function(resolve) {
    fn && fn();
    resolve();
  });
};

/*!
 * Registers remove event listeners for triggering
 * on subdocuments.
 *
 * @param {EmbeddedDocument} sub
 * @api private
 */

function registerRemoveListener(sub) {
  var owner = sub.ownerDocument();

  function emitRemove() {
    owner.removeListener('save', emitRemove);
    owner.removeListener('remove', emitRemove);
    sub.emit('remove', sub);
    owner = sub = null;
  }

  owner.on('save', emitRemove);
  owner.on('remove', emitRemove);
}

/**
 * Removes the subdocument from its parent array.
 *
 * @param {Object} [options]
 * @param {Function} [fn]
 * @api public
 */

EmbeddedDocument.prototype.remove = function(options, fn) {
  if ( typeof options === 'function' && !fn ) {
    fn = options;
    options = undefined;
  }
  if (!this.__parentArray || (options && options.noop)) {
    fn && fn(null);
    return this;
  }

  var _id;
  if (!this.willRemove) {
    _id = this._doc._id;
    if (!_id) {
      throw new Error('For your own good, Mongoose does not know ' +
          'how to remove an EmbeddedDocument that has no _id');
    }
    this.__parentArray.pull({_id: _id});
    this.willRemove = true;
    registerRemoveListener(this);
  }

  if (fn) {
    fn(null);
  }

  return this;
};

/**
 * Override #update method of parent documents.
 * @api private
 */

EmbeddedDocument.prototype.update = function() {
  throw new Error('The #update method is not available on EmbeddedDocuments');
};

/**
 * Helper for console.log
 *
 * @api public
 */

EmbeddedDocument.prototype.inspect = function() {
  return this.toObject({ transform: false, retainKeyOrder: true });
};

/**
 * Marks a path as invalid, causing validation to fail.
 *
 * @param {String} path the field to invalidate
 * @param {String|Error} err error which states the reason `path` was invalid
 * @return {Boolean}
 * @api public
 */

EmbeddedDocument.prototype.invalidate = function(path, err, val, first) {
  Document.prototype.invalidate.call(this, path, err, val);
  if (!this.__parent) {
    if (err.name === 'ValidatorError') {
      return true;
    }
    throw err;
  }

  var index = this.__index;
  if (typeof index !== 'undefined') {
    var parentPath = this.__parentArray._path;
    var fullPath = [parentPath, index, path].join('.');
    this.__parent.invalidate(fullPath, err, val);
  }

  if (first) {
    this.$__.validationError = this.ownerDocument().$__.validationError;
  }

  return true;
};

/**
 * Marks a path as valid, removing existing validation errors.
 *
 * @param {String} path the field to mark as valid
 * @api private
 * @method $markValid
 * @receiver EmbeddedDocument
 */

EmbeddedDocument.prototype.$markValid = function(path) {
  if (!this.__parent) {
    return;
  }

  var index = this.__index;
  if (typeof index !== 'undefined') {
    var parentPath = this.__parentArray._path;
    var fullPath = [parentPath, index, path].join('.');
    this.__parent.$markValid(fullPath);
  }
};

/**
 * Checks if a path is invalid
 *
 * @param {String} path the field to check
 * @api private
 * @method $isValid
 * @receiver EmbeddedDocument
 */

EmbeddedDocument.prototype.$isValid = function(path) {
  var index = this.__index;
  if (typeof index !== 'undefined' && this.__parent) {
    return !this.__parent.$__.validationError ||
      !this.__parent.$__.validationError.errors[this.$__fullPath(path)];
  }

  return true;
};

/**
 * Returns the top level document of this sub-document.
 *
 * @return {Document}
 */

EmbeddedDocument.prototype.ownerDocument = function() {
  if (this.$__.ownerDocument) {
    return this.$__.ownerDocument;
  }

  var parent = this.__parent;
  if (!parent) {
    return this;
  }

  while (parent.__parent || parent.$parent) {
    parent = parent.__parent || parent.$parent;
  }

  this.$__.ownerDocument = parent;
  return this.$__.ownerDocument;
};

/**
 * Returns the full path to this document. If optional `path` is passed, it is appended to the full path.
 *
 * @param {String} [path]
 * @return {String}
 * @api private
 * @method $__fullPath
 * @memberOf EmbeddedDocument
 */

EmbeddedDocument.prototype.$__fullPath = function(path) {
  if (!this.$__.fullPath) {
    var parent = this; // eslint-disable-line consistent-this
    if (!parent.__parent) {
      return path;
    }

    var paths = [];
    while (parent.__parent || parent.$parent) {
      if (parent.__parent) {
        paths.unshift(parent.__parentArray._path);
      } else {
        paths.unshift(parent.$basePath);
      }
      parent = parent.__parent || parent.$parent;
    }

    this.$__.fullPath = paths.join('.');

    if (!this.$__.ownerDocument) {
      // optimization
      this.$__.ownerDocument = parent;
    }
  }

  return path
      ? this.$__.fullPath + '.' + path
      : this.$__.fullPath;
};

/**
 * Returns this sub-documents parent document.
 *
 * @api public
 */

EmbeddedDocument.prototype.parent = function() {
  return this.__parent;
};

/**
 * Returns this sub-documents parent array.
 *
 * @api public
 */

EmbeddedDocument.prototype.parentArray = function() {
  return this.__parentArray;
};

/*!
 * Module exports.
 */

module.exports = EmbeddedDocument;

},{"../document_provider":6,"../promise_provider":25}],48:[function(require,module,exports){

/*!
 * Module exports.
 */

exports.Array = require('./array');
exports.Buffer = require('./buffer');

exports.Document = // @deprecate
exports.Embedded = require('./embedded');

exports.DocumentArray = require('./documentarray');
exports.ObjectId = require('./objectid');

exports.Subdocument = require('./subdocument');

},{"./array":44,"./buffer":45,"./documentarray":46,"./embedded":47,"./objectid":49,"./subdocument":50}],49:[function(require,module,exports){
/**
 * ObjectId type constructor
 *
 * ####Example
 *
 *     var id = new mongoose.Types.ObjectId;
 *
 * @constructor ObjectId
 */

var ObjectId = require('../drivers').ObjectId;

module.exports = ObjectId;

},{"../drivers":11}],50:[function(require,module,exports){
var Document = require('../document');
var PromiseProvider = require('../promise_provider');

module.exports = Subdocument;

/**
 * Subdocument constructor.
 *
 * @inherits Document
 * @api private
 */

function Subdocument(value, fields) {
  this.$isSingleNested = true;
  Document.call(this, value, fields);
}

Subdocument.prototype = Object.create(Document.prototype);

Subdocument.prototype.toBSON = function() {
  return this.toObject({ transform: false });
},

/**
 * Used as a stub for [hooks.js](https://github.com/bnoguchi/hooks-js/tree/31ec571cef0332e21121ee7157e0cf9728572cc3)
 *
 * ####NOTE:
 *
 * _This is a no-op. Does not actually save the doc to the db._
 *
 * @param {Function} [fn]
 * @return {Promise} resolved Promise
 * @api private
 */

Subdocument.prototype.save = function(fn) {
  var Promise = PromiseProvider.get();
  return new Promise.ES6(function(resolve) {
    fn && fn();
    resolve();
  });
};

Subdocument.prototype.$isValid = function(path) {
  if (this.$parent) {
    return this.$parent.$isValid([this.$basePath, path].join('.'));
  }
};

Subdocument.prototype.markModified = function(path) {
  Document.prototype.markModified.call(this, path);
  if (this.$parent) {
    if (this.$parent.isDirectModified(this.$basePath)) {
      return;
    }
    this.$parent.markModified([this.$basePath, path].join('.'));
  }
};

Subdocument.prototype.$markValid = function(path) {
  if (this.$parent) {
    this.$parent.$markValid([this.$basePath, path].join('.'));
  }
};

Subdocument.prototype.invalidate = function(path, err, val) {
  Document.prototype.invalidate.call(this, path, err, val);
  if (this.$parent) {
    this.$parent.invalidate([this.$basePath, path].join('.'), err, val);
  } else if (err.kind === 'cast' || err.name === 'CastError') {
    throw err;
  }
};

/**
 * Returns the top level document of this sub-document.
 *
 * @return {Document}
 */

Subdocument.prototype.ownerDocument = function() {
  if (this.$__.ownerDocument) {
    return this.$__.ownerDocument;
  }

  var parent = this.$parent;
  if (!parent) {
    return this;
  }

  while (parent.$parent || parent.__parent) {
    parent = parent.$parent || parent.__parent;
  }
  this.$__.ownerDocument = parent;
  return this.$__.ownerDocument;
};

/**
 * Null-out this subdoc
 *
 * @param {Object} [options]
 * @param {Function} [callback] optional callback for compatibility with Document.prototype.remove
 */

Subdocument.prototype.remove = function(options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = null;
  }

  // If removing entire doc, no need to remove subdoc
  if (!options || !options.noop) {
    this.$parent.set(this.$basePath, null);
    registerRemoveListener(this);
  }

  if (typeof callback === 'function') {
    callback(null);
  }
};

/*!
 * ignore
 */

Subdocument.prototype.populate = function() {
  throw new Error('Mongoose does not support calling populate() on nested ' +
    'docs. Instead of `doc.nested.populate("path")`, use ' +
    '`doc.populate("nested.path")`');
};

/*!
 * Registers remove event listeners for triggering
 * on subdocuments.
 *
 * @param {EmbeddedDocument} sub
 * @api private
 */

function registerRemoveListener(sub) {
  var owner = sub.ownerDocument();

  function emitRemove() {
    owner.removeListener('save', emitRemove);
    owner.removeListener('remove', emitRemove);
    sub.emit('remove', sub);
    owner = sub = null;
  }

  owner.on('save', emitRemove);
  owner.on('remove', emitRemove);
}

},{"../document":5,"../promise_provider":25}],51:[function(require,module,exports){
(function (process,Buffer){
/*!
 * Module dependencies.
 */

var ObjectId = require('./types/objectid');
var cloneRegExp = require('regexp-clone');
var sliced = require('sliced');
var mpath = require('mpath');
var ms = require('ms');
var MongooseBuffer;
var MongooseArray;
var Document;

/*!
 * Produces a collection name from model `name`.
 *
 * @param {String} name a model name
 * @return {String} a collection name
 * @api private
 */

exports.toCollectionName = function(name, options) {
  options = options || {};
  if (name === 'system.profile') {
    return name;
  }
  if (name === 'system.indexes') {
    return name;
  }
  if (options.pluralization === false) {
    return name;
  }
  return pluralize(name.toLowerCase());
};

/**
 * Pluralization rules.
 *
 * These rules are applied while processing the argument to `toCollectionName`.
 *
 * @deprecated remove in 4.x gh-1350
 */

exports.pluralization = [
  [/(m)an$/gi, '$1en'],
  [/(pe)rson$/gi, '$1ople'],
  [/(child)$/gi, '$1ren'],
  [/^(ox)$/gi, '$1en'],
  [/(ax|test)is$/gi, '$1es'],
  [/(octop|vir)us$/gi, '$1i'],
  [/(alias|status)$/gi, '$1es'],
  [/(bu)s$/gi, '$1ses'],
  [/(buffal|tomat|potat)o$/gi, '$1oes'],
  [/([ti])um$/gi, '$1a'],
  [/sis$/gi, 'ses'],
  [/(?:([^f])fe|([lr])f)$/gi, '$1$2ves'],
  [/(hive)$/gi, '$1s'],
  [/([^aeiouy]|qu)y$/gi, '$1ies'],
  [/(x|ch|ss|sh)$/gi, '$1es'],
  [/(matr|vert|ind)ix|ex$/gi, '$1ices'],
  [/([m|l])ouse$/gi, '$1ice'],
  [/(kn|w|l)ife$/gi, '$1ives'],
  [/(quiz)$/gi, '$1zes'],
  [/s$/gi, 's'],
  [/([^a-z])$/, '$1'],
  [/$/gi, 's']
];
var rules = exports.pluralization;

/**
 * Uncountable words.
 *
 * These words are applied while processing the argument to `toCollectionName`.
 * @api public
 */

exports.uncountables = [
  'advice',
  'energy',
  'excretion',
  'digestion',
  'cooperation',
  'health',
  'justice',
  'labour',
  'machinery',
  'equipment',
  'information',
  'pollution',
  'sewage',
  'paper',
  'money',
  'species',
  'series',
  'rain',
  'rice',
  'fish',
  'sheep',
  'moose',
  'deer',
  'news',
  'expertise',
  'status',
  'media'
];
var uncountables = exports.uncountables;

/*!
 * Pluralize function.
 *
 * @author TJ Holowaychuk (extracted from _ext.js_)
 * @param {String} string to pluralize
 * @api private
 */

function pluralize(str) {
  var found;
  if (!~uncountables.indexOf(str.toLowerCase())) {
    found = rules.filter(function(rule) {
      return str.match(rule[0]);
    });
    if (found[0]) {
      return str.replace(found[0][0], found[0][1]);
    }
  }
  return str;
}

/*!
 * Determines if `a` and `b` are deep equal.
 *
 * Modified from node/lib/assert.js
 *
 * @param {any} a a value to compare to `b`
 * @param {any} b a value to compare to `a`
 * @return {Boolean}
 * @api private
 */

exports.deepEqual = function deepEqual(a, b) {
  if (a === b) {
    return true;
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  if (a instanceof ObjectId && b instanceof ObjectId) {
    return a.toString() === b.toString();
  }

  if (a instanceof RegExp && b instanceof RegExp) {
    return a.source === b.source &&
        a.ignoreCase === b.ignoreCase &&
        a.multiline === b.multiline &&
        a.global === b.global;
  }

  if (typeof a !== 'object' && typeof b !== 'object') {
    return a == b;
  }

  if (a === null || b === null || a === undefined || b === undefined) {
    return false;
  }

  if (a.prototype !== b.prototype) {
    return false;
  }

  // Handle MongooseNumbers
  if (a instanceof Number && b instanceof Number) {
    return a.valueOf() === b.valueOf();
  }

  if (Buffer.isBuffer(a)) {
    return exports.buffer.areEqual(a, b);
  }

  if (isMongooseObject(a)) {
    a = a.toObject();
  }
  if (isMongooseObject(b)) {
    b = b.toObject();
  }

  try {
    var ka = Object.keys(a),
        kb = Object.keys(b),
        key, i;
  } catch (e) {
    // happens when one is a string literal and the other isn't
    return false;
  }

  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length !== kb.length) {
    return false;
  }

  // the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();

  // ~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] !== kb[i]) {
      return false;
    }
  }

  // equivalent values for every corresponding key, and
  // ~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!deepEqual(a[key], b[key])) {
      return false;
    }
  }

  return true;
};

/*!
 * Object clone with Mongoose natives support.
 *
 * If options.minimize is true, creates a minimal data object. Empty objects and undefined values will not be cloned. This makes the data payload sent to MongoDB as small as possible.
 *
 * Functions are never cloned.
 *
 * @param {Object} obj the object to clone
 * @param {Object} options
 * @return {Object} the cloned object
 * @api private
 */

exports.clone = function clone(obj, options) {
  if (obj === undefined || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return cloneArray(obj, options);
  }

  if (isMongooseObject(obj)) {
    if (options && options.json && typeof obj.toJSON === 'function') {
      return obj.toJSON(options);
    }
    return obj.toObject(options);
  }

  if (obj.constructor) {
    switch (exports.getFunctionName(obj.constructor)) {
      case 'Object':
        return cloneObject(obj, options);
      case 'Date':
        return new obj.constructor(+obj);
      case 'RegExp':
        return cloneRegExp(obj);
      default:
        // ignore
        break;
    }
  }

  if (obj instanceof ObjectId) {
    return new ObjectId(obj.id);
  }

  if (!obj.constructor && exports.isObject(obj)) {
    // object created with Object.create(null)
    return cloneObject(obj, options);
  }

  if (obj.valueOf) {
    return obj.valueOf();
  }
};
var clone = exports.clone;

/*!
 * ignore
 */

function cloneObject(obj, options) {
  var retainKeyOrder = options && options.retainKeyOrder,
      minimize = options && options.minimize,
      ret = {},
      hasKeys,
      keys,
      val,
      k,
      i;

  if (retainKeyOrder) {
    for (k in obj) {
      val = clone(obj[k], options);

      if (!minimize || (typeof val !== 'undefined')) {
        hasKeys || (hasKeys = true);
        ret[k] = val;
      }
    }
  } else {
    // faster

    keys = Object.keys(obj);
    i = keys.length;

    while (i--) {
      k = keys[i];
      val = clone(obj[k], options);

      if (!minimize || (typeof val !== 'undefined')) {
        if (!hasKeys) {
          hasKeys = true;
        }
        ret[k] = val;
      }
    }
  }

  return minimize
      ? hasKeys && ret
      : ret;
}

function cloneArray(arr, options) {
  var ret = [];
  for (var i = 0, l = arr.length; i < l; i++) {
    ret.push(clone(arr[i], options));
  }
  return ret;
}

/*!
 * Shallow copies defaults into options.
 *
 * @param {Object} defaults
 * @param {Object} options
 * @return {Object} the merged object
 * @api private
 */

exports.options = function(defaults, options) {
  var keys = Object.keys(defaults),
      i = keys.length,
      k;

  options = options || {};

  while (i--) {
    k = keys[i];
    if (!(k in options)) {
      options[k] = defaults[k];
    }
  }

  return options;
};

/*!
 * Generates a random string
 *
 * @api private
 */

exports.random = function() {
  return Math.random().toString().substr(3);
};

/*!
 * Merges `from` into `to` without overwriting existing properties.
 *
 * @param {Object} to
 * @param {Object} from
 * @api private
 */

exports.merge = function merge(to, from) {
  var keys = Object.keys(from),
      i = keys.length,
      key;

  while (i--) {
    key = keys[i];
    if (typeof to[key] === 'undefined') {
      to[key] = from[key];
    } else if (exports.isObject(from[key])) {
      merge(to[key], from[key]);
    }
  }
};

/*!
 * toString helper
 */

var toString = Object.prototype.toString;

/*!
 * Applies toObject recursively.
 *
 * @param {Document|Array|Object} obj
 * @return {Object}
 * @api private
 */

exports.toObject = function toObject(obj) {
  Document || (Document = require('./document'));
  var ret;

  if (exports.isNullOrUndefined(obj)) {
    return obj;
  }

  if (obj instanceof Document) {
    return obj.toObject();
  }

  if (Array.isArray(obj)) {
    ret = [];

    for (var i = 0, len = obj.length; i < len; ++i) {
      ret.push(toObject(obj[i]));
    }

    return ret;
  }

  if ((obj.constructor && exports.getFunctionName(obj.constructor) === 'Object') ||
      (!obj.constructor && exports.isObject(obj))) {
    ret = {};

    for (var k in obj) {
      ret[k] = toObject(obj[k]);
    }

    return ret;
  }

  return obj;
};

/*!
 * Determines if `arg` is an object.
 *
 * @param {Object|Array|String|Function|RegExp|any} arg
 * @api private
 * @return {Boolean}
 */

exports.isObject = function(arg) {
  if (Buffer.isBuffer(arg)) {
    return true;
  }
  return toString.call(arg) === '[object Object]';
};

/*!
 * A faster Array.prototype.slice.call(arguments) alternative
 * @api private
 */

exports.args = sliced;

/*!
 * process.nextTick helper.
 *
 * Wraps `callback` in a try/catch + nextTick.
 *
 * node-mongodb-native has a habit of state corruption when an error is immediately thrown from within a collection callback.
 *
 * @param {Function} callback
 * @api private
 */

exports.tick = function tick(callback) {
  if (typeof callback !== 'function') {
    return;
  }
  return function() {
    try {
      callback.apply(this, arguments);
    } catch (err) {
      // only nextTick on err to get out of
      // the event loop and avoid state corruption.
      process.nextTick(function() {
        throw err;
      });
    }
  };
};

/*!
 * Returns if `v` is a mongoose object that has a `toObject()` method we can use.
 *
 * This is for compatibility with libs like Date.js which do foolish things to Natives.
 *
 * @param {any} v
 * @api private
 */

exports.isMongooseObject = function(v) {
  Document || (Document = require('./document'));
  MongooseArray || (MongooseArray = require('./types').Array);
  MongooseBuffer || (MongooseBuffer = require('./types').Buffer);

  return v instanceof Document ||
      (v && v.isMongooseArray) ||
      (v && v.isMongooseBuffer);
};
var isMongooseObject = exports.isMongooseObject;

/*!
 * Converts `expires` options of index objects to `expiresAfterSeconds` options for MongoDB.
 *
 * @param {Object} object
 * @api private
 */

exports.expires = function expires(object) {
  if (!(object && object.constructor.name === 'Object')) {
    return;
  }
  if (!('expires' in object)) {
    return;
  }

  var when;
  if (typeof object.expires !== 'string') {
    when = object.expires;
  } else {
    when = Math.round(ms(object.expires) / 1000);
  }
  object.expireAfterSeconds = when;
  delete object.expires;
};

/*!
 * Populate options constructor
 */

function PopulateOptions(path, select, match, options, model, subPopulate) {
  this.path = path;
  this.match = match;
  this.select = select;
  this.options = options;
  this.model = model;
  if (typeof subPopulate === 'object') {
    this.populate = subPopulate;
  }
  this._docs = {};
}

// make it compatible with utils.clone
PopulateOptions.prototype.constructor = Object;

// expose
exports.PopulateOptions = PopulateOptions;

/*!
 * populate helper
 */

exports.populate = function populate(path, select, model, match, options, subPopulate) {
  // The order of select/conditions args is opposite Model.find but
  // necessary to keep backward compatibility (select could be
  // an array, string, or object literal).

  // might have passed an object specifying all arguments
  if (arguments.length === 1) {
    if (path instanceof PopulateOptions) {
      return [path];
    }

    if (Array.isArray(path)) {
      return path.map(function(o) {
        return exports.populate(o)[0];
      });
    }

    if (exports.isObject(path)) {
      match = path.match;
      options = path.options;
      select = path.select;
      model = path.model;
      subPopulate = path.populate;
      path = path.path;
    }
  } else if (typeof model !== 'string' && typeof model !== 'function') {
    options = match;
    match = model;
    model = undefined;
  }

  if (typeof path !== 'string') {
    throw new TypeError('utils.populate: invalid path. Expected string. Got typeof `' + typeof path + '`');
  }

  if (typeof subPopulate === 'object') {
    subPopulate = exports.populate(subPopulate);
  }

  var ret = [];
  var paths = path.split(' ');
  options = exports.clone(options, { retainKeyOrder: true });
  for (var i = 0; i < paths.length; ++i) {
    ret.push(new PopulateOptions(paths[i], select, match, options, model, subPopulate));
  }

  return ret;
};

/*!
 * Return the value of `obj` at the given `path`.
 *
 * @param {String} path
 * @param {Object} obj
 */

exports.getValue = function(path, obj, map) {
  return mpath.get(path, obj, '_doc', map);
};

/*!
 * Sets the value of `obj` at the given `path`.
 *
 * @param {String} path
 * @param {Anything} val
 * @param {Object} obj
 */

exports.setValue = function(path, val, obj, map) {
  mpath.set(path, val, obj, '_doc', map);
};

/*!
 * Returns an array of values from object `o`.
 *
 * @param {Object} o
 * @return {Array}
 * @private
 */

exports.object = {};
exports.object.vals = function vals(o) {
  var keys = Object.keys(o),
      i = keys.length,
      ret = [];

  while (i--) {
    ret.push(o[keys[i]]);
  }

  return ret;
};

/*!
 * @see exports.options
 */

exports.object.shallowCopy = exports.options;

/*!
 * Safer helper for hasOwnProperty checks
 *
 * @param {Object} obj
 * @param {String} prop
 */

var hop = Object.prototype.hasOwnProperty;
exports.object.hasOwnProperty = function(obj, prop) {
  return hop.call(obj, prop);
};

/*!
 * Determine if `val` is null or undefined
 *
 * @return {Boolean}
 */

exports.isNullOrUndefined = function(val) {
  return val === null || val === undefined;
};

/*!
 * ignore
 */

exports.array = {};

/*!
 * Flattens an array.
 *
 * [ 1, [ 2, 3, [4] ]] -> [1,2,3,4]
 *
 * @param {Array} arr
 * @param {Function} [filter] If passed, will be invoked with each item in the array. If `filter` returns a falsey value, the item will not be included in the results.
 * @return {Array}
 * @private
 */

exports.array.flatten = function flatten(arr, filter, ret) {
  ret || (ret = []);

  arr.forEach(function(item) {
    if (Array.isArray(item)) {
      flatten(item, filter, ret);
    } else {
      if (!filter || filter(item)) {
        ret.push(item);
      }
    }
  });

  return ret;
};

/*!
 * Removes duplicate values from an array
 *
 * [1, 2, 3, 3, 5] => [1, 2, 3, 5]
 * [ ObjectId("550988ba0c19d57f697dc45e"), ObjectId("550988ba0c19d57f697dc45e") ]
 *    => [ObjectId("550988ba0c19d57f697dc45e")]
 *
 * @param {Array} arr
 * @return {Array}
 * @private
 */

exports.array.unique = function(arr) {
  var primitives = {};
  var ids = {};
  var ret = [];
  var length = arr.length;
  for (var i = 0; i < length; ++i) {
    if (typeof arr[i] === 'number' || typeof arr[i] === 'string') {
      if (primitives[arr[i]]) {
        continue;
      }
      ret.push(arr[i]);
      primitives[arr[i]] = true;
    } else if (arr[i] instanceof ObjectId) {
      if (ids[arr[i].toString()]) {
        continue;
      }
      ret.push(arr[i]);
      ids[arr[i].toString()] = true;
    } else {
      ret.push(arr[i]);
    }
  }

  return ret;
};

/*!
 * Determines if two buffers are equal.
 *
 * @param {Buffer} a
 * @param {Object} b
 */

exports.buffer = {};
exports.buffer.areEqual = function(a, b) {
  if (!Buffer.isBuffer(a)) {
    return false;
  }
  if (!Buffer.isBuffer(b)) {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (var i = 0, len = a.length; i < len; ++i) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
};

exports.getFunctionName = function(fn) {
  if (fn.name) {
    return fn.name;
  }
  return (fn.toString().trim().match(/^function\s*([^\s(]+)/) || [])[1];
};

exports.decorate = function(destination, source) {
  for (var key in source) {
    destination[key] = source[key];
  }
};

/**
 * merges to with a copy of from
 *
 * @param {Object} to
 * @param {Object} fromObj
 * @api private
 */

exports.mergeClone = function(to, fromObj) {
  var keys = Object.keys(fromObj),
      i = keys.length,
      key;

  while (i--) {
    key = keys[i];
    if (typeof to[key] === 'undefined') {
      // make sure to retain key order here because of a bug handling the $each
      // operator in mongodb 2.4.4
      to[key] = exports.clone(fromObj[key], {retainKeyOrder: 1});
    } else {
      if (exports.isObject(fromObj[key])) {
        var obj = fromObj[key];
        if (isMongooseObject(fromObj[key]) && !fromObj[key].isMongooseBuffer) {
          obj = obj.toObject({ transform: false });
        }
        exports.mergeClone(to[key], obj);
      } else {
        // make sure to retain key order here because of a bug handling the
        // $each operator in mongodb 2.4.4
        to[key] = exports.clone(fromObj[key], {retainKeyOrder: 1});
      }
    }
  }
};

/**
 * Executes a function on each element of an array (like _.each)
 *
 * @param {Array} arr
 * @param {Function} fn
 * @api private
 */

exports.each = function(arr, fn) {
  for (var i = 0; i < arr.length; ++i) {
    fn(arr[i]);
  }
};

}).call(this,require("g5I+bs"),require("buffer").Buffer)
},{"./document":5,"./types":48,"./types/objectid":49,"buffer":84,"g5I+bs":133,"mpath":119,"ms":132,"regexp-clone":134,"sliced":135}],52:[function(require,module,exports){

/**
 * VirtualType constructor
 *
 * This is what mongoose uses to define virtual attributes via `Schema.prototype.virtual`.
 *
 * ####Example:
 *
 *     var fullname = schema.virtual('fullname');
 *     fullname instanceof mongoose.VirtualType // true
 *
 * @parma {Object} options
 * @api public
 */

function VirtualType(options, name) {
  this.path = name;
  this.getters = [];
  this.setters = [];
  this.options = options || {};
}

/**
 * Defines a getter.
 *
 * ####Example:
 *
 *     var virtual = schema.virtual('fullname');
 *     virtual.get(function () {
 *       return this.name.first + ' ' + this.name.last;
 *     });
 *
 * @param {Function} fn
 * @return {VirtualType} this
 * @api public
 */

VirtualType.prototype.get = function(fn) {
  this.getters.push(fn);
  return this;
};

/**
 * Defines a setter.
 *
 * ####Example:
 *
 *     var virtual = schema.virtual('fullname');
 *     virtual.set(function (v) {
 *       var parts = v.split(' ');
 *       this.name.first = parts[0];
 *       this.name.last = parts[1];
 *     });
 *
 * @param {Function} fn
 * @return {VirtualType} this
 * @api public
 */

VirtualType.prototype.set = function(fn) {
  this.setters.push(fn);
  return this;
};

/**
 * Applies getters to `value` using optional `scope`.
 *
 * @param {Object} value
 * @param {Object} scope
 * @return {any} the value after applying all getters
 * @api public
 */

VirtualType.prototype.applyGetters = function(value, scope) {
  var v = value;
  for (var l = this.getters.length - 1; l >= 0; l--) {
    v = this.getters[l].call(scope, v, this);
  }
  return v;
};

/**
 * Applies setters to `value` using optional `scope`.
 *
 * @param {Object} value
 * @param {Object} scope
 * @return {any} the value after applying all setters
 * @api public
 */

VirtualType.prototype.applySetters = function(value, scope) {
  var v = value;
  for (var l = this.setters.length - 1; l >= 0; l--) {
    v = this.setters[l].call(scope, v, this);
  }
  return v;
};

/*!
 * exports
 */

module.exports = VirtualType;

},{}],53:[function(require,module,exports){
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var util = require('util/');

var pSlice = Array.prototype.slice;
var hasOwn = Object.prototype.hasOwnProperty;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
  else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = stackStartFunction.name;
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && (isNaN(value) || !isFinite(value))) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  try {
    var ka = objectKeys(a),
        kb = objectKeys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

},{"util/":138}],54:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = eachLimit;

var _eachOf = require('./eachOf');

var _eachOf2 = _interopRequireDefault(_eachOf);

var _withoutIndex = require('./internal/withoutIndex');

var _withoutIndex2 = _interopRequireDefault(_withoutIndex);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Applies the function `iteratee` to each item in `coll`, in parallel.
 * The `iteratee` is called with an item from the list, and a callback for when
 * it has finished. If the `iteratee` passes an error to its `callback`, the
 * main `callback` (for the `each` function) is immediately called with the
 * error.
 *
 * Note, that since this function applies `iteratee` to each item in parallel,
 * there is no guarantee that the iteratee functions will complete in order.
 *
 * @name each
 * @static
 * @memberOf module:Collections
 * @method
 * @alias forEach
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A function to apply to each item
 * in `coll`. The iteratee is passed a `callback(err)` which must be called once
 * it has completed. If no error has occurred, the `callback` should be run
 * without arguments or with an explicit `null` argument. The array index is not
 * passed to the iteratee. Invoked with (item, callback). If you need the index,
 * use `eachOf`.
 * @param {Function} [callback] - A callback which is called when all
 * `iteratee` functions have finished, or an error occurs. Invoked with (err).
 * @example
 *
 * // assuming openFiles is an array of file names and saveFile is a function
 * // to save the modified contents of that file:
 *
 * async.each(openFiles, saveFile, function(err){
 *   // if any of the saves produced an error, err would equal that error
 * });
 *
 * // assuming openFiles is an array of file names
 * async.each(openFiles, function(file, callback) {
 *
 *     // Perform operation on file here.
 *     console.log('Processing file ' + file);
 *
 *     if( file.length > 32 ) {
 *       console.log('This file name is too long');
 *       callback('File name too long');
 *     } else {
 *       // Do work to process file here
 *       console.log('File processed');
 *       callback();
 *     }
 * }, function(err) {
 *     // if any of the file processing produced an error, err would equal that error
 *     if( err ) {
 *       // One of the iterations produced an error.
 *       // All processing will now stop.
 *       console.log('A file failed to process');
 *     } else {
 *       console.log('All files have been processed successfully');
 *     }
 * });
 */
function eachLimit(coll, iteratee, callback) {
  (0, _eachOf2.default)(coll, (0, _withoutIndex2.default)(iteratee), callback);
}
module.exports = exports['default'];
},{"./eachOf":55,"./internal/withoutIndex":63}],55:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

exports.default = function (coll, iteratee, callback) {
    var eachOfImplementation = (0, _isArrayLike2.default)(coll) ? eachOfArrayLike : eachOfGeneric;
    eachOfImplementation(coll, iteratee, callback);
};

var _isArrayLike = require('lodash/isArrayLike');

var _isArrayLike2 = _interopRequireDefault(_isArrayLike);

var _eachOfLimit = require('./eachOfLimit');

var _eachOfLimit2 = _interopRequireDefault(_eachOfLimit);

var _doLimit = require('./internal/doLimit');

var _doLimit2 = _interopRequireDefault(_doLimit);

var _noop = require('lodash/noop');

var _noop2 = _interopRequireDefault(_noop);

var _once = require('lodash/once');

var _once2 = _interopRequireDefault(_once);

var _onlyOnce = require('./internal/onlyOnce');

var _onlyOnce2 = _interopRequireDefault(_onlyOnce);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// eachOf implementation optimized for array-likes
function eachOfArrayLike(coll, iteratee, callback) {
    callback = (0, _once2.default)(callback || _noop2.default);
    var index = 0,
        completed = 0,
        length = coll.length;
    if (length === 0) {
        callback(null);
    }

    function iteratorCallback(err) {
        if (err) {
            callback(err);
        } else if (++completed === length) {
            callback(null);
        }
    }

    for (; index < length; index++) {
        iteratee(coll[index], index, (0, _onlyOnce2.default)(iteratorCallback));
    }
}

// a generic version of eachOf which can handle array, object, and iterator cases.
var eachOfGeneric = (0, _doLimit2.default)(_eachOfLimit2.default, Infinity);

/**
 * Like [`each`]{@link module:Collections.each}, except that it passes the key (or index) as the second argument
 * to the iteratee.
 *
 * @name eachOf
 * @static
 * @memberOf module:Collections
 * @method
 * @alias forEachOf
 * @category Collection
 * @see [async.each]{@link module:Collections.each}
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {Function} iteratee - A function to apply to each
 * item in `coll`. The `key` is the item's key, or index in the case of an
 * array. The iteratee is passed a `callback(err)` which must be called once it
 * has completed. If no error has occurred, the callback should be run without
 * arguments or with an explicit `null` argument. Invoked with
 * (item, key, callback).
 * @param {Function} [callback] - A callback which is called when all
 * `iteratee` functions have finished, or an error occurs. Invoked with (err).
 * @example
 *
 * var obj = {dev: "/dev.json", test: "/test.json", prod: "/prod.json"};
 * var configs = {};
 *
 * async.forEachOf(obj, function (value, key, callback) {
 *     fs.readFile(__dirname + value, "utf8", function (err, data) {
 *         if (err) return callback(err);
 *         try {
 *             configs[key] = JSON.parse(data);
 *         } catch (e) {
 *             return callback(e);
 *         }
 *         callback();
 *     });
 * }, function (err) {
 *     if (err) console.error(err.message);
 *     // configs is now a map of JSON data
 *     doSomethingWith(configs);
 * });
 */
module.exports = exports['default'];
},{"./eachOfLimit":56,"./internal/doLimit":57,"./internal/onlyOnce":62,"lodash/isArrayLike":105,"lodash/noop":114,"lodash/once":115}],56:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = eachOfLimit;

var _eachOfLimit2 = require('./internal/eachOfLimit');

var _eachOfLimit3 = _interopRequireDefault(_eachOfLimit2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * The same as [`eachOf`]{@link module:Collections.eachOf} but runs a maximum of `limit` async operations at a
 * time.
 *
 * @name eachOfLimit
 * @static
 * @memberOf module:Collections
 * @method
 * @see [async.eachOf]{@link module:Collections.eachOf}
 * @alias forEachOfLimit
 * @category Collection
 * @param {Array|Iterable|Object} coll - A collection to iterate over.
 * @param {number} limit - The maximum number of async operations at a time.
 * @param {Function} iteratee - A function to apply to each
 * item in `coll`. The `key` is the item's key, or index in the case of an
 * array. The iteratee is passed a `callback(err)` which must be called once it
 * has completed. If no error has occurred, the callback should be run without
 * arguments or with an explicit `null` argument. Invoked with
 * (item, key, callback).
 * @param {Function} [callback] - A callback which is called when all
 * `iteratee` functions have finished, or an error occurs. Invoked with (err).
 */
function eachOfLimit(coll, limit, iteratee, callback) {
  (0, _eachOfLimit3.default)(limit)(coll, iteratee, callback);
}
module.exports = exports['default'];
},{"./internal/eachOfLimit":58}],57:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = doLimit;
function doLimit(fn, limit) {
    return function (iterable, iteratee, callback) {
        return fn(iterable, limit, iteratee, callback);
    };
}
module.exports = exports['default'];
},{}],58:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = _eachOfLimit;

var _noop = require('lodash/noop');

var _noop2 = _interopRequireDefault(_noop);

var _once = require('./once');

var _once2 = _interopRequireDefault(_once);

var _iterator = require('./iterator');

var _iterator2 = _interopRequireDefault(_iterator);

var _onlyOnce = require('./onlyOnce');

var _onlyOnce2 = _interopRequireDefault(_onlyOnce);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _eachOfLimit(limit) {
    return function (obj, iteratee, callback) {
        callback = (0, _once2.default)(callback || _noop2.default);
        if (limit <= 0 || !obj) {
            return callback(null);
        }
        var nextElem = (0, _iterator2.default)(obj);
        var done = false;
        var running = 0;

        function iterateeCallback(err) {
            running -= 1;
            if (err) {
                done = true;
                callback(err);
            } else if (done && running <= 0) {
                return callback(null);
            } else {
                replenish();
            }
        }

        function replenish() {
            while (running < limit && !done) {
                var elem = nextElem();
                if (elem === null) {
                    done = true;
                    if (running <= 0) {
                        callback(null);
                    }
                    return;
                }
                running += 1;
                iteratee(elem.value, elem.key, (0, _onlyOnce2.default)(iterateeCallback));
            }
        }

        replenish();
    };
}
module.exports = exports['default'];
},{"./iterator":60,"./once":61,"./onlyOnce":62,"lodash/noop":114}],59:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

exports.default = function (coll) {
    return iteratorSymbol && coll[iteratorSymbol] && coll[iteratorSymbol]();
};

var iteratorSymbol = typeof Symbol === 'function' && Symbol.iterator;

module.exports = exports['default'];
},{}],60:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = iterator;

var _isArrayLike = require('lodash/isArrayLike');

var _isArrayLike2 = _interopRequireDefault(_isArrayLike);

var _getIterator = require('./getIterator');

var _getIterator2 = _interopRequireDefault(_getIterator);

var _keys = require('lodash/keys');

var _keys2 = _interopRequireDefault(_keys);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function createArrayIterator(coll) {
    var i = -1;
    var len = coll.length;
    return function next() {
        return ++i < len ? { value: coll[i], key: i } : null;
    };
}

function createES2015Iterator(iterator) {
    var i = -1;
    return function next() {
        var item = iterator.next();
        if (item.done) return null;
        i++;
        return { value: item.value, key: i };
    };
}

function createObjectIterator(obj) {
    var okeys = (0, _keys2.default)(obj);
    var i = -1;
    var len = okeys.length;
    return function next() {
        var key = okeys[++i];
        return i < len ? { value: obj[key], key: key } : null;
    };
}

function iterator(coll) {
    if ((0, _isArrayLike2.default)(coll)) {
        return createArrayIterator(coll);
    }

    var iterator = (0, _getIterator2.default)(coll);
    return iterator ? createES2015Iterator(iterator) : createObjectIterator(coll);
}
module.exports = exports['default'];
},{"./getIterator":59,"lodash/isArrayLike":105,"lodash/keys":113}],61:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = once;
function once(fn) {
    return function () {
        if (fn === null) return;
        var callFn = fn;
        fn = null;
        callFn.apply(this, arguments);
    };
}
module.exports = exports['default'];
},{}],62:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = onlyOnce;
function onlyOnce(fn) {
    return function () {
        if (fn === null) throw new Error("Callback was already called.");
        var callFn = fn;
        fn = null;
        callFn.apply(this, arguments);
    };
}
module.exports = exports['default'];
},{}],63:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = _withoutIndex;
function _withoutIndex(iteratee) {
    return function (value, index, callback) {
        return iteratee(value, callback);
    };
}
module.exports = exports['default'];
},{}],64:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS)
			return 62 // '+'
		if (code === SLASH)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],65:[function(require,module,exports){
(function (global){
/**
 * Module dependencies.
 * @ignore
 */

// Test if we're in Node via presence of "global" not absence of "window"
// to support hybrid environments like Electron
if(typeof global !== 'undefined') {
  var Buffer = require('buffer').Buffer; // TODO just use global Buffer
}

/**
 * A class representation of the BSON Binary type.
 *
 * Sub types
 *  - **BSON.BSON_BINARY_SUBTYPE_DEFAULT**, default BSON type.
 *  - **BSON.BSON_BINARY_SUBTYPE_FUNCTION**, BSON function type.
 *  - **BSON.BSON_BINARY_SUBTYPE_BYTE_ARRAY**, BSON byte array type.
 *  - **BSON.BSON_BINARY_SUBTYPE_UUID**, BSON uuid type.
 *  - **BSON.BSON_BINARY_SUBTYPE_MD5**, BSON md5 type.
 *  - **BSON.BSON_BINARY_SUBTYPE_USER_DEFINED**, BSON user defined type.
 *
 * @class
 * @param {Buffer} buffer a buffer object containing the binary data.
 * @param {Number} [subType] the option binary type.
 * @return {Binary}
 */
function Binary(buffer, subType) {
  if(!(this instanceof Binary)) return new Binary(buffer, subType);

  this._bsontype = 'Binary';

  if(buffer instanceof Number) {
    this.sub_type = buffer;
    this.position = 0;
  } else {
    this.sub_type = subType == null ? BSON_BINARY_SUBTYPE_DEFAULT : subType;
    this.position = 0;
  }

  if(buffer != null && !(buffer instanceof Number)) {
    // Only accept Buffer, Uint8Array or Arrays
    if(typeof buffer == 'string') {
      // Different ways of writing the length of the string for the different types
      if(typeof Buffer != 'undefined') {
        this.buffer = new Buffer(buffer);
      } else if(typeof Uint8Array != 'undefined' || (Object.prototype.toString.call(buffer) == '[object Array]')) {
        this.buffer = writeStringToArray(buffer);
      } else {
        throw new Error("only String, Buffer, Uint8Array or Array accepted");
      }
    } else {
      this.buffer = buffer;
    }
    this.position = buffer.length;
  } else {
    if(typeof Buffer != 'undefined') {
      this.buffer =  new Buffer(Binary.BUFFER_SIZE);
    } else if(typeof Uint8Array != 'undefined'){
      this.buffer = new Uint8Array(new ArrayBuffer(Binary.BUFFER_SIZE));
    } else {
      this.buffer = new Array(Binary.BUFFER_SIZE);
    }
    // Set position to start of buffer
    this.position = 0;
  }
};

/**
 * Updates this binary with byte_value.
 *
 * @method
 * @param {string} byte_value a single byte we wish to write.
 */
Binary.prototype.put = function put(byte_value) {
  // If it's a string and a has more than one character throw an error
  if(byte_value['length'] != null && typeof byte_value != 'number' && byte_value.length != 1) throw new Error("only accepts single character String, Uint8Array or Array");
  if(typeof byte_value != 'number' && byte_value < 0 || byte_value > 255) throw new Error("only accepts number in a valid unsigned byte range 0-255");

  // Decode the byte value once
  var decoded_byte = null;
  if(typeof byte_value == 'string') {
    decoded_byte = byte_value.charCodeAt(0);
  } else if(byte_value['length'] != null) {
    decoded_byte = byte_value[0];
  } else {
    decoded_byte = byte_value;
  }

  if(this.buffer.length > this.position) {
    this.buffer[this.position++] = decoded_byte;
  } else {
    if(typeof Buffer != 'undefined' && Buffer.isBuffer(this.buffer)) {
      // Create additional overflow buffer
      var buffer = new Buffer(Binary.BUFFER_SIZE + this.buffer.length);
      // Combine the two buffers together
      this.buffer.copy(buffer, 0, 0, this.buffer.length);
      this.buffer = buffer;
      this.buffer[this.position++] = decoded_byte;
    } else {
      var buffer = null;
      // Create a new buffer (typed or normal array)
      if(Object.prototype.toString.call(this.buffer) == '[object Uint8Array]') {
        buffer = new Uint8Array(new ArrayBuffer(Binary.BUFFER_SIZE + this.buffer.length));
      } else {
        buffer = new Array(Binary.BUFFER_SIZE + this.buffer.length);
      }

      // We need to copy all the content to the new array
      for(var i = 0; i < this.buffer.length; i++) {
        buffer[i] = this.buffer[i];
      }

      // Reassign the buffer
      this.buffer = buffer;
      // Write the byte
      this.buffer[this.position++] = decoded_byte;
    }
  }
};

/**
 * Writes a buffer or string to the binary.
 *
 * @method
 * @param {(Buffer|string)} string a string or buffer to be written to the Binary BSON object.
 * @param {number} offset specify the binary of where to write the content.
 * @return {null}
 */
Binary.prototype.write = function write(string, offset) {
  offset = typeof offset == 'number' ? offset : this.position;

  // If the buffer is to small let's extend the buffer
  if(this.buffer.length < offset + string.length) {
    var buffer = null;
    // If we are in node.js
    if(typeof Buffer != 'undefined' && Buffer.isBuffer(this.buffer)) {
      buffer = new Buffer(this.buffer.length + string.length);
      this.buffer.copy(buffer, 0, 0, this.buffer.length);
    } else if(Object.prototype.toString.call(this.buffer) == '[object Uint8Array]') {
      // Create a new buffer
      buffer = new Uint8Array(new ArrayBuffer(this.buffer.length + string.length))
      // Copy the content
      for(var i = 0; i < this.position; i++) {
        buffer[i] = this.buffer[i];
      }
    }

    // Assign the new buffer
    this.buffer = buffer;
  }

  if(typeof Buffer != 'undefined' && Buffer.isBuffer(string) && Buffer.isBuffer(this.buffer)) {
    string.copy(this.buffer, offset, 0, string.length);
    this.position = (offset + string.length) > this.position ? (offset + string.length) : this.position;
    // offset = string.length
  } else if(typeof Buffer != 'undefined' && typeof string == 'string' && Buffer.isBuffer(this.buffer)) {
    this.buffer.write(string, offset, 'binary');
    this.position = (offset + string.length) > this.position ? (offset + string.length) : this.position;
    // offset = string.length;
  } else if(Object.prototype.toString.call(string) == '[object Uint8Array]'
    || Object.prototype.toString.call(string) == '[object Array]' && typeof string != 'string') {
    for(var i = 0; i < string.length; i++) {
      this.buffer[offset++] = string[i];
    }

    this.position = offset > this.position ? offset : this.position;
  } else if(typeof string == 'string') {
    for(var i = 0; i < string.length; i++) {
      this.buffer[offset++] = string.charCodeAt(i);
    }

    this.position = offset > this.position ? offset : this.position;
  }
};

/**
 * Reads **length** bytes starting at **position**.
 *
 * @method
 * @param {number} position read from the given position in the Binary.
 * @param {number} length the number of bytes to read.
 * @return {Buffer}
 */
Binary.prototype.read = function read(position, length) {
  length = length && length > 0
    ? length
    : this.position;

  // Let's return the data based on the type we have
  if(this.buffer['slice']) {
    return this.buffer.slice(position, position + length);
  } else {
    // Create a buffer to keep the result
    var buffer = typeof Uint8Array != 'undefined' ? new Uint8Array(new ArrayBuffer(length)) : new Array(length);
    for(var i = 0; i < length; i++) {
      buffer[i] = this.buffer[position++];
    }
  }
  // Return the buffer
  return buffer;
};

/**
 * Returns the value of this binary as a string.
 *
 * @method
 * @return {string}
 */
Binary.prototype.value = function value(asRaw) {
  asRaw = asRaw == null ? false : asRaw;

  // Optimize to serialize for the situation where the data == size of buffer
  if(asRaw && typeof Buffer != 'undefined' && Buffer.isBuffer(this.buffer) && this.buffer.length == this.position)
    return this.buffer;

  // If it's a node.js buffer object
  if(typeof Buffer != 'undefined' && Buffer.isBuffer(this.buffer)) {
    return asRaw ? this.buffer.slice(0, this.position) : this.buffer.toString('binary', 0, this.position);
  } else {
    if(asRaw) {
      // we support the slice command use it
      if(this.buffer['slice'] != null) {
        return this.buffer.slice(0, this.position);
      } else {
        // Create a new buffer to copy content to
        var newBuffer = Object.prototype.toString.call(this.buffer) == '[object Uint8Array]' ? new Uint8Array(new ArrayBuffer(this.position)) : new Array(this.position);
        // Copy content
        for(var i = 0; i < this.position; i++) {
          newBuffer[i] = this.buffer[i];
        }
        // Return the buffer
        return newBuffer;
      }
    } else {
      return convertArraytoUtf8BinaryString(this.buffer, 0, this.position);
    }
  }
};

/**
 * Length.
 *
 * @method
 * @return {number} the length of the binary.
 */
Binary.prototype.length = function length() {
  return this.position;
};

/**
 * @ignore
 */
Binary.prototype.toJSON = function() {
  return this.buffer != null ? this.buffer.toString('base64') : '';
}

/**
 * @ignore
 */
Binary.prototype.toString = function(format) {
  return this.buffer != null ? this.buffer.slice(0, this.position).toString(format) : '';
}

/**
 * Binary default subtype
 * @ignore
 */
var BSON_BINARY_SUBTYPE_DEFAULT = 0;

/**
 * @ignore
 */
var writeStringToArray = function(data) {
  // Create a buffer
  var buffer = typeof Uint8Array != 'undefined' ? new Uint8Array(new ArrayBuffer(data.length)) : new Array(data.length);
  // Write the content to the buffer
  for(var i = 0; i < data.length; i++) {
    buffer[i] = data.charCodeAt(i);
  }
  // Write the string to the buffer
  return buffer;
}

/**
 * Convert Array ot Uint8Array to Binary String
 *
 * @ignore
 */
var convertArraytoUtf8BinaryString = function(byteArray, startIndex, endIndex) {
  var result = "";
  for(var i = startIndex; i < endIndex; i++) {
   result = result + String.fromCharCode(byteArray[i]);
  }
  return result;
};

Binary.BUFFER_SIZE = 256;

/**
 * Default BSON type
 *
 * @classconstant SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_DEFAULT = 0;
/**
 * Function BSON type
 *
 * @classconstant SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_FUNCTION = 1;
/**
 * Byte Array BSON type
 *
 * @classconstant SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_BYTE_ARRAY = 2;
/**
 * OLD UUID BSON type
 *
 * @classconstant SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_UUID_OLD = 3;
/**
 * UUID BSON type
 *
 * @classconstant SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_UUID = 4;
/**
 * MD5 BSON type
 *
 * @classconstant SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_MD5 = 5;
/**
 * User BSON type
 *
 * @classconstant SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_USER_DEFINED = 128;

/**
 * Expose.
 */
module.exports = Binary;
module.exports.Binary = Binary;

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"buffer":84}],66:[function(require,module,exports){
(function (Buffer){
"use strict"

var writeIEEE754 = require('./float_parser').writeIEEE754,
	readIEEE754 = require('./float_parser').readIEEE754,
  Map = require('./map'),
	Long = require('./long'),
  Double = require('./double'),
  Timestamp = require('./timestamp'),
  ObjectID = require('./objectid'),
  BSONRegExp = require('./regexp'),
  Symbol = require('./symbol'),
	Int32 = require('./int_32'),
  Code = require('./code'),
	Decimal128 = require('./decimal128'),
  MinKey = require('./min_key'),
  MaxKey = require('./max_key'),
  DBRef = require('./db_ref'),
  Binary = require('./binary');

// Parts of the parser
var deserialize = require('./parser/deserializer'),
	serializer = require('./parser/serializer'),
	calculateObjectSize = require('./parser/calculate_size');

/**
 * @ignore
 * @api private
 */
// Max Size
var MAXSIZE = (1024*1024*17);
// Max Document Buffer size
var buffer = new Buffer(MAXSIZE);

var BSON = function() {
}

/**
 * Serialize a Javascript object.
 *
 * @param {Object} object the Javascript object to serialize.
 * @param {Boolean} checkKeys the serializer will check if keys are valid.
 * @param {Boolean} asBuffer return the serialized object as a Buffer object **(ignore)**.
 * @param {Boolean} serializeFunctions serialize the javascript functions **(default:false)**.
 * @return {Buffer} returns the Buffer object containing the serialized object.
 * @api public
 */
BSON.prototype.serialize = function serialize(object, checkKeys, asBuffer, serializeFunctions, index, ignoreUndefined) {
	// Attempt to serialize
	var serializationIndex = serializer(buffer, object, checkKeys, index || 0, 0, serializeFunctions, ignoreUndefined);
	// Create the final buffer
	var finishedBuffer = new Buffer(serializationIndex);
	// Copy into the finished buffer
	buffer.copy(finishedBuffer, 0, 0, finishedBuffer.length);
	// Return the buffer
	return finishedBuffer;
}

/**
 * Serialize a Javascript object using a predefined Buffer and index into the buffer, useful when pre-allocating the space for serialization.
 *
 * @param {Object} object the Javascript object to serialize.
 * @param {Boolean} checkKeys the serializer will check if keys are valid.
 * @param {Buffer} buffer the Buffer you pre-allocated to store the serialized BSON object.
 * @param {Number} index the index in the buffer where we wish to start serializing into.
 * @param {Boolean} serializeFunctions serialize the javascript functions **(default:false)**.
 * @return {Number} returns the index pointing to the last written byte in the buffer.
 * @api public
 */
BSON.prototype.serializeWithBufferAndIndex = function(object, checkKeys, finalBuffer, startIndex, serializeFunctions, ignoreUndefined) {
	// Attempt to serialize
	var serializationIndex = serializer(buffer, object, checkKeys, startIndex || 0, 0, serializeFunctions, ignoreUndefined);
	buffer.copy(finalBuffer, startIndex, 0, serializationIndex);
	// Return the index
	return serializationIndex - 1;
}

/**
 * Deserialize data as BSON.
 *
 * Options
 *  - **evalFunctions** {Boolean, default:false}, evaluate functions in the BSON document scoped to the object deserialized.
 *  - **cacheFunctions** {Boolean, default:false}, cache evaluated functions for reuse.
 *  - **cacheFunctionsCrc32** {Boolean, default:false}, use a crc32 code for caching, otherwise use the string of the function.
 *  - **promoteLongs** {Boolean, default:true}, when deserializing a Long will fit it into a Number if it's smaller than 53 bits
 *
 * @param {Buffer} buffer the buffer containing the serialized set of BSON documents.
 * @param {Object} [options] additional options used for the deserialization.
 * @param {Boolean} [isArray] ignore used for recursive parsing.
 * @return {Object} returns the deserialized Javascript Object.
 * @api public
 */
BSON.prototype.deserialize = function(data, options) {
  return deserialize(data, options);
}

/**
 * Calculate the bson size for a passed in Javascript object.
 *
 * @param {Object} object the Javascript object to calculate the BSON byte size for.
 * @param {Boolean} [serializeFunctions] serialize all functions in the object **(default:false)**.
 * @return {Number} returns the number of bytes the BSON object will take up.
 * @api public
 */
BSON.prototype.calculateObjectSize = function(object, serializeFunctions, ignoreUndefined) {
  return calculateObjectSize(object, serializeFunctions, ignoreUndefined);
}

/**
 * Deserialize stream data as BSON documents.
 *
 * Options
 *  - **evalFunctions** {Boolean, default:false}, evaluate functions in the BSON document scoped to the object deserialized.
 *  - **cacheFunctions** {Boolean, default:false}, cache evaluated functions for reuse.
 *  - **cacheFunctionsCrc32** {Boolean, default:false}, use a crc32 code for caching, otherwise use the string of the function.
 *  - **promoteLongs** {Boolean, default:true}, when deserializing a Long will fit it into a Number if it's smaller than 53 bits
 *
 * @param {Buffer} data the buffer containing the serialized set of BSON documents.
 * @param {Number} startIndex the start index in the data Buffer where the deserialization is to start.
 * @param {Number} numberOfDocuments number of documents to deserialize.
 * @param {Array} documents an array where to store the deserialized documents.
 * @param {Number} docStartIndex the index in the documents array from where to start inserting documents.
 * @param {Object} [options] additional options used for the deserialization.
 * @return {Number} returns the next index in the buffer after deserialization **x** numbers of documents.
 * @api public
 */
BSON.prototype.deserializeStream = function(data, startIndex, numberOfDocuments, documents, docStartIndex, options) {
  // if(numberOfDocuments !== documents.length) throw new Error("Number of expected results back is less than the number of documents");
  options = options != null ? options : {};
  var index = startIndex;
  // Loop over all documents
  for(var i = 0; i < numberOfDocuments; i++) {
    // Find size of the document
    var size = data[index] | data[index + 1] << 8 | data[index + 2] << 16 | data[index + 3] << 24;
    // Update options with index
    options['index'] = index;
    // Parse the document at this point
    documents[docStartIndex + i] = this.deserialize(data, options);
    // Adjust index by the document size
    index = index + size;
  }

  // Return object containing end index of parsing and list of documents
  return index;
}

/**
 * @ignore
 * @api private
 */
// BSON MAX VALUES
BSON.BSON_INT32_MAX = 0x7FFFFFFF;
BSON.BSON_INT32_MIN = -0x80000000;

BSON.BSON_INT64_MAX = Math.pow(2, 63) - 1;
BSON.BSON_INT64_MIN = -Math.pow(2, 63);

// JS MAX PRECISE VALUES
BSON.JS_INT_MAX = 0x20000000000000;  // Any integer up to 2^53 can be precisely represented by a double.
BSON.JS_INT_MIN = -0x20000000000000;  // Any integer down to -2^53 can be precisely represented by a double.

// Internal long versions
var JS_INT_MAX_LONG = Long.fromNumber(0x20000000000000);  // Any integer up to 2^53 can be precisely represented by a double.
var JS_INT_MIN_LONG = Long.fromNumber(-0x20000000000000);  // Any integer down to -2^53 can be precisely represented by a double.

/**
 * Number BSON Type
 *
 * @classconstant BSON_DATA_NUMBER
 **/
BSON.BSON_DATA_NUMBER = 1;
/**
 * String BSON Type
 *
 * @classconstant BSON_DATA_STRING
 **/
BSON.BSON_DATA_STRING = 2;
/**
 * Object BSON Type
 *
 * @classconstant BSON_DATA_OBJECT
 **/
BSON.BSON_DATA_OBJECT = 3;
/**
 * Array BSON Type
 *
 * @classconstant BSON_DATA_ARRAY
 **/
BSON.BSON_DATA_ARRAY = 4;
/**
 * Binary BSON Type
 *
 * @classconstant BSON_DATA_BINARY
 **/
BSON.BSON_DATA_BINARY = 5;
/**
 * ObjectID BSON Type
 *
 * @classconstant BSON_DATA_OID
 **/
BSON.BSON_DATA_OID = 7;
/**
 * Boolean BSON Type
 *
 * @classconstant BSON_DATA_BOOLEAN
 **/
BSON.BSON_DATA_BOOLEAN = 8;
/**
 * Date BSON Type
 *
 * @classconstant BSON_DATA_DATE
 **/
BSON.BSON_DATA_DATE = 9;
/**
 * null BSON Type
 *
 * @classconstant BSON_DATA_NULL
 **/
BSON.BSON_DATA_NULL = 10;
/**
 * RegExp BSON Type
 *
 * @classconstant BSON_DATA_REGEXP
 **/
BSON.BSON_DATA_REGEXP = 11;
/**
 * Code BSON Type
 *
 * @classconstant BSON_DATA_CODE
 **/
BSON.BSON_DATA_CODE = 13;
/**
 * Symbol BSON Type
 *
 * @classconstant BSON_DATA_SYMBOL
 **/
BSON.BSON_DATA_SYMBOL = 14;
/**
 * Code with Scope BSON Type
 *
 * @classconstant BSON_DATA_CODE_W_SCOPE
 **/
BSON.BSON_DATA_CODE_W_SCOPE = 15;
/**
 * 32 bit Integer BSON Type
 *
 * @classconstant BSON_DATA_INT
 **/
BSON.BSON_DATA_INT = 16;
/**
 * Timestamp BSON Type
 *
 * @classconstant BSON_DATA_TIMESTAMP
 **/
BSON.BSON_DATA_TIMESTAMP = 17;
/**
 * Long BSON Type
 *
 * @classconstant BSON_DATA_LONG
 **/
BSON.BSON_DATA_LONG = 18;
/**
 * MinKey BSON Type
 *
 * @classconstant BSON_DATA_MIN_KEY
 **/
BSON.BSON_DATA_MIN_KEY = 0xff;
/**
 * MaxKey BSON Type
 *
 * @classconstant BSON_DATA_MAX_KEY
 **/
BSON.BSON_DATA_MAX_KEY = 0x7f;

/**
 * Binary Default Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_DEFAULT
 **/
BSON.BSON_BINARY_SUBTYPE_DEFAULT = 0;
/**
 * Binary Function Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_FUNCTION
 **/
BSON.BSON_BINARY_SUBTYPE_FUNCTION = 1;
/**
 * Binary Byte Array Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_BYTE_ARRAY
 **/
BSON.BSON_BINARY_SUBTYPE_BYTE_ARRAY = 2;
/**
 * Binary UUID Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_UUID
 **/
BSON.BSON_BINARY_SUBTYPE_UUID = 3;
/**
 * Binary MD5 Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_MD5
 **/
BSON.BSON_BINARY_SUBTYPE_MD5 = 4;
/**
 * Binary User Defined Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_USER_DEFINED
 **/
BSON.BSON_BINARY_SUBTYPE_USER_DEFINED = 128;

// Return BSON
module.exports = BSON;
module.exports.Code = Code;
module.exports.Map = Map;
module.exports.Symbol = Symbol;
module.exports.BSON = BSON;
module.exports.DBRef = DBRef;
module.exports.Binary = Binary;
module.exports.ObjectID = ObjectID;
module.exports.Long = Long;
module.exports.Timestamp = Timestamp;
module.exports.Double = Double;
module.exports.Int32 = Int32;
module.exports.MinKey = MinKey;
module.exports.MaxKey = MaxKey;
module.exports.BSONRegExp = BSONRegExp;
module.exports.Decimal128 = Decimal128;

}).call(this,require("buffer").Buffer)
},{"./binary":65,"./code":67,"./db_ref":68,"./decimal128":69,"./double":70,"./float_parser":71,"./int_32":72,"./long":73,"./map":74,"./max_key":75,"./min_key":76,"./objectid":77,"./parser/calculate_size":78,"./parser/deserializer":79,"./parser/serializer":80,"./regexp":81,"./symbol":82,"./timestamp":83,"buffer":84}],67:[function(require,module,exports){
/**
 * A class representation of the BSON Code type.
 *
 * @class
 * @param {(string|function)} code a string or function.
 * @param {Object} [scope] an optional scope for the function.
 * @return {Code}
 */
var Code = function Code(code, scope) {
  if(!(this instanceof Code)) return new Code(code, scope);
  this._bsontype = 'Code';
  this.code = code;
  this.scope = scope;
};

/**
 * @ignore
 */
Code.prototype.toJSON = function() {
  return {scope:this.scope, code:this.code};
}

module.exports = Code;
module.exports.Code = Code;

},{}],68:[function(require,module,exports){
/**
 * A class representation of the BSON DBRef type.
 *
 * @class
 * @param {string} namespace the collection name.
 * @param {ObjectID} oid the reference ObjectID.
 * @param {string} [db] optional db name, if omitted the reference is local to the current db.
 * @return {DBRef}
 */
function DBRef(namespace, oid, db) {
  if(!(this instanceof DBRef)) return new DBRef(namespace, oid, db);
  
  this._bsontype = 'DBRef';
  this.namespace = namespace;
  this.oid = oid;
  this.db = db;
};

/**
 * @ignore
 * @api private
 */
DBRef.prototype.toJSON = function() {
  return {
    '$ref':this.namespace,
    '$id':this.oid,
    '$db':this.db == null ? '' : this.db
  };
}

module.exports = DBRef;
module.exports.DBRef = DBRef;
},{}],69:[function(require,module,exports){
(function (Buffer){
"use strict"

var Long = require('./long');

var PARSE_STRING_REGEXP = /^(\+|\-)?(\d+|(\d*\.\d*))?(E|e)?([\-\+])?(\d+)?$/;
var PARSE_INF_REGEXP = /^(\+|\-)?(Infinity|inf)$/i;
var PARSE_NAN_REGEXP = /^(\+|\-)?NaN$/i;

var EXPONENT_MAX = 6111;
var EXPONENT_MIN = -6176;
var EXPONENT_BIAS = 6176;
var MAX_DIGITS = 34;

// Nan value bits as 32 bit values (due to lack of longs)
var NAN_BUFFER = [0x7c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00].reverse();
// Infinity value bits 32 bit values (due to lack of longs)
var INF_NEGATIVE_BUFFER = [0xf8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00].reverse();
var INF_POSITIVE_BUFFER = [0x78, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00].reverse();

var EXPONENT_REGEX = /^([\-\+])?(\d+)?$/;


// Detect if the value is a digit
var isDigit = function(value) {
  return !isNaN(parseInt(value, 10));
}

// Divide two uint128 values
var divideu128 = function(value) {
  var DIVISOR = Long.fromNumber(1000 * 1000 * 1000);
  var _rem = Long.fromNumber(0);
  var i = 0;

  if(!value.parts[0] && !value.parts[1] &&
     !value.parts[2] && !value.parts[3]) {
    return { quotient: value, rem: _rem };
  }

  for(var i = 0; i <= 3; i++) {
    // Adjust remainder to match value of next dividend
    _rem = _rem.shiftLeft(32);
    // Add the divided to _rem
    _rem = _rem.add(new Long(value.parts[i], 0));
    value.parts[i] = _rem.div(DIVISOR).low_;
    _rem = _rem.modulo(DIVISOR);
  }

  return { quotient: value, rem: _rem };
}

// Multiply two Long values and return the 128 bit value
var multiply64x2 = function(left, right) {
  if(!left && !right) {
    return {high: Long.fromNumber(0), low: Long.fromNumber(0)};
  }

  var leftHigh = left.shiftRightUnsigned(32);
  var leftLow = new Long(left.getLowBits(), 0);
  var rightHigh = right.shiftRightUnsigned(32);
  var rightLow = new Long(right.getLowBits(), 0);

  var productHigh = leftHigh.multiply(rightHigh);
  var productMid = leftHigh.multiply(rightLow);
  var productMid2 = leftLow.multiply(rightHigh);
  var productLow = leftLow.multiply(rightLow);

  productHigh = productHigh.add(productMid.shiftRightUnsigned(32));
  productMid = new Long(productMid.getLowBits(), 0)
                .add(productMid2)
                .add(productLow.shiftRightUnsigned(32));

  productHigh = productHigh.add(productMid.shiftRightUnsigned(32));
  productLow = productMid.shiftLeft(32).add(new Long(productLow.getLowBits(), 0));

  // Return the 128 bit result
  return {high: productHigh, low: productLow};
}

var lessThan = function(left, right) {
  // Make values unsigned
  var uhleft = left.high_ >>> 0;
  var uhright = right.high_ >>> 0;

  // Compare high bits first
  if(uhleft < uhright) {
    return true
  } else if(uhleft == uhright) {
    var ulleft = left.low_ >>> 0;
    var ulright = right.low_ >>> 0;
    if(ulleft < ulright) return true;
  }

  return false;
}

var longtoHex = function(value) {
  var buffer = new Buffer(8);
  var index = 0;
  // Encode the low 64 bits of the decimal
  // Encode low bits
  buffer[index++] = value.low_ & 0xff;
  buffer[index++] = (value.low_ >> 8) & 0xff;
  buffer[index++] = (value.low_ >> 16) & 0xff;
  buffer[index++] = (value.low_ >> 24) & 0xff;
  // Encode high bits
  buffer[index++] = value.high_ & 0xff;
  buffer[index++] = (value.high_ >> 8) & 0xff;
  buffer[index++] = (value.high_ >> 16) & 0xff;
  buffer[index++] = (value.high_ >> 24) & 0xff;
  return buffer.reverse().toString('hex');
}

var int32toHex = function(value) {
  var buffer = new Buffer(4);
  var index = 0;
  // Encode the low 64 bits of the decimal
  // Encode low bits
  buffer[index++] = value & 0xff;
  buffer[index++] = (value >> 8) & 0xff;
  buffer[index++] = (value >> 16) & 0xff;
  buffer[index++] = (value >> 24) & 0xff;
  return buffer.reverse().toString('hex');
}

var Decimal128 = function(bytes) {
  this._bsontype = 'Decimal128';
  this.bytes = bytes;
}

Decimal128.fromString = function(string) {
  // Parse state tracking
  var isNegative = false;
  var sawRadix = false;
  var foundNonZero = false;

  // Total number of significant digits (no leading or trailing zero)
  var significantDigits = 0;
  // Total number of significand digits read
  var nDigitsRead = 0;
  // Total number of digits (no leading zeros)
  var nDigits = 0;
  // The number of the digits after radix
  var radixPosition = 0;
  // The index of the first non-zero in *str*
  var firstNonZero = 0;

  // Digits Array
  var digits = [0];
  // The number of digits in digits
  var nDigitsStored = 0;
  // Insertion pointer for digits
  var digitsInsert = 0;
  // The index of the first non-zero digit
  var firstDigit = 0;
  // The index of the last digit
  var lastDigit = 0;

  // Exponent
  var exponent = 0;
  // loop index over array
  var i = 0;
  // The high 17 digits of the significand
  var significandHigh = [0, 0];
  // The low 17 digits of the significand
  var significandLow = [0, 0];
  // The biased exponent
  var biasedExponent = 0;

  // Read index
  var index = 0;

  // Trim the string
  string = string.trim();

  // Results
  var stringMatch = string.match(PARSE_STRING_REGEXP);
  var infMatch = string.match(PARSE_INF_REGEXP);
  var nanMatch = string.match(PARSE_NAN_REGEXP);

  // Validate the string
  if(!stringMatch
    && ! infMatch
    && ! nanMatch || string.length == 0) {
      throw new Error("" + string + " not a valid Decimal128 string");
  }

  // Check if we have an illegal exponent format
  if(stringMatch && stringMatch[4] && stringMatch[2] === undefined) {
    throw new Error("" + string + " not a valid Decimal128 string");
  }

  // Get the negative or positive sign
  if(string[index] == '+' || string[index] == '-') {
    isNegative = string[index++] == '-';
  }

  // Check if user passed Infinity or NaN
  if(!isDigit(string[index]) && string[index] != '.') {
    if(string[index] == 'i' || string[index] == 'I') {
      return new Decimal128(new Buffer(isNegative ? INF_NEGATIVE_BUFFER : INF_POSITIVE_BUFFER));
    } else if(string[index] == 'N') {
      return new Decimal128(new Buffer(NAN_BUFFER));
    }
  }

  // Read all the digits
  while(isDigit(string[index]) || string[index] == '.') {
    if(string[index] == '.') {
      if(sawRadix) {
        return new Decimal128(new Buffer(NAN_BUFFER));
      }

      sawRadix = true;
      index = index + 1;
      continue;
    }

    if(nDigitsStored < 34) {
      if(string[index] != '0' || foundNonZero) {
        if(!foundNonZero) {
          firstNonZero = nDigitsRead;
        }

        foundNonZero = true;

        // Only store 34 digits
        digits[digitsInsert++] = parseInt(string[index], 10);
        nDigitsStored = nDigitsStored + 1;
      }
    }

    if(foundNonZero) {
      nDigits = nDigits + 1;
    }

    if(sawRadix) {
      radixPosition = radixPosition + 1;
    }

    nDigitsRead = nDigitsRead + 1;
    index = index + 1;
  }

  if(sawRadix && !nDigitsRead) {
    throw new Error("" + string + " not a valid Decimal128 string");
  }

  // Read exponent if exists
  if(string[index] == 'e' || string[index] == 'E') {
    // Read exponent digits
    var match = string.substr(++index).match(EXPONENT_REGEX);

    // No digits read
    if(!match || !match[2]) {
      return new Decimal128(new Buffer(NAN_BUFFER));
    }

    // Get exponent
    exponent = parseInt(match[0], 10);

    // Adjust the index
    index = index + match[0].length;
  }

  // Return not a number
  if(string[index]) {
    return new Decimal128(new Buffer(NAN_BUFFER));
  }

  // Done reading input
  // Find first non-zero digit in digits
  firstDigit = 0;

  if(!nDigitsStored) {
    firstDigit = 0;
    lastDigit = 0;
    digits[0] = 0;
    nDigits = 1;
    nDigitsStored = 1;
    significantDigits = 0;
  } else {
    lastDigit = nDigitsStored - 1;
    significantDigits = nDigits;

    if(exponent != 0 && significantDigits != 1) {
      while(string[firstNonZero + significantDigits - 1] == '0') {
        significantDigits = significantDigits - 1;
      }
    }
  }

  // Normalization of exponent
  // Correct exponent based on radix position, and shift significand as needed
  // to represent user input

  // Overflow prevention
  if(exponent <= radixPosition && radixPosition - exponent > (1 << 14)) {
    exponent = EXPONENT_MIN;
  } else {
    exponent = exponent - radixPosition;
  }

  // Attempt to normalize the exponent
  while(exponent > EXPONENT_MAX) {
    // Shift exponent to significand and decrease
    lastDigit = lastDigit + 1;

    if(lastDigit - firstDigit > MAX_DIGITS) {
      // Check if we have a zero then just hard clamp, otherwise fail
      var digitsString = digits.join('');
      if(digitsString.match(/^0+$/)) {
        exponent = EXPONENT_MAX;
        break;
      } else {
        return new Decimal128(new Buffer(isNegative ? INF_NEGATIVE_BUFFER : INF_POSITIVE_BUFFER));
      }
    }

    exponent = exponent - 1;
  }

  while(exponent < EXPONENT_MIN || nDigitsStored < nDigits) {
    // Shift last digit
    if(lastDigit == 0) {
      exponent = EXPONENT_MIN;
      significantDigits = 0;
      break;
    }

    if(nDigitsStored < nDigits) {
      // adjust to match digits not stored
      nDigits = nDigits - 1;
    } else {
      // adjust to round
      lastDigit = lastDigit - 1;
    }

    if(exponent < EXPONENT_MAX) {
      exponent = exponent + 1;
    } else {
      // Check if we have a zero then just hard clamp, otherwise fail
      var digitsString = digits.join('');
      if(digitsString.match(/^0+$/)) {
        exponent = EXPONENT_MAX;
        break;
      } else {
        return new Decimal128(new Buffer(isNegative ? INF_NEGATIVE_BUFFER : INF_POSITIVE_BUFFER))
      }
    }
  }


  // Round
  // We've normalized the exponent, but might still need to round.
  if((lastDigit - firstDigit + 1 < significantDigits) && string[significantDigits] != '0') {
    var endOfString = nDigitsRead;

    // If we have seen a radix point, 'string' is 1 longer than we have
    // documented with ndigits_read, so inc the position of the first nonzero
    // digit and the position that digits are read to.
    if(sawRadix && exponent == EXPONENT_MIN) {
      firstNonZero = firstNonZero + 1;
      endOfString = endOfString + 1;
    }

    var roundDigit = parseInt(string[firstNonZero + lastDigit + 1], 10);
    var roundBit = 0;

    if(roundDigit >= 5) {
      roundBit = 1;

      if(roundDigit == 5) {
        roundBit = digits[lastDigit] % 2 == 1;

        for(var i = firstNonZero + lastDigit + 2; i < endOfString; i++) {
          if(parseInt(string[i], 10)) {
            roundBit = 1;
            break;
          }
        }
      }
    }

    if(roundBit) {
      var dIdx = lastDigit;

      for(; dIdx >= 0; dIdx--) {
        if(++digits[dIdx] > 9) {
          digits[dIdx] = 0;

          // overflowed most significant digit
          if(dIdx == 0) {
            if(exponent < EXPONENT_MAX) {
              exponent = exponent + 1;
              digits[dIdx] = 1;
            } else {
              return new Decimal128(new Buffer(isNegative ? INF_NEGATIVE_BUFFER : INF_POSITIVE_BUFFER))
            }
          }
        } else {
          break;
        }
      }
    }
  }

  // Encode significand
  // The high 17 digits of the significand
  significandHigh = Long.fromNumber(0);
  // The low 17 digits of the significand
  significandLow = Long.fromNumber(0);

  // read a zero
  if(significantDigits == 0) {
    significandHigh = Long.fromNumber(0);
    significandLow = Long.fromNumber(0);
  } else if(lastDigit - firstDigit < 17) {
    var dIdx = firstDigit;
    significandLow = Long.fromNumber(digits[dIdx++]);
    significandHigh = new Long(0, 0);

    for(; dIdx <= lastDigit; dIdx++) {
      significandLow = significandLow.multiply(Long.fromNumber(10));
      significandLow = significandLow.add(Long.fromNumber(digits[dIdx]));
    }
  } else {
    var dIdx = firstDigit;
    significandHigh = Long.fromNumber(digits[dIdx++]);

    for(; dIdx <= lastDigit - 17; dIdx++) {
      significandHigh = significandHigh.multiply(Long.fromNumber(10));
      significandHigh = significandHigh.add(Long.fromNumber(digits[dIdx]));
    }

    significandLow = Long.fromNumber(digits[dIdx++]);

    for(; dIdx <= lastDigit; dIdx++) {
      significandLow = significandLow.multiply(Long.fromNumber(10));
      significandLow = significandLow.add(Long.fromNumber(digits[dIdx]));
    }
  }

  var significand = multiply64x2(significandHigh, Long.fromString("100000000000000000"));

  significand.low = significand.low.add(significandLow);

  if(lessThan(significand.low, significandLow)) {
    significand.high = significand.high.add(Long.fromNumber(1));
  }

  // Biased exponent
  var biasedExponent = (exponent + EXPONENT_BIAS);
  var dec = { low: Long.fromNumber(0), high: Long.fromNumber(0) };

  // Encode combination, exponent, and significand.
  if(significand.high.shiftRightUnsigned(49).and(Long.fromNumber(1)).equals(Long.fromNumber)) {
    // Encode '11' into bits 1 to 3
    dec.high = dec.high.or(Long.fromNumber(0x3).shiftLeft(61));
    dec.high = dec.high.or(Long.fromNumber(biasedExponent).and(Long.fromNumber(0x3fff).shiftLeft(47)));
    dec.high = dec.high.or(significand.high.and(Long.fromNumber(0x7fffffffffff)));
  } else {
    dec.high = dec.high.or(Long.fromNumber(biasedExponent & 0x3fff).shiftLeft(49));
    dec.high = dec.high.or(significand.high.and(Long.fromNumber(0x1ffffffffffff)));
  }

  dec.low = significand.low;

  // Encode sign
  if(isNegative) {
    dec.high = dec.high.or(Long.fromString('9223372036854775808'));
  }

  // Encode into a buffer
  var buffer = new Buffer(16);
  var index = 0;

  // Encode the low 64 bits of the decimal
  // Encode low bits
  buffer[index++] = dec.low.low_ & 0xff;
  buffer[index++] = (dec.low.low_ >> 8) & 0xff;
  buffer[index++] = (dec.low.low_ >> 16) & 0xff;
  buffer[index++] = (dec.low.low_ >> 24) & 0xff;
  // Encode high bits
  buffer[index++] = dec.low.high_ & 0xff;
  buffer[index++] = (dec.low.high_ >> 8) & 0xff;
  buffer[index++] = (dec.low.high_ >> 16) & 0xff;
  buffer[index++] = (dec.low.high_ >> 24) & 0xff;

  // Encode the high 64 bits of the decimal
  // Encode low bits
  buffer[index++] = dec.high.low_ & 0xff;
  buffer[index++] = (dec.high.low_ >> 8) & 0xff;
  buffer[index++] = (dec.high.low_ >> 16) & 0xff;
  buffer[index++] = (dec.high.low_ >> 24) & 0xff;
  // Encode high bits
  buffer[index++] = dec.high.high_ & 0xff;
  buffer[index++] = (dec.high.high_ >> 8) & 0xff;
  buffer[index++] = (dec.high.high_ >> 16) & 0xff;
  buffer[index++] = (dec.high.high_ >> 24) & 0xff;

  // Return the new Decimal128
  return new Decimal128(buffer);
}

// Extract least significant 5 bits
var COMBINATION_MASK = 0x1f;
// Extract least significant 14 bits
var EXPONENT_MASK = 0x3fff;
// Value of combination field for Inf
var COMBINATION_INFINITY = 30;
// Value of combination field for NaN
var COMBINATION_NAN = 31;
// Value of combination field for NaN
var COMBINATION_SNAN = 32;
// decimal128 exponent bias
var EXPONENT_BIAS = 6176;

Decimal128.prototype.toString = function() {
  // Note: bits in this routine are referred to starting at 0,
  // from the sign bit, towards the coefficient.

  // bits 0 - 31
  var high;
  // bits 32 - 63
  var midh;
  // bits 64 - 95
  var midl;
  // bits 96 - 127
  var low;
  // bits 1 - 5
  var combination;
  // decoded biased exponent (14 bits)
  var biased_exponent;
  // the number of significand digits
  var significand_digits = 0;
  // the base-10 digits in the significand
  var significand = new Array(36);
  for(var i = 0; i < significand.length; i++) significand[i] = 0;
  // read pointer into significand
  var index = 0;

  // unbiased exponent
  var exponent;
  // the exponent if scientific notation is used
  var scientific_exponent;

  // true if the number is zero
  var is_zero = false;

  // the most signifcant significand bits (50-46)
  var significand_msb;
  // temporary storage for significand decoding
  var significand128 = {parts: new Array(4)};
  // indexing variables
  var i;
  var j, k;

  // Output string
  var string = [];

  // Unpack index
  var index = 0;

  // Buffer reference
  var buffer = this.bytes;

  // Unpack the low 64bits into a long
  low = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;
  midl = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;

  // Unpack the high 64bits into a long
  midh = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;
  high = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;

  // Unpack index
  var index = 0;

  // Create the state of the decimal
  var dec = {
    low: new Long(low, midl),
    high: new Long(midh, high) };

  if(dec.high.lessThan(Long.ZERO)) {
    string.push('-');
  }

  // Decode combination field and exponent
  combination = (high >> 26) & COMBINATION_MASK;

  if((combination >> 3) == 3) {
    // Check for 'special' values
    if(combination == COMBINATION_INFINITY) {
      return string.join('') + "Infinity";
    } else if(combination == COMBINATION_NAN) {
      return "NaN";
    } else {
      biased_exponent = (high >> 15) & EXPONENT_MASK;
      significand_msb = 0x08 + ((high >> 14) & 0x01);
    }
  } else {
    significand_msb = (high >> 14) & 0x07;
    biased_exponent = (high >> 17) & EXPONENT_MASK;
  }

  exponent = biased_exponent - EXPONENT_BIAS;

  // Create string of significand digits

  // Convert the 114-bit binary number represented by
  // (significand_high, significand_low) to at most 34 decimal
  // digits through modulo and division.
  significand128.parts[0] = (high & 0x3fff) + ((significand_msb & 0xf) << 14);
  significand128.parts[1] = midh;
  significand128.parts[2] = midl;
  significand128.parts[3] = low;

  if(significand128.parts[0] == 0 && significand128.parts[1] == 0
    && significand128.parts[2] == 0 && significand128.parts[3] == 0) {
      is_zero = true;
  } else {
    for(var k = 3; k >= 0; k--) {
      var least_digits = 0;
      // Peform the divide
      var result = divideu128(significand128);
      significand128 = result.quotient;
      least_digits = result.rem.low_;

      // We now have the 9 least significant digits (in base 2).
      // Convert and output to string.
      if(!least_digits) continue;

      for(var j = 8; j >= 0; j--) {
        // significand[k * 9 + j] = Math.round(least_digits % 10);
        significand[k * 9 + j] = least_digits % 10;
        // least_digits = Math.round(least_digits / 10);
        least_digits = Math.floor(least_digits / 10);
      }
    }
  }

  // Output format options:
  // Scientific - [-]d.dddE(+/-)dd or [-]dE(+/-)dd
  // Regular    - ddd.ddd

  if(is_zero) {
    significand_digits = 1;
    significand[index] = 0;
  } else {
    significand_digits = 36;
    var i = 0;

    while(!significand[index]) {
      i++;
      significand_digits = significand_digits - 1;
      index = index + 1;
    }
  }

  scientific_exponent = significand_digits - 1 + exponent;

  // The scientific exponent checks are dictated by the string conversion
  // specification and are somewhat arbitrary cutoffs.
  //
  // We must check exponent > 0, because if this is the case, the number
  // has trailing zeros.  However, we *cannot* output these trailing zeros,
  // because doing so would change the precision of the value, and would
  // change stored data if the string converted number is round tripped.

  if(scientific_exponent >= 34 || scientific_exponent <= -7 ||
    exponent > 0) {
    // Scientific format
    string.push(significand[index++]);
    significand_digits = significand_digits - 1;

    if(significand_digits) {
      string.push('.');
    }

    for(var i = 0; i < significand_digits; i++) {
      string.push(significand[index++]);
    }

    // Exponent
    string.push('E');
    if(scientific_exponent > 0) {
      string.push('+' + scientific_exponent);
    } else {
      string.push(scientific_exponent);
    }
  } else {
    // Regular format with no decimal place
    if(exponent >= 0) {
      for(var i = 0; i < significand_digits; i++) {
        string.push(significand[index++]);
      }
    } else {
      var radix_position = significand_digits + exponent;

      // non-zero digits before radix
      if(radix_position > 0) {
        for(var i = 0; i < radix_position; i++) {
          string.push(significand[index++]);
        }
      } else {
        string.push('0');
      }

      string.push('.');
      // add leading zeros after radix
      while(radix_position++ < 0) {
        string.push('0');
      }

      for(var i = 0; i < significand_digits - Math.max(radix_position - 1, 0); i++) {
        string.push(significand[index++]);
      }
    }
  }

  return string.join('');
}

Decimal128.prototype.toJSON = function() {
  return { "$numberDecimal": this.toString() };
}

module.exports = Decimal128;
module.exports.Decimal128 = Decimal128;

}).call(this,require("buffer").Buffer)
},{"./long":73,"buffer":84}],70:[function(require,module,exports){
/**
 * A class representation of the BSON Double type.
 *
 * @class
 * @param {number} value the number we want to represent as a double.
 * @return {Double}
 */
function Double(value) {
  if(!(this instanceof Double)) return new Double(value);

  this._bsontype = 'Double';
  this.value = value;
}

/**
 * Access the number value.
 *
 * @method
 * @return {number} returns the wrapped double number.
 */
Double.prototype.valueOf = function() {
  return this.value;
};

/**
 * @ignore
 */
Double.prototype.toJSON = function() {
  return this.value;
}

module.exports = Double;
module.exports.Double = Double;

},{}],71:[function(require,module,exports){
// Copyright (c) 2008, Fair Oaks Labs, Inc.
// All rights reserved.
// 
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
// 
//  * Redistributions of source code must retain the above copyright notice,
//    this list of conditions and the following disclaimer.
// 
//  * Redistributions in binary form must reproduce the above copyright notice,
//    this list of conditions and the following disclaimer in the documentation
//    and/or other materials provided with the distribution.
// 
//  * Neither the name of Fair Oaks Labs, Inc. nor the names of its contributors
//    may be used to endorse or promote products derived from this software
//    without specific prior written permission.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.
//
//
// Modifications to writeIEEE754 to support negative zeroes made by Brian White

var readIEEE754 = function(buffer, offset, endian, mLen, nBytes) {
  var e, m,
      bBE = (endian === 'big'),
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = bBE ? 0 : (nBytes - 1),
      d = bBE ? 1 : -1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

var writeIEEE754 = function(buffer, value, offset, endian, mLen, nBytes) {
  var e, m, c,
      bBE = (endian === 'big'),
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = bBE ? (nBytes-1) : 0,
      d = bBE ? -1 : 1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e+eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

exports.readIEEE754 = readIEEE754;
exports.writeIEEE754 = writeIEEE754;
},{}],72:[function(require,module,exports){
var Int32 = function(value) {
  if(!(this instanceof Int32)) return new Int32(value);

  this._bsontype = 'Int32';
  this.value = value;
}

/**
 * Access the number value.
 *
 * @method
 * @return {number} returns the wrapped int32 number.
 */
Int32.prototype.valueOf = function() {
  return this.value;
};

/**
 * @ignore
 */
Int32.prototype.toJSON = function() {
  return this.value;
}

module.exports = Int32;
module.exports.Int32 = Int32;

},{}],73:[function(require,module,exports){
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// Copyright 2009 Google Inc. All Rights Reserved

/**
 * Defines a Long class for representing a 64-bit two's-complement
 * integer value, which faithfully simulates the behavior of a Java "Long". This
 * implementation is derived from LongLib in GWT.
 *
 * Constructs a 64-bit two's-complement integer, given its low and high 32-bit
 * values as *signed* integers.  See the from* functions below for more
 * convenient ways of constructing Longs.
 *
 * The internal representation of a Long is the two given signed, 32-bit values.
 * We use 32-bit pieces because these are the size of integers on which
 * Javascript performs bit-operations.  For operations like addition and
 * multiplication, we split each number into 16-bit pieces, which can easily be
 * multiplied within Javascript's floating-point representation without overflow
 * or change in sign.
 *
 * In the algorithms below, we frequently reduce the negative case to the
 * positive case by negating the input(s) and then post-processing the result.
 * Note that we must ALWAYS check specially whether those values are MIN_VALUE
 * (-2^63) because -MIN_VALUE == MIN_VALUE (since 2^63 cannot be represented as
 * a positive number, it overflows back into a negative).  Not handling this
 * case would often result in infinite recursion.
 *
 * @class
 * @param {number} low  the low (signed) 32 bits of the Long.
 * @param {number} high the high (signed) 32 bits of the Long.
 * @return {Long}
 */
function Long(low, high) {
  if(!(this instanceof Long)) return new Long(low, high);
  
  this._bsontype = 'Long';
  /**
   * @type {number}
   * @ignore
   */
  this.low_ = low | 0;  // force into 32 signed bits.

  /**
   * @type {number}
   * @ignore
   */
  this.high_ = high | 0;  // force into 32 signed bits.
};

/**
 * Return the int value.
 *
 * @method
 * @return {number} the value, assuming it is a 32-bit integer.
 */
Long.prototype.toInt = function() {
  return this.low_;
};

/**
 * Return the Number value.
 *
 * @method
 * @return {number} the closest floating-point representation to this value.
 */
Long.prototype.toNumber = function() {
  return this.high_ * Long.TWO_PWR_32_DBL_ +
         this.getLowBitsUnsigned();
};

/**
 * Return the JSON value.
 *
 * @method
 * @return {string} the JSON representation.
 */
Long.prototype.toJSON = function() {
  return this.toString();
}

/**
 * Return the String value.
 *
 * @method
 * @param {number} [opt_radix] the radix in which the text should be written.
 * @return {string} the textual representation of this value.
 */
Long.prototype.toString = function(opt_radix) {
  var radix = opt_radix || 10;
  if (radix < 2 || 36 < radix) {
    throw Error('radix out of range: ' + radix);
  }

  if (this.isZero()) {
    return '0';
  }

  if (this.isNegative()) {
    if (this.equals(Long.MIN_VALUE)) {
      // We need to change the Long value before it can be negated, so we remove
      // the bottom-most digit in this base and then recurse to do the rest.
      var radixLong = Long.fromNumber(radix);
      var div = this.div(radixLong);
      var rem = div.multiply(radixLong).subtract(this);
      return div.toString(radix) + rem.toInt().toString(radix);
    } else {
      return '-' + this.negate().toString(radix);
    }
  }

  // Do several (6) digits each time through the loop, so as to
  // minimize the calls to the very expensive emulated div.
  var radixToPower = Long.fromNumber(Math.pow(radix, 6));

  var rem = this;
  var result = '';
  while (true) {
    var remDiv = rem.div(radixToPower);
    var intval = rem.subtract(remDiv.multiply(radixToPower)).toInt();
    var digits = intval.toString(radix);

    rem = remDiv;
    if (rem.isZero()) {
      return digits + result;
    } else {
      while (digits.length < 6) {
        digits = '0' + digits;
      }
      result = '' + digits + result;
    }
  }
};

/**
 * Return the high 32-bits value.
 *
 * @method
 * @return {number} the high 32-bits as a signed value.
 */
Long.prototype.getHighBits = function() {
  return this.high_;
};

/**
 * Return the low 32-bits value.
 *
 * @method
 * @return {number} the low 32-bits as a signed value.
 */
Long.prototype.getLowBits = function() {
  return this.low_;
};

/**
 * Return the low unsigned 32-bits value.
 *
 * @method
 * @return {number} the low 32-bits as an unsigned value.
 */
Long.prototype.getLowBitsUnsigned = function() {
  return (this.low_ >= 0) ?
      this.low_ : Long.TWO_PWR_32_DBL_ + this.low_;
};

/**
 * Returns the number of bits needed to represent the absolute value of this Long.
 *
 * @method
 * @return {number} Returns the number of bits needed to represent the absolute value of this Long.
 */
Long.prototype.getNumBitsAbs = function() {
  if (this.isNegative()) {
    if (this.equals(Long.MIN_VALUE)) {
      return 64;
    } else {
      return this.negate().getNumBitsAbs();
    }
  } else {
    var val = this.high_ != 0 ? this.high_ : this.low_;
    for (var bit = 31; bit > 0; bit--) {
      if ((val & (1 << bit)) != 0) {
        break;
      }
    }
    return this.high_ != 0 ? bit + 33 : bit + 1;
  }
};

/**
 * Return whether this value is zero.
 *
 * @method
 * @return {boolean} whether this value is zero.
 */
Long.prototype.isZero = function() {
  return this.high_ == 0 && this.low_ == 0;
};

/**
 * Return whether this value is negative.
 *
 * @method
 * @return {boolean} whether this value is negative.
 */
Long.prototype.isNegative = function() {
  return this.high_ < 0;
};

/**
 * Return whether this value is odd.
 *
 * @method
 * @return {boolean} whether this value is odd.
 */
Long.prototype.isOdd = function() {
  return (this.low_ & 1) == 1;
};

/**
 * Return whether this Long equals the other
 *
 * @method
 * @param {Long} other Long to compare against.
 * @return {boolean} whether this Long equals the other
 */
Long.prototype.equals = function(other) {
  return (this.high_ == other.high_) && (this.low_ == other.low_);
};

/**
 * Return whether this Long does not equal the other.
 *
 * @method
 * @param {Long} other Long to compare against.
 * @return {boolean} whether this Long does not equal the other.
 */
Long.prototype.notEquals = function(other) {
  return (this.high_ != other.high_) || (this.low_ != other.low_);
};

/**
 * Return whether this Long is less than the other.
 *
 * @method
 * @param {Long} other Long to compare against.
 * @return {boolean} whether this Long is less than the other.
 */
Long.prototype.lessThan = function(other) {
  return this.compare(other) < 0;
};

/**
 * Return whether this Long is less than or equal to the other.
 *
 * @method
 * @param {Long} other Long to compare against.
 * @return {boolean} whether this Long is less than or equal to the other.
 */
Long.prototype.lessThanOrEqual = function(other) {
  return this.compare(other) <= 0;
};

/**
 * Return whether this Long is greater than the other.
 *
 * @method
 * @param {Long} other Long to compare against.
 * @return {boolean} whether this Long is greater than the other.
 */
Long.prototype.greaterThan = function(other) {
  return this.compare(other) > 0;
};

/**
 * Return whether this Long is greater than or equal to the other.
 *
 * @method
 * @param {Long} other Long to compare against.
 * @return {boolean} whether this Long is greater than or equal to the other.
 */
Long.prototype.greaterThanOrEqual = function(other) {
  return this.compare(other) >= 0;
};

/**
 * Compares this Long with the given one.
 *
 * @method
 * @param {Long} other Long to compare against.
 * @return {boolean} 0 if they are the same, 1 if the this is greater, and -1 if the given one is greater.
 */
Long.prototype.compare = function(other) {
  if (this.equals(other)) {
    return 0;
  }

  var thisNeg = this.isNegative();
  var otherNeg = other.isNegative();
  if (thisNeg && !otherNeg) {
    return -1;
  }
  if (!thisNeg && otherNeg) {
    return 1;
  }

  // at this point, the signs are the same, so subtraction will not overflow
  if (this.subtract(other).isNegative()) {
    return -1;
  } else {
    return 1;
  }
};

/**
 * The negation of this value.
 *
 * @method
 * @return {Long} the negation of this value.
 */
Long.prototype.negate = function() {
  if (this.equals(Long.MIN_VALUE)) {
    return Long.MIN_VALUE;
  } else {
    return this.not().add(Long.ONE);
  }
};

/**
 * Returns the sum of this and the given Long.
 *
 * @method
 * @param {Long} other Long to add to this one.
 * @return {Long} the sum of this and the given Long.
 */
Long.prototype.add = function(other) {
  // Divide each number into 4 chunks of 16 bits, and then sum the chunks.

  var a48 = this.high_ >>> 16;
  var a32 = this.high_ & 0xFFFF;
  var a16 = this.low_ >>> 16;
  var a00 = this.low_ & 0xFFFF;

  var b48 = other.high_ >>> 16;
  var b32 = other.high_ & 0xFFFF;
  var b16 = other.low_ >>> 16;
  var b00 = other.low_ & 0xFFFF;

  var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
  c00 += a00 + b00;
  c16 += c00 >>> 16;
  c00 &= 0xFFFF;
  c16 += a16 + b16;
  c32 += c16 >>> 16;
  c16 &= 0xFFFF;
  c32 += a32 + b32;
  c48 += c32 >>> 16;
  c32 &= 0xFFFF;
  c48 += a48 + b48;
  c48 &= 0xFFFF;
  return Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
};

/**
 * Returns the difference of this and the given Long.
 *
 * @method
 * @param {Long} other Long to subtract from this.
 * @return {Long} the difference of this and the given Long.
 */
Long.prototype.subtract = function(other) {
  return this.add(other.negate());
};

/**
 * Returns the product of this and the given Long.
 *
 * @method
 * @param {Long} other Long to multiply with this.
 * @return {Long} the product of this and the other.
 */
Long.prototype.multiply = function(other) {
  if (this.isZero()) {
    return Long.ZERO;
  } else if (other.isZero()) {
    return Long.ZERO;
  }

  if (this.equals(Long.MIN_VALUE)) {
    return other.isOdd() ? Long.MIN_VALUE : Long.ZERO;
  } else if (other.equals(Long.MIN_VALUE)) {
    return this.isOdd() ? Long.MIN_VALUE : Long.ZERO;
  }

  if (this.isNegative()) {
    if (other.isNegative()) {
      return this.negate().multiply(other.negate());
    } else {
      return this.negate().multiply(other).negate();
    }
  } else if (other.isNegative()) {
    return this.multiply(other.negate()).negate();
  }

  // If both Longs are small, use float multiplication
  if (this.lessThan(Long.TWO_PWR_24_) &&
      other.lessThan(Long.TWO_PWR_24_)) {
    return Long.fromNumber(this.toNumber() * other.toNumber());
  }

  // Divide each Long into 4 chunks of 16 bits, and then add up 4x4 products.
  // We can skip products that would overflow.

  var a48 = this.high_ >>> 16;
  var a32 = this.high_ & 0xFFFF;
  var a16 = this.low_ >>> 16;
  var a00 = this.low_ & 0xFFFF;

  var b48 = other.high_ >>> 16;
  var b32 = other.high_ & 0xFFFF;
  var b16 = other.low_ >>> 16;
  var b00 = other.low_ & 0xFFFF;

  var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
  c00 += a00 * b00;
  c16 += c00 >>> 16;
  c00 &= 0xFFFF;
  c16 += a16 * b00;
  c32 += c16 >>> 16;
  c16 &= 0xFFFF;
  c16 += a00 * b16;
  c32 += c16 >>> 16;
  c16 &= 0xFFFF;
  c32 += a32 * b00;
  c48 += c32 >>> 16;
  c32 &= 0xFFFF;
  c32 += a16 * b16;
  c48 += c32 >>> 16;
  c32 &= 0xFFFF;
  c32 += a00 * b32;
  c48 += c32 >>> 16;
  c32 &= 0xFFFF;
  c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
  c48 &= 0xFFFF;
  return Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
};

/**
 * Returns this Long divided by the given one.
 *
 * @method
 * @param {Long} other Long by which to divide.
 * @return {Long} this Long divided by the given one.
 */
Long.prototype.div = function(other) {
  if (other.isZero()) {
    throw Error('division by zero');
  } else if (this.isZero()) {
    return Long.ZERO;
  }

  if (this.equals(Long.MIN_VALUE)) {
    if (other.equals(Long.ONE) ||
        other.equals(Long.NEG_ONE)) {
      return Long.MIN_VALUE;  // recall that -MIN_VALUE == MIN_VALUE
    } else if (other.equals(Long.MIN_VALUE)) {
      return Long.ONE;
    } else {
      // At this point, we have |other| >= 2, so |this/other| < |MIN_VALUE|.
      var halfThis = this.shiftRight(1);
      var approx = halfThis.div(other).shiftLeft(1);
      if (approx.equals(Long.ZERO)) {
        return other.isNegative() ? Long.ONE : Long.NEG_ONE;
      } else {
        var rem = this.subtract(other.multiply(approx));
        var result = approx.add(rem.div(other));
        return result;
      }
    }
  } else if (other.equals(Long.MIN_VALUE)) {
    return Long.ZERO;
  }

  if (this.isNegative()) {
    if (other.isNegative()) {
      return this.negate().div(other.negate());
    } else {
      return this.negate().div(other).negate();
    }
  } else if (other.isNegative()) {
    return this.div(other.negate()).negate();
  }

  // Repeat the following until the remainder is less than other:  find a
  // floating-point that approximates remainder / other *from below*, add this
  // into the result, and subtract it from the remainder.  It is critical that
  // the approximate value is less than or equal to the real value so that the
  // remainder never becomes negative.
  var res = Long.ZERO;
  var rem = this;
  while (rem.greaterThanOrEqual(other)) {
    // Approximate the result of division. This may be a little greater or
    // smaller than the actual value.
    var approx = Math.max(1, Math.floor(rem.toNumber() / other.toNumber()));

    // We will tweak the approximate result by changing it in the 48-th digit or
    // the smallest non-fractional digit, whichever is larger.
    var log2 = Math.ceil(Math.log(approx) / Math.LN2);
    var delta = (log2 <= 48) ? 1 : Math.pow(2, log2 - 48);

    // Decrease the approximation until it is smaller than the remainder.  Note
    // that if it is too large, the product overflows and is negative.
    var approxRes = Long.fromNumber(approx);
    var approxRem = approxRes.multiply(other);
    while (approxRem.isNegative() || approxRem.greaterThan(rem)) {
      approx -= delta;
      approxRes = Long.fromNumber(approx);
      approxRem = approxRes.multiply(other);
    }

    // We know the answer can't be zero... and actually, zero would cause
    // infinite recursion since we would make no progress.
    if (approxRes.isZero()) {
      approxRes = Long.ONE;
    }

    res = res.add(approxRes);
    rem = rem.subtract(approxRem);
  }
  return res;
};

/**
 * Returns this Long modulo the given one.
 *
 * @method
 * @param {Long} other Long by which to mod.
 * @return {Long} this Long modulo the given one.
 */
Long.prototype.modulo = function(other) {
  return this.subtract(this.div(other).multiply(other));
};

/**
 * The bitwise-NOT of this value.
 *
 * @method
 * @return {Long} the bitwise-NOT of this value.
 */
Long.prototype.not = function() {
  return Long.fromBits(~this.low_, ~this.high_);
};

/**
 * Returns the bitwise-AND of this Long and the given one.
 *
 * @method
 * @param {Long} other the Long with which to AND.
 * @return {Long} the bitwise-AND of this and the other.
 */
Long.prototype.and = function(other) {
  return Long.fromBits(this.low_ & other.low_, this.high_ & other.high_);
};

/**
 * Returns the bitwise-OR of this Long and the given one.
 *
 * @method
 * @param {Long} other the Long with which to OR.
 * @return {Long} the bitwise-OR of this and the other.
 */
Long.prototype.or = function(other) {
  return Long.fromBits(this.low_ | other.low_, this.high_ | other.high_);
};

/**
 * Returns the bitwise-XOR of this Long and the given one.
 *
 * @method
 * @param {Long} other the Long with which to XOR.
 * @return {Long} the bitwise-XOR of this and the other.
 */
Long.prototype.xor = function(other) {
  return Long.fromBits(this.low_ ^ other.low_, this.high_ ^ other.high_);
};

/**
 * Returns this Long with bits shifted to the left by the given amount.
 *
 * @method
 * @param {number} numBits the number of bits by which to shift.
 * @return {Long} this shifted to the left by the given amount.
 */
Long.prototype.shiftLeft = function(numBits) {
  numBits &= 63;
  if (numBits == 0) {
    return this;
  } else {
    var low = this.low_;
    if (numBits < 32) {
      var high = this.high_;
      return Long.fromBits(
                 low << numBits,
                 (high << numBits) | (low >>> (32 - numBits)));
    } else {
      return Long.fromBits(0, low << (numBits - 32));
    }
  }
};

/**
 * Returns this Long with bits shifted to the right by the given amount.
 *
 * @method
 * @param {number} numBits the number of bits by which to shift.
 * @return {Long} this shifted to the right by the given amount.
 */
Long.prototype.shiftRight = function(numBits) {
  numBits &= 63;
  if (numBits == 0) {
    return this;
  } else {
    var high = this.high_;
    if (numBits < 32) {
      var low = this.low_;
      return Long.fromBits(
                 (low >>> numBits) | (high << (32 - numBits)),
                 high >> numBits);
    } else {
      return Long.fromBits(
                 high >> (numBits - 32),
                 high >= 0 ? 0 : -1);
    }
  }
};

/**
 * Returns this Long with bits shifted to the right by the given amount, with the new top bits matching the current sign bit.
 *
 * @method
 * @param {number} numBits the number of bits by which to shift.
 * @return {Long} this shifted to the right by the given amount, with zeros placed into the new leading bits.
 */
Long.prototype.shiftRightUnsigned = function(numBits) {
  numBits &= 63;
  if (numBits == 0) {
    return this;
  } else {
    var high = this.high_;
    if (numBits < 32) {
      var low = this.low_;
      return Long.fromBits(
                 (low >>> numBits) | (high << (32 - numBits)),
                 high >>> numBits);
    } else if (numBits == 32) {
      return Long.fromBits(high, 0);
    } else {
      return Long.fromBits(high >>> (numBits - 32), 0);
    }
  }
};

/**
 * Returns a Long representing the given (32-bit) integer value.
 *
 * @method
 * @param {number} value the 32-bit integer in question.
 * @return {Long} the corresponding Long value.
 */
Long.fromInt = function(value) {
  if (-128 <= value && value < 128) {
    var cachedObj = Long.INT_CACHE_[value];
    if (cachedObj) {
      return cachedObj;
    }
  }

  var obj = new Long(value | 0, value < 0 ? -1 : 0);
  if (-128 <= value && value < 128) {
    Long.INT_CACHE_[value] = obj;
  }
  return obj;
};

/**
 * Returns a Long representing the given value, provided that it is a finite number. Otherwise, zero is returned.
 *
 * @method
 * @param {number} value the number in question.
 * @return {Long} the corresponding Long value.
 */
Long.fromNumber = function(value) {
  if (isNaN(value) || !isFinite(value)) {
    return Long.ZERO;
  } else if (value <= -Long.TWO_PWR_63_DBL_) {
    return Long.MIN_VALUE;
  } else if (value + 1 >= Long.TWO_PWR_63_DBL_) {
    return Long.MAX_VALUE;
  } else if (value < 0) {
    return Long.fromNumber(-value).negate();
  } else {
    return new Long(
               (value % Long.TWO_PWR_32_DBL_) | 0,
               (value / Long.TWO_PWR_32_DBL_) | 0);
  }
};

/**
 * Returns a Long representing the 64-bit integer that comes by concatenating the given high and low bits. Each is assumed to use 32 bits.
 *
 * @method
 * @param {number} lowBits the low 32-bits.
 * @param {number} highBits the high 32-bits.
 * @return {Long} the corresponding Long value.
 */
Long.fromBits = function(lowBits, highBits) {
  return new Long(lowBits, highBits);
};

/**
 * Returns a Long representation of the given string, written using the given radix.
 *
 * @method
 * @param {string} str the textual representation of the Long.
 * @param {number} opt_radix the radix in which the text is written.
 * @return {Long} the corresponding Long value.
 */
Long.fromString = function(str, opt_radix) {
  if (str.length == 0) {
    throw Error('number format error: empty string');
  }

  var radix = opt_radix || 10;
  if (radix < 2 || 36 < radix) {
    throw Error('radix out of range: ' + radix);
  }

  if (str.charAt(0) == '-') {
    return Long.fromString(str.substring(1), radix).negate();
  } else if (str.indexOf('-') >= 0) {
    throw Error('number format error: interior "-" character: ' + str);
  }

  // Do several (8) digits each time through the loop, so as to
  // minimize the calls to the very expensive emulated div.
  var radixToPower = Long.fromNumber(Math.pow(radix, 8));

  var result = Long.ZERO;
  for (var i = 0; i < str.length; i += 8) {
    var size = Math.min(8, str.length - i);
    var value = parseInt(str.substring(i, i + size), radix);
    if (size < 8) {
      var power = Long.fromNumber(Math.pow(radix, size));
      result = result.multiply(power).add(Long.fromNumber(value));
    } else {
      result = result.multiply(radixToPower);
      result = result.add(Long.fromNumber(value));
    }
  }
  return result;
};

// NOTE: Common constant values ZERO, ONE, NEG_ONE, etc. are defined below the
// from* methods on which they depend.


/**
 * A cache of the Long representations of small integer values.
 * @type {Object}
 * @ignore
 */
Long.INT_CACHE_ = {};

// NOTE: the compiler should inline these constant values below and then remove
// these variables, so there should be no runtime penalty for these.

/**
 * Number used repeated below in calculations.  This must appear before the
 * first call to any from* function below.
 * @type {number}
 * @ignore
 */
Long.TWO_PWR_16_DBL_ = 1 << 16;

/**
 * @type {number}
 * @ignore
 */
Long.TWO_PWR_24_DBL_ = 1 << 24;

/**
 * @type {number}
 * @ignore
 */
Long.TWO_PWR_32_DBL_ = Long.TWO_PWR_16_DBL_ * Long.TWO_PWR_16_DBL_;

/**
 * @type {number}
 * @ignore
 */
Long.TWO_PWR_31_DBL_ = Long.TWO_PWR_32_DBL_ / 2;

/**
 * @type {number}
 * @ignore
 */
Long.TWO_PWR_48_DBL_ = Long.TWO_PWR_32_DBL_ * Long.TWO_PWR_16_DBL_;

/**
 * @type {number}
 * @ignore
 */
Long.TWO_PWR_64_DBL_ = Long.TWO_PWR_32_DBL_ * Long.TWO_PWR_32_DBL_;

/**
 * @type {number}
 * @ignore
 */
Long.TWO_PWR_63_DBL_ = Long.TWO_PWR_64_DBL_ / 2;

/** @type {Long} */
Long.ZERO = Long.fromInt(0);

/** @type {Long} */
Long.ONE = Long.fromInt(1);

/** @type {Long} */
Long.NEG_ONE = Long.fromInt(-1);

/** @type {Long} */
Long.MAX_VALUE =
    Long.fromBits(0xFFFFFFFF | 0, 0x7FFFFFFF | 0);

/** @type {Long} */
Long.MIN_VALUE = Long.fromBits(0, 0x80000000 | 0);

/**
 * @type {Long}
 * @ignore
 */
Long.TWO_PWR_24_ = Long.fromInt(1 << 24);

/**
 * Expose.
 */
module.exports = Long;
module.exports.Long = Long;
},{}],74:[function(require,module,exports){
(function (global){
"use strict"

// We have an ES6 Map available, return the native instance
if(typeof global.Map !== 'undefined') {
  module.exports = global.Map;
  module.exports.Map = global.Map;
} else {
  // We will return a polyfill
  var Map = function(array) {
    this._keys = [];
    this._values = {};

    for(var i = 0; i < array.length; i++) {
      if(array[i] == null) continue;  // skip null and undefined
      var entry = array[i];
      var key = entry[0];
      var value = entry[1];
      // Add the key to the list of keys in order
      this._keys.push(key);
      // Add the key and value to the values dictionary with a point
      // to the location in the ordered keys list
      this._values[key] = {v: value, i: this._keys.length - 1};
    }
  }

  Map.prototype.clear = function() {
    this._keys = [];
    this._values = {};
  }

  Map.prototype.delete = function(key) {
    var value = this._values[key];
    if(value == null) return false;
    // Delete entry
    delete this._values[key];
    // Remove the key from the ordered keys list
    this._keys.splice(value.i, 1);
    return true;
  }

  Map.prototype.entries = function() {
    var self = this;
    var index = 0;

    return {
      next: function() {
        var key = self._keys[index++];
        return {
          value: key !== undefined ? [key, self._values[key].v] : undefined,
          done: key !== undefined ? false : true
        }
      }
    };
  }

  Map.prototype.forEach = function(callback, self) {
    self = self || this;

    for(var i = 0; i < this._keys.length; i++) {
      var key = this._keys[i];
      // Call the forEach callback
      callback.call(self, this._values[key].v, key, self);
    }
  }

  Map.prototype.get = function(key) {
    return this._values[key] ? this._values[key].v : undefined;
  }

  Map.prototype.has = function(key) {
    return this._values[key] != null;
  }

  Map.prototype.keys = function(key) {
    var self = this;
    var index = 0;

    return {
      next: function() {
        var key = self._keys[index++];
        return {
          value: key !== undefined ? key : undefined,
          done: key !== undefined ? false : true
        }
      }
    };
  }

  Map.prototype.set = function(key, value) {
    if(this._values[key]) {
      this._values[key].v = value;
      return this;
    }

    // Add the key to the list of keys in order
    this._keys.push(key);
    // Add the key and value to the values dictionary with a point
    // to the location in the ordered keys list
    this._values[key] = {v: value, i: this._keys.length - 1};
    return this;
  }

  Map.prototype.values = function(key, value) {
    var self = this;
    var index = 0;

    return {
      next: function() {
        var key = self._keys[index++];
        return {
          value: key !== undefined ? self._values[key].v : undefined,
          done: key !== undefined ? false : true
        }
      }
    };
  }

  // Last ismaster
  Object.defineProperty(Map.prototype, 'size', {
    enumerable:true,
    get: function() { return this._keys.length; }
  });

  module.exports = Map;
  module.exports.Map = Map;
}
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],75:[function(require,module,exports){
/**
 * A class representation of the BSON MaxKey type.
 *
 * @class
 * @return {MaxKey} A MaxKey instance
 */
function MaxKey() {
  if(!(this instanceof MaxKey)) return new MaxKey();
  
  this._bsontype = 'MaxKey';  
}

module.exports = MaxKey;
module.exports.MaxKey = MaxKey;
},{}],76:[function(require,module,exports){
/**
 * A class representation of the BSON MinKey type.
 *
 * @class
 * @return {MinKey} A MinKey instance
 */
function MinKey() {
  if(!(this instanceof MinKey)) return new MinKey();
  
  this._bsontype = 'MinKey';
}

module.exports = MinKey;
module.exports.MinKey = MinKey;
},{}],77:[function(require,module,exports){
(function (process,Buffer){
/**
 * Machine id.
 *
 * Create a random 3-byte value (i.e. unique for this
 * process). Other drivers use a md5 of the machine id here, but
 * that would mean an asyc call to gethostname, so we don't bother.
 * @ignore
 */
var MACHINE_ID = parseInt(Math.random() * 0xFFFFFF, 10);

// Regular expression that checks for hex value
var checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");

/**
* Create a new ObjectID instance
*
* @class
* @param {(string|number)} id Can be a 24 byte hex string, 12 byte binary string or a Number.
* @property {number} generationTime The generation time of this ObjectId instance
* @return {ObjectID} instance of ObjectID.
*/
var ObjectID = function ObjectID(id) {
  // Duck-typing to support ObjectId from different npm packages
  if(id instanceof ObjectID) return id;
  if(!(this instanceof ObjectID)) return new ObjectID(id);

  this._bsontype = 'ObjectID';

  var __id = null;
  var valid = ObjectID.isValid(id);

  // Throw an error if it's not a valid setup
  if(!valid && id != null){
    throw new Error("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters");
  } else if(valid && typeof id == 'string' && id.length == 24) {
    return ObjectID.createFromHexString(id);
  } else if(id == null || typeof id == 'number') {
    // convert to 12 byte binary string
    this.id = this.generate(id);
  } else if(id != null && id.length === 12) {
    // assume 12 byte string
    this.id = id;
  } else if(id != null && id.toHexString) {
    // Duck-typing to support ObjectId from different npm packages
    return id;
  } else {
    throw new Error("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters");
  }

  if(ObjectID.cacheHexString) this.__id = this.toHexString();
};

// Allow usage of ObjectId as well as ObjectID
var ObjectId = ObjectID;

// Precomputed hex table enables speedy hex string conversion
var hexTable = [];
for (var i = 0; i < 256; i++) {
  hexTable[i] = (i <= 15 ? '0' : '') + i.toString(16);
}

/**
* Return the ObjectID id as a 24 byte hex string representation
*
* @method
* @return {string} return the 24 byte hex string representation.
*/
ObjectID.prototype.toHexString = function() {
  if(ObjectID.cacheHexString && this.__id) return this.__id;

  var hexString = '';
  if(!this.id || !this.id.length) {
    throw new Error('invalid ObjectId, ObjectId.id must be either a string or a Buffer, but is [' + JSON.stringify(this.id) + ']');
  }

  if(this.id instanceof _Buffer) {
    hexString = convertToHex(this.id);
    if(ObjectID.cacheHexString) this.__id = hexString;
    return hexString;
  }

  for (var i = 0; i < this.id.length; i++) {
    hexString += hexTable[this.id.charCodeAt(i)];
  }

  if(ObjectID.cacheHexString) this.__id = hexString;
  return hexString;
};

/**
* Update the ObjectID index used in generating new ObjectID's on the driver
*
* @method
* @return {number} returns next index value.
* @ignore
*/
ObjectID.prototype.get_inc = function() {
  return ObjectID.index = (ObjectID.index + 1) % 0xFFFFFF;
};

/**
* Update the ObjectID index used in generating new ObjectID's on the driver
*
* @method
* @return {number} returns next index value.
* @ignore
*/
ObjectID.prototype.getInc = function() {
  return this.get_inc();
};

/**
* Generate a 12 byte id buffer used in ObjectID's
*
* @method
* @param {number} [time] optional parameter allowing to pass in a second based timestamp.
* @return {Buffer} return the 12 byte id buffer string.
*/
ObjectID.prototype.generate = function(time) {
  if ('number' != typeof time) {
    time = ~~(Date.now()/1000);
  }

  // Use pid
  var pid = (typeof process === 'undefined' ? Math.floor(Math.random() * 100000) : process.pid) % 0xFFFF;
  var inc = this.get_inc();
  // Buffer used
  var buffer = new Buffer(12);
  // Encode time
  buffer[3] = time & 0xff;
  buffer[2] = (time >> 8) & 0xff;
  buffer[1] = (time >> 16) & 0xff;
  buffer[0] = (time >> 24) & 0xff;
  // Encode machine
  buffer[6] = MACHINE_ID & 0xff;
  buffer[5] = (MACHINE_ID >> 8) & 0xff;
  buffer[4] = (MACHINE_ID >> 16) & 0xff;
  // Encode pid
  buffer[8] = pid & 0xff;
  buffer[7] = (pid >> 8) & 0xff;
  // Encode index
  buffer[11] = inc & 0xff;
  buffer[10] = (inc >> 8) & 0xff;
  buffer[9] = (inc >> 16) & 0xff;
  // Return the buffer
  return buffer;
};

/**
* Converts the id into a 24 byte hex string for printing
*
* @return {String} return the 24 byte hex string representation.
* @ignore
*/
ObjectID.prototype.toString = function() {
  return this.toHexString();
};

/**
* Converts to a string representation of this Id.
*
* @return {String} return the 24 byte hex string representation.
* @ignore
*/
ObjectID.prototype.inspect = ObjectID.prototype.toString;

/**
* Converts to its JSON representation.
*
* @return {String} return the 24 byte hex string representation.
* @ignore
*/
ObjectID.prototype.toJSON = function() {
  return this.toHexString();
};

/**
* Compares the equality of this ObjectID with `otherID`.
*
* @method
* @param {object} otherID ObjectID instance to compare against.
* @return {boolean} the result of comparing two ObjectID's
*/
ObjectID.prototype.equals = function equals (otherId) {
  var id;

  if(otherId instanceof ObjectID) {
    return this.toString() == otherId.toString();
  } else if(typeof otherId == 'string' && ObjectID.isValid(otherId) && otherId.length == 12 && this.id instanceof _Buffer) {
    return otherId === this.id.toString('binary');
  } else if(typeof otherId == 'string' && ObjectID.isValid(otherId) && otherId.length == 24) {
    return otherId === this.toHexString();
  } else if(typeof otherId == 'string' && ObjectID.isValid(otherId) && otherId.length == 12) {
    return otherId === this.id;
  } else if(otherId != null && (otherId instanceof ObjectID || otherId.toHexString)) {
    return otherId.toHexString() === this.toHexString();
  } else {
    return false;
  }
}

/**
* Returns the generation date (accurate up to the second) that this ID was generated.
*
* @method
* @return {date} the generation date
*/
ObjectID.prototype.getTimestamp = function() {
  var timestamp = new Date();
  var time = this.id[3] | this.id[2] << 8 | this.id[1] << 16 | this.id[0] << 24;
  timestamp.setTime(Math.floor(time) * 1000);
  return timestamp;
}

/**
* @ignore
*/
ObjectID.index = ~~(Math.random() * 0xFFFFFF);

/**
* @ignore
*/
ObjectID.createPk = function createPk () {
  return new ObjectID();
};

/**
* Creates an ObjectID from a second based number, with the rest of the ObjectID zeroed out. Used for comparisons or sorting the ObjectID.
*
* @method
* @param {number} time an integer number representing a number of seconds.
* @return {ObjectID} return the created ObjectID
*/
ObjectID.createFromTime = function createFromTime (time) {
  var buffer = new Buffer([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  // Encode time into first 4 bytes
  buffer[3] = time & 0xff;
  buffer[2] = (time >> 8) & 0xff;
  buffer[1] = (time >> 16) & 0xff;
  buffer[0] = (time >> 24) & 0xff;
  // Return the new objectId
  return new ObjectID(buffer);
};

// Lookup tables
var encodeLookup = '0123456789abcdef'.split('')
var decodeLookup = []
var i = 0
while (i < 10) decodeLookup[0x30 + i] = i++
while (i < 16) decodeLookup[0x61 - 10 + i] = i++

var _Buffer = Buffer;
var convertToHex = function(bytes) {
  return bytes.toString('hex');
}

/**
* Creates an ObjectID from a hex string representation of an ObjectID.
*
* @method
* @param {string} hexString create a ObjectID from a passed in 24 byte hexstring.
* @return {ObjectID} return the created ObjectID
*/
ObjectID.createFromHexString = function createFromHexString (string) {
  // Throw an error if it's not a valid setup
  if(typeof string === 'undefined' || string != null && string.length != 24)
    throw new Error("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters");

  var length = string.length;

  if(length > 12*2) {
    throw new Error('Id cannot be longer than 12 bytes');
  }

  // Calculate lengths
  var sizeof = length >> 1;
  var array = new _Buffer(sizeof);
  var n = 0;
  var i = 0;

  while (i < length) {
    array[n++] = decodeLookup[string.charCodeAt(i++)] << 4 | decodeLookup[string.charCodeAt(i++)]
  }

  return new ObjectID(array);
};

/**
* Checks if a value is a valid bson ObjectId
*
* @method
* @return {boolean} return true if the value is a valid bson ObjectId, return false otherwise.
*/
ObjectID.isValid = function isValid(id) {
  if(id == null) return false;

  if(typeof id == 'number') {
    return true;
  }

  if(typeof id == 'string') {
    return id.length == 12 || (id.length == 24 && checkForHexRegExp.test(id));
  }

  if(id instanceof ObjectID) {
    return true;
  }

  if(id instanceof _Buffer) {
    return true;
  }

  // Duck-Typing detection of ObjectId like objects
  if(id.toHexString) {
    return id.id.length == 12 || (id.id.length == 24 && checkForHexRegExp.test(id.id));
  }

  return false;
};

/**
* @ignore
*/
Object.defineProperty(ObjectID.prototype, "generationTime", {
   enumerable: true
 , get: function () {
     return this.id[3] | this.id[2] << 8 | this.id[1] << 16 | this.id[0] << 24;
   }
 , set: function (value) {
     // Encode time into first 4 bytes
     this.id[3] = value & 0xff;
     this.id[2] = (value >> 8) & 0xff;
     this.id[1] = (value >> 16) & 0xff;
     this.id[0] = (value >> 24) & 0xff;
   }
});

/**
 * Expose.
 */
module.exports = ObjectID;
module.exports.ObjectID = ObjectID;
module.exports.ObjectId = ObjectID;

}).call(this,require("g5I+bs"),require("buffer").Buffer)
},{"buffer":84,"g5I+bs":133}],78:[function(require,module,exports){
(function (Buffer){
"use strict"

var writeIEEE754 = require('../float_parser').writeIEEE754
	, readIEEE754 = require('../float_parser').readIEEE754
	, Long = require('../long').Long
  , Double = require('../double').Double
  , Timestamp = require('../timestamp').Timestamp
  , ObjectID = require('../objectid').ObjectID
  , Symbol = require('../symbol').Symbol
  , BSONRegExp = require('../regexp').BSONRegExp
  , Code = require('../code').Code
	, Decimal128 = require('../decimal128')
  , MinKey = require('../min_key').MinKey
  , MaxKey = require('../max_key').MaxKey
  , DBRef = require('../db_ref').DBRef
  , Binary = require('../binary').Binary;

// To ensure that 0.4 of node works correctly
var isDate = function isDate(d) {
  return typeof d === 'object' && Object.prototype.toString.call(d) === '[object Date]';
}

var calculateObjectSize = function calculateObjectSize(object, serializeFunctions, ignoreUndefined) {
  var totalLength = (4 + 1);

  if(Array.isArray(object)) {
    for(var i = 0; i < object.length; i++) {
      totalLength += calculateElement(i.toString(), object[i], serializeFunctions, true, ignoreUndefined)
    }
  } else {
		// If we have toBSON defined, override the current object
		if(object.toBSON) {
			object = object.toBSON();
		}

		// Calculate size
    for(var key in object) {
      totalLength += calculateElement(key, object[key], serializeFunctions, false, ignoreUndefined)
    }
  }

  return totalLength;
}

/**
 * @ignore
 * @api private
 */
function calculateElement(name, value, serializeFunctions, isArray, ignoreUndefined) {
	// If we have toBSON defined, override the current object
  if(value && value.toBSON){
    value = value.toBSON();
  }

  switch(typeof value) {
    case 'string':
      return 1 + Buffer.byteLength(name, 'utf8') + 1 + 4 + Buffer.byteLength(value, 'utf8') + 1;
    case 'number':
      if(Math.floor(value) === value && value >= BSON.JS_INT_MIN && value <= BSON.JS_INT_MAX) {
        if(value >= BSON.BSON_INT32_MIN && value <= BSON.BSON_INT32_MAX) { // 32 bit
          return (name != null ? (Buffer.byteLength(name, 'utf8') + 1) : 0) + (4 + 1);
        } else {
          return (name != null ? (Buffer.byteLength(name, 'utf8') + 1) : 0) + (8 + 1);
        }
      } else {  // 64 bit
        return (name != null ? (Buffer.byteLength(name, 'utf8') + 1) : 0) + (8 + 1);
      }
    case 'undefined':
      if(isArray || !ignoreUndefined) return (name != null ? (Buffer.byteLength(name, 'utf8') + 1) : 0) + (1);
      return 0;
    case 'boolean':
      return (name != null ? (Buffer.byteLength(name, 'utf8') + 1) : 0) + (1 + 1);
    case 'object':
      if(value == null || value instanceof MinKey || value instanceof MaxKey || value['_bsontype'] == 'MinKey' || value['_bsontype'] == 'MaxKey') {
        return (name != null ? (Buffer.byteLength(name, 'utf8') + 1) : 0) + (1);
      } else if(value instanceof ObjectID || value['_bsontype'] == 'ObjectID') {
        return (name != null ? (Buffer.byteLength(name, 'utf8') + 1) : 0) + (12 + 1);
      } else if(value instanceof Date || isDate(value)) {
        return (name != null ? (Buffer.byteLength(name, 'utf8') + 1) : 0) + (8 + 1);
      } else if(typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) {
        return (name != null ? (Buffer.byteLength(name, 'utf8') + 1) : 0) + (1 + 4 + 1) + value.length;
      } else if(value instanceof Long || value instanceof Double || value instanceof Timestamp
          || value['_bsontype'] == 'Long' || value['_bsontype'] == 'Double' || value['_bsontype'] == 'Timestamp') {
        return (name != null ? (Buffer.byteLength(name, 'utf8') + 1) : 0) + (8 + 1);
			} else if(value instanceof Decimal128 || value['_bsontype'] == 'Decimal128') {
        return (name != null ? (Buffer.byteLength(name, 'utf8') + 1) : 0) + (16 + 1);
      } else if(value instanceof Code || value['_bsontype'] == 'Code') {
        // Calculate size depending on the availability of a scope
        if(value.scope != null && Object.keys(value.scope).length > 0) {
          return (name != null ? (Buffer.byteLength(name, 'utf8') + 1) : 0) + 1 + 4 + 4 + Buffer.byteLength(value.code.toString(), 'utf8') + 1 + calculateObjectSize(value.scope, serializeFunctions, ignoreUndefined);
        } else {
          return (name != null ? (Buffer.byteLength(name, 'utf8') + 1) : 0) + 1 + 4 + Buffer.byteLength(value.code.toString(), 'utf8') + 1;
        }
      } else if(value instanceof Binary || value['_bsontype'] == 'Binary') {
        // Check what kind of subtype we have
        if(value.sub_type == Binary.SUBTYPE_BYTE_ARRAY) {
          return (name != null ? (Buffer.byteLength(name, 'utf8') + 1) : 0) + (value.position + 1 + 4 + 1 + 4);
        } else {
          return (name != null ? (Buffer.byteLength(name, 'utf8') + 1) : 0) + (value.position + 1 + 4 + 1);
        }
      } else if(value instanceof Symbol || value['_bsontype'] == 'Symbol') {
        return (name != null ? (Buffer.byteLength(name, 'utf8') + 1) : 0) + Buffer.byteLength(value.value, 'utf8') + 4 + 1 + 1;
      } else if(value instanceof DBRef || value['_bsontype'] == 'DBRef') {
        // Set up correct object for serialization
        var ordered_values = {
            '$ref': value.namespace
          , '$id' : value.oid
        };

        // Add db reference if it exists
        if(null != value.db) {
          ordered_values['$db'] = value.db;
        }

        return (name != null ? (Buffer.byteLength(name, 'utf8') + 1) : 0) + 1 + calculateObjectSize(ordered_values, serializeFunctions, ignoreUndefined);
      } else if(value instanceof RegExp || Object.prototype.toString.call(value) === '[object RegExp]') {
          return (name != null ? (Buffer.byteLength(name, 'utf8') + 1) : 0) + 1 + Buffer.byteLength(value.source, 'utf8') + 1
            + (value.global ? 1 : 0) + (value.ignoreCase ? 1 : 0) + (value.multiline ? 1 : 0) + 1
      } else if(value instanceof BSONRegExp || value['_bsontype'] == 'BSONRegExp') {
          return (name != null ? (Buffer.byteLength(name, 'utf8') + 1) : 0) + 1 + Buffer.byteLength(value.pattern, 'utf8') + 1
            + Buffer.byteLength(value.options, 'utf8') + 1
      } else {
        return (name != null ? (Buffer.byteLength(name, 'utf8') + 1) : 0) + calculateObjectSize(value, serializeFunctions, ignoreUndefined) + 1;
      }
    case 'function':
      // WTF for 0.4.X where typeof /someregexp/ === 'function'
      if(value instanceof RegExp || Object.prototype.toString.call(value) === '[object RegExp]' || String.call(value) == '[object RegExp]') {
        return (name != null ? (Buffer.byteLength(name, 'utf8') + 1) : 0) + 1 + Buffer.byteLength(value.source, 'utf8') + 1
          + (value.global ? 1 : 0) + (value.ignoreCase ? 1 : 0) + (value.multiline ? 1 : 0) + 1
      } else {
        if(serializeFunctions && value.scope != null && Object.keys(value.scope).length > 0) {
          return (name != null ? (Buffer.byteLength(name, 'utf8') + 1) : 0) + 1 + 4 + 4 + Buffer.byteLength(value.toString(), 'utf8') + 1 + calculateObjectSize(value.scope, serializeFunctions, ignoreUndefined);
        } else if(serializeFunctions) {
          return (name != null ? (Buffer.byteLength(name, 'utf8') + 1) : 0) + 1 + 4 + Buffer.byteLength(value.toString(), 'utf8') + 1;
        }
      }
  }

  return 0;
}

var BSON = {};

// BSON MAX VALUES
BSON.BSON_INT32_MAX = 0x7FFFFFFF;
BSON.BSON_INT32_MIN = -0x80000000;

// JS MAX PRECISE VALUES
BSON.JS_INT_MAX = 0x20000000000000;  // Any integer up to 2^53 can be precisely represented by a double.
BSON.JS_INT_MIN = -0x20000000000000;  // Any integer down to -2^53 can be precisely represented by a double.

module.exports = calculateObjectSize;

}).call(this,require("buffer").Buffer)
},{"../binary":65,"../code":67,"../db_ref":68,"../decimal128":69,"../double":70,"../float_parser":71,"../long":73,"../max_key":75,"../min_key":76,"../objectid":77,"../regexp":81,"../symbol":82,"../timestamp":83,"buffer":84}],79:[function(require,module,exports){
(function (Buffer){
"use strict"

var readIEEE754 = require('../float_parser').readIEEE754,
	f = require('util').format,
	Long = require('../long').Long,
  Double = require('../double').Double,
  Timestamp = require('../timestamp').Timestamp,
  ObjectID = require('../objectid').ObjectID,
  Symbol = require('../symbol').Symbol,
  Code = require('../code').Code,
  MinKey = require('../min_key').MinKey,
  MaxKey = require('../max_key').MaxKey,
	Decimal128 = require('../decimal128'),
	Int32 = require('../int_32'),
  DBRef = require('../db_ref').DBRef,
  BSONRegExp = require('../regexp').BSONRegExp,
  Binary = require('../binary').Binary;

var deserialize = function(buffer, options, isArray) {
	options = options == null ? {} : options;
	var index = options && options.index ? options.index : 0;
	// Read the document size
  var size = buffer[index] | buffer[index+1] << 8 | buffer[index+2] << 16 | buffer[index+3] << 24;

	// Ensure buffer is valid size
  if(size < 5 || buffer.length < size || (size + index) < buffer.length) {
		throw new Error("corrupt bson message");
	}

	// Illegal end value
	if(buffer[index + size - 1] != 0) {
		throw new Error("One object, sized correctly, with a spot for an EOO, but the EOO isn't 0x00");
	}

	// Start deserializtion
	return deserializeObject(buffer, index, options, isArray);
}

var deserializeObject = function(buffer, index, options, isArray) {
	var evalFunctions = options['evalFunctions'] == null ? false : options['evalFunctions'];
  var cacheFunctions = options['cacheFunctions'] == null ? false : options['cacheFunctions'];
  var cacheFunctionsCrc32 = options['cacheFunctionsCrc32'] == null ? false : options['cacheFunctionsCrc32'];
	var fieldsAsRaw = options['fieldsAsRaw'] == null ? null : options['fieldsAsRaw'];

	// Return raw bson buffer instead of parsing it
	var raw = options['raw'] == null ? false : options['raw'];

	// Return BSONRegExp objects instead of native regular expressions
  var bsonRegExp = typeof options['bsonRegExp'] == 'boolean' ? options['bsonRegExp'] : false;

	// Controls the promotion of values vs wrapper classes
	var promoteBuffers = options['promoteBuffers'] == null ? false : options['promoteBuffers'];
	var promoteLongs = options['promoteLongs'] == null ? true : options['promoteLongs'];
	var promoteValues = options['promoteValues'] == null ? true : options['promoteValues'];

	// Set the start index
	var startIndex = index;

  // Validate that we have at least 4 bytes of buffer
  if(buffer.length < 5) throw new Error("corrupt bson message < 5 bytes long");

	// Read the document size
  var size = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;

	// Ensure buffer is valid size
  if(size < 5 || size > buffer.length) throw new Error("corrupt bson message");

  // Create holding object
  var object = isArray ? [] : {};
	// Used for arrays to skip having to perform utf8 decoding
	var arrayIndex = 0;

  // While we have more left data left keep parsing
  while(true) {
    // Read the type
    var elementType = buffer[index++];
    // If we get a zero it's the last byte, exit
    if(elementType == 0) {
			break;
		}

		// Get the start search index
		var i = index;
		// Locate the end of the c string
		while(buffer[i] !== 0x00 && i < buffer.length) {
			i++
		}

		// If are at the end of the buffer there is a problem with the document
		if(i >= buffer.length) throw new Error("Bad BSON Document: illegal CString")
		var name = isArray ? arrayIndex++ : buffer.toString('utf8', index, i);

		index = i + 1;

		if(elementType == BSON.BSON_DATA_STRING) {
      var stringSize = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;
			if(stringSize <= 0 || stringSize > (buffer.length - index) || buffer[index + stringSize - 1] != 0) throw new Error("bad string length in bson");
      object[name] = buffer.toString('utf8', index, index + stringSize - 1);
      index = index + stringSize;
		} else if(elementType == BSON.BSON_DATA_OID) {
			var oid = new Buffer(12);
			buffer.copy(oid, 0, index, index + 12);
      object[name] = new ObjectID(oid);
      index = index + 12;
		} else if(elementType == BSON.BSON_DATA_INT && promoteValues == false) {
			object[name] = new Int32(buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24);
		} else if(elementType == BSON.BSON_DATA_INT) {
      object[name] = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;
		} else if(elementType == BSON.BSON_DATA_NUMBER && promoteValues == false) {
			object[name] = new Double(buffer.readDoubleLE(index));
			index = index + 8;
		} else if(elementType == BSON.BSON_DATA_NUMBER) {
			object[name] = buffer.readDoubleLE(index);
      index = index + 8;
		} else if(elementType == BSON.BSON_DATA_DATE) {
      var lowBits = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;
      var highBits = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;
      object[name] = new Date(new Long(lowBits, highBits).toNumber());
		} else if(elementType == BSON.BSON_DATA_BOOLEAN) {
			if(buffer[index] != 0 && buffer[index] != 1) throw new Error('illegal boolean type value');
      object[name] = buffer[index++] == 1;
		} else if(elementType == BSON.BSON_DATA_OBJECT) {
			var _index = index;
      var objectSize = buffer[index] | buffer[index + 1] << 8 | buffer[index + 2] << 16 | buffer[index + 3] << 24;
			if(objectSize <= 0 || objectSize > (buffer.length - index)) throw new Error("bad embedded document length in bson");

			// We have a raw value
			if(raw) {
	      object[name] = buffer.slice(index, index + objectSize);
			} else {
	      object[name] = deserializeObject(buffer, _index, options, false);
			}

      index = index + objectSize;
		} else if(elementType == BSON.BSON_DATA_ARRAY) {
			var _index = index;
      var objectSize = buffer[index] | buffer[index + 1] << 8 | buffer[index + 2] << 16 | buffer[index + 3] << 24;
			var arrayOptions = options;

			// Stop index
			var stopIndex = index + objectSize;

			// All elements of array to be returned as raw bson
			if(fieldsAsRaw && fieldsAsRaw[name]) {
				arrayOptions = {};
				for(var n in options) arrayOptions[n] = options[n];
				arrayOptions['raw'] = true;
			}

      object[name] = deserializeObject(buffer, _index, arrayOptions, true);
      index = index + objectSize;

			if(buffer[index - 1] != 0) throw new Error('invalid array terminator byte');
			if(index != stopIndex) throw new Error('corrupted array bson');
		} else if(elementType == BSON.BSON_DATA_UNDEFINED) {
      object[name] = undefined;
		} else if(elementType == BSON.BSON_DATA_NULL) {
			object[name] = null;
		} else if(elementType == BSON.BSON_DATA_LONG) {
      // Unpack the low and high bits
      var lowBits = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;
      var highBits = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;
      var long = new Long(lowBits, highBits);
      // Promote the long if possible
      if(promoteLongs && promoteValues == true) {
        object[name] = long.lessThanOrEqual(JS_INT_MAX_LONG) && long.greaterThanOrEqual(JS_INT_MIN_LONG) ? long.toNumber() : long;
      } else {
        object[name] = long;
      }
		} else if(elementType == BSON.BSON_DATA_DECIMAL128) {
			// Buffer to contain the decimal bytes
			var bytes = new Buffer(16);
			// Copy the next 16 bytes into the bytes buffer
			buffer.copy(bytes, 0, index, index + 16);
			// Update index
			index = index + 16;
			// Assign the new Decimal128 value
			var decimal128 = new Decimal128(bytes);
			// If we have an alternative mapper use that
			object[name] = decimal128.toObject ? decimal128.toObject() : decimal128;
		} else if(elementType == BSON.BSON_DATA_BINARY) {
      var binarySize = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;
			var totalBinarySize = binarySize;
      var subType = buffer[index++];

			// Did we have a negative binary size, throw
			if(binarySize < 0) throw new Error('Negative binary type element size found');

			// Is the length longer than the document
			if(binarySize > buffer.length) throw new Error('Binary type size larger than document size');

			// Decode as raw Buffer object if options specifies it
      if(buffer['slice'] != null) {
        // If we have subtype 2 skip the 4 bytes for the size
        if(subType == Binary.SUBTYPE_BYTE_ARRAY) {
          binarySize = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;
					if(binarySize < 0) throw new Error('Negative binary type element size found for subtype 0x02');
					if(binarySize > (totalBinarySize - 4)) throw new Error('Binary type with subtype 0x02 contains to long binary size');
					if(binarySize < (totalBinarySize - 4)) throw new Error('Binary type with subtype 0x02 contains to short binary size');
        }

        if(promoteBuffers && promoteValues) {
          object[name] = buffer.slice(index, index + binarySize);
        } else {
          object[name] = new Binary(buffer.slice(index, index + binarySize), subType);
        }
      } else {
        var _buffer = typeof Uint8Array != 'undefined' ? new Uint8Array(new ArrayBuffer(binarySize)) : new Array(binarySize);
        // If we have subtype 2 skip the 4 bytes for the size
        if(subType == Binary.SUBTYPE_BYTE_ARRAY) {
          binarySize = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;
					if(binarySize < 0) throw new Error('Negative binary type element size found for subtype 0x02');
					if(binarySize > (totalBinarySize - 4)) throw new Error('Binary type with subtype 0x02 contains to long binary size');
					if(binarySize < (totalBinarySize - 4)) throw new Error('Binary type with subtype 0x02 contains to short binary size');
        }

        // Copy the data
        for(var i = 0; i < binarySize; i++) {
          _buffer[i] = buffer[index + i];
        }

        if(promoteBuffers && promoteValues) {
          object[name] = _buffer;
        } else {
          object[name] = new Binary(_buffer, subType);
        }
      }

      // Update the index
      index = index + binarySize;
		} else if(elementType == BSON.BSON_DATA_REGEXP && bsonRegExp == false) {
			// Get the start search index
			var i = index;
			// Locate the end of the c string
			while(buffer[i] !== 0x00 && i < buffer.length) {
				i++
			}
			// If are at the end of the buffer there is a problem with the document
			if(i >= buffer.length) throw new Error("Bad BSON Document: illegal CString")
			// Return the C string
			var source = buffer.toString('utf8', index, i);
      // Create the regexp
			index = i + 1;

			// Get the start search index
			var i = index;
			// Locate the end of the c string
			while(buffer[i] !== 0x00 && i < buffer.length) {
				i++
			}
			// If are at the end of the buffer there is a problem with the document
			if(i >= buffer.length) throw new Error("Bad BSON Document: illegal CString")
			// Return the C string
			var regExpOptions = buffer.toString('utf8', index, i);
			index = i + 1;

      // For each option add the corresponding one for javascript
      var optionsArray = new Array(regExpOptions.length);

      // Parse options
      for(var i = 0; i < regExpOptions.length; i++) {
        switch(regExpOptions[i]) {
          case 'm':
            optionsArray[i] = 'm';
            break;
          case 's':
            optionsArray[i] = 'g';
            break;
          case 'i':
            optionsArray[i] = 'i';
            break;
        }
      }

      object[name] = new RegExp(source, optionsArray.join(''));
    } else if(elementType == BSON.BSON_DATA_REGEXP && bsonRegExp == true) {
			// Get the start search index
			var i = index;
			// Locate the end of the c string
			while(buffer[i] !== 0x00 && i < buffer.length) {
				i++
			}
			// If are at the end of the buffer there is a problem with the document
			if(i >= buffer.length) throw new Error("Bad BSON Document: illegal CString")
			// Return the C string
			var source = buffer.toString('utf8', index, i);
      index = i + 1;

			// Get the start search index
			var i = index;
			// Locate the end of the c string
			while(buffer[i] !== 0x00 && i < buffer.length) {
				i++
			}
			// If are at the end of the buffer there is a problem with the document
			if(i >= buffer.length) throw new Error("Bad BSON Document: illegal CString")
			// Return the C string
			var regExpOptions = buffer.toString('utf8', index, i);
      index = i + 1;

      // Set the object
      object[name] = new BSONRegExp(source, regExpOptions);
		} else if(elementType == BSON.BSON_DATA_SYMBOL) {
      var stringSize = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;
			if(stringSize <= 0 || stringSize > (buffer.length - index) || buffer[index + stringSize - 1] != 0) throw new Error("bad string length in bson");
      object[name] = new Symbol(buffer.toString('utf8', index, index + stringSize - 1));
      index = index + stringSize;
		} else if(elementType == BSON.BSON_DATA_TIMESTAMP) {
      var lowBits = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;
      var highBits = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;
      object[name] = new Timestamp(lowBits, highBits);
		} else if(elementType == BSON.BSON_DATA_MIN_KEY) {
      object[name] = new MinKey();
		} else if(elementType == BSON.BSON_DATA_MAX_KEY) {
      object[name] = new MaxKey();
		} else if(elementType == BSON.BSON_DATA_CODE) {
      var stringSize = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;
			if(stringSize <= 0 || stringSize > (buffer.length - index) || buffer[index + stringSize - 1] != 0) throw new Error("bad string length in bson");
      var functionString = buffer.toString('utf8', index, index + stringSize - 1);

      // If we are evaluating the functions
      if(evalFunctions) {
        var value = null;
        // If we have cache enabled let's look for the md5 of the function in the cache
        if(cacheFunctions) {
          var hash = cacheFunctionsCrc32 ? crc32(functionString) : functionString;
          // Got to do this to avoid V8 deoptimizing the call due to finding eval
          object[name] = isolateEvalWithHash(functionCache, hash, functionString, object);
        } else {
          object[name] = isolateEval(functionString);
        }
      } else {
        object[name]  = new Code(functionString);
      }

      // Update parse index position
      index = index + stringSize;
		} else if(elementType == BSON.BSON_DATA_CODE_W_SCOPE) {
      var totalSize = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;

			// Element cannot be shorter than totalSize + stringSize + documentSize + terminator
			if(totalSize < (4 + 4 + 4 + 1)) {
				throw new Error("code_w_scope total size shorter minimum expected length");
			}

			// Get the code string size
      var stringSize = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;
			// Check if we have a valid string
			if(stringSize <= 0 || stringSize > (buffer.length - index) || buffer[index + stringSize - 1] != 0) throw new Error("bad string length in bson");

      // Javascript function
      var functionString = buffer.toString('utf8', index, index + stringSize - 1);
      // Update parse index position
      index = index + stringSize;
      // Parse the element
			var _index = index;
      // Decode the size of the object document
      var objectSize = buffer[index] | buffer[index + 1] << 8 | buffer[index + 2] << 16 | buffer[index + 3] << 24;
      // Decode the scope object
      var scopeObject = deserializeObject(buffer, _index, options, false);
      // Adjust the index
      index = index + objectSize;

			// Check if field length is to short
			if(totalSize < (4 + 4 + objectSize + stringSize)) {
				throw new Error('code_w_scope total size is to short, truncating scope');
			}

			// Check if totalSize field is to long
			if(totalSize > (4 + 4 + objectSize + stringSize)) {
				throw new Error('code_w_scope total size is to long, clips outer document');
			}

      // If we are evaluating the functions
      if(evalFunctions) {
        // Contains the value we are going to set
        var value = null;
        // If we have cache enabled let's look for the md5 of the function in the cache
        if(cacheFunctions) {
          var hash = cacheFunctionsCrc32 ? crc32(functionString) : functionString;
          // Got to do this to avoid V8 deoptimizing the call due to finding eval
          object[name] = isolateEvalWithHash(functionCache, hash, functionString, object);
        } else {
          object[name] = isolateEval(functionString);
        }

        object[name].scope = scopeObject;
      } else {
        object[name]  = new Code(functionString, scopeObject);
      }
		} else if(elementType == BSON_DATA_DBPOINTER) {
			// Get the code string size
      var stringSize = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;
			// Check if we have a valid string
			if(stringSize <= 0 || stringSize > (buffer.length - index) || buffer[index + stringSize - 1] != 0) throw new Error("bad string length in bson");
			// Namespace
      var namespace = buffer.toString('utf8', index, index + stringSize - 1);
			// Update parse index position
      index = index + stringSize;

			// Read the oid
			var oidBuffer = new Buffer(12);
			buffer.copy(oidBuffer, 0, index, index + 12);
      var oid = new ObjectID(oidBuffer);

			// Update the index
			index = index + 12;

			// Split the namespace
			var parts = namespace.split('.');
			var db = parts.shift();
			var collection = parts.join('.');
			// Upgrade to DBRef type
			object[name] = new DBRef(collection, oid, db);
    } else {
			throw new Error("Detected unknown BSON type " + elementType.toString(16) + " for fieldname \"" + name + "\", are you using the latest BSON parser");
		}
  }

	// Check if the deserialization was against a valid array/object
	if(size != (index - startIndex)) {
		if(isArray) throw new Error('corrupt array bson');
		throw new Error('corrupt object bson');
	}

  // Check if we have a db ref object
  if(object['$id'] != null) object = new DBRef(object['$ref'], object['$id'], object['$db']);
  return object;
}

/**
 * Ensure eval is isolated.
 *
 * @ignore
 * @api private
 */
var isolateEvalWithHash = function(functionCache, hash, functionString, object) {
  // Contains the value we are going to set
  var value = null;

  // Check for cache hit, eval if missing and return cached function
  if(functionCache[hash] == null) {
    eval("value = " + functionString);
    functionCache[hash] = value;
  }
  // Set the object
  return functionCache[hash].bind(object);
}

/**
 * Ensure eval is isolated.
 *
 * @ignore
 * @api private
 */
var isolateEval = function(functionString) {
  // Contains the value we are going to set
  var value = null;
  // Eval the function
  eval("value = " + functionString);
  return value;
}

var BSON = {};

/**
 * Contains the function cache if we have that enable to allow for avoiding the eval step on each deserialization, comparison is by md5
 *
 * @ignore
 * @api private
 */
var functionCache = BSON.functionCache = {};

/**
 * Number BSON Type
 *
 * @classconstant BSON_DATA_NUMBER
 **/
BSON.BSON_DATA_NUMBER = 1;
/**
 * String BSON Type
 *
 * @classconstant BSON_DATA_STRING
 **/
BSON.BSON_DATA_STRING = 2;
/**
 * Object BSON Type
 *
 * @classconstant BSON_DATA_OBJECT
 **/
BSON.BSON_DATA_OBJECT = 3;
/**
 * Array BSON Type
 *
 * @classconstant BSON_DATA_ARRAY
 **/
BSON.BSON_DATA_ARRAY = 4;
/**
 * Binary BSON Type
 *
 * @classconstant BSON_DATA_BINARY
 **/
BSON.BSON_DATA_BINARY = 5;
/**
 * Binary BSON Type
 *
 * @classconstant BSON_DATA_UNDEFINED
 **/
BSON.BSON_DATA_UNDEFINED = 6;
/**
 * ObjectID BSON Type
 *
 * @classconstant BSON_DATA_OID
 **/
BSON.BSON_DATA_OID = 7;
/**
 * Boolean BSON Type
 *
 * @classconstant BSON_DATA_BOOLEAN
 **/
BSON.BSON_DATA_BOOLEAN = 8;
/**
 * Date BSON Type
 *
 * @classconstant BSON_DATA_DATE
 **/
BSON.BSON_DATA_DATE = 9;
/**
 * null BSON Type
 *
 * @classconstant BSON_DATA_NULL
 **/
BSON.BSON_DATA_NULL = 10;
/**
 * RegExp BSON Type
 *
 * @classconstant BSON_DATA_REGEXP
 **/
BSON.BSON_DATA_REGEXP = 11;
/**
 * Code BSON Type
 *
 * @classconstant BSON_DATA_DBPOINTER
 **/
BSON.BSON_DATA_DBPOINTER = 12;
/**
 * Code BSON Type
 *
 * @classconstant BSON_DATA_CODE
 **/
BSON.BSON_DATA_CODE = 13;
/**
 * Symbol BSON Type
 *
 * @classconstant BSON_DATA_SYMBOL
 **/
BSON.BSON_DATA_SYMBOL = 14;
/**
 * Code with Scope BSON Type
 *
 * @classconstant BSON_DATA_CODE_W_SCOPE
 **/
BSON.BSON_DATA_CODE_W_SCOPE = 15;
/**
 * 32 bit Integer BSON Type
 *
 * @classconstant BSON_DATA_INT
 **/
BSON.BSON_DATA_INT = 16;
/**
 * Timestamp BSON Type
 *
 * @classconstant BSON_DATA_TIMESTAMP
 **/
BSON.BSON_DATA_TIMESTAMP = 17;
/**
 * Long BSON Type
 *
 * @classconstant BSON_DATA_LONG
 **/
BSON.BSON_DATA_LONG = 18;
/**
 * Long BSON Type
 *
 * @classconstant BSON_DATA_DECIMAL128
 **/
BSON.BSON_DATA_DECIMAL128 = 19;
/**
 * MinKey BSON Type
 *
 * @classconstant BSON_DATA_MIN_KEY
 **/
BSON.BSON_DATA_MIN_KEY = 0xff;
/**
 * MaxKey BSON Type
 *
 * @classconstant BSON_DATA_MAX_KEY
 **/
BSON.BSON_DATA_MAX_KEY = 0x7f;

/**
 * Binary Default Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_DEFAULT
 **/
BSON.BSON_BINARY_SUBTYPE_DEFAULT = 0;
/**
 * Binary Function Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_FUNCTION
 **/
BSON.BSON_BINARY_SUBTYPE_FUNCTION = 1;
/**
 * Binary Byte Array Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_BYTE_ARRAY
 **/
BSON.BSON_BINARY_SUBTYPE_BYTE_ARRAY = 2;
/**
 * Binary UUID Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_UUID
 **/
BSON.BSON_BINARY_SUBTYPE_UUID = 3;
/**
 * Binary MD5 Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_MD5
 **/
BSON.BSON_BINARY_SUBTYPE_MD5 = 4;
/**
 * Binary User Defined Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_USER_DEFINED
 **/
BSON.BSON_BINARY_SUBTYPE_USER_DEFINED = 128;

// BSON MAX VALUES
BSON.BSON_INT32_MAX = 0x7FFFFFFF;
BSON.BSON_INT32_MIN = -0x80000000;

BSON.BSON_INT64_MAX = Math.pow(2, 63) - 1;
BSON.BSON_INT64_MIN = -Math.pow(2, 63);

// JS MAX PRECISE VALUES
BSON.JS_INT_MAX = 0x20000000000000;  // Any integer up to 2^53 can be precisely represented by a double.
BSON.JS_INT_MIN = -0x20000000000000;  // Any integer down to -2^53 can be precisely represented by a double.

// Internal long versions
var JS_INT_MAX_LONG = Long.fromNumber(0x20000000000000);  // Any integer up to 2^53 can be precisely represented by a double.
var JS_INT_MIN_LONG = Long.fromNumber(-0x20000000000000);  // Any integer down to -2^53 can be precisely represented by a double.

module.exports = deserialize

}).call(this,require("buffer").Buffer)
},{"../binary":65,"../code":67,"../db_ref":68,"../decimal128":69,"../double":70,"../float_parser":71,"../int_32":72,"../long":73,"../max_key":75,"../min_key":76,"../objectid":77,"../regexp":81,"../symbol":82,"../timestamp":83,"buffer":84,"util":138}],80:[function(require,module,exports){
(function (Buffer){
"use strict"

var writeIEEE754 = require('../float_parser').writeIEEE754,
  readIEEE754 = require('../float_parser').readIEEE754,
  Long = require('../long').Long,
  Map = require('../map'),
  Double = require('../double').Double,
  Timestamp = require('../timestamp').Timestamp,
  ObjectID = require('../objectid').ObjectID,
  Symbol = require('../symbol').Symbol,
  Code = require('../code').Code,
  BSONRegExp = require('../regexp').BSONRegExp,
  Int32 = require('../int_32').Int32,
  MinKey = require('../min_key').MinKey,
  MaxKey = require('../max_key').MaxKey,
  Decimal128 = require('../decimal128'),
  DBRef = require('../db_ref').DBRef,
  Binary = require('../binary').Binary;

try {
  var _Buffer = Uint8Array;
} catch(e) {
  var _Buffer = Buffer;
}

var regexp = /\x00/

// To ensure that 0.4 of node works correctly
var isDate = function isDate(d) {
  return typeof d === 'object' && Object.prototype.toString.call(d) === '[object Date]';
}

var isRegExp = function isRegExp(d) {
  return Object.prototype.toString.call(d) === '[object RegExp]';
}

var serializeString = function(buffer, key, value, index, isArray) {
  // Encode String type
  buffer[index++] = BSON.BSON_DATA_STRING;
  // Number of written bytes
  var numberOfWrittenBytes = !isArray ? buffer.write(key, index, 'utf8') : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes + 1;
  buffer[index - 1] = 0;
  // Write the string
  var size = buffer.write(value, index + 4, 'utf8');
  // Write the size of the string to buffer
  buffer[index + 3] = (size + 1 >> 24) & 0xff;
  buffer[index + 2] = (size + 1 >> 16) & 0xff;
  buffer[index + 1] = (size + 1 >> 8) & 0xff;
  buffer[index] = size + 1 & 0xff;
  // Update index
  index = index + 4 + size;
  // Write zero
  buffer[index++] = 0;
  return index;
}

var serializeNumber = function(buffer, key, value, index, isArray) {
  // We have an integer value
  if(Math.floor(value) === value && value >= BSON.JS_INT_MIN && value <= BSON.JS_INT_MAX) {
    // If the value fits in 32 bits encode as int, if it fits in a double
    // encode it as a double, otherwise long
    if(value >= BSON.BSON_INT32_MIN && value <= BSON.BSON_INT32_MAX) {
      // Set int type 32 bits or less
      buffer[index++] = BSON.BSON_DATA_INT;
      // Number of written bytes
      var numberOfWrittenBytes = !isArray ? buffer.write(key, index, 'utf8') : buffer.write(key, index, 'ascii');
      // Encode the name
      index = index + numberOfWrittenBytes;
      buffer[index++] = 0;
      // Write the int value
      buffer[index++] = value & 0xff;
      buffer[index++] = (value >> 8) & 0xff;
      buffer[index++] = (value >> 16) & 0xff;
      buffer[index++] = (value >> 24) & 0xff;
    } else if(value >= BSON.JS_INT_MIN && value <= BSON.JS_INT_MAX) {
      // Encode as double
      buffer[index++] = BSON.BSON_DATA_NUMBER;
      // Number of written bytes
      var numberOfWrittenBytes = !isArray ? buffer.write(key, index, 'utf8') : buffer.write(key, index, 'ascii');
      // Encode the name
      index = index + numberOfWrittenBytes;
      buffer[index++] = 0;
      // Write float
      writeIEEE754(buffer, value, index, 'little', 52, 8);
      // Ajust index
      index = index + 8;
    } else {
      // Set long type
      buffer[index++] = BSON.BSON_DATA_LONG;
      // Number of written bytes
      var numberOfWrittenBytes = !isArray ? buffer.write(key, index, 'utf8') : buffer.write(key, index, 'ascii');
      // Encode the name
      index = index + numberOfWrittenBytes;
      buffer[index++] = 0;
      var longVal = Long.fromNumber(value);
      var lowBits = longVal.getLowBits();
      var highBits = longVal.getHighBits();
      // Encode low bits
      buffer[index++] = lowBits & 0xff;
      buffer[index++] = (lowBits >> 8) & 0xff;
      buffer[index++] = (lowBits >> 16) & 0xff;
      buffer[index++] = (lowBits >> 24) & 0xff;
      // Encode high bits
      buffer[index++] = highBits & 0xff;
      buffer[index++] = (highBits >> 8) & 0xff;
      buffer[index++] = (highBits >> 16) & 0xff;
      buffer[index++] = (highBits >> 24) & 0xff;
    }
  } else {
    // Encode as double
    buffer[index++] = BSON.BSON_DATA_NUMBER;
    // Number of written bytes
    var numberOfWrittenBytes = !isArray ? buffer.write(key, index, 'utf8') : buffer.write(key, index, 'ascii');
    // Encode the name
    index = index + numberOfWrittenBytes;
    buffer[index++] = 0;
    // Write float
    writeIEEE754(buffer, value, index, 'little', 52, 8);
    // Ajust index
    index = index + 8;
  }

  return index;
}

var serializeUndefined = function(buffer, key, value, index, isArray) {
  // Set long type
  buffer[index++] = BSON.BSON_DATA_NULL;
  // Number of written bytes
  var numberOfWrittenBytes = !isArray ? buffer.write(key, index, 'utf8') : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  return index;
}

var serializeBoolean = function(buffer, key, value, index, isArray) {
  // Write the type
  buffer[index++] = BSON.BSON_DATA_BOOLEAN;
  // Number of written bytes
  var numberOfWrittenBytes = !isArray ? buffer.write(key, index, 'utf8') : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  // Encode the boolean value
  buffer[index++] = value ? 1 : 0;
  return index;
}

var serializeDate = function(buffer, key, value, index, isArray) {
  // Write the type
  buffer[index++] = BSON.BSON_DATA_DATE;
  // Number of written bytes
  var numberOfWrittenBytes = !isArray ? buffer.write(key, index, 'utf8') : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;

  // Write the date
  var dateInMilis = Long.fromNumber(value.getTime());
  var lowBits = dateInMilis.getLowBits();
  var highBits = dateInMilis.getHighBits();
  // Encode low bits
  buffer[index++] = lowBits & 0xff;
  buffer[index++] = (lowBits >> 8) & 0xff;
  buffer[index++] = (lowBits >> 16) & 0xff;
  buffer[index++] = (lowBits >> 24) & 0xff;
  // Encode high bits
  buffer[index++] = highBits & 0xff;
  buffer[index++] = (highBits >> 8) & 0xff;
  buffer[index++] = (highBits >> 16) & 0xff;
  buffer[index++] = (highBits >> 24) & 0xff;
  return index;
}

var serializeRegExp = function(buffer, key, value, index, isArray) {
  // Write the type
  buffer[index++] = BSON.BSON_DATA_REGEXP;
  // Number of written bytes
  var numberOfWrittenBytes = !isArray ? buffer.write(key, index, 'utf8') : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  if (value.source && value.source.match(regexp) != null) {
    throw Error("value " + value.source + " must not contain null bytes");
  }
  // Adjust the index
  index = index + buffer.write(value.source, index, 'utf8');
  // Write zero
  buffer[index++] = 0x00;
  // Write the parameters
  if(value.global) buffer[index++] = 0x73; // s
  if(value.ignoreCase) buffer[index++] = 0x69; // i
  if(value.multiline) buffer[index++] = 0x6d; // m
  // Add ending zero
  buffer[index++] = 0x00;
  return index;
}

var serializeBSONRegExp = function(buffer, key, value, index, isArray) {
  // Write the type
  buffer[index++] = BSON.BSON_DATA_REGEXP;
  // Number of written bytes
  var numberOfWrittenBytes = !isArray ? buffer.write(key, index, 'utf8') : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  // Adjust the index
  index = index + buffer.write(value.pattern, index, 'utf8');
  // Write zero
  buffer[index++] = 0x00;
  // Write the options
  index = index + buffer.write(value.options, index, 'utf8');
  // Add ending zero
  buffer[index++] = 0x00;
  return index;
}

var serializeMinMax = function(buffer, key, value, index, isArray) {
  // Write the type of either min or max key
  if(value === null) {
    buffer[index++] = BSON.BSON_DATA_NULL;
  } else if(value instanceof MinKey) {
    buffer[index++] = BSON.BSON_DATA_MIN_KEY;
  } else {
    buffer[index++] = BSON.BSON_DATA_MAX_KEY;
  }

  // Number of written bytes
  var numberOfWrittenBytes = !isArray ? buffer.write(key, index, 'utf8') : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  return index;
}

var serializeObjectId = function(buffer, key, value, index, isArray) {
  // Write the type
  buffer[index++] = BSON.BSON_DATA_OID;
  // Number of written bytes
  var numberOfWrittenBytes = !isArray ? buffer.write(key, index, 'utf8') : buffer.write(key, index, 'ascii');

  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;

  // Write the objectId into the shared buffer
  if(typeof value.id == 'string') {
    buffer.write(value.id, index, 'binary')
  } else if(value.id && value.id.copy){
    value.id.copy(buffer, index, 0, 12);
  } else {
    throw new Error('object [' + JSON.stringify(value) + "] is not a valid ObjectId");
  }

  // Ajust index
  return index + 12;
}

var serializeBuffer = function(buffer, key, value, index, isArray) {
  // Write the type
  buffer[index++] = BSON.BSON_DATA_BINARY;
  // Number of written bytes
  var numberOfWrittenBytes = !isArray ? buffer.write(key, index, 'utf8') : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  // Get size of the buffer (current write point)
  var size = value.length;
  // Write the size of the string to buffer
  buffer[index++] = size & 0xff;
  buffer[index++] = (size >> 8) & 0xff;
  buffer[index++] = (size >> 16) & 0xff;
  buffer[index++] = (size >> 24) & 0xff;
  // Write the default subtype
  buffer[index++] = BSON.BSON_BINARY_SUBTYPE_DEFAULT;
  // Copy the content form the binary field to the buffer
  value.copy(buffer, index, 0, size);
  // Adjust the index
  index = index + size;
  return index;
}

var serializeObject = function(buffer, key, value, index, checkKeys, depth, serializeFunctions, ignoreUndefined, isArray) {
  // Write the type
  buffer[index++] = Array.isArray(value) ? BSON.BSON_DATA_ARRAY : BSON.BSON_DATA_OBJECT;
  // Number of written bytes
  var numberOfWrittenBytes = !isArray ? buffer.write(key, index, 'utf8') : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  var endIndex = serializeInto(buffer, value, checkKeys, index, depth + 1, serializeFunctions, ignoreUndefined);
  // Write size
  var size = endIndex - index;
  return endIndex;
}

var serializeDecimal128 = function(buffer, key, value, index, isArray) {
  buffer[index++] = BSON.BSON_DATA_DECIMAL128;
  // Number of written bytes
  var numberOfWrittenBytes = !isArray ? buffer.write(key, index, 'utf8') : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  // Write the data from the value
  value.bytes.copy(buffer, index, 0, 16);
  return index + 16;
}

var serializeLong = function(buffer, key, value, index, isArray) {
  // Write the type
  buffer[index++] = value._bsontype == 'Long' ? BSON.BSON_DATA_LONG : BSON.BSON_DATA_TIMESTAMP;
  // Number of written bytes
  var numberOfWrittenBytes = !isArray ? buffer.write(key, index, 'utf8') : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  // Write the date
  var lowBits = value.getLowBits();
  var highBits = value.getHighBits();
  // Encode low bits
  buffer[index++] = lowBits & 0xff;
  buffer[index++] = (lowBits >> 8) & 0xff;
  buffer[index++] = (lowBits >> 16) & 0xff;
  buffer[index++] = (lowBits >> 24) & 0xff;
  // Encode high bits
  buffer[index++] = highBits & 0xff;
  buffer[index++] = (highBits >> 8) & 0xff;
  buffer[index++] = (highBits >> 16) & 0xff;
  buffer[index++] = (highBits >> 24) & 0xff;
  return index;
}

var serializeInt32 = function(buffer, key, value, index, isArray) {
  // Set int type 32 bits or less
  buffer[index++] = BSON.BSON_DATA_INT;
  // Number of written bytes
  var numberOfWrittenBytes = !isArray ? buffer.write(key, index, 'utf8') : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  // Write the int value
  buffer[index++] = value & 0xff;
  buffer[index++] = (value >> 8) & 0xff;
  buffer[index++] = (value >> 16) & 0xff;
  buffer[index++] = (value >> 24) & 0xff;
  return index;
}

var serializeDouble = function(buffer, key, value, index, isArray) {
  // Encode as double
  buffer[index++] = BSON.BSON_DATA_NUMBER;
  // Number of written bytes
  var numberOfWrittenBytes = !isArray ? buffer.write(key, index, 'utf8') : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  // Write float
  writeIEEE754(buffer, value, index, 'little', 52, 8);
  // Ajust index
  index = index + 8;
  return index;
}

var serializeFunction = function(buffer, key, value, index, checkKeys, depth, isArray) {
  buffer[index++] = BSON.BSON_DATA_CODE;
  // Number of written bytes
  var numberOfWrittenBytes = !isArray ? buffer.write(key, index, 'utf8') : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  // Function string
  var functionString = value.toString();
  // Write the string
  var size = buffer.write(functionString, index + 4, 'utf8') + 1;
  // Write the size of the string to buffer
  buffer[index] = size & 0xff;
  buffer[index + 1] = (size >> 8) & 0xff;
  buffer[index + 2] = (size >> 16) & 0xff;
  buffer[index + 3] = (size >> 24) & 0xff;
  // Update index
  index = index + 4 + size - 1;
  // Write zero
  buffer[index++] = 0;
  return index;
}

var serializeCode = function(buffer, key, value, index, checkKeys, depth, serializeFunctions, ignoreUndefined, isArray) {
  if(value.scope && typeof value.scope == 'object') {
    // Write the type
    buffer[index++] = BSON.BSON_DATA_CODE_W_SCOPE;
    // Number of written bytes
    var numberOfWrittenBytes = !isArray ? buffer.write(key, index, 'utf8') : buffer.write(key, index, 'ascii');
    // Encode the name
    index = index + numberOfWrittenBytes;
    buffer[index++] = 0;

    // Starting index
    var startIndex = index;

    // Serialize the function
    // Get the function string
    var functionString = typeof value.code == 'string' ? value.code : value.code.toString();
    // Index adjustment
    index = index + 4;
    // Write string into buffer
    var codeSize = buffer.write(functionString, index + 4, 'utf8') + 1;
    // Write the size of the string to buffer
    buffer[index] = codeSize & 0xff;
    buffer[index + 1] = (codeSize >> 8) & 0xff;
    buffer[index + 2] = (codeSize >> 16) & 0xff;
    buffer[index + 3] = (codeSize >> 24) & 0xff;
    // Write end 0
    buffer[index + 4 + codeSize - 1] = 0;
    // Write the
    index = index + codeSize + 4;

    //
    // Serialize the scope value
    var endIndex = serializeInto(buffer, value.scope, checkKeys, index, depth + 1, serializeFunctions, ignoreUndefined)
    index = endIndex - 1;

    // Writ the total
    var totalSize = endIndex - startIndex;

    // Write the total size of the object
    buffer[startIndex++] = totalSize & 0xff;
    buffer[startIndex++] = (totalSize >> 8) & 0xff;
    buffer[startIndex++] = (totalSize >> 16) & 0xff;
    buffer[startIndex++] = (totalSize >> 24) & 0xff;
    // Write trailing zero
    buffer[index++] = 0;
  } else {
    buffer[index++] = BSON.BSON_DATA_CODE;
    // Number of written bytes
    var numberOfWrittenBytes = !isArray ? buffer.write(key, index, 'utf8') : buffer.write(key, index, 'ascii');
    // Encode the name
    index = index + numberOfWrittenBytes;
    buffer[index++] = 0;
    // Function string
    var functionString = value.code.toString();
    // Write the string
    var size = buffer.write(functionString, index + 4, 'utf8') + 1;
    // Write the size of the string to buffer
    buffer[index] = size & 0xff;
    buffer[index + 1] = (size >> 8) & 0xff;
    buffer[index + 2] = (size >> 16) & 0xff;
    buffer[index + 3] = (size >> 24) & 0xff;
    // Update index
    index = index + 4 + size - 1;
    // Write zero
    buffer[index++] = 0;
  }

  return index;
}

var serializeBinary = function(buffer, key, value, index, isArray) {
  // Write the type
  buffer[index++] = BSON.BSON_DATA_BINARY;
  // Number of written bytes
  var numberOfWrittenBytes = !isArray ? buffer.write(key, index, 'utf8') : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  // Extract the buffer
  var data = value.value(true);
  // Calculate size
  var size = value.position;
  // Add the deprecated 02 type 4 bytes of size to total
  if(value.sub_type == Binary.SUBTYPE_BYTE_ARRAY) size = size + 4;
  // Write the size of the string to buffer
  buffer[index++] = size & 0xff;
  buffer[index++] = (size >> 8) & 0xff;
  buffer[index++] = (size >> 16) & 0xff;
  buffer[index++] = (size >> 24) & 0xff;
  // Write the subtype to the buffer
  buffer[index++] = value.sub_type;

  // If we have binary type 2 the 4 first bytes are the size
  if(value.sub_type == Binary.SUBTYPE_BYTE_ARRAY) {
    size = size - 4;
    buffer[index++] = size & 0xff;
    buffer[index++] = (size >> 8) & 0xff;
    buffer[index++] = (size >> 16) & 0xff;
    buffer[index++] = (size >> 24) & 0xff;
  }

  // Write the data to the object
  data.copy(buffer, index, 0, value.position);
  // Adjust the index
  index = index + value.position;
  return index;
}

var serializeSymbol = function(buffer, key, value, index, isArray) {
  // Write the type
  buffer[index++] = BSON.BSON_DATA_SYMBOL;
  // Number of written bytes
  var numberOfWrittenBytes = !isArray ? buffer.write(key, index, 'utf8') : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  // Write the string
  var size = buffer.write(value.value, index + 4, 'utf8') + 1;
  // Write the size of the string to buffer
  buffer[index] = size & 0xff;
  buffer[index + 1] = (size >> 8) & 0xff;
  buffer[index + 2] = (size >> 16) & 0xff;
  buffer[index + 3] = (size >> 24) & 0xff;
  // Update index
  index = index + 4 + size - 1;
  // Write zero
  buffer[index++] = 0x00;
  return index;
}

var serializeDBRef = function(buffer, key, value, index, depth, serializeFunctions, isArray) {
  // Write the type
  buffer[index++] = BSON.BSON_DATA_OBJECT;
  // Number of written bytes
  var numberOfWrittenBytes = !isArray ? buffer.write(key, index, 'utf8') : buffer.write(key, index, 'ascii');

  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;

  var startIndex = index;
  var endIndex;

  // Serialize object
  if(null != value.db) {
    endIndex = serializeInto(buffer, {
        '$ref': value.namespace
      , '$id' : value.oid
      , '$db' : value.db
    }, false, index, depth + 1, serializeFunctions);
  } else {
    endIndex = serializeInto(buffer, {
        '$ref': value.namespace
      , '$id' : value.oid
    }, false, index, depth + 1, serializeFunctions);
  }

  // Calculate object size
  var size = endIndex - startIndex;
  // Write the size
  buffer[startIndex++] = size & 0xff;
  buffer[startIndex++] = (size >> 8) & 0xff;
  buffer[startIndex++] = (size >> 16) & 0xff;
  buffer[startIndex++] = (size >> 24) & 0xff;
  // Set index
  return endIndex;
}

var serializeInto = function serializeInto(buffer, object, checkKeys, startingIndex, depth, serializeFunctions, ignoreUndefined) {
  startingIndex = startingIndex || 0;

  // Start place to serialize into
  var index = startingIndex + 4;
  var self = this;

  // Special case isArray
  if(Array.isArray(object)) {
    // Get object keys
    for(var i = 0; i < object.length; i++) {
      var key = "" + i;
      var value = object[i];

      // Is there an override value
      if(value && value.toBSON) {
        if(typeof value.toBSON != 'function') throw new Error("toBSON is not a function");
        value = value.toBSON();
      }

      var type = typeof value;
      if(type == 'string') {
        index = serializeString(buffer, key, value, index, true);
      } else if(type == 'number') {
        index = serializeNumber(buffer, key, value, index, true);
      } else if(type == 'boolean') {
        index = serializeBoolean(buffer, key, value, index, true);
      } else if(value instanceof Date || isDate(value)) {
        index = serializeDate(buffer, key, value, index, true);
      } else if(type == 'undefined' || value == null) {
        index = serializeUndefined(buffer, key, value, index, true);
      } else if(value['_bsontype'] == 'ObjectID') {
        index = serializeObjectId(buffer, key, value, index, true);
      } else if(Buffer.isBuffer(value)) {
        index = serializeBuffer(buffer, key, value, index, true);
      } else if(value instanceof RegExp || isRegExp(value)) {
        index = serializeRegExp(buffer, key, value, index, true);
      } else if(type == 'object' && value['_bsontype'] == null) {
        index = serializeObject(buffer, key, value, index, checkKeys, depth, serializeFunctions, ignoreUndefined, true);
      } else if(type == 'object' && value['_bsontype'] == 'Decimal128') {
        index = serializeDecimal128(buffer, key, value, index, true);
      } else if(value['_bsontype'] == 'Long' || value['_bsontype'] == 'Timestamp') {
        index = serializeLong(buffer, key, value, index, true);
      } else if(value['_bsontype'] == 'Double') {
        index = serializeDouble(buffer, key, value, index, true);
      } else if(typeof value == 'function' && serializeFunctions) {
        index = serializeFunction(buffer, key, value, index, checkKeys, depth, serializeFunctions, true);
      } else if(value['_bsontype'] == 'Code') {
        index = serializeCode(buffer, key, value, index, checkKeys, depth, serializeFunctions, ignoreUndefined, true);
      } else if(value['_bsontype'] == 'Binary') {
        index = serializeBinary(buffer, key, value, index, true);
      } else if(value['_bsontype'] == 'Symbol') {
        index = serializeSymbol(buffer, key, value, index, true);
      } else if(value['_bsontype'] == 'DBRef') {
        index = serializeDBRef(buffer, key, value, index, depth, serializeFunctions, true);
      } else if(value['_bsontype'] == 'BSONRegExp') {
        index = serializeBSONRegExp(buffer, key, value, index, true);
      } else if(value['_bsontype'] == 'Int32') {
        index = serializeInt32(buffer, key, value, index, true);
      } else if(value['_bsontype'] == 'MinKey' || value['_bsontype'] == 'MaxKey') {
        index = serializeMinMax(buffer, key, value, index, true);
      }
    }
  } else if(object instanceof Map) {
    var iterator = object.entries();
    var done = false;

    while(!done) {
      // Unpack the next entry
      var entry = iterator.next();
      done = entry.done;
      // Are we done, then skip and terminate
      if(done) continue;

      // Get the entry values
      var key = entry.value[0];
      var value = entry.value[1];

      // Check the type of the value
      var type = typeof value;

      // Check the key and throw error if it's illegal
      if(key != '$db' && key != '$ref' && key != '$id') {
        if (key.match(regexp) != null) {
          // The BSON spec doesn't allow keys with null bytes because keys are
          // null-terminated.
          throw Error("key " + key + " must not contain null bytes");
        }

        if (checkKeys) {
          if('$' == key[0]) {
            throw Error("key " + key + " must not start with '$'");
          } else if (!!~key.indexOf('.')) {
            throw Error("key " + key + " must not contain '.'");
          }
        }
      }

      if(type == 'string') {
        index = serializeString(buffer, key, value, index);
      } else if(type == 'number') {
        index = serializeNumber(buffer, key, value, index);
      } else if(type == 'boolean') {
        index = serializeBoolean(buffer, key, value, index);
      } else if(value instanceof Date || isDate(value)) {
        index = serializeDate(buffer, key, value, index);
      } else if(value === undefined && ignoreUndefined == true) {
      } else if(value === null || value === undefined) {
        index = serializeUndefined(buffer, key, value, index);
      } else if(value['_bsontype'] == 'ObjectID') {
        index = serializeObjectId(buffer, key, value, index);
      } else if(Buffer.isBuffer(value)) {
        index = serializeBuffer(buffer, key, value, index);
      } else if(value instanceof RegExp || isRegExp(value)) {
        index = serializeRegExp(buffer, key, value, index);
      } else if(type == 'object' && value['_bsontype'] == null) {
        index = serializeObject(buffer, key, value, index, checkKeys, depth, serializeFunctions, ignoreUndefined);
      } else if(type == 'object' && value['_bsontype'] == 'Decimal128') {
        index = serializeDecimal128(buffer, key, value, index);
      } else if(value['_bsontype'] == 'Long' || value['_bsontype'] == 'Timestamp') {
        index = serializeLong(buffer, key, value, index);
      } else if(value['_bsontype'] == 'Double') {
        index = serializeDouble(buffer, key, value, index);
      } else if(value['_bsontype'] == 'Code') {
        index = serializeCode(buffer, key, value, index, checkKeys, depth, serializeFunctions, ignoreUndefined);
      } else if(typeof value == 'function' && serializeFunctions) {
        index = serializeFunction(buffer, key, value, index, checkKeys, depth, serializeFunctions);
      } else if(value['_bsontype'] == 'Binary') {
        index = serializeBinary(buffer, key, value, index);
      } else if(value['_bsontype'] == 'Symbol') {
        index = serializeSymbol(buffer, key, value, index);
      } else if(value['_bsontype'] == 'DBRef') {
        index = serializeDBRef(buffer, key, value, index, depth, serializeFunctions);
      } else if(value['_bsontype'] == 'BSONRegExp') {
        index = serializeBSONRegExp(buffer, key, value, index);
      } else if(value['_bsontype'] == 'Int32') {
        index = serializeInt32(buffer, key, value, index);
      } else if(value['_bsontype'] == 'MinKey' || value['_bsontype'] == 'MaxKey') {
        index = serializeMinMax(buffer, key, value, index);
      }
    }
  } else {
    // Did we provide a custom serialization method
    if(object.toBSON) {
      if(typeof object.toBSON != 'function') throw new Error("toBSON is not a function");
      object = object.toBSON();
      if(object != null && typeof object != 'object') throw new Error("toBSON function did not return an object");
    }

    // Iterate over all the keys
    for(var key in object) {
      var value = object[key];
      // Is there an override value
      if(value && value.toBSON) {
        if(typeof value.toBSON != 'function') throw new Error("toBSON is not a function");
        value = value.toBSON();
      }

      // Check the type of the value
      var type = typeof value;

      // Check the key and throw error if it's illegal
      if(key != '$db' && key != '$ref' && key != '$id') {
        if (key.match(regexp) != null) {
          // The BSON spec doesn't allow keys with null bytes because keys are
          // null-terminated.
          throw Error("key " + key + " must not contain null bytes");
        }

        if (checkKeys) {
          if('$' == key[0]) {
            throw Error("key " + key + " must not start with '$'");
          } else if (!!~key.indexOf('.')) {
            throw Error("key " + key + " must not contain '.'");
          }
        }
      }

      if(type == 'string') {
        index = serializeString(buffer, key, value, index);
      } else if(type == 'number') {
        index = serializeNumber(buffer, key, value, index);
      } else if(type == 'boolean') {
        index = serializeBoolean(buffer, key, value, index);
      } else if(value instanceof Date || isDate(value)) {
        index = serializeDate(buffer, key, value, index);
      } else if(value === undefined && ignoreUndefined == true) {
      } else if(value === null || value === undefined) {
        index = serializeUndefined(buffer, key, value, index);
      } else if(value['_bsontype'] == 'ObjectID') {
        index = serializeObjectId(buffer, key, value, index);
      } else if(Buffer.isBuffer(value)) {
        index = serializeBuffer(buffer, key, value, index);
      } else if(value instanceof RegExp || isRegExp(value)) {
        index = serializeRegExp(buffer, key, value, index);
      } else if(type == 'object' && value['_bsontype'] == null) {
        index = serializeObject(buffer, key, value, index, checkKeys, depth, serializeFunctions, ignoreUndefined);
      } else if(type == 'object' && value['_bsontype'] == 'Decimal128') {
        index = serializeDecimal128(buffer, key, value, index);
      } else if(value['_bsontype'] == 'Long' || value['_bsontype'] == 'Timestamp') {
        index = serializeLong(buffer, key, value, index);
      } else if(value['_bsontype'] == 'Double') {
        index = serializeDouble(buffer, key, value, index);
      } else if(value['_bsontype'] == 'Code') {
        index = serializeCode(buffer, key, value, index, checkKeys, depth, serializeFunctions, ignoreUndefined);
      } else if(typeof value == 'function' && serializeFunctions) {
        index = serializeFunction(buffer, key, value, index, checkKeys, depth, serializeFunctions);
      } else if(value['_bsontype'] == 'Binary') {
        index = serializeBinary(buffer, key, value, index);
      } else if(value['_bsontype'] == 'Symbol') {
        index = serializeSymbol(buffer, key, value, index);
      } else if(value['_bsontype'] == 'DBRef') {
        index = serializeDBRef(buffer, key, value, index, depth, serializeFunctions);
      } else if(value['_bsontype'] == 'BSONRegExp') {
        index = serializeBSONRegExp(buffer, key, value, index);
      } else if(value['_bsontype'] == 'Int32') {
        index = serializeInt32(buffer, key, value, index);
      } else if(value['_bsontype'] == 'MinKey' || value['_bsontype'] == 'MaxKey') {
        index = serializeMinMax(buffer, key, value, index);
      }
    }
  }

  // Final padding byte for object
  buffer[index++] = 0x00;

  // Final size
  var size = index - startingIndex;
  // Write the size of the object
  buffer[startingIndex++] = size & 0xff;
  buffer[startingIndex++] = (size >> 8) & 0xff;
  buffer[startingIndex++] = (size >> 16) & 0xff;
  buffer[startingIndex++] = (size >> 24) & 0xff;
  return index;
}

var BSON = {};

/**
 * Contains the function cache if we have that enable to allow for avoiding the eval step on each deserialization, comparison is by md5
 *
 * @ignore
 * @api private
 */
var functionCache = BSON.functionCache = {};

/**
 * Number BSON Type
 *
 * @classconstant BSON_DATA_NUMBER
 **/
BSON.BSON_DATA_NUMBER = 1;
/**
 * String BSON Type
 *
 * @classconstant BSON_DATA_STRING
 **/
BSON.BSON_DATA_STRING = 2;
/**
 * Object BSON Type
 *
 * @classconstant BSON_DATA_OBJECT
 **/
BSON.BSON_DATA_OBJECT = 3;
/**
 * Array BSON Type
 *
 * @classconstant BSON_DATA_ARRAY
 **/
BSON.BSON_DATA_ARRAY = 4;
/**
 * Binary BSON Type
 *
 * @classconstant BSON_DATA_BINARY
 **/
BSON.BSON_DATA_BINARY = 5;
/**
 * ObjectID BSON Type, deprecated
 *
 * @classconstant BSON_DATA_UNDEFINED
 **/
BSON.BSON_DATA_UNDEFINED = 6;
/**
 * ObjectID BSON Type
 *
 * @classconstant BSON_DATA_OID
 **/
BSON.BSON_DATA_OID = 7;
/**
 * Boolean BSON Type
 *
 * @classconstant BSON_DATA_BOOLEAN
 **/
BSON.BSON_DATA_BOOLEAN = 8;
/**
 * Date BSON Type
 *
 * @classconstant BSON_DATA_DATE
 **/
BSON.BSON_DATA_DATE = 9;
/**
 * null BSON Type
 *
 * @classconstant BSON_DATA_NULL
 **/
BSON.BSON_DATA_NULL = 10;
/**
 * RegExp BSON Type
 *
 * @classconstant BSON_DATA_REGEXP
 **/
BSON.BSON_DATA_REGEXP = 11;
/**
 * Code BSON Type
 *
 * @classconstant BSON_DATA_CODE
 **/
BSON.BSON_DATA_CODE = 13;
/**
 * Symbol BSON Type
 *
 * @classconstant BSON_DATA_SYMBOL
 **/
BSON.BSON_DATA_SYMBOL = 14;
/**
 * Code with Scope BSON Type
 *
 * @classconstant BSON_DATA_CODE_W_SCOPE
 **/
BSON.BSON_DATA_CODE_W_SCOPE = 15;
/**
 * 32 bit Integer BSON Type
 *
 * @classconstant BSON_DATA_INT
 **/
BSON.BSON_DATA_INT = 16;
/**
 * Timestamp BSON Type
 *
 * @classconstant BSON_DATA_TIMESTAMP
 **/
BSON.BSON_DATA_TIMESTAMP = 17;
/**
 * Long BSON Type
 *
 * @classconstant BSON_DATA_LONG
 **/
BSON.BSON_DATA_LONG = 18;
/**
 * Long BSON Type
 *
 * @classconstant BSON_DATA_DECIMAL128
 **/
BSON.BSON_DATA_DECIMAL128 = 19;
/**
 * MinKey BSON Type
 *
 * @classconstant BSON_DATA_MIN_KEY
 **/
BSON.BSON_DATA_MIN_KEY = 0xff;
/**
 * MaxKey BSON Type
 *
 * @classconstant BSON_DATA_MAX_KEY
 **/
BSON.BSON_DATA_MAX_KEY = 0x7f;
/**
 * Binary Default Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_DEFAULT
 **/
BSON.BSON_BINARY_SUBTYPE_DEFAULT = 0;
/**
 * Binary Function Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_FUNCTION
 **/
BSON.BSON_BINARY_SUBTYPE_FUNCTION = 1;
/**
 * Binary Byte Array Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_BYTE_ARRAY
 **/
BSON.BSON_BINARY_SUBTYPE_BYTE_ARRAY = 2;
/**
 * Binary UUID Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_UUID
 **/
BSON.BSON_BINARY_SUBTYPE_UUID = 3;
/**
 * Binary MD5 Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_MD5
 **/
BSON.BSON_BINARY_SUBTYPE_MD5 = 4;
/**
 * Binary User Defined Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_USER_DEFINED
 **/
BSON.BSON_BINARY_SUBTYPE_USER_DEFINED = 128;

// BSON MAX VALUES
BSON.BSON_INT32_MAX = 0x7FFFFFFF;
BSON.BSON_INT32_MIN = -0x80000000;

BSON.BSON_INT64_MAX = Math.pow(2, 63) - 1;
BSON.BSON_INT64_MIN = -Math.pow(2, 63);

// JS MAX PRECISE VALUES
BSON.JS_INT_MAX = 0x20000000000000;  // Any integer up to 2^53 can be precisely represented by a double.
BSON.JS_INT_MIN = -0x20000000000000;  // Any integer down to -2^53 can be precisely represented by a double.

// Internal long versions
var JS_INT_MAX_LONG = Long.fromNumber(0x20000000000000);  // Any integer up to 2^53 can be precisely represented by a double.
var JS_INT_MIN_LONG = Long.fromNumber(-0x20000000000000);  // Any integer down to -2^53 can be precisely represented by a double.

module.exports = serializeInto;

}).call(this,require("buffer").Buffer)
},{"../binary":65,"../code":67,"../db_ref":68,"../decimal128":69,"../double":70,"../float_parser":71,"../int_32":72,"../long":73,"../map":74,"../max_key":75,"../min_key":76,"../objectid":77,"../regexp":81,"../symbol":82,"../timestamp":83,"buffer":84}],81:[function(require,module,exports){
/**
 * A class representation of the BSON RegExp type.
 *
 * @class
 * @return {BSONRegExp} A MinKey instance
 */
function BSONRegExp(pattern, options) {
  if(!(this instanceof BSONRegExp)) return new BSONRegExp();
  
  // Execute
  this._bsontype = 'BSONRegExp';
  this.pattern = pattern;
  this.options = options;

  // Validate options
  for(var i = 0; i < options.length; i++) {
    if(!(this.options[i] == 'i' 
      || this.options[i] == 'm'
      || this.options[i] == 'x'
      || this.options[i] == 'l'
      || this.options[i] == 's'
      || this.options[i] == 'u'
    )) {
      throw new Error('the regular expression options [' + this.options[i] + "] is not supported");
    }
  }
}

module.exports = BSONRegExp;
module.exports.BSONRegExp = BSONRegExp;
},{}],82:[function(require,module,exports){
/**
 * A class representation of the BSON Symbol type.
 *
 * @class
 * @deprecated
 * @param {string} value the string representing the symbol.
 * @return {Symbol}
 */
function Symbol(value) {
  if(!(this instanceof Symbol)) return new Symbol(value);
  this._bsontype = 'Symbol';
  this.value = value;
}

/**
 * Access the wrapped string value.
 *
 * @method
 * @return {String} returns the wrapped string.
 */
Symbol.prototype.valueOf = function() {
  return this.value;
};

/**
 * @ignore
 */
Symbol.prototype.toString = function() {
  return this.value;
}

/**
 * @ignore
 */
Symbol.prototype.inspect = function() {
  return this.value;
}

/**
 * @ignore
 */
Symbol.prototype.toJSON = function() {
  return this.value;
}

module.exports = Symbol;
module.exports.Symbol = Symbol;
},{}],83:[function(require,module,exports){
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// Copyright 2009 Google Inc. All Rights Reserved

/**
 * This type is for INTERNAL use in MongoDB only and should not be used in applications.
 * The appropriate corresponding type is the JavaScript Date type.
 * 
 * Defines a Timestamp class for representing a 64-bit two's-complement
 * integer value, which faithfully simulates the behavior of a Java "Timestamp". This
 * implementation is derived from TimestampLib in GWT.
 *
 * Constructs a 64-bit two's-complement integer, given its low and high 32-bit
 * values as *signed* integers.  See the from* functions below for more
 * convenient ways of constructing Timestamps.
 *
 * The internal representation of a Timestamp is the two given signed, 32-bit values.
 * We use 32-bit pieces because these are the size of integers on which
 * Javascript performs bit-operations.  For operations like addition and
 * multiplication, we split each number into 16-bit pieces, which can easily be
 * multiplied within Javascript's floating-point representation without overflow
 * or change in sign.
 *
 * In the algorithms below, we frequently reduce the negative case to the
 * positive case by negating the input(s) and then post-processing the result.
 * Note that we must ALWAYS check specially whether those values are MIN_VALUE
 * (-2^63) because -MIN_VALUE == MIN_VALUE (since 2^63 cannot be represented as
 * a positive number, it overflows back into a negative).  Not handling this
 * case would often result in infinite recursion.
 *
 * @class
 * @param {number} low  the low (signed) 32 bits of the Timestamp.
 * @param {number} high the high (signed) 32 bits of the Timestamp.
 */
function Timestamp(low, high) {
  if(!(this instanceof Timestamp)) return new Timestamp(low, high);
  this._bsontype = 'Timestamp';
  /**
   * @type {number}
   * @ignore
   */
  this.low_ = low | 0;  // force into 32 signed bits.

  /**
   * @type {number}
   * @ignore
   */
  this.high_ = high | 0;  // force into 32 signed bits.
};

/**
 * Return the int value.
 *
 * @return {number} the value, assuming it is a 32-bit integer.
 */
Timestamp.prototype.toInt = function() {
  return this.low_;
};

/**
 * Return the Number value.
 *
 * @method
 * @return {number} the closest floating-point representation to this value.
 */
Timestamp.prototype.toNumber = function() {
  return this.high_ * Timestamp.TWO_PWR_32_DBL_ +
         this.getLowBitsUnsigned();
};

/**
 * Return the JSON value.
 *
 * @method
 * @return {string} the JSON representation.
 */
Timestamp.prototype.toJSON = function() {
  return this.toString();
}

/**
 * Return the String value.
 *
 * @method
 * @param {number} [opt_radix] the radix in which the text should be written.
 * @return {string} the textual representation of this value.
 */
Timestamp.prototype.toString = function(opt_radix) {
  var radix = opt_radix || 10;
  if (radix < 2 || 36 < radix) {
    throw Error('radix out of range: ' + radix);
  }

  if (this.isZero()) {
    return '0';
  }

  if (this.isNegative()) {
    if (this.equals(Timestamp.MIN_VALUE)) {
      // We need to change the Timestamp value before it can be negated, so we remove
      // the bottom-most digit in this base and then recurse to do the rest.
      var radixTimestamp = Timestamp.fromNumber(radix);
      var div = this.div(radixTimestamp);
      var rem = div.multiply(radixTimestamp).subtract(this);
      return div.toString(radix) + rem.toInt().toString(radix);
    } else {
      return '-' + this.negate().toString(radix);
    }
  }

  // Do several (6) digits each time through the loop, so as to
  // minimize the calls to the very expensive emulated div.
  var radixToPower = Timestamp.fromNumber(Math.pow(radix, 6));

  var rem = this;
  var result = '';
  while (true) {
    var remDiv = rem.div(radixToPower);
    var intval = rem.subtract(remDiv.multiply(radixToPower)).toInt();
    var digits = intval.toString(radix);

    rem = remDiv;
    if (rem.isZero()) {
      return digits + result;
    } else {
      while (digits.length < 6) {
        digits = '0' + digits;
      }
      result = '' + digits + result;
    }
  }
};

/**
 * Return the high 32-bits value.
 *
 * @method
 * @return {number} the high 32-bits as a signed value.
 */
Timestamp.prototype.getHighBits = function() {
  return this.high_;
};

/**
 * Return the low 32-bits value.
 *
 * @method
 * @return {number} the low 32-bits as a signed value.
 */
Timestamp.prototype.getLowBits = function() {
  return this.low_;
};

/**
 * Return the low unsigned 32-bits value.
 *
 * @method
 * @return {number} the low 32-bits as an unsigned value.
 */
Timestamp.prototype.getLowBitsUnsigned = function() {
  return (this.low_ >= 0) ?
      this.low_ : Timestamp.TWO_PWR_32_DBL_ + this.low_;
};

/**
 * Returns the number of bits needed to represent the absolute value of this Timestamp.
 *
 * @method
 * @return {number} Returns the number of bits needed to represent the absolute value of this Timestamp.
 */
Timestamp.prototype.getNumBitsAbs = function() {
  if (this.isNegative()) {
    if (this.equals(Timestamp.MIN_VALUE)) {
      return 64;
    } else {
      return this.negate().getNumBitsAbs();
    }
  } else {
    var val = this.high_ != 0 ? this.high_ : this.low_;
    for (var bit = 31; bit > 0; bit--) {
      if ((val & (1 << bit)) != 0) {
        break;
      }
    }
    return this.high_ != 0 ? bit + 33 : bit + 1;
  }
};

/**
 * Return whether this value is zero.
 *
 * @method
 * @return {boolean} whether this value is zero.
 */
Timestamp.prototype.isZero = function() {
  return this.high_ == 0 && this.low_ == 0;
};

/**
 * Return whether this value is negative.
 *
 * @method
 * @return {boolean} whether this value is negative.
 */
Timestamp.prototype.isNegative = function() {
  return this.high_ < 0;
};

/**
 * Return whether this value is odd.
 *
 * @method
 * @return {boolean} whether this value is odd.
 */
Timestamp.prototype.isOdd = function() {
  return (this.low_ & 1) == 1;
};

/**
 * Return whether this Timestamp equals the other
 *
 * @method
 * @param {Timestamp} other Timestamp to compare against.
 * @return {boolean} whether this Timestamp equals the other
 */
Timestamp.prototype.equals = function(other) {
  return (this.high_ == other.high_) && (this.low_ == other.low_);
};

/**
 * Return whether this Timestamp does not equal the other.
 *
 * @method
 * @param {Timestamp} other Timestamp to compare against.
 * @return {boolean} whether this Timestamp does not equal the other.
 */
Timestamp.prototype.notEquals = function(other) {
  return (this.high_ != other.high_) || (this.low_ != other.low_);
};

/**
 * Return whether this Timestamp is less than the other.
 *
 * @method
 * @param {Timestamp} other Timestamp to compare against.
 * @return {boolean} whether this Timestamp is less than the other.
 */
Timestamp.prototype.lessThan = function(other) {
  return this.compare(other) < 0;
};

/**
 * Return whether this Timestamp is less than or equal to the other.
 *
 * @method
 * @param {Timestamp} other Timestamp to compare against.
 * @return {boolean} whether this Timestamp is less than or equal to the other.
 */
Timestamp.prototype.lessThanOrEqual = function(other) {
  return this.compare(other) <= 0;
};

/**
 * Return whether this Timestamp is greater than the other.
 *
 * @method
 * @param {Timestamp} other Timestamp to compare against.
 * @return {boolean} whether this Timestamp is greater than the other.
 */
Timestamp.prototype.greaterThan = function(other) {
  return this.compare(other) > 0;
};

/**
 * Return whether this Timestamp is greater than or equal to the other.
 *
 * @method
 * @param {Timestamp} other Timestamp to compare against.
 * @return {boolean} whether this Timestamp is greater than or equal to the other.
 */
Timestamp.prototype.greaterThanOrEqual = function(other) {
  return this.compare(other) >= 0;
};

/**
 * Compares this Timestamp with the given one.
 *
 * @method
 * @param {Timestamp} other Timestamp to compare against.
 * @return {boolean} 0 if they are the same, 1 if the this is greater, and -1 if the given one is greater.
 */
Timestamp.prototype.compare = function(other) {
  if (this.equals(other)) {
    return 0;
  }

  var thisNeg = this.isNegative();
  var otherNeg = other.isNegative();
  if (thisNeg && !otherNeg) {
    return -1;
  }
  if (!thisNeg && otherNeg) {
    return 1;
  }

  // at this point, the signs are the same, so subtraction will not overflow
  if (this.subtract(other).isNegative()) {
    return -1;
  } else {
    return 1;
  }
};

/**
 * The negation of this value.
 *
 * @method
 * @return {Timestamp} the negation of this value.
 */
Timestamp.prototype.negate = function() {
  if (this.equals(Timestamp.MIN_VALUE)) {
    return Timestamp.MIN_VALUE;
  } else {
    return this.not().add(Timestamp.ONE);
  }
};

/**
 * Returns the sum of this and the given Timestamp.
 *
 * @method
 * @param {Timestamp} other Timestamp to add to this one.
 * @return {Timestamp} the sum of this and the given Timestamp.
 */
Timestamp.prototype.add = function(other) {
  // Divide each number into 4 chunks of 16 bits, and then sum the chunks.

  var a48 = this.high_ >>> 16;
  var a32 = this.high_ & 0xFFFF;
  var a16 = this.low_ >>> 16;
  var a00 = this.low_ & 0xFFFF;

  var b48 = other.high_ >>> 16;
  var b32 = other.high_ & 0xFFFF;
  var b16 = other.low_ >>> 16;
  var b00 = other.low_ & 0xFFFF;

  var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
  c00 += a00 + b00;
  c16 += c00 >>> 16;
  c00 &= 0xFFFF;
  c16 += a16 + b16;
  c32 += c16 >>> 16;
  c16 &= 0xFFFF;
  c32 += a32 + b32;
  c48 += c32 >>> 16;
  c32 &= 0xFFFF;
  c48 += a48 + b48;
  c48 &= 0xFFFF;
  return Timestamp.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
};

/**
 * Returns the difference of this and the given Timestamp.
 *
 * @method
 * @param {Timestamp} other Timestamp to subtract from this.
 * @return {Timestamp} the difference of this and the given Timestamp.
 */
Timestamp.prototype.subtract = function(other) {
  return this.add(other.negate());
};

/**
 * Returns the product of this and the given Timestamp.
 *
 * @method
 * @param {Timestamp} other Timestamp to multiply with this.
 * @return {Timestamp} the product of this and the other.
 */
Timestamp.prototype.multiply = function(other) {
  if (this.isZero()) {
    return Timestamp.ZERO;
  } else if (other.isZero()) {
    return Timestamp.ZERO;
  }

  if (this.equals(Timestamp.MIN_VALUE)) {
    return other.isOdd() ? Timestamp.MIN_VALUE : Timestamp.ZERO;
  } else if (other.equals(Timestamp.MIN_VALUE)) {
    return this.isOdd() ? Timestamp.MIN_VALUE : Timestamp.ZERO;
  }

  if (this.isNegative()) {
    if (other.isNegative()) {
      return this.negate().multiply(other.negate());
    } else {
      return this.negate().multiply(other).negate();
    }
  } else if (other.isNegative()) {
    return this.multiply(other.negate()).negate();
  }

  // If both Timestamps are small, use float multiplication
  if (this.lessThan(Timestamp.TWO_PWR_24_) &&
      other.lessThan(Timestamp.TWO_PWR_24_)) {
    return Timestamp.fromNumber(this.toNumber() * other.toNumber());
  }

  // Divide each Timestamp into 4 chunks of 16 bits, and then add up 4x4 products.
  // We can skip products that would overflow.

  var a48 = this.high_ >>> 16;
  var a32 = this.high_ & 0xFFFF;
  var a16 = this.low_ >>> 16;
  var a00 = this.low_ & 0xFFFF;

  var b48 = other.high_ >>> 16;
  var b32 = other.high_ & 0xFFFF;
  var b16 = other.low_ >>> 16;
  var b00 = other.low_ & 0xFFFF;

  var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
  c00 += a00 * b00;
  c16 += c00 >>> 16;
  c00 &= 0xFFFF;
  c16 += a16 * b00;
  c32 += c16 >>> 16;
  c16 &= 0xFFFF;
  c16 += a00 * b16;
  c32 += c16 >>> 16;
  c16 &= 0xFFFF;
  c32 += a32 * b00;
  c48 += c32 >>> 16;
  c32 &= 0xFFFF;
  c32 += a16 * b16;
  c48 += c32 >>> 16;
  c32 &= 0xFFFF;
  c32 += a00 * b32;
  c48 += c32 >>> 16;
  c32 &= 0xFFFF;
  c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
  c48 &= 0xFFFF;
  return Timestamp.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
};

/**
 * Returns this Timestamp divided by the given one.
 *
 * @method
 * @param {Timestamp} other Timestamp by which to divide.
 * @return {Timestamp} this Timestamp divided by the given one.
 */
Timestamp.prototype.div = function(other) {
  if (other.isZero()) {
    throw Error('division by zero');
  } else if (this.isZero()) {
    return Timestamp.ZERO;
  }

  if (this.equals(Timestamp.MIN_VALUE)) {
    if (other.equals(Timestamp.ONE) ||
        other.equals(Timestamp.NEG_ONE)) {
      return Timestamp.MIN_VALUE;  // recall that -MIN_VALUE == MIN_VALUE
    } else if (other.equals(Timestamp.MIN_VALUE)) {
      return Timestamp.ONE;
    } else {
      // At this point, we have |other| >= 2, so |this/other| < |MIN_VALUE|.
      var halfThis = this.shiftRight(1);
      var approx = halfThis.div(other).shiftLeft(1);
      if (approx.equals(Timestamp.ZERO)) {
        return other.isNegative() ? Timestamp.ONE : Timestamp.NEG_ONE;
      } else {
        var rem = this.subtract(other.multiply(approx));
        var result = approx.add(rem.div(other));
        return result;
      }
    }
  } else if (other.equals(Timestamp.MIN_VALUE)) {
    return Timestamp.ZERO;
  }

  if (this.isNegative()) {
    if (other.isNegative()) {
      return this.negate().div(other.negate());
    } else {
      return this.negate().div(other).negate();
    }
  } else if (other.isNegative()) {
    return this.div(other.negate()).negate();
  }

  // Repeat the following until the remainder is less than other:  find a
  // floating-point that approximates remainder / other *from below*, add this
  // into the result, and subtract it from the remainder.  It is critical that
  // the approximate value is less than or equal to the real value so that the
  // remainder never becomes negative.
  var res = Timestamp.ZERO;
  var rem = this;
  while (rem.greaterThanOrEqual(other)) {
    // Approximate the result of division. This may be a little greater or
    // smaller than the actual value.
    var approx = Math.max(1, Math.floor(rem.toNumber() / other.toNumber()));

    // We will tweak the approximate result by changing it in the 48-th digit or
    // the smallest non-fractional digit, whichever is larger.
    var log2 = Math.ceil(Math.log(approx) / Math.LN2);
    var delta = (log2 <= 48) ? 1 : Math.pow(2, log2 - 48);

    // Decrease the approximation until it is smaller than the remainder.  Note
    // that if it is too large, the product overflows and is negative.
    var approxRes = Timestamp.fromNumber(approx);
    var approxRem = approxRes.multiply(other);
    while (approxRem.isNegative() || approxRem.greaterThan(rem)) {
      approx -= delta;
      approxRes = Timestamp.fromNumber(approx);
      approxRem = approxRes.multiply(other);
    }

    // We know the answer can't be zero... and actually, zero would cause
    // infinite recursion since we would make no progress.
    if (approxRes.isZero()) {
      approxRes = Timestamp.ONE;
    }

    res = res.add(approxRes);
    rem = rem.subtract(approxRem);
  }
  return res;
};

/**
 * Returns this Timestamp modulo the given one.
 *
 * @method
 * @param {Timestamp} other Timestamp by which to mod.
 * @return {Timestamp} this Timestamp modulo the given one.
 */
Timestamp.prototype.modulo = function(other) {
  return this.subtract(this.div(other).multiply(other));
};

/**
 * The bitwise-NOT of this value.
 *
 * @method
 * @return {Timestamp} the bitwise-NOT of this value.
 */
Timestamp.prototype.not = function() {
  return Timestamp.fromBits(~this.low_, ~this.high_);
};

/**
 * Returns the bitwise-AND of this Timestamp and the given one.
 *
 * @method
 * @param {Timestamp} other the Timestamp with which to AND.
 * @return {Timestamp} the bitwise-AND of this and the other.
 */
Timestamp.prototype.and = function(other) {
  return Timestamp.fromBits(this.low_ & other.low_, this.high_ & other.high_);
};

/**
 * Returns the bitwise-OR of this Timestamp and the given one.
 *
 * @method
 * @param {Timestamp} other the Timestamp with which to OR.
 * @return {Timestamp} the bitwise-OR of this and the other.
 */
Timestamp.prototype.or = function(other) {
  return Timestamp.fromBits(this.low_ | other.low_, this.high_ | other.high_);
};

/**
 * Returns the bitwise-XOR of this Timestamp and the given one.
 *
 * @method
 * @param {Timestamp} other the Timestamp with which to XOR.
 * @return {Timestamp} the bitwise-XOR of this and the other.
 */
Timestamp.prototype.xor = function(other) {
  return Timestamp.fromBits(this.low_ ^ other.low_, this.high_ ^ other.high_);
};

/**
 * Returns this Timestamp with bits shifted to the left by the given amount.
 *
 * @method
 * @param {number} numBits the number of bits by which to shift.
 * @return {Timestamp} this shifted to the left by the given amount.
 */
Timestamp.prototype.shiftLeft = function(numBits) {
  numBits &= 63;
  if (numBits == 0) {
    return this;
  } else {
    var low = this.low_;
    if (numBits < 32) {
      var high = this.high_;
      return Timestamp.fromBits(
                 low << numBits,
                 (high << numBits) | (low >>> (32 - numBits)));
    } else {
      return Timestamp.fromBits(0, low << (numBits - 32));
    }
  }
};

/**
 * Returns this Timestamp with bits shifted to the right by the given amount.
 *
 * @method
 * @param {number} numBits the number of bits by which to shift.
 * @return {Timestamp} this shifted to the right by the given amount.
 */
Timestamp.prototype.shiftRight = function(numBits) {
  numBits &= 63;
  if (numBits == 0) {
    return this;
  } else {
    var high = this.high_;
    if (numBits < 32) {
      var low = this.low_;
      return Timestamp.fromBits(
                 (low >>> numBits) | (high << (32 - numBits)),
                 high >> numBits);
    } else {
      return Timestamp.fromBits(
                 high >> (numBits - 32),
                 high >= 0 ? 0 : -1);
    }
  }
};

/**
 * Returns this Timestamp with bits shifted to the right by the given amount, with the new top bits matching the current sign bit.
 *
 * @method
 * @param {number} numBits the number of bits by which to shift.
 * @return {Timestamp} this shifted to the right by the given amount, with zeros placed into the new leading bits.
 */
Timestamp.prototype.shiftRightUnsigned = function(numBits) {
  numBits &= 63;
  if (numBits == 0) {
    return this;
  } else {
    var high = this.high_;
    if (numBits < 32) {
      var low = this.low_;
      return Timestamp.fromBits(
                 (low >>> numBits) | (high << (32 - numBits)),
                 high >>> numBits);
    } else if (numBits == 32) {
      return Timestamp.fromBits(high, 0);
    } else {
      return Timestamp.fromBits(high >>> (numBits - 32), 0);
    }
  }
};

/**
 * Returns a Timestamp representing the given (32-bit) integer value.
 *
 * @method
 * @param {number} value the 32-bit integer in question.
 * @return {Timestamp} the corresponding Timestamp value.
 */
Timestamp.fromInt = function(value) {
  if (-128 <= value && value < 128) {
    var cachedObj = Timestamp.INT_CACHE_[value];
    if (cachedObj) {
      return cachedObj;
    }
  }

  var obj = new Timestamp(value | 0, value < 0 ? -1 : 0);
  if (-128 <= value && value < 128) {
    Timestamp.INT_CACHE_[value] = obj;
  }
  return obj;
};

/**
 * Returns a Timestamp representing the given value, provided that it is a finite number. Otherwise, zero is returned.
 *
 * @method
 * @param {number} value the number in question.
 * @return {Timestamp} the corresponding Timestamp value.
 */
Timestamp.fromNumber = function(value) {
  if (isNaN(value) || !isFinite(value)) {
    return Timestamp.ZERO;
  } else if (value <= -Timestamp.TWO_PWR_63_DBL_) {
    return Timestamp.MIN_VALUE;
  } else if (value + 1 >= Timestamp.TWO_PWR_63_DBL_) {
    return Timestamp.MAX_VALUE;
  } else if (value < 0) {
    return Timestamp.fromNumber(-value).negate();
  } else {
    return new Timestamp(
               (value % Timestamp.TWO_PWR_32_DBL_) | 0,
               (value / Timestamp.TWO_PWR_32_DBL_) | 0);
  }
};

/**
 * Returns a Timestamp representing the 64-bit integer that comes by concatenating the given high and low bits. Each is assumed to use 32 bits.
 *
 * @method
 * @param {number} lowBits the low 32-bits.
 * @param {number} highBits the high 32-bits.
 * @return {Timestamp} the corresponding Timestamp value.
 */
Timestamp.fromBits = function(lowBits, highBits) {
  return new Timestamp(lowBits, highBits);
};

/**
 * Returns a Timestamp representation of the given string, written using the given radix.
 *
 * @method
 * @param {string} str the textual representation of the Timestamp.
 * @param {number} opt_radix the radix in which the text is written.
 * @return {Timestamp} the corresponding Timestamp value.
 */
Timestamp.fromString = function(str, opt_radix) {
  if (str.length == 0) {
    throw Error('number format error: empty string');
  }

  var radix = opt_radix || 10;
  if (radix < 2 || 36 < radix) {
    throw Error('radix out of range: ' + radix);
  }

  if (str.charAt(0) == '-') {
    return Timestamp.fromString(str.substring(1), radix).negate();
  } else if (str.indexOf('-') >= 0) {
    throw Error('number format error: interior "-" character: ' + str);
  }

  // Do several (8) digits each time through the loop, so as to
  // minimize the calls to the very expensive emulated div.
  var radixToPower = Timestamp.fromNumber(Math.pow(radix, 8));

  var result = Timestamp.ZERO;
  for (var i = 0; i < str.length; i += 8) {
    var size = Math.min(8, str.length - i);
    var value = parseInt(str.substring(i, i + size), radix);
    if (size < 8) {
      var power = Timestamp.fromNumber(Math.pow(radix, size));
      result = result.multiply(power).add(Timestamp.fromNumber(value));
    } else {
      result = result.multiply(radixToPower);
      result = result.add(Timestamp.fromNumber(value));
    }
  }
  return result;
};

// NOTE: Common constant values ZERO, ONE, NEG_ONE, etc. are defined below the
// from* methods on which they depend.


/**
 * A cache of the Timestamp representations of small integer values.
 * @type {Object}
 * @ignore
 */
Timestamp.INT_CACHE_ = {};

// NOTE: the compiler should inline these constant values below and then remove
// these variables, so there should be no runtime penalty for these.

/**
 * Number used repeated below in calculations.  This must appear before the
 * first call to any from* function below.
 * @type {number}
 * @ignore
 */
Timestamp.TWO_PWR_16_DBL_ = 1 << 16;

/**
 * @type {number}
 * @ignore
 */
Timestamp.TWO_PWR_24_DBL_ = 1 << 24;

/**
 * @type {number}
 * @ignore
 */
Timestamp.TWO_PWR_32_DBL_ = Timestamp.TWO_PWR_16_DBL_ * Timestamp.TWO_PWR_16_DBL_;

/**
 * @type {number}
 * @ignore
 */
Timestamp.TWO_PWR_31_DBL_ = Timestamp.TWO_PWR_32_DBL_ / 2;

/**
 * @type {number}
 * @ignore
 */
Timestamp.TWO_PWR_48_DBL_ = Timestamp.TWO_PWR_32_DBL_ * Timestamp.TWO_PWR_16_DBL_;

/**
 * @type {number}
 * @ignore
 */
Timestamp.TWO_PWR_64_DBL_ = Timestamp.TWO_PWR_32_DBL_ * Timestamp.TWO_PWR_32_DBL_;

/**
 * @type {number}
 * @ignore
 */
Timestamp.TWO_PWR_63_DBL_ = Timestamp.TWO_PWR_64_DBL_ / 2;

/** @type {Timestamp} */
Timestamp.ZERO = Timestamp.fromInt(0);

/** @type {Timestamp} */
Timestamp.ONE = Timestamp.fromInt(1);

/** @type {Timestamp} */
Timestamp.NEG_ONE = Timestamp.fromInt(-1);

/** @type {Timestamp} */
Timestamp.MAX_VALUE =
    Timestamp.fromBits(0xFFFFFFFF | 0, 0x7FFFFFFF | 0);

/** @type {Timestamp} */
Timestamp.MIN_VALUE = Timestamp.fromBits(0, 0x80000000 | 0);

/**
 * @type {Timestamp}
 * @ignore
 */
Timestamp.TWO_PWR_24_ = Timestamp.fromInt(1 << 24);

/**
 * Expose.
 */
module.exports = Timestamp;
module.exports.Timestamp = Timestamp;
},{}],84:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('is-array')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var kMaxLength = 0x3fffffff

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Note:
 *
 * - Implementation must support adding new properties to `Uint8Array` instances.
 *   Firefox 4-29 lacked support, fixed in Firefox 30+.
 *   See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *  - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *  - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *    incorrect length in some situations.
 *
 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they will
 * get the Object implementation, which is slower but will work correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = (function () {
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        new Uint8Array(1).subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Find the length
  var length
  if (type === 'number')
    length = subject > 0 ? subject >>> 0 : 0
  else if (type === 'string') {
    if (encoding === 'base64')
      subject = base64clean(subject)
    length = Buffer.byteLength(subject, encoding)
  } else if (type === 'object' && subject !== null) { // assume object is array-like
    if (subject.type === 'Buffer' && isArray(subject.data))
      subject = subject.data
    length = +subject.length > 0 ? Math.floor(+subject.length) : 0
  } else
    throw new TypeError('must start with number, buffer, array or string')

  if (this.length > kMaxLength)
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
      'size: 0x' + kMaxLength.toString(16) + ' bytes')

  var buf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer.TYPED_ARRAY_SUPPORT && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    if (Buffer.isBuffer(subject)) {
      for (i = 0; i < length; i++)
        buf[i] = subject.readUInt8(i)
    } else {
      for (i = 0; i < length; i++)
        buf[i] = ((subject[i] % 256) + 256) % 256
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer.TYPED_ARRAY_SUPPORT && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

Buffer.isBuffer = function (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b))
    throw new TypeError('Arguments must be Buffers')

  var x = a.length
  var y = b.length
  for (var i = 0, len = Math.min(x, y); i < len && a[i] === b[i]; i++) {}
  if (i !== len) {
    x = a[i]
    y = b[i]
  }
  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function (list, totalLength) {
  if (!isArray(list)) throw new TypeError('Usage: Buffer.concat(list[, length])')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (totalLength === undefined) {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    case 'hex':
      ret = str.length >>> 1
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    default:
      ret = str.length
  }
  return ret
}

// pre-set for values that may exist in the future
Buffer.prototype.length = undefined
Buffer.prototype.parent = undefined

// toString(encoding, start=0, end=buffer.length)
Buffer.prototype.toString = function (encoding, start, end) {
  var loweredCase = false

  start = start >>> 0
  end = end === undefined || end === Infinity ? this.length : end >>> 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase)
          throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.equals = function (b) {
  if(!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max)
      str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  return Buffer.compare(this, b)
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(byte)) throw new Error('Invalid hex string')
    buf[offset + i] = byte
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function asciiWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function utf16leWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf16leToBytes(string), buf, offset, length, 2)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = utf16leWrite(this, string, offset, length)
      break
    default:
      throw new TypeError('Unknown encoding: ' + encoding)
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function binarySlice (buf, start, end) {
  return asciiSlice(buf, start, end)
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len;
    if (start < 0)
      start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0)
      end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start)
    end = start

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0)
    throw new RangeError('offset is not uint')
  if (offset + ext > length)
    throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
      ((this[offset + 1] << 16) |
      (this[offset + 2] << 8) |
      this[offset + 3])
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80))
    return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16) |
      (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
      (this[offset + 1] << 16) |
      (this[offset + 2] << 8) |
      (this[offset + 3])
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new TypeError('value is out of bounds')
  if (offset + ext > buf.length) throw new TypeError('index out of range')
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = value
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else objectWriteUInt16(this, value, offset, true)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else objectWriteUInt16(this, value, offset, false)
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = value
  } else objectWriteUInt32(this, value, offset, true)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else objectWriteUInt32(this, value, offset, false)
  return offset + 4
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = value
  return offset + 1
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else objectWriteUInt16(this, value, offset, true)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else objectWriteUInt16(this, value, offset, false)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else objectWriteUInt32(this, value, offset, true)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else objectWriteUInt32(this, value, offset, false)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new TypeError('value is out of bounds')
  if (offset + ext > buf.length) throw new TypeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert)
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert)
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  if (end < start) throw new TypeError('sourceEnd < sourceStart')
  if (target_start < 0 || target_start >= target.length)
    throw new TypeError('targetStart out of bounds')
  if (start < 0 || start >= source.length) throw new TypeError('sourceStart out of bounds')
  if (end < 0 || end > source.length) throw new TypeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < len; i++) {
      target[i + target_start] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new TypeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new TypeError('start out of bounds')
  if (end < 0 || end > this.length) throw new TypeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-z]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F) {
      byteArray.push(b)
    } else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++) {
        byteArray.push(parseInt(h[j], 16))
      }
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length, unitSize) {
  if (unitSize) length -= length % unitSize;
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

},{"base64-js":64,"ieee754":89,"is-array":90}],85:[function(require,module,exports){

/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = require('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
               && 'undefined' != typeof chrome.storage
                  ? chrome.storage.local
                  : localstorage();

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // is webkit? http://stackoverflow.com/a/16459606/376773
  return ('WebkitAppearance' in document.documentElement.style) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (window.console && (console.firebug || (console.exception && console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  return JSON.stringify(v);
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs() {
  var args = arguments;
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return args;

  var c = 'color: ' + this.color;
  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
  return args;
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      exports.storage.removeItem('debug');
    } else {
      exports.storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = exports.storage.debug;
  } catch(e) {}
  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage(){
  try {
    return window.localStorage;
  } catch (e) {}
}

},{"./debug":86}],86:[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = debug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lowercased letter, i.e. "n".
 */

exports.formatters = {};

/**
 * Previously assigned color.
 */

var prevColor = 0;

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 *
 * @return {Number}
 * @api private
 */

function selectColor() {
  return exports.colors[prevColor++ % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function debug(namespace) {

  // define the `disabled` version
  function disabled() {
  }
  disabled.enabled = false;

  // define the `enabled` version
  function enabled() {

    var self = enabled;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // add the `color` if not set
    if (null == self.useColors) self.useColors = exports.useColors();
    if (null == self.color && self.useColors) self.color = selectColor();

    var args = Array.prototype.slice.call(arguments);

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %o
      args = ['%o'].concat(args);
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    if ('function' === typeof exports.formatArgs) {
      args = exports.formatArgs.apply(self, args);
    }
    var logFn = enabled.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }
  enabled.enabled = true;

  var fn = exports.enabled(namespace) ? enabled : disabled;

  fn.namespace = namespace;

  return fn;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  var split = (namespaces || '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

},{"ms":132}],87:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],88:[function(require,module,exports){
// TODO Add in pre and post skipping options
module.exports = {
  /**
   *  Declares a new hook to which you can add pres and posts
   *  @param {String} name of the function
   *  @param {Function} the method
   *  @param {Function} the error handler callback
   */
  hook: function (name, fn, errorCb) {
    if (arguments.length === 1 && typeof name === 'object') {
      for (var k in name) { // `name` is a hash of hookName->hookFn
        this.hook(k, name[k]);
      }
      return;
    }

    var proto = this.prototype || this
      , pres = proto._pres = proto._pres || {}
      , posts = proto._posts = proto._posts || {};
    pres[name] = pres[name] || [];
    posts[name] = posts[name] || [];

    proto[name] = function () {
      var self = this
        , hookArgs // arguments eventually passed to the hook - are mutable
        , lastArg = arguments[arguments.length-1]
        , pres = this._pres[name]
        , posts = this._posts[name]
        , _total = pres.length
        , _current = -1
        , _asyncsLeft = proto[name].numAsyncPres
        , _asyncsDone = function(err) {
            if (err) {
              return handleError(err);
            }
            --_asyncsLeft || _done.apply(self, hookArgs);
          }
        , handleError = function(err) {
            if ('function' == typeof lastArg)
              return lastArg(err);
            if (errorCb) return errorCb.call(self, err);
            throw err;
          }
        , _next = function () {
            if (arguments[0] instanceof Error) {
              return handleError(arguments[0]);
            }
            var _args = Array.prototype.slice.call(arguments)
              , currPre
              , preArgs;
            if (_args.length && !(arguments[0] == null && typeof lastArg === 'function'))
              hookArgs = _args;
            if (++_current < _total) {
              currPre = pres[_current]
              if (currPre.isAsync && currPre.length < 2)
                throw new Error("Your pre must have next and done arguments -- e.g., function (next, done, ...)");
              if (currPre.length < 1)
                throw new Error("Your pre must have a next argument -- e.g., function (next, ...)");
              preArgs = (currPre.isAsync
                          ? [once(_next), once(_asyncsDone)]
                          : [once(_next)]).concat(hookArgs);
              return currPre.apply(self, preArgs);
            } else if (!_asyncsLeft) {
              return _done.apply(self, hookArgs);
            }
          }
        , _done = function () {
            var args_ = Array.prototype.slice.call(arguments)
              , ret, total_, current_, next_, done_, postArgs;

            if (_current === _total) {
              
              next_ = function () {
                if (arguments[0] instanceof Error) {
                  return handleError(arguments[0]);
                }
                var args_ = Array.prototype.slice.call(arguments, 1)
                  , currPost
                  , postArgs;
                if (args_.length) hookArgs = args_;
                if (++current_ < total_) {
                  currPost = posts[current_]
                  if (currPost.length < 1)
                    throw new Error("Your post must have a next argument -- e.g., function (next, ...)");
                  postArgs = [once(next_)].concat(hookArgs);
                  return currPost.apply(self, postArgs);
                } else if (typeof lastArg === 'function'){
                  // All post handlers are done, call original callback function
                  return lastArg.apply(self, arguments);
                }
              };

              // We are assuming that if the last argument provided to the wrapped function is a function, it was expecting
              // a callback.  We trap that callback and wait to call it until all post handlers have finished.
              if(typeof lastArg === 'function'){
                args_[args_.length - 1] = once(next_);
              }

              total_ = posts.length;
              current_ = -1;
              ret = fn.apply(self, args_); // Execute wrapped function, post handlers come afterward

              if (total_ && typeof lastArg !== 'function') return next_();  // no callback provided, execute next_() manually
              return ret;
            }
          };

      return _next.apply(this, arguments);
    };
    
    proto[name].numAsyncPres = 0;

    return this;
  },

  pre: function (name, isAsync, fn, errorCb) {
    if ('boolean' !== typeof arguments[1]) {
      errorCb = fn;
      fn = isAsync;
      isAsync = false;
    }
    var proto = this.prototype || this
      , pres = proto._pres = proto._pres || {};

    this._lazySetupHooks(proto, name, errorCb);

    if (fn.isAsync = isAsync) {
      proto[name].numAsyncPres++;
    }

    (pres[name] = pres[name] || []).push(fn);
    return this;
  },
  post: function (name, isAsync, fn) {
    if (arguments.length === 2) {
      fn = isAsync;
      isAsync = false;
    }
    var proto = this.prototype || this
      , posts = proto._posts = proto._posts || {};
    
    this._lazySetupHooks(proto, name);
    (posts[name] = posts[name] || []).push(fn);
    return this;
  },
  removePre: function (name, fnToRemove) {
    var proto = this.prototype || this
      , pres = proto._pres || (proto._pres || {});
    if (!pres[name]) return this;
    if (arguments.length === 1) {
      // Remove all pre callbacks for hook `name`
      pres[name].length = 0;
    } else {
      pres[name] = pres[name].filter( function (currFn) {
        return currFn !== fnToRemove;
      });
    }
    return this;
  },
  removePost: function (name, fnToRemove) {
    var proto = this.prototype || this
      , posts = proto._posts || (proto._posts || {});
    if (!posts[name]) return this;
    if (arguments.length === 1) {
      // Remove all post callbacks for hook `name`
      posts[name].length = 0;
    } else {
      posts[name] = posts[name].filter( function (currFn) {
        return currFn !== fnToRemove;
      });
    }
    return this;
  },
  
  _lazySetupHooks: function (proto, methodName, errorCb) {
    if ('undefined' === typeof proto[methodName].numAsyncPres) {
      this.hook(methodName, proto[methodName], errorCb);
    }
  }
};

function once (fn, scope) {
  return function fnWrapper () {
    if (fnWrapper.hookCalled) return;
    fnWrapper.hookCalled = true;
    fn.apply(scope, arguments);
  };
}

},{}],89:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],90:[function(require,module,exports){

/**
 * isArray
 */

var isArray = Array.isArray;

/**
 * toString
 */

var str = Object.prototype.toString;

/**
 * Whether or not the given `val`
 * is an array.
 *
 * example:
 *
 *        isArray([]);
 *        // > true
 *        isArray(arguments);
 *        // > false
 *        isArray('');
 *        // > false
 *
 * @param {mixed} val
 * @return {bool}
 */

module.exports = isArray || function (val) {
  return !! val && '[object Array]' == str.call(val);
};

},{}],91:[function(require,module,exports){
(function (process){
'use strict';

function Kareem() {
  this._pres = {};
  this._posts = {};
}

Kareem.prototype.execPre = function(name, context, callback) {
  var pres = this._pres[name] || [];
  var numPres = pres.length;
  var numAsyncPres = pres.numAsync || 0;
  var currentPre = 0;
  var asyncPresLeft = numAsyncPres;
  var done = false;

  if (!numPres) {
    return process.nextTick(function() {
      callback(null);
    });
  }

  var next = function() {
    if (currentPre >= numPres) {
      return;
    }
    var pre = pres[currentPre];

    if (pre.isAsync) {
      pre.fn.call(
        context,
        function(error) {
          if (error) {
            if (done) {
              return;
            }
            done = true;
            return callback(error);
          }

          ++currentPre;
          next.apply(context, arguments);
        },
        function(error) {
          if (error) {
            if (done) {
              return;
            }
            done = true;
            return callback(error);
          }

          if (--numAsyncPres === 0) {
            return callback(null);
          }
        });
    } else if (pre.fn.length > 0) {
      var args = [function(error) {
        if (error) {
          if (done) {
            return;
          }
          done = true;
          return callback(error);
        }

        if (++currentPre >= numPres) {
          if (asyncPresLeft > 0) {
            // Leave parallel hooks to run
            return;
          } else {
            return callback(null);
          }
        }

        next.apply(context, arguments);
      }];
      if (arguments.length >= 2) {
        for (var i = 1; i < arguments.length; ++i) {
          args.push(arguments[i]);
        }
      }
      pre.fn.apply(context, args);
    } else {
      pre.fn.call(context);
      if (++currentPre >= numPres) {
        if (asyncPresLeft > 0) {
          // Leave parallel hooks to run
          return;
        } else {
          return process.nextTick(function() {
            callback(null);
          });
        }
      }
      next();
    }
  };

  next();
};

Kareem.prototype.execPreSync = function(name, context) {
  var pres = this._pres[name] || [];
  var numPres = pres.length;

  for (var i = 0; i < numPres; ++i) {
    pres[i].fn.call(context);
  }
};

Kareem.prototype.execPost = function(name, context, args, options, callback) {
  if (arguments.length < 5) {
    callback = options;
    options = null;
  }
  var posts = this._posts[name] || [];
  var numPosts = posts.length;
  var currentPost = 0;

  var firstError = null;
  if (options && options.error) {
    firstError = options.error;
  }

  if (!numPosts) {
    return process.nextTick(function() {
      callback.apply(null, [firstError].concat(args));
    });
  }

  var next = function() {
    var post = posts[currentPost];

    if (firstError) {
      if (post.length === args.length + 2) {
        post.apply(context, [firstError].concat(args).concat(function(error) {
          if (error) {
            firstError = error;
          }
          if (++currentPost >= numPosts) {
            return callback.call(null, firstError);
          }
          next();
        }));
      } else {
        if (++currentPost >= numPosts) {
          return callback.call(null, firstError);
        }
        next();
      }
    } else {
      if (post.length === args.length + 2) {
        // Skip error handlers if no error
        if (++currentPost >= numPosts) {
          return callback.apply(null, [null].concat(args));
        }
        return next();
      }
      if (post.length === args.length + 1) {
        post.apply(context, args.concat(function(error) {
          if (error) {
            firstError = error;
            return next();
          }

          if (++currentPost >= numPosts) {
            return callback.apply(null, [null].concat(args));
          }

          next();
        }));
      } else {
        post.apply(context, args);

        if (++currentPost >= numPosts) {
          return callback.apply(null, [null].concat(args));
        }

        next();
      }
    }
  };

  next();
};

Kareem.prototype.execPostSync = function(name, context) {
  var posts = this._posts[name] || [];
  var numPosts = posts.length;

  for (var i = 0; i < numPosts; ++i) {
    posts[i].call(context);
  }
};

function _handleWrapError(instance, error, name, context, args, options, callback) {
  if (options.useErrorHandlers) {
    var _options = { error: error };
    var newArgs = [];
    // Filter out trailing undefineds
    for (var i = args.length; i >= 0; --i) {
      if (newArgs.length > 0 || args[i] !== void 0) {
        newArgs.unshift(args[i]);
      }
    }
    return instance.execPost(name, context, newArgs, _options, function(error) {
      return typeof callback === 'function' && callback(error);
    });
  } else {
    return typeof callback === 'function' ?
      callback(error) :
      undefined;
  }
}

Kareem.prototype.wrap = function(name, fn, context, args, options) {
  var lastArg = (args.length > 0 ? args[args.length - 1] : null);
  var argsWithoutCb = typeof lastArg === 'function' ?
    args.slice(0, args.length - 1) :
    args;
  var _this = this;

  var useLegacyPost;
  if (typeof options === 'object') {
    useLegacyPost = options && options.useLegacyPost;
  } else {
    useLegacyPost = options;
  }
  options = options || {};

  this.execPre(name, context, function(error) {
    if (error) {
      return _handleWrapError(_this, error, name, context, argsWithoutCb,
        options, lastArg)
    }

    var end = (typeof lastArg === 'function' ? args.length - 1 : args.length);

    fn.apply(context, args.slice(0, end).concat(function() {
      var args = arguments;
      var argsWithoutError = Array.prototype.slice.call(arguments, 1);
      if (arguments[0]) {
        // Assume error
        return _handleWrapError(_this, arguments[0], name, context,
          args, options, lastArg);
      } else {
        if (useLegacyPost && typeof lastArg === 'function') {
          lastArg.apply(context, arguments);
        }

        _this.execPost(name, context, argsWithoutError, function() {
          if (arguments[0]) {
            return typeof lastArg === 'function' ?
              lastArg(arguments[0]) :
              undefined;
          }

          return typeof lastArg === 'function' && !useLegacyPost ?
            lastArg.apply(context, arguments) :
            undefined;
        });
      }
    }));
  });
};

Kareem.prototype.createWrapper = function(name, fn, context, options) {
  var _this = this;
  return function() {
    var args = Array.prototype.slice.call(arguments);
    _this.wrap(name, fn, context, args, options);
  };
};

Kareem.prototype.pre = function(name, isAsync, fn, error) {
  if (typeof arguments[1] !== 'boolean') {
    error = fn;
    fn = isAsync;
    isAsync = false;
  }

  this._pres[name] = this._pres[name] || [];
  var pres = this._pres[name];

  if (isAsync) {
    pres.numAsync = pres.numAsync || 0;
    ++pres.numAsync;
  }

  pres.push({ fn: fn, isAsync: isAsync });

  return this;
};

Kareem.prototype.post = function(name, fn) {
  (this._posts[name] = this._posts[name] || []).push(fn);
  return this;
};

Kareem.prototype.clone = function() {
  var n = new Kareem();
  for (var key in this._pres) {
    n._pres[key] = this._pres[key].slice();
  }
  for (var key in this._posts) {
    n._posts[key] = this._posts[key].slice();
  }

  return n;
};

module.exports = Kareem;

}).call(this,require("g5I+bs"))
},{"g5I+bs":133}],92:[function(require,module,exports){
var getPrototype = require('./_getPrototype');

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * The base implementation of `_.has` without support for deep paths.
 *
 * @private
 * @param {Object} [object] The object to query.
 * @param {Array|string} key The key to check.
 * @returns {boolean} Returns `true` if `key` exists, else `false`.
 */
function baseHas(object, key) {
  // Avoid a bug in IE 10-11 where objects with a [[Prototype]] of `null`,
  // that are composed entirely of index properties, return `false` for
  // `hasOwnProperty` checks of them.
  return object != null &&
    (hasOwnProperty.call(object, key) ||
      (typeof object == 'object' && key in object && getPrototype(object) === null));
}

module.exports = baseHas;

},{"./_getPrototype":97}],93:[function(require,module,exports){
var overArg = require('./_overArg');

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeKeys = Object.keys;

/**
 * The base implementation of `_.keys` which doesn't skip the constructor
 * property of prototypes or treat sparse arrays as dense.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
var baseKeys = overArg(nativeKeys, Object);

module.exports = baseKeys;

},{"./_overArg":101}],94:[function(require,module,exports){
/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new accessor function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

module.exports = baseProperty;

},{}],95:[function(require,module,exports){
/**
 * The base implementation of `_.times` without support for iteratee shorthands
 * or max array length checks.
 *
 * @private
 * @param {number} n The number of times to invoke `iteratee`.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the array of results.
 */
function baseTimes(n, iteratee) {
  var index = -1,
      result = Array(n);

  while (++index < n) {
    result[index] = iteratee(index);
  }
  return result;
}

module.exports = baseTimes;

},{}],96:[function(require,module,exports){
var baseProperty = require('./_baseProperty');

/**
 * Gets the "length" property value of `object`.
 *
 * **Note:** This function is used to avoid a
 * [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792) that affects
 * Safari on at least iOS 8.1-8.3 ARM64.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {*} Returns the "length" value.
 */
var getLength = baseProperty('length');

module.exports = getLength;

},{"./_baseProperty":94}],97:[function(require,module,exports){
var overArg = require('./_overArg');

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeGetPrototype = Object.getPrototypeOf;

/**
 * Gets the `[[Prototype]]` of `value`.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {null|Object} Returns the `[[Prototype]]`.
 */
var getPrototype = overArg(nativeGetPrototype, Object);

module.exports = getPrototype;

},{"./_overArg":101}],98:[function(require,module,exports){
var baseTimes = require('./_baseTimes'),
    isArguments = require('./isArguments'),
    isArray = require('./isArray'),
    isLength = require('./isLength'),
    isString = require('./isString');

/**
 * Creates an array of index keys for `object` values of arrays,
 * `arguments` objects, and strings, otherwise `null` is returned.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array|null} Returns index keys, else `null`.
 */
function indexKeys(object) {
  var length = object ? object.length : undefined;
  if (isLength(length) &&
      (isArray(object) || isString(object) || isArguments(object))) {
    return baseTimes(length, String);
  }
  return null;
}

module.exports = indexKeys;

},{"./_baseTimes":95,"./isArguments":103,"./isArray":104,"./isLength":108,"./isString":111}],99:[function(require,module,exports){
/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER = 9007199254740991;

/** Used to detect unsigned integer values. */
var reIsUint = /^(?:0|[1-9]\d*)$/;

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  length = length == null ? MAX_SAFE_INTEGER : length;
  return !!length &&
    (typeof value == 'number' || reIsUint.test(value)) &&
    (value > -1 && value % 1 == 0 && value < length);
}

module.exports = isIndex;

},{}],100:[function(require,module,exports){
/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Checks if `value` is likely a prototype object.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
 */
function isPrototype(value) {
  var Ctor = value && value.constructor,
      proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto;

  return value === proto;
}

module.exports = isPrototype;

},{}],101:[function(require,module,exports){
/**
 * Creates a function that invokes `func` with its first argument transformed.
 *
 * @private
 * @param {Function} func The function to wrap.
 * @param {Function} transform The argument transform.
 * @returns {Function} Returns the new function.
 */
function overArg(func, transform) {
  return function(arg) {
    return func(transform(arg));
  };
}

module.exports = overArg;

},{}],102:[function(require,module,exports){
var toInteger = require('./toInteger');

/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/**
 * Creates a function that invokes `func`, with the `this` binding and arguments
 * of the created function, while it's called less than `n` times. Subsequent
 * calls to the created function return the result of the last `func` invocation.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Function
 * @param {number} n The number of calls at which `func` is no longer invoked.
 * @param {Function} func The function to restrict.
 * @returns {Function} Returns the new restricted function.
 * @example
 *
 * jQuery(element).on('click', _.before(5, addContactToList));
 * // => Allows adding up to 4 contacts to the list.
 */
function before(n, func) {
  var result;
  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  n = toInteger(n);
  return function() {
    if (--n > 0) {
      result = func.apply(this, arguments);
    }
    if (n <= 1) {
      func = undefined;
    }
    return result;
  };
}

module.exports = before;

},{"./toInteger":117}],103:[function(require,module,exports){
var isArrayLikeObject = require('./isArrayLikeObject');

/** `Object#toString` result references. */
var argsTag = '[object Arguments]';

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/** Built-in value references. */
var propertyIsEnumerable = objectProto.propertyIsEnumerable;

/**
 * Checks if `value` is likely an `arguments` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 *  else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
function isArguments(value) {
  // Safari 8.1 incorrectly makes `arguments.callee` enumerable in strict mode.
  return isArrayLikeObject(value) && hasOwnProperty.call(value, 'callee') &&
    (!propertyIsEnumerable.call(value, 'callee') || objectToString.call(value) == argsTag);
}

module.exports = isArguments;

},{"./isArrayLikeObject":106}],104:[function(require,module,exports){
/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(document.body.children);
 * // => false
 *
 * _.isArray('abc');
 * // => false
 *
 * _.isArray(_.noop);
 * // => false
 */
var isArray = Array.isArray;

module.exports = isArray;

},{}],105:[function(require,module,exports){
var getLength = require('./_getLength'),
    isFunction = require('./isFunction'),
    isLength = require('./isLength');

/**
 * Checks if `value` is array-like. A value is considered array-like if it's
 * not a function and has a `value.length` that's an integer greater than or
 * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 * @example
 *
 * _.isArrayLike([1, 2, 3]);
 * // => true
 *
 * _.isArrayLike(document.body.children);
 * // => true
 *
 * _.isArrayLike('abc');
 * // => true
 *
 * _.isArrayLike(_.noop);
 * // => false
 */
function isArrayLike(value) {
  return value != null && isLength(getLength(value)) && !isFunction(value);
}

module.exports = isArrayLike;

},{"./_getLength":96,"./isFunction":107,"./isLength":108}],106:[function(require,module,exports){
var isArrayLike = require('./isArrayLike'),
    isObjectLike = require('./isObjectLike');

/**
 * This method is like `_.isArrayLike` except that it also checks if `value`
 * is an object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array-like object,
 *  else `false`.
 * @example
 *
 * _.isArrayLikeObject([1, 2, 3]);
 * // => true
 *
 * _.isArrayLikeObject(document.body.children);
 * // => true
 *
 * _.isArrayLikeObject('abc');
 * // => false
 *
 * _.isArrayLikeObject(_.noop);
 * // => false
 */
function isArrayLikeObject(value) {
  return isObjectLike(value) && isArrayLike(value);
}

module.exports = isArrayLikeObject;

},{"./isArrayLike":105,"./isObjectLike":110}],107:[function(require,module,exports){
var isObject = require('./isObject');

/** `Object#toString` result references. */
var funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]';

/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a function, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 8 which returns 'object' for typed array and weak map constructors,
  // and PhantomJS 1.9 which returns 'function' for `NodeList` instances.
  var tag = isObject(value) ? objectToString.call(value) : '';
  return tag == funcTag || tag == genTag;
}

module.exports = isFunction;

},{"./isObject":109}],108:[function(require,module,exports){
/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is loosely based on
 * [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length,
 *  else `false`.
 * @example
 *
 * _.isLength(3);
 * // => true
 *
 * _.isLength(Number.MIN_VALUE);
 * // => false
 *
 * _.isLength(Infinity);
 * // => false
 *
 * _.isLength('3');
 * // => false
 */
function isLength(value) {
  return typeof value == 'number' &&
    value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

module.exports = isLength;

},{}],109:[function(require,module,exports){
/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/6.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

module.exports = isObject;

},{}],110:[function(require,module,exports){
/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

module.exports = isObjectLike;

},{}],111:[function(require,module,exports){
var isArray = require('./isArray'),
    isObjectLike = require('./isObjectLike');

/** `Object#toString` result references. */
var stringTag = '[object String]';

/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/**
 * Checks if `value` is classified as a `String` primitive or object.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a string, else `false`.
 * @example
 *
 * _.isString('abc');
 * // => true
 *
 * _.isString(1);
 * // => false
 */
function isString(value) {
  return typeof value == 'string' ||
    (!isArray(value) && isObjectLike(value) && objectToString.call(value) == stringTag);
}

module.exports = isString;

},{"./isArray":104,"./isObjectLike":110}],112:[function(require,module,exports){
var isObjectLike = require('./isObjectLike');

/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && objectToString.call(value) == symbolTag);
}

module.exports = isSymbol;

},{"./isObjectLike":110}],113:[function(require,module,exports){
var baseHas = require('./_baseHas'),
    baseKeys = require('./_baseKeys'),
    indexKeys = require('./_indexKeys'),
    isArrayLike = require('./isArrayLike'),
    isIndex = require('./_isIndex'),
    isPrototype = require('./_isPrototype');

/**
 * Creates an array of the own enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects. See the
 * [ES spec](http://ecma-international.org/ecma-262/6.0/#sec-object.keys)
 * for more details.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keys(new Foo);
 * // => ['a', 'b'] (iteration order is not guaranteed)
 *
 * _.keys('hi');
 * // => ['0', '1']
 */
function keys(object) {
  var isProto = isPrototype(object);
  if (!(isProto || isArrayLike(object))) {
    return baseKeys(object);
  }
  var indexes = indexKeys(object),
      skipIndexes = !!indexes,
      result = indexes || [],
      length = result.length;

  for (var key in object) {
    if (baseHas(object, key) &&
        !(skipIndexes && (key == 'length' || isIndex(key, length))) &&
        !(isProto && key == 'constructor')) {
      result.push(key);
    }
  }
  return result;
}

module.exports = keys;

},{"./_baseHas":92,"./_baseKeys":93,"./_indexKeys":98,"./_isIndex":99,"./_isPrototype":100,"./isArrayLike":105}],114:[function(require,module,exports){
/**
 * This method returns `undefined`.
 *
 * @static
 * @memberOf _
 * @since 2.3.0
 * @category Util
 * @example
 *
 * _.times(2, _.noop);
 * // => [undefined, undefined]
 */
function noop() {
  // No operation performed.
}

module.exports = noop;

},{}],115:[function(require,module,exports){
var before = require('./before');

/**
 * Creates a function that is restricted to invoking `func` once. Repeat calls
 * to the function return the value of the first invocation. The `func` is
 * invoked with the `this` binding and arguments of the created function.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to restrict.
 * @returns {Function} Returns the new restricted function.
 * @example
 *
 * var initialize = _.once(createApplication);
 * initialize();
 * initialize();
 * // => `createApplication` is invoked once
 */
function once(func) {
  return before(2, func);
}

module.exports = once;

},{"./before":102}],116:[function(require,module,exports){
var toNumber = require('./toNumber');

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0,
    MAX_INTEGER = 1.7976931348623157e+308;

/**
 * Converts `value` to a finite number.
 *
 * @static
 * @memberOf _
 * @since 4.12.0
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {number} Returns the converted number.
 * @example
 *
 * _.toFinite(3.2);
 * // => 3.2
 *
 * _.toFinite(Number.MIN_VALUE);
 * // => 5e-324
 *
 * _.toFinite(Infinity);
 * // => 1.7976931348623157e+308
 *
 * _.toFinite('3.2');
 * // => 3.2
 */
function toFinite(value) {
  if (!value) {
    return value === 0 ? value : 0;
  }
  value = toNumber(value);
  if (value === INFINITY || value === -INFINITY) {
    var sign = (value < 0 ? -1 : 1);
    return sign * MAX_INTEGER;
  }
  return value === value ? value : 0;
}

module.exports = toFinite;

},{"./toNumber":118}],117:[function(require,module,exports){
var toFinite = require('./toFinite');

/**
 * Converts `value` to an integer.
 *
 * **Note:** This method is loosely based on
 * [`ToInteger`](http://www.ecma-international.org/ecma-262/6.0/#sec-tointeger).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {number} Returns the converted integer.
 * @example
 *
 * _.toInteger(3.2);
 * // => 3
 *
 * _.toInteger(Number.MIN_VALUE);
 * // => 0
 *
 * _.toInteger(Infinity);
 * // => 1.7976931348623157e+308
 *
 * _.toInteger('3.2');
 * // => 3
 */
function toInteger(value) {
  var result = toFinite(value),
      remainder = result % 1;

  return result === result ? (remainder ? result - remainder : result) : 0;
}

module.exports = toInteger;

},{"./toFinite":116}],118:[function(require,module,exports){
var isFunction = require('./isFunction'),
    isObject = require('./isObject'),
    isSymbol = require('./isSymbol');

/** Used as references for various `Number` constants. */
var NAN = 0 / 0;

/** Used to match leading and trailing whitespace. */
var reTrim = /^\s+|\s+$/g;

/** Used to detect bad signed hexadecimal string values. */
var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

/** Used to detect binary string values. */
var reIsBinary = /^0b[01]+$/i;

/** Used to detect octal string values. */
var reIsOctal = /^0o[0-7]+$/i;

/** Built-in method references without a dependency on `root`. */
var freeParseInt = parseInt;

/**
 * Converts `value` to a number.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to process.
 * @returns {number} Returns the number.
 * @example
 *
 * _.toNumber(3.2);
 * // => 3.2
 *
 * _.toNumber(Number.MIN_VALUE);
 * // => 5e-324
 *
 * _.toNumber(Infinity);
 * // => Infinity
 *
 * _.toNumber('3.2');
 * // => 3.2
 */
function toNumber(value) {
  if (typeof value == 'number') {
    return value;
  }
  if (isSymbol(value)) {
    return NAN;
  }
  if (isObject(value)) {
    var other = isFunction(value.valueOf) ? value.valueOf() : value;
    value = isObject(other) ? (other + '') : other;
  }
  if (typeof value != 'string') {
    return value === 0 ? value : +value;
  }
  value = value.replace(reTrim, '');
  var isBinary = reIsBinary.test(value);
  return (isBinary || reIsOctal.test(value))
    ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
    : (reIsBadHex.test(value) ? NAN : +value);
}

module.exports = toNumber;

},{"./isFunction":107,"./isObject":109,"./isSymbol":112}],119:[function(require,module,exports){
module.exports = exports = require('./lib');

},{"./lib":120}],120:[function(require,module,exports){
/**
 * Returns the value of object `o` at the given `path`.
 *
 * ####Example:
 *
 *     var obj = {
 *         comments: [
 *             { title: 'exciting!', _doc: { title: 'great!' }}
 *           , { title: 'number dos' }
 *         ]
 *     }
 *
 *     mpath.get('comments.0.title', o)         // 'exciting!'
 *     mpath.get('comments.0.title', o, '_doc') // 'great!'
 *     mpath.get('comments.title', o)           // ['exciting!', 'number dos']
 *
 *     // summary
 *     mpath.get(path, o)
 *     mpath.get(path, o, special)
 *     mpath.get(path, o, map)
 *     mpath.get(path, o, special, map)
 *
 * @param {String} path
 * @param {Object} o
 * @param {String} [special] When this property name is present on any object in the path, walking will continue on the value of this property.
 * @param {Function} [map] Optional function which receives each individual found value. The value returned from `map` is used in the original values place.
 */

exports.get = function (path, o, special, map) {
  var lookup;

  if ('function' == typeof special) {
    if (special.length < 2) {
      map = special;
      special = undefined;
    } else {
      lookup = special;
      special = undefined;
    }
  }

  map || (map = K);

  var parts = 'string' == typeof path
    ? path.split('.')
    : path

  if (!Array.isArray(parts)) {
    throw new TypeError('Invalid `path`. Must be either string or array');
  }

  var obj = o
    , part;

  for (var i = 0; i < parts.length; ++i) {
    part = parts[i];

    if (Array.isArray(obj) && !/^\d+$/.test(part)) {
      // reading a property from the array items
      var paths = parts.slice(i);

      return obj.map(function (item) {
        return item
          ? exports.get(paths, item, special || lookup, map)
          : map(undefined);
      });
    }

    if (lookup) {
      obj = lookup(obj, part);
    } else {
      obj = special && obj[special]
        ? obj[special][part]
        : obj[part];
    }

    if (!obj) return map(obj);
  }

  return map(obj);
}

/**
 * Sets the `val` at the given `path` of object `o`.
 *
 * @param {String} path
 * @param {Anything} val
 * @param {Object} o
 * @param {String} [special] When this property name is present on any object in the path, walking will continue on the value of this property.
 * @param {Function} [map] Optional function which is passed each individual value before setting it. The value returned from `map` is used in the original values place.
 */

exports.set = function (path, val, o, special, map, _copying) {
  var lookup;

  if ('function' == typeof special) {
    if (special.length < 2) {
      map = special;
      special = undefined;
    } else {
      lookup = special;
      special = undefined;
    }
  }

  map || (map = K);

  var parts = 'string' == typeof path
    ? path.split('.')
    : path

  if (!Array.isArray(parts)) {
    throw new TypeError('Invalid `path`. Must be either string or array');
  }

  if (null == o) return;

  // the existance of $ in a path tells us if the user desires
  // the copying of an array instead of setting each value of
  // the array to the one by one to matching positions of the
  // current array.
  var copy = _copying || /\$/.test(path)
    , obj = o
    , part

  for (var i = 0, len = parts.length - 1; i < len; ++i) {
    part = parts[i];

    if ('$' == part) {
      if (i == len - 1) {
        break;
      } else {
        continue;
      }
    }

    if (Array.isArray(obj) && !/^\d+$/.test(part)) {
      var paths = parts.slice(i);
      if (!copy && Array.isArray(val)) {
        for (var j = 0; j < obj.length && j < val.length; ++j) {
          // assignment of single values of array
          exports.set(paths, val[j], obj[j], special || lookup, map, copy);
        }
      } else {
        for (var j = 0; j < obj.length; ++j) {
          // assignment of entire value
          exports.set(paths, val, obj[j], special || lookup, map, copy);
        }
      }
      return;
    }

    if (lookup) {
      obj = lookup(obj, part);
    } else {
      obj = special && obj[special]
        ? obj[special][part]
        : obj[part];
    }

    if (!obj) return;
  }

  // process the last property of the path

  part = parts[len];

  // use the special property if exists
  if (special && obj[special]) {
    obj = obj[special];
  }

  // set the value on the last branch
  if (Array.isArray(obj) && !/^\d+$/.test(part)) {
    if (!copy && Array.isArray(val)) {
      for (var item, j = 0; j < obj.length && j < val.length; ++j) {
        item = obj[j];
        if (item) {
          if (lookup) {
            lookup(item, part, map(val[j]));
          } else {
            if (item[special]) item = item[special];
            item[part] = map(val[j]);
          }
        }
      }
    } else {
      for (var j = 0; j < obj.length; ++j) {
        item = obj[j];
        if (item) {
          if (lookup) {
            lookup(item, part, map(val));
          } else {
            if (item[special]) item = item[special];
            item[part] = map(val);
          }
        }
      }
    }
  } else {
    if (lookup) {
      lookup(obj, part, map(val));
    } else {
      obj[part] = map(val);
    }
  }
}

/*!
 * Returns the value passed to it.
 */

function K (v) {
  return v;
}

},{}],121:[function(require,module,exports){
(function (process){
'use strict';
var util = require('util');
var EventEmitter = require('events').EventEmitter;
function toArray(arr, start, end) {
  return Array.prototype.slice.call(arr, start, end)
}
function strongUnshift(x, arrLike) {
  var arr = toArray(arrLike);
  arr.unshift(x);
  return arr;
}


/**
 * MPromise constructor.
 *
 * _NOTE: The success and failure event names can be overridden by setting `Promise.SUCCESS` and `Promise.FAILURE` respectively._
 *
 * @param {Function} back a function that accepts `fn(err, ...){}` as signature
 * @inherits NodeJS EventEmitter http://nodejs.org/api/events.html#events_class_events_eventemitter
 * @event `reject`: Emits when the promise is rejected (event name may be overridden)
 * @event `fulfill`: Emits when the promise is fulfilled (event name may be overridden)
 * @api public
 */
function Promise(back) {
  this.emitter = new EventEmitter();
  this.emitted = {};
  this.ended = false;
  if ('function' == typeof back) {
    this.ended = true;
    this.onResolve(back);
  }
}


/*
 * Module exports.
 */
module.exports = Promise;


/*!
 * event names
 */
Promise.SUCCESS = 'fulfill';
Promise.FAILURE = 'reject';


/**
 * Adds `listener` to the `event`.
 *
 * If `event` is either the success or failure event and the event has already been emitted, the`listener` is called immediately and passed the results of the original emitted event.
 *
 * @param {String} event
 * @param {Function} callback
 * @return {MPromise} this
 * @api private
 */
Promise.prototype.on = function (event, callback) {
  if (this.emitted[event])
    callback.apply(undefined, this.emitted[event]);
  else
    this.emitter.on(event, callback);

  return this;
};


/**
 * Keeps track of emitted events to run them on `on`.
 *
 * @api private
 */
Promise.prototype.safeEmit = function (event) {
  // ensures a promise can't be fulfill() or reject() more than once
  if (event == Promise.SUCCESS || event == Promise.FAILURE) {
    if (this.emitted[Promise.SUCCESS] || this.emitted[Promise.FAILURE]) {
      return this;
    }
    this.emitted[event] = toArray(arguments, 1);
  }

  this.emitter.emit.apply(this.emitter, arguments);
  return this;
};


/**
 * @api private
 */
Promise.prototype.hasRejectListeners = function () {
  return EventEmitter.listenerCount(this.emitter, Promise.FAILURE) > 0;
};


/**
 * Fulfills this promise with passed arguments.
 *
 * If this promise has already been fulfilled or rejected, no action is taken.
 *
 * @api public
 */
Promise.prototype.fulfill = function () {
  return this.safeEmit.apply(this, strongUnshift(Promise.SUCCESS, arguments));
};


/**
 * Rejects this promise with `reason`.
 *
 * If this promise has already been fulfilled or rejected, no action is taken.
 *
 * @api public
 * @param {Object|String} reason
 * @return {MPromise} this
 */
Promise.prototype.reject = function (reason) {
  if (this.ended && !this.hasRejectListeners())
    throw reason;
  return this.safeEmit(Promise.FAILURE, reason);
};


/**
 * Resolves this promise to a rejected state if `err` is passed or
 * fulfilled state if no `err` is passed.
 *
 * @param {Error} [err] error or null
 * @param {Object} [val] value to fulfill the promise with
 * @api public
 */
Promise.prototype.resolve = function (err, val) {
  if (err) return this.reject(err);
  return this.fulfill(val);
};


/**
 * Adds a listener to the SUCCESS event.
 *
 * @return {MPromise} this
 * @api public
 */
Promise.prototype.onFulfill = function (fn) {
  if (!fn) return this;
  if ('function' != typeof fn) throw new TypeError("fn should be a function");
  return this.on(Promise.SUCCESS, fn);
};


/**
 * Adds a listener to the FAILURE event.
 *
 * @return {MPromise} this
 * @api public
 */
Promise.prototype.onReject = function (fn) {
  if (!fn) return this;
  if ('function' != typeof fn) throw new TypeError("fn should be a function");
  return this.on(Promise.FAILURE, fn);
};


/**
 * Adds a single function as a listener to both SUCCESS and FAILURE.
 *
 * It will be executed with traditional node.js argument position:
 * function (err, args...) {}
 *
 * Also marks the promise as `end`ed, since it's the common use-case, and yet has no
 * side effects unless `fn` is undefined or null.
 *
 * @param {Function} fn
 * @return {MPromise} this
 */
Promise.prototype.onResolve = function (fn) {
  if (!fn) return this;
  if ('function' != typeof fn) throw new TypeError("fn should be a function");
  this.on(Promise.FAILURE, function (err) { fn.call(this, err); });
  this.on(Promise.SUCCESS, function () { fn.apply(this, strongUnshift(null, arguments)); });
  return this;
};


/**
 * Creates a new promise and returns it. If `onFulfill` or
 * `onReject` are passed, they are added as SUCCESS/ERROR callbacks
 * to this promise after the next tick.
 *
 * Conforms to [promises/A+](https://github.com/promises-aplus/promises-spec) specification. Read for more detail how to use this method.
 *
 * ####Example:
 *
 *     var p = new Promise;
 *     p.then(function (arg) {
 *       return arg + 1;
 *     }).then(function (arg) {
 *       throw new Error(arg + ' is an error!');
 *     }).then(null, function (err) {
 *       assert.ok(err instanceof Error);
 *       assert.equal('2 is an error', err.message);
 *     });
 *     p.complete(1);
 *
 * @see promises-A+ https://github.com/promises-aplus/promises-spec
 * @param {Function} onFulfill
 * @param {Function} [onReject]
 * @return {MPromise} newPromise
 */
Promise.prototype.then = function (onFulfill, onReject) {
  var newPromise = new Promise;

  if ('function' == typeof onFulfill) {
    this.onFulfill(handler(newPromise, onFulfill));
  } else {
    this.onFulfill(newPromise.fulfill.bind(newPromise));
  }

  if ('function' == typeof onReject) {
    this.onReject(handler(newPromise, onReject));
  } else {
    this.onReject(newPromise.reject.bind(newPromise));
  }

  return newPromise;
};


function handler(promise, fn) {
  function newTickHandler() {
    var pDomain = promise.emitter.domain;
    if (pDomain && pDomain !== process.domain) pDomain.enter();
    try {
      var x = fn.apply(undefined, boundHandler.args);
    } catch (err) {
      promise.reject(err);
      return;
    }
    resolve(promise, x);
  }
  function boundHandler() {
    boundHandler.args = arguments;
    process.nextTick(newTickHandler);
  }
  return boundHandler;
}


function resolve(promise, x) {
  function fulfillOnce() {
    if (done++) return;
    resolve.apply(undefined, strongUnshift(promise, arguments));
  }
  function rejectOnce(reason) {
    if (done++) return;
    promise.reject(reason);
  }

  if (promise === x) {
    promise.reject(new TypeError("promise and x are the same"));
    return;
  }
  var rest = toArray(arguments, 1);
  var type = typeof x;
  if ('undefined' == type || null == x || !('object' == type || 'function' == type)) {
    promise.fulfill.apply(promise, rest);
    return;
  }

  try {
    var theThen = x.then;
  } catch (err) {
    promise.reject(err);
    return;
  }

  if ('function' != typeof theThen) {
    promise.fulfill.apply(promise, rest);
    return;
  }

  var done = 0;
  try {
    var ret = theThen.call(x, fulfillOnce, rejectOnce);
    return ret;
  } catch (err) {
    if (done++) return;
    promise.reject(err);
  }
}


/**
 * Signifies that this promise was the last in a chain of `then()s`: if a handler passed to the call to `then` which produced this promise throws, the exception will go uncaught.
 *
 * ####Example:
 *
 *     var p = new Promise;
 *     p.then(function(){ throw new Error('shucks') });
 *     setTimeout(function () {
 *       p.fulfill();
 *       // error was caught and swallowed by the promise returned from
 *       // p.then(). we either have to always register handlers on
 *       // the returned promises or we can do the following...
 *     }, 10);
 *
 *     // this time we use .end() which prevents catching thrown errors
 *     var p = new Promise;
 *     var p2 = p.then(function(){ throw new Error('shucks') }).end(); // <--
 *     setTimeout(function () {
 *       p.fulfill(); // throws "shucks"
 *     }, 10);
 *
 * @api public
 * @param {Function} [onReject]
 * @return {MPromise} this
 */
Promise.prototype.end = Promise.prototype['catch'] = function (onReject) {
  if (!onReject && !this.hasRejectListeners())
    onReject = function idRejector(e) { throw e; };
  this.onReject(onReject);
  this.ended = true;
  return this;
};


/**
 * A debug utility function that adds handlers to a promise that will log some output to the `console`
 *
 * ####Example:
 *
 *     var p = new Promise;
 *     p.then(function(){ throw new Error('shucks') });
 *     setTimeout(function () {
 *       p.fulfill();
 *       // error was caught and swallowed by the promise returned from
 *       // p.then(). we either have to always register handlers on
 *       // the returned promises or we can do the following...
 *     }, 10);
 *
 *     // this time we use .end() which prevents catching thrown errors
 *     var p = new Promise;
 *     var p2 = p.then(function(){ throw new Error('shucks') }).end(); // <--
 *     setTimeout(function () {
 *       p.fulfill(); // throws "shucks"
 *     }, 10);
 *
 * @api public
 * @param {MPromise} p
 * @param {String} name
 * @return {MPromise} this
 */
Promise.trace = function (p, name) {
  p.then(
    function () {
      console.log("%s fulfill %j", name, toArray(arguments));
    },
    function () {
      console.log("%s reject %j", name, toArray(arguments));
    }
  )
};


Promise.prototype.chain = function (p2) {
  var p1 = this;
  p1.onFulfill(p2.fulfill.bind(p2));
  p1.onReject(p2.reject.bind(p2));
  return p2;
};


Promise.prototype.all = function (promiseOfArr) {
  var pRet = new Promise;
  this.then(promiseOfArr).then(
    function (promiseArr) {
      var count = 0;
      var ret = [];
      var errSentinel;
      if (!promiseArr.length) pRet.resolve();
      promiseArr.forEach(function (promise, index) {
        if (errSentinel) return;
        count++;
        promise.then(
          function (val) {
            if (errSentinel) return;
            ret[index] = val;
            --count;
            if (count == 0) pRet.fulfill(ret);
          },
          function (err) {
            if (errSentinel) return;
            errSentinel = err;
            pRet.reject(err);
          }
        );
      });
      return pRet;
    }
    , pRet.reject.bind(pRet)
  );
  return pRet;
};


Promise.hook = function (arr) {
  var p1 = new Promise;
  var pFinal = new Promise;
  var signalP = function () {
    --count;
    if (count == 0)
      pFinal.fulfill();
    return pFinal;
  };
  var count = 1;
  var ps = p1;
  arr.forEach(function (hook) {
    ps = ps.then(
      function () {
        var p = new Promise;
        count++;
        hook(p.resolve.bind(p), signalP);
        return p;
      }
    )
  });
  ps = ps.then(signalP);
  p1.resolve();
  return ps;
};


/* This is for the A+ tests, but it's very useful as well */
Promise.fulfilled = function fulfilled() { var p = new Promise; p.fulfill.apply(p, arguments); return p; };
Promise.rejected = function rejected(reason) { return new Promise().reject(reason); };
Promise.deferred = function deferred() {
  var p = new Promise;
  return {
    promise: p,
    reject: p.reject.bind(p),
    resolve: p.fulfill.bind(p),
    callback: p.resolve.bind(p)
  }
};
/* End A+ tests adapter bit */

}).call(this,require("g5I+bs"))
},{"events":87,"g5I+bs":133,"util":138}],122:[function(require,module,exports){
'use strict';

/**
 * methods a collection must implement
 */

var methods = [
    'find'
  , 'findOne'
  , 'update'
  , 'remove'
  , 'count'
  , 'distinct'
  , 'findAndModify'
  , 'aggregate'
  , 'findStream'
];

/**
 * Collection base class from which implementations inherit
 */

function Collection () {}

for (var i = 0, len = methods.length; i < len; ++i) {
  var method = methods[i];
  Collection.prototype[method] = notImplemented(method);
}

module.exports = exports = Collection;
Collection.methods = methods;

/**
 * creates a function which throws an implementation error
 */

function notImplemented (method) {
  return function () {
    throw new Error('collection.' + method + ' not implemented');
  }
}


},{}],123:[function(require,module,exports){
'use strict';

var env = require('../env')

if ('unknown' == env.type) {
  throw new Error('Unknown environment')
}

module.exports =
  env.isNode ? require('./node') :
  env.isMongo ? require('./collection') :
  require('./collection');


},{"../env":125,"./collection":122,"./node":124}],124:[function(require,module,exports){
'use strict';

/**
 * Module dependencies
 */

var Collection = require('./collection');
var utils = require('../utils');

function NodeCollection (col) {
  this.collection = col;
  this.collectionName = col.collectionName;
}

/**
 * inherit from collection base class
 */

utils.inherits(NodeCollection, Collection);

/**
 * find(match, options, function(err, docs))
 */

NodeCollection.prototype.find = function (match, options, cb) {
  this.collection.find(match, options, function (err, cursor) {
    if (err) return cb(err);

    cursor.toArray(cb);
  });
}

/**
 * findOne(match, options, function(err, doc))
 */

NodeCollection.prototype.findOne = function (match, options, cb) {
  this.collection.findOne(match, options, cb);
}

/**
 * count(match, options, function(err, count))
 */

NodeCollection.prototype.count = function (match, options, cb) {
  this.collection.count(match, options, cb);
}

/**
 * distinct(prop, match, options, function(err, count))
 */

NodeCollection.prototype.distinct  = function (prop, match, options, cb) {
  this.collection.distinct(prop, match, options, cb);
}

/**
 * update(match, update, options, function(err[, result]))
 */

NodeCollection.prototype.update = function (match, update, options, cb) {
  this.collection.update(match, update, options, cb);
}

/**
 * remove(match, options, function(err[, result])
 */

NodeCollection.prototype.remove = function (match, options, cb) {
  this.collection.remove(match, options, cb);
}

/**
 * findAndModify(match, update, options, function(err, doc))
 */

NodeCollection.prototype.findAndModify = function (match, update, options, cb) {
  var sort = Array.isArray(options.sort) ? options.sort : [];
  this.collection.findAndModify(match, sort, update, options, cb);
}

/**
 * var stream = findStream(match, findOptions, streamOptions)
 */

NodeCollection.prototype.findStream = function(match, findOptions, streamOptions) {
  return this.collection.find(match, findOptions).stream(streamOptions);
}

/**
 * var cursor = findCursor(match, findOptions)
 */

NodeCollection.prototype.findCursor = function(match, findOptions) {
  return this.collection.find(match, findOptions);
}

/**
 * aggregation(operators..., function(err, doc))
 * TODO
 */

/**
 * Expose
 */

module.exports = exports = NodeCollection;


},{"../utils":128,"./collection":122}],125:[function(require,module,exports){
(function (process,global,Buffer){
'use strict';

exports.isNode = 'undefined' != typeof process
           && 'object' == typeof module
           && 'object' == typeof global
           && 'function' == typeof Buffer
           && process.argv

exports.isMongo = !exports.isNode
           && 'function' == typeof printjson
           && 'function' == typeof ObjectId
           && 'function' == typeof rs
           && 'function' == typeof sh;

exports.isBrowser = !exports.isNode
                 && !exports.isMongo
                 && 'undefined' != typeof window;

exports.type = exports.isNode ? 'node'
  : exports.isMongo ? 'mongo'
  : exports.isBrowser ? 'browser'
  : 'unknown'

}).call(this,require("g5I+bs"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"buffer":84,"g5I+bs":133}],126:[function(require,module,exports){
'use strict';

/**
 * Dependencies
 */

var slice = require('sliced')
var assert = require('assert')
var util = require('util')
var utils = require('./utils')
var debug = require('debug')('mquery');

/**
 * Query constructor used for building queries.
 *
 * ####Example:
 *
 *     var query = new Query({ name: 'mquery' });
 *     query.setOptions({ collection: moduleCollection })
 *     query.where('age').gte(21).exec(callback);
 *
 * @param {Object} [criteria]
 * @param {Object} [options]
 * @api public
 */

function Query (criteria, options) {
  if (!(this instanceof Query))
    return new Query(criteria, options);

  var proto = this.constructor.prototype;

  this.op = proto.op || undefined;

  this.options = {};
  this.setOptions(proto.options);

  this._conditions = proto._conditions
    ? utils.clone(proto._conditions)
    : {};

  this._fields = proto._fields
    ? utils.clone(proto._fields)
    : undefined;

  this._update = proto._update
    ? utils.clone(proto._update)
    : undefined;

  this._path = proto._path || undefined;
  this._distinct = proto._distinct || undefined;
  this._collection = proto._collection || undefined;
  this._traceFunction = proto._traceFunction || undefined;

  if (options) {
    this.setOptions(options);
  }

  if (criteria) {
    if (criteria.find && criteria.remove && criteria.update) {
      // quack quack!
      this.collection(criteria);
    } else {
      this.find(criteria);
    }
  }
}

/**
 * This is a parameter that the user can set which determines if mquery
 * uses $within or $geoWithin for queries. It defaults to true which
 * means $geoWithin will be used. If using MongoDB < 2.4 you should
 * set this to false.
 *
 * @api public
 * @property use$geoWithin
 */

var $withinCmd = '$geoWithin';
Object.defineProperty(Query, 'use$geoWithin', {
    get: function ( ) { return $withinCmd == '$geoWithin' }
  , set: function (v) {
      if (true === v) {
        // mongodb >= 2.4
        $withinCmd = '$geoWithin';
      } else {
        $withinCmd = '$within';
      }
    }
});

/**
 * Converts this query to a constructor function with all arguments and options retained.
 *
 * ####Example
 *
 *     // Create a query that will read documents with a "video" category from
 *     // `aCollection` on the primary node in the replica-set unless it is down,
 *     // in which case we'll read from a secondary node.
 *     var query = mquery({ category: 'video' })
 *     query.setOptions({ collection: aCollection, read: 'primaryPreferred' });
 *
 *     // create a constructor based off these settings
 *     var Video = query.toConstructor();
 *
 *     // Video is now a subclass of mquery() and works the same way but with the
 *     // default query parameters and options set.
 *
 *     // run a query with the previous settings but filter for movies with names
 *     // that start with "Life".
 *     Video().where({ name: /^Life/ }).exec(cb);
 *
 * @return {Query} new Query
 * @api public
 */

Query.prototype.toConstructor = function toConstructor () {
  function CustomQuery (criteria, options) {
    if (!(this instanceof CustomQuery))
      return new CustomQuery(criteria, options);
    Query.call(this, criteria, options);
  }

  utils.inherits(CustomQuery, Query);

  // set inherited defaults
  var p = CustomQuery.prototype;

  p.options = {};
  p.setOptions(this.options);

  p.op = this.op;
  p._conditions = utils.clone(this._conditions);
  p._fields = utils.clone(this._fields);
  p._update = utils.clone(this._update);
  p._path = this._path;
  p._distinct = this._distinct;
  p._collection = this._collection;
  p._traceFunction = this._traceFunction;

  return CustomQuery;
}

/**
 * Sets query options.
 *
 * ####Options:
 *
 * - [tailable](http://www.mongodb.org/display/DOCS/Tailable+Cursors) *
 * - [sort](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Bsort(\)%7D%7D) *
 * - [limit](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Blimit%28%29%7D%7D) *
 * - [skip](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Bskip%28%29%7D%7D) *
 * - [maxScan](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24maxScan) *
 * - [maxTime](http://docs.mongodb.org/manual/reference/operator/meta/maxTimeMS/#op._S_maxTimeMS) *
 * - [batchSize](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7BbatchSize%28%29%7D%7D) *
 * - [comment](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24comment) *
 * - [snapshot](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Bsnapshot%28%29%7D%7D) *
 * - [hint](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24hint) *
 * - [slaveOk](http://docs.mongodb.org/manual/applications/replication/#read-preference) *
 * - [safe](http://www.mongodb.org/display/DOCS/getLastError+Command)
 * - collection the collection to query against
 *
 * _* denotes a query helper method is also available_
 *
 * @param {Object} options
 * @api public
 */

Query.prototype.setOptions = function (options) {
  if (!(options && utils.isObject(options)))
    return this;

  // set arbitrary options
  var methods = utils.keys(options)
    , method

  for (var i = 0; i < methods.length; ++i) {
    method = methods[i];

    // use methods if exist (safer option manipulation)
    if ('function' == typeof this[method]) {
      var args = utils.isArray(options[method])
        ? options[method]
        : [options[method]];
      this[method].apply(this, args)
    } else {
      this.options[method] = options[method];
    }
  }

  return this;
}

/**
 * Sets this Querys collection.
 *
 * @param {Collection} coll
 * @return {Query} this
 */

Query.prototype.collection = function collection (coll) {
  this._collection = new Query.Collection(coll);

  return this;
}

/**
 * Specifies a `$where` condition
 *
 * Use `$where` when you need to select documents using a JavaScript expression.
 *
 * ####Example
 *
 *     query.$where('this.comments.length > 10 || this.name.length > 5')
 *
 *     query.$where(function () {
 *       return this.comments.length > 10 || this.name.length > 5;
 *     })
 *
 * @param {String|Function} js javascript string or function
 * @return {Query} this
 * @memberOf Query
 * @method $where
 * @api public
 */

Query.prototype.$where = function (js) {
  this._conditions.$where = js;
  return this;
}

/**
 * Specifies a `path` for use with chaining.
 *
 * ####Example
 *
 *     // instead of writing:
 *     User.find({age: {$gte: 21, $lte: 65}}, callback);
 *
 *     // we can instead write:
 *     User.where('age').gte(21).lte(65);
 *
 *     // passing query conditions is permitted
 *     User.find().where({ name: 'vonderful' })
 *
 *     // chaining
 *     User
 *     .where('age').gte(21).lte(65)
 *     .where('name', /^vonderful/i)
 *     .where('friends').slice(10)
 *     .exec(callback)
 *
 * @param {String} [path]
 * @param {Object} [val]
 * @return {Query} this
 * @api public
 */

Query.prototype.where = function () {
  if (!arguments.length) return this;
  if (!this.op) this.op = 'find';

  var type = typeof arguments[0];

  if ('string' == type) {
    this._path = arguments[0];

    if (2 === arguments.length) {
      this._conditions[this._path] = arguments[1];
    }

    return this;
  }

  if ('object' == type && !Array.isArray(arguments[0])) {
    return this.merge(arguments[0]);
  }

  throw new TypeError('path must be a string or object');
}

/**
 * Specifies the complementary comparison value for paths specified with `where()`
 *
 * ####Example
 *
 *     User.where('age').equals(49);
 *
 *     // is the same as
 *
 *     User.where('age', 49);
 *
 * @param {Object} val
 * @return {Query} this
 * @api public
 */

Query.prototype.equals = function equals (val) {
  this._ensurePath('equals');
  var path = this._path;
  this._conditions[path] = val;
  return this;
}

/**
 * Specifies the complementary comparison value for paths specified with `where()`
 * This is alias of `equals`
 *
 * ####Example
 *
 *     User.where('age').eq(49);
 *
 *     // is the same as
 *
 *     User.shere('age').equals(49);
 *
 *     // is the same as
 *
 *     User.where('age', 49);
 *
 * @param {Object} val
 * @return {Query} this
 * @api public
 */

Query.prototype.eq = function eq (val) {
  this._ensurePath('eq');
  var path = this._path;
  this._conditions[path] = val;
  return this;
}

/**
 * Specifies arguments for an `$or` condition.
 *
 * ####Example
 *
 *     query.or([{ color: 'red' }, { status: 'emergency' }])
 *
 * @param {Array} array array of conditions
 * @return {Query} this
 * @api public
 */

Query.prototype.or = function or (array) {
  var or = this._conditions.$or || (this._conditions.$or = []);
  if (!utils.isArray(array)) array = [array];
  or.push.apply(or, array);
  return this;
}

/**
 * Specifies arguments for a `$nor` condition.
 *
 * ####Example
 *
 *     query.nor([{ color: 'green' }, { status: 'ok' }])
 *
 * @param {Array} array array of conditions
 * @return {Query} this
 * @api public
 */

Query.prototype.nor = function nor (array) {
  var nor = this._conditions.$nor || (this._conditions.$nor = []);
  if (!utils.isArray(array)) array = [array];
  nor.push.apply(nor, array);
  return this;
}

/**
 * Specifies arguments for a `$and` condition.
 *
 * ####Example
 *
 *     query.and([{ color: 'green' }, { status: 'ok' }])
 *
 * @see $and http://docs.mongodb.org/manual/reference/operator/and/
 * @param {Array} array array of conditions
 * @return {Query} this
 * @api public
 */

Query.prototype.and = function and (array) {
  var and = this._conditions.$and || (this._conditions.$and = []);
  if (!Array.isArray(array)) array = [array];
  and.push.apply(and, array);
  return this;
}

/**
 * Specifies a $gt query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * ####Example
 *
 *     Thing.find().where('age').gt(21)
 *
 *     // or
 *     Thing.find().gt('age', 21)
 *
 * @method gt
 * @memberOf Query
 * @param {String} [path]
 * @param {Number} val
 * @api public
 */

/**
 * Specifies a $gte query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method gte
 * @memberOf Query
 * @param {String} [path]
 * @param {Number} val
 * @api public
 */

/**
 * Specifies a $lt query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method lt
 * @memberOf Query
 * @param {String} [path]
 * @param {Number} val
 * @api public
 */

/**
 * Specifies a $lte query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method lte
 * @memberOf Query
 * @param {String} [path]
 * @param {Number} val
 * @api public
 */

/**
 * Specifies a $ne query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method ne
 * @memberOf Query
 * @param {String} [path]
 * @param {Number} val
 * @api public
 */

/**
 * Specifies an $in query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method in
 * @memberOf Query
 * @param {String} [path]
 * @param {Number} val
 * @api public
 */

/**
 * Specifies an $nin query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method nin
 * @memberOf Query
 * @param {String} [path]
 * @param {Number} val
 * @api public
 */

/**
 * Specifies an $all query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method all
 * @memberOf Query
 * @param {String} [path]
 * @param {Number} val
 * @api public
 */

/**
 * Specifies a $size query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method size
 * @memberOf Query
 * @param {String} [path]
 * @param {Number} val
 * @api public
 */

/**
 * Specifies a $regex query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method regex
 * @memberOf Query
 * @param {String} [path]
 * @param {Number} val
 * @api public
 */

/**
 * Specifies a $maxDistance query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method maxDistance
 * @memberOf Query
 * @param {String} [path]
 * @param {Number} val
 * @api public
 */

/*!
 * gt, gte, lt, lte, ne, in, nin, all, regex, size, maxDistance
 *
 *     Thing.where('type').nin(array)
 */

'gt gte lt lte ne in nin all regex size maxDistance minDistance'.split(' ').forEach(function ($conditional) {
  Query.prototype[$conditional] = function () {
    var path, val;

    if (1 === arguments.length) {
      this._ensurePath($conditional);
      val = arguments[0];
      path = this._path;
    } else {
      val = arguments[1];
      path = arguments[0];
    }

    var conds = this._conditions[path] === null || typeof this._conditions[path] === 'object' ?
      this._conditions[path] : 
      (this._conditions[path] = {});
    conds['$' + $conditional] = val;
    return this;
  };
})

/**
 * Specifies a `$mod` condition
 *
 * @param {String} [path]
 * @param {Number} val
 * @return {Query} this
 * @api public
 */

Query.prototype.mod = function () {
  var val, path;

  if (1 === arguments.length) {
    this._ensurePath('mod')
    val = arguments[0];
    path = this._path;
  } else if (2 === arguments.length && !utils.isArray(arguments[1])) {
    this._ensurePath('mod')
    val = slice(arguments);
    path = this._path;
  } else if (3 === arguments.length) {
    val = slice(arguments, 1);
    path = arguments[0];
  } else {
    val = arguments[1];
    path = arguments[0];
  }

  var conds = this._conditions[path] || (this._conditions[path] = {});
  conds.$mod = val;
  return this;
}

/**
 * Specifies an `$exists` condition
 *
 * ####Example
 *
 *     // { name: { $exists: true }}
 *     Thing.where('name').exists()
 *     Thing.where('name').exists(true)
 *     Thing.find().exists('name')
 *
 *     // { name: { $exists: false }}
 *     Thing.where('name').exists(false);
 *     Thing.find().exists('name', false);
 *
 * @param {String} [path]
 * @param {Number} val
 * @return {Query} this
 * @api public
 */

Query.prototype.exists = function () {
  var path, val;

  if (0 === arguments.length) {
    this._ensurePath('exists');
    path = this._path;
    val = true;
  } else if (1 === arguments.length) {
    if ('boolean' === typeof arguments[0]) {
      this._ensurePath('exists');
      path = this._path;
      val = arguments[0];
    } else {
      path = arguments[0];
      val = true;
    }
  } else if (2 === arguments.length) {
    path = arguments[0];
    val = arguments[1];
  }

  var conds = this._conditions[path] || (this._conditions[path] = {});
  conds.$exists = val;
  return this;
}

/**
 * Specifies an `$elemMatch` condition
 *
 * ####Example
 *
 *     query.elemMatch('comment', { author: 'autobot', votes: {$gte: 5}})
 *
 *     query.where('comment').elemMatch({ author: 'autobot', votes: {$gte: 5}})
 *
 *     query.elemMatch('comment', function (elem) {
 *       elem.where('author').equals('autobot');
 *       elem.where('votes').gte(5);
 *     })
 *
 *     query.where('comment').elemMatch(function (elem) {
 *       elem.where({ author: 'autobot' });
 *       elem.where('votes').gte(5);
 *     })
 *
 * @param {String|Object|Function} path
 * @param {Object|Function} criteria
 * @return {Query} this
 * @api public
 */

Query.prototype.elemMatch = function () {
  if (null == arguments[0])
    throw new TypeError("Invalid argument");

  var fn, path, criteria;

  if ('function' === typeof arguments[0]) {
    this._ensurePath('elemMatch');
    path = this._path;
    fn = arguments[0];
  } else if (utils.isObject(arguments[0])) {
    this._ensurePath('elemMatch');
    path = this._path;
    criteria = arguments[0];
  } else if ('function' === typeof arguments[1]) {
    path = arguments[0];
    fn = arguments[1];
  } else if (arguments[1] && utils.isObject(arguments[1])) {
    path = arguments[0];
    criteria = arguments[1];
  } else {
    throw new TypeError("Invalid argument");
  }

  if (fn) {
    criteria = new Query;
    fn(criteria);
    criteria = criteria._conditions;
  }

  var conds = this._conditions[path] || (this._conditions[path] = {});
  conds.$elemMatch = criteria;
  return this;
}

// Spatial queries

/**
 * Sugar for geo-spatial queries.
 *
 * ####Example
 *
 *     query.within().box()
 *     query.within().circle()
 *     query.within().geometry()
 *
 *     query.where('loc').within({ center: [50,50], radius: 10, unique: true, spherical: true });
 *     query.where('loc').within({ box: [[40.73, -73.9], [40.7, -73.988]] });
 *     query.where('loc').within({ polygon: [[],[],[],[]] });
 *
 *     query.where('loc').within([], [], []) // polygon
 *     query.where('loc').within([], []) // box
 *     query.where('loc').within({ type: 'LineString', coordinates: [...] }); // geometry
 *
 * ####NOTE:
 *
 * Must be used after `where()`.
 *
 * @memberOf Query
 * @return {Query} this
 * @api public
 */

Query.prototype.within = function within () {
  // opinionated, must be used after where
  this._ensurePath('within');
  this._geoComparison = $withinCmd;

  if (0 === arguments.length) {
    return this;
  }

  if (2 === arguments.length) {
    return this.box.apply(this, arguments);
  } else if (2 < arguments.length) {
    return this.polygon.apply(this, arguments);
  }

  var area = arguments[0];

  if (!area)
    throw new TypeError('Invalid argument');

  if (area.center)
    return this.circle(area);

  if (area.box)
    return this.box.apply(this, area.box);

  if (area.polygon)
    return this.polygon.apply(this, area.polygon);

  if (area.type && area.coordinates)
    return this.geometry(area);

  throw new TypeError('Invalid argument');
}

/**
 * Specifies a $box condition
 *
 * ####Example
 *
 *     var lowerLeft = [40.73083, -73.99756]
 *     var upperRight= [40.741404,  -73.988135]
 *
 *     query.where('loc').within().box(lowerLeft, upperRight)
 *     query.box('loc', lowerLeft, upperRight )
 *
 * @see http://www.mongodb.org/display/DOCS/Geospatial+Indexing
 * @see Query#within #query_Query-within
 * @param {String} path
 * @param {Object} val
 * @return {Query} this
 * @api public
 */

Query.prototype.box = function () {
  var path, box;

  if (3 === arguments.length) {
    // box('loc', [], [])
    path = arguments[0];
    box = [arguments[1], arguments[2]];
  } else if (2 === arguments.length) {
    // box([], [])
    this._ensurePath('box');
    path = this._path;
    box = [arguments[0], arguments[1]];
  } else {
    throw new TypeError("Invalid argument");
  }

  var conds = this._conditions[path] || (this._conditions[path] = {});
  conds[this._geoComparison || $withinCmd] = { '$box': box  };
  return this;
}

/**
 * Specifies a $polygon condition
 *
 * ####Example
 *
 *     query.where('loc').within().polygon([10,20], [13, 25], [7,15])
 *     query.polygon('loc', [10,20], [13, 25], [7,15])
 *
 * @param {String|Array} [path]
 * @param {Array|Object} [val]
 * @return {Query} this
 * @see http://www.mongodb.org/display/DOCS/Geospatial+Indexing
 * @api public
 */

Query.prototype.polygon = function () {
  var val, path;

  if ('string' == typeof arguments[0]) {
    // polygon('loc', [],[],[])
    path = arguments[0];
    val = slice(arguments, 1);
  } else {
    // polygon([],[],[])
    this._ensurePath('polygon');
    path = this._path;
    val = slice(arguments);
  }

  var conds = this._conditions[path] || (this._conditions[path] = {});
  conds[this._geoComparison || $withinCmd] = { '$polygon': val };
  return this;
}

/**
 * Specifies a $center or $centerSphere condition.
 *
 * ####Example
 *
 *     var area = { center: [50, 50], radius: 10, unique: true }
 *     query.where('loc').within().circle(area)
 *     query.center('loc', area);
 *
 *     // for spherical calculations
 *     var area = { center: [50, 50], radius: 10, unique: true, spherical: true }
 *     query.where('loc').within().circle(area)
 *     query.center('loc', area);
 *
 * @param {String} [path]
 * @param {Object} area
 * @return {Query} this
 * @see http://www.mongodb.org/display/DOCS/Geospatial+Indexing
 * @api public
 */

Query.prototype.circle = function () {
  var path, val;

  if (1 === arguments.length) {
    this._ensurePath('circle');
    path = this._path;
    val = arguments[0];
  } else if (2 === arguments.length) {
    path = arguments[0];
    val = arguments[1];
  } else {
    throw new TypeError("Invalid argument");
  }

  if (!('radius' in val && val.center))
    throw new Error('center and radius are required');

  var conds = this._conditions[path] || (this._conditions[path] = {});

  var type = val.spherical
    ? '$centerSphere'
    : '$center';

  var wKey = this._geoComparison || $withinCmd;
  conds[wKey] = {};
  conds[wKey][type] = [val.center, val.radius];

  if ('unique' in val)
    conds[wKey].$uniqueDocs = !! val.unique;

  return this;
}

/**
 * Specifies a `$near` or `$nearSphere` condition
 *
 * These operators return documents sorted by distance.
 *
 * ####Example
 *
 *     query.where('loc').near({ center: [10, 10] });
 *     query.where('loc').near({ center: [10, 10], maxDistance: 5 });
 *     query.where('loc').near({ center: [10, 10], maxDistance: 5, spherical: true });
 *     query.near('loc', { center: [10, 10], maxDistance: 5 });
 *     query.near({ center: { type: 'Point', coordinates: [..] }})
 *     query.near().geometry({ type: 'Point', coordinates: [..] })
 *
 * @param {String} [path]
 * @param {Object} val
 * @return {Query} this
 * @see http://www.mongodb.org/display/DOCS/Geospatial+Indexing
 * @api public
 */

Query.prototype.near = function near () {
  var path, val;

  this._geoComparison = '$near';

  if (0 === arguments.length) {
    return this;
  } else if (1 === arguments.length) {
    this._ensurePath('near');
    path = this._path;
    val = arguments[0];
  } else if (2 === arguments.length) {
    path = arguments[0];
    val = arguments[1];
  } else {
    throw new TypeError("Invalid argument");
  }

  if (!val.center) {
    throw new Error('center is required');
  }

  var conds = this._conditions[path] || (this._conditions[path] = {});

  var type = val.spherical
    ? '$nearSphere'
    : '$near';

  // center could be a GeoJSON object or an Array
  if (Array.isArray(val.center)) {
    conds[type] = val.center;

    var radius = 'maxDistance' in val
      ? val.maxDistance
      : null;

    if (null != radius) {
      conds.$maxDistance = radius;
    }
    if (null != val.minDistance) {
      conds.$minDistance = val.minDistance;
    }
  } else {
    // GeoJSON?
    if (val.center.type != 'Point' || !Array.isArray(val.center.coordinates)) {
      throw new Error(util.format("Invalid GeoJSON specified for %s", type));
    }
    conds[type] = { $geometry : val.center };

    // MongoDB 2.6 insists on maxDistance being in $near / $nearSphere
    if ('maxDistance' in val) {
      conds[type]['$maxDistance'] = val.maxDistance;
    }
    if ('minDistance' in val) {
      conds[type]['$minDistance'] = val.minDistance;
    }
  }

  return this;
}

/**
 * Declares an intersects query for `geometry()`.
 *
 * ####Example
 *
 *     query.where('path').intersects().geometry({
 *         type: 'LineString'
 *       , coordinates: [[180.0, 11.0], [180, 9.0]]
 *     })
 *
 *     query.where('path').intersects({
 *         type: 'LineString'
 *       , coordinates: [[180.0, 11.0], [180, 9.0]]
 *     })
 *
 * @param {Object} [arg]
 * @return {Query} this
 * @api public
 */

Query.prototype.intersects = function intersects () {
  // opinionated, must be used after where
  this._ensurePath('intersects');

  this._geoComparison = '$geoIntersects';

  if (0 === arguments.length) {
    return this;
  }

  var area = arguments[0];

  if (null != area && area.type && area.coordinates)
    return this.geometry(area);

  throw new TypeError('Invalid argument');
}

/**
 * Specifies a `$geometry` condition
 *
 * ####Example
 *
 *     var polyA = [[[ 10, 20 ], [ 10, 40 ], [ 30, 40 ], [ 30, 20 ]]]
 *     query.where('loc').within().geometry({ type: 'Polygon', coordinates: polyA })
 *
 *     // or
 *     var polyB = [[ 0, 0 ], [ 1, 1 ]]
 *     query.where('loc').within().geometry({ type: 'LineString', coordinates: polyB })
 *
 *     // or
 *     var polyC = [ 0, 0 ]
 *     query.where('loc').within().geometry({ type: 'Point', coordinates: polyC })
 *
 *     // or
 *     query.where('loc').intersects().geometry({ type: 'Point', coordinates: polyC })
 *
 * ####NOTE:
 *
 * `geometry()` **must** come after either `intersects()` or `within()`.
 *
 * The `object` argument must contain `type` and `coordinates` properties.
 * - type {String}
 * - coordinates {Array}
 *
 * The most recent path passed to `where()` is used.
 *
 * @param {Object} object Must contain a `type` property which is a String and a `coordinates` property which is an Array. See the examples.
 * @return {Query} this
 * @see http://docs.mongodb.org/manual/release-notes/2.4/#new-geospatial-indexes-with-geojson-and-improved-spherical-geometry
 * @see http://www.mongodb.org/display/DOCS/Geospatial+Indexing
 * @see $geometry http://docs.mongodb.org/manual/reference/operator/geometry/
 * @api public
 */

Query.prototype.geometry = function geometry () {
  if (!('$within' == this._geoComparison ||
        '$geoWithin' == this._geoComparison ||
        '$near' == this._geoComparison ||
        '$geoIntersects' == this._geoComparison)) {
    throw new Error('geometry() must come after `within()`, `intersects()`, or `near()');
  }

  var val, path;

  if (1 === arguments.length) {
    this._ensurePath('geometry');
    path = this._path;
    val = arguments[0];
  } else {
    throw new TypeError("Invalid argument");
  }

  if (!(val.type && Array.isArray(val.coordinates))) {
    throw new TypeError('Invalid argument');
  }

  var conds = this._conditions[path] || (this._conditions[path] = {});
  conds[this._geoComparison] = { $geometry: val };

  return this;
}

// end spatial

/**
 * Specifies which document fields to include or exclude
 *
 * ####String syntax
 *
 * When passing a string, prefixing a path with `-` will flag that path as excluded. When a path does not have the `-` prefix, it is included.
 *
 * ####Example
 *
 *     // include a and b, exclude c
 *     query.select('a b -c');
 *
 *     // or you may use object notation, useful when
 *     // you have keys already prefixed with a "-"
 *     query.select({a: 1, b: 1, c: 0});
 *
 * ####Note
 *
 * Cannot be used with `distinct()`
 *
 * @param {Object|String} arg
 * @return {Query} this
 * @see SchemaType
 * @api public
 */

Query.prototype.select = function select () {
  var arg = arguments[0];
  if (!arg) return this;

  if (arguments.length !== 1) {
    throw new Error("Invalid select: select only takes 1 argument");
  }

  this._validate('select');

  var fields = this._fields || (this._fields = {});
  var type = typeof arg;

  if (('string' == type || utils.isArgumentsObject(arg)) &&
    'number' == typeof arg.length) {
    if ('string' == type)
      arg = arg.split(/\s+/);

    for (var i = 0, len = arg.length; i < len; ++i) {
      var field = arg[i];
      if (!field) continue;
      var include = '-' == field[0] ? 0 : 1;
      if (include === 0) field = field.substring(1);
      fields[field] = include;
    }

    return this;
  }

  if (utils.isObject(arg) && !Array.isArray(arg)) {
    var keys = utils.keys(arg);
    for (var i = 0; i < keys.length; ++i) {
      fields[keys[i]] = arg[keys[i]];
    }
    return this;
  }

  throw new TypeError('Invalid select() argument. Must be string or object.');
}

/**
 * Specifies a $slice condition for a `path`
 *
 * ####Example
 *
 *     query.slice('comments', 5)
 *     query.slice('comments', -5)
 *     query.slice('comments', [10, 5])
 *     query.where('comments').slice(5)
 *     query.where('comments').slice([-10, 5])
 *
 * @param {String} [path]
 * @param {Number} val number/range of elements to slice
 * @return {Query} this
 * @see mongodb http://www.mongodb.org/display/DOCS/Retrieving+a+Subset+of+Fields#RetrievingaSubsetofFields-RetrievingaSubrangeofArrayElements
 * @api public
 */

Query.prototype.slice = function () {
  if (0 === arguments.length)
    return this;

  this._validate('slice');

  var path, val;

  if (1 === arguments.length) {
    var arg = arguments[0];
    if (typeof arg === 'object' && !Array.isArray(arg)) {
      var keys = Object.keys(arg);
      var numKeys = keys.length;
      for (var i = 0; i < numKeys; ++i) {
        this.slice(keys[i], arg[keys[i]]);
      }
      return this;
    }
    this._ensurePath('slice');
    path = this._path;
    val = arguments[0];
  } else if (2 === arguments.length) {
    if ('number' === typeof arguments[0]) {
      this._ensurePath('slice');
      path = this._path;
      val = slice(arguments);
    } else {
      path = arguments[0];
      val = arguments[1];
    }
  } else if (3 === arguments.length) {
    path = arguments[0];
    val = slice(arguments, 1);
  }

  var myFields = this._fields || (this._fields = {});
  myFields[path] = { '$slice': val };
  return this;
}

/**
 * Sets the sort order
 *
 * If an object is passed, values allowed are 'asc', 'desc', 'ascending', 'descending', 1, and -1.
 *
 * If a string is passed, it must be a space delimited list of path names. The sort order of each path is ascending unless the path name is prefixed with `-` which will be treated as descending.
 *
 * ####Example
 *
 *     // these are equivalent
 *     query.sort({ field: 'asc', test: -1 });
 *     query.sort('field -test');
 *     query.sort([['field', 1], ['test', -1]]);
 *
 * ####Note
 *
 *  - The array syntax `.sort([['field', 1], ['test', -1]])` can only be used with [mongodb driver >= 2.0.46](https://github.com/mongodb/node-mongodb-native/blob/2.1/HISTORY.md#2046-2015-10-15).
 *  - Cannot be used with `distinct()`
 *
 * @param {Object|String|Array} arg
 * @return {Query} this
 * @api public
 */

Query.prototype.sort = function (arg) {
  if (!arg) return this;
  var len;

  this._validate('sort');

  var type = typeof arg;

  // .sort([['field', 1], ['test', -1]])
  if (Array.isArray(arg)) {
    len = arg.length;
    for (var i = 0; i < arg.length; ++i) {
      _pushArr(this.options, arg[i][0], arg[i][1]);
    }
    return this;
  }

  // .sort('field -test')
  if (1 === arguments.length && 'string' == type) {
    arg = arg.split(/\s+/);
    len = arg.length;
    for (var i = 0; i < len; ++i) {
      var field = arg[i];
      if (!field) continue;
      var ascend = '-' == field[0] ? -1 : 1;
      if (ascend === -1) field = field.substring(1);
      push(this.options, field, ascend);
    }

    return this;
  }

  // .sort({ field: 1, test: -1 })
  if (utils.isObject(arg)) {
    var keys = utils.keys(arg);
    for (var i = 0; i < keys.length; ++i) {
      var field = keys[i];
      push(this.options, field, arg[field]);
    }

    return this;
  }

  throw new TypeError('Invalid sort() argument. Must be a string, object, or array.');
}

/*!
 * @ignore
 */

function push (opts, field, value) {
  if (Array.isArray(opts.sort)) {
    throw new TypeError("Can't mix sort syntaxes. Use either array or object:" +
      "\n- `.sort([['field', 1], ['test', -1]])`" +
      "\n- `.sort({ field: 1, test: -1 })`");
  }

  if (value && value.$meta) {
    var s = opts.sort || (opts.sort = {});
    s[field] = { $meta : value.$meta };
    return;
  }

  var val = String(value || 1).toLowerCase();
  if (!/^(?:ascending|asc|descending|desc|1|-1)$/.test(val)) {
    if (utils.isArray(value)) value = '['+value+']';
    throw new TypeError('Invalid sort value: {' + field + ': ' + value + ' }');
  }
  // store `sort` in a sane format
  var s = opts.sort || (opts.sort = {});
  var valueStr = value.toString()
                  .replace("asc", "1")
                  .replace("ascending", "1")
                  .replace("desc", "-1")
                  .replace("descending", "-1");
  s[field] = parseInt(valueStr, 10);
}

function _pushArr (opts, field, value) {
  opts.sort = opts.sort || [];
  if (!Array.isArray(opts.sort)) {
    throw new TypeError("Can't mix sort syntaxes. Use either array or object:" +
      "\n- `.sort([['field', 1], ['test', -1]])`" +
      "\n- `.sort({ field: 1, test: -1 })`");
  }
  var valueStr = value.toString()
    .replace("asc", "1")
    .replace("ascending", "1")
    .replace("desc", "-1")
    .replace("descending", "-1");
  opts.sort.push([field, value]);
}

/**
 * Specifies the limit option.
 *
 * ####Example
 *
 *     query.limit(20)
 *
 * ####Note
 *
 * Cannot be used with `distinct()`
 *
 * @method limit
 * @memberOf Query
 * @param {Number} val
 * @see mongodb http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Blimit%28%29%7D%7D
 * @api public
 */
/**
 * Specifies the skip option.
 *
 * ####Example
 *
 *     query.skip(100).limit(20)
 *
 * ####Note
 *
 * Cannot be used with `distinct()`
 *
 * @method skip
 * @memberOf Query
 * @param {Number} val
 * @see mongodb http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Bskip%28%29%7D%7D
 * @api public
 */
/**
 * Specifies the maxScan option.
 *
 * ####Example
 *
 *     query.maxScan(100)
 *
 * ####Note
 *
 * Cannot be used with `distinct()`
 *
 * @method maxScan
 * @memberOf Query
 * @param {Number} val
 * @see mongodb http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24maxScan
 * @api public
 */
/**
 * Specifies the batchSize option.
 *
 * ####Example
 *
 *     query.batchSize(100)
 *
 * ####Note
 *
 * Cannot be used with `distinct()`
 *
 * @method batchSize
 * @memberOf Query
 * @param {Number} val
 * @see mongodb http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7BbatchSize%28%29%7D%7D
 * @api public
 */
/**
 * Specifies the `comment` option.
 *
 * ####Example
 *
 *     query.comment('login query')
 *
 * ####Note
 *
 * Cannot be used with `distinct()`
 *
 * @method comment
 * @memberOf Query
 * @param {Number} val
 * @see mongodb http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24comment
 * @api public
 */

/*!
 * limit, skip, maxScan, batchSize, comment
 *
 * Sets these associated options.
 *
 *     query.comment('feed query');
 */

;['limit', 'skip', 'maxScan', 'batchSize', 'comment'].forEach(function (method) {
  Query.prototype[method] = function (v) {
    this._validate(method);
    this.options[method] = v;
    return this;
  };
})

/**
 * Specifies the maxTimeMS option.
 *
 * ####Example
 *
 *     query.maxTime(100)
 *
 * @method maxTime
 * @memberOf Query
 * @param {Number} val
 * @see mongodb http://docs.mongodb.org/manual/reference/operator/meta/maxTimeMS/#op._S_maxTimeMS
 * @api public
 */

Query.prototype.maxTime = function (v) {
  this._validate('maxTime');
  this.options.maxTimeMS = v;
  return this;
};

/**
 * Specifies this query as a `snapshot` query.
 *
 * ####Example
 *
 *     mquery().snapshot() // true
 *     mquery().snapshot(true)
 *     mquery().snapshot(false)
 *
 * ####Note
 *
 * Cannot be used with `distinct()`
 *
 * @see mongodb http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Bsnapshot%28%29%7D%7D
 * @return {Query} this
 * @api public
 */

Query.prototype.snapshot = function () {
  this._validate('snapshot');

  this.options.snapshot = arguments.length
    ? !! arguments[0]
    : true

  return this;
}

/**
 * Sets query hints.
 *
 * ####Example
 *
 *     query.hint({ indexA: 1, indexB: -1})
 *
 * ####Note
 *
 * Cannot be used with `distinct()`
 *
 * @param {Object} val a hint object
 * @return {Query} this
 * @see mongodb http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24hint
 * @api public
 */

Query.prototype.hint = function () {
  if (0 === arguments.length) return this;

  this._validate('hint');

  var arg = arguments[0];
  if (utils.isObject(arg)) {
    var hint = this.options.hint || (this.options.hint = {});

    // must keep object keys in order so don't use Object.keys()
    for (var k in arg) {
      hint[k] = arg[k];
    }

    return this;
  }

  throw new TypeError('Invalid hint. ' + arg);
}

/**
 * Sets the slaveOk option. _Deprecated_ in MongoDB 2.2 in favor of read preferences.
 *
 * ####Example:
 *
 *     query.slaveOk() // true
 *     query.slaveOk(true)
 *     query.slaveOk(false)
 *
 * @deprecated use read() preferences instead if on mongodb >= 2.2
 * @param {Boolean} v defaults to true
 * @see mongodb http://docs.mongodb.org/manual/applications/replication/#read-preference
 * @see read()
 * @return {Query} this
 * @api public
 */

Query.prototype.slaveOk = function (v) {
  this.options.slaveOk = arguments.length ? !!v : true;
  return this;
}

/**
 * Sets the readPreference option for the query.
 *
 * ####Example:
 *
 *     new Query().read('primary')
 *     new Query().read('p')  // same as primary
 *
 *     new Query().read('primaryPreferred')
 *     new Query().read('pp') // same as primaryPreferred
 *
 *     new Query().read('secondary')
 *     new Query().read('s')  // same as secondary
 *
 *     new Query().read('secondaryPreferred')
 *     new Query().read('sp') // same as secondaryPreferred
 *
 *     new Query().read('nearest')
 *     new Query().read('n')  // same as nearest
 *
 *     // you can also use mongodb.ReadPreference class to also specify tags
 *     new Query().read(mongodb.ReadPreference('secondary', [{ dc:'sf', s: 1 },{ dc:'ma', s: 2 }]))
 *
 * ####Preferences:
 *
 *     primary - (default)  Read from primary only. Operations will produce an error if primary is unavailable. Cannot be combined with tags.
 *     secondary            Read from secondary if available, otherwise error.
 *     primaryPreferred     Read from primary if available, otherwise a secondary.
 *     secondaryPreferred   Read from a secondary if available, otherwise read from the primary.
 *     nearest              All operations read from among the nearest candidates, but unlike other modes, this option will include both the primary and all secondaries in the random selection.
 *
 * Aliases
 *
 *     p   primary
 *     pp  primaryPreferred
 *     s   secondary
 *     sp  secondaryPreferred
 *     n   nearest
 *
 * Read more about how to use read preferences [here](http://docs.mongodb.org/manual/applications/replication/#read-preference) and [here](http://mongodb.github.com/node-mongodb-native/driver-articles/anintroductionto1_1and2_2.html#read-preferences).
 *
 * @param {String|ReadPreference} pref one of the listed preference options or their aliases
 * @see mongodb http://docs.mongodb.org/manual/applications/replication/#read-preference
 * @see driver http://mongodb.github.com/node-mongodb-native/driver-articles/anintroductionto1_1and2_2.html#read-preferences
 * @return {Query} this
 * @api public
 */

Query.prototype.read = function (pref) {
  if (arguments.length > 1 && !Query.prototype.read.deprecationWarningIssued) {
    console.error("Deprecation warning: 'tags' argument is not supported anymore in Query.read() method. Please use mongodb.ReadPreference object instead.");
    Query.prototype.read.deprecationWarningIssued = true;
  }
  this.options.readPreference = utils.readPref(pref);
  return this;
}

/**
 * Sets tailable option.
 *
 * ####Example
 *
 *     query.tailable() <== true
 *     query.tailable(true)
 *     query.tailable(false)
 *
 * ####Note
 *
 * Cannot be used with `distinct()`
 *
 * @param {Boolean} v defaults to true
 * @see mongodb http://www.mongodb.org/display/DOCS/Tailable+Cursors
 * @api public
 */

Query.prototype.tailable = function () {
  this._validate('tailable');

  this.options.tailable = arguments.length
    ? !! arguments[0]
    : true;

  return this;
}

/**
 * Merges another Query or conditions object into this one.
 *
 * When a Query is passed, conditions, field selection and options are merged.
 *
 * @param {Query|Object} source
 * @return {Query} this
 */

Query.prototype.merge = function (source) {
  if (!source)
    return this;

  if (!Query.canMerge(source))
    throw new TypeError('Invalid argument. Expected instanceof mquery or plain object');

  if (source instanceof Query) {
    // if source has a feature, apply it to ourselves

    if (source._conditions) {
      utils.merge(this._conditions, source._conditions);
    }

    if (source._fields) {
      this._fields || (this._fields = {});
      utils.merge(this._fields, source._fields);
    }

    if (source.options) {
      this.options || (this.options = {});
      utils.merge(this.options, source.options);
    }

    if (source._update) {
      this._update || (this._update = {});
      utils.mergeClone(this._update, source._update);
    }

    if (source._distinct) {
      this._distinct = source._distinct;
    }

    return this;
  }

  // plain object
  utils.merge(this._conditions, source);

  return this;
}

/**
 * Finds documents.
 *
 * Passing a `callback` executes the query.
 *
 * ####Example
 *
 *     query.find()
 *     query.find(callback)
 *     query.find({ name: 'Burning Lights' }, callback)
 *
 * @param {Object} [criteria] mongodb selector
 * @param {Function} [callback]
 * @return {Query} this
 * @api public
 */

Query.prototype.find = function (criteria, callback) {
  this.op = 'find';

  if ('function' === typeof criteria) {
    callback = criteria;
    criteria = undefined;
  } else if (Query.canMerge(criteria)) {
    this.merge(criteria);
  }

  if (!callback) return this;

  var self = this
    , conds = this._conditions
    , options = this._optionsForExec()

  options.fields = this._fieldsForExec()

  debug('find', this._collection.collectionName, conds, options);
  callback = this._wrapCallback('find', callback, {
    conditions: conds
  , options: options
  });

  this._collection.find(conds, options, utils.tick(callback));
  return this;
}

/**
 * Returns the query cursor
 *
 * ####Examples
 *
 *     query.find().cursor();
 *     query.cursor({ name: 'Burning Lights' });
 *
 * @param {Object} [criteria] mongodb selector
 * @return {Object} cursor
 * @api public
 */

Query.prototype.cursor = function cursor (criteria) {
  if (this.op) {
    if (this.op !== 'find') {
      throw new TypeError(".cursor only support .find method");
    }
  } else {
    this.find(criteria);
  }

  var conds = this._conditions
    , options = this._optionsForExec()

  options.fields = this._fieldsForExec()

  debug('findCursor', this._collection.collectionName, conds, options);
  return this._collection.findCursor(conds, options);
}

/**
 * Executes the query as a findOne() operation.
 *
 * Passing a `callback` executes the query.
 *
 * ####Example
 *
 *     query.findOne().where('name', /^Burning/);
 *
 *     query.findOne({ name: /^Burning/ })
 *
 *     query.findOne({ name: /^Burning/ }, callback); // executes
 *
 *     query.findOne(function (err, doc) {
 *       if (err) return handleError(err);
 *       if (doc) {
 *         // doc may be null if no document matched
 *
 *       }
 *     });
 *
 * @param {Object|Query} [criteria] mongodb selector
 * @param {Function} [callback]
 * @return {Query} this
 * @api public
 */

Query.prototype.findOne = function (criteria, callback) {
  this.op = 'findOne';

  if ('function' === typeof criteria) {
    callback = criteria;
    criteria = undefined;
  } else if (Query.canMerge(criteria)) {
    this.merge(criteria);
  }

  if (!callback) return this;

  var self = this
    , conds = this._conditions
    , options = this._optionsForExec()

  options.fields = this._fieldsForExec();

  debug('findOne', this._collection.collectionName, conds, options);
  callback = this._wrapCallback('findOne', callback, {
    conditions: conds
  , options: options
  });

  this._collection.findOne(conds, options, utils.tick(callback));

  return this;
}

/**
 * Exectues the query as a count() operation.
 *
 * Passing a `callback` executes the query.
 *
 * ####Example
 *
 *     query.count().where('color', 'black').exec(callback);
 *
 *     query.count({ color: 'black' }).count(callback)
 *
 *     query.count({ color: 'black' }, callback)
 *
 *     query.where('color', 'black').count(function (err, count) {
 *       if (err) return handleError(err);
 *       console.log('there are %d kittens', count);
 *     })
 *
 * @param {Object} [criteria] mongodb selector
 * @param {Function} [callback]
 * @return {Query} this
 * @see mongodb http://www.mongodb.org/display/DOCS/Aggregation#Aggregation-Count
 * @api public
 */

Query.prototype.count = function (criteria, callback) {
  this.op = 'count';
  this._validate();

  if ('function' === typeof criteria) {
    callback = criteria;
    criteria = undefined;
  } else if (Query.canMerge(criteria)) {
    this.merge(criteria);
  }

  if (!callback) return this;

  var conds = this._conditions
    , options = this._optionsForExec()

  debug('count', this._collection.collectionName, conds, options);
  callback = this._wrapCallback('count', callback, {
    conditions: conds
  , options: options
  });

  this._collection.count(conds, options, utils.tick(callback));
  return this;
}

/**
 * Declares or executes a distinct() operation.
 *
 * Passing a `callback` executes the query.
 *
 * ####Example
 *
 *     distinct(criteria, field, fn)
 *     distinct(criteria, field)
 *     distinct(field, fn)
 *     distinct(field)
 *     distinct(fn)
 *     distinct()
 *
 * @param {Object|Query} [criteria]
 * @param {String} [field]
 * @param {Function} [callback]
 * @return {Query} this
 * @see mongodb http://www.mongodb.org/display/DOCS/Aggregation#Aggregation-Distinct
 * @api public
 */

Query.prototype.distinct = function (criteria, field, callback) {
  this.op = 'distinct';
  this._validate();

  if (!callback) {
    switch (typeof field) {
      case 'function':
        callback = field;
        if ('string' == typeof criteria) {
          field = criteria;
          criteria = undefined;
        }
        break;
      case 'undefined':
      case 'string':
        break;
      default:
        throw new TypeError('Invalid `field` argument. Must be string or function')
        break;
    }

    switch (typeof criteria) {
      case 'function':
        callback = criteria;
        criteria = field = undefined;
        break;
      case 'string':
        field = criteria;
        criteria = undefined;
        break;
    }
  }

  if ('string' == typeof field) {
    this._distinct = field;
  }

  if (Query.canMerge(criteria)) {
    this.merge(criteria);
  }

  if (!callback) {
    return this;
  }

  if (!this._distinct) {
    throw new Error('No value for `distinct` has been declared');
  }

  var conds = this._conditions
    , options = this._optionsForExec()

  debug('distinct', this._collection.collectionName, conds, options);
  callback = this._wrapCallback('distinct', callback, {
    conditions: conds
  , options: options
  });

  this._collection.distinct(this._distinct, conds, options, utils.tick(callback));

  return this;
}

/**
 * Declare and/or execute this query as an update() operation.
 *
 * _All paths passed that are not $atomic operations will become $set ops._
 *
 * ####Example
 *
 *     mquery({ _id: id }).update({ title: 'words' }, ...)
 *
 * becomes
 *
 *     collection.update({ _id: id }, { $set: { title: 'words' }}, ...)
 *
 * ####Note
 *
 * Passing an empty object `{}` as the doc will result in a no-op unless the `overwrite` option is passed. Without the `overwrite` option set, the update operation will be ignored and the callback executed without sending the command to MongoDB so as to prevent accidently overwritting documents in the collection.
 *
 * ####Note
 *
 * The operation is only executed when a callback is passed. To force execution without a callback (which would be an unsafe write), we must first call update() and then execute it by using the `exec()` method.
 *
 *     var q = mquery(collection).where({ _id: id });
 *     q.update({ $set: { name: 'bob' }}).update(); // not executed
 *
 *     var q = mquery(collection).where({ _id: id });
 *     q.update({ $set: { name: 'bob' }}).exec(); // executed as unsafe
 *
 *     // keys that are not $atomic ops become $set.
 *     // this executes the same command as the previous example.
 *     q.update({ name: 'bob' }).where({ _id: id }).exec();
 *
 *     var q = mquery(collection).update(); // not executed
 *
 *     // overwriting with empty docs
 *     var q.where({ _id: id }).setOptions({ overwrite: true })
 *     q.update({ }, callback); // executes
 *
 *     // multi update with overwrite to empty doc
 *     var q = mquery(collection).where({ _id: id });
 *     q.setOptions({ multi: true, overwrite: true })
 *     q.update({ });
 *     q.update(callback); // executed
 *
 *     // multi updates
 *     mquery()
 *       .collection(coll)
 *       .update({ name: /^match/ }, { $set: { arr: [] }}, { multi: true }, callback)
 *     // more multi updates
 *     mquery({ })
 *       .collection(coll)
 *       .setOptions({ multi: true })
 *       .update({ $set: { arr: [] }}, callback)
 *
 *     // single update by default
 *     mquery({ email: 'address@example.com' })
 *      .collection(coll)
 *      .update({ $inc: { counter: 1 }}, callback)
 *
 *     // summary
 *     update(criteria, doc, opts, cb) // executes
 *     update(criteria, doc, opts)
 *     update(criteria, doc, cb) // executes
 *     update(criteria, doc)
 *     update(doc, cb) // executes
 *     update(doc)
 *     update(cb) // executes
 *     update(true) // executes (unsafe write)
 *     update()
 *
 * @param {Object} [criteria]
 * @param {Object} [doc] the update command
 * @param {Object} [options]
 * @param {Function} [callback]
 * @return {Query} this
 * @api public
 */

Query.prototype.update = function update (criteria, doc, options, callback) {
  this.op = 'update';
  var force;

  switch (arguments.length) {
    case 3:
      if ('function' == typeof options) {
        callback = options;
        options = undefined;
      }
      break;
    case 2:
      if ('function' == typeof doc) {
        callback = doc;
        doc = criteria;
        criteria = undefined;
      }
      break;
    case 1:
      switch (typeof criteria) {
        case 'function':
          callback = criteria;
          criteria = options = doc = undefined;
          break;
        case 'boolean':
          // execution with no callback (unsafe write)
          force = criteria;
          criteria = undefined;
          break;
        default:
          doc = criteria;
          criteria = options = undefined;
          break;
      }
  }

  if (Query.canMerge(criteria)) {
    this.merge(criteria);
  }

  if (doc) {
    this._mergeUpdate(doc);
  }

  if (utils.isObject(options)) {
    // { overwrite: true }
    this.setOptions(options);
  }

  // we are done if we don't have callback and they are
  // not forcing an unsafe write.
  if (!(force || callback))
    return this;

  if (!this._update ||
      !this.options.overwrite && 0 === utils.keys(this._update).length) {
    callback && utils.soon(callback.bind(null, null, 0));
    return this;
  }

  options = this._optionsForExec();
  if (!callback) options.safe = false;

  var criteria = this._conditions;
  doc = this._updateForExec();

  debug('update', this._collection.collectionName, criteria, doc, options);
  callback = this._wrapCallback('update', callback, {
    conditions: criteria
  , doc: doc
  , options: options
  });

  this._collection.update(criteria, doc, options, utils.tick(callback));

  return this;
}

/**
 * Declare and/or execute this query as a remove() operation.
 *
 * ####Example
 *
 *     mquery(collection).remove({ artist: 'Anne Murray' }, callback)
 *
 * ####Note
 *
 * The operation is only executed when a callback is passed. To force execution without a callback (which would be an unsafe write), we must first call remove() and then execute it by using the `exec()` method.
 *
 *     // not executed
 *     var query = mquery(collection).remove({ name: 'Anne Murray' })
 *
 *     // executed
 *     mquery(collection).remove({ name: 'Anne Murray' }, callback)
 *     mquery(collection).remove({ name: 'Anne Murray' }).remove(callback)
 *
 *     // executed without a callback (unsafe write)
 *     query.exec()
 *
 *     // summary
 *     query.remove(conds, fn); // executes
 *     query.remove(conds)
 *     query.remove(fn) // executes
 *     query.remove()
 *
 * @param {Object|Query} [criteria] mongodb selector
 * @param {Function} [callback]
 * @return {Query} this
 * @api public
 */

Query.prototype.remove = function (criteria, callback) {
  this.op = 'remove';
  var force;

  if ('function' === typeof criteria) {
    callback = criteria;
    criteria = undefined;
  } else if (Query.canMerge(criteria)) {
    this.merge(criteria);
  } else if (true === criteria) {
    force = criteria;
    criteria = undefined;
  }

  if (!(force || callback))
    return this;

  var options = this._optionsForExec()
  if (!callback) options.safe = false;

  var conds = this._conditions;

  debug('remove', this._collection.collectionName, conds, options);
  callback = this._wrapCallback('remove', callback, {
    conditions: conds
  , options: options
  });

  this._collection.remove(conds, options, utils.tick(callback));

  return this;
}

/**
 * Issues a mongodb [findAndModify](http://www.mongodb.org/display/DOCS/findAndModify+Command) update command.
 *
 * Finds a matching document, updates it according to the `update` arg, passing any `options`, and returns the found document (if any) to the callback. The query executes immediately if `callback` is passed.
 *
 * ####Available options
 *
 * - `new`: bool - true to return the modified document rather than the original. defaults to true
 * - `upsert`: bool - creates the object if it doesn't exist. defaults to false.
 * - `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
 *
 * ####Examples
 *
 *     query.findOneAndUpdate(conditions, update, options, callback) // executes
 *     query.findOneAndUpdate(conditions, update, options)  // returns Query
 *     query.findOneAndUpdate(conditions, update, callback) // executes
 *     query.findOneAndUpdate(conditions, update)           // returns Query
 *     query.findOneAndUpdate(update, callback)             // returns Query
 *     query.findOneAndUpdate(update)                       // returns Query
 *     query.findOneAndUpdate(callback)                     // executes
 *     query.findOneAndUpdate()                             // returns Query
 *
 * @param {Object|Query} [query]
 * @param {Object} [doc]
 * @param {Object} [options]
 * @param {Function} [callback]
 * @see mongodb http://www.mongodb.org/display/DOCS/findAndModify+Command
 * @return {Query} this
 * @api public
 */

Query.prototype.findOneAndUpdate = function (criteria, doc, options, callback) {
  this.op = 'findOneAndUpdate';
  this._validate();

  switch (arguments.length) {
    case 3:
      if ('function' == typeof options) {
        callback = options;
        options = {};
      }
      break;
    case 2:
      if ('function' == typeof doc) {
        callback = doc;
        doc = criteria;
        criteria = undefined;
      }
      options = undefined;
      break;
    case 1:
      if ('function' == typeof criteria) {
        callback = criteria;
        criteria = options = doc = undefined;
      } else {
        doc = criteria;
        criteria = options = undefined;
      }
  }

  if (Query.canMerge(criteria)) {
    this.merge(criteria);
  }

  // apply doc
  if (doc) {
    this._mergeUpdate(doc);
  }

  options && this.setOptions(options);

  if (!callback) return this;
  return this._findAndModify('update', callback);
}

/**
 * Issues a mongodb [findAndModify](http://www.mongodb.org/display/DOCS/findAndModify+Command) remove command.
 *
 * Finds a matching document, removes it, passing the found document (if any) to the callback. Executes immediately if `callback` is passed.
 *
 * ####Available options
 *
 * - `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
 *
 * ####Examples
 *
 *     A.where().findOneAndRemove(conditions, options, callback) // executes
 *     A.where().findOneAndRemove(conditions, options)  // return Query
 *     A.where().findOneAndRemove(conditions, callback) // executes
 *     A.where().findOneAndRemove(conditions) // returns Query
 *     A.where().findOneAndRemove(callback)   // executes
 *     A.where().findOneAndRemove()           // returns Query
 *
 * @param {Object} [conditions]
 * @param {Object} [options]
 * @param {Function} [callback]
 * @return {Query} this
 * @see mongodb http://www.mongodb.org/display/DOCS/findAndModify+Command
 * @api public
 */

Query.prototype.findOneAndRemove = function (conditions, options, callback) {
  this.op = 'findOneAndRemove';
  this._validate();

  if ('function' == typeof options) {
    callback = options;
    options = undefined;
  } else if ('function' == typeof conditions) {
    callback = conditions;
    conditions = undefined;
  }

  // apply conditions
  if (Query.canMerge(conditions)) {
    this.merge(conditions);
  }

  // apply options
  options && this.setOptions(options);

  if (!callback) return this;

  return this._findAndModify('remove', callback);
}

/**
 * _findAndModify
 *
 * @param {String} type - either "remove" or "update"
 * @param {Function} callback
 * @api private
 */

Query.prototype._findAndModify = function (type, callback) {
  assert.equal('function', typeof callback);

  var opts = this._optionsForExec()
    , self = this
    , fields
    , sort
    , doc

  if ('remove' == type) {
    opts.remove = true;
  } else {
    if (!('new' in opts)) opts.new = true;
    if (!('upsert' in opts)) opts.upsert = false;

    doc = this._updateForExec()
    if (!doc) {
      if (opts.upsert) {
        // still need to do the upsert to empty doc
        doc = { $set: {} };
      } else {
        return this.findOne(callback);
      }
    }
  }

  var fields = this._fieldsForExec();
  if (fields) {
    opts.fields = fields;
  }

  var conds = this._conditions;

  debug('findAndModify', this._collection.collectionName, conds, doc, opts);
  callback = this._wrapCallback('findAndModify', callback, {
    conditions: conds
  , doc: doc
  , options: opts
  });

  this._collection
  .findAndModify(conds, doc, opts, utils.tick(callback));

  return this;
}

/**
 * Wrap callback to add tracing
 *
 * @param {Function} callback
 * @param {Object} [queryInfo]
 * @api private
 */
Query.prototype._wrapCallback = function (method, callback, queryInfo) {
  var traceFunction = this._traceFunction || Query.traceFunction;

  if (traceFunction) {
    queryInfo.collectionName = this._collection.collectionName;

    var traceCallback = traceFunction &&
      traceFunction.call(null, method, queryInfo, this);

    var startTime = new Date().getTime();

    return function wrapperCallback (err, result) {
      if (traceCallback) {
        var millis = new Date().getTime() - startTime;
        traceCallback.call(null, err, result, millis);
      }

      if (callback) {
        callback.apply(null, arguments);
      }
    };
  }

  return callback;
}

/**
 * Add trace function that gets called when the query is executed.
 * The function will be called with (method, queryInfo, query) and
 * should return a callback function which will be called
 * with (err, result, millis) when the query is complete.
 *
 * queryInfo is an object containing: {
 *   collectionName: <name of the collection>,
 *   conditions: <query criteria>,
 *   options: <comment, fields, readPreference, etc>,
 *   doc: [document to update, if applicable]
 * }
 *
 * NOTE: Does not trace stream queries.
 *
 * @param {Function} traceFunction
 * @return {Query} this
 * @api public
 */
Query.prototype.setTraceFunction = function (traceFunction) {
  this._traceFunction = traceFunction;
  return this;
}

/**
 * Executes the query
 *
 * ####Examples
 *
 *     query.exec();
 *     query.exec(callback);
 *     query.exec('update');
 *     query.exec('find', callback);
 *
 * @param {String|Function} [operation]
 * @param {Function} [callback]
 * @api public
 */

Query.prototype.exec = function exec (op, callback) {
  switch (typeof op) {
    case 'function':
      callback = op;
      op = null;
      break;
    case 'string':
      this.op = op;
      break;
  }

  assert.ok(this.op, "Missing query type: (find, update, etc)");

  if ('update' == this.op || 'remove' == this.op) {
    callback || (callback = true);
  }

  var self = this;

  if ('function' == typeof callback) {
    this[this.op](callback);
  } else {
    return new Query.Promise(function(success, error) {
      self[self.op](function(err, val) {
        if (err) error(err);
        else success(val);
        self = success = error = null;
      });
    });
  }
}

/**
 * Returns a thunk which when called runs this.exec()
 *
 * The thunk receives a callback function which will be
 * passed to `this.exec()`
 *
 * @return {Function}
 * @api public
 */

Query.prototype.thunk = function() {
  var self = this;
  return function(cb) {
    self.exec(cb);
  }
}

/**
 * Executes the query returning a `Promise` which will be
 * resolved with either the doc(s) or rejected with the error.
 *
 * @param {Function} [resolve]
 * @param {Function} [reject]
 * @return {Promise}
 * @api public
 */

Query.prototype.then = function(resolve, reject) {
  var self = this;
  var promise = new Query.Promise(function(success, error) {
    self.exec(function(err, val) {
      if (err) error(err);
      else success(val);
      self = success = error = null;
    });
  });
  return promise.then(resolve, reject);
}

/**
 * Returns a stream for the given find query.
 *
 * @throws Error if operation is not a find
 * @returns {Stream} Node 0.8 style
 */

Query.prototype.stream = function(streamOptions) {
  if ('find' != this.op)
    throw new Error('stream() is only available for find');

  var conds = this._conditions;

  var options = this._optionsForExec()
  options.fields = this._fieldsForExec()

  debug('stream', this._collection.collectionName, conds, options, streamOptions);

  return this._collection.findStream(conds, options, streamOptions);
}

/**
 * Determines if field selection has been made.
 *
 * @return {Boolean}
 * @api public
 */

Query.prototype.selected = function selected () {
  return !! (this._fields && Object.keys(this._fields).length > 0);
}

/**
 * Determines if inclusive field selection has been made.
 *
 *     query.selectedInclusively() // false
 *     query.select('name')
 *     query.selectedInclusively() // true
 *     query.selectedExlusively() // false
 *
 * @returns {Boolean}
 */

Query.prototype.selectedInclusively = function selectedInclusively () {
  if (!this._fields) return false;

  var keys = Object.keys(this._fields);
  if (0 === keys.length) return false;

  for (var i = 0; i < keys.length; ++i) {
    var key = keys[i];
    if (0 === this._fields[key]) return false;
    if (this._fields[key] &&
        typeof this._fields[key] === 'object' &&
        this._fields[key].$meta) {
      return false;
    }
  }

  return true;
}

/**
 * Determines if exclusive field selection has been made.
 *
 *     query.selectedExlusively() // false
 *     query.select('-name')
 *     query.selectedExlusively() // true
 *     query.selectedInclusively() // false
 *
 * @returns {Boolean}
 */

Query.prototype.selectedExclusively = function selectedExclusively () {
  if (!this._fields) return false;

  var keys = Object.keys(this._fields);
  if (0 === keys.length) return false;

  for (var i = 0; i < keys.length; ++i) {
    var key = keys[i];
    if (0 === this._fields[key]) return true;
  }

  return false;
}

/**
 * Merges `doc` with the current update object.
 *
 * @param {Object} doc
 */

Query.prototype._mergeUpdate = function (doc) {
  if (!this._update) this._update = {};
  if (doc instanceof Query) {
    if (doc._update) {
      utils.mergeClone(this._update, doc._update);
    }
  } else {
    utils.mergeClone(this._update, doc);
  }
}

/**
 * Returns default options.
 *
 * @return {Object}
 * @api private
 */

Query.prototype._optionsForExec = function () {
  var options = utils.clone(this.options, { retainKeyOrder: true });
  return options;
}

/**
 * Returns fields selection for this query.
 *
 * @return {Object}
 * @api private
 */

Query.prototype._fieldsForExec = function () {
  return utils.clone(this._fields, { retainKeyOrder: true });
}

/**
 * Return an update document with corrected $set operations.
 *
 * @api private
 */

Query.prototype._updateForExec = function () {
  var update = utils.clone(this._update, { retainKeyOrder: true })
    , ops = utils.keys(update)
    , i = ops.length
    , ret = {}
    , hasKeys
    , val

  while (i--) {
    var op = ops[i];

    if (this.options.overwrite) {
      ret[op] = update[op];
      continue;
    }

    if ('$' !== op[0]) {
      // fix up $set sugar
      if (!ret.$set) {
        if (update.$set) {
          ret.$set = update.$set;
        } else {
          ret.$set = {};
        }
      }
      ret.$set[op] = update[op];
      ops.splice(i, 1);
      if (!~ops.indexOf('$set')) ops.push('$set');
    } else if ('$set' === op) {
      if (!ret.$set) {
        ret[op] = update[op];
      }
    } else {
      ret[op] = update[op];
    }
  }

  this._compiledUpdate = ret;
  return ret;
}

/**
 * Make sure _path is set.
 *
 * @parmam {String} method
 */

Query.prototype._ensurePath = function (method) {
  if (!this._path) {
    var msg = method + '() must be used after where() '
                     + 'when called with these arguments'
    throw new Error(msg);
  }
}

/*!
 * Permissions
 */

Query.permissions = require('./permissions');

Query._isPermitted = function (a, b) {
  var denied = Query.permissions[b];
  if (!denied) return true;
  return true !== denied[a];
}

Query.prototype._validate = function (action) {
  var fail;
  var validator;

  if (undefined === action) {

    validator = Query.permissions[this.op];
    if ('function' != typeof validator) return true;

    fail = validator(this);

  } else if (!Query._isPermitted(action, this.op)) {
    fail = action;
  }

  if (fail) {
    throw new Error(fail + ' cannot be used with ' + this.op);
  }
}

/**
 * Determines if `conds` can be merged using `mquery().merge()`
 *
 * @param {Object} conds
 * @return {Boolean}
 */

Query.canMerge = function (conds) {
  return conds instanceof Query || utils.isObject(conds);
}

/**
 * Set a trace function that will get called whenever a
 * query is executed.
 *
 * See `setTraceFunction()` for details.
 *
 * @param {Object} conds
 * @return {Boolean}
 */
Query.setGlobalTraceFunction = function (traceFunction) {
  Query.traceFunction = traceFunction;
}

/*!
 * Exports.
 */

Query.utils = utils;
Query.env = require('./env')
Query.Collection = require('./collection');
Query.BaseCollection = require('./collection/collection');
Query.Promise = require('bluebird');
module.exports = exports = Query;

// TODO
// test utils

},{"./collection":123,"./collection/collection":122,"./env":125,"./permissions":127,"./utils":128,"assert":53,"bluebird":129,"debug":85,"sliced":130,"util":138}],127:[function(require,module,exports){
'use strict';

var denied = exports;

denied.distinct = function (self) {
  if (self._fields && Object.keys(self._fields).length > 0) {
    return 'field selection and slice'
  }

  var keys = Object.keys(denied.distinct);
  var err;

  keys.every(function (option) {
    if (self.options[option]) {
      err = option;
      return false;
    }
    return true;
  });

  return err;
};
denied.distinct.select =
denied.distinct.slice =
denied.distinct.sort =
denied.distinct.limit =
denied.distinct.skip =
denied.distinct.batchSize =
denied.distinct.comment =
denied.distinct.maxScan =
denied.distinct.snapshot =
denied.distinct.hint =
denied.distinct.tailable = true;


// aggregation integration


denied.findOneAndUpdate =
denied.findOneAndRemove = function (self) {
  var keys = Object.keys(denied.findOneAndUpdate);
  var err;

  keys.every(function (option) {
    if (self.options[option]) {
      err = option;
      return false;
    }
    return true;
  });

  return err;
}
denied.findOneAndUpdate.limit =
denied.findOneAndUpdate.skip =
denied.findOneAndUpdate.batchSize =
denied.findOneAndUpdate.maxScan =
denied.findOneAndUpdate.snapshot =
denied.findOneAndUpdate.hint =
denied.findOneAndUpdate.tailable =
denied.findOneAndUpdate.comment = true;


denied.count = function (self) {
  if (self._fields && Object.keys(self._fields).length > 0) {
    return 'field selection and slice'
  }

  var keys = Object.keys(denied.count);
  var err;

  keys.every(function (option) {
    if (self.options[option]) {
      err = option;
      return false;
    }
    return true;
  });

  return err;
}

denied.count.slice =
denied.count.batchSize =
denied.count.comment =
denied.count.maxScan =
denied.count.snapshot =
denied.count.tailable = true;

},{}],128:[function(require,module,exports){
(function (process,Buffer){
'use strict';

/*!
 * Module dependencies.
 */

var RegExpClone = require('regexp-clone')

/**
 * Clones objects
 *
 * @param {Object} obj the object to clone
 * @param {Object} options
 * @return {Object} the cloned object
 * @api private
 */

var clone = exports.clone = function clone (obj, options) {
  if (obj === undefined || obj === null)
    return obj;

  if (Array.isArray(obj))
    return exports.cloneArray(obj, options);

  if (obj.constructor) {
    if (/ObjectI[dD]$/.test(obj.constructor.name)) {
      return 'function' == typeof obj.clone
        ? obj.clone()
        : new obj.constructor(obj.id);
    }

    if ('ReadPreference' === obj._type && obj.isValid && obj.toObject) {
      return 'function' == typeof obj.clone
        ? obj.clone()
        : new obj.constructor(obj.mode, clone(obj.tags, options));
    }

    if ('Binary' == obj._bsontype && obj.buffer && obj.value) {
      return 'function' == typeof obj.clone
        ? obj.clone()
        : new obj.constructor(obj.value(true), obj.sub_type);
    }

    if ('Date' === obj.constructor.name || 'Function' === obj.constructor.name)
      return new obj.constructor(+obj);

    if ('RegExp' === obj.constructor.name)
      return RegExpClone(obj);

    if ('Buffer' === obj.constructor.name)
      return exports.cloneBuffer(obj);
  }

  if (isObject(obj))
    return exports.cloneObject(obj, options);

  if (obj.valueOf)
    return obj.valueOf();
};

/*!
 * ignore
 */

var cloneObject = exports.cloneObject = function cloneObject (obj, options) {
  var retainKeyOrder = options && options.retainKeyOrder
    , minimize = options && options.minimize
    , ret = {}
    , hasKeys
    , keys
    , val
    , k
    , i

  if (retainKeyOrder) {
    for (k in obj) {
      val = clone(obj[k], options);

      if (!minimize || ('undefined' !== typeof val)) {
        hasKeys || (hasKeys = true);
        ret[k] = val;
      }
    }
  } else {
    // faster

    keys = Object.keys(obj);
    i = keys.length;

    while (i--) {
      k = keys[i];
      val = clone(obj[k], options);

      if (!minimize || ('undefined' !== typeof val)) {
        if (!hasKeys) hasKeys = true;
        ret[k] = val;
      }
    }
  }

  return minimize
    ? hasKeys && ret
    : ret;
};

var cloneArray = exports.cloneArray = function cloneArray (arr, options) {
  var ret = [];
  for (var i = 0, l = arr.length; i < l; i++)
    ret.push(clone(arr[i], options));
  return ret;
};

/**
 * process.nextTick helper.
 *
 * Wraps the given `callback` in a try/catch. If an error is
 * caught it will be thrown on nextTick.
 *
 * node-mongodb-native had a habit of state corruption when
 * an error was immediately thrown from within a collection
 * method (find, update, etc) callback.
 *
 * @param {Function} [callback]
 * @api private
 */

var tick = exports.tick = function tick (callback) {
  if ('function' !== typeof callback) return;
  return function () {
    // callbacks should always be fired on the next
    // turn of the event loop. A side benefit is
    // errors thrown from executing the callback
    // will not cause drivers state to be corrupted
    // which has historically been a problem.
    var args = arguments;
    soon(function(){
      callback.apply(this, args);
    });
  }
}

/**
 * Merges `from` into `to` without overwriting existing properties.
 *
 * @param {Object} to
 * @param {Object} from
 * @api private
 */

var merge = exports.merge = function merge (to, from) {
  var keys = Object.keys(from)
    , i = keys.length
    , key

  while (i--) {
    key = keys[i];
    if ('undefined' === typeof to[key]) {
      to[key] = from[key];
    } else {
      if (exports.isObject(from[key])) {
        merge(to[key], from[key]);
      } else {
        to[key] = from[key];
      }
    }
  }
}

/**
 * Same as merge but clones the assigned values.
 *
 * @param {Object} to
 * @param {Object} from
 * @api private
 */

var mergeClone = exports.mergeClone = function mergeClone (to, from) {
  var keys = Object.keys(from)
    , i = keys.length
    , key

  while (i--) {
    key = keys[i];
    if ('undefined' === typeof to[key]) {
      // make sure to retain key order here because of a bug handling the $each
      // operator in mongodb 2.4.4
      to[key] = clone(from[key], { retainKeyOrder : 1});
    } else {
      if (exports.isObject(from[key])) {
        mergeClone(to[key], from[key]);
      } else {
        // make sure to retain key order here because of a bug handling the
        // $each operator in mongodb 2.4.4
        to[key] = clone(from[key], { retainKeyOrder : 1});
      }
    }
  }
}

/**
 * Read pref helper (mongo 2.2 drivers support this)
 *
 * Allows using aliases instead of full preference names:
 *
 *     p   primary
 *     pp  primaryPreferred
 *     s   secondary
 *     sp  secondaryPreferred
 *     n   nearest
 *
 * @param {String} pref
 */

exports.readPref = function readPref (pref) {
  switch (pref) {
    case 'p':
      pref = 'primary';
      break;
    case 'pp':
      pref = 'primaryPreferred';
      break;
    case 's':
      pref = 'secondary';
      break;
    case 'sp':
      pref = 'secondaryPreferred';
      break;
    case 'n':
      pref = 'nearest';
      break;
  }

  return pref;
}

/**
 * Object.prototype.toString.call helper
 */

var _toString = Object.prototype.toString;
var toString = exports.toString = function (arg) {
  return _toString.call(arg);
}

/**
 * Determines if `arg` is an object.
 *
 * @param {Object|Array|String|Function|RegExp|any} arg
 * @return {Boolean}
 */

var isObject = exports.isObject = function (arg) {
  return '[object Object]' == exports.toString(arg);
}

/**
 * Determines if `arg` is an array.
 *
 * @param {Object}
 * @return {Boolean}
 * @see nodejs utils
 */

var isArray = exports.isArray = function (arg) {
  return Array.isArray(arg) ||
    'object' == typeof arg && '[object Array]' == exports.toString(arg);
}

/**
 * Object.keys helper
 */

exports.keys = Object.keys || function (obj) {
  var keys = [];
  for (var k in obj) if (obj.hasOwnProperty(k)) {
    keys.push(k);
  }
  return keys;
}

/**
 * Basic Object.create polyfill.
 * Only one argument is supported.
 *
 * Based on https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/create
 */

exports.create = 'function' == typeof Object.create
  ? Object.create
  : create;

function create (proto) {
  if (arguments.length > 1) {
    throw new Error("Adding properties is not supported")
  }

  function F () {}
  F.prototype = proto;
  return new F;
}

/**
 * inheritance
 */

exports.inherits = function (ctor, superCtor) {
  ctor.prototype = exports.create(superCtor.prototype);
  ctor.prototype.constructor = ctor;
}

/**
 * nextTick helper
 * compat with node 0.10 which behaves differently than previous versions
 */

var soon = exports.soon = 'function' == typeof setImmediate
  ? setImmediate
  : process.nextTick;

/**
 * Clones the contents of a buffer.
 *
 * @param {Buffer} buff
 * @return {Buffer}
 */

exports.cloneBuffer = function (buff) {
  var dupe = new Buffer(buff.length);
  buff.copy(dupe, 0, 0, buff.length);
  return dupe;
};

/**
 * Check if this object is an arguments object
 *
 * @param {Any} v
 * @return {Boolean}
 */

exports.isArgumentsObject = function(v) {
  return Object.prototype.toString.call(v) === '[object Arguments]';
};

}).call(this,require("g5I+bs"),require("buffer").Buffer)
},{"buffer":84,"g5I+bs":133,"regexp-clone":134}],129:[function(require,module,exports){
(function (process,global){
/* @preserve
 * The MIT License (MIT)
 * 
 * Copyright (c) 2013-2015 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
/**
 * bluebird build version 2.10.2
 * Features enabled: core, race, call_get, generators, map, nodeify, promisify, props, reduce, settle, some, cancel, using, filter, any, each, timers
*/
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Promise=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof _dereq_=="function"&&_dereq_;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof _dereq_=="function"&&_dereq_;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var SomePromiseArray = Promise._SomePromiseArray;
function any(promises) {
    var ret = new SomePromiseArray(promises);
    var promise = ret.promise();
    ret.setHowMany(1);
    ret.setUnwrap();
    ret.init();
    return promise;
}

Promise.any = function (promises) {
    return any(promises);
};

Promise.prototype.any = function () {
    return any(this);
};

};

},{}],2:[function(_dereq_,module,exports){
"use strict";
var firstLineError;
try {throw new Error(); } catch (e) {firstLineError = e;}
var schedule = _dereq_("./schedule.js");
var Queue = _dereq_("./queue.js");
var util = _dereq_("./util.js");

function Async() {
    this._isTickUsed = false;
    this._lateQueue = new Queue(16);
    this._normalQueue = new Queue(16);
    this._trampolineEnabled = true;
    var self = this;
    this.drainQueues = function () {
        self._drainQueues();
    };
    this._schedule =
        schedule.isStatic ? schedule(this.drainQueues) : schedule;
}

Async.prototype.disableTrampolineIfNecessary = function() {
    if (util.hasDevTools) {
        this._trampolineEnabled = false;
    }
};

Async.prototype.enableTrampoline = function() {
    if (!this._trampolineEnabled) {
        this._trampolineEnabled = true;
        this._schedule = function(fn) {
            setTimeout(fn, 0);
        };
    }
};

Async.prototype.haveItemsQueued = function () {
    return this._normalQueue.length() > 0;
};

Async.prototype.throwLater = function(fn, arg) {
    if (arguments.length === 1) {
        arg = fn;
        fn = function () { throw arg; };
    }
    if (typeof setTimeout !== "undefined") {
        setTimeout(function() {
            fn(arg);
        }, 0);
    } else try {
        this._schedule(function() {
            fn(arg);
        });
    } catch (e) {
        throw new Error("No async scheduler available\u000a\u000a    See http://goo.gl/m3OTXk\u000a");
    }
};

function AsyncInvokeLater(fn, receiver, arg) {
    this._lateQueue.push(fn, receiver, arg);
    this._queueTick();
}

function AsyncInvoke(fn, receiver, arg) {
    this._normalQueue.push(fn, receiver, arg);
    this._queueTick();
}

function AsyncSettlePromises(promise) {
    this._normalQueue._pushOne(promise);
    this._queueTick();
}

if (!util.hasDevTools) {
    Async.prototype.invokeLater = AsyncInvokeLater;
    Async.prototype.invoke = AsyncInvoke;
    Async.prototype.settlePromises = AsyncSettlePromises;
} else {
    if (schedule.isStatic) {
        schedule = function(fn) { setTimeout(fn, 0); };
    }
    Async.prototype.invokeLater = function (fn, receiver, arg) {
        if (this._trampolineEnabled) {
            AsyncInvokeLater.call(this, fn, receiver, arg);
        } else {
            this._schedule(function() {
                setTimeout(function() {
                    fn.call(receiver, arg);
                }, 100);
            });
        }
    };

    Async.prototype.invoke = function (fn, receiver, arg) {
        if (this._trampolineEnabled) {
            AsyncInvoke.call(this, fn, receiver, arg);
        } else {
            this._schedule(function() {
                fn.call(receiver, arg);
            });
        }
    };

    Async.prototype.settlePromises = function(promise) {
        if (this._trampolineEnabled) {
            AsyncSettlePromises.call(this, promise);
        } else {
            this._schedule(function() {
                promise._settlePromises();
            });
        }
    };
}

Async.prototype.invokeFirst = function (fn, receiver, arg) {
    this._normalQueue.unshift(fn, receiver, arg);
    this._queueTick();
};

Async.prototype._drainQueue = function(queue) {
    while (queue.length() > 0) {
        var fn = queue.shift();
        if (typeof fn !== "function") {
            fn._settlePromises();
            continue;
        }
        var receiver = queue.shift();
        var arg = queue.shift();
        fn.call(receiver, arg);
    }
};

Async.prototype._drainQueues = function () {
    this._drainQueue(this._normalQueue);
    this._reset();
    this._drainQueue(this._lateQueue);
};

Async.prototype._queueTick = function () {
    if (!this._isTickUsed) {
        this._isTickUsed = true;
        this._schedule(this.drainQueues);
    }
};

Async.prototype._reset = function () {
    this._isTickUsed = false;
};

module.exports = new Async();
module.exports.firstLineError = firstLineError;

},{"./queue.js":28,"./schedule.js":31,"./util.js":38}],3:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, tryConvertToPromise) {
var rejectThis = function(_, e) {
    this._reject(e);
};

var targetRejected = function(e, context) {
    context.promiseRejectionQueued = true;
    context.bindingPromise._then(rejectThis, rejectThis, null, this, e);
};

var bindingResolved = function(thisArg, context) {
    if (this._isPending()) {
        this._resolveCallback(context.target);
    }
};

var bindingRejected = function(e, context) {
    if (!context.promiseRejectionQueued) this._reject(e);
};

Promise.prototype.bind = function (thisArg) {
    var maybePromise = tryConvertToPromise(thisArg);
    var ret = new Promise(INTERNAL);
    ret._propagateFrom(this, 1);
    var target = this._target();

    ret._setBoundTo(maybePromise);
    if (maybePromise instanceof Promise) {
        var context = {
            promiseRejectionQueued: false,
            promise: ret,
            target: target,
            bindingPromise: maybePromise
        };
        target._then(INTERNAL, targetRejected, ret._progress, ret, context);
        maybePromise._then(
            bindingResolved, bindingRejected, ret._progress, ret, context);
    } else {
        ret._resolveCallback(target);
    }
    return ret;
};

Promise.prototype._setBoundTo = function (obj) {
    if (obj !== undefined) {
        this._bitField = this._bitField | 131072;
        this._boundTo = obj;
    } else {
        this._bitField = this._bitField & (~131072);
    }
};

Promise.prototype._isBound = function () {
    return (this._bitField & 131072) === 131072;
};

Promise.bind = function (thisArg, value) {
    var maybePromise = tryConvertToPromise(thisArg);
    var ret = new Promise(INTERNAL);

    ret._setBoundTo(maybePromise);
    if (maybePromise instanceof Promise) {
        maybePromise._then(function() {
            ret._resolveCallback(value);
        }, ret._reject, ret._progress, ret, null);
    } else {
        ret._resolveCallback(value);
    }
    return ret;
};
};

},{}],4:[function(_dereq_,module,exports){
"use strict";
var old;
if (typeof Promise !== "undefined") old = Promise;
function noConflict() {
    try { if (Promise === bluebird) Promise = old; }
    catch (e) {}
    return bluebird;
}
var bluebird = _dereq_("./promise.js")();
bluebird.noConflict = noConflict;
module.exports = bluebird;

},{"./promise.js":23}],5:[function(_dereq_,module,exports){
"use strict";
var cr = Object.create;
if (cr) {
    var callerCache = cr(null);
    var getterCache = cr(null);
    callerCache[" size"] = getterCache[" size"] = 0;
}

module.exports = function(Promise) {
var util = _dereq_("./util.js");
var canEvaluate = util.canEvaluate;
var isIdentifier = util.isIdentifier;

var getMethodCaller;
var getGetter;
if (!true) {
var makeMethodCaller = function (methodName) {
    return new Function("ensureMethod", "                                    \n\
        return function(obj) {                                               \n\
            'use strict'                                                     \n\
            var len = this.length;                                           \n\
            ensureMethod(obj, 'methodName');                                 \n\
            switch(len) {                                                    \n\
                case 1: return obj.methodName(this[0]);                      \n\
                case 2: return obj.methodName(this[0], this[1]);             \n\
                case 3: return obj.methodName(this[0], this[1], this[2]);    \n\
                case 0: return obj.methodName();                             \n\
                default:                                                     \n\
                    return obj.methodName.apply(obj, this);                  \n\
            }                                                                \n\
        };                                                                   \n\
        ".replace(/methodName/g, methodName))(ensureMethod);
};

var makeGetter = function (propertyName) {
    return new Function("obj", "                                             \n\
        'use strict';                                                        \n\
        return obj.propertyName;                                             \n\
        ".replace("propertyName", propertyName));
};

var getCompiled = function(name, compiler, cache) {
    var ret = cache[name];
    if (typeof ret !== "function") {
        if (!isIdentifier(name)) {
            return null;
        }
        ret = compiler(name);
        cache[name] = ret;
        cache[" size"]++;
        if (cache[" size"] > 512) {
            var keys = Object.keys(cache);
            for (var i = 0; i < 256; ++i) delete cache[keys[i]];
            cache[" size"] = keys.length - 256;
        }
    }
    return ret;
};

getMethodCaller = function(name) {
    return getCompiled(name, makeMethodCaller, callerCache);
};

getGetter = function(name) {
    return getCompiled(name, makeGetter, getterCache);
};
}

function ensureMethod(obj, methodName) {
    var fn;
    if (obj != null) fn = obj[methodName];
    if (typeof fn !== "function") {
        var message = "Object " + util.classString(obj) + " has no method '" +
            util.toString(methodName) + "'";
        throw new Promise.TypeError(message);
    }
    return fn;
}

function caller(obj) {
    var methodName = this.pop();
    var fn = ensureMethod(obj, methodName);
    return fn.apply(obj, this);
}
Promise.prototype.call = function (methodName) {
    var $_len = arguments.length;var args = new Array($_len - 1); for(var $_i = 1; $_i < $_len; ++$_i) {args[$_i - 1] = arguments[$_i];}
    if (!true) {
        if (canEvaluate) {
            var maybeCaller = getMethodCaller(methodName);
            if (maybeCaller !== null) {
                return this._then(
                    maybeCaller, undefined, undefined, args, undefined);
            }
        }
    }
    args.push(methodName);
    return this._then(caller, undefined, undefined, args, undefined);
};

function namedGetter(obj) {
    return obj[this];
}
function indexedGetter(obj) {
    var index = +this;
    if (index < 0) index = Math.max(0, index + obj.length);
    return obj[index];
}
Promise.prototype.get = function (propertyName) {
    var isIndex = (typeof propertyName === "number");
    var getter;
    if (!isIndex) {
        if (canEvaluate) {
            var maybeGetter = getGetter(propertyName);
            getter = maybeGetter !== null ? maybeGetter : namedGetter;
        } else {
            getter = namedGetter;
        }
    } else {
        getter = indexedGetter;
    }
    return this._then(getter, undefined, undefined, propertyName, undefined);
};
};

},{"./util.js":38}],6:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var errors = _dereq_("./errors.js");
var async = _dereq_("./async.js");
var CancellationError = errors.CancellationError;

Promise.prototype._cancel = function (reason) {
    if (!this.isCancellable()) return this;
    var parent;
    var promiseToReject = this;
    while ((parent = promiseToReject._cancellationParent) !== undefined &&
        parent.isCancellable()) {
        promiseToReject = parent;
    }
    this._unsetCancellable();
    promiseToReject._target()._rejectCallback(reason, false, true);
};

Promise.prototype.cancel = function (reason) {
    if (!this.isCancellable()) return this;
    if (reason === undefined) reason = new CancellationError();
    async.invokeLater(this._cancel, this, reason);
    return this;
};

Promise.prototype.cancellable = function () {
    if (this._cancellable()) return this;
    async.enableTrampoline();
    this._setCancellable();
    this._cancellationParent = undefined;
    return this;
};

Promise.prototype.uncancellable = function () {
    var ret = this.then();
    ret._unsetCancellable();
    return ret;
};

Promise.prototype.fork = function (didFulfill, didReject, didProgress) {
    var ret = this._then(didFulfill, didReject, didProgress,
                         undefined, undefined);

    ret._setCancellable();
    ret._cancellationParent = undefined;
    return ret;
};
};

},{"./async.js":2,"./errors.js":13}],7:[function(_dereq_,module,exports){
"use strict";
module.exports = function() {
var async = _dereq_("./async.js");
var util = _dereq_("./util.js");
var bluebirdFramePattern =
    /[\\\/]bluebird[\\\/]js[\\\/](main|debug|zalgo|instrumented)/;
var stackFramePattern = null;
var formatStack = null;
var indentStackFrames = false;
var warn;

function CapturedTrace(parent) {
    this._parent = parent;
    var length = this._length = 1 + (parent === undefined ? 0 : parent._length);
    captureStackTrace(this, CapturedTrace);
    if (length > 32) this.uncycle();
}
util.inherits(CapturedTrace, Error);

CapturedTrace.prototype.uncycle = function() {
    var length = this._length;
    if (length < 2) return;
    var nodes = [];
    var stackToIndex = {};

    for (var i = 0, node = this; node !== undefined; ++i) {
        nodes.push(node);
        node = node._parent;
    }
    length = this._length = i;
    for (var i = length - 1; i >= 0; --i) {
        var stack = nodes[i].stack;
        if (stackToIndex[stack] === undefined) {
            stackToIndex[stack] = i;
        }
    }
    for (var i = 0; i < length; ++i) {
        var currentStack = nodes[i].stack;
        var index = stackToIndex[currentStack];
        if (index !== undefined && index !== i) {
            if (index > 0) {
                nodes[index - 1]._parent = undefined;
                nodes[index - 1]._length = 1;
            }
            nodes[i]._parent = undefined;
            nodes[i]._length = 1;
            var cycleEdgeNode = i > 0 ? nodes[i - 1] : this;

            if (index < length - 1) {
                cycleEdgeNode._parent = nodes[index + 1];
                cycleEdgeNode._parent.uncycle();
                cycleEdgeNode._length =
                    cycleEdgeNode._parent._length + 1;
            } else {
                cycleEdgeNode._parent = undefined;
                cycleEdgeNode._length = 1;
            }
            var currentChildLength = cycleEdgeNode._length + 1;
            for (var j = i - 2; j >= 0; --j) {
                nodes[j]._length = currentChildLength;
                currentChildLength++;
            }
            return;
        }
    }
};

CapturedTrace.prototype.parent = function() {
    return this._parent;
};

CapturedTrace.prototype.hasParent = function() {
    return this._parent !== undefined;
};

CapturedTrace.prototype.attachExtraTrace = function(error) {
    if (error.__stackCleaned__) return;
    this.uncycle();
    var parsed = CapturedTrace.parseStackAndMessage(error);
    var message = parsed.message;
    var stacks = [parsed.stack];

    var trace = this;
    while (trace !== undefined) {
        stacks.push(cleanStack(trace.stack.split("\n")));
        trace = trace._parent;
    }
    removeCommonRoots(stacks);
    removeDuplicateOrEmptyJumps(stacks);
    util.notEnumerableProp(error, "stack", reconstructStack(message, stacks));
    util.notEnumerableProp(error, "__stackCleaned__", true);
};

function reconstructStack(message, stacks) {
    for (var i = 0; i < stacks.length - 1; ++i) {
        stacks[i].push("From previous event:");
        stacks[i] = stacks[i].join("\n");
    }
    if (i < stacks.length) {
        stacks[i] = stacks[i].join("\n");
    }
    return message + "\n" + stacks.join("\n");
}

function removeDuplicateOrEmptyJumps(stacks) {
    for (var i = 0; i < stacks.length; ++i) {
        if (stacks[i].length === 0 ||
            ((i + 1 < stacks.length) && stacks[i][0] === stacks[i+1][0])) {
            stacks.splice(i, 1);
            i--;
        }
    }
}

function removeCommonRoots(stacks) {
    var current = stacks[0];
    for (var i = 1; i < stacks.length; ++i) {
        var prev = stacks[i];
        var currentLastIndex = current.length - 1;
        var currentLastLine = current[currentLastIndex];
        var commonRootMeetPoint = -1;

        for (var j = prev.length - 1; j >= 0; --j) {
            if (prev[j] === currentLastLine) {
                commonRootMeetPoint = j;
                break;
            }
        }

        for (var j = commonRootMeetPoint; j >= 0; --j) {
            var line = prev[j];
            if (current[currentLastIndex] === line) {
                current.pop();
                currentLastIndex--;
            } else {
                break;
            }
        }
        current = prev;
    }
}

function cleanStack(stack) {
    var ret = [];
    for (var i = 0; i < stack.length; ++i) {
        var line = stack[i];
        var isTraceLine = stackFramePattern.test(line) ||
            "    (No stack trace)" === line;
        var isInternalFrame = isTraceLine && shouldIgnore(line);
        if (isTraceLine && !isInternalFrame) {
            if (indentStackFrames && line.charAt(0) !== " ") {
                line = "    " + line;
            }
            ret.push(line);
        }
    }
    return ret;
}

function stackFramesAsArray(error) {
    var stack = error.stack.replace(/\s+$/g, "").split("\n");
    for (var i = 0; i < stack.length; ++i) {
        var line = stack[i];
        if ("    (No stack trace)" === line || stackFramePattern.test(line)) {
            break;
        }
    }
    if (i > 0) {
        stack = stack.slice(i);
    }
    return stack;
}

CapturedTrace.parseStackAndMessage = function(error) {
    var stack = error.stack;
    var message = error.toString();
    stack = typeof stack === "string" && stack.length > 0
                ? stackFramesAsArray(error) : ["    (No stack trace)"];
    return {
        message: message,
        stack: cleanStack(stack)
    };
};

CapturedTrace.formatAndLogError = function(error, title) {
    if (typeof console !== "undefined") {
        var message;
        if (typeof error === "object" || typeof error === "function") {
            var stack = error.stack;
            message = title + formatStack(stack, error);
        } else {
            message = title + String(error);
        }
        if (typeof warn === "function") {
            warn(message);
        } else if (typeof console.log === "function" ||
            typeof console.log === "object") {
            console.log(message);
        }
    }
};

CapturedTrace.unhandledRejection = function (reason) {
    CapturedTrace.formatAndLogError(reason, "^--- With additional stack trace: ");
};

CapturedTrace.isSupported = function () {
    return typeof captureStackTrace === "function";
};

CapturedTrace.fireRejectionEvent =
function(name, localHandler, reason, promise) {
    var localEventFired = false;
    try {
        if (typeof localHandler === "function") {
            localEventFired = true;
            if (name === "rejectionHandled") {
                localHandler(promise);
            } else {
                localHandler(reason, promise);
            }
        }
    } catch (e) {
        async.throwLater(e);
    }

    var globalEventFired = false;
    try {
        globalEventFired = fireGlobalEvent(name, reason, promise);
    } catch (e) {
        globalEventFired = true;
        async.throwLater(e);
    }

    var domEventFired = false;
    if (fireDomEvent) {
        try {
            domEventFired = fireDomEvent(name.toLowerCase(), {
                reason: reason,
                promise: promise
            });
        } catch (e) {
            domEventFired = true;
            async.throwLater(e);
        }
    }

    if (!globalEventFired && !localEventFired && !domEventFired &&
        name === "unhandledRejection") {
        CapturedTrace.formatAndLogError(reason, "Unhandled rejection ");
    }
};

function formatNonError(obj) {
    var str;
    if (typeof obj === "function") {
        str = "[function " +
            (obj.name || "anonymous") +
            "]";
    } else {
        str = obj.toString();
        var ruselessToString = /\[object [a-zA-Z0-9$_]+\]/;
        if (ruselessToString.test(str)) {
            try {
                var newStr = JSON.stringify(obj);
                str = newStr;
            }
            catch(e) {

            }
        }
        if (str.length === 0) {
            str = "(empty array)";
        }
    }
    return ("(<" + snip(str) + ">, no stack trace)");
}

function snip(str) {
    var maxChars = 41;
    if (str.length < maxChars) {
        return str;
    }
    return str.substr(0, maxChars - 3) + "...";
}

var shouldIgnore = function() { return false; };
var parseLineInfoRegex = /[\/<\(]([^:\/]+):(\d+):(?:\d+)\)?\s*$/;
function parseLineInfo(line) {
    var matches = line.match(parseLineInfoRegex);
    if (matches) {
        return {
            fileName: matches[1],
            line: parseInt(matches[2], 10)
        };
    }
}
CapturedTrace.setBounds = function(firstLineError, lastLineError) {
    if (!CapturedTrace.isSupported()) return;
    var firstStackLines = firstLineError.stack.split("\n");
    var lastStackLines = lastLineError.stack.split("\n");
    var firstIndex = -1;
    var lastIndex = -1;
    var firstFileName;
    var lastFileName;
    for (var i = 0; i < firstStackLines.length; ++i) {
        var result = parseLineInfo(firstStackLines[i]);
        if (result) {
            firstFileName = result.fileName;
            firstIndex = result.line;
            break;
        }
    }
    for (var i = 0; i < lastStackLines.length; ++i) {
        var result = parseLineInfo(lastStackLines[i]);
        if (result) {
            lastFileName = result.fileName;
            lastIndex = result.line;
            break;
        }
    }
    if (firstIndex < 0 || lastIndex < 0 || !firstFileName || !lastFileName ||
        firstFileName !== lastFileName || firstIndex >= lastIndex) {
        return;
    }

    shouldIgnore = function(line) {
        if (bluebirdFramePattern.test(line)) return true;
        var info = parseLineInfo(line);
        if (info) {
            if (info.fileName === firstFileName &&
                (firstIndex <= info.line && info.line <= lastIndex)) {
                return true;
            }
        }
        return false;
    };
};

var captureStackTrace = (function stackDetection() {
    var v8stackFramePattern = /^\s*at\s*/;
    var v8stackFormatter = function(stack, error) {
        if (typeof stack === "string") return stack;

        if (error.name !== undefined &&
            error.message !== undefined) {
            return error.toString();
        }
        return formatNonError(error);
    };

    if (typeof Error.stackTraceLimit === "number" &&
        typeof Error.captureStackTrace === "function") {
        Error.stackTraceLimit = Error.stackTraceLimit + 6;
        stackFramePattern = v8stackFramePattern;
        formatStack = v8stackFormatter;
        var captureStackTrace = Error.captureStackTrace;

        shouldIgnore = function(line) {
            return bluebirdFramePattern.test(line);
        };
        return function(receiver, ignoreUntil) {
            Error.stackTraceLimit = Error.stackTraceLimit + 6;
            captureStackTrace(receiver, ignoreUntil);
            Error.stackTraceLimit = Error.stackTraceLimit - 6;
        };
    }
    var err = new Error();

    if (typeof err.stack === "string" &&
        err.stack.split("\n")[0].indexOf("stackDetection@") >= 0) {
        stackFramePattern = /@/;
        formatStack = v8stackFormatter;
        indentStackFrames = true;
        return function captureStackTrace(o) {
            o.stack = new Error().stack;
        };
    }

    var hasStackAfterThrow;
    try { throw new Error(); }
    catch(e) {
        hasStackAfterThrow = ("stack" in e);
    }
    if (!("stack" in err) && hasStackAfterThrow &&
        typeof Error.stackTraceLimit === "number") {
        stackFramePattern = v8stackFramePattern;
        formatStack = v8stackFormatter;
        return function captureStackTrace(o) {
            Error.stackTraceLimit = Error.stackTraceLimit + 6;
            try { throw new Error(); }
            catch(e) { o.stack = e.stack; }
            Error.stackTraceLimit = Error.stackTraceLimit - 6;
        };
    }

    formatStack = function(stack, error) {
        if (typeof stack === "string") return stack;

        if ((typeof error === "object" ||
            typeof error === "function") &&
            error.name !== undefined &&
            error.message !== undefined) {
            return error.toString();
        }
        return formatNonError(error);
    };

    return null;

})([]);

var fireDomEvent;
var fireGlobalEvent = (function() {
    if (util.isNode) {
        return function(name, reason, promise) {
            if (name === "rejectionHandled") {
                return process.emit(name, promise);
            } else {
                return process.emit(name, reason, promise);
            }
        };
    } else {
        var customEventWorks = false;
        var anyEventWorks = true;
        try {
            var ev = new self.CustomEvent("test");
            customEventWorks = ev instanceof CustomEvent;
        } catch (e) {}
        if (!customEventWorks) {
            try {
                var event = document.createEvent("CustomEvent");
                event.initCustomEvent("testingtheevent", false, true, {});
                self.dispatchEvent(event);
            } catch (e) {
                anyEventWorks = false;
            }
        }
        if (anyEventWorks) {
            fireDomEvent = function(type, detail) {
                var event;
                if (customEventWorks) {
                    event = new self.CustomEvent(type, {
                        detail: detail,
                        bubbles: false,
                        cancelable: true
                    });
                } else if (self.dispatchEvent) {
                    event = document.createEvent("CustomEvent");
                    event.initCustomEvent(type, false, true, detail);
                }

                return event ? !self.dispatchEvent(event) : false;
            };
        }

        var toWindowMethodNameMap = {};
        toWindowMethodNameMap["unhandledRejection"] = ("on" +
            "unhandledRejection").toLowerCase();
        toWindowMethodNameMap["rejectionHandled"] = ("on" +
            "rejectionHandled").toLowerCase();

        return function(name, reason, promise) {
            var methodName = toWindowMethodNameMap[name];
            var method = self[methodName];
            if (!method) return false;
            if (name === "rejectionHandled") {
                method.call(self, promise);
            } else {
                method.call(self, reason, promise);
            }
            return true;
        };
    }
})();

if (typeof console !== "undefined" && typeof console.warn !== "undefined") {
    warn = function (message) {
        console.warn(message);
    };
    if (util.isNode && process.stderr.isTTY) {
        warn = function(message) {
            process.stderr.write("\u001b[31m" + message + "\u001b[39m\n");
        };
    } else if (!util.isNode && typeof (new Error().stack) === "string") {
        warn = function(message) {
            console.warn("%c" + message, "color: red");
        };
    }
}

return CapturedTrace;
};

},{"./async.js":2,"./util.js":38}],8:[function(_dereq_,module,exports){
"use strict";
module.exports = function(NEXT_FILTER) {
var util = _dereq_("./util.js");
var errors = _dereq_("./errors.js");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var keys = _dereq_("./es5.js").keys;
var TypeError = errors.TypeError;

function CatchFilter(instances, callback, promise) {
    this._instances = instances;
    this._callback = callback;
    this._promise = promise;
}

function safePredicate(predicate, e) {
    var safeObject = {};
    var retfilter = tryCatch(predicate).call(safeObject, e);

    if (retfilter === errorObj) return retfilter;

    var safeKeys = keys(safeObject);
    if (safeKeys.length) {
        errorObj.e = new TypeError("Catch filter must inherit from Error or be a simple predicate function\u000a\u000a    See http://goo.gl/o84o68\u000a");
        return errorObj;
    }
    return retfilter;
}

CatchFilter.prototype.doFilter = function (e) {
    var cb = this._callback;
    var promise = this._promise;
    var boundTo = promise._boundValue();
    for (var i = 0, len = this._instances.length; i < len; ++i) {
        var item = this._instances[i];
        var itemIsErrorType = item === Error ||
            (item != null && item.prototype instanceof Error);

        if (itemIsErrorType && e instanceof item) {
            var ret = tryCatch(cb).call(boundTo, e);
            if (ret === errorObj) {
                NEXT_FILTER.e = ret.e;
                return NEXT_FILTER;
            }
            return ret;
        } else if (typeof item === "function" && !itemIsErrorType) {
            var shouldHandle = safePredicate(item, e);
            if (shouldHandle === errorObj) {
                e = errorObj.e;
                break;
            } else if (shouldHandle) {
                var ret = tryCatch(cb).call(boundTo, e);
                if (ret === errorObj) {
                    NEXT_FILTER.e = ret.e;
                    return NEXT_FILTER;
                }
                return ret;
            }
        }
    }
    NEXT_FILTER.e = e;
    return NEXT_FILTER;
};

return CatchFilter;
};

},{"./errors.js":13,"./es5.js":14,"./util.js":38}],9:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, CapturedTrace, isDebugging) {
var contextStack = [];
function Context() {
    this._trace = new CapturedTrace(peekContext());
}
Context.prototype._pushContext = function () {
    if (!isDebugging()) return;
    if (this._trace !== undefined) {
        contextStack.push(this._trace);
    }
};

Context.prototype._popContext = function () {
    if (!isDebugging()) return;
    if (this._trace !== undefined) {
        contextStack.pop();
    }
};

function createContext() {
    if (isDebugging()) return new Context();
}

function peekContext() {
    var lastIndex = contextStack.length - 1;
    if (lastIndex >= 0) {
        return contextStack[lastIndex];
    }
    return undefined;
}

Promise.prototype._peekContext = peekContext;
Promise.prototype._pushContext = Context.prototype._pushContext;
Promise.prototype._popContext = Context.prototype._popContext;

return createContext;
};

},{}],10:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, CapturedTrace) {
var getDomain = Promise._getDomain;
var async = _dereq_("./async.js");
var Warning = _dereq_("./errors.js").Warning;
var util = _dereq_("./util.js");
var canAttachTrace = util.canAttachTrace;
var unhandledRejectionHandled;
var possiblyUnhandledRejection;
var debugging = false || (util.isNode &&
                    (!!process.env["BLUEBIRD_DEBUG"] ||
                     process.env["NODE_ENV"] === "development"));

if (util.isNode && process.env["BLUEBIRD_DEBUG"] == 0) debugging = false;

if (debugging) {
    async.disableTrampolineIfNecessary();
}

Promise.prototype._ignoreRejections = function() {
    this._unsetRejectionIsUnhandled();
    this._bitField = this._bitField | 16777216;
};

Promise.prototype._ensurePossibleRejectionHandled = function () {
    if ((this._bitField & 16777216) !== 0) return;
    this._setRejectionIsUnhandled();
    async.invokeLater(this._notifyUnhandledRejection, this, undefined);
};

Promise.prototype._notifyUnhandledRejectionIsHandled = function () {
    CapturedTrace.fireRejectionEvent("rejectionHandled",
                                  unhandledRejectionHandled, undefined, this);
};

Promise.prototype._notifyUnhandledRejection = function () {
    if (this._isRejectionUnhandled()) {
        var reason = this._getCarriedStackTrace() || this._settledValue;
        this._setUnhandledRejectionIsNotified();
        CapturedTrace.fireRejectionEvent("unhandledRejection",
                                      possiblyUnhandledRejection, reason, this);
    }
};

Promise.prototype._setUnhandledRejectionIsNotified = function () {
    this._bitField = this._bitField | 524288;
};

Promise.prototype._unsetUnhandledRejectionIsNotified = function () {
    this._bitField = this._bitField & (~524288);
};

Promise.prototype._isUnhandledRejectionNotified = function () {
    return (this._bitField & 524288) > 0;
};

Promise.prototype._setRejectionIsUnhandled = function () {
    this._bitField = this._bitField | 2097152;
};

Promise.prototype._unsetRejectionIsUnhandled = function () {
    this._bitField = this._bitField & (~2097152);
    if (this._isUnhandledRejectionNotified()) {
        this._unsetUnhandledRejectionIsNotified();
        this._notifyUnhandledRejectionIsHandled();
    }
};

Promise.prototype._isRejectionUnhandled = function () {
    return (this._bitField & 2097152) > 0;
};

Promise.prototype._setCarriedStackTrace = function (capturedTrace) {
    this._bitField = this._bitField | 1048576;
    this._fulfillmentHandler0 = capturedTrace;
};

Promise.prototype._isCarryingStackTrace = function () {
    return (this._bitField & 1048576) > 0;
};

Promise.prototype._getCarriedStackTrace = function () {
    return this._isCarryingStackTrace()
        ? this._fulfillmentHandler0
        : undefined;
};

Promise.prototype._captureStackTrace = function () {
    if (debugging) {
        this._trace = new CapturedTrace(this._peekContext());
    }
    return this;
};

Promise.prototype._attachExtraTrace = function (error, ignoreSelf) {
    if (debugging && canAttachTrace(error)) {
        var trace = this._trace;
        if (trace !== undefined) {
            if (ignoreSelf) trace = trace._parent;
        }
        if (trace !== undefined) {
            trace.attachExtraTrace(error);
        } else if (!error.__stackCleaned__) {
            var parsed = CapturedTrace.parseStackAndMessage(error);
            util.notEnumerableProp(error, "stack",
                parsed.message + "\n" + parsed.stack.join("\n"));
            util.notEnumerableProp(error, "__stackCleaned__", true);
        }
    }
};

Promise.prototype._warn = function(message) {
    var warning = new Warning(message);
    var ctx = this._peekContext();
    if (ctx) {
        ctx.attachExtraTrace(warning);
    } else {
        var parsed = CapturedTrace.parseStackAndMessage(warning);
        warning.stack = parsed.message + "\n" + parsed.stack.join("\n");
    }
    CapturedTrace.formatAndLogError(warning, "");
};

Promise.onPossiblyUnhandledRejection = function (fn) {
    var domain = getDomain();
    possiblyUnhandledRejection =
        typeof fn === "function" ? (domain === null ? fn : domain.bind(fn))
                                 : undefined;
};

Promise.onUnhandledRejectionHandled = function (fn) {
    var domain = getDomain();
    unhandledRejectionHandled =
        typeof fn === "function" ? (domain === null ? fn : domain.bind(fn))
                                 : undefined;
};

Promise.longStackTraces = function () {
    if (async.haveItemsQueued() &&
        debugging === false
   ) {
        throw new Error("cannot enable long stack traces after promises have been created\u000a\u000a    See http://goo.gl/DT1qyG\u000a");
    }
    debugging = CapturedTrace.isSupported();
    if (debugging) {
        async.disableTrampolineIfNecessary();
    }
};

Promise.hasLongStackTraces = function () {
    return debugging && CapturedTrace.isSupported();
};

if (!CapturedTrace.isSupported()) {
    Promise.longStackTraces = function(){};
    debugging = false;
}

return function() {
    return debugging;
};
};

},{"./async.js":2,"./errors.js":13,"./util.js":38}],11:[function(_dereq_,module,exports){
"use strict";
var util = _dereq_("./util.js");
var isPrimitive = util.isPrimitive;

module.exports = function(Promise) {
var returner = function () {
    return this;
};
var thrower = function () {
    throw this;
};
var returnUndefined = function() {};
var throwUndefined = function() {
    throw undefined;
};

var wrapper = function (value, action) {
    if (action === 1) {
        return function () {
            throw value;
        };
    } else if (action === 2) {
        return function () {
            return value;
        };
    }
};


Promise.prototype["return"] =
Promise.prototype.thenReturn = function (value) {
    if (value === undefined) return this.then(returnUndefined);

    if (isPrimitive(value)) {
        return this._then(
            wrapper(value, 2),
            undefined,
            undefined,
            undefined,
            undefined
       );
    } else if (value instanceof Promise) {
        value._ignoreRejections();
    }
    return this._then(returner, undefined, undefined, value, undefined);
};

Promise.prototype["throw"] =
Promise.prototype.thenThrow = function (reason) {
    if (reason === undefined) return this.then(throwUndefined);

    if (isPrimitive(reason)) {
        return this._then(
            wrapper(reason, 1),
            undefined,
            undefined,
            undefined,
            undefined
       );
    }
    return this._then(thrower, undefined, undefined, reason, undefined);
};
};

},{"./util.js":38}],12:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var PromiseReduce = Promise.reduce;

Promise.prototype.each = function (fn) {
    return PromiseReduce(this, fn, null, INTERNAL);
};

Promise.each = function (promises, fn) {
    return PromiseReduce(promises, fn, null, INTERNAL);
};
};

},{}],13:[function(_dereq_,module,exports){
"use strict";
var es5 = _dereq_("./es5.js");
var Objectfreeze = es5.freeze;
var util = _dereq_("./util.js");
var inherits = util.inherits;
var notEnumerableProp = util.notEnumerableProp;

function subError(nameProperty, defaultMessage) {
    function SubError(message) {
        if (!(this instanceof SubError)) return new SubError(message);
        notEnumerableProp(this, "message",
            typeof message === "string" ? message : defaultMessage);
        notEnumerableProp(this, "name", nameProperty);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        } else {
            Error.call(this);
        }
    }
    inherits(SubError, Error);
    return SubError;
}

var _TypeError, _RangeError;
var Warning = subError("Warning", "warning");
var CancellationError = subError("CancellationError", "cancellation error");
var TimeoutError = subError("TimeoutError", "timeout error");
var AggregateError = subError("AggregateError", "aggregate error");
try {
    _TypeError = TypeError;
    _RangeError = RangeError;
} catch(e) {
    _TypeError = subError("TypeError", "type error");
    _RangeError = subError("RangeError", "range error");
}

var methods = ("join pop push shift unshift slice filter forEach some " +
    "every map indexOf lastIndexOf reduce reduceRight sort reverse").split(" ");

for (var i = 0; i < methods.length; ++i) {
    if (typeof Array.prototype[methods[i]] === "function") {
        AggregateError.prototype[methods[i]] = Array.prototype[methods[i]];
    }
}

es5.defineProperty(AggregateError.prototype, "length", {
    value: 0,
    configurable: false,
    writable: true,
    enumerable: true
});
AggregateError.prototype["isOperational"] = true;
var level = 0;
AggregateError.prototype.toString = function() {
    var indent = Array(level * 4 + 1).join(" ");
    var ret = "\n" + indent + "AggregateError of:" + "\n";
    level++;
    indent = Array(level * 4 + 1).join(" ");
    for (var i = 0; i < this.length; ++i) {
        var str = this[i] === this ? "[Circular AggregateError]" : this[i] + "";
        var lines = str.split("\n");
        for (var j = 0; j < lines.length; ++j) {
            lines[j] = indent + lines[j];
        }
        str = lines.join("\n");
        ret += str + "\n";
    }
    level--;
    return ret;
};

function OperationalError(message) {
    if (!(this instanceof OperationalError))
        return new OperationalError(message);
    notEnumerableProp(this, "name", "OperationalError");
    notEnumerableProp(this, "message", message);
    this.cause = message;
    this["isOperational"] = true;

    if (message instanceof Error) {
        notEnumerableProp(this, "message", message.message);
        notEnumerableProp(this, "stack", message.stack);
    } else if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
    }

}
inherits(OperationalError, Error);

var errorTypes = Error["__BluebirdErrorTypes__"];
if (!errorTypes) {
    errorTypes = Objectfreeze({
        CancellationError: CancellationError,
        TimeoutError: TimeoutError,
        OperationalError: OperationalError,
        RejectionError: OperationalError,
        AggregateError: AggregateError
    });
    notEnumerableProp(Error, "__BluebirdErrorTypes__", errorTypes);
}

module.exports = {
    Error: Error,
    TypeError: _TypeError,
    RangeError: _RangeError,
    CancellationError: errorTypes.CancellationError,
    OperationalError: errorTypes.OperationalError,
    TimeoutError: errorTypes.TimeoutError,
    AggregateError: errorTypes.AggregateError,
    Warning: Warning
};

},{"./es5.js":14,"./util.js":38}],14:[function(_dereq_,module,exports){
var isES5 = (function(){
    "use strict";
    return this === undefined;
})();

if (isES5) {
    module.exports = {
        freeze: Object.freeze,
        defineProperty: Object.defineProperty,
        getDescriptor: Object.getOwnPropertyDescriptor,
        keys: Object.keys,
        names: Object.getOwnPropertyNames,
        getPrototypeOf: Object.getPrototypeOf,
        isArray: Array.isArray,
        isES5: isES5,
        propertyIsWritable: function(obj, prop) {
            var descriptor = Object.getOwnPropertyDescriptor(obj, prop);
            return !!(!descriptor || descriptor.writable || descriptor.set);
        }
    };
} else {
    var has = {}.hasOwnProperty;
    var str = {}.toString;
    var proto = {}.constructor.prototype;

    var ObjectKeys = function (o) {
        var ret = [];
        for (var key in o) {
            if (has.call(o, key)) {
                ret.push(key);
            }
        }
        return ret;
    };

    var ObjectGetDescriptor = function(o, key) {
        return {value: o[key]};
    };

    var ObjectDefineProperty = function (o, key, desc) {
        o[key] = desc.value;
        return o;
    };

    var ObjectFreeze = function (obj) {
        return obj;
    };

    var ObjectGetPrototypeOf = function (obj) {
        try {
            return Object(obj).constructor.prototype;
        }
        catch (e) {
            return proto;
        }
    };

    var ArrayIsArray = function (obj) {
        try {
            return str.call(obj) === "[object Array]";
        }
        catch(e) {
            return false;
        }
    };

    module.exports = {
        isArray: ArrayIsArray,
        keys: ObjectKeys,
        names: ObjectKeys,
        defineProperty: ObjectDefineProperty,
        getDescriptor: ObjectGetDescriptor,
        freeze: ObjectFreeze,
        getPrototypeOf: ObjectGetPrototypeOf,
        isES5: isES5,
        propertyIsWritable: function() {
            return true;
        }
    };
}

},{}],15:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var PromiseMap = Promise.map;

Promise.prototype.filter = function (fn, options) {
    return PromiseMap(this, fn, options, INTERNAL);
};

Promise.filter = function (promises, fn, options) {
    return PromiseMap(promises, fn, options, INTERNAL);
};
};

},{}],16:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, NEXT_FILTER, tryConvertToPromise) {
var util = _dereq_("./util.js");
var isPrimitive = util.isPrimitive;
var thrower = util.thrower;

function returnThis() {
    return this;
}
function throwThis() {
    throw this;
}
function return$(r) {
    return function() {
        return r;
    };
}
function throw$(r) {
    return function() {
        throw r;
    };
}
function promisedFinally(ret, reasonOrValue, isFulfilled) {
    var then;
    if (isPrimitive(reasonOrValue)) {
        then = isFulfilled ? return$(reasonOrValue) : throw$(reasonOrValue);
    } else {
        then = isFulfilled ? returnThis : throwThis;
    }
    return ret._then(then, thrower, undefined, reasonOrValue, undefined);
}

function finallyHandler(reasonOrValue) {
    var promise = this.promise;
    var handler = this.handler;

    var ret = promise._isBound()
                    ? handler.call(promise._boundValue())
                    : handler();

    if (ret !== undefined) {
        var maybePromise = tryConvertToPromise(ret, promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            return promisedFinally(maybePromise, reasonOrValue,
                                    promise.isFulfilled());
        }
    }

    if (promise.isRejected()) {
        NEXT_FILTER.e = reasonOrValue;
        return NEXT_FILTER;
    } else {
        return reasonOrValue;
    }
}

function tapHandler(value) {
    var promise = this.promise;
    var handler = this.handler;

    var ret = promise._isBound()
                    ? handler.call(promise._boundValue(), value)
                    : handler(value);

    if (ret !== undefined) {
        var maybePromise = tryConvertToPromise(ret, promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            return promisedFinally(maybePromise, value, true);
        }
    }
    return value;
}

Promise.prototype._passThroughHandler = function (handler, isFinally) {
    if (typeof handler !== "function") return this.then();

    var promiseAndHandler = {
        promise: this,
        handler: handler
    };

    return this._then(
            isFinally ? finallyHandler : tapHandler,
            isFinally ? finallyHandler : undefined, undefined,
            promiseAndHandler, undefined);
};

Promise.prototype.lastly =
Promise.prototype["finally"] = function (handler) {
    return this._passThroughHandler(handler, true);
};

Promise.prototype.tap = function (handler) {
    return this._passThroughHandler(handler, false);
};
};

},{"./util.js":38}],17:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          apiRejection,
                          INTERNAL,
                          tryConvertToPromise) {
var errors = _dereq_("./errors.js");
var TypeError = errors.TypeError;
var util = _dereq_("./util.js");
var errorObj = util.errorObj;
var tryCatch = util.tryCatch;
var yieldHandlers = [];

function promiseFromYieldHandler(value, yieldHandlers, traceParent) {
    for (var i = 0; i < yieldHandlers.length; ++i) {
        traceParent._pushContext();
        var result = tryCatch(yieldHandlers[i])(value);
        traceParent._popContext();
        if (result === errorObj) {
            traceParent._pushContext();
            var ret = Promise.reject(errorObj.e);
            traceParent._popContext();
            return ret;
        }
        var maybePromise = tryConvertToPromise(result, traceParent);
        if (maybePromise instanceof Promise) return maybePromise;
    }
    return null;
}

function PromiseSpawn(generatorFunction, receiver, yieldHandler, stack) {
    var promise = this._promise = new Promise(INTERNAL);
    promise._captureStackTrace();
    this._stack = stack;
    this._generatorFunction = generatorFunction;
    this._receiver = receiver;
    this._generator = undefined;
    this._yieldHandlers = typeof yieldHandler === "function"
        ? [yieldHandler].concat(yieldHandlers)
        : yieldHandlers;
}

PromiseSpawn.prototype.promise = function () {
    return this._promise;
};

PromiseSpawn.prototype._run = function () {
    this._generator = this._generatorFunction.call(this._receiver);
    this._receiver =
        this._generatorFunction = undefined;
    this._next(undefined);
};

PromiseSpawn.prototype._continue = function (result) {
    if (result === errorObj) {
        return this._promise._rejectCallback(result.e, false, true);
    }

    var value = result.value;
    if (result.done === true) {
        this._promise._resolveCallback(value);
    } else {
        var maybePromise = tryConvertToPromise(value, this._promise);
        if (!(maybePromise instanceof Promise)) {
            maybePromise =
                promiseFromYieldHandler(maybePromise,
                                        this._yieldHandlers,
                                        this._promise);
            if (maybePromise === null) {
                this._throw(
                    new TypeError(
                        "A value %s was yielded that could not be treated as a promise\u000a\u000a    See http://goo.gl/4Y4pDk\u000a\u000a".replace("%s", value) +
                        "From coroutine:\u000a" +
                        this._stack.split("\n").slice(1, -7).join("\n")
                    )
                );
                return;
            }
        }
        maybePromise._then(
            this._next,
            this._throw,
            undefined,
            this,
            null
       );
    }
};

PromiseSpawn.prototype._throw = function (reason) {
    this._promise._attachExtraTrace(reason);
    this._promise._pushContext();
    var result = tryCatch(this._generator["throw"])
        .call(this._generator, reason);
    this._promise._popContext();
    this._continue(result);
};

PromiseSpawn.prototype._next = function (value) {
    this._promise._pushContext();
    var result = tryCatch(this._generator.next).call(this._generator, value);
    this._promise._popContext();
    this._continue(result);
};

Promise.coroutine = function (generatorFunction, options) {
    if (typeof generatorFunction !== "function") {
        throw new TypeError("generatorFunction must be a function\u000a\u000a    See http://goo.gl/6Vqhm0\u000a");
    }
    var yieldHandler = Object(options).yieldHandler;
    var PromiseSpawn$ = PromiseSpawn;
    var stack = new Error().stack;
    return function () {
        var generator = generatorFunction.apply(this, arguments);
        var spawn = new PromiseSpawn$(undefined, undefined, yieldHandler,
                                      stack);
        spawn._generator = generator;
        spawn._next(undefined);
        return spawn.promise();
    };
};

Promise.coroutine.addYieldHandler = function(fn) {
    if (typeof fn !== "function") throw new TypeError("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    yieldHandlers.push(fn);
};

Promise.spawn = function (generatorFunction) {
    if (typeof generatorFunction !== "function") {
        return apiRejection("generatorFunction must be a function\u000a\u000a    See http://goo.gl/6Vqhm0\u000a");
    }
    var spawn = new PromiseSpawn(generatorFunction, this);
    var ret = spawn.promise();
    spawn._run(Promise.spawn);
    return ret;
};
};

},{"./errors.js":13,"./util.js":38}],18:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, PromiseArray, tryConvertToPromise, INTERNAL) {
var util = _dereq_("./util.js");
var canEvaluate = util.canEvaluate;
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var reject;

if (!true) {
if (canEvaluate) {
    var thenCallback = function(i) {
        return new Function("value", "holder", "                             \n\
            'use strict';                                                    \n\
            holder.pIndex = value;                                           \n\
            holder.checkFulfillment(this);                                   \n\
            ".replace(/Index/g, i));
    };

    var caller = function(count) {
        var values = [];
        for (var i = 1; i <= count; ++i) values.push("holder.p" + i);
        return new Function("holder", "                                      \n\
            'use strict';                                                    \n\
            var callback = holder.fn;                                        \n\
            return callback(values);                                         \n\
            ".replace(/values/g, values.join(", ")));
    };
    var thenCallbacks = [];
    var callers = [undefined];
    for (var i = 1; i <= 5; ++i) {
        thenCallbacks.push(thenCallback(i));
        callers.push(caller(i));
    }

    var Holder = function(total, fn) {
        this.p1 = this.p2 = this.p3 = this.p4 = this.p5 = null;
        this.fn = fn;
        this.total = total;
        this.now = 0;
    };

    Holder.prototype.callers = callers;
    Holder.prototype.checkFulfillment = function(promise) {
        var now = this.now;
        now++;
        var total = this.total;
        if (now >= total) {
            var handler = this.callers[total];
            promise._pushContext();
            var ret = tryCatch(handler)(this);
            promise._popContext();
            if (ret === errorObj) {
                promise._rejectCallback(ret.e, false, true);
            } else {
                promise._resolveCallback(ret);
            }
        } else {
            this.now = now;
        }
    };

    var reject = function (reason) {
        this._reject(reason);
    };
}
}

Promise.join = function () {
    var last = arguments.length - 1;
    var fn;
    if (last > 0 && typeof arguments[last] === "function") {
        fn = arguments[last];
        if (!true) {
            if (last < 6 && canEvaluate) {
                var ret = new Promise(INTERNAL);
                ret._captureStackTrace();
                var holder = new Holder(last, fn);
                var callbacks = thenCallbacks;
                for (var i = 0; i < last; ++i) {
                    var maybePromise = tryConvertToPromise(arguments[i], ret);
                    if (maybePromise instanceof Promise) {
                        maybePromise = maybePromise._target();
                        if (maybePromise._isPending()) {
                            maybePromise._then(callbacks[i], reject,
                                               undefined, ret, holder);
                        } else if (maybePromise._isFulfilled()) {
                            callbacks[i].call(ret,
                                              maybePromise._value(), holder);
                        } else {
                            ret._reject(maybePromise._reason());
                        }
                    } else {
                        callbacks[i].call(ret, maybePromise, holder);
                    }
                }
                return ret;
            }
        }
    }
    var $_len = arguments.length;var args = new Array($_len); for(var $_i = 0; $_i < $_len; ++$_i) {args[$_i] = arguments[$_i];}
    if (fn) args.pop();
    var ret = new PromiseArray(args).promise();
    return fn !== undefined ? ret.spread(fn) : ret;
};

};

},{"./util.js":38}],19:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          PromiseArray,
                          apiRejection,
                          tryConvertToPromise,
                          INTERNAL) {
var getDomain = Promise._getDomain;
var async = _dereq_("./async.js");
var util = _dereq_("./util.js");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var PENDING = {};
var EMPTY_ARRAY = [];

function MappingPromiseArray(promises, fn, limit, _filter) {
    this.constructor$(promises);
    this._promise._captureStackTrace();
    var domain = getDomain();
    this._callback = domain === null ? fn : domain.bind(fn);
    this._preservedValues = _filter === INTERNAL
        ? new Array(this.length())
        : null;
    this._limit = limit;
    this._inFlight = 0;
    this._queue = limit >= 1 ? [] : EMPTY_ARRAY;
    async.invoke(init, this, undefined);
}
util.inherits(MappingPromiseArray, PromiseArray);
function init() {this._init$(undefined, -2);}

MappingPromiseArray.prototype._init = function () {};

MappingPromiseArray.prototype._promiseFulfilled = function (value, index) {
    var values = this._values;
    var length = this.length();
    var preservedValues = this._preservedValues;
    var limit = this._limit;
    if (values[index] === PENDING) {
        values[index] = value;
        if (limit >= 1) {
            this._inFlight--;
            this._drainQueue();
            if (this._isResolved()) return;
        }
    } else {
        if (limit >= 1 && this._inFlight >= limit) {
            values[index] = value;
            this._queue.push(index);
            return;
        }
        if (preservedValues !== null) preservedValues[index] = value;

        var callback = this._callback;
        var receiver = this._promise._boundValue();
        this._promise._pushContext();
        var ret = tryCatch(callback).call(receiver, value, index, length);
        this._promise._popContext();
        if (ret === errorObj) return this._reject(ret.e);

        var maybePromise = tryConvertToPromise(ret, this._promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            if (maybePromise._isPending()) {
                if (limit >= 1) this._inFlight++;
                values[index] = PENDING;
                return maybePromise._proxyPromiseArray(this, index);
            } else if (maybePromise._isFulfilled()) {
                ret = maybePromise._value();
            } else {
                return this._reject(maybePromise._reason());
            }
        }
        values[index] = ret;
    }
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= length) {
        if (preservedValues !== null) {
            this._filter(values, preservedValues);
        } else {
            this._resolve(values);
        }

    }
};

MappingPromiseArray.prototype._drainQueue = function () {
    var queue = this._queue;
    var limit = this._limit;
    var values = this._values;
    while (queue.length > 0 && this._inFlight < limit) {
        if (this._isResolved()) return;
        var index = queue.pop();
        this._promiseFulfilled(values[index], index);
    }
};

MappingPromiseArray.prototype._filter = function (booleans, values) {
    var len = values.length;
    var ret = new Array(len);
    var j = 0;
    for (var i = 0; i < len; ++i) {
        if (booleans[i]) ret[j++] = values[i];
    }
    ret.length = j;
    this._resolve(ret);
};

MappingPromiseArray.prototype.preservedValues = function () {
    return this._preservedValues;
};

function map(promises, fn, options, _filter) {
    var limit = typeof options === "object" && options !== null
        ? options.concurrency
        : 0;
    limit = typeof limit === "number" &&
        isFinite(limit) && limit >= 1 ? limit : 0;
    return new MappingPromiseArray(promises, fn, limit, _filter);
}

Promise.prototype.map = function (fn, options) {
    if (typeof fn !== "function") return apiRejection("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");

    return map(this, fn, options, null).promise();
};

Promise.map = function (promises, fn, options, _filter) {
    if (typeof fn !== "function") return apiRejection("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    return map(promises, fn, options, _filter).promise();
};


};

},{"./async.js":2,"./util.js":38}],20:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, INTERNAL, tryConvertToPromise, apiRejection) {
var util = _dereq_("./util.js");
var tryCatch = util.tryCatch;

Promise.method = function (fn) {
    if (typeof fn !== "function") {
        throw new Promise.TypeError("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    }
    return function () {
        var ret = new Promise(INTERNAL);
        ret._captureStackTrace();
        ret._pushContext();
        var value = tryCatch(fn).apply(this, arguments);
        ret._popContext();
        ret._resolveFromSyncValue(value);
        return ret;
    };
};

Promise.attempt = Promise["try"] = function (fn, args, ctx) {
    if (typeof fn !== "function") {
        return apiRejection("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    }
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    ret._pushContext();
    var value = util.isArray(args)
        ? tryCatch(fn).apply(ctx, args)
        : tryCatch(fn).call(ctx, args);
    ret._popContext();
    ret._resolveFromSyncValue(value);
    return ret;
};

Promise.prototype._resolveFromSyncValue = function (value) {
    if (value === util.errorObj) {
        this._rejectCallback(value.e, false, true);
    } else {
        this._resolveCallback(value, true);
    }
};
};

},{"./util.js":38}],21:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var util = _dereq_("./util.js");
var async = _dereq_("./async.js");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;

function spreadAdapter(val, nodeback) {
    var promise = this;
    if (!util.isArray(val)) return successAdapter.call(promise, val, nodeback);
    var ret =
        tryCatch(nodeback).apply(promise._boundValue(), [null].concat(val));
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}

function successAdapter(val, nodeback) {
    var promise = this;
    var receiver = promise._boundValue();
    var ret = val === undefined
        ? tryCatch(nodeback).call(receiver, null)
        : tryCatch(nodeback).call(receiver, null, val);
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}
function errorAdapter(reason, nodeback) {
    var promise = this;
    if (!reason) {
        var target = promise._target();
        var newReason = target._getCarriedStackTrace();
        newReason.cause = reason;
        reason = newReason;
    }
    var ret = tryCatch(nodeback).call(promise._boundValue(), reason);
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}

Promise.prototype.asCallback =
Promise.prototype.nodeify = function (nodeback, options) {
    if (typeof nodeback == "function") {
        var adapter = successAdapter;
        if (options !== undefined && Object(options).spread) {
            adapter = spreadAdapter;
        }
        this._then(
            adapter,
            errorAdapter,
            undefined,
            this,
            nodeback
        );
    }
    return this;
};
};

},{"./async.js":2,"./util.js":38}],22:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, PromiseArray) {
var util = _dereq_("./util.js");
var async = _dereq_("./async.js");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;

Promise.prototype.progressed = function (handler) {
    return this._then(undefined, undefined, handler, undefined, undefined);
};

Promise.prototype._progress = function (progressValue) {
    if (this._isFollowingOrFulfilledOrRejected()) return;
    this._target()._progressUnchecked(progressValue);

};

Promise.prototype._progressHandlerAt = function (index) {
    return index === 0
        ? this._progressHandler0
        : this[(index << 2) + index - 5 + 2];
};

Promise.prototype._doProgressWith = function (progression) {
    var progressValue = progression.value;
    var handler = progression.handler;
    var promise = progression.promise;
    var receiver = progression.receiver;

    var ret = tryCatch(handler).call(receiver, progressValue);
    if (ret === errorObj) {
        if (ret.e != null &&
            ret.e.name !== "StopProgressPropagation") {
            var trace = util.canAttachTrace(ret.e)
                ? ret.e : new Error(util.toString(ret.e));
            promise._attachExtraTrace(trace);
            promise._progress(ret.e);
        }
    } else if (ret instanceof Promise) {
        ret._then(promise._progress, null, null, promise, undefined);
    } else {
        promise._progress(ret);
    }
};


Promise.prototype._progressUnchecked = function (progressValue) {
    var len = this._length();
    var progress = this._progress;
    for (var i = 0; i < len; i++) {
        var handler = this._progressHandlerAt(i);
        var promise = this._promiseAt(i);
        if (!(promise instanceof Promise)) {
            var receiver = this._receiverAt(i);
            if (typeof handler === "function") {
                handler.call(receiver, progressValue, promise);
            } else if (receiver instanceof PromiseArray &&
                       !receiver._isResolved()) {
                receiver._promiseProgressed(progressValue, promise);
            }
            continue;
        }

        if (typeof handler === "function") {
            async.invoke(this._doProgressWith, this, {
                handler: handler,
                promise: promise,
                receiver: this._receiverAt(i),
                value: progressValue
            });
        } else {
            async.invoke(progress, promise, progressValue);
        }
    }
};
};

},{"./async.js":2,"./util.js":38}],23:[function(_dereq_,module,exports){
"use strict";
module.exports = function() {
var makeSelfResolutionError = function () {
    return new TypeError("circular promise resolution chain\u000a\u000a    See http://goo.gl/LhFpo0\u000a");
};
var reflect = function() {
    return new Promise.PromiseInspection(this._target());
};
var apiRejection = function(msg) {
    return Promise.reject(new TypeError(msg));
};

var util = _dereq_("./util.js");

var getDomain;
if (util.isNode) {
    getDomain = function() {
        var ret = process.domain;
        if (ret === undefined) ret = null;
        return ret;
    };
} else {
    getDomain = function() {
        return null;
    };
}
util.notEnumerableProp(Promise, "_getDomain", getDomain);

var UNDEFINED_BINDING = {};
var async = _dereq_("./async.js");
var errors = _dereq_("./errors.js");
var TypeError = Promise.TypeError = errors.TypeError;
Promise.RangeError = errors.RangeError;
Promise.CancellationError = errors.CancellationError;
Promise.TimeoutError = errors.TimeoutError;
Promise.OperationalError = errors.OperationalError;
Promise.RejectionError = errors.OperationalError;
Promise.AggregateError = errors.AggregateError;
var INTERNAL = function(){};
var APPLY = {};
var NEXT_FILTER = {e: null};
var tryConvertToPromise = _dereq_("./thenables.js")(Promise, INTERNAL);
var PromiseArray =
    _dereq_("./promise_array.js")(Promise, INTERNAL,
                                    tryConvertToPromise, apiRejection);
var CapturedTrace = _dereq_("./captured_trace.js")();
var isDebugging = _dereq_("./debuggability.js")(Promise, CapturedTrace);
 /*jshint unused:false*/
var createContext =
    _dereq_("./context.js")(Promise, CapturedTrace, isDebugging);
var CatchFilter = _dereq_("./catch_filter.js")(NEXT_FILTER);
var PromiseResolver = _dereq_("./promise_resolver.js");
var nodebackForPromise = PromiseResolver._nodebackForPromise;
var errorObj = util.errorObj;
var tryCatch = util.tryCatch;
function Promise(resolver) {
    if (typeof resolver !== "function") {
        throw new TypeError("the promise constructor requires a resolver function\u000a\u000a    See http://goo.gl/EC22Yn\u000a");
    }
    if (this.constructor !== Promise) {
        throw new TypeError("the promise constructor cannot be invoked directly\u000a\u000a    See http://goo.gl/KsIlge\u000a");
    }
    this._bitField = 0;
    this._fulfillmentHandler0 = undefined;
    this._rejectionHandler0 = undefined;
    this._progressHandler0 = undefined;
    this._promise0 = undefined;
    this._receiver0 = undefined;
    this._settledValue = undefined;
    if (resolver !== INTERNAL) this._resolveFromResolver(resolver);
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.caught = Promise.prototype["catch"] = function (fn) {
    var len = arguments.length;
    if (len > 1) {
        var catchInstances = new Array(len - 1),
            j = 0, i;
        for (i = 0; i < len - 1; ++i) {
            var item = arguments[i];
            if (typeof item === "function") {
                catchInstances[j++] = item;
            } else {
                return Promise.reject(
                    new TypeError("Catch filter must inherit from Error or be a simple predicate function\u000a\u000a    See http://goo.gl/o84o68\u000a"));
            }
        }
        catchInstances.length = j;
        fn = arguments[i];
        var catchFilter = new CatchFilter(catchInstances, fn, this);
        return this._then(undefined, catchFilter.doFilter, undefined,
            catchFilter, undefined);
    }
    return this._then(undefined, fn, undefined, undefined, undefined);
};

Promise.prototype.reflect = function () {
    return this._then(reflect, reflect, undefined, this, undefined);
};

Promise.prototype.then = function (didFulfill, didReject, didProgress) {
    if (isDebugging() && arguments.length > 0 &&
        typeof didFulfill !== "function" &&
        typeof didReject !== "function") {
        var msg = ".then() only accepts functions but was passed: " +
                util.classString(didFulfill);
        if (arguments.length > 1) {
            msg += ", " + util.classString(didReject);
        }
        this._warn(msg);
    }
    return this._then(didFulfill, didReject, didProgress,
        undefined, undefined);
};

Promise.prototype.done = function (didFulfill, didReject, didProgress) {
    var promise = this._then(didFulfill, didReject, didProgress,
        undefined, undefined);
    promise._setIsFinal();
};

Promise.prototype.spread = function (didFulfill, didReject) {
    return this.all()._then(didFulfill, didReject, undefined, APPLY, undefined);
};

Promise.prototype.isCancellable = function () {
    return !this.isResolved() &&
        this._cancellable();
};

Promise.prototype.toJSON = function () {
    var ret = {
        isFulfilled: false,
        isRejected: false,
        fulfillmentValue: undefined,
        rejectionReason: undefined
    };
    if (this.isFulfilled()) {
        ret.fulfillmentValue = this.value();
        ret.isFulfilled = true;
    } else if (this.isRejected()) {
        ret.rejectionReason = this.reason();
        ret.isRejected = true;
    }
    return ret;
};

Promise.prototype.all = function () {
    return new PromiseArray(this).promise();
};

Promise.prototype.error = function (fn) {
    return this.caught(util.originatesFromRejection, fn);
};

Promise.is = function (val) {
    return val instanceof Promise;
};

Promise.fromNode = function(fn) {
    var ret = new Promise(INTERNAL);
    var result = tryCatch(fn)(nodebackForPromise(ret));
    if (result === errorObj) {
        ret._rejectCallback(result.e, true, true);
    }
    return ret;
};

Promise.all = function (promises) {
    return new PromiseArray(promises).promise();
};

Promise.defer = Promise.pending = function () {
    var promise = new Promise(INTERNAL);
    return new PromiseResolver(promise);
};

Promise.cast = function (obj) {
    var ret = tryConvertToPromise(obj);
    if (!(ret instanceof Promise)) {
        var val = ret;
        ret = new Promise(INTERNAL);
        ret._fulfillUnchecked(val);
    }
    return ret;
};

Promise.resolve = Promise.fulfilled = Promise.cast;

Promise.reject = Promise.rejected = function (reason) {
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    ret._rejectCallback(reason, true);
    return ret;
};

Promise.setScheduler = function(fn) {
    if (typeof fn !== "function") throw new TypeError("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    var prev = async._schedule;
    async._schedule = fn;
    return prev;
};

Promise.prototype._then = function (
    didFulfill,
    didReject,
    didProgress,
    receiver,
    internalData
) {
    var haveInternalData = internalData !== undefined;
    var ret = haveInternalData ? internalData : new Promise(INTERNAL);

    if (!haveInternalData) {
        ret._propagateFrom(this, 4 | 1);
        ret._captureStackTrace();
    }

    var target = this._target();
    if (target !== this) {
        if (receiver === undefined) receiver = this._boundTo;
        if (!haveInternalData) ret._setIsMigrated();
    }

    var callbackIndex = target._addCallbacks(didFulfill,
                                             didReject,
                                             didProgress,
                                             ret,
                                             receiver,
                                             getDomain());

    if (target._isResolved() && !target._isSettlePromisesQueued()) {
        async.invoke(
            target._settlePromiseAtPostResolution, target, callbackIndex);
    }

    return ret;
};

Promise.prototype._settlePromiseAtPostResolution = function (index) {
    if (this._isRejectionUnhandled()) this._unsetRejectionIsUnhandled();
    this._settlePromiseAt(index);
};

Promise.prototype._length = function () {
    return this._bitField & 131071;
};

Promise.prototype._isFollowingOrFulfilledOrRejected = function () {
    return (this._bitField & 939524096) > 0;
};

Promise.prototype._isFollowing = function () {
    return (this._bitField & 536870912) === 536870912;
};

Promise.prototype._setLength = function (len) {
    this._bitField = (this._bitField & -131072) |
        (len & 131071);
};

Promise.prototype._setFulfilled = function () {
    this._bitField = this._bitField | 268435456;
};

Promise.prototype._setRejected = function () {
    this._bitField = this._bitField | 134217728;
};

Promise.prototype._setFollowing = function () {
    this._bitField = this._bitField | 536870912;
};

Promise.prototype._setIsFinal = function () {
    this._bitField = this._bitField | 33554432;
};

Promise.prototype._isFinal = function () {
    return (this._bitField & 33554432) > 0;
};

Promise.prototype._cancellable = function () {
    return (this._bitField & 67108864) > 0;
};

Promise.prototype._setCancellable = function () {
    this._bitField = this._bitField | 67108864;
};

Promise.prototype._unsetCancellable = function () {
    this._bitField = this._bitField & (~67108864);
};

Promise.prototype._setIsMigrated = function () {
    this._bitField = this._bitField | 4194304;
};

Promise.prototype._unsetIsMigrated = function () {
    this._bitField = this._bitField & (~4194304);
};

Promise.prototype._isMigrated = function () {
    return (this._bitField & 4194304) > 0;
};

Promise.prototype._receiverAt = function (index) {
    var ret = index === 0
        ? this._receiver0
        : this[
            index * 5 - 5 + 4];
    if (ret === UNDEFINED_BINDING) {
        return undefined;
    } else if (ret === undefined && this._isBound()) {
        return this._boundValue();
    }
    return ret;
};

Promise.prototype._promiseAt = function (index) {
    return index === 0
        ? this._promise0
        : this[index * 5 - 5 + 3];
};

Promise.prototype._fulfillmentHandlerAt = function (index) {
    return index === 0
        ? this._fulfillmentHandler0
        : this[index * 5 - 5 + 0];
};

Promise.prototype._rejectionHandlerAt = function (index) {
    return index === 0
        ? this._rejectionHandler0
        : this[index * 5 - 5 + 1];
};

Promise.prototype._boundValue = function() {
    var ret = this._boundTo;
    if (ret !== undefined) {
        if (ret instanceof Promise) {
            if (ret.isFulfilled()) {
                return ret.value();
            } else {
                return undefined;
            }
        }
    }
    return ret;
};

Promise.prototype._migrateCallbacks = function (follower, index) {
    var fulfill = follower._fulfillmentHandlerAt(index);
    var reject = follower._rejectionHandlerAt(index);
    var progress = follower._progressHandlerAt(index);
    var promise = follower._promiseAt(index);
    var receiver = follower._receiverAt(index);
    if (promise instanceof Promise) promise._setIsMigrated();
    if (receiver === undefined) receiver = UNDEFINED_BINDING;
    this._addCallbacks(fulfill, reject, progress, promise, receiver, null);
};

Promise.prototype._addCallbacks = function (
    fulfill,
    reject,
    progress,
    promise,
    receiver,
    domain
) {
    var index = this._length();

    if (index >= 131071 - 5) {
        index = 0;
        this._setLength(0);
    }

    if (index === 0) {
        this._promise0 = promise;
        if (receiver !== undefined) this._receiver0 = receiver;
        if (typeof fulfill === "function" && !this._isCarryingStackTrace()) {
            this._fulfillmentHandler0 =
                domain === null ? fulfill : domain.bind(fulfill);
        }
        if (typeof reject === "function") {
            this._rejectionHandler0 =
                domain === null ? reject : domain.bind(reject);
        }
        if (typeof progress === "function") {
            this._progressHandler0 =
                domain === null ? progress : domain.bind(progress);
        }
    } else {
        var base = index * 5 - 5;
        this[base + 3] = promise;
        this[base + 4] = receiver;
        if (typeof fulfill === "function") {
            this[base + 0] =
                domain === null ? fulfill : domain.bind(fulfill);
        }
        if (typeof reject === "function") {
            this[base + 1] =
                domain === null ? reject : domain.bind(reject);
        }
        if (typeof progress === "function") {
            this[base + 2] =
                domain === null ? progress : domain.bind(progress);
        }
    }
    this._setLength(index + 1);
    return index;
};

Promise.prototype._setProxyHandlers = function (receiver, promiseSlotValue) {
    var index = this._length();

    if (index >= 131071 - 5) {
        index = 0;
        this._setLength(0);
    }
    if (index === 0) {
        this._promise0 = promiseSlotValue;
        this._receiver0 = receiver;
    } else {
        var base = index * 5 - 5;
        this[base + 3] = promiseSlotValue;
        this[base + 4] = receiver;
    }
    this._setLength(index + 1);
};

Promise.prototype._proxyPromiseArray = function (promiseArray, index) {
    this._setProxyHandlers(promiseArray, index);
};

Promise.prototype._resolveCallback = function(value, shouldBind) {
    if (this._isFollowingOrFulfilledOrRejected()) return;
    if (value === this)
        return this._rejectCallback(makeSelfResolutionError(), false, true);
    var maybePromise = tryConvertToPromise(value, this);
    if (!(maybePromise instanceof Promise)) return this._fulfill(value);

    var propagationFlags = 1 | (shouldBind ? 4 : 0);
    this._propagateFrom(maybePromise, propagationFlags);
    var promise = maybePromise._target();
    if (promise._isPending()) {
        var len = this._length();
        for (var i = 0; i < len; ++i) {
            promise._migrateCallbacks(this, i);
        }
        this._setFollowing();
        this._setLength(0);
        this._setFollowee(promise);
    } else if (promise._isFulfilled()) {
        this._fulfillUnchecked(promise._value());
    } else {
        this._rejectUnchecked(promise._reason(),
            promise._getCarriedStackTrace());
    }
};

Promise.prototype._rejectCallback =
function(reason, synchronous, shouldNotMarkOriginatingFromRejection) {
    if (!shouldNotMarkOriginatingFromRejection) {
        util.markAsOriginatingFromRejection(reason);
    }
    var trace = util.ensureErrorObject(reason);
    var hasStack = trace === reason;
    this._attachExtraTrace(trace, synchronous ? hasStack : false);
    this._reject(reason, hasStack ? undefined : trace);
};

Promise.prototype._resolveFromResolver = function (resolver) {
    var promise = this;
    this._captureStackTrace();
    this._pushContext();
    var synchronous = true;
    var r = tryCatch(resolver)(function(value) {
        if (promise === null) return;
        promise._resolveCallback(value);
        promise = null;
    }, function (reason) {
        if (promise === null) return;
        promise._rejectCallback(reason, synchronous);
        promise = null;
    });
    synchronous = false;
    this._popContext();

    if (r !== undefined && r === errorObj && promise !== null) {
        promise._rejectCallback(r.e, true, true);
        promise = null;
    }
};

Promise.prototype._settlePromiseFromHandler = function (
    handler, receiver, value, promise
) {
    if (promise._isRejected()) return;
    promise._pushContext();
    var x;
    if (receiver === APPLY && !this._isRejected()) {
        x = tryCatch(handler).apply(this._boundValue(), value);
    } else {
        x = tryCatch(handler).call(receiver, value);
    }
    promise._popContext();

    if (x === errorObj || x === promise || x === NEXT_FILTER) {
        var err = x === promise ? makeSelfResolutionError() : x.e;
        promise._rejectCallback(err, false, true);
    } else {
        promise._resolveCallback(x);
    }
};

Promise.prototype._target = function() {
    var ret = this;
    while (ret._isFollowing()) ret = ret._followee();
    return ret;
};

Promise.prototype._followee = function() {
    return this._rejectionHandler0;
};

Promise.prototype._setFollowee = function(promise) {
    this._rejectionHandler0 = promise;
};

Promise.prototype._cleanValues = function () {
    if (this._cancellable()) {
        this._cancellationParent = undefined;
    }
};

Promise.prototype._propagateFrom = function (parent, flags) {
    if ((flags & 1) > 0 && parent._cancellable()) {
        this._setCancellable();
        this._cancellationParent = parent;
    }
    if ((flags & 4) > 0 && parent._isBound()) {
        this._setBoundTo(parent._boundTo);
    }
};

Promise.prototype._fulfill = function (value) {
    if (this._isFollowingOrFulfilledOrRejected()) return;
    this._fulfillUnchecked(value);
};

Promise.prototype._reject = function (reason, carriedStackTrace) {
    if (this._isFollowingOrFulfilledOrRejected()) return;
    this._rejectUnchecked(reason, carriedStackTrace);
};

Promise.prototype._settlePromiseAt = function (index) {
    var promise = this._promiseAt(index);
    var isPromise = promise instanceof Promise;

    if (isPromise && promise._isMigrated()) {
        promise._unsetIsMigrated();
        return async.invoke(this._settlePromiseAt, this, index);
    }
    var handler = this._isFulfilled()
        ? this._fulfillmentHandlerAt(index)
        : this._rejectionHandlerAt(index);

    var carriedStackTrace =
        this._isCarryingStackTrace() ? this._getCarriedStackTrace() : undefined;
    var value = this._settledValue;
    var receiver = this._receiverAt(index);
    this._clearCallbackDataAtIndex(index);

    if (typeof handler === "function") {
        if (!isPromise) {
            handler.call(receiver, value, promise);
        } else {
            this._settlePromiseFromHandler(handler, receiver, value, promise);
        }
    } else if (receiver instanceof PromiseArray) {
        if (!receiver._isResolved()) {
            if (this._isFulfilled()) {
                receiver._promiseFulfilled(value, promise);
            }
            else {
                receiver._promiseRejected(value, promise);
            }
        }
    } else if (isPromise) {
        if (this._isFulfilled()) {
            promise._fulfill(value);
        } else {
            promise._reject(value, carriedStackTrace);
        }
    }

    if (index >= 4 && (index & 31) === 4)
        async.invokeLater(this._setLength, this, 0);
};

Promise.prototype._clearCallbackDataAtIndex = function(index) {
    if (index === 0) {
        if (!this._isCarryingStackTrace()) {
            this._fulfillmentHandler0 = undefined;
        }
        this._rejectionHandler0 =
        this._progressHandler0 =
        this._receiver0 =
        this._promise0 = undefined;
    } else {
        var base = index * 5 - 5;
        this[base + 3] =
        this[base + 4] =
        this[base + 0] =
        this[base + 1] =
        this[base + 2] = undefined;
    }
};

Promise.prototype._isSettlePromisesQueued = function () {
    return (this._bitField &
            -1073741824) === -1073741824;
};

Promise.prototype._setSettlePromisesQueued = function () {
    this._bitField = this._bitField | -1073741824;
};

Promise.prototype._unsetSettlePromisesQueued = function () {
    this._bitField = this._bitField & (~-1073741824);
};

Promise.prototype._queueSettlePromises = function() {
    async.settlePromises(this);
    this._setSettlePromisesQueued();
};

Promise.prototype._fulfillUnchecked = function (value) {
    if (value === this) {
        var err = makeSelfResolutionError();
        this._attachExtraTrace(err);
        return this._rejectUnchecked(err, undefined);
    }
    this._setFulfilled();
    this._settledValue = value;
    this._cleanValues();

    if (this._length() > 0) {
        this._queueSettlePromises();
    }
};

Promise.prototype._rejectUncheckedCheckError = function (reason) {
    var trace = util.ensureErrorObject(reason);
    this._rejectUnchecked(reason, trace === reason ? undefined : trace);
};

Promise.prototype._rejectUnchecked = function (reason, trace) {
    if (reason === this) {
        var err = makeSelfResolutionError();
        this._attachExtraTrace(err);
        return this._rejectUnchecked(err);
    }
    this._setRejected();
    this._settledValue = reason;
    this._cleanValues();

    if (this._isFinal()) {
        async.throwLater(function(e) {
            if ("stack" in e) {
                async.invokeFirst(
                    CapturedTrace.unhandledRejection, undefined, e);
            }
            throw e;
        }, trace === undefined ? reason : trace);
        return;
    }

    if (trace !== undefined && trace !== reason) {
        this._setCarriedStackTrace(trace);
    }

    if (this._length() > 0) {
        this._queueSettlePromises();
    } else {
        this._ensurePossibleRejectionHandled();
    }
};

Promise.prototype._settlePromises = function () {
    this._unsetSettlePromisesQueued();
    var len = this._length();
    for (var i = 0; i < len; i++) {
        this._settlePromiseAt(i);
    }
};

util.notEnumerableProp(Promise,
                       "_makeSelfResolutionError",
                       makeSelfResolutionError);

_dereq_("./progress.js")(Promise, PromiseArray);
_dereq_("./method.js")(Promise, INTERNAL, tryConvertToPromise, apiRejection);
_dereq_("./bind.js")(Promise, INTERNAL, tryConvertToPromise);
_dereq_("./finally.js")(Promise, NEXT_FILTER, tryConvertToPromise);
_dereq_("./direct_resolve.js")(Promise);
_dereq_("./synchronous_inspection.js")(Promise);
_dereq_("./join.js")(Promise, PromiseArray, tryConvertToPromise, INTERNAL);
Promise.Promise = Promise;
_dereq_('./map.js')(Promise, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL);
_dereq_('./cancel.js')(Promise);
_dereq_('./using.js')(Promise, apiRejection, tryConvertToPromise, createContext);
_dereq_('./generators.js')(Promise, apiRejection, INTERNAL, tryConvertToPromise);
_dereq_('./nodeify.js')(Promise);
_dereq_('./call_get.js')(Promise);
_dereq_('./props.js')(Promise, PromiseArray, tryConvertToPromise, apiRejection);
_dereq_('./race.js')(Promise, INTERNAL, tryConvertToPromise, apiRejection);
_dereq_('./reduce.js')(Promise, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL);
_dereq_('./settle.js')(Promise, PromiseArray);
_dereq_('./some.js')(Promise, PromiseArray, apiRejection);
_dereq_('./promisify.js')(Promise, INTERNAL);
_dereq_('./any.js')(Promise);
_dereq_('./each.js')(Promise, INTERNAL);
_dereq_('./timers.js')(Promise, INTERNAL);
_dereq_('./filter.js')(Promise, INTERNAL);
                                                         
    util.toFastProperties(Promise);                                          
    util.toFastProperties(Promise.prototype);                                
    function fillTypes(value) {                                              
        var p = new Promise(INTERNAL);                                       
        p._fulfillmentHandler0 = value;                                      
        p._rejectionHandler0 = value;                                        
        p._progressHandler0 = value;                                         
        p._promise0 = value;                                                 
        p._receiver0 = value;                                                
        p._settledValue = value;                                             
    }                                                                        
    // Complete slack tracking, opt out of field-type tracking and           
    // stabilize map                                                         
    fillTypes({a: 1});                                                       
    fillTypes({b: 2});                                                       
    fillTypes({c: 3});                                                       
    fillTypes(1);                                                            
    fillTypes(function(){});                                                 
    fillTypes(undefined);                                                    
    fillTypes(false);                                                        
    fillTypes(new Promise(INTERNAL));                                        
    CapturedTrace.setBounds(async.firstLineError, util.lastLineError);       
    return Promise;                                                          

};

},{"./any.js":1,"./async.js":2,"./bind.js":3,"./call_get.js":5,"./cancel.js":6,"./captured_trace.js":7,"./catch_filter.js":8,"./context.js":9,"./debuggability.js":10,"./direct_resolve.js":11,"./each.js":12,"./errors.js":13,"./filter.js":15,"./finally.js":16,"./generators.js":17,"./join.js":18,"./map.js":19,"./method.js":20,"./nodeify.js":21,"./progress.js":22,"./promise_array.js":24,"./promise_resolver.js":25,"./promisify.js":26,"./props.js":27,"./race.js":29,"./reduce.js":30,"./settle.js":32,"./some.js":33,"./synchronous_inspection.js":34,"./thenables.js":35,"./timers.js":36,"./using.js":37,"./util.js":38}],24:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, tryConvertToPromise,
    apiRejection) {
var util = _dereq_("./util.js");
var isArray = util.isArray;

function toResolutionValue(val) {
    switch(val) {
    case -2: return [];
    case -3: return {};
    }
}

function PromiseArray(values) {
    var promise = this._promise = new Promise(INTERNAL);
    var parent;
    if (values instanceof Promise) {
        parent = values;
        promise._propagateFrom(parent, 1 | 4);
    }
    this._values = values;
    this._length = 0;
    this._totalResolved = 0;
    this._init(undefined, -2);
}
PromiseArray.prototype.length = function () {
    return this._length;
};

PromiseArray.prototype.promise = function () {
    return this._promise;
};

PromiseArray.prototype._init = function init(_, resolveValueIfEmpty) {
    var values = tryConvertToPromise(this._values, this._promise);
    if (values instanceof Promise) {
        values = values._target();
        this._values = values;
        if (values._isFulfilled()) {
            values = values._value();
            if (!isArray(values)) {
                var err = new Promise.TypeError("expecting an array, a promise or a thenable\u000a\u000a    See http://goo.gl/s8MMhc\u000a");
                this.__hardReject__(err);
                return;
            }
        } else if (values._isPending()) {
            values._then(
                init,
                this._reject,
                undefined,
                this,
                resolveValueIfEmpty
           );
            return;
        } else {
            this._reject(values._reason());
            return;
        }
    } else if (!isArray(values)) {
        this._promise._reject(apiRejection("expecting an array, a promise or a thenable\u000a\u000a    See http://goo.gl/s8MMhc\u000a")._reason());
        return;
    }

    if (values.length === 0) {
        if (resolveValueIfEmpty === -5) {
            this._resolveEmptyArray();
        }
        else {
            this._resolve(toResolutionValue(resolveValueIfEmpty));
        }
        return;
    }
    var len = this.getActualLength(values.length);
    this._length = len;
    this._values = this.shouldCopyValues() ? new Array(len) : this._values;
    var promise = this._promise;
    for (var i = 0; i < len; ++i) {
        var isResolved = this._isResolved();
        var maybePromise = tryConvertToPromise(values[i], promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            if (isResolved) {
                maybePromise._ignoreRejections();
            } else if (maybePromise._isPending()) {
                maybePromise._proxyPromiseArray(this, i);
            } else if (maybePromise._isFulfilled()) {
                this._promiseFulfilled(maybePromise._value(), i);
            } else {
                this._promiseRejected(maybePromise._reason(), i);
            }
        } else if (!isResolved) {
            this._promiseFulfilled(maybePromise, i);
        }
    }
};

PromiseArray.prototype._isResolved = function () {
    return this._values === null;
};

PromiseArray.prototype._resolve = function (value) {
    this._values = null;
    this._promise._fulfill(value);
};

PromiseArray.prototype.__hardReject__ =
PromiseArray.prototype._reject = function (reason) {
    this._values = null;
    this._promise._rejectCallback(reason, false, true);
};

PromiseArray.prototype._promiseProgressed = function (progressValue, index) {
    this._promise._progress({
        index: index,
        value: progressValue
    });
};


PromiseArray.prototype._promiseFulfilled = function (value, index) {
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        this._resolve(this._values);
    }
};

PromiseArray.prototype._promiseRejected = function (reason, index) {
    this._totalResolved++;
    this._reject(reason);
};

PromiseArray.prototype.shouldCopyValues = function () {
    return true;
};

PromiseArray.prototype.getActualLength = function (len) {
    return len;
};

return PromiseArray;
};

},{"./util.js":38}],25:[function(_dereq_,module,exports){
"use strict";
var util = _dereq_("./util.js");
var maybeWrapAsError = util.maybeWrapAsError;
var errors = _dereq_("./errors.js");
var TimeoutError = errors.TimeoutError;
var OperationalError = errors.OperationalError;
var haveGetters = util.haveGetters;
var es5 = _dereq_("./es5.js");

function isUntypedError(obj) {
    return obj instanceof Error &&
        es5.getPrototypeOf(obj) === Error.prototype;
}

var rErrorKey = /^(?:name|message|stack|cause)$/;
function wrapAsOperationalError(obj) {
    var ret;
    if (isUntypedError(obj)) {
        ret = new OperationalError(obj);
        ret.name = obj.name;
        ret.message = obj.message;
        ret.stack = obj.stack;
        var keys = es5.keys(obj);
        for (var i = 0; i < keys.length; ++i) {
            var key = keys[i];
            if (!rErrorKey.test(key)) {
                ret[key] = obj[key];
            }
        }
        return ret;
    }
    util.markAsOriginatingFromRejection(obj);
    return obj;
}

function nodebackForPromise(promise) {
    return function(err, value) {
        if (promise === null) return;

        if (err) {
            var wrapped = wrapAsOperationalError(maybeWrapAsError(err));
            promise._attachExtraTrace(wrapped);
            promise._reject(wrapped);
        } else if (arguments.length > 2) {
            var $_len = arguments.length;var args = new Array($_len - 1); for(var $_i = 1; $_i < $_len; ++$_i) {args[$_i - 1] = arguments[$_i];}
            promise._fulfill(args);
        } else {
            promise._fulfill(value);
        }

        promise = null;
    };
}


var PromiseResolver;
if (!haveGetters) {
    PromiseResolver = function (promise) {
        this.promise = promise;
        this.asCallback = nodebackForPromise(promise);
        this.callback = this.asCallback;
    };
}
else {
    PromiseResolver = function (promise) {
        this.promise = promise;
    };
}
if (haveGetters) {
    var prop = {
        get: function() {
            return nodebackForPromise(this.promise);
        }
    };
    es5.defineProperty(PromiseResolver.prototype, "asCallback", prop);
    es5.defineProperty(PromiseResolver.prototype, "callback", prop);
}

PromiseResolver._nodebackForPromise = nodebackForPromise;

PromiseResolver.prototype.toString = function () {
    return "[object PromiseResolver]";
};

PromiseResolver.prototype.resolve =
PromiseResolver.prototype.fulfill = function (value) {
    if (!(this instanceof PromiseResolver)) {
        throw new TypeError("Illegal invocation, resolver resolve/reject must be called within a resolver context. Consider using the promise constructor instead.\u000a\u000a    See http://goo.gl/sdkXL9\u000a");
    }
    this.promise._resolveCallback(value);
};

PromiseResolver.prototype.reject = function (reason) {
    if (!(this instanceof PromiseResolver)) {
        throw new TypeError("Illegal invocation, resolver resolve/reject must be called within a resolver context. Consider using the promise constructor instead.\u000a\u000a    See http://goo.gl/sdkXL9\u000a");
    }
    this.promise._rejectCallback(reason);
};

PromiseResolver.prototype.progress = function (value) {
    if (!(this instanceof PromiseResolver)) {
        throw new TypeError("Illegal invocation, resolver resolve/reject must be called within a resolver context. Consider using the promise constructor instead.\u000a\u000a    See http://goo.gl/sdkXL9\u000a");
    }
    this.promise._progress(value);
};

PromiseResolver.prototype.cancel = function (err) {
    this.promise.cancel(err);
};

PromiseResolver.prototype.timeout = function () {
    this.reject(new TimeoutError("timeout"));
};

PromiseResolver.prototype.isResolved = function () {
    return this.promise.isResolved();
};

PromiseResolver.prototype.toJSON = function () {
    return this.promise.toJSON();
};

module.exports = PromiseResolver;

},{"./errors.js":13,"./es5.js":14,"./util.js":38}],26:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var THIS = {};
var util = _dereq_("./util.js");
var nodebackForPromise = _dereq_("./promise_resolver.js")
    ._nodebackForPromise;
var withAppended = util.withAppended;
var maybeWrapAsError = util.maybeWrapAsError;
var canEvaluate = util.canEvaluate;
var TypeError = _dereq_("./errors").TypeError;
var defaultSuffix = "Async";
var defaultPromisified = {__isPromisified__: true};
var noCopyProps = [
    "arity",    "length",
    "name",
    "arguments",
    "caller",
    "callee",
    "prototype",
    "__isPromisified__"
];
var noCopyPropsPattern = new RegExp("^(?:" + noCopyProps.join("|") + ")$");

var defaultFilter = function(name) {
    return util.isIdentifier(name) &&
        name.charAt(0) !== "_" &&
        name !== "constructor";
};

function propsFilter(key) {
    return !noCopyPropsPattern.test(key);
}

function isPromisified(fn) {
    try {
        return fn.__isPromisified__ === true;
    }
    catch (e) {
        return false;
    }
}

function hasPromisified(obj, key, suffix) {
    var val = util.getDataPropertyOrDefault(obj, key + suffix,
                                            defaultPromisified);
    return val ? isPromisified(val) : false;
}
function checkValid(ret, suffix, suffixRegexp) {
    for (var i = 0; i < ret.length; i += 2) {
        var key = ret[i];
        if (suffixRegexp.test(key)) {
            var keyWithoutAsyncSuffix = key.replace(suffixRegexp, "");
            for (var j = 0; j < ret.length; j += 2) {
                if (ret[j] === keyWithoutAsyncSuffix) {
                    throw new TypeError("Cannot promisify an API that has normal methods with '%s'-suffix\u000a\u000a    See http://goo.gl/iWrZbw\u000a"
                        .replace("%s", suffix));
                }
            }
        }
    }
}

function promisifiableMethods(obj, suffix, suffixRegexp, filter) {
    var keys = util.inheritedDataKeys(obj);
    var ret = [];
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        var value = obj[key];
        var passesDefaultFilter = filter === defaultFilter
            ? true : defaultFilter(key, value, obj);
        if (typeof value === "function" &&
            !isPromisified(value) &&
            !hasPromisified(obj, key, suffix) &&
            filter(key, value, obj, passesDefaultFilter)) {
            ret.push(key, value);
        }
    }
    checkValid(ret, suffix, suffixRegexp);
    return ret;
}

var escapeIdentRegex = function(str) {
    return str.replace(/([$])/, "\\$");
};

var makeNodePromisifiedEval;
if (!true) {
var switchCaseArgumentOrder = function(likelyArgumentCount) {
    var ret = [likelyArgumentCount];
    var min = Math.max(0, likelyArgumentCount - 1 - 3);
    for(var i = likelyArgumentCount - 1; i >= min; --i) {
        ret.push(i);
    }
    for(var i = likelyArgumentCount + 1; i <= 3; ++i) {
        ret.push(i);
    }
    return ret;
};

var argumentSequence = function(argumentCount) {
    return util.filledRange(argumentCount, "_arg", "");
};

var parameterDeclaration = function(parameterCount) {
    return util.filledRange(
        Math.max(parameterCount, 3), "_arg", "");
};

var parameterCount = function(fn) {
    if (typeof fn.length === "number") {
        return Math.max(Math.min(fn.length, 1023 + 1), 0);
    }
    return 0;
};

makeNodePromisifiedEval =
function(callback, receiver, originalName, fn) {
    var newParameterCount = Math.max(0, parameterCount(fn) - 1);
    var argumentOrder = switchCaseArgumentOrder(newParameterCount);
    var shouldProxyThis = typeof callback === "string" || receiver === THIS;

    function generateCallForArgumentCount(count) {
        var args = argumentSequence(count).join(", ");
        var comma = count > 0 ? ", " : "";
        var ret;
        if (shouldProxyThis) {
            ret = "ret = callback.call(this, {{args}}, nodeback); break;\n";
        } else {
            ret = receiver === undefined
                ? "ret = callback({{args}}, nodeback); break;\n"
                : "ret = callback.call(receiver, {{args}}, nodeback); break;\n";
        }
        return ret.replace("{{args}}", args).replace(", ", comma);
    }

    function generateArgumentSwitchCase() {
        var ret = "";
        for (var i = 0; i < argumentOrder.length; ++i) {
            ret += "case " + argumentOrder[i] +":" +
                generateCallForArgumentCount(argumentOrder[i]);
        }

        ret += "                                                             \n\
        default:                                                             \n\
            var args = new Array(len + 1);                                   \n\
            var i = 0;                                                       \n\
            for (var i = 0; i < len; ++i) {                                  \n\
               args[i] = arguments[i];                                       \n\
            }                                                                \n\
            args[i] = nodeback;                                              \n\
            [CodeForCall]                                                    \n\
            break;                                                           \n\
        ".replace("[CodeForCall]", (shouldProxyThis
                                ? "ret = callback.apply(this, args);\n"
                                : "ret = callback.apply(receiver, args);\n"));
        return ret;
    }

    var getFunctionCode = typeof callback === "string"
                                ? ("this != null ? this['"+callback+"'] : fn")
                                : "fn";

    return new Function("Promise",
                        "fn",
                        "receiver",
                        "withAppended",
                        "maybeWrapAsError",
                        "nodebackForPromise",
                        "tryCatch",
                        "errorObj",
                        "notEnumerableProp",
                        "INTERNAL","'use strict';                            \n\
        var ret = function (Parameters) {                                    \n\
            'use strict';                                                    \n\
            var len = arguments.length;                                      \n\
            var promise = new Promise(INTERNAL);                             \n\
            promise._captureStackTrace();                                    \n\
            var nodeback = nodebackForPromise(promise);                      \n\
            var ret;                                                         \n\
            var callback = tryCatch([GetFunctionCode]);                      \n\
            switch(len) {                                                    \n\
                [CodeForSwitchCase]                                          \n\
            }                                                                \n\
            if (ret === errorObj) {                                          \n\
                promise._rejectCallback(maybeWrapAsError(ret.e), true, true);\n\
            }                                                                \n\
            return promise;                                                  \n\
        };                                                                   \n\
        notEnumerableProp(ret, '__isPromisified__', true);                   \n\
        return ret;                                                          \n\
        "
        .replace("Parameters", parameterDeclaration(newParameterCount))
        .replace("[CodeForSwitchCase]", generateArgumentSwitchCase())
        .replace("[GetFunctionCode]", getFunctionCode))(
            Promise,
            fn,
            receiver,
            withAppended,
            maybeWrapAsError,
            nodebackForPromise,
            util.tryCatch,
            util.errorObj,
            util.notEnumerableProp,
            INTERNAL
        );
};
}

function makeNodePromisifiedClosure(callback, receiver, _, fn) {
    var defaultThis = (function() {return this;})();
    var method = callback;
    if (typeof method === "string") {
        callback = fn;
    }
    function promisified() {
        var _receiver = receiver;
        if (receiver === THIS) _receiver = this;
        var promise = new Promise(INTERNAL);
        promise._captureStackTrace();
        var cb = typeof method === "string" && this !== defaultThis
            ? this[method] : callback;
        var fn = nodebackForPromise(promise);
        try {
            cb.apply(_receiver, withAppended(arguments, fn));
        } catch(e) {
            promise._rejectCallback(maybeWrapAsError(e), true, true);
        }
        return promise;
    }
    util.notEnumerableProp(promisified, "__isPromisified__", true);
    return promisified;
}

var makeNodePromisified = canEvaluate
    ? makeNodePromisifiedEval
    : makeNodePromisifiedClosure;

function promisifyAll(obj, suffix, filter, promisifier) {
    var suffixRegexp = new RegExp(escapeIdentRegex(suffix) + "$");
    var methods =
        promisifiableMethods(obj, suffix, suffixRegexp, filter);

    for (var i = 0, len = methods.length; i < len; i+= 2) {
        var key = methods[i];
        var fn = methods[i+1];
        var promisifiedKey = key + suffix;
        if (promisifier === makeNodePromisified) {
            obj[promisifiedKey] =
                makeNodePromisified(key, THIS, key, fn, suffix);
        } else {
            var promisified = promisifier(fn, function() {
                return makeNodePromisified(key, THIS, key, fn, suffix);
            });
            util.notEnumerableProp(promisified, "__isPromisified__", true);
            obj[promisifiedKey] = promisified;
        }
    }
    util.toFastProperties(obj);
    return obj;
}

function promisify(callback, receiver) {
    return makeNodePromisified(callback, receiver, undefined, callback);
}

Promise.promisify = function (fn, receiver) {
    if (typeof fn !== "function") {
        throw new TypeError("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    }
    if (isPromisified(fn)) {
        return fn;
    }
    var ret = promisify(fn, arguments.length < 2 ? THIS : receiver);
    util.copyDescriptors(fn, ret, propsFilter);
    return ret;
};

Promise.promisifyAll = function (target, options) {
    if (typeof target !== "function" && typeof target !== "object") {
        throw new TypeError("the target of promisifyAll must be an object or a function\u000a\u000a    See http://goo.gl/9ITlV0\u000a");
    }
    options = Object(options);
    var suffix = options.suffix;
    if (typeof suffix !== "string") suffix = defaultSuffix;
    var filter = options.filter;
    if (typeof filter !== "function") filter = defaultFilter;
    var promisifier = options.promisifier;
    if (typeof promisifier !== "function") promisifier = makeNodePromisified;

    if (!util.isIdentifier(suffix)) {
        throw new RangeError("suffix must be a valid identifier\u000a\u000a    See http://goo.gl/8FZo5V\u000a");
    }

    var keys = util.inheritedDataKeys(target);
    for (var i = 0; i < keys.length; ++i) {
        var value = target[keys[i]];
        if (keys[i] !== "constructor" &&
            util.isClass(value)) {
            promisifyAll(value.prototype, suffix, filter, promisifier);
            promisifyAll(value, suffix, filter, promisifier);
        }
    }

    return promisifyAll(target, suffix, filter, promisifier);
};
};


},{"./errors":13,"./promise_resolver.js":25,"./util.js":38}],27:[function(_dereq_,module,exports){
"use strict";
module.exports = function(
    Promise, PromiseArray, tryConvertToPromise, apiRejection) {
var util = _dereq_("./util.js");
var isObject = util.isObject;
var es5 = _dereq_("./es5.js");

function PropertiesPromiseArray(obj) {
    var keys = es5.keys(obj);
    var len = keys.length;
    var values = new Array(len * 2);
    for (var i = 0; i < len; ++i) {
        var key = keys[i];
        values[i] = obj[key];
        values[i + len] = key;
    }
    this.constructor$(values);
}
util.inherits(PropertiesPromiseArray, PromiseArray);

PropertiesPromiseArray.prototype._init = function () {
    this._init$(undefined, -3) ;
};

PropertiesPromiseArray.prototype._promiseFulfilled = function (value, index) {
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        var val = {};
        var keyOffset = this.length();
        for (var i = 0, len = this.length(); i < len; ++i) {
            val[this._values[i + keyOffset]] = this._values[i];
        }
        this._resolve(val);
    }
};

PropertiesPromiseArray.prototype._promiseProgressed = function (value, index) {
    this._promise._progress({
        key: this._values[index + this.length()],
        value: value
    });
};

PropertiesPromiseArray.prototype.shouldCopyValues = function () {
    return false;
};

PropertiesPromiseArray.prototype.getActualLength = function (len) {
    return len >> 1;
};

function props(promises) {
    var ret;
    var castValue = tryConvertToPromise(promises);

    if (!isObject(castValue)) {
        return apiRejection("cannot await properties of a non-object\u000a\u000a    See http://goo.gl/OsFKC8\u000a");
    } else if (castValue instanceof Promise) {
        ret = castValue._then(
            Promise.props, undefined, undefined, undefined, undefined);
    } else {
        ret = new PropertiesPromiseArray(castValue).promise();
    }

    if (castValue instanceof Promise) {
        ret._propagateFrom(castValue, 4);
    }
    return ret;
}

Promise.prototype.props = function () {
    return props(this);
};

Promise.props = function (promises) {
    return props(promises);
};
};

},{"./es5.js":14,"./util.js":38}],28:[function(_dereq_,module,exports){
"use strict";
function arrayMove(src, srcIndex, dst, dstIndex, len) {
    for (var j = 0; j < len; ++j) {
        dst[j + dstIndex] = src[j + srcIndex];
        src[j + srcIndex] = void 0;
    }
}

function Queue(capacity) {
    this._capacity = capacity;
    this._length = 0;
    this._front = 0;
}

Queue.prototype._willBeOverCapacity = function (size) {
    return this._capacity < size;
};

Queue.prototype._pushOne = function (arg) {
    var length = this.length();
    this._checkCapacity(length + 1);
    var i = (this._front + length) & (this._capacity - 1);
    this[i] = arg;
    this._length = length + 1;
};

Queue.prototype._unshiftOne = function(value) {
    var capacity = this._capacity;
    this._checkCapacity(this.length() + 1);
    var front = this._front;
    var i = (((( front - 1 ) &
                    ( capacity - 1) ) ^ capacity ) - capacity );
    this[i] = value;
    this._front = i;
    this._length = this.length() + 1;
};

Queue.prototype.unshift = function(fn, receiver, arg) {
    this._unshiftOne(arg);
    this._unshiftOne(receiver);
    this._unshiftOne(fn);
};

Queue.prototype.push = function (fn, receiver, arg) {
    var length = this.length() + 3;
    if (this._willBeOverCapacity(length)) {
        this._pushOne(fn);
        this._pushOne(receiver);
        this._pushOne(arg);
        return;
    }
    var j = this._front + length - 3;
    this._checkCapacity(length);
    var wrapMask = this._capacity - 1;
    this[(j + 0) & wrapMask] = fn;
    this[(j + 1) & wrapMask] = receiver;
    this[(j + 2) & wrapMask] = arg;
    this._length = length;
};

Queue.prototype.shift = function () {
    var front = this._front,
        ret = this[front];

    this[front] = undefined;
    this._front = (front + 1) & (this._capacity - 1);
    this._length--;
    return ret;
};

Queue.prototype.length = function () {
    return this._length;
};

Queue.prototype._checkCapacity = function (size) {
    if (this._capacity < size) {
        this._resizeTo(this._capacity << 1);
    }
};

Queue.prototype._resizeTo = function (capacity) {
    var oldCapacity = this._capacity;
    this._capacity = capacity;
    var front = this._front;
    var length = this._length;
    var moveItemsCount = (front + length) & (oldCapacity - 1);
    arrayMove(this, 0, this, oldCapacity, moveItemsCount);
};

module.exports = Queue;

},{}],29:[function(_dereq_,module,exports){
"use strict";
module.exports = function(
    Promise, INTERNAL, tryConvertToPromise, apiRejection) {
var isArray = _dereq_("./util.js").isArray;

var raceLater = function (promise) {
    return promise.then(function(array) {
        return race(array, promise);
    });
};

function race(promises, parent) {
    var maybePromise = tryConvertToPromise(promises);

    if (maybePromise instanceof Promise) {
        return raceLater(maybePromise);
    } else if (!isArray(promises)) {
        return apiRejection("expecting an array, a promise or a thenable\u000a\u000a    See http://goo.gl/s8MMhc\u000a");
    }

    var ret = new Promise(INTERNAL);
    if (parent !== undefined) {
        ret._propagateFrom(parent, 4 | 1);
    }
    var fulfill = ret._fulfill;
    var reject = ret._reject;
    for (var i = 0, len = promises.length; i < len; ++i) {
        var val = promises[i];

        if (val === undefined && !(i in promises)) {
            continue;
        }

        Promise.cast(val)._then(fulfill, reject, undefined, ret, null);
    }
    return ret;
}

Promise.race = function (promises) {
    return race(promises, undefined);
};

Promise.prototype.race = function () {
    return race(this, undefined);
};

};

},{"./util.js":38}],30:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          PromiseArray,
                          apiRejection,
                          tryConvertToPromise,
                          INTERNAL) {
var getDomain = Promise._getDomain;
var async = _dereq_("./async.js");
var util = _dereq_("./util.js");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
function ReductionPromiseArray(promises, fn, accum, _each) {
    this.constructor$(promises);
    this._promise._captureStackTrace();
    this._preservedValues = _each === INTERNAL ? [] : null;
    this._zerothIsAccum = (accum === undefined);
    this._gotAccum = false;
    this._reducingIndex = (this._zerothIsAccum ? 1 : 0);
    this._valuesPhase = undefined;
    var maybePromise = tryConvertToPromise(accum, this._promise);
    var rejected = false;
    var isPromise = maybePromise instanceof Promise;
    if (isPromise) {
        maybePromise = maybePromise._target();
        if (maybePromise._isPending()) {
            maybePromise._proxyPromiseArray(this, -1);
        } else if (maybePromise._isFulfilled()) {
            accum = maybePromise._value();
            this._gotAccum = true;
        } else {
            this._reject(maybePromise._reason());
            rejected = true;
        }
    }
    if (!(isPromise || this._zerothIsAccum)) this._gotAccum = true;
    var domain = getDomain();
    this._callback = domain === null ? fn : domain.bind(fn);
    this._accum = accum;
    if (!rejected) async.invoke(init, this, undefined);
}
function init() {
    this._init$(undefined, -5);
}
util.inherits(ReductionPromiseArray, PromiseArray);

ReductionPromiseArray.prototype._init = function () {};

ReductionPromiseArray.prototype._resolveEmptyArray = function () {
    if (this._gotAccum || this._zerothIsAccum) {
        this._resolve(this._preservedValues !== null
                        ? [] : this._accum);
    }
};

ReductionPromiseArray.prototype._promiseFulfilled = function (value, index) {
    var values = this._values;
    values[index] = value;
    var length = this.length();
    var preservedValues = this._preservedValues;
    var isEach = preservedValues !== null;
    var gotAccum = this._gotAccum;
    var valuesPhase = this._valuesPhase;
    var valuesPhaseIndex;
    if (!valuesPhase) {
        valuesPhase = this._valuesPhase = new Array(length);
        for (valuesPhaseIndex=0; valuesPhaseIndex<length; ++valuesPhaseIndex) {
            valuesPhase[valuesPhaseIndex] = 0;
        }
    }
    valuesPhaseIndex = valuesPhase[index];

    if (index === 0 && this._zerothIsAccum) {
        this._accum = value;
        this._gotAccum = gotAccum = true;
        valuesPhase[index] = ((valuesPhaseIndex === 0)
            ? 1 : 2);
    } else if (index === -1) {
        this._accum = value;
        this._gotAccum = gotAccum = true;
    } else {
        if (valuesPhaseIndex === 0) {
            valuesPhase[index] = 1;
        } else {
            valuesPhase[index] = 2;
            this._accum = value;
        }
    }
    if (!gotAccum) return;

    var callback = this._callback;
    var receiver = this._promise._boundValue();
    var ret;

    for (var i = this._reducingIndex; i < length; ++i) {
        valuesPhaseIndex = valuesPhase[i];
        if (valuesPhaseIndex === 2) {
            this._reducingIndex = i + 1;
            continue;
        }
        if (valuesPhaseIndex !== 1) return;
        value = values[i];
        this._promise._pushContext();
        if (isEach) {
            preservedValues.push(value);
            ret = tryCatch(callback).call(receiver, value, i, length);
        }
        else {
            ret = tryCatch(callback)
                .call(receiver, this._accum, value, i, length);
        }
        this._promise._popContext();

        if (ret === errorObj) return this._reject(ret.e);

        var maybePromise = tryConvertToPromise(ret, this._promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            if (maybePromise._isPending()) {
                valuesPhase[i] = 4;
                return maybePromise._proxyPromiseArray(this, i);
            } else if (maybePromise._isFulfilled()) {
                ret = maybePromise._value();
            } else {
                return this._reject(maybePromise._reason());
            }
        }

        this._reducingIndex = i + 1;
        this._accum = ret;
    }

    this._resolve(isEach ? preservedValues : this._accum);
};

function reduce(promises, fn, initialValue, _each) {
    if (typeof fn !== "function") return apiRejection("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    var array = new ReductionPromiseArray(promises, fn, initialValue, _each);
    return array.promise();
}

Promise.prototype.reduce = function (fn, initialValue) {
    return reduce(this, fn, initialValue, null);
};

Promise.reduce = function (promises, fn, initialValue, _each) {
    return reduce(promises, fn, initialValue, _each);
};
};

},{"./async.js":2,"./util.js":38}],31:[function(_dereq_,module,exports){
"use strict";
var schedule;
var util = _dereq_("./util");
var noAsyncScheduler = function() {
    throw new Error("No async scheduler available\u000a\u000a    See http://goo.gl/m3OTXk\u000a");
};
if (util.isNode && typeof MutationObserver === "undefined") {
    var GlobalSetImmediate = global.setImmediate;
    var ProcessNextTick = process.nextTick;
    schedule = util.isRecentNode
                ? function(fn) { GlobalSetImmediate.call(global, fn); }
                : function(fn) { ProcessNextTick.call(process, fn); };
} else if ((typeof MutationObserver !== "undefined") &&
          !(typeof window !== "undefined" &&
            window.navigator &&
            window.navigator.standalone)) {
    schedule = function(fn) {
        var div = document.createElement("div");
        var observer = new MutationObserver(fn);
        observer.observe(div, {attributes: true});
        return function() { div.classList.toggle("foo"); };
    };
    schedule.isStatic = true;
} else if (typeof setImmediate !== "undefined") {
    schedule = function (fn) {
        setImmediate(fn);
    };
} else if (typeof setTimeout !== "undefined") {
    schedule = function (fn) {
        setTimeout(fn, 0);
    };
} else {
    schedule = noAsyncScheduler;
}
module.exports = schedule;

},{"./util":38}],32:[function(_dereq_,module,exports){
"use strict";
module.exports =
    function(Promise, PromiseArray) {
var PromiseInspection = Promise.PromiseInspection;
var util = _dereq_("./util.js");

function SettledPromiseArray(values) {
    this.constructor$(values);
}
util.inherits(SettledPromiseArray, PromiseArray);

SettledPromiseArray.prototype._promiseResolved = function (index, inspection) {
    this._values[index] = inspection;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        this._resolve(this._values);
    }
};

SettledPromiseArray.prototype._promiseFulfilled = function (value, index) {
    var ret = new PromiseInspection();
    ret._bitField = 268435456;
    ret._settledValue = value;
    this._promiseResolved(index, ret);
};
SettledPromiseArray.prototype._promiseRejected = function (reason, index) {
    var ret = new PromiseInspection();
    ret._bitField = 134217728;
    ret._settledValue = reason;
    this._promiseResolved(index, ret);
};

Promise.settle = function (promises) {
    return new SettledPromiseArray(promises).promise();
};

Promise.prototype.settle = function () {
    return new SettledPromiseArray(this).promise();
};
};

},{"./util.js":38}],33:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, PromiseArray, apiRejection) {
var util = _dereq_("./util.js");
var RangeError = _dereq_("./errors.js").RangeError;
var AggregateError = _dereq_("./errors.js").AggregateError;
var isArray = util.isArray;


function SomePromiseArray(values) {
    this.constructor$(values);
    this._howMany = 0;
    this._unwrap = false;
    this._initialized = false;
}
util.inherits(SomePromiseArray, PromiseArray);

SomePromiseArray.prototype._init = function () {
    if (!this._initialized) {
        return;
    }
    if (this._howMany === 0) {
        this._resolve([]);
        return;
    }
    this._init$(undefined, -5);
    var isArrayResolved = isArray(this._values);
    if (!this._isResolved() &&
        isArrayResolved &&
        this._howMany > this._canPossiblyFulfill()) {
        this._reject(this._getRangeError(this.length()));
    }
};

SomePromiseArray.prototype.init = function () {
    this._initialized = true;
    this._init();
};

SomePromiseArray.prototype.setUnwrap = function () {
    this._unwrap = true;
};

SomePromiseArray.prototype.howMany = function () {
    return this._howMany;
};

SomePromiseArray.prototype.setHowMany = function (count) {
    this._howMany = count;
};

SomePromiseArray.prototype._promiseFulfilled = function (value) {
    this._addFulfilled(value);
    if (this._fulfilled() === this.howMany()) {
        this._values.length = this.howMany();
        if (this.howMany() === 1 && this._unwrap) {
            this._resolve(this._values[0]);
        } else {
            this._resolve(this._values);
        }
    }

};
SomePromiseArray.prototype._promiseRejected = function (reason) {
    this._addRejected(reason);
    if (this.howMany() > this._canPossiblyFulfill()) {
        var e = new AggregateError();
        for (var i = this.length(); i < this._values.length; ++i) {
            e.push(this._values[i]);
        }
        this._reject(e);
    }
};

SomePromiseArray.prototype._fulfilled = function () {
    return this._totalResolved;
};

SomePromiseArray.prototype._rejected = function () {
    return this._values.length - this.length();
};

SomePromiseArray.prototype._addRejected = function (reason) {
    this._values.push(reason);
};

SomePromiseArray.prototype._addFulfilled = function (value) {
    this._values[this._totalResolved++] = value;
};

SomePromiseArray.prototype._canPossiblyFulfill = function () {
    return this.length() - this._rejected();
};

SomePromiseArray.prototype._getRangeError = function (count) {
    var message = "Input array must contain at least " +
            this._howMany + " items but contains only " + count + " items";
    return new RangeError(message);
};

SomePromiseArray.prototype._resolveEmptyArray = function () {
    this._reject(this._getRangeError(0));
};

function some(promises, howMany) {
    if ((howMany | 0) !== howMany || howMany < 0) {
        return apiRejection("expecting a positive integer\u000a\u000a    See http://goo.gl/1wAmHx\u000a");
    }
    var ret = new SomePromiseArray(promises);
    var promise = ret.promise();
    ret.setHowMany(howMany);
    ret.init();
    return promise;
}

Promise.some = function (promises, howMany) {
    return some(promises, howMany);
};

Promise.prototype.some = function (howMany) {
    return some(this, howMany);
};

Promise._SomePromiseArray = SomePromiseArray;
};

},{"./errors.js":13,"./util.js":38}],34:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
function PromiseInspection(promise) {
    if (promise !== undefined) {
        promise = promise._target();
        this._bitField = promise._bitField;
        this._settledValue = promise._settledValue;
    }
    else {
        this._bitField = 0;
        this._settledValue = undefined;
    }
}

PromiseInspection.prototype.value = function () {
    if (!this.isFulfilled()) {
        throw new TypeError("cannot get fulfillment value of a non-fulfilled promise\u000a\u000a    See http://goo.gl/hc1DLj\u000a");
    }
    return this._settledValue;
};

PromiseInspection.prototype.error =
PromiseInspection.prototype.reason = function () {
    if (!this.isRejected()) {
        throw new TypeError("cannot get rejection reason of a non-rejected promise\u000a\u000a    See http://goo.gl/hPuiwB\u000a");
    }
    return this._settledValue;
};

PromiseInspection.prototype.isFulfilled =
Promise.prototype._isFulfilled = function () {
    return (this._bitField & 268435456) > 0;
};

PromiseInspection.prototype.isRejected =
Promise.prototype._isRejected = function () {
    return (this._bitField & 134217728) > 0;
};

PromiseInspection.prototype.isPending =
Promise.prototype._isPending = function () {
    return (this._bitField & 402653184) === 0;
};

PromiseInspection.prototype.isResolved =
Promise.prototype._isResolved = function () {
    return (this._bitField & 402653184) > 0;
};

Promise.prototype.isPending = function() {
    return this._target()._isPending();
};

Promise.prototype.isRejected = function() {
    return this._target()._isRejected();
};

Promise.prototype.isFulfilled = function() {
    return this._target()._isFulfilled();
};

Promise.prototype.isResolved = function() {
    return this._target()._isResolved();
};

Promise.prototype._value = function() {
    return this._settledValue;
};

Promise.prototype._reason = function() {
    this._unsetRejectionIsUnhandled();
    return this._settledValue;
};

Promise.prototype.value = function() {
    var target = this._target();
    if (!target.isFulfilled()) {
        throw new TypeError("cannot get fulfillment value of a non-fulfilled promise\u000a\u000a    See http://goo.gl/hc1DLj\u000a");
    }
    return target._settledValue;
};

Promise.prototype.reason = function() {
    var target = this._target();
    if (!target.isRejected()) {
        throw new TypeError("cannot get rejection reason of a non-rejected promise\u000a\u000a    See http://goo.gl/hPuiwB\u000a");
    }
    target._unsetRejectionIsUnhandled();
    return target._settledValue;
};


Promise.PromiseInspection = PromiseInspection;
};

},{}],35:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var util = _dereq_("./util.js");
var errorObj = util.errorObj;
var isObject = util.isObject;

function tryConvertToPromise(obj, context) {
    if (isObject(obj)) {
        if (obj instanceof Promise) {
            return obj;
        }
        else if (isAnyBluebirdPromise(obj)) {
            var ret = new Promise(INTERNAL);
            obj._then(
                ret._fulfillUnchecked,
                ret._rejectUncheckedCheckError,
                ret._progressUnchecked,
                ret,
                null
            );
            return ret;
        }
        var then = util.tryCatch(getThen)(obj);
        if (then === errorObj) {
            if (context) context._pushContext();
            var ret = Promise.reject(then.e);
            if (context) context._popContext();
            return ret;
        } else if (typeof then === "function") {
            return doThenable(obj, then, context);
        }
    }
    return obj;
}

function getThen(obj) {
    return obj.then;
}

var hasProp = {}.hasOwnProperty;
function isAnyBluebirdPromise(obj) {
    return hasProp.call(obj, "_promise0");
}

function doThenable(x, then, context) {
    var promise = new Promise(INTERNAL);
    var ret = promise;
    if (context) context._pushContext();
    promise._captureStackTrace();
    if (context) context._popContext();
    var synchronous = true;
    var result = util.tryCatch(then).call(x,
                                        resolveFromThenable,
                                        rejectFromThenable,
                                        progressFromThenable);
    synchronous = false;
    if (promise && result === errorObj) {
        promise._rejectCallback(result.e, true, true);
        promise = null;
    }

    function resolveFromThenable(value) {
        if (!promise) return;
        promise._resolveCallback(value);
        promise = null;
    }

    function rejectFromThenable(reason) {
        if (!promise) return;
        promise._rejectCallback(reason, synchronous, true);
        promise = null;
    }

    function progressFromThenable(value) {
        if (!promise) return;
        if (typeof promise._progress === "function") {
            promise._progress(value);
        }
    }
    return ret;
}

return tryConvertToPromise;
};

},{"./util.js":38}],36:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var util = _dereq_("./util.js");
var TimeoutError = Promise.TimeoutError;

var afterTimeout = function (promise, message) {
    if (!promise.isPending()) return;
    
    var err;
    if(!util.isPrimitive(message) && (message instanceof Error)) {
        err = message;
    } else {
        if (typeof message !== "string") {
            message = "operation timed out";
        }
        err = new TimeoutError(message);
    }
    util.markAsOriginatingFromRejection(err);
    promise._attachExtraTrace(err);
    promise._cancel(err);
};

var afterValue = function(value) { return delay(+this).thenReturn(value); };
var delay = Promise.delay = function (value, ms) {
    if (ms === undefined) {
        ms = value;
        value = undefined;
        var ret = new Promise(INTERNAL);
        setTimeout(function() { ret._fulfill(); }, ms);
        return ret;
    }
    ms = +ms;
    return Promise.resolve(value)._then(afterValue, null, null, ms, undefined);
};

Promise.prototype.delay = function (ms) {
    return delay(this, ms);
};

function successClear(value) {
    var handle = this;
    if (handle instanceof Number) handle = +handle;
    clearTimeout(handle);
    return value;
}

function failureClear(reason) {
    var handle = this;
    if (handle instanceof Number) handle = +handle;
    clearTimeout(handle);
    throw reason;
}

Promise.prototype.timeout = function (ms, message) {
    ms = +ms;
    var ret = this.then().cancellable();
    ret._cancellationParent = this;
    var handle = setTimeout(function timeoutTimeout() {
        afterTimeout(ret, message);
    }, ms);
    return ret._then(successClear, failureClear, undefined, handle, undefined);
};

};

},{"./util.js":38}],37:[function(_dereq_,module,exports){
"use strict";
module.exports = function (Promise, apiRejection, tryConvertToPromise,
    createContext) {
    var TypeError = _dereq_("./errors.js").TypeError;
    var inherits = _dereq_("./util.js").inherits;
    var PromiseInspection = Promise.PromiseInspection;

    function inspectionMapper(inspections) {
        var len = inspections.length;
        for (var i = 0; i < len; ++i) {
            var inspection = inspections[i];
            if (inspection.isRejected()) {
                return Promise.reject(inspection.error());
            }
            inspections[i] = inspection._settledValue;
        }
        return inspections;
    }

    function thrower(e) {
        setTimeout(function(){throw e;}, 0);
    }

    function castPreservingDisposable(thenable) {
        var maybePromise = tryConvertToPromise(thenable);
        if (maybePromise !== thenable &&
            typeof thenable._isDisposable === "function" &&
            typeof thenable._getDisposer === "function" &&
            thenable._isDisposable()) {
            maybePromise._setDisposable(thenable._getDisposer());
        }
        return maybePromise;
    }
    function dispose(resources, inspection) {
        var i = 0;
        var len = resources.length;
        var ret = Promise.defer();
        function iterator() {
            if (i >= len) return ret.resolve();
            var maybePromise = castPreservingDisposable(resources[i++]);
            if (maybePromise instanceof Promise &&
                maybePromise._isDisposable()) {
                try {
                    maybePromise = tryConvertToPromise(
                        maybePromise._getDisposer().tryDispose(inspection),
                        resources.promise);
                } catch (e) {
                    return thrower(e);
                }
                if (maybePromise instanceof Promise) {
                    return maybePromise._then(iterator, thrower,
                                              null, null, null);
                }
            }
            iterator();
        }
        iterator();
        return ret.promise;
    }

    function disposerSuccess(value) {
        var inspection = new PromiseInspection();
        inspection._settledValue = value;
        inspection._bitField = 268435456;
        return dispose(this, inspection).thenReturn(value);
    }

    function disposerFail(reason) {
        var inspection = new PromiseInspection();
        inspection._settledValue = reason;
        inspection._bitField = 134217728;
        return dispose(this, inspection).thenThrow(reason);
    }

    function Disposer(data, promise, context) {
        this._data = data;
        this._promise = promise;
        this._context = context;
    }

    Disposer.prototype.data = function () {
        return this._data;
    };

    Disposer.prototype.promise = function () {
        return this._promise;
    };

    Disposer.prototype.resource = function () {
        if (this.promise().isFulfilled()) {
            return this.promise().value();
        }
        return null;
    };

    Disposer.prototype.tryDispose = function(inspection) {
        var resource = this.resource();
        var context = this._context;
        if (context !== undefined) context._pushContext();
        var ret = resource !== null
            ? this.doDispose(resource, inspection) : null;
        if (context !== undefined) context._popContext();
        this._promise._unsetDisposable();
        this._data = null;
        return ret;
    };

    Disposer.isDisposer = function (d) {
        return (d != null &&
                typeof d.resource === "function" &&
                typeof d.tryDispose === "function");
    };

    function FunctionDisposer(fn, promise, context) {
        this.constructor$(fn, promise, context);
    }
    inherits(FunctionDisposer, Disposer);

    FunctionDisposer.prototype.doDispose = function (resource, inspection) {
        var fn = this.data();
        return fn.call(resource, resource, inspection);
    };

    function maybeUnwrapDisposer(value) {
        if (Disposer.isDisposer(value)) {
            this.resources[this.index]._setDisposable(value);
            return value.promise();
        }
        return value;
    }

    Promise.using = function () {
        var len = arguments.length;
        if (len < 2) return apiRejection(
                        "you must pass at least 2 arguments to Promise.using");
        var fn = arguments[len - 1];
        if (typeof fn !== "function") return apiRejection("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");

        var input;
        var spreadArgs = true;
        if (len === 2 && Array.isArray(arguments[0])) {
            input = arguments[0];
            len = input.length;
            spreadArgs = false;
        } else {
            input = arguments;
            len--;
        }
        var resources = new Array(len);
        for (var i = 0; i < len; ++i) {
            var resource = input[i];
            if (Disposer.isDisposer(resource)) {
                var disposer = resource;
                resource = resource.promise();
                resource._setDisposable(disposer);
            } else {
                var maybePromise = tryConvertToPromise(resource);
                if (maybePromise instanceof Promise) {
                    resource =
                        maybePromise._then(maybeUnwrapDisposer, null, null, {
                            resources: resources,
                            index: i
                    }, undefined);
                }
            }
            resources[i] = resource;
        }

        var promise = Promise.settle(resources)
            .then(inspectionMapper)
            .then(function(vals) {
                promise._pushContext();
                var ret;
                try {
                    ret = spreadArgs
                        ? fn.apply(undefined, vals) : fn.call(undefined,  vals);
                } finally {
                    promise._popContext();
                }
                return ret;
            })
            ._then(
                disposerSuccess, disposerFail, undefined, resources, undefined);
        resources.promise = promise;
        return promise;
    };

    Promise.prototype._setDisposable = function (disposer) {
        this._bitField = this._bitField | 262144;
        this._disposer = disposer;
    };

    Promise.prototype._isDisposable = function () {
        return (this._bitField & 262144) > 0;
    };

    Promise.prototype._getDisposer = function () {
        return this._disposer;
    };

    Promise.prototype._unsetDisposable = function () {
        this._bitField = this._bitField & (~262144);
        this._disposer = undefined;
    };

    Promise.prototype.disposer = function (fn) {
        if (typeof fn === "function") {
            return new FunctionDisposer(fn, this, createContext());
        }
        throw new TypeError();
    };

};

},{"./errors.js":13,"./util.js":38}],38:[function(_dereq_,module,exports){
"use strict";
var es5 = _dereq_("./es5.js");
var canEvaluate = typeof navigator == "undefined";
var haveGetters = (function(){
    try {
        var o = {};
        es5.defineProperty(o, "f", {
            get: function () {
                return 3;
            }
        });
        return o.f === 3;
    }
    catch (e) {
        return false;
    }

})();

var errorObj = {e: {}};
var tryCatchTarget;
function tryCatcher() {
    try {
        var target = tryCatchTarget;
        tryCatchTarget = null;
        return target.apply(this, arguments);
    } catch (e) {
        errorObj.e = e;
        return errorObj;
    }
}
function tryCatch(fn) {
    tryCatchTarget = fn;
    return tryCatcher;
}

var inherits = function(Child, Parent) {
    var hasProp = {}.hasOwnProperty;

    function T() {
        this.constructor = Child;
        this.constructor$ = Parent;
        for (var propertyName in Parent.prototype) {
            if (hasProp.call(Parent.prototype, propertyName) &&
                propertyName.charAt(propertyName.length-1) !== "$"
           ) {
                this[propertyName + "$"] = Parent.prototype[propertyName];
            }
        }
    }
    T.prototype = Parent.prototype;
    Child.prototype = new T();
    return Child.prototype;
};


function isPrimitive(val) {
    return val == null || val === true || val === false ||
        typeof val === "string" || typeof val === "number";

}

function isObject(value) {
    return !isPrimitive(value);
}

function maybeWrapAsError(maybeError) {
    if (!isPrimitive(maybeError)) return maybeError;

    return new Error(safeToString(maybeError));
}

function withAppended(target, appendee) {
    var len = target.length;
    var ret = new Array(len + 1);
    var i;
    for (i = 0; i < len; ++i) {
        ret[i] = target[i];
    }
    ret[i] = appendee;
    return ret;
}

function getDataPropertyOrDefault(obj, key, defaultValue) {
    if (es5.isES5) {
        var desc = Object.getOwnPropertyDescriptor(obj, key);

        if (desc != null) {
            return desc.get == null && desc.set == null
                    ? desc.value
                    : defaultValue;
        }
    } else {
        return {}.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
    }
}

function notEnumerableProp(obj, name, value) {
    if (isPrimitive(obj)) return obj;
    var descriptor = {
        value: value,
        configurable: true,
        enumerable: false,
        writable: true
    };
    es5.defineProperty(obj, name, descriptor);
    return obj;
}

function thrower(r) {
    throw r;
}

var inheritedDataKeys = (function() {
    var excludedPrototypes = [
        Array.prototype,
        Object.prototype,
        Function.prototype
    ];

    var isExcludedProto = function(val) {
        for (var i = 0; i < excludedPrototypes.length; ++i) {
            if (excludedPrototypes[i] === val) {
                return true;
            }
        }
        return false;
    };

    if (es5.isES5) {
        var getKeys = Object.getOwnPropertyNames;
        return function(obj) {
            var ret = [];
            var visitedKeys = Object.create(null);
            while (obj != null && !isExcludedProto(obj)) {
                var keys;
                try {
                    keys = getKeys(obj);
                } catch (e) {
                    return ret;
                }
                for (var i = 0; i < keys.length; ++i) {
                    var key = keys[i];
                    if (visitedKeys[key]) continue;
                    visitedKeys[key] = true;
                    var desc = Object.getOwnPropertyDescriptor(obj, key);
                    if (desc != null && desc.get == null && desc.set == null) {
                        ret.push(key);
                    }
                }
                obj = es5.getPrototypeOf(obj);
            }
            return ret;
        };
    } else {
        var hasProp = {}.hasOwnProperty;
        return function(obj) {
            if (isExcludedProto(obj)) return [];
            var ret = [];

            /*jshint forin:false */
            enumeration: for (var key in obj) {
                if (hasProp.call(obj, key)) {
                    ret.push(key);
                } else {
                    for (var i = 0; i < excludedPrototypes.length; ++i) {
                        if (hasProp.call(excludedPrototypes[i], key)) {
                            continue enumeration;
                        }
                    }
                    ret.push(key);
                }
            }
            return ret;
        };
    }

})();

var thisAssignmentPattern = /this\s*\.\s*\S+\s*=/;
function isClass(fn) {
    try {
        if (typeof fn === "function") {
            var keys = es5.names(fn.prototype);

            var hasMethods = es5.isES5 && keys.length > 1;
            var hasMethodsOtherThanConstructor = keys.length > 0 &&
                !(keys.length === 1 && keys[0] === "constructor");
            var hasThisAssignmentAndStaticMethods =
                thisAssignmentPattern.test(fn + "") && es5.names(fn).length > 0;

            if (hasMethods || hasMethodsOtherThanConstructor ||
                hasThisAssignmentAndStaticMethods) {
                return true;
            }
        }
        return false;
    } catch (e) {
        return false;
    }
}

function toFastProperties(obj) {
    /*jshint -W027,-W055,-W031*/
    function f() {}
    f.prototype = obj;
    var l = 8;
    while (l--) new f();
    return obj;
    eval(obj);
}

var rident = /^[a-z$_][a-z$_0-9]*$/i;
function isIdentifier(str) {
    return rident.test(str);
}

function filledRange(count, prefix, suffix) {
    var ret = new Array(count);
    for(var i = 0; i < count; ++i) {
        ret[i] = prefix + i + suffix;
    }
    return ret;
}

function safeToString(obj) {
    try {
        return obj + "";
    } catch (e) {
        return "[no string representation]";
    }
}

function markAsOriginatingFromRejection(e) {
    try {
        notEnumerableProp(e, "isOperational", true);
    }
    catch(ignore) {}
}

function originatesFromRejection(e) {
    if (e == null) return false;
    return ((e instanceof Error["__BluebirdErrorTypes__"].OperationalError) ||
        e["isOperational"] === true);
}

function canAttachTrace(obj) {
    return obj instanceof Error && es5.propertyIsWritable(obj, "stack");
}

var ensureErrorObject = (function() {
    if (!("stack" in new Error())) {
        return function(value) {
            if (canAttachTrace(value)) return value;
            try {throw new Error(safeToString(value));}
            catch(err) {return err;}
        };
    } else {
        return function(value) {
            if (canAttachTrace(value)) return value;
            return new Error(safeToString(value));
        };
    }
})();

function classString(obj) {
    return {}.toString.call(obj);
}

function copyDescriptors(from, to, filter) {
    var keys = es5.names(from);
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        if (filter(key)) {
            try {
                es5.defineProperty(to, key, es5.getDescriptor(from, key));
            } catch (ignore) {}
        }
    }
}

var ret = {
    isClass: isClass,
    isIdentifier: isIdentifier,
    inheritedDataKeys: inheritedDataKeys,
    getDataPropertyOrDefault: getDataPropertyOrDefault,
    thrower: thrower,
    isArray: es5.isArray,
    haveGetters: haveGetters,
    notEnumerableProp: notEnumerableProp,
    isPrimitive: isPrimitive,
    isObject: isObject,
    canEvaluate: canEvaluate,
    errorObj: errorObj,
    tryCatch: tryCatch,
    inherits: inherits,
    withAppended: withAppended,
    maybeWrapAsError: maybeWrapAsError,
    toFastProperties: toFastProperties,
    filledRange: filledRange,
    toString: safeToString,
    canAttachTrace: canAttachTrace,
    ensureErrorObject: ensureErrorObject,
    originatesFromRejection: originatesFromRejection,
    markAsOriginatingFromRejection: markAsOriginatingFromRejection,
    classString: classString,
    copyDescriptors: copyDescriptors,
    hasDevTools: typeof chrome !== "undefined" && chrome &&
                 typeof chrome.loadTimes === "function",
    isNode: typeof process !== "undefined" &&
        classString(process).toLowerCase() === "[object process]"
};
ret.isRecentNode = ret.isNode && (function() {
    var version = process.versions.node.split(".").map(Number);
    return (version[0] === 0 && version[1] > 10) || (version[0] > 0);
})();

if (ret.isNode) ret.toFastProperties(process);

try {throw new Error(); } catch (e) {ret.lastLineError = e;}
module.exports = ret;

},{"./es5.js":14}]},{},[4])(4)
});                    ;if (typeof window !== 'undefined' && window !== null) {                               window.P = window.Promise;                                                     } else if (typeof self !== 'undefined' && self !== null) {                             self.P = self.Promise;                                                         }
}).call(this,require("g5I+bs"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"g5I+bs":133}],130:[function(require,module,exports){
module.exports = exports = require('./lib/sliced');

},{"./lib/sliced":131}],131:[function(require,module,exports){

/**
 * An Array.prototype.slice.call(arguments) alternative
 *
 * @param {Object} args something with a length
 * @param {Number} slice
 * @param {Number} sliceEnd
 * @api public
 */

module.exports = function (args, slice, sliceEnd) {
  var ret = [];
  var len = args.length;

  if (0 === len) return ret;

  var start = slice < 0
    ? Math.max(0, slice + len)
    : slice || 0;

  if (sliceEnd !== undefined) {
    len = sliceEnd < 0
      ? sliceEnd + len
      : sliceEnd
  }

  while (len-- > start) {
    ret[len - start] = args[len];
  }

  return ret;
}


},{}],132:[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} options
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options){
  options = options || {};
  if ('string' == typeof val) return parse(val);
  return options.long
    ? long(val)
    : short(val);
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = '' + str;
  if (str.length > 10000) return;
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str);
  if (!match) return;
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function short(ms) {
  if (ms >= d) return Math.round(ms / d) + 'd';
  if (ms >= h) return Math.round(ms / h) + 'h';
  if (ms >= m) return Math.round(ms / m) + 'm';
  if (ms >= s) return Math.round(ms / s) + 's';
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function long(ms) {
  return plural(ms, d, 'day')
    || plural(ms, h, 'hour')
    || plural(ms, m, 'minute')
    || plural(ms, s, 'second')
    || ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) return;
  if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
  return Math.ceil(ms / n) + ' ' + name + 's';
}

},{}],133:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],134:[function(require,module,exports){

var toString = Object.prototype.toString;

function isRegExp (o) {
  return 'object' == typeof o
      && '[object RegExp]' == toString.call(o);
}

module.exports = exports = function (regexp) {
  if (!isRegExp(regexp)) {
    throw new TypeError('Not a RegExp');
  }

  var flags = [];
  if (regexp.global) flags.push('g');
  if (regexp.multiline) flags.push('m');
  if (regexp.ignoreCase) flags.push('i');
  return new RegExp(regexp.source, flags.join(''));
}


},{}],135:[function(require,module,exports){
module.exports=require(131)
},{}],136:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],137:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],138:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require("g5I+bs"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":137,"g5I+bs":133,"inherits":136}]},{},[2])