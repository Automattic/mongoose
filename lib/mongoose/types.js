
/**
 * Module dependencies.
 */

require.paths.unshift(__dirname + "/../../support/js-traverse/lib"); // So node-lazy can find 'traverse' if we aren't using npm
var mongoose = module.parent.exports
  , type = mongoose.type
  , Doc = require("./document")
  , EmbeddedArray = Doc.EmbeddedArray
  , Document = Doc.Document
  , ObjectID = mongoose.ObjectID
  , Subclass = require('./util').subclass
  , Lazy = require("../../support/node-lazy/lazy");

// String
type('string')
  .set(function(val){
    switch (typeof val) {
      case 'string':
        return val;
      case 'number':
        return String(val);
      default:
        return Error;
    }
  })
  .setStrict(function(val){
    return 'string' == typeof val
      ? val
      : Error;
  });

// Array  
type('array')
  .set(function (val, path) {
    var subtype = this._schema.paths[path].subtype;
    this._.arrays[path] = new EmbeddedArray(val, path, subtype, this, false);
    this._.dirty[path] = []; // Keeps track of dirty indexes
    return this._.arrays[path];
  })
  .set(function(val){
    return (val instanceof Array) ? val : [val];
  })
  ._pre('hydrate', function (val, path) {
    var subtype = this._schema.paths[path].subtype;
    this._.arrays[path] = new EmbeddedArray(val, path, subtype, this, true);
    return this._.arrays[path];
  })
  .setStrict(function(val){
    return Array.isArray(val)
      ? val
      : Error;
  });

// Object
var toString = Object.prototype.toString;
type('object')
  .set(function (val, path) {
    for (prop in val) {
      this.set(path + '.' + prop, val[prop]);
    }
    return val;
  })
  .set(function(val){
    return (typeof val == 'object') ? val : {};
  })
  .setStrict(function(val){
    return '[object Object]' == toString.call(val)
      ? val
      : Error;
  });

// OID
type('oid')
  .default(function(){
    return new ObjectID();
  })
  .setup(function(key,path){
    if (key.charAt(0) == '_'){
      this.virtual(key.substr(1))
        .get(function(){
          return this.get(path).toHexString();
        })
        .set(function(val){
          return this.set(path, val);
        });
    }
  })
  .set(function(val){
    return val
      ? ((val instanceof ObjectID || val.toHexString) 
        ? val
        : ObjectID.createFromHexString(val))
      : new ObjectID();
  });

// Number
type('number')
  .default(0)
  .set(function(val){
    if ('number' == typeof val) return val;
    val = parseFloat(String(val));
    return isNaN(val)
      ? Error
      : val;
  })
  .setStrict(function(val){
    return 'number' == typeof val
      ? val
      : Error;
  });

// Boolean
type('boolean', 'bool')
  .default(false)
  .set(function(val){
    return !!val;
  })
  .setStrict(function(val){
    return (true === val || false === val)
      ? val
      : Error;
  })
  .addedTo(function(schema, key){
    var not = 'not' + key.charAt(0).toUpperCase() + key.substr(1);    
    schema.staticGetter(key, function(){
      return this.find(key, true);
    });
    schema.staticGetter(not, function(){
      return this.find(key, false);
    });
  });

// Date
type('date')
  .set(function(val){
    if (val instanceof Date) return val;
    if ('string' != typeof val) return Error;
    val = Date.parse(val);
    return isNaN(val)
      ? Error
      : new Date(val);
  })
  .setStrict(function(val){
    return val instanceof Date
      ? val
      : Error;
  });

// Virtual  
type('virtual');

// Raw
type('raw');

