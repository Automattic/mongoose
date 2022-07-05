'use strict';
const mongoose = require('../../lib');
const Benchmark = require('benchmark');

const suite = new Benchmark.Suite();

const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;
const utils = require('../../lib/utils.js');

// to make things work in the way the are normally described online...
/*
 *global.Schema = Schema;
 *global.mongoose = mongoose;
 */

/**
 * These are all the benchmark tests for casting stuff
 */

const Comments = new Schema();

Comments.add({
  title: String,
  date: Date,
  body: String,
  comments: [Comments],
});

const BlogPost = new Schema({
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

const commentData = {
  title: 'test comment',
  date: new Date(),
  body: 'this be some crazzzyyyyy text that would go in a comment',
  comments: [{ title: 'second level', date: new Date(), body: 'texttt' }],
};

const blogData = {
  title: 'dummy post',
  author: 'somebody',
  slug: 'test.post',
  date: new Date(),
  meta: {
    date: new Date(),
    visitors: 9001,
  },
  published: true,
  mixed: {
    thisIsRandom: true,
  },
  numbers: [1, 2, 7, 10, 23432],
  tags: ['test', 'BENCH', 'things', 'more things'],
  def: 'THANGS!!!',
  comments: [],
};

const blogData10 = utils.clone(blogData);
const blogData100 = utils.clone(blogData);
const blogData1000 = utils.clone(blogData);
const blogData10000 = utils.clone(blogData);

for (let i = 0; i < 10; i++) {
  blogData10.comments.push(commentData);
}
for (let i = 0; i < 100; i++) {
  blogData100.comments.push(commentData);
}
for (let i = 0; i < 1000; i++) {
  blogData1000.comments.push(commentData);
}
for (let i = 0; i < 10000; i++) {
  blogData10000.comments.push(commentData);
}

mongoose.model('BlogPost', BlogPost);

suite
  .add('Casting - Embedded Docs - 0 Docs', {
    fn: function () {
      const BlogPost = mongoose.model('BlogPost');
      const bp = new BlogPost();
      bp.init(blogData);
    },
  })
  .add('Casting - Embedded Docs - 10 Docs', {
    fn: function () {
      const BlogPost = mongoose.model('BlogPost');
      const bp = new BlogPost();
      bp.init(blogData10);
    },
  })
  .add('Casting - Embedded Docs - 100 Docs', {
    fn: function () {
      const BlogPost = mongoose.model('BlogPost');
      const bp = new BlogPost();
      bp.init(blogData100);
    },
  })
  .add('Casting - Embedded Docs - 1000 Docs', {
    fn: function () {
      const BlogPost = mongoose.model('BlogPost');
      const bp = new BlogPost();
      bp.init(blogData1000);
    },
  })
  .add('Casting - Embedded Docs - 10000 Docs', {
    fn: function () {
      const BlogPost = mongoose.model('BlogPost');
      const bp = new BlogPost();
      bp.init(blogData10000);
    },
  })
  .on('cycle', function (evt) {
    if (process.env.MONGOOSE_DEV || process.env.PULL_REQUEST) {
      console.log(String(evt.target));
    }
  })
  .on('complete', function () {
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
