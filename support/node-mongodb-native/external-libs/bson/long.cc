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
#include "long.h"

// BSON MAX VALUES
const int32_t BSON_INT32_MAX = (int32_t)2147483648L;
const int32_t BSON_INT32_MIN = (int32_t)(-1) * 2147483648L;
const int64_t BSON_INT32_ = pow(2, 32);

const double LN2 = 0.6931471805599453;

// Max Values
const int64_t BSON_INT64_MAX = (int64_t)9223372036854775807LL;
const int64_t BSON_INT64_MIN = (int64_t)(-1)*(9223372036854775807LL);

// Constant objects used in calculations
Long* LONG_MIN_VALUE = Long::fromBits(0, 0x80000000 | 0);
Long* LONG_MAX_VALUE = Long::fromBits(0xFFFFFFFF | 0, 0x7FFFFFFF | 0);
Long* LONG_ZERO = Long::fromInt(0);
Long* LONG_ONE = Long::fromInt(1);
Long* LONG_NEG_ONE = Long::fromInt(-1);

#define max(a,b) ({ typeof (a) _a = (a); typeof (b) _b = (b); _a > _b ? _a : _b; })

static Handle<Value> VException(const char *msg) {
    HandleScope scope;
    return ThrowException(Exception::Error(String::New(msg)));
  };

Persistent<FunctionTemplate> Long::constructor_template;

static Persistent<String> low_bits_symbol;
static Persistent<String> high_bits_symbol;

Long::Long(int32_t low_bits, int32_t high_bits) : ObjectWrap() {
  this->low_bits = low_bits;
  this->high_bits = high_bits;
}

Long::~Long() {}

Handle<Value> Long::New(const Arguments &args) {
  HandleScope scope;

  // Ensure that we have an parameter
  if(args.Length() == 1 && args[0]->IsNumber()) {
    // Unpack the value
    double value = args[0]->NumberValue();
    // Create an instance of long
    Long *l = Long::fromNumber(value);
    // Wrap it in the object wrap
    l->Wrap(args.This());
    // Return the context
    return args.This();
  } else if(args.Length() == 2 && args[0]->IsNumber() && args[1]->IsNumber()) {
    // Unpack the value
    int32_t low_bits = args[0]->Int32Value();
    int32_t high_bits = args[1]->Int32Value();
    // Create an instance of long
    Long *l = new Long(low_bits, high_bits);
    // Wrap it in the object wrap
    l->Wrap(args.This());
    // Return the context
    return args.This();    
  } else if(args.Length() == 2 && args[0]->IsString() && args[1]->IsString()) {
    // Parse the strings into int32_t values
    int32_t low_bits = 0;
    int32_t high_bits = 0;
    char *low_bits_str = (char *)malloc(4 * sizeof(char));
    char *high_bits_str = (char *)malloc(4 * sizeof(char));
    
    // Let's write the strings to the bits
    DecodeWrite(low_bits_str, 4, args[0]->ToString(), BINARY);
    DecodeWrite(high_bits_str, 4, args[1]->ToString(), BINARY);
    // Copy the string to the int
    memcpy(&low_bits, low_bits_str, 4);
    memcpy(&high_bits, high_bits_str, 4);
    // Free memory
    free(low_bits_str);
    free(high_bits_str);
    // Create an instance of long
    Long *l = new Long(low_bits, high_bits);
    // Wrap it in the object wrap
    l->Wrap(args.This());
    // Return the context
    return args.This();        
  } else {
    return VException("Argument passed in must be either a 64 bit number or two 32 bit numbers.");
  }
}

void Long::Initialize(Handle<Object> target) {
  // Grab the scope of the call from Node
  HandleScope scope;
  // Define a new function template
  Local<FunctionTemplate> t = FunctionTemplate::New(New);
  constructor_template = Persistent<FunctionTemplate>::New(t);
  constructor_template->InstanceTemplate()->SetInternalFieldCount(1);
  constructor_template->SetClassName(String::NewSymbol("Long"));
  
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
  target->Set(String::NewSymbol("Long"), constructor_template->GetFunction());
}

Handle<Value> Long::ToInt(const Arguments &args) {
  HandleScope scope;
  
  // Let's unpack the Long instance that contains the number in low_bits and high_bits form
  Long *l = ObjectWrap::Unwrap<Long>(args.This());
  // Get lower bits
  uint32_t low_bits = l->low_bits;
  // Return the value
  return Int32::New(low_bits);
}

