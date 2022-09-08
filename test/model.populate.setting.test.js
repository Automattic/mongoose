/* eslint no-dupe-keys: 1 */

/**
 * Test dependencies.
 */

'use strict';

const start = require('./common');

const assert = require('assert');

const mongoose = start.mongoose;
const random = require('./util').random;
const Schema = mongoose.Schema;
const DocObjectId = mongoose.Types.ObjectId;

/**
 * Tests.
 */

describe('model: populate:', function() {
  this.timeout(4500);

  describe('setting populated paths (gh-570)', function() {
    const types = {
      ObjectId: DocObjectId,
      String: String,
      Number: Number,
      Buffer: Buffer
    };

    const construct = {};
    construct.String = random;
    construct.ObjectId = () => new DocObjectId();
    construct.Number = random;
    construct.Buffer = function() {
      return Buffer.from(random());
    };

    Object.keys(types).forEach(function(id) {
      describe('should not cast to _id of type ' + id, function() {
        let db;
        let B, U;
        let u1;
        let b1, b2;

        before(async function() {
          const bSchema = new Schema({
            title: String,
            fans: [{ type: id, ref: 'User' }],
            adhoc: [{ subdoc: id, subarray: [{ things: [id] }] }],
            _creator: { type: id, ref: 'User' },
            embed: [{
              other: { type: id, ref: 'User' },
              array: [{ type: id, ref: 'User' }],
              nested: [{ subdoc: { type: id, ref: 'User' } }]
            }]
          });

          const uSchema = new Schema({
            _id: id,
            name: String,
            email: String
          });

          db = start();
          B = db.model('BlogPost', bSchema);
          U = db.model('User', uSchema);

          const [fan1, fan2] = await U.create({
            _id: construct[id](),
            name: 'Fan 1',
            email: 'fan1@learnboost.com'
          }, {
            _id: construct[id](),
            name: 'Fan 2',
            email: 'fan2@learnboost.com'
          });

          u1 = fan1;

          const [post1, post2] = await B.create(
            {
              title: 'Woot',
              fans: [fan1, fan2],
              adhoc: [{ subdoc: fan2, subarray: [{ things: [fan1] }] }],
              _creator: fan1,
              embed: [{ other: fan1, array: [fan1, fan2] }, { other: fan2, array: [fan2, fan1] }]
            },
            {
              title: 'Woot2',
              fans: [fan2, fan1],
              adhoc: [{ subdoc: fan1, subarray: [{ things: [fan2] }] }],
              _creator: fan2,
              embed: [{ other: fan2, array: [fan2, fan1] }, { other: fan1, array: [fan1, fan2] }]
            }
          );

          b1 = post1;
          b2 = post2;
        });

        after(async function() {
          await db.close();
        });

        function userLiteral(name) {
          return { _id: construct[id](), name: name };
        }

        function user(name) {
          return new U(userLiteral(name));
        }

        it('if a document', async function() {
          const query = B.findById(b1).
            populate('fans _creator embed.other embed.array embed.nested.subdoc').
            populate({ path: 'adhoc.subdoc', model: 'User' }).
            populate({ path: 'adhoc.subarray.things', model: 'User' });
          const doc = await query.exec();

          const user3 = user('user3');
          doc.fans.push(user3);
          assert.deepEqual(doc.fans[2].toObject(), user3.toObject());

          const user4 = user('user4');
          doc.fans.nonAtomicPush(user4);
          assert.deepEqual(doc.fans[3].toObject(), user4.toObject());

          const user5 = user('user5');
          doc.fans.splice(2, 1, user5);
          assert.deepEqual(doc.fans[2].toObject(), user5.toObject());

          const user6 = user('user6');
          doc.fans.unshift(user6);
          assert.deepEqual(doc.fans[0].toObject(), user6.toObject());

          const user7 = user('user7');
          doc.fans.addToSet(user7);
          assert.deepEqual(doc.fans[5].toObject(), user7.toObject());

          doc.fans.forEach(function(doc) {
            assert.ok(doc instanceof U);
          });

          const user8 = user('user8');
          doc.fans.set(0, user8);
          assert.deepEqual(doc.fans[0].toObject(), user8.toObject());

          doc.fans.push(null);
          assert.equal(doc.fans[6], null);

          const _id = construct[id]();
          doc.fans.addToSet(_id);
          if (Buffer.isBuffer(_id)) {
            assert.equal(doc.fans[7]._id.toString('utf8'), _id.toString('utf8'));
          } else {
            assert.equal(doc.fans[7]._id, String(_id));
          }

          assert.equal(doc._creator.email, u1.email);

          doc._creator = null;
          assert.equal(doc._creator, null);

          const creator = user('creator');
          doc._creator = creator;
          assert.ok(doc._creator instanceof mongoose.Document);
          assert.deepEqual(doc._creator.toObject(), creator.toObject());

          // embedded with declared ref in schema
          const user1a = user('user1a');
          doc.embed[0].array.set(0, user1a);
          assert.deepEqual(doc.embed[0].array[0].toObject(), user1a.toObject());

          const user1b = user('user1b');
          doc.embed[0].other = user1b;
          assert.deepEqual(doc.embed[0].other.toObject(), user1b.toObject());

          const user1c = user('user2c');
          doc.embed[0].nested = [{ subdoc: user1c }];
          assert.deepEqual(doc.embed[0].nested[0].subdoc.toObject(), user1c.toObject());

          // embedded without declared ref in schema
          const user2a = user('user2a');
          doc.adhoc[0].subdoc = user2a;
          assert.deepEqual(doc.adhoc[0].subdoc.toObject(), user2a.toObject());

          const user2b = user('user2b');
          doc.adhoc[0].subarray[0].things.push(user2b);
          assert.deepEqual(doc.adhoc[0].subarray[0].things[1].toObject(), user2b.toObject());

          await doc.save();

          const doc2 = await B.findById(b1).exec();
          // db is closed in after()
          assert.equal(doc2.fans.length, 8);
          assert.equal(doc2.fans[0], user8.id);
          assert.equal(doc2.fans[5], user7.id);
          assert.equal(doc2.fans[6], null);
          assert.equal(doc2.fans[7], String(_id));
          assert.equal(String(doc2._creator), creator._id);
          assert.equal(doc2.embed[0].array[0], user1a.id);
          assert.equal(doc2.embed[0].other, user1b.id);
          assert.equal(doc2.embed[0].nested[0].subdoc, user1c.id);
          assert.equal(doc2.adhoc[0].subdoc, user2a.id);
          assert.equal(doc2.adhoc[0].subarray[0].things[1], user2b.id);
        });

        it('if an object', async function() {
          const doc = await B.findById(b2)
            .populate('fans _creator embed.other embed.array embed.nested.subdoc')
            .populate({ path: 'adhoc.subdoc', model: 'User' })
            .populate({ path: 'adhoc.subarray.things', model: 'User' })
            .exec();

          let name = 'fan1';
          doc.fans.push(userLiteral(name));
          assert.ok(doc.fans[2]._id);
          assert.equal(doc.fans[2].name, name);

          name = 'fan2';
          doc.fans.nonAtomicPush(userLiteral(name));
          assert.ok(doc.fans[3]._id);
          assert.equal(doc.fans[3].name, name);

          name = 'fan3';
          doc.fans.splice(2, 1, userLiteral(name));
          assert.ok(doc.fans[2]._id);
          assert.equal(doc.fans[2].name, name);

          name = 'fan4';
          doc.fans.unshift(userLiteral(name));
          assert.ok(doc.fans[0]._id);
          assert.equal(doc.fans[0].name, name);

          name = 'fan5';
          doc.fans.addToSet(userLiteral(name));
          assert.ok(doc.fans[5]._id);
          assert.equal(doc.fans[5].name, name);

          name = 'fan6';
          doc.fans.set(0, userLiteral(name));
          assert.ok(doc.fans[0]._id);
          assert.equal(doc.fans[0].name, name);

          doc.fans.forEach(function(doc) {
            assert.ok(doc instanceof U);
          });

          name = 'creator';
          const creator = userLiteral(name);
          doc._creator = creator;
          const creatorId = doc._creator._id;
          assert.ok(creatorId);
          assert.equal(doc._creator.name, name);
          assert.ok(doc._creator instanceof U);

          const fan2Id = doc.fans[2]._id;
          const fan5Id = doc.fans[5]._id;

          name = 'user1a';
          const user1a = userLiteral(name);
          doc.embed[0].array.set(0, user1a);
          assert.equal(doc.embed[0].array[0].name, name);
          const user1aId = doc.embed[0].array[0]._id;

          name = 'user1b';
          const user1b = userLiteral(name);
          doc.embed[0].other = user1b;
          assert.equal(doc.embed[0].other.name, name);
          const user1bId = doc.embed[0].other._id;

          name = 'user1c';
          const user1c = userLiteral(name);
          doc.embed[0].nested = [{ subdoc: user1c }];
          assert.equal(doc.embed[0].nested[0].subdoc.name, name);
          const user1cId = doc.embed[0].nested[0].subdoc._id;

          // embedded without declared ref in schema
          name = 'user2a';
          const user2a = userLiteral(name);
          doc.adhoc[0].subdoc = user2a;
          assert.equal(doc.adhoc[0].subdoc.name, name);
          const user2aId = doc.adhoc[0].subdoc._id;

          name = 'user2b';
          const user2b = userLiteral(name);
          doc.adhoc[0].subarray[0].things.push(user2b);
          assert.deepEqual(name, doc.adhoc[0].subarray[0].things[1].name);
          const user2bId = doc.adhoc[0].subarray[0].things[1]._id;

          await doc.save();

          const doc2 = await B.findById(b2).exec();

          assert.equal(doc2.fans.length, 6);
          assert.equal(String(doc2._creator), creatorId);
          assert.equal(doc2.fans[2], String(fan2Id));
          assert.equal(doc2.fans[5], String(fan5Id));
          assert.equal(doc2.embed[0].array[0], String(user1aId));
          assert.equal(doc2.embed[0].other, String(user1bId));
          assert.equal(doc2.embed[0].nested[0].subdoc, String(user1cId));
          assert.equal(doc2.adhoc[0].subdoc, String(user2aId));
          assert.equal(doc2.adhoc[0].subarray[0].things[1], String(user2bId));
        });
      });
    });
  });
});
