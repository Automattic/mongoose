// Based on Mixin.js from MooTools (MIT)
// Copyright (c) 2006-2009 Valerio Proietti, <http://mad4milk.net/>

var clone = this.clone = function(item){
	var copy;
	if (item instanceof Array){
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
	if (current instanceof Array){
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