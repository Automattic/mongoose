'use strict';

require('./common');

const ObjectId = require('bson').ObjectId;
const Schema = require('../lib/schema');
const assert = require('assert');

describe('SchemaType.cast() (gh-7045)', function() {
  const original = {};

  beforeEach(function() {
    original.objectid = Schema.ObjectId.cast();
    original.boolean = Schema.Types.Boolean.cast();
    original.string = Schema.Types.String.cast();
    original.date = Schema.Types.Date.cast();
    original.decimal128 = Schema.Types.Decimal128.cast();
  });

  afterEach(function() {
    Schema.ObjectId.cast(original.objectid);
    Schema.Types.Boolean.cast(original.boolean);
    Schema.Types.String.cast(original.string);
    Schema.Types.Date.cast(original.date);
    Schema.Types.Decimal128.cast(original.decimal128);
  });

  it('with inheritance', function() {
    class CustomObjectId extends Schema.ObjectId {}

    CustomObjectId.cast(v => {
      assert.ok(v == null || (typeof v === 'string' && v.length === 24));
      return original.objectid(v);
    });

    const objectid = new CustomObjectId('test', { suppressWarning: true });
    const baseObjectId = new Schema.ObjectId('test', { suppressWarning: true });

    let threw = false;
    try {
      objectid.cast('12charstring');
    } catch (error) {
      threw = true;
      assert.equal(error.name, 'CastError');
    }

    assert.doesNotThrow(function() {
      objectid.cast('000000000000000000000000');
      baseObjectId.cast('12charstring');
      baseObjectId.cast('000000000000000000000000');
    });

    assert.ok(threw);
  });

  it('handles objectid', function() {
    Schema.ObjectId.cast(v => {
      assert.ok(v == null || typeof v === 'string');
      return original.objectid(v);
    });

    const objectid = new Schema.ObjectId('test', { suppressWarning: true });

    let threw = false;
    try {
      objectid.cast({ toString: () => '000000000000000000000000' });
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

    objectid.cast(new ObjectId());
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
    assert.doesNotThrow(function() {
      b.cast(true);
    });
  });

  describe('string', function() {
    it('supports custom cast functions', function() {
      Schema.Types.String.cast(v => {
        assert.ok(v.length < 10);
        return original.string(v);
      });

      const s = new Schema.Types.String();
      assert.doesNotThrow(function() {
        s.cast('short');
      });

      assert.throws(() => s.cast('wayyyy too long'), /CastError/);
    });

    it('supports disabling casting', function() {
      Schema.Types.String.cast(false);

      const s = new Schema.Types.String();

      assert.doesNotThrow(function() {
        s.cast('short');
      });

      assert.throws(() => s.cast(123), /CastError/);
    });
  });

  describe('date', function() {
    it('supports custom cast functions', function() {
      Schema.Types.Date.cast(v => {
        assert.ok(v !== '');
        return original.date(v);
      });

      const d = new Schema.Types.Date();
      assert.doesNotThrow(function() {
        d.cast('2018-06-01');
        d.cast(new Date());
      });

      assert.throws(() => d.cast(''), /CastError/);
    });

    it('supports disabling casting', function() {
      Schema.Types.Date.cast(false);

      const d = new Schema.Types.Date();
      assert.doesNotThrow(function() {
        d.cast(new Date());
      });

      assert.throws(() => d.cast('2018-06-01'), /CastError/);
    });
  });

  describe('decimal128', function() {
    it('supports custom cast functions', function() {
      Schema.Types.Decimal128.cast(v => {
        assert.ok(typeof v !== 'number');
        return original.date(v);
      });

      const d = new Schema.Types.Decimal128();
      assert.doesNotThrow(function() {
        d.cast('1000');
      });

      assert.throws(() => d.cast(1000), /CastError/);
    });

    it('supports disabling casting', function() {
      Schema.Types.Decimal128.cast(false);

      const d = new Schema.Types.Decimal128();
      assert.throws(() => d.cast('1000'), /CastError/);
      assert.throws(() => d.cast(1000), /CastError/);

      assert.doesNotThrow(function() {
        d.cast(original.decimal128('1000'));
      });
    });
  });
});
