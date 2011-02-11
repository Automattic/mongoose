
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

  'test setting a condition via with': function () {
    var query = new Query();
    query.with('name', 'guillermo');
    query._conditions.should.eql({name: 'guillermo'});
  },

  'test Query#gte with 2 arguments': function () {
    var query = new Query();
    query.gte('age', 18);
    query._conditions.should.eql({age: {$gte: 18}});
  },

  'test Query#gt with 2 arguments': function () {
    var query = new Query();
    query.gt('age', 17);
    query._conditions.should.eql({age: {$gt: 17}});
  },

  'test Query#lte with 2 arguments': function () {
    var query = new Query();
    query.lte('age', 65);
    query._conditions.should.eql({age: {$lte: 65}});
  },

  'test Query#lt with 2 arguments': function () {
    var query = new Query();
    query.lt('age', 66);
    query._conditions.should.eql({age: {$lt: 66}});
  },

  'test Query#gte with 1 argument': function () {
    var query = new Query();
    query.with("age").gte(18);
    query._conditions.should.eql({age: {$gte: 18}});
  },

  'test Query#gt with 1 argument': function () {
    var query = new Query();
    query.with("age").gt(17);
    query._conditions.should.eql({age: {$gt: 17}});
  },

  'test Query#lte with 1 argument': function () {
    var query = new Query();
    query.with("age").lte(65);
    query._conditions.should.eql({age: {$lte: 65}});
  },

  'test Query#lt with 1 argument': function () {
    var query = new Query();
    query.with("age").lt(66);
    query._conditions.should.eql({age: {$lt: 66}});
  },

  'test combined Query#lt and Query#gt': function () {
    var query = new Query();
    query.with("age").lt(66).gt(17);
    query._conditions.should.eql({age: {$lt: 66, $gt: 17}});
  },

  'test Query#lt on one path and Query#gt on another path on the same query': function () {
    var query = new Query();
    query
      .with("age").lt(66)
      .with("height").gt(5);
    query._conditions.should.eql({age: {$lt: 66}, height: {$gt: 5}});
  },

  'test Query#ne with 2 arguments': function () {
    var query = new Query();
    query.ne('age', 21);
    query._conditions.should.eql({age: {$ne: 21}});
  },

  'test Query#gte with 1 argument': function () {
    var query = new Query();
    query.with("age").ne(21);
    query._conditions.should.eql({age: {$ne: 21}});
  },

  'test Query#ne alias Query#notEqualTo': function () {
    var query = new Query();
    query.with('age').notEqualTo(21);
    query._conditions.should.eql({age: {$ne: 21}});

    query = new Query();
    query.notEqualTo('age', 21);
    query._conditions.should.eql({age: {$ne: 21}});
  },

  'test Query#in with 2 arguments': function () {
    var query = new Query();
    query.in('age', [21, 25, 30]);
    query._conditions.should.eql({age: {$in: [21, 25, 30]}});
  },

  'test Query#in with 1 argument': function () {
    var query = new Query();
    query.with("age").in([21, 25, 30]);
    query._conditions.should.eql({age: {$in: [21, 25, 30]}});
  },

  'test Query#in with a non-array value not via with': function () {
    var query = new Query();
    query.in('age', 21);
    query._conditions.should.eql({age: {$in: 21}});
  },

  'test Query#in with a non-array value via with': function () {
    var query = new Query();
    query.with('age').in(21);
    query._conditions.should.eql({age: {$in: 21}});
  },

  'test Query#nin with 2 arguments': function () {
    var query = new Query();
    query.nin('age', [21, 25, 30]);
    query._conditions.should.eql({age: {$nin: [21, 25, 30]}});
  },

  'test Query#nin with 1 argument': function () {
    var query = new Query();
    query.with("age").nin([21, 25, 30]);
    query._conditions.should.eql({age: {$nin: [21, 25, 30]}});
  },

  'test Query#nin with a non-array value not via with': function () {
    var query = new Query();
    query.nin('age', 21);
    query._conditions.should.eql({age: {$nin: 21}});
  },

  'test Query#nin with a non-array value via with': function () {
    var query = new Query();
    query.with('age').nin(21);
    query._conditions.should.eql({age: {$nin: 21}});
  },

  'test Query#mod not via with, with [a, b] param': function () {
    var query = new Query();
    query.mod('age', [5, 2]);
    query._conditions.should.eql({age: {$mod: [5, 2]}});
  },

  'test Query#mod not via with, with a and b params': function () {
    var query = new Query();
    query.mod('age', 5, 2);
    query._conditions.should.eql({age: {$mod: [5, 2]}});
  },

  'test Query#mod via with, with [a, b] param': function () {
    var query = new Query();
    query.with("age").mod([5, 2]);
    query._conditions.should.eql({age: {$mod: [5, 2]}});
  },

  'test Query#mod via with, with a and b params': function () {
    var query = new Query();
    query.with("age").mod(5, 2);
    query._conditions.should.eql({age: {$mod: [5, 2]}});
  },

  'test Query#near via with, with [lat, long] param': function () {
    var query = new Query();
    query.with('checkin').near([40, -72]);
    query._conditions.should.eql({checkin: {$near: [40, -72]}});
  },

  'test Query#near via with, with lat and long params': function () {
    var query = new Query();
    query.with('checkin').near(40, -72);
    query._conditions.should.eql({checkin: {$near: [40, -72]}});
  },

  'test Query#near not via with, with [lat, long] param': function () {
    var query = new Query();
    query.near('checkin', [40, -72]);
    query._conditions.should.eql({checkin: {$near: [40, -72]}});
  },

  'test Query#near not via with, with lat and long params': function () {
    var query = new Query();
    query.near('checkin', 40, -72);
    query._conditions.should.eql({checkin: {$near: [40, -72]}});
  },

  'test Query#within.box not via with': function () {
    var query = new Query();
    query.within.box('gps', {ll: [5, 25], ur: [10, 30]});
    query._conditions.should.eql({gps: {$within: {$box: [[5, 25], [10, 30]]}}});
  },

  'test Query#within.box via with': function () {
    var query = new Query();
    query.with('gps').within.box({ll: [5, 25], ur: [10, 30]});
    query._conditions.should.eql({gps: {$within: {$box: [[5, 25], [10, 30]]}}});
  },

  'test Query#within.center not via with': function () {
    var query = new Query();
    query.within.center('gps', {center: [5, 25], radius: 5});
    query._conditions.should.eql({gps: {$within: {$center: [[5, 25], 5]}}});
  },

  'test Query#within.center not via with': function () {
    var query = new Query();
    query.with('gps').within.center({center: [5, 25], radius: 5});
    query._conditions.should.eql({gps: {$within: {$center: [[5, 25], 5]}}});
  },

  'test Query#exists with 0 arguments via with': function () {
    var query = new Query();
    query.with("username").exists();
    query._conditions.should.eql({username: {$exists: true}});
  },

  'test Query#exists with 1 argument via with': function () {
    var query = new Query();
    query.with("username").exists(false);
    query._conditions.should.eql({username: {$exists: false}});
  },

  'test Query#exists with 1 argument not via with': function () {
    var query = new Query();
    query.exists('username');
    query._conditions.should.eql({username: {$exists: true}});
  },

  'test Query#exists with 1 argument not via with': function () {
    var query = new Query();
    query.exists("username", false);
    query._conditions.should.eql({username: {$exists: false}});
  },

  // TODO $not
  
  'test Query#all via with': function () {
    var query = new Query();
    query.with('pets').all(['dog', 'cat', 'ferret']);
    query._conditions.should.eql({pets: {$all: ['dog', 'cat', 'ferret']}});
  },

  'test Query#all not via with': function () {
    var query = new Query();
    query.all('pets', ['dog', 'cat', 'ferret']);
    query._conditions.should.eql({pets: {$all: ['dog', 'cat', 'ferret']}});
  },

  'test strict array equivalence condition via Query#find': function () {
    var query = new Query();
    query.find({'pets': ['dog', 'cat', 'ferret']});
    query._conditions.should.eql({pets: ['dog', 'cat', 'ferret']});
  },

  // TODO Check key.index queries

  'test Query#size via with': function () {
    var query = new Query();
    query.with('collection').size(5);
    query._conditions.should.eql({collection: {$size: 5}});
  },

  'test Query#size not via with': function () {
    var query = new Query();
    query.size('collection', 5);
    query._conditions.should.eql({collection: {$size: 5}});
  },

  'test Query#slice via with, with just positive limit param': function () {
    var query = new Query();
    query.with('collection').slice(5);
    query._fields.should.eql({collection: {$slice: 5}});
  },

  'test Query#slice via with, with just negative limit param': function () {
    var query = new Query();
    query.with('collection').slice(-5);
    query._fields.should.eql({collection: {$slice: -5}});
  },

  'test Query#slice via with, with [skip, limit] param': function () {
    var query = new Query();
    query.with('collection').slice([14, 10]); // Return the 15th through 25th
    query._fields.should.eql({collection: {$slice: [14, 10]}});
  },

  'test Query#slice via with, with skip and limit params': function () {
    var query = new Query();
    query.with('collection').slice(14, 10); // Return the 15th through 25th
    query._fields.should.eql({collection: {$slice: [14, 10]}});
  },

  'test Query#slice via with, with just positive limit param': function () {
    var query = new Query();
    query.with('collection').slice(5);
    query._fields.should.eql({collection: {$slice: 5}});
  },

  'test Query#slice via with, with just negative limit param': function () {
    var query = new Query();
    query.with('collection').slice(-5);
    query._fields.should.eql({collection: {$slice: -5}});
  },

  'test Query#slice via with, with the [skip, limit] param': function () {
    var query = new Query();
    query.with('collection').slice([14, 10]); // Return the 15th through 25th
    query._fields.should.eql({collection: {$slice: [14, 10]}});
  },

  'test Query#slice via with, with the skip and limit params': function () {
    var query = new Query();
    query.with('collection').slice(14, 10); // Return the 15th through 25th
    query._fields.should.eql({collection: {$slice: [14, 10]}});
  },


  'test Query#slice not via with, with just positive limit param': function () {
    var query = new Query();
    query.slice('collection', 5);
    query._fields.should.eql({collection: {$slice: 5}});
  },

  'test Query#slice not via with, with just negative limit param': function () {
    var query = new Query();
    query.slice('collection', -5);
    query._fields.should.eql({collection: {$slice: -5}});
  },

  'test Query#slice not via with, with [skip, limit] param': function () {
    var query = new Query();
    query.slice('collection', [14, 10]); // Return the 15th through 25th
    query._fields.should.eql({collection: {$slice: [14, 10]}});
  },

  'test Query#slice not via with, with skip and limit params': function () {
    var query = new Query();
    query.slice('collection', 14, 10); // Return the 15th through 25th
    query._fields.should.eql({collection: {$slice: [14, 10]}});
  },

  'test Query#elemMatch not via with': function () {
    var query = new Query();
    query.elemMatch('comments', {author: 'bnoguchi', votes: {$gte: 5}});
    query._conditions.should.eql({comments: {$elemMatch: {author: 'bnoguchi', votes: {$gte: 5}}}});
  },

  'test Query#elemMatch not via with, with block notation': function () {
    var query = new Query();
    query.elemMatch('comments', function (elem) {
      elem.with('author', 'bnoguchi')
      elem.with('votes').gte(5);
    });
    query._conditions.should.eql({comments: {$elemMatch: {author: 'bnoguchi', votes: {$gte: 5}}}});
  },

  'test Query#elemMatch via with': function () {
    var query = new Query();
    query.with('comments').elemMatch({author: 'bnoguchi', votes: {$gte: 5}});
    query._conditions.should.eql({comments: {$elemMatch: {author: 'bnoguchi', votes: {$gte: 5}}}});
  },

  'test Query#elemMatch via with, with block notation': function () {
    var query = new Query();
    query.with('comments').elemMatch(function (elem) {
      elem.with('author', 'bnoguchi')
      elem.with('votes').gte(5);
    });
    query._conditions.should.eql({comments: {$elemMatch: {author: 'bnoguchi', votes: {$gte: 5}}}});
  },

  
  'test Query#$where with a function arg': function () {
    var query = new Query();
    function filter () {
      return this.lastName === this.firstName;
    }
    query.$where(filter);
    query._conditions.should.eql({$where: filter});
  },

  'test Query#where with a javascript string arg': function () {
    var query = new Query();
    query.$where('this.lastName === this.firstName');
    query._conditions.should.eql({$where: 'this.lastName === this.firstName'});
  },

  'test Query#limit': function () {
    var query = new Query();
    query.limit(5);
    query.options.limit.should.equal(5);
  },

  'test Query#skip': function () {
    var query = new Query();
    query.skip(9);
    query.options.skip.should.equal(9);
  },

  'test Query#sort': function () {
    var query = new Query();
    query.sort('a', 1, 'c', -1, 'b', 1);
    query.options.sort.should.eql([['a', 1], ['c', -1], ['b', 1]]);
  },

  'test Query#asc and Query#desc': function () {
    var query = new Query();
    query.asc('a', 'z').desc('c', 'v').asc('b');
    query.options.sort.should.eql([['a', 1], ['z', 1], ['c', -1], ['v', -1], ['b', 1]]);
  },


  // Advanced Query options
  
  'test Query#maxscan': function () {
    var query = new Query();
    query.maxscan(100);
    query.options.maxscan.should.equal(100);
  },

  //  TODO
//  'test Query#min': function () {
//    var query = new Query();
//    query.min(10);
//    query.options.min.should.equal(10);
//  },
//
  //TODO
//  'test Query#max': function () {
//    var query = new Query();
//    query.max(100);
//    query.options.max.should.equal(100);
//  },

  // TODO Come back to this and make better
//  'test Query#hint': function () {
//    var query = new Query();
//    query.hint('indexAttributeA', 'indexAttributeB');
//    query.options.hint.should.equal('indexAttributeA', 'indexAttributeB');
//  },

  // TODO
//  'test Query#explain': function () {
//  }

  'test Query#snapshot': function () {
    var query = new Query();
    query.snapshot(true);
    query.options.snapshot.should.be.true;
  }
};
