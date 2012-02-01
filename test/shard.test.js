
var start = require('./common')
  , should = require('should')
  , random = require('../lib/utils').random
  , mongoose = start.mongoose
  , Mongoose = mongoose.Mongoose
  , Schema = mongoose.Schema;

var uri = 'mongodb://localhost:27020/test';
//var uri = 'mongodb://localhost:27020/testing';

//var uri = process.env.MONGOOSE_SHARD_TEST_URI;

if (!uri) {
  console.log('\033[31m', '\n', 'You\'re not testing shards!'
            , '\n', 'Please set the MONGOOSE_SHARD_TEST_URI env variable.', '\n'
            , 'e.g: `mongodb://localhost:27017/database', '\n'
            , 'Sharding must already be enabled on your database'
            , '\033[39m');
  return;
}

var schema = new Schema({
    name: String
  , age: Number
  , likes: [String]
}, { shardkey: { name: 1, age: 1 }});

mongoose.model('ShardPerson', schema);
var collection = 'shardperson_' + random();
//var collection = 'people'

module.exports = {

  'auto shards the collection': function () {
    var db = start({ uri:  uri })
    var P = db.model('ShardPerson', collection);

    var name = collection;

    // avoid the race condition caused by calling db.db.command directly
    db.on('open', function () {
      P.db.db.command({ collStats: name }, function (err, stats) {
        db.close();
        should.strictEqual(!!err, false);
        should.exist(stats);
        stats.sharded.should.be.true;
      });
    });

    //
    // need to run "shardcollection" command with key
    // this will error if its already sharded (which is ok) ("already sharded")
  },

  'can read and write to a shard': function () {
    var db = start({ uri:  uri })
    var P = db.model('ShardPerson', collection);

    P.create({ name: 'ryu', age: 25, likes: ['street fighting']}, function (err, ryu) {
      should.strictEqual(null, err);
      P.findById(ryu._id, function (err, doc) {
        db.close();
        should.strictEqual(null, err);
        doc.id.should.equal(ryu.id);
      });
    });
  },

  'save() works with shard keys transparently': function () {
    var db = start({ uri:  uri })
    var P = db.model('ShardPerson', collection);

    var zangief = new P({ name: 'Zangief', age: 33 });
    zangief.save(function (err) {
      should.strictEqual(null, err);

      P.findById(zangief._id, function (err, zang) {
        should.strictEqual(null, err);

        zang.likes = ['spinning', 'laughing'];
        zang.save(function (err) {
          should.strictEqual(null, err);
          zang.likes.addToSet('winning');
          zang.save(function (err) {
            db.close();
            should.strictEqual(null, err);
          });
        });
      });
    });
  },

  'inserting to a sharded collection without the full shard key fails': function () {
    var db = start({ uri:  uri })
    var P = db.model('ShardPerson', collection);

    var pending = 6;

    P.create({ name: 'ryu', likes: ['street fighting']}, function (err, ryu) {
      --pending || db.close();
      should.exist(err);
      err.message.should.equal('tried to insert object with no valid shard key');
    });

    P.create({ likes: ['street fighting']}, function (err, ryu) { should.exist(err);
      --pending || db.close();
      should.exist(err);
      err.message.should.equal('tried to insert object with no valid shard key');
    });

    P.create({ name: 'ryu' }, function (err, ryu) { should.exist(err);
      --pending || db.close();
      should.exist(err);
      err.message.should.equal('tried to insert object with no valid shard key');
    });

    P.create({ age: 49 }, function (err, ryu) { should.exist(err);
      --pending || db.close();
      should.exist(err);
      err.message.should.equal('tried to insert object with no valid shard key');
    });

    P.create({ likes: ['street fighting'], age: 8 }, function (err, ryu) {
      --pending || db.close();
      should.exist(err);
      err.message.should.equal('tried to insert object with no valid shard key');
    });

    var p = new P;
    p.save(function (err) {
      --pending || db.close();
      should.exist(err);
      err.message.should.equal('tried to insert object with no valid shard key');
    });

  },

  'updating a sharded collection without the full shard key fails': function () {
    var db = start({ uri:  uri })
    var P = db.model('ShardPerson', collection);

    P.create({ name: 'ken', age: 27 }, function (err, ken) {
      should.strictEqual(null, err);

      P.update({ _id: ken._id }, { likes: ['kicking', 'punching'] }, function (err) {
        should.exist(err);
        "right object doesn't have full shard key".should.equal(err.message);

        P.update({ _id: ken._id, name: 'ken' }, { likes: ['kicking', 'punching'] }, function (err) {
          should.exist(err);

          P.update({ _id: ken._id, age: 27 }, { likes: ['kicking', 'punching'] }, function (err) {
            should.exist(err);

            P.update({ age: 27 }, { likes: ['kicking', 'punching'] }, function (err) {
              db.close();
              should.exist(err);
            });
          });
        });
      });
    });
  },

  'updating shard key values fails': function () {
    var db = start({ uri:  uri })
    var P = db.model('ShardPerson', collection);
    P.create({ name: 'chun li', age: 19, likes: ['street fighting']}, function (err, chunli) {
      should.strictEqual(null, err);

      chunli.age = 20;
      chunli.save(function (err) {
        /^Can't modify shard key's value field/.test(err.message).should.be.true;

        P.findById(chunli._id, function (err, chunli) {
          should.strictEqual(null, err);
          chunli.name='chuuuun liiiii';
          chunli.save(function (err) {
            db.close();
            /^Can't modify shard key's value field/.test(err.message).should.be.true;
          });
        });
      });
    });
  }

}
