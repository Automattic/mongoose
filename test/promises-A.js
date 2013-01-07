
/**
 * Module dependencies.
 */

var assert = require('assert')
var Promise = require('../lib/promise');
var aplus = require('promises-aplus-tests');

// tests

var adapter = {};
adapter.fulfilled = function (value) {
  var p = new Promise;
  p.complete(value);
  return p;
};
adapter.rejected = function (reason) {
  var p = new Promise;
  // do not use p.error() b/c it enforces instanceof Error
  p.emit('err', reason);
  return p;
}
adapter.pending = function () {
  var p = new Promise;
  return {
      promise: p
    , fulfill: p.complete.bind(p)
    , reject: p.emit.bind(p, 'err')
  }
}

aplus(adapter, function (err) {
  assert.ifError(err);
});

