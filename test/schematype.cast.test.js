'use strict';

const ObjectId = require('bson').ObjectId;
const Schema = require('../lib/schema');
const assert = require('assert');

describe('SchemaType.cast() (gh-7045)', function() {
  const original = {};

  beforeEach(function() {
    original.objectid = Schema.ObjectId.cast();
    original.boolean = Schema.Types.Boolean.cast();
    original.string = Schema.Types.String.cast();
  });

  afterEach(function() {
    Schema.ObjectId.cast(original.objectid);
    Schema.Types.Boolean.cast(original.boolean);
    Schema.Types.String.cast(original.string);
  });

  it('handles objectid', function() {
    Schema.ObjectId.cast(v => {
      assert.ok(v == null || typeof v === 'string');
      return original.objectid(v);
    });

    const objectid = new Schema.ObjectId('test', { suppressWarning: true });

    let threw = false;
    try {
      objectid.cast(123);
    } catch (error) {
      threw = true;
      assert.equal(error.name, 'CastError');
    }
    assert.ok(threw);
  });

  it('handles disabling casting', function() {
    Schema.ObjectId.cast(false);

    const objectid = new Schema.ObjectId('test', { suppressWarning: true });

    let threw = false;
    try {
      objectid.cast('000000000000000000000000');
    } catch (error) {
      threw = true;
      assert.equal(error.name, 'CastError');
    }
    assert.ok(threw);

    objectid.cast(new ObjectId()); // Should not throw
  });

  it('handles boolean', function() {
    Schema.ObjectId.cast(v => {
      assert.ok(v == null || typeof v === 'string');
      return original.objectid(v);
    });

    const objectid = new Schema.ObjectId('test', { suppressWarning: true });

    let threw = false;
    try {
      objectid.cast(123);
    } catch (error) {
      threw = true;
      assert.equal(error.name, 'CastError');
    }
    assert.ok(threw);
  });

  it('handles disabling casting', function() {
    Schema.Types.Boolean.cast(false);

    const b = new Schema.Types.Boolean();

    let threw = false;
    try {
      b.cast(1);
    } catch (error) {
      threw = true;
      assert.equal(error.name, 'CastError');
    }
    assert.ok(threw);

    b.cast(true); // Should not throw
  });

  describe('string', function() {
    it('supports custom cast functions', function() {
      Schema.Types.String.cast(v => {
        assert.ok(v.length < 10);
        return original.string(v);
      });

      const s = new Schema.Types.String();
      s.cast('short'); // Should not throw

      assert.throws(() => s.cast('wayyyy too long'), /CastError/);
    });

    it('supports disabling casting', function() {
      Schema.Types.String.cast(false);

      const s = new Schema.Types.String();
      s.cast('short'); // Should not throw

      assert.throws(() => s.cast(123), /CastError/);
    });
  });
});