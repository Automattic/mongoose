#ifndef DBREF_H_
#define DBREF_H_

#include <node.h>
#include <node_object_wrap.h>
#include <v8.h>
#include "objectid.h"

using namespace v8;
using namespace node;

class DBRef : public ObjectWrap {  
  public:
    char *ref;
    Persistent<Value> oid;
    char *db;    
    
    DBRef(char *ref, Persistent<Value> oid, char *db);
    ~DBRef();

    static inline bool HasInstance(Handle<Value> val) {
      if (!val->IsObject()) return false;
      Local<Object> obj = val->ToObject();
      return constructor_template->HasInstance(obj);
    }    

    // Functions available from V8
    static void Initialize(Handle<Object> target);    
    static Handle<Value> ToString(const Arguments &args);
    static Handle<Value> Inspect(const Arguments &args);
    static Handle<Value> ToJSON(const Arguments &args);

    // Properties
    static Handle<Value> NamespaceGetter(Local<String> property, const AccessorInfo& info);
    static void NamespaceSetter(Local<String> property, Local<Value> value, const AccessorInfo& info);
    static Handle<Value> OidGetter(Local<String> property, const AccessorInfo& info);
    static void OidSetter(Local<String> property, Local<Value> value, const AccessorInfo& info);
    static Handle<Value> IdGetter(Local<String> property, const AccessorInfo& info);
    static void IdSetter(Local<String> property, Local<Value> value, const AccessorInfo& info);
    static Handle<Value> DbGetter(Local<String> property, const AccessorInfo& info);
    static void DbSetter(Local<String> property, Local<Value> value, const AccessorInfo& info);

    // Constructor used for creating new Long objects from C++
    static Persistent<FunctionTemplate> constructor_template;
  private:
    static Handle<Value> New(const Arguments &args);
};

#endif  // DBREF_H_