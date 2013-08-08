
/**
 * Test dependencies.
 */

var start = require('./common')
  , assert = require('assert')
  , mongoose = start.mongoose
  , utils = require('../lib/utils')
  , random = utils.random
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId
  , DocObjectId = mongoose.Types.ObjectId

/**
 * Setup.
 */

var posts = 'blogposts_' + random()
  , users = 'users_' + random();

/**
 * Tests.
 */

describe('model: populate:', function(){
  describe('setting populated paths (gh-570)', function(){
    var types = {
        'ObjectId': DocObjectId
      , 'String': String
      , 'Number': Number
      , 'Buffer': Buffer
    }

    var construct = {};
    construct.String = random;
    construct.ObjectId = DocObjectId;
    construct.Number = random;
    construct.Buffer = function () {
      return new Buffer(random());
    }

    Object.keys(types).forEach(function (id) {
      describe('should not cast to _id of type ' + id, function(){
        var ID = types[id];
        var refuser;
        var db;
        var B, U;
        var u1, u2;
        var b1, b2

        before(function(done){
          refuser = 'RefUser-'+id;

          var bSchema = Schema({
              title: String
            , fans: [{type: id, ref: refuser }]
            , adhoc: [{ subdoc: id, subarray: [{ things: [id] }] }]
            , _creator: { type: id, ref: refuser }
            , embed: [{
                  other: { type: id, ref: refuser }
                , array: [{ type: id, ref: refuser }]
              }]
          });

          var uSchema = Schema({
              _id: id
            , name: String
            , email: String
          });

          db = start()
          B = db.model('RefBlogPost-'+id, bSchema, posts + random())
          U = db.model(refuser, uSchema, users + random());

          U.create({
              _id: construct[id]()
            , name  : 'Fan 1'
            , email : 'fan1@learnboost.com'
          }, {
              _id: construct[id]()
            , name  : 'Fan 2'
            , email : 'fan2@learnboost.com'
          }, function (err, fan1, fan2) {
            assert.ifError(err);
            u1 = fan1;
            u2 = fan2;

            B.create({
                title : 'Woot'
              , fans  : [fan1, fan2]
              , adhoc : [{ subdoc: fan2, subarray: [{ things: [fan1] }]}]
              , _creator: fan1
              , embed : [{ other: fan1, array: [fan1, fan2] }, { other: fan2, array: [fan2, fan1] }]
            }, {
                title : 'Woot2'
              , fans  : [fan2, fan1]
              , adhoc : [{ subdoc: fan1, subarray: [{ things: [fan2] }]}]
              , _creator: fan1
              , _creator: fan2
              , embed : [{ other: fan2, array: [fan2, fan1] }, { other: fan1, array: [fan1, fan2] }]
            }, function (err, post1, post2) {
              assert.ifError(err);
              b1 = post1;
              b2 = post2;
              done();
            });
          });
        })

        after(function(done){
          db.close(done)
        })

        function userLiteral (name) {
          return { _id: construct[id](), name: name };
        }

        function user (name) {
          return new U(userLiteral(name));
        }

        it('if a document', function(done){
          B.findById(b1)
           .populate('fans _creator embed.other embed.array')
           .populate({ path: 'adhoc.subdoc', model: refuser })
           .populate({ path: 'adhoc.subarray.things', model: refuser })
           .exec(function (err, doc) {
            assert.ifError(err);

            var user3 = user('user3');
            doc.fans.push(user3);
            assert.deepEqual(doc.fans[2].toObject(), user3.toObject());

            var user4 = user('user4');
            doc.fans.nonAtomicPush(user4);
            assert.deepEqual(doc.fans[3].toObject(), user4.toObject());

            var user5 = user('user5');
            doc.fans.splice(2, 1, user5);
            assert.deepEqual(doc.fans[2].toObject(), user5.toObject());

            var user6 = user('user6');
            doc.fans.unshift(user6);
            assert.deepEqual(doc.fans[0].toObject(), user6.toObject());

            var user7 = user('user7');
            doc.fans.addToSet(user7);
            assert.deepEqual(doc.fans[5].toObject(), user7.toObject());

            doc.fans.forEach(function (doc) {
              assert.ok(doc instanceof U);
            })

            var user8 = user('user8');
            doc.fans.set(0, user8);
            assert.deepEqual(doc.fans[0].toObject(), user8.toObject());

            doc.fans.push(null);
            assert.equal(doc.fans[6], null);

            var _id = construct[id]();
            doc.fans.addToSet(_id);
            if (Buffer.isBuffer(_id)) {
              assert.equal(doc.fans[7]._id.toString('utf8'), _id.toString('utf8'));
            } else {
              assert.equal(doc.fans[7]._id, String(_id));
            }

            assert.equal(doc._creator.email, u1.email);

            doc._creator = null;
            assert.equal(null, doc._creator);

            var creator = user('creator');
            doc._creator = creator;
            assert.ok(doc._creator instanceof mongoose.Document);
            assert.deepEqual(doc._creator.toObject(), creator.toObject());

            // embedded with declared ref in schema
            var user1a = user('user1a');
            doc.embed[0].array.set(0, user1a);
            assert.deepEqual(doc.embed[0].array[0].toObject(), user1a.toObject());

            var user1b = user('user1b');
            doc.embed[0].other = user1b;
            assert.deepEqual(doc.embed[0].other.toObject(), user1b.toObject());

            // embedded without declared ref in schema
            var user2a = user('user2a');
            doc.adhoc[0].subdoc = user2a;
            assert.deepEqual(doc.adhoc[0].subdoc.toObject(), user2a.toObject());

            var user2b = user('user2b');
            doc.adhoc[0].subarray[0].things.push(user2b);
            assert.deepEqual(doc.adhoc[0].subarray[0].things[1].toObject(), user2b.toObject());

            doc.save(function (err) {
              assert.ifError(err);
              B.findById(b1).exec(function (err, doc) {
                // db is closed in after()
                assert.ifError(err);
                assert.equal(8, doc.fans.length);
                assert.equal(doc.fans[0], user8.id);
                assert.equal(doc.fans[5], user7.id);
                assert.equal(doc.fans[6], null);
                assert.equal(doc.fans[7], String(_id));
                assert.equal(String(doc._creator), creator._id);
                assert.equal(doc.embed[0].array[0], user1a.id);
                assert.equal(doc.embed[0].other, user1b.id);
                assert.equal(doc.adhoc[0].subdoc, user2a.id);
                assert.equal(doc.adhoc[0].subarray[0].things[1], user2b.id);
                done();
              })
            })
          })
        })

        it('if an object', function(done){
          B.findById(b2)
           .populate('fans _creator embed.other embed.array')
           .populate({ path: 'adhoc.subdoc', model: refuser })
           .populate({ path: 'adhoc.subarray.things', model: refuser })
           .exec(function (err, doc) {
            assert.ifError(err);

            var name = 'fan1';
            doc.fans.push(userLiteral(name));
            assert.ok(doc.fans[2]._id);
            assert.equal(name, doc.fans[2].name);

            name = 'fan2';
            doc.fans.nonAtomicPush(userLiteral(name));
            assert.ok(doc.fans[3]._id);
            assert.equal(name, doc.fans[3].name);

            name = 'fan3';
            doc.fans.splice(2,1,userLiteral(name));
            assert.ok(doc.fans[2]._id);
            assert.equal(name, doc.fans[2].name);

            name = 'fan4';
            doc.fans.unshift(userLiteral(name));
            assert.ok(doc.fans[0]._id);
            assert.equal(name, doc.fans[0].name);

            name = 'fan5';
            doc.fans.addToSet(userLiteral(name));
            assert.ok(doc.fans[5]._id);
            assert.equal(name, doc.fans[5].name);

            name = 'fan6';
            doc.fans.set(0, userLiteral(name));
            assert.ok(doc.fans[0]._id);
            assert.equal(name, doc.fans[0].name);

            doc.fans.forEach(function (doc) {
              assert.ok(doc instanceof U);
            })

            name = 'creator';
            var creator = userLiteral(name);
            doc._creator = creator;
            var creatorId = doc._creator._id;
            assert.ok(creatorId);
            assert.equal(name, doc._creator.name);
            assert.ok(doc._creator instanceof U);

            var fan2Id = doc.fans[2]._id;
            var fan5Id = doc.fans[5]._id;

            name = 'user1a';
            var user1a = userLiteral(name);
            doc.embed[0].array.set(0, user1a);
            assert.equal(name, doc.embed[0].array[0].name);
            var user1aId = doc.embed[0].array[0]._id

            name = 'user1b';
            var user1b = userLiteral(name);
            doc.embed[0].other = user1b;
            assert.equal(name, doc.embed[0].other.name);
            var user1bId = doc.embed[0].other._id

            // embedded without declared ref in schema
            name = 'user2a';
            var user2a = userLiteral(name);
            doc.adhoc[0].subdoc = user2a;
            assert.equal(name, doc.adhoc[0].subdoc.name);
            var user2aId = doc.adhoc[0].subdoc._id;

            name = 'user2b';
            var user2b = userLiteral(name);
            doc.adhoc[0].subarray[0].things.push(user2b);
            assert.deepEqual(name, doc.adhoc[0].subarray[0].things[1].name);
            var user2bId = doc.adhoc[0].subarray[0].things[1]._id;

            doc.save(function (err) {
              assert.ifError(err);
              B.findById(b2).exec(function (err, doc) {
                // db is closed in after()
                assert.ifError(err);
                assert.equal(6, doc.fans.length);
                assert.equal(String(doc._creator), creatorId);
                assert.equal(doc.fans[2], String(fan2Id));
                assert.equal(doc.fans[5], String(fan5Id));
                assert.equal(doc.embed[0].array[0], String(user1aId));
                assert.equal(doc.embed[0].other, String(user1bId));
                assert.equal(doc.adhoc[0].subdoc, String(user2aId));
                assert.equal(doc.adhoc[0].subarray[0].things[1], String(user2bId));
                done();
              })
            });
          });
        })

      })
    })
  })
  it('limit should apply to each item, not in aggregate (gh-1490)', function(done){
    var db = start();
    var sB = new Schema({
        name            : String
    });
    var name = 'b' + random();
    var sJ = new Schema({
        b    : [{ type: Schema.Types.ObjectId, ref: name }]
    });
    var B = db.model(name, sB);
    var J = db.model('j' + random(), sJ);

    var b1 = new B({ name : 'thing1'});
    var b2 = new B({ name : 'thing2'});
    var b3 = new B({ name : 'thing3'});
    var b4 = new B({ name : 'thing4'});
    var b5 = new B({ name : 'thing5'});

    var j1 = new J({ b : [b1.id, b2.id, b5.id]});
    var j2 = new J({ b : [b3.id, b4.id, b5.id]});

    var count = 7;

    b1.save(function (err) {
      if (err) throw err;
      --count || next();
    });
    b2.save(function (err) {
      if (err) throw err;
      --count || next();
    });
    b3.save(function (err) {
      if (err) throw err;
      --count || next();
    });
    b4.save(function (err) {
      if (err) throw err;
      --count || next();
    });
    b5.save(function (err) {
      if (err) throw err;
      --count || next();
    });
    j1.save(function (err) {
      if (err) throw err;
      --count || next();
    });
    j2.save(function (err) {
      if (err) throw err;
      --count || next();
    });

    function next() {
      J.find().populate({ path: 'b', options : { limit : 2 } }).exec(function (err, j) {
        assert.equal(j.length, 2);
        assert.equal(j[0].b.length, 2);
        assert.equal(j[1].b.length, 2);
        done();
      });
    }
  })
})
