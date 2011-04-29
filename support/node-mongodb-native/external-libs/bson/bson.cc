#include <assert.h>
#include <string.h>
#include <stdlib.h>
#include <v8.h>
#include <node.h>
#include <node_version.h>
#include <node_events.h>
#include <node_buffer.h>
#include <cstring>
#include <cmath>
#include <cstdlib>
#include <iostream>
#include <limits>

#include "bson.h"
#include "long.h"
#include "timestamp.h"
#include "objectid.h"
#include "binary.h"
#include "code.h"
#include "dbref.h"

using namespace v8;
using namespace node;

// BSON DATA TYPES
const uint32_t BSON_DATA_NUMBER = 1;
const uint32_t BSON_DATA_STRING = 2;
const uint32_t BSON_DATA_OBJECT = 3;
const uint32_t BSON_DATA_ARRAY = 4;
const uint32_t BSON_DATA_BINARY = 5;
const uint32_t BSON_DATA_OID = 7;
const uint32_t BSON_DATA_BOOLEAN = 8;
const uint32_t BSON_DATA_DATE = 9;
const uint32_t BSON_DATA_NULL = 10;
const uint32_t BSON_DATA_REGEXP = 11;
const uint32_t BSON_DATA_CODE_W_SCOPE = 15;
const uint32_t BSON_DATA_INT = 16;
const uint32_t BSON_DATA_TIMESTAMP = 17;
const uint32_t BSON_DATA_LONG = 18;

const int32_t BSON_INT32_MAX = (int32_t)2147483647L;
const int32_t BSON_INT32_MIN = (int32_t)(-1) * 2147483648L;

// BSON BINARY DATA SUBTYPES
const uint32_t BSON_BINARY_SUBTYPE_FUNCTION = 1;
const uint32_t BSON_BINARY_SUBTYPE_BYTE_ARRAY = 2;
const uint32_t BSON_BINARY_SUBTYPE_UUID = 3;
const uint32_t BSON_BINARY_SUBTYPE_MD5 = 4;
const uint32_t BSON_BINARY_SUBTYPE_USER_DEFINED = 128;

static Handle<Value> VException(const char *msg) {
    HandleScope scope;
    return ThrowException(Exception::Error(String::New(msg)));
  };

Persistent<FunctionTemplate> BSON::constructor_template;

class MyExternal : public String::ExternalAsciiStringResource {
 public:
  MyExternal (char *d, size_t length) : ExternalAsciiStringResource() {
    data_ = static_cast<char*>(malloc(length));
    memcpy(data_, d, length);
    // data_ = d;
    length_ = length;
    
    // Adjust of external allocated memory
    V8::AdjustAmountOfExternalAllocatedMemory(sizeof(MyExternal));      
  }

  virtual ~MyExternal () {
    // Adjust the memory allocated
    V8::AdjustAmountOfExternalAllocatedMemory(-length_);  
    // Free the string
    free(data_);
  }

  virtual const char * data () const {
    return data_;
  }

  virtual size_t length () const {
    return length_;
  }

 private:
  char *data_;
  size_t length_;
};

void BSON::Initialize(v8::Handle<v8::Object> target) {
  // Grab the scope of the call from Node
  HandleScope scope;
  // Define a new function template
  Local<FunctionTemplate> t = FunctionTemplate::New(New);
  constructor_template = Persistent<FunctionTemplate>::New(t);
  constructor_template->InstanceTemplate()->SetInternalFieldCount(1);
  constructor_template->SetClassName(String::NewSymbol("BSON"));
  
  // Class methods
  NODE_SET_METHOD(constructor_template->GetFunction(), "serialize", BSONSerialize);  
  NODE_SET_METHOD(constructor_template->GetFunction(), "deserialize", BSONDeserialize);  
  NODE_SET_METHOD(constructor_template->GetFunction(), "encodeLong", EncodeLong);  
  NODE_SET_METHOD(constructor_template->GetFunction(), "toLong", ToLong);
  NODE_SET_METHOD(constructor_template->GetFunction(), "toInt", ToInt);

  target->Set(String::NewSymbol("BSON"), constructor_template->GetFunction());
}

// Create a new instance of BSON and assing it the existing context
Handle<Value> BSON::New(const Arguments &args) {
  HandleScope scope;
  
  BSON *bson = new BSON();
  bson->Wrap(args.This());
  return args.This();
}

Handle<Value> BSON::BSONSerialize(const Arguments &args) {
  // printf("= BSONSerialize ===================================== USING Native BSON Parser\n");  
  if(args.Length() == 1 && !args[0]->IsObject()) return VException("One or two arguments required - [object] or [object, boolean]");
  if(args.Length() == 2 && !args[0]->IsObject() && !args[1]->IsBoolean()) return VException("One or two arguments required - [object] or [object, boolean]");
  if(args.Length() > 2) return VException("One or two arguments required - [object] or [object, boolean]");

  // Calculate the total size of the document in binary form to ensure we only allocate memory once
  uint32_t object_size = BSON::calculate_object_size(args[0]);
  // Allocate the memory needed for the serializtion
  char *serialized_object = (char *)malloc(object_size * sizeof(char));  
  // Catch any errors
  try {
    // Check if we have a boolean value
    bool check_key = false;
    if(args.Length() == 2 && args[1]->IsBoolean()) {
      check_key = args[1]->BooleanValue();
    }
    
    // Serialize the object
    BSON::serialize(serialized_object, 0, Null(), args[0], check_key);      
  } catch(char *err_msg) {
    // Free up serialized object space
    free(serialized_object);
    V8::AdjustAmountOfExternalAllocatedMemory(-object_size);
    // Throw exception with the string
    Handle<Value> error = VException(err_msg);
    // free error message
    free(err_msg);
    // Return error
    return error;
  }
  
  // Write the object size
  BSON::write_int32((serialized_object), object_size);
  
  // for(int n = 0; n < object_size; n++) {
  //   printf("C:: ============ %02x::%c\n",(unsigned char)serialized_object[n], serialized_object[n]);
  // }
  
  // Try out wrapping the char* in an externalresource to avoid copying data
  MyExternal *my_external = new MyExternal(serialized_object, object_size);
  // Free the serialized object
  free(serialized_object);
  // Adjust the memory for V8
  V8::AdjustAmountOfExternalAllocatedMemory(-object_size);
  // Create a new external
  Local<String> bin_value = String::NewExternal(my_external);    
  // Return the serialized content
  return bin_value;
}

Handle<Value> BSON::ToLong(const Arguments &args) {
  HandleScope scope;

  if(args.Length() != 2 && !args[0]->IsString() && !args[1]->IsString()) return VException("Two arguments of type String required");
  // Create a new Long value and return it
  Local<Value> argv[] = {args[0], args[1]};
  Handle<Value> long_obj = Long::constructor_template->GetFunction()->NewInstance(2, argv);    
  return scope.Close(long_obj);
}

Handle<Value> BSON::ToInt(const Arguments &args) {
  HandleScope scope;

  if(args.Length() != 1 && !args[0]->IsNumber() && !args[1]->IsString()) return VException("One argument of type Number required");  
  // Return int value
  return scope.Close(args[0]->ToInt32());
}

Handle<Value> BSON::EncodeLong(const Arguments &args) {
  HandleScope scope;
  
  // Encode the value
  if(args.Length() != 1 && !Long::HasInstance(args[0])) return VException("One argument required of type Long");
  // Unpack the object and encode
  Local<Object> obj = args[0]->ToObject();
  Long *long_obj = Long::Unwrap<Long>(obj);
  // Allocate space
  char *long_str = (char *)malloc(8 * sizeof(char));
  // Write the content to the char array
  BSON::write_int32((long_str), long_obj->low_bits);
  BSON::write_int32((long_str + 4), long_obj->high_bits);
  // Encode the data
  Local<String> long_final_str = Encode(long_str, 8, BINARY)->ToString();
  // Free up memory
  free(long_str);
  // Return the encoded string
  return scope.Close(long_final_str);
}

