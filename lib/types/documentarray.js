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
        const constructorByValue = getDiscriminatorByValue(Constructor, value[Constructor.schema.options.discriminatorKey]);
        if (constructorByValue) {
          Constructor = constructorByValue;
        }
      }
    }

    if (Constructor.$isMongooseDocumentArray) {
      return Constructor.cast(value, this, undefined, undefined, index);
    }
    return new Constructor(value, this, undefined, undefined, index);
  }

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

  id(id) {
    let casted;
    let sid;
    let _id;

    try {
      casted = castObjectId(id).toString();
    } catch (e) {
      casted = null;
    }

    for (let i = 0, l = this.length; i < l; i++) {
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

  slice() {
    const arr = super.slice.apply(this, arguments);
    arr[arrayParentSymbol] = this[arrayParentSymbol];
    arr[arrayPathSymbol] = this[arrayPathSymbol];

    return arr;
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
  // TODO: replace this with `new CoreDocumentArray().concat()` when we remove
  // support for node 4.x and 5.x, see https://i.imgur.com/UAAHk4S.png
  const arr = new CoreDocumentArray();

  arr[arrayAtomicsSymbol] = {};
  arr[arraySchemaSymbol] = void 0;
  if (Array.isArray(values)) {
    if (values instanceof CoreDocumentArray &&
        values[arrayPathSymbol] === path &&
        values[arrayParentSymbol] === doc) {
      arr[arrayAtomicsSymbol] = Object.assign({}, values[arrayAtomicsSymbol]);
    }
    values.forEach(v => {
      _basePush.call(arr, v);
    });
  }
  arr[arrayPathSymbol] = path;

  // Because doc comes from the context of another function, doc === global
  // can happen if there was a null somewhere up the chain (see #3020 && #3034)
  // RB Jun 17, 2015 updated to check for presence of expected paths instead
  // to make more proof against unusual node environments
  if (doc && doc instanceof Document) {
    arr[arrayParentSymbol] = doc;
    arr[arraySchemaSymbol] = doc.schema.path(path);

    // `schema.path()` doesn't drill into nested arrays properly yet, see
    // gh-6398, gh-6602. This is a workaround because nested arrays are
    // always plain non-document arrays, so once you get to a document array
    // nesting is done. Matryoshka code.
    while (arr != null &&
        arr[arraySchemaSymbol] != null &&
        arr[arraySchemaSymbol].$isMongooseArray &&
        !arr[arraySchemaSymbol].$isMongooseDocumentArray) {
      arr[arraySchemaSymbol] = arr[arraySchemaSymbol].casterConstructor;
    }
  }

  return arr;
}

/*!
 * Module exports.
 */

module.exports = MongooseDocumentArray;
