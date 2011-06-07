/**
 * Module dependencies.
 */

var SchemaType = require('../schematype')
  , CastError = SchemaType.CastError
  , ArrayNumberSchema = function () {}
  , Types = {
        Boolean: require('./boolean')
      , Date: require('./date')
      , Number: ArrayNumberSchema
      , String: require('./string')
      , ObjectId: require('./objectid')
    }
  , MongooseArray = require('../types').Array
  , Query = require('../query');

/**
 * Array SchemaType constructor
 *
 * @param {String} key
 * @param {SchemaType} cast
 * @api private
 */

function SchemaArray (key, cast, options) {
  SchemaType.call(this, key, options);

  if (cast) {
    this.caster = cast.name in Types ? Types[cast.name] : cast;
  }

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

/**
 * Inherits from SchemaType.
 */

SchemaArray.prototype.__proto__ = SchemaType.prototype;

/**
 * Check required
 *
 * @api private
 */

SchemaArray.prototype.checkRequired = function (value) {
  return !!(value && value.length);
};

/**
 * Casts contents
 *
 * @param {Object} value
 * @param {Document} document that triggers the casting
 * @api private
 */

SchemaArray.prototype.cast = function (value, doc) {
  if (Array.isArray(value)) {
    if (!(value instanceof MongooseArray)) {
      value = new MongooseArray(value, this.path, doc);
    }

    var caster = this.caster;

    if (caster) {
      for (var i = 0, l = value.length; i < l; i++) {
        try {
          value[i] = caster.prototype.cast.call(null, value[i]);
        } catch(e){
          // rethrow
          throw new CastError(e.type, value);
        }
      }
    }

    return value;
  } else {
    return this.cast([value], doc);
  }

  throw new CastError('array', value, caster);
};

SchemaArray.prototype.$conditionalHandlers = {
    '$all': function (val) {
      return this.cast(val);
    }

    // TODO Move elemMatch to documentarray
  , '$elemMatch': function (val) {
      var query = new Query(val);
      query.cast(this.caster)
      return query._conditions;
    }
  , '$size': function (val) {
      return ArrayNumberSchema.prototype.cast.call(this, val);
    }
  , '$ne': function (val) {
      if (Array.isArray(val)) {
        return this.cast(val);
      } else {
        var proto = this.caster.prototype;
        var method = proto.castForQuery || proto.cast;
        if (method) return method.call(proto, val);
        return val.toObject ? val.toObject() : val;
      }
    }
  , '$in': function (val) {
      return this.cast(val);
    }
  , '$nin': function (val) {
      return this.cast(val);
    }
  , '$near': function (val) {
      return this.cast(val);
    }
};
SchemaArray.prototype.castForQuery = function ($conditional, val) {
  var handler;
  if (arguments.length === 2) {
    handler = this.$conditionalHandlers[$conditional];
    if (!handler)
      throw new Error("Can't use " + $conditional + " with Array.");
    return handler.call(this, val);
  } else {
    val = $conditional;
    if (Array.isArray(val)) {
      return this.cast(val);
    } else {
      var proto = this.caster.prototype;
      var method = proto.castForQuery || proto.cast;
      if (method) return method.call(proto, val);
      return val.toObject ? val.toObject() : val;
    }
  }
};

/**
 * Number casting for arrays (equivalent, but without MongoseNumber)
 *
 * @see GH-176
 * @param {Object} value
 * @api private
 */

ArrayNumberSchema.prototype.cast = function (value) {
  if (!isNaN(value)) {
    if (value instanceof Number || typeof value == 'number' ||
       (value.toString && value.toString() == Number(value)))
      return Number(value);
  }
  throw new CastError('number', value);
};

/**
 * Module exports.
 */

module.exports = SchemaArray;
