'use strict';

/**
 * Test dependencies.
 */

const start = require('./common');

const assert = require('assert');
const co = require('co');
const utils = require('../lib/utils');
const Buffer = require('safe-buffer').Buffer;

const mongoose = start.mongoose;
const random = utils.random;
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;
const DocObjectId = mongoose.Types.ObjectId;

/**
 * Tests.
 */

describe('model: populate:', function() {
  this.timeout(process.env.TRAVIS ? 8000 : 4500);

  let User;
  let Comment;
  let BlogPost;
  let posts;
  let users;
  let db;

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
    db = start();
  });

  after(function(done) {
    db.close(done);
  });

  it('populating array of object', function(done) {
    const BlogPost = db.model('RefBlogPost', posts);
    const User = db.model('RefUser', users);

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
          done();
        });
      });
    });
  });

  it('deep population (gh-3103)', function(done) {
    const BlogPost = db.model('RefBlogPost', posts);
    const User = db.model('RefUser', users);

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
                    populate: { // can also use a single object instead of array of objects
                      path: 'followers',
                      select: 'name',
                      options: {limit: 2}
                    }
                  }]
                })
                .exec(function(err, post) {
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
    let db;

    before(function() {
      db = start();
    });

    after(function(done) {
      db.close(done);
    });

    it('deep population with refs (gh-3507)', function(done) {
      // handler schema
      const handlerSchema = new Schema({
        name: String
      });

      // task schema
      const taskSchema = new Schema({
        name: String,
        handler: {type: Schema.Types.ObjectId, ref: 'gh3507_0'}
      });

      // application schema
      const applicationSchema = new Schema({
        name: String,
        tasks: [{type: Schema.Types.ObjectId, ref: 'gh3507_1'}]
      });

      const Handler = db.model('gh3507_0', handlerSchema);
      const Task = db.model('gh3507_1', taskSchema);
      const Application = db.model('gh3507_2', applicationSchema);

      Handler.create({name: 'test'}, function(error, doc) {
        assert.ifError(error);
        Task.create({name: 'test2', handler: doc._id}, function(error, doc) {
          assert.ifError(error);
          const obj = {name: 'test3', tasks: [doc._id]};
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
      const companySchema = new Schema({
        name:  String,
        description:  String
      });

      const userSchema = new Schema({
        name:  String,
        company: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Company',
          select: false
        }
      });

      const messageSchema = new Schema({
        message:  String,
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        target: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
      });

      const Company = db.model('Company', companySchema);
      const User = db.model('User', userSchema);
      const Message = db.model('Message', messageSchema);

      const company = new Company({ name: 'IniTech' });
      const user1 = new User({ name: 'Bill', company: company._id });
      const user2 = new User({ name: 'Peter', company: company._id });
      const message = new Message({
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
          const options = {
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
    const db = start();
    const BlogPost = db.model('RefBlogPost', posts);
    const User = db.model('RefUser', users);

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
    const BlogPost = db.model('RefBlogPost', posts);

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
          done();
        });
    });
  });

  it('not failing on empty object as ref', function(done) {
    const BlogPost = db.model('RefBlogPost', posts);

    BlogPost.create(
      {title: 'woot'},
      function(err, post) {
        assert.ifError(err);

        BlogPost.
          findByIdAndUpdate(post._id, {$set: {_creator: {}}}, function(err) {
            assert.ok(err);
            done();
          });
      });
  });

  it('across DBs', function(done) {
    const db = start();
    const db2 = db.useDb('mongoose_test2');
    const BlogPost = db.model('RefBlogPost', posts + '2');
    const User = db2.model('RefUser', users + '2');

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
          .populate({ path: '_creator', select: 'name', model: User })
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
    const BlogPost = db.model('RefBlogPost', posts + '1');
    const User = db.model('RefUser', users + '1');

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

        const origExec = User.Query.prototype.exec;

        // mock an error
        User.Query.prototype.exec = function() {
          const args = Array.prototype.map.call(arguments, function(arg) {
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
            assert.ok(err instanceof Error);
            assert.equal(err.message, 'woot');
            User.Query.prototype.exec = origExec;
            done();
          });
      });
    });
  });

  it('populating with partial fields selection', function(done) {
    const db = start();
    const BlogPost = db.model('RefBlogPost', posts);
    const User = db.model('RefUser', users);

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
    const db = start();
    const BlogPost = db.model('RefBlogPost', 'blogposts_' + random());
    const User = db.model('RefUser', 'users_' + random());

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
    const db = start();
    const BlogPost = db.model('RefBlogPost', 'blogposts_' + random());
    const User = db.model('RefUser', 'users_' + random());
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
    const companySchema = new mongoose.Schema({
      name: String,
      description: String
    });

    const userSchema = new mongoose.Schema({
      name: String,
      company: {type: mongoose.Schema.Types.ObjectId, ref: 'Company'}
    });

    const sampleSchema = new mongoose.Schema({
      items: [userSchema]
    });

    const Company = db.model('gh3859_0', companySchema);
    const User = db.model('gh3859_1', userSchema);
    const Sample = db.model('gh3859_2', sampleSchema);

    const company = new Company({name: 'Reynholm Industrie'});
    const user1 = new User({name: 'Douglas', company: company._id});
    const user2 = new User({name: 'Lambda'});
    const sample = new Sample({
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
        const opts = { path: 'items.company', options: { lean: true } };
        Company.populate(sample, opts, function(error) {
          assert.ifError(error);
          assert.strictEqual(sample.items[1].company, void 0);
          done();
        });
      });
    }
  });

  it('population and changing a reference', function(done) {
    const db = start();
    const BlogPost = db.model('RefBlogPost', posts);
    const User = db.model('RefUser', users);

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
    const db = start();
    const BlogPost = db.model('RefBlogPost', posts);
    const User = db.model('RefUser', users);

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
    const BlogPost = db.model('RefBlogPost', posts);
    const User = db.model('RefUser', users);

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
    const BlogPost = db.model('RefBlogPost', posts + '2');
    const User = db.model('RefUser', users + '2');

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
            const origExec = User.Query.prototype.exec;
            User.Query.prototype.exec = function() {
              const args = Array.prototype.map.call(arguments, function(arg) {
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
    const BlogPost = db.model('RefBlogPost', posts);
    const User = db.model('RefUser', users);

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
    const BlogPost = db.model('RefBlogPost', posts);
    const User = db.model('RefUser', users);

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
    const BlogPost = db.model('RefBlogPost', posts);
    const User = db.model('RefUser', users);

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
    const BlogPost = db.model('RefBlogPost', posts);
    const User = db.model('RefUser', users);

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
    const BlogPost = db.model('RefBlogPost', posts);
    const User = db.model('RefUser', users);

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
      const BlogPost = db.model('RefBlogPost', posts);
      const User = db.model('RefUser', users);

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
                done();
              });
          });
        });
      });
    });

    it('works when first doc returned has empty array for populated path (gh-1055)', function(done) {
      const BlogPost = db.model('RefBlogPost', posts);
      const User = db.model('RefUser', users);

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

          let ran = false;
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
              done();
            });
        });
      });
    });
  });

  it('clears cache when array has been re-assigned (gh-2176)', function(done) {
    const BlogPost = db.model('RefBlogPost', posts, 'gh-2176-1');
    const User = db.model('RefUser', users, 'gh-2176-2');

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
                  done();
                });
              });
            });
        });
    });
  });

  it('populating subdocuments partially', function(done) {
    const BlogPost = db.model('RefBlogPost', posts);
    const User = db.model('RefUser', users);

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
    const BlogPost = db.model('RefBlogPost', posts);
    const User = db.model('RefUser', users);

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
    const BlogPost = db.model('RefBlogPost', posts);
    const User = db.model('RefUser', users);

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
              BlogPost.collection.updateOne(
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

                          done();
                        });
                    });
                });
            });
        });
      });
    });
  });

  it('properly handles limit per document (gh-2151)', function(done) {
    const ObjectId = mongoose.Types.ObjectId;

    const user = new Schema({
      name: String,
      friends: [{
        type: Schema.ObjectId,
        ref: 'gh-2151-1'
      }]
    });
    const User = db.model('gh-2151-1', user, 'gh-2151-1');

    const blogpost = new Schema({
      title: String,
      tags: [String],
      author: {
        type: Schema.ObjectId,
        ref: 'gh-2151-1'
      }
    });
    const BlogPost = db.model('gh-2151-2', blogpost, 'gh-2151-2');

    const userIds = [new ObjectId, new ObjectId, new ObjectId, new ObjectId];
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

        BlogPost.
          find({tags: 'fun'}).
          lean().
          populate('author').
          exec(function(err, docs) {
            assert.ifError(err);
            const opts = {
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
              done();
            });
          });
      });
    });
  });

  it('populating subdocuments partially with empty array (gh-481)', function(done) {
    const BlogPost = db.model('RefBlogPost', posts);

    BlogPost.create({
      title: 'Woot',
      comments: [] // EMPTY ARRAY
    }, function(err, post) {
      assert.ifError(err);

      BlogPost
        .findById(post._id)
        .populate('comments._creator', 'email')
        .exec(function(err, returned) {
          assert.ifError(err);
          assert.equal(returned.id, post.id);
          done();
        });
    });
  });

  it('populating subdocuments partially with null array', function(done) {
    const BlogPost = db.model('RefBlogPost', posts);

    BlogPost.create({
      title: 'Woot',
      comments: null
    }, function(err, post) {
      assert.ifError(err);

      BlogPost
        .findById(post._id)
        .populate('comments._creator')
        .exec(function(err, returned) {
          assert.ifError(err);
          assert.equal(returned.id, post.id);
          done();
        });
    });
  });

  it('populating subdocuments with array including nulls', function() {
    const BlogPost = db.model('RefBlogPost', posts);
    const User = db.model('RefUser', users);

    return co(function*() {
      const user = new User({name: 'hans zimmer'});
      yield user.save();

      const post = yield BlogPost.create({
        title: 'Woot',
        fans: []
      });

      yield BlogPost.collection.updateOne({_id: post._id}, {
        $set: {fans: [null, undefined, user.id, null]}
      });

      const returned = yield BlogPost.
        findById(post._id).
        populate('fans', 'name');

      assert.equal(returned.id, post.id);
      assert.equal(returned.fans.length, 1);
    });
  });

  it('supports `retainNullValues` to override filtering out null docs (gh-6432)', function() {
    const BlogPost = db.model('RefBlogPost', posts);
    const User = db.model('RefUser', users);

    return co(function*() {
      const user = new User({name: 'Victor Hugo'});
      yield user.save();

      const post = yield BlogPost.create({
        title: 'Notre-Dame de Paris',
        fans: []
      });

      yield BlogPost.collection.updateOne({_id: post._id}, {
        $set: {fans: [null, user.id, null, undefined]}
      });

      const returned = yield BlogPost.
        findById(post._id).
        populate({ path: 'fans', options: { retainNullValues: true } });

      assert.equal(returned.id, post.id);
      assert.equal(returned.fans.length, 4);
      assert.strictEqual(returned.fans[0], null);
      assert.equal(returned.fans[1].name, 'Victor Hugo');
      assert.strictEqual(returned.fans[2], null);
      assert.strictEqual(returned.fans[3], null);
    });
  });

  it('populating more than one array at a time', function(done) {
    const User = db.model('RefUser', users);
    const M = db.model('PopMultiSubDocs', new Schema({
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
            assert.ifError(err);

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

            done();
          });
      });
    });
  });

  it('populating multiple children of a sub-array at a time', function(done) {
    const User = db.model('RefUser', users);
    const BlogPost = db.model('RefBlogPost', posts);
    const Inner = new Schema({
      user: {type: ObjectId, ref: 'RefUser'},
      post: {type: ObjectId, ref: 'RefBlogPost'}
    });
    db.model('PopMultiChildrenOfSubDocInner', Inner);

    const M = db.model('PopMultiChildrenOfSubDoc', new Schema({
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
              assert.ifError(err);
              assert.strictEqual(o.kids.length, 2);
              const k1 = o.kids[0];
              const k2 = o.kids[1];
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
    const P = db.model('RefBlogPost', posts);
    const User = db.model('RefUser', users);

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
    const sB = new Schema({
      name: String
    });
    const name = 'b' + random();
    const sJ = new Schema({
      b: [{type: Schema.Types.ObjectId, ref: name}]
    });
    const B = db.model(name, sB);
    const J = db.model('j' + random(), sJ);

    const b1 = new B({name: 'thing1'});
    const b2 = new B({name: 'thing2'});
    const b3 = new B({name: 'thing3'});
    const b4 = new B({name: 'thing4'});
    const b5 = new B({name: 'thing5'});

    const j1 = new J({b: [b1.id, b2.id, b5.id]});
    const j2 = new J({b: [b3.id, b4.id, b5.id]});

    let count = 7;

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
        done();
      });
    }
  });

  it('refs should cast to ObjectId from hexstrings', function(done) {
    const BP = mongoose.model('RefBlogPost');
    const bp = new BP;
    bp._creator = new DocObjectId().toString();
    assert.ok(bp._creator instanceof DocObjectId);
    bp.set('_creator', new DocObjectId().toString());
    assert.ok(bp._creator instanceof DocObjectId);
    done();
  });

  it('populate should work on String _ids', function(done) {
    const UserSchema = new Schema({
      _id: String,
      name: String
    });

    const NoteSchema = new Schema({
      author: {type: String, ref: 'UserWithStringId'},
      body: String
    });

    const User = db.model('UserWithStringId', UserSchema, random());
    const Note = db.model('NoteWithStringId', NoteSchema, random());

    const alice = new User({_id: 'alice', name: 'Alice'});

    alice.save(function(err) {
      assert.ifError(err);

      const note = new Note({author: 'alice', body: 'Buy Milk'});
      note.save(function(err) {
        assert.ifError(err);

        Note.findById(note.id).populate('author').exec(function(err, note) {
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
    const UserSchema = new Schema({
      _id: Number,
      name: String
    });

    const NoteSchema = new Schema({
      author: {type: Number, ref: 'UserWithNumberId'},
      body: String
    });

    const User = db.model('UserWithNumberId', UserSchema, random());
    const Note = db.model('NoteWithNumberId', NoteSchema, random());

    const alice = new User({_id: 2359, name: 'Alice'});

    alice.save(function(err) {
      assert.ifError(err);

      const note = new Note({author: 2359, body: 'Buy Milk'});
      note.save(function(err) {
        assert.ifError(err);

        Note.findById(note.id).populate('author').exec(function(err, note) {
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
    const userSchema = new Schema({
      email: {type: String, required: true}
    });
    const User = db.model('ObjectIdRefRequiredField', userSchema, random());

    const numSchema = new Schema({_id: Number, val: Number});
    const Num = db.model('NumberRefRequired', numSchema, random());

    const strSchema = new Schema({_id: String, val: String});
    const Str = db.model('StringRefRequired', strSchema, random());

    const commentSchema = new Schema({
      user: {type: ObjectId, ref: 'ObjectIdRefRequiredField', required: true},
      num: {type: Number, ref: 'NumberRefRequired', required: true},
      str: {type: String, ref: 'StringRefRequired', required: true},
      text: String
    });
    const Comment = db.model('CommentWithRequiredField', commentSchema);

    let pending = 3;

    const string = new Str({_id: 'my string', val: 'hello'});
    const number = new Num({_id: 1995, val: 234});
    const user = new User({email: 'test'});

    string.save(next);
    number.save(next);
    user.save(next);

    function next(err) {
      assert.strictEqual(err, null);
      if (--pending) {
        return;
      }

      const comment = new Comment({
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
                assert.ifError(err);
                done();
              });
            });
        });
      });
    }
  });

  it('populate works with schemas with both id and _id defined', function(done) {
    const S1 = new Schema({id: String});
    const S2 = new Schema({things: [{type: ObjectId, ref: '_idAndid'}]});

    const M1 = db.model('_idAndid', S1);
    const M2 = db.model('populateWorksWith_idAndidSchemas', S2);

    M1.create(
      {id: 'The Tiger That Isn\'t'}
      , {id: 'Users Guide To The Universe'}
      , function(err, a, b) {
        assert.ifError(err);

        const m2 = new M2({things: [a, b]});
        m2.save(function(err) {
          assert.ifError(err);
          M2.findById(m2).populate('things').exec(function(err, doc) {
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
    const BlogPost = db.model('RefBlogPost', posts);
    const User = db.model('RefUser', users);

    User.create({name: 'aphex'}, {name: 'twin'}, function(err, u1, u2) {
      assert.ifError(err);

      BlogPost.create({
        title: 'Woot',
        fans: []
      }, function(err, post) {
        assert.ifError(err);

        const update = {fans: [u1, u2]};
        BlogPost.updateOne({_id: post}, update, function(err) {
          assert.ifError(err);

          // the original update doc should not be modified
          assert.ok('fans' in update);
          assert.ok(!('$set' in update));
          assert.ok(update.fans[0] instanceof mongoose.Document);
          assert.ok(update.fans[1] instanceof mongoose.Document);

          BlogPost.findById(post, function(err, post) {
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
    const db = start();
    const BlogPost = db.model('RefBlogPost', posts);
    const User = db.model('RefUser', users);

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

            const json = post.toJSON();
            assert.equal(true, json.was_in_to_json);
            assert.equal(json._creator.was_in_to_json, true);
            done();
          });
      });
    });
  });

  it('populate should work on Buffer _ids (gh-686)', function(done) {
    const UserSchema = new Schema({
      _id: Buffer,
      name: String
    });

    const NoteSchema = new Schema({
      author: {type: Buffer, ref: 'UserWithBufferId'},
      body: String
    });

    const User = db.model('UserWithBufferId', UserSchema, random());
    const Note = db.model('NoteWithBufferId', NoteSchema, random());

    const alice = new User({_id: new mongoose.Types.Buffer('YWxpY2U=', 'base64'), name: 'Alice'});

    alice.save(function(err) {
      assert.ifError(err);

      const note = new Note({author: 'alice', body: 'Buy Milk'});
      note.save(function(err) {
        assert.ifError(err);

        Note.findById(note.id).populate('author').exec(function(err, note) {
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
    const UserSchema = new Schema({
      _id: Buffer,
      name: String
    });

    const NoteSchema = new Schema({
      author: {type: Buffer, ref: 'UserWithBufferId', required: true},
      body: String
    });

    const User = db.model('UserWithBufferId', UserSchema, random());
    const Note = db.model('NoteWithBufferId', NoteSchema, random());

    const alice = new User({_id: new mongoose.Types.Buffer('YWxpY2U=', 'base64'), name: 'Alice'});

    alice.save(function(err) {
      assert.ifError(err);

      const note = new Note({author: 'alice', body: 'Buy Milk'});
      note.save(function(err) {
        assert.ifError(err);

        Note.findById(note.id).populate('author').exec(function(err, note) {
          assert.ifError(err);
          note.save(function(err) {
            assert.ifError(err);
            done();
          });
        });
      });
    });
  });

  it('populating with custom model selection (gh-773)', function(done) {
    const BlogPost = db.model('RefBlogPost', posts);
    const User = db.model('RefAlternateUser', users);

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
      const db = start();
      const A = db.model('A', {name: String, _id: String});
      const B = db.model('B', {other: String});
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
      const db = start();
      const A = db.model('A', {name: String, _id: Number});
      const B = db.model('B', {other: Number});
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
      const db = start();
      const A = db.model('A', {name: String, _id: Buffer});
      const B = db.model('B', {other: Buffer});
      A.create({name: 'hello', _id: Buffer.from('x')}, function(err, a) {
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
      const db = start();
      const A = db.model('A', {name: String});
      const B = db.model('B', {other: Schema.ObjectId});
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
    let db, B, User;
    let post;

    before(function() {
      db = start();
      B = db.model('RefBlogPost');
      User = db.model('RefAlternateUser');

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
    let db, B, User;
    let user1, user2, post1, post2, _id;

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
        const p = B.populate(post1, '_creator');
        assert.ok(p instanceof mongoose.Promise);
        p.then(success, done);
        function success(doc) {
          assert.ok(doc);
          done();
        }
      });
    });

    describe('of individual document', function() {
      it('works', function(done) {
        B.findById(post1._id, function(error, post1) {
          const ret = utils.populate({path: '_creator', model: 'RefAlternateUser'});
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
            const ret = utils.populate({path: '_creator', model: 'RefAlternateUser'});
            B.populate([post1, post2], ret, function(err, posts) {
              assert.ifError(err);
              assert.ok(posts);
              assert.equal(posts.length, 2);
              const p1 = posts[0];
              const p2 = posts[1];
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
      const db = start();
      const BlogPost = db.model('RefBlogPost', posts + random());
      const User = db.model('RefUser', users + random());

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
      const db = start();
      const BlogPost = db.model('RefBlogPost', posts + random());
      const User = db.model('RefUser', users + random());

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
    let db;
    let B;
    let U;
    let u1, u2;
    let b1;

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
        done();
      });
    });
  });

  describe('deselecting _id', function() {
    let db, C, U, c1, c2;
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

          const doc = docs[0];
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

          const doc = docs[0];
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
    let db;
    let Review;
    let Item1;
    let Item2;

    before(function(done) {
      db = start();
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

      Review = db.model('dynrefReview', reviewSchema, 'dynref-0');
      Item1 = db.model('dynrefItem1', item1Schema, 'dynref-1');
      Item2 = db.model('dynrefItem2', item2Schema, 'dynref-2');

      const review = {
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
        const result = results[0];
        assert.equal(result.item.id.name, 'Val');
        done();
      });
    });

    it('Array populate', function(done) {
      Review.find({}).populate('items.id').exec(function(err, results) {
        assert.ifError(err);
        assert.equal(results.length, 1);
        const result = results[0];
        assert.equal(result.items.length, 2);
        assert.equal(result.items[0].id.name, 'Val');
        assert.equal(result.items[1].id.otherName, 'Val');
        done();
      });
    });

    it('with nonexistant refPath (gh-4637)', function(done) {
      const baseballSchema = mongoose.Schema({
        seam: String
      });
      const Baseball = db.model('Baseball', baseballSchema);

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
      const Basket = db.model('Basket', basketSchema);

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

    it('array with empty refPath (gh-5377)', function(done) {
      const modelASchema = new mongoose.Schema({
        name: String
      });
      const ModelA = db.model('gh5377_a', modelASchema);

      const modelBSchema = new mongoose.Schema({
        name: String
      });
      const ModelB = db.model('gh5377_b', modelBSchema);

      const ChildSchema = new mongoose.Schema({
        name: String,
        toy: {
          kind: {
            type: String,
            enum: ['gh5377_a', 'gh5377_b']
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
      const Parent = db.model('gh5377', ParentSchema);

      ModelA.create({ name: 'model-A' }, function(error, toyA) {
        assert.ifError(error);
        ModelB.create({ name: 'model-B' }, function(error, toyB) {
          assert.ifError(error);
          Parent.create({
            children: [
              {
                name: 'Child 1',
                toy: { kind: 'gh5377_a', value: toyA._id }
              },
              {
                name: 'Child 2'
              },
              {
                name: 'Child 3',
                toy: { kind: 'gh5377_b', value: toyB._id }
              }
            ]
          }, function(error, doc) {
            assert.ifError(error);
            test(doc._id);
          });
        });
      });

      function test(id) {
        Parent.findById(id, function(error, doc) {
          assert.ifError(error);
          doc.populate('children.toy.value').execPopulate().then(function(doc) {
            assert.equal(doc.children[0].toy.value.name, 'model-A');
            assert.equal(doc.children[1].toy.value, null);
            assert.equal(doc.children[2].toy.value.name, 'model-B');
            done();
          }).catch(done);
        });
      }
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

      const Locations = db.model('gh5114', LocationSchema);
      const Users = db.model('gh5114_0', UserSchema);

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

    it('with different schema types for local fields (gh-6870)', function() {
      const TestSchema = new mongoose.Schema({
        _id: Number,
        exercises: [String]
      });
      const LessonSchema = new mongoose.Schema({
        _id: String,
        url: String
      });
      const StudyPlanSchema = new mongoose.Schema({
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

      const StudyPlan = db.model('gh6870_StudyPlan', StudyPlanSchema);
      const Test = db.model('gh6870_Test', TestSchema);
      const Lesson = db.model('gh6870_Lesson', LessonSchema);

      const test = new Test({ _id: 123, exercises: ['t1', 't2'] });
      const lesson = new Lesson({ _id: 'lesson', url: 'https://youtube.com' });
      const studyPlan = new StudyPlan({
        parts: [
          {
            title: 'Study Plan 01',
            contents: [
              {
                item: test._id,
                kind: 'gh6870_Test'
              },
              {
                item: lesson._id,
                kind: 'gh6870_Lesson'
              },
              {
                item: lesson._id,
                kind: 'gh6870_Lesson'
              }
            ]
          }
        ]
      });

      return co(function*() {
        yield [test.save(), lesson.save(), studyPlan.save()];
        const doc = yield StudyPlan.findOne({}).populate('parts.contents.item');

        assert.strictEqual(doc.parts[0].contents[0].item.exercises[0], 't1');
        assert.strictEqual(doc.parts[0].contents[1].item.url, 'https://youtube.com');
      });
    });

    it('with nested nonexistant refPath (gh-6457)', function() {
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

      const Post = db.model('gh6457', PostSchema);

      return co(function*() {
        yield Post.create({
          text: 'Post 2',
          comments: [{
            text: 'Comment'
            // No `references`
          }]
        });

        const post = yield Post.findOne().populate('comments.references.item');

        assert.deepEqual(post.toObject().comments[0].references, []);
      });
    });

    it('where first doc doesnt have a refPath (gh-6913', function() {
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

      const Post = db.model('gh6913_Post', PostSchema);
      const User = db.model('gh6913_User', UserSchema);

      const user = {
        _id: mongoose.Types.ObjectId(),
        name: 'Arnold',
      };

      const post = {
        _id: mongoose.Types.ObjectId(),
        comments: [
          {},
          {
            references: [{
              item: user._id,
              kind: 'gh6913_User'
            }]
          }
        ]
      };

      return co(function*() {
        yield User.create(user);
        yield Post.create(post);

        const _post = yield Post.findOne().populate('comments.references.item');
        assert.equal(_post.comments.length, 2);
        assert.equal(_post.comments[1].references.length, 1);
        assert.equal(_post.comments[1].references[0].item.name, 'Arnold');
      });
    });

    it('readable error with deselected refPath (gh-6834)', function() {
      const offerSchema = new Schema({
        text: String,
        city: String,
        formData: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: 'city'
        }
      });

      const Offer = db.model('gh6834', offerSchema);

      return co(function*() {
        yield Offer.create({
          text: 'special discount',
          city: 'New York',
          formData: new mongoose.Types.ObjectId()
        });

        let threw = false;
        try {
          yield Offer.findOne().populate('formData').select('-city');
        } catch (error) {
          assert.ok(error);
          assert.ok(error.message.indexOf('refPath') !== -1, error.message);
          threw = true;
        }
        assert.ok(threw);
      });
    });
  });

  it('strips out not-matched ids when populating a hydrated doc (gh-6435)', function() {
    const coopBrandSchema = new Schema({
      name: String
    });

    coopBrandSchema.virtual('products', {
      ref: 'gh6435_Product',
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

    const Agent = db.model('gh6435_Agent', agentSchema);
    const Product = db.model('gh6435_Product', productSchema);

    return co(function*() {
      const billy = yield Agent.create({
        name: 'Billy',
        coopBrands: [
          { name: 'Has product' },
          { name: 'Has no product' }
        ]
      });

      const coopBrandId = billy.coopBrands[0]._id;
      yield Product.create([
        { coopBrandId: coopBrandId, name: 'Product 1' },
        { coopBrandId: coopBrandId, name: 'Product 2' }
      ]);

      let agent = yield Agent.findOne({});
      yield agent.populate('coopBrands.products').execPopulate();
      agent = agent.toObject({ virtuals: true });
      assert.equal(agent.coopBrands[0].products.length, 2);
      assert.deepEqual(agent.coopBrands[1].products, []);
    });
  });

  describe('leaves Documents within Mixed properties alone (gh-1471)', function() {
    let db;
    let Cat;
    let Litter;

    before(function() {
      db = start();
      Cat = db.model('cats', new Schema({name: String}));
      const litterSchema = new Schema({name: String, cats: {}, o: {}, a: []});
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
    let db;

    before(function() {
      db = start();
    });

    after(function(done) {
      db.close(done);
    });

    it('populating an array of refs, slicing, and fetching many (gh-5737)', function(done) {
      const BlogPost = db.model('gh5737_0', new Schema({
        title: String,
        fans: [{ type: ObjectId, ref: 'gh5737' }]
      }));
      const User = db.model('gh5737', new Schema({ name: String }));

      User.create([{ name: 'Fan 1' }, { name: 'Fan 2' }], function(error, fans) {
        assert.ifError(error);
        const posts = [
          { title: 'Test 1', fans: [fans[0]._id, fans[1]._id] },
          { title: 'Test 2', fans: [fans[1]._id, fans[0]._id] }
        ];
        BlogPost.create(posts, function(error) {
          assert.ifError(error);
          BlogPost.
            find({}).
            slice('fans', [0, 5]).
            populate('fans').
            exec(function(err, blogposts) {
              assert.ifError(err);

              const titles = blogposts.map(bp => bp.title).sort();

              assert.equal(titles[0], 'Test 1');
              assert.equal(titles[1], 'Test 2');

              const test1 = blogposts.find(bp => bp.title === 'Test 1');
              assert.equal(test1.fans[0].name, 'Fan 1');
              assert.equal(test1.fans[1].name, 'Fan 2');

              const test2 = blogposts.find(bp => bp.title === 'Test 2');
              assert.equal(test2.fans[0].name, 'Fan 2');
              assert.equal(test2.fans[1].name, 'Fan 1');
              done();
            });
        });
      });
    });

    it('populate + slice (gh-5737a)', function(done) {
      const BlogPost = db.model('gh5737b', new Schema({
        title: String,
        user: { type: ObjectId, ref: 'gh5737a' },
        fans: [{ type: ObjectId}]
      }));
      const User = db.model('gh5737a', new Schema({ name: String }));

      User.create([{ name: 'Fan 1' }], function(error, fans) {
        assert.ifError(error);
        const posts = [
          { title: 'Test 1', user: fans[0]._id, fans: [fans[0]._id] }
        ];
        BlogPost.create(posts, function(error) {
          assert.ifError(error);
          BlogPost.
            find({}).
            slice('fans', [0, 2]).
            populate('user').
            exec(function(err, blogposts) {
              assert.ifError(error);

              assert.equal(blogposts[0].user.name, 'Fan 1');
              assert.equal(blogposts[0].title, 'Test 1');
              done();
            });
        });
      });
    });

    it('maps results back to correct document (gh-1444)', function(done) {
      const articleSchema = new Schema({
        body: String,
        mediaAttach: {type: Schema.ObjectId, ref: '1444-Media'},
        author: String
      });
      const Article = db.model('1444-Article', articleSchema);

      const mediaSchema = new Schema({
        filename: String
      });
      const Media = db.model('1444-Media', mediaSchema);

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

              const a2 = docs.filter(function(d) {
                return d.body === 'body2';
              })[0];
              assert.equal(a2.mediaAttach.id, media.id);

              done();
            });
          });
      });
    });

    it('handles skip', function(done) {
      const movieSchema = new Schema({});
      const categorySchema = new Schema({movies: [{type: ObjectId, ref: 'gh-2252-1'}]});

      const Movie = db.model('gh-2252-1', movieSchema);
      const Category = db.model('gh-2252-2', categorySchema);

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
      const movieSchema = new Schema({title: String, actors: [String]});
      const categorySchema = new Schema({movies: [{type: ObjectId, ref: 'gh-1934-1'}]});

      const Movie = db.model('gh-1934-1', movieSchema);
      const Category = db.model('gh-1934-2', categorySchema);
      const movies = [
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
      const childSchema = new Schema({ name: String });
      const Child = db.model('gh2202', childSchema);

      const parentSchema = new Schema({
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
      const Parent = db.model('gh2202_0', parentSchema);

      Child.create([{ name: 'test1' }, { name: 'test2' }], function(error, c) {
        assert.ifError(error);
        const doc = {
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
      const teamSchema = new Schema({
        members: [{
          user: {type: ObjectId, ref: 'gh3279'},
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


      const Team = db.model('gh3279_1', teamSchema);

      const userSchema = new Schema({
        username: String
      });

      userSchema.set('toJSON', {
        transform: function(doc, ret) {
          return ret;
        }
      });

      const User = db.model('gh3279', userSchema);

      const user = new User({username: 'Test'});

      user.save(function(err) {
        assert.ifError(err);
        const team = new Team({members: [{user: user}]});

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
      const User = db.model('User', {name: String});
      const Group = db.model('Group', {
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

      const test = function(id) {
        const options = {populate: {path: 'users', model: 'User'}};
        Group.find({_id: id}, '-name', options, function(error, group) {
          assert.ifError(error);
          assert.ok(group[0].users[0]._id);
          done();
        });
      };
    });

    it('discriminator child schemas (gh-3878)', function(done) {
      const options = { discriminatorKey: 'kind' };
      const activitySchema = new Schema({ title: { type: String } }, options);

      const dateActivitySchema = new Schema({
        postedBy: { type: Schema.Types.ObjectId, ref: 'gh3878', required: true }
      }, options);

      const eventActivitySchema = new Schema({ test: String }, options);

      const User = db.model('gh3878', { name: String });
      const Activity = db.model('gh3878_0', activitySchema);
      const DateActivity = Activity.discriminator('Date', dateActivitySchema);
      const EventActivity = Activity.discriminator('Event', eventActivitySchema);

      User.create({ name: 'val' }, function(error, user) {
        assert.ifError(error);
        const dateActivity = { title: 'test', postedBy: user._id };
        DateActivity.create(dateActivity, function(error) {
          assert.ifError(error);
          const eventActivity = {
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
      const personSchema = new Schema({
        name: { type: String }
      });
      const jobSchema = new Schema({
        title: String,
        person: { type: Schema.Types.ObjectId, ref: 'gh3992' }
      });

      const Person = db.model('gh3992', personSchema);
      const Job = db.model('gh3992_0', jobSchema);

      Person.create({ name: 'Val' }, function(error, person) {
        assert.ifError(error);
        const job = { title: 'Engineer', person: person._id };
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
      const personSchema = new Schema({
        name: { type: String }
      });

      const teamSchema = new Schema({
        name: { type: String },
        members: [{ type: Schema.Types.ObjectId, ref: 'gh3904' }]
      });

      const gameSchema = new Schema({
        team: { type: Schema.Types.ObjectId, ref: 'gh3904_0' },
        opponent: { type: Schema.Types.ObjectId, ref: 'gh3904_0' }
      });

      const Person = db.model('gh3904', personSchema);
      const Team = db.model('gh3904_0', teamSchema);
      const Game = db.model('gh3904_1', gameSchema);

      const people = [
        { name: 'Shaq' },
        { name: 'Kobe' },
        { name: 'Horry' },
        { name: 'Duncan' },
        { name: 'Robinson' },
        { name: 'Johnson' }
      ];

      Person.create(people, function(error, people) {
        assert.ifError(error);
        const lakers = {
          name: 'Lakers',
          members: [people[0]._id, people[1]._id, people[2]._id]
        };
        const spurs = {
          name: 'Spurs',
          members: [people[3]._id, people[4]._id, people[5]._id]
        };
        const teams = [lakers, spurs];
        Team.create(teams, function(error, teams) {
          assert.ifError(error);
          const game = { team: teams[0]._id, opponent: teams[1]._id };
          Game.create(game, function(error, game) {
            assert.ifError(error);
            test(game._id);
          });
        });
      });

      function test(id) {
        const query = Game.findById(id).populate({
          path: 'team',
          select: 'name members',
          populate: { path: 'members', select: 'name' }
        });
        query.exec(function(error, doc) {
          assert.ifError(error);
          const arr = doc.toObject().team.members.map(function(v) {
            return v.name;
          });
          assert.deepEqual(arr, ['Shaq', 'Kobe', 'Horry']);
          done();
        });
      }
    });

    it('deep populate array -> array (gh-3954)', function(done) {
      const personSchema = new Schema({
        name: { type: String }
      });

      const teamSchema = new Schema({
        name: { type: String },
        members: [{ type: Schema.Types.ObjectId, ref: 'gh3954' }]
      });

      const gameSchema = new Schema({
        teams: [{ type: Schema.Types.ObjectId, ref: 'gh3954_0' }]
      });

      const Person = db.model('gh3954', personSchema);
      const Team = db.model('gh3954_0', teamSchema);
      const Game = db.model('gh3954_1', gameSchema);

      const people = [
        { name: 'Shaq' },
        { name: 'Kobe' },
        { name: 'Horry' },
        { name: 'Duncan' },
        { name: 'Robinson' },
        { name: 'Johnson' }
      ];

      Person.create(people, function(error, people) {
        assert.ifError(error);
        const lakers = {
          name: 'Lakers',
          members: [people[0]._id, people[1]._id, people[2]._id]
        };
        const spurs = {
          name: 'Spurs',
          members: [people[3]._id, people[4]._id, people[5]._id]
        };
        const teams = [lakers, spurs];
        Team.create(teams, function(error, teams) {
          assert.ifError(error);
          const game = {
            teams: [teams[0]._id, teams[1]._id]
          };
          Game.create(game, function(error, game) {
            assert.ifError(error);
            test(game._id);
          });
        });
      });

      function test(id) {
        const query = Game.findById(id).populate({
          path: 'teams',
          select: 'name members',
          populate: { path: 'members', select: 'name' }
        });
        query.exec(function(error, doc) {
          assert.ifError(error);
          const players = doc.toObject().teams[0].members.
            concat(doc.toObject().teams[1].members);
          const arr = players.map(function(v) {
            return v.name;
          });
          assert.deepEqual(arr,
            ['Shaq', 'Kobe', 'Horry', 'Duncan', 'Robinson', 'Johnson']);
          done();
        });
      }
    });

    it('4 level population (gh-3973)', function(done) {
      const level4Schema = new Schema({
        name: { type: String }
      });

      const level3Schema = new Schema({
        name: { type: String },
        level4: [{ type: Schema.Types.ObjectId, ref: 'level_4' }]
      });

      const level2Schema = new Schema({
        name: { type: String },
        level3: [{ type: Schema.Types.ObjectId, ref: 'level_3' }]
      });

      const level1Schema = new Schema({
        name: { type: String },
        level2: [{ type: Schema.Types.ObjectId, ref: 'level_2' }]
      });

      const level4 = db.model('level_4', level4Schema);
      const level3 = db.model('level_3', level3Schema);
      const level2 = db.model('level_2', level2Schema);
      const level1 = db.model('level_1', level1Schema);

      const l4docs = [{ name: 'level 4' }];

      level4.create(l4docs, function(error, l4) {
        assert.ifError(error);
        const l3docs = [{ name: 'level 3', level4: l4[0]._id }];
        level3.create(l3docs, function(error, l3) {
          assert.ifError(error);
          const l2docs = [{ name: 'level 2', level3: l3[0]._id }];
          level2.create(l2docs, function(error, l2) {
            assert.ifError(error);
            const l1docs = [{ name: 'level 1', level2: l2[0]._id }];
            level1.create(l1docs, function(error, l1) {
              assert.ifError(error);
              const opts = {
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
      const level3Schema = new Schema({
        name: { type: String }
      });

      const level2Schema = new Schema({
        name: { type: String },
        level31: [{ type: Schema.Types.ObjectId, ref: 'gh3974' }],
        level32: [{ type: Schema.Types.ObjectId, ref: 'gh3974' }]
      });

      const level1Schema = new Schema({
        name: { type: String },
        level2: [{ type: Schema.Types.ObjectId, ref: 'gh3974_0' }]
      });

      const level3 = db.model('gh3974', level3Schema);
      const level2 = db.model('gh3974_0', level2Schema);
      const level1 = db.model('gh3974_1', level1Schema);

      const l3 = [
        { name: 'level 3/1' },
        { name: 'level 3/2' }
      ];
      level3.create(l3, function(error, l3) {
        assert.ifError(error);
        const l2 = [
          { name: 'level 2', level31: l3[0]._id, level32: l3[1]._id }
        ];
        level2.create(l2, function(error, l2) {
          assert.ifError(error);
          const l1 = [{ name: 'level 1', level2: l2[0]._id }];
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
        user: { type: ObjectId, ref: 'gh4073_0' }
      });

      const CommentEventSchema = new Schema({
        comment: { type: ObjectId, ref: 'gh4073_1' }
      });

      const BlogPostEventSchema = new Schema({
        blogpost: { type: ObjectId, ref: 'gh4073_2' }
      });

      const User = db.model('gh4073_0', UserSchema);
      const Comment = db.model('gh4073_1', CommentSchema);
      const BlogPost = db.model('gh4073_2', BlogPostSchema);

      const Event = db.model('gh4073_3', EventSchema);
      const UserEvent = Event.discriminator('User4073', UserEventSchema);
      const CommentEvent = Event.discriminator('Comment4073',
        CommentEventSchema);
      const BlogPostEvent = Event.discriminator('BlogPost4073', BlogPostEventSchema);

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
        });
    });

    it('dynref bug (gh-4104)', function(done) {
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

      const Thing = db.model('Thing4104', ThingSchema);
      const Person = db.model('Person4104', PersonSchema);
      const Animal = db.model('Animal4104', AnimalSchema);

      Person.create({ name: 'Val' }, function(error, person) {
        assert.ifError(error);
        Animal.create({ name: 'Air Bud' }, function(error, animal) {
          assert.ifError(error);
          const obj1 = { createdByModel: 'Person4104', createdBy: person._id };
          const obj2 = { createdByModel: 'Animal4104', createdBy: animal._id };
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
      const demoWrapperSchema = new Schema({
        demo: [{
          type: String,
          ref: 'gh4656'
        }]
      });
      const demoSchema = new Schema({ name: String });

      const Demo = db.model('gh4656', demoSchema);
      const DemoWrapper = db.model('gh4656_0', demoWrapperSchema);

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
      const PersonSchema = new Schema({
        name: { type: String }
      });

      const BandSchema = new Schema({
        people: [{
          type: mongoose.Schema.Types.ObjectId
        }]
      });

      const Person = db.model('gh4284_b', PersonSchema);
      const Band = db.model('gh4284_b0', BandSchema);

      const band = { people: [new mongoose.Types.ObjectId()] };
      Band.create(band, function(error, band) {
        assert.ifError(error);
        const opts = { path: 'people', model: Person };
        Band.findById(band).populate(opts).exec(function(error, band) {
          assert.ifError(error);
          assert.equal(band.people.length, 0);
          done();
        });
      });
    });

    it('empty populate string is a no-op (gh-4702)', function(done) {
      const BandSchema = new Schema({
        people: [{
          type: mongoose.Schema.Types.ObjectId
        }]
      });

      const Band = db.model('gh4702', BandSchema);

      const band = { people: [new mongoose.Types.ObjectId()] };
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
      const UserSchema = new mongoose.Schema({
        name: {
          type: String,
          default: ''
        }
      });
      db.model('gh4365_0', UserSchema);

      const GroupSchema = new mongoose.Schema({
        name: String,
        members: [String]
      });

      const OrganizationSchema = new mongoose.Schema({
        members: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'gh4365_0'
        }],
        groups: [GroupSchema]
      });
      const OrganizationModel = db.model('gh4365_1', OrganizationSchema);

      const org = {
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
        const PersonSchema = new Schema({
          name: String,
          band: String
        });

        const BandSchema = new Schema({
          name: String
        });
        BandSchema.virtual('members', {
          ref: 'gh2562',
          localField: 'name',
          foreignField: 'band'
        });

        const Person = db.model('gh2562', PersonSchema);
        const Band = db.model('gh2562_0', BandSchema);

        const people = ['Axl Rose', 'Slash'].map(function(v) {
          return { name: v, band: 'Guns N\' Roses' };
        });
        Person.create(people, function(error) {
          assert.ifError(error);
          Band.create({ name: 'Guns N\' Roses' }, function(error) {
            assert.ifError(error);
            const query = { name: 'Guns N\' Roses' };
            Band.findOne(query).populate('members').exec(function(error, gnr) {
              assert.ifError(error);
              assert.equal(gnr.members.length, 2);
              done();
            });
          });
        });
      });

      it('match (gh-6787)', function() {
        const PersonSchema = new Schema({ name: String, band: String });
        const BandSchema = new Schema({ name: String });
        BandSchema.virtual('members', {
          ref: 'gh6787_Person',
          localField: 'name',
          foreignField: 'band',
          options: {
            match: { name: /^a/i }
          }
        });

        const Person = db.model('gh6787_Person', PersonSchema);
        const Band = db.model('gh6787_Band', BandSchema);

        const people = ['BB', 'AA', 'AB', 'BA'].map(function(v) {
          return { name: v, band: 'Test' };
        });

        return co(function*() {
          yield Person.create(people);
          yield Band.create({ name: 'Test' });

          const band = yield Band.findOne().populate('members');
          assert.deepEqual(band.members.map(b => b.name).sort(), ['AA', 'AB']);
        });
      });

      it('multiple source docs', function(done) {
        const PersonSchema = new Schema({
          name: String,
          band: String
        });

        const BandSchema = new Schema({
          name: String
        });
        BandSchema.virtual('members', {
          ref: 'gh2562_a0',
          localField: 'name',
          foreignField: 'band'
        });

        const Person = db.model('gh2562_a0', PersonSchema);
        const Band = db.model('gh2562_a1', BandSchema);

        let people = ['Axl Rose', 'Slash'].map(function(v) {
          return { name: v, band: 'Guns N\' Roses' };
        });
        people = people.concat(['Vince Neil', 'Nikki Sixx'].map(function(v) {
          return { name: v, band: 'Motley Crue' };
        }));
        Person.create(people, function(error) {
          assert.ifError(error);
          const bands = [
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
                assert.deepEqual(bands[0].members.map(v => v.name),
                  ['Axl Rose', 'Slash']);

                assert.equal(bands[1].name, 'Motley Crue');
                assert.equal(bands[1].members.length, 2);
                assert.deepEqual(bands[1].members.map(v => v.name),
                  ['Nikki Sixx', 'Vince Neil']);
                done();
              });
          });
        });
      });

      it('catchable error if localField or foreignField not specified (gh-6767)', function() {
        const BandSchema = new Schema({
          name: String
        });
        BandSchema.virtual('members');

        const Band = db.model('gh6767_Band', BandSchema);

        return Band.create({ name: 'Motley Crue' }).
          then(() => Band.find().populate('members')).
          catch(error => {
            assert.ok(error.message.indexOf('foreignField') !== -1, error.message);
          });
      });

      it('source array', function(done) {
        const PersonSchema = new Schema({
          name: String
        });

        const BandSchema = new Schema({
          name: String,
          people: [String]
        });
        BandSchema.virtual('members', {
          ref: 'gh2562_b0',
          localField: 'people',
          foreignField: 'name'
        });

        const Person = db.model('gh2562_b0', PersonSchema);
        const Band = db.model('gh2562_b1', BandSchema);

        const bands = [
          { name: 'Guns N\' Roses', people: ['Axl Rose', 'Slash'] },
          { name: 'Motley Crue', people: ['Vince Neil', 'Nikki Sixx'] }
        ];
        const people = [
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
                assert.deepEqual(bands[0].members.map(v => v.name),
                  ['Axl Rose', 'Slash']);

                assert.equal(bands[1].name, 'Motley Crue');
                assert.equal(bands[1].members.length, 2);
                assert.deepEqual(bands[1].members.map(v => v.name),
                  ['Nikki Sixx', 'Vince Neil']);

                done();
              });
          });
        });
      });

      it('multiple paths (gh-4234)', function(done) {
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
          ref: 'gh4234',
          localField: '_id',
          foreignField: 'authored'
        });
        BlogPostSchema.virtual('favoritedBy', {
          ref: 'gh4234',
          localField: '_id',
          foreignField: 'favorites'
        });

        const Person = db.model('gh4234', PersonSchema);
        const BlogPost = db.model('gh4234_0', BlogPostSchema);

        const blogPosts = [{ _id: 0, title: 'Bacon is Great' }];
        const people = [{ name: 'Val', authored: [0], favorites: [0] }];

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
        const PersonSchema = new Schema({
          name: String,
          authored: [Number]
        });

        const BlogPostSchema = new Schema({
          _id: Number,
          title: String
        });
        BlogPostSchema.virtual('author', {
          ref: 'gh4928',
          localField: '_id',
          foreignField: 'authored',
          justOne: true
        });

        const CollectionSchema = new Schema({
          blogPosts: [BlogPostSchema]
        });

        const Person = db.model('gh4928', PersonSchema);
        const Collection = db.model('gh4928_0', CollectionSchema);

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
        const PersonSchema = new Schema({
          name: String,
          authored: [Number]
        });

        const BlogPostSchema = new Schema({
          _id: Number,
          title: String
        });
        BlogPostSchema.virtual('author', {
          ref: 'gh4263',
          localField: '_id',
          foreignField: 'authored',
          justOne: true
        });

        const Person = db.model('gh4263', PersonSchema);
        const BlogPost = db.model('gh4263_0', BlogPostSchema);

        const blogPosts = [{ _id: 0, title: 'Bacon is Great' }];
        const people = [
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

      it('justOne + lean (gh-6234)', function() {
        return co(function*() {
          const PersonSchema = new mongoose.Schema({
            name: String,
            band: String
          });

          const BandSchema = new mongoose.Schema({
            name: String
          });

          BandSchema.virtual('member', {
            ref: 'gh6234',
            localField: 'name',
            foreignField: 'band',
            justOne: true
          });

          const Person = db.model('gh6234', PersonSchema);
          const Band = db.model('gh6234_0', BandSchema);

          yield Band.create({ name: 'Guns N\' Roses' });
          yield Band.create({ name: 'Motley Crue' });
          yield Person.create({ name: 'Axl Rose', band: 'Guns N\' Roses' });
          yield Person.create({ name: 'Slash', band: 'Guns N\' Roses' });
          yield Person.create({ name: 'Vince Neil', band: 'Motley Crue' });
          yield Person.create({ name: 'Nikki Sixx', band: 'Motley Crue' });

          const res = yield Band.find().
            sort({ name: 1 }).
            populate('member').
            lean();

          assert.equal(res.length, 2);
          assert.equal(res[0].name, 'Guns N\' Roses');
          assert.equal(res[0].member.name, 'Axl Rose');
          assert.equal(res[1].name, 'Motley Crue');
          assert.equal(res[1].member.name, 'Vince Neil');
        });
      });

      it('justOne underneath array (gh-6867)', function() {
        return co(function*() {
          const ReportItemSchema = new Schema({
            idItem: String
          });

          const ReportSchema = new Schema({
            items: [ReportItemSchema]
          });

          ReportItemSchema.virtual('itemDetail', {
            ref: 'gh6867_Item',
            localField: 'idItem',
            foreignField: '_id',
            justOne: true // here is the problem
          });

          const ItemSchema = new Schema({
            _id: String
          });

          const ReportModel = db.model('gh6867_Report', ReportSchema);
          const ItemModel = db.model('gh6867_Item', ItemSchema);

          yield ItemModel.create({ _id: 'foo' });

          yield ReportModel.create({
            items: [{ idItem: 'foo' }, { idItem: 'bar' }]
          });

          let doc = yield ReportModel.findOne({}).populate('items.itemDetail');
          doc = doc.toObject({ virtuals: true });
          assert.equal(doc.items[0].itemDetail._id, 'foo');
          assert.ok(!doc.items[1].itemDetail);
        });
      });

      it('with no results and justOne (gh-4284)', function(done) {
        const PersonSchema = new Schema({
          name: String,
          authored: [Number]
        });

        const BlogPostSchema = new Schema({
          _id: Number,
          title: String
        });
        BlogPostSchema.virtual('author', {
          ref: 'gh4284',
          localField: '_id',
          foreignField: 'authored',
          justOne: true
        });

        const Person = db.model('gh4284', PersonSchema);
        const BlogPost = db.model('gh4284_0', BlogPostSchema);

        const blogPosts = [
          { _id: 0, title: 'Bacon is Great' },
          { _id: 1, title: 'Bacon is OK' }
        ];
        const people = [
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
        const UserSchema = new Schema({
          openId: {
            type: String,
            unique: true
          }
        });
        const TaskSchema = new Schema({
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

        const User = db.model('gh4329', UserSchema);
        const Task = db.model('gh4329_0', TaskSchema);

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
                const users = tasks.map(function(task) {
                  return task.user.openId;
                });
                assert.deepEqual(users, ['user1', 'user2']);
                done();
              });
          });
        });
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
          toJSON:   { virtuals: true }
        });

        BSchema.virtual('a', {
          ref: 'gh4618',
          localField: 'a_id',
          foreignField: '_id'
        });

        const A = db.model('gh4618', ASchema);
        const B = db.model('gh4618_0', BSchema);

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
          toJSON:   { virtuals: true }
        });

        BSchema.virtual('a', {
          ref: 'gh5704',
          localField: function() { return this.localField; },
          foreignField: function() { return '_id'; },
          justOne: true
        });

        const A = db.model('gh5704', ASchema);
        const B = db.model('gh5704_0', BSchema);

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

        const A1 = db.model('gh5602_1', ASchema);
        const A2 = db.model('gh5602_2', ASchema);
        const B = db.model('gh5602_0', BSchema);

        A1.create({ name: 'a1' }).
          then(function(a1) {
            return A2.create({ name: 'a2' }).then(function(res) {
              return [a1].concat(res);
            });
          }).
          then(function(as) {
            return B.create([
              { name: 'test1', referencedModel: 'gh5602_1', aId: as[0]._id },
              { name: 'test2', referencedModel: 'gh5602_2', aId: as[1]._id }
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

      it('with functions for match (gh-7397)', function() {
        const ASchema = new Schema({
          name: String,
          createdAt: Date
        });

        const BSchema = new Schema({
          as: [{ type: ObjectId, ref: 'gh7397_A' }],
          minDate: Date
        });

        const A = db.model('gh7397_A', ASchema);
        const B = db.model('gh7397_B', BSchema);

        return co(function*() {
          const as = yield A.create([
            { name: 'old', createdAt: '2015-06-01' },
            { name: 'newer', createdAt: '2017-06-01' },
            { name: 'newest', createdAt: '2019-06-01' }
          ]);

          yield B.create({ as: as.map(a => a._id), minDate: '2016-01-01' });
          const b = yield B.findOne().populate({
            path: 'as',
            match: doc => ({ createdAt: { $gte: doc.minDate } })
          });
          assert.equal(b.as.length, 2);
          assert.deepEqual(b.as.map(a => a.name), ['newer', 'newest']);

          yield B.create({ as: as.map(a => a._id), minDate: '2018-01-01' });
          const bs = yield B.find().sort({ minDate: 1 }).populate({
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
      });

      it('with functions for match and foreignField (gh-7397)', function() {
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
          ref: 'gh7397_A1',
          localField: '_id',
          foreignField: function() { return this.alternateProperty ? 'b2' : 'b'; },
          options: { match: doc => ({ createdAt: { $gte: doc.minDate } }) }
        });

        const A = db.model('gh7397_A1', ASchema);
        const B = db.model('gh7397_B1', BSchema);

        return co(function*() {
          let bs = yield B.create([
            { minDate: '2016-01-01' },
            { minDate: '2016-01-01', alternateProperty: true }
          ]);
          yield A.create([
            { name: 'old', createdAt: '2015-06-01', b: bs[0]._id, b2: bs[1]._id },
            { name: 'newer', createdAt: '2017-06-01', b: bs[0]._id, b2: bs[1]._id },
            { name: 'newest', createdAt: '2019-06-01', b: bs[0]._id, b2: bs[1]._id }
          ]);

          bs = yield B.find().sort({ minDate: 1 }).populate('as');

          let b = bs[0];
          assert.equal(b.as.length, 2);
          assert.deepEqual(b.as.map(a => a.name).sort(), ['newer', 'newest']);

          b = bs[1];
          assert.equal(b.as.length, 2);
          assert.deepEqual(b.as.map(a => a.name).sort(), ['newer', 'newest']);
        });
      });

      it('with function for refPath (gh-6669)', function() {
        const connectionSchema = new Schema({
          destination: String
        });

        const Conn = db.model('gh-6669_C', connectionSchema);

        const userSchema = new Schema({
          name: String
        });

        const User = db.model('gh-6669_U', userSchema);

        const agentSchema = new Schema({
          vendor: String
        });

        const Agent = db.model('gh-6669_A', agentSchema);

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

        const Record = db.model('gh-6669_R', recordSchema);

        const connection = new Conn({ destination: '192.168.1.15' });
        const user = new User({ name: 'Kev' });
        const agent = new Agent({ vendor: 'chrome' });
        const record = new Record({
          connections: [{ kind: 'gh-6669_C', item: connection._id }],
          users: [{ kind: 'gh-6669_U', item: user._id }],
          agents: [{ kind: 'gh-6669_A', item: agent._id }]
        });

        return co(function*() {
          yield connection.save();
          yield user.save();
          yield agent.save();
          yield record.save();
          const doc = yield Record.findOne({})
            .populate('connections.item')
            .populate('users.item')
            .populate('agents.item');
          assert.strictEqual(doc.connections[0].item.destination, '192.168.1.15');
          assert.strictEqual(doc.users[0].item.name, 'Kev');
          assert.strictEqual(doc.agents[0].item.vendor, 'chrome');
        });
      });

      it('with no results (gh-4284)', function(done) {
        const PersonSchema = new Schema({
          name: String,
          authored: [Number]
        });

        const BlogPostSchema = new Schema({
          _id: Number,
          title: String
        });
        BlogPostSchema.virtual('authors', {
          ref: 'gh4284_a',
          localField: '_id',
          foreignField: 'authored'
        });

        const Person = db.model('gh4284_a', PersonSchema);
        const BlogPost = db.model('gh4284_a0', BlogPostSchema);

        const blogPosts = [
          { _id: 0, title: 'Bacon is Great' },
          { _id: 1, title: 'Bacon is OK' },
          { _id: 2, title: 'Bacon is not great' }
        ];
        const people = [
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
                const arr = posts[0].toObject({ virtuals: true }).authors.
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

      it('virtual is undefined when not populated (gh-7795)', function() {
        const BlogPostSchema = new Schema({
          _id: Number,
          title: String
        });
        BlogPostSchema.virtual('authors', {
          ref: 'gh7795_Author',
          localField: '_id',
          foreignField: 'authored'
        });

        const BlogPost = db.model('gh7795_BlogPost', BlogPostSchema);

        return co(function*() {
          yield BlogPost.create({ _id: 1, title: 'test' });

          const doc = yield BlogPost.findOne();
          assert.strictEqual(doc.authors, void 0);
        });
      });

      it('deep populate virtual -> conventional (gh-4261)', function(done) {
        const PersonSchema = new Schema({
          name: String
        });

        PersonSchema.virtual('blogPosts', {
          ref: 'gh4261',
          localField: '_id',
          foreignField: 'author'
        });

        const BlogPostSchema = new Schema({
          title: String,
          author: { type: ObjectId },
          comments: [{ author: { type: ObjectId, ref: 'gh4261' } }]
        });

        const Person = db.model('gh4261', PersonSchema);
        const BlogPost = db.model('gh4261_0', BlogPostSchema);

        const people = [
          { name: 'Val' },
          { name: 'Test' }
        ];

        Person.create(people, function(error, people) {
          assert.ifError(error);
          const post = {
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
        const ASchema = new Schema({
          name: String
        });
        ASchema.virtual('bs', {
          ref: 'gh4278_1',
          localField: '_id',
          foreignField: 'a'
        });

        const BSchema = new Schema({
          a: mongoose.Schema.Types.ObjectId,
          name: String
        });
        BSchema.virtual('cs', {
          ref: 'gh4278_2',
          localField: '_id',
          foreignField: 'b'
        });

        const CSchema = new Schema({
          b: mongoose.Schema.Types.ObjectId,
          name: String
        });

        const A = db.model('gh4278_0', ASchema);
        const B = db.model('gh4278_1', BSchema);
        const C = db.model('gh4278_2', CSchema);

        A.create({ name: 'A1' }, function(error, a) {
          assert.ifError(error);
          B.create({ name: 'B1', a: a._id }, function(error, b) {
            assert.ifError(error);
            C.create({ name: 'C1', b: b._id }, function(error) {
              assert.ifError(error);
              const options = {
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
        const tagSchema = new mongoose.Schema({
          name: String,
          tagId: { type:String, unique:true }
        });

        const blogPostSchema = new mongoose.Schema({
          name : String,
          body: String,
          tags : [String]
        });

        blogPostSchema.virtual('tagsDocuments', {
          ref: 'gh4585', // model
          localField: 'tags',
          foreignField: 'tagId'
        });

        const Tag = db.model('gh4585', tagSchema);
        const BlogPost = db.model('gh4585_0', blogPostSchema);

        const tags = [
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

        const Person = db.model('gh4288', PersonSchema);
        const BlogPost = db.model('gh4288_0', BlogPostSchema);

        const blogPosts = [
          { _id: 0, title: 'Bacon is Great' }
        ];
        const people = [
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
        const ClusterSchema = new Schema({
          name: String
        });
        const Cluster = db.model('gh4923', ClusterSchema);

        const ZoneSchema = new Schema({
          name: String,
          clusters: {
            type: [ObjectId],
            ref: 'gh4923'
          }
        });
        const Zone = db.model('gh4923_1', ZoneSchema);

        const DocSchema = new Schema({
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
        const Doc = db.model('gh4923_2', DocSchema);

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
                done();
              });
          }).
          catch(done);
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
          ref: 'gh4741',
          localField: '_id',
          foreignField: 'user',
          options: { sort: { date: -1 }, limit: 2 }
        });

        const Session = db.model('gh4741', sessionSchema);
        const User = db.model('gh4741_0', userSchema);

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
        const userSchema = new Schema({
          name: String
        });

        const User = db.model('gh5036', userSchema);

        User.findOne().populate().exec(function(error) {
          assert.ifError(error);
          done();
        });
      });

      it('attaches `_id` property to ref ids (gh-6359) (gh-6115)', function() {
        const articleSchema = new Schema({
          title: String,
          author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'gh6115_Author'
          }
        });
        const authorSchema = new Schema({
          name: String
        });

        const Article = db.model('gh6115_Article', articleSchema);
        const Author = db.model('gh6115_Author', authorSchema);

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

        it('auto select populated fields (gh-5669) (gh-5685)', function(done) {
          const ProductSchema = new mongoose.Schema({
            name: {
              type: String
            },
            categories: {
              type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: 'gh5669'
              }],
              select: false
            }
          });

          const CategorySchema = new Schema({ name: String });
          const Product = db.model('gh5669_0', ProductSchema);
          const Category = db.model('gh5669', CategorySchema);

          Category.create({ name: 'Books' }, function(error, doc) {
            assert.ifError(error);
            const product = {
              name: 'Professional AngularJS',
              categories: [doc._id]
            };
            Product.create(product, function(error, product) {
              assert.ifError(error);
              Product.findById(product._id).populate('categories').exec(function(error, product) {
                assert.ifError(error);
                assert.equal(product.categories.length, 1);
                assert.equal(product.categories[0].name, 'Books');
                Product.findById(product._id).populate('categories').select({ categories: 0 }).exec(function(error, product) {
                  assert.ifError(error);
                  assert.ok(!product.categories);
                  Product.findById(product._id).select({ name: 0 }).populate('categories').exec(function(error, product) {
                    assert.ifError(error);
                    assert.equal(product.categories.length, 1);
                    assert.equal(product.categories[0].name, 'Books');
                    assert.ok(!product.name);
                    done();
                  });
                });
              });
            });
          });
        });

        it('disabling at schema level (gh-6546)', function() {
          const Person = db.model('gh6546_Person', new Schema({ name: String }));

          const bookSchema = new Schema({
            title: 'String',
            author: { type: 'ObjectId', ref: 'gh6546_Person' }
          }, { selectPopulatedPaths: false });
          const Book = db.model('gh6546_Book', bookSchema);

          return co(function*() {
            const author = yield Person.create({ name: 'Val' });
            yield Book.create({
              title: 'Mastering Async/Await',
              author: author._id
            });

            const res = yield Book.findOne().select('title').populate('author');
            assert.ok(!res.author);
          });
        });

        it('disabling at global level (gh-6546)', function() {
          const Person = db.model('gh6546_Person_0', new Schema({ name: String }));

          const bookSchema = new Schema({
            title: 'String',
            author: { type: 'ObjectId', ref: 'gh6546_Person_0' }
          });
          const Book = db.model('gh6546_Book_0', bookSchema);

          mongoose.set('selectPopulatedPaths', false);

          return co(function*() {
            const author = yield Person.create({ name: 'Val' });
            yield Book.create({
              title: 'Mastering Async/Await',
              author: author._id
            });

            const res = yield Book.findOne().select('title').populate('author');
            assert.ok(!res.author);
          });
        });

        it('schema overwrites global (gh-6546)', function() {
          const Person = db.model('gh6546_Person_1', new Schema({ name: String }));

          const bookSchema = new Schema({
            title: 'String',
            author: { type: 'ObjectId', ref: 'gh6546_Person_1' }
          }, { selectPopulatedPaths: true });
          const Book = db.model('gh6546_Book_1', bookSchema);

          mongoose.set('selectPopulatedPaths', false);

          return co(function*() {
            const author = yield Person.create({ name: 'Val' });
            yield Book.create({
              title: 'Mastering Async/Await',
              author: author._id
            });

            const res = yield Book.findOne().select('title').populate('author');
            assert.equal(res.author.name, 'Val');
          });
        });
      });

      it('handles populating with discriminators that may not have a ref (gh-4817)', function(done) {
        const imagesSchema = new mongoose.Schema({
          name: {
            type: String,
            required: true
          }
        });
        const Image = db.model('gh4817', imagesSchema, 'images');

        const fieldSchema = new mongoose.Schema({
          name: {
            type: String,
            required: true
          }
        });
        const Field = db.model('gh4817_0', fieldSchema, 'fields');

        const imageFieldSchema = new mongoose.Schema({
          value: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'gh4817',
            default: null
          }
        });
        const FieldImage = Field.discriminator('gh4817_1', imageFieldSchema);

        const textFieldSchema = new mongoose.Schema({
          value: {
            type: Schema.Types.Mixed,
            required: true,
            default: {}
          }
        });
        const FieldText = Field.discriminator('gh4817_2', textFieldSchema);

        const objectSchema = new mongoose.Schema({
          name: {
            type: String,
            required: true
          },
          fields: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'gh4817_0'
          }]
        });
        const ObjectModel = db.model('gh4817_3', objectSchema, 'objects');

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
        const schema = new Schema({
          parent: mongoose.Schema.Types.ObjectId,
          name: String
        });

        const Person = db.model('gh4843', schema);

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
        const PersonSchema = new Schema({
          name: String
        });

        PersonSchema.virtual('blogPosts', {
          ref: 'gh4631_0',
          localField: '_id',
          foreignField: 'author'
        });

        const BlogPostSchema = new Schema({
          title: String,
          author: { type: ObjectId },
          comments: [{ author: { type: ObjectId, ref: 'gh4631' } }]
        });

        const Person = db.model('gh4631', PersonSchema);
        const BlogPost = db.model('gh4631_0', BlogPostSchema);

        const people = [
          { name: 'Val' },
          { name: 'Test' }
        ];

        Person.create(people, function(error, people) {
          assert.ifError(error);
          const post = {
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
          const mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
          if (!mongo34) {
            done();
            return;
          }

          test();
        });

        function test() {
          const parentSchema = new Schema({
            name: String,
            child: {
              type: 'Decimal128',
              ref: 'gh4759'
            }
          });

          const childSchema = new Schema({
            _id: 'Decimal128',
            name: String
          });

          const Child = db.model('gh4759', childSchema);
          const Parent = db.model('gh4759_0', parentSchema);

          const decimal128 = childSchema.path('_id').cast('1.337e+3');
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
        const ASchema = new Schema({
          title: { type: String, required: true, trim : true }
        });

        ASchema.virtual('brefs', {
          ref: 'gh5128_0',
          localField: '_id',
          foreignField: 'arefs'
        });

        const BSchema = new Schema({
          arefs: [{ type: ObjectId, required: true, ref: 'gh5128' }]
        });

        const a = db.model('gh5128', ASchema);
        const b = db.model('gh5128_0', BSchema);

        const id1 = new mongoose.Types.ObjectId();

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
          ref: 'gh5431',
          localField: 'name',
          foreignField: 'band',
          justOne: false
        });

        bandSchema.set('toObject', { virtuals: true });

        const Person = db.model('gh5431', personSchema);
        const Band = db.model('gh5431_0', bandSchema);

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
          ref: 'gh5240',
          localField: 'parentId',
          foreignField: '_id',
          justOne: true
        });
        const teamSchema = new Schema({ people: [childSchema] });

        const Parent = db.model('gh5240', parentSchema);
        const Team = db.model('gh5240_0', teamSchema);

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
        const parentSchema = new Schema({
          name: String,
          child: mongoose.Schema.Types.ObjectId
        });
        const childSchema = new Schema({
          name: String
        });

        const Parent = db.model('gh5334_0', parentSchema);
        const Child = db.model('gh5334', childSchema);

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

      it('retains limit when using cursor (gh-5468)', function(done) {
        const refSchema = new mongoose.Schema({
          _id: Number,
          name: String
        }, { versionKey: null });
        const Ref = db.model('gh5468', refSchema);

        const testSchema = new mongoose.Schema({
          _id: Number,
          prevnxt: [{ type: Number, ref: 'gh5468' }]
        });
        const Test = db.model('gh5468_0', testSchema);

        const docs = [1, 2, 3, 4, 5, 6].map(function(i) {
          return { _id: i };
        });
        Ref.create(docs, function(error) {
          assert.ifError(error);
          const docs = [
            { _id: 1, prevnxt: [1, 2, 3] },
            { _id: 2, prevnxt: [4, 5, 6] }
          ];
          Test.create(docs, function(error) {
            assert.ifError(error);

            const cursor = Test.
              find().
              populate({ path: 'prevnxt', options: { limit: 2 } }).
              cursor();

            cursor.on('data', function(doc) {
              assert.equal(doc.prevnxt.length, 2);
            });
            cursor.on('error', done);
            cursor.on('end', function() {
              done();
            });
          });
        });
      });

      it('virtuals + doc.populate() (gh-5311)', function(done) {
        const parentSchema = new Schema({ name: String });
        const childSchema = new Schema({
          parentId: mongoose.Schema.Types.ObjectId
        });
        childSchema.virtual('parent', {
          ref: 'gh5311',
          localField: 'parentId',
          foreignField: '_id',
          justOne: true
        });

        const Parent = db.model('gh5311', parentSchema);
        const Child = db.model('gh5311_0', childSchema);

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
        const myModelSchema = new Schema({
          virtualRefKey: {type: String, ref: 'gh5331'}
        });
        myModelSchema.set('toJSON', {virtuals:true});
        myModelSchema.virtual('populatedVirtualRef', {
          ref: 'gh5331',
          localField: 'virtualRefKey',
          foreignField: 'handle'
        });

        const otherModelSchema = new Schema({
          handle: String
        });

        const MyModel = db.model('gh5331_0', myModelSchema);
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
        const someModelSchema = new mongoose.Schema({
          name: String
        });

        const SomeModel = db.model('gh4715', someModelSchema);

        const schema0 = new mongoose.Schema({
          name1: String
        });

        schema0.virtual('detail', {
          ref: 'gh4715',
          localField: '_id',
          foreignField: '_id',
          justOne: true
        });

        const schemaMain = new mongoose.Schema({
          name: String,
          obj: schema0
        });

        const ModelMain = db.model('gh4715_0', schemaMain);

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

      it('populate with missing schema (gh-5364)', function(done) {
        const Foo = db.model('gh5364', new mongoose.Schema({
          bar: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Bar'
          }
        }));

        Foo.create({ bar: new mongoose.Types.ObjectId() }, function(error) {
          assert.ifError(error);
          Foo.find().populate('bar').exec(function(error) {
            assert.ok(error);
            assert.equal(error.name, 'MissingSchemaError');
            done();
          });
        });
      });

      it('populate with missing schema (gh-5460)', function(done) {
        const refSchema = new mongoose.Schema({
          name: String
        });

        db.model('gh5460', refSchema);

        const schema = new mongoose.Schema({
          ref: { type: mongoose.Schema.Types.ObjectId, ref: 'gh5460' }
        });

        const Model = db.model('gh5460_0', schema);

        const q = Model.find().read('secondaryPreferred').populate('ref');
        assert.equal(q._mongooseOptions.populate['ref'].options.readPreference.mode,
          'secondaryPreferred');
        done();
      });

      it('array underneath non-existent array (gh-6245)', function() {
        return co(function*() {
          let DepartmentSchema = new Schema({name: String});
          let CompanySchema = new Schema({
            name: String,
            departments: [DepartmentSchema]
          });

          let Company = db.model('gh6245', CompanySchema);
          const company = new Company({
            name: 'Uber',
            departments: [{name: 'Security'}, {name: 'Engineering'}],
          });

          yield company.save();

          const EmployeeSchema = new Schema({name: String});
          DepartmentSchema = new Schema({
            name: String,
            employees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'gh6245' }]
          });
          CompanySchema = new Schema({
            name: String,
            departments: [DepartmentSchema]
          });

          delete db.models['gh6245'];
          const Employee = db.model('gh6245_0', EmployeeSchema);
          Company = db.model('gh6245', CompanySchema);

          let uber = yield Company.findOne({ name: 'Uber' });
          const kurt = yield Employee.create({ name: 'Kurt' });

          const engineering = uber.departments.
            find(d => d.name === 'Engineering');
          engineering.employees.addToSet(kurt);
          yield uber.save();

          uber = yield Company.findOne({ name: 'Uber' }).
            populate('departments.employees');
          assert.equal(uber.departments[0].name, 'Security');
          // Take extra care to make sure this isn't `null`
          assert.ok(Array.isArray(uber.departments[0].employees));
          assert.equal(uber.departments[0].employees.length, 0);
        });
      });

      it('virtuals with justOne false and foreign field not found (gh-5336)', function(done) {
        const BandSchema = new mongoose.Schema({
          name: String,
          active: Boolean
        });

        const Band = db.model('gh5336', BandSchema);

        const PersonSchema = new mongoose.Schema({
          name: String,
          bands: [String]
        });

        PersonSchema.virtual('bandDetails', {
          ref: 'gh5336',
          localField: 'bands',
          foreignField: 'name',
          justOne: false
        });
        const Person = db.model('gh5336_0', PersonSchema);

        const band = new Band({name: 'The Beatles', active: false});
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
        const BandSchema = new mongoose.Schema({
          name: String,
          active: Boolean
        });

        const Band = db.model('gh5336_10', BandSchema);

        const PersonSchema = new mongoose.Schema({
          name: String,
          bands: [String]
        });

        PersonSchema.virtual('bandDetails', {
          ref: 'gh5336_10',
          localField: 'bands',
          foreignField: 'name',
          justOne: true
        });
        const Person = db.model('gh5336_11', PersonSchema);

        const band = new Band({name: 'The Beatles', active: false});
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
        const childSchema = new mongoose.Schema({
          name: String,
          parentId: mongoose.Schema.Types.ObjectId
        });

        const Child = db.model('gh4959', childSchema);

        const parentSchema = new mongoose.Schema({
          name: String
        });

        parentSchema.virtual('detail', {
          ref: 'gh4959',
          localField: '_id',
          foreignField: 'parentId',
          justOne: true
        });

        const Parent = db.model('gh4959_0', parentSchema);

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
        const User = db.model('gh5564', userSchema);

        const testSchema = new mongoose.Schema({
          users: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'gh5564'
          }]
        });
        const Test = db.model('gh5564_0', testSchema);

        return User.create({}).
          then(function(user) {
            return Test.create({ users: [user._id] });
          }).
          then(function(test) {
            const promise = test.populate('users').execPopulate();
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
          author: { type: ObjectId, ref: 'gh5542' }
        });

        AuthorSchema.virtual('books', {
          ref: 'gh5542_0',
          localField: '_id',
          foreignField: 'author',
          justOne: true
        });

        const Author = db.model('gh5542', AuthorSchema);
        const Book = db.model('gh5542_0', BookSchema);

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

        const Child = db.model('gh5037', childSchema);

        const parentSchema = new mongoose.Schema({
          name: String
        });

        parentSchema.virtual('detail', {
          ref: 'gh5037',
          localField: '_id',
          foreignField: 'parent.id',
          justOne: true
        });

        const Parent = db.model('gh5037_0', parentSchema);

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
            ref: 'gh5858_User',
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

        const User = db.model('gh5858_User', { name: String });
        const Activity = db.model('gh5858_0', activitySchema);
        const DateActivity = Activity.discriminator('gh5858_1', dateActivitySchema);
        const EventActivity = Activity.discriminator('gh5858_2', eventActivitySchema);
        const Log = db.model('gh5858_3', logSchema);

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
                populate: { path: 'postedBy' }
              }).
              sort({ seq:-1 });
          }).
          then(function(results) {
            assert.equal(results.length, 2);
            assert.equal(results[0].activity.kind, 'gh5858_1' );
            assert.equal(results[0].activity.postedBy.name, 'val');
            assert.equal(results[1].activity.kind, 'gh5858_2' );
            assert.equal(results[1].activity.postedBy, null);
          });
      });

      it('populating nested discriminator path (gh-5970)', function() {
        const Author = db.model('gh5970', new mongoose.Schema({
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
        }, {discriminatorKey: 'type'});

        const ItemBookSchema = new mongoose.Schema({
          author: {
            type: mongoose.Schema.ObjectId,
            ref: 'gh5970'
          }
        });

        const ItemEBookSchema = new mongoose.Schema({
          author: {
            type: mongoose.Schema.ObjectId,
            ref: 'gh5970'
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

        const Bundle = db.model('gh5970_0', BundleSchema);

        return Author.create({firstName: 'David', lastName: 'Flanagan'}).
          then(function(author) {
            return Bundle.create({
              name: 'Javascript Book Collection', items: [
                {type: 'Book', title: 'JavaScript: The Definitive Guide', author: author},
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

      it('specify model in populate (gh-4264)', function(done) {
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

        const Person = db.model('gh4264', PersonSchema);
        const BlogPost = db.model('gh4264_0', BlogPostSchema);

        const blogPosts = [{ _id: 0, title: 'Bacon is Great' }];
        const people = [
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

    it('virtual populate with embedded discriminators (gh-6273)', function() {
      return co(function*() {
        // Generate Users Model
        const userSchema = new Schema({ employeeId: Number, name: String });
        const UserModel = db.model('gh6273', userSchema);

        // Generate Embedded Discriminators
        const eventSchema = new Schema(
          { message: String },
          { discriminatorKey: 'kind'}
        );

        const batchSchema = new Schema({ events: [eventSchema] });
        const docArray = batchSchema.path('events');

        // First embedded discriminator schema
        const clickedSchema = new Schema(
          {
            element: { type: String },
            users: [ Number ]
          },
          {
            toJSON: { virtuals: true},
            toObject: { virtuals: true}
          }
        );

        // Add virtual to first embedded discriminator schema for virtual population
        clickedSchema.virtual('users_$', {
          ref: 'gh6273',
          localField: 'users',
          foreignField: 'employeeId'
        });

        docArray.discriminator('gh6273_Clicked', clickedSchema);

        // Second embedded discriminator
        docArray.discriminator('gh6273_Purchased', new Schema({
          product: { type: String }
        }));

        const Batch = db.model('gh6273_EventBatch', batchSchema);

        // Generate Items
        const user = { employeeId: 1, name: 'Test name' };
        const batch = {
          events: [
            { kind: 'gh6273_Clicked', element: '#hero', message: 'hello', users: [1] },
            { kind: 'gh6273_Purchased', product: 'action-figure-1', message: 'world' }
          ]
        };

        yield UserModel.create(user);
        yield Batch.create(batch);

        const doc = yield Batch.findOne().populate('events.users_$');

        assert.equal(doc.events[0].users_$.length, 1);
        assert.equal(doc.events[0].users_$[0].name, 'Test name');
        assert.deepEqual(doc.toObject().events[0].users, [1]);
        assert.ok(!doc.events[1].users_$);
      });
    });

    describe('populates an array of objects', function() {
      it('subpopulates array w/ space separated path (gh-6284)', function() {
        return co(function* () {
          const db = start();
          const houseSchema = new Schema({ location: String });
          const citySchema = new Schema({ name: String });
          const districtSchema = new Schema({ name: String });

          const userSchema = new Schema({
            name: String,
            houseId: {
              type: Schema.Types.ObjectId,
              ref: 'gh6284_0'
            },
            cityId: {
              type: Schema.Types.ObjectId,
              ref: 'gh6284_2'
            },
            districtId: {
              type: Schema.Types.ObjectId,
              ref: 'gh6284_3'
            }
          });

          const postSchema = new Schema({
            content: String,
            userId: {
              type: Schema.Types.ObjectId,
              ref: 'gh6284_1'
            }
          });

          const House = db.model('gh6284_0', houseSchema);
          const User = db.model('gh6284_1', userSchema);
          const City = db.model('gh6284_2', citySchema);
          const District = db.model('gh6284_3', districtSchema);
          const Post = db.model('gh6284_4', postSchema);

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

          yield House.create(house);
          yield City.create(city);
          yield District.create(district);
          yield User.create(user);
          yield Post.create(post);
          const doc = yield Post.findOne({}).
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
      });
      it('populates array of space separated path objs (gh-6414)', function() {
        return co(function* () {
          const userSchema = new Schema({
            name: String
          });

          const User = db.model('gh6414User', userSchema);

          const officeSchema = new Schema({
            managerId: { type: Schema.ObjectId, ref: 'gh6414User' },
            supervisorId: { type: Schema.ObjectId, ref: 'gh6414User' },
            janitorId: { type: Schema.ObjectId, ref: 'gh6414User' },
            associatesIds: [{ type: Schema.ObjectId, ref: 'gh6414User' }]
          });

          const Office = db.model('gh6414Office', officeSchema);

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

          yield manager.save();
          yield hafez.save();
          yield billy.save();
          yield tom.save();
          yield kevin.save();
          yield office.save();

          const doc = yield Office.findOne()
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
      });

      it('handles subpopulation with options (gh-6528)', function() {
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
            ref: 'gh6528_User'
          }
        });

        const postSchema = new Schema({
          title: String,
          content: String,
          teacher: {
            type: Schema.Types.ObjectId,
            ref: 'gh6528_Teacher'
          },
          commentIds: [{
            type: Schema.Types.ObjectId
          }]
        }, { timestamps: true });

        postSchema.virtual('comments', {
          ref: 'gh6528_Comment',
          localField: 'commentIds',
          foreignField: '_id',
          justOne: false
        });

        const User = db.model('gh6528_User', userSchema);
        const Teacher = db.model('gh6528_Teacher', teachSchema);
        const Post = db.model('gh6528_Post', postSchema);
        const Comment = db.model('gh6528_Comment', commentSchema);

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
              select: 'name -_id',
            }
          };
          return Post.find(cond, null, opts).populate(pop).exec();
        }

        return co(function* () {
          yield User.create(users);
          yield Teacher.create(teachers);
          yield Post.create(posts);
          yield Comment.create(comments);
          const t = yield Teacher.findOne({ name: 'teacher1' });
          const found = yield getTeacherPosts(t._id, 1);
          // skipped 1 posts, sorted backwards from title1 should equal title0
          assert.strictEqual(found[0].title, 'title0');
          assert.strictEqual(found[0].teacher.toHexString(), t.id);
          // skipped 1 comment
          assert.strictEqual(found[0].comments.length, 1);
          // skipped 1 comment, sorted backwards from comment1 should equal comment0
          assert.strictEqual(found[0].comments[0].content, 'comment0 on title0');
        });
      });

      it('honors top-level match with subPopulation (gh-6451)', function() {
        const anotherSchema = new Schema({
          name: String,
        });

        const Another = db.model('gh6451another', anotherSchema);

        const otherSchema = new Schema({
          online: Boolean,
          value: String,
          a: {
            type: Schema.Types.ObjectId,
            ref: 'gh6451another'
          }
        });

        const Other = db.model('gh6451other', otherSchema);

        const schema = new Schema({
          visible: Boolean,
          name: String,
          o: [{
            type: Schema.Types.ObjectId,
            ref: 'gh6451other'
          }]
        });

        const Test = db.model('gh6451test', schema);

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

        return co(function* () {
          yield another.save();
          yield Other.create([other, other2]);
          yield test.save();

          const popObj = {
            path: 'o',
            select: '-_id',
            match: { online: true },
            populate: {
              path: 'a',
              select: '-_id name',
            }
          };
          const doc = yield Test.findOne({ visible: true }).populate(popObj);
          assert.strictEqual(doc.o.length, 1);
          assert.strictEqual(doc.o[0].value, 'yippie');
          assert.strictEqual(doc.o[0].online, true);
          assert.strictEqual(doc.o[0].a.name, 'testing');
        });
      });

      it('handles embedded discriminator (gh-6487)', function() {
        const userSchema = new Schema({ employeeId: Number, name: String });
        const UserModel = db.model('gh6487Users', userSchema);

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
        },{
          toJSON: { virtuals: true },
          toObject: { virtuals: true }
        });

        clickedSchema.virtual('users_$', {
          ref: 'gh6487Users',
          localField: 'users',
          foreignField: 'employeeId'
        });

        docArray.discriminator('Clicked', clickedSchema);

        docArray.discriminator('Purchased', new Schema({
          product: { type: String }
        }));

        const Batch = db.model('gh6487EventBatch', batchSchema);

        const user = { employeeId: 1, name: 'Test name' };
        const batch = {
          nested: {
            events: [
              { kind: 'Clicked', element: '#hero', message: 'hello', users: [1] },
              { kind: 'Purchased', product: 'action-figure-1', message: 'world' }
            ]
          }
        };

        return co(function*() {
          yield UserModel.create(user);
          yield Batch.create(batch);
          const docs = yield Batch.find({})
            .populate('nested.events.users_$')
            .lean();
          const name = docs[0].nested.events[0].users_$[0].name;
          assert.strictEqual(name, 'Test name');
        });
      });

      it('handles virtual embedded discriminator underneath single nested (gh-6571)', co.wrap(function*() {
        // Generate Users Model
        const userSchema = new Schema({ id: Number, name: String });
        const User = db.model('gh6571_Users', userSchema);

        // Generate Product Model
        const productSchema = new Schema({ id: Number, name: String });
        const Product = db.model('gh6571_Products', productSchema);

        // FlexibleItemSchema discriminator with a bunch of nested subdocs
        const flexibleItemSchema = new Schema();
        const outerSchema = new Schema();
        const innerSchema = new Schema();

        flexibleItemSchema.add({ outer: outerSchema });
        outerSchema.add({ inner: innerSchema });
        innerSchema.add({
          flexible: [new Schema({ 'kind': String }, { discriminatorKey: 'kind' })]
        });

        const docArray = innerSchema.path('flexible');

        const flexibleUserSchema = new Schema({ users: [{}] });

        flexibleUserSchema.virtual('users_$', {
          ref: 'gh6571_Users',
          localField: 'users.id',
          foreignField: 'id'
        });

        docArray.discriminator('6571_UserDisc', flexibleUserSchema);

        const flexibleProductSchema = new Schema({ products: [{}] });

        flexibleProductSchema.virtual('products_$', {
          ref: 'gh6571_Products',
          localField: 'products.id',
          foreignField: 'id'
        });

        docArray.discriminator('6571_ProductDisc', flexibleProductSchema);

        const FlexibleItem = db.model('gh6571_FlexibleItem', flexibleItemSchema);

        // Generate items
        yield User.create({ id: 111, name: 'John Doe' });
        yield Product.create({ id: 222, name: 'Notebook' });
        yield FlexibleItem.create({
          outer: {
            inner: {
              flexible: [
                { kind: '6571_UserDisc', users: [{ id: 111, refKey: 'Users' }] },
                { kind: '6571_ProductDisc', products: [{ id: 222, refKey: 'Products' }] }
              ]
            }
          }
        });

        const doc = yield FlexibleItem.findOne().
          populate('outer.inner.flexible.users_$').
          populate('outer.inner.flexible.products_$').
          then(doc => doc.toObject({ virtuals: true }));
        assert.equal(doc.outer.inner.flexible.length, 2);
        assert.equal(doc.outer.inner.flexible[0].users_$.length, 1);
        assert.equal(doc.outer.inner.flexible[0].users_$[0].name, 'John Doe');
        assert.equal(doc.outer.inner.flexible[1].products_$.length, 1);
        assert.equal(doc.outer.inner.flexible[1].products_$[0].name, 'Notebook');
      }));
    });

    it('populates undefined nested fields without error (gh-6845)', co.wrap(function*() {
      const metaDataSchema = new Schema({
        type: String
      });

      const commentSchema = new Schema({
        metadata: {
          type: Schema.Types.ObjectId,
          ref: 'MetaData-6845'
        },
      });

      const postSchema = new Schema({
        comments: [commentSchema]
      });

      const userSchema = new Schema({
        username: String,
        password: String,
        posts: [postSchema]
      });

      db.model('MetaData-6845', metaDataSchema);
      const User = db.model('User-6845', userSchema);

      const user = yield User.findOneAndUpdate(
        { username: 'Jennifer' }, /* upsert username but missing posts */
        { },
        {
          upsert: true,
          new: true
        })
        .populate(['posts.comments.metadata'])
        .exec();

      assert.ok(user && user.username === 'Jennifer');
    }));

    it('populates refPath from array element (gh-6509)', function() {
      const jobSchema = new Schema({
        kind: String,
        title: String,
        company: String
      });

      const Job = db.model('gh6509_job', jobSchema);

      const volunteerSchema = new Schema({
        kind: String,
        resp: String,
        org: String
      });

      const Volunteer = db.model('gh6509_charity', volunteerSchema);

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

      const CV = db.model('gh6509_cv', cvSchema);

      const job = new Job({
        kind: 'gh6509_job',
        title: 'janitor',
        company: 'Bait & Tackle'
      });

      const volunteer = new Volunteer({
        kind: 'gh6509_charity',
        resp: 'construction',
        org: 'Habitat for Humanity'
      });

      const test = new CV({
        title: 'Billy',
        sections: [{
          name: 'Experience',
          active: true,
          list: [
            { kind: 'gh6509_job', active: true, item: job._id },
            { kind: 'gh6509_charity', active: true, item: volunteer._id }
          ]
        }]
      });

      return co(function* () {
        yield job.save();
        yield volunteer.save();
        yield test.save();
        const found = yield CV.findOne({}).populate('sections.list.item');

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
  });

  describe('lean + deep populate (gh-6498)', function() {
    const isLean = v => v != null && !(v instanceof mongoose.Document);

    before(function() {
      const userSchema = new Schema({
        name: String,
        roomId: { type: Schema.ObjectId, ref: 'gh6498_Room' }
      });
      const officeSchema = new Schema();
      const roomSchema = new Schema({
        officeId: { type: Schema.ObjectId, ref: 'gh6498_Office' }
      });

      const User = db.model('gh6498_User', userSchema);
      const Office = db.model('gh6498_Office', officeSchema);
      const Room = db.model('gh6498_Room', roomSchema);

      const user = new User();
      const office = new Office();
      const room = new Room();

      user.roomId = room._id;
      room.officeId = office._id;

      return Promise.all([user.save(), office.save(), room.save()]);
    });

    it('document, and subdocuments are not lean by default', function() {
      return co(function*() {
        const user = yield db.model('gh6498_User').findOne().populate({
          path: 'roomId',
          populate: {
            path: 'officeId'
          }
        });

        assert.equal(isLean(user), false);
        assert.equal(isLean(user.roomId), false);
        assert.equal(isLean(user.roomId.officeId), false);
      });
    });

    it('.lean() makes query result, and all populated fields lean', function() {
      return co(function*() {
        const user = yield db.model('gh6498_User').findOne().
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
    });

    it('disabling lean at some populating level reflects on it, and descendants', function() {
      return co(function*() {
        const user = yield db.model('gh6498_User').findOne().
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
    });

    it('enabling lean at some populating level reflects on it, and descendants', function() {
      return co(function*() {
        const user = yield db.model('gh6498_User').findOne().populate({
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
    });

    it('disabling lean on nested population overwrites parent lean', function() {
      return co(function*() {
        const user = yield db.model('gh6498_User').findOne().populate({
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
    it('populates virtual of embedded discriminator with dynamic ref (gh-6554)', function() {
      const userSchema = new Schema({
        employeeId: Number,
        name: String
      });

      const UserModel = db.model('gh6554_Users', userSchema, 'users');

      const eventSchema = new Schema({
        message: String
      },{ discriminatorKey: 'kind' });

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
      const Batch = db.model('gh6554_EventBatch', batchSchema);

      const user = { employeeId: 1, name: 'Test name' };
      const batch = {
        events: [
          {
            kind: 'Clicked',
            element: '#hero',
            message: 'hello',
            users: [{ ID: 1, refKey: 'gh6554_Users' }]
          }
        ]
      };

      return co(function*() {
        yield UserModel.create(user);
        yield Batch.create(batch);
        const doc = yield Batch.findOne({}).populate('events.users_$');
        assert.strictEqual(doc.events[0].users_$[0].name, 'Test name');
      });
    });

    it('populates virtual of embedded discriminator with dynamic ref when more than one model name is returned (gh-6612)', function() {
      const userSchema = new Schema({
        employeeId: Number,
        name: String
      });

      const UserModel = db.model('gh6612_Users', userSchema);

      const authorSchema = new Schema({
        employeeId: Number,
        name: String
      });

      const AuthorModel = db.model('gh6612_Author', authorSchema);

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
      const Batch = db.model('gh6612_EventBatch', batchSchema);

      const user = { employeeId: 1, name: 'Test name' };
      const author = { employeeId: 2, name: 'Author Name' };
      const batch = {
        events: [
          {
            kind: 'Clicked',
            element: '#hero',
            message: 'hello',
            users: [
              { ID: 1, refKey: 'gh6612_Users' },
              { ID: 2, refKey: 'gh6612_Author' }
            ]
          }
        ]
      };

      return co(function*() {
        yield UserModel.create(user);
        yield AuthorModel.create(author);
        yield Batch.create(batch);
        const doc = yield Batch.findOne({}).populate('events.users_$');
        assert.strictEqual(doc.events[0].users_$[0].name, 'Test name');
        assert.strictEqual(doc.events[0].users_$[1].name, 'Author Name');
      });
    });

    it('uses getter if one is defined on the localField (gh-6618)', function() {
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
        ref: 'gh6618_user',
        localField: 'referrer',
        foreignField: 'name',
        justOne: false,
        getters: true
      });

      const User = db.model('gh6618_user', userSchema);
      const Test = db.model('gh6618_test', schema);

      const user = new User({ name: 'billy' });
      const test = new Test({ referrer: 'Model$' + user.name });

      return co(function*() {
        yield user.save();
        yield test.save();
        const pop = yield Test.findOne().populate('referrerUser');
        assert.strictEqual(pop.referrerUser[0].name, 'billy');

        const pop2 = yield Test.findOne().populate({ path: 'referrerUser', options: { getters: false } });
        assert.strictEqual(pop2.referrerUser.length, 0);
      });
    });

    it('populate child with same name as parent (gh-6839) (gh-6908)', function() {
      const parentFieldsToPopulate = [
        {path: 'children.child'},
        {path: 'child'}
      ];

      const childSchema = new mongoose.Schema({ name: String });
      const Child = db.model('gh6839_Child', childSchema);

      const parentSchema = new mongoose.Schema({
        child: {type: mongoose.Schema.Types.ObjectId, ref: 'gh6839_Child'},
        children: [{
          child: {type: mongoose.Schema.Types.ObjectId, ref: 'gh6839_Child' }
        }]
      });
      const Parent = db.model('gh6839_Parent', parentSchema);

      return co(function*() {
        let child = yield Child.create({ name: 'test' });
        let p = yield Parent.create({ child: child });

        child = yield Child.findById(child._id);
        p = yield Parent.findById(p._id).populate(parentFieldsToPopulate);
        p.children.push({ child: child });
        yield p.save();

        p = yield p.populate(parentFieldsToPopulate).execPopulate();
        assert.ok(p.children[0].child);
        assert.equal(p.children[0].child.name, 'test');
      });
    });

    it('passes scope as Model instance (gh-6726)', function() {
      const otherSchema = new Schema({ name: String });
      const Other = db.model('gh6726_Other', otherSchema);
      const schema = new Schema({
        x: {
          type: Schema.Types.ObjectId,
          ref: 'gh6726_Other',
          get: function(v) {
            assert.strictEqual(this.constructor.name, 'model');
            return v;
          }
        }
      });
      const Test = db.model('gh6726_Test', schema);
      const other = new Other({ name: 'Max' });
      const test = new Test({ x: other._id });
      return co(function*() {
        yield other.save();
        yield test.save();
        const doc = yield Test.findOne({}).populate('x');
        assert.strictEqual(doc.x.name, 'Max');
      });
    });
  });

  it('respects schema array even if underlying doc doesnt use array (gh-6908)', function() {
    const jobSchema = new Schema({
      company : [{ type: Schema.Types.ObjectId, ref: 'gh6908_Company' }]
    });
    const Job = db.model('gh6908_Job', jobSchema);

    const companySchema = new Schema({ name: String });
    const Company = db.model('gh6908_Company', companySchema);

    return co(function*() {
      const mdb = yield Company.create({ name: 'MongoDB' });

      yield Job.collection.insertOne({ company: mdb._id });

      const res = yield Job.findOne().populate('company');

      assert.ok(Array.isArray(res.company));
      assert.equal(res.company[0].name, 'MongoDB');
    });
  });

  it('save objectid with populated refPath (gh-6714)', function() {
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

    const Role = db.model('gh6714_Role', schema);

    return co(function*() {
      const role = yield Role.create({ });
      const role2 = yield Role.create({
        parent: { kind: 'gh6714_Role', item: role._id }
      });

      const toUpdate = yield Role.find({ _id: role2._id }).
        populate('parent.item').
        then(res => res[0]);

      toUpdate.test = 'foo';
      yield toUpdate.save();
    });
  });

  it('correct model and justOne when double populating (gh-6978)', function() {
    const authorSchema = new Schema({
      name: String
    });

    const commentSchema = new Schema({
      text: String,
      author: {
        type: Schema.Types.ObjectId,
        ref: 'gh6978_Author'
      }
    });

    const postSchema = new Schema({
      content: String,
      comments: [{
        type: Schema.Types.ObjectId,
        ref: 'gh6978_Comment'
      }]
    });

    const Author = db.model('gh6978_Author', authorSchema);
    const Comment = db.model('gh6978_Comment', commentSchema);
    const Post = db.model('gh6978_Post', postSchema);

    const authors = '123'.split('').map(n => {
      return new Author({ name: `author${n}`});
    });

    const comments = 'abc'.split('').map((l,i) => {
      const id = authors[i]._id;
      return new Comment({ text: `comment_${l}`, author: id });
    });

    return co(function*() {
      yield Post.create({
        content: 'foobar',
        comments: comments
      });

      yield Author.create(authors);
      yield Comment.create(comments);

      let post = yield Post.findOne({});
      post = yield Post.populate(post, { path: 'comments' });
      post = yield Post.populate(post, { path: 'comments.author' });

      post.comments.forEach((c, i) => {
        assert.ok(!Array.isArray(c.author), `author ${i} is an array`);
      });
    });
  });

  it('correctly finds justOne when double-populating underneath an array (gh-6798)', function() {
    const FileSchema = new Schema({ filename: 'String' });
    const EditionOptionsSchema = new Schema({
      price: 'Number',
      image: {
        type: 'ObjectId',
        ref: 'gh6798_File'
      }
    });
    const EditionSchema = new Schema({ editionOptions: EditionOptionsSchema });
    const CarVersionSchema = new Schema({
      type: {
        type: 'String'
      },
      editions: [{
        type: 'ObjectId',
        ref: 'gh6798_Edition'
      }]
    });
    const CarSchema = new mongoose.Schema({
      make: 'String',
      versions: [CarVersionSchema]
    });

    const File = db.model('gh6798_File', FileSchema);
    const Edition = db.model('gh6798_Edition', EditionSchema);
    const Car = db.model('gh6798_Car', CarSchema);

    return co(function*() {
      const file = yield File.create({ filename: 'file1.png' });

      const editions = yield Edition.create([
        { editionOptions: { price: 15000, image: file._id } },
        { editionOptions: { price: 150000 } }
      ]);

      let cars = yield Car.create([
        { make: 'Ford', versions: [{ type: 'F150', editions: [editions[0]] }] },
        { make: 'BMW', versions: [{ type: 'i8', editions: [editions[1]] }] }
      ]);

      cars = yield Car.find().sort({ make: 1 });
      cars = yield Car.populate(cars, 'versions.editions');
      cars = yield Car.populate(cars, 'versions.editions.editionOptions.image');

      assert.strictEqual(cars[0].versions[0].editions[0].editionOptions.image,
        void 0);
      assert.equal(cars[1].versions[0].editions[0].editionOptions.image.filename,
        'file1.png');
    });
  });

  it('handles virtual justOne if it is not set (gh-6988)', function() {
    const postSchema = new Schema({
      name: String
    });

    postSchema.virtual('comments', {
      ref: 'gh6988_Comment',
      localField: '_id',
      foreignField: 'postId'
    });

    const commentSchema = new Schema({
      postId: { type: Schema.Types.ObjectId }
    });

    const Post = db.model('gh6988_Post', postSchema);
    const Comment = db.model('gh6988_Comment', commentSchema);

    return co(function*() {
      const post = yield Post.create({ name: 'n1'});
      const comment = yield Comment.create({ postId: post._id });

      const doc = yield Post.findOne({}).populate('comments').lean();
      assert.ok(Array.isArray(doc.comments));
      assert.equal(doc.comments.length, 1);
      assert.equal(doc.comments[0]._id.toHexString(),
        comment._id.toHexString());
    });
  });

  it('handles virtual justOne if it is not set, is lean, and subfields are selected', function() {
    const postSchema = new Schema({
      name: String
    });

    postSchema.virtual('comments', {
      ref: 'gh8125_Comment',
      localField: '_id',
      foreignField: 'postId'
    });

    const commentSchema = new Schema({
      postId: { type: Schema.Types.ObjectId },
      text: String,
    });

    const Post = db.model('gh8125_Post', postSchema);
    const Comment = db.model('gh8125_Comment', commentSchema);

    return co(function*() {
      const post = yield Post.create({ name: 'n1'});
      const comment = yield Comment.create({ postId: post._id, text: 'a comment' });

      const doc = yield Post.find({}).populate('comments', 'text').lean();
      assert.ok(Array.isArray(doc[0].comments));
      assert.equal(doc[0].comments.length, 1);
      assert.equal(doc[0].comments[0]._id.toHexString(),
        comment._id.toHexString());
    });
  });

  it('does not set `justOne` if underneath Mixed (gh-6985)', function() {
    const articleSchema = new Schema({
      title: String,
      content: String
    });

    const schema = new Schema({
      title: String,
      data: Schema.Types.Mixed
    });

    const Article = db.model('gh6985_Article', articleSchema);
    const Test = db.model('gh6985_Test', schema);

    return co(function*() {
      const articles = yield Article.create([
        { title: 'An Overview of BigInt in Node.js', content: '' },
        { title: 'Building a Serverless App with MongoDB Stitch', content: '' }
      ]);

      yield Test.create({
        title: 'test',
        data: { articles: articles.map(a => a._id) }
      });

      let res = yield Test.findOne();
      const popObj = {
        path: 'data.articles',
        select: 'title',
        model: 'gh6985_Article',
        options: { lean: true }
      };

      res = yield Test.populate(res, popObj);

      assert.ok(Array.isArray(res.data.articles));
      assert.deepEqual(res.data.articles.map(a => a.title), [
        'An Overview of BigInt in Node.js',
        'Building a Serverless App with MongoDB Stitch'
      ]);
    });
  });

  it('supports setting `justOne` as an option (gh-6985)', function() {
    const articleSchema = new Schema({
      title: String,
      content: String
    });

    const schema = new Schema({
      title: String,
      data: Schema.Types.Mixed
    });

    const Article = db.model('gh6985_Article_0', articleSchema);
    const Test = db.model('gh6985_Test_0', schema);

    return co(function*() {
      const articles = yield Article.create([
        { title: 'An Overview of BigInt in Node.js', content: '' },
        { title: 'Building a Serverless App with MongoDB Stitch', content: '' }
      ]);

      yield Test.create({
        title: 'test',
        data: { articles: articles.map(a => a._id) }
      });

      let res = yield Test.findOne();
      const popObj = {
        path: 'data.articles',
        select: 'title',
        model: 'gh6985_Article_0',
        justOne: true,
        options: { lean: true }
      };

      res = yield Test.populate(res, popObj);

      assert.ok(!Array.isArray(res.data.articles));
      assert.equal(res.data.articles.title, 'An Overview of BigInt in Node.js');
    });
  });

  it('multiple localFields and foreignFields (gh-5704)', function() {
    const OrderSchema = new Schema({
      _id: Number,
      sourceId: Number
    });
    const RefundSchema = new Schema({
      _id: Number,
      internalOrderId: Number,
      sourceOrderId: Number
    });
    RefundSchema.virtual('orders', {
      ref: 'gh5704_Order',
      localField: function() {
        return this.internalOrderId ? 'internalOrderId' : 'sourceOrderId';
      },
      foreignField: function() {
        return this.internalOrderId ? '_id' : 'sourceId';
      }
    });

    const Order = db.model('gh5704_Order', OrderSchema);
    const Refund = db.model('gh5704_Refund', RefundSchema);

    return co(function*() {
      yield Order.create([
        { _id: 1 },
        { _id: 99, sourceId: 2 }
      ]);

      yield Refund.create([
        { _id: 10, internalOrderId: 1 },
        { _id: 11, sourceOrderId: 2 }
      ]);

      let res = yield Refund.find().sort({ _id: 1 }).populate('orders');

      res = res.map(doc => doc.toObject({ virtuals: true }));
      assert.equal(res[0].orders.length, 1);
      assert.strictEqual(res[0].orders[0]._id, 1);

      assert.equal(res[1].orders.length, 1);
      assert.strictEqual(res[1].orders[0]._id, 99);
    });
  });

  it('lean populate underneath array (gh-7052)', function() {
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

    const Owner = db.model('gh7052_Owner', ownerSchema);
    const Dog = db.model('gh7052_Dog', dogSchema);
    const Trick = db.model('gh7052_Trick', trickSchema);

    const t = new Trick({ description: 'roll over'});
    const d = new Dog({ name: 'Fido', trick: t._id });
    const o = new Owner({ name: 'Bill', age: 10, dogs: [ d._id ] });

    return co(function*() {
      yield [t.save(), d.save(), o.save()];

      const owner = yield Owner.findOne({}).lean();
      let populated = yield Owner.populate(owner,
        [{ path: 'dogs', model: 'gh7052_Dog', options: { lean: true } }]);
      populated = yield Owner.populate(owner,
        [{ path: 'dogs.trick', model: 'gh7052_Trick', options: { lean: true } }]);

      assert.ok(!Array.isArray(populated.dogs[0].trick));
    });
  });

  it('handles plus path projections with virtual populate (gh-7050)', function() {
    const CatSchema = mongoose.Schema({ name: String }, { toObject: { virtuals: true } });

    CatSchema.virtual('friends', {
      ref: 'gh7050_Dog',
      localField: '_id',
      foreignField: 'cat'
    });

    const Cat = db.model('gh7050_Cat', CatSchema);

    const DogSchema = mongoose.Schema({
      name: String,
      cat: mongoose.ObjectId,
      secret: { type: String, select: false }
    });

    const Dog = db.model('gh7050_Dog', DogSchema);

    return co(function*() {
      const kitty = yield Cat.create({ name: 'foo' });

      yield Dog.create({
        name: 'Scooby',
        cat: kitty,
        secret: 'I ate all the scooby snacks!'
      });

      const res = yield Cat.findOne().select().populate({
        path: 'friends',
        select: '+secret'
      });
      assert.equal(res.friends[0].name, 'Scooby');
      assert.equal(res.friends[0].secret, 'I ate all the scooby snacks!');
    });
  });

  it('set model as ref in schema (gh-7253)', function() {
    const userSchema = new Schema({ name: String });
    const User = db.model('gh7253_User', userSchema);

    const postSchema = new Schema({
      user: {
        type: mongoose.ObjectId,
        ref: User
      },
      user2: mongoose.ObjectId
    });
    postSchema.path('user2').ref(User);
    const Post = db.model('gh7253_Post', postSchema);

    return co(function*() {
      const user = yield User.create({ name: 'val' });
      yield Post.create({ user: user._id, user2: user._id });

      const post = yield Post.findOne().populate('user user2');

      assert.equal(post.user.name, 'val');
      assert.equal(post.user2.name, 'val');
    });
  });

  it('count option (gh-4469) (gh-7380)', function() {
    const childSchema = new Schema({ parentId: mongoose.ObjectId });

    const parentSchema = new Schema({ name: String });
    parentSchema.virtual('childCount', {
      ref: 'gh4469_Child',
      localField: '_id',
      foreignField: 'parentId',
      count: true
    });

    parentSchema.virtual('children', {
      ref: 'gh4469_Child',
      localField: '_id',
      foreignField: 'parentId',
      count: false
    });

    const Child = db.model('gh4469_Child', childSchema);
    const Parent = db.model('gh4469_Parent', parentSchema);

    return co(function*() {
      const p = yield Parent.create({ name: 'test' });

      yield Child.create([{ parentId: p._id }, { parentId: p._id }, {}]);

      let doc = yield Parent.findOne().populate('children childCount');
      assert.equal(doc.childCount, 2);
      assert.equal(doc.children.length, 2);

      doc = yield Parent.find().populate('children childCount').then(res => res[0]);
      assert.equal(doc.childCount, 2);
      assert.equal(doc.children.length, 2);

      doc = yield Parent.find().populate('childCount').then(res => res[0]);
      assert.equal(doc.childCount, 2);
      assert.equal(doc.children, null);

      doc = yield Parent.findOne();
      yield doc.populate('childCount').execPopulate();
      assert.equal(doc.childCount, 2);
      assert.equal(doc.children, null);
    });
  });

  it('count with deeply nested (gh-7573)', function() {
    const s1 = new mongoose.Schema({});

    s1.virtual('s2', {
      ref: 'gh7573_s2',
      localField: '_id',
      foreignField: 's1'
    });

    const s2 = new mongoose.Schema({
      s1: {type: mongoose.Schema.Types.ObjectId, ref: 'schema1'}
    });

    s2.virtual('numS3', {
      ref: 'gh7573_s3',
      localField: '_id',
      foreignField: 's2',
      count: true
    });

    const s3 = new mongoose.Schema({
      s2: {type: mongoose.Schema.Types.ObjectId, ref: 'schema2'}
    });

    return co(function*() {
      const S1 = db.model('gh7573_s1', s1);
      const S2 = db.model('gh7573_s2', s2);
      const S3 = db.model('gh7573_s3', s3);

      const s1doc = yield S1.create({});
      const s2docs = yield S2.create([{ s1: s1doc }, { s1: s1doc }]);
      yield S3.create([{ s2: s2docs[0] }, { s2: s2docs[0] }, { s2: s2docs[1] }]);

      const doc = yield S1.findOne({}).populate({
        path: 's2',
        populate: {
          path: 'numS3'
        }
      });

      assert.deepEqual(doc.s2.map(s => s.numS3).sort(), [1, 2]);
    });
  });

  it('explicit model option overrides refPath (gh-7273)', function() {
    const userSchema = new Schema({ name: String });
    const User1 = db.model('gh7273_User_1', userSchema);
    db.model('gh7273_User_2', userSchema);

    const postSchema = new Schema({
      user: {
        type: mongoose.ObjectId,
        refPath: 'm'
      },
      m: String
    });
    const Post = db.model('gh7273_Post', postSchema);

    return co(function*() {
      const user = yield User1.create({ name: 'val' });
      yield Post.create({ user: user._id, m: 'gh7273_User_2' });

      let post = yield Post.findOne().populate('user');
      assert.ok(!post.user);

      post = yield Post.findOne().populate({ path: 'user', model: 'gh7273_User_1' });

      assert.equal(post.user.name, 'val');
    });
  });

  it('clone option means identical ids get separate copies of doc (gh-3258)', function() {
    const userSchema = new Schema({ name: String });
    const User = db.model('gh3258_User', userSchema);

    const postSchema = new Schema({
      user: {
        type: mongoose.ObjectId,
        ref: User
      },
      title: String
    });

    const Post = db.model('gh3258_Post', postSchema);

    return co(function*() {
      const user = yield User.create({ name: 'val' });
      yield Post.create([
        { title: 'test1', user: user },
        { title: 'test2', user: user }
      ]);

      const posts = yield Post.find().populate({
        path: 'user',
        options: { clone: true }
      });

      posts[0].user.name = 'val2';
      assert.equal(posts[1].user.name, 'val');
    });
  });

  it('handles double nested array `foreignField` (gh-7374)', function() {
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
      ref: 'gh7374_Song',
      localField: '_id',
      foreignField: 'identifiers.artists.artist'
    });

    const Song = db.model('gh7374_Song', songSchema);
    const Artist = db.model('gh7374_Artist', artistSchema);

    return co(function*() {
      yield Artist.create([
        { _id: 1, name: 'Axl Rose' },
        { _id: 2, name: 'Slash' }
      ]);

      yield Song.create({
        title: 'November Rain',
        identifiers: [{ artists: [{ artist: 1 }, { artist: 2 }] }]
      });

      const axl = yield Artist.findById(1).populate('songs');
      assert.equal(axl.songs.length, 1);
      assert.equal(axl.songs[0].title, 'November Rain');
    });
  });

  it('populate single path with numeric path underneath doc array (gh-7273)', function() {
    const schema = new Schema({
      arr1: [{
        arr2: [{
          item: { type: Schema.Types.ObjectId, refPath: 'arr1.arr2.kind' },
          kind: String
        }]
      }]
    });

    const Model = db.model('gh7273', schema);

    const itemSchema = new Schema({ name: String });
    const Item1 = db.model('gh7273_Item1', itemSchema);
    const Item2 = db.model('gh7273_Item2', itemSchema);

    return co(function*() {
      const item1 = yield Item1.create({ name: 'item1' });
      const item2 = yield Item2.create({ name: 'item2' });

      yield Model.create({
        arr1: [{
          arr2: [
            { item: item1._id, kind: 'gh7273_Item1' },
            { item: item2._id, kind: 'gh7273_Item2' }
          ]
        }]
      });

      let doc = yield Model.findOne().populate('arr1.arr2.item');
      assert.equal(doc.arr1[0].arr2[0].item.name, 'item1');
      assert.equal(doc.arr1[0].arr2[1].item.name, 'item2');

      doc = yield Model.findOne().populate('arr1.0.arr2.item');
      assert.equal(doc.arr1[0].arr2[0].item.name, 'item1');
      assert.equal(doc.arr1[0].arr2[1].item.name, 'item2');

      doc = yield Model.findOne().populate('arr1.0.arr2.0.item');
      assert.equal(doc.arr1[0].arr2[0].item.name, 'item1');
      assert.ok(!doc.arr1[0].arr2[1].item.name);

      doc = yield Model.findOne();
      doc.populate('arr1.0.arr2.1.item');
      yield doc.execPopulate();
      assert.ok(!doc.arr1[0].arr2[0].item.name);
      assert.equal(doc.arr1[0].arr2[1].item.name, 'item2');

      doc = yield Model.findOne();
      doc.populate('arr1.0.arr2.0.item');
      doc.populate('arr1.0.arr2.1.item');
      yield doc.execPopulate();
      assert.equal(doc.arr1[0].arr2[0].item.name, 'item1');
      assert.equal(doc.arr1[0].arr2[1].item.name, 'item2');
    });
  });

  it('supports populating a path in a document array embedded in an array (gh-7647)', function() {
    const schema = new Schema({
      recordings: [[{
        file: { type: Schema.ObjectId, ref: 'gh7647_Asset' }
      }]]
    });
    const Song = db.model('gh7647_Song', schema);
    const Asset = db.model('gh7647_Asset', Schema({ name: String }));

    return co(function*() {
      const a = yield Asset.create({ name: 'foo' });
      yield Song.create({ recordings: [[{ file: a._id }]] });

      const doc = yield Song.findOne().populate('recordings.file');

      assert.equal(doc.recordings.length, 1);
      assert.equal(doc.recordings[0].length, 1);
      assert.equal(doc.recordings[0][0].file.name, 'foo');
      assert.ok(doc.populated('recordings.file'));
    });
  });

  it('handles populating deeply nested path if value in db is a primitive (gh-7545)', function() {
    const personSchema = new Schema({ _id: Number, name: String });
    const PersonModel = db.model('gh7545_People', personSchema);

    // Create Event Model
    const teamSchema = new Schema({
      nested: { members: [{ type: Number, ref: 'gh7545_People' }] }
    });
    const eventSchema = new Schema({
      _id: Number,
      title: String,
      teams: [teamSchema]
    });
    const EventModel = db.model('gh7545_Event', eventSchema);

    return co(function*() {
      yield PersonModel.create({ _id: 1, name: 'foo' });
      yield EventModel.collection.insertMany([
        { _id: 2, title: 'Event 1', teams: false },
        { _id: 3, title: 'Event 2', teams: [{ nested: { members: [1] } }] }
      ]);

      const docs = yield EventModel.find().
        sort({ _id: 1 }).
        lean().
        populate('teams.nested.members');
      assert.strictEqual(docs[0].teams, false);

      assert.equal(docs[1].teams.length, 1);
      assert.deepEqual(docs[1].teams[0].nested.members.map(m => m.name), ['foo']);
    });
  });

  it('sets populate virtual to empty array if local field empty (gh-8230)', function() {
    const GroupSchema = new Schema({
      roles: [{
        roleId: String
      }]
    });
    GroupSchema.virtual('roles$', {
      ref: 'gh8230_Role',
      localField: 'roles.roleId',
      foreignField: '_id'
    });

    const RoleSchema = new Schema({});

    const GroupModel = db.model('gh8230_Group', GroupSchema);
    db.model('gh8230_Role', RoleSchema);

    return co(function*() {
      yield GroupModel.create({ roles: [] });

      const res = yield GroupModel.findOne({}).populate('roles$');
      assert.deepEqual(res.roles$, []);
    });
  });

  it('sets populate virtual with count to 0 if local field empty (gh-7731)', function() {
    const GroupSchema = new Schema({
      roles: [{
        roleId: String
      }]
    });
    GroupSchema.virtual('rolesCount', {
      ref: 'gh7731_Role',
      localField: 'roles.roleId',
      foreignField: '_id',
      count: true
    });

    const RoleSchema = new Schema({});

    const GroupModel = db.model('gh7731_Group', GroupSchema);
    db.model('gh7731_Role', RoleSchema);

    return co(function*() {
      yield GroupModel.create({ roles: [] });

      const res = yield GroupModel.findOne({}).populate('rolesCount');
      assert.strictEqual(res.rolesCount, 0);
    });
  });

  it('can populate an array property whose name conflicts with array method (gh-7782)', function() {
    const Child = db.model('gh7782_Child', Schema({ name: String }));

    const Parent = db.model('gh7782_Parent', Schema({
      list: [{
        fill: {
          child: { type:ObjectId, ref:'gh7782_Child' }
        }
      }]
    }));

    return co(function*() {
      const c = yield Child.create({ name: 'test' });
      yield Parent.create({ list: [{ fill: { child: c._id } }] });

      const doc = yield Parent.findOne().populate('list.fill.child');

      assert.equal(doc.list.length, 1);
      assert.strictEqual(doc.list[0].fill.child.name, 'test');
    });
  });

  it('supports cross-db populate with refPath (gh-6520)', function() {
    return co(function*() {
      const db2 = yield mongoose.createConnection(start.uri2);

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

      const User = db.model('gh6520_User', userSchema);
      const Book = db2.model('Book', bookSchema);
      const Movie = db2.model('Movie', movieSchema);

      const book = yield Book.create({ title: 'Legacy of the Force: Revelation' });
      const movie = yield Movie.create({ title: 'A New Hope' });

      yield User.create([
        { name: 'test1', kind: 'Book', hobby: book._id },
        { name: 'test2', kind: 'Movie', hobby: movie._id }
      ]);

      const docs = yield User.find().sort({ name: 1 }).populate({
        path: 'hobby',
        connection: db2
      });
      assert.equal(docs[0].hobby.title, 'Legacy of the Force: Revelation');
      assert.equal(docs[1].hobby.title, 'A New Hope');
    });
  });

  it('ref function for conventional populate (gh-7669)', function() {
    const schema = new mongoose.Schema({
      kind: String,
      media: {
        type: mongoose.Schema.Types.ObjectId,
        ref: doc => doc.kind
      }
    });
    const Model = db.model('gh7669', schema);
    const Movie = db.model('gh7669_Movie', new Schema({ name: String }));
    const Book = db.model('gh7669_Book', new Schema({ title: String }));

    return co(function*() {
      const docs = yield [
        Movie.create({ name: 'The Empire Strikes Back' }),
        Book.create({ title: 'New Jedi Order' })
      ];

      yield Model.create([
        { kind: 'gh7669_Movie', media: docs[0]._id },
        { kind: 'gh7669_Book', media: docs[1]._id }
      ]);

      const res = yield Model.find().sort({ kind: -1 }).populate('media');

      assert.equal(res[0].kind, 'gh7669_Movie');
      assert.equal(res[0].media.name, 'The Empire Strikes Back');
      assert.equal(res[1].kind, 'gh7669_Book');
      assert.equal(res[1].media.title, 'New Jedi Order');
    });
  });

  it('virtual refPath (gh-7848)', function() {
    const Child = db.model('gh7848_Child', Schema({
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
    const Parent = db.model('gh7848_Parent', parentSchema);

    return co(function*() {
      yield Parent.create({ _id: 1, kind: 'gh7848_Child' });
      yield Child.create({ name: 'test', parentId: 1 });

      const doc = yield Parent.findOne().populate('childDocs');
      assert.equal(doc.childDocs.length, 1);
      assert.equal(doc.childDocs[0].name, 'test');
    });
  });

  it('handles refPath on discriminator when populating top-level model (gh-5109)', function() {
    const options = { discriminatorKey: 'kind' };
    const Post = db.model('gh5109_Post', new Schema({ time: Date, text: String }, options));

    const MediaPost = Post.discriminator('gh5109_MediaPost', new Schema({
      media: { type: Schema.Types.ObjectId, refPath: 'mediaType' },
      mediaType: String // either 'Image' or 'Video'
    }, options));
    const Image = db.model('gh5109_Image',
      new Schema({ url: String }));
    const Video = db.model('gh5109_Video',
      new Schema({ url: String, duration: Number }));

    return co(function*() {
      const image = yield Image.create({ url: 'test' });
      const video = yield Video.create({ url: 'foo', duration: 42 });

      yield MediaPost.create([
        { media: image._id, mediaType: 'gh5109_Image' },
        { media: video._id, mediaType: 'gh5109_Video' }
      ]);

      const docs = yield Post.find().populate('media').sort({ mediaType: 1 });

      assert.equal(docs.length, 2);
      assert.ok(docs[0].populated('media'));
      assert.ok(docs[1].populated('media'));

      assert.equal(docs[0].media.url, 'test');
      assert.equal(docs[1].media.url, 'foo');
      assert.equal(docs[1].media.duration, 42);
    });
  });

  it('refPath with virtual (gh-7341)', function() {
    const options = { discriminatorKey: 'kind' };
    const postSchema = new Schema({
      media: { type: Schema.Types.ObjectId, refPath: 'mediaType' },
      _mediaType: String // either 'Image' or 'Video'
    }, options);

    postSchema.virtual('mediaType').get(function() { return this._mediaType; });

    const Post = db.model('gh7341_Post', postSchema);
    const Image = db.model('gh7341_Image', new Schema({ url: String }));
    const Video = db.model('gh7341_Video', new Schema({ url: String, duration: Number }));

    return co(function*() {
      const image = yield Image.create({ url: 'test' });
      const video = yield Video.create({ url: 'foo', duration: 42 });

      yield Post.create([
        { media: image._id, _mediaType: 'gh7341_Image' },
        { media: video._id, _mediaType: 'gh7341_Video' }
      ]);

      const docs = yield Post.find().populate('media').sort({ _mediaType: 1 });

      assert.ok(docs[0].populated('media'));
      assert.ok(docs[1].populated('media'));

      assert.equal(docs[0].media.url, 'test');
      assert.equal(docs[1].media.url, 'foo');
      assert.equal(docs[1].media.duration, 42);
    });
  });

  it('count with subdocs (gh-7573)', function() {
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
      ref: 'gh7573_Ticket',
      localField: 'name',
      foreignField: 'assigned',
      count: true
    });

    const Ticket = db.model('gh7573_Ticket', TicketSchema);
    const Team = db.model('gh7573_Team', TeamSchema);

    return co(function*() {
      yield Team.create({
        name: 'Rocket',
        developers: [{ name: 'Jessie' }, { name: 'James' }, { name: 'Meowth' }]
      });
      yield Ticket.create([
        { assigned: 'Jessie', description: 'test1' },
        { assigned: 'James', description: 'test2' },
        { assigned: 'Jessie', description: 'test3' }
      ]);

      const team = yield Team.findOne().populate('developers.ticketCount');
      assert.equal(team.developers[0].ticketCount, 2);
      assert.equal(team.developers[1].ticketCount, 1);
      assert.equal(team.developers[2].ticketCount, 0);
    });
  });

  it('handles virtual populate of an embedded discriminator nested path (gh-6488) (gh-8173)', function() {
    return co(function*() {
      const UserModel = db.model('gh6488_User', Schema({
        employeeId: Number,
        name: String
      }));

      const eventSchema = Schema({ message: String }, { discriminatorKey: 'kind' });
      const batchSchema = Schema({ nested: { events: [eventSchema] } });

      const nestedLayerSchema = Schema({ users: [ Number ] });
      nestedLayerSchema.virtual('users_$', {
        ref: 'gh6488_User',
        localField: 'users',
        foreignField: 'employeeId'
      });

      const docArray = batchSchema.path('nested.events');
      docArray.discriminator('gh6488_Clicked', Schema({ nestedLayer: nestedLayerSchema }));
      docArray.discriminator('gh6488_Purchased', Schema({ purchased: String }));

      const Batch = db.model('gh6488', batchSchema);

      yield UserModel.create({ employeeId: 1, name: 'test' });
      yield Batch.create({
        nested: {
          events: [
            { kind: 'gh6488_Clicked', nestedLayer: { users: [1] } },
            { kind: 'gh6488_Purchased', purchased: 'test' }
          ]
        }
      });

      let res = yield Batch.findOne().
        populate('nested.events.nestedLayer.users_$');
      assert.equal(res.nested.events[0].nestedLayer.users_$.length, 1);
      assert.equal(res.nested.events[0].nestedLayer.users_$[0].name, 'test');

      res = res.toObject({ virtuals: true });
      assert.equal(res.nested.events[0].nestedLayer.users_$.length, 1);
      assert.equal(res.nested.events[0].nestedLayer.users_$[0].name, 'test');
    });
  });

  it('accessing populate virtual prop (gh-8198)', function() {
    const FooSchema = new Schema({
      name: String,
      children: [{
        barId: { type: Schema.Types.ObjectId, ref: 'gh8198_Bar' },
        quantity: Number,
      }]
    });
    FooSchema.virtual('children.bar', {
      ref: 'gh8198_Bar',
      localField: 'children.barId',
      foreignField: '_id',
      justOne: true
    });
    const BarSchema = Schema({ name: String });
    const Foo = db.model('gh8198_FooSchema', FooSchema);
    const Bar = db.model('gh8198_Bar', BarSchema);
    return co(function*() {
      const bar = yield Bar.create({ name: 'bar' });
      const foo = yield Foo.create({
        name: 'foo',
        children: [{ barId: bar._id, quantity: 1 }]
      });
      const foo2 = yield Foo.findById(foo._id).populate('children.bar');
      assert.equal(foo2.children[0].bar.name, 'bar');
    });
  });

  describe('gh-8247', function() {
    let Author;
    let Page;

    before(function() {
      const authorSchema = Schema({ name: String });
      const subSchema = Schema({
        author: { type: Schema.Types.ObjectId, ref: 'gh8247_Author' },
        comment: String
      });
      const pageSchema = Schema({ title: String, comments: [subSchema] });
      Author = db.model('gh8247_Author', authorSchema);
      Page = db.model('gh8247_Page', pageSchema);
    });

    this.beforeEach(() => co(function*() {
      yield Author.deleteMany({});
      yield Page.deleteMany({});
    }));

    it('checking `populated()` on a document array element (gh-8247)', function() {
      return co(function*() {
        const doc = yield Author.create({ name: 'test author' });
        yield Page.create({ comments: [{ author: doc._id }] });

        const fromDb = yield Page.findOne().populate('comments.author');
        assert.ok(Array.isArray(fromDb.populated('comments.author')));
        assert.equal(fromDb.populated('comments.author').length, 1);
        assert.equal(fromDb.comments[0].author.name, 'test author');

        assert.ok(fromDb.comments[0].populated('author'));
      });
    });

    it('updates top-level populated() when pushing elements onto a document array with single populated path (gh-8247) (gh-8265)', function() {
      return co(function*() {
        const docs = yield Author.create([
          { name: 'test1' },
          { name: 'test2' }
        ]);
        yield Page.create({ comments: [{ author: docs[0]._id }] });

        // Try setting to non-manually populated path...
        let fromDb = yield Page.findOne().populate('comments.author');
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
        fromDb = yield Page.findOne().populate('comments.author');
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
    });

    it('retainNullValues stores `null` in array if foreign doc not found (gh-8293)', function() {
      const schema = Schema({ troops: [{ type: Number, ref: 'gh8293_Card' }] });
      const Team = db.model('gh8293_Team', schema);

      const Card = db.model('gh8293_Card', Schema({
        _id: { type: Number },
        name: { type: String, unique: true },
        entityType: { type: String }
      }));

      return co(function*() {
        yield Card.create([
          { _id: 2, name: 'Card 2' },
          { _id: 3, name: 'Card 3' },
          { _id: 4, name: 'Card 4' }
        ]);
        yield Team.create({ troops: [1, 2, 3, 4] });

        const doc = yield Team.findOne().populate({
          path: 'troops',
          options: { retainNullValues: true }
        });
        assert.equal(doc.troops.length, 4);
        assert.equal(doc.troops[0], null);
        assert.equal(doc.troops[1].name, 'Card 2');
        assert.equal(doc.troops[2].name, 'Card 3');
        assert.equal(doc.troops[3].name, 'Card 4');
      });
    });
  });
});
