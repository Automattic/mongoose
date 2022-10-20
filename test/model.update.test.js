'use strict';

/**
 * Test dependencies.
 */

const start = require('./common');

const assert = require('assert');
const util = require('./util');

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
  let db;

  before(function() {
    db = start();
  });

  beforeEach(function() {
    Comments = new Schema({});

    Comments.add({
      title: String,
      date: Date,
      body: String,
      comments: [Comments]
    });

    const schema = new Schema({
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
    }, { strict: false });

    schema.virtual('titleWithAuthor')
      .get(function() {
        return this.get('title') + ' by ' + this.get('author');
      })
      .set(function(val) {
        const split = val.split(' by ');
        this.set('title', split[0]);
        this.set('author', split[1]);
      });

    schema.method('cool', function() {
      return this;
    });

    schema.static('woot', function() {
      return this;
    });

    BlogPost = db.model('BlogPost', schema);
  });

  after(async function() {
    await db.close();
  });

  beforeEach(function() {
    id0 = new DocumentObjectId();
    id1 = new DocumentObjectId();

    post = new BlogPost();
    post.set('title', title);
    post.author = author;
    post.meta.visitors = 0;
    post.date = new Date();
    post.published = true;
    post.mixed = { x: 'ex' };
    post.numbers = [4, 5, 6, 7];
    post.owners = [id0, id1];
    post.comments = [{ body: 'been there' }, { body: 'done that' }];

    return post.save();
  });

  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => util.clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  it('works', function(done) {
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
        $inc: { 'meta.visitors': 2 },
        $set: { date: new Date() },
        published: false, // becomes $set
        mixed: { x: 'ECKS', y: 'why' }, // $set
        $pullAll: { numbers: [4, 6] },
        $pull: { owners: id0 },
        'comments.1.body': 8 // $set
      };

      BlogPost.update({ title: title }, update, function(err) {
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

          BlogPost.update({ _id: post._id }, update2, function(err) {
            assert.ok(err);
            assert.ok(err.message.length > 0);
            BlogPost.findById(post, function(err) {
              assert.ifError(err);

              const update3 = {
                $pull: 'fail'
              };

              BlogPost.update({ _id: post._id }, update3, function(err) {
                assert.ok(err);

                assert.ok(/Invalid atomic update value for \$pull\. Expected an object, received string/.test(err.message));

                const update4 = {
                  $inc: { idontexist: 1 }
                };

                // should not overwrite doc when no valid paths are submitted
                BlogPost.update({ _id: post._id }, update4, function(err) {
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
    const update = {
      comments: [{ body: 'worked great' }],
      $set: { 'numbers.1': 100 },
      $inc: { idontexist: 1 }
    };

    BlogPost.update({ _id: post._id }, update, function(err) {
      assert.ifError(err);

      // get the underlying doc
      BlogPost.collection.findOne({ _id: post._id }, function(err, doc) {
        assert.ifError(err);

        const up = new BlogPost();
        up.init(doc);
        assert.equal(up.comments.length, 1);
        assert.equal(up.comments[0].body, 'worked great');
        assert.strictEqual(true, !!doc.comments[0]._id);

        done();
      });
    });
  });

  it('makes copy of conditions and update options', function(done) {
    const conditions = { _id: post._id.toString() };
    const update = { $set: { some_attrib: post._id.toString() } };
    BlogPost.update(conditions, update, function(err) {
      assert.ifError(err);
      assert.equal(typeof conditions._id, 'string');
      done();
    });
  });

  it('$addToSet with $ (gh-479)', function(done) {
    function a() {
    }

    a.prototype.toString = function() {
      return 'MongoDB++';
    };
    const crazy = new a();

    const update = {
      $addToSet: { 'comments.$.comments': { body: 'The Ring Of Power' } },
      $set: { 'comments.$.title': crazy }
    };

    BlogPost.update({ _id: post._id, 'comments.body': 'been there' }, update, function(err) {
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
    let last;

    beforeEach(function(done) {
      BlogPost.findOne({ 'owners.1': { $exists: true } }, function(error, doc) {
        assert.ifError(error);
        last = doc;
        done();
      });
    });

    it('handles date casting (gh-479)', function(done) {
      const update = {
        $inc: { 'comments.$.newprop': '1' },
        $set: { date: (new Date()).getTime() } // check for single val casting
      };

      BlogPost.update({ _id: post._id, 'comments.body': 'been there' }, update, { strict: false }, function(err) {
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
      assert.ok(owner);
      const numOwners = last.owners.length;
      const update = {
        $addToSet: { owners: owner }
      };

      BlogPost.update({ _id: last._id }, update, function(err) {
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
      const newowner = new DocumentObjectId();
      const numOwners = post.owners.length;

      const update = {
        $addToSet: { owners: { $each: [owner, newowner] } }
      };

      BlogPost.update({ _id: post._id }, update, function(err) {
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
        $pop: { owners: -1 },
        $unset: { title: 1 }
      };

      BlogPost.update({ _id: post._id }, update, function(err) {
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
    const update = {
      $set: {
        'comments.0.comments.0.date': '11/5/2011',
        'comments.1.body': 9000
      }
    };

    BlogPost.update({ _id: post._id }, update, function(err) {
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
    BlogPost.findById(post, function(err, doc) {
      assert.ifError(err);

      const update = {
        $pull: { comments: { _id: doc.comments[0].id } }
      };

      BlogPost.update({ _id: post._id }, update, function(err) {
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
    const update = {
      $pull: { comments: { body: { $in: ['been there'] } } }
    };

    BlogPost.update({ _id: post._id }, update, function(err) {
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
    BlogPost.findById(post, function(err, doc) {
      assert.ifError(err);

      doc.comments.push({ body: 'hi' }, { body: 'there' });
      doc.save(function(err) {
        assert.ifError(err);
        BlogPost.findById(doc, function(err, ret) {
          assert.ifError(err);
          assert.equal(ret.comments.length, 4);

          const update = {
            $pull: { comments: { body: { $nin: ['there'] } } }
          };

          BlogPost.update({ _id: ret._id }, update, function(err) {
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
    let totalDocs = 4;

    const post = new BlogPost();
    post.set('meta.visitors', 5);

    function complete() {
      BlogPost.findOne({ _id: post.get('_id') }, function(err, doc) {
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
          .update({ _id: post._id }, { $inc: { 'meta.visitors': 1 } }, callback);
      }
    });
  });

  it('passes number of affected docs', async function() {
    await BlogPost.deleteMany({});
    await BlogPost.create({ title: 'one' }, { title: 'two' }, { title: 'three' });

    const res = await BlogPost.updateMany({}, { title: 'newtitle' });
    assert.equal(res.modifiedCount, 3);
  });

  it('updates a number to null (gh-640)', function(done) {
    const B = BlogPost;
    const b = new B({ meta: { visitors: null } });
    b.save(function(err) {
      assert.ifError(err);
      B.findById(b, function(err, b) {
        assert.ifError(err);
        assert.strictEqual(b.meta.visitors, null);

        B.update({ _id: b._id }, { meta: { visitors: null } }, function(err) {
          assert.strictEqual(null, err);
          done();
        });
      });
    });
  });

  it('handles $pull from Mixed arrays (gh-735)', function(done) {
    const schema = new Schema({ comments: [] });
    const M = db.model('Test', schema);
    M.create({ comments: [{ name: 'node 0.8' }] }, function(err, doc) {
      assert.ifError(err);
      M.update({ _id: doc._id }, { $pull: { comments: { name: 'node 0.8' } } }, function(err, affected) {
        assert.ifError(err);
        assert.equal(affected.modifiedCount, 1);
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

    const Project = db.model('Test', projectSchema);

    Project.create({ name: 'my project' }, function(err, project) {
      assert.ifError(err);
      const pid = project.id;
      const comp = project.components.create({ name: 'component' });
      Project.update({ _id: pid }, { $push: { components: comp } }, function(err) {
        assert.ifError(err);
        const task = comp.tasks.create({ name: 'my task' });
        Project.update({ _id: pid, 'components._id': comp._id }, { $push: { 'components.$.tasks': task } }, function(err) {
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
    const schema = new Schema({ counts: Schema.Types.Mixed });
    const M = db.model('Test', schema);
    M.create({ counts: {} }, function(err, m) {
      assert.ifError(err);
      M.update({}, { $inc: { 'counts.1': 1, 'counts.1a': 10 } }, function(err) {
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
    const so = new Schema({ title: String, obj: [String] });
    const Some = db.model('Test', so);

    Some.create({ obj: ['a', 'b', 'c'] }, function(err, s) {
      assert.ifError(err);

      Some.update({ _id: s._id, obj: 'b' }, { $set: { 'obj.$': 2 } }, function(err) {
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
    const so = new Schema({ num: Number });
    const Some = db.model('Test', so);

    Some.create([{ num: 1 }, { num: 1 }], function(err, docs) {
      assert.ifError(err);
      assert.equal(docs.length, 2);
      const doc0 = docs[0];
      const doc1 = docs[1];
      const sId0 = doc0._id;
      const sId1 = doc1._id;
      Some.where({ _id: sId0 }).updateOne({}, { $set: { num: '99' } }, { multi: true }, function(err, cnt) {
        assert.ifError(err);
        assert.equal(cnt.modifiedCount, 1);
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

    before(async function() {
      const version = await start.mongodVersion();

      mongo24_or_greater = version[0] > 2 || (version[0] === 2 && version[1] >= 4);
    });

    it('$setOnInsert operator', function(done) {
      if (!mongo24_or_greater) {
        console.log('not testing mongodb 2.4 $setOnInsert feature');
        return done();
      }

      const schema = new Schema({ name: String, age: Number, x: String });
      const M = db.model('Test', schema);

      const match = { name: 'set on insert' };
      const op = { $setOnInsert: { age: '47' }, x: 'inserted' };
      M.update(match, op, { upsert: true }, function(err) {
        assert.ifError(err);
        M.findOne(function(err, doc) {
          assert.ifError(err);
          assert.equal(doc.age, 47);
          assert.equal(doc.name, 'set on insert');

          const match = { name: 'set on insert' };
          const op = { $setOnInsert: { age: 108 }, name: 'changed' };
          M.update(match, op, { upsert: true }, function(err) {
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

      const schema = new Schema({ name: String, n: [{ x: Number }] });
      const M = db.model('Test', schema);

      M.create({ name: '2.4' }, function(err, created) {
        assert.ifError(err);

        let op = {
          $push: {
            n: {
              $each: [{ x: 10 }, { x: 4 }, { x: 1 }],
              $slice: '-1',
              $sort: { x: 1 }
            }
          }
        };

        M.update({ _id: created._id }, op, function(err) {
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
            M.update({ _id: created._id }, op, function(err) {
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

    before(async function() {
      const version = await start.mongodVersion();

      mongo26_or_greater = version[0] > 2 || (version[0] === 2 && version[1] >= 6);
    });

    it('supports $position', function(done) {
      if (!mongo26_or_greater) {
        return done();
      }

      const schema = new Schema({ name: String, n: [{ x: Number }] });
      const M = db.model('Test', schema);

      const m = new M({ name: '2.6', n: [{ x: 0 }] });
      m.save(function(error, m) {
        assert.ifError(error);
        assert.equal(m.n.length, 1);
        M.updateOne(
          { name: '2.6' },
          { $push: { n: { $each: [{ x: 2 }, { x: 1 }], $position: 0 } } },
          function(error) {
            assert.ifError(error);
            M.findOne({ name: '2.6' }, function(error, m) {
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

      const schema = new Schema({ name: String, lastModified: Date, lastModifiedTS: Date });
      const M = db.model('Test', schema);

      const m = new M({ name: '2.6' });
      m.save(function(error) {
        assert.ifError(error);
        const before = Date.now();
        M.update(
          { name: '2.6' },
          { $currentDate: { lastModified: true, lastModifiedTS: { $type: 'timestamp' } } },
          function(error) {
            assert.ifError(error);
            M.findOne({ name: '2.6' }, function(error, m) {
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

  it('casts empty arrays', function(done) {
    const so = new Schema({ arr: [] });
    const Some = db.model('Test', so);

    Some.create({ arr: ['a'] }, function(err, s) {
      if (err) {
        return done(err);
      }

      Some.update({ _id: s._id }, { arr: [] }, function(err) {
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
      const s = new Schema({ topping: { type: String, default: 'bacon' }, base: String });
      const Breakfast = db.model('Test', s);
      const updateOptions = { upsert: true };
      Breakfast.update({}, { base: 'eggs' }, updateOptions, function(error) {
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

      const Parent = db.model('Parent', ParentSchema);

      const newDoc = {
        _id: new mongoose.Types.ObjectId(),
        embedded: null
      };

      const opts = { upsert: true };

      Parent.
        findOneAndUpdate({ _id: newDoc._id }, newDoc, opts).
        then(function() { done(); }).
        catch(done);
    });

    it('doesnt set default on upsert if query sets it', function(done) {
      const s = new Schema({ topping: { type: String, default: 'bacon' }, base: String });
      const Breakfast = db.model('Test', s);

      const updateOptions = { upsert: true };
      Breakfast.update({ topping: 'sausage' }, { base: 'eggs' }, updateOptions, function(error) {
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
      const s = new Schema({ topping: { type: String, default: 'bacon' }, base: String });
      const Breakfast = db.model('Test', s);

      const updateOptions = { upsert: true };
      Breakfast.update({ topping: { $ne: 'sausage' } }, { base: 'eggs' }, updateOptions, function(error) {
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

      const M = db.model('Test', schema);

      const opts = { upsert: true };
      M.update({}, {}, opts, function(error) {
        assert.ifError(error);
        M.findOne({}, function(error, doc) {
          assert.ifError(error);
          assert.deepEqual(doc.toObject().arr, [{ name: 'Val' }]);
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
      const Breakfast = db.model('Test', s);

      const updateOptions = { upsert: true, runValidators: true };
      Breakfast.update({}, { topping: 'bacon', base: 'eggs' }, updateOptions, function(error) {
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
        steak: { type: String, required: true },
        eggs: {
          type: String,
          validate: function() {
            assert.ok(this instanceof require('../').Query);
            return false;
          }
        }
      });
      const Breakfast = db.model('Test', s);

      const updateOptions = { runValidators: true };
      Breakfast.update({}, { $unset: { steak: '' }, $setOnInsert: { eggs: 'softboiled' } }, updateOptions, function(error) {
        assert.ok(!!error);
        assert.equal(Object.keys(error.errors).length, 2);
        assert.ok(Object.keys(error.errors).indexOf('eggs') !== -1);
        assert.ok(Object.keys(error.errors).indexOf('steak') !== -1);
        assert.equal(error.errors.eggs.message, 'Validator failed for path `eggs` with value `softboiled`');
        assert.equal(error.errors.steak.message, 'Path `steak` is required.');
        done();
      });
    });

    it('global validators option (gh-6578)', async function() {
      const s = new Schema({
        steak: { type: String, required: true }
      });
      const m = new mongoose.Mongoose();
      const Breakfast = m.model('gh6578', s);

      const updateOptions = { runValidators: true };
      const error = await Breakfast.
        update({}, { $unset: { steak: 1 } }, updateOptions).
        catch(err => err);

      assert.ok(!!error);
      assert.equal(Object.keys(error.errors).length, 1);
      assert.ok(Object.keys(error.errors).indexOf('steak') !== -1);
    });

    it('min/max, enum, and regex built-in validators work', function(done) {
      const s = new Schema({
        steak: { type: String, enum: ['ribeye', 'sirloin'] },
        eggs: { type: Number, min: 4, max: 6 },
        bacon: { type: String, match: /strips/ }
      });
      const Breakfast = db.model('Test', s);

      const updateOptions = { runValidators: true };
      Breakfast.update({}, { $set: { steak: 'ribeye', eggs: 3, bacon: '3 strips' } }, updateOptions, function(error) {
        assert.ok(!!error);
        assert.equal(Object.keys(error.errors).length, 1);
        assert.equal(Object.keys(error.errors)[0], 'eggs');
        assert.equal(error.errors.eggs.message, 'Path `eggs` (3) is less than minimum allowed value (4).');

        Breakfast.update({}, { $set: { steak: 'tofu', eggs: 5, bacon: '3 strips' } }, updateOptions, function(error) {
          assert.ok(!!error);
          assert.equal(Object.keys(error.errors).length, 1);
          assert.equal(Object.keys(error.errors)[0], 'steak');
          assert.equal(error.errors.steak, '`tofu` is not a valid enum value for path `steak`.');

          Breakfast.update({}, { $set: { steak: 'sirloin', eggs: 6, bacon: 'none' } }, updateOptions, function(error) {
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
        steak: { type: String, enum: ['ribeye', 'sirloin'] },
        eggs: { type: Number, min: 4, max: 6 },
        bacon: { type: String, match: /strips/ }
      });
      const Breakfast = db.model('Test', s);

      const updateOptions = { runValidators: true };
      Breakfast.update({}, { $set: { steak: 'tofu', eggs: 2, bacon: '3 strips' } }, updateOptions, function(error) {
        assert.ok(!!error);
        assert.equal(Object.keys(error.errors).length, 2);
        assert.ok(Object.keys(error.errors).indexOf('steak') !== -1);
        assert.ok(Object.keys(error.errors).indexOf('eggs') !== -1);
        done();
      });
    });

    it('validators ignore $inc', function(done) {
      const s = new Schema({
        steak: { type: String, required: true },
        eggs: { type: Number, min: 4 }
      });
      const Breakfast = db.model('Test', s);

      const updateOptions = { runValidators: true };
      Breakfast.update({}, { $inc: { eggs: 1 } }, updateOptions, function(error) {
        assert.ifError(error);
        done();
      });
    });

    it('validators handle positional operator (gh-3167)', function(done) {
      const s = new Schema({
        toppings: [{ name: { type: String, enum: ['bacon', 'cheese'] } }]
      });
      const Breakfast = db.model('Test', s);

      const updateOptions = { runValidators: true };
      Breakfast.update(
        { 'toppings.name': 'bacon' },
        { 'toppings.$.name': 'tofu' },
        updateOptions,
        function(error) {
          assert.ok(error);
          assert.ok(error.errors['toppings.0.name']);
          done();
        });
    });

    it('validators handle arrayFilters (gh-7536)', function() {
      const s = new Schema({
        toppings: [{ name: { type: String, enum: ['bacon', 'cheese'] } }]
      });
      const Breakfast = db.model('Test', s);

      const updateOptions = {
        runValidators: true,
        arrayFilters: [{ 't.name': 'bacon' }]
      };
      return Breakfast.
        update({}, { 'toppings.$[t].name': 'tofu' }, updateOptions).
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

      const Company = db.model('Test', CompanySchema);
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
    const schema = new Schema({ breakfast: String });
    const M = db.model('Test', schema);

    M.create({ breakfast: 'bacon' }, function(error, doc) {
      assert.ifError(error);
      M.update(
        { _id: doc._id },
        { $set: { breakfast: 'eggs' } },
        { overwrite: true },
        function(error) {
          assert.ifError(error);
          M.findOne({ _id: doc._id }, function(error, doc) {
            assert.ifError(error);
            assert.equal(doc.breakfast, 'eggs');
            done();
          });
        });
    });
  });

  it('successfully casts set with nested mixed objects (gh-2796)', function(done) {
    const schema = new Schema({ breakfast: {} });
    const M = db.model('Test', schema);

    M.create({}, function(error, doc) {
      assert.ifError(error);
      M.update(
        { _id: doc._id },
        { breakfast: { eggs: 2, bacon: 3 } },
        function(error, result) {
          assert.ifError(error);
          assert.equal(result.modifiedCount, 1);
          M.findOne({ _id: doc._id }, function(error, doc) {
            assert.ifError(error);
            assert.equal(doc.breakfast.eggs, 2);
            done();
          });
        });
    });
  });

  it('handles empty update with promises (gh-2796)', function(done) {
    const schema = new Schema({ eggs: Number });
    const M = db.model('Test', schema);

    M.create({}, function(error, doc) {
      assert.ifError(error);
      M.updateOne({ _id: doc._id }, { notInSchema: 1 }).exec().
        then(function(data) {
          assert.ok(!data.acknowledged);
          done();
        }).
        catch(done);
    });
  });

  describe('middleware', function() {
    it('can specify pre and post hooks', function(done) {
      let numPres = 0;
      let numPosts = 0;
      const band = new Schema({ members: [String] });
      band.pre('update', function(next) {
        ++numPres;
        next();
      });
      band.post('update', function() {
        ++numPosts;
      });
      const Band = db.model('Band', band);

      const gnr = new Band({ members: ['Axl', 'Slash', 'Izzy', 'Duff', 'Adler'] });
      gnr.save(function(error) {
        assert.ifError(error);
        assert.equal(numPres, 0);
        assert.equal(numPosts, 0);
        Band.update(
          { _id: gnr._id },
          { $pull: { members: 'Adler' } },
          function(error) {
            assert.ifError(error);
            assert.equal(numPres, 1);
            assert.equal(numPosts, 1);
            Band.findOne({ _id: gnr._id }, function(error, doc) {
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
        lead: { type: String, enum: ['Axl Rose'] }
      });
      bandSchema.pre('update', function() {
        this.options.runValidators = true;
      });
      const Band = db.model('Band', bandSchema);

      Band.update({}, { $set: { lead: 'Not Axl' } }, function(err) {
        assert.ok(err);
        done();
      });
    });

    describe('objects and arrays', function() {
      it('embedded objects (gh-2706)', function(done) {
        const bandSchema = new Schema({
          singer: {
            firstName: { type: String, enum: ['Axl'] },
            lastName: { type: String, enum: ['Rose'] }
          }
        });
        bandSchema.pre('update', function() {
          this.options.runValidators = true;
        });
        const Band = db.model('Band', bandSchema);

        Band.update({}, { $set: { singer: { firstName: 'Not', lastName: 'Axl' } } }, function(err) {
          assert.ok(err);
          done();
        });
      });

      it('handles document array validation (gh-2733)', async function() {
        const member = new Schema({
          name: String,
          role: { type: String, required: true, enum: ['singer', 'guitar', 'drums', 'bass'] }
        });
        const band = new Schema({ members: [member], name: String });
        const Band = db.model('Band', band);
        const members = [
          { name: 'Axl Rose', role: 'singer' },
          { name: 'Slash', role: 'guitar' },
          { name: 'Christopher Walken', role: 'cowbell' }
        ];

        const err = await Band.findOneAndUpdate(
          { name: 'Guns N\' Roses' },
          { $set: { members: members } },
          { runValidators: true })
          .then(() => null, err => err);

        assert.ok(err);
      });

      it('validators on arrays (gh-3724)', function(done) {
        const schema = new Schema({
          arr: [String]
        });

        schema.path('arr').validate(function() {
          return false;
        });

        const M = db.model('Test', schema);
        const options = { runValidators: true };
        M.findOneAndUpdate({}, { arr: ['test'] }, options, function(error) {
          assert.ok(error);
          assert.ok(/ValidationError/.test(error.toString()));
          done();
        });
      });
    });
  });

  it('works with undefined date (gh-2833)', function(done) {
    const dateSchema = {
      d: Date
    };
    const D = db.model('Test', dateSchema);

    assert.doesNotThrow(function() {
      D.update({}, { d: undefined }, function() {
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
      const M = db.model('Test', schema);

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
      const M = db.model('Test', schema);

      return M.update({}, { name: 'Test' }, { upsert: true }).
        then(() => M.findOne()).
        then(doc => {
          assert.equal(doc.updatedAt.valueOf(), date.valueOf());
        });
    });
  });

  it('does not add virtuals to update (gh-2046)', function(done) {
    const childSchema = new Schema({ foo: String }, { toObject: { getters: true } });
    const parentSchema = new Schema({ children: [childSchema] });

    childSchema.virtual('bar').get(function() {
      return 'bar';
    });

    const Parent = db.model('Parent', parentSchema);

    const update = Parent.update({}, { $push: { children: { foo: 'foo' } } }, { upsert: true });
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
    const Model = db.model('Test', FooSchema);

    const update = { $set: { values: 2, value: 2 } };
    Model.update({ key: 1 }, update, function() {
      assert.equal(update.$set.values, 2);
      done();
    });
  });

  describe('bug fixes', function() {
    it('can $rename (gh-1845)', function(done) {
      const schema = new Schema({ foo: Date, bar: Date });
      const Model = db.model('Test', schema);

      const update = { $rename: { foo: 'bar' } };
      Model.create({ foo: Date.now() }, function(error) {
        assert.ifError(error);
        Model.update({}, update, { multi: true }, function(error, res) {
          assert.ifError(error);
          assert.equal(res.modifiedCount, 1);
          done();
        });
      });
    });

    it('allows objects with positional operator (gh-3185)', function(done) {
      const schema = new Schema({ children: [{ _id: Number }] });
      const MyModel = db.model('Test', schema);

      MyModel.create({ children: [{ _id: 1 }] }, function(error, doc) {
        assert.ifError(error);
        MyModel.findOneAndUpdate(
          { _id: doc._id, 'children._id': 1 },
          { $set: { 'children.$': { _id: 2 } } },
          { new: true },
          function(error, doc) {
            assert.ifError(error);
            assert.equal(doc.children[0]._id, 2);
            done();
          });
      });
    });

    it('mixed type casting (gh-3305)', function(done) {
      const Schema = mongoose.Schema({}, { strict: false });
      const Model = db.model('Test', Schema);

      Model.create({}, function(error, m) {
        assert.ifError(error);
        Model.
          update({ _id: m._id }, { $push: { myArr: { key: 'Value' } } }).
          exec(function(error, res) {
            assert.ifError(error);
            assert.equal(res.modifiedCount, 1);
            done();
          });
      });
    });

    it('replaceOne', function(done) {
      const schema = mongoose.Schema({ name: String, age: Number }, {
        versionKey: false
      });
      const Model = db.model('Test', schema);

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
      const Schema = mongoose.Schema({ attributes: {} }, { strict: true });
      const Model = db.model('Test', Schema);

      Model.create({}, function(error, m) {
        assert.ifError(error);
        const update = { $push: { 'attributes.scores.bar': { a: 1 } } };
        Model.
          updateOne({ _id: m._id }, update).
          exec(function(error, res) {
            assert.ifError(error);
            assert.equal(res.modifiedCount, 1);
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

      const Collection = db.model('Test', CollectionSchema);

      Collection.create({}, function(error, doc) {
        assert.ifError(error);
        const update = { field2: { name: 'test' } };
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
      const Schema = mongoose.Schema({ myBufferField: Buffer });
      const Model = db.model('Test', Schema);

      Model.update({}, { myBufferField: Buffer.alloc(1) }, function(error) {
        assert.ifError(error);
        done();
      });
    });

    it('.update(doc) (gh-3221)', function() {
      const Schema = mongoose.Schema({ name: String });
      const Model = db.model('Test', Schema);

      let query = Model.update({ name: 'Val' });
      assert.equal(query.getUpdate().name, 'Val');

      query = Model.find().update({ name: 'Val' });
      assert.equal(query.getUpdate().name, 'Val');

      return query.setOptions({ upsert: true }).
        then(() => Model.findOne()).
        then(doc => {
          assert.equal(doc.name, 'Val');
        });
    });

    it('middleware update with exec (gh-3549)', function(done) {
      const Schema = mongoose.Schema({ name: String });

      Schema.pre('update', function(next) {
        this.update({ name: 'Val' });
        next();
      });

      const Model = db.model('Test', Schema);

      Model.create({}, function(error, doc) {
        assert.ifError(error);
        Model.update({ _id: doc._id }, { name: 'test' }).exec(function(error) {
          assert.ifError(error);
          Model.findOne({ _id: doc._id }, function(error, doc) {
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

      const M = db.model('Test', schema);

      M.create(doc, function(err) {
        assert.ifError(err);

        const update = { $push: { followers: 200 } };
        const opts = { overwrite: true, new: true, upsert: false, multi: false };

        M.update({ topicId: doc.topicId }, update, opts, function(err) {
          assert.ifError(err);
          M.findOne({ topicId: doc.topicId }, function(error, doc) {
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

      const ModelA = db.model('Test', ModelASchema);

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

      const Model = db.model('Test', schema);

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

      const Model = db.model('Test', schema);
      const update = { $inc: { num: 1 }, $push: { arr: { num: 5 } } };
      const options = {
        upsert: true,
        new: true,
        runValidators: true
      };
      Model.update({}, update, options, function(error) {
        assert.ifError(error);
        done();
      });
    });

    it('updates with timestamps with $set (gh-4989) (gh-7152)', async function() {
      const TagSchema = new Schema({
        name: String,
        tags: [String]
      }, { timestamps: true });

      const Tag = db.model('Test', TagSchema);

      await Tag.create({ name: 'test' });

      // Test update()
      let start = Date.now();
      await delay(10);

      await Tag.update({}, { $set: { tags: ['test1'] } });

      let tag = await Tag.findOne();
      assert.ok(tag.updatedAt.valueOf() > start);

      // Test updateOne()
      start = Date.now();
      await delay(10);

      await Tag.updateOne({}, { $set: { tags: ['test1'] } });

      tag = await Tag.findOne();
      assert.ok(tag.updatedAt.valueOf() > start);

      // Test updateMany()
      start = Date.now();
      await delay(10);

      await Tag.updateMany({}, { $set: { tags: ['test1'] } });

      tag = await Tag.findOne();
      assert.ok(tag.updatedAt.valueOf() > start);

      // Test replaceOne
      start = Date.now();
      await delay(10);

      await Tag.replaceOne({}, { name: 'test', tags: ['test1'] });

      tag = await Tag.findOne();
      assert.ok(tag.createdAt.valueOf() > start);
      assert.ok(tag.updatedAt.valueOf() > start);
    });

    it('lets $currentDate go through with updatedAt (gh-5222)', function(done) {
      const testSchema = new Schema({
        name: String
      }, { timestamps: true });

      const Test = db.model('Test', testSchema);

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

      const Company = db.model('Company', CompanySchema);

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

      const Parent = db.model('Parent', parentSchema);

      const b2 = new Parent();
      b2.save(function(err, doc) {
        const query = { _id: doc._id };
        const update = { $push: { children: { senderId: '234' } } };
        const opts = { new: true };
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

      const Parent = db.model('Parent', parentSchema);

      const b2 = new Parent();
      b2.save(function(err, doc) {
        const query = { _id: doc._id };
        const update = {
          $set: {
            children: [{ senderId: '234' }],
            child: { senderId: '567' }
          }
        };
        const opts = { new: true };
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

      const Model = db.model('Test', schema);
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

      const sampleModel = db.model('Test', sampleSchema);
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

      const Model = db.model('Test', parentSchema);

      const update = {
        $addToSet: { children: { name: 'Test' } }
      };
      const opts = { new: true, runValidators: true };
      Model.findOneAndUpdate({}, update, opts, function(error) {
        assert.ok(error);
        assert.ok(error.errors['children.lastName']);
        done();
      });
    });

    it('overwrite with timestamps (gh-4054)', function(done) {
      const testSchema = new Schema({
        user: String,
        something: Number
      }, { timestamps: true });

      const TestModel = db.model('Test', testSchema);
      const options = { upsert: true };
      const update = {
        user: 'John',
        something: 1
      };

      TestModel.replaceOne({ user: 'test' }, update, options, function(error) {
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

      const M = db.model('Test', schema);

      const m = new M({ arr: [{ ip: Buffer.alloc(1) }] });
      m.save(function(error, m) {
        assert.ifError(error);
        m.update({ $push: { arr: { ip: Buffer.alloc(1) } } }).exec(function(error) {
          assert.ifError(error);
          done();
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

      const User = db.model('User', UserSchema);

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

    it('handles $set on document array in discriminator with runValidators (gh-12518)', async function() {
      const options = { discriminatorKey: 'kind', runValidators: true };

      const countrySchema = new mongoose.Schema({ title: String }, options);
      const areasSubSchema = new mongoose.Schema({ country: [countrySchema] }, options);
      const WorldSchema = new mongoose.Schema({ areas: areasSubSchema }, options);

      const World = db.model(
        'World',
        new mongoose.Schema({ title: String }, options)
      );
      const Earth = World.discriminator('Earth', WorldSchema);

      const data = {
        areas: {
          country: [
            {
              title: 'titlec'
            }
          ]
        }
      };
      await Earth.updateOne(
        { _id: mongoose.Types.ObjectId() },
        data,
        {
          runValidators: true
        }
      );
    });

    it('single nested schema with geo (gh-4465)', function(done) {
      const addressSchema = new Schema({
        geo: { type: [Number], index: '2dsphere' }
      }, { _id: false });
      const containerSchema = new Schema({ address: addressSchema });
      const Container = db.model('Test', containerSchema);

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

      let B = new Schema({ a: [A] });

      B = db.model('Test', B);

      B.findOneAndUpdate(
        { foo: 'bar' },
        { $set: { a: [{ str: { somekey: 'someval' } }] } },
        { runValidators: true },
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


      const User = db.model('User', UserSchema);

      User.create({ profiles: [] }, function(error, user) {
        assert.ifError(error);
        User.update({ _id: user._id }, { $set: { 'profiles.0.rules': {} } }).
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
      const User = db.model('User', schema);

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
        inputs: [[String]] // Array of Arrays of Strings
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
      const User = db.model('Test', schema);

      User.findOneAndUpdate(
        { username: 'test', isDeleted: false },
        { createdAt: '2017-03-06T14:08:59+00:00' },
        { new: true, upsert: true },
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

      const User = db.model('User', UserSchema);

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
      const Test = db.model('Test', testSchema);

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
      const User = db.model('User', schema);

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
      const Test = db.model('Test', schema);

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
      const Test = db.model('Test', schema);

      const doc = new Test({ name: 'Test', arr: [null, { name: 'abc' }] });

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
        colors: [{ type: String }]
      });

      const Model = db.model('Test', Schema);

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

    it('doesn\'t skip casting the query on nested arrays (gh-7098)', async function() {
      const nestedSchema = new Schema({
        xyz: [[Number]]
      });
      const schema = new Schema({
        xyz: [[{ type: Number }]],
        nested: nestedSchema
      });

      const Model = db.model('Test', schema);

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
          ]
        }
      });

      const cond = { _id: test._id };
      const update = { $set: { 'xyz.1.0': '200', 'nested.xyz.1.0': '200' } };
      const opts = { new: true };

      let inserted = await test.save();
      inserted = inserted.toObject();
      assert.deepStrictEqual(inserted.xyz, [[0, 1], [2, 3], [4, 5]]);
      assert.deepStrictEqual(inserted.nested.xyz, [[0, 1], [2, 3], [4, 5]]);
      let updated = await Model.findOneAndUpdate(cond, update, opts);
      updated = updated.toObject();
      assert.deepStrictEqual(updated.xyz, [[0, 1], [200, 3], [4, 5]]);
      assert.deepStrictEqual(updated.nested.xyz, [[0, 1], [200, 3], [4, 5]]);
    });

    it('defaults with overwrite and no update validators (gh-5384)', function(done) {
      const testSchema = new mongoose.Schema({
        name: String,
        something: { type: Number, default: 2 }
      });

      const TestModel = db.model('Test', testSchema);
      const options = {
        upsert: true
      };

      const update = { name: 'test' };
      TestModel.replaceOne({ name: 'a' }, update, options, function(error) {
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

      const Parent = db.model('Parent', parentSchema);

      Parent.update({}, { d: { d2: 'test' } }, { runValidators: true }, function(error) {
        assert.ok(error);
        assert.ok(error.errors['d.d1']);
        assert.ok(error.errors['d.d1'].message.indexOf('Path `d1` is required') !== -1,
          error.errors['d.d1'].message);
        done();
      });
    });

    it('$push with updateValidators and top-level doc (gh-5430)', function(done) {
      const notificationSchema = new mongoose.Schema({
        message: String
      });

      const Notification = db.model('Test', notificationSchema);

      const userSchema = new mongoose.Schema({
        notifications: [notificationSchema]
      });

      const User = db.model('User', userSchema);

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

      const User = db.model('User', userSchema);

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
      const ExampleModel = db.model('Test', exampleSchema);
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

      const Item = db.model('Test', ItemSchema);

      const opts = { runValidators: true };
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

    it('update with Decimal type (gh-5361)', async function() {
      const version = await start.mongodVersion();
      const mongo34 = version[0] > 3 || (version[0] === 3 && version[1] >= 4);
      if (!mongo34) {
        return;
      }

      const schema = new mongoose.Schema({
        name: String,
        pricing: [{
          _id: false,
          program: String,
          money: mongoose.Schema.Types.Decimal
        }]
      });

      const Person = db.model('Person', schema);

      const data = {
        name: 'Jack',
        pricing: [
          { program: 'A', money: mongoose.Types.Decimal128.fromString('1.2') },
          { program: 'B', money: mongoose.Types.Decimal128.fromString('3.4') }
        ]
      };

      await Person.create(data);

      const newData = {
        name: 'Jack',
        pricing: [
          { program: 'A', money: mongoose.Types.Decimal128.fromString('5.6') },
          { program: 'B', money: mongoose.Types.Decimal128.fromString('7.8') }
        ]
      };
      await Person.update({ name: 'Jack' }, newData);
    });

    it('strict false in query (gh-5453)', function(done) {
      const schema = new mongoose.Schema({
        date: { type: Date, required: true }
      }, { strict: true });

      const Model = db.model('Test', schema);
      const q = { notInSchema: true };
      const u = { $set: { smth: 1 } };
      const o = { strict: false, upsert: true };
      Model.update(q, u, o).then(function() {
        done();
      }).catch(done);
    });

    it('replaceOne with buffer (gh-6124)', function() {
      const SomeModel = db.model('Test', new Schema({
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

      const Model = db.model('Test', schema);
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

      const Model = db.model('Test', schema);

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

      const Model = db.model('Test', schema);

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

    it('doesn\'t add $each when pushing an array into an array (gh-6768)', async function() {
      const schema = new Schema({
        arr: [[String]]
      });

      const Test = db.model('Test', schema);

      const test = new Test();

      await test.save();
      const cond = { _id: test._id };
      const data = ['one', 'two'];
      const update = { $push: { arr: data } };
      const opts = { new: true };
      const doc = await Test.findOneAndUpdate(cond, update, opts);

      assert.strictEqual(doc.arr.length, 1);
      assert.strictEqual(doc.arr[0][0], 'one');
      assert.strictEqual(doc.arr[0][1], 'two');
    });

    it('casting embedded discriminators if path specified in filter (gh-5841)', async function() {
      const sectionSchema = new Schema({ show: Boolean, order: Number },
        { discriminatorKey: 'type', _id: false });

      const siteSchema = new Schema({ sections: [sectionSchema] });
      const sectionArray = siteSchema.path('sections');

      const headerSchema = new Schema({ title: String }, { _id: false });
      sectionArray.discriminator('header', headerSchema);

      const textSchema = new Schema({ text: String }, { _id: false });
      sectionArray.discriminator('text', textSchema);

      const Site = db.model('Test', siteSchema);

      let doc = await Site.create({
        sections: [
          { type: 'header', title: 't1' },
          { type: 'text', text: 'abc' }
        ]
      });

      await Site.update({ 'sections.type': 'header' }, {
        $set: { 'sections.$.title': 'Test' }
      });

      doc = await Site.findById(doc._id);
      assert.equal(doc.sections[0].title, 'Test');
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

      const Test = db.model('Test', testSchema);

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
        Test.update({ _id: doc._id }, doc, { upsert: true }, function(error) {
          assert.ifError(error);
          Test.findOne({ _id: doc._id }, function(error, doc) {
            assert.ifError(error);
            assert.equal(doc.foo, 'baz');
            done();
          });
        });
      });
    });

    it('$inc cast errors (gh-6770)', async function() {
      const testSchema = new mongoose.Schema({ num: Number });
      const Test = db.model('Test', testSchema);

      await Test.create({ num: 1 });

      let threw = false;
      try {
        await Test.update({}, { $inc: { num: 'not a number' } });
      } catch (error) {
        threw = true;
        assert.ok(error instanceof CastError);
        assert.equal(error.path, 'num');
      }
      assert.ok(threw);

      threw = false;
      try {
        await Test.update({}, { $inc: { num: null } });
      } catch (error) {
        threw = true;
        assert.ok(error instanceof CastError);
        assert.equal(error.path, 'num');
      }
      assert.ok(threw);
    });

    it('does not treat virtuals as an error for strict: throw (gh-6731)', function() {
      const schema = new Schema({
        _id: String,
        total: Number
      }, { strict: 'throw' });

      schema.virtual('capitalGainsTax').get(function() {
        return this.total * 0.15;
      });

      const Test = db.model('Test', schema);

      // Shouldn't throw an error because `capitalGainsTax` is a virtual
      return Test.update({}, { total: 10000, capitalGainsTax: 1500 });
    });

    it('cast error in update conditions (gh-5477)', async function() {
      const schema = new mongoose.Schema({
        name: String
      }, { strict: true });

      const Model = db.model('Test', schema);
      const q = { notAField: true };
      const u = { $set: { name: 'Test' } };
      const o = { upsert: true };

      let error = await Model.update(q, u, o).then(() => null, err => err);
      assert.ok(error);
      assert.ok(error.message.indexOf('notAField') !== -1, error.message);
      assert.ok(error.message.indexOf('upsert') !== -1, error.message);

      error = await Model.updateMany(q, u, o).then(() => null, err => err);
      assert.ok(error);
      assert.ok(error.message.indexOf('notAField') !== -1, error.message);
      assert.ok(error.message.indexOf('upsert') !== -1, error.message);
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
        users: [{
          permission: {}
        }]
      };
      const opts = {
        runValidators: true
      };

      Group.update({}, update, opts, function(error) {
        assert.ok(error);
        assert.ok(error.errors['users.0.permission.read'], Object.keys(error.errors));
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

      const Test = db.model('Test', schema);

      const test = {
        name: 'Xyz',
        arr: [{ x: 'Z' }]
      };

      const cond = { name: 'Xyz' };
      const obj1 = { x: 'Y' };
      const set = { $set: { arr: obj1 } };

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

  after(async function() {
    await db.close();
  });

  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => util.clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  it('updating a map (gh-7111)', async function() {
    const accountSchema = new Schema({ balance: Number });

    const schema = new Schema({
      accounts: {
        type: Map,
        of: accountSchema
      }
    });

    const Test = db.model('Test', schema);

    const doc = await Test.create({ accounts: { USD: { balance: 345 } } });

    await Test.updateOne({}, { accounts: { USD: { balance: 8 } } });

    const updated = await Test.findOne({ _id: doc._id });
    assert.strictEqual(updated.accounts.get('USD').balance, 8);
  });

  it('updating a map path underneath a single nested subdoc (gh-9298)', async function() {
    const schema = Schema({
      cities: {
        type: Map,
        of: Schema({ population: Number })
      }
    });
    const Test = db.model('Test', Schema({ country: schema }));

    await Test.create({});

    await Test.updateOne({}, { 'country.cities.newyork.population': '10000' });

    const updated = await Test.findOne({}).lean();
    assert.strictEqual(updated.country.cities.newyork.population, 10000);
  });

  it('overwrite an array with empty (gh-7135)', async function() {
    const ElementSchema = Schema({
      a: { type: String, required: true }
    }, { _id: false });
    const ArraySchema = Schema({ anArray: [ElementSchema] });

    const TestModel = db.model('Test', ArraySchema);

    let err = await TestModel.
      updateOne({}, { $set: { anArray: [{}] } }, { runValidators: true }).
      then(() => null, err => err);

    assert.ok(err);
    assert.ok(err.errors['anArray.0.a']);

    err = await TestModel.
      updateOne({}, { $set: { 'anArray.0': {} } }, { runValidators: true }).
      then(() => null, err => err);
    assert.ok(err);
    assert.ok(err.errors['anArray.0.a']);
  });

  it('sets child timestamps even without $set (gh-7261)', async function() {
    const childSchema = new Schema({ name: String }, { timestamps: true });
    const parentSchema = new Schema({ child: childSchema });
    const Parent = db.model('Parent', parentSchema);

    await Parent.create({ child: { name: 'Luke Skywalker' } });

    const now = Date.now();
    await delay(10);

    await Parent.updateOne({}, { child: { name: 'Luke Skywalker' } });

    const doc = await Parent.findOne();

    assert.ok(doc.child.createdAt.valueOf() >= now);
    assert.ok(doc.child.updatedAt.valueOf() >= now);
  });

  it('supports discriminators if key is specified in conditions (gh-7843)', function() {
    const testSchema = new mongoose.Schema({
      title: { type: String, required: true },
      kind: { type: String, required: true }
    }, { discriminatorKey: 'kind' });

    const Test = db.model('Test', testSchema);

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

  it('immutable createdAt (gh-7917)', async function() {
    const start = new Date().valueOf();
    const schema = Schema({
      createdAt: {
        type: mongoose.Schema.Types.Date,
        immutable: true
      },
      name: String
    }, { timestamps: true });

    const Model = db.model('Test', schema);

    await Model.updateOne({}, { name: 'foo' }, { upsert: true });

    const doc = await Model.collection.findOne();
    assert.ok(doc.createdAt.valueOf() >= start);
  });

  it('conditional immutable (gh-8001)', async function() {
    const schema = Schema({
      test: {
        type: String,
        immutable: ctx => {
          return ctx.getQuery().name != null;
        }
      },
      name: String
    }, { timestamps: true });

    const Model = db.model('Test', schema);

    await Model.updateOne({}, { test: 'before', name: 'foo' }, { upsert: true });
    let doc = await Model.collection.findOne();
    assert.equal(doc.test, 'before');

    await Model.updateOne({ name: 'foo' }, { test: 'after' }, { upsert: true });
    doc = await Model.collection.findOne();
    assert.equal(doc.test, 'before');

    await Model.updateOne({}, { test: 'after' }, { upsert: true });
    doc = await Model.collection.findOne();
    assert.equal(doc.test, 'after');
  });

  it('allow $pull with non-existent schema field (gh-8166)', async function() {
    const Model = db.model('Test', Schema({
      name: String,
      arr: [{
        status: String,
        values: [{ text: String }]
      }]
    }));

    await Model.collection.insertMany([
      {
        name: 'a',
        arr: [{ values: [{ text: '123' }] }]
      },
      {
        name: 'b',
        arr: [{ values: [{ text: '123', coords: 'test' }] }]
      }
    ]);

    await Model.updateMany({}, {
      $pull: { arr: { 'values.0.coords': { $exists: false } } }
    });

    const docs = await Model.find().sort({ name: 1 });
    assert.equal(docs[0].name, 'a');
    assert.equal(docs[0].arr.length, 0);
    assert.equal(docs[1].name, 'b');
    assert.equal(docs[1].arr.length, 1);
  });

  it('update embedded discriminator path if key in $elemMatch (gh-8063)', async function() {
    const slideSchema = new Schema({
      type: { type: String },
      commonField: String
    }, { discriminatorKey: 'type' });
    const schema = new Schema({ slides: [slideSchema] });

    const slidesSchema = schema.path('slides');
    slidesSchema.discriminator('typeA', new Schema({ a: String }));
    slidesSchema.discriminator('typeB', new Schema({ b: String }));

    const MyModel = db.model('Test', schema);
    const doc = await MyModel.create({
      slides: [{ type: 'typeA', a: 'oldValue1', commonField: 'oldValue2' }]
    });

    const filter = {
      slides: { $elemMatch: { _id: doc.slides[0]._id, type: 'typeA' } }
    };
    const update = {
      'slides.$.a': 'newValue1',
      'slides.$.commonField': 'newValue2'
    };
    await MyModel.updateOne(filter, update);

    const updatedDoc = await MyModel.findOne();
    assert.equal(updatedDoc.slides.length, 1);
    assert.equal(updatedDoc.slides[0].type, 'typeA');
    assert.equal(updatedDoc.slides[0].a, 'newValue1');
    assert.equal(updatedDoc.slides[0].commonField, 'newValue2');
  });

  it('moves $set of immutable properties to $setOnInsert (gh-8467) (gh-9537)', async function() {
    const childSchema = Schema({ name: String });
    const Model = db.model('Test', Schema({
      name: String,
      age: { type: Number, default: 25, immutable: true },
      child: { type: childSchema, immutable: true }
    }));

    const _opts = { upsert: true };

    await Model.deleteMany({});
    await Model.updateOne({}, { name: 'John', age: 20, child: { name: 'test' } }, _opts);

    const doc = await Model.findOne().lean();
    assert.equal(doc.age, 20);
    assert.equal(doc.name, 'John');
    assert.equal(doc.child.name, 'test');

    await Model.updateOne({}, { name: 'new', age: 29, child: { name: 'new' } }, _opts);
    assert.equal(doc.age, 20);
    assert.equal(doc.name, 'John');
    assert.equal(doc.child.name, 'test');
  });

  it('moves $set of immutable properties to $setOnInsert (gh-8951)', async function() {
    const Model = db.model('Test', Schema({
      name: String,
      age: { type: Number, default: 25, immutable: true }
    }));

    await Model.bulkWrite([
      {
        updateOne: {
          filter: { name: 'John' },
          update: { name: 'John', age: 20 },
          upsert: true
        }
      }
    ]);

    const doc = await Model.findOne().lean();
    assert.equal(doc.age, 20);
  });

  it('updates buffers with `runValidators` successfully (gh-8580)', async function() {
    const Test = db.model('Test', Schema({
      data: { type: Buffer, required: true }
    }));

    const opts = { runValidators: true, upsert: true };
    await Test.updateOne({}, { data: Buffer.from('test') }, opts);

    const doc = await Test.findOne();
    assert.ok(doc.data);
    assert.equal(doc.data.toString('utf8'), 'test');
  });

  it('allows overriding child strict mode with top-level strict (gh-8961)', async function() {
    const emptySchema = Schema({}, {
      strict: false,
      _id: false,
      versionKey: false
    });

    const testSchema = Schema({
      test: String,
      nested: emptySchema
    }, { strict: true, versionKey: false });
    const Test = db.model('Test', testSchema);

    const filter = { test: 'foo' };
    let update = { nested: { notInSchema: 'bar' } };

    await Test.deleteMany({});
    await Test.updateOne(filter, update, { upsert: true });
    let doc = await Test.findOne({ test: 'foo' });
    assert.equal(doc.get('nested.notInSchema'), 'bar');

    await Test.deleteMany({});
    await Test.updateOne(filter, update, { upsert: true, strict: true });
    doc = await Test.findOne({ test: 'foo' });
    assert.equal(doc.get('nested.notInSchema'), void 0);

    update = { 'nested.notInSchema': 'baz' };
    await Test.updateOne(filter, update, { upsert: true });
    doc = await Test.findOne({ test: 'foo' });
    assert.equal(doc.get('nested.notInSchema'), 'baz');

    update = { 'nested.notInSchema': 'foo' };
    await Test.updateOne(filter, update, { upsert: true, strict: true });
    doc = await Test.findOne({ test: 'foo' });
    assert.equal(doc.get('nested.notInSchema'), 'baz');
  });

  it('handles timestamp properties in nested paths when overwriting parent path (gh-9105)', async function() {
    const SampleSchema = Schema({ nested: { test: String } }, {
      timestamps: {
        createdAt: 'nested.createdAt',
        updatedAt: 'nested.updatedAt'
      }
    });
    const Test = db.model('Test', SampleSchema);

    const doc = await Test.create({ nested: { test: 'foo' } });
    assert.ok(doc.nested.updatedAt);
    assert.ok(doc.nested.createdAt);

    await delay(10);
    await Test.updateOne({ _id: doc._id }, { nested: { test: 'bar' } });
    const fromDb = await Test.findOne({ _id: doc._id });
    assert.ok(fromDb.nested.updatedAt);
    assert.ok(fromDb.nested.updatedAt > doc.nested.updatedAt);
  });

  describe('mongodb 42 features', function() {
    before(async function() {
      const version = await start.mongodVersion();

      if (version[0] < 4 || (version[0] === 4 && version[1] < 2)) {
        this.skip();
      }
    });

    it('update pipeline (gh-8225)', async function() {
      const schema = Schema({ oldProp: String, newProp: String });
      const Model = db.model('Test', schema);

      await Model.create({ oldProp: 'test' });
      await Model.updateOne({}, [
        { $set: { newProp: 'test2' } },
        { $unset: ['oldProp'] }
      ]);
      let doc = await Model.findOne();
      assert.equal(doc.newProp, 'test2');
      assert.strictEqual(doc.oldProp, void 0);

      // Aliased fields
      await Model.updateOne({}, [
        { $addFields: { oldProp: 'test3' } },
        { $project: { newProp: 0 } }
      ]);
      doc = await Model.findOne();
      assert.equal(doc.oldProp, 'test3');
      assert.strictEqual(doc.newProp, void 0);
    });

    it('update pipeline - $unset with string (gh-11106)', async function() {
      const schema = Schema({ oldProp: String, newProp: String });
      const Model = db.model('Test', schema);

      await Model.create({ oldProp: 'test' });
      await Model.updateOne({}, [
        { $set: { newProp: 'test2' } },
        { $unset: 'oldProp' }
      ]);
      const doc = await Model.findOne();
      assert.equal(doc.newProp, 'test2');
      assert.strictEqual(doc.oldProp, void 0);
    });

    it('update pipeline timestamps (gh-8524)', async function() {
      const Cat = db.model('Test', Schema({ name: String }, { timestamps: true }));

      const cat = await Cat.create({ name: 'Entei' });
      const updatedAt = cat.updatedAt;

      await new Promise(resolve => setTimeout(resolve), 50);
      const updated = await Cat.findOneAndUpdate({ _id: cat._id },
        [{ $set: { name: 'Raikou' } }], { new: true });
      assert.ok(updated.updatedAt.getTime() > updatedAt.getTime());
    });
  });

  describe('overwriteDiscriminatorKey', function() {
    it('allows changing discriminator key in update (gh-6087)', async function() {
      const baseSchema = new Schema({}, { discriminatorKey: 'type' });
      const baseModel = db.model('Test', baseSchema);

      const aSchema = Schema({ aThing: Number }, { _id: false, id: false });
      const aModel = baseModel.discriminator('A', aSchema);

      const bSchema = new Schema({ bThing: String }, { _id: false, id: false });
      const bModel = baseModel.discriminator('B', bSchema);

      // Model is created as a type A
      let doc = await baseModel.create({ type: 'A', aThing: 1 });

      await aModel.updateOne(
        { _id: doc._id },
        { type: 'B', bThing: 'two' },
        { runValidators: true, overwriteDiscriminatorKey: true }
      );

      doc = await baseModel.findById(doc);
      assert.equal(doc.type, 'B');
      assert.ok(doc instanceof bModel);
      assert.equal(doc.bThing, 'two');
    });
  });

  it('update validators respect storeSubdocValidationError (gh-9172)', async function() {
    const opts = { storeSubdocValidationError: false };
    const Model = db.model('Test', Schema({
      nested: Schema({
        arr: [{ name: { type: String, required: true } }]
      }, opts)
    }));

    const err = await Model.updateOne({}, { nested: { arr: [{}] } }, { runValidators: true }).catch(err => err);

    assert.ok(err);
    assert.ok(err.errors['nested.arr.0.name']);
    assert.ok(!err.errors['nested']);
  });

  it('handles spread docs (gh-9518)', async function() {
    const schema = new mongoose.Schema({
      name: String,
      children: [{ name: String }]
    });

    const Person = db.model('Person', schema);

    const doc = await Person.create({
      name: 'Anakin',
      children: [{ name: 'Luke' }]
    });

    doc.children[0].name = 'Luke Skywalker';
    const update = { 'children.0': Object.assign({}, doc.children[0]) };

    await Person.updateOne({ _id: doc._id }, update);

    const fromDb = await Person.findById(doc);
    assert.equal(fromDb.children[0].name, 'Luke Skywalker');
  });

  describe('converts dot separated paths to nested structure (gh-10200)', () => {
    it('works with new Model(...)', () => {
      const Payment = getPaymentModel();
      const paymentPOJO = getPaymentWithDotSeparatedPaths();
      const payment = new Payment(paymentPOJO);
      assertDocumentStructure(payment.toObject());
    });
    it('works with Model.create(...)', async() => {
      const Payment = getPaymentModel();
      const paymentPOJO = getPaymentWithDotSeparatedPaths();
      const payment = await Payment.create(paymentPOJO);
      assertDocumentStructure(payment);
    });
    it('works with Model.updateOne(...)', async() => {
      const User = getPaymentModel();
      const userPOJO = getPaymentWithDotSeparatedPaths();

      const emptyUser = await User.create({});
      await User.updateOne({ _id: emptyUser._id }, userPOJO);
      const user = await User.findOne({ _id: emptyUser._id }).lean();

      assertDocumentStructure(user);
    });
    it('works with Model.bulkWrite(...)', async() => {
      const Payment = getPaymentModel();
      const paymentPOJO = getPaymentWithDotSeparatedPaths();

      const emptyPayment = await Payment.create({});

      await Payment.bulkWrite([
        { updateOne: { filter: { _id: emptyPayment._id }, update: paymentPOJO } }
      ]);
      const payment = await Payment.findOne({ _id: emptyPayment._id }).lean();

      assertDocumentStructure(payment);
    });


    function getPaymentModel() {
      const paymentSchema = new Schema({
        paymentFor: String,
        externalServiceResponse: {
          id: String,
          resultDetails: {
            clearingInstituteName: String,
            transaction: {
              receipt: String,
              authorizationCode: String,
              acquirer: { settlementDate: String }
            },
            response: { acquirerCode: String, acquirerMessage: String },
            authorizationResponse: { stan: String },
            sourceOfFunds: { provided: { card: { issuer: String } } }
          }
        }
      });

      const Payment = db.model('Payment', paymentSchema);
      return Payment;
    }

    function getPaymentWithDotSeparatedPaths() {
      return {
        paymentFor: 'order',
        externalServiceResponse: {
          id: '1',
          resultDetails: {
            clearingInstituteName: 'Our local bank',
            'authorizationResponse.stan': '123456',
            'transaction.receipt': 'I am a transaction receipt',
            'transaction.authorizationCode': 'ABCDEF',
            'transaction.acquirer.settlementDate': 'February 2021',
            'sourceOfFunds.provided.card.issuer': 'Big bank corporation',
            nonExistentField: 'I should not be present'
          }
        }
      };
    }

    function assertDocumentStructure(payment) {
      assert.equal(payment.paymentFor, 'order');
      assert.equal(payment.externalServiceResponse.id, '1');
      assert.equal(payment.externalServiceResponse.resultDetails.clearingInstituteName, 'Our local bank');
      assert.deepEqual(
        payment.externalServiceResponse.resultDetails.authorizationResponse,
        { stan: '123456' }
      );
      assert.deepEqual(
        payment.externalServiceResponse.resultDetails.transaction,
        {
          receipt: 'I am a transaction receipt',
          authorizationCode: 'ABCDEF',
          acquirer: { settlementDate: 'February 2021' }
        }
      );
      assert.deepEqual(
        payment.externalServiceResponse.resultDetails.sourceOfFunds,
        { provided: { card: { issuer: 'Big bank corporation' } } }
      );
      assert.deepEqual(
        payment.externalServiceResponse.resultDetails.nonExistentField,
        undefined
      );
    }
  });
});

async function delay(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
