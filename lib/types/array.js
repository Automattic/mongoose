/*!
 * Module dependencies.
 */

'use strict';

const CoreMongooseArray = require('./core_array');
const EmbeddedDocument = require('./embedded');
const Document = require('../document');
const cleanModifiedSubpaths = require('../helpers/document/cleanModifiedSubpaths');
const get = require('../helpers/get');
const util = require('util');

const arrayAtomicsSymbol = require('../helpers/symbols').arrayAtomicsSymbol;
const arrayParentSymbol = require('../helpers/symbols').arrayParentSymbol;
const arrayPathSymbol = require('../helpers/symbols').arrayPathSymbol;
const arraySchemaSymbol = require('../helpers/symbols').arraySchemaSymbol;

const _basePush = Array.prototype.push;

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
  // TODO: replace this with `new CoreMongooseArray().concat()` when we remove
  // support for node 4.x and 5.x, see https://i.imgur.com/UAAHk4S.png
  const arr = new CoreMongooseArray();

  if (Array.isArray(values)) {
    values.forEach(v => { _basePush.call(arr, v); });
  }

  const keysMA = Object.keys(MongooseArray.mixin);
  const numKeys = keysMA.length;
  for (let i = 0; i < numKeys; ++i) {
    arr[keysMA[i]] = MongooseArray.mixin[keysMA[i]];
  }

  arr[arrayPathSymbol] = path;
  arr.validators = [];
  arr[arrayAtomicsSymbol] = {};
  arr[arraySchemaSymbol] = void 0;
  if (util.inspect.custom) {
    arr[util.inspect.custom] = arr.inspect;
  }

  // Because doc comes from the context of another function, doc === global
  // can happen if there was a null somewhere up the chain (see #3020)
  // RB Jun 17, 2015 updated to check for presence of expected paths instead
  // to make more proof against unusual node environments
  if (doc && doc instanceof Document) {
    arr[arrayParentSymbol] = doc;
    arr[arraySchemaSymbol] = doc.schema.path(path);
  }

  return arr;
}

MongooseArray.mixin = {
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
   * @memberOf MongooseArray
   */

  pop: function() {
    const ret = [].pop.call(this);
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
   * @instance
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
   * @memberOf MongooseArray
   */

  shift: function() {
    const ret = [].shift.call(this);
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
   * @memberOf MongooseArray
   */

  pull: function() {
    const values = [].map.call(arguments, this._cast, this);
    const cur = this[arrayParentSymbol].get(this[arrayPathSymbol]);
    let i = cur.length;
    let mem;

    while (i--) {
      mem = cur[i];
      if (mem instanceof Document) {
        const some = values.some(function(v) {
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

    // Might have modified child paths and then pulled, like
    // `doc.children[1].name = 'test';` followed by
    // `doc.children.remove(doc.children[0]);`. In this case we fall back
    // to a `$set` on the whole array. See #3511
    if (cleanModifiedSubpaths(this[arrayParentSymbol], this[arrayPathSymbol]) > 0) {
      this._registerAtomic('$set', this);
    }

    return this;
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
   * @memberOf MongooseArray
   */

  sort: function() {
    const ret = [].sort.apply(this, arguments);
    this._registerAtomic('$set', this);
    return ret;
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
   * @memberOf MongooseArray
   */

  set: function set(i, val) {
    const value = this._cast(val, i);
    this[i] = value;
    this._markModified(i);
    return this;
  }
};

/*!
 * ignore
 */

function _isAllSubdocs(docs, ref) {
  if (!ref) {
    return false;
  }
  for (let i = 0; i < docs.length; ++i) {
    const arg = docs[i];
    if (arg == null) {
      return false;
    }
    const model = arg.constructor;
    if (!(arg instanceof Document) ||
      (model.modelName !== ref && model.baseModelName !== ref)) {
      return false;
    }
  }

  return true;
}

/**
 * Alias of [pull](#types_array_MongooseArray-pull)
 *
 * @see MongooseArray#pull #types_array_MongooseArray-pull
 * @see mongodb http://www.mongodb.org/display/DOCS/Updating/#Updating-%24pull
 * @api public
 * @memberOf MongooseArray
 * @instance
 * @method remove
 */

MongooseArray.mixin.remove = MongooseArray.mixin.pull;

/*!
 * Module exports.
 */

module.exports = exports = MongooseArray;
