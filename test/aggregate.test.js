'use strict';

/**
 * Module dependencies
 */

const start = require('./common');

const assert = require('assert');

const Aggregate = require('../lib/aggregate');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

/**
 * Test data
 */

async function setupData(db) {
  const EmployeeSchema = new Schema({
    name: String,
    sal: Number,
    dept: String,
    customers: [String],
    reportsTo: String
  });

  const emps = [
    { name: 'Alice', sal: 18000, dept: 'sales', customers: ['Eve', 'Fred'] },
    { name: 'Bob', sal: 15000, dept: 'sales', customers: ['Gary', 'Herbert', 'Isaac'], reportsTo: 'Alice' },
    { name: 'Carol', sal: 14000, dept: 'r&d', reportsTo: 'Bob' },
    { name: 'Dave', sal: 14500, dept: 'r&d', reportsTo: 'Carol' }
  ];
  const Employee = db.model('Employee', EmployeeSchema);

  await Employee.deleteMany({});

  await Employee.create(emps);
}

/**
 * Helper function to test operators that only work in a specific version of MongoDB and above (such as some aggregation pipeline operators)
 *
 * @param {String} semver, `3.4`, specify minimum compatible mongod version
 * @param {Object} ctx, `this`, so that mocha tests can be skipped
 * @return {Promise<void>}
 */
async function onlyTestAtOrAbove(semver, ctx) {
  const versions = {
    3.4: [3, 4],
    3.6: [3, 6]
  };

  if (semver.length !== 3 || Object.keys(versions).indexOf(semver) === -1) {
    throw new TypeError('onlyTestAtOrAbove expects either ' + Object.keys(versions).join(', ') + ' as first parameter.');
  }

  const version = await start.mongodVersion();

  const desired = versions[semver];

  const meetsMinimum = version[0] > desired[0] || (version[0] === desired[0] && version[1] >= desired[1]);

  if (!meetsMinimum) {
    ctx.skip();
  }
}

/**
 * Test.
 */

