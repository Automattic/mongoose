
/**
 * Module dependencies.
 */

var start = require('./common')
  , mongoose = start.mongoose
  , assert = require('assert')
  , Schema = mongoose.Schema

describe('schematype', function(){
  describe('boolean', function(){
    it('null default is permitted (gh-523)', function(){
      var db = start()
        , s1 = new Schema({ b: { type: Boolean, default: null }})
        , M1 = db.model('NullDateDefaultIsAllowed1', s1)
        , s2 = new Schema({ b: { type: Boolean, default: false }})
        , M2 = db.model('NullDateDefaultIsAllowed2', s2)
        , s3 = new Schema({ b: { type: Boolean, default: true }})
        , M3 = db.model('NullDateDefaultIsAllowed3', s3)

      db.close();

      var m1 = new M1;
      assert.strictEqual(null, m1.b);
      var m2 = new M2;
      assert.strictEqual(false, m2.b);
      var m3 = new M3;
      assert.strictEqual(true, m3.b);
    })
  })
})