type('dbref')
  .setup(function(key,path){ /** @scope is Schema instance **/
    // Add pre-save function to save dbrefs
    this.pre('save', function (complete) { /** @scope is Document instance **/
      var dbrefTarget = this._.dbrefs[path],
          self = this;
      if (dbrefTarget) {
        dbrefTarget.save( function (errors, record) {
          if (errors) {
            // TODO
          } else {
            self.set(record, path); // Sets the DBRef {$ref: ..., $id: ...} (see set fn below)
          }
          complete();
        });
      } else {
        complete();
      }
    });
  })
  /**
   * @param {Object|Document} val could be a hash or a Document
   * @param {String} path is the path to the DBRef
   */
  .set( function (val, path) {
    var type = this._schema.paths[path];
    if (!(val instanceof Document) && typeof val === "object") {
      var subtype = type.subtype;
      val = new subtype(val);
    }
    if (val instanceof Document) {
      if (typeof val.id !== "undefined") {
        this._.dbrefs[path] = val;
        return {'$ref': val._schema._collection, '$id': val._.doc._id};
      } else {
        // Store the unsaved Document in memory, so we can save it later (upon the parent 'save')
        this._.dbrefs[path] = val;
      }
    } else {
      throw new Error("You must pass in a model instance or a hash representation of its attributes.");
    }
  })
  .get( function (val, path) {
    var promise = {
      do: function (fn) {
        if (this._.dbrefs[path]) {
          if (this._.dbrefs[path].id === this._.doc[path]['$id'].toHexString()) {
            fn(this._.dbrefs[path]);
          } else {
            this._schema.paths[path].subtype.findById(this._.doc[path]['$id'].toHexString(), function (record) {
              fn(record);
            });
          }
        } else if (typeof val === "object") {
          // If we have set a dbref hash {'$ref': ..., '$id': ...} directly on this._.doc
          this._schema.paths[path].subtype.findById(this._.doc[path]['$id'].toHexString(), function (record) {
            this.set(record);
            fn(record);
          });
        } else if (typeof val === "undefined") {
          // If we have not assigned anything to the dbref attribute
          fn();
        } else {
          throw new Error("Argument error - " + val);
        }
      }.bind(this),

      remove: function (fn) {
        var referer = this; // The Document instance containing the dbref
        Doc.Hooks.remove.call(this._.dbrefs[path], function () {
          delete referer._.doc[path];
          delete referer._.dbrefs[path];
          if (fn) fn();
        });
      }.bind(this)
    };
    return promise;
  });

/**
 * @constructor
 * @param {Array} array is an optional list of members we'd like to populate the promise array with.
 */
function PromiseArray (array) {
  this.arr = array;
  this.callbacks = [];
}

PromiseArray.prototype = {
  /**
   * Adds callbacks to the promise that are triggered when the Promise Array has
   * members assigned to it.
   * @param {Function} fn is the callback function
   * @param {Array} args is the Array of arguments we'd like to pass to the callback when it's invoked.
   */
  callback: function (fn, args) {
    if (!this.arr) {
      this.callbacks.push([fn, args]);
    } else {
      fn.apply(this, args);
    }
  },

  /**
   * Assigns members to the Promise Array and triggers all registered callbacks to date.
   * @param {Array} arr is the Array of members we're successfully assigning to this Promise Array
   */
  succeed: function (arr) {
    this.arr = arr;
    var cb, callbacks = this.callbacks;
    while (cb = callbacks.shift()) {
      cb[0].apply(this, cb[1]);
    }
  },

  /**
   * When we have members, then we pass these members to the callback function, fn.
   * @param {Function} fn = function (arrayOfMembers) {...}
   */
  all: function (fn) {
    this.callback(this._all, arguments);
    return this;
  },

  /**
   * This invokes fn, passing it the members associated with this PromiseArray
   * @param {Function} fn = function (arrayOfMembers) {...}
   */
  _all: function (fn) {
    fn(this.arr);
  },
  forEach: function (fn) {
    this.callback(this._forEach, arguments);
    return this;
  },
  _forEach: function (fn) {
    var arr = this.arr;
    for (var i = 0, l = arr.length; i < l; i++) {
      fn(arr[i], i);
    }
  },
  slice: function (start, num, fn) {
    var newPromiseArray = new PromiseArray();
    newPromiseArray.callback(newPromiseArray._slice, arguments);
    this.callback(newPromiseArray.succeed.bind(newPromiseArray));
    return newPromiseArray;
  },
  _slice: function (start, end, fn) {
    var slice = this.arr.slice(start, end);
    fn(slice);
  },
  splice: function () {
    // TODO
    return this;
  },
  _splice: function () {
    // TODO
  },
  filter: function (fn) {
    var newPromiseArray = new PromiseArray();
    newPromiseArray.callback(newPromiseArray._filter, arguments);
    this.callback(newPromiseArray.succeed.bind(newPromiseArray));
    return newPromiseArray;
  },
  _filter: function (fn) {
    var arr = this.arr;
    this.arr = arr.filter(fn);
  },
  map: function (fn) {
    var newPromiseArray = new PromiseArray();
    newPromiseArray.callback(newPromiseArray._map, arguments);
    this.callback(newPromiseArray.succeed.bind(newPromiseArray));
    return newPromiseArray;
  },
  _map: function (fn) {
    var arr = this.arr;
    this.arr = arr.map(fn);
  },
  at: function (index, fn) {
    this.callback(this._at, arguments);
    return this;
  },
  _at: function (index, fn) {
    fn(this.arr[index]);
  },
  clear: function () {
    this.arr.length = 0;
    return this;
  }
};

