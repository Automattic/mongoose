#ifndef TIMESTAMP_H_
#define TIMESTAMP_H_

#include <node.h>
#include <node_object_wrap.h>
#include <v8.h>

using namespace v8;
using namespace node;

static Persistent<String> low_bits_symbol;
static Persistent<String> high_bits_symbol;

class Timestamp : public ObjectWrap {  
  public:
    int32_t low_bits;
    int32_t high_bits;

    Timestamp(int32_t low_bits, int32_t high_bits);
    ~Timestamp();
    
    static inline bool HasInstance(Handle<Value> val) {
      if (!val->IsObject()) return false;
      Local<Object> obj = val->ToObject();
      return constructor_template->HasInstance(obj);
    }    
        
    bool isZero();
    bool isNegative();
    bool equals(Timestamp *other);
    Timestamp *div(Timestamp *other);
    Timestamp *subtract(Timestamp *other);
    Timestamp *negate();
    Timestamp *multiply(Timestamp *other);
    Timestamp *add(Timestamp *other);
    Timestamp *not_();
    bool isOdd();
    bool greaterThanOrEqual(Timestamp *other);
    bool greaterThan(Timestamp *other);
    int64_t toNumber();
    int32_t toInt();
    int64_t compare(Timestamp *other);
    int64_t getLowBitsUnsigned();
    char *toString(int32_t radix);
    Timestamp *shiftRight(int32_t number_bits);
    Timestamp *shiftLeft(int32_t number_bits);

    static Timestamp *fromInt(int64_t value);
    static Timestamp *fromBits(int32_t low_bits, int32_t high_bits);
    static Timestamp *fromNumber(double value);

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

    // Constructor used for creating new Timestamp objects from C++
    static Persistent<FunctionTemplate> constructor_template;
    
  protected:
    static Handle<Value> New(const Arguments &args);
};

#endif  // TIMESTAMP_H_
