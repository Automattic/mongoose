'use strict';

/*!
 * Module dependencies.
 */

const MongooseArray = require('./array');
const ObjectId = require('./objectid');
const ObjectIdSchema = require('../schema/objectid');
const internalToObjectOptions = require('../options').internalToObjectOptions;
const utils = require('../utils');
const Document = require('../document');
const getDiscriminatorByValue = require('../queryhelpers').getDiscriminatorByValue;

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

    // Tricky but this may be a document array embedded in a normal array,
    // in which case `path` would point to the embedded array. See #6405, #6398
    if (arr._schema && !arr._schema.$isMongooseDocumentArray) {
      arr._schema = arr._schema.casterConstructor;
    }

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
    return this.toObject(internalToObjectOptions);
  },

  /**
   * Overrides MongooseArray#cast
   *
   * @method _cast
   * @api private
   * @receiver MongooseDocumentArray
   */

  _cast: function(value, index) {
    var Constructor = this._schema.casterConstructor;
    if (value instanceof Constructor ||
        // Hack re: #5001, see #5005
        (value && value.constructor && value.constructor.baseCasterConstructor === Constructor)) {
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

    if (value &&
        Constructor.discriminators &&
        Constructor.schema &&
        Constructor.schema.options &&
        Constructor.schema.options.discriminatorKey) {
      if (typeof value[Constructor.schema.options.discriminatorKey] === 'string' &&
          Constructor.discriminators[value[Constructor.schema.options.discriminatorKey]]) {
        Constructor = Constructor.discriminators[value[Constructor.schema.options.discriminatorKey]];
      } else {
        var constructorByValue = getDiscriminatorByValue(Constructor, value[Constructor.schema.options.discriminatorKey]);
        if (constructorByValue) {
          Constructor = constructorByValue;
        }
      }
    }

    return new Constructor(value, this, undefined, undefined, index);
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
      if (!this[i]) {
        continue;
      }
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
    var Constructor = this._schema.casterConstructor;
    if (obj &&
        Constructor.discriminators &&
        Constructor.schema &&
        Constructor.schema.options &&
        Constructor.schema.options.discriminatorKey) {
      if (typeof obj[Constructor.schema.options.discriminatorKey] === 'string' &&
          Constructor.discriminators[obj[Constructor.schema.options.discriminatorKey]]) {
        Constructor = Constructor.discriminators[obj[Constructor.schema.options.discriminatorKey]];
      } else {
        var constructorByValue = getDiscriminatorByValue(Constructor, obj[Constructor.schema.options.discriminatorKey]);
        if (constructorByValue) {
          Constructor = constructorByValue;
        }
      }
    }

    return new Constructor(obj);
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
