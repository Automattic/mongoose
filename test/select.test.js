
/**
 * Test dependencies.
 */

var start = require('./common')
  , should = require('should')
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

module.exports = {

  'excluding paths through schematype': function () {
    var db =start()

    var schema = new Schema({
        thin: Boolean
      , name: { type: String, select: false}
    });

    var S = db.model('ExcludingBySchemaType', schema);
    S.create({ thin: true, name: 'the excluded' },function (err, s) {
      should.strictEqual(null, err);
      s.name.should.equal('the excluded');

      var pending = 3;
      function done (err, s) {
        --pending || db.close();
        if (Array.isArray(s)) s = s[0];
        should.strictEqual(null, err);
        s.isSelected('name').should.be.false;
        should.strictEqual(undefined, s.name);
      }

      S.findById(s).select('-thin').exec(done);
      S.find({ _id: s._id }).select('thin').exec(done);
      S.findById(s, done);
    });
  },

  'including paths through schematype': function () {
    var db =start()

    var schema = new Schema({
        thin: Boolean
      , name: { type: String, select: true }
    });

    var S = db.model('IncludingBySchemaType', schema);
    S.create({ thin: true, name: 'the included' },function (err, s) {
      should.strictEqual(null, err);
      s.name.should.equal('the included');

      var pending = 2;
      function done (err, s) {
        --pending || db.close();
        if (Array.isArray(s)) s = s[0];
        should.strictEqual(null, err);
        s.isSelected('name').should.be.true;
        s.name.should.equal('the included');
      }

      S.findById(s).select('-thin').exec(done);
      S.find({ _id: s._id }).select('thin').exec(done);
    });
  },

  'overriding schematype select options': function () {
    var db =start()

    var selected = new Schema({
        thin: Boolean
      , name: { type: String, select: true }
    });
    var excluded = new Schema({
        thin: Boolean
      , name: { type: String, select: false }
    });

    var S = db.model('OverriddingSelectedBySchemaType', selected);
    var E = db.model('OverriddingExcludedBySchemaType', excluded);

    var pending = 4;

    S.create({ thin: true, name: 'the included' },function (err, s) {
      should.strictEqual(null, err);
      s.name.should.equal('the included');

      S.find({ _id: s._id }).select('thin name').exec(function (err, s) {
        --pending || db.close();
        s = s[0];
        should.strictEqual(null, err);
        s.isSelected('name').should.be.true;
        s.isSelected('thin').should.be.true;
        s.name.should.equal('the included');
        s.thin.should.be.true;
      });

      S.findById(s).select('-name').exec(function (err, s) {
        --pending || db.close();
        should.strictEqual(null, err);
        s.isSelected('name').should.be.false;
        s.isSelected('thin').should.be.true;
        should.equal(undefined, s.name);
        should.equal(true, s.thin);
      })
    });

    E.create({ thin: true, name: 'the excluded' },function (err, e) {
      should.strictEqual(null, err);
      e.name.should.equal('the excluded');

      E.find({ _id: e._id }).select('thin name').exec(function (err, e) {
        --pending || db.close();
        e = e[0];
        should.strictEqual(null, err);
        e.isSelected('name').should.be.true;
        e.isSelected('thin').should.be.true;
        e.name.should.equal('the excluded');
        e.thin.should.be.true;
      });

      E.findById(e).select('-name').exec(function (err, e) {
        --pending || db.close();
        should.strictEqual(null, err);
        e.isSelected('name').should.be.false;
        e.isSelected('thin').should.be.true;
        should.equal(undefined, e.name);
        should.equal(true, e.thin);
      })
    });
  },

  'forcing inclusion of a deselected schema path works': function () {
    var db = start();
    var excluded = new Schema({
        thin: Boolean
      , name: { type: String, select: false }
    });

    var M = db.model('ForcedInclusionOfPath', excluded);
    M.create({ thin: false, name: '1 meter' }, function (err, d) {
      assert.ifError(err);

      M.findById(d)
      .select('+name')
      .exec(function (err, doc) {
        assert.ifError(err);
        assert.equal(false, doc.thin);
        assert.equal('1 meter', doc.name);
        assert.equal(d.id, doc.id);

        M.findById(d)
        .select('+name -thin')
        .exec(function (err, doc) {
          assert.ifError(err);
          assert.equal(undefined, doc.thin);
          assert.equal('1 meter', doc.name);
          assert.equal(d.id, doc.id);

          M.findById(d)
          .select('-thin +name')
          .exec(function (err, doc) {
            assert.ifError(err);
            assert.equal(undefined, doc.thin);
            assert.equal('1 meter', doc.name);
            assert.equal(d.id, doc.id);

            M.findById(d)
            .select('-thin')
            .exec(function (err, doc) {
              db.close();
              assert.ifError(err);
              assert.equal(undefined, doc.thin);
              assert.equal(undefined, doc.name);
              assert.equal(d.id, doc.id);
            });
          });
        });
      });
    });
  },

  'conflicting schematype path selection should not error': function () {
    var db =start()

    var schema = new Schema({
        thin: Boolean
      , name: { type: String, select: true }
      , conflict: { type: String, select: false}
    });

    var S = db.model('ConflictingBySchemaType', schema);
    S.create({ thin: true, name: 'bing', conflict: 'crosby' },function (err, s) {
      should.strictEqual(null, err);
      s.name.should.equal('bing');
      s.conflict.should.equal('crosby');

      var pending = 2;
      function done (err, s) {
        --pending || db.close();
        if (Array.isArray(s)) s = s[0];
        should.equal(true, !err);
        s.name.should.equal('bing');
        assert.equal(undefined, s.conflict);
      }

      S.findById(s).exec(done);
      S.find({ _id: s._id }).exec(done);
    });
  },

  'selecting _id works with excluded schematype path': function () {
    var db = start();

    var schema = new Schema({
        name: { type: String, select: false}
    });

    var M = db.model('SelectingOnly_idWithExcludedSchemaType', schema);
    M.find().select('_id -name').exec(function (err) {
      // TODO port to driver.should be an Error not a string
      assert.ok(err instanceof Error, 'conflicting path selection error should be instance of Error');

      M.find().select('_id').exec(function (err) {
        db.close();
        assert.ifError(err, err && err.stack);
      });
    });
  },

  'all inclusive/exclusive combos work': function() {
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
                })
              });
            })
          });
        })
      });
    });
  },

};
