'use strict';

const get = require('../lib/helpers/get');

let obj;

// Single string
obj = {};

let start = Date.now();
for (let i = 0; i < 10000000; ++i) {
  get(obj, 'test', null);
}
console.log('Single string', Date.now() - start);

// Array of length 1
obj = {};
start = Date.now();
let arr = ['test'];
for (let i = 0; i < 10000000; ++i) {
  get(obj, arr, null);
}
console.log('Array of length 1', Date.now() - start);

// String with dots
obj = { a: { b: 1 } };
start = Date.now();
for (let i = 0; i < 10000000; ++i) {
  get(obj, 'a.b', null);
}
console.log('String with dots', Date.now() - start);

// Multi element array
obj = { a: { b: 1 } };
start = Date.now();
arr = ['a', 'b'];
for (let i = 0; i < 10000000; ++i) {
  get(obj, arr, null);
}
console.log('Multi element array', Date.now() - start);