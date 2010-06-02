// Based on Mixin.js from MooTools (MIT)
// Copyright (c) 2006-2009 Valerio Proietti, <http://mad4milk.net/>

var clone = this.clone = function(item){
	var copy;
	if (Object.prototype.toString.call(item) === '[object Array]'){
		copy = [];
		for (var i = 0; i < item.length; i++) copy[i] = clone(item[i]);
		return copy;
	} else if (typeof item == 'object') {
		copy = {};
		for (var key in item) copy[key] = clone(item[key]);
		return copy;
	} else {
		return item;
	}
}, 

mergeOne = function(source, key, current){
	if (Object.prototype.toString.call(current) === '[object Array]'){
		source[key] = clone(current);
	} else if (typeof current == 'object'){
		if (typeof source[key] == 'object') merge(source[key], current);
		else source[key] = clone(current);
	} else {
		source[key] = current;
	}
	return source;
};

var merge = this.merge = function(source, k, v){
	if (typeof k == 'string') return mergeOne(source, k, v);
	for (var i = 1, l = arguments.length; i < l; i++){
		var object = arguments[i];
		for (var key in object) mergeOne(source, key, object[key]);
	}
	return source;
};

var parent = this.parent = function(){
  if(!this.__meta__.$caller) return;
  var name = this.__meta__.$caller.$name, parent = this.__meta__.$caller.$parent;
  var previous = (parent) ? parent : null;
  if(!previous) return;
  return previous.apply(this,arguments);
};

var type = this.type =  function(obj){ return Object.prototype.toString.call(obj) == "[object Object]"; },


parent = function(){
  if(!this.__meta__.$caller) return;
  var name = this.__meta__.$caller.$name, parent = this.__meta__.$caller.$parent;
  var previous = (parent) ? parent : null;
  if(!previous) return;
  return previous.apply(this,arguments);
},

addNonEnumerableProperty = this.addNonEnumerableProperty =  function(o,k,v){
  Object.defineProperty(o, k, { value : v, writable : true, enumerable : false, configurable : true });
},

addGetter = this.addGetter = function(o,k,v,enum){
  Object.defineProperty(o,k, { get : v, enumerable : !!enum, configurable : true });
},

addSetter = this.addSetter =  function(o,k,v,enum){
  Object.defineProperty(o,k, { set : v, enumerable : !!enum, configurable : true });
}

addMethods = function(obj,methods,enum,scope){
  var enum = enum || false, scope = scope || null;

  for(prop in methods){
    if(obj[prop] instanceof Function){
      var parent = obj[prop];
      var func = methods[prop];

      var wrapper = function(){
        this.__meta__.$caller = wrapper;
        var result = func.apply(this,arguments);
        this.__meta__.$caller = null;
        return result;
      }
      if(scope) wrapper = wrapper.bind(scope); // FIXME remove BIND!!!!!!
      wrapper.$name = prop;
      wrapper.$parent = parent;

      if(!enum) addNonEnumerableProperty(obj,prop,wrapper);
      else obj[prop] = wrapper;

    } else if(isObject(methods[prop])){
      if(!obj[prop]){
        if(!enum) addNonEnumerableProperty(obj,prop,{});
        else obj[prop] = {};
      }
      addMethods(obj[prop],methods[prop],scope);
    }
    else{
      if(!enum) addNonEnumerableProperty(obj,prop,methods[prop]);
      else obj[prop] = methods[prop];
    }
  }
}

addMethod = this.addMethod = function(obj,prop,func,enum,scope){
  if(typeof obj[prop] == 'function'){
    var parent = obj[prop];
    var wrapper = function(){
      this.__meta__.$caller == wrapper;
      var result = func.apply(this,arguments);
      this.__meta__.$caller = null;
      return result;
    }
    
    if(scope) wrapper = (function(){
      var w = wrapper;
      return function(){ w.apply(scope,arguments); }
    })();
    
    wrapper.$name = prop;
    wrapper.$parent = parent;
    
  }
}



