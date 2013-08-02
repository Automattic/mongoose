
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
  it('defaults should be preserved', function(done){
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
    done();
  });

  it('should be able to cope with new documentarray-data in a changed schema', function (done) {
    var db = start();
    var schema = new Schema({
      foobars: [{
        foo: { type: String, required: true },
        bar: { type: String }
      }]
    });
    var FoobarsContainer = db.model('FoobarsContainer', schema);
    var doc = new FoobarsContainer({ foobars: [{foo: 'foo1'}, {foo: 'foo2'}]});
    doc.save(function (err) {
      assert.ifError(err);

      //now, consider over time the schema changes due to application changes...
      db = start();
      schema =  new Schema({
        foobars: [{
          //foo is _NO_LONGER_ required
          foo: { type: String },
          //bar _IS_ required
          bar: { type: String, required: true }
        }]
      });
      FoobarsContainer = db.model('FoobarsContainer', schema);
      FoobarsContainer.findOne({}, function (err, oldDoc) {
        assert.ifError(err);

        //the oldDoc is not valid in the new schema, but we overwrite the invalid data with some new, valid data
        oldDoc.set({
          foorbars: [{bar: 'bar1'}]
        });

        oldDoc.save(function (err) {
          //should not throw ValidationError: the new data should be valid?
          assert.ifError(err);
          done();
        });
      });
    });
  });
});