Handle<Value> Long::ToNumber(const Arguments &args) {
  HandleScope scope;  
  // Let's unpack the Long instance that contains the number in low_bits and high_bits form
  Long *l = ObjectWrap::Unwrap<Long>(args.This());
  return Number::New(l->toNumber());
}


Handle<Value> Long::LowGetter(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;
  
  // Unpack the long object
  Long *l = ObjectWrap::Unwrap<Long>(info.Holder());
  // Return the low bits
  return Integer::New(l->low_bits);
}

void Long::LowSetter(Local<String> property, Local<Value> value, const AccessorInfo& info) {
  if(value->IsNumber()) {
    // Unpack the long object
    Long *l = ObjectWrap::Unwrap<Long>(info.Holder());
    // Set the low bits
    l->low_bits = value->Int32Value();    
  }
}

Handle<Value> Long::HighGetter(Local<String> property, const AccessorInfo& info) {
  HandleScope scope;

  // Unpack the long object
  Long *l = ObjectWrap::Unwrap<Long>(info.Holder());
  // Return the low bits
  return Integer::New(l->high_bits);
}

void Long::HighSetter(Local<String> property, Local<Value> value, const AccessorInfo& info) {
  if(value->IsNumber()) {
    // Unpack the long object
    Long *l = ObjectWrap::Unwrap<Long>(info.Holder());
    // Set the low bits
    l->high_bits = value->Int32Value();  
  }
}

Handle<Value> Long::Inspect(const Arguments &args) {
  HandleScope scope;
  
  // Let's unpack the Long instance that contains the number in low_bits and high_bits form
  Long *l = ObjectWrap::Unwrap<Long>(args.This());
  // Let's create the string from the Long number
  char *result = l->toString(10);
  // Package the result in a V8 String object and return
  Local<Value> str = String::New(result);
  free(result);
  return str;
}

Handle<Value> Long::GetLowBits(const Arguments &args) {
  HandleScope scope;

  // Let's unpack the Long instance that contains the number in low_bits and high_bits form
  Long *l = ObjectWrap::Unwrap<Long>(args.This());
  // Let's fetch the low bits
  int32_t low_bits = l->low_bits;
  // Package the result in a V8 Integer object and return
  return Integer::New(low_bits);  
}

Handle<Value> Long::GetHighBits(const Arguments &args) {
  HandleScope scope;

  // Let's unpack the Long instance that contains the number in low_bits and high_bits form
  Long *l = ObjectWrap::Unwrap<Long>(args.This());
  // Let's fetch the low bits
  int32_t high_bits = l->high_bits;
  // Package the result in a V8 Integer object and return
  return Integer::New(high_bits);    
}

bool Long::isZero() {
  int32_t low_bits = this->low_bits;
  int32_t high_bits = this->high_bits;
  return low_bits == 0 && high_bits == 0;
}

bool Long::isNegative() {
  int32_t low_bits = this->low_bits;
  int32_t high_bits = this->high_bits;
  return high_bits < 0;
}

bool Long::equals(Long *l) {
  int32_t low_bits = this->low_bits;
  int32_t high_bits = this->high_bits;  
  return (high_bits == l->high_bits) && (low_bits == l->low_bits);
}

Handle<Value> Long::IsZero(const Arguments &args) {
  HandleScope scope;      
    
  // Let's unpack the Long instance that contains the number in low_bits and high_bits form
  Long *l = ObjectWrap::Unwrap<Long>(args.This());
  return Boolean::New(l->isZero());
}

int32_t Long::toInt() {
  return this->low_bits;
}

