/*!
 * Module dependencies.
 */

var SchemaType = require('../schematype'),
    CastError = SchemaType.CastError,
    Types = {
      Boolean: require('./boolean'),
      Date: require('./date'),
      Number: require('./number'),
      String: require('./string'),
      ObjectId: require('./objectid'),
      Buffer: require('./buffer')
    },
    MongooseArray = require('../types').Array,
    EmbeddedDoc = require('../types').Embedded,
    Mixed = require('./mixed'),
    cast = require('../cast'),
    utils = require('../utils'),
    isMongooseObject = utils.isMongooseObject;

/**
 * Array SchemaType constructor
 *
 * @param {String} key
 * @param {SchemaType} cast
 * @param {Object} options
 * @inherits SchemaType
 * @api public
 */

function SchemaArray(key, cast, options) {
  if (cast) {
    var castOptions = {};

    if (utils.getFunctionName(cast.constructor) === 'Object') {
      if (cast.type) {
        // support { type: Woot }
        castOptions = utils.clone(cast); // do not alter user arguments
        delete castOptions.type;
        cast = cast.type;
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
    this.caster = new caster(null, castOptions);
    if (!(this.caster instanceof EmbeddedDoc)) {
      this.caster.path = key;
    }
  }

  SchemaType.call(this, key, options, 'Array');

  var _this = this,
      defaultArr,
      fn;

  if (this.defaultValue) {
    defaultArr = this.defaultValue;
    fn = typeof defaultArr === 'function';
  }

  this.default(function() {
    var arr = fn ? defaultArr() : defaultArr || [];
    return new MongooseArray(arr, _this.path, this);
  });
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
 * Check required
 *
 * @param {Array} value
 * @api private
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
    }

    if (this.caster) {
      try {
        for (i = 0, l = value.length; i < l; i++) {
          value[i] = this.caster.cast(value[i], doc, init);
        }
      } catch (e) {
        // rethrow
        throw new CastError(e.type, value, this.path);
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
    var method = proto.castForQuery || proto.cast;
    var caster = this.caster;

    if (Array.isArray(val)) {
      val = val.map(function(v) {
        if (utils.isObject(v) && v.$elemMatch) {
          return v;
        }
        if (method) {
          v = method.call(caster, v);
        }
        return isMongooseObject(v) ?
            v.toObject({virtuals: false}) :
            v;
      });
    } else if (method) {
      val = method.call(caster, val);
    }
  }

  return val && isMongooseObject(val) ?
      val.toObject({virtuals: false}) :
      val;
};

/*!
 * @ignore
 *
 * $atomic cast helpers
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

function cast$near(val) {
  if (Array.isArray(val)) {
    castArraysOfNumbers(val, this);
    return val;
  }

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

  if (val.$maxDistance) {
    val.$maxDistance = castToNumber.call(self, val.$maxDistance);
  }

  return val;
}

function cast$within(val) {
  var _this = this;

  if (val.$maxDistance) {
    val.$maxDistance = castToNumber.call(_this, val.$maxDistance);
  }

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

function cast$geoIntersects(val) {
  var geo = val.$geometry;
  if (!geo) {
    return;
  }

  cast$geometry(val, this);
  return val;
}

var handle = SchemaArray.prototype.$conditionalHandlers = {};

handle.$all = cast$all;
handle.$options = String;
handle.$elemMatch = cast$elemMatch;
handle.$geoIntersects = cast$geoIntersects;
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
handle.$nearSphere = cast$near;

handle.$within =
handle.$geoWithin = cast$within;

handle.$size =
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
