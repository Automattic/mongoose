
/**
 * Module dependencies.
 */

var Query = require('mongoose/query')
  , start = require('./common')
  , mongoose = start.mongoose
  , DocumentObjectId = mongoose.Types.ObjectId
  , Schema = mongoose.Schema

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

  'test setting a condition via where': function () {
    var query = new Query();
    query.where('name', 'guillermo');
    query._conditions.should.eql({name: 'guillermo'});
  },

  'test Query#gte where 2 arguments': function () {
    var query = new Query();
    query.gte('age', 18);
    query._conditions.should.eql({age: {$gte: 18}});
  },

  'test Query#gt where 2 arguments': function () {
    var query = new Query();
    query.gt('age', 17);
    query._conditions.should.eql({age: {$gt: 17}});
  },

  'test Query#lte where 2 arguments': function () {
    var query = new Query();
    query.lte('age', 65);
    query._conditions.should.eql({age: {$lte: 65}});
  },

  'test Query#lt where 2 arguments': function () {
    var query = new Query();
    query.lt('age', 66);
    query._conditions.should.eql({age: {$lt: 66}});
  },

  'test Query#gte where 1 argument': function () {
    var query = new Query();
    query.where("age").gte(18);
    query._conditions.should.eql({age: {$gte: 18}});
  },

  'test Query#gt where 1 argument': function () {
    var query = new Query();
    query.where("age").gt(17);
    query._conditions.should.eql({age: {$gt: 17}});
  },

  'test Query#lte where 1 argument': function () {
    var query = new Query();
    query.where("age").lte(65);
    query._conditions.should.eql({age: {$lte: 65}});
  },

  'test Query#lt where 1 argument': function () {
    var query = new Query();
    query.where("age").lt(66);
    query._conditions.should.eql({age: {$lt: 66}});
  },

  'test combined Query#lt and Query#gt': function () {
    var query = new Query();
    query.where("age").lt(66).gt(17);
    query._conditions.should.eql({age: {$lt: 66, $gt: 17}});
  },

  'test Query#lt on one path and Query#gt on another path on the same query': function () {
    var query = new Query();
    query
      .where("age").lt(66)
      .where("height").gt(5);
    query._conditions.should.eql({age: {$lt: 66}, height: {$gt: 5}});
  },

  'test Query#ne where 2 arguments': function () {
    var query = new Query();
    query.ne('age', 21);
    query._conditions.should.eql({age: {$ne: 21}});
  },

  'test Query#gte where 1 argument': function () {
    var query = new Query();
    query.where("age").ne(21);
    query._conditions.should.eql({age: {$ne: 21}});
  },

  'test Query#ne alias Query#notEqualTo': function () {
    var query = new Query();
    query.where('age').notEqualTo(21);
    query._conditions.should.eql({age: {$ne: 21}});

    query = new Query();
    query.notEqualTo('age', 21);
    query._conditions.should.eql({age: {$ne: 21}});
  },

  'test Query#in where 2 arguments': function () {
    var query = new Query();
    query.in('age', [21, 25, 30]);
    query._conditions.should.eql({age: {$in: [21, 25, 30]}});
  },

  'test Query#in where 1 argument': function () {
    var query = new Query();
    query.where("age").in([21, 25, 30]);
    query._conditions.should.eql({age: {$in: [21, 25, 30]}});
  },

  'test Query#in where a non-array value not via where': function () {
    var query = new Query();
    query.in('age', 21);
    query._conditions.should.eql({age: {$in: 21}});
  },

  'test Query#in where a non-array value via where': function () {
    var query = new Query();
    query.where('age').in(21);
    query._conditions.should.eql({age: {$in: 21}});
  },

  'test Query#nin where 2 arguments': function () {
    var query = new Query();
    query.nin('age', [21, 25, 30]);
    query._conditions.should.eql({age: {$nin: [21, 25, 30]}});
  },

  'test Query#nin where 1 argument': function () {
    var query = new Query();
    query.where("age").nin([21, 25, 30]);
    query._conditions.should.eql({age: {$nin: [21, 25, 30]}});
  },

  'test Query#nin where a non-array value not via where': function () {
    var query = new Query();
    query.nin('age', 21);
    query._conditions.should.eql({age: {$nin: 21}});
  },

  'test Query#nin where a non-array value via where': function () {
    var query = new Query();
    query.where('age').nin(21);
    query._conditions.should.eql({age: {$nin: 21}});
  },

  'test Query#mod not via where, where [a, b] param': function () {
    var query = new Query();
    query.mod('age', [5, 2]);
    query._conditions.should.eql({age: {$mod: [5, 2]}});
  },

  'test Query#mod not via where, where a and b params': function () {
    var query = new Query();
    query.mod('age', 5, 2);
    query._conditions.should.eql({age: {$mod: [5, 2]}});
  },

  'test Query#mod via where, where [a, b] param': function () {
    var query = new Query();
    query.where("age").mod([5, 2]);
    query._conditions.should.eql({age: {$mod: [5, 2]}});
  },

  'test Query#mod via where, where a and b params': function () {
    var query = new Query();
    query.where("age").mod(5, 2);
    query._conditions.should.eql({age: {$mod: [5, 2]}});
  },

  'test Query#near via where, where [lat, long] param': function () {
    var query = new Query();
    query.where('checkin').near([40, -72]);
    query._conditions.should.eql({checkin: {$near: [40, -72]}});
  },

  'test Query#near via where, where lat and long params': function () {
    var query = new Query();
    query.where('checkin').near(40, -72);
    query._conditions.should.eql({checkin: {$near: [40, -72]}});
  },

  'test Query#near not via where, where [lat, long] param': function () {
    var query = new Query();
    query.near('checkin', [40, -72]);
    query._conditions.should.eql({checkin: {$near: [40, -72]}});
  },

  'test Query#near not via where, where lat and long params': function () {
    var query = new Query();
    query.near('checkin', 40, -72);
    query._conditions.should.eql({checkin: {$near: [40, -72]}});
  },

  'test Query#wherein.box not via where': function () {
    var query = new Query();
    query.wherein.box('gps', {ll: [5, 25], ur: [10, 30]});
    query._conditions.should.eql({gps: {$wherein: {$box: [[5, 25], [10, 30]]}}});
  },

  'test Query#wherein.box via where': function () {
    var query = new Query();
    query.where('gps').wherein.box({ll: [5, 25], ur: [10, 30]});
    query._conditions.should.eql({gps: {$wherein: {$box: [[5, 25], [10, 30]]}}});
  },

  'test Query#wherein.center not via where': function () {
    var query = new Query();
    query.wherein.center('gps', {center: [5, 25], radius: 5});
    query._conditions.should.eql({gps: {$wherein: {$center: [[5, 25], 5]}}});
  },

  'test Query#wherein.center not via where': function () {
    var query = new Query();
    query.where('gps').wherein.center({center: [5, 25], radius: 5});
    query._conditions.should.eql({gps: {$wherein: {$center: [[5, 25], 5]}}});
  },

  'test Query#exists where 0 arguments via where': function () {
    var query = new Query();
    query.where("username").exists();
    query._conditions.should.eql({username: {$exists: true}});
  },

  'test Query#exists where 1 argument via where': function () {
    var query = new Query();
    query.where("username").exists(false);
    query._conditions.should.eql({username: {$exists: false}});
  },

  'test Query#exists where 1 argument not via where': function () {
    var query = new Query();
    query.exists('username');
    query._conditions.should.eql({username: {$exists: true}});
  },

  'test Query#exists where 1 argument not via where': function () {
    var query = new Query();
    query.exists("username", false);
    query._conditions.should.eql({username: {$exists: false}});
  },

  // TODO $not
  
  'test Query#all via where': function () {
    var query = new Query();
    query.where('pets').all(['dog', 'cat', 'ferret']);
    query._conditions.should.eql({pets: {$all: ['dog', 'cat', 'ferret']}});
  },

  'test Query#all not via where': function () {
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

  'test Query#size via where': function () {
    var query = new Query();
    query.where('collection').size(5);
    query._conditions.should.eql({collection: {$size: 5}});
  },

  'test Query#size not via where': function () {
    var query = new Query();
    query.size('collection', 5);
    query._conditions.should.eql({collection: {$size: 5}});
  },

  'test Query#slice via where, where just positive limit param': function () {
    var query = new Query();
    query.where('collection').slice(5);
    query._fields.should.eql({collection: {$slice: 5}});
  },

  'test Query#slice via where, where just negative limit param': function () {
    var query = new Query();
    query.where('collection').slice(-5);
    query._fields.should.eql({collection: {$slice: -5}});
  },

  'test Query#slice via where, where [skip, limit] param': function () {
    var query = new Query();
    query.where('collection').slice([14, 10]); // Return the 15th through 25th
    query._fields.should.eql({collection: {$slice: [14, 10]}});
  },

  'test Query#slice via where, where skip and limit params': function () {
    var query = new Query();
    query.where('collection').slice(14, 10); // Return the 15th through 25th
    query._fields.should.eql({collection: {$slice: [14, 10]}});
  },

  'test Query#slice via where, where just positive limit param': function () {
    var query = new Query();
    query.where('collection').slice(5);
    query._fields.should.eql({collection: {$slice: 5}});
  },

  'test Query#slice via where, where just negative limit param': function () {
    var query = new Query();
    query.where('collection').slice(-5);
    query._fields.should.eql({collection: {$slice: -5}});
  },

  'test Query#slice via where, where the [skip, limit] param': function () {
    var query = new Query();
    query.where('collection').slice([14, 10]); // Return the 15th through 25th
    query._fields.should.eql({collection: {$slice: [14, 10]}});
  },

  'test Query#slice via where, where the skip and limit params': function () {
    var query = new Query();
    query.where('collection').slice(14, 10); // Return the 15th through 25th
    query._fields.should.eql({collection: {$slice: [14, 10]}});
  },


  'test Query#slice not via where, where just positive limit param': function () {
    var query = new Query();
    query.slice('collection', 5);
    query._fields.should.eql({collection: {$slice: 5}});
  },

  'test Query#slice not via where, where just negative limit param': function () {
    var query = new Query();
    query.slice('collection', -5);
    query._fields.should.eql({collection: {$slice: -5}});
  },

  'test Query#slice not via where, where [skip, limit] param': function () {
    var query = new Query();
    query.slice('collection', [14, 10]); // Return the 15th through 25th
    query._fields.should.eql({collection: {$slice: [14, 10]}});
  },

  'test Query#slice not via where, where skip and limit params': function () {
    var query = new Query();
    query.slice('collection', 14, 10); // Return the 15th through 25th
    query._fields.should.eql({collection: {$slice: [14, 10]}});
  },

  'test Query#elemMatch not via where': function () {
    var query = new Query();
    query.elemMatch('comments', {author: 'bnoguchi', votes: {$gte: 5}});
    query._conditions.should.eql({comments: {$elemMatch: {author: 'bnoguchi', votes: {$gte: 5}}}});
  },

  'test Query#elemMatch not via where, where block notation': function () {
    var query = new Query();
    query.elemMatch('comments', function (elem) {
      elem.where('author', 'bnoguchi')
      elem.where('votes').gte(5);
    });
    query._conditions.should.eql({comments: {$elemMatch: {author: 'bnoguchi', votes: {$gte: 5}}}});
  },

  'test Query#elemMatch via where': function () {
    var query = new Query();
    query.where('comments').elemMatch({author: 'bnoguchi', votes: {$gte: 5}});
    query._conditions.should.eql({comments: {$elemMatch: {author: 'bnoguchi', votes: {$gte: 5}}}});
  },

  'test Query#elemMatch via where, where block notation': function () {
    var query = new Query();
    query.where('comments').elemMatch(function (elem) {
      elem.where('author', 'bnoguchi')
      elem.where('votes').gte(5);
    });
    query._conditions.should.eql({comments: {$elemMatch: {author: 'bnoguchi', votes: {$gte: 5}}}});
  },

  
  'test Query#$where where a function arg': function () {
    var query = new Query();
    function filter () {
      return this.lastName === this.firstName;
    }
    query.$where(filter);
    query._conditions.should.eql({$where: filter});
  },

  'test Query#where where a javascript string arg': function () {
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

  'test running an empty Query should not throw': function () {
    var query = new Query();
    var threw = false;

    try {
      query.exec();
    } catch (err) {
      threw = true;
    }

    threw.should.eql(false);
  },

  'test casting an array set to mixed type works': function () {
    var query = new Query();
    var db = start();
    var Product = db.model('Product');
    var params = { _id: new DocumentObjectId, tags: { $in: [ 4, 8, 15, 16 ] }};

    query.cast(Product, params);

    params.tags.$in.should.eql([4,8,15,16]);
    db.close();
  },

  'Query#find $ne should not cast single value to array for schematype of Array': function () {
    var query = new Query();
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
    params.array.$ne.should.equal(5);
    params.ids.$ne.should.eql(id);
    params.comments.$ne.should.eql(castedComment);
    params.strings.$ne.should.eql('Hi there');
    params.numbers.$ne.should.eql(10000);

    params.array.$ne = [5];
    params.ids.$ne = [id];
    params.comments.$ne = [comment];
    params.strings.$ne = ['Hi there'];
    params.numbers.$ne = [10000];
    query.cast(Product, params);
    params.array.$ne.should.be.instanceof(Array);
    params.array.$ne[0].should.eql(5);
    params.ids.$ne.should.be.instanceof(Array);
    params.ids.$ne[0].toString().should.eql(id.toString());
    params.comments.$ne.should.be.instanceof(Array);
    params.comments.$ne[0].toObject().should.eql(castedComment);
    params.strings.$ne.should.be.instanceof(Array);
    params.strings.$ne[0].should.eql('Hi there');
    params.numbers.$ne.should.be.instanceof(Array);
    params.numbers.$ne[0].should.eql(10000);
  },

  'Query#find should not cast single value to array for schematype of Array': function () {
    var query = new Query();
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
    params.array.should.equal(5);
    params.ids.should.eql(id);
    params.comments.should.eql(castedComment);
    params.strings.should.eql('Hi there');
    params.numbers.should.eql(10000);

    params.array = [5];
    params.ids = [id];
    params.comments = [comment];
    params.strings = ['Hi there'];
    params.numbers = [10000];
    query.cast(Product, params);
    params.array.should.be.instanceof(Array);
    params.array[0].should.eql(5);
    params.ids.should.be.instanceof(Array);
    params.ids[0].toString().should.eql(id.toString());
    params.comments.should.be.instanceof(Array);
    params.comments[0].toObject().should.eql(castedComment);
    params.strings.should.be.instanceof(Array);
    params.strings[0].should.eql('Hi there');
    params.numbers.should.be.instanceof(Array);
    params.numbers[0].should.eql(10000);
  },
  // Advanced Query options

  'test Query#maxscan': function () {
    var query = new Query();
    query.maxscan(100);
    query.options.maxscan.should.equal(100);
  },

  'test Query#hint': function () {
    var query = new Query();
    query.hint('indexAttributeA', 1, 'indexAttributeB', -1);
    query.options.hint.should.eql({'indexAttributeA': 1, 'indexAttributeB': -1});

    var query2 = new Query();
    query2.hint({'indexAttributeA': 1, 'indexAttributeB': -1});
    query2.options.hint.should.eql({'indexAttributeA': 1, 'indexAttributeB': -1});

    var query3 = new Query();
    query3.hint('indexAttributeA');
    query3.options.hint.should.eql({});
  },

  'test Query#snapshot': function () {
    var query = new Query();
    query.snapshot(true);
    query.options.snapshot.should.be.true;
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

  // TODO
//  'test Query#explain': function () {
//  }

//  'queries should be composable': function () {
//    var q1 = new Query({name: 'hello'})
//      , q2 = new Query({age: {$gte: 21}})
//      , q3 = q1.and(q2);
//    
//    q3.should.be.an.instanceof(Query);
//    q3._conditions.should.eql({name: 'hello', age: {$gte: 21}});
//  }
};
