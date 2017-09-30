/**
 * Module dependencies.
 */

var start = require('./common');
var mongoose = start.mongoose;
var DocumentObjectId = mongoose.Types.ObjectId;
var Schema = mongoose.Schema;
var assert = require('power-assert');
var random = require('../lib/utils').random;
var Query = require('../lib/query');

/**
 * Test.
 */

describe('Query', function() {
  var Comment;
  var Product;
  var p1;

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
    var Prod = mongoose.model('Product');
    p1 = new Prod();
  });

  describe('constructor', function() {
    it('should not corrupt options', function(done) {
      var opts = {};
      var query = new Query({}, opts, null, p1.collection);
      assert.notEqual(opts, query._mongooseOptions);
      done();
    });
  });

  describe('select', function() {
    it('(object)', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.select({a: 1, b: 1, c: 0});
      assert.deepEqual(query._fields, {a: 1, b: 1, c: 0});
      done();
    });

    it('(string)', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.select(' a  b -c ');
      assert.deepEqual(query._fields, {a: 1, b: 1, c: 0});
      done();
    });

    it('("a","b","c")', function(done) {
      assert.throws(function() {
        var query = new Query({}, {}, null, p1.collection);
        query.select('a', 'b', 'c');
      }, /Invalid select/);
      done();
    });

    it('should not overwrite fields set in prior calls', function(done) {
      var query = new Query({}, {}, null, p1.collection);
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

  describe('where', function() {
    it('works', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.where('name', 'guillermo');
      assert.deepEqual(query._conditions, {name: 'guillermo'});
      query.where('a');
      query.equals('b');
      assert.deepEqual(query._conditions, {name: 'guillermo', a: 'b'});
      done();
    });
    it('throws if non-string or non-object path is passed', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      assert.throws(function() {
        query.where(50);
      });
      assert.throws(function() {
        query.where([]);
      });
      done();
    });
    it('does not throw when 0 args passed', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      assert.doesNotThrow(function() {
        query.where();
      });
      done();
    });
  });

  describe('equals', function() {
    it('works', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.where('name').equals('guillermo');
      assert.deepEqual(query._conditions, {name: 'guillermo'});
      done();
    });
  });

  describe('gte', function() {
    it('with 2 args', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.gte('age', 18);
      assert.deepEqual(query._conditions, {age: {$gte: 18}});
      done();
    });
    it('with 1 arg', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.where('age').gte(18);
      assert.deepEqual(query._conditions, {age: {$gte: 18}});
      done();
    });
  });

  describe('gt', function() {
    it('with 1 arg', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.where('age').gt(17);
      assert.deepEqual(query._conditions, {age: {$gt: 17}});
      done();
    });
    it('with 2 args', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.gt('age', 17);
      assert.deepEqual(query._conditions, {age: {$gt: 17}});
      done();
    });
  });

  describe('lte', function() {
    it('with 1 arg', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.where('age').lte(65);
      assert.deepEqual(query._conditions, {age: {$lte: 65}});
      done();
    });
    it('with 2 args', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.lte('age', 65);
      assert.deepEqual(query._conditions, {age: {$lte: 65}});
      done();
    });
  });

  describe('lt', function() {
    it('with 1 arg', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.where('age').lt(66);
      assert.deepEqual(query._conditions, {age: {$lt: 66}});
      done();
    });
    it('with 2 args', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.lt('age', 66);
      assert.deepEqual(query._conditions, {age: {$lt: 66}});
      done();
    });
  });

  describe('combined', function() {
    describe('lt and gt', function() {
      it('works', function(done) {
        var query = new Query({}, {}, null, p1.collection);
        query.where('age').lt(66).gt(17);
        assert.deepEqual(query._conditions, {age: {$lt: 66, $gt: 17}});
        done();
      });
    });
  });

  describe('tl on one path and gt on another', function() {
    it('works', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query
      .where('age').lt(66)
      .where('height').gt(5);
      assert.deepEqual(query._conditions, {age: {$lt: 66}, height: {$gt: 5}});
      done();
    });
  });

  describe('ne', function() {
    it('with 1 arg', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.where('age').ne(21);
      assert.deepEqual(query._conditions, {age: {$ne: 21}});
      done();
    });
    it('with 2 args', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.ne('age', 21);
      assert.deepEqual(query._conditions, {age: {$ne: 21}});
      done();
    });
  });

  describe('in', function() {
    it('with 1 arg', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.where('age').in([21, 25, 30]);
      assert.deepEqual(query._conditions, {age: {$in: [21, 25, 30]}});
      done();
    });
    it('with 2 args', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.in('age', [21, 25, 30]);
      assert.deepEqual(query._conditions, {age: {$in: [21, 25, 30]}});
      done();
    });
    it('where a non-array value no via where', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.in('age', 21);
      assert.deepEqual(query._conditions, {age: {$in: 21}});
      done();
    });
    it('where a non-array value via where', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.where('age').in(21);
      assert.deepEqual(query._conditions, {age: {$in: 21}});
      done();
    });
  });

  describe('nin', function() {
    it('with 1 arg', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.where('age').nin([21, 25, 30]);
      assert.deepEqual(query._conditions, {age: {$nin: [21, 25, 30]}});
      done();
    });
    it('with 2 args', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.nin('age', [21, 25, 30]);
      assert.deepEqual(query._conditions, {age: {$nin: [21, 25, 30]}});
      done();
    });
    it('with a non-array value not via where', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.nin('age', 21);
      assert.deepEqual(query._conditions, {age: {$nin: 21}});
      done();
    });
    it('with a non-array value via where', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.where('age').nin(21);
      assert.deepEqual(query._conditions, {age: {$nin: 21}});
      done();
    });
  });

  describe('mod', function() {
    it('not via where, where [a, b] param', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.mod('age', [5, 2]);
      assert.deepEqual(query._conditions, {age: {$mod: [5, 2]}});
      done();
    });
    it('not via where, where a and b params', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.mod('age', 5, 2);
      assert.deepEqual(query._conditions, {age: {$mod: [5, 2]}});
      done();
    });
    it('via where, where [a, b] param', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.where('age').mod([5, 2]);
      assert.deepEqual(query._conditions, {age: {$mod: [5, 2]}});
      done();
    });
    it('via where, where a and b params', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.where('age').mod(5, 2);
      assert.deepEqual(query._conditions, {age: {$mod: [5, 2]}});
      done();
    });
  });

  describe('near', function() {
    it('via where, where { center :[lat, long]} param', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.where('checkin').near({center: [40, -72]});
      assert.deepEqual(query._conditions, {checkin: {$near: [40, -72]}});
      done();
    });
    it('via where, where [lat, long] param', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.where('checkin').near([40, -72]);
      assert.deepEqual(query._conditions, {checkin: {$near: [40, -72]}});
      done();
    });
    it('via where, where lat and long params', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.where('checkin').near(40, -72);
      assert.deepEqual(query._conditions, {checkin: {$near: [40, -72]}});
      done();
    });
    it('not via where, where [lat, long] param', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.near('checkin', [40, -72]);
      assert.deepEqual(query._conditions, {checkin: {$near: [40, -72]}});
      done();
    });
    it('not via where, where lat and long params', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.near('checkin', 40, -72);
      assert.deepEqual(query._conditions, {checkin: {$near: [40, -72]}});
      done();
    });
    it('via where, where GeoJSON param', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.where('numbers').near({center: {type: 'Point', coordinates: [40, -72]}});
      assert.deepEqual(query._conditions, {numbers: {$near: {$geometry: {type: 'Point', coordinates: [40, -72]}}}});
      assert.doesNotThrow(function() {
        query.cast(p1.constructor);
      });
      done();
    });
    it('with path, where GeoJSON param', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.near('loc', {center: {type: 'Point', coordinates: [40, -72]}});
      assert.deepEqual(query._conditions, {loc: {$near: {$geometry: {type: 'Point', coordinates: [40, -72]}}}});
      done();
    });
  });

  describe('nearSphere', function() {
    it('via where, where [lat, long] param', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.where('checkin').nearSphere([40, -72]);
      assert.deepEqual(query._conditions, {checkin: {$nearSphere: [40, -72]}});
      done();
    });
    it('via where, where lat and long params', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.where('checkin').nearSphere(40, -72);
      assert.deepEqual(query._conditions, {checkin: {$nearSphere: [40, -72]}});
      done();
    });
    it('not via where, where [lat, long] param', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.nearSphere('checkin', [40, -72]);
      assert.deepEqual(query._conditions, {checkin: {$nearSphere: [40, -72]}});
      done();
    });
    it('not via where, where lat and long params', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.nearSphere('checkin', 40, -72);
      assert.deepEqual(query._conditions, {checkin: {$nearSphere: [40, -72]}});
      done();
    });

    it('via where, with object', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.where('checkin').nearSphere({center: [20, 23], maxDistance: 2});
      assert.deepEqual(query._conditions, {checkin: {$nearSphere: [20, 23], $maxDistance: 2}});
      done();
    });

    it('via where, where GeoJSON param', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.where('numbers').nearSphere({center: {type: 'Point', coordinates: [40, -72]}});
      assert.deepEqual(query._conditions, {numbers: {$nearSphere: {$geometry: {type: 'Point', coordinates: [40, -72]}}}});
      assert.doesNotThrow(function() {
        query.cast(p1.constructor);
      });
      done();
    });

    it('with path, with GeoJSON', function(done) {
      var query = new Query({}, {}, null, p1.collection);
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
      var query = new Query({}, {}, null, p1.collection);
      query.where('checkin').near([40, -72]).maxDistance(1);
      assert.deepEqual(query._conditions, {checkin: {$near: [40, -72], $maxDistance: 1}});
      done();
    });
  });

  describe('within', function() {
    describe('box', function() {
      it('via where', function(done) {
        var query = new Query({}, {}, null, p1.collection);
        query.where('gps').within().box({ll: [5, 25], ur: [10, 30]});
        var match = {gps: {$within: {$box: [[5, 25], [10, 30]]}}};
        if (Query.use$geoWithin) {
          match.gps.$geoWithin = match.gps.$within;
          delete match.gps.$within;
        }
        assert.deepEqual(query._conditions, match);
        done();
      });
      it('via where, no object', function(done) {
        var query = new Query({}, {}, null, p1.collection);
        query.where('gps').within().box([5, 25], [10, 30]);
        var match = {gps: {$within: {$box: [[5, 25], [10, 30]]}}};
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
        var query = new Query({}, {}, null, p1.collection);
        query.where('gps').within().center({center: [5, 25], radius: 5});
        var match = {gps: {$within: {$center: [[5, 25], 5]}}};
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
        var query = new Query({}, {}, null, p1.collection);
        query.where('gps').within().centerSphere({center: [5, 25], radius: 5});
        var match = {gps: {$within: {$centerSphere: [[5, 25], 5]}}};
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
        var query = new Query({}, {}, null, p1.collection);
        query.where('gps').within().polygon({a: {x: 10, y: 20}, b: {x: 15, y: 25}, c: {x: 20, y: 20}});
        var match = {gps: {$within: {$polygon: [{a: {x: 10, y: 20}, b: {x: 15, y: 25}, c: {x: 20, y: 20}}]}}};
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
      var query = new Query({}, {}, null, p1.collection);
      query.where('username').exists();
      assert.deepEqual(query._conditions, {username: {$exists: true}});
      done();
    });
    it('1 arg via where', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.where('username').exists(false);
      assert.deepEqual(query._conditions, {username: {$exists: false}});
      done();
    });
    it('where 1 argument not via where', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.exists('username');
      assert.deepEqual(query._conditions, {username: {$exists: true}});
      done();
    });

    it('where 2 args not via where', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.exists('username', false);
      assert.deepEqual(query._conditions, {username: {$exists: false}});
      done();
    });
  });

  describe('all', function() {
    it('via where', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.where('pets').all(['dog', 'cat', 'ferret']);
      assert.deepEqual(query._conditions, {pets: {$all: ['dog', 'cat', 'ferret']}});
      done();
    });
    it('not via where', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.all('pets', ['dog', 'cat', 'ferret']);
      assert.deepEqual(query._conditions, {pets: {$all: ['dog', 'cat', 'ferret']}});
      done();
    });
  });

  describe('find', function() {
    it('strict array equivalence condition v', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.find({pets: ['dog', 'cat', 'ferret']});
      assert.deepEqual(query._conditions, {pets: ['dog', 'cat', 'ferret']});
      done();
    });
    it('with no args', function(done) {
      var threw = false;
      var q = new Query({}, {}, null, p1.collection);

      try {
        q.find();
      } catch (err) {
        threw = true;
      }

      assert.ok(!threw);
      done();
    });
    it('works with overwriting previous object args (1176)', function(done) {
      var q = new Query({}, {}, null, p1.collection);
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
      var query = new Query({}, {}, null, p1.collection);
      query.where('collection').size(5);
      assert.deepEqual(query._conditions, {collection: {$size: 5}});
      done();
    });
    it('not via where', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.size('collection', 5);
      assert.deepEqual(query._conditions, {collection: {$size: 5}});
      done();
    });
  });

  describe('slice', function() {
    it('where and positive limit param', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.where('collection').slice(5);
      assert.deepEqual(query._fields, {collection: {$slice: 5}});
      done();
    });
    it('where just negative limit param', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.where('collection').slice(-5);
      assert.deepEqual(query._fields, {collection: {$slice: -5}});
      done();
    });
    it('where [skip, limit] param', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.where('collection').slice([14, 10]); // Return the 15th through 25th
      assert.deepEqual(query._fields, {collection: {$slice: [14, 10]}});
      done();
    });
    it('where skip and limit params', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.where('collection').slice(14, 10); // Return the 15th through 25th
      assert.deepEqual(query._fields, {collection: {$slice: [14, 10]}});
      done();
    });
    it('where just positive limit param', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.where('collection').slice(5);
      assert.deepEqual(query._fields, {collection: {$slice: 5}});
      done();
    });
    it('where just negative limit param', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.where('collection').slice(-5);
      assert.deepEqual(query._fields, {collection: {$slice: -5}});
      done();
    });
    it('where the [skip, limit] param', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.where('collection').slice([14, 10]); // Return the 15th through 25th
      assert.deepEqual(query._fields, {collection: {$slice: [14, 10]}});
      done();
    });
    it('where the skip and limit params', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.where('collection').slice(14, 10); // Return the 15th through 25th
      assert.deepEqual(query._fields, {collection: {$slice: [14, 10]}});
      done();
    });
    it('not via where, with just positive limit param', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.slice('collection', 5);
      assert.deepEqual(query._fields, {collection: {$slice: 5}});
      done();
    });
    it('not via where, where just negative limit param', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.slice('collection', -5);
      assert.deepEqual(query._fields, {collection: {$slice: -5}});
      done();
    });
    it('not via where, where [skip, limit] param', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.slice('collection', [14, 10]); // Return the 15th through 25th
      assert.deepEqual(query._fields, {collection: {$slice: [14, 10]}});
      done();
    });
    it('not via where, where skip and limit params', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.slice('collection', 14, 10); // Return the 15th through 25th
      assert.deepEqual(query._fields, {collection: {$slice: [14, 10]}});
      done();
    });
  });

  describe('elemMatch', function() {
    describe('not via where', function() {
      it('works', function(done) {
        var query = new Query({}, {}, null, p1.collection);
        query.elemMatch('comments', {author: 'bnoguchi', votes: {$gte: 5}});
        assert.deepEqual(query._conditions, {comments: {$elemMatch: {author: 'bnoguchi', votes: {$gte: 5}}}});
        done();
      });
      it('where block notation', function(done) {
        var query = new Query({}, {}, null, p1.collection);
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
        var query = new Query({}, {}, null, p1.collection);
        query.where('comments').elemMatch({author: 'bnoguchi', votes: {$gte: 5}});
        assert.deepEqual(query._conditions, {comments: {$elemMatch: {author: 'bnoguchi', votes: {$gte: 5}}}});
        done();
      });
      it('where block notation', function(done) {
        var query = new Query({}, {}, null, p1.collection);
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
      var query = new Query({}, {}, null, p1.collection);

      function filter() {
        return this.lastName === this.firstName;
      }

      query.$where(filter);
      assert.deepEqual(query._conditions, {$where: filter});
      done();
    });
    it('string arg', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.$where('this.lastName === this.firstName');
      assert.deepEqual(query._conditions, {$where: 'this.lastName === this.firstName'});
      done();
    });
  });

  describe('limit', function() {
    it('works', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.limit(5);
      assert.equal(query.options.limit, 5);
      done();
    });
  });

  describe('skip', function() {
    it('works', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.skip(9);
      assert.equal(query.options.skip, 9);
      done();
    });
  });

  describe('sort', function() {
    it('works', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      query.sort('a -c b');
      assert.deepEqual(query.options.sort, {a: 1, c: -1, b: 1});
      query = new Query({}, {}, null, p1.collection);
      query.sort({a: 1, c: -1, b: 'asc', e: 'descending', f: 'ascending'});
      assert.deepEqual(query.options.sort, {a: 1, c: -1, b: 1, e: -1, f: 1});

      if (typeof global.Map !== 'undefined') {
        query = new Query({}, {}, null, p1.collection);
        query.sort(new global.Map().set('a', 1).set('b', 2));
        assert.equal(query.options.sort.get('a'), 1);
        assert.equal(query.options.sort.get('b'), 2);
      }

      query = new Query({}, {}, null, p1.collection);
      var e;

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
      var query = new Query;
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
      var query = new Query;
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
      var q = new Query({}, {}, null, p1.collection);
      var o = {
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
      var q = new Query({}, {}, null, p1.collection);
      var o = {
        path: 'yellow.brick',
        match: {bricks: {$lt: 1000}},
        select: undefined,
        model: undefined,
        options: undefined,
        _docs: {}
      };
      q.populate(o);
      assert.equal(Object.keys(q._mongooseOptions.populate).length, 1);
      assert.deepEqual(o, q._mongooseOptions.populate['yellow.brick']);
      q.populate('yellow.brick');
      assert.equal(Object.keys(q._mongooseOptions.populate).length, 1);
      o.match = undefined;
      assert.deepEqual(o, q._mongooseOptions.populate['yellow.brick']);
      done();
    });

    it('accepts space delimited strings', function(done) {
      var q = new Query({}, {}, null, p1.collection);
      q.populate('yellow.brick dirt');
      var o = {
        path: 'yellow.brick',
        match: undefined,
        select: undefined,
        model: undefined,
        options: undefined,
        _docs: {}
      };
      assert.equal(Object.keys(q._mongooseOptions.populate).length, 2);
      assert.deepEqual(o, q._mongooseOptions.populate['yellow.brick']);
      o.path = 'dirt';
      assert.deepEqual(o, q._mongooseOptions.populate.dirt);
      done();
    });
  });

  describe('casting', function() {
    var db;

    before(function() {
      db = start();
    });

    after(function(done) {
      db.close(done);
    });

    it('to an array of mixed', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      var Product = db.model('Product');
      var params = {_id: new DocumentObjectId, tags: {$in: [4, 8, 15, 16]}};
      query.cast(Product, params);
      assert.deepEqual(params.tags.$in, [4, 8, 15, 16]);
      done();
    });

    it('find $ne should not cast single value to array for schematype of Array', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      var Product = db.model('Product');
      var Comment = db.model('Comment');

      var id = new DocumentObjectId;
      var castedComment = {_id: id, text: 'hello there'};
      var comment = new Comment(castedComment);

      var params = {
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
      var query = new Query({}, {}, null, p1.collection);
      var Product = db.model('Product');

      var params = {
        comments: {$ne: null}
      };

      query.cast(Product, params);
      assert.strictEqual(params.comments.$ne, null);
      done();
    });

    it('find should not cast single value to array for schematype of Array', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      var Product = db.model('Product');
      var Comment = db.model('Comment');

      var id = new DocumentObjectId;
      var castedComment = {_id: id, text: 'hello there'};
      var comment = new Comment(castedComment);

      var params = {
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
      var query = new Query({}, {}, null, p1.collection);
      var Product = db.model('Product');
      var ids = [String(new DocumentObjectId), String(new DocumentObjectId)];
      var params = {ids: {$elemMatch: {$in: ids}}};
      query.cast(Product, params);
      assert.ok(params.ids.$elemMatch.$in[0] instanceof DocumentObjectId);
      assert.ok(params.ids.$elemMatch.$in[1] instanceof DocumentObjectId);
      assert.deepEqual(params.ids.$elemMatch.$in[0].toString(), ids[0]);
      assert.deepEqual(params.ids.$elemMatch.$in[1].toString(), ids[1]);
      done();
    });

    it('inequality operators for an array', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      var Product = db.model('Product');
      var Comment = db.model('Comment');

      var id = new DocumentObjectId;
      var castedComment = {_id: id, text: 'hello there'};
      var comment = new Comment(castedComment);

      var params = {
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
      var db = start();
      var Product = db.model('Product');
      var prod = new Product({});
      var q = new Query({}, {}, Product, prod.collection).distinct('blah', function() {
        assert.equal(q.op, 'distinct');
        db.close(done);
      });
    });
  });

  describe('without a callback', function() {
    it('count, update, remove works', function(done) {
      var db = start();
      var Product = db.model('Product', 'update_products_' + random());
      new Query(p1.collection, {}, Product).count();
      Product.create({tags: 12345}, function(err) {
        assert.ifError(err);
        var time = 20;
        Product.find({tags: 12345}).update({$set: {tags: 123456}});

        setTimeout(function() {
          Product.find({tags: 12345}, function(err, p) {
            assert.ifError(err);
            assert.equal(p.length, 1);

            Product.find({tags: 123456}).remove();
            setTimeout(function() {
              Product.find({tags: 123456}, function(err, p) {
                assert.ifError(err);
                assert.equal(p.length, 0);
                db.close();
                done();
              });
            }, time);
          });
        }, time);
      });
    });
  });

  describe('findOne', function() {
    it('sets the op', function(done) {
      var db = start();
      var Product = db.model('Product');
      var prod = new Product({});
      var q = new Query(prod.collection, {}, Product).distinct();
      // use a timeout here because we have to wait for the connection to start
      // before any ops will get set
      setTimeout(function() {
        assert.equal(q.op, 'distinct');
        q.findOne();
        assert.equal(q.op, 'findOne');
        db.close();
        done();
      }, 50);
    });

    it('works as a promise', function(done) {
      var db = start();
      var Product = db.model('Product');
      var promise = Product.findOne();

      promise.then(function() {
        db.close(done);
      }, function(err) {
        assert.ifError(err);
      });
    });
  });

  describe('deleteOne/deleteMany', function() {
    var db;

    before(function() {
      db = start();
    });

    after(function(done) {
      db.close(done);
    });

    it('handles deleteOne', function(done) {
      var M = db.model('deleteOne', new Schema({ name: 'String' }));
      M.create([{ name: 'Eddard Stark' }, { name: 'Robb Stark' }], function(error) {
        assert.ifError(error);
        M.deleteOne({ name: /Stark/ }, function(error) {
          assert.ifError(error);
          M.count({}, function(error, count) {
            assert.ifError(error);
            assert.equal(count, 1);
            done();
          });
        });
      });
    });

    it('handles deleteMany', function(done) {
      var M = db.model('deleteMany', new Schema({ name: 'String' }));
      M.create([{ name: 'Eddard Stark' }, { name: 'Robb Stark' }], function(error) {
        assert.ifError(error);
        M.deleteMany({ name: /Stark/ }, function(error) {
          assert.ifError(error);
          M.count({}, function(error, count) {
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
      var db = start();
      var Product = db.model('Product');

      assert.doesNotThrow(function() {
        Product.where({numbers: [[[]]]}).remove(function(err) {
          db.close();
          assert.ok(err);
          done();
        });
      });
    });

    it('supports a single conditions arg', function(done) {
      var db = start();
      var Product = db.model('Product');

      Product.create({strings: ['remove-single-condition']}).then(function() {
        db.close();
        var q = Product.where().remove({strings: 'remove-single-condition'});
        assert.ok(q instanceof mongoose.Query);
        done();
      }, done).end();
    });

    it('supports a single callback arg', function(done) {
      var db = start();
      var Product = db.model('Product');
      var val = 'remove-single-callback';

      Product.create({strings: [val]}).then(function() {
        Product.where({strings: val}).remove(function(err) {
          assert.ifError(err);
          Product.findOne({strings: val}, function(err, doc) {
            db.close();
            assert.ifError(err);
            assert.ok(!doc);
            done();
          });
        });
      }, done).end();
    });

    it('supports conditions and callback args', function(done) {
      var db = start();
      var Product = db.model('Product');
      var val = 'remove-cond-and-callback';

      Product.create({strings: [val]}).then(function() {
        Product.where().remove({strings: val}, function(err) {
          assert.ifError(err);
          Product.findOne({strings: val}, function(err, doc) {
            db.close();
            assert.ifError(err);
            assert.ok(!doc);
            done();
          });
        });
      }, done).end();
    });

    it('single option, default', function(done) {
      var db = start();
      var Test = db.model('Test_single', new Schema({ name: String }));

      Test.create([{ name: 'Eddard Stark' }, { name: 'Robb Stark' }], function(error) {
        assert.ifError(error);
        Test.remove({ name: /Stark/ }).exec(function(error, res) {
          assert.ifError(error);
          assert.equal(res.result.n, 2);
          Test.count({}, function(error, count) {
            assert.ifError(error);
            assert.equal(count, 0);
            done();
          });
        });
      });
    });

    it('single option, false', function(done) {
      var db = start();
      var Test = db.model('Test_single', new Schema({ name: String }));

      Test.create([{ name: 'Eddard Stark' }, { name: 'Robb Stark' }], function(error) {
        assert.ifError(error);
        Test.remove({ name: /Stark/ }).setOptions({ single: false }).exec(function(error, res) {
          assert.ifError(error);
          assert.equal(res.result.n, 2);
          Test.count({}, function(error, count) {
            assert.ifError(error);
            assert.equal(count, 0);
            done();
          });
        });
      });
    });

    it('single option, true', function(done) {
      var db = start();
      var Test = db.model('Test_single', new Schema({ name: String }));

      Test.create([{ name: 'Eddard Stark' }, { name: 'Robb Stark' }], function(error) {
        assert.ifError(error);
        Test.remove({ name: /Stark/ }).setOptions({ single: true }).exec(function(error, res) {
          assert.ifError(error);
          assert.equal(res.result.n, 1);
          Test.count({}, function(error, count) {
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
      var db = start();
      var Product = db.model('Product');

      var proddoc = {comments: [{text: 'hello'}]};
      var prod2doc = {comments: [{text: 'goodbye'}]};

      var prod = new Product(proddoc);
      prod.save(function(err) {
        assert.ifError(err);

        Product.findOne({ _id: prod._id }, function(err, product) {
          assert.ifError(err);
          assert.equal(product.comments.length, 1);
          assert.equal(product.comments[0].text, 'hello');

          Product.update({ _id: prod._id }, prod2doc, function(err) {
            assert.ifError(err);

            Product.collection.findOne({_id: product._id}, function(err, doc) {
              assert.ifError(err);
              assert.equal(doc.comments.length, 1);
              // ensure hidden private props were not saved to db
              assert.ok(!doc.comments[0].hasOwnProperty('parentArry'));
              assert.equal(doc.comments[0].text, 'goodbye');
              db.close(done);
            });
          });
        });
      });
    });
  });

  describe('optionsForExecute', function() {
    it('should retain key order', function(done) {
      // this is important for query hints
      var hint = {x: 1, y: 1, z: 1};
      var a = JSON.stringify({hint: hint, safe: true});

      var q = new Query;
      q.hint(hint);

      var options = q._optionsForExec({schema: {options: {safe: true}}});
      assert.equal(JSON.stringify(options), a);
      done();
    });
  });

  // Advanced Query options

  describe('options', function() {
    describe('maxscan', function() {
      it('works', function(done) {
        var query = new Query({}, {}, null, p1.collection);
        query.maxscan(100);
        assert.equal(query.options.maxScan, 100);
        done();
      });
    });

    describe('slaveOk', function() {
      it('works', function(done) {
        var query = new Query({}, {}, null, p1.collection);
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
        var query = new Query({}, {}, null, p1.collection);
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
        var query = new Query({}, {}, null, p1.collection);
        query.tailable({awaitdata: true});
        assert.equal(query.options.tailable, true);
        assert.equal(query.options.awaitdata, true);
        done();
      });
    });

    describe('comment', function() {
      it('works', function(done) {
        var query = new Query;
        assert.equal(typeof query.comment, 'function');
        assert.equal(query.comment('Lowpass is more fun'), query);
        assert.equal(query.options.comment, 'Lowpass is more fun');
        done();
      });
    });

    describe('hint', function() {
      it('works', function(done) {
        var query2 = new Query({}, {}, null, p1.collection);
        query2.hint({indexAttributeA: 1, indexAttributeB: -1});
        assert.deepEqual(query2.options.hint, {indexAttributeA: 1, indexAttributeB: -1});

        var query3 = new Query({}, {}, null, p1.collection);
        query3.hint('indexAttributeA_1');
        assert.deepEqual(query3.options.hint, 'indexAttributeA_1');

        done();
      });
    });

    describe('snapshot', function() {
      it('works', function(done) {
        var query = new Query({}, {}, null, p1.collection);
        query.snapshot(true);
        assert.equal(query.options.snapshot, true);
        done();
      });
    });

    describe('batchSize', function() {
      it('works', function(done) {
        var query = new Query({}, {}, null, p1.collection);
        query.batchSize(10);
        assert.equal(query.options.batchSize, 10);
        done();
      });
    });

    describe('read', function() {
      var P = mongoose.mongo.ReadPreference;

      describe('without tags', function() {
        it('works', function(done) {
          var query = new Query({}, {}, null, p1.collection);
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
          var query = new Query({}, {}, null, p1.collection);
          var tags = [{dc: 'sf', s: 1}, {dc: 'jp', s: 2}];

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
        var schema, M, called;
        before(function() {
          schema = new Schema({}, {read: 'p'});
          M = mongoose.model('schemaOptionReadPrefWithQuery', schema);
        });

        it('if not set in query', function(done) {
          var options = M.where()._optionsForExec(M);
          assert.ok(options.readPreference instanceof P);
          assert.equal(options.readPreference.mode, 'primary');
          done();
        });

        it('if set in query', function(done) {
          var options = M.where().read('s')._optionsForExec(M);
          assert.ok(options.readPreference instanceof P);
          assert.equal(options.readPreference.mode, 'secondary');
          done();
        });

        it('and sends it though the driver', function(done) {
          var db = start();
          var options = {read: 'secondary', safe: {w: 'majority'}};
          var schema = new Schema({name: String}, options);
          var M = db.model(random(), schema);
          var q = M.find();

          // stub the internal query options call
          var getopts = q._optionsForExec;
          q._optionsForExec = function(model) {
            q._optionsForExec = getopts;

            var ret = getopts.call(this, model);

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
            db.close(done);
          });
        });
      });
    });
  });

  describe('setOptions', function() {
    it('works', function(done) {
      var q = new Query;
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
      assert.deepEqual(q._mongooseOptions.populate.fans, {path: 'fans', select: undefined, match: undefined, options: undefined, model: undefined, _docs: {}});
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

      var db = start();
      var Product = db.model('Product', 'Product_setOptions_test');
      Product.create(
          {numbers: [3, 4, 5]},
          {strings: 'hi there'.split(' ')}, function(err, doc1, doc2) {
            assert.ifError(err);
            Product.find().setOptions({limit: 1, sort: {_id: -1}, read: 'n'}).exec(function(err, docs) {
              db.close();
              assert.ifError(err);
              assert.equal(docs.length, 1);
              assert.equal(docs[0].id, doc2.id);
              done();
            });
          });
    });

    it('populate as array in options (gh-4446)', function(done) {
      var q = new Query;
      q.setOptions({ populate: [{ path: 'path1' }, { path: 'path2' }] });
      assert.deepEqual(Object.keys(q._mongooseOptions.populate),
        ['path1', 'path2']);
      done();
    });
  });

  describe('update', function() {
    it('when empty, nothing is run', function(done) {
      var q = new Query;
      assert.equal(false, !!q._castUpdate({}));
      done();
    });
  });

  describe('bug fixes', function() {
    var db;

    before(function() {
      db = start();
    });

    after(function(done) {
      db.close(done);
    });

    describe('collations', function() {
      before(function(done) {
        var _this = this;
        start.mongodVersion(function(err, version) {
          if (err) {
            return done(err);
          }
          var mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
          if (!mongo34) {
            return _this.skip();
          }

          done();
        });
      });

      it('collation support (gh-4839)', function(done) {
        var schema = new Schema({
          name: String
        });

        var MyModel = db.model('gh4839', schema);
        var collation = { locale: 'en_US', strength: 1 };

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
        var schema = new Schema({
          name: String
        }, { collation: { locale: 'en_US', strength: 1 } });

        var MyModel = db.model('gh5295', schema);

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
      it('ignores sort when passed to count', function(done) {
        var Product = db.model('Product', 'Product_setOptions_test');
        Product.find().sort({_id: 1}).count({}).exec(function(error) {
          assert.ifError(error);
          done();
        });
      });

      it('ignores count when passed to sort', function(done) {
        var Product = db.model('Product', 'Product_setOptions_test');
        Product.find().count({}).sort({_id: 1}).exec(function(error) {
          assert.ifError(error);
          done();
        });
      });
    });

    it('excludes _id when select false and inclusive mode (gh-3010)', function(done) {
      var User = db.model('gh3010', {
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
      var Test = db.model('gh3215', {
        arr: [{date: Date, value: Number}]
      });

      var q = Test.update({}, {
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
      var nestedSchema = new Schema({ value: Number }, { timestamps: true });
      var Test = db.model('gh4805', new Schema({
        arr: [nestedSchema]
      }, { timestamps: true }));

      Test.update({}, {
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

    it('allows sort with count (gh-3914)', function(done) {
      var Post = db.model('gh3914_0', {
        title: String
      });

      Post.count({}).sort({ title: 1 }).exec(function(error, count) {
        assert.ifError(error);
        assert.strictEqual(count, 0);
        done();
      });
    });

    it('allows sort with select (gh-3914)', function(done) {
      var Post = db.model('gh3914_1', {
        title: String
      });

      Post.count({}).select({ _id: 0 }).exec(function(error, count) {
        assert.ifError(error);
        assert.strictEqual(count, 0);
        done();
      });
    });

    it('handles nested $ (gh-3265)', function(done) {
      var Post = db.model('gh3265', {
        title: String,
        answers: [{
          details: String,
          stats: {
            votes: Number,
            count: Number
          }
        }]
      });

      var answersUpdate = {details: 'blah', stats: {votes: 1, count: '3'}};
      var q = Post.update(
          {'answers._id': '507f1f77bcf86cd799439011'},
          {$set: {'answers.$': answersUpdate}});

      assert.deepEqual(q.getUpdate().$set['answers.$'].stats.toObject(),
        { votes: 1, count: 3 });
      done();
    });

    it('$geoWithin with single nested schemas (gh-4044)', function(done) {
      var locationSchema = new Schema({
        type: { type: String },
        coordinates: []
      }, { _id:false });

      var schema = new Schema({
        title : String,
        location: { type: locationSchema, required: true }
      });
      schema.index({ location: '2dsphere' });

      var Model = db.model('gh4044', schema);

      var query = {
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
      var schema = new mongoose.Schema({
        test: { type: Number, default: 8472 },
        name: String
      });

      var MyModel = db.model('gh3825', schema);

      var opts = { setDefaultsOnInsert: true, upsert: true };
      MyModel.update({}, {}, opts, function(error) {
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
      var schema = new mongoose.Schema({
        name: String
      });

      schema.query.byName = function(name) {
        return this.find({ name: name });
      };

      var MyModel = db.model('gh3714', schema);

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
      var schema = new mongoose.Schema({
        name: String
      });

      var MyModel = db.model('gh4378', schema);

      assert.throws(function() {
        MyModel.findOne('');
      }, /Invalid argument to findOne()/);

      done();
    });

    it('handles geoWithin with $center and mongoose object (gh-4419)', function(done) {
      var areaSchema = new Schema({
        name: String,
        circle: Array
      });
      var Area = db.model('gh4419', areaSchema);

      var placeSchema = new Schema({
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
      var Place = db.model('gh4419_0', placeSchema);

      var tromso = new Area({
        name: 'Tromso, Norway',
        circle: [[18.89, 69.62], 10 / 3963.2]
      });
      tromso.save(function(error) {
        assert.ifError(error);

        var airport = {
          name: 'Center',
          geometry: {
            type: 'Point',
            coordinates: [18.895, 69.67]
          }
        };
        Place.create(airport, function(error) {
          assert.ifError(error);
          var q = {
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
      var schema = new Schema({
        createdAt: Date
      });

      var M = db.model('gh4495', schema);
      var q = M.find({
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
      var lineStringSchema = new Schema({
        name: String,
        geo: {
          type: { type: String, default: 'LineString' },
          coordinates: [[Number]]
        }
      });

      var LineString = db.model('gh4408', lineStringSchema);

      var ls = {
        name: 'test',
        geo: {
          coordinates: [ [14.59, 24.847], [28.477, 15.961] ]
        }
      };
      var ls2 = {
        name: 'test2',
        geo: {
          coordinates: [ [27.528, 25.006], [14.063, 15.591] ]
        }
      };
      LineString.create(ls, ls2, function(error, ls1) {
        assert.ifError(error);
        var query = {
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
      var TestSchema = new Schema({
        test: String
      });

      var Test = db.model('gh4592', TestSchema);

      Test.findOne({ test: { $not: /test/ } }, function(error) {
        assert.ifError(error);
        done();
      });
    });

    it('runSettersOnQuery works with _id field (gh-5351)', function(done) {
      var testSchema = new Schema({
        val: { type: String }
      }, { runSettersOnQuery: true });

      var Test = db.model('gh5351', testSchema);
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

    it('$exists under $not (gh-4933)', function(done) {
      var TestSchema = new Schema({
        test: String
      });

      var Test = db.model('gh4933', TestSchema);

      Test.findOne({ test: { $not: { $exists: true } } }, function(error) {
        assert.ifError(error);
        done();
      });
    });

    it('geojson underneath array (gh-5467)', function(done) {
      var storySchema = new Schema({
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

      var Story = db.model('gh5467', storySchema);

      var q = {
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
        Story.update(q, { name: 'test' }, { upsert: true }, function(error) {
          assert.ifError(error);
          done();
        });
      });
    });

    it('slice respects schema projections (gh-5450)', function(done) {
      var gameSchema = Schema({
        name: String,
        developer: {
          type: String,
          select: false
        },
        arr: [Number]
      });
      var Game = db.model('gh5450', gameSchema);

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

    it('$exists for arrays and embedded docs (gh-4937)', function(done) {
      var subSchema = new Schema({
        name: String
      });
      var TestSchema = new Schema({
        test: [String],
        sub: subSchema
      });

      var Test = db.model('gh4937', TestSchema);

      var q = { test: { $exists: true }, sub: { $exists: false } };
      Test.findOne(q, function(error) {
        assert.ifError(error);
        done();
      });
    });

    it('report error in pre hook (gh-5520)', function(done) {
      var TestSchema = new Schema({ name: String });

      var ops = [
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

      var TestModel = db.model('gh5520', TestSchema);

      var numOps = ops.length;

      ops.forEach(function(op) {
        TestModel.find({}).update({ name: 'test' })[op](function(error) {
          assert.ok(error);
          assert.equal(error.message, op + ' error');
          --numOps || done();
        });
      });
    });

    it('cast error with custom error (gh-5520)', function(done) {
      var TestSchema = new Schema({ name: Number });

      var TestModel = db.model('gh5520_0', TestSchema);

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
      var schema = new mongoose.Schema({
        name: String,
        isDeleted: Boolean
      });

      schema.pre('remove', function(next) {
        var _this = this;
        this.update({ isDeleted: true }, function(error) {
          // Force mongoose to consider this doc as deleted.
          _this.$isDeleted(true);
          next(error);
        });
      });

      var M = db.model('gh4428', schema);

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
      var ChildSchema = new mongoose.Schema({
        field: {
          type: String,
          select: false
        },
        _id: false
      }, { id: false });

      var ParentSchema = new mongoose.Schema({
        child: ChildSchema,
        child2: ChildSchema
      });
      var Parent = db.model('gh5603', ParentSchema);
      var ogParent = new Parent();
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
      var TestSchema = new Schema();

      var count = 0;
      TestSchema.post('init', function(model, next) {
        return next(new Error('Failed! ' + (count++)));
      });

      var TestModel = db.model('gh5592', TestSchema);

      var docs = [];
      for (var i = 0; i < 10; ++i) {
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

    it('handles geoWithin with mongoose docs (gh-4392)', function(done) {
      var areaSchema = new Schema({
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

      var Area = db.model('gh4392_0', areaSchema);

      var observationSchema = new Schema({
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

      var Observation = db.model('gh4392_1', observationSchema);

      Observation.on('index', function(error) {
        assert.ifError(error);
        var tromso = new Area({
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
          var observation = {
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
    var db;
    var MyModel;

    before(function(done) {
      db = start();

      var PersonSchema = new Schema({
        name: String,
        lastName: String,
        dependents: [String]
      });

      var m = db.model('gh3256', PersonSchema, 'gh3256');

      var obj = {
        name: 'John',
        lastName: 'Doe',
        dependents: ['Jake', 'Jill', 'Jane']
      };
      m.create(obj, function(error) {
        assert.ifError(error);

        var PersonSchema = new Schema({
          name: String,
          lastName: String,
          dependents: [String],
          salary: {type: Number, default: 25000}
        });

        MyModel = db.model('gh3256-salary', PersonSchema, 'gh3256');

        done();
      });
    });

    after(function(done) {
      db.close(done);
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
      MyModel.findOne({name: 'John'}, {dependents: {$slice: 1}}).
      exec(function(error, person) {
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
});
