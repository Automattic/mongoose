exports.Error = require('./Error');
exports.Schema = require('./schema');
exports.Types = require('./types');
exports.VirtualType = require('./virtualtype');
exports.SchemaType = require('./schematype.js');
exports.utils = require('./utils.js');

exports.Document = require('./document');

// Small hacks to make browserify include variable-path requires
require('./drivers/node-mongodb-native/binary');

if (typeof window !== 'undefined') {
  window.mongoose = module.exports;
}
