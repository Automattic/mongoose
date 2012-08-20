
/**
 * Test dependencies.
 */

var start = require('./common')
  , assert = require('assert')
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

describe('model: ref:', function(){
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
  })

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
      , BlogPost = db.model('RefBlogPost', posts)
      , User = db.model('RefUser', users);

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
            assert.equal(false,post._creator.isInit('name'));
            assert.equal(post._creator.email,'cats@example.com');
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
            , email : 'aaron.heckmann@10gen.com'
          }, function (err, newCreator) {
            assert.ifError(err);

            post._creator = newCreator._id;
            post.save(function (err) {
              assert.ifError(err);

              BlogPost
              .findById(post._id)
              .populate('_creator')
              .exec(function (err, post) {
                db.close();
                assert.ifError(err);
                assert.equal(post._creator.name,'Aaron');
                assert.equal(post._creator.email,'aaron.heckmann@10gen.com');
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

          // invalid subprop
          BlogPost
          .findById(post._id)
          .populate('comments._idontexist', 'email')
          .exec(function (err, post) {
            assert.ifError(err);
            assert.ok(post);
            assert.equal(post.comments.length, 2);
            assert.strictEqual(post.comments[0]._creator, null);
            assert.equal(post.comments[1]._creator.toString(),user2.id);

            // subprop is null in a doc
            BlogPost
            .findById(post._id)
            .populate('comments._creator', 'email')
            .exec(function (err, post) {
              db.close();
              assert.ifError(err);

              assert.ok(post);
              assert.equal(post.comments.length,2);
              assert.strictEqual(post.comments[0]._creator, null);
              assert.strictEqual(post.comments[0].content, 'Woot woot');
              assert.equal(post.comments[1]._creator.email,'terminator1000@learnboost.com');
              assert.equal(post.comments[1]._creator.isInit('name'), false);
              assert.equal(post.comments[1].content,'Wha wha');

              done();
            });
          });
        });
      });
    });
  })

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
            assert.equal(returned.fans.length,1);
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

    User.create({ name: 'aaron', age: 10 }, { name: 'fan2', age: 8 }, { name: 'someone else', age: 3 },
    function (err, fan1, fan2, fan3) {
      assert.ifError(err);

      P.create({ fans: [fan2, fan3, fan1] }, function (err, post) {
        assert.ifError(err);

        P.findById(post)
        .populate('fans', null, null, { sort: 'name' })
        .exec(function (err, post) {
          assert.ifError(err);

          assert.equal(post.fans.length,3);
          assert.equal(post.fans[0].name,'aaron');
          assert.equal(post.fans[1].name,'fan2');
          assert.equal(post.fans[2].name,'someone else');

          P.findById(post)
          .populate('fans', 'name', null, { sort: [['name', -1]] })
          .exec(function (err, post) {
            assert.ifError(err);

            assert.equal(post.fans.length,3);
            assert.equal(post.fans[2].name,'aaron');
            assert.strictEqual(undefined, post.fans[2].age)
            assert.equal(post.fans[1].name,'fan2');
            assert.strictEqual(undefined, post.fans[1].age)
            assert.equal(post.fans[0].name,'someone else');
            assert.strictEqual(undefined, post.fans[0].age)

            P.findById(post)
            .populate('fans', 'age', { age: { $gt: 3 }}, { sort: [['name', 'desc']] })
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
  })

  it('refs should cast to ObjectId from hexstrings', function(){
    var BP = mongoose.model('RefBlogPost', BlogPost);
    var bp = new BP;
    bp._creator = new DocObjectId().toString();
    assert.ok(bp._creator instanceof DocObjectId);
    bp.set('_creator', new DocObjectId().toString());
    assert.ok(bp._creator instanceof DocObjectId);
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
});
