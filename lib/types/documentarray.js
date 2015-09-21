/*!
 * Module dependencies.
 */

var MongooseArray = require('./array')
  , ObjectId = require('./objectid')
  , ObjectIdSchema = require('../schema/objectid')
  , utils = require('../utils')
  , util = require('util')
  , Document = require('../document');

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

  // Values always have to be passed to the constructor to initialize, since
  // otherwise MongooseArray#push will mark the array as modified to the parent.
  utils.decorate( arr, MongooseDocumentArray.mixin );
  arr.isMongooseArray = true;
  arr.isMongooseDocumentArray = true;

  arr._atomics = {};
  arr.validators = [];
  arr._path = path;

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
MongooseDocumentArray.mixin = Object.create( MongooseArray.mixin );

/**
 * Overrides MongooseArray#cast
 *
 * @method _cast
 * @api private
 * @receiver MongooseDocumentArray
 */

MongooseDocumentArray.mixin._cast = function(value, index) {
  if (value instanceof this._schema.casterConstructor) {
    if (!(value.__parent && value.__parentArray)) {
      // value may have been created using array.create()
      value.__parent = this._parent;
      value.__parentArray = this;
    }
    value.__index = index;
    return value;
  }

  // handle cast('string') or cast(ObjectId) etc.
  // only objects are permitted so we can safely assume that
  // non-objects are to be interpreted as _id
  if (Buffer.isBuffer(value) ||
      value instanceof ObjectId || !utils.isObject(value)) {
    value = { _id: value };
  }
  return new this._schema.casterConstructor(value, this, undefined, undefined, index);
};

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

MongooseDocumentArray.mixin.id = function(id) {
  var casted
    , sid
    , _id;

  try {
    var casted_ = ObjectIdSchema.prototype.cast.call({}, id);
    if (casted_) casted = String(casted_);
  } catch (e) {
    casted = null;
  }

  for (var i = 0, l = this.length; i < l; i++) {
    _id = this[i].get('_id');

    if (_id === null || typeof _id === 'undefined') {
      continue;
    } else if (_id instanceof Document) {
      sid || (sid = String(id));
      if (sid == _id._id) return this[i];
    } else if (!(_id instanceof ObjectId)) {
      if (utils.deepEqual(id, _id)) return this[i];
    } else if (casted == _id) {
      return this[i];
    }
  }

  return null;
};

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

MongooseDocumentArray.mixin.toObject = function(options) {
  return this.map(function(doc) {
    return doc && doc.toObject(options) || null;
  });
};

/**
 * Helper for console.log
 *
 * @method inspect
 * @api public
 * @receiver MongooseDocumentArray
 */

MongooseDocumentArray.mixin.inspect = function() {
  return '[' + Array.prototype.map.call(this, function(doc) {
    if (doc) {
      return doc.inspect
        ? doc.inspect()
        : util.inspect(doc);
    }
    return 'null';
  }).join('\n') + ']';
};

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

MongooseDocumentArray.mixin.create = function(obj) {
  return new this._schema.casterConstructor(obj);
};

/**
 * Creates a fn that notifies all child docs of `event`.
 *
 * @param {String} event
 * @return {Function}
 * @method notify
 * @api private
 * @receiver MongooseDocumentArray
 */

MongooseDocumentArray.mixin.notify = function notify(event) {
  var self = this;
  return function notify(val) {
    var i = self.length;
    while (i--) {
      if (!self[i]) continue;
      switch (event) {
        // only swap for save event for now, we may change this to all event types later
        case 'save':
          val = self[i];
          break;
        default:
          // NO-OP
          break;
      }
      self[i].emit(event, val);
    }
  };
};

/*!
 * Module exports.
 */

module.exports = MongooseDocumentArray;
