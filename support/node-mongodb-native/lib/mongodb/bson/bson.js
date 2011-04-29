var BinaryParser = require('./binary_parser').BinaryParser,
  Integer = require('../goog/math/integer').Integer,
  Long = require('../goog/math/long').Long,
  Buffer = require('buffer').Buffer;
  
// Alias a string function
var chr = String.fromCharCode;

var BSON = exports.BSON = function(){},
  sys = require('sys');

// Exports Long value
exports.Long = Long;
exports.Timestamp = Long;
var Timestamp = Long

// BSON MAX VALUES
BSON.BSON_INT32_MAX = 2147483648;
BSON.BSON_INT32_MIN = -2147483648;

// BSON DATA TYPES
BSON.BSON_DATA_NUMBER = 1;
BSON.BSON_DATA_STRING = 2;
BSON.BSON_DATA_OBJECT = 3;
BSON.BSON_DATA_ARRAY = 4;
BSON.BSON_DATA_BINARY = 5;
BSON.BSON_DATA_OID = 7;
BSON.BSON_DATA_BOOLEAN = 8;
BSON.BSON_DATA_DATE = 9;
BSON.BSON_DATA_NULL = 10;
BSON.BSON_DATA_REGEXP = 11;
BSON.BSON_DATA_CODE_W_SCOPE = 15;
BSON.BSON_DATA_INT = 16;
BSON.BSON_DATA_TIMESTAMP = 17;
BSON.BSON_DATA_LONG = 18;

// BSON BINARY DATA SUBTYPES
BSON.BSON_BINARY_SUBTYPE_FUNCTION = 1;
BSON.BSON_BINARY_SUBTYPE_BYTE_ARRAY = 2;
BSON.BSON_BINARY_SUBTYPE_UUID = 3;
BSON.BSON_BINARY_SUBTYPE_MD5 = 4;
BSON.BSON_BINARY_SUBTYPE_USER_DEFINED = 128;

BSON.serialize = function(data, checkKeys) {
  return BSON.encodeValue('', null, data, true, checkKeys == null ? false : checkKeys);
};

