
/**
 * Test dependencies.
 */

var start = require('./common')
  , assert = require('assert')
  , mongoose = start.mongoose
  , random = require('../lib/utils').random
  , Query = require('../lib/query')
  , Schema = mongoose.Schema
  , SchemaType = mongoose.SchemaType
  , CastError = SchemaType.CastError
  , ObjectId = Schema.ObjectId
  , MongooseBuffer = mongoose.Types.Buffer
  , DocumentObjectId = mongoose.Types.ObjectId;

describe('schema select option', function(){

  it('excluding paths through schematype', function (done) {
    var db =start()

    var schema = new Schema({
        thin: Boolean
      , name: { type: String, select: false}
      , docs: [new Schema({ bool: Boolean, name: { type: String, select: false }})]
    });

    var S = db.model('ExcludingBySchemaType', schema);
    S.create({ thin: true, name: 'the excluded', docs:[{bool:true, name: 'test'}] },function (err, s) {
      assert.ifError(err);
      assert.equal(s.name, 'the excluded');
      assert.equal(s.docs[0].name, 'test');

      var pending = 5;
      function cb (err, s) {
        if (!--pending) {
          db.close();
        }

        if (Array.isArray(s)) s = s[0];
        assert.strictEqual(null, err);
        assert.equal(false, s.isSelected('name'));
        assert.equal(false, s.isSelected('docs.name'));
        assert.strictEqual(undefined, s.name);

        if (0 === pending) {
          done();
        }
      }

      S.findById(s).select('-thin -docs.bool').exec(cb);
      S.find({ _id: s._id }).select('thin docs.bool').exec(cb);
      S.findById(s, cb);
      S.findOneAndUpdate({ _id: s._id }, { name: 'changed' }, function (err, s) {
        cb(err, s);
        S.findOneAndRemove({ _id: s._id }, cb);
      });
    });
  });

  it('including paths through schematype', function (done) {
    var db =start()

    var schema = new Schema({
        thin: Boolean
      , name: { type: String, select: true }
      , docs: [new Schema({ bool: Boolean, name: { type: String, select: true }})]
    });

    var S = db.model('IncludingBySchemaType', schema);
    S.create({ thin: true, name: 'the included', docs:[{bool:true, name: 'test'}] },function (err, s) {
      assert.ifError(err);
      assert.equal(s.name, 'the included');
      assert.equal(s.docs[0].name, 'test');

      var pending = 4;
      function cb (err, s) {
        if (!--pending) {
          db.close();
        }
        if (Array.isArray(s)) s = s[0];
        assert.strictEqual(null, err);
        assert.strictEqual(true, s.isSelected('name'));
        assert.strictEqual(true, s.isSelected('docs.name'));
        assert.equal(s.name, 'the included');

        if (0 === pending) {
          done();
        }
      }

      S.findById(s).select('-thin -docs.bool').exec(cb);
      S.find({ _id: s._id }).select('thin docs.bool').exec(cb);
      S.findOneAndUpdate({ _id: s._id }, { thin: false }, function (err, s) {
        cb(err, s);
        S.findOneAndRemove({ _id: s._id }, cb);
      });
    });
  });

  describe('overriding schematype select options', function (done) {
    var db, selected, excluded, S, E;

    before(function(){
      db =start()

      selected = new Schema({
          thin: Boolean
        , name: { type: String, select: true }
        , docs: [new Schema({ name: { type: String, select: true }, bool: Boolean })]
      });
      excluded = new Schema({
          thin: Boolean
        , name: { type: String, select: false }
        , docs: [new Schema({ name: { type: String, select: false }, bool: Boolean})]
      });

      S = db.model('OverriddingSelectedBySchemaType', selected);
      E = db.model('OverriddingExcludedBySchemaType', excluded);
    });

    after(function(done){
      db.close(done)
    })

    describe('works', function(){
      describe('for inclusions', function(done){
        var s;
        before(function(done){
          S.create({ thin: true, name: 'the included', docs: [{name:'test',bool: true}] },function (err, s_) {
            assert.ifError(err);
            s = s_;
            assert.equal(s.name, 'the included');
            assert.equal(s.docs[0].name, 'test');
            done();
          });
        })
        it('with find', function(done){
          S.find({ _id: s._id }).select('thin name docs.bool docs.name').exec(function (err, s) {
            assert.ifError(err);
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
        })
        it('for findById', function(done){
          S.findById(s).select('-name -docs.name').exec(function (err, s) {
            assert.strictEqual(null, err);
            assert.equal(false, s.isSelected('name'))
            assert.equal(true, s.isSelected('thin'))
            assert.equal(false, s.isSelected('docs.name'))
            assert.equal(true, s.isSelected('docs.bool'))
            assert.strictEqual(undefined, s.name);
            assert.strictEqual(undefined, s.docs[0].name);
            assert.equal(true, s.thin);
            assert.equal(true, s.docs[0].bool);
            done();
          });
        });
        it('with findOneAndUpdate', function(done){
          S.findOneAndUpdate({ _id: s._id }, { name: 'changed' }).select('thin name docs.bool docs.name').exec(function (err, s) {
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
        })
        it('for findByIdAndUpdate', function(done){
          S.findByIdAndUpdate(s, { thin: false }).select('-name -docs.name').exec(function (err, s) {
            assert.strictEqual(null, err);
            assert.equal(false, s.isSelected('name'))
            assert.equal(true, s.isSelected('thin'))
            assert.equal(false, s.isSelected('docs.name'))
            assert.equal(true, s.isSelected('docs.bool'))
            assert.strictEqual(undefined, s.name);
            assert.strictEqual(undefined, s.docs[0].name);
            assert.equal(false, s.thin);
            assert.equal(true, s.docs[0].bool);
            done();
          });
        });
      });

      describe('for exclusions', function(){
        var e;
        before(function(done){
          E.create({ thin: true, name: 'the excluded',docs:[{name:'test',bool:true}] },function (err, e_) {
            e = e_;
            assert.ifError(err);
            assert.equal(e.name, 'the excluded');
            assert.equal(e.docs[0].name, 'test');
            done();
          })
        })
        it('with find', function(done){
          E.find({ _id: e._id }).select('thin name docs.name docs.bool').exec(function (err, e) {
            e = e[0];
            assert.strictEqual(null, err);
            assert.equal(true, e.isSelected('name'));
            assert.equal(true, e.isSelected('thin'));
            assert.equal(true, e.isSelected('docs.name'));
            assert.equal(true, e.isSelected('docs.bool'));
            assert.equal(e.name, 'the excluded');
            assert.equal(e.docs[0].name, 'test');
            assert.ok(e.thin);
            assert.ok(e.docs[0].bool);
            done();
          });
        })
        it('with findById', function(done){
          E.findById(e).select('-name -docs.name').exec(function (err, e) {
            assert.strictEqual(null, err);
            assert.equal(e.isSelected('name'),false)
            assert.equal(e.isSelected('thin'), true);
            assert.equal(e.isSelected('docs.name'),false)
            assert.equal(e.isSelected('docs.bool'), true);
            assert.strictEqual(undefined, e.name);
            assert.strictEqual(undefined, e.docs[0].name);
            assert.strictEqual(true, e.thin);
            assert.strictEqual(true, e.docs[0].bool);
            done();
          });
        })
        it('with findOneAndUpdate', function(done){
          E.findOneAndUpdate({ _id: e._id }, { name: 'changed' }).select('thin name docs.name docs.bool').exec(function (err, e) {
            assert.strictEqual(null, err);
            assert.equal(true, e.isSelected('name'));
            assert.equal(true, e.isSelected('thin'));
            assert.equal(true, e.isSelected('docs.name'));
            assert.equal(true, e.isSelected('docs.bool'));
            assert.equal(e.name, 'changed');
            assert.equal(e.docs[0].name, 'test');
            assert.ok(e.thin);
            assert.ok(e.docs[0].bool);
            done();
          });
        })
        it('with findOneAndRemove', function(done){
          E.findOneAndRemove({ _id: e._id }).select('-name -docs.name').exec(function (err, e) {
            assert.strictEqual(null, err);
            assert.equal(e.isSelected('name'),false)
            assert.equal(e.isSelected('thin'), true);
            assert.equal(e.isSelected('docs.name'),false)
            assert.equal(e.isSelected('docs.bool'), true);
            assert.strictEqual(undefined, e.name);
            assert.strictEqual(undefined, e.docs[0].name);
            assert.strictEqual(true, e.thin);
            assert.strictEqual(true, e.docs[0].bool);
            done();
          });
        })
      })
    });
  })

  it('forcing inclusion of a deselected schema path works', function (done) {
    var db = start();
    var excluded = new Schema({
        thin: Boolean
      , name: { type: String, select: false }
      , docs: [new Schema({ name: { type: String, select: false },  bool: Boolean })]
    });

    var M = db.model('ForcedInclusionOfPath', excluded);
    M.create({ thin: false, name: '1 meter', docs:[{name:'test', bool:false}] }, function (err, d) {
      assert.ifError(err);

      M.findById(d)
      .select('+name +docs.name')
      .exec(function (err, doc) {
        assert.ifError(err);
        assert.equal(false, doc.thin);
        assert.equal('1 meter', doc.name);
        assert.equal(false, doc.docs[0].bool);
        assert.equal('test', doc.docs[0].name);
        assert.equal(d.id, doc.id);

        M.findById(d)
        .select('+name -thin +docs.name -docs.bool')
        .exec(function (err, doc) {
          assert.ifError(err);
          assert.equal(undefined, doc.thin);
          assert.equal('1 meter', doc.name);
          assert.equal(undefined, doc.docs[0].bool);
          assert.equal('test', doc.docs[0].name);
          assert.equal(d.id, doc.id);

          M.findById(d)
          .select('-thin +name -docs.bool +docs.name')
          .exec(function (err, doc) {
            assert.ifError(err);
            assert.equal(undefined, doc.thin);
            assert.equal('1 meter', doc.name);
            assert.equal(undefined, doc.docs[0].bool);
            assert.equal('test', doc.docs[0].name);
            assert.equal(d.id, doc.id);

            M.findById(d)
            .select('-thin -docs.bool')
            .exec(function (err, doc) {
              db.close();
              assert.ifError(err);
              assert.equal(undefined, doc.thin);
              assert.equal(undefined, doc.name);
              assert.equal(undefined, doc.docs[0].bool);
              assert.equal(undefined, doc.docs[0].name);
              assert.equal(d.id, doc.id);
              done();
            });
          });
        });
      });
    });
  });

  it('conflicting schematype path selection should not error', function (done) {
    var db =start()

    var schema = new Schema({
        thin: Boolean
      , name: { type: String, select: true }
      , conflict: { type: String, select: false}
    });

    var S = db.model('ConflictingBySchemaType', schema);
    S.create({ thin: true, name: 'bing', conflict: 'crosby' },function (err, s) {
      assert.strictEqual(null, err);
      assert.equal(s.name, 'bing');
      assert.equal(s.conflict, 'crosby');

      var pending = 2;
      function cb (err, s) {
        if (!--pending) {
          db.close();
          done();
        }
        if (Array.isArray(s)) s = s[0];
        assert.ifError(err);
        assert.equal(s.name, 'bing');
        assert.equal(undefined, s.conflict);
      }

      S.findById(s).exec(cb);
      S.find({ _id: s._id }).exec(cb);
    });
  })

  it('selecting _id works with excluded schematype path', function (done) {
    var db = start();

    var schema = new Schema({
        name: { type: String, select: false}
    });

    var M = db.model('SelectingOnly_idWithExcludedSchemaType', schema);
    M.find().select('_id -name').exec(function (err) {
      assert.ok(err instanceof Error, 'conflicting path selection error should be instance of Error');

      M.find().select('_id').exec(function (err) {
        db.close();
        assert.ifError(err, err && err.stack);
        done();
      });
    });
  });

  it('selecting _id works with excluded schematype path on sub doc', function (done) {
    var db = start();

    var schema = new Schema({
        docs: [new Schema({name: { type: String, select: false}})]
    });

    var M = db.model('SelectingOnly_idWithExcludedSchemaType', schema);
    M.find().select('_id -docs.name').exec(function (err) {
      assert.ok(err instanceof Error, 'conflicting path selection error should be instance of Error');

      M.find().select('_id').exec(function (err) {
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
        name: { type: String }
      , age: Number
    }, { collection: coll });
    var M = db.model('InclusiveExclusiveCombosWork', schema);

    var schema1 = new Schema({
        name: { type: String, select: false }
      , age: Number
    }, { collection: coll });
    var S = db.model('InclusiveExclusiveCombosWorkWithSchemaSelectionFalse', schema1);

    var schema2 = new Schema({
        name: { type: String, select: true }
      , age: Number
    }, { collection: coll });
    var T = db.model('InclusiveExclusiveCombosWorkWithSchemaSelectionTrue', schema2);

    function useId (M, id, cb) {
      M.findOne().select('_id -name').exec(function (err, d) {
        assert.ok(err);
        assert.ok(!d);
        M.findOne().select('-_id name').exec(function (err, d) {
          // mongo special case for exclude _id + include path
          assert.ifError(err);
          assert.equal(undefined, d.id);
          assert.equal('ssd', d.name);
          assert.equal(undefined, d.age);
          M.findOne().select('-_id -name').exec(function (err, d) {
            assert.ifError(err);
            assert.equal(undefined, d.id);
            assert.equal(undefined, d.name);
            assert.equal(0, d.age);
            M.findOne().select('_id name').exec(function (err, d) {
              assert.ifError(err);
              assert.equal(id, d.id);
              assert.equal('ssd', d.name);
              assert.equal(undefined, d.age);
              cb();
            });
          });
        });
      });
    }

    function nonId (M, id, cb) {
      M.findOne().select('age -name').exec(function (err, d) {
        assert.ok(err);
        assert.ok(!d);
        M.findOne().select('-age name').exec(function (err, d) {
          assert.ok(err);
          assert.ok(!d);
          M.findOne().select('-age -name').exec(function (err, d) {
            assert.ifError(err);
            assert.equal(id, d.id);
            assert.equal(undefined, d.name);
            assert.equal(undefined, d.age);
            M.findOne().select('age name').exec(function (err, d) {
              assert.ifError(err);
              assert.equal(id, d.id);
              assert.equal('ssd', d.name);
              assert.equal(0, d.age);
              cb();
            });
          });
        });
      });
    }

    M.create({ name: 'ssd', age: 0 }, function (err, d) {
      assert.ifError(err);
      var id = d.id;
      useId(M, id, function () {
        nonId(M, id, function () {
          useId(S, id, function () {
            nonId(S, id, function () {
              useId(T, id, function () {
                nonId(T, id, function () {
                  db.close();
                  done();
                })
              });
            })
          });
        })
      });
    });
  })

})
