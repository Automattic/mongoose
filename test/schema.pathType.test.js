'use strict';

const Schema = require('../lib/schema');
const assert = require('assert');

describe('Schema.prototype.pathType()', function() {
  it('treats inherited properties as adhoc or undefined', function() {
    const schema = new Schema({ name: String });

    assert.equal(schema.pathType('__proto__'), 'adhocOrUndefined');
    assert.equal(schema.pathType('constructor'), 'adhocOrUndefined');
    assert.equal(schema.pathType('prototype'), 'adhocOrUndefined');
    assert.equal(schema.pathType('toString'), 'adhocOrUndefined');
  });

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

  it('treats inherited properties underneath maps of subdocuments as adhoc or undefined', function() {
    const personSchema = new Schema({ name: String, age: Number });
    const schema = new Schema({
      myMap: {
        type: Map,
        of: personSchema
      }
    });

    assert.equal(schema.pathType('myMap.key.__proto__'), 'adhocOrUndefined');
    assert.equal(schema.pathType('myMap.key.constructor'), 'adhocOrUndefined');
    assert.equal(schema.pathType('myMap.key.prototype'), 'adhocOrUndefined');
    assert.equal(schema.pathType('myMap.key.toString'), 'adhocOrUndefined');
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
