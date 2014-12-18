
/**
 * Module dependencies.
 */

var assert = require('assert')
  , start = require('./common')
  , mongoose = start.mongoose
  , EmbeddedDocument = require('../lib/types/embedded')
  , DocumentArray = require('../lib/types/documentarray')
  , Schema = mongoose.Schema
  , SchemaType = mongoose.SchemaType
  , ValidatorError = SchemaType.ValidatorError
  , ValidationError = mongoose.Document.ValidationError

describe('ValidationError', function(){
  describe('#infiniteRecursion', function() {
    it('does not cause RangeError (gh-1834)', function(done) {
      var SubSchema
        , M
        , model;

      SubSchema = new Schema({
        name: {type: String, required: true},
        contents: [new Schema({
          key:   {type: String, required: true},
          value: {type: String, required: true}
        }, {_id: false})]
      });

      M = mongoose.model('SubSchema', SubSchema);

      model = new M({
        name: 'Model',
        contents: [
          { key: 'foo' }
        ]
      });

      model.validate(function(err){
        assert.doesNotThrow(function(){
          JSON.stringify(err);
        });
        done();
      });
    })
  });

  describe('#minDate', function() {
    it('causes a validation error', function(done) {
      var MinSchema
        , M
        , model;

      MinSchema = new Schema({
        appointmentDate : { type: Date, min: Date.now }
      });

      M = mongoose.model('MinSchema', MinSchema);

      model = new M({
        appointmentDate: new Date(Date.now().valueOf() - 10000)
      });

      //should fail validation
      model.validate(function(err){
        assert.notEqual(err, null, 'min Date validation failed.');
        model.appointmentDate = Date.now();

        //should pass validation
        model.validate(function(err) {
          assert.equal(err, null);
          done();  
        });
      });
    });
  });

  describe('#maxDate', function() {
    it('causes a validation error', function(done) {
      var MaxSchema
        , M
        , model;

      MaxSchema = new Schema({
        birthdate : { type: Date, max: Date.now }
      });

      M = mongoose.model('MaxSchema', MaxSchema);

      model = new M({
        birthdate: new Date(Date.now().valueOf() + 2000)
      });

      //should fail validation
      model.validate(function(err){
        assert.notEqual(err, null, 'max Date validation failed');
        model.birthdate = Date.now();

        //should pass validation
        model.validate(function(err) {
          assert.equal(err, null, 'max Date validation failed');
          done();  
        });
      });
    });
  });

  describe('#toString', function() {
    it('does not cause RangeError (gh-1296)', function(done) {
      var ASchema = new Schema({
          key: {type: String, required: true}
        , value: {type:String, required: true}
      });

      var BSchema = new Schema({
          contents: [ASchema]
      });

      var M = mongoose.model('A', BSchema);
      var m = new M;
      m.contents.push({ key: 'asdf' });
      m.validate(function (err) {
        assert.doesNotThrow(function(){
          String(err)
        });
        done();
      });
    })
  });

  describe('formatMessage', function() {
    it('replaces properties in a message', function(done) {
      var props = { base: 'eggs', topping: 'bacon' };
      var message = 'I had {BASE} and {TOPPING} for breakfast';

      var result = ValidatorError.prototype.formatMessage(message, props);
      assert.equal('I had eggs and bacon for breakfast', result);
      done();
    });
  });
});
