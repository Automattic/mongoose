'use strict';

const assert = require('assert');
const start = require('./common');
const { ObjectId, Decimal128 } = require('../lib/types');
const { Double, Int32, UUID } = require('bson');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

/**
 *
 * @param {import('../lib').Schema} object
 * @param {Array<string> | string} path
 * @returns { boolean }
 */
function schemaHasEncryptedProperty(schema, path) {
  path = [path].flat();
  path = path.join('.');

  return path in schema.encryptedFields;
}

const KEY_ID = '9fbdace3-4e48-412d-88df-3807e8009522';
const algorithm = 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic';

describe('encrypted schema declaration', function() {
  describe('schemaMap generation tests', function() {
    for (const { type, name, encryptionType, schemaMap, encryptedFields } of primitiveSchemaMapTests()) {
      describe(`When a schema is instantiated with an encrypted field of type ${name} for ${encryptionType}`, function() {
        let schema;
        const encrypt = {
          keyId: KEY_ID
        };
        encryptionType === 'csfle' && (encrypt.algorithm = algorithm);

        beforeEach(function() {
          schema = new Schema({
            field: {
              type, encrypt
            }
          }, {
            encryptionType
          });
        });

        it(`Then the schema has an encrypted property of type ${name}`, function() {
          assert.ok(schemaHasEncryptedProperty(schema, 'field'));
        });

        encryptionType === 'csfle' && it('then the generated schemaMap is correct', function() {
          assert.deepEqual(schema._buildSchemaMap(), schemaMap);
        });

        encryptionType === 'queryableEncryption' && it('then the generated encryptedFieldsMap is correct', function() {
          assert.deepEqual(schema._buildEncryptedFields(), encryptedFields);
        });
      });
    }
  });

  describe('Tests that fields of valid schema types can be declared as encrypted schemas', function() {
    it('mongoose maps with csfle', function() {
      const schema = new Schema({
        field: {
          type: Schema.Types.Map,
          of: String,
          encrypt: { keyId: [KEY_ID], algorithm }
        }
      }, { encryptionType: 'csfle' });

      assert.ok(schemaHasEncryptedProperty(schema, 'field'));

      assert.deepEqual(schema._buildSchemaMap(), {
        bsonType: 'object',
        properties: {
          field: { encrypt: {
            bsonType: 'object', algorithm, keyId: [KEY_ID]
          } }
        }
      });
    });

    it('mongoose maps with queryableEncryption', function() {
      const schema = new Schema({
        field: {
          type: Schema.Types.Map,
          of: String,
          encrypt: { keyId: KEY_ID }
        }
      }, { encryptionType: 'queryableEncryption' });

      assert.ok(schemaHasEncryptedProperty(schema, 'field'));

      assert.deepEqual(schema._buildEncryptedFields(), {
        fields: [
          { path: 'field', keyId: KEY_ID, bsonType: 'object' }
        ]
      });
    });

    it('subdocument for csfle', function() {
      const encryptedSchema = new Schema({
        encrypted: {
          type: String, encrypt: { keyId: KEY_ID, algorithm }
        }
      }, { encryptionType: 'csfle' });
      const schema = new Schema({
        field: encryptedSchema
      }, { encryptionType: 'csfle' });

      assert.ok(schemaHasEncryptedProperty(schema, ['field', 'encrypted']));

      assert.deepEqual(schema._buildSchemaMap(), {
        bsonType: 'object',
        properties: {
          field: {
            bsonType: 'object',
            properties: {
              encrypted: { encrypt: { bsonType: 'string', algorithm, keyId: KEY_ID } }
            }
          }
        }
      });
    });
    it('subdocument for queryableEncryption', function() {
      const encryptedSchema = new Schema({
        encrypted: {
          type: String, encrypt: { keyId: KEY_ID }
        }
      }, { encryptionType: 'queryableEncryption' });
      const schema = new Schema({
        field: encryptedSchema
      }, { encryptionType: 'queryableEncryption' });
      assert.ok(schemaHasEncryptedProperty(schema, ['field', 'encrypted']));

      assert.deepEqual(schema._buildEncryptedFields(), {
        fields: [
          { path: 'field.encrypted', keyId: KEY_ID, bsonType: 'string' }
        ]
      });
    });
    it('nested object for csfle', function() {
      const schema = new Schema({
        field: {
          encrypted: {
            type: String, encrypt: { keyId: KEY_ID, algorithm }
          }
        }
      }, { encryptionType: 'csfle' });
      assert.ok(schemaHasEncryptedProperty(schema, ['field', 'encrypted']));
      assert.deepEqual(schema._buildSchemaMap(), {
        bsonType: 'object',
        properties: {
          field: {
            bsonType: 'object',
            properties: {
              encrypted: { encrypt: { bsonType: 'string', algorithm, keyId: KEY_ID } }
            }
          }
        }
      });
    });
    it('nested object for queryableEncryption', function() {
      const schema = new Schema({
        field: {
          encrypted: {
            type: String, encrypt: { keyId: KEY_ID }
          }
        }
      }, { encryptionType: 'queryableEncryption' });
      assert.ok(schemaHasEncryptedProperty(schema, ['field', 'encrypted']));
      assert.deepEqual(schema._buildEncryptedFields(), {
        fields: [
          { path: 'field.encrypted', keyId: KEY_ID, bsonType: 'string' }
        ]
      });
    });
    it('schema with encrypted array for csfle', function() {
      const schema = new Schema({
        encrypted: {
          type: [Number],
          encrypt: { keyId: KEY_ID, algorithm }
        }
      }, { encryptionType: 'csfle' });
      assert.ok(schemaHasEncryptedProperty(schema, ['encrypted']));

      assert.deepEqual(schema._buildSchemaMap(), {
        bsonType: 'object',
        properties: {
          encrypted: {
            encrypt: {
              bsonType: 'array',
              keyId: KEY_ID,
              algorithm
            }
          }
        }
      });
    });
    it('schema with encrypted array for queryableEncryption', function() {
      const schema = new Schema({
        encrypted: {
          type: [Number],
          encrypt: { keyId: KEY_ID }
        }
      }, { encryptionType: 'queryableEncryption' });
      assert.ok(schemaHasEncryptedProperty(schema, ['encrypted']));
      assert.deepEqual(schema._buildEncryptedFields(), {
        fields: [
          { path: 'encrypted', keyId: KEY_ID, bsonType: 'array' }
        ]
      });
    });
  });

  describe('invalid schema types for encrypted schemas', function() {
    describe('When a schema is instantiated with an encrypted field of type Number', function() {
      it('Then an error is thrown', function() {
        assert.throws(() => {
          new Schema({
            field: {
              type: Number, encrypt: { keyId: KEY_ID, algorithm }
            }
          }, { encryptionType: 'csfle' });
        }, /Invalid BSON type for FLE field: 'field'/);
      });
    });

    describe('When a schema is instantiated with an encrypted field of type Mixed', function() {
      it('Then an error is thrown', function() {
        assert.throws(() => {
          new Schema({
            field: {
              type: Schema.Types.Mixed, encrypt: { keyId: KEY_ID, algorithm }
            }
          }, { encryptionType: 'csfle' });
        }, /Invalid BSON type for FLE field: 'field'/);
      });
    });

    describe('When a schema is instantiated with a custom schema type plugin that does not have a encryption type', function() {
      class Int8 extends mongoose.SchemaType {
        constructor(key, options) {
          super(key, options, 'Int8');
        }
      }

      beforeEach(function() {
        // Don't forget to add `Int8` to the type registry
        mongoose.Schema.Types.Int8 = Int8;
      });
      afterEach(function() {
        delete mongoose.Schema.Types.Int8;
      });

      it('Then an error is thrown', function() {
        assert.throws(() => {
          new Schema({
            field: {
              type: Int8, encrypt: { keyId: KEY_ID, algorithm }
            }
          }, { encryptionType: 'csfle' });
        }, /Invalid BSON type for FLE field: 'field'/);
      });
    });

    describe('When a schema is instantiated with a custom schema type plugin that does have a encryption type', function() {
      class Int8 extends mongoose.SchemaType {
        constructor(key, options) {
          super(key, options, 'Int8');
        }

        autoEncryptionType() {
          return 'int';
        }
      }

      beforeEach(function() {
        // Don't forget to add `Int8` to the type registry
        mongoose.Schema.Types.Int8 = Int8;
      });
      afterEach(function() {
        delete mongoose.Schema.Types.Int8;
      });

      it('No error is thrown', function() {
        new Schema({
          field: {
            type: Int8, encrypt: { keyId: KEY_ID, algorithm }
          }
        }, { encryptionType: 'csfle' });
      });
    });
  });

  describe('options.encryptionType', function() {
    describe('when an encrypted schema is instantiated and an encryptionType is not provided', function() {
      it('an error is thrown', function() {
        assert.throws(
          () => {
            new Schema({
              field: {
                type: String,
                encrypt: { keyId: KEY_ID, algorithm }
              }
            });
          }, /encryptionType must be provided/
        );


      });
    });

    describe('when a nested encrypted schema is provided to schema constructor and the encryption types are different', function() {
      it('then an error is thrown', function() {
        const innerSchema = new Schema({
          field1: {
            type: String, encrypt: {
              keyId: KEY_ID,
              queries: { type: 'equality' }
            }
          }
        }, { encryptionType: 'csfle' });
        assert.throws(() => {
          new Schema({
            field1: innerSchema
          }, { encryptionType: 'queryableEncryption' });
        }, /encryptionType of a nested schema must match the encryption type of the parent schema/);
      });
    });
  });

  describe('tests for schema mutation methods', function() {
    describe('Schema.prototype.add()', function() {
      describe('Given a schema with no encrypted fields', function() {
        describe('When an encrypted field is added', function() {
          it('Then the encrypted field is added to the encrypted fields for the schema', function() {
            const schema = new Schema({
              field1: Number
            });
            schema.encryptionType('csfle');
            schema.add(
              { name: { type: String, encrypt: { keyId: KEY_ID, algorithm } } }
            );
            assert.ok(schemaHasEncryptedProperty(schema, ['name']));
          });
        });
      });

      describe('Given a schema with an encrypted field', function() {
        describe('when an encrypted field is added', function() {
          describe('and the encryption type matches the existing encryption type', function() {
            it('Then the encrypted field is added to the encrypted fields for the schema', function() {
              const schema = new Schema({
                field1: { type: String, encrypt: { keyId: KEY_ID, algorithm } }
              }, { encryptionType: 'csfle' });
              schema.add(
                { name: { type: String, encrypt: { keyId: KEY_ID, algorithm } } }
              );
              assert.ok(schemaHasEncryptedProperty(schema, ['name']));
            });
          });
        });
      });

      describe('Given a schema with an encrypted field', function() {
        describe('when an encrypted field is added with different encryption settings for the same field', function() {
          it('The encryption settings for the field are overridden', function() {
            const schema = new Schema({
              field1: { type: String, encrypt: { keyId: KEY_ID, algorithm } }
            }, { encryptionType: 'csfle' });
            schema.add(
              { name: { type: String, encrypt: { keyId: new UUID(), algorithm } } }
            );
            assert.notEqual(schema.encryptedFields['name'].keyId, KEY_ID);
          });

        });

        describe('When an unencrypted field is added for the same field', function() {
          it('The field on the schema is overridden', function() {
            const schema = new Schema({
              field1: { type: String, encrypt: { keyId: KEY_ID, algorithm } }
            }, { encryptionType: 'csfle' });
            schema.add(
              { field1: String }
            );
            assert.equal(schemaHasEncryptedProperty(schema, ['field1']), false);
          });

        });
      });

      describe('Given a schema', function() {
        describe('When multiple encrypted fields are added to the schema in one call to add()', function() {
          it('Then all the encrypted fields are added to the schema', function() {
            const schema = new Schema({
              field1: { type: String, encrypt: { keyId: KEY_ID, algorithm } }
            }, { encryptionType: 'csfle' });
            schema.add(
              {
                name: { type: String, encrypt: { keyId: KEY_ID, algorithm } },
                age: { type: String, encrypt: { keyId: KEY_ID, algorithm } }
              }
            );

            assert.ok(schemaHasEncryptedProperty(schema, ['name']));
            assert.ok(schemaHasEncryptedProperty(schema, ['age']));
          });
        });
      });
    });

    describe('Schema.prototype.remove()', function() {
      describe('Given a schema with one encrypted field', function() {
        describe('When the encrypted field is removed', function() {
          it('Then the encrypted fields on the schema does not contain the removed field', function() {
            const schema = new Schema({
              field1: { type: String, encrypt: { keyId: KEY_ID, algorithm } }
            }, { encryptionType: 'csfle' });
            schema.remove('field1');

            assert.equal(schemaHasEncryptedProperty(schema, ['field1']), false);
          });
        });
      });

      describe('Given a schema with multiple encrypted fields', function() {
        describe('When one encrypted field is removed', function() {
          it('The encrypted fields on the schema does not contain the removed field', function() {
            const schema = new Schema({
              field1: { type: String, encrypt: { keyId: KEY_ID, algorithm } },
              name: { type: String, encrypt: { keyId: KEY_ID, algorithm } },
              age: { type: String, encrypt: { keyId: KEY_ID, algorithm } }
            }, { encryptionType: 'csfle' });
            schema.remove(['field1']);

            assert.equal(schemaHasEncryptedProperty(schema, ['field1']), false);
            assert.equal(schemaHasEncryptedProperty(schema, ['name']), true);
            assert.equal(schemaHasEncryptedProperty(schema, ['age']), true);
          });
        });

        describe('When all encrypted fields are removed', function() {
          it('The encrypted fields on the schema does not contain the removed field', function() {
            const schema = new Schema({
              field1: { type: String, encrypt: { keyId: KEY_ID, algorithm } },
              name: { type: String, encrypt: { keyId: KEY_ID, algorithm } },
              age: { type: String, encrypt: { keyId: KEY_ID, algorithm } }
            }, { encryptionType: 'csfle' });
            schema.remove(['field1', 'name', 'age']);

            assert.equal(schemaHasEncryptedProperty(schema, ['field1']), false);
            assert.equal(schemaHasEncryptedProperty(schema, ['name']), false);
            assert.equal(schemaHasEncryptedProperty(schema, ['age']), false);
          });
        });
      });

      describe('when a nested encrypted property is removed', function() {
        it('the encrypted field is removed from the schema', function() {
          const schema = new Schema({
            field1: { name: { type: String, encrypt: { keyId: KEY_ID, algorithm } } }
          }, { encryptionType: 'csfle' });

          assert.equal(schemaHasEncryptedProperty(schema, ['field1.name']), true);

          schema.remove(['field1.name']);

          assert.equal(schemaHasEncryptedProperty(schema, ['field1.name']), false);
        });
      });
    });
  });

  describe('tests for schema copying methods', function() {
    describe('Schema.prototype.clone()', function() {
      describe('Given a schema with encrypted fields', function() {
        describe('When the schema is cloned', function() {
          it('The resultant schema contains all the same encrypted fields as the original schema', function() {
            const schema1 = new Schema({ name: { type: String, encrypt: { keyId: KEY_ID, algorithm } } }, { encryptionType: 'csfle' });
            const schema2 = schema1.clone();

            assert.equal(schemaHasEncryptedProperty(schema2, ['name']), true);
          });
          it('The encryption type of the cloned schema is the same as the original', function() {
            const schema1 = new Schema({ name: { type: String, encrypt: { keyId: KEY_ID, algorithm } } }, { encryptionType: 'csfle' });
            const schema2 = schema1.clone();

            assert.equal(schema2.encryptionType(), 'csfle');
          });
          describe('When the cloned schema is modified', function() {
            it('The original is not modified', function() {
              const schema1 = new Schema({ name: { type: String, encrypt: { keyId: KEY_ID, algorithm } } }, { encryptionType: 'csfle' });
              const schema2 = schema1.clone();
              schema2.remove('name');
              assert.equal(schemaHasEncryptedProperty(schema2, ['name']), false);
              assert.equal(schemaHasEncryptedProperty(schema1, ['name']), true);
            });
          });
        });
      });
    });

    describe('Schema.prototype.pick()', function() {
      describe('When pick() is used with only unencrypted fields', function() {
        it('Then the resultant schema has none of the original schema’s encrypted fields', function() {
          const originalSchema = new Schema({
            name: { type: String, encrypt: { keyId: KEY_ID, algorithm } },
            age: { type: Int32, encrypt: { keyId: KEY_ID, algorithm } },
            name1: String,
            age1: Int32
          }, { encryptionType: 'csfle' });

          const schema2 = originalSchema.pick(['name1', 'age1']);

          assert.equal(schemaHasEncryptedProperty(schema2, ['name']), false);
          assert.equal(schemaHasEncryptedProperty(schema2, ['age']), false);
        });
        it('Then the encryption type is set to the cloned schemas encryptionType', function() {
          const originalSchema = new Schema({
            name: { type: String, encrypt: { keyId: KEY_ID, algorithm } },
            age: { type: Int32, encrypt: { keyId: KEY_ID, algorithm } },
            name1: String,
            age1: Int32
          }, { encryptionType: 'csfle' });

          const schema2 = originalSchema.pick(['name1', 'age1']);

          assert.equal(schema2.encryptionType(), 'csfle');
        });
      });

      describe('When pick() is used with some unencrypted fields', function() {
        it('Then the resultant schema has the encrypted fields of the original schema that were specified to pick().', function() {
          const originalSchema = new Schema({
            name: { type: String, encrypt: { keyId: KEY_ID, algorithm } },
            age: { type: Int32, encrypt: { keyId: KEY_ID, algorithm } },
            name1: String,
            age1: Int32
          }, { encryptionType: 'csfle' });

          const schema2 = originalSchema.pick(['name', 'age1']);

          assert.equal(schemaHasEncryptedProperty(schema2, ['name']), true);
          assert.equal(schemaHasEncryptedProperty(schema2, ['age']), false);
        });
        it('Then the encryption type is the same as the original schema’s encryption type', function() {
          const originalSchema = new Schema({
            name: { type: String, encrypt: { keyId: KEY_ID, algorithm } },
            age: { type: Int32, encrypt: { keyId: KEY_ID, algorithm } },
            name1: String,
            age1: Int32
          }, { encryptionType: 'csfle' });

          const schema2 = originalSchema.pick(['name', 'age1']);

          assert.equal(schema2.encryptionType(), 'csfle');
        });
      });

      describe('When pick() is used with nested paths', function() {
        it('Then the resultant schema has the encrypted fields of the original schema that were specified to pick().', function() {
          const originalSchema = new Schema({
            name: {
              name: { type: String, encrypt: { keyId: KEY_ID, algorithm } }
            },
            age: { type: Int32, encrypt: { keyId: KEY_ID, algorithm } },
            name1: String,
            age1: Int32
          }, { encryptionType: 'csfle' });

          const schema2 = originalSchema.pick(['name.name', 'age1']);

          assert.equal(schemaHasEncryptedProperty(schema2, ['name', 'name']), true);
          assert.equal(schemaHasEncryptedProperty(schema2, ['age']), false);
        });
        it('Then the encryption type is the same as the original schema’s encryption type', function() {
          const originalSchema = new Schema({
            name: { type: String, encrypt: { keyId: KEY_ID, algorithm } },
            age: { type: Int32, encrypt: { keyId: KEY_ID, algorithm } },
            name1: String,
            age1: Int32
          }, { encryptionType: 'csfle' });

          const schema2 = originalSchema.pick(['name', 'age1']);

          assert.equal(schema2.encryptionType(), 'csfle');
        });
      });
    });

    describe('Schema.prototype.omit()', function() {
      describe('When omit() is used with only unencrypted fields', function() {
        it('Then the resultant schema has all the original schema’s encrypted fields', function() {
          const originalSchema = new Schema({
            name: { type: String, encrypt: { keyId: KEY_ID, algorithm } },
            age: { type: Int32, encrypt: { keyId: KEY_ID, algorithm } },
            name1: String,
            age1: Int32
          }, { encryptionType: 'csfle' });

          const schema2 = originalSchema.omit(['name1', 'age1']);

          assert.equal(schemaHasEncryptedProperty(schema2, ['name']), true);
          assert.equal(schemaHasEncryptedProperty(schema2, ['age']), true);
        });
        it('Then the encryption type is the same as the original schema’s encryption type', function() {
          const originalSchema = new Schema({
            name: { type: String, encrypt: { keyId: KEY_ID, algorithm } },
            age: { type: Int32, encrypt: { keyId: KEY_ID, algorithm } },
            name1: String,
            age1: Int32
          }, { encryptionType: 'csfle' });

          const schema2 = originalSchema.omit(['name1', 'age1']);

          assert.equal(schema2.encryptionType(), 'csfle');
        });
      });

      describe('When omit() is used with some unencrypted fields', function() {
        it('Then the resultant schema has the encrypted fields of the original schema that were specified to omit()', function() {
          const originalSchema = new Schema({
            name: { type: String, encrypt: { keyId: KEY_ID, algorithm } },
            age: { type: Int32, encrypt: { keyId: KEY_ID, algorithm } },
            name1: String,
            age1: Int32
          }, { encryptionType: 'csfle' });

          const schema2 = originalSchema.omit(['name', 'age1']);

          assert.equal(schemaHasEncryptedProperty(schema2, ['name']), false);
          assert.equal(schemaHasEncryptedProperty(schema2, ['age']), true);
        });
        it('Then the encryption type is the same as the original schema’s encryption type', function() {
          const originalSchema = new Schema({
            name: { type: String, encrypt: { keyId: KEY_ID, algorithm } },
            age: { type: Int32, encrypt: { keyId: KEY_ID, algorithm } },
            name1: String,
            age1: Int32
          }, { encryptionType: 'csfle' });

          const schema2 = originalSchema.omit(['name', 'age1']);

          assert.equal(schema2.encryptionType(), 'csfle');
        });
      });

      describe('When omit() is used with all the encrypted fields', function() {
        it('Then the encryption type is the same as the original schema’s encryption type', function() {
          const originalSchema = new Schema({
            name: { type: String, encrypt: { keyId: KEY_ID, algorithm } },
            age: { type: Int32, encrypt: { keyId: KEY_ID, algorithm } },
            name1: String,
            age1: Int32
          }, { encryptionType: 'csfle' });

          const schema2 = originalSchema.omit(['name', 'age']);

          assert.equal(schema2.encryptionType(), 'csfle');
        });
      });
    });
  });
});

