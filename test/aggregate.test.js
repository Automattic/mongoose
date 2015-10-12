/**
 * Module dependencies
 */

var start = require('./common')
  , Aggregate = require('../lib/aggregate')
  , mongoose = start.mongoose
  , Schema = mongoose.Schema
  , assert = require('assert');

/**
 * Test data
 */

var EmployeeSchema = new Schema({
  name: String,
  sal: Number,
  dept: String,
  customers: [String]
});

mongoose.model('Employee', EmployeeSchema);

function setupData(callback) {
  var saved = 0
    , emps = [
        { name: "Alice", sal: 18000, dept: "sales", customers: [ 'Eve', 'Fred' ] }
    , { name: "Bob", sal: 15000, dept: "sales", customers: [ 'Gary', 'Herbert', 'Isaac' ] }
    , { name: "Carol", sal: 14000, dept: "r&d" }
    , { name: "Dave", sal: 14500, dept: "r&d" }
    ]
    , db = start()
    , Employee = db.model('Employee');

  emps.forEach(function(data) {
    var emp = new Employee(data);

    emp.save(function() {
      if (++saved === emps.length) {
        callback(db);
      }
    });
  });
}

function clearData(db, callback) {
  db.model('Employee').remove(function() {
    db.close(callback);
  });
}

/**
 * Test.
 */

