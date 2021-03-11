'use strict';

const Document = require('../document');
const EmbeddedDocument = require('./embedded');
const MongooseError = require('../error/mongooseError');
const ObjectId = require('./objectid');
const cleanModifiedSubpaths = require('../helpers/document/cleanModifiedSubpaths');
const get = require('../helpers/get');
const internalToObjectOptions = require('../options').internalToObjectOptions;
const utils = require('../utils');
const util = require('util');

const arrayAtomicsSymbol = require('../helpers/symbols').arrayAtomicsSymbol;
const arrayParentSymbol = require('../helpers/symbols').arrayParentSymbol;
const arrayPathSymbol = require('../helpers/symbols').arrayPathSymbol;
const arraySchemaSymbol = require('../helpers/symbols').arraySchemaSymbol;
const populateModelSymbol = require('../helpers/symbols').populateModelSymbol;
const slicedSymbol = Symbol('mongoose#Array#sliced');

const _basePush = Array.prototype.push;

const validatorsSymbol = Symbol('mongoose#MongooseCoreArray#validators');

/*!
 * ignore
 */

class CoreMongooseArray extends Array {
  get isMongooseArray() {
    return true;
  }

  get validators() {
    return this[validatorsSymbol];
  }

  set validators(v) {
    this[validatorsSymbol] = v;
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
    const keys = Object.keys(this[arrayAtomicsSymbol] || {});
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
        val = { $each: val };
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
   * Atomically shifts the array at most one time per document `save()`.
   *
   * ####NOTE:
   *
   * _Calling this multiple times on an array before saving sends the same command as calling it once._
   * _This update is implemented using the MongoDB [$pop](http://www.mongodb.org/display/DOCS/Updating/#Updating-%24pop) method which enforces this restriction._
   *
   *      doc.array = [1,2,3];
   *
   *      const shifted = doc.array.$shift();
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

  $shift() {
    this._registerAtomic('$pop', -1);
    this._markModified();

    // only allow shifting once
    if (this._shifted) {
      return;
    }
    this._shifted = true;

    return [].shift.call(this);
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
   *      const popped = doc.array.$pop();
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
      Model = populated.options[populateModelSymbol];

      // only objects are permitted so we can safely assume that
      // non-objects are to be interpreted as _id
      if (Buffer.isBuffer(value) ||
          value instanceof ObjectId || !utils.isObject(value)) {
        value = { _id: value };
      }

      // gh-2399
      // we should cast model only when it's not a discriminator
      const isDisc = value.$__schema && value.$__schema.discriminatorMapping &&
          value.$__schema.discriminatorMapping.key !== undefined;
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

  _markModified(elem) {
    const parent = this[arrayParentSymbol];
    let dirtyPath;

    if (parent) {
      dirtyPath = this[arrayPathSymbol];

      if (arguments.length) {
        dirtyPath = dirtyPath + '.' + elem;
      }

      if (dirtyPath != null && dirtyPath.endsWith('.$')) {
        return this;
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
    if (this[slicedSymbol]) {
      return;
    }
    if (op === '$set') {
      // $set takes precedence over all other ops.
      // mark entire array modified.
      this[arrayAtomicsSymbol] = { $set: val };
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
    if (this[arrayAtomicsSymbol].$set || Object.keys(atomics).length && !(op in atomics)) {
      // a different op was previously registered.
      // save the entire thing.
      this[arrayAtomicsSymbol] = { $set: this };
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
          return v.toObject({ transform: false, virtuals: false });
        }));
      } else {
        selector = pullOp['_id'] || (pullOp['_id'] = { $in: [] });
        selector['$in'] = selector['$in'].concat(val);
      }
    } else if (op === '$push') {
      atomics.$push = atomics.$push || { $each: [] };
      if (val != null && utils.hasUserDefinedProperty(val, '$each')) {
        atomics.$push = val;
      } else {
        atomics.$push.$each = atomics.$push.$each.concat(val);
      }
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
   *     const added = doc.array.addToSet(4,5);
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

  includes(obj, fromIndex) {
    const ret = this.indexOf(obj, fromIndex);
    return ret !== -1;
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

  indexOf(obj, fromIndex) {
    if (obj instanceof ObjectId) {
      obj = obj.toString();
    }

    fromIndex = fromIndex == null ? 0 : fromIndex;
    const len = this.length;
    for (let i = fromIndex; i < len; ++i) {
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

  pop() {
    const ret = [].pop.call(this);
    this._registerAtomic('$set', this);
    this._markModified();
    return ret;
  }

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

  pull() {
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
        return v.$__getValue('_id') || v;
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
  }

  /**
   * Wraps [`Array#push`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/push) with proper change tracking.
   *
   * ####Example:
   *
   *     const schema = Schema({ nums: [Number] });
   *     const Model = mongoose.model('Test', schema);
   *
   *     const doc = await Model.create({ nums: [3, 4] });
   *     doc.nums.push(5); // Add 5 to the end of the array
   *     await doc.save();
   *
   *     // You can also pass an object with `$each` as the
   *     // first parameter to use MongoDB's `$position`
   *     doc.nums.push({
   *       $each: [1, 2],
   *       $position: 0
   *     });
   *     doc.nums; // [1, 2, 3, 4, 5]
   *
   * @param {Object} [args...]
   * @api public
   * @method push
   * @memberOf MongooseArray
   */

  push() {
    let values = arguments;
    let atomic = values;
    const isOverwrite = values[0] != null &&
      utils.hasUserDefinedProperty(values[0], '$each');
    if (isOverwrite) {
      atomic = values[0];
      values = values[0].$each;
    }

    if (this[arraySchemaSymbol] == null) {
      return _basePush.apply(this, values);
    }

    _checkManualPopulation(this, values);

    const parent = this[arrayParentSymbol];
    values = [].map.call(values, this._mapCast, this);
    values = this[arraySchemaSymbol].applySetters(values, parent, undefined,
      undefined, { skipDocumentArrayCast: true });
    let ret;
    const atomics = this[arrayAtomicsSymbol];

    if (isOverwrite) {
      atomic.$each = values;

      if (get(atomics, '$push.$each.length', 0) > 0 &&
          atomics.$push.$position != atomics.$position) {
        throw new MongooseError('Cannot call `Array#push()` multiple times ' +
          'with different `$position`');
      }

      if (atomic.$position != null) {
        [].splice.apply(this, [atomic.$position, 0].concat(values));
        ret = this.length;
      } else {
        ret = [].push.apply(this, values);
      }
    } else {
      if (get(atomics, '$push.$each.length', 0) > 0 &&
          atomics.$push.$position != null) {
        throw new MongooseError('Cannot call `Array#push()` multiple times ' +
          'with different `$position`');
      }
      atomic = values;
      ret = [].push.apply(this, values);
    }
    this._registerAtomic('$push', atomic);
    this._markModified();
    return ret;
  }

  /**
   * Alias of [pull](#mongoosearray_MongooseArray-pull)
   *
   * @see MongooseArray#pull #types_array_MongooseArray-pull
   * @see mongodb http://www.mongodb.org/display/DOCS/Updating/#Updating-%24pull
   * @api public
   * @memberOf MongooseArray
   * @instance
   * @method remove
   */

  remove() {
    return this.pull.apply(this, arguments);
  }

  /**
   * Sets the casted `val` at index `i` and marks the array modified.
   *
   * ####Example:
   *
   *     // given documents based on the following
   *     const Doc = mongoose.model('Doc', new Schema({ array: [Number] }));
   *
   *     const doc = new Doc({ array: [2,3,4] })
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

  set(i, val) {
    const value = this._cast(val, i);
    this[i] = value;
    this._markModified(i);
    return this;
  }

  /**
   * Wraps [`Array#shift`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/unshift) with proper change tracking.
   *
   * ####Example:
   *
   *     doc.array = [2,3];
   *     const res = doc.array.shift();
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

  shift() {
    const ret = [].shift.call(this);
    this._registerAtomic('$set', this);
    this._markModified();
    return ret;
  }

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
   * @see https://masteringjs.io/tutorials/fundamentals/array-sort
   */

  sort() {
    const ret = [].sort.apply(this, arguments);
    this._registerAtomic('$set', this);
    return ret;
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
   * @see https://masteringjs.io/tutorials/fundamentals/array-splice
   */

  splice() {
    let ret;

    _checkManualPopulation(this, Array.prototype.slice.call(arguments, 2));

    if (arguments.length) {
      let vals;
      if (this[arraySchemaSymbol] == null) {
        vals = arguments;
      } else {
        vals = [];
        for (let i = 0; i < arguments.length; ++i) {
          vals[i] = i < 2 ?
            arguments[i] :
            this._cast(arguments[i], arguments[0] + (i - 2));
        }
      }

      ret = [].splice.apply(this, vals);
      this._registerAtomic('$set', this);
    }

    return ret;
  }

  /*!
   * ignore
   */

  slice() {
    const ret = super.slice.apply(this, arguments);
    ret[arrayParentSymbol] = this[arrayParentSymbol];
    ret[arraySchemaSymbol] = this[arraySchemaSymbol];
    ret[arrayAtomicsSymbol] = this[arrayAtomicsSymbol];
    ret[arrayPathSymbol] = this[arrayPathSymbol];
    ret[slicedSymbol] = true;
    return ret;
  }

  /*!
   * ignore
   */

  filter() {
    const ret = super.filter.apply(this, arguments);
    ret[arrayParentSymbol] = this[arrayParentSymbol];
    ret[arraySchemaSymbol] = this[arraySchemaSymbol];
    ret[arrayAtomicsSymbol] = this[arrayAtomicsSymbol];
    ret[arrayPathSymbol] = this[arrayPathSymbol];
    return ret;
  }

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
      // Ensure return value is a vanilla array, because in Node.js 6+ `map()`
      // is smart enough to use the inherited array's constructor.
      return [].concat(this).map(function(doc) {
        return doc instanceof Document
          ? doc.toObject(options)
          : doc;
      });
    }

    return [].concat(this);
  }

  /**
   * Wraps [`Array#unshift`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/unshift) with proper change tracking.
   *
   * ####Note:
   *
   * _marks the entire array as modified, which if saved, will store it as a `$set` operation, potentially overwriting any changes that happen between when you retrieved the object and when you save it._
   *
   * @api public
   * @method unshift
   * @memberOf MongooseArray
   */

  unshift() {
    _checkManualPopulation(this, arguments);

    let values;
    if (this[arraySchemaSymbol] == null) {
      values = arguments;
    } else {
      values = [].map.call(arguments, this._cast, this);
      values = this[arraySchemaSymbol].applySetters(values, this[arrayParentSymbol]);
    }

    [].unshift.apply(this, values);
    this._registerAtomic('$set', this);
    this._markModified();
    return this.length;
  }
}

if (util.inspect.custom) {
  CoreMongooseArray.prototype[util.inspect.custom] =
    CoreMongooseArray.prototype.inspect;
}

/*!
 * ignore
 */

function _isAllSubdocs(docs, ref) {
  if (!ref) {
    return false;
  }

  for (const arg of docs) {
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
      arr[arrayParentSymbol].populated(arr[arrayPathSymbol], [], {
        [populateModelSymbol]: docs[0].constructor
      });
    }
  }
}

module.exports = CoreMongooseArray;
