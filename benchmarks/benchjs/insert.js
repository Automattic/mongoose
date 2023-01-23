'use strict';
const mongoose = require('../../lib');
const Benchmark = require('benchmark');

const suite = new Benchmark.Suite();

const Schema = mongoose.Schema;
const mongoClient = require('mongodb').MongoClient;
const utils = require('../../lib/utils.js');
const ObjectId = Schema.Types.ObjectId;

// to make things work in the way the are normally described online...
/*
 *global.Schema = Schema;
 *global.mongoose = mongoose;
 */

/**
 * These are all the benchmark tests for inserting data
 */

mongoose.connect('mongodb://127.0.0.1/mongoose-bench', function (err) {
  if (err) {
    throw err;
  }
  mongoClient.connect(
    'mongodb://127.0.0.1/mongoose-bench',
    function (err, client) {
      if (err) {
        throw err;
      }

      const db = client.db('mongoose-bench');

      const Comments = new Schema();
      Comments.add({
        title: String,
        date: Date,
        body: String,
        comments: [Comments],
      });

      let BlogPost = new Schema({
        title: String,
        author: String,
        slug: String,
        date: Date,
        meta: {
          date: Date,
          visitors: Number,
        },
        published: Boolean,
        mixed: {},
        numbers: [Number],
        tags: [String],
        owners: [ObjectId],
        comments: [Comments],
        def: {
          type: String,
          default: 'kandinsky',
        },
      });

      const blogData = {
        title: 'dummy post',
        author: 'somebody',
        slug: 'test.post',
        date: new Date(),
        meta: { date: new Date(), visitors: 9001 },
        published: true,
        mixed: { thisIsRandom: true },
        numbers: [1, 2, 7, 10, 23432],
        tags: ['test', 'BENCH', 'things', 'more things'],
        def: 'THANGS!!!',
        comments: [],
      };
      const commentData = {
        title: 'test comment',
        date: new Date(),
        body: 'this be some crazzzyyyyy text that would go in a comment',
        comments: [
          {
            title: 'second level',
            date: new Date(),
            body: 'texttt',
          },
        ],
      };
      for (let i = 0; i < 5; i++) {
        blogData.comments.push(commentData);
      }
      const data = {
        name: 'name',
        age: 0,
        likes: ['dogs', 'cats', 'pizza'],
        address: ' Nowhere-ville USA',
      };

      const UserSchema = new Schema({
        name: String,
        age: Number,
        likes: [String],
        address: String,
      });

      const User = mongoose.model('User', UserSchema);
      BlogPost = mongoose.model('BlogPost', BlogPost);
      const user = db.collection('user');
      const blogpost = db.collection('blogpost');

      function closeDB() {
        mongoose.connection.db.dropDatabase(function () {
          mongoose.disconnect();
          process.exit();
        });
      }

      suite
        .add('Insert - Mongoose - Basic', {
          defer: true,
          fn: function (deferred) {
            const nData = utils.clone(data);
            User.create(nData, function (err) {
              if (err) {
                throw err;
              }
              deferred.resolve();
            });
          },
        })
        .add('Insert - Driver - Basic', {
          defer: true,
          fn: function (deferred) {
            const nData = utils.clone(data);
            user.insertOne(nData, function (err) {
              if (err) {
                throw err;
              }
              deferred.resolve();
            });
          },
        })
        .add('Insert - Mongoose - Embedded Docs', {
          defer: true,
          fn: function (deferred) {
            const bp = utils.clone(blogData);
            BlogPost.create(bp, function (err) {
              if (err) {
                throw err;
              }
              deferred.resolve();
            });
          },
        })
        .add('Insert - Driver - Embedded Docs', {
          defer: true,
          fn: function (deferred) {
            const bp = utils.clone(blogData);
            blogpost.insertOne(bp, function (err) {
              if (err) {
                throw err;
              }
              deferred.resolve();
            });
          },
        })
        .on('cycle', function (evt) {
          if (process.env.MONGOOSE_DEV || process.env.PULL_REQUEST) {
            console.log(String(evt.target));
          }
        })
        .on('complete', function () {
          closeDB();
          if (!process.env.MONGOOSE_DEV && !process.env.PULL_REQUEST) {
            const outObj = {};
            this.forEach(function (item) {
              const out = {};
              out.stats = item.stats;
              delete out.stats.sample;
              out.ops = item.hz;
              outObj[item.name.replace(/\s/g, '')] = out;
            });
            console.dir(outObj, { depth: null, colors: true });
          }
        })
        .run({ async: true });
    }
  );
});
