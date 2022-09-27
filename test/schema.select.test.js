'use strict';

/**
 * Test dependencies.
 */

const start = require('./common');

const assert = require('assert');
const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('schema select option', function() {
  let db;

  before(function() {
    db = start();
  });

  after(async function() {
    await db.close();
  });

  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => require('./util').clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  it('excluding paths through schematype', function(done) {
    const schema = new Schema({
      thin: Boolean,
      name: { type: String, select: false },
      docs: [new Schema({ bool: Boolean, name: { type: String, select: false } })]
    });

    const S = db.model('Test', schema);
    S.create({ thin: true, name: 'the excluded', docs: [{ bool: true, name: 'test' }] }, function(err, s) {
      assert.ifError(err);
      assert.equal(s.name, 'the excluded');
      assert.equal(s.docs[0].name, 'test');

      let pending = 5;
      const item = s;

      function cb(err, s) {
        pending--;

        if (Array.isArray(s)) {
          s = s[0];
        }
        assert.strictEqual(null, err);
        assert.equal(s.isSelected('name'), false);
        assert.equal(s.isSelected('docs.name'), false);
        assert.strictEqual(undefined, s.name);
        // we need to make sure this executes absolutely last.
        if (pending === 1) {
          S.findOneAndRemove({ _id: item._id }, cb);
        }
        if (pending === 0) {
          done();
        }
      }

      S.findById(s).select('-thin -docs.bool').exec(cb);
      S.find({ _id: s._id }).select('thin docs.bool').exec(cb);
      S.findById(s, cb);
      S.findOneAndUpdate({ _id: s._id }, { name: 'changed' }, cb);
    });
  });

  it('including paths through schematype', function(done) {
    const schema = new Schema({
      thin: Boolean,
      name: { type: String, select: true },
      docs: [new Schema({ bool: Boolean, name: { type: String, select: true } })]
    });

    const S = db.model('Test', schema);
    S.create({ thin: true, name: 'the included', docs: [{ bool: true, name: 'test' }] }, function(err, s) {
      assert.ifError(err);
      assert.equal(s.name, 'the included');
      assert.equal(s.docs[0].name, 'test');

      let pending = 4;

      function cb(err, s) {
        pending--;

        if (Array.isArray(s)) {
          s = s[0];
        }
        assert.strictEqual(null, err);
        assert.strictEqual(true, s.isSelected('name'));
        assert.strictEqual(true, s.isSelected('docs.name'));
        assert.equal(s.name, 'the included');

        if (pending === 0) {
          done();
        }
      }

      S.findById(s).select('-thin -docs.bool').exec(function(err, res) {
        cb(err, res);
        S.find({ _id: s._id }).select('thin docs.bool').exec(function(err, res) {
          cb(err, res);
          S.findOneAndUpdate({ _id: s._id }, { thin: false }, function(err, s) {
            cb(err, s);
            S.findOneAndRemove({ _id: s._id }, cb);
          });
        });
      });
    });
  });

  describe('overriding schematype select options', function() {
    let selected, excluded, S, E;

    before(function() {
      selected = new Schema({
        thin: Boolean,
        name: { type: String, select: true },
        docs: [new Schema({ name: { type: String, select: true }, bool: Boolean })]
      });
      excluded = new Schema({
        thin: Boolean,
        name: { type: String, select: false },
        docs: [new Schema({ name: { type: String, select: false }, bool: Boolean })]
      });

      S = db.model('Test1', selected);
      E = db.model('Test2', excluded);
    });

    describe('works', function() {
      describe('for inclusions', function() {
        let s;
        beforeEach(function(done) {
          S.create({ thin: true, name: 'the included', docs: [{ name: 'test', bool: true }] }, function(err, s_) {
            assert.ifError(err);
            s = s_;
            assert.equal(s.name, 'the included');
            assert.equal(s.docs[0].name, 'test');
            done();
          });
        });
        it('with find', function(done) {
          S.find({ _id: s._id }).select('thin name docs.bool docs.name').exec(function(err, s) {
            assert.ifError(err);
            assert.ok(s && s.length > 0, 'no document found');
            s = s[0];
            assert.strictEqual(true, s.isSelected('name'));
            assert.strictEqual(true, s.isSelected('thin'));
            assert.strictEqual(true, s.isSelected('docs.name'));
            assert.strictEqual(true, s.isSelected('docs.bool'));
            assert.equal(s.name, 'the included');
            assert.equal(s.docs[0].name, 'test');
            assert.ok(s.thin);
            assert.ok(s.docs[0].bool);
            done();
          });
        });
        it('for findById', function(done) {
          S.findById(s).select('-name -docs.name').exec(function(err, s) {
            assert.strictEqual(null, err);
            assert.equal(s.isSelected('name'), false);
            assert.equal(s.isSelected('thin'), true);
            assert.equal(s.isSelected('docs.name'), false);
            assert.equal(s.isSelected('docs.bool'), true);
            assert.ok(s.isSelected('docs'));
            assert.strictEqual(undefined, s.name);
            assert.strictEqual(undefined, s.docs[0].name);
            assert.equal(s.thin, true);
            assert.equal(s.docs[0].bool, true);
            done();
          });
        });
        it('with findOneAndUpdate', function(done) {
          S.findOneAndUpdate({ _id: s._id }, { name: 'changed' }, { new: true }).select('thin name docs.bool docs.name').exec(function(err, s) {
            assert.ifError(err);
            assert.strictEqual(true, s.isSelected('name'));
            assert.strictEqual(true, s.isSelected('thin'));
            assert.strictEqual(true, s.isSelected('docs.name'));
            assert.strictEqual(true, s.isSelected('docs.bool'));
            assert.equal(s.name, 'changed');
            assert.equal(s.docs[0].name, 'test');
            assert.ok(s.thin);
            assert.ok(s.docs[0].bool);
            done();
          });
        });
        it('for findByIdAndUpdate', function(done) {
          S.findByIdAndUpdate(s, { thin: false }, { new: true }).select('-name -docs.name').exec(function(err, s) {
            assert.strictEqual(null, err);
            assert.equal(s.isSelected('name'), false);
            assert.equal(s.isSelected('thin'), true);
            assert.equal(s.isSelected('docs.name'), false);
            assert.equal(s.isSelected('docs.bool'), true);
            assert.strictEqual(undefined, s.name);
            assert.strictEqual(undefined, s.docs[0].name);
            assert.equal(s.thin, false);
            assert.equal(s.docs[0].bool, true);
            done();
          });
        });
      });

      describe('for exclusions', function() {
        let e;
        beforeEach(function(done) {
          E.create({ thin: true, name: 'the excluded', docs: [{ name: 'test', bool: true }] }, function(err, e_) {
            e = e_;
            assert.ifError(err);
            assert.equal(e.name, 'the excluded');
            assert.equal(e.docs[0].name, 'test');
            done();
          });
        });
        it('with find', function(done) {
          E.find({ _id: e._id }).select('thin name docs.name docs.bool').exec(function(err, e) {
            e = e[0];
            assert.strictEqual(null, err);
            assert.equal(e.isSelected('name'), true);
            assert.equal(e.isSelected('thin'), true);
            assert.equal(e.isSelected('docs.name'), true);
            assert.equal(e.isSelected('docs.bool'), true);
            assert.equal(e.name, 'the excluded');
            assert.equal(e.docs[0].name, 'test');
            assert.ok(e.thin);
            assert.ok(e.docs[0].bool);
            done();
          });
        });
        it('with findById', function(done) {
          E.findById(e).select('-name -docs.name').exec(function(err, e) {
            assert.strictEqual(null, err);
            assert.equal(e.isSelected('name'), false);
            assert.equal(e.isSelected('thin'), true);
            assert.equal(e.isSelected('docs.name'), false);
            assert.equal(e.isSelected('docs.bool'), true);
            assert.strictEqual(undefined, e.name);
            assert.strictEqual(undefined, e.docs[0].name);
            assert.strictEqual(true, e.thin);
            assert.strictEqual(true, e.docs[0].bool);
            done();
          });
        });
        it('with findOneAndUpdate', function(done) {
          E.findOneAndUpdate({ _id: e._id }, { name: 'changed' }, { new: true }).select('thin name docs.name docs.bool').exec(function(err, e) {
            assert.strictEqual(null, err);
            assert.equal(e.isSelected('name'), true);
            assert.equal(e.isSelected('thin'), true);
            assert.equal(e.isSelected('docs.name'), true);
            assert.equal(e.isSelected('docs.bool'), true);
            assert.equal(e.name, 'changed');
            assert.equal(e.docs[0].name, 'test');
            assert.ok(e.thin);
            assert.ok(e.docs[0].bool);
            done();
          });
        });
        it('with findOneAndRemove', function(done) {
          E.findOneAndRemove({ _id: e._id }).select('-name -docs.name').exec(function(err, e) {
            assert.strictEqual(null, err);
            assert.equal(e.isSelected('name'), false);
            assert.equal(e.isSelected('thin'), true);
            assert.equal(e.isSelected('docs.name'), false);
            assert.equal(e.isSelected('docs.bool'), true);
            assert.strictEqual(undefined, e.name);
            assert.strictEqual(undefined, e.docs[0].name);
            assert.strictEqual(true, e.thin);
            assert.strictEqual(true, e.docs[0].bool);
            done();
          });
        });
      });
    });
  });

  describe('exclusion in root schema should override child schema', function() {
    it('works (gh-1333)', function(done) {
      const m = new mongoose.Mongoose();
      const child = new Schema({
        name1: { type: String, select: false },
        name2: { type: String, select: true }
      });
      const selected = new Schema({
        docs: { type: [child], select: false }
      });
      const M = m.model('Test', selected);

      const query = M.findOne();
      query._applyPaths();
      assert.equal(Object.keys(query._fields).length, 1);
      assert.equal(query._fields['docs.name1'], undefined);
      assert.equal(query._fields['docs.name2'], undefined);
      assert.equal(query._fields.docs, 0);
      done();
    });

    it('with nested (gh-7945)', function() {
      const child = new Schema({
        name1: { type: String, select: false },
        name2: { type: String, select: true }
      });
      const selected = new Schema({
        parent: {
          docs: { type: [child], select: false }
        }
      });
      const M = db.model('Test', selected);

      const query = M.findOne();
      query._applyPaths();
      assert.equal(Object.keys(query._fields).length, 1);
      assert.equal(query._fields['parent.docs.name1'], undefined);
      assert.equal(query._fields['parent.docs.name2'], undefined);
      assert.equal(query._fields['parent.docs'], 0);

      return M.create({ parent: { docs: [{ name1: 'foo', name2: 'bar' }] } }).
        then(() => query).
        then(doc => {
          assert.ok(!doc.parent.docs);
        });
    });
  });

  it('should not project in discriminator key if projected in implicitly with .$ (gh-9361)', function() {
    const eventSchema = new Schema({ message: String },
      { discriminatorKey: 'kind', _id: false });

    const batchSchema = new Schema({ events: [eventSchema] });
    batchSchema.path('events').discriminator('Clicked', new Schema({
      element: String
    }, { _id: false }));
    batchSchema.path('events').discriminator('Purchased', new Schema({
      product: String
    }, { _id: false }));

    const MyModel = db.model('Test', batchSchema);

    const query = MyModel.find({ 'events.message': 'foo' }).select({ 'events.$': 1 });
    query._applyPaths();

    assert.equal(Object.keys(query._fields).length, 1);
    assert.ok(query._fields['events.$']);
  });

  describe('forcing inclusion of a deselected schema path', function() {
    it('works', function(done) {
      const excluded = new Schema({
        thin: Boolean,
        name: { type: String, select: false },
        docs: [new Schema({ name: { type: String, select: false }, bool: Boolean })]
      });

      const M = db.model('Test', excluded);
      M.create({ thin: false, name: '1 meter', docs: [{ name: 'test', bool: false }] }, function(err, d) {
        assert.ifError(err);

        M.findById(d)
          .select('+name +docs.name')
          .exec(function(err, doc) {
            assert.ifError(err);
            assert.equal(doc.thin, false);
            assert.equal(doc.name, '1 meter');
            assert.equal(doc.docs[0].bool, false);
            assert.equal(doc.docs[0].name, 'test');
            assert.equal(d.id, doc.id);

            M.findById(d)
              .select('+name -thin +docs.name -docs.bool')
              .exec(function(err, doc) {
                assert.ifError(err);
                assert.equal(doc.thin, undefined);
                assert.equal(doc.name, '1 meter');
                assert.equal(doc.docs[0].bool, undefined);
                assert.equal(doc.docs[0].name, 'test');
                assert.equal(d.id, doc.id);

                M.findById(d)
                  .select('-thin +name -docs.bool +docs.name')
                  .exec(function(err, doc) {
                    assert.ifError(err);
                    assert.equal(doc.thin, undefined);
                    assert.equal(doc.name, '1 meter');
                    assert.equal(doc.docs[0].bool, undefined);
                    assert.equal(doc.docs[0].name, 'test');
                    assert.equal(d.id, doc.id);

                    M.findById(d)
                      .select('-thin -docs.bool')
                      .exec(function(err, doc) {
                        assert.ifError(err);
                        assert.equal(doc.thin, undefined);
                        assert.equal(doc.name, undefined);
                        assert.equal(doc.docs[0].bool, undefined);
                        assert.equal(doc.docs[0].name, undefined);
                        assert.equal(d.id, doc.id);
                        done();
                      });
                  });
              });
          });
      });
    });

    it('works with query.slice (gh-1370)', function(done) {
      const M = db.model('Test', new Schema({ many: { type: [String], select: false } }));

      M.create({ many: ['1', '2', '3', '4', '5'] }, function(err) {
        if (err) {
          return done(err);
        }

        const query = M.findOne().select('+many').where('many').slice(2);

        query.exec(function(err, doc) {
          if (err) {
            return done(err);
          }
          assert.equal(doc.many.length, 2);
          done();
        });
      });
    });

    it('ignores if path does not have select in schema (gh-6785)', async function() {
      const M = db.model('Test', new Schema({
        a: String,
        b: String
      }));

      await M.create({ a: 'foo', b: 'bar' });

      const doc = await M.findOne().select('+a');
      assert.equal(doc.a, 'foo');
      assert.equal(doc.b, 'bar');
    });

    it('omits if not in schema (gh-7017)', async function() {
      const M = db.model('Test', new Schema({
        a: { type: String, select: false },
        b: { type: String, select: false }
      }), 'Test');

      await db.$initialConnection;
      await db.collection('Test').insertOne({
        a: 'foo',
        b: 'bar',
        c: 'baz'
      });

      const q = M.find({}).select('+c');
      const doc = await q.then(res => res[0]);
      assert.deepEqual(q._fields, { a: 0, b: 0 });

      assert.strictEqual(doc.a, void 0);
      assert.strictEqual(doc.b, void 0);
      assert.equal(doc.toObject().c, 'baz');
    });
  });

  it('conflicting schematype path selection should not error', function(done) {
    const schema = new Schema({
      thin: Boolean,
      name: { type: String, select: true },
      conflict: { type: String, select: false }
    });

    const S = db.model('Test', schema);
    S.create({ thin: true, name: 'bing', conflict: 'crosby' }, function(err, s) {
      assert.strictEqual(null, err);
      assert.equal(s.name, 'bing');
      assert.equal(s.conflict, 'crosby');

      let pending = 2;

      function cb(err, s) {
        if (!--pending) {
          done();
        }
        if (Array.isArray(s)) {
          s = s[0];
        }
        assert.ifError(err);
        assert.equal(s.name, 'bing');
        assert.equal(s.conflict, undefined);
      }

      S.findById(s).exec(cb);
      S.find({ _id: s._id }).exec(cb);
    });
  });

  it('selecting _id works with excluded schematype path', function(done) {
    const schema = new Schema({
      name: { type: String, select: false }
    });

    const M = db.model('Test', schema);
    M.find().select('_id').exec(function(err) {
      assert.ifError(err, err && err.stack);
      done();
    });
  });

  it('selecting _id works with excluded schematype path on sub doc', function(done) {
    const schema = new Schema({
      docs: [new Schema({ name: { type: String, select: false } })]
    });

    const M = db.model('Test', schema);
    M.find().select('_id').exec(function(err) {
      assert.ifError(err, err && err.stack);
      done();
    });
  });

  it('all inclusive/exclusive combos work', function(done) {
    const coll = 'Test';

    const schema = new Schema({
      name: { type: String },
      age: Number
    }, { collection: coll });
    const M = db.model('Test1', schema);

    const schema1 = new Schema({
      name: { type: String, select: false },
      age: Number
    }, { collection: coll });
    const S = db.model('Test2', schema1);

    const schema2 = new Schema({
      name: { type: String, select: true },
      age: Number
    }, { collection: coll });
    const T = db.model('Test3', schema2);

    function useId(M, id, cb) {
      M.findOne().select('-_id name').exec(function(err, d) {
        // mongo special case for exclude _id + include path
        assert.ifError(err);
        assert.equal(d.id, undefined);
        assert.equal(d.name, 'ssd');
        assert.equal(d.age, undefined);
        M.findOne().select('-_id -name').exec(function(err, d) {
          assert.ifError(err);
          assert.equal(d.id, undefined);
          assert.equal(d.name, undefined);
          assert.equal(d.age, 0);
          M.findOne().select('_id name').exec(function(err, d) {
            assert.ifError(err);
            assert.equal(d.id, id);
            assert.equal(d.name, 'ssd');
            assert.equal(d.age, undefined);
            cb();
          });
        });
      });
    }

    function nonId(M, id, cb) {
      M.findOne().select('age -name').exec(function(err, d) {
        assert.ok(err);
        assert.ok(!d);
        M.findOne().select('-age name').exec(function(err, d) {
          assert.ok(err);
          assert.ok(!d);
          M.findOne().select('-age -name').exec(function(err, d) {
            assert.ifError(err);
            assert.equal(d.id, id);
            assert.equal(d.name, undefined);
            assert.equal(d.age, undefined);
            M.findOne().select('age name').exec(function(err, d) {
              assert.ifError(err);
              assert.equal(d.id, id);
              assert.equal(d.name, 'ssd');
              assert.equal(d.age, 0);
              cb();
            });
          });
        });
      });
    }

    M.create({ name: 'ssd', age: 0 }, function(err, d) {
      assert.ifError(err);
      const id = d.id;
      useId(M, id, function() {
        nonId(M, id, function() {
          useId(S, id, function() {
            nonId(S, id, function() {
              useId(T, id, function() {
                nonId(T, id, function() {
                  done();
                });
              });
            });
          });
        });
      });
    });
  });

  it('does not set defaults for nested objects (gh-4707)', function(done) {
    const userSchema = new Schema({
      name: String,
      age: Number,
      profile: {
        email: String,
        flags: { type: String, default: 'bacon' }
      }
    });

    const User = db.model('Test', userSchema);

    const obj = {
      name: 'Val',
      age: 28,
      profile: { email: 'test@a.co', flags: 'abc' }
    };
    User.create(obj).
      then(function(user) {
        return User.findById(user._id).
          select('name profile.email');
      }).
      then(function(user) {
        assert.ok(!user.profile.flags);
        done();
      }).
      catch(done);
  });

  it('does not create nested objects if not included (gh-4669)', function(done) {
    const schema = new Schema({
      field1: String,
      field2: String,
      field3: {
        f1: String,
        f2: { type: String, default: 'abc' }
      },
      field4: {
        f1: String
      },
      field5: String
    }, { minimize: false });

    const M = db.model('Test', schema);
    const obj = {
      field1: 'a',
      field2: 'b',
      field3: { f1: 'c', f2: 'd' },
      field4: { f1: 'e' },
      field5: 'f'
    };
    M.create(obj, function(error, doc) {
      assert.ifError(error);
      M.findOne({ _id: doc._id }, 'field1 field2', function(error, doc) {
        assert.ifError(error);
        assert.ok(!doc.toObject({ minimize: false }).field3);
        assert.ok(!doc.toObject({ minimize: false }).field4);
        done();
      });
    });
  });

  it('initializes nested defaults with selected objects (gh-2629)', function(done) {
    const NestedSchema = new mongoose.Schema({
      nested: {
        name: { type: String, default: 'val' }
      }
    });

    const Model = db.model('Test', NestedSchema);

    const doc = new Model();
    doc.nested.name = undefined;
    doc.save(function(error) {
      assert.ifError(error);
      Model.findOne({}, { nested: 1 }, function(error, doc) {
        assert.ifError(error);
        assert.equal(doc.nested.name, 'val');
        done();
      });
    });
  });
});
