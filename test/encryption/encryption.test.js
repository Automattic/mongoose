'use strict';

const assert = require('assert');
const mdb = require('mongodb');
const isBsonType = require('../../lib/helpers/isBsonType');
const { Schema, createConnection } = require('../../lib');
const { ObjectId, Double, Int32, Decimal128 } = require('bson');
const fs = require('fs');
const mongoose = require('../../lib');
const { Map } = require('../../lib/types');

const LOCAL_KEY = Buffer.from('Mng0NCt4ZHVUYUJCa1kxNkVyNUR1QURhZ2h2UzR2d2RrZzh0cFBwM3R6NmdWMDFBMUN3YkQ5aXRRMkhGRGdQV09wOGVNYUMxT2k3NjZKelhaQmRCZGJkTXVyZG9uSjFk', 'base64');

/**
 * @param {object} object
 * @param {string} property
 */
function isEncryptedValue(object, property) {
  const value = object[property];
  assert.ok(isBsonType(value, 'Binary'), `auto encryption for property ${property} failed: not a BSON binary.`);
  assert.ok(value.sub_type === 6, `auto encryption for property ${property} failed: not subtype 6.`);
}

describe('encryption integration tests', () => {
  const cachedUri = process.env.MONGOOSE_TEST_URI;
  const cachedLib = process.env.CRYPT_SHARED_LIB_PATH;

  before(function() {
    const cwd = process.cwd();
    const file = fs.readFileSync(cwd + '/data/mo-expansion.yml', { encoding: 'utf-8' }).trim().split('\n');

    // matches `key="value"` and extracts key and value.
    const regex = /^(?<key>.*): "(?<value>.*)"$/;
    const variables = Object.fromEntries(file.map((line) => regex.exec(line.trim()).groups).map(({ key, value }) => [key, value]));

    process.env.CRYPT_SHARED_LIB_PATH ??= variables.CRYPT_SHARED_LIB_PATH;
    process.env.MONGOOSE_TEST_URI ??= variables.MONGODB_URI;
  });

  after(function() {
    process.env.CRYPT_SHARED_LIB_PATH = cachedLib;
    process.env.MONGOOSE_TEST_URI = cachedUri;
  });

  describe('meta: environmental variables are correctly set up', () => {
    it('MONGOOSE_TEST_URI is set', async function() {
      const uri = process.env.MONGOOSE_TEST_URI;
      assert.ok(uri);
    });

    it('MONGOOSE_TEST_URI points to running cluster', async function() {
      try {
        const connection = await mongoose.connect(process.env.MONGOOSE_TEST_URI);
        await connection.disconnect();
      } catch (error) {
        throw new Error('Unable to connect to running cluster', { cause: error });
      }
    });

    it('CRYPT_SHARED_LIB_PATH is set', async function() {
      const shared_library_path = process.env.CRYPT_SHARED_LIB_PATH;
      assert.ok(shared_library_path);
    });
  });

  const algorithm = 'AEAD_AES_256_CBC_HMAC_SHA_512-Random';


  let keyId, keyId2, keyId3;
  let utilClient;

  beforeEach(async function() {
    const keyVaultClient = new mdb.MongoClient(process.env.MONGOOSE_TEST_URI);
    await keyVaultClient.connect();
    await keyVaultClient.db('keyvault').collection('datakeys');
    const clientEncryption = new mdb.ClientEncryption(keyVaultClient, {
      keyVaultNamespace: 'keyvault.datakeys',
      kmsProviders: { local: { key: LOCAL_KEY } }
    });
    keyId = await clientEncryption.createDataKey('local');
    keyId2 = await clientEncryption.createDataKey('local');
    keyId3 = await clientEncryption.createDataKey('local');
    await keyVaultClient.close();

    utilClient = new mdb.MongoClient(process.env.MONGOOSE_TEST_URI);
  });

  afterEach(async function() {
    await utilClient.db('db').dropDatabase({
      w: 'majority'
    });
    await utilClient.close();
  });

  describe('Tests that fields of valid schema types can be declared as encrypted schemas', function() {
    let connection;
    let schema;
    let model;

    const basicSchemaTypes = [
      { type: String, name: 'string', input: 3, expected: 3 },
      { type: Schema.Types.Boolean, name: 'boolean', input: true, expected: true },
      { type: Schema.Types.Buffer, name: 'buffer', input: Buffer.from([1, 2, 3]) },
      { type: Date, name: 'date', input: new Date(12, 12, 2012), expected: new Date(12, 12, 2012) },
      { type: ObjectId, name: 'objectid', input: new ObjectId() },
      { type: BigInt, name: 'bigint', input: 3n },
      { type: Decimal128, name: 'Decimal128', input: new Decimal128('1.5') },
      { type: Int32, name: 'int32', input: new Int32(5), expected: 5 },
      { type: Double, name: 'double', input: new Double(1.5) }
    ];

    afterEach(async function() {
      await connection?.close();
    });

    for (const { type, name, input, expected } of basicSchemaTypes) {
      // eslint-disable-next-line no-inner-declarations
      async function test() {
        const [{ _id }] = await model.insertMany([{ field: input }]);
        const encryptedDoc = await utilClient.db('db').collection('schemas').findOne({ _id });

        assert.ok(isBsonType(encryptedDoc.field, 'Binary'));
        assert.ok(encryptedDoc.field.sub_type === 6);

        const doc = await model.findOne({ _id });
        if (Buffer.isBuffer(input)) {
          // mongoose's Buffer does not support deep equality - instead use the Buffer.equals method.
          assert.ok(doc.field.equals(input));
        } else {
          assert.deepEqual(doc.field, expected ?? input);
        }
      }

      describe('CSFLE', function() {
        beforeEach(async function() {
          schema = new Schema({
            field: {
              type, encrypt: { keyId: [keyId], algorithm }
            }
          }, {
            encryptionType: 'csfle'
          });

          connection = createConnection();
          model = connection.model('Schema', schema);
          await connection.openUri(process.env.MONGOOSE_TEST_URI, {
            dbName: 'db', autoEncryption: {
              keyVaultNamespace: 'keyvault.datakeys',
              kmsProviders: { local: { key: LOCAL_KEY } },
              extraOptions: {
                cryptdSharedLibRequired: true,
                cryptSharedLibPath: process.env.CRYPT_SHARED_LIB_PATH
              }
            }
          });
        });

        it(`${name} encrypts and decrypts`, test);
      });

      describe('queryableEncryption', function() {
        beforeEach(async function() {
          schema = new Schema({
            field: {
              type, encrypt: { keyId: keyId }
            }
          }, {
            encryptionType: 'queryableEncryption'
          });

          connection = createConnection();
          model = connection.model('Schema', schema);
          await connection.openUri(process.env.MONGOOSE_TEST_URI, {
            dbName: 'db', autoEncryption: {
              keyVaultNamespace: 'keyvault.datakeys',
              kmsProviders: { local: { key: LOCAL_KEY } },
              extraOptions: {
                cryptdSharedLibRequired: true,
                cryptSharedLibPath: process.env.CRYPT_SHARED_LIB_PATH
              }
            }
          });
        });

        it(`${name} encrypts and decrypts`, test);
      });
    }

    describe('mongoose Maps', function() {
      describe('CSFLE', function() {
        it('encrypts and decrypts', async function() {
          const schema = new Schema({
            a: {
              type: Schema.Types.Map,
              of: String,
              encrypt: { keyId: [keyId], algorithm }

            }
          }, {
            encryptionType: 'csfle'
          });

          connection = createConnection();
          const model = connection.model('Schema', schema);
          await connection.openUri(process.env.MONGOOSE_TEST_URI, {
            dbName: 'db', autoEncryption: {
              keyVaultNamespace: 'keyvault.datakeys',
              kmsProviders: { local: { key: LOCAL_KEY } },
              extraOptions: {
                cryptdSharedLibRequired: true,
                cryptSharedLibPath: process.env.CRYPT_SHARED_LIB_PATH
              }
            }
          });

          const [{ _id }] = await model.insertMany([{ a: {
            name: 'bailey'
          } }]);
          const encryptedDoc = await utilClient.db('db').collection('schemas').findOne({ _id });

          assert.ok(isBsonType(encryptedDoc.a, 'Binary'));
          assert.ok(encryptedDoc.a.sub_type === 6);

          const doc = await model.findOne({ _id });
          assert.ok(doc.a instanceof Map);
          const rawObject = Object.fromEntries(doc.a);
          assert.deepEqual(rawObject, { name: 'bailey' });
        });
      });

      describe('queryable encryption', function() {
        it('encrypts and decrypts', async function() {
          const schema = new Schema({
            a: {
              type: Schema.Types.Map,
              of: String,
              encrypt: { keyId: keyId }

            }
          }, {
            encryptionType: 'queryableEncryption'
          });

          connection = createConnection();
          const model = connection.model('Schema', schema);
          await connection.openUri(process.env.MONGOOSE_TEST_URI, {
            dbName: 'db', autoEncryption: {
              keyVaultNamespace: 'keyvault.datakeys',
              kmsProviders: { local: { key: LOCAL_KEY } },
              extraOptions: {
                cryptdSharedLibRequired: true,
                cryptSharedLibPath: process.env.CRYPT_SHARED_LIB_PATH
              }
            }
          });

          const [{ _id }] = await model.insertMany([{ a: {
            name: 'bailey'
          } }]);
          const encryptedDoc = await utilClient.db('db').collection('schemas').findOne({ _id });

          assert.ok(isBsonType(encryptedDoc.a, 'Binary'));
          assert.ok(encryptedDoc.a.sub_type === 6);

          const doc = await model.findOne({ _id });
          assert.ok(doc.a instanceof Map);
          const rawObject = Object.fromEntries(doc.a);
          assert.deepEqual(rawObject, { name: 'bailey' });
        });
      });
    });

    describe('nested object schemas', function() {
      const tests = {
        'nested object schemas for CSFLE': {
          modelFactory: () => {
            const schema = new Schema({
              a: {
                b: {
                  c: {
                    type: String,
                    encrypt: { keyId: [keyId], algorithm }
                  }
                }
              }
            }, {
              encryptionType: 'csfle'
            });

            connection = createConnection();
            model = connection.model('Schema', schema);
            return { model };

          }
        },
        'nested object schemas for QE': {
          modelFactory: () => {
            const schema = new Schema({
              a: {
                b: {
                  c: {
                    type: String,
                    encrypt: { keyId: keyId }
                  }
                }
              }
            }, {
              encryptionType: 'queryableEncryption'
            });

            connection = createConnection();
            model = connection.model('Schema', schema);
            return { model };

          }
        },
        'nested schemas for csfle': {
          modelFactory: () => {
            const nestedSchema = new Schema({
              b: {
                c: {
                  type: String,
                  encrypt: { keyId: [keyId], algorithm }
                }
              }
            }, {
              encryptionType: 'csfle'
            });

            const schema = new Schema({
              a: nestedSchema
            }, {
              encryptionType: 'csfle'
            });

            connection = createConnection();
            model = connection.model('Schema', schema);
            return { model };

          }
        },
        'nested schemas for QE': {
          modelFactory: () => {
            const nestedSchema = new Schema({
              b: {
                c: {
                  type: String,
                  encrypt: { keyId: keyId }
                }
              }
            }, {
              encryptionType: 'queryableEncryption'
            });
            const schema = new Schema({
              a: nestedSchema
            }, {
              encryptionType: 'queryableEncryption'
            });

            connection = createConnection();
            model = connection.model('Schema', schema);
            return { model };

          }
        }
      };

      for (const [description, { modelFactory }] of Object.entries(tests)) {
        describe(description, function() {
          it('encrypts and decrypts', async function() {
            const { model } = modelFactory();

            await connection.openUri(process.env.MONGOOSE_TEST_URI, {
              dbName: 'db', autoEncryption: {
                keyVaultNamespace: 'keyvault.datakeys',
                kmsProviders: { local: { key: LOCAL_KEY } },
                extraOptions: {
                  cryptdSharedLibRequired: true,
                  cryptSharedLibPath: process.env.CRYPT_SHARED_LIB_PATH
                }
              }
            });

            const [{ _id }] = await model.insertMany([{ a: { b: { c: 'hello' } } }]);
            const encryptedDoc = await utilClient.db('db').collection('schemas').findOne({ _id });

            assert.ok(isBsonType(encryptedDoc.a.b.c, 'Binary'));
            assert.ok(encryptedDoc.a.b.c.sub_type === 6);

            const doc = await model.findOne({ _id });
            assert.deepEqual(doc.a.b.c, 'hello');
          });
        });
      }
    });

    describe('array encrypted fields', function() {
      describe('primitive array fields for CSFLE', function() {
        it('encrypts and decrypts', async function() {
          const schema = new Schema({
            a: {
              type: [Int32],
              encrypt: {
                keyId: [keyId],
                algorithm
              }
            }
          }, {
            encryptionType: 'csfle'
          });

          connection = createConnection();
          const model = connection.model('Schema', schema);
          await connection.openUri(process.env.MONGOOSE_TEST_URI, {
            dbName: 'db', autoEncryption: {
              keyVaultNamespace: 'keyvault.datakeys',
              kmsProviders: { local: { key: LOCAL_KEY } },
              extraOptions: {
                cryptdSharedLibRequired: true,
                cryptSharedLibPath: process.env.CRYPT_SHARED_LIB_PATH
              }
            }
          });

          const [{ _id }] = await model.insertMany([{ a: [new Int32(3)] }]);
          const encryptedDoc = await utilClient.db('db').collection('schemas').findOne({ _id });

          assert.ok(isBsonType(encryptedDoc.a, 'Binary'));
          assert.ok(encryptedDoc.a.sub_type === 6);

          const doc = await model.findOne({ _id });
          assert.deepEqual(doc.a, [3]);
        });
      });

      describe('document array fields for CSFLE', function() {
        it('encrypts and decrypts', async function() {
          const nestedSchema = new Schema({ name: String }, { _id: false });
          const schema = new Schema({
            a: {
              type: [nestedSchema],
              encrypt: {
                keyId: [keyId],
                algorithm
              }
            }
          }, {
            encryptionType: 'csfle'
          });

          connection = createConnection();
          const model = connection.model('Schema', schema);
          await connection.openUri(process.env.MONGOOSE_TEST_URI, {
            dbName: 'db', autoEncryption: {
              keyVaultNamespace: 'keyvault.datakeys',
              kmsProviders: { local: { key: LOCAL_KEY } },
              extraOptions: {
                cryptdSharedLibRequired: true,
                cryptSharedLibPath: process.env.CRYPT_SHARED_LIB_PATH
              }
            }
          });

          const [{ _id }] = await model.insertMany([{ a: [{ name: 'bailey' }] }]);
          const encryptedDoc = await utilClient.db('db').collection('schemas').findOne({ _id });

          assert.ok(isBsonType(encryptedDoc.a, 'Binary'));
          assert.ok(encryptedDoc.a.sub_type === 6);

          const doc = await model.findOne({ _id }, {}, { lean: true });
          assert.deepEqual(doc.a, [{ name: 'bailey' }]);
        });
      });

      describe('primitive array field for QE', function() {
        it('encrypts and decrypts', async function() {
          const schema = new Schema({
            a: {
              type: [Int32],
              encrypt: {
                keyId
              }
            }
          }, {
            encryptionType: 'queryableEncryption'
          });

          connection = createConnection();
          const model = connection.model('Schema', schema); await connection.openUri(process.env.MONGOOSE_TEST_URI, {
            dbName: 'db', autoEncryption: {
              keyVaultNamespace: 'keyvault.datakeys',
              kmsProviders: { local: { key: LOCAL_KEY } },
              extraOptions: {
                cryptdSharedLibRequired: true,
                cryptSharedLibPath: process.env.CRYPT_SHARED_LIB_PATH
              }
            }
          });

          const [{ _id }] = await model.insertMany([{ a: [new Int32(3)] }]);
          const encryptedDoc = await utilClient.db('db').collection('schemas').findOne({ _id });

          assert.ok(isBsonType(encryptedDoc.a, 'Binary'));
          assert.ok(encryptedDoc.a.sub_type === 6);

          const doc = await model.findOne({ _id });
          assert.deepEqual(doc.a, [3]);
        });
      });

      describe('document array fields for QE', function() {
        it('encrypts and decrypts', async function() {
          const nestedSchema = new Schema({ name: String }, { _id: false });
          const schema = new Schema({
            a: {
              type: [nestedSchema],
              encrypt: {
                keyId
              }
            }
          }, {
            encryptionType: 'queryableEncryption'
          });

          connection = createConnection();
          const model = connection.model('Schema', schema);
          await connection.openUri(process.env.MONGOOSE_TEST_URI, {
            dbName: 'db', autoEncryption: {
              keyVaultNamespace: 'keyvault.datakeys',
              kmsProviders: { local: { key: LOCAL_KEY } },
              extraOptions: {
                cryptdSharedLibRequired: true,
                cryptSharedLibPath: process.env.CRYPT_SHARED_LIB_PATH
              }
            }
          });

          const [{ _id }] = await model.insertMany([{ a: [{ name: 'bailey' }] }]);
          const encryptedDoc = await utilClient.db('db').collection('schemas').findOne({ _id });

          assert.ok(isBsonType(encryptedDoc.a, 'Binary'));
          assert.ok(encryptedDoc.a.sub_type === 6);

          const doc = await model.findOne({ _id }, {}, { lean: true });
          assert.deepEqual(doc.a, [{ name: 'bailey' }]);
        });
      });
    });

    describe('multiple encrypted fields in a model', function() {
      const tests = {
        'multiple fields in a schema for CSFLE': {
          modelFactory: () => {
            const encrypt = {
              keyId: [keyId],
              algorithm
            };

            const schema = new Schema({
              a: {
                type: String,
                encrypt
              },
              b: {
                type: BigInt
              },
              c: {
                d: {
                  type: String,
                  encrypt
                }
              }
            }, {
              encryptionType: 'csfle'
            });

            connection = createConnection();
            model = connection.model('Schema', schema);
            return { model };
          }
        },
        'multiple fields in a schema for QE': {
          modelFactory: () => {
            const schema = new Schema({
              a: {
                type: String,
                encrypt: {
                  keyId
                }
              },
              b: {
                type: BigInt
              },
              c: {
                d: {
                  type: String,
                  encrypt: {
                    keyId: keyId2
                  }
                }
              }
            }, {
              encryptionType: 'queryableEncryption'
            });

            connection = createConnection();
            model = connection.model('Schema', schema);
            return { model };
          }
        }
      };

      for (const [description, { modelFactory }] of Object.entries(tests)) {
        describe(description, function() {
          it('encrypts and decrypts', async function() {
            const { model } = modelFactory();
            await connection.openUri(process.env.MONGOOSE_TEST_URI, {
              dbName: 'db', autoEncryption: {
                keyVaultNamespace: 'keyvault.datakeys',
                kmsProviders: { local: { key: LOCAL_KEY } },
                extraOptions: {
                  cryptdSharedLibRequired: true,
                  cryptSharedLibPath: process.env.CRYPT_SHARED_LIB_PATH
                }
              }
            });

            const [{ _id }] = await model.insertMany([{ a: 'hello', b: 1n, c: { d: 'world' } }]);
            const encryptedDoc = await utilClient.db('db').collection('schemas').findOne({ _id });

            assert.ok(isBsonType(encryptedDoc.a, 'Binary'));
            assert.ok(encryptedDoc.a.sub_type === 6);
            assert.ok(typeof encryptedDoc.b === 'number');
            assert.ok(isBsonType(encryptedDoc.c.d, 'Binary'));
            assert.ok(encryptedDoc.c.d.sub_type === 6);

            const doc = await model.findOne({ _id }, {});
            assert.deepEqual(doc.a, 'hello');
            assert.deepEqual(doc.b, 1n);
            assert.deepEqual(doc.c, { d: 'world' });
          });
        });
      }
    });

    describe('multiple schemas', function() {
      const tests = {
        'multiple schemas for CSFLE': {
          modelFactory: () => {
            connection = createConnection();
            const encrypt = {
              keyId: [keyId],
              algorithm
            };
            const model1 = connection.model('Model1', new Schema({
              a: {
                type: String,
                encrypt
              }
            }, {
              encryptionType: 'csfle'
            }));
            const model2 = connection.model('Model2', new Schema({
              b: {
                type: String,
                encrypt
              }
            }, {
              encryptionType: 'csfle'
            }));

            return { model1, model2 };
          }
        },
        'multiple schemas for QE': {
          modelFactory: () => {
            connection = createConnection();
            const model1 = connection.model('Model1', new Schema({
              a: {
                type: String,
                encrypt: {
                  keyId
                }
              }
            }, {
              encryptionType: 'queryableEncryption'
            }));
            const model2 = connection.model('Model2', new Schema({
              b: {
                type: String,
                encrypt: {
                  keyId
                }
              }
            }, {
              encryptionType: 'queryableEncryption'
            }));

            return { model1, model2 };
          }
        }
      };

      for (const [description, { modelFactory }] of Object.entries(tests)) {
        describe(description, function() {
          it('encrypts and decrypts', async function() {
            const { model1, model2 } = modelFactory();
            await connection.openUri(process.env.MONGOOSE_TEST_URI, {
              dbName: 'db', autoEncryption: {
                keyVaultNamespace: 'keyvault.datakeys',
                kmsProviders: { local: { key: LOCAL_KEY } },
                extraOptions: {
                  cryptdSharedLibRequired: true,
                  cryptSharedLibPath: process.env.CRYPT_SHARED_LIB_PATH
                }
              }
            });

            {
              const [{ _id }] = await model1.insertMany([{ a: 'hello' }]);
              const encryptedDoc = await utilClient.db('db').collection('model1').findOne({ _id });

              assert.ok(isBsonType(encryptedDoc.a, 'Binary'));
              assert.ok(encryptedDoc.a.sub_type === 6);

              const doc = await model1.findOne({ _id });
              assert.deepEqual(doc.a, 'hello');
            }

            {
              const [{ _id }] = await model2.insertMany([{ b: 'world' }]);
              const encryptedDoc = await utilClient.db('db').collection('model2').findOne({ _id });

              assert.ok(isBsonType(encryptedDoc.b, 'Binary'));
              assert.ok(encryptedDoc.b.sub_type === 6);

              const doc = await model2.findOne({ _id });
              assert.deepEqual(doc.b, 'world');
            }
          });
        });
      }
    });

    describe('CSFLE and QE schemas on the same connection', function() {
      it('encrypts and decrypts', async function() {
        connection = createConnection();
        const model1 = connection.model('Model1', new Schema({
          a: {
            type: String,
            encrypt: {
              keyId
            }
          }
        }, {
          encryptionType: 'queryableEncryption'
        }));
        const model2 = connection.model('Model2', new Schema({
          b: {
            type: String,
            encrypt: {
              keyId: [keyId],
              algorithm
            }
          }
        }, {
          encryptionType: 'csfle'
        }));
        await connection.openUri(process.env.MONGOOSE_TEST_URI, {
          dbName: 'db', autoEncryption: {
            keyVaultNamespace: 'keyvault.datakeys',
            kmsProviders: { local: { key: LOCAL_KEY } },
            extraOptions: {
              cryptdSharedLibRequired: true,
              cryptSharedLibPath: process.env.CRYPT_SHARED_LIB_PATH
            }
          }
        });

        {
          const [{ _id }] = await model1.insertMany([{ a: 'hello' }]);
          const encryptedDoc = await utilClient.db('db').collection('model1').findOne({ _id });

          assert.ok(isBsonType(encryptedDoc.a, 'Binary'));
          assert.ok(encryptedDoc.a.sub_type === 6);

          const doc = await model1.findOne({ _id });
          assert.deepEqual(doc.a, 'hello');
        }

        {
          const [{ _id }] = await model2.insertMany([{ b: 'world' }]);
          const encryptedDoc = await utilClient.db('db').collection('model2').findOne({ _id });

          assert.ok(isBsonType(encryptedDoc.b, 'Binary'));
          assert.ok(encryptedDoc.b.sub_type === 6);

          const doc = await model2.findOne({ _id });
          assert.deepEqual(doc.b, 'world');
        }
      });
    });

    describe('Models with discriminators', function() {
      let discrim1, discrim2, model;

      describe('csfle', function() {
        beforeEach(async function() {
          connection = createConnection();

          const schema = new Schema({
            name: {
              type: String, encrypt: { keyId: [keyId], algorithm }
            }
          }, {
            encryptionType: 'csfle'
          });
          model = connection.model('Schema', schema);
          discrim1 = model.discriminator('Test', new Schema({
            age: {
              type: Int32, encrypt: { keyId: [keyId], algorithm }
            }
          }, {
            encryptionType: 'csfle'
          }));

          discrim2 = model.discriminator('Test2', new Schema({
            dob: {
              type: Int32, encrypt: { keyId: [keyId], algorithm }
            }
          }, {
            encryptionType: 'csfle'
          }));


          await connection.openUri(process.env.MONGOOSE_TEST_URI, {
            dbName: 'db', autoEncryption: {
              keyVaultNamespace: 'keyvault.datakeys',
              kmsProviders: { local: { key: LOCAL_KEY } },
              extraOptions: {
                cryptdSharedLibRequired: true,
                cryptSharedLibPath: process.env.CRYPT_SHARED_LIB_PATH
              }
            }
          });
        });
        it('encrypts', async function() {
          {
            const doc = new discrim1({ name: 'bailey', age: 32 });
            await doc.save();

            const encryptedDoc = await utilClient.db('db').collection('schemas').findOne({ _id: doc._id });

            isEncryptedValue(encryptedDoc, 'age');
          }

          {
            const doc = new discrim2({ name: 'bailey', dob: 32 });
            await doc.save();

            const encryptedDoc = await utilClient.db('db').collection('schemas').findOne({ _id: doc._id });

            isEncryptedValue(encryptedDoc, 'dob');
          }
        });

        it('decrypts', async function() {
          {
            const doc = new discrim1({ name: 'bailey', age: 32 });
            await doc.save();

            const decryptedDoc = await discrim1.findOne({ _id: doc._id });

            assert.equal(decryptedDoc.age, 32);
          }

          {
            const doc = new discrim2({ name: 'bailey', dob: 32 });
            await doc.save();

            const decryptedDoc = await discrim2.findOne({ _id: doc._id });

            assert.equal(decryptedDoc.dob, 32);
          }
        });
      });


      describe('queryableEncryption', function() {
        beforeEach(async function() {
          connection = createConnection();

          const schema = new Schema({
            name: {
              type: String, encrypt: { keyId }
            }
          }, {
            encryptionType: 'queryableEncryption'
          });
          model = connection.model('Schema', schema);
          discrim1 = model.discriminator('Test', new Schema({
            age: {
              type: Int32, encrypt: { keyId: keyId2 }
            }
          }, {
            encryptionType: 'queryableEncryption'
          }));

          discrim2 = model.discriminator('Test2', new Schema({
            dob: {
              type: Int32, encrypt: { keyId: keyId3 }
            }
          }, {
            encryptionType: 'queryableEncryption'
          }));

          await connection.openUri(process.env.MONGOOSE_TEST_URI, {
            dbName: 'db', autoEncryption: {
              keyVaultNamespace: 'keyvault.datakeys',
              kmsProviders: { local: { key: LOCAL_KEY } },
              extraOptions: {
                cryptdSharedLibRequired: true,
                cryptSharedLibPath: process.env.CRYPT_SHARED_LIB_PATH
              }
            }
          });
        });
        it('encrypts', async function() {
          {
            const doc = new discrim1({ name: 'bailey', age: 32 });
            await doc.save();

            const encryptedDoc = await utilClient.db('db').collection('schemas').findOne({ _id: doc._id });

            isEncryptedValue(encryptedDoc, 'age');
          }

          {
            const doc = new discrim2({ name: 'bailey', dob: 32 });
            await doc.save();

            const encryptedDoc = await utilClient.db('db').collection('schemas').findOne({ _id: doc._id });

            isEncryptedValue(encryptedDoc, 'dob');
          }
        });

        it('decrypts', async function() {
          {
            const doc = new discrim1({ name: 'bailey', age: 32 });
            await doc.save();

            const decryptedDoc = await discrim1.findOne({ _id: doc._id });

            assert.equal(decryptedDoc.age, 32);
          }

          {
            const doc = new discrim2({ name: 'bailey', dob: 32 });
            await doc.save();

            const decryptedDoc = await discrim2.findOne({ _id: doc._id });

            assert.equal(decryptedDoc.dob, 32);
          }
        });
      });

      describe('duplicate keys in discriminators', function() {
        beforeEach(async function() {
          connection = createConnection();
        });
        describe('csfle', function() {
          it('throws on duplicate keys declared on different discriminators', async function() {
            const schema = new Schema({
              name: {
                type: String, encrypt: { keyId: [keyId], algorithm }
              }
            }, {
              encryptionType: 'csfle'
            });
            model = connection.model('Schema', schema);
            discrim1 = model.discriminator('Test', new Schema({
              age: {
                type: Int32, encrypt: { keyId: [keyId], algorithm }
              }
            }, {
              encryptionType: 'csfle'
            }));

            discrim2 = model.discriminator('Test2', new Schema({
              age: {
                type: Int32, encrypt: { keyId: [keyId], algorithm }
              }
            }, {
              encryptionType: 'csfle'
            }));

            const error = await connection.openUri(process.env.MONGOOSE_TEST_URI, {
              dbName: 'db', autoEncryption: {
                keyVaultNamespace: 'keyvault.datakeys',
                kmsProviders: { local: { key: LOCAL_KEY } },
                extraOptions: {
                  cryptdSharedLibRequired: true,
                  cryptSharedLibPath: process.env.CRYPT_SHARED_LIB_PATH
                }
              }
            }).catch(e => e);

            assert.ok(error instanceof Error);
            assert.match(error.message, /Cannot have duplicate keys in discriminators with encryption/);
          });
          it('throws on duplicate keys declared on root and child discriminators', async function() {
            const schema = new Schema({
              name: {
                type: String, encrypt: { keyId: [keyId], algorithm }
              }
            }, {
              encryptionType: 'csfle'
            });
            model = connection.model('Schema', schema);
            assert.throws(() => model.discriminator('Test', new Schema({
              name: {
                type: String, encrypt: { keyId: [keyId], algorithm }
              }
            }, {
              encryptionType: 'csfle'
            })),
            /encrypted fields cannot be declared on both the base schema and the child schema in a discriminator\. path=name/
            );
          });
        });

        describe('queryable encryption', function() {
          it('throws on duplicate keys declared on different discriminators', async function() {
            const schema = new Schema({
              name: {
                type: String, encrypt: { keyId }
              }
            }, {
              encryptionType: 'queryableEncryption'
            });
            model = connection.model('Schema', schema);
            discrim1 = model.discriminator('Test', new Schema({
              age: {
                type: Int32, encrypt: { keyId: keyId2 }
              }
            }, {
              encryptionType: 'queryableEncryption'
            }));

            discrim2 = model.discriminator('Test2', new Schema({
              age: {
                type: Int32, encrypt: { keyId: keyId3 }
              }
            }, {
              encryptionType: 'queryableEncryption'
            }));

            const error = await connection.openUri(process.env.MONGOOSE_TEST_URI, {
              dbName: 'db', autoEncryption: {
                keyVaultNamespace: 'keyvault.datakeys',
                kmsProviders: { local: { key: LOCAL_KEY } },
                extraOptions: {
                  cryptdSharedLibRequired: true,
                  cryptSharedLibPath: process.env.CRYPT_SHARED_LIB_PATH
                }
              }
            }).catch(e => e);

            assert.ok(error instanceof Error);
            assert.match(error.message, /Cannot have duplicate keys in discriminators with encryption/);
          });
          it('throws on duplicate keys declared on root and child discriminators', async function() {
            const schema = new Schema({
              name: {
                type: String, encrypt: { keyId }
              }
            }, {
              encryptionType: 'queryableEncryption'
            });
            model = connection.model('Schema', schema);
            assert.throws(() => model.discriminator('Test', new Schema({
              name: {
                type: String, encrypt: { keyId: keyId2 }
              }
            }, {
              encryptionType: 'queryableEncryption'
            })),
            /encrypted fields cannot be declared on both the base schema and the child schema in a discriminator\. path=name/
            );
          });
        });
      });

      describe('Nested Schema overrides nested path', function() {
        beforeEach(async function() {
          connection = createConnection();
        });

        it('nested objects throw an error', async function() {
          model = connection.model('Schema', new Schema({
            name: {
              first: { type: String, encrypt: { keyId: [keyId], algorithm } }
            }
          }, { encryptionType: 'csfle' }));

          assert.throws(() => {
            model.discriminator('Test', new Schema({
              name: { first: Number } // Different type, no encryption, stored as same field in MDB
            }));
          });
        });

        it('nested schemas throw an error', async function() {
          model = connection.model('Schema', new Schema({
            name: {
              first: { type: String, encrypt: { keyId: [keyId], algorithm } }
            }
          }, { encryptionType: 'csfle' }));

          assert.throws(() => {
            model.discriminator('Test', new Schema({
              name: new Schema({ first: Number }) // Different type, no encryption, stored as same field in MDB
            }));
          });
        });
      });
    });
  });

  describe('Encryption can be configured on the default mongoose connection', function() {
    afterEach(async function() {
      mongoose.deleteModel('Schema');
      await mongoose.disconnect();

    });
    it('encrypts and decrypts', async function() {
      const schema = new Schema({
        a: {
          type: Schema.Types.Int32,
          encrypt: { keyId: [keyId], algorithm }

        }
      }, {
        encryptionType: 'csfle'
      });

      const model = mongoose.model('Schema', schema);
      await mongoose.connect(process.env.MONGOOSE_TEST_URI, {
        dbName: 'db', autoEncryption: {
          keyVaultNamespace: 'keyvault.datakeys',
          kmsProviders: { local: { key: LOCAL_KEY } },
          extraOptions: {
            cryptdSharedLibRequired: true,
            cryptSharedLibPath: process.env.CRYPT_SHARED_LIB_PATH
          }
        }
      });

      const [{ _id }] = await model.insertMany([{ a: 2 }]);
      const encryptedDoc = await utilClient.db('db').collection('schemas').findOne({ _id });

      assert.ok(isBsonType(encryptedDoc.a, 'Binary'));
      assert.ok(encryptedDoc.a.sub_type === 6);

      const doc = await model.findOne({ _id });
      assert.deepEqual(doc.a, 2);
    });
  });
});
