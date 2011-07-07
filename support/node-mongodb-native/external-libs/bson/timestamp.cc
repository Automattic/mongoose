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

#include "local.h"
#include "timestamp.h"

// BSON MAX VALUES
const int32_t BSON_INT32_MAX = (int32_t)2147483648L;
const int32_t BSON_INT32_MIN = (int32_t)(-1) * 2147483648L;
const int64_t BSON_INT32_ = pow(2, 32);

const double LN2 = 0.6931471805599453;

// Max Values
const int64_t BSON_INT64_MAX = (int64_t)9223372036854775807LL;
const int64_t BSON_INT64_MIN = (int64_t)(-1)*(9223372036854775807LL);

const int32_t TIMESTAMP_BUFFER_SIZE = 64;

// Constant objects used in calculations
Timestamp* TIMESTAMP_MIN_VALUE = Timestamp::fromBits(0, 0x80000000 | 0);
Timestamp* TIMESTAMP_MAX_VALUE = Timestamp::fromBits(0xFFFFFFFF | 0, 0x7FFFFFFF | 0);
Timestamp* TIMESTAMP_ZERO = Timestamp::fromInt(0);
Timestamp* TIMESTAMP_ONE = Timestamp::fromInt(1);
Timestamp* TIMESTAMP_NEG_ONE = Timestamp::fromInt(-1);

#define max(a,b) ({ typeof (a) _a = (a); typeof (b) _b = (b); _a > _b ? _a : _b; })

static Handle<Value> VException(const char *msg) {
    HandleScope scope;
    return ThrowException(Exception::Error(String::New(msg)));
  };

Persistent<FunctionTemplate> Timestamp::constructor_template;

Timestamp::Timestamp(int32_t low_bits, int32_t high_bits) : ObjectWrap() {
  this->low_bits = low_bits;
  this->high_bits = high_bits;
}

Timestamp::~Timestamp() {}

Handle<Value> Timestamp::New(const Arguments &args) {
  HandleScope scope;

  // Ensure that we have an parameter
  if(args.Length() == 1 && args[0]->IsNumber()) {
    // Unpack the value
    double value = args[0]->NumberValue();
    // Create an instance of long
    Timestamp *l = Timestamp::fromNumber(value);
    // Wrap it in the object wrap
    l->Wrap(args.This());
    // Return the context
    return args.This();
  } else if(args.Length() == 2 && args[0]->IsNumber() && args[1]->IsNumber()) {
    // Unpack the value
    int32_t low_bits = args[0]->Int32Value();
    int32_t high_bits = args[1]->Int32Value();
    // Create an instance of long
    Timestamp *l = new Timestamp(low_bits, high_bits);
    // Wrap it in the object wrap
    l->Wrap(args.This());
    // Return the context
    return args.This();    
  } else if(args.Length() == 2 && args[0]->IsString() && args[1]->IsString()) {
    // Parse the strings into int32_t values
    int32_t low_bits = 0;
    int32_t high_bits = 0;
    
    // Let's write the strings to the bits
    DecodeWrite((char*)&low_bits, 4, args[0]->ToString(), BINARY);
    DecodeWrite((char*)&high_bits, 4, args[1]->ToString(), BINARY);
    
    // Create an instance of long
    Timestamp *l = new Timestamp(low_bits, high_bits);
    // Wrap it in the object wrap
    l->Wrap(args.This());
    // Return the context
    return args.This();        
  } else {
    return VException("Argument passed in must be either a 64 bit number or two 32 bit numbers.");
  }
}

void Timestamp::Initialize(Handle<Object> target) {
  // Grab the scope of the call from Node
  HandleScope scope;
  // Define a new function template
  Local<FunctionTemplate> t = FunctionTemplate::New(New);
  constructor_template = Persistent<FunctionTemplate>::New(t);
  constructor_template->InstanceTemplate()->SetInternalFieldCount(1);
  constructor_template->SetClassName(String::NewSymbol("Timestamp"));
  
  // Propertry symbols
  low_bits_symbol = NODE_PSYMBOL("low_");
  high_bits_symbol = NODE_PSYMBOL("high_");  
  
  // Instance methods
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "toString", ToString);
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "isZero", IsZero);
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "getLowBits", GetLowBits);
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "getHighBits", GetHighBits);
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "inspect", Inspect);  
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "greaterThan", GreatherThan);  
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "toInt", ToInt);  
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "toNumber", ToNumber);  
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "toJSON", ToJSON);
  NODE_SET_PROTOTYPE_METHOD(constructor_template, "equals", Equals);

  // Getters for correct serialization of the object  
  constructor_template->InstanceTemplate()->SetAccessor(low_bits_symbol, LowGetter, LowSetter);
  constructor_template->InstanceTemplate()->SetAccessor(high_bits_symbol, HighGetter, HighSetter);
  
  // Class methods
  NODE_SET_METHOD(constructor_template->GetFunction(), "fromNumber", FromNumber);
  NODE_SET_METHOD(constructor_template->GetFunction(), "fromInt", FromInt);
  
  // Add class to scope
  target->Set(String::NewSymbol("Timestamp"), constructor_template->GetFunction());
}

