'use strict';

/*!
 * Module dependencies.
 */

const CoreMongooseArray = require('./core_array');
const Document = require('../document');
const ObjectId = require('./objectid');
const castObjectId = require('../cast/objectid');
const getDiscriminatorByValue = require('../helpers/discriminator/getDiscriminatorByValue');
const internalToObjectOptions = require('../options').internalToObjectOptions;
const util = require('util');
const utils = require('../utils');

const arrayAtomicsSymbol = require('../helpers/symbols').arrayAtomicsSymbol;
const arrayAtomicsBackupSymbol = require('../helpers/symbols').arrayAtomicsBackupSymbol;
const arrayParentSymbol = require('../helpers/symbols').arrayParentSymbol;
const arrayPathSymbol = require('../helpers/symbols').arrayPathSymbol;
const arraySchemaSymbol = require('../helpers/symbols').arraySchemaSymbol;
const documentArrayParent = require('../helpers/symbols').documentArrayParent;

const _basePush = Array.prototype.push;

class CoreDocumentArray extends CoreMongooseArray {
  get isMongooseDocumentArray() {
    return true;
  }

  /*!
   * ignore
   */

  toBSON() {
    return this.toObject(internalToObjectOptions);
  }

  /**
   * Overrides MongooseArray#cast
   *
   * @method _cast
   * @api private
   * @receiver MongooseDocumentArray
   */

  _cast(value, index) {
    if (this[arraySchemaSymbol] == null) {
      return value;
    }
    let Constructor = this[arraySchemaSymbol].casterConstructor;
    const isInstance = Constructor.$isMongooseDocumentArray ?
      value && value.isMongooseDocumentArray :
      value instanceof Constructor;
    if (isInstance ||
        // Hack re: #5001, see #5005
        (value && value.constructor && value.constructor.baseCasterConstructor === Constructor)) {
      if (!(value[documentArrayParent] && value.__parentArray)) {
        // value may have been created using array.create()
        value[documentArrayParent] = this[arrayParentSymbol];
        value.__parentArray = this;
      }
      value.$setIndex(index);
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
      value = { _id: value };
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
        const constructorByValue = getDiscriminatorByValue(Constructor, value[Constructor.schema.options.discriminatorKey]);
        if (constructorByValue) {
          Constructor = constructorByValue;
        }
      }
    }

    if (Constructor.$isMongooseDocumentArray) {
      return Constructor.cast(value, this, undefined, undefined, index);
    }
    const ret = new Constructor(value, this, undefined, undefined, index);
    ret.isNew = true;
    return ret;
  }

  /**
   * Searches array items for the first document with a matching _id.
   *
   * ####Example:
   *
   *     const embeddedDoc = m.array.id(some_id);
   *
   * @return {EmbeddedDocument|null} the subdocument or null if not found.
   * @param {ObjectId|String|Number|Buffer} id
   * @TODO cast to the _id based on schema for proper comparison
   * @method id
   * @api public
   * @receiver MongooseDocumentArray
   */

  id(id) {
    let casted;
    let sid;
    let _id;

    try {
      casted = castObjectId(id).toString();
    } catch (e) {
      casted = null;
    }

    for (const val of this) {
      if (!val) {
        continue;
      }

      _id = val.get('_id');

      if (_id === null || typeof _id === 'undefined') {
        continue;
      } else if (_id instanceof Document) {
        sid || (sid = String(id));
        if (sid == _id._id) {
          return val;
        }
      } else if (!(id instanceof ObjectId) && !(_id instanceof ObjectId)) {
        if (id == _id || utils.deepEqual(id, _id)) {
          return val;
        }
      } else if (casted == _id) {
        return val;
      }
    }

    return null;
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
   * @method toObject
   * @api public
   * @receiver MongooseDocumentArray
   */

  toObject(options) {
    // `[].concat` coerces the return value into a vanilla JS array, rather
    // than a Mongoose array.
    return [].concat(this.map(function(doc) {
      if (doc == null) {
        return null;
      }
      if (typeof doc.toObject !== 'function') {
        return doc;
      }
      return doc.toObject(options);
    }));
  }

  /**
   * Wraps [`Array#push`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/push) with proper change tracking.
   *
   * @param {Object} [args...]
   * @api public
   * @method push
   * @memberOf MongooseDocumentArray
   */

  push() {
    const ret = super.push.apply(this, arguments);

    _updateParentPopulated(this);

    return ret;
  }

  /**
   * Pulls items from the array atomically.
   *
   * @param {Object} [args...]
   * @api public
   * @method pull
   * @memberOf MongooseDocumentArray
   */

  pull() {
    const ret = super.pull.apply(this, arguments);

    _updateParentPopulated(this);

    return ret;
  }

  /**
   * Wraps [`Array#shift`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/unshift) with proper change tracking.
   */

  shift() {
    const ret = super.shift.apply(this, arguments);

    _updateParentPopulated(this);

    return ret;
  }

  /**
   * Wraps [`Array#splice`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/splice) with proper change tracking and casting.
   */

  splice() {
    const ret = super.splice.apply(this, arguments);

    _updateParentPopulated(this);

    return ret;
  }

  /**
   * Helper for console.log
   *
   * @method inspect
   * @api public
   * @receiver MongooseDocumentArray
   */

  inspect() {
    return this.toObject();
  }

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

  create(obj) {
    let Constructor = this[arraySchemaSymbol].casterConstructor;
    if (obj &&
        Constructor.discriminators &&
        Constructor.schema &&
        Constructor.schema.options &&
        Constructor.schema.options.discriminatorKey) {
      if (typeof obj[Constructor.schema.options.discriminatorKey] === 'string' &&
          Constructor.discriminators[obj[Constructor.schema.options.discriminatorKey]]) {
        Constructor = Constructor.discriminators[obj[Constructor.schema.options.discriminatorKey]];
      } else {
        const constructorByValue = getDiscriminatorByValue(Constructor, obj[Constructor.schema.options.discriminatorKey]);
        if (constructorByValue) {
          Constructor = constructorByValue;
        }
      }
    }

    return new Constructor(obj, this);
  }

  /*!
   * ignore
   */

  notify(event) {
    const _this = this;
    return function notify(val, _arr) {
      _arr = _arr || _this;
      let i = _arr.length;
      while (i--) {
        if (_arr[i] == null) {
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

        if (_arr[i].isMongooseArray) {
          notify(val, _arr[i]);
        } else if (_arr[i]) {
          _arr[i].emit(event, val);
        }
      }
    };
  }
}

if (util.inspect.custom) {
  CoreDocumentArray.prototype[util.inspect.custom] =
    CoreDocumentArray.prototype.inspect;
}

/*!
 * If this is a document array, each element may contain single
 * populated paths, so we need to modify the top-level document's
 * populated cache. See gh-8247, gh-8265.
 */

function _updateParentPopulated(arr) {
  const parent = arr[arrayParentSymbol];
  if (!parent || parent.$__.populated == null) return;

  const populatedPaths = Object.keys(parent.$__.populated).
    filter(p => p.startsWith(arr[arrayPathSymbol] + '.'));

  for (const path of populatedPaths) {
    const remnant = path.slice((arr[arrayPathSymbol] + '.').length);
    if (!Array.isArray(parent.$__.populated[path].value)) {
      continue;
    }

    parent.$__.populated[path].value = arr.map(val => val.populated(remnant));
  }
}

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
  const arr = [];

  const internals = {
    [arrayAtomicsSymbol]: {},
    [arrayAtomicsBackupSymbol]: void 0,
    [arrayPathSymbol]: path,
    [arraySchemaSymbol]: void 0,
    [arrayParentSymbol]: void 0
  };

  internals[arraySchemaSymbol] = void 0;
  if (Array.isArray(values)) {
    if (values[arrayPathSymbol] === path &&
        values[arrayParentSymbol] === doc) {
      internals[arrayAtomicsSymbol] = Object.assign({}, values[arrayAtomicsSymbol]);
    }
    values.forEach(v => {
      _basePush.call(arr, v);
    });
  }
  internals[arrayPathSymbol] = path;

  // Because doc comes from the context of another function, doc === global
  // can happen if there was a null somewhere up the chain (see #3020 && #3034)
  // RB Jun 17, 2015 updated to check for presence of expected paths instead
  // to make more proof against unusual node environments
  if (doc && doc instanceof Document) {
    internals[arrayParentSymbol] = doc;
    internals[arraySchemaSymbol] = doc.schema.path(path);

    // `schema.path()` doesn't drill into nested arrays properly yet, see
    // gh-6398, gh-6602. This is a workaround because nested arrays are
    // always plain non-document arrays, so once you get to a document array
    // nesting is done. Matryoshka code.
    while (internals[arraySchemaSymbol] != null &&
        internals[arraySchemaSymbol].$isMongooseArray &&
        !internals[arraySchemaSymbol].$isMongooseDocumentArray) {
      internals[arraySchemaSymbol] = internals[arraySchemaSymbol].casterConstructor;
    }
  }

  const proxy = new Proxy(arr, {
    get: function(target, prop) {
      if (prop === 'isMongooseArray' ||
          prop === 'isMongooseArrayProxy' ||
          prop === 'isMongooseDocumentArray' ||
          prop === 'isMongooseDocumentArrayProxy') {
        return true;
      }
      if (prop === '__array') {
        return arr;
      }
      if (prop === 'set') {
        return set;
      }
      if (internals.hasOwnProperty(prop)) {
        return internals[prop];
      }
      if (CoreDocumentArray.prototype.hasOwnProperty(prop)) {
        return CoreDocumentArray.prototype[prop];
      }
      if (CoreMongooseArray.prototype.hasOwnProperty(prop)) {
        return CoreMongooseArray.prototype[prop];
      }

      return arr[prop];
    },
    set: function(target, prop, value) {
      if (typeof prop === 'string' && /^\d+$/.test(prop)) {
        set.call(proxy, prop, value);
      } else if (internals.hasOwnProperty(prop)) {
        internals[prop] = value;
      } else {
        arr[prop] = value;
      }

      return true;
    }
  });

  return proxy;
}

function set(i, val, skipModified) {
  const arr = this.__array;
  if (skipModified) {
    arr[i] = val;
    return arr;
  }
  const value = CoreDocumentArray.prototype._cast.call(this, val, i);
  arr[i] = value;
  CoreDocumentArray.prototype._markModified.call(this, i);
  return arr;
}

/*!
 * Module exports.
 */

module.exports = MongooseDocumentArray;
