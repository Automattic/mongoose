'use strict';

const assert = require('assert');
const mdb = require('mongodb');
const isBsonType = require('../../lib/helpers/isBsonType');
const { Schema, createConnection } = require('../../lib');
const { ObjectId, Double, Int32, Decimal128 } = require('bson');
const fs = require('fs');
const mongoose = require('../../lib');
const { Map } = require('../../lib/types');
const { join } = require('path');
const { readFile } = require('fs/promises');

const LOCAL_KEY = Buffer.from('Mng0NCt4ZHVUYUJCa1kxNkVyNUR1QURhZ2h2UzR2d2RrZzh0cFBwM3R6NmdWMDFBMUN3YkQ5aXRRMkhGRGdQV09wOGVNYUMxT2k3NjZKelhaQmRCZGJkTXVyZG9uSjFk', 'base64');

const { UUID } = require('mongodb/lib/bson');

/**
 * @param {string} path
 *
 * @returns {boolean}
 */
function exists(path) {
  try {
    fs.statSync(path);
    return true;
  } catch {
    return false;
  }
}

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
  /** @type { string } */
  let cryptSharedLibPath;
  /** @type { string } */
  let clusterUri;

  const autoEncryptionOptions = () => ({
    dbName: 'db',
    autoEncryption: {
      keyVaultNamespace: 'keyvault.datakeys',
      kmsProviders: { local: { key: LOCAL_KEY } },
      extraOptions: {
        cryptdSharedLibRequired: true,
        cryptSharedLibPath: cryptSharedLibPath
      }
    }
  });

  before(async function() {
    const expansionFile = join(__dirname, '../..', 'fle-cluster-config.json');
    if (!exists(expansionFile)) {
      throw new Error('must setup a cluster using `npm run setup-test-encryption`.');
    }

    /**  @type {{ uri: string, cryptShared: string }} */
    const configuration = JSON.parse(await readFile(expansionFile, { encoding: 'utf-8' }));

    cryptSharedLibPath = configuration.cryptShared;
    clusterUri = configuration.uri;
  });

  describe('meta: environmental variables are correctly set up', () => {
    it('clusterUri is set', async function() {
      const uri = clusterUri;
      assert.ok(uri);
    });

    it('clusterUri points to running cluster', async function() {
      try {
        const connection = await mongoose.connect(clusterUri);
        await connection.disconnect();
      } catch (error) {
        throw new Error('Unable to connect to running cluster', { cause: error });
      }
    });

    it('cryptSharedLibPath is set', async function() {
      const shared_library_path = cryptSharedLibPath;
      assert.ok(shared_library_path);
    });
  });

  const algorithm = 'AEAD_AES_256_CBC_HMAC_SHA_512-Random';


  let keyId, keyId2, keyId3;
  let utilClient;

  beforeEach(async function() {
    const keyVaultClient = new mdb.MongoClient(clusterUri);
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

    utilClient = new mdb.MongoClient(clusterUri);
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
      { type: Schema.Types.UUID, name: 'uuid', input: new UUID('53ca5a3e-19cd-405d-8ef7-5d88823939d9'), expected: '53ca5a3e-19cd-405d-8ef7-5d88823939d9' },
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

        isEncryptedValue(encryptedDoc, 'field');

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
          await connection.openUri(clusterUri, autoEncryptionOptions());
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
          await connection.openUri(clusterUri, autoEncryptionOptions());
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
          await connection.openUri(clusterUri, autoEncryptionOptions());

          const [{ _id }] = await model.insertMany([{ a: {
            name: 'bailey'
          } }]);
          const encryptedDoc = await utilClient.db('db').collection('schemas').findOne({ _id });

          isEncryptedValue(encryptedDoc, 'a');

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
          await connection.openUri(clusterUri, autoEncryptionOptions());

          const [{ _id }] = await model.insertMany([{ a: {
            name: 'bailey'
          } }]);
          const encryptedDoc = await utilClient.db('db').collection('schemas').findOne({ _id });

          isEncryptedValue(encryptedDoc, 'a');

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

            await connection.openUri(clusterUri, autoEncryptionOptions());

            const [{ _id }] = await model.insertMany([{ a: { b: { c: 'hello' } } }]);
            const encryptedDoc = await utilClient.db('db').collection('schemas').findOne({ _id });

            isEncryptedValue(encryptedDoc.a.b, 'c');

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
          await connection.openUri(clusterUri, autoEncryptionOptions());

          const [{ _id }] = await model.insertMany([{ a: [new Int32(3)] }]);
          const encryptedDoc = await utilClient.db('db').collection('schemas').findOne({ _id });

          isEncryptedValue(encryptedDoc, 'a');

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
          await connection.openUri(clusterUri, autoEncryptionOptions());

          const [{ _id }] = await model.insertMany([{ a: [{ name: 'bailey' }] }]);
          const encryptedDoc = await utilClient.db('db').collection('schemas').findOne({ _id });

          isEncryptedValue(encryptedDoc, 'a');

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
          const model = connection.model('Schema', schema); await connection.openUri(clusterUri, autoEncryptionOptions());

          const [{ _id }] = await model.insertMany([{ a: [new Int32(3)] }]);
          const encryptedDoc = await utilClient.db('db').collection('schemas').findOne({ _id });

          isEncryptedValue(encryptedDoc, 'a');

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
          await connection.openUri(clusterUri, autoEncryptionOptions());

          const [{ _id }] = await model.insertMany([{ a: [{ name: 'bailey' }] }]);
          const encryptedDoc = await utilClient.db('db').collection('schemas').findOne({ _id });

          isEncryptedValue(encryptedDoc, 'a');

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
            await connection.openUri(clusterUri, autoEncryptionOptions());

            const [{ _id }] = await model.insertMany([{ a: 'hello', b: 1n, c: { d: 'world' } }]);
            const encryptedDoc = await utilClient.db('db').collection('schemas').findOne({ _id });

            isEncryptedValue(encryptedDoc, 'a');
            assert.ok(typeof encryptedDoc.b === 'number');

            isEncryptedValue(encryptedDoc.c, 'd');

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
            await connection.openUri(clusterUri, autoEncryptionOptions());

            {
              const [{ _id }] = await model1.insertMany([{ a: 'hello' }]);
              const encryptedDoc = await utilClient.db('db').collection('model1').findOne({ _id });

              isEncryptedValue(encryptedDoc, 'a');

              const doc = await model1.findOne({ _id });
              assert.deepEqual(doc.a, 'hello');
            }

            {
              const [{ _id }] = await model2.insertMany([{ b: 'world' }]);
              const encryptedDoc = await utilClient.db('db').collection('model2').findOne({ _id });

              isEncryptedValue(encryptedDoc, 'b');

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
        await connection.openUri(clusterUri, autoEncryptionOptions());

        {
          const [{ _id }] = await model1.insertMany([{ a: 'hello' }]);
          const encryptedDoc = await utilClient.db('db').collection('model1').findOne({ _id });

          isEncryptedValue(encryptedDoc, 'a');

          const doc = await model1.findOne({ _id });
          assert.deepEqual(doc.a, 'hello');
        }

        {
          const [{ _id }] = await model2.insertMany([{ b: 'world' }]);
          const encryptedDoc = await utilClient.db('db').collection('model2').findOne({ _id });

          isEncryptedValue(encryptedDoc, 'b');

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


          await connection.openUri(clusterUri, autoEncryptionOptions());
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

          await connection.openUri(clusterUri, autoEncryptionOptions());
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

      describe('cloned parent schema before declaring discriminator', function() {
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

            assert.throws(() => {
              const clonedSchema = schema.clone().add({
                age: {
                  type: Int32, encrypt: { keyId: [keyId], algorithm }
                }
              });
              model.discriminator('Test', clonedSchema);
            }, /encrypted fields cannot be declared on both the base schema and the child schema in a discriminator/);
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

            assert.throws(() => {
              const clonedSchema = schema.clone().add({
                age: {
                  type: Int32, encrypt: { keyId: [keyId], algorithm }
                }
              });
              model.discriminator('Test', clonedSchema);
            }, /encrypted fields cannot be declared on both the base schema and the child schema in a discriminator/);
          });
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

            const error = await connection.openUri(clusterUri, autoEncryptionOptions()).catch(e => e);

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

            const error = await connection.openUri(clusterUri, autoEncryptionOptions()).catch(e => e);

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

          it('throws on duplicate keys declared on root and child discriminators, parent with fle, child without', async function() {
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
                type: String
              }
            })),
            /encrypted fields cannot have the same path as a non-encrypted field for discriminators. path=name/
            );
          });

          it('throws on duplicate keys declared on root and child discriminators, child with fle, parent without', async function() {
            const schema = new Schema({
              name: String
            });
            model = connection.model('Schema', schema);
            assert.throws(() => model.discriminator('Test', new Schema({
              name: {
                type: String, encrypt: { keyId: [keyId], algorithm } }
            }, {
              encryptionType: 'queryableEncryption'
            })),
            /encrypted fields cannot have the same path as a non-encrypted field for discriminators. path=name/
            );
          });
        });
      });

      describe('Nested paths in discriminators with conflicting definitions for the same key', function() {
        beforeEach(async function() {
          connection = createConnection();
        });

        describe('same definition on parent and child', function() {
          it('throws an error', function() {
            model = connection.model('Schema', new Schema({
              name: {
                first: { type: String, encrypt: { keyId: [keyId], algorithm } }
              }
            }, { encryptionType: 'csfle' }));

            assert.throws(() => {
              model.discriminator('Test', new Schema({
                name: { first: { type: String, encrypt: { keyId: [keyId], algorithm } } } // Different type, no encryption, stored as same field in MDB
              }, { encryptionType: 'csfle' }));
            }, /encrypted fields cannot be declared on both the base schema and the child schema in a discriminator. path/);
          });
        });

        describe('child overrides parent\'s encryption', function() {
          it('throws an error', function() {
            model = connection.model('Schema', new Schema({
              name: {
                first: { type: String, encrypt: { keyId: [keyId], algorithm } }
              }
            }, { encryptionType: 'csfle' }));

            assert.throws(() => {
              model.discriminator('Test', new Schema({
                name: { first: Number } // Different type, no encryption, stored as same field in MDB
              }));
            }, /encrypted fields cannot have the same path as a non-encrypted field for discriminators. path=name/);
          });
        });
      });

      describe('Nested schemas in discriminators with conflicting definitions for the same key', function() {
        beforeEach(async function() {
          connection = createConnection();
        });

        describe('same definition on parent and child', function() {
          it('throws an error', function() {
            model = connection.model('Schema', new Schema({
              name: new Schema({
                first: { type: String, encrypt: { keyId: [keyId], algorithm } }
              }, { encryptionType: 'csfle' })
            }, { encryptionType: 'csfle' }));

            assert.throws(() => {
              model.discriminator('Test', new Schema({
                name: new Schema({
                  first: { type: String, encrypt: { keyId: [keyId], algorithm } }
                }, { encryptionType: 'csfle' }) // Different type, no encryption, stored as same field in MDB
              }, { encryptionType: 'csfle' }));
            }, /encrypted fields cannot be declared on both the base schema and the child schema in a discriminator. path/);
          });
        });

        describe('child overrides parent\'s encryption', function() {
          it('throws an error', function() {
            model = connection.model('Schema', new Schema({
              name: new Schema({
                first: { type: String, encrypt: { keyId: [keyId], algorithm } }
              }, { encryptionType: 'csfle' })
            }, { encryptionType: 'csfle' }));

            assert.throws(() => {
              model.discriminator('Test', new Schema({
                name: new Schema({
                  first: Number
                })
              }));
            }, /encrypted fields cannot have the same path as a non-encrypted field for discriminators. path=name.first/);
          });
        });

        describe('multiple levels of nesting', function() {
          it('throws an error', function() {
            model = connection.model('Schema', new Schema({
              name: new Schema({
                first: new Schema({
                  first: { type: String, encrypt: { keyId: [keyId], algorithm } }
                }, { encryptionType: 'csfle' })
              }, { encryptionType: 'csfle' })
            }, { encryptionType: 'csfle' }));

            assert.throws(() => {
              model.discriminator('Test', new Schema({
                name: new Schema({
                  first: { type: String, encrypt: { keyId: [keyId], algorithm } }
                }, { encryptionType: 'csfle' }) // Different type, no encryption, stored as same field in MDB
              }, { encryptionType: 'csfle' }));
            }, /encrypted fields cannot have the same path as a non-encrypted field for discriminators. path=name.first/);
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
      await mongoose.connect(clusterUri, autoEncryptionOptions());

      const [{ _id }] = await model.insertMany([{ a: 2 }]);
      const encryptedDoc = await utilClient.db('db').collection('schemas').findOne({ _id });

      isEncryptedValue(encryptedDoc, 'a');

      const doc = await model.findOne({ _id });
      assert.deepEqual(doc.a, 2);
    });
  });

  describe('Key Vault API', function() {
    let connection;
    let model;

    afterEach(async function() {
      await connection?.close();
    });

    describe('No FLE configured', function() {
      it('returns `null`', async function() {
        connection = mongoose.createConnection();
        const model = connection.model('Name', { age: String });

        await connection.openUri(clusterUri);

        assert.equal(model.clientEncryption(), null);
      });
    });

    describe('Client not connected', function() {
      it('returns `null`', async function() {
        connection = mongoose.createConnection();
        const model = connection.model('Name', { age: String });

        assert.equal(model.clientEncryption(), null);
      });
    });

    describe('auto encryption enabled for a collection', function() {
      beforeEach(async function() {
        connection = createConnection();
        model = connection.model('Model1', new Schema({
          a: {
            type: String,
            encrypt: {
              keyId
            }
          }
        }, {
          encryptionType: 'queryableEncryption'
        }));

        await connection.openUri(clusterUri, autoEncryptionOptions());
      });

      it('returns a client encryption object', async function() {
        assert.ok(model.clientEncryption() instanceof mdb.ClientEncryption);
      });

      it('the client encryption is usable as a key vault', async function() {
        const clientEncryption = model.clientEncryption();
        const dataKey = await clientEncryption.createDataKey('local');
        const keys = await clientEncryption.getKeys().toArray();

        assert.ok(keys.length > 0);

        const key = keys.find(
          ({ _id }) => _id.toString() === dataKey.toString()
        );

        assert.ok(key);
      });

      it('uses the same keyvaultNamespace', async function() {
        assert.equal(model.clientEncryption()._keyVaultNamespace, 'keyvault.datakeys');
      });

      it('uses the same kms providers', async function() {
        assert.deepEqual(model.clientEncryption()._kmsProviders, { local: { key: LOCAL_KEY } });
      });

      it('uses the same proxy options', async function() {
        const options = model.collection.conn.client.options.autoEncryption;
        options.proxyOptions = { name: 'bailey' };
        assert.deepEqual(model.clientEncryption()._proxyOptions, { name: 'bailey' });
      });

      it('uses the same TLS options', async function() {
        const options = model.collection.conn.client.options.autoEncryption;
        options.tlsOptions = {
          tlsCAFile: 'some file'
        };
        assert.deepEqual(model.clientEncryption()._tlsOptions, {
          tlsCAFile: 'some file'
        });
      });

      it('uses the same credentialProviders', async function() {
        const options = model.collection.conn.client.options.autoEncryption;
        const credentialProviders = {
          aws: async() => {}
        };
        options.credentialProviders = credentialProviders;
        options.kmsProviders = { aws: {} };
        assert.equal(model.clientEncryption()._credentialProviders, credentialProviders);
      });

      it('uses the underlying MongoClient as the keyvault client', async function() {
        const options = model.collection.conn.client.options.autoEncryption;
        assert.ok(model.clientEncryption()._client === options.keyVaultClient, 'client not the same');
        assert.equal(model.clientEncryption()._keyVaultClient, options.keyVaultClient, 'keyvault client not the same');
      });
    });

  });

  describe('auto index creation', function() {
    let connection;

    describe('CSFLE', function() {
      it('automatically creates indexes for CSFLE models', async function() {
        connection = mongoose.createConnection();
        const schema = new Schema({
          name: { type: String, encrypt: { keyId: [keyId], algorithm } },
          age: Number
        }, { encryptionType: 'csfle' });
        schema.index({ age: 1 });
        const model = connection.model(new UUID().toHexString(), schema);
        await connection.openUri(clusterUri, autoEncryptionOptions());

        await model.init();

        const indexes = await model.listIndexes();
        assert.ok(indexes.find(({ name }) => name === 'age_1'));
      });
    });


    describe('Queryable Encryption', function() {
      it('automatically creates indexes for QE models', async function() {
        connection = mongoose.createConnection();
        const schema = new Schema({
          name: { type: String, encrypt: { keyId } },
          age: Number
        }, { encryptionType: 'queryableEncryption' });
        schema.index({ age: 1 });
        const model = connection.model(new UUID().toHexString(), schema);
        await connection.openUri(clusterUri, autoEncryptionOptions());

        await model.init();

        const indexes = await model.listIndexes();
        assert.ok(indexes.find(({ name }) => name === 'age_1'));
      });
    });
  });


  describe('auto collection creation', function() {
    let connection;

    afterEach(async function() {
      await connection?.close();
    });

    describe('CSFLE', function() {
      it('automatically creates the model\'s collection', async function() {
        connection = mongoose.createConnection();
        const name = new UUID().toHexString();

        const schema = new Schema({
          name: { type: String, encrypt: { keyId: [keyId], algorithm } },
          age: Number
        }, { encryptionType: 'csfle', autoCreate: true, collection: name });

        const model = connection.model(name, schema);

        await connection.openUri(clusterUri, { ... autoEncryptionOptions(), dbName: name });
        await model.init();

        const collections = await connection.db.listCollections({}, { readPreference: 'primary' }).map(({ name }) => name).toArray();
        assert.deepEqual(collections, [name]);
      });
    });

    describe('Queryable Encryption', function() {
      it('automatically creates the model\'s collection', async function() {
        connection = mongoose.createConnection();
        const name = new UUID().toHexString();

        const schema = new Schema({
          name: { type: String, encrypt: { keyId: keyId } }
        }, { encryptionType: 'queryableEncryption', autoCreate: true, collection: name });

        const model = connection.model(name, schema);

        await connection.openUri(clusterUri, { ... autoEncryptionOptions(), dbName: name });

        await model.init();

        const collections = await connection.db.listCollections({}, { readPreference: 'primary' }).map(({ name }) => name).toArray();

        collections.sort((a, b) => {
          // depending on what letter name starts with, `name` might come before the two queryable encryption collections or after them.
          // this sort function always puts the `name` collection first, and the two QE collections after it.
          if (!a.includes('enxcol_')) return -1;

          return a.localeCompare(b);
        });
        assert.deepEqual(collections, [
          name,
          `enxcol_.${name}.ecoc`,
          `enxcol_.${name}.esc`
        ]);
      });
    });
  });

  describe('read operations', function() {
    let connection;

    afterEach(async function() {
      await connection?.close();
    });

    describe('CSFLE', function() {
      it('encrypted documents can be read', async function() {
        connection = mongoose.createConnection();
        const schema = new Schema({
          name: { type: String, encrypt: { keyId: [keyId], algorithm } },
          age: Number
        }, { encryptionType: 'csfle', autoCreate: true });

        const model = connection.model(new UUID().toHexString(), schema);

        await connection.openUri(clusterUri, autoEncryptionOptions());

        await model.insertMany([
          { name: 'bailey', age: 1 },
          { name: 'john', age: 2 }
        ]);

        assert.equal((await model.find()).length, 2);
        assert.deepEqual(await model.findOne({ age: 1 }, { _id: 0, name: 1 }, { lean: true }), { name: 'bailey' });
      });

      it('deterministically encrypted fields can be equality queried', async function() {
        connection = mongoose.createConnection();
        const schema = new Schema({
          name: { type: String, encrypt: { keyId: [keyId], algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic' } },
          age: Number
        }, { encryptionType: 'csfle', autoCreate: true });

        const model = connection.model(new UUID().toHexString(), schema);

        await connection.openUri(clusterUri, autoEncryptionOptions());

        await model.insertMany([
          { name: 'bailey', age: 1 },
          { name: 'john', age: 2 }
        ]);

        assert.equal((await model.find()).length, 2);
        assert.deepEqual(await model.findOne({ name: 'bailey' }, { _id: 0, name: 1 }, { lean: true }), { name: 'bailey' });
      });
    });

    describe('QE encrypted queries', function() {
      describe('when a field is configured for equality queries', function() {
        it('can be queried with mongoose', async function() {
          connection = mongoose.createConnection();
          const schema = new Schema({
            name: { type: String, encrypt: { keyId, queries: { queryType: 'equality' } } }
          }, { encryptionType: 'queryableEncryption' });
          const model = connection.model(new UUID().toHexString(), schema);
          await connection.openUri(clusterUri, autoEncryptionOptions());
          await model.init();

          await model.insertMany([{ name: 'bailey' }, { name: 'john' }]);

          const doc = await model.findOne({ name: 'bailey' });
          assert.ok(doc);
        });
      });

      describe('when a field is not configured for equality queries', function() {
        it('cannot be queried directly', async function() {
          connection = mongoose.createConnection();
          const schema = new Schema({
            name: { type: String, encrypt: { keyId } }
          }, { encryptionType: 'queryableEncryption' });
          const model = connection.model(new UUID().toHexString(), schema);
          await connection.openUri(clusterUri, autoEncryptionOptions());
          await model.init();

          await model.insertMany([{ name: 'bailey' }, { name: 'john' }]);

          await assert.rejects(() => {
            return model.findOne({ name: 'bailey' });
          }, /Can only execute encrypted equality queries with an encrypted equality index/);
        });
      });

      it('queried documents can be modified and saved', async function() {
        connection = mongoose.createConnection();
        const schema = new Schema({
          name: { type: String, encrypt: { keyId, queries: { queryType: 'equality' } } }
        }, { encryptionType: 'queryableEncryption' });
        const model = connection.model(new UUID().toHexString(), schema);
        await connection.openUri(clusterUri, autoEncryptionOptions());
        await model.init();
        await model.insertMany([{ name: 'bailey' }, { name: 'john' }]);

        const doc = await model.findOne({ name: 'bailey' });
        doc.name = 'new name!';

        await doc.save();

        assert.ok(await model.findOne({ name: 'new name!' }));
      });
    });
  });
});
