'use strict';

const Schema = require('../lib/schema');
const assert = require('assert');

describe('Schema.prototype.path()', function() {
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
