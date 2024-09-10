'use strict';

/**
 * Module dependencies.
 */

const start = require('./common');

const mongoose = start.mongoose;

const assert = require('assert');

const Schema = mongoose.Schema;

describe('schematype', function() {
  it('honors the selected option', function() {
    const s = new Schema({ thought: { type: String, select: false } });
    assert.ok(!s.path('thought').selected);

    const a = new Schema({ thought: { type: String, select: true } });
    assert.ok(a.path('thought').selected);
  });

  it('properly handles specifying index in combination with unique or sparse', function() {
    let s = new Schema({ name: { type: String, index: true, unique: true } });
    assert.deepEqual(s.path('name')._index, { unique: true });
    s = new Schema({ name: { type: String, unique: true, index: true } });
    assert.deepEqual(s.path('name')._index, { unique: true });
    s = new Schema({ name: { type: String, index: true, sparse: true } });
    assert.deepEqual(s.path('name')._index, { sparse: true });
    s = new Schema({ name: { type: String, sparse: true, index: true } });
    assert.deepEqual(s.path('name')._index, { sparse: true });
  });

  it('handles index: false with unique, sparse, text set to false (gh-7620)', function() {
    let s = new Schema({ name: { type: String, index: false, unique: false } });
    assert.equal(s.path('name')._index, false);
    s = new Schema({ name: { type: String, unique: false, index: false } });
    assert.equal(s.path('name')._index, false);

    s = new Schema({ name: { type: String, index: false, sparse: false } });
    assert.equal(s.path('name')._index, false);
    s = new Schema({ name: { type: String, sparse: false, index: false } });
    assert.equal(s.path('name')._index, false);

    s = new Schema({ name: { type: String, index: false, text: false } });
    assert.equal(s.path('name')._index, false);
    s = new Schema({ name: { type: String, text: false, index: false } });
    assert.equal(s.path('name')._index, false);
  });

  it('handles unique, sparse, text set to false with no index property (gh-10738)', function() {
    let s = new Schema({ name: { type: String, unique: false } });
    assert.equal(s.path('name')._index, null);

    s = new Schema({ name: { type: String, sparse: false } });
    assert.equal(s.path('name')._index, null);

    s = new Schema({ name: { type: String, text: false } });
    assert.equal(s.path('name')._index, null);
  });

  describe('checkRequired()', function() {
    it('with inherits (gh-7486)', function() {
      const m = new mongoose.Mongoose();

      function CustomNumber(path, options) {
        m.Schema.Types.Number.call(this, path, options);
      }
      CustomNumber.prototype.cast = v => v;
      require('util').inherits(CustomNumber, m.Schema.Types.Number);
      mongoose.Schema.Types.CustomNumber = CustomNumber;

      function CustomString(path, options) {
        m.Schema.Types.String.call(this, path, options);
      }
      CustomString.prototype.cast = v => v;
      require('util').inherits(CustomString, m.Schema.Types.String);
      mongoose.Schema.Types.CustomString = CustomString;

      function CustomObjectId(path, options) {
        m.Schema.Types.ObjectId.call(this, path, options);
      }
      CustomObjectId.prototype.cast = v => v;
      require('util').inherits(CustomObjectId, m.Schema.Types.ObjectId);
      mongoose.Schema.Types.CustomObjectId = CustomObjectId;

      const s = new Schema({
        foo: { type: CustomNumber, required: true },
        bar: { type: CustomString, required: true },
        baz: { type: CustomObjectId, required: true }
      });
      const M = m.model('Test', s);
      const doc = new M({ foo: 1, bar: '2', baz: new mongoose.Types.ObjectId() });
      const err = doc.validateSync();
      assert.ifError(err);
    });
  });

  it('handles function as positional message arg (gh-8360)', function() {
    const schema = Schema({
      name: {
        type: String,
        validate: [() => false, err => `${err.path} is invalid!`]
      }
    });

    const err = schema.path('name').doValidateSync('test');
    assert.equal(err.name, 'ValidatorError');
    assert.equal(err.message, 'name is invalid!');
  });

  describe('clone()', function() {
    let schemaType;
    beforeEach(function() {
      schemaType = Schema({ value: String }).path('value');
    });

    function cloneAndTestDeepEquals() {
      const clone = schemaType.clone();
      assert.deepStrictEqual(clone, schemaType);
    }

    it('clones added default', function() {
      schemaType.default(() => 'abc');
      cloneAndTestDeepEquals();
    });

    it('clones added getters', function() {
      schemaType.get(v => v.trim());
      cloneAndTestDeepEquals();
    });

    it('clones added immutable', function() {
      // Note: cannot compare with deep equals due to the immutable function
      schemaType.immutable(true);
      let clonePath = schemaType.clone();
      assert.equal(schemaType.$immutable, clonePath.$immutable);
      assert.equal(schemaType.setters.length, clonePath.setters.length);

      schemaType.immutable(false);
      clonePath = schemaType.clone();
      assert.equal(schemaType.$immutable, clonePath.$immutable);
      assert.equal(schemaType.setters.length, clonePath.setters.length);
    });

    it('clones added index', function() {
      schemaType.index(true);
      cloneAndTestDeepEquals();
    });

    it('clones added ref', function() {
      schemaType.ref('User');
      cloneAndTestDeepEquals();
    });

    it('clones added required', function() {
      schemaType.required(true);
      cloneAndTestDeepEquals();
    });

    it('clones added select: false', function() {
      schemaType.select(false);
      cloneAndTestDeepEquals();
    });

    it('clones added setter', function() {
      schemaType.set(v => v.trim());
      cloneAndTestDeepEquals();
    });

    it('clones added sparse', function() {
      schemaType.sparse(true);
      cloneAndTestDeepEquals();
    });

    it('clones added sparse (index option)', function() {
      schemaType.sparse(true);
      cloneAndTestDeepEquals();
    });

    it('clones added text (index option)', function() {
      schemaType.text(true);
      cloneAndTestDeepEquals();
    });

    it('clones added unique (index option)', function() {
      schemaType.unique(true);
      cloneAndTestDeepEquals();
    });

    it('clones added validator', function() {
      schemaType.validate(v => v.length > 3);
      cloneAndTestDeepEquals();
    });

    it('clones updated caster', function() {
      schemaType.cast(v => v.length > 3 ? v : v.trim());
      cloneAndTestDeepEquals();
    });
  });

  describe('get()', function() {
    Object.values(mongoose.SchemaTypes).forEach(schemaType => {
      it(`${schemaType.name} has a \`get\` method`, () => {
        assert.strictEqual(typeof schemaType.get, 'function');
      });
    });
  });

  it('merges default validators (gh-14070)', function() {
    class TestSchemaType extends mongoose.SchemaType {}
    TestSchemaType.set('validate', checkIfString);

    const schemaType = new TestSchemaType('test-path', {
      validate: checkIfLength2
    });

    assert.equal(schemaType.validators.length, 2);
    assert.equal(schemaType.validators[0].validator, checkIfString);
    assert.equal(schemaType.validators[1].validator, checkIfLength2);

    let err = schemaType.doValidateSync([1, 2]);
    assert.ok(err);
    assert.equal(err.name, 'ValidatorError');

    err = schemaType.doValidateSync('foo');
    assert.ok(err);
    assert.equal(err.name, 'ValidatorError');

    err = schemaType.doValidateSync('ab');
    assert.ifError(err);

    function checkIfString(v) {
      return typeof v === 'string';
    }
    function checkIfLength2(v) {
      return v.length === 2;
    }
  });

  describe('set()', function() {
    describe('SchemaType.set()', function() {
      it('SchemaType.set, is a function', () => {
        assert.equal(typeof mongoose.SchemaType.set, 'function');
      });
      it('should allow setting values to a given property gh-13510', async function() {
        const m = new mongoose.Mongoose();
        await m.connect(start.uri);
        m.SchemaTypes.Date.setters.push(v => typeof v === 'string' && /^\d{8}$/.test(v) ? new Date(v.slice(0, 4), +v.slice(4, 6) - 1, v.slice(6, 8)) : v);
        const testSchema = new m.Schema({
          myDate: Date
        });
        const Test = m.model('Test', testSchema);
        await Test.deleteMany({});
        const doc = new Test();
        doc.myDate = '20220601';
        await doc.save();
        await m.connections[0].close();
        assert(doc.myDate instanceof Date);
      });

      after(() => {
        mongoose.SchemaTypes.Date.setters = [];
      });
    });

    const typesToTest = Object.values(mongoose.SchemaTypes).
      filter(t => t.name !== 'SchemaSubdocument' && t.name !== 'SchemaDocumentArray');

    typesToTest.forEach((type) => {
      it(type.name + ', when given a default option, set its', () => {
        // Act
        type.set('someRandomOption', true);
        const schema = new mongoose.Schema({ test: type });

        // Assert
        assert.equal(schema.path('test').options.someRandomOption, true);

        delete type.defaultOptions.someRandomOption;
      });
    });
  });
  it('demonstrates the `validateAll()` function (gh-6910)', function() {
    const validateSchema = new Schema({ name: String, password: String });
    validateSchema.path('name').validate({
      validator: function(v) {
        return v.length > 5;
      },
      message: 'name must be longer than 5 characters'
    });
    validateSchema.path('password').validateAll([
      {
        validator: function(v) {
          return this.name !== v;
        },
        message: 'password must not equal name'
      },
      {
        validator: function(v) {
          return v.length > 5;
        },
        message: 'password must be at least six characters'
      }
    ]);
    assert.equal(validateSchema.path('password').validators.length, 2);

    const passwordPath = validateSchema.path('password');
    assert.throws(
      () => { throw passwordPath.doValidateSync('john', { name: 'john' }); },
      /password must not equal name/
    );
    assert.throws(
      () => { throw passwordPath.doValidateSync('short', { name: 'john' }); },
      /password must be at least six characters/
    );
  });

  it('supports getEmbeddedSchemaType() (gh-8389)', function() {
    const schema = new Schema({ name: String, tags: [String] });
    assert.strictEqual(schema.path('name').getEmbeddedSchemaType(), undefined);
    const schemaType = schema.path('tags').getEmbeddedSchemaType();
    assert.ok(schemaType);
    assert.equal(schemaType.instance, 'String');
    assert.equal(schemaType.path, 'tags');
  });
});
