
/**
 * Test dependencies.
 */

var start = require('./common')
  , assert = require('assert')
  , mongoose = start.mongoose
  , utils = require('../lib/utils')
  , random = utils.random
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
    asers   : [{ type: ObjectId, ref: 'RefUser' }]
  , _creator : { type: ObjectId, ref: 'RefUser' }
  , content  : String
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
mongoose.model('RefAlternateUser', User);

/**
 * Tests.
 */

describe('model: populate:', function(){
  it('populating array of object', function(done){
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , User = db.model('RefUser', users);

    User.create({ name: 'User 1' }, function (err, user1) {
      assert.ifError(err);

      User.create({ name: 'User 2' }, function (err, user2) {
        assert.ifError(err);

        BlogPost.create({
          title: 'Woot'
          , _creator: user1._id
          , comments: [
            { _creator: user1._id, content: 'Woot woot' }
            , { _creator: user2._id, content: 'Wha wha' }
          ]
        }, function (err, post) {
          assert.ifError(err);

          assert.doesNotThrow(function(){
            post.populate('comments', function(){});
          });

          done();
        });
      });
    });
  });

  it('populating a single ref', function(done){
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , User = db.model('RefUser', users)

    User.create({
        name  : 'Guillermo'
      , email : 'rauchg@gmail.com'
    }, function (err, creator) {
      assert.ifError(err);

      BlogPost.create({
          title     : 'woot'
        , _creator  : creator
      }, function (err, post) {
        assert.ifError(err);

        BlogPost
        .findById(post._id)
        .populate('_creator')
        .exec(function (err, post) {
          db.close();
          assert.ifError(err);

          assert.ok(post._creator instanceof User);
          assert.equal(post._creator.name, 'Guillermo');
          assert.equal(post._creator.email, 'rauchg@gmail.com');
          done();
        });
      });
    });
  });

  it('an error in single ref population propagates', function(done){
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts + '1')
      , User = db.model('RefUser', users + '1');

    User.create({
        name: 'Guillermo'
      , email: 'rauchg@gmail.com'
    }, function (err, creator) {
      assert.ifError(err);

      BlogPost.create({
          title    : 'woot'
        , _creator : creator
      }, function (err, post) {
        assert.ifError(err);

        var origFind = User.find;

        // mock an error
        User.find = function () {
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
        .exec(function (err, post) {
          db.close();
          assert.ok(err instanceof Error);
          assert.equal('woot', err.message);
          done()
        });
      });
    });
  })

  it('populating with partial fields selection', function(done){
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , User = db.model('RefUser', users);

    User.create({
        name  : 'Guillermo'
      , email : 'rauchg@gmail.com'
    }, function (err, creator) {
      assert.ifError(err);

      BlogPost.create({
          title     : 'woot'
        , _creator  : creator
      }, function (err, post) {
        assert.ifError(err);

        BlogPost
        .findById(post._id)
        .populate('_creator', 'email')
        .exec(function (err, post) {
          db.close();
          assert.ifError(err);

          assert.ok(post._creator instanceof User);
          assert.equal(false, post._creator.isInit('name'));
          assert.equal(post._creator.email,'rauchg@gmail.com');
          done();
        });
      });
    });
  });

  it('population of single oid with partial field selection and filter', function(done){
    var db = start()
      , BlogPost = db.model('RefBlogPost', 'blogposts_' + random())
      , User = db.model('RefUser', 'users_' + random());

    User.create({
        name  : 'Banana'
      , email : 'cats@example.com'
    }, function (err, creator) {
      assert.ifError(err);

      BlogPost.create({
          title     : 'woot'
        , _creator  : creator
      }, function (err, post) {
        assert.ifError(err);

        BlogPost
        .findById(post._id)
        .populate('_creator', 'email', { name: 'Peanut' })
        .exec(function (err, post) {
          assert.ifError(err);
          assert.strictEqual(post._creator, null);

          BlogPost
          .findById(post._id)
          .populate('_creator', 'email', { name: 'Banana' })
          .exec(function (err, post) {
            db.close();
            assert.ifError(err);
            assert.ok(post._creator instanceof User);
            assert.equal(false, post._creator.isInit('name'));
            assert.equal(post._creator.email, 'cats@example.com');
            done();
          });
        });
      });
    });
  })

  it('population and changing a reference', function(done){
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , User = db.model('RefUser', users);

    User.create({
        name  : 'Guillermo'
      , email : 'rauchg@gmail.com'
    }, function (err, creator) {
      assert.ifError(err);

      BlogPost.create({
          title     : 'woot'
        , _creator  : creator
      }, function (err, post) {
        assert.ifError(err);

        BlogPost
        .findById(post._id)
        .populate('_creator')
        .exec(function (err, post) {
          assert.ifError(err);

          assert.ok(post._creator instanceof User);
          assert.equal(post._creator.name,'Guillermo');
          assert.equal(post._creator.email,'rauchg@gmail.com');

          User.create({
              name  : 'Aaron'
            , email : 'aaron.heckmann@gmail.com'
          }, function (err, newCreator) {
            assert.ifError(err);

            post._creator = newCreator._id;
            assert.equal(newCreator._id, String(post._creator));

            post.save(function (err) {
              assert.ifError(err);

              BlogPost
              .findById(post._id)
              .populate('_creator')
              .exec(function (err, post) {
                db.close();
                assert.ifError(err);
                assert.equal(post._creator.name,'Aaron');
                assert.equal(post._creator.email,'aaron.heckmann@gmail.com');
                done();
              });
            });
          });
        });
      });
    });
  })

  it('populating with partial fields selection and changing ref', function(done){
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , User = db.model('RefUser', users);

    User.create({
        name  : 'Guillermo'
      , email : 'rauchg@gmail.com'
    }, function (err, creator) {
      assert.ifError(err);

      BlogPost.create({
          title     : 'woot'
        , _creator  : creator
      }, function (err, post) {
        assert.ifError(err);

        BlogPost
        .findById(post._id)
        .populate('_creator', {'name': 1})
        .exec(function (err, post) {
          assert.ifError(err);

          assert.ok(post._creator instanceof User);
          assert.equal(post._creator.name,'Guillermo');

          User.create({
              name  : 'Aaron'
            , email : 'aaron@learnboost.com'
          }, function (err, newCreator) {
            assert.ifError(err);

            post._creator = newCreator._id;
            post.save(function (err) {
              assert.ifError(err);

              BlogPost
              .findById(post._id)
              .populate('_creator', '-email')
              .exec(function (err, post) {
                db.close();
                assert.ifError(err);

                assert.equal(post._creator.name,'Aaron');
                assert.ok(!post._creator.email);
                done();
              });
            });
          });
        });
      });
    });
  });

  it('populating an array of refs and fetching many', function(done){
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , User = db.model('RefUser', users);

    User.create({
        name  : 'Fan 1'
      , email : 'fan1@learnboost.com'
    }, function (err, fan1) {
      assert.ifError(err);

      User.create({
          name  : 'Fan 2'
        , email : 'fan2@learnboost.com'
      }, function (err, fan2) {
        assert.ifError(err);

        BlogPost.create({
            title : 'Woot'
          , fans  : [fan1, fan2]
        }, function (err, post1) {
          assert.ifError(err);

          BlogPost.create({
              title : 'Woot'
            , fans  : [fan2, fan1]
          }, function (err, post2) {
            assert.ifError(err);

            BlogPost
            .find({ _id: { $in: [post1._id, post2._id ] } })
            .populate('fans')
            .exec(function (err, blogposts) {
              db.close();
              assert.ifError(err);

              assert.equal(blogposts[0].fans[0].name,'Fan 1');
              assert.equal(blogposts[0].fans[0].email,'fan1@learnboost.com');
              assert.equal(blogposts[0].fans[1].name,'Fan 2');
              assert.equal(blogposts[0].fans[1].email,'fan2@learnboost.com');

              assert.equal(blogposts[1].fans[0].name,'Fan 2');
              assert.equal(blogposts[1].fans[0].email,'fan2@learnboost.com');
              assert.equal(blogposts[1].fans[1].name,'Fan 1');
              assert.equal(blogposts[1].fans[1].email,'fan1@learnboost.com');
              done();
            });
          });
        });
      });
    });
  })

  it('an error in array reference population propagates', function(done){
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts + '2')
      , User = db.model('RefUser', users + '2');

    User.create({
        name  : 'Fan 1'
      , email : 'fan1@learnboost.com'
    }, function (err, fan1) {
      assert.ifError(err);

      User.create({
          name  : 'Fan 2'
        , email : 'fan2@learnboost.com'
      }, function (err, fan2) {
        assert.ifError(err);

        BlogPost.create({
            title : 'Woot'
          , fans  : [fan1, fan2]
        }, function (err, post1) {
          assert.ifError(err);

          BlogPost.create({
              title : 'Woot'
            , fans  : [fan2, fan1]
          }, function (err, post2) {
            assert.ifError(err);

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
            .exec(function (err, blogposts) {
              db.close();

              assert.ok(err instanceof Error);
              assert.equal(err.message,'woot 2');
              done();
            });
          });
        });
      });
    });
  })

  it('populating an array of references with fields selection', function(done){
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , User = db.model('RefUser', users);

    User.create({
        name  : 'Fan 1'
      , email : 'fan1@learnboost.com'
    }, function (err, fan1) {
      assert.ifError(err);

      User.create({
          name  : 'Fan 2'
        , email : 'fan2@learnboost.com'
      }, function (err, fan2) {
        assert.ifError(err);

        BlogPost.create({
            title : 'Woot'
          , fans  : [fan1, fan2]
        }, function (err, post1) {
          assert.ifError(err);

          BlogPost.create({
              title : 'Woot'
            , fans  : [fan2, fan1]
          }, function (err, post2) {
            assert.ifError(err);

            BlogPost
            .find({ _id: { $in: [post1._id, post2._id ] } })
            .populate('fans', 'name')
            .exec(function (err, blogposts) {
              db.close();
              assert.ifError(err);

              assert.equal(blogposts[0].fans[0].name,'Fan 1');
              assert.equal(blogposts[0].fans[0].isInit('email'), false);
              assert.equal(blogposts[0].fans[1].name, 'Fan 2');
              assert.equal(blogposts[0].fans[1].isInit('email'), false);
              assert.strictEqual(blogposts[0].fans[1].email, undefined);

              assert.equal(blogposts[1].fans[0].name, 'Fan 2');
              assert.equal(blogposts[1].fans[0].isInit('email'), false);
              assert.equal(blogposts[1].fans[1].name, 'Fan 1');
              assert.equal(blogposts[1].fans[1].isInit('email'), false);

              done();
            });
          });
        });
      });
    });
  })

  it('populating an array of references and filtering', function(done){
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , User = db.model('RefUser', users);

    User.create({
        name  : 'Fan 1'
      , email : 'fan1@learnboost.com'
    }, function (err, fan1) {
      assert.ifError(err);

      User.create({
          name   : 'Fan 2'
        , email  : 'fan2@learnboost.com'
        , gender : 'female'
      }, function (err, fan2) {
        assert.ifError(err);

        User.create({
            name   : 'Fan 3'
          , email  : 'fan3@learnboost.com'
          , gender : 'female'
        }, function (err, fan3) {
          assert.ifError(err);

          BlogPost.create({
              title : 'Woot'
            , fans  : [fan1, fan2, fan3]
          }, function (err, post1) {
            assert.ifError(err);

            BlogPost.create({
                title : 'Woot'
              , fans  : [fan3, fan2, fan1]
            }, function (err, post2) {
              assert.ifError(err);

              BlogPost
              .find({ _id: { $in: [post1._id, post2._id ] } })
              .populate('fans', '', { gender: 'female', _id: { $in: [fan2] }})
              .exec(function (err, blogposts) {
                assert.ifError(err);

                assert.equal(blogposts[0].fans.length, 1);
                assert.equal(blogposts[0].fans[0].gender, 'female');
                assert.equal(blogposts[0].fans[0].name,'Fan 2');
                assert.equal(blogposts[0].fans[0].email,'fan2@learnboost.com');

                assert.equal(blogposts[1].fans.length, 1);
                assert.equal(blogposts[1].fans[0].gender,'female');
                assert.equal(blogposts[1].fans[0].name,'Fan 2');
                assert.equal(blogposts[1].fans[0].email,'fan2@learnboost.com');

                BlogPost
                .find({ _id: { $in: [post1._id, post2._id ] } })
                .populate('fans', false, { gender: 'female' })
                .exec(function (err, blogposts) {
                  db.close();
                  assert.ifError(err);

                  assert.strictEqual(blogposts[0].fans.length, 2);
                  assert.equal(blogposts[0].fans[0].gender,'female');
                  assert.equal(blogposts[0].fans[0].name,'Fan 2');
                  assert.equal(blogposts[0].fans[0].email,'fan2@learnboost.com');
                  assert.equal(blogposts[0].fans[1].gender,'female');
                  assert.equal(blogposts[0].fans[1].name,'Fan 3');
                  assert.equal(blogposts[0].fans[1].email,'fan3@learnboost.com');

                  assert.strictEqual(blogposts[1].fans.length, 2);
                  assert.equal(blogposts[1].fans[0].gender,'female');
                  assert.equal(blogposts[1].fans[0].name,'Fan 3');
                  assert.equal(blogposts[1].fans[0].email,'fan3@learnboost.com');
                  assert.equal(blogposts[1].fans[1].gender,'female');
                  assert.equal(blogposts[1].fans[1].name,'Fan 2');
                  assert.equal(blogposts[1].fans[1].email,'fan2@learnboost.com');

                  done();
                });

              });
            });
          });
        });
      });
    });
  });

  it('populating an array of references and multi-filtering', function(done){
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , User = db.model('RefUser', users);

    User.create({
        name  : 'Fan 1'
      , email : 'fan1@learnboost.com'
    }, function (err, fan1) {
      assert.ifError(err);

      User.create({
          name   : 'Fan 2'
        , email  : 'fan2@learnboost.com'
        , gender : 'female'
      }, function (err, fan2) {
        assert.ifError(err);

        User.create({
            name   : 'Fan 3'
          , email  : 'fan3@learnboost.com'
          , gender : 'female'
          , age    : 25
        }, function (err, fan3) {
          assert.ifError(err);

          BlogPost.create({
              title : 'Woot'
            , fans  : [fan1, fan2, fan3]
          }, function (err, post1) {
            assert.ifError(err);

            BlogPost.create({
                title : 'Woot'
              , fans  : [fan3, fan2, fan1]
            }, function (err, post2) {
              assert.ifError(err);

              BlogPost
              .find({ _id: { $in: [post1._id, post2._id ] } })
              .populate('fans', undefined, { _id: fan3 })
              .exec(function (err, blogposts) {
                assert.ifError(err);

                assert.equal(blogposts[0].fans.length, 1);
                assert.equal(blogposts[0].fans[0].gender,'female');
                assert.equal(blogposts[0].fans[0].name,'Fan 3');
                assert.equal(blogposts[0].fans[0].email,'fan3@learnboost.com');
                assert.equal(blogposts[0].fans[0].age, 25);

                assert.equal(blogposts[1].fans.length,1);
                assert.equal(blogposts[1].fans[0].gender,'female');
                assert.equal(blogposts[1].fans[0].name,'Fan 3');
                assert.equal(blogposts[1].fans[0].email,'fan3@learnboost.com');
                assert.equal(blogposts[1].fans[0].age, 25);

                BlogPost
                .find({ _id: { $in: [post1._id, post2._id ] } })
                .populate('fans', 0, { gender: 'female' })
                .exec(function (err, blogposts) {
                  db.close();
                  assert.ifError(err);

                  assert.equal(blogposts[0].fans.length, 2);
                  assert.equal(blogposts[0].fans[0].gender,'female');
                  assert.equal(blogposts[0].fans[0].name,'Fan 2');
                  assert.equal(blogposts[0].fans[0].email, 'fan2@learnboost.com');
                  assert.equal(blogposts[0].fans[1].gender, 'female');
                  assert.equal(blogposts[0].fans[1].name, 'Fan 3');
                  assert.equal(blogposts[0].fans[1].email, 'fan3@learnboost.com');
                  assert.equal(blogposts[0].fans[1].age, 25);

                  assert.equal(blogposts[1].fans.length, 2);
                  assert.equal(blogposts[1].fans[0].gender, 'female');
                  assert.equal(blogposts[1].fans[0].name, 'Fan 3');
                  assert.equal(blogposts[1].fans[0].email, 'fan3@learnboost.com');
                  assert.equal(blogposts[1].fans[0].age, 25);
                  assert.equal(blogposts[1].fans[1].gender, 'female');
                  assert.equal(blogposts[1].fans[1].name, 'Fan 2');
                  assert.equal(blogposts[1].fans[1].email, 'fan2@learnboost.com');

                  done();
                });
              });
            });
          });
        });
      });
    });
  });

  it('populating an array of references and multi-filtering with field selection', function(done){
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , User = db.model('RefUser', users);

    User.create({
        name  : 'Fan 1'
      , email : 'fan1@learnboost.com'
    }, function (err, fan1) {
      assert.ifError(err);

      User.create({
          name   : 'Fan 2'
        , email  : 'fan2@learnboost.com'
        , gender : 'female'
      }, function (err, fan2) {
        assert.ifError(err);

        User.create({
            name   : 'Fan 3'
          , email  : 'fan3@learnboost.com'
          , gender : 'female'
          , age    : 25
        }, function (err, fan3) {
          assert.ifError(err);

          BlogPost.create({
              title : 'Woot'
            , fans  : [fan1, fan2, fan3]
          }, function (err, post1) {
            assert.ifError(err);

            BlogPost.create({
                title : 'Woot'
              , fans  : [fan3, fan2, fan1]
            }, function (err, post2) {
              assert.ifError(err);

              BlogPost
              .find({ _id: { $in: [post1._id, post2._id ] } })
              .populate('fans', 'name email', { gender: 'female', age: 25 })
              .exec(function (err, blogposts) {
                db.close();
                assert.ifError(err);

                assert.strictEqual(blogposts[0].fans.length, 1);
                assert.equal(blogposts[0].fans[0].name,'Fan 3');
                assert.equal(blogposts[0].fans[0].email,'fan3@learnboost.com');
                assert.equal(blogposts[0].fans[0].isInit('email'), true)
                assert.equal(blogposts[0].fans[0].isInit('gender'), false);
                assert.equal(blogposts[0].fans[0].isInit('age'), false);

                assert.strictEqual(blogposts[1].fans.length, 1);
                assert.equal(blogposts[1].fans[0].name,'Fan 3');
                assert.equal(blogposts[1].fans[0].email,'fan3@learnboost.com');
                assert.equal(blogposts[1].fans[0].isInit('email'), true);
                assert.equal(blogposts[1].fans[0].isInit('gender'), false);
                assert.equal(blogposts[1].fans[0].isInit('age'), false)

                done()
              });
            });
          });
        });
      });
    });
  })

  it('populating an array of refs changing one and removing one', function(done){
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
      assert.ifError(err);

      BlogPost.create({
          title : 'Woot'
        , fans  : [fan1, fan2]
      }, {
          title : 'Woot'
        , fans  : [fan2, fan1]
      }, function (err, post1, post2) {
        assert.ifError(err);

        BlogPost
        .find({ _id: { $in: [post1._id, post2._id ] } })
        .populate('fans', 'name')
        .exec(function (err, blogposts) {
          assert.ifError(err);

          assert.equal(blogposts[0].fans[0].name,'Fan 1');
          assert.equal(blogposts[0].fans[0].isInit('email'), false);
          assert.equal(blogposts[0].fans[1].name,'Fan 2');
          assert.equal(blogposts[0].fans[1].isInit('email'), false);

          assert.equal(blogposts[1].fans[0].name,'Fan 2');
          assert.equal(blogposts[1].fans[0].isInit('email'), false);
          assert.equal(blogposts[1].fans[1].name,'Fan 1');
          assert.equal(blogposts[1].fans[1].isInit('email'),false);

          blogposts[1].fans = [fan3, fan4];

          blogposts[1].save(function (err) {
            assert.ifError(err);

            BlogPost
            .findById(blogposts[1]._id, '', { populate: ['fans'] })
            .exec(function (err, post) {
              assert.ifError(err);

              assert.equal(post.fans[0].name,'Fan 3');
              assert.equal(post.fans[1].name,'Fan 4');

              post.fans.splice(0, 1);
              post.save(function (err) {
                assert.ifError(err);

                BlogPost
                .findById(post._id)
                .populate('fans')
                .exec(function (err, post) {
                  db.close();
                  assert.ifError(err);
                  assert.equal(post.fans.length,1);
                  assert.equal(post.fans[0].name,'Fan 4');
                  done();
                });
              });
            });
          });
        });
      });
    });
  })

  describe('populating sub docs', function(){
    it('works with findById', function(done){
      var db = start()
        , BlogPost = db.model('RefBlogPost', posts)
        , User = db.model('RefUser', users);

      User.create({ name: 'User 1' }, function (err, user1) {
        assert.ifError(err);

        User.create({ name: 'User 2' }, function (err, user2) {
          assert.ifError(err);

          BlogPost.create({
              title: 'Woot'
            , _creator: user1._id
            , comments: [
                  { _creator: user1._id, content: 'Woot woot' }
                , { _creator: user2._id, content: 'Wha wha' }
              ]
          }, function (err, post) {
            assert.ifError(err);

            BlogPost
            .findById(post._id)
            .populate('_creator')
            .populate('comments._creator')
            .exec(function (err, post) {
              db.close();
              assert.ifError(err);

              assert.equal(post._creator.name,'User 1');
              assert.equal(post.comments[0]._creator.name,'User 1');
              assert.equal(post.comments[1]._creator.name,'User 2');
              done();
            });
          });
        });
      });
    })

    it('works when first doc returned has empty array for populated path (gh-1055)', function(done){
      var db = start()
        , BlogPost = db.model('RefBlogPost', posts)
        , User = db.model('RefUser', users);

      User.create({ name: 'gh-1055-1' }, { name: 'gh-1055-2' }, function (err, user1, user2) {
        assert.ifError(err);

        BlogPost.create({
            title: 'gh-1055 post1'
          , _creator: user1._id
          , comments: []
        },{
            title: 'gh-1055 post2'
          , _creator: user1._id
          , comments: [
                { _creator: user1._id, content: 'Woot woot', asers: [] }
              , { _creator: user2._id, content: 'Wha wha', asers: [user1, user2] }
            ]
        }, function (err, post1, post2) {
          assert.ifError(err);

          var ran = false;
          BlogPost
          .find({ title: /gh-1055/ })
          .sort('title')
          .select('comments')
          .populate('comments._creator')
          .populate('comments.asers')
          .exec(function (err, posts) {
            assert.equal(false, ran);
            ran = true;
            assert.ifError(err);
            assert.ok(posts.length);
            assert.ok(posts[1].comments[0]._creator);
            assert.equal('gh-1055-1', posts[1].comments[0]._creator.name);
            done();
          });
        });
      });
    })
  })

  it('clears cache when array has been re-assigned (gh-2176)', function(done) {
    var db = start();
    var BlogPost = db.model('RefBlogPost', posts, 'gh-2176-1');
    var User = db.model('RefUser', users, 'gh-2176-2');

    User.create({ name: 'aaron' }, { name: 'val' }, function (err, user1, user2) {
      assert.ifError(err);

      BlogPost.create(
        {
          title: 'gh-2176',
          _creator: user1._id,
          comments: []
        },
        function (err, post1) {
          assert.ifError(err);
          BlogPost.
            find({ title: 'gh-2176' }).
            populate('_creator').
            exec(function(error, posts) {
              assert.ifError(error);
              assert.equal(1, posts.length);
              assert.equal('aaron', posts[0]._creator.name);
              posts[0]._creator = user2;
              assert.equal('val', posts[0]._creator.name);
              posts[0].save(function(error, post) {
                assert.ifError(error);
                assert.equal('val', post._creator.name);
                posts[0].populate('_creator', function(error, doc) {
                  assert.ifError(error);
                  assert.equal('val', doc._creator.name);
                  done();
                });
              });
            });
        });
    });
  });

  it('populating subdocuments partially', function(done){
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , User = db.model('RefUser', users);

    User.create({
        name  : 'User 1'
      , email : 'user1@learnboost.com'
    }, function (err, user1) {
      assert.ifError(err);

      User.create({
          name  : 'User 2'
        , email : 'user2@learnboost.com'
      }, function (err, user2) {
        assert.ifError(err);

        var post = BlogPost.create({
            title: 'Woot'
          , comments: [
                { _creator: user1, content: 'Woot woot' }
              , { _creator: user2, content: 'Wha wha' }
            ]
        }, function (err, post) {
          assert.ifError(err);

          BlogPost
          .findById(post._id)
          .populate('comments._creator', 'email')
          .exec(function (err, post) {
            db.close();
            assert.ifError(err);

            assert.equal(post.comments[0]._creator.email,'user1@learnboost.com');
            assert.equal(post.comments[0]._creator.isInit('name'), false);
            assert.equal(post.comments[1]._creator.email,'user2@learnboost.com');
            assert.equal(post.comments[1]._creator.isInit('name'), false);

            done();
          });
        });
      });
    });
  })

  it('populating subdocuments partially with conditions', function(done){
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , User = db.model('RefUser', users);

    User.create({
        name  : 'User 1'
      , email : 'user1@learnboost.com'
    }, function (err, user1) {
      assert.ifError(err);

      User.create({
          name  : 'User 2'
        , email : 'user2@learnboost.com'
      }, function (err, user2) {
        assert.ifError(err);

        var post = BlogPost.create({
            title: 'Woot'
          , comments: [
                { _creator: user1, content: 'Woot woot' }
              , { _creator: user2, content: 'Wha wha' }
            ]
        }, function (err, post) {
          assert.ifError(err);

          BlogPost
          .findById(post._id)
          .populate('comments._creator', {'email': 1}, { name: /User/ })
          .exec(function (err, post) {
            db.close();
            assert.ifError(err);

            assert.equal(post.comments[0]._creator.email,'user1@learnboost.com');
            assert.equal(post.comments[0]._creator.isInit('name'),false);
            assert.equal(post.comments[1]._creator.email,'user2@learnboost.com');
            assert.equal(post.comments[1]._creator.isInit('name'), false);

            done()
          });
        });
      });
    });
  })

  it('populating subdocs with invalid/missing subproperties', function(done){
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , User = db.model('RefUser', users);

    User.create({
        name  : 'T-100'
      , email : 'terminator100@learnboost.com'
    }, function (err, user1) {
      assert.ifError(err);

      User.create({
          name  : 'T-1000'
        , email : 'terminator1000@learnboost.com'
      }, function (err, user2) {
        assert.ifError(err);

        var post = BlogPost.create({
            title: 'Woot'
          , comments: [
                { _creator: null, content: 'Woot woot' }
              , { _creator: user2, content: 'Wha wha' }
            ]
        }, function (err, post) {
          assert.ifError(err);

          // non-existant subprop
          BlogPost
          .findById(post._id)
          .populate('comments._idontexist', 'email')
          .exec(function (err) {
            assert.ifError(err);

            // add a non-schema property to the document.
            BlogPost.collection.update(
                { _id: post._id }
              , { $set: { 'comments.0._idontexist': user2._id }}, function (err) {
              assert.ifError(err);

              // allow population of unknown property by passing model name.
              // helpful when populating mapReduce results too.
              BlogPost
              .findById(post._id)
              .populate('comments._idontexist', 'email', 'RefUser')
              .exec(function (err, post) {
                assert.ifError(err);
                assert.ok(post);
                assert.equal(post.comments.length, 2);
                assert.ok(post.comments[0].get('_idontexist'));
                assert.equal(String(post.comments[0].get('_idontexist')._id), user2.id);
                assert.equal(post.comments[0].get('_idontexist').email, 'terminator1000@learnboost.com');
                assert.equal(post.comments[0].get('_idontexist').isInit('name'), false);
                assert.strictEqual(post.comments[0]._creator, null);
                assert.equal(post.comments[1]._creator.toString(),user2.id);

                // subprop is null in a doc
                BlogPost
                .findById(post._id)
                .populate('comments._creator', 'email')
                .exec(function (err, post) {
                  db.close();
                  assert.ifError(err);

                  assert.ok(post.comments);
                  assert.equal(post.comments.length,2);
                  assert.strictEqual(post.comments[0]._creator, null);
                  assert.strictEqual(post.comments[0].content, 'Woot woot');
                  assert.equal(post.comments[1]._creator.email,'terminator1000@learnboost.com');
                  assert.equal(post.comments[1]._creator.isInit('name'), false);
                  assert.equal(post.comments[1].content,'Wha wha');

                  done();
                });
              });
            })
          });
        });
      });
    });
  });

  it('properly handles limit per document (gh-2151)', function(done) {
    var db = start();
    var ObjectId = mongoose.Types.ObjectId;

    var user = new Schema({
      name: String,
      friends: [{
        type: Schema.ObjectId,
        ref: 'gh-2151-1'
      }]
    });
    var User = db.model('gh-2151-1', user, 'gh-2151-1');

    var blogpost = Schema({
      title: String,
      tags: [String],
      author: {
        type: Schema.ObjectId,
        ref: 'gh-2151-1'
      }
    })
    var BlogPost = db.model('gh-2151-2', blogpost, 'gh-2151-2');

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

    User.create(users, function(err, docs) {
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

      BlogPost.create(blogposts, function(err, docs) {
        assert.ifError(err);

        BlogPost.
          find({ tags: 'fun' }).
          lean().
          populate('author').
          exec(function(err, docs) {
            assert.ifError(err);
            var opts = {
              path: 'author.friends',
              select: 'name',
              options: { limit: 1 }
            };

            BlogPost.populate(docs, opts, function(err, docs) {
              assert.ifError(err);
              assert.equal(2, docs.length);
              assert.equal(1, docs[0].author.friends.length);
              assert.equal(1, docs[1].author.friends.length);
              done();
            })
          });
      });
    });
  });

  it('populating subdocuments partially with empty array (gh-481)', function(done){
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , worked = false;

    var post = BlogPost.create({
        title: 'Woot'
      , comments: [] // EMPTY ARRAY
    }, function (err, post) {
      assert.ifError(err);

      BlogPost
      .findById(post._id)
      .populate('comments._creator', 'email')
      .exec(function (err, returned) {
        db.close();
        assert.ifError(err);
        assert.equal(returned.id,post.id);
        done();
      });
    });
  });

  it('populating subdocuments partially with null array', function(done){
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , worked = false;

    var post = BlogPost.create({
        title: 'Woot'
      , comments: null
    }, function (err, post) {
      assert.ifError(err);

      BlogPost
      .findById(post._id)
      .populate('comments._creator')
      .exec(function (err, returned) {
        db.close();
        assert.ifError(err);
        assert.equal(returned.id, post.id);
        done();
      });
    });
  });

  it('populating subdocuments with array including nulls', function(done){
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , User = db.model('RefUser', users)

    var user = new User({ name: 'hans zimmer' });
    user.save(function (err) {
      assert.ifError(err);

      var post = BlogPost.create({
          title: 'Woot'
        , fans: []
      }, function (err, post) {
        assert.ifError(err);

        // shove some uncasted vals
        BlogPost.collection.update({ _id: post._id }, { $set: { fans: [null, undefined, user.id, null] } }, function (err) {
          assert.ifError(err);

          BlogPost
          .findById(post._id)
          .populate('fans', 'name')
          .exec(function (err, returned) {
            db.close();
            assert.ifError(err);
            assert.equal(returned.id,post.id);
            assert.equal(returned.fans.length, 1);
            done();
          });
        })
      });
    });
  })

  it('populating more than one array at a time', function(done){
    var db = start()
      , User = db.model('RefUser', users)
      , M = db.model('PopMultiSubDocs', new Schema({
            users: [{ type: ObjectId, ref: 'RefUser' }]
          , fans:  [{ type: ObjectId, ref: 'RefUser' }]
          , comments: [Comment]
        }))

    User.create({
        email : 'fan1@learnboost.com'
    }, {
        name   : 'Fan 2'
      , email  : 'fan2@learnboost.com'
      , gender : 'female'
    }, {
       name: 'Fan 3'
    }, function (err, fan1, fan2, fan3) {
      assert.ifError(err);

      M.create({
          users: [fan3]
        , fans: [fan1]
        , comments: [
              { _creator: fan1, content: 'bejeah!' }
            , { _creator: fan2, content: 'chickfila' }
          ]
      }, {
          users: [fan1]
        , fans: [fan2]
        , comments: [
              { _creator: fan3, content: 'hello' }
            , { _creator: fan1, content: 'world' }
          ]
      }, function (err, post1, post2) {
        assert.ifError(err);

        M.where('_id').in([post1, post2])
        .populate('fans', 'name', { gender: 'female' })
        .populate('users', 'name', { gender: 'male' })
        .populate('comments._creator', 'email', { name: null })
        .exec(function (err, posts) {
          db.close();
          assert.ifError(err);

          assert.ok(posts);
          assert.equal(posts.length,2);
          var p1 = posts[0];
          var p2 = posts[1];
          assert.strictEqual(p1.fans.length, 0);
          assert.strictEqual(p2.fans.length, 1);
          assert.equal(p2.fans[0].name,'Fan 2');
          assert.equal(p2.fans[0].isInit('email'), false);
          assert.equal(p2.fans[0].isInit('gender'), false);
          assert.equal(p1.comments.length,2);
          assert.equal(p2.comments.length,2);
          assert.ok(p1.comments[0]._creator.email);
          assert.ok(!p2.comments[0]._creator);
          assert.equal(p1.comments[0]._creator.email,'fan1@learnboost.com');
          assert.equal(p2.comments[1]._creator.email,'fan1@learnboost.com');
          assert.equal(p1.comments[0]._creator.isInit('name'), false);
          assert.equal(p2.comments[1]._creator.isInit('name'), false);
          assert.equal(p1.comments[0].content,'bejeah!');
          assert.equal(p2.comments[1].content,'world');
          assert.ok(!p1.comments[1]._creator);
          assert.ok(!p2.comments[0]._creator);
          assert.equal(p1.comments[1].content,'chickfila');
          assert.equal(p2.comments[0].content,'hello');

          done();
        });
      });
    });
  })

  it('populating multiple children of a sub-array at a time', function(done){
    var db = start()
      , User = db.model('RefUser', users)
      , BlogPost = db.model('RefBlogPost', posts)
      , Inner = new Schema({
            user: { type: ObjectId, ref: 'RefUser' }
          , post: { type: ObjectId, ref: 'RefBlogPost' }
        })
      , I = db.model('PopMultiChildrenOfSubDocInner', Inner)

    var M = db.model('PopMultiChildrenOfSubDoc', new Schema({
            kids: [Inner]
        }))

    User.create({
        name   : 'Fan 1'
      , email  : 'fan1@learnboost.com'
      , gender : 'male'
    }, {
        name   : 'Fan 2'
      , email  : 'fan2@learnboost.com'
      , gender : 'female'
    }, function (err, fan1, fan2) {
      assert.ifError(err);

      BlogPost.create({
          title     : 'woot'
      }, {
          title     : 'yay'
      }, function (err, post1, post2) {
        assert.ifError(err);
        M.create({
          kids: [
              { user: fan1, post: post1, y: 5 }
            , { user: fan2, post: post2, y: 8 }
          ]
        , x: 4
        }, function (err, m1) {
          assert.ifError(err);

          M.findById(m1)
          .populate('kids.user', "name")
          .populate('kids.post', "title", { title: "woot" })
          .exec(function (err, o) {
            db.close();
            assert.ifError(err);
            assert.strictEqual(o.kids.length, 2);
            var k1 = o.kids[0];
            var k2 = o.kids[1];
            assert.strictEqual(true, !k2.post);
            assert.strictEqual(k1.user.name, "Fan 1");
            assert.strictEqual(k1.user.email, undefined);
            assert.strictEqual(k1.post.title, "woot");
            assert.strictEqual(k2.user.name, "Fan 2");

            done();
          });
        });
      });
    });
  })

  it('passing sort options to the populate method', function(done){
    var db = start()
      , P = db.model('RefBlogPost', posts)
      , User = db.model('RefUser', users);

    User.create(
      { name: 'aaron', age: 10 },
      { name: 'fan2', age: 8 },
      { name: 'someone else', age: 3 },
      { name: 'val', age: 3 },
      function (err, fan1, fan2, fan3, fan4) {
        assert.ifError(err);

        P.create({ fans: [fan4, fan2, fan3, fan1] }, function (err, post) {
          assert.ifError(err);

          P.findById(post)
          .populate('fans', null, null, { sort: { age: 1, name: 1 } })
          .exec(function (err, post) {
            assert.ifError(err);

            assert.equal(post.fans.length, 4);
            assert.equal(post.fans[0].name, 'someone else');
            assert.equal(post.fans[1].name, 'val');
            assert.equal(post.fans[2].name, 'fan2');
            assert.equal(post.fans[3].name, 'aaron');

            P.findById(post)
            .populate('fans', 'name', null, { sort: {'name':-1} })
            .exec(function (err, post) {
              assert.ifError(err);

              assert.equal(post.fans.length, 4);
              assert.equal(post.fans[3].name,'aaron');
              assert.strictEqual(undefined, post.fans[3].age);
              assert.equal(post.fans[2].name,'fan2');
              assert.strictEqual(undefined, post.fans[2].age);
              assert.equal(post.fans[1].name,'someone else');
              assert.strictEqual(undefined, post.fans[1].age);
              assert.equal(post.fans[0].name, 'val');
              assert.strictEqual(undefined, post.fans[0].age);

              P.findById(post)
              .populate('fans', 'age', { age: { $gt: 3 }}, { sort: {'name': 'desc'} })
              .exec(function (err, post) {
                db.close();
                assert.ifError(err);

                assert.equal(post.fans.length,2);
                assert.equal(post.fans[1].age.valueOf(),10);
                assert.equal(post.fans[0].age.valueOf(),8);

                done();
              });
            });
          });
        });
      });
  });

  it('limit should apply to each returned doc, not in aggregate (gh-1490)', function(done){
    var db = start();
    var sB = new Schema({
        name: String
    });
    var name = 'b' + random();
    var sJ = new Schema({
        b    : [{ type: Schema.Types.ObjectId, ref: name }]
    });
    var B = db.model(name, sB);
    var J = db.model('j' + random(), sJ);

    var b1 = new B({ name : 'thing1'});
    var b2 = new B({ name : 'thing2'});
    var b3 = new B({ name : 'thing3'});
    var b4 = new B({ name : 'thing4'});
    var b5 = new B({ name : 'thing5'});

    var j1 = new J({ b : [b1.id, b2.id, b5.id]});
    var j2 = new J({ b : [b3.id, b4.id, b5.id]});

    var count = 7;

    b1.save(cb);
    b2.save(cb);
    b3.save(cb);
    b4.save(cb);
    b5.save(cb);
    j1.save(cb);
    j2.save(cb);

    function cb (err) {
      if (err) throw err;
      --count || next();
    }

    function next() {
      J.find().populate({ path: 'b', options : { limit : 2 } }).exec(function (err, j) {
        assert.equal(j.length, 2);
        assert.equal(j[0].b.length, 2);
        assert.equal(j[1].b.length, 2);
        done();
      });
    }
  })

  it('refs should cast to ObjectId from hexstrings', function(done){
    var BP = mongoose.model('RefBlogPost', BlogPost);
    var bp = new BP;
    bp._creator = new DocObjectId().toString();
    assert.ok(bp._creator instanceof DocObjectId);
    bp.set('_creator', new DocObjectId().toString());
    assert.ok(bp._creator instanceof DocObjectId);
    done();
  })

  it('populate should work on String _ids', function(done){
    var db = start();

    var UserSchema = new Schema({
        _id: String
      , name: String
    })

    var NoteSchema = new Schema({
        author: { type: String, ref: 'UserWithStringId' }
      , body: String
    })

    var User = db.model('UserWithStringId', UserSchema, random())
    var Note = db.model('NoteWithStringId', NoteSchema, random())

    var alice = new User({_id: 'alice', name: "Alice"})

    alice.save(function (err) {
      assert.ifError(err);

      var note  = new Note({author: 'alice', body: "Buy Milk"});
      note.save(function (err) {
        assert.ifError(err);

        Note.findById(note.id).populate('author').exec(function (err, note) {
          db.close();
          assert.ifError(err);
          assert.equal(note.body,'Buy Milk');
          assert.ok(note.author);
          assert.equal(note.author.name,'Alice');
          done();
        });
      });
    })
  });

  it('populate should work on Number _ids', function(done){
    var db = start();

    var UserSchema = new Schema({
        _id: Number
      , name: String
    })

    var NoteSchema = new Schema({
        author: { type: Number, ref: 'UserWithNumberId' }
      , body: String
    })

    var User = db.model('UserWithNumberId', UserSchema, random())
    var Note = db.model('NoteWithNumberId', NoteSchema, random())

    var alice = new User({_id: 2359, name: "Alice"})

    alice.save(function (err) {
      assert.ifError(err);

      var note = new Note({author: 2359, body: "Buy Milk"});
      note.save(function (err) {
        assert.ifError(err);

        Note.findById(note.id).populate('author').exec(function (err, note) {
          db.close();
          assert.ifError(err);
          assert.equal(note.body,'Buy Milk');
          assert.ok(note.author);
          assert.equal(note.author.name,'Alice');
          done();
        });
      });
    })
  });

  it('required works on ref fields (gh-577)', function(done){
    var db = start();

    var userSchema = new Schema({
        email: {type: String, required: true}
    });
    var User = db.model('ObjectIdRefRequiredField', userSchema, random());

    var numSchema = new Schema({ _id: Number, val: Number });
    var Num = db.model('NumberRefRequired', numSchema, random());

    var strSchema = new Schema({ _id: String, val: String });
    var Str = db.model('StringRefRequired', strSchema, random());

    var commentSchema = new Schema({
        user: {type: ObjectId, ref: 'ObjectIdRefRequiredField', required: true}
      , num: {type: Number, ref: 'NumberRefRequired', required: true}
      , str: {type: String, ref: 'StringRefRequired', required: true}
      , text: String
    });
    var Comment = db.model('CommentWithRequiredField', commentSchema);

    var pending = 3;

    var string = new Str({ _id: 'my string', val: 'hello' });
    var number = new Num({ _id: 1995, val: 234 });
    var user = new User({ email: 'test' });

    string.save(next);
    number.save(next);
    user.save(next);

    function next (err) {
      assert.strictEqual(null, err);
      if (--pending) return;

      var comment = new Comment({
          text: 'test'
      });

      comment.save(function (err) {
        assert.equal('Validation failed', err && err.message);
        assert.ok('num' in err.errors);
        assert.ok('str' in err.errors);
        assert.ok('user' in err.errors);
        assert.equal(err.errors.num.type,'required');
        assert.equal(err.errors.str.type,'required');
        assert.equal(err.errors.user.type,'required');

        comment.user = user;
        comment.num = 1995;
        comment.str = 'my string';

        comment.save(function (err, comment) {
          assert.strictEqual(null, err);

          Comment
          .findById(comment.id)
          .populate('user')
          .populate('num')
          .populate('str')
          .exec(function (err, comment) {
            assert.ifError(err);

            comment.set({text: 'test2'});

            comment.save(function (err, comment) {
              db.close();
              assert.ifError(err);
              done();
            });
          });
        });
      });
    }
  });

  it('populate works with schemas with both id and _id defined', function(done){
    var db =start()
      , S1 = new Schema({ id: String })
      , S2 = new Schema({ things: [{ type: ObjectId, ref: '_idAndid' }]})

    var M1 = db.model('_idAndid', S1);
    var M2 = db.model('populateWorksWith_idAndidSchemas', S2);

    M1.create(
        { id: "The Tiger That Isn't" }
      , { id: "Users Guide To The Universe" }
      , function (err, a, b) {
      assert.ifError(err);

      var m2 = new M2({ things: [a, b]});
      m2.save(function (err) {
        assert.ifError(err);
        M2.findById(m2).populate('things').exec(function (err, doc) {
          db.close();
          assert.ifError(err);
          assert.equal(doc.things.length,2);
          assert.equal(doc.things[0].id,"The Tiger That Isn't");
          assert.equal(doc.things[1].id,"Users Guide To The Universe");
          done();
        })
      });
    })
  });

  it('Update works with populated arrays (gh-602)', function(done){
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , User = db.model('RefUser', users)

    var user1 = new User({ name: 'aphex' });
    var user2 = new User({ name: 'twin' });

    User.create({name:'aphex'},{name:'twin'}, function (err, u1, u2) {
      assert.ifError(err);

      var post = BlogPost.create({
          title: 'Woot'
        , fans: []
      }, function (err, post) {
        assert.ifError(err);

        var update = { fans: [u1, u2] };
        BlogPost.update({ _id: post }, update, function (err) {
          assert.ifError(err);

          // the original update doc should not be modified
          assert.ok('fans' in update);
          assert.ok(!('$set' in update));
          assert.ok(update.fans[0] instanceof mongoose.Document);
          assert.ok(update.fans[1] instanceof mongoose.Document);

          BlogPost.findById(post, function (err, post) {
            db.close();
            assert.ifError(err);
            assert.equal(post.fans.length,2);
            assert.ok(post.fans[0] instanceof DocObjectId);
            assert.ok(post.fans[1] instanceof DocObjectId);
            done();
          });
        });
      });
    });
  });

  it('toJSON should also be called for refs (gh-675)', function(done){
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , User = db.model('RefUser', users)

    User.prototype._toJSON = User.prototype.toJSON;
    User.prototype.toJSON = function() {
      var res = this._toJSON();
      res.was_in_to_json = true;
      return res;
    }

    BlogPost.prototype._toJSON = BlogPost.prototype.toJSON;
    BlogPost.prototype.toJSON = function() {
      var res = this._toJSON();
      res.was_in_to_json = true;
      return res;
    }

    User.create({
        name  : 'Jerem'
      , email : 'jerem@jolicloud.com'
    }, function (err, creator) {
      assert.ifError(err);

      BlogPost.create({
          title     : 'Ping Pong'
        , _creator  : creator
      }, function (err, post) {
        assert.ifError(err);

        BlogPost
        .findById(post._id)
        .populate('_creator')
        .exec(function (err, post) {
          db.close();
          assert.ifError(err);

          var json = post.toJSON();
          assert.equal(true, json.was_in_to_json);
          assert.equal(json._creator.was_in_to_json,true);
          done();
        });
      });
    });
  });

  it('populate should work on Buffer _ids (gh-686)', function(done){
    var db = start();

    var UserSchema = new Schema({
        _id: Buffer
      , name: String
    })

    var NoteSchema = new Schema({
        author: { type: Buffer, ref: 'UserWithBufferId' }
      , body: String
    })

    var User = db.model('UserWithBufferId', UserSchema, random())
    var Note = db.model('NoteWithBufferId', NoteSchema, random())

    var alice = new User({_id: new mongoose.Types.Buffer('YWxpY2U=', 'base64'), name: "Alice"})

    alice.save(function (err) {
      assert.ifError(err);

      var note  = new Note({author: 'alice', body: "Buy Milk"});
      note.save(function (err) {
        assert.ifError(err);

        Note.findById(note.id).populate('author').exec(function (err, note) {
          db.close();
          assert.ifError(err);
          assert.equal(note.body,'Buy Milk');
          assert.ok(note.author);
          assert.equal(note.author.name,'Alice');
          done();
        });
      });
    })
  });

  it('populated Buffer _ids should be requireable', function(done){
    var db = start();

    var UserSchema = new Schema({
        _id: Buffer
      , name: String
    })

    var NoteSchema = new Schema({
        author: { type: Buffer, ref: 'UserWithBufferId', required: true }
      , body: String
    })

    var User = db.model('UserWithBufferId', UserSchema, random())
    var Note = db.model('NoteWithBufferId', NoteSchema, random())

    var alice = new User({_id: new mongoose.Types.Buffer('YWxpY2U=', 'base64'), name: "Alice"})

    alice.save(function (err) {
      assert.ifError(err);

      var note = new Note({author: 'alice', body: "Buy Milk"});
      note.save(function (err) {
        assert.ifError(err);

        Note.findById(note.id).populate('author').exec(function (err, note) {
          assert.ifError(err);
          note.save(function (err) {
            db.close();
            assert.ifError(err);
            done();
          })
        });
      });
    })
  });

  it('populating with custom model selection (gh-773)', function(done){
    var db = start()
      , BlogPost = db.model('RefBlogPost', posts)
      , User = db.model('RefAlternateUser', users);

    User.create({
        name  : 'Daniel'
      , email : 'daniel.baulig@gmx.de'
    }, function (err, creator) {
      assert.ifError(err);

      BlogPost.create({
          title     : 'woot'
        , _creator  : creator
      }, function (err, post) {
        assert.ifError(err);

        BlogPost
        .findById(post._id)
        .populate('_creator', 'email', 'RefAlternateUser')
        .exec(function (err, post) {
          db.close();
          assert.ifError(err);

          assert.ok(post._creator instanceof User);
          assert.equal(post._creator.isInit('name'), false);
          assert.equal(post._creator.email,'daniel.baulig@gmx.de');

          done();
        });
      });
    });
  })

  describe('specifying a custom model without specifying a ref in schema', function(done){
    it('with String _id', function(done){
      var db = start();
      var A = db.model('A', { name: String, _id: String });
      var B = db.model('B', { other: String });
      A.create({ name: 'hello', _id: 'first' }, function (err, a) {
        if (err) return done(err);
        B.create({ other: a._id }, function (err, b) {
          if (err) return done(err);
          B.findById(b._id).populate({ path: 'other', model: 'A' }).exec(function (err, b) {
            db.close();
            if (err) return done(err);
            assert.equal('hello', b.other.name);
            done();
          })
        })
      })
    })
    it('with Number _id', function(done){
      var db = start();
      var A = db.model('A', { name: String, _id: Number });
      var B = db.model('B', { other: Number });
      A.create({ name: 'hello', _id: 3 }, function (err, a) {
        if (err) return done(err);
        B.create({ other: a._id }, function (err, b) {
          if (err) return done(err);
          B.findById(b._id).populate({ path: 'other', model: 'A' }).exec(function (err, b) {
            db.close();
            if (err) return done(err);
            assert.equal('hello', b.other.name);
            done();
          })
        })
      })
    })
    it('with Buffer _id', function(done){
      var db = start();
      var A = db.model('A', { name: String, _id: Buffer });
      var B = db.model('B', { other: Buffer });
      A.create({ name: 'hello', _id: new Buffer('x') }, function (err, a) {
        if (err) return done(err);
        B.create({ other: a._id }, function (err, b) {
          if (err) return done(err);
          B.findById(b._id).populate({ path: 'other', model: 'A' }).exec(function (err, b) {
            db.close();
            if (err) return done(err);
            assert.equal('hello', b.other.name);
            done();
          })
        })
      })
    })
    it('with ObjectId _id', function(done){
      var db = start();
      var A = db.model('A', { name: String });
      var B = db.model('B', { other: Schema.ObjectId });
      A.create({ name: 'hello' }, function (err, a) {
        if (err) return done(err);
        B.create({ other: a._id }, function (err, b) {
          if (err) return done(err);
          B.findById(b._id).populate({ path: 'other', model: 'A' }).exec(function (err, b) {
            db.close();
            if (err) return done(err);
            assert.equal('hello', b.other.name);
            done();
          })
        })
      })
    })
  })

  describe('specifying all params using an object', function(){
    var db, B, User;
    var post;

    before(function (done) {
      db = start()
      B = db.model('RefBlogPost')
      User = db.model('RefAlternateUser');

      User.create({
          name  : 'use an object'
        , email : 'fo-real@objects.r.fun'
        }
      , { name: 'yup' }
      , { name: 'not here' }
      , function (err, fan1, fan2, fan3) {
        assert.ifError(err);

        B.create({
            title: 'woot'
          , fans: [fan1, fan2, fan3]
        }, function (err, post_) {
          assert.ifError(err);
          post = post_;
          done();
        })
      })
    })

    after(function(done){
      db.close(done)
    })

    it('works', function(done){
      var fan3id = String(post.fans[2]);

      B.findById(post._id)
      .populate({
          path: 'fans'
        , select: 'name'
        , model: 'RefAlternateUser'
        , match: { name: /u/ }
        , options: { sort: {'name': -1} }
      })
      .exec(function (err, post) {
        db.close();
        assert.ifError(err);

        assert.ok(Array.isArray(post.fans));
        assert.equal(2, post.fans.length);
        assert.ok(post.fans[0] instanceof User);
        assert.ok(post.fans[1] instanceof User);
        assert.equal(post.fans[0].isInit('name'), true);
        assert.equal(post.fans[1].isInit('name'), true);
        assert.equal(post.fans[0].isInit('email'), false);
        assert.equal(post.fans[1].isInit('email'), false);
        assert.equal(post.fans[0].name,'yup');
        assert.equal(post.fans[1].name,'use an object');

        done();
      });
    })

  })

  describe('Model.populate()', function(){
    var db, B, User;
    var user1, user2, post1, post2, _id;

    before(function(done){
      db = start()
      B = db.model('RefBlogPost', posts)
      User = db.model('RefAlternateUser', users);

      _id = new mongoose.Types.ObjectId;

      User.create({
          name  : 'Phoenix'
        , email : 'phx@az.com'
        , blogposts: [_id]
      }, {
          name  : 'Newark'
        , email : 'ewr@nj.com'
        , blogposts: [_id]
      }, function (err, u1, u2) {
        assert.ifError(err);

        user1 = u1;
        user2 = u2;

        B.create({
            title     : 'the how and why'
          , _creator  : user1
          , fans: [user1, user2]
        }, {
            title     : 'green eggs and ham'
          , _creator  : user2
          , fans: [user2, user1]
        }, function (err, p1, p2) {
          assert.ifError(err);
          post1 = p1;
          post2 = p2;
          done();
        });
      });
    });

    after(function(done){
      db.close(done);
    })

    describe('returns', function(){
      it('a promise', function(done){
        var p = B.populate(post1, '_creator');
        assert.ok(p instanceof mongoose.Promise);
        p.then(success, done).end();
        function success (doc) {
          assert.ok(doc);
          done();
        }
      })
    })

    describe('of individual document', function(){
      it('works', function(done){
        B.findById(post1._id, function(error, post1) {
          var ret = utils.populate({ path: '_creator', model: 'RefAlternateUser' })
          B.populate(post1, ret, function (err, post) {
            assert.ifError(err);
            assert.ok(post);
            assert.ok(post._creator instanceof User);
            assert.equal('Phoenix', post._creator.name);
            done();
          });
        });
      })
    })

    describe('a document already populated', function(){
      describe('when paths are not modified', function(){
        it('works', function(done){
          B.findById(post1._id, function (err, doc) {
            assert.ifError(err);
            B.populate(doc, [{ path: '_creator', model: 'RefAlternateUser' }, { path: 'fans', model: 'RefAlternateUser' }], function (err, post) {
              assert.ifError(err);
              assert.ok(post);
              assert.ok(post._creator instanceof User);
              assert.equal('Phoenix', post._creator.name);
              assert.equal(2, post.fans.length);
              assert.equal(post.fans[0].name, user1.name);
              assert.equal(post.fans[1].name, user2.name);

              assert.equal(String(post._creator._id), String(post.populated('_creator')));
              assert.ok(Array.isArray(post.populated('fans')));

              B.populate(doc, [{ path: '_creator', model: 'RefAlternateUser' }, { path: 'fans', model: 'RefAlternateUser' }], function (err, post) {
                assert.ifError(err);
                assert.ok(post);
                assert.ok(post._creator instanceof User);
                assert.equal('Phoenix', post._creator.name);
                assert.equal(2, post.fans.length);
                assert.equal(post.fans[0].name, user1.name);
                assert.equal(post.fans[1].name, user2.name);
                assert.ok(Array.isArray(post.populated('fans')));
                assert.equal(
                    String(post.fans[0]._id)
                  , String(post.populated('fans')[0]));
                assert.equal(
                    String(post.fans[1]._id)
                  , String(post.populated('fans')[1]));

                done()
              });
            });
          });
        })
      })
      describe('when paths are modified', function(){
        it('works', function(done){
          B.findById(post1._id, function (err, doc) {
            assert.ifError(err);
            B.populate(doc, [{ path: '_creator', model: 'RefAlternateUser' }, { path: 'fans', model: 'RefAlternateUser' }], function (err, post) {
              assert.ifError(err);
              assert.ok(post);
              assert.ok(post._creator instanceof User);
              assert.equal('Phoenix', post._creator.name);
              assert.equal(2, post.fans.length);
              assert.equal(post.fans[0].name, user1.name);
              assert.equal(post.fans[1].name, user2.name);

              assert.equal(String(post._creator._id), String(post.populated('_creator')));
              assert.ok(Array.isArray(post.populated('fans')));

              // modify the paths
              doc.markModified('_creator');
              doc.markModified('fans');

              B.populate(doc, [{ path: '_creator', model: 'RefAlternateUser' }, { path: 'fans', model: 'RefAlternateUser' }], function (err, post) {
                assert.ifError(err);
                assert.ok(post);
                assert.ok(post._creator instanceof User);
                assert.equal('Phoenix', post._creator.name);
                assert.equal(2, post.fans.length);
                assert.equal(post.fans[0].name, user1.name);
                assert.equal(post.fans[1].name, user2.name);
                assert.ok(Array.isArray(post.populated('fans')));
                assert.equal(
                    String(post.fans[0]._id)
                  , String(post.populated('fans')[0]));
                assert.equal(
                    String(post.fans[1]._id)
                  , String(post.populated('fans')[1]));

                done()
              });
            });
          });
        })
      })
    })

    describe('of multiple documents', function() {
      it('works', function(done) {
        B.findById(post1._id, function(error, post1) {
          assert.ifError(error);
          B.findById(post2._id, function(error, post2) {
            assert.ifError(error);
            var ret = utils.populate({ path: '_creator', model: 'RefAlternateUser' });
            B.populate([post1, post2], ret, function (err, posts) {
              assert.ifError(err);
              assert.ok(posts);
              assert.equal(2, posts.length);
              var p1 = posts[0];
              var p2 = posts[1];
              assert.ok(p1._creator instanceof User);
              assert.equal('Phoenix', p1._creator.name);
              assert.ok(p2._creator instanceof User);
              assert.equal('Newark', p2._creator.name);
              done();
            });
          });
        });
      });
    });

  })

  describe('populating combined with lean (gh-1260)', function(){
    it('with findOne', function(done){
      var db = start()
        , BlogPost = db.model('RefBlogPost', posts + random())
        , User = db.model('RefUser', users + random())

      User.create({
          name  : 'Guillermo'
        , email : 'rauchg@gmail.com'
      }, function (err, creator) {
        assert.ifError(err);

        BlogPost.create({
            title     : 'woot'
          , _creator  : creator
        }, function (err, post) {
          assert.ifError(err);

          BlogPost
          .findById(post._id)
          .lean()
          .populate('_creator')
          .exec(function (err, post) {
            db.close();
            assert.ifError(err);

            assert.ok(utils.isObject(post._creator));
            assert.equal(post._creator.name, 'Guillermo');
            assert.equal(post._creator.email, 'rauchg@gmail.com');
            assert.equal('undefined', typeof post._creator.update);
            done();
          });
        });
      });
    })

    it('with find', function(done){
      var db = start()
        , BlogPost = db.model('RefBlogPost', posts + random())
        , User = db.model('RefUser', users + random());

      User.create({
          name  : 'Fan 1'
        , email : 'fan1@learnboost.com'
      }, {
          name  : 'Fan 2'
        , email : 'fan2@learnboost.com'
      }, function (err, fan1, fan2) {
        assert.ifError(err);

        BlogPost.create({
            title : 'Woot'
          , fans  : [fan1, fan2]
        }, {
            title : 'Woot2'
          , fans  : [fan2, fan1]
        }, function (err, post1, post2) {
          assert.ifError(err);

          BlogPost
          .find({ _id: { $in: [post1._id, post2._id ] } })
          .populate('fans')
          .lean()
          .exec(function (err, blogposts) {
            db.close();
            assert.ifError(err);

            assert.equal(blogposts[0].fans[0].name,'Fan 1');
            assert.equal(blogposts[0].fans[0].email,'fan1@learnboost.com');
            assert.equal('undefined', typeof blogposts[0].fans[0].update);
            assert.equal(blogposts[0].fans[1].name,'Fan 2');
            assert.equal(blogposts[0].fans[1].email,'fan2@learnboost.com');
            assert.equal('undefined', typeof blogposts[0].fans[1].update);

            assert.equal(blogposts[1].fans[0].name,'Fan 2');
            assert.equal(blogposts[1].fans[0].email,'fan2@learnboost.com');
            assert.equal('undefined', typeof blogposts[1].fans[0].update);
            assert.equal(blogposts[1].fans[1].name,'Fan 1');
            assert.equal(blogposts[1].fans[1].email,'fan1@learnboost.com');
            assert.equal('undefined', typeof blogposts[1].fans[1].update);
            done();
          });
        });
      });
    })
  })

  describe('records paths and _ids used in population', function(){
    var db;
    var B;
    var U;
    var u1, u2;
    var b1, b2

    before(function(done){
      db = start()
      B = db.model('RefBlogPost', posts + random())
      U = db.model('RefUser', users + random());

      U.create({
          name  : 'Fan 1'
        , email : 'fan1@learnboost.com'
      }, {
          name  : 'Fan 2'
        , email : 'fan2@learnboost.com'
      }, function (err, fan1, fan2) {
        assert.ifError(err);
        u1 = fan1;
        u2 = fan2;

        B.create({
            title : 'Woot'
          , fans  : [fan1, fan2]
          , _creator: fan1
        }, {
            title : 'Woot2'
          , fans  : [fan2, fan1]
          , _creator: fan2
        }, function (err, post1, post2) {
          assert.ifError(err);
          b1 = post1;
          b2 = post2;
          done();
        });
      });
    })

    after(function(){
      db.close()
    })

    it('with findOne', function(done){
      B.findById(b1).populate('fans _creator').exec(function (err, doc) {
        assert.ifError(err);
        assert.ok(Array.isArray(doc.populated('fans')));
        assert.equal(2, doc.populated('fans').length);
        assert.equal(doc.populated('fans')[0], String(u1._id));
        assert.equal(doc.populated('fans')[1], String(u2._id));
        assert.equal(doc.populated('_creator'), String(u1._id));
        done();
      })
    })

    it('with find', function(done){
      B.find().sort('title').populate('fans _creator').exec(function (err, docs) {
        assert.ifError(err);
        assert.equal(2, docs.length);

        var doc1 = docs[0];
        var doc2 = docs[1];

        assert.ok(Array.isArray(doc1.populated('fans')));
        assert.equal(2, doc1.populated('fans').length);

        assert.equal(doc1.populated('fans')[0], String(u1._id));
        assert.equal(doc1.populated('fans')[1], String(u2._id));
        assert.equal(doc1.populated('_creator'), String(u1._id));

        assert.ok(Array.isArray(doc2.populated('fans')));
        assert.equal(2, doc2.populated('fans').length);
        assert.equal(doc2.populated('fans')[0], String(u2._id));
        assert.equal(doc2.populated('fans')[1], String(u1._id));
        assert.equal(doc2.populated('_creator'), String(u2._id));
        done();
      })
    })
  })

  describe('deselecting _id', function(){
    var db, C, U, u1, c1, c2;
    before(function(done){
      db = start();

      C = db.model('Comment', Schema({
          body: 'string', title: String
      }), 'comments_' + random());

      U = db.model('User', Schema({
          name: 'string'
        , comments: [{ type: Schema.ObjectId, ref: 'Comment' }]
        , comment: { type: Schema.ObjectId, ref: 'Comment' }
      }), 'users_' + random());

      C.create({ body: 'comment 1', title: '1' }, { body: 'comment 2', title: 2 }, function (err, c1_, c2_) {
        assert.ifError(err);
        c1 = c1_;
        c2 = c2_;

        U.create(
            { name: 'u1', comments: [c1, c2], comment: c1 }
          , { name: 'u2', comment: c2 }
          , function (err, u) {
          assert.ifError(err);
          u1 = u;
          done();
        });
      });
    })

    after(function(done){
      db.close(done)
    })

    describe('in a subdocument', function(){
      it('works', function(done){
        U.find({name:'u1'}).populate('comments', { _id: 0 }).exec(function (err, docs) {
          assert.ifError(err);

          var doc = docs[0];
          assert.ok(Array.isArray(doc.comments), 'comments should be an array: ' + JSON.stringify(doc));
          assert.equal(2, doc.comments.length, 'invalid comments length for ' + JSON.stringify(doc));
          doc.comments.forEach(function (d) {
            assert.equal(undefined, d._id);
            assert.equal(-1, Object.keys(d._doc).indexOf('_id'));
            assert.ok(d.body.length);
            assert.equal('number', typeof d._doc.__v);
          });

          U.findOne({name:'u1'}).populate('comments', 'title -_id').exec(function (err, doc) {
            assert.ifError(err);
            assert.equal(2, doc.comments.length);
            doc.comments.forEach(function (d) {
              assert.equal(undefined, d._id);
              assert.equal(-1, Object.keys(d._doc).indexOf('_id'));
              assert.ok(d.title.length);
              assert.equal(undefined, d.body);
              assert.equal(typeof d._doc.__v, 'undefined');
            });
            U.findOne({name:'u1'}).populate('comments', '-_id').exec(function (err, doc) {
              assert.ifError(err);
              assert.equal(2, doc.comments.length);
              doc.comments.forEach(function (d) {
                assert.equal(undefined, d._id);
                assert.equal(-1, Object.keys(d._doc).indexOf('_id'));
                assert.ok(d.title.length);
                assert.ok(d.body.length);
                assert.equal(typeof d._doc.__v, 'number');
              });
              done();
            })
          })
        })
      })

      it('with lean', function(done){
        U.find({name:'u1'}).lean().populate({ path: 'comments', select: { _id: 0 }, options: { lean: true }}).exec(function (err, docs) {
          assert.ifError(err);

          var doc = docs[0];
          assert.equal(2, doc.comments.length);
          doc.comments.forEach(function (d) {
            assert.ok(!('_id' in d));
            assert.ok(d.body.length);
            assert.equal('number', typeof d.__v);
          });

          U.findOne({name:'u1'}).lean().populate('comments', '-_id', null, { lean: true}).exec(function (err, doc) {
            assert.ifError(err);
            assert.equal(2, doc.comments.length);
            doc.comments.forEach(function (d) {
              assert.ok(!('_id' in d));
              assert.ok(d.body.length);
              assert.equal('number', typeof d.__v);
            });
            done();
          })
        })
      })
    })

    describe('of documents being populated', function(){
      it('still works (gh-1441)', function(done){

        U.find()
          .select('-_id comment name')
          .populate('comment', { _id: 0 }).exec(function (err, docs) {

          assert.ifError(err);
          assert.equal(2, docs.length);

          docs.forEach(function (doc) {
            assert.ok(doc.comment && doc.comment.body);
            if ('u1' == doc.name) {
              assert.equal('comment 1', doc.comment.body);
            } else {
              assert.equal('comment 2', doc.comment.body);
            }
          })

          done();
        })
      })
    })
  })

  it('maps results back to correct document (gh-1444)', function(done){
    var db = start();

    var articleSchema = new Schema({
        body: String,
        mediaAttach: {type: Schema.ObjectId, ref : '1444-Media'},
        author: String
    });
    var Article = db.model('1444-Article', articleSchema);

    var mediaSchema = new Schema({
        filename: String
    });
    var Media = db.model('1444-Media', mediaSchema);

    Media.create({ filename: 'one' }, function (err, media) {
      assert.ifError(err);

      Article.create(
          {body: 'body1', author: 'a'}
        , {body: 'body2', author: 'a', mediaAttach: media._id}
        , {body: 'body3', author: 'a'}, function (err) {
        if (err) return done(err);

        Article.find().populate('mediaAttach').exec(function (err, docs) {
          db.close();
          assert.ifError(err);

          var a2 = docs.filter(function(d){return 'body2' == d.body})[0];
          assert.equal(a2.mediaAttach.id, media.id);

          done();
        });
      });
    });
  })

  describe('leaves Documents within Mixed properties alone (gh-1471)', function(){
    var db;
    var Cat;
    var Litter;

    before(function(){
      db = start();
      Cat = db.model('cats', new Schema({ name: String }));
      var litterSchema = new Schema({name: String, cats: {}, o: {}, a: []});
      Litter = db.model('litters', litterSchema);
    });

    after(function(done){
      db.close(done);
    });

    it('when saving new docs', function(done){
      Cat.create({name:'new1'},{name:'new2'},{name:'new3'}, function (err, a, b, c) {
        if (err) return done(err);

        Litter.create({
            name: 'new'
          , cats:[a]
          , o: b
          , a: [c]
        }, confirm(done));
      })
    })

    it('when saving existing docs 5T5', function(done){
      Cat.create({name:'ex1'},{name:'ex2'},{name:'ex3'}, function (err, a, b, c) {
        if (err) return done(err);

        Litter.create({name:'existing'}, function (err, doc) {
          doc.cats = [a];
          doc.o = b;
          doc.a = [c]
          doc.save(confirm(done));
        });
      });
    })

    function confirm (done) {
      return function (err, litter) {
        if (err) return done(err);
        Litter.findById(litter).lean().exec(function (err, doc) {
          if (err) return done(err);
          assert.ok(doc.o._id);
          assert.ok(doc.cats[0]);
          assert.ok(doc.cats[0]._id);
          assert.ok(doc.a[0]);
          assert.ok(doc.a[0]._id);
          done();
        })
      }
    }
  })

  describe('gh-2252', function() {
    it('handles skip', function(done) {
      var db = start();

      var movieSchema = new Schema({});
      var categorySchema = new Schema({ movies: [{ type: ObjectId, ref: 'gh-2252-1' }] });

      var Movie = db.model('gh-2252-1', movieSchema);
      var Category = db.model('gh-2252-2', categorySchema);

      Movie.create({}, {}, {}, function(error) {
        assert.ifError(error);
        Movie.find({}, function(error, docs) {
          assert.ifError(error);
          assert.equal(docs.length, 3);
          Category.create({ movies: [docs[0]._id, docs[1]._id, docs[2]._id] }, function(error) {
            assert.ifError(error);
            Category.findOne({}).populate({ path: 'movies', options: { limit: 2, skip: 1 } }).exec(function(error, category) {
              assert.ifError(error);
              assert.equal(2, category.movies.length);
              done();
            });
          });
        });
      });
    });
  });

  it('handles slice (gh-1934)', function(done) {
    var db = start();

    var movieSchema = new Schema({ title: String, actors: [String] });
    var categorySchema = new Schema({ movies: [{ type: ObjectId, ref: 'gh-1934-1' }] });

    var Movie = db.model('gh-1934-1', movieSchema);
    var Category = db.model('gh-1934-2', categorySchema);
    var movies = [
      { title: 'Rush', actors: ['Chris Hemsworth', 'Daniel Bruhl'] },
      { title: 'Pacific Rim', actors: ['Charlie Hunnam', 'Idris Elba'] },
      { title: 'Man of Steel', actors: ['Henry Cavill', 'Amy Adams'] }
    ];
    Movie.create(movies, function(error, m1, m2, m3) {
      assert.ifError(error);
      Category.create({ movies: [m1._id, m2._id, m3._id] }, function(error) {
        assert.ifError(error);
        Category.findOne({}).populate({ path: 'movies', options: { slice: { actors: 1 } } }).exec(function(error, category) {
          assert.ifError(error);
          assert.equal(category.movies.length, 3);
          assert.equal(category.movies[0].actors.length, 1);
          assert.equal(category.movies[1].actors.length, 1);
          assert.equal(category.movies[2].actors.length, 1);
          done();
        });
      });
    });
  });
});
