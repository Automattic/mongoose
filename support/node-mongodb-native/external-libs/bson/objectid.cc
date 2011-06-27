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

#include "objectid.h"

static Handle<Value> VException(const char *msg) {
    HandleScope scope;
    return ThrowException(Exception::Error(String::New(msg)));
  };

Persistent<FunctionTemplate> ObjectID::constructor_template;

ObjectID::ObjectID(char *o) : ObjectWrap() {
    memcpy(this->oid, o, OBJECTID_SIZE);
}

ObjectID::~ObjectID() {
}

char *ObjectID::uint32_to_char(uint32_t value, char *buf) {
  *(buf) = (char)(value & 0xff);
  *(buf + 1) = (char)((value >> 8) & 0xff);
  *(buf + 2) = (char)((value >> 16) & 0xff);
  *(buf + 3) = (char)((value >> 24) & 0xff);
  *(buf + 4) = '\0';
  return buf;
}

// Generates a new oid
char *ObjectID::oid_id_generator(char *oid_string) {
  // Blatant copy of the code from mongodb-c driver
  static int incr = 0;
  int fuzz = 0;
  // Fetch a new counter ()
  int i = incr++; /*TODO make atomic*/
  int t = time(NULL);
  
  /* TODO rand sucks. find something better */
  if (!fuzz){
    srand(t);
    fuzz = rand();
  }
  
  // Build a 12 byte char string based on the address of the current object, the rand number and the current time
  char oid_string_c[12 * sizeof(char) + 1];
  
  *(oid_string_c + 12) = '\0';
  
  ObjectID::uint32_to_char(t,oid_string_c);
  ObjectID::uint32_to_char(fuzz,oid_string_c + 4);
  ObjectID::uint32_to_char(i,oid_string_c + 8);

  // Allocate storage for a 24 character hex oid    
  char *pbuffer = oid_string;
  // Terminate the string
  *(pbuffer + 24) = '\0';      
  // Unpack the oid in hex form
  for(int32_t i = 0; i < 12; i++) {
    sprintf(pbuffer, "%02x", (unsigned char)*(oid_string_c + i));
    pbuffer += 2;
  }        
  
  return oid_string;
}

Handle<Value> ObjectID::New(const Arguments &args) {
  HandleScope scope;
  
  // If no arguments are passed in we generate a new ID automagically
  if(args.Length() == 0) {
    // Instantiate a ObjectID object
    char oid_string[OBJECTID_SIZE];
    ObjectID::oid_id_generator(oid_string);
    ObjectID *oid = new ObjectID(oid_string);
    
    // Wrap it
    oid->Wrap(args.This());
    // Return the object
    return args.This();        
  } 
  else 
  {
    // Ensure we have correct parameters passed in
    if(args.Length() != 1 && (!args[0]->IsString() || !args[0]->IsNull())) {
      return VException("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters in hex format");
    }

    // Contains the final oid string
    char oid_string_c[OBJECTID_SIZE];
    

    // If we have a null generate a new oid
    if(args[0]->IsNull()) 
    {
      ObjectID::oid_id_generator(oid_string_c);
    } 
    else 
    {
      *(oid_string_c + 24) = '\0';      
      
      // Convert the argument to a String
      Local<String> oid_string = args[0]->ToString();  
      if(oid_string->Length() != 12 && oid_string->Length() != 24) {
        return VException("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters in hex format");
      }
  
      if(oid_string->Length() == 12) 
      {            
        // Contains the bytes for the string
        char oid_string_bytes[13];
        // Decode the 12 bytes of the oid
        node::DecodeWrite(oid_string_bytes, 13, oid_string, node::BINARY);    
        // Unpack the String object to char*
        char *pbuffer = oid_string_c;      
        // Unpack the oid in hex form
        for(int32_t i = 0; i < 12; i++) {
          sprintf(pbuffer, "%02x", (unsigned char)*(oid_string_bytes + i));
          pbuffer += 2;
        } 
      } 
      else 
      {
        // Decode the content
        node::DecodeWrite(oid_string_c, 25, oid_string, node::BINARY);        
      }      
    }
  
    // Instantiate a ObjectID object
    ObjectID *oid = new ObjectID(oid_string_c);

    // Wrap it
    oid->Wrap(args.This());
    // Return the object
    return args.This();    
  }  
}

static Persistent<String> id_symbol;