BSON.deserialize = function(data, is_array_item, returnData, returnArray) {
  // The return data
  var return_data = {};
  var return_array = [];
  // Index of decoding in the binary file
  var index = 0;
  // Split of the first 4 characters to get the number of bytes
  var size = BinaryParser.toInt(data.substr(0, 4));
  // Adjust index
  index = index + 4;
  
  while(index < data.length) {
    // Read the first byte indicating the type of object
    var type = BinaryParser.toSmall(data.substr(index, 1));
    var insert_index = 0;
    // Adjust for the type of element
    index = index + 1;
    // If it's a string decode the value
    if(type == BSON.BSON_DATA_STRING) {
      // Read the null terminated string (indexof until first 0)
      var string_end_index = data.indexOf('\0', index);
      var string_name = data.substring(index, string_end_index);
      // Ajust index to point to the end of the string
      index = string_end_index + 1;
      // If we have an index read the array index      
      if(is_array_item) insert_index = parseInt(string_name, 10);

      // Read the length of the string (next 4 bytes)
      var string_size = BinaryParser.toInt(data.substr(index, 4));
      // Adjust the index to point at start of string
      index = index + 4;      
      // Read the string
      var value = BinaryParser.decode_utf8(data.substr(index, string_size - 1));
      // Adjust the index with the size of the string
      index = index + string_size;
      // Set the data on the object
      is_array_item ? return_array[insert_index] = value : return_data[string_name] = value;
    } else if(type == BSON.BSON_DATA_NULL) {
      // Read the null terminated string (indexof until first 0)
      var string_end_index = data.indexOf('\0', index);
      var string_name = data.substring(index, string_end_index);
      // Ajust index to point to the end of the string
      index = string_end_index + 1;
      // If we have an index read the array index      
      if(is_array_item) insert_index = parseInt(string_name, 10);
      // Set the data on the object
      is_array_item ? return_array[insert_index] = null : return_data[string_name] = null;
    } else if(type == BSON.BSON_DATA_INT) {
      // Read the null terminated string (indexof until first 0)
      var string_end_index = data.indexOf('\0', index);
      var string_name = data.substring(index, string_end_index);
      // Ajust index to point to the end of the string
      index = string_end_index + 1;
      // If we have an index read the array index      
      if(is_array_item) insert_index = parseInt(string_name, 10);
      // Read the number value
      var value = BinaryParser.toInt(data.substr(index, 4));
      // Adjust the index with the size
      index = index + 4;
      // Set the data on the object
      is_array_item ? return_array[insert_index] = value : return_data[string_name] = value;
    } else if(type == BSON.BSON_DATA_LONG || type == BSON.BSON_DATA_TIMESTAMP) {
      // Read the null terminated string (indexof until first 0)
      var string_end_index = data.indexOf('\0', index);
      var string_name = data.substring(index, string_end_index);
      // Ajust index to point to the end of the string
      index = string_end_index + 1;
      // If we have an index read the array index      
      if(is_array_item) insert_index = parseInt(string_name, 10);
      // Read the number value
      var low_bits = Integer.fromInt(BinaryParser.toInt(data.substr(index, 4)));
      var high_bits = Integer.fromInt(BinaryParser.toInt(data.substr(index + 4, 4)));
      // Create to integers
      var value = type == BSON.BSON_DATA_TIMESTAMP ? new Timestamp(low_bits, high_bits) : new Long(low_bits, high_bits);
      // Adjust the index with the size
      index = index + 8;
      // Set the data on the object
      is_array_item ? return_array[insert_index] = value : return_data[string_name] = value;
    } else if(type == BSON.BSON_DATA_NUMBER) {
      // Read the null terminated string (indexof until first 0)
      var string_end_index = data.indexOf('\0', index);
      var string_name = data.substring(index, string_end_index);
      // Ajust index to point to the end of the string
      index = string_end_index + 1;
      // If we have an index read the array index      
      if(is_array_item) insert_index = parseInt(string_name, 10);
      // Read the number value
      var value = BinaryParser.toDouble(data.substr(index, 8));
      // Adjust the index with the size
      index = index + 8;
      // Set the data on the object
      is_array_item ? return_array[insert_index] = value : return_data[string_name] = value;
    } else if(type == BSON.BSON_DATA_OBJECT) {
      // Read the null terminated string (indexof until first 0)
      var string_end_index = data.indexOf('\0', index);
      var string_name = data.substring(index, string_end_index);
      // Ajust index to point to the end of the string
      index = string_end_index + 1;      
      // If we have an index read the array index      
      if(is_array_item) insert_index = parseInt(string_name, 10);
      // Read the size of the object
      var object_size = BinaryParser.toInt(data.substr(index, 4));
      // Do a substr based on the size and parse the sub object
      var object_data = data.substr(index, object_size);
      // Parse the object
      var value = BSON.deserialize(object_data, false);
      // Adjust the index for the next value
      index = index + object_size;
      // Set the data on the object
      is_array_item ? return_array[insert_index] = value : return_data[string_name] = value;
    } else if(type == BSON.BSON_DATA_ARRAY) {
      // Read the null terminated string (indexof until first 0)
      var string_end_index = data.indexOf('\0', index);
      var string_name = data.substring(index, string_end_index);
      // Ajust index to point to the end of the string
      index = string_end_index + 1;
      // If we have an index read the array index      
      if(is_array_item) insert_index = parseInt(string_name, 10);
      // Read the size of the object
      var array_size = BinaryParser.toInt(data.substr(index, 4));
      // Let's split off the data and parse all elements (keeping in mind the elements)
      var array_data = data.substr(index, array_size);
      // Parse the object
      var value = BSON.deserialize(array_data, true);
      // Adjust the index for the next value
      index = index + array_size;
      // Set the data on the object
      is_array_item ? return_array[insert_index] = value : return_data[string_name] = value;
    } else if(type == BSON.BSON_DATA_BOOLEAN) {
      // Read the null terminated string (indexof until first 0)
      var string_end_index = data.indexOf('\0', index);
      var string_name = data.substring(index, string_end_index);
      // Ajust index to point to the end of the string
      index = string_end_index + 1;
      // If we have an index read the array index      
      if(is_array_item) insert_index = parseInt(string_name, 10);
      // Read the length of the string (next 4 bytes)
      var boolean_value = BinaryParser.toSmall(data.substr(index, 1));
      var value = boolean_value == 1 ? true : false;
      // Adjust the index
      index = index + 1;
      // Set the data on the object
      is_array_item ? return_array[insert_index] = value : return_data[string_name] = value;
    } else if(type == BSON.BSON_DATA_DATE) {
      // Read the null terminated string (indexof until first 0)
      var string_end_index = data.indexOf('\0', index);
      var string_name = data.substring(index, string_end_index);
      // Ajust index to point to the end of the string
      index = string_end_index + 1;
      // If we have an index read the array index      
      if(is_array_item) insert_index = parseInt(string_name, 10);
      // Read the number value
      var low_bits = Integer.fromInt(BinaryParser.toInt(data.substr(index, 4)));
      var high_bits = Integer.fromInt(BinaryParser.toInt(data.substr(index + 4, 4)));
      // Create to integers
      var value_in_seconds = new Long(low_bits, high_bits).toNumber();
      // Calculate date with miliseconds
      var value = new Date();
      value.setTime(value_in_seconds);
      // Adjust the index
      index = index + 8;
      // Set the data on the object
      is_array_item ? return_array[insert_index] = value : return_data[string_name] = value;
    } else if(type == BSON.BSON_DATA_OID) {
      // Read the null terminated string (indexof until first 0)
      var string_end_index = data.indexOf('\0', index);
      var string_name = data.substring(index, string_end_index);
      // Ajust index to point to the end of the string
      index = string_end_index + 1;
      // If we have an index read the array index      
      if(is_array_item) insert_index = parseInt(string_name, 10);
      // Read the oid (12 bytes)
      var oid = data.substr(index, 12);
      // Calculate date with miliseconds
      var value = new exports.ObjectID(oid);
      // Adjust the index
      index = index + 12;
      // Set the data on the object
      is_array_item ? return_array[insert_index] = value : return_data[string_name] = value;
    } else if(type == BSON.BSON_DATA_CODE_W_SCOPE) {
      // Read the null terminated string (indexof until first 0)
      var string_end_index = data.indexOf('\0', index);
      var string_name = data.substring(index, string_end_index);
      // Ajust index to point to the end of the string
      index = string_end_index + 1;
      // If we have an index read the array index      
      if(is_array_item) insert_index = parseInt(string_name, 10);
      // Unpack the integer sizes
      var total_code_size = BinaryParser.toInt(data.substr(index, 4));
      index = index + 4;
      var string_size = BinaryParser.toInt(data.substr(index, 4));
      index = index + 4;
      // Read the string + terminating null
      var code_string = BinaryParser.decode_utf8(data.substr(index, string_size - 1));
      index = index + string_size;
      // Get the bson object
      var bson_object_size = total_code_size - string_size - 8;
      var bson_object_string = data.substr(index, bson_object_size);
      index = index + bson_object_size;
      // Parse the bson object
      var scope_object = BSON.deserialize(bson_object_string, false);
      // Create code object
      var value = new exports.Code(code_string, scope_object);
      // Set the data on the object
      is_array_item ? return_array[insert_index] = value : return_data[string_name] = value;
    } else if(type == BSON.BSON_DATA_REGEXP) {
      // Read the null terminated string (indexof until first 0)
      var string_end_index = data.indexOf('\0', index);
      var string_name = data.substring(index, string_end_index);
      // Ajust index to point to the end of the string
      index = string_end_index + 1;
      // If we have an index read the array index      
      if(is_array_item) insert_index = parseInt(string_name, 10);
      // Read characters until end of regular expression
      var reg_exp_array = [];
      var chr = 1;
      var start_index = index
      while(BinaryParser.toByte((chr = data.charAt(index))) != 0) {
        index = index + 1
      }
      
      // RegExp Expression
      reg_exp = data.substring(start_index, index)
      index = index + 1
      
      // Read the options for the regular expression
      var options_array = [];
      while(BinaryParser.toByte((chr = data.charAt(index++))) != 0) {
        options_array.push(chr);
      }
      // Regular expression
      var value = new RegExp(BinaryParser.decode_utf8(reg_exp), options_array.join(''));
      // Set the data on the object
      is_array_item ? return_array[insert_index] = value : return_data[string_name] = value;
    } else if(type == BSON.BSON_DATA_BINARY) {
      // Read the null terminated string (indexof until first 0)
      var string_end_index = data.indexOf('\0', index);
      var string_name = data.substring(index, string_end_index);
      // Ajust index to point to the end of the string
      index = string_end_index + 1;
      // If we have an index read the array index      
      if(is_array_item) insert_index = parseInt(string_name, 10);      
      // The total number of bytes after subtype
      var total_number_of_bytes = BinaryParser.toInt(data.substr(index, 4));
      index = index + 4;
      // Decode the subtype
      var sub_type = BinaryParser.toByte(data.substr(index, 1));
      index = index + 1;
      // Binary object
      var value = new exports.Binary();
      value.sub_type = sub_type;
      // Read the size of the binary
      var number_of_bytes = BinaryParser.toInt(data.substr(index, 4));
      index = index + 4;
      // Read the next bytes into our Binary object
      var bin_data = data.substr(index, number_of_bytes);
      value.write(bin_data);
      // Adjust index with number of bytes
      index = index + number_of_bytes;
      // Set the data on the object
      is_array_item ? return_array[insert_index] = value : return_data[string_name] = value;
    }
  }
  // Check if we have a db reference
  if(!is_array_item && return_data['$ref'] != null) {
    return_data = new exports.DBRef(return_data['$ref'], return_data['$id'], return_data['$db']);
  }

  // Return the data
  return is_array_item ? return_array : return_data;
};

