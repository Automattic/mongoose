'use strict';
const mongoose = require('../../lib');
const Benchmark = require('benchmark');

const suite = new Benchmark.Suite();

const Schema = mongoose.Schema;
const mongoClient = require('mongodb').MongoClient;
const utils = require('../../lib/utils.js');
const ObjectId = Schema.Types.ObjectId;

mongoose.connect('mongodb://localhost/mongoose-bench', function (err) {
  if (err) {
    throw err;
  }
  mongoClient.connect('mongodb://localhost/mongoose-bench', function (err, client) {
    if (err) {
      throw err;
    }

    const db = client.db('mongoose-bench');

    const Comments = new Schema();
    Comments.add({
      title: String,
      date: Date,
      body: String,
      comments: [Comments]
    });

    let BlogPost = new Schema({
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
      owners: [ObjectId],
      comments: [Comments],
      def: {
        type: String,
        default: 'kandinsky'
      }
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
      comments: []
    };
    const commentData = {
      title: 'test comment',
      date: new Date(),
      body: 'this be some crazzzyyyyy text that would go in a comment',
      comments: [{
        title: 'second level',
        date: new Date(),
        body: 'texttt'
      }]
    };
    for (let i = 0; i < 5; i++) {
      blogData.comments.push(commentData);
    }
    BlogPost = mongoose.model('BlogPost', BlogPost);

    function closeDB() {
      mongoose.connection.db.dropDatabase(function () {
        mongoose.disconnect();
        process.exit();
      });
    }

    const nData = new Array(1).fill(utils.clone(blogData));

    suite
      .add('insertMany', {
        defer: true,
        fn: function (deferred) {
          BlogPost.insertMany(nData, function (err) {
            if (err) {
              throw err;
            }
            deferred.resolve();
          });
        }
      })
      .add('insertMany - rawResult', {
        defer: true,
        fn: function (deferred) {
          BlogPost.insertMany(nData, { rawResult: true }, function (err) {
            if (err) {
              throw err;
            }
            deferred.resolve();
          });
        }
      })
      .add('insertMany - lean', {
        defer: true,
        fn: function (deferred) {
          BlogPost.insertMany(nData, { lean: true }, function (err) {
            if (err) {
              throw err;
            }
            deferred.resolve();
          });
        }
      })
      .on('cycle', function (evt) {
        if (process.env.MONGOOSE_DEV || process.env.PULL_REQUEST) {
          console.log(String(evt.target));
        }
      })
      .on('complete', function () {
        closeDB();
      }).run({ async: true, delay: 0 });
  });
});
