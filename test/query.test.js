'use strict';

/**
 * Module dependencies.
 */

const start = require('./common');

const Query = require('../lib/query');
const assert = require('assert');
const co = require('co');
const random = require('../lib/utils').random;

const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const DocumentObjectId = mongoose.Types.ObjectId;

/**
 * Test.
 */

describe('Query', function() {
  let Comment;
  let Product;
  let p1;
  let db;

  before(function() {
    Comment = new Schema({
      text: String
    });

    Product = new Schema({
      tags: {}, // mixed
      array: Array,
      ids: [Schema.ObjectId],
      strings: [String],
      numbers: [Number],
      comments: [Comment]
    });

    mongoose.model('Product', Product);
    mongoose.model('Comment', Comment);
  });

  before(function() {
    const Prod = mongoose.model('Product');
    p1 = new Prod();
  });

  before(function() {
    db = start();
  });

  after(function(done) {
    db.close(done);
  });

  describe('constructor', function() {
    it('should not corrupt options', function(done) {
      const opts = {};
      const query = new Query({}, opts, null, p1.collection);
      assert.notEqual(opts, query._mongooseOptions);
      done();
    });
  });

  describe('select', function() {
    it('(object)', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.select({a: 1, b: 1, c: 0});
      assert.deepEqual(query._fields, {a: 1, b: 1, c: 0});
      done();
    });

    it('(string)', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.select(' a  b -c ');
      assert.deepEqual(query._fields, {a: 1, b: 1, c: 0});
      done();
    });

    it('("a","b","c")', function(done) {
      assert.throws(function() {
        const query = new Query({}, {}, null, p1.collection);
        query.select('a', 'b', 'c');
      }, /Invalid select/);
      done();
    });

    it('should not overwrite fields set in prior calls', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.select('a');
      assert.deepEqual(query._fields, {a: 1});
      query.select('b');
      assert.deepEqual(query._fields, {a: 1, b: 1});
      query.select({c: 0});
      assert.deepEqual(query._fields, {a: 1, b: 1, c: 0});
      query.select('-d');
      assert.deepEqual(query._fields, {a: 1, b: 1, c: 0, d: 0});
      done();
    });
  });

  describe('projection() (gh-7384)', function() {
    it('gets current projection', function() {
      const query = new Query({}, {}, null, p1.collection);
      query.select('a');
      assert.deepEqual(query.projection(), { a: 1 });
    });

    it('overwrites current projection', function() {
      const query = new Query({}, {}, null, p1.collection);
      query.select('a');
      assert.deepEqual(query.projection({ b: 1 }), { b: 1 });
      assert.deepEqual(query.projection(), { b: 1 });
    });
  });

  describe('where', function() {
    it('works', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.where('name', 'guillermo');
      assert.deepEqual(query._conditions, {name: 'guillermo'});
      query.where('a');
      query.equals('b');
      assert.deepEqual(query._conditions, {name: 'guillermo', a: 'b'});
      done();
    });
    it('throws if non-string or non-object path is passed', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      assert.throws(function() {
        query.where(50);
      });
      assert.throws(function() {
        query.where([]);
      });
      done();
    });
    it('does not throw when 0 args passed', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      assert.doesNotThrow(function() {
        query.where();
      });
      done();
    });
  });

  describe('equals', function() {
    it('works', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.where('name').equals('guillermo');
      assert.deepEqual(query._conditions, {name: 'guillermo'});
      done();
    });
  });

  describe('gte', function() {
    it('with 2 args', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.gte('age', 18);
      assert.deepEqual(query._conditions, {age: {$gte: 18}});
      done();
    });
    it('with 1 arg', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.where('age').gte(18);
      assert.deepEqual(query._conditions, {age: {$gte: 18}});
      done();
    });
  });

  describe('gt', function() {
    it('with 1 arg', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.where('age').gt(17);
      assert.deepEqual(query._conditions, {age: {$gt: 17}});
      done();
    });
    it('with 2 args', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.gt('age', 17);
      assert.deepEqual(query._conditions, {age: {$gt: 17}});
      done();
    });
  });

  describe('lte', function() {
    it('with 1 arg', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.where('age').lte(65);
      assert.deepEqual(query._conditions, {age: {$lte: 65}});
      done();
    });
    it('with 2 args', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.lte('age', 65);
      assert.deepEqual(query._conditions, {age: {$lte: 65}});
      done();
    });
  });

  describe('lt', function() {
    it('with 1 arg', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.where('age').lt(66);
      assert.deepEqual(query._conditions, {age: {$lt: 66}});
      done();
    });
    it('with 2 args', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.lt('age', 66);
      assert.deepEqual(query._conditions, {age: {$lt: 66}});
      done();
    });
  });

  describe('combined', function() {
    describe('lt and gt', function() {
      it('works', function(done) {
        const query = new Query({}, {}, null, p1.collection);
        query.where('age').lt(66).gt(17);
        assert.deepEqual(query._conditions, {age: {$lt: 66, $gt: 17}});
        done();
      });
    });
  });

  describe('tl on one path and gt on another', function() {
    it('works', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query
        .where('age').lt(66)
        .where('height').gt(5);
      assert.deepEqual(query._conditions, {age: {$lt: 66}, height: {$gt: 5}});
      done();
    });
  });

  describe('ne', function() {
    it('with 1 arg', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.where('age').ne(21);
      assert.deepEqual(query._conditions, {age: {$ne: 21}});
      done();
    });
    it('with 2 args', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.ne('age', 21);
      assert.deepEqual(query._conditions, {age: {$ne: 21}});
      done();
    });
  });

  describe('in', function() {
    it('with 1 arg', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.where('age').in([21, 25, 30]);
      assert.deepEqual(query._conditions, {age: {$in: [21, 25, 30]}});
      done();
    });
    it('with 2 args', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.in('age', [21, 25, 30]);
      assert.deepEqual(query._conditions, {age: {$in: [21, 25, 30]}});
      done();
    });
    it('where a non-array value no via where', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.in('age', 21);
      assert.deepEqual(query._conditions, {age: {$in: 21}});
      done();
    });
    it('where a non-array value via where', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.where('age').in(21);
      assert.deepEqual(query._conditions, {age: {$in: 21}});
      done();
    });
  });

  describe('nin', function() {
    it('with 1 arg', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.where('age').nin([21, 25, 30]);
      assert.deepEqual(query._conditions, {age: {$nin: [21, 25, 30]}});
      done();
    });
    it('with 2 args', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.nin('age', [21, 25, 30]);
      assert.deepEqual(query._conditions, {age: {$nin: [21, 25, 30]}});
      done();
    });
    it('with a non-array value not via where', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.nin('age', 21);
      assert.deepEqual(query._conditions, {age: {$nin: 21}});
      done();
    });
    it('with a non-array value via where', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.where('age').nin(21);
      assert.deepEqual(query._conditions, {age: {$nin: 21}});
      done();
    });
  });

  describe('mod', function() {
    it('not via where, where [a, b] param', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.mod('age', [5, 2]);
      assert.deepEqual(query._conditions, {age: {$mod: [5, 2]}});
      done();
    });
    it('not via where, where a and b params', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.mod('age', 5, 2);
      assert.deepEqual(query._conditions, {age: {$mod: [5, 2]}});
      done();
    });
    it('via where, where [a, b] param', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.where('age').mod([5, 2]);
      assert.deepEqual(query._conditions, {age: {$mod: [5, 2]}});
      done();
    });
    it('via where, where a and b params', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.where('age').mod(5, 2);
      assert.deepEqual(query._conditions, {age: {$mod: [5, 2]}});
      done();
    });
  });

  describe('near', function() {
    it('via where, where { center :[lat, long]} param', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.where('checkin').near({center: [40, -72]});
      assert.deepEqual(query._conditions, {checkin: {$near: [40, -72]}});
      done();
    });
    it('via where, where [lat, long] param', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.where('checkin').near([40, -72]);
      assert.deepEqual(query._conditions, {checkin: {$near: [40, -72]}});
      done();
    });
    it('via where, where lat and long params', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.where('checkin').near(40, -72);
      assert.deepEqual(query._conditions, {checkin: {$near: [40, -72]}});
      done();
    });
    it('not via where, where [lat, long] param', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.near('checkin', [40, -72]);
      assert.deepEqual(query._conditions, {checkin: {$near: [40, -72]}});
      done();
    });
    it('not via where, where lat and long params', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.near('checkin', 40, -72);
      assert.deepEqual(query._conditions, {checkin: {$near: [40, -72]}});
      done();
    });
    it('via where, where GeoJSON param', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.where('numbers').near({center: {type: 'Point', coordinates: [40, -72]}});
      assert.deepEqual(query._conditions, {numbers: {$near: {$geometry: {type: 'Point', coordinates: [40, -72]}}}});
      assert.doesNotThrow(function() {
        query.cast(p1.constructor);
      });
      done();
    });
    it('with path, where GeoJSON param', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.near('loc', {center: {type: 'Point', coordinates: [40, -72]}});
      assert.deepEqual(query._conditions, {loc: {$near: {$geometry: {type: 'Point', coordinates: [40, -72]}}}});
      done();
    });
  });

  describe('nearSphere', function() {
    it('via where, where [lat, long] param', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.where('checkin').nearSphere([40, -72]);
      assert.deepEqual(query._conditions, {checkin: {$nearSphere: [40, -72]}});
      done();
    });
    it('via where, where lat and long params', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.where('checkin').nearSphere(40, -72);
      assert.deepEqual(query._conditions, {checkin: {$nearSphere: [40, -72]}});
      done();
    });
    it('not via where, where [lat, long] param', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.nearSphere('checkin', [40, -72]);
      assert.deepEqual(query._conditions, {checkin: {$nearSphere: [40, -72]}});
      done();
    });
    it('not via where, where lat and long params', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.nearSphere('checkin', 40, -72);
      assert.deepEqual(query._conditions, {checkin: {$nearSphere: [40, -72]}});
      done();
    });

    it('via where, with object', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.where('checkin').nearSphere({center: [20, 23], maxDistance: 2});
      assert.deepEqual(query._conditions, {checkin: {$nearSphere: [20, 23], $maxDistance: 2}});
      done();
    });

    it('via where, where GeoJSON param', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.where('numbers').nearSphere({center: {type: 'Point', coordinates: [40, -72]}});
      assert.deepEqual(query._conditions, {numbers: {$nearSphere: {$geometry: {type: 'Point', coordinates: [40, -72]}}}});
      assert.doesNotThrow(function() {
        query.cast(p1.constructor);
      });
      done();
    });

    it('with path, with GeoJSON', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.nearSphere('numbers', {center: {type: 'Point', coordinates: [40, -72]}});
      assert.deepEqual(query._conditions, {numbers: {$nearSphere: {$geometry: {type: 'Point', coordinates: [40, -72]}}}});
      assert.doesNotThrow(function() {
        query.cast(p1.constructor);
      });
      done();
    });
  });

  describe('maxDistance', function() {
    it('via where', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.where('checkin').near([40, -72]).maxDistance(1);
      assert.deepEqual(query._conditions, {checkin: {$near: [40, -72], $maxDistance: 1}});
      done();
    });
  });

  describe('within', function() {
    describe('box', function() {
      it('via where', function(done) {
        const query = new Query({}, {}, null, p1.collection);
        query.where('gps').within().box({ll: [5, 25], ur: [10, 30]});
        const match = {gps: {$within: {$box: [[5, 25], [10, 30]]}}};
        if (Query.use$geoWithin) {
          match.gps.$geoWithin = match.gps.$within;
          delete match.gps.$within;
        }
        assert.deepEqual(query._conditions, match);
        done();
      });
      it('via where, no object', function(done) {
        const query = new Query({}, {}, null, p1.collection);
        query.where('gps').within().box([5, 25], [10, 30]);
        const match = {gps: {$within: {$box: [[5, 25], [10, 30]]}}};
        if (Query.use$geoWithin) {
          match.gps.$geoWithin = match.gps.$within;
          delete match.gps.$within;
        }
        assert.deepEqual(query._conditions, match);
        done();
      });
    });

    describe('center', function() {
      it('via where', function(done) {
        const query = new Query({}, {}, null, p1.collection);
        query.where('gps').within().center({center: [5, 25], radius: 5});
        const match = {gps: {$within: {$center: [[5, 25], 5]}}};
        if (Query.use$geoWithin) {
          match.gps.$geoWithin = match.gps.$within;
          delete match.gps.$within;
        }
        assert.deepEqual(query._conditions, match);
        done();
      });
    });

    describe('centerSphere', function() {
      it('via where', function(done) {
        const query = new Query({}, {}, null, p1.collection);
        query.where('gps').within().centerSphere({center: [5, 25], radius: 5});
        const match = {gps: {$within: {$centerSphere: [[5, 25], 5]}}};
        if (Query.use$geoWithin) {
          match.gps.$geoWithin = match.gps.$within;
          delete match.gps.$within;
        }
        assert.deepEqual(query._conditions, match);
        done();
      });
    });

    describe('polygon', function() {
      it('via where', function(done) {
        const query = new Query({}, {}, null, p1.collection);
        query.where('gps').within().polygon({a: {x: 10, y: 20}, b: {x: 15, y: 25}, c: {x: 20, y: 20}});
        const match = {gps: {$within: {$polygon: [{a: {x: 10, y: 20}, b: {x: 15, y: 25}, c: {x: 20, y: 20}}]}}};
        if (Query.use$geoWithin) {
          match.gps.$geoWithin = match.gps.$within;
          delete match.gps.$within;
        }
        assert.deepEqual(query._conditions, match);
        done();
      });
    });
  });

  describe('exists', function() {
    it('0 args via where', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.where('username').exists();
      assert.deepEqual(query._conditions, {username: {$exists: true}});
      done();
    });
    it('1 arg via where', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.where('username').exists(false);
      assert.deepEqual(query._conditions, {username: {$exists: false}});
      done();
    });
    it('where 1 argument not via where', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.exists('username');
      assert.deepEqual(query._conditions, {username: {$exists: true}});
      done();
    });

    it('where 2 args not via where', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.exists('username', false);
      assert.deepEqual(query._conditions, {username: {$exists: false}});
      done();
    });
  });

  describe('all', function() {
    it('via where', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.where('pets').all(['dog', 'cat', 'ferret']);
      assert.deepEqual(query._conditions, {pets: {$all: ['dog', 'cat', 'ferret']}});
      done();
    });
    it('not via where', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.all('pets', ['dog', 'cat', 'ferret']);
      assert.deepEqual(query._conditions, {pets: {$all: ['dog', 'cat', 'ferret']}});
      done();
    });
  });

  describe('find', function() {
    it('strict array equivalence condition v', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.find({pets: ['dog', 'cat', 'ferret']});
      assert.deepEqual(query._conditions, {pets: ['dog', 'cat', 'ferret']});
      done();
    });
    it('with no args', function(done) {
      let threw = false;
      const q = new Query({}, {}, null, p1.collection);

      try {
        q.find();
      } catch (err) {
        threw = true;
      }

      assert.ok(!threw);
      done();
    });

    it('works with overwriting previous object args (1176)', function(done) {
      const q = new Query({}, {}, null, p1.collection);
      assert.doesNotThrow(function() {
        q.find({age: {$lt: 30}});
        q.find({age: 20}); // overwrite
      });
      assert.deepEqual({age: 20}, q._conditions);
      done();
    });
  });

  describe('size', function() {
    it('via where', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.where('collection').size(5);
      assert.deepEqual(query._conditions, {collection: {$size: 5}});
      done();
    });
    it('not via where', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.size('collection', 5);
      assert.deepEqual(query._conditions, {collection: {$size: 5}});
      done();
    });
  });

  describe('slice', function() {
    it('where and positive limit param', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.where('collection').slice(5);
      assert.deepEqual(query._fields, {collection: {$slice: 5}});
      done();
    });
    it('where just negative limit param', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.where('collection').slice(-5);
      assert.deepEqual(query._fields, {collection: {$slice: -5}});
      done();
    });
    it('where [skip, limit] param', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.where('collection').slice([14, 10]); // Return the 15th through 25th
      assert.deepEqual(query._fields, {collection: {$slice: [14, 10]}});
      done();
    });
    it('where skip and limit params', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.where('collection').slice(14, 10); // Return the 15th through 25th
      assert.deepEqual(query._fields, {collection: {$slice: [14, 10]}});
      done();
    });
    it('where just positive limit param', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.where('collection').slice(5);
      assert.deepEqual(query._fields, {collection: {$slice: 5}});
      done();
    });
    it('where just negative limit param', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.where('collection').slice(-5);
      assert.deepEqual(query._fields, {collection: {$slice: -5}});
      done();
    });
    it('where the [skip, limit] param', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.where('collection').slice([14, 10]); // Return the 15th through 25th
      assert.deepEqual(query._fields, {collection: {$slice: [14, 10]}});
      done();
    });
    it('where the skip and limit params', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.where('collection').slice(14, 10); // Return the 15th through 25th
      assert.deepEqual(query._fields, {collection: {$slice: [14, 10]}});
      done();
    });
    it('not via where, with just positive limit param', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.slice('collection', 5);
      assert.deepEqual(query._fields, {collection: {$slice: 5}});
      done();
    });
    it('not via where, where just negative limit param', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.slice('collection', -5);
      assert.deepEqual(query._fields, {collection: {$slice: -5}});
      done();
    });
    it('not via where, where [skip, limit] param', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.slice('collection', [14, 10]); // Return the 15th through 25th
      assert.deepEqual(query._fields, {collection: {$slice: [14, 10]}});
      done();
    });
    it('not via where, where skip and limit params', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.slice('collection', 14, 10); // Return the 15th through 25th
      assert.deepEqual(query._fields, {collection: {$slice: [14, 10]}});
      done();
    });
  });

  describe('elemMatch', function() {
    describe('not via where', function() {
      it('works', function(done) {
        const query = new Query({}, {}, null, p1.collection);
        query.elemMatch('comments', {author: 'bnoguchi', votes: {$gte: 5}});
        assert.deepEqual(query._conditions, {comments: {$elemMatch: {author: 'bnoguchi', votes: {$gte: 5}}}});
        done();
      });
      it('where block notation', function(done) {
        const query = new Query({}, {}, null, p1.collection);
        query.elemMatch('comments', function(elem) {
          elem.where('author', 'bnoguchi');
          elem.where('votes').gte(5);
        });
        assert.deepEqual(query._conditions, {comments: {$elemMatch: {author: 'bnoguchi', votes: {$gte: 5}}}});
        done();
      });
    });
    describe('via where', function() {
      it('works', function(done) {
        const query = new Query({}, {}, null, p1.collection);
        query.where('comments').elemMatch({author: 'bnoguchi', votes: {$gte: 5}});
        assert.deepEqual(query._conditions, {comments: {$elemMatch: {author: 'bnoguchi', votes: {$gte: 5}}}});
        done();
      });
      it('where block notation', function(done) {
        const query = new Query({}, {}, null, p1.collection);
        query.where('comments').elemMatch(function(elem) {
          elem.where('author', 'bnoguchi');
          elem.where('votes').gte(5);
        });
        assert.deepEqual(query._conditions, {comments: {$elemMatch: {author: 'bnoguchi', votes: {$gte: 5}}}});
        done();
      });
    });
  });

  describe('$where', function() {
    it('function arg', function(done) {
      const query = new Query({}, {}, null, p1.collection);

      function filter() {
        return this.lastName === this.firstName;
      }

      query.$where(filter);
      assert.deepEqual(query._conditions, {$where: filter});
      done();
    });
    it('string arg', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.$where('this.lastName === this.firstName');
      assert.deepEqual(query._conditions, {$where: 'this.lastName === this.firstName'});
      done();
    });
  });

  describe('limit', function() {
    it('works', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.limit(5);
      assert.equal(query.options.limit, 5);
      done();
    });
  });

  describe('skip', function() {
    it('works', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      query.skip(9);
      assert.equal(query.options.skip, 9);
      done();
    });
  });

  describe('sort', function() {
    it('works', function(done) {
      let query = new Query({}, {}, null, p1.collection);
      query.sort('a -c b');
      assert.deepEqual(query.options.sort, {a: 1, c: -1, b: 1});
      query = new Query({}, {}, null, p1.collection);
      query.sort({a: 1, c: -1, b: 'asc', e: 'descending', f: 'ascending'});
      assert.deepEqual(query.options.sort, {a: 1, c: -1, b: 1, e: -1, f: 1});

      if (typeof global.Map !== 'undefined') {
        query = new Query({}, {}, null, p1.collection);
        query.sort(new global.Map().set('a', 1).set('b', 1));
        assert.equal(query.options.sort.get('a'), 1);
        assert.equal(query.options.sort.get('b'), 1);
      }

      query = new Query({}, {}, null, p1.collection);
      let e;

      try {
        query.sort(['a', 1]);
      } catch (err) {
        e = err;
      }

      assert.ok(e, 'uh oh. no error was thrown');
      assert.equal(e.message, 'Invalid sort() argument, must be array of arrays');

      e = undefined;
      try {
        query.sort('a', 1, 'c', -1, 'b', 1);
      } catch (err) {
        e = err;
      }
      assert.ok(e, 'uh oh. no error was thrown');
      assert.equal(e.message, 'sort() only takes 1 Argument');
      done();
    });
  });

  describe('or', function() {
    it('works', function(done) {
      const query = new Query;
      query.find({$or: [{x: 1}, {x: 2}]});
      assert.equal(query._conditions.$or.length, 2);
      query.or([{y: 'We\'re under attack'}, {z: 47}]);
      assert.equal(query._conditions.$or.length, 4);
      assert.equal(query._conditions.$or[3].z, 47);
      query.or({z: 'phew'});
      assert.equal(query._conditions.$or.length, 5);
      assert.equal(query._conditions.$or[3].z, 47);
      assert.equal(query._conditions.$or[4].z, 'phew');
      done();
    });
  });

  describe('and', function() {
    it('works', function(done) {
      const query = new Query;
      query.find({$and: [{x: 1}, {y: 2}]});
      assert.equal(query._conditions.$and.length, 2);
      query.and([{z: 'We\'re under attack'}, {w: 47}]);
      assert.equal(query._conditions.$and.length, 4);
      assert.equal(query._conditions.$and[3].w, 47);
      query.and({a: 'phew'});
      assert.equal(query._conditions.$and.length, 5);
      assert.equal(query._conditions.$and[0].x, 1);
      assert.equal(query._conditions.$and[1].y, 2);
      assert.equal(query._conditions.$and[2].z, 'We\'re under attack');
      assert.equal(query._conditions.$and[3].w, 47);
      assert.equal(query._conditions.$and[4].a, 'phew');
      done();
    });
  });

  describe('populate', function() {
    it('converts to PopulateOptions objects', function(done) {
      const q = new Query({}, {}, null, p1.collection);
      const o = {
        path: 'yellow.brick',
        match: {bricks: {$lt: 1000}},
        select: undefined,
        model: undefined,
        options: undefined,
        _docs: {}
      };
      q.populate(o);
      assert.deepEqual(o, q._mongooseOptions.populate['yellow.brick']);
      done();
    });

    it('overwrites duplicate paths', function(done) {
      const q = new Query({}, {}, null, p1.collection);
      let o = {
        path: 'yellow.brick',
        match: {bricks: {$lt: 1000}},
        _docs: {}
      };
      q.populate(Object.assign({}, o));
      assert.equal(Object.keys(q._mongooseOptions.populate).length, 1);
      assert.deepEqual(q._mongooseOptions.populate['yellow.brick'], o);

      q.populate('yellow.brick');
      o = {
        path: 'yellow.brick',
        _docs: {}
      };
      assert.equal(Object.keys(q._mongooseOptions.populate).length, 1);
      assert.deepEqual(q._mongooseOptions.populate['yellow.brick'], o);
      done();
    });

    it('accepts space delimited strings', function(done) {
      const q = new Query({}, {}, null, p1.collection);
      q.populate('yellow.brick dirt');
      assert.equal(Object.keys(q._mongooseOptions.populate).length, 2);
      assert.deepEqual(q._mongooseOptions.populate['yellow.brick'], {
        path: 'yellow.brick',
        _docs: {}
      });
      assert.deepEqual(q._mongooseOptions.populate['dirt'], {
        path: 'dirt',
        _docs: {}
      });
      done();
    });
  });

  describe('casting', function() {
    it('to an array of mixed', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      const Product = db.model('Product');
      const params = {_id: new DocumentObjectId, tags: {$in: [4, 8, 15, 16]}};
      query.cast(Product, params);
      assert.deepEqual(params.tags.$in, [4, 8, 15, 16]);
      done();
    });

    it('doesn\'t wipe out $in (gh-6439)', function() {
      const embeddedSchema = new Schema({
        name: String
      }, { _id: false });

      const catSchema = new Schema({
        name: String,
        props: [embeddedSchema]
      });

      const Cat = db.model('gh6439', catSchema);
      const kitty = new Cat({
        name: 'Zildjian',
        props: [
          { name: 'invalid' },
          { name: 'abc' },
          { name: 'def' }
        ]
      });

      return co(function*() {
        yield kitty.save();
        const cond = { _id: kitty._id };
        const update = {
          $pull: {
            props: {
              $in: [
                { name: 'invalid' },
                { name: 'def' }
              ]
            }
          }
        };
        yield Cat.updateOne(cond, update);
        const found = yield Cat.findOne(cond);
        assert.strictEqual(found.props[0].name, 'abc');
      });
    });

    it('find $ne should not cast single value to array for schematype of Array', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      const Product = db.model('Product');
      const Comment = db.model('Comment');

      const id = new DocumentObjectId;
      const castedComment = {_id: id, text: 'hello there'};
      const comment = new Comment(castedComment);

      const params = {
        array: {$ne: 5},
        ids: {$ne: id},
        comments: {$ne: comment},
        strings: {$ne: 'Hi there'},
        numbers: {$ne: 10000}
      };

      query.cast(Product, params);
      assert.equal(params.array.$ne, 5);
      assert.equal(params.ids.$ne, id);
      params.comments.$ne._id.toHexString();
      assert.deepEqual(params.comments.$ne.toObject(), castedComment);
      assert.equal(params.strings.$ne, 'Hi there');
      assert.equal(params.numbers.$ne, 10000);

      params.array.$ne = [5];
      params.ids.$ne = [id];
      params.comments.$ne = [comment];
      params.strings.$ne = ['Hi there'];
      params.numbers.$ne = [10000];
      query.cast(Product, params);
      assert.ok(params.array.$ne instanceof Array);
      assert.equal(params.array.$ne[0], 5);
      assert.ok(params.ids.$ne instanceof Array);
      assert.equal(params.ids.$ne[0].toString(), id.toString());
      assert.ok(params.comments.$ne instanceof Array);
      assert.deepEqual(params.comments.$ne[0].toObject(), castedComment);
      assert.ok(params.strings.$ne instanceof Array);
      assert.equal(params.strings.$ne[0], 'Hi there');
      assert.ok(params.numbers.$ne instanceof Array);
      assert.equal(params.numbers.$ne[0], 10000);
      done();
    });

    it('subdocument array with $ne: null should not throw', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      const Product = db.model('Product');

      const params = {
        comments: {$ne: null}
      };

      query.cast(Product, params);
      assert.strictEqual(params.comments.$ne, null);
      done();
    });

    it('find should not cast single value to array for schematype of Array', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      const Product = db.model('Product');
      const Comment = db.model('Comment');

      const id = new DocumentObjectId;
      const castedComment = {_id: id, text: 'hello there'};
      const comment = new Comment(castedComment);

      const params = {
        array: 5,
        ids: id,
        comments: comment,
        strings: 'Hi there',
        numbers: 10000
      };

      query.cast(Product, params);
      assert.equal(params.array, 5);
      assert.equal(params.ids, id);
      params.comments._id.toHexString();
      assert.deepEqual(params.comments.toObject(), castedComment);
      assert.equal(params.strings, 'Hi there');
      assert.equal(params.numbers, 10000);

      params.array = [5];
      params.ids = [id];
      params.comments = [comment];
      params.strings = ['Hi there'];
      params.numbers = [10000];
      query.cast(Product, params);
      assert.ok(params.array instanceof Array);
      assert.equal(params.array[0], 5);
      assert.ok(params.ids instanceof Array);
      assert.equal(params.ids[0].toString(), id.toString());
      assert.ok(params.comments instanceof Array);
      assert.deepEqual(params.comments[0].toObject(), castedComment);
      assert.ok(params.strings instanceof Array);
      assert.equal(params.strings[0], 'Hi there');
      assert.ok(params.numbers instanceof Array);
      assert.equal(params.numbers[0], 10000);
      done();
    });

    it('an $elemMatch with $in works (gh-1100)', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      const Product = db.model('Product');
      const ids = [String(new DocumentObjectId), String(new DocumentObjectId)];
      const params = {ids: {$elemMatch: {$in: ids}}};
      query.cast(Product, params);
      assert.ok(params.ids.$elemMatch.$in[0] instanceof DocumentObjectId);
      assert.ok(params.ids.$elemMatch.$in[1] instanceof DocumentObjectId);
      assert.deepEqual(params.ids.$elemMatch.$in[0].toString(), ids[0]);
      assert.deepEqual(params.ids.$elemMatch.$in[1].toString(), ids[1]);
      done();
    });

    it('inequality operators for an array', function(done) {
      const query = new Query({}, {}, null, p1.collection);
      const Product = db.model('Product');
      const Comment = db.model('Comment');

      const id = new DocumentObjectId;
      const castedComment = {_id: id, text: 'hello there'};
      const comment = new Comment(castedComment);

      const params = {
        ids: {$gt: id},
        comments: {$gt: comment},
        strings: {$gt: 'Hi there'},
        numbers: {$gt: 10000}
      };

      query.cast(Product, params);
      assert.equal(params.ids.$gt, id);
      assert.deepEqual(params.comments.$gt.toObject(), castedComment);
      assert.equal(params.strings.$gt, 'Hi there');
      assert.equal(params.numbers.$gt, 10000);
      done();
    });
  });

  describe('distinct', function() {
    it('op', function(done) {
      const Product = db.model('Product');
      const prod = new Product({});
      const q = new Query({}, {}, Product, prod.collection).distinct('blah', function() {
        assert.equal(q.op, 'distinct');
        done();
      });
    });
  });

  describe('findOne', function() {
    it('sets the op', function(done) {
      const Product = db.model('Product');
      const prod = new Product({});
      const q = new Query(prod.collection, {}, Product).distinct();
      // use a timeout here because we have to wait for the connection to start
      // before any ops will get set
      setTimeout(function() {
        assert.equal(q.op, 'distinct');
        q.findOne();
        assert.equal(q.op, 'findOne');
        done();
      }, 50);
    });

    it('works as a promise', function(done) {
      const Product = db.model('Product');
      const promise = Product.findOne();

      promise.then(function() {
        done();
      }, function(err) {
        assert.ifError(err);
      });
    });
  });

  describe('deleteOne/deleteMany', function() {
    it('handles deleteOne', function(done) {
      const M = db.model('deleteOne', new Schema({ name: 'String' }));
      M.create([{ name: 'Eddard Stark' }, { name: 'Robb Stark' }], function(error) {
        assert.ifError(error);
        M.deleteOne({ name: /Stark/ }, function(error) {
          assert.ifError(error);
          M.estimatedDocumentCount(function(error, count) {
            assert.ifError(error);
            assert.equal(count, 1);
            done();
          });
        });
      });
    });

    it('handles deleteMany', function(done) {
      const M = db.model('deleteMany', new Schema({ name: 'String' }));
      M.create([{ name: 'Eddard Stark' }, { name: 'Robb Stark' }], function(error) {
        assert.ifError(error);
        M.deleteMany({ name: /Stark/ }, function(error) {
          assert.ifError(error);
          M.countDocuments({}, function(error, count) {
            assert.ifError(error);
            assert.equal(count, 0);
            done();
          });
        });
      });
    });
  });

  describe('remove', function() {
    it('handles cast errors async', function(done) {
      const Product = db.model('Product');

      assert.doesNotThrow(function() {
        Product.where({numbers: [[[]]]}).deleteMany(function(err) {
          assert.ok(err);
          done();
        });
      });
    });

    it('supports a single conditions arg', function(done) {
      const Product = db.model('Product');

      Product.create({strings: ['remove-single-condition']}).then(function() {
        const q = Product.where().deleteMany({strings: 'remove-single-condition'});
        assert.ok(q instanceof mongoose.Query);
        done();
      }, done);
    });

    it('supports a single callback arg', function(done) {
      const Product = db.model('Product');
      const val = 'remove-single-callback';

      Product.create({strings: [val]}).then(function() {
        Product.where({strings: val}).deleteMany(function(err) {
          assert.ifError(err);
          Product.findOne({strings: val}, function(err, doc) {
            assert.ifError(err);
            assert.ok(!doc);
            done();
          });
        });
      }, done);
    });

    it('supports conditions and callback args', function(done) {
      const Product = db.model('Product');
      const val = 'remove-cond-and-callback';

      Product.create({strings: [val]}).then(function() {
        Product.where().deleteMany({strings: val}, function(err) {
          assert.ifError(err);
          Product.findOne({strings: val}, function(err, doc) {
            assert.ifError(err);
            assert.ok(!doc);
            done();
          });
        });
      }, done);
    });

    it('single option, default', function(done) {
      const Test = db.model('Test_single', new Schema({ name: String }));

      Test.create([{ name: 'Eddard Stark' }, { name: 'Robb Stark' }], function(error) {
        assert.ifError(error);
        Test.deleteMany({ name: /Stark/ }).exec(function(error, res) {
          assert.ifError(error);
          assert.equal(res.n, 2);
          Test.countDocuments({}, function(error, count) {
            assert.ifError(error);
            assert.equal(count, 0);
            done();
          });
        });
      });
    });

    it.skip('single option, false', function(done) {
      const Test = db.model('Test_single_false', new Schema({ name: String }));

      Test.create([{ name: 'Eddard Stark' }, { name: 'Robb Stark' }], function(error) {
        assert.ifError(error);
        Test.remove({ name: /Stark/ }).setOptions({ single: false }).exec(function(error, res) {
          assert.ifError(error);
          assert.equal(res.n, 2);
          Test.countDocuments({}, function(error, count) {
            assert.ifError(error);
            assert.equal(count, 0);
            done();
          });
        });
      });
    });

    it.skip('single option, true', function(done) {
      const Test = db.model('Test_single_true', new Schema({ name: String }));

      Test.create([{ name: 'Eddard Stark' }, { name: 'Robb Stark' }], function(error) {
        assert.ifError(error);
        Test.remove({ name: /Stark/ }).setOptions({ single: true }).exec(function(error, res) {
          assert.ifError(error);
          assert.equal(res.n, 1);
          Test.countDocuments({}, function(error, count) {
            assert.ifError(error);
            assert.equal(count, 1);
            done();
          });
        });
      });
    });
  });

  describe('querying/updating with model instance containing embedded docs should work (#454)', function() {
    it('works', function(done) {
      const Product = db.model('Product');

      const proddoc = {comments: [{text: 'hello'}]};
      const prod2doc = {comments: [{text: 'goodbye'}]};

      const prod = new Product(proddoc);
      prod.save(function(err) {
        assert.ifError(err);

        Product.findOne({ _id: prod._id }, function(err, product) {
          assert.ifError(err);
          assert.equal(product.comments.length, 1);
          assert.equal(product.comments[0].text, 'hello');

          Product.updateOne({ _id: prod._id }, prod2doc, function(err) {
            assert.ifError(err);

            Product.collection.findOne({_id: product._id}, function(err, doc) {
              assert.ifError(err);
              assert.equal(doc.comments.length, 1);
              // ensure hidden private props were not saved to db
              assert.ok(!doc.comments[0].hasOwnProperty('parentArry'));
              assert.equal(doc.comments[0].text, 'goodbye');
              done();
            });
          });
        });
      });
    });
  });

  describe('optionsForExec', function() {
    it('should retain key order', function(done) {
      // this is important for query hints
      const hint = {x: 1, y: 1, z: 1};
      const a = JSON.stringify({ hint: hint });

      const q = new Query;
      q.hint(hint);

      const options = q._optionsForExec({ schema: { options: {} } });
      assert.equal(JSON.stringify(options), a);
      done();
    });

    it('applies schema-level writeConcern option', function(done) {
      const q = new Query();

      q.j(true);

      const options = q._optionsForExec({
        schema: {
          options: {
            writeConcern: { w: 'majority' }
          }
        }
      });
      assert.deepEqual(options, {
        w: 'majority',
        j: true
      });
      done();
    });

    it('session() (gh-6663)', function(done) {
      const q = new Query();

      const fakeSession = 'foo';
      q.session(fakeSession);

      const options = q._optionsForExec();
      assert.deepEqual(options, {
        session: fakeSession
      });
      done();
    });
  });

  // Advanced Query options

  describe('options', function() {
    describe('maxscan', function() {
      it('works', function(done) {
        const query = new Query({}, {}, null, p1.collection);
        query.maxscan(100);
        assert.equal(query.options.maxScan, 100);
        done();
      });
    });

    describe('slaveOk', function() {
      it('works', function(done) {
        let query = new Query({}, {}, null, p1.collection);
        query.slaveOk();
        assert.equal(query.options.slaveOk, true);

        query = new Query({}, {}, null, p1.collection);
        query.slaveOk(true);
        assert.equal(query.options.slaveOk, true);

        query = new Query({}, {}, null, p1.collection);
        query.slaveOk(false);
        assert.equal(query.options.slaveOk, false);
        done();
      });
    });

    describe('tailable', function() {
      it('works', function(done) {
        let query = new Query({}, {}, null, p1.collection);
        query.tailable();
        assert.equal(query.options.tailable, true);

        query = new Query({}, {}, null, p1.collection);
        query.tailable(true);
        assert.equal(query.options.tailable, true);

        query = new Query({}, {}, null, p1.collection);
        query.tailable(false);
        assert.equal(query.options.tailable, false);
        done();
      });
      it('supports passing the `await` option', function(done) {
        const query = new Query({}, {}, null, p1.collection);
        query.tailable({awaitdata: true});
        assert.equal(query.options.tailable, true);
        assert.equal(query.options.awaitdata, true);
        done();
      });
    });

    describe('comment', function() {
      it('works', function(done) {
        const query = new Query;
        assert.equal(typeof query.comment, 'function');
        assert.equal(query.comment('Lowpass is more fun'), query);
        assert.equal(query.options.comment, 'Lowpass is more fun');
        done();
      });
    });

    describe('hint', function() {
      it('works', function(done) {
        const query2 = new Query({}, {}, null, p1.collection);
        query2.hint({indexAttributeA: 1, indexAttributeB: -1});
        assert.deepEqual(query2.options.hint, {indexAttributeA: 1, indexAttributeB: -1});

        const query3 = new Query({}, {}, null, p1.collection);
        query3.hint('indexAttributeA_1');
        assert.deepEqual(query3.options.hint, 'indexAttributeA_1');

        done();
      });
    });

    describe('snapshot', function() {
      it('works', function(done) {
        const query = new Query({}, {}, null, p1.collection);
        query.snapshot(true);
        assert.equal(query.options.snapshot, true);
        done();
      });
    });

    describe('batchSize', function() {
      it('works', function(done) {
        const query = new Query({}, {}, null, p1.collection);
        query.batchSize(10);
        assert.equal(query.options.batchSize, 10);
        done();
      });
    });

    describe('read', function() {
      const P = mongoose.mongo.ReadPreference;

      describe('without tags', function() {
        it('works', function(done) {
          const query = new Query({}, {}, null, p1.collection);
          query.read('primary');
          assert.ok(query.options.readPreference instanceof P);
          assert.ok(query.options.readPreference.isValid());
          assert.equal(query.options.readPreference.mode, 'primary');

          query.read('p');
          assert.ok(query.options.readPreference instanceof P);
          assert.ok(query.options.readPreference.isValid());
          assert.equal(query.options.readPreference.mode, 'primary');

          query.read('primaryPreferred');
          assert.ok(query.options.readPreference instanceof P);
          assert.ok(query.options.readPreference.isValid());
          assert.equal(query.options.readPreference.mode, 'primaryPreferred');

          query.read('pp');
          assert.ok(query.options.readPreference instanceof P);
          assert.ok(query.options.readPreference.isValid());
          assert.equal(query.options.readPreference.mode, 'primaryPreferred');

          query.read('secondary');
          assert.ok(query.options.readPreference instanceof P);
          assert.ok(query.options.readPreference.isValid());
          assert.equal(query.options.readPreference.mode, 'secondary');

          query.read('s');
          assert.ok(query.options.readPreference instanceof P);
          assert.ok(query.options.readPreference.isValid());
          assert.equal(query.options.readPreference.mode, 'secondary');

          query.read('secondaryPreferred');
          assert.ok(query.options.readPreference instanceof P);
          assert.ok(query.options.readPreference.isValid());
          assert.equal(query.options.readPreference.mode, 'secondaryPreferred');

          query.read('sp');
          assert.ok(query.options.readPreference instanceof P);
          assert.ok(query.options.readPreference.isValid());
          assert.equal(query.options.readPreference.mode, 'secondaryPreferred');

          query.read('nearest');
          assert.ok(query.options.readPreference instanceof P);
          assert.ok(query.options.readPreference.isValid());
          assert.equal(query.options.readPreference.mode, 'nearest');

          query.read('n');
          assert.ok(query.options.readPreference instanceof P);
          assert.ok(query.options.readPreference.isValid());
          assert.equal(query.options.readPreference.mode, 'nearest');

          done();
        });
      });

      describe('with tags', function() {
        it('works', function(done) {
          const query = new Query({}, {}, null, p1.collection);
          const tags = [{dc: 'sf', s: 1}, {dc: 'jp', s: 2}];

          query.read('pp', tags);
          assert.ok(query.options.readPreference instanceof P);
          assert.ok(query.options.readPreference.isValid());
          assert.equal(query.options.readPreference.mode, 'primaryPreferred');
          assert.ok(Array.isArray(query.options.readPreference.tags));
          assert.equal(query.options.readPreference.tags[0].dc, 'sf');
          assert.equal(query.options.readPreference.tags[0].s, 1);
          assert.equal(query.options.readPreference.tags[1].dc, 'jp');
          assert.equal(query.options.readPreference.tags[1].s, 2);
          done();
        });
      });

      describe('inherits its models schema read option', function() {
        let schema, M, called;
        before(function() {
          schema = new Schema({}, {read: 'p'});
          M = mongoose.model('schemaOptionReadPrefWithQuery', schema);
        });

        it('if not set in query', function(done) {
          const options = M.where()._optionsForExec(M);
          assert.ok(options.readPreference instanceof P);
          assert.equal(options.readPreference.mode, 'primary');
          done();
        });

        it('if set in query', function(done) {
          const options = M.where().read('s')._optionsForExec(M);
          assert.ok(options.readPreference instanceof P);
          assert.equal(options.readPreference.mode, 'secondary');
          done();
        });

        it('and sends it though the driver', function(done) {
          const options = {read: 'secondary', safe: {w: 'majority'}};
          const schema = new Schema({name: String}, options);
          const M = db.model(random(), schema);
          const q = M.find();

          // stub the internal query options call
          const getopts = q._optionsForExec;
          q._optionsForExec = function(model) {
            q._optionsForExec = getopts;

            const ret = getopts.call(this, model);

            assert.ok(ret.readPreference);
            assert.equal(ret.readPreference.mode, 'secondary');
            assert.deepEqual({w: 'majority'}, ret.safe);
            called = true;

            return ret;
          };

          q.exec(function(err) {
            if (err) {
              return done(err);
            }
            assert.ok(called);
            done();
          });
        });
      });

      describe('useNestedStrict', function() {
        it('overrides schema useNestedStrict: false (gh-5144)', function() {
          const subSchema = new Schema({}, { strict: false });
          const schema = new Schema({
            name: String,
            nested: subSchema
          }, { strict: 'throw' });

          const Test = db.model('gh5144', schema);
          const test = new Test({ name: 'Test1' });
          return co(function*() {
            yield test.save();
            const cond = { _id: test._id };
            const update = { 'nested.v': 'xyz' };
            const opts = { new: true, useNestedStrict: true };
            const doc = yield Test.findOneAndUpdate(cond, update, opts);
            assert.strictEqual(doc.toObject().nested.v, 'xyz');
          });
        });

        it('overrides schema useNestedStrict: true (gh-5144)', function() {
          const subSchema = new Schema({}, { strict: false });
          const schema = new Schema({
            name: String,
            nested: subSchema
          }, { strict: 'throw', useNestedStrict: true });

          const Test = db.model('gh5144_2', schema);
          const test = new Test({ name: 'Test1' });
          return co(function* () {
            yield test.save();
            const cond = { _id: test._id };
            const update = { 'nested.v': 'xyz' };
            const opts = { useNestedStrict: false };
            let error;
            yield Test.findOneAndUpdate(cond, update, opts).catch(e => error = e);
            assert.strictEqual(error.name, 'StrictModeError');
          });
        });
      });
    });
  });

  describe('setOptions', function() {
    it('works', function(done) {
      const q = new Query;
      q.setOptions({thing: 'cat'});
      q.setOptions({populate: ['fans']});
      q.setOptions({batchSize: 10});
      q.setOptions({limit: 4});
      q.setOptions({skip: 3});
      q.setOptions({sort: '-blah'});
      q.setOptions({sort: {woot: -1}});
      q.setOptions({hint: {index1: 1, index2: -1}});
      q.setOptions({read: ['s', [{dc: 'eu'}]]});

      assert.equal(q.options.thing, 'cat');
      assert.deepEqual(q._mongooseOptions.populate.fans, {path: 'fans', _docs: {}});
      assert.equal(q.options.batchSize, 10);
      assert.equal(q.options.limit, 4);
      assert.equal(q.options.skip, 3);
      assert.equal(Object.keys(q.options.sort).length, 2);
      assert.equal(q.options.sort.blah, -1);
      assert.equal(q.options.sort.woot, -1);
      assert.equal(q.options.hint.index1, 1);
      assert.equal(q.options.hint.index2, -1);
      assert.equal(q.options.readPreference.mode, 'secondary');
      assert.equal(q.options.readPreference.tags[0].dc, 'eu');

      const Product = db.model('Product', 'Product_setOptions_test');
      Product.create(
        {numbers: [3, 4, 5]},
        {strings: 'hi there'.split(' ')}, function(err, doc1, doc2) {
          assert.ifError(err);
          Product.find().setOptions({limit: 1, sort: {_id: -1}, read: 'n'}).exec(function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 1);
            assert.equal(docs[0].id, doc2.id);
            done();
          });
        });
    });

    it('populate as array in options (gh-4446)', function(done) {
      const q = new Query;
      q.setOptions({ populate: [{ path: 'path1' }, { path: 'path2' }] });
      assert.deepEqual(Object.keys(q._mongooseOptions.populate),
        ['path1', 'path2']);
      done();
    });
  });

  describe('getOptions', function() {
    const q = new Query;
    q.limit(10);
    q.setOptions({ maxTimeMS: 1000 });
    const opts = q.getOptions();

    // does not use assert.deepEqual() because setOptions may alter the options internally
    assert.strictEqual(opts.limit, 10);
    assert.strictEqual(opts.maxTimeMS, 1000);
  });

  describe('update', function() {
    it('when empty, nothing is run', function(done) {
      const q = new Query;
      assert.equal(false, !!q._castUpdate({}));
      done();
    });
  });

  describe('bug fixes', function() {
    describe('collations', function() {
      before(function(done) {
        const _this = this;
        start.mongodVersion(function(err, version) {
          if (err) {
            return done(err);
          }
          const mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
          if (!mongo34) {
            return _this.skip();
          }

          done();
        });
      });

      it('collation support (gh-4839)', function(done) {
        const schema = new Schema({
          name: String
        });

        const MyModel = db.model('gh4839', schema);
        const collation = { locale: 'en_US', strength: 1 };

        MyModel.create([{ name: 'a' }, { name: 'A' }]).
          then(function() {
            return MyModel.find({ name: 'a' }).collation(collation);
          }).
          then(function(docs) {
            assert.equal(docs.length, 2);
            return MyModel.find({ name: 'a' }, null, { collation: collation });
          }).
          then(function(docs) {
            assert.equal(docs.length, 2);
            return MyModel.find({ name: 'a' }, null, { collation: collation }).
              sort({ _id: -1 }).
              cursor().
              next();
          }).
          then(function(doc) {
            assert.equal(doc.name, 'A');
            return MyModel.find({ name: 'a' });
          }).
          then(function(docs) {
            assert.equal(docs.length, 1);
            done();
          }).
          catch(done);
      });

      it('set on schema (gh-5295)', function(done) {
        const schema = new Schema({
          name: String
        }, { collation: { locale: 'en_US', strength: 1 } });

        const MyModel = db.model('gh5295', schema);

        MyModel.create([{ name: 'a' }, { name: 'A' }]).
          then(function() {
            return MyModel.find({ name: 'a' });
          }).
          then(function(docs) {
            assert.equal(docs.length, 2);
            done();
          }).
          catch(done);
      });
    });

    describe('gh-1950', function() {
      it.skip('ignores sort when passed to count', function(done) {
        const Product = db.model('Product', 'Product_setOptions_test');
        Product.find().sort({_id: 1}).count({}).exec(function(error) {
          assert.ifError(error);
          done();
        });
      });

      it('ignores sort when passed to countDocuments', function() {
        const Product = db.model('Product', 'Product_setOptions_test');
        return Product.create({}).
          then(() => Product.find().sort({_id: 1}).countDocuments({}).exec());
      });

      it.skip('ignores count when passed to sort', function(done) {
        const Product = db.model('Product', 'Product_setOptions_test');
        Product.find().count({}).sort({_id: 1}).exec(function(error) {
          assert.ifError(error);
          done();
        });
      });
    });

    it('excludes _id when select false and inclusive mode (gh-3010)', function(done) {
      const User = db.model('gh3010', {
        _id: {
          select: false,
          type: Schema.Types.ObjectId,
          default: mongoose.Types.ObjectId
        },
        username: String
      });

      User.create({username: 'Val'}, function(error, user) {
        assert.ifError(error);
        User.find({_id: user._id}).select('username').exec(function(error, users) {
          assert.ifError(error);
          assert.equal(users.length, 1);
          assert.ok(!users[0]._id);
          assert.equal(users[0].username, 'Val');
          done();
        });
      });
    });

    it('doesnt reverse key order for update docs (gh-3215)', function(done) {
      const Test = db.model('gh3215', {
        arr: [{date: Date, value: Number}]
      });

      const q = Test.updateOne({}, {
        $push: {
          arr: {
            $each: [{date: new Date(), value: 1}],
            $sort: {value: -1, date: -1}
          }
        }
      });

      assert.deepEqual(Object.keys(q.getUpdate().$push.arr.$sort),
        ['value', 'date']);
      done();
    });

    it('timestamps with $each (gh-4805)', function(done) {
      const nestedSchema = new Schema({ value: Number }, { timestamps: true });
      const Test = db.model('gh4805', new Schema({
        arr: [nestedSchema]
      }, { timestamps: true }));

      Test.updateOne({}, {
        $push: {
          arr: {
            $each: [{ value: 1 }]
          }
        }
      }).exec(function(error) {
        assert.ifError(error);
        done();
      });
    });

    it.skip('allows sort with count (gh-3914)', function(done) {
      const Post = db.model('gh3914_0', {
        title: String
      });

      Post.count({}).sort({ title: 1 }).exec(function(error, count) {
        assert.ifError(error);
        assert.strictEqual(count, 0);
        done();
      });
    });

    it.skip('allows sort with select (gh-3914)', function(done) {
      const Post = db.model('gh3914_1', {
        title: String
      });

      Post.count({}).select({ _id: 0 }).exec(function(error, count) {
        assert.ifError(error);
        assert.strictEqual(count, 0);
        done();
      });
    });

    it('handles nested $ (gh-3265)', function(done) {
      const Post = db.model('gh3265', {
        title: String,
        answers: [{
          details: String,
          stats: {
            votes: Number,
            count: Number
          }
        }]
      });

      const answersUpdate = {details: 'blah', stats: {votes: 1, count: '3'}};
      const q = Post.updateOne(
        {'answers._id': '507f1f77bcf86cd799439011'},
        {$set: {'answers.$': answersUpdate}});

      assert.deepEqual(q.getUpdate().$set['answers.$'].stats,
        { votes: 1, count: 3 });
      done();
    });

    it('$geoWithin with single nested schemas (gh-4044)', function(done) {
      const locationSchema = new Schema({
        type: { type: String },
        coordinates: []
      }, { _id:false });

      const schema = new Schema({
        title : String,
        location: { type: locationSchema, required: true }
      });
      schema.index({ location: '2dsphere' });

      const Model = db.model('gh4044', schema);

      const query = {
        location:{
          $geoWithin:{
            $geometry:{
              type: 'Polygon',
              coordinates: [[[-1,0],[-1,3],[4,3],[4,0],[-1,0]]]
            }
          }
        }
      };
      Model.find(query, function(error) {
        assert.ifError(error);
        done();
      });
    });

    it('setDefaultsOnInsert with empty update (gh-3825)', function(done) {
      const schema = new mongoose.Schema({
        test: { type: Number, default: 8472 },
        name: String
      });

      const MyModel = db.model('gh3825', schema);

      const opts = { setDefaultsOnInsert: true, upsert: true };
      MyModel.updateOne({}, {}, opts, function(error) {
        assert.ifError(error);
        MyModel.findOne({}, function(error, doc) {
          assert.ifError(error);
          assert.ok(doc);
          assert.strictEqual(doc.test, 8472);
          assert.ok(!doc.name);
          done();
        });
      });
    });

    it('custom query methods (gh-3714)', function(done) {
      const schema = new mongoose.Schema({
        name: String
      });

      schema.query.byName = function(name) {
        return this.find({ name: name });
      };

      const MyModel = db.model('gh3714', schema);

      MyModel.create({ name: 'Val' }, function(error) {
        assert.ifError(error);
        MyModel.find().byName('Val').exec(function(error, docs) {
          assert.ifError(error);
          assert.equal(docs.length, 1);
          assert.equal(docs[0].name, 'Val');
          done();
        });
      });
    });

    it('string as input (gh-4378)', function(done) {
      const schema = new mongoose.Schema({
        name: String
      });

      const MyModel = db.model('gh4378', schema);

      MyModel.findOne('', function(error) {
        assert.ok(error);
        assert.equal(error.name, 'ObjectParameterError');
        done();
      });
    });

    it('handles geoWithin with $center and mongoose object (gh-4419)', function(done) {
      const areaSchema = new Schema({
        name: String,
        circle: Array
      });
      const Area = db.model('gh4419', areaSchema);

      const placeSchema = new Schema({
        name: String,
        geometry: {
          type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
          },
          coordinates: { type: [Number] }
        }
      });
      placeSchema.index({ geometry: '2dsphere' });
      const Place = db.model('gh4419_0', placeSchema);

      const tromso = new Area({
        name: 'Tromso, Norway',
        circle: [[18.89, 69.62], 10 / 3963.2]
      });
      tromso.save(function(error) {
        assert.ifError(error);

        const airport = {
          name: 'Center',
          geometry: {
            type: 'Point',
            coordinates: [18.895, 69.67]
          }
        };
        Place.create(airport, function(error) {
          assert.ifError(error);
          const q = {
            geometry: {
              $geoWithin: {
                $centerSphere: tromso.circle
              }
            }
          };
          Place.find(q).exec(function(error, docs) {
            assert.ifError(error);
            assert.equal(docs.length, 1);
            assert.equal(docs[0].name, 'Center');
            done();
          });
        });
      });
    });

    it('$not with objects (gh-4495)', function(done) {
      const schema = new Schema({
        createdAt: Date
      });

      const M = db.model('gh4495', schema);
      const q = M.find({
        createdAt:{
          $not:{
            $gte: '2016/09/02 00:00:00',
            $lte: '2016/09/02 23:59:59'
          }
        }
      });
      q._castConditions();

      assert.ok(q._conditions.createdAt.$not.$gte instanceof Date);
      assert.ok(q._conditions.createdAt.$not.$lte instanceof Date);
      done();
    });

    it('geoIntersects with mongoose doc as coords (gh-4408)', function(done) {
      const lineStringSchema = new Schema({
        name: String,
        geo: {
          type: { type: String, default: 'LineString' },
          coordinates: [[Number]]
        }
      });

      const LineString = db.model('gh4408', lineStringSchema);

      const ls = {
        name: 'test',
        geo: {
          coordinates: [ [14.59, 24.847], [28.477, 15.961] ]
        }
      };
      const ls2 = {
        name: 'test2',
        geo: {
          coordinates: [ [27.528, 25.006], [14.063, 15.591] ]
        }
      };
      LineString.create(ls, ls2, function(error, ls1) {
        assert.ifError(error);
        const query = {
          geo: {
            $geoIntersects: {
              $geometry: {
                type: 'LineString',
                coordinates: ls1.geo.coordinates
              }
            }
          }
        };
        LineString.find(query, function(error, results) {
          assert.ifError(error);
          assert.equal(results.length, 2);
          done();
        });
      });
    });

    it('string with $not (gh-4592)', function(done) {
      const TestSchema = new Schema({
        test: String
      });

      const Test = db.model('gh4592', TestSchema);

      Test.findOne({ test: { $not: /test/ } }, function(error) {
        assert.ifError(error);
        done();
      });
    });

    it('does not cast undefined to null in mongoose (gh-6236)', function() {
      return co(function*() {
        const TestSchema = new Schema({
          test: String
        });

        const Test = db.model('gh6236', TestSchema);

        yield Test.create({});

        const q = Test.find({ test: void 0 });
        const res = yield q.exec();

        assert.strictEqual(q.getFilter().test, void 0);
        assert.ok('test' in q.getFilter());
        assert.equal(res.length, 1);
      });
    });

    it('runs query setters with _id field (gh-5351)', function(done) {
      const testSchema = new Schema({
        val: { type: String }
      });

      const Test = db.model('gh5351', testSchema);
      Test.create({ val: 'A string' }).
        then(function() {
          return Test.findOne({});
        }).
        then(function(doc) {
          return Test.findOneAndUpdate({_id: doc._id}, {
            $set: {
              val: 'another string'
            }
          }, { new: true });
        }).
        then(function(doc) {
          assert.ok(doc);
          assert.equal(doc.val, 'another string');
        }).
        then(done).
        catch(done);
    });

    it('runs setters if query field is an array (gh-6277)', function() {
      const setterCalled = [];

      const schema = new Schema({
        strings: {
          type: [String],
          set: v => {
            setterCalled.push(v);
            return v;
          }
        }
      });
      const Model = db.model('gh6277', schema);

      return co(function*() {
        yield Model.find({ strings: 'test' });
        assert.equal(setterCalled.length, 0);

        yield Model.find({ strings: ['test'] });
        assert.equal(setterCalled.length, 1);
        assert.deepEqual(setterCalled, [['test']]);
      });
    });

    it('$exists under $not (gh-4933)', function(done) {
      const TestSchema = new Schema({
        test: String
      });

      const Test = db.model('gh4933', TestSchema);

      Test.findOne({ test: { $not: { $exists: true } } }, function(error) {
        assert.ifError(error);
        done();
      });
    });

    it('geojson underneath array (gh-5467)', function(done) {
      const storySchema = new Schema({
        name: String,
        gallery: [{
          src: String,
          location: {
            type: { type: String, enum: ['Point'] },
            coordinates: { type: [Number], default: void 0 }
          },
          timestamp: Date
        }]
      });
      storySchema.index({ 'gallery.location': '2dsphere' });

      const Story = db.model('gh5467', storySchema);

      const q = {
        'gallery.location': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [51.53377166666667, -0.1197471666666667]
            },
            $maxDistance: 500
          }
        }
      };
      Story.once('index', function(error) {
        assert.ifError(error);
        Story.updateOne(q, { name: 'test' }, { upsert: true }, function(error) {
          assert.ifError(error);
          done();
        });
      });
    });

    it('slice respects schema projections (gh-5450)', function(done) {
      const gameSchema = Schema({
        name: String,
        developer: {
          type: String,
          select: false
        },
        arr: [Number]
      });
      const Game = db.model('gh5450', gameSchema);

      Game.create({ name: 'Mass Effect', developer: 'BioWare', arr: [1, 2, 3] }, function(error) {
        assert.ifError(error);
        Game.findOne({ name: 'Mass Effect' }).slice({ arr: 1 }).exec(function(error, doc) {
          assert.ifError(error);
          assert.equal(doc.name, 'Mass Effect');
          assert.deepEqual(doc.toObject().arr, [1]);
          assert.ok(!doc.developer);
          done();
        });
      });
    });

    it('overwrites when passing an object when path already set to primitive (gh-6097)', function() {
      const schema = new mongoose.Schema({ status: String });

      const Model = db.model('gh6097', schema);

      return Model.
        where({ status: 'approved' }).
        where({ status: { $ne: 'delayed' } });
    });

    it('$exists for arrays and embedded docs (gh-4937)', function(done) {
      const subSchema = new Schema({
        name: String
      });
      const TestSchema = new Schema({
        test: [String],
        sub: subSchema
      });

      const Test = db.model('gh4937', TestSchema);

      const q = { test: { $exists: true }, sub: { $exists: false } };
      Test.findOne(q, function(error) {
        assert.ifError(error);
        done();
      });
    });

    it('report error in pre hook (gh-5520)', function(done) {
      const TestSchema = new Schema({ name: String });

      const ops = [
        'count',
        'find',
        'findOne',
        'findOneAndRemove',
        'findOneAndUpdate',
        'replaceOne',
        'update',
        'updateOne',
        'updateMany'
      ];

      ops.forEach(function(op) {
        TestSchema.pre(op, function(next) {
          this.error(new Error(op + ' error'));
          next();
        });
      });

      const TestModel = db.model('gh5520', TestSchema);

      let numOps = ops.length;

      ops.forEach(function(op) {
        TestModel.find({}).updateOne({ name: 'test' })[op](function(error) {
          assert.ok(error);
          assert.equal(error.message, op + ' error');
          --numOps || done();
        });
      });
    });

    it('cast error with custom error (gh-5520)', function(done) {
      const TestSchema = new Schema({ name: Number });

      const TestModel = db.model('gh5520_0', TestSchema);

      TestModel.
        find({ name: 'not a number' }).
        error(new Error('woops')).
        exec(function(error) {
          assert.ok(error);
          // CastError check happens **after** `.error()`
          assert.equal(error.name, 'CastError');
          done();
        });
    });

    it('change deleteOne to updateOne for soft deletes using $isDeleted (gh-4428)', function(done) {
      const schema = new mongoose.Schema({
        name: String,
        isDeleted: Boolean
      });

      schema.pre('remove', function(next) {
        const _this = this;
        this.constructor.updateOne({ isDeleted: true }, function(error) {
          // Force mongoose to consider this doc as deleted.
          _this.$isDeleted(true);
          next(error);
        });
      });

      const M = db.model('gh4428', schema);

      M.create({ name: 'test' }, function(error, doc) {
        assert.ifError(error);
        doc.remove(function(error) {
          assert.ifError(error);
          M.findById(doc._id, function(error, doc) {
            assert.ifError(error);
            assert.ok(doc);
            assert.equal(doc.isDeleted, true);
            done();
          });
        });
      });
    });

    it('child schema with select: false in multiple paths (gh-5603)', function(done) {
      const ChildSchema = new mongoose.Schema({
        field: {
          type: String,
          select: false
        },
        _id: false
      }, { id: false });

      const ParentSchema = new mongoose.Schema({
        child: ChildSchema,
        child2: ChildSchema
      });
      const Parent = db.model('gh5603', ParentSchema);
      const ogParent = new Parent();
      ogParent.child = { field: 'test' };
      ogParent.child2 = { field: 'test' };
      ogParent.save(function(error) {
        assert.ifError(error);
        Parent.findById(ogParent._id).exec(function(error, doc) {
          assert.ifError(error);
          assert.ok(!doc.child.field);
          assert.ok(!doc.child2.field);
          done();
        });
      });
    });

    it('errors in post init (gh-5592)', function(done) {
      const TestSchema = new Schema();

      let count = 0;
      TestSchema.post('init', function() {
        throw new Error('Failed! ' + (count++));
      });

      const TestModel = db.model('gh5592', TestSchema);

      const docs = [];
      for (let i = 0; i < 10; ++i) {
        docs.push({});
      }

      TestModel.create(docs, function(error) {
        assert.ifError(error);
        TestModel.find({}, function(error) {
          assert.ok(error);
          assert.equal(error.message, 'Failed! 0');
          assert.equal(count, 10);
          done();
        });
      });
    });

    it('with non-object args (gh-1698)', function(done) {
      const schema = new mongoose.Schema({
        email: String
      });
      const M = db.model('gh1698', schema);

      M.find(42, function(error) {
        assert.ok(error);
        assert.equal(error.name, 'ObjectParameterError');
        done();
      });
    });

    describe('throw', function() {
      let listeners;

      beforeEach(function() {
        listeners = process.listeners('uncaughtException');
        process.removeAllListeners('uncaughtException');
      });

      afterEach(function() {
        process.on('uncaughtException', listeners[0]);
      });

      it('throw on sync exceptions in callbacks (gh-6178)', function(done) {
        const async = require('async');
        const schema = new Schema({});
        const Test = db.model('gh6178', schema);

        process.once('uncaughtException', err => {
          assert.equal(err.message, 'woops');
          done();
        });

        async.waterfall([
          function(cb) {
            Test.create({}, cb);
          },
          function(res, cb) {
            Test.find({}, function() { cb(); });
          },
          function() {
            throw new Error('woops');
          }
        ], function() {
          assert.ok(false);
        });
      });
    });

    it.skip('set overwrite after update() (gh-4740)', function() {
      const schema = new Schema({ name: String, age: Number });
      const User = db.model('4740', schema);

      return co(function*() {
        yield User.create({ name: 'Bar', age: 29 });

        yield User.where({ name: 'Bar' }).
          update({ name: 'Baz' }).
          setOptions({ overwrite: true });

        const doc = yield User.findOne();
        assert.equal(doc.name, 'Baz');
        assert.ok(!doc.age);
      });
    });

    it('queries with BSON overflow (gh-5812)', function(done) {
      this.timeout(10000);

      const schema = new mongoose.Schema({
        email: String
      });

      const model = db.model('gh5812', schema);
      const bigData = new Array(800000);

      for (let i = 0; i < bigData.length; ++i) {
        bigData[i] = 'test1234567890';
      }

      model.find({email: {$in: bigData}}).lean().
        then(function() {
          done(new Error('Expected an error'));
        }).
        catch(function(error) {
          assert.ok(error);
          assert.ok(error.message !== 'Expected error');
          done();
        });
    });

    it('consistently return query when callback specified (gh-6271)', function(done) {
      const schema = new mongoose.Schema({
        n: Number
      });

      const Model = db.model('gh6271', schema);

      Model.create({ n: 0 }, (err, doc) => {
        assert.ifError(err);

        const updateQuery = Model.findOneAndUpdate({ _id: doc._id }, { $inc: { n: 1 } }, { new: true }, (err, doc) => {
          assert.ifError(err);
          assert.equal(doc.n, 1);
          done();
        });
        assert.ok(updateQuery instanceof Query);
      });
    });

    it('explain() (gh-6625)', function() {
      return co(function*() {
        const schema = new mongoose.Schema({ n: Number });

        const Model = db.model('gh6625', schema);

        yield Model.create({ n: 42 });

        let res = yield Model.find().explain('queryPlanner');
        assert.ok(res[0].queryPlanner);

        res = yield Model.find().explain();
        assert.ok(res[0].queryPlanner);

        res = yield Model.find().explain().explain(false);
        assert.equal(res[0].n, 42);
      });
    });

    it('cast embedded discriminators with dot notation (gh-6027)', function() {
      return co(function*() {
        const ownerSchema = new Schema({
          _id: false
        }, {
          discriminatorKey: 'type'
        });

        const userOwnerSchema = new Schema({
          id: {type: Schema.Types.ObjectId, required: true}
        }, { _id: false });

        const tagOwnerSchema = new Schema({
          id: {type: String, required: true}
        }, { _id: false });

        const activitySchema = new Schema({
          owner: {type: ownerSchema, required: true}
        }, { _id: false });

        activitySchema.path('owner').discriminator('user', userOwnerSchema);
        activitySchema.path('owner').discriminator('tag', tagOwnerSchema);

        const Activity = db.model('gh6027', activitySchema);

        yield Activity.insertMany([
          {
            owner: {
              id: '5a042f742a91c1db447534d5',
              type: 'user'
            }
          },
          {
            owner: {
              id: 'asdf',
              type: 'tag'
            }
          }
        ]);

        const activity = yield Activity.findOne({
          'owner.type': 'user',
          'owner.id': '5a042f742a91c1db447534d5'
        });
        assert.ok(activity);
        assert.equal(activity.owner.type, 'user');
      });
    });

    it('cast embedded discriminators with embedded obj (gh-6027)', function() {
      return co(function*() {
        const ownerSchema = new Schema({
          _id: false
        }, {
          discriminatorKey: 'type'
        });

        const userOwnerSchema = new Schema({
          id: {type: Schema.Types.ObjectId, required: true}
        }, { _id: false });

        const tagOwnerSchema = new Schema({
          id: {type: String, required: true}
        }, { _id: false });

        const activitySchema = new Schema({
          owner: {type: ownerSchema, required: true}
        }, { _id: false });

        activitySchema.path('owner').discriminator('user', userOwnerSchema);
        activitySchema.path('owner').discriminator('tag', tagOwnerSchema);

        const Activity = db.model('gh6027_0', activitySchema);

        yield Activity.insertMany([
          {
            owner: {
              id  : '5a042f742a91c1db447534d5',
              type: 'user'
            }
          },
          {
            owner: {
              id  : 'asdf',
              type: 'tag'
            }
          }
        ]);

        const activity = yield Activity.findOne({
          owner: {
            type: 'user',
            id: '5a042f742a91c1db447534d5'
          }
        });
        assert.ok(activity);
        assert.equal(activity.owner.type, 'user');
      });
    });

    it('cast embedded discriminators with $elemMatch discriminator key (gh-7449)', function() {
      return co(function*() {
        const ListingLineSchema = new Schema({
          sellerId: Number
        });

        const OrderSchema = new Schema({
          lines: [new Schema({
            amount: Number,
          }, { discriminatorKey: 'kind' })]
        });

        OrderSchema.path('lines').discriminator('listing', ListingLineSchema);

        const Order = db.model('gh7449', OrderSchema);

        yield Order.create({ lines: { kind: 'listing', sellerId: 42 } });

        let count = yield Order.countDocuments({
          lines: { $elemMatch: { kind: 'listing', sellerId: '42' } }
        });
        assert.strictEqual(count, 1);

        count = yield Order.countDocuments({
          lines: { $elemMatch: { sellerId: '42' } }
        });
        assert.strictEqual(count, 0);
      });
    });

    it('handles geoWithin with mongoose docs (gh-4392)', function(done) {
      const areaSchema = new Schema({
        name: {type: String},
        loc: {
          type: {
            type: String,
            enum: ['Polygon'],
            default: 'Polygon'
          },
          coordinates: [[[Number]]]
        }
      });

      const Area = db.model('gh4392_0', areaSchema);

      const observationSchema = new Schema({
        geometry: {
          type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
          },
          coordinates: { type: [Number] }
        },
        properties: {
          temperature: { type: Number }
        }
      });
      observationSchema.index({ geometry: '2dsphere' });

      const Observation = db.model('gh4392_1', observationSchema);

      Observation.on('index', function(error) {
        assert.ifError(error);
        const tromso = new Area({
          name: 'Tromso, Norway',
          loc: {
            type: 'Polygon',
            coordinates: [[
              [18.89, 69.62],
              [18.89, 69.72],
              [19.03, 69.72],
              [19.03, 69.62],
              [18.89, 69.62]
            ]]
          }
        });
        tromso.save(function(error) {
          assert.ifError(error);
          const observation = {
            geometry: {
              type: 'Point',
              coordinates: [18.895, 69.67]
            }
          };
          Observation.create(observation, function(error) {
            assert.ifError(error);

            Observation.
              find().
              where('geometry').within().geometry(tromso.loc).
              exec(function(error, docs) {
                assert.ifError(error);
                assert.equal(docs.length, 1);
                done();
              });
          });
        });
      });
    });
  });

  describe('handles falsy and object projections with defaults (gh-3256)', function() {
    let MyModel;

    before(function(done) {
      const PersonSchema = new Schema({
        name: String,
        lastName: String,
        dependents: [String]
      });

      const m = db.model('gh3256', PersonSchema, 'gh3256');

      const obj = {
        name: 'John',
        lastName: 'Doe',
        dependents: ['Jake', 'Jill', 'Jane']
      };
      m.create(obj, function(error) {
        assert.ifError(error);

        const PersonSchema = new Schema({
          name: String,
          lastName: String,
          dependents: [String],
          salary: {type: Number, default: 25000}
        });

        MyModel = db.model('gh3256-salary', PersonSchema, 'gh3256');

        done();
      });
    });

    it('falsy projection', function(done) {
      MyModel.findOne({name: 'John'}, {lastName: false}).
        exec(function(error, person) {
          assert.ifError(error);
          assert.equal(person.salary, 25000);
          done();
        });
    });

    it('slice projection', function(done) {
      MyModel.findOne({name: 'John'}, {dependents: {$slice: 1}}).exec(function(error, person) {
        assert.ifError(error);
        assert.equal(person.salary, 25000);
        done();
      });
    });

    it('empty projection', function(done) {
      MyModel.findOne({name: 'John'}, {}).
        exec(function(error, person) {
          assert.ifError(error);
          assert.equal(person.salary, 25000);
          done();
        });
    });
  });

  describe('count', function() {
    it('calls utils.toObject on conditions (gh-6323)', function() {
      return co(function* () {
        const priceSchema = new Schema({
          key: String,
          price: Number
        });

        const Model = db.model('gh6323', priceSchema);

        const tests = [];

        for (let i = 0; i < 10; i++) {
          const p = i * 25;
          tests.push(new Model({ key: 'value', price: p }));
        }

        const query = { key: 'value' };

        const priceQuery = Object.create(null);

        priceQuery.$gte = 0;
        priceQuery.$lte = 200;

        Object.assign(query, { price: priceQuery });

        yield Model.create(tests);
        const count = yield Model.countDocuments(query);
        assert.strictEqual(count, 9);
      });
    });
  });

  describe('setQuery', function() {
    it('replaces existing query with new value (gh-6854)', function() {
      const q = new Query({}, {}, null, p1.collection);
      q.where('userName').exists();
      q.setQuery({ a: 1 });
      assert.deepStrictEqual(q._conditions, { a: 1 });
    });
  });

  it('map (gh-7142)', function() {
    const Model = db.model('gh7142', new Schema({ name: String }));

    return co(function*() {
      yield Model.create({ name: 'test' });
      const now = new Date();
      const res = yield Model.findOne().map(res => {
        res.loadedAt = now;
        return res;
      });

      assert.equal(res.loadedAt, now);
    });
  });

  describe('orFail (gh-6841)', function() {
    let Model;

    before(function() {
      Model = db.model('gh6841', new Schema({ name: String }));
    });

    beforeEach(function() {
      return Model.deleteMany({}).then(() => Model.create({ name: 'Test' }));
    });

    it('find()', function() {
      return co(function*() {
        let threw = false;
        try {
          yield Model.find({ name: 'na' }).orFail(() => new Error('Oops!'));
        } catch (error) {
          assert.ok(error);
          assert.equal(error.message, 'Oops!');
          threw = true;
        }
        assert.ok(threw);

        // Shouldn't throw
        const res = yield Model.find({ name: 'Test' }).orFail(new Error('Oops'));
        assert.equal(res[0].name, 'Test');
      });
    });

    it('findOne()', function() {
      return co(function*() {
        let threw = false;
        try {
          yield Model.findOne({ name: 'na' }).orFail(() => new Error('Oops!'));
        } catch (error) {
          assert.ok(error);
          assert.equal(error.message, 'Oops!');
          threw = true;
        }
        assert.ok(threw);

        // Shouldn't throw
        const res = yield Model.findOne({ name: 'Test' }).orFail(new Error('Oops'));
        assert.equal(res.name, 'Test');
      });
    });

    it('deleteMany()', function() {
      return co(function*() {
        let threw = false;
        try {
          yield Model.deleteMany({ name: 'na' }).orFail(new Error('Oops!'));
        } catch (error) {
          assert.ok(error);
          assert.equal(error.message, 'Oops!');
          threw = true;
        }
        assert.ok(threw);

        // Shouldn't throw
        const res = yield Model.deleteMany({ name: 'Test' }).orFail(new Error('Oops'));
        assert.equal(res.n, 1);
      });
    });

    it('deleteOne()', function() {
      return co(function*() {
        let threw = false;
        try {
          yield Model.deleteOne({ name: 'na' }).orFail(new Error('Oops!'));
        } catch (error) {
          assert.ok(error);
          assert.equal(error.message, 'Oops!');
          threw = true;
        }
        assert.ok(threw);

        // Shouldn't throw
        const res = yield Model.deleteOne({ name: 'Test' }).orFail(new Error('Oops'));
        assert.equal(res.n, 1);
      });
    });

    it('remove()', function() {
      return co(function*() {
        let threw = false;
        try {
          yield Model.remove({ name: 'na' }).orFail(new Error('Oops!'));
        } catch (error) {
          assert.ok(error);
          assert.equal(error.message, 'Oops!');
          threw = true;
        }
        assert.ok(threw);

        // Shouldn't throw
        const res = yield Model.remove({ name: 'Test' }).orFail(new Error('Oops'));
        assert.equal(res.n, 1);
      });
    });

    it('update()', function() {
      return co(function*() {
        let threw = false;
        try {
          yield Model.update({ name: 'na' }, { name: 'foo' }).
            orFail(new Error('Oops!'));
        } catch (error) {
          assert.ok(error);
          assert.equal(error.message, 'Oops!');
          threw = true;
        }
        assert.ok(threw);

        // Shouldn't throw
        const res = yield Model.update({}, { name: 'Test2' }).orFail(new Error('Oops'));
        assert.equal(res.n, 1);
      });
    });

    it('updateMany()', function() {
      return co(function*() {
        let threw = false;
        try {
          yield Model.updateMany({ name: 'na' }, { name: 'foo' }).
            orFail(new Error('Oops!'));
        } catch (error) {
          assert.ok(error);
          assert.equal(error.message, 'Oops!');
          threw = true;
        }
        assert.ok(threw);

        // Shouldn't throw
        const res = yield Model.updateMany({}, { name: 'Test2' }).orFail(new Error('Oops'));
        assert.equal(res.n, 1);
      });
    });

    it('updateOne()', function() {
      return co(function*() {
        let threw = false;
        try {
          yield Model.updateOne({ name: 'na' }, { name: 'foo' }).
            orFail(new Error('Oops!'));
        } catch (error) {
          assert.ok(error);
          assert.equal(error.message, 'Oops!');
          threw = true;
        }
        assert.ok(threw);

        // Shouldn't throw
        const res = yield Model.updateOne({}, { name: 'Test2' }).orFail(new Error('Oops'));
        assert.equal(res.n, 1);
      });
    });

    it('findOneAndUpdate()', function() {
      return co(function*() {
        let threw = false;
        try {
          yield Model.findOneAndUpdate({ name: 'na' }, { name: 'foo' }).
            orFail(new Error('Oops!'));
        } catch (error) {
          assert.ok(error);
          assert.equal(error.message, 'Oops!');
          threw = true;
        }
        assert.ok(threw);

        // Shouldn't throw
        const res = yield Model.findOneAndUpdate({}, { name: 'Test2' }).orFail(new Error('Oops'));
        assert.equal(res.name, 'Test');
      });
    });

    it('findOneAndDelete()', function() {
      return co(function*() {
        let threw = false;
        try {
          yield Model.findOneAndDelete({ name: 'na' }).
            orFail(new Error('Oops!'));
        } catch (error) {
          assert.ok(error);
          assert.equal(error.message, 'Oops!');
          threw = true;
        }
        assert.ok(threw);

        // Shouldn't throw
        const res = yield Model.findOneAndDelete({ name: 'Test' }).orFail(new Error('Oops'));
        assert.equal(res.name, 'Test');
      });
    });

    it('executes before post hooks (gh-7280)', function() {
      return co(function*() {
        const schema = new Schema({ name: String });
        const docs = [];
        schema.post('findOne', function(doc, next) {
          docs.push(doc);
          next();
        });
        const Model = db.model('gh7280', schema);

        yield Model.create({ name: 'Test' });

        let threw = false;
        try {
          yield Model.findOne({ name: 'na' }).orFail(new Error('Oops!'));
        } catch (error) {
          assert.ok(error);
          assert.equal(error.message, 'Oops!');
          threw = true;
        }
        assert.ok(threw);
        assert.equal(docs.length, 0);

        // Shouldn't throw
        const res = yield Model.findOne({ name: 'Test' }).orFail(new Error('Oops'));
        assert.equal(res.name, 'Test');
        assert.equal(docs.length, 1);
      });
    });

    it('throws DocumentNotFoundError by default (gh-7409)', function() {
      return co(function*() {
        const err = yield Model.findOne({ name: 'na' }).
          orFail().
          then(() => null, err => err);
        assert.equal(err.name, 'DocumentNotFoundError', err.stack);
        assert.ok(err.message.indexOf('na') !== -1, err.message);
        assert.ok(err.message.indexOf('gh6841') !== -1, err.message);
        assert.deepEqual(err.filter, { name: 'na' });
      });
    });
  });

  describe('getPopulatedPaths', function() {
    it('doesn\'t break on a query without population (gh-6677)', function() {
      const schema = new Schema({ name: String });
      schema.pre('findOne', function() {
        assert.deepStrictEqual(this.getPopulatedPaths(), []);
      });

      const Model = db.model('gh6677_model', schema);

      return co(function*() {
        yield Model.findOne({});
      });
    });

    it('returns an array of populated paths as strings (gh-6677)', function() {
      const otherSchema = new Schema({ name: String });
      const schema = new Schema({
        other: {
          type: Schema.Types.ObjectId,
          ref: 'gh6677_other'
        }
      });
      schema.pre('findOne', function() {
        assert.deepStrictEqual(this.getPopulatedPaths(), ['other']);
      });

      const Other = db.model('gh6677_other', otherSchema);
      const Test = db.model('gh6677_test', schema);

      const other = new Other({ name: 'one' });
      const test = new Test({ other: other._id });

      return co(function*() {
        yield other.save();
        yield test.save();
        yield Test.findOne({}).populate('other');
      });
    });

    it('returns deep populated paths (gh-7757)', function() {
      db.model('gh7757_L3', new Schema({ name: String }));
      db.model('gh7757_L2', new Schema({ level3: { type: String, ref: 'L3' } }));
      const L1 = db.model('gh7757_L1',
        new Schema({ level1: { type: String, ref: 'L2' } }));

      const query = L1.find().populate({
        path: 'level1',
        populate: {
          path: 'level2',
          populate: {
            path: 'level3'
          }
        }
      });

      assert.deepEqual(query.getPopulatedPaths(),
        ['level1', 'level1.level2', 'level1.level2.level3']);
    });
  });

  describe('setUpdate', function() {
    it('replaces existing update doc with new value', function() {
      const q = new Query({}, {}, null, p1.collection);
      q.set('testing', '123');
      q.setUpdate({ $set: { newPath: 'newValue' } });
      assert.strictEqual(q._update.$set.testing, undefined);
      assert.strictEqual(q._update.$set.newPath, 'newValue');
    });
  });

  describe('get() (gh-7312)', function() {
    it('works with using $set', function() {
      const q = new Query({}, {}, null, p1.collection);
      q.updateOne({}, { $set: { name: 'Jean-Luc Picard' } });

      assert.equal(q.get('name'), 'Jean-Luc Picard');
    });

    it('works with $set syntactic sugar', function() {
      const q = new Query({}, {}, null, p1.collection);
      q.updateOne({}, { name: 'Jean-Luc Picard' });

      assert.equal(q.get('name'), 'Jean-Luc Picard');
    });

    it('works with mixed', function() {
      const q = new Query({}, {}, null, p1.collection);
      q.updateOne({}, { name: 'Jean-Luc Picard', $set: { age: 59 } });

      assert.equal(q.get('name'), 'Jean-Luc Picard');
    });

    it('$set overwrites existing', function() {
      const M = db.model('gh7312', new Schema({ name: String }));
      const q = M.updateOne({}, {
        name: 'Jean-Luc Picard',
        $set: { name: 'William Riker' }
      }, { upsert: true });

      assert.equal(q.get('name'), 'Jean-Luc Picard');

      return q.exec().
        then(() => M.findOne()).
        then(doc => assert.equal(doc.name, 'Jean-Luc Picard'));
    });
  });

  it('allows skipping timestamps in updateOne() (gh-6980)', function() {
    const schema = new Schema({ name: String }, { timestamps: true });

    const M = db.model('gh6980', schema);

    return co(function*() {
      const doc = yield M.create({ name: 'foo' });
      assert.ok(doc.createdAt);
      assert.ok(doc.updatedAt);

      const start = Date.now();
      yield cb => setTimeout(cb, 10);

      const opts = { timestamps: false, new: true };
      const res = yield M.findOneAndUpdate({}, { name: 'bar' }, opts);

      assert.equal(res.name, 'bar');
      assert.ok(res.updatedAt.valueOf() <= start,
        `Expected ${res.updatedAt.valueOf()} <= ${start}`);
    });
  });

  it('increments timestamps for nested subdocs (gh-4412)', function() {
    const childSchema = new Schema({ name: String }, {
      timestamps: true,
      versionKey: false
    });
    const parentSchema = new Schema({ child: childSchema }, {
      // timestamps: true,
      versionKey: false
    });
    const Parent = db.model('gh4412', parentSchema);

    return co(function*() {
      let doc = yield Parent.create({ child: { name: 'foo' } });
      assert.ok(doc.child.updatedAt);
      assert.ok(doc.child.createdAt);

      let start = Date.now();
      yield cb => setTimeout(cb, 10);

      yield Parent.updateOne({}, { $set: { 'child.name': 'Luke' } });

      doc = yield Parent.findOne();

      let updatedAt = doc.child.updatedAt.valueOf();

      assert.ok(updatedAt > start, `Expected ${updatedAt} > ${start}`);

      // Overwrite whole doc
      start = Date.now();
      yield cb => setTimeout(cb, 10);

      yield Parent.updateOne({}, { $set: { child: { name: 'Luke' } } });

      doc = yield Parent.findOne();

      const createdAt = doc.child.createdAt.valueOf();
      updatedAt = doc.child.updatedAt.valueOf();

      assert.ok(createdAt > start, `Expected ${createdAt} > ${start}`);
      assert.ok(updatedAt > start, `Expected ${updatedAt} > ${start}`);
    });
  });

  describe('increments timestamps for arrays of nested subdocs (gh-4412)', function() {
    let Parent;

    before(function() {
      const childSchema = new Schema({ name: String }, {
        timestamps: true,
        versionKey: false
      });
      const parentSchema = new Schema({ children: [childSchema] }, {
        versionKey: false });
      Parent = db.model('gh4412_arr', parentSchema);
    });

    it('$set nested property with numeric position', function() {
      return co(function*() {
        const kids = 'foo bar baz'.split(' ').map(n => { return { name: `${n}`};});
        const doc = yield Parent.create({ children: kids });
        assert.ok(doc.children[0].updatedAt && doc.children[0].createdAt);
        assert.ok(doc.children[1].updatedAt && doc.children[1].createdAt);
        assert.ok(doc.children[2].updatedAt && doc.children[2].createdAt);

        const start = new Date();
        yield cb => setTimeout(cb, 10);

        const cond = {};
        const update = { $set: { 'children.0.name': 'Luke' } };
        yield Parent.updateOne(cond, update);

        const found = yield Parent.findOne({});
        const updatedAt = found.children[0].updatedAt;
        const name = found.children[0].name;
        assert.ok(name, 'Luke');
        assert.ok(updatedAt.valueOf() > start.valueOf(),
          `Expected ${updatedAt} > ${start}`);
      });
    });

    it('$set numeric element', function() {
      return co(function*() {
        const kids = 'foo bar baz'.split(' ').map(n => { return { name: `${n}`};});
        const doc = yield Parent.create({ children: kids });
        assert.ok(doc.children[0].updatedAt && doc.children[0].createdAt);
        assert.ok(doc.children[1].updatedAt && doc.children[1].createdAt);
        assert.ok(doc.children[2].updatedAt && doc.children[2].createdAt);

        const start = Date.now();
        yield cb => setTimeout(cb, 10);

        const cond = {};
        const update = { $set: { 'children.0': { name: 'Luke' } } };
        yield Parent.updateOne(cond, update);

        const found = yield Parent.findOne({});
        const updatedAt = found.children[0].updatedAt.valueOf();
        const name = found.children[0].name;
        assert.ok(name, 'Luke');
        assert.ok(updatedAt > start, `Expected ${updatedAt} > ${start}`);
      });
    });

    it('$set with positional operator', function() {
      return co(function*() {
        const kids = 'foo bar baz'.split(' ').map(n => { return { name: `${n}`};});
        const doc = yield Parent.create({ children: kids });
        assert.ok(doc.children[0].updatedAt && doc.children[0].createdAt);
        assert.ok(doc.children[1].updatedAt && doc.children[1].createdAt);
        assert.ok(doc.children[2].updatedAt && doc.children[2].createdAt);

        const start = Date.now();
        yield cb => setTimeout(cb, 10);

        const cond = { 'children.name': 'bar' };
        const update = { $set: { 'children.$.name': 'Luke' } };
        yield Parent.updateOne(cond, update);

        const found = yield Parent.findOne({});
        const updatedAt = found.children[1].updatedAt.valueOf();
        const name = found.children[1].name;
        assert.ok(name, 'Luke');
        assert.ok(updatedAt > start, `Expected ${updatedAt} > ${start}`);
      });
    });

    it('$set with positional operator and array (gh-7106)', function() {
      return co(function*() {
        const subSub = new Schema({ x: String });
        const sub = new Schema({ name: String, subArr: [subSub] });
        const schema = new Schema({ arr: [sub] }, {
          timestamps: true
        });

        const Test = db.model('gh7106', schema);

        const cond = { arr: { $elemMatch: { name: 'abc' } } };
        const set = { $set: { 'arr.$.subArr': [{ x: 'b' }] } };

        yield Test.create({
          arr: [{
            name: 'abc',
            subArr: [{ x: 'a' }]
          }]
        });
        yield Test.updateOne(cond, set);

        const res = yield Test.collection.findOne({});

        assert.ok(Array.isArray(res.arr));
        assert.strictEqual(res.arr[0].subArr[0].x, 'b');
      });
    });
  });

  it('strictQuery option (gh-4136) (gh-7178)', function() {
    const modelSchema = new Schema({
      field: Number,
      nested: { path: String }
    }, { strictQuery: 'throw' });

    const Model = db.model('gh4136', modelSchema);

    return co(function*() {
      // `find()` on a top-level path not in the schema
      let err = yield Model.find({ notInschema: 1 }).then(() => null, e => e);
      assert.ok(err);
      assert.ok(err.message.indexOf('strictQuery') !== -1, err.message);

      // Shouldn't throw on nested path re: gh-7178
      yield Model.create({ nested: { path: 'a' } });
      const doc = yield Model.findOne({ nested: { path: 'a' } });
      assert.ok(doc);

      // `find()` on a nested path not in the schema
      err = yield Model.find({ 'nested.bad': 'foo' }).then(() => null, e => e);
      assert.ok(err);
      assert.ok(err.message.indexOf('strictQuery') !== -1, err.message);
    });
  });

  it('strictQuery = true (gh-6032)', function() {
    const modelSchema = new Schema({ field: Number }, { strictQuery: true });

    return co(function*() {
      const Model = db.model('gh6032', modelSchema);

      yield Model.create({ field: 1 });

      const docs = yield Model.find({ nonexistingField: 1 });

      assert.equal(docs.length, 1);
    });
  });

  it('function defaults run after query result is inited (gh-7182)', function() {
    const schema = new Schema({ kind: String, hasDefault: String });
    schema.path('hasDefault').default(function() {
      return this.kind === 'test' ? 'success' : 'fail';
    });

    return co(function*() {
      const Model = db.model('gh7182', schema);

      yield Model.create({ kind: 'test' });
      yield Model.updateOne({}, { $unset: { hasDefault: 1 } });

      const doc = yield Model.findOne();
      assert.equal(doc.hasDefault, 'success');
    });
  });

  it('merging objectids with where() (gh-7360)', function() {
    const Test = db.model('gh7360', new Schema({}));

    return Test.create({}).
      then(doc => Test.find({ _id: doc._id.toString() }).where({ _id: doc._id })).
      then(res => assert.equal(res.length, 1));
  });

  it('maxTimeMS() (gh-7254)', function() {
    const Model = db.model('gh7254', new Schema({}));

    return co(function*() {
      yield Model.create({});

      const res = yield Model.find({ $where: 'sleep(1000) || true' }).
        maxTimeMS(10).
        then(() => null, err => err);
      assert.ok(res);
      assert.ok(res.message.indexOf('time limit') !== -1, res.message);
    });
  });

  it('connection-level maxTimeMS() (gh-4066)', function() {
    db.options = db.options || {};
    db.options.maxTimeMS = 10;
    const Model = db.model('gh4066_conn', new Schema({}));

    return co(function*() {
      yield Model.create({});

      const res = yield Model.find({ $where: 'sleep(250) || true' }).
        then(() => null, err => err);
      assert.ok(res);
      assert.ok(res.message.indexOf('time limit') !== -1, res.message);
      delete db.options.maxTimeMS;
    });
  });

  it('mongoose-level maxTimeMS() (gh-4066)', function() {
    db.base.options = db.base.options || {};
    db.base.options.maxTimeMS = 10;
    const Model = db.model('gh4066_global', new Schema({}));

    return co(function*() {
      yield Model.create({});

      const res = yield Model.find({ $where: 'sleep(250) || true' }).
        then(() => null, err => err);
      assert.ok(res);
      assert.ok(res.message.indexOf('time limit') !== -1, res.message);
      delete db.base.options.maxTimeMS;
    });
  });

  it('throws error with updateOne() and overwrite (gh-7475)', function() {
    const Model = db.model('gh7475', new Schema({ name: String }));

    return Model.updateOne({}, { name: 'bar' }, { overwrite: true }).then(
      () => { throw new Error('Should have failed'); },
      err => assert.ok(err.message.indexOf('updateOne') !== -1)
    );
  });

  it('sets deletedCount on result of remove() (gh-7629)', function() {
    const schema = new Schema({ name: String });

    const Model = db.model('gh7629', schema);

    return co(function*() {
      yield Model.create({ name: 'foo' });

      let res = yield Model.remove({});
      assert.equal(res.deletedCount, 1);

      res = yield Model.remove({});
      assert.strictEqual(res.deletedCount, 0);
    });
  });

  describe('merge()', function() {
    it('copies populate() (gh-1790)', function() {
      const Car = db.model('gh1790_Car', {
        color: String,
        model: String,
        owner: {
          type: Schema.Types.ObjectId,
          ref: 'gh1790_Person'
        }
      });

      const Person = db.model('gh1790_Person', {
        name: String
      });

      return co(function*() {
        const val = yield Person.create({ name: 'Val' });
        yield Car.create({ color: 'Brown', model: 'Subaru', owner: val._id });

        const q = Car.findOne().populate('owner');

        const res = yield Car.findOne().merge(q);

        assert.equal(res.owner.name, 'Val');
      });
    });
  });

  describe('Query#validate() (gh-7984)', function() {
    it('middleware', function() {
      const schema = new Schema({
        password: {
          type: String,
          validate: v => v.length >= 6,
          required: true
        }
      });

      let docCalls = 0;
      schema.post('validate', function() {
        ++docCalls;
      });
      let queryCalls = 0;
      schema.post('validate', { query: true }, function() {
        ++queryCalls;
        const pw = this.get('password');
        assert.equal(pw, '6chars');
        this.set('password', 'encryptedpassword');
      });

      const M = db.model('gh7984', schema);

      const opts = { runValidators: true, upsert: true, new: true };
      return M.findOneAndUpdate({}, { password: '6chars' }, opts).then(doc => {
        assert.equal(docCalls, 0);
        assert.equal(queryCalls, 1);
        assert.equal(doc.password, 'encryptedpassword');
      });
    });

    it('pre("validate") errors (gh-7187)', function() {
      const addressSchema = Schema({ countryId: String });
      addressSchema.pre('validate', { query: true }, function() {
        throw new Error('Oops!');
      });
      const contactSchema = Schema({ addresses: [addressSchema] });
      const Contact = db.model('gh7187', contactSchema);

      const update = { addresses: [{ countryId: 'foo' }] };
      return Contact.updateOne({}, update, { runValidators: true }).then(
        () => assert.ok(false),
        err => {
          assert.ok(err.errors['addresses.0']);
          assert.equal(err.errors['addresses.0'].message, 'Oops!');
        }
      );
    });
  });

  it('query with top-level _bsontype (gh-8222) (gh-8268)', function() {
    const userSchema = Schema({ token: String });
    const User = db.model('gh8222', userSchema);

    return co(function*() {
      const original = yield User.create({ token: 'rightToken' });
      let doc = yield User.findOne({ token: 'wrongToken', _bsontype: 'a' });
      assert.ok(!doc);

      doc = yield User.findOne(original._id);
      assert.ok(doc);
      assert.equal(doc.token, 'rightToken');
    });
  });
});
