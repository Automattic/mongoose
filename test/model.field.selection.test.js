/**
 * Test dependencies.
 */

'use strict';

const start = require('./common');

const assert = require('assert');
const co = require('co');
const random = require('../lib/utils').random;

const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;
const DocumentObjectId = mongoose.Types.ObjectId;

describe('model field selection', function() {
  let Comments;
  let BlogPostB;
  let modelName;
  let collection;
  let db;

  before(function() {
    Comments = new Schema;

    Comments.add({
      title: String,
      date: Date,
      body: String,
      comments: [Comments]
    });

    BlogPostB = new Schema({
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
      tags: [String],
      sigs: [Buffer],
      owners: [ObjectId],
      comments: [Comments],
      def: {type: String, default: 'kandinsky'}
    });

    modelName = 'model.select.blogpost';
    mongoose.model(modelName, BlogPostB);
    collection = 'blogposts_' + random();
    db = start();
  });

  after(function(done) {
    db.close(done);
  });

  it('excluded fields should be undefined', function(done) {
    const BlogPostB = db.model(modelName, collection);
    const date = new Date;

    const doc = {
      title: 'subset 1',
      author: 'me',
      comments: [{title: 'first comment', date: new Date}, {title: '2nd', date: new Date}],
      meta: {date: date}
    };

    BlogPostB.create(doc, function(err, created) {
      assert.ifError(err);

      const id = created.id;
      BlogPostB.findById(id, {title: 0, 'meta.date': 0, owners: 0, 'comments.user': 0}, function(err, found) {
        assert.ifError(err);
        assert.equal(found._id.toString(), created._id);
        assert.strictEqual(undefined, found.title);
        assert.strictEqual('kandinsky', found.def);
        assert.strictEqual('me', found.author);
        assert.strictEqual(true, Array.isArray(found.numbers));
        assert.equal(found.meta.date, undefined);
        assert.equal(found.numbers.length, 0);
        assert.equal(found.owners, undefined);
        assert.strictEqual(true, Array.isArray(found.comments));
        assert.equal(found.comments.length, 2);
        found.comments.forEach(function(comment) {
          assert.equal(comment.user, undefined);
        });
        done();
      });
    });
  });

  it('excluded fields should be undefined and defaults applied to other fields', function(done) {
    const BlogPostB = db.model(modelName, collection);
    const id = new DocumentObjectId;
    const date = new Date;

    BlogPostB.collection.insertOne({_id: id, title: 'hahaha1', meta: {date: date}}, function(err) {
      assert.ifError(err);

      BlogPostB.findById(id, {title: 0}, function(err, found) {
        assert.ifError(err);
        assert.equal(found._id.toString(), id);
        assert.strictEqual(undefined, found.title);
        assert.strictEqual('kandinsky', found.def);
        assert.strictEqual(undefined, found.author);
        assert.strictEqual(true, Array.isArray(found.comments));
        assert.equal(date.toString(), found.meta.date.toString());
        assert.equal(found.comments.length, 0);
        done();
      });
    });
  });

  it('where subset of fields excludes _id', function(done) {
    const BlogPostB = db.model(modelName, collection);
    BlogPostB.create({title: 'subset 1'}, function(err) {
      assert.ifError(err);
      BlogPostB.findOne({title: 'subset 1'}, {title: 1, _id: 0}, function(err, found) {
        assert.ifError(err);
        assert.strictEqual(undefined, found._id);
        assert.equal(found.title, 'subset 1');
        done();
      });
    });
  });

  it('works with subset of fields, excluding _id', function(done) {
    const BlogPostB = db.model(modelName, collection);
    BlogPostB.create({title: 'subset 1', author: 'me'}, function(err) {
      assert.ifError(err);
      BlogPostB.find({title: 'subset 1'}, {title: 1, _id: 0}, function(err, found) {
        assert.ifError(err);
        assert.strictEqual(undefined, found[0]._id);
        assert.equal(found[0].title, 'subset 1');
        assert.strictEqual(undefined, found[0].def);
        assert.strictEqual(undefined, found[0].author);
        assert.strictEqual(false, Array.isArray(found[0].comments));
        done();
      });
    });
  });

  it('works with just _id and findOneAndUpdate (gh-3407)', function(done) {
    const MyModel = db.model('gh3407', {test: {type: Number, default: 1}});

    MyModel.collection.insertOne({}, function(error) {
      assert.ifError(error);
      MyModel.findOne({}, {_id: 1}, function(error, doc) {
        assert.ifError(error);
        assert.ok(!doc.test);
        done();
      });
    });
  });

  it('works with subset of fields excluding emebedded doc _id (gh-541)', function(done) {
    const BlogPostB = db.model(modelName, collection);

    BlogPostB.create({title: 'LOTR', comments: [{title: ':)'}]}, function(err, created) {
      assert.ifError(err);
      BlogPostB.find({_id: created}, {_id: 0, 'comments._id': 0}, function(err, found) {
        assert.ifError(err);
        assert.strictEqual(undefined, found[0]._id);
        assert.equal(found[0].title, 'LOTR');
        assert.strictEqual('kandinsky', found[0].def);
        assert.strictEqual(undefined, found[0].author);
        assert.strictEqual(true, Array.isArray(found[0].comments));
        assert.equal(found[0].comments.length, 1);
        assert.equal(found[0].comments[0].title, ':)');
        assert.strictEqual(undefined, found[0].comments[0]._id);
        // gh-590
        assert.ok(!found[0].comments[0].id);
        done();
      });
    });
  });

  it('included fields should have defaults applied when no value exists in db (gh-870)', function(done) {
    const BlogPostB = db.model(modelName, collection);
    const id = new DocumentObjectId;

    BlogPostB.collection.insertOne(
      {_id: id, title: 'issue 870'}, {safe: true}, function(err) {
        assert.ifError(err);

        BlogPostB.findById(id, 'def comments', function(err, found) {
          assert.ifError(err);
          assert.ok(found);
          assert.equal(found._id.toString(), id);
          assert.strictEqual(undefined, found.title);
          assert.strictEqual('kandinsky', found.def);
          assert.strictEqual(undefined, found.author);
          assert.strictEqual(true, Array.isArray(found.comments));
          assert.equal(found.comments.length, 0);
          done();
        });
      });
  });

  it('including subdoc field excludes other subdoc fields (gh-1027)', function(done) {
    const BlogPostB = db.model(modelName, collection);

    BlogPostB.create({comments: [{title: 'a'}, {title: 'b'}]}, function(err, doc) {
      assert.ifError(err);

      BlogPostB.findById(doc._id).select('_id comments.title').exec(function(err, found) {
        assert.ifError(err);
        assert.ok(found);
        assert.equal(doc._id.toString(), found._id.toString());
        assert.strictEqual(undefined, found.title);
        assert.strictEqual(true, Array.isArray(found.comments));
        found.comments.forEach(function(comment) {
          assert.equal(comment.body, undefined);
          assert.equal(comment.comments, undefined);
          assert.equal(comment._id, undefined);
          assert.ok(!!comment.title);
        });
        done();
      });
    });
  });

  it('excluding nested subdoc fields (gh-1027)', function(done) {
    const BlogPostB = db.model(modelName, collection);

    BlogPostB.create({title: 'top', comments: [{title: 'a', body: 'body'}, {title: 'b', body: 'body', comments: [{title: 'c'}]}]}, function(err, doc) {
      assert.ifError(err);

      BlogPostB.findById(doc._id).select('-_id -comments.title -comments.comments.comments -numbers').exec(function(err, found) {
        assert.ifError(err);
        assert.ok(found);
        assert.equal(found._id, undefined);
        assert.strictEqual(found.title, 'top');
        assert.equal(found.numbers, undefined);
        assert.strictEqual(true, Array.isArray(found.comments));
        found.comments.forEach(function(comment) {
          assert.equal(comment.title, undefined);
          assert.equal(comment.body, 'body');
          assert.strictEqual(Array.isArray(comment.comments), true);
          assert.ok(comment._id);
          comment.comments.forEach(function(comment) {
            assert.equal(comment.title, 'c');
            assert.equal(comment.body, undefined);
            assert.equal(comment.comments, undefined);
            assert.ok(comment._id);
          });
        });
        done();
      });
    });
  });

  describe('with $elemMatch projection', function() {
    // mongodb 2.2 support

    it('casts elemMatch args (gh-1091)', function(done) {
      const postSchema = new Schema({
        ids: [{type: Schema.ObjectId}]
      });

      const B = db.model('gh-1091', postSchema);
      const _id1 = new mongoose.Types.ObjectId;
      const _id2 = new mongoose.Types.ObjectId;

      B.create({ids: [_id1, _id2]}, function(err, doc) {
        assert.ifError(err);

        B
          .findById(doc._id)
          .select({ids: {$elemMatch: {$in: [_id2.toString()]}}})
          .exec(function(err, found) {
            assert.ifError(err);
            assert.ok(found);
            assert.equal(found.id, doc.id);
            assert.equal(found.ids.length, 1);
            assert.equal(found.ids[0].toString(), _id2.toString());

            B
              .find({_id: doc._id})
              .select({ids: {$elemMatch: {$in: [_id2.toString()]}}})
              .exec(function(err, found) {
                assert.ifError(err);
                assert.ok(found.length);
                found = found[0];
                assert.equal(found.id, doc.id);
                assert.equal(found.ids.length, 1);
                assert.equal(found.ids[0].toString(), _id2.toString());
                done();
              });
          });
      });
    });

    it('saves modified elemMatch paths (gh-1334)', function(done) {
      const postSchema = new Schema({
        ids: [{type: Schema.ObjectId}],
        ids2: [{type: Schema.ObjectId}]
      });

      const B = db.model('gh-1334', postSchema);
      const _id1 = new mongoose.Types.ObjectId;
      const _id2 = new mongoose.Types.ObjectId;

      B.create({ids: [_id1, _id2], ids2: [_id2, _id1]}, function(err, doc) {
        assert.ifError(err);

        B
          .findById(doc._id)
          .select({ids2: {$elemMatch: {$in: [_id1.toString()]}}})
          .exec(function(err, found) {
            assert.ifError(err);
            assert.equal(found.ids2.length, 1);
            found.ids2.set(0, _id2);

            found.save(function(err) {
              assert.ifError(err);

              B
                .findById(doc._id)
                .select({ids: {$elemMatch: {$in: [_id2.toString()]}}})
                .select('ids2')
                .exec(function(err, found) {
                  assert.equal(2, found.ids2.length);
                  assert.equal(_id2.toHexString(), found.ids2[0].toHexString());
                  assert.equal(_id2.toHexString(), found.ids2[1].toHexString());

                  found.ids.pull(_id2);

                  found.save(function(err) {
                    assert.ok(err);

                    done();
                  });
                });
            });
          });
      });
    });

    it('works with $ positional in select (gh-2031)', function(done) {
      const postSchema = new Schema({
        tags: [{tag: String, count: 0}]
      });

      const Post = db.model('gh-2031', postSchema, 'gh-2031');
      Post.create({tags: [{tag: 'bacon', count: 2}, {tag: 'eggs', count: 3}]}, function(error) {
        assert.ifError(error);
        Post.findOne({'tags.tag': 'eggs'}, {'tags.$': 1}, function(error, post) {
          assert.ifError(error);
          post.tags[0].count = 1;
          post.save(function(error) {
            assert.ok(error);
            done();
          });
        });
      });
    });
  });

  it('selecting an array of docs applies defaults properly (gh-1108)', function(done) {
    const M = db.model(modelName, collection);

    const m = new M({title: '1108', comments: [{body: 'yay'}]});
    m.comments[0].comments = undefined;
    m.save(function(err, doc) {
      assert.ifError(err);
      M.findById(doc._id).select('comments').exec(function(err, found) {
        assert.ifError(err);
        assert.ok(Array.isArray(found.comments));
        assert.equal(found.comments.length, 1);
        assert.ok(Array.isArray(found.comments[0].comments));
        done();
      });
    });
  });

  it('select properties named length (gh-3903)', function(done) {
    const schema = new mongoose.Schema({
      length: Number,
      name: String
    });

    const MyModel = db.model('gh3903', schema);

    MyModel.create({ name: 'val', length: 3 }, function(error) {
      assert.ifError(error);
      MyModel.findOne({}).select({ length: 1 }).exec(function(error, doc) {
        assert.ifError(error);
        assert.ok(!doc.name);
        done();
      });
    });
  });

  it('appropriately filters subdocuments based on properties (gh-1280)', function(done) {
    const RouteSchema = new Schema({
      stations: {
        start: {
          name: {type: String},
          loc: {type: [Number], index: '2d'}
        },
        end: {
          name: {type: String},
          loc: {type: [Number], index: '2d'}
        },
        points: [
          {
            name: {type: String},
            loc: {type: [Number], index: '2d'}
          }
        ]
      }
    });

    const Route = db.model('Route' + random(), RouteSchema);

    const item = {
      stations: {
        start: {
          name: 'thing',
          loc: [1, 2]
        },
        end: {
          name: 'thingend',
          loc: [2, 3]
        },
        points: [{name: 'rawr'}]
      }
    };

    Route.create(item, function(err, i) {
      assert.ifError(err);

      Route.findById(i.id).select('-stations').exec(function(err, res) {
        assert.ifError(err);
        assert.equal(res.stations.toString(), 'MongooseDocument { undefined }');

        Route.findById(i.id).select('-stations.start -stations.end').exec(function(err, res) {
          assert.ifError(err);
          assert.equal(res.stations.start.toString(), 'MongooseDocument { undefined }');
          assert.equal(res.stations.end.toString(), 'MongooseDocument { undefined }');
          assert.ok(Array.isArray(res.stations.points));
          done();
        });
      });
    });
  });

  it('sets defaults correctly in child docs with projection (gh-7159)', function() {
    const CalendarSchema = new Schema({
      dateFormat: {
        type: String,
        default: 'dd/MM/yyyy'
      },
      locale: {
        type: String,
        default: 'en-gb'
      }
    }, { _id: false });

    const SettingsSchema = new Schema({
      calendar: {
        type: CalendarSchema,
        default: {}
      }
    }, { _id: false });

    const BlogPostSchema = new Schema({
      author: String,
      settings: {
        type: SettingsSchema,
        default: {}
      }
    });

    const BlogPost = db.model('gh7159', BlogPostSchema);

    return co(function*() {
      yield BlogPost.create({
        author: 'me',
        settings: {
          calendar: {
            dateFormat: '1234'
          }
        }
      });

      yield BlogPost.updateOne({}, { $unset: { 'settings.calendar.locale': 1 } });

      let doc = yield BlogPost.findOne();
      assert.strictEqual(doc.settings.calendar.locale, 'en-gb');
      assert.strictEqual(doc.settings.calendar.dateFormat, '1234');

      doc = yield BlogPost.findOne().select('settings author');
      assert.strictEqual(doc.settings.calendar.locale, 'en-gb');
      assert.strictEqual(doc.settings.calendar.dateFormat, '1234');
    });
  });
});