void BSON::write_int32(char *data, uint32_t value) {
  // Write the int to the char*
  memcpy(data, &value, 4);  
}

void BSON::write_double(char *data, double value) {
  // Write the double to the char*
  memcpy(data, &value, 8);    
}

void BSON::write_int64(char *data, int64_t value) {
  // Write the int to the char*
  memcpy(data, &value, 8);      
}

char *BSON::check_key(Local<String> key) {
  // Allocate space for they key string
  char *key_str = (char *)malloc(key->Length() * sizeof(char) + 1);
  // Error string
  char *error_str = (char *)malloc(256 * sizeof(char));
  // Decode the key
  ssize_t len = DecodeBytes(key, BINARY);
  ssize_t written = DecodeWrite(key_str, len, key, BINARY);
  *(key_str + key->Length()) = '\0';
  // Check if we have a valid key
  if(key->Length() > 0 && *(key_str) == '$') {
    // Create the string
    sprintf(error_str, "key %s must not start with '$'", key_str);
    // Free up memory
    free(key_str);
    // Throw exception with string
    throw error_str;
  } else if(key->Length() > 0 && strchr(key_str, '.') != NULL) {
    // Create the string
    sprintf(error_str, "key %s must not contain '.'", key_str);
    // Free up memory
    free(key_str);
    // Throw exception with string
    throw error_str;
  }
  // Free allocated space
  free(key_str);
  free(error_str);
  // Return No check key error
  return NULL;
}

