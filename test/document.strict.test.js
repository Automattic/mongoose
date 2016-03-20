/**
 * Test dependencies.
 */

var start = require('./common'),
    mongoose = start.mongoose,
    assert = require('power-assert'),
    random = require('../lib/utils').random,
    Schema = mongoose.Schema;

describe('document: strict mode:', function() {
  describe('should work', function() {
    var db, Lax, Strict;

    before(function() {
      db = start();

      var raw = {
        ts: {type: Date, default: Date.now},
        content: String,
        mixed: {},
        deepMixed: {'4a': {}},
        arrayMixed: []
      };

      var lax = new Schema(raw, {strict: false});
      var strict = new Schema(raw);

      Lax = db.model('Lax', lax);
      Strict = db.model('Strict', strict);
    });

    after(function(done) {
      db.close(done);
    });

    it('when creating models with non-strict schemas', function(done) {
      var l = new Lax({content: 'sample', rouge: 'data'});
      assert.equal(false, l.$__.strictMode);

      var lo = l.toObject();
      assert.ok('ts' in l);
      assert.ok('ts' in lo);
      assert.equal('sample', l.content);
      assert.equal('sample', lo.content);
      assert.equal('data', l.rouge);
      assert.equal('data', lo.rouge);
      done();
    });

    it('when creating models with strict schemas', function(done) {
      var s = new Strict({content: 'sample', rouge: 'data'});
      assert.equal(true, s.$__.strictMode);

      var so = s.toObject();
      assert.ok('ts' in s);
      assert.ok('ts' in so);
      assert.equal('sample', s.content);
      assert.equal('sample', so.content);
      assert.ok(!('rouge' in s));
      assert.ok(!('rouge' in so));
      assert.ok(!s.rouge);
      assert.ok(!so.rouge);
      done();
    });

    it('when overriding strictness', function(done) {
      // instance override
      var instance = new Lax({content: 'sample', rouge: 'data'}, true);
      assert.ok(instance.$__.strictMode);

      instance = instance.toObject();
      assert.equal('sample', instance.content);
      assert.ok(!instance.rouge);
      assert.ok('ts' in instance);

      // hydrate works as normal, but supports the schema level flag.
      var s2 = new Strict({content: 'sample', rouge: 'data'}, false);
      assert.equal(false, s2.$__.strictMode);
      s2 = s2.toObject();
      assert.ok('ts' in s2);
      assert.equal('sample', s2.content);
      assert.ok('rouge' in s2);

      // testing init
      var s3 = new Strict();
      s3.init({content: 'sample', rouge: 'data'});
      s3.toObject();
      assert.equal('sample', s3.content);
      assert.ok(!('rouge' in s3));
      assert.ok(!s3.rouge);
      done();
    });

    it('when using Model#create', function(done) {
      // strict on create
      Strict.create({content: 'sample2', rouge: 'data'}, function(err, doc) {
        assert.equal('sample2', doc.content);
        assert.ok(!('rouge' in doc));
        assert.ok(!doc.rouge);
        done();
      });
    });

    after(function() {
      db.close();
    });
  });

  it('nested doc', function(done) {
    var db = start();

    var lax = new Schema({
      name: {last: String}
    }, {strict: false});

    var strict = new Schema({
      name: {last: String}
    });

    var Lax = db.model('NestedLax', lax, 'nestdoc' + random());
    var Strict = db.model('NestedStrict', strict, 'nestdoc' + random());

    var l = new Lax;
    l.set('name', {last: 'goose', hack: 'xx'});
    l = l.toObject();
    assert.equal('goose', l.name.last);
    assert.equal('xx', l.name.hack);

    var s = new Strict;
    s.set({name: {last: 'goose', hack: 'xx'}});
    s = s.toObject();
    assert.equal('goose', s.name.last);
    assert.ok(!('hack' in s.name));
    assert.ok(!s.name.hack);

    s = new Strict;
    s.set('name', {last: 'goose', hack: 'xx'});
    s.set('shouldnt.exist', ':(');
    s = s.toObject();
    assert.equal('goose', s.name.last);
    assert.ok(!('hack' in s.name));
    assert.ok(!s.name.hack);
    assert.ok(!s.shouldnt);
    db.close(done);
  });

  it('sub doc', function(done) {
    var db = start();

    var lax = new Schema({
      ts: {type: Date, default: Date.now},
      content: String
    }, {strict: false});

    var strict = new Schema({
      ts: {type: Date, default: Date.now},
      content: String
    });

    var Lax = db.model('EmbeddedLax', new Schema({dox: [lax]}, {strict: false}), 'embdoc' + random());
    var Strict = db.model('EmbeddedStrict', new Schema({dox: [strict]}, {strict: false}), 'embdoc' + random());

    var l = new Lax({dox: [{content: 'sample', rouge: 'data'}]});
    assert.equal(false, l.dox[0].$__.strictMode);
    l = l.dox[0].toObject();
    assert.equal('sample', l.content);
    assert.equal('data', l.rouge);
    assert.ok(l.rouge);

    var s = new Strict({dox: [{content: 'sample', rouge: 'data'}]});
    assert.equal(true, s.dox[0].$__.strictMode);
    s = s.dox[0].toObject();
    assert.ok('ts' in s);
    assert.equal('sample', s.content);
    assert.ok(!('rouge' in s));
    assert.ok(!s.rouge);

    // testing init
    var s3 = new Strict();
    s3.init({dox: [{content: 'sample', rouge: 'data'}]});
    s3.toObject();
    assert.equal('sample', s3.dox[0].content);
    assert.ok(!('rouge' in s3.dox[0]));
    assert.ok(!s3.dox[0].rouge);

    // strict on create
    Strict.create({dox: [{content: 'sample2', rouge: 'data'}]}, function(err, doc) {
      assert.equal('sample2', doc.dox[0].content);
      assert.ok(!('rouge' in doc.dox[0]));
      assert.ok(!doc.dox[0].rouge);
      db.close(done);
    });
  });

  it('virtuals', function(done) {
    var db = start();

    var getCount = 0,
        setCount = 0;

    var strictSchema = new Schema({
      email: String,
      prop: String
    });

    strictSchema
    .virtual('myvirtual')
    .get(function() {
      getCount++;
      return 'ok';
    })
    .set(function(v) {
      setCount++;
      this.prop = v;
    });

    var StrictModel = db.model('StrictVirtual', strictSchema);

    var strictInstance = new StrictModel({
      email: 'hunter@skookum.com',
      myvirtual: 'test'
    });

    assert.equal(0, getCount);
    assert.equal(1, setCount);

    strictInstance.myvirtual = 'anotherone';
    assert.equal(0, getCount);
    assert.equal(2, setCount);

    var temp = strictInstance.myvirtual;
    assert.equal(typeof temp, 'string');
    assert.equal(1, getCount);
    assert.equal(2, setCount);

    db.close(done);
  });

  it('can be overridden during set()', function(done) {
    var db = start();

    var strict = new Schema({
      bool: Boolean
    });

    var Strict = db.model('Strict', strict);
    var s = new Strict({bool: true});

    // insert non-schema property
    var doc = s.toObject();
    doc.notInSchema = true;

    Strict.collection.insert(doc, {w: 1}, function(err) {
      assert.ifError(err);
      Strict.findById(doc._id, function(err, doc) {
        assert.ifError(err);
        assert.equal(true, doc._doc.bool);
        assert.equal(true, doc._doc.notInSchema);
        doc.bool = undefined;
        doc.set('notInSchema', undefined, {strict: false});
        doc.save(function() {
          Strict.findById(doc._id, function(err, doc) {
            assert.ifError(err);
            assert.equal(undefined, doc._doc.bool);
            assert.equal(undefined, doc._doc.notInSchema);
            db.close(done);
          });
        });
      });
    });
  });

  it('can be overridden during update()', function(done) {
    var db = start();

    var strict = new Schema({
      bool: Boolean
    });

    var Strict = db.model('Strict', strict);
    var s = new Strict({bool: true});

    // insert non-schema property
    var doc = s.toObject();
    doc.notInSchema = true;

    Strict.collection.insert(doc, {w: 1}, function(err) {
      assert.ifError(err);

      Strict.findById(doc._id, function(err, doc) {
        assert.ifError(err);
        assert.equal(true, doc._doc.bool);
        assert.equal(true, doc._doc.notInSchema);

        Strict.update({_id: doc._id}, {$unset: {bool: 1, notInSchema: 1}}, {strict: false, w: 1},
            function(err) {
              assert.ifError(err);

              Strict.findById(doc._id, function(err, doc) {
                db.close();
                assert.ifError(err);
                assert.equal(undefined, doc._doc.bool);
                assert.equal(undefined, doc._doc.notInSchema);
                done();
              });
            });
      });
    });
  });

  it('can be overwritten with findOneAndUpdate (gh-1967)', function(done) {
    var db = start();

    var strict = new Schema({
      bool: Boolean
    });

    var Strict = db.model('Strict', strict);
    var s = new Strict({bool: true});

    // insert non-schema property
    var doc = s.toObject();
    doc.notInSchema = true;

    Strict.collection.insert(doc, {w: 1}, function(err) {
      assert.ifError(err);

      Strict.findById(doc._id, function(err, doc) {
        assert.ifError(err);
        assert.equal(true, doc._doc.bool);
        assert.equal(true, doc._doc.notInSchema);

        Strict.findOneAndUpdate({_id: doc._id}, {$unset: {bool: 1, notInSchema: 1}}, {strict: false, w: 1},
            function(err) {
              assert.ifError(err);

              Strict.findById(doc._id, function(err, doc) {
                assert.ifError(err);
                assert.equal(undefined, doc._doc.bool);
                assert.equal(undefined, doc._doc.notInSchema);
                db.close(done);
              });
            });
      });
    });
  });

  describe('"throws" mode', function() {
    it('throws on set() of unknown property', function(done) {
      var schema = new Schema({n: String, docs: [{x: [{y: String}]}]});
      schema.set('strict', 'throw');
      var M = mongoose.model('throwStrictSet', schema, 'tss_' + random());
      var m = new M;

      var badField = /Field `[\w\.]+` is not in schema/;

      assert.throws(function() {
        m.set('unknown.stuff.is.here', 3);
      }, badField);

      assert.throws(function() {
        m.set('n.something', 3);
      }, badField);

      assert.throws(function() {
        m.set('n.3', 3);
      }, badField);

      assert.throws(function() {
        m.set('z', 3);
      }, badField);

      assert.throws(function() {
        m.set('docs.z', 3);
      }, badField);

      assert.throws(function() {
        m.set('docs.0.z', 3);
      }, badField);

      assert.throws(function() {
        m.set('docs.0.x.z', 3);
      }, badField);

      assert.throws(function() {
        m.set('docs.0.x.4.z', 3);
      }, badField);

      assert.throws(function() {
        m.set('docs.0.x.4.y.z', 3);
      }, badField);

      done();
    });

    it('fails with extra fields', function(done) {
      // Simple schema with throws option
      var FooSchema = new mongoose.Schema({
        name: {type: String}
      }, {strict: 'throw'});

      // Create the model
      var Foo = mongoose.model('Foo1234', FooSchema);

      assert.doesNotThrow(function() {
        new Foo({name: 'bar'});
      });

      assert.throws(function() {
        // The extra baz field should throw
        new Foo({name: 'bar', baz: 'bam'});
      }, /Field `baz` is not in schema/);

      done();
    });

    it('doesnt throw with refs (gh-2665)', function(done) {
      // Simple schema with throws option
      var FooSchema = new mongoose.Schema({
        name: {type: mongoose.Schema.Types.ObjectId, ref: 'test', required: false, default: null},
        father: {name: {full: String}}
      }, {strict: 'throw'});

      // Create the model
      var Foo = mongoose.model('Foo', FooSchema);

      assert.doesNotThrow(function() {
        new Foo({name: mongoose.Types.ObjectId(), father: {name: {full: 'bacon'}}});
      });

      done();
    });

    it('set nested to num throws ObjectExpectedError (gh-3735)', function(done) {
      var schema = new Schema({
        resolved: {
          by: {type: String}
        }
      }, {strict: 'throw'});

      var Test = mongoose.model('gh3735', schema);

      assert.throws(function() {
        new Test({resolved: 123});
      }, /ObjectExpectedError/);
      done();
    });
  });
});
