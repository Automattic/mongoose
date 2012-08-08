
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

  it('properly handles specifying index in combination with unique or sparse', function(){
    var s = new Schema({ name: { type: String, index: true, unique: true }});
    assert.deepEqual(s.path('name')._index, { unique: true });
    var s = new Schema({ name: { type: String, unique: true, index: true }});
    assert.deepEqual(s.path('name')._index, { unique: true });
    var s = new Schema({ name: { type: String, index: true, sparse: true }});
    assert.deepEqual(s.path('name')._index, { sparse: true });
    var s = new Schema({ name: { type: String, sparse: true, index: true }});
    assert.deepEqual(s.path('name')._index, { sparse: true });
  })
})
