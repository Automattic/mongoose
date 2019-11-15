
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
    it('does not cause RangeError (gh-1834)', function(done) {
      const SubSchema = new Schema({
        name: {type: String, required: true},
        contents: [new Schema({
          key: {type: String, required: true},
          value: {type: String, required: true}
        }, {_id: false})]
      });

      const M = mongoose.model('SubSchema', SubSchema);

      const model = new M({
        name: 'Model',
        contents: [
          {key: 'foo'}
        ]
      });

      model.validate(function(err) {
        assert.doesNotThrow(function() {
          JSON.stringify(err);
        });
        done();
      });
    });
  });

  describe('#minDate', function() {
    it('causes a validation error', function(done) {
      const MinSchema = new Schema({
        appointmentDate: {type: Date, min: Date.now}
      });

      const M = mongoose.model('MinSchema', MinSchema);

      const model = new M({
        appointmentDate: new Date(Date.now().valueOf() - 10000)
      });

      // should fail validation
      model.validate(function(err) {
        assert.notEqual(err, null, 'min Date validation failed.');
        model.appointmentDate = new Date(Date.now().valueOf() + 10000);

        // should pass validation
        model.validate(function(err) {
          assert.equal(err, null);
          done();
        });
      });
    });
  });

  describe('#maxDate', function() {
    it('causes a validation error', function(done) {
      const MaxSchema = new Schema({
        birthdate: {type: Date, max: Date.now}
      });

      const M = mongoose.model('MaxSchema', MaxSchema);

      const model = new M({
        birthdate: new Date(Date.now().valueOf() + 2000)
      });

      // should fail validation
      model.validate(function(err) {
        assert.notEqual(err, null, 'max Date validation failed');
        model.birthdate = Date.now();

        // should pass validation
        model.validate(function(err) {
          assert.equal(err, null, 'max Date validation failed');
          done();
        });
      });
    });
  });

  describe('#minlength', function() {
    it('causes a validation error', function(done) {
      const AddressSchema = new Schema({
        postalCode: {type: String, minlength: 5}
      });

      const Address = mongoose.model('MinLengthAddress', AddressSchema);

      const model = new Address({
        postalCode: '9512'
      });

      // should fail validation
      model.validate(function(err) {
        assert.notEqual(err, null, 'String minlegth validation failed.');
        model.postalCode = '95125';

        // should pass validation
        model.validate(function(err) {
          assert.equal(err, null);
          done();
        });
      });
    });

    it('with correct error message (gh-4207)', function(done) {
      const old = mongoose.Error.messages;
      mongoose.Error.messages = {
        'String': {
          minlength: 'woops!'
        }
      };

      const AddressSchema = new Schema({
        postalCode: { type: String, minlength: 5 }
      });

      const Address = mongoose.model('gh4207', AddressSchema);

      const model = new Address({
        postalCode: '9512'
      });

      // should fail validation
      model.validate(function(err) {
        assert.equal(err.errors['postalCode'].message, 'woops!');
        mongoose.Error.messages = old;
        done();
      });
    });
  });

  describe('#maxlength', function() {
    it('causes a validation error', function(done) {
      const AddressSchema = new Schema({
        postalCode: {type: String, maxlength: 10}
      });

      const Address = mongoose.model('MaxLengthAddress', AddressSchema);

      const model = new Address({
        postalCode: '95125012345'
      });

      // should fail validation
      model.validate(function(err) {
        assert.notEqual(err, null, 'String maxlegth validation failed.');
        model.postalCode = '95125';

        // should pass validation
        model.validate(function(err) {
          assert.equal(err, null);
          done();
        });
      });
    });
  });

  describe('#toString', function() {
    it('does not cause RangeError (gh-1296)', function(done) {
      const ASchema = new Schema({
        key: {type: String, required: true},
        value: {type: String, required: true}
      });

      const BSchema = new Schema({
        contents: [ASchema]
      });

      const M = mongoose.model('A', BSchema);
      const m = new M;
      m.contents.push({key: 'asdf'});
      m.validate(function(err) {
        assert.doesNotThrow(function() {
          String(err);
        });
        done();
      });
    });
  });

  describe('formatMessage', function() {
    it('replaces properties in a message', function(done) {
      const props = {base: 'eggs', topping: 'bacon'};
      const message = 'I had {BASE} and {TOPPING} for breakfast';

      const result = ValidatorError.prototype.formatMessage(message, props);
      assert.equal(result, 'I had eggs and bacon for breakfast');
      done();
    });
  });

  it('JSON.stringify() with message (gh-5309)', function(done) {
    model.modelName = 'TestClass';
    const err = new ValidationError(new model());

    err.addError('test', { message: 'Fail' });

    const obj = JSON.parse(JSON.stringify(err));
    assert.ok(obj.message.indexOf('TestClass validation failed') !== -1,
      obj.message);
    assert.ok(obj.message.indexOf('test: Fail') !== -1,
      obj.message);

    done();

    function model() {}
  });
});
