
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
  describe('#toString', function(){
    it('does not cause RangeError (gh-1296)', function(done){
      var ASchema = new Schema({
          key: {type: String, required: true}
        , value: {type:String, required: true}
      })

      var BSchema = new Schema({
          contents: [ASchema]
      })

      var M = mongoose.model('A', BSchema);
      var m = new M;
      m.contents.push({ key: 'asdf' });
      m.validate(function (err) {
        assert.doesNotThrow(function(){
          String(err)
        })
        done();
      });
    })
  })
})
