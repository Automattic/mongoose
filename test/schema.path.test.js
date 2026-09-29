'use strict';

const Schema = require('../lib/schema');
const assert = require('assert');

describe('Schema.prototype.path()', function() {
  it('does not return inherited properties as schema paths', function() {
    const schema = new Schema({ name: String });

    assert.strictEqual(schema.path('__proto__'), undefined);
    assert.strictEqual(schema.path('constructor'), undefined);
    assert.strictEqual(schema.path('prototype'), undefined);
    assert.strictEqual(schema.path('toString'), undefined);
  });

  it('throws when setting paths under special properties', function() {
    const schema = new Schema({}, { suppressReservedKeysWarning: true });

    assert.throws(
      () => schema.path('__proto__', String),
      /Cannot set special property `__proto__` on a schema/
    );
    assert.throws(
      () => schema.path('__proto__.nested', String),
      /Cannot set special property `__proto__` on a schema/
    );
    assert.throws(
      () => schema.path('nested.__proto__', String),
      /Cannot set special property `__proto__` on a schema/
    );
    assert.throws(
      () => schema.path('constructor', String),
      /Cannot set special property `constructor` on a schema/
    );
    assert.throws(
      () => schema.path('constructor.nested', String),
      /Cannot set special property `constructor` on a schema/
    );
    assert.throws(
      () => schema.path('nested.constructor', String),
      /Cannot set special property `constructor` on a schema/
    );
    assert.throws(
      () => schema.path('prototype', String),
      /Cannot set special property `prototype` on a schema/
    );
    assert.throws(
      () => schema.path('prototype.nested', String),
      /Cannot set special property `prototype` on a schema/
    );
    assert.throws(
      () => schema.path('nested.prototype', String),
      /Cannot set special property `prototype` on a schema/
    );
  });

  it('gets paths underneath maps', function() {
    const schema = new Schema({
      myMap: {
        type: Map,
        of: String
      }
    });

    assert.equal(schema.path('myMap').$__schemaType.instance, 'String');
    assert.equal(schema.path('myMap.$*').instance, 'String');
  });

  it('gets paths underneath maps of subdocuments', function() {
    const personSchema = new Schema({ name: String, age: Number });
    const schema = new Schema({
      myMap: {
        type: Map,
        of: personSchema
      }
    });

    assert.equal(schema.path('myMap').$__schemaType.schema.path('name').instance, 'String');
    assert.equal(schema.path('myMap').$__schemaType.schema.path('age').instance, 'Number');

    assert.equal(schema.path('myMap.key.name').instance, 'String');
    assert.equal(schema.path('myMap.key.age').instance, 'Number');
  });

  it('does not return inherited properties underneath maps of subdocuments', function() {
    const personSchema = new Schema({ name: String, age: Number });
    const schema = new Schema({
      myMap: {
        type: Map,
        of: personSchema
      }
    });

    assert.strictEqual(schema.path('myMap.key.__proto__'), undefined);
    assert.strictEqual(schema.path('myMap.key.constructor'), undefined);
    assert.strictEqual(schema.path('myMap.key.prototype'), undefined);
    assert.strictEqual(schema.path('myMap.key.toString'), undefined);
  });

  it('gets paths underneath maps of maps', function() {
    const schema = new Schema({
      myMap: {
        type: Map,
        of: {
          type: Map,
          of: String
        }
      }
    });

    assert.equal(schema.path('myMap').$__schemaType.instance, 'Map');
    assert.equal(schema.path('myMap.key').instance, 'Map');
    assert.equal(schema.path('myMap.key.key2').instance, 'String');
    assert.ok(!schema.path('myMap.key.key2.key3'));
  });

  it('gets paths underneath maps of maps of subdocs', function() {
    const schema = new Schema({
      myMap: {
        type: Map,
        of: {
          type: Map,
          of: new Schema({
            name: String
          })
        }
      }
    });

    assert.equal(schema.path('myMap').$__schemaType.instance, 'Map');
    assert.equal(schema.path('myMap.key').instance, 'Map');
    assert.equal(schema.path('myMap.key.key2.name').instance, 'String');
    assert.ok(!schema.path('myMap.key.key2.key3'));
  });
});