/**
 * @constructor
 * @param {Array} docs is the Array of members we'd like to initialize the underlying data to
 * @param {Document} parent is the Document instance that owns the array of dbrefs
 * @param {String} path is the property path to the dbref array
 * @param {Boolean|null} hydrate
 */
function DBRefArray (docs, parent, path, hydrate) {
  this.parent = parent;
  this.path = path;
  var memberType = this.memberType = parent._schema.paths[path].subtype, // The dfref array's members' type
      arr = this.arr = [];
  var i, l;
  if (docs) {
    if (hydrate) {
      if (memberType) {
        for (i = 0, l = docs.length; i < l; i++) arr[i] = new memberType(docs[i]);
      } else {
        for (i = 0, l = docs.length; i < l; i++) arr[i] = docs[i];
      }
    } else {
      for (i = 0, l = docs.length; i < l; i++) this.set(i, docs[i]);
    }
  }
  this.callbacks = [];
}

DBRefArray.prototype = {
  // TODO Handling hydration/non-hydration scenarios properly?
  set: function (index, member) {
    var memberType = this.memberType,
        arr = this.arr;;
    if (memberType) {
      if (member instanceof memberType) {
        arr[index] = member;
      } else {
        arr[index] = new memberType(member);
      }
    } else {
      arr[index] = member;
    }
    return this;
  },

  push: function () {
    for (var i = 0, l = arguments.length; i < l; i++) this.set(this.length, arguments[i]);
    return this;
  },

  _whatToFetch: function () {
    var parent = this.parent,
        baseArr = parent._.doc[this.path],
        surfaceArr = this.arr,
        i, ii, j, jj, baseId, anymatch, toFetch = [];
    for (i = 0, ii = baseArr.length; i < ii; i++) {
      baseId = baseArr[i]['$id'].toHexString();
      if (surfaceArr[i] && surfaceArr[i].id === baseId) {
        continue;
      } else {
        anymatch = false;
        for (j = 0, jj = surfaceArr.length; j < jj; j++) {
          if (baseId === surfaceArr[j].id) {
            anymatch = true;
            surfaceArr[i] = surfaceArr[j];
          }
        }
        if (!anymatch) toFetch.push([i, baseId]);
      }
    }
    return toFetch;
  },

  _fetch: function () {
    this.state = 'isFetching';
    var toFetch = this._whatToFetch(),
        memberType = this.memberType,
        index, id, count = 0,
        self = this;
    for (var i = 0, l = toFetch.length; i < l; i++) {
      index = toFetch[i][0];
      id = toFetch[i][1];
      memberType.findById(id, function (_index) {
        return function (member) {
          var cb;
          self.arr[_index] = member;
          if (++count === l) {
            self.state = 'fetched';
            while (cb = self.callbacks.shift()) {
              cb[0].apply(self, cb[1] || [self.arr]); // Pass in the array if we didn't specify args
            }
          }
        };
      }(index));
    }
  },
  
  callback: function (fn, args) {
    var toFetch = this._whatToFetch();
    if (toFetch.length) {
      this.state = 'unfetched';
    } else {
      this.state = 'fetched';
    }
    if (this.state === 'fetched') {
      // Either call the fn immediately
      fn.apply(this, args || [this.arr]);
    } else {
      // Or push it onto the stack
      this.callbacks.push([fn, args]);
      if (this.state !== 'isFetching') {
        // And start the member fetching process if we haven't already
        this._fetch();
      }
    }
  },

  all: PromiseArray.prototype.all,
  _all: PromiseArray.prototype._all,
  forEach: PromiseArray.prototype.forEach,
  _forEach: PromiseArray.prototype._forEach,
  // TODO Make more efficient by only checking for specified range
  slice: PromiseArray.prototype.slice,
  _slice: PromiseArray.prototype._slice,
  splice: PromiseArray.prototype.splice, // TODO
  _splice: PromiseArray.prototype._splice, // TODO
  filter: PromiseArray.prototype.filter,
  _filter: PromiseArray.prototype._filter,
  map: PromiseArray.prototype.map,
  _map: PromiseArray.prototype._map,
  at: function (index, fn) {
    var parent = this.parent,
        baseArr = parent._.doc[this.path],
        surfaceArr = this.arr,
        memberType = this.memberType,
        baseId = baseArr[index]['$id'].toHexString(),
        j, jj, baseId, anymatch;
    if (surfaceArr[index] && surfaceArr[index].id === baseId) {
      fn(surfaceArr[index]);
    } else {
      anymatch = false;
      for (j = 0, jj = surfaceArr.length; j < jj; j++) {
        if (baseId === surfaceArr[j].id) {
          anymatch = true;
          surfaceArr[index] = surfaceArr[j];
          break;
        }
      }
      if (!anymatch) {
        memberType.findById(baseId, function (record) {
          surfaceArr[index] = record;
          fn(record);
        });
      } else {
        fn(surfaceArr[index]);
      }
    }
    return this;
  },
  clear: function () {
    this.arr.length = 0;
    this.parent._.doc[this.path].length = 0;
  }
};