Handle<Value> Timestamp::ToInt(const Arguments &args) {
  HandleScope scope;
  
  // Let's unpack the Timestamp instance that contains the number in low_bits and high_bits form
  Timestamp *l = ObjectWrap::Unwrap<Timestamp>(args.This());
  // Get lower bits
  uint32_t low_bits = l->low_bits;
  // Return the value
  return Int32::New(low_bits);
}

Handle<Value> Timestamp::ToNumber(const Arguments &args) {
  HandleScope scope;  
  // Let's unpack the Timestamp instance that contains the number in low_bits and high_bits form
  Timestamp *l = ObjectWrap::Unwrap<Timestamp>(args.This());
  return Number::New(l->toNumber());
}


Handle<Value> Timestamp::LowGetter(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  
  // Unpack the long object
  Timestamp *l = ObjectWrap::Unwrap<Timestamp>(info.Holder());
  // Return the low bits
  return Integer::New(l->low_bits);
}

void Timestamp::LowSetter(Local<String> property, Local<Value> value, const AccessorInfo& info) {
  if(value->IsNumber()) {
    // Unpack the long object
    Timestamp *l = ObjectWrap::Unwrap<Timestamp>(info.Holder());
    // Set the low bits
    l->low_bits = value->Int32Value();    
  }
}

Handle<Value> Timestamp::HighGetter(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;

  // Unpack the long object
  Timestamp *l = ObjectWrap::Unwrap<Timestamp>(info.Holder());
  // Return the low bits
  return Integer::New(l->high_bits);
}

void Timestamp::HighSetter(Local<String> property, Local<Value> value, const AccessorInfo& info) {
  if(value->IsNumber()) {
    // Unpack the long object
    Timestamp *l = ObjectWrap::Unwrap<Timestamp>(info.Holder());
    // Set the low bits
    l->high_bits = value->Int32Value();  
  }
}

Handle<Value> Timestamp::Inspect(const Arguments &args) {
  return ToString(args);
}

Handle<Value> Timestamp::GetLowBits(const Arguments &args) {
  HandleScope scope;

  // Let's unpack the Timestamp instance that contains the number in low_bits and high_bits form
  Timestamp *l = ObjectWrap::Unwrap<Timestamp>(args.This());
  // Let's fetch the low bits
  int32_t low_bits = l->low_bits;
  // Package the result in a V8 Integer object and return
  return Integer::New(low_bits);  
}

Handle<Value> Timestamp::GetHighBits(const Arguments &args) {
  HandleScope scope;

  // Let's unpack the Timestamp instance that contains the number in low_bits and high_bits form
  Timestamp *l = ObjectWrap::Unwrap<Timestamp>(args.This());
  // Let's fetch the low bits
  int32_t high_bits = l->high_bits;
  // Package the result in a V8 Integer object and return
  return Integer::New(high_bits);    
}

bool Timestamp::isZero() {
  int32_t low_bits = this->low_bits;
  int32_t high_bits = this->high_bits;
  return low_bits == 0 && high_bits == 0;
}

bool Timestamp::isNegative() {
  int32_t low_bits = this->low_bits;
  int32_t high_bits = this->high_bits;
  return high_bits < 0;
}

bool Timestamp::equals(Timestamp *l) {
  int32_t low_bits = this->low_bits;
  int32_t high_bits = this->high_bits;  
  return (high_bits == l->high_bits) && (low_bits == l->low_bits);
}

Handle<Value> Timestamp::IsZero(const Arguments &args) {
  HandleScope scope;      
    
  // Let's unpack the Timestamp instance that contains the number in low_bits and high_bits form
  Timestamp *l = ObjectWrap::Unwrap<Timestamp>(args.This());
  return Boolean::New(l->isZero());
}

