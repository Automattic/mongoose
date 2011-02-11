
/**
 * Module dependencies.
 */

var Query = require('mongoose/query.new').Query;

/**
 * Test.
 */

module.exports = {
  'test query.fields({a: 1, b: 1, c: 1})': function () {
    var query = new Query();
    query.fields({a: 1, b: 1, c: 1});
    query._fields.should.eql({a: 1, b: 1, c: 1});
  },
  'test query.fields({only: "a b c"})': function () {
    var query = new Query();
    query.fields({only: "a b c"});
    query._fields.should.eql({a: 1, b: 1, c: 1});
  },
  'test query.fields({only: ["a", "b", "c"]})': function () {
    var query = new Query();
    query.fields({only: ['a', 'b', 'c']});
    query._fields.should.eql({a: 1, b: 1, c: 1});
  },
  'test query.fields("a b c")': function () {
    var query = new Query();
    query.fields("a b c");
    query._fields.should.eql({a: 1, b: 1, c: 1});
  },
  'test query.fields("a", "b", "c")': function () {
    var query = new Query();
    query.fields('a', 'b', 'c');
    query._fields.should.eql({a: 1, b: 1, c: 1});
  },
  "test query.fields(['a', 'b', 'c'])": function () {
    var query = new Query();
    query.fields(['a', 'b', 'c']);
    query._fields.should.eql({a: 1, b: 1, c: 1});
  },
  "Query#fields should not over-ride fields set in prior calls to Query#fields": function () {
    var query = new Query();
    query.fields('a');
    query._fields.should.eql({a: 1});
    query.fields('b');
    query._fields.should.eql({a: 1, b: 1});
  },
//  "Query#fields should be able to over-ride fields set in prior calls to Query#fields if you specify override": function () {
//    var query = new Query();
//    query.fields('a');
//    query._fields.should.eql({a: 1});
//    query.override.fields('b');
//    query._fields.should.eql({b: 1});
//  }

  "test query.only('a b c')": function () {
    var query = new Query();
    query.only("a b c");
    query._fields.should.eql({a: 1, b: 1, c: 1});
  },
  "test query.only('a', 'b', 'c')": function () {
    var query = new Query();
    query.only('a', 'b', 'c');
    query._fields.should.eql({a: 1, b: 1, c: 1});
  },
  "test query.only('a', 'b', 'c')": function () {
    var query = new Query();
    query.only(['a', 'b', 'c']);
    query._fields.should.eql({a: 1, b: 1, c: 1});
  },
  "Query#only should not over-ride fields set in prior calls to Query#only": function () {
    var query = new Query();
    query.only('a');
    query._fields.should.eql({a: 1});
    query.only('b');
    query._fields.should.eql({a: 1, b: 1});
  },

  "test query.exclude('a b c')": function () {
    var query = new Query();
    query.exclude("a b c");
    query._fields.should.eql({a: 0, b: 0, c: 0});
  },
  "test query.exclude('a', 'b', 'c')": function () {
    var query = new Query();
    query.exclude('a', 'b', 'c');
    query._fields.should.eql({a: 0, b: 0, c: 0});
  },
  "test query.exclude('a', 'b', 'c')": function () {
    var query = new Query();
    query.exclude(['a', 'b', 'c']);
    query._fields.should.eql({a: 0, b: 0, c: 0});
  },
  "Query#exclude should not over-ride fields set in prior calls to Query#exclude": function () {
    var query = new Query();
    query.exclude('a');
    query._fields.should.eql({a: 0});
    query.exclude('b');
    query._fields.should.eql({a: 0, b: 0});
  },


};
