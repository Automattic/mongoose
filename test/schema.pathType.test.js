'use strict';

const Schema = require('../lib/schema');
const assert = require('assert');

describe('Schema.prototype.pathType()', function() {
  it('gets paths underneath maps', function() {
    const schema = new Schema({
      myMap: {
        type: Map,
        of: String
      }
    });

    assert.equal(schema.pathType('myMap'), 'real');
    assert.equal(schema.pathType('myMap.key'), 'real');
  });

  it('gets paths underneath maps of subdocuments', function() {
    const personSchema = new Schema({ name: String, age: Number });
    const schema = new Schema({
      myMap: {
        type: Map,
        of: personSchema
      }
    });

    assert.equal(schema.pathType('myMap'), 'real');
    assert.equal(schema.pathType('myMap.key'), 'real');
    assert.equal(schema.pathType('myMap.key.name'), 'real');
    assert.equal(schema.pathType('myMap.key.age'), 'real');
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

    assert.equal(schema.pathType('myMap'), 'real');
    assert.equal(schema.pathType('myMap.key'), 'real');
    assert.equal(schema.pathType('myMap.key.key2'), 'real');
  });
});
