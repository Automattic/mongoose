#ifndef LONG_H_
#define LONG_H_

#include <node.h>
#include <node_object_wrap.h>
#include <v8.h>

using namespace v8;
using namespace node;

class Long : public ObjectWrap {  
  public:
    int32_t low_bits;
    int32_t high_bits;

    Long(int32_t low_bits, int32_t high_bits);
    ~Long();
    
    static inline bool HasInstance(Handle<Value> val) {
      if (!val->IsObject()) return false;
      Local<Object> obj = val->ToObject();
      return constructor_template->HasInstance(obj);
    }    
        
    bool isZero();
    bool isNegative();
    bool equals(Long *other);
    Long *div(Long *other);
    Long *subtract(Long *other);
    Long *negate();
    Long *multiply(Long *other);
    Long *add(Long *other);
    Long *not_();
    bool isOdd();
    bool greaterThanOrEqual(Long *other);
    bool greaterThan(Long *other);
    int64_t toNumber();
    int32_t toInt();
    int64_t compare(Long *other);
    int64_t getLowBitsUnsigned();
	char *toString(int32_t radix, char *buffer);
    Long *shiftRight(int32_t number_bits);
    Long *shiftLeft(int32_t number_bits);

    static Long *fromInt(int64_t value);
    static Long *fromBits(int32_t low_bits, int32_t high_bits);
    static Long *fromNumber(double value);

    // Getter and Setter for object values
    static Handle<Value> LowGetter(Local<String> property, const AccessorInfo& info);
    static void LowSetter(Local<String> property, Local<Value> value, const AccessorInfo& info);
    static Handle<Value> HighGetter(Local<String> property, const AccessorInfo& info);
    static void HighSetter(Local<String> property, Local<Value> value, const AccessorInfo& info);
    // Functions available from V8
    static void Initialize(Handle<Object> target);    
    static Handle<Value> FromNumber(const Arguments &args);
    static Handle<Value> ToString(const Arguments &args);
    static Handle<Value> Inspect(const Arguments &args);
    static Handle<Value> IsZero(const Arguments &args);
    static Handle<Value> GetLowBits(const Arguments &args);
    static Handle<Value> GetHighBits(const Arguments &args);
    static Handle<Value> GreatherThan(const Arguments &args);
    static Handle<Value> FromInt(const Arguments &args);
    static Handle<Value> ToInt(const Arguments &args);
    static Handle<Value> ToNumber(const Arguments &args);
    static Handle<Value> ToJSON(const Arguments &args);
    static Handle<Value> Equals(const Arguments &args);

    // Constructor used for creating new Long objects from C++
    static Persistent<FunctionTemplate> constructor_template;
    
  protected:
    static Handle<Value> New(const Arguments &args);
};

#endif  // LONG_H_