Object.defineProperty(DBRefArray.prototype, 'length', {
  get: function () {
    return this.arr.length;
  }
});


// TODO Dirty attributes?
type('dbrefArray')
  .setup(function(key,path){ /** @scope is Schema instance **/
    // Add pre-save function to save the array of dbref members
    this.pre('save', function (complete) { /** @scope is Document instance **/
      var dbrefs = this._.dbrefArrays[path],
          self = this,
          i, l, dbref, count;
      if (dbrefs) {
        count = 0;
        dbrefs.forEach( function (dbref) {
          if (!dbref.isDirty) {
            count++;
            return;
          }
          dbref.save( function (errors, record) {
            if (errors) {
              // TODO Add errors to parent object
            } else {
              // TODO Any code needed here?
            }
            if (++count === dbrefs.length) complete();
          });
        });
      } else {
        complete();
      }
    });
  })
  /**
   * @param {Array} val is an array of members that are JSON objects or Document instances
   * @param {String} path is the path to the Array of DBRefs
   */
  .set( function (val, path) {
    if (!(val instanceof Array)) throw new Error("You must pass in an array.");
    var type = this._schema.paths[path],
        subtype = type.subtype,
        member;
    for (var i = 0, len = val.length; i < len; i++) {
      member = val[i];
      if (!(member instanceof Document) && typeof member === "object") {
        // Convert member objects to Document instances
        member = new subtype(member);
      }
      if (member instanceof Document) {
        if (typeof member.id !== "undefined") {
          val[i] = member;
        } else {
          throw new Error("The member type for a DBRef collection must have an oid");
        }
      } else {
        throw new Error("Argument error");
      }
    }
    this._.dbrefArrays[path] = new DBRefArray(val, this, path);
    return val.map( function (el, idx) {
      return {'$ref': el._schema._collection, '$id': el._.doc._id};
    });
  })
  .get( function (val, path) {
    // Ideal version of Lazy should behave like an array by setting indexes
    // Ideal version of Lazy should be able to handle data even after it has been emitted
    var lazy = new Lazy(),
        i, l,
        surfaceArr = this._.dbrefArrays[path],
        baseArr = this._.doc[path],
        memberType = this._schema.paths[path].subtype,
        count = 0, allmatch;

    if (!this._.dbrefArrays[path]) {
      this._.dbrefArrays[path] = new DBRefArray(null, this, path);
    }
    return this._.dbrefArrays[path];

    // TODO Remove the following after we check that we're covering similar scenarios in re-write
//    process.nextTick( function () {
//      if (surfaceArr) {
//        allmatch = true;
//        for (i = 0, l = surfaceArr.length; i < l; i++) {
//          if (surfaceArr[i].id !== baseArr[i]['$id'].toHexString()) {
//            allmatch = false;
//          }
//        }
//        if (allmatch) {
//          // If the bubbled up and bubbled down versions match
//          for (i = 0, l = surfaceArr.length; i < l; i++) {
//            lazy.emit("data", surfaceArr[i]);
//          }
//          lazy.emit("end");
//        } else {
//          // If we set the bubbled down data after the bubbled up version has been set
//          surfaceArr.length = 0; // TODO Only retrieve changed ones
//          for (i = 0, l = baseArr.length; i < l; i++) {
//            memberType.findById(baseArr[i]['$id'].toHexString(), function (j) {
//              return function (record) {
//                surfaceArr[j] = record;
//                lazy.emit("data", record);
//                if (++count === l) lazy.emit("end");
//              };
//            }(i));
//          }
//        }
//      } else if (val instanceof Array) {
//        // If we have set an array directly on this._.doc -- only set the bubbled down version
//        surfaceArr = this._.dbrefArrays[path] = [];
//        for (i = 0, l = baseArr.length; i < l; i++) {
//          memberType.findById(baseArr[i]['$id'].toHexString(), function (j) {
//            return function (record) {
//              surfaceArr[j] = record;
//              lazy.emit("data", record); // TODO This may not emit in order; fix this
//              if (++count === l) lazy.emit("end");
//            };
//          }(i));
//        }
//      } else if (typeof val === "undefined") {
//        // If we have not assigned anything to the dbref attribute
//        lazy.emit("end");
//      } else {
//        throw new Error("Argument error - " + val);
//      }
//    });
//    return lazy;
  });
