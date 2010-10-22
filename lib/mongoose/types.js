
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

var sys = require("sys");
// Object
var toString = Object.prototype.toString;
type('object')
  .set(function (val, path) {
    for (prop in val) {
      sys.log(sys.inspect(this));
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
          delete this._.doc[path];
          delete this._.dbrefs[path];
          if (fn) fn();
        });
      }.bind(this)
    };
    return promise;
  });

// TODO setup fo dbrefArray
type('dbrefArray')
  /**
   * @param {Object|Document} val could be a hash or a Document
   * @param {String} path is the path to the DBRef
   */
  .set( function (val, path) {
    var type = this._schema.paths[path],
        subtype = type.subtype,
        member;
    if (!(val instanceof Array)) throw new Error("You must pass in an array.");
    for (var i = 0, len = val.length; i < len; i++) {
      member = val[i];
      if (!(member instanceof Document) && typeof member === "object") {
        // Convert member objects to Document instances
        val[i] = new subtype(member);
      }
      if (member instanceof Document) {
        if (typeof member.id !== "undefined") {
          val[i] = member;
        } else {
          throw new Error("The member type for a DBRef collection must have an oid");
        }
      }
    }
    this._.dbrefArrays[path] = val;
    return val.map( function (el, idx) {
      return {'$ref': el._schema._collection, '$id': el._.doc._id};
    });
  })
  .get( function (val, path) {
    var lazy = new Lazy(),
        i, l,
        surfaceArr = this._.dbrefArrays[path],
        baseArr = this._.doc[path],
        memberType = this._schema.paths[path].subtype,
        count = 0, allmatch;
    process.nextTick( function () {
      if (surfaceArr) {
        allmatch = true;
        for (i = 0, l = surfaceArr.length; i < l; i++) {
          if (surfaceArr[i].id !== baseArr[i]['$id'].toHexString()) {
            allmatch = false;
          }
        }
        if (allmatch) {
          // If the bubbled up and bubbled down versions match
          for (i = 0, l = surfaceArr.length; i < l; i++) {
            lazy.emit("data", surfaceArr[i]);
          }
          lazy.emit("end");
        } else {
          // If we set the bubbled down data after the bubbled up version has been set
          surfaceArr.clear();
          for (i = 0, l = baseArr.length; i < l; i++) {
            memberType.findById(baseArr[i]['$id'].toHexString(), function (j) {
              return function (record) {
                surfaceArr[j] = record;
                lazy.emit("data", record);
                if (++count === l) lazy.emit("end");
              };
            }(i));
          }
        }
      } else if (val instanceof Array) {
        // If we have set an array directly on this._.doc -- only set the bubbled down version
        surfaceArr = this._.dbrefArrays[path] = [];
        for (i = 0, l = baseArr.length; i < l; i++) {
          memberType.findById(baseArr[i]['$id'].toHexString(), function (j) {
            return function (record) {
              surfaceArr[j] = record;
              lazy.emit("data", record); // TODO This may not emit in order; fix this
              if (++count === l) lazy.emit("end");
            };
          }(i));
        }
      } else if (typeof val === "undefined") {
        // If we have not assigned anything to the dbref attribute
        lazy.emit("end");
      } else {
        throw new Error("Argument error - " + val);
      }
    });
    return lazy;
  });
