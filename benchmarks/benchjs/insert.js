var mongoose = require('../../lib');
var Benchmark = require('benchmark');

var suite = new Benchmark.Suite();

var Schema = mongoose.Schema;
var mongo = require('mongodb');
var utils = require('../../lib/utils.js');
var ObjectId = Schema.Types.ObjectId;

// to make things work in the way the are normally described online...
/*
 *global.Schema = Schema;
 *global.mongoose = mongoose;
 */

/**
 * These are all the benchmark tests for inserting data
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
      def: {
        type: String,
        default: 'kandinsky'
      }
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
      comments: [{
        title: 'second level',
        date: new Date(),
        body: 'texttt'
      }]
    };
    for (var i = 0; i < 5; i++) {
      blogData.comments.push(commentData);
    }
    var data = {
      name: 'name',
      age: 0,
      likes: ['dogs', 'cats', 'pizza'],
      address: ' Nowhere-ville USA'
    };

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

    function closeDB() {
      mongoose.connection.db.dropDatabase(function() {
        mongoose.disconnect();
        process.exit();
      });
    }

    suite.add('Insert - Mongoose - Basic', {
      defer: true,
      fn: function(deferred) {
        var nData = utils.clone(data);
        User.create(nData, function(err) {
          if (err) {
            throw err;
          }
          deferred.resolve();
        });
      }
    }).add('Insert - Driver - Basic', {
      defer: true,
      fn: function(deferred) {
        var nData = utils.clone(data);
        user.insert(nData, function(err) {
          if (err) {
            throw err;
          }
          deferred.resolve();
        });
      }
    }).add('Insert - Mongoose - Embedded Docs', {
      defer: true,
      fn: function(deferred) {
        var bp = utils.clone(blogData);
        BlogPost.create(bp, function(err) {
          if (err) {
            throw err;
          }
          deferred.resolve();
        });
      }
    }).add('Insert - Driver - Embedded Docs', {
      defer: true,
      fn: function(deferred) {
        var bp = utils.clone(blogData);
        blogpost.insert(bp, function(err) {
          if (err) {
            throw err;
          }
          deferred.resolve();
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
    }).run({async: true});
  });
});
