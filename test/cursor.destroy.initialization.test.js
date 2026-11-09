'use strict';

const assert = require('assert');
const { once } = require('events');
const { Writable } = require('stream');
const { pipeline } = require('stream/promises');
const sinon = require('sinon');
const start = require('./common');
const mongoose = start.mongoose;

describe('cursor destruction without a driver cursor', function() {
  let db;

  before(async function() {
    db = start();
    await db.asPromise();
  });
  after(async function() {
    await db.close();
  });
  beforeEach(function() {
    db.deleteModel(/.*/);
  });
  afterEach(() => require('./util').clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  it('closes a connection-level aggregation cursor after its readiness event', async function() {
    const cursor = db.aggregate([{ $listCollections: {} }]).cursor();
    await once(cursor, 'cursor');
    cursor.destroy();
    await new Promise(resolve => setImmediate(resolve));
    assert.strictEqual(cursor.closed, true);
    assert.strictEqual(cursor.cursor.closed, true);
  });

  it('finishes query destruction when driver cursor creation throws', async function() {
    const creationError = new Error('cursor creation failed');
    const Test = db.model('Test', new mongoose.Schema({ name: String }));
    const cursor = Test.find().cursor();
    const createStub = sinon.stub(Test.collection, 'find').throws(creationError);
    const errors = [];
    cursor.on('error', error => errors.push(error));
    const closed = new Promise(resolve => cursor.once('close', resolve));
    try {
      cursor.destroy();
      await closed;
      assert.strictEqual(cursor.cursor, null);
      assert.strictEqual(cursor.closed, true);
      assert.deepStrictEqual(errors, [creationError]);
      assert.strictEqual(cursor.listenerCount('cursor'), 0);
      assert.strictEqual(cursor.listenerCount('error'), 1);
    } finally {
      createStub.restore();
    }
  });

  it('does not repeat a query hook error passed to destroy by an error listener', async function() {
    const hookError = new Error('pre hook failed');
    const schema = new mongoose.Schema({ name: String });
    schema.pre('find', async function() { throw hookError; });
    const cursor = db.model('Test', schema).find().cursor();
    const errors = [];
    cursor.on('error', error => {
      errors.push(error);
      cursor.destroy(error);
    });
    await new Promise(resolve => cursor.once('close', resolve));
    assert.strictEqual(cursor.closed, true);
    assert.deepStrictEqual(errors, [hookError]);
    assert.strictEqual(cursor.listenerCount('cursor'), 0);
    assert.strictEqual(cursor.listenerCount('error'), 1);
  });

  it('keeps waiting when a casting error is emitted before initialization completes', async function() {
    let finishHook;
    const hook = new Promise(resolve => { finishHook = resolve; });
    const schema = new mongoose.Schema({ name: String });
    schema.pre('find', () => hook);
    const cursor = db.model('Test', schema).find({ _id: 'not-an-object-id' }).cursor();
    const ready = new Promise(resolve => cursor.once('cursor', resolve));
    const closed = new Promise(resolve => cursor.once('close', resolve));
    const failed = once(cursor, 'error');
    try {
      cursor.read(0);
      cursor.destroy();
      await failed;
      await new Promise(resolve => setImmediate(resolve));
      assert.strictEqual(cursor.closed, false);
      finishHook();
      await ready;
      await closed;
      assert.strictEqual(cursor.cursor.closed, true);
      assert.strictEqual(cursor.listenerCount('error'), 0);
    } finally {
      finishHook();
      await ready;
      await cursor.cursor.close();
    }
  });

  it('waits for pending initialization despite an earlier query casting error', async function() {
    let finishHook;
    const hook = new Promise(resolve => { finishHook = resolve; });
    const schema = new mongoose.Schema({ name: String });
    schema.pre('find', () => hook);
    const cursor = db.model('Test', schema).find({ _id: 'not-an-object-id' }).cursor();
    assert.ok(cursor._error instanceof mongoose.Error.CastError);
    const ready = once(cursor, 'cursor');
    const closed = new Promise(resolve => cursor.once('close', resolve));
    try {
      cursor.destroy();
      await new Promise(resolve => setImmediate(resolve));
      assert.strictEqual(cursor.closed, false);
      finishHook();
      await ready;
      await closed;
      assert.strictEqual(cursor.cursor.closed, true);
    } finally {
      finishHook();
      await ready;
      await cursor.cursor.close();
    }
  });

  it('finishes query destruction when destroyed before a pre hook error', async function() {
    const hookError = new Error('pre hook failed');
    let finishHook;
    const hook = new Promise(resolve => { finishHook = resolve; });
    const schema = new mongoose.Schema({ name: String });
    schema.pre('find', async function() {
      await hook;
      throw hookError;
    });
    const cursor = db.model('Test', schema).find().cursor();
    const errors = [];
    cursor.on('error', error => errors.push(error));
    let closeCount = 0;
    cursor.on('close', () => ++closeCount);
    const failed = once(cursor, 'error');

    cursor.destroy();
    finishHook();
    await failed;
    await new Promise(resolve => setImmediate(resolve));

    assert.strictEqual(cursor.cursor, null);
    assert.strictEqual(cursor.closed, true);
    assert.strictEqual(cursor._closed, true);
    assert.strictEqual(closeCount, 1);
    assert.deepStrictEqual(errors, [hookError]);
    assert.strictEqual(cursor.listenerCount('cursor'), 0);
    assert.strictEqual(cursor.listenerCount('error'), 1);
  });

  it('finishes query destruction when destroyed after a pre hook error', async function() {
    const hookError = new Error('pre hook failed');
    const schema = new mongoose.Schema({ name: String });
    schema.pre('find', async function() { throw hookError; });
    const cursor = db.model('Test', schema).find().cursor();
    const errors = [];
    cursor.on('error', error => errors.push(error));
    let closeCount = 0;
    cursor.on('close', () => ++closeCount);

    await once(cursor, 'error');
    cursor.destroy();
    await new Promise(resolve => setImmediate(resolve));

    assert.strictEqual(cursor.cursor, null);
    assert.strictEqual(cursor.closed, true);
    assert.strictEqual(cursor._closed, true);
    assert.strictEqual(closeCount, 1);
    assert.deepStrictEqual(errors, [hookError]);
    assert.strictEqual(cursor.listenerCount('cursor'), 0);
    assert.strictEqual(cursor.listenerCount('error'), 1);
  });

  it('finishes query destruction when destroyed before a pre hook skips the query', async function() {
    let finishHook;
    const hook = new Promise(resolve => { finishHook = resolve; });
    const schema = new mongoose.Schema({ name: String });
    schema.pre('find', async function() {
      await hook;
      throw mongoose.skipMiddlewareFunction();
    });
    const cursor = db.model('Test', schema).find().cursor();
    const errors = [];
    cursor.on('error', error => errors.push(error));
    let closeCount = 0;
    cursor.on('close', () => ++closeCount);
    const ready = once(cursor, 'cursor');

    cursor.destroy();
    finishHook();
    await ready;
    await new Promise(resolve => setImmediate(resolve));

    assert.strictEqual(cursor.cursor, null);
    assert.strictEqual(cursor.closed, true);
    assert.strictEqual(cursor._closed, true);
    assert.strictEqual(closeCount, 1);
    assert.deepStrictEqual(errors, []);
    assert.strictEqual(cursor.listenerCount('cursor'), 0);
    assert.strictEqual(cursor.listenerCount('error'), 1);
  });

  it('finishes query destruction when destroyed after a pre hook skips the query', async function() {
    const schema = new mongoose.Schema({ name: String });
    schema.pre('find', async function() { throw mongoose.skipMiddlewareFunction(); });
    const cursor = db.model('Test', schema).find().cursor();
    const errors = [];
    cursor.on('error', error => errors.push(error));
    let closeCount = 0;
    cursor.on('close', () => ++closeCount);

    await once(cursor, 'cursor');
    cursor.destroy();
    await new Promise(resolve => setImmediate(resolve));

    assert.strictEqual(cursor.cursor, null);
    assert.strictEqual(cursor.closed, true);
    assert.strictEqual(cursor._closed, true);
    assert.strictEqual(closeCount, 1);
    assert.deepStrictEqual(errors, []);
    assert.strictEqual(cursor.listenerCount('cursor'), 0);
    assert.strictEqual(cursor.listenerCount('error'), 1);
  });

  it('finishes destroying a query cursor after a pipeline pre-hook error', async function() {
    const hookError = new Error('pre hook failed');
    const schema = new mongoose.Schema({ name: String });
    schema.pre('find', async function() { throw hookError; });
    const cursor = db.model('Test', schema).find().cursor();
    const destination = new Writable({
      objectMode: true,
      write(document, encoding, callback) { callback(); }
    });

    await assert.rejects(pipeline(cursor, destination), error => error === hookError);
    await new Promise(resolve => setImmediate(resolve));
    assert.strictEqual(cursor.cursor, null);
    assert.strictEqual(cursor.closed, true);
    assert.strictEqual(cursor._closed, true);
  });

  it('finishes aggregate destruction when driver cursor creation throws', async function() {
    const creationError = new Error('cursor creation failed');
    const Test = db.model('Test', new mongoose.Schema({ name: String }));
    const cursor = Test.aggregate([{ $match: {} }]).cursor();
    const createStub = sinon.stub(Test.collection, 'aggregate').throws(creationError);
    const errors = [];
    cursor.on('error', error => errors.push(error));
    const closed = new Promise(resolve => cursor.once('close', resolve));
    try {
      cursor.destroy();
      await closed;
      assert.strictEqual(cursor.cursor, null);
      assert.strictEqual(cursor.closed, true);
      assert.deepStrictEqual(errors, [creationError]);
      assert.strictEqual(cursor.listenerCount('cursor'), 0);
      assert.strictEqual(cursor.listenerCount('error'), 1);
    } finally {
      createStub.restore();
    }
  });

  it('does not repeat an aggregate hook error passed to destroy by an error listener', async function() {
    const hookError = new Error('pre hook failed');
    const schema = new mongoose.Schema({ name: String });
    schema.pre('aggregate', async function() { throw hookError; });
    const cursor = db.model('Test', schema).aggregate([{ $match: {} }]).cursor();
    const errors = [];
    cursor.on('error', error => {
      errors.push(error);
      cursor.destroy(error);
    });
    await new Promise(resolve => cursor.once('close', resolve));
    assert.strictEqual(cursor.closed, true);
    assert.deepStrictEqual(errors, [hookError]);
    assert.strictEqual(cursor.listenerCount('cursor'), 0);
    assert.strictEqual(cursor.listenerCount('error'), 1);
  });

  it('finishes aggregate destruction when destroyed before a pre hook error', async function() {
    const hookError = new Error('pre hook failed');
    let finishHook;
    const hook = new Promise(resolve => { finishHook = resolve; });
    const schema = new mongoose.Schema({ name: String });
    schema.pre('aggregate', async function() {
      await hook;
      throw hookError;
    });
    const cursor = db.model('Test', schema).aggregate([{ $match: {} }]).cursor();
    const errors = [];
    cursor.on('error', error => errors.push(error));
    let closeCount = 0;
    cursor.on('close', () => ++closeCount);
    const failed = once(cursor, 'error');

    cursor.destroy();
    finishHook();
    await failed;
    await new Promise(resolve => setImmediate(resolve));

    assert.strictEqual(cursor.cursor, null);
    assert.strictEqual(cursor.closed, true);
    assert.strictEqual(cursor._closed, true);
    assert.strictEqual(closeCount, 1);
    assert.deepStrictEqual(errors, [hookError]);
    assert.strictEqual(cursor.listenerCount('cursor'), 0);
    assert.strictEqual(cursor.listenerCount('error'), 1);
  });

  it('finishes aggregate destruction when destroyed after a pre hook error', async function() {
    const hookError = new Error('pre hook failed');
    const schema = new mongoose.Schema({ name: String });
    schema.pre('aggregate', async function() { throw hookError; });
    const cursor = db.model('Test', schema).aggregate([{ $match: {} }]).cursor();
    const errors = [];
    cursor.on('error', error => errors.push(error));
    let closeCount = 0;
    cursor.on('close', () => ++closeCount);

    await once(cursor, 'error');
    cursor.destroy();
    await new Promise(resolve => setImmediate(resolve));

    assert.strictEqual(cursor.cursor, null);
    assert.strictEqual(cursor.closed, true);
    assert.strictEqual(cursor._closed, true);
    assert.strictEqual(closeCount, 1);
    assert.deepStrictEqual(errors, [hookError]);
    assert.strictEqual(cursor.listenerCount('cursor'), 0);
    assert.strictEqual(cursor.listenerCount('error'), 1);
  });

  it('finishes aggregate destruction when destroyed before a pre hook skips the aggregation', async function() {
    let finishHook;
    const hook = new Promise(resolve => { finishHook = resolve; });
    const schema = new mongoose.Schema({ name: String });
    schema.pre('aggregate', async function() {
      await hook;
      throw mongoose.skipMiddlewareFunction();
    });
    const cursor = db.model('Test', schema).aggregate([{ $match: {} }]).cursor();
    const errors = [];
    cursor.on('error', error => errors.push(error));
    let closeCount = 0;
    cursor.on('close', () => ++closeCount);
    const ready = once(cursor, 'cursor');

    cursor.destroy();
    finishHook();
    await ready;
    await new Promise(resolve => setImmediate(resolve));

    assert.strictEqual(cursor.cursor, null);
    assert.strictEqual(cursor.closed, true);
    assert.strictEqual(cursor._closed, true);
    assert.strictEqual(closeCount, 1);
    assert.deepStrictEqual(errors, []);
    assert.strictEqual(cursor.listenerCount('cursor'), 0);
    assert.strictEqual(cursor.listenerCount('error'), 1);
  });

  it('finishes aggregate destruction when destroyed after a pre hook skips the aggregation', async function() {
    const schema = new mongoose.Schema({ name: String });
    schema.pre('aggregate', async function() { throw mongoose.skipMiddlewareFunction(); });
    const cursor = db.model('Test', schema).aggregate([{ $match: {} }]).cursor();
    const errors = [];
    cursor.on('error', error => errors.push(error));
    let closeCount = 0;
    cursor.on('close', () => ++closeCount);

    await once(cursor, 'cursor');
    cursor.destroy();
    await new Promise(resolve => setImmediate(resolve));

    assert.strictEqual(cursor.cursor, null);
    assert.strictEqual(cursor.closed, true);
    assert.strictEqual(cursor._closed, true);
    assert.strictEqual(closeCount, 1);
    assert.deepStrictEqual(errors, []);
    assert.strictEqual(cursor.listenerCount('cursor'), 0);
    assert.strictEqual(cursor.listenerCount('error'), 1);
  });

  it('finishes destroying an aggregate cursor after a pipeline pre-hook error', async function() {
    const hookError = new Error('pre hook failed');
    const schema = new mongoose.Schema({ name: String });
    schema.pre('aggregate', async function() { throw hookError; });
    const cursor = db.model('Test', schema).aggregate([{ $match: {} }]).cursor();
    const destination = new Writable({
      objectMode: true,
      write(document, encoding, callback) { callback(); }
    });

    await assert.rejects(pipeline(cursor, destination), error => error === hookError);
    await new Promise(resolve => setImmediate(resolve));
    assert.strictEqual(cursor.cursor, null);
    assert.strictEqual(cursor.closed, true);
    assert.strictEqual(cursor._closed, true);
  });
});
