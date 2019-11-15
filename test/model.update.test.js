'use strict';

/**
 * Test dependencies.
 */

const start = require('./common');

const assert = require('assert');
const co = require('co');
const random = require('../lib/utils').random;
const Buffer = require('safe-buffer').Buffer;

const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;
const DocumentObjectId = mongoose.Types.ObjectId;
const CastError = mongoose.Error.CastError;

describe('model: update:', function() {
  let post;
  const title = 'Tobi';
  const author = 'Brian';
  const newTitle = 'Woot';
  let id0;
  let id1;
  let Comments;
  let BlogPost;
  let collection;
  let strictSchema;
  let db;

  before(function() {
    Comments = new Schema({});

    Comments.add({
      title: String,
      date: Date,
      body: String,
      comments: [Comments]
    });

    BlogPost = new Schema({
      title: String,
      author: String,
      slug: String,
      date: Date,
      meta: {
        date: Date,
        visitors: Number
      },
      published: Boolean,
      mixed: {},
      numbers: [Number],
      owners: [ObjectId],
      comments: [Comments]
    }, {strict: false});

    BlogPost.virtual('titleWithAuthor')
      .get(function() {
        return this.get('title') + ' by ' + this.get('author');
      })
      .set(function(val) {
        const split = val.split(' by ');
        this.set('title', split[0]);
        this.set('author', split[1]);
      });

    BlogPost.method('cool', function() {
      return this;
    });

    BlogPost.static('woot', function() {
      return this;
    });

    mongoose.model('BlogPostForUpdates', BlogPost);

    collection = 'blogposts_' + random();

    strictSchema = new Schema({name: String, x: {nested: String}});
    strictSchema.virtual('foo').get(function() {
      return 'i am a virtual FOO!';
    });
    mongoose.model('UpdateStrictSchema', strictSchema);

    db = start();
  });

  after(function(done) {
    db.close(done);
  });

  beforeEach(function(done) {
    const db = start();
    const BlogPost = db.model('BlogPostForUpdates', collection);

    id0 = new DocumentObjectId;
    id1 = new DocumentObjectId;

    post = new BlogPost;
    post.set('title', title);
    post.author = author;
    post.meta.visitors = 0;
    post.date = new Date;
    post.published = true;
    post.mixed = {x: 'ex'};
    post.numbers = [4, 5, 6, 7];
    post.owners = [id0, id1];
    post.comments = [{body: 'been there'}, {body: 'done that'}];

    post.save(function(err) {
      assert.ifError(err);
      db.close(done);
    });
  });

  it('works', function(done) {
    const BlogPost = db.model('BlogPostForUpdates', collection);

    BlogPost.findById(post._id, function(err, cf) {
      assert.ifError(err);
      assert.equal(cf.title, title);
      assert.equal(cf.author, author);
      assert.equal(cf.meta.visitors.valueOf(), 0);
      assert.equal(cf.date.toString(), post.date.toString());
      assert.equal(cf.published, true);
      assert.equal(cf.mixed.x, 'ex');
      assert.deepEqual(cf.numbers.toObject(), [4, 5, 6, 7]);
      assert.equal(cf.owners.length, 2);
      assert.equal(cf.owners[0].toString(), id0.toString());
      assert.equal(cf.owners[1].toString(), id1.toString());
      assert.equal(cf.comments.length, 2);
      assert.equal(cf.comments[0].body, 'been there');
      assert.equal(cf.comments[1].body, 'done that');
      assert.ok(cf.comments[0]._id);
      assert.ok(cf.comments[1]._id);
      assert.ok(cf.comments[0]._id instanceof DocumentObjectId);
      assert.ok(cf.comments[1]._id instanceof DocumentObjectId);

      const update = {
        title: newTitle, // becomes $set
        $inc: {'meta.visitors': 2},
        $set: {date: new Date},
        published: false, // becomes $set
        mixed: {x: 'ECKS', y: 'why'}, // $set
        $pullAll: {numbers: [4, 6]},
        $pull: {owners: id0},
        'comments.1.body': 8 // $set
      };

      BlogPost.update({title: title}, update, function(err) {
        assert.ifError(err);

        BlogPost.findById(post._id, function(err, up) {
          assert.ifError(err);
          assert.equal(up.title, newTitle);
          assert.equal(up.author, author);
          assert.equal(up.meta.visitors.valueOf(), 2);
          assert.equal(up.date.toString(), update.$set.date.toString());
          assert.equal(up.published, false);
          assert.equal(up.mixed.x, 'ECKS');
          assert.equal(up.mixed.y, 'why');
          assert.deepEqual(up.numbers.toObject(), [5, 7]);
          assert.equal(up.owners.length, 1);
          assert.equal(up.owners[0].toString(), id1.toString());
          assert.equal(up.comments[0].body, 'been there');
          assert.equal(up.comments[1].body, '8');
          assert.ok(up.comments[0]._id);
          assert.ok(up.comments[1]._id);
          assert.ok(up.comments[0]._id instanceof DocumentObjectId);
          assert.ok(up.comments[1]._id instanceof DocumentObjectId);

          const update2 = {
            'comments.body': 'fail'
          };

          BlogPost.update({_id: post._id}, update2, function(err) {
            assert.ok(err);
            assert.ok(err.message.length > 0);
            BlogPost.findById(post, function(err) {
              assert.ifError(err);

              const update3 = {
                $pull: 'fail'
              };

              BlogPost.update({_id: post._id}, update3, function(err) {
                assert.ok(err);

                assert.ok(/Invalid atomic update value for \$pull\. Expected an object, received string/.test(err.message));

                const update4 = {
                  $inc: {idontexist: 1}
                };

                // should not overwrite doc when no valid paths are submitted
                BlogPost.update({_id: post._id}, update4, function(err) {
                  assert.ifError(err);

                  BlogPost.findById(post._id, function(err, up) {
                    assert.ifError(err);

                    assert.equal(up.title, newTitle);
                    assert.equal(up.author, author);
                    assert.equal(up.meta.visitors.valueOf(), 2);
                    assert.equal(up.date.toString(), update.$set.date.toString());
                    assert.equal(up.published, false);
                    assert.equal(up.mixed.x, 'ECKS');
                    assert.equal(up.mixed.y, 'why');
                    assert.deepEqual(up.numbers.toObject(), [5, 7]);
                    assert.equal(up.owners.length, 1);
                    assert.equal(up.owners[0].toString(), id1.toString());
                    assert.equal(up.comments[0].body, 'been there');
                    assert.equal(up.comments[1].body, '8');
                    // non-schema data was still stored in mongodb
                    assert.strictEqual(1, up._doc.idontexist);

                    done();
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  it('casts doc arrays', function(done) {
    const BlogPost = db.model('BlogPostForUpdates', collection);

    const update = {
      comments: [{body: 'worked great'}],
      $set: {'numbers.1': 100},
      $inc: {idontexist: 1}
    };

    BlogPost.update({_id: post._id}, update, function(err) {
      assert.ifError(err);

      // get the underlying doc
      BlogPost.collection.findOne({_id: post._id}, function(err, doc) {
        assert.ifError(err);

        const up = new BlogPost;
        up.init(doc);
        assert.equal(up.comments.length, 1);
        assert.equal(up.comments[0].body, 'worked great');
        assert.strictEqual(true, !!doc.comments[0]._id);

        done();
      });
    });
  });

  it('makes copy of conditions and update options', function(done) {
    const BlogPost = db.model('BlogPostForUpdates', collection);

    const conditions = {'_id': post._id.toString()};
    const update = {'$set': {'some_attrib': post._id.toString()}};
    BlogPost.update(conditions, update, function(err) {
      assert.ifError(err);
      assert.equal(typeof conditions._id, 'string');
      done();
    });
  });

  it('$addToSet with $ (gh-479)', function(done) {
    const BlogPost = db.model('BlogPostForUpdates', collection);

    function a() {
    }

    a.prototype.toString = function() {
      return 'MongoDB++';
    };
    const crazy = new a;

    const update = {
      $addToSet: {'comments.$.comments': {body: 'The Ring Of Power'}},
      $set: {'comments.$.title': crazy}
    };

    BlogPost.update({_id: post._id, 'comments.body': 'been there'}, update, function(err) {
      assert.ifError(err);
      BlogPost.findById(post, function(err, ret) {
        assert.ifError(err);
        assert.equal(ret.comments.length, 2);
        assert.equal(ret.comments[0].body, 'been there');
        assert.equal(ret.comments[0].title, 'MongoDB++');
        assert.strictEqual(true, !!ret.comments[0].comments);
        assert.equal(ret.comments[0].comments.length, 1);
        assert.strictEqual(ret.comments[0].comments[0].body, 'The Ring Of Power');
        done();
      });
    });
  });

  describe('using last', function() {
    let BlogPost;
    let last;

    before(function() {
      BlogPost = db.model('BlogPostForUpdates', collection);
    });

    beforeEach(function(done) {
      BlogPost.findOne({}, function(error, doc) {
        assert.ifError(error);
        last = doc;
        done();
      });
    });

    it('handles date casting (gh-479)', function(done) {
      const update = {
        $inc: {'comments.$.newprop': '1'},
        $set: {date: (new Date).getTime()} // check for single val casting
      };

      BlogPost.update({_id: post._id, 'comments.body': 'been there'}, update, function(err) {
        assert.ifError(err);
        BlogPost.findById(post, function(err, ret) {
          assert.ifError(err);
          assert.equal(ret._doc.comments[0]._doc.newprop, 1);
          assert.strictEqual(undefined, ret._doc.comments[1]._doc.newprop);
          assert.ok(ret.date instanceof Date);
          assert.equal(ret.date.toString(), new Date(update.$set.date).toString());

          done();
        });
      });
    });

    it('handles $addToSet (gh-545)', function(done) {
      const owner = last.owners[0];
      const numOwners = last.owners.length;
      const update = {
        $addToSet: {owners: owner}
      };

      BlogPost.update({_id: last._id}, update, function(err) {
        assert.ifError(err);
        BlogPost.findById(last, function(err, ret) {
          assert.ifError(err);
          assert.equal(ret.owners.length, numOwners);
          assert.equal(ret.owners[0].toString(), owner.toString());

          done();
        });
      });
    });

    it('handles $addToSet with $each (gh-545)', function(done) {
      const owner = post.owners[0];
      const newowner = new DocumentObjectId;
      const numOwners = post.owners.length;

      const update = {
        $addToSet: {owners: {$each: [owner, newowner]}}
      };

      BlogPost.update({_id: post._id}, update, function(err) {
        assert.ifError(err);
        BlogPost.findById(post, function(err, ret) {
          assert.ifError(err);
          assert.equal(ret.owners.length, numOwners + 1);
          assert.equal(ret.owners[0].toString(), owner.toString());
          assert.equal(ret.owners[2].toString(), newowner.toString());

          done();
        });
      });
    });

    it('handles $pop and $unset (gh-574)', function(done) {
      const update = {
        $pop: {owners: -1},
        $unset: {title: 1}
      };

      BlogPost.update({_id: post._id}, update, function(err) {
        assert.ifError(err);
        BlogPost.findById(post, function(err, ret) {
          assert.ifError(err);
          assert.equal(ret.owners.length, 1);
          assert.equal(ret.owners[0].toString(), post.owners[1].toString());
          assert.strictEqual(ret.title, undefined);

          done();
        });
      });
    });
  });

  it('works with nested positional notation', function(done) {
    const BlogPost = db.model('BlogPostForUpdates', collection);

    const update = {
      $set: {
        'comments.0.comments.0.date': '11/5/2011',
        'comments.1.body': 9000
      }
    };

    BlogPost.update({_id: post._id}, update, function(err) {
      assert.ifError(err);
      BlogPost.findById(post, function(err, ret) {
        assert.ifError(err);
        assert.equal(ret.comments.length, 2);
        assert.equal(ret.comments[0].body, 'been there');
        assert.equal(ret.comments[1].body, '9000');
        assert.equal(ret.comments[0].comments[0].date.toString(), new Date('11/5/2011').toString());
        assert.equal(ret.comments[1].comments.length, 0);
        done();
      });
    });
  });

  it('handles $pull with obj literal (gh-542)', function(done) {
    const BlogPost = db.model('BlogPostForUpdates', collection);

    BlogPost.findById(post, function(err, doc) {
      assert.ifError(err);

      const update = {
        $pull: {comments: {_id: doc.comments[0].id}}
      };

      BlogPost.update({_id: post._id}, update, function(err) {
        assert.ifError(err);
        BlogPost.findById(post, function(err, ret) {
          assert.ifError(err);
          assert.equal(ret.comments.length, 1);
          assert.equal(ret.comments[0].body, 'done that');
          done();
        });
      });
    });
  });

  it('handles $pull of obj literal and nested $in', function(done) {
    const BlogPost = db.model('BlogPostForUpdates', collection);

    const update = {
      $pull: {comments: {body: {$in: ['been there']}}}
    };

    BlogPost.update({_id: post._id}, update, function(err) {
      assert.ifError(err);
      BlogPost.findById(post, function(err, ret) {
        assert.ifError(err);
        assert.equal(ret.comments.length, 1);
        assert.equal(ret.comments[0].body, 'done that');

        done();
      });
    });
  });

  it('handles $pull and nested $nin', function(done) {
    const BlogPost = db.model('BlogPostForUpdates', collection);

    BlogPost.findById(post, function(err, doc) {
      assert.ifError(err);

      doc.comments.push({body: 'hi'}, {body: 'there'});
      doc.save(function(err) {
        assert.ifError(err);
        BlogPost.findById(doc, function(err, ret) {
          assert.ifError(err);
          assert.equal(ret.comments.length, 4);

          const update = {
            $pull: {comments: {body: {$nin: ['there']}}}
          };

          BlogPost.update({_id: ret._id}, update, function(err) {
            assert.ifError(err);
            BlogPost.findById(post, function(err, ret) {
              assert.ifError(err);
              assert.equal(ret.comments.length, 1);
              assert.equal(ret.comments[0].body, 'there');
              done();
            });
          });
        });
      });
    });
  });

  it('updates numbers atomically', function(done) {
    const BlogPost = db.model('BlogPostForUpdates', collection);
    let totalDocs = 4;

    const post = new BlogPost;
    post.set('meta.visitors', 5);

    function complete() {
      BlogPost.findOne({_id: post.get('_id')}, function(err, doc) {
        assert.ifError(err);
        assert.equal(doc.get('meta.visitors'), 9);
        done();
      });
    }

    post.save(function(err) {
      assert.ifError(err);
      function callback(err) {
        assert.ifError(err);
        --totalDocs || complete();
      }
      for (let i = 0; i < 4; ++i) {
        BlogPost
          .update({_id: post._id}, {$inc: {'meta.visitors': 1}}, callback);
      }
    });
  });

  describe('honors strict schemas', function() {
    it('(gh-699)', function(done) {
      const S = db.model('UpdateStrictSchema');

      let doc = S.find()._castUpdate({ignore: true});
      assert.equal(doc, false);
      doc = S.find()._castUpdate({$unset: {x: 1}});
      assert.equal(Object.keys(doc.$unset).length, 1);
      done();
    });

    it('works', function(done) {
      const S = db.model('UpdateStrictSchema');
      const s = new S({name: 'orange crush'});

      s.save(function(err) {
        assert.ifError(err);

        S.update({_id: s._id}, {ignore: true}, function(err, affected) {
          assert.ifError(err);
          assert.equal(affected.n, 0);

          S.findById(s._id, function(err, doc) {
            assert.ifError(err);
            assert.ok(!doc.ignore);
            assert.ok(!doc._doc.ignore);

            S.update({_id: s._id}, {name: 'Drukqs', foo: 'fooey'}, function(err, affected) {
              assert.ifError(err);
              assert.equal(affected.n, 1);

              S.findById(s._id, function(err, doc) {
                assert.ifError(err);
                assert.ok(!doc._doc.foo);
                done();
              });
            });
          });
        });
      });
    });
  });

  it('passes number of affected docs', function(done) {
    const B = db.model('BlogPostForUpdates', 'wwwwowowo' + random());

    B.create({title: 'one'}, {title: 'two'}, {title: 'three'}, function(err) {
      assert.ifError(err);
      B.update({}, {title: 'newtitle'}, {multi: true}, function(err, affected) {
        assert.ifError(err);
        assert.equal(affected.n, 3);
        done();
      });
    });
  });

  it('updates a number to null (gh-640)', function(done) {
    const B = db.model('BlogPostForUpdates', 'wwwwowowo' + random());
    const b = new B({meta: {visitors: null}});
    b.save(function(err) {
      assert.ifError(err);
      B.findById(b, function(err, b) {
        assert.ifError(err);
        assert.strictEqual(b.meta.visitors, null);

        B.update({_id: b._id}, {meta: {visitors: null}}, function(err) {
          assert.strictEqual(null, err);
          done();
        });
      });
    });
  });

  it('handles $pull from Mixed arrays (gh-735)', function(done) {
    const schema = new Schema({comments: []});
    const M = db.model('gh-735', schema, 'gh-735_' + random());
    M.create({comments: [{name: 'node 0.8'}]}, function(err, doc) {
      assert.ifError(err);
      M.update({_id: doc._id}, {$pull: {comments: {name: 'node 0.8'}}}, function(err, affected) {
        assert.ifError(err);
        assert.equal(affected.n, 1);
        done();
      });
    });
  });

  it('handles $push with $ positionals (gh-1057)', function(done) {
    const taskSchema = new Schema({
      name: String
    });

    const componentSchema = new Schema({
      name: String,
      tasks: [taskSchema]
    });

    const projectSchema = new Schema({
      name: String,
      components: [componentSchema]
    });

    const Project = db.model('1057-project', projectSchema, '1057-' + random());

    Project.create({name: 'my project'}, function(err, project) {
      assert.ifError(err);
      const pid = project.id;
      const comp = project.components.create({name: 'component'});
      Project.update({_id: pid}, {$push: {components: comp}}, function(err) {
        assert.ifError(err);
        const task = comp.tasks.create({name: 'my task'});
        Project.update({_id: pid, 'components._id': comp._id}, {$push: {'components.$.tasks': task}}, function(err) {
          assert.ifError(err);
          Project.findById(pid, function(err, proj) {
            assert.ifError(err);
            assert.ok(proj);
            assert.equal(proj.components.length, 1);
            assert.equal(proj.components[0].name, 'component');
            assert.equal(comp.id, proj.components[0].id);
            assert.equal(proj.components[0].tasks.length, 1);
            assert.equal(proj.components[0].tasks[0].name, 'my task');
            assert.equal(task.id, proj.components[0].tasks[0].id);
            done();
          });
        });
      });
    });
  });

  it('handles nested paths starting with numbers (gh-1062)', function(done) {
    const schema = new Schema({counts: Schema.Types.Mixed});
    const M = db.model('gh-1062', schema, '1062-' + random());
    M.create({counts: {}}, function(err, m) {
      assert.ifError(err);
      M.update({}, {$inc: {'counts.1': 1, 'counts.1a': 10}}, function(err) {
        assert.ifError(err);
        M.findById(m, function(err, doc) {
          assert.ifError(err);
          assert.equal(doc.counts['1'], 1);
          assert.equal(doc.counts['1a'], 10);
          done();
        });
      });
    });
  });

  it('handles positional operators with referenced docs (gh-1572)', function(done) {
    const so = new Schema({title: String, obj: [String]});
    const Some = db.model('Some' + random(), so);

    Some.create({obj: ['a', 'b', 'c']}, function(err, s) {
      assert.ifError(err);

      Some.update({_id: s._id, obj: 'b'}, {$set: {'obj.$': 2}}, function(err) {
        assert.ifError(err);

        Some.findById(s._id, function(err, ss) {
          assert.ifError(err);

          assert.strictEqual(ss.obj[1], '2');
          done();
        });
      });
    });
  });

  it('use .where for update condition (gh-2170)', function(done) {
    const so = new Schema({num: Number});
    const Some = db.model('gh-2170' + random(), so);

    Some.create([{num: 1}, {num: 1}], function(err, docs) {
      assert.ifError(err);
      assert.equal(docs.length, 2);
      const doc0 = docs[0];
      const doc1 = docs[1];
      const sId0 = doc0._id;
      const sId1 = doc1._id;
      Some.where({_id: sId0}).update({}, {$set: {num: '99'}}, {multi: true}, function(err, cnt) {
        assert.ifError(err);
        assert.equal(cnt.n, 1);
        Some.findById(sId0, function(err, doc0_1) {
          assert.ifError(err);
          assert.equal(doc0_1.num, 99);
          Some.findById(sId1, function(err, doc1_1) {
            assert.ifError(err);
            assert.equal(doc1_1.num, 1);
            done();
          });
        });
      });
    });
  });

  describe('mongodb 2.4 features', function() {
    let mongo24_or_greater = false;

    before(function(done) {
      start.mongodVersion(function(err, version) {
        assert.ifError(err);
        mongo24_or_greater = version[0] > 2 || (version[0] === 2 && version[1] >= 4);
        done();
      });
    });

    it('$setOnInsert operator', function(done) {
      if (!mongo24_or_greater) {
        console.log('not testing mongodb 2.4 $setOnInsert feature');
        return done();
      }

      const schema = new Schema({name: String, age: Number, x: String});
      const M = db.model('setoninsert-' + random(), schema);

      const match = {name: 'set on insert'};
      const op = {$setOnInsert: {age: '47'}, x: 'inserted'};
      M.update(match, op, {upsert: true}, function(err) {
        assert.ifError(err);
        M.findOne(function(err, doc) {
          assert.ifError(err);
          assert.equal(doc.age, 47);
          assert.equal(doc.name, 'set on insert');

          const match = {name: 'set on insert'};
          const op = {$setOnInsert: {age: 108}, name: 'changed'};
          M.update(match, op, {upsert: true}, function(err) {
            assert.ifError(err);

            M.findOne(function(err, doc) {
              assert.equal(doc.age, 47);
              assert.equal(doc.name, 'changed');
              done();
            });
          });
        });
      });
    });

    it('push with $slice', function(done) {
      if (!mongo24_or_greater) {
        console.log('not testing mongodb 2.4 $push with $slice feature');
        return done();
      }

      const schema = new Schema({name: String, n: [{x: Number}]});
      const M = db.model('setoninsert-' + random(), schema);

      M.create({name: '2.4'}, function(err, created) {
        assert.ifError(err);

        let op = {
          $push: {
            n: {
              $each: [{x: 10}, {x: 4}, {x: 1}],
              $slice: '-1',
              $sort: {x: 1}
            }
          }
        };

        M.update({_id: created._id}, op, function(err) {
          assert.ifError(err);
          M.findById(created._id, function(err, doc) {
            assert.ifError(err);
            assert.equal(created.id, doc.id);
            assert.equal(doc.n.length, 1);
            assert.equal(doc.n[0].x, 10);

            op = {
              $push: {
                n: {
                  $each: [],
                  $slice: 0
                }
              }
            };
            M.update({_id: created._id}, op, function(err) {
              assert.ifError(err);
              M.findById(created._id, function(error, doc) {
                assert.ifError(error);
                assert.equal(doc.n.length, 0);
                done();
              });
            });
          });
        });
      });
    });
  });

  describe('mongodb 2.6 features', function() {
    let mongo26_or_greater = false;

    before(function(done) {
      start.mongodVersion(function(err, version) {
        assert.ifError(err);
        mongo26_or_greater = version[0] > 2 || (version[0] === 2 && version[1] >= 6);
        done();
      });
    });

    it('supports $position', function(done) {
      if (!mongo26_or_greater) {
        return done();
      }

      const schema = new Schema({name: String, n: [{x: Number}]});
      const M = db.model('setoninsert-' + random(), schema);

      const m = new M({name: '2.6', n: [{x: 0}]});
      m.save(function(error, m) {
        assert.ifError(error);
        assert.equal(m.n.length, 1);
        M.update(
          {name: '2.6'},
          {$push: {n: {$each: [{x: 2}, {x: 1}], $position: 0}}},
          function(error) {
            assert.ifError(error);
            M.findOne({name: '2.6'}, function(error, m) {
              assert.ifError(error);
              assert.equal(m.n.length, 3);
              assert.equal(m.n[0].x, 2);
              assert.equal(m.n[1].x, 1);
              assert.equal(m.n[2].x, 0);
              done();
            });
          });
      });
    });

    it('supports $currentDate', function(done) {
      if (!mongo26_or_greater) {
        return done();
      }

      const schema = new Schema({name: String, lastModified: Date, lastModifiedTS: Date});
      const M = db.model('gh-2019', schema);

      const m = new M({name: '2.6'});
      m.save(function(error) {
        assert.ifError(error);
        const before = Date.now();
        M.update(
          {name: '2.6'},
          {$currentDate: {lastModified: true, lastModifiedTS: {$type: 'timestamp'}}},
          function(error) {
            assert.ifError(error);
            M.findOne({name: '2.6'}, function(error, m) {
              const after = Date.now();
              assert.ifError(error);
              assert.ok(m.lastModified.getTime() >= before);
              assert.ok(m.lastModified.getTime() <= after);
              done();
            });
          });
      });
    });
  });

  describe('{overwrite: true}', function() {
    it('overwrite works', function(done) {
      const schema = new Schema({mixed: {}}, { minimize: false });
      const M = db.model('updatesmixed-' + random(), schema);

      M.create({mixed: 'something'}, function(err, created) {
        assert.ifError(err);

        M.update({_id: created._id}, {mixed: {}}, {overwrite: true}, function(err) {
          assert.ifError(err);
          M.findById(created._id, function(err, doc) {
            assert.ifError(err);
            assert.equal(created.id, doc.id);
            assert.equal(typeof doc.mixed, 'object');
            assert.equal(Object.keys(doc.mixed).length, 0);
            done();
          });
        });
      });
    });

    it('overwrites all properties', function(done) {
      const sch = new Schema({title: String, subdoc: {name: String, num: Number}});

      const M = db.model('updateover' + random(), sch);

      M.create({subdoc: {name: 'that', num: 1}}, function(err, doc) {
        assert.ifError(err);

        M.update({_id: doc.id}, {title: 'something!'}, {overwrite: true}, function(err) {
          assert.ifError(err);
          M.findById(doc.id, function(err, doc) {
            assert.ifError(err);
            assert.equal(doc.title, 'something!');
            assert.equal(doc.subdoc.name, undefined);
            assert.equal(doc.subdoc.num, undefined);
            done();
          });
        });
      });
    });

    it('allows users to blow it up', function(done) {
      const sch = new Schema({title: String, subdoc: {name: String, num: Number}});

      const M = db.model('updateover' + random(), sch);

      M.create({subdoc: {name: 'that', num: 1, title: 'hello'}}, function(err, doc) {
        assert.ifError(err);

        M.update({_id: doc.id}, {}, {overwrite: true}, function(err) {
          assert.ifError(err);
          M.findById(doc.id, function(err, doc) {
            assert.ifError(err);
            assert.equal(doc.title, undefined);
            assert.equal(doc.subdoc.name, undefined);
            assert.equal(doc.subdoc.num, undefined);
            done();
          });
        });
      });
    });
  });

  it('casts empty arrays', function(done) {
    const so = new Schema({arr: []});
    const Some = db.model('1838-' + random(), so);

    Some.create({arr: ['a']}, function(err, s) {
      if (err) {
        return done(err);
      }

      Some.update({_id: s._id}, {arr: []}, function(err) {
        if (err) {
          return done(err);
        }
        Some.findById(s._id, function(err, doc) {
          if (err) {
            return done(err);
          }
          assert.ok(Array.isArray(doc.arr));
          assert.strictEqual(0, doc.arr.length);
          done();
        });
      });
    });
  });

  describe('defaults and validators (gh-860)', function() {
    it('applies defaults on upsert', function(done) {
      const s = new Schema({topping: {type: String, default: 'bacon'}, base: String});
      const Breakfast = db.model('gh-860-0', s);
      const updateOptions = {upsert: true, setDefaultsOnInsert: true};
      Breakfast.update({}, {base: 'eggs'}, updateOptions, function(error) {
        assert.ifError(error);
        Breakfast.findOne({}).lean().exec(function(error, breakfast) {
          assert.ifError(error);
          assert.equal(breakfast.base, 'eggs');
          assert.equal(breakfast.topping, 'bacon');
          done();
        });
      });
    });

    it('avoids nested paths if setting parent path (gh-4911)', function(done) {
      const EmbeddedSchema = mongoose.Schema({
        embeddedField: String
      });

      const ParentSchema = mongoose.Schema({
        embedded: EmbeddedSchema
      });

      const Parent = db.model('gh4911', ParentSchema);

      const newDoc = {
        _id: new mongoose.Types.ObjectId(),
        embedded: null
      };

      const opts = { upsert: true, setDefaultsOnInsert: true };

      Parent.
        findOneAndUpdate({ _id: newDoc._id }, newDoc, opts).
        then(function() { done(); }).
        catch(done);
    });

    it('doesnt set default on upsert if query sets it', function(done) {
      const s = new Schema({topping: {type: String, default: 'bacon'}, base: String});
      const Breakfast = db.model('gh-860-1', s);

      const updateOptions = {upsert: true, setDefaultsOnInsert: true};
      Breakfast.update({topping: 'sausage'}, {base: 'eggs'}, updateOptions, function(error) {
        assert.ifError(error);
        Breakfast.findOne({}, function(error, breakfast) {
          assert.ifError(error);
          assert.equal(breakfast.base, 'eggs');
          assert.equal(breakfast.topping, 'sausage');
          done();
        });
      });
    });

    it('properly sets default on upsert if query wont set it', function(done) {
      const s = new Schema({topping: {type: String, default: 'bacon'}, base: String});
      const Breakfast = db.model('gh-860-2', s);

      const updateOptions = {upsert: true, setDefaultsOnInsert: true};
      Breakfast.update({topping: {$ne: 'sausage'}}, {base: 'eggs'}, updateOptions, function(error) {
        assert.ifError(error);
        Breakfast.findOne({}, function(error, breakfast) {
          assert.ifError(error);
          assert.equal(breakfast.base, 'eggs');
          assert.equal(breakfast.topping, 'bacon');
          done();
        });
      });
    });

    it('handles defaults on document arrays (gh-4456)', function(done) {
      const schema = new Schema({
        arr: {
          type: [new Schema({ name: String }, { _id: false })],
          default: [{ name: 'Val' }]
        }
      });

      const M = db.model('gh4456', schema);

      const opts = { upsert: true, setDefaultsOnInsert: true };
      M.update({}, {}, opts, function(error) {
        assert.ifError(error);
        M.findOne({}, function(error, doc) {
          assert.ifError(error);
          assert.deepEqual(doc.toObject().arr, [{ name: 'Val' }]);
          done();
        });
      });
    });

    it('with omitUndefined (gh-6034)', function(done) {
      const schema = new Schema({
        boolField: {
          type: Boolean,
          default: false
        }
      });

      const M = db.model('gh6034', schema);

      const opts = { upsert: true, setDefaultsOnInsert: true, omitUndefined: true };
      M.update({}, {}, opts, function(error) {
        assert.ifError(error);
        M.findOne({}, function(error, doc) {
          assert.ifError(error);
          assert.strictEqual(doc.boolField, false);
          done();
        });
      });
    });

    it('runs validators if theyre set', function(done) {
      const s = new Schema({
        topping: {
          type: String,
          validate: function() {
            return false;
          }
        },
        base: {
          type: String,
          validate: function() {
            return true;
          }
        }
      });
      const Breakfast = db.model('gh-860-3', s);

      const updateOptions = {upsert: true, setDefaultsOnInsert: true, runValidators: true};
      Breakfast.update({}, {topping: 'bacon', base: 'eggs'}, updateOptions, function(error) {
        assert.ok(!!error);
        assert.equal(Object.keys(error.errors).length, 1);
        assert.equal(Object.keys(error.errors)[0], 'topping');
        assert.equal(error.errors.topping.message, 'Validator failed for path `topping` with value `bacon`');

        Breakfast.findOne({}, function(error, breakfast) {
          assert.ifError(error);
          assert.ok(!breakfast);
          done();
        });
      });
    });

    it('validators handle $unset and $setOnInsert', function(done) {
      const s = new Schema({
        steak: {type: String, required: true},
        eggs: {
          type: String,
          validate: function() {
            assert.ok(this instanceof require('../').Query);
            return false;
          }
        }
      });
      const Breakfast = db.model('gh-860-4', s);

      const updateOptions = {runValidators: true, context: 'query'};
      Breakfast.update({}, {$unset: {steak: ''}, $setOnInsert: {eggs: 'softboiled'}}, updateOptions, function(error) {
        assert.ok(!!error);
        assert.equal(Object.keys(error.errors).length, 2);
        assert.ok(Object.keys(error.errors).indexOf('eggs') !== -1);
        assert.ok(Object.keys(error.errors).indexOf('steak') !== -1);
        assert.equal(error.errors.eggs.message, 'Validator failed for path `eggs` with value `softboiled`');
        assert.equal(error.errors.steak.message, 'Path `steak` is required.');
        done();
      });
    });

    it('global validators option (gh-6578)', function() {
      const s = new Schema({
        steak: { type: String, required: true }
      });
      const m = new mongoose.Mongoose();
      const Breakfast = m.model('gh6578', s);

      const updateOptions = { runValidators: true };
      return co(function*() {
        const error = yield Breakfast.
          update({}, { $unset: { steak: 1 } }, updateOptions).
          catch(err => err);

        assert.ok(!!error);
        assert.equal(Object.keys(error.errors).length, 1);
        assert.ok(Object.keys(error.errors).indexOf('steak') !== -1);
      });
    });

    it('min/max, enum, and regex built-in validators work', function(done) {
      const s = new Schema({
        steak: {type: String, enum: ['ribeye', 'sirloin']},
        eggs: {type: Number, min: 4, max: 6},
        bacon: {type: String, match: /strips/}
      });
      const Breakfast = db.model('gh-860-5', s);

      const updateOptions = {runValidators: true};
      Breakfast.update({}, {$set: {steak: 'ribeye', eggs: 3, bacon: '3 strips'}}, updateOptions, function(error) {
        assert.ok(!!error);
        assert.equal(Object.keys(error.errors).length, 1);
        assert.equal(Object.keys(error.errors)[0], 'eggs');
        assert.equal(error.errors.eggs.message, 'Path `eggs` (3) is less than minimum allowed value (4).');

        Breakfast.update({}, {$set: {steak: 'tofu', eggs: 5, bacon: '3 strips'}}, updateOptions, function(error) {
          assert.ok(!!error);
          assert.equal(Object.keys(error.errors).length, 1);
          assert.equal(Object.keys(error.errors)[0], 'steak');
          assert.equal(error.errors.steak, '`tofu` is not a valid enum value for path `steak`.');

          Breakfast.update({}, {$set: {steak: 'sirloin', eggs: 6, bacon: 'none'}}, updateOptions, function(error) {
            assert.ok(!!error);
            assert.equal(Object.keys(error.errors).length, 1);
            assert.equal(Object.keys(error.errors)[0], 'bacon');
            assert.equal(error.errors.bacon.message, 'Path `bacon` is invalid (none).');

            done();
          });
        });
      });
    });

    it('multiple validation errors', function(done) {
      const s = new Schema({
        steak: {type: String, enum: ['ribeye', 'sirloin']},
        eggs: {type: Number, min: 4, max: 6},
        bacon: {type: String, match: /strips/}
      });
      const Breakfast = db.model('gh-860-6', s);

      const updateOptions = {runValidators: true};
      Breakfast.update({}, {$set: {steak: 'tofu', eggs: 2, bacon: '3 strips'}}, updateOptions, function(error) {
        assert.ok(!!error);
        assert.equal(Object.keys(error.errors).length, 2);
        assert.ok(Object.keys(error.errors).indexOf('steak') !== -1);
        assert.ok(Object.keys(error.errors).indexOf('eggs') !== -1);
        done();
      });
    });

    it('validators ignore $inc', function(done) {
      const s = new Schema({
        steak: {type: String, required: true},
        eggs: {type: Number, min: 4}
      });
      const Breakfast = db.model('gh-860-7', s);

      const updateOptions = {runValidators: true};
      Breakfast.update({}, {$inc: {eggs: 1}}, updateOptions, function(error) {
        assert.ifError(error);
        done();
      });
    });

    it('validators handle positional operator (gh-3167)', function(done) {
      const s = new Schema({
        toppings: [{name: {type: String, enum: ['bacon', 'cheese']}}]
      });
      const Breakfast = db.model('gh-860-8', s);

      const updateOptions = {runValidators: true};
      Breakfast.update(
        {'toppings.name': 'bacon'},
        {'toppings.$.name': 'tofu'},
        updateOptions,
        function(error) {
          assert.ok(error);
          assert.ok(error.errors['toppings.0.name']);
          done();
        });
    });

    it('validators handle arrayFilters (gh-7536)', function() {
      const s = new Schema({
        toppings: [{name: {type: String, enum: ['bacon', 'cheese']}}]
      });
      const Breakfast = db.model('gh-7536', s);

      const updateOptions = {
        runValidators: true,
        arrayFilters: [{ 't.name': 'bacon' }]
      };
      return Breakfast.
        update({}, {'toppings.$[t].name': 'tofu'}, updateOptions).
        then(
          () => assert.ok(false),
          err => {
            assert.ok(err);
            assert.equal(Object.keys(err.errors).length, 1);
            assert.ok(/toppings.*name/.test(Object.keys(err.errors)[0]));
          });
    });

    it('required and single nested (gh-4479)', function(done) {
      const FileSchema = new Schema({
        name: {
          type: String,
          required: true
        }
      });

      const CompanySchema = new Schema({
        file: FileSchema
      });

      const Company = db.model('gh4479', CompanySchema);
      const update = { file: { name: '' } };
      const options = { runValidators: true };
      Company.update({}, update, options, function(error) {
        assert.ok(error);
        assert.equal(error.errors['file.name'].message,
          'Path `name` is required.');
        done();
      });
    });
  });

  it('works with $set and overwrite (gh-2515)', function(done) {
    const schema = new Schema({breakfast: String});
    const M = db.model('gh-2515', schema);

    M.create({breakfast: 'bacon'}, function(error, doc) {
      assert.ifError(error);
      M.update(
        {_id: doc._id},
        {$set: {breakfast: 'eggs'}},
        {overwrite: true},
        function(error) {
          assert.ifError(error);
          M.findOne({_id: doc._id}, function(error, doc) {
            assert.ifError(error);
            assert.equal(doc.breakfast, 'eggs');
            done();
          });
        });
    });
  });

  it('successfully casts set with nested mixed objects (gh-2796)', function(done) {
    const schema = new Schema({breakfast: {}});
    const M = db.model('gh-2796', schema);

    M.create({}, function(error, doc) {
      assert.ifError(error);
      M.update(
        {_id: doc._id},
        {breakfast: {eggs: 2, bacon: 3}},
        function(error, result) {
          assert.ifError(error);
          assert.ok(result.ok);
          assert.equal(result.n, 1);
          M.findOne({_id: doc._id}, function(error, doc) {
            assert.ifError(error);
            assert.equal(doc.breakfast.eggs, 2);
            done();
          });
        });
    });
  });

  it('handles empty update with promises (gh-2796)', function(done) {
    const schema = new Schema({eggs: Number});
    const M = db.model('Breakfast', schema);

    M.create({}, function(error, doc) {
      assert.ifError(error);
      M.update({_id: doc._id}, {notInSchema: 1}).exec().
        then(function(data) {
          assert.equal(data.ok, 0);
          assert.equal(data.n, 0);
          done();
        }).
        catch(done);
    });
  });

  describe('middleware', function() {
    it('can specify pre and post hooks', function(done) {
      let numPres = 0;
      let numPosts = 0;
      const band = new Schema({members: [String]});
      band.pre('update', function(next) {
        ++numPres;
        next();
      });
      band.post('update', function() {
        ++numPosts;
      });
      const Band = db.model('gh-964', band);

      const gnr = new Band({members: ['Axl', 'Slash', 'Izzy', 'Duff', 'Adler']});
      gnr.save(function(error) {
        assert.ifError(error);
        assert.equal(numPres, 0);
        assert.equal(numPosts, 0);
        Band.update(
          {_id: gnr._id},
          {$pull: {members: 'Adler'}},
          function(error) {
            assert.ifError(error);
            assert.equal(numPres, 1);
            assert.equal(numPosts, 1);
            Band.findOne({_id: gnr._id}, function(error, doc) {
              assert.ifError(error);
              assert.deepEqual(['Axl', 'Slash', 'Izzy', 'Duff'],
                doc.toObject().members);
              done();
            });
          });
      });
    });

    it('runs before validators (gh-2706)', function(done) {
      const bandSchema = new Schema({
        lead: {type: String, enum: ['Axl Rose']}
      });
      bandSchema.pre('update', function() {
        this.options.runValidators = true;
      });
      const Band = db.model('gh2706', bandSchema, 'gh2706');

      Band.update({}, {$set: {lead: 'Not Axl'}}, function(err) {
        assert.ok(err);
        done();
      });
    });

    describe('objects and arrays', function() {
      it('embedded objects (gh-2706)', function(done) {
        const bandSchema = new Schema({
          singer: {
            firstName: {type: String, enum: ['Axl']},
            lastName: {type: String, enum: ['Rose']}
          }
        });
        bandSchema.pre('update', function() {
          this.options.runValidators = true;
        });
        const Band = db.model('gh2706', bandSchema, 'gh2706');

        Band.update({}, {$set: {singer: {firstName: 'Not', lastName: 'Axl'}}}, function(err) {
          assert.ok(err);
          done();
        });
      });

      it('handles document array validation (gh-2733)', function(done) {
        const member = new Schema({
          name: String,
          role: {type: String, required: true, enum: ['singer', 'guitar', 'drums', 'bass']}
        });
        const band = new Schema({members: [member], name: String});
        const Band = db.model('band', band, 'bands');
        const members = [
          {name: 'Axl Rose', role: 'singer'},
          {name: 'Slash', role: 'guitar'},
          {name: 'Christopher Walken', role: 'cowbell'}
        ];

        Band.findOneAndUpdate(
          {name: 'Guns N\' Roses'},
          {$set: {members: members}},
          {runValidators: true},
          function(err) {
            assert.ok(err);
            done();
          });
      });

      it('validators on arrays (gh-3724)', function(done) {
        const schema = new Schema({
          arr: [String]
        });

        schema.path('arr').validate(function() {
          return false;
        });

        const M = db.model('gh3724', schema);
        const options = {runValidators: true};
        M.findOneAndUpdate({}, {arr: ['test']}, options, function(error) {
          assert.ok(error);
          assert.ok(/ValidationError/.test(error.toString()));
          done();
        });
      });
    });
  });

  it('works with overwrite but no $set (gh-2568)', function(done) {
    const chapterSchema = {
      name: String
    };
    const bookSchema = {
      chapters: [chapterSchema],
      title: String,
      author: String,
      id: Number
    };
    const Book = db.model('gh2568', bookSchema);

    const jsonObject = {
      chapters: [{name: 'Ursus'}, {name: 'The Comprachicos'}],
      name: 'The Man Who Laughs',
      author: 'Victor Hugo',
      id: 0
    };

    Book.update({}, jsonObject, {upsert: true, overwrite: true},
      function(error) {
        assert.ifError(error);
        Book.findOne({id: 0}, function(error, book) {
          assert.ifError(error);
          assert.equal(book.chapters.length, 2);
          assert.ok(book.chapters[0]._id);
          assert.ok(book.chapters[1]._id);
          done();
        });
      });
  });

  it('works with undefined date (gh-2833)', function(done) {
    const dateSchema = {
      d: Date
    };
    const D = db.model('gh2833', dateSchema);

    assert.doesNotThrow(function() {
      D.update({}, {d: undefined}, function() {
        done();
      });
    });
  });

  describe('set() (gh-5770)', function() {
    it('works with middleware and doesn\'t change the op', function() {
      const schema = new Schema({ name: String, updatedAt: Date });
      const date = new Date();
      schema.pre('update', function() {
        this.set('updatedAt', date);
      });
      const M = db.model('gh5770_0', schema);

      return M.update({}, { name: 'Test' }, { upsert: true }).
        then(() => M.findOne()).
        then(doc => {
          assert.equal(doc.updatedAt.valueOf(), date.valueOf());
        });
    });

    it('object syntax for path parameter', function() {
      const schema = new Schema({ name: String, updatedAt: Date });
      const date = new Date();
      schema.pre('update', function() {
        this.set({ updatedAt: date });
      });
      const M = db.model('gh5770_1', schema);

      return M.update({}, { name: 'Test' }, { upsert: true }).
        then(() => M.findOne()).
        then(doc => {
          assert.equal(doc.updatedAt.valueOf(), date.valueOf());
        });
    });
  });

  it('does not add virtuals to update (gh-2046)', function(done) {
    const childSchema = new Schema({foo: String}, {toObject: {getters: true}});
    const parentSchema = new Schema({children: [childSchema]});

    childSchema.virtual('bar').get(function() {
      return 'bar';
    });

    const Parent = db.model('gh2046', parentSchema, 'gh2046');

    const update = Parent.update({}, {$push: {children: {foo: 'foo'}}}, {upsert: true});
    assert.equal(update._update.$push.children.bar, undefined);

    update.exec(function(error) {
      assert.ifError(error);
      Parent.findOne({}, function(error, doc) {
        assert.ifError(error);
        assert.equal(doc.children.length, 1);
        assert.ok(!doc.toObject({ virtuals: false }).children[0].bar);
        done();
      });
    });
  });

  it('doesnt modify original argument doc (gh-3008)', function(done) {
    const FooSchema = new mongoose.Schema({
      key: Number,
      value: String
    });
    const Model = db.model('gh3008', FooSchema);

    const update = {$set: {values: 2, value: 2}};
    Model.update({key: 1}, update, function() {
      assert.equal(update.$set.values, 2);
      done();
    });
  });

  describe('bug fixes', function() {
    it('can $rename (gh-1845)', function(done) {
      const schema = new Schema({ foo: Date, bar: Date });
      const Model = db.model('gh1845', schema, 'gh1845');

      const update = { $rename: { foo: 'bar'} };
      Model.create({ foo: Date.now() }, function(error) {
        assert.ifError(error);
        Model.update({}, update, { multi: true }, function(error, res) {
          assert.ifError(error);
          assert.ok(res.ok);
          assert.equal(res.nModified, 1);
          done();
        });
      });
    });

    it('allows objects with positional operator (gh-3185)', function(done) {
      const schema = new Schema({children: [{_id: Number}]});
      const MyModel = db.model('gh3185', schema, 'gh3185');

      MyModel.create({children: [{_id: 1}]}, function(error, doc) {
        assert.ifError(error);
        MyModel.findOneAndUpdate(
          {_id: doc._id, 'children._id': 1},
          {$set: {'children.$': {_id: 2}}},
          {new: true},
          function(error, doc) {
            assert.ifError(error);
            assert.equal(doc.children[0]._id, 2);
            done();
          });
      });
    });

    it('mixed type casting (gh-3305)', function(done) {
      const Schema = mongoose.Schema({}, {strict: false});
      const Model = db.model('gh3305', Schema);

      Model.create({}, function(error, m) {
        assert.ifError(error);
        Model.
          update({_id: m._id}, {$push: {myArr: {key: 'Value'}}}).
          exec(function(error, res) {
            assert.ifError(error);
            assert.equal(res.n, 1);
            done();
          });
      });
    });

    it('replaceOne', function(done) {
      const schema = mongoose.Schema({ name: String, age: Number }, {
        versionKey: false
      });
      const Model = db.model('gh3998_r1', schema);

      Model.create({ name: 'abc', age: 1 }, function(error, m) {
        assert.ifError(error);
        Model.replaceOne({ name: 'abc' }, { name: 'test' }).exec(function(err) {
          assert.ifError(err);
          Model.findById(m._id).exec(function(error, doc) {
            assert.ifError(error);
            assert.deepEqual(doc.toObject({ virtuals: false }), {
              _id: m._id,
              name: 'test'
            });
            done();
          });
        });
      });
    });

    it('mixed nested type casting (gh-3337)', function(done) {
      const Schema = mongoose.Schema({attributes: {}}, {strict: true});
      const Model = db.model('gh3337', Schema);

      Model.create({}, function(error, m) {
        assert.ifError(error);
        const update = {$push: {'attributes.scores.bar': {a: 1}}};
        Model.
          update({_id: m._id}, update).
          exec(function(error, res) {
            assert.ifError(error);
            assert.equal(res.n, 1);
            Model.findById(m._id, function(error, doc) {
              assert.ifError(error);
              assert.equal(doc.attributes.scores.bar.length, 1);
              done();
            });
          });
      });
    });

    it('with single nested (gh-3820)', function(done) {
      const child = new mongoose.Schema({
        item2: {
          item3: String,
          item4: String
        }
      });

      const parentSchema = new mongoose.Schema({
        name: String,
        item1: child
      });

      const Parent = db.model('Parent', parentSchema);

      Parent.create({ name: 'test' }, function(error, doc) {
        assert.ifError(error);
        const update = { 'item1.item2': { item3: 'test1', item4: 'test2' } };
        doc.update(update, function(error) {
          assert.ifError(error);
          Parent.findOne({ _id: doc._id }, function(error, doc) {
            assert.ifError(error);
            assert.equal(doc.item1.item2.item3, 'test1');
            assert.equal(doc.item1.item2.item4, 'test2');
            done();
          });
        });
      });
    });

    it('with single nested and transform (gh-4621)', function(done) {
      const SubdocSchema = new Schema({
        name: String
      }, {
        toObject: {
          transform: function(doc, ret) {
            ret.id = ret._id.toString();
            delete ret._id;
          }
        }
      });

      const CollectionSchema = new Schema({
        field2: SubdocSchema
      });

      const Collection = db.model('gh4621', CollectionSchema);

      Collection.create({}, function(error, doc) {
        assert.ifError(error);
        const update = { 'field2': { name: 'test' } };
        Collection.update({ _id: doc._id }, update, function(err) {
          assert.ifError(err);
          Collection.collection.findOne({ _id: doc._id }, function(err, doc) {
            assert.ifError(err);
            assert.ok(doc.field2._id);
            assert.ok(!doc.field2.id);
            done();
          });
        });
      });

    });

    it('works with buffers (gh-3496)', function(done) {
      const Schema = mongoose.Schema({myBufferField: Buffer});
      const Model = db.model('gh3496', Schema);

      Model.update({}, {myBufferField: Buffer.alloc(1)}, function(error) {
        assert.ifError(error);
        done();
      });
    });

    it('.update(doc) (gh-3221)', function() {
      const Schema = mongoose.Schema({name: String});
      const Model = db.model('gh3221', Schema);

      let query = Model.update({name: 'Val'});
      assert.equal(query.getUpdate().name, 'Val');

      query = Model.find().update({name: 'Val'});
      assert.equal(query.getUpdate().name, 'Val');

      return query.setOptions({ upsert: true }).
        then(() => Model.findOne()).
        then(doc => {
          assert.equal(doc.name, 'Val');
        });
    });

    it('nested schemas with strict false (gh-3883)', function(done) {
      const OrderSchema = new mongoose.Schema({
      }, { strict: false, _id: false });

      const SeasonSchema = new mongoose.Schema({
        regions: [OrderSchema]
      }, { useNestedStrict: true });

      const Season = db.model('gh3883', SeasonSchema);
      const obj = { regions: [{ r: 'test', action: { order: 'hold' } }] };
      Season.create(obj, function(error) {
        assert.ifError(error);
        const query = { 'regions.r': 'test' };
        const update = { $set: { 'regions.$.action': { order: 'move' } } };
        const opts = { 'new': true };
        Season.findOneAndUpdate(query, update, opts, function(error, doc) {
          assert.ifError(error);
          assert.equal(doc.toObject().regions[0].action.order, 'move');
          done();
        });
      });
    });

    it('middleware update with exec (gh-3549)', function(done) {
      const Schema = mongoose.Schema({name: String});

      Schema.pre('update', function(next) {
        this.update({name: 'Val'});
        next();
      });

      const Model = db.model('gh3549', Schema);

      Model.create({}, function(error, doc) {
        assert.ifError(error);
        Model.update({_id: doc._id}, {name: 'test'}).exec(function(error) {
          assert.ifError(error);
          Model.findOne({_id: doc._id}, function(error, doc) {
            assert.ifError(error);
            assert.equal(doc.name, 'Val');
            done();
          });
        });
      });
    });

    it('casting $push with overwrite (gh-3564)', function(done) {
      const schema = mongoose.Schema({
        topicId: Number,
        name: String,
        followers: [Number]
      });

      const doc = {
        topicId: 100,
        name: 'name',
        followers: [500]
      };

      const M = db.model('gh-3564', schema);

      M.create(doc, function(err) {
        assert.ifError(err);

        const update = {$push: {followers: 200}};
        const opts = {overwrite: true, new: true, safe: true, upsert: false, multi: false};

        M.update({topicId: doc.topicId}, update, opts, function(err) {
          assert.ifError(err);
          M.findOne({topicId: doc.topicId}, function(error, doc) {
            assert.ifError(error);
            assert.equal(doc.name, 'name');
            assert.deepEqual(doc.followers.toObject(), [500, 200]);
            done();
          });
        });
      });
    });

    it('$push with buffer doesnt throw error (gh-3890)', function(done) {
      const InfoSchema = new Schema({
        prop: { type: Buffer }
      });

      const ModelASchema = new Schema({
        infoList: { type: [InfoSchema] }
      });

      const ModelA = db.model('gh3890', ModelASchema);

      const propValue = Buffer.from('aa267824dc1796f265ab47870e279780', 'base64');

      const update = {
        $push: {
          info_list: { prop: propValue }
        }
      };

      ModelA.update({}, update, function(error) {
        assert.ifError(error);
        done();
      });
    });

    it('$set with buffer (gh-3961)', function(done) {
      const schema = {
        name: Buffer
      };

      const Model = db.model('gh3961', schema);

      const value = Buffer.from('aa267824dc1796f265ab47870e279780', 'base64');
      const instance = new Model({ name: null });

      instance.save(function(error) {
        assert.ifError(error);
        const query = { _id: instance._id };
        const update = { $set: { name: value } };
        const ok = function() {
          done();
        };
        Model.update(query, update).then(ok, done);
      });
    });

    it('versioning with setDefaultsOnInsert (gh-2593)', function(done) {
      const schema = new Schema({
        num: Number,
        arr: [{ num: Number }]
      });

      const Model = db.model('gh2593', schema);
      const update = { $inc: { num: 1 }, $push: { arr: { num: 5 } } };
      const options = {
        upsert: true,
        setDefaultsOnInsert: true,
        new: true,
        runValidators: true
      };
      Model.update({}, update, options, function(error) {
        assert.ifError(error);
        done();
      });
    });

    it('updates with timestamps with $set (gh-4989) (gh-7152)', function() {
      const TagSchema = new Schema({
        name: String,
        tags: [String]
      }, { timestamps: true });

      const Tag = db.model('gh4989', TagSchema);

      return co(function*() {
        yield Tag.create({ name: 'test' });

        // Test update()
        let start = Date.now();
        yield cb => setTimeout(() => cb(), 10);

        yield Tag.update({}, { $set: { tags: ['test1'] } });

        let tag = yield Tag.findOne();
        assert.ok(tag.updatedAt.valueOf() > start);

        // Test updateOne()
        start = Date.now();
        yield cb => setTimeout(() => cb(), 10);

        yield Tag.updateOne({}, { $set: { tags: ['test1'] } });

        tag = yield Tag.findOne();
        assert.ok(tag.updatedAt.valueOf() > start);

        // Test updateMany()
        start = Date.now();
        yield cb => setTimeout(() => cb(), 10);

        yield Tag.updateMany({}, { $set: { tags: ['test1'] } });

        tag = yield Tag.findOne();
        assert.ok(tag.updatedAt.valueOf() > start);

        // Test replaceOne
        start = Date.now();
        yield cb => setTimeout(() => cb(), 10);

        yield Tag.replaceOne({}, { name: 'test', tags: ['test1'] });

        tag = yield Tag.findOne();
        assert.ok(tag.createdAt.valueOf() > start);
        assert.ok(tag.updatedAt.valueOf() > start);
      });
    });

    it('lets $currentDate go through with updatedAt (gh-5222)', function(done) {
      const testSchema = new Schema({
        name: String
      }, { timestamps: true });

      const Test = db.model('gh5222', testSchema);

      Test.create({ name: 'test' }, function(error) {
        assert.ifError(error);
        const u = { $currentDate: { updatedAt: true }, name: 'test2' };
        Test.update({}, u, function(error) {
          assert.ifError(error);
          done();
        });
      });
    });

    it('update validators on single nested (gh-4332)', function(done) {
      const AreaSchema = new Schema({
        a: String
      });

      const CompanySchema = new Schema({
        area: {
          type: AreaSchema,
          validate: {
            validator: function() {
              return false;
            },
            message: 'Not valid Area'
          }
        }
      });

      const Company = mongoose.model('Company', CompanySchema);

      const update = {
        area: {
          a: 'Helo'
        }
      };

      const opts = {
        runValidators: true
      };

      Company.update({}, update, opts, function(error) {
        assert.ok(error);
        assert.equal(error.errors['area'].message, 'Not valid Area');
        done();
      });
    });

    it('updates child schema timestamps with $push (gh-4049)', function(done) {
      const opts = {
        timestamps: true,
        toObject: {
          virtuals: true
        },
        toJSON: {
          virtuals: true
        }
      };

      const childSchema = new mongoose.Schema({
        senderId: { type: String }
      }, opts);

      const parentSchema = new mongoose.Schema({
        children: [childSchema]
      }, opts);

      const Parent = db.model('gh4049', parentSchema);

      const b2 = new Parent();
      b2.save(function(err, doc) {
        const query = { _id: doc._id };
        const update = { $push: { children: { senderId: '234' } } };
        const opts = { 'new': true };
        Parent.findOneAndUpdate(query, update, opts).exec(function(error, res) {
          assert.ifError(error);
          assert.equal(res.children.length, 1);
          assert.equal(res.children[0].senderId, '234');
          assert.ok(res.children[0].createdAt);
          assert.ok(res.children[0].updatedAt);
          done();
        });
      });
    });

    it('updates child schema timestamps with $set (gh-4049)', function(done) {
      const opts = {
        timestamps: true,
        toObject: {
          virtuals: true
        },
        toJSON: {
          virtuals: true
        }
      };

      const childSchema = new mongoose.Schema({
        senderId: { type: String }
      }, opts);

      const parentSchema = new mongoose.Schema({
        children: [childSchema],
        child: childSchema
      }, opts);

      const Parent = db.model('gh4049_0', parentSchema);

      const b2 = new Parent();
      b2.save(function(err, doc) {
        const query = { _id: doc._id };
        const update = {
          $set: {
            children: [{ senderId: '234' }],
            child: { senderId: '567' }
          }
        };
        const opts = { 'new': true };
        Parent.findOneAndUpdate(query, update, opts).exec(function(error, res) {
          assert.ifError(error);
          assert.equal(res.children.length, 1);
          assert.equal(res.children[0].senderId, '234');
          assert.ok(res.children[0].createdAt);
          assert.ok(res.children[0].updatedAt);

          assert.ok(res.child.createdAt);
          assert.ok(res.child.updatedAt);
          done();
        });
      });
    });

    it('handles positional operator with timestamps (gh-4418)', function(done) {
      const schema = new Schema({
        thing: [{
          thing2: { type: String },
          test: String
        }]
      }, { timestamps: true });

      const Model = db.model('gh4418', schema);
      const query = { 'thing.thing2': 'test' };
      const update = { $set: { 'thing.$.test': 'test' } };
      Model.update(query, update, function(error) {
        assert.ifError(error);
        done();
      });
    });

    it('push with timestamps (gh-4514)', function(done) {
      const sampleSchema = new mongoose.Schema({
        sampleArray: [{
          values: [String]
        }]
      }, { timestamps: true });

      const sampleModel = db.model('gh4514', sampleSchema);
      const newRecord = new sampleModel({
        sampleArray: [{ values: ['record1'] }]
      });

      newRecord.save(function(err) {
        assert.ifError(err);
        sampleModel.update({ 'sampleArray.values': 'record1' }, {
          $push: { 'sampleArray.$.values': 'another record' }
        },
        { runValidators: true },
        function(err) {
          assert.ifError(err);
          done();
        });
      });
    });

    it('addToSet (gh-4953)', function(done) {
      const childSchema = new mongoose.Schema({
        name: {
          type: String,
          required: true
        },
        lastName: {
          type: String,
          required: true
        }
      });

      const parentSchema = new mongoose.Schema({
        children: [childSchema]
      });

      const Model = db.model('gh4953', parentSchema);

      const update = {
        $addToSet: { children: { name: 'Test' } }
      };
      const opts = { new: true, runValidators: true };
      Model.findOneAndUpdate({}, update, opts, function(error) {
        assert.ok(error);
        assert.ok(error.errors['children']);
        done();
      });
    });

    it('overwrite with timestamps (gh-4054)', function(done) {
      const testSchema = new Schema({
        user: String,
        something: Number
      }, { timestamps: true });

      const TestModel = db.model('gh4054', testSchema);
      const options = { overwrite: true, upsert: true };
      const update = {
        user: 'John',
        something: 1
      };

      TestModel.update({ user: 'test' }, update, options, function(error) {
        assert.ifError(error);
        TestModel.findOne({}, function(error, doc) {
          assert.ifError(error);
          assert.ok(doc.createdAt);
          assert.ok(doc.updatedAt);
          done();
        });
      });
    });

    it('update with buffer and exec (gh-4609)', function(done) {
      const arrSchema = new Schema({
        ip: mongoose.SchemaTypes.Buffer
      });
      const schema = new Schema({
        arr: [arrSchema]
      });

      const M = db.model('gh4609', schema);

      const m = new M({ arr: [{ ip: Buffer.alloc(1) }] });
      m.save(function(error, m) {
        assert.ifError(error);
        m.update({ $push: { arr: { ip: Buffer.alloc(1) } } }).exec(function(error) {
          assert.ifError(error);
          done();
        });
      });
    });

    it('update handles casting with mongoose-long (gh-4283)', function(done) {
      require('mongoose-long')(mongoose);

      const Model = db.model('gh4283', {
        number: { type: mongoose.Types.Long }
      });

      Model.create({ number: mongoose.mongo.Long.fromString('0') }, function(error) {
        assert.ifError(error);
        Model.update({}, { $inc: { number: mongoose.mongo.Long.fromString('2147483648') } }, function(error) {
          assert.ifError(error);
          Model.findOne({ number: { $type: 18 } }, function(error, doc) {
            assert.ifError(error);
            assert.ok(doc);
            done();
          });
        });
      });
    });

    it('single nested with runValidators (gh-4420)', function(done) {
      const FileSchema = new Schema({
        name: String
      });

      const CompanySchema = new Schema({
        name: String,
        file: FileSchema
      });

      const Company = db.model('Company', CompanySchema);

      Company.create({ name: 'Booster Fuels' }, function(error) {
        assert.ifError(error);
        const update = { file: { name: 'new-name' } };
        const options = { runValidators: true };
        Company.update({}, update, options, function(error) {
          assert.ifError(error);
          done();
        });
      });
    });

    it('single nested under doc array with runValidators (gh-4960)', function(done) {
      const ProductSchema = new Schema({
        name: String
      });

      const UserSchema = new Schema({
        sell: [{
          product: { type: ProductSchema, required: true }
        }]
      });

      const User = db.model('gh4960', UserSchema);

      User.create({}).
        then(function(user) {
          return User.update({
            _id: user._id
          }, {
            sell: [{
              product: {
                name: 'Product 1'
              }
            }]
          }, {
            runValidators: true
          });
        }).
        // Should not throw
        then(function() {
          done();
        }).
        catch(done);
    });

    it('single nested schema with geo (gh-4465)', function(done) {
      const addressSchema = new Schema({
        geo: {type: [Number], index: '2dsphere'}
      }, { _id : false });
      const containerSchema = new Schema({ address: addressSchema });
      const Container = db.model('gh4465', containerSchema);

      Container.update({}, { address: { geo: [-120.24, 39.21] } }).
        exec(function(error) {
          assert.ifError(error);
          done();
        });
    });

    it('runs validation on Mixed properties of embedded arrays during updates (gh-4441)', function(done) {
      const A = new Schema({ str: {} });
      let validateCalls = 0;
      A.path('str').validate(function() {
        ++validateCalls;
        return true;
      });

      let B = new Schema({a: [A]});

      B = db.model('b', B);

      B.findOneAndUpdate(
        {foo: 'bar'},
        {$set: {a: [{str: {somekey: 'someval'}}]}},
        {runValidators: true},
        function(err) {
          assert.ifError(err);
          assert.equal(validateCalls, 1);
          done();
        }
      );
    });

    it('updating single nested doc property casts correctly (gh-4655)', function(done) {
      const FileSchema = new Schema({});

      const ProfileSchema = new Schema({
        images: [FileSchema],
        rules: {
          hours: {
            begin: Date,
            end: Date
          }
        }
      });

      const UserSchema = new Schema({
        email: { type: String },
        profiles: [ProfileSchema]
      });


      const User = db.model('gh4655', UserSchema);

      User.create({ profiles: [] }, function(error, user) {
        assert.ifError(error);
        User.update({ _id: user._id }, {$set: {'profiles.0.rules': {}}}).
          exec(function(error) {
            assert.ifError(error);
            User.findOne({ _id: user._id }).lean().exec(function(error, doc) {
              assert.ifError(error);
              assert.deepEqual(doc.profiles[0], { rules: {} });
              done();
            });
          });
      });
    });

    it('with overwrite and upsert (gh-4749) (gh-5631)', function(done) {
      const schema = new Schema({
        name: String,
        meta: { age: { type: Number } }
      });
      const User = db.model('gh4749', schema);

      const filter = { name: 'Bar' };
      const update = { name: 'Bar', meta: { age: 33 } };
      const options = { overwrite: true, upsert: true };
      const q2 = User.update(filter, update, options);
      assert.deepEqual(q2.getUpdate(), {
        __v: 0,
        meta: { age: 33 },
        name: 'Bar'
      });

      const q3 = User.findOneAndUpdate(filter, update, options);
      assert.deepEqual(q3.getUpdate(), {
        __v: 0,
        meta: { age: 33 },
        name: 'Bar'
      });

      done();
    });

    it('findOneAndUpdate with nested arrays (gh-5032)', function(done) {
      const schema = Schema({
        name: String,
        inputs: [ [ String ] ] // Array of Arrays of Strings
      });

      const Activity = db.model('Test', schema);

      const q = { name: 'Host Discovery' };
      const u = { inputs: [['ipRange']] };
      const o = { upsert: true };
      Activity.findOneAndUpdate(q, u, o).exec(function(error) {
        assert.ifError(error);
        done();
      });
    });

    it('findOneAndUpdate with timestamps (gh-5045)', function(done) {
      const schema = new Schema({
        username: String,
        isDeleted: Boolean
      }, { timestamps: true });
      const User = db.model('gh5045', schema);

      User.findOneAndUpdate(
        { username: 'test', isDeleted: false },
        { createdAt: '2017-03-06T14:08:59+00:00' },
        { new: true, setDefaultsOnInsert: true, upsert: true },
        function(error) {
          assert.ifError(error);
          User.update({ username: 'test' }, { createdAt: new Date() }).
            exec(function(error) {
              assert.ifError(error);
              done();
            });
        });
    });

    it('doesnt double-call setters when updating an array (gh-5041)', function(done) {
      let called = 0;
      const UserSchema = new Schema({
        name: String,
        foos: [{
          _id: false,
          foo: {
            type: Number,
            get: function(val) {
              return val.toString();
            },
            set: function(val) {
              ++called;
              return val;
            }
          }
        }]
      });

      const User = db.model('gh5041', UserSchema);

      User.findOneAndUpdate({}, { foos: [{ foo: '13.57' }] }, function(error) {
        assert.ifError(error);
        assert.equal(called, 1);
        done();
      });
    });

    it('overwrite doc with update validators (gh-3556)', function(done) {
      const testSchema = new Schema({
        name: {
          type: String,
          required: true
        },
        otherName: String
      });
      const Test = db.model('gh3556', testSchema);

      const opts = { overwrite: true, runValidators: true };
      Test.update({}, { otherName: 'test' }, opts, function(error) {
        assert.ok(error);
        assert.ok(error.errors['name']);
        Test.update({}, { $set: { otherName: 'test' } }, opts, function(error) {
          assert.ifError(error);
          done();
        });
      });
    });

    it('does not fail if passing whole doc (gh-5088)', function(done) {
      const schema = new Schema({
        username: String,
        x: String
      }, { timestamps: true });
      const User = db.model('gh5088', schema);

      User.create({ username: 'test' }).
        then(function(user) {
          user.x = 'test2';
          return User.findOneAndUpdate({ _id: user._id }, user,
            { new: true });
        }).
        then(function(user) {
          assert.equal(user.x, 'test2');
          done();
        }).
        catch(done);
    });

    it('does not fail if passing whole doc (gh-5111)', function(done) {
      const schema = new Schema({
        fieldOne: String
      }, { strict: true });
      const Test = db.model('gh5111', schema);

      Test.create({ fieldOne: 'Test' }).
        then(function() {
          const data = { fieldOne: 'Test2', fieldTwo: 'Test3' };
          const opts = {
            upsert: true,
            runValidators: false,
            strict: false
          };
          return Test.update({}, data, opts);
        }).
        then(function() {
          return Test.findOne();
        }).
        then(function(doc) {
          assert.equal(doc.fieldOne, 'Test2');
          assert.equal(doc.get('fieldTwo'), 'Test3');
          done();
        }).
        catch(done);
    });

    it('$pullAll with null (gh-5164)', function() {
      const schema = new Schema({
        name: String,
        arr: [{ name: String }]
      }, { strict: true });
      const Test = db.model('gh5164', schema);

      const doc = new Test({ name: 'Test', arr: [null, {name: 'abc'}] });

      return doc.save().
        then(function(doc) {
          return Test.update({ _id: doc._id }, {
            $pullAll: { arr: [null] }
          });
        }).
        then(function() {
          return Test.findById(doc);
        }).
        then(function(doc) {
          assert.equal(doc.arr.length, 1);
          assert.equal(doc.arr[0].name, 'abc');
        });
    });

    it('$set array (gh-5403)', function(done) {
      const Schema = new mongoose.Schema({
        colors: [{type: String}]
      });

      const Model = db.model('gh5403', Schema);

      Model.create({ colors: ['green'] }).
        then(function() {
          return Model.update({}, { $set: { colors: 'red' } });
        }).
        then(function() {
          return Model.collection.findOne();
        }).
        then(function(doc) {
          assert.deepEqual(doc.colors, ['red']);
          done();
        }).
        catch(done);
    });

    it('doesn\'t skip casting the query on nested arrays (gh-7098)', function() {
      const nestedSchema = new Schema({
        xyz: [[Number]]
      });
      const schema = new Schema({
        xyz: [[{ type: Number }]],
        nested: nestedSchema
      });

      const Model = db.model('gh-7098', schema);

      const test = new Model({
        xyz: [
          [0, 1],
          [2, 3],
          [4, 5]
        ],
        nested: {
          xyz: [
            [0, 1],
            [2, 3],
            [4, 5]
          ],
        }
      });

      const cond = { _id: test._id };
      const update = { $set: { 'xyz.1.0': '200', 'nested.xyz.1.0': '200' } };
      const opts = { new: true };

      return co(function*() {
        let inserted = yield test.save();
        inserted = inserted.toObject();
        assert.deepStrictEqual(inserted.xyz, [[0, 1], [2, 3], [4, 5]]);
        assert.deepStrictEqual(inserted.nested.xyz, [[0, 1], [2, 3], [4, 5]]);
        let updated = yield Model.findOneAndUpdate(cond, update, opts);
        updated = updated.toObject();
        assert.deepStrictEqual(updated.xyz, [[0, 1], [200, 3], [4, 5]]);
        assert.deepStrictEqual(updated.nested.xyz, [[0, 1], [200, 3], [4, 5]]);
      });
    });

    it('defaults with overwrite and no update validators (gh-5384)', function(done) {
      const testSchema = new mongoose.Schema({
        name: String,
        something: { type: Number, default: 2 }
      });

      const TestModel = db.model('gh5384', testSchema);
      const options = {
        overwrite: true,
        upsert: true,
        setDefaultsOnInsert: true
      };

      const update = { name: 'test' };
      TestModel.update({ name: 'a' }, update, options, function(error) {
        assert.ifError(error);
        TestModel.findOne({}, function(error, doc) {
          assert.ifError(error);
          assert.equal(doc.something, 2);
          done();
        });
      });
    });

    it('update validators with nested required (gh-5269)', function(done) {
      const childSchema = new mongoose.Schema({
        d1: {
          type: String,
          required: true
        },
        d2: {
          type: String
        }
      }, { _id: false });

      const parentSchema = new mongoose.Schema({
        d: childSchema
      });

      const Parent = db.model('gh5269', parentSchema);

      Parent.update({}, { d: { d2: 'test' } }, { runValidators: true }, function(error) {
        assert.ok(error);
        assert.ok(error.errors['d']);
        assert.ok(error.errors['d'].message.indexOf('Path `d1` is required') !== -1,
          error.errors['d'].message);
        done();
      });
    });

    it('with setOptions overwrite (gh-5413)', function(done) {
      const schema = new mongoose.Schema({
        _id: String,
        data: String
      }, { timestamps: true });

      const Model = db.model('gh5413', schema);

      Model.
        where({ _id: 'test' }).
        setOptions({ overwrite: true, upsert: true }).
        update({ data: 'test2' }).
        exec().
        then(function() {
          done();
        }).
        catch(done);
    });

    it('$push with updateValidators and top-level doc (gh-5430)', function(done) {
      const notificationSchema = new mongoose.Schema({
        message: String
      });

      const Notification = db.model('gh5430_0', notificationSchema);

      const userSchema = new mongoose.Schema({
        notifications: [notificationSchema]
      });

      const User = db.model('gh5430', userSchema);

      User.update({}, {
        $push: {
          notifications: {
            $each: [new Notification({ message: 'test' })]
          }
        }
      }, { multi: true, runValidators: true }).exec(function(error) {
        assert.ifError(error);
        done();
      });
    });

    it('$pull with updateValidators (gh-5555)', function(done) {
      const notificationSchema = new mongoose.Schema({
        message: {
          type: String,
          maxlength: 12
        }
      });

      const userSchema = new mongoose.Schema({
        notifications: [notificationSchema]
      });

      const User = db.model('gh5555', userSchema);

      const opts = { multi: true, runValidators: true };
      const update = {
        $pull: {
          notifications: {
            message: 'This message is wayyyyyyyyyy too long'
          }
        }
      };
      User.create({ notifications: [{ message: 'test' }] }, function(error, doc) {
        assert.ifError(error);

        User.update({}, update, opts).exec(function(error) {
          assert.ok(error);
          assert.ok(error.errors['notifications.message']);

          update.$pull.notifications.message = 'test';
          User.update({ _id: doc._id }, update, opts).exec(function(error) {
            assert.ifError(error);
            User.findById(doc._id, function(error, doc) {
              assert.ifError(error);
              assert.equal(doc.notifications.length, 0);
              done();
            });
          });
        });
      });
    });

    it('$pull with updateValidators and $in (gh-5744)', function(done) {
      const exampleSchema = mongoose.Schema({
        subdocuments: [{
          name: String
        }]
      });
      const ExampleModel = db.model('gh5744', exampleSchema);
      const exampleDocument = {
        subdocuments: [{ name: 'First' }, { name: 'Second' }]
      };

      ExampleModel.create(exampleDocument, function(error, doc) {
        assert.ifError(error);
        ExampleModel.update({ _id: doc._id }, {
          $pull: {
            subdocuments: {
              _id: { $in: [doc.subdocuments[0]._id] }
            }
          }
        }, { runValidators: true }, function(error) {
          assert.ifError(error);
          ExampleModel.findOne({ _id: doc._id }, function(error, doc) {
            assert.ifError(error);
            assert.equal(doc.subdocuments.length, 1);
            done();
          });
        });
      });
    });

    it('$pull with updateValidators and required array (gh-6341)', function() {
      const RecordingSchema = new Schema({ name: String });

      const ItemSchema = new Schema({
        recordings: {
          type: [RecordingSchema],
          required: true
        }
      });

      const Item = db.model('gh6431', ItemSchema);

      const opts = {
        runValidators: true,
        context: 'query'
      };
      const update = {
        $pull: {
          recordings: {
            _id: '000000000000000000000000'
          }
        }
      };

      // Shouldn't error out
      return Item.findOneAndUpdate({}, update, opts);
    });

    it('update with Decimal type (gh-5361)', function(done) {
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
        const schema = new mongoose.Schema({
          name: String,
          pricing: [{
            _id: false,
            program: String,
            money: mongoose.Schema.Types.Decimal
          }]
        });

        const Person = db.model('gh5361', schema);

        const data = {
          name: 'Jack',
          pricing: [
            { program: 'A', money: mongoose.Types.Decimal128.fromString('1.2') },
            { program: 'B', money: mongoose.Types.Decimal128.fromString('3.4') }
          ]
        };

        Person.create(data).
          then(function() {
            const newData = {
              name: 'Jack',
              pricing: [
                { program: 'A', money: mongoose.Types.Decimal128.fromString('5.6') },
                { program: 'B', money: mongoose.Types.Decimal128.fromString('7.8') }
              ]
            };
            return Person.update({ name: 'Jack' }, newData);
          }).
          then(function() { done(); }, done);
      }
    });

    it('strict false in query (gh-5453)', function(done) {
      const schema = new mongoose.Schema({
        date: { type: Date, required: true }
      }, { strict: true });

      const Model = db.model('gh5453', schema);
      const q = { notInSchema: true };
      const u = { $set: { smth: 1 } };
      const o = { strict: false, upsert: true };
      Model.update(q, u, o).then(function() {
        done();
      }).catch(done);
    });

    it('replaceOne with buffer (gh-6124)', function() {
      const SomeModel = db.model('gh6124', new Schema({
        name: String,
        binaryProp: Buffer
      }));

      const doc = new SomeModel({
        name: 'test',
        binaryProp: Buffer.alloc(255)
      });

      return doc.save().
        then(function() {
          return SomeModel.replaceOne({ name: 'test' }, {
            name: 'test2',
            binaryProp: Buffer.alloc(255)
          }, { upsert: true });
        });
    });

    it('returns error if passing array as conditions (gh-3677)', function(done) {
      const schema = new mongoose.Schema({
        name: String
      });

      const Model = db.model('gh3677', schema);
      Model.updateMany(['foo'], { name: 'bar' }, function(error) {
        assert.ok(error);
        assert.equal(error.name, 'ObjectParameterError');
        const expected = 'Parameter "filter" to updateMany() must be an object';
        assert.ok(error.message.indexOf(expected) !== -1, error.message);
        done();
      });
    });

    it('upsert: 1 (gh-5839)', function(done) {
      const schema = new mongoose.Schema({
        name: String
      });

      const Model = db.model('gh5839', schema);

      const opts = { upsert: 1 };
      Model.update({ name: 'Test' }, { name: 'Test2' }, opts, function(error) {
        assert.ifError(error);
        Model.findOne({}, function(error, doc) {
          assert.ifError(error);
          assert.equal(doc.name, 'Test2');
          done();
        });
      });
    });

    it('casting $addToSet without $each (gh-6086)', function() {
      const schema = new mongoose.Schema({
        numbers: [Number]
      });

      const Model = db.model('gh6086', schema);

      return Model.create({ numbers: [1, 2] }).
        then(function(doc) {
          return Model.findByIdAndUpdate(
            doc._id,
            { $addToSet: { numbers: [3, 4] } },
            { new: true }
          );
        }).
        then(function(doc) {
          return Model.findById(doc._id);
        }).then(function(doc) {
          assert.deepEqual(doc.toObject().numbers, [1, 2, 3, 4]);
        });
    });

    it('doesn\'t add $each when pushing an array into an array (gh-6768)', function() {
      const schema = new Schema({
        arr: [[String]]
      });

      const Test = db.model('gh6768', schema);

      const test = new Test;

      return co(function*() {
        yield test.save();
        const cond = { _id: test._id };
        const data = ['one', 'two'];
        const update = { $push: { arr: data } };
        const opts = { new: true };
        const doc = yield Test.findOneAndUpdate(cond, update, opts);

        assert.strictEqual(doc.arr.length, 1);
        assert.strictEqual(doc.arr[0][0], 'one');
        assert.strictEqual(doc.arr[0][1], 'two');
      });
    });

    it('casting embedded discriminators if path specified in filter (gh-5841)', function() {
      return co(function*() {
        const sectionSchema = new Schema({ show: Boolean, order: Number },
          { discriminatorKey: 'type', _id: false });

        const siteSchema = new Schema({ sections: [sectionSchema] });
        const sectionArray = siteSchema.path('sections');

        const headerSchema = new Schema({ title: String }, { _id: false });
        sectionArray.discriminator('header', headerSchema);

        const textSchema = new Schema({ text: String }, { _id: false });
        sectionArray.discriminator('text', textSchema);

        const Site = db.model('gh5841', siteSchema);

        let doc = yield Site.create({
          sections: [
            { type: 'header', title: 't1' },
            { type: 'text', text: 'abc' }
          ]
        });

        yield Site.update({ 'sections.type': 'header' }, {
          $set: { 'sections.$.title': 'Test' }
        });

        doc = yield Site.findById(doc._id);
        assert.equal(doc.sections[0].title, 'Test');
      });
    });

    it('update with nested id (gh-5640)', function(done) {
      const testSchema = new mongoose.Schema({
        _id: {
          a: String,
          b: String
        },
        foo: String
      }, {
        strict: true
      });

      const Test = db.model('gh5640', testSchema);

      const doc = {
        _id: {
          a: 'a',
          b: 'b'
        },
        foo: 'bar'
      };

      Test.create(doc, function(error, doc) {
        assert.ifError(error);
        doc.foo = 'baz';
        Test.update({_id: doc._id}, doc, {upsert: true}, function(error) {
          assert.ifError(error);
          Test.findOne({ _id: doc._id }, function(error, doc) {
            assert.ifError(error);
            assert.equal(doc.foo, 'baz');
            done();
          });
        });
      });
    });

    it('$inc cast errors (gh-6770)', function() {
      const testSchema = new mongoose.Schema({ num: Number });
      const Test = db.model('gh6770', testSchema);

      return co(function*() {
        yield Test.create({ num: 1 });

        let threw = false;
        try {
          yield Test.update({}, { $inc: { num: 'not a number' } });
        } catch (error) {
          threw = true;
          assert.ok(error instanceof CastError);
          assert.equal(error.path, 'num');
        }
        assert.ok(threw);

        threw = false;
        try {
          yield Test.update({}, { $inc: { num: null } });
        } catch (error) {
          threw = true;
          assert.ok(error instanceof CastError);
          assert.equal(error.path, 'num');
        }
        assert.ok(threw);
      });
    });

    it('does not treat virtuals as an error for strict: throw (gh-6731)', function() {
      const schema = new Schema({
        _id: String,
        total: Number
      }, { strict: 'throw' });

      schema.virtual('capitalGainsTax').get(function() {
        return this.total * 0.15;
      });

      const Test = db.model('gh6731', schema);

      // Shouldn't throw an error because `capitalGainsTax` is a virtual
      return Test.update({}, { total: 10000, capitalGainsTax: 1500 });
    });

    it('cast error in update conditions (gh-5477)', function(done) {
      const schema = new mongoose.Schema({
        name: String
      }, { strict: true });

      const Model = db.model('gh5477', schema);
      const q = { notAField: true };
      const u = { $set: { name: 'Test' } };
      const o = { upsert: true };

      let outstanding = 3;

      Model.update(q, u, o, function(error) {
        assert.ok(error);
        assert.ok(error.message.indexOf('notAField') !== -1, error.message);
        assert.ok(error.message.indexOf('upsert') !== -1, error.message);
        --outstanding || done();
      });

      Model.update(q, u, o, function(error) {
        assert.ok(error);
        assert.ok(error.message.indexOf('notAField') !== -1, error.message);
        assert.ok(error.message.indexOf('upsert') !== -1, error.message);
        --outstanding || done();
      });

      Model.updateMany(q, u, o, function(error) {
        assert.ok(error);
        assert.ok(error.message.indexOf('notAField') !== -1, error.message);
        assert.ok(error.message.indexOf('upsert') !== -1, error.message);
        --outstanding || done();
      });
    });

    it('single embedded schema under document array (gh-4519)', function(done) {
      const PermissionSchema = new mongoose.Schema({
        read: { type: Boolean, required: true },
        write: Boolean
      });
      const UserSchema = new mongoose.Schema({
        permission: {
          type: PermissionSchema
        }
      });
      const GroupSchema = new mongoose.Schema({
        users: [UserSchema]
      });

      const Group = db.model('Group', GroupSchema);
      const update = {
        users:[{
          permission:{}
        }]
      };
      const opts = {
        runValidators: true
      };

      Group.update({}, update, opts, function(error) {
        assert.ok(error);
        assert.ok(error.errors['users.0.permission'], Object.keys(error.errors));
        done();
      });
    });
    it('casts objects to array when clobbering with $set (gh-6532)', function(done) {
      const sub = new Schema({
        x: String
      });

      const schema = new Schema({
        name: String,
        arr: [sub]
      });

      const Test = db.model('gh6532', schema);

      const test = {
        name: 'Xyz',
        arr: [{ x: 'Z' }]
      };

      const cond = { name: 'Xyz' };
      const obj1 = { x: 'Y' };
      const set = { $set: { 'arr': obj1 } };

      Test.create(test).
        then(function() {
          return Test.update(cond, set);
        }).
        then(function() {
          return Test.collection.findOne({});
        }).
        then(function(found) {
          assert.ok(Array.isArray(found.arr));
          assert.strictEqual(found.arr[0].x, 'Y');
          done();
        }).
        catch(done);
    });
  });
});

describe('model: updateOne: ', function() {
  let db;

  before(function() {
    db = start();
  });

  after(function(done) {
    db.close(done);
  });

  it('updating a map (gh-7111)', function() {
    const accountSchema = new Schema({ balance: Number });

    const schema = new Schema({
      accounts: {
        type: Map,
        of: accountSchema
      }
    });

    const Test = db.model('gh7111', schema);

    return co(function*() {
      const doc = yield Test.create({ accounts: { USD: { balance: 345 } } });

      yield Test.updateOne({}, { accounts: { USD: { balance: 8 } } });

      const updated = yield Test.findOne({ _id: doc._id });
      assert.strictEqual(updated.accounts.get('USD').balance, 8);
    });
  });

  it('overwrite an array with empty (gh-7135)', function() {
    const ElementSchema = Schema({
      a: { type: String, required: true }
    }, { _id: false });
    const ArraySchema = Schema({ anArray: [ElementSchema] });

    const TestModel = db.model('gh7135', ArraySchema);

    return co(function*() {
      let err = yield TestModel.
        updateOne({}, { $set: { anArray: [{}] } }, { runValidators: true }).
        then(() => null, err => err);

      assert.ok(err);
      assert.ok(err.errors['anArray.0.a']);

      err = yield TestModel.
        updateOne({}, { $set: { 'anArray.0': {} } }, { runValidators: true }).
        then(() => null, err => err);
      assert.ok(err);
      assert.ok(err.errors['anArray.0.a']);
    });
  });

  it('sets child timestamps even without $set (gh-7261)', function() {
    const childSchema = new Schema({ name: String }, { timestamps: true });
    const parentSchema = new Schema({ child: childSchema });
    const Parent = db.model('gh7261', parentSchema);

    return co(function*() {
      yield Parent.create({ child: { name: 'Luke Skywalker' } });

      const now = Date.now();
      yield cb => setTimeout(cb, 10);

      yield Parent.updateOne({}, { child: { name: 'Luke Skywalker' } });

      const doc = yield Parent.findOne();

      assert.ok(doc.child.createdAt.valueOf() >= now);
      assert.ok(doc.child.updatedAt.valueOf() >= now);
    });
  });

  it('supports discriminators if key is specified in conditions (gh-7843)', function() {
    const testSchema = new mongoose.Schema({
      title: { type: String, required: true },
      kind: { type: String, required: true }
    }, { discriminatorKey: 'kind' });

    const Test = db.model('gh7843', testSchema);

    const testSchemaChild = new mongoose.Schema({
      label: String
    });

    Test.discriminator('gh7843_child', testSchemaChild, 'testchild');

    const filter = { label: 'bar', kind: 'testchild' };
    const update = { label: 'updated' };
    return Test.create({ title: 'foo', kind: 'testchild', label: 'bar' }).
      then(() => Test.updateOne(filter, update)).
      then(() => Test.collection.findOne()).
      then(doc => assert.equal(doc.label, 'updated'));
  });

  it('immutable createdAt (gh-7917)', function() {
    const start = new Date().valueOf();
    const schema = Schema({
      createdAt: {
        type: mongoose.Schema.Types.Date,
        immutable: true
      },
      name: String
    }, { timestamps: true });

    const Model = db.model('gh7917', schema);

    return co(function*() {
      yield Model.updateOne({}, { name: 'foo' }, { upsert: true });

      const doc = yield Model.collection.findOne();
      assert.ok(doc.createdAt.valueOf() >= start);
    });
  });

  it('conditional immutable (gh-8001)', function() {
    const schema = Schema({
      test: {
        type: String,
        immutable: ctx => {
          return ctx.getQuery().name != null;
        }
      },
      name: String
    }, { timestamps: true });

    const Model = db.model('gh8001', schema);

    return co(function*() {
      yield Model.updateOne({}, { test: 'before', name: 'foo' }, { upsert: true });
      let doc = yield Model.collection.findOne();
      assert.equal(doc.test, 'before');

      yield Model.updateOne({ name: 'foo' }, { test: 'after' }, { upsert: true });
      doc = yield Model.collection.findOne();
      assert.equal(doc.test, 'before');

      yield Model.updateOne({}, { test: 'after' }, { upsert: true });
      doc = yield Model.collection.findOne();
      assert.equal(doc.test, 'after');
    });
  });

  it('allow $pull with non-existent schema field (gh-8166)', function() {
    const Model = db.model('gh8166', Schema({
      name: String,
      arr: [{
        status: String,
        values: [{ text: String }]
      }]
    }));

    return co(function*() {
      yield Model.collection.insertMany([
        {
          name: 'a',
          arr: [{ values: [{ text: '123' }] }]
        },
        {
          name: 'b',
          arr: [{ values: [{ text: '123', coords: 'test' }] }]
        }
      ]);

      yield Model.updateMany({}, {
        $pull: { arr: { 'values.0.coords': { $exists: false } } }
      });

      const docs = yield Model.find().sort({ name: 1 });
      assert.equal(docs[0].name, 'a');
      assert.equal(docs[0].arr.length, 0);
      assert.equal(docs[1].name, 'b');
      assert.equal(docs[1].arr.length, 1);
    });
  });

  it('update embedded discriminator path if key in $elemMatch (gh-8063)', function() {
    const slideSchema = new Schema({
      type: { type: String },
      commonField: String
    }, { discriminatorKey: 'type' });
    const schema = new Schema({ slides: [slideSchema] });

    const slidesSchema = schema.path('slides');
    slidesSchema.discriminator('typeA', new Schema({ a: String }));
    slidesSchema.discriminator('typeB', new Schema({ b: String }));

    const MyModel = db.model('gh8063', schema);
    return co(function*() {
      const doc = yield MyModel.create({
        slides: [{ type: 'typeA', a: 'oldValue1', commonField: 'oldValue2' }]
      });

      const filter = {
        slides: { $elemMatch: { _id: doc.slides[0]._id, type: 'typeA' } }
      };
      const update = {
        'slides.$.a': 'newValue1',
        'slides.$.commonField': 'newValue2'
      };
      yield MyModel.updateOne(filter, update);

      const updatedDoc = yield MyModel.findOne();
      assert.equal(updatedDoc.slides.length, 1);
      assert.equal(updatedDoc.slides[0].type, 'typeA');
      assert.equal(updatedDoc.slides[0].a, 'newValue1');
      assert.equal(updatedDoc.slides[0].commonField, 'newValue2');
    });
  });
});