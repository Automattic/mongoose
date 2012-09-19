
var start = require('./common')
  , assert = require('assert')
  , random = require('../lib/utils').random
  , mongoose = start.mongoose
  , Mongoose = mongoose.Mongoose
  , Schema = mongoose.Schema;

var uri = process.env.MONGOOSE_SHARD_TEST_URI;

if (!uri) {
  console.log('\033[31m', '\n', 'You\'re not testing shards!'
            , '\n', 'Please set the MONGOOSE_SHARD_TEST_URI env variable.', '\n'
            , 'e.g: `mongodb://localhost:27017/database', '\n'
            , 'Sharding must already be enabled on your database'
            , '\033[39m');

  // let expresso shut down this test
  exports.r = function expressoHack(){}
  return;
}

var schema = new Schema({
    name: String
  , age: Number
  , likes: [String]
}, { shardkey: { name: 1, age: 1 }});

var collection = 'shardperson_' + random();
mongoose.model('ShardPerson', schema, collection);

var version;
var greaterThan20x;
var db;
describe('shard', function(){
  before(function (done) {
    db = start({ uri: uri });
    db.on('error', function (err) {
      if (/failed to connect/.test(err)) {
        err.message = 'Shard test error: '
          + err.message
          + '\n'
          + '    Are you sure there is a db running at '
          + uri + ' ?'
          + '\n'
      }
      // let expresso shut down this test
      throw err;
    });
    db.on('open', function () {
      // set up a sharded test collection
      var P = db.model('ShardPerson', collection);

      var cmd = {};
      cmd.shardcollection = db.name + '.' + collection;
      cmd.key = P.schema.options.shardkey;

      P.db.db.executeDbAdminCommand(cmd,function (err, res) {
        assert.ifError(err);

        if (!(res && res.documents && res.documents[0] && res.documents[0].ok)) {
          throw new Error('could not shard test collection '
              + collection + '\n'
              + res.documents[0].errmsg);
        }

        db.db.admin(function (err, admin) {
          assert.ifError(err);
          admin.serverStatus(function (err, info) {
            db.close();
            assert.ifError(err);
            version = info.version.split('.').map(function(n){return parseInt(n, 10) });
            greaterThan20x = 2 < version[0] || 2==version[0] && 0<version[0];
            done();
          });
        });
      });
    });
  });

  it('can read and write to a shard', function (done) {
    var db = start({ uri:  uri })
    var P = db.model('ShardPerson', collection);

    P.create({ name: 'ryu', age: 25, likes: ['street fighting']}, function (err, ryu) {
      assert.ifError(err);
      P.findById(ryu._id, function (err, doc) {
        db.close();
        assert.ifError(err);
        assert.equal(doc.id,ryu.id);
        done();
      });
    });
  })

  it('save() and remove() works with shard keys transparently', function (done) {
    var db = start({ uri:  uri })
    var P = db.model('ShardPerson', collection);

    var zangief = new P({ name: 'Zangief', age: 33 });
    zangief.save(function (err) {
      assert.ifError(err);

      assert.equal(zangief._shardval.name, 'Zangief');
      assert.equal(zangief._shardval.age, 33);

      P.findById(zangief._id, function (err, zang) {
        assert.ifError(err);

        assert.equal(zang._shardval.name, 'Zangief');
        assert.equal(zang._shardval.age, 33);

        zang.likes = ['spinning', 'laughing'];
        zang.save(function (err) {
          assert.ifError(err);

          assert.equal(zang._shardval.name, 'Zangief');
          assert.equal(zang._shardval.age, 33);

          zang.likes.addToSet('winning');
          zang.save(function (err) {
            assert.ifError(err);
            assert.equal(zang._shardval.name, 'Zangief');
            assert.equal(zang._shardval.age, 33);
            zang.remove(function (err) {
              db.close();
              assert.ifError(err);
              done();
            });
          });
        });
      });
    });
  })

  it('inserting to a sharded collection without the full shard key fails', function (done) {
    var db = start({ uri:  uri })
    var P = db.model('ShardPerson', collection);

    var pending = 6;

    P.create({ name: 'ryu', likes: ['street fighting']}, function (err, ryu) {
      assert.ok(err);
      assert.ok(/tried to insert object with no valid shard key/.test(err.message));
      if (!--pending) {
        db.close();
        done();
      }
    });

    P.create({ likes: ['street fighting']}, function (err, ryu) { assert.ok(err);
      assert.ok(err);
      assert.ok(/tried to insert object with no valid shard key/.test(err.message));
      if (!--pending) {
        db.close();
        done();
      }
    });

    P.create({ name: 'ryu' }, function (err, ryu) { assert.ok(err);
      assert.ok(err);
      assert.ok(/tried to insert object with no valid shard key/.test(err.message));
      if (!--pending) {
        db.close();
        done();
      }
    });

    P.create({ age: 49 }, function (err, ryu) { assert.ok(err);
      assert.ok(err);
      assert.ok(/tried to insert object with no valid shard key/.test(err.message));
      if (!--pending) {
        db.close();
        done();
      }
    });

    P.create({ likes: ['street fighting'], age: 8 }, function (err, ryu) {
      assert.ok(err);
      assert.ok(/tried to insert object with no valid shard key/.test(err.message))
      if (!--pending) {
        db.close();
        done();
      }
    });

    var p = new P;
    p.save(function (err) {
      assert.ok(err);
      assert.ok(/tried to insert object with no valid shard key/.test(err.message));
      if (!--pending) {
        db.close();
        done();
      }
    });
  });

  it('updating a sharded collection without the full shard key fails', function (done) {
    var db = start({ uri:  uri })
    var P = db.model('ShardPerson', collection);

    P.create({ name: 'ken', age: 27 }, function (err, ken) {
      assert.ifError(err);

      P.update({ name: 'ken' }, { likes: ['kicking', 'punching'] }, function (err) {
        assert.ok(/shard key/.test(err.message));

        P.update({ _id: ken._id, name: 'ken' }, { likes: ['kicking', 'punching'] }, function (err) {
          // mongo 2.0.x returns: can't do non-multi update with query that doesn't have a valid shard key
          if (greaterThan20x) {
            assert.ok(!err, err);
          } else {
            assert.ok(/shard key/.test(err.message));
          }

          P.update({ _id: ken._id, age: 27 }, { likes: ['kicking', 'punching'] }, function (err) {
            // mongo 2.0.x returns: can't do non-multi update with query that doesn't have a valid shard key
            if (greaterThan20x) {
              assert.ok(!err, err);
            } else {
              assert.ok(/shard key/.test(err.message));
            }

            P.update({ age: 27 }, { likes: ['kicking', 'punching'] }, function (err) {
              db.close();
              assert.ok(err);
              done();
            });
          });
        });
      });
    });
  })

  it('updating shard key values fails', function (done) {
    var db = start({ uri:  uri })
    var P = db.model('ShardPerson', collection);
    P.create({ name: 'chun li', age: 19, likes: ['street fighting']}, function (err, chunli) {
      assert.ifError(err);

      assert.equal(chunli._shardval.name, 'chun li');
      assert.equal(chunli._shardval.age, 19);

      chunli.age = 20;
      chunli.save(function (err) {
        assert.ok(/^Can't modify shard key's value/.test(err.message));

        assert.equal(chunli._shardval.name, 'chun li');
        assert.equal(chunli._shardval.age, 19);

        P.findById(chunli._id, function (err, chunli) {
          assert.ifError(err);

          assert.equal(chunli._shardval.name, 'chun li');
          assert.equal(chunli._shardval.age, 19);

          chunli.name='chuuuun liiiii';
          chunli.save(function (err) {
            db.close();
            assert.ok(/^Can't modify shard key's value/.test(err.message));
            done();
          });
        });
      });
    });
  });

  it('allows null shard key values', function (done) {
    var db = start({ uri:  uri })
    var P = db.model('ShardPerson', collection);

    P.create({ name: null, age: 27 }, function (err, ken) {
      assert.ifError(err);
      P.findById(ken, function (err, ken) {
        assert.ifError(err);
        done();
      });
    });
  });

  after(function (done) {
    var db = start({ uri:  uri })
    var P = db.model('ShardPerson', collection);
    P.collection.drop(function (err) {
      db.close();
      done();
    });
  });
})
