'use strict';

const Schema = require('../../lib/schema');
const assert = require('assert');
const getVirtual = require('../../lib/services/populate/getVirtual');

describe('getVirtual', function() {
  it('handles embedded discriminators (gh-6411)', function(done) {
    // Generate Embedded Discriminators
    const eventSchema = new Schema(
      { message: String },
      { discriminatorKey: 'kind'}
    );

    const batchSchema = new Schema({
      nested: {
        events: [eventSchema]
      }
    });

    const docArray = batchSchema.path('nested.events');

    // First embedded discriminator has a virtual
    const clickedSchema = new Schema({
      element: { type: String },
      users: [ Number ]
    });

    clickedSchema.virtual('users_$', {
      ref: 'Users',
      localField: 'users',
      foreignField: 'employeeId'
    });

    docArray.discriminator('Clicked', clickedSchema);

    // Second embedded discriminator does not have a virtual
    docArray.discriminator('Purchased', new Schema({
      product: { type: String }
    }));

    assert.equal(getVirtual(batchSchema, 'nested.events.users_$').options.ref,
      'Users');

    done();
  });
});
