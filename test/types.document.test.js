
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
});

/**
 * Test.
 */

module.exports = {
  
    'test that save fires errors': function(){
      var a = new Subdocument();
      a.set('test', '');

      a.save(function(err){
        err.should.be.an.instanceof(ValidatorError);
      });
    },

    'test that save fires with null if no errors': function(){
      var a = new Subdocument();
      a.set('test', 'cool');

      a.save(function(err){
        should.strictEqual(err, null);
      });
    }

};
