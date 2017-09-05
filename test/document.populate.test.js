
/**
 * Test dependencies.
 */

var start = require('./common'),
    assert = require('power-assert'),
    mongoose = start.mongoose,
    utils = require('../lib/utils'),
    random = utils.random,
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId,
    Document = require('../lib/document');

/**
 * Setup.
 */

/**
 * Test Document constructor.
 */

function TestDocument() {
  Document.apply(this, arguments);
}

/**
 * Inherits from Document.
 */

TestDocument.prototype.__proto__ = Document.prototype;

/**
 * Set a dummy schema to simulate compilation.
 */

var em = new Schema({title: String, body: String});
em.virtual('works').get(function() {
  return 'em virtual works';
});
var schema = new Schema({
  test: String,
  oids: [ObjectId],
  numbers: [Number],
  nested: {
    age: Number,
    cool: ObjectId,
    deep: {x: String},
    path: String,
    setr: String
  },
  nested2: {
    nested: String,
    yup: {
      nested: Boolean,
      yup: String,
      age: Number
    }
  },
  em: [em],
  date: Date
});
TestDocument.prototype.$__setSchema(schema);

/**
 * User schema.
 */

var User = new Schema({
  name: String,
  email: String,
  gender: {type: String, enum: ['male', 'female'], default: 'male'},
  age: {type: Number, default: 21},
  blogposts: [{type: ObjectId, ref: 'doc.populate.b'}]
}, {collection: 'doc.populate.us'});

/**
 * Comment subdocument schema.
 */

var Comment = new Schema({
  asers: [{type: ObjectId, ref: 'doc.populate.u'}],
  _creator: {type: ObjectId, ref: 'doc.populate.u'},
  content: String
});

/**
 * Blog post schema.
 */

var BlogPost = new Schema({
  _creator: {type: ObjectId, ref: 'doc.populate.u'},
  title: String,
  comments: [Comment],
  fans: [{type: ObjectId, ref: 'doc.populate.u'}]
});

mongoose.model('doc.populate.b', BlogPost);
mongoose.model('doc.populate.u', User);
mongoose.model('doc.populate.u2', User);

