'use strict';

const assert = require('assert');
const mongodb = require('mongodb');
const fs = require('fs');
const isBsonType = require('../../lib/helpers/isBsonType');

const LOCAL_KEY = Buffer.from('Mng0NCt4ZHVUYUJCa1kxNkVyNUR1QURhZ2h2UzR2d2RrZzh0cFBwM3R6NmdWMDFBMUN3YkQ5aXRRMkhGRGdQV09wOGVNYUMxT2k3NjZKelhaQmRCZGJkTXVyZG9uSjFk', 'base64');

describe('ci', () => {

  const cachedUri = process.env.MONGOOSE_TEST_URI;
  const cachedLib = process.env.CRYPT_SHARED_LIB_PATH;

  before(function() {
    const cwd = process.cwd();
    const file = fs.readFileSync(cwd + '/data/mo-expansion.yml', { encoding: 'utf-8' }).trim().split('\n');
    const regex = /^(?<key>.*): "(?<value>.*)"$/;
    const variables = file.map((line) => regex.exec(line.trim()).groups).reduce((acc, { key, value }) => ({ ...acc, [key]: value }), {});
    console.log('File contents', file);
    console.log('Variables', variables);
    process.env.CRYPT_SHARED_LIB_PATH = variables.CRYPT_SHARED_LIB_PATH;
    process.env.MONGOOSE_TEST_URI = variables.MONGODB_URI;
  });

  after(function() {
    process.env.CRYPT_SHARED_LIB_PATH = cachedLib;
    process.env.MONGOOSE_TEST_URI = cachedUri;
  });

  describe('environmental variables', () => {
    it('MONGOOSE_TEST_URI is set', async function() {
      const uri = process.env.MONGOOSE_TEST_URI;
      console.log('MONGOOSE_TEST_URI=', uri);
      assert.ok(uri);
    });

    it('CRYPT_SHARED_LIB_PATH is set', async function() {
      const shared_library_path = process.env.CRYPT_SHARED_LIB_PATH;
      console.log('CRYPT_SHARED_LIB_PATH=', shared_library_path);
      assert.ok(shared_library_path);
    });
  });

  describe('basic integration', () => {
    let keyVaultClient;
    let dataKey;
    let encryptedClient;
    let unencryptedClient;

    beforeEach(async function() {
      keyVaultClient = new mongodb.MongoClient(process.env.MONGOOSE_TEST_URI);
      await keyVaultClient.connect();
      await keyVaultClient.db('keyvault').collection('datakeys');
      const clientEncryption = new mongodb.ClientEncryption(keyVaultClient, {
        keyVaultNamespace: 'keyvault.datakeys',
        kmsProviders: { local: { key: LOCAL_KEY } }
      });
      dataKey = await clientEncryption.createDataKey('local');

      encryptedClient = new mongodb.MongoClient(
        process.env.MONGOOSE_TEST_URI,
        {
          autoEncryption: {
            keyVaultNamespace: 'keyvault.datakeys',
            kmsProviders: { local: { key: LOCAL_KEY } },
            schemaMap: {
              'db.coll': {
                bsonType: 'object',
                encryptMetadata: {
                  keyId: [dataKey]
                },
                properties: {
                  a: {
                    encrypt: {
                      bsonType: 'int',
                      algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random',
                      keyId: [dataKey]
                    }
                  }
                }
              }
            },
            extraOptions: {
              cryptdSharedLibRequired: true,
              cryptSharedLibPath: process.env.CRYPT_SHARED_LIB_PATH
            }
          }
        }
      );

      unencryptedClient = new mongodb.MongoClient(process.env.MONGOOSE_TEST_URI);
    });

    afterEach(async function() {
      await keyVaultClient.close();
      await encryptedClient.close();
      await unencryptedClient.close();
    });

    it('ci set-up should support basic mongodb auto-encryption integration', async() => {
      await encryptedClient.connect();
      const { insertedId } = await encryptedClient.db('db').collection('coll').insertOne({ a: 1 });

      // client not configured with autoEncryption, returns a encrypted binary type, meaning that encryption succeeded
      const encryptedResult = await unencryptedClient.db('db').collection('coll').findOne({ _id: insertedId });

      assert.ok(encryptedResult);
      assert.ok(encryptedResult.a);
      assert.ok(isBsonType(encryptedResult.a, 'Binary'));
      assert.ok(encryptedResult.a.sub_type === 6);

      // when the encryptedClient runs a find, the original unencrypted value is returned
      const unencryptedResult = await encryptedClient.db('db').collection('coll').findOne({ _id: insertedId });
      assert.ok(unencryptedResult);
      assert.ok(unencryptedResult.a === 1);
    });
  });
});
