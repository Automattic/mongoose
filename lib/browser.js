exports.Error = require('./Error');
exports.Schema = require('./schema');
exports.Types = require('./types');
exports.VirtualType = require('./virtualtype');
exports.SchemaType = require('./schematype.js');
exports.utils = require('./utils.js');

var coreDocument = require('./document');

exports.Document = function Document( obj, schema, skipId ) {
  if ( !(this instanceof Document) )
    return new Document( obj, schema, skipId );

  if ( !schema ){
    throw new exports.Error.MissingSchemaError();
  }

  this.$__setSchema(schema);

  coreDocument.apply(this, obj, !!skipId);

  this.init(obj);
};

exports.Document.prototype = new coreDocument(null, null, null, true);

// Small hacks to make browserify include variable-path requires
require('./drivers/node-mongodb-native/binary');

if (typeof window !== 'undefined') {
  window.mongoose = module.exports;
}
