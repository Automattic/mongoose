'use strict';

const start = require('./common');

const Collection = require('../lib/collection');
const assert = require('assert');

const mongoose = start.mongoose;

describe('collections:', function() {
  let db = null;

  afterEach(async function() {
    if (db == null) {
      return;
    }
    await db.close();
    db = null;
  });

  it('should buffer commands until connection is established', function(done) {
    db = mongoose.createConnection();
    const collection = db.collection('test-buffering-collection');
    let connected = false;
    let insertedId = undefined;
    let pending = 2;

    function finish() {
      if (--pending) {
        return;
      }
      assert.ok(connected);
      assert.ok(insertedId !== undefined);
      collection.findOne({ _id: insertedId }).then(doc => {
        assert.strictEqual(doc.foo, 'bar');
        db.close();
        done();
      });
    }

    collection.insertOne({ foo: 'bar' }, {}, function(err, result) {
      assert.ok(connected);
      insertedId = result.insertedId;
      finish();
    });

    const uri = start.uri;
    db.openUri(process.env.MONGOOSE_TEST_URI || uri, function(err) {
      connected = !err;
      finish();
    });
  });

  it('returns a promise if buffering and no callback (gh-7676)', function(done) {
    db = mongoose.createConnection();
    const collection = db.collection('gh7676');

    const promise = collection.insertOne({ foo: 'bar' }, {})
      .then(result =>
        collection.findOne({ _id: result.insertedId })
      ).then(doc => {
        assert.strictEqual(doc.foo, 'bar');
      });

    db.openUri(start.uri, function(err) {
      assert.ifError(err);
      promise.then(() => done(), done);
    });
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

  it('buffers for sync methods (gh-10610)', function(done) {
    db = mongoose.createConnection();
    const collection = db.collection('gh10610');

    collection.find({}, {}, function(err, res) {
      assert.ifError(err);
      assert.equal(typeof res.toArray, 'function');
      done();
    });

    const uri = start.uri;
    db.openUri(process.env.MONGOOSE_TEST_URI || uri);
  });
});
