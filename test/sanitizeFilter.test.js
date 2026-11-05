'use strict';

const start = require('./common');

const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

const INJECTED = () => ({ password: { $ne: null } });

function isSanitised(filter) {
  return JSON.stringify(filter ?? {}).includes('"$eq":{"$ne":null}');
}

// Stub the driver-facing collection so these tests don't need a MongoDB server.
// Returns getters for the exact pipeline / ops mongoose would have sent.
function stubCollection(Model) {
  let pipeline = null;
  let ops = null;

  Object.defineProperty(Model, 'collection', {
    configurable: true,
    value: {
      aggregate: async function(p) {
        pipeline = JSON.parse(JSON.stringify(p));
        return { toArray: async() => [] };
      }
    }
  });
  Object.defineProperty(Model, '$__collection', {
    configurable: true,
    value: {
      bulkWrite: async function(o) {
        ops = JSON.parse(JSON.stringify(o));
        return { ok: 1 };
      }
    }
  });

  return { getPipeline: () => pipeline, getOps: () => ops };
}

describe('sanitizeFilter on aggregate() and bulkWrite()', function() {
  let modelCount = 0;

  beforeEach(function() {
    // `sanitizeFilter` precedence matches queries: an explicit setting on the
    // connection or the Mongoose instance wins over an operation-level option,
    // so per-operation tests need the global unset rather than `false`.
    delete mongoose.options.sanitizeFilter;
    if (mongoose.connection.options != null) {
      delete mongoose.connection.options.sanitizeFilter;
    }
  });

  afterEach(function() {
    delete mongoose.options.sanitizeFilter;
    if (mongoose.connection.options != null) {
      delete mongoose.connection.options.sanitizeFilter;
    }
  });

  after(function() {
    for (let i = 0; i < modelCount; ++i) {
      try {
        mongoose.deleteModel(`SanitizeFilterPaths${i}`);
      } catch {
        // ignore
      }
    }
  });

  function createModel(passwordType) {
    const name = `SanitizeFilterPaths${modelCount++}`;
    return mongoose.model(name, new Schema({
      username: String,
      password: passwordType ?? Schema.Types.Mixed
    }));
  }

  it('still sanitizes find() filters', function() {
    mongoose.set('sanitizeFilter', true);
    const Test = createModel();

    const q = Test.find(INJECTED());
    q._castConditions();

    assert.ok(isSanitised(q.getFilter()));
  });

  it('sanitizes $match stages passed to Model.aggregate()', async function() {
    mongoose.set('sanitizeFilter', true);
    const Test = createModel();
    const stub = stubCollection(Test);

    const agg = Test.aggregate([{ $match: INJECTED() }]);
    assert.ok(isSanitised(agg.pipeline()[0].$match), 'pipeline() should already be sanitized');

    await agg.exec();
    assert.ok(isSanitised(stub.getPipeline()[0].$match), 'driver pipeline should be sanitized');
  });

  it('sanitizes $match appended with Aggregate#match()', async function() {
    mongoose.set('sanitizeFilter', true);
    const Test = createModel();
    const stub = stubCollection(Test);

    await Test.aggregate().match(INJECTED()).exec();

    assert.ok(isSanitised(stub.getPipeline()[0].$match));
  });

  it('supports the sanitizeFilter option on Model.aggregate()', async function() {
    const Test = createModel();
    const stub = stubCollection(Test);

    await Test.aggregate([{ $match: INJECTED() }], { sanitizeFilter: true }).exec();

    assert.ok(isSanitised(stub.getPipeline()[0].$match));
  });

  it('supports Aggregate#option({ sanitizeFilter: true }) after the pipeline is built', async function() {
    const Test = createModel();
    const stub = stubCollection(Test);

    await Test.aggregate([{ $match: INJECTED() }]).
      option({ sanitizeFilter: true }).
      exec();

    assert.ok(isSanitised(stub.getPipeline()[0].$match));
  });

  it('sanitizes $match in a connection-level aggregate()', async function() {
    const conn = mongoose.createConnection();
    conn.set('sanitizeFilter', true);
    try {
      const agg = conn.aggregate([{ $match: INJECTED() }]);
      assert.ok(isSanitised(agg.pipeline()[0].$match));
    } finally {
      await conn.close();
    }
  });

  it('respects the connection-level sanitizeFilter option', async function() {
    mongoose.connection.set('sanitizeFilter', true);
    const Test = createModel();
    const stub = stubCollection(Test);

    await Test.aggregate([{ $match: INJECTED() }]).exec();
    assert.ok(isSanitised(stub.getPipeline()[0].$match));

    await Test.bulkWrite([{ deleteOne: { filter: INJECTED() } }]);
    assert.ok(isSanitised(stub.getOps()[0].deleteOne.filter));
  });

  it('sanitizes every bulkWrite() op that takes a filter', async function() {
    mongoose.set('sanitizeFilter', true);
    const Test = createModel();
    const stub = stubCollection(Test);

    await Test.bulkWrite([
      { updateOne: { filter: INJECTED(), update: { $set: { username: 'x' } } } },
      { updateMany: { filter: INJECTED(), update: { $set: { username: 'x' } } } },
      { replaceOne: { filter: INJECTED(), replacement: { username: 'x' } } },
      { deleteOne: { filter: INJECTED() } },
      { deleteMany: { filter: INJECTED() } }
    ]);

    const ops = stub.getOps();
    for (const opName of ['updateOne', 'updateMany', 'replaceOne', 'deleteOne', 'deleteMany']) {
      const op = ops.find(o => o[opName] != null);
      assert.ok(isSanitised(op[opName].filter), `${opName} filter should be sanitized`);
    }
  });

  it('supports the sanitizeFilter option on Model.bulkWrite()', async function() {
    const Test = createModel();
    const stub = stubCollection(Test);

    await Test.bulkWrite([{ deleteOne: { filter: INJECTED() } }], { sanitizeFilter: true });

    assert.ok(isSanitised(stub.getOps()[0].deleteOne.filter));
  });

  it('leaves filters alone when sanitizeFilter is off', async function() {
    const Test = createModel();
    const stub = stubCollection(Test);

    const q = Test.find(INJECTED());
    q._castConditions();
    assert.ok(!isSanitised(q.getFilter()));

    await Test.aggregate([{ $match: INJECTED() }]).exec();
    assert.ok(!isSanitised(stub.getPipeline()[0].$match));

    await Test.bulkWrite([{ deleteOne: { filter: INJECTED() } }]);
    assert.ok(!isSanitised(stub.getOps()[0].deleteOne.filter));
  });

  it('rejects sanitized bulkWrite filters that cannot cast, like queries do', async function() {
    mongoose.set('sanitizeFilter', true);
    const Test = createModel(String);
    stubCollection(Test);

    await assert.rejects(
      () => Test.bulkWrite([{
        updateOne: { filter: INJECTED(), update: { $set: { username: 'x' } } }
      }]),
      err => err.name === 'CastError'
    );
  });

  it('throws for top-level operators that sanitizeFilter refuses in $match', function() {
    mongoose.set('sanitizeFilter', true);
    const Test = createModel();

    assert.throws(
      () => Test.aggregate([{ $match: { $expr: { $eq: ['$username', 'val'] } } }]),
      /\$expr is not allowed with sanitizeFilter/
    );
  });

  it('respects mongoose.trusted() selectors in $match', async function() {
    mongoose.set('sanitizeFilter', true);
    const Test = createModel();
    const stub = stubCollection(Test);

    const trusted = mongoose.trusted({ $ne: null });
    await Test.aggregate([{ $match: { password: trusted } }]).exec();

    assert.deepEqual(stub.getPipeline()[0].$match, { password: { $ne: null } });
  });
});
