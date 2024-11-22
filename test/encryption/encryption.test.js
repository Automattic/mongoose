'use strict';

const assert = require('assert');
const EJSON = require('bson').EJSON;

describe('environmental variables', () => {
  it('MONGODB_URI is set', async function() {
    const uri = process.env.MONGODB_URI;
    assert.ok(uri);
  });

  it('CRYPT_SHARED_LIB_PATH is set', async function() {
    const shared_library_path = process.env.CRYPT_SHARED_LIB_PATH;
    assert.ok(shared_library_path);
  });
});