int32_t Timestamp::toInt() {
  return this->low_bits;
}

char *Timestamp::toString(int32_t opt_radix, char *buffer) {
  if (opt_radix == 10) {
	  if (isNegative()) {
      sprintf(buffer,"%lld",toNumber());
	  }
	  else {
      sprintf(buffer,"%llu",toNumber());
	  }
	}
	else if (opt_radix == 16) {
      sprintf(buffer,"%llx",toNumber());	  
	}
	else {
    throw "Unsupported radix";
	}
	
  return buffer;
}

Handle<Value> Timestamp::ToString(const Arguments &args) {
  HandleScope scope;

  Timestamp *ts = ObjectWrap::Unwrap<Timestamp>(args.This());
  
  char buffer[TIMESTAMP_BUFFER_SIZE];
  ts->toString(10,buffer);

  return String::New(buffer);
}

Handle<Value> Timestamp::ToJSON(const Arguments &args) {
  return ToString(args);
}

Timestamp *Timestamp::shiftRight(int32_t number_bits) {
  number_bits &= 63;
  if(number_bits == 0) {
    return this;
  } else {
    int32_t high_bits = this->high_bits;
    if(number_bits < 32) {
      int32_t low_bits = this->low_bits;
      return Timestamp::fromBits((low_bits >> number_bits) | (high_bits << (32 - number_bits)), high_bits >> number_bits);
    } else {
      return Timestamp::fromBits(high_bits >> (number_bits - 32), high_bits >= 0 ? 0 : -1);
    }
  }
}

Timestamp *Timestamp::shiftLeft(int32_t number_bits) {
  number_bits &= 63;
  if(number_bits == 0) {
    return this;
  } else {
    int32_t low_bits = this->low_bits;
    if(number_bits < 32) {
      int32_t high_bits = this->high_bits;
      return Timestamp::fromBits(low_bits << number_bits, (high_bits << number_bits) | (low_bits >> (32 - number_bits)));
    } else {
      return Timestamp::fromBits(0, low_bits << (number_bits - 32));
    }
  }  
}

Timestamp *Timestamp::div(Timestamp *other) {
  // If we are about to do a divide by zero throw an exception
  if(other->isZero()) {
    throw "division by zero";
  } else if(this->isZero()) {
    return new Timestamp(0, 0);
  }
    
  if(this->equals(TIMESTAMP_MIN_VALUE)) {    
    if(other->equals(TIMESTAMP_ONE) || other->equals(TIMESTAMP_NEG_ONE)) {
      return Timestamp::fromBits(0, 0x80000000 | 0);
    } else if(other->equals(TIMESTAMP_MIN_VALUE)) {
      return Timestamp::fromNumber(1);
    } else {
      Timestamp *half_this = this->shiftRight(1);
      Timestamp *div_obj = half_this->div(other);
      Timestamp *approx = div_obj->shiftLeft(1);
      // Free memory
      delete div_obj;
      delete half_this;
      // Check if we are done
      if(approx->equals(TIMESTAMP_ZERO)) {
        return other->isNegative() ? Timestamp::fromNumber(0) : Timestamp::fromNumber(-1);
      } else {
        Timestamp *mul = other->multiply(approx);
        Timestamp *rem = this->subtract(mul);
        Timestamp *rem_div = rem->div(other);
        Timestamp *result = approx->add(rem_div);
        // Free memory
        delete mul;
        delete rem;
        delete rem_div;
        // Return result
        return result;
      }
    }    
  } else if(other->equals(TIMESTAMP_MIN_VALUE)) {
    return new Timestamp(0, 0);
  }
  
  // If the value is negative
  if(this->isNegative()) {    
    if(other->isNegative()) {
      Timestamp *neg = this->negate();
      Timestamp *other_neg = other->negate();
      Timestamp *result = neg->div(other_neg);
      // Free memory
      delete neg;
      delete other_neg;
      // Return result 
      return result;
    } else {
      Timestamp *neg = this->negate();
      Timestamp *neg_result = neg->div(other);
      Timestamp *result = neg_result->negate();
      // Free memory
      delete neg;
      delete neg_result;
      // Return result
      return result;
    }
  } else if(other->isNegative()) {
    Timestamp *other_neg = other->negate();
    Timestamp *div_result = this->div(other_neg);
    Timestamp *result = div_result->negate();
    // Free memory
    delete other_neg;
    delete div_result;
    // Return the result
    return result;
  }  
  
  int64_t this_number = this->toNumber();
  int64_t other_number = other->toNumber();
  int64_t result = this_number / other_number;
  // Split into the 32 bit valu
  int32_t low32, high32;
  high32 = (uint64_t)result >> 32;
  low32 = (int32_t)result;
  return Timestamp::fromBits(low32, high32);
}

