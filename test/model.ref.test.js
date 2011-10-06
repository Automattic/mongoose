
/**
 * Test dependencies.
 */

var start = require('./common')
  , should = require('should')
  , mongoose = start.mongoose
  , random = require('../lib/utils').random
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId
  , DocObjectId = mongoose.Types.ObjectId

/**
 * Setup.
 */

/**
 * User schema.
 */

var User = new Schema({
    name      : String
  , email     : String
  , gender    : { type: String, enum: ['male', 'female'], default: 'male' }
  , age       : { type: Number, default: 21 }
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
            db.close();
            should.strictEqual(err, null);

            post._creator.should.be.an.instanceof(User);
            post._creator.name.should.equal('Guillermo');
            post._creator.email.should.equal('rauchg@gmail.com');
          });
      });
    });
  },

  'test an error in single reference population propagates': function () {
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts + '1')
      , User = db.model('RefUser', users + '1');

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

        var origFind = User.findOne;

        // mock an error
        User.findOne = function () {
          var args = Array.prototype.map.call(arguments, function (arg) {
            return 'function' == typeof arg ? function () {
              arg(new Error('woot'));
            } : arg;
          });
          return origFind.apply(this, args);
        };

        BlogPost
          .findById(post._id)
          .populate('_creator')
          .run(function (err, post) {
            db.close();
            err.should.be.an.instanceof(Error);
            err.message.should.equal('woot');
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
            db.close();
            should.strictEqual(err, null);

            post._creator.should.be.an.instanceof(User);
            post._creator.isInit('name').should.be.false;
            post._creator.email.should.equal('rauchg@gmail.com');
          });
      });
    });
  },

  'populating single oid with partial field selection and filter': function () {
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , User = db.model('RefUser', users);

    User.create({
        name  : 'Banana'
      , email : 'cats@example.com'
    }, function (err, creator) {
      should.strictEqual(err, null);

      BlogPost.create({
          title     : 'woot'
        , _creator  : creator
      }, function (err, post) {
        should.strictEqual(err, null);

        BlogPost
        .findById(post._id)
        .populate('_creator', 'email', { name: 'Peanut' })
        .run(function (err, post) {
          should.strictEqual(err, null);
          should.strictEqual(post._creator, null);

          BlogPost
          .findById(post._id)
          .populate('_creator', 'email', { name: 'Banana' })
          .run(function (err, post) {
            db.close();
            should.strictEqual(err, null);
            post._creator.should.be.an.instanceof(User);
            post._creator.isInit('name').should.be.false;
            post._creator.email.should.equal('cats@example.com');
          });
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
                    db.close();
                    should.strictEqual(err, null);

                    post._creator.name.should.equal('Aaron');
                    post._creator.email.should.equal('aaron@learnboost.com');
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
        .populate('_creator', {'name': 1})
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
              .populate('_creator', {email: 0})
              .run(function (err, post) {
                db.close();
                should.strictEqual(err, null);

                post._creator.name.should.equal('Aaron');
                should.not.exist(post._creator.email);
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
                db.close();
                should.strictEqual(err, null);

                blogposts[0].fans[0].name.should.equal('Fan 1');
                blogposts[0].fans[0].email.should.equal('fan1@learnboost.com');
                blogposts[0].fans[1].name.should.equal('Fan 2');
                blogposts[0].fans[1].email.should.equal('fan2@learnboost.com');

                blogposts[1].fans[0].name.should.equal('Fan 2');
                blogposts[1].fans[0].email.should.equal('fan2@learnboost.com');
                blogposts[1].fans[1].name.should.equal('Fan 1');
                blogposts[1].fans[1].email.should.equal('fan1@learnboost.com');

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

            // mock an error
            var origFind = User.find;
            User.find = function () {
              var args = Array.prototype.map.call(arguments, function (arg) {
                return 'function' == typeof arg ? function () {
                  arg(new Error('woot 2'));
                } : arg;
              });
              return origFind.apply(this, args);
            };

            BlogPost
            .find({ $or: [{ _id: post1._id }, { _id: post2._id }] })
            .populate('fans')
            .run(function (err, blogposts) {
              db.close();
              err.should.be.an.instanceof(Error);
              err.message.should.equal('woot 2');
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
            .populate('fans', 'name')
            .run(function (err, blogposts) {
              db.close();
              should.strictEqual(err, null);

              blogposts[0].fans[0].name.should.equal('Fan 1');
              blogposts[0].fans[0].isInit('email').should.be.false;
              blogposts[0].fans[1].name.should.equal('Fan 2');
              blogposts[0].fans[1].isInit('email').should.be.false;
              should.strictEqual(blogposts[0].fans[1].email, undefined);

              blogposts[1].fans[0].name.should.equal('Fan 2');
              blogposts[1].fans[0].isInit('email').should.be.false;
              blogposts[1].fans[1].name.should.equal('Fan 1');
              blogposts[1].fans[1].isInit('email').should.be.false;
            });
          });
        });
      });
    });
  },

  'test populating an array of references and filtering': function () {
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , User = db.model('RefUser', users);

    User.create({
        name  : 'Fan 1'
      , email : 'fan1@learnboost.com'
    }, function (err, fan1) {
      should.strictEqual(err, null);

      User.create({
          name   : 'Fan 2'
        , email  : 'fan2@learnboost.com'
        , gender : 'female'
      }, function (err, fan2) {
        should.strictEqual(err, null);

        User.create({
            name   : 'Fan 3'
          , email  : 'fan3@learnboost.com'
          , gender : 'female'
        }, function (err, fan3) {
          should.strictEqual(err, null);

          BlogPost.create({
              title : 'Woot'
            , fans  : [fan1, fan2, fan3]
          }, function (err, post1) {
            should.strictEqual(err, null);

            BlogPost.create({
                title : 'Woot'
              , fans  : [fan3, fan2, fan1]
            }, function (err, post2) {
              should.strictEqual(err, null);

              BlogPost
              .find({ _id: { $in: [post1._id, post2._id ] } })
              .populate('fans', '', { gender: 'female', _id: { $in: [fan2] }})
              .run(function (err, blogposts) {
                should.strictEqual(err, null);

                blogposts[0].fans.length.should.equal(1);
                blogposts[0].fans[0].gender.should.equal('female');
                blogposts[0].fans[0].name.should.equal('Fan 2');
                blogposts[0].fans[0].email.should.equal('fan2@learnboost.com');

                blogposts[1].fans.length.should.equal(1);
                blogposts[1].fans[0].gender.should.equal('female');
                blogposts[1].fans[0].name.should.equal('Fan 2');
                blogposts[1].fans[0].email.should.equal('fan2@learnboost.com');

                BlogPost
                .find({ _id: { $in: [post1._id, post2._id ] } })
                .populate('fans', false, { gender: 'female' })
                .run(function (err, blogposts) {
                  db.close();
                  should.strictEqual(err, null);

                  should.strictEqual(blogposts[0].fans.length, 2);
                  blogposts[0].fans[0].gender.should.equal('female');
                  blogposts[0].fans[0].name.should.equal('Fan 2');
                  blogposts[0].fans[0].email.should.equal('fan2@learnboost.com');
                  blogposts[0].fans[1].gender.should.equal('female');
                  blogposts[0].fans[1].name.should.equal('Fan 3');
                  blogposts[0].fans[1].email.should.equal('fan3@learnboost.com');

                  should.strictEqual(blogposts[1].fans.length, 2);
                  blogposts[1].fans[0].gender.should.equal('female');
                  blogposts[1].fans[0].name.should.equal('Fan 3');
                  blogposts[1].fans[0].email.should.equal('fan3@learnboost.com');
                  blogposts[1].fans[1].gender.should.equal('female');
                  blogposts[1].fans[1].name.should.equal('Fan 2');
                  blogposts[1].fans[1].email.should.equal('fan2@learnboost.com');
                });

              });
            });
          });
        });
      });
    });
  },

  'test populating an array of references and multi-filtering': function () {
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , User = db.model('RefUser', users);

    User.create({
        name  : 'Fan 1'
      , email : 'fan1@learnboost.com'
    }, function (err, fan1) {
      should.strictEqual(err, null);

      User.create({
          name   : 'Fan 2'
        , email  : 'fan2@learnboost.com'
        , gender : 'female'
      }, function (err, fan2) {
        should.strictEqual(err, null);

        User.create({
            name   : 'Fan 3'
          , email  : 'fan3@learnboost.com'
          , gender : 'female'
          , age    : 25
        }, function (err, fan3) {
          should.strictEqual(err, null);

          BlogPost.create({
              title : 'Woot'
            , fans  : [fan1, fan2, fan3]
          }, function (err, post1) {
            should.strictEqual(err, null);

            BlogPost.create({
                title : 'Woot'
              , fans  : [fan3, fan2, fan1]
            }, function (err, post2) {
              should.strictEqual(err, null);

              BlogPost
              .find({ _id: { $in: [post1._id, post2._id ] } })
              .populate('fans', undefined, { _id: fan3 })
              .run(function (err, blogposts) {
                should.strictEqual(err, null);

                blogposts[0].fans.length.should.equal(1);
                blogposts[0].fans[0].gender.should.equal('female');
                blogposts[0].fans[0].name.should.equal('Fan 3');
                blogposts[0].fans[0].email.should.equal('fan3@learnboost.com');
                should.equal(blogposts[0].fans[0].age, 25);

                blogposts[1].fans.length.should.equal(1);
                blogposts[1].fans[0].gender.should.equal('female');
                blogposts[1].fans[0].name.should.equal('Fan 3');
                blogposts[1].fans[0].email.should.equal('fan3@learnboost.com');
                should.equal(blogposts[1].fans[0].age, 25);

                BlogPost
                .find({ _id: { $in: [post1._id, post2._id ] } })
                .populate('fans', 0, { gender: 'female' })
                .run(function (err, blogposts) {
                  db.close();
                  should.strictEqual(err, null);

                  blogposts[0].fans.length.should.equal(2);
                  blogposts[0].fans[0].gender.should.equal('female');
                  blogposts[0].fans[0].name.should.equal('Fan 2');
                  blogposts[0].fans[0].email.should.equal('fan2@learnboost.com');
                  blogposts[0].fans[1].gender.should.equal('female');
                  blogposts[0].fans[1].name.should.equal('Fan 3');
                  blogposts[0].fans[1].email.should.equal('fan3@learnboost.com');
                  should.equal(blogposts[0].fans[1].age, 25);

                  blogposts[1].fans.length.should.equal(2);
                  blogposts[1].fans[0].gender.should.equal('female');
                  blogposts[1].fans[0].name.should.equal('Fan 3');
                  blogposts[1].fans[0].email.should.equal('fan3@learnboost.com');
                  should.equal(blogposts[1].fans[0].age, 25);
                  blogposts[1].fans[1].gender.should.equal('female');
                  blogposts[1].fans[1].name.should.equal('Fan 2');
                  blogposts[1].fans[1].email.should.equal('fan2@learnboost.com');
                });
              });
            });
          });
        });
      });
    });
  },

  'test populating an array of references and multi-filtering with field selection': function () {
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , User = db.model('RefUser', users);

    User.create({
        name  : 'Fan 1'
      , email : 'fan1@learnboost.com'
    }, function (err, fan1) {
      should.strictEqual(err, null);

      User.create({
          name   : 'Fan 2'
        , email  : 'fan2@learnboost.com'
        , gender : 'female'
      }, function (err, fan2) {
        should.strictEqual(err, null);

        User.create({
            name   : 'Fan 3'
          , email  : 'fan3@learnboost.com'
          , gender : 'female'
          , age    : 25
        }, function (err, fan3) {
          should.strictEqual(err, null);

          BlogPost.create({
              title : 'Woot'
            , fans  : [fan1, fan2, fan3]
          }, function (err, post1) {
            should.strictEqual(err, null);

            BlogPost.create({
                title : 'Woot'
              , fans  : [fan3, fan2, fan1]
            }, function (err, post2) {
              should.strictEqual(err, null);

              BlogPost
              .find({ _id: { $in: [post1._id, post2._id ] } })
              .populate('fans', 'name email', { gender: 'female', age: 25 })
              .run(function (err, blogposts) {
                db.close();
                should.strictEqual(err, null);

                should.strictEqual(blogposts[0].fans.length, 1);
                blogposts[0].fans[0].name.should.equal('Fan 3');
                blogposts[0].fans[0].email.should.equal('fan3@learnboost.com');
                blogposts[0].fans[0].isInit('email').should.be.true;
                blogposts[0].fans[0].isInit('gender').should.be.false;
                blogposts[0].fans[0].isInit('age').should.be.false;

                should.strictEqual(blogposts[1].fans.length, 1);
                blogposts[1].fans[0].name.should.equal('Fan 3');
                blogposts[1].fans[0].email.should.equal('fan3@learnboost.com');
                blogposts[1].fans[0].isInit('email').should.be.true;
                blogposts[1].fans[0].isInit('gender').should.be.false;
                blogposts[1].fans[0].isInit('age').should.be.false;
              });
            });
          });
        });
      });
    });
  },

  'test populating an array of refs, changing one, and removing one': function () {
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , User = db.model('RefUser', users);

    User.create({
        name  : 'Fan 1'
      , email : 'fan1@learnboost.com'
    }, {
        name  : 'Fan 2'
      , email : 'fan2@learnboost.com'
    }, {
        name  : 'Fan 3'
      , email : 'fan3@learnboost.com'
    }, {
        name  : 'Fan 4'
      , email : 'fan4@learnboost.com'
    }, function (err, fan1, fan2, fan3, fan4) {
      should.strictEqual(err, null);

      BlogPost.create({
          title : 'Woot'
        , fans  : [fan1, fan2]
      }, {
          title : 'Woot'
        , fans  : [fan2, fan1]
      }, function (err, post1, post2) {
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

              post.fans.splice(0, 1);
              post.save(function (err) {
                should.strictEqual(err, null);

                BlogPost
                .findById(post._id)
                .populate('fans')
                .run(function (err, post) {
                  db.close();
                  should.strictEqual(err, null);
                  post.fans.length.should.equal(1);
                  post.fans[0].name.should.equal('Fan 4');
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
              db.close();
              should.strictEqual(err, null);

              post.comments[0]._creator.email.should.equal('user1@learnboost.com');
              post.comments[0]._creator.isInit('name').should.be.false;
              post.comments[1]._creator.email.should.equal('user2@learnboost.com');
              post.comments[1]._creator.isInit('name').should.be.false;
            });
        });
      });
    });
  },

  'test populating subdocuments partially with conditions': function () {
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
            .populate('comments._creator', {'email': 1}, { name: /User/ })
            .run(function (err, post) {
              db.close();
              should.strictEqual(err, null);

              post.comments[0]._creator.email.should.equal('user1@learnboost.com');
              post.comments[0]._creator.isInit('name').should.be.false;
              post.comments[1]._creator.email.should.equal('user2@learnboost.com');
              post.comments[1]._creator.isInit('name').should.be.false;
            });
        });
      });
    });
  },


  // gh-481
  'test populating subdocuments partially with empty array': function (beforeExit) {
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , worked = false;

    var post = BlogPost.create({
        title: 'Woot'
      , comments: [] // EMPTY ARRAY
    }, function (err, post) {
      should.strictEqual(err, null);

      BlogPost
      .findById(post._id)
      .populate('comments._creator', ['email'])
      .run(function (err, returned) {
        db.close();
        worked = true;
        should.strictEqual(err, null);
        returned.id.should.equal(post.id);
      });
    });

    beforeExit(function () {
      worked.should.be.true;
    });
  },

  'populating subdocuments with array including nulls': function () {
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , User = db.model('RefUser', users)

    var user = new User({ name: 'hans zimmer' });
    user.save(function (err) {
      should.strictEqual(err, null);

      var post = BlogPost.create({
          title: 'Woot'
        , fans: []
      }, function (err, post) {
        should.strictEqual(err, null);

        // shove some uncasted vals
        BlogPost.collection.update({ _id: post._id }, { $set: { fans: [null, undefined, user.id, null] } }, function (err) {
          should.strictEqual(err, undefined);

          BlogPost
          .findById(post._id)
          .populate('fans', ['name'])
          .run(function (err, returned) {
            db.close();
            should.strictEqual(err, null);
            returned.id.should.equal(post.id);
            returned.fans.length.should.equal(1);
          });
        })
      });
    });
  },

  'refs should cast to ObjectId from hexstrings': function () {
    var BP = mongoose.model('RefBlogPost', BlogPost);
    var bp = new BP;
    bp._creator = new DocObjectId().toString();
    bp._creator.should.be.an.instanceof(DocObjectId);
    bp.set('_creator', new DocObjectId().toString());
    bp._creator.should.be.an.instanceof(DocObjectId);
  }

};
