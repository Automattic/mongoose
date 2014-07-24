exports.Schema = require('./schema');
exports.Types = require('./types');
exports.SchemaType = require('./schematype.js');

var coreDocument = require('./document');

exports.Document = function(obj, schema, skipId) {
  this.schema = schema;

  coreDocument.apply(this, obj, !!skipId);

  this.init(obj);
};

exports.Document.prototype.__proto__ = coreDocument.prototype;

// Small hacks to make browserify include variable-path requires
require('./drivers/node-mongodb-native/binary');

if (typeof window !== 'undefined') {
  window.mongoose = module.exports;
}