Timestamp *Timestamp::multiply(Timestamp *other) {
  if(this->isZero() || other->isZero()) {
    return new Timestamp(0, 0);    
  }
  
  int64_t this_number = this->toNumber();
  int64_t other_number = other->toNumber();
  int64_t result = this_number * other_number;
  
  // Split into the 32 bit valu
  int32_t low32, high32;
  high32 = (uint64_t)result >> 32;
  low32 = (int32_t)result;
  return Timestamp::fromBits(low32, high32);
}

bool Timestamp::isOdd() {
  return (this->low_bits & 1) == 1;
}

// /** @return {number} The closest floating-point representation to this value. */
// exports.Timestamp.prototype.toNumber = function() {
//   return this.high_ * exports.Timestamp.TWO_PWR_32_DBL_ +
//          this.getLowBitsUnsigned();
// };

int64_t Timestamp::toNumber() {
  return (int64_t)(this->high_bits * BSON_INT32_ + this->getLowBitsUnsigned());
}

int64_t Timestamp::getLowBitsUnsigned() {
  return (this->low_bits >= 0) ? this->low_bits : BSON_INT32_ + this->low_bits;
}

int64_t Timestamp::compare(Timestamp *other) {
  if(this->equals(other)) {
    return 0;
  }
  
  bool this_neg = this->isNegative();
  bool other_neg = other->isNegative();
  if(this_neg && !other_neg) {
    return -1;
  }
  if(!this_neg && other_neg) {
    return 1;
  }
  
  Timestamp *return_value = this->subtract(other);  
  // At this point, the signs are the same, so subtraction will not overflow
  if(return_value->isNegative()) {
    delete return_value;
    return -1;
  } else {
    delete return_value;
    return 1;
  }
}

Timestamp *Timestamp::negate() {
  if(this->equals(TIMESTAMP_MIN_VALUE)) {
    return TIMESTAMP_MIN_VALUE;
  } else {
    Timestamp *not_obj = this->not_();
    Timestamp *add = not_obj->add(TIMESTAMP_ONE);
    delete not_obj;
    return add;
  }
}

Timestamp *Timestamp::not_() {
  return new Timestamp(~this->low_bits, ~this->high_bits);
}

Timestamp *Timestamp::add(Timestamp *other) {
  int64_t this_number = this->toNumber();
  int64_t other_number = other->toNumber();
  int64_t result = this_number + other_number;  
  // Split into the 32 bit valu
  int32_t low32, high32;
  high32 = (uint64_t)result >> 32;
  low32 = (int32_t)result;
  return Timestamp::fromBits(low32, high32);
}

Timestamp *Timestamp::subtract(Timestamp *other) {
  int64_t this_number = this->toNumber();
  int64_t other_number = other->toNumber();
  int64_t result = this_number - other_number;
  // Split into the 32 bit valu
  int32_t low32, high32;
  high32 = (uint64_t)result >> 32;
  low32 = (int32_t)result;
  return Timestamp::fromBits(low32, high32);
}

Handle<Value> Timestamp::GreatherThan(const Arguments &args) {
  HandleScope scope;
  
  if(args.Length() != 1 && !Timestamp::HasInstance(args[0])) return VException("One argument of type Timestamp required");
  
  // Let's unpack the Timestamp instance that contains the number in low_bits and high_bits form
  Timestamp *current_long_obj = ObjectWrap::Unwrap<Timestamp>(args.This());  
  // Unpack Timestamp
  Local<Object> obj = args[0]->ToObject();
  Timestamp *long_obj = Timestamp::Unwrap<Timestamp>(obj);
  // Compare the longs
  bool comparision_result = current_long_obj->greaterThan(long_obj);
  return scope.Close(Boolean::New(comparision_result));
}

