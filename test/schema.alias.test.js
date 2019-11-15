'use strict';

/**
 * Module dependencies.
 */

const start = require('./common');

const assert = require('assert');
const Buffer = require('safe-buffer').Buffer;

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('schema alias option', function() {
  let db;

  before(function() {
    db = start();
  });

  after(function(done) {
    db.close(done);
  });

  it('works with all basic schema types', function(done) {
    const schema = new Schema({
      string:   { type: String, alias: 'StringAlias' },
      number:   { type: Number, alias: 'NumberAlias' },
      date:     { type: Date, alias: 'DateAlias' },
      buffer:   { type: Buffer, alias: 'BufferAlias' },
      boolean:  { type: Boolean, alias: 'BooleanAlias' },
      mixed:    { type: Schema.Types.Mixed, alias: 'MixedAlias' },
      objectId: { type: Schema.Types.ObjectId, alias: 'ObjectIdAlias'},
      array:    { type: [], alias: 'ArrayAlias' }
    });

    const S = db.model('AliasSchemaType', schema);
    S.create({
      string: 'hello',
      number: 1,
      date: new Date(),
      buffer: Buffer.from('World'),
      boolean: false,
      mixed: [1, [], 'three', { four: 5 }],
      objectId: new mongoose.Types.ObjectId(),
      array: ['a', 'b', 'c', 'd']
    }, function(err, s) {
      assert.ifError(err);

      // Comparing with aliases
      assert.equal(s.string, s.StringAlias);
      assert.equal(s.number, s.NumberAlias);
      assert.equal(s.date, s.DateAlias);
      assert.equal(s.buffer, s.BufferAlias);
      assert.equal(s.boolean, s.BooleanAlias);
      assert.equal(s.mixed, s.MixedAlias);
      assert.equal(s.objectId, s.ObjectIdAlias);
      assert.equal(s.array, s.ArrayAlias);
      done();
    });
  });

  it('works with nested schema types', function(done) {
    const schema = new Schema({
      nested: {
        string:   { type: String, alias: 'StringAlias' },
        number:   { type: Number, alias: 'NumberAlias' },
        date:     { type: Date, alias: 'DateAlias' },
        buffer:   { type: Buffer, alias: 'BufferAlias' },
        boolean:  { type: Boolean, alias: 'BooleanAlias' },
        mixed:    { type: Schema.Types.Mixed, alias: 'MixedAlias' },
        objectId: { type: Schema.Types.ObjectId, alias: 'ObjectIdAlias'},
        array:    { type: [], alias: 'ArrayAlias' }
      }
    });

    const S = db.model('AliasNestedSchemaType', schema);
    S.create({
      nested: {
        string: 'hello',
        number: 1,
        date: new Date(),
        buffer: Buffer.from('World'),
        boolean: false,
        mixed: [1, [], 'three', { four: 5 }],
        objectId: new mongoose.Types.ObjectId(),
        array: ['a', 'b', 'c', 'd']
      }
    }, function(err, s) {
      assert.ifError(err);

      // Comparing with aliases
      assert.equal(s.nested.string, s.StringAlias);
      assert.equal(s.nested.number, s.NumberAlias);
      assert.equal(s.nested.date, s.DateAlias);
      assert.equal(s.nested.buffer, s.BufferAlias);
      assert.equal(s.nested.boolean, s.BooleanAlias);
      assert.equal(s.nested.mixed, s.MixedAlias);
      assert.equal(s.nested.objectId, s.ObjectIdAlias);
      assert.equal(s.nested.array, s.ArrayAlias);
      done();
    });
  });

  it('throws when alias option is invalid', function() {
    assert.throws(function() {
      new Schema({
        foo: { type: String, alias: 456 }
      });
    });
  });

  it('with add() (gh-6593)', function() {
    const s = new Schema({ name: { type: String, alias: 'test1' } });

    assert.deepEqual(Object.keys(s.aliases), ['test1']);

    s.add({ name2: { type: String, alias: 'test2' } });

    assert.deepEqual(Object.keys(s.aliases), ['test1', 'test2']);
  });

  it('nested aliases (gh-6671)', function(done) {
    const childSchema = new Schema({
      n: {
        type: String,
        alias: 'name'
      }
    }, { _id: false });

    const parentSchema = new Schema({
      // If in a child schema, alias doesn't need to include the full nested path
      c: childSchema,
      name: {
        f: {
          type: String,
          // Alias needs to include the full nested path if declared inline
          alias: 'name.first'
        }
      }
    });
    // acquit:ignore:start
    const Parent = mongoose.model('gh6671', parentSchema);
    const doc = new Parent({
      c: {
        name: 'foo'
      },
      name: {
        first: 'bar'
      }
    });
    assert.deepEqual(doc.toObject().c, { n: 'foo' });
    assert.deepEqual(doc.toObject().name, { f: 'bar' });
    done();
    // acquit:ignore:end
  });
});
