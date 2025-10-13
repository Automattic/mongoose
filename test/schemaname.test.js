'use strict';

const assert = require('assert');
const start = require('./common');
const Schema = start.mongoose.Schema;

describe('schemaname', function() {
  it('exists on constructor', function() {
    const schema = new Schema({ name: String });
    const name = schema.path('name');
    assert.equal(name.constructor.schemaName, 'String');
  });
  it('exists on instance', function() {
    const schema = new Schema({ name: String });
    const name = schema.path('name');
    assert.equal(name.schemaName, 'String');
  });
});
