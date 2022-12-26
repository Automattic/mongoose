'use strict';

const mongoose = require('../../lib');
const Benchmark = require('benchmark');

const suite = new Benchmark.Suite();

const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;
const mongoClient = require('mongodb').MongoClient;
const utils = require('../../lib/utils.js');

// to make things work in the way the are normally described online...
/*
 *global.Schema = Schema;
 *global.mongoose = mongoose;
 */

/**
 * These are all the benchmark tests for reading data
 */

mongoose.connect('mongodb://127.0.0.1/mongoose-bench', function (err) {
  if (err) {
    throw err;
  }
  mongoClient.connect('mongodb://127.0.0.1', function (err, client) {
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
      comments: [{ title: 'second level', date: new Date(), body: 'texttt' }],
    };
    for (let i = 0; i < 5; i++) {
      blogData.comments.push(commentData);
    }
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

    const mIds = [];
    const dIds = [];

    const bmIds = [];
    const bdIds = [];

    const data = {
      name: 'name',
      age: 0,
      likes: ['dogs', 'cats', 'pizza'],
      address: ' Nowhere-ville USA',
    };

    // insert all of the data here
    let count = 4000;
    for (let i = 0; i < 1000; i++) {
      data.age = Math.floor(Math.random() * 50);
      User.create(data, function (err, u) {
        if (err) {
          throw err;
        }
        mIds.push(u.id);
        --count || next();
      });
      const nData = utils.clone(data);
      user.insertOne(nData, function (err, res) {
        if (err) {
          throw err;
        }
        dIds.push(res.insertedId);
        --count || next();
      });
      BlogPost.create(blogData, function (err, bp) {
        if (err) {
          throw err;
        }
        bmIds.push(bp.id);
        --count || next();
      });

      const bpData = utils.clone(blogData);
      blogpost.insertOne(bpData, function (err, res) {
        if (err) {
          throw err;
        }
        bdIds.push(res.insertedId);
        --count || next();
      });
    }

    let mi = 0,
      di = 0,
      bmi = 0,
      bdi = 0;

    function getNextmId() {
      mi = ++mi % mIds.length;
      return mIds[mi];
    }

    function getNextdId() {
      di = ++di % dIds.length;
      return dIds[di];
    }

    function getNextbmId() {
      bmi = ++bmi % bmIds.length;
      return bmIds[bmi];
    }

    function getNextbdId() {
      bdi = ++bdi % bdIds.length;
      return bdIds[bdi];
    }

    function closeDB() {
      mongoose.connection.db.dropDatabase(function () {
        mongoose.disconnect();
        process.exit();
      });
    }

    suite
      .add('Read - Mongoose - Basic', {
        defer: true,
        fn: function (deferred) {
          User.findOne({ _id: getNextmId() }, function (err) {
            if (err) {
              throw err;
            }
            deferred.resolve();
          });
        },
      })
      .add('Read - Driver - Basic', {
        defer: true,
        fn: function (deferred) {
          user.findOne({ _id: getNextdId() }, function (err) {
            if (err) {
              throw err;
            }
            deferred.resolve();
          });
        },
      })
      .add('Read - Mongoose - With lean', {
        defer: true,
        fn: function (deferred) {
          User.findOne(
            { _id: getNextmId() },
            {},
            { lean: true },
            function (err) {
              if (err) {
                throw err;
              }
              deferred.resolve();
            }
          );
        },
      })
      .add('Read - Mongoose - Multiple Items', {
        defer: true,
        fn: function (deferred) {
          const ids = [];
          for (let i = 0; i < 25; i++) {
            ids.push(getNextmId());
          }
          User.find({ _id: { $in: ids } }, function (err) {
            if (err) {
              throw err;
            }
            deferred.resolve();
          });
        },
      })
      .add('Read - Driver - Multiple Items', {
        defer: true,
        fn: function (deferred) {
          const ids = [];
          for (let i = 0; i < 25; i++) {
            ids.push(getNextdId());
          }
          user.find({ _id: { $in: ids } }).toArray(function (err) {
            if (err) {
              throw err;
            }
            deferred.resolve();
          });
        },
      })
      .add('Read - Mongoose - Non-index', {
        defer: true,
        fn: function (deferred) {
          const age = Math.floor(Math.random() * 50);

          User.find({ age: age }, function (err) {
            if (err) {
              throw err;
            }
            deferred.resolve();
          });
        },
      })
      .add('Read - Driver - Non-index', {
        defer: true,
        fn: function (deferred) {
          const age = Math.floor(Math.random() * 50);

          user.find({ age: age }).toArray(function (err) {
            if (err) {
              throw err;
            }
            deferred.resolve();
          });
        },
      })
      .add('Read - Mongoose - Embedded Docs', {
        defer: true,
        fn: function (deferred) {
          BlogPost.find({ _id: getNextbmId() }, function (err) {
            if (err) {
              throw err;
            }
            deferred.resolve();
          });
        },
      })
      .add('Read - Driver - Embedded Docs', {
        defer: true,
        fn: function (deferred) {
          blogpost.find({ _id: getNextbdId() }).toArray(function (err) {
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
      });
    function next() {
      suite.run({ async: true });
    }
  });
});
