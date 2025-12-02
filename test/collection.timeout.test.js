'use strict';

const assert = require('assert');
const mongoose = require('../index');

describe('Collection timeout cleanup', function() {
  let db;

  before(async function() {
    db = await mongoose.createConnection('mongodb://127.0.0.1:27017/mongoose_test').asPromise();
  });

  after(async function() {
    await db.close();
  });

  it('should clear timeout on successful operations', async function() {
    const TestModel = db.model('Test', { name: String });
    
    // Track active handles before operations
    const initialHandles = process._getActiveHandles().length;
    
    // Execute multiple operations that should complete successfully
    for (let i = 0; i < 10; i++) {
      await TestModel.find({}).exec();
    }
    
    // Allow some time for any lingering timeouts
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Active handles should not have grown significantly
    const finalHandles = process._getActiveHandles().length;
    assert.ok(finalHandles <= initialHandles + 2, 
      `Expected handles to remain stable, but grew from ${initialHandles} to ${finalHandles}`);
  });

  it('should clear timeout on operation errors', async function() {
    const TestModel = db.model('Test2', { name: String });
    
    const initialHandles = process._getActiveHandles().length;
    
    // Execute operations that will fail
    for (let i = 0; i < 5; i++) {
      try {
        await TestModel.collection.findOne({ $invalidOperator: true });
      } catch (err) {
        // Expected to fail
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const finalHandles = process._getActiveHandles().length;
    assert.ok(finalHandles <= initialHandles + 2,
      `Expected handles to remain stable after errors, but grew from ${initialHandles} to ${finalHandles}`);
  });
});