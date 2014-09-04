
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
  , Document = require('../lib/document')
  , DocObjectId = mongoose.Types.ObjectId

/**
 * Setup.
 */

/**
 * Test Document constructor.
 */

function TestDocument () {
  Document.apply(this, arguments);
};

/**
 * Inherits from Document.
 */

TestDocument.prototype.__proto__ = Document.prototype;

/**
 * Set a dummy schema to simulate compilation.
 */

var em = new Schema({ title: String, body: String });
em.virtual('works').get(function () {
  return 'em virtual works'
});
var schema = new Schema({
    test    : String
  , oids    : [ObjectId]
  , numbers : [Number]
  , nested  : {
        age   : Number
      , cool  : ObjectId
      , deep  : { x: String }
      , path  : String
      , setr  : String
    }
  , nested2 : {
        nested: String
      , yup   : {
            nested  : Boolean
          , yup     : String
          , age     : Number
        }
    }
  , em: [em]
  , date: Date
});
TestDocument.prototype.$__setSchema(schema);

/**
 * User schema.
 */

var User = new Schema({
    name      : String
  , email     : String
  , gender    : { type: String, enum: ['male', 'female'], default: 'male' }
  , age       : { type: Number, default: 21 }
  , blogposts : [{ type: ObjectId, ref: 'doc.populate.b' }]
}, { collection: 'doc.populate.us' });

/**
 * Comment subdocument schema.
 */

var Comment = new Schema({
    asers   : [{ type: ObjectId, ref: 'doc.populate.u' }]
  , _creator : { type: ObjectId, ref: 'doc.populate.u' }
  , content  : String
});

/**
 * Blog post schema.
 */

var BlogPost = new Schema({
    _creator      : { type: ObjectId, ref: 'doc.populate.u' }
  , title         : String
  , comments      : [Comment]
  , fans          : [{ type: ObjectId, ref: 'doc.populate.u' }]
});

var posts = 'blogposts_' + random()
  , users = 'users_' + random();

mongoose.model('doc.populate.b', BlogPost);
mongoose.model('doc.populate.u', User);
mongoose.model('doc.populate.u2', User);

