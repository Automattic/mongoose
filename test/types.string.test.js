'use strict';

/**
 * Module dependencies.
 */

const mongoose = require('./common').mongoose;

const assert = require('assert');

/**
 * Test.
 */

describe('types.string', function() {
  describe('Schema.Types.String.setDefaultOptions(...)', function() {
    it('when given an option, sets it', () => {
      // Arrange
      const mongooseInstance = new mongoose.Mongoose();

      // Act
      mongooseInstance.Schema.Types.String.setDefaultOption('trim',true);
      const userSchema = new mongooseInstance.Schema({name:{type:String}});

      // Assert
      assert.equal(userSchema.path('name').options.trim, true);
    });
  });
});
