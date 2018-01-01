
var assert = require('assert');
var mongoose = require('../../lib');
var Schema = mongoose.Schema;
var ObjectId = mongoose.Types.ObjectId;

/**
 * Connect to the db
 */

var dbname = 'testing_populateAdInfinitum_' + require('../../lib/utils').random();
mongoose.connect('localhost', dbname);
mongoose.connection.on('error', function() {
  console.error('connection error', arguments);
});

/**
 * Schemas
 */

var user = new Schema({
  name: String,
  friends: [{
    type: Schema.ObjectId,
    ref: 'User'
  }]
});
var User = mongoose.model('User', user);

var blogpost = Schema({
  title: String,
  tags: [String],
  author: {
    type: Schema.ObjectId,
    ref: 'User'
  }
});
var BlogPost = mongoose.model('BlogPost', blogpost);

/**
 * example
 */

mongoose.connection.on('open', function() {
  /**
   * Generate data
   */

  var userIds = [new ObjectId, new ObjectId, new ObjectId, new ObjectId];
  var users = [];

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

    var blogposts = [];
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
        .find({tags: 'fun'})
        .lean()
        .populate('author')
        .exec(function(err, docs) {
          assert.ifError(err);

          /**
         * Populate the populated documents
         */

          var opts = {
            path: 'author.friends',
            select: 'name',
            options: {limit: 2}
          };

          BlogPost.populate(docs, opts, function(err, docs) {
            assert.ifError(err);
            console.log('populated');
            var s = require('util').inspect(docs, {depth: null, colors: true});
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
