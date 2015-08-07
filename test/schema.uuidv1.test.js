
/**
 * Module dependencies.
 */

var start = require('./common')
  , mongoose = start.mongoose
  , assert = require('assert')
  , Schema = mongoose.Schema
  , uuid = require('node-uuid');

var UUID_FORMAT = /[0-9a-f]{8}-[0-9a-f]{4}-1[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

describe('schematype', function(){
  describe('uuidv1', function(){
    it('should require valid uuid v1 strings', function(done){
      var db = start()
        , s1 = new Schema({ b: { type: Schema.Types.UUIDv1 }})
        , M1 = db.model('UUIDv4TEST1', s1)
        , s2 = new Schema({ b: { type: Schema.Types.UUIDv1, default: uuid.v1 }})
        , M2 = db.model('UUIDv4TEST2', s2);

      db.close();

      var m1 = new M1({b: '09190f70-3d30-11e5-8814-0f4df9a59c41'});
      assert.strictEqual(true, UUID_FORMAT.test(m1.b));
      assert.strictEqual(true, m1.b === '09190f70-3d30-11e5-8814-0f4df9a59c41');
      var m2 = new M2;
      assert.strictEqual(true, UUID_FORMAT.test(m2.b));

      done();
    });
  });
});
