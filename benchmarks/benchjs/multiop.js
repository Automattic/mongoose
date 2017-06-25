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
 * These are all the benchmark tests for mixed data operations
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
      meta: {
        date: new Date(),
        visitors: 9001
      },
      published: true,
      mixed: {
        thisIsRandom: true
      },
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

    // insert all of the data here
    var count = 4000;
    for (i = 0; i < 1000; i++) {
      data.age = Math.floor(Math.random() * 50);
      User.create(data, function(err, u) {
        if (err) {
          throw err;
        }
        mIds.push(u.id);
        --count || next();
      });
      var nData = utils.clone(data);
      user.insert(nData, function(err, res) {
        if (err) {
          throw err;
        }
        dIds.push(res.insertedIds[0]);
        --count || next();
      });
      BlogPost.create(blogData, function(err, bp) {
        if (err) {
          throw err;
        }
        bmIds.push(bp.id);
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

    suite.add('Multi-Op - Mongoose - Heavy Read, low write', {
      defer: true,
      fn: function(deferred) {
        var count = 150;
        for (var i = 0; i < 150; i++) {
          User.findOne({_id: getNextmId()}, function(err) {
            if (err) {
              throw err;
            }
            --count || deferred.resolve();
          });
          if (i % 15 === 0) {
            var nData = utils.clone(data);
            User.create(nData, function(err) {
              if (err) {
                throw err;
              }
              --count || deferred.resolve();
            });
          }
        }
      }
    }).add('Multi-Op - Driver - Heavy Read, low write', {
      defer: true,
      fn: function(deferred) {
        var count = 150;
        for (var i = 0; i < 150; i++) {
          user.findOne({_id: getNextdId()}, function(err) {
            if (err) {
              throw err;
            }
            --count || deferred.resolve();
          });
          if (i % 15 === 0) {
            var nData = utils.clone(data);
            user.insert(nData, function(err) {
              if (err) {
                throw err;
              }
              --count || deferred.resolve();
            });
          }
        }
      }
    }).add('Multi-Op - Mongoose - Embedded Docs - Heavy Read, low write', {
      defer: true,
      fn: function(deferred) {
        var count = 150;
        for (var i = 0; i < 150; i++) {
          BlogPost.findOne({_id: getNextbmId()}, function(err) {
            if (err) {
              throw err;
            }
            --count || deferred.resolve();
          });
          if (i % 15 === 0) {
            var nData = utils.clone(blogData);
            BlogPost.create(nData, function(err) {
              if (err) {
                throw err;
              }
              --count || deferred.resolve();
            });
          }
        }
      }
    }).add('Multi-Op - Driver - Embedded Docs - Heavy Read, low write', {
      defer: true,
      fn: function(deferred) {
        var count = 150;
        for (var i = 0; i < 150; i++) {
          blogpost.findOne({_id: getNextbdId()}, function(err) {
            if (err) {
              throw err;
            }
            --count || deferred.resolve();
          });
          if (i % 15 === 0) {
            var nData = utils.clone(blogData);
            blogpost.insert(nData, function(err) {
              if (err) {
                throw err;
              }
              --count || deferred.resolve();
            });
          }
        }
      }
    }).add('Multi-Op - Mongoose - Heavy Write, low read', {
      defer: true,
      fn: function(deferred) {
        var count = 150;

        for (var i = 0; i < 150; i++) {
          var nData = utils.clone(data);
          User.create(nData, function(err) {
            if (err) {
              throw err;
            }
            --count || deferred.resolve();
          });
          if (i % 15 === 0) {
            User.findOne({_id: getNextmId()}, function(err) {
              if (err) {
                throw err;
              }
              --count || deferred.resolve();
            });
          }
        }
      }
    }).add('Multi-Op - Driver - Heavy Write, low read', {
      defer: true,
      fn: function(deferred) {
        var count = 150;

        for (var i = 0; i < 150; i++) {
          var nData = utils.clone(data);
          user.insert(nData, function(err) {
            if (err) {
              throw err;
            }
            --count || deferred.resolve();
          });
          if (i % 15 === 0) {
            user.findOne({_id: getNextdId()}, function(err) {
              if (err) {
                throw err;
              }
              --count || deferred.resolve();
            });
          }
        }
      }
    }).add('Multi-Op - Mongoose - Embedded Docs - Heavy Write, low read', {
      defer: true,
      fn: function(deferred) {
        var count = 150;

        for (var i = 0; i < 150; i++) {
          var nData = utils.clone(blogData);
          BlogPost.create(nData, function(err) {
            if (err) {
              throw err;
            }
            --count || deferred.resolve();
          });
          if (i % 15 === 0) {
            BlogPost.findOne({_id: getNextbmId()}, function(err) {
              if (err) {
                throw err;
              }
              --count || deferred.resolve();
            });
          }
        }
      }
    }).add('Multi-Op - Driver - Embedded Docs - Heavy Write, low read', {
      defer: true,
      fn: function(deferred) {
        var count = 150;

        for (var i = 0; i < 150; i++) {
          var nData = utils.clone(blogData);
          blogpost.insert(nData, function(err) {
            if (err) {
              throw err;
            }
            --count || deferred.resolve();
          });
          if (i % 15 === 0) {
            blogpost.findOne({_id: getNextbdId()}, function(err) {
              if (err) {
                throw err;
              }
              --count || deferred.resolve();
            });
          }
        }
      }
    }).add('Multi-Op - Mongoose - Embedded Docs - Read-write-update', {
      defer: true,
      fn: function(deferred) {
        var count = 150;
        var updates = 0;
        for (var i = 0; i < 150; i++) {
          BlogPost.findOne({_id: getNextbmId()}, function(err, res) {
            if (err) {
              throw err;
            }
            if (updates < 20) {
              updates++;
              res.author = 'soemthing new';
              res.comments.push(commentData);
              res.title = 'something newerrrr';
              res.save(function(err) {
                if (err) {
                  throw err;
                }
                --count || deferred.resolve();
              });
            } else {
              --count || deferred.resolve();
            }
          });
          if (i % 15 === 0) {
            var nData = utils.clone(blogData);
            BlogPost.create(nData, function(err) {
              if (err) {
                throw err;
              }
              --count || deferred.resolve();
            });
          }
        }
      }
    }).add('Multi-Op - Driver - Embedded Docs - Read-write-update', {
      defer: true,
      fn: function(deferred) {
        var count = 150;
        var updates = 0;
        for (var i = 0; i < 150; i++) {
          blogpost.findOne({_id: getNextbdId()}, function(err, bp) {
            if (err) {
              throw err;
            }
            if (updates < 20) {
              updates++;
              bp.author = 'soemthing new';
              bp.comments.push(commentData);
              bp.title = 'something newerrrr';
              blogpost.save(bp, function(err) {
                if (err) {
                  throw err;
                }
                --count || deferred.resolve();
              });
            } else {
              --count || deferred.resolve();
            }
          });
          if (i % 15 === 0) {
            var nData = utils.clone(blogData);
            blogpost.insert(nData, function(err) {
              if (err) {
                throw err;
              }
              --count || deferred.resolve();
            });
          }
        }
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
});
