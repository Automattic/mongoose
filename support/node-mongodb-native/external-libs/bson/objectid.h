#ifndef OBJECTID_H_
#define OBJECTID_H_

#include <node.h>
#include <node_object_wrap.h>
#include <v8.h>

using namespace v8;
using namespace node;

class ObjectID : public ObjectWrap {  
  public:
    char *oid;
    
    ObjectID(char *oid);
    ~ObjectID();    

    static inline bool HasInstance(Handle<Value> val) {
      if (!val->IsObject()) return false;
      Local<Object> obj = val->ToObject();
      return constructor_template->HasInstance(obj);
    }    

    // Functions available from V8
    static void Initialize(Handle<Object> target);    
    static Handle<Value> ToString(const Arguments &args);
    static Handle<Value> Inspect(const Arguments &args);
    static Handle<Value> ToHexString(const Arguments &args);
    static Handle<Value> ToJSON(const Arguments &args);
    static Handle<Value> CreatePk(const Arguments &args);
    static Handle<Value> CreateFromHexString(const Arguments &args);
		static Handle<Value> Equals(const Arguments &args);

    // Properties
    static Handle<Value> IdGetter(Local<String> property, const AccessorInfo& info);
    static void IdSetter(Local<String> property, Local<Value> value, const AccessorInfo& info);

    // Constructor used for creating new Long objects from C++
    static Persistent<FunctionTemplate> constructor_template;
    // Instance methods
    char *convert_hex_oid_to_bin();    
		bool equals(ObjectID *object_id);
  private:
    static Handle<Value> New(const Arguments &args);
    
    // Generates oid's (Based on BSON C lib)
    static char *oid_id_generator();
    static char *uint32_to_char(uint32_t value);    
};

#endif  // OBJECTID_H_