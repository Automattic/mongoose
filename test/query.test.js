'use strict';

/**
 * Module dependencies.
 */

const start = require('./common');

const { EJSON } = require('bson');
const Query = require('../lib/query');
const assert = require('assert');
const util = require('./util');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const DocumentObjectId = mongoose.Types.ObjectId;

/**
 * Test.
 */

describe('Query', function() {
  let commentSchema;
  let productSchema;
  let db;

  before(function() {
    commentSchema = new Schema({
      text: String
    });

    productSchema = new Schema({
      tags: {}, // mixed
      array: Array,
      ids: [Schema.ObjectId],
      strings: [String],
      numbers: [Number],
      comments: [commentSchema]
    });
  });

  before(function() {
    db = start();
  });

  after(async function() {
    await db.close();
  });

  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => util.clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  describe('constructor', function() {
    it('should not corrupt options', function() {
      const opts = {};
      const query = new Query({}, opts);
      assert.notEqual(opts, query._mongooseOptions);
    });
  });

  describe('select', function() {
    it('(object)', function() {
      const query = new Query({});
      query.select({ a: 1, b: 1, c: 0 });
      assert.deepEqual(query._fields, { a: 1, b: 1, c: 0 });
    });

    it('(string)', function() {
      const query = new Query({});
      query.select(' a  b -c ');
      assert.deepEqual(query._fields, { a: 1, b: 1, '-c': 0 });
    });

    it('("a","b","c")', function() {
      assert.throws(function() {
        const query = new Query({});
        query.select('a', 'b', 'c');
      }, /Invalid select/);
    });

    it('should not overwrite fields set in prior calls', function() {
      const query = new Query({});
      query.select('a');
      assert.deepEqual(query._fields, { a: 1 });
      query.select('b');
      assert.deepEqual(query._fields, { a: 1, b: 1 });
      query.select({ c: 1 });
      assert.deepEqual(query._fields, { a: 1, b: 1, c: 1 });
      query.select('d');
      assert.deepEqual(query._fields, { a: 1, b: 1, c: 1, d: 1 });
    });

    it('should remove existing fields from inclusive projection', function() {
      const query = new Query({});
      query.select({
        a: 1,
        b: 1,
        c: 1,
        'parent1.child1': 1,
        'parent1.child2': 1,
        'parent2.child1': 1,
        'parent2.child2': 1
      }).select({ b: 0, d: 1, 'c.child': 0, parent1: 0, 'parent2.child1': 0 });
      assert.deepEqual(query._fields, { a: 1, c: 1, d: 1, 'parent2.child2': 1 });
    });

    it('should remove existing fields from exclusive projection', function() {
      const query = new Query({});
      query.select({
        a: 0,
        b: 0,
        c: 0,
        'parent1.child1': 0,
        'parent1.child2': 0,
        'parent2.child1': 0,
        'parent2.child2': 0
      }).select({ b: 1, d: 0, 'c.child': 1, parent1: 1, 'parent2.child1': 1 });
      assert.deepEqual(query._fields, { a: 0, c: 0, d: 0, 'parent2.child2': 0 });
    });
  });

  describe('projection() (gh-7384)', function() {
    it('gets current projection', function() {
      const query = new Query({});
      query.select('a');
      assert.deepEqual(query.projection(), { a: 1 });
    });

    it('overwrites current projection', function() {
      const query = new Query({});
      query.select('a');
      assert.deepEqual(query.projection({ b: 1 }), { b: 1 });
      assert.deepEqual(query.projection(), { b: 1 });
    });
  });

  describe('where', function() {
    it('works', function() {
      const query = new Query({});
      query.where('name', 'guillermo');
      assert.deepEqual(query._conditions, { name: 'guillermo' });
      query.where('a');
      query.equals('b');
      assert.deepEqual(query._conditions, { name: 'guillermo', a: 'b' });
    });
    it('throws if non-string or non-object path is passed', function() {
      const query = new Query({});
      assert.throws(function() {
        query.where(50);
      });
      assert.throws(function() {
        query.where([]);
      });
    });
    it('does not throw when 0 args passed', function() {
      const query = new Query({});
      assert.doesNotThrow(function() {
        query.where();
      });
    });
  });

  describe('equals', function() {
    it('works', function() {
      const query = new Query({});
      query.where('name').equals('guillermo');
      assert.deepEqual(query._conditions, { name: 'guillermo' });
    });
  });

  describe('gte', function() {
    it('with 2 args', function() {
      const query = new Query({});
      query.gte('age', 18);
      assert.deepEqual(query._conditions, { age: { $gte: 18 } });
    });
    it('with 1 arg', function() {
      const query = new Query({});
      query.where('age').gte(18);
      assert.deepEqual(query._conditions, { age: { $gte: 18 } });
    });
  });

  describe('gt', function() {
    it('with 1 arg', function() {
      const query = new Query({});
      query.where('age').gt(17);
      assert.deepEqual(query._conditions, { age: { $gt: 17 } });
    });
    it('with 2 args', function() {
      const query = new Query({});
      query.gt('age', 17);
      assert.deepEqual(query._conditions, { age: { $gt: 17 } });
    });
  });

  describe('lte', function() {
    it('with 1 arg', function() {
      const query = new Query({});
      query.where('age').lte(65);
      assert.deepEqual(query._conditions, { age: { $lte: 65 } });
    });
    it('with 2 args', function() {
      const query = new Query({});
      query.lte('age', 65);
      assert.deepEqual(query._conditions, { age: { $lte: 65 } });
    });
  });

  describe('lt', function() {
    it('with 1 arg', function() {
      const query = new Query({});
      query.where('age').lt(66);
      assert.deepEqual(query._conditions, { age: { $lt: 66 } });
    });
    it('with 2 args', function() {
      const query = new Query({});
      query.lt('age', 66);
      assert.deepEqual(query._conditions, { age: { $lt: 66 } });
    });
  });

  describe('combined', function() {
    describe('lt and gt', function() {
      it('works', function() {
        const query = new Query({});
        query.where('age').lt(66).gt(17);
        assert.deepEqual(query._conditions, { age: { $lt: 66, $gt: 17 } });
      });
    });
  });

  describe('tl on one path and gt on another', function() {
    it('works', function() {
      const query = new Query({});
      query
        .where('age').lt(66)
        .where('height').gt(5);
      assert.deepEqual(query._conditions, { age: { $lt: 66 }, height: { $gt: 5 } });
    });
  });

  describe('ne', function() {
    it('with 1 arg', function() {
      const query = new Query({});
      query.where('age').ne(21);
      assert.deepEqual(query._conditions, { age: { $ne: 21 } });
    });
    it('with 2 args', function() {
      const query = new Query({});
      query.ne('age', 21);
      assert.deepEqual(query._conditions, { age: { $ne: 21 } });
    });
  });

  describe('in', function() {
    it('with 1 arg', function() {
      const query = new Query({});
      query.where('age').in([21, 25, 30]);
      assert.deepEqual(query._conditions, { age: { $in: [21, 25, 30] } });

    });
    it('with 2 args', function() {
      const query = new Query({});
      query.in('age', [21, 25, 30]);
      assert.deepEqual(query._conditions, { age: { $in: [21, 25, 30] } });

    });
    it('where a non-array value no via where', function() {
      const query = new Query({});
      query.in('age', 21);
      assert.deepEqual(query._conditions, { age: { $in: 21 } });

    });
    it('where a non-array value via where', function() {
      const query = new Query({});
      query.where('age').in(21);
      assert.deepEqual(query._conditions, { age: { $in: 21 } });

    });
  });

  describe('nin', function() {
    it('with 1 arg', function() {
      const query = new Query({});
      query.where('age').nin([21, 25, 30]);
      assert.deepEqual(query._conditions, { age: { $nin: [21, 25, 30] } });

    });
    it('with 2 args', function() {
      const query = new Query({});
      query.nin('age', [21, 25, 30]);
      assert.deepEqual(query._conditions, { age: { $nin: [21, 25, 30] } });

    });
    it('with a non-array value not via where', function() {
      const query = new Query({});
      query.nin('age', 21);
      assert.deepEqual(query._conditions, { age: { $nin: 21 } });

    });
    it('with a non-array value via where', function() {
      const query = new Query({});
      query.where('age').nin(21);
      assert.deepEqual(query._conditions, { age: { $nin: 21 } });

    });
  });

  describe('mod', function() {
    it('not via where, where [a, b] param', function() {
      const query = new Query({});
      query.mod('age', [5, 2]);
      assert.deepEqual(query._conditions, { age: { $mod: [5, 2] } });

    });
    it('not via where, where a and b params', function() {
      const query = new Query({});
      query.mod('age', 5, 2);
      assert.deepEqual(query._conditions, { age: { $mod: [5, 2] } });

    });
    it('via where, where [a, b] param', function() {
      const query = new Query({});
      query.where('age').mod([5, 2]);
      assert.deepEqual(query._conditions, { age: { $mod: [5, 2] } });

    });
    it('via where, where a and b params', function() {
      const query = new Query({});
      query.where('age').mod(5, 2);
      assert.deepEqual(query._conditions, { age: { $mod: [5, 2] } });

    });
  });

  describe('near', function() {
    it('via where, where { center :[lat, long]} param', function() {
      const query = new Query({});
      query.where('checkin').near({ center: [40, -72] });
      assert.deepEqual(query._conditions, { checkin: { $near: [40, -72] } });

    });
    it('via where, where [lat, long] param', function() {
      const query = new Query({});
      query.where('checkin').near([40, -72]);
      assert.deepEqual(query._conditions, { checkin: { $near: [40, -72] } });

    });
    it('via where, where lat and long params', function() {
      const query = new Query({});
      query.where('checkin').near(40, -72);
      assert.deepEqual(query._conditions, { checkin: { $near: [40, -72] } });

    });
    it('not via where, where [lat, long] param', function() {
      const query = new Query({});
      query.near('checkin', [40, -72]);
      assert.deepEqual(query._conditions, { checkin: { $near: [40, -72] } });

    });
    it('not via where, where lat and long params', function() {
      const query = new Query({});
      query.near('checkin', 40, -72);
      assert.deepEqual(query._conditions, { checkin: { $near: [40, -72] } });

    });
    it('via where, where GeoJSON param', function() {
      const query = new Query({});
      query.where('numbers').near({ center: { type: 'Point', coordinates: [40, -72] } });
      assert.deepEqual(query._conditions, { numbers: { $near: { $geometry: { type: 'Point', coordinates: [40, -72] } } } });
      assert.doesNotThrow(function() {
        query.cast(db.model('Product', productSchema));
      });

    });
    it('with path, where GeoJSON param', function() {
      const query = new Query({});
      query.near('loc', { center: { type: 'Point', coordinates: [40, -72] } });
      assert.deepEqual(query._conditions, { loc: { $near: { $geometry: { type: 'Point', coordinates: [40, -72] } } } });

    });
  });

  describe('nearSphere', function() {
    it('via where, where [lat, long] param', function() {
      const query = new Query({});
      query.where('checkin').nearSphere([40, -72]);
      assert.deepEqual(query._conditions, { checkin: { $nearSphere: [40, -72] } });

    });
    it('via where, where lat and long params', function() {
      const query = new Query({});
      query.where('checkin').nearSphere(40, -72);
      assert.deepEqual(query._conditions, { checkin: { $nearSphere: [40, -72] } });

    });
    it('not via where, where [lat, long] param', function() {
      const query = new Query({});
      query.nearSphere('checkin', [40, -72]);
      assert.deepEqual(query._conditions, { checkin: { $nearSphere: [40, -72] } });

    });
    it('not via where, where lat and long params', function() {
      const query = new Query({});
      query.nearSphere('checkin', 40, -72);
      assert.deepEqual(query._conditions, { checkin: { $nearSphere: [40, -72] } });

    });

    it('via where, with object', function() {
      const query = new Query({});
      query.where('checkin').nearSphere({ center: [20, 23], maxDistance: 2 });
      assert.deepEqual(query._conditions, { checkin: { $nearSphere: [20, 23], $maxDistance: 2 } });

    });

    it('via where, where GeoJSON param', function() {
      const query = new Query({});
      query.where('numbers').nearSphere({ center: { type: 'Point', coordinates: [40, -72] } });
      assert.deepEqual(query._conditions, { numbers: { $nearSphere: { $geometry: { type: 'Point', coordinates: [40, -72] } } } });
      assert.doesNotThrow(function() {
        query.cast(db.model('Product', productSchema));
      });

    });

    it('with path, with GeoJSON', function() {
      const query = new Query({});
      query.nearSphere('numbers', { center: { type: 'Point', coordinates: [40, -72] } });
      assert.deepEqual(query._conditions, { numbers: { $nearSphere: { $geometry: { type: 'Point', coordinates: [40, -72] } } } });
      assert.doesNotThrow(function() {
        query.cast(db.model('Product', productSchema));
      });

    });
  });

  describe('maxDistance', function() {
    it('via where', function() {
      const query = new Query({});
      query.where('checkin').near([40, -72]).maxDistance(1);
      assert.deepEqual(query._conditions, { checkin: { $near: [40, -72], $maxDistance: 1 } });

    });
  });

  describe('within', function() {
    describe('box', function() {
      it('via where', function() {
        const query = new Query({});
        query.where('gps').within().box({ ll: [5, 25], ur: [10, 30] });
        const match = { gps: { $within: { $box: [[5, 25], [10, 30]] } } };
        if (Query.use$geoWithin) {
          match.gps.$geoWithin = match.gps.$within;
          delete match.gps.$within;
        }
        assert.deepEqual(query._conditions, match);

      });
      it('via where, no object', function() {
        const query = new Query({});
        query.where('gps').within().box([5, 25], [10, 30]);
        const match = { gps: { $within: { $box: [[5, 25], [10, 30]] } } };
        if (Query.use$geoWithin) {
          match.gps.$geoWithin = match.gps.$within;
          delete match.gps.$within;
        }
        assert.deepEqual(query._conditions, match);

      });
    });

    describe('center', function() {
      it('via where', function() {
        const query = new Query({});
        query.where('gps').within().center({ center: [5, 25], radius: 5 });
        const match = { gps: { $within: { $center: [[5, 25], 5] } } };
        if (Query.use$geoWithin) {
          match.gps.$geoWithin = match.gps.$within;
          delete match.gps.$within;
        }
        assert.deepEqual(query._conditions, match);

      });
    });

    describe('centerSphere', function() {
      it('via where', function() {
        const query = new Query({});
        query.where('gps').within().centerSphere({ center: [5, 25], radius: 5 });
        const match = { gps: { $within: { $centerSphere: [[5, 25], 5] } } };
        if (Query.use$geoWithin) {
          match.gps.$geoWithin = match.gps.$within;
          delete match.gps.$within;
        }
        assert.deepEqual(query._conditions, match);

      });
    });

    describe('polygon', function() {
      it('via where', function() {
        const query = new Query({});
        query.where('gps').within().polygon({ a: { x: 10, y: 20 }, b: { x: 15, y: 25 }, c: { x: 20, y: 20 } });
        const match = { gps: { $within: { $polygon: [{ a: { x: 10, y: 20 }, b: { x: 15, y: 25 }, c: { x: 20, y: 20 } }] } } };
        if (Query.use$geoWithin) {
          match.gps.$geoWithin = match.gps.$within;
          delete match.gps.$within;
        }
        assert.deepEqual(query._conditions, match);

      });
    });
  });

  describe('exists', function() {
    it('0 args via where', function() {
      const query = new Query({});
      query.where('username').exists();
      assert.deepEqual(query._conditions, { username: { $exists: true } });

    });
    it('1 arg via where', function() {
      const query = new Query({});
      query.where('username').exists(false);
      assert.deepEqual(query._conditions, { username: { $exists: false } });

    });
    it('where 1 argument not via where', function() {
      const query = new Query({});
      query.exists('username');
      assert.deepEqual(query._conditions, { username: { $exists: true } });

    });

    it('where 2 args not via where', function() {
      const query = new Query({});
      query.exists('username', false);
      assert.deepEqual(query._conditions, { username: { $exists: false } });

    });
  });

  describe('all', function() {
    it('via where', function() {
      const query = new Query({});
      query.where('pets').all(['dog', 'cat', 'ferret']);
      assert.deepEqual(query._conditions, { pets: { $all: ['dog', 'cat', 'ferret'] } });

    });
    it('not via where', function() {
      const query = new Query({});
      query.all('pets', ['dog', 'cat', 'ferret']);
      assert.deepEqual(query._conditions, { pets: { $all: ['dog', 'cat', 'ferret'] } });

    });
  });

  describe('find', function() {
    it('strict array equivalence condition v', function() {
      const query = new Query({});
      query.find({ pets: ['dog', 'cat', 'ferret'] });
      assert.deepEqual(query._conditions, { pets: ['dog', 'cat', 'ferret'] });

    });
    it('with no args', function() {
      let threw = false;
      const q = new Query({});

      try {
        q.find();
      } catch (err) {
        threw = true;
      }

      assert.ok(!threw);

    });

    it('works with overwriting previous object args (1176)', function() {
      const q = new Query({});
      assert.doesNotThrow(function() {
        q.find({ age: { $lt: 30 } });
        q.find({ age: 20 }); // overwrite
      });
      assert.deepEqual({ age: 20 }, q._conditions);

    });
  });

  describe('size', function() {
    it('via where', function() {
      const query = new Query({});
      query.where('collection').size(5);
      assert.deepEqual(query._conditions, { collection: { $size: 5 } });

    });
    it('not via where', function() {
      const query = new Query({});
      query.size('collection', 5);
      assert.deepEqual(query._conditions, { collection: { $size: 5 } });

    });
  });

  describe('slice', function() {
    it('where and positive limit param', function() {
      const query = new Query({});
      query.where('collection').slice(5);
      assert.deepEqual(query._fields, { collection: { $slice: 5 } });

    });
    it('where just negative limit param', function() {
      const query = new Query({});
      query.where('collection').slice(-5);
      assert.deepEqual(query._fields, { collection: { $slice: -5 } });

    });
    it('where [skip, limit] param', function() {
      const query = new Query({});
      query.where('collection').slice([14, 10]); // Return the 15th through 25th
      assert.deepEqual(query._fields, { collection: { $slice: [14, 10] } });

    });
    it('where skip and limit params', function() {
      const query = new Query({});
      query.where('collection').slice(14, 10); // Return the 15th through 25th
      assert.deepEqual(query._fields, { collection: { $slice: [14, 10] } });

    });
    it('where just positive limit param', function() {
      const query = new Query({});
      query.where('collection').slice(5);
      assert.deepEqual(query._fields, { collection: { $slice: 5 } });

    });
    it('where just negative limit param', function() {
      const query = new Query({});
      query.where('collection').slice(-5);
      assert.deepEqual(query._fields, { collection: { $slice: -5 } });

    });
    it('where the [skip, limit] param', function() {
      const query = new Query({});
      query.where('collection').slice([14, 10]); // Return the 15th through 25th
      assert.deepEqual(query._fields, { collection: { $slice: [14, 10] } });

    });
    it('where the skip and limit params', function() {
      const query = new Query({});
      query.where('collection').slice(14, 10); // Return the 15th through 25th
      assert.deepEqual(query._fields, { collection: { $slice: [14, 10] } });

    });
    it('not via where, with just positive limit param', function() {
      const query = new Query({});
      query.slice('collection', 5);
      assert.deepEqual(query._fields, { collection: { $slice: 5 } });

    });
    it('not via where, where just negative limit param', function() {
      const query = new Query({});
      query.slice('collection', -5);
      assert.deepEqual(query._fields, { collection: { $slice: -5 } });

    });
    it('not via where, where [skip, limit] param', function() {
      const query = new Query({});
      query.slice('collection', [14, 10]); // Return the 15th through 25th
      assert.deepEqual(query._fields, { collection: { $slice: [14, 10] } });

    });
    it('not via where, where skip and limit params', function() {
      const query = new Query({});
      query.slice('collection', 14, 10); // Return the 15th through 25th
      assert.deepEqual(query._fields, { collection: { $slice: [14, 10] } });

    });
  });

  describe('elemMatch', function() {
    describe('not via where', function() {
      it('works', function() {
        const query = new Query({});
        query.elemMatch('comments', { author: 'bnoguchi', votes: { $gte: 5 } });
        assert.deepEqual(query._conditions, { comments: { $elemMatch: { author: 'bnoguchi', votes: { $gte: 5 } } } });

      });
      it('where block notation', function() {
        const query = new Query({});
        query.elemMatch('comments', function(elem) {
          elem.where('author', 'bnoguchi');
          elem.where('votes').gte(5);
        });
        assert.deepEqual(query._conditions, { comments: { $elemMatch: { author: 'bnoguchi', votes: { $gte: 5 } } } });

      });
    });
    describe('via where', function() {
      it('works', function() {
        const query = new Query({});
        query.where('comments').elemMatch({ author: 'bnoguchi', votes: { $gte: 5 } });
        assert.deepEqual(query._conditions, { comments: { $elemMatch: { author: 'bnoguchi', votes: { $gte: 5 } } } });

      });
      it('where block notation', function() {
        const query = new Query({});
        query.where('comments').elemMatch(function(elem) {
          elem.where('author', 'bnoguchi');
          elem.where('votes').gte(5);
        });
        assert.deepEqual(query._conditions, { comments: { $elemMatch: { author: 'bnoguchi', votes: { $gte: 5 } } } });

      });
    });
  });

  describe('$where', function() {
    it('function arg', function() {
      const query = new Query({});

      function filter() {
        return this.lastName === this.firstName;
      }

      query.$where(filter);
      assert.deepEqual(query._conditions, { $where: filter });

    });
    it('string arg', function() {
      const query = new Query({});
      query.$where('this.lastName === this.firstName');
      assert.deepEqual(query._conditions, { $where: 'this.lastName === this.firstName' });

    });
  });

  describe('limit', function() {
    it('works', function() {
      const query = new Query({});
      query.limit(5);
      assert.strictEqual(query.options.limit, 5);

    });

    it('with string limit (gh-11017)', function() {
      const query = new Query({});
      query.limit('5');
      assert.strictEqual(query.options.limit, 5);

      assert.throws(() => query.limit('fail'), /CastError/);
    });
  });

  describe('skip', function() {
    it('works', function() {
      const query = new Query({});
      query.skip(9);
      assert.equal(query.options.skip, 9);

    });
  });

  describe('sort', function() {
    it('works', function() {
      let query = new Query({});
      query.sort('a -c b');
      assert.deepEqual(query.options.sort, { a: 1, c: -1, b: 1 });
      query = new Query({});
      query.sort({ a: 1, c: -1, b: 'asc', e: 'descending', f: 'ascending' });
      assert.deepEqual(query.options.sort, { a: 1, c: -1, b: 1, e: -1, f: 1 });

      if (typeof global.Map !== 'undefined') {
        query = new Query({});
        query.sort(new global.Map().set('a', 1).set('b', 1));
        assert.equal(query.options.sort.get('a'), 1);
        assert.equal(query.options.sort.get('b'), 1);
      }

      query = new Query({});
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

    });
  });

  describe('or', function() {
    it('works', function() {
      const query = new Query();
      query.find({ $or: [{ x: 1 }, { x: 2 }] });
      assert.equal(query._conditions.$or.length, 2);
      query.or([{ y: 'We\'re under attack' }, { z: 47 }]);
      assert.equal(query._conditions.$or.length, 4);
      assert.equal(query._conditions.$or[3].z, 47);
      query.or({ z: 'phew' });
      assert.equal(query._conditions.$or.length, 5);
      assert.equal(query._conditions.$or[3].z, 47);
      assert.equal(query._conditions.$or[4].z, 'phew');

    });
  });

  describe('and', function() {
    it('works', function() {
      const query = new Query();
      query.find({ $and: [{ x: 1 }, { y: 2 }] });
      assert.equal(query._conditions.$and.length, 2);
      query.and([{ z: 'We\'re under attack' }, { w: 47 }]);
      assert.equal(query._conditions.$and.length, 4);
      assert.equal(query._conditions.$and[3].w, 47);
      query.and({ a: 'phew' });
      assert.equal(query._conditions.$and.length, 5);
      assert.equal(query._conditions.$and[0].x, 1);
      assert.equal(query._conditions.$and[1].y, 2);
      assert.equal(query._conditions.$and[2].z, 'We\'re under attack');
      assert.equal(query._conditions.$and[3].w, 47);
      assert.equal(query._conditions.$and[4].a, 'phew');

    });
  });

  describe('populate', function() {
    it('converts to PopulateOptions objects', function() {
      const q = new Query({});
      const o = {
        path: 'yellow.brick',
        match: { bricks: { $lt: 1000 } },
        select: undefined,
        model: undefined,
        options: undefined,
        _docs: {},
        _childDocs: []
      };
      q.populate(o);
      assert.deepEqual(o, q._mongooseOptions.populate['yellow.brick']);

    });

    it('overwrites duplicate paths', function() {
      const q = new Query({});
      let o = {
        path: 'yellow.brick',
        match: { bricks: { $lt: 1000 } },
        _docs: {},
        _childDocs: []
      };
      q.populate(Object.assign({}, o));
      assert.equal(Object.keys(q._mongooseOptions.populate).length, 1);
      assert.deepEqual(q._mongooseOptions.populate['yellow.brick'], o);

      q.populate('yellow.brick');
      o = {
        path: 'yellow.brick',
        _docs: {},
        _childDocs: []
      };
      assert.equal(Object.keys(q._mongooseOptions.populate).length, 1);
      assert.deepEqual(q._mongooseOptions.populate['yellow.brick'], o);

    });

    it('accepts space delimited strings', function() {
      const q = new Query({});
      q.populate('yellow.brick dirt');
      assert.equal(Object.keys(q._mongooseOptions.populate).length, 2);
      assert.deepEqual(q._mongooseOptions.populate['yellow.brick'], {
        path: 'yellow.brick',
        _docs: {},
        _childDocs: []
      });
      assert.deepEqual(q._mongooseOptions.populate['dirt'], {
        path: 'dirt',
        _docs: {},
        _childDocs: []
      });

    });
  });

  describe('casting', function() {
    it('to an array of mixed', function() {
      const query = new Query({});
      const Product = db.model('Product', productSchema);
      const params = { _id: new DocumentObjectId(), tags: { $in: [4, 8, 15, 16] } };
      query.cast(Product, params);
      assert.deepEqual(params.tags.$in, [4, 8, 15, 16]);

    });

    it('doesn\'t wipe out $in (gh-6439)', async function() {
      const embeddedSchema = new Schema({
        name: String
      }, { _id: false });

      const catSchema = new Schema({
        name: String,
        props: [embeddedSchema]
      });

      const Cat = db.model('Cat', catSchema);
      const kitty = new Cat({
        name: 'Zildjian',
        props: [
          { name: 'invalid' },
          { name: 'abc' },
          { name: 'def' }
        ]
      });


      await kitty.save();
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
      await Cat.updateOne(cond, update);
      const found = await Cat.findOne(cond);
      assert.strictEqual(found.props[0].name, 'abc');
    });

    it('find $ne should not cast single value to array for schematype of Array', function() {
      const query = new Query({});
      const Product = db.model('Product', productSchema);
      const Comment = db.model('Comment', commentSchema);

      const id = new DocumentObjectId();
      const castedComment = { _id: id, text: 'hello there' };
      const comment = new Comment(castedComment);

      const params = {
        array: { $ne: 5 },
        ids: { $ne: id },
        comments: { $ne: comment },
        strings: { $ne: 'Hi there' },
        numbers: { $ne: 10000 }
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

    });

    it('subdocument array with $ne: null should not throw', function() {
      const query = new Query({});
      const Product = db.model('Product', productSchema);

      const params = {
        comments: { $ne: null }
      };

      query.cast(Product, params);
      assert.strictEqual(params.comments.$ne, null);

    });

    it('find should not cast single value to array for schematype of Array', function() {
      const query = new Query({});
      const Product = db.model('Product', productSchema);
      const Comment = db.model('Comment', commentSchema);

      const id = new DocumentObjectId();
      const castedComment = { _id: id, text: 'hello there' };
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

    });

    it('an $elemMatch with $in works (gh-1100)', function() {
      const query = new Query({});
      const Product = db.model('Product', productSchema);
      const ids = [String(new DocumentObjectId()), String(new DocumentObjectId())];
      const params = { ids: { $elemMatch: { $in: ids } } };
      query.cast(Product, params);
      assert.ok(params.ids.$elemMatch.$in[0] instanceof DocumentObjectId);
      assert.ok(params.ids.$elemMatch.$in[1] instanceof DocumentObjectId);
      assert.deepEqual(params.ids.$elemMatch.$in[0].toString(), ids[0]);
      assert.deepEqual(params.ids.$elemMatch.$in[1].toString(), ids[1]);

    });

    it('inequality operators for an array', function() {
      const query = new Query({});
      const Product = db.model('Product', productSchema);
      const Comment = db.model('Comment', commentSchema);

      const id = new DocumentObjectId();
      const castedComment = { _id: id, text: 'hello there' };
      const comment = new Comment(castedComment);

      const params = {
        ids: { $gt: id },
        comments: { $gt: comment },
        strings: { $gt: 'Hi there' },
        numbers: { $gt: 10000 }
      };

      query.cast(Product, params);
      assert.equal(params.ids.$gt, id);
      assert.deepEqual(params.comments.$gt.toObject(), castedComment);
      assert.equal(params.strings.$gt, 'Hi there');
      assert.equal(params.numbers.$gt, 10000);

    });
  });

  describe('distinct', function() {
    it('op', function() {
      const q = new Query({});

      q.distinct('blah');

      assert.equal(q.op, 'distinct');
    });
  });

  describe('findOne', function() {
    it('sets the op', function() {
      const Product = db.model('Product', productSchema);
      const prod = new Product({});
      const q = new Query(prod.collection, {}, Product).distinct();
      assert.equal(q.op, 'distinct');
      q.findOne();
      assert.equal(q.op, 'findOne');
    });
  });

  describe('deleteOne/deleteMany', function() {
    it('handles deleteOne', async function() {
      const M = db.model('Person', new Schema({ name: 'String' }));


      await M.deleteMany({});
      await M.create([{ name: 'Eddard Stark' }, { name: 'Robb Stark' }]);

      await M.deleteOne({ name: /Stark/ });

      const count = await M.countDocuments();
      assert.equal(count, 1);
    });

    it('handles deleteMany', async function() {
      const M = db.model('Person', new Schema({ name: 'String' }));


      await M.deleteMany({});
      await M.create([{ name: 'Eddard Stark' }, { name: 'Robb Stark' }]);

      await M.deleteMany({ name: /Stark/ });

      const count = await M.countDocuments();
      assert.equal(count, 0);
    });
  });

  describe('deleteMany', function() {
    it('handles cast errors async', async function() {
      const Product = db.model('Product', productSchema);

      const err = await Product.where({ numbers: [[[]]] }).deleteMany().then(() => null, err => err);
      assert.ok(err);
      assert.equal(err.name, 'CastError');
    });

    it('supports a single conditions arg', async function() {
      const Product = db.model('Product', productSchema);

      await Product.create({ strings: ['remove-single-condition'] });
      const q = Product.where().deleteMany({ strings: 'remove-single-condition' });
      assert.ok(q instanceof mongoose.Query);
    });

    it('supports a single callback arg', async function() {
      const Product = db.model('Product', productSchema);
      const val = 'remove-single-callback';

      await Product.create({ strings: [val] });
      await Product.where({ strings: val }).deleteMany();
      const doc = await Product.findOne({ strings: val });
      assert.ok(!doc);
    });

    it('supports conditions and callback args', async function() {
      const Product = db.model('Product', productSchema);
      const val = 'remove-cond-and-callback';

      await Product.create({ strings: [val] });
      await Product.where().deleteMany({ strings: val });
      const doc = await Product.findOne({ strings: val });
      assert.ok(!doc);
    });
  });

  describe('querying/updating with model instance containing embedded docs should work (#454)', function() {
    it('works', async function() {
      const Product = db.model('Product', productSchema);

      const proddoc = { comments: [{ text: 'hello' }] };
      const prod2doc = { comments: [{ text: 'goodbye' }] };

      const prod = new Product(proddoc);
      await prod.save();

      const product = await Product.findOne({ _id: prod._id });
      assert.equal(product.comments.length, 1);
      assert.equal(product.comments[0].text, 'hello');
      await Product.updateOne({ _id: prod._id }, prod2doc);
      const doc = await Product.collection.findOne({ _id: product._id });

      assert.ok(!doc.comments[0].hasOwnProperty('parentArry'));
      assert.equal(doc.comments[0].text, 'goodbye');
    });
  });

  describe('optionsForExec', function() {
    it('should retain key order', function() {
      // this is important for query hints
      const hint = { x: 1, y: 1, z: 1 };
      const a = JSON.stringify({ hint: hint });

      const q = new Query();
      q.hint(hint);

      const options = q._optionsForExec();
      assert.equal(JSON.stringify(options), a);
    });

    it('applies schema-level writeConcern option', function() {
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
        writeConcern: {
          w: 'majority',
          j: true
        }
      });
    });

    it('session() (gh-6663)', function() {
      const q = new Query();

      const fakeSession = 'foo';
      q.session(fakeSession);

      const options = q._optionsForExec();
      assert.deepEqual(options, {
        session: fakeSession
      });
    });
  });

  // Advanced Query options

  describe('options', function() {
    describe('tailable', function() {
      it('works', function() {
        let query = new Query({});
        query.tailable();
        assert.equal(query.options.tailable, true);

        query = new Query({});
        query.tailable(true);
        assert.equal(query.options.tailable, true);

        query = new Query({});
        query.tailable(false);
        assert.equal(query.options.tailable, false);
      });
      it('supports passing the `awaitData` option', function() {
        const query = new Query({});
        query.tailable({ awaitData: true });
        assert.equal(query.options.tailable, true);
        assert.equal(query.options.awaitData, true);
      });
    });

    describe('comment', function() {
      it('works', function() {
        const query = new Query();
        assert.equal(typeof query.comment, 'function');
        assert.equal(query.comment('Lowpass is more fun'), query);
        assert.equal(query.options.comment, 'Lowpass is more fun');
      });
    });

    describe('hint', function() {
      it('works', function() {
        const query2 = new Query({});
        query2.hint({ indexAttributeA: 1, indexAttributeB: -1 });
        assert.deepEqual(query2.options.hint, { indexAttributeA: 1, indexAttributeB: -1 });

        const query3 = new Query({});
        query3.hint('indexAttributeA_1');
        assert.deepEqual(query3.options.hint, 'indexAttributeA_1');
      });
    });

    describe('batchSize', function() {
      it('works', function() {
        const query = new Query({});
        query.batchSize(10);
        assert.equal(query.options.batchSize, 10);
      });
    });

    describe('read', function() {
      describe('without tags', function() {
        it('works', function() {
          const query = new Query({});
          query.read('primary');
          assert.equal(query.options.readPreference.mode, 'primary');

          query.read('primaryPreferred');
          assert.equal(query.options.readPreference.mode, 'primaryPreferred');

          query.read('secondary');
          assert.equal(query.options.readPreference.mode, 'secondary');

          query.read('secondaryPreferred');
          assert.equal(query.options.readPreference.mode, 'secondaryPreferred');

          query.read('nearest');
          assert.equal(query.options.readPreference.mode, 'nearest');
        });
      });

      describe('with tags', function() {
        it('works', function() {
          const query = new Query({});
          const tags = [{ dc: 'sf', s: 1 }, { dc: 'jp', s: 2 }];

          query.read('primaryPreferred', tags);
          assert.equal(query.options.readPreference.mode, 'primaryPreferred');
          assert.ok(Array.isArray(query.options.readPreference.tags));
          assert.equal(query.options.readPreference.tags[0].dc, 'sf');
          assert.equal(query.options.readPreference.tags[0].s, 1);
          assert.equal(query.options.readPreference.tags[1].dc, 'jp');
          assert.equal(query.options.readPreference.tags[1].s, 2);
        });
      });

      describe('inherits its models schema read option', function() {
        let schema, M, called;
        before(function() {
          schema = new Schema({}, { read: 'primary' });
          M = mongoose.model('schemaOptionReadPrefWithQuery', schema);
        });

        it('if not set in query', function() {
          const options = M.where()._optionsForExec(M);
          assert.equal(options.readPreference, 'primary');
        });

        it('if set in query', function() {
          const options = M.where().read('secondary')._optionsForExec(M);
          assert.equal(options.readPreference.mode, 'secondary');
        });

        it('and sends it though the driver', async function() {
          const options = { read: 'secondary', writeConcern: { w: 'majority' } };
          const schema = new Schema({ name: String }, options);
          const M = db.model('Test', schema);
          const q = M.find();

          // stub the internal query options call
          const getopts = q._optionsForExec;
          q._optionsForExec = function(model) {
            q._optionsForExec = getopts;

            const ret = getopts.call(this, model);

            assert.ok(ret.readPreference);
            assert.equal(ret.readPreference, 'secondary');
            assert.deepEqual({ w: 'majority' }, ret.writeConcern);
            called = true;

            return ret;
          };

          await q.exec();
          assert.ok(called);
        });
      });
    });
  });

  describe('setOptions', function() {
    it('works', async function() {
      const q = new Query();
      q.setOptions({ thing: 'cat' });
      q.setOptions({ populate: ['fans'] });
      q.setOptions({ batchSize: 10 });
      q.setOptions({ limit: 4 });
      q.setOptions({ skip: 3 });
      q.setOptions({ sort: '-blah' });
      q.setOptions({ sort: { woot: -1 } });
      q.setOptions({ hint: { index1: 1, index2: -1 } });
      q.setOptions({ read: ['secondary', [{ dc: 'eu' }]] });

      assert.equal(q.options.thing, 'cat');
      assert.deepEqual(q._mongooseOptions.populate.fans, { path: 'fans', _docs: {}, _childDocs: [] });
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

      const Product = db.model('Product', productSchema);
      const [, doc2] = await Product.create([
        { numbers: [3, 4, 5] },
        { strings: 'hi there'.split(' '), w: 'majority' }
      ]);

      const docs = await Product.find().setOptions({ limit: 1, sort: { _id: -1 }, read: 'n' });
      assert.equal(docs.length, 1);
      assert.equal(docs[0].id, doc2.id);
    });

    it('populate as array in options (gh-4446)', function() {
      const q = new Query();
      q.setOptions({ populate: [{ path: 'path1' }, { path: 'path2' }] });
      assert.deepEqual(Object.keys(q._mongooseOptions.populate),
        ['path1', 'path2']);
    });
  });

  describe('getOptions', function() {
    const q = new Query();
    q.limit(10);
    q.setOptions({ maxTimeMS: 1000 });
    const opts = q.getOptions();

    // does not use assert.deepEqual() because setOptions may alter the options internally
    assert.strictEqual(opts.limit, 10);
    assert.strictEqual(opts.maxTimeMS, 1000);
  });

  describe('bug fixes', function() {
    describe('collations', function() {
      before(async function() {
        const _this = this;
        const version = await start.mongodVersion();

        const mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
        if (!mongo34) {
          return _this.skip();
        }
      });

      it('collation support (gh-4839)', function() {
        const schema = new Schema({
          name: String
        });

        const MyModel = db.model('Test', schema);
        const collation = { locale: 'en_US', strength: 1 };

        return MyModel.create([{ name: 'a' }, { name: 'A' }]).
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
          });
      });

      it('set on schema (gh-5295)', async function() {
        await db.db.collection('tests').drop().catch(err => {
          if (err.message === 'ns not found') {
            return;
          }
          throw err;
        });

        const schema = new Schema({
          name: String
        }, { collation: { locale: 'en_US', strength: 1 } });

        const MyModel = db.model('Test', schema, 'tests');

        await MyModel.create([{ name: 'a' }, { name: 'A' }]);

        const docs = await MyModel.find({ name: 'a' });

        assert.equal(docs.length, 2);
      });
    });

    describe('gh-1950', function() {
      it('ignores sort when passed to countDocuments', function() {
        const Product = db.model('Product', productSchema);
        return Product.create({}).
          then(() => Product.find().sort({ _id: 1 }).countDocuments({}).exec());
      });

      it.skip('ignores count when passed to sort', function() {
        const Product = db.model('Product', productSchema);
        return Product.find().count({}).sort({ _id: 1 }).exec();
      });
    });

    it('excludes _id when select false and inclusive mode (gh-3010)', async function() {
      const User = db.model('User', {
        _id: {
          select: false,
          type: Schema.Types.ObjectId,
          default: () => new mongoose.Types.ObjectId()
        },
        username: String
      });

      const user = await User.create({ username: 'Val' });
      const users = await User.find({ _id: user._id }).select('username').exec();
      assert.equal(users.length, 1);
      assert.ok(!users[0]._id);
      assert.equal(users[0].username, 'Val');
    });

    it('doesnt reverse key order for update docs (gh-3215)', function() {
      const Test = db.model('Test', {
        arr: [{ date: Date, value: Number }]
      });

      const q = Test.updateOne({}, {
        $push: {
          arr: {
            $each: [{ date: new Date(), value: 1 }],
            $sort: { value: -1, date: -1 }
          }
        }
      });

      assert.deepEqual(Object.keys(q.getUpdate().$push.arr.$sort),
        ['value', 'date']);
    });

    it('timestamps with $each (gh-4805)', async function() {
      const nestedSchema = new Schema({ value: Number }, { timestamps: true });
      const Test = db.model('Test', new Schema({
        arr: [nestedSchema]
      }, { timestamps: true }));

      await Test.updateOne({}, {
        $push: {
          arr: {
            $each: [{ value: 1 }]
          }
        }
      });
    });

    it('handles nested $ (gh-3265)', function() {
      const Post = db.model('BlogPost', {
        title: String,
        answers: [{
          details: String,
          stats: {
            votes: Number,
            count: Number
          }
        }]
      });

      const answersUpdate = { details: 'blah', stats: { votes: 1, count: '3' } };
      const q = Post.updateOne(
        { 'answers._id': '507f1f77bcf86cd799439011' },
        { $set: { 'answers.$': answersUpdate } });

      assert.deepEqual(q.getUpdate().$set['answers.$'].stats,
        { votes: 1, count: 3 });
    });

    it('$geoWithin with single nested schemas (gh-4044)', async function() {
      const locationSchema = new Schema({
        type: { type: String },
        coordinates: []
      }, { _id: false });

      const schema = new Schema({
        title: String,
        location: { type: locationSchema, required: true }
      });
      schema.index({ location: '2dsphere' });

      const Model = db.model('Test', schema);

      const query = {
        location: {
          $geoWithin: {
            $geometry: {
              type: 'Polygon',
              coordinates: [[[-1, 0], [-1, 3], [4, 3], [4, 0], [-1, 0]]]
            }
          }
        }
      };
      await Model.find(query);
    });

    it('setDefaultsOnInsert with empty update (gh-3825)', async function() {
      const schema = new mongoose.Schema({
        test: { type: Number, default: 8472 },
        name: String
      });

      const MyModel = db.model('Test', schema);

      const opts = { upsert: true };
      await MyModel.updateOne({}, {}, opts);
      const doc = await MyModel.findOne({});
      assert.ok(doc);
      assert.strictEqual(doc.test, 8472);
      assert.ok(!doc.name);
    });

    it('custom query methods (gh-3714)', async function() {
      const schema = new mongoose.Schema({
        name: String
      });

      schema.query.byName = function(name) {
        return this.find({ name: name });
      };

      const MyModel = db.model('Test', schema);
      await MyModel.create({ name: 'Val' });
      const docs = await MyModel.find().byName('Val').exec();
      assert.equal(docs.length, 1);
      assert.equal(docs[0].name, 'Val');
    });

    it('string as input (gh-4378)', async function() {
      const schema = new mongoose.Schema({
        name: String
      });

      const MyModel = db.model('Test', schema);

      const error = await MyModel.findOne('').then(() => null, err => err);
      assert.ok(error);
      assert.equal(error.name, 'ObjectParameterError');
    });

    it('handles geoWithin with $center and mongoose object (gh-4419)', async function() {
      const areaSchema = new Schema({
        name: String,
        circle: Array
      });
      const Area = db.model('Test', areaSchema);

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
      const Place = db.model('Place', placeSchema);

      const tromso = new Area({
        name: 'Tromso, Norway',
        circle: [[18.89, 69.62], 10 / 3963.2]
      });
      await tromso.save();

      const airport = {
        name: 'Center',
        geometry: {
          type: 'Point',
          coordinates: [18.895, 69.67]
        }
      };
      await Place.create(airport);

      const q = {
        geometry: {
          $geoWithin: {
            $centerSphere: tromso.circle
          }
        }
      };
      const docs = await Place.find(q).exec();
      assert.equal(docs.length, 1);
      assert.equal(docs[0].name, 'Center');
    });

    it('$not with objects (gh-4495)', function() {
      const schema = new Schema({
        createdAt: Date
      });

      const M = db.model('Test', schema);
      const q = M.find({
        createdAt: {
          $not: {
            $gte: '2016/09/02 00:00:00',
            $lte: '2016/09/02 23:59:59'
          }
        }
      });
      q._castConditions();

      assert.ok(q._conditions.createdAt.$not.$gte instanceof Date);
      assert.ok(q._conditions.createdAt.$not.$lte instanceof Date);
    });

    it('geoIntersects with mongoose doc as coords (gh-4408)', async function() {
      const lineStringSchema = new Schema({
        name: String,
        geo: {
          type: { type: String, default: 'LineString' },
          coordinates: [[Number]]
        }
      });

      const LineString = db.model('Test', lineStringSchema);

      const ls = {
        name: 'test',
        geo: {
          coordinates: [[14.59, 24.847], [28.477, 15.961]]
        }
      };
      const ls2 = {
        name: 'test2',
        geo: {
          coordinates: [[27.528, 25.006], [14.063, 15.591]]
        }
      };
      const [ls1] = await LineString.create([ls, ls2]);
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
      const results = await LineString.find(query);
      assert.equal(results.length, 2);
    });

    it('string with $not (gh-4592)', async function() {
      const TestSchema = new Schema({
        test: String
      });

      const Test = db.model('Test', TestSchema);

      await Test.findOne({ test: { $not: /test/ } });
    });

    it('does not cast undefined to null in mongoose (gh-6236)', async function() {
      const TestSchema = new Schema({
        test: String
      });

      const Test = db.model('Test', TestSchema);

      await Test.create({});

      const q = Test.find({ test: void 0 });
      const res = await q.exec();

      assert.strictEqual(q.getFilter().test, void 0);
      assert.ok('test' in q.getFilter());
      assert.equal(res.length, 1);
    });

    it('runs query setters with _id field (gh-5351)', function() {
      const testSchema = new Schema({
        val: { type: String }
      });

      const Test = db.model('Test', testSchema);
      return Test.create({ val: 'A string' }).
        then(function() {
          return Test.findOne({});
        }).
        then(function(doc) {
          return Test.findOneAndUpdate({ _id: doc._id }, {
            $set: {
              val: 'another string'
            }
          }, { new: true });
        }).
        then(function(doc) {
          assert.ok(doc);
          assert.equal(doc.val, 'another string');
        });
    });

    it('runs setters if query field is an array (gh-6277)', async function() {
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
      const Model = db.model('Test', schema);


      await Model.find({ strings: 'test' });
      assert.equal(setterCalled.length, 0);

      await Model.find({ strings: ['test'] });
      assert.equal(setterCalled.length, 1);
      assert.deepEqual(setterCalled, [['test']]);
    });

    it('$exists under $not (gh-4933)', async function() {
      const TestSchema = new Schema({
        test: String
      });

      const Test = db.model('Test', TestSchema);

      await Test.findOne({ test: { $not: { $exists: true } } });
    });

    it('geojson underneath array (gh-5467)', async function() {
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

      const Story = db.model('Story', storySchema);

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
      await Story.init();
      await Story.updateOne(q, { name: 'test' }, { upsert: true });
    });

    it('slice respects schema projections (gh-5450)', async function() {
      const gameSchema = Schema({
        name: String,
        developer: {
          type: String,
          select: false
        },
        arr: [Number]
      });
      const Game = db.model('Test', gameSchema);

      await Game.create({ name: 'Mass Effect', developer: 'BioWare', arr: [1, 2, 3] });
      const doc = await Game.findOne({ name: 'Mass Effect' }).slice({ arr: 1 });
      assert.equal(doc.name, 'Mass Effect');
      assert.deepEqual(doc.toObject().arr, [1]);
      assert.ok(!doc.developer);
    });

    it('overwrites when passing an object when path already set to primitive (gh-6097)', function() {
      const schema = new mongoose.Schema({ status: String });

      const Model = db.model('Test', schema);

      return Model.
        where({ status: 'approved' }).
        where({ status: { $ne: 'delayed' } });
    });

    it('$exists for arrays and embedded docs (gh-4937)', async function() {
      const subSchema = new Schema({
        name: String
      });
      const TestSchema = new Schema({
        test: [String],
        sub: subSchema
      });

      const Test = db.model('Test', TestSchema);

      const q = { test: { $exists: true }, sub: { $exists: false } };
      await Test.findOne(q);
    });

    it('report error in pre hook (gh-5520)', async function() {
      const TestSchema = new Schema({ name: String });

      const ops = [
        'count',
        'find',
        'findOne',
        'findOneAndRemove',
        'findOneAndUpdate',
        'replaceOne',
        'updateOne',
        'updateMany'
      ];

      ops.forEach(function(op) {
        TestSchema.pre(op, function(next) {
          this.error(new Error(op + ' error'));
          next();
        });
      });

      const TestModel = db.model('Test', TestSchema);

      for (const op of ops) {
        const q = TestModel.find({}).updateOne({ name: 'test' });
        const error = await q[op]().then(() => null, err => err);
        assert.ok(error);
        assert.equal(error.message, op + ' error');
      }
    });

    it('cast error with custom error (gh-5520)', function() {
      const TestSchema = new Schema({ name: Number });

      const TestModel = db.model('Test', TestSchema);

      return TestModel.
        find({ name: 'not a number' }).
        error(new Error('woops')).
        exec().
        then(() => assert.ok(false), error => {
          assert.ok(error);
          // CastError check happens **after** `.error()`
          assert.equal(error.name, 'CastError');
        });
    });

    it('change deleteOne to updateOne for soft deletes using $isDeleted (gh-4428)', async function() {
      const schema = new mongoose.Schema({
        name: String,
        isDeleted: Boolean
      });

      schema.pre('deleteOne', { document: true, query: false }, async function() {
        await this.constructor.updateOne({ isDeleted: true });
        this.$isDeleted(true);
      });

      const M = db.model('Test', schema);

      let doc = await M.create({ name: 'test' });
      await doc.deleteOne();
      doc = await M.findById(doc._id);
      assert.ok(doc);
      assert.equal(doc.isDeleted, true);
    });

    it('child schema with select: false in multiple paths (gh-5603)', async function() {
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
      const Parent = db.model('Parent', ParentSchema);
      const ogParent = new Parent();
      ogParent.child = { field: 'test' };
      ogParent.child2 = { field: 'test' };
      await ogParent.save();
      const doc = await Parent.findById(ogParent._id);
      assert.ok(!doc.child.field);
      assert.ok(!doc.child2.field);
    });

    it('errors in post init (gh-5592)', async function() {
      const TestSchema = new Schema();

      let count = 0;
      TestSchema.post('init', function() {
        throw new Error('Failed! ' + (count++));
      });

      const TestModel = db.model('Test', TestSchema);

      const docs = [];
      for (let i = 0; i < 10; ++i) {
        docs.push({});
      }

      await TestModel.create(docs);
      const error = await TestModel.find({}).then(() => null, err => err);
      assert.equal(error.message, 'Failed! 0');
      assert.equal(count, 10);
    });

    it('with non-object args (gh-1698)', async function() {
      const schema = new mongoose.Schema({
        email: String
      });
      const M = db.model('Test', schema);

      const error = await M.find(42).then(() => null, err => err);
      assert.ok(error);
      assert.equal(error.name, 'ObjectParameterError');
    });

    it('queries with BSON overflow (gh-5812)', async function() {
      this.timeout(10000);

      const schema = new mongoose.Schema({
        email: String
      });

      const model = db.model('Test', schema);
      const bigData = new Array(800000);

      for (let i = 0; i < bigData.length; ++i) {
        bigData[i] = 'test1234567890';
      }

      const error = await model.find({ email: { $in: bigData } }).lean().then(() => null, err => err);
      assert.ok(error);
    });

    it('explain() (gh-6625)', async function() {
      const schema = new mongoose.Schema({ n: Number });

      const Model = db.model('Test', schema);

      await Model.create({ n: 42 });

      let res = await Model.find().explain('queryPlanner');
      assert.ok(res.queryPlanner);

      res = await Model.find().explain();
      assert.ok(res.queryPlanner);

      res = await Model.find().explain().explain(false);
      assert.equal(res[0].n, 42);
    });

    it('cast embedded discriminators with dot notation (gh-6027)', async function() {

      const ownerSchema = new Schema({
        _id: false
      }, {
        discriminatorKey: 'type'
      });

      const userOwnerSchema = new Schema({
        id: { type: Schema.Types.ObjectId, required: true }
      }, { _id: false });

      const tagOwnerSchema = new Schema({
        id: { type: String, required: true }
      }, { _id: false });

      const activitySchema = new Schema({
        owner: { type: ownerSchema, required: true }
      }, { _id: false });

      activitySchema.path('owner').discriminator('user', userOwnerSchema);
      activitySchema.path('owner').discriminator('tag', tagOwnerSchema);

      const Activity = db.model('Test', activitySchema);

      await Activity.insertMany([
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

      const activity = await Activity.findOne({
        'owner.type': 'user',
        'owner.id': '5a042f742a91c1db447534d5'
      });
      assert.ok(activity);
      assert.equal(activity.owner.type, 'user');
    });

    it('cast embedded discriminators with embedded obj (gh-6027)', async function() {

      const ownerSchema = new Schema({
        _id: false
      }, {
        discriminatorKey: 'type'
      });

      const userOwnerSchema = new Schema({
        id: { type: Schema.Types.ObjectId, required: true }
      }, { _id: false });

      const tagOwnerSchema = new Schema({
        id: { type: String, required: true }
      }, { _id: false });

      const activitySchema = new Schema({
        owner: { type: ownerSchema, required: true }
      }, { _id: false });

      activitySchema.path('owner').discriminator('user', userOwnerSchema);
      activitySchema.path('owner').discriminator('tag', tagOwnerSchema);

      const Activity = db.model('Test', activitySchema);

      await Activity.insertMany([
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

      const activity = await Activity.findOne({
        owner: {
          type: 'user',
          id: '5a042f742a91c1db447534d5'
        }
      });
      assert.ok(activity);
      assert.equal(activity.owner.type, 'user');
    });

    it('cast embedded discriminators with $elemMatch discriminator key (gh-7449)', async function() {
      const ListingLineSchema = new Schema({
        sellerId: Number
      });

      const OrderSchema = new Schema({
        lines: [new Schema({
          amount: Number
        }, { discriminatorKey: 'kind' })]
      });

      OrderSchema.path('lines').discriminator('listing', ListingLineSchema);

      const Order = db.model('Order', OrderSchema);

      await Order.create({ lines: { kind: 'listing', sellerId: 42 } });

      let count = await Order.countDocuments({
        lines: { $elemMatch: { kind: 'listing', sellerId: '42' } }
      });
      assert.strictEqual(count, 1);

      count = await Order.countDocuments({
        lines: { $elemMatch: { sellerId: '42' } }
      });
      assert.strictEqual(count, 0);
    });

    it('handles geoWithin with mongoose docs (gh-4392)', async function() {
      const areaSchema = new Schema({
        name: { type: String },
        loc: {
          type: {
            type: String,
            enum: ['Polygon'],
            default: 'Polygon'
          },
          coordinates: [[[Number]]]
        }
      });

      const Area = db.model('Test', areaSchema);

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

      const Observation = db.model('Test1', observationSchema);
      await Observation.init();


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
      await tromso.save();

      const observation = {
        geometry: {
          type: 'Point',
          coordinates: [18.895, 69.67]
        }
      };
      await Observation.create(observation);


      const docs = await Observation.
        find().
        where('geometry').within().geometry(tromso.loc).
        exec();

      assert.equal(docs.length, 1);
    });
  });

  describe('handles falsy and object projections with defaults (gh-3256)', function() {
    let MyModel;

    before(function() {
      const PersonSchema = new Schema({
        name: String,
        lastName: String,
        dependents: [String],
        salary: { type: Number, default: 25000 }
      });

      db.deleteModel(/Person/);
      MyModel = db.model('Person', PersonSchema);
    });

    beforeEach(async function() {
      await MyModel.collection.insertOne({
        name: 'John',
        lastName: 'Doe',
        dependents: ['Jake', 'Jill', 'Jane']
      });
    });

    it('falsy projection', async function() {
      const person = await MyModel.findOne({ name: 'John' }, { lastName: false });
      assert.equal(person.salary, 25000);
    });

    it('slice projection', async function() {
      const person = await MyModel.findOne({ name: 'John' }, { dependents: { $slice: 1 } });
      assert.equal(person.salary, 25000);
    });

    it('empty projection', async function() {
      const person = await MyModel.findOne({ name: 'John' }, {}).exec();
      assert.equal(person.salary, 25000);
    });
  });

  describe('count', function() {
    it('calls utils.toObject on conditions (gh-6323)', async function() {

      const priceSchema = new Schema({
        key: String,
        price: Number
      });

      const Model = db.model('Test', priceSchema);

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

      await Model.create(tests);
      const count = await Model.countDocuments(query);
      assert.strictEqual(count, 9);
    });
  });

  describe('setQuery', function() {
    it('replaces existing query with new value (gh-6854)', function() {
      const q = new Query({});
      q.where('userName').exists();
      q.setQuery({ a: 1 });
      assert.deepStrictEqual(q._conditions, { a: 1 });
    });
  });

  it('map (gh-7142)', async function() {
    const Model = db.model('Test', new Schema({ name: String }));


    await Model.create({ name: 'test' });
    const now = new Date();
    const res = await Model.findOne().transform(res => {
      res.loadedAt = now;
      return res;
    });

    assert.equal(res.loadedAt, now);
  });

  describe('orFail (gh-6841)', function() {
    let Model;

    before(function() {
      db.deleteModel(/Test/);
      Model = db.model('Test', new Schema({ name: String }));
    });

    beforeEach(function() {
      return Model.deleteMany({}).then(() => Model.create({ name: 'Test' }));
    });

    it('find()', async function() {
      let threw = false;
      try {
        await Model.find({ name: 'na' }).orFail(() => new Error('Oops!'));
      } catch (error) {
        assert.ok(error);
        assert.equal(error.message, 'Oops!');
        threw = true;
      }
      assert.ok(threw);

      // Shouldn't throw
      const res = await Model.find({ name: 'Test' }).orFail(new Error('Oops'));
      assert.equal(res[0].name, 'Test');
    });

    it('findOne()', async function() {
      try {
        await Model.findOne({ name: 'na' }).orFail(() => new Error('Oops!'));
        assert.ok(false);
      } catch (error) {
        assert.ok(error);
        assert.equal(error.message, 'Oops!');
      }

      // Shouldn't throw
      const res = await Model.findOne({ name: 'Test' }).orFail(new Error('Oops'));
      assert.equal(res.name, 'Test');
    });

    it('deleteMany()', async function() {
      let threw = false;
      try {
        await Model.deleteMany({ name: 'na' }).orFail(new Error('Oops!'));
      } catch (error) {
        assert.ok(error);
        assert.equal(error.message, 'Oops!');
        threw = true;
      }
      assert.ok(threw);

      // Shouldn't throw
      const res = await Model.deleteMany({ name: 'Test' }).orFail(new Error('Oops'));
      assert.equal(res.deletedCount, 1);
    });

    it('deleteOne()', async function() {
      let threw = false;
      try {
        await Model.deleteOne({ name: 'na' }).orFail(new Error('Oops!'));
      } catch (error) {
        assert.ok(error);
        assert.equal(error.message, 'Oops!');
        threw = true;
      }
      assert.ok(threw);

      // Shouldn't throw
      const res = await Model.deleteOne({ name: 'Test' }).orFail(new Error('Oops'));
      assert.equal(res.deletedCount, 1);
    });

    it('replaceOne()', async function() {
      let threw = false;
      try {
        await Model.replaceOne({ name: 'na' }, { name: 'bar' }).orFail(new Error('Oops!'));
      } catch (error) {
        assert.ok(error);
        assert.equal(error.message, 'Oops!');
        threw = true;
      }
      assert.ok(threw);

      // Shouldn't throw
      const res = await Model.replaceOne({ name: 'Test' }, { name: 'bar' }).orFail(new Error('Oops'));
      assert.equal(res.modifiedCount, 1);
    });

    it('updateMany()', async function() {
      let threw = false;
      try {
        await Model.updateMany({ name: 'na' }, { name: 'foo' }).
          orFail(new Error('Oops!'));
      } catch (error) {
        assert.ok(error);
        assert.equal(error.message, 'Oops!');
        threw = true;
      }
      assert.ok(threw);

      // Shouldn't throw
      const res = await Model.updateMany({}, { name: 'Test2' }).orFail(new Error('Oops'));
      assert.equal(res.modifiedCount, 1);
    });

    it('updateOne()', async function() {
      let threw = false;
      try {
        await Model.updateOne({ name: 'na' }, { name: 'foo' }).
          orFail(new Error('Oops!'));
      } catch (error) {
        assert.ok(error);
        assert.equal(error.message, 'Oops!');
        threw = true;
      }
      assert.ok(threw);

      // Shouldn't throw
      const res = await Model.updateOne({}, { name: 'Test2' }).orFail(new Error('Oops'));
      assert.equal(res.modifiedCount, 1);
    });

    it('findOneAndUpdate()', async function() {
      let threw = false;
      try {
        const q = Model.findOneAndUpdate({ name: 'na' }, { name: 'foo' }).orFail(new Error('Oops!'));
        await q;
      } catch (error) {
        assert.ok(error);
        assert.equal(error.message, 'Oops!');
        threw = true;
      }
      assert.ok(threw);

      // Shouldn't throw
      const res = await Model.findOneAndUpdate({}, { name: 'Test2' }).orFail(new Error('Oops'));
      assert.equal(res.name, 'Test');
    });

    it('findOneAndDelete()', async function() {
      let threw = false;
      try {
        await Model.findOneAndDelete({ name: 'na' }).
          orFail(new Error('Oops!'));
      } catch (error) {
        assert.ok(error);
        assert.equal(error.message, 'Oops!');
        threw = true;
      }
      assert.ok(threw);

      // Shouldn't throw
      const res = await Model.findOneAndDelete({ name: 'Test' }).orFail(new Error('Oops'));
      assert.equal(res.name, 'Test');
    });

    it('executes before post hooks (gh-7280)', async function() {
      const schema = new Schema({ name: String });
      const docs = [];
      schema.post('findOne', function(doc, next) {
        docs.push(doc);
        next();
      });
      const Model = db.model('Test2', schema);

      await Model.create({ name: 'Test' });

      let threw = false;
      try {
        await Model.findOne({ name: 'na' }).orFail(new Error('Oops!'));
      } catch (error) {
        assert.ok(error);
        assert.equal(error.message, 'Oops!');
        threw = true;
      }
      assert.ok(threw);
      assert.equal(docs.length, 0);

      // Shouldn't throw
      const res = await Model.findOne({ name: 'Test' }).orFail(new Error('Oops'));
      assert.equal(res.name, 'Test');
      assert.equal(docs.length, 1);
    });

    it('throws DocumentNotFoundError by default execute (gh-7409)', async function() {

      const err = await Model.findOne({ name: 'na' }).
        orFail().
        then(() => null, err => err);
      assert.equal(err.name, 'DocumentNotFoundError', err.stack);
      assert.ok(err.message.indexOf('na') !== -1, err.message);
      assert.ok(err.message.indexOf('"Test"') !== -1, err.message);
      assert.deepEqual(err.filter, { name: 'na' });
    });

    it('does not fire on CastError (gh-13165)', async function() {
      try {
        await Model.findOne({ _id: 'bad' }).orFail();
        assert.ok(false);
      } catch (error) {
        assert.ok(error);
        assert.equal(error.name, 'CastError');
      }
    });
  });

  describe('getPopulatedPaths', function() {
    it('doesn\'t break on a query without population (gh-6677)', async function() {
      const schema = new Schema({ name: String });
      schema.pre('findOne', function() {
        assert.deepStrictEqual(this.getPopulatedPaths(), []);
      });

      const Model = db.model('Test', schema);


      await Model.findOne({});
    });

    it('returns an array of populated paths as strings (gh-6677)', async function() {
      const otherSchema = new Schema({ name: String });
      const schema = new Schema({
        other: {
          type: Schema.Types.ObjectId,
          ref: 'Test1'
        }
      });
      schema.pre('findOne', function() {
        assert.deepStrictEqual(this.getPopulatedPaths(), ['other']);
      });

      const Other = db.model('Test1', otherSchema);
      const Test = db.model('Test', schema);

      const other = new Other({ name: 'one' });
      const test = new Test({ other: other._id });


      await other.save();
      await test.save();
      await Test.findOne({}).populate('other');
    });

    it('returns deep populated paths (gh-7757)', function() {
      db.model('Test3', new Schema({ name: String }));
      db.model('Test2', new Schema({ level3: { type: String, ref: 'Test3' } }));
      const L1 = db.model('Test',
        new Schema({ level1: { type: String, ref: 'Test2' } }));

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
      const q = new Query({});
      q.set('testing', '123');
      q.setUpdate({ $set: { newPath: 'newValue' } });
      assert.strictEqual(q._update.$set.testing, undefined);
      assert.strictEqual(q._update.$set.newPath, 'newValue');
    });
  });

  describe('get() (gh-7312)', function() {
    it('works with using $set', function() {
      const q = new Query({});
      q.updateOne({}, { $set: { name: 'Jean-Luc Picard' } });

      assert.equal(q.get('name'), 'Jean-Luc Picard');
    });

    it('works with $set syntactic sugar', function() {
      const q = new Query({});
      q.updateOne({}, { name: 'Jean-Luc Picard' });

      assert.equal(q.get('name'), 'Jean-Luc Picard');
    });

    it('works with mixed', function() {
      const q = new Query({});
      q.updateOne({}, { name: 'Jean-Luc Picard', $set: { age: 59 } });

      assert.equal(q.get('name'), 'Jean-Luc Picard');
    });

    it('$set overwrites existing', function() {
      const M = db.model('Test', new Schema({ name: String }));
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

  it('allows skipping timestamps in updateOne() (gh-6980)', async function() {
    const schema = new Schema({ name: String }, { timestamps: true });

    const M = db.model('Test', schema);


    const doc = await M.create({ name: 'foo' });
    assert.ok(doc.createdAt);
    assert.ok(doc.updatedAt);

    const start = Date.now();
    await new Promise((resolve) => setTimeout(resolve, 10));

    const opts = { timestamps: false, new: true };
    const res = await M.findOneAndUpdate({}, { name: 'bar' }, opts);

    assert.equal(res.name, 'bar');
    assert.ok(res.updatedAt.valueOf() <= start,
      `Expected ${res.updatedAt.valueOf()} <= ${start}`);
  });

  it('increments timestamps for nested subdocs (gh-4412)', async function() {
    const childSchema = new Schema({ name: String }, {
      timestamps: true,
      versionKey: false
    });
    const parentSchema = new Schema({ child: childSchema }, {
      // timestamps: true,
      versionKey: false
    });
    const Parent = db.model('Parent', parentSchema);


    let doc = await Parent.create({ child: { name: 'foo' } });
    assert.ok(doc.child.updatedAt);
    assert.ok(doc.child.createdAt);

    let start = Date.now();
    await new Promise((resolve) => setTimeout(resolve, 10));

    await Parent.updateOne({}, { $set: { 'child.name': 'Luke' } });

    doc = await Parent.findOne();

    let updatedAt = doc.child.updatedAt.valueOf();

    assert.ok(updatedAt > start, `Expected ${updatedAt} > ${start}`);

    // Overwrite whole doc
    start = Date.now();
    await new Promise((resolve) => setTimeout(resolve, 10));

    await Parent.updateOne({}, { $set: { child: { name: 'Luke' } } });

    doc = await Parent.findOne();

    const createdAt = doc.child.createdAt.valueOf();
    updatedAt = doc.child.updatedAt.valueOf();

    assert.ok(createdAt > start, `Expected ${createdAt} > ${start}`);
    assert.ok(updatedAt > start, `Expected ${updatedAt} > ${start}`);
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
      Parent = db.model('Parent', parentSchema);
    });

    it('$set nested property with numeric position', async function() {

      const kids = 'foo bar baz'.split(' ').map(n => { return { name: `${n}` };});
      const doc = await Parent.create({ children: kids });
      assert.ok(doc.children[0].updatedAt && doc.children[0].createdAt);
      assert.ok(doc.children[1].updatedAt && doc.children[1].createdAt);
      assert.ok(doc.children[2].updatedAt && doc.children[2].createdAt);

      const start = new Date();
      await new Promise((resolve) => setTimeout(resolve, 10));

      const cond = {};
      const update = { $set: { 'children.0.name': 'Luke' } };
      await Parent.updateOne(cond, update);

      const found = await Parent.findOne({});
      const updatedAt = found.children[0].updatedAt;
      const name = found.children[0].name;
      assert.ok(name, 'Luke');
      assert.ok(updatedAt.valueOf() > start.valueOf(),
        `Expected ${updatedAt} > ${start}`);
    });

    it('$set numeric element', async function() {

      const kids = 'foo bar baz'.split(' ').map(n => { return { name: `${n}` };});
      const doc = await Parent.create({ children: kids });
      assert.ok(doc.children[0].updatedAt && doc.children[0].createdAt);
      assert.ok(doc.children[1].updatedAt && doc.children[1].createdAt);
      assert.ok(doc.children[2].updatedAt && doc.children[2].createdAt);

      const start = Date.now();
      await new Promise((resolve) => setTimeout(resolve, 10));

      const cond = {};
      const update = { $set: { 'children.0': { name: 'Luke' } } };
      await Parent.updateOne(cond, update);

      const found = await Parent.findOne({});
      const updatedAt = found.children[0].updatedAt.valueOf();
      const name = found.children[0].name;
      assert.ok(name, 'Luke');
      assert.ok(updatedAt > start, `Expected ${updatedAt} > ${start}`);
    });

    it('$set with positional operator', async function() {

      const kids = 'foo bar baz'.split(' ').map(n => { return { name: `${n}` };});
      const doc = await Parent.create({ children: kids });
      assert.ok(doc.children[0].updatedAt && doc.children[0].createdAt);
      assert.ok(doc.children[1].updatedAt && doc.children[1].createdAt);
      assert.ok(doc.children[2].updatedAt && doc.children[2].createdAt);

      const start = Date.now();
      await new Promise((resolve) => setTimeout(resolve, 10));

      const cond = { 'children.name': 'bar' };
      const update = { $set: { 'children.$.name': 'Luke' } };
      await Parent.updateOne(cond, update);

      const found = await Parent.findOne({});
      const updatedAt = found.children[1].updatedAt.valueOf();
      const name = found.children[1].name;
      assert.ok(name, 'Luke');
      assert.ok(updatedAt > start, `Expected ${updatedAt} > ${start}`);
    });

    it('$set with positional operator and array (gh-7106)', async function() {

      const subSub = new Schema({ x: String });
      const sub = new Schema({ name: String, subArr: [subSub] });
      const schema = new Schema({ arr: [sub] }, {
        timestamps: true
      });

      const Test = db.model('Test', schema);

      const cond = { arr: { $elemMatch: { name: 'abc' } } };
      const set = { $set: { 'arr.$.subArr': [{ x: 'b' }] } };

      await Test.create({
        arr: [{
          name: 'abc',
          subArr: [{ x: 'a' }]
        }]
      });
      await Test.updateOne(cond, set);

      const res = await Test.collection.findOne({});

      assert.ok(Array.isArray(res.arr));
      assert.strictEqual(res.arr[0].subArr[0].x, 'b');
    });
  });

  it('strictQuery option (gh-4136) (gh-7178)', async function() {
    const modelSchema = new Schema({
      field: Number,
      nested: { path: String }
    }, { strictQuery: 'throw' });

    const Model = db.model('Test', modelSchema);

    // `find()` on a top-level path not in the schema
    let err = await Model.find({ notInschema: 1 }).then(() => null, e => e);
    assert.ok(err);
    assert.ok(err.message.indexOf('strictQuery') !== -1, err.message);

    // Shouldn't throw on nested path re: gh-7178
    await Model.create({ nested: { path: 'a' } });
    const doc = await Model.findOne({ nested: { path: 'a' } });
    assert.ok(doc);

    // `find()` on a nested path not in the schema
    err = await Model.find({ 'nested.bad': 'foo' }).then(() => null, e => e);
    assert.ok(err);
    assert.ok(err.message.indexOf('strictQuery') !== -1, err.message);
  });

  it('strictQuery does not inherit from strict (gh-11861)', async function() {
    const modelSchema = new Schema({
      field: Number,
      nested: { path: String }
    }, { strict: 'throw' });

    const Model = db.model('Test', modelSchema);

    // `find()` on a top-level path not in the schema
    const err = await Model.find({ notInschema: 1 }).then(() => null, e => e);
    assert.ifError(err);
  });

  it('strictQuery is false by default (gh-11861)', async function() {
    const modelSchema = new Schema({ field: Number }, {});
    const Model = db.model('Test', modelSchema);

    await Model.create({ field: 1 });
    const docs = await Model.find({ nonexistingField: 1 });

    assert.equal(docs.length, 0);
  });

  it('strictQuery = true (gh-6032)', async function() {
    const modelSchema = new Schema({ field: Number }, { strictQuery: true });

    const Model = db.model('Test', modelSchema);

    await Model.create({ field: 1 });

    const docs = await Model.find({ nonexistingField: 1 });

    assert.equal(docs.length, 1);
  });

  it('function defaults run after query result is inited (gh-7182)', async function() {
    const schema = new Schema({ kind: String, hasDefault: String });
    schema.path('hasDefault').default(function() {
      return this.kind === 'test' ? 'success' : 'fail';
    });


    const Model = db.model('Test', schema);

    await Model.create({ kind: 'test' });
    await Model.updateOne({}, { $unset: { hasDefault: 1 } });

    const doc = await Model.findOne();
    assert.equal(doc.hasDefault, 'success');
  });

  it('merging objectids with where() (gh-7360)', function() {
    const Test = db.model('Test', new Schema({}));

    return Test.create({}).
      then(doc => Test.find({ _id: doc._id.toString() }).where({ _id: doc._id })).
      then(res => assert.equal(res.length, 1));
  });

  it('maxTimeMS() (gh-7254)', async function() {
    const Model = db.model('Test', new Schema({}));


    await Model.create({});

    const res = await Model.find({ $where: 'sleep(1000) || true' }).
      maxTimeMS(10).
      then(() => null, err => err);
    assert.ok(res);
    assert.ok(res.message.indexOf('time limit') !== -1, res.message);
  });

  it('connection-level maxTimeMS() (gh-4066)', async function() {
    db.options = db.options || {};
    db.options.maxTimeMS = 10;
    const Model = db.model('Test', new Schema({}));


    await Model.create({});

    const res = await Model.find({ $where: 'sleep(250) || true' }).
      then(() => null, err => err);
    assert.ok(res);
    assert.ok(res.message.indexOf('time limit') !== -1, res.message);
    delete db.options.maxTimeMS;
  });

  it('mongoose-level maxTimeMS() (gh-4066)', async function() {
    db.base.options = db.base.options || {};
    db.base.options.maxTimeMS = 10;
    const Model = db.model('Test', new Schema({}));


    await Model.create({});

    const res = await Model.find({ $where: 'sleep(250) || true' }).
      then(() => null, err => err);
    assert.ok(res);
    assert.ok(res.message.indexOf('time limit') !== -1, res.message);
    delete db.base.options.maxTimeMS;
  });

  it('throws error with updateOne() and overwrite (gh-7475)', function() {
    const Model = db.model('Test', Schema({ name: String }));

    return Model.updateOne({}, { name: 'bar' }, { overwrite: true }).then(
      () => { throw new Error('Should have failed'); },
      err => {
        assert.ok(err.message.indexOf('updateOne') !== -1);
      }
    );
  });

  describe('merge()', function() {
    it('copies populate() (gh-1790)', async function() {
      const Car = db.model('Car', {
        color: String,
        model: String,
        owner: {
          type: Schema.Types.ObjectId,
          ref: 'Person'
        }
      });

      const Person = db.model('Person', {
        name: String
      });


      const val = await Person.create({ name: 'Val' });
      await Car.create({ color: 'Brown', model: 'Subaru', owner: val._id });

      const q = Car.findOne().populate('owner');

      const res = await Car.findOne().merge(q);

      assert.equal(res.owner.name, 'Val');
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

      const M = db.model('Test', schema);

      const opts = { runValidators: true, upsert: true, new: true };
      return M.findOneAndUpdate({}, { password: '6chars' }, opts).then(doc => {
        assert.equal(docCalls, 0);
        assert.equal(queryCalls, 1);
        assert.equal(doc.password, 'encryptedpassword');
      });
    });

    it('pre("validate") errors (gh-7187)', async function() {
      const addressSchema = Schema({ countryId: String });
      addressSchema.pre('validate', { query: true }, function() {
        throw new Error('Oops!');
      });
      const contactSchema = Schema({ addresses: [addressSchema] });
      const Contact = db.model('Test', contactSchema);

      const update = { addresses: [{ countryId: 'foo' }] };
      const err = await Contact.updateOne(
        {},
        update,
        { runValidators: true }
      ).then(() => null, err => err);

      assert.ok(err.errors['addresses.0']);
      assert.equal(err.errors['addresses.0'].message, 'Oops!');
    });
  });

  it('query with top-level _bsontype (gh-8222) (gh-8268)', async function() {
    const userSchema = Schema({ token: String }, { strictQuery: true });
    const User = db.model('Test', userSchema);

    const original = await User.create({ token: 'rightToken' });

    let doc = await User.findOne({ token: 'wrongToken', _bsontype: 'a' });
    assert.ok(!doc);

    doc = await User.findOne(original._id);
    assert.ok(doc);
    assert.equal(doc.token, 'rightToken');
  });

  it('casts $elemMatch with dbrefs (gh-8577)', async function() {
    const ChatSchema = new Schema({
      members: [{
        $ref: String,
        $id: mongoose.ObjectId,
        $db: String
      }]
    });
    const Chat = db.model('Test', ChatSchema);


    const doc = await Chat.create({
      members: [{ $ref: 'foo', $id: new mongoose.Types.ObjectId(), $db: 'foo' }]
    });

    const res = await Chat.findOne({
      members: { $elemMatch: { $id: doc.members[0].$id } }
    });
    assert.ok(res);
  });

  it('throws an error if executed multiple times (gh-7398)', async function() {
    const Test = db.model('Test', Schema({ name: String }));


    const q = Test.findOne();

    await q;

    let err = await q.then(() => null, err => err);
    assert.ok(err);
    assert.equal(err.name, 'MongooseError');
    assert.equal(err.message, 'Query was already executed: Test.findOne({})');
    assert.ok(err.originalStack);

    err = await q.clone().then(() => null, err => err);
    assert.ifError(err);
  });

  describe('stack traces', function() {
    it('includes calling file for filter cast errors (gh-8691)', async function() {
      if (typeof Deno !== 'undefined') {
        // Deno doesn't have V8 async stack traces
        return this.skip();
      }
      const toCheck = ['find', 'findOne', 'deleteOne'];
      const Model = db.model('Test', Schema({}));


      for (const fn of toCheck) {
        const err = await Model[fn]({ _id: 'fail' }).then(() => null, err => err);
        assert.ok(err);
        assert.ok(err.stack.includes(__filename), err.stack);
      }
    });
  });

  it('setter priorVal (gh-8629)', function() {
    const priorVals = [];
    const schema = Schema({
      name: {
        type: String,
        set: (v, priorVal) => {
          priorVals.push(priorVal);
          return v;
        }
      }
    });
    const Model = db.model('Test', schema);

    return Model.updateOne({}, { name: 'bar' }).exec().
      then(() => assert.deepEqual(priorVals, [null]));
  });

  describe('clone', function() {
    let Model;

    beforeEach(function() {
      const schema = new Schema({ name: String, age: Number });
      Model = db.model('Test', schema);

      return Model.create([
        { name: 'Jean-Luc Picard', age: 59 },
        { name: 'Will Riker', age: 29 }
      ]);
    });

    it('with findOne', async function() {
      const q = Model.findOne({ age: 29 });
      const q2 = q.clone();

      let doc = await q;
      assert.equal(doc.name, 'Will Riker');

      assert.deepEqual(q2._conditions, { age: 29 });
      doc = await q2;
      assert.equal(doc.name, 'Will Riker');

      const q3 = q.clone();
      assert.deepEqual(q3._conditions, { age: 29 });
      doc = await q3;
      assert.equal(doc.name, 'Will Riker');
    });

    it('with deleteOne', async function() {
      const q = Model.deleteOne({ age: 29 });

      await q;
      assert.equal(await Model.findOne({ name: 'Will Riker' }), null);
      await Model.create({ name: 'Will Riker', age: 29 });

      const q2 = q.clone();
      assert.deepEqual(q2._conditions, { age: 29 });
      await q2;
      assert.equal(await Model.findOne({ name: 'Will Riker' }), null);
    });

    it('with updateOne', async function() {
      const q = Model.updateOne({ name: 'Will Riker' }, { name: 'Thomas Riker' });

      await q;
      assert.equal(await Model.findOne({ name: 'Will Riker' }), null);
      await Model.updateOne({ name: 'Thomas Riker' }, { name: 'Will Riker' });

      const q2 = q.clone();
      assert.deepEqual(q2._conditions, { name: 'Will Riker' });
      assert.deepEqual(q2._update, { $set: { name: 'Thomas Riker' } });
      await q2;
      assert.equal(await Model.findOne({ name: 'Will Riker' }), null);
    });

    it('with distinct', async function() {
      const q = Model.distinct('name');

      const res = await q;
      assert.deepEqual(res.sort(), ['Jean-Luc Picard', 'Will Riker']);

      const q2 = q.clone();
      assert.deepEqual(q2._distinct, 'name');
      await q2;
      assert.deepEqual(res.sort(), ['Jean-Luc Picard', 'Will Riker']);
    });

    it('with hooks (gh-12365)', async function() {
      db.deleteModel('Test');

      const schema = new Schema({ name: String, age: Number });
      let called = 0;
      schema.pre('find', () => ++called);
      Model = db.model('Test', schema);

      assert.strictEqual(called, 0);

      const res = await Model.find().clone();
      assert.strictEqual(called, 1);
      assert.equal(res.length, 2);
      assert.deepEqual(res.map(doc => doc.name).sort(), ['Jean-Luc Picard', 'Will Riker']);
    });
  });

  it('casts filter according to discriminator schema if in filter (gh-8881)', async function() {
    const userSchema = new Schema({ name: String }, { discriminatorKey: 'kind' });
    const User = db.model('User', userSchema);


    const UserWithAge = User.discriminator('UserWithAge', new Schema({ age: Number }));
    await UserWithAge.create({ name: 'Hafez', age: 25 });

    // should cast `age` to number
    const user = await User.findOne({ kind: 'UserWithAge', age: '25' });

    assert.equal(user.name, 'Hafez');
    assert.equal(user.age, 25);
  });

  it('casts update object according to child discriminator schema when `discriminatorKey` is present (gh-8982)', async function() {
    const userSchema = new Schema({}, { discriminatorKey: 'kind' });
    const Person = db.model('Person', userSchema);


    const Worker = Person.discriminator('Worker', new Schema({ locations: [String] }));
    const worker = await Worker.create({ locations: ['US'] });

    // should cast `update` according to `Worker` schema
    await Person.updateOne({ _id: worker._id, kind: 'Worker' }, { $push: { locations: 'UK' } });

    const person = await Person.findOne({ _id: worker._id });

    assert.deepEqual(person.locations, ['US', 'UK']);
  });

  it('allows disabling `setDefaultsOnInsert` (gh-8410)', function() {
    const schema = new Schema({
      title: String,
      genre: { type: String, default: 'Action' }
    });

    const Movie = db.model('Movie', schema);

    const query = {};
    const update = { title: 'The Terminator' };
    const options = {
      new: true,
      upsert: true,
      setDefaultsOnInsert: false,
      lean: true
    };

    return Movie.deleteMany({}).
      then(() => Movie.findOneAndUpdate(query, update, options)).
      then(doc => {
        assert.strictEqual(doc.genre, void 0);
      });
  });

  it('throws readable error if `$and` and `$or` contain non-objects (gh-8948)', async function() {
    const userSchema = new Schema({ name: String });
    const Person = db.model('Person', userSchema);


    let err = await Person.find({ $and: [null] }).catch(err => err);
    assert.equal(err.name, 'CastError');
    assert.equal(err.path, '$and.0');

    err = await Person.find({ $or: [false] }).catch(err => err);
    assert.equal(err.name, 'CastError');
    assert.equal(err.path, '$or.0');

    err = await Person.find({ $nor: ['not an object'] }).catch(err => err);
    assert.equal(err.name, 'CastError');
    assert.equal(err.path, '$nor.0');
  });

  it('includes `undefined` in filters (gh-3944)', async function() {
    const userSchema = new Schema({ name: String, pwd: String });
    const Person = db.model('Person', userSchema);


    await Person.create([
      { name: 'test1', pwd: 'my secret' },
      { name: 'test2', pwd: null }
    ]);

    let res = await Person.findOne({ name: 'test1', pwd: void 0 });
    assert.equal(res, null);

    res = await Person.findOne({ name: 'test2', pwd: { $eq: void 0 } });
    assert.equal(res.name, 'test2');
  });

  it('handles push with array filters (gh-9977)', async function() {
    const questionSchema = new Schema({
      question_type: { type: String, enum: ['mcq', 'essay'] }
    }, { discriminatorKey: 'question_type', strict: 'throw' });

    const quizSchema = new Schema({
      quiz_title: String,
      questions: [questionSchema]
    }, { strict: 'throw' });
    const Quiz = db.model('Test', quizSchema);

    const mcqQuestionSchema = new Schema({
      text: String,
      choices: [{ choice_text: String, is_correct: Boolean }]
    }, { strict: 'throw' });

    quizSchema.path('questions').discriminator('mcq', mcqQuestionSchema);

    const id1 = new mongoose.Types.ObjectId();
    const id2 = new mongoose.Types.ObjectId();


    let quiz = await Quiz.create({
      quiz_title: 'quiz',
      questions: [
        {
          _id: id1,
          question_type: 'mcq',
          text: 'A or B?',
          choices: [
            { choice_text: 'A', is_correct: false },
            { choice_text: 'B', is_correct: true }
          ]
        },
        {
          _id: id2,
          question_type: 'mcq'
        }
      ]
    });

    const filter = { questions: { $elemMatch: { _id: id2, question_type: 'mcq' } } };
    await Quiz.updateOne(filter, {
      $push: {
        'questions.$.choices': {
          choice_text: 'choice 1',
          is_correct: false
        }
      }
    });

    quiz = await Quiz.findById(quiz);
    assert.equal(quiz.questions[1].choices.length, 1);
    assert.equal(quiz.questions[1].choices[0].choice_text, 'choice 1');

    await Quiz.updateOne({ questions: { $elemMatch: { _id: id2 } } }, {
      $push: {
        'questions.$[q].choices': {
          choice_text: 'choice 3',
          is_correct: false
        }
      }
    }, { arrayFilters: [{ 'q.question_type': 'mcq' }] });

    quiz = await Quiz.findById(quiz);
    assert.equal(quiz.questions[1].choices.length, 2);
    assert.equal(quiz.questions[1].choices[1].choice_text, 'choice 3');
  });

  it('Query#pre() (gh-9784)', async function() {
    const Question = db.model('Test', Schema({ answer: Number }));

    const q1 = Question.find({ answer: 42 });
    const called = [];
    q1.pre(function middleware() {
      called.push(this.getFilter());
    });
    await q1.exec();
    assert.equal(called.length, 1);
    assert.deepEqual(called[0], { answer: 42 });

    await Question.find({ answer: 42 });
    assert.equal(called.length, 1);
  });

  it('applies schema-level `select` on arrays (gh-10029)', function() {
    const testSchema = new mongoose.Schema({
      doesntpopulate: {
        type: [mongoose.Schema.Types.ObjectId],
        select: false
      },
      populatescorrectly: [{
        type: mongoose.Schema.Types.ObjectId,
        select: false
      }]
    });
    const Test = db.model('Test', testSchema);

    const q = Test.find();
    q._applyPaths();

    assert.deepEqual(q._fields, { doesntpopulate: 0, populatescorrectly: 0 });
  });

  it('sets `writeConcern` option correctly (gh-10009)', function() {
    const testSchema = new mongoose.Schema({
      name: String
    });
    const Test = db.model('Test', testSchema);

    const q = Test.find();
    q.writeConcern({ w: 'majority', wtimeout: 1000 });

    assert.deepEqual(q.options.writeConcern, { w: 'majority', wtimeout: 1000 });
  });
  it('no longer has the deprecation warning message with writeConcern gh-10083', async function() {
    const MySchema = new mongoose.Schema(
      {
        _id: { type: Number, required: true },
        op: { type: String, required: true },
        size: { type: Number, required: true },
        totalSize: { type: Number, required: true }
      },
      {
        versionKey: false,
        writeConcern: {
          w: 'majority',
          j: true,
          wtimeout: 15000
        }
      }
    );
    const Test = db.model('Test', MySchema); // pops up on creation of model

    const entry = await Test.create({ _id: 12345678, op: 'help', size: 54, totalSize: 104 });
    await entry.save();
  });

  it('sanitizeProjection option (gh-10243)', function() {
    const MySchema = Schema({ name: String, email: String });
    const Test = db.model('Test', MySchema);

    let q = Test.find().select({ email: '$name' });
    assert.deepEqual(q._fields, { email: '$name' });

    q = Test.find().setOptions({ sanitizeProjection: true }).select({ email: '$name' });
    assert.deepEqual(q._fields, { email: 1 });

    q = Test.find().select({ email: '$name' }).setOptions({ sanitizeProjection: true });
    assert.deepEqual(q._fields, { email: 1 });
  });

  it('sanitizeFilter option (gh-3944)', function() {
    const MySchema = Schema({ username: String, pwd: String });
    const Test = db.model('Test', MySchema);

    let q = Test.find({ username: 'val', pwd: 'my secret' }).setOptions({ sanitizeFilter: true });
    q._castConditions();
    assert.ifError(q.error());
    assert.deepEqual(q._conditions, { username: 'val', pwd: 'my secret' });

    q = Test.find({ username: 'val', pwd: { $ne: null } }).setOptions({ sanitizeFilter: true });
    q._castConditions();
    assert.ok(q.error());
    assert.equal(q.error().name, 'CastError');

    q = Test.find({ username: 'val', pwd: mongoose.trusted({ $gt: null }) }).
      setOptions({ sanitizeFilter: true });
    q._castConditions();
    assert.ifError(q.error());
    assert.deepEqual(q._conditions, { username: 'val', pwd: { $gt: null } });
  });
  it('should not error when $not is used with $size (gh-10716)', async function() {
    const barSchema = Schema({
      bar: String
    });
    const testSchema = Schema({ foo: String, bars: [barSchema] });
    const Test = db.model('Zulu', testSchema);
    const entry = await Test.create({ foo: 'hello', bars: [{ bar: 'world' }, { bar: 'world1' }] });
    await entry.save();
    const foos = await Test.find({ bars: { $not: { $size: 0 } } });
    assert.ok(foos);
  });
  it('should not error when $not is used on an array of strings (gh-11467)', async function() {
    const testSchema = Schema({ names: [String] });
    const Test = db.model('Test', testSchema);

    await Test.create([{ names: ['foo'] }, { names: ['bar'] }]);

    let res = await Test.find({ names: { $not: /foo/ } });
    assert.deepStrictEqual(res.map(el => el.names), [['bar']]);

    // MongoDB server < 4.4 doesn't support `{ $not: { $regex } }`, see:
    // https://github.com/Automattic/mongoose/runs/5441062834?check_suite_focus=true
    const version = await start.mongodVersion();
    if (version[0] < 4 || (version[0] === 4 && version[1] < 4)) {
      return;
    }

    res = await Test.find({ names: { $not: { $regex: 'foo' } } });
    assert.deepStrictEqual(res.map(el => el.names), [['bar']]);
  });
  it('adding `exec` option does not affect the query (gh-11416)', async() => {
    const userSchema = new Schema({
      name: { type: String }
    });


    const User = db.model('User', userSchema);
    const createdUser = await User.create({ name: 'Hafez' });
    const users = await User.find({ _id: createdUser._id }).setOptions({ exec: false });

    assert.ok(users.length, 1);
  });

  it('handles queries with EJSON deserialized RegExps (gh-11597)', async function() {
    const testSchema = new mongoose.Schema({
      name: String
    });
    const Test = db.model('Test', testSchema);

    await Test.create({ name: '@foo.com' });
    await Test.create({ name: 'adfadfasdf' });

    const result = await Test.find(
      EJSON.deserialize({ name: { $regex: '@foo.com', $options: 'i' } })
    );
    assert.equal(result.length, 1);
    assert.equal(result[0].name, '@foo.com');
  });

  it('should return query helper supplied in schema options query property instead of undefined', async function() {
    const Model = db.model('Test', new Schema({
      userName: {
        type: String,
        required: [true, 'userName is required']
      }
    }, {
      query: {
        byUserName(userName) {
          return this.where({ userName });
        }
      }
    }));

    await Model.create({ userName: 'test' });
    const docs = await Model.find().byUserName('test').exec();
    assert.equal(docs.length, 1);
    assert.equal(docs[0].userName, 'test');
  });

  it('allows a transform option for lean on a query (gh-10423)', async function() {
    const arraySchema = new mongoose.Schema({
      sub: String
    });
    const subDoc = new mongoose.Schema({
      nickName: String
    });
    const testSchema = new mongoose.Schema({
      name: String,
      foo: [arraySchema],
      otherName: subDoc
    });
    const Test = db.model('Test', testSchema);
    await Test.create({ name: 'foo', foo: [{ sub: 'Test' }, { sub: 'Testerson' }], otherName: { nickName: 'Bar' } });

    const result = await Test.find().lean({
      transform: (doc) => {
        delete doc._id;
        return doc;
      }
    });
    assert.strictEqual(result[0]._id, undefined);
    assert.strictEqual(result[0].otherName._id, undefined);
    assert.strictEqual(result[0].foo[0]._id, undefined);
    assert.strictEqual(result[0].foo[1]._id, undefined);

    const single = await Test.findOne().lean({
      transform: (doc) => {
        delete doc._id;
        return doc;
      }
    });
    assert.strictEqual(single._id, undefined);
    assert.strictEqual(single.otherName._id, undefined);
    assert.strictEqual(single.foo[0]._id, undefined);
    assert.strictEqual(single.foo[0]._id, undefined);
  });

  it('handles a lean transform that deletes _id with populate (gh-12143) (gh-10423)', async function() {
    const testSchema = Schema({
      name: String,
      user: {
        type: mongoose.Types.ObjectId,
        ref: 'User'
      }
    });

    const userSchema = Schema({
      name: String
    });

    const Test = db.model('Test', testSchema);
    const User = db.model('User', userSchema);

    const user = await User.create({ name: 'John Smith' });
    let test = await Test.create({ name: 'test', user });

    test = await Test.findById(test).populate('user').lean({
      transform: (doc) => {
        delete doc._id;
        delete doc.__v;
        return doc;
      }
    });

    assert.ok(test);
    assert.deepStrictEqual(test, {
      name: 'test',
      user: { name: 'John Smith' }
    });
  });

  it('skips applying default projections over slice projections (gh-11940)', async function() {
    const commentSchema = new mongoose.Schema({
      comment: String
    });

    const testSchema = new mongoose.Schema({
      name: String,
      comments: { type: [commentSchema], select: false }
    });

    const Test = db.model('Test', testSchema);

    const { _id } = await Test.create({
      name: 'Test',
      comments: [{ comment: 'test1' }, { comment: 'test2' }]
    });

    const doc = await Test.findById(_id).slice('comments', [1, 1]);
    assert.equal(doc.comments.length, 1);
    assert.equal(doc.comments[0].comment, 'test2');

  });

  it('translateAliases option (gh-7511)', async function() {
    const testSchema = new Schema({
      name: {
        type: String,
        alias: 'n'
      },
      age: {
        type: Number
      }
    });
    const Test = db.model('Test', testSchema);
    await Test.create({ name: 'foo', age: 99 });

    let res = await Test.findOne({ n: 'foo' }, { n: 1 }, { translateAliases: true });
    assert.equal(res.name, 'foo');
    assert.strictEqual(res.age, void 0);

    res = await Test.find({ n: 'foo' }, { n: 1 }, { translateAliases: true });
    assert.equal(res.length, 1);
    assert.equal(res[0].name, 'foo');
    assert.strictEqual(res[0].age, void 0);

    res = await Test.countDocuments({ n: 'foo' }, { translateAliases: true });
    assert.strictEqual(res, 1);

    res = await Test.distinct('n').setOptions({ translateAliases: true });
    assert.deepStrictEqual(res, ['foo']);

    res = await Test.findOneAndUpdate(
      { n: 'foo' },
      { n: 'bar' },
      { returnDocument: 'after', translateAliases: true }
    );
    assert.strictEqual(res.name, 'bar');

    res = await Test.updateOne(
      { n: 'bar' },
      { $set: { age: 44 }, n: 'baz' },
      { translateAliases: true }
    );
    assert.strictEqual(res.modifiedCount, 1);

    res = await Test.updateOne(
      { name: 'baz' },
      { $set: { n: 'qux' } },
      { translateAliases: true }
    );
    assert.strictEqual(res.modifiedCount, 1);

    res = await Test.deleteMany({ n: 'qux' }, { translateAliases: true });
    assert.deepStrictEqual(res.deletedCount, 1);
  });

  it('translateAliases throws error on conflicting properties (gh-7511)', async function() {
    const testSchema = new Schema({
      name: {
        type: String,
        alias: 'n'
      },
      age: {
        type: Number
      }
    });
    const Test = db.model('Test', testSchema);
    await Test.create({ name: 'foo', age: 99 });

    await assert.rejects(async() => {
      await Test.findOne(
        { name: 'foo', n: 'bar' },
        null,
        { translateAliases: true }
      );
    }, /Provided object has both field "n" and its alias "name"/);
  });

  it('schema level translateAliases option (gh-7511)', async function() {
    const testSchema = new Schema({
      name: {
        type: String,
        alias: 'n'
      },
      age: {
        type: Number
      }
    }, { translateAliases: true });
    const Test = db.model('Test', testSchema);
    await Test.deleteMany({});
    await Test.create({ name: 'foo', age: 99 });

    const res = await Test.findOne({ n: 'foo' });
    assert.equal(res.name, 'foo');
  });

  describe('set()', function() {
    it('overwrites top-level keys if setting to undefined (gh-12155)', function() {
      const testSchema = new mongoose.Schema({
        key: String,
        prop: String
      });
      const Test = db.model('Test', testSchema);

      const query = Test.findOneAndUpdate({}, { key: '', prop: 'foo' });

      query.set('key', undefined);
      const update = query.getUpdate();

      assert.deepEqual(update, {
        $set: { key: undefined },
        prop: 'foo'
      });
    });
  });

  it('select: false is ignored for type Map (gh-12445)', async function() {
    const testSchema = new mongoose.Schema({
      select: {
        type: Map,
        of: Object
      },
      doNotSelect: {
        type: Map,
        of: Object,
        select: false
      }
    });

    const Test = db.model('Test', testSchema);
    await Test.create({
      select: { key: { some: 'value' } },
      doNotSelect: { otherKey: { someOther: 'value' } }
    });

    const item = await Test.findOne();
    assert.equal(item.get('select.key.some'), 'value');
    assert.equal(item.doNotSelect, undefined);
  });

  it('Map field with select: false is selected when explicitly requested (gh-12603)', async function() {
    const testSchema = new mongoose.Schema({
      title: String,
      body: {
        type: Map,
        of: { en: String, pt: String },
        select: false
      }
    });

    const Test = db.model('Test', testSchema);
    await Test.create({
      title: 'test',
      body: {
        A: { en: 'en test A value', pt: 'pt test A value' },
        B: { en: 'en test B value', pt: 'pt test B value' }
      }
    });

    const item = await Test.findOne({}).select('+body');
    assert.equal(item.title, 'test');
    assert.equal(item.get('body.A.en'), 'en test A value');

    const item2 = await Test.findOne({}).select('body');
    assert.equal(item2.title, undefined);
    assert.equal(item2.get('body.A.en'), 'en test A value');
  });

  it('treats ObjectId as object with `_id` for `merge()` (gh-12325)', async function() {
    const testSchema = new mongoose.Schema({ name: String });
    const Test = db.model('Test', testSchema);
    const _id = new mongoose.Types.ObjectId();

    let q = Test.find(_id);

    assert.ok(q.getFilter()._id instanceof mongoose.Types.ObjectId);
    assert.equal(q.getFilter()._id.toHexString(), _id.toHexString());

    q = Test.findOne(_id);

    assert.ok(q.getFilter()._id instanceof mongoose.Types.ObjectId);
    assert.equal(q.getFilter()._id.toHexString(), _id.toHexString());
  });

  it('avoid throwing error when modifying nested field with same name as discriminator key (gh-12517)', async function() {
    const options = { discriminatorKey: 'kind', strict: 'throw' };
    const testSchema = new mongoose.Schema({ name: String, kind: String, animals: { kind: String, world: String } }, options);
    const Test = db.model('Test', testSchema);

    Test.discriminator(
      'ClickedTest',
      new mongoose.Schema({ url: String }, options)
    );

    const newItem = await Test.create({
      name: 'Name',
      animals: { kind: 'Kind', world: 'World' }
    });

    const updatedItem = await Test.findByIdAndUpdate(
      newItem._id,
      {
        $set: {
          name: 'Name2',
          animals: { kind: 'Kind2', world: 'World2' }
        }
      },
      {
        new: true
      }
    );

    assert.deepEqual(updatedItem.animals, { kind: 'Kind2', world: 'World2' });

    await assert.rejects(async() => {
      await Test.findByIdAndUpdate(
        newItem._id,
        {
          $set: {
            name: 'Name2',
            kind: 'Kind2'
          }
        }
      );
    }, { message: 'Can\'t modify discriminator key "kind" on discriminator model' });
  });

  it('avoid throwing error when modifying field with same name as nested discriminator key (gh-12517)', async function() {
    const options = { discriminatorKey: 'animals.kind', strict: 'throw' };
    const testSchema = new mongoose.Schema({ name: String, kind: String, animals: { kind: String, world: String } }, options);
    const Test = db.model('Test', testSchema);

    Test.discriminator(
      'ClickedTest',
      new mongoose.Schema({ url: String }, options)
    );

    const newItem = await Test.create({
      name: 'Name',
      kind: 'Kind',
      animals: { world: 'World' }
    });

    const updatedItem = await Test.findByIdAndUpdate(
      newItem._id,
      {
        $set: {
          name: 'Name2',
          kind: 'Kind2'
        }
      },
      {
        new: true
      }
    );

    assert.equal(updatedItem.name, 'Name2');
    assert.equal(updatedItem.kind, 'Kind2');

    await assert.rejects(async() => {
      await Test.findByIdAndUpdate(
        newItem._id,
        {
          $set: {
            animals: { kind: 'Kind2', world: 'World2' }
          }
        }
      );
    }, { message: 'Can\'t modify discriminator key "animals.kind" on discriminator model' });
  });

  it('global strictQuery should work if applied after schema creation (gh-12703)', async() => {
    const m = new mongoose.Mongoose();

    await m.connect(start.uri);

    const schema = new mongoose.Schema({ title: String });

    const Test = m.model('test', schema);

    m.set('strictQuery', false);

    await Test.create({
      title: 'chimichanga'
    });
    await Test.create({
      title: 'burrito bowl'
    });
    await Test.create({
      title: 'taco supreme'
    });

    const cond = {
      $or: [
        {
          title: {
            $regex: 'urri',
            $options: 'i'
          }
        },
        {
          name: {
            $regex: 'urri',
            $options: 'i'
          }
        }
      ]
    };

    const found = await Test.find(cond);
    assert.strictEqual(found.length, 1);
    assert.strictEqual(found[0].title, 'burrito bowl');
  });

  it('update operation should not remove fields set to undefined (gh-12930)', async function() {
    const m = new mongoose.Mongoose();

    await m.connect(start.uri);

    const schema = new mongoose.Schema({ title: String });

    const Test = m.model('test', schema);

    const doc = await Test.create({
      title: 'test'
    });

    assert.strictEqual(doc.title, 'test');

    const updatedDoc = await Test.findOneAndUpdate(
      {
        _id: doc._id
      },
      { title: undefined },
      { returnOriginal: false }
    ).lean();

    assert.strictEqual(updatedDoc.title, 'test');
  });

  it('handles $elemMatch with nested schema (gh-12902)', async function() {
    const bioSchema = new Schema({
      name: { type: String }
    });

    const Book = db.model('book', new Schema({
      name: String,
      authors: [{
        bio: bioSchema
      }]
    }));

    await new Book({
      name: 'Mongoose Fundamentals',
      authors: [{
        bio: {
          name: 'Foo Bar'
        }
      }]
    }).save();

    const books = await Book.find({
      name: 'Mongoose Fundamentals',
      authors: {
        $elemMatch: {
          'bio.name': { $in: ['Foo Bar'] },
          'bio.location': 'Mandurah' // Not in schema
        }
      }
    });

    assert.strictEqual(books.length, 0);
  });

  it('merges $and, $or conditions (gh-12944)', function() {
    const Test = db.model('Test', new Schema({ tags: [String] }));

    let q = Test.find({ $and: [{ tags: 'a' }] });
    q.find({ $and: [{ tags: 'b' }] });
    q.find({ $and: [{ tags: 'c' }] });

    assert.deepEqual(q.getFilter(), {
      $and: [{ tags: 'a' }, { tags: 'b' }, { tags: 'c' }]
    });

    q = Test.find({ $or: [{ tags: 'a' }] });
    q.find({ $or: [{ tags: 'b' }] });
    assert.deepEqual(q.getFilter(), {
      $or: [{ tags: 'a' }, { tags: 'b' }]
    });
  });

  it('should avoid sending empty session to MongoDB server (gh-13052)', async function() {
    const m = new mongoose.Mongoose();

    let lastOptions = {};
    m.set('debug', function(_coll, _method, ...args) {
      lastOptions = args[args.length - 1];
    });

    const connDebug = m.createConnection(start.uri);

    const schema = new Schema({ name: String });
    const Test = connDebug.model('Test', schema);

    await Test.create({ name: 'foo' });
    assert.ok(!('session' in lastOptions));
  });

  it('should avoid sending empty projection to MongoDB server (gh-13065)', async function() {
    const m = new mongoose.Mongoose();

    let lastOptions = {};
    m.set('debug', function(_coll, _method, ...args) {
      lastOptions = args[args.length - 2];
    });

    const connDebug = m.createConnection(start.uri);

    const schema = new Schema({ name: String });
    const Test = connDebug.model('Test', schema);

    await Test.findOne();
    assert.ok(!('projection' in lastOptions));

    await Test.find();
    assert.ok(!('projection' in lastOptions));

    await Test.findOneAndUpdate({}, { name: 'bar' });
    assert.ok(!('projection' in lastOptions));
  });
  it('should provide a clearer error message when sorting with empty string', async function() {
    const testSchema = new Schema({
      name: { type: String }
    });

    const Error = db.model('error', testSchema);
    await assert.rejects(async() => {
      await Error.find().sort('-');
    }, { message: 'Invalid field "" passed to sort()' });
  });
});