void ObjectID::Initialize(Handle<Object> target) {
  // Grab the scope of the call from Node
  HandleScope scope;
  // Define a new function template
  Local<FunctionTemplate> t = FunctionTemplate::New(New);
  constructor_template = Persistent<FunctionTemplate>::New(t);
  constructor_template->InstanceTemplate()->SetInternalFieldCount(1);
  constructor_template->SetClassName(String::NewSymbol("ObjectID"));

  // Propertry symbols
  id_symbol = NODE_PSYMBOL("id");

  // Getters for correct serialization of the object  
  constructor_template->InstanceTemplate()->SetAccessor(id_symbol, IdGetter, IdSetter);
  
  // Instance methods
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "toString", ToString);
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "inspect", Inspect);  
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "toHexString", ToHexString);  
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "equals", Equals);
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "toJSON", ToJSON);

  // Class methods
  NODE_SET_METHOD(constructor_template->GetFunction(), "createPk", CreatePk);
  NODE_SET_METHOD(constructor_template->GetFunction(), "createFromHexString", CreateFromHexString);

  target->Set(String::NewSymbol("ObjectID"), constructor_template->GetFunction());
}

Handle<Value> ObjectID::Equals(const Arguments &args) {
  HandleScope scope;
  
  if(args.Length() != 1 && !args[0]->IsObject()) return scope.Close(Boolean::New(false));
  // Retrieve the object
  Local<Object> object_id_obj = args[0]->ToObject();
  // Ensure it's a valid type object (of type Object ID)
  if(!ObjectID::HasInstance(object_id_obj)) return scope.Close(Boolean::New(false));
  // Ok we got an object ID, let's unwrap the value to compare the actual id's
  ObjectID *object_id = ObjectWrap::Unwrap<ObjectID>(object_id_obj);
  // Let's unpack the current object
  ObjectID *current_object_id = ObjectWrap::Unwrap<ObjectID>(args.This());
  // Now let's compare the id values between out current object and the existing one
  bool result = current_object_id->equals(object_id);
  // Return the result of the comparision
  return scope.Close(Boolean::New(result));
}

Handle<Value> ObjectID::CreatePk(const Arguments &args) {
  HandleScope scope;
  
  char oid_string[OBJECTID_SIZE];
  ObjectID::oid_id_generator(oid_string);
  // Return the value  
  Local<Value> argv[] = {String::New(oid_string)};
  Handle<Value> object_id_obj = ObjectID::constructor_template->GetFunction()->NewInstance(1, argv);    

  // Return the close object
  return scope.Close(object_id_obj);
}

Handle<Value> ObjectID::IdGetter(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  
  // Unpack the long object
  ObjectID *objectid_obj = ObjectWrap::Unwrap<ObjectID>(info.Holder());
  // Convert the hex oid to bin
  char *binary_oid = objectid_obj->convert_hex_oid_to_bin();
  // Create string and return it
  Local<String> final_str = Encode(binary_oid, 12, BINARY)->ToString();
  // Free the memory for binary_oid
  free(binary_oid);
  // Close the scope
  return scope.Close(final_str);
}

bool ObjectID::equals(ObjectID *object_id) {
  char *current_id = this->oid;
  char *compare_id = object_id->oid;
  
  for(uint32_t i = 0; i < 24; i++) {
    if(*(current_id + i) != *(compare_id + i))
    {
      return false;
    }
  }
  
  return true;
}

char *ObjectID::convert_hex_oid_to_bin() {
  // Turn the oid into the binary equivalent
  char *binary_oid = (char *)malloc(12 * sizeof(char) + 1);
  *(binary_oid + 12) = '\0';
  char n_val;
  char *nval_str = (char *)malloc(3);
  *(nval_str + 2) = '\0';  
  uint32_t x1;

  // Let's convert the hex value to binary
  for(uint32_t i = 0; i < 12; i++) {
    nval_str[0] = *(this->oid + (i*2));
    nval_str[1] = *(this->oid + (i*2) + 1);    
    sscanf(nval_str, "%x", &x1);
    *(binary_oid + i) = (char)(x1);
  }

  // release the memory for the n_val_str
  free(nval_str);
  // Return the pointer to the converted string
  return binary_oid;
}

void ObjectID::IdSetter(Local<String> property, Local<Value> value, const AccessorInfo& info) {
}


Handle<Value> ObjectID::CreateFromHexString(const Arguments &args) {
  HandleScope scope;
  
  if(args.Length() != 1 && args[0]->IsString()) return VException("One argument required of type string");
  
  Local<Value> argv[] = {args[0]};
  Handle<Value> oid_obj = ObjectID::constructor_template->GetFunction()->NewInstance(1, argv);
  return scope.Close(oid_obj);
}

Handle<Value> ObjectID::ToHexString(const Arguments &args) {
  return ToString(args);
}

Handle<Value> ObjectID::Inspect(const Arguments &args) {
  return ToString(args);
}

Handle<Value> ObjectID::ToString(const Arguments &args) {
  HandleScope scope;

  // Unpack the ObjectID instance
  ObjectID *oid = ObjectWrap::Unwrap<ObjectID>(args.This());  
  // Return the id
  return String::New(oid->oid);
}

Handle<Value> ObjectID::ToJSON(const Arguments &args) {
  return ToString(args);
}








