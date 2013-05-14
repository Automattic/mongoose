

/**
 * Test dependencies.
 */

var start = require('./common')
  , assert = require('assert')
  , mongoose = start.mongoose
  , DivergentArrayError = mongoose.Error.DivergentArrayError
  , utils = require('../lib/utils')
  , random = utils.random
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId

var schema = new Schema({
    a: String
  , b: {
        c: Number
      , d: [{ e: String }]
    }
  , f: { g: Date }
  , h: {}
});

describe('is compatible with object created using Object.create(null) (gh-1484)', function(){
  var db;
  var M;

  before(function(){
    db = start();
    M = db.model('1484', schema);
  })

  after(function(done){
    db.close(done);
  })

  it('during construction', function(done){
    assert.doesNotThrow(function () {
      new M(Object.create(null));
    });

    assert.doesNotThrow(function () {
      var o = Object.create(null);
      o.b = Object.create(null);
      new M(o);
    });

    assert.doesNotThrow(function () {
      var o = Object.create(null);

      o.b = Object.create(null);
      o.b.c = 9;

      var e = Object.create(null);
      e.e = 'hi i am a string';
      o.b.d = [e];

      var date = new Date;
      var f = Object.create(null);
      f.g = date;
      o.f = f;

      var h = Object.create(null);
      h.ad = 1;
      h.hoc = 2;
      h.obj = Object.create(null);
      o.h = h

      var m = new M(o);

      assert.equal(9, m.b.c);
      assert.equal('hi i am a string', m.b.d[0].e);
      assert.equal(date, m.f.g);
      assert.equal(1, m.h.ad);
      assert.equal(2, m.h.hoc);
      assert.deepEqual({},m.h.obj);
    });

    done();
  })

  it('with .set(path, obj)', function(done){
    var m = new M;

    var b = Object.create(null);
    b.c = 9;
    m.set('b', b);

    var ee = Object.create(null);
    ee.e = 'hi i am a string';
    var e = [ee];
    m.set('b.d', e);

    var date = new Date;
    var f = Object.create(null);
    f.g = date;
    m.set('f', f);

    var thing = Object.create(null);
    thing.h = 'yes';
    m.set('h.obj.thing', thing);

    assert.equal(9, m.b.c);
    assert.equal('hi i am a string', m.b.d[0].e);
    assert.equal(date, m.f.g);
    assert.deepEqual('yes', m.h.obj.thing.h);
    done();
  })

  it('with schema', function(done){
    var o = Object.create(null);
    o.name = String;
    o.created = Date;
    o.nested = Object.create(null);
    o.nested.n = Number;

    assert.doesNotThrow(function () {
      new Schema(o);
    });

    assert.doesNotThrow(function () {
      var s = new Schema;
      var o = Object.create(null);
      o.yay = Number;
      s.path('works', o);
    });

    assert.doesNotThrow(function () {
      var s = new Schema;
      var o = Object.create(null);
      var o = {};
      o.name = String;
      var x = { type: [o] };
      s.path('works', x);
    });

    done();
  })
})
