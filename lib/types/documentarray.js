
/*!
 * Module dependencies.
 */

var MongooseArray = require('./array')
  , driver = global.MONGOOSE_DRIVER_PATH || '../drivers/node-mongodb-native'
  , ObjectId = require(driver + '/objectid')
  , ObjectIdSchema = require('../schema/objectid')
  , utils = require('../utils')
  , util = require('util')
  , Document = require('../document')

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

function MongooseDocumentArray (values, path, doc) {
  var arr = [];

  // Values always have to be passed to the constructor to initialize, since
  // otherwise MongooseArray#push will mark the array as modified to the parent.
  arr.push.apply(arr, values);
  arr.__proto__ = MongooseDocumentArray.prototype;

  arr._atomics = {};
  arr.validators = [];
  arr._path = path;

  if (doc) {
    arr._parent = doc;
    arr._schema = doc.schema.path(path);
    doc.on('save', arr.notify('save'));
    doc.on('isNew', arr.notify('isNew'));
  }

  return arr;
};

/*!
 * Inherits from MongooseArray
 */

MongooseDocumentArray.prototype.__proto__ = MongooseArray.prototype;

/**
 * Overrides MongooseArray#cast
 *
 * @api private
 */

MongooseDocumentArray.prototype._cast = function (value) {
  var dim = this._schema.options.arrayDimension || 1;

  // anything being cast should be approx. 1 dimension less than the dimension
  // of the array
  dim--;

  // check for valid array sizes
  if (dim) {
    if (!(value instanceof Array)) {
      throw new Error('Cannot push anything except arrays on multidimensional Arrays');
    }
    // find the dimensions of the pushed array
    var argDim = 0;
    var cur = value;
    while(cur instanceof Array) {
      argDim++;
      cur = cur[0];
    }

    if (argDim != dim) {
      throw new Error(nUtils.format('Saw %d dimensional array, expected %d dimensional', argDim, dim));
    }
  } else {
    if (value instanceof Array) {
      throw new Error('Must push a single value');
    }
  }
  // make sure we have an array and that it has all of the correct methods
  if (!(value instanceof Array)) {
    value = [value];
  }
  var orig_proto = value.__proto__;
  value.__proto__ = MongooseDocumentArray.prototype;
  var self = this;

  value = MongooseArray.mapMultiDimArray(dim, value, { skipNull : true },
    function(arr, indices, val) {
      if (val instanceof self._schema.casterConstructor) {
        if (!(val.__parent && val.__parentArray)) {
          // value may have been created using array.create()
          val.__parent = self._parent;
          val.__parentArray = self;
        }
        arr._setValueByIndex(indices, val);
      } else {
        // handle cast('string') or cast(ObjectId) etc.
        // only objects are permitted so we can safely assume that
        // non-objects are to be interpreted as _id
        if (Buffer.isBuffer(val) ||
            val instanceof ObjectId || !utils.isObject(val)) {
          val = { _id: val };
        }
        val = new self._schema.casterConstructor(val, self);
        arr._setValueByIndex(indices, val);
      }
  });
  value.__proto__ = orig_proto;

  if(dim) {
    return value;
  } else {
    return value[0];
  }
};
/**
 * Searches array items for the first document with a matching _id.
 *
 * ####Example:
 *
 *     var embeddedDoc = m.array.id(some_id);
 *
 * @return {EmbeddedDocument|null} the subdocuent or null if not found.
 * @param {ObjectId|String|Number|Buffer} id
 * @TODO cast to the _id based on schema for proper comparison
 * @api public
 */

MongooseDocumentArray.prototype.id = function (id) {
  var casted
    , sid
    , _id

  try {
    var casted_ = ObjectIdSchema.prototype.cast.call({}, id);
    if (casted_) casted = String(casted_);
  } catch (e) {
    casted = null;
  }

  for (var i = 0, l = this.length; i < l; i++) {
    _id = this[i].get('_id');

    if (_id instanceof Document) {
      sid || (sid = String(id));
      if (sid == _id._id) return this[i];
    } else if (!(_id instanceof ObjectId)) {
      sid || (sid = String(id));
      if (sid == _id) return this[i];
    } else if (casted == _id) {
      return this[i];
    }
  }

  return null;
};

/**
 * returns a complete clone of the array. This is necessary to deal with
 * multidimensional arrays, which cannot copied with a simple .slice()
 *
 * @return {Array}
 * @api private
 */

Array.prototype.clone = function() {
  var arr = [];
  for(var i = 0; i < this.length; i++ ) {
    if(this[i] && this[i].clone) {
        //recursion
        arr[i] = this[i].clone();
    } else {
      arr[i] = this[i];
    }
  }
  return arr;
}

/**
 * Returns a native js Array of plain js objects
 *
 * ####NOTE:
 *
 * _Each sub-document is converted to a plain object by calling its `#toObject` method._
 *
 * @param {Object} [options] optional options to pass to each documents `toObject` method call during conversion
 * @return {Array}
 * @api public
 */

MongooseDocumentArray.prototype.toObject = function (options) {
  var dim = 0;
  if(this._schema) {
    dim = this._schema.options.arrayDimension || 1;
  } else {
    // manually get the dimension
    var cur = this;
    while(cur instanceof Array) {
      dim++;
      cur = cur[0];
    }
  }

  var rArr = this.clone();
  rArr.__proto__ = MongooseDocumentArray.prototype;

  rArr = MongooseArray.mapMultiDimArray(dim, rArr, { skipNull : true },
    function(arr, indices, val) {

      var objVal = val.toObject(options) || null;
      arr._setValueByIndex(indices, objVal);
  });

  rArr.__proto__ = Array.__proto__;
  return rArr;
};

/**
 * Helper for console.log
 *
 * @api public
 */

MongooseDocumentArray.prototype.inspect = function () {
  return '[' + this.map(function (doc) {
    if (doc) {
      return doc.inspect
        ? doc.inspect()
        : util.inspect(doc)
    }
    return 'null'
  }).join('\n') + ']';
};

/**
 * Creates a subdocument casted to this schema.
 *
 * This is the same subdocument constructor used for casting.
 *
 * @param {Object} obj the value to cast to this arrays SubDocument schema
 * @api public
 */

MongooseDocumentArray.prototype.create = function (obj) {
  return new this._schema.casterConstructor(obj);
}

/**
 * Creates a fn that notifies all child docs of `event`.
 *
 * @param {String} event
 * @return {Function}
 * @api private
 */

MongooseDocumentArray.prototype.notify = function notify (event) {
  var self = this;
  return function notify (val) {
    var dim = 0;
    if(self._schema) {
      dim = self._schema.options.arrayDimension || 1;
    } else {
      // manually get the dimension
      var cur = this;
      while(cur instanceof Array) {
        dim++;
        cur = cur[0];
      }
    }

    MongooseArray.mapMultiDimArray(dim, self, { skipNull : true }, function (arr, indices, value) {
      value.emit(event, val);
    });
  }
}

/*!
 * Module exports.
 */

module.exports = MongooseDocumentArray;