uint32_t BSON::serialize(char *serialized_object, uint32_t index, Handle<Value> name, Handle<Value> value, bool check_key) {
  // printf("============================================= serialized::::\n");
  HandleScope scope;
  
  // If we have a name check that key is valid
  if(!name->IsNull() && check_key) {
    if(BSON::check_key(name->ToString()) != NULL) return -1;
  }  
  
  // If we have an object let's serialize it  
  if(Long::HasInstance(value)) {
    // printf("============================================= -- serialized::::long\n");    
    // Save the string at the offset provided
    *(serialized_object + index) = BSON_DATA_LONG;
    // Adjust writing position for the first byte
    index = index + 1;
    // Convert name to char*
    ssize_t len = DecodeBytes(name, BINARY);
    ssize_t written = DecodeWrite((serialized_object + index), len, name, BINARY);
    // Add null termiation for the string
    *(serialized_object + index + len) = '\0';    
    // Adjust the index
    index = index + len + 1;

    // Unpack the object and encode
    Local<Object> obj = value->ToObject();
    Long *long_obj = Long::Unwrap<Long>(obj);
    // Write the content to the char array
    BSON::write_int32((serialized_object + index), long_obj->low_bits);
    BSON::write_int32((serialized_object + index + 4), long_obj->high_bits);
    // Adjust the index
    index = index + 8;
  } else if(Timestamp::HasInstance(value)) {
      // printf("============================================= -- serialized::::long\n");    
      // Save the string at the offset provided
      *(serialized_object + index) = BSON_DATA_TIMESTAMP;
      // Adjust writing position for the first byte
      index = index + 1;
      // Convert name to char*
      ssize_t len = DecodeBytes(name, BINARY);
      ssize_t written = DecodeWrite((serialized_object + index), len, name, BINARY);
      // Add null termiation for the string
      *(serialized_object + index + len) = '\0';    
      // Adjust the index
      index = index + len + 1;

      // Unpack the object and encode
      Local<Object> obj = value->ToObject();
      Timestamp *timestamp_obj = Timestamp::Unwrap<Timestamp>(obj);
      // Write the content to the char array
      BSON::write_int32((serialized_object + index), timestamp_obj->low_bits);
      BSON::write_int32((serialized_object + index + 4), timestamp_obj->high_bits);
      // Adjust the index
      index = index + 8;
  } else if(ObjectID::HasInstance(value) || (value->IsObject() && value->ToObject()->HasRealNamedProperty(String::New("toHexString")))) {
    // printf("============================================= -- serialized::::object_id\n");    
    // Save the string at the offset provided
    *(serialized_object + index) = BSON_DATA_OID;
    // Adjust writing position for the first byte
    index = index + 1;
    // Convert name to char*
    ssize_t len = DecodeBytes(name, BINARY);
    ssize_t written = DecodeWrite((serialized_object + index), len, name, BINARY);
    // Add null termiation for the string
    *(serialized_object + index + len) = '\0';    
    // Adjust the index
    index = index + len + 1;    

    // Unpack the object and encode
    Local<Object> obj = value->ToObject();
    ObjectID *object_id_obj = ObjectID::Unwrap<ObjectID>(obj);
    // Fetch the converted oid
    char *binary_oid = object_id_obj->convert_hex_oid_to_bin();
    // Write the oid to the char array
    memcpy((serialized_object + index), binary_oid, 12);
    // Free memory
    free(binary_oid);
    // Adjust the index
    index = index + 12;    
  } else if(Binary::HasInstance(value)) {
    // printf("============================================= -- serialized::::binary\n");    
    // Save the string at the offset provided
    *(serialized_object + index) = BSON_DATA_BINARY;
    // Adjust writing position for the first byte
    index = index + 1;
    // Convert name to char*
    ssize_t len = DecodeBytes(name, BINARY);
    ssize_t written = DecodeWrite((serialized_object + index), len, name, BINARY);
    // Add null termiation for the string
    *(serialized_object + index + len) = '\0';    
    // Adjust the index
    index = index + len + 1;    

    // Unpack the object and encode
    Local<Object> obj = value->ToObject();
    Binary *binary_obj = Binary::Unwrap<Binary>(obj);
    // Let's write the total size of the binary 
    BSON::write_int32((serialized_object + index), (binary_obj->index + 4));
    // Adjust index
    index = index + 4;
    // Write subtype
    *(serialized_object + index)  = (char)binary_obj->sub_type;
    // Adjust index
    index = index + 1;
    // Let's write the content to the char* array
    BSON::write_int32((serialized_object + index), binary_obj->index);
    // Adjust index
    index = index + 4;
    // Write binary content
    memcpy((serialized_object + index), binary_obj->data, binary_obj->index);
    // Adjust index
    index = index + binary_obj->index;
  } else if(DBRef::HasInstance(value)) {
    // printf("============================================= -- serialized::::dbref\n");    
    // Unpack the dbref
    Local<Object> dbref = value->ToObject();
    // Create an object containing the right namespace variables
    Local<Object> obj = Object::New();
    // unpack dbref to get to the bin
    DBRef *db_ref_obj = DBRef::Unwrap<DBRef>(dbref);
    // Unpack the reference value
    Persistent<Value> oid_value = db_ref_obj->oid;
    // Encode the oid to bin
    obj->Set(String::New("$ref"), dbref->Get(String::New("namespace")));
    obj->Set(String::New("$id"), oid_value);      
    // obj->Set(String::New("$db"), dbref->Get(String::New("db")));
    if(db_ref_obj->db != NULL) obj->Set(String::New("$db"), dbref->Get(String::New("db")));
    // Encode the variable
    index = BSON::serialize(serialized_object, index, name, obj, false);
  } else if(Code::HasInstance(value)) {
    // printf("============================================= -- serialized::::code\n");    
    // Save the string at the offset provided
    *(serialized_object + index) = BSON_DATA_CODE_W_SCOPE;
    // Adjust writing position for the first byte
    index = index + 1;
    // Convert name to char*
    ssize_t len = DecodeBytes(name, BINARY);
    ssize_t written = DecodeWrite((serialized_object + index), len, name, BINARY);
    // Add null termiation for the string
    *(serialized_object + index + len) = '\0';    
    // Adjust the index
    index = index + len + 1;    

    // Unpack the object and encode
    Local<Object> obj = value->ToObject();
    Code *code_obj = Code::Unwrap<Code>(obj);
    // Keep pointer to start
    uint32_t first_pointer = index;
    // Adjust the index
    index = index + 4;
    // Write the size of the code string
    BSON::write_int32((serialized_object + index), strlen(code_obj->code) + 1);
    // Adjust the index
    index = index + 4;    
    // Write the code string
    memcpy((serialized_object + index), code_obj->code, strlen(code_obj->code));
    *(serialized_object + index + strlen(code_obj->code)) = '\0';
    // Adjust index
    index = index + strlen(code_obj->code) + 1;
    // Encode the scope
    uint32_t scope_object_size = BSON::calculate_object_size(code_obj->scope_object);
    // Serialize the scope object
    BSON::serialize((serialized_object + index), 0, Null(), code_obj->scope_object, check_key);
    // Adjust the index
    index = index + scope_object_size;
    // Encode the total size of the object
    BSON::write_int32((serialized_object + first_pointer), (index - first_pointer));
  } else if(value->IsString()) {
    // printf("============================================= -- serialized::::string\n");    
    // Save the string at the offset provided
    *(serialized_object + index) = BSON_DATA_STRING;
    // Adjust writing position for the first byte
    index = index + 1;
    // Convert name to char*
    ssize_t len = DecodeBytes(name, BINARY);
    ssize_t written = DecodeWrite((serialized_object + index), len, name, BINARY);
    // Add null termiation for the string
    *(serialized_object + index + len) = '\0';    
    // Adjust the index
    index = index + len + 1;        
    
    // Write the actual string into the char array
    Local<String> str = value->ToString();
    // Let's fetch the int value
    uint32_t utf8_length = str->Utf8Length();

    // If the Utf8 length is different from the string length then we
    // have a UTF8 encoded string, otherwise write it as ascii
    if(utf8_length != str->Length()) {
      // Write the integer to the char *
      BSON::write_int32((serialized_object + index), utf8_length + 1);
      // Adjust the index
      index = index + 4;
      // Write string to char in utf8 format
      str->WriteUtf8((serialized_object + index), utf8_length);
      // Add the null termination
      *(serialized_object + index + utf8_length) = '\0';    
      // Adjust the index
      index = index + utf8_length + 1;      
    } else {
      // Write the integer to the char *
      BSON::write_int32((serialized_object + index), str->Length() + 1);
      // Adjust the index
      index = index + 4;
      // Write string to char in utf8 format
      written = DecodeWrite((serialized_object + index), str->Length(), str, BINARY);
      // Add the null termination
      *(serialized_object + index + str->Length()) = '\0';    
      // Adjust the index
      index = index + str->Length() + 1;      
    }       
  } else if(value->IsInt32()) {
    // printf("============================================= -- serialized::::int32\n");        
    // Save the string at the offset provided
    *(serialized_object + index) = BSON_DATA_INT;
    // Adjust writing position for the first byte
    index = index + 1;
    // Convert name to char*
    ssize_t len = DecodeBytes(name, BINARY);
    ssize_t written = DecodeWrite((serialized_object + index), len, name, BINARY);
    // Add null termiation for the string
    *(serialized_object + index + len) = '\0';    
    // Adjust the index
    index = index + len + 1;
    
    // Write the integer to the char *
    int32_t int_value = value->Int32Value();
    BSON::write_int32((serialized_object + index), int_value);
    // Adjust the index
    index = index + 4;
  } else if(value->IsNull() || value->IsUndefined()) {
    // printf("============================================= -- serialized::::null\n");
    // Save the string at the offset provided
    *(serialized_object + index) = BSON_DATA_NULL;
    // Adjust writing position for the first byte
    index = index + 1;
    // Convert name to char*
    ssize_t len = DecodeBytes(name, BINARY);
    ssize_t written = DecodeWrite((serialized_object + index), len, name, BINARY);
    // Add null termiation for the string
    *(serialized_object + index + len) = '\0';    
    // Adjust the index
    index = index + len + 1;    
  } else if(value->IsNumber()) {
    // printf("============================================= -- serialized::::number\n");
    uint32_t first_pointer = index;
    // Save the string at the offset provided
    *(serialized_object + index) = BSON_DATA_INT;
    // Adjust writing position for the first byte
    index = index + 1;
    // Convert name to char*
    ssize_t len = DecodeBytes(name, BINARY);
    ssize_t written = DecodeWrite((serialized_object + index), len, name, BINARY);
    // Add null termiation for the string
    *(serialized_object + index + len) = '\0';    
    // Adjust the index
    index = index + len + 1;    
    
    Local<Number> number = value->ToNumber();
    // Get the values
    double d_number = number->NumberValue();
    int64_t l_number = number->IntegerValue();
    // printf("===================================================== l_number:%lli\n", l_number);
    // Check if we have a double value and not a int64
    double d_result = d_number - l_number;    
    // If we have a value after subtracting the integer value we have a float
    if(d_result > 0 || d_result < 0) {
      // printf("============================================= -- serialized::::double\n");
      // Write the double to the char array
      BSON::write_double((serialized_object + index), d_number);
      // Adjust type to be double
      *(serialized_object + first_pointer) = BSON_DATA_NUMBER;
      // Adjust index for double
      index = index + 8;
    } else if(l_number <= BSON_INT32_MAX && l_number >= BSON_INT32_MIN) {
      // printf("============================================= -- serialized::::int32\n");
      if(l_number == BSON_INT32_MAX) {
        BSON::write_int32((serialized_object + index), BSON_INT32_MAX);
      } else {
        BSON::write_int32((serialized_object + index), BSON_INT32_MIN);        
      }
      // Adjust the size of the index
      index = index + 4;
    } else {
      // Fetch the double value
      BSON::write_int64((serialized_object + index), l_number);
      // Adjust type to be double
      *(serialized_object + first_pointer) = BSON_DATA_LONG;
      // Adjust the size of the index
      index = index + 8;
    }     
  } else if(value->IsBoolean()) {
    // printf("============================================= -- serialized::::boolean\n");
    // Save the string at the offset provided
    *(serialized_object + index) = BSON_DATA_BOOLEAN;
    // Adjust writing position for the first byte
    index = index + 1;
    // Convert name to char*
    ssize_t len = DecodeBytes(name, BINARY);
    ssize_t written = DecodeWrite((serialized_object + index), len, name, BINARY);
    // Add null termiation for the string
    *(serialized_object + index + len) = '\0';    
    // Adjust the index
    index = index + len + 1;    

    // Save the boolean value
    *(serialized_object + index) = value->BooleanValue() ? '\1' : '\0';
    // Adjust the index
    index = index + 1;
  } else if(value->IsDate()) {
    // printf("============================================= -- serialized::::date\n");    
    // Save the string at the offset provided
    *(serialized_object + index) = BSON_DATA_DATE;
    // Adjust writing position for the first byte
    index = index + 1;
    // Convert name to char*
    ssize_t len = DecodeBytes(name, BINARY);
    ssize_t written = DecodeWrite((serialized_object + index), len, name, BINARY);
    // Add null termiation for the string
    *(serialized_object + index + len) = '\0';    
    // Adjust the index
    index = index + len + 1;    

    // Fetch the Integer value
    int64_t integer_value = value->IntegerValue();
    BSON::write_int64((serialized_object + index), integer_value);
    // Adjust the index
    index = index + 8;
  } else if(value->IsObject() && value->ToObject()->ObjectProtoToString()->Equals(String::New("[object RegExp]"))) {
    // printf("============================================= -- serialized::::regexp\n");    
    // Save the string at the offset provided
    *(serialized_object + index) = BSON_DATA_REGEXP;
    // Adjust writing position for the first byte
    index = index + 1;
    // Convert name to char*
    ssize_t len = DecodeBytes(name, BINARY);
    ssize_t written = DecodeWrite((serialized_object + index), len, name, BINARY);
    // Add null termiation for the string
    *(serialized_object + index + len) = '\0';    
    // Adjust the index
    index = index + len + 1;    

    // Additional size
    uint32_t regexp_size = 0;
    // Fetch the string for the regexp
    Local<String> str = value->ToString();    
    len = DecodeBytes(str, UTF8);
    // Let's define the buffer that contains the regexp string
    char *data = (char *)malloc(len);
    // Write the data to the buffer from the string object
    written = DecodeWrite(data, len, str, UTF8);    
    // Locate the last pointer of the string
    char *options_ptr = strrchr(data, '/');
    // Copy out the code string
    uint32_t reg_exp_string_length = (options_ptr - (data + 1)) * sizeof(char);
    char *reg_exp_string = (char *)malloc(reg_exp_string_length + 1);
    memcpy(reg_exp_string, (data + 1), reg_exp_string_length);
    *(reg_exp_string + reg_exp_string_length) = '\0';

    // Write the string to the data
    memcpy((serialized_object + index), reg_exp_string, reg_exp_string_length + 1);
    // Adjust index
    index = index + reg_exp_string_length + 1;
        
    // Check if we have options
    // if((options_ptr - data) < len) {
    uint32_t options_string_length = (len - (reg_exp_string_length + 2));
    char *options_string = (char *)malloc(options_string_length * sizeof(char) + 1);
    memcpy(options_string, (data + reg_exp_string_length + 2), options_string_length);
    *(options_string + options_string_length) = '\0';
    // Write the options string to the serialized string
    memcpy((serialized_object + index), options_string, options_string_length + 1);
    // Adjust the index
    index = index + options_string_length + 1;      
    // Free up the memory
    free(options_string);
    free(reg_exp_string);
    free(data);
  } else if(value->IsArray()) {
    // printf("============================================= -- serialized::::array\n");
    // Cast to array
    Local<Array> array = Local<Array>::Cast(value->ToObject());
    // Turn length into string to calculate the size of all the strings needed
    char *length_str = (char *)malloc(256 * sizeof(char));    
    // Save the string at the offset provided
    *(serialized_object + index) = BSON_DATA_ARRAY;
    // Adjust writing position for the first byte
    index = index + 1;
    // Convert name to char*
    ssize_t len = DecodeBytes(name, BINARY);
    ssize_t written = DecodeWrite((serialized_object + index), len, name, BINARY);
    // Add null termiation for the string
    *(serialized_object + index + len) = '\0';    
    // Adjust the index
    index = index + len + 1;        
    // Object size
    uint32_t object_size = BSON::calculate_object_size(value);
    // printf("C++ =================================== array_size: %d\n", object_size);
    // Write the size of the object
    BSON::write_int32((serialized_object + index), object_size);
    // Adjust the index
    index = index + 4;
    // Write out all the elements
    for(uint32_t i = 0; i < array->Length(); i++) {
      // Add "index" string size for each element
      sprintf(length_str, "%d", i);
      // Encode the values      
      index = BSON::serialize(serialized_object, index, String::New(length_str), array->Get(Integer::New(i)), check_key);
      // Write trailing '\0' for object
      *(serialized_object + index) = '\0';
    }
    // Write trailing '\0' for object
    // *(serialized_object + index + 1) = '\0';    
    // Pad the last item
    *(serialized_object + index) = '\0';
    index = index + 1;
    // Free up memory
    free(length_str);
  } else if(value->IsObject()) {
    // printf("============================================= -- serialized::::object\n");
    if(!name->IsNull()) {
      // Save the string at the offset provided
      *(serialized_object + index) = BSON_DATA_OBJECT;
      // Adjust writing position for the first byte
      index = index + 1;
      // Convert name to char*
      ssize_t len = DecodeBytes(name, BINARY);
      ssize_t written = DecodeWrite((serialized_object + index), len, name, BINARY);
      // Add null termiation for the string
      *(serialized_object + index + len) = '\0';    
      // Adjust the index
      index = index + len + 1;          
    }
        
    // Unwrap the object
    Local<Object> object = value->ToObject();
    Local<Array> property_names = object->GetPropertyNames();

    // Calculate size of the total object
    uint32_t object_size = BSON::calculate_object_size(value);
    // Write the size
    BSON::write_int32((serialized_object + index), object_size);
    // Adjust size
    index = index + 4;    
    
    // printf("======================================== number_of_properties: %d\n", property_names->Length());
    
    // Process all the properties on the object
    for(uint32_t i = 0; i < property_names->Length(); i++) {
      // Fetch the property name
      Local<String> property_name = property_names->Get(i)->ToString();
      
      // Convert name to char*
      ssize_t len = DecodeBytes(property_name, BINARY);
      // char *data = new char[len];
      char *data = (char *)malloc(len + 1);
      *(data + len) = '\0';
      ssize_t written = DecodeWrite(data, len, property_name, BINARY);      
      // Fetch the object for the property
      Local<Value> property = object->Get(property_name);
      // Write the next serialized object
      index = BSON::serialize(serialized_object, index, property_name, property, check_key);      
      // Free up memory of data
      free(data);
    }
    // Pad the last item
    *(serialized_object + index) = '\0';
    index = index + 1;

    // Null out reminding fields if we have a toplevel object and nested levels
    if(name->IsNull()) {
      for(uint32_t i = 0; i < (object_size - index); i++) {
        *(serialized_object + index + i) = '\0';
      }
    }    
  }
  
  return index;
}

uint32_t BSON::calculate_object_size(Handle<Value> value) {
  uint32_t object_size = 0;
  // printf("================================ ----------- calculate_object_size\n");  

  // If we have an object let's unwrap it and calculate the sub sections
  if(Long::HasInstance(value)) {
    // printf("================================ calculate_object_size:long\n");
    object_size = object_size + 8;
  } else if(ObjectID::HasInstance(value)) {
    // printf("================================ calculate_object_size:objectid\n");
    object_size = object_size + 12;
  } else if(Binary::HasInstance(value)) {
    // printf("================================ calculate_object_size:binary\n");
    // Unpack the object and encode
    Local<Object> obj = value->ToObject();
    Binary *binary_obj = Binary::Unwrap<Binary>(obj);
    // Adjust the object_size, binary content lengt + total size int32 + binary size int32 + subtype
    object_size += binary_obj->index + 4 + 4 + 1;
  } else if(Code::HasInstance(value)) {
    // printf("================================ calculate_object_size:code\n");
    // Unpack the object and encode
    Local<Object> obj = value->ToObject();
    Code *code_obj = Code::Unwrap<Code>(obj);
    // Let's calculate the size the code object adds adds
    object_size += strlen(code_obj->code) + 4 + BSON::calculate_object_size(code_obj->scope_object) + 4 + 1;
  } else if(DBRef::HasInstance(value)) {
    // Unpack the dbref
    Local<Object> dbref = value->ToObject();
    // Create an object containing the right namespace variables
    Local<Object> obj = Object::New();
    // unpack dbref to get to the bin
    DBRef *db_ref_obj = DBRef::Unwrap<DBRef>(dbref);
    // Encode the oid to bin
    obj->Set(String::New("$ref"), dbref->Get(String::New("namespace")));
    obj->Set(String::New("$id"), db_ref_obj->oid);
    // obj->Set(String::New("$db"), dbref->Get(String::New("db")));
    if(db_ref_obj->db != NULL) obj->Set(String::New("$db"), dbref->Get(String::New("db")));
    // printf("================================ calculate_object_size:dbref:[%d]\n", BSON::calculate_object_size(obj));
    // Calculate size
    object_size += BSON::calculate_object_size(obj);
  } else if(value->IsString()) {
    // printf("================================ calculate_object_size:string\n");
    Local<String> str = value->ToString();
    uint32_t utf8_length = str->Utf8Length();
    
    if(utf8_length != str->Length()) {
      // Let's calculate the size the string adds, length + type(1 byte) + size(4 bytes)
      object_size += str->Utf8Length() + 1 + 4;  
    } else {
      object_size += str->Length() + 1 + 4;        
    }
  } else if(value->IsInt32()) {
    // printf("================================ calculate_object_size:int32\n");
    object_size += 4;
  } else if(value->IsNull()) {
    // printf("================================ calculate_object_size:null\n");    
  } else if(value->IsNumber()) {
    // Check if we have a float value or a long value
    Local<Number> number = value->ToNumber();
    double d_number = number->NumberValue();
    int64_t l_number = number->IntegerValue();
    // Check if we have a double value and not a int64
    double d_result = d_number - l_number;    
    // If we have a value after subtracting the integer value we have a float
    if(d_result > 0 || d_result < 0) {
      object_size = object_size + 8;      
    } else if(l_number <= BSON_INT32_MAX && l_number >= BSON_INT32_MIN) {
      object_size = object_size + 4;
    } else {
      object_size = object_size + 8;
    }
  } else if(value->IsBoolean()) {
    // printf("================================ calculate_object_size:boolean\n");
    object_size = object_size + 1;
  } else if(value->IsDate()) {
    // printf("================================ calculate_object_size:date\n");
    object_size = object_size + 8;
  } else if(value->IsObject() && value->ToObject()->ObjectProtoToString()->Equals(String::New("[object RegExp]"))) {
    // Additional size
    uint32_t regexp_size = 0;
    // Fetch the string for the regexp
    Local<String> str = value->ToString();    
    ssize_t len = DecodeBytes(str, UTF8);
    // Calculate the space needed for the regexp: size of string - 2 for the /'ses +2 for null termiations
    object_size = object_size + len;
  } else if(value->IsArray()) {
    // printf("================================ calculate_object_size:array\n");
    // Cast to array
    Local<Array> array = Local<Array>::Cast(value->ToObject());
    // Turn length into string to calculate the size of all the strings needed
    char *length_str = (char *)malloc(256 * sizeof(char));
    // Calculate the size of each element
    for(uint32_t i = 0; i < array->Length(); i++) {
      // Add "index" string size for each element
      sprintf(length_str, "%d", i);
      // Add the size of the string length
      uint32_t label_length = strlen(length_str) + 1;
      // Add the type definition size for each item
      object_size = object_size + label_length + 1;
      // Add size of the object
      uint32_t object_length = BSON::calculate_object_size(array->Get(Integer::New(i)));
      object_size = object_size + object_length;
    }
    // Add the object size
    object_size = object_size + 4 + 1;
    // Free up memory
    free(length_str);
  } else if(value->IsObject()) {
    // printf("================================ calculate_object_size:object\n");
    // Unwrap the object
    Local<Object> object = value->ToObject();
    Local<Array> property_names = object->GetPropertyNames();
    
    // Process all the properties on the object
    for(uint32_t index = 0; index < property_names->Length(); index++) {
      // Fetch the property name
      Local<String> property_name = property_names->Get(index)->ToString();
      // Fetch the object for the property
      Local<Value> property = object->Get(property_name);
      // Get size of property (property + property name length + 1 for terminating 0)
      object_size += BSON::calculate_object_size(property) + property_name->Length() + 1 + 1;
    }      
    
    object_size = object_size + 4 + 1;
  } 

  return object_size;
}

