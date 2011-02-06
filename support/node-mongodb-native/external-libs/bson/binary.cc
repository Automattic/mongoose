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

#include "binary.h"

const uint32_t BSON_BINARY_SUBTYPE_FUNCTION = 1;
const uint32_t BSON_BINARY_SUBTYPE_BYTE_ARRAY = 2;
const uint32_t BSON_BINARY_SUBTYPE_UUID = 3;
const uint32_t BSON_BINARY_SUBTYPE_MD5 = 4;
const uint32_t BSON_BINARY_SUBTYPE_USER_DEFINED = 128;

static Handle<Value> VException(const char *msg) {
    HandleScope scope;
    return ThrowException(Exception::Error(String::New(msg)));
  };

Persistent<FunctionTemplate> Binary::constructor_template;

Binary::Binary(uint32_t sub_type, uint32_t number_of_bytes, uint32_t index, char *data) : ObjectWrap() {
  this->sub_type = sub_type;
  this->number_of_bytes = number_of_bytes;
  this->index = index;
  this->data = data;  
}

Binary::~Binary() {
  free(this->data);
}

Handle<Value> Binary::New(const Arguments &args) {
  HandleScope scope;
  Binary *binary;
  
  if(args.Length() > 2) {
    return VException("Argument must be either none, a string or a sub_type and string");    
  }
  
  if(args.Length() == 0) {
    char *oid_string_bytes = (char *)malloc(256);
    *(oid_string_bytes) = '\0';
    binary = new Binary(BSON_BINARY_SUBTYPE_BYTE_ARRAY, 256, 0, oid_string_bytes);
  } else if(args.Length() == 1 && args[0]->IsString()) {
    Local<String> str = args[0]->ToString();
    // Contains the bytes for the data
    char *oid_string_bytes = (char *)malloc(str->Length() + 1);
    *(oid_string_bytes + str->Length()) = '\0';
    // Decode the data from the string
    node::DecodeWrite(oid_string_bytes, str->Length(), str, node::BINARY);    
    // Create a binary object
    binary = new Binary(BSON_BINARY_SUBTYPE_BYTE_ARRAY, str->Length(), str->Length(), oid_string_bytes);
  } else if(args.Length() == 2 && args[0]->IsNumber() && args[1]->IsString()) {    
    Local<Integer> intr = args[0]->ToInteger();
    Local<String> str = args[1]->ToString();
    // Contains the bytes for the data
    char *oid_string_bytes = (char *)malloc(str->Length() + 1);
    *(oid_string_bytes + str->Length()) = '\0';
    // Decode the data from the string
    node::DecodeWrite(oid_string_bytes, str->Length(), str, node::BINARY);        
    // Decode the subtype
    uint32_t sub_type = intr->Uint32Value();
    binary = new Binary(sub_type, str->Length(), str->Length(), oid_string_bytes);
  } else {
    return VException("Argument must be either none, a string or a sub_type and string");        
  }
  
  // Wrap it
  binary->Wrap(args.This());
  // Return the object
  return args.This();    
}

static Persistent<String> subtype_symbol;

void Binary::Initialize(Handle<Object> target) {
  // Grab the scope of the call from Node
  HandleScope scope;
  // Define a new function template
  Local<FunctionTemplate> t = FunctionTemplate::New(New);
  constructor_template = Persistent<FunctionTemplate>::New(t);
  constructor_template->InstanceTemplate()->SetInternalFieldCount(1);
  constructor_template->SetClassName(String::NewSymbol("Binary"));
  
  // Propertry symbols
  subtype_symbol = NODE_PSYMBOL("sub_type");
  
  // Instance methods
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "toString", ToString);
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "inspect", Inspect);
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "value", Data);
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "length", Length);
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "put", Put);
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "write", Write);
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "read", Read);

  // Getters for correct serialization of the object  
  constructor_template->InstanceTemplate()->SetAccessor(subtype_symbol, SubtypeGetter, SubtypeSetter);

  target->Set(String::NewSymbol("Binary"), constructor_template->GetFunction());
}

Handle<Value> Binary::SubtypeGetter(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;  

  // Unpack object reference
  Binary *binary_obj = ObjectWrap::Unwrap<Binary>(info.Holder());
  // Extract value doing a cast of the pointer to Long and accessing low_bits
  int32_t sub_type = binary_obj->sub_type;
  Local<Integer> sub_type_int = Integer::New(sub_type);
  return scope.Close(sub_type_int);
}

void Binary::SubtypeSetter(Local<String> property, Local<Value> value, const AccessorInfo& info) {
  // Do nothing for now
}

Handle<Value> Binary::Read(const Arguments &args) {
  HandleScope scope;

  // Ensure we have the right parameters
  if(args.Length() != 2 && !args[0]->IsUint32() && !args[1]->IsUint32()) return VException("Function takes two arguments of type Integer, position and offset");
  // Let's unpack the parameters
  uint32_t position = args[0]->Uint32Value();
  uint32_t length = args[1]->Uint32Value();
  // Let's unpack the binary object
  Binary *binary = ObjectWrap::Unwrap<Binary>(args.This());
  
  // Ensure that it's a valid range
  if(binary->number_of_bytes >= position && binary->number_of_bytes >= (position + length)) {
    // Decode the data
    Local<String> encoded_data = Encode((binary->data + position), length, BINARY)->ToString();
    // Return the data to the client
    return scope.Close(encoded_data);
  } else {
    return VException("position and length is outside the size of the binary");
  } 
}

