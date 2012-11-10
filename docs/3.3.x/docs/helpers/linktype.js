
var types = {};
types.Object = 'https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Object';
types.Boolean = 'https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Boolean'
types.String = 'https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/String'
types.Array = 'https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array'
types.Number = 'https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Number'
types.Date = 'https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Date'
types.Function = 'https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Function'
types.RegExp = 'https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/RegExp'
types.Error = 'https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error'
types['undefined'] = 'https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/undefined'

// mongoose
types.ObjectId = '#types_objectid_ObjectId';
types.MongooseDocumentArray = '#types_documentarray_MongooseDocumentArray';
types.MongooseArray = '#types_array_MongooseArray';
types.Binary = 'https://github.com/mongodb/js-bson/blob/master/lib/bson/binary.js';
types.Query = '#query-js';
types.QueryStream = '#querystream_QueryStream';
types.Document = '#document_Document';
types.EmbeddedDocument = '#types_embedded_EmbeddedDocument';
types.Document = '#document_Document';
types.Model = '#model_Model';
types.Connection = '#connection_Connection';
types.Collection = '#collection_Collection';
types.Schema = '#schema_Schema';
types.Promise = '#promise_Promise';
types.Mongoose = '#index_Mongoose';
types.MongooseError = '#error_MongooseError';
types.Type = '#schematype_SchemaType'; // ?
types.SchemaType = '#schematype_SchemaType';
types.SchemaArray = '#schema_array_SchemaArray';
types.Mixed = '#schema_mixed_Mixed';
types.VirtualType = '#virtualtype_VirtualType';
types.MongooseBuffer = '#types_buffer_MongooseBuffer';
types.Buffer = 'http://nodejs.org/api/buffer.html';

module.exports= function (type) {
  if (types[type]) {
    return '<a href="' + types[type] + '">' + type + '</a>';
  }
  return '<a href="#' + type + '">' + type + '</a>';
}

module.exports.types = types;
module.exports.type = function (str) {
  if (types[str]) return types[str];
  return str;
}
