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
    required: false,
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
    // `conn1` with active debug
    const conn1 = m.createConnection(start.uri);
    conn1.set('debug', true);
    const testModel1 = conn1.model('Test', testSchema);
    await testModel1.create({ dob: new Date(), title: 'Connection 1' });
    const storedLog = lastLog;
    // `conn2` without debug
    const conn2 = m.createConnection(start.uri);
    const testModel2 = conn2.model('Test', testSchema);
    await testModel2.create({ dob: new Date(), title: 'Connection 2' });
    // Last log should not have been overwritten
    assert.equal(storedLog, lastLog);
  });
});