BSON.encodeString = function(string) {
  var encodedString = BinaryParser.encode_cstring(string);
  // Encode the string as binary with the length
  return BinaryParser.fromInt(encodedString.length) + encodedString;
};

BSON.encodeInt = function(number) {
  return BinaryParser.fromInt(number.toInt());
};

BSON.encodeLong = function(number) {
  return BinaryParser.fromInt(number.getLowBits()) + BinaryParser.fromInt(number.getHighBits());
};

BSON.encodeFloat = function(number) {
  return BinaryParser.fromDouble(number);
};

BSON.encodeArray = function(array, checkKeys) {
  var encoded_string = '';

  for(var index = 0; index < array.length; index++) {
    var index_string = new String(index) + BinaryParser.fromByte(0);
    var encoded_object = BSON.encodeValue('', null, array[index], false, checkKeys);
    encoded_string += encoded_object.substr(0, 1) + index_string + encoded_object.substr(1);
  }

  return encoded_string;
};

BSON.encodeObject = function(object, checkKeys) {
  var encoded_string = '';
  // Let's fetch all the variables for the object and encode each
  for(var variable in object) {
    if(object[variable] == null || (object[variable] != null && object[variable].constructor != Function)) {
      encoded_string += BSON.encodeValue('', variable, object[variable], false, checkKeys);
    }
  }
  // Return the encoded string
  return encoded_string;
};

