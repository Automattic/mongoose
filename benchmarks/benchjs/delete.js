'use strict';
const mongoose = require('../../lib');
const Benchmark = require('benchmark');

const suite = new Benchmark.Suite();

const Schema = mongoose.Schema;
const mongoClient = require('mongodb').MongoClient;

// to make things work in the way the are normally described online...
/*
 *global.Schema = Schema;
 *global.mongoose = mongoose;
 */

/**
 * These are all the benchmark tests for deleting data
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

    const UserSchema = new Schema({
      name: String,
      age: Number,
      likes: [String],
      address: String,
    });

    const User = mongoose.model('User', UserSchema);
    const user = db.collection('user');

    const mIds = [];
    const dIds = [];

    const data = {
      name: 'name',
      age: 0,
      likes: ['dogs', 'cats', 'pizza'],
      address: ' Nowhere-ville USA',
    };

    // insert all of the data here
    let count = 1000;
    for (let i = 0; i < 500; i++) {
      User.create(data, function (err, u) {
        if (err) {
          throw err;
        }
        mIds.push(u.id);
        --count || next();
      });
      const nData = {};
      nData.name = data.name;
      nData.age = data.age;
      nData.likes = data.likes;
      nData.address = data.address;
      user.insertOne(nData, function (err, res) {
        dIds.push(res.insertedId);
        --count || next();
      });
    }

    function closeDB() {
      User.count(function (err, res) {
        if (res !== 0) {
          console.log('Still mongoose entries left...');
        }
        mongoose.disconnect();
      });
      user.count({}, function (err, res) {
        if (res !== 0) {
          console.log('Still driver entries left...');
        }
        if (err) {
          throw err;
        }
        client.close();
      });
    }

    suite
      .add('Delete - Mongoose', {
        defer: true,
        fn: function (deferred) {
          User.remove({ _id: mIds.pop() }, function (err) {
            if (err) {
              throw err;
            }
            deferred.resolve();
          });
        },
      })
      .add('Delete - Driver', {
        defer: true,
        fn: function (deferred) {
          user.deleteOne({ _id: dIds.pop() }, function (err) {
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
