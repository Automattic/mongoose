'use strict';

const assert = require('assert');
const EJSON = require('bson').EJSON;

describe('setup check', () => {
  it('environment variables are set', async function() {
    const { local } = EJSON.parse(process.env.CSFLE_KMS_PROVIDERS || '{}');
    assert.ok(local);
  });
});
