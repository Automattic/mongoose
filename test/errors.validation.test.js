
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
  describe('#infiniteRecursion', function(){
    it('does not cause RangeError (gh-1834)', function(done){
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

  describe('#toString', function(){
    it('does not cause RangeError (gh-1296)', function(done){
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
  })
});
