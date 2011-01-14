
/**
 * Module dependencies.
 */

var SchemaType = require('../schematype')
  , ArrayType = require('./array')
  , MongooseDocumentArray = require('../types/documentarray')
  , EmbeddedDocument = require('../types/document')
  , CastError = SchemaType.CastError;

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
  function cast(){
    EmbeddedDocument.apply(this, arguments);
  };
  cast.name = 'EmbeddedDocument';
  cast.prototype.__proto__ = EmbeddedDocument.prototype;
  cast.prototype.schema = schema;

  ArrayType.call(this, key, cast, options);
};

/**
 * Inherits from ArrayType.
 */

DocumentArray.prototype.__proto__ = ArrayType.prototype;

/**
 * Returns the init value.
 *
 * @api private
 */

DocumentArray.prototype.initValue = function () {
  return new MongooseDocumentArray();
};

/**
 * Performs local validations first, then validations on each embedded doc
 *
 * @api private
 */

DocumentArray.prototype.doValidate = function (array, fn, scope) {
  var self = this;
  ArrayType.prototype.doValidate.call(array, function(err){
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
 * @api private
 */

DocumentArray.prototype.cast = function (value) {
  if (Array.isArray(value)){
    var caster = this.caster;
    return value.map(function(v){
      if (!(v instanceof EmbeddedDocument)){
        var doc = new caster;
        return doc.init(v);
      }
      return v;
    });
  }
  throw new CastError('document', value, caster);
};

/**
 * Module exports.
 */

module.exports = DocumentArray;