BSON.encodeBoolean = function(value) {
  return value ? BinaryParser.fromSmall(1) : BinaryParser.fromSmall(0);
};

BSON.encodeDate = function(value) {
  var dateInMilis = Long.fromNumber(value.getTime());
  return BinaryParser.fromInt(dateInMilis.getLowBits()) + BinaryParser.fromInt(dateInMilis.getHighBits());
};

BSON.encodeOid = function(oid) {
  return oid.id;
};

BSON.encodeCode = function(code, checkKeys) {
  // Get the code_string
  var code_string = BSON.encodeString(code.code);
  var scope = BinaryParser.fromInt(5) + BinaryParser.fromByte(0);
  // Encode the scope (a hash of values or ordered hash)
  if(code.scope != null) {
    scope = BSON.encodeValue('', null, code.scope, false, checkKeys);
    scope = scope.substring(1, scope.length);
  }
  // Calculate lengths
  var total_length = code_string.length - 4 + scope.length + 8;
  return BinaryParser.fromInt(total_length) + code_string + scope;
};

BSON.encodeRegExp = function(regexp) {
  // Get regular expression
  var clean_regexp = regexp.toString().match(/\/.*\//, '');
  clean_regexp = clean_regexp[0].substring(1, clean_regexp[0].length - 1);
  var options = regexp.toString().substr(clean_regexp.length + 2);
  var options_array = [];
  // Extract all options that are legal and sort them alphabetically
  for(var index = 0; index < options.length; index++) {
    var chr = options.charAt(index);
    if(chr == 'i' || chr == 'm' || chr == 'x') options_array.push(chr);
  }
  // Don't need to sort the alphabetically as it's already done by javascript on creation of a Regexp obejct
  options = options_array.join('');
  // Encode the regular expression
  return BinaryParser.encode_cstring(clean_regexp) + BinaryParser.encode_cstring(options);
};

BSON.encodeBinary = function(binary) {
  var data = binary.value();
  return BinaryParser.fromByte(binary.sub_type) + BinaryParser.fromInt(data.length) + data;
};

BSON.encodeDBRef = function(dbref) {
  var ordered_values = {'$ref':dbref.namespace, '$id':dbref.oid};
  if(dbref.db != null) ordered_values['$db'] = dbref.db;
  return BSON.encodeObject(ordered_values);
};

BSON.checkKey = function(variable) {
  // Check if we have a legal key for the object
  if(variable.length > 0 && variable.substr(0, 1) == '$') {
    throw Error("key " + variable + " must not start with '$'");
  } else if(variable.length > 0 && variable.indexOf('.') != -1) {
    throw Error("key " + variable + " must not contain '.'");
  }
};

BSON.toLong = function(low_bits, high_bits) {
  var low_bits = Integer.fromInt(low_bits);
  var high_bits = Integer.fromInt(high_bits);  
  return new Long(low_bits, high_bits);
}

BSON.toInt = function(value) {
  return Integer.fromNumber(value).toInt();
}

BSON.encodeValue = function(encoded_string, variable, value, top_level, checkKeys) {
  var variable_encoded = variable == null ? '' : BinaryParser.encode_cstring(variable);
  if(checkKeys && variable != null)BSON.checkKey(variable);

  if(value == null) {
    encoded_string += BinaryParser.fromByte(BSON.BSON_DATA_NULL) + variable_encoded;
  } else if(value.constructor == String) {
    encoded_string += BinaryParser.fromByte(BSON.BSON_DATA_STRING) + variable_encoded + BSON.encodeString(value);
  } else if(value instanceof Timestamp || Object.prototype.toString.call(value) == "[object Timestamp]") {
    encoded_string += BinaryParser.fromByte(BSON.BSON_DATA_TIMESTAMP) + variable_encoded + BSON.encodeLong(value);
  } else if(value instanceof Long || Object.prototype.toString.call(value) == "[object Long]") {
    encoded_string += BinaryParser.fromByte(BSON.BSON_DATA_LONG) + variable_encoded + BSON.encodeLong(value);
  } else if(value.constructor == Number && value === parseInt(value, 10)) {
    if(value > BSON.BSON_INT32_MAX || value < BSON.BSON_INT32_MIN) {      
      encoded_string += BinaryParser.fromByte(BSON.BSON_DATA_LONG) + variable_encoded + BSON.encodeLong(Long.fromNumber(value));
    } else {
      encoded_string += BinaryParser.fromByte(BSON.BSON_DATA_INT) + variable_encoded + BSON.encodeInt(Integer.fromInt(value));      
    }    
  } else if(value.constructor == Number) {
    encoded_string += BinaryParser.fromByte(BSON.BSON_DATA_NUMBER) + variable_encoded + BSON.encodeFloat(value);
  } else if(Array.isArray(value)) {
    var object_string = BSON.encodeArray(value, checkKeys);
    encoded_string += BinaryParser.fromByte(BSON.BSON_DATA_ARRAY) + variable_encoded + BSON.encodeInt(Integer.fromInt(object_string.length + 4 + 1)) + object_string + BinaryParser.fromByte(0);
  } else if(Object.prototype.toString.call(value) === '[object Boolean]') {
    encoded_string += BinaryParser.fromByte(BSON.BSON_DATA_BOOLEAN) + variable_encoded + BSON.encodeBoolean(value);
  } else if(Object.prototype.toString.call(value) === '[object Date]') {
    encoded_string += BinaryParser.fromByte(BSON.BSON_DATA_DATE) + variable_encoded + BSON.encodeDate(value);
  } else if(Object.prototype.toString.call(value) === '[object RegExp]') {
    encoded_string += BinaryParser.fromByte(BSON.BSON_DATA_REGEXP) + variable_encoded + BSON.encodeRegExp(value);
  } else if(value instanceof ObjectID || (value.id && value.toHexString) || Object.prototype.toString.call(value) == "[object ObjectID]") {
    encoded_string += BinaryParser.fromByte(BSON.BSON_DATA_OID) + variable_encoded + BSON.encodeOid(value);
  } else if(value instanceof Code || Object.prototype.toString.call(value) == "[object Code]") {
    encoded_string += BinaryParser.fromByte(BSON.BSON_DATA_CODE_W_SCOPE) + variable_encoded + BSON.encodeCode(value, checkKeys);
  } else if(value instanceof Binary || Object.prototype.toString.call(value) == "[object Binary]") {
    var object_string = BSON.encodeBinary(value);
    encoded_string += BinaryParser.fromByte(BSON.BSON_DATA_BINARY) + variable_encoded + BSON.encodeInt(Integer.fromInt(object_string.length - 1)) + object_string;
  } else if(value instanceof DBRef) {
    var object_string = BSON.encodeDBRef(value);
    encoded_string += BinaryParser.fromByte(BSON.BSON_DATA_OBJECT) + variable_encoded + BSON.encodeInt(Integer.fromInt(object_string.length + 4 + 1)) + object_string + BinaryParser.fromByte(0);
  } else if(Object.prototype.toString.call(value) === '[object Object]') {
    var object_string = BSON.encodeObject(value, checkKeys);
    encoded_string += (!top_level ? BinaryParser.fromByte(BSON.BSON_DATA_OBJECT) : '') + variable_encoded + BSON.encodeInt(Integer.fromInt(object_string.length + 4 + 1)) + object_string + BinaryParser.fromByte(0);
  }

  return encoded_string;
};

var Code = exports.Code = function(code, scope) {
  this.code = code;
  this.scope = scope == null ? {} : scope;
};

/**
  Object ID used to create object id's for the mongo requests
**/
var ObjectID = exports.ObjectID = function(id) {
  if(id == null) this.id = this.generate();
  else if( /^[0-9a-fA-F]{24}$/.test(id)) return ObjectID.createFromHexString(id);
  else this.id = id;
};

ObjectID.prototype.get_inc = function() {
  exports.ObjectID.index = (exports.ObjectID.index + 1) % 0xFFFFFF;
  return exports.ObjectID.index;
};

/* Find the machine id. */
var MACHINE_ID = (function() {
  // Create a random 3-byte value (i.e. unique for this
  // process). Other drivers use a md5 of the machine id here, but
  // that would mean an asyc call to gethostname, so we don't bother.
  var rnd = parseInt(Math.random() * 0xffffff);
  return rnd;
})();

ObjectID.prototype.generate = function() {
  var unixTime = parseInt((new Date()).getTime()/1000);
  var time4Bytes = BinaryParser.encodeInt(unixTime, 32, true, true);
  var machine3Bytes = BinaryParser.encodeInt(MACHINE_ID, 24, false);
  var pid2Bytes = BinaryParser.fromShort(process.pid);
  var index3Bytes = BinaryParser.encodeInt(this.get_inc(), 24, false, true);
  return time4Bytes + machine3Bytes + pid2Bytes + index3Bytes;
};

ObjectID.prototype.toHexString = function() {
  var hexString = '';
  for(var index = 0; index < this.id.length; index++) {
    var value = BinaryParser.toByte(this.id.substr(index, 1));
    var number = value <= 15 ? "0" + value.toString(16) : value.toString(16);
    hexString = hexString + number;
  }
  return hexString;
};

ObjectID.prototype.toString = function() {
  return this.toHexString();
};

ObjectID.prototype.inspect = function() {
  return this.toHexString();  
}

// accurate up to number of seconds
ObjectID.prototype.__defineGetter__("generationTime", function() {
  return BinaryParser.decodeInt(this.id.substring(0,4), 32, true, true) * 1000;
})

ObjectID.index = 0;
ObjectID.createPk = function() {
  return new exports.ObjectID();
};

ObjectID.createFromHexString= function(hexString) {
    if(hexString.length > 12*2) throw "Id cannot be longer than 12 bytes";
    var result= "";
    for(var index=0 ; index < hexString.length; index+=2) {
        var string= hexString.substr(index, 2);
        var number= parseInt(string, 16);
        result+= BinaryParser.fromByte(number);
    }

    return new exports.ObjectID(result);
};

ObjectID.prototype.toJSON = function() {
  return this.toHexString();
}

ObjectID.prototype.equals = function(otherID) {
  return this.id == ((otherID instanceof ObjectID || otherID.toHexString) ? otherID.id : ObjectID.createFromHexString(otherID).id);
}

/**
  DBRef contains a db reference
**/
var DBRef = exports.DBRef = function(namespace, oid, db) {
  this.namespace = namespace;
  this.oid = oid;
  this.db = db;
};

/**
  Contains the a binary stream of data
**/
var Binary = exports.Binary = function(buffer) {
  this.sub_type = BSON.BSON_BINARY_SUBTYPE_BYTE_ARRAY;
  // Create a default sized binary in case non is passed in and prepare the size
  if(buffer) {
    this.buffer = buffer;    
    this.position = buffer.length;
  } else {
    this.buffer = new Buffer(Binary.BUFFER_SIZE);
    this.position = 0;
  }
};

Binary.BUFFER_SIZE = 256;

Binary.prototype.put = function(byte_value) {
  if(this.buffer.length > this.position) {
    this.buffer[this.position++] = byte_value.charCodeAt(0);
  } else {
    // Create additional overflow buffer
    var buffer = new Buffer(Binary.BUFFER_SIZE + this.buffer.length);
    // Combine the two buffers together
    this.buffer.copy(buffer, 0, 0, this.buffer.length);
    this.buffer = buffer;
    this.buffer[this.position++] = byte_value.charCodeAt(0);
  }
};

Binary.prototype.write = function(string, offset) {
  offset = offset ? offset : this.position;
  // If the buffer is to small let's extend the buffer
  if(this.buffer.length < offset + string.length) {
    var buffer = new Buffer(this.buffer.length + string.length);
    this.buffer.copy(buffer, 0, 0, this.buffer.length);
    // Assign the new buffer
    this.buffer = buffer;
  }
  // Write the content to the buffer
  if(string instanceof Buffer) {
    string.copy(this.buffer, offset, 0, string.length);
  }
  else {
	  this.buffer.write(string, 'binary', offset);
  }
  this.position = offset + string.length;
};

Binary.prototype.read = function(position, length) {  
  length = length && length > 0 ? length : this.position;  
  // Let's extract the string we want to read
  return this.buffer.toString('binary', position, position + length);
};

Binary.prototype.value = function() {
  return this.buffer.toString('binary', 0, this.position);
};

Binary.prototype.length = function() {
  return this.position;
};