char *Long::toString(int32_t opt_radix) {
  // Set the radix
  int32_t radix = opt_radix;
  // Check if we have a zero value
  if(this->isZero()) {
    // Allocate a string to return
    char *result = (char *)malloc(1 * sizeof(char) + 1);
    // Set the string to the character 0
    *(result) = '0';
    // Terminate the C String
    *(result + 1) = '\0';
    return result;
  }
  
  // If the long is negative we need to perform som arithmetics
  if(this->isNegative()) {
    // Min value object
    Long *minLong = new Long(0, 0x80000000 | 0);
    
    if(this->equals(minLong)) {
      // We need to change the exports.Long value before it can be negated, so we remove
      // the bottom-most digit in this base and then recurse to do the rest.
      Long *radix_long = Long::fromNumber(radix);
      Long *div = this->div(radix_long);
      Long *mul = div->multiply(radix_long);
      Long *rem = mul->subtract(this);
      // Fetch div result      
      char *div_result = div->toString(radix);
      // Unpack the rem result and convert int to string
      char *int_buf = (char *)malloc(50 * sizeof(char) + 1);
      *(int_buf) = '\0';
      uint32_t rem_int = rem->toInt();
      sprintf(int_buf, "%d", rem_int);
      // Final bufferr
      char *final_buffer = (char *)malloc(50 * sizeof(char) + 1);
      *(final_buffer) = '\0';
      strncat(final_buffer, div_result, strlen(div_result));
      strncat(final_buffer + strlen(div_result), int_buf, strlen(div_result));
      // Release some memory
      free(div_result);
      free(int_buf);
      // Delete object
      delete rem;
      delete mul;
      return final_buffer;
    } else {
      char *buf = (char *)malloc(50 * sizeof(char) + 1);
      *(buf) = '\0';
      Long *negate = this->negate();
      char *result = negate->toString(radix);      
      strncat(buf, "-", 1);
      strncat(buf + 1, result, strlen(result));
      // Release memory
      free(result);
      delete negate;
      return buf;
    }  
  }
  
  // Do several (6) digits each time through the loop, so as to
  // minimize the calls to the very expensive emulated div.
  Long *radix_to_power = Long::fromInt(pow(radix, 6));
  Long *rem = this;
  char *result = (char *)malloc(1024 * sizeof(char) + 1);
  // Ensure the allocated space is null terminated to ensure a proper CString
  *(result) = '\0';
  
  while(true) {
    Long *rem_div = rem->div(radix_to_power);
    Long *mul = rem_div->multiply(radix_to_power);
    int32_t interval = rem->subtract(mul)->toInt();
    // Convert interval into string
    char digits[50];    
    sprintf(digits, "%d", interval);
    // Remove existing object if it's not this
    if(this != rem) delete rem;    
    
    rem = rem_div;
    if(rem->isZero()) {
      // Join digits and result to create final result
      int total_length = strlen(digits) + strlen(result);      
      char *new_result = (char *)malloc(total_length * sizeof(char) + 1);
      *(new_result) = '\0';
      strncat(new_result, digits, strlen(digits));
      strncat(new_result + strlen(digits), result, strlen(result));
      // Free the existing structure
      free(result);
      delete rem_div;
      delete mul;
      delete radix_to_power;
      return new_result;
    } else {
      // Allocate some new space for the number
      char *new_result = (char *)malloc(1024 * sizeof(char) + 1);
      *(new_result) = '\0';
      int digits_length = (int)strlen(digits);
      int index = 0;
      // Pad with zeros
      while(digits_length < 6) {
        strncat(new_result + index, "0", 1);
        digits_length = digits_length + 1;
        index = index + 1;
      }
  
      strncat(new_result + index, digits, strlen(digits));
      strncat(new_result + strlen(digits) + index, result, strlen(result));
      
      free(result);
      result = new_result;
    }
    // Free memory
    delete mul;
  }  
}

Handle<Value> Long::ToString(const Arguments &args) {
  HandleScope scope;

  // Let's unpack the Long instance that contains the number in low_bits and high_bits form
  Long *l = ObjectWrap::Unwrap<Long>(args.This());
  // Let's create the string from the Long number
  char *result = l->toString(10);
  // Package the result in a V8 String object and return
  Handle<Value> result_str = String::New(result);
  // Free memory
  free(result);
  // Return string
  return result_str;
}

Handle<Value> Long::ToJSON(const Arguments &args) {
  HandleScope scope;

  // Let's unpack the Long instance that contains the number in low_bits and high_bits form
  Long *l = ObjectWrap::Unwrap<Long>(args.This());
  // Let's create the string from the Long number
  char *result = l->toString(10);
  // Package the result in a V8 String object and return
  Handle<Value> result_str = String::New(result);
  // Free memory
  free(result);
  // Return string
  return result_str;
}

Long *Long::shiftRight(int32_t number_bits) {
  number_bits &= 63;
  if(number_bits == 0) {
    return this;
  } else {
    int32_t high_bits = this->high_bits;
    if(number_bits < 32) {
      int32_t low_bits = this->low_bits;
      return Long::fromBits((low_bits >> number_bits) | (high_bits << (32 - number_bits)), high_bits >> number_bits);
    } else {
      return Long::fromBits(high_bits >> (number_bits - 32), high_bits >= 0 ? 0 : -1);
    }
  }
}

Long *Long::shiftLeft(int32_t number_bits) {
  number_bits &= 63;
  if(number_bits == 0) {
    return this;
  } else {
    int32_t low_bits = this->low_bits;
    if(number_bits < 32) {
      int32_t high_bits = this->high_bits;
      return Long::fromBits(low_bits << number_bits, (high_bits << number_bits) | (low_bits >> (32 - number_bits)));
    } else {
      return Long::fromBits(0, low_bits << (number_bits - 32));
    }
  }  
}

Long *Long::div(Long *other) {
  // If we are about to do a divide by zero throw an exception
  if(other->isZero()) {
    throw "division by zero";
  } else if(this->isZero()) {
    return new Long(0, 0);
  }
    
  if(this->equals(LONG_MIN_VALUE)) {    
    if(other->equals(LONG_ONE) || other->equals(LONG_NEG_ONE)) {
      return Long::fromBits(0, 0x80000000 | 0);
    } else if(other->equals(LONG_MIN_VALUE)) {
      return Long::fromNumber(1);
    } else {
      Long *half_this = this->shiftRight(1);
      Long *div_obj = half_this->div(other);
      Long *approx = div_obj->shiftLeft(1);
      // Free memory
      delete div_obj;
      delete half_this;
      // Check if we are done
      if(approx->equals(LONG_ZERO)) {
        return other->isNegative() ? Long::fromNumber(0) : Long::fromNumber(-1);
      } else {
        Long *mul = other->multiply(approx);
        Long *rem = this->subtract(mul);
        Long *rem_div = rem->div(other);
        Long *result = approx->add(rem_div);
        // Free memory
        delete mul;
        delete rem;
        delete rem_div;
        // Return result
        return result;
      }
    }    
  } else if(other->equals(LONG_MIN_VALUE)) {
    return new Long(0, 0);
  }
  
  // If the value is negative
  if(this->isNegative()) {    
    if(other->isNegative()) {
      Long *neg = this->negate();
      Long *other_neg = other->negate();
      Long *result = neg->div(other_neg);
      // Free memory
      delete neg;
      delete other_neg;
      // Return result 
      return result;
    } else {
      Long *neg = this->negate();
      Long *neg_result = neg->div(other);
      Long *result = neg_result->negate();
      // Free memory
      delete neg;
      delete neg_result;
      // Return result
      return result;
    }
  } else if(other->isNegative()) {
    Long *other_neg = other->negate();
    Long *div_result = this->div(other_neg);
    Long *result = div_result->negate();
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
  return Long::fromBits(low32, high32);
}

Long *Long::multiply(Long *other) {
  if(this->isZero() || other->isZero()) {
    return new Long(0, 0);    
  }
  
  int64_t this_number = this->toNumber();
  int64_t other_number = other->toNumber();
  int64_t result = this_number * other_number;
  
  // Split into the 32 bit valu
  int32_t low32, high32;
  high32 = (uint64_t)result >> 32;
  low32 = (int32_t)result;
  return Long::fromBits(low32, high32);
}

bool Long::isOdd() {
  return (this->low_bits & 1) == 1;
}

// /** @return {number} The closest floating-point representation to this value. */
// exports.Long.prototype.toNumber = function() {
//   return this.high_ * exports.Long.TWO_PWR_32_DBL_ +
//          this.getLowBitsUnsigned();
// };

int64_t Long::toNumber() {
  return (int64_t)(this->high_bits * BSON_INT32_ + this->getLowBitsUnsigned());
}

int64_t Long::getLowBitsUnsigned() {
  return (this->low_bits >= 0) ? this->low_bits : BSON_INT32_ + this->low_bits;
}

int64_t Long::compare(Long *other) {
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
  
  Long *return_value = this->subtract(other);  
  // At this point, the signs are the same, so subtraction will not overflow
  if(return_value->isNegative()) {
    delete return_value;
    return -1;
  } else {
    delete return_value;
    return 1;
  }
}

Long *Long::negate() {
  if(this->equals(LONG_MIN_VALUE)) {
    return LONG_MIN_VALUE;
  } else {
    Long *not_obj = this->not_();
    Long *add = not_obj->add(LONG_ONE);
    delete not_obj;
    return add;
  }
}

Long *Long::not_() {
  return new Long(~this->low_bits, ~this->high_bits);
}

Long *Long::add(Long *other) {
  int64_t this_number = this->toNumber();
  int64_t other_number = other->toNumber();
  int64_t result = this_number + other_number;  
  // Split into the 32 bit valu
  int32_t low32, high32;
  high32 = (uint64_t)result >> 32;
  low32 = (int32_t)result;
  return Long::fromBits(low32, high32);
}

Long *Long::subtract(Long *other) {
  int64_t this_number = this->toNumber();
  int64_t other_number = other->toNumber();
  int64_t result = this_number - other_number;
  // Split into the 32 bit valu
  int32_t low32, high32;
  high32 = (uint64_t)result >> 32;
  low32 = (int32_t)result;
  return Long::fromBits(low32, high32);
}

Handle<Value> Long::GreatherThan(const Arguments &args) {
  HandleScope scope;
  
  if(args.Length() != 1 && !Long::HasInstance(args[0])) return VException("One argument of type Long required");
  
  // Let's unpack the Long instance that contains the number in low_bits and high_bits form
  Long *current_long_obj = ObjectWrap::Unwrap<Long>(args.This());  
  // Unpack Long
  Local<Object> obj = args[0]->ToObject();
  Long *long_obj = Long::Unwrap<Long>(obj);
  // Compare the longs
  bool comparision_result = current_long_obj->greaterThan(long_obj);
  return scope.Close(Boolean::New(comparision_result));
}

Handle<Value> Long::Equals(const Arguments &args) {
  HandleScope scope;
  
  if(args.Length() != 1 && !Long::HasInstance(args[0])) return VException("One argument of type Long required");
  
  // Let's unpack the Long instance that contains the number in low_bits and high_bits form
  Long *current_long_obj = ObjectWrap::Unwrap<Long>(args.This());  
  // Unpack Long
  Local<Object> obj = args[0]->ToObject();
  Long *long_obj = Long::Unwrap<Long>(obj);
  // Compare the longs
  bool comparision_result = (current_long_obj->compare(long_obj) == 0);
  return scope.Close(Boolean::New(comparision_result));
}

bool Long::greaterThan(Long *other) {
  return this->compare(other) > 0;  
}

bool Long::greaterThanOrEqual(Long *other) {
  return this->compare(other) >= 0;
}

Handle<Value> Long::FromInt(const Arguments &args) {
  HandleScope scope;
  
  // Validate the arguments
  if(args.Length() != 1 && !args[0]->IsNumber()) return VException("One argument of type number required");
  // Unwrap Number variable
  Local<Number> number = args[0]->ToNumber();
  // Instantiate Long object and return
  Local<Value> argv[] = {number};
  Local<Object> long_obj = constructor_template->GetFunction()->NewInstance(1, argv);
  return scope.Close(long_obj);  
}

Long *Long::fromInt(int64_t value) {
  return new Long((value | 0), (value < 0 ? -1 : 0));
}

Long *Long::fromBits(int32_t low_bits, int32_t high_bits) {
  return new Long(low_bits, high_bits);
}

Long *Long::fromNumber(double value) {
  // Ensure we have a valid ranged number
  if(std::isinf(value) || std::isnan(value)) {
    return Long::fromBits(0, 0);
  } else if(value <= BSON_INT64_MIN) {
    return Long::fromBits(0, 0x80000000 | 0);
  } else if(value >= BSON_INT64_MAX) {
    return Long::fromBits(0xFFFFFFFF | 0, 0x7FFFFFFF | 0);
  } else if(value < 0) {
    return Long::fromNumber(-value)->negate();
  } else {
    int64_t int_value = (int64_t)value;
    return Long::fromBits((int_value % BSON_INT32_) | 0, (int_value / BSON_INT32_) | 0);
  }  
}

Handle<Value> Long::FromNumber(const Arguments &args) {
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
