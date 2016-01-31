
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
types.Aggregate = '#aggregate_Aggregate';
types.Binary = 'https://github.com/mongodb/js-bson/blob/master/lib/bson/binary.js';
types.Buffer = 'http://nodejs.org/api/buffer.html';
types.Connection = '#connection_Connection';
types.Collection = '#collection_Collection';
types.Document = '#document_Document';
types.EmbeddedDocument = '#types_embedded_EmbeddedDocument';
types.Mixed = '#schema_mixed_Mixed';
types.Model = '#model_Model';
types.Mongoose = '#index_Mongoose';
types.MongooseArray = '#types_array_MongooseArray';
types.MongooseBuffer = '#types_buffer_MongooseBuffer';
types.MongooseDocumentArray = '#types_documentarray_MongooseDocumentArray';
types.MongooseError = '#error_MongooseError';
types.ObjectId = '#types_objectid_ObjectId';
types.Promise = '#promise_Promise';
types.Query = '#query-js';
types.QueryStream = '#querystream_QueryStream';
types.Schema = '#schema_Schema';
types.SchemaArray = '#schema_array_SchemaArray';
types.SchemaType = '#schematype_SchemaType';
types.Type = '#schematype_SchemaType'; // ?
types.VirtualType = '#virtualtype_VirtualType';
types.any = 'nolink';

module.exports= function (type) {
  if (types[type]) {
    if ('nolink' === types[type]) return 'T';
    return '<a href="' + types[type] + '">' + type + '</a>';
  }
  return '<a href="#' + type + '">' + type + '</a>';
}

module.exports.types = types;
module.exports.type = function (str) {
  if (types[str]) return types[str];
  return str;
}