describe('aggregate: ', function() {
  describe('append', function() {
    it('(pipeline)', function(done) {
      var aggregate = new Aggregate();

      assert.equal(aggregate.append({ $a: 1 }, { $b: 2 }, { $c: 3 }), aggregate);
      assert.deepEqual(aggregate._pipeline, [{ $a: 1 }, { $b: 2 }, { $c: 3 }]);

      aggregate.append({ $d: 4 }, { $c: 5 });
      assert.deepEqual(aggregate._pipeline, [{ $a: 1 }, { $b: 2 }, { $c: 3 }, { $d: 4 }, { $c: 5 }]);

      done();
    });

    it('throws if non-operator parameter is passed', function(done) {
      var aggregate = new Aggregate()
        , regexp = /Arguments must be aggregate pipeline operators/;

      assert.throws(function() {
        aggregate.append({ $a: 1 }, "string");
      }, regexp);

      assert.throws(function() {
        aggregate.append({ $a: 1 }, ["array"]);
      }, regexp);

      assert.throws(function() {
        aggregate.append({ $a: 1 }, { a: 1 });
      }, regexp);

      done();
    });

    it('does not throw when 0 args passed', function(done) {
      var aggregate = new Aggregate();

      assert.doesNotThrow(function() {
        aggregate.append();
      });

      done();
    });

    it('called from constructor', function(done) {
      var aggregate = new Aggregate({ $a: 1 }, { $b: 2 }, { $c: 3 });
      assert.deepEqual(aggregate._pipeline, [{ $a: 1 }, { $b: 2 }, { $c: 3 }]);
      done();
    });
  });

  describe('project', function() {
    it('(object)', function(done) {
      var aggregate = new Aggregate();

      assert.equal(aggregate.project({ a: 1, b: 1, c: 0 }), aggregate);
      assert.deepEqual(aggregate._pipeline, [{ $project: { a: 1, b: 1, c: 0 } }]);

      aggregate.project({ b: 1 });
      assert.deepEqual(aggregate._pipeline, [{ $project: { a: 1, b: 1, c: 0 } }, { $project: { b: 1 } }]);

      done();
    });

    it('(string)', function(done) {
      var aggregate = new Aggregate();

      aggregate.project(" a b   -c  ");
      assert.deepEqual(aggregate._pipeline, [{ $project: { a: 1, b: 1, c: 0 } }]);

      aggregate.project("b");
      assert.deepEqual(aggregate._pipeline, [{ $project: { a: 1, b: 1, c: 0 } }, { $project: { b: 1 } }]);

      done();
    });

    it('("a","b","c")', function(done) {
      assert.throws(function() {
        var aggregate = new Aggregate();
        aggregate.project("a", "b", "c");
      }, /Invalid project/);

      done();
    });

    it('["a","b","c"]', function(done) {
      assert.throws(function() {
        var aggregate = new Aggregate();
        aggregate.project(["a", "b", "c"]);
      }, /Invalid project/);

      done();
    });
  });

  describe('group', function() {
    it('works', function(done) {
      var aggregate = new Aggregate();

      assert.equal(aggregate.group({ a: 1, b: 2 }), aggregate);
      assert.deepEqual(aggregate._pipeline, [{ $group: { a: 1, b: 2 } }]);

      aggregate.group({ c: 3 });
      assert.deepEqual(aggregate._pipeline, [{ $group: { a: 1, b: 2 } }, { $group: { c: 3 } }]);

      done();
    });
  });

  describe('skip', function() {
    it('works', function(done) {
      var aggregate = new Aggregate();

      assert.equal(aggregate.skip(42), aggregate);
      assert.deepEqual(aggregate._pipeline, [{ $skip: 42 }]);

      aggregate.skip(42);
      assert.deepEqual(aggregate._pipeline, [{ $skip: 42 }, { $skip: 42 }]);

      done();
    });
  });

  describe('limit', function() {
    it('works', function(done) {
      var aggregate = new Aggregate();

      assert.equal(aggregate.limit(42), aggregate);
      assert.deepEqual(aggregate._pipeline, [{ $limit: 42 }]);

      aggregate.limit(42);
      assert.deepEqual(aggregate._pipeline, [{ $limit: 42 }, { $limit: 42 }]);

      done();
    });
  });

  describe('unwind', function() {
    it('("field")', function(done) {
      var aggregate = new Aggregate();

      assert.equal(aggregate.unwind("field"), aggregate);
      assert.deepEqual(aggregate._pipeline, [{ $unwind: "$field" }]);

      aggregate.unwind("a", "b", "c");
      assert.deepEqual(aggregate._pipeline, [
        { $unwind: "$field" }
      , { $unwind: "$a" }
      , { $unwind: "$b" }
      , { $unwind: "$c" }
      ]);

      done();
    });
  });

  describe('match', function() {
    it('works', function(done) {
      var aggregate = new Aggregate();

      assert.equal(aggregate.match({ a: 1 }), aggregate);
      assert.deepEqual(aggregate._pipeline, [{ $match: { a: 1 } }]);

      aggregate.match({ b: 2 });
      assert.deepEqual(aggregate._pipeline, [{ $match: { a: 1 } }, { $match: { b: 2 } }]);

      done();
    });
  });

  describe('sort', function() {
    it('(object)', function(done) {
      var aggregate = new Aggregate();

      assert.equal(aggregate.sort({ a: 1, b: 'asc', c: 'descending' }), aggregate);
      assert.deepEqual(aggregate._pipeline, [{ $sort: { a: 1, b: 1, c: -1 } }]);

      aggregate.sort({ b: 'desc' });
      assert.deepEqual(aggregate._pipeline, [{ $sort: { a: 1, b: 1, c: -1 } }, { $sort: { b: -1 } }]);

      done();
    });

    it('(string)', function(done) {
      var aggregate = new Aggregate();

      aggregate.sort(" a b   -c  ");
      assert.deepEqual(aggregate._pipeline, [{ $sort: { a: 1, b: 1, c: -1 } }]);

      aggregate.sort("b");
      assert.deepEqual(aggregate._pipeline, [{ $sort: { a: 1, b: 1, c: -1 } }, { $sort: { b: 1 } }]);

      done();
    });

    it('("a","b","c")', function(done) {
      assert.throws(function() {
        var aggregate = new Aggregate();
        aggregate.sort("a", "b", "c");
      }, /Invalid sort/);

      done();
    });

    it('["a","b","c"]', function(done) {
      assert.throws(function() {
        var aggregate = new Aggregate();
        aggregate.sort(["a", "b", "c"]);
      }, /Invalid sort/);

      done();
    });
  });

  describe('near', function() {
    it('works', function(done) {
      var aggregate = new Aggregate();

      assert.equal(aggregate.near({ a: 1 }), aggregate);
      assert.deepEqual(aggregate._pipeline, [{ $geoNear: { a: 1 } }]);

      aggregate.near({ b: 2 });
      assert.deepEqual(aggregate._pipeline, [{ $geoNear: { a: 1 } }, { $geoNear: { b: 2 } }]);

      done();
    });

    it('works with discriminators (gh-3304)', function(done) {
      var aggregate = new Aggregate();
      var stub = {
        schema: {
          discriminatorMapping: {
            key: '__t',
            value: 'subschema',
            isRoot: false
          }
        }
      };

      aggregate._model = stub;

      assert.equal(aggregate.near({ a: 1 }), aggregate);
      // Run exec so we apply discriminator pipeline
      assert.throws(function() {
        aggregate.exec();
      }, /Cannot read property 'aggregate' of undefined|Cannot call method 'aggregate' of undefined/);
      assert.deepEqual(aggregate._pipeline,
        [{ $geoNear: { a: 1, query: { __t: 'subschema' } } }]);

      aggregate = new Aggregate();
      aggregate._model = stub;

      aggregate.near({ b: 2, query: { x: 1 } });
      assert.throws(function() {
        aggregate.exec();
      }, /Cannot read property 'aggregate' of undefined|Cannot call method 'aggregate' of undefined/);
      assert.deepEqual(aggregate._pipeline,
        [{ $geoNear: { b: 2, query: { x: 1, __t: 'subschema' } } }]);

      done();
    });
  });

  describe('bind', function() {
    it('works', function(done) {
      var aggregate = new Aggregate()
        , model = { foo: 42 };

      assert.equal(aggregate.model(model), aggregate);
      assert.equal(aggregate._model, model);

      done();
    });
  });

  describe('exec', function() {
    it('project', function(done) {
      var aggregate = new Aggregate();

      setupData(function(db) {
        aggregate
          .model(db.model('Employee'))
          .project({ sal: 1, sal_k: { $divide: [ "$sal", 1000 ] } })
          .exec(function(err, docs) {
            assert.ifError(err);
            docs.forEach(function(doc) {
              assert.equal(doc.sal / 1000, doc.sal_k);
            });

            clearData(db, function() { done(); });
          });
      });
    });

    it('group', function(done) {
      var aggregate = new Aggregate();

      setupData(function(db) {
        aggregate
          .model(db.model('Employee'))
          .group({ _id: "$dept" })
          .exec(function(err, docs) {
            var depts;

            assert.ifError(err);
            assert.equal(docs.length, 2);

            depts = docs.map(function(doc) { return doc._id; });
            assert.notEqual(depts.indexOf("sales"), -1);
            assert.notEqual(depts.indexOf("r&d"), -1);

            clearData(db, function() { done(); });
          });
      });
    });

    it('skip', function(done) {
      var aggregate = new Aggregate();

      setupData(function(db) {
        aggregate
          .model(db.model('Employee'))
          .skip(1)
          .exec(function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 3);

            clearData(db, function() { done(); });
          });
      });
    });

    it('limit', function(done) {
      var aggregate = new Aggregate();

      setupData(function(db) {
        aggregate
          .model(db.model('Employee'))
          .limit(3)
          .exec(function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 3);

            clearData(db, function() { done(); });
          });
      });
    });

    it('unwind', function(done) {
      var aggregate = new Aggregate();

      setupData(function(db) {
        aggregate
          .model(db.model('Employee'))
          .unwind('customers')
          .exec(function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 5);

            clearData(db, function() { done(); });
          });
      });
    });

    it('match', function(done) {
      var aggregate = new Aggregate();

      setupData(function(db) {
        aggregate
          .model(db.model('Employee'))
          .match({ sal: { $gt: 15000 } })
          .exec(function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 1);

            clearData(db, function() { done(); });
          });
      });
    });

    it('sort', function(done) {
      var aggregate = new Aggregate();

      setupData(function(db) {
        aggregate
          .model(db.model('Employee'))
          .sort("sal")
          .exec(function(err, docs) {
            assert.ifError(err);
            assert.equal(docs[0].sal, 14000);

            clearData(db, function() { done(); });
          });
      });
    });

    it('complex pipeline', function(done) {
      var aggregate = new Aggregate();

      setupData(function(db) {
        aggregate
          .model(db.model('Employee'))
          .match({ sal: { $lt: 16000 } })
          .unwind('customers')
          .project({ emp: "$name", cust: "$customers" })
          .sort('-cust')
          .skip(2)
          .exec(function(err, docs) {
            assert.ifError(err);
            assert.equal(docs.length, 1);
            assert.equal(docs[0].cust, 'Gary');
            assert.equal(docs[0].emp, 'Bob');

            clearData(db, function() { done(); });
          });
      });
    });

    it('explain()', function(done) {
      var aggregate = new Aggregate();
      start.mongodVersion(function(err, version) {
        if (err) {
          return done(err);
        }
        var mongo26 = 2 < version[0] || (2 == version[0] && 6 <= version[1]);
        if (!mongo26) {
          return done();
        }

        setupData(function(db) {
          aggregate.
            model(db.model('Employee')).
            match({ sal: { $lt: 16000 } }).
            explain(function(err, output) {
              assert.ifError(err);
              assert.ok(output);
              // make sure we got explain output
              assert.ok(output.stages);

              clearData(db, function() { done(); });
            });
        });
      });
    });

    describe('error when empty pipeline', function() {
      it('without a callback', function(done) {
        var agg = new Aggregate;
        setupData(function(db) {
          agg.model(db.model('Employee'));
          var promise = agg.exec();
          assert.ok(promise instanceof mongoose.Promise);
          promise.onResolve(function(err) {
            assert.ok(err);
            assert.equal(err.message, "Aggregate has empty pipeline");
            done();
          });
        });
      });

      it('with a callback', function(done) {
        var aggregate = new Aggregate()
          , callback;

        setupData(function(db) {
          aggregate.model(db.model('Employee'));
          callback = function(err) {
            assert.ok(err);
            assert.equal(err.message, "Aggregate has empty pipeline");
            done();
          };

          aggregate.exec(callback);
        });
      });
    });

    describe('error when not bound to a model', function() {
      it('with callback', function(done) {
        var aggregate = new Aggregate();

        aggregate.skip(0);
        assert.throws(function() {
          aggregate.exec();
        }, 'Aggregate not bound to any Model');

        done();
      });
    });

    it('handles aggregation options', function(done) {
      setupData(function(db) {
        start.mongodVersion(function(err, version) {
          if (err) throw err;
          var mongo26_or_greater = 2 < version[0] || (2 == version[0] && 6 <= version[1]);

          var m = db.model('Employee');
          var match = { $match: { sal: { $gt: 15000 }}};
          var pref = 'primaryPreferred';
          var aggregate = m.aggregate(match).read(pref);
          if (mongo26_or_greater) {
            aggregate.allowDiskUse(true);
          }

          assert.equal(aggregate.options.readPreference.mode, pref);
          if (mongo26_or_greater) {
            assert.equal(aggregate.options.allowDiskUse, true);
          }

          aggregate
            .exec(function(err, docs) {
              assert.ifError(err);
              assert.equal(1, docs.length);
              assert.equal(docs[0].sal, 18000);
              clearData(db, done);
            });
        });
      });
    });
  });
});