Handle<Value> BSON::BSONDeserialize(const Arguments &args) {
  HandleScope scope;
  // printf("= BSONDeserialize ===================================== USING Native BSON Parser\n");
  // Ensure that we have an parameter
  if(Buffer::HasInstance(args[0]) && args.Length() > 1) return VException("One argument required - buffer1.");
  if(args[0]->IsString() && args.Length() > 1) return VException("One argument required - string1.");
  // Throw an exception if the argument is not of type Buffer
  if(!Buffer::HasInstance(args[0]) && !args[0]->IsString()) return VException("Argument must be a Buffer or String.");
  
  // Define pointer to data
  char *data;
  uint32_t length;      
  Local<Object> obj = args[0]->ToObject();

  // If we passed in a buffer, let's unpack it, otherwise let's unpack the string
  if(Buffer::HasInstance(obj)) {

    #if NODE_MAJOR_VERSION == 0 && NODE_MINOR_VERSION < 3
     Buffer *buffer = ObjectWrap::Unwrap<Buffer>(obj);
     data = buffer->data();
     uint32_t length = buffer->length();
    #else
     data = Buffer::Data(obj);
     uint32_t length = Buffer::Length(obj);
    #endif

    return BSON::deserialize(data, NULL);
  } else {
    // Let's fetch the encoding
    // enum encoding enc = ParseEncoding(args[1]);
    // The length of the data for this encoding
    ssize_t len = DecodeBytes(args[0], BINARY);
    // Let's define the buffer size
    // data = new char[len];
    data = (char *)malloc(len);
    // Write the data to the buffer from the string object
    ssize_t written = DecodeWrite(data, len, args[0], BINARY);
    // Assert that we wrote the same number of bytes as we have length
    assert(written == len);
    // Get result
    Handle<Value> result = BSON::deserialize(data, NULL);
    // Free memory
    free(data);
    // Deserialize the content
    return result;
  }  
}

