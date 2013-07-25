
var mongoose = require('../../lib');
var Benchmark = require('benchmark');

var suite = new Benchmark.Suite();

var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;
var mongo = require('mongodb');
var utils = require('../../lib/utils.js');

// to make things work in the way the are normally described online...
/*
 *global.Schema = Schema;
 *global.mongoose = mongoose;
 */

/**
 * These are all the benchmark tests for population ops
 */


mongoose.connect('mongodb://localhost/mongoose-bench', function (err) {
  if (err) throw err;

  var commentSchema = new Schema;
  commentSchema.add({
      title     : String
    , date      : Date
    , body      : String
  });
  var BlogPost = new Schema({
      title     : String
    , author    : String
    , slug      : String
    , date      : Date
    , meta      : {
          date      : Date
        , visitors  : Number
      }
    , published : Boolean
    , mixed     : {}
    , numbers   : [Number]
    , tags      : [String]
    , owners    : [ObjectId]
    , comments  : [{ type : ObjectId, ref : 'Comment' }]
    , def       : { type: String, default: 'kandinsky' }
  });

  var blogData = {
    title : 'dummy post',
    author : 'somebody',
    slug : 'test.post',
    date : new Date(),
    meta : { date : new Date(), visitors: 9001},
    published : true,
    mixed : { thisIsRandom : true },
    numbers : [1,2,7,10,23432],
    tags : ['test', 'BENCH', 'things', 'more things'],
    def : 'THANGS!!!',
    comments : []
  };
  var commentData = {
    title : 'test comment',
    date : new Date(),
    body : 'this be some crazzzyyyyy text that would go in a comment'
  };
  var Comments = mongoose.model('Comment', commentSchema);
  var BlogPost = mongoose.model('BlogPost', BlogPost);
  var cIds = [];
  var cn = 500;
  for (var i=0; i < 500; i++) {
    Comments.create(commentData, function (err, com) {
      cIds.push(com.id);
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

    for (var i=0; i < 10; i++) {
      blog[0].comments.push(getNextcId());
    }
    for (var i=0; i < 100; i++) {
      blog[1].comments.push(getNextcId());
    }
    for (var i=0; i < 1000; i++) {
      blog[2].comments.push(getNextcId());
    }
    for (var i=0; i < 10000; i++) {
      blog[3].comments.push(getNextcId());
    }

    // insert all of the data here
    var count = 5;
    for (var i=0; i < blog.length; i++) {
      BlogPost.create(blog[i], function (err, bl) {
        if (err) throw err;
        console.log(bl.id);
        blog[i] = bl;
        --count || next();
      });
    }

  }

  var ci = 0;

  function getNextcId() {
    ci = ++ci % cIds.length;
    return cIds[ci];
  }

  function closeDB() {
    BlogPost.remove(function () {
      mongoose.disconnect();
    });
  }

  suite.add('Populate - 1 value', {
    defer : true,
    fn : function (deferred) {
      blog[4].populate('comments', function (err) {
        if (err) throw err;
        deferred.resolve();
      });
    }
  }).add('Populate - 10 values', {
    defer : true,
    fn : function (deferred) {
      blog[0].populate('comments', function (err) {
        if (err) throw err;
        deferred.resolve();
      });
    }
  }).add('Populate - 100 value', {
    defer : true,
    fn : function (deferred) {
      blog[1].populate('comments', function (err) {
        if (err) throw err;
        deferred.resolve();
      });
    }
  }).add('Populate - 1000 value', {
    defer : true,
    fn : function (deferred) {
      blog[2].populate('comments', function (err) {
        if (err) throw err;
        deferred.resolve();
      });
    }
  }).add('Populate - 10000 value', {
    defer : true,
    fn : function (deferred) {
      blog[3].populate('comments', function (err) {
        if (err) throw err;
        deferred.resolve();
      });
    }
  })
  .on('cycle', function (evt) {
    console.log(String(evt.target));
  }).on('complete', function () {
    closeDB();
    this.forEach(function (item) {
      console.log(item.name);
    });
  });
  function next() {
    suite.run({ async : true });
  }
});
