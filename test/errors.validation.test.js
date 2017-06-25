
/**
 * Module dependencies.
 */

var assert = require('power-assert');
var start = require('./common');
var mongoose = start.mongoose;
var Schema = mongoose.Schema;
var SchemaType = mongoose.SchemaType;
var ValidatorError = SchemaType.ValidatorError;
var ValidationError = require('../lib/error/validation');

describe('ValidationError', function() {
  describe('#infiniteRecursion', function() {
    it('does not cause RangeError (gh-1834)', function(done) {
      var SubSchema,
          M,
          model;

      SubSchema = new Schema({
        name: {type: String, required: true},
        contents: [new Schema({
          key: {type: String, required: true},
          value: {type: String, required: true}
        }, {_id: false})]
      });

      M = mongoose.model('SubSchema', SubSchema);

      model = new M({
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
      var MinSchema,
          M,
          model;

      MinSchema = new Schema({
        appointmentDate: {type: Date, min: Date.now}
      });

      M = mongoose.model('MinSchema', MinSchema);

      model = new M({
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
      var MaxSchema,
          M,
          model;

      MaxSchema = new Schema({
        birthdate: {type: Date, max: Date.now}
      });

      M = mongoose.model('MaxSchema', MaxSchema);

      model = new M({
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
      var AddressSchema,
          Address,
          model;

      AddressSchema = new Schema({
        postalCode: {type: String, minlength: 5}
      });

      Address = mongoose.model('MinLengthAddress', AddressSchema);

      model = new Address({
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
      var old = mongoose.Error.messages;
      mongoose.Error.messages = {
        'String': {
          minlength: 'woops!'
        }
      };

      var AddressSchema = new Schema({
        postalCode: { type: String, minlength: 5 }
      });

      var Address = mongoose.model('gh4207', AddressSchema);

      var model = new Address({
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
      var AddressSchema,
          Address,
          model;

      AddressSchema = new Schema({
        postalCode: {type: String, maxlength: 10}
      });

      Address = mongoose.model('MaxLengthAddress', AddressSchema);

      model = new Address({
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
      var ASchema = new Schema({
        key: {type: String, required: true},
        value: {type: String, required: true}
      });

      var BSchema = new Schema({
        contents: [ASchema]
      });

      var M = mongoose.model('A', BSchema);
      var m = new M;
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
      var props = {base: 'eggs', topping: 'bacon'};
      var message = 'I had {BASE} and {TOPPING} for breakfast';

      var result = ValidatorError.prototype.formatMessage(message, props);
      assert.equal(result, 'I had eggs and bacon for breakfast');
      done();
    });
  });

  it('JSON.stringify() with message (gh-5309)', function(done) {
    model.modelName = 'TestClass';
    var err = new ValidationError(new model());

    err.addError('test', { message: 'Fail' });

    var obj = JSON.parse(JSON.stringify(err));
    assert.ok(obj.message.indexOf('TestClass validation failed') !== -1,
      obj.message);
    assert.ok(obj.message.indexOf('test: Fail') !== -1,
      obj.message);

    done();

    function model() {}
  });
});
