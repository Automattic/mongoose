
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
 * These are all the benchmark tests for inserting data
 */


mongoose.connect('mongodb://localhost/mongoose-bench', function (err) {
  if (err) throw err;
  mongo.connect('mongodb://localhost/mongoose-bench', function (err, db) {
    if (err) throw err;


    function setup() {
      var UserSchema = new Schema({
        name : String,
        age: Number,
        likes: [String],
        address: String
      });

      mongoose.model('User', UserSchema);
    }

    function closeDB() {
      var User = mongoose.model('User');
      var user = db.collection('user');
      User.remove(function () {
        mongoose.disconnect();
      });
      user.remove({}, function (err) {
        if (err) throw err;
        db.close();
      });
    }

    suite.on('start', setup).add('Insert - Mongoose', {
      defer : true,
      fn : function (deferred) {
        var User = mongoose.model('User');
        var data = {
          name : "name",
          age : 0,
          likes : ["dogs", "cats", "pizza"],
          address : " Nowhere-ville USA"
        };
        User.create(data, function (err) {
          if (err) throw err;
          deferred.resolve();
        });
      }
    }).add('Insert - Driver', {
      defer : true,
      fn : function (deferred) {
        var user = db.collection('user');
        var data = {
          name : "name",
          age : 0,
          likes : ["dogs", "cats", "pizza"],
          address : " Nowhere-ville USA"
        };
        user.insert(data, function (err) {
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
    }).run({ async : true });
  });
});
