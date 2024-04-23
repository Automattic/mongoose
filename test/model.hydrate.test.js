/**
 * Test dependencies.
 */

'use strict';

const start = require('./common');

const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const DocumentObjectId = mongoose.Types.ObjectId;

describe('model', function() {
  let schemaB;
  let schemaC;

  before(function() {
    schemaB = new Schema({
      title: String,
      type: String
    }, { discriminatorKey: 'type' });

    schemaC = new Schema({
      test: {
        type: String,
        default: 'test'
      }
    }, { discriminatorKey: 'type' });
  });

  describe('hydrate()', function() {
    let db;
    let B;
    let C;
    let Breakfast;

    let breakfastSchema;

    before(function() {
      breakfastSchema = new Schema({
        food: { type: String, enum: ['bacon', 'eggs'] }
      });

      db = start();
      B = db.model('Test', schemaB);
      C = B.discriminator('C', schemaC);
      Breakfast = db.model('Test1', breakfastSchema);

      return db;
    });

    after(async function() {
      await db.close();
    });

    it('hydrates documents with no modified paths', function() {
      const hydrated = B.hydrate({ _id: '541085faedb2f28965d0e8e7', title: 'chair' });

      assert.ok(hydrated.get('_id') instanceof DocumentObjectId);
      assert.equal(hydrated.title, 'chair');

      assert.equal(hydrated.isNew, false);
      assert.equal(hydrated.isModified(), false);
      assert.equal(hydrated.isModified('title'), false);
    });

    it('runs validators', async function() {
      const hydrated = Breakfast.hydrate({
        _id: '000000000000000000000001',
        food: 'waffles'
      });

      const err = await hydrated.validate().then(() => null, err => err);

      assert.ok(err);
      assert.ok(err.errors.food);
      assert.deepEqual(['food'], Object.keys(err.errors));
    });

    it('supports projection (gh-9209)', function() {
      const schema = new Schema({
        prop: String,
        arr: [String]
      });
      const Model = db.model('Test2', schema);

      const doc = Model.hydrate({ prop: 'test' }, { arr: 0 });

      assert.equal(doc.isNew, false);
      assert.equal(doc.isModified(), false);
      assert.ok(!doc.$__delta());
    });

    it('works correctly with model discriminators', function() {
      const hydrated = B.hydrate({ _id: '541085faedb2f28965d0e8e8', title: 'chair', type: 'C' });

      assert.equal(hydrated.test, 'test');
      assert.deepEqual(hydrated.schema.tree, C.schema.tree);
    });
    it('should deeply hydrate the document with the `hydratedPopulatedDocs` option (gh-4727)', async function() {
      const userSchema = new Schema({
        name: String
      });
      const companySchema = new Schema({
        name: String,
        users: [{ ref: 'User', type: Schema.Types.ObjectId }]
      });

      db.model('UserTestHydrate', userSchema);
      const Company = db.model('CompanyTestHyrdrate', companySchema);

      const users = [{ _id: new mongoose.Types.ObjectId(), name: 'Val' }];
      const company = { _id: new mongoose.Types.ObjectId(), name: 'Booster', users: [users[0]] };

      const C = Company.hydrate(company, null, { hydratedPopulatedDocs: true });
      assert.equal(C.users[0].name, 'Val');
    });
    it('should hydrate documents in virtual populate (gh-14503)', async function() {
      const StorySchema = new Schema({
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User'
        },
        title: {
          type: String
        }
      }, { timestamps: true });

      const UserSchema = new Schema({
        name: String
      }, { timestamps: true });

      UserSchema.virtual('stories', {
        ref: 'Story',
        localField: '_id',
        foreignField: 'userId'
      });
      UserSchema.virtual('storiesCount', {
        ref: 'Story',
        localField: '_id',
        foreignField: 'userId',
        count: true
      });

      const User = db.model('User', UserSchema);
      const Story = db.model('Story', StorySchema);

      const user = await User.create({ name: 'Alex' });
      const story1 = await Story.create({ title: 'Ticket 1', userId: user._id });
      const story2 = await Story.create({ title: 'Ticket 2', userId: user._id });

      const populated = await User.findOne({ name: 'Alex' }).populate(['stories', 'storiesCount']).lean();
      const hydrated = User.hydrate(
        JSON.parse(JSON.stringify(populated)),
        null,
        { hydratedPopulatedDocs: true }
      );

      assert.equal(hydrated.stories[0]._id.toString(), story1._id.toString());
      assert(typeof hydrated.stories[0]._id == 'object', typeof hydrated.stories[0]._id);
      assert(hydrated.stories[0]._id instanceof mongoose.Types.ObjectId);
      assert(typeof hydrated.stories[0].createdAt == 'object');
      assert(hydrated.stories[0].createdAt instanceof Date);

      assert.equal(hydrated.stories[1]._id.toString(), story2._id.toString());
      assert(typeof hydrated.stories[1]._id == 'object');

      assert(hydrated.stories[1]._id instanceof mongoose.Types.ObjectId);
      assert(typeof hydrated.stories[1].createdAt == 'object');
      assert(hydrated.stories[1].createdAt instanceof Date);

      assert.strictEqual(hydrated.storiesCount, 2);
    });
  });
});
