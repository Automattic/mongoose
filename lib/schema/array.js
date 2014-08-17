/*!
 * Module dependencies.
 */

var SchemaType = require('../schematype')
  , CastError = SchemaType.CastError
  , NumberSchema = require('./number')
  , Types = {
        Boolean: require('./boolean')
      , Date: require('./date')
      , Number: require('./number')
      , String: require('./string')
      , ObjectId: require('./objectid')
      , Buffer: require('./buffer')
    }
  , MongooseArray = require('../types').Array
  , EmbeddedDoc = require('../types').Embedded
  , Mixed = require('./mixed')
  , Query = require('../query')
  , utils = require('../utils')
  , isMongooseObject = utils.isMongooseObject

/**
 * Array SchemaType constructor
 *
 * @param {String} key
 * @param {SchemaType} cast
 * @param {Object} options
 * @inherits SchemaType
 * @api private
 */

function SchemaArray (key, cast, options) {
  if (cast) {
    var castOptions = {};

    if ('Object' === cast.constructor.name) {
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
    var name = 'string' == typeof cast
      ? cast
      : cast.name;

    var caster = name in Types
      ? Types[name]
      : cast;

    this.casterConstructor = caster;
    this.caster = new caster(null, castOptions);
    if (!(this.caster instanceof EmbeddedDoc)) {
      this.caster.path = key;
    }
  }

  SchemaType.call(this, key, options);

  var self = this
    , defaultArr
    , fn;

  if (this.defaultValue) {
    defaultArr = this.defaultValue;
    fn = 'function' == typeof defaultArr;
  }

  this.default(function(){
    var arr = fn ? defaultArr() : defaultArr || [];
    return new MongooseArray(arr, self.path, this);
  });
};

/*!
 * Inherits from SchemaType.
 */

SchemaArray.prototype.__proto__ = SchemaType.prototype;

/**
 * Check required
 *
 * @param {Array} value
 * @api private
 */

SchemaArray.prototype.checkRequired = function (value) {
  return !!(value && value.length);
};

/**
 * Overrides the getters application for the population special-case
 *
 * @param {Object} value
 * @param {Object} scope
 * @api private
 */

SchemaArray.prototype.applyGetters = function (value, scope) {
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

SchemaArray.prototype.cast = function (value, doc, init) {
  if (Array.isArray(value)) {

    if (!value.length && doc) {
      var indexes = doc.schema.indexedPaths();

      for (var i = 0, l = indexes.length; i < l; ++i) {
        var pathIndex = indexes[i][0][this.path];
        if ('2dsphere' === pathIndex || '2d' === pathIndex) {
          return;
        }
      }
    }

    if (!(value instanceof MongooseArray)) {
      value = new MongooseArray(value, this.path, doc);
    }

    if (this.caster) {
      try {
        for (var i = 0, l = value.length; i < l; i++) {
          value[i] = this.caster.cast(value[i], doc, init);
        }
      } catch (e) {
        // rethrow
        throw new CastError(e.type, value, this.path);
      }
    }

    return value;
  } else {
    return this.cast([value], doc, init);
  }
};

/**
 * Casts values for queries.
 *
 * @param {String} $conditional
 * @param {any} [value]
 * @api private
 */

SchemaArray.prototype.castForQuery = function ($conditional, value) {
  var handler
    , val;

  if (arguments.length === 2) {
    handler = this.$conditionalHandlers[$conditional];

    if (!handler) {
      throw new Error("Can't use " + $conditional + " with Array.");
    }

    val = handler.call(this, value);

  } else {

    val = $conditional;
    var proto = this.casterConstructor.prototype;
    var method = proto.castForQuery || proto.cast;
    var caster = this.caster;

    if (Array.isArray(val)) {
      val = val.map(function (v) {
        if (method) v = method.call(caster, v);
        return isMongooseObject(v)
          ? v.toObject()
          : v;
      });

    } else if (method) {
      val = method.call(caster, val);
    }
  }

  return val && isMongooseObject(val)
    ? val.toObject()
    : val;
};

/*!
 * @ignore
 *
 * $atomic cast helpers
 */

function castToNumber (val) {
  return Types.Number.prototype.cast.call(this, val);
}

function castArraysOfNumbers (arr, self) {
  self || (self = this);

  arr.forEach(function (v, i) {
    if (Array.isArray(v)) {
      castArraysOfNumbers(v, self);
    } else {
      arr[i] = castToNumber.call(self, v);
    }
  });
}

function cast$near (val) {
  if (Array.isArray(val)) {
    castArraysOfNumbers(val, this);
    return val;
  }

  if (val && val.$geometry) {
    return cast$geometry(val, this);
  }

  return SchemaArray.prototype.castForQuery.call(this, val);
}

function cast$geometry (val, self) {
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

function cast$within (val) {
  var self = this;

  if (val.$maxDistance) {
    val.$maxDistance = castToNumber.call(self, val.$maxDistance);
  }

  if (val.$box || val.$polygon) {
    var type = val.$box ? '$box' : '$polygon';
    val[type].forEach(function (arr) {
      if (!Array.isArray(arr)) {
        var msg = 'Invalid $within $box argument. '
                + 'Expected an array, received ' + arr;
        throw new TypeError(msg);
      }
      arr.forEach(function (v, i) {
        arr[i] = castToNumber.call(this, v);
      });
    })
  } else if (val.$center || val.$centerSphere) {
    var type = val.$center ? '$center' : '$centerSphere';
    val[type].forEach(function (item, i) {
      if (Array.isArray(item)) {
        item.forEach(function (v, j) {
          item[j] = castToNumber.call(this, v);
        });
      } else {
        val[type][i] = castToNumber.call(this, item);
      }
    })
  } else if (val.$geometry) {
    cast$geometry(val, this);
  }

  return val;
}

function cast$all (val) {
  if (!Array.isArray(val)) {
    val = [val];
  }

  val = val.map(function (v) {
    if (utils.isObject(v)) {
      var o = {};
      o[this.path] = v;
      var query = new Query(o);
      query.cast(this.casterConstructor);
      return query._conditions[this.path];
    }
    return v;
  }, this);

  return this.castForQuery(val);
}

function cast$elemMatch (val) {
  if (val.$in) {
    val.$in = this.castForQuery('$in', val.$in);
    return val;
  }

  var query = new Query(val);
  query.cast(this.casterConstructor);
  return query._conditions;
}

function cast$geoIntersects (val) {
  var geo = val.$geometry;
  if (!geo) return;

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
    var query = new Query(val[i]);
    query.cast(this.casterConstructor);
    ret.push(query._conditions);
  }

  return ret;
};

handle.$near =
handle.$nearSphere = cast$near;

handle.$within =
handle.$geoWithin = cast$within;

handle.$size =
handle.$maxDistance = castToNumber;

handle.$regex =
handle.$ne =
handle.$in =
handle.$nin =
handle.$gt =
handle.$gte =
handle.$lt =
handle.$lte = SchemaArray.prototype.castForQuery;

/*!
 * Module exports.
 */

module.exports = SchemaArray;
