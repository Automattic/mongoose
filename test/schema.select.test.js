/**
 * Test dependencies.
 */

var start = require('./common'),
    assert = require('power-assert'),
    mongoose = start.mongoose,
    random = require('../lib/utils').random,
    Schema = mongoose.Schema;

describe('schema select option', function() {
  it('excluding paths through schematype', function(done) {
    var db = start();

    var schema = new Schema({
      thin: Boolean,
      name: {type: String, select: false},
      docs: [new Schema({bool: Boolean, name: {type: String, select: false}})]
    });

    var S = db.model('ExcludingBySchemaType', schema);
    S.create({thin: true, name: 'the excluded', docs: [{bool: true, name: 'test'}]}, function(err, s) {
      assert.ifError(err);
      assert.equal(s.name, 'the excluded');
      assert.equal(s.docs[0].name, 'test');

      var pending = 5;
      var item = s;

      function cb(err, s) {
        if (!--pending) {
          db.close();
        }

        if (Array.isArray(s)) {
          s = s[0];
        }
        assert.strictEqual(null, err);
        assert.equal(s.isSelected('name'), false);
        assert.equal(s.isSelected('docs.name'), false);
        assert.strictEqual(undefined, s.name);
        // we need to make sure this executes absolutely last.
        if (pending === 1) {
          S.findOneAndRemove({_id: item._id}, cb);
        }
        if (pending === 0) {
          done();
        }
      }

      S.findById(s).select('-thin -docs.bool').exec(cb);
      S.find({_id: s._id}).select('thin docs.bool').exec(cb);
      S.findById(s, cb);
      S.findOneAndUpdate({_id: s._id}, {name: 'changed'}, cb);
    });
  });

  it('including paths through schematype', function(done) {
    var db = start();

    var schema = new Schema({
      thin: Boolean,
      name: {type: String, select: true},
      docs: [new Schema({bool: Boolean, name: {type: String, select: true}})]
    });

    var S = db.model('IncludingBySchemaType', schema);
    S.create({thin: true, name: 'the included', docs: [{bool: true, name: 'test'}]}, function(err, s) {
      assert.ifError(err);
      assert.equal(s.name, 'the included');
      assert.equal(s.docs[0].name, 'test');

      var pending = 4;

      function cb(err, s) {
        if (!--pending) {
          db.close();
        }
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
        S.find({_id: s._id}).select('thin docs.bool').exec(function(err, res) {
          cb(err, res);
          S.findOneAndUpdate({_id: s._id}, {thin: false}, function(err, s) {
            cb(err, s);
            S.findOneAndRemove({_id: s._id}, cb);
          });
        });
      });
    });
  });

  describe('overriding schematype select options', function() {
    var db, selected, excluded, S, E;

    before(function() {
      db = start();

      selected = new Schema({
        thin: Boolean,
        name: {type: String, select: true},
        docs: [new Schema({name: {type: String, select: true}, bool: Boolean})]
      });
      excluded = new Schema({
        thin: Boolean,
        name: {type: String, select: false},
        docs: [new Schema({name: {type: String, select: false}, bool: Boolean})]
      });

      S = db.model('OverriddingSelectedBySchemaType', selected);
      E = db.model('OverriddingExcludedBySchemaType', excluded);
    });

    after(function(done) {
      db.close(done);
    });

    describe('works', function() {
      describe('for inclusions', function() {
        var s;
        before(function(done) {
          S.create({thin: true, name: 'the included', docs: [{name: 'test', bool: true}]}, function(err, s_) {
            assert.ifError(err);
            s = s_;
            assert.equal(s.name, 'the included');
            assert.equal(s.docs[0].name, 'test');
            done();
          });
        });
        it('with find', function(done) {
          S.find({_id: s._id}).select('thin name docs.bool docs.name').exec(function(err, s) {
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
          S.findOneAndUpdate({_id: s._id}, {name: 'changed'}, {new: true}).select('thin name docs.bool docs.name').exec(function(err, s) {
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
          S.findByIdAndUpdate(s, {thin: false}, {new: true}).select('-name -docs.name').exec(function(err, s) {
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
        var e;
        before(function(done) {
          E.create({thin: true, name: 'the excluded', docs: [{name: 'test', bool: true}]}, function(err, e_) {
            e = e_;
            assert.ifError(err);
            assert.equal(e.name, 'the excluded');
            assert.equal(e.docs[0].name, 'test');
            done();
          });
        });
        it('with find', function(done) {
          E.find({_id: e._id}).select('thin name docs.name docs.bool').exec(function(err, e) {
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
          E.findOneAndUpdate({_id: e._id}, {name: 'changed'}, {new: true}).select('thin name docs.name docs.bool').exec(function(err, e) {
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
          E.findOneAndRemove({_id: e._id}).select('-name -docs.name').exec(function(err, e) {
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
      var m = new mongoose.Mongoose();
      var child = new Schema({
        name1: {type: String, select: false},
        name2: {type: String, select: true}
      });
      var selected = new Schema({
        docs: {type: [child], select: false}
      });
      var M = m.model('gh-1333-deselect', selected);

      var query = M.findOne();
      query._applyPaths();
      assert.equal(Object.keys(query._fields).length, 1);
      assert.equal(query._fields['docs.name1'], undefined);
      assert.equal(query._fields['docs.name2'], undefined);
      assert.equal(query._fields.docs, 0);
      done();
    });
  });

  describe('forcing inclusion of a deselected schema path', function() {
    it('works', function(done) {
      var db = start();
      var excluded = new Schema({
        thin: Boolean,
        name: {type: String, select: false},
        docs: [new Schema({name: {type: String, select: false}, bool: Boolean})]
      });

      var M = db.model('ForcedInclusionOfPath', excluded);
      M.create({thin: false, name: '1 meter', docs: [{name: 'test', bool: false}]}, function(err, d) {
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
                db.close();
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
      var db = start();
      var M = db.model('1370', new Schema({many: {type: [String], select: false}}));

      M.create({many: ['1', '2', '3', '4', '5']}, function(err) {
        if (err) {
          return done(err);
        }

        var query = M.findOne().select('+many').where('many').slice(2);

        query.exec(function(err, doc) {
          if (err) {
            return done(err);
          }
          assert.equal(doc.many.length, 2);
          db.close(done);
        });
      });
    });
  });

  it('conflicting schematype path selection should not error', function(done) {
    var db = start();

    var schema = new Schema({
      thin: Boolean,
      name: {type: String, select: true},
      conflict: {type: String, select: false}
    });

    var S = db.model('ConflictingBySchemaType', schema);
    S.create({thin: true, name: 'bing', conflict: 'crosby'}, function(err, s) {
      assert.strictEqual(null, err);
      assert.equal(s.name, 'bing');
      assert.equal(s.conflict, 'crosby');

      var pending = 2;

      function cb(err, s) {
        if (!--pending) {
          db.close(done);
        }
        if (Array.isArray(s)) {
          s = s[0];
        }
        assert.ifError(err);
        assert.equal(s.name, 'bing');
        assert.equal(s.conflict, undefined);
      }

      S.findById(s).exec(cb);
      S.find({_id: s._id}).exec(cb);
    });
  });

  it('selecting _id works with excluded schematype path', function(done) {
    var db = start();

    var schema = new Schema({
      name: {type: String, select: false}
    });

    var M = db.model('SelectingOnly_idWithExcludedSchemaType', schema);
    M.find().select('_id -name').exec(function(err) {
      assert.ok(err instanceof Error, 'conflicting path selection error should be instance of Error');

      M.find().select('_id').exec(function(err) {
        db.close();
        assert.ifError(err, err && err.stack);
        done();
      });
    });
  });

  it('selecting _id works with excluded schematype path on sub doc', function(done) {
    var db = start();

    var schema = new Schema({
      docs: [new Schema({name: {type: String, select: false}})]
    });

    var M = db.model('SelectingOnly_idWithExcludedSchemaType', schema);
    M.find().select('_id -docs.name').exec(function(err) {
      assert.ok(err instanceof Error, 'conflicting path selection error should be instance of Error');

      M.find().select('_id').exec(function(err) {
        db.close();
        assert.ifError(err, err && err.stack);
        done();
      });
    });
  });

  it('all inclusive/exclusive combos work', function(done) {
    var db = start();
    var coll = 'inclusiveexclusivecomboswork_' + random();

    var schema = new Schema({
      name: {type: String},
      age: Number
    }, {collection: coll});
    var M = db.model('InclusiveExclusiveCombosWork', schema);

    var schema1 = new Schema({
      name: {type: String, select: false},
      age: Number
    }, {collection: coll});
    var S = db.model('InclusiveExclusiveCombosWorkWithSchemaSelectionFalse', schema1);

    var schema2 = new Schema({
      name: {type: String, select: true},
      age: Number
    }, {collection: coll});
    var T = db.model('InclusiveExclusiveCombosWorkWithSchemaSelectionTrue', schema2);

    function useId(M, id, cb) {
      M.findOne().select('_id -name').exec(function(err, d) {
        assert.ok(err);
        assert.ok(!d);
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

    M.create({name: 'ssd', age: 0}, function(err, d) {
      assert.ifError(err);
      var id = d.id;
      useId(M, id, function() {
        nonId(M, id, function() {
          useId(S, id, function() {
            nonId(S, id, function() {
              useId(T, id, function() {
                nonId(T, id, function() {
                  db.close();
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
    var db = start();
    var userSchema = new Schema({
      name: String,
      age: Number,
      profile: {
        email: String,
        flags: { type: String, default: 'bacon' }
      }
    });

    var User = db.model('gh4707', userSchema);

    var obj = {
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
        db.close(done);
      }).
      catch(done);
  });

  it('does not create nested objects if not included (gh-4669)', function(done) {
    var db = start();
    var schema = new Schema({
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

    var M = db.model('Test', schema);
    var obj = {
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
        db.close(done);
      });
    });
  });

  it('initializes nested defaults with selected objects (gh-2629)', function(done) {
    var NestedSchema = new mongoose.Schema({
      nested: {
        name: {type: String, default: 'val'}
      }
    });

    var db = start();
    var Model = db.model('nested', NestedSchema);

    var doc = new Model();
    doc.nested.name = undefined;
    doc.save(function(error) {
      assert.ifError(error);
      Model.findOne({}, {nested: 1}, function(error, doc) {
        assert.ifError(error);
        assert.equal(doc.nested.name, 'val');
        db.close(done);
      });
    });
  });
});
