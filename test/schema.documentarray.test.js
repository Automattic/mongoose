
/**
 * Module dependencies.
 */

var start = require('./common')
  , mongoose = start.mongoose
  , assert = require('assert')
  , random = require('../lib/utils').random
  , Schema = mongoose.Schema

/**
 * Test.
 */

describe('schema.documentarray', function(){
  it('defaults should be preserved', function(){
    var child = new Schema({ title: String })

    var schema1 = new Schema({ x: { type: [child], default: [{ title: 'Prometheus'}] }});
    var schema2 = new Schema({ x: { type: [child], default: { title: 'Prometheus'} }});
    var schema3 = new Schema({ x: { type: [child], default: function(){return [{ title: 'Prometheus'}]} }});

    var M = mongoose.model('DefaultDocArrays1', schema1);
    var N = mongoose.model('DefaultDocArrays2', schema2);
    var O = mongoose.model('DefaultDocArrays3', schema3);

    [M,N,O].forEach(function (M) {
      var m = new M;
      assert.ok(Array.isArray(m.x));
      assert.equal(1, m.x.length);
      assert.equal('Prometheus', m.x[0].title);
    });
  })
})
