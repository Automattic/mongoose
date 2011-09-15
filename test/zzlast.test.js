
var should = require('should');
var gleak = require('gleak')();
gleak.whitelist.push('currentObjectStored', 'reg_exp'); // node-mongodb-native

module.exports.globals = function (beforeExit) {
  beforeExit(function () {
    var leaks = gleak.detect();
    should.strictEqual(leaks.length, 0, 'detected global var leaks: ' + leaks.join(', '));
  })
}
