'use strict';

const Document = require('../document');
const EmbeddedDocument = require('./embedded');
const ObjectId = require('./objectid');
const cleanModifiedSubpaths = require('../helpers/document/cleanModifiedSubpaths');
const get = require('../helpers/get');
const internalToObjectOptions = require('../options').internalToObjectOptions;
const utils = require('../utils');

const arrayAtomicsSymbol = require('../helpers/symbols').arrayAtomicsSymbol;
const arrayParentSymbol = require('../helpers/symbols').arrayParentSymbol;
const arrayPathSymbol = require('../helpers/symbols').arrayPathSymbol;
const arraySchemaSymbol = require('../helpers/symbols').arraySchemaSymbol;

const _basePush = Array.prototype.push;

/*!
 * ignore
 */

class CoreMongooseArray extends Array {
  get isMongooseArray() {
    return true;
  }

  /**
   * Depopulates stored atomic operation values as necessary for direct insertion to MongoDB.
   *
   * If no atomics exist, we return all array values after conversion.
   *
   * @return {Array}
   * @method $__getAtomics
   * @memberOf MongooseArray
   * @instance
   * @api private
   */

  $__getAtomics() {
    const ret = [];
    const keys = Object.keys(this[arrayAtomicsSymbol]);
    let i = keys.length;

    const opts = Object.assign({}, internalToObjectOptions, { _isNested: true });

    if (i === 0) {
      ret[0] = ['$set', this.toObject(opts)];
      return ret;
    }

    while (i--) {
      const op = keys[i];
      let val = this[arrayAtomicsSymbol][op];

      // the atomic values which are arrays are not MongooseArrays. we
      // need to convert their elements as if they were MongooseArrays
      // to handle populated arrays versus DocumentArrays properly.
      if (utils.isMongooseObject(val)) {
        val = val.toObject(opts);
      } else if (Array.isArray(val)) {
        val = this.toObject.call(val, opts);
      } else if (val != null && Array.isArray(val.$each)) {
        val.$each = this.toObject.call(val.$each, opts);
      } else if (val != null && typeof val.valueOf === 'function') {
        val = val.valueOf();
      }

      if (op === '$addToSet') {
        val = {$each: val};
      }

      ret.push([op, val]);
    }

    return ret;
  }

  /*!
   * ignore
   */

  $atomics() {
    return this[arrayAtomicsSymbol];
  }

  /*!
   * ignore
   */

  $parent() {
    return this[arrayParentSymbol];
  }

  /*!
   * ignore
   */

  $path() {
    return this[arrayPathSymbol];
  }

  /**
   * Pops the array atomically at most one time per document `save()`.
   *
   * #### NOTE:
   *
   * _Calling this mulitple times on an array before saving sends the same command as calling it once._
   * _This update is implemented using the MongoDB [$pop](http://www.mongodb.org/display/DOCS/Updating/#Updating-%24pop) method which enforces this restriction._
   *
   *      doc.array = [1,2,3];
   *
   *      var popped = doc.array.$pop();
   *      console.log(popped); // 3
   *      console.log(doc.array); // [1,2]
   *
   *      // no affect
   *      popped = doc.array.$pop();
   *      console.log(doc.array); // [1,2]
   *
   *      doc.save(function (err) {
   *        if (err) return handleError(err);
   *
   *        // we saved, now $pop works again
   *        popped = doc.array.$pop();
   *        console.log(popped); // 2
   *        console.log(doc.array); // [1]
   *      })
   *
   * @api public
   * @method $pop
   * @memberOf MongooseArray
   * @instance
   * @see mongodb http://www.mongodb.org/display/DOCS/Updating/#Updating-%24pop
   * @method $pop
   * @memberOf MongooseArray
   */

  $pop() {
    this._registerAtomic('$pop', 1);
    this._markModified();

    // only allow popping once
    if (this._popped) {
      return;
    }
    this._popped = true;

    return [].pop.call(this);
  }

  /*!
   * ignore
   */

  $schema() {
    return this[arraySchemaSymbol];
  }

  /**
   * Casts a member based on this arrays schema.
   *
   * @param {any} value
   * @return value the casted value
   * @method _cast
   * @api private
   * @memberOf MongooseArray
   */

  _cast(value) {
    let populated = false;
    let Model;

    if (this[arrayParentSymbol]) {
      populated = this[arrayParentSymbol].populated(this[arrayPathSymbol], true);
    }

    if (populated && value !== null && value !== undefined) {
      // cast to the populated Models schema
      Model = populated.options.model || populated.options.Model;

      // only objects are permitted so we can safely assume that
      // non-objects are to be interpreted as _id
      if (Buffer.isBuffer(value) ||
          value instanceof ObjectId || !utils.isObject(value)) {
        value = {_id: value};
      }

      // gh-2399
      // we should cast model only when it's not a discriminator
      const isDisc = value.schema && value.schema.discriminatorMapping &&
          value.schema.discriminatorMapping.key !== undefined;
      if (!isDisc) {
        value = new Model(value);
      }
      return this[arraySchemaSymbol].caster.applySetters(value, this[arrayParentSymbol], true);
    }

    return this[arraySchemaSymbol].caster.applySetters(value, this[arrayParentSymbol], false);
  }

  /**
   * Internal helper for .map()
   *
   * @api private
   * @return {Number}
   * @method _mapCast
   * @memberOf MongooseArray
   */

  _mapCast(val, index) {
    return this._cast(val, this.length + index);
  }

  /**
   * Marks this array as modified.
   *
   * If it bubbles up from an embedded document change, then it takes the following arguments (otherwise, takes 0 arguments)
   *
   * @param {EmbeddedDocument} embeddedDoc the embedded doc that invoked this method on the Array
   * @param {String} embeddedPath the path which changed in the embeddedDoc
   * @method _markModified
   * @api private
   * @memberOf MongooseArray
   */

  _markModified(elem, embeddedPath) {
    const parent = this[arrayParentSymbol];
    let dirtyPath;

    if (parent) {
      dirtyPath = this[arrayPathSymbol];

      if (arguments.length) {
        if (embeddedPath != null) {
          // an embedded doc bubbled up the change
          dirtyPath = dirtyPath + '.' + this.indexOf(elem) + '.' + embeddedPath;
        } else {
          // directly set an index
          dirtyPath = dirtyPath + '.' + elem;
        }
      }

      parent.markModified(dirtyPath, arguments.length > 0 ? elem : parent);
    }

    return this;
  }

  /**
   * Register an atomic operation with the parent.
   *
   * @param {Array} op operation
   * @param {any} val
   * @method _registerAtomic
   * @api private
   * @memberOf MongooseArray
   */

  _registerAtomic(op, val) {
    if (op === '$set') {
      // $set takes precedence over all other ops.
      // mark entire array modified.
      this[arrayAtomicsSymbol] = {$set: val};
      cleanModifiedSubpaths(this[arrayParentSymbol], this[arrayPathSymbol]);
      this._markModified();
      return this;
    }

    const atomics = this[arrayAtomicsSymbol];

    // reset pop/shift after save
    if (op === '$pop' && !('$pop' in atomics)) {
      const _this = this;
      this[arrayParentSymbol].once('save', function() {
        _this._popped = _this._shifted = null;
      });
    }

    // check for impossible $atomic combos (Mongo denies more than one
    // $atomic op on a single path
    if (this[arrayAtomicsSymbol].$set ||
        Object.keys(atomics).length && !(op in atomics)) {
      // a different op was previously registered.
      // save the entire thing.
      this[arrayAtomicsSymbol] = {$set: this};
      return this;
    }

    let selector;

    if (op === '$pullAll' || op === '$addToSet') {
      atomics[op] || (atomics[op] = []);
      atomics[op] = atomics[op].concat(val);
    } else if (op === '$pullDocs') {
      const pullOp = atomics['$pull'] || (atomics['$pull'] = {});
      if (val[0] instanceof EmbeddedDocument) {
        selector = pullOp['$or'] || (pullOp['$or'] = []);
        Array.prototype.push.apply(selector, val.map(function(v) {
          return v.toObject({transform: false, virtuals: false});
        }));
      } else {
        selector = pullOp['_id'] || (pullOp['_id'] = {$in: []});
        selector['$in'] = selector['$in'].concat(val);
      }
    } else if (op === '$push') {
      atomics.$push = atomics.$push || { $each: [] };
      atomics.$push.$each = atomics.$push.$each.concat(val);
    } else {
      atomics[op] = val;
    }

    return this;
  }

  /**
   * Adds values to the array if not already present.
   *
   * ####Example:
   *
   *     console.log(doc.array) // [2,3,4]
   *     var added = doc.array.addToSet(4,5);
   *     console.log(doc.array) // [2,3,4,5]
   *     console.log(added)     // [5]
   *
   * @param {any} [args...]
   * @return {Array} the values that were added
   * @memberOf MongooseArray
   * @api public
   * @method addToSet
   */

  addToSet() {
    _checkManualPopulation(this, arguments);

    let values = [].map.call(arguments, this._mapCast, this);
    values = this[arraySchemaSymbol].applySetters(values, this[arrayParentSymbol]);
    const added = [];
    let type = '';
    if (values[0] instanceof EmbeddedDocument) {
      type = 'doc';
    } else if (values[0] instanceof Date) {
      type = 'date';
    }

    values.forEach(function(v) {
      let found;
      const val = +v;
      switch (type) {
        case 'doc':
          found = this.some(function(doc) {
            return doc.equals(v);
          });
          break;
        case 'date':
          found = this.some(function(d) {
            return +d === val;
          });
          break;
        default:
          found = ~this.indexOf(v);
      }

      if (!found) {
        [].push.call(this, v);
        this._registerAtomic('$addToSet', v);
        this._markModified();
        [].push.call(added, v);
      }
    }, this);

    return added;
  }

  /**
   * Wraps [`Array#splice`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/splice) with proper change tracking and casting.
   *
   * ####Note:
   *
   * _marks the entire array as modified, which if saved, will store it as a `$set` operation, potentially overwritting any changes that happen between when you retrieved the object and when you save it._
   *
   * @api public
   * @method splice
   * @memberOf MongooseArray
   */

  splice() {
    let ret;

    _checkManualPopulation(this, Array.prototype.slice.call(arguments, 2));

    if (arguments.length) {
      const vals = [];
      for (let i = 0; i < arguments.length; ++i) {
        vals[i] = i < 2 ?
          arguments[i] :
          this._cast(arguments[i], arguments[0] + (i - 2));
      }
      ret = [].splice.apply(this, vals);
      this._registerAtomic('$set', this);
    }

    return ret;
  }

  /**
   * Returns the number of pending atomic operations to send to the db for this array.
   *
   * @api private
   * @return {Number}
   * @method hasAtomics
   * @memberOf MongooseArray
   */

  hasAtomics() {
    if (!utils.isPOJO(this[arrayAtomicsSymbol])) {
      return 0;
    }

    return Object.keys(this[arrayAtomicsSymbol]).length;
  }

  /**
   * Return whether or not the `obj` is included in the array.
   *
   * @param {Object} obj the item to check
   * @return {Boolean}
   * @api public
   * @method includes
   * @memberOf MongooseArray
   */

  includes(obj) {
    return this.indexOf(obj) !== -1;
  }

  /**
   * Return the index of `obj` or `-1` if not found.
   *
   * @param {Object} obj the item to look for
   * @return {Number}
   * @api public
   * @method indexOf
   * @memberOf MongooseArray
   */

  indexOf(obj) {
    if (obj instanceof ObjectId) {
      obj = obj.toString();
    }
    for (let i = 0, len = this.length; i < len; ++i) {
      if (obj == this[i]) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Helper for console.log
   *
   * @api public
   * @method inspect
   * @memberOf MongooseArray
   */

  inspect() {
    return JSON.stringify(this);
  }

  /**
   * Pushes items to the array non-atomically.
   *
   * ####NOTE:
   *
   * _marks the entire array as modified, which if saved, will store it as a `$set` operation, potentially overwritting any changes that happen between when you retrieved the object and when you save it._
   *
   * @param {any} [args...]
   * @api public
   * @method nonAtomicPush
   * @memberOf MongooseArray
   */

  nonAtomicPush() {
    const values = [].map.call(arguments, this._mapCast, this);
    const ret = [].push.apply(this, values);
    this._registerAtomic('$set', this);
    this._markModified();
    return ret;
  }

  /**
   * Wraps [`Array#push`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/push) with proper change tracking.
   *
   * @param {Object} [args...]
   * @api public
   * @method push
   * @memberOf MongooseArray
   */

  push() {
    if (this[arraySchemaSymbol] == null) {
      return _basePush.apply(this, arguments);
    }

    _checkManualPopulation(this, arguments);

    let values = [].map.call(arguments, this._mapCast, this);
    values = this[arraySchemaSymbol].applySetters(values, this[arrayParentSymbol], undefined,
      undefined, { skipDocumentArrayCast: true });
    const ret = [].push.apply(this, values);

    this._registerAtomic('$push', values);
    this._markModified();
    return ret;
  }

  remove() {}

  /*!
   * ignore
   */

  toBSON() {
    return this.toObject(internalToObjectOptions);
  }

  /**
   * Returns a native js Array.
   *
   * @param {Object} options
   * @return {Array}
   * @api public
   * @method toObject
   * @memberOf MongooseArray
   */

  toObject(options) {
    if (options && options.depopulate) {
      options = utils.clone(options);
      options._isNested = true;
      return this.map(function(doc) {
        return doc instanceof Document
          ? doc.toObject(options)
          : doc;
      });
    }

    return this.slice();
  }

  /**
   * Wraps [`Array#unshift`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/unshift) with proper change tracking.
   *
   * ####Note:
   *
   * _marks the entire array as modified, which if saved, will store it as a `$set` operation, potentially overwritting any changes that happen between when you retrieved the object and when you save it._
   *
   * @api public
   * @method unshift
   * @memberOf MongooseArray
   */

  unshift() {
    _checkManualPopulation(this, arguments);

    let values = [].map.call(arguments, this._cast, this);
    values = this[arraySchemaSymbol].applySetters(values, this[arrayParentSymbol]);
    [].unshift.apply(this, values);
    this._registerAtomic('$set', this);
    this._markModified();
    return this.length;
  }
}

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

/*!
 * ignore
 */

function _checkManualPopulation(arr, docs) {
  const ref = arr == null ?
    null :
    get(arr[arraySchemaSymbol], 'caster.options.ref', null);
  if (arr.length === 0 &&
      docs.length > 0) {
    if (_isAllSubdocs(docs, ref)) {
      arr[arrayParentSymbol].populated(arr[arrayPathSymbol], [], { model: docs[0].constructor });
    }
  }
}

module.exports = CoreMongooseArray;