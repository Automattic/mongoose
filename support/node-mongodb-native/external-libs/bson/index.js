var bson = require('./bson');
exports.BSON = bson.BSON;
exports.Long = bson.Long;
exports.ObjectID = bson.ObjectID;
exports.DBRef = bson.DBRef;
exports.Code = bson.Code;
exports.Timestamp = bson.Timestamp;
exports.Binary = bson.Binary;

// Just add constants tot he Native BSON parser
exports.BSON.BSON_BINARY_SUBTYPE_DEFAULT = 0;
exports.BSON.BSON_BINARY_SUBTYPE_FUNCTION = 1;
exports.BSON.BSON_BINARY_SUBTYPE_BYTE_ARRAY = 2;
exports.BSON.BSON_BINARY_SUBTYPE_UUID = 3;
exports.BSON.BSON_BINARY_SUBTYPE_MD5 = 4;
exports.BSON.BSON_BINARY_SUBTYPE_USER_DEFINED = 128;          
