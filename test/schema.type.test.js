
/**
 * Module dependencies.
 */

var mongoose = require('./common').mongoose
  , assert = require('assert')
  , Schema = mongoose.Schema

describe('schematype', function(){
  it('honors the selected option', function(){
    var s = new Schema({ thought: { type: String, select: false }});
    assert.equal(false, s.path('thought').selected);

    var a = new Schema({ thought: { type: String, select: true }});
    assert.equal(true, a.path('thought').selected);
  })
})
