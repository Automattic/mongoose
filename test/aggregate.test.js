'use strict';

/**
 * Module dependencies
 */

const co = require('co');
const start = require('./common');
const assert = require('power-assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const Aggregate = require('../lib/aggregate');

/**
 * Test data
 */

var EmployeeSchema = new Schema({
  name: String,
  sal: Number,
  dept: String,
  customers: [String],
  reportsTo: String
});

mongoose.model('Employee', EmployeeSchema);

function setupData(db, callback) {
  var saved = 0;
  var emps = [
    { name: 'Alice', sal: 18000, dept: 'sales', customers: ['Eve', 'Fred'] },
    { name: 'Bob', sal: 15000, dept: 'sales', customers: ['Gary', 'Herbert', 'Isaac'], reportsTo: 'Alice' },
    { name: 'Carol', sal: 14000, dept: 'r&d', reportsTo: 'Bob' },
    { name: 'Dave', sal: 14500, dept: 'r&d', reportsTo: 'Carol' }
  ];
  var Employee = db.model('Employee');

  emps.forEach(function(data) {
    var emp = new Employee(data);

    emp.save(function() {
      if (++saved === emps.length) {
        callback();
      }
    });
  });
}

/**
 * Helper function to test operators that only work in a specific version of MongoDB and above (such as some aggregation pipeline operators)
 *
 * @param {String} semver, `3.4`, specify minimum compatible mongod version
 * @param {Object} ctx, `this`, so that mocha tests can be skipped
 * @param {Function} done
 * @return {Void}
 */
function onlyTestAtOrAbove(semver, ctx, done) {
  start.mongodVersion(function(err, version) {
    if (err) {
      done(err);
      return;
    }

    var desired = semver.split('.').map(function(s) {
      return parseInt(s);
    });

    var meetsMinimum = version[0] > desired[0] || (version[0] === desired[0] && version[1] >= desired[1]);

    if (!meetsMinimum) {
      ctx.skip();
    }
    done();
  });
}

/**
 * Test.
 */

describe('aggregate: ', function() {
  var db;

  before(function() {
    db = start();
  });

  after(function(done) {
    db.close(done);
  });

  describe('append', function() {
    it('(pipeline)', function(done) {
      var aggregate = new Aggregate();

      assert.equal(aggregate.append({ $a: 1 }, { $b: 2 }, { $c: 3 }), aggregate);
      assert.deepEqual(aggregate._pipeline, [{ $a: 1 }, { $b: 2 }, { $c: 3 }]);

      aggregate.append({ $d: 4 }, { $c: 5 });
      assert.deepEqual(aggregate._pipeline, [{ $a: 1 }, { $b: 2 }, { $c: 3 }, { $d: 4 }, { $c: 5 }]);

      done();
    });

    it('supports array as single argument', function(done) {
      var aggregate = new Aggregate();

      assert.equal(aggregate.append([{ $a: 1 }, { $b: 2 }, { $c: 3 }]), aggregate);
      assert.deepEqual(aggregate._pipeline, [{ $a: 1 }, { $b: 2 }, { $c: 3 }]);

      aggregate.append([{ $d: 4 }, { $c: 5 }]);
      assert.deepEqual(aggregate._pipeline, [{ $a: 1 }, { $b: 2 }, { $c: 3 }, { $d: 4 }, { $c: 5 }]);

      done();
    });

    it('throws if non-operator parameter is passed', function(done) {
      var aggregate = new Aggregate();
      var regexp = /Arguments must be aggregate pipeline operators/;

      assert.throws(function() {
        aggregate.append({ $a: 1 }, 'string');
      }, regexp);

      assert.throws(function() {
        aggregate.append({ $a: 1 }, ['array']);
      }, regexp);

      assert.throws(function() {
        aggregate.append({ $a: 1 }, { a: 1 });
      }, regexp);

      assert.throws(function() {
        aggregate.append([{ $a: 1 }, { a: 1 }]);
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

    it('does not throw when empty array is passed as single argument', function(done) {
      var aggregate = new Aggregate();

      assert.doesNotThrow(function() {
        aggregate.append([]);
      });

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

      aggregate.project(' a b   -c  ');
      assert.deepEqual(aggregate._pipeline, [{ $project: { a: 1, b: 1, c: 0 } }]);

      aggregate.project('b');
      assert.deepEqual(aggregate._pipeline, [{ $project: { a: 1, b: 1, c: 0 } }, { $project: { b: 1 } }]);

      done();
    });

    it('("a","b","c")', function(done) {
      assert.throws(function() {
        var aggregate = new Aggregate();
        aggregate.project('a', 'b', 'c');
      }, /Invalid project/);

      done();
    });

    it('["a","b","c"]', function(done) {
      assert.throws(function() {
        var aggregate = new Aggregate();
        aggregate.project(['a', 'b', 'c']);
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

      assert.equal(aggregate.unwind('field'), aggregate);
      assert.deepEqual(aggregate._pipeline, [{ $unwind: '$field' }]);

      aggregate.unwind('a', 'b', 'c');
      assert.deepEqual(aggregate._pipeline, [
        { $unwind: '$field' },
        { $unwind: '$a' },
        { $unwind: '$b' },
        { $unwind: '$c' }
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

      aggregate.sort(' a b   -c  ');
      assert.deepEqual(aggregate._pipeline, [{ $sort: { a: 1, b: 1, c: -1 } }]);

      aggregate.sort('b');
      assert.deepEqual(aggregate._pipeline, [{ $sort: { a: 1, b: 1, c: -1 } }, { $sort: { b: 1 } }]);

      done();
    });

    it('("a","b","c")', function(done) {
      assert.throws(function() {
        var aggregate = new Aggregate();
        aggregate.sort('a', 'b', 'c');
      }, /Invalid sort/);

      done();
    });

    it('["a","b","c"]', function(done) {
      assert.throws(function() {
        var aggregate = new Aggregate();
        aggregate.sort(['a', 'b', 'c']);
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
      Aggregate._prepareDiscriminatorPipeline(aggregate);
      assert.deepEqual(aggregate._pipeline,
        [{ $geoNear: { a: 1, query: { __t: 'subschema' } } }]);

      aggregate = new Aggregate();
      aggregate._model = stub;

      aggregate.near({ b: 2, query: { x: 1 } });
      Aggregate._prepareDiscriminatorPipeline(aggregate);
      assert.deepEqual(aggregate._pipeline,
        [{ $geoNear: { b: 2, query: { x: 1, __t: 'subschema' } } }]);

      done();
    });
  });

  describe('lookup', function() {
    it('works', function(done) {
      var aggregate = new Aggregate();
      var obj = {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'users'
      };

      aggregate.lookup(obj);

      assert.equal(aggregate._pipeline.length, 1);
      assert.deepEqual(aggregate._pipeline[0].$lookup, obj);
      done();
    });
  });

  describe('sample', function() {
    it('works', function(done) {
      var aggregate = new Aggregate();

      aggregate.sample(3);

      assert.equal(aggregate._pipeline.length, 1);
      assert.deepEqual(aggregate._pipeline[0].$sample, { size: 3 });
      done();
    });
  });

  describe('bind', function() {
    it('works', function(done) {
      var aggregate = new Aggregate();
      var model = { foo: 42 };

      assert.equal(aggregate.model(model), aggregate);
      assert.equal(aggregate._model, model);

      done();
    });
  });

  describe('Mongo 3.4 operators', function() {
    before(function(done) {
      onlyTestAtOrAbove('3.4', this, done);
    });

    describe('graphLookup', function() {
      it('works', function(done) {
        var aggregate = new Aggregate();
        aggregate.graphLookup({
          startWith: '$test',
          from: 'sourceCollection',
          connectFromField: 'testFromField',
          connectToField: '_id'
        });

        assert.equal(aggregate._pipeline.length, 1);
        assert.deepEqual(aggregate._pipeline[0].$graphLookup, {
          startWith: '$test',
          from: 'sourceCollection',
          connectFromField: 'testFromField',
          connectToField: '_id'
        });
        done();
      });

      it('automatically prepends $ to the startWith field', function(done) {
        var aggregate = new Aggregate();
        aggregate.graphLookup({
          startWith: 'test'
        });

        assert.deepEqual(aggregate._pipeline[0].$graphLookup, {
          startWith: '$test'
        });
        done();
      });

      it('Throws if no options are passed to graphLookup', function(done) {
        var aggregate = new Aggregate();
        try {
          aggregate.graphLookup('invalid options');
          done(new Error('Should have errored'));
        } catch (error) {
          assert.ok(error instanceof TypeError);
          done();
        }
      });
    });

    describe('addFields', function() {
      it('(object)', function(done) {
        var aggregate = new Aggregate();

        assert.equal(aggregate.addFields({ a: 1, b: 1, c: 0 }), aggregate);
        assert.deepEqual(aggregate._pipeline, [{ $addFields: { a: 1, b: 1, c: 0 } }]);

        aggregate.addFields({ d: {$add: ['$a','$b']} });
        assert.deepEqual(aggregate._pipeline, [{ $addFields: { a: 1, b: 1, c: 0 } }, { $addFields: { d: {$add: ['$a','$b']} } }]);
        done();
      });
    });

    describe('facet', function() {
      it('works', function(done) {
        var aggregate = new Aggregate();

        aggregate.facet({
          heights: [
            // This will group documents by their `height` property
            { $group: { _id: '$height', count: { $sum: 1 } } },
            // This will sort by descending height
            { $sort: { count: -1, _id: -1 } }
          ],
          players: [
            // This will group documents by their `firstName` property
            {
              $group: { _id: '$firstName', count: { $sum: 1 } }
            },
            // This will sort documents by their firstName descending
            { $sort: { count: -1, _id: -1 } }
          ]
        });

        assert.equal(aggregate._pipeline.length, 1);
        assert.deepEqual(aggregate._pipeline[0].$facet, {
          heights: [
            // This will group documents by their `height` property
            { $group: { _id: '$height', count: { $sum: 1 } } },
            // This will sort by descending height
            { $sort: { count: -1, _id: -1 } }
          ],
          players: [
            // This will group documents by their `firstName` property
            {
              $group: {
                _id: '$firstName', count: { $sum: 1 }
              }
            },

            // This will sort documents by their firstName descending
            {
              $sort: { count: -1, _id: -1 }
            }
          ]
        });
        done();
      });
    });

    describe('replaceRoot', function() {
      it('works with a string', function(done) {
        var aggregate = new Aggregate();

        aggregate.replaceRoot('myNewRoot');

        assert.deepEqual(aggregate._pipeline,
          [{ $replaceRoot: { newRoot: '$myNewRoot' }}]);
        done();
      });
      it('works with an object (gh-6474)', function(done) {
        var aggregate = new Aggregate();

        aggregate.replaceRoot({ x: { $concat: ['$this', '$that'] } });

        assert.deepEqual(aggregate._pipeline,
          [{ $replaceRoot: { newRoot: { x: { $concat: ['$this', '$that'] } } } } ]);
        done();
      });
    });

    describe('count', function() {
      it('works', function(done) {
        var aggregate = new Aggregate();

        aggregate.count('countResult');

        assert.deepEqual(aggregate._pipeline, [{ $count: 'countResult' }]);
        done();
      });
    });

    describe('sortByCount', function() {
      it('works with a string argument', function(done) {
        var aggregate = new Aggregate();

        aggregate.sortByCount('countedField');

        assert.deepEqual(aggregate._pipeline, [{ $sortByCount: '$countedField' }]);
        done();
      });

      it('works with an object argument', function(done) {
        var aggregate = new Aggregate();

        aggregate.sortByCount({ lname: '$employee.last' });

        assert.deepEqual(aggregate._pipeline,
          [{ $sortByCount: { lname: '$employee.last' }}]);
        done();
      });

      it('throws if the argument is neither a string or object', function(done) {
        var aggregate = new Aggregate();
        try {
          aggregate.sortByCount(1);
          done(new Error('Should have errored'));
        } catch (error) {
          assert.ok(error instanceof TypeError);
          done();
        }
      });
    });
  });

  describe('exec', function() {
    before(function(done) {
      setupData(db, done);
    });

    it('project', function(done) {
      var aggregate = new Aggregate();

      aggregate.
        model(db.model('Employee')).
        project({ sal: 1, sal_k: { $divide: ['$sal', 1000] } }).
        exec(function(err, docs) {
          assert.ifError(err);
          docs.forEach(function(doc) {
            assert.equal(doc.sal / 1000, doc.sal_k);
          });

          done();
        });
    });

    it('group', function(done) {
      var aggregate = new Aggregate();

      aggregate.
        model(db.model('Employee')).
        group({ _id: '$dept' }).
        exec(function(err, docs) {
          var depts;
          assert.ifError(err);
          assert.equal(docs.length, 2);

          depts = docs.map(function(doc) {
            return doc._id;
          });
          assert.notEqual(depts.indexOf('sales'), -1);
          assert.notEqual(depts.indexOf('r&d'), -1);
          done();
        });
    });

    it('skip', function(done) {
      var aggregate = new Aggregate();

      aggregate.
        model(db.model('Employee')).
        skip(1).
        exec(function(err, docs) {
          assert.ifError(err);
          assert.equal(docs.length, 3);

          done();
        });
    });

    it('limit', function(done) {
      var aggregate = new Aggregate();

      aggregate.
        model(db.model('Employee')).
        limit(3).
        exec(function(err, docs) {
          assert.ifError(err);
          assert.equal(docs.length, 3);

          done();
        });
    });

    it('unwind', function(done) {
      var aggregate = new Aggregate();

      aggregate.
        model(db.model('Employee')).
        unwind('customers').
        exec(function(err, docs) {
          assert.ifError(err);
          assert.equal(docs.length, 5);

          done();
        });
    });

    it('unwind with obj', function(done) {
      var aggregate = new Aggregate();

      var agg = aggregate.
        model(db.model('Employee')).
        unwind({ path: '$customers', preserveNullAndEmptyArrays: true });

      assert.equal(agg._pipeline.length, 1);
      assert.strictEqual(agg._pipeline[0].$unwind.preserveNullAndEmptyArrays,
        true);
      done();
    });

    it('unwind throws with bad arg', function(done) {
      var aggregate = new Aggregate();

      var threw = false;
      try {
        aggregate.
          model(db.model('Employee')).
          unwind(36);
      } catch (err) {
        assert.ok(err.message.indexOf('to unwind()') !== -1);
        threw = true;
      }
      assert.ok(threw);
      done();
    });

    it('match', function(done) {
      var aggregate = new Aggregate();

      aggregate.
        model(db.model('Employee')).
        match({ sal: { $gt: 15000 } }).
        exec(function(err, docs) {
          assert.ifError(err);
          assert.equal(docs.length, 1);

          done();
        });
    });

    it('sort', function(done) {
      var aggregate = new Aggregate();

      aggregate.
        model(db.model('Employee')).
        sort('sal').
        exec(function(err, docs) {
          assert.ifError(err);
          assert.equal(docs[0].sal, 14000);

          done();
        });
    });

    it('graphLookup', function(done) {
      var _this = this;
      start.mongodVersion(function(err, version) {
        if (err) {
          done(err);
          return;
        }
        var mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
        if (!mongo34) {
          _this.skip();
        }
        test();
      });

      function test() {
        var aggregate = new Aggregate();

        aggregate.
          model(db.model('Employee')).
          graphLookup({
            from: 'employees',
            startWith: '$reportsTo',
            connectFromField: 'reportsTo',
            connectToField: 'name',
            as: 'employeeHierarchy'
          }).
          sort({name: 1}).
          exec(function(err, docs) {
            if (err) {
              return done(err);
            }
            var lowest = docs[3];
            assert.equal(lowest.name, 'Dave');
            assert.equal(lowest.employeeHierarchy.length, 3);

            // First result in array is max depth result
            var names = lowest.employeeHierarchy.map(function(doc) {
              return doc.name;
            }).sort();
            assert.equal(names[0], 'Alice');
            assert.equal(names[1], 'Bob');
            assert.equal(names[2], 'Carol');
            done();
          });
      }
    });

    it('facet', function(done) {
      var _this = this;
      start.mongodVersion(function(err, version) {
        if (err) {
          done(err);
          return;
        }
        var mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
        if (!mongo34) {
          _this.skip();
        }
        test();
      });

      function test() {
        var aggregate = new Aggregate();

        aggregate.
          model(db.model('Employee')).
          facet({
            departments: [
              {
                $group: { _id: '$dept', count: { $sum: 1 } }
              }
            ],
            employeesPerCustomer: [
              { $unwind: '$customers' },
              { $sortByCount: '$customers' },
              { $sort: { _id: 1 } }
            ]
          }).
          exec(function(error, docs) {
            if (error) {
              return done(error);
            }
            assert.deepEqual(docs[0].departments.map(d => d.count), [2, 2]);

            assert.deepEqual(docs[0].employeesPerCustomer, [
              { _id: 'Eve', count: 1 },
              { _id: 'Fred', count: 1 },
              { _id: 'Gary', count: 1 },
              { _id: 'Herbert', count: 1 },
              { _id: 'Isaac', count: 1 }
            ]);
            done();
          });
      }
    });

    it('complex pipeline', function(done) {
      var aggregate = new Aggregate();

      aggregate.
        model(db.model('Employee')).
        match({ sal: { $lt: 16000 } }).
        unwind('customers').
        project({ emp: '$name', cust: '$customers' }).
        sort('-cust').
        skip(2).
        exec(function(err, docs) {
          assert.ifError(err);
          assert.equal(docs.length, 1);
          assert.equal(docs[0].cust, 'Gary');
          assert.equal(docs[0].emp, 'Bob');

          done();
        });
    });

    it('pipeline() (gh-5825)', function(done) {
      var aggregate = new Aggregate();

      var pipeline = aggregate.
        model(db.model('Employee')).
        match({ sal: { $lt: 16000 } }).
        pipeline();

      assert.deepEqual(pipeline, [{ $match: { sal: { $lt: 16000 } } }]);
      done();
    });

    it('explain()', function(done) {
      var aggregate = new Aggregate();
      start.mongodVersion(function(err, version) {
        if (err) {
          done(err);
          return;
        }
        var mongo26 = version[0] > 2 || (version[0] === 2 && version[1] >= 6);
        if (!mongo26) {
          done();
          return;
        }

        aggregate.
          model(db.model('Employee')).
          match({ sal: { $lt: 16000 } }).
          explain(function(err1, output) {
            assert.ifError(err1);
            assert.ok(output);
            // make sure we got explain output
            assert.ok(output.stages);

            done();
          });
      });
    });

    describe('error when empty pipeline', function() {
      it('without a callback', function() {
        var agg = new Aggregate;

        agg.model(db.model('Employee'));
        var promise = agg.exec();
        assert.ok(promise instanceof mongoose.Promise);

        return promise.catch(error => {
          assert.ok(error);
          assert.ok(error.message.indexOf('empty pipeline') !== -1, error.message);
        });
      });

      it('with a callback', function(done) {
        var aggregate = new Aggregate();
        var callback;

        aggregate.model(db.model('Employee'));
        callback = function(err) {
          assert.ok(err);
          assert.equal(err.message, 'Aggregate has empty pipeline');
          done();
        };

        aggregate.exec(callback);
      });
    });

    describe('error when not bound to a model', function() {
      it('with callback', function(done) {
        var aggregate = new Aggregate();

        aggregate.skip(0);
        let threw = false;
        try {
          aggregate.exec();
        } catch (error) {
          threw = true;
          assert.equal(error.message, 'Aggregate not bound to any Model');
        }
        assert.ok(threw);

        done();
      });
    });

    it('handles aggregation options', function(done) {
      start.mongodVersion(function(err, version) {
        if (err) {
          throw err;
        }
        var mongo26_or_greater = version[0] > 2 || (version[0] === 2 && version[1] >= 6);

        var m = db.model('Employee');
        var match = { $match: { sal: { $gt: 15000 } } };
        var pref = 'primaryPreferred';
        var aggregate = m.aggregate([match]).read(pref);
        if (mongo26_or_greater) {
          aggregate.allowDiskUse(true);
          aggregate.option({maxTimeMS: 1000});
        }


        assert.equal(aggregate.options.readPreference.mode, pref);
        if (mongo26_or_greater) {
          assert.equal(aggregate.options.allowDiskUse, true);
          assert.equal(aggregate.options.maxTimeMS, 1000);
        }

        aggregate.
          exec(function(err, docs) {
            assert.ifError(err);
            assert.equal(1, docs.length);
            assert.equal(docs[0].sal, 18000);
            done();
          });
      });
    });

    describe('middleware (gh-5251)', function() {
      it('pre', function(done) {
        var s = new Schema({ name: String });

        var called = 0;
        s.pre('aggregate', function(next) {
          ++called;
          next();
        });

        var M = db.model('gh5251', s);

        M.aggregate([{ $match: { name: 'test' } }], function(error, res) {
          assert.ifError(error);
          assert.deepEqual(res, []);
          assert.equal(called, 1);
          done();
        });
      });

      it('post', function(done) {
        var s = new Schema({ name: String });

        var calledWith = [];
        s.post('aggregate', function(res, next) {
          calledWith.push(res);
          next();
        });

        var M = db.model('gh5251_post', s);

        M.aggregate([{ $match: { name: 'test' } }], function(error, res) {
          assert.ifError(error);
          assert.deepEqual(res, []);
          assert.equal(calledWith.length, 1);
          assert.deepEqual(calledWith[0], []);
          done();
        });
      });

      it('error handler with agg error', function(done) {
        var s = new Schema({ name: String });

        var calledWith = [];
        s.post('aggregate', function(error, res, next) {
          calledWith.push(error);
          next();
        });

        var M = db.model('gh5251_error_agg', s);

        M.aggregate([{ $fakeStage: { name: 'test' } }], function(error, res) {
          assert.ok(error);
          assert.ok(error.message.indexOf('Unrecognized pipeline stage') !== -1,
            error.message);
          assert.equal(res, null);
          assert.equal(calledWith.length, 1);
          assert.equal(calledWith[0], error);
          done();
        });
      });

      it('error handler with pre error', function(done) {
        var s = new Schema({ name: String });

        var calledWith = [];
        s.pre('aggregate', function(next) {
          next(new Error('woops'));
        });
        s.post('aggregate', function(error, res, next) {
          calledWith.push(error);
          next();
        });

        var M = db.model('gh5251_error', s);

        M.aggregate([{ $match: { name: 'test' } }], function(error, res) {
          assert.ok(error);
          assert.equal(error.message, 'woops');
          assert.equal(res, null);
          assert.equal(calledWith.length, 1);
          assert.equal(calledWith[0], error);
          done();
        });
      });

      it('with agg cursor', function(done) {
        var s = new Schema({ name: String });

        var calledPre = 0;
        var calledPost = 0;
        s.pre('aggregate', function(next) {
          ++calledPre;
          next();
        });
        s.post('aggregate', function(res, next) {
          ++calledPost;
          next();
        });

        var M = db.model('gh5251_cursor', s);

        var numDocs = 0;
        M.
          aggregate([{ $match: { name: 'test' } }]).
          cursor({ useMongooseAggCursor: true }).
          exec().
          eachAsync(function() {
            ++numDocs;
          }).
          then(function() {
            assert.equal(numDocs, 0);
            assert.equal(calledPre, 1);
            assert.equal(calledPost, 0);
            done();
          });
      });
    });

    it('readPref from schema (gh-5522)', function(done) {
      var schema = new Schema({ name: String }, { read: 'secondary' });
      var M = db.model('gh5522', schema);
      var a = M.aggregate();
      assert.equal(a.options.readPreference.mode, 'secondary');

      a.read('secondaryPreferred');

      assert.equal(a.options.readPreference.mode, 'secondaryPreferred');

      done();
    });
  });

  it('cursor (gh-3160)', function() {
    const MyModel = db.model('gh3160', { name: String });

    return co(function * () {
      yield MyModel.create({ name: 'test' });

      const cursor = MyModel.
        aggregate([{ $match: { name: 'test' } }, { $project: { name: '$name' } }]).
        allowDiskUse(true).
        cursor({ batchSize: 2500 }).
        exec();

      assert.ok(cursor.eachAsync);
    });
  });

  it('cursor() without options (gh-3855)', function(done) {
    var db = start();

    var MyModel = db.model('gh3855', { name: String });

    db.on('open', function() {
      var cursor = MyModel.
        aggregate([{ $match: { name: 'test' } }]).
        cursor().
        exec();
      assert.ok(cursor instanceof require('stream').Readable);
      done();
    });
  });

  it('cursor() with useMongooseAggCursor (gh-5145)', function(done) {
    var MyModel = db.model('gh5145', { name: String });

    var cursor = MyModel.
      aggregate([{ $match: { name: 'test' } }]).
      cursor({ useMongooseAggCursor: true }).
      exec();
    assert.ok(cursor instanceof require('stream').Readable);

    done();
  });

  it('cursor() with useMongooseAggCursor works (gh-5145) (gh-5394)', function(done) {
    var MyModel = db.model('gh5394', { name: String });

    MyModel.create({ name: 'test' }, function(error) {
      assert.ifError(error);

      var docs = [];
      MyModel.
        aggregate([{ $match: { name: 'test' } }]).
        cursor({ useMongooseAggCursor: true }).
        exec().
        eachAsync(function(doc) {
          docs.push(doc);
        }).
        then(function() {
          assert.equal(docs.length, 1);
          assert.equal(docs[0].name, 'test');
          done();
        });
    });
  });

  it('cursor() eachAsync (gh-4300)', function(done) {
    var MyModel = db.model('gh4300', { name: String });

    var cur = 0;
    var expectedNames = ['Axl', 'Slash'];
    MyModel.create([{ name: 'Axl' }, { name: 'Slash' }]).
      then(function() {
        return MyModel.aggregate([{ $sort: { name: 1 } }]).
          cursor().
          exec().
          eachAsync(function(doc) {
            var _cur = cur;
            assert.equal(doc.name, expectedNames[cur]);
            return {
              then: function(resolve) {
                setTimeout(function() {
                  assert.equal(_cur, cur++);
                  resolve();
                }, 50);
              }
            };
          }).
          then(function() {
            done();
          });
      }).
      catch(done);
  });

  it('cursor() eachAsync with options (parallel)', function(done) {
    var MyModel = db.model('gh-6168', { name: String });

    var names = [];
    var startedAt = [];
    var expectedNames = ['Axl', 'Slash'];
    var checkDoc = function(doc) {
      names.push(doc.name);
      startedAt.push(Date.now());
      return {
        then: function(resolve) {
          setTimeout(function() {
            resolve();
          }, 100);
        }
      };
    };
    MyModel.create([{ name: 'Axl' }, { name: 'Slash' }]).
      then(function() {
        return MyModel.aggregate([{ $sort: { name: 1 } }]).
          cursor().
          exec().
          eachAsync(checkDoc, { parallel: 2}).then(function() {
            assert.ok(Date.now() - startedAt[1] > 100);
            assert.equal(startedAt.length, 2);
            assert.ok(startedAt[1] - startedAt[0] < 50);
            assert.deepEqual(names.sort(), expectedNames);
            done();
          });
      }).
      catch(done);
  });

  it('ability to add noCursorTimeout option (gh-4241)', function(done) {
    var MyModel = db.model('gh4241', {
      name: String
    });

    const cursor = MyModel.
      aggregate([{ $match: { name: 'test' } }]).
      addCursorFlag('noCursorTimeout', true).
      cursor().
      exec();

    cursor.once('cursor', cursor => {
      assert.ok(cursor.s.cmd.noCursorTimeout);
      done();
    });
  });

  it('query by document (gh-4866)', function(done) {
    var MyModel = db.model('gh4866', {
      name: String
    });

    MyModel.create({ name: 'test' }).
      then(function(doc) { return MyModel.aggregate([{ $match: doc }]); }).
      then(function() {
        done();
      }).
      catch(done);
  });

  it('sort by text score (gh-5258)', function(done) {
    var mySchema = new Schema({ test: String });
    mySchema.index({ test: 'text' });
    var M = db.model('gh5258', mySchema);

    M.on('index', function(error) {
      assert.ifError(error);
      M.create([{ test: 'test test' }, { test: 'a test' }], function(error) {
        assert.ifError(error);
        var aggregate = M.aggregate();
        aggregate.match({ $text: { $search: 'test' } });
        aggregate.sort({ score: { $meta: 'textScore' } });

        aggregate.exec(function(error, res) {
          assert.ifError(error);
          assert.equal(res.length, 2);
          assert.equal(res[0].test, 'test test');
          assert.equal(res[1].test, 'a test');
          done();
        });
      });
    });
  });

  describe('Mongo 3.6 options', function() {
    before(function(done) {
      onlyTestAtOrAbove('3.6', this, done);
    });

    it('adds hint option', function(done) {
      var mySchema = new Schema({ name: String, qty: Number });
      mySchema.index({ qty: -1, name: -1 });
      var M = db.model('gh6251', mySchema);
      M.on('index', function(error) {
        assert.ifError(error);
        var docs = [
          { name: 'Andrew', qty: 4 },
          { name: 'Betty', qty: 5 },
          { name: 'Charlie', qty: 4 }
        ];
        M.create(docs, function(error) {
          assert.ifError(error);
          var aggregate = M.aggregate();
          aggregate.match({})
            .hint({ qty: -1, name: -1 }).exec(function(error, docs) {
              assert.ifError(error);
              assert.equal(docs[0].name, 'Betty');
              assert.equal(docs[1].name, 'Charlie');
              assert.equal(docs[2].name, 'Andrew');
              done();
            });
        });
      });
    });


  });
});
