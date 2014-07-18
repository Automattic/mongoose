exports.Schema = require('../lib/schema');
exports.Types = require('../lib/types');

var Document = require('../lib/document');

exports.Document = function(obj, schema, skipId) {
  this.schema = schema;

  Document.apply(this, obj, !!skipId);
};
exports.Document.__proto__ = Document;
