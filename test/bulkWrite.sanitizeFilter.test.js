'use strict';

const assert = require('assert');
const mongoose = require('../');
const Schema = mongoose.Schema;

const INJECTED = () => ({ password: { $ne: null } });

function isSanitised(filter) {
  return filter?.password?.$eq != null;
}

function stubCollection(Model) {
  let ops = [];
  Object.defineProperty(Model, '$__collection', {
    configurable: true,
    value: {
      bulkWrite: async function(o) {
        ops = JSON.parse(JSON.stringify(o));
        return { ok: 1 };
      }
    }
  });

  return { getOps: () => ops };
}

describe('sanitizeFilter on bulkWrite() (gh-16684)', function() {
  let modelCount = 0;

  beforeEach(function() {
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

  function createModel(type) {
    const s = new Schema({
      username: type ?? String,
      password: type ?? Object
    });
    return mongoose.model(`gh16684_${++modelCount}`, s);
  }

  it('sanitizes every bulkWrite() op that takes a filter when global sanitizeFilter is true', async function() {
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
});
