/*
  Ordered Hash Definition
*/
var OrderedHash = exports.OrderedHash = function(arguments) {
  this.ordered_keys = [];
  this.values = {};
  var index = 0;

  for(var argument in arguments) {
    var value = arguments[argument];
    this.values[argument] = value;
    this.ordered_keys[index++] = argument;
  }
};

// Functions to add values
OrderedHash.prototype.add = function(key, value) {
  if(this.values[key] == null) {
    this.ordered_keys[this.ordered_keys.length] = key;
  }

  this.values[key] = value;
  return this;
};

OrderedHash.prototype.remove = function(key) {
  var new_ordered_keys = [];
  // Remove all non_needed keys
  for(var i = 0; i < this.ordered_keys.length; i++) {
    if(!(this.ordered_keys[i] == key)) {
      new_ordered_keys[new_ordered_keys.length] = this.ordered_keys[i];
    }
  }
  // Assign the new arrays
  this.ordered_keys = new_ordered_keys;
  // Remove this reference to this
  delete this.values[key];
  return this;
};

OrderedHash.prototype.unorderedHash = function() {
  var hash = {};
  for(var i = 0; i < this.ordered_keys.length; i++) {
    hash[this.ordered_keys[i]] = this.values[this.ordered_keys[i]];
  }
  return hash;
};

// Fetch the keys for the hash
OrderedHash.prototype.keys = function() {
  return this.ordered_keys;
};

OrderedHash.prototype.get = function(key) {
  return this.values[key];
};

OrderedHash.prototype.length = function(){
 return this.keys().length;
};

OrderedHash.prototype.toArray = function() {
  var result = {},
    keys = this.keys();
  
  for (var key in keys)
    result[key] = this.values[key];
  
  return result;
};