'use strict';

/**
 * Test dependencies.
 */

const assert = require('assert');
const start = require('./common');

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

  before(function(done) {
    db = start();
    testModel = db.model('Test', testSchema);

    // monkey patch to read debug output
    console.info = function() {
      lastLog = arguments[0];
      if (originalDebugOption) {
        originalConsole.apply(console, arguments);
      }
    };

    done();
  });

  after(function(done) {
    // revert monkey patch
    console.info = originalConsole;
    mongoose.set('debug', originalDebugOption);
    db.close(done);
  });

  it('no-shell', function() {
    mongoose.set('debug', { shell: false });
    return testModel.create({ dob: new Date() }).
      then(() => assert.equal(true, lastLog.includes('new Date')));
  });

  it('shell', function() {
    mongoose.set('debug', { shell: true });
    testModel.create({ dob: new Date() }).
      then(() => assert.equal(true, lastLog.includes('ISODate')));
  });

});
