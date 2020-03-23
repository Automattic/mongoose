'use strict';

/**
 * Test dependencies.
 */

const start = require('./common');

const assert = require('assert');
const co = require('co');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('schema options.timestamps', function() {
  let conn;

  before(function() {
    conn = start();
  });

  after(function(done) {
    conn.close(done);
  });

  describe('create schema with options.timestamps', function() {
    it('should have createdAt and updatedAt fields', function(done) {
      const TestSchema = new Schema({
        name: String
      }, {
        timestamps: true
      });

      assert.ok(TestSchema.path('createdAt'));
      assert.ok(TestSchema.path('updatedAt'));
      done();
    });

    it('should have createdAt and updatedAt fields', function(done) {
      const TestSchema = new Schema({
        name: String
      });

      TestSchema.set('timestamps', true);

      assert.ok(TestSchema.path('createdAt'));
      assert.ok(TestSchema.path('updatedAt'));
      done();
    });

    it('should have created and updatedAt fields', function(done) {
      const TestSchema = new Schema({
        name: String
      }, {
        timestamps: {
          createdAt: 'created'
        }
      });

      assert.ok(TestSchema.path('created'));
      assert.ok(TestSchema.path('updatedAt'));
      done();
    });

    it('should have created and updatedAt fields', function(done) {
      const TestSchema = new Schema({
        name: String
      });

      TestSchema.set('timestamps', {
        createdAt: 'created'
      });

      assert.ok(TestSchema.path('created'));
      assert.ok(TestSchema.path('updatedAt'));
      done();
    });

    it('should have created and updated fields', function(done) {
      const TestSchema = new Schema({
        name: String
      }, {
        timestamps: {
          createdAt: 'created',
          updatedAt: 'updated'
        }
      });

      assert.ok(TestSchema.path('created'));
      assert.ok(TestSchema.path('updated'));
      done();
    });

    it('should have just createdAt if updatedAt set to falsy', function(done) {
      const TestSchema = new Schema({
        name: String
      });

      TestSchema.set('timestamps', {
        updatedAt: false
      });

      assert.ok(TestSchema.path('createdAt'));
      assert.ok(!TestSchema.path('updatedAt'));
      done();
    });

    it('should have created and updated fields', function(done) {
      const TestSchema = new Schema({
        name: String
      });

      TestSchema.set('timestamps', {
        createdAt: 'created',
        updatedAt: 'updated'
      });

      assert.ok(TestSchema.path('created'));
      assert.ok(TestSchema.path('updated'));
      done();
    });

    it('should not override createdAt when not selected (gh-4340)', function(done) {
      const TestSchema = new Schema({
        name: String
      }, {
        timestamps: true
      });

      conn.deleteModel(/Test/);
      const Test = conn.model('Test', TestSchema);

      Test.create({
        name: 'hello'
      }, function(err, doc) {
        // Let’s save the dates to compare later.
        const createdAt = doc.createdAt;
        const updatedAt = doc.updatedAt;

        assert.ok(doc.createdAt);

        Test.findById(doc._id, { name: true }, function(err, doc) {
          // The dates shouldn’t be selected here.
          assert.ok(!doc.createdAt);
          assert.ok(!doc.updatedAt);

          doc.name = 'world';

          doc.save(function(err, doc) {
            // Let’s save the new updatedAt date as it should have changed.
            const newUpdatedAt = doc.updatedAt;

            assert.ok(!doc.createdAt);
            assert.ok(doc.updatedAt);

            Test.findById(doc._id, function(err, doc) {
              // Let’s make sure that everything is working again by
              // comparing the dates with the ones we saved.
              assert.equal(doc.createdAt.valueOf(), createdAt.valueOf());
              assert.notEqual(doc.updatedAt.valueOf(), updatedAt.valueOf());
              assert.equal(doc.updatedAt.valueOf(), newUpdatedAt.valueOf());

              done();
            });
          });
        });
      });
    });
  });

  describe('auto update createdAt and updatedAt when create/save/update document', function() {
    let CatSchema;
    let Cat;

    before(function() {
      CatSchema = new Schema({
        name: String,
        hobby: String
      }, { timestamps: true });
      Cat = conn.model('Cat', CatSchema);
      return Cat.deleteMany({}).then(() => Cat.create({ name: 'newcat' }));
    });

    it('should have fields when create', function(done) {
      const cat = new Cat({ name: 'newcat' });
      cat.save(function(err, doc) {
        assert.ok(doc.createdAt);
        assert.ok(doc.updatedAt);
        assert.ok(doc.createdAt.getTime() === doc.updatedAt.getTime());
        done();
      });
    });

    it('should have fields when create with findOneAndUpdate', function(done) {
      Cat.findOneAndUpdate({ name: 'notexistname' }, { $set: {} }, { upsert: true, new: true }, function(err, doc) {
        assert.ok(doc.createdAt);
        assert.ok(doc.updatedAt);
        assert.ok(doc.createdAt.getTime() === doc.updatedAt.getTime());
        done();
      });
    });

    it('should change updatedAt when save', function(done) {
      Cat.findOne({ name: 'newcat' }, function(err, doc) {
        const old = doc.updatedAt;

        doc.hobby = 'coding';

        doc.save(function(err, doc) {
          assert.ok(doc.updatedAt.getTime() > old.getTime());
          done();
        });
      });
    });

    it('should not change updatedAt when save with no modifications', function(done) {
      Cat.findOne({ name: 'newcat' }, function(err, doc) {
        const old = doc.updatedAt;

        doc.save(function(err, doc) {
          assert.ok(doc.updatedAt.getTime() === old.getTime());
          done();
        });
      });
    });

    it('can skip with timestamps: false (gh-7357)', function() {
      return co(function*() {
        const cat = yield Cat.findOne();

        const old = cat.updatedAt;

        yield cb => setTimeout(() => cb(), 10);

        cat.hobby = 'fishing';

        yield cat.save({ timestamps: false });

        assert.strictEqual(cat.updatedAt, old);
      });
    });

    it('should change updatedAt when findOneAndUpdate', function(done) {
      Cat.create({ name: 'test123' }, function(err) {
        assert.ifError(err);
        Cat.findOne({ name: 'test123' }, function(err, doc) {
          const old = doc.updatedAt;
          Cat.findOneAndUpdate({ name: 'test123' }, { $set: { hobby: 'fish' } }, { new: true }, function(err, doc) {
            assert.ok(doc.updatedAt.getTime() > old.getTime());
            done();
          });
        });
      });
    });

    it('insertMany with createdAt off (gh-6381)', function() {
      const CatSchema = new Schema({
        name: String,
        createdAt: {
          type: Date,
          default: function() {
            return new Date('2013-06-01');
          }
        }
      },
      {
        timestamps: {
          createdAt: false,
          updatedAt: true
        }
      });

      conn.deleteModel(/Test/);
      const Cat = conn.model('Test', CatSchema);

      const d = new Date('2011-06-01');

      return co(function*() {
        yield Cat.deleteMany({});
        yield Cat.insertMany([{ name: 'a' }, { name: 'b', createdAt: d }]);

        const cats = yield Cat.find().sort('name');

        assert.equal(cats[0].createdAt.valueOf(), new Date('2013-06-01').valueOf());
        assert.equal(cats[1].createdAt.valueOf(), new Date('2011-06-01').valueOf());
      });
    });

    it('should have fields when update', function(done) {
      Cat.findOne({ name: 'newcat' }, function(err, doc) {
        const old = doc.updatedAt;
        Cat.update({ name: 'newcat' }, { $set: { hobby: 'fish' } }, function() {
          Cat.findOne({ name: 'newcat' }, function(err, doc) {
            assert.ok(doc.updatedAt.getTime() > old.getTime());
            done();
          });
        });
      });
    });

    it('should change updatedAt when updateOne', function(done) {
      Cat.findOne({ name: 'newcat' }, function(err, doc) {
        const old = doc.updatedAt;
        Cat.updateOne({ name: 'newcat' }, { $set: { hobby: 'fish' } }, function() {
          Cat.findOne({ name: 'newcat' }, function(err, doc) {
            assert.ok(doc.updatedAt.getTime() > old.getTime());
            done();
          });
        });
      });
    });

    it('should change updatedAt when updateMany', function(done) {
      Cat.findOne({ name: 'newcat' }, function(err, doc) {
        const old = doc.updatedAt;
        Cat.updateMany({ name: 'newcat' }, { $set: { hobby: 'fish' } }, function() {
          Cat.findOne({ name: 'newcat' }, function(err, doc) {
            assert.ok(doc.updatedAt.getTime() > old.getTime());
            done();
          });
        });
      });
    });

    it('nested docs (gh-4049)', function(done) {
      const GroupSchema = new Schema({
        cats: [CatSchema]
      });

      conn.deleteModel(/Test/);
      const Group = conn.model('Test', GroupSchema);
      const now = Date.now();
      Group.create({ cats: [{ name: 'Garfield' }] }, function(error, group) {
        assert.ifError(error);
        assert.ok(group.cats[0].createdAt);
        assert.ok(group.cats[0].createdAt.getTime() >= now);
        done();
      });
    });

    it('nested docs with push (gh-4049)', function(done) {
      const GroupSchema = new Schema({
        cats: [CatSchema]
      });

      conn.deleteModel(/Test/);
      const Group = conn.model('Test', GroupSchema);
      const now = Date.now();
      Group.create({ cats: [{ name: 'Garfield' }] }, function(error, group) {
        assert.ifError(error);
        group.cats.push({ name: 'Keanu' });
        group.save(function(error) {
          assert.ifError(error);
          Group.findById(group._id, function(error, group) {
            assert.ifError(error);
            assert.ok(group.cats[1].createdAt);
            assert.ok(group.cats[1].createdAt.getTime() > now);
            done();
          });
        });
      });
    });

    after(function() {
      return Cat.deleteMany({});
    });
  });

  it('timestamps with number types (gh-3957)', function() {
    const schema = Schema({
      createdAt: Number,
      updatedAt: Number,
      name: String
    }, { timestamps: true });
    conn.deleteModel(/Test/);
    const Model = conn.model('Test', schema);
    const start = Date.now();

    return co(function*() {
      const doc = yield Model.create({ name: 'test' });

      assert.equal(typeof doc.createdAt, 'number');
      assert.equal(typeof doc.updatedAt, 'number');
      assert.ok(doc.createdAt >= start);
      assert.ok(doc.updatedAt >= start);
    });
  });

  it('timestamps with custom timestamp (gh-3957)', function() {
    const schema = Schema({
      createdAt: Number,
      updatedAt: Number,
      name: String
    }, {
      timestamps: { currentTime: () => 42 }
    });
    conn.deleteModel(/Test/);
    const Model = conn.model('Test', schema);

    return co(function*() {
      const doc = yield Model.create({ name: 'test' });

      assert.equal(typeof doc.createdAt, 'number');
      assert.equal(typeof doc.updatedAt, 'number');
      assert.equal(doc.createdAt, 42);
      assert.equal(doc.updatedAt, 42);
    });
  });
});
