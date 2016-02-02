var start = require('./common'),
    mongoose = start.mongoose,
    Schema = mongoose.Schema,
    assert = require('power-assert'),
    random = require('../lib/utils').random,
    Query = require('../lib/query');


var Comment = new Schema({
  text: String
});

var Product = new Schema({
  tags: {}, // mixed
  array: Array,
  ids: [Schema.ObjectId],
  strings: [String],
  numbers: [Number],
  comments: [Comment],
  title: String
});
var prodName = 'Product' + random();
var cName = 'Comment' + random();
mongoose.model(prodName, Product);
mongoose.model(cName, Comment);

describe('Query:', function() {
  describe('toConstructor', function() {
    it('creates a query', function(done) {
      var db = start();
      var Product = db.model(prodName);
      var prodQ = Product.find({title: /test/}).toConstructor();

      assert.ok(prodQ() instanceof Query);

      db.close(done);
    });

    it('copies all the right values', function(done) {
      var db = start();
      var Product = db.model(prodName);

      var prodQ = Product.update({title: /test/}, {title: 'blah'});

      var prodC = prodQ.toConstructor();

      assert.deepEqual(prodQ._conditions, prodC()._conditions);
      assert.deepEqual(prodQ._fields, prodC()._fields);
      assert.deepEqual(prodQ._update, prodC()._update);
      assert.equal(prodQ._path, prodC()._path);
      assert.equal(prodQ._distinct, prodC()._distinct);
      assert.deepEqual(prodQ._collection, prodC()._collection);
      assert.deepEqual(prodQ.model, prodC().model);
      assert.deepEqual(prodQ.mongooseCollection, prodC().mongooseCollection);
      assert.deepEqual(prodQ._mongooseOptions, prodC()._mongooseOptions);

      db.close(done);
    });

    it('gets expected results', function(done) {
      var db = start();
      var Product = db.model(prodName);
      Product.create({title: 'this is a test'}, function(err, p) {
        assert.ifError(err);
        var prodC = Product.find({title: /test/}).toConstructor();

        prodC().exec(function(err, results) {
          db.close();
          assert.ifError(err);
          assert.equal(results.length, 1);
          assert.equal(p.title, results[0].title);
          done();
        });
      });
    });

    it('can be re-used multiple times', function(done) {
      var db = start();
      var Product = db.model(prodName);

      Product.create([{title: 'moar thing'}, {title: 'second thing'}], function(err, prods) {
        assert.ifError(err);
        assert.equal(prods.length, 2);
        var prod = prods[0];
        var prodC = Product.find({title: /thing/}).toConstructor();

        prodC().exec(function(err, results) {
          assert.ifError(err);

          assert.equal(results.length, 2);
          prodC().find({_id: prod.id}).exec(function(err, res) {
            assert.ifError(err);
            assert.equal(res.length, 1);

            prodC().exec(function(err, res) {
              db.close();
              assert.ifError(err);
              assert.equal(res.length, 2);
              done();
            });
          });
        });
      });
    });

    it('options get merged properly', function(done) {
      var db = start();
      var Product = db.model(prodName);
      db.close();

      var prodC = Product.find({title: /blah/}).setOptions({sort: 'title', lean: true});
      prodC = prodC.toConstructor();

      var nq = prodC(null, {limit: 3});
      assert.deepEqual(nq._mongooseOptions, {lean: true, limit: 3});
      assert.deepEqual(nq.options, {sort: {title: 1}, limit: 3});
      done();
    });

    it('options get cloned (gh-3176)', function(done) {
      var db = start();
      var Product = db.model(prodName);
      db.close();

      var prodC = Product.find({title: /blah/}).setOptions({sort: 'title', lean: true});
      prodC = prodC.toConstructor();

      var nq = prodC(null, {limit: 3});
      assert.deepEqual(nq._mongooseOptions, {lean: true, limit: 3});
      assert.deepEqual(nq.options, {sort: {title: 1}, limit: 3});
      var nq2 = prodC(null, {limit: 5});
      assert.deepEqual(nq._mongooseOptions, {lean: true, limit: 3});
      assert.deepEqual(nq2._mongooseOptions, {lean: true, limit: 5});
      done();
    });

    it('creates subclasses of mquery', function(done) {
      var db = start();
      var Product = db.model(prodName);
      db.close();

      var opts = {safe: {w: 'majority'}, readPreference: 'p'};
      var match = {title: 'test', count: {$gt: 101}};
      var select = {name: 1, count: 0};
      var update = {$set: {title: 'thing'}};
      var path = 'title';

      var q = Product.update(match, update);
      q.select(select);
      q.where(path);
      q.setOptions(opts);
      q.find();

      var M = q.toConstructor();
      var m = M();

      assert.ok(m instanceof Query);
      assert.deepEqual(opts, m.options);
      assert.deepEqual(match, m._conditions);
      assert.deepEqual(select, m._fields);
      assert.deepEqual(update, m._update);
      assert.equal(path, m._path);
      assert.equal('find', m.op);
      done();
    });
  });
});
