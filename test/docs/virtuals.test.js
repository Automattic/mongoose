'use strict';

const assert = require('assert');
const start = require('../common');

const mongoose = new start.mongoose.Mongoose();

// This file is in `es-next` because it uses async/await for convenience

describe('Virtuals', function() {
  before(async function() {
    await mongoose.connect(start.uri);
  });

  beforeEach(function() {
    mongoose.deleteModel(/.*/);
  });

  after(async() => {
    await mongoose.disconnect();
  });

  it('basic', async function() {
    const userSchema = mongoose.Schema({
      email: String
    });
    // Create a virtual property `domain` that's computed from `email`.
    userSchema.virtual('domain').get(function() {
      return this.email.slice(this.email.indexOf('@') + 1);
    });
    const User = mongoose.model('User', userSchema);

    const doc = await User.create({ email: 'test@gmail.com' });
    // `domain` is now a property on User documents.
    doc.domain; // 'gmail.com'
    // acquit:ignore:start
    assert.equal(doc.domain, 'gmail.com');
    // acquit:ignore:end
  });

  it('fullName', async function() {
    const userSchema = mongoose.Schema({
      firstName: String,
      lastName: String
    });
    // Create a virtual property `fullName` with a getter and setter.
    userSchema.virtual('fullName').
      get(function() { return `${this.firstName} ${this.lastName}`; }).
      set(function(v) {
        // `v` is the value being set, so use the value to set
        // `firstName` and `lastName`.
        const firstName = v.substring(0, v.indexOf(' '));
        const lastName = v.substring(v.indexOf(' ') + 1);
        this.set({ firstName, lastName });
      });
    const User = mongoose.model('User', userSchema);

    const doc = new User();
    // Vanilla JavaScript assignment triggers the setter
    doc.fullName = 'Jean-Luc Picard';

    doc.fullName; // 'Jean-Luc Picard'
    doc.firstName; // 'Jean-Luc'
    doc.lastName; // 'Picard'
    // acquit:ignore:start
    assert.equal(doc.fullName, 'Jean-Luc Picard');
    assert.equal(doc.firstName, 'Jean-Luc');
    assert.equal(doc.lastName, 'Picard');
    // acquit:ignore:end
  });

  it('toJSON', async function() {
    const opts = { toJSON: { virtuals: true } };
    const userSchema = mongoose.Schema({
      _id: Number,
      email: String
    }, opts);
    // Create a virtual property `domain` that's computed from `email`.
    userSchema.virtual('domain').get(function() {
      return this.email.slice(this.email.indexOf('@') + 1);
    });
    const User = mongoose.model('User', userSchema);

    const doc = new User({ _id: 1, email: 'test@gmail.com' });

    doc.toJSON().domain; // 'gmail.com'
    // {"_id":1,"email":"test@gmail.com","domain":"gmail.com","id":"1"}
    JSON.stringify(doc);

    // To skip applying virtuals, pass `virtuals: false` to `toJSON()`
    doc.toJSON({ virtuals: false }).domain; // undefined
    // acquit:ignore:start
    assert.equal(doc.toJSON().domain, 'gmail.com');
    assert.equal(JSON.stringify(doc),
      '{"_id":1,"email":"test@gmail.com","domain":"gmail.com","id":"1"}');
    assert.equal(doc.toJSON({ virtuals: false }).domain, void 0);
    // acquit:ignore:end
  });

  it('lean', async function() {
    // acquit:ignore:start
    const userSchema = mongoose.Schema({
      email: String
    });
    // Create a virtual property `domain` that's computed from `email`.
    userSchema.virtual('domain').get(function() {
      return this.email.slice(this.email.indexOf('@') + 1);
    });
    const User = mongoose.model('User', userSchema);
    await User.deleteMany({});
    await User.create({ email: 'test@gmail.com' });
    // acquit:ignore:end
    const fullDoc = await User.findOne();
    fullDoc.domain; // 'gmail.com'

    const leanDoc = await User.findOne().lean();
    leanDoc.domain; // undefined
    // acquit:ignore:start
    assert.equal(fullDoc.domain, 'gmail.com');
    assert.equal(leanDoc.domain, void 0);
    // acquit:ignore:end
  });

  it('in query', async function() {
    // acquit:ignore:start
    const userSchema = mongoose.Schema({
      email: String
    });
    // Create a virtual property `domain` that's computed from `email`.
    userSchema.virtual('domain').get(function() {
      return this.email.slice(this.email.indexOf('@') + 1);
    });
    const User = mongoose.model('User', userSchema);
    await User.deleteMany({});
    await User.create({ email: 'test@gmail.com' });
    // acquit:ignore:end
    // Will **not** find any results, because `domain` is not stored in
    // MongoDB.
    const doc = await User.findOne({ domain: 'gmail.com' }, null, { strictQuery: false });
    doc; // undefined
    // acquit:ignore:start
    assert.equal(doc, null);
    // acquit:ignore:end
  });

  it('populate', async function() {
    const userSchema = mongoose.Schema({ _id: Number, email: String });
    const blogPostSchema = mongoose.Schema({
      title: String,
      authorId: Number
    });
    // When you `populate()` the `author` virtual, Mongoose will find the
    // first document in the User model whose `_id` matches this document's
    // `authorId` property.
    blogPostSchema.virtual('author', {
      ref: 'User',
      localField: 'authorId',
      foreignField: '_id',
      justOne: true
    });
    const User = mongoose.model('User', userSchema);
    const BlogPost = mongoose.model('BlogPost', blogPostSchema);

    // acquit:ignore:start
    await BlogPost.deleteMany({});
    await User.deleteMany({});
    // acquit:ignore:end
    await BlogPost.create({ title: 'Introduction to Mongoose', authorId: 1 });
    await User.create({ _id: 1, email: 'test@gmail.com' });

    const doc = await BlogPost.findOne().populate('author');
    doc.author.email; // 'test@gmail.com'
    // acquit:ignore:start
    assert.equal(doc.author.email, 'test@gmail.com');
    // acquit:ignore:end
  });

  it('schema-options fullName', function() {
    const userSchema = mongoose.Schema({
      firstName: String,
      lastName: String
    }, {
      virtuals: {
        // Create a virtual property `fullName` with a getter and setter
        fullName: {
          get() { return `${this.firstName} ${this.lastName}`; },
          set(v) {
            // `v` is the value being set, so use the value to set
            // `firstName` and `lastName`.
            const firstName = v.substring(0, v.indexOf(' '));
            const lastName = v.substring(v.indexOf(' ') + 1);
            this.set({ firstName, lastName });
          }
        }
      }
    });
    const User = mongoose.model('User', userSchema);

    const doc = new User();
    // Vanilla JavaScript assignment triggers the setter
    doc.fullName = 'Jean-Luc Picard';

    doc.fullName; // 'Jean-Luc Picard'
    doc.firstName; // 'Jean-Luc'
    doc.lastName; // 'Picard'
    // acquit:ignore:start
    assert.equal(doc.fullName, 'Jean-Luc Picard');
    assert.equal(doc.firstName, 'Jean-Luc');
    assert.equal(doc.lastName, 'Picard');
    // acquit:ignore:end
  });

  it('schema-options populate', async function() {
    const userSchema = mongoose.Schema({ _id: Number, email: String });
    const blogPostSchema = mongoose.Schema({
      title: String,
      authorId: Number
    }, {
      virtuals: {
        // When you `populate()` the `author` virtual, Mongoose will find the
        // first document in the User model whose `_id` matches this document's
        // `authorId` property.
        author: {
          options: {
            ref: 'User',
            localField: 'authorId',
            foreignField: '_id',
            justOne: true
          }
        }
      }
    });
    const User = mongoose.model('User', userSchema);
    const BlogPost = mongoose.model('BlogPost', blogPostSchema);

    // acquit:ignore:start
    await BlogPost.deleteMany({});
    await User.deleteMany({});
    // acquit:ignore:end
    await BlogPost.create({ title: 'Introduction to Mongoose', authorId: 1 });
    await User.create({ _id: 1, email: 'test@gmail.com' });

    const doc = await BlogPost.findOne().populate('author');
    doc.author.email; // 'test@gmail.com'
    // acquit:ignore:start
    assert.equal(doc.author.email, 'test@gmail.com');
    // acquit:ignore:end
  });
});
