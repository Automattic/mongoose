
/*!
 * Module dependencies.
 */

var SchemaType = require('../schematype')
  , ArrayType = require('./array')
  , MongooseDocumentArray = require('../types/documentarray')
  , Subdocument = require('../types/embedded')
  , CastError = SchemaType.CastError
  , Document = require('../document');

/**
 * SubdocsArray SchemaType constructor
 *
 * @param {String} key
 * @param {Schema} schema
 * @param {Object} options
 * @inherits SchemaArray
 * @api private
 */

function DocumentArray (key, schema, options) {
  // compile an embedded document for this schema
  // TODO Move this into parent model compilation for performance improvement?
  function EmbeddedDocument () {
    Subdocument.apply(this, arguments);
  };

  EmbeddedDocument.prototype.__proto__ = Subdocument.prototype;
  EmbeddedDocument.prototype._setSchema(schema);
  EmbeddedDocument.schema = schema;

  // apply methods
  for (var i in schema.methods) {
    EmbeddedDocument.prototype[i] = schema.methods[i];
  }

  // apply statics
  for (var i in schema.statics)
    EmbeddedDocument[i] = schema.statics[i];

  EmbeddedDocument.options = options;
  this.schema = schema;

  ArrayType.call(this, key, EmbeddedDocument, options);

  this.schema = schema;
  var path = this.path;
  var fn = this.defaultValue;

  this.default(function(){
    var arr = fn.call(this);
    if (!Array.isArray(arr)) arr = [arr];
    return new MongooseDocumentArray(arr, path, this);
  });
};

/*!
 * Inherits from ArrayType.
 */

DocumentArray.prototype.__proto__ = ArrayType.prototype;

/**
 * Performs local validations first, then validations on each embedded doc
 *
 * @api private
 */

DocumentArray.prototype.doValidate = function (array, fn, scope) {
  var self = this;
  SchemaType.prototype.doValidate.call(this, array, function(err){
    if (err) return fn(err);

    var count = array && array.length
      , error = false;

    if (!count) return fn();

    array.forEach(function(doc, index){
      doc.validate(function(err){
        if (err && !error){
          // rewrite they key
          err.key = self.key + '.' + index + '.' + err.key;
          fn(err);
          error = true;
        } else {
          --count || fn();
        }
      });
    });
  }, scope);
};

/**
 * Casts contents
 *
 * @param {Object} value
 * @param {Document} document that triggers the casting
 * @api private
 */

DocumentArray.prototype.cast = function (value, doc, init, prev) {
  var subdoc
    , i

  if (Array.isArray(value)) {
    if (!(value instanceof MongooseDocumentArray)) {
      value = new MongooseDocumentArray(value, this.path, doc);
    }

    i = value.length;

    while (i--) {
      if (!(value[i] instanceof Subdocument)) {
        if (init) {
          subdoc = new this.casterConstructor(null, value, true);
          value[i] = subdoc.init(value[i]);
        } else {
          if (prev && (subdoc = prev.id(value[i]._id))) {
            // handle resetting doc with existing id but differing data
            // doc.array = [{ doc: 'val' }]
            subdoc.set(value[i]);
          } else {
            subdoc = new this.casterConstructor(value[i], value);
          }

          // if set() is hooked it will have no return value
          // see gh-746
          value[i] = subdoc;
        }
      }
    }

    return value;
  } else {
    return this.cast([value], doc, init, prev);
  }

  throw new CastError('documentarray', value);
};

/*!
 * Module exports.
 */

module.exports = DocumentArray;