Handle<Value> Timestamp::Equals(const Arguments &args) {
  HandleScope scope;
  
  if(args.Length() != 1 && !Timestamp::HasInstance(args[0])) return VException("One argument of type Timestamp required");
  
  // Let's unpack the Timestamp instance that contains the number in low_bits and high_bits form
  Timestamp *current_long_obj = ObjectWrap::Unwrap<Timestamp>(args.This());  
  // Unpack Timestamp
  Local<Object> obj = args[0]->ToObject();
  Timestamp *long_obj = Timestamp::Unwrap<Timestamp>(obj);
  // Compare the longs
  bool comparision_result = (current_long_obj->compare(long_obj) == 0);
  return scope.Close(Boolean::New(comparision_result));
}

bool Timestamp::greaterThan(Timestamp *other) {
  return this->compare(other) > 0;  
}

bool Timestamp::greaterThanOrEqual(Timestamp *other) {
  return this->compare(other) >= 0;
}

Handle<Value> Timestamp::FromInt(const Arguments &args) {
  HandleScope scope;
  
  // Validate the arguments
  if(args.Length() != 1 && !args[0]->IsNumber()) return VException("One argument of type number required");
  // Unwrap Number variable
  Local<Number> number = args[0]->ToNumber();
  // Instantiate Timestamp object and return
  Local<Value> argv[] = {number};
  Local<Object> long_obj = constructor_template->GetFunction()->NewInstance(1, argv);
  return scope.Close(long_obj);  
}

Timestamp *Timestamp::fromInt(int64_t value) {
  return new Timestamp((value | 0), (value < 0 ? -1 : 0));
}

Timestamp *Timestamp::fromBits(int32_t low_bits, int32_t high_bits) {
  return new Timestamp(low_bits, high_bits);
}

Timestamp *Timestamp::fromNumber(double value) {
  // Ensure we have a valid ranged number
  if(std::isinf(value) || std::isnan(value)) {
    return Timestamp::fromBits(0, 0);
  } else if(value <= BSON_INT64_MIN) {
    return Timestamp::fromBits(0, 0x80000000 | 0);
  } else if(value >= BSON_INT64_MAX) {
    return Timestamp::fromBits(0xFFFFFFFF | 0, 0x7FFFFFFF | 0);
  } else if(value < 0) {
    return Timestamp::fromNumber(-value)->negate();
  } else {
    int64_t int_value = (int64_t)value;
    return Timestamp::fromBits((int_value % BSON_INT32_) | 0, (int_value / BSON_INT32_) | 0);
  }  
}

Handle<Value> Timestamp::FromNumber(const Arguments &args) {
  HandleScope scope;
  
  // Ensure that we have an parameter
  if(args.Length() != 1) return VException("One argument required - number.");
  if(!args[0]->IsNumber()) return VException("Arguments passed in must be numbers.");  
  // Unpack the variable as a 64 bit integer
  int64_t value = args[0]->IntegerValue();
  double double_value = args[0]->NumberValue();
  // Ensure we have a valid ranged number
  if(std::isinf(double_value) || std::isnan(double_value)) {
    Local<Value> argv[] = {Integer::New(0), Integer::New(0)};
    Local<Object> long_obj = constructor_template->GetFunction()->NewInstance(2, argv);
    return scope.Close(long_obj);
  } else if(double_value <= BSON_INT64_MIN) {
    Local<Value> argv[] = {Integer::New(0), Integer::New(0x80000000 | 0)};
    Local<Object> long_obj = constructor_template->GetFunction()->NewInstance(2, argv);    
    return scope.Close(long_obj);    
  } else if(double_value >= BSON_INT64_MAX) {
    Local<Value> argv[] = {Integer::New(0xFFFFFFFF | 0), Integer::New(0x7FFFFFFF | 0)};
    Local<Object> long_obj = constructor_template->GetFunction()->NewInstance(2, argv);    
    return scope.Close(long_obj);        
  } else if(double_value < 0) {
    Local<Value> argv[] = {Number::New(double_value)};
    Local<Object> long_obj = constructor_template->GetFunction()->NewInstance(1, argv);    
    return scope.Close(long_obj);    
  } else {
    Local<Value> argv[] = {Integer::New((value % BSON_INT32_) | 0), Integer::New((value / BSON_INT32_) | 0)};
    Local<Object> long_obj = constructor_template->GetFunction()->NewInstance(2, argv);    
    return scope.Close(long_obj);    
  }
}
