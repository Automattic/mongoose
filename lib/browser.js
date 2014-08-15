exports.Schema = require('./schema');
exports.Types = require('./types');
exports.SchemaType = require('./schematype.js');

var coreDocument = require('./document');

exports.Document = function(obj, schema, skipId) {
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
