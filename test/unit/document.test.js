/**
 * Module dependencies.
 */

var start = require('../common');
var assert = require('assert');
var mongoose = start.mongoose;

describe('document unit tests', function() {
  it('should handle shard keys properly (gh-2127)', function(done) {
    var mockSchema = {
      options: {
        shardKey: { date: 1 } 
      }
    };
    var Stub = function() {
      this.schema = mockSchema;
      this.$__ = {};
    };
    Stub.prototype.__proto__ = mongoose.Document.prototype;
    var d = new Stub();
    var currentTime = new Date();
    d._doc = { date: currentTime };

    d.$__storeShard();
    assert.equal(currentTime, d.$__.shardval.date);
    process.nextTick(function() {
      done();
    });
  });
});
