#ifndef BSON_H_
#define BSON_H_

#include <node.h>
#include <node_object_wrap.h>
#include <v8.h>

using namespace v8;
using namespace node;

class BSON : public EventEmitter {
  public:    
    BSON() : EventEmitter() {}
    ~BSON() {}
    
    static void Initialize(Handle<Object> target);
    static Handle<Value> BSONSerialize(const Arguments &args);
    static Handle<Value> BSONDeserialize(const Arguments &args);

    // Encode functions
    static Handle<Value> EncodeLong(const Arguments &args);
    static Handle<Value> ToLong(const Arguments &args);
    static Handle<Value> ToInt(const Arguments &args);
  
    // Constructor used for creating new BSON objects from C++
    static Persistent<FunctionTemplate> constructor_template;

  private:
    static Handle<Value> New(const Arguments &args);
    static Handle<Value> deserialize(char *data, bool is_array_item);
    static uint32_t serialize(char *serialized_object, uint32_t index, Handle<Value> name, Handle<Value> value, bool check_key);

    static char* extract_string(char *data, uint32_t offset);
    static const char* ToCString(const v8::String::Utf8Value& value);
    static uint32_t calculate_object_size(Handle<Value> object);

    static void write_int32(char *data, uint32_t value);
    static void write_int64(char *data, int64_t value);
    static void write_double(char *data, double value);
    static int deserialize_sint8(char *data, uint32_t offset);
    static int deserialize_sint16(char *data, uint32_t offset);
    static long deserialize_sint32(char *data, uint32_t offset);
    static uint16_t deserialize_int8(char *data, uint32_t offset);
    static uint32_t deserialize_int32(char* data, uint32_t offset);
    static char *check_key(Local<String> key);
    static char *decode_utf8(char * string, uint32_t length);
        
    // Decode function
    static Handle<Value> decodeLong(int64_t value);
    static Handle<Value> decodeTimestamp(int64_t value);
    static Handle<Value> decodeOid(char *oid);
    static Handle<Value> decodeBinary(uint32_t sub_type, uint32_t number_of_bytes, char *data);
    static Handle<Value> decodeCode(char *code, Handle<Value> scope);
    static Handle<Value> decodeDBref(Local<Value> ref, Local<Value> oid, Local<Value> db);
};

#endif  // BSON_H_
