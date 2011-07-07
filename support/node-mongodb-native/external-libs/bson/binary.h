#ifndef BINARY_H_
#define BINARY_H_

#include <node.h>
#include <node_object_wrap.h>
#include <v8.h>

using namespace v8;
using namespace node;

class Binary : public ObjectWrap {  
  public:
    char *data;
    uint32_t number_of_bytes;
    uint32_t sub_type;
    uint32_t index;
    
    Binary(uint32_t sub_type, uint32_t number_of_bytes, uint32_t index, char *data);
    ~Binary();    

    // Has instance check
    static inline bool HasInstance(Handle<Value> val) {
      if (!val->IsObject()) return false;
      Local<Object> obj = val->ToObject();
      return constructor_template->HasInstance(obj);
    }    

    // Functions available from V8
    static void Initialize(Handle<Object> target);    
    static Handle<Value> ToString(const Arguments &args);
    static Handle<Value> Inspect(const Arguments &args);
    static Handle<Value> Data(const Arguments &args);
    static Handle<Value> Length(const Arguments &args);
    static Handle<Value> Put(const Arguments &args);
    static Handle<Value> Write(const Arguments &args);
    static Handle<Value> Read(const Arguments &args);
    
    /**
     * Writes this binary data into node Buffer passed as first js arg. 
     * Optional second js arg: internal data offset of this binary (Integer)
     * Up to Min(Buffer.length, Binary.length - offset) bytes will be writen into buffer.
     * Return number of bytes actually written into buffer.
     */
    static Handle<Value> ReadInto(const Arguments &args);

    // Constructor used for creating new Long objects from C++
    static Persistent<FunctionTemplate> constructor_template;

    // Getter and Setter for object values
    static Handle<Value> SubtypeGetter(Local<String> property, const AccessorInfo& info);
    static void SubtypeSetter(Local<String> property, Local<Value> value, const AccessorInfo& info);
    
  private:
    static Handle<Value> New(const Arguments &args);
};

#endif  // BINARY_H_