describe('document.populate', function(){
  var db, B, User;
  var user1, user2, post, _id;

  before(function(done){
    db = start();
    B = db.model('doc.populate.b');
    User = db.model('doc.populate.u');

    _id = new mongoose.Types.ObjectId;

    User.create({
        name  : 'Phoenix'
      , email : 'phx@az.com'
      , blogposts: [_id]
    }, {
        name  : 'Newark'
      , email : 'ewr@nj.com'
      , blogposts: [_id]
    }, function (err, u1, u2) {
      assert.ifError(err);

      user1 = u1;
      user2 = u2;

      B.create({
          title     : 'the how and why'
        , _creator  : user1
        , fans: [user1, user2]
        , comments: [{ _creator: user2, content: 'user2' }, { _creator: user1, content: 'user1' }]
      }, function (err, p) {
        assert.ifError(err);
        post = p
        done();
      });
    });
  });

  after(function(done){
    db.close(done);
  })

  describe('argument processing', function(){
    describe('duplicates', function(){
      it('are removed', function(done){
        B.findById(post, function (err, post) {
          assert.ifError(err);
          post.populate('_creator');
          assert.equal(1, Object.keys(post.$__.populate).length);
          assert.ok('_creator' in post.$__.populate);
          post.populate('_creator');
          assert.equal(1, Object.keys(post.$__.populate).length);
          assert.ok('_creator' in post.$__.populate);
          post.populate('_creator fans');
          assert.equal(2, Object.keys(post.$__.populate).length);
          assert.ok('_creator' in post.$__.populate);
          assert.ok('fans' in post.$__.populate);
          post.populate({ path: '_creator' });
          assert.equal(2, Object.keys(post.$__.populate).length);
          assert.ok('_creator' in post.$__.populate);
          assert.ok('fans' in post.$__.populate);
          done();
        })
      })
      it('overwrite previous', function(done){
        B.findById(post, function (err, post) {
          assert.ifError(err);
          post.populate('_creator');
          assert.equal(1, Object.keys(post.$__.populate).length);
          assert.equal(undefined, post.$__.populate._creator.select);
          post.populate({ path: '_creator', select: 'name' });
          assert.equal(1, Object.keys(post.$__.populate).length);
          assert.ok('_creator' in post.$__.populate);
          assert.equal('name', post.$__.populate._creator.select);
          done();
        })
      })
    })
  })

  describe('options', function(){
    it('resets populate options after execution', function(done){
      B.findById(post, function (err, post) {
        var creator_id = post._creator;
        post.populate('_creator', function (err, post_) {
          assert.ifError(err);
          assert.ok(!post.$__.populate);
          assert.ok(post._creator);
          assert.equal(String(creator_id), String(post._creator._id));
          done();
        });
      });
    })

    it('are not modified when no arguments are passed', function(done){
      var d = new TestDocument();
      var o = utils.clone(d.options);
      assert.deepEqual(o, d.populate().options);
      done();
    })
  })

  describe('populating two paths', function(){
    it('with space delmited string works', function(done){
      B.findById(post, function (err, post) {
        var creator_id = post._creator;
        var alt_id = post.fans[1];
        post.populate('_creator fans', function (err, post_) {
          assert.ifError(err);
          assert.ok(post._creator);
          assert.equal(String(creator_id), String(post._creator._id));
          assert.equal(String(creator_id), String(post.fans[0]._id));
          assert.equal(String(alt_id), String(post.fans[1]._id));
          done();
        });
      });
    })
  })

  it('works with just a callback', function(done){
    B.findById(post, function (err, post) {
      var creator_id = post._creator;
      var alt_id = post.fans[1];
      post.populate('_creator').populate(function (err, post_) {
        assert.ifError(err);
        assert.ok(post._creator);
        assert.equal(String(creator_id), String(post._creator._id));
        assert.equal(String(alt_id), String(post.fans[1]));
        done();
      });
    })
  })

  it('populating using space delimited paths with options', function(done){
    B.findById(post, function (err, post) {
      var param = {};
      param.select = '-email';
      param.options = { sort: 'name' }
      param.path = '_creator fans'; // 2 paths

      var creator_id = post._creator;
      var alt_id = post.fans[1];
      post.populate(param, function (err, post) {
        assert.ifError(err);
        assert.equal(2, post.fans.length);
        assert.equal(String(creator_id), String(post._creator._id));
        assert.equal(String(creator_id), String(post.fans[1]._id));
        assert.equal(String(alt_id), String(post.fans[0]._id));
        assert.ok(!post.fans[0].email);
        assert.ok(!post.fans[1].email);
        assert.ok(!post.fans[0].isInit('email'));
        assert.ok(!post.fans[1].isInit('email'));
        done();
      });
    });
  });

  it('using multiple populate calls', function(done){
    B.findById(post, function (err, post) {
      var creator_id = post._creator;
      var alt_id = post.fans[1];

      var param = {};
      param.select = '-email';
      param.options = { sort: 'name' }
      param.path = '_creator';
      post.populate(param);
      param.path = 'fans';

      post.populate(param, function (err, post) {
        assert.ifError(err);
        assert.equal(2, post.fans.length);
        assert.equal(String(creator_id), String(post._creator._id));
        assert.equal(String(creator_id), String(post.fans[1]._id));
        assert.equal(String(alt_id), String(post.fans[0]._id));
        assert.ok(!post.fans[0].email);
        assert.ok(!post.fans[1].email);
        assert.ok(!post.fans[0].isInit('email'));
        assert.ok(!post.fans[1].isInit('email'));
        done();
      });
    });
  });

  it('with custom model selection', function(done){
    B.findById(post, function (err, post) {
      var param = {};
      param.select = '-email';
      param.options = { sort: 'name' }
      param.path = '_creator fans';
      param.model = 'doc.populate.u2';

      var creator_id = post._creator;
      var alt_id = post.fans[1];
      post.populate(param, function (err, post) {
        assert.ifError(err);
        assert.equal(2, post.fans.length);
        assert.equal(String(creator_id), String(post._creator._id));
        assert.equal(String(creator_id), String(post.fans[1]._id));
        assert.equal(String(alt_id), String(post.fans[0]._id));
        assert.ok(!post.fans[0].email);
        assert.ok(!post.fans[1].email);
        assert.ok(!post.fans[0].isInit('email'));
        assert.ok(!post.fans[1].isInit('email'));
        done();
      });
    });
  });

  it('a property not in schema', function(done){
    B.findById(post, function (err, post) {
      assert.ifError(err);
      post.populate('idontexist', function (err) {
        assert.ifError(err);

        // stuff an ad-hoc value in
        post.setValue('idontexist', user1._id);

        // populate the non-schema value by passing an explicit model
        post.populate({ path: 'idontexist', model: 'doc.populate.u' }, function (err, post) {
          assert.ifError(err);
          assert.ok(post);
          assert.equal(post.get('idontexist')._id, user1._id.toString());
          assert.equal(post.get('idontexist').name, 'Phoenix');
          done();
        });
      });
    });
  })

  it('of empty array', function(done){
    B.findById(post, function (err, post) {
      post.fans = []
      post.populate('fans', function (err, post) {
        assert.ifError(err);
        done();
      });
    });
  })

  it('of array of null/undefined', function(done){
    B.findById(post, function (err, post) {
      post.fans = [null, undefined]
      post.populate('fans', function (err, post) {
        assert.ifError(err);
        done();
      });
    });
  })

  it('of null property', function(done){
    B.findById(post, function (err, post) {
      post._creator = null;
      post.populate('_creator', function (err, post) {
        assert.ifError(err);
        done();
      });
    });
  })

  it('String _ids', function(done){
    var db = start();

    var UserSchema = new Schema({
        _id: String
      , name: String
    })

    var NoteSchema = new Schema({
        author: { type: String, ref: 'UserWithStringId' }
      , body: String
    })

    var User = db.model('UserWithStringId', UserSchema, random())
    var Note = db.model('NoteWithStringId', NoteSchema, random())

    var alice = new User({_id: 'alice', name: "Alice In Wonderland"})

    alice.save(function (err) {
      assert.ifError(err);

      var note = new Note({ author: 'alice', body: "Buy Milk" });
      note.populate('author', function (err, note_) {
        db.close();
        assert.ifError(err);
        assert.ok(note.author);
        assert.equal('alice', note.author._id);
        assert.equal(note.author.name, 'Alice In Wonderland');
        done();
      });
    })
  })

  it('Buffer _ids', function(done){
    var db = start();

    var UserSchema = new Schema({
        _id: Buffer
      , name: String
    })

    var NoteSchema = new Schema({
        author: { type: Buffer, ref: 'UserWithBufferId' }
      , body: String
    })

    var User = db.model('UserWithBufferId', UserSchema, random())
    var Note = db.model('NoteWithBufferId', NoteSchema, random())

    var alice = new User({_id: new mongoose.Types.Buffer('YWxpY2U=', 'base64'), name: "Alice"})

    alice.save(function (err) {
      assert.ifError(err);

      var note  = new Note({author: 'alice', body: "Buy Milk"});
      note.save(function (err) {
        assert.ifError(err);

        Note.findById(note.id, function (err, note) {
          assert.ifError(err);
          assert.equal('alice', note.author);
          note.populate('author', function (err, note) {
            db.close();
            assert.ifError(err);
            assert.equal(note.body,'Buy Milk');
            assert.ok(note.author);
            assert.equal(note.author.name,'Alice');
            done();
          });
        });
      });
    })
  })

  it('Number _ids', function(done){
    var db = start();

    var UserSchema = new Schema({
        _id: Number
      , name: String
    })

    var NoteSchema = new Schema({
        author: { type: Number, ref: 'UserWithNumberId' }
      , body: String
    })

    var User = db.model('UserWithNumberId', UserSchema, random())
    var Note = db.model('NoteWithNumberId', NoteSchema, random())

    var alice = new User({_id: 2359, name: "Alice"})

    alice.save(function (err) {
      assert.ifError(err);

      var note = new Note({author: 2359, body: "Buy Milk"});
      note.populate('author').populate(function (err, note) {
        db.close();
        assert.ifError(err);
        assert.ok(note.author);
        assert.equal(2359, note.author._id);
        assert.equal(note.author.name,'Alice');
        done();
      });
    })
  })

  describe('sub-level properties', function(){
    it('with string arg', function(done){
      B.findById(post, function (err, post) {
        var id0 = post.comments[0]._creator;
        var id1 = post.comments[1]._creator;
        post.populate('comments._creator', function (err, post) {
          assert.ifError(err);
          assert.equal(2, post.comments.length);
          assert.equal(id0, post.comments[0]._creator.id);
          assert.equal(id1, post.comments[1]._creator.id);
          done();
        })
      })
    })
  })

  describe('of new document', function(){
    it('should save just the populated _id (gh-1442)', function(done){
      var b = new B({ _creator: user1 });
      b.populate('_creator', function (err, b) {
        if (err) return done(err);
        assert.equal('Phoenix', b._creator.name);
        b.save(function (err) {
          assert.ifError(err);
          B.collection.findOne({ _id: b._id }, function (err, b) {
            assert.ifError(err);
            assert.equal(b._creator, String(user1._id));
            done();
          })
        })
      })
    })
  })

  describe('gh-2214', function() {
    it('should return a real document array when populating', function(done) {
      var db = start();

      Car = db.model('gh-2214-1', {
        color: String,
        model: String
      });

      Person = db.model('gh-2214-2', {
        name: String,
        cars: [
          {
            type: Schema.Types.ObjectId,
            ref: 'gh-2214-1'
          }
        ]
      });

      var car, joe;
      joe = new Person({
        name: "Joe"
      });
      car = new Car({
        model: "BMW",
        color: "red"
      });
      joe.cars.push(car);

      return joe.save(function() {
        return car.save(function() {
          return Person.findById(joe.id, function(err, joe) {
            return joe.populate("cars", function(err) {
              car = new Car({
                model: "BMW",
                color: "black"
              });
              joe.cars.push(car);
              assert.ok(joe.isModified('cars'));
              db.close();
              done();
            });
          });
        });
      });
    });
  });
});
