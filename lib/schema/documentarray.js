
/*!
 * Module dependencies.
 */

var SchemaType = require('../schematype')
  , ArrayType = require('./array')
  , MongooseDocumentArray = require('../types/documentarray')
  , MongooseArray = require('../types/array')
  , Subdocument = require('../types/embedded')
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
  function EmbeddedDocument () {
    Subdocument.apply(this, arguments);
  }

  EmbeddedDocument.prototype.__proto__ = Subdocument.prototype;
  EmbeddedDocument.prototype.$__setSchema(schema);
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

  SchemaType.prototype.doValidate.call(this, array, function (err) {
    if (err) return fn(err);

    var count = array && array.length
      , error;

    if (!count) return fn();

    // zero the count out
    count = 0;

    // we need some methods off of the DocumentArray to parse this
    var orig_proto = array.__proto__;
    array.__proto__ = MongooseArray.prototype;
    var dim = 1;
    // time to calculate the dimension of the array
    if (array[0] instanceof Array) {
      var next = array[0];
      while (next instanceof Array) {
        dim++;
        next = next[0];
      }
    }

    var indices = [];
    for (var x=0;x<dim;x++) {
      indices.push(0);
    }
    var il = indices.length;
    while(array.length > indices[0]) {
      count++;
      var val = array._getValueByIndex(indices);
      // this handles the case where there are undefined values in the
      // array, this should be the only case for which this does not
      // conform to the schema
      if (!val) {
        indices[0]++;
        --count || fn();
        continue;
      }

      ;(function (i) {
        val.validate(function (err) {
          if (err && !error) {
            // rewrite the key
            err.key = self.key + '.' + i + '.' + err.key;
            return fn(error = err);
          }
          --count || fn();
        });
      })(count);

      // time to deal with incrementing the index array

      var incIndex = il - 1;
      indices[incIndex]++;
      var incLen = array._getValueByIndex(indices.slice(0,incIndex)).length;

      while(incLen <= indices[incIndex]) {
        // we just ran over this index, reset it to zero
        indices[incIndex] = 0;

        // decrease the incIndex and increment the next index
        incIndex--;
        if (incIndex < 0) {
          // reached the final index, break
          break;
        }
        indices[incIndex]++;

        // get the length of the dimension we just incremented
        incLen = array._getValueByIndex(indices.slice(0,incIndex)).length;
      }
      if (incIndex < 0) {
        // continue to break out after last index has been cast
        break;
      }
    }
    array.__proto__ = orig_proto;
  }, scope);
};

DocumentArray.prototype.cast = function (value, doc, init, prev) {

  if (!Array.isArray(value)) {
    return this.cast([value], doc, init, prev);
  }

  if (!(value instanceof MongooseDocumentArray)) {
    value = new MongooseDocumentArray(value, this.path, doc);
  }

  // get index array
  var dim = this.options.arrayDimension || 1;
  var indices = [];

  for (var x=0;x<dim;x++) {
    indices.push(0);
  }

  var il = indices.length;
  while(value.length > indices[0]) {
     var val = value._getValueByIndex(indices);
    // this handles the case where there are undefined values in the
    // array, this should be the only case for which this does not
    // conform to the schema
    if (!val) {
      indices[0]++;
      continue;
    }
    // make val an array
    val = [val];
    val = new MongooseDocumentArray(val, this.path, doc);

    // we are always going to be sending a single element array... this looks
    // ridiculous, but it is mainly to allow for us to plug in better to the
    // existing code base
    value._setValueByIndex(indices, this.castOne(val, doc, init, prev)[0]);
    // time to deal with incrementing the index array

    var incIndex = il - 1;
    indices[incIndex]++;
    var incLen = value._getValueByIndex(indices.slice(0,incIndex)).length;

    while(incLen <= indices[incIndex]) {
      // we just ran over this index, reset it to zero
      indices[incIndex] = 0;

      // decrease the incIndex and increment the next index
      incIndex--;
      if (incIndex < 0) {
        // reached the final index, break
        break;
      }
      indices[incIndex]++;

      // get the length of the dimension we just incremented
      incLen = value._getValueByIndex(indices.slice(0,incIndex)).length;
    }
    if (incIndex < 0) {
      // continue to break out after last index has been cast
      break;
    }
  }

  return value;
}

/**
 * Casts contents
 *
 * @param {Object} value
 * @param {Document} document that triggers the casting
 * @api private
 */

DocumentArray.prototype.castOne = function (value, doc, init, prev) {
  var selected
    , subdoc
    , i


  i = value.length;

  while (i--) {
    if (!(value[i] instanceof Subdocument) && value[i]) {
      if (init) {
        selected || (selected = scopePaths(this, doc.$__.selected, init));
        subdoc = new this.casterConstructor(null, value, true, selected);
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
}

/*!
 * Scopes paths selected in a query to this array.
 * Necessary for proper default application of subdocument values.
 *
 * @param {DocumentArray} array - the array to scope `fields` paths
 * @param {Object|undefined} fields - the root fields selected in the query
 * @param {Boolean|undefined} init - if we are being created part of a query result
 */

function scopePaths (array, fields, init) {
  if (!(init && fields)) return undefined;

  var path = array.path + '.'
    , keys = Object.keys(fields)
    , i = keys.length
    , selected = {}
    , hasKeys
    , key

  while (i--) {
    key = keys[i];
    if (0 === key.indexOf(path)) {
      hasKeys || (hasKeys = true);
      selected[key.substring(path.length)] = fields[key];
    }
  }

  return hasKeys && selected || undefined;
}

/*!
 * Module exports.
 */

module.exports = DocumentArray;