describe('document.populate', function() {
  var db, B, User;
  var user1, user2, post, _id;

  before(function(done) {
    db = start();
    B = db.model('doc.populate.b');
    User = db.model('doc.populate.u');

    _id = new mongoose.Types.ObjectId;

    User.create({
      name: 'Phoenix',
      email: 'phx@az.com',
      blogposts: [_id]
    }, {
      name: 'Newark',
      email: 'ewr@nj.com',
      blogposts: [_id]
    }, function(err, u1, u2) {
      assert.ifError(err);

      user1 = u1;
      user2 = u2;

      B.create({
        title: 'the how and why',
        _creator: user1,
        fans: [user1, user2],
        comments: [{_creator: user2, content: 'user2'}, {_creator: user1, content: 'user1'}]
      }, function(err, p) {
        assert.ifError(err);
        post = p;
        done();
      });
    });
  });

  after(function(done) {
    db.close(done);
  });

  describe('argument processing', function() {
    describe('duplicates', function() {
      it('are removed', function(done) {
        B.findById(post, function(err, post) {
          assert.ifError(err);
          post.populate('_creator');
          assert.equal(Object.keys(post.$__.populate).length, 1);
          assert.ok('_creator' in post.$__.populate);
          post.populate('_creator');
          assert.equal(Object.keys(post.$__.populate).length, 1);
          assert.ok('_creator' in post.$__.populate);
          post.populate('_creator fans');
          assert.equal(Object.keys(post.$__.populate).length, 2);
          assert.ok('_creator' in post.$__.populate);
          assert.ok('fans' in post.$__.populate);
          post.populate({path: '_creator'});
          assert.equal(Object.keys(post.$__.populate).length, 2);
          assert.ok('_creator' in post.$__.populate);
          assert.ok('fans' in post.$__.populate);
          done();
        });
      });
      it('overwrite previous', function(done) {
        B.findById(post, function(err, post) {
          assert.ifError(err);
          post.populate('_creator');
          assert.equal(Object.keys(post.$__.populate).length, 1);
          assert.equal(post.$__.populate._creator.select, undefined);
          post.populate({path: '_creator', select: 'name'});
          assert.equal(Object.keys(post.$__.populate).length, 1);
          assert.ok('_creator' in post.$__.populate);
          assert.equal(post.$__.populate._creator.select, 'name');
          done();
        });
      });
    });
  });

  describe('options', function() {
    it('resets populate options after execution', function(done) {
      B.findById(post, function(err, post) {
        var creator_id = post._creator;
        post.populate('_creator', function(err) {
          assert.ifError(err);
          assert.ok(!post.$__.populate);
          assert.ok(post._creator);
          assert.equal(String(post._creator._id), String(creator_id));
          done();
        });
      });
    });

    it('are not modified when no arguments are passed', function(done) {
      var d = new TestDocument();
      var o = utils.clone(d.options);
      assert.deepEqual(o, d.populate().options);
      done();
    });
  });

  describe('populating two paths', function() {
    it('with space delmited string works', function(done) {
      B.findById(post, function(err, post) {
        var creator_id = post._creator;
        var alt_id = post.fans[1];
        post.populate('_creator fans', function(err) {
          assert.ifError(err);
          assert.ok(post._creator);
          assert.equal(String(post._creator._id), String(creator_id));
          assert.equal(String(post.fans[0]._id), String(creator_id));
          assert.equal(String(post.fans[1]._id), String(alt_id));
          done();
        });
      });
    });
  });

  it('works with just a callback', function(done) {
    B.findById(post, function(err, post) {
      var creator_id = post._creator;
      var alt_id = post.fans[1];
      post.populate('_creator').populate(function(err) {
        assert.ifError(err);
        assert.ok(post._creator);
        assert.equal(String(post._creator._id), String(creator_id));
        assert.equal(String(post.fans[1]), String(alt_id));
        done();
      });
    });
  });

  it('populating using space delimited paths with options', function(done) {
    B.findById(post, function(err, post) {
      var param = {};
      param.select = '-email';
      param.options = {sort: 'name'};
      param.path = '_creator fans'; // 2 paths

      var creator_id = post._creator;
      var alt_id = post.fans[1];
      post.populate(param, function(err, post) {
        assert.ifError(err);
        assert.equal(post.fans.length, 2);
        assert.equal(String(post._creator._id), String(creator_id));
        assert.equal(String(post.fans[1]._id), String(creator_id));
        assert.equal(String(post.fans[0]._id), String(alt_id));
        assert.ok(!post.fans[0].email);
        assert.ok(!post.fans[1].email);
        assert.ok(!post.fans[0].isInit('email'));
        assert.ok(!post.fans[1].isInit('email'));
        done();
      });
    });
  });

  it('using multiple populate calls', function(done) {
    B.findById(post, function(err, post) {
      var creator_id = post._creator;
      var alt_id = post.fans[1];

      var param = {};
      param.select = '-email';
      param.options = {sort: 'name'};
      param.path = '_creator';
      post.populate(param);
      param.path = 'fans';

      post.populate(param, function(err, post) {
        assert.ifError(err);
        assert.equal(post.fans.length, 2);
        assert.equal(String(post._creator._id), String(creator_id));
        assert.equal(String(post.fans[1]._id), String(creator_id));
        assert.equal(String(post.fans[0]._id), String(alt_id));
        assert.ok(!post.fans[0].email);
        assert.ok(!post.fans[1].email);
        assert.ok(!post.fans[0].isInit('email'));
        assert.ok(!post.fans[1].isInit('email'));
        done();
      });
    });
  });

  it('with custom model selection', function(done) {
    B.findById(post, function(err, post) {
      var param = {};
      param.select = '-email';
      param.options = {sort: 'name'};
      param.path = '_creator fans';
      param.model = 'doc.populate.u2';

      var creator_id = post._creator;
      var alt_id = post.fans[1];
      post.populate(param, function(err, post) {
        assert.ifError(err);
        assert.equal(post.fans.length, 2);
        assert.equal(String(post._creator._id), String(creator_id));
        assert.equal(String(post.fans[1]._id), String(creator_id));
        assert.equal(String(post.fans[0]._id), String(alt_id));
        assert.ok(!post.fans[0].email);
        assert.ok(!post.fans[1].email);
        assert.ok(!post.fans[0].isInit('email'));
        assert.ok(!post.fans[1].isInit('email'));
        done();
      });
    });
  });

  it('a property not in schema', function(done) {
    B.findById(post, function(err, post) {
      assert.ifError(err);
      post.populate('idontexist', function(err) {
        assert.ifError(err);

        // stuff an ad-hoc value in
        post.setValue('idontexist', user1._id);

        // populate the non-schema value by passing an explicit model
        post.populate({path: 'idontexist', model: 'doc.populate.u'}, function(err, post) {
          assert.ifError(err);
          assert.ok(post);
          assert.equal(user1._id.toString(), post.get('idontexist')._id);
          assert.equal(post.get('idontexist').name, 'Phoenix');
          done();
        });
      });
    });
  });

  it('of empty array', function(done) {
    B.findById(post, function(err, post) {
      post.fans = [];
      post.populate('fans', function(err) {
        assert.ifError(err);
        done();
      });
    });
  });

  it('of array of null/undefined', function(done) {
    B.findById(post, function(err, post) {
      post.fans = [null, undefined];
      post.populate('fans', function(err) {
        assert.ifError(err);
        done();
      });
    });
  });

  it('of null property', function(done) {
    B.findById(post, function(err, post) {
      post._creator = null;
      post.populate('_creator', function(err) {
        assert.ifError(err);
        done();
      });
    });
  });

  it('String _ids', function(done) {
    var db = start();

    var UserSchema = new Schema({
      _id: String,
      name: String
    });

    var NoteSchema = new Schema({
      author: {type: String, ref: 'UserWithStringId'},
      body: String
    });

    var User = db.model('UserWithStringId', UserSchema, random());
    var Note = db.model('NoteWithStringId', NoteSchema, random());

    var alice = new User({_id: 'alice', name: 'Alice In Wonderland'});

    alice.save(function(err) {
      assert.ifError(err);

      var note = new Note({author: 'alice', body: 'Buy Milk'});
      note.populate('author', function(err) {
        db.close();
        assert.ifError(err);
        assert.ok(note.author);
        assert.equal(note.author._id, 'alice');
        assert.equal(note.author.name, 'Alice In Wonderland');
        done();
      });
    });
  });

  it('Buffer _ids', function(done) {
    var db = start();

    var UserSchema = new Schema({
      _id: Buffer,
      name: String
    });

    var NoteSchema = new Schema({
      author: {type: Buffer, ref: 'UserWithBufferId'},
      body: String
    });

    var User = db.model('UserWithBufferId', UserSchema, random());
    var Note = db.model('NoteWithBufferId', NoteSchema, random());

    var alice = new User({_id: new mongoose.Types.Buffer('YWxpY2U=', 'base64'), name: 'Alice'});

    alice.save(function(err) {
      assert.ifError(err);

      var note = new Note({author: 'alice', body: 'Buy Milk'});
      note.save(function(err) {
        assert.ifError(err);

        Note.findById(note.id, function(err, note) {
          assert.ifError(err);
          assert.equal(note.author, 'alice');
          note.populate('author', function(err, note) {
            db.close();
            assert.ifError(err);
            assert.equal(note.body, 'Buy Milk');
            assert.ok(note.author);
            assert.equal(note.author.name, 'Alice');
            done();
          });
        });
      });
    });
  });

  it('Number _ids', function(done) {
    var db = start();

    var UserSchema = new Schema({
      _id: Number,
      name: String
    });

    var NoteSchema = new Schema({
      author: {type: Number, ref: 'UserWithNumberId'},
      body: String
    });

    var User = db.model('UserWithNumberId', UserSchema, random());
    var Note = db.model('NoteWithNumberId', NoteSchema, random());

    var alice = new User({_id: 2359, name: 'Alice'});

    alice.save(function(err) {
      assert.ifError(err);

      var note = new Note({author: 2359, body: 'Buy Milk'});
      note.populate('author').populate(function(err, note) {
        db.close();
        assert.ifError(err);
        assert.ok(note.author);
        assert.equal(note.author._id, 2359);
        assert.equal('Alice', note.author.name);
        done();
      });
    });
  });

  describe('sub-level properties', function() {
    it('with string arg', function(done) {
      B.findById(post, function(err, post) {
        var id0 = post.comments[0]._creator;
        var id1 = post.comments[1]._creator;
        post.populate('comments._creator', function(err, post) {
          assert.ifError(err);
          assert.equal(post.comments.length, 2);
          assert.equal(post.comments[0]._creator.id, id0);
          assert.equal(post.comments[1]._creator.id, id1);
          done();
        });
      });
    });
  });

  describe('of new document', function() {
    it('should save just the populated _id (gh-1442)', function(done) {
      var b = new B({_creator: user1});
      b.populate('_creator', function(err, b) {
        if (err) return done(err);
        assert.equal(b._creator.name, 'Phoenix');
        b.save(function(err) {
          assert.ifError(err);
          B.collection.findOne({_id: b._id}, function(err, b) {
            assert.ifError(err);
            assert.equal(b._creator, String(user1._id));
            done();
          });
        });
      });
    });
  });

  it('gh-3308', function(done) {
    var db = start();

    var Person = db.model('gh3308', {
      name: String
    });

    var Band = db.model('gh3308_0', {
      guitarist: {type: Schema.Types.ObjectId, ref: 'gh3308'}
    });

    var slash = new Person({name: 'Slash'});
    var gnr = new Band({guitarist: slash._id});

    gnr.guitarist = slash;
    assert.equal(gnr.guitarist.name, 'Slash');
    assert.ok(gnr.populated('guitarist'));

    var buckethead = new Person({name: 'Buckethead'});
    gnr.guitarist = buckethead._id;
    assert.ok(!gnr.populated('guitarist'));

    db.close(done);
  });

  describe('gh-2214', function() {
    it('should return a real document array when populating', function(done) {
      var db = start();

      var Car = db.model('gh-2214-1', {
        color: String,
        model: String
      });

      var Person = db.model('gh-2214-2', {
        name: String,
        cars: [
          {
            type: Schema.Types.ObjectId,
            ref: 'gh-2214-1'
          }
        ]
      });

      var car;
      var joe;
      joe = new Person({
        name: 'Joe'
      });
      car = new Car({
        model: 'BMW',
        color: 'red'
      });
      joe.cars.push(car);

      joe.save(function(error) {
        assert.ifError(error);
        car.save(function(error) {
          assert.ifError(error);
          Person.findById(joe.id, function(error, joe) {
            assert.ifError(error);
            joe.populate('cars', function(error) {
              assert.ifError(error);
              car = new Car({
                model: 'BMW',
                color: 'black'
              });
              joe.cars.push(car);
              assert.ok(joe.isModified('cars'));
              done();
              db.close();
            });
          });
        });
      });
    });
  });

  it('can depopulate (gh-2509)', function(done) {
    var db = start();

    var Person = db.model('gh2509_1', {
      name: String
    });

    var Band = db.model('gh2509_2', {
      name: String,
      members: [{type: Schema.Types.ObjectId, ref: 'gh2509_1'}],
      lead: {type: Schema.Types.ObjectId, ref: 'gh2509_1'}
    });

    var people = [{name: 'Axl Rose'}, {name: 'Slash'}];
    Person.create(people, function(error, docs) {
      assert.ifError(error);
      var band = {
        name: 'Guns N\' Roses',
        members: [docs[0]._id, docs[1]],
        lead: docs[0]._id
      };
      Band.create(band, function(error, band) {
        band.populate('members', function() {
          assert.equal(band.members[0].name, 'Axl Rose');
          band.depopulate('members');
          assert.ok(!band.members[0].name);
          assert.equal(band.members[0].toString(), docs[0]._id.toString());
          assert.equal(band.members[1].toString(), docs[1]._id.toString());
          assert.ok(!band.populated('members'));
          assert.ok(!band.populated('lead'));
          band.populate('lead', function() {
            assert.equal(band.lead.name, 'Axl Rose');
            band.depopulate('lead');
            assert.ok(!band.lead.name);
            assert.equal(band.lead.toString(), docs[0]._id.toString());
            db.close(done);
          });
        });
      });
    });
  });

  it('does not allow you to call populate() on nested docs (gh-4552)', function(done) {
    var EmbeddedSchema = new Schema({
      reference: {
        type: mongoose.Schema.ObjectId,
        ref: 'Reference'
      }
    });

    var ModelSchema = new Schema({
      embedded: EmbeddedSchema
    });

    var Model = db.model('gh4552', ModelSchema);

    var m = new Model({});
    m.embedded = {};
    assert.throws(function() {
      m.embedded.populate('reference');
    }, /on nested docs/);
    done();
  });

  it('handles pulling from populated array (gh-3579)', function(done) {
    var db = start();
    var barSchema = new Schema({name: String});

    var Bar = db.model('gh3579', barSchema);

    var fooSchema = new Schema({
      bars: [{
        type: Schema.Types.ObjectId,
        ref: 'gh3579'
      }]
    });

    var Foo = db.model('gh3579_0', fooSchema);

    Bar.create([{name: 'bar1'}, {name: 'bar2'}], function(error, docs) {
      assert.ifError(error);
      var foo = new Foo({bars: [docs[0], docs[1]]});
      foo.bars.pull(docs[0]._id);
      foo.save(function(error) {
        assert.ifError(error);
        Foo.findById(foo._id, function(error, foo) {
          assert.ifError(error);
          assert.equal(foo.bars.length, 1);
          assert.equal(foo.bars[0].toString(), docs[1]._id.toString());
          db.close(done);
        });
      });
    });
  });
});
