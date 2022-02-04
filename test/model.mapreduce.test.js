/* global emit */
/**
 * Test dependencies.
 */

'use strict';

const start = require('./common');

const assert = require('assert');
const random = require('./util').random;

const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

describe('model: mapreduce:', function() {
  let Comments;
  let BlogPost;
  let db;

  before(function() {
    Comments = new Schema();

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
    });

    db = start();
  });

  after(async function() {
    await db.close();
  });

  beforeEach(function() {
    db.deleteModel(/.*/);
  });

  it('works', async function() {
    const MR = db.model('MapReduce', BlogPost);

    const id = new mongoose.Types.ObjectId();
    const authors = 'aaron guillermo brian nathan'.split(' ');
    const num = 10;
    const docs = [];
    for (let i = 0; i < num; ++i) {
      docs.push({ author: authors[i % authors.length], owners: [id], published: true });
    }

    const insertedDocs = await MR.create(docs);

    const magicID = insertedDocs[1]._id;

    const o1 = {
      map: 'function() { emit(this.author, 1); }',
      reduce: function(k, vals) {
        return vals.length;
      }
    };

    const { results: ret, stats } = await MR.mapReduce(o1);


    assert.ok(Array.isArray(ret));
    assert.ok(stats);
    ret.forEach(function(res) {
      if (res._id === 'aaron') {
        assert.equal(res.value, 3);
      }
      if (res._id === 'guillermo') {
        assert.equal(res.value, 3);
      }
      if (res._id === 'brian') {
        assert.equal(res.value, 2);
      }
      if (res._id === 'nathan') {
        assert.equal(res.value, 2);
      }
    });

    const o2 = {
      map: function() {
        emit(this.author, 1);
      },
      reduce: function(k, vals) {
        return vals.length;
      },
      query: { author: 'aaron', published: 1, owners: id }
    };

    const res2 = await MR.mapReduce(o2);

    const ret2 = res2.results;
    const stats2 = res2.stats;

    assert.ok(Array.isArray(ret2));
    assert.equal(ret2.length, 1);
    assert.equal(ret2[0]._id, 'aaron');
    assert.equal(ret2[0].value, 3);
    assert.ok(stats2);

    const o3 = {
      map: function() {
        emit(this.author, { own: magicID });
      },
      scope: { magicID: magicID },
      reduce: function(k, vals) {
        return { own: vals[0].own, count: vals.length };
      },
      out: { replace: '_mapreduce_test_' + random() }
    };

    const res3 = await MR.mapReduce(o3);

    const model = res3.model;

    // ret is a model
    assert.equal(typeof model.findOne, 'function');
    assert.equal(typeof model.mapReduce, 'function');

    // queries work
    const docs3 = await model.where('value.count').gt(1).sort({ _id: 1 }).exec();

    assert.equal(docs3[0]._id, 'aaron');
    assert.equal(docs3[1]._id, 'brian');
    assert.equal(docs3[2]._id, 'guillermo');
    assert.equal(docs3[3]._id, 'nathan');

    // update casting works
    const doc2 = await model.findOneAndUpdate({ _id: 'aaron' }, { published: true }, { new: true });

    assert.ok(doc2);
    assert.equal(doc2._id, 'aaron');
    assert.equal(doc2.published, true);

    // ad-hoc population works
    const doc3 = await model
      .findOne({ _id: 'aaron' })
      .populate({ path: 'value.own', model: 'MapReduce', strictPopulate: false })
      .exec();

    assert.equal(doc3.value.own.author, 'guillermo');
  });

  it('withholds stats with false verbosity', async function() {
    const MR = db.model('MapReduce', BlogPost);

    const o = {
      map: function() {
      },
      reduce: function() {
        return 'test';
      },
      verbose: false
    };

    assert.deepEqual(await MR.mapReduce(o), []);
    assert.equal(typeof stats, 'undefined');
  });

  describe('promises (gh-1628)', function() {
    it('are returned', function() {
      const MR = db.model('MapReduce', BlogPost);

      const o = {
        map: function() {
        },
        reduce: function() {
          return 'test';
        }
      };

      const promise = MR.mapReduce(o);
      assert.ok(promise instanceof mongoose.Promise);
    });
  });

  describe('with promises', function() {
    let MR;
    let db;
    let magicID;
    let id;
    const docs = [];

    before(async function() {
      db = start();
      MR = db.model('MapReduce', BlogPost);

      id = new mongoose.Types.ObjectId();
      const authors = 'aaron guillermo brian nathan'.split(' ');
      const num = 10;
      for (let i = 0; i < num; ++i) {
        docs.push({ author: authors[i % authors.length], owners: [id], published: true });
      }

      const [b] = await MR.create(docs);
      magicID = b._id;
    });

    after(async function() {
      await db.close();
    });

    it('works', function() {
      const o = {
        map: function() {
          emit(this.author, 1);
        },
        reduce: function(k, vals) {
          return vals.length;
        }
      };

      return MR.mapReduce(o).then(function(res) {
        const ret = res.results;
        assert.ok(Array.isArray(ret));
        ret.forEach(function(res) {
          if (res._id === 'aaron') {
            assert.equal(res.value, 6);
          }
          if (res._id === 'guillermo') {
            assert.equal(res.value, 6);
          }
          if (res._id === 'brian') {
            assert.equal(res.value, 4);
          }
          if (res._id === 'nathan') {
            assert.equal(res.value, 4);
          }
        });
      });
    });

    it('works with model', function() {
      const o = {
        map: function() {
          emit(this.author, { own: magicID });
        },
        scope: { magicID: magicID },
        reduce: function(k, vals) {
          return { own: vals[0].own, count: vals.length };
        },
        out: { replace: '_mapreduce_test_' + random() }
      };

      return MR.mapReduce(o).
        then(function(res) {
          const ret = res.model;
          // ret is a model
          assert.ok(!Array.isArray(ret));
          assert.equal(typeof ret.findOne, 'function');
          assert.equal(typeof ret.mapReduce, 'function');

          // queries work
          return ret.where('value.count').gt(1).sort({ _id: 1 });
        }).
        then(function(docs) {
          assert.equal(docs[0]._id, 'aaron');
          assert.equal(docs[1]._id, 'brian');
          assert.equal(docs[2]._id, 'guillermo');
          assert.equal(docs[3]._id, 'nathan');
        });
    });
  });

  it('withholds stats with false verbosity using then', async function() {
    const MR = db.model('MapReduce', BlogPost);

    const o = {
      map: function() {
      },
      reduce: function() {
        return 'test';
      },
      verbose: false
    };

    const { stats } = await MR.mapReduce(o);
    assert.equal(typeof stats, 'undefined');
  });
});
