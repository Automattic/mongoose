'use strict';

/**
 * Test dependencies.
 */

const assert = require('assert');
const start = require('../common');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

/**
 * Setup.
 */

const testSchema = new Schema({
  dob: Date,
  title: {
    type: String,
    required: false
  }
}, {
  timestamps: {
    createdAt: 'created_at'
  }
});


/**
 * Test.
 */

describe('debug: shell', function() {
  let db;
  let testModel;

  let lastLog;
  const originalConsole = console.info;
  const originalDebugOption = mongoose.options.debug;

  const connectionsToClose = [];

  before(function() {
    db = start();
    testModel = db.model('Test', testSchema);

    // monkey patch to read debug output
    console.info = function() {
      lastLog = arguments[0];
      if (originalDebugOption) {
        originalConsole.apply(console, arguments);
      }
    };
  });

  after(async function() {
    // revert monkey patch
    console.info = originalConsole;
    mongoose.set('debug', originalDebugOption);
    await db.close();
    await Promise.all(connectionsToClose.map((v) => v.close()));
  });

  it('no-shell', async function() {
    mongoose.set('debug', { shell: false });
    await testModel.create({ dob: new Date() });
    assert.equal(true, lastLog.includes('new Date'));
  });

  it('shell', async function() {
    mongoose.set('debug', { shell: true });
    await testModel.create({ dob: new Date() });
    assert.equal(true, lastLog.includes('ISODate'));
  });

  it('should allow to set the `debug` option on a per-connection basis (gh-12700)', async function() {
    const m = new mongoose.Mongoose();
    // `conn1` with active debug
    const conn1 = m.createConnection(start.uri);
    connectionsToClose.push(conn1);
    conn1.set('debug', true);
    const testModel1 = conn1.model('Test', testSchema);
    await testModel1.create({ dob: new Date(), title: 'Connection 1' });
    const storedLog = lastLog;
    // `conn2` without debug
    const conn2 = m.createConnection(start.uri);
    connectionsToClose.push(conn2);
    const testModel2 = conn2.model('Test', testSchema);
    await testModel2.create({ dob: new Date(), title: 'Connection 2' });
    // Last log should not have been overwritten
    assert.equal(storedLog, lastLog);
  });

  it('should avoid sending null session option with document ops (gh-13052)', async function() {
    const args = [];
    const m = new mongoose.Mongoose();
    m.set('debug', function() {
      args.push([...arguments]);
    });
    await m.connect(start.uri);
    const schema = new Schema({ name: String });
    const Test = m.model('gh_13052', schema);

    await Test.create({ name: 'foo' });
    assert.equal(args.length, 1);
    assert.equal(args[0][1], 'insertOne');
    assert.strictEqual(args[0][4], undefined);

    await m.disconnect();
  });
});
