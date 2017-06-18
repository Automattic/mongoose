/**
 * Test dependencies.
 */

var _ = require('lodash');
var start = require('./common');
var async = require('async');
var assert = require('power-assert');
var mongoose = start.mongoose;
var utils = require('../lib/utils');
var random = utils.random;
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var DocObjectId = mongoose.Types.ObjectId;

/**
 * Tests.
 */

describe('model: populate:', function() {
  var User;
  var Comment;
  var BlogPost;
  var posts;
  var users;

  before(function() {
    User = new Schema({
      name: String,
      email: String,
      gender: {type: String, enum: ['male', 'female'], default: 'male'},
      age: {type: Number, default: 21},
      blogposts: [{type: ObjectId, ref: 'RefBlogPost'}],
      followers: [{type: ObjectId, ref: 'RefUser'}]
    });

    /**
     * Comment subdocument schema.
     */

    Comment = new Schema({
      asers: [{type: ObjectId, ref: 'RefUser'}],
      _creator: {type: ObjectId, ref: 'RefUser'},
      content: String
    });

    /**
     * Blog post schema.
     */

    BlogPost = new Schema({
      _creator: {type: ObjectId, ref: 'RefUser'},
      title: String,
      comments: [Comment],
      fans: [{type: ObjectId, ref: 'RefUser'}]
    });

    posts = 'blogposts_' + random();
    users = 'users_' + random();

    mongoose.model('RefBlogPost', BlogPost);
    mongoose.model('RefUser', User);
    mongoose.model('RefAlternateUser', User);
  });

  it('populating array of object', function(done) {
    var db = start(),
        BlogPost = db.model('RefBlogPost', posts),
        User = db.model('RefUser', users);

    User.create({name: 'User 1'}, function(err, user1) {
      assert.ifError(err);

      User.create({name: 'User 2'}, function(err, user2) {
        assert.ifError(err);

        BlogPost.create({
          title: 'Woot',
          _creator: user1._id,
          comments: [
            {_creator: user1._id, content: 'Woot woot'},
            {_creator: user2._id, content: 'Wha wha'}
          ]
        }, function(err, post) {
          assert.ifError(err);

          assert.doesNotThrow(function() {
            post.populate('comments', function() {
            });
          });
          db.close(done);
        });
      });
    });
  });

  it('deep population (gh-3103)', function(done) {
    var db = start(),
        BlogPost = db.model('RefBlogPost', posts),
        User = db.model('RefUser', users);

    User.create({name: 'User 01'}, function(err, user1) {
      assert.ifError(err);

      User.create({name: 'User 02', followers: [user1._id]}, function(err, user2) {
        assert.ifError(err);

        User.create({name: 'User 03', followers: [user2._id]}, function(err, user3) {
          assert.ifError(err);

          BlogPost.create({
            title: 'w00tabulous',
            _creator: user3._id
          }, function(err, post) {
            assert.ifError(err);

            assert.doesNotThrow(function() {
              BlogPost
              .findById(post._id)
              .select('_creator')
              .populate({
                path: '_creator',
                model: 'RefUser',
                select: 'name followers',
                populate: [{
                  path: 'followers',
                  select: 'name followers',
                  options: {limit: 5},
                  populate: {  // can also use a single object instead of array of objects
                    path: 'followers',
                    select: 'name',
                    options: {limit: 2}
                  }
                }]
              })
              .exec(function(err, post) {
                db.close();
                assert.ifError(err);
                assert.ok(post._creator);
                assert.equal(post._creator.name, 'User 03');
                assert.ok(post._creator.followers);
                assert.ok(post._creator.followers[0]);
                assert.equal(post._creator.followers[0].name, 'User 02');
                assert.ok(post._creator.followers[0].followers);
                assert.ok(post._creator.followers[0].followers[0]);
                assert.equal(post._creator.followers[0].followers[0].name, 'User 01');
                done();
              });
            });
          });
        });
      });
    });
  });

  describe('deep populate', function() {
    var db;

    before(function() {
      db = start();
    });

    after(function(done) {
      db.close(done);
    });

    it('deep population with refs (gh-3507)', function(done) {
      // handler schema
      var handlerSchema = new Schema({
        name: String
      });

      // task schema
      var taskSchema = new Schema({
        name: String,
        handler: {type: Schema.Types.ObjectId, ref: 'gh3507_0'}
      });

      // application schema
      var applicationSchema = new Schema({
        name: String,
        tasks: [{type: Schema.Types.ObjectId, ref: 'gh3507_1'}]
      });

      var Handler = db.model('gh3507_0', handlerSchema);
      var Task = db.model('gh3507_1', taskSchema);
      var Application = db.model('gh3507_2', applicationSchema);

      Handler.create({name: 'test'}, function(error, doc) {
        assert.ifError(error);
        Task.create({name: 'test2', handler: doc._id}, function(error, doc) {
          assert.ifError(error);
          var obj = {name: 'test3', tasks: [doc._id]};
          Application.create(obj, function(error, doc) {
            assert.ifError(error);
            test(doc._id);
          });
        });
      });

      function test(id) {
        Application.
        findById(id).
        populate([
          {path: 'tasks', populate: {path: 'handler'}}
        ]).
        exec(function(error, doc) {
          assert.ifError(error);
          assert.ok(doc.tasks[0].handler._id);
          done();
        });
      }
    });

    it('multiple paths with same options (gh-3808)', function(done) {
      var companySchema = new Schema({
        name:  String,
        description:  String
      });

      var userSchema = new Schema({
        name:  String,
        company: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Company',
          select: false
        }
      });

      var messageSchema = new Schema({
        message:  String,
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        target: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
      });

      var Company = db.model('Company', companySchema);
      var User = db.model('User', userSchema);
      var Message = db.model('Message', messageSchema);

      var company = new Company({ name: 'IniTech' });
      var user1 = new User({ name: 'Bill', company: company._id });
      var user2 = new User({ name: 'Peter', company: company._id });
      var message = new Message({
        message: 'Problems with TPS Report',
        author: user1._id,
        target: user2._id
      });

      company.save(function(error) {
        assert.ifError(error);
        User.create(user1, user2, function(error) {
          assert.ifError(error);
          message.save(function(error) {
            assert.ifError(error);
            next();
          });
        });
      });

      function next() {
        Message.findOne({ _id: message._id }, function(error, message) {
          assert.ifError(error);
          var options = {
            path: 'author target',
            select: '_id name company',
            populate: {
              path: 'company',
              model: 'Company'
            }
          };
          message.populate(options, function(error) {
            assert.ifError(error);
            assert.equal(message.target.company.name, 'IniTech');
            done();
          });
        });
      }
    });
  });

  it('populating a single ref', function(done) {
    var db = start(),
        BlogPost = db.model('RefBlogPost', posts),
        User = db.model('RefUser', users);

    User.create({
      name: 'Guillermo',
      email: 'rauchg@gmail.com'
    }, function(err, creator) {
      assert.ifError(err);

      BlogPost.create({
        title: 'woot',
        _creator: creator
      }, function(err, post) {
        assert.ifError(err);

        BlogPost
        .findById(post._id)
        .populate('_creator')
        .exec(function(err, post) {
          assert.ifError(err);

          assert.ok(post._creator instanceof User);
          assert.equal(post._creator.name, 'Guillermo');
          assert.equal(post._creator.email, 'rauchg@gmail.com');
          db.close(done);
        });
      });
    });
  });

  it('not failing on null as ref', function(done) {
    var db = start(),
        BlogPost = db.model('RefBlogPost', posts);

    BlogPost.create({
      title: 'woot',
      _creator: null
    }, function(err, post) {
      assert.ifError(err);

      BlogPost
      .findById(post._id)
      .populate('_creator')
      .exec(function(err, post) {
        assert.ifError(err);

        assert.equal(post._creator, null);
        db.close(done);
      });
    });
  });

  it('not failing on empty object as ref', function(done) {
    var db = start(),
        BlogPost = db.model('RefBlogPost', posts);

    BlogPost.create(
        {title: 'woot'},
        function(err, post) {
          assert.ifError(err);

          BlogPost.
          findByIdAndUpdate(post._id, {$set: {_creator: {}}}, function(err) {
            assert.ok(err);
            db.close(done);
          });
        });
  });

  it('across DBs', function(done) {
    var db = start(),
        db2 = db.useDb('mongoose_test2'),
        BlogPost = db.model('RefBlogPost', posts + '2'),
        User = db2.model('RefUser', users + '2');

    User.create({
      name: 'Guillermo',
      email: 'rauchg@gmail.com'
    }, function(err, creator) {
      assert.ifError(err);

      BlogPost.create({
        title: 'woot',
        _creator: creator._id
      }, function(err, post) {
        assert.ifError(err);
        BlogPost
        .findById(post._id)
        .populate('_creator', 'name', User)
        .exec(function(err, post) {
          db2.db.dropDatabase(function() {
            db.close();
            db2.close();
            assert.ifError(err);
            assert.ok(post._creator.name === 'Guillermo');
            done();
          });
        });
      });
    });
  });

  it('an error in single ref population propagates', function(done) {
    var db = start(),
        BlogPost = db.model('RefBlogPost', posts + '1'),
        User = db.model('RefUser', users + '1');

    User.create({
      name: 'Guillermo',
      email: 'rauchg@gmail.com'
    }, function(err, creator) {
      assert.ifError(err);

      BlogPost.create({
        title: 'woot',
        _creator: creator
      }, function(err, post) {
        assert.ifError(err);

        var origExec = User.Query.prototype.exec;

        // mock an error
        User.Query.prototype.exec = function() {
          var args = Array.prototype.map.call(arguments, function(arg) {
            return typeof arg === 'function' ? function() {
              arg(new Error('woot'));
            } : arg;
          });
          return origExec.apply(this, args);
        };

        BlogPost
        .findById(post._id)
        .populate('_creator')
        .exec(function(err) {
          db.close();
          assert.ok(err instanceof Error);
          assert.equal(err.message, 'woot');
          User.Query.prototype.exec = origExec;
          done();
        });
      });
    });
  });

  it('populating with partial fields selection', function(done) {
    var db = start(),
        BlogPost = db.model('RefBlogPost', posts),
        User = db.model('RefUser', users);

    User.create({
      name: 'Guillermo',
      email: 'rauchg@gmail.com'
    }, function(err, creator) {
      assert.ifError(err);

      BlogPost.create({
        title: 'woot',
        _creator: creator
      }, function(err, post) {
        assert.ifError(err);

        BlogPost
        .findById(post._id)
        .populate('_creator', 'email')
        .exec(function(err, post) {
          db.close();
          assert.ifError(err);

          assert.ok(post._creator instanceof User);
          assert.equal(post._creator.isInit('name'), false);
          assert.equal(post._creator.email, 'rauchg@gmail.com');
          done();
        });
      });
    });
  });

  it('population of single oid with partial field selection and filter', function(done) {
    var db = start(),
        BlogPost = db.model('RefBlogPost', 'blogposts_' + random()),
        User = db.model('RefUser', 'users_' + random());

    User.create({
      name: 'Banana',
      email: 'cats@example.com'
    }, function(err, creator) {
      assert.ifError(err);

      BlogPost.create({
        title: 'woot',
        _creator: creator
      }, function(err, post) {
        assert.ifError(err);

        BlogPost
        .findById(post._id)
        .populate('_creator', 'email', {name: 'Peanut'})
        .exec(function(err, post) {
          assert.ifError(err);
          assert.strictEqual(post._creator, null);

          BlogPost
          .findById(post._id)
          .populate('_creator', 'email', {name: 'Banana'})
          .exec(function(err, post) {
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
  });

  it('population of undefined fields in a collection of docs', function(done) {
    var db = start(),
        BlogPost = db.model('RefBlogPost', 'blogposts_' + random()),
        User = db.model('RefUser', 'users_' + random());
    User.create({
      name: 'Eloy',
      email: 'eloytoro@gmail.com'
    }, function(err, user) {
      assert.ifError(err);

      BlogPost.create({
        title: 'I have a user ref',
        _creator: user
      }, function(err) {
        assert.ifError(err);

        BlogPost.create({
          title: 'I don\'t'
        }, function(err) {
          assert.ifError(err);
          BlogPost
          .find()
          .populate('_creator')
          .exec(function(err, posts) {
            db.close();
            posts.forEach(function(post) {
              if ('_creator' in post) {
                assert.ok(post._creator !== null);
              }
            });
            done();
          });
        });
      });
    });
  });

  it('undefined for nested paths (gh-3859)', function(done) {
    var db = start();

    var companySchema = new mongoose.Schema({
      name:  String,
      description:  String
    });

    var userSchema = new mongoose.Schema({
      name:  String,
      company: {type: mongoose.Schema.Types.ObjectId, ref: 'Company'}
    });

    var sampleSchema = new mongoose.Schema({
      items:  [userSchema]
    });

    var Company = db.model('gh3859_0', companySchema);
    var User = db.model('gh3859_1', userSchema);
    var Sample = db.model('gh3859_2', sampleSchema);

    var company = new Company({name: 'Reynholm Industrie'});
    var user1 = new User({name: 'Douglas', company: company._id});
    var user2 = new User({name: 'Lambda'});
    var sample = new Sample({
      items: [user1, user2]
    });

    company.save(function(error) {
      assert.ifError(error);
      User.create(user1, user2, function(error) {
        assert.ifError(error);
        sample.save(function(error) {
          assert.ifError(error);
          next();
        });
      });
    });

    function next() {
      Sample.findOne({}, function(error, sample) {
        assert.ifError(error);
        var opts = { path: 'items.company', options: { lean: true } };
        Company.populate(sample, opts, function(error) {
          assert.ifError(error);
          assert.strictEqual(sample.items[1].company, void 0);
          db.close(done);
        });
      });
    }
  });

  it('population and changing a reference', function(done) {
    var db = start(),
        BlogPost = db.model('RefBlogPost', posts),
        User = db.model('RefUser', users);

    User.create({
      name: 'Guillermo',
      email: 'rauchg@gmail.com'
    }, function(err, creator) {
      assert.ifError(err);

      BlogPost.create({
        title: 'woot',
        _creator: creator
      }, function(err, post) {
        assert.ifError(err);

        BlogPost
        .findById(post._id)
        .populate('_creator')
        .exec(function(err, post) {
          assert.ifError(err);

          assert.ok(post._creator instanceof User);
          assert.equal(post._creator.name, 'Guillermo');
          assert.equal(post._creator.email, 'rauchg@gmail.com');

          User.create({
            name: 'Aaron',
            email: 'aaron.heckmann@gmail.com'
          }, function(err, newCreator) {
            assert.ifError(err);

            post._creator = newCreator._id;
            assert.equal(newCreator._id, String(post._creator));

            post.save(function(err) {
              assert.ifError(err);

              BlogPost
              .findById(post._id)
              .populate('_creator')
              .exec(function(err, post) {
                db.close();
                assert.ifError(err);
                assert.equal(post._creator.name, 'Aaron');
                assert.equal(post._creator.email, 'aaron.heckmann@gmail.com');
                done();
              });
            });
          });
        });
      });
    });
  });

  it('populating with partial fields selection and changing ref', function(done) {
    var db = start(),
        BlogPost = db.model('RefBlogPost', posts),
        User = db.model('RefUser', users);

    User.create({
      name: 'Guillermo',
      email: 'rauchg@gmail.com'
    }, function(err, creator) {
      assert.ifError(err);

      BlogPost.create({
        title: 'woot',
        _creator: creator
      }, function(err, post) {
        assert.ifError(err);

        BlogPost
        .findById(post._id)
        .populate('_creator', {'name': 1})
        .exec(function(err, post) {
          assert.ifError(err);

          assert.ok(post._creator instanceof User);
          assert.equal(post._creator.name, 'Guillermo');

          User.create({
            name: 'Aaron',
            email: 'aaron@learnboost.com'
          }, function(err, newCreator) {
            assert.ifError(err);

            post._creator = newCreator._id;
            post.save(function(err) {
              assert.ifError(err);

              BlogPost
              .findById(post._id)
              .populate('_creator', '-email')
              .exec(function(err, post) {
                db.close();
                assert.ifError(err);

                assert.equal(post._creator.name, 'Aaron');
                assert.ok(!post._creator.email);
                done();
              });
            });
          });
        });
      });
    });
  });

  it('populating an array of refs and fetching many', function(done) {
    var db = start(),
        BlogPost = db.model('RefBlogPost', posts),
        User = db.model('RefUser', users);

    User.create({
      name: 'Fan 1',
      email: 'fan1@learnboost.com'
    }, function(err, fan1) {
      assert.ifError(err);

      User.create({
        name: 'Fan 2',
        email: 'fan2@learnboost.com'
      }, function(err, fan2) {
        assert.ifError(err);

        BlogPost.create({
          title: 'Woot',
          fans: [fan1, fan2]
        }, function(err, post1) {
          assert.ifError(err);

          BlogPost.create({
            title: 'Woot',
            fans: [fan2, fan1]
          }, function(err, post2) {
            assert.ifError(err);

            BlogPost
            .find({_id: {$in: [post1._id, post2._id]}})
            .populate('fans')
            .exec(function(err, blogposts) {
              db.close();
              assert.ifError(err);

              assert.equal(blogposts[0].fans[0].name, 'Fan 1');
              assert.equal(blogposts[0].fans[0].email, 'fan1@learnboost.com');
              assert.equal(blogposts[0].fans[1].name, 'Fan 2');
              assert.equal(blogposts[0].fans[1].email, 'fan2@learnboost.com');

              assert.equal(blogposts[1].fans[0].name, 'Fan 2');
              assert.equal(blogposts[1].fans[0].email, 'fan2@learnboost.com');
              assert.equal(blogposts[1].fans[1].name, 'Fan 1');
              assert.equal(blogposts[1].fans[1].email, 'fan1@learnboost.com');
              done();
            });
          });
        });
      });
    });
  });

  it('an error in array reference population propagates', function(done) {
    var db = start(),
        BlogPost = db.model('RefBlogPost', posts + '2'),
        User = db.model('RefUser', users + '2');

    User.create({
      name: 'Fan 1',
      email: 'fan1@learnboost.com'
    }, function(err, fan1) {
      assert.ifError(err);

      User.create({
        name: 'Fan 2',
        email: 'fan2@learnboost.com'
      }, function(err, fan2) {
        assert.ifError(err);

        BlogPost.create({
          title: 'Woot',
          fans: [fan1, fan2]
        }, function(err, post1) {
          assert.ifError(err);

          BlogPost.create({
            title: 'Woot',
            fans: [fan2, fan1]
          }, function(err, post2) {
            assert.ifError(err);

            // mock an error
            var origExec = User.Query.prototype.exec;
            User.Query.prototype.exec = function() {
              var args = Array.prototype.map.call(arguments, function(arg) {
                return typeof arg === 'function' ? function() {
                  arg(new Error('woot 2'));
                } : arg;
              });
              return origExec.apply(this, args);
            };

            BlogPost
            .find({$or: [{_id: post1._id}, {_id: post2._id}]})
            .populate('fans')
            .exec(function(err) {
              db.close();

              assert.ok(err instanceof Error);
              assert.equal(err.message, 'woot 2');
              User.Query.prototype.exec = origExec;
              done();
            });
          });
        });
      });
    });
  });

  it('populating an array of references with fields selection', function(done) {
    var db = start(),
        BlogPost = db.model('RefBlogPost', posts),
        User = db.model('RefUser', users);

    User.create({
      name: 'Fan 1',
      email: 'fan1@learnboost.com'
    }, function(err, fan1) {
      assert.ifError(err);

      User.create({
        name: 'Fan 2',
        email: 'fan2@learnboost.com'
      }, function(err, fan2) {
        assert.ifError(err);

        BlogPost.create({
          title: 'Woot',
          fans: [fan1, fan2]
        }, function(err, post1) {
          assert.ifError(err);

          BlogPost.create({
            title: 'Woot',
            fans: [fan2, fan1]
          }, function(err, post2) {
            assert.ifError(err);

            BlogPost
            .find({_id: {$in: [post1._id, post2._id]}})
            .populate('fans', 'name')
            .exec(function(err, blogposts) {
              db.close();
              assert.ifError(err);

              assert.equal(blogposts[0].fans[0].name, 'Fan 1');
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
  });

  it('populating an array of references and filtering', function(done) {
    var db = start(),
        BlogPost = db.model('RefBlogPost', posts),
        User = db.model('RefUser', users);

    User.create({
      name: 'Fan 1',
      email: 'fan1@learnboost.com'
    }, function(err, fan1) {
      assert.ifError(err);

      User.create({
        name: 'Fan 2',
        email: 'fan2@learnboost.com',
        gender: 'female'
      }, function(err, fan2) {
        assert.ifError(err);

        User.create({
          name: 'Fan 3',
          email: 'fan3@learnboost.com',
          gender: 'female'
        }, function(err, fan3) {
          assert.ifError(err);

          BlogPost.create({
            title: 'Woot',
            fans: [fan1, fan2, fan3]
          }, function(err, post1) {
            assert.ifError(err);

            BlogPost.create({
              title: 'Woot',
              fans: [fan3, fan2, fan1]
            }, function(err, post2) {
              assert.ifError(err);

              BlogPost
              .find({_id: {$in: [post1._id, post2._id]}})
              .populate('fans', '', {gender: 'female', _id: {$in: [fan2]}})
              .exec(function(err, blogposts) {
                assert.ifError(err);

                assert.equal(blogposts[0].fans.length, 1);
                assert.equal(blogposts[0].fans[0].gender, 'female');
                assert.equal(blogposts[0].fans[0].name, 'Fan 2');
                assert.equal(blogposts[0].fans[0].email, 'fan2@learnboost.com');

                assert.equal(blogposts[1].fans.length, 1);
                assert.equal(blogposts[1].fans[0].gender, 'female');
                assert.equal(blogposts[1].fans[0].name, 'Fan 2');
                assert.equal(blogposts[1].fans[0].email, 'fan2@learnboost.com');

                BlogPost
                .find({_id: {$in: [post1._id, post2._id]}})
                .populate('fans', false, {gender: 'female'})
                .exec(function(err, blogposts) {
                  db.close();
                  assert.ifError(err);

                  assert.strictEqual(blogposts[0].fans.length, 2);
                  assert.equal(blogposts[0].fans[0].gender, 'female');
                  assert.equal(blogposts[0].fans[0].name, 'Fan 2');
                  assert.equal(blogposts[0].fans[0].email, 'fan2@learnboost.com');
                  assert.equal(blogposts[0].fans[1].gender, 'female');
                  assert.equal(blogposts[0].fans[1].name, 'Fan 3');
                  assert.equal(blogposts[0].fans[1].email, 'fan3@learnboost.com');

                  assert.strictEqual(blogposts[1].fans.length, 2);
                  assert.equal(blogposts[1].fans[0].gender, 'female');
                  assert.equal(blogposts[1].fans[0].name, 'Fan 3');
                  assert.equal(blogposts[1].fans[0].email, 'fan3@learnboost.com');
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

  it('populating an array of references and multi-filtering', function(done) {
    var db = start(),
        BlogPost = db.model('RefBlogPost', posts),
        User = db.model('RefUser', users);

    User.create({
      name: 'Fan 1',
      email: 'fan1@learnboost.com'
    }, function(err, fan1) {
      assert.ifError(err);

      User.create({
        name: 'Fan 2',
        email: 'fan2@learnboost.com',
        gender: 'female'
      }, function(err, fan2) {
        assert.ifError(err);

        User.create({
          name: 'Fan 3',
          email: 'fan3@learnboost.com',
          gender: 'female',
          age: 25
        }, function(err, fan3) {
          assert.ifError(err);

          BlogPost.create({
            title: 'Woot',
            fans: [fan1, fan2, fan3]
          }, function(err, post1) {
            assert.ifError(err);

            BlogPost.create({
              title: 'Woot',
              fans: [fan3, fan2, fan1]
            }, function(err, post2) {
              assert.ifError(err);

              BlogPost
              .find({_id: {$in: [post1._id, post2._id]}})
              .populate('fans', undefined, {_id: fan3})
              .exec(function(err, blogposts) {
                assert.ifError(err);

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

                BlogPost
                .find({_id: {$in: [post1._id, post2._id]}})
                .populate('fans', 0, {gender: 'female'})
                .exec(function(err, blogposts) {
                  db.close();
                  assert.ifError(err);

                  assert.equal(blogposts[0].fans.length, 2);
                  assert.equal(blogposts[0].fans[0].gender, 'female');
                  assert.equal(blogposts[0].fans[0].name, 'Fan 2');
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

  it('populating an array of references and multi-filtering with field selection', function(done) {
    var db = start(),
        BlogPost = db.model('RefBlogPost', posts),
        User = db.model('RefUser', users);

    User.create({
      name: 'Fan 1',
      email: 'fan1@learnboost.com'
    }, function(err, fan1) {
      assert.ifError(err);

      User.create({
        name: 'Fan 2',
        email: 'fan2@learnboost.com',
        gender: 'female'
      }, function(err, fan2) {
        assert.ifError(err);

        User.create({
          name: 'Fan 3',
          email: 'fan3@learnboost.com',
          gender: 'female',
          age: 25
        }, function(err, fan3) {
          assert.ifError(err);

          BlogPost.create({
            title: 'Woot',
            fans: [fan1, fan2, fan3]
          }, function(err, post1) {
            assert.ifError(err);

            BlogPost.create({
              title: 'Woot',
              fans: [fan3, fan2, fan1]
            }, function(err, post2) {
              assert.ifError(err);

              BlogPost
              .find({_id: {$in: [post1._id, post2._id]}})
              .populate('fans', 'name email', {gender: 'female', age: 25})
              .exec(function(err, blogposts) {
                db.close();
                assert.ifError(err);

                assert.strictEqual(blogposts[0].fans.length, 1);
                assert.equal(blogposts[0].fans[0].name, 'Fan 3');
                assert.equal(blogposts[0].fans[0].email, 'fan3@learnboost.com');
                assert.equal(blogposts[0].fans[0].isInit('email'), true);
                assert.equal(blogposts[0].fans[0].isInit('gender'), false);
                assert.equal(blogposts[0].fans[0].isInit('age'), false);

                assert.strictEqual(blogposts[1].fans.length, 1);
                assert.equal(blogposts[1].fans[0].name, 'Fan 3');
                assert.equal(blogposts[1].fans[0].email, 'fan3@learnboost.com');
                assert.equal(blogposts[1].fans[0].isInit('email'), true);
                assert.equal(blogposts[1].fans[0].isInit('gender'), false);
                assert.equal(blogposts[1].fans[0].isInit('age'), false);

                done();
              });
            });
          });
        });
      });
    });
  });

  it('populating an array of refs changing one and removing one', function(done) {
    var db = start(),
        BlogPost = db.model('RefBlogPost', posts),
        User = db.model('RefUser', users);

    User.create({
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
    }, function(err, fan1, fan2, fan3, fan4) {
      assert.ifError(err);

      BlogPost.create({
        title: 'Woot',
        fans: [fan1, fan2]
      }, {
        title: 'Woot',
        fans: [fan2, fan1]
      }, function(err, post1, post2) {
        assert.ifError(err);

        BlogPost
        .find({_id: {$in: [post1._id, post2._id]}})
        .populate('fans', 'name')
        .exec(function(err, blogposts) {
          assert.ifError(err);

          assert.equal(blogposts[0].fans[0].name, 'Fan 1');
          assert.equal(blogposts[0].fans[0].isInit('email'), false);
          assert.equal(blogposts[0].fans[1].name, 'Fan 2');
          assert.equal(blogposts[0].fans[1].isInit('email'), false);

          assert.equal(blogposts[1].fans[0].name, 'Fan 2');
          assert.equal(blogposts[1].fans[0].isInit('email'), false);
          assert.equal(blogposts[1].fans[1].name, 'Fan 1');
          assert.equal(blogposts[1].fans[1].isInit('email'), false);

          blogposts[1].fans = [fan3, fan4];

          blogposts[1].save(function(err) {
            assert.ifError(err);

            BlogPost
            .findById(blogposts[1]._id, '', {populate: ['fans']})
            .exec(function(err, post) {
              assert.ifError(err);

              assert.equal(post.fans[0].name, 'Fan 3');
              assert.equal(post.fans[1].name, 'Fan 4');

              post.fans.splice(0, 1);
              post.save(function(err) {
                assert.ifError(err);

                BlogPost
                .findById(post._id)
                .populate('fans')
                .exec(function(err, post) {
                  db.close();
                  assert.ifError(err);
                  assert.equal(post.fans.length, 1);
                  assert.equal(post.fans[0].name, 'Fan 4');
                  done();
                });
              });
            });
          });
        });
      });
    });
  });

  describe('populating sub docs', function() {
    it('works with findById', function(done) {
      var db = start(),
          BlogPost = db.model('RefBlogPost', posts),
          User = db.model('RefUser', users);

      User.create({name: 'User 1'}, function(err, user1) {
        assert.ifError(err);

        User.create({name: 'User 2'}, function(err, user2) {
          assert.ifError(err);

          BlogPost.create({
            title: 'Woot',
            _creator: user1._id,
            comments: [
              {_creator: user1._id, content: 'Woot woot'},
              {_creator: user2._id, content: 'Wha wha'}
            ]
          }, function(err, post) {
            assert.ifError(err);

            BlogPost
            .findById(post._id)
            .populate('_creator')
            .populate('comments._creator')
            .exec(function(err, post) {
              assert.ifError(err);

              assert.equal(post._creator.name, 'User 1');
              assert.equal(post.comments[0]._creator.name, 'User 1');
              assert.equal(post.comments[1]._creator.name, 'User 2');
              db.close(done);
            });
          });
        });
      });
    });

    it('works when first doc returned has empty array for populated path (gh-1055)', function(done) {
      var db = start(),
          BlogPost = db.model('RefBlogPost', posts),
          User = db.model('RefUser', users);

      User.create({name: 'gh-1055-1'}, {name: 'gh-1055-2'}, function(err, user1, user2) {
        assert.ifError(err);

        BlogPost.create({
          title: 'gh-1055 post1',
          _creator: user1._id,
          comments: []
        }, {
          title: 'gh-1055 post2',
          _creator: user1._id,
          comments: [
            {_creator: user1._id, content: 'Woot woot', asers: []},
            {_creator: user2._id, content: 'Wha wha', asers: [user1, user2]}
          ]
        }, function(err) {
          assert.ifError(err);

          var ran = false;
          BlogPost
          .find({title: /gh-1055/})
          .sort('title')
          .select('comments')
          .populate('comments._creator')
          .populate('comments.asers')
          .exec(function(err, posts) {
            assert.equal(ran, false);
            ran = true;
            assert.ifError(err);
            assert.ok(posts.length);
            assert.ok(posts[1].comments[0]._creator);
            assert.equal(posts[1].comments[0]._creator.name, 'gh-1055-1');
            db.close(done);
          });
        });
      });
    });
  });

  it('clears cache when array has been re-assigned (gh-2176)', function(done) {
    var db = start();
    var BlogPost = db.model('RefBlogPost', posts, 'gh-2176-1');
    var User = db.model('RefUser', users, 'gh-2176-2');

    User.create({name: 'aaron'}, {name: 'val'}, function(err, user1, user2) {
      assert.ifError(err);

      BlogPost.create(
        {
          title: 'gh-2176',
          _creator: user1._id,
          comments: []
        },
          function(err) {
            assert.ifError(err);
            BlogPost.
            find({title: 'gh-2176'}).
            populate('_creator').
            exec(function(error, posts) {
              assert.ifError(error);
              assert.equal(posts.length, 1);
              assert.equal(posts[0]._creator.name, 'aaron');
              posts[0]._creator = user2;
              assert.equal(posts[0]._creator.name, 'val');
              posts[0].save(function(error, post) {
                assert.ifError(error);
                assert.equal(post._creator.name, 'val');
                posts[0].populate('_creator', function(error, doc) {
                  assert.ifError(error);
                  assert.equal(doc._creator.name, 'val');
                  db.close(done);
                });
              });
            });
          });
    });
  });

  it('populating subdocuments partially', function(done) {
    var db = start(),
        BlogPost = db.model('RefBlogPost', posts),
        User = db.model('RefUser', users);

    User.create({
      name: 'User 1',
      email: 'user1@learnboost.com'
    }, function(err, user1) {
      assert.ifError(err);

      User.create({
        name: 'User 2',
        email: 'user2@learnboost.com'
      }, function(err, user2) {
        assert.ifError(err);

        BlogPost.create({
          title: 'Woot',
          comments: [
            {_creator: user1, content: 'Woot woot'},
            {_creator: user2, content: 'Wha wha'}
          ]
        }, function(err, post) {
          assert.ifError(err);

          BlogPost
          .findById(post._id)
          .populate('comments._creator', 'email')
          .exec(function(err, post) {
            db.close();
            assert.ifError(err);

            assert.equal(post.comments[0]._creator.email, 'user1@learnboost.com');
            assert.equal(post.comments[0]._creator.isInit('name'), false);
            assert.equal(post.comments[1]._creator.email, 'user2@learnboost.com');
            assert.equal(post.comments[1]._creator.isInit('name'), false);

            done();
          });
        });
      });
    });
  });

  it('populating subdocuments partially with conditions', function(done) {
    var db = start(),
        BlogPost = db.model('RefBlogPost', posts),
        User = db.model('RefUser', users);

    User.create({
      name: 'User 1',
      email: 'user1@learnboost.com'
    }, function(err, user1) {
      assert.ifError(err);

      User.create({
        name: 'User 2',
        email: 'user2@learnboost.com'
      }, function(err, user2) {
        assert.ifError(err);

        BlogPost.create({
          title: 'Woot',
          comments: [
            {_creator: user1, content: 'Woot woot'},
            {_creator: user2, content: 'Wha wha'}
          ]
        }, function(err, post) {
          assert.ifError(err);

          BlogPost
          .findById(post._id)
          .populate('comments._creator', {'email': 1}, {name: /User/})
          .exec(function(err, post) {
            db.close();
            assert.ifError(err);

            assert.equal(post.comments[0]._creator.email, 'user1@learnboost.com');
            assert.equal(post.comments[0]._creator.isInit('name'), false);
            assert.equal(post.comments[1]._creator.email, 'user2@learnboost.com');
            assert.equal(post.comments[1]._creator.isInit('name'), false);

            done();
          });
        });
      });
    });
  });

  it('populating subdocs with invalid/missing subproperties', function(done) {
    var db = start(),
        BlogPost = db.model('RefBlogPost', posts),
        User = db.model('RefUser', users);

    User.create({
      name: 'T-100',
      email: 'terminator100@learnboost.com'
    }, function(err) {
      assert.ifError(err);

      User.create({
        name: 'T-1000',
        email: 'terminator1000@learnboost.com'
      }, function(err, user2) {
        assert.ifError(err);

        BlogPost.create({
          title: 'Woot',
          comments: [
            {_creator: null, content: 'Woot woot'},
            {_creator: user2, content: 'Wha wha'}
          ]
        }, function(err, post) {
          assert.ifError(err);

          // non-existant subprop
          BlogPost
          .findById(post._id)
          .populate('comments._idontexist', 'email')
          .exec(function(err) {
            assert.ifError(err);

            // add a non-schema property to the document.
            BlogPost.collection.update(
                {_id: post._id}
                , {$set: {'comments.0._idontexist': user2._id}}, function(err) {
                  assert.ifError(err);

                  // allow population of unknown property by passing model name.
                  // helpful when populating mapReduce results too.
                  BlogPost
                  .findById(post._id)
                  .populate('comments._idontexist', 'email', 'RefUser')
                  .exec(function(err, post) {
                    assert.ifError(err);
                    assert.ok(post);
                    assert.equal(post.comments.length, 2);
                    assert.ok(post.comments[0].get('_idontexist'));
                    assert.equal(String(post.comments[0].get('_idontexist')._id), user2.id);
                    assert.equal(post.comments[0].get('_idontexist').email, 'terminator1000@learnboost.com');
                    assert.equal(post.comments[0].get('_idontexist').isInit('name'), false);
                    assert.strictEqual(post.comments[0]._creator, null);
                    assert.equal(post.comments[1]._creator.toString(), user2.id);

                    // subprop is null in a doc
                    BlogPost
                    .findById(post._id)
                    .populate('comments._creator', 'email')
                    .exec(function(err, post) {
                      assert.ifError(err);

                      assert.ok(post.comments);
                      assert.equal(post.comments.length, 2);
                      assert.strictEqual(post.comments[0]._creator, null);
                      assert.strictEqual(post.comments[0].content, 'Woot woot');
                      assert.equal(post.comments[1]._creator.email, 'terminator1000@learnboost.com');
                      assert.equal(post.comments[1]._creator.isInit('name'), false);
                      assert.equal(post.comments[1].content, 'Wha wha');

                      db.close(done);
                    });
                  });
                });
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

    var blogpost = new Schema({
      title: String,
      tags: [String],
      author: {
        type: Schema.ObjectId,
        ref: 'gh-2151-1'
      }
    });
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

        BlogPost.
        find({tags: 'fun'}).
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
            assert.equal(docs.length, 2);
            assert.equal(docs[0].author.friends.length, 1);
            assert.equal(docs[1].author.friends.length, 1);
            assert.equal(opts.options.limit, 1);
            db.close(done);
          });
        });
      });
    });
  });

  it('populating subdocuments partially with empty array (gh-481)', function(done) {
    var db = start(),
        BlogPost = db.model('RefBlogPost', posts);

    BlogPost.create({
      title: 'Woot',
      comments: [] // EMPTY ARRAY
    }, function(err, post) {
      assert.ifError(err);

      BlogPost
      .findById(post._id)
      .populate('comments._creator', 'email')
      .exec(function(err, returned) {
        db.close();
        assert.ifError(err);
        assert.equal(returned.id, post.id);
        done();
      });
    });
  });

  it('populating subdocuments partially with null array', function(done) {
    var db = start(),
        BlogPost = db.model('RefBlogPost', posts);

    BlogPost.create({
      title: 'Woot',
      comments: null
    }, function(err, post) {
      assert.ifError(err);

      BlogPost
      .findById(post._id)
      .populate('comments._creator')
      .exec(function(err, returned) {
        db.close();
        assert.ifError(err);
        assert.equal(returned.id, post.id);
        done();
      });
    });
  });

  it('populating subdocuments with array including nulls', function(done) {
    var db = start(),
        BlogPost = db.model('RefBlogPost', posts),
        User = db.model('RefUser', users);

    var user = new User({name: 'hans zimmer'});
    user.save(function(err) {
      assert.ifError(err);

      BlogPost.create({
        title: 'Woot',
        fans: []
      }, function(err, post) {
        assert.ifError(err);

        // shove some uncasted vals
        BlogPost.collection.update({_id: post._id}, {$set: {fans: [null, undefined, user.id, null]}}, function(err) {
          assert.ifError(err);

          BlogPost
          .findById(post._id)
          .populate('fans', 'name')
          .exec(function(err, returned) {
            db.close();
            assert.ifError(err);
            assert.equal(returned.id, post.id);
            assert.equal(returned.fans.length, 1);
            done();
          });
        });
      });
    });
  });

  it('populating more than one array at a time', function(done) {
    var db = start(),
        User = db.model('RefUser', users),
        M = db.model('PopMultiSubDocs', new Schema({
          users: [{type: ObjectId, ref: 'RefUser'}],
          fans: [{type: ObjectId, ref: 'RefUser'}],
          comments: [Comment]
        }));

    User.create({
      email: 'fan1@learnboost.com'
    }, {
      name: 'Fan 2',
      email: 'fan2@learnboost.com',
      gender: 'female'
    }, {
      name: 'Fan 3'
    }, function(err, fan1, fan2, fan3) {
      assert.ifError(err);

      M.create({
        users: [fan3],
        fans: [fan1],
        comments: [
          {_creator: fan1, content: 'bejeah!'},
          {_creator: fan2, content: 'chickfila'}
        ]
      }, {
        users: [fan1],
        fans: [fan2],
        comments: [
          {_creator: fan3, content: 'hello'},
          {_creator: fan1, content: 'world'}
        ]
      }, function(err, post1, post2) {
        assert.ifError(err);

        M.where('_id').in([post1, post2])
        .populate('fans', 'name', {gender: 'female'})
        .populate('users', 'name', {gender: 'male'})
        .populate('comments._creator', 'email', {name: null})
        .exec(function(err, posts) {
          db.close();
          assert.ifError(err);

          assert.ok(posts);
          assert.equal(posts.length, 2);
          var p1 = posts[0];
          var p2 = posts[1];
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

          done();
        });
      });
    });
  });

  it('populating multiple children of a sub-array at a time', function(done) {
    var db = start(),
        User = db.model('RefUser', users),
        BlogPost = db.model('RefBlogPost', posts),
        Inner = new Schema({
          user: {type: ObjectId, ref: 'RefUser'},
          post: {type: ObjectId, ref: 'RefBlogPost'}
        });
    db.model('PopMultiChildrenOfSubDocInner', Inner);

    var M = db.model('PopMultiChildrenOfSubDoc', new Schema({
      kids: [Inner]
    }));

    User.create({
      name: 'Fan 1',
      email: 'fan1@learnboost.com',
      gender: 'male'
    }, {
      name: 'Fan 2',
      email: 'fan2@learnboost.com',
      gender: 'female'
    }, function(err, fan1, fan2) {
      assert.ifError(err);

      BlogPost.create({
        title: 'woot'
      }, {
        title: 'yay'
      }, function(err, post1, post2) {
        assert.ifError(err);
        M.create({
          kids: [
            {user: fan1, post: post1, y: 5},
            {user: fan2, post: post2, y: 8}
          ],
          x: 4
        }, function(err, m1) {
          assert.ifError(err);

          M.findById(m1)
          .populate('kids.user', 'name')
          .populate('kids.post', 'title', {title: 'woot'})
          .exec(function(err, o) {
            db.close();
            assert.ifError(err);
            assert.strictEqual(o.kids.length, 2);
            var k1 = o.kids[0];
            var k2 = o.kids[1];
            assert.strictEqual(true, !k2.post);
            assert.strictEqual(k1.user.name, 'Fan 1');
            assert.strictEqual(k1.user.email, undefined);
            assert.strictEqual(k1.post.title, 'woot');
            assert.strictEqual(k2.user.name, 'Fan 2');

            done();
          });
        });
      });
    });
  });

  it('passing sort options to the populate method', function(done) {
    var db = start(),
        P = db.model('RefBlogPost', posts),
        User = db.model('RefUser', users);

    User.create(
        {name: 'aaron', age: 10},
        {name: 'fan2', age: 8},
        {name: 'someone else', age: 3},
        {name: 'val', age: 3},
        function(err, fan1, fan2, fan3, fan4) {
          assert.ifError(err);

          P.create({fans: [fan4, fan2, fan3, fan1]}, function(err, post) {
            assert.ifError(err);

            P.findById(post)
            .populate('fans', null, null, {sort: {age: 1, name: 1}})
            .exec(function(err, post) {
              assert.ifError(err);

              assert.equal(post.fans.length, 4);
              assert.equal(post.fans[0].name, 'someone else');
              assert.equal(post.fans[1].name, 'val');
              assert.equal(post.fans[2].name, 'fan2');
              assert.equal(post.fans[3].name, 'aaron');

              P.findById(post)
              .populate('fans', 'name', null, {sort: {'name': -1}})
              .exec(function(err, post) {
                assert.ifError(err);

                assert.equal(post.fans.length, 4);
                assert.equal(post.fans[3].name, 'aaron');
                assert.strictEqual(undefined, post.fans[3].age);
                assert.equal(post.fans[2].name, 'fan2');
                assert.strictEqual(undefined, post.fans[2].age);
                assert.equal(post.fans[1].name, 'someone else');
                assert.strictEqual(undefined, post.fans[1].age);
                assert.equal(post.fans[0].name, 'val');
                assert.strictEqual(undefined, post.fans[0].age);

                P.findById(post)
                .populate('fans', 'age', {age: {$gt: 3}}, {sort: {'name': 'desc'}})
                .exec(function(err, post) {
                  db.close();
                  assert.ifError(err);

                  assert.equal(post.fans.length, 2);
                  assert.equal(post.fans[1].age.valueOf(), 10);
                  assert.equal(post.fans[0].age.valueOf(), 8);

                  done();
                });
              });
            });
          });
        });
  });

  it('limit should apply to each returned doc, not in aggregate (gh-1490)', function(done) {
    var db = start();
    var sB = new Schema({
      name: String
    });
    var name = 'b' + random();
    var sJ = new Schema({
      b: [{type: Schema.Types.ObjectId, ref: name}]
    });
    var B = db.model(name, sB);
    var J = db.model('j' + random(), sJ);

    var b1 = new B({name: 'thing1'});
    var b2 = new B({name: 'thing2'});
    var b3 = new B({name: 'thing3'});
    var b4 = new B({name: 'thing4'});
    var b5 = new B({name: 'thing5'});

    var j1 = new J({b: [b1.id, b2.id, b5.id]});
    var j2 = new J({b: [b3.id, b4.id, b5.id]});

    var count = 7;

    b1.save(cb);
    b2.save(cb);
    b3.save(cb);
    b4.save(cb);
    b5.save(cb);
    j1.save(cb);
    j2.save(cb);

    function cb(err) {
      if (err) {
        throw err;
      }
      --count || next();
    }

    function next() {
      J.find().populate({path: 'b', options: {limit: 2}}).exec(function(err, j) {
        assert.equal(j.length, 2);
        assert.equal(j[0].b.length, 2);
        assert.equal(j[1].b.length, 2);
        db.close(done);
      });
    }
  });

  it('refs should cast to ObjectId from hexstrings', function(done) {
    var BP = mongoose.model('RefBlogPost', BlogPost);
    var bp = new BP;
    bp._creator = new DocObjectId().toString();
    assert.ok(bp._creator instanceof DocObjectId);
    bp.set('_creator', new DocObjectId().toString());
    assert.ok(bp._creator instanceof DocObjectId);
    done();
  });

  it('populate should work on String _ids', function(done) {
    var db = start();

    var UserSchema = new Schema({
      _id: String,
      name: String
    });

    var NoteSchema = new Schema({
      author: {type: String, ref: 'UserWithStringId'},
      body: String
    });

    var User = db.model('UserWithStringId', UserSchema, random());
    var Note = db.model('NoteWithStringId', NoteSchema, random());

    var alice = new User({_id: 'alice', name: 'Alice'});

    alice.save(function(err) {
      assert.ifError(err);

      var note = new Note({author: 'alice', body: 'Buy Milk'});
      note.save(function(err) {
        assert.ifError(err);

        Note.findById(note.id).populate('author').exec(function(err, note) {
          db.close();
          assert.ifError(err);
          assert.equal(note.body, 'Buy Milk');
          assert.ok(note.author);
          assert.equal(note.author.name, 'Alice');
          done();
        });
      });
    });
  });

  it('populate should work on Number _ids', function(done) {
    var db = start();

    var UserSchema = new Schema({
      _id: Number,
      name: String
    });

    var NoteSchema = new Schema({
      author: {type: Number, ref: 'UserWithNumberId'},
      body: String
    });

    var User = db.model('UserWithNumberId', UserSchema, random());
    var Note = db.model('NoteWithNumberId', NoteSchema, random());

    var alice = new User({_id: 2359, name: 'Alice'});

    alice.save(function(err) {
      assert.ifError(err);

      var note = new Note({author: 2359, body: 'Buy Milk'});
      note.save(function(err) {
        assert.ifError(err);

        Note.findById(note.id).populate('author').exec(function(err, note) {
          db.close();
          assert.ifError(err);
          assert.equal(note.body, 'Buy Milk');
          assert.ok(note.author);
          assert.equal(note.author.name, 'Alice');
          done();
        });
      });
    });
  });

  it('required works on ref fields (gh-577)', function(done) {
    var db = start();

    var userSchema = new Schema({
      email: {type: String, required: true}
    });
    var User = db.model('ObjectIdRefRequiredField', userSchema, random());

    var numSchema = new Schema({_id: Number, val: Number});
    var Num = db.model('NumberRefRequired', numSchema, random());

    var strSchema = new Schema({_id: String, val: String});
    var Str = db.model('StringRefRequired', strSchema, random());

    var commentSchema = new Schema({
      user: {type: ObjectId, ref: 'ObjectIdRefRequiredField', required: true},
      num: {type: Number, ref: 'NumberRefRequired', required: true},
      str: {type: String, ref: 'StringRefRequired', required: true},
      text: String
    });
    var Comment = db.model('CommentWithRequiredField', commentSchema);

    var pending = 3;

    var string = new Str({_id: 'my string', val: 'hello'});
    var number = new Num({_id: 1995, val: 234});
    var user = new User({email: 'test'});

    string.save(next);
    number.save(next);
    user.save(next);

    function next(err) {
      assert.strictEqual(err, null);
      if (--pending) {
        return;
      }

      var comment = new Comment({
        text: 'test'
      });

      comment.save(function(err) {
        assert.ok(err);
        assert.ok(err.message.indexOf('CommentWithRequiredField validation failed') === 0, err.message);
        assert.ok('num' in err.errors);
        assert.ok('str' in err.errors);
        assert.ok('user' in err.errors);
        assert.equal(err.errors.num.kind, 'required');
        assert.equal(err.errors.str.kind, 'required');
        assert.equal(err.errors.user.kind, 'required');

        comment.user = user;
        comment.num = 1995;
        comment.str = 'my string';

        comment.save(function(err, comment) {
          assert.strictEqual(err, null);

          Comment
          .findById(comment.id)
          .populate('user')
          .populate('num')
          .populate('str')
          .exec(function(err, comment) {
            assert.ifError(err);

            comment.set({text: 'test2'});

            comment.save(function(err) {
              db.close();
              assert.ifError(err);
              done();
            });
          });
        });
      });
    }
  });

  it('populate works with schemas with both id and _id defined', function(done) {
    var db = start(),
        S1 = new Schema({id: String}),
        S2 = new Schema({things: [{type: ObjectId, ref: '_idAndid'}]});

    var M1 = db.model('_idAndid', S1);
    var M2 = db.model('populateWorksWith_idAndidSchemas', S2);

    M1.create(
        {id: 'The Tiger That Isn\'t'}
        , {id: 'Users Guide To The Universe'}
        , function(err, a, b) {
          assert.ifError(err);

          var m2 = new M2({things: [a, b]});
          m2.save(function(err) {
            assert.ifError(err);
            M2.findById(m2).populate('things').exec(function(err, doc) {
              db.close();
              assert.ifError(err);
              assert.equal(doc.things.length, 2);
              assert.equal(doc.things[0].id, 'The Tiger That Isn\'t');
              assert.equal(doc.things[1].id, 'Users Guide To The Universe');
              done();
            });
          });
        });
  });

  it('Update works with populated arrays (gh-602)', function(done) {
    var db = start(),
        BlogPost = db.model('RefBlogPost', posts),
        User = db.model('RefUser', users);

    User.create({name: 'aphex'}, {name: 'twin'}, function(err, u1, u2) {
      assert.ifError(err);

      BlogPost.create({
        title: 'Woot',
        fans: []
      }, function(err, post) {
        assert.ifError(err);

        var update = {fans: [u1, u2]};
        BlogPost.update({_id: post}, update, function(err) {
          assert.ifError(err);

          // the original update doc should not be modified
          assert.ok('fans' in update);
          assert.ok(!('$set' in update));
          assert.ok(update.fans[0] instanceof mongoose.Document);
          assert.ok(update.fans[1] instanceof mongoose.Document);

          BlogPost.findById(post, function(err, post) {
            db.close();
            assert.ifError(err);
            assert.equal(post.fans.length, 2);
            assert.ok(post.fans[0] instanceof DocObjectId);
            assert.ok(post.fans[1] instanceof DocObjectId);
            done();
          });
        });
      });
    });
  });

  it('toJSON should also be called for refs (gh-675)', function(done) {
    var db = start(),
        BlogPost = db.model('RefBlogPost', posts),
        User = db.model('RefUser', users);

    User.prototype._toJSON = User.prototype.toJSON;
    User.prototype.toJSON = function() {
      var res = this._toJSON();
      res.was_in_to_json = true;
      return res;
    };

    BlogPost.prototype._toJSON = BlogPost.prototype.toJSON;
    BlogPost.prototype.toJSON = function() {
      var res = this._toJSON();
      res.was_in_to_json = true;
      return res;
    };

    User.create({
      name: 'Jerem',
      email: 'jerem@jolicloud.com'
    }, function(err, creator) {
      assert.ifError(err);

      BlogPost.create({
        title: 'Ping Pong',
        _creator: creator
      }, function(err, post) {
        assert.ifError(err);

        BlogPost
        .findById(post._id)
        .populate('_creator')
        .exec(function(err, post) {
          db.close();
          assert.ifError(err);

          var json = post.toJSON();
          assert.equal(true, json.was_in_to_json);
          assert.equal(json._creator.was_in_to_json, true);
          done();
        });
      });
    });
  });

  it('populate should work on Buffer _ids (gh-686)', function(done) {
    var db = start();

    var UserSchema = new Schema({
      _id: Buffer,
      name: String
    });

    var NoteSchema = new Schema({
      author: {type: Buffer, ref: 'UserWithBufferId'},
      body: String
    });

    var User = db.model('UserWithBufferId', UserSchema, random());
    var Note = db.model('NoteWithBufferId', NoteSchema, random());

    var alice = new User({_id: new mongoose.Types.Buffer('YWxpY2U=', 'base64'), name: 'Alice'});

    alice.save(function(err) {
      assert.ifError(err);

      var note = new Note({author: 'alice', body: 'Buy Milk'});
      note.save(function(err) {
        assert.ifError(err);

        Note.findById(note.id).populate('author').exec(function(err, note) {
          db.close();
          assert.ifError(err);
          assert.equal(note.body, 'Buy Milk');
          assert.ok(note.author);
          assert.equal(note.author.name, 'Alice');
          done();
        });
      });
    });
  });

  it('populated Buffer _ids should be requireable', function(done) {
    var db = start();

    var UserSchema = new Schema({
      _id: Buffer,
      name: String
    });

    var NoteSchema = new Schema({
      author: {type: Buffer, ref: 'UserWithBufferId', required: true},
      body: String
    });

    var User = db.model('UserWithBufferId', UserSchema, random());
    var Note = db.model('NoteWithBufferId', NoteSchema, random());

    var alice = new User({_id: new mongoose.Types.Buffer('YWxpY2U=', 'base64'), name: 'Alice'});

    alice.save(function(err) {
      assert.ifError(err);

      var note = new Note({author: 'alice', body: 'Buy Milk'});
      note.save(function(err) {
        assert.ifError(err);

        Note.findById(note.id).populate('author').exec(function(err, note) {
          assert.ifError(err);
          note.save(function(err) {
            db.close();
            assert.ifError(err);
            done();
          });
        });
      });
    });
  });

  it('populating with custom model selection (gh-773)', function(done) {
    var db = start(),
        BlogPost = db.model('RefBlogPost', posts),
        User = db.model('RefAlternateUser', users);

    User.create({
      name: 'Daniel',
      email: 'daniel.baulig@gmx.de'
    }, function(err, creator) {
      assert.ifError(err);

      BlogPost.create({
        title: 'woot',
        _creator: creator
      }, function(err, post) {
        assert.ifError(err);

        BlogPost
        .findById(post._id)
        .populate('_creator', 'email', 'RefAlternateUser')
        .exec(function(err, post) {
          db.close();
          assert.ifError(err);

          assert.ok(post._creator instanceof User);
          assert.equal(post._creator.isInit('name'), false);
          assert.equal(post._creator.email, 'daniel.baulig@gmx.de');

          done();
        });
      });
    });
  });

  describe('specifying a custom model without specifying a ref in schema', function() {
    it('with String _id', function(done) {
      var db = start();
      var A = db.model('A', {name: String, _id: String});
      var B = db.model('B', {other: String});
      A.create({name: 'hello', _id: 'first'}, function(err, a) {
        if (err) {
          return done(err);
        }
        B.create({other: a._id}, function(err, b) {
          if (err) {
            return done(err);
          }
          B.findById(b._id).populate({path: 'other', model: 'A'}).exec(function(err, b) {
            db.close();
            if (err) {
              return done(err);
            }
            assert.equal(b.other.name, 'hello');
            done();
          });
        });
      });
    });
    it('with Number _id', function(done) {
      var db = start();
      var A = db.model('A', {name: String, _id: Number});
      var B = db.model('B', {other: Number});
      A.create({name: 'hello', _id: 3}, function(err, a) {
        if (err) {
          return done(err);
        }
        B.create({other: a._id}, function(err, b) {
          if (err) {
            return done(err);
          }
          B.findById(b._id).populate({path: 'other', model: 'A'}).exec(function(err, b) {
            db.close();
            if (err) {
              return done(err);
            }
            assert.equal(b.other.name, 'hello');
            done();
          });
        });
      });
    });
    it('with Buffer _id', function(done) {
      var db = start();
      var A = db.model('A', {name: String, _id: Buffer});
      var B = db.model('B', {other: Buffer});
      A.create({name: 'hello', _id: new Buffer('x')}, function(err, a) {
        if (err) {
          return done(err);
        }
        B.create({other: a._id}, function(err, b) {
          if (err) {
            return done(err);
          }
          B.findById(b._id).populate({path: 'other', model: 'A'}).exec(function(err, b) {
            db.close();
            if (err) {
              return done(err);
            }
            assert.equal(b.other.name, 'hello');
            done();
          });
        });
      });
    });
    it('with ObjectId _id', function(done) {
      var db = start();
      var A = db.model('A', {name: String});
      var B = db.model('B', {other: Schema.ObjectId});
      A.create({name: 'hello'}, function(err, a) {
        if (err) {
          return done(err);
        }
        B.create({other: a._id}, function(err, b) {
          if (err) {
            return done(err);
          }
          B.findById(b._id).populate({path: 'other', model: 'A'}).exec(function(err, b) {
            db.close();
            if (err) {
              return done(err);
            }
            assert.equal(b.other.name, 'hello');
            done();
          });
        });
      });
    });
  });

  describe('specifying all params using an object', function() {
    var db, B, User;
    var post;

    before(function(done) {
      db = start();
      B = db.model('RefBlogPost');
      User = db.model('RefAlternateUser');

      User.create({
        name: 'use an object',
        email: 'fo-real@objects.r.fun'
      }
          , {name: 'yup'}
          , {name: 'not here'}
          , function(err, fan1, fan2, fan3) {
            assert.ifError(err);

            B.create({
              title: 'woot',
              fans: [fan1, fan2, fan3]
            }, function(err, post_) {
              assert.ifError(err);
              post = post_;
              done();
            });
          });
    });

    after(function(done) {
      db.close(done);
    });

    it('works', function(done) {
      B.findById(post._id)
      .populate({
        path: 'fans',
        select: 'name',
        model: 'RefAlternateUser',
        match: {name: /u/},
        options: {sort: {name: -1}}
      })
      .exec(function(err, post) {
        assert.ifError(err);

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

        done();
      });
    });
  });

  describe('Model.populate()', function() {
    var db, B, User;
    var user1, user2, post1, post2, _id;

    before(function(done) {
      db = start();
      B = db.model('RefBlogPost', posts);
      User = db.model('RefAlternateUser', users);

      _id = new mongoose.Types.ObjectId;

      User.create({
        name: 'Phoenix',
        email: 'phx@az.com',
        blogposts: [_id]
      }, {
        name: 'Newark',
        email: 'ewr@nj.com',
        blogposts: [_id]
      }, function(err, u1, u2) {
        assert.ifError(err);

        user1 = u1;
        user2 = u2;

        B.create({
          title: 'the how and why',
          _creator: user1,
          fans: [user1, user2]
        }, {
          title: 'green eggs and ham',
          _creator: user2,
          fans: [user2, user1]
        }, function(err, p1, p2) {
          assert.ifError(err);
          post1 = p1;
          post2 = p2;
          done();
        });
      });
    });

    after(function(done) {
      db.close(done);
    });

    describe('returns', function() {
      it('a promise', function(done) {
        var p = B.populate(post1, '_creator');
        assert.ok(p instanceof mongoose.Promise);
        p.then(success, done).end();
        function success(doc) {
          assert.ok(doc);
          done();
        }
      });
    });

    describe('of individual document', function() {
      it('works', function(done) {
        B.findById(post1._id, function(error, post1) {
          var ret = utils.populate({path: '_creator', model: 'RefAlternateUser'});
          B.populate(post1, ret, function(err, post) {
            assert.ifError(err);
            assert.ok(post);
            assert.ok(post._creator instanceof User);
            assert.equal(post._creator.name, 'Phoenix');
            done();
          });
        });
      });
    });

    describe('a document already populated', function() {
      describe('when paths are not modified', function() {
        it('works', function(done) {
          B.findById(post1._id, function(err, doc) {
            assert.ifError(err);
            B.populate(doc, [{path: '_creator', model: 'RefAlternateUser'}, {path: 'fans', model: 'RefAlternateUser'}], function(err, post) {
              assert.ifError(err);
              assert.ok(post);
              assert.ok(post._creator instanceof User);
              assert.equal('Phoenix', post._creator.name);
              assert.equal(post.fans.length, 2);
              assert.equal(post.fans[0].name, user1.name);
              assert.equal(post.fans[1].name, user2.name);

              assert.equal(String(post._creator._id), String(post.populated('_creator')));
              assert.ok(Array.isArray(post.populated('fans')));

              B.populate(doc, [{path: '_creator', model: 'RefAlternateUser'}, {path: 'fans', model: 'RefAlternateUser'}], function(err, post) {
                assert.ifError(err);
                assert.ok(post);
                assert.ok(post._creator instanceof User);
                assert.equal(post._creator.name, 'Phoenix');
                assert.equal(post.fans.length, 2);
                assert.equal(post.fans[0].name, user1.name);
                assert.equal(post.fans[1].name, user2.name);
                assert.ok(Array.isArray(post.populated('fans')));
                assert.equal(String(post.fans[0]._id), String(post.populated('fans')[0]));
                assert.equal(String(post.fans[1]._id), String(post.populated('fans')[1]));

                done();
              });
            });
          });
        });
      });
      describe('when paths are modified', function() {
        it('works', function(done) {
          B.findById(post1._id, function(err, doc) {
            assert.ifError(err);
            B.populate(doc, [{path: '_creator', model: 'RefAlternateUser'}, {path: 'fans', model: 'RefAlternateUser'}], function(err, post) {
              assert.ifError(err);
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

              B.populate(doc, [{path: '_creator', model: 'RefAlternateUser'}, {path: 'fans', model: 'RefAlternateUser'}], function(err, post) {
                assert.ifError(err);
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

                done();
              });
            });
          });
        });
      });
    });

    describe('of multiple documents', function() {
      it('works', function(done) {
        B.findById(post1._id, function(error, post1) {
          assert.ifError(error);
          B.findById(post2._id, function(error, post2) {
            assert.ifError(error);
            var ret = utils.populate({path: '_creator', model: 'RefAlternateUser'});
            B.populate([post1, post2], ret, function(err, posts) {
              assert.ifError(err);
              assert.ok(posts);
              assert.equal(posts.length, 2);
              var p1 = posts[0];
              var p2 = posts[1];
              assert.ok(p1._creator instanceof User);
              assert.equal(p1._creator.name, 'Phoenix');
              assert.ok(p2._creator instanceof User);
              assert.equal(p2._creator.name, 'Newark');
              done();
            });
          });
        });
      });
    });
  });

  describe('populating combined with lean (gh-1260)', function() {
    it('with findOne', function(done) {
      var db = start(),
          BlogPost = db.model('RefBlogPost', posts + random()),
          User = db.model('RefUser', users + random());

      User.create({
        name: 'Guillermo',
        email: 'rauchg@gmail.com'
      }, function(err, creator) {
        assert.ifError(err);

        BlogPost.create({
          title: 'woot',
          _creator: creator
        }, function(err, post) {
          assert.ifError(err);

          BlogPost
          .findById(post._id)
          .lean()
          .populate('_creator')
          .exec(function(err, post) {
            db.close();
            assert.ifError(err);

            assert.ok(utils.isObject(post._creator));
            assert.equal(post._creator.name, 'Guillermo');
            assert.equal(post._creator.email, 'rauchg@gmail.com');
            assert.equal(typeof post._creator.update, 'undefined');
            done();
          });
        });
      });
    });

    it('with find', function(done) {
      var db = start(),
          BlogPost = db.model('RefBlogPost', posts + random()),
          User = db.model('RefUser', users + random());

      User.create({
        name: 'Fan 1',
        email: 'fan1@learnboost.com'
      }, {
        name: 'Fan 2',
        email: 'fan2@learnboost.com'
      }, function(err, fan1, fan2) {
        assert.ifError(err);

        BlogPost.create({
          title: 'Woot',
          fans: [fan1, fan2]
        }, {
          title: 'Woot2',
          fans: [fan2, fan1]
        }, function(err, post1, post2) {
          assert.ifError(err);

          BlogPost
          .find({_id: {$in: [post1._id, post2._id]}})
          .populate('fans')
          .lean()
          .exec(function(err, blogposts) {
            assert.ifError(err);

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
            db.close(done);
          });
        });
      });
    });
  });

  describe('records paths and _ids used in population', function() {
    var db;
    var B;
    var U;
    var u1, u2;
    var b1;

    before(function(done) {
      db = start();
      B = db.model('RefBlogPost', posts + random());
      U = db.model('RefUser', users + random());

      U.create({
        name: 'Fan 1',
        email: 'fan1@learnboost.com'
      }, {
        name: 'Fan 2',
        email: 'fan2@learnboost.com'
      }, function(err, fan1, fan2) {
        assert.ifError(err);
        u1 = fan1;
        u2 = fan2;

        B.create({
          title: 'Woot',
          fans: [fan1, fan2],
          _creator: fan1
        }, {
          title: 'Woot2',
          fans: [fan2, fan1],
          _creator: fan2
        }, function(err, post) {
          assert.ifError(err);
          b1 = post;
          done();
        });
      });
    });

    after(function() {
      db.close();
    });

    it('with findOne', function(done) {
      B.findById(b1).populate('fans _creator').exec(function(err, doc) {
        assert.ifError(err);
        assert.ok(Array.isArray(doc.populated('fans')));
        assert.equal(doc.populated('fans').length, 2);
        assert.equal(doc.populated('fans')[0], String(u1._id));
        assert.equal(doc.populated('fans')[1], String(u2._id));
        assert.equal(doc.populated('_creator'), String(u1._id));
        done();
      });
    });

    it('with find', function(done) {
      B.find().sort('title').populate('fans _creator').exec(function(err, docs) {
        assert.ifError(err);
        assert.equal(docs.length, 2);

        var doc1 = docs[0];
        var doc2 = docs[1];

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
        done();
      });
    });
  });

  describe('deselecting _id', function() {
    var db, C, U, c1, c2;
    before(function(done) {
      db = start();

      C = db.model('Comment', Schema({
        body: 'string', title: String
      }), 'comments_' + random());

      U = db.model('User', Schema({
        name: 'string',
        comments: [{type: Schema.ObjectId, ref: 'Comment'}],
        comment: {type: Schema.ObjectId, ref: 'Comment'}
      }), 'users_' + random());

      C.create({body: 'comment 1', title: '1'}, {body: 'comment 2', title: 2}, function(err, c1_, c2_) {
        assert.ifError(err);
        c1 = c1_;
        c2 = c2_;

        U.create(
            {name: 'u1', comments: [c1, c2], comment: c1}
            , {name: 'u2', comment: c2}
            , function(err) {
              assert.ifError(err);
              done();
            });
      });
    });

    after(function(done) {
      db.close(done);
    });

    describe('in a subdocument', function() {
      it('works', function(done) {
        U.find({name: 'u1'}).populate('comments', {_id: 0}).exec(function(err, docs) {
          assert.ifError(err);

          var doc = docs[0];
          assert.ok(Array.isArray(doc.comments), 'comments should be an array: ' + JSON.stringify(doc));
          assert.equal(doc.comments.length, 2, 'invalid comments length for ' + JSON.stringify(doc));
          doc.comments.forEach(function(d) {
            assert.equal(d._id, undefined);
            assert.equal(Object.keys(d._doc).indexOf('_id'), -1);
            assert.ok(d.body.length);
            assert.equal(typeof d._doc.__v, 'number');
          });

          U.findOne({name: 'u1'}).populate('comments', 'title -_id').exec(function(err, doc) {
            assert.ifError(err);
            assert.equal(doc.comments.length, 2);
            doc.comments.forEach(function(d) {
              assert.equal(d._id, undefined);
              assert.equal(Object.keys(d._doc).indexOf('_id'), -1);
              assert.ok(d.title.length);
              assert.equal(d.body, undefined);
              assert.equal(typeof d._doc.__v, 'undefined');
            });
            U.findOne({name: 'u1'}).populate('comments', '-_id').exec(function(err, doc) {
              assert.ifError(err);
              assert.equal(doc.comments.length, 2);
              doc.comments.forEach(function(d) {
                assert.equal(d._id, undefined);
                assert.equal(Object.keys(d._doc).indexOf('_id'), -1);
                assert.ok(d.title.length);
                assert.ok(d.body.length);
                assert.equal(typeof d._doc.__v, 'number');
              });
              done();
            });
          });
        });
      });

      it('with lean', function(done) {
        U.find({name: 'u1'}).lean().populate({path: 'comments', select: {_id: 0}, options: {lean: true}}).exec(function(err, docs) {
          assert.ifError(err);

          var doc = docs[0];
          assert.equal(doc.comments.length, 2);
          doc.comments.forEach(function(d) {
            assert.ok(!('_id' in d));
            assert.ok(d.body.length);
            assert.equal(typeof d.__v, 'number');
          });

          U.findOne({name: 'u1'}).lean().populate('comments', '-_id', null, {lean: true}).exec(function(err, doc) {
            assert.ifError(err);
            assert.equal(doc.comments.length, 2);
            doc.comments.forEach(function(d) {
              assert.ok(!('_id' in d));
              assert.ok(d.body.length);
              assert.equal(typeof d.__v, 'number');
            });
            done();
          });
        });
      });
    });

    describe('of documents being populated', function() {
      it('still works (gh-1441)', function(done) {
        U.find()
        .select('-_id comment name')
        .populate('comment', {_id: 0}).exec(function(err, docs) {
          assert.ifError(err);
          assert.equal(docs.length, 2);

          docs.forEach(function(doc) {
            assert.ok(doc.comment && doc.comment.body);
            if (doc.name === 'u1') {
              assert.equal(doc.comment.body, 'comment 1');
            } else {
              assert.equal(doc.comment.body, 'comment 2');
            }
          });

          done();
        });
      });
    });
  });

  describe('DynRef', function() {
    var db;
    var Review;
    var Item1;
    var Item2;

    before(function(done) {
      db = start();
      var reviewSchema = new Schema({
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

      var item1Schema = new Schema({
        _id: Number,
        name: String
      });

      var item2Schema = new Schema({
        _id: Number,
        otherName: String
      });

      Review = db.model('dynrefReview', reviewSchema, 'dynref-0');
      Item1 = db.model('dynrefItem1', item1Schema, 'dynref-1');
      Item2 = db.model('dynrefItem2', item2Schema, 'dynref-2');

      var review = {
        _id: 0,
        text: 'Test',
        item: {id: 1, type: 'dynrefItem1'},
        items: [{id: 1, type: 'dynrefItem1'}, {id: 2, type: 'dynrefItem2'}]
      };

      Item1.create({_id: 1, name: 'Val'}, function(err) {
        if (err) {
          return done(err);
        }
        Item2.create({_id: 2, otherName: 'Val'}, function(err) {
          if (err) {
            return done(err);
          }
          Review.create(review, function(err) {
            if (err) {
              return done(err);
            }
            done();
          });
        });
      });
    });

    after(function(done) {
      db.close(done);
    });

    it('Simple populate', function(done) {
      Review.find({}).populate('item.id').exec(function(err, results) {
        assert.ifError(err);
        assert.equal(results.length, 1);
        var result = results[0];
        assert.equal(result.item.id.name, 'Val');
        done();
      });
    });

    it('Array populate', function(done) {
      Review.find({}).populate('items.id').exec(function(err, results) {
        assert.ifError(err);
        assert.equal(results.length, 1);
        var result = results[0];
        assert.equal(result.items.length, 2);
        assert.equal(result.items[0].id.name, 'Val');
        assert.equal(result.items[1].id.otherName, 'Val');
        done();
      });
    });

    it('with nonexistant refPath (gh-4637)', function(done) {
      var baseballSchema = mongoose.Schema({
        seam: String
      });
      var Baseball = db.model('Baseball', baseballSchema);

      var ballSchema = mongoose.Schema({
        league: String,
        kind: String,
        ball: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: 'balls.kind'
        }
      });

      var basketSchema = mongoose.Schema({
        balls: [ballSchema]
      });
      var Basket = db.model('Basket', basketSchema);

      new Baseball({seam: 'yarn'}).
        save().
        then(function(baseball) {
          return new Basket({
            balls: [
              {
                league: 'MLB',
                kind: 'Baseball',
                ball: baseball._id
              },
              {
                league: 'NBA'
              }
            ]
          }).save();
        }).
        then(function(basket) {
          return basket.populate('balls.ball').execPopulate();
        }).
        then(function(basket) {
          assert.equal(basket.balls[0].ball.seam, 'yarn');
          assert.ok(!basket.balls[1].kind);
          assert.ok(!basket.balls[1].ball);
          done();
        }).
        catch(done);
    });

    it('with non-arrays (gh-5114)', function(done) {
      var LocationSchema = new Schema({
        name: String
      });
      var UserSchema = new Schema({
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

      var Locations = db.model('gh5114', LocationSchema);
      var Users = db.model('gh5114_0', UserSchema);

      var location1Id = new mongoose.Types.ObjectId();
      var location2Id = new mongoose.Types.ObjectId();

      var location1 = {
        _id: location1Id,
        name: 'loc1'
      };
      var location2 = {
        _id: location2Id,
        name: 'loc2'
      };
      var user = {
        locationRef: 'gh5114',
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
  });

  describe('leaves Documents within Mixed properties alone (gh-1471)', function() {
    var db;
    var Cat;
    var Litter;

    before(function() {
      db = start();
      Cat = db.model('cats', new Schema({name: String}));
      var litterSchema = new Schema({name: String, cats: {}, o: {}, a: []});
      Litter = db.model('litters', litterSchema);
    });

    after(function(done) {
      db.close(done);
    });

    it('when saving new docs', function(done) {
      Cat.create({name: 'new1'}, {name: 'new2'}, {name: 'new3'}, function(err, a, b, c) {
        if (err) {
          return done(err);
        }

        Litter.create({
          name: 'new',
          cats: [a],
          o: b,
          a: [c]
        }, confirm(done));
      });
    });

    it('when saving existing docs 5T5', function(done) {
      Cat.create({name: 'ex1'}, {name: 'ex2'}, {name: 'ex3'}, function(err, a, b, c) {
        if (err) {
          return done(err);
        }

        Litter.create({name: 'existing'}, function(err, doc) {
          doc.cats = [a];
          doc.o = b;
          doc.a = [c];
          doc.save(confirm(done));
        });
      });
    });

    function confirm(done) {
      return function(err, litter) {
        if (err) {
          return done(err);
        }
        Litter.findById(litter).lean().exec(function(err, doc) {
          if (err) {
            return done(err);
          }
          assert.ok(doc.o._id);
          assert.ok(doc.cats[0]);
          assert.ok(doc.cats[0]._id);
          assert.ok(doc.a[0]);
          assert.ok(doc.a[0]._id);
          done();
        });
      };
    }
  });

  describe('github issues', function() {
    var db;

    before(function() {
      db = start();
    });

    after(function(done) {
      db.close(done);
    });

    it('maps results back to correct document (gh-1444)', function(done) {
      var articleSchema = new Schema({
        body: String,
        mediaAttach: {type: Schema.ObjectId, ref: '1444-Media'},
        author: String
      });
      var Article = db.model('1444-Article', articleSchema);

      var mediaSchema = new Schema({
        filename: String
      });
      var Media = db.model('1444-Media', mediaSchema);

      Media.create({filename: 'one'}, function(err, media) {
        assert.ifError(err);

        Article.create(
            {body: 'body1', author: 'a'}
            , {body: 'body2', author: 'a', mediaAttach: media._id}
            , {body: 'body3', author: 'a'}, function(err) {
              if (err) {
                return done(err);
              }

              Article.find().populate('mediaAttach').exec(function(err, docs) {
                assert.ifError(err);

                var a2 = docs.filter(function(d) {
                  return d.body === 'body2';
                })[0];
                assert.equal(a2.mediaAttach.id, media.id);

                done();
              });
            });
      });
    });

    it('handles skip', function(done) {
      var movieSchema = new Schema({});
      var categorySchema = new Schema({movies: [{type: ObjectId, ref: 'gh-2252-1'}]});

      var Movie = db.model('gh-2252-1', movieSchema);
      var Category = db.model('gh-2252-2', categorySchema);

      Movie.create({}, {}, {}, function(error) {
        assert.ifError(error);
        Movie.find({}, function(error, docs) {
          assert.ifError(error);
          assert.equal(docs.length, 3);
          Category.create({movies: [docs[0]._id, docs[1]._id, docs[2]._id]}, function(error) {
            assert.ifError(error);
            Category.findOne({}).populate({path: 'movies', options: {limit: 2, skip: 1}}).exec(function(error, category) {
              assert.ifError(error);
              assert.equal(category.movies.length, 2);
              done();
            });
          });
        });
      });
    });

    it('handles slice (gh-1934)', function(done) {
      var movieSchema = new Schema({title: String, actors: [String]});
      var categorySchema = new Schema({movies: [{type: ObjectId, ref: 'gh-1934-1'}]});

      var Movie = db.model('gh-1934-1', movieSchema);
      var Category = db.model('gh-1934-2', categorySchema);
      var movies = [
        {title: 'Rush', actors: ['Chris Hemsworth', 'Daniel Bruhl']},
        {title: 'Pacific Rim', actors: ['Charlie Hunnam', 'Idris Elba']},
        {title: 'Man of Steel', actors: ['Henry Cavill', 'Amy Adams']}
      ];
      Movie.create(movies[0], movies[1], movies[2], function(error, m1, m2, m3) {
        assert.ifError(error);
        Category.create({movies: [m1._id, m2._id, m3._id]}, function(error) {
          assert.ifError(error);
          Category.findOne({}).populate({path: 'movies', options: {slice: {actors: 1}}}).exec(function(error, category) {
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

    it('fails if sorting with a doc array subprop (gh-2202)', function(done) {
      var childSchema = new Schema({ name: String });
      var Child = db.model('gh2202', childSchema);

      var parentSchema = new Schema({
        children1: [{
          child: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'gh2202'
          },
          test: Number
        }],
        children2: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'gh2202'
        }]
      });
      var Parent = db.model('gh2202_0', parentSchema);

      Child.create([{ name: 'test1' }, { name: 'test2' }], function(error, c) {
        assert.ifError(error);
        var doc = {
          children1: [
            { child: c[0]._id, test: 1 },
            { child: c[1]._id, test: 2 }
          ],
          children2: [c[0]._id, c[1]._id]
        };
        Parent.create(doc, function(error, doc) {
          assert.ifError(error);
          Parent.findById(doc).populate('children2').exec(function(error, doc) {
            assert.ifError(error);
            assert.equal(doc.children2[0].name, 'test1');
            Parent.findById(doc).
              populate({ path: 'children1.child', options: { sort: '-name' } }).
              exec(function(error) {
                assert.notEqual(error.message.indexOf('subproperty of a document array'),
                  -1);
                done();
              });
          });
        });
      });
    });

    it('handles toObject() (gh-3279)', function(done) {
      var teamSchema = new Schema({
        members: [{
          user: {type: ObjectId, ref: 'gh3279'},
          role: String
        }]
      });

      var calls = 0;
      teamSchema.set('toJSON', {
        transform: function(doc, ret) {
          ++calls;
          return ret;
        }
      });


      var Team = db.model('gh3279_1', teamSchema);

      var userSchema = new Schema({
        username: String
      });

      userSchema.set('toJSON', {
        transform: function(doc, ret) {
          return ret;
        }
      });

      var User = db.model('gh3279', userSchema);

      var user = new User({username: 'Test'});

      user.save(function(err) {
        assert.ifError(err);
        var team = new Team({members: [{user: user}]});

        team.save(function(err) {
          assert.ifError(err);
          team.populate('members.user', function() {
            team.toJSON();
            assert.equal(calls, 1);
            done();
          });
        });
      });
    });

    it('populate option (gh-2321)', function(done) {
      var User = db.model('User', {name: String});
      var Group = db.model('Group', {
        users: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
        name: String
      });

      User.create({name: 'Val'}, function(error, user) {
        assert.ifError(error);
        Group.create({users: [user._id], name: 'test'}, function(error, group) {
          assert.ifError(error);
          test(group._id);
        });
      });

      var test = function(id) {
        var options = {populate: {path: 'users', model: 'User'}};
        Group.find({_id: id}, '-name', options, function(error, group) {
          assert.ifError(error);
          assert.ok(group[0].users[0]._id);
          done();
        });
      };
    });

    it('discriminator child schemas (gh-3878)', function(done) {
      var options = { discriminatorKey: 'kind' };
      var activitySchema = new Schema({ title: { type: String } }, options);

      var dateActivitySchema = new Schema({
        postedBy: { type: Schema.Types.ObjectId, ref: 'gh3878', required: true }
      }, options);

      var eventActivitySchema = new Schema({ test: String }, options);

      var User = db.model('gh3878', { name: String });
      var Activity = db.model('gh3878_0', activitySchema);
      var DateActivity = Activity.discriminator('Date', dateActivitySchema);
      var EventActivity = Activity.discriminator('Event', eventActivitySchema);

      User.create({ name: 'val' }, function(error, user) {
        assert.ifError(error);
        var dateActivity = { title: 'test', postedBy: user._id };
        DateActivity.create(dateActivity, function(error) {
          assert.ifError(error);
          var eventActivity = {
            title: 'test2',
            test: 'test'
          };
          EventActivity.create(eventActivity, function(error) {
            assert.ifError(error);
            test();
          });
        });
      });

      function test() {
        Activity.find({}).populate('postedBy').exec(function(error, results) {
          assert.ifError(error);
          assert.equal(results.length, 2);
          assert.equal(results[0].postedBy.name, 'val');
          done();
        });
      }
    });

    it('set to obj w/ same id doesnt mark modified (gh-3992)', function(done) {
      var personSchema = new Schema({
        name: { type: String }
      });
      var jobSchema = new Schema({
        title: String,
        person: { type: Schema.Types.ObjectId, ref: 'gh3992' }
      });

      var Person = db.model('gh3992', personSchema);
      var Job = db.model('gh3992_0', jobSchema);

      Person.create({ name: 'Val' }, function(error, person) {
        assert.ifError(error);
        var job = { title: 'Engineer', person: person._id };
        Job.create(job, function(error, job) {
          assert.ifError(error);
          Job.findById(job._id, function(error, job) {
            assert.ifError(error);
            job.person = person;
            assert.ok(!job.isModified('person'));
            done();
          });
        });
      });
    });

    it('deep populate single -> array (gh-3904)', function(done) {
      var personSchema = new Schema({
        name: { type: String }
      });

      var teamSchema = new Schema({
        name: { type: String },
        members: [{ type: Schema.Types.ObjectId, ref: 'gh3904' }]
      });

      var gameSchema = new Schema({
        team: { type: Schema.Types.ObjectId, ref: 'gh3904_0' },
        opponent: { type: Schema.Types.ObjectId, ref: 'gh3904_0' }
      });

      var Person = db.model('gh3904', personSchema);
      var Team = db.model('gh3904_0', teamSchema);
      var Game = db.model('gh3904_1', gameSchema);

      var people = [
        { name: 'Shaq' },
        { name: 'Kobe' },
        { name: 'Horry' },
        { name: 'Duncan' },
        { name: 'Robinson' },
        { name: 'Johnson' }
      ];

      Person.create(people, function(error, people) {
        assert.ifError(error);
        var lakers = {
          name: 'Lakers',
          members: [people[0]._id, people[1]._id, people[2]._id]
        };
        var spurs = {
          name: 'Spurs',
          members: [people[3]._id, people[4]._id, people[5]._id]
        };
        var teams = [lakers, spurs];
        Team.create(teams, function(error, teams) {
          assert.ifError(error);
          var game = { team: teams[0]._id, opponent: teams[1]._id };
          Game.create(game, function(error, game) {
            assert.ifError(error);
            test(game._id);
          });
        });
      });

      function test(id) {
        var query = Game.findById(id).populate({
          path: 'team',
          select: 'name members',
          populate: { path: 'members', select: 'name' }
        });
        query.exec(function(error, doc) {
          assert.ifError(error);
          var arr = _.map(doc.toObject().team.members, function(v) {
            return v.name;
          });
          assert.deepEqual(arr, ['Shaq', 'Kobe', 'Horry']);
          done();
        });
      }
    });

    it('deep populate array -> array (gh-3954)', function(done) {
      var personSchema = new Schema({
        name: { type: String }
      });

      var teamSchema = new Schema({
        name: { type: String },
        members: [{ type: Schema.Types.ObjectId, ref: 'gh3954' }]
      });

      var gameSchema = new Schema({
        teams: [{ type: Schema.Types.ObjectId, ref: 'gh3954_0' }]
      });

      var Person = db.model('gh3954', personSchema);
      var Team = db.model('gh3954_0', teamSchema);
      var Game = db.model('gh3954_1', gameSchema);

      var people = [
        { name: 'Shaq' },
        { name: 'Kobe' },
        { name: 'Horry' },
        { name: 'Duncan' },
        { name: 'Robinson' },
        { name: 'Johnson' }
      ];

      Person.create(people, function(error, people) {
        assert.ifError(error);
        var lakers = {
          name: 'Lakers',
          members: [people[0]._id, people[1]._id, people[2]._id]
        };
        var spurs = {
          name: 'Spurs',
          members: [people[3]._id, people[4]._id, people[5]._id]
        };
        var teams = [lakers, spurs];
        Team.create(teams, function(error, teams) {
          assert.ifError(error);
          var game = {
            teams: [teams[0]._id, teams[1]._id]
          };
          Game.create(game, function(error, game) {
            assert.ifError(error);
            test(game._id);
          });
        });
      });

      function test(id) {
        var query = Game.findById(id).populate({
          path: 'teams',
          select: 'name members',
          populate: { path: 'members', select: 'name' }
        });
        query.exec(function(error, doc) {
          assert.ifError(error);
          var players = doc.toObject().teams[0].members.
            concat(doc.toObject().teams[1].members);
          var arr = _.map(players, function(v) {
            return v.name;
          });
          assert.deepEqual(arr,
            ['Shaq', 'Kobe', 'Horry', 'Duncan', 'Robinson', 'Johnson']);
          done();
        });
      }
    });

    it('4 level population (gh-3973)', function(done) {
      var level4Schema = new Schema({
        name: { type: String }
      });

      var level3Schema = new Schema({
        name: { type: String },
        level4: [{ type: Schema.Types.ObjectId, ref: 'level_4' }]
      });

      var level2Schema = new Schema({
        name: { type: String },
        level3: [{ type: Schema.Types.ObjectId, ref: 'level_3' }]
      });

      var level1Schema = new Schema({
        name: { type: String },
        level2: [{ type: Schema.Types.ObjectId, ref: 'level_2' }]
      });

      var level4 = db.model('level_4', level4Schema);
      var level3 = db.model('level_3', level3Schema);
      var level2 = db.model('level_2', level2Schema);
      var level1 = db.model('level_1', level1Schema);

      var l4docs = [{ name: 'level 4' }];

      level4.create(l4docs, function(error, l4) {
        assert.ifError(error);
        var l3docs = [{ name: 'level 3', level4: l4[0]._id }];
        level3.create(l3docs, function(error, l3) {
          assert.ifError(error);
          var l2docs = [{ name: 'level 2', level3: l3[0]._id }];
          level2.create(l2docs, function(error, l2) {
            assert.ifError(error);
            var l1docs = [{ name: 'level 1', level2: l2[0]._id }];
            level1.create(l1docs, function(error, l1) {
              assert.ifError(error);
              var opts = {
                path: 'level2',
                populate: {
                  path: 'level3',
                  populate: {
                    path: 'level4'
                  }
                }
              };
              level1.findById(l1[0]._id).populate(opts).exec(function(error, obj) {
                assert.ifError(error);
                assert.equal(obj.level2[0].level3[0].level4[0].name, 'level 4');
                done();
              });
            });
          });
        });
      });
    });

    it('deep populate two paths (gh-3974)', function(done) {
      var level3Schema = new Schema({
        name: { type: String }
      });

      var level2Schema = new Schema({
        name: { type: String },
        level31: [{ type: Schema.Types.ObjectId, ref: 'gh3974' }],
        level32: [{ type: Schema.Types.ObjectId, ref: 'gh3974' }]
      });

      var level1Schema = new Schema({
        name: { type: String },
        level2: [{ type: Schema.Types.ObjectId, ref: 'gh3974_0' }]
      });

      var level3 = db.model('gh3974', level3Schema);
      var level2 = db.model('gh3974_0', level2Schema);
      var level1 = db.model('gh3974_1', level1Schema);

      var l3 = [
        { name: 'level 3/1' },
        { name: 'level 3/2' }
      ];
      level3.create(l3, function(error, l3) {
        assert.ifError(error);
        var l2 = [
          { name: 'level 2', level31: l3[0]._id, level32: l3[1]._id }
        ];
        level2.create(l2, function(error, l2) {
          assert.ifError(error);
          var l1 = [{ name: 'level 1', level2: l2[0]._id }];
          level1.create(l1, function(error, l1) {
            assert.ifError(error);
            level1.findById(l1[0]._id).
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
              }).
              exec(function(error, obj) {
                assert.ifError(error);
                assert.equal(obj.level2[0].level31[0].name, 'level 3/1');
                assert.equal(obj.level2[0].level32[0].name, 'level 3/2');
                done();
              });
          });
        });
      });
    });

    it('out-of-order discriminators (gh-4073)', function(done) {
      var UserSchema = new Schema({
        name: String
      });

      var CommentSchema = new Schema({
        content: String
      });

      var BlogPostSchema = new Schema({
        title: String
      });

      var EventSchema = new Schema({
        name: String,
        createdAt: { type: Date, default: Date.now }
      });

      var UserEventSchema = new Schema({
        user: { type: ObjectId, ref: 'gh4073_0' }
      });

      var CommentEventSchema = new Schema({
        comment: { type: ObjectId, ref: 'gh4073_1' }
      });

      var BlogPostEventSchema = new Schema({
        blogpost: { type: ObjectId, ref: 'gh4073_2' }
      });

      var User = db.model('gh4073_0', UserSchema);
      var Comment = db.model('gh4073_1', CommentSchema);
      var BlogPost = db.model('gh4073_2', BlogPostSchema);

      var Event = db.model('gh4073_3', EventSchema);
      var UserEvent = Event.discriminator('User4073', UserEventSchema);
      var CommentEvent = Event.discriminator('Comment4073',
        CommentEventSchema);
      var BlogPostEvent = Event.discriminator('BlogPost4073', BlogPostEventSchema);

      var u1 = new User({ name: 'user 1' });
      var u2 = new User({ name: 'user 2' });
      var u3 = new User({ name: 'user 3' });
      var c1 = new Comment({ content: 'comment 1' });
      var c2 = new Comment({ content: 'comment 2' });
      var c3 = new Comment({ content: 'comment 3' });
      var b1 = new BlogPost({ title: 'blog post 1' });
      var b2 = new BlogPost({ title: 'blog post 2' });
      var b3 = new BlogPost({ title: 'blog post 3' });
      var ue1 = new UserEvent({ user: u1 });
      var ue2 = new UserEvent({ user: u2 });
      var ue3 = new UserEvent({ user: u3 });
      var ce1 = new CommentEvent({ comment: c1 });
      var ce2 = new CommentEvent({ comment: c2 });
      var ce3 = new CommentEvent({ comment: c3 });
      var be1 = new BlogPostEvent({ blogpost: b1 });
      var be2 = new BlogPostEvent({ blogpost: b2 });
      var be3 = new BlogPostEvent({ blogpost: b3 });

      async.series(
        [
          u1.save.bind(u1),
          u2.save.bind(u2),
          u3.save.bind(u3),

          c1.save.bind(c1),
          c2.save.bind(c2),
          c3.save.bind(c3),

          b1.save.bind(b1),
          b2.save.bind(b2),
          b3.save.bind(b3),

          ce1.save.bind(ce1),
          ue1.save.bind(ue1),
          be1.save.bind(be1),

          ce2.save.bind(ce2),
          ue2.save.bind(ue2),
          be2.save.bind(be2),

          ce3.save.bind(ce3),
          ue3.save.bind(ue3),
          be3.save.bind(be3),

          function(next) {
            Event.
              find({}).
              populate('user comment blogpost').
              exec(function(err, docs) {
                docs.forEach(function(doc) {
                  if (doc.__t === 'User4073') {
                    assert.ok(doc.user.name.indexOf('user') !== -1);
                  } else if (doc.__t === 'Comment4073') {
                    assert.ok(doc.comment.content.indexOf('comment') !== -1);
                  } else if (doc.__t === 'BlogPost4073') {
                    assert.ok(doc.blogpost.title.indexOf('blog post') !== -1);
                  } else {
                    assert.ok(false);
                  }
                });
                next();
              });
          }
        ],
        done
      );
    });

    it('dynref bug (gh-4104)', function(done) {
      var PersonSchema = new Schema({
        name: { type: String }
      });

      var AnimalSchema = new Schema({
        name: { type: String }
      });

      var ThingSchema = new Schema({
        createdByModel: { type: String },
        createdBy: {
          type: mongoose.Schema.Types.ObjectId, refPath: 'createdByModel'
        }
      });

      var Thing = db.model('Thing4104', ThingSchema);
      var Person = db.model('Person4104', PersonSchema);
      var Animal = db.model('Animal4104', AnimalSchema);

      Person.create({ name: 'Val' }, function(error, person) {
        assert.ifError(error);
        Animal.create({ name: 'Air Bud' }, function(error, animal) {
          assert.ifError(error);
          var obj1 = { createdByModel: 'Person4104', createdBy: person._id };
          var obj2 = { createdByModel: 'Animal4104', createdBy: animal._id };
          Thing.create(obj1, obj2, function(error) {
            assert.ifError(error);
            Thing.find({}).populate('createdBy').exec(function(error, things) {
              assert.ifError(error);
              assert.ok(things[0].createdBy.name);
              assert.ok(things[1].createdBy.name);
              done();
            });
          });
        });
      });
    });

    it('returned array has toObject() (gh-4656)', function(done) {
      var demoWrapperSchema = new Schema({
        demo: [{
          type: String,
          ref: 'gh4656'
        }]
      });
      var demoSchema = new Schema({ name: String });

      var Demo = db.model('gh4656', demoSchema);
      var DemoWrapper = db.model('gh4656_0', demoWrapperSchema);

      Demo.create({ name: 'test' }).
        then(function(demo) { return DemoWrapper.create({ demo: [demo._id] }); }).
        then(function(wrapper) { return DemoWrapper.findById(wrapper._id); }).
        then(function(doc) { return doc.populate('demo').execPopulate(); }).
        then(function(res) {
          assert.equal(res.demo.toObject()[0].name, 'test');
          done();
        }).
        catch(done);
    });

    it('empty array (gh-4284)', function(done) {
      var PersonSchema = new Schema({
        name: { type: String }
      });

      var BandSchema = new Schema({
        people: [{
          type: mongoose.Schema.Types.ObjectId
        }]
      });

      var Person = db.model('gh4284_b', PersonSchema);
      var Band = db.model('gh4284_b0', BandSchema);

      var band = { people: [new mongoose.Types.ObjectId()] };
      Band.create(band, function(error, band) {
        assert.ifError(error);
        var opts = { path: 'people', model: Person };
        Band.findById(band).populate(opts).exec(function(error, band) {
          assert.ifError(error);
          assert.equal(band.people.length, 0);
          done();
        });
      });
    });

    it('empty populate string is a no-op (gh-4702)', function(done) {
      var BandSchema = new Schema({
        people: [{
          type: mongoose.Schema.Types.ObjectId
        }]
      });

      var Band = db.model('gh4702', BandSchema);

      var band = { people: [new mongoose.Types.ObjectId()] };
      Band.create(band, function(error, band) {
        assert.ifError(error);
        Band.findById(band).populate('').exec(function(error, band) {
          assert.ifError(error);
          assert.equal(band.people.length, 1);
          done();
        });
      });
    });

    it('checks field name correctly with nested arrays (gh-4365)', function(done) {
      var UserSchema = new mongoose.Schema({
        name: {
          type: String,
          default: ''
        }
      });
      db.model('gh4365_0', UserSchema);

      var GroupSchema = new mongoose.Schema({
        name: String,
        members: [String]
      });

      var OrganizationSchema = new mongoose.Schema({
        members: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'gh4365_0'
        }],
        groups: [GroupSchema]
      });
      var OrganizationModel = db.model('gh4365_1', OrganizationSchema);

      var org = {
        members: [],
        groups: []
      };
      OrganizationModel.create(org, function(error) {
        assert.ifError(error);
        OrganizationModel.
          findOne({}).
          populate('members', 'name').
          exec(function(error, org) {
            assert.ifError(error);
            org.groups.push({ name: 'Team Rocket' });
            org.save(function(error) {
              assert.ifError(error);
              org.groups[0].members.push('Jessie');
              assert.equal(org.groups[0].members[0], 'Jessie');
              org.save(function(error) {
                assert.ifError(error);
                assert.equal(org.groups[0].members[0], 'Jessie');
                done();
              });
            });
          });
      });
    });

    describe('populate virtuals (gh-2562)', function() {
      it('basic populate virtuals', function(done) {
        var PersonSchema = new Schema({
          name: String,
          band: String
        });

        var BandSchema = new Schema({
          name: String
        });
        BandSchema.virtual('members', {
          ref: 'gh2562',
          localField: 'name',
          foreignField: 'band'
        });

        var Person = db.model('gh2562', PersonSchema);
        var Band = db.model('gh2562_0', BandSchema);

        var people = _.map(['Axl Rose', 'Slash'], function(v) {
          return { name: v, band: 'Guns N\' Roses' };
        });
        Person.create(people, function(error) {
          assert.ifError(error);
          Band.create({ name: 'Guns N\' Roses' }, function(error) {
            assert.ifError(error);
            var query = { name: 'Guns N\' Roses' };
            Band.findOne(query).populate('members').exec(function(error, gnr) {
              assert.ifError(error);
              assert.equal(gnr.members.length, 2);
              done();
            });
          });
        });
      });

      it('multiple source docs', function(done) {
        var PersonSchema = new Schema({
          name: String,
          band: String
        });

        var BandSchema = new Schema({
          name: String
        });
        BandSchema.virtual('members', {
          ref: 'gh2562_a0',
          localField: 'name',
          foreignField: 'band'
        });

        var Person = db.model('gh2562_a0', PersonSchema);
        var Band = db.model('gh2562_a1', BandSchema);

        var people = _.map(['Axl Rose', 'Slash'], function(v) {
          return { name: v, band: 'Guns N\' Roses' };
        });
        people = people.concat(_.map(['Vince Neil', 'Nikki Sixx'], function(v) {
          return { name: v, band: 'Motley Crue' };
        }));
        Person.create(people, function(error) {
          assert.ifError(error);
          var bands = [
            { name: 'Guns N\' Roses' },
            { name: 'Motley Crue' }
          ];
          Band.create(bands, function(error) {
            assert.ifError(error);
            Band.
              find({}).
              sort({ name: 1 }).
              populate({ path: 'members', options: { sort: { name: 1 } } }).
              exec(function(error, bands) {
                assert.ifError(error);

                assert.equal(bands.length, 2);
                assert.equal(bands[0].name, 'Guns N\' Roses');
                assert.equal(bands[0].members.length, 2);
                assert.deepEqual(_.map(bands[0].members, 'name'),
                  ['Axl Rose', 'Slash']);

                assert.equal(bands[1].name, 'Motley Crue');
                assert.equal(bands[1].members.length, 2);
                assert.deepEqual(_.map(bands[1].members, 'name'),
                  ['Nikki Sixx', 'Vince Neil']);
                done();
              });
          });
        });
      });

      it('source array', function(done) {
        var PersonSchema = new Schema({
          name: String
        });

        var BandSchema = new Schema({
          name: String,
          people: [String]
        });
        BandSchema.virtual('members', {
          ref: 'gh2562_b0',
          localField: 'people',
          foreignField: 'name'
        });

        var Person = db.model('gh2562_b0', PersonSchema);
        var Band = db.model('gh2562_b1', BandSchema);

        var bands = [
          { name: 'Guns N\' Roses', people: ['Axl Rose', 'Slash'] },
          { name: 'Motley Crue', people: ['Vince Neil', 'Nikki Sixx'] }
        ];
        var people = [
          { name: 'Axl Rose' },
          { name: 'Slash' },
          { name: 'Vince Neil' },
          { name: 'Nikki Sixx' }
        ];

        Person.create(people, function(error) {
          assert.ifError(error);
          Band.insertMany(bands, function(error) {
            assert.ifError(error);
            Band.
              find({}).
              sort({ name: 1 }).
              populate({ path: 'members', options: { sort: { name: 1 } } }).
              exec(function(error, bands) {
                assert.ifError(error);

                assert.equal(bands.length, 2);
                assert.equal(bands[0].name, 'Guns N\' Roses');
                assert.equal(bands[0].members.length, 2);
                assert.deepEqual(_.map(bands[0].members, 'name'),
                  ['Axl Rose', 'Slash']);

                assert.equal(bands[1].name, 'Motley Crue');
                assert.equal(bands[1].members.length, 2);
                assert.deepEqual(_.map(bands[1].members, 'name'),
                  ['Nikki Sixx', 'Vince Neil']);

                done();
              });
          });
        });
      });

      it('multiple paths (gh-4234)', function(done) {
        var PersonSchema = new Schema({
          name: String,
          authored: [Number],
          favorites: [Number]
        });

        var BlogPostSchema = new Schema({
          _id: Number,
          title: String
        });
        BlogPostSchema.virtual('authors', {
          ref: 'gh4234',
          localField: '_id',
          foreignField: 'authored'
        });
        BlogPostSchema.virtual('favoritedBy', {
          ref: 'gh4234',
          localField: '_id',
          foreignField: 'favorites'
        });

        var Person = db.model('gh4234', PersonSchema);
        var BlogPost = db.model('gh4234_0', BlogPostSchema);

        var blogPosts = [{ _id: 0, title: 'Bacon is Great' }];
        var people = [{ name: 'Val', authored: [0], favorites: [0] }];

        Person.create(people, function(error) {
          assert.ifError(error);
          BlogPost.create(blogPosts, function(error) {
            assert.ifError(error);
            BlogPost.
              findOne({ _id: 0 }).
              populate('authors favoritedBy').
              exec(function(error, post) {
                assert.ifError(error);
                assert.equal(post.authors.length, 1);
                assert.equal(post.authors[0].name, 'Val');
                assert.equal(post.favoritedBy.length, 1);
                assert.equal(post.favoritedBy[0].name, 'Val');
                done();
              });
          });
        });
      });

      it('in embedded array (gh-4928)', function(done) {
        var PersonSchema = new Schema({
          name: String,
          authored: [Number]
        });

        var BlogPostSchema = new Schema({
          _id: Number,
          title: String
        });
        BlogPostSchema.virtual('author', {
          ref: 'gh4928',
          localField: '_id',
          foreignField: 'authored',
          justOne: true
        });

        var CollectionSchema = new Schema({
          blogPosts: [BlogPostSchema]
        });

        var Person = db.model('gh4928', PersonSchema);
        var Collection = db.model('gh4928_0', CollectionSchema);

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

      it('justOne option (gh-4263)', function(done) {
        var PersonSchema = new Schema({
          name: String,
          authored: [Number]
        });

        var BlogPostSchema = new Schema({
          _id: Number,
          title: String
        });
        BlogPostSchema.virtual('author', {
          ref: 'gh4263',
          localField: '_id',
          foreignField: 'authored',
          justOne: true
        });

        var Person = db.model('gh4263', PersonSchema);
        var BlogPost = db.model('gh4263_0', BlogPostSchema);

        var blogPosts = [{ _id: 0, title: 'Bacon is Great' }];
        var people = [
          { name: 'Val', authored: [0] },
          { name: 'Test', authored: [0] }
        ];

        Person.create(people, function(error) {
          assert.ifError(error);
          BlogPost.create(blogPosts, function(error) {
            assert.ifError(error);
            BlogPost.
              findOne({ _id: 0 }).
              populate('author').
              exec(function(error, post) {
                assert.ifError(error);
                assert.strictEqual(Array.isArray(post.author), false);
                assert.ok(post.author.name.match(/^(Val|Test)$/));
                done();
              });
          });
        });
      });

      it('with no results and justOne (gh-4284)', function(done) {
        var PersonSchema = new Schema({
          name: String,
          authored: [Number]
        });

        var BlogPostSchema = new Schema({
          _id: Number,
          title: String
        });
        BlogPostSchema.virtual('author', {
          ref: 'gh4284',
          localField: '_id',
          foreignField: 'authored',
          justOne: true
        });

        var Person = db.model('gh4284', PersonSchema);
        var BlogPost = db.model('gh4284_0', BlogPostSchema);

        var blogPosts = [
          { _id: 0, title: 'Bacon is Great' },
          { _id: 1, title: 'Bacon is OK' }
        ];
        var people = [
          { name: 'Val', authored: [0] }
        ];

        Person.create(people, function(error) {
          assert.ifError(error);
          BlogPost.create(blogPosts, function(error) {
            assert.ifError(error);
            BlogPost.
              find({}).
              sort({ title: 1 }).
              populate('author').
              exec(function(error, posts) {
                assert.ifError(error);
                assert.equal(posts[0].author.name, 'Val');
                assert.strictEqual(posts[1].author, null);
                done();
              });
          });
        });
      });

      it('with multiple results and justOne (gh-4329)', function(done) {
        var UserSchema = new Schema({
          openId: {
            type: String,
            unique: true
          }
        });
        var TaskSchema = new Schema({
          openId: {
            type: String
          }
        });

        TaskSchema.virtual('user', {
          ref: 'gh4329',
          localField: 'openId',
          foreignField: 'openId',
          justOne: true
        });

        var User = db.model('gh4329', UserSchema);
        var Task = db.model('gh4329_0', TaskSchema);

        User.create({ openId: 'user1' }, { openId: 'user2' }, function(error) {
          assert.ifError(error);
          Task.create({ openId: 'user1' }, { openId: 'user2' }, function(error) {
            assert.ifError(error);
            Task.
              find().
              sort({ openId: 1 }).
              populate('user').
              exec(function(error, tasks) {
                assert.ifError(error);

                assert.ok(tasks[0].user);
                assert.ok(tasks[1].user);
                var users = tasks.map(function(task) {
                  return task.user.openId;
                });
                assert.deepEqual(users, ['user1', 'user2']);
                done();
              });
          });
        });
      });

      it('hydrates properly (gh-4618)', function(done) {
        var ASchema = new Schema({
          name: { type: String }
        });

        var BSchema = new Schema({
          name: { type: String },
          a_id: { type: ObjectId }
        }, {
          toObject: { virtuals: true },
          toJSON:   { virtuals: true }
        });

        BSchema.virtual('a', {
          ref: 'gh4618',
          localField: 'a_id',
          foreignField: '_id'
        });

        var A = db.model('gh4618', ASchema);
        var B = db.model('gh4618_0', BSchema);

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

      it('with no results (gh-4284)', function(done) {
        var PersonSchema = new Schema({
          name: String,
          authored: [Number]
        });

        var BlogPostSchema = new Schema({
          _id: Number,
          title: String
        });
        BlogPostSchema.virtual('authors', {
          ref: 'gh4284_a',
          localField: '_id',
          foreignField: 'authored'
        });

        var Person = db.model('gh4284_a', PersonSchema);
        var BlogPost = db.model('gh4284_a0', BlogPostSchema);

        var blogPosts = [
          { _id: 0, title: 'Bacon is Great' },
          { _id: 1, title: 'Bacon is OK' },
          { _id: 2, title: 'Bacon is not great' }
        ];
        var people = [
          { name: 'Val', authored: [0] },
          { name: 'Test', authored: [0, 1] }
        ];

        Person.create(people, function(error) {
          assert.ifError(error);
          BlogPost.create(blogPosts, function(error) {
            assert.ifError(error);
            BlogPost.
              find({}).
              sort({ _id: 1 }).
              populate('authors').
              exec(function(error, posts) {
                assert.ifError(error);
                var arr = posts[0].toObject({ virtuals: true }).authors.
                  map(function(v) {
                    return v.name;
                  }).
                  sort();
                assert.deepEqual(arr, ['Test', 'Val']);
                assert.equal(posts[1].authors.length, 1);
                assert.equal(posts[1].authors[0].name, 'Test');
                assert.equal(posts[2].authors.length, 0);
                done();
              });
          });
        });
      });

      it('deep populate virtual -> conventional (gh-4261)', function(done) {
        var PersonSchema = new Schema({
          name: String
        });

        PersonSchema.virtual('blogPosts', {
          ref: 'gh4261',
          localField: '_id',
          foreignField: 'author'
        });

        var BlogPostSchema = new Schema({
          title: String,
          author: { type: ObjectId },
          comments: [{ author: { type: ObjectId, ref: 'gh4261' } }]
        });

        var Person = db.model('gh4261', PersonSchema);
        var BlogPost = db.model('gh4261_0', BlogPostSchema);

        var people = [
          { name: 'Val' },
          { name: 'Test' }
        ];

        Person.create(people, function(error, people) {
          assert.ifError(error);
          var post = {
            title: 'Test1',
            author: people[0]._id,
            comments: [{ author: people[1]._id }]
          };
          BlogPost.create(post, function(error) {
            assert.ifError(error);
            Person.findById(people[0]._id).
              populate({
                path: 'blogPosts',
                model: BlogPost,
                populate: {
                  path: 'comments.author',
                  model: Person
                }
              }).
              exec(function(error, person) {
                assert.ifError(error);
                assert.equal(person.blogPosts[0].comments[0].author.name,
                  'Test');
                done();
              });
          });
        });
      });

      it('deep populate virtual -> virtual (gh-4278)', function(done) {
        var ASchema = new Schema({
          name: String
        });
        ASchema.virtual('bs', {
          ref: 'gh4278_1',
          localField: '_id',
          foreignField: 'a'
        });

        var BSchema = new Schema({
          a: mongoose.Schema.Types.ObjectId,
          name: String
        });
        BSchema.virtual('cs', {
          ref: 'gh4278_2',
          localField: '_id',
          foreignField: 'b'
        });

        var CSchema = new Schema({
          b: mongoose.Schema.Types.ObjectId,
          name: String
        });

        var A = db.model('gh4278_0', ASchema);
        var B = db.model('gh4278_1', BSchema);
        var C = db.model('gh4278_2', CSchema);

        A.create({ name: 'A1' }, function(error, a) {
          assert.ifError(error);
          B.create({ name: 'B1', a: a._id }, function(error, b) {
            assert.ifError(error);
            C.create({ name: 'C1', b: b._id }, function(error) {
              assert.ifError(error);
              var options = {
                path: 'bs',
                populate: {
                  path: 'cs'
                }
              };
              A.findById(a).populate(options).exec(function(error, res) {
                assert.ifError(error);
                assert.equal(res.bs.length, 1);
                assert.equal(res.bs[0].name, 'B1');
                assert.equal(res.bs[0].cs.length, 1);
                assert.equal(res.bs[0].cs[0].name, 'C1');
                done();
              });
            });
          });
        });
      });

      it('source array (gh-4585)', function(done) {
        var tagSchema = new mongoose.Schema({
          name: String,
          tagId: { type:String, unique:true }
        });

        var blogPostSchema = new mongoose.Schema({
          name : String,
          body: String,
          tags : [String]
        });

        blogPostSchema.virtual('tagsDocuments', {
          ref: 'gh4585', // model
          localField: 'tags',
          foreignField: 'tagId'
        });

        var Tag = db.model('gh4585', tagSchema);
        var BlogPost = db.model('gh4585_0', blogPostSchema);

        var tags = [
          {
            name : 'angular.js',
            tagId : 'angular'
          },
          {
            name : 'node.js',
            tagId : 'node'
          },
          {
            name : 'javascript',
            tagId : 'javascript'
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

      it('lean with single result and no justOne (gh-4288)', function(done) {
        var PersonSchema = new Schema({
          name: String,
          authored: [Number]
        });

        var BlogPostSchema = new Schema({
          _id: Number,
          title: String
        });
        BlogPostSchema.virtual('authors', {
          ref: true,
          localField: '_id',
          foreignField: 'authored',
          justOne: false
        });

        var Person = db.model('gh4288', PersonSchema);
        var BlogPost = db.model('gh4288_0', BlogPostSchema);

        var blogPosts = [
          { _id: 0, title: 'Bacon is Great' }
        ];
        var people = [
          { name: 'Val', authored: [0] }
        ];

        Person.create(people, function(error) {
          assert.ifError(error);
          BlogPost.create(blogPosts, function(error) {
            assert.ifError(error);
            BlogPost.
              findOne({}).
              lean().
              populate({ path: 'authors', model: Person }).
              exec(function(error, post) {
                assert.ifError(error);
                assert.equal(post.authors.length, 1);
                assert.equal(post.authors[0].name, 'Val');
                done();
              });
          });
        });
      });

      it('gh-4923', function(done) {
        var ClusterSchema = new Schema({
          name: String
        });
        var Cluster = db.model('gh4923', ClusterSchema);

        var ZoneSchema = new Schema({
          name: String,
          clusters: {
            type: [ObjectId],
            ref: 'gh4923'
          }
        });
        var Zone = db.model('gh4923_1', ZoneSchema);

        var DocSchema = new Schema({
          activity: [{
            cluster: {
              type: ObjectId,
              ref: 'gh4923'
            },
            intensity: Number
          }]
        });
        DocSchema.virtual('activity.zones', {
          ref: 'gh4923_1',
          localField: 'activity.cluster',
          foreignField: 'clusters'
        });
        DocSchema.set('toObject', {virtuals: true});
        DocSchema.set('toJSON', {virtuals: true});
        var Doc = db.model('gh4923_2', DocSchema);

        Cluster.create([{ name: 'c1' }, { name: 'c2' }, { name: 'c3' }]).
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
              exec(function(error, res) {
                assert.ifError(error);
                // Fails if this `.toObject()` is omitted, issue #4926
                res = res.toObject({ virtuals: true });
                var compare = function(a, b) {
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
                done();
              });
          }).
          catch(done);
      });

      it('supports setting default options in schema (gh-4741)', function(done) {
        var sessionSchema = new Schema({
          date: { type: Date },
          user: { type: Schema.ObjectId, ref: 'User' }
        });

        var userSchema = new Schema({
          name: String
        });

        userSchema.virtual('sessions', {
          ref: 'gh4741',
          localField: '_id',
          foreignField: 'user',
          options: { sort: { date: -1 }, limit: 2 }
        });

        var Session = db.model('gh4741', sessionSchema);
        var User = db.model('gh4741_0', userSchema);

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

      it('handles populate with 0 args (gh-5036)', function(done) {
        var userSchema = new Schema({
          name: String
        });

        var User = db.model('gh5036', userSchema);

        User.findOne().populate().exec(function(error) {
          assert.ifError(error);
          done();
        });
      });

      it('handles populating with discriminators that may not have a ref (gh-4817)', function(done) {
        var imagesSchema = new mongoose.Schema({
          name: {
            type: String,
            required: true
          }
        });
        var Image = db.model('gh4817', imagesSchema, 'images');

        var fieldSchema = new mongoose.Schema({
          name: {
            type: String,
            required: true
          }
        });
        var Field = db.model('gh4817_0', fieldSchema, 'fields');

        var imageFieldSchema = new mongoose.Schema({
          value: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'gh4817',
            default: null
          }
        });
        var FieldImage = Field.discriminator('gh4817_1', imageFieldSchema);

        var textFieldSchema = new mongoose.Schema({
          value: {
            type: Schema.Types.Mixed,
            required: true,
            default: {}
          }
        });
        var FieldText = Field.discriminator('gh4817_2', textFieldSchema);

        var objectSchema = new mongoose.Schema({
          name: {
            type: String,
            required: true
          },
          fields: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'gh4817_0'
          }]
        });
        var ObjectModel = db.model('gh4817_3', objectSchema, 'objects');

        Image.create({ name: 'testimg' }).
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
            });
          }).
          then(function(obj) {
            assert.equal(obj.fields.length, 2);
            assert.equal(obj.fields[0].value.name, 'testimg');
            assert.equal(obj.fields[1].value, 'test');
            done();
          }).
          catch(done);
      });

      it('populate with no ref using Model.populate (gh-4843)', function(done) {
        var schema = new Schema({
          parent: mongoose.Schema.Types.ObjectId,
          name: String
        });

        var Person = db.model('gh4843', schema);

        Person.create({ name: 'Anakin' }).
          then(function(parent) {
            return Person.create({ name: 'Luke', parent: parent._id });
          }).
          then(function(luke) {
            return Person.findById(luke._id);
          }).
          then(function(luke) {
            return Person.populate(luke, { path: 'parent', model: 'gh4843' });
          }).
          then(function(luke) {
            assert.equal(luke.parent.name, 'Anakin');
            done();
          }).
          catch(done);
      });

      it('nested populate, virtual -> normal (gh-4631)', function(done) {
        var PersonSchema = new Schema({
          name: String
        });

        PersonSchema.virtual('blogPosts', {
          ref: 'gh4631_0',
          localField: '_id',
          foreignField: 'author'
        });

        var BlogPostSchema = new Schema({
          title: String,
          author: { type: ObjectId },
          comments: [{ author: { type: ObjectId, ref: 'gh4631' } }]
        });

        var Person = db.model('gh4631', PersonSchema);
        var BlogPost = db.model('gh4631_0', BlogPostSchema);

        var people = [
          { name: 'Val' },
          { name: 'Test' }
        ];

        Person.create(people, function(error, people) {
          assert.ifError(error);
          var post = {
            title: 'Test1',
            author: people[0]._id,
            comments: [{ author: people[1]._id }]
          };
          BlogPost.create(post, function(error) {
            assert.ifError(error);

            Person.findById(people[0]._id).
              populate({
                path: 'blogPosts',
                model: BlogPost,
                populate: {
                  path: 'author',
                  model: Person
                }
              }).
              exec(function(error, doc) {
                assert.ifError(error);
                assert.equal(doc.blogPosts.length, 1);
                assert.equal(doc.blogPosts[0].author.name, 'Val');
                done();
              });
          });
        });
      });

      it('populate with Decimal128 as ref (gh-4759)', function(done) {
        start.mongodVersion(function(err, version) {
          if (err) {
            done(err);
            return;
          }
          var mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
          if (!mongo34) {
            done();
            return;
          }

          test();
        });

        function test() {
          var parentSchema = new Schema({
            name: String,
            child: {
              type: 'Decimal128',
              ref: 'gh4759'
            }
          });

          var childSchema = new Schema({
            _id: 'Decimal128',
            name: String
          });

          var Child = db.model('gh4759', childSchema);
          var Parent = db.model('gh4759_0', parentSchema);

          var decimal128 = childSchema.path('_id').cast('1.337e+3');
          Child.create({ name: 'Luke', _id: '1.337e+3' }).
            then(function() {
              return Parent.create({ name: 'Anakin', child: decimal128.bytes });
            }).
            then(function(parent) {
              return Parent.findById(parent._id).populate('child');
            }).
            then(function(parent) {
              assert.equal(parent.child.name, 'Luke');
              assert.equal(parent.child._id.toString(), '1337');
              done();
            }).
            catch(done);
        }
      });

      it('handles circular virtual -> regular (gh-5128)', function(done) {
        var ASchema = new Schema({
          title: { type: String, required: true, trim : true }
        });

        ASchema.virtual('brefs', {
          ref: 'gh5128_0',
          localField: '_id',
          foreignField: 'arefs'
        });

        var BSchema = new Schema({
          arefs: [{ type: ObjectId, required: true, ref: 'gh5128' }]
        });

        var a = db.model('gh5128', ASchema);
        var b = db.model('gh5128_0', BSchema);

        var id1 = new mongoose.Types.ObjectId();

        a.create({ _id: id1, title: 'test' }).
          then(function() { return b.create({ arefs: [id1] }); }).
          then(function() {
            return a.findOne({ _id: id1 }).populate([{
              path: 'brefs', // this gets populated
              model: 'gh5128_0',
              populate: [{
                path: 'arefs', // <---- this is returned as [ObjectId], not populated
                model: 'gh5128'
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
        var AuthorSchema = new Schema({ name: String });

        var BookSchema = new Schema({
          title: String,
          author: { id: mongoose.Schema.Types.ObjectId }
        });

        BookSchema.virtual('author.doc', {
          ref: 'Author',
          foreignField: '_id',
          localField: 'author.id',
          justOne: true
        });

        var Author = db.model('Author', AuthorSchema);
        var Book = db.model('Book', BookSchema);

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

      it('nested virtuals + doc.populate() (gh-5240)', function(done) {
        var parentSchema = new Schema({ name: String });
        var childSchema = new Schema({
          parentId: mongoose.Schema.Types.ObjectId
        });
        childSchema.virtual('parent', {
          ref: 'gh5240',
          localField: 'parentId',
          foreignField: '_id',
          justOne: true
        });
        var teamSchema = new Schema({ people: [childSchema] });

        var Parent = db.model('gh5240', parentSchema);
        var Team = db.model('gh5240_0', teamSchema);

        Parent.create({ name: 'Darth Vader' }).
          then(function(doc) {
            return Team.create({ people: [{ parentId: doc._id }] });
          }).
          then(function(team) {
            return Team.findById(team._id);
          }).
          then(function(team) {
            return team.populate('people.parent').execPopulate();
          }).
          then(function(team) {
            team = team.toObject({ virtuals: true });
            assert.equal(team.people[0].parent.name, 'Darth Vader');
            done();
          }).
          catch(done);
      });

      it('no ref + cursor (gh-5334)', function(done) {
        var parentSchema = new Schema({
          name: String,
          child: mongoose.Schema.Types.ObjectId
        });
        var childSchema = new Schema({
          name: String
        });

        var Parent = db.model('gh5334_0', parentSchema);
        var Child = db.model('gh5334', childSchema);

        Child.create({ name: 'Luke' }, function(error, child) {
          assert.ifError(error);
          Parent.create({ name: 'Vader', child: child._id }, function(error) {
            assert.ifError(error);
            Parent.find().populate({ path: 'child', model: 'gh5334' }).cursor().next(function(error, doc) {
              assert.ifError(error);
              assert.equal(doc.child.name, 'Luke');
              done();
            });
          });
        });
      });

      it('virtuals + doc.populate() (gh-5311)', function(done) {
        var parentSchema = new Schema({ name: String });
        var childSchema = new Schema({
          parentId: mongoose.Schema.Types.ObjectId
        });
        childSchema.virtual('parent', {
          ref: 'gh5311',
          localField: 'parentId',
          foreignField: '_id',
          justOne: true
        });

        var Parent = db.model('gh5311', parentSchema);
        var Child = db.model('gh5311_0', childSchema);

        Parent.create({ name: 'Darth Vader' }).
          then(function(doc) {
            return Child.create({ parentId: doc._id });
          }).
          then(function(c) {
            return Child.findById(c._id);
          }).
          then(function(c) {
            return c.populate('parent').execPopulate();
          }).
          then(function(c) {
            c = c.toObject({ virtuals: true });

            assert.equal(c.parent.name, 'Darth Vader');
            done();
          }).
          catch(done);
      });

      it('empty virtual with Model.populate (gh-5331)', function(done) {
        var myModelSchema = new Schema({
          virtualRefKey: {type: String, ref: 'gh5331'}
        });
        myModelSchema.set('toJSON', {virtuals:true});
        myModelSchema.virtual('populatedVirtualRef', {
          ref: 'gh5331',
          localField: 'virtualRefKey',
          foreignField: 'handle'
        });

        var otherModelSchema = new Schema({
          handle: String
        });

        var MyModel = db.model('gh5331_0', myModelSchema);
        db.model('gh5331', otherModelSchema);

        MyModel.create({ virtualRefKey: 'test' }, function(error, doc) {
          assert.ifError(error);
          MyModel.populate(doc, 'populatedVirtualRef', function(error, doc) {
            assert.ifError(error);
            assert.ok(doc.populatedVirtualRef);
            assert.ok(Array.isArray(doc.populatedVirtualRef));
            done();
          });
        });
      });

      it('virtual populate in single nested doc (gh-4715)', function(done) {
        var someModelSchema = new mongoose.Schema({
          name: String
        });

        var SomeModel = db.model('gh4715', someModelSchema);

        var schema0 = new mongoose.Schema({
          name1: String
        });

        schema0.virtual('detail', {
          ref: 'gh4715',
          localField: '_id',
          foreignField: '_id',
          justOne: true
        });

        var schemaMain = new mongoose.Schema({
          name: String,
          obj: schema0
        });

        var ModelMain = db.model('gh4715_0', schemaMain);

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

      it('virtuals with justOne false and foreign field not found (gh-5336)', function(done) {
        var BandSchema = new mongoose.Schema({
          name: String,
          active: Boolean
        });

        var Band = db.model('gh5336', BandSchema);

        var PersonSchema = new mongoose.Schema({
          name: String,
          bands: [String]
        });

        PersonSchema.virtual('bandDetails', {
          ref: 'gh5336',
          localField: 'bands',
          foreignField: 'name',
          justOne: false
        });
        var Person = db.model('gh5336_0', PersonSchema);

        var band = new Band({name: 'The Beatles', active: false});
        var person = new Person({
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
            }).execPopulate();
          }).
          then(function(person) {
            person = person.toObject({ virtuals: true });
            assert.deepEqual(person.bandDetails, []);
            done();
          }).
          catch(done);
      });

      it('virtuals with justOne true and foreign field not found (gh-5336)', function(done) {
        var BandSchema = new mongoose.Schema({
          name: String,
          active: Boolean
        });

        var Band = db.model('gh5336_10', BandSchema);

        var PersonSchema = new mongoose.Schema({
          name: String,
          bands: [String]
        });

        PersonSchema.virtual('bandDetails', {
          ref: 'gh5336_10',
          localField: 'bands',
          foreignField: 'name',
          justOne: true
        });
        var Person = db.model('gh5336_11', PersonSchema);

        var band = new Band({name: 'The Beatles', active: false});
        var person = new Person({
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
            }).execPopulate();
          }).
          then(function(person) {
            person = person.toObject({ virtuals: true });
            assert.strictEqual(person.bandDetails, null);
            done();
          }).
          catch(done);
      });

      it('select foreignField automatically (gh-4959)', function(done) {
        var childSchema = new mongoose.Schema({
          name: String,
          parentId: mongoose.Schema.Types.ObjectId
        });

        var Child = db.model('gh4959', childSchema);

        var parentSchema = new mongoose.Schema({
          name: String
        });

        parentSchema.virtual('detail', {
          ref: 'gh4959',
          localField: '_id',
          foreignField: 'parentId',
          justOne: true
        });

        var Parent = db.model('gh4959_0', parentSchema);

        Parent.create({ name: 'Test' }).
          then(function(m) {
            return Child.create({ name: 'test', parentId: m._id });
          }).
          then(function() {
            return Parent.find().populate({ path: 'detail', select: 'name' });
          }).
          then(function(res) {
            var m = res[0];
            assert.equal(m.detail.name, 'test');
            assert.ok(m.detail.parentId);
            done();
          }).
          catch(done);
      });

      it('works if foreignField parent is selected (gh-5037)', function(done) {
        var childSchema = new mongoose.Schema({
          name: String,
          parent: {
            id: mongoose.Schema.Types.ObjectId,
            name: String
          }
        });

        var Child = db.model('gh5037', childSchema);

        var parentSchema = new mongoose.Schema({
          name: String
        });

        parentSchema.virtual('detail', {
          ref: 'gh5037',
          localField: '_id',
          foreignField: 'parent.id',
          justOne: true
        });

        var Parent = db.model('gh5037_0', parentSchema);

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
            var m = res[0];
            assert.equal(m.detail.name, 'test');
            assert.ok(m.detail.parent.id);
            assert.equal(m.detail.parent.name, 'test2');
            done();
          }).
          catch(done);
      });

      it('specify model in populate (gh-4264)', function(done) {
        var PersonSchema = new Schema({
          name: String,
          authored: [Number]
        });

        var BlogPostSchema = new Schema({
          _id: Number,
          title: String
        });
        BlogPostSchema.virtual('authors', {
          ref: true,
          localField: '_id',
          foreignField: 'authored'
        });

        var Person = db.model('gh4264', PersonSchema);
        var BlogPost = db.model('gh4264_0', BlogPostSchema);

        var blogPosts = [{ _id: 0, title: 'Bacon is Great' }];
        var people = [
          { name: 'Val', authored: [0] }
        ];

        Person.create(people, function(error) {
          assert.ifError(error);
          BlogPost.create(blogPosts, function(error) {
            assert.ifError(error);
            BlogPost.
              findOne({ _id: 0 }).
              populate({ path: 'authors', model: Person }).
              exec(function(error, post) {
                assert.ifError(error);
                assert.equal(post.authors.length, 1);
                assert.equal(post.authors[0].name, 'Val');
                done();
              });
          });
        });
      });
    });
  });
});
