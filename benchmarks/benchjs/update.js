var mongoose = require('../../lib');
var Benchmark = require('benchmark');

var suite = new Benchmark.Suite();

var Schema = mongoose.Schema;
var mongo = require('mongodb');
var ObjectId = Schema.Types.ObjectId;
var utils = require('../../lib/utils.js');

// to make things work in the way the are normally described online...
/*
 *global.Schema = Schema;
 *global.mongoose = mongoose;
 */

/**
 * These are all the benchmark tests for updating data
 */


mongoose.connect('mongodb://localhost/mongoose-bench', function(err) {
  if (err) {
    throw err;
  }
  mongo.connect('mongodb://localhost/mongoose-bench', function(err, db) {
    if (err) {
      throw err;
    }

    var Comments = new Schema;
    Comments.add({
      title: String,
      date: Date,
      body: String,
      comments: [Comments]
    });

    var BlogPost = new Schema({
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
      def: {type: String, default: 'kandinsky'}
    });

    var blogData = {
      title: 'dummy post',
      author: 'somebody',
      slug: 'test.post',
      date: new Date(),
      meta: {date: new Date(), visitors: 9001},
      published: true,
      mixed: {thisIsRandom: true},
      numbers: [1, 2, 7, 10, 23432],
      tags: ['test', 'BENCH', 'things', 'more things'],
      def: 'THANGS!!!',
      comments: []
    };
    var commentData = {
      title: 'test comment',
      date: new Date(),
      body: 'this be some crazzzyyyyy text that would go in a comment',
      comments: [{title: 'second level', date: new Date(), body: 'texttt'}]
    };
    for (var i = 0; i < 5; i++) {
      blogData.comments.push(commentData);
    }
    var UserSchema = new Schema({
      name: String,
      age: Number,
      likes: [String],
      address: String
    });

    var User = mongoose.model('User', UserSchema);
    BlogPost = mongoose.model('BlogPost', BlogPost);
    var user = db.collection('user');
    var blogpost = db.collection('blogpost');

    var mIds = [];
    var dIds = [];

    var bmIds = [];
    var bdIds = [];

    var data = {
      name: 'name',
      age: 0,
      likes: ['dogs', 'cats', 'pizza'],
      address: ' Nowhere-ville USA'
    };

    // this is for some of the update tests below
    var testBp;
    // insert all of the data here
    var count = 4000;
    for (i = 0; i < 1000; i++) {
      User.create(data, function(err, u) {
        if (err) {
          throw err;
        }
        mIds.push(u.id);
        --count || next();
      });
      var nData = utils.clone(data);
      user.insert(nData, function(err, res) {
        dIds.push(res.insertedIds[0]);
        --count || next();
      });
      BlogPost.create(blogData, function(err, bp) {
        if (err) {
          throw err;
        }
        bmIds.push(bp.id);
        testBp = bp;
        --count || next();
      });

      var bpData = utils.clone(blogData);
      blogpost.insert(bpData, function(err, res) {
        if (err) {
          throw err;
        }
        bdIds.push(res.insertedIds[0]);
        --count || next();
      });
    }

    var mi = 0,
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
      mongoose.connection.db.dropDatabase(function() {
        mongoose.disconnect();
        process.exit();
      });
    }

    suite.add('Update - Mongoose - Basic', {
      defer: true,
      fn: function(deferred) {
        User.update({_id: getNextmId()}, {$set: {age: 2}, $push: {likes: 'metal'}}, function(err) {
          if (err) {
            throw err;
          }
          deferred.resolve();
        });
      }
    }).add('Update - Driver - Basic', {
      defer: true,
      fn: function(deferred) {
        user.update({_id: getNextdId()}, {$set: {age: 2}, $push: {likes: 'metal'}}, function(err) {
          if (err) {
            throw err;
          }
          deferred.resolve();
        });
      }
    }).add('Update - Mongoose - Embedded Docs', {
      defer: true,
      fn: function(deferred) {
        BlogPost.findOne({_id: getNextbmId()}, function(err, bp) {
          if (err) {
            throw err;
          }
          bp.comments[3].title = 'this is a new title';
          bp.comments[0].date = new Date();
          bp.comments.push(commentData);
          // save in Mongoose behaves differently than it does in the driver.
          // The driver will send the full document, while mongoose will check
          // and only update fields that have been changed. This is meant to
          // illustrate that difference between the two
          bp.save(function(err) {
            if (err) {
              throw err;
            }
            deferred.resolve();
          });
        });
      }
    }).add('Update - Driver - Embdedded Docs', {
      defer: true,
      fn: function(deferred) {
        blogpost.findOne({_id: getNextbdId()}, function(err, bp) {
          if (err) {
            throw err;
          }
          bp.comments[3].title = 'this is a new title';
          bp.comments[0].date = new Date();
          bp.comments.push(commentData);
          blogpost.save(bp, function(err) {
            if (err) {
              throw err;
            }
            deferred.resolve();
          });
        });
      }
    }).add('Update - Mongoose - Multiple Documents', {
      defer: true,
      fn: function(deferred) {
        var ids = [];
        for (var i = 0; i < 50; i++) {
          ids.push(getNextmId());
        }
        User.update({_id: {$in: ids}}, {$set: {age: 2}, $push: {likes: 'metal'}}, function(err) {
          if (err) {
            throw err;
          }
          deferred.resolve();
        });
      }
    }).add('Update - Driver - Multiple Documents', {
      defer: true,
      fn: function(deferred) {
        var ids = [];
        for (var i = 0; i < 50; i++) {
          ids.push(getNextdId());
        }
        user.update({_id: {$in: ids}}, {$set: {age: 2}, $push: {likes: 'metal'}}, function(err) {
          if (err) {
            throw err;
          }
          deferred.resolve();
        });
      }
    }).add('Update - Mongoose - pop and push', {
      defer: true,
      fn: function(deferred) {
        testBp.comments.push(commentData);
        testBp.comments.$shift();
        testBp.save(function(err) {
          if (err) {
            throw err;
          }
          deferred.resolve();
        });
      }
    }).add('Update - Mongoose - Array Manipulation, parallel ops', {
      defer: true,
      fn: function(deferred) {
        var done = false;
        BlogPost.update({_id: testBp.id}, {$pop: {comments: -1}}, function(err) {
          if (err) {
            throw err;
          }
          done && deferred.resolve();
          done = true;
        });
        BlogPost.update({_id: testBp.id}, {$push: {comments: commentData}}, function(err) {
          if (err) {
            throw err;
          }
          done && deferred.resolve();
          done = true;
        });
      }
    }).add('Update - Mongoose - findOneAndModify', {
      defer: true,
      fn: function(deferred) {
        BlogPost.findOneAndUpdate({_id: getNextbmId()}, {$set: {age: 2}, $push: {likes: 'metal'}}, function(err) {
          if (err) {
            throw err;
          }
          deferred.resolve();
        });
      }
    }).add('Update - Mongoose - find and update, separate ops', {
      defer: true,
      fn: function(deferred) {
        BlogPost.findOne({_id: getNextbmId()}, function(err, bp) {
          if (err) {
            throw err;
          }
          bp.update({$set: {age: 2}, $push: {likes: 'metal'}}, function(err) {
            if (err) {
              throw err;
            }
            deferred.resolve();
          });
        });
      }
    })
    .on('cycle', function(evt) {
      if (process.env.MONGOOSE_DEV || process.env.PULL_REQUEST) {
        console.log(String(evt.target));
      }
    }).on('complete', function() {
      closeDB();
      if (!process.env.MONGOOSE_DEV && !process.env.PULL_REQUEST) {
        var outObj = {};
        this.forEach(function(item) {
          var out = {};
          out.stats = item.stats;
          delete out.stats.sample;
          out.ops = item.hz;
          outObj[item.name.replace(/\s/g, '')] = out;
        });
        console.dir(outObj, {depth: null, colors: true});
      }
    });
    function next() {
      for (var i = 0; i < 100; i++) {
        testBp.comments.push(commentData);
      }
      testBp.save(function(err) {
        if (err) {
          throw err;
        }
        suite.run({async: true});
      });
    }
  });
});
