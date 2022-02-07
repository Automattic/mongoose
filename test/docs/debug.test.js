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
  dob: Date
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

});
