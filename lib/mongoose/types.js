
/**
 * Module dependencies.
 */

var mongoose = module.parent.exports
  , type = mongoose.type
  , Doc = require("./document")
  , EmbeddedArray = Doc.EmbeddedArray
  , Document = Doc.Document
  , ObjectID = mongoose.ObjectID;

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
    var type = this._schema.paths[path];
    this._.arrays[path] = new EmbeddedArray(val, path, type, this, false);
    this._.dirty[path] = [];
    return this._.arrays[path].arr;
  })
  .set(function(val){
    return (val instanceof Array) ? val : [val];
  })
  ._pre('hydrate', function (val, path) {
    var type = this._schema.paths[path];
    this._.arrays[path] = new EmbeddedArray(val, path, type, this, true);
    return this._.arrays[path].arr;
  })
  .flagDirty( function (path) {
    this._.dirty[path] = [];
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
type('boolean')
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
   */
  .set( function (val, path) {
    var type = this._schema.paths[path];
    if (typeof val === "object") {
      var subtype = type.options;
      val = new subtype(val);
    }
    if (val instanceof Document) {
      if (typeof val.id !== "undefined") {
        this._.dbrefs[path] = val;
        return {'$ref': val._schema._collection, '$id': val._._id};
      } else {
        // Store the unsaved Document in memory, so we can save it later (upon the parent 'save')
        this._.dbrefs[path] = val;
      }
    } else {
      throw new Error("You must pass in a model instance or a hash representation of its attributes.");
    }
  })
  .get( function (val, path) {
    var self = this;
    var promise = {
      do: function (fn) {
        if (self._.dbrefs[path]) {
          fn(self._.dbrefs[path]);
        } else if (typeof val === "object") {
          self._schema.paths[path].options.findById(this._.doc[path].id, function (record) {
            self.set(record);
            fn(record);
          });
        } else if (typeof val === "undefined") {
        } else {
          throw new Error("Argument error");
        }
      }
    };
    return promise;
  });
