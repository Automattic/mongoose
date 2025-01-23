
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
 * @returns
 */
function schemaHasEncryptedProperty(schema, path) {
  path = [path].flat();
  path = path.join('.');

  return path in schema.encryptedFields;
}

const KEY_ID = new UUID();
const algorithm = 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic';

describe('encrypted schema declaration', function() {
  describe('Tests that fields of valid schema types can be declared as encrypted schemas', function() {
    const basicSchemaTypes = [
      { type: String, name: 'string' },
      { type: Schema.Types.Boolean, name: 'boolean' },
      { type: Schema.Types.Buffer, name: 'buffer' },
      { type: Date, name: 'date' },
      { type: ObjectId, name: 'objectid' },
      { type: BigInt, name: 'bigint' },
      { type: Decimal128, name: 'Decimal128' },
      { type: Int32, name: 'int32' },
      { type: Double, name: 'double' }
    ];

    for (const { type, name } of basicSchemaTypes) {
      describe(`When a schema is instantiated with an encrypted field of type ${name}`, function() {
        let schema;
        beforeEach(function() {
          schema = new Schema({
            field: {
              type, encrypt: { keyId: KEY_ID, algorithm }
            }
          }, {
            encryptionType: 'csfle'
          });
        });

        it(`Then the schema has an encrypted property of type ${name}`, function() {
          assert.ok(schemaHasEncryptedProperty(schema, 'field'));
        });
      });
    }

    describe('when a schema is instantiated with a nested encrypted schema', function() {
      let schema;
      beforeEach(function() {
        const encryptedSchema = new Schema({
          encrypted: {
            type: String, encrypt: { keyId: KEY_ID, algorithm }
          }
        }, { encryptionType: 'csfle' });
        schema = new Schema({
          field: encryptedSchema
        }, { encryptionType: 'csfle' });
      });


      it('then the schema has a nested property that is encrypted', function() {
        assert.ok(schemaHasEncryptedProperty(schema, ['field', 'encrypted']));
      });
    });

    describe('when a schema is instantiated with a nested schema object', function() {
      let schema;
      beforeEach(function() {
        schema = new Schema({
          field: {
            encrypted: {
              type: String, encrypt: { keyId: KEY_ID, algorithm }
            }
          }
        }, { encryptionType: 'csfle' });
      });

      it('then the schema has a nested property that is encrypted', function() {
        assert.ok(schemaHasEncryptedProperty(schema, ['field', 'encrypted']));
      });
    });

    describe('when a schema is instantiated as an Array', function() {
      let schema;
      beforeEach(function() {
        schema = new Schema({
          encrypted: {
            type: [Number],
            encrypt: { keyId: KEY_ID, algorithm }
          }
        }, { encryptionType: 'csfle' });
      });

      it('then the schema has a nested property that is encrypted', function() {
        assert.ok(schemaHasEncryptedProperty(schema, 'encrypted'));
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
        }, /unable to determine bson type for field `field`/);
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
        }, /unable to determine bson type for field `field`/);
      });
    });

    describe('When a schema is instantiated with a custom schema type plugin', function() {
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
        }, /unable to determine bson type for field `field`/);
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

      describe('When omit() is used with some all the encrypted fields', function() {
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
