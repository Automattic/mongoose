/**
 * Test dependencies.
 */

var start = require('./common'),
    assert = require('power-assert'),
    mongoose = start.mongoose,
    Schema = mongoose.Schema;

var schema;

describe('is compatible with object created using Object.create(null) (gh-1484)', function() {
  var db;
  var M;

  before(function() {
    schema = new Schema({
      a: String,
      b: {
        c: Number,
        d: [{e: String}]
      },
      f: {g: Date},
      h: {}
    });
  });

  before(function() {
    db = start();
    M = db.model('1484', schema);
  });

  after(function(done) {
    db.close(done);
  });

  it('during construction', function(done) {
    assert.doesNotThrow(function() {
      new M(Object.create(null));
    });

    assert.doesNotThrow(function() {
      var o = Object.create(null);
      o.b = Object.create(null);
      new M(o);
    });

    assert.doesNotThrow(function() {
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
      o.h = h;

      var m = new M(o);

      assert.equal(m.b.c, 9);
      assert.equal(m.b.d[0].e, 'hi i am a string');
      assert.equal(date, m.f.g);
      assert.equal(m.h.ad, 1);
      assert.equal(m.h.hoc, 2);
      assert.deepEqual({}, m.h.obj);
    });

    done();
  });

  it('with .set(path, obj)', function(done) {
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

    assert.equal(m.b.c, 9);
    assert.equal(m.b.d[0].e, 'hi i am a string');
    assert.equal(date, m.f.g);
    assert.deepEqual('yes', m.h.obj.thing.h);
    done();
  });

  it('with schema', function(done) {
    var o = Object.create(null);
    o.name = String;
    o.created = Date;
    o.nested = Object.create(null);
    o.nested.n = Number;

    assert.doesNotThrow(function() {
      new Schema(o);
    });

    assert.doesNotThrow(function() {
      var s = new Schema;
      var o = Object.create(null);
      o.yay = Number;
      s.path('works', o);
    });

    assert.doesNotThrow(function() {
      var s = new Schema;
      var o = Object.create(null);
      o = {};
      o.name = String;
      var x = {type: [o]};
      s.path('works', x);
    });

    done();
  });
});
