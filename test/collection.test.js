'use strict';

const start = require('./common');

const Collection = require('../lib/collection');
const assert = require('assert');

const mongoose = start.mongoose;

describe('collections:', function() {
  const connectionsToClose = [];

  after(async function() {
    await Promise.all(connectionsToClose.map((v) => v.close()));
  });

  it('should buffer commands until connection is established', async function() {
    const db = mongoose.createConnection();
    connectionsToClose.push(db);
    const collection = db.collection('test-buffering-collection');

    const op = collection.insertOne({ foo: 'bar' }, {});

    const uri = start.uri;
    await db.openUri(process.env.MONGOOSE_TEST_URI || uri);

    const res = await op;
    assert.ok(res.insertedId);
    const doc = await collection.findOne({ _id: res.insertedId });
    assert.strictEqual(doc.foo, 'bar');
    await db.close();
  });

  it('returns a promise if buffering and no callback (gh-7676)', async function() {
    const db = mongoose.createConnection();
    connectionsToClose.push(db);
    const collection = db.collection('gh7676');

    const promise = collection.insertOne({ foo: 'bar' }, {})
      .then(result =>
        collection.findOne({ _id: result.insertedId })
      ).then(doc => {
        assert.strictEqual(doc.foo, 'bar');
      });

    await db.openUri(start.uri);

    await promise;
  });

  it('methods should that throw (unimplemented)', function() {
    const collection = new Collection('test', mongoose.connection);
    let thrown = false;

    try {
      collection.getIndexes();
    } catch (e) {
      assert.ok(/unimplemented/.test(e.message));
      thrown = true;
    }

    assert.ok(thrown);
    thrown = false;

    try {
      collection.update();
    } catch (e) {
      assert.ok(/unimplemented/.test(e.message));
      thrown = true;
    }

    assert.ok(thrown);
    thrown = false;

    try {
      collection.save();
    } catch (e) {
      assert.ok(/unimplemented/.test(e.message));
      thrown = true;
    }

    assert.ok(thrown);
    thrown = false;

    try {
      collection.insertOne();
    } catch (e) {
      assert.ok(/unimplemented/.test(e.message), e.message);
      thrown = true;
    }

    assert.ok(thrown);
    thrown = false;

    try {
      collection.find();
    } catch (e) {
      assert.ok(/unimplemented/.test(e.message));
      thrown = true;
    }

    assert.ok(thrown);
    thrown = false;

    try {
      collection.findOne();
    } catch (e) {
      assert.ok(/unimplemented/.test(e.message));
      thrown = true;
    }

    assert.ok(thrown);
    thrown = false;

    try {
      collection.findAndModify();
    } catch (e) {
      assert.ok(/unimplemented/.test(e.message));
      thrown = true;
    }

    assert.ok(thrown);
    thrown = false;

    try {
      collection.ensureIndex();
    } catch (e) {
      assert.ok(/unimplemented/.test(e.message));
      thrown = true;
    }

    assert.ok(thrown);
    thrown = false;
  });

  it('buffers for sync methods (gh-10610)', async function() {
    const db = mongoose.createConnection();
    connectionsToClose.push(db);
    const collection = db.collection('gh10610');

    const promise = collection.find({}, {});

    const uri = start.uri;
    await db.openUri(process.env.MONGOOSE_TEST_URI || uri);

    const res = await promise;
    assert.equal(typeof res.toArray, 'function');
  });
});
