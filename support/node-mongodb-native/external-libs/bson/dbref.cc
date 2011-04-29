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

#include "dbref.h"
#include "objectid.h"

static Handle<Value> VException(const char *msg) {
    HandleScope scope;
    return ThrowException(Exception::Error(String::New(msg)));
  };

Persistent<FunctionTemplate> DBRef::constructor_template;

DBRef::DBRef(char *ref, Persistent<Value> oid, char *db) : ObjectWrap() {
  this->ref = ref;
  this->oid = oid;
  this->db = db;
}

DBRef::~DBRef() {
  if(this->ref != NULL) free(this->ref);
  if(this->db != NULL) free(this->db);
}

Handle<Value> DBRef::New(const Arguments &args) {
  HandleScope scope;
  
  // Ensure we have the parameters needed
  if(args.Length() != 2 && args.Length() != 3) return VException("Two or Three arguments needed [String, String|ObjectID, String|Null]");
  
  // Initialize the objectid
  char *db_data = NULL;

  // Unpack the values and create the associated objects
  Local<String> ref = args[0]->ToString();
  
  // Persist the oid key object
  Persistent<Value> oid_value = Persistent<Value>::New(args[1]);
  
  // Decode the db object
  if(args.Length() == 3 && args[2]->IsString()) {
    // Decode the db string
    Local<String> db = args[2]->ToString();    
    // Unpack the db variable as char *
    db_data = (char *)malloc(db->Length() + 1);
    node::DecodeWrite(db_data, db->Length(), db, node::BINARY);
    *(db_data + db->Length()) = '\0';    
  }
  
  // Unpack the variables as char*
  char *ref_data = (char *)malloc(ref->Length() + 1);
  node::DecodeWrite(ref_data, ref->Length(), ref, node::BINARY);
  *(ref_data + ref->Length()) = '\0';

  // Create a db ref object
  DBRef *dbref = new DBRef(ref_data, oid_value, db_data);
  // Return the reference object
  dbref->Wrap(args.This());
  // Return the object
  return args.This();
}

static Persistent<String> namespace_symbol;
static Persistent<String> oid_symbol;
static Persistent<String> db_symbol;

static Persistent<String> namespace_json_symbol;
static Persistent<String> oid_json_symbol;
static Persistent<String> db_json_symbol;
// static Persistent<String> id_symbol;

void DBRef::Initialize(Handle<Object> target) {
  // Grab the scope of the call from Node
  HandleScope scope;
  // Define a new function template
  Local<FunctionTemplate> t = FunctionTemplate::New(New);
  constructor_template = Persistent<FunctionTemplate>::New(t);
  constructor_template->InstanceTemplate()->SetInternalFieldCount(1);
  constructor_template->SetClassName(String::NewSymbol("DBRef"));

  // Propertry symbols
  namespace_symbol = NODE_PSYMBOL("namespace");
  oid_symbol = NODE_PSYMBOL("oid");
  db_symbol = NODE_PSYMBOL("db");

  namespace_json_symbol = NODE_PSYMBOL("$ref");
  oid_json_symbol = NODE_PSYMBOL("$id");
  db_json_symbol = NODE_PSYMBOL("$db");
  // id_symbol = NODE_PSYMBOL("id");

  // Getters for correct serialization of the object  
  constructor_template->InstanceTemplate()->SetAccessor(namespace_symbol, NamespaceGetter, NamespaceSetter);
  constructor_template->InstanceTemplate()->SetAccessor(oid_symbol, OidGetter, OidSetter);
  constructor_template->InstanceTemplate()->SetAccessor(db_symbol, DbGetter, DbSetter);
  // constructor_template->InstanceTemplate()->SetAccessor(id_symbol, IdGetter, IdSetter);
  
  // Instance methods
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "toString", ToString);
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "inspect", Inspect);  
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "toJSON", ToJSON);

  target->Set(String::NewSymbol("DBRef"), constructor_template->GetFunction());
}

// Namespace setter/getter
Handle<Value> DBRef::NamespaceGetter(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  
  // Unpack the long object
  DBRef *dbref_obj = ObjectWrap::Unwrap<DBRef>(info.Holder());
  // Char value
  char *value = dbref_obj->ref;
  // Return the value  
  return scope.Close(String::New(value));
}

void DBRef::NamespaceSetter(Local<String> property, Local<Value> value, const AccessorInfo& info) {
  HandleScope scope;
}

// oid setter/getter
Handle<Value> DBRef::OidGetter(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  
  // Unpack the long object
  DBRef *dbref_obj = ObjectWrap::Unwrap<DBRef>(info.Holder());
  // Return the oid
  return scope.Close(dbref_obj->oid);
}

void DBRef::OidSetter(Local<String> property, Local<Value> value, const AccessorInfo& info) {
  HandleScope scope;
}

// db setter/getter
Handle<Value> DBRef::DbGetter(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  
  // Unpack the long object
  DBRef *dbref_obj = ObjectWrap::Unwrap<DBRef>(info.Holder());
  // Char value
  char *value = dbref_obj->db;
  // Return the value  
  return scope.Close(String::New(value));
}

void DBRef::DbSetter(Local<String> property, Local<Value> value, const AccessorInfo& info) {
  HandleScope scope;
}

Handle<Value> DBRef::Inspect(const Arguments &args) {
  HandleScope scope;
  
  // // Unpack the ObjectID instance
  // ObjectID *oid = ObjectWrap::Unwrap<ObjectID>(args.This());  
  // Return the id
  return String::New("DBRef::Inspect");
}

Handle<Value> DBRef::ToString(const Arguments &args) {
  HandleScope scope;

  // // Unpack the ObjectID instance
  // ObjectID *oid = ObjectWrap::Unwrap<ObjectID>(args.This());  
  // Return the id
  return String::New("DBRef::ToString");
}

Handle<Value> DBRef::ToJSON(const Arguments &args) {
    HandleScope scope;

    DBRef *dbref_obj = ObjectWrap::Unwrap<DBRef > (args.This());
    Local<Object> ret = Object::New();
    if (dbref_obj->ref) {
        ret->Set(namespace_json_symbol, String::New(dbref_obj->ref));
    }
    ret->Set(oid_json_symbol, dbref_obj->oid);
    if (dbref_obj->db) {
        ret->Set(db_json_symbol, String::New(dbref_obj->db));
    }
    return scope.Close(ret);
}







