
/**
 * Module dependencies.
 */

var start = require('./common')
  , mongoose = start.mongoose
  , assert = require('assert')
  , Schema = mongoose.Schema
  , uuid = require('node-uuid')
  , mongodb = require('mongodb');

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
      assert.strictEqual(true, m1.b === '09190f70-3d30-11e5-8814-0f4df9a59c41');
      assert.strictEqual(true, m1.validateSync() === undefined);
      var m2 = new M2;
      assert.strictEqual(true, m2.validateSync() === undefined);
      var m3 = new M1({b: '123'});
      assert.strictEqual(false, m3.validateSync() === undefined);
      var query = M1.find({b: '09190f70-3d30-11e5-8814-0f4df9a59c41'});
      assert.strictEqual(true, query._conditions.b instanceof mongodb.Binary);
      done();
    });
  });
});
