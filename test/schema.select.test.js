
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

      var pending = 3;
      function cb (err, s) {
        if (!--pending) {
          db.close();
          done();
        }

        if (Array.isArray(s)) s = s[0];
        assert.strictEqual(null, err);
        assert.equal(false, s.isSelected('name'));
        assert.equal(false, s.isSelected('docs.name'));
        assert.strictEqual(undefined, s.name);
      }

      S.findById(s).select({thin:0, 'docs.bool':0}).exec(cb);
      S.find({ _id: s._id }).select('thin docs.bool').exec(cb);
      S.findById(s, cb);
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

      var pending = 2;
      function cb (err, s) {
        if (!--pending) {
          db.close();
          done();
        }
        if (Array.isArray(s)) s = s[0];
        assert.strictEqual(null, err);
        assert.strictEqual(true, s.isSelected('name'));
        assert.strictEqual(true, s.isSelected('docs.name'));
        assert.equal(s.name, 'the included');
      }

      S.findById(s).select({thin:0, 'docs.bool':0}).exec(cb);
      S.find({ _id: s._id }).select('thin docs.bool').exec(cb);
    });
  });

  it('overriding schematype select options', function (done) {
    var db =start()

    var selected = new Schema({
        thin: Boolean
      , name: { type: String, select: true }
      , docs: [new Schema({ name: { type: String, select: true }, bool: Boolean })]
    });
    var excluded = new Schema({
        thin: Boolean
      , name: { type: String, select: false }
      , docs: [new Schema({ name: { type: String, select: false }, bool: Boolean})]
    });

    var S = db.model('OverriddingSelectedBySchemaType', selected);
    var E = db.model('OverriddingExcludedBySchemaType', excluded);

    var pending = 4;

    S.create({ thin: true, name: 'the included', docs: [{name:'test',bool: true}] },function (err, s) {
      assert.ifError(err);
      assert.equal(s.name, 'the included');
      assert.equal(s.docs[0].name, 'test');

      S.find({ _id: s._id }).select('thin name docs.bool docs.name').exec(function (err, s) {
        if (!--pending) {
          db.close();
          done();
        }
        s = s[0];
        assert.ifError(err);
        assert.strictEqual(true, s.isSelected('name'));
        assert.strictEqual(true, s.isSelected('thin'));
        assert.strictEqual(true, s.isSelected('docs.name'));
        assert.strictEqual(true, s.isSelected('docs.bool'));
        assert.equal(s.name, 'the included');
        assert.equal(s.docs[0].name, 'test');
        assert.ok(s.thin);
        assert.ok(s.docs[0].bool);
      });

      S.findById(s).select({'name':0, 'docs.name':0}).exec(function (err, s) {
        if (!--pending) {
          db.close();
          done();
        }
        assert.strictEqual(null, err);
        assert.equal(false, s.isSelected('name'))
        assert.equal(true, s.isSelected('thin'))
        assert.equal(false, s.isSelected('docs.name'))
        assert.equal(true, s.isSelected('docs.bool'))
        assert.strictEqual(undefined, s.name);
        assert.strictEqual(undefined, s.docs[0].name);
        assert.equal(true, s.thin);
        assert.equal(true, s.docs[0].bool);
      });
    });

    E.create({ thin: true, name: 'the excluded',docs:[{name:'test',bool:true}] },function (err, e) {
      assert.ifError(err);
      assert.equal(e.name, 'the excluded');
      assert.equal(e.docs[0].name, 'test');

      E.find({ _id: e._id }).select('thin name docs.name docs.bool').exec(function (err, e) {
        if (!--pending) {
          db.close();
          done();
        }
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
      });

      E.findById(e).select({'name':0, 'docs.name': 0}).exec(function (err, e) {
        if (!--pending) {
          db.close();
          done();
        }
        assert.strictEqual(null, err);
        assert.equal(e.isSelected('name'),false)
        assert.equal(e.isSelected('thin'), true);
        assert.equal(e.isSelected('docs.name'),false)
        assert.equal(e.isSelected('docs.bool'), true);
        assert.strictEqual(undefined, e.name);
        assert.strictEqual(undefined, e.docs[0].name);
        assert.strictEqual(true, e.thin);
        assert.strictEqual(true, e.docs[0].bool);
      });
    });
  })

  it('conflicting schematype path selection should error', function (done) {
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
        assert.ok(err);
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
    M.find().select({_id:1, name:0}).exec(function (err) {
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
    M.find().select({_id:1, 'docs.name':0}).exec(function (err) {
      assert.ok(err instanceof Error, 'conflicting path selection error should be instance of Error');

      M.find().select('_id').exec(function (err) {
        db.close();
        assert.ifError(err, err && err.stack);
        done();
      });
    });
  });
})
