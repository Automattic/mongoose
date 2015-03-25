
/**
 * Module dependencies.
 */

var start = require('./common')
  , mongoose = start.mongoose
  , DocumentObjectId = mongoose.Types.ObjectId
  , Schema = mongoose.Schema
  , assert = require('assert')
  , random = require('../lib/utils').random
  , Query = require('../lib/query');

var Comment = new Schema({
    text: String
});

var Product = new Schema({
    tags: {} // mixed
  , array: Array
  , ids: [Schema.ObjectId]
  , strings: [String]
  , numbers: [Number]
  , comments: [Comment]
});

mongoose.model('Product', Product);
mongoose.model('Comment', Comment);
var p1;

/**
 * Test.
 */

describe('Query', function(){
  before(function(){
    var Prod = mongoose.model('Product');
    p1 = new Prod();
  })
  describe('constructor', function(){
    it('should not corrupt options', function(done){
      var opts = {};
      var query = new Query({}, opts, null, p1.collection);
      assert.notEqual(opts, query._mongooseOptions);
      done();
    })
  })

  describe('select', function(){
    it('(object)', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.select({a: 1, b: 1, c: 0});
      assert.deepEqual(query._fields,{a: 1, b: 1, c: 0});
      done();
    })

    it('(string)', function (done) {
      var query = new Query({}, {}, null, p1.collection);
      query.select(" a  b -c ");
      assert.deepEqual(query._fields,{a: 1, b: 1, c: 0});
      done()
    });

    it('("a","b","c")', function(done){
      assert.throws(function () {
        var query = new Query({}, {}, null, p1.collection);
        query.select('a', 'b', 'c');
      }, /Invalid select/);
      done();
    })

    it('["a","b","c"]', function(done){
      assert.throws(function () {
        var query = new Query({}, {}, null, p1.collection);
        query.select(['a', 'b', 'c']);
      }, /Invalid select/);
      done();
    })

    it('should not overwrite fields set in prior calls', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.select('a');
      assert.deepEqual(query._fields,{a: 1});
      query.select('b');
      assert.deepEqual(query._fields,{a: 1, b: 1});
      query.select({ c: 0 })
      assert.deepEqual(query._fields,{a: 1, b: 1, c: 0});
      query.select('-d')
      assert.deepEqual(query._fields,{a: 1, b: 1, c: 0, d: 0});
      done()
    })
  })

  describe('where', function(){
    it('works', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.where('name', 'guillermo');
      assert.deepEqual(query._conditions, {name: 'guillermo'});
      query.where('a');
      query.equals('b');
      assert.deepEqual(query._conditions, {name: 'guillermo', a: 'b'});
      done();
    })
    it('throws if non-string or non-object path is passed', function(done){
      var query = new Query({}, {}, null, p1.collection);
      assert.throws(function () {
        query.where(50);
      });
      assert.throws(function () {
        query.where([])
      });
      done()
    })
    it('does not throw when 0 args passed', function (done) {
      var query = new Query({}, {}, null, p1.collection);
      assert.doesNotThrow(function(){
        query.where();
      });
      done();
    })
  })

  describe('equals', function(){
    it('works', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.where('name').equals('guillermo');
      assert.deepEqual(query._conditions, {name: 'guillermo'});
      done();
    })
  })

  describe('gte', function(){
    it('with 2 args', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.gte('age', 18);
      assert.deepEqual(query._conditions, {age: {$gte: 18}});
      done();
    })
    it('with 1 arg', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.where("age").gte(18);
      assert.deepEqual(query._conditions, {age: {$gte: 18}});
      done()
    })
  })

  describe('gt', function(){
    it('with 1 arg', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.where("age").gt(17);
      assert.deepEqual(query._conditions, {age: {$gt: 17}});
      done();
    })
    it('with 2 args', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.gt('age', 17);
      assert.deepEqual(query._conditions, {age: {$gt: 17}});
      done();
    })
  })

  describe('lte', function(){
    it('with 1 arg', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.where("age").lte(65);
      assert.deepEqual(query._conditions, {age: {$lte: 65}});
      done();
    })
    it('with 2 args', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.lte('age', 65);
      assert.deepEqual(query._conditions, {age: {$lte: 65}});
      done();
    })
  })

  describe('lt', function(){
    it('with 1 arg', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.where("age").lt(66);
      assert.deepEqual(query._conditions, {age: {$lt: 66}});
      done();
    })
    it('with 2 args', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.lt('age', 66);
      assert.deepEqual(query._conditions, {age: {$lt: 66}});
      done();
    })
  })

  describe('combined', function(){
    describe('lt and gt', function(){
      it('works', function(done){
        var query = new Query({}, {}, null, p1.collection);
        query.where("age").lt(66).gt(17);
        assert.deepEqual(query._conditions, {age: {$lt: 66, $gt: 17}});
        done();
      })
    })
  })

  describe('tl on one path and gt on another', function(){
    it('works', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query
        .where("age").lt(66)
        .where("height").gt(5);
      assert.deepEqual(query._conditions, {age: {$lt: 66}, height: {$gt: 5}});
      done();
    });
  })

  describe('ne', function(){
    it('with 1 arg', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.where("age").ne(21);
      assert.deepEqual(query._conditions, {age: {$ne: 21}});
      done();
    })
    it('with 2 args', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.ne('age', 21);
      assert.deepEqual(query._conditions, {age: {$ne: 21}});
      done();
    })
  })

  describe('in', function(){
    it('with 1 arg', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.where("age").in([21, 25, 30]);
      assert.deepEqual(query._conditions, {age: {$in: [21, 25, 30]}});
      done();
    })
    it('with 2 args', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.in('age', [21, 25, 30]);
      assert.deepEqual(query._conditions, {age: {$in: [21, 25, 30]}});
      done();
    })
    it('where a non-array value no via where', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.in('age', 21);
      assert.deepEqual(query._conditions, {age: {$in: 21}});
      done()
    })
    it('where a non-array value via where', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.where('age').in(21);
      assert.deepEqual(query._conditions, {age: {$in: 21}});
      done()
    })
  })

  describe('nin', function(){
    it('with 1 arg', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.where("age").nin([21, 25, 30]);
      assert.deepEqual(query._conditions, {age: {$nin: [21, 25, 30]}});
      done();
    })
    it('with 2 args', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.nin('age', [21, 25, 30]);
      assert.deepEqual(query._conditions, {age: {$nin: [21, 25, 30]}});
      done();
    })
    it('with a non-array value not via where', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.nin('age', 21);
      assert.deepEqual(query._conditions, {age: {$nin: 21}});
      done();
    })
    it('with a non-array value via where', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.where('age').nin(21);
      assert.deepEqual(query._conditions, {age: {$nin: 21}});
      done();
    })
  })

  describe('mod', function(){
    it('not via where, where [a, b] param', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.mod('age', [5, 2]);
      assert.deepEqual(query._conditions, {age: {$mod: [5, 2]}});
      done()
    })
    it('not via where, where a and b params', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.mod('age', 5, 2);
      assert.deepEqual(query._conditions, {age: {$mod: [5, 2]}});
      done()
    })
    it('via where, where [a, b] param', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.where("age").mod([5, 2]);
      assert.deepEqual(query._conditions, {age: {$mod: [5, 2]}});
      done();
    })
    it('via where, where a and b params', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.where("age").mod(5, 2);
      assert.deepEqual(query._conditions, {age: {$mod: [5, 2]}});
      done()
    })
  })

  describe('near', function(){
    it('via where, where { center :[lat, long]} param', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.where('checkin').near({ center : [40, -72]});
      assert.deepEqual(query._conditions, {checkin: {$near: [40, -72]}});
      done();
    })
    it('via where, where [lat, long] param', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.where('checkin').near([40, -72]);
      assert.deepEqual(query._conditions, {checkin: {$near: [40, -72]}});
      done();
    })
    it('via where, where lat and long params', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.where('checkin').near(40, -72);
      assert.deepEqual(query._conditions, {checkin: {$near: [40, -72]}});
      done()
    })
    it('not via where, where [lat, long] param', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.near('checkin', [40, -72]);
      assert.deepEqual(query._conditions, {checkin: {$near: [40, -72]}});
      done();
    })
    it('not via where, where lat and long params', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.near('checkin', 40, -72);
      assert.deepEqual(query._conditions, {checkin: {$near: [40, -72]}});
      done();
    })
    it('via where, where GeoJSON param', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.where('numbers').near({ center : { type : 'Point', coordinates : [40, -72 ]}});
      assert.deepEqual(query._conditions, {numbers: {$near: { $geometry : { type : 'Point', coordinates : [40, -72] }}}});
      assert.doesNotThrow(function () {
        query.cast(p1.constructor);
      })
      done();
    })
    it('with path, where GeoJSON param', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.near('loc', { center : { type : 'Point', coordinates : [40, -72 ]}});
      assert.deepEqual(query._conditions, {loc: {$near: { $geometry : { type : 'Point', coordinates : [40, -72] }}}});
      done();
    })
  })

  describe('nearSphere', function(){
    it('via where, where [lat, long] param', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.where('checkin').nearSphere([40, -72]);
      assert.deepEqual(query._conditions, {checkin: {$nearSphere: [40, -72]}});
      done();
    })
    it('via where, where lat and long params', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.where('checkin').nearSphere(40, -72);
      assert.deepEqual(query._conditions, {checkin: {$nearSphere: [40, -72]}});
      done()
    })
    it('not via where, where [lat, long] param', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.nearSphere('checkin', [40, -72]);
      assert.deepEqual(query._conditions, {checkin: {$nearSphere: [40, -72]}});
      done()
    })
    it('not via where, where lat and long params', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.nearSphere('checkin', 40, -72);
      assert.deepEqual(query._conditions, {checkin: {$nearSphere: [40, -72]}});
      done();
    })

    it('via where, with object', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.where('checkin').nearSphere({ center: [20,23], maxDistance: 2 });
      assert.deepEqual(query._conditions, {checkin: {$nearSphere: [20,23],$maxDistance:2}});
      done();
    })

    it('via where, where GeoJSON param', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.where('numbers').nearSphere({ center : { type : 'Point', coordinates : [40, -72 ]}});
      assert.deepEqual(query._conditions, {numbers: {$nearSphere: { $geometry : { type : 'Point', coordinates : [40, -72] }}}});
      assert.doesNotThrow(function () {
        query.cast(p1.constructor);
      })
      done();
    })

    it('with path, with GeoJSON', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.nearSphere('numbers', { center : { type : 'Point', coordinates : [40, -72 ]}});
      assert.deepEqual(query._conditions, {numbers: {$nearSphere: { $geometry : { type : 'Point', coordinates : [40, -72] }}}});
      assert.doesNotThrow(function () {
        query.cast(p1.constructor);
      })
      done();
    });
  })

  describe('maxDistance', function(){
    it('via where', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.where('checkin').near([40, -72]).maxDistance(1);
      assert.deepEqual(query._conditions, {checkin: {$near: [40, -72], $maxDistance: 1}});
      done();
    })
  })

  describe('within', function(){
    describe('box', function(){
      it('via where', function(done){
        var query = new Query({}, {}, null, p1.collection);
        query.where('gps').within().box({ll: [5, 25], ur: [10, 30]});
        var match = {gps: {$within: {$box: [[5, 25], [10, 30]]}}};
        if (Query.use$geoWithin) {
          match.gps.$geoWithin = match.gps.$within;
          delete match.gps["$within"];
        }
        assert.deepEqual(query._conditions, match);
        done();
      })
      it('via where, no object', function(done){
        var query = new Query({}, {}, null, p1.collection);
        query.where('gps').within().box([5, 25], [10, 30]);
        var match = {gps: {$within: {$box: [[5, 25], [10, 30]]}}};
        if (Query.use$geoWithin) {
          match.gps.$geoWithin = match.gps.$within;
          delete match.gps["$within"];
        }
        assert.deepEqual(query._conditions, match);
        done();
      })
    })

    describe('center', function(){
      it('via where', function(done){
        var query = new Query({}, {}, null, p1.collection);
        query.where('gps').within().center({center: [5, 25], radius: 5});
        var match = {gps: {$within: {$center: [[5, 25], 5]}}};
        if (Query.use$geoWithin) {
          match.gps.$geoWithin = match.gps.$within;
          delete match.gps["$within"];
        }
        assert.deepEqual(query._conditions, match);
        done();
      })
    })

    describe('centerSphere', function(){
      it('via where', function(done){
        var query = new Query({}, {}, null, p1.collection);
        query.where('gps').within().centerSphere({center: [5, 25], radius: 5});
        var match = {gps: {$within: {$centerSphere: [[5, 25], 5]}}};
        if (Query.use$geoWithin) {
          match.gps.$geoWithin = match.gps.$within;
          delete match.gps["$within"];
        }
        assert.deepEqual(query._conditions, match);
        done();
      })
    })

    describe('polygon', function(){
      it('via where', function(done){
        var query = new Query({}, {}, null, p1.collection);
        query.where('gps').within().polygon({ a: { x: 10, y: 20 }, b: { x: 15, y: 25 }, c: { x: 20, y: 20 }});
        var match = {gps: {$within: {$polygon: [{ a: { x: 10, y: 20 }, b: { x: 15, y: 25 }, c: { x: 20, y: 20 }}] }}};
        if (Query.use$geoWithin) {
          match.gps.$geoWithin = match.gps.$within;
          delete match.gps["$within"];
        }
        assert.deepEqual(query._conditions, match);
        done();
      })
    })
  })

  describe('exists', function(){
    it('0 args via where', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.where("username").exists();
      assert.deepEqual(query._conditions, {username: {$exists: true}});
      done();
    })
    it('1 arg via where', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.where("username").exists(false);
      assert.deepEqual(query._conditions, {username: {$exists: false}});
      done();
    })
    it('where 1 argument not via where', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.exists('username');
      assert.deepEqual(query._conditions, {username: {$exists: true}});
      done();
    })

    it('where 2 args not via where', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.exists("username", false);
      assert.deepEqual(query._conditions, {username: {$exists: false}});
      done();
    })
  })

  describe('all', function(){
    it('via where', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.where('pets').all(['dog', 'cat', 'ferret']);
      assert.deepEqual(query._conditions, {pets: {$all: ['dog', 'cat', 'ferret']}});
      done();
    })
    it('not via where', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.all('pets', ['dog', 'cat', 'ferret']);
      assert.deepEqual(query._conditions, {pets: {$all: ['dog', 'cat', 'ferret']}});
      done();
    })
  })

  describe('find', function(){
    it('strict array equivalence condition v', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.find({'pets': ['dog', 'cat', 'ferret']});
      assert.deepEqual(query._conditions, {pets: ['dog', 'cat', 'ferret']});
      done();
    })
    it('with no args', function(done){
      var threw = false;
      var q = new Query({}, {}, null, p1.collection);

      try {
        q.find();
      } catch (err) {
        threw = true;
      }

      assert.ok(!threw);
      done();
    })
    it('works with overwriting previous object args (1176)', function(done){
      var q = new Query({}, {}, null, p1.collection);
      assert.doesNotThrow(function(){
        q.find({ age: { $lt: 30 }});
        q.find({ age: 20 }); // overwrite
      })
      assert.deepEqual({ age: 20 }, q._conditions)
      done();
    })
  })

  describe('size', function(){
    it('via where', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.where('collection').size(5);
      assert.deepEqual(query._conditions, {collection: {$size: 5}});
      done();
    })
    it('not via where', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.size('collection', 5);
      assert.deepEqual(query._conditions, {collection: {$size: 5}});
      done();
    })
  })

  describe('slice', function(){
    it('where and positive limit param', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.where('collection').slice(5);
      assert.deepEqual(query._fields, {collection: {$slice: 5}});
      done();
    })
    it('where just negative limit param', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.where('collection').slice(-5);
      assert.deepEqual(query._fields, {collection: {$slice: -5}});
      done();
    })
    it('where [skip, limit] param', function (done) {
      var query = new Query({}, {}, null, p1.collection);
      query.where('collection').slice([14, 10]); // Return the 15th through 25th
      assert.deepEqual(query._fields, {collection: {$slice: [14, 10]}});
      done();
    })
    it('where skip and limit params', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.where('collection').slice(14, 10); // Return the 15th through 25th
      assert.deepEqual(query._fields, {collection: {$slice: [14, 10]}});
      done();
    })
    it('where just positive limit param', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.where('collection').slice(5);
      assert.deepEqual(query._fields, {collection: {$slice: 5}});
      done();
    })
    it('where just negative limit param', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.where('collection').slice(-5);
      assert.deepEqual(query._fields, {collection: {$slice: -5}});
      done();
    })
    it('where the [skip, limit] param', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.where('collection').slice([14, 10]); // Return the 15th through 25th
      assert.deepEqual(query._fields, {collection: {$slice: [14, 10]}});
      done();
    })
    it('where the skip and limit params', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.where('collection').slice(14, 10); // Return the 15th through 25th
      assert.deepEqual(query._fields, {collection: {$slice: [14, 10]}});
      done();
    })
    it('not via where, with just positive limit param', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.slice('collection', 5);
      assert.deepEqual(query._fields, {collection: {$slice: 5}});
      done();
    })
    it('not via where, where just negative limit param', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.slice('collection', -5);
      assert.deepEqual(query._fields, {collection: {$slice: -5}});
      done();
    })
    it('not via where, where [skip, limit] param', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.slice('collection', [14, 10]); // Return the 15th through 25th
      assert.deepEqual(query._fields, {collection: {$slice: [14, 10]}});
      done();
    })
    it('not via where, where skip and limit params', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.slice('collection', 14, 10); // Return the 15th through 25th
      assert.deepEqual(query._fields, {collection: {$slice: [14, 10]}});
      done();
    })
  })

  describe('elemMatch', function(){
    describe('not via where', function(){
      it('works', function(done){
        var query = new Query({}, {}, null, p1.collection);
        query.elemMatch('comments', {author: 'bnoguchi', votes: {$gte: 5}});
        assert.deepEqual(query._conditions, {comments: {$elemMatch: {author: 'bnoguchi', votes: {$gte: 5}}}});
        done();
      })
      it('where block notation', function(done){
        var query = new Query({}, {}, null, p1.collection);
        query.elemMatch('comments', function (elem) {
          elem.where('author', 'bnoguchi')
          elem.where('votes').gte(5);
        });
        assert.deepEqual(query._conditions, {comments: {$elemMatch: {author: 'bnoguchi', votes: {$gte: 5}}}});
        done();
      })
    })
    describe('via where', function(){
      it('works', function(done){
        var query = new Query({}, {}, null, p1.collection);
        query.where('comments').elemMatch({author: 'bnoguchi', votes: {$gte: 5}});
        assert.deepEqual(query._conditions, {comments: {$elemMatch: {author: 'bnoguchi', votes: {$gte: 5}}}});
        done();
      })
      it('where block notation', function(done){
        var query = new Query({}, {}, null, p1.collection);
        query.where('comments').elemMatch(function (elem) {
          elem.where('author', 'bnoguchi')
          elem.where('votes').gte(5);
        });
        assert.deepEqual(query._conditions, {comments: {$elemMatch: {author: 'bnoguchi', votes: {$gte: 5}}}});
        done();
      })
    })
  })

  describe('$where', function(){
    it('function arg', function(done){
      var query = new Query({}, {}, null, p1.collection);
      function filter () {
        return this.lastName === this.firstName;
      }
      query.$where(filter);
      assert.deepEqual(query._conditions, {$where: filter});
      done();
    })
    it('string arg', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.$where('this.lastName === this.firstName');
      assert.deepEqual(query._conditions, {$where: 'this.lastName === this.firstName'});
      done();
    })
  })

  describe('limit', function(){
    it('works', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.limit(5);
      assert.equal(query.options.limit,5);
      done();
    })
  })

  describe('skip', function(){
    it('works', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.skip(9);
      assert.equal(query.options.skip,9);
      done();
    })
  })

  describe('sort', function(){
    it('works', function(done){
      var query = new Query({}, {}, null, p1.collection);
      query.sort('a -c b');
      assert.deepEqual(query.options.sort, {'a': 1 , 'c': -1,'b': 1});
      query = new Query({}, {}, null, p1.collection);
      query.sort({'a': 1, 'c': -1, 'b': 'asc', e: 'descending', f: 'ascending'});
      assert.deepEqual(query.options.sort, {'a': 1, 'c': -1, 'b': 1, 'e': -1, 'f': 1});
      query = new Query({}, {}, null, p1.collection);
      var e;

      try {
        query.sort(['a',1]);
      } catch (err) {
        e = err;
      }

      assert.ok(e, 'uh oh. no error was thrown');
      assert.equal(e.message, 'Invalid sort() argument.');

      e= undefined;
      try {
        query.sort('a', 1, 'c', -1, 'b', 1);
      } catch (err) {
        e= err;
      }
      assert.ok(e, 'uh oh. no error was thrown');
      assert.equal(e.message, 'sort() only takes 1 Argument');
      done();
    })
  })

  describe('or', function(){
    it('works', function(done){
      var query = new Query;
      query.find({ $or: [{x:1},{x:2}] });
      assert.equal(query._conditions.$or.length, 2);
      query.or([{y:"We're under attack"}, {z:47}]);
      assert.equal(query._conditions.$or.length, 4);
      assert.equal(query._conditions.$or[3].z, 47);
      query.or({z:"phew"});
      assert.equal(query._conditions.$or.length, 5);
      assert.equal(query._conditions.$or[3].z, 47);
      assert.equal(query._conditions.$or[4].z, "phew");
      done();
    });
  })

  describe('and', function(){
    it('works', function(done){
      var query = new Query;
      query.find({ $and: [{x:1},{y:2}] });
      assert.equal(query._conditions.$and.length, 2);
      query.and([{z:"We're under attack"}, {w:47}]);
      assert.equal(query._conditions.$and.length, 4);
      assert.equal(query._conditions.$and[3].w, 47);
      query.and({a:"phew"});
      assert.equal(query._conditions.$and.length, 5);
      assert.equal(query._conditions.$and[0].x, 1);
      assert.equal(query._conditions.$and[1].y, 2);
      assert.equal(query._conditions.$and[2].z, "We're under attack");
      assert.equal(query._conditions.$and[3].w, 47);
      assert.equal(query._conditions.$and[4].a, "phew");
      done();
    });
  })

  describe('populate', function(){
    it('converts to PopulateOptions objects', function(done){
      var q = new Query({}, {}, null, p1.collection);
      var o = {
          path: 'yellow.brick'
        , match: { bricks: { $lt: 1000 }}
        , select: undefined
        , model: undefined
        , options: undefined
        , _docs: {}
      }
      q.populate(o);
      assert.deepEqual(o, q._mongooseOptions.populate['yellow.brick']);
      done();
    })

    it('overwrites duplicate paths', function(done){
      var q = new Query({}, {}, null, p1.collection);
      var o = {
          path: 'yellow.brick'
        , match: { bricks: { $lt: 1000 }}
        , select: undefined
        , model: undefined
        , options: undefined
        , _docs: {}
      }
      q.populate(o);
      assert.equal(1, Object.keys(q._mongooseOptions.populate).length);
      assert.deepEqual(o, q._mongooseOptions.populate['yellow.brick']);
      q.populate('yellow.brick');
      assert.equal(1, Object.keys(q._mongooseOptions.populate).length);
      o.match = undefined;
      assert.deepEqual(o, q._mongooseOptions.populate['yellow.brick']);
      done();
    })

    it('accepts space delimited strings', function(done){
      var q = new Query({}, {}, null, p1.collection);
      q.populate('yellow.brick dirt');
      var o = {
          path: 'yellow.brick'
        , match: undefined
        , select: undefined
        , model: undefined
        , options: undefined
        , _docs: {}
      }
      assert.equal(2, Object.keys(q._mongooseOptions.populate).length);
      assert.deepEqual(o, q._mongooseOptions.populate['yellow.brick']);
      o.path = 'dirt';
      assert.deepEqual(o, q._mongooseOptions.populate['dirt']);
      done();
    })
  })

  describe('an empty query', function(){
    it('should not throw', function(done){
      var query = new Query({}, {}, null, p1.collection);
      var threw = false;

      try {
        query.exec();
      } catch (err) {
        threw = true;
      }

      assert.equal(threw, false);
      done();
    })
  });

  describe('casting', function(){
    it('to an array of mixed', function(done){
      var query = new Query({}, {}, null, p1.collection);
      var db = start();
      var Product = db.model('Product');
      db.close();
      var params = { _id: new DocumentObjectId, tags: { $in: [ 4, 8, 15, 16 ] }};
      query.cast(Product, params);
      assert.deepEqual(params.tags.$in, [4,8,15,16]);
      done();
    })

    it('find $ne should not cast single value to array for schematype of Array', function(done){
      var query = new Query({}, {}, null, p1.collection);
      var db = start();
      var Product = db.model('Product');
      var Comment = db.model('Comment');
      db.close();

      var id = new DocumentObjectId;
      var castedComment = { _id: id, text: 'hello there' };
      var comment = new Comment(castedComment);

      var params = {
          array: { $ne: 5 }
        , ids: { $ne: id }
        , comments: { $ne: comment }
        , strings: { $ne: 'Hi there' }
        , numbers: { $ne: 10000 }
      };

      query.cast(Product, params);
      assert.equal(params.array.$ne,5);
      assert.equal(params.ids.$ne, id);
      params.comments.$ne._id.toHexString();
      assert.deepEqual(params.comments.$ne, castedComment);
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
      assert.deepEqual(params.comments.$ne[0], castedComment);
      assert.ok(params.strings.$ne instanceof Array);
      assert.equal(params.strings.$ne[0], 'Hi there');
      assert.ok(params.numbers.$ne instanceof Array);
      assert.equal(params.numbers.$ne[0], 10000);
      done();
    })

    it('subdocument array with $ne: null should not throw', function(done){
      var query = new Query({}, {}, null, p1.collection);
      var db = start();
      var Product = db.model('Product');
      var Comment = db.model('Comment');
      db.close();

      var params = {
          comments: { $ne: null }
      };

      query.cast(Product, params);
      assert.strictEqual(params.comments.$ne, null);
      done();
    })

    it('find should not cast single value to array for schematype of Array', function(done){
      var query = new Query({}, {}, null, p1.collection);
      var db = start();
      var Product = db.model('Product');
      var Comment = db.model('Comment');
      db.close();

      var id = new DocumentObjectId;
      var castedComment = { _id: id, text: 'hello there' };
      var comment = new Comment(castedComment);

      var params = {
          array: 5
        , ids: id
        , comments: comment
        , strings: 'Hi there'
        , numbers: 10000
      };

      query.cast(Product, params);
      assert.equal(params.array,5);
      assert.equal(params.ids, id);
      params.comments._id.toHexString();
      assert.deepEqual(params.comments, castedComment);
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
      assert.deepEqual(params.comments[0], castedComment);
      assert.ok(params.strings instanceof Array);
      assert.equal(params.strings[0], 'Hi there');
      assert.ok(params.numbers instanceof Array);
      assert.equal(params.numbers[0], 10000);
      done();
    })

    it('an $elemMatch with $in works (gh-1100)', function(done){
      var query = new Query({}, {}, null, p1.collection);
      var db = start();
      var Product = db.model('Product');
      db.close();
      var ids = [String(new DocumentObjectId), String(new DocumentObjectId)];
      var params = { ids: { $elemMatch: { $in: ids }}};
      query.cast(Product, params);
      assert.ok(params.ids.$elemMatch.$in[0] instanceof DocumentObjectId);
      assert.ok(params.ids.$elemMatch.$in[1] instanceof DocumentObjectId);
      assert.deepEqual(params.ids.$elemMatch.$in[0].toString(), ids[0]);
      assert.deepEqual(params.ids.$elemMatch.$in[1].toString(), ids[1]);
      done();
    })

    it('inequality operators for an array', function(done) {
      var query = new Query({}, {}, null, p1.collection);
      var db = start();
      var Product = db.model('Product');
      var Comment = db.model('Comment');
      db.close();

      var id = new DocumentObjectId;
      var castedComment = { _id: id, text: 'hello there' };
      var comment = new Comment(castedComment);

      var params = {
          ids: { $gt: id }
        , comments: { $gt: comment }
        , strings: { $gt: 'Hi there' }
        , numbers: { $gt: 10000 }
      };

      query.cast(Product, params);
      assert.equal(params.ids.$gt, id);
      assert.deepEqual(params.comments.$gt, castedComment);
      assert.equal(params.strings.$gt, 'Hi there');
      assert.equal(params.numbers.$gt, 10000);
      done();
    })
  })

  describe('distinct', function(){
    it('op', function(done){
      var db = start();
      var query = new Query({}, {}, null, p1.collection);
      var Product = db.model('Product');
      var prod = new Product({});
      var q = new Query({}, {}, Product, prod.collection).distinct('blah', function(){
        assert.equal(q.op,'distinct');
        db.close();
      })
      done();
    })
  })

  describe('without a callback', function(){
    it('count, update, remove works', function(done){
      var db = start();
      var query = new Query({}, {}, null, p1.collection);
      var Product = db.model('Product', 'update_products_' + random());
      new Query(p1.collection, {}, Product).count();
      Product.create({ tags: 12345 }, function (err) {
        assert.ifError(err);
        var time = 20;
        Product.find({ tags: 12345 }).update({ $set: { tags: 123456 }});

        setTimeout(function(){
          Product.find({ tags: 12345 }, function (err, p) {
            assert.ifError(err);
            assert.equal(1, p.length);

            Product.find({ tags: 123456 }).remove();
            setTimeout(function(){
              Product.find({ tags: 123456 }, function (err, p) {
                assert.ifError(err);
                assert.equal(0, p.length);
                db.close();
                done();
              });
            }, time);
          });
        }, time);
      });
    })
  });

  describe('findOne', function(){
    it('sets the op', function(done){
      var db = start();
      var Product = db.model('Product');
      var prod = new Product({});
      var q = new Query(prod.collection, {}, Product).distinct();
      // use a timeout here because we have to wait for the connection to start
      // before any ops will get set
      setTimeout(function() {
        assert.equal(q.op,'distinct');
        q.findOne();
        assert.equal(q.op,'findOne');
        db.close();
        done();
      }, 50);
    });
  });

  describe('remove', function(){
    it('handles cast errors async', function(done){
      var db = start();
      var Product = db.model('Product');

      assert.doesNotThrow(function(){
        Product.where({ numbers: [[[]]] }).remove(function (err) {
          db.close();
          assert.ok(err);
          done();
        })
      })
    })

    it('supports a single conditions arg', function(done){
      var db = start();
      var Product = db.model('Product');

      Product.create({ strings: ['remove-single-condition'] }).then(function(p){
        db.close();
        var q = Product.where().remove({ strings: 'remove-single-condition' });
        assert.ok(q instanceof mongoose.Query);
        done();
      }, done).end();
    })

    it('supports a single callback arg', function(done){
      var db = start();
      var Product = db.model('Product');
      var val = 'remove-single-callback';

      Product.create({ strings: [val] }).then(function(p){
        Product.where({ strings: val }).remove(function (err) {
          assert.ifError(err);
          Product.findOne({ strings: val }, function (err, doc) {
            db.close();
            assert.ifError(err);
            assert.ok(!doc);
            done();
          })
        })
      }, done).end();
    })

    it('supports conditions and callback args', function(done){
      var db = start();
      var Product = db.model('Product');
      var val = 'remove-cond-and-callback';

      Product.create({ strings: [val] }).then(function(p){
        Product.where().remove({ strings: val }, function (err) {
          assert.ifError(err);
          Product.findOne({ strings: val }, function (err, doc) {
            db.close();
            assert.ifError(err);
            assert.ok(!doc);
            done();
          })
        })
      }, done).end();
    })
  })

  describe('querying/updating with model instance containing embedded docs should work (#454)', function(){
    it('works', function(done){
      var db = start();
      var Product = db.model('Product');

      var proddoc = { comments: [{ text: 'hello' }] };
      var prod2doc = { comments: [{ text: 'goodbye' }] };

      var prod = new Product(proddoc);
      var prod2 = new Product(prod2doc);

      prod.save(function (err) {
        assert.ifError(err);

        Product.findOne(prod, function (err, product) {
          assert.ifError(err);
          assert.equal(product.comments.length, 1);
          assert.equal(product.comments[0].text, 'hello');

          Product.update(product, prod2doc, function (err) {
            assert.ifError(err);

            Product.collection.findOne({ _id: product._id }, function (err, doc) {
              assert.ifError(err);
              assert.equal(doc.comments.length, 1);
              // ensure hidden private props were not saved to db
              assert.ok(!doc.comments[0].hasOwnProperty('parentArry') );
              assert.equal(doc.comments[0].text,'goodbye');
              db.close(done);
            });
          });
        });
      });
    })
  })

  describe('optionsForExecute', function(){
    it('should retain key order', function(done){
      // this is important for query hints
      var hint = { x: 1, y: 1, z: 1 };
      var a = JSON.stringify({ hint: hint, safe: true});

      var q = new Query;
      q.hint(hint);

      var options = q._optionsForExec({ schema: { options: { safe: true } }});
      assert.equal(a,JSON.stringify(options));
      done();
    })
  })

  // Advanced Query options

  describe('options', function(){
    describe('maxscan', function(){
      it('works', function(done){
        var query = new Query({}, {}, null, p1.collection);
        query.maxscan(100);
        assert.equal(query.options.maxScan,100);
        done();
      });
    })

    describe('slaveOk', function(){
      it('works', function(done){
        var query = new Query({}, {}, null, p1.collection);
        query.slaveOk();
        assert.equal(true, query.options.slaveOk);

        var query = new Query({}, {}, null, p1.collection);
        query.slaveOk(true);
        assert.equal(true, query.options.slaveOk);

        var query = new Query({}, {}, null, p1.collection);
        query.slaveOk(false);
        assert.equal(false, query.options.slaveOk);
        done();
      })
    })

    describe('tailable', function(){
      it('works', function(done){
        var query = new Query({}, {}, null, p1.collection);
        query.tailable();
        assert.equal(true, query.options.tailable);

        var query = new Query({}, {}, null, p1.collection);
        query.tailable(true);
        assert.equal(true, query.options.tailable);

        var query = new Query({}, {}, null, p1.collection);
        query.tailable(false);
        assert.equal(false, query.options.tailable);
        done();
      })
      it('supports passing the `await` option', function(done){
        var query = new Query({}, {}, null, p1.collection);
        query.tailable({ awaitdata: true });
        assert.equal(true, query.options.tailable);
        assert.equal(true, query.options.awaitdata);
        done();
      })
    });

    describe('comment', function(){
      it('works', function(done){
        var query = new Query;
        assert.equal('function',typeof query.comment);
        assert.equal(query.comment('Lowpass is more fun'),query);
        assert.equal(query.options.comment,'Lowpass is more fun');
        done();
      });
    })

    describe('hint', function(){
      it('works', function(done){
        var query2 = new Query({}, {}, null, p1.collection);
        query2.hint({'indexAttributeA': 1, 'indexAttributeB': -1});
        assert.deepEqual(query2.options.hint, {'indexAttributeA': 1, 'indexAttributeB': -1});

        assert.throws(function(){
          var query3 = new Query({}, {}, null, p1.collection);
          query3.hint('indexAttributeA');
        }, /Invalid hint./);

        done();
      })
    })

    describe('snapshot', function(){
      it('works', function(done){
        var query = new Query({}, {}, null, p1.collection);
        query.snapshot(true);
        assert.equal(true, query.options.snapshot);
        done();
      });
    })

    describe('batchSize', function(){
      it('works', function(done){
        var query = new Query({}, {}, null, p1.collection);
        query.batchSize(10);
        assert.equal(query.options.batchSize,10);
        done();
      });
    })

    describe('read', function(){
      var P = mongoose.mongo.ReadPreference;

      describe('without tags', function(){
        it('works', function(done){
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
      })

      describe('with tags', function(){
        it('works', function(done){
          var query = new Query({}, {}, null, p1.collection);
          var tags = [{ dc: 'sf', s: 1}, { dc: 'jp', s: 2 }]

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
      })

      describe('inherits its models schema read option', function(){
        var schema, M;
        before(function () {
          schema = new Schema({}, { read: 'p' });
          M = mongoose.model('schemaOptionReadPrefWithQuery', schema);
        })

        it('if not set in query', function(done){
          var options = M.where()._optionsForExec(M);
          assert.ok(options.readPreference instanceof P);
          assert.equal(options.readPreference.mode, 'primary');
          done();
        })

        it('if set in query', function(done){
          var options = M.where().read('s')._optionsForExec(M);
          assert.ok(options.readPreference instanceof P);
          assert.equal(options.readPreference.mode, 'secondary');
          done();
        })

        it('and sends it though the driver', function(done) {
          var db = start();
          var options = { read: 'secondary', safe: { w: 'majority' }};
          var schema = Schema({ name: String }, options);
          var M  = db.model(random(), schema);
          var q = M.find();

          // stub the internal query options call
          var getopts = q._optionsForExec;
          q._optionsForExec = function(model) {
            q._optionsForExec = getopts;

            var ret = getopts.call(this, model);

            assert.ok(ret.readPreference);
            assert.equal('secondary', ret.readPreference.mode);
            assert.deepEqual({ w: 'majority' }, ret.safe);
            called = true;

            return ret;
          }

          q.exec(function(err, res) {
            if (err) return done(err);
            assert.ok(called);
            db.close(done);
          });
        });

      })
    })
  })

  describe('setOptions', function(){
    it('works', function(done){
      var q = new Query;
      q.setOptions({ thing: "cat" });
      q.setOptions({ populate: ['fans'] });
      q.setOptions({ batchSize: 10 });
      q.setOptions({ limit: 4 });
      q.setOptions({ skip: 3 });
      q.setOptions({ sort: '-blah' });
      q.setOptions({ sort: {'woot': -1} });
      q.setOptions({ hint: { index1: 1, index2: -1 }});
      q.setOptions({ read: ['s', [{dc:'eu'}]]});

      assert.equal(q.options.thing, 'cat');
      assert.deepEqual(q._mongooseOptions.populate.fans, { path: 'fans', select: undefined, match: undefined, options: undefined, model: undefined, _docs: {} });
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
          { numbers: [3,4,5] }
        , { strings: 'hi there'.split(' ') } , function (err, doc1, doc2) {

        assert.ifError(err);

        Product.find().setOptions({ limit: 1, sort: {_id: -1}, read: 'n' }).exec(function (err, docs) {
          db.close();
          assert.ifError(err);
          assert.equal(docs.length, 1);
          assert.equal(docs[0].id, doc2.id);
          done();
        });
      });
    })
  })

  describe('update', function(){
    it('when empty, nothing is run', function(done){
      var q = new Query;
      assert.equal(false, !!q._castUpdate({}));
      done();
    });
  });

  describe('gh-1950', function() {
    it('ignores sort when passed to count', function(done) {
      var db = start();
      var Product = db.model('Product', 'Product_setOptions_test');
      Product.find().sort({ _id: 1 }).count({}).exec(function(error) {
        assert.ifError(error);
        db.close(done);
      });
    });

    it('ignores count when passed to sort', function(done) {
      var db = start();
      var Product = db.model('Product', 'Product_setOptions_test');
      Product.find().count({}).sort({ _id: 1 }).exec(function(error) {
        assert.ifError(error);
        db.close(done);
      });
    });
  });
})
