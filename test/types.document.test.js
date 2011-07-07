
/**
 * Module dependencies.
 */

var should = require('should')
  , mongoose = require('./common').mongoose
  , EmbeddedDocument = require('mongoose/types/document')
  , DocumentArray = require('mongoose/types/documentarray')
  , Schema = mongoose.Schema
  , SchemaType = mongoose.SchemaType
  , ValidatorError = SchemaType.ValidatorError
  , ValidationError = mongoose.Document.ValidationError

/**
 * Setup.
 */

function Subdocument () {
  EmbeddedDocument.call(this, {}, new DocumentArray);
};

/**
 * Inherits from EmbeddedDocument.
 */

Subdocument.prototype.__proto__ = EmbeddedDocument.prototype;

/**
 * Set schema.
 */

Subdocument.prototype.schema = new Schema({
    test: { type: String, required: true }
  , work: { type: String, validate: /^good/ }
});

/**
 * Test.
 */

module.exports = {

    'test that save fires errors': function(){
      var a = new Subdocument();
      a.set('test', '');
      a.set('work', 'nope');

      a.save(function(err){
        err.should.be.an.instanceof(ValidationError);
        err.toString().should.eql('ValidationError: Validator "required" failed for path test, Validator failed for path work');
      });
    },

    'test that save fires with null if no errors': function(){
      var a = new Subdocument();
      a.set('test', 'cool');
      a.set('work', 'goods');

      a.save(function(err){
        should.strictEqual(err, null);
      });
    },

    'objects can be passed to #set': function () {
      var a = new Subdocument();
      a.set({ test: 'paradiddle', work: 'good flam'});
      a.test.should.eql('paradiddle');
      a.work.should.eql('good flam');
    },

    'Subdocuments can be passed to #set': function () {
      var a = new Subdocument();
      a.set({ test: 'paradiddle', work: 'good flam'});
      a.test.should.eql('paradiddle');
      a.work.should.eql('good flam');
      var b = new Subdocument();
      b.set(a);
      b.test.should.eql('paradiddle');
      b.work.should.eql('good flam');
    }

};
