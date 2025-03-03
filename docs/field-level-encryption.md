# Integrating with MongoDB Client Side Field Level Encryption

[Client Side Field Level Encryption](https://www.mongodb.com/docs/manual/core/csfle/), or CSFLE for short, is a tool for storing your data in an encrypted format in MongoDB.
For example, instead of storing the `name` property as a plain-text string, CSFLE means MongoDB will store your document with `name` as an encrypted buffer.
The resulting document will look similar to the following to a client that doesn't have access to decrypt the data.

<!--Using "js" as language, because "bson" does not exist and "js" has the better highlighting than "json"-->

```js
{
  "_id" : ObjectId("647a3207661e3a3a1bc3e614"),
  "name" : BinData(6,"ASrIv7XfokKwiCUJEjckOdgCG+u6IqavcOWX8hINz29MLvcKDZ4nnjCnPFZG+0ftVxMdWgzu6Vdh7ys1uIK1WiaPN0SqpmmtL2rPoqT9gfhADpGDmI60+vm0bJepXNY1Gv0="),
  "__v" : 0
}
```

You can read more about CSFLE on the [MongoDB CSFLE documentation](https://www.mongodb.com/docs/manual/core/csfle/) and [this blog post about CSFLE in Node.js](https://www.mongodb.com/developer/languages/javascript/client-side-field-level-encryption-csfle-mongodb-node/).

Note that Mongoose does **not** currently have any Mongoose-specific APIs for CSFLE.
Mongoose defers all CSFLE-related work to the MongoDB Node.js driver, so the [`autoEncryption` option](https://mongodb.github.io/node-mongodb-native/5.6/interfaces/AutoEncryptionOptions.html) for `mongoose.connect()` and `mongoose.createConnection()` is where you put all CSFLE-related configuration.
Mongoose schemas currently don't support CSFLE configuration.

## Setting Up Field Level Encryption with Mongoose

First, you need to install the [mongodb-client-encryption npm package](https://www.npmjs.com/package/mongodb-client-encryption).
This is MongoDB's official package for setting up encryption keys.

```sh
npm install mongodb-client-encryption
```

You also need to make sure you've installed [mongocryptd](https://www.mongodb.com/docs/manual/core/queryable-encryption/reference/mongocryptd/).
mongocryptd is a separate process from the MongoDB server that you need to run to work with field level encryption.
You can either run mongocryptd yourself, or make sure it is on the system PATH and the MongoDB Node.js driver will run it for you.
[You can read more about mongocryptd here](https://www.mongodb.com/docs/v5.0/reference/security-client-side-encryption-appendix/#mongocryptd).

Once you've set up and run mongocryptd, first you need to create a new encryption key as follows.
Keep in mind that the following example is a simple example to help you get started.
The encryption key in the following example is insecure; MongoDB recommends using a [KMS](https://www.mongodb.com/docs/v5.0/core/security-client-side-encryption-key-management/).

```javascript
const { ClientEncryption } = require('mongodb');
const mongoose = require('mongoose');

run().catch(err => console.log(err));

async function run() {
  /* Step 1: Connect to MongoDB and insert a key */

  // Create a very basic key. You're responsible for making
  // your key secure, don't use this in prod :)
  const arr = [];
  for (let i = 0; i < 96; ++i) {
    arr.push(i);
  }
  const key = Buffer.from(arr);

  const keyVaultNamespace = 'client.encryption';
  const kmsProviders = { local: { key } };

  const uri = 'mongodb://127.0.0.1:27017/mongoose_test';
  const conn = await mongoose.createConnection(uri, {
    autoEncryption: {
      keyVaultNamespace,
      kmsProviders
    }
  }).asPromise();
  const encryption = new ClientEncryption(conn.getClient(), {
    keyVaultNamespace,
    kmsProviders,
  });

  const _key = await encryption.createDataKey('local', {
    keyAltNames: ['exampleKeyName'],
  });
}
```

Once you have an encryption key, you can create a separate Mongoose connection with a [`schemaMap`](https://mongodb.github.io/node-mongodb-native/5.6/interfaces/AutoEncryptionOptions.html#schemaMap) that defines which fields are encrypted using JSON schema syntax as follows.

```javascript
/* Step 2: connect using schema map and new key */
await mongoose.connect('mongodb://127.0.0.1:27017/mongoose_test', {
  // Configure auto encryption
  autoEncryption: {
    keyVaultNamespace,
    kmsProviders,
    schemaMap: {
      'mongoose_test.tests': {
        bsonType: 'object',
        encryptMetadata: {
          keyId: [_key]
        },
        properties: {
          name: {
            encrypt: {
              bsonType: 'string',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic'
            }
          }
        }
      }
    }
  }
});
```

With the above connection, if you create a model named 'Test' that uses the 'tests' collection, any documents will have their `name` property encrypted.

```javascript
// 'super secret' will be stored as 'BinData' in the database,
// if you query using the `mongo` shell.
const Model = mongoose.model('Test', mongoose.Schema({ name: String }));
await Model.create({ name: 'super secret' });
```
