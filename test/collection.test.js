'use strict';

const Collection = require('../lib/collection');
const assert = require('assert');
const start = require('./common');

const mongoose = start.mongoose;

describe('collections:', function() {
  it('should buffer commands until connection is established', function(done) {
    const db = mongoose.createConnection();
    const collection = db.collection('test-buffering-collection');
    let connected = false;
    let inserted = false;
    let pending = 2;

    function finish() {
      if (--pending) {
        return;
      }
      assert.ok(connected);
      assert.ok(inserted);
      done();
    }

    collection.insertOne({}, {}, function() {
      assert.ok(connected);
      inserted = true;
      db.close();
      finish();
    });

    const uri = 'mongodb://localhost:27017/mongoose_test';
    db.openUri(process.env.MONGOOSE_TEST_URI || uri, { useNewUrlParser: true }, function(err) {
      connected = !err;
      finish();
    });
  });

  it('methods should that throw (unimplemented)', function(done) {
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
    done();
  });
});
