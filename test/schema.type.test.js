'use strict';

/**
 * Module dependencies.
 */

const mongoose = require('./common').mongoose;

const assert = require('assert');

const Schema = mongoose.Schema;

describe('schematype', function() {
  it('honors the selected option', function(done) {
    const s = new Schema({thought: {type: String, select: false}});
    assert.ok(!s.path('thought').selected);

    const a = new Schema({thought: {type: String, select: true}});
    assert.ok(a.path('thought').selected);
    done();
  });

  it('properly handles specifying index in combination with unique or sparse', function(done) {
    let s = new Schema({name: {type: String, index: true, unique: true}});
    assert.deepEqual(s.path('name')._index, {unique: true});
    s = new Schema({name: {type: String, unique: true, index: true}});
    assert.deepEqual(s.path('name')._index, {unique: true});
    s = new Schema({name: {type: String, index: true, sparse: true}});
    assert.deepEqual(s.path('name')._index, {sparse: true});
    s = new Schema({name: {type: String, sparse: true, index: true}});
    assert.deepEqual(s.path('name')._index, {sparse: true});
    done();
  });

  it('handles index: false with unique, sparse, text set to false (gh-7620)', function(done) {
    let s = new Schema({name: {type: String, index: false, unique: false}});
    assert.equal(s.path('name')._index, false);
    s = new Schema({name: {type: String, unique: false, index: false}});
    assert.equal(s.path('name')._index, false);

    s = new Schema({name: {type: String, index: false, sparse: false}});
    assert.equal(s.path('name')._index, false);
    s = new Schema({name: {type: String, sparse: false, index: false}});
    assert.equal(s.path('name')._index, false);

    s = new Schema({name: {type: String, index: false, text: false}});
    assert.equal(s.path('name')._index, false);
    s = new Schema({name: {type: String, text: false, index: false}});
    assert.equal(s.path('name')._index, false);

    done();
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

  describe('set()', function() {
    describe('SchemaType.set()', function() {
      it('SchemaType.set, is a function', () => {
        assert.equal(typeof mongoose.SchemaType.set, 'function');
      });
    });

    const mongooseInstance = new mongoose.Mongoose();

    [
      mongooseInstance.SchemaTypes.String,
      mongooseInstance.SchemaTypes.Number,
      mongooseInstance.SchemaTypes.Boolean,
      mongooseInstance.SchemaTypes.Buffer,
      mongooseInstance.SchemaTypes.Date,
      mongooseInstance.SchemaTypes.ObjectId,
      mongooseInstance.SchemaTypes.Mixed,
      mongooseInstance.SchemaTypes.Decimal128,
      mongooseInstance.SchemaTypes.Map
    ].forEach((type) => {
      it(type.name + ', when given a default option, set its', () => {
        // Act
        type.set('required', true);
        const schema = new mongooseInstance.Schema({test: type});

        // Assert
        assert.equal(schema.path('test').options.required, true);
      });
    });
  });
});
