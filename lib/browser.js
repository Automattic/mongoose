exports.Schema = require('../lib/schema');
exports.Types = require('../lib/types');

var coreDocument = require('../lib/document');

exports.Document = function(obj, schema, skipId) {
  this.schema = schema;

  coreDocument.apply(this, obj, !!skipId);
};

exports.Document.prototype.__proto__ = coreDocument.prototype;

// Small hacks to make browserify include variable-path requires
require('./drivers/node-mongodb-native/binary');

if (typeof window !== 'undefined') {
  window.mongoose = module.exports;
}
