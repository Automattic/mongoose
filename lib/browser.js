exports.Error = require('./error');
exports.Schema = require('./schema');
exports.Types = require('./types');
exports.VirtualType = require('./virtualtype');
exports.SchemaType = require('./schematype.js');
exports.utils = require('./utils.js');

exports.Document = require('./document_provider.js')();

if (typeof window !== 'undefined') {
  window.mongoose = module.exports;
  window.Buffer = Buffer;
}