describe('aggregate: ', function() {
  let db;

  before(function startConnection() {
    db = start();
  });

  after(async function closeConnection() {
    await db.close();
  });

  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => require('./util').clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  describe('append', function() {
    it('(pipeline)', function() {
      const aggregate = new Aggregate();

      assert.equal(aggregate.append({ $a: 1 }, { $b: 2 }, { $c: 3 }), aggregate);
      assert.deepEqual(aggregate._pipeline, [{ $a: 1 }, { $b: 2 }, { $c: 3 }]);

      aggregate.append({ $d: 4 }, { $c: 5 });
      assert.deepEqual(aggregate._pipeline, [{ $a: 1 }, { $b: 2 }, { $c: 3 }, { $d: 4 }, { $c: 5 }]);
    });

    it('supports array as single argument', function() {
      const aggregate = new Aggregate();

      assert.equal(aggregate.append([{ $a: 1 }, { $b: 2 }, { $c: 3 }]), aggregate);
      assert.deepEqual(aggregate._pipeline, [{ $a: 1 }, { $b: 2 }, { $c: 3 }]);

      aggregate.append([{ $d: 4 }, { $c: 5 }]);
      assert.deepEqual(aggregate._pipeline, [{ $a: 1 }, { $b: 2 }, { $c: 3 }, { $d: 4 }, { $c: 5 }]);
    });

    it('throws if non-operator parameter is passed', function() {
      const aggregate = new Aggregate();
      const regexp = /Arguments must be aggregate pipeline operators/;

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
    });

    it('does not throw when 0 args passed', function() {
      const aggregate = new Aggregate();

      assert.doesNotThrow(function() {
        aggregate.append();
      });
    });

    it('does not throw when empty array is passed as single argument', function() {
      const aggregate = new Aggregate();

      assert.doesNotThrow(function() {
        aggregate.append([]);
      });
    });
  });

  describe('project', function() {
    it('(object)', function() {
      const aggregate = new Aggregate();

      assert.equal(aggregate.project({ a: 1, b: 1, c: 0 }), aggregate);
      assert.deepEqual(aggregate._pipeline, [{ $project: { a: 1, b: 1, c: 0 } }]);

      aggregate.project({ b: 1 });
      assert.deepEqual(aggregate._pipeline, [{ $project: { a: 1, b: 1, c: 0 } }, { $project: { b: 1 } }]);
    });

    it('(string)', function() {
      const aggregate = new Aggregate();

      aggregate.project(' a b   -c  ');
      assert.deepEqual(aggregate._pipeline, [{ $project: { a: 1, b: 1, c: 0 } }]);

      aggregate.project('b');
      assert.deepEqual(aggregate._pipeline, [{ $project: { a: 1, b: 1, c: 0 } }, { $project: { b: 1 } }]);
    });

    it('("a","b","c")', function() {
      assert.throws(function() {
        const aggregate = new Aggregate();
        aggregate.project('a', 'b', 'c');
      }, /Invalid project/);
    });

    it('["a","b","c"]', function() {
      assert.throws(function() {
        const aggregate = new Aggregate();
        aggregate.project(['a', 'b', 'c']);
      }, /Invalid project/);
    });
  });

  describe('group', function() {
    it('works', function() {
      const aggregate = new Aggregate();

      assert.equal(aggregate.group({ a: 1, b: 2 }), aggregate);
      assert.deepEqual(aggregate._pipeline, [{ $group: { a: 1, b: 2 } }]);

      aggregate.group({ c: 3 });
      assert.deepEqual(aggregate._pipeline, [{ $group: { a: 1, b: 2 } }, { $group: { c: 3 } }]);
    });
  });

  describe('skip', function() {
    it('works', function() {
      const aggregate = new Aggregate();

      assert.equal(aggregate.skip(42), aggregate);
      assert.deepEqual(aggregate._pipeline, [{ $skip: 42 }]);

      aggregate.skip(42);
      assert.deepEqual(aggregate._pipeline, [{ $skip: 42 }, { $skip: 42 }]);
    });
  });

  describe('limit', function() {
    it('works', function() {
      const aggregate = new Aggregate();

      assert.equal(aggregate.limit(42), aggregate);
      assert.deepEqual(aggregate._pipeline, [{ $limit: 42 }]);

      aggregate.limit(42);
      assert.deepEqual(aggregate._pipeline, [{ $limit: 42 }, { $limit: 42 }]);
    });
  });

  describe('unwind', function() {
    it('("field")', function() {
      const aggregate = new Aggregate();

      assert.equal(aggregate.unwind('field'), aggregate);
      assert.deepEqual(aggregate._pipeline, [{ $unwind: '$field' }]);

      aggregate.unwind('a', 'b', 'c');
      assert.deepEqual(aggregate._pipeline, [
        { $unwind: '$field' },
        { $unwind: '$a' },
        { $unwind: '$b' },
        { $unwind: '$c' }
      ]);
    });
  });

  describe('match', function() {
    it('works', function() {
      const aggregate = new Aggregate();

      assert.equal(aggregate.match({ a: 1 }), aggregate);
      assert.deepEqual(aggregate._pipeline, [{ $match: { a: 1 } }]);

      aggregate.match({ b: 2 });
      assert.deepEqual(aggregate._pipeline, [{ $match: { a: 1 } }, { $match: { b: 2 } }]);
    });
  });

  describe('sort', function() {
    it('(object)', function() {
      const aggregate = new Aggregate();

      assert.equal(aggregate.sort({ a: 1, b: 'asc', c: 'descending' }), aggregate);
      assert.deepEqual(aggregate._pipeline, [{ $sort: { a: 1, b: 1, c: -1 } }]);

      aggregate.sort({ b: 'desc' });
      assert.deepEqual(aggregate._pipeline, [{ $sort: { a: 1, b: 1, c: -1 } }, { $sort: { b: -1 } }]);
    });

    it('(string)', function() {
      const aggregate = new Aggregate();

      aggregate.sort(' a b   -c  ');
      assert.deepEqual(aggregate._pipeline, [{ $sort: { a: 1, b: 1, c: -1 } }]);

      aggregate.sort('b');
      assert.deepEqual(aggregate._pipeline, [{ $sort: { a: 1, b: 1, c: -1 } }, { $sort: { b: 1 } }]);
    });

    it('("a","b","c")', function() {
      assert.throws(function() {
        const aggregate = new Aggregate();
        aggregate.sort('a', 'b', 'c');
      }, /Invalid sort/);
    });

    it('["a","b","c"]', function() {
      assert.throws(function() {
        const aggregate = new Aggregate();
        aggregate.sort(['a', 'b', 'c']);
      }, /Invalid sort/);
    });
  });

  describe('near', function() {
    it('works', function() {
      const aggregate = new Aggregate();

      assert.equal(aggregate.near({ a: 1 }), aggregate);
      assert.deepEqual(aggregate._pipeline, [{ $geoNear: { a: 1 } }]);

      aggregate.near({ b: 2 });
      assert.deepEqual(aggregate._pipeline, [{ $geoNear: { a: 1 } }, { $geoNear: { b: 2 } }]);
    });

    it('works with discriminators (gh-3304)', function() {
      let aggregate = new Aggregate();
      const stub = {
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
      Aggregate._prepareDiscriminatorPipeline(aggregate._pipeline, stub.schema);
      assert.deepEqual(aggregate._pipeline,
        [{ $geoNear: { a: 1, query: { __t: 'subschema' } } }]);

      aggregate = new Aggregate();
      aggregate._model = stub;

      aggregate.near({ b: 2, query: { x: 1 } });
      Aggregate._prepareDiscriminatorPipeline(aggregate._pipeline, stub.schema);
      assert.deepEqual(aggregate._pipeline,
        [{ $geoNear: { b: 2, query: { x: 1, __t: 'subschema' } } }]);
    });
  });

  describe('lookup', function() {
    it('works', function() {
      const aggregate = new Aggregate();
      const obj = {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'users'
      };

      aggregate.lookup(obj);

      assert.equal(aggregate._pipeline.length, 1);
      assert.deepEqual(aggregate._pipeline[0].$lookup, obj);
    });
  });

  describe('unionWith', function() {
    it('works', function() {
      const aggregate = new Aggregate();
      const obj = {
        coll: 'users',
        pipeline: [
          {
            $match: { _id: 1 }
          }
        ]
      };

      aggregate.unionWith(obj);

      assert.equal(aggregate._pipeline.length, 1);
      assert.deepEqual(aggregate._pipeline[0].$unionWith, obj);
    });
  });

  describe('sample', function() {
    it('works', function() {
      const aggregate = new Aggregate();

      aggregate.sample(3);

      assert.equal(aggregate._pipeline.length, 1);
      assert.deepEqual(aggregate._pipeline[0].$sample, { size: 3 });
    });
  });

  describe('densify', function() {
    it('works', function() {
      const aggregate = new Aggregate();
      const obj = {
        field: 'timestamp',
        range: {
          step: 1,
          unit: 'hour',
          bounds: [new Date('2021-05-18T00:00:00.000Z'), new Date('2021-05-18T08:00:00.000Z')]
        }
      };

      aggregate.densify(obj);

      assert.equal(aggregate._pipeline.length, 1);
      assert.deepEqual(aggregate._pipeline[0].$densify, obj);
    });
  });

  describe('fill', function() {
    it('works', function() {
      const aggregate = new Aggregate();
      const obj = {
        output:
          {
            bootsSold: { value: 0 },
            sandalsSold: { value: 0 },
            sneakersSold: { value: 0 }
          }
      };

      aggregate.fill(obj);

      assert.equal(aggregate._pipeline.length, 1);
      assert.deepEqual(aggregate._pipeline[0].$fill, obj);
    });
  });

  describe('model()', function() {
    it('works', function() {
      const aggregate = new Aggregate();
      const model = { foo: 42 };

      assert.equal(aggregate._model, null);
      assert.equal(aggregate.model(), null);

      assert.equal(aggregate.model(model), model);
      assert.equal(aggregate._model, model);
      assert.equal(aggregate.model(), model);
    });
  });

  describe('redact', function() {
    const pipelineResult = [{ $redact: { $cond: { if: { $eq: ['$level', 5] }, then: '$$PRUNE', else: '$$DESCEND' } } }];
    it('works', function() {
      const aggregate = new Aggregate();
      aggregate.redact({
        $cond: {
          if: { $eq: ['$level', 5] },
          then: '$$PRUNE',
          else: '$$DESCEND'
        }
      });
      assert.deepEqual(aggregate._pipeline, pipelineResult);
    });
    it('works with (condition, string, string)', function() {
      const aggregate = new Aggregate();
      aggregate.redact({ $eq: ['$level', 5] }, '$$PRUNE', '$$DESCEND');
      assert.deepEqual(aggregate._pipeline, pipelineResult);
    });
  });

  describe('Mongo 3.4 operators', function() {
    before(async function() {
      await onlyTestAtOrAbove('3.4', this);
    });

    describe('graphLookup', function() {
      it('works', function() {
        const aggregate = new Aggregate();
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
      });

      it('automatically prepends $ to the startWith field', function() {
        const aggregate = new Aggregate();
        aggregate.graphLookup({
          startWith: 'test'
        });

        assert.deepEqual(aggregate._pipeline[0].$graphLookup, {
          startWith: '$test'
        });
      });

      it('Throws if no options are passed to graphLookup', function() {
        const aggregate = new Aggregate();
        assert.throws(function() {
          aggregate.graphLookup('invalid options');
        },
        TypeError);
      });
    });

    describe('addFields', function() {
      it('should throw if passed a non object', function() {
        const aggregate = new Aggregate();
        assert.throws(() => {aggregate.addFields('invalid');}, /Invalid addFields\(\) argument\. Must be an object/);
      });
      it('should throw if passed null', function() {
        const aggregate = new Aggregate();
        assert.throws(() => {aggregate.addFields(null);}, /Invalid addFields\(\) argument\. Must be an object/);
      });
      it('should throw if passed an Array', function() {
        const aggregate = new Aggregate();
        assert.throws(() => {aggregate.addFields([]);}, /Invalid addFields\(\) argument\. Must be an object/);
      });
      it('(object)', function() {
        const aggregate = new Aggregate();

        assert.equal(aggregate.addFields({ a: 1, b: 1, c: 0 }), aggregate);
        assert.deepEqual(aggregate._pipeline, [{ $addFields: { a: 1, b: 1, c: 0 } }]);

        aggregate.addFields({ d: { $add: ['$a', '$b'] } });
        assert.deepEqual(aggregate._pipeline, [{ $addFields: { a: 1, b: 1, c: 0 } }, { $addFields: { d: { $add: ['$a', '$b'] } } }]);
      });
    });

    describe('facet', function() {
      it('works', function() {
        const aggregate = new Aggregate();

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
      });
    });

    describe('replaceRoot', function() {
      it('works with a string', function() {
        const aggregate = new Aggregate();

        aggregate.replaceRoot('myNewRoot');

        assert.deepEqual(aggregate._pipeline,
          [{ $replaceRoot: { newRoot: '$myNewRoot' } }]);
      });
      it('works with an object (gh-6474)', function() {
        const aggregate = new Aggregate();

        aggregate.replaceRoot({ x: { $concat: ['$this', '$that'] } });

        assert.deepEqual(aggregate._pipeline,
          [{ $replaceRoot: { newRoot: { x: { $concat: ['$this', '$that'] } } } }]);
      });
    });

    describe('count', function() {
      it('works', function() {
        const aggregate = new Aggregate();

        aggregate.count('countResult');

        assert.deepEqual(aggregate._pipeline, [{ $count: 'countResult' }]);
      });
    });

    describe('sortByCount', function() {
      it('works with a string argument', function() {
        const aggregate = new Aggregate();

        aggregate.sortByCount('countedField');

        assert.deepEqual(aggregate._pipeline, [{ $sortByCount: '$countedField' }]);
      });

      it('works with an object argument', function() {
        const aggregate = new Aggregate();

        aggregate.sortByCount({ lname: '$employee.last' });

        assert.deepEqual(aggregate._pipeline,
          [{ $sortByCount: { lname: '$employee.last' } }]);
      });

      it('throws if the argument is neither a string or object', function() {
        const aggregate = new Aggregate();
        assert.throws(function() {
          aggregate.sortByCount(1);
        }, TypeError);
      });
    });
  });

  describe('exec', function() {
    beforeEach(async function() {
      this.timeout(4000); // double the default of 2 seconds
      await setupData(db);
    });

    it('project', async function() {
      const aggregate = new Aggregate([], db.model('Employee'));

      const docs = await aggregate.project({ sal: 1, sal_k: { $divide: ['$sal', 1000] } }).exec();

      docs.forEach(function(doc) {
        assert.equal(doc.sal / 1000, doc.sal_k);
      });

    });

    it('group', async function() {
      const aggregate = new Aggregate([], db.model('Employee'));

      const docs = await aggregate.
        group({ _id: '$dept' }).
        exec();

      assert.equal(docs.length, 2);

      const depts = docs.map((doc) => doc._id);
      assert.notEqual(depts.indexOf('sales'), -1);
      assert.notEqual(depts.indexOf('r&d'), -1);
    });

    it('skip', async function() {
      const aggregate = new Aggregate([], db.model('Employee'));

      const docs = await aggregate.
        skip(1).
        exec();

      assert.equal(docs.length, 3);
    });

    it('limit', async function() {
      const aggregate = new Aggregate([], db.model('Employee'));

      const docs = await aggregate.
        limit(3).
        exec();

      assert.equal(docs.length, 3);
    });

    it('unwind', async function() {
      const aggregate = new Aggregate([], db.model('Employee'));

      const docs = await aggregate.
        unwind('customers').
        exec();

      assert.equal(docs.length, 5);
    });

    it('unwind with obj', function() {
      const aggregate = new Aggregate();

      const agg = aggregate.
        unwind({ path: '$customers', preserveNullAndEmptyArrays: true });

      assert.equal(agg._pipeline.length, 1);
      assert.strictEqual(agg._pipeline[0].$unwind.preserveNullAndEmptyArrays,
        true);
    });

    it('unwind throws with bad arg', function() {
      const aggregate = new Aggregate();

      let threw = false;
      try {
        aggregate.
          unwind(36);
      } catch (err) {
        assert.ok(err.message.indexOf('to unwind()') !== -1);
        threw = true;
      }
      assert.ok(threw);
    });

    it('match', async function() {
      const aggregate = new Aggregate([], db.model('Employee'));

      const docs = await aggregate.match({ sal: { $gt: 15000 } });

      assert.equal(docs.length, 1);
    });

    it('sort', async function() {
      const aggregate = new Aggregate([], db.model('Employee'));

      const docs = await aggregate.sort('sal');

      assert.equal(docs[0].sal, 14000);
    });

    it('graphLookup', async function() {
      const _this = this;
      const version = await start.mongodVersion();

      const mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
      if (!mongo34) {
        _this.skip();
      }

      const aggregate = new Aggregate([], db.model('Employee'));

      const docs = await aggregate.
        graphLookup({
          from: 'Employee',
          startWith: '$reportsTo',
          connectFromField: 'reportsTo',
          connectToField: 'name',
          as: 'employeeHierarchy'
        }).
        sort({ name: 1 }).
        exec();

      const lowest = docs[3];
      assert.equal(lowest.name, 'Dave');
      assert.equal(lowest.employeeHierarchy.length, 3);

      // First result in array is max depth result
      const names = lowest.employeeHierarchy.map((doc) => doc.name).sort();
      assert.equal(names[0], 'Alice');
      assert.equal(names[1], 'Bob');
      assert.equal(names[2], 'Carol');
    });

    it('facet', async function() {
      const _this = this;
      const version = await start.mongodVersion();

      const mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
      if (!mongo34) {
        _this.skip();
      }


      const aggregate = new Aggregate([], db.model('Employee'));

      const docs = await aggregate.
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
        exec();

      assert.deepEqual(docs[0].departments.map(d => d.count), [2, 2]);

      assert.deepEqual(docs[0].employeesPerCustomer, [
        { _id: 'Eve', count: 1 },
        { _id: 'Fred', count: 1 },
        { _id: 'Gary', count: 1 },
        { _id: 'Herbert', count: 1 },
        { _id: 'Isaac', count: 1 }
      ]);
    });

    it('complex pipeline', async function() {
      const aggregate = new Aggregate([], db.model('Employee'));

      const docs = await aggregate.
        match({ sal: { $lt: 16000 } }).
        unwind('customers').
        project({ emp: '$name', cust: '$customers' }).
        sort('-cust').
        skip(2).
        exec();

      assert.equal(docs.length, 1);
      assert.equal(docs[0].cust, 'Gary');
      assert.equal(docs[0].emp, 'Bob');
    });

    it('pipeline() (gh-5825)', function() {
      const aggregate = new Aggregate();

      const pipeline = aggregate.
        match({ sal: { $lt: 16000 } }).
        pipeline();

      assert.deepEqual(pipeline, [{ $match: { sal: { $lt: 16000 } } }]);
    });

    it('explain()', async function() {
      const aggregate = new Aggregate([], db.model('Employee'));
      const version = await start.mongodVersion();

      const mongo26 = version[0] > 2 || (version[0] === 2 && version[1] >= 6);
      if (!mongo26) {
        return;
      }

      const output = await aggregate.
        match({ sal: { $lt: 16000 } }).
        explain();

      assert.ok(output);
      // make sure we got explain output
      assert.ok(output.stages || output.queryPlanner);
    });

    describe('error when empty pipeline', function() {
      it('without a callback', function() {
        const agg = new Aggregate([], db.model('Employee'));

        const promise = agg.exec();
        assert.ok(promise instanceof Promise);

        return promise.catch(error => {
          assert.ok(error);
          assert.ok(error.message.indexOf('empty pipeline') !== -1, error.message);
        });
      });
    });

    describe('error when not bound to a model', function() {
      it('with callback', async function() {
        const aggregate = new Aggregate();

        aggregate.skip(0);
        try {
          await aggregate.exec();
          assert.ok(false);
        } catch (error) {
          assert.equal(error.message, 'Aggregate not bound to any Model');
        }
      });
    });

    it('handles aggregation options', async function() {
      const version = await start.mongodVersion();

      const m = db.model('Employee');
      const match = { $match: { sal: { $gt: 15000 } } };
      const pref = 'primaryPreferred';
      const aggregate = m.aggregate([match]).read(pref);
      const mongo26_or_greater = version[0] > 2 || (version[0] === 2 && version[1] >= 6);
      const mongo32_or_greater = version[0] > 3 || (version[0] === 3 && version[1] >= 2);

      assert.equal(aggregate.options.readPreference.mode, pref);
      if (mongo26_or_greater) {
        aggregate.allowDiskUse(true);
        aggregate.option({ maxTimeMS: 1000 });
        assert.equal(aggregate.options.allowDiskUse, true);
        assert.equal(aggregate.options.maxTimeMS, 1000);
      }

      if (mongo32_or_greater) {
        aggregate.readConcern('m');
        assert.deepEqual(aggregate.options.readConcern, { level: 'majority' });
      }

      const docs = await aggregate.exec();

      assert.equal(1, docs.length);
      assert.equal(docs[0].sal, 18000);
    });

    describe('middleware (gh-5251)', function() {
      it('pre', async function() {
        const s = new Schema({ name: String });

        let called = 0;
        s.pre('aggregate', function(next) {
          ++called;
          next();
        });

        const M = db.model('Test', s);

        const res = await M.aggregate([{ $match: { name: 'test' } }]);

        assert.deepEqual(res, []);
        assert.equal(called, 1);
      });

      it('setting option in pre (gh-7606)', async function() {
        const s = new Schema({ name: String });

        s.pre('aggregate', function(next) {
          this.options.collation = { locale: 'en_US', strength: 1 };
          next();
        });

        const M = db.model('Test', s);

        await M.create([{ name: 'alpha' }, { name: 'Zeta' }]);

        const docs = await M.aggregate([{ $sort: { name: 1 } }]);

        assert.equal(docs[0].name, 'alpha');
        assert.equal(docs[1].name, 'Zeta');
      });

      it('adding to pipeline in pre (gh-8017)', async function() {
        const s = new Schema({ name: String });

        s.pre('aggregate', function(next) {
          this.append({ $limit: 1 });
          next();
        });

        const M = db.model('Test', s);

        await M.create([{ name: 'alpha' }, { name: 'Zeta' }]);

        const docs = await M.aggregate([{ $sort: { name: 1 } }]);

        assert.equal(docs.length, 1);
        assert.equal(docs[0].name, 'Zeta');
      });

      it('post', async function() {
        const s = new Schema({ name: String });

        const calledWith = [];
        s.post('aggregate', function(res, next) {
          calledWith.push(res);
          next();
        });

        const M = db.model('Test', s);

        const res = await M.aggregate([{ $match: { name: 'test' } }]);

        assert.deepEqual(res, []);
        assert.equal(calledWith.length, 1);
        assert.deepEqual(calledWith[0], []);
      });

      it('error handler with agg error', async function() {
        const s = new Schema({ name: String });

        const calledWith = [];
        s.post('aggregate', function(error, res, next) {
          calledWith.push(error);
          next();
        });

        const M = db.model('Test', s);

        const error = await M.aggregate([{ $fakeStage: { name: 'test' } }]).then(() => null, err => err);

        assert.ok(error);
        assert.ok(
          error.message.indexOf('Unrecognized pipeline stage') !== -1,
          error.message
        );

        assert.equal(calledWith.length, 1);
        assert.equal(calledWith[0], error);
      });

      it('error handler with pre error', async function() {
        const s = new Schema({ name: String });

        const calledWith = [];
        s.pre('aggregate', function(next) {
          next(new Error('woops'));
        });
        s.post('aggregate', function(error, res, next) {
          calledWith.push(error);
          next();
        });

        const M = db.model('Test', s);

        const error = await M.aggregate([{ $match: { name: 'test' } }]).then(() => null, err => err);

        assert.ok(error);
        assert.equal(error.message, 'woops');
        assert.equal(calledWith.length, 1);
        assert.equal(calledWith[0], error);
      });

      it('with agg cursor', async function() {
        const s = new Schema({ name: String });

        let calledPre = 0;
        let calledPost = 0;
        s.pre('aggregate', function(next) {
          ++calledPre;
          next();
        });
        s.post('aggregate', function(res, next) {
          ++calledPost;
          next();
        });

        const M = db.model('Test', s);

        let numDocs = 0;
        await M.
          aggregate([{ $match: { name: 'test' } }]).
          cursor({ useMongooseAggCursor: true }).
          eachAsync(function() { ++numDocs; });

        assert.equal(numDocs, 0);
        assert.equal(calledPre, 1);
        assert.equal(calledPost, 0);
      });

      it('with explain() (gh-5887)', function() {
        const s = new Schema({ name: String });

        let calledPre = 0;
        const calledPost = [];
        s.pre('aggregate', function(next) {
          ++calledPre;
          next();
        });
        s.post('aggregate', function(res, next) {
          calledPost.push(res);
          next();
        });

        const M = db.model('Test', s);

        return M.aggregate([{ $match: { name: 'test' } }]).explain().
          then(() => {
            assert.equal(calledPre, 1);
            assert.equal(calledPost.length, 1);
            assert.ok(calledPost[0].stages || calledPost[0].queryPlanner);
          });
      });
    });

    it('readPref from schema (gh-5522)', function() {
      const schema = new Schema({ name: String }, { read: 'secondary' });
      const M = db.model('Test', schema);
      const a = M.aggregate();
      assert.equal(a.options.readPreference, 'secondary');

      a.read('secondaryPreferred');

      assert.equal(a.options.readPreference.mode, 'secondaryPreferred');
    });
  });

  it('cursor (gh-3160)', async function() {
    const MyModel = db.model('Test', { name: String });

    await MyModel.create({ name: 'test' });

    const cursor = MyModel.
      aggregate([{ $match: { name: 'test' } }, { $project: { name: '$name' } }]).
      allowDiskUse(true).
      cursor({ batchSize: 2500 });

    assert.ok(cursor.eachAsync);
  });

  it('catch() (gh-7267)', async function() {
    const MyModel = db.model('Test', {});

    const err = await MyModel.aggregate([{ $group: { foo: 'bar' } }])
      .then(() => null, err => err);
    assert.ok(err instanceof Error);
    assert.equal(err.name, 'MongoServerError');
  });

  it('cursor() without options (gh-3855)', function() {
    const MyModel = db.model('Test', { name: String });

    const cursor = MyModel.
      aggregate([{ $match: { name: 'test' } }]).
      cursor();
    assert.ok(cursor instanceof require('stream').Readable);
  });

  it('cursor() with useMongooseAggCursor (gh-5145)', function() {
    const MyModel = db.model('Test', { name: String });

    const cursor = MyModel.
      aggregate([{ $match: { name: 'test' } }]).
      cursor({ useMongooseAggCursor: true });
    assert.ok(cursor instanceof require('stream').Readable);
  });

  it('cursor() with useMongooseAggCursor works (gh-5145) (gh-5394)', async function() {
    const MyModel = db.model('Test', { name: String });

    await MyModel.create({ name: 'test' });

    const docs = [];
    await MyModel.
      aggregate([{ $match: { name: 'test' } }]).
      cursor({ useMongooseAggCursor: true }).
      eachAsync(function(doc) {
        docs.push(doc);
      });

    assert.equal(docs.length, 1);
    assert.equal(docs[0].name, 'test');
  });

  it('cursor() eachAsync (gh-4300)', async function() {
    const MyModel = db.model('Test', { name: String });

    let cur = 0;
    const expectedNames = ['Axl', 'Slash'];

    await MyModel.create([{ name: 'Axl' }, { name: 'Slash' }]);

    await MyModel.aggregate([{ $sort: { name: 1 } }]).
      cursor().
      eachAsync(function(doc) {
        const _cur = cur;
        assert.equal(doc.name, expectedNames[cur]);
        return {
          then: function(resolve) {
            setTimeout(function() {
              assert.equal(_cur, cur++);
              resolve();
            }, 50);
          }
        };
      });
  });

  it('cursor() eachAsync with options (parallel)', async function() {
    const MyModel = db.model('Test', { name: String });

    const names = [];
    const startedAt = [];
    const expectedNames = ['Axl', 'Slash'];
    const checkDoc = function(doc) {
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

    await MyModel.create([{ name: 'Axl' }, { name: 'Slash' }]);

    await MyModel.aggregate([{ $sort: { name: 1 } }]).
      cursor().
      eachAsync(checkDoc, { parallel: 2 }).then(function() {
        assert.ok(Date.now() - startedAt[1] >= 75, Date.now() - startedAt[1]);
        assert.equal(startedAt.length, 2);
        assert.ok(startedAt[1] - startedAt[0] < 50, `${startedAt[1] - startedAt[0]}`);
        assert.deepEqual(names.sort(), expectedNames);
      });
  });

  it('is now a proper aggregate cursor vs what it was before gh-10410', function() {
    const MyModel = db.model('Test', { name: String });
    assert.throws(() => {
      MyModel.aggregate([]).cursor({ batchSize: 1000 }).exec();
    });
  });

  it('query by document (gh-4866)', async function() {
    const MyModel = db.model('Test', {
      name: String
    });

    const doc = await MyModel.create({ name: 'test' });
    const res = await MyModel.aggregate([{ $match: doc }]);
    assert.equal(res.length, 1);
  });

  it('sort by text score (gh-5258)', async function() {
    const mySchema = new Schema({ test: String });
    mySchema.index({ test: 'text' });
    const M = db.model('Test', mySchema);

    await M.init();

    await M.create([{ test: 'test test' }, { test: 'a test' }]);

    const aggregate = M.aggregate();
    aggregate.match({ $text: { $search: 'test' } });
    aggregate.sort({ score: { $meta: 'textScore' } });

    const res = await aggregate.exec();

    assert.equal(res.length, 2);
    assert.equal(res[0].test, 'test test');
    assert.equal(res[1].test, 'a test');
  });

  describe('Mongo 3.6 options', function() {
    before(async function() {
      await onlyTestAtOrAbove('3.6', this);
    });

    it('adds hint option', async function() {
      const mySchema = new Schema({ name: String, qty: Number });
      mySchema.index({ qty: -1, name: -1 });
      const M = db.model('Test', mySchema);
      await M.init();

      const docs = [
        { name: 'Andrew', qty: 4 },
        { name: 'Betty', qty: 5 },
        { name: 'Charlie', qty: 4 }
      ];
      await M.create(docs);

      const foundDocs = await M.aggregate().match({})
        .hint({ qty: -1, name: -1 }).exec();

      assert.equal(foundDocs[0].name, 'Betty');
      assert.equal(foundDocs[1].name, 'Charlie');
      assert.equal(foundDocs[2].name, 'Andrew');
    });
  });

  it('should not throw error if database connection has not been established (gh-13125)', async function() {
    const m = new mongoose.Mongoose();
    const mySchema = new Schema({ test: String });
    const M = m.model('Test', mySchema);

    const aggregate = M.aggregate();
    aggregate.match({ foo: 'bar' });

    const p = aggregate.exec();

    await m.connect(start.uri);

    await p;
    await m.disconnect();
  });
});
