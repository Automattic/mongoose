'use strict';

/**
 * Test dependencies.
 */

const start = require('./common');

const assert = require('assert');
const utils = require('../lib/utils');
const util = require('./util');
const MongooseError = require('../lib/error/mongooseError');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;
const DocObjectId = mongoose.Types.ObjectId;

/**
 * Tests.
 */

describe('model: populate:', function() {
  this.timeout(8000);

  let userSchema;
  let commentSchema;
  let blogPostSchema;
  let db;
  let db2;

  before(function() {
    userSchema = new Schema({
      name: String,
      email: String,
      gender: { type: String, enum: ['male', 'female'], default: 'male' },
      age: { type: Number, default: 21 },
      blogposts: [{ type: ObjectId, ref: 'BlogPost' }],
      followers: [{ type: ObjectId, ref: 'User' }]
    });

    /**
     * Comment subdocument schema.
     */

    commentSchema = new Schema({
      asers: [{ type: ObjectId, ref: 'User' }],
      _creator: { type: ObjectId, ref: 'User' },
      content: String
    });

    /**
     * Blog post schema.
     */

    blogPostSchema = new Schema({
      _creator: { type: ObjectId, ref: 'User' },
      title: String,
      comments: [commentSchema],
      fans: [{ type: ObjectId, ref: 'User' }]
    });

    db = start();
  });

  after(async function() {
    await db.close();

    if (db2) {
      await db2.close();
    }
  });

  beforeEach(() => db.deleteModel(/.*/));
  afterEach(async() => {
    return Promise.allSettled([util.clearTestData(db), db2 ? util.clearTestData(db2) : Promise.resolve()]);
  });
  afterEach(() => {
    require('./util').stopRemainingOps(db);

    if (db2) {
      require('./util').stopRemainingOps(db2);
    }
  });

  it('populating array of object', async function() {
    const BlogPost = db.model('BlogPost', blogPostSchema);
    const User = db.model('User', userSchema);

    const user1 = await User.create({ name: 'User 1' });
    const user2 = await User.create({ name: 'User 2' });


    const post = await BlogPost.create({
      title: 'Woot',
      _creator: user1._id,
      comments: [
        { _creator: user1._id, content: 'Woot woot' },
        { _creator: user2._id, content: 'Wha wha' }
      ]
    });

    // Does not throw
    await post.populate('comments');
  });

  it('deep population (gh-3103)', async function() {
    const BlogPost = db.model('BlogPost', blogPostSchema);
    const User = db.model('User', userSchema);

    const user1 = await User.create({ name: 'User 01' });

    const user2 = await User.create({ name: 'User 02', followers: [user1._id] });

    const user3 = await User.create({ name: 'User 03', followers: [user2._id] });


    const post = await BlogPost.create({
      title: 'w00tabulous',
      _creator: user3._id
    });


    const post2 = await BlogPost
      .findById(post._id)
      .select('_creator')
      .populate({
        path: '_creator',
        model: 'User',
        select: 'name followers',
        populate: [{
          path: 'followers',
          select: 'name followers',
          options: { limit: 5 },
          populate: { // can also use a single object instead of array of objects
            path: 'followers',
            select: 'name',
            options: { limit: 2 }
          }
        }]
      })
      .exec();

    assert.ok(post2._creator);
    assert.equal(post2._creator.name, 'User 03');
    assert.ok(post2._creator.followers);
    assert.ok(post2._creator.followers[0]);
    assert.equal(post2._creator.followers[0].name, 'User 02');
    assert.ok(post2._creator.followers[0].followers);
    assert.ok(post2._creator.followers[0].followers[0]);
    assert.equal(post2._creator.followers[0].followers[0].name, 'User 01');
  });

  describe('deep populate', function() {
    it('deep population with refs (gh-3507)', async function() {
      const handlerSchema = new Schema({
        name: String
      });

      const taskSchema = new Schema({
        name: String,
        handler: { type: Schema.Types.ObjectId, ref: 'Test' }
      });

      const applicationSchema = new Schema({
        name: String,
        tasks: [{ type: Schema.Types.ObjectId, ref: 'Test1' }]
      });

      const Handler = db.model('Test', handlerSchema);
      const Task = db.model('Test1', taskSchema);
      const Application = db.model('Test2', applicationSchema);

      const handler = await Handler.create({ name: 'test' });
      const task = await Task.create({ name: 'test2', handler: handler._id });
      const obj = { name: 'test3', tasks: [task._id] };
      const application = await Application.create(obj);

      const doc = await Application.findById(application._id).populate([{ path: 'tasks', populate: { path: 'handler' } }]);

      assert.ok(doc.tasks[0].handler._id);
    });

    it('multiple paths with same options (gh-3808)', async function() {
      const companySchema = new Schema({
        name: String,
        description: String
      });

      const userSchema = new Schema({
        name: String,
        company: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Company',
          select: false
        }
      });

      const commentSchema = new Schema({
        message: String,
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        target: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
      });

      const Company = db.model('Company', companySchema);
      const User = db.model('User', userSchema);
      const Comment = db.model('Comment', commentSchema);

      const company = new Company({ name: 'IniTech' });
      const user1 = new User({ name: 'Bill', company: company._id });
      const user2 = new User({ name: 'Peter', company: company._id });
      const message = new Comment({
        message: 'Problems with TPS Report',
        author: user1._id,
        target: user2._id
      });

      await company.save();
      await User.create(user1, user2);
      await message.save();

      const options = {
        path: 'author target',
        select: '_id name company',
        populate: {
          path: 'company',
          model: 'Company'
        }
      };

      const message2 = await Comment.findOne({ _id: message._id });

      await message2.populate(options);

      assert.equal(message2.target.company.name, 'IniTech');
    });
  });

  it('populating a single ref', async function() {
    const BlogPost = db.model('BlogPost', blogPostSchema);
    const User = db.model('User', userSchema);

    const creator = await User.create({
      name: 'Guillermo',
      email: 'rauchg@gmail.com'
    });

    const post = await BlogPost.create({
      title: 'woot',
      _creator: creator
    });

    const postPopulated = await BlogPost.findById(post._id).populate('_creator');

    assert.ok(postPopulated._creator instanceof User);
    assert.equal(postPopulated._creator.name, 'Guillermo');
    assert.equal(postPopulated._creator.email, 'rauchg@gmail.com');
  });

  it('not failing on null as ref', async function() {
    const BlogPost = db.model('BlogPost', blogPostSchema);
    db.model('User', userSchema);

    const createdPost = await BlogPost.create({
      title: 'woot',
      _creator: null
    });


    const foundPost = await BlogPost
      .findById(createdPost._id)
      .populate('_creator');

    assert.equal(foundPost._creator, null);
  });

  it('not failing on empty object as ref', async function() {
    const BlogPost = db.model('BlogPost', blogPostSchema);

    const post = await BlogPost.create({ title: 'woot' });

    try {
      await BlogPost.findByIdAndUpdate(post._id, { $set: { _creator: {} } });
    } catch (err) {
      assert.ok(err);
    }
  });

  it('across DBs', async function() {
    db2 = db.useDb(start.databases[1]);
    const BlogPost = db.model('BlogPost', blogPostSchema);
    const User = db2.model('User', userSchema);

    const creator = await User.create({
      name: 'Guillermo',
      email: 'rauchg@gmail.com'
    });

    const post = await BlogPost.create({
      title: 'woot',
      _creator: creator._id
    });

    const populatedPost = await BlogPost
      .findById(post._id)
      .populate({ path: '_creator', select: 'name', model: User })
      .exec();

    assert.ok(populatedPost._creator.name === 'Guillermo');
  });


  it('an error in single ref population propagates', async function() {
    const BlogPost = db.model('BlogPost', blogPostSchema);
    const User = db.model('User', userSchema);

    const creator = await User.create({
      name: 'Guillermo',
      email: 'rauchg@gmail.com'
    });

    const post = await BlogPost.create({
      title: 'woot',
      _creator: creator
    });

    const origExec = User.Query.prototype.exec;

    // mock an error
    User.Query.prototype.exec = function() {
      throw new Error('woot');
    };

    try {
      await BlogPost
        .findById(post._id)
        .populate('_creator')
        .exec();
    } catch (err) {
      assert.ok(err instanceof Error);
      assert.equal(err.message, 'woot');
      User.Query.prototype.exec = origExec;
    }
  });


  it('populating with partial fields selection', async function() {
    const BlogPost = db.model('BlogPost', blogPostSchema);
    const User = db.model('User', userSchema);

    const creator = await User.create({
      name: 'Guillermo',
      email: 'rauchg@gmail.com'
    });

    const post = await BlogPost.create({
      title: 'woot',
      _creator: creator
    });

    const postFound = await BlogPost
      .findById(post._id)
      .populate('_creator', 'email')
      .exec();

    assert.ok(postFound._creator instanceof User);
    assert.equal(postFound._creator.isInit('name'), false);
    assert.equal(postFound._creator.email, 'rauchg@gmail.com');
  });

  it('population of single oid with partial field selection and filter', async function() {
    const BlogPost = db.model('BlogPost', blogPostSchema);
    const User = db.model('User', userSchema);

    const creator = await User.create({
      name: 'Banana',
      email: 'cats@example.com'
    });

    const post = await BlogPost.create({
      title: 'woot',
      _creator: creator
    });

    const post2 = await BlogPost
      .findById(post._id)
      .populate('_creator', 'email', { name: 'Peanut' })
      .exec();

    assert.strictEqual(post2._creator, null);

    const post3 = await BlogPost
      .findById(post._id)
      .populate('_creator', 'email', { name: 'Banana' })
      .exec();

    assert.ok(post3._creator instanceof User);
    assert.equal(false, post3._creator.isInit('name'));
    assert.equal(post3._creator.email, 'cats@example.com');
  });

  it('population of undefined fields in a collection of docs', async function() {
    const BlogPost = db.model('BlogPost', blogPostSchema);
    const User = db.model('User', userSchema);
    const user = await User.create({
      name: 'Eloy',
      email: 'eloytoro@gmail.com'
    });

    await BlogPost.create({
      title: 'I have a user ref',
      _creator: user
    });

    await BlogPost.create({
      title: 'I don\'t'
    });

    const posts = await BlogPost.find().populate('_creator').exec();

    posts.forEach(function(post) {
      if ('_creator' in post) {
        assert.ok(post._creator !== null);
      }
    });
  });

  it('undefined for nested paths (gh-3859)', async function() {
    const companySchema = new mongoose.Schema({
      name: String,
      description: String
    });

    const userSchema = new mongoose.Schema({
      name: String,
      company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' }
    });

    const sampleSchema = new mongoose.Schema({
      items: [userSchema]
    });

    const Company = db.model('Company', companySchema);
    const User = db.model('User', userSchema);
    const Sample = db.model('Test', sampleSchema);

    const company = new Company({ name: 'Reynholm Industrie' });
    const user1 = new User({ name: 'Douglas', company: company._id });
    const user2 = new User({ name: 'Lambda' });
    const sample = new Sample({
      items: [user1, user2]
    });

    await company.save();
    await User.create(user1, user2);
    await sample.save();

    const _id = sample._id;

    const sample2 = await Sample.findOne({ _id });

    const opts = {
      path: 'items.company',
      options: { lean: true },
      model: Company
    };

    await Sample.populate(sample2, opts);
    assert.strictEqual(sample2.items[1].company, void 0);
  });


  it('population and changing a reference', async function() {
    const BlogPost = db.model('BlogPost', blogPostSchema);
    const User = db.model('User', userSchema);

    const creator = await User.create({
      name: 'Guillermo',
      email: 'rauchg@gmail.com'
    });

    const post = await BlogPost.create({
      title: 'woot',
      _creator: creator
    });

    const populatedPost = await BlogPost
      .findById(post._id)
      .populate('_creator')
      .exec();

    assert.ok(populatedPost._creator instanceof User);
    assert.equal(populatedPost._creator.name, 'Guillermo');
    assert.equal(populatedPost._creator.email, 'rauchg@gmail.com');

    const newCreator = await User.create({
      name: 'Aaron',
      email: 'aaron.heckmann@gmail.com'
    });

    post._creator = newCreator._id;
    assert.equal(newCreator._id, String(post._creator));

    await post.save();

    const populatedPost2 = await BlogPost
      .findById(post._id)
      .populate('_creator')
      .exec();

    assert.equal(populatedPost2._creator.name, 'Aaron');
    assert.equal(populatedPost2._creator.email, 'aaron.heckmann@gmail.com');
  });

  it('populating with partial fields selection and changing ref', async function() {
    const BlogPost = db.model('BlogPost', blogPostSchema);
    const User = db.model('User', userSchema);

    const creator = await User.create({
      name: 'Guillermo',
      email: 'rauchg@gmail.com'
    });

    const post = await BlogPost.create({
      title: 'woot',
      _creator: creator
    });

    const populatedPost = await BlogPost
      .findById(post._id)
      .populate('_creator', { name: 1 })
      .exec();

    assert.ok(populatedPost._creator instanceof User);
    assert.equal(populatedPost._creator.name, 'Guillermo');

    const newCreator = await User.create({
      name: 'Aaron',
      email: 'aaron@learnboost.com'
    });

    post._creator = newCreator._id;
    await post.save();

    const populatedPost2 = await BlogPost
      .findById(post._id)
      .populate('_creator', '-email')
      .exec();

    assert.equal(populatedPost2._creator.name, 'Aaron');
    assert.ok(!populatedPost2._creator.email);
  });

  it('populating an array of refs and fetching many', async function() {
    const BlogPost = db.model('BlogPost', blogPostSchema);
    const User = db.model('User', userSchema);

    const fan1 = await User.create({
      name: 'Fan 1',
      email: 'fan1@learnboost.com'
    });

    const fan2 = await User.create({
      name: 'Fan 2',
      email: 'fan2@learnboost.com'
    });

    const post1 = await BlogPost.create({
      title: 'Woot',
      fans: [fan1, fan2]
    });

    const post2 = await BlogPost.create({
      title: 'Woot',
      fans: [fan2, fan1]
    });

    const blogposts = await BlogPost.find({ _id: { $in: [post1._id, post2._id] } }).populate('fans');

    assert.equal(blogposts[0].fans[0].name, 'Fan 1');
    assert.equal(blogposts[0].fans[0].email, 'fan1@learnboost.com');
    assert.equal(blogposts[0].fans[1].name, 'Fan 2');
    assert.equal(blogposts[0].fans[1].email, 'fan2@learnboost.com');

    assert.equal(blogposts[1].fans[0].name, 'Fan 2');
    assert.equal(blogposts[1].fans[0].email, 'fan2@learnboost.com');
    assert.equal(blogposts[1].fans[1].name, 'Fan 1');
    assert.equal(blogposts[1].fans[1].email, 'fan1@learnboost.com');
  });

  it('an error in array reference population propagates', async function() {
    const BlogPost = db.model('BlogPost', blogPostSchema);
    const User = db.model('User', userSchema);

    const fan1 = await User.create({
      name: 'Fan 1',
      email: 'fan1@learnboost.com'
    });

    const fan2 = await User.create({
      name: 'Fan 2',
      email: 'fan2@learnboost.com'
    });

    const post1 = await BlogPost.create({
      title: 'Woot',
      fans: [fan1, fan2]
    });

    const post2 = await BlogPost.create({
      title: 'Woot',
      fans: [fan2, fan1]
    });

    // mock an error
    const origExec = User.Query.prototype.exec;
    User.Query.prototype.exec = function() {
      throw new Error('woot 2');
    };

    try {
      await BlogPost
        .find({ $or: [{ _id: post1._id }, { _id: post2._id }] })
        .populate('fans')
        .exec();

      throw new Error('should not get here');
    } catch (err) {
      assert.ok(err instanceof Error);
      assert.equal(err.message, 'woot 2');
      User.Query.prototype.exec = origExec;
    }
  });

  it('populating an array of references with fields selection', async function() {
    const BlogPost = db.model('BlogPost', blogPostSchema);
    const User = db.model('User', userSchema);

    const fan1 = await User.create({
      name: 'Fan 1',
      email: 'fan1@learnboost.com'
    });

    const fan2 = await User.create({
      name: 'Fan 2',
      email: 'fan2@learnboost.com'
    });

    const post1 = await BlogPost.create({
      title: 'Woot',
      fans: [fan1, fan2]
    });

    const post2 = await BlogPost.create({
      title: 'Woot',
      fans: [fan2, fan1]
    });

    const blogposts = await BlogPost.find({ _id: { $in: [post1._id, post2._id] } })
      .populate('fans', 'name');

    assert.equal(blogposts[0].fans[0].name, 'Fan 1');
    assert.equal(blogposts[0].fans[0].isInit('email'), false);
    assert.equal(blogposts[0].fans[1].name, 'Fan 2');
    assert.equal(blogposts[0].fans[1].isInit('email'), false);
    assert.strictEqual(blogposts[0].fans[1].email, undefined);

    assert.equal(blogposts[1].fans[0].name, 'Fan 2');
    assert.equal(blogposts[1].fans[0].isInit('email'), false);
    assert.equal(blogposts[1].fans[1].name, 'Fan 1');
    assert.equal(blogposts[1].fans[1].isInit('email'), false);
  });

  it('populating an array of references and filtering', async function() {
    const BlogPost = db.model('BlogPost', blogPostSchema);
    const User = db.model('User', userSchema);

    const fan1 = await User.create({
      name: 'Fan 1',
      email: 'fan1@learnboost.com'
    });

    const fan2 = await User.create({
      name: 'Fan 2',
      email: 'fan2@learnboost.com',
      gender: 'female'
    });

    const fan3 = await User.create({
      name: 'Fan 3',
      email: 'fan3@learnboost.com',
      gender: 'female'
    });

    const post1 = await BlogPost.create({
      title: 'Woot',
      fans: [fan1, fan2, fan3]
    });

    const post2 = await BlogPost.create({
      title: 'Woot',
      fans: [fan3, fan2, fan1]
    });

    const blogposts = await BlogPost
      .find({ _id: { $in: [post1._id, post2._id] } })
      .populate('fans', '', { gender: 'female', _id: { $in: [fan2] } })
      .exec();

    assert.equal(blogposts[0].fans.length, 1);
    assert.equal(blogposts[0].fans[0].gender, 'female');
    assert.equal(blogposts[0].fans[0].name, 'Fan 2');
    assert.equal(blogposts[0].fans[0].email, 'fan2@learnboost.com');

    assert.equal(blogposts[1].fans.length, 1);
    assert.equal(blogposts[1].fans[0].gender, 'female');
    assert.equal(blogposts[1].fans[0].name, 'Fan 2');
    assert.equal(blogposts[1].fans[0].email, 'fan2@learnboost.com');

    const blogposts2 = await BlogPost
      .find({ _id: { $in: [post1._id, post2._id] } })
      .populate('fans', false, { gender: 'female' })
      .exec();

    assert.strictEqual(blogposts2[0].fans.length, 2);
    assert.equal(blogposts2[0].fans[0].gender, 'female');
    assert.equal(blogposts2[0].fans[0].name, 'Fan 2');
    assert.equal(blogposts2[0].fans[0].email, 'fan2@learnboost.com');
    assert.equal(blogposts2[0].fans[1].gender, 'female');
    assert.equal(blogposts2[0].fans[1].name, 'Fan 3');
    assert.equal(blogposts2[0].fans[1].email, 'fan3@learnboost.com');

    assert.strictEqual(blogposts2[1].fans.length, 2);
    assert.equal(blogposts2[1].fans[0].gender, 'female');
    assert.equal(blogposts2[1].fans[0].name, 'Fan 3');
    assert.equal(blogposts2[1].fans[0].email, 'fan3@learnboost.com');
    assert.equal(blogposts2[1].fans[1].gender, 'female');
    assert.equal(blogposts2[1].fans[1].name, 'Fan 2');
    assert.equal(blogposts2[1].fans[1].email, 'fan2@learnboost.com');

  });

  it('populating an array of references and multi-filtering', async function() {
    const BlogPost = db.model('BlogPost', blogPostSchema);
    const User = db.model('User', userSchema);

    const fan1 = await User.create({
      name: 'Fan 1',
      email: 'fan1@learnboost.com'
    });

    const fan2 = await User.create({
      name: 'Fan 2',
      email: 'fan2@learnboost.com',
      gender: 'female'
    });

    const fan3 = await User.create({
      name: 'Fan 3',
      email: 'fan3@learnboost.com',
      gender: 'female',
      age: 25
    });

    const post1 = await BlogPost.create({
      title: 'Woot',
      fans: [fan1, fan2, fan3]
    });

    const post2 = await BlogPost.create({
      title: 'Woot',
      fans: [fan3, fan2, fan1]
    });

    const blogposts = await BlogPost
      .find({ _id: { $in: [post1._id, post2._id] } })
      .populate('fans', undefined, { _id: fan3 })
      .exec();

    assert.equal(blogposts[0].fans.length, 1);
    assert.equal(blogposts[0].fans[0].gender, 'female');
    assert.equal(blogposts[0].fans[0].name, 'Fan 3');
    assert.equal(blogposts[0].fans[0].email, 'fan3@learnboost.com');
    assert.equal(blogposts[0].fans[0].age, 25);

    assert.equal(blogposts[1].fans.length, 1);
    assert.equal(blogposts[1].fans[0].gender, 'female');
    assert.equal(blogposts[1].fans[0].name, 'Fan 3');
    assert.equal(blogposts[1].fans[0].email, 'fan3@learnboost.com');
    assert.equal(blogposts[1].fans[0].age, 25);

    const blogposts2 = await BlogPost
      .find({ _id: { $in: [post1._id, post2._id] } })
      .populate('fans', 0, { gender: 'female' })
      .exec();

    assert.equal(blogposts2[0].fans.length, 2);
    assert.equal(blogposts2[0].fans[0].gender, 'female');
    assert.equal(blogposts2[0].fans[0].name, 'Fan 2');
    assert.equal(blogposts2[0].fans[0].email, 'fan2@learnboost.com');
    assert.equal(blogposts2[0].fans[1].gender, 'female');
    assert.equal(blogposts2[0].fans[1].name, 'Fan 3');
    assert.equal(blogposts2[0].fans[1].email, 'fan3@learnboost.com');
    assert.equal(blogposts2[0].fans[1].age, 25);

    assert.equal(blogposts2[1].fans.length, 2);
    assert.equal(blogposts2[1].fans[0].gender, 'female');
    assert.equal(blogposts2[1].fans[0].name, 'Fan 3');
    assert.equal(blogposts2[1].fans[0].email, 'fan3@learnboost.com');
    assert.equal(blogposts2[1].fans[0].age, 25);
    assert.equal(blogposts2[1].fans[1].age, 21);
    assert.equal(blogposts2[1].fans[1].gender, 'female');
    assert.equal(blogposts2[1].fans[1].name, 'Fan 2');
    assert.equal(blogposts2[1].fans[1].email, 'fan2@learnboost.com');
  });

  it('populating an array of references and multi-filtering with field selection', async function() {
    const BlogPost = db.model('BlogPost', blogPostSchema);
    const User = db.model('User', userSchema);

    const fan1 = await User.create({
      name: 'Fan 1',
      email: 'fan1@learnboost.com'
    });

    const fan2 = await User.create({
      name: 'Fan 2',
      email: 'fan2@learnboost.com',
      gender: 'female'
    });

    const fan3 = await User.create({
      name: 'Fan 3',
      email: 'fan3@learnboost.com',
      gender: 'female',
      age: 25
    });

    const post1 = await BlogPost.create({
      title: 'Woot',
      fans: [fan1, fan2, fan3]
    });

    const post2 = await BlogPost.create({
      title: 'Woot',
      fans: [fan3, fan2, fan1]
    });

    const blogposts = await BlogPost
      .find({ _id: { $in: [post1._id, post2._id] } })
      .populate('fans', 'name email', { gender: 'female', age: 25 })
      .exec();

    assert.strictEqual(blogposts[0].fans.length, 1);
    assert.equal(blogposts[0].fans[0].name, 'Fan 3');
    assert.equal(blogposts[0].fans[0].email, 'fan3@learnboost.com');
    assert.equal(blogposts[0].fans[0].isInit('email'), true);
    assert.equal(blogposts[0].fans[0].isInit(['email']), true);
    assert.equal(blogposts[0].fans[0].isInit('gender'), false);
    assert.equal(blogposts[0].fans[0].isInit('age'), false);
    assert.equal(blogposts[0].fans[0].isInit(['email', 'age']), true);
    assert.equal(blogposts[0].fans[0].isInit(['gender', 'age']), false);

    assert.strictEqual(blogposts[1].fans.length, 1);
    assert.equal(blogposts[1].fans[0].name, 'Fan 3');
    assert.equal(blogposts[1].fans[0].email, 'fan3@learnboost.com');
    assert.equal(blogposts[1].fans[0].isInit('email'), true);
    assert.equal(blogposts[1].fans[0].isInit('gender'), false);
    assert.equal(blogposts[1].fans[0].isInit('age'), false);
  });


  it('populating an array of refs changing one and removing one', async function() {
    const BlogPost = db.model('BlogPost', blogPostSchema);
    const User = db.model('User', userSchema);

    const [fan1, fan2, fan3, fan4] = await User.create([{
      name: 'Fan 1',
      email: 'fan1@learnboost.com'
    }, {
      name: 'Fan 2',
      email: 'fan2@learnboost.com'
    }, {
      name: 'Fan 3',
      email: 'fan3@learnboost.com'
    }, {
      name: 'Fan 4',
      email: 'fan4@learnboost.com'
    }]);

    const [post1, post2] = await BlogPost.create([{
      title: 'Woot',
      fans: [fan1, fan2]
    }, {
      title: 'Woot',
      fans: [fan2, fan1]
    }]);

    const blogposts = await BlogPost.find({ _id: { $in: [post1._id, post2._id] } }).populate('fans', 'name');

    assert.equal(blogposts[0].fans[0].name, 'Fan 1');
    assert.equal(blogposts[0].fans[0].isInit('email'), false);
    assert.equal(blogposts[0].fans[1].name, 'Fan 2');
    assert.equal(blogposts[0].fans[1].isInit('email'), false);

    assert.equal(blogposts[1].fans[0].name, 'Fan 2');
    assert.equal(blogposts[1].fans[0].isInit('email'), false);
    assert.equal(blogposts[1].fans[1].name, 'Fan 1');
    assert.equal(blogposts[1].fans[1].isInit('email'), false);

    blogposts[1].fans = [fan3, fan4];

    await blogposts[1].save();

    const post = await BlogPost.findById(blogposts[1]._id, '', { populate: ['fans'] });

    assert.equal(post.fans[0].name, 'Fan 3');
    assert.equal(post.fans[1].name, 'Fan 4');

    post.fans.splice(0, 1);

    await post.save();

    const postFinal = await BlogPost.findById(post._id).populate('fans');

    assert.equal(postFinal.fans.length, 1);
    assert.equal(postFinal.fans[0].name, 'Fan 4');
  });

  describe('populating sub docs', function() {
    it('works with findById', async function() {
      const BlogPost = db.model('BlogPost', blogPostSchema);
      const User = db.model('User', userSchema);

      const user1 = await User.create({ name: 'User 1' });
      const user2 = await User.create({ name: 'User 2' });

      const post = await BlogPost.create({
        title: 'Woot',
        _creator: user1._id,
        comments: [
          { _creator: user1._id, content: 'Woot woot' },
          { _creator: user2._id, content: 'Wha wha' }
        ]
      });

      const foundPost = await BlogPost
        .findById(post._id)
        .populate('_creator')
        .populate('comments._creator');

      assert.equal(foundPost._creator.name, 'User 1');
      assert.equal(foundPost.comments[0]._creator.name, 'User 1');
      assert.equal(foundPost.comments[1]._creator.name, 'User 2');
    });

    it('works when first doc returned has empty array for populated path (gh-1055)', async function() {
      const BlogPost = db.model('BlogPost', blogPostSchema);
      const User = db.model('User', userSchema);

      const [user1, user2] = await User.create({ name: 'gh-1055-1' }, { name: 'gh-1055-2' });

      await BlogPost.create({
        title: 'gh-1055 post1',
        _creator: user1._id,
        comments: []
      }, {
        title: 'gh-1055 post2',
        _creator: user1._id,
        comments: [
          { _creator: user1._id, content: 'Woot woot', asers: [] },
          { _creator: user2._id, content: 'Wha wha', asers: [user1, user2] }
        ]
      });

      const posts = await BlogPost
        .find({ title: /gh-1055/ })
        .sort('title')
        .select('comments')
        .populate('comments._creator')
        .populate('comments.asers');

      assert.ok(posts.length);
      assert.ok(posts[1].comments[0]._creator);
      assert.equal(posts[1].comments[0]._creator.name, 'gh-1055-1');
    });
  });

  it('clears cache when array has been re-assigned (gh-2176)', async function() {
    const BlogPost = db.model('BlogPost', blogPostSchema);
    const User = db.model('User', userSchema);

    const [user1, user2] = await User.create({ name: 'aaron' }, { name: 'val' });

    await BlogPost.create({
      title: 'gh-2176',
      _creator: user1._id,
      comments: []
    });

    const posts = await BlogPost.find({ title: 'gh-2176' }).populate('_creator');

    assert.equal(posts.length, 1);
    assert.equal(posts[0]._creator.name, 'aaron');

    posts[0]._creator = user2;
    assert.equal(posts[0]._creator.name, 'val');

    const post = await posts[0].save();
    assert.equal(post._creator.name, 'val');

    const doc = await posts[0].populate('_creator');
    assert.equal(doc._creator.name, 'val');
  });

  it('populating subdocuments partially', async function() {
    const BlogPost = db.model('BlogPost', blogPostSchema);
    const User = db.model('User', userSchema);

    const user1 = await User.create({
      name: 'User 1',
      email: 'user1@learnboost.com'
    });

    const user2 = await User.create({
      name: 'User 2',
      email: 'user2@learnboost.com'
    });

    const post = await BlogPost.create({
      title: 'Woot',
      comments: [
        { _creator: user1, content: 'Woot woot' },
        { _creator: user2, content: 'Wha wha' }
      ]
    });

    const post2 = await BlogPost.findById(post._id).populate('comments._creator', 'email');

    assert.equal(post2.comments[0]._creator.email, 'user1@learnboost.com');
    assert.equal(post2.comments[0]._creator.isInit('name'), false);
    assert.equal(post2.comments[1]._creator.email, 'user2@learnboost.com');
    assert.equal(post2.comments[1]._creator.isInit('name'), false);
  });

  it('populating subdocuments partially with conditions', async function() {
    const BlogPost = db.model('BlogPost', blogPostSchema);
    const User = db.model('User', userSchema);

    const user1 = await User.create({
      name: 'User 1',
      email: 'user1@learnboost.com'
    });

    const user2 = await User.create({
      name: 'User 2',
      email: 'user2@learnboost.com'
    });

    const post = await BlogPost.create({
      title: 'Woot',
      comments: [
        { _creator: user1, content: 'Woot woot' },
        { _creator: user2, content: 'Wha wha' }
      ]
    });

    const populatedPost = await BlogPost
      .findById(post._id)
      .populate('comments._creator', { email: 1 }, { name: /User/ })
      .exec();

    assert.equal(populatedPost.comments[0]._creator.email, 'user1@learnboost.com');
    assert.equal(populatedPost.comments[0]._creator.isInit('name'), false);
    assert.equal(populatedPost.comments[1]._creator.email, 'user2@learnboost.com');
    assert.equal(populatedPost.comments[1]._creator.isInit('name'), false);
  });

  it('populating subdocs with invalid/missing subproperties', async function() {
    const BlogPost = db.model('BlogPost', blogPostSchema);
    const User = db.model('User', userSchema);

    await User.create({
      name: 'T-100',
      email: 'terminator100@learnboost.com'
    });

    const user2 = await User.create({
      name: 'T-1000',
      email: 'terminator1000@learnboost.com'
    });

    const post = await BlogPost.create({
      title: 'Woot',
      comments: [
        { _creator: null, content: 'Woot woot' },
        { _creator: user2, content: 'Wha wha' }
      ]
    });

    // non-existant subprop
    await BlogPost.findById(post._id).populate({
      path: 'comments._idontexist',
      select: 'email',
      strictPopulate: false
    });

    // add a non-schema property to the document.
    await BlogPost.collection.updateOne(
      { _id: post._id }, { $set: { 'comments.0._idontexist': user2._id } }
    );

    // allow population of unknown property by passing model name.
    const post2 = await BlogPost.findById(post._id).populate({
      path: 'comments._idontexist',
      select: 'email',
      model: 'User',
      strictPopulate: false
    });

    assert.ok(post2);
    assert.equal(post2.comments.length, 2);
    assert.ok(post2.comments[0].get('_idontexist'));
    assert.equal(String(post2.comments[0].get('_idontexist')._id), user2.id);
    assert.equal(post2.comments[0].get('_idontexist').email, 'terminator1000@learnboost.com');
    assert.equal(post2.comments[0].get('_idontexist').isInit('name'), false);
    assert.strictEqual(post2.comments[0]._creator, null);
    assert.equal(post2.comments[1]._creator.toString(), user2.id);

    // subprop is null in a doc
    const post3 = await BlogPost.findById(post._id).populate('comments._creator', 'email');

    assert.ok(post3.comments);
    assert.equal(post3.comments.length, 2);
    assert.strictEqual(post3.comments[0]._creator, null);
    assert.strictEqual(post3.comments[0].content, 'Woot woot');
    assert.equal(post3.comments[1]._creator.email, 'terminator1000@learnboost.com');
    assert.equal(post3.comments[1]._creator.isInit('name'), false);
    assert.equal(post3.comments[1].content, 'Wha wha');
  });

  it('properly handles limit per document (gh-2151)', async function() {
    const ObjectId = mongoose.Types.ObjectId;

    const user = new Schema({
      name: String,
      friends: [{
        type: Schema.ObjectId,
        ref: 'User'
      }]
    });
    const User = db.model('User', user);

    const blogpost = new Schema({
      title: String,
      tags: [String],
      author: {
        type: Schema.ObjectId,
        ref: 'User'
      }
    });
    const BlogPost = db.model('BlogPost', blogpost);

    const userIds = [new ObjectId(), new ObjectId(), new ObjectId(), new ObjectId()];
    const users = [];

    users.push({
      _id: userIds[0],
      name: 'mary',
      friends: [userIds[1], userIds[2], userIds[3]]
    });
    users.push({
      _id: userIds[1],
      name: 'bob',
      friends: [userIds[0], userIds[2], userIds[3]]
    });
    users.push({
      _id: userIds[2],
      name: 'joe',
      friends: [userIds[0], userIds[1], userIds[3]]
    });
    users.push({
      _id: userIds[3],
      name: 'sally',
      friends: [userIds[0], userIds[1], userIds[2]]
    });

    await User.create(users);

    const blogposts = [];
    blogposts.push({
      title: 'blog 1',
      tags: ['fun', 'cool'],
      author: userIds[3]
    });
    blogposts.push({
      title: 'blog 2',
      tags: ['cool'],
      author: userIds[1]
    });
    blogposts.push({
      title: 'blog 3',
      tags: ['fun', 'odd'],
      author: userIds[2]
    });

    await BlogPost.create(blogposts);

    const docs = await BlogPost.find({ tags: 'fun' }).lean().populate('author');

    const opts = { path: 'author.friends', select: 'name', options: { limit: 1 } };

    await BlogPost.populate(docs, opts);

    assert.equal(docs.length, 2);
    assert.equal(docs[0].author.friends.length, 1);
    assert.equal(docs[1].author.friends.length, 1);
    assert.equal(opts.options.limit, 1);
  });

  it('populating subdocuments partially with empty array (gh-481)', async function() {
    const BlogPost = db.model('BlogPost', blogPostSchema);
    db.model('User', userSchema);

    const post = await BlogPost.create({
      title: 'Woot',
      comments: [] // EMPTY ARRAY
    });

    const returned = await BlogPost
      .findById(post._id)
      .populate('comments._creator', 'email')
      .exec();

    assert.equal(returned.id, post.id);
  });

  it('populating subdocuments partially with null array', async function() {
    const BlogPost = db.model('BlogPost', blogPostSchema);
    db.model('User', userSchema);

    const post = await BlogPost.create({
      title: 'Woot',
      comments: null
    });

    const returned = await BlogPost
      .findById(post._id)
      .populate('comments._creator');

    assert.equal(returned.id, post.id);
  });

  it('populating subdocuments with array including nulls', async function() {
    const BlogPost = db.model('BlogPost', blogPostSchema);
    const User = db.model('User', userSchema);


    const user = new User({ name: 'hans zimmer' });
    await user.save();

    const post = await BlogPost.create({
      title: 'Woot',
      fans: []
    });

    await BlogPost.collection.updateOne({ _id: post._id }, {
      $set: { fans: [null, undefined, user.id, null] }
    });

    const returned = await BlogPost.
      findById(post._id).
      populate('fans', 'name');

    assert.equal(returned.id, post.id);
    assert.equal(returned.fans.length, 1);
  });

  it('supports `retainNullValues` to override filtering out null docs (gh-6432)', async function() {
    const BlogPost = db.model('BlogPost', blogPostSchema);
    const User = db.model('User', userSchema);


    const user = new User({ name: 'Victor Hugo' });
    await user.save();

    const post = await BlogPost.create({
      title: 'Notre-Dame de Paris',
      fans: []
    });

    await BlogPost.collection.updateOne({ _id: post._id }, {
      $set: { fans: [null, user.id, null, undefined] }
    });

    const returned = await BlogPost.
      findById(post._id).
      populate({ path: 'fans', options: { retainNullValues: true } });

    assert.equal(returned.id, post.id);
    assert.equal(returned.fans.length, 4);
    assert.strictEqual(returned.fans[0], null);
    assert.equal(returned.fans[1].name, 'Victor Hugo');
    assert.strictEqual(returned.fans[2], null);
    assert.strictEqual(returned.fans[3], null);
  });

  it('supports `retainNullValues` while suppressing _id of subdocument', async function() {
    const BlogPost = db.model('BlogPost', blogPostSchema);
    const User = db.model('User', userSchema);


    const user = new User({ name: 'Victor Hugo' });
    await user.save();
    const post = await BlogPost.create({
      title: 'Notre-Dame de Paris',
      fans: []
    });

    await BlogPost.collection.updateOne({ _id: post._id }, {
      $set: { fans: [user.id] }
    });

    await user.deleteOne();

    const returned = await BlogPost.
      findById(post._id).
      populate({ path: 'fans', select: 'name -_id', options: { retainNullValues: true } });

    assert.equal(returned.fans.length, 1);
    assert.strictEqual(returned.fans[0], null);
  });

  it('populating more than one array at a time', async function() {
    const User = db.model('User', userSchema);
    const M = db.model('Test', new Schema({
      users: [{ type: ObjectId, ref: 'User' }],
      fans: [{ type: ObjectId, ref: 'User' }],
      comments: [commentSchema]
    }));

    const [fan1, fan2, fan3] = await User.create({
      email: 'fan1@learnboost.com'
    }, {
      name: 'Fan 2',
      email: 'fan2@learnboost.com',
      gender: 'female'
    }, {
      name: 'Fan 3'
    });

    const [post1, post2] = await M.create({
      users: [fan3],
      fans: [fan1],
      comments: [
        { _creator: fan1, content: 'bejeah!' },
        { _creator: fan2, content: 'chickfila' }
      ]
    }, {
      users: [fan1],
      fans: [fan2],
      comments: [
        { _creator: fan3, content: 'hello' },
        { _creator: fan1, content: 'world' }
      ]
    });

    const posts = await M.where('_id').in([post1, post2])
      .populate('fans', 'name', { gender: 'female' })
      .populate('users', 'name', { gender: 'male' })
      .populate('comments._creator', 'email', { name: null });

    assert.ok(posts);
    assert.equal(posts.length, 2);
    const p1 = posts[0];
    const p2 = posts[1];
    assert.strictEqual(p1.fans.length, 0);
    assert.strictEqual(p2.fans.length, 1);
    assert.equal(p2.fans[0].name, 'Fan 2');
    assert.equal(p2.fans[0].isInit('email'), false);
    assert.equal(p2.fans[0].isInit('gender'), false);
    assert.equal(p1.comments.length, 2);
    assert.equal(p2.comments.length, 2);
    assert.ok(p1.comments[0]._creator.email);
    assert.ok(!p2.comments[0]._creator);
    assert.equal(p1.comments[0]._creator.email, 'fan1@learnboost.com');
    assert.equal(p2.comments[1]._creator.email, 'fan1@learnboost.com');
    assert.equal(p1.comments[0]._creator.isInit('name'), false);
    assert.equal(p2.comments[1]._creator.isInit('name'), false);
    assert.equal(p1.comments[0].content, 'bejeah!');
    assert.equal(p2.comments[1].content, 'world');
    assert.ok(!p1.comments[1]._creator);
    assert.ok(!p2.comments[0]._creator);
    assert.equal(p1.comments[1].content, 'chickfila');
    assert.equal(p2.comments[0].content, 'hello');

  });

  it('populating multiple children of a sub-array at a time', async function() {
    const BlogPost = db.model('BlogPost', blogPostSchema);
    const User = db.model('User', userSchema);
    const Inner = new Schema({
      user: { type: ObjectId, ref: 'User' },
      post: { type: ObjectId, ref: 'BlogPost' }
    });
    db.model('Test1', Inner);

    const M = db.model('Test', new Schema({
      kids: [Inner]
    }));

    const [fan1, fan2] = await User.create({
      name: 'Fan 1',
      email: 'fan1@learnboost.com',
      gender: 'male'
    }, {
      name: 'Fan 2',
      email: 'fan2@learnboost.com',
      gender: 'female'
    });

    const [post1, post2] = await BlogPost.create({
      title: 'woot'
    }, {
      title: 'yay'
    });

    const m1 = await M.create({
      kids: [
        { user: fan1, post: post1, y: 5 },
        { user: fan2, post: post2, y: 8 }
      ],
      x: 4
    });

    const o = await M.findById(m1)
      .populate('kids.user', 'name')
      .populate('kids.post', 'title', { title: 'woot' })
      .exec();

    assert.strictEqual(o.kids.length, 2);
    const k1 = o.kids[0];
    const k2 = o.kids[1];
    assert.strictEqual(true, !k2.post);
    assert.strictEqual(k1.user.name, 'Fan 1');
    assert.strictEqual(k1.user.email, undefined);
    assert.strictEqual(k1.post.title, 'woot');
    assert.strictEqual(k2.user.name, 'Fan 2');
  });

  it('passing sort options to the populate method', async function() {
    const P = db.model('BlogPost', blogPostSchema);
    const User = db.model('User', userSchema);

    const [fan1, fan2, fan3, fan4] = await User.create(
      { name: 'aaron', age: 10 },
      { name: 'fan2', age: 8 },
      { name: 'someone else', age: 3 },
      { name: 'val', age: 3 }
    );

    const post = await P.create({ fans: [fan4, fan2, fan3, fan1] });

    let populatedPost = await P.findById(post)
      .populate('fans', null, null, { sort: { age: 1, name: 1 } });

    assert.equal(populatedPost.fans.length, 4);
    assert.equal(populatedPost.fans[0].name, 'someone else');
    assert.equal(populatedPost.fans[1].name, 'val');
    assert.equal(populatedPost.fans[2].name, 'fan2');
    assert.equal(populatedPost.fans[3].name, 'aaron');

    populatedPost = await P.findById(post)
      .populate('fans', 'name', null, { sort: { name: -1 } });

    assert.equal(populatedPost.fans.length, 4);
    assert.equal(populatedPost.fans[3].name, 'aaron');
    assert.strictEqual(undefined, populatedPost.fans[3].age);
    assert.equal(populatedPost.fans[2].name, 'fan2');
    assert.strictEqual(undefined, populatedPost.fans[2].age);
    assert.equal(populatedPost.fans[1].name, 'someone else');
    assert.strictEqual(undefined, populatedPost.fans[1].age);
    assert.equal(populatedPost.fans[0].name, 'val');
    assert.strictEqual(undefined, populatedPost.fans[0].age);

    populatedPost = await P.findById(post)
      .populate('fans', 'age', { age: { $gt: 3 } }, { sort: { name: 'desc' } });

    assert.equal(populatedPost.fans.length, 2);
    assert.equal(populatedPost.fans[1].age.valueOf(), 10);
    assert.equal(populatedPost.fans[0].age.valueOf(), 8);
  });

  it('limit should apply to each returned doc, not in aggregate (gh-1490)', async function() {
    const sB = new Schema({
      name: String
    });
    const sJ = new Schema({
      b: [{ type: Schema.Types.ObjectId, ref: 'Test' }]
    });
    const B = db.model('Test', sB);
    const J = db.model('Test1', sJ);

    const b1 = new B({ name: 'thing1' });
    const b2 = new B({ name: 'thing2' });
    const b3 = new B({ name: 'thing3' });
    const b4 = new B({ name: 'thing4' });
    const b5 = new B({ name: 'thing5' });

    const j1 = new J({ b: [b1.id, b2.id, b5.id] });
    const j2 = new J({ b: [b3.id, b4.id, b5.id] });

    await b1.save();
    await b2.save();
    await b3.save();
    await b4.save();
    await b5.save();
    await j1.save();
    await j2.save();

    const j = await J.find().populate({ path: 'b', options: { limit: 2 } });
    assert.equal(j.length, 2);
    assert.equal(j[0].b.length, 2);
    assert.equal(j[1].b.length, 2);
  });

  it('refs should cast to ObjectId from hexstrings', function(done) {
    const BP = db.model('BlogPost', blogPostSchema);

    const bp = new BP();
    bp._creator = new DocObjectId().toString();
    assert.ok(bp._creator instanceof DocObjectId);
    bp.set('_creator', new DocObjectId().toString());
    assert.ok(bp._creator instanceof DocObjectId);
    done();
  });

  it('populate should work on String _ids', async function() {
    const UserSchema = new Schema({
      _id: String,
      name: String
    });

    const NoteSchema = new Schema({
      author: { type: String, ref: 'User' },
      body: String
    });

    const User = db.model('User', UserSchema);
    const Note = db.model('Test', NoteSchema);

    const alice = new User({ _id: 'alice', name: 'Alice' });

    await alice.save();

    const note = new Note({ author: 'alice', body: 'Buy Milk' });
    await note.save();

    const populatedNote = await Note.findById(note.id).populate('author').exec();

    assert.equal(populatedNote.body, 'Buy Milk');
    assert.ok(populatedNote.author);
    assert.equal(populatedNote.author.name, 'Alice');
  });

  it('required works on ref fields (gh-577)', async function() {
    const userSchema = new Schema({
      email: { type: String, required: true }
    });
    const User = db.model('User', userSchema);

    const numSchema = new Schema({ _id: Number, val: Number });
    const Num = db.model('Test', numSchema);

    const strSchema = new Schema({ _id: String, val: String });
    const Str = db.model('Test1', strSchema);

    const commentSchema = new Schema({
      user: { type: ObjectId, ref: 'User', required: true },
      num: { type: Number, ref: 'Test', required: true },
      str: { type: String, ref: 'Test1', required: true },
      text: String
    });
    const Comment = db.model('Comment', commentSchema);

    let comment = new Comment({
      text: 'test'
    });

    const err = await comment.save().then(() => null, err => err);
    assert.ok(err);
    assert.ok(err.message.indexOf('Comment validation failed') === 0, err.message);
    assert.ok('num' in err.errors);
    assert.ok('str' in err.errors);
    assert.ok('user' in err.errors);

    const string = new Str({ _id: 'my string', val: 'hello' });
    const number = new Num({ _id: 1995, val: 234 });
    const user = new User({ email: 'test' });

    await Promise.all([string.save(), number.save(), user.save()]);

    comment.user = user;
    comment.num = 1995;
    comment.str = 'my string';
    await comment.save();

    comment = await Comment
      .findById(comment.id)
      .populate('user')
      .populate('num')
      .populate('str');

    assert.equal(comment.user.email, 'test');
    assert.equal(comment.num.val, 234);
    assert.equal(comment.str.val, 'hello');

    comment.set({ text: 'test2' });
    await comment.save();
  });

  it('populate should work on Number _ids', async function() {
    const UserSchema = new Schema({
      _id: Number,
      name: String
    });

    const NoteSchema = new Schema({
      author: { type: Number, ref: 'User' },
      body: String
    });

    const User = db.model('User', UserSchema);
    const Note = db.model('Test', NoteSchema);

    const alice = new User({ _id: 2359, name: 'Alice' });

    await alice.save();
    let note = new Note({ author: 2359, body: 'Buy Milk' });
    await note.save();

    note = await Note.findById(note.id).populate('author');
    assert.equal(note.body, 'Buy Milk');
    assert.ok(note.author);
    assert.equal(note.author.name, 'Alice');
  });

  it('populate works with schemas with both id and _id defined', async function() {
    const S1 = new Schema({ id: String });
    const S2 = new Schema({ things: [{ type: ObjectId, ref: 'Test' }] });

    const M1 = db.model('Test', S1);
    const M2 = db.model('Test1', S2);
    db.model('Test2', Schema({ _id: String, val: String }));

    const [a, b] = await M1.create([
      { id: 'The Tiger That Isn\'t' },
      { id: 'Users Guide To The Universe' }
    ]);

    const m2 = new M2({ things: [a, b] });
    await m2.save();
    const doc = await M2.findById(m2).populate('things');
    assert.equal(doc.things.length, 2);
    assert.equal(doc.things[0].id, 'The Tiger That Isn\'t');
    assert.equal(doc.things[1].id, 'Users Guide To The Universe');
  });

  it('Update works with populated arrays (gh-602)', async function() {
    const BlogPost = db.model('BlogPost', blogPostSchema);
    const User = db.model('User', userSchema);

    const [u1, u2] = await User.create([{ name: 'aphex' }, { name: 'twin' }]);

    let post = await BlogPost.create({
      title: 'Woot',
      fans: []
    });
    const update = { fans: [u1, u2] };
    await BlogPost.updateOne({ _id: post }, update);

    // the original update doc should not be modified
    assert.ok('fans' in update);
    assert.ok(!('$set' in update));
    assert.ok(update.fans[0] instanceof mongoose.Document);
    assert.ok(update.fans[1] instanceof mongoose.Document);

    post = await BlogPost.findById(post);
    assert.equal(post.fans.length, 2);
    assert.ok(post.fans[0] instanceof DocObjectId);
    assert.ok(post.fans[1] instanceof DocObjectId);

  });

  it('toJSON should also be called for refs (gh-675)', async function() {
    const BlogPost = db.model('BlogPost', blogPostSchema);
    const User = db.model('User', userSchema);

    User.prototype._toJSON = User.prototype.toJSON;
    User.prototype.toJSON = function() {
      const res = this._toJSON();
      res.was_in_to_json = true;
      return res;
    };

    BlogPost.prototype._toJSON = BlogPost.prototype.toJSON;
    BlogPost.prototype.toJSON = function() {
      const res = this._toJSON();
      res.was_in_to_json = true;
      return res;
    };

    const creator = await User.create({
      name: 'Jerem',
      email: 'jerem@jolicloud.com'
    });

    let post = await BlogPost.create({
      title: 'Ping Pong',
      _creator: creator
    });

    post = await BlogPost
      .findById(post._id)
      .populate('_creator');

    const json = post.toJSON();
    assert.equal(true, json.was_in_to_json);
    assert.equal(json._creator.was_in_to_json, true);
  });

  it('populate should work on Buffer _ids (gh-686)', async() => {
    const UserSchema = new Schema({
      _id: Buffer,
      name: String
    });

    const NoteSchema = new Schema({
      author: { type: Buffer, ref: 'User' },
      body: String
    });

    const User = db.model('User', UserSchema);
    const Note = db.model('Test', NoteSchema);

    const alice = new User({ _id: new mongoose.Types.Buffer('YWxpY2U=', 'base64'), name: 'Alice' });

    await alice.save();

    const note = new Note({ author: 'alice', body: 'Buy Milk' });
    await note.save();

    const foundNote = await Note.findById(note.id).populate('author').exec();

    assert.equal(foundNote.body, 'Buy Milk');
    assert.ok(foundNote.author);
    assert.equal(foundNote.author.name, 'Alice');
  });

  it('populated Buffer _ids should be requireable', async function() {
    const UserSchema = new Schema({
      _id: Buffer,
      name: String
    });

    const NoteSchema = new Schema({
      author: { type: Buffer, ref: 'User', required: true },
      body: String
    });

    const User = db.model('User', UserSchema);
    const Note = db.model('Test', NoteSchema);

    const alice = new User({ _id: new mongoose.Types.Buffer('YWxpY2U=', 'base64'), name: 'Alice' });

    await alice.save();

    const note = new Note({ author: 'alice', body: 'Buy Milk' });
    await note.save();

    const notePopulated = await Note.findById(note.id).populate('author').exec();
    await notePopulated.save();
  });

  it('populating with custom model selection (gh-773)', async function() {
    const BlogPost = db.model('BlogPost', blogPostSchema);
    const User = db.model('Test', userSchema);

    const creator = await User.create({
      name: 'Daniel',
      email: 'daniel.baulig@gmx.de'
    });

    const post = await BlogPost.create({
      title: 'woot',
      _creator: creator
    });

    const post2 = await BlogPost.findById(post._id).populate('_creator', 'email', 'Test').exec();

    assert.ok(post2._creator instanceof User);
    assert.equal(post2._creator.isInit('name'), false);
    assert.equal(post2._creator.email, 'daniel.baulig@gmx.de');
  });

  describe('specifying a custom model without specifying a ref in schema', function() {
    it('with String _id', async function() {
      const A = db.model('Test', { name: String, _id: String });
      const B = db.model('Test1', { other: String });
      const a = await A.create({ name: 'hello', _id: 'first' });
      let b = await B.create({ other: a._id });
      b = await B.findById(b._id).populate({ path: 'other', model: 'Test' });
      assert.equal(b.other.name, 'hello');

    });
    it('with Number _id', async function() {
      const A = db.model('Test', { name: String, _id: Number });
      const B = db.model('Test1', { other: Number });
      const a = await A.create({ name: 'hello', _id: 3 });
      let b = await B.create({ other: a._id });
      b = await B.findById(b._id).populate({ path: 'other', model: 'Test' });
      assert.equal(b.other.name, 'hello');

    });
    it('with Buffer _id', async function() {
      const A = db.model('Test', { name: String, _id: Buffer });
      const B = db.model('Test1', { other: Buffer });
      const a = await A.create({ name: 'hello', _id: Buffer.from('x') });
      let b = await B.create({ other: a._id });
      b = await B.findById(b._id).populate({ path: 'other', model: 'Test' });
      assert.equal(b.other.name, 'hello');

    });
    it('with ObjectId _id', async function() {
      const A = db.model('Test', { name: String });
      const B = db.model('Test1', { other: Schema.ObjectId });
      const a = await A.create({ name: 'hello' });
      let b = await B.create({ other: a._id });
      b = await B.findById(b._id).populate({ path: 'other', model: 'Test' });
      assert.equal(b.other.name, 'hello');

    });
  });

  describe('specifying all params using an object', function() {
    let B, User;
    let post;

    beforeEach(function() {
      B = db.model('BlogPost', blogPostSchema);
      db.deleteModel(/Test/);
      User = db.model('Test', userSchema);

      return User.
        create([
          { name: 'use an object', email: 'fo-real@objects.r.fun' },
          { name: 'yup' },
          { name: 'not here' }
        ]).
        then(fans => B.create({
          title: 'woot',
          fans: fans
        })).
        then(_post => { post = _post; });
    });

    it('works', async function() {
      post = await B.findById(post._id)
        .populate({
          path: 'fans',
          select: 'name',
          model: 'Test',
          match: { name: /u/ },
          options: { sort: { name: -1 } }
        });
      assert.ok(Array.isArray(post.fans));
      assert.equal(post.fans.length, 2);
      assert.ok(post.fans[0] instanceof User);
      assert.ok(post.fans[1] instanceof User);
      assert.equal(post.fans[0].isInit('name'), true);
      assert.equal(post.fans[1].isInit('name'), true);
      assert.equal(post.fans[0].isInit('email'), false);
      assert.equal(post.fans[1].isInit('email'), false);
      assert.equal(post.fans[0].name, 'yup');
      assert.equal(post.fans[1].name, 'use an object');


    });
  });

  describe('Model.populate()', function() {
    let B, User;
    let user1, user2, post1, post2, _id;

    beforeEach(async function() {
      B = db.model('BlogPost', blogPostSchema);
      User = db.model('User', userSchema);

      _id = new mongoose.Types.ObjectId();

      const [u1, u2] = await User.create({
        name: 'Phoenix',
        email: 'phx@az.com',
        blogposts: [_id]
      }, {
        name: 'Newark',
        email: 'ewr@nj.com',
        blogposts: [_id]
      });

      user1 = u1;
      user2 = u2;

      const [p1, p2] = await B.create({
        title: 'the how and why',
        _creator: user1,
        fans: [user1, user2]
      }, {
        title: 'green eggs and ham',
        _creator: user2,
        fans: [user2, user1]
      });
      post1 = p1;
      post2 = p2;

    });

    it('returns a promise', function(done) {
      const p = B.populate(post1, '_creator');
      assert.ok(p instanceof Promise);
      p.then(success, done);
      function success(doc) {
        assert.ok(doc);
        done();
      }
    });

    it('of individual document works', async function() {
      post1 = await B.findById(post1._id);
      const ret = utils.populate({ path: '_creator', model: User });
      const post = await B.populate(post1, ret);
      assert.ok(post);
      assert.ok(post._creator instanceof User);
      assert.equal(post._creator.name, 'Phoenix');

    });

    describe('a document already populated', function() {
      describe('when paths are not modified', function() {
        it('works', async function() {
          db.deleteModel(/User/);
          const User = db.model('User', userSchema);

          const doc = await B.findById(post1._id);
          let post = await B.populate(doc, [{ path: '_creator', model: 'User' }, { path: 'fans', model: 'User' }]);
          assert.ok(post);
          assert.ok(post._creator instanceof User);
          assert.equal('Phoenix', post._creator.name);
          assert.equal(post.fans.length, 2);
          assert.equal(post.fans[0].name, user1.name);
          assert.equal(post.fans[1].name, user2.name);

          assert.equal(String(post._creator._id), String(post.populated('_creator')));
          assert.ok(Array.isArray(post.populated('fans')));

          post = await B.populate(doc, [{ path: '_creator', model: 'User' }, { path: 'fans', model: 'User' }]);
          assert.ok(post);
          assert.ok(post._creator instanceof User);
          assert.equal(post._creator.name, 'Phoenix');
          assert.equal(post.fans.length, 2);
          assert.equal(post.fans[0].name, user1.name);
          assert.equal(post.fans[1].name, user2.name);
          assert.ok(Array.isArray(post.populated('fans')));
          assert.equal(String(post.fans[0]._id), String(post.populated('fans')[0]));
          assert.equal(String(post.fans[1]._id), String(post.populated('fans')[1]));


        });
      });
      describe('when paths are modified', function() {
        it('works', async function() {
          db.deleteModel(/User/);
          const User = db.model('User', userSchema);

          const doc = await B.findById(post1._id);
          let post = await B.populate(doc, [{ path: '_creator', model: 'User' }, { path: 'fans', model: 'User' }]);
          assert.ok(post);
          assert.ok(post._creator instanceof User);
          assert.equal(post._creator.name, 'Phoenix');
          assert.equal(post.fans.length, 2);
          assert.equal(post.fans[0].name, user1.name);
          assert.equal(post.fans[1].name, user2.name);

          assert.equal(String(post._creator._id), String(post.populated('_creator')));
          assert.ok(Array.isArray(post.populated('fans')));

          // modify the paths
          doc.markModified('_creator');
          doc.markModified('fans');

          post = await B.populate(doc, [{ path: '_creator', model: 'User' }, { path: 'fans', model: 'User' }]);
          assert.ok(post);
          assert.ok(post._creator instanceof User);
          assert.equal(post._creator.name, 'Phoenix');
          assert.equal(post.fans.length, 2);
          assert.equal(post.fans[0].name, user1.name);
          assert.equal(post.fans[1].name, user2.name);
          assert.ok(Array.isArray(post.populated('fans')));
          assert.equal(
            String(post.fans[0]._id)
            , String(post.populated('fans')[0]));
          assert.equal(
            String(post.fans[1]._id)
            , String(post.populated('fans')[1]));

        });
      });
    });

    describe('of multiple documents', function() {
      it('works', async function() {
        db.model('User', userSchema);
        post1 = await B.findById(post1._id);
        post2 = await B.findById(post2._id);
        const ret = utils.populate({ path: '_creator', model: 'User' });
        const posts = await B.populate([post1, post2], ret);
        assert.ok(posts);
        assert.equal(posts.length, 2);
        const p1 = posts[0];
        const p2 = posts[1];
        assert.ok(p1._creator instanceof User);
        assert.equal(p1._creator.name, 'Phoenix');
        assert.ok(p2._creator instanceof User);
        assert.equal(p2._creator.name, 'Newark');

      });
    });
  });

  describe('populating combined with lean (gh-1260)', function() {
    it('with findOne', async function() {
      const BlogPost = db.model('BlogPost', blogPostSchema);
      const User = db.model('User', userSchema);

      const creator = await User.create({
        name: 'Guillermo',
        email: 'rauchg@gmail.com'
      });

      const createdPost = await BlogPost.create({
        title: 'woot',
        _creator: creator
      });


      const post = await BlogPost
        .findById(createdPost._id)
        .lean()
        .populate('_creator');

      assert.ok(utils.isObject(post._creator));
      assert.equal(post._creator.name, 'Guillermo');
      assert.equal(post._creator.email, 'rauchg@gmail.com');
      assert.equal(typeof post._creator.update, 'undefined');
    });

    it('with find', async function() {
      const BlogPost = db.model('BlogPost', blogPostSchema);
      const User = db.model('User', userSchema);

      const [fan1, fan2] = await User.create([{
        name: 'Fan 1',
        email: 'fan1@learnboost.com'
      }, {
        name: 'Fan 2',
        email: 'fan2@learnboost.com'
      }]);
      const [post1, post2] = await BlogPost.create({
        title: 'Woot',
        fans: [fan1, fan2]
      }, {
        title: 'Woot2',
        fans: [fan2, fan1]
      });

      const blogposts = await BlogPost
        .find({ _id: { $in: [post1._id, post2._id] } })
        .populate('fans')
        .lean();
      assert.equal(blogposts[0].fans[0].name, 'Fan 1');
      assert.equal(blogposts[0].fans[0].email, 'fan1@learnboost.com');
      assert.equal(typeof blogposts[0].fans[0].update, 'undefined');
      assert.equal(blogposts[0].fans[1].name, 'Fan 2');
      assert.equal(blogposts[0].fans[1].email, 'fan2@learnboost.com');
      assert.equal(typeof blogposts[0].fans[1].update, 'undefined');

      assert.equal(blogposts[1].fans[0].name, 'Fan 2');
      assert.equal(blogposts[1].fans[0].email, 'fan2@learnboost.com');
      assert.equal(typeof blogposts[1].fans[0].update, 'undefined');
      assert.equal(blogposts[1].fans[1].name, 'Fan 1');
      assert.equal(blogposts[1].fans[1].email, 'fan1@learnboost.com');
      assert.equal(typeof blogposts[1].fans[1].update, 'undefined');
    });
  });

  describe('records paths and _ids used in population', function() {
    let B;
    let U;
    let u1, u2;
    let b1;

    beforeEach(async function() {
      B = db.model('BlogPost', blogPostSchema);
      U = db.model('User', userSchema);

      const [fan1, fan2] = await U.create([
        { name: 'Fan 1', email: 'fan1@learnboost.com' },
        {
          name: 'Fan 2',
          email: 'fan2@learnboost.com'
        }
      ]);

      u1 = fan1;
      u2 = fan2;

      const post = await B.create({
        title: 'Woot',
        fans: [fan1, fan2],
        _creator: fan1
      }, {
        title: 'Woot2',
        fans: [fan2, fan1],
        _creator: fan2
      });

      b1 = post;
    });

    it('with findOne', async function() {
      const doc = await B.findById(b1).populate('fans _creator').exec();

      assert.ok(Array.isArray(doc.populated('fans')));
      assert.equal(doc.populated('fans').length, 2);
      assert.equal(doc.populated('fans')[0], String(u1._id));
      assert.equal(doc.populated('fans')[1], String(u2._id));
      assert.equal(doc.populated('_creator'), String(u1._id));
    });

    it('with find', async function() {
      const docs = await B.find().sort('title').populate('fans _creator').exec();

      assert.equal(docs.length, 2);

      const doc1 = docs[0];
      const doc2 = docs[1];

      assert.ok(Array.isArray(doc1.populated('fans')));
      assert.equal(doc1.populated('fans').length, 2);

      assert.equal(doc1.populated('fans')[0], String(u1._id));
      assert.equal(doc1.populated('fans')[1], String(u2._id));
      assert.equal(doc1.populated('_creator'), String(u1._id));

      assert.ok(Array.isArray(doc2.populated('fans')));
      assert.equal(doc2.populated('fans').length, 2);
      assert.equal(doc2.populated('fans')[0], String(u2._id));
      assert.equal(doc2.populated('fans')[1], String(u1._id));
      assert.equal(doc2.populated('_creator'), String(u2._id));
    });
  });

  describe('deselecting _id', function() {
    let C, U, c1, c2;

    beforeEach(async function() {
      C = db.model('Comment', Schema({
        body: 'string', title: String
      }));

      db.deleteModel(/User/);
      U = db.model('User', Schema({
        name: 'string',
        comments: [{ type: Schema.ObjectId, ref: 'Comment' }],
        comment: { type: Schema.ObjectId, ref: 'Comment' }
      }));

      const [c1_, c2_] = await C.create([{ body: 'comment 1', title: '1' }, { body: 'comment 2', title: 2 }]);

      c1 = c1_;
      c2 = c2_;

      await U.create([
        { name: 'u1', comments: [c1, c2], comment: c1 },
        { name: 'u2', comment: c2 }
      ]);
    });

    describe('in a subdocument', function() {
      it('works', async function() {
        const docs = await U.find({ name: 'u1' }).populate('comments', { _id: 0 });

        let doc = docs[0];
        assert.ok(Array.isArray(doc.comments), 'comments should be an array: ' + JSON.stringify(doc));
        assert.equal(doc.comments.length, 2, 'invalid comments length for ' + JSON.stringify(doc));
        doc.comments.forEach(function(d) {
          assert.equal(d._id, undefined);
          assert.equal(Object.keys(d._doc).indexOf('_id'), -1);
          assert.ok(d.body.length);
          assert.equal(typeof d._doc.__v, 'number');
        });

        doc = await U.findOne({ name: 'u1' }).populate('comments', 'title -_id');
        assert.equal(doc.comments.length, 2);
        doc.comments.forEach(function(d) {
          assert.equal(d._id, undefined);
          assert.equal(Object.keys(d._doc).indexOf('_id'), -1);
          assert.ok(d.title.length);
          assert.equal(d.body, undefined);
          assert.equal(typeof d._doc.__v, 'undefined');
        });
        doc = await U.findOne({ name: 'u1' }).populate('comments', '-_id');
        assert.equal(doc.comments.length, 2);
        doc.comments.forEach(function(d) {
          assert.equal(d._id, undefined);
          assert.equal(Object.keys(d._doc).indexOf('_id'), -1);
          assert.ok(d.title.length);
          assert.ok(d.body.length);
          assert.equal(typeof d._doc.__v, 'number');
        });

      });

      it('with lean', async function() {
        const docs = await U.find({ name: 'u1' }).lean().populate({ path: 'comments', select: { _id: 0 }, options: { lean: true } });

        let doc = docs[0];
        assert.equal(doc.comments.length, 2);
        doc.comments.forEach(function(d) {
          assert.ok(!('_id' in d));
          assert.ok(d.body.length);
          assert.equal(typeof d.__v, 'number');
        });

        doc = await U.findOne({ name: 'u1' }).lean().populate('comments', '-_id', null, { lean: true });
        assert.equal(doc.comments.length, 2);
        doc.comments.forEach(function(d) {
          assert.ok(!('_id' in d));
          assert.ok(d.body.length);
          assert.equal(typeof d.__v, 'number');
        });

      });
    });

    describe('of documents being populated', function() {
      it('still works (gh-1441)', async function() {
        const docs = await U.find()
          .select('-_id comment name')
          .populate('comment', { _id: 0 });
        assert.equal(docs.length, 2);

        docs.forEach(function(doc) {
          assert.ok(doc.comment && doc.comment.body);
          if (doc.name === 'u1') {
            assert.equal(doc.comment.body, 'comment 1');
          } else {
            assert.equal(doc.comment.body, 'comment 2');
          }
        });

      });
    });
  });

  describe('DynRef', function() {
    let Review;
    let Item1;
    let Item2;

    beforeEach(async function() {
      const reviewSchema = new Schema({
        _id: Number,
        text: String,
        item: {
          id: {
            type: Number,
            refPath: 'item.type'
          },
          type: {
            type: String
          }
        },
        items: [
          {
            id: {
              type: Number,
              refPath: 'items.type'
            },
            type: {
              type: String
            }
          }
        ]
      });

      const item1Schema = new Schema({
        _id: Number,
        name: String
      });

      const item2Schema = new Schema({
        _id: Number,
        otherName: String
      });

      Review = db.model('Review', reviewSchema);
      Item1 = db.model('Test1', item1Schema);
      Item2 = db.model('Test2', item2Schema);

      const review = {
        _id: 0,
        text: 'Test',
        item: { id: 1, type: 'Test1' },
        items: [{ id: 1, type: 'Test1' }, { id: 2, type: 'Test2' }]
      };


      await Item1.deleteMany({});
      await Item2.deleteMany({});

      await Item1.create({ _id: 1, name: 'Val' });
      await Item2.create({ _id: 2, otherName: 'Val' });
      await Review.create(review);
    });

    it('Simple populate', async function() {
      const results = await Review.find({}).populate('item.id');
      assert.equal(results.length, 1);
      const result = results[0];
      assert.equal(result.item.id.name, 'Val');

    });

    it('Array populate', async function() {
      const results = await Review.find({}).populate('items.id');
      assert.equal(results.length, 1);
      const result = results[0];
      assert.equal(result.items.length, 2);
      assert.equal(result.items[0].id.name, 'Val');
      assert.equal(result.items[1].id.otherName, 'Val');
    });

    it('with nonexistant refPath (gh-4637)', function() {
      db.deleteModel(/Test/);
      const baseballSchema = mongoose.Schema({
        seam: String
      });
      const Baseball = db.model('Test', baseballSchema);

      const ballSchema = mongoose.Schema({
        league: String,
        kind: String,
        ball: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: 'balls.kind'
        }
      });

      const basketSchema = mongoose.Schema({
        balls: [ballSchema]
      });
      const Basket = db.model('Test2', basketSchema);

      return new Baseball({ seam: 'yarn' }).
        save().
        then(function(baseball) {
          return new Basket({
            balls: [
              {
                league: 'MLB',
                kind: 'Test',
                ball: baseball._id
              },
              {
                league: 'NBA'
              }
            ]
          }).save();
        }).
        then(function(basket) {
          return basket.populate('balls.ball');
        }).
        then(function(basket) {
          assert.equal(basket.balls[0].ball.seam, 'yarn');
          assert.ok(!basket.balls[1].kind);
          assert.ok(!basket.balls[1].ball);
        });
    });

    it('array with empty refPath (gh-5377)', async function() {
      db.deleteModel(/Test/);
      const modelASchema = new mongoose.Schema({
        name: String
      });
      const ModelA = db.model('Test1', modelASchema);

      const modelBSchema = new mongoose.Schema({
        name: String
      });
      const ModelB = db.model('Test2', modelBSchema);

      const ChildSchema = new mongoose.Schema({
        name: String,
        toy: {
          kind: {
            type: String,
            enum: ['Test1', 'Test2']
          },
          value: {
            type: ObjectId,
            refPath: 'children.toy.kind'
          }
        }
      });

      const ParentSchema = new mongoose.Schema({
        children: [ChildSchema]
      });
      const Parent = db.model('Test', ParentSchema);

      const toyA = await ModelA.create({ name: 'model-A' });
      const toyB = await ModelB.create({ name: 'model-B' });
      let doc = await Parent.create({
        children: [
          {
            name: 'Child 1',
            toy: { kind: 'Test1', value: toyA._id }
          },
          {
            name: 'Child 2'
          },
          {
            name: 'Child 3',
            toy: { kind: 'Test2', value: toyB._id }
          }
        ]
      });


      doc = await Parent.findById(doc._id);
      await doc.populate('children.toy.value');
      assert.equal(doc.children[0].toy.value.name, 'model-A');
      assert.equal(doc.children[1].toy.value, null);
      assert.equal(doc.children[2].toy.value.name, 'model-B');

    });

    it('with non-arrays (gh-5114)', function(done) {
      const LocationSchema = new Schema({
        name: String
      });
      const UserSchema = new Schema({
        name: String,
        locationRef: String,
        locationIds: {
          type: [{
            location: {
              type: mongoose.Schema.Types.ObjectId,
              refPath: 'locationRef'
            }
          }]
        }
      });

      const Locations = db.model('Test', LocationSchema);
      const Users = db.model('User', UserSchema);

      const location1Id = new mongoose.Types.ObjectId();
      const location2Id = new mongoose.Types.ObjectId();

      const location1 = {
        _id: location1Id,
        name: 'loc1'
      };
      const location2 = {
        _id: location2Id,
        name: 'loc2'
      };
      const user = {
        locationRef: 'Test',
        locationIds: [
          { location: location1Id },
          { location: location2Id }
        ]
      };

      Locations.create([location1, location2]).
        then(function() {
          return Users.create(user);
        }).
        then(function() {
          return Users.findOne().populate('locationIds.location');
        }).
        then(function(doc) {
          assert.equal(doc.locationIds.length, 2);
          assert.equal(doc.locationIds[0].location.name, 'loc1');
          assert.equal(doc.locationIds[1].location.name, 'loc2');
          done();
        }).
        catch(done);
    });

    it('with different schema types for local fields (gh-6870)', async function() {
      const TestSchema = new mongoose.Schema({
        _id: Number,
        exercises: [String]
      });
      const VideoSchema = new mongoose.Schema({
        _id: String,
        url: String
      });
      const ListSchema = new mongoose.Schema({
        parts: [
          {
            title: String,
            contents: [
              {
                item: {
                  type: mongoose.Schema.Types.Mixed,
                  refPath: 'parts.contents.kind'
                },
                kind: String
              }
            ]
          }
        ]
      });

      const List = db.model('List', ListSchema);
      const Test = db.model('Test', TestSchema);
      const Video = db.model('Video', VideoSchema);

      const test = new Test({ _id: 123, exercises: ['t1', 't2'] });
      const lesson = new Video({ _id: 'lesson', url: 'https://youtube.com' });
      const list = new List({
        parts: [
          {
            title: 'Study Plan 01',
            contents: [
              {
                item: test._id,
                kind: 'Test'
              },
              {
                item: lesson._id,
                kind: 'Video'
              },
              {
                item: lesson._id,
                kind: 'Video'
              }
            ]
          }
        ]
      });


      await Promise.all([test.save(), lesson.save(), list.save()]);
      const doc = await List.findOne({}).populate('parts.contents.item');

      assert.strictEqual(doc.parts[0].contents[0].item.exercises[0], 't1');
      assert.strictEqual(doc.parts[0].contents[1].item.url, 'https://youtube.com');
    });

    it('with nested nonexistant refPath (gh-6457)', async function() {
      const CommentSchema = new Schema({
        text: String,
        references: {
          type: [{
            item: {
              type: Schema.Types.ObjectId,
              refPath: 'comments.references.kind'
            },
            kind: String
          }]
        }
      });

      const PostSchema = new Schema({
        text: String,
        comments: [CommentSchema]
      });

      const Post = db.model('Test', PostSchema);


      await Post.create({
        text: 'Post 2',
        comments: [{
          text: 'Comment'
          // No `references`
        }]
      });

      const post = await Post.findOne().populate('comments.references.item');

      assert.deepEqual(post.toObject().comments[0].references, []);
    });

    it('where first doc doesnt have a refPath (gh-6913', async function() {
      const UserSchema = new Schema({ name: String });

      const PostSchema = new Schema({
        comments: [{
          references: [{
            item: {
              type: Schema.Types.ObjectId,
              refPath: 'comments.references.kind'
            },
            kind: String
          }]
        }]
      });

      const Post = db.model('BlogPost', PostSchema);
      const User = db.model('User', UserSchema);

      const user = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Arnold'
      };

      const post = {
        _id: new mongoose.Types.ObjectId(),
        comments: [
          {},
          {
            references: [{
              item: user._id,
              kind: 'User'
            }]
          }
        ]
      };


      await User.create(user);
      await Post.create(post);

      const _post = await Post.findOne().populate('comments.references.item');
      assert.equal(_post.comments.length, 2);
      assert.equal(_post.comments[1].references.length, 1);
      assert.equal(_post.comments[1].references[0].item.name, 'Arnold');
    });

    it('readable error with deselected refPath (gh-6834)', async function() {
      const offerSchema = new Schema({
        text: String,
        city: String,
        formData: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: 'city'
        }
      });

      const Offer = db.model('Test', offerSchema);


      await Offer.create({
        text: 'special discount',
        city: 'New York',
        formData: new mongoose.Types.ObjectId()
      });

      let threw = false;
      try {
        await Offer.findOne().populate('formData').select('-city');
      } catch (error) {
        assert.ok(error);
        assert.ok(error.message.indexOf('refPath') !== -1, error.message);
        threw = true;
      }
      assert.ok(threw);
    });
  });

  it('strips out not-matched ids when populating a hydrated doc (gh-6435)', async function() {
    const coopBrandSchema = new Schema({
      name: String
    });

    coopBrandSchema.virtual('products', {
      ref: 'Product',
      localField: '_id',
      foreignField: 'coopBrandId',
      justOne: false
    });

    const agentSchema = new Schema({
      coopBrands: [coopBrandSchema],
      name: String
    });

    const productSchema = new Schema({
      coopBrandId: Schema.Types.ObjectId,
      name: String
    });

    const Agent = db.model('Test', agentSchema);
    const Product = db.model('Product', productSchema);


    const billy = await Agent.create({
      name: 'Billy',
      coopBrands: [
        { name: 'Has product' },
        { name: 'Has no product' }
      ]
    });

    const coopBrandId = billy.coopBrands[0]._id;
    await Product.create([
      { coopBrandId: coopBrandId, name: 'Product 1' },
      { coopBrandId: coopBrandId, name: 'Product 2' }
    ]);

    let agent = await Agent.findOne({});
    await agent.populate('coopBrands.products');
    agent = agent.toObject({ virtuals: true });
    assert.equal(agent.coopBrands[0].products.length, 2);
    assert.deepEqual(agent.coopBrands[1].products, []);
  });

  describe('leaves Documents within Mixed properties alone (gh-1471)', function() {
    let Cat;
    let Litter;

    beforeEach(function() {
      db.deleteModel(/Test/);
      Cat = db.model('Cat', new Schema({ name: String }));
      const litterSchema = new Schema({ name: String, cats: {}, o: {}, a: [] });
      Litter = db.model('Test', litterSchema);
    });

    it('when saving new docs', async function() {
      const [a, b, c] = await Cat.create([{ name: 'new1' }, { name: 'new2' }, { name: 'new3' }]);

      await Litter.create({
        name: 'new',
        cats: [a],
        o: b,
        a: [c]
      });
    });

    it('when saving existing docs 5T5', async function() {
      const [a, b, c] = await Cat.create([{ name: 'ex1' }, { name: 'ex2' }, { name: 'ex3' }]);

      const doc = await Litter.create({ name: 'existing' });
      doc.cats = [a];
      doc.o = b;
      doc.a = [c];
      await doc.save();
    });
  });

  describe('github issues', function() {
    it('populating an array of refs, slicing, and fetching many (gh-5737)', async function() {
      const BlogPost = db.model('BlogPost', new Schema({
        title: String,
        fans: [{ type: ObjectId, ref: 'User' }]
      }));
      const User = db.model('User', new Schema({ name: String }));

      const fans = await User.create([{ name: 'Fan 1' }, { name: 'Fan 2' }]);
      const posts = [
        { title: 'Test 1', fans: [fans[0]._id, fans[1]._id] },
        { title: 'Test 2', fans: [fans[1]._id, fans[0]._id] }
      ];
      await BlogPost.create(posts);
      const blogposts = await BlogPost.
        find({}).
        slice('fans', [0, 5]).
        populate('fans');

      const titles = blogposts.map(bp => bp.title).sort();

      assert.equal(titles[0], 'Test 1');
      assert.equal(titles[1], 'Test 2');

      const test1 = blogposts.find(bp => bp.title === 'Test 1');
      assert.equal(test1.fans[0].name, 'Fan 1');
      assert.equal(test1.fans[1].name, 'Fan 2');

      const test2 = blogposts.find(bp => bp.title === 'Test 2');
      assert.equal(test2.fans[0].name, 'Fan 2');
      assert.equal(test2.fans[1].name, 'Fan 1');

    });

    it('populate + slice (gh-5737a)', async function() {
      const BlogPost = db.model('BlogPost', new Schema({
        title: String,
        user: { type: ObjectId, ref: 'User' },
        fans: [{ type: ObjectId }]
      }));
      const User = db.model('User', new Schema({ name: String }));

      const fans = await User.create([{ name: 'Fan 1' }]);
      const posts = [
        { title: 'Test 1', user: fans[0]._id, fans: [fans[0]._id] }
      ];
      await BlogPost.create(posts);
      const blogposts = await BlogPost.
        find({}).
        slice('fans', [0, 2]).
        populate('user');

      assert.equal(blogposts[0].user.name, 'Fan 1');
      assert.equal(blogposts[0].title, 'Test 1');

    });

    it('maps results back to correct document (gh-1444)', async function() {
      const articleSchema = new Schema({
        body: String,
        mediaAttach: { type: Schema.ObjectId, ref: 'Test' },
        author: String
      });
      const Article = db.model('Article', articleSchema);

      const mediaSchema = new Schema({
        filename: String
      });
      const Media = db.model('Test', mediaSchema);

      const media = await Media.create({ filename: 'one' });

      await Article.create(
        { body: 'body1', author: 'a' },
        { body: 'body2', author: 'a', mediaAttach: media._id },
        { body: 'body3', author: 'a' }
      );


      const docs = await Article.find().populate('mediaAttach');

      const a2 = docs.filter(function(d) {
        return d.body === 'body2';
      })[0];
      assert.equal(a2.mediaAttach.id, media.id);
    });

    it('handles skip', async function() {
      const movieSchema = new Schema({});
      const categorySchema = new Schema({ movies: [{ type: ObjectId, ref: 'Movie_Skip' }] });

      const Movie = db.model('Movie_Skip', movieSchema);
      const Category = db.model('Category', categorySchema);

      await Movie.create([{}, {}, {}]);

      const movies = await Movie.find({});
      assert.equal(movies.length, 3);

      await Category.create({ movies: movies });

      const category = await Category.findOne({}).populate({ path: 'movies', options: { limit: 2, skip: 1 } }).exec();
      assert.equal(category.movies.length, 2);
    });

    it('handles slice (gh-1934)', async function() {
      const movieSchema = new Schema({ title: String, actors: [String] });
      const categorySchema = new Schema({ movies: [{ type: ObjectId, ref: 'Movie_Slice' }] });

      const Movie = db.model('Movie_Slice', movieSchema);
      const Category = db.model('Category', categorySchema);

      const movies = await Movie.create([
        { title: 'Rush', actors: ['Chris Hemsworth', 'Daniel Bruhl'] },
        { title: 'Pacific Rim', actors: ['Charlie Hunnam', 'Idris Elba'] },
        { title: 'Man of Steel', actors: ['Henry Cavill', 'Amy Adams'] }
      ]);

      await Category.create({ movies: movies });

      const category = await Category.findOne({}).populate({ path: 'movies', options: { slice: { actors: 1 } } });

      assert.equal(category.movies.length, 3);
      assert.equal(category.movies[0].actors.length, 1);
      assert.equal(category.movies[1].actors.length, 1);
      assert.equal(category.movies[2].actors.length, 1);
    });

    it('fails if sorting with a doc array subprop (gh-2202)', async function() {
      const childSchema = new Schema({ name: String });
      const Child = db.model('Child', childSchema);

      const parentSchema = new Schema({
        children1: [{
          child: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Child'
          },
          test: Number
        }],
        children2: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Child'
        }]
      });
      const Parent = db.model('Parent', parentSchema);

      const c = await Child.create([{ name: 'test1' }, { name: 'test2' }]);

      const createdParent = await Parent.create({
        children1: [
          { child: c[0]._id, test: 1 },
          { child: c[1]._id, test: 2 }
        ],
        children2: [c[0]._id, c[1]._id]
      });

      const foundParent = await Parent.findById(createdParent).populate('children2');
      assert.equal(foundParent.children2[0].name, 'test1');

      const err = await Parent.findById(foundParent).
        populate({ path: 'children1.child', options: { sort: '-name' } }).then(() => null, err => err);

      assert.notEqual(err.message.indexOf('subproperty of a document array'), -1);
    });

    it('handles toObject() (gh-3279)', async function() {
      const teamSchema = new Schema({
        members: [{
          user: { type: ObjectId, ref: 'User' },
          role: String
        }]
      });

      let calls = 0;
      teamSchema.set('toJSON', {
        transform: function(doc, ret) {
          ++calls;
          return ret;
        }
      });

      const Team = db.model('Test', teamSchema);

      const userSchema = new Schema({
        username: String
      });

      userSchema.set('toJSON', {
        transform: function(doc, ret) {
          return ret;
        }
      });

      const User = db.model('User', userSchema);

      const user = new User({ username: 'Test' });

      await user.save();

      const team = new Team({ members: [{ user: user }] });

      await team.save();

      await team.populate('members.user');

      team.toJSON();

      assert.equal(calls, 1);
    });

    it('populate option (gh-2321)', async function() {
      const User = db.model('User', { name: String });
      const Group = db.model('Group', {
        users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        name: String
      });

      const user = await User.create({ name: 'Val' });

      const group = await Group.create({ users: [user._id], name: 'test' });

      const group2 = await Group.find(
        { _id: group._id },
        '-name',
        { populate: { path: 'users', model: 'User' } }
      );
      assert.ok(group2[0].users[0]._id);
    });

    it('discriminator child schemas (gh-3878)', async function() {
      const options = { discriminatorKey: 'kind' };
      const activitySchema = new Schema({ title: { type: String } }, options);

      const dateActivitySchema = new Schema({
        postedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
      }, options);

      const eventActivitySchema = new Schema({ test: String }, options);

      const User = db.model('User', { name: String });
      const Activity = db.model('Test', activitySchema);
      const DateActivity = Activity.discriminator('Date', dateActivitySchema);
      const EventActivity = Activity.discriminator('Event', eventActivitySchema);

      const user = await User.create({ name: 'val' });
      const dateActivity = { title: 'test', postedBy: user._id };
      await DateActivity.create(dateActivity);

      await EventActivity.create({
        title: 'test2',
        test: 'test'
      });

      const results = await Activity.find({}).populate('postedBy');
      assert.equal(results.length, 2);
      assert.equal(results[0].postedBy.name, 'val');
    });

    it('set to obj w/ same id doesnt mark modified (gh-3992)', async function() {
      const personSchema = new Schema({
        name: { type: String }
      });
      const jobSchema = new Schema({
        title: String,
        person: { type: Schema.Types.ObjectId, ref: 'Person' }
      });

      const Person = db.model('Person', personSchema);
      const Job = db.model('Job', jobSchema);

      const person = await Person.create({ name: 'Val' });

      const createdJob = await Job.create({ title: 'Engineer', person: person._id });


      const foundJob = await Job.findById(createdJob._id);
      foundJob.person = person;

      assert.ok(!foundJob.isModified('person'));
    });

    it('deep populate single -> array (gh-3904)', async function() {
      const personSchema = new Schema({
        name: { type: String }
      });

      const teamSchema = new Schema({
        name: { type: String },
        members: [{ type: Schema.Types.ObjectId, ref: 'Person' }]
      });

      const gameSchema = new Schema({
        team: { type: Schema.Types.ObjectId, ref: 'Team' },
        opponent: { type: Schema.Types.ObjectId, ref: 'Team' }
      });

      const Person = db.model('Person', personSchema);
      const Team = db.model('Team', teamSchema);
      const Game = db.model('Test', gameSchema);


      const people = await Person.create([
        { name: 'Shaq' },
        { name: 'Kobe' },
        { name: 'Horry' },
        { name: 'Duncan' },
        { name: 'Robinson' },
        { name: 'Johnson' }
      ]);

      const lakers = {
        name: 'Lakers',
        members: [people[0]._id, people[1]._id, people[2]._id]
      };
      const spurs = {
        name: 'Spurs',
        members: [people[3]._id, people[4]._id, people[5]._id]
      };

      const teams = await Team.create([lakers, spurs]);

      const game = await Game.create({ team: teams[0]._id, opponent: teams[1]._id });


      const doc = await Game.findById(game._id).populate({
        path: 'team',
        select: 'name members',
        populate: { path: 'members', select: 'name' }
      });

      const arr = doc.toObject().team.members.map(function(v) {
        return v.name;
      });

      assert.deepEqual(arr, ['Shaq', 'Kobe', 'Horry']);
    });

    it('deep populate array -> array (gh-3954)', async function() {
      const personSchema = new Schema({
        name: { type: String }
      });

      const teamSchema = new Schema({
        name: { type: String },
        members: [{ type: Schema.Types.ObjectId, ref: 'Person' }]
      });

      const gameSchema = new Schema({
        teams: [{ type: Schema.Types.ObjectId, ref: 'Team' }]
      });

      const Person = db.model('Person', personSchema);
      const Team = db.model('Team', teamSchema);
      const Game = db.model('Test', gameSchema);

      const people = await Person.create([
        { name: 'Shaq' },
        { name: 'Kobe' },
        { name: 'Horry' },
        { name: 'Duncan' },
        { name: 'Robinson' },
        { name: 'Johnson' }
      ]);

      const lakers = {
        name: 'Lakers',
        members: [people[0]._id, people[1]._id, people[2]._id]
      };
      const spurs = {
        name: 'Spurs',
        members: [people[3]._id, people[4]._id, people[5]._id]
      };
      const teams = await Team.create([lakers, spurs]);

      const game = {
        teams: [teams[0]._id, teams[1]._id]
      };
      const { _id } = await Game.create(game);

      const doc = await Game.findById(_id).populate({
        path: 'teams',
        select: 'name members',
        populate: { path: 'members', select: 'name' }
      });
      const players = doc.toObject().teams[0].members.
        concat(doc.toObject().teams[1].members);
      const arr = players.map(function(v) {
        return v.name;
      });
      assert.deepEqual(arr,
        ['Shaq', 'Kobe', 'Horry', 'Duncan', 'Robinson', 'Johnson']);
    });

    it('4 level population (gh-3973)', async function() {
      const level4Schema = new Schema({
        name: { type: String }
      });

      const level3Schema = new Schema({
        name: { type: String },
        level4: [{ type: Schema.Types.ObjectId, ref: 'Test3' }]
      });

      const level2Schema = new Schema({
        name: { type: String },
        level3: [{ type: Schema.Types.ObjectId, ref: 'Test2' }]
      });

      const level1Schema = new Schema({
        name: { type: String },
        level2: [{ type: Schema.Types.ObjectId, ref: 'Test1' }]
      });

      const level4 = db.model('Test3', level4Schema);
      const level3 = db.model('Test2', level3Schema);
      const level2 = db.model('Test1', level2Schema);
      const level1 = db.model('Test', level1Schema);

      const l4docs = [{ name: 'level 4' }];
      const l4 = await level4.create(l4docs);

      const l3docs = [{ name: 'level 3', level4: l4[0]._id }];
      const l3 = await level3.create(l3docs).catch(err => {
        console.log(err);
        throw err;
      });

      const l2docs = [{ name: 'level 2', level3: l3[0]._id }];
      const l2 = await level2.create(l2docs);

      const l1docs = [{ name: 'level 1', level2: l2[0]._id }];
      const l1 = await level1.create(l1docs);

      const opts = {
        path: 'level2',
        populate: {
          path: 'level3',
          populate: {
            path: 'level4'
          }
        }
      };

      const obj = await level1.findById(l1[0]._id).populate(opts).exec();
      assert.equal(obj.level2[0].level3[0].level4[0].name, 'level 4');
    });

    it('deep populate two paths (gh-3974)', async function() {
      const level3Schema = new Schema({
        name: { type: String }
      });

      const level2Schema = new Schema({
        name: { type: String },
        level31: [{ type: Schema.Types.ObjectId, ref: 'Test' }],
        level32: [{ type: Schema.Types.ObjectId, ref: 'Test' }]
      });

      const level1Schema = new Schema({
        name: { type: String },
        level2: [{ type: Schema.Types.ObjectId, ref: 'Test1' }]
      });

      const level3 = db.model('Test', level3Schema);
      const level2 = db.model('Test1', level2Schema);
      const level1 = db.model('Test2', level1Schema);

      let l3 = [
        { name: 'level 3/1' },
        { name: 'level 3/2' }
      ];
      l3 = await level3.create(l3);

      const l2 = await level2.create([
        { name: 'level 2', level31: l3[0]._id, level32: l3[1]._id }
      ]);

      const l1 = await level1.create([{ name: 'level 1', level2: l2[0]._id }]);

      const obj = await level1.findById(l1[0]._id).
        populate({
          path: 'level2',
          populate: [{
            path: 'level31'
          }]
        }).
        populate({
          path: 'level2',
          populate: [{
            path: 'level32'
          }]
        });

      assert.equal(obj.level2[0].level31[0].name, 'level 3/1');
      assert.equal(obj.level2[0].level32[0].name, 'level 3/2');
    });

    it('out-of-order discriminators (gh-4073)', function() {
      const UserSchema = new Schema({
        name: String
      });

      const CommentSchema = new Schema({
        content: String
      });

      const BlogPostSchema = new Schema({
        title: String
      });

      const EventSchema = new Schema({
        name: String,
        createdAt: { type: Date, default: Date.now }
      });

      const UserEventSchema = new Schema({
        user: { type: ObjectId, ref: 'User' }
      });

      const CommentEventSchema = new Schema({
        comment: { type: ObjectId, ref: 'Comment' }
      });

      const BlogPostEventSchema = new Schema({
        blogpost: { type: ObjectId, ref: 'BlogPost' }
      });

      const User = db.model('User', UserSchema);
      const Comment = db.model('Comment', CommentSchema);
      const BlogPost = db.model('BlogPost', BlogPostSchema);

      const Event = db.model('Test', EventSchema);
      const UserEvent = Event.discriminator('Test1', UserEventSchema);
      const CommentEvent = Event.discriminator('Test2',
        CommentEventSchema);
      const BlogPostEvent = Event.discriminator('Test3', BlogPostEventSchema);

      const u1 = new User({ name: 'user 1' });
      const u2 = new User({ name: 'user 2' });
      const u3 = new User({ name: 'user 3' });
      const c1 = new Comment({ content: 'comment 1' });
      const c2 = new Comment({ content: 'comment 2' });
      const c3 = new Comment({ content: 'comment 3' });
      const b1 = new BlogPost({ title: 'blog post 1' });
      const b2 = new BlogPost({ title: 'blog post 2' });
      const b3 = new BlogPost({ title: 'blog post 3' });
      const ue1 = new UserEvent({ user: u1 });
      const ue2 = new UserEvent({ user: u2 });
      const ue3 = new UserEvent({ user: u3 });
      const ce1 = new CommentEvent({ comment: c1 });
      const ce2 = new CommentEvent({ comment: c2 });
      const ce3 = new CommentEvent({ comment: c3 });
      const be1 = new BlogPostEvent({ blogpost: b1 });
      const be2 = new BlogPostEvent({ blogpost: b2 });
      const be3 = new BlogPostEvent({ blogpost: b3 });

      const docs = [u1, u2, u3, c1, c2, c3, b1, b2, b3, ce1, ue1, be1, ce2, ue2, be2, ce3, ue3, be3];

      return Promise.all(docs.map(d => d.save())).
        then(() => Event.find({}).populate('user comment blogpost')).
        then(docs => {
          docs.forEach(function(doc) {
            if (doc.__t === 'Test1') {
              assert.ok(doc.user.name.indexOf('user') !== -1);
            } else if (doc.__t === 'Test2') {
              assert.ok(doc.comment.content.indexOf('comment') !== -1);
            } else if (doc.__t === 'Test3') {
              assert.ok(doc.blogpost.title.indexOf('blog post') !== -1);
            } else {
              assert.ok(false);
            }
          });
        });
    });

    it('dynref bug (gh-4104)', async function() {
      const PersonSchema = new Schema({
        name: { type: String }
      });

      const AnimalSchema = new Schema({
        name: { type: String }
      });

      const ThingSchema = new Schema({
        createdByModel: { type: String },
        createdBy: {
          type: mongoose.Schema.Types.ObjectId, refPath: 'createdByModel'
        }
      });

      const Thing = db.model('Test1', ThingSchema);
      const Person = db.model('Person', PersonSchema);
      const Animal = db.model('Test', AnimalSchema);

      const person = await Person.create({ name: 'Val' });
      const animal = await Animal.create({ name: 'Air Bud' });

      const obj1 = { createdByModel: 'Person', createdBy: person._id };
      const obj2 = { createdByModel: 'Test', createdBy: animal._id };
      await Thing.create(obj1, obj2);

      const things = await Thing.find({}).populate('createdBy').exec();

      assert.ok(things[0].createdBy.name);
      assert.ok(things[1].createdBy.name);
    });

    it('returned array has toObject() (gh-4656)', function(done) {
      const demoWrapperSchema = new Schema({
        demo: [{
          type: String,
          ref: 'Test'
        }]
      });
      const demoSchema = new Schema({ name: String });

      const Demo = db.model('Test', demoSchema);
      const DemoWrapper = db.model('Test1', demoWrapperSchema);

      Demo.create({ name: 'test' }).
        then(function(demo) { return DemoWrapper.create({ demo: [demo._id] }); }).
        then(function(wrapper) { return DemoWrapper.findById(wrapper._id); }).
        then(function(doc) { return doc.populate('demo'); }).
        then(function(res) {
          assert.equal(res.demo.toObject()[0].name, 'test');
          done();
        }).
        catch(done);
    });

    it('empty array (gh-4284)', async function() {
      const PersonSchema = new Schema({
        name: { type: String }
      });

      const BandSchema = new Schema({
        people: [{
          type: mongoose.Schema.Types.ObjectId
        }]
      });

      const Person = db.model('Person', PersonSchema);
      const Band = db.model('Test', BandSchema);

      let band = { people: [new mongoose.Types.ObjectId()] };
      band = await Band.create(band);
      const opts = { path: 'people', model: Person };
      band = await Band.findById(band).populate(opts);
      assert.equal(band.people.length, 0);

    });

    it('empty populate string is a no-op (gh-4702)', async function() {
      const BandSchema = new Schema({
        people: [{
          type: mongoose.Schema.Types.ObjectId
        }]
      });

      const Band = db.model('Test', BandSchema);

      let band = { people: [new mongoose.Types.ObjectId()] };
      band = await Band.create(band);
      band = await Band.findById(band).populate('');
      assert.equal(band.people.length, 1);

    });

    it('checks field name correctly with nested arrays (gh-4365)', async function() {
      const UserSchema = new mongoose.Schema({
        name: {
          type: String,
          default: ''
        }
      });
      db.model('User', UserSchema);

      const GroupSchema = new mongoose.Schema({
        name: String,
        members: [String]
      });

      const OrganizationSchema = new mongoose.Schema({
        members: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }],
        groups: [GroupSchema]
      });
      const OrganizationModel = db.model('Test', OrganizationSchema);

      let org = {
        members: [],
        groups: []
      };
      await OrganizationModel.create(org);
      org = await OrganizationModel.
        findOne({}).
        populate('members', 'name');
      org.groups.push({ name: 'Team Rocket' });
      await org.save();
      org.groups[0].members.push('Jessie');
      assert.equal(org.groups[0].members[0], 'Jessie');
      await org.save();
      assert.equal(org.groups[0].members[0], 'Jessie');

    });

    describe('populate virtuals (gh-2562)', function() {
      it('basic populate virtuals', async function() {
        const PersonSchema = new Schema({
          name: String,
          band: String
        });

        const BandSchema = new Schema({
          name: String
        });
        BandSchema.virtual('members', {
          ref: 'Person',
          localField: 'name',
          foreignField: 'band'
        });

        const Person = db.model('Person', PersonSchema);
        const Band = db.model('Test', BandSchema);

        const people = ['Axl Rose', 'Slash'].map(function(v) {
          return { name: v, band: 'Guns N\' Roses' };
        });
        await Person.create(people);
        await Band.create({ name: 'Guns N\' Roses' });
        const query = { name: 'Guns N\' Roses' };
        const gnr = await Band.findOne(query).populate('members');
        assert.equal(gnr.members.length, 2);

      });

      it('match (gh-6787)', async function() {
        const PersonSchema = new Schema({ name: String, band: String });
        const BandSchema = new Schema({ name: String });
        BandSchema.virtual('members', {
          ref: 'Person',
          localField: 'name',
          foreignField: 'band',
          options: {
            match: { name: /^a/i }
          }
        });

        const Person = db.model('Person', PersonSchema);
        const Band = db.model('Test', BandSchema);

        const people = ['BB', 'AA', 'AB', 'BA'].map(function(v) {
          return { name: v, band: 'Test' };
        });


        await Person.create(people);
        await Band.create({ name: 'Test' });

        const band = await Band.findOne().populate('members');
        assert.deepEqual(band.members.map(b => b.name).sort(), ['AA', 'AB']);
      });

      it('multiple source docs', async function() {
        const PersonSchema = new Schema({
          name: String,
          band: String
        });

        const BandSchema = new Schema({
          name: String
        });
        BandSchema.virtual('members', {
          ref: 'Person',
          localField: 'name',
          foreignField: 'band'
        });

        const Person = db.model('Person', PersonSchema);
        const Band = db.model('Test', BandSchema);

        let people = ['Axl Rose', 'Slash'].map(function(v) {
          return { name: v, band: 'Guns N\' Roses' };
        });
        people = people.concat(['Vince Neil', 'Nikki Sixx'].map(function(v) {
          return { name: v, band: 'Motley Crue' };
        }));
        await Person.create(people);
        let bands = [
          { name: 'Guns N\' Roses' },
          { name: 'Motley Crue' }
        ];
        await Band.create(bands);
        bands = await Band.
          find({}).
          sort({ name: 1 }).
          populate({ path: 'members', options: { sort: { name: 1 } } });

        assert.equal(bands.length, 2);
        assert.equal(bands[0].name, 'Guns N\' Roses');
        assert.equal(bands[0].members.length, 2);
        assert.deepEqual(bands[0].members.map(v => v.name),
          ['Axl Rose', 'Slash']);

        assert.equal(bands[1].name, 'Motley Crue');
        assert.equal(bands[1].members.length, 2);
        assert.deepEqual(bands[1].members.map(v => v.name),
          ['Nikki Sixx', 'Vince Neil']);

      });

      it('catchable error if localField or foreignField not specified (gh-6767)', function() {
        const BandSchema = new Schema({
          name: String
        });
        BandSchema.virtual('members');

        const Band = db.model('Test', BandSchema);

        return Band.create({ name: 'Motley Crue' }).
          then(() => Band.find().populate('members')).
          catch(error => {
            assert.ok(error.message.indexOf('foreignField') !== -1, error.message);
          });
      });

      it('source array', async function() {
        const PersonSchema = new Schema({
          name: String
        });

        const BandSchema = new Schema({
          name: String,
          people: [String]
        });
        BandSchema.virtual('members', {
          ref: 'Person',
          localField: 'people',
          foreignField: 'name'
        });

        const Person = db.model('Person', PersonSchema);
        const Band = db.model('Test', BandSchema);

        let bands = [
          { name: 'Guns N\' Roses', people: ['Axl Rose', 'Slash'] },
          { name: 'Motley Crue', people: ['Vince Neil', 'Nikki Sixx'] }
        ];
        const people = [
          { name: 'Axl Rose' },
          { name: 'Slash' },
          { name: 'Vince Neil' },
          { name: 'Nikki Sixx' }
        ];

        await Person.create(people);
        await Band.insertMany(bands);
        bands = await Band.
          find({}).
          sort({ name: 1 }).
          populate({ path: 'members', options: { sort: { name: 1 } } });

        assert.equal(bands.length, 2);
        assert.equal(bands[0].name, 'Guns N\' Roses');
        assert.equal(bands[0].members.length, 2);
        assert.deepEqual(bands[0].members.map(v => v.name),
          ['Axl Rose', 'Slash']);

        assert.equal(bands[1].name, 'Motley Crue');
        assert.equal(bands[1].members.length, 2);
        assert.deepEqual(bands[1].members.map(v => v.name),
          ['Nikki Sixx', 'Vince Neil']);


      });

      it('multiple paths (gh-4234)', async function() {
        const PersonSchema = new Schema({
          name: String,
          authored: [Number],
          favorites: [Number]
        });

        const BlogPostSchema = new Schema({
          _id: Number,
          title: String
        });
        BlogPostSchema.virtual('authors', {
          ref: 'Person',
          localField: '_id',
          foreignField: 'authored'
        });
        BlogPostSchema.virtual('favoritedBy', {
          ref: 'Person',
          localField: '_id',
          foreignField: 'favorites'
        });

        const Person = db.model('Person', PersonSchema);
        const BlogPost = db.model('BlogPost', BlogPostSchema);

        const blogPosts = [{ _id: 0, title: 'Bacon is Great' }];
        const people = [{ name: 'Val', authored: [0], favorites: [0] }];

        await Person.create(people);
        await BlogPost.create(blogPosts);
        const post = await BlogPost.
          findOne({ _id: 0 }).
          populate('authors favoritedBy');
        assert.equal(post.authors.length, 1);
        assert.equal(post.authors[0].name, 'Val');
        assert.equal(post.favoritedBy.length, 1);
        assert.equal(post.favoritedBy[0].name, 'Val');

      });

      it('in embedded array (gh-4928)', function(done) {
        const PersonSchema = new Schema({
          name: String,
          authored: [Number]
        });

        const BlogPostSchema = new Schema({
          _id: Number,
          title: String
        });
        BlogPostSchema.virtual('author', {
          ref: 'Person',
          localField: '_id',
          foreignField: 'authored',
          justOne: true
        });

        const CollectionSchema = new Schema({
          blogPosts: [BlogPostSchema]
        });

        const Person = db.model('Person', PersonSchema);
        const Collection = db.model('Test', CollectionSchema);

        Person.create({ name: 'Val', authored: 1 }).
          then(function() {
            return Collection.create({
              blogPosts: [{ _id: 1, title: 'Test' }]
            });
          }).
          then(function(c) {
            return Collection.findById(c._id).populate('blogPosts.author');
          }).
          then(function(c) {
            assert.equal(c.blogPosts[0].author.name, 'Val');
            done();
          }).
          catch(done);
      });

      it('in embedded array with sort (gh-10552)', async function() {
        const AppMenuItemSchema = new Schema({
          appId: 'ObjectId',
          moduleId: Number,
          title: String,
          parent: {
            type: mongoose.ObjectId,
            ref: 'AppMenuItem'
          },
          order: Number
        });

        const moduleSchema = new Schema({
          _id: Number,
          title: { type: String },
          hidden: { type: Boolean }
        });

        moduleSchema.virtual('menu', {
          ref: 'Test1',
          localField: '_id',
          foreignField: 'moduleId',
          options: { sort: { title: 1 } }
        });

        const appSchema = new Schema({
          modules: [moduleSchema]
        });

        const App = db.model('Test', appSchema);
        const AppMenuItem = db.model('Test1', AppMenuItemSchema);


        let app = await App.create({ modules: [{ _id: 1, title: 'File' }, { _id: 2, title: 'Preferences' }] });
        await AppMenuItem.create([
          { title: 'Save', moduleId: 1 },
          { title: 'Save As', moduleId: 1 },
          { title: 'Undo', moduleId: 2 },
          { title: 'Redo', moduleId: 2 }
        ]);

        app = await App.findById(app).populate('modules.menu');
        app = app.toObject({ virtuals: true });

        assert.equal(app.modules.length, 2);
        assert.equal(app.modules[0].menu.length, 2);
        assert.deepEqual(app.modules[0].menu.map(i => i.title), ['Save', 'Save As']);
        assert.deepEqual(app.modules[1].menu.map(i => i.title), ['Redo', 'Undo']);
      });

      it('in embedded array with sort and one result (gh-10552)', async function() {
        const AppMenuItemSchema = new Schema({
          appId: 'ObjectId',
          moduleId: Number,
          title: String,
          parent: {
            type: mongoose.ObjectId,
            ref: 'AppMenuItem'
          },
          order: Number
        });

        const moduleSchema = new Schema({
          _id: Number,
          title: { type: String },
          hidden: { type: Boolean }
        });

        moduleSchema.virtual('menu', {
          ref: 'Test1',
          localField: '_id',
          foreignField: 'moduleId',
          options: { sort: { title: 1 } }
        });

        const appSchema = new Schema({
          modules: [moduleSchema]
        });

        const App = db.model('Test', appSchema);
        const AppMenuItem = db.model('Test1', AppMenuItemSchema);

        let app = await App.create({ modules: [{ _id: 1, title: 'File' }, { _id: 2, title: 'Preferences' }] });
        await AppMenuItem.create([
          { title: 'Save', moduleId: 1 },
          { title: 'Save As', moduleId: 1 },
          // { title: 'Undo', moduleId: 2 },
          { title: 'Redo', moduleId: 2 }
        ]);

        app = await App.findById(app).populate('modules.menu');
        app = app.toObject({ virtuals: true });

        assert.equal(app.modules.length, 2);
        assert.equal(app.modules[0].menu.length, 2);
        assert.deepEqual(app.modules[0].menu.map(i => i.title), ['Save', 'Save As']);
        assert.deepEqual(app.modules[1].menu.map(i => i.title), ['Redo']);
      });

      it('justOne option (gh-4263)', async function() {
        const PersonSchema = new Schema({
          name: String,
          authored: [Number]
        });

        const BlogPostSchema = new Schema({
          _id: Number,
          title: String
        });
        BlogPostSchema.virtual('author', {
          ref: 'Person',
          localField: '_id',
          foreignField: 'authored',
          justOne: true
        });

        const Person = db.model('Person', PersonSchema);
        const BlogPost = db.model('BlogPost', BlogPostSchema);

        const blogPosts = [{ _id: 0, title: 'Bacon is Great' }];
        const people = [
          { name: 'Val', authored: [0] },
          { name: 'Test', authored: [0] }
        ];

        await Person.create(people);
        await BlogPost.create(blogPosts);
        const post = await BlogPost.
          findOne({ _id: 0 }).
          populate('author');
        assert.strictEqual(Array.isArray(post.author), false);
        assert.ok(post.author.name.match(/^(Val|Test)$/));

      });

      it('justOne + lean (gh-6234)', async function() {
        const PersonSchema = new mongoose.Schema({
          name: String,
          band: String
        });

        const BandSchema = new mongoose.Schema({
          name: String
        });

        BandSchema.virtual('member', {
          ref: 'Person',
          localField: 'name',
          foreignField: 'band',
          justOne: true
        });

        const Person = db.model('Person', PersonSchema);
        const Band = db.model('Test', BandSchema);

        await Band.create({ name: 'Guns N\' Roses' });
        await Band.create({ name: 'Motley Crue' });
        await Person.create({ name: 'Axl Rose', band: 'Guns N\' Roses' });
        await Person.create({ name: 'Slash', band: 'Guns N\' Roses' });
        await Person.create({ name: 'Vince Neil', band: 'Motley Crue' });
        await Person.create({ name: 'Nikki Sixx', band: 'Motley Crue' });

        const res = await Band.find().
          sort({ name: 1 }).
          populate('member').
          lean();

        assert.equal(res.length, 2);
        assert.equal(res[0].name, 'Guns N\' Roses');
        assert.equal(res[0].member.name, 'Axl Rose');
        assert.equal(res[1].name, 'Motley Crue');
        assert.equal(res[1].member.name, 'Vince Neil');
      });

      it('sets empty array if lean with justOne = false and no results (gh-10992)', async function() {
        const PersonSchema = new mongoose.Schema({
          name: String,
          band: String
        });

        const BandSchema = new mongoose.Schema({
          name: String
        });

        BandSchema.virtual('members', {
          ref: 'Person',
          localField: 'name',
          foreignField: 'band',
          justOne: false
        });

        db.model('Person', PersonSchema);
        const Band = db.model('Test', BandSchema);

        await Band.create({ name: 'Guns N\' Roses' });

        const res = await Band.find().populate('members').lean();

        assert.equal(res.length, 1);
        assert.equal(res[0].name, 'Guns N\' Roses');
        assert.deepStrictEqual(res[0].members, []);
      });

      it('justOne underneath array (gh-6867)', async function() {

        const ReportItemSchema = new Schema({
          idItem: String
        });

        const ReportSchema = new Schema({
          items: [ReportItemSchema]
        });

        ReportItemSchema.virtual('itemDetail', {
          ref: 'Child',
          localField: 'idItem',
          foreignField: '_id',
          justOne: true // here is the problem
        });

        const ItemSchema = new Schema({
          _id: String
        });

        const ReportModel = db.model('Parent', ReportSchema);
        const ItemModel = db.model('Child', ItemSchema);

        await ItemModel.create({ _id: 'foo' });

        await ReportModel.create({
          items: [{ idItem: 'foo' }, { idItem: 'bar' }]
        });

        let doc = await ReportModel.findOne({}).populate('items.itemDetail');
        doc = doc.toObject({ virtuals: true });
        assert.equal(doc.items[0].itemDetail._id, 'foo');
        assert.ok(!doc.items[1].itemDetail);
      });

      it('with no results and justOne (gh-4284)', async function() {
        const PersonSchema = new Schema({
          name: String,
          authored: [Number]
        });

        const BlogPostSchema = new Schema({
          _id: Number,
          title: String
        });
        BlogPostSchema.virtual('author', {
          ref: 'Person',
          localField: '_id',
          foreignField: 'authored',
          justOne: true
        });

        const Person = db.model('Person', PersonSchema);
        const BlogPost = db.model('BlogPost', BlogPostSchema);

        const blogPosts = [
          { _id: 0, title: 'Bacon is Great' },
          { _id: 1, title: 'Bacon is OK' }
        ];
        const people = [
          { name: 'Val', authored: [0] }
        ];

        await Person.create(people);
        await BlogPost.create(blogPosts);
        const posts = await BlogPost.
          find({}).
          sort({ title: 1 }).
          populate('author');
        assert.equal(posts[0].author.name, 'Val');
        assert.strictEqual(posts[1].author, null);

      });

      it('with multiple results and justOne (gh-4329)', async function() {
        const UserSchema = new Schema({
          openId: String
        });
        const CommentSchema = new Schema({
          openId: String
        });

        CommentSchema.virtual('user', {
          ref: 'User',
          localField: 'openId',
          foreignField: 'openId',
          justOne: true
        });

        const User = db.model('User', UserSchema);
        const Comment = db.model('Comment', CommentSchema);

        await User.create({ openId: 'user1' }, { openId: 'user2' });
        await Comment.create({ openId: 'user1' }, { openId: 'user2' });
        const tasks = await Comment.
          find().
          sort({ openId: 1 }).
          populate('user');

        assert.ok(tasks[0].user);
        assert.ok(tasks[1].user);
        const users = tasks.map(function(task) {
          return task.user.openId;
        });
        assert.deepEqual(users, ['user1', 'user2']);

      });

      it('virtuals with getters (gh-9343)', async function() {
        const UserSchema = new Schema({
          openId: String,
          test: String
        });
        const CommentSchema = new Schema({
          openId: String
        });

        CommentSchema.virtual('user', {
          ref: 'User',
          localField: 'openId',
          foreignField: 'openId',
          justOne: true
        }).get(v => v.test);

        const User = db.model('User', UserSchema);
        const Comment = db.model('Comment', CommentSchema);


        await Comment.create({ openId: 'test' });
        await User.create({ openId: 'test', test: 'my string' });

        const comment = await Comment.findOne({ openId: 'test' }).populate('user');
        assert.equal(comment.user, 'my string');
      });

      it('virtuals with `get` option (gh-9343)', async function() {
        const UserSchema = new Schema({
          openId: String,
          test: String
        });
        const CommentSchema = new Schema({
          openId: String
        });

        CommentSchema.virtual('user', {
          ref: 'User',
          localField: 'openId',
          foreignField: 'openId',
          justOne: true,
          get: v => v.test
        });

        const User = db.model('User', UserSchema);
        const Comment = db.model('Comment', CommentSchema);


        await Comment.create({ openId: 'test' });
        await User.create({ openId: 'test', test: 'my string' });

        const comment = await Comment.findOne({ openId: 'test' }).populate('user');
        assert.equal(comment.user, 'my string');
      });

      it('hydrates properly (gh-4618)', function(done) {
        const ASchema = new Schema({
          name: { type: String }
        });

        const BSchema = new Schema({
          name: { type: String },
          a_id: { type: ObjectId }
        }, {
          toObject: { virtuals: true },
          toJSON: { virtuals: true }
        });

        BSchema.virtual('a', {
          ref: 'Test',
          localField: 'a_id',
          foreignField: '_id'
        });

        const A = db.model('Test', ASchema);
        const B = db.model('Test1', BSchema);

        A.create({ name: 'test' }).
          then(function(a) {
            return B.create({ name: 'test2', a_id: a._id });
          }).
          then(function(b) { return B.findById(b).populate('a').exec(); }).
          then(function(b) {
            assert.equal(b.toObject().a[0].name, 'test');
            done();
          }).
          catch(done);
      });

      it('with functions for localField and foreignField (gh-5704)', function(done) {
        const ASchema = new Schema({
          name: String
        });

        const BSchema = new Schema({
          name: String,
          localField: String,
          firstId: ObjectId,
          secondId: ObjectId
        }, {
          toObject: { virtuals: true },
          toJSON: { virtuals: true }
        });

        BSchema.virtual('a', {
          ref: 'Test1',
          localField: function() { return this.localField; },
          foreignField: function() { return '_id'; },
          justOne: true
        });

        const A = db.model('Test1', ASchema);
        const B = db.model('Test2', BSchema);

        A.create([{ name: 'test1' }, { name: 'test2' }]).
          then(function(arr) {
            return B.create([
              {
                name: 'b1',
                localField: 'firstId',
                firstId: arr[0]._id,
                secondId: arr[1]._id
              },
              {
                name: 'b2',
                localField: 'secondId',
                firstId: arr[0]._id,
                secondId: arr[1]._id
              }
            ]);
          }).
          then(function() {
            return B.find().populate('a').sort([['name', 1]]).exec();
          }).
          then(function(bs) {
            assert.equal(bs[0].a.name, 'test1');
            assert.equal(bs[1].a.name, 'test2');
            done();
          }).
          catch(done);
      });

      it('with functions for ref (gh-5602)', function(done) {
        const ASchema = new Schema({
          name: String
        });

        const BSchema = new Schema({
          referencedModel: String,
          aId: ObjectId
        });

        BSchema.virtual('a', {
          ref: function() { return this.referencedModel; },
          localField: 'aId',
          foreignField: '_id',
          justOne: true
        });

        const A1 = db.model('Test1', ASchema);
        const A2 = db.model('Test2', ASchema);
        const B = db.model('Test', BSchema);

        A1.create({ name: 'a1' }).
          then(function(a1) {
            return A2.create({ name: 'a2' }).then(function(res) {
              return [a1].concat(res);
            });
          }).
          then(function(as) {
            return B.create([
              { name: 'test1', referencedModel: 'Test1', aId: as[0]._id },
              { name: 'test2', referencedModel: 'Test2', aId: as[1]._id }
            ]);
          }).
          then(function() {
            return B.find().populate('a').sort([['name', 1]]);
          }).
          then(function(bs) {
            assert.equal(bs.length, 2);
            assert.deepEqual(bs.map(b => b.a.name).sort(), ['a1', 'a2']);
            done();
          }).
          catch(done);
      });

      it('with functions for match (gh-7397)', async function() {
        const ASchema = new Schema({
          name: String,
          createdAt: Date
        });

        const BSchema = new Schema({
          as: [{ type: ObjectId, ref: 'Test' }],
          minDate: Date
        });

        const A = db.model('Test', ASchema);
        const B = db.model('Test1', BSchema);


        const as = await A.create([
          { name: 'old', createdAt: '2015-06-01' },
          { name: 'newer', createdAt: '2017-06-01' },
          { name: 'newest', createdAt: '2019-06-01' }
        ]);

        await B.create({ as: as.map(a => a._id), minDate: '2016-01-01' });
        const b = await B.findOne().populate({
          path: 'as',
          match: doc => ({ createdAt: { $gte: doc.minDate } })
        });
        assert.equal(b.as.length, 2);
        assert.deepEqual(b.as.map(a => a.name), ['newer', 'newest']);

        await B.create({ as: as.map(a => a._id), minDate: '2018-01-01' });
        const bs = await B.find().sort({ minDate: 1 }).populate({
          path: 'as',
          match: doc => ({ createdAt: { $gte: doc.minDate } })
        });
        assert.equal(bs[0].minDate.toString(), new Date('2016-01-01').toString());
        assert.equal(bs[1].minDate.toString(), new Date('2018-01-01').toString());
        assert.equal(bs[0].as.length, 2);
        assert.deepEqual(bs[0].as.map(a => a.name), ['newer', 'newest']);
        assert.equal(bs[1].as.length, 1);
        assert.deepEqual(bs[1].as.map(a => a.name), ['newest']);
      });

      it('with functions for match and foreignField (gh-7397)', async function() {
        const ASchema = new Schema({
          name: String,
          createdAt: Date,
          b: ObjectId,
          b2: ObjectId
        });

        const BSchema = new Schema({
          alternateProperty: Boolean,
          minDate: Date
        });

        BSchema.virtual('as', {
          ref: 'Test1',
          localField: '_id',
          foreignField: function() { return this.alternateProperty ? 'b2' : 'b'; },
          options: { match: doc => ({ createdAt: { $gte: doc.minDate } }) }
        });

        const A = db.model('Test1', ASchema);
        const B = db.model('Test2', BSchema);


        let bs = await B.create([
          { minDate: '2016-01-01' },
          { minDate: '2016-01-01', alternateProperty: true }
        ]);
        await A.create([
          { name: 'old', createdAt: '2015-06-01', b: bs[0]._id, b2: bs[1]._id },
          { name: 'newer', createdAt: '2017-06-01', b: bs[0]._id, b2: bs[1]._id },
          { name: 'newest', createdAt: '2019-06-01', b: bs[0]._id, b2: bs[1]._id }
        ]);

        bs = await B.find().sort({ minDate: 1 }).populate('as');

        let b = bs[0];
        assert.equal(b.as.length, 2);
        assert.deepEqual(b.as.map(a => a.name).sort(), ['newer', 'newest']);

        b = bs[1];
        assert.equal(b.as.length, 2);
        assert.deepEqual(b.as.map(a => a.name).sort(), ['newer', 'newest']);
      });

      it('with function for refPath (gh-6669)', async function() {
        const connectionSchema = new Schema({
          destination: String
        });

        const Conn = db.model('Test1', connectionSchema);

        const userSchema = new Schema({
          name: String
        });

        const User = db.model('Test2', userSchema);

        const agentSchema = new Schema({
          vendor: String
        });

        const Agent = db.model('Test3', agentSchema);

        const subSchema = new Schema({
          kind: {
            type: String
          },
          item: {
            type: Schema.Types.ObjectId,
            refPath: function(doc, path) {
              return path.replace(/\.item$/, '.kind');
            }
          }
        });

        const recordSchema = new Schema({
          name: String,
          connections: [subSchema],
          users: [subSchema],
          agents: [subSchema]
        });

        const Record = db.model('Test', recordSchema);

        const connection = new Conn({ destination: '192.168.1.15' });
        const user = new User({ name: 'Kev' });
        const agent = new Agent({ vendor: 'chrome' });
        const record = new Record({
          connections: [{ kind: 'Test1', item: connection._id }],
          users: [{ kind: 'Test2', item: user._id }],
          agents: [{ kind: 'Test3', item: agent._id }]
        });


        await connection.save();
        await user.save();
        await agent.save();
        await record.save();
        const doc = await Record.findOne({})
          .populate('connections.item')
          .populate('users.item')
          .populate('agents.item');
        assert.strictEqual(doc.connections[0].item.destination, '192.168.1.15');
        assert.strictEqual(doc.users[0].item.name, 'Kev');
        assert.strictEqual(doc.agents[0].item.vendor, 'chrome');
      });

      it('with no results (gh-4284)', async function() {
        const PersonSchema = new Schema({
          name: String,
          authored: [Number]
        });

        const BlogPostSchema = new Schema({
          _id: Number,
          title: String
        });
        BlogPostSchema.virtual('authors', {
          ref: 'Person',
          localField: '_id',
          foreignField: 'authored'
        });

        const Person = db.model('Person', PersonSchema);
        const BlogPost = db.model('BlogPost', BlogPostSchema);

        const blogPosts = [
          { _id: 0, title: 'Bacon is Great' },
          { _id: 1, title: 'Bacon is OK' },
          { _id: 2, title: 'Bacon is not great' }
        ];
        const people = [
          { name: 'Val', authored: [0] },
          { name: 'Test', authored: [0, 1] }
        ];

        await Person.create(people);
        await BlogPost.create(blogPosts);
        const posts = await BlogPost.
          find({}).
          sort({ _id: 1 }).
          populate('authors');
        const arr = posts[0].toObject({ virtuals: true }).authors.
          map(function(v) {
            return v.name;
          }).
          sort();
        assert.deepEqual(arr, ['Test', 'Val']);
        assert.equal(posts[1].authors.length, 1);
        assert.equal(posts[1].authors[0].name, 'Test');
        assert.equal(posts[2].authors.length, 0);

      });

      it('virtual is undefined when not populated (gh-7795)', async function() {
        const BlogPostSchema = new Schema({
          _id: Number,
          title: String
        });
        BlogPostSchema.virtual('authors', {
          ref: 'Person',
          localField: '_id',
          foreignField: 'authored'
        });

        const BlogPost = db.model('BlogPost', BlogPostSchema);


        await BlogPost.create({ _id: 1, title: 'test' });

        const doc = await BlogPost.findOne();
        assert.strictEqual(doc.authors, void 0);
      });

      it('deep populate virtual -> conventional (gh-4261)', async function() {
        const PersonSchema = new Schema({
          name: String
        });

        PersonSchema.virtual('blogPosts', {
          ref: 'BlogPost',
          localField: '_id',
          foreignField: 'author'
        });

        const BlogPostSchema = new Schema({
          title: String,
          author: { type: ObjectId },
          comments: [{ author: { type: ObjectId, ref: 'Person' } }]
        });

        const Person = db.model('Person', PersonSchema);
        const BlogPost = db.model('BlogPost', BlogPostSchema);

        let people = [
          { name: 'Val' },
          { name: 'Test' }
        ];

        people = await Person.create(people);
        const post = {
          title: 'Test1',
          author: people[0]._id,
          comments: [{ author: people[1]._id }]
        };
        await BlogPost.create(post);
        const person = await Person.findById(people[0]._id).
          populate({
            path: 'blogPosts',
            model: BlogPost,
            populate: {
              path: 'comments.author',
              model: Person
            }
          });
        assert.equal(person.blogPosts[0].comments[0].author.name,
          'Test');

      });

      it('deep populate virtual -> virtual (gh-4278)', async function() {
        const ASchema = new Schema({
          name: String
        });
        ASchema.virtual('bs', {
          ref: 'Test2',
          localField: '_id',
          foreignField: 'a'
        });

        const BSchema = new Schema({
          a: mongoose.Schema.Types.ObjectId,
          name: String
        });
        BSchema.virtual('cs', {
          ref: 'Test3',
          localField: '_id',
          foreignField: 'b'
        });

        const CSchema = new Schema({
          b: mongoose.Schema.Types.ObjectId,
          name: String
        });

        const A = db.model('Test1', ASchema);
        const B = db.model('Test2', BSchema);
        const C = db.model('Test3', CSchema);

        const a = await A.create({ name: 'A1' });
        const b = await B.create({ name: 'B1', a: a._id });
        await C.create({ name: 'C1', b: b._id });
        const options = {
          path: 'bs',
          populate: {
            path: 'cs'
          }
        };
        const res = await A.findById(a).populate(options);
        assert.equal(res.bs.length, 1);
        assert.equal(res.bs[0].name, 'B1');
        assert.equal(res.bs[0].cs.length, 1);
        assert.equal(res.bs[0].cs[0].name, 'C1');

      });

      it('source array (gh-4585)', function(done) {
        const tagSchema = new mongoose.Schema({
          name: String,
          tagId: String
        });

        const blogPostSchema = new mongoose.Schema({
          name: String,
          body: String,
          tags: [String]
        });

        blogPostSchema.virtual('tagsDocuments', {
          ref: 'Test', // model
          localField: 'tags',
          foreignField: 'tagId'
        });

        const Tag = db.model('Test', tagSchema);
        const BlogPost = db.model('BlogPost', blogPostSchema);

        const tags = [
          {
            name: 'angular.js',
            tagId: 'angular'
          },
          {
            name: 'node.js',
            tagId: 'node'
          },
          {
            name: 'javascript',
            tagId: 'javascript'
          }
        ];

        Tag.create(tags).
          then(function() {
            return BlogPost.create({
              title: 'test',
              tags: ['angular', 'javascript']
            });
          }).
          then(function(post) {
            return BlogPost.findById(post._id).populate('tagsDocuments');
          }).
          then(function(doc) {
            assert.equal(doc.tags[0], 'angular');
            assert.equal(doc.tags[1], 'javascript');
            assert.equal(doc.tagsDocuments[0].tagId, 'angular');
            assert.equal(doc.tagsDocuments[1].tagId, 'javascript');
            done();
          }).
          catch(done);
      });

      it('lean with single result and no justOne (gh-4288)', async function() {
        const PersonSchema = new Schema({
          name: String,
          authored: [Number]
        });

        const BlogPostSchema = new Schema({
          _id: Number,
          title: String
        });
        BlogPostSchema.virtual('authors', {
          ref: true,
          localField: '_id',
          foreignField: 'authored',
          justOne: false
        });

        const Person = db.model('Person', PersonSchema);
        const BlogPost = db.model('BlogPost', BlogPostSchema);

        const blogPosts = [
          { _id: 0, title: 'Bacon is Great' }
        ];
        const people = [
          { name: 'Val', authored: [0] }
        ];

        await Person.create(people);
        await BlogPost.create(blogPosts);
        const post = await BlogPost.
          findOne({}).
          lean().
          populate({ path: 'authors', model: Person });
        assert.equal(post.authors.length, 1);
        assert.equal(post.authors[0].name, 'Val');

      });

      it('gh-4923', function() {
        const ClusterSchema = new Schema({
          name: String
        });
        const Cluster = db.model('Test', ClusterSchema);

        const ZoneSchema = new Schema({
          name: String,
          clusters: {
            type: [ObjectId],
            ref: 'Test'
          }
        });
        const Zone = db.model('Test1', ZoneSchema);

        const DocSchema = new Schema({
          activity: [{
            cluster: {
              type: ObjectId,
              ref: 'Test'
            },
            intensity: Number
          }]
        });
        DocSchema.virtual('activity.zones', {
          ref: 'Test1',
          localField: 'activity.cluster',
          foreignField: 'clusters'
        });
        DocSchema.set('toObject', { virtuals: true });
        DocSchema.set('toJSON', { virtuals: true });
        const Doc = db.model('Test2', DocSchema);

        return Cluster.create([{ name: 'c1' }, { name: 'c2' }, { name: 'c3' }]).
          then(function(c) {
            return Zone.create([
              { name: 'z1', clusters: [c[0]._id, c[1]._id, c[2]._id] },
              { name: 'z2', clusters: [c[0]._id, c[2]._id] }
            ]).then(function() { return c; });
          }).
          then(function(c) {
            return Doc.create({
              activity: [
                { cluster: c[0]._id, intensity: 1 },
                { cluster: c[1]._id, intensity: 2 }
              ]
            });
          }).
          then(function() {
            return Doc.
              findOne({}).
              populate('activity.cluster').
              populate('activity.zones', 'name clusters').
              exec();
          }).
          then(res => {
            res = res.toObject({ virtuals: true });
            const compare = function(a, b) {
              if (a.name < b.name) {
                return -1;
              } else if (b.name < a.name) {
                return 1;
              }
              return 0;
            };
            res.activity[0].zones.sort(compare);
            res.activity[1].zones.sort(compare);
            assert.equal(res.activity[0].zones[0].name, 'z1');
            assert.equal(res.activity[1].zones[0].name, 'z1');
          });
      });

      it('supports setting default options in schema (gh-4741)', function(done) {
        const sessionSchema = new Schema({
          date: { type: Date },
          user: { type: Schema.ObjectId, ref: 'User' }
        });

        const userSchema = new Schema({
          name: String
        });

        userSchema.virtual('sessions', {
          ref: 'Test',
          localField: '_id',
          foreignField: 'user',
          options: { sort: { date: -1 }, limit: 2 }
        });

        const Session = db.model('Test', sessionSchema);
        const User = db.model('User', userSchema);

        User.create({ name: 'Val' }).
          then(function(user) {
            return Session.create([
              { date: '2011-06-01', user: user._id },
              { date: '2011-06-02', user: user._id },
              { date: '2011-06-03', user: user._id }
            ]);
          }).
          then(function(sessions) {
            return User.findById(sessions[0].user).populate('sessions');
          }).
          then(function(user) {
            assert.equal(user.sessions.length, 2);
            assert.equal(user.sessions[0].date.valueOf(),
              new Date('2011-06-03').valueOf());
            assert.equal(user.sessions[1].date.valueOf(),
              new Date('2011-06-02').valueOf());
            done();
          }).
          catch(done);
      });

      it('handles populate with 0 args (gh-5036)', async function() {
        const userSchema = new Schema({
          name: String
        });

        const User = db.model('User', userSchema);

        await User.findOne().populate();
      });

      it('attaches `_id` property to ref ids (gh-6359) (gh-6115)', function() {
        const articleSchema = new Schema({
          title: String,
          author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Person'
          }
        });
        const authorSchema = new Schema({
          name: String
        });

        const Article = db.model('BlogPost', articleSchema);
        const Author = db.model('Person', authorSchema);

        const author = new Author({ name: 'Val' });
        const article = new Article({
          title: 'async/await',
          author: author._id
        });

        assert.ok(!article.author.name);
        assert.equal(article.author.toHexString(), author._id.toHexString());
        assert.equal(article.author._id.toHexString(), author._id.toHexString());

        article.author = author;
        assert.equal(article.author.name, 'Val');
        assert.equal(article.author._id.toHexString(), author._id.toHexString());
      });

      describe('selectPopulatedFields (gh-5669)', function() {
        afterEach(function() {
          delete mongoose.options.selectPopulatedPaths;
        });

        it('auto select populated fields (gh-5669) (gh-5685)', async function() {
          const ProductSchema = new mongoose.Schema({
            name: {
              type: String
            },
            categories: {
              type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Test'
              }],
              select: false
            }
          });

          const CategorySchema = new Schema({ name: String });
          const Product = db.model('Product', ProductSchema);
          const Category = db.model('Test', CategorySchema);

          const doc = await Category.create({ name: 'Books' });
          let product = {
            name: 'Professional AngularJS',
            categories: [doc._id]
          };
          product = await Product.create(product);
          product = await Product.findById(product._id).populate('categories');
          assert.equal(product.categories.length, 1);
          assert.equal(product.categories[0].name, 'Books');
          product = await Product.findById(product._id).populate('categories').select({ categories: 0 });
          assert.ok(!product.categories);
          product = await Product.findById(product._id).select({ name: 0 }).populate('categories');
          assert.equal(product.categories.length, 1);
          assert.equal(product.categories[0].name, 'Books');
          assert.ok(!product.name);

        });

        it('disabling at schema level (gh-6546)', async function() {
          const Person = db.model('Person', new Schema({ name: String }));

          const bookSchema = new Schema({
            title: 'String',
            author: { type: 'ObjectId', ref: 'Person' }
          }, { selectPopulatedPaths: false });
          const Book = db.model('Product', bookSchema);


          const author = await Person.create({ name: 'Val' });
          await Book.create({
            title: 'Mastering Async/Await',
            author: author._id
          });

          const res = await Book.findOne().select('title').populate('author');
          assert.ok(!res.author);
        });

        it('disabling at global level (gh-6546)', async function() {
          const Person = db.model('Person', new Schema({ name: String }));

          const bookSchema = new Schema({
            title: 'String',
            author: { type: 'ObjectId', ref: 'Person' }
          });
          const Book = db.model('Product', bookSchema);

          mongoose.set('selectPopulatedPaths', false);


          const author = await Person.create({ name: 'Val' });
          await Book.create({
            title: 'Mastering Async/Await',
            author: author._id
          });

          const res = await Book.findOne().select('title').populate('author');
          assert.ok(!res.author);
        });

        it('schema overwrites global (gh-6546)', async function() {
          const Person = db.model('Person', new Schema({ name: String }));

          const bookSchema = new Schema({
            title: 'String',
            author: { type: 'ObjectId', ref: 'Person' }
          }, { selectPopulatedPaths: true });
          const Book = db.model('Product', bookSchema);

          mongoose.set('selectPopulatedPaths', false);


          const author = await Person.create({ name: 'Val' });
          await Book.create({
            title: 'Mastering Async/Await',
            author: author._id
          });

          const res = await Book.findOne().select('title').populate('author');
          assert.equal(res.author.name, 'Val');
        });
      });

      it('handles populating with discriminators that may not have a ref (gh-4817)', function(done) {
        const imagesSchema = new mongoose.Schema({
          name: {
            type: String,
            required: true
          }
        });
        const Image = db.model('Image', imagesSchema);

        const fieldSchema = new mongoose.Schema({
          name: {
            type: String,
            required: true
          }
        });
        const Field = db.model('Test', fieldSchema);

        const imageFieldSchema = new mongoose.Schema({
          value: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Image',
            default: null
          }
        });
        const FieldImage = Field.discriminator('Test1', imageFieldSchema);

        const textFieldSchema = new mongoose.Schema({
          value: {
            type: Schema.Types.Mixed,
            required: true,
            default: {}
          }
        });
        const FieldText = Field.discriminator('Test2', textFieldSchema);

        const objectSchema = new mongoose.Schema({
          name: {
            type: String,
            required: true
          },
          fields: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Test'
          }]
        });
        const ObjectModel = db.model('Test3', objectSchema);

        Image.create({ name: 'testing' }).
          then(function(image) {
            return FieldImage.create({ name: 'test', value: image._id });
          }).
          then(function(fieldImage) {
            return FieldText.create({ name: 'test', value: 'test' }).
              then(function(fieldText) {
                return [fieldImage, fieldText];
              });
          }).
          then(function(fields) {
            return ObjectModel.create({ fields: fields, name: 'test' });
          }).
          then(function(obj) {
            return ObjectModel.findOne({ _id: obj._id }).populate({
              path: 'fields',
              populate: {
                path: 'value'
              }
            }).exec();
          }).
          then(function(obj) {
            assert.equal(obj.fields.length, 2);
            assert.equal(obj.fields[0].value.name, 'testing');
            assert.equal(obj.fields[1].value, 'test');
            done();
          }).
          catch(done);
      });

      it('populate with no ref using Model.populate (gh-4843)', function(done) {
        const schema = new Schema({
          parent: mongoose.Schema.Types.ObjectId,
          name: String
        });

        const Person = db.model('Person', schema);

        Person.create({ name: 'Anakin' }).
          then(function(parent) {
            return Person.create({ name: 'Luke', parent: parent._id });
          }).
          then(function(luke) {
            return Person.findById(luke._id);
          }).
          then(function(luke) {
            return Person.populate(luke, { path: 'parent', model: 'Person' });
          }).
          then(function(luke) {
            assert.equal(luke.parent.name, 'Anakin');
            done();
          }).
          catch(done);
      });

      it('nested populate, virtual -> normal (gh-4631)', async function() {
        const PersonSchema = new Schema({
          name: String
        });

        PersonSchema.virtual('blogPosts', {
          ref: 'BlogPost',
          localField: '_id',
          foreignField: 'author'
        });

        const BlogPostSchema = new Schema({
          title: String,
          author: { type: ObjectId },
          comments: [{ author: { type: ObjectId, ref: 'Person' } }]
        });

        const Person = db.model('Person', PersonSchema);
        const BlogPost = db.model('BlogPost', BlogPostSchema);

        let people = [
          { name: 'Val' },
          { name: 'Test' }
        ];

        people = await Person.create(people);
        const post = {
          title: 'Test1',
          author: people[0]._id,
          comments: [{ author: people[1]._id }]
        };
        await BlogPost.create(post);

        const doc = await Person.findById(people[0]._id).
          populate({
            path: 'blogPosts',
            model: BlogPost,
            populate: {
              path: 'author',
              model: Person
            }
          });
        assert.equal(doc.blogPosts.length, 1);
        assert.equal(doc.blogPosts[0].author.name, 'Val');

      });

      it('populate with Decimal128 as ref (gh-4759)', async function() {
        const version = await start.mongodVersion();

        const mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
        if (!mongo34) {
          return;
        }

        const parentSchema = new Schema({
          name: String,
          child: {
            type: 'Decimal128',
            ref: 'Child'
          }
        });

        const childSchema = new Schema({
          _id: 'Decimal128',
          name: String
        });

        const Child = db.model('Child', childSchema);
        const Parent = db.model('Parent', parentSchema);

        const decimal128 = childSchema.path('_id').cast('1.337e+3');

        await Child.create({ name: 'Luke', _id: '1.337e+3' });
        const parent = await Parent.create({ name: 'Anakin', child: decimal128.bytes });
        const foundParent = await Parent.findById(parent._id).populate('child');

        assert.equal(foundParent.child.name, 'Luke');
        assert.equal(foundParent.child._id.toString(), '1337');
      });

      it('handles circular virtual -> regular (gh-5128)', function(done) {
        const ASchema = new Schema({
          title: { type: String, required: true, trim: true }
        });

        ASchema.virtual('brefs', {
          ref: 'Test2',
          localField: '_id',
          foreignField: 'arefs'
        });

        const BSchema = new Schema({
          arefs: [{ type: ObjectId, required: true, ref: 'Test1' }]
        });

        const a = db.model('Test1', ASchema);
        const b = db.model('Test2', BSchema);

        const id1 = new mongoose.Types.ObjectId();

        a.create({ _id: id1, title: 'test' }).
          then(function() { return b.create({ arefs: [id1] }); }).
          then(function() {
            return a.findOne({ _id: id1 }).populate([{
              path: 'brefs', // this gets populated
              model: 'Test2',
              populate: [{
                path: 'arefs',
                model: 'Test1'
              }]
            }]);
          }).
          then(function(doc) {
            assert.equal(doc.brefs[0].arefs[0].title, 'test');
            done();
          }).
          catch(done);
      });

      it('handles nested virtuals (gh-4851)', function(done) {
        const AuthorSchema = new Schema({ name: String });

        const BookSchema = new Schema({
          title: String,
          author: { id: mongoose.Schema.Types.ObjectId }
        });

        BookSchema.virtual('author.doc', {
          ref: 'Author',
          foreignField: '_id',
          localField: 'author.id',
          justOne: true
        });

        db.deleteModel(/.*/);
        const Author = db.model('Author', AuthorSchema);
        const Book = db.model('Book', BookSchema);

        Author.create({ name: 'Val' }).
          then(function(author) {
            return Book.create({
              title: 'Professional AngularJS',
              author: { id: author._id }
            });
          }).
          then(function(book) {
            return Book.findById(book).populate('author.doc');
          }).
          then(function(doc) {
            assert.equal(doc.author.doc.name, 'Val');
            doc = doc.toObject({ virtuals: true });
            assert.equal(doc.author.doc.name, 'Val');
            done();
          }).
          catch(done);
      });

      it('nested virtuals if top-level prop doesnt exist (gh-5431)', function(done) {
        const personSchema = new mongoose.Schema({
          name: String,
          band: String
        });
        const bandSchema = new mongoose.Schema({
          name: String,
          data: {
            field: String
          }
        });
        bandSchema.virtual('data.members', {
          ref: 'Person',
          localField: 'name',
          foreignField: 'band',
          justOne: false
        });

        bandSchema.set('toObject', { virtuals: true });

        const Person = db.model('Person', personSchema);
        const Band = db.model('Test', bandSchema);

        Band.create({ name: 'Motley Crue', data: {} }).
          then(function() {
            return Person.create({ name: 'Vince Neil', band: 'Motley Crue' });
          }).
          then(function() {
            return Band.findOne({}).populate('data.members');
          }).
          then(function(band) {
            assert.equal(band.data.members.length, 1);
            assert.equal(band.data.members[0].name, 'Vince Neil');
            done();
          }).
          catch(done);
      });

      it('nested virtuals + doc.populate() (gh-5240)', function(done) {
        const parentSchema = new Schema({ name: String });
        const childSchema = new Schema({
          parentId: mongoose.Schema.Types.ObjectId
        });
        childSchema.virtual('parent', {
          ref: 'Parent',
          localField: 'parentId',
          foreignField: '_id',
          justOne: true
        });
        const teamSchema = new Schema({ people: [childSchema] });

        const Parent = db.model('Parent', parentSchema);
        const Team = db.model('Team', teamSchema);

        Parent.create({ name: 'Darth Vader' }).
          then(function(doc) {
            return Team.create({ people: [{ parentId: doc._id }] });
          }).
          then(function(team) {
            return Team.findById(team._id);
          }).
          then(function(team) {
            return team.populate('people.parent');
          }).
          then(function(team) {
            team = team.toObject({ virtuals: true });
            assert.equal(team.people[0].parent.name, 'Darth Vader');
            done();
          }).
          catch(done);
      });

      it('no ref + cursor (gh-5334)', async function() {
        const parentSchema = new Schema({
          name: String,
          child: mongoose.Schema.Types.ObjectId
        });
        const childSchema = new Schema({
          name: String
        });

        const Parent = db.model('Parent', parentSchema);
        const Child = db.model('Child', childSchema);

        const child = await Child.create({ name: 'Luke' });
        await Parent.create({ name: 'Vader', child: child._id });
        const doc = await Parent.find().populate({ path: 'child', model: 'Child' }).cursor().next();
        assert.equal(doc.child.name, 'Luke');
      });

      it('retains limit when using cursor (gh-5468)', async function() {
        const refSchema = new mongoose.Schema({
          _id: Number,
          name: String
        }, { versionKey: null });
        const Ref = db.model('Test', refSchema);

        const testSchema = new mongoose.Schema({
          _id: Number,
          prevnxt: [{ type: Number, ref: 'Test' }]
        });
        const Test = db.model('Test1', testSchema);

        const docs = [1, 2, 3, 4, 5, 6].map(function(i) {
          return { _id: i };
        });
        await Ref.create(docs);

        const docs2 = [
          { _id: 1, prevnxt: [1, 2, 3] },
          { _id: 2, prevnxt: [4, 5, 6] }
        ];
        await Test.create(docs2);

        const cursor = Test.
          find().
          populate({ path: 'prevnxt', options: { limit: 2 } }).
          cursor();

        let count = 0;

        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
          assert.equal(doc.prevnxt.length, 2);
          ++count;
        }

        assert.equal(count, 2);
      });

      it('virtuals + doc.populate() (gh-5311)', function(done) {
        const parentSchema = new Schema({ name: String });
        const childSchema = new Schema({
          parentId: mongoose.Schema.Types.ObjectId
        });
        childSchema.virtual('parent', {
          ref: 'Parent',
          localField: 'parentId',
          foreignField: '_id',
          justOne: true
        });

        const Parent = db.model('Parent', parentSchema);
        const Child = db.model('Child', childSchema);

        Parent.create({ name: 'Darth Vader' }).
          then(function(doc) {
            return Child.create({ parentId: doc._id });
          }).
          then(function(c) {
            return Child.findById(c._id);
          }).
          then(function(c) {
            return c.populate('parent');
          }).
          then(function(c) {
            c = c.toObject({ virtuals: true });

            assert.equal(c.parent.name, 'Darth Vader');
            done();
          }).
          catch(done);
      });

      it('empty virtual with Model.populate (gh-5331)', async function() {
        const myModelSchema = new Schema({
          virtualRefKey: { type: String, ref: 'Test' }
        });
        myModelSchema.set('toJSON', { virtuals: true });
        myModelSchema.virtual('populatedVirtualRef', {
          ref: 'Test',
          localField: 'virtualRefKey',
          foreignField: 'handle'
        });

        const otherModelSchema = new Schema({
          handle: String
        });

        const MyModel = db.model('Test', myModelSchema);
        db.model('Test1', otherModelSchema);

        const doc = await MyModel.create({ virtualRefKey: 'test' });
        const populatedDoc = await MyModel.populate(doc, 'populatedVirtualRef');

        assert.ok(populatedDoc.populatedVirtualRef);
        assert.ok(Array.isArray(populatedDoc.populatedVirtualRef));
      });

      it('virtual populate in single nested doc (gh-4715)', function(done) {
        const someModelSchema = new mongoose.Schema({
          name: String
        });

        const SomeModel = db.model('Test', someModelSchema);

        const schema0 = new mongoose.Schema({
          name1: String
        });

        schema0.virtual('detail', {
          ref: 'Test',
          localField: '_id',
          foreignField: '_id',
          justOne: true
        });

        const schemaMain = new mongoose.Schema({
          name: String,
          obj: schema0
        });

        const ModelMain = db.model('Test1', schemaMain);

        ModelMain.create({ name: 'Test', obj: {} }).
          then(function(m) {
            return SomeModel.create({ _id: m.obj._id, name: 'test' });
          }).
          then(function() {
            return ModelMain.findOne().populate('obj.detail');
          }).
          then(function(m) {
            assert.equal(m.obj.detail.name, 'test');
            done();
          }).
          catch(done);
      });

      it('populate with missing schema (gh-5364)', async function() {
        const Foo = db.model('Test', new mongoose.Schema({
          bar: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Bar'
          }
        }));

        await Foo.create({ bar: new mongoose.Types.ObjectId() });
        const error = await Foo.find().populate('bar').exec().then(() => null, err => err);
        assert.equal(error.name, 'MissingSchemaError');
      });

      it('populate with missing schema (gh-5460)', async function() {
        const refSchema = new mongoose.Schema({
          name: String
        });

        db.model('Test', refSchema);

        const schema = new mongoose.Schema({
          ref: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' }
        });

        const Model = db.model('Test1', schema);

        const q = Model.find().read('secondaryPreferred').populate('ref');
        assert.equal(q._mongooseOptions.populate['ref'].options.readPreference.mode,
          'secondaryPreferred');
      });

      it('array underneath non-existent array (gh-6245)', async function() {

        let DepartmentSchema = new Schema({ name: String });
        let CompanySchema = new Schema({
          name: String,
          departments: [DepartmentSchema]
        });

        let Company = db.model('Company', CompanySchema);
        const company = new Company({
          name: 'Uber',
          departments: [{ name: 'Security' }, { name: 'Engineering' }]
        });

        await company.save();

        const EmployeeSchema = new Schema({ name: String });
        DepartmentSchema = new Schema({
          name: String,
          employees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Company' }]
        });
        CompanySchema = new Schema({
          name: String,
          departments: [DepartmentSchema]
        });

        delete db.models['Company'];
        const Employee = db.model('Person', EmployeeSchema);
        Company = db.model('Company', CompanySchema);

        let uber = await Company.findOne({ name: 'Uber' });
        const kurt = await Employee.create({ name: 'Kurt' });

        const engineering = uber.departments.
          find(d => d.name === 'Engineering');
        engineering.employees.addToSet(kurt);
        await uber.save();

        uber = await Company.findOne({ name: 'Uber' }).
          populate('departments.employees');
        assert.equal(uber.departments[0].name, 'Security');
        // Take extra care to make sure this isn't `null`
        assert.ok(Array.isArray(uber.departments[0].employees));
        assert.equal(uber.departments[0].employees.length, 0);
      });

      it('virtuals with justOne false and foreign field not found (gh-5336)', function(done) {
        const BandSchema = new mongoose.Schema({
          name: String,
          active: Boolean
        });

        const Band = db.model('Band', BandSchema);

        const PersonSchema = new mongoose.Schema({
          name: String,
          bands: [String]
        });

        PersonSchema.virtual('bandDetails', {
          ref: 'Band',
          localField: 'bands',
          foreignField: 'name',
          justOne: false
        });
        const Person = db.model('Person', PersonSchema);

        const band = new Band({ name: 'The Beatles', active: false });
        const person = new Person({
          name: 'George Harrison',
          bands: ['The Beatles']
        });

        person.save().
          then(function() { return band.save(); }).
          then(function() {
            return Person.findOne({ name: 'George Harrison' });
          }).
          then(function(person) {
            return person.populate({
              path: 'bandDetails',
              match: { active: { $eq: true } }
            });
          }).
          then(function(person) {
            person = person.toObject({ virtuals: true });
            assert.deepEqual(person.bandDetails, []);
            done();
          }).
          catch(done);
      });

      it('virtuals with justOne true and foreign field not found (gh-5336)', function(done) {
        const BandSchema = new mongoose.Schema({
          name: String,
          active: Boolean
        });

        const Band = db.model('Band', BandSchema);

        const PersonSchema = new mongoose.Schema({
          name: String,
          bands: [String]
        });

        PersonSchema.virtual('bandDetails', {
          ref: 'Band',
          localField: 'bands',
          foreignField: 'name',
          justOne: true
        });
        const Person = db.model('Person', PersonSchema);

        const band = new Band({ name: 'The Beatles', active: false });
        const person = new Person({
          name: 'George Harrison',
          bands: ['The Beatles']
        });

        person.save().
          then(function() { return band.save(); }).
          then(function() {
            return Person.findOne({ name: 'George Harrison' });
          }).
          then(function(person) {
            return person.populate({
              path: 'bandDetails',
              match: { active: { $eq: true } }
            });
          }).
          then(function(person) {
            person = person.toObject({ virtuals: true });
            assert.strictEqual(person.bandDetails, null);
            done();
          }).
          catch(done);
      });

      it('select foreignField automatically (gh-4959)', function(done) {
        const childSchema = new mongoose.Schema({
          name: String,
          parentId: mongoose.Schema.Types.ObjectId
        });

        const Child = db.model('Child', childSchema);

        const parentSchema = new mongoose.Schema({
          name: String
        });

        parentSchema.virtual('detail', {
          ref: 'Child',
          localField: '_id',
          foreignField: 'parentId',
          justOne: true
        });

        const Parent = db.model('Parent', parentSchema);

        Parent.create({ name: 'Test' }).
          then(function(m) {
            return Child.create({ name: 'test', parentId: m._id });
          }).
          then(function() {
            return Parent.find().populate({ path: 'detail', select: 'name' });
          }).
          then(function(res) {
            const m = res[0];
            assert.equal(m.detail.name, 'test');
            assert.ok(m.detail.parentId);
            done();
          }).
          catch(done);
      });

      it('does not set `populated()` until populate is done (gh-5564)', function() {
        const userSchema = new mongoose.Schema({});
        const User = db.model('User', userSchema);

        const testSchema = new mongoose.Schema({
          users: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
          }]
        });
        const Test = db.model('Test', testSchema);

        return User.create({}).
          then(function(user) {
            return Test.create({ users: [user._id] });
          }).
          then(function(test) {
            const promise = test.populate('users');
            assert.ok(!test.populated('users'));
            return promise;
          }).
          then(function(test) {
            assert.ok(test.populated('users'));
            assert.ok(test.users[0]._id);
            assert.equal(test.users.length, 1);
            assert.equal(test.populated('users').length, 1);
          });
      });

      it('virtual populate toJSON output (gh-5542)', function(done) {
        const AuthorSchema = new mongoose.Schema({
          name: String
        }, {
          toObject: { virtuals: true },
          toJSON: { virtuals: true }
        });

        const BookSchema = new mongoose.Schema({
          title: String,
          author: { type: ObjectId, ref: 'Person' }
        });

        AuthorSchema.virtual('books', {
          ref: 'Book',
          localField: '_id',
          foreignField: 'author',
          justOne: true
        });

        const Author = db.model('Person', AuthorSchema);
        const Book = db.model('Book', BookSchema);

        const author = new Author({ name: 'Bob' });
        author.save().
          then(function(author) {
            const book = new Book({ name: 'Book', author: author._id });
            return book.save();
          }).
          then(function() {
            return Author.findOne({})
              .populate({ path: 'books', select: 'title' })
              .exec();
          }).
          then(function(author) {
            const json = author.toJSON();
            assert.deepEqual(Object.getOwnPropertyNames(json.books),
              ['_id', 'author']);
            done();
          }).
          catch(done);
      });

      it('works if foreignField parent is selected (gh-5037)', function(done) {
        const childSchema = new mongoose.Schema({
          name: String,
          parent: {
            id: mongoose.Schema.Types.ObjectId,
            name: String
          }
        });

        const Child = db.model('Child', childSchema);

        const parentSchema = new mongoose.Schema({
          name: String
        });

        parentSchema.virtual('detail', {
          ref: 'Child',
          localField: '_id',
          foreignField: 'parent.id',
          justOne: true
        });

        const Parent = db.model('Parent', parentSchema);

        Parent.create({ name: 'Test' }).
          then(function(m) {
            return Child.create({
              name: 'test',
              parent: {
                id: m._id,
                name: 'test2'
              }
            });
          }).
          then(function() {
            return Parent.find().populate({
              path: 'detail',
              select: 'name parent'
            });
          }).
          then(function(res) {
            const m = res[0];
            assert.equal(m.detail.name, 'test');
            assert.ok(m.detail.parent.id);
            assert.equal(m.detail.parent.name, 'test2');
            done();
          }).
          catch(done);
      });

      it('subPopulate under discriminators race condition (gh-5858)', function() {
        const options = { discriminatorKey: 'kind' };
        const activitySchema = new Schema({ title: { type: String } }, options);

        const dateActivitySchema = new Schema({
          postedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
          }
        }, options);

        const eventActivitySchema = new Schema({ test: String }, options);

        const logSchema = new Schema({
          seq: Number,
          activity: {
            type: Schema.Types.ObjectId,
            refPath: 'kind',
            required: true
          },
          kind: String
        }, options);

        const User = db.model('User', { name: String });
        const Activity = db.model('Test1', activitySchema);
        const DateActivity = Activity.discriminator('gh5858_1', dateActivitySchema);
        const EventActivity = Activity.discriminator('gh5858_2', eventActivitySchema);
        const Log = db.model('Test2', logSchema);

        let dateActivity;
        let eventActivity;
        return User.create({ name: 'val' }).
          then(function(user) {
            return DateActivity.create({ title: 'test', postedBy: user._id });
          }).
          then(function(_dateActivity) {
            dateActivity = _dateActivity;
            return EventActivity.create({ title: 'test' });
          }).
          then(function(_eventActivity) {
            eventActivity = _eventActivity;
            return Log.create([
              { seq: 1, activity: eventActivity._id, kind: 'gh5858_2' },
              { seq: 2, activity: dateActivity._id, kind: 'gh5858_1' }
            ]);
          }).
          then(function() {
            return Log.find({}).
              populate({
                path: 'activity',
                populate: 'postedBy'
              }).
              sort({ seq: -1 });
          }).
          then(function(results) {
            assert.equal(results.length, 2);
            assert.equal(results[0].activity.kind, 'gh5858_1');
            assert.equal(results[0].activity.postedBy.name, 'val');
            assert.equal(results[1].activity.kind, 'gh5858_2');
            assert.equal(results[1].activity.postedBy, null);
          });
      });

      it('populating nested discriminator path (gh-5970)', function() {
        const Author = db.model('Person', new mongoose.Schema({
          firstName: {
            type: String,
            required: true
          },
          lastName: {
            type: String,
            required: true
          }
        }));

        const ItemSchema = new mongoose.Schema({
          title: {
            type: String,
            required: true
          }
        }, { discriminatorKey: 'type' });

        const ItemBookSchema = new mongoose.Schema({
          author: {
            type: mongoose.Schema.ObjectId,
            ref: 'Person'
          }
        });

        const ItemEBookSchema = new mongoose.Schema({
          author: {
            type: mongoose.Schema.ObjectId,
            ref: 'Person'
          },
          url: {
            type: String
          }
        });

        const BundleSchema = new mongoose.Schema({
          name: {
            type: String,
            required: true
          },
          items: [{
            type: ItemSchema,
            required: false
          }]
        });

        BundleSchema.path('items').discriminator('Book', ItemBookSchema);
        BundleSchema.path('items').discriminator('EBook', ItemEBookSchema);

        const Bundle = db.model('Test', BundleSchema);

        return Author.create({ firstName: 'David', lastName: 'Flanagan' }).
          then(function(author) {
            return Bundle.create({
              name: 'Javascript Book Collection', items: [
                { type: 'Book', title: 'JavaScript: The Definitive Guide', author: author },
                {
                  type: 'EBook',
                  title: 'JavaScript: The Definitive Guide Ebook',
                  url: 'https://google.com',
                  author: author
                }
              ]
            });
          }).
          then(function(bundle) {
            return Bundle.findById(bundle._id).populate('items.author').lean();
          }).
          then(function(bundle) {
            assert.equal(bundle.items[0].author.firstName, 'David');
            assert.equal(bundle.items[1].author.firstName, 'David');
          });
      });

      it('specify model in populate (gh-4264)', async function() {
        const PersonSchema = new Schema({
          name: String,
          authored: [Number]
        });

        const BlogPostSchema = new Schema({
          _id: Number,
          title: String
        });
        BlogPostSchema.virtual('authors', {
          ref: true,
          localField: '_id',
          foreignField: 'authored'
        });

        const Person = db.model('Person', PersonSchema);
        const BlogPost = db.model('BlogPost', BlogPostSchema);

        const blogPosts = [{ _id: 0, title: 'Bacon is Great' }];
        const people = [
          { name: 'Val', authored: [0] }
        ];

        await Person.create(people);
        await BlogPost.create(blogPosts);
        const post = await BlogPost.
          findOne({ _id: 0 }).
          populate({ path: 'authors', model: Person });
        assert.equal(post.authors.length, 1);
        assert.equal(post.authors[0].name, 'Val');
      });
    });

    it('virtual populate with embedded discriminators (gh-6273)', async function() {
      // Generate Users Model
      const userSchema = new Schema({ employeeId: Number, name: String });
      const UserModel = db.model('User', userSchema);

      // Generate Embedded Discriminators
      const eventSchema = new Schema(
        { message: String },
        { discriminatorKey: 'kind' }
      );

      const batchSchema = new Schema({ events: [eventSchema] });
      const docArray = batchSchema.path('events');

      // First embedded discriminator schema
      const clickedSchema = new Schema(
        {
          element: { type: String },
          users: [Number]
        },
        {
          toJSON: { virtuals: true },
          toObject: { virtuals: true }
        }
      );

      // Add virtual to first embedded discriminator schema for virtual population
      clickedSchema.virtual('users_$', {
        ref: 'User',
        localField: 'users',
        foreignField: 'employeeId'
      });

      docArray.discriminator('gh6273_Clicked', clickedSchema);

      // Second embedded discriminator
      docArray.discriminator('gh6273_Purchased', new Schema({
        product: { type: String }
      }));

      const Batch = db.model('Test', batchSchema);

      // Generate Items
      const user = { employeeId: 1, name: 'Test name' };
      const batch = {
        events: [
          { kind: 'gh6273_Clicked', element: '#hero', message: 'hello', users: [1] },
          { kind: 'gh6273_Purchased', product: 'action-figure-1', message: 'world' }
        ]
      };

      await UserModel.create(user);
      await Batch.create(batch);

      const doc = await Batch.findOne().populate('events.users_$');

      assert.equal(doc.events[0].users_$.length, 1);
      assert.equal(doc.events[0].users_$[0].name, 'Test name');
      assert.deepEqual(doc.toObject().events[0].users, [1]);
      assert.ok(!doc.events[1].users_$);
    });

    describe('populates an array of objects', function() {
      it('subpopulates array w/ space separated path (gh-6284)', async function() {
        const houseSchema = new Schema({ location: String });
        const citySchema = new Schema({ name: String });
        const districtSchema = new Schema({ name: String });

        const userSchema = new Schema({
          name: String,
          houseId: {
            type: Schema.Types.ObjectId,
            ref: 'Test'
          },
          cityId: {
            type: Schema.Types.ObjectId,
            ref: 'Test2'
          },
          districtId: {
            type: Schema.Types.ObjectId,
            ref: 'Test3'
          }
        });

        const postSchema = new Schema({
          content: String,
          userId: {
            type: Schema.Types.ObjectId,
            ref: 'Test1'
          }
        });

        const House = db.model('Test', houseSchema);
        const User = db.model('Test1', userSchema);
        const City = db.model('Test2', citySchema);
        const District = db.model('Test3', districtSchema);
        const Post = db.model('BlogPost', postSchema);

        const house = new House({ location: '123 abc st.' });
        const city = new City({ name: 'Some City' });
        const district = new District({ name: 'That District' });

        const user = new User({
          name: 'Billy',
          houseId: house._id,
          districtId: district._id,
          cityId: city._id
        });

        const post = new Post({
          content: 'Some meaningful insight.',
          userId: user._id
        });

        await House.create(house);
        await City.create(city);
        await District.create(district);
        await User.create(user);
        await Post.create(post);
        const doc = await Post.findOne({}).
          populate({
            path: 'userId',
            populate: [{
              path: 'houseId',
              select: 'location'
            }, {
              path: 'cityId districtId',
              select: 'name'
            }]
          });
        assert.equal(doc.userId.houseId.location, '123 abc st.');
        assert.equal(doc.userId.cityId.name, 'Some City');
        assert.equal(doc.userId.districtId.name, 'That District');

      });
      it('populates array of space separated path objs (gh-6414)', async function() {
        const userSchema = new Schema({
          name: String
        });

        const User = db.model('User', userSchema);

        const officeSchema = new Schema({
          managerId: { type: Schema.ObjectId, ref: 'User' },
          supervisorId: { type: Schema.ObjectId, ref: 'User' },
          janitorId: { type: Schema.ObjectId, ref: 'User' },
          associatesIds: [{ type: Schema.ObjectId, ref: 'User' }]
        });

        const Office = db.model('Test', officeSchema);

        const manager = new User({ name: 'John' });
        const billy = new User({ name: 'Billy' });
        const tom = new User({ name: 'Tom' });
        const kevin = new User({ name: 'Kevin' });
        const hafez = new User({ name: 'Hafez' });
        const office = new Office({
          managerId: manager._id,
          supervisorId: hafez._id,
          janitorId: kevin._id,
          associatesIds: [billy._id, tom._id]
        });

        await manager.save();
        await hafez.save();
        await billy.save();
        await tom.save();
        await kevin.save();
        await office.save();

        const doc = await Office.findOne({ _id: office._id })
          .populate([
            { path: 'managerId supervisorId associatesIds', select: 'name -_id' },
            { path: 'janitorId', select: 'name -_id' }
          ]);

        assert.strictEqual(doc.managerId.name, 'John');
        assert.strictEqual(doc.supervisorId.name, 'Hafez');
        assert.strictEqual(doc.associatesIds[0].name, 'Billy');
        assert.strictEqual(doc.associatesIds[1].name, 'Tom');
        assert.strictEqual(doc.janitorId.name, 'Kevin');

      });

      it('handles subpopulation with options (gh-6528)', async function() {
        const userSchema = new Schema({
          name: String
        });

        const teachSchema = new Schema({
          name: String
        });

        const commentSchema = new Schema({
          content: String,
          user: {
            type: Schema.Types.ObjectId,
            ref: 'User'
          }
        });

        const postSchema = new Schema({
          title: String,
          content: String,
          teacher: {
            type: Schema.Types.ObjectId,
            ref: 'Test'
          },
          commentIds: [{
            type: Schema.Types.ObjectId
          }]
        }, { timestamps: true });

        postSchema.virtual('comments', {
          ref: 'Comment',
          localField: 'commentIds',
          foreignField: '_id',
          justOne: false
        });

        db.deleteModel(/.*/);
        const User = db.model('User', userSchema);
        const Teacher = db.model('Test', teachSchema);
        const Post = db.model('BlogPost', postSchema);
        const Comment = db.model('Comment', commentSchema);

        const users = [];
        const teachers = [];
        const posts = [];
        const comments = [];

        for (let i = 0; i < 2; i++) {
          const t = new Teacher({ name: `teacher${i}` });
          users.push(new User({ name: `user${i}` }));
          for (let j = 0; j < 2; j++) {
            posts.push(new Post({
              title: `title${j}`,
              content: `content${j}`,
              teacher: t._id
            }));
          }
          teachers.push(t);
        }

        posts.forEach((post) => {
          users.forEach((user, i) => {
            const com = new Comment({
              content: `comment${i} on ${post.title}`,
              user: user._id
            });
            comments.push(com);
            post.commentIds.push(com._id);
          });
        });

        function getTeacherPosts(id, skip) {
          const cond = { teacher: id };
          const opts = {
            sort: { title: -1 },
            limit: 1,
            skip: skip
          };
          const pop = {
            path: 'comments',
            options: {
              sort: { content: -1 },
              limit: 1,
              skip: 1
            },
            populate: {
              path: 'user',
              select: 'name -_id'
            }
          };
          return Post.find(cond, null, opts).populate(pop).exec();
        }

        await User.create(users);
        await Teacher.create(teachers);
        await Post.create(posts);
        await Comment.create(comments);
        const t = await Teacher.findOne({ name: 'teacher1' });
        const found = await getTeacherPosts(t._id, 1);
        // skipped 1 posts, sorted backwards from title1 should equal title0
        assert.strictEqual(found[0].title, 'title0');
        assert.strictEqual(found[0].teacher.toHexString(), t.id);
        // skipped 1 comment
        assert.strictEqual(found[0].comments.length, 1);
        // skipped 1 comment, sorted backwards from comment1 should equal comment0
        assert.strictEqual(found[0].comments[0].content, 'comment0 on title0');

      });

      it('honors top-level match with subPopulation (gh-6451)', async function() {
        const anotherSchema = new Schema({
          name: String
        });

        const Another = db.model('Test2', anotherSchema);

        const otherSchema = new Schema({
          online: Boolean,
          value: String,
          a: {
            type: Schema.Types.ObjectId,
            ref: 'Test2'
          }
        });

        const Other = db.model('Test1', otherSchema);

        const schema = new Schema({
          visible: Boolean,
          name: String,
          o: [{
            type: Schema.Types.ObjectId,
            ref: 'Test1'
          }]
        });

        const Test = db.model('Test', schema);

        const another = new Another({
          name: 'testing'
        });

        const other = new Other({
          online: false,
          value: 'woohoo',
          a: another._id
        });

        const other2 = new Other({
          online: true,
          value: 'yippie',
          a: another._id
        });

        const test = new Test({
          visible: true,
          name: 'Billy',
          o: [other._id, other2._id]
        });

        await another.save();
        await Other.create([other, other2]);
        await test.save();

        const popObj = {
          path: 'o',
          select: '-_id',
          match: { online: true },
          populate: {
            path: 'a',
            select: '-_id name'
          }
        };
        const doc = await Test.findOne({ visible: true }).populate(popObj);
        assert.strictEqual(doc.o.length, 1);
        assert.strictEqual(doc.o[0].value, 'yippie');
        assert.strictEqual(doc.o[0].online, true);
        assert.strictEqual(doc.o[0].a.name, 'testing');

      });

      it('handles embedded discriminator (gh-6487)', async function() {
        const userSchema = new Schema({ employeeId: Number, name: String });
        const UserModel = db.model('User', userSchema);

        const eventSchema = new Schema(
          { message: String },
          { discriminatorKey: 'kind' }
        );

        const batchSchema = new Schema({
          nested: new Schema({
            events: [eventSchema]
          })
        });

        const docArray = batchSchema.path('nested.events');

        const clickedSchema = new Schema({
          element: { type: String },
          users: [Number]
        }, {
          toJSON: { virtuals: true },
          toObject: { virtuals: true }
        });

        clickedSchema.virtual('users_$', {
          ref: 'User',
          localField: 'users',
          foreignField: 'employeeId'
        });

        docArray.discriminator('Clicked', clickedSchema);

        docArray.discriminator('Purchased', new Schema({
          product: { type: String }
        }));

        const Batch = db.model('Test', batchSchema);

        const user = { employeeId: 1, name: 'Test name' };
        const batch = {
          nested: {
            events: [
              { kind: 'Clicked', element: '#hero', message: 'hello', users: [1] },
              { kind: 'Purchased', product: 'action-figure-1', message: 'world' }
            ]
          }
        };


        await UserModel.create(user);
        await Batch.create(batch);
        const docs = await Batch.find({})
          .populate('nested.events.users_$')
          .lean();
        const name = docs[0].nested.events[0].users_$[0].name;
        assert.strictEqual(name, 'Test name');
      });

      it('handles virtual embedded discriminator underneath single nested (gh-6571)', async function() {
        // Generate Users Model
        const userSchema = new Schema({ id: Number, name: String });
        db.deleteModel(/.*/);
        const User = db.model('User', userSchema);

        // Generate Product Model
        const productSchema = new Schema({ id: Number, name: String });
        const Product = db.model('Product', productSchema);

        // FlexibleItemSchema discriminator with a bunch of nested subdocs
        const flexibleItemSchema = new Schema();
        const outerSchema = new Schema();
        const innerSchema = new Schema();

        flexibleItemSchema.add({ outer: outerSchema });
        outerSchema.add({ inner: innerSchema });
        innerSchema.add({
          flexible: [new Schema({ kind: String }, { discriminatorKey: 'kind' })]
        });

        const docArray = innerSchema.path('flexible');

        const flexibleUserSchema = new Schema({ users: [{}] });

        flexibleUserSchema.virtual('users_$', {
          ref: 'User',
          localField: 'users.id',
          foreignField: 'id'
        });

        docArray.discriminator('UserDisc', flexibleUserSchema);

        const flexibleProductSchema = new Schema({ products: [{}] });

        flexibleProductSchema.virtual('products_$', {
          ref: 'Product',
          localField: 'products.id',
          foreignField: 'id'
        });

        docArray.discriminator('6571_ProductDisc', flexibleProductSchema);

        const FlexibleItem = db.model('Test', flexibleItemSchema);

        // Generate items
        await User.create({ id: 111, name: 'John Doe' });
        await Product.create({ id: 222, name: 'Notebook' });
        await FlexibleItem.create({
          outer: {
            inner: {
              flexible: [
                { kind: 'UserDisc', users: [{ id: 111, refKey: 'Users' }] },
                { kind: '6571_ProductDisc', products: [{ id: 222, refKey: 'Products' }] }
              ]
            }
          }
        });

        const doc = await FlexibleItem.findOne().
          populate('outer.inner.flexible.users_$').
          populate('outer.inner.flexible.products_$').
          then(doc => doc.toObject({ virtuals: true }));
        assert.equal(doc.outer.inner.flexible.length, 2);
        assert.equal(doc.outer.inner.flexible[0].users_$.length, 1);
        assert.equal(doc.outer.inner.flexible[0].users_$[0].name, 'John Doe');
        assert.equal(doc.outer.inner.flexible[1].products_$.length, 1);
        assert.equal(doc.outer.inner.flexible[1].products_$[0].name, 'Notebook');
      });

      it('populates undefined nested fields without error (gh-6845)', async function() {
        const metaDataSchema = new Schema({
          type: String
        });

        const commentSchema = new Schema({
          metadata: {
            type: Schema.Types.ObjectId,
            ref: 'Test'
          }
        });

        const postSchema = new Schema({
          comments: [commentSchema]
        });

        const userSchema = new Schema({
          username: String,
          password: String,
          posts: [postSchema]
        });

        db.model('Test', metaDataSchema);
        const User = db.model('User', userSchema);

        const user = await User.findOneAndUpdate(
          { username: 'Jennifer' }, /* upsert username but missing posts */
          { },
          {
            upsert: true,
            new: true
          })
          .populate(['posts.comments.metadata'])
          .exec();

        assert.ok(user && user.username === 'Jennifer');
      });

      it('populates refPath from array element (gh-6509)', async function() {
        const jobSchema = new Schema({
          kind: String,
          title: String,
          company: String
        });

        const Job = db.model('Job', jobSchema);

        const volunteerSchema = new Schema({
          kind: String,
          resp: String,
          org: String
        });

        const Volunteer = db.model('Test1', volunteerSchema);

        const cvSchema = new Schema({
          title: String,
          date: { type: Date, default: Date.now },
          sections: [{
            name: String,
            active: Boolean,
            list: [{
              kind: String,
              active: Boolean,
              item: {
                type: Schema.Types.ObjectId,
                refPath: 'sections.list.kind'
              }
            }]
          }]
        });

        const CV = db.model('Test2', cvSchema);

        const job = new Job({
          kind: 'Job',
          title: 'janitor',
          company: 'Bait & Tackle'
        });

        const volunteer = new Volunteer({
          kind: 'Test1',
          resp: 'construction',
          org: 'Habitat for Humanity'
        });

        const test = new CV({
          title: 'Billy',
          sections: [{
            name: 'Experience',
            active: true,
            list: [
              { kind: 'Job', active: true, item: job._id },
              { kind: 'Test1', active: true, item: volunteer._id }
            ]
          }]
        });

        await job.save();
        await volunteer.save();
        await test.save();
        const found = await CV.findOne({}).populate('sections.list.item');

        assert.ok(found.sections[0].list[0].item);
        assert.strictEqual(
          found.sections[0].list[0].item.company,
          'Bait & Tackle'
        );
        assert.ok(found.sections[0].list[1].item);
        assert.strictEqual(
          found.sections[0].list[1].item.org,
          'Habitat for Humanity'
        );

      });
    });

    describe('lean + deep populate (gh-6498)', function() {
      const isLean = v => v != null && !(v instanceof mongoose.Document);

      beforeEach(async function() {
        const userSchema = new Schema({
          name: String,
          roomId: { type: Schema.ObjectId, ref: 'Test1' }
        });
        const officeSchema = new Schema();
        const roomSchema = new Schema({
          officeId: { type: Schema.ObjectId, ref: 'Test2' }
        });

        const User = db.model('User', userSchema);
        const Office = db.model('Test2', officeSchema);
        const Room = db.model('Test1', roomSchema);

        const user = new User();
        const office = new Office();
        const room = new Room();

        user.roomId = room._id;
        room.officeId = office._id;

        await User.deleteMany({});
        await Promise.all([user.save(), office.save(), room.save()]);
      });

      it('document, and subdocuments are not lean by default', async function() {
        const user = await db.model('User').findOne().populate({
          path: 'roomId',
          populate: {
            path: 'officeId'
          }
        });

        assert.equal(isLean(user), false);
        assert.equal(isLean(user.roomId), false);
        assert.equal(isLean(user.roomId.officeId), false);
      });

      it('.lean() makes query result, and all populated fields lean', async function() {
        const user = await db.model('User').findOne().
          populate({
            path: 'roomId',
            populate: {
              path: 'officeId'
            }
          }).
          lean();

        assert.equal(isLean(user), true);
        assert.equal(isLean(user.roomId), true);
        assert.equal(isLean(user.roomId.officeId), true);
      });

      it('disabling lean at some populating level reflects on it, and descendants', async function() {

        const user = await db.model('User').findOne().
          populate({
            path: 'roomId',
            options: { lean: false },
            populate: {
              path: 'officeId'
            }
          }).
          lean();

        assert.equal(isLean(user), true);
        assert.equal(isLean(user.roomId), false);
        assert.equal(isLean(user.roomId.officeId), false);
      });

      it('enabling lean at some populating level reflects on it, and descendants', async function() {

        const user = await db.model('User').findOne().populate({
          path: 'roomId',
          options: { lean: true },
          populate: {
            path: 'officeId'
          }
        });

        assert.equal(isLean(user), false);
        assert.equal(isLean(user.roomId), true);
        assert.equal(isLean(user.roomId.officeId), true);
      });

      it('disabling lean on nested population overwrites parent lean', async function() {

        const user = await db.model('User').findOne().populate({
          path: 'roomId',
          options: { lean: true },
          populate: {
            options: { lean: false },
            path: 'officeId'
          }
        });

        assert.equal(isLean(user), false);
        assert.equal(isLean(user.roomId), true);
        assert.equal(isLean(user.roomId.officeId), false);
      });
    });

    it('populates virtual of embedded discriminator with dynamic ref (gh-6554)', async function() {
      const userSchema = new Schema({
        employeeId: Number,
        name: String
      });

      const UserModel = db.model('User', userSchema);

      const eventSchema = new Schema({
        message: String
      }, { discriminatorKey: 'kind' });

      const batchSchema = new Schema({
        events: [eventSchema]
      });

      const docArray = batchSchema.path('events');

      const clickedSchema = new Schema({
        element: { type: String },
        users: [{}]
      },
      {
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
      });

      clickedSchema.virtual('users_$', {
        ref: function(doc) {
          return doc.events[0].users[0].refKey;
        },
        localField: 'users.ID',
        foreignField: 'employeeId'
      });

      docArray.discriminator('Clicked', clickedSchema);
      const Batch = db.model('Test', batchSchema);

      const user = { employeeId: 1, name: 'Test name' };
      const batch = {
        events: [
          {
            kind: 'Clicked',
            element: '#hero',
            message: 'hello',
            users: [{ ID: 1, refKey: 'User' }]
          }
        ]
      };


      await UserModel.create(user);
      await Batch.create(batch);
      const doc = await Batch.findOne({}).populate('events.users_$');
      assert.strictEqual(doc.events[0].users_$[0].name, 'Test name');
    });

    it('populates virtual of embedded discriminator with dynamic ref when more than one model name is returned (gh-6612)', async function() {
      const userSchema = new Schema({
        employeeId: Number,
        name: String
      });

      const UserModel = db.model('User', userSchema);

      const authorSchema = new Schema({
        employeeId: Number,
        name: String
      });

      const AuthorModel = db.model('Author', authorSchema);

      const eventSchema = new Schema({
        message: String
      }, { discriminatorKey: 'kind' });

      const batchSchema = new Schema({
        events: [eventSchema]
      });

      const docArray = batchSchema.path('events');

      const clickedSchema = new Schema({
        element: { type: String },
        users: [{}]
      },
      {
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
      });

      clickedSchema.virtual('users_$', {
        ref: function(doc) {
          const refKeys = doc.events[0].users.map(user => user.refKey);
          return refKeys;
        },
        localField: 'users.ID',
        foreignField: 'employeeId'
      });

      docArray.discriminator('Clicked', clickedSchema);
      const Batch = db.model('Test', batchSchema);

      const user = { employeeId: 1, name: 'Test name' };
      const author = { employeeId: 2, name: 'Author Name' };
      const batch = {
        events: [
          {
            kind: 'Clicked',
            element: '#hero',
            message: 'hello',
            users: [
              { ID: 1, refKey: 'User' },
              { ID: 2, refKey: 'Author' }
            ]
          }
        ]
      };


      await UserModel.create(user);
      await AuthorModel.create(author);
      await Batch.create(batch);
      const doc = await Batch.findOne({}).populate('events.users_$');
      assert.strictEqual(doc.events[0].users_$[0].name, 'Test name');
      assert.strictEqual(doc.events[0].users_$[1].name, 'Author Name');
    });

    it('uses getter if one is defined on the localField (gh-6618)', async function() {
      const userSchema = new Schema({
        name: String
      });

      const schema = new Schema({
        referrer: {
          type: String,
          get: function(val) {
            return val.slice(6);
          }
        }
      }, { toObject: { virtuals: true } });

      schema.virtual('referrerUser', {
        ref: 'User',
        localField: 'referrer',
        foreignField: 'name',
        justOne: false,
        getters: true
      });

      const User = db.model('User', userSchema);
      const Test = db.model('Test', schema);

      const user = new User({ name: 'billy' });
      const test = new Test({ referrer: 'Model$' + user.name });


      await user.save();
      await test.save();
      const pop = await Test.findOne().populate('referrerUser');
      assert.strictEqual(pop.referrerUser[0].name, 'billy');

      const pop2 = await Test.findOne().populate({ path: 'referrerUser', options: { getters: false } });
      assert.strictEqual(pop2.referrerUser.length, 0);
    });

    it('populate child with same name as parent (gh-6839) (gh-6908)', async function() {
      const parentFieldsToPopulate = [
        { path: 'children.child' },
        { path: 'child' }
      ];

      const childSchema = new mongoose.Schema({ name: String });
      const Child = db.model('Child', childSchema);

      const parentSchema = new mongoose.Schema({
        child: { type: mongoose.Schema.Types.ObjectId, ref: 'Child' },
        children: [{
          child: { type: mongoose.Schema.Types.ObjectId, ref: 'Child' }
        }]
      });
      const Parent = db.model('Parent', parentSchema);


      let child = await Child.create({ name: 'test' });
      let p = await Parent.create({ child: child });

      child = await Child.findById(child._id);
      p = await Parent.findById(p._id).populate(parentFieldsToPopulate);
      p.children.push({ child: child });
      await p.save();

      p = await p.populate(parentFieldsToPopulate);
      assert.ok(p.children[0].child);
      assert.equal(p.children[0].child.name, 'test');
    });

    it('passes scope as Model instance (gh-6726)', async function() {
      const otherSchema = new Schema({ name: String });
      const Other = db.model('Test1', otherSchema);
      const schema = new Schema({
        x: {
          type: Schema.Types.ObjectId,
          ref: 'Test1',
          get: function(v) {
            assert.strictEqual(this.constructor.name, 'model');
            return v;
          }
        }
      });
      const Test = db.model('Test', schema);
      const other = new Other({ name: 'Max' });
      const test = new Test({ x: other._id });

      await other.save();
      await test.save();
      const doc = await Test.findOne({}).populate('x');
      assert.strictEqual(doc.x.name, 'Max');
    });

    it('respects schema array even if underlying doc doesnt use array (gh-6908)', async function() {
      const jobSchema = new Schema({
        company: [{ type: Schema.Types.ObjectId, ref: 'Company' }]
      });
      const Job = db.model('Test', jobSchema);

      const companySchema = new Schema({ name: String });
      const Company = db.model('Company', companySchema);


      const mdb = await Company.create({ name: 'MongoDB' });

      await Job.collection.insertOne({ company: mdb._id });

      const res = await Job.findOne().populate('company');

      assert.ok(Array.isArray(res.company));
      assert.equal(res.company[0].name, 'MongoDB');
    });

    it('save objectid with populated refPath (gh-6714)', async function() {
      const parentSchema = new Schema({
        kind: {
          type: String
        },
        item: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          refPath: 'parent.kind'
        }
      });
      const schema = new Schema({
        parent: parentSchema,
        lockingVersion: mongoose.Schema.Types.ObjectId,
        lastUpdate: {
          alias: String,
          date: Date
        },
        test: String
      });

      const Role = db.model('Test', schema);


      const role = await Role.create({ });
      const role2 = await Role.create({
        parent: { kind: 'Test', item: role._id }
      });

      const toUpdate = await Role.find({ _id: role2._id }).
        populate('parent.item').
        then(res => res[0]);

      toUpdate.test = 'foo';
      await toUpdate.save();
    });

    it('correct model and justOne when double populating (gh-6978)', async function() {
      const authorSchema = new Schema({
        name: String
      });

      const commentSchema = new Schema({
        text: String,
        author: {
          type: Schema.Types.ObjectId,
          ref: 'Author'
        }
      });

      const postSchema = new Schema({
        content: String,
        comments: [{
          type: Schema.Types.ObjectId,
          ref: 'Comment'
        }]
      });

      const Author = db.model('Author', authorSchema);
      const Comment = db.model('Comment', commentSchema);
      const Post = db.model('BlogPost', postSchema);

      const authors = '123'.split('').map(n => {
        return new Author({ name: `author${n}` });
      });

      const comments = 'abc'.split('').map((l, i) => {
        const id = authors[i]._id;
        return new Comment({ text: `comment_${l}`, author: id });
      });


      await Post.create({
        content: 'foobar',
        comments: comments
      });

      await Author.create(authors);
      await Comment.create(comments);

      let post = await Post.findOne({});
      post = await Post.populate(post, { path: 'comments' });
      post = await Post.populate(post, { path: 'comments.author' });

      post.comments.forEach((c, i) => {
        assert.ok(!Array.isArray(c.author), `author ${i} is an array`);
      });
    });

    it('correctly finds justOne when double-populating underneath an array (gh-6798)', async function() {
      const FileSchema = new Schema({ filename: 'String' });
      const EditionOptionsSchema = new Schema({
        price: 'Number',
        image: {
          type: 'ObjectId',
          ref: 'Test'
        }
      });
      const EditionSchema = new Schema({ editionOptions: EditionOptionsSchema });
      const CarVersionSchema = new Schema({
        type: {
          type: 'String'
        },
        editions: [{
          type: 'ObjectId',
          ref: 'Test1'
        }]
      });
      const CarSchema = new mongoose.Schema({
        make: 'String',
        versions: [CarVersionSchema]
      });

      const File = db.model('Test', FileSchema);
      const Edition = db.model('Test1', EditionSchema);
      const Car = db.model('Car', CarSchema);


      const file = await File.create({ filename: 'file1.png' });

      const editions = await Edition.create([
        { editionOptions: { price: 15000, image: file._id } },
        { editionOptions: { price: 150000 } }
      ]);

      let cars = await Car.create([
        { make: 'Ford', versions: [{ type: 'F150', editions: [editions[0]] }] },
        { make: 'BMW', versions: [{ type: 'i8', editions: [editions[1]] }] }
      ]);

      cars = await Car.find().sort({ make: 1 });
      cars = await Car.populate(cars, 'versions.editions');
      cars = await Car.populate(cars, 'versions.editions.editionOptions.image');

      assert.strictEqual(cars[0].versions[0].editions[0].editionOptions.image,
        void 0);
      assert.equal(cars[1].versions[0].editions[0].editionOptions.image.filename,
        'file1.png');
    });

    it('handles virtual justOne if it is not set (gh-6988)', async function() {
      const postSchema = new Schema({
        name: String
      });

      postSchema.virtual('comments', {
        ref: 'Comment',
        localField: '_id',
        foreignField: 'postId'
      });

      const commentSchema = new Schema({
        postId: { type: Schema.Types.ObjectId }
      });

      const Post = db.model('BlogPost', postSchema);
      const Comment = db.model('Comment', commentSchema);


      const post = await Post.create({ name: 'n1' });
      const comment = await Comment.create({ postId: post._id });

      const doc = await Post.findOne({}).populate('comments').lean();
      assert.ok(Array.isArray(doc.comments));
      assert.equal(doc.comments.length, 1);
      assert.equal(doc.comments[0]._id.toHexString(),
        comment._id.toHexString());
    });

    it('handles virtual justOne if it is not set, is lean, and subfields are selected', async function() {
      const postSchema = new Schema({
        name: String
      });

      postSchema.virtual('comments', {
        ref: 'Comment',
        localField: '_id',
        foreignField: 'postId'
      });

      const commentSchema = new Schema({
        postId: { type: Schema.Types.ObjectId },
        text: String
      });

      const Post = db.model('BlogPost', postSchema);
      const Comment = db.model('Comment', commentSchema);


      const post = await Post.create({ name: 'n1' });
      const comment = await Comment.create({ postId: post._id, text: 'a comment' });

      const doc = await Post.find({}).populate('comments', 'text').lean();
      assert.ok(Array.isArray(doc[0].comments));
      assert.equal(doc[0].comments.length, 1);
      assert.equal(doc[0].comments[0]._id.toHexString(),
        comment._id.toHexString());
    });

    it('does not set `justOne` if underneath Mixed (gh-6985)', async function() {
      const articleSchema = new Schema({
        title: String,
        content: String
      });

      const schema = new Schema({
        name: String,
        data: Schema.Types.Mixed
      });

      const Article = db.model('Article', articleSchema);
      const Test = db.model('User', schema);


      const articles = await Article.create([
        { title: 'An Overview of BigInt in Node.js', content: '' },
        { title: 'Building a Serverless App with MongoDB Stitch', content: '' }
      ]);

      await Test.create({
        name: 'Val',
        data: { articles: articles.map(a => a._id) }
      });

      let res = await Test.findOne();
      const popObj = {
        path: 'data.articles',
        select: 'title',
        model: 'Article',
        options: { lean: true }
      };

      res = await Test.populate(res, popObj);

      assert.ok(Array.isArray(res.data.articles));
      assert.deepEqual(res.data.articles.map(a => a.title), [
        'An Overview of BigInt in Node.js',
        'Building a Serverless App with MongoDB Stitch'
      ]);
    });

    it('supports setting `justOne` as an option (gh-6985)', async function() {
      const articleSchema = new Schema({
        title: String,
        content: String
      });

      const schema = new Schema({
        title: String,
        data: Schema.Types.Mixed
      });

      const Article = db.model('Article', articleSchema);
      const Test = db.model('Test', schema);


      const articles = await Article.create([
        { title: 'An Overview of BigInt in Node.js', content: '' },
        { title: 'Building a Serverless App with MongoDB Stitch', content: '' }
      ]);

      await Test.create({
        title: 'test',
        data: { articles: articles.map(a => a._id) }
      });

      let res = await Test.findOne();
      const popObj = {
        path: 'data.articles',
        select: 'title',
        model: 'Article',
        justOne: true,
        options: { lean: true }
      };

      res = await Test.populate(res, popObj);

      assert.ok(!Array.isArray(res.data.articles));
      assert.equal(res.data.articles.title, 'An Overview of BigInt in Node.js');
    });

    it('multiple localFields and foreignFields (gh-5704)', async function() {
      const childSchema = new Schema({
        _id: Number,
        sourceId: Number
      });
      const parentSchema = new Schema({
        _id: Number,
        internalChildId: Number,
        sourceChildId: Number
      });
      parentSchema.virtual('children', {
        ref: 'Child',
        localField: function() {
          return this.internalChildId ? 'internalChildId' : 'sourceChildId';
        },
        foreignField: function() {
          return this.internalChildId ? '_id' : 'sourceId';
        }
      });

      const Child = db.model('Child', childSchema);
      const Parent = db.model('Parent', parentSchema);


      await Child.create([
        { _id: 1 },
        { _id: 99, sourceId: 2 }
      ]);

      await Parent.create([
        { _id: 10, internalChildId: 1 },
        { _id: 11, sourceChildId: 2 }
      ]);

      let res = await Parent.find().sort({ _id: 1 }).populate('children');

      res = res.map(doc => doc.toObject({ virtuals: true }));
      assert.equal(res[0].children.length, 1);
      assert.strictEqual(res[0].children[0]._id, 1);

      assert.equal(res[1].children.length, 1);
      assert.strictEqual(res[1].children[0]._id, 99);
    });

    it('lean populate underneath array (gh-7052)', async function() {
      const ownerSchema = new Schema({
        name: String,
        age: Number,
        dogs: [Schema.Types.ObjectId]
      });

      const dogSchema = new Schema({
        name: String,
        trick: Schema.Types.ObjectId
      });

      const trickSchema = new Schema({ description: String });

      const Owner = db.model('Person', ownerSchema);
      const Dog = db.model('Test', dogSchema);
      const Trick = db.model('Test1', trickSchema);

      const t = new Trick({ description: 'roll over' });
      const d = new Dog({ name: 'Fido', trick: t._id });
      const o = new Owner({ name: 'Bill', age: 10, dogs: [d._id] });


      await Promise.all([t.save(), d.save(), o.save()]);

      const owner = await Owner.findOne({}).lean();
      let populated = await Owner.populate(owner,
        [{ path: 'dogs', model: 'Test', options: { lean: true } }]);
      populated = await Owner.populate(owner,
        [{ path: 'dogs.trick', model: 'Test1', options: { lean: true } }]);

      assert.ok(!Array.isArray(populated.dogs[0].trick));
    });

    it('handles plus path projections with virtual populate (gh-7050)', async function() {
      const CatSchema = mongoose.Schema({ name: String }, { toObject: { virtuals: true } });

      CatSchema.virtual('friends', {
        ref: 'Test',
        localField: '_id',
        foreignField: 'cat'
      });

      const Cat = db.model('Cat', CatSchema);

      const DogSchema = mongoose.Schema({
        name: String,
        cat: mongoose.ObjectId,
        secret: { type: String, select: false }
      });

      const Dog = db.model('Test', DogSchema);


      const kitty = await Cat.create({ name: 'foo' });

      await Dog.create({
        name: 'Scooby',
        cat: kitty,
        secret: 'I ate all the scooby snacks!'
      });

      const res = await Cat.findOne().select().populate({
        path: 'friends',
        select: '+secret'
      });
      assert.equal(res.friends[0].name, 'Scooby');
      assert.equal(res.friends[0].secret, 'I ate all the scooby snacks!');
    });

    it('set model as ref in schema (gh-7253)', async function() {
      const userSchema = new Schema({ name: String });
      const User = db.model('User', userSchema);

      const postSchema = new Schema({
        user: {
          type: mongoose.ObjectId,
          ref: User
        },
        user2: mongoose.ObjectId
      });
      postSchema.path('user2').ref(User);
      const Post = db.model('BlogPost', postSchema);


      const user = await User.create({ name: 'val' });
      await Post.create({ user: user._id, user2: user._id });

      const post = await Post.findOne().populate('user user2');

      assert.equal(post.user.name, 'val');
      assert.equal(post.user2.name, 'val');
    });

    it('count option (gh-4469) (gh-7380)', async function() {
      const childSchema = new Schema({ parentId: mongoose.ObjectId });

      const parentSchema = new Schema({ name: String });
      parentSchema.virtual('childCount', {
        ref: 'Child',
        localField: '_id',
        foreignField: 'parentId',
        count: true
      });

      parentSchema.virtual('children', {
        ref: 'Child',
        localField: '_id',
        foreignField: 'parentId',
        count: false
      });

      const Child = db.model('Child', childSchema);
      const Parent = db.model('Parent', parentSchema);


      const p = await Parent.create({ name: 'test' });

      await Child.create([{ parentId: p._id }, { parentId: p._id }, {}]);

      let doc = await Parent.findOne().populate('children childCount');
      assert.equal(doc.childCount, 2);
      assert.equal(doc.children.length, 2);

      doc = await Parent.find().populate('children childCount').then(res => res[0]);
      assert.equal(doc.childCount, 2);
      assert.equal(doc.children.length, 2);

      doc = await Parent.find().populate('childCount').then(res => res[0]);
      assert.equal(doc.childCount, 2);
      assert.equal(doc.children, null);

      doc = await Parent.findOne();
      await doc.populate('childCount');
      assert.equal(doc.childCount, 2);
      assert.equal(doc.children, null);
    });

    it('count option ignores skip (gh-4469) (gh-8476)', async function() {
      const childSchema = new Schema({ parentId: mongoose.ObjectId });

      const parentSchema = new Schema({ name: String });
      parentSchema.virtual('childCount', {
        ref: 'Child',
        localField: '_id',
        foreignField: 'parentId',
        count: true,
        options: { skip: 2 }
      });

      const Child = db.model('Child', childSchema);
      const Parent = db.model('Parent', parentSchema);


      const p = await Parent.create({ name: 'test' });

      await Child.create([{ parentId: p._id }, { parentId: p._id }, {}]);

      const doc = await Parent.findOne().populate('childCount');
      assert.equal(doc.childCount, 2);
    });

    it('count with deeply nested (gh-7573)', async function() {
      const s1 = new mongoose.Schema({});

      s1.virtual('s2', {
        ref: 'Test2',
        localField: '_id',
        foreignField: 's1'
      });

      const s2 = new mongoose.Schema({
        s1: { type: mongoose.Schema.Types.ObjectId, ref: 'schema1' }
      });

      s2.virtual('numS3', {
        ref: 'Test3',
        localField: '_id',
        foreignField: 's2',
        count: true
      });

      const s3 = new mongoose.Schema({
        s2: { type: mongoose.Schema.Types.ObjectId, ref: 'schema2' }
      });


      const S1 = db.model('Test1', s1);
      const S2 = db.model('Test2', s2);
      const S3 = db.model('Test3', s3);

      const s1doc = await S1.create({});
      const s2docs = await S2.create([{ s1: s1doc }, { s1: s1doc }]);
      await S3.create([{ s2: s2docs[0] }, { s2: s2docs[0] }, { s2: s2docs[1] }]);

      let doc = await S1.findOne({}).populate({
        path: 's2',
        populate: {
          path: 'numS3'
        }
      });
      assert.deepEqual(doc.s2.map(s => s.numS3).sort(), [1, 2]);

      await S3.deleteMany({ s2: s2docs[1] });
      doc = await S1.findOne({}).populate({
        path: 's2',
        populate: {
          path: 'numS3'
        }
      });
      assert.deepEqual(doc.s2.map(s => s.numS3).sort(), [0, 2]);

      await S3.deleteMany({});
      doc = await S1.findOne({}).populate({
        path: 's2',
        populate: {
          path: 'numS3'
        }
      });
      assert.deepEqual(doc.s2.map(s => s.numS3).sort(), [0, 0]);
    });

    it('explicit model option overrides refPath (gh-7273)', async function() {
      const userSchema = new Schema({ name: String });
      const User1 = db.model('User', userSchema);
      db.model('Test', userSchema);

      const postSchema = new Schema({
        user: {
          type: mongoose.ObjectId,
          refPath: 'm'
        },
        m: String
      });
      const Post = db.model('BlogPost', postSchema);


      const user = await User1.create({ name: 'val' });
      await Post.create({ user: user._id, m: 'Test' });

      let post = await Post.findOne().populate('user');
      assert.ok(!post.user);

      post = await Post.findOne().populate({ path: 'user', model: 'User' });

      assert.equal(post.user.name, 'val');
    });

    it('clone option means identical ids get separate copies of doc (gh-3258)', async function() {
      const userSchema = new Schema({ name: String });
      const User = db.model('User', userSchema);

      const postSchema = new Schema({
        user: {
          type: mongoose.ObjectId,
          ref: User
        },
        title: String
      });

      const Post = db.model('BlogPost', postSchema);


      const user = await User.create({ name: 'val' });
      await Post.create([
        { title: 'test1', user: user },
        { title: 'test2', user: user }
      ]);

      const posts = await Post.find().populate({
        path: 'user',
        options: { clone: true }
      });

      posts[0].user.name = 'val2';
      assert.equal(posts[1].user.name, 'val');
    });

    it('handles double nested array `foreignField` (gh-7374)', async function() {
      const songSchema = Schema({
        title: { type: String },
        identifiers: [{
          _id: false,
          artists: [{
            _id: false,
            artist: { type: Number }
          }]
        }]
      });

      const artistSchema = new Schema({ _id: Number, name: String });
      artistSchema.virtual('songs', {
        ref: 'Test',
        localField: '_id',
        foreignField: 'identifiers.artists.artist'
      });

      const Song = db.model('Test', songSchema);
      const Artist = db.model('Person', artistSchema);


      await Artist.create([
        { _id: 1, name: 'Axl Rose' },
        { _id: 2, name: 'Slash' }
      ]);

      await Song.create({
        title: 'November Rain',
        identifiers: [{ artists: [{ artist: 1 }, { artist: 2 }] }]
      });

      const axl = await Artist.findById(1).populate('songs');
      assert.equal(axl.songs.length, 1);
      assert.equal(axl.songs[0].title, 'November Rain');
    });

    it('populate single path with numeric path underneath doc array (gh-7273)', async function() {
      const schema = new Schema({
        arr1: [{
          arr2: [{
            item: { type: Schema.Types.ObjectId, refPath: 'arr1.arr2.kind' },
            kind: String
          }]
        }]
      });

      const Model = db.model('Test', schema);

      const itemSchema = new Schema({ name: String });
      const Item1 = db.model('Test1', itemSchema);
      const Item2 = db.model('Test2', itemSchema);


      const item1 = await Item1.create({ name: 'item1' });
      const item2 = await Item2.create({ name: 'item2' });

      await Model.create({
        arr1: [{
          arr2: [
            { item: item1._id, kind: 'Test1' },
            { item: item2._id, kind: 'Test2' }
          ]
        }]
      });

      let doc = await Model.findOne().populate('arr1.arr2.item');
      assert.equal(doc.arr1[0].arr2[0].item.name, 'item1');
      assert.equal(doc.arr1[0].arr2[1].item.name, 'item2');

      doc = await Model.findOne().populate('arr1.0.arr2.item');
      assert.equal(doc.arr1[0].arr2[0].item.name, 'item1');
      assert.equal(doc.arr1[0].arr2[1].item.name, 'item2');

      doc = await Model.findOne().populate('arr1.0.arr2.0.item');
      assert.equal(doc.arr1[0].arr2[0].item.name, 'item1');
      assert.ok(!doc.arr1[0].arr2[1].item.name);

      doc = await Model.findOne();
      await doc.populate('arr1.0.arr2.1.item');
      assert.ok(!doc.arr1[0].arr2[0].item.name);
      assert.equal(doc.arr1[0].arr2[1].item.name, 'item2');

      doc = await Model.findOne();
      await doc.populate('arr1.0.arr2.0.item');
      await doc.populate('arr1.0.arr2.1.item');
      assert.equal(doc.arr1[0].arr2[0].item.name, 'item1');
      assert.equal(doc.arr1[0].arr2[1].item.name, 'item2');
    });

    it('supports populating a path in a document array embedded in an array (gh-7647)', async function() {
      const schema = new Schema({
        recordings: [[{
          file: { type: Schema.ObjectId, ref: 'Test' }
        }]]
      });
      const Song = db.model('Test1', schema);
      const Asset = db.model('Test', Schema({ name: String }));


      const a = await Asset.create({ name: 'foo' });
      await Song.create({ recordings: [[{ file: a._id }]] });

      const doc = await Song.findOne().populate('recordings.file');

      assert.equal(doc.recordings.length, 1);
      assert.equal(doc.recordings[0].length, 1);
      assert.equal(doc.recordings[0][0].file.name, 'foo');
      assert.ok(doc.populated('recordings.file'));
    });

    it('handles populating deeply nested path if value in db is a primitive (gh-7545)', async function() {
      const personSchema = new Schema({ _id: Number, name: String });
      const PersonModel = db.model('Person', personSchema);

      // Create Event Model
      const teamSchema = new Schema({
        nested: { members: [{ type: Number, ref: 'Person' }] }
      });
      const eventSchema = new Schema({
        _id: Number,
        title: String,
        teams: [teamSchema]
      });
      const EventModel = db.model('Test', eventSchema);


      await PersonModel.create({ _id: 1, name: 'foo' });
      await EventModel.collection.insertMany([
        { _id: 2, title: 'Event 1', teams: false },
        { _id: 3, title: 'Event 2', teams: [{ nested: { members: [1] } }] }
      ]);

      const docs = await EventModel.find().
        sort({ _id: 1 }).
        lean().
        populate('teams.nested.members');
      assert.strictEqual(docs[0].teams, false);

      assert.equal(docs[1].teams.length, 1);
      assert.deepEqual(docs[1].teams[0].nested.members.map(m => m.name), ['foo']);
    });

    it('sets populate virtual to empty array if local field empty (gh-8230)', async function() {
      const GroupSchema = new Schema({
        roles: [{
          roleId: String
        }]
      });
      GroupSchema.virtual('roles$', {
        ref: 'Test',
        localField: 'roles.roleId',
        foreignField: '_id'
      });

      const RoleSchema = new Schema({});

      const GroupModel = db.model('Group', GroupSchema);
      db.model('Test', RoleSchema);


      await GroupModel.create({ roles: [] });

      const res = await GroupModel.findOne({}).populate('roles$');
      assert.deepEqual(res.roles$, []);
    });

    it('sets populate virtual with count to 0 if local field empty (gh-7731)', async function() {
      const GroupSchema = new Schema({
        roles: [{
          roleId: String
        }]
      });
      GroupSchema.virtual('rolesCount', {
        ref: 'Test',
        localField: 'roles.roleId',
        foreignField: '_id',
        count: true
      });

      const RoleSchema = new Schema({});

      const GroupModel = db.model('Group', GroupSchema);
      db.model('Test', RoleSchema);


      await GroupModel.create({ roles: [] });

      const res = await GroupModel.findOne({}).populate('rolesCount');
      assert.strictEqual(res.rolesCount, 0);
    });

    it('can populate an array property whose name conflicts with array method (gh-7782)', async function() {
      const Child = db.model('Child', Schema({ name: String }));

      const Parent = db.model('Parent', Schema({
        list: [{
          fill: {
            child: { type: ObjectId, ref: 'Child' }
          }
        }]
      }));


      const c = await Child.create({ name: 'test' });
      const p = await Parent.create({ list: [{ fill: { child: c._id } }] });

      const doc = await Parent.findById(p).populate('list.fill.child');

      assert.equal(doc.list.length, 1);
      assert.strictEqual(doc.list[0].fill.child.name, 'test');
    });

    it('supports cross-db populate with refPath (gh-6520)', async function() {
      db2 = await mongoose.createConnection(start.uri2).asPromise();

      const bookSchema = new Schema({ title: String });
      const movieSchema = new Schema({ title: String });

      const userSchema = new Schema({
        name: String,
        kind: String,
        hobby: {
          type: Schema.Types.ObjectId,
          refPath: 'kind'
        }
      });

      const User = db.model('User', userSchema);
      const Book = db2.model('Book', bookSchema);
      const Movie = db2.model('Movie', movieSchema);

      const book = await Book.create({ title: 'Legacy of the Force: Revelation' });
      const movie = await Movie.create({ title: 'A New Hope' });

      await User.create([
        { name: 'test1', kind: 'Book', hobby: book._id },
        { name: 'test2', kind: 'Movie', hobby: movie._id }
      ]);

      const docs = await User.find().sort({ name: 1 }).populate({
        path: 'hobby',
        connection: db2
      });
      assert.equal(docs[0].hobby.title, 'Legacy of the Force: Revelation');
      assert.equal(docs[1].hobby.title, 'A New Hope');
    });

    it('ref function for conventional populate (gh-7669)', async function() {
      const schema = new mongoose.Schema({
        kind: String,
        media: {
          type: mongoose.Schema.Types.ObjectId,
          ref: doc => doc.kind
        }
      });
      const Model = db.model('Test', schema);
      const Movie = db.model('Movie', new Schema({ name: String }));
      const Book = db.model('Book', new Schema({ title: String }));


      const docs = await Promise.all([
        Movie.create({ name: 'The Empire Strikes Back' }),
        Book.create({ title: 'New Jedi Order' })
      ]);

      await Model.create([
        { kind: 'Movie', media: docs[0]._id },
        { kind: 'Book', media: docs[1]._id }
      ]);

      const res = await Model.find().sort({ kind: -1 }).populate('media');

      assert.equal(res[0].kind, 'Movie');
      assert.equal(res[0].media.name, 'The Empire Strikes Back');
      assert.equal(res[1].kind, 'Book');
      assert.equal(res[1].media.title, 'New Jedi Order');
    });

    it('virtual refPath (gh-7848)', async function() {
      const Child = db.model('Child', Schema({
        name: String,
        parentId: Number
      }));

      const parentSchema = Schema({
        _id: Number,
        kind: String
      });
      parentSchema.virtual('childDocs', {
        refPath: 'kind',
        localField: '_id',
        foreignField: 'parentId',
        justOne: false
      });
      const Parent = db.model('Parent', parentSchema);


      await Parent.create({ _id: 1, kind: 'Child' });
      await Child.create({ name: 'test', parentId: 1 });

      const doc = await Parent.findOne().populate('childDocs');
      assert.equal(doc.childDocs.length, 1);
      assert.equal(doc.childDocs[0].name, 'test');
    });

    it('handles refPath on discriminator when populating top-level model (gh-5109)', async function() {
      const options = { discriminatorKey: 'kind' };
      const Post = db.model('BlogPost', new Schema({ time: Date, text: String }, options));

      const MediaPost = Post.discriminator('Test', new Schema({
        media: { type: Schema.Types.ObjectId, refPath: 'mediaType' },
        mediaType: String // either 'Image' or 'Video'
      }, options));
      const Image = db.model('Image',
        new Schema({ url: String }));
      const Video = db.model('Video',
        new Schema({ url: String, duration: Number }));


      const image = await Image.create({ url: 'test' });
      const video = await Video.create({ url: 'foo', duration: 42 });

      await MediaPost.create([
        { media: image._id, mediaType: 'Image' },
        { media: video._id, mediaType: 'Video' }
      ]);

      const docs = await Post.find().populate('media').sort({ mediaType: 1 });

      assert.equal(docs.length, 2);
      assert.ok(docs[0].populated('media'));
      assert.ok(docs[1].populated('media'));

      assert.equal(docs[0].media.url, 'test');
      assert.equal(docs[1].media.url, 'foo');
      assert.equal(docs[1].media.duration, 42);
    });

    it('refPath with virtual (gh-7341)', async function() {
      const options = { discriminatorKey: 'kind' };
      const postSchema = new Schema({
        media: { type: Schema.Types.ObjectId, refPath: 'mediaType' },
        _mediaType: String // either 'Image' or 'Video'
      }, options);

      postSchema.virtual('mediaType').get(function() { return this._mediaType; });

      const Post = db.model('BlogPost', postSchema);
      const Image = db.model('Image', new Schema({ url: String }));
      const Video = db.model('Video', new Schema({ url: String, duration: Number }));


      const image = await Image.create({ url: 'test' });
      const video = await Video.create({ url: 'foo', duration: 42 });

      await Post.create([
        { media: image._id, _mediaType: 'Image' },
        { media: video._id, _mediaType: 'Video' }
      ]);

      const docs = await Post.find().populate('media').sort({ _mediaType: 1 });

      assert.ok(docs[0].populated('media'));
      assert.ok(docs[1].populated('media'));

      assert.equal(docs[0].media.url, 'test');
      assert.equal(docs[1].media.url, 'foo');
      assert.equal(docs[1].media.duration, 42);
    });

    it('count with subdocs (gh-7573)', async function() {
      const DeveloperSchema = Schema({ name: String });
      const TeamSchema = Schema({
        name: String,
        developers: [DeveloperSchema]
      });
      const TicketSchema = Schema({
        assigned: String,
        description: String
      });

      DeveloperSchema.virtual('ticketCount', {
        ref: 'Test',
        localField: 'name',
        foreignField: 'assigned',
        count: true
      });

      const Ticket = db.model('Test', TicketSchema);
      const Team = db.model('Team', TeamSchema);


      await Team.create({
        name: 'Rocket',
        developers: [{ name: 'Jessie' }, { name: 'James' }, { name: 'Meowth' }]
      });
      await Ticket.create([
        { assigned: 'Jessie', description: 'test1' },
        { assigned: 'James', description: 'test2' },
        { assigned: 'Jessie', description: 'test3' }
      ]);

      const team = await Team.findOne().populate('developers.ticketCount');
      assert.equal(team.developers[0].ticketCount, 2);
      assert.equal(team.developers[1].ticketCount, 1);
      assert.equal(team.developers[2].ticketCount, 0);
    });

    it('returns an array when count on an array localField (gh-11307) (gh-7573)', async function() {
      const CommentSchema = Schema({
        content: String,
        replies: [{ type: 'ObjectId', ref: 'Comment' }]
      });
      CommentSchema.virtual('reportReplyCount', {
        ref: 'Report',
        localField: 'replies',
        foreignField: 'reportModel',
        justOne: false,
        count: true,
        match: { reportType: 'Comment' }
      });
      const ReportSchema = Schema({
        reportType: String,
        reportModel: 'ObjectId'
      });

      const Comment = db.model('Comment', CommentSchema);
      const Report = db.model('Report', ReportSchema);

      const comment1 = await Comment.create({ content: 'comment1' });
      const comment2 = await Comment.create({ content: 'comment2' });
      const comment3 = await Comment.create({ content: 'comment3' });

      comment1.replies = [comment2, comment3];
      await comment1.save();
      await Report.create([
        { reportType: 'Comment', reportModel: comment2._id },
        { reportType: 'Comment', reportModel: comment2._id },
        { reportType: 'Comment', reportModel: comment3._id },
        { reportType: 'Other', reportModel: comment3._id }
      ]);

      let doc;

      doc = await Comment.findOne({ _id: comment1._id }).populate('reportReplyCount');
      assert.deepStrictEqual(doc.reportReplyCount, [2, 1]);

      await Report.deleteMany({ reportModel: comment3._id });
      doc = await Comment.findOne({ _id: comment1._id }).populate('reportReplyCount');
      assert.deepStrictEqual(doc.reportReplyCount, [2, 0]);

      await Report.deleteMany({});
      doc = await Comment.findOne({ _id: comment1._id }).populate('reportReplyCount');
      assert.deepStrictEqual(doc.reportReplyCount, [0, 0]);
    });

    it('handles virtual populate of an embedded discriminator nested path (gh-6488) (gh-8173)', async function() {

      const UserModel = db.model('User', Schema({
        employeeId: Number,
        name: String
      }));

      const eventSchema = Schema({ message: String }, { discriminatorKey: 'kind' });
      const batchSchema = Schema({ nested: { events: [eventSchema] } });

      const nestedLayerSchema = Schema({ users: [Number] });
      nestedLayerSchema.virtual('users_$', {
        ref: 'User',
        localField: 'users',
        foreignField: 'employeeId'
      });

      const docArray = batchSchema.path('nested.events');
      docArray.discriminator('Clicked', Schema({ nestedLayer: nestedLayerSchema }));
      docArray.discriminator('Purchased', Schema({ purchased: String }));

      const Batch = db.model('Test', batchSchema);

      await UserModel.create({ employeeId: 1, name: 'test' });
      await Batch.create({
        nested: {
          events: [
            { kind: 'Clicked', nestedLayer: { users: [1] } },
            { kind: 'Purchased', purchased: 'test' }
          ]
        }
      });

      let res = await Batch.findOne().
        populate('nested.events.nestedLayer.users_$');
      assert.equal(res.nested.events[0].nestedLayer.users_$.length, 1);
      assert.equal(res.nested.events[0].nestedLayer.users_$[0].name, 'test');

      res = res.toObject({ virtuals: true });
      assert.equal(res.nested.events[0].nestedLayer.users_$.length, 1);
      assert.equal(res.nested.events[0].nestedLayer.users_$[0].name, 'test');
    });

    it('accessing populate virtual prop (gh-13189) (gh-8198)', async function() {
      const FooSchema = new Schema({
        name: String,
        children: [{
          barId: { type: Schema.Types.ObjectId, ref: 'Test' },
          quantity: Number
        }],
        child: new Schema({
          barId: {
            type: 'ObjectId',
            ref: 'Test'
          }
        })
      });
      FooSchema.virtual('children.bar', {
        ref: 'Test',
        localField: 'children.barId',
        foreignField: '_id',
        justOne: true
      });
      FooSchema.virtual('child.bars', {
        ref: 'Test',
        localField: 'child.barId',
        foreignField: '_id'
      });
      const BarSchema = Schema({ name: String });
      const Foo = db.model('Test1', FooSchema);
      const Bar = db.model('Test', BarSchema);

      const bar = await Bar.create({ name: 'bar' });
      const foo = await Foo.create({
        name: 'foo',
        children: [{ barId: bar._id, quantity: 1 }],
        child: {
          barId: bar._id
        }
      });
      const foo2 = await Foo.findById(foo._id).populate('children.bar child.bars');
      assert.equal(foo2.children[0].bar.name, 'bar');
      assert.equal(foo2.child.bars[0].name, 'bar');

      const asObject = foo2.toObject({ virtuals: true });
      assert.equal(asObject.children[0].bar.name, 'bar');
      assert.equal(asObject.child.bars[0].name, 'bar');
    });

    describe('gh-8247', function() {
      let Author;
      let Page;

      beforeEach(function() {
        const authorSchema = Schema({ name: String });
        const subSchema = Schema({
          author: { type: Schema.Types.ObjectId, ref: 'Author' },
          comment: String
        });
        const pageSchema = Schema({ title: String, comments: [subSchema] });
        Author = db.model('Author', authorSchema);
        Page = db.model('Test', pageSchema);
      });

      beforeEach(async() => {
        await Author.deleteMany({});
        await Page.deleteMany({});
      });

      it('checking `populated()` on a document array element (gh-8247)', async function() {

        const doc = await Author.create({ name: 'test author' });
        await Page.create({ comments: [{ author: doc._id }] });

        const fromDb = await Page.findOne().populate('comments.author');
        assert.ok(Array.isArray(fromDb.populated('comments.author')));
        assert.equal(fromDb.populated('comments.author').length, 1);
        assert.equal(fromDb.comments[0].author.name, 'test author');

        assert.ok(fromDb.comments[0].populated('author'));
      });

      it('updates top-level populated() when pushing elements onto a document array with single populated path (gh-8247) (gh-8265)', async function() {

        const docs = await Author.create([
          { name: 'test1' },
          { name: 'test2' }
        ]);
        await Page.create({ comments: [{ author: docs[0]._id }] });

        // Try setting to non-manually populated path...
        let fromDb = await Page.findOne().populate('comments.author');
        assert.ok(Array.isArray(fromDb.populated('comments.author')));
        assert.equal(fromDb.populated('comments.author').length, 1);
        assert.equal(fromDb.comments[0].author.name, 'test1');

        fromDb.comments.push({ author: docs[1]._id });
        let pop = fromDb.populated('comments.author');
        assert.equal(pop.length, 2);
        assert.equal(pop[0].toHexString(), docs[0]._id.toHexString());
        assert.equal(pop[1], null);

        fromDb.comments.pull({ _id: fromDb.comments[1]._id });
        pop = fromDb.populated('comments.author');
        assert.equal(pop.length, 1);

        fromDb.comments.shift();
        pop = fromDb.populated('comments.author');
        assert.equal(pop.length, 0);

        // And try setting to populated path
        fromDb = await Page.findOne().populate('comments.author');
        assert.ok(Array.isArray(fromDb.populated('comments.author')));
        assert.equal(fromDb.populated('comments.author').length, 1);
        assert.equal(fromDb.comments[0].author.name, 'test1');

        fromDb.comments.push({ author: docs[1] });
        pop = fromDb.populated('comments.author');
        assert.equal(pop.length, 2);

        fromDb.comments.splice(1, 1);
        pop = fromDb.populated('comments.author');
        assert.equal(pop.length, 1);
      });

      it('retainNullValues stores `null` in array if foreign doc not found (gh-8293)', async function() {
        db.deleteModel(/Test/);
        const schema = Schema({ troops: [{ type: Number, ref: 'Test' }] });
        const Team = db.model('Team', schema);
        const Card = db.model('Test', Schema({
          _id: { type: Number },
          name: String,
          entityType: { type: String }
        }));


        await Card.create([
          { _id: 2, name: 'Card 2' },
          { _id: 3, name: 'Card 3' },
          { _id: 4, name: 'Card 4' }
        ]);
        await Team.create({ troops: [1, 2, 3, 4] });

        const doc = await Team.findOne().populate({
          path: 'troops',
          options: { retainNullValues: true }
        });
        assert.equal(doc.troops.length, 4);
        assert.equal(doc.troops[0], null);
        assert.equal(doc.troops[1].name, 'Card 2');
        assert.equal(doc.troops[2].name, 'Card 3');
        assert.equal(doc.troops[3].name, 'Card 4');
      });

      it('virtual populate with discriminator that has a custom discriminator value (gh-8324)', async function() {
        db.deleteModel(/Test/);
        const mainSchema = new Schema({ title: { type: String } },
          { discriminatorKey: 'type' });

        mainSchema.virtual('virtualField', {
          ref: 'Test1',
          localField: '_id',
          foreignField: 'main'
        });

        const discriminatedSchema = new Schema({ description: String });
        const Main = db.model('Test', mainSchema);
        const Discriminator = Main.discriminator('gh8324_Discriminator',
          discriminatedSchema, 'customValue');
        const Model = db.model('Test1', Schema({
          main: 'ObjectId'
        }));


        const d = await Discriminator.create({ title: 'test', description: 'test' });
        await Model.create({ main: d._id });

        const docs = await Main.find().populate('virtualField').exec();
        assert.ok(docs[0].virtualField[0].main);
      });

      it('virtual populate with multiple `localField` and `foreignField` (gh-6608)', async function() {
        const employeeSchema = Schema({
          locationId: String,
          departmentId: String,
          name: String
        });

        employeeSchema.virtual('department', {
          ref: 'Test',
          localField: ['locationId', 'departmentId'],
          foreignField: ['locationId', 'name'],
          justOne: true
        });

        employeeSchema.virtual('departments', {
          ref: 'Test',
          localField: ['locationId', 'departmentId'],
          foreignField: ['locationId', 'name'],
          justOne: false
        });

        const departmentSchema = Schema({
          locationId: String,
          name: String
        });


        db.deleteModel(/Test/);
        const Employee = db.model('Person', employeeSchema);
        const Department = db.model('Test', departmentSchema);

        await Employee.create([
          { locationId: 'Miami', departmentId: 'Engineering', name: 'Valeri Karpov' },
          { locationId: 'Miami', departmentId: 'Accounting', name: 'Test 1' },
          { locationId: 'New York', departmentId: 'Engineering', name: 'Test 2' }
        ]);

        const depts = await Department.create([
          { locationId: 'Miami', name: 'Engineering' },
          { locationId: 'Miami', name: 'Accounting' },
          { locationId: 'New York', name: 'Engineering' }
        ]);
        const dept = depts[0];

        const doc = await Employee.findOne({ name: 'Valeri Karpov' }).
          populate('department departments');
        assert.equal(doc.department._id.toHexString(), dept._id.toHexString());
        assert.equal(doc.department.name, 'Engineering');

        assert.equal(doc.departments.length, 1);
        assert.equal(doc.departments[0]._id.toHexString(), dept._id.toHexString());
        assert.equal(doc.departments[0].name, 'Engineering');

        const docs = await Employee.find().
          sort({ name: 1 }).
          populate('department');

        assert.equal(docs.length, 3);
        assert.equal(docs[0].department.name, 'Accounting');
        assert.equal(docs[0].department.locationId, 'Miami');
        assert.equal(docs[1].department.name, 'Engineering');
        assert.equal(docs[1].department.locationId, 'New York');
        assert.equal(docs[2].department.name, 'Engineering');
        assert.equal(docs[2].department.locationId, 'Miami');
      });
    });

    it('doesnt insert empty document when populating a path within a non-existent document array (gh-8432)', async function() {
      const companySchema = new mongoose.Schema({
        name: String
      });
      const Company = db.model('Test', companySchema);

      const userSchema = new mongoose.Schema({
        fullName: String,
        companyId: {
          type: mongoose.ObjectId,
          ref: 'Test'
        }
      });
      const User = db.model('User', userSchema);

      const fileSchema = new mongoose.Schema({
        _id: String,
        uploaderId: {
          type: mongoose.ObjectId,
          ref: 'User'
        }
      }, { toObject: { virtuals: true }, toJSON: { virtuals: true } });
      fileSchema.virtual('uploadedBy', {
        ref: 'User',
        localField: 'uploaderId',
        foreignField: '_id',
        justOne: true
      });

      const rideSchema = new mongoose.Schema({
        title: String,
        files: { type: [fileSchema], default: [] }
      }, { toObject: { virtuals: true }, toJSON: { virtuals: true } });
      const Ride = db.model('Test1', rideSchema);


      const company = await Company.create({ name: 'Apple' });
      const user = await User.create({ fullName: 'John Doe', companyId: company._id });
      await Ride.create([
        { title: 'London-Paris' },
        {
          title: 'Berlin-Moscow',
          files: [{ _id: '123', uploaderId: user._id }]
        }
      ]);
      await Ride.updateMany({}, { $unset: { files: 1 } });

      const populatedRides = await Ride.find({}).populate({
        path: 'files.uploadedBy',
        justOne: true,
        populate: {
          path: 'companyId',
          justOne: true
        }
      });
      assert.deepEqual(populatedRides[0].files, []);
      assert.deepEqual(populatedRides[1].files, []);
    });

    it('sets empty array if populating undefined path (gh-8455)', async function() {
      const TestSchema = new Schema({
        thingIds: [mongoose.ObjectId]
      });

      TestSchema.virtual('things', {
        ref: 'Test1',
        localField: 'thingIds',
        foreignField: '_id',
        justOne: false
      });

      const Test = db.model('Test', TestSchema);
      db.model('Test1', mongoose.Schema({ name: String }));


      await Test.collection.insertOne({});

      const doc = await Test.findOne().populate('things');
      assert.deepEqual(doc.toObject({ virtuals: true }).things, []);
    });

    it('succeeds with refPath if embedded discriminator has path with same name but no refPath (gh-8452) (gh-8499)', async function() {
      const ImageSchema = Schema({ imageName: String });
      const Image = db.model('Image', ImageSchema);

      const TextSchema = Schema({ textName: String });
      const Text = db.model('BlogPost', TextSchema);

      const opts = { _id: false };
      const ItemSchema = Schema({ objectType: String }, opts);
      const ItemSchemaA = Schema({
        data: {
          type: ObjectId,
          refPath: 'list.objectType'
        },
        objectType: String
      }, opts);
      const ItemSchemaB = Schema({
        data: { sourceId: Number },
        objectType: String
      }, opts);

      const ExampleSchema = Schema({ test: String, list: [ItemSchema] });
      ExampleSchema.path('list').discriminator('gh8452_ExtendA', ItemSchemaA);
      ExampleSchema.path('list').discriminator('gh8452_ExtendB', ItemSchemaB);
      const Example = db.model('Test', ExampleSchema);


      const images = await Image.create([{ imageName: 'image' }, { imageName: 'image2' }]);
      const text = await Text.create({ textName: 'text' });
      await Example.create({
        test: '02',
        list: [
          { __t: 'gh8452_ExtendA', data: images[0]._id, objectType: 'Image' },
          { __t: 'gh8452_ExtendA', data: text._id, objectType: 'BlogPost' },
          { __t: 'gh8452_ExtendB', data: { sourceId: 123 }, objectType: 'ExternalSourceA' },
          { __t: 'gh8452_ExtendA', data: images[1]._id, objectType: 'Image' },
          { __t: 'gh8452_ExtendB', data: { sourceId: 456 }, objectType: 'ExternalSourceB' }
        ]
      });

      const res = await Example.findOne().populate('list.data').lean();
      assert.equal(res.list[0].data.imageName, 'image');
      assert.equal(res.list[1].data.textName, 'text');
      assert.equal(res.list[2].data.sourceId, 123);
      assert.equal(res.list[3].data.imageName, 'image2');
      assert.equal(res.list[4].data.sourceId, 456);
    });

    it('excluding foreignField using minus path deselects foreignField (gh-8460)', async function() {
      const schema = Schema({ specialId: String });

      schema.virtual('searchResult', {
        ref: 'Test',
        localField: 'specialId',
        foreignField: 'specialId',
        options: { select: 'name -_id -specialId' },
        justOne: true
      });
      const Model = db.model('Test1', schema);
      const Result = db.model('Test', Schema({
        name: String,
        specialId: String,
        other: String
      }));


      await Result.create({ name: 'foo', specialId: 'secret', other: 'test' });
      await Model.create({ specialId: 'secret' });

      let doc = await Model.findOne().populate('searchResult');
      assert.strictEqual(doc.searchResult.specialId, void 0);

      doc = await Model.findOne().populate({
        path: 'searchResult',
        select: 'name -_id'
      });
      assert.strictEqual(doc.searchResult.specialId, 'secret');
    });

    it('supports top-level match option (gh-8475)', async function() {
      const childSchema = Schema({ parentId: 'ObjectId', deleted: Boolean });

      const parentSchema = Schema({ name: String });
      parentSchema.virtual('childCount', {
        ref: 'Child',
        localField: '_id',
        foreignField: 'parentId',
        count: true,
        match: { deleted: { $ne: true } }
      });

      const Child = db.model('Child', childSchema);
      const Parent = db.model('Parent', parentSchema);


      const p = await Parent.create({ name: 'test' });

      await Child.create([
        { parentId: p._id },
        { parentId: p._id, deleted: true },
        { parentId: p._id, deleted: false }
      ]);

      let doc = await Parent.findOne().populate('childCount');
      assert.equal(doc.childCount, 2);

      doc = await Parent.findOne().
        populate({ path: 'childCount', match: { deleted: true } });
      assert.equal(doc.childCount, 1);
    });

    it('supports top-level skip and limit options (gh-8445)', async function() {
      const childSchema = Schema({ _id: Number, parentId: 'ObjectId' });

      const parentSchema = Schema({ name: String });
      parentSchema.virtual('children', {
        ref: 'Child',
        localField: '_id',
        foreignField: 'parentId',
        justOne: false,
        skip: 1,
        limit: 2,
        options: { sort: { _id: 1 } }
      });

      const Child = db.model('Child', childSchema);
      const Parent = db.model('Parent', parentSchema);


      const p = await Parent.create({ name: 'test' });

      await Child.create([
        { _id: 1, parentId: p._id },
        { _id: 2, parentId: p._id },
        { _id: 3, parentId: p._id }
      ]);

      let doc = await Parent.findOne().populate('children');
      assert.deepEqual(doc.children.map(c => c._id), [2, 3]);

      doc = await Parent.findOne().populate({ path: 'children', skip: 2 });
      assert.deepEqual(doc.children.map(c => c._id), [3]);

      doc = await Parent.findOne().populate({
        path: 'children',
        skip: 2,
        options: { skip: 1 }
      });
      assert.deepEqual(doc.children.map(c => c._id), [2, 3]);

      doc = await Parent.findOne().populate({ path: 'children', skip: 0 });
      assert.deepEqual(doc.children.map(c => c._id), [1, 2]);

      doc = await Parent.findOne().populate({ path: 'children', skip: 0, limit: 1 });
      assert.deepEqual(doc.children.map(c => c._id), [1]);

      const p2 = await Parent.create({ name: 'test2' });
      await Child.create([
        { _id: 4, parentId: p2._id },
        { _id: 5, parentId: p2._id }
      ]);

      const docs = await Parent.find().sort({ _id: 1 }).
        populate({ path: 'children', skip: 0, limit: 2 });
      assert.equal(docs[0]._id.toString(), p._id.toString());
      assert.equal(docs[1]._id.toString(), p2._id.toString());
      assert.deepEqual(docs[0].children.map(c => c._id), [1, 2]);
      assert.deepEqual(docs[1].children.map(c => c._id), [4]);
    });

    it('top-level limit properly applies limit per document (gh-8657)', async function() {
      const Article = db.model('Article', mongoose.Schema({
        authors: [{ type: Number, ref: 'User' }]
      }));
      const User = db.model('User', mongoose.Schema({ _id: Number }));


      await Article.create([
        { authors: [1, 2] },
        { authors: [3, 4] }
      ]);
      await User.create({ _id: 1 }, { _id: 2 }, { _id: 3 }, { _id: 4 });

      const res = await Article.find().
        sort({ _id: 1 }).
        populate({ path: 'authors', limit: 1, sort: { _id: 1 } });
      assert.equal(res.length, 2);
      assert.deepEqual(res[0].authors.map(a => a._id), [1]);
      assert.deepEqual(res[1].toObject().authors, []);
    });

    it('correct limit with populate (gh-7318)', async function() {
      const childSchema = Schema({ _id: Number, parentId: 'ObjectId' });

      const parentSchema = Schema({ name: String });
      parentSchema.virtual('children', {
        ref: 'Child',
        localField: '_id',
        foreignField: 'parentId',
        justOne: false,
        options: { sort: { _id: 1 } },
        perDocumentLimit: 2
      });

      const Child = db.model('Child', childSchema);
      const Parent = db.model('Parent', parentSchema);


      const p = await Parent.create({ name: 'test' });

      await Child.create([
        { _id: 1, parentId: p._id },
        { _id: 2, parentId: p._id },
        { _id: 3, parentId: p._id }
      ]);

      const p2 = await Parent.create({ name: 'test2' });
      await Child.create([
        { _id: 4, parentId: p2._id },
        { _id: 5, parentId: p2._id }
      ]);

      let docs = await Parent.find().sort({ _id: 1 }).
        populate({ path: 'children' });
      assert.equal(docs[0]._id.toString(), p._id.toString());
      assert.equal(docs[1]._id.toString(), p2._id.toString());
      assert.deepEqual(docs[0].children.map(c => c._id), [1, 2]);
      assert.deepEqual(docs[1].children.map(c => c._id), [4, 5]);

      docs = await Parent.find().sort({ _id: 1 }).
        populate({ path: 'children', perDocumentLimit: 1 });
      assert.equal(docs[0]._id.toString(), p._id.toString());
      assert.equal(docs[1]._id.toString(), p2._id.toString());
      assert.deepEqual(docs[0].children.map(c => c._id), [1]);
      assert.deepEqual(docs[1].children.map(c => c._id), [4]);

      docs = await Parent.find().sort({ _id: 1 }).
        populate({ path: 'children', options: { perDocumentLimit: 1 } });
      assert.equal(docs[0]._id.toString(), p._id.toString());
      assert.equal(docs[1]._id.toString(), p2._id.toString());
      assert.deepEqual(docs[0].children.map(c => c._id), [1]);
      assert.deepEqual(docs[1].children.map(c => c._id), [4]);
    });

    it('perDocumentLimit as option to `populate()` method (gh-7318) (gh-9418)', async function() {
      const childSchema = Schema({ _id: Number, parentId: 'ObjectId' });

      const parentSchema = Schema({ name: String });
      parentSchema.virtual('children', {
        ref: 'Child',
        localField: '_id',
        foreignField: 'parentId',
        justOne: false,
        options: { sort: { _id: 1 } }
      });

      const Child = db.model('Child', childSchema);
      const Parent = db.model('Parent', parentSchema);


      const p = await Parent.create({ name: 'test' });

      await Child.create([
        { _id: 1, parentId: p._id },
        { _id: 2, parentId: p._id },
        { _id: 3, parentId: p._id }
      ]);

      const p2 = await Parent.create({ name: 'test2' });
      await Child.create([
        { _id: 4, parentId: p2._id },
        { _id: 5, parentId: p2._id }
      ]);

      let docs = await Parent.find().sort({ _id: 1 }).
        populate({ path: 'children', perDocumentLimit: 1 });
      assert.equal(docs[0]._id.toString(), p._id.toString());
      assert.equal(docs[1]._id.toString(), p2._id.toString());
      assert.deepEqual(docs[0].children.map(c => c._id), [1]);
      assert.deepEqual(docs[1].children.map(c => c._id), [4]);

      docs = await Parent.find().sort({ _id: 1 }).
        populate({ path: 'children', options: { perDocumentLimit: 1 } });
      assert.equal(docs[0]._id.toString(), p._id.toString());
      assert.equal(docs[1]._id.toString(), p2._id.toString());
      assert.deepEqual(docs[0].children.map(c => c._id), [1]);
      assert.deepEqual(docs[1].children.map(c => c._id), [4]);
    });

    it('works when embedded discriminator array has populated path but not refPath (gh-8527)', async function() {
      const Image = db.model('Image', Schema({ imageName: String }));
      const Video = db.model('Video', Schema({ videoName: String }));
      const ItemSchema = Schema({ objectType: String }, {
        discriminatorKey: 'objectType',
        _id: false
      });

      const noId = { _id: false };

      const NestedDataSchema = Schema({
        data: Schema({ title: String, description: String }, noId)
      }, noId);

      const InternalItemSchemaGen = () => Schema({
        data: {
          type: ObjectId,
          refPath: 'list.objectType'
        }
      }, noId);

      const externalSchema = Schema({ data: { sourceId: Number } }, noId);
      const ExampleSchema = Schema({ test: String, list: [ItemSchema] });
      ExampleSchema.path('list').discriminator('Image', InternalItemSchemaGen());
      ExampleSchema.path('list').discriminator('Video', InternalItemSchemaGen());
      ExampleSchema.path('list').discriminator('ExternalSource', externalSchema);
      ExampleSchema.path('list').discriminator('NestedData', NestedDataSchema);
      const Example = db.model('Test', ExampleSchema);


      const image1 = await Image.create({ imageName: '01image' });
      const video1 = await Video.create({ videoName: '01video' });

      const example = await Example.create({
        test: 'example',
        list: [
          { data: image1._id, objectType: 'Image' },
          { data: video1._id, objectType: 'Video' },
          { data: { sourceId: 123 }, objectType: 'ExternalSource' },
          { data: { title: 'test' }, objectType: 'NestedData' }
        ]
      });

      const res = await Example.findById(example).populate('list.data').lean();
      assert.deepEqual(res.list[3].data, { title: 'test' });
    });

    it('handles populating embedded discriminators with `refPath` when none of the subdocs have `refPath` (gh-8553)', async function() {
      const ItemSchema = new Schema({ objectType: String },
        { discriminatorKey: 'objectType', _id: false });
      const ExampleSchema = Schema({ test: String, list: [ItemSchema] });

      ExampleSchema.path('list').discriminator('Text', Schema({
        data: { type: ObjectId, refPath: 'list.objectType' }
      }, { _id: false }));
      ExampleSchema.path('list').discriminator('ExternalSource', Schema({
        data: { sourceId: Number }
      }));

      const Example = db.model('Test', ExampleSchema);


      await Example.create({
        test: 'example',
        list: [
          { data: { sourceId: 123 }, objectType: 'ExternalSource' }
        ]
      });

      const res = await Example.find().populate('list.data');
      assert.deepEqual(res[0].toObject().list[0].data, { sourceId: 123 });
    });

    it('throws an error when using limit with perDocumentLimit', async function() {
      const User = db.model('User', userSchema);
      const BlogPost = db.model('BlogPost', blogPostSchema);

      const blogPosts = await BlogPost.create([{ title: 'JS 101' }, { title: 'Mocha 101' }]);
      const user = await User.create({ blogposts: blogPosts });


      let err;
      try {
        await User.find({ _id: user._id }).populate({ path: 'blogposts', perDocumentLimit: 2, limit: 1 });
      } catch (error) {
        err = error;
      }

      assert(err);
      assert.equal(err.message, 'Can not use `limit` and `perDocumentLimit` at the same time. Path: `blogposts`.');
    });

    it('handles function refPath with discriminators (gh-8731)', async function() {
      const nested = Schema({}, { discriminatorKey: 'type' });
      const mainSchema = Schema({ items: [nested] });

      const docs = [];
      mainSchema.path('items').discriminator('TestDiscriminator', Schema({
        childModel: { type: String },
        child: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: (doc, path) => {
            docs.push(doc);
            return path.replace('.child', '.childModel');
          }
        }
      }));
      const Parent = db.model('Parent', mainSchema);
      const Child = db.model('Child', Schema({ name: String }));

      const child = await Child.create({ name: 'test' });
      const parent = await Parent.create({
        items: [{
          type: 'TestDiscriminator',
          childModel: 'Child',
          child: child._id
        }]
      });

      assert.equal(docs.length, 0);
      const doc = await Parent.findOne().populate('items.child').exec();

      assert.equal(doc.items[0].child.name, 'test');
      assert.ok(doc.items[0].populated('child'));

      assert.equal(docs.length, 1);
      assert.equal(docs[0]._id.toHexString(), parent.items[0]._id.toHexString());
    });

    describe('gh-8760', function() {
      it('clone with lean creates identical copies from the same document', async function() {
        const userSchema = new Schema({ name: String });
        const User = db.model('User', userSchema);

        const postSchema = new Schema({
          user: { type: mongoose.ObjectId, ref: 'User' },
          title: String
        });

        const Post = db.model('BlogPost', postSchema);


        const user = await User.create({ name: 'val' });
        await Post.create([
          { title: 'test1', user: user },
          { title: 'test2', user: user },
          { title: 'test3', user: new mongoose.Types.ObjectId() }
        ]);

        const posts = await Post.find().populate({ path: 'user', options: { clone: true } }).sort('title').lean();

        posts[0].user.name = 'val2';
        assert.equal(posts[1].user.name, 'val');
        assert.equal(posts[2].user, null);
      });

      it('clone with populate and lean makes child lean', async function() {
        const isLean = v => v != null && !(v instanceof mongoose.Document);

        const userSchema = new Schema({ name: String });
        const User = db.model('User', userSchema);

        const postSchema = new Schema({
          user: { type: mongoose.ObjectId, ref: 'User' },
          title: String
        });

        const Post = db.model('BlogPost', postSchema);


        const user = await User.create({ name: 'val' });

        await Post.create({ title: 'test1', user: user });

        const post = await Post.findOne().populate({ path: 'user', options: { clone: true } }).lean();

        assert.ok(isLean(post.user));
      });

      it('can populate subdocs where one is discriminator and the other is not (gh-8837)', async function() {

        const eventSchema = new Schema({ }, { discriminatorKey: 'type' });
        const eventsListSchema = new Schema({ events: [eventSchema] });

        const clickEventSchema = new Schema({
          modelName: { type: String, required: true },
          productId: { type: Schema.ObjectId, refPath: 'events.modelName' }
        });

        const eventsSchemaType = eventsListSchema.path('events');
        eventsSchemaType.discriminator('ClickEvent', clickEventSchema);

        const EventsList = db.model('EventsList', eventsListSchema);
        const Product = db.model('Product', new Schema({ name: String }));

        const product = await Product.create({ name: 'GTX 1050 Ti' });

        await EventsList.create({
          events: [
            { },
            { type: 'ClickEvent', modelName: 'Product', productId: product._id }
          ]
        });

        const result = await EventsList.findOne().populate('events.productId');
        assert.equal(result.events[1].productId.name, 'GTX 1050 Ti');
      });

      it('can populate virtuals defined on child discriminators (gh-8924)', async function() {

        const User = db.model('User', {});
        const Post = db.model('Post', { name: String });

        const userWithPostSchema = new Schema({ postId: Schema.ObjectId });

        userWithPostSchema.virtual('post', { ref: 'Post', localField: 'postId', foreignField: '_id', justOne: true });

        const UserWithPost = User.discriminator('UserWithPost', userWithPostSchema);

        const post = await Post.create({ name: 'Clean Code' });

        await UserWithPost.create({ postId: post._id });

        const user = await User.findOne().populate({ path: 'post' });


        assert.equal(user.post.name, 'Clean Code');
      });
    });

    it('recursive virtuals with `populate` option (gh-11700)', async function() {
      const InteractionSchema = new Schema({
        title: String,
        parent: {
          type: mongoose.ObjectId,
          ref: 'Interaction'
        }
      });

      InteractionSchema.virtual('next', {
        ref: 'Interaction',
        localField: '_id',
        foreignField: 'parent',
        justOne: true,
        options: {
          populate: 'next'
        }
      });

      const Interaction = db.model('Interaction', InteractionSchema);

      const interactionA = new Interaction({ title: 'first interaction' });
      await interactionA.save();

      const interactionB = new Interaction({ title: 'second interaction', parent: interactionA._id });
      await interactionB.save();

      const interactionC = new Interaction({ title: 'third interaction', parent: interactionB._id });
      await interactionC.save();

      const interaction = await Interaction.findOne({ parent: null }).populate('next');

      assert.equal(interaction.title, interactionA.title);
      assert.notEqual(interaction.next, undefined);
      assert.equal(interaction.next.title, interactionB.title);
      assert.notEqual(interaction.next.next, undefined);
      assert.equal(interaction.next.next.title, interactionC.title);
    });

    it('no-op if populating on a document array with no ref (gh-8946)', async function() {
      const teamSchema = Schema({
        members: [{ user: { type: ObjectId, ref: 'User' } }]
      });
      const userSchema = Schema({ name: { type: String } });
      userSchema.virtual('teams', {
        ref: 'Team',
        localField: '_id',
        foreignField: 'members.user',
        justOne: false
      });
      const User = db.model('User', userSchema);
      const Team = db.model('Team', teamSchema);


      const user = await User.create({ name: 'User' });
      await Team.create({ members: [{ user: user._id }] });

      const res = await User.findOne().populate({
        path: 'teams',
        populate: {
          path: 'members', // No ref
          populate: { path: 'user' }
        }
      });

      assert.equal(res.teams[0].members[0].user.name, 'User');
    });

    it('no-op if populating a nested path (gh-9073)', async function() {
      const buildingSchema = Schema({ owner: String });
      const Building = db.model('Building', buildingSchema);

      const officeSchema = new Schema({
        title: String,
        place: { building: { type: Schema.ObjectId, ref: 'Building' } }
      });
      const Office = db.model('Office', officeSchema);


      const building = new Building({ owner: 'test' });
      await building.save();
      await Office.create({ place: { building: building._id } });

      const foundOffice = await Office.findOne({}).
        populate({ path: 'place', populate: 'building' });
      assert.equal(foundOffice.place.building.owner, 'test');
    });

    it('handles populating primitive array under document array with discriminator (gh-9148)', async function() {
      const ContentSchema = new Schema({ name: String });
      const Content = db.model('Test1', ContentSchema);

      const DataSchema = new Schema({ alias: String }, {
        discriminatorKey: 'type',
        _id: false
      });
      const ContentRelationSchema = new Schema({
        content: [{ type: Schema.Types.ObjectId, ref: 'Test1' }]
      }, { _id: false });
      const PageSchema = new Schema({
        name: String,
        data: [DataSchema]
      });

      PageSchema.path('data').discriminator('content', ContentRelationSchema);
      const Page = db.model('Test', PageSchema);


      const content = await Promise.all([
        Content.create({ name: 'A' }),
        Content.create({ name: 'B' })
      ]);

      const doc = await Page.create({
        name: 'Index',
        data: [{
          alias: 'my_content',
          type: 'content',
          content: [content[0]._id, content[1]._id]
        }]
      });

      const page = await Page.findById(doc._id).populate({
        path: 'data.content',
        select: { name: 1, _id: 0 }
      });
      assert.ok(Array.isArray(page.data[0].content));
      assert.deepEqual(page.toObject().data, [{
        alias: 'my_content',
        type: 'content',
        content: [{ name: 'A' }, { name: 'B' }]
      }]);
    });

    it('handles deselecting _id with `perDocumentLimit` (gh-8460) (gh-9175)', async function() {
      const postSchema = new Schema({
        title: String,
        commentsIds: [{ type: Schema.ObjectId, ref: 'Comment' }]
      });
      const Post = db.model('Post', postSchema);

      const commentSchema = new Schema({ content: String });
      const Comment = db.model('Comment', commentSchema);


      const post1 = new Post({ title: 'I have 3 comments' });
      let comments = await Comment.create([
        { content: 'Cool first post' },
        { content: 'Very cool first post' },
        { content: 'Super cool first post' }
      ]);

      post1.commentsIds = comments;
      await post1.save();

      const post2 = new Post({ title: 'I have 4 comments' });
      comments = await Comment.create([
        { content: 'Cool second post' },
        { content: 'Very cool second post' },
        { content: 'Super cool second post' },
        { content: 'Absolutely cool second post' }
      ]);
      post2.commentsIds = comments;
      await post2.save();

      const posts = await Post.find().populate({ path: 'commentsIds', select: 'content -_id', perDocumentLimit: 2 });

      assert.equal(posts[0].commentsIds.length, 2);
      assert.equal(posts[1].commentsIds.length, 2);
    });

    it('handles embedded discriminator `refPath` with multiple documents (gh-8731) (gh-9153)', async function() {
      const nested = Schema({}, { discriminatorKey: 'type' });
      const mySchema = Schema({ title: { type: String }, items: [nested] });

      const itemType = mySchema.path('items');

      itemType.discriminator('link', Schema({
        fooType: { type: String },
        foo: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: 'items.fooType'
        }
      }));

      const Model = db.model('Test', mySchema);


      const doc1 = await Model.create({ title: 'doc1' });
      await Model.create({
        title: 'doc2',
        items: [{
          type: 'link',
          fooType: 'Test',
          foo: doc1._id
        }]
      });

      const docs = await Model.find({ }).sort({ title: 1 }).populate('items.foo').exec();
      assert.equal(docs[1].items[0].foo.title, 'doc1');
    });

    it('Sets the populated document\'s parent() (gh-8092)', async function() {
      const schema = new Schema({
        single: { type: Number, ref: 'Child' },
        arr: [{ type: Number, ref: 'Child' }],
        docArr: [{ ref: { type: Number, ref: 'Child' } }]
      });

      schema.virtual('myVirtual', {
        ref: 'Child',
        localField: 'single',
        foreignField: '_id',
        justOne: true
      });

      const Parent = db.model('Parent', schema);
      const Child = db.model('Child', Schema({ _id: Number, name: String }));


      await Child.create({ _id: 1, name: 'test' });

      await Parent.create({ single: 1, arr: [1], docArr: [{ ref: 1 }] });

      let doc = await Parent.findOne().populate('single');
      assert.ok(doc.single.parent() === doc);
      assert.ok(doc.single.$parent() === doc);

      doc = await Parent.findOne().populate('arr');
      assert.ok(doc.arr[0].parent() === doc);
      assert.ok(doc.arr[0].$parent() === doc);

      doc = await Parent.findOne().populate('docArr.ref');
      assert.ok(doc.docArr[0].ref.parent() === doc);
      assert.ok(doc.docArr[0].ref.$parent() === doc);

      doc = await Parent.findOne().populate('myVirtual');
      assert.ok(doc.myVirtual.parent() === doc);
      assert.ok(doc.myVirtual.$parent() === doc);

      doc = await Parent.findOne();
      await doc.populate('single');
      assert.ok(doc.single.parent() === doc);
      assert.ok(doc.single.$parent() === doc);
    });

    it('populates single nested discriminator underneath doc array when populated docs have different model but same id (gh-9244)', async function() {
      const catSchema = Schema({ _id: Number, name: String });
      const dogSchema = Schema({ _id: Number, name: String });

      const notificationSchema = Schema({ title: String }, { discriminatorKey: 'type' });
      const notificationTypeASchema = Schema({
        subject: {
          type: Number,
          ref: 'Cat'
        }
      }, { discriminatorKey: 'type' });
      const notificationTypeBSchema = Schema({
        subject: {
          type: Number,
          ref: 'Dog'
        }
      }, { discriminatorKey: 'type' });

      const CatModel = db.model('Cat', catSchema);
      const DogModel = db.model('Dog', dogSchema);
      const NotificationModel = db.model('Notification', notificationSchema);
      const NotificationTypeAModel = NotificationModel.discriminator('NotificationTypeA', notificationTypeASchema);
      const NotificationTypeBModel = NotificationModel.discriminator('NotificationTypeB', notificationTypeBSchema);


      const cat = await CatModel.create({ _id: 1, name: 'Keanu' });
      const dog = await DogModel.create({ _id: 1, name: 'Bud' });

      await NotificationTypeAModel.create({ subject: cat._id, title: 'new cat' });
      await NotificationTypeBModel.create({ subject: dog._id, title: 'new dog' });

      const notifications = await NotificationModel.find({}).populate('subject');
      assert.deepEqual(notifications.map(el => el.subject.name), ['Keanu', 'Bud']);
    });

    it('skips checking `refPath` if the path to populate is undefined (gh-9340)', async function() {
      const firstSchema = Schema({
        ref: String,
        linkedId: {
          type: Schema.ObjectId,
          refPath: 'ref'
        }
      });
      const Parent = db.model('Parent', firstSchema);

      const secondSchema = new Schema({ name: String });
      const Child = db.model('Child', secondSchema);


      const child = await Child.create({ name: 'child' });
      await Parent.create({ ref: 'Child', linkedId: child._id });
      await Parent.create({ ref: 'does not exist' });

      const res = await Parent.find().populate('linkedId').sort({ ref: 1 }).exec();
      assert.equal(res.length, 2);

      assert.equal(res[0].ref, 'Child');
      assert.equal(res[0].linkedId.name, 'child');
      assert.equal(res[1].ref, 'does not exist');
      assert.strictEqual(res[1].linkedId, undefined);
    });

    it('supports default populate options (gh-6029)', async function() {
      const parentSchema = Schema({
        child: {
          type: 'ObjectId',
          ref: 'Child',
          populate: { select: 'name' }
        }
      });
      const Parent = db.model('Parent', parentSchema);

      const childSchema = new Schema({ name: String, age: Number });
      const Child = db.model('Child', childSchema);


      const child = await Child.create({ name: 'my name', age: 30 });
      await Parent.create({ child: child._id });

      const res = await Parent.findOne().populate('child');
      assert.equal(res.child.name, 'my name');
      assert.strictEqual(res.child.age, void 0);
    });

    it('avoids propagating lean virtuals to children (gh-9592)', async function() {
      const parentSchema = Schema({
        child: {
          type: 'ObjectId',
          ref: 'Child',
          populate: { select: 'name' }
        }
      });
      const Parent = db.model('Parent', parentSchema);

      const childSchema = new Schema({ name: String, age: Number });
      const findCallOptions = [];
      childSchema.pre('find', function() {
        findCallOptions.push(this._mongooseOptions.lean);
      });
      const Child = db.model('Child', childSchema);


      const child = await Child.create({ name: 'my name', age: 30 });
      await Parent.create({ child: child._id });

      await Parent.findOne().populate('child').lean({ virtuals: ['name', 'child.foo'] });
      assert.equal(findCallOptions.length, 1);
      assert.deepEqual(findCallOptions[0].virtuals, ['foo']);
    });

    it('gh-9833', async function() {
      const Books = db.model('books', new Schema({ name: String, tags: [{ type: Schema.Types.ObjectId, ref: 'tags' }] }));
      const Tags = db.model('tags', new Schema({ author: Schema.Types.ObjectId }));
      const Authors = db.model('authors', new Schema({ name: String }));


      const anAuthor = new Authors({ name: 'Author1' });
      await anAuthor.save();

      const aTag = new Tags({ author: anAuthor.id });
      await aTag.save();

      const aBook = new Books({ name: 'Book1', tags: [aTag.id] });
      await aBook.save();

      const aggregateOptions = [
        { $match: {
          name: { $in: [aBook.name] }
        } },
        { $lookup: {
          from: 'tags',
          localField: 'tags',
          foreignField: '_id',
          as: 'tags'
        } }
      ];
      const books = await Books.aggregate(aggregateOptions).exec();

      const populateOptions = [{
        path: 'tags.author',
        model: 'authors',
        select: '_id name'
      }];

      const populatedBooks = await Books.populate(books, populateOptions);
      assert.ok(!Array.isArray(populatedBooks[0].tags[0].author));
    });

    it('sets not-found values to null for paths that are not in the schema (gh-9913)', async function() {
      const Books = db.model('books', new Schema({ name: String, tags: [{ type: 'ObjectId', ref: 'tags' }] }));
      const Tags = db.model('tags', new Schema({ authors: [{ author: 'ObjectId' }] }));
      const Authors = db.model('authors', new Schema({ name: String }));


      const anAuthor = new Authors({ name: 'Author1' });
      await anAuthor.save();

      const aTag = new Tags({ authors: [{ author: anAuthor.id }, { author: new mongoose.Types.ObjectId() }] });
      await aTag.save();

      const aBook = new Books({ name: 'Book1', tags: [aTag.id] });
      await aBook.save();

      const aggregateOptions = [
        { $match: {
          name: { $in: [aBook.name] }
        } },
        { $lookup: {
          from: 'tags',
          localField: 'tags',
          foreignField: '_id',
          as: 'tags'
        } }
      ];
      const books = await Books.aggregate(aggregateOptions).exec();

      const populateOptions = [{
        path: 'tags.authors.author',
        model: 'authors',
        select: '_id name'
      }];

      const populatedBooks = await Books.populate(books, populateOptions);
      assert.strictEqual(populatedBooks[0].tags[0].authors[0].author.name, 'Author1');
      assert.strictEqual(populatedBooks[0].tags[0].authors[1].author, null);
    });

    it('handles perDocumentLimit where multiple documents reference the same populated doc (gh-9906)', async function() {
      const postSchema = new Schema({
        title: String,
        commentsIds: [{ type: Schema.ObjectId, ref: 'Comment' }]
      });
      const Post = db.model('Post', postSchema);

      const commentSchema = new Schema({ content: String });
      const Comment = db.model('Comment', commentSchema);


      const commonComment = new Comment({ content: 'Im used in two posts' });
      await commonComment.save();

      const comments = await Comment.create([
        { content: 'Nice first post' },
        { content: 'Nice second post' }
      ]);

      let posts = await Post.create([
        { title: 'First post', commentsIds: [commonComment, comments[0]] },
        { title: 'Second post', commentsIds: [commonComment, comments[1]] }
      ]);

      posts = await Post.find().
        sort({ title: 1 }).
        populate({ path: 'commentsIds', perDocumentLimit: 2, sort: { content: 1 } });
      assert.equal(posts.length, 2);
      assert.ok(!Array.isArray(posts[0].commentsIds[0]));

      assert.deepEqual(posts[0].toObject().commentsIds.map(c => c.content), ['Im used in two posts', 'Nice first post']);
      assert.deepEqual(posts[1].toObject().commentsIds.map(c => c.content), ['Im used in two posts', 'Nice second post']);
    });

    it('supports `transform` option (gh-3375)', async function() {
      const parentSchema = new Schema({
        name: String,
        children: [{ type: 'ObjectId', ref: 'Child' }],
        child: { type: 'ObjectId', ref: 'Child' }
      });
      const Parent = db.model('Parent', parentSchema);

      const Child = db.model('Child', Schema({ name: String }));

      const children = await Child.create([{ name: 'Luke' }, { name: 'Leia' }]);
      let p = await Parent.create({
        name: 'Anakin',
        children: children,
        child: children[0]._id
      });

      let called = [];
      function transform(doc, id) {
        called.push({
          doc: doc,
          id: id
        });

        return id;
      }

      // Populate array of ids
      p = await Parent.findById(p).populate({
        path: 'children',
        transform: transform
      });

      assert.equal(called.length, 2);
      assert.equal(called[0].doc.name, 'Luke');
      assert.equal(called[0].id.toHexString(), children[0]._id.toHexString());

      assert.equal(called[1].doc.name, 'Leia');
      assert.equal(called[1].id.toHexString(), children[1]._id.toHexString());

      // Populate single id
      called = [];
      p = await Parent.findById(p).populate({
        path: 'child',
        transform: transform
      });

      assert.equal(called.length, 1);
      assert.equal(called[0].doc.name, 'Luke');
      assert.equal(called[0].id.toHexString(), children[0]._id.toHexString());

      // Push a nonexistent id
      const newId = new mongoose.Types.ObjectId();
      await Parent.updateOne({ _id: p._id }, { $push: { children: newId } });

      called = [];
      p = await Parent.findById(p).populate({
        path: 'children',
        transform: transform
      });
      assert.equal(called.length, 3);
      assert.strictEqual(called[2].doc, null);
      assert.equal(called[2].id.toHexString(), newId.toHexString());

      assert.equal(p.children[2].toHexString(), newId.toHexString());

      // Populate 2 docs with same id
      await Parent.updateOne({ _id: p._id }, { $set: { children: [children[0], children[0]] } });
      called = [];

      p = await Parent.findById(p).populate({
        path: 'children',
        transform: transform
      });
      assert.equal(called.length, 2);
      assert.equal(called[0].id.toHexString(), children[0]._id.toHexString());
      assert.equal(called[1].id.toHexString(), children[0]._id.toHexString());

      // Populate single id that points to nonexistent doc
      await Parent.updateOne({ _id: p._id }, { $set: { child: newId } });
      called = [];
      p = await Parent.findById(p).populate({
        path: 'child',
        transform: transform
      });

      assert.equal(called.length, 1);
      assert.strictEqual(called[0].doc, null);
      assert.equal(called[0].id.toHexString(), newId.toHexString());
    });

    it('avoids calling `transform()` with `lean()` when no results (gh-12739)', async function() {
      const parentSchema = new Schema({ title: String });
      const childSchema = new Schema({
        title: String,
        parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent' }
      });
      parentSchema.virtual('children', {
        ref: 'Child',
        localField: '_id',
        foreignField: 'parent'
      });
      const Parent = db.model('Parent', parentSchema);
      const Child = db.model('Child', childSchema);

      await Parent.create({ title: 'parent' });
      await Child.create({ title: 'child' });
      const p = await Parent.find().lean().populate({
        path: 'children',
        match: { title: 'child' },
        select: '-__v',
        strictPopulate: false,
        transform: doc => {
          return doc;
        }
      });
      assert.equal(p.length, 1);
      assert.deepStrictEqual(p[0].children, []);
    });

    it('transform to primitive (gh-10064)', async function() {
      const Child = db.model('Child', mongoose.Schema({ name: String }));
      const Parent = db.model('Parent', mongoose.Schema({
        child: { type: 'ObjectId', ref: 'Child' },
        children: [{ type: 'ObjectId', ref: 'Child' }]
      }));


      const children = await Child.create([{ name: 'Luke' }, { name: 'Leia' }]);

      let doc = await Parent.create({ children, child: children[0] });
      doc = await Parent.findById(doc).populate([
        {
          path: 'child',
          transform: getName
        },
        {
          path: 'children',
          options: { retainNullValues: true },
          transform: getName
        }
      ]);

      function getName(doc) {
        return doc == null ? null : doc.name;
      }

      assert.equal(doc.child, 'Luke');
      assert.deepEqual(doc.toObject().children.sort().reverse(), ['Luke', 'Leia']);
    });

    it('transform with virtual populate, justOne = true (gh-3375)', async function() {
      const parentSchema = new Schema({
        name: String
      });
      parentSchema.virtual('child', {
        ref: 'Child',
        localField: '_id',
        foreignField: 'parentId',
        justOne: true
      });
      const Parent = db.model('Parent', parentSchema);

      const Child = db.model('Child', Schema({ name: String, parentId: 'ObjectId' }));


      let p = await Parent.create({ name: 'Anakin' });
      await Child.create({ name: 'Luke', parentId: p._id });

      const called = [];

      p = await Parent.findById(p).populate({
        path: 'child',
        transform: function(doc, id) {
          called.push({
            doc: doc,
            id: id
          });

          return id;
        }
      });

      assert.equal(called.length, 1);
      assert.strictEqual(called[0].doc.parentId.toHexString(), p._id.toHexString());
      assert.equal(called[0].id.toHexString(), p._id.toHexString());
    });

    it('transform with virtual populate, justOne = false (gh-3375)', async function() {
      const parentSchema = new Schema({
        name: String
      });
      parentSchema.virtual('children', {
        ref: 'Child',
        localField: '_id',
        foreignField: 'parentId',
        justOne: false
      });
      const Parent = db.model('Parent', parentSchema);

      const Child = db.model('Child', Schema({ name: String, parentId: 'ObjectId' }));


      let p = await Parent.create({ name: 'Anakin' });
      await Child.create([
        { name: 'Luke', parentId: p._id },
        { name: 'Leia', parentId: p._id }
      ]);

      const called = [];

      p = await Parent.findById(p).populate({
        path: 'children',
        transform: function(doc, id) {
          called.push({
            doc: doc,
            id: id
          });

          return id;
        }
      });

      assert.equal(called.length, 2);
      assert.deepEqual(called.map(c => c.doc.name).sort(), ['Leia', 'Luke']);

      assert.strictEqual(called[0].doc.parentId.toHexString(), p._id.toHexString());
      assert.equal(called[0].id.toHexString(), p._id.toHexString());

      assert.strictEqual(called[1].doc.parentId.toHexString(), p._id.toHexString());
      assert.equal(called[1].id.toHexString(), p._id.toHexString());
    });

    it('supports populating dotted subpath of a populated doc that has the same id as a populated doc (gh-10005)', async function() {
      const ModelASchema = new mongoose.Schema({
        _modelB: {
          type: mongoose.Types.ObjectId,
          ref: 'Test1'
        },
        _rootModel: {
          type: mongoose.Types.ObjectId,
          ref: 'Test'
        }
      });

      const ModelBSchema = new mongoose.Schema({
        _rootModel: {
          type: mongoose.Types.ObjectId,
          ref: 'Test'
        }
      });

      const RootModelSchema = new mongoose.Schema({ name: String });


      const ModelA = db.model('Test2', ModelASchema);
      const ModelB = db.model('Test1', ModelBSchema);
      const RootModel = db.model('Test', RootModelSchema);

      const rootModel = new RootModel({ name: 'my name' });
      const modelB = new ModelB({ _rootModel: rootModel });
      const modelA = new ModelA({ _rootModel: rootModel, _modelB: modelB });

      await Promise.all([rootModel.save(), modelB.save(), modelA.save()]);

      const modelA1 = await ModelA.findById(modelA._id);
      await modelA1.populate('_modelB _rootModel');
      await modelA1.populate('_modelB._rootModel');

      assert.equal(modelA1._modelB._rootModel.name, 'my name');
    });

    it('prevents already populated fields from becoming null gh-10068', async function() {

      const Books = db.model('books', new Schema({ name: String, contributors: [{ author: Schema.Types.ObjectId }] }));
      const Authors = db.model('authors', new Schema({ name: String }));

      const anAuthor = new Authors({ name: 'Author1' });
      await anAuthor.save();

      const aBook1 = new Books({ name: 'Book1', contributors: [{ author: anAuthor.id }] });
      await aBook1.save();
      const aBook2 = new Books({ name: 'Book2', contributors: [{ author: anAuthor.id }] });
      await aBook2.save();

      const populateOptions = [{
        path: 'contributors.author',
        model: 'authors',
        select: '_id name'
      }];
      const populatedBooks = (await Books.find().populate(populateOptions)).map(aBook => {
        aBook = aBook.toObject();
        if (!aBook._id.equals(aBook1.id)) {
          aBook.contributors[0].author = aBook.contributors[0].author._id;
        }
        return aBook;
      });

      const populatedBooksAgain = await Books.populate(populatedBooks, populateOptions);

      assert.equal(populatedBooksAgain[0].contributors[0].author.name, 'Author1');
    });

    it('populates lean subdoc with `_id` property (gh-10069)', async function() {
      const Books = db.model('Book', new Schema({ name: String, author: Schema.Types.ObjectId }));
      const Authors = db.model('Person', new Schema({ name: String }));


      const anAuthor = new Authors({ name: 'Author1' });
      await anAuthor.save();

      const aBook1 = new Books({ name: 'Book1', author: anAuthor.id });
      await aBook1.save();
      const aBook2 = new Books({ name: 'Book2', author: anAuthor.id });
      await aBook2.save();

      const populateOptions = [{
        path: 'author',
        model: 'Person'
      }];

      const books = (await Books.find().lean()).map(aBook => {
        if (!aBook._id.equals(aBook1.id)) {
          aBook.author = { _id: aBook.author };
        }
        return aBook;
      });

      const populatedBooks = await Books.populate(books, populateOptions);
      assert.equal(populatedBooks.length, 2);
      assert.equal(populatedBooks[0].author.name, 'Author1');
      assert.equal(populatedBooks[1].author.name, 'Author1');
    });

    it('handles virtual populate when foreignField is an array with duplicates (gh-10117)', async function() {
      const bookSchema = new Schema({ name: String, author: String });
      bookSchema.virtual('authors', {
        ref: 'Person',
        localField: 'author',
        foreignField: 'aliases',
        justOne: false
      });
      const Book = db.model('Book', bookSchema);
      const Author = db.model('Person', new Schema({ aliases: [String] }));


      await Author.create({ aliases: ['author1', 'author2', 'author1'] });

      const book = await Book.create({ name: 'Book1', author: 'author1' });

      const fromDb = await Book.findById(book).populate('authors');
      assert.equal(fromDb.authors.length, 1);
      assert.deepEqual(fromDb.toObject({ virtuals: true }).authors[0].aliases, ['author1', 'author2', 'author1']);
    });

    it('handles virtual populate with `$elemMatch` in custom match when `foreignField` is an array (gh-10117)', async function() {
      const User = db.model('User', mongoose.Schema({
        name: String,
        access: [{ role: String, deletedAt: Date, organization: 'ObjectId' }]
      }));

      const organizationSchema = mongoose.Schema({ name: String });
      organizationSchema.virtual('administrators', {
        ref: 'User',
        localField: '_id',
        foreignField: 'access.organization'
      });
      const Organization = db.model('Organization', organizationSchema);


      const org = await Organization.create({ name: 'test org' });
      await User.create([
        { name: 'user1', access: [{ role: 'admin', organization: org._id }] },
        { name: 'user2', access: [{ role: 'admin', organization: null }] },
        {
          name: 'user3',
          access: [
            // Shouldn't end up in result because first entry matches on `_id` but
            // not custom `$elemMatch`, and 2nd entry matches on custom `$elemMatch`
            // but not on `_id`.
            { role: 'admin', organization: org._id, deletedAt: new Date() },
            { role: 'admin', organization: null }
          ]
        }
      ]);

      const res = await Organization.findById(org).populate({
        path: 'administrators',
        match: {
          access: { $elemMatch: { role: 'admin', deletedAt: { $exists: false } } }
        }
      });
      assert.equal(res.administrators.length, 1);
      assert.equal(res.administrators[0].name, 'user1');
    });

    it('populates immutable array paths (gh-10159)', async function() {
      const Cat = db.model('Cat', {
        name: String,
        friends: [{
          immutable: true,
          type: mongoose.ObjectId,
          ref: 'Cat'
        }]
      });


      const friend = await Cat.create({ name: 'Zildjian' });
      const myCat = await Cat.create({ name: 'Lord Fluffles', friends: [friend.id] });

      await myCat.populate('friends');

      assert.equal(myCat.friends[0].name, 'Zildjian');
    });

    it('populates paths under mixed schematypes where some documents have non-object properties (gh-10191)', async function() {
      const schema = mongoose.Schema({
        name: String,
        params: [{
          key: String,
          value: 'Mixed'
        }]
      });
      const Test = db.model('Test', schema);
      const User = db.model('User', mongoose.Schema({ name: String }));


      const user = await User.create({ name: 'test' });

      await Test.create([
        { name: 'test1', params: [{ key: 'textContext', value: 'asd' }] },
        { name: 'test2', params: [{ key: 'logic', value: { optionLabels: [user._id] } }] }
      ]);

      const res = await Test.find().sort({ name: 1 }).populate({
        path: 'params.value.optionLabels',
        model: User
      });

      assert.equal(res[0].name, 'test1');
      assert.equal(res[0].params.length, 1);
      assert.equal(res[0].params[0].value, 'asd');

      assert.equal(res[1].name, 'test2');
      assert.equal(res[1].params.length, 1);
      assert.equal(res[1].params[0].value.optionLabels.length, 1);
      assert.equal(res[1].params[0].value.optionLabels[0].name, 'test');
    });

    it('populates embedded discriminator with tied value (gh-10231)', async function() {
      const GuestSchema = new Schema({
        dummy: String
      });

      const ActivitySchema = new Schema({
        title: String,
        kind: { required: true, type: String, enum: ['TALK'] } },
      { discriminatorKey: 'kind' });

      const ActivityTalkSchema = new Schema({
        speakers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Guest' }]
      });

      ActivityTalkSchema.add(ActivitySchema);

      ActivityTalkSchema.paths.kind.options.$skipDiscriminatorCheck = true;

      const ProgrammeSchema = new Schema({
        activities: [{ required: true, type: ActivitySchema }]
      });

      ProgrammeSchema.path('activities').discriminator('ActivityTalk', ActivityTalkSchema, 'TALK');

      const GuestModel = db.model('Guest', GuestSchema);
      const ProgrammeModel = db.model('Test', ProgrammeSchema);


      const guest1 = await GuestModel.create({ dummy: '1' });
      const guest2 = await GuestModel.create({ dummy: '2' });

      const programme1 = await ProgrammeModel.create({
        activities: [
          { title: 'hello', kind: 'TALK', speakers: [guest1, guest2] }
        ]
      });

      const event = await ProgrammeModel.findOne({ _id: programme1._id }).orFail().exec();
      await event.populate({ path: 'activities.speakers' });
      assert.equal(event.activities.length, 1);
      assert.equal(event.activities[0].speakers.length, 2);
      assert.equal(event.activities[0].speakers[0].dummy, '1');
      assert.equal(event.activities[0].speakers[1].dummy, '2');
    });

    it('supports populating an array of immutable elements (gh-10264)', async function() {
      const Cat = db.model('Cat', {
        _id: String,
        name: String,
        friends: [{
          immutable: true,
          ref: 'Cat',
          type: String
        }]
      });


      const friend = new Cat({ _id: 'garfield', name: 'Garfield' });
      await friend.save();

      const myCat = new Cat({ _id: 'arlene', name: 'Arlene', friends: [friend.id] });
      await myCat.save();

      await myCat.populate('friends');
      assert.equal(myCat.friends[0].name, 'Garfield');
    });

    it('populates nested path in schema using `Model.populate()` static (gh-10335)', async function() {
      const Books = db.model('Book', new Schema({
        name: String,
        author: { _id: Schema.Types.ObjectId, name: String }
      }));
      const Authors = db.model('Author', new Schema({ name: String }));


      const anAuthor = new Authors({ name: 'Author1' });
      await anAuthor.save();

      const aBook1 = new Books({ name: 'Book1', author: { _id: anAuthor.id } });
      await aBook1.save();

      const books = (await Books.find().lean()).map(aBook => {
        aBook.author = aBook.author._id;
        return aBook;
      });

      const populatedBooks = await Books.populate(books, [{
        path: 'author',
        model: 'Author',
        select: '_id name'
      }]);

      assert.equal(populatedBooks.length, 1);
      assert.equal(populatedBooks[0].author.name, 'Author1');
    });

    it('calls subdocument ref functions with subdocument as context (gh-8469)', async function() {
      const ImageSchema = Schema({ imageName: String });
      const Image = db.model('Image', ImageSchema);

      const TextSchema = Schema({ textName: String });
      const Text = db.model('Text', TextSchema);

      const opts = { _id: false };
      let contexts = [];
      const ItemSchema = Schema({
        data: {
          type: 'ObjectId',
          ref: function() {
            contexts.push(this);
            return this.objectType;
          }
        },
        objectType: String
      }, opts);

      const ExampleSchema = Schema({ test: String, list: [ItemSchema] });
      const Example = db.model('Test', ExampleSchema);


      const text = await Text.create({ textName: 'test' });
      const image = await Image.create({ imageName: 'test' });
      await Example.create({
        list: [{ data: text._id, objectType: 'Text' }, { data: image._id, objectType: 'Image' }]
      });

      assert.equal(contexts.length, 0);
      let res = await Example.findOne().populate('list.data');

      assert.equal(contexts.length, 2);
      assert.equal(contexts[0].objectType, 'Text');
      assert.equal(contexts[1].objectType, 'Image');

      assert.equal(res.list[0].data.textName, 'test');
      assert.equal(res.list[1].data.imageName, 'test');

      contexts = [];
      res = await Example.findOne();
      await res.populate('list.data');

      assert.equal(contexts.length, 2);
      assert.equal(contexts[0].objectType, 'Text');
      assert.equal(contexts[1].objectType, 'Image');

      assert.equal(res.list[0].data.textName, 'test');
      assert.equal(res.list[1].data.imageName, 'test');
    });
  });

  it('avoids setting empty array on lean document when populate result is undefined (gh-10599)', async function() {
    const ImageSchema = Schema({ imageName: String }, { _id: false });
    const TextSchema = Schema({
      textName: String,
      attached: [{ type: 'ObjectId', ref: 'Test2' }]
    }, { _id: false });

    const ItemSchema = Schema({ objectType: String }, {
      discriminatorKey: 'objectType',
      _id: false
    });

    const ExampleSchema = Schema({ test: String, list: [ItemSchema] });

    ExampleSchema.path('list').discriminator('Image', ImageSchema);
    ExampleSchema.path('list').discriminator('Text', TextSchema);
    const Example = db.model('Test', ExampleSchema);
    const Another = db.model('Test2', Schema({ test: 'String' }));

    await Another.create({ _id: '61254490ea89de0004c8f2a0', test: 'test' });

    const example = await Example.create({
      test: 'example',
      list: [
        { imageName: 'an image', objectType: 'Image' },
        { textName: 'this is a text', attached: ['61254490ea89de0004c8f2a0'], objectType: 'Text' }
      ]
    });
    const query = Example.findById(example._id).populate('list.attached').lean();

    const result = await query.exec();
    assert.strictEqual(result.list[0].attached, void 0);
    assert.equal(result.list[1].attached[0].test, 'test');
  });

  it('supports ref: Model with virtual populate (gh-10695)', async function() {
    const userSchema = Schema({ _id: Number, email: String });
    const blogPostSchema = Schema({ title: String, authorId: Number });

    const User = db.model('User', userSchema);
    const BlogPost = db.model('BlogPost', blogPostSchema);
    blogPostSchema.virtual('author', {
      ref: User,
      localField: 'authorId',
      foreignField: '_id',
      justOne: true
    });

    await BlogPost.create({ title: 'Introduction to Mongoose', authorId: 1 });
    await User.create({ _id: 1, email: 'test@gmail.com' });

    const doc = await BlogPost.findOne().populate('author');
    assert.equal(doc.author.email, 'test@gmail.com');
  });

  it('supports ref on subdocuments (gh-10856)', async function() {
    const userSchema = Schema({ _id: Number, name: String, email: String });
    const blogPostSchema = Schema({
      title: String,
      author: {
        type: new Schema({ _id: Number, name: String }),
        ref: 'User'
      }
    });

    const User = db.model('User', userSchema);
    const BlogPost = db.model('BlogPost', blogPostSchema);

    await User.create({ _id: 1, name: 'John Smith', email: 'test@gmail.com' });
    await BlogPost.create({ title: 'Introduction to Mongoose', author: { _id: 1, name: 'John Smith' } });

    const doc = await BlogPost.findOne().populate('author');
    assert.equal(doc.author.email, 'test@gmail.com');
    assert.equal(doc.toObject().author.name, 'John Smith');
    assert.equal(doc.toObject().author.email, 'test@gmail.com');
    assert.equal(doc.toObject({ depopulate: true }).author.name, 'John Smith');
    assert.strictEqual(doc.toObject({ depopulate: true }).author.email, undefined);

    doc.depopulate();
    assert.equal(doc.author.name, 'John Smith');
    assert.strictEqual(doc.author.email, undefined);

    doc.author.name = 'John Smythe';
    await doc.save();

    let fromDb = await BlogPost.findById(doc);
    assert.equal(fromDb.author.name, 'John Smythe');

    await fromDb.populate('author');
    fromDb.author = { _id: fromDb.author._id, name: 'John Smithe' };
    assert.strictEqual(doc.author.email, undefined);
    await fromDb.save();

    fromDb = await BlogPost.findById(doc);
    assert.strictEqual(fromDb.author.email, undefined);
    assert.equal(fromDb.author.name, 'John Smithe');
  });

  it('no-op when populating a single nested subdoc underneath a doc array with no ref (gh-11538) (gh-10856)', async function() {
    const userSchema = Schema({ _id: Number, name: String, email: String, friends: [{ type: Number, ref: 'User' }] });
    const blogPostSchema = Schema({
      title: String,
      people: [{
        author: {
          type: new Schema({ _id: Number, name: String, friends: [{ type: Number, ref: 'User' }] })
          // ref: 'User'
        }
      }]
    });

    const User = db.model('User', userSchema);
    const BlogPost = db.model('BlogPost', blogPostSchema);

    await User.create({ _id: 2, name: 'Test', email: 'test@gmail.com' });
    await User.create({ _id: 1, name: 'John Smith', email: 'test@gmail.com', friends: [2] });
    await BlogPost.create({
      title: 'Introduction to Mongoose',
      people: [{
        author: { _id: 1, name: 'John Smith', friends: [2] }
      }]
    });

    const doc = await BlogPost.findOne().populate({
      path: 'people',
      populate: [{ path: 'author', populate: 'friends' }]
    });
    assert.strictEqual(doc.people[0].author.email, undefined);
  });

  it('supports ref on array containing subdocuments (gh-10856)', async function() {
    const userSchema = Schema({ _id: Number, name: String, email: String });
    const blogPostSchema = Schema({
      title: String,
      authors: [{
        user: {
          type: new Schema({ _id: Number, name: String }),
          ref: 'User'
        }
      }]
    });

    const User = db.model('User', userSchema);
    const BlogPost = db.model('BlogPost', blogPostSchema);

    await User.create({ _id: 1, name: 'John Smith', email: 'test@gmail.com' });
    await BlogPost.create({
      title: 'Introduction to Mongoose',
      authors: [{ user: { _id: 1, name: 'John Smith' } }]
    });

    const doc = await BlogPost.findOne().populate('authors.user');
    assert.equal(doc.authors[0].user.email, 'test@gmail.com');
    assert.equal(doc.toObject().authors[0].user.email, 'test@gmail.com');

    doc.depopulate();
    assert.equal(doc.authors[0].user.name, 'John Smith');
  });

  it('uses `Model` by default when doing `Model.populate()` on a POJO (gh-10978)', async function() {
    const UserSchema = new Schema({
      name: { type: String, default: '' }
    });

    const TestSchema = new Schema({
      users: [{ user: { type: 'ObjectId', ref: 'User' } }]
    });

    const User = db.model('User', UserSchema);
    const Test = db.model('Test', TestSchema);

    const users = await User.create([{ name: 'user-name' }, { name: 'user-name-2' }]);
    await Test.create([{ users: [{ user: users[0]._id }, { user: users[1]._id }] }]);

    const found = await Test.aggregate([
      {
        $project: {
          users: '$users'
        }
      },
      { $unwind: '$users' },
      { $sort: { 'users.name': 1 } }
    ]);

    const _users = found.reduce((users, cur) => [...users, cur.users], []);

    await User.populate(_users, { path: 'user' });
    assert.equal(_users.length, 2);
    assert.equal(_users[0].user.name, 'user-name');
    assert.equal(_users[1].user.name, 'user-name-2');
  });

  it('can reference parent connection models by name after `useDb()` (gh-11003)', async function() {
    const UserSchema = new Schema({
      name: String
    });

    const TestSchema = new Schema({
      user: { type: 'ObjectId', ref: 'User' }
    });

    const User = db.model('User', UserSchema);

    const conn2 = db.useDb(start.databases[1]);
    const Test = conn2.model('Test', TestSchema);

    await Test.deleteMany({});
    const users = await User.create([{ name: 'user-name' }, { name: 'user-name-2' }]);
    await Test.create([{ user: users[0]._id }, { user: users[1]._id }]);

    const res = await Test.find().populate('user').sort({ user: 1 });
    assert.equal(res.length, 2);
    assert.equal(res[0].user.name, 'user-name');
    assert.equal(res[1].user.name, 'user-name-2');

    await Test.deleteMany({});
  });

  it('handles refPath underneath map of subdocuments (gh-9359)', async function() {
    // user schema
    const userSchema = Schema({ name: String });

    // list schema
    const listSchema = Schema({ listName: String });

    // row value schema
    const rowValuesSchema = Schema({
      valueObject: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'values.$*.refp'
      },
      refp: String
    });

    // row schema
    const rowSchema = Schema({
      sortOrder: { type: mongoose.Schema.Types.Number, required: true },
      values: { type: mongoose.Schema.Types.Map, of: rowValuesSchema }
    });

    const User = db.model('User', userSchema);
    const List = db.model('List', listSchema);
    const Row = db.model('Row', rowSchema);

    const createUser = await User.create({ name: 'test' });
    const createList = await List.create({ listName: 'hi' });

    await Row.create({
      sortOrder: 1,
      values: {
        [createList._id]: {
          valueObject: new mongoose.Types.ObjectId(createUser._id),
          refp: 'User'
        }
      }
    });

    const row = await Row.findOne().populate({
      path: 'values.$*.valueObject'
    });

    assert.equal(row.values.get(createList._id.toString()).valueObject.name, 'test');
  });

  it('handles virtual populate with `justOne` underneath document array and sort (gh-12730) (gh-10552)', async function() {
    const shiftSchema = new mongoose.Schema({
      employeeId: mongoose.Types.ObjectId,
      startedAt: Date,
      endedAt: Date,
      name: String
    });

    const Shift = db.model('Child', shiftSchema);

    const employeeSchema = new mongoose.Schema({
      name: String
    }, { toJSON: { virtuals: true }, toObject: { virtuals: true } });

    employeeSchema.virtual('mostRecentShift', {
      ref: Shift,
      localField: '_id',
      foreignField: 'employeeId',
      options: {
        sort: { startedAt: -1 }
      },
      justOne: true
    });

    const storeSchema = new mongoose.Schema({
      location: String,
      employees: [employeeSchema]
    });

    const Store = db.model('Parent', storeSchema);

    const store = await Store.create({
      location: 'Tashbaan',
      employees: [
        { name: 'Aravis' },
        { name: 'Shasta' }
      ]
    });

    const employeeAravis = store.employees.find(({ name }) => name === 'Aravis');
    const employeeShasta = store.employees.find(({ name }) => name === 'Shasta');

    await Shift.insertMany([
      {
        employeeId: employeeAravis._id,
        startedAt: new Date(Date.now() - 57600000),
        endedAt: new Date(Date.now() - 43200000),
        name: 'shift1'
      },
      {
        employeeId: employeeAravis._id,
        startedAt: new Date(Date.now() - 28800000),
        endedAt: new Date(Date.now() - 14400000),
        name: 'shift2'
      },
      {
        employeeId: employeeShasta._id,
        startedAt: new Date(Date.now() - 14400000),
        endedAt: new Date(),
        name: 'shift3'
      }
    ]);

    const storeWithMostRecentShifts = await Store.
      findOne({ location: 'Tashbaan' }).
      populate('employees.mostRecentShift');

    assert.deepStrictEqual(
      storeWithMostRecentShifts.employees.map(e => e.mostRecentShift.name),
      ['shift2', 'shift3']
    );
  });

  it('merges match when match is on `_id` (gh-12834)', async function() {
    const personSchema = new Schema({
      name: String,
      stories: [{ type: Schema.Types.ObjectId, ref: 'Story' }]
    });

    const storySchema = new Schema({ title: String });

    const Story = db.model('Story', storySchema);
    const Person = db.model('Person', personSchema);

    const stories = await Story.create([
      { _id: '0'.repeat(24), title: 'The Fellowship of the Ring' },
      { _id: '1'.repeat(24), title: 'Casino Royale' },
      { _id: '2'.repeat(24), title: 'Live and Let Die' },
      { _id: '3'.repeat(24), title: 'The Two Towers' }
    ]);
    let person = await Person.create({
      name: 'Ian Fleming',
      stories: [stories[1]._id, stories[2]._id]
    });

    person = await Person.findById(person).populate({
      path: 'stories',
      match: {
        _id: { $gte: stories[2]._id }
      }
    });
    assert.equal(person.stories.length, 1);
    assert.equal(person.stories[0].title, 'Live and Let Die');

    person = await Person.findById(person).populate({
      path: 'stories',
      match: {
        _id: { $lte: stories[1]._id }
      }
    });
    assert.equal(person.stories.length, 1);
    assert.equal(person.stories[0].title, 'Casino Royale');

    person = await Person.findById(person).populate({
      path: 'stories',
      match: {
        _id: stories[1]._id
      }
    });
    assert.equal(person.stories.length, 1);
    assert.equal(person.stories[0].title, 'Casino Royale');
  });

  it('supports removing and then recreating populate virtual using schema clone (gh-13085)', async function() {
    const personSch = new mongoose.Schema(
      {
        firstName: { type: mongoose.SchemaTypes.String, required: true },
        surname: { type: mongoose.SchemaTypes.String, trim: true },
        nat: { type: mongoose.SchemaTypes.String, required: true, uppercase: true, minLength: 2, maxLength: 2 }
      },
      { strict: true, timestamps: true }
    );
    personSch.virtual('nationality', {
      localField: 'nat',
      foreignField: 'key',
      ref: 'Nat',
      justOne: true
    });
    let Person = db.model('Person', personSch.clone(), 'people');

    const natSch = new mongoose.Schema(
      {
        key: { type: mongoose.SchemaTypes.String, uppercase: true, index: true, minLength: 2, maxLength: 2 },
        desc: { type: mongoose.SchemaTypes.String, trim: true }
      },
      { strict: true }
    );
    const Nat = db.model('Nat', natSch);
    let n = new Nat({ key: 'ES', desc: 'Spain' });
    await n.save();
    n = new Nat({ key: 'IT', desc: 'Italy' });
    await n.save();
    n = new Nat({ key: 'FR', desc: 'French' });
    await n.save();

    let p = new Person({ firstName: 'Pepe', surname: 'Pérez', nat: 'it' });
    await p.save();
    p = new Person({ firstName: 'Paco', surname: 'Matinez', nat: 'es' });
    await p.save();
    p = new Person({ firstName: 'John', surname: 'Doe', nat: 'us' });
    await p.save();

    personSch.removeVirtual('nationality');
    personSch.virtual('nationality', {
      localField: 'nat',
      foreignField: 'key',
      ref: 'Nat',
      justOne: true
    });
    Person = db.model('Person', personSch.clone(), 'people', { overwriteModels: true });

    const peopleList = await Person.find().
      sort({ firstName: 1 }).
      populate({ path: 'nationality', match: { desc: 'Spain' } });
    assert.deepStrictEqual(peopleList.map(p => p.nationality?.key), [undefined, 'ES', undefined]);

  });


  describe('strictPopulate', function() {
    it('reports full path when throwing `strictPopulate` error with deep populate (gh-10923)', async function() {
      const L2 = db.model('Test', new Schema({ name: String }));

      const schema = new Schema({ l2: { type: 'ObjectId', ref: L2 } });
      const L1 = db.model('Child', schema);

      const Parent = db.model('Parent', new Schema({
        l1: { type: 'ObjectId', ref: L1 }
      }));

      await Parent.deleteMany();
      const l2 = await L2.create({ name: 'test' });
      const l1 = await L1.create({ l2 });
      await Parent.create({ l1 });

      const err = await Parent.findOne().populate({ path: 'l1', populate: { path: 'l22' } }).
        then(() => null, err => err);

      assert.ok(err.message.indexOf('l1.l22') !== -1, err.message);
    });

    it('propagates toObject options to populate virtuals (gh-13325)', async function() {
      const userSchema = Schema({
        firstName: String,
        companies: {
          type: [{ companyId: { type: Schema.Types.ObjectId }, companyName: String }]
        }
      }, {
        toObject: { virtuals: true },
        toJSON: { virtuals: true }
      });

      userSchema.virtual('companies.details', {
        ref: 'company',
        localField: 'companies.companyId',
        foreignField: '_id',
        justOne: true
      });

      const User = db.model('User', userSchema);
      const companySchema = Schema({
        name: {
          type: String
        },
        legalName: {
          type: String,
          required: true
        }
      });
      const Company = db.model('company', companySchema);

      const comp = await Company.create({
        name: 'Google',
        legalName: 'Alphabet Inc'
      });
      await User.create({
        firstName: 'Test',
        companies: [{ companyId: comp._id, companyName: 'Google' }]
      });
      const doc = await User.findOne().populate('companies.details');
      let obj = doc.toObject();
      assert.equal(obj.companies[0].details.name, 'Google');
      obj = doc.toJSON();
      assert.equal(obj.companies[0].details.name, 'Google');
    });

    it('respects strictPopulate schema option (gh-11290)', async function() {
      const kittySchema = Schema({ name: String }, { strictPopulate: false });

      const Kitten = db.model('Test', kittySchema);

      const kitty1 = new Kitten({ name: 'Henry' });
      await kitty1.save();
      // Does not throw
      await Kitten.findById(kitty1._id).populate('hello');

      const err = await Kitten.findById(kitty1._id).populate({ path: 'hello', strictPopulate: true }).
        then(() => null, err => err);
      assert.ok(err);
      assert.ok(err.message.includes('strictPopulate'), err.message);
      assert.ok(err instanceof MongooseError.StrictPopulateError);
    });

    it('allows overwriting localField and foreignField when populating a virtual gh-6963', async function() {
      const testSchema = Schema({ name: String, uuid: 'ObjectId' }, { toJSON: { virtuals: true }, toObject: { virtuals: true } });
      const userSchema = Schema({ name: String, field: { type: mongoose.Schema.Types.ObjectId, ref: 'gh6963' }, change: { type: mongoose.Schema.Types.ObjectId, ref: 'gh6963' } });
      testSchema.virtual('test', {
        ref: 'gh6963-2',
        localField: '_id',
        foreignField: 'field'
      });

      const Test = db.model('gh6963', testSchema);
      const User = db.model('gh6963-2', userSchema);

      const entry = await Test.create({
        name: 'Test',
        uuid: new mongoose.Types.ObjectId()
      });
      const otherEntry = await Test.create({
        name: 'Other Test',
        uuid: new mongoose.Types.ObjectId()
      });
      await User.create({
        name: 'User',
        field: entry._id,
        change: otherEntry._id
      });
      const res = await Test.findOne({ _id: otherEntry._id }).populate({ path: 'test', foreignField: 'change' });
      const other = await Test.findOne({ _id: entry._id }).populate({ path: 'test', foreignField: 'change' });
      assert.equal(res.test.length, 1);
      assert.equal(other.test.length, 0);
      // make sure its not broken
      const response = await Test.findOne({ _id: entry._id }).populate('test');
      assert.equal(response.test.length, 1);
      // =================localField======================
      const localEntry = await Test.create({
        name: 'local test',
        uuid: new mongoose.Types.ObjectId()
      });
      const otherLocalEntry = await Test.create({
        name: 'other local test',
        uuid: new mongoose.Types.ObjectId()
      });

      await User.create({
        name: 'local user',
        field: localEntry.uuid,
        change: otherLocalEntry.uuid
      });

      const localTest = await Test.
        findOne({ _id: localEntry._id }).
        populate({ path: 'test', localField: 'uuid' });
      assert.equal(localTest.test.length, 1);
      const otherLocalTest = await Test.
        findOne({ _id: otherLocalEntry._id }).
        populate({ path: 'test', localField: 'uuid' });
      assert.equal(otherLocalTest.test.length, 0);
      // should be empty because the original local field was _id and we created a doc with uuids
      const check = await Test.
        findOne({ _id: localEntry._id }).
        populate({ path: 'test' });
      assert.equal(check.test.length, 0);
      // ============localFieldAndForeignField============
      const bothEntry = await Test.create({ name: 'Both', uuid: new mongoose.Types.ObjectId() });
      const otherBothEntry = await Test.create({ name: 'Other Both', uuid: new mongoose.Types.ObjectId() });
      await User.create({
        name: 'both user',
        field: bothEntry.uuid,
        change: otherBothEntry.uuid
      });
      const bothTest = await Test.
        findOne({ _id: otherBothEntry._id }).
        populate({ path: 'test', localField: 'uuid', foreignField: 'change' });
      assert.equal(bothTest.test.length, 1);
      const otherBothTest = await Test.
        findOne({ _id: bothEntry._id }).
        populate({ path: 'test', localField: 'uuid', foreignField: 'change' });
      assert.equal(otherBothTest.test.length, 0);
      const normal = await Test.
        findOne({ _id: otherBothEntry._id }).
        populate({ path: 'test' });
      // should be empty because the original local field was _id and we created a doc with uuids
      assert.equal(normal.test.length, 0);
    });
  });
});