Handle<Value> Binary::Write(const Arguments &args) {
  HandleScope scope;
  
  // Ensure we have the right parameters
  if(args.Length() != 1 && (!args[0]->IsString() || Buffer::HasInstance(args[0]))) return VException("Function takes one argument of type String or Buffer");
  
  // Reference variables
  char *data;
  uint32_t length;
  Local<Object> obj = args[0]->ToObject();
  
  // If we have a buffer let's retrieve the data
  if(Buffer::HasInstance(obj)) {
    #if NODE_MAJOR_VERSION == 0 && NODE_MINOR_VERSION < 3
     Buffer *buffer = ObjectWrap::Unwrap<Buffer>(obj);
     data = buffer->data();
     length = buffer->length();
    #else
     data = Buffer::Data(obj);
     length = Buffer::Length(obj);
    #endif
  } else {
    Local<String> str = args[0]->ToString();
    length = DecodeBytes(str, BINARY);
    data = (char *)malloc(length * sizeof(char));
    uint32_t written = DecodeWrite(data, length, str, BINARY);
    assert(length == written);    
  }
  
  // Ensure we got enough allocated space for the content
  Binary *binary = ObjectWrap::Unwrap<Binary>(args.This());
  // Check if we have enough space or we need to allocate more space
  if((binary->index + length) > binary->number_of_bytes) {
    // Realocate memory (and add double the current space to allow for more writing)
    binary->data = (char *)realloc(binary->data, ((binary->number_of_bytes * 2) + length));
    binary->number_of_bytes = (binary->number_of_bytes * 2) + length;
  }
  
  // Write the element out
  memcpy((binary->data + binary->index), data, length);
  // Update the index pointer
  binary->index = binary->index + length;
  // free the memory if we have allocated
  if(!Buffer::HasInstance(args[0])) {
    free(data);
  }
  // Close and return
  return scope.Close(Null());
}

Handle<Value> Binary::Put(const Arguments &args) {
  HandleScope scope;
  
  // Ensure we have the right parameters
  if(args.Length() != 1 && !args[0]->IsString()) return VException("Function takes one argument of type String containing one character");
  
  // Unpack the character (string)
  Local<String> str = args[0]->ToString();  
  // Let's unpack the string to char
  ssize_t len = DecodeBytes(str, BINARY);
  if(len != 1) return VException("Function takes one argument of type String containing one character");

  // Let's define the buffer that contains the regexp string
  // char *data = new char[len + 1];
  char *data = (char *)malloc(len * sizeof(char) + 1);
  // Write the data to the buffer from the string object
  ssize_t written = DecodeWrite(data, len, str, BINARY);

  // Unpack the binary object
  Binary *binary = ObjectWrap::Unwrap<Binary>(args.This());
  // Check if we need to adjust the size of the binary to fit more space
  if((binary->index + len) > binary->number_of_bytes) {
    // Realocate memory (and double the allocated space 256-512-1024-2048-4096) to try to lower
    // the number of times we reallocate memory
    binary->data = (char *)realloc(binary->data, binary->number_of_bytes * 2);
    binary->number_of_bytes = binary->number_of_bytes * 2;
  }
  
  // Write the element out
  *(binary->data + binary->index) = *(data);
  // Update the index pointer
  binary->index = binary->index + 1;
  // Free up the data
  // delete data;
  free(data);
  // Return a null
  return scope.Close(Null());
}

Handle<Value> Binary::Length(const Arguments &args) {
  HandleScope scope;
  
  // Unpack the Binary object
  Binary *binary = ObjectWrap::Unwrap<Binary>(args.This());
  return scope.Close(Integer::New(binary->index));
}

Handle<Value> Binary::Data(const Arguments &args) {
  HandleScope scope;
  
  // Unpack the Binary object
  Binary *binary = ObjectWrap::Unwrap<Binary>(args.This());
  // Return the raw data  
  Local<Value> bin_value = Encode(binary->data, binary->index, BINARY);
  return scope.Close(bin_value);
}

Handle<Value> Binary::Inspect(const Arguments &args) {
  HandleScope scope;
  
  // Unpack the Binary object
  Binary *binary = ObjectWrap::Unwrap<Binary>(args.This());
  // Return the raw data  
  Local<Value> bin_value = Encode(binary->data, binary->number_of_bytes, BINARY);
  return scope.Close(bin_value);
}

Handle<Value> Binary::ToString(const Arguments &args) {
  HandleScope scope;

  // Unpack the Binary object
  Binary *binary = ObjectWrap::Unwrap<Binary>(args.This());
  // Return the raw data  
  Local<Value> bin_value = Encode(binary->data, binary->number_of_bytes, BINARY);
  return scope.Close(bin_value);
}









