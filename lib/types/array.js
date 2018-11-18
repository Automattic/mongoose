/*!
 * Module dependencies.
 */

'use strict';

const EmbeddedDocument = require('./embedded');
const Document = require('../document');
const ObjectId = require('./objectid');
const cleanModifiedSubpaths = require('../helpers/document/cleanModifiedSubpaths');
const get = require('lodash.get');
const internalToObjectOptions = require('../options').internalToObjectOptions;
const utils = require('../utils');
const util = require('util');

const isMongooseObject = utils.isMongooseObject;

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
  const arr = [].concat(values);

  const keysMA = Object.keys(MongooseArray.mixin);
  const numKeys = keysMA.length;
  for (let i = 0; i < numKeys; ++i) {
    arr[keysMA[i]] = MongooseArray.mixin[keysMA[i]];
  }

  arr._path = path;
  arr.isMongooseArray = true;
  arr.validators = [];
  arr._atomics = {};
  arr._schema = void 0;
  if (util.inspect.custom) {
    arr[util.inspect.custom] = arr.inspect;
  }

  // Because doc comes from the context of another function, doc === global
  // can happen if there was a null somewhere up the chain (see #3020)
  // RB Jun 17, 2015 updated to check for presence of expected paths instead
  // to make more proof against unusual node environments
  if (doc && doc instanceof Document) {
    arr._parent = doc;
    arr._schema = doc.schema.path(path);
  }

  return arr;
}

MongooseArray.mixin = {
  /*!
   * ignore
   */
  toBSON: function() {
    return this.toObject(internalToObjectOptions);
  },

  /**
   * Stores a queue of atomic operations to perform
   *
   * @property _atomics
   * @api private
   */

  _atomics: undefined,

  /**
   * Parent owner document
   *
   * @property _parent
   * @api private
   * @memberOf MongooseArray
   */

  _parent: undefined,

  /**
   * Casts a member based on this arrays schema.
   *
   * @param {any} value
   * @return value the casted value
   * @method _cast
   * @api private
   * @memberOf MongooseArray
   */

  _cast: function(value) {
    let populated = false;
    let Model;

    if (this._parent) {
      populated = this._parent.populated(this._path, true);
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
      return this._schema.caster.applySetters(value, this._parent, true);
    }

    return this._schema.caster.applySetters(value, this._parent, false);
  },

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

  _markModified: function(elem, embeddedPath) {
    const parent = this._parent;
    let dirtyPath;

    if (parent) {
      dirtyPath = this._path;

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
  },

  /**
   * Register an atomic operation with the parent.
   *
   * @param {Array} op operation
   * @param {any} val
   * @method _registerAtomic
   * @api private
   * @memberOf MongooseArray
   */

  _registerAtomic: function(op, val) {
    if (op === '$set') {
      // $set takes precedence over all other ops.
      // mark entire array modified.
      this._atomics = {$set: val};
      return this;
    }

    const atomics = this._atomics;

    // reset pop/shift after save
    if (op === '$pop' && !('$pop' in atomics)) {
      const _this = this;
      this._parent.once('save', function() {
        _this._popped = _this._shifted = null;
      });
    }

    // check for impossible $atomic combos (Mongo denies more than one
    // $atomic op on a single path
    if (this._atomics.$set ||
        Object.keys(atomics).length && !(op in atomics)) {
      // a different op was previously registered.
      // save the entire thing.
      this._atomics = {$set: this};
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
  },

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

  $__getAtomics: function() {
    const ret = [];
    const keys = Object.keys(this._atomics);
    let i = keys.length;

    const opts = Object.assign({}, internalToObjectOptions, { _isNested: true });

    if (i === 0) {
      ret[0] = ['$set', this.toObject(opts)];
      return ret;
    }

    while (i--) {
      const op = keys[i];
      let val = this._atomics[op];

      // the atomic values which are arrays are not MongooseArrays. we
      // need to convert their elements as if they were MongooseArrays
      // to handle populated arrays versus DocumentArrays properly.
      if (isMongooseObject(val)) {
        val = val.toObject(opts);
      } else if (Array.isArray(val)) {
        val = this.toObject.call(val, opts);
      } else if (val != null && Array.isArray(val.$each)) {
        val.$each = this.toObject.call(val.$each, opts);
      } else if (val.valueOf) {
        val = val.valueOf();
      }

      if (op === '$addToSet') {
        val = {$each: val};
      }

      ret.push([op, val]);
    }

    return ret;
  },

  /**
   * Returns the number of pending atomic operations to send to the db for this array.
   *
   * @api private
   * @return {Number}
   * @method hasAtomics
   * @memberOf MongooseArray
   */

  hasAtomics: function hasAtomics() {
    if (!(this._atomics && this._atomics.constructor.name === 'Object')) {
      return 0;
    }

    return Object.keys(this._atomics).length;
  },

  /**
   * Internal helper for .map()
   *
   * @api private
   * @return {Number}
   * @method _mapCast
   * @memberOf MongooseArray
   */
  _mapCast: function(val, index) {
    return this._cast(val, this.length + index);
  },

  /**
   * Wraps [`Array#push`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/push) with proper change tracking.
   *
   * @param {Object} [args...]
   * @api public
   * @method push
   * @memberOf MongooseArray
   */

  push: function() {
    _checkManualPopulation(this, arguments);
    let values = [].map.call(arguments, this._mapCast, this);
    values = this._schema.applySetters(values, this._parent, undefined,
      undefined, { skipDocumentArrayCast: true });
    const ret = [].push.apply(this, values);

    this._registerAtomic('$push', values);
    this._markModified();
    return ret;
  },

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

  nonAtomicPush: function() {
    const values = [].map.call(arguments, this._mapCast, this);
    const ret = [].push.apply(this, values);
    this._registerAtomic('$set', this);
    this._markModified();
    return ret;
  },

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

  $pop: function() {
    this._registerAtomic('$pop', 1);
    this._markModified();

    // only allow popping once
    if (this._popped) {
      return;
    }
    this._popped = true;

    return [].pop.call(this);
  },

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
    const cur = this._parent.get(this._path);
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
    if (cleanModifiedSubpaths(this._parent, this._path) > 0) {
      this._registerAtomic('$set', this);
    }

    return this;
  },

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

  splice: function splice() {
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
      this._markModified();
      cleanModifiedSubpaths(this._parent, this._path);
    }

    return ret;
  },

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

  unshift: function() {
    _checkManualPopulation(this, arguments);

    let values = [].map.call(arguments, this._cast, this);
    values = this._schema.applySetters(values, this._parent);
    [].unshift.apply(this, values);
    this._registerAtomic('$set', this);
    this._markModified();
    return this.length;
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
    this._markModified();
    return ret;
  },

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

  addToSet: function addToSet() {
    _checkManualPopulation(this, arguments);

    let values = [].map.call(arguments, this._mapCast, this);
    values = this._schema.applySetters(values, this._parent);
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
  },

  /**
   * Returns a native js Array.
   *
   * @param {Object} options
   * @return {Array}
   * @api public
   * @method toObject
   * @memberOf MongooseArray
   */

  toObject: function(options) {
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
  },

  /**
   * Helper for console.log
   *
   * @api public
   * @method inspect
   * @memberOf MongooseArray
   */

  inspect: function() {
    return JSON.stringify(this);
  },

  /**
   * Return the index of `obj` or `-1` if not found.
   *
   * @param {Object} obj the item to look for
   * @return {Number}
   * @api public
   * @method indexOf
   * @memberOf MongooseArray
   */

  indexOf: function indexOf(obj) {
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
};

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
  const ref = get(arr, '_schema.caster.options.ref', null);
  if (arr.length === 0 &&
      docs.length > 0) {
    if (_isAllSubdocs(docs, ref)) {
      arr._parent.populated(arr._path, [], { model: docs[0].constructor });
    }
  }
}

/*!
 * Module exports.
 */

module.exports = exports = MongooseArray;
