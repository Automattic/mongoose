var start = require('./common');
var mongoose = start.mongoose;

describe('connection: manual reconnect with authReconnect: false', function() {
  it('should continue processing queries/writes', function(done) {
    // connect to mongod
    // perform writes/queries
    // take mongod down
    // bring mongod up
    // writes/queries should work
    //   - should not get 'no open connections' error

    var db = mongoose.createConnection();

    db.open(start.uri, {server: {auto_reconnect: false}});

    var M = db.model('autoReconnect', {name: String});

    var open = false;
    var times = 0;

    db.on('open', function() {
      ++times;
      open = true;
      hit();
    });

    db.on('disconnected', function() {
      open = false;
      setTimeout(function() {
        db.open(start.uri, {server: {auto_reconnect: false}});
      }, 30);
    });

    function hit() {
      if (!open) {
        return;
      }
      M.create({name: times}, function(err, doc) {
        if (err) {
          return complete(err);
        }
        M.findOne({_id: doc._id}, function(err) {
          if (err) {
            return complete(err);
          }
          if (times > 1) {
            return complete();
          }
          shutdownMongo();
        });
      });
    }

    function shutdownMongo() {
      db.db.close();
    }

    function complete(err) {
      if (complete.ran) {
        return;
      }
      complete.ran = 1;
      done(err);
    }
  });
});
