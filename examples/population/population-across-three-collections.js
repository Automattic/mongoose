
'use strict';
const assert = require('assert');
const mongoose = require('../../lib');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;

/**
 * Connect to the db
 */

const dbname = 'testing_populateAdInfinitum_' + require('../../lib/utils').random();
mongoose.connect('127.0.0.1', dbname);
mongoose.connection.on('error', function() {
  console.error('connection error', arguments);
});

/**
 * Schemas
 */

const user = new Schema({
  name: String,
  friends: [{
    type: Schema.ObjectId,
    ref: 'User'
  }]
});
const User = mongoose.model('User', user);

const blogpost = Schema({
  title: String,
  tags: [String],
  author: {
    type: Schema.ObjectId,
    ref: 'User'
  }
});
const BlogPost = mongoose.model('BlogPost', blogpost);

/**
 * example
 */

mongoose.connection.on('open', function() {
  /**
   * Generate data
   */

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

  User.create(users, function(err) {
    assert.ifError(err);

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

    BlogPost.create(blogposts, function(err) {
      assert.ifError(err);

      /**
       * Population
       */

      BlogPost
        .find({ tags: 'fun' })
        .lean()
        .populate('author')
        .exec(function(err, docs) {
          assert.ifError(err);

          /**
         * Populate the populated documents
         */

          const opts = {
            path: 'author.friends',
            select: 'name',
            options: { limit: 2 }
          };

          BlogPost.populate(docs, opts, function(err, docs) {
            assert.ifError(err);
            console.log('populated');
            const s = require('util').inspect(docs, { depth: null, colors: true });
            console.log(s);
            done();
          });
        });
    });
  });
});

function done(err) {
  if (err) console.error(err.stack);
  mongoose.connection.db.dropDatabase(function() {
    mongoose.connection.close();
  });
}