function primitiveSchemaMapTests() {
  return [
    {
      name: 'string',
      type: String,
      encryptionType: 'csfle',
      schemaMap: {
        bsonType: 'object',
        properties: {
          field: {
            encrypt: {
              keyId: '9fbdace3-4e48-412d-88df-3807e8009522',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
              bsonType: 'string'
            }
          }
        }
      },
      encryptedFields: {
        fields: [
          {
            path: 'field',
            bsonType: 'string',
            keyId: '9fbdace3-4e48-412d-88df-3807e8009522',
            algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic'
          }
        ]
      }
    },
    {
      name: 'string',
      type: String,
      encryptionType: 'queryableEncryption',
      schemaMap: {
        bsonType: 'object',
        properties: {
          field: {
            encrypt: {
              keyId: '9fbdace3-4e48-412d-88df-3807e8009522',
              bsonType: 'string'
            }
          }
        }
      },
      encryptedFields: {
        fields: [
          {
            path: 'field',
            bsonType: 'string',
            keyId: '9fbdace3-4e48-412d-88df-3807e8009522'
          }
        ]
      }
    },
    {
      name: 'boolean',
      type: Schema.Types.Boolean,
      encryptionType: 'csfle',
      schemaMap: {
        bsonType: 'object',
        properties: {
          field: {
            encrypt: {
              keyId: '9fbdace3-4e48-412d-88df-3807e8009522',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
              bsonType: 'bool'
            }
          }
        }
      },
      encryptedFields: {
        fields: [
          {
            path: 'field',
            bsonType: 'bool',
            keyId: '9fbdace3-4e48-412d-88df-3807e8009522',
            algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic'
          }
        ]
      }
    },
    {
      name: 'boolean',
      encryptionType: 'queryableEncryption',
      type: Schema.Types.Boolean,
      schemaMap: {
        bsonType: 'object',
        properties: {
          field: {
            encrypt: {
              keyId: '9fbdace3-4e48-412d-88df-3807e8009522',
              bsonType: 'bool'
            }
          }
        }
      },
      encryptedFields: {
        fields: [
          {
            path: 'field',
            bsonType: 'bool',
            keyId: '9fbdace3-4e48-412d-88df-3807e8009522'
          }
        ]
      }
    },
    {
      name: 'uuid',
      encryptionType: 'csfle',
      type: Schema.Types.UUID,
      schemaMap: {
        bsonType: 'object',
        properties: {
          field: {
            encrypt: {
              keyId: '9fbdace3-4e48-412d-88df-3807e8009522',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
              bsonType: 'binData'
            }
          }
        }
      },
      encryptedFields: {
        fields: [
          {
            path: 'field',
            bsonType: 'binData',
            keyId: '9fbdace3-4e48-412d-88df-3807e8009522',
            algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic'
          }
        ]
      }
    },
    {
      name: 'uuid',
      encryptionType: 'queryableEncryption',
      type: Schema.Types.UUID,
      schemaMap: {
        bsonType: 'object',
        properties: {
          field: {
            encrypt: {
              keyId: '9fbdace3-4e48-412d-88df-3807e8009522',
              bsonType: 'binData'
            }
          }
        }
      },
      encryptedFields: {
        fields: [
          {
            path: 'field',
            bsonType: 'binData',
            keyId: '9fbdace3-4e48-412d-88df-3807e8009522'
          }
        ]
      }
    },
    {
      name: 'buffer',
      encryptionType: 'csfle',
      type: Schema.Types.Buffer,
      schemaMap: {
        bsonType: 'object',
        properties: {
          field: {
            encrypt: {
              keyId: '9fbdace3-4e48-412d-88df-3807e8009522',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
              bsonType: 'binData'
            }
          }
        }
      },
      encryptedFields: {
        fields: [
          {
            path: 'field',
            bsonType: 'binData',
            keyId: '9fbdace3-4e48-412d-88df-3807e8009522',
            algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic'
          }
        ]
      }
    },
    {
      name: 'buffer',
      encryptionType: 'queryableEncryption',
      type: Schema.Types.Buffer,
      schemaMap: {
        bsonType: 'object',
        properties: {
          field: {
            encrypt: {
              keyId: '9fbdace3-4e48-412d-88df-3807e8009522',
              bsonType: 'binData'
            }
          }
        }
      },
      encryptedFields: {
        fields: [
          {
            path: 'field',
            bsonType: 'binData',
            keyId: '9fbdace3-4e48-412d-88df-3807e8009522'
          }
        ]
      }
    },
    {
      name: 'date',
      encryptionType: 'csfle',
      type: Date,
      schemaMap: {
        bsonType: 'object',
        properties: {
          field: {
            encrypt: {
              keyId: '9fbdace3-4e48-412d-88df-3807e8009522',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
              bsonType: 'date'
            }
          }
        }
      },
      encryptedFields: {
        fields: [
          {
            path: 'field',
            bsonType: 'date',
            keyId: '9fbdace3-4e48-412d-88df-3807e8009522',
            algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic'
          }
        ]
      }
    },
    {
      name: 'date',
      encryptionType: 'queryableEncryption',
      type: Date,
      schemaMap: {
        bsonType: 'object',
        properties: {
          field: {
            encrypt: {
              keyId: '9fbdace3-4e48-412d-88df-3807e8009522',
              bsonType: 'date'
            }
          }
        }
      },
      encryptedFields: {
        fields: [
          {
            path: 'field',
            bsonType: 'date',
            keyId: '9fbdace3-4e48-412d-88df-3807e8009522'
          }
        ]
      }
    },
    {
      name: 'objectid',
      encryptionType: 'csfle',
      type: ObjectId,
      schemaMap: {
        bsonType: 'object',
        properties: {
          field: {
            encrypt: {
              keyId: '9fbdace3-4e48-412d-88df-3807e8009522',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
              bsonType: 'objectId'
            }
          }
        }
      },
      encryptedFields: {
        fields: [
          {
            path: 'field',
            bsonType: 'objectId',
            keyId: '9fbdace3-4e48-412d-88df-3807e8009522',
            algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic'
          }
        ]
      }
    },
    {
      name: 'objectid',
      encryptionType: 'queryableEncryption',
      type: ObjectId,
      schemaMap: {
        bsonType: 'object',
        properties: {
          field: {
            encrypt: {
              keyId: '9fbdace3-4e48-412d-88df-3807e8009522',
              bsonType: 'objectId'
            }
          }
        }
      },
      encryptedFields: {
        fields: [
          {
            path: 'field',
            bsonType: 'objectId',
            keyId: '9fbdace3-4e48-412d-88df-3807e8009522'
          }
        ]
      }
    },
    {
      name: 'bigint',
      encryptionType: 'csfle',
      type: BigInt,
      schemaMap: {
        bsonType: 'object',
        properties: {
          field: {
            encrypt: {
              keyId: '9fbdace3-4e48-412d-88df-3807e8009522',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
              bsonType: 'long'
            }
          }
        }
      },
      encryptedFields: {
        fields: [
          {
            path: 'field',
            bsonType: 'long',
            keyId: '9fbdace3-4e48-412d-88df-3807e8009522',
            algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic'
          }
        ]
      }
    },
    {
      name: 'bigint',
      encryptionType: 'queryableEncryption',
      type: BigInt,
      schemaMap: {
        bsonType: 'object',
        properties: {
          field: {
            encrypt: {
              keyId: '9fbdace3-4e48-412d-88df-3807e8009522',
              bsonType: 'long'
            }
          }
        }
      },
      encryptedFields: {
        fields: [
          {
            path: 'field',
            bsonType: 'long',
            keyId: '9fbdace3-4e48-412d-88df-3807e8009522'
          }
        ]
      }
    },
    {
      name: 'Decimal128',
      encryptionType: 'csfle',
      type: Decimal128,
      schemaMap: {
        bsonType: 'object',
        properties: {
          field: {
            encrypt: {
              keyId: '9fbdace3-4e48-412d-88df-3807e8009522',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
              bsonType: 'decimal'
            }
          }
        }
      },
      encryptedFields: {
        fields: [
          {
            path: 'field',
            bsonType: 'decimal',
            keyId: '9fbdace3-4e48-412d-88df-3807e8009522',
            algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic'
          }
        ]
      }
    },
    {
      name: 'Decimal128',
      encryptionType: 'queryableEncryption',
      type: Decimal128,
      schemaMap: {
        bsonType: 'object',
        properties: {
          field: {
            encrypt: {
              keyId: '9fbdace3-4e48-412d-88df-3807e8009522',
              bsonType: 'decimal'
            }
          }
        }
      },
      encryptedFields: {
        fields: [
          {
            path: 'field',
            bsonType: 'decimal',
            keyId: '9fbdace3-4e48-412d-88df-3807e8009522'
          }
        ]
      }
    },
    {
      name: 'int32',
      encryptionType: 'csfle',
      type: Int32,
      schemaMap: {
        bsonType: 'object',
        properties: {
          field: {
            encrypt: {
              keyId: '9fbdace3-4e48-412d-88df-3807e8009522',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
              bsonType: 'int'
            }
          }
        }
      },
      encryptedFields: {
        fields: [
          {
            path: 'field',
            bsonType: 'int',
            keyId: '9fbdace3-4e48-412d-88df-3807e8009522',
            algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic'
          }
        ]
      }
    },
    {
      name: 'int32',
      encryptionType: 'queryableEncryption',
      type: Int32,
      schemaMap: {
        bsonType: 'object',
        properties: {
          field: {
            encrypt: {
              keyId: '9fbdace3-4e48-412d-88df-3807e8009522',
              bsonType: 'int'
            }
          }
        }
      },
      encryptedFields: {
        fields: [
          {
            path: 'field',
            bsonType: 'int',
            keyId: '9fbdace3-4e48-412d-88df-3807e8009522'
          }
        ]
      }
    },
    {
      name: 'double',
      encryptionType: 'csfle',
      type: Double,
      schemaMap: {
        bsonType: 'object',
        properties: {
          field: {
            encrypt: {
              keyId: '9fbdace3-4e48-412d-88df-3807e8009522',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
              bsonType: 'double'
            }
          }
        }
      },
      encryptedFields: {
        fields: [
          {
            path: 'field',
            bsonType: 'double',
            keyId: '9fbdace3-4e48-412d-88df-3807e8009522',
            algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic'
          }
        ]
      }
    },
    {
      name: 'double',
      encryptionType: 'queryableEncryption',
      type: Double,
      schemaMap: {
        bsonType: 'object',
        properties: {
          field: {
            encrypt: {
              keyId: '9fbdace3-4e48-412d-88df-3807e8009522',
              bsonType: 'double'
            }
          }
        }
      },
      encryptedFields: {
        fields: [
          {
            path: 'field',
            bsonType: 'double',
            keyId: '9fbdace3-4e48-412d-88df-3807e8009522'
          }
        ]
      }
    }
  ];
}