// Deserialize the stream
Handle<Value> BSON::deserialize(char *data, bool is_array_item) {
  // printf("----------------------------------------------------------------- deserialize\n");
  HandleScope scope;
  // Holds references to the objects that are going to be returned
  Local<Object> return_data = Object::New();
  Local<Array> return_array = Array::New();      
  // The current index in the char data
  uint32_t index = 0;
  // Decode the size of the BSON data structure
  uint32_t size = BSON::deserialize_int32(data, index);
  // Adjust the index to point to next piece
  index = index + 4;      

  // for(int n = 0; n < size; n++) {
  //   printf("C:: ============ %02x\n",(unsigned char)data[n]);
  // }
  // 
  // for(int n = 0; s_value[n] != '\0'; n++) {
  //   printf("C:: ============ %02x\n",(unsigned char)s_value[n]);                      
  // }
  
  // While we have data left let's decode
  while(index < size) {
    // Read the first to bytes to indicate the type of object we are decoding
    uint16_t type = BSON::deserialize_int8(data, index);
    // Handles the internal size of the object
    uint32_t insert_index = 0;
    // Adjust index to skip type byte
    index = index + 1;
    
    if(type == BSON_DATA_STRING) {
      // Read the null terminated index String
      char *string_name = BSON::extract_string(data, index);
      if(string_name == NULL) return VException("Invalid C String found.");
      // Let's create a new string
      index = index + strlen(string_name) + 1;
      // Handle array value if applicable
      uint32_t insert_index = 0;
      if(is_array_item) {
        insert_index = atoi(string_name);
      }      

      // Read the length of the string (next 4 bytes)
      uint32_t string_size = BSON::deserialize_int32(data, index);
      // Adjust index to point to start of string
      index = index + 4;
      // Decode the string and add zero terminating value at the end of the string
      char *value = (char *)malloc((string_size * sizeof(char)));
      strncpy(value, (data + index), string_size);
      // Encode the string (string - null termiating character)
      Local<Value> utf8_encoded_str = Encode(value, string_size - 1, UTF8)->ToString();
      // Add the value to the data
      if(is_array_item) {
        return_array->Set(Number::New(insert_index), utf8_encoded_str);
      } else {
        return_data->Set(String::New(string_name), utf8_encoded_str);
      }
      
      // Adjust index
      index = index + string_size;
      // Free up the memory
      free(value);
      free(string_name);
    } else if(type == BSON_DATA_INT) {
      // printf("===================================== decoding int\n");      
      // Read the null terminated index String
      char *string_name = BSON::extract_string(data, index);
      if(string_name == NULL) return VException("Invalid C String found.");
      // printf("================== label: %s\n", string_name);
      // Let's create a new string
      index = index + strlen(string_name) + 1;
      // Handle array value if applicable
      uint32_t insert_index = 0;
      if(is_array_item) {
        insert_index = atoi(string_name);
      }      
      
      // Decode the integer value
      uint32_t value = 0;
      memcpy(&value, (data + index), 4);
            
      // Adjust the index for the size of the value
      index = index + 4;
      // Add the element to the object
      if(is_array_item) {
        // printf("=================== wow\n");
        return_array->Set(Integer::New(insert_index), Integer::New(value));
      } else {
        return_data->Set(String::New(string_name), Integer::New(value));
      }          
      // Free up the memory
      free(string_name);
    } else if(type == BSON_DATA_TIMESTAMP) {
      // Read the null terminated index String
      char *string_name = BSON::extract_string(data, index);
      if(string_name == NULL) return VException("Invalid C String found.");
      // Let's create a new string
      index = index + strlen(string_name) + 1;
      // Handle array value if applicable
      uint32_t insert_index = 0;
      if(is_array_item) {
        insert_index = atoi(string_name);
      }      
      
      // Decode the integer value
      int64_t value = 0;
      memcpy(&value, (data + index), 8);      
      // Adjust the index for the size of the value
      index = index + 8;
            
      // Add the element to the object
      if(is_array_item) {
        return_array->Set(Number::New(insert_index), BSON::decodeTimestamp(value));
      } else {
        return_data->Set(String::New(string_name), BSON::decodeTimestamp(value));
      }
      // Free up the memory
      free(string_name);            
    } else if(type == BSON_DATA_LONG) {
      // Read the null terminated index String
      char *string_name = BSON::extract_string(data, index);
      if(string_name == NULL) return VException("Invalid C String found.");
      // Let's create a new string
      index = index + strlen(string_name) + 1;
      // Handle array value if applicable
      uint32_t insert_index = 0;
      if(is_array_item) {
        insert_index = atoi(string_name);
      }      
      
      // Decode the integer value
      int64_t value = 0;
      memcpy(&value, (data + index), 8);      
      // Adjust the index for the size of the value
      index = index + 8;
            
      // Add the element to the object
      if(is_array_item) {
        return_array->Set(Number::New(insert_index), BSON::decodeLong(value));
      } else {
        return_data->Set(String::New(string_name), BSON::decodeLong(value));
      }
      // Free up the memory
      free(string_name);      
    } else if(type == BSON_DATA_NUMBER) {
      // printf("===================================== decoding float/double\n");      
      // Read the null terminated index String
      char *string_name = BSON::extract_string(data, index);
      if(string_name == NULL) return VException("Invalid C String found.");
      // Let's create a new string
      index = index + strlen(string_name) + 1;
      // Handle array value if applicable
      uint32_t insert_index = 0;
      if(is_array_item) {
        insert_index = atoi(string_name);
      }      
      
      // Decode the integer value
      double value = 0;
      memcpy(&value, (data + index), 8);      
      // Adjust the index for the size of the value
      index = index + 8;
      
      // Add the element to the object
      if(is_array_item) {
        return_array->Set(Number::New(insert_index), Number::New(value));
      } else {
        return_data->Set(String::New(string_name), Number::New(value));
      }
      // Free up the memory
      free(string_name);      
    } else if(type == BSON_DATA_NULL) {
      // printf("===================================== decoding float/double\n");      
      // Read the null terminated index String
      char *string_name = BSON::extract_string(data, index);
      if(string_name == NULL) return VException("Invalid C String found.");
      // Let's create a new string
      index = index + strlen(string_name) + 1;
      // Handle array value if applicable
      uint32_t insert_index = 0;
      if(is_array_item) {
        insert_index = atoi(string_name);
      }      
      
      // Add the element to the object
      if(is_array_item) {
        return_array->Set(Number::New(insert_index), Null());
      } else {
        return_data->Set(String::New(string_name), Null());
      }      
      // Free up the memory
      free(string_name);      
    } else if(type == BSON_DATA_BOOLEAN) {
      // Read the null terminated index String
      char *string_name = BSON::extract_string(data, index);
      if(string_name == NULL) return VException("Invalid C String found.");
      // Let's create a new string
      index = index + strlen(string_name) + 1;
      // Handle array value if applicable
      uint32_t insert_index = 0;
      if(is_array_item) {
        insert_index = atoi(string_name);
      }      

      // Decode the boolean value
      char bool_value = *(data + index);
      // Adjust the index for the size of the value
      index = index + 1;
      
      // Add the element to the object
      if(is_array_item) {
        return_array->Set(Number::New(insert_index), bool_value == 1 ? Boolean::New(true) : Boolean::New(false));
      } else {
        return_data->Set(String::New(string_name), bool_value == 1 ? Boolean::New(true) : Boolean::New(false));
      }            
      // Free up the memory
      free(string_name);      
    } else if(type == BSON_DATA_DATE) {
      // Read the null terminated index String
      char *string_name = BSON::extract_string(data, index);
      if(string_name == NULL) return VException("Invalid C String found.");
      // Let's create a new string
      index = index + strlen(string_name) + 1;
      // Handle array value if applicable
      uint32_t insert_index = 0;
      if(is_array_item) {
        insert_index = atoi(string_name);
      }      

      // Decode the value 64 bit integer
      int64_t value = 0;
      memcpy(&value, (data + index), 8);      
      // Adjust the index for the size of the value
      index = index + 8;
      // Add the element to the object
      if(is_array_item) {
        return_array->Set(Number::New(insert_index), Date::New((double)value));
      } else {
        return_data->Set(String::New(string_name), Date::New((double)value));
      }     
      // Free up the memory
      free(string_name);        
    } else if(type == BSON_DATA_REGEXP) {
      // Read the null terminated index String
      char *string_name = BSON::extract_string(data, index);
      if(string_name == NULL) return VException("Invalid C String found.");
      // Let's create a new string
      index = index + strlen(string_name) + 1;
      // Handle array value if applicable
      uint32_t insert_index = 0;
      if(is_array_item) {
        insert_index = atoi(string_name);
      }      

      // Length variable
      int32_t length_regexp = 0;
      int32_t start_index = index;
      char chr;
      
      // Locate end of the regexp expression \0
      while((chr = *(data + index + length_regexp)) != '\0') {
        length_regexp = length_regexp + 1;
      }

      // Contains the reg exp
      char *reg_exp = (char *)malloc(length_regexp * sizeof(char) + 2);
      // Copy the regexp from the data to the char *
      memcpy(reg_exp, (data + index), (length_regexp + 1));
      // Adjust the index to skip the first part of the regular expression
      index = index + length_regexp + 1;
            
      // Reset the length
      int32_t options_length = 0;
      // Locate the end of the options for the regexp terminated with a '\0'
      while((chr = *(data + index + options_length)) != '\0') {
        options_length = options_length + 1;
      }

      // Contains the reg exp
      char *options = (char *)malloc(options_length * sizeof(char) + 1);
      // Copy the options from the data to the char *
      memcpy(options, (data + index), (options_length + 1));      
      // Adjust the index to skip the option part of the regular expression
      index = index + options_length + 1;      
      // ARRRRGH Google does not expose regular expressions through the v8 api
      // Have to use Script to instantiate the object (slower)

      // Generate the string for execution in the string context
      char *reg_exp_string = (char *)malloc((length_regexp + options_length)*sizeof(char) + 2 + 2);
      *(reg_exp_string) = '\0';
      strncat(reg_exp_string, "/", 1);      
      strncat(reg_exp_string, reg_exp, length_regexp);
      strncat(reg_exp_string, "/", 1);      
      strncat(reg_exp_string, options, options_length);

      // Execute script creating a regular expression object
      Local<Script> script = Script::New(String::New(reg_exp_string), String::New("bson.<anonymous>"));
      Handle<Value> result = script->Run();

      // Add the element to the object
      if(is_array_item) {
        return_array->Set(Number::New(insert_index), result);
      } else {
        return_data->Set(String::New(string_name), result);
      }  
      
      // Free memory
      free(reg_exp);          
      free(options);          
      free(reg_exp_string); 
      free(string_name);
    } else if(type == BSON_DATA_OID) {
      // printf("=================================================== unpacking oid\n");
      // Read the null terminated index String
      char *string_name = BSON::extract_string(data, index);
      if(string_name == NULL) return VException("Invalid C String found.");
      // Let's create a new string
      index = index + strlen(string_name) + 1;
      // Handle array value if applicable
      uint32_t insert_index = 0;
      if(is_array_item) {
        insert_index = atoi(string_name);
      }      
      
      // Allocate storage for a 24 character hex oid    
      char *oid_string = (char *)malloc(12 * 2 * sizeof(char) + 1);
      char *pbuffer = oid_string;      
      // Terminate the string
      *(pbuffer + 24) = '\0';      
      // Unpack the oid in hex form
      for(int32_t i = 0; i < 12; i++) {
        sprintf(pbuffer, "%02x", (unsigned char)*(data + index + i));
        pbuffer += 2;
      }      

      // Adjust the index
      index = index + 12;

      // Add the element to the object
      if(is_array_item) {
        return_array->Set(Number::New(insert_index), BSON::decodeOid(oid_string));
      } else {
        return_data->Set(String::New(string_name), BSON::decodeOid(oid_string));
      }     
      // Free memory
      free(oid_string);                       
      free(string_name);
    } else if(type == BSON_DATA_BINARY) {
      // printf("=================================================== unpacking binary\n");
      // Read the null terminated index String
      char *string_name = BSON::extract_string(data, index);
      if(string_name == NULL) return VException("Invalid C String found.");
      // Let's create a new string
      index = index + strlen(string_name) + 1;
      // Handle array value if applicable
      uint32_t insert_index = 0;
      if(is_array_item) {
        insert_index = atoi(string_name);
      }      
      
      // Total number of bytes after array index
      uint32_t total_number_of_bytes = BSON::deserialize_int32(data, index);
      // Adjust the index
      index = index + 4;
      // Decode the subtype
      uint32_t sub_type = (int)*(data + index);
      // Adjust the index
      index = index + 1;
      // Read the binary data size
      uint32_t number_of_bytes = BSON::deserialize_int32(data, index);
      // Adjust the index
      index = index + 4;
      // Copy the binary data into a buffer
      char *buffer = (char *)malloc(number_of_bytes * sizeof(char) + 1);
      memcpy(buffer, (data + index), number_of_bytes);
      *(buffer + number_of_bytes) = '\0';
      // Adjust the index
      index = index + number_of_bytes;
      // Add the element to the object
      if(is_array_item) {
        return_array->Set(Number::New(insert_index), BSON::decodeBinary(sub_type, number_of_bytes, buffer));
      } else {
        return_data->Set(String::New(string_name), BSON::decodeBinary(sub_type, number_of_bytes, buffer));
      }
      // Free memory
      free(buffer);                             
      free(string_name);
    } else if(type == BSON_DATA_CODE_W_SCOPE) {
      // printf("=================================================== unpacking code\n");
      // Read the null terminated index String
      char *string_name = BSON::extract_string(data, index);
      if(string_name == NULL) return VException("Invalid C String found.");
      // Let's create a new string
      index = index + strlen(string_name) + 1;
      // Handle array value if applicable
      uint32_t insert_index = 0;
      if(is_array_item) {
        insert_index = atoi(string_name);
      }      
      
      // Total number of bytes after array index
      uint32_t total_code_size = BSON::deserialize_int32(data, index);
      // Adjust the index
      index = index + 4;
      // Read the string size
      uint32_t string_size = BSON::deserialize_int32(data, index);
      // Adjust the index
      index = index + 4;
      // Read the string
      char *code = (char *)malloc(string_size * sizeof(char) + 1);
      // Copy string + terminating 0
      memcpy(code, (data + index), string_size);
      // Adjust the index
      index = index + string_size;      
      // Get the scope object (bson object)
      uint32_t bson_object_size = total_code_size - string_size - 8;
      // Allocate bson object buffer and copy out the content
      char *bson_buffer = (char *)malloc(bson_object_size * sizeof(char));
      memcpy(bson_buffer, (data + index), bson_object_size);
      // Adjust the index
      index = index + bson_object_size;
      // Parse the bson object
      Handle<Value> scope_object = BSON::deserialize(bson_buffer, false);
      // Define the try catch block
      TryCatch try_catch;                
      // Decode the code object
      Handle<Value> obj = BSON::decodeCode(code, scope_object);
      // If an error was thrown push it up the chain
      if(try_catch.HasCaught()) {
        // Clean up memory allocation
        free(bson_buffer);
        // Rethrow exception
        return try_catch.ReThrow();
      }

      // Add the element to the object
      if(is_array_item) {        
        return_array->Set(Number::New(insert_index), obj);
      } else {
        return_data->Set(String::New(string_name), obj);
      }      
      // Clean up memory allocation
      free(bson_buffer);      
      free(string_name);
    } else if(type == BSON_DATA_OBJECT) {
      // printf("=================================================== unpacking object\n");
      // If this is the top level object we need to skip the undecoding
      // Read the null terminated index String
      char *string_name = BSON::extract_string(data, index);
      if(string_name == NULL) return VException("Invalid C String found.");
      // Let's create a new string
      index = index + strlen(string_name) + 1;
      // Handle array value if applicable
      uint32_t insert_index = 0;
      if(is_array_item) {
        insert_index = atoi(string_name);
      }             
      
      // Get the object size
      uint32_t bson_object_size = BSON::deserialize_int32(data, index);
      // Define the try catch block
      TryCatch try_catch;                
      // Decode the code object
      Handle<Value> obj = BSON::deserialize(data + index, false);
      // Adjust the index
      index = index + bson_object_size;
      // If an error was thrown push it up the chain
      if(try_catch.HasCaught()) {
        // Rethrow exception
        return try_catch.ReThrow();
      }
      
      // Add the element to the object
      if(is_array_item) {        
        return_array->Set(Number::New(insert_index), obj);
      } else {
        return_data->Set(String::New(string_name), obj);
      }
      
      // Clean up memory allocation
      free(string_name);
    } else if(type == BSON_DATA_ARRAY) {
      // printf("=================================================== unpacking array\n");
      // Read the null terminated index String
      char *string_name = BSON::extract_string(data, index);
      if(string_name == NULL) return VException("Invalid C String found.");
      // Let's create a new string
      index = index + strlen(string_name) + 1;
      // Handle array value if applicable
      uint32_t insert_index = 0;
      if(is_array_item) {
        insert_index = atoi(string_name);
      }      
      
      // Get the size
      uint32_t array_size = BSON::deserialize_int32(data, index);
      // Define the try catch block
      TryCatch try_catch;                

      // Decode the code object
      Handle<Value> obj = BSON::deserialize(data + index, true);
      // If an error was thrown push it up the chain
      if(try_catch.HasCaught()) {
        // Rethrow exception
        return try_catch.ReThrow();
      }
      // Adjust the index for the next value
      index = index + array_size;
      // Add the element to the object
      if(is_array_item) {        
        return_array->Set(Number::New(insert_index), obj);
      } else {
        return_data->Set(String::New(string_name), obj);
      }      
      // Clean up memory allocation
      free(string_name);
    }
  }
  
  // Check if we have a db reference
  if(!is_array_item && return_data->Has(String::New("$ref"))) {
    Handle<Value> dbref_value = BSON::decodeDBref(return_data->Get(String::New("$ref")), return_data->Get(String::New("$id")), return_data->Get(String::New("$db")));
    return scope.Close(dbref_value);
  }
  
  // Return the data object to javascript
  if(is_array_item) {
    return scope.Close(return_array);
  } else {
    return scope.Close(return_data);
  }
}

