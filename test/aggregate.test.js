/**
 * Module dependencies
 */

var start = require('./common');
var Aggregate = require('../lib/aggregate');
var mongoose = start.mongoose;
var Schema = mongoose.Schema;
var assert = require('power-assert');

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

function setupData(callback) {
  var saved = 0;
  var emps = [
    { name: 'Alice', sal: 18000, dept: 'sales', customers: ['Eve', 'Fred'] },
    { name: 'Bob', sal: 15000, dept: 'sales', customers: ['Gary', 'Herbert', 'Isaac'], reportsTo: 'Alice' },
    { name: 'Carol', sal: 14000, dept: 'r&d', reportsTo: 'Bob' },
    { name: 'Dave', sal: 14500, dept: 'r&d', reportsTo: 'Carol' }
  ];
  var db = start();
  var Employee = db.model('Employee');

  emps.forEach(function(data) {
    var emp = new Employee(data);

    emp.save(function() {
      if (++saved === emps.length) {
        callback(db);
      }
    });
  });
}

/**
 * Helper function to test operators that only work in MongoDB 3.4 and above (such as some aggregation pipeline operators)
 *
 * @param {Object} ctx, `this`, so that mocha tests can be skipped
 * @param {Function} done
 * @return {Void}
 */
function onlyTestMongo34(ctx, done) {
  start.mongodVersion(function(err, version) {
    if (err) {
      done(err);
      return;
    }
    var mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
    if (!mongo34) {
      ctx.skip();
    }
    done();
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
      onlyTestMongo34(this, done);
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
  });

  describe('exec', function() {
    var db;

    before(function(done) {
      setupData(function(_db) {
        db = _db;
        done();
      });
    });

    after(function(done) {
      db.close(done);
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
            assert.deepEqual(docs[0].departments, [
              { _id: 'r&d', count: 2 },
              { _id: 'sales', count: 2 }
            ]);

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
      it('without a callback', function(done) {
        var agg = new Aggregate;

        agg.model(db.model('Employee'));
        var promise = agg.exec();
        assert.ok(promise instanceof mongoose.Promise);
        promise.onResolve(function(err) {
          assert.ok(err);
          assert.equal(err.message, 'Aggregate has empty pipeline');
          done();
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
        assert.throws(function() {
          aggregate.exec();
        }, 'Aggregate not bound to any Model');

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
        var aggregate = m.aggregate(match).read(pref);
        if (mongo26_or_greater) {
          aggregate.allowDiskUse(true);
        }

        assert.equal(aggregate.options.readPreference.mode, pref);
        if (mongo26_or_greater) {
          assert.equal(aggregate.options.allowDiskUse, true);
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
  });

  it('cursor (gh-3160)', function(done) {
    var db = start();

    var MyModel = db.model('gh3160', { name: String });

    MyModel.create({ name: 'test' }, function(error) {
      assert.ifError(error);
      MyModel.
        aggregate([{ $match: { name: 'test' } }, { $project: { name: '$name' } }]).
        allowDiskUse(true).
        cursor({ batchSize: 2500, async: true }).
        exec(function(error, cursor) {
          assert.ifError(error);
          assert.ok(cursor);
          cursor.toArray(function(error) {
            assert.ifError(error);
            db.close(done);
          });
        });
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
    var db = start();

    var MyModel = db.model('gh5145', { name: String });

    var cursor = MyModel.
      aggregate([{ $match: { name: 'test' } }]).
      cursor({ useMongooseAggCursor: true }).
      exec();
    assert.ok(cursor instanceof require('stream').Readable);
    done();
  });

  it('cursor() eachAsync (gh-4300)', function(done) {
    var db = start();

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
              then: function(onResolve) {
                setTimeout(function() {
                  assert.equal(_cur, cur++);
                  onResolve();
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

  it('ability to add noCursorTimeout option (gh-4241)', function(done) {
    var db = start();

    var MyModel = db.model('gh4241', {
      name: String
    });

    MyModel.
      aggregate([{ $match: { name: 'test' } }]).
      addCursorFlag('noCursorTimeout', true).
      cursor({ async: true }).
      exec(function(error, cursor) {
        assert.ifError(error);
        assert.ok(cursor.s.cmd.noCursorTimeout);
        done();
      });
  });

  it('query by document (gh-4866)', function(done) {
    var db = start();

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
    var db = start();

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
});
