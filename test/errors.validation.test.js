
/**
 * Module dependencies.
 */

'use strict';

const start = require('./common');

const ValidationError = require('../lib/error/validation');
const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const SchemaType = mongoose.SchemaType;
const ValidatorError = SchemaType.ValidatorError;

describe('ValidationError', function() {
  describe('#infiniteRecursion', function() {
    it('does not cause RangeError (gh-1834)', async function() {
      const SubSchema = new Schema({
        name: { type: String, required: true },
        contents: [
          new Schema(
            {
              key: { type: String, required: true },
              value: { type: String, required: true }
            },
            { _id: false }
          )
        ]
      });

      const M = mongoose.model('SubSchema', SubSchema);

      const model = new M({
        name: 'Model',
        contents: [
          { key: 'foo' }
        ]
      });

      const err = await model.validate().then(() => null, err => err);

      assert.doesNotThrow(function() {
        JSON.stringify(err);
      });
    });
  });

  describe('#minDate', function() {
    it('causes a validation error', async function() {
      const MinSchema = new Schema({
        appointmentDate: { type: Date, min: Date.now }
      });

      const M = mongoose.model('MinSchema', MinSchema);

      const model = new M({
        appointmentDate: new Date(Date.now().valueOf() - 10000)
      });

      // should fail validation
      const err = await model.validate().then(() => null, err => err);

      assert.notEqual(err, null, 'min Date validation failed.');
      assert.ok(err.message.startsWith('MinSchema validation failed'));
      model.appointmentDate = new Date(Date.now().valueOf() + 10000);

      // should pass validation
      await model.validate();
    });
  });

  describe('#maxDate', function() {
    it('causes a validation error', async function() {
      const MaxSchema = new Schema({
        birthdate: { type: Date, max: Date.now }
      });

      const M = mongoose.model('MaxSchema', MaxSchema);

      const model = new M({
        birthdate: new Date(Date.now().valueOf() + 2000)
      });

      // should fail validation
      const err = await model.validate().then(() => null, err => err);

      assert.notEqual(err, null, 'max Date validation failed');
      assert.ok(err.message.startsWith('MaxSchema validation failed'));
      model.birthdate = Date.now();

      // should pass validation
      await model.validate();
    });
  });

  describe('#minLength', function() {
    it('causes a validation error', async function() {
      const AddressSchema = new Schema({
        postalCode: { type: String, minlength: 5 },
        zipCode: { type: String, minLength: 5 }
      });

      const Address = mongoose.model('MinLengthAddress', AddressSchema);

      const model = new Address({
        postalCode: '9512',
        zipCode: '9512'
      });

      // should fail validation
      const err = await model.validate().then(() => null, err => err);

      assert.notEqual(err, null, 'String minLength validation failed.');
      assert.ok(err.message.startsWith('MinLengthAddress validation failed'));
      model.postalCode = '95125';
      model.zipCode = '95125';

      // should pass validation
      await model.validate();
    });

    it('with correct error message (gh-4207)', async function() {
      const old = mongoose.Error.messages;
      mongoose.Error.messages = {
        String: {
          minlength: 'woops!'
        }
      };

      const AddressSchema = new Schema({
        postalCode: { type: String, minlength: 5 },
        zipCode: { type: String, minLength: 5 }
      });

      const Address = mongoose.model('gh4207', AddressSchema);

      const model = new Address({
        postalCode: '9512',
        zipCode: '9512'
      });

      // should fail validation
      const err = await model.validate().then(() => null, err => err);

      assert.equal(err.errors['postalCode'].message, 'woops!');
      assert.ok(err.message.startsWith('gh4207 validation failed'));
      mongoose.Error.messages = old;
    });
  });

  describe('#maxLength', function() {
    it('causes a validation error', async function() {
      const AddressSchema = new Schema({
        postalCode: { type: String, maxlength: 10 },
        zipCode: { type: String, maxLength: 10 }
      });

      const Address = mongoose.model('MaxLengthAddress', AddressSchema);

      const model = new Address({
        postalCode: '95125012345',
        zipCode: '95125012345'
      });

      // should fail validation
      const err = await model.validate().then(() => null, err => err);

      assert.notEqual(err, null, 'String maxLength validation failed.');
      assert.ok(err.message.startsWith('MaxLengthAddress validation failed'));
      model.postalCode = '95125';
      model.zipCode = '95125';

      // should pass validation
      await model.validate();
    });
  });

  describe('#toString', function() {
    it('does not cause RangeError (gh-1296)', async function() {
      const ASchema = new Schema({
        key: { type: String, required: true },
        value: { type: String, required: true }
      });

      const BSchema = new Schema({
        contents: [ASchema]
      });

      const M = mongoose.model('A', BSchema);
      const m = new M();
      m.contents.push({ key: 'asdf' });
      const err = await m.validate().then(() => null, err => err);

      assert.doesNotThrow(function() {
        String(err);
      });
    });
  });

  describe('formatMessage', function() {
    it('replaces properties in a message', function() {
      const props = { base: 'eggs', topping: 'bacon' };
      const message = 'I had {BASE} and {TOPPING} for breakfast';

      const result = ValidatorError.prototype.formatMessage(message, props);
      assert.equal(result, 'I had eggs and bacon for breakfast');
    });
  });

  it('JSON.stringify() with message (gh-5309) (gh-9296)', function() {
    model.modelName = 'TestClass';
    const err = new ValidationError(new model());

    err.addError('test', new ValidatorError({ message: 'Fail' }));

    const obj = JSON.parse(JSON.stringify(err));
    assert.ok(obj.message.indexOf('TestClass validation failed') !== -1,
      obj.message);
    assert.ok(obj.message.indexOf('test: Fail') !== -1,
      obj.message);
    assert.ok(obj.errors['test'].message);

    function model() {}
  });

  it('default error message', function() {
    const err = new ValidationError();

    assert.equal(err.message, 'Validation failed');
  });

  describe('when user code defines a r/o Error#toJSON', function() {
    it('should not fail', function(done) {
      if (typeof Deno !== 'undefined') {
        // Deno currently errors with:
        // could not find npm package for 'file:///path/to/mongoose/test/isolated/project-has-error.toJSON.js'
        return this.skip();
      }
      this.timeout(10000);

      const err = [];
      const child = require('child_process')
        .fork('./test/isolated/project-has-error.toJSON.js', ['--no-warnings'], { silent: true });

      child.stderr.on('data', function(buf) { err.push(buf); });
      child.on('exit', function(code) {
        const stderr = err.filter(line => !line.includes('Warning: ')).join('');
        assert.equal(stderr, '');
        assert.equal(code, 0);
        done();
      });
    });
  });
  it('should have error name in Cast error gh-10166', async function() {
    const zetaSchema = new Schema({
      text: { type: String, required: [true, 'Text is required'] },
      number: { type: Number, required: [true, 'Number is required'] }
    });
    const Zeta = mongoose.model('Zeta', zetaSchema);
    const entry = new Zeta({ text: false, number: 'fsfsf' });

    const error = await entry.validate().then(() => null, err => err);

    assert.ok(JSON.parse(JSON.stringify(error.errors.number.message)));
    assert.ok(JSON.parse(JSON.stringify(error.errors.number.name)));
  });
});
