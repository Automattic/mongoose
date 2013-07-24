
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
 * These are all the benchmark tests for updating data
 */


mongoose.connect('mongodb://localhost/mongoose-bench', function (err) {
  if (err) throw err;
  mongo.connect('mongodb://localhost/mongoose-bench', function (err, db) {
    if (err) throw err;
    var UserSchema = new Schema({
      name : String,
      age: Number,
      likes: [String],
      address: String
    });

    var User = mongoose.model('User', UserSchema);
    var user = db.collection('user');

    var mIds = [];
    var dIds = [];

    var data = {
      name : "name",
      age : 0,
      likes : ["dogs", "cats", "pizza"],
      address : " Nowhere-ville USA"
    };

    // insert all of the data here
    var count = 1000;
    for (var i=0; i < 500; i++) {
      User.create(data, function (err, u) {
        if (err) throw err;
        mIds.push(u.id);
        --count || next();
      });
      var nData = {};
      nData.name = data.name;
      nData.age = data.age;
      nData.likes = data.likes;
      nData.address = data.address;
      user.insert(nData, function (err, res) {
        dIds.push(res[0]._id);
        --count || next();
      });
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

    suite.add('Update - Mongoose', {
      defer : true,
      fn : function (deferred) {
        var User = mongoose.model('User');
        User.update({ _id : mIds.pop()}, { age : 2, $push : { likes : "metal" }}, function (err) {
          if (err) throw err;
          deferred.resolve();
        });
      }
    }).add('Update - Driver', {
      defer : true,
      fn : function (deferred) {
        var user = db.collection('user');
        user.update({ _id : dIds.pop()}, { $set : { age : 2 }, $push : { likes : "metal" }}, function (err) {
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
});