const char* BSON::ToCString(const v8::String::Utf8Value& value) {
  return *value ? *value : "<string conversion failed>";
}

Handle<Value> BSON::decodeDBref(Local<Value> ref, Local<Value> oid, Local<Value> db) {
  HandleScope scope;
  
  Local<Value> argv[] = {ref, oid, db};
  Handle<Value> dbref_obj = DBRef::constructor_template->GetFunction()->NewInstance(3, argv);
  return scope.Close(dbref_obj);
}

Handle<Value> BSON::decodeCode(char *code, Handle<Value> scope_object) {
  HandleScope scope;
  
  Local<Value> argv[] = {String::New(code), scope_object->ToObject()};
  Handle<Value> code_obj = Code::constructor_template->GetFunction()->NewInstance(2, argv);
  return scope.Close(code_obj);
}

Handle<Value> BSON::decodeBinary(uint32_t sub_type, uint32_t number_of_bytes, char *data) {
  HandleScope scope;

  Local<String> str = Encode(data, number_of_bytes, BINARY)->ToString();
  Local<Value> argv[] = {Integer::New(sub_type), str};
  Handle<Value> binary_obj = Binary::constructor_template->GetFunction()->NewInstance(2, argv);
  return scope.Close(binary_obj);
}

Handle<Value> BSON::decodeOid(char *oid) {
  HandleScope scope;
  
  Local<Value> argv[] = {String::New(oid)};
  Handle<Value> oid_obj = ObjectID::constructor_template->GetFunction()->NewInstance(1, argv);
  return scope.Close(oid_obj);
}

Handle<Value> BSON::decodeLong(int64_t value) {
  HandleScope scope;
  
  Local<Value> argv[] = {Number::New(value)};
  Handle<Value> long_obj = Long::constructor_template->GetFunction()->NewInstance(1, argv);    
  return scope.Close(long_obj);      
}

Handle<Value> BSON::decodeTimestamp(int64_t value) {
  HandleScope scope;
  
  Local<Value> argv[] = {Number::New(value)};
  Handle<Value> timestamp_obj = Timestamp::constructor_template->GetFunction()->NewInstance(1, argv);    
  return scope.Close(timestamp_obj);      
}

// Search for 0 terminated C string and return the string
char* BSON::extract_string(char *data, uint32_t offset) {
  char *prt = strchr((data + offset), '\0');
  if(prt == NULL) return NULL;
  // Figure out the length of the string
  uint32_t length = (prt - data) - offset;      
  // Allocate memory for the new string
  char *string_name = (char *)malloc((length * sizeof(char)) + 1);
  // Copy the variable into the string_name
  strncpy(string_name, (data + offset), length);
  // Ensure the string is null terminated
  *(string_name + length) = '\0';
  // Return the unpacked string
  return string_name;
}

// Decode a signed byte
int BSON::deserialize_sint8(char *data, uint32_t offset) {
  return (signed char)(*(data + offset));
}

int BSON::deserialize_sint16(char *data, uint32_t offset) {
  return BSON::deserialize_sint8(data, offset) + (BSON::deserialize_sint8(data, offset + 1) << 8);
}

long BSON::deserialize_sint32(char *data, uint32_t offset) {
  return (long)BSON::deserialize_sint8(data, offset) + (BSON::deserialize_sint8(data, offset + 1) << 8) +
    (BSON::deserialize_sint8(data, offset + 2) << 16) + (BSON::deserialize_sint8(data, offset + 3) << 24);
}

// Convert raw binary string to utf8 encoded string
char *BSON::decode_utf8(char *string, uint32_t length) {  
  // Internal variables
  uint32_t i = 0;
  uint32_t utf8_i = 0;
  // unsigned char unicode = 0;
  uint16_t unicode = 0;
  unsigned char c = 0;
  unsigned char c1 = 0;
  unsigned char c2 = 0;
  unsigned char c3 = 0;
  // Allocate enough space for the utf8 encoded string
  char *utf8_string = (char*)malloc(length * sizeof(char));
  // Process the utf8 raw string
  while(i < length) {
    // Fetch character
    c = (unsigned char)string[i];

    if(c < 128) {
    //   // It's a basic ascii character just copy the string
      *(utf8_string + utf8_i) = *(string + i);
      // Upadate indexs
      i = i + 1;
      utf8_i = utf8_i + 1;
    } else if((c > 191) && (c < 224)) {
      // Let's create an integer containing the 16 bit value for unicode
      c2 = (unsigned char)string[i + 1];
      // Pack to unicode value
      unicode = (uint16_t)(((c & 31) << 6) | (c2 & 63));
      // Write the int 16 to the string and upate index
      memcpy((utf8_string + utf8_i), &unicode, 2);
      // Upadate index
      i = i + 2;
      utf8_i = utf8_i + 2;
    } else {
    //   // Let's create the integers containing the 16 bit value for unicode
      c2 = (unsigned char)string[i + 1];
      c3 = (unsigned char)string[i + 2];
      // Pack to unicode value
      unicode = (uint16_t)(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
      // Write the int 16 to the string and upate index
      memcpy((utf8_string + utf8_i), &unicode, 2);     
      // Upadate indexs
      i = i + 3;
      utf8_i = utf8_i + 2;
    }
  }
  // Add null termiating character
  *(utf8_string + utf8_i + 1) = '\0';
  // Return pointer of converted string
  return utf8_string;
}

// Decode a byte
uint16_t BSON::deserialize_int8(char *data, uint32_t offset) {
  uint16_t value = 0;
  value |= *(data + offset + 0);              
  return value;
}

// Requires a 4 byte char array
uint32_t BSON::deserialize_int32(char* data, uint32_t offset) {
  uint32_t value = 0;
  memcpy(&value, (data + offset), 4);
  return value;
}

// Exporting function
extern "C" void init(Handle<Object> target) {
  HandleScope scope;
  BSON::Initialize(target);
  Long::Initialize(target);
  ObjectID::Initialize(target);
  Binary::Initialize(target);
  Code::Initialize(target);
  DBRef::Initialize(target);
  Timestamp::Initialize(target);
}

// NODE_MODULE(bson, BSON::Initialize);
// NODE_MODULE(l, Long::Initialize);
