
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
  describe('uuidv4', function(){
    it('should require valid uuid v4 strings', function(done){
      var db = start()
        , s1 = new Schema({ b: { type: Schema.Types.UUIDv4 }})
        , M1 = db.model('UUIDv4TEST1', s1)
        , s2 = new Schema({ b: { type: Schema.Types.UUIDv4, default: uuid.v4 }})
        , M2 = db.model('UUIDv4TEST2', s2);

      db.close();

      var m1 = new M1({b: '644a4922-4eeb-4a54-b48c-29a6d094316c'});
      assert.strictEqual(true, m1.b === '644a4922-4eeb-4a54-b48c-29a6d094316c');
      assert.strictEqual(true, m1.validateSync() === undefined);
      var m2 = new M2;
      assert.strictEqual(true, m2.validateSync() === undefined);
      var m3 = new M1({b: '123'});
      assert.strictEqual(false, m3.validateSync() === undefined);
      var query = M1.find({b: '644a4922-4eeb-4a54-b48c-29a6d094316c'});
      assert.strictEqual(true, query._conditions.b instanceof mongodb.Binary);
      done();
    });
  });
});
