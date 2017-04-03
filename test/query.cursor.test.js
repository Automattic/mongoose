/**
 * Module dependencies.
 */

var assert = require('assert');
var start = require('./common');

var mongoose = start.mongoose;
var Schema = mongoose.Schema;

describe('QueryCursor', function() {
  var db;
  var Model;

  before(function(done) {
    db = start();

    var schema = new Schema({ name: String });
    schema.virtual('test').get(function() { return 'test'; });

    Model = db.model('gh1907_0', schema);

    Model.create({ name: 'Axl' }, { name: 'Slash' }, function(error) {
      assert.ifError(error);
      done();
    });
  });

  after(function(done) {
    db.close(done);
  });

  describe('#next()', function() {
    it('with callbacks', function(done) {
      var cursor = Model.find().sort({ name: 1 }).cursor();
      cursor.next(function(error, doc) {
        assert.ifError(error);
        assert.equal(doc.name, 'Axl');
        assert.equal(doc.test, 'test');
        cursor.next(function(error, doc) {
          assert.ifError(error);
          assert.equal(doc.name, 'Slash');
          assert.equal(doc.test, 'test');
          done();
        });
      });
    });

    it('with promises', function(done) {
      var cursor = Model.find().sort({ name: 1 }).cursor();
      cursor.next().then(function(doc) {
        assert.equal(doc.name, 'Axl');
        assert.equal(doc.test, 'test');
        cursor.next().then(function(doc) {
          assert.equal(doc.name, 'Slash');
          assert.equal(doc.test, 'test');
          done();
        });
      });
    });

    it('with limit (gh-4266)', function(done) {
      var cursor = Model.find().limit(1).sort({ name: 1 }).cursor();
      cursor.next(function(error, doc) {
        assert.ifError(error);
        assert.equal(doc.name, 'Axl');
        cursor.next(function(error, doc) {
          assert.ifError(error);
          assert.ok(!doc);
          done();
        });
      });
    });

    it('with projection', function(done) {
      var personSchema = new Schema({
        name: String,
        born: String
      });
      var Person = db.model('Person4342', personSchema);
      var people = [
        { name: 'Axl Rose', born: 'William Bruce Rose' },
        { name: 'Slash', born: 'Saul Hudson' }
      ];
      Person.create(people, function(error) {
        assert.ifError(error);
        var cursor = Person.find({}, { _id: 0, name: 1 }).sort({ name: 1 }).cursor();
        cursor.next(function(error, doc) {
          assert.ifError(error);
          assert.equal(doc._id, undefined);
          assert.equal(doc.name, 'Axl Rose');
          assert.equal(doc.born, undefined);
          cursor.next(function(error, doc) {
            assert.ifError(error);
            assert.equal(doc._id, undefined);
            assert.equal(doc.name, 'Slash');
            assert.equal(doc.born, undefined);
            done();
          });
        });
      });
    });

    it('with populate', function(done) {
      var bandSchema = new Schema({
        name: String,
        members: [{ type: mongoose.Schema.ObjectId, ref: 'Person1907' }]
      });
      var personSchema = new Schema({
        name: String
      });

      var Person = db.model('Person1907', personSchema);
      var Band = db.model('Band1907', bandSchema);

      var people = [
        { name: 'Axl Rose' },
        { name: 'Slash' },
        { name: 'Nikki Sixx' },
        { name: 'Vince Neil' }
      ];
      Person.create(people, function(error, docs) {
        assert.ifError(error);
        var bands = [
          { name: 'Guns N\' Roses', members: [docs[0], docs[1]] },
          { name: 'Motley Crue', members: [docs[2], docs[3]] }
        ];
        Band.create(bands, function(error) {
          assert.ifError(error);
          var cursor =
            Band.find().sort({ name: 1 }).populate('members').cursor();
          cursor.next(function(error, doc) {
            assert.ifError(error);
            assert.equal(doc.name, 'Guns N\' Roses');
            assert.equal(doc.members.length, 2);
            assert.equal(doc.members[0].name, 'Axl Rose');
            assert.equal(doc.members[1].name, 'Slash');
            cursor.next(function(error, doc) {
              assert.equal(doc.name, 'Motley Crue');
              assert.equal(doc.members.length, 2);
              assert.equal(doc.members[0].name, 'Nikki Sixx');
              assert.equal(doc.members[1].name, 'Vince Neil');
              done();
            });
          });
        });
      });
    });

    it('casting ObjectIds with where() (gh-4355)', function(done) {
      Model.findOne(function(error, doc) {
        assert.ifError(error);
        assert.ok(doc);
        var query = { _id: doc._id.toHexString() };
        Model.find().where(query).cursor().next(function(error, doc) {
          assert.ifError(error);
          assert.ok(doc);
          done();
        });
      });
    });

    it('cast errors (gh-4355)', function(done) {
      Model.find().where({ _id: 'BadId' }).cursor().next(function(error) {
        assert.ok(error);
        assert.equal(error.name, 'CastError');
        assert.equal(error.path, '_id');
        done();
      });
    });

    it('with pre-find hooks (gh-5096)', function(done) {
      var schema = new Schema({ name: String });
      var called = 0;
      schema.pre('find', function(next) {
        ++called;
        next();
      });

      var Model = db.model('gh5096', schema);
      Model.create({ name: 'Test' }, function(error) {
        assert.ifError(error);
        Model.find().cursor().next(function(error, doc) {
          assert.ifError(error);
          assert.equal(called, 1);
          assert.equal(doc.name, 'Test');
          done();
        });
      });
    });
  });

  it('as readable stream', function(done) {
    var cursor = Model.find().sort({ name: 1 }).cursor();

    var expectedNames = ['Axl', 'Slash'];
    var cur = 0;
    cursor.on('data', function(doc) {
      assert.equal(doc.name, expectedNames[cur++]);
      assert.equal(doc.test, 'test');
    });

    cursor.on('error', function(error) {
      done(error);
    });

    cursor.on('end', function() {
      assert.equal(cur, 2);
      done();
    });
  });

  describe('`transform` option', function() {
    it('transforms document', function(done) {
      var cursor = Model.find().sort({ name: 1 }).cursor({
        transform: function(doc) {
          doc.name += '_transform';
          return doc;
        }
      });

      var expectedNames = ['Axl_transform', 'Slash_transform'];
      var cur = 0;
      cursor.on('data', function(doc) {
        assert.equal(doc.name, expectedNames[cur++]);
        assert.equal(doc.test, 'test');
      });

      cursor.on('error', function(error) {
        done(error);
      });

      cursor.on('end', function() {
        assert.equal(cur, 2);
        done();
      });
    });
  });

  describe('#map', function() {
    it('maps documents', function(done) {
      var cursor = Model.find().sort({ name: 1 }).cursor()
        .map(function(obj) {
          obj.name += '_mapped';
          return obj;
        })
        .map(function(obj) {
          obj.name += '_mappedagain';
          return obj;
        });

      var expectedNames = ['Axl_mapped_mappedagain', 'Slash_mapped_mappedagain'];
      var cur = 0;
      cursor.on('data', function(doc) {
        assert.equal(doc.name, expectedNames[cur++]);
        assert.equal(doc.test, 'test');
      });

      cursor.on('error', function(error) {
        done(error);
      });

      cursor.on('end', function() {
        assert.equal(cur, 2);
        done();
      });
    });

    it('with #next', function(done) {
      var cursor = Model.find().sort({ name: 1 }).cursor()
        .map(function(obj) {
          obj.name += '_next';
          return obj;
        });

      cursor.next(function(error, doc) {
        assert.ifError(error);
        assert.equal(doc.name, 'Axl_next');
        assert.equal(doc.test, 'test');
        cursor.next(function(error, doc) {
          assert.ifError(error);
          assert.equal(doc.name, 'Slash_next');
          assert.equal(doc.test, 'test');
          done();
        });
      });
    });
  });

  describe('#eachAsync()', function() {
    it('iterates one-by-one, stopping for promises', function(done) {
      var cursor = Model.find().sort({ name: 1 }).cursor();

      var expectedNames = ['Axl', 'Slash'];
      var cur = 0;

      var checkDoc = function(doc) {
        var _cur = cur;
        assert.equal(doc.name, expectedNames[cur]);
        return {
          then: function(onResolve) {
            setTimeout(function() {
              assert.equal(_cur, cur++);
              onResolve();
            }, 50);
          }
        };
      };
      cursor.eachAsync(checkDoc).then(function() {
        assert.equal(cur, 2);
        done();
      }).catch(done);
    });
  });

  describe('#lean()', function() {
    it('lean', function(done) {
      var cursor = Model.find().sort({ name: 1 }).lean().cursor();

      var expectedNames = ['Axl', 'Slash'];
      var cur = 0;
      cursor.on('data', function(doc) {
        assert.equal(doc.name, expectedNames[cur++]);
        assert.strictEqual(false, doc instanceof mongoose.Document);
      });

      cursor.on('error', function(error) {
        done(error);
      });

      cursor.on('end', function() {
        assert.equal(cur, 2);
        done();
      });

    });
  });

  describe('#close()', function() {
    it('works (gh-4258)', function(done) {
      var cursor = Model.find().sort({ name: 1 }).cursor();
      cursor.next(function(error, doc) {
        assert.ifError(error);
        assert.equal(doc.name, 'Axl');
        assert.equal(doc.test, 'test');

        var closed = false;
        cursor.on('close', function() {
          closed = true;
        });

        cursor.close(function(error) {
          assert.ifError(error);
          assert.ok(closed);
          cursor.next(function(error) {
            assert.ok(error);
            assert.equal(error.message, 'Cursor is closed');
            done();
          });
        });
      });
    });
  });

  it('data before close (gh-4998)', function(done) {
    var userSchema = new mongoose.Schema({
      name:  String
    });

    var User = db.model('gh4998', userSchema);
    var users = [];
    for (var i = 0; i < 100; i++) {
      users.push({
        _id: mongoose.Types.ObjectId(),
        name: 'Bob' + (i < 10 ? '0' : '') + i
      });
    }

    User.insertMany(users, function(error) {
      assert.ifError(error);

      var stream = User.find({}).cursor();
      var docs = [];

      stream.on('data', function(doc) {
        docs.push(doc);
      });

      stream.on('close', function() {
        assert.equal(docs.length, 100);
        done();
      });
    });
  });
});
