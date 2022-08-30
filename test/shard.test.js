'use strict';

const start = require('./common');

const assert = require('assert');
const random = require('./util').random;

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

const uri = process.env.MONGOOSE_SHARD_TEST_URI;
const redColorEscapeCharacter = '\x1b[31m';
const colorResetEscapeCharacter = '\u001b[39m';

if (!uri) {
  console.log([
    redColorEscapeCharacter,
    'You\'re not testing shards!',
    'Please set the MONGOOSE_SHARD_TEST_URI env variable.',
    'e.g: `mongodb://localhost:27017/database',
    'Sharding must already be enabled on your database',
    colorResetEscapeCharacter
  ].join('\n'));

  return;
}

const schema = new Schema({
  name: String,
  age: Number,
  likes: [String]
}, { shardkey: { name: 1, age: 1 } });

// to keep mongodb happy when sharding the collection
// we add a matching index
schema.index({ name: 1, age: 1 });

const collection = 'shardperson_' + random();
mongoose.model('ShardPerson', schema, collection);

let version;
let greaterThan20x;
let db;
describe('shard', function() {
  before(function(done) {
    db = start({ uri: uri });
    db.on('error', function(err) {
      if (/failed to connect/.test(err)) {
        err.message = 'Shard test error: '
            + err.message
            + '\n'
            + '    Are you sure there is a db running at '
            + uri + ' ?'
            + '\n';
      }
      return done(err);
    });
    db.on('open', function() {
      // set up a sharded test collection
      const P = db.model('ShardPerson', collection);

      // an existing index on shard key is required before sharding
      P.on('index', function() {
        // enable sharding on our collection
        const cmd = {};
        cmd.shardcollection = db.name + '.' + collection;
        cmd.key = P.schema.options.shardkey;

        P.db.db.executeDbAdminCommand(cmd, function(err) {
          assert.ifError(err);

          db.db.admin().serverStatus(function(err, info) {
            db.close();
            assert.ifError(err);
            version = info.version.split('.').map(function(n) {
              return parseInt(n, 10);
            });
            greaterThan20x = version[0] > 2 || version[0] === 2 && version[0] > 0;
            done();
          });
        });
      });
    });
  });

  it('can read and write to a shard', function(done) {
    const db = start({ uri: uri });
    const P = db.model('ShardPerson', collection);

    P.create({ name: 'ryu', age: 25, likes: ['street fighting'] }, function(err, ryu) {
      assert.ifError(err);
      P.findById(ryu._id, function(err, doc) {
        db.close();
        assert.ifError(err);
        assert.equal(doc.id, ryu.id);
        done();
      });
    });
  });

  it('save() and remove() works with shard keys transparently', function(done) {
    const db = start({ uri: uri });
    const P = db.model('ShardPerson', collection);

    const zangief = new P({ name: 'Zangief', age: 33 });
    zangief.save(function(err) {
      assert.ifError(err);

      assert.equal(zangief.$__.shardval.name, 'Zangief');
      assert.equal(zangief.$__.shardval.age, 33);

      P.findById(zangief._id, function(err, zang) {
        assert.ifError(err);

        assert.equal(zang.$__.shardval.name, 'Zangief');
        assert.equal(zang.$__.shardval.age, 33);

        zang.likes = ['spinning', 'laughing'];
        zang.save(function(err) {
          assert.ifError(err);

          assert.equal(zang.$__.shardval.name, 'Zangief');
          assert.equal(zang.$__.shardval.age, 33);

          zang.likes.addToSet('winning');
          zang.save(function(err) {
            assert.ifError(err);
            assert.equal(zang.$__.shardval.name, 'Zangief');
            assert.equal(zang.$__.shardval.age, 33);
            zang.remove(function(err) {
              db.close();
              assert.ifError(err);
              done();
            });
          });
        });
      });
    });
  });

  it('inserting to a sharded collection without the full shard key fails', function(done) {
    const db = start({ uri: uri });
    const P = db.model('ShardPerson', collection);

    let pending = 6;

    P.create({ name: 'ryu', likes: ['street fighting'] }, function(err) {
      assert.ok(err);
      assert.ok(err.message);
      if (!--pending) {
        db.close();
        done();
      }
    });

    P.create({ likes: ['street fighting'] }, function(err) {
      assert.ok(err);
      assert.ok(err.message);
      if (!--pending) {
        db.close();
        done();
      }
    });

    P.create({ name: 'ryu' }, function(err) {
      assert.ok(err);
      assert.ok(err.message);
      if (!--pending) {
        db.close();
        done();
      }
    });

    P.create({ age: 49 }, function(err) {
      assert.ok(err);
      assert.ok(err.message);
      if (!--pending) {
        db.close();
        done();
      }
    });

    P.create({ likes: ['street fighting'], age: 8 }, function(err) {
      assert.ok(err);
      assert.ok(err.message);
      if (!--pending) {
        db.close();
        done();
      }
    });

    const p = new P();
    p.save(function(err) {
      assert.ok(err);
      assert.ok(err.message);
      if (!--pending) {
        db.close();
        done();
      }
    });
  });

  it('updating a sharded collection without the full shard key fails', function(done) {
    const db = start({ uri: uri });
    const P = db.model('ShardPerson', collection);

    P.create({ name: 'ken', age: 27 }, function(err, ken) {
      assert.ifError(err);

      P.update({ name: 'ken' }, { likes: ['kicking', 'punching'] }, function(err) {
        assert.ok(/shard key/.test(err.message));

        P.update({ _id: ken._id, name: 'ken' }, { likes: ['kicking', 'punching'] }, function(err) {
          // mongo 2.0.x returns: can't do non-multi update with query that doesn't have a valid shard key
          if (greaterThan20x) {
            assert.ok(!err, err);
          } else {
            assert.ok(/shard key/.test(err.message));
          }

          P.update({ _id: ken._id, age: 27 }, { likes: ['kicking', 'punching'] }, function(err) {
            // mongo 2.0.x returns: can't do non-multi update with query that doesn't have a valid shard key
            if (greaterThan20x) {
              assert.ok(!err, err);
            } else {
              assert.ok(/shard key/.test(err.message));
            }

            P.update({ age: 27 }, { likes: ['kicking', 'punching'] }, function(err) {
              db.close();
              assert.ok(err);
              done();
            });
          });
        });
      });
    });
  });

  it('updating shard key values fails', function(done) {
    const db = start({ uri: uri });
    const P = db.model('ShardPerson', collection);
    P.create({ name: 'chun li', age: 19, likes: ['street fighting'] }, function(err, chunli) {
      assert.ifError(err);

      assert.equal(chunli.$__.shardval.name, 'chun li');
      assert.equal(chunli.$__.shardval.age, 19);

      chunli.age = 20;
      chunli.save(function(err) {
        assert.ok(/^After applying the update to the document/.test(err.message));

        assert.equal(chunli.$__.shardval.name, 'chun li');
        assert.equal(chunli.$__.shardval.age, 19);

        P.findById(chunli._id, function(err, chunli) {
          assert.ifError(err);

          assert.equal(chunli.$__.shardval.name, 'chun li');
          assert.equal(chunli.$__.shardval.age, 19);

          chunli.name = 'chuuuun liiiii';
          chunli.save(function(err) {
            db.close();
            assert.ok(/^After applying the update to the document/.test(err.message));
            done();
          });
        });
      });
    });
  });

  it('allows null shard key values', function(done) {
    const db = start({ uri: uri });
    const P = db.model('ShardPerson', collection);

    P.create({ name: null, age: 27 }, function(err, ken) {
      assert.ifError(err);
      P.findById(ken, function(err) {
        assert.ifError(err);
        done();
      });
    });
  });

  after(function(done) {
    const db = start({ uri: uri });
    const P = db.model('ShardPerson', collection);
    P.collection.drop(function() {
      db.close();
      done();
    });
  });
});
