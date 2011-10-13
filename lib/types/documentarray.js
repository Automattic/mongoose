
/**
 * Module dependencies.
 */

var MongooseArray = require('./array')
  , driver = global.MONGOOSE_DRIVER_PATH || '../drivers/node-mongodb-native'
  , ObjectId = require(driver + '/objectid')
  , ObjectIdSchema = require('../schema/objectid');

/**
 * Array of embedded documents
 * Values always have to be passed to the constructor to initialize, since
 * otherwise MongooseArray#push will mark the array as modified to the parent.
 *
 * @param {Array} values
 * @param {String} key path
 * @param {Document} parent document
 * @api private
 * @see http://bit.ly/f6CnZU
 */

function MongooseDocumentArray (values, path, doc) {
  var arr = [];
  arr.push.apply(arr, values);
  arr.__proto__ = MongooseDocumentArray.prototype;

  arr._atomics = [];
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

/**
 * Inherits from MongooseArray
 */

MongooseDocumentArray.prototype.__proto__ = MongooseArray.prototype;

/**
 * Overrides cast
 *
 * @api private
 */

MongooseDocumentArray.prototype._cast = function (value) {
  var doc = new this._schema.caster(value, this);
  return doc;
};

/**
 * Filters items by id
 *
 * @param {Object} id
 * @api public
 */

MongooseDocumentArray.prototype.id = function (id) {
  try {
    var casted = ObjectId.toString(ObjectIdSchema.prototype.cast.call({}, id));
  } catch (e) {
    var casted = null;
  }

  for (var i = 0, l = this.length; i < l; i++) {
    if (!(this[i].get('_id') instanceof ObjectId)) {
      if (String(id) == this[i].get('_id').toString())
        return this[i];
    } else {
      if (casted == this[i].get('_id').toString())
        return this[i];
    }
  }

  return null;
};

/**
 * Returns an Array and converts any Document
 * members toObject.
 *
 * @return {Array}
 * @api public
 */

MongooseDocumentArray.prototype.toObject = function () {
  return this.map(function (doc) {
    return doc && doc.toObject() || null;
  });
};

/**
 * Helper for console.log
 *
 * @api public
 */

MongooseDocumentArray.prototype.inspect = function () {
  return '[' + this.map(function (doc) {
    return doc && doc.inspect() || 'null';
  }).join('\n') + ']';
};

/**
 * Create fn that notifies all child docs of event.
 *
 * @param {String} event
 * @api private
 */

MongooseDocumentArray.prototype.notify = function notify (event) {
  var self = this;
  return function notify (val) {
    var i = self.length;
    while (i--) {
      self[i].emit(event, val);
    }
  }
}

/**
 * Module exports.
 */

module.exports = MongooseDocumentArray;
