
/**
 * Test dependencies.
 */

var start = require('./common')
  , should = require('should')
  , mongoose = start.mongoose
  , random = require('../lib/utils').random
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId

/**
 * Setup.
 */

/**
 * User schema.
 */

var User = new Schema({
    name      : String
  , email     : String
  , blogposts : [{ type: ObjectId, ref: 'RefBlogPost' }]
});

/**
 * Comment subdocument schema.
 */

var Comment = new Schema({
    _creator  : { type: ObjectId, ref: 'RefUser' }
  , content   : String
});

/**
 * Blog post schema.
 */

var BlogPost = new Schema({
    _creator      : { type: ObjectId, ref: 'RefUser' }
  , title         : String
  , comments      : [Comment]
  , fans          : [{ type: ObjectId, ref: 'RefUser' }]
});

var posts = 'blogposts_' + random()
  , users = 'users_' + random();

mongoose.model('RefBlogPost', BlogPost);
mongoose.model('RefUser', User);

/**
 * Tests.
 */

module.exports = {

  'test populating a single reference': function () {
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , User = db.model('RefUser', users)

    User.create({
        name  : 'Guillermo'
      , email : 'rauchg@gmail.com'
    }, function (err, creator) {
      should.strictEqual(err, null);

      BlogPost.create({
          title     : 'woot'
        , _creator  : creator
      }, function (err, post) {
        should.strictEqual(err, null);

        BlogPost
          .findById(post._id)
          .populate('_creator')
          .run(function (err, post) {
            should.strictEqual(err, null);

            post._creator.should.be.an.instanceof(User);
            post._creator.name.should.equal('Guillermo');
            post._creator.email.should.equal('rauchg@gmail.com');
            db.close();
          });
      });
    });
  },

  'test an error in single reference population propagates': function () {
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts + '1')
      , User = db.model('RefUser', users + '1');

    var origFind = User.findById;

    // mock an error
    User.findById = function () {
      var args = Array.prototype.map.call(arguments, function (arg) {
        return 'function' == typeof arg ? function () {
          arg(new Error('woot'));
        } : arg;
      });
      return origFind.apply(this, args);
    };

    User.create({
        name: 'Guillermo'
      , email: 'rauchg@gmail.com'
    }, function (err, creator) {
      should.strictEqual(err, null);

      BlogPost.create({
          title    : 'woot'
        , _creator : creator
      }, function (err, post) {
        should.strictEqual(err, null);

        BlogPost
          .findById(post._id)
          .populate('_creator')
          .run(function (err, post) {
            err.should.be.an.instanceof(Error);
            err.message.should.equal('woot');
            db.close();
          });
      });
    });
  },

  'test populating with partial fields selection': function () {
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , User = db.model('RefUser', users);

    User.create({
        name  : 'Guillermo'
      , email : 'rauchg@gmail.com'
    }, function (err, creator) {
      should.strictEqual(err, null);

      BlogPost.create({
          title     : 'woot'
        , _creator  : creator
      }, function (err, post) {
        should.strictEqual(err, null);

        BlogPost
          .findById(post._id)
          .populate('_creator', ['email'])
          .run(function (err, post) {
            should.strictEqual(err, null);

            post._creator.should.be.an.instanceof(User);
            post.isInit('_name').should.be.false;
            post._creator.email.should.equal('rauchg@gmail.com');
            db.close();
          });
      });
    });
  },

  'test populating and changing a reference': function () {
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , User = db.model('RefUser', users);

    User.create({
        name  : 'Guillermo'
      , email : 'rauchg@gmail.com'
    }, function (err, creator) {
      should.strictEqual(err, null);

      BlogPost.create({
          title     : 'woot'
        , _creator  : creator
      }, function (err, post) {
        should.strictEqual(err, null);

        BlogPost
          .findById(post._id)
          .populate('_creator')
          .run(function (err, post) {
            should.strictEqual(err, null);

            post._creator.should.be.an.instanceof(User);
            post._creator.name.should.equal('Guillermo');
            post._creator.email.should.equal('rauchg@gmail.com');

            User.create({
                name  : 'Aaron'
              , email : 'aaron@learnboost.com'
            }, function (err, newCreator) {
              should.strictEqual(err, null);

              post._creator = newCreator._id;
              post.save(function (err) {
                should.strictEqual(err, null);

                BlogPost
                  .findById(post._id)
                  .populate('_creator')
                  .run(function (err, post) {
                    should.strictEqual(err, null);

                    post._creator.name.should.equal('Aaron');
                    post._creator.email.should.equal('aaron@learnboost.com');
                    db.close();
                  });
              });
            });
          });
      });
    });
  },

  'test populating with partial fields selection and changing ref': function () {
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , User = db.model('RefUser', users);

    User.create({
        name  : 'Guillermo'
      , email : 'rauchg@gmail.com'
    }, function (err, creator) {
      should.strictEqual(err, null);

      BlogPost.create({
          title     : 'woot'
        , _creator  : creator
      }, function (err, post) {
        should.strictEqual(err, null);

        BlogPost
          .findById(post._id)
          .populate('_creator', ['name'])
          .run(function (err, post) {
            should.strictEqual(err, null);

            post._creator.should.be.an.instanceof(User);
            post._creator.name.should.equal('Guillermo');

            User.create({
                name  : 'Aaron'
              , email : 'aaron@learnboost.com'
            }, function (err, newCreator) {
              should.strictEqual(err, null);

              post._creator = newCreator._id;
              post.save(function (err) {
                should.strictEqual(err, null);

                BlogPost
                  .findById(post._id)
                  .populate('_creator')
                  .run(function (err, post) {
                    should.strictEqual(err, null);

                    post._creator.name.should.equal('Aaron');
                    post._creator.email.should.equal('aaron@learnboost.com');
                    db.close();
                  });
              });
            });
          });
      });
    });
  },

  'test populating an array of references and fetching many': function () {
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , User = db.model('RefUser', users);

    User.create({
        name  : 'Fan 1'
      , email : 'fan1@learnboost.com'
    }, function (err, fan1) {
      should.strictEqual(err, null);

      User.create({
          name  : 'Fan 2'
        , email : 'fan2@learnboost.com'
      }, function (err, fan2) {
        should.strictEqual(err, null);

        BlogPost.create({
            title : 'Woot'
          , fans  : [fan1, fan2]
        }, function (err, post1) {
          should.strictEqual(err, null);

          BlogPost.create({
              title : 'Woot'
            , fans  : [fan2, fan1]
          }, function (err, post2) {
            should.strictEqual(err, null);

            BlogPost
              .find({ _id: { $in: [post1._id, post2._id ] } })
              .populate('fans')
              .run(function (err, blogposts) {
                should.strictEqual(err, null);

                blogposts[0].fans[0].name.should.equal('Fan 1');
                blogposts[0].fans[0].email.should.equal('fan1@learnboost.com');
                blogposts[0].fans[1].name.should.equal('Fan 2');
                blogposts[0].fans[1].email.should.equal('fan2@learnboost.com');

                blogposts[1].fans[0].name.should.equal('Fan 2');
                blogposts[1].fans[0].email.should.equal('fan2@learnboost.com');
                blogposts[1].fans[1].name.should.equal('Fan 1');
                blogposts[1].fans[1].email.should.equal('fan1@learnboost.com');

                db.close();
              });
          });
        });
      });
    });
  },

  'test an error in array reference population propagates': function () {
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts + '2')
      , User = db.model('RefUser', users + '2');

    var origFind = User.findById;

    // mock an error
    User.findById = function () {
      var args = Array.prototype.map.call(arguments, function (arg) {
        return 'function' == typeof arg ? function () {
          arg(new Error('woot 2'));
        } : arg;
      });
      return origFind.apply(this, args);
    };

    User.create({
        name  : 'Fan 1'
      , email : 'fan1@learnboost.com'
    }, function (err, fan1) {
      should.strictEqual(err, null);

      User.create({
          name  : 'Fan 2'
        , email : 'fan2@learnboost.com'
      }, function (err, fan2) {
        should.strictEqual(err, null);

        BlogPost.create({
            title : 'Woot'
          , fans  : [fan1, fan2]
        }, function (err, post1) {
          should.strictEqual(err, null);

          BlogPost.create({
              title : 'Woot'
            , fans  : [fan2, fan1]
          }, function (err, post2) {
            should.strictEqual(err, null);

            BlogPost
              .find({ $or: [{ _id: post1._id }, { _id: post2._id }] })
              .populate('fans')
              .run(function (err, blogposts) {
                err.should.be.an.instanceof(Error);
                err.message.should.equal('woot 2');
                db.close();
              });
          });
        });
      });
    });
  },

  'test populating an array of references with fields selection': function () {
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , User = db.model('RefUser', users);

    User.create({
        name  : 'Fan 1'
      , email : 'fan1@learnboost.com'
    }, function (err, fan1) {
      should.strictEqual(err, null);

      User.create({
          name  : 'Fan 2'
        , email : 'fan2@learnboost.com'
      }, function (err, fan2) {
        should.strictEqual(err, null);

        BlogPost.create({
            title : 'Woot'
          , fans  : [fan1, fan2]
        }, function (err, post1) {
          should.strictEqual(err, null);

          BlogPost.create({
              title : 'Woot'
            , fans  : [fan2, fan1]
          }, function (err, post2) {
            should.strictEqual(err, null);

            BlogPost
              .find({ _id: { $in: [post1._id, post2._id ] } })
              .populate('fans', ['name'])
              .run(function (err, blogposts) {
                should.strictEqual(err, null);

                blogposts[0].fans[0].name.should.equal('Fan 1');
                blogposts[0].fans[0].isInit('email').should.be.false;
                blogposts[0].fans[1].name.should.equal('Fan 2');
                blogposts[0].fans[1].isInit('email').should.be.false;

                blogposts[1].fans[0].name.should.equal('Fan 2');
                blogposts[1].fans[0].isInit('email').should.be.false;
                blogposts[1].fans[1].name.should.equal('Fan 1');
                blogposts[1].fans[1].isInit('email').should.be.false;

                db.close();
              });
          });
        });
      });
    });
  },

  'test populating an array of references and changing one': function () {
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , User = db.model('RefUser', users);

    User.create({
        name  : 'Fan 1'
      , email : 'fan1@learnboost.com'
    }, function (err, fan1) {
      should.strictEqual(err, null);

      User.create({
          name  : 'Fan 2'
        , email : 'fan2@learnboost.com'
      }, function (err, fan2) {
        should.strictEqual(err, null);

        User.create({
            name  : 'Fan 3'
          , email : 'fan3@learnboost.com'
        }, function (err, fan3) {
          should.strictEqual(err, null);

          User.create({
              name  : 'Fan 4'
            , email : 'fan4@learnboost.com'
          }, function (err, fan4) {
            should.strictEqual(err, null);

            BlogPost.create({
                title : 'Woot'
              , fans  : [fan1, fan2]
            }, function (err, post1) {
              should.strictEqual(err, null);

              BlogPost.create({
                  title : 'Woot'
                , fans  : [fan2, fan1]
              }, function (err, post2) {
                should.strictEqual(err, null);

                BlogPost
                  .find({ _id: { $in: [post1._id, post2._id ] } })
                  .populate('fans', ['name'])
                  .run(function (err, blogposts) {
                    should.strictEqual(err, null);

                    blogposts[0].fans[0].name.should.equal('Fan 1');
                    blogposts[0].fans[0].isInit('email').should.be.false;
                    blogposts[0].fans[1].name.should.equal('Fan 2');
                    blogposts[0].fans[1].isInit('email').should.be.false;

                    blogposts[1].fans[0].name.should.equal('Fan 2');
                    blogposts[1].fans[0].isInit('email').should.be.false;
                    blogposts[1].fans[1].name.should.equal('Fan 1');
                    blogposts[1].fans[1].isInit('email').should.be.false;

                    blogposts[1].fans = [fan3, fan4];

                    blogposts[1].save(function (err) {
                      should.strictEqual(err, null);

                      BlogPost
                        .findById(blogposts[1]._id, [], { populate: ['fans'] })
                        .run(function (err, post) {
                          should.strictEqual(err, null);

                          post.fans[0].name.should.equal('Fan 3');
                          post.fans[1].name.should.equal('Fan 4');
                          db.close();
                        });
                    });
                  });
              });
            });
          });
        });
      });
    });
  },

  'test populating subdocuments': function () {
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , User = db.model('RefUser', users);

    User.create({ name: 'User 1' }, function (err, user1) {
      should.strictEqual(err, null);

      User.create({ name: 'User 2' }, function (err, user2) {
        should.strictEqual(err, null);

        BlogPost.create({
            title: 'Woot'
          , _creator: user1._id
          , comments: [
                { _creator: user1._id, content: 'Woot woot' }
              , { _creator: user2._id, content: 'Wha wha' }
            ]
        }, function (err, post) {
          should.strictEqual(err, null);

          BlogPost
            .findById(post._id)
            .populate('_creator')
            .populate('comments._creator')
            .run(function (err, post) {
              db.close();
              should.strictEqual(err, null);

              post._creator.name.should.equal('User 1');
              post.comments[0]._creator.name.should.equal('User 1');
              post.comments[1]._creator.name.should.equal('User 2');
            });
        });
      });
    });
  },

  'test populating subdocuments partially': function () {
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , User = db.model('RefUser', users);

    User.create({
        name  : 'User 1'
      , email : 'user1@learnboost.com'
    }, function (err, user1) {
      should.strictEqual(err, null);

      User.create({
          name  : 'User 2'
        , email : 'user2@learnboost.com'
      }, function (err, user2) {
        should.strictEqual(err, null);

        var post = BlogPost.create({
            title: 'Woot'
          , comments: [
                { _creator: user1, content: 'Woot woot' }
              , { _creator: user2, content: 'Wha wha' }
            ]
        }, function (err, post) {
          should.strictEqual(err, null);

          BlogPost
            .findById(post._id)
            .populate('comments._creator', ['email'])
            .run(function (err, post) {
              should.strictEqual(err, null);

              post.comments[0]._creator.email.should.equal('user1@learnboost.com');
              post.comments[0]._creator.isInit('name').should.be.false;
              post.comments[1]._creator.email.should.equal('user2@learnboost.com');
              post.comments[1]._creator.isInit('name').should.be.false;
              db.close();
            });
        });
      });
    });
  }

};
