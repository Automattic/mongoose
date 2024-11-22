'use strict';

const assert = require('assert');
const mdb = require('mongodb');

describe('environmental variables', () => {
  it('MONGODB_TEST_URI is set', async function() {
    const uri = process.env.MONGOOSE_TEST_URI;
    assert.ok(uri);
  });

  it('CRYPT_SHARED_LIB_PATH is set', async function() {
    const shared_library_path = process.env.CRYPT_SHARED_LIB_PATH;
    assert.ok(shared_library_path);
  });
});

describe('basic integration', () => {
  it('supports mongodb csfle auto-encryption integration', async() => {
    // 1. Create a MongoClient configured with auto encryption (referred to as `client_encrypted`)
    const client = new mdb.MongoClient(
      process.env.MONGOOSE_TEST_URI,
      {
        autoEncryption: {
          keyVaultNamespace: 'keyvault.datakeys',
          kmsProviders: { local: { key: Buffer.from(
            'Mng0NCt4ZHVUYUJCa1kxNkVyNUR1QURhZ2h2UzR2d2RrZzh0cFBwM3R6NmdWMDFBMUN3YkQ5aXRRMkhGRGdQV09wOGVNYUMxT2k3NjZKelhaQmRCZGJkTXVyZG9uSjFk',
            'base64'
          )
          } },
          extraOptions: {
            cryptdSharedLibRequired: true,
            cryptSharedLibPath: process.env.CRYPT_SHARED_LIB_PATH
          }
        }
      }
    );
    await client.connect();
    const insertResult = await client
      .db('db')
      .collection('coll')
      .insertOne({ unencrypted: 'test' });
    assert.ok(insertResult.insertedId);
  });
});
