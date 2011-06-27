#include <assert.h>
#include <string.h>
#include <stdlib.h>
#include <v8.h>
#include <node.h>
#include <node_events.h>
#include <node_buffer.h>
#include <cstring>
#include <cmath>
#include <cstdlib>
#include <iostream>
#include <limits>

#include "code.h"

static Handle<Value> VException(const char *msg) {
    HandleScope scope;
    return ThrowException(Exception::Error(String::New(msg)));
  };

Persistent<FunctionTemplate> Code::constructor_template;

Code::Code(char *code, Persistent<Object> scope_object) : ObjectWrap() {
  this->code = code;
  this->scope_object = scope_object;
}

Code::~Code() {
  if(this->code != NULL) free(this->code);
}

Handle<Value> Code::New(const Arguments &args) {
  HandleScope scope;
  
  char *code;
  Persistent<Object> scope_object;
  Local<String> str;
  
  if(args.Length() != 1 && args.Length() != 2) {
    return VException("There must be either 1 or 2 arguments passed in where the first argument is a string and the second a object for the scope");
  }
  
  if(args.Length() == 1 && (!args[0]->IsString() && !args[0]->IsFunction())) {
    return VException("There must be either 1 or 2 arguments passed in where the first argument is a string and the second a object for the scope");    
  }
  
  if(args.Length() == 2 && (!args[0]->IsString() && !args[0]->IsFunction()) && !args[1]->IsObject()) {
    return VException("There must be either 1 or 2 arguments passed in where the first argument is a string and the second a object for the scope");        
  }  
  
  if(args[0]->IsFunction()) {
    str = args[0]->ToObject()->ToString();
  } else {
    // Decode the string
    str = args[0]->ToString();    
  }
  
  // Set up the string
  code = (char *)malloc(str->Length() * sizeof(char) + 1);
  *(code + str->Length()) = '\0';
  // Copy over
  node::DecodeWrite(code, str->Length(), str, node::BINARY);  
  // Decode the scope and wrap it in a persistent object to ensure
  // v8 does not gc the object
  if(args.Length() == 2) {
    scope_object = Persistent<Object>::New(args[1]->ToObject());
  } else {
    scope_object = Persistent<Object>::New(Object::New());
  }
  
  // Create code object
  Code *code_obj = new Code(code, scope_object);
  // Wrap it
  code_obj->Wrap(args.This());
  // Return the object
  return args.This();    
}

static Persistent<String> code_symbol;
static Persistent<String> scope_symbol;

void Code::Initialize(Handle<Object> target) {
  // Grab the scope of the call from Node
  HandleScope scope;
  // Define a new function template
  Local<FunctionTemplate> t = FunctionTemplate::New(New);
  constructor_template = Persistent<FunctionTemplate>::New(t);
  constructor_template->InstanceTemplate()->SetInternalFieldCount(1);
  constructor_template->SetClassName(String::NewSymbol("Code"));
  
  // Propertry symbols
  code_symbol = NODE_PSYMBOL("code");
  scope_symbol = NODE_PSYMBOL("scope");

  // Getters for correct serialization of the object  
  constructor_template->InstanceTemplate()->SetAccessor(code_symbol, CodeGetter, CodeSetter);
  constructor_template->InstanceTemplate()->SetAccessor(scope_symbol, ScopeGetter, ScopeSetter);
  
  // Instance methods
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "toString", ToString);
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "inspect", Inspect);  

  target->Set(String::NewSymbol("Code"), constructor_template->GetFunction());
}

Handle<Value> Code::CodeGetter(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  
  // Unpack the long object
  Code *code_obj = ObjectWrap::Unwrap<Code>(info.Holder());
  // Extract value doing a cast of the pointer to Long and accessing code
  char *code = code_obj->code;
  // Return the string
  return scope.Close(String::New(code));
}

void Code::CodeSetter(Local<String> property, Local<Value> value, const AccessorInfo& info) {
  if(value->IsString()) {
    // Unpack the long object
    Code *code_obj = ObjectWrap::Unwrap<Code>(info.Holder());
    // Convert the value to a string
    Local<String> str = value->ToString();
    // Set up the string
    char *code = (char *)malloc(str->Length() * sizeof(char) + 1);
    *(code + str->Length()) = '\0';
    // Copy over
    node::DecodeWrite(code, str->Length(), str, node::BINARY);  
    // Free existing pointer if any
    if(code_obj->code != NULL) free(code_obj->code);
    // Return the code
    code_obj->code = code;
  }
}

Handle<Value> Code::ScopeGetter(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  
  // Unpack the long object
  Code *code_obj = ObjectWrap::Unwrap<Code>(info.Holder());
  // Extracting value doing a cast of the pointer to Value
  return scope.Close(code_obj->scope_object);
}

void Code::ScopeSetter(Local<String> property, Local<Value> value, const AccessorInfo& info) {
  if(value->IsObject()) {
    // Unpack the long object
    Code *code_obj = ObjectWrap::Unwrap<Code>(info.Holder());
    // Fetch the local
    Local<Object> value_obj = value->ToObject();
    // Set the low bits
    code_obj->scope_object = Persistent<Object>::New(value_obj);
  }
}

Handle<Value> Code::Inspect(const Arguments &args) {
  HandleScope scope;
  
  // Unpack the Binary object
  Code *code = ObjectWrap::Unwrap<Code>(args.This());
  // Return a new Object
  Local<Object> inspect_object = Object::New();
  inspect_object->Set(String::New("code"), String::New(code->code));
  inspect_object->Set(String::New("scope"), code->scope_object);
  // Return the object
  return scope.Close(inspect_object->ToString());
}

Handle<Value> Code::ToString(const Arguments &args) {
  HandleScope scope;

  // Unpack the Binary object
  // Binary *binary = ObjectWrap::Unwrap<Binary>(args.This());
  // Return the raw data  
  // return String::New(binary->data);  
  return String::New("Code::ToString");
}









