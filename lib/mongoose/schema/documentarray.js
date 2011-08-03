
/**
 * Module dependencies.
 */

var SchemaType = require('../schematype')
  , ArrayType = require('./array')
  , MongooseDocumentArray = require('../types/documentarray')
  , Subdocument = require('../types/document')
  , CastError = SchemaType.CastError
  , Document = require('../document');

/**
 * SubdocsArray SchemaType constructor
 *
 * @param {String} key
 * @param {Schema} schema
 * @param {Object} options
 * @api private
 */

function DocumentArray (key, schema, options) {
  // compile an embedded document for this schema
  // TODO Move this into parent model compilation for performance improvement?
  function EmbeddedDocument () {
    Subdocument.apply(this, arguments);
  };

  EmbeddedDocument.prototype.__proto__ = Subdocument.prototype;
  EmbeddedDocument.prototype.schema = schema;
  EmbeddedDocument.schema = schema;

  // apply methods
  for (var i in schema.methods) {
    EmbeddedDocument.prototype[i] = schema.methods[i];
  }

  // apply statics
  for (var i in schema.statics)
    EmbeddedDocument[i] = schema.statics[i];

  ArrayType.call(this, key, EmbeddedDocument, options);

  var self = this;

  this.schema = schema;
  this.default(function(){
    return new MongooseDocumentArray([], self.path, this);
  });
};

/**
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

    var count = array.length
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

DocumentArray.prototype.cast = function (value, doc, useSet) {
  if (Array.isArray(value)) {
    if (!(value instanceof MongooseDocumentArray))
      value = new MongooseDocumentArray(value, this.path, doc);

    for (var i = 0, l = value.length; i < l; i++) {
      if (!(value[i] instanceof Subdocument)) {
        var doc = new this.caster(null, value);

        value[i] = useSet
          ? doc.set (value[i].doc || value[i])
          : doc.init(value[i].doc || value[i]);
      }
    }

    return value;
  } else {
    return this.cast([value], doc);
  }

  throw new CastError('documentarray', value);
};

/**
 * Module exports.
 */

module.exports = DocumentArray;
