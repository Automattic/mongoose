var mongoose = require('../../lib');
var Benchmark = require('benchmark');

var suite = new Benchmark.Suite();

var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;
var utils = require('../../lib/utils.js');

// to make things work in the way the are normally described online...
/*
 *global.Schema = Schema;
 *global.mongoose = mongoose;
 */

/**
 * These are all the benchmark tests for population ops
 */


mongoose.connect('mongodb://localhost/mongoose-bench-pop', function(err) {
  if (err) {
    throw err;
  }

  var commentSchema = new Schema;
  commentSchema.add({
    title: String,
    date: Date,
    body: String
  });
  var dummy1Schema = new Schema({
    title: String,
    isThisTest: Boolean
  });
  var dummy2Schema = new Schema({
    title: String,
    isThisTest: Boolean
  });
  var dummy3Schema = new Schema({
    title: String,
    isThisTest: Boolean
  });
  var dummy4Schema = new Schema({
    title: String,
    isThisTest: Boolean
  });
  var dummy5Schema = new Schema({
    title: String,
    isThisTest: Boolean
  });
  var dummy6Schema = new Schema({
    title: String,
    isThisTest: Boolean
  });
  var dummy7Schema = new Schema({
    title: String,
    isThisTest: Boolean
  });
  var dummy8Schema = new Schema({
    title: String,
    isThisTest: Boolean
  });
  var dummy9Schema = new Schema({
    title: String,
    isThisTest: Boolean
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
    comments: [{type: ObjectId, ref: 'Comment'}],
    dummy1: [{type: ObjectId, ref: 'Dummy1'}],
    dummy2: [{type: ObjectId, ref: 'Dummy2'}],
    dummy3: [{type: ObjectId, ref: 'Dummy3'}],
    dummy4: [{type: ObjectId, ref: 'Dummy4'}],
    dummy5: [{type: ObjectId, ref: 'Dummy5'}],
    dummy6: [{type: ObjectId, ref: 'Dummy6'}],
    dummy7: [{type: ObjectId, ref: 'Dummy7'}],
    dummy8: [{type: ObjectId, ref: 'Dummy8'}],
    dummy9: [{type: ObjectId, ref: 'Dummy9'}],
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
    comments: [],
    dummy1: [],
    dummy2: [],
    dummy3: [],
    dummy4: [],
    dummy5: [],
    dummy6: [],
    dummy7: [],
    dummy8: [],
    dummy9: []
  };
  var commentData = {
    title: 'test comment',
    date: new Date(),
    body: 'this be some crazzzyyyyy text that would go in a comment'
  };
  var dummyData = {
    title: 'dummy data~',
    isThisTest: true
  };
  var Comments = mongoose.model('Comment', commentSchema);
  BlogPost = mongoose.model('BlogPost', BlogPost);
  var Dummy1 = mongoose.model('Dummy1', dummy1Schema);
  var Dummy2 = mongoose.model('Dummy2', dummy2Schema);
  var Dummy3 = mongoose.model('Dummy3', dummy3Schema);
  var Dummy4 = mongoose.model('Dummy4', dummy4Schema);
  var Dummy5 = mongoose.model('Dummy5', dummy5Schema);
  var Dummy6 = mongoose.model('Dummy6', dummy6Schema);
  var Dummy7 = mongoose.model('Dummy7', dummy7Schema);
  var Dummy8 = mongoose.model('Dummy8', dummy8Schema);
  var Dummy9 = mongoose.model('Dummy9', dummy9Schema);
  var cIds = [];
  var dIds = [];
  for (var i = 0; i < 9; i++) {
    dIds.push([]);
  }

  var cn = 5000;
  for (i = 0; i < 500; i++) {
    Comments.create(commentData, function(err, com) {
      cIds.push(com.id);
      --cn || cont();
    });
    Dummy1.create(dummyData, function(err, d) {
      if (err) {
        throw err;
      }
      dIds[0].push(d.id);
      --cn || cont();
    });
    Dummy2.create(dummyData, function(err, d) {
      if (err) {
        throw err;
      }
      dIds[1].push(d.id);
      --cn || cont();
    });
    Dummy3.create(dummyData, function(err, d) {
      if (err) {
        throw err;
      }
      dIds[2].push(d.id);
      --cn || cont();
    });
    Dummy4.create(dummyData, function(err, d) {
      if (err) {
        throw err;
      }
      dIds[3].push(d.id);
      --cn || cont();
    });
    Dummy5.create(dummyData, function(err, d) {
      if (err) {
        throw err;
      }
      dIds[4].push(d.id);
      --cn || cont();
    });
    Dummy6.create(dummyData, function(err, d) {
      if (err) {
        throw err;
      }
      dIds[5].push(d.id);
      --cn || cont();
    });
    Dummy7.create(dummyData, function(err, d) {
      if (err) {
        throw err;
      }
      dIds[6].push(d.id);
      --cn || cont();
    });
    Dummy8.create(dummyData, function(err, d) {
      if (err) {
        throw err;
      }
      dIds[7].push(d.id);
      --cn || cont();
    });
    Dummy9.create(dummyData, function(err, d) {
      if (err) {
        throw err;
      }
      dIds[8].push(d.id);
      --cn || cont();
    });
  }

  var blog = [];

  function cont() {
    blog[0] = utils.clone(blogData);
    blog[1] = utils.clone(blogData);
    blog[2] = utils.clone(blogData);
    blog[3] = utils.clone(blogData);
    blogData.comments.push(getNextcId());
    blog[4] = blogData;

    blog[5] = utils.clone(blogData);
    blog[6] = utils.clone(blogData);

    for (var i = 0; i < 10; i++) {
      blog[0].comments.push(getNextcId());
    }
    for (i = 0; i < 100; i++) {
      blog[1].comments.push(getNextcId());
    }
    for (i = 0; i < 1000; i++) {
      blog[2].comments.push(getNextcId());
    }
    for (i = 0; i < 10000; i++) {
      blog[3].comments.push(getNextcId());
    }
    for (i = 0; i < 100; i++) {
      blog[5].comments.push(getNextcId());
      blog[6].comments.push(getNextcId());

      blog[5].dummy1.push(getNextdId(0));
      blog[5].dummy2.push(getNextdId(1));
      blog[5].dummy3.push(getNextdId(2));
      blog[5].dummy4.push(getNextdId(3));

      blog[6].dummy1.push(getNextdId(0));
      blog[6].dummy2.push(getNextdId(1));
      blog[6].dummy3.push(getNextdId(2));
      blog[6].dummy4.push(getNextdId(3));
      blog[6].dummy5.push(getNextdId(4));
      blog[6].dummy1.push(getNextdId(5));
      blog[6].dummy2.push(getNextdId(6));
      blog[6].dummy3.push(getNextdId(7));
      blog[6].dummy4.push(getNextdId(8));
    }

    var count = 7;

    function iter(c) {
      BlogPost.create(blog[c], function(err, bl) {
        if (err) {
          throw err;
        }
        blog[c] = bl;
        --count || next();
      });
    }

    // insert all of the data here
    for (i = 0; i < blog.length; i++) {
      // use some closure magic to make sure we retain the index
      iter(i);
    }
  }

  var ci = 0;
  var di = [];
  for (i = 0; i < 9; i++) {
    di.push(0);
  }

  function getNextcId() {
    ci = ++ci % cIds.length;
    return cIds[ci];
  }

  function getNextdId(i) {
    di[i] = ++di[i] % dIds[i].length;
    return dIds[i][di[i]];
  }


  function closeDB() {
    // just a bit simpler...
    mongoose.connection.db.dropDatabase(function() {
      mongoose.disconnect();
      process.exit();
    });
  }

  suite.add('Populate - 1 value', {
    defer: true,
    fn: function(deferred) {
      blog[4].populate('comments', function(err) {
        if (err) {
          throw err;
        }
        deferred.resolve();
      });
    }
  }).add('Populate - 10 values', {
    defer: true,
    fn: function(deferred) {
      blog[0].populate('comments', function(err) {
        if (err) {
          throw err;
        }
        deferred.resolve();
      });
    }
  }).add('Populate - 100 values', {
    defer: true,
    fn: function(deferred) {
      blog[1].populate('comments', function(err) {
        if (err) {
          throw err;
        }
        deferred.resolve();
      });
    }
  }).add('Populate - 1000 values', {
    defer: true,
    fn: function(deferred) {
      blog[2].populate('comments', function(err) {
        if (err) {
          throw err;
        }
        deferred.resolve();
      });
    }
  }).add('Populate - 10000 values', {
    defer: true,
    fn: function(deferred) {
      blog[3].populate('comments', function(err) {
        if (err) {
          throw err;
        }
        deferred.resolve();
      });
    }
  }).add('Populate - 5 properties', {
    defer: true,
    fn: function(deferred) {
      blog[5].populate('comments dummy1 dummy2 dummy3 dummy4', function(err) {
        if (err) {
          throw err;
        }
        deferred.resolve();
      });
    }
  }).add('Populate - 10 properties', {
    defer: true,
    fn: function(deferred) {
      blog[6].populate('comments dummy1 dummy2 dummy3 dummy4 dummy5 dummy6 dummy7 dummy8 dummy9', function(err) {
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
  });
  function next() {
    suite.run({async: true});
  }
});
