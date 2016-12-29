var mongoose = require('../../lib');
var Benchmark = require('benchmark');

var suite = new Benchmark.Suite();

var Schema = mongoose.Schema;
var mongo = require('mongodb');

// to make things work in the way the are normally described online...
/*
 *global.Schema = Schema;
 *global.mongoose = mongoose;
 */

/**
 * These are all the benchmark tests for deleting data
 */


mongoose.connect('mongodb://localhost/mongoose-bench', function(err) {
  if (err) {
    throw err;
  }
  mongo.connect('mongodb://localhost/mongoose-bench', function(err, db) {
    if (err) {
      throw err;
    }
    var UserSchema = new Schema({
      name: String,
      age: Number,
      likes: [String],
      address: String
    });

    var User = mongoose.model('User', UserSchema);
    var user = db.collection('user');

    var mIds = [];
    var dIds = [];

    var data = {
      name: 'name',
      age: 0,
      likes: ['dogs', 'cats', 'pizza'],
      address: ' Nowhere-ville USA'
    };

    // insert all of the data here
    var count = 1000;
    for (var i = 0; i < 500; i++) {
      User.create(data, function(err, u) {
        if (err) {
          throw err;
        }
        mIds.push(u.id);
        --count || next();
      });
      var nData = {};
      nData.name = data.name;
      nData.age = data.age;
      nData.likes = data.likes;
      nData.address = data.address;
      user.insert(nData, function(err, res) {
        dIds.push(res.insertedIds[0]);
        --count || next();
      });
    }

    function closeDB() {
      User.count(function(err, res) {
        if (res !== 0) {
          console.log('Still mongoose entries left...');
        }
        mongoose.disconnect();
      });
      user.count({}, function(err, res) {
        if (res !== 0) {
          console.log('Still driver entries left...');
        }
        if (err) {
          throw err;
        }
        db.close();
      });
    }

    suite.add('Delete - Mongoose', {
      defer: true,
      fn: function(deferred) {
        User.remove({_id: mIds.pop()}, function(err) {
          if (err) {
            throw err;
          }
          deferred.resolve();
        });
      }
    }).add('Delete - Driver', {
      defer: true,
      fn: function(deferred) {
        user.remove({_id: dIds.pop()}, function(err) {
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
});
