/**
 * Module dependencies.
 */

var start = require('./common');
var mongoose = start.mongoose;
var assert = require('power-assert');
var random = require('../lib/utils').random;
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var Document = require('../lib/document');
var DocumentObjectId = mongoose.Types.ObjectId;
var EventEmitter = require('events').EventEmitter;
var SchemaType = mongoose.SchemaType;
var ValidatorError = SchemaType.ValidatorError;
var ValidationError = mongoose.Document.ValidationError;
var MongooseError = mongoose.Error;
var EmbeddedDocument = require('../lib/types/embedded');
var Query = require('../lib/query');
var validator = require('validator');

var _ = require('lodash');

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

for (var i in EventEmitter.prototype) {
  TestDocument[i] = EventEmitter.prototype[i];
}

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

schema.virtual('nested.agePlus2').get(function() {
  return this.nested.age + 2;
});
schema.virtual('nested.setAge').set(function(v) {
  this.nested.age = v;
});
schema.path('nested.path').get(function(v) {
  return (this.nested.age || '') + (v ? v : '');
});
schema.path('nested.setr').set(function(v) {
  return v + ' setter';
});

var dateSetterCalled = false;
schema.path('date').set(function(v) {
  // should not have been cast to a Date yet
  if (v !== undefined) {
    assert.equal(typeof v, 'string');
  }
  dateSetterCalled = true;
  return v;
});

/**
 * Method subject to hooks. Simply fires the callback once the hooks are
 * executed.
 */

TestDocument.prototype.hooksTest = function(fn) {
  fn(null, arguments);
};

var childSchema = new Schema({counter: Number});

var parentSchema = new Schema({
  name: String,
  children: [childSchema]
});

/**
 * Test.
 */

describe('document', function() {
  describe('shortcut getters', function() {
    it('return undefined for properties with a null/undefined parent object (gh-1326)', function(done) {
      var doc = new TestDocument;
      doc.init({nested: null});
      assert.strictEqual(undefined, doc.nested.age);
      done();
    });

    it('work', function(done) {
      var doc = new TestDocument();
      doc.init({
        test: 'test',
        oids: [],
        nested: {
          age: 5,
          cool: DocumentObjectId.createFromHexString('4c6c2d6240ced95d0e00003c'),
          path: 'my path'
        }
      });

      assert.equal(doc.test, 'test');
      assert.ok(doc.oids instanceof Array);
      assert.equal(doc.nested.age, 5);
      assert.equal(String(doc.nested.cool), '4c6c2d6240ced95d0e00003c');
      assert.equal(doc.nested.agePlus2, 7);
      assert.equal(doc.nested.path, '5my path');
      doc.nested.setAge = 10;
      assert.equal(doc.nested.age, 10);
      doc.nested.setr = 'set it';
      assert.equal(doc.getValue('nested.setr'), 'set it setter');

      var doc2 = new TestDocument();
      doc2.init({
        test: 'toop',
        oids: [],
        nested: {
          age: 2,
          cool: DocumentObjectId.createFromHexString('4cf70857337498f95900001c'),
          deep: {x: 'yay'}
        }
      });

      assert.equal(doc2.test, 'toop');
      assert.ok(doc2.oids instanceof Array);
      assert.equal(doc2.nested.age, 2);

      // GH-366
      assert.equal(doc2.nested.bonk, undefined);
      assert.equal(doc2.nested.nested, undefined);
      assert.equal(doc2.nested.test, undefined);
      assert.equal(doc2.nested.age.test, undefined);
      assert.equal(doc2.nested.age.nested, undefined);
      assert.equal(doc2.oids.nested, undefined);
      assert.equal(doc2.nested.deep.x, 'yay');
      assert.equal(doc2.nested.deep.nested, undefined);
      assert.equal(doc2.nested.deep.cool, undefined);
      assert.equal(doc2.nested2.yup.nested, undefined);
      assert.equal(doc2.nested2.yup.nested2, undefined);
      assert.equal(doc2.nested2.yup.yup, undefined);
      assert.equal(doc2.nested2.yup.age, undefined);
      assert.equal(typeof doc2.nested2.yup, 'object');

      doc2.nested2.yup = {
        age: 150,
        yup: 'Yesiree',
        nested: true
      };

      assert.equal(doc2.nested2.nested, undefined);
      assert.equal(doc2.nested2.yup.nested, true);
      assert.equal(doc2.nested2.yup.yup, 'Yesiree');
      assert.equal(doc2.nested2.yup.age, 150);
      doc2.nested2.nested = 'y';
      assert.equal(doc2.nested2.nested, 'y');
      assert.equal(doc2.nested2.yup.nested, true);
      assert.equal(doc2.nested2.yup.yup, 'Yesiree');
      assert.equal(doc2.nested2.yup.age, 150);

      assert.equal(String(doc2.nested.cool), '4cf70857337498f95900001c');

      assert.ok(doc.oids !== doc2.oids);
      done();
    });
  });

  it('test shortcut setters', function(done) {
    var doc = new TestDocument();

    doc.init({
      test: 'Test',
      nested: {
        age: 5
      }
    });

    assert.equal(doc.isModified('test'), false);
    doc.test = 'Woot';
    assert.equal(doc.test, 'Woot');
    assert.equal(doc.isModified('test'), true);

    assert.equal(doc.isModified('nested.age'), false);
    doc.nested.age = 2;
    assert.equal(doc.nested.age, 2);
    assert.ok(doc.isModified('nested.age'));

    doc.nested = {path: 'overwrite the entire nested object'};
    assert.equal(doc.nested.age, undefined);
    assert.equal(Object.keys(doc._doc.nested).length, 1);
    assert.equal(doc.nested.path, 'overwrite the entire nested object');
    assert.ok(doc.isModified('nested'));
    done();
  });

  it('test accessor of id', function(done) {
    var doc = new TestDocument();
    assert.ok(doc._id instanceof DocumentObjectId);
    done();
  });

  it('test shortcut of id hexString', function(done) {
    var doc = new TestDocument();
    assert.equal(typeof doc.id, 'string');
    done();
  });

  it('test toObject clone', function(done) {
    var doc = new TestDocument();
    doc.init({
      test: 'test',
      oids: [],
      nested: {
        age: 5,
        cool: new DocumentObjectId
      }
    });

    var copy = doc.toObject();

    copy.test._marked = true;
    copy.nested._marked = true;
    copy.nested.age._marked = true;
    copy.nested.cool._marked = true;

    assert.equal(doc._doc.test._marked, undefined);
    assert.equal(doc._doc.nested._marked, undefined);
    assert.equal(doc._doc.nested.age._marked, undefined);
    assert.equal(doc._doc.nested.cool._marked, undefined);
    done();
  });

  it('toObject options', function(done) {
    var doc = new TestDocument();

    doc.init({
      test: 'test',
      oids: [],
      em: [{title: 'asdf'}],
      nested: {
        age: 5,
        cool: DocumentObjectId.createFromHexString('4c6c2d6240ced95d0e00003c'),
        path: 'my path'
      },
      nested2: {},
      date: new Date
    });

    var clone = doc.toObject({getters: true, virtuals: false});

    assert.equal(clone.test, 'test');
    assert.ok(clone.oids instanceof Array);
    assert.equal(clone.nested.age, 5);
    assert.equal(clone.nested.cool.toString(), '4c6c2d6240ced95d0e00003c');
    assert.equal(clone.nested.path, '5my path');
    assert.equal(clone.nested.agePlus2, undefined);
    assert.equal(clone.em[0].works, undefined);
    assert.ok(clone.date instanceof Date);

    clone = doc.toObject({virtuals: true});

    assert.equal(clone.test, 'test');
    assert.ok(clone.oids instanceof Array);
    assert.equal(clone.nested.age, 5);
    assert.equal(clone.nested.cool.toString(), '4c6c2d6240ced95d0e00003c');
    assert.equal(clone.nested.path, 'my path');
    assert.equal(clone.nested.agePlus2, 7);
    assert.equal(clone.em[0].works, 'em virtual works');

    clone = doc.toObject({getters: true});

    assert.equal(clone.test, 'test');
    assert.ok(clone.oids instanceof Array);
    assert.equal(clone.nested.age, 5);
    assert.equal(clone.nested.cool.toString(), '4c6c2d6240ced95d0e00003c');
    assert.equal(clone.nested.path, '5my path');
    assert.equal(clone.nested.agePlus2, 7);
    assert.equal(clone.em[0].works, 'em virtual works');

    // test toObject options
    doc.schema.options.toObject = {virtuals: true};
    clone = doc.toObject({transform: false, virtuals: true});
    assert.equal(clone.test, 'test');
    assert.ok(clone.oids instanceof Array);
    assert.equal(clone.nested.age, 5);
    assert.equal(clone.nested.cool.toString(), '4c6c2d6240ced95d0e00003c');

    assert.equal(clone.nested.path, 'my path');
    assert.equal(clone.nested.agePlus2, 7);
    assert.equal(clone.em[0].title, 'asdf');
    delete doc.schema.options.toObject;

    // minimize
    clone = doc.toObject({minimize: true});
    assert.equal(clone.nested2, undefined);
    clone = doc.toObject({minimize: true, getters: true});
    assert.equal(clone.nested2, undefined);
    clone = doc.toObject({minimize: false});
    assert.equal(clone.nested2.constructor.name, 'Object');
    assert.equal(Object.keys(clone.nested2).length, 1);
    clone = doc.toObject('2');
    assert.equal(clone.nested2, undefined);

    doc.schema.options.toObject = {minimize: false};
    clone = doc.toObject({transform: false, minimize: false});
    assert.equal(clone.nested2.constructor.name, 'Object');
    assert.equal(Object.keys(clone.nested2).length, 1);
    delete doc.schema.options.toObject;

    doc.schema.options.minimize = false;
    clone = doc.toObject();
    assert.equal(clone.nested2.constructor.name, 'Object');
    assert.equal(Object.keys(clone.nested2).length, 1);
    doc.schema.options.minimize = true;
    clone = doc.toObject();
    assert.equal(clone.nested2, undefined);

    // transform
    doc.schema.options.toObject = {};
    doc.schema.options.toObject.transform = function xform(doc, ret) {
      // ignore embedded docs
      if (typeof doc.ownerDocument === 'function') {
        return;
      }

      delete ret.em;
      delete ret.numbers;
      delete ret.oids;
      ret._id = ret._id.toString();
    };

    clone = doc.toObject();
    assert.equal(doc.id, clone._id);
    assert.ok(undefined === clone.em);
    assert.ok(undefined === clone.numbers);
    assert.ok(undefined === clone.oids);
    assert.equal(clone.test, 'test');
    assert.equal(clone.nested.age, 5);

    // transform with return value
    var out = {myid: doc._id.toString()};
    doc.schema.options.toObject.transform = function(doc, ret) {
      // ignore embedded docs
      if (typeof doc.ownerDocument === 'function') {
        return;
      }

      return {myid: ret._id.toString()};
    };

    clone = doc.toObject();
    assert.deepEqual(out, clone);

    // ignored transform with inline options
    clone = doc.toObject({x: 1, transform: false});
    assert.ok(!('myid' in clone));
    assert.equal(clone.test, 'test');
    assert.ok(clone.oids instanceof Array);
    assert.equal(clone.nested.age, 5);
    assert.equal(clone.nested.cool.toString(), '4c6c2d6240ced95d0e00003c');
    assert.equal(clone.nested.path, 'my path');
    assert.equal(clone.em[0].constructor.name, 'Object');

    // applied transform when inline transform is true
    clone = doc.toObject({x: 1});
    assert.deepEqual(out, clone);

    // transform passed inline
    function xform(self, doc, opts) {
      opts.fields.split(' ').forEach(function(field) {
        delete doc[field];
      });
    }

    clone = doc.toObject({
      transform: xform,
      fields: '_id em numbers oids nested'
    });
    assert.equal(doc.test, 'test');
    assert.ok(undefined === clone.em);
    assert.ok(undefined === clone.numbers);
    assert.ok(undefined === clone.oids);
    assert.ok(undefined === clone._id);
    assert.ok(undefined === clone.nested);

    // all done
    delete doc.schema.options.toObject;
    done();
  });

  it('toObject transform', function(done) {
    var schema = new Schema({
      name: String,
      places: [{type: ObjectId, ref: 'toObject-transform-places'}]
    });

    var schemaPlaces = new Schema({
      identity: String
    });

    schemaPlaces.set('toObject', {
      transform: function(doc, ret) {
        // here should be only toObject-transform-places documents
        assert.equal(doc.constructor.modelName, 'toObject-transform-places');
        return ret;
      }
    });

    var db = start(),
        Test = db.model('toObject-transform', schema),
        Places = db.model('toObject-transform-places', schemaPlaces);

    Places.create({identity: 'a'}, {identity: 'b'}, {identity: 'c'}, function(err, a, b, c) {
      Test.create({name: 'chetverikov', places: [a, b, c]}, function(err) {
        assert.ifError(err);
        Test.findOne({}).populate('places').exec(function(err, docs) {
          assert.ifError(err);

          docs.toObject({transform: true});

          db.close(done);
        });
      });
    });
  });

  it('allows you to skip validation on save (gh-2981)', function(done) {
    var db = start();

    var MyModel = db.model('gh2981',
        {name: {type: String, required: true}});

    var doc = new MyModel();
    doc.save({validateBeforeSave: false}, function(error) {
      assert.ifError(error);
      db.close(done);
    });
  });

  it('doesnt use custom toObject options on save', function(done) {
    var schema = new Schema({
      name: String,
      iWillNotBeDelete: Boolean,
      nested: {
        iWillNotBeDeleteToo: Boolean
      }
    });

    schema.set('toObject', {
      transform: function(doc, ret) {
        delete ret.iWillNotBeDelete;
        delete ret.nested.iWillNotBeDeleteToo;

        return ret;
      }
    });
    var db = start(),
        Test = db.model('TestToObject', schema);

    Test.create({name: 'chetverikov', iWillNotBeDelete: true, 'nested.iWillNotBeDeleteToo': true}, function(err) {
      assert.ifError(err);
      Test.findOne({}, function(err, doc) {
        assert.ifError(err);

        assert.equal(doc._doc.iWillNotBeDelete, true);
        assert.equal(doc._doc.nested.iWillNotBeDeleteToo, true);

        db.close(done);
      });
    });
  });

  describe('toObject', function() {
    var db;
    before(function() {
      db = start();
    });

    after(function(done) {
      db.close(done);
    });

    it('does not apply toObject functions of subdocuments to root document', function(done) {
      var subdocSchema = new Schema({
        test: String,
        wow: String
      });

      subdocSchema.options.toObject = {};
      subdocSchema.options.toObject.transform = function(doc, ret) {
        delete ret.wow;
      };

      var docSchema = new Schema({
        foo: String,
        wow: Boolean,
        sub: [subdocSchema]
      });

      var Doc = db.model('Doc', docSchema);

      Doc.create({
        foo: 'someString',
        wow: true,
        sub: [{
          test: 'someOtherString',
          wow: 'thisIsAString'
        }]
      }, function(err, doc) {
        var obj = doc.toObject({
          transform: function(doc, ret) {
            ret.phew = 'new';
          }
        });

        assert.equal(obj.phew, 'new');
        assert.ok(!doc.sub.wow);

        done();
      });
    });

    it('handles child schema transforms', function(done) {
      var userSchema = new Schema({
        name: String,
        email: String
      });
      var topicSchema = new Schema({
        title: String,
        email: String,
        followers: [userSchema]
      });

      userSchema.options.toObject = {
        transform: function(doc, ret) {
          delete ret.email;
        }
      };

      topicSchema.options.toObject = {
        transform: function(doc, ret) {
          ret.title = ret.title.toLowerCase();
        }
      };

      var Topic = db.model('gh2691', topicSchema, 'gh2691');

      var topic = new Topic({
        title: 'Favorite Foods',
        email: 'a@b.co',
        followers: [{name: 'Val', email: 'val@test.co'}]
      });

      var output = topic.toObject({transform: true});
      assert.equal(output.title, 'favorite foods');
      assert.equal(output.email, 'a@b.co');
      assert.equal(output.followers[0].name, 'Val');
      assert.equal(output.followers[0].email, undefined);
      done();
    });

    it('doesnt clobber child schema options when called with no params (gh-2035)', function(done) {
      var userSchema = new Schema({
        firstName: String,
        lastName: String,
        password: String
      });

      userSchema.virtual('fullName').get(function() {
        return this.firstName + ' ' + this.lastName;
      });

      userSchema.set('toObject', {virtuals: false});

      var postSchema = new Schema({
        owner: {type: Schema.Types.ObjectId, ref: 'gh-2035-user'},
        content: String
      });

      postSchema.virtual('capContent').get(function() {
        return this.content.toUpperCase();
      });

      postSchema.set('toObject', {virtuals: true});
      var User = db.model('gh-2035-user', userSchema, 'gh-2035-user');
      var Post = db.model('gh-2035-post', postSchema, 'gh-2035-post');

      var user = new User({firstName: 'Joe', lastName: 'Smith', password: 'password'});

      user.save(function(err, savedUser) {
        assert.ifError(err);
        var post = new Post({owner: savedUser._id, content: 'lorem ipsum'});
        post.save(function(err, savedPost) {
          assert.ifError(err);
          Post.findById(savedPost._id).populate('owner').exec(function(err, newPost) {
            assert.ifError(err);
            var obj = newPost.toObject();
            assert.equal(obj.owner.fullName, undefined);
            done();
          });
        });
      });
    });
  });

  describe('toJSON', function() {
    var db;
    before(function() {
      db = start();
    });

    after(function(done) {
      db.close(done);
    });

    it('toJSON options', function(done) {
      var doc = new TestDocument();

      doc.init({
        test: 'test',
        oids: [],
        em: [{title: 'asdf'}],
        nested: {
          age: 5,
          cool: DocumentObjectId.createFromHexString('4c6c2d6240ced95d0e00003c'),
          path: 'my path'
        },
        nested2: {}
      });

      // override to check if toJSON gets fired
      var path = TestDocument.prototype.schema.path('em');
      path.casterConstructor.prototype.toJSON = function() {
        return {};
      };

      doc.schema.options.toJSON = {virtuals: true};
      var clone = doc.toJSON();
      assert.equal(clone.test, 'test');
      assert.ok(clone.oids instanceof Array);
      assert.equal(clone.nested.age, 5);
      assert.equal(clone.nested.cool.toString(), '4c6c2d6240ced95d0e00003c');
      assert.equal(clone.nested.path, 'my path');
      assert.equal(clone.nested.agePlus2, 7);
      assert.equal(clone.em[0].constructor.name, 'Object');
      assert.equal(Object.keys(clone.em[0]).length, 0);
      delete doc.schema.options.toJSON;
      delete path.casterConstructor.prototype.toJSON;

      doc.schema.options.toJSON = {minimize: false};
      clone = doc.toJSON();
      assert.equal(clone.nested2.constructor.name, 'Object');
      assert.equal(Object.keys(clone.nested2).length, 1);
      clone = doc.toJSON('8');
      assert.equal(clone.nested2.constructor.name, 'Object');
      assert.equal(Object.keys(clone.nested2).length, 1);

      // gh-852
      var arr = [doc],
          err = false,
          str;
      try {
        str = JSON.stringify(arr);
      } catch (_) {
        err = true;
      }
      assert.equal(err, false);
      assert.ok(/nested2/.test(str));
      assert.equal(clone.nested2.constructor.name, 'Object');
      assert.equal(Object.keys(clone.nested2).length, 1);

      // transform
      doc.schema.options.toJSON = {};
      doc.schema.options.toJSON.transform = function xform(doc, ret) {
        // ignore embedded docs
        if (typeof doc.ownerDocument === 'function') {
          return;
        }

        delete ret.em;
        delete ret.numbers;
        delete ret.oids;
        ret._id = ret._id.toString();
      };

      clone = doc.toJSON();
      assert.equal(clone._id, doc.id);
      assert.ok(undefined === clone.em);
      assert.ok(undefined === clone.numbers);
      assert.ok(undefined === clone.oids);
      assert.equal(clone.test, 'test');
      assert.equal(clone.nested.age, 5);

      // transform with return value
      var out = {myid: doc._id.toString()};
      doc.schema.options.toJSON.transform = function(doc, ret) {
        // ignore embedded docs
        if (typeof doc.ownerDocument === 'function') {
          return;
        }

        return {myid: ret._id.toString()};
      };

      clone = doc.toJSON();
      assert.deepEqual(out, clone);

      // ignored transform with inline options
      clone = doc.toJSON({x: 1, transform: false});
      assert.ok(!('myid' in clone));
      assert.equal(clone.test, 'test');
      assert.ok(clone.oids instanceof Array);
      assert.equal(clone.nested.age, 5);
      assert.equal(clone.nested.cool.toString(), '4c6c2d6240ced95d0e00003c');
      assert.equal(clone.nested.path, 'my path');
      assert.equal(clone.em[0].constructor.name, 'Object');

      // applied transform when inline transform is true
      clone = doc.toJSON({x: 1});
      assert.deepEqual(out, clone);

      // transform passed inline
      function xform(self, doc, opts) {
        opts.fields.split(' ').forEach(function(field) {
          delete doc[field];
        });
      }

      clone = doc.toJSON({
        transform: xform,
        fields: '_id em numbers oids nested'
      });
      assert.equal(doc.test, 'test');
      assert.ok(undefined === clone.em);
      assert.ok(undefined === clone.numbers);
      assert.ok(undefined === clone.oids);
      assert.ok(undefined === clone._id);
      assert.ok(undefined === clone.nested);

      // all done
      delete doc.schema.options.toJSON;
      done();
    });

    it('jsonifying an object', function(done) {
      var doc = new TestDocument({test: 'woot'}),
          oidString = doc._id.toString();
      // convert to json string
      var json = JSON.stringify(doc);
      // parse again
      var obj = JSON.parse(json);

      assert.equal(obj.test, 'woot');
      assert.equal(obj._id, oidString);
      done();
    });

    it('jsonifying an object\'s populated items works (gh-1376)', function(done) {
      var userSchema, User, groupSchema, Group;

      userSchema = new Schema({name: String});
      // includes virtual path when 'toJSON'
      userSchema.set('toJSON', {getters: true});
      userSchema.virtual('hello').get(function() {
        return 'Hello, ' + this.name;
      });
      User = db.model('User', userSchema);

      groupSchema = new Schema({
        name: String,
        _users: [{type: Schema.ObjectId, ref: 'User'}]
      });

      Group = db.model('Group', groupSchema);

      User.create({name: 'Alice'}, {name: 'Bob'}, function(err, alice, bob) {
        assert.ifError(err);

        new Group({name: 'mongoose', _users: [alice, bob]}).save(function(err, group) {
          Group.findById(group).populate('_users').exec(function(err, group) {
            assert.ifError(err);
            assert.ok(group.toJSON()._users[0].hello);
            done();
          });
        });
      });
    });
  });

  describe('inspect', function() {
    var db;
    before(function() {
      db = start();
    });

    after(function(done) {
      db.close(done);
    });

    it('inspect inherits schema options (gh-4001)', function(done) {
      var opts = {
        toObject: { virtuals: true },
        toJSON: { virtuals: true }
      };
      var taskSchema = mongoose.Schema({
        name: {
          type: String,
          required: true
        }
      }, opts);

      taskSchema.virtual('title').
        get(function() {
          return this.name;
        }).
        set(function(title) {
          this.name = title;
        });

      var Task = db.model('gh4001', taskSchema);

      var doc = { name: 'task1', title: 'task999' };
      Task.collection.insert(doc, function(error) {
        assert.ifError(error);
        Task.findById(doc._id, function(error, doc) {
          assert.ifError(error);
          assert.equal(doc.inspect().title, 'task1');
          done();
        });
      });
    });

    it('does not apply transform to populated docs (gh-4213)', function(done) {
      var UserSchema = new Schema({
        name: String
      });

      var PostSchema = new Schema({
        title: String,
        postedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'gh4213'
        }
      }, {
        toObject: {
          transform: function(doc, ret) {
            delete ret._id;
          }
        },
        toJSON: {
          transform: function(doc, ret) {
            delete ret._id;
          }
        }
      });

      var User = db.model('gh4213', UserSchema);
      var Post = db.model('gh4213_0', PostSchema);

      var val = new User({ name: 'Val' });
      var post = new Post({ title: 'Test', postedBy: val._id });

      Post.create(post, function(error) {
        assert.ifError(error);
        User.create(val, function(error) {
          assert.ifError(error);
          Post.find({}).
            populate('postedBy').
            exec(function(error, posts) {
              assert.ifError(error);
              assert.equal(posts.length, 1);
              assert.ok(posts[0].postedBy._id);
              done();
            });
        });
      });
    });
  });

  describe('#update', function() {
    it('returns a Query', function(done) {
      var mg = new mongoose.Mongoose;
      var M = mg.model('doc#update', {s: String});
      var doc = new M;
      assert.ok(doc.update() instanceof Query);
      done();
    });
    it('calling update on document should relay to its model (gh-794)', function(done) {
      var db = start();
      var Docs = new Schema({text: String});
      var docs = db.model('docRelayUpdate', Docs);
      var d = new docs({text: 'A doc'});
      var called = false;
      d.save(function() {
        var oldUpdate = docs.update;
        docs.update = function(query, operation) {
          assert.equal(Object.keys(query).length, 1);
          assert.equal(d._id, query._id);
          assert.equal(Object.keys(operation).length, 1);
          assert.equal(Object.keys(operation.$set).length, 1);
          assert.equal(operation.$set.text, 'A changed doc');
          called = true;
          docs.update = oldUpdate;
          oldUpdate.apply(docs, arguments);
        };
        d.update({$set: {text: 'A changed doc'}}, function(err) {
          assert.ifError(err);
          assert.equal(called, true);
          db.close(done);
        });
      });
    });
  });

  it('toObject should not set undefined values to null', function(done) {
    var doc = new TestDocument(),
        obj = doc.toObject();

    delete obj._id;
    assert.deepEqual(obj, {numbers: [], oids: [], em: []});
    done();
  });

  describe('Errors', function() {
    it('MongooseErrors should be instances of Error (gh-209)', function(done) {
      var MongooseError = require('../lib/error'),
          err = new MongooseError('Some message');
      assert.ok(err instanceof Error);
      done();
    });
    it('ValidationErrors should be instances of Error', function(done) {
      var ValidationError = Document.ValidationError,
          err = new ValidationError(new TestDocument);
      assert.ok(err instanceof Error);
      done();
    });
  });

  it('methods on embedded docs should work', function(done) {
    var db = start(),
        ESchema = new Schema({name: String});

    ESchema.methods.test = function() {
      return this.name + ' butter';
    };
    ESchema.statics.ten = function() {
      return 10;
    };

    var E = db.model('EmbeddedMethodsAndStaticsE', ESchema);
    var PSchema = new Schema({embed: [ESchema]});
    var P = db.model('EmbeddedMethodsAndStaticsP', PSchema);
    db.close();

    var p = new P({embed: [{name: 'peanut'}]});
    assert.equal(typeof p.embed[0].test, 'function');
    assert.equal(typeof E.ten, 'function');
    assert.equal(p.embed[0].test(), 'peanut butter');
    assert.equal(E.ten(), 10);

    // test push casting
    p = new P;
    p.embed.push({name: 'apple'});
    assert.equal(typeof p.embed[0].test, 'function');
    assert.equal(typeof E.ten, 'function');
    assert.equal(p.embed[0].test(), 'apple butter');
    done();
  });

  it('setting a positional path does not cast value to array', function(done) {
    var doc = new TestDocument;
    doc.init({numbers: [1, 3]});
    assert.equal(doc.numbers[0], 1);
    assert.equal(doc.numbers[1], 3);
    doc.set('numbers.1', 2);
    assert.equal(doc.numbers[0], 1);
    assert.equal(doc.numbers[1], 2);
    done();
  });

  it('no maxListeners warning should occur', function(done) {
    var db = start();

    var traced = false;
    var trace = console.trace;

    console.trace = function() {
      traced = true;
      console.trace = trace;
    };

    var schema = new Schema({
      title: String,
      embed1: [new Schema({name: String})],
      embed2: [new Schema({name: String})],
      embed3: [new Schema({name: String})],
      embed4: [new Schema({name: String})],
      embed5: [new Schema({name: String})],
      embed6: [new Schema({name: String})],
      embed7: [new Schema({name: String})],
      embed8: [new Schema({name: String})],
      embed9: [new Schema({name: String})],
      embed10: [new Schema({name: String})],
      embed11: [new Schema({name: String})]
    });

    var S = db.model('noMaxListeners', schema);

    new S({title: 'test'});
    db.close();
    assert.equal(traced, false);
    done();
  });

  it('unselected required fields should pass validation', function(done) {
    var db = start(),
        Tschema = new Schema({name: String, req: {type: String, required: true}}),
        T = db.model('unselectedRequiredFieldValidation', Tschema);

    var t = new T({name: 'teeee', req: 'i am required'});
    t.save(function(err) {
      assert.ifError(err);
      T.findById(t).select('name').exec(function(err, t) {
        assert.ifError(err);
        assert.equal(t.req, void 0);
        t.name = 'wooo';
        t.save(function(err) {
          assert.ifError(err);

          T.findById(t).select('name').exec(function(err, t) {
            assert.ifError(err);
            t.req = undefined;
            t.save(function(err) {
              err = String(err);
              var invalid = /Path `req` is required./.test(err);
              assert.ok(invalid);
              t.req = 'it works again';
              t.save(function(err) {
                assert.ifError(err);

                T.findById(t).select('_id').exec(function(err, t) {
                  assert.ifError(err);
                  t.save(function(err) {
                    assert.ifError(err);
                    db.close(done);
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  describe('#validate', function() {
    var collection = 'validateschema_' + random();

    it('works (gh-891)', function(done) {
      var db = start();
      var schema = null;
      var called = false;

      var validate = [function() {
        called = true;
        return true;
      }, 'BAM'];

      schema = new Schema({
        prop: {type: String, required: true, validate: validate},
        nick: {type: String, required: true}
      });

      var M = db.model('validateSchema', schema, collection);
      var m = new M({prop: 'gh891', nick: 'validation test'});
      m.save(function(err) {
        assert.ifError(err);
        assert.equal(called, true);
        called = false;
        M.findById(m, 'nick', function(err, m) {
          assert.equal(called, false);
          assert.ifError(err);
          m.nick = 'gh-891';
          m.save(function(err) {
            assert.equal(called, false);
            assert.ifError(err);
            db.close(done);
          });
        });
      });
    });

    it('can return a promise', function(done) {
      var db = start();
      var schema = null;

      var validate = [function() {
        return true;
      }, 'BAM'];

      schema = new Schema({
        prop: {type: String, required: true, validate: validate},
        nick: {type: String, required: true}
      });

      var M = db.model('validateSchemaPromise', schema, collection);
      var m = new M({prop: 'gh891', nick: 'validation test'});
      var mBad = new M({prop: 'other'});

      var promise = m.validate();
      promise.then(function() {
        var promise2 = mBad.validate();
        promise2.onReject(function(err) {
          assert.ok(!!err);
          clearTimeout(timeout);
          db.close(done);
        });
      });

      var timeout = setTimeout(function() {
        db.close();
        throw new Error('Promise not fulfilled!');
      }, 500);
    });

    it('doesnt have stale cast errors (gh-2766)', function(done) {
      var db = start();
      var testSchema = new Schema({name: String});
      var M = db.model('gh2766', testSchema);

      var m = new M({_id: 'this is not a valid _id'});
      assert.ok(!m.$isValid('_id'));
      assert.ok(m.validateSync().errors['_id'].name, 'CastError');

      m._id = '000000000000000000000001';
      assert.ok(m.$isValid('_id'));
      assert.ifError(m.validateSync());
      m.validate(function(error) {
        assert.ifError(error);
        db.close(done);
      });
    });

    it('cast errors persist across validate() calls (gh-2766)', function(done) {
      var db = start();
      var testSchema = new Schema({name: String});
      var M = db.model('gh2766', testSchema);

      var m = new M({_id: 'this is not a valid _id'});
      assert.ok(!m.$isValid('_id'));
      m.validate(function(error) {
        assert.ok(error);
        assert.equal(error.errors['_id'].name, 'CastError');
        m.validate(function(error) {
          assert.ok(error);
          assert.equal(error.errors['_id'].name, 'CastError');

          var err1 = m.validateSync();
          var err2 = m.validateSync();
          assert.equal(err1.errors['_id'].name, 'CastError');
          assert.equal(err2.errors['_id'].name, 'CastError');
          db.close(done);
        });
      });
    });

    it('returns a promise when there are no validators', function(done) {
      var db = start();
      var schema = null;

      schema = new Schema({_id: String});

      var M = db.model('validateSchemaPromise2', schema, collection);
      var m = new M();

      var promise = m.validate();
      promise.then(function() {
        clearTimeout(timeout);
        db.close();
        done();
      });

      var timeout = setTimeout(function() {
        db.close();
        throw new Error('Promise not fulfilled!');
      }, 500);
    });

    describe('works on arrays', function() {
      var db;

      before(function(done) {
        db = start();
        done();
      });

      after(function(done) {
        db.close(done);
      });

      it('with required', function(done) {
        var schema = new Schema({
          name: String,
          arr: {type: [], required: true}
        });
        var M = db.model('validateSchema-array1', schema, collection);
        var m = new M({name: 'gh1109-1'});
        m.save(function(err) {
          assert.ok(/Path `arr` is required/.test(err));
          m.arr = [];
          m.save(function(err) {
            assert.ok(/Path `arr` is required/.test(err));
            m.arr.push('works');
            m.save(function(err) {
              assert.ifError(err);
              done();
            });
          });
        });
      });

      it('with custom validator', function(done) {
        var called = false;

        function validator(val) {
          called = true;
          return val && val.length > 1;
        }

        var validate = [validator, 'BAM'];

        var schema = new Schema({
          arr: {type: [], validate: validate}
        });

        var M = db.model('validateSchema-array2', schema, collection);
        var m = new M({name: 'gh1109-2', arr: [1]});
        assert.equal(called, false);
        m.save(function(err) {
          assert.equal(String(err), 'ValidationError: arr: BAM');
          assert.equal(called, true);
          m.arr.push(2);
          called = false;
          m.save(function(err) {
            assert.equal(called, true);
            assert.ifError(err);
            done();
          });
        });
      });

      it('with both required + custom validator', function(done) {
        function validator(val) {
          return val && val.length > 1;
        }

        var validate = [validator, 'BAM'];

        var schema = new Schema({
          arr: {type: [], required: true, validate: validate}
        });

        var M = db.model('validateSchema-array3', schema, collection);
        var m = new M({name: 'gh1109-3'});
        m.save(function(err) {
          assert.equal(err.errors.arr.message, 'Path `arr` is required.');
          m.arr.push({nice: true});
          m.save(function(err) {
            assert.equal(String(err), 'ValidationError: arr: BAM');
            m.arr.push(95);
            m.save(function(err) {
              assert.ifError(err);
              done();
            });
          });
        });
      });
    });

    it('validator should run only once gh-1743', function(done) {
      var count = 0;
      var db = start();

      var Control = new Schema({
        test: {
          type: String,
          validate: function(value, done) {
            count++;
            return done(true);
          }
        }
      });
      var PostSchema = new Schema({
        controls: [Control]
      });

      var Post = db.model('post', PostSchema);

      var post = new Post({
        controls: [{
          test: 'xx'
        }]
      });

      post.save(function() {
        assert.equal(count, 1);
        db.close(done);
      });
    });

    it('validator should run only once per sub-doc gh-1743', function(done) {
      var count = 0;
      var db = start();

      var Control = new Schema({
        test: {
          type: String,
          validate: function(value, done) {
            count++;
            return done(true);
          }
        }
      });
      var PostSchema = new Schema({
        controls: [Control]
      });

      var Post = db.model('post', PostSchema);

      var post = new Post({
        controls: [{
          test: 'xx'
        }, {
          test: 'yy'
        }]
      });

      post.save(function() {
        assert.equal(count, post.controls.length);
        db.close(done);
      });
    });


    it('validator should run in parallel', function(done) {
      // we set the time out to be double that of the validator - 1 (so that running in serial will be greater than that)
      this.timeout(1000);
      var db = start();
      var count = 0;

      var SchemaWithValidator = new Schema({
        preference: {
          type: String,
          required: true,
          validate: function validator(value, done) {
            count++;
            setTimeout(done.bind(null, true), 500);
          }
        }
      });

      var MWSV = db.model('mwv', new Schema({subs: [SchemaWithValidator]}));
      var m = new MWSV({
        subs: [{
          preference: 'xx'
        }, {
          preference: 'yy'
        }, {
          preference: '1'
        }, {
          preference: '2'
        }]
      });

      m.save(function(err) {
        assert.ifError(err);
        assert.equal(count, 4);
        db.close(done);
      });
    });
  });

  it('#invalidate', function(done) {
    var db = start();
    var InvalidateSchema = null;
    var Post = null;
    var post = null;

    InvalidateSchema = new Schema({prop: {type: String}},
        {strict: false});

    mongoose.model('InvalidateSchema', InvalidateSchema);

    Post = db.model('InvalidateSchema');
    post = new Post();
    post.set({baz: 'val'});
    var _err = post.invalidate('baz', 'validation failed for path {PATH}',
      'val', 'custom error');
    assert.ok(_err instanceof ValidationError);

    post.save(function(err) {
      assert.ok(err instanceof MongooseError);
      assert.ok(err instanceof ValidationError);
      assert.ok(err.errors.baz instanceof ValidatorError);
      assert.equal(err.errors.baz.message, 'validation failed for path baz');
      assert.equal(err.errors.baz.path, 'baz');
      assert.equal(err.errors.baz.value, 'val');
      assert.equal(err.errors.baz.kind, 'custom error');

      post.save(function(err) {
        db.close();
        assert.strictEqual(err, null);
        done();
      });
    });
  });

  describe('#equals', function() {
    describe('should work', function() {
      var db;
      var S;
      var N;
      var O;
      var B;
      var M;

      before(function() {
        db = start();
        S = db.model('equals-S', new Schema({_id: String}));
        N = db.model('equals-N', new Schema({_id: Number}));
        O = db.model('equals-O', new Schema({_id: Schema.ObjectId}));
        B = db.model('equals-B', new Schema({_id: Buffer}));
        M = db.model('equals-I', new Schema({name: String}, {_id: false}));
      });

      after(function(done) {
        db.close(done);
      });

      it('with string _ids', function(done) {
        var s1 = new S({_id: 'one'});
        var s2 = new S({_id: 'one'});
        assert.ok(s1.equals(s2));
        done();
      });
      it('with number _ids', function(done) {
        var n1 = new N({_id: 0});
        var n2 = new N({_id: 0});
        assert.ok(n1.equals(n2));
        done();
      });
      it('with ObjectId _ids', function(done) {
        var id = new mongoose.Types.ObjectId;
        var o1 = new O({_id: id});
        var o2 = new O({_id: id});
        assert.ok(o1.equals(o2));

        id = String(new mongoose.Types.ObjectId);
        o1 = new O({_id: id});
        o2 = new O({_id: id});
        assert.ok(o1.equals(o2));
        done();
      });
      it('with Buffer _ids', function(done) {
        var n1 = new B({_id: 0});
        var n2 = new B({_id: 0});
        assert.ok(n1.equals(n2));
        done();
      });
      it('with _id disabled (gh-1687)', function(done) {
        var m1 = new M;
        var m2 = new M;
        assert.doesNotThrow(function() {
          m1.equals(m2);
        });
        done();
      });
    });
  });

  describe('setter', function() {
    describe('order', function() {
      it('is applied correctly', function(done) {
        var date = 'Thu Aug 16 2012 09:45:59 GMT-0700';
        var d = new TestDocument();
        dateSetterCalled = false;
        d.date = date;
        assert.ok(dateSetterCalled);
        dateSetterCalled = false;
        assert.ok(d._doc.date instanceof Date);
        assert.ok(d.date instanceof Date);
        assert.equal(+d.date, +new Date(date));
        done();
      });
    });

    it('works with undefined (gh-1892)', function(done) {
      var d = new TestDocument();
      d.nested.setr = undefined;
      assert.equal(d.nested.setr, 'undefined setter');
      dateSetterCalled = false;
      d.date = undefined;
      d.validate(function(err) {
        assert.ifError(err);
        assert.ok(dateSetterCalled);
        done();
      });
    });

    describe('on nested paths', function() {
      describe('using set(path, object)', function() {
        it('overwrites the entire object', function(done) {
          var doc = new TestDocument();

          doc.init({
            test: 'Test',
            nested: {
              age: 5
            }
          });

          doc.set('nested', {path: 'overwrite the entire nested object'});
          assert.equal(doc.nested.age, undefined);
          assert.equal(Object.keys(doc._doc.nested).length, 1);
          assert.equal(doc.nested.path, 'overwrite the entire nested object');
          assert.ok(doc.isModified('nested'));

          // vs merging using doc.set(object)
          doc.set({test: 'Test', nested: {age: 4}});
          assert.equal(doc.nested.path, '4overwrite the entire nested object');
          assert.equal(doc.nested.age, 4);
          assert.equal(Object.keys(doc._doc.nested).length, 2);
          assert.ok(doc.isModified('nested'));

          doc = new TestDocument();
          doc.init({
            test: 'Test',
            nested: {
              age: 5
            }
          });

          // vs merging using doc.set(path, object, {merge: true})
          doc.set('nested', {path: 'did not overwrite the nested object'}, {merge: true});
          assert.equal(doc.nested.path, '5did not overwrite the nested object');
          assert.equal(doc.nested.age, 5);
          assert.equal(Object.keys(doc._doc.nested).length, 3);
          assert.ok(doc.isModified('nested'));

          doc = new TestDocument();
          doc.init({
            test: 'Test',
            nested: {
              age: 5
            }
          });

          doc.set({test: 'Test', nested: {age: 5}});
          assert.ok(!doc.isModified());
          assert.ok(!doc.isModified('test'));
          assert.ok(!doc.isModified('nested'));
          assert.ok(!doc.isModified('nested.age'));

          doc.nested = {path: 'overwrite the entire nested object', age: 5};
          assert.equal(doc.nested.age, 5);
          assert.equal(Object.keys(doc._doc.nested).length, 2);
          assert.equal(doc.nested.path, '5overwrite the entire nested object');
          assert.ok(doc.isModified('nested'));

          doc.nested.deep = {x: 'Hank and Marie'};
          assert.equal(Object.keys(doc._doc.nested).length, 3);
          assert.equal(doc.nested.path, '5overwrite the entire nested object');
          assert.ok(doc.isModified('nested'));
          assert.equal(doc.nested.deep.x, 'Hank and Marie');

          doc = new TestDocument();
          doc.init({
            test: 'Test',
            nested: {
              age: 5
            }
          });

          doc.set('nested.deep', {x: 'Hank and Marie'});
          assert.equal(Object.keys(doc._doc.nested).length, 2);
          assert.equal(Object.keys(doc._doc.nested.deep).length, 1);
          assert.ok(doc.isModified('nested'));
          assert.ok(!doc.isModified('nested.path'));
          assert.ok(!doc.isModified('nested.age'));
          assert.ok(doc.isModified('nested.deep'));
          assert.equal(doc.nested.deep.x, 'Hank and Marie');

          done();
        });

        it('gh-1954', function(done) {
          var schema = new Schema({
            schedule: [new Schema({open: Number, close: Number})]
          });

          var M = mongoose.model('Blog', schema);

          var doc = new M({
            schedule: [{
              open: 1000,
              close: 1900
            }]
          });

          assert.ok(doc.schedule[0] instanceof EmbeddedDocument);
          doc.set('schedule.0.open', 1100);
          assert.ok(doc.schedule);
          assert.ok(doc.schedule.isMongooseDocumentArray);
          assert.ok(doc.schedule[0] instanceof EmbeddedDocument);
          assert.equal(doc.schedule[0].open, 1100);
          assert.equal(doc.schedule[0].close, 1900);

          done();
        });
      });

      describe('when overwriting with a document instance', function() {
        it('does not cause StackOverflows (gh-1234)', function(done) {
          var doc = new TestDocument({nested: {age: 35}});
          doc.nested = doc.nested;
          assert.doesNotThrow(function() {
            doc.nested.age;
          });
          done();
        });
      });
    });
  });

  describe('virtual', function() {
    describe('setter', function() {
      var val;
      var M;

      before(function(done) {
        var schema = new mongoose.Schema({v: Number});
        schema.virtual('thang').set(function(v) {
          val = v;
        });

        var db = start();
        M = db.model('gh-1154', schema);
        db.close();
        done();
      });

      it('works with objects', function(done) {
        new M({thang: {}});
        assert.deepEqual({}, val);
        done();
      });
      it('works with arrays', function(done) {
        new M({thang: []});
        assert.deepEqual([], val);
        done();
      });
      it('works with numbers', function(done) {
        new M({thang: 4});
        assert.deepEqual(4, val);
        done();
      });
      it('works with strings', function(done) {
        new M({thang: '3'});
        assert.deepEqual('3', val);
        done();
      });
    });
  });

  describe('gh-2082', function() {
    it('works', function(done) {
      var db = start();
      var Parent = db.model('gh2082', parentSchema, 'gh2082');

      var parent = new Parent({name: 'Hello'});
      parent.save(function(err, parent) {
        assert.ifError(err);
        parent.children.push({counter: 0});
        parent.save(function(err, parent) {
          assert.ifError(err);
          parent.children[0].counter += 1;
          parent.save(function(err, parent) {
            assert.ifError(err);
            parent.children[0].counter += 1;
            parent.save(function(err) {
              assert.ifError(err);
              Parent.findOne({}, function(error, parent) {
                assert.ifError(error);
                assert.equal(parent.children[0].counter, 2);
                db.close(done);
              });
            });
          });
        });
      });
    });
  });

  describe('gh-1933', function() {
    it('works', function(done) {
      var db = start();
      var M = db.model('gh1933', new Schema({id: String, field: Number}), 'gh1933');

      M.create({}, function(error) {
        assert.ifError(error);
        M.findOne({}, function(error, doc) {
          assert.ifError(error);
          doc.__v = 123;
          doc.field = 5; // .push({ _id: '123', type: '456' });
          doc.save(function(error) {
            assert.ifError(error);
            db.close(done);
          });
        });
      });
    });
  });

  describe('gh-1638', function() {
    it('works', function(done) {
      var ItemChildSchema = new mongoose.Schema({
        name: {type: String, required: true, default: 'hello'}
      });

      var ItemParentSchema = new mongoose.Schema({
        children: [ItemChildSchema]
      });

      var db = start();
      var ItemParent = db.model('gh-1638-1', ItemParentSchema, 'gh-1638-1');
      var ItemChild = db.model('gh-1638-2', ItemChildSchema, 'gh-1638-2');

      var c1 = new ItemChild({name: 'first child'});
      var c2 = new ItemChild({name: 'second child'});

      var p = new ItemParent({
        children: [c1, c2]
      });

      p.save(function(error) {
        assert.ifError(error);

        c2.name = 'updated 2';
        p.children = [c2];
        p.save(function(error, doc) {
          assert.ifError(error);
          assert.equal(doc.children.length, 1);
          db.close(done);
        });
      });
    });
  });

  describe('gh-2434', function() {
    it('will save the new value', function(done) {
      var ItemSchema = new mongoose.Schema({
        st: Number,
        s: []
      });

      var db = start();
      var Item = db.model('gh-2434', ItemSchema, 'gh-2434');

      var item = new Item({st: 1});

      item.save(function(error) {
        assert.ifError(error);
        item.st = 3;
        item.s = [];
        item.save(function(error) {
          assert.ifError(error);
          // item.st is 3 but may not be saved to DB
          Item.findById(item._id, function(error, doc) {
            assert.ifError(error);
            assert.equal(doc.st, 3);
            db.close(done);
          });
        });
      });
    });
  });

  it('properly calls queue functions (gh-2856)', function(done) {
    var personSchema = new mongoose.Schema({
      name: String
    });

    var db = start();
    var calledName;
    personSchema.methods.fn = function() {
      calledName = this.name;
    };
    personSchema.queue('fn');

    var Person = db.model('gh2856', personSchema, 'gh2856');
    new Person({name: 'Val'});
    assert.equal(calledName, 'Val');
    db.close(done);
  });

  describe('bug fixes', function() {
    var db;

    before(function() {
      db = start();
    });

    after(function(done) {
      db.close(done);
    });

    it('applies toJSON transform correctly for populated docs (gh-2910) (gh-2990)', function(done) {
      var parentSchema = mongoose.Schema({
        c: {type: mongoose.Schema.Types.ObjectId, ref: 'gh-2910-1'}
      });

      var called = [];
      parentSchema.options.toJSON = {
        transform: function(doc, ret) {
          called.push(ret);
          return ret;
        }
      };

      var childSchema = mongoose.Schema({
        name: String
      });

      var childCalled = [];
      childSchema.options.toJSON = {
        transform: function(doc, ret) {
          childCalled.push(ret);
          return ret;
        }
      };

      var Child = db.model('gh-2910-1', childSchema);
      var Parent = db.model('gh-2910-0', parentSchema);

      Child.create({name: 'test'}, function(error, c) {
        Parent.create({c: c._id}, function(error, p) {
          Parent.findOne({_id: p._id}).populate('c').exec(function(error, p) {
            var doc = p.toJSON();
            assert.equal(called.length, 1);
            assert.equal(called[0]._id.toString(), p._id.toString());
            assert.equal(doc._id.toString(), p._id.toString());
            assert.equal(childCalled.length, 1);
            assert.equal(childCalled[0]._id.toString(), c._id.toString());

            called = [];
            childCalled = [];

            // JSON.stringify() passes field name, so make sure we don't treat
            // that as a param to toJSON (gh-2990)
            doc = JSON.parse(JSON.stringify({parent: p})).parent;
            assert.equal(called.length, 1);
            assert.equal(called[0]._id.toString(), p._id.toString());
            assert.equal(doc._id.toString(), p._id.toString());
            assert.equal(childCalled.length, 1);
            assert.equal(childCalled[0]._id.toString(), c._id.toString());

            done();
          });
        });
      });
    });

    it('setters firing with objects on real paths (gh-2943)', function(done) {
      var M = mongoose.model('gh2943', {
        myStr: {
          type: String, set: function(v) {
            return v.value;
          }
        },
        otherStr: String
      });

      var t = new M({myStr: {value: 'test'}});
      assert.equal(t.myStr, 'test');

      new M({otherStr: {value: 'test'}});
      assert.ok(!t.otherStr);

      done();
    });

    describe('gh-2782', function() {
      it('should set data from a sub doc', function(done) {
        var schema1 = new mongoose.Schema({
          data: {
            email: String
          }
        });
        var schema2 = new mongoose.Schema({
          email: String
        });
        var Model1 = mongoose.model('gh-2782-1', schema1);
        var Model2 = mongoose.model('gh-2782-2', schema2);

        var doc1 = new Model1({'data.email': 'some@example.com'});
        assert.equal(doc1.data.email, 'some@example.com');
        var doc2 = new Model2();
        doc2.set(doc1.data);
        assert.equal(doc2.email, 'some@example.com');
        done();
      });
    });

    it('set data from subdoc keys (gh-3346)', function(done) {
      var schema1 = new mongoose.Schema({
        data: {
          email: String
        }
      });
      var Model1 = mongoose.model('gh3346', schema1);

      var doc1 = new Model1({'data.email': 'some@example.com'});
      assert.equal(doc1.data.email, 'some@example.com');
      var doc2 = new Model1({data: doc1.data});
      assert.equal(doc2.data.email, 'some@example.com');
      done();
    });

    it('doesnt attempt to cast generic objects as strings (gh-3030)', function(done) {
      var M = mongoose.model('gh3030', {
        myStr: {
          type: String
        }
      });

      var t = new M({myStr: {thisIs: 'anObject'}});
      assert.ok(!t.myStr);
      t.validate(function(error) {
        assert.ok(error);
        done();
      });
    });

    it('single embedded schemas 1 (gh-2689)', function(done) {
      var userSchema = new mongoose.Schema({
        name: String,
        email: String
      }, {_id: false, id: false});

      var userHookCount = 0;
      userSchema.pre('save', function(next) {
        ++userHookCount;
        next();
      });

      var eventSchema = new mongoose.Schema({
        user: userSchema,
        name: String
      });

      var eventHookCount = 0;
      eventSchema.pre('save', function(next) {
        ++eventHookCount;
        next();
      });

      var Event = db.model('gh2689', eventSchema);

      var e = new Event({name: 'test', user: {name: 123, email: 'val'}});
      e.save(function(error) {
        assert.ifError(error);
        assert.strictEqual(e.user.name, '123');
        assert.equal(eventHookCount, 1);
        assert.equal(userHookCount, 1);

        Event.findOne(
            {user: {name: '123', email: 'val'}},
            function(error, doc) {
              assert.ifError(error);
              assert.ok(doc);

              Event.findOne(
                  {user: {$in: [{name: '123', email: 'val'}]}},
                  function(error, doc) {
                    assert.ifError(error);
                    assert.ok(doc);
                    done();
                  });
            });
      });
    });

    it('single embedded schemas with validation (gh-2689)', function(done) {
      var userSchema = new mongoose.Schema({
        name: String,
        email: {type: String, required: true, match: /.+@.+/}
      }, {_id: false, id: false});

      var eventSchema = new mongoose.Schema({
        user: userSchema,
        name: String
      });

      var Event = db.model('gh2689_1', eventSchema);

      var e = new Event({name: 'test', user: {}});
      var error = e.validateSync();
      assert.ok(error);
      assert.ok(error.errors['user.email']);
      assert.equal(error.errors['user.email'].kind, 'required');

      e.user.email = 'val';
      error = e.validateSync();

      assert.ok(error);
      assert.ok(error.errors['user.email']);
      assert.equal(error.errors['user.email'].kind, 'regexp');

      done();
    });

    it('single embedded parent() (gh-5134)', function(done) {
      var userSchema = new mongoose.Schema({
        name: String,
        email: {type: String, required: true, match: /.+@.+/}
      }, {_id: false, id: false});

      var eventSchema = new mongoose.Schema({
        user: userSchema,
        name: String
      });

      var Event = db.model('gh5134', eventSchema);

      var e = new Event({name: 'test', user: {}});
      assert.strictEqual(e.user.parent(), e.user.ownerDocument());

      done();
    });

    it('single embedded schemas with markmodified (gh-2689)', function(done) {
      var userSchema = new mongoose.Schema({
        name: String,
        email: {type: String, required: true, match: /.+@.+/}
      }, {_id: false, id: false});

      var eventSchema = new mongoose.Schema({
        user: userSchema,
        name: String
      });

      var Event = db.model('gh2689_2', eventSchema);

      var e = new Event({name: 'test', user: {email: 'a@b'}});
      e.save(function(error, doc) {
        assert.ifError(error);
        assert.ok(doc);
        assert.ok(!doc.isModified('user'));
        assert.ok(!doc.isModified('user.email'));
        assert.ok(!doc.isModified('user.name'));
        doc.user.name = 'Val';
        assert.ok(doc.isModified('user'));
        assert.ok(!doc.isModified('user.email'));
        assert.ok(doc.isModified('user.name'));

        var delta = doc.$__delta()[1];
        assert.deepEqual(delta, {
          $set: {'user.name': 'Val'}
        });

        doc.save(function(error) {
          assert.ifError(error);
          Event.findOne({_id: doc._id}, function(error, doc) {
            assert.ifError(error);
            assert.deepEqual(doc.user.toObject(), {email: 'a@b', name: 'Val'});
            done();
          });
        });
      });
    });

    it('single embedded schemas + update validators (gh-2689)', function(done) {
      var userSchema = new mongoose.Schema({
        name: {type: String, default: 'Val'},
        email: {type: String, required: true, match: /.+@.+/}
      }, {_id: false, id: false});

      var eventSchema = new mongoose.Schema({
        user: userSchema,
        name: String
      });

      var Event = db.model('gh2689_3', eventSchema);

      var badUpdate = {$set: {'user.email': 'a'}};
      var options = {runValidators: true};
      Event.update({}, badUpdate, options, function(error) {
        assert.ok(error);
        assert.equal(error.errors['user.email'].kind, 'regexp');

        var nestedUpdate = {name: 'test'};
        var options = {upsert: true, setDefaultsOnInsert: true};
        Event.update({}, nestedUpdate, options, function(error) {
          assert.ifError(error);
          Event.findOne({name: 'test'}, function(error, ev) {
            assert.ifError(error);
            assert.equal(ev.user.name, 'Val');
            done();
          });
        });
      });
    });
  });

  describe('error processing (gh-2284)', function() {
    var db;

    before(function() {
      db = start();
    });

    after(function(done) {
      db.close(done);
    });

    it('save errors', function(done) {
      var schema = new Schema({
        name: { type: String, required: true }
      });

      schema.post('save', function(error, doc, next) {
        next(new Error('Catch all'));
      });

      schema.post('save', function(error, doc, next) {
        next(new Error('Catch all #2'));
      });

      var Model = mongoose.model('gh2284', schema);

      Model.create({}, function(error) {
        assert.ok(error);
        assert.equal(error.message, 'Catch all #2');
        done();
      });
    });

    it('validate errors (gh-4885)', function(done) {
      var testSchema = new Schema({ title: { type: String, required: true } });

      var called = 0;
      testSchema.post('validate', function(error, doc, next) {
        ++called;
        next(error);
      });

      var Test = db.model('gh4885', testSchema);

      Test.create({}, function(error) {
        assert.ok(error);
        assert.equal(called, 1);
        done();
      });
    });

    it('handles non-errors', function(done) {
      var schema = new Schema({
        name: { type: String, required: true }
      });

      schema.post('save', function(error, doc, next) {
        next(new Error('Catch all'));
      });

      schema.post('save', function(error, doc, next) {
        next(new Error('Catch all #2'));
      });

      var Model = db.model('gh2284_1', schema);

      Model.create({ name: 'test' }, function(error) {
        assert.ifError(error);
        done();
      });
    });
  });

  describe('bug fixes', function() {
    var db;

    before(function() {
      db = start();
    });

    after(function(done) {
      db.close(done);
    });

    it('single embedded schemas with populate (gh-3501)', function(done) {
      var PopulateMeSchema = new Schema({});

      var Child = db.model('gh3501', PopulateMeSchema);

      var SingleNestedSchema = new Schema({
        populateMeArray: [{
          type: Schema.Types.ObjectId,
          ref: 'gh3501'
        }]
      });

      var parentSchema = new Schema({
        singleNested: SingleNestedSchema
      });

      var P = db.model('gh3501_1', parentSchema);

      Child.create([{}, {}], function(error, docs) {
        assert.ifError(error);
        var obj = {
          singleNested: {populateMeArray: [docs[0]._id, docs[1]._id]}
        };
        P.create(obj, function(error, doc) {
          assert.ifError(error);
          P.
          findById(doc._id).
          populate('singleNested.populateMeArray').
          exec(function(error, doc) {
            assert.ok(doc.singleNested.populateMeArray[0]._id);
            done();
          });
        });
      });
    });

    it('single embedded schemas with methods (gh-3534)', function(done) {
      var personSchema = new Schema({name: String});
      personSchema.methods.firstName = function() {
        return this.name.substr(0, this.name.indexOf(' '));
      };

      var bandSchema = new Schema({leadSinger: personSchema});
      var Band = db.model('gh3534', bandSchema);

      var gnr = new Band({leadSinger: {name: 'Axl Rose'}});
      assert.equal(gnr.leadSinger.firstName(), 'Axl');
      done();
    });

    it('single embedded schemas with models (gh-3535)', function(done) {
      var db = start();
      var personSchema = new Schema({name: String});
      var Person = db.model('gh3535_0', personSchema);

      var bandSchema = new Schema({leadSinger: personSchema});
      var Band = db.model('gh3535', bandSchema);

      var axl = new Person({name: 'Axl Rose'});
      var gnr = new Band({leadSinger: axl});

      gnr.save(function(error) {
        assert.ifError(error);
        assert.equal(gnr.leadSinger.name, 'Axl Rose');
        done();
      });
    });

    it('single embedded schemas with indexes (gh-3594)', function(done) {
      var personSchema = new Schema({name: {type: String, unique: true}});

      var bandSchema = new Schema({leadSinger: personSchema});

      assert.equal(bandSchema.indexes().length, 1);
      var index = bandSchema.indexes()[0];
      assert.deepEqual(index[0], {'leadSinger.name': 1});
      assert.ok(index[1].unique);
      done();
    });

    it('removing single embedded docs (gh-3596)', function(done) {
      var personSchema = new Schema({name: String});

      var bandSchema = new Schema({guitarist: personSchema, name: String});
      var Band = db.model('gh3596', bandSchema);

      var gnr = new Band({
        name: 'Guns N\' Roses',
        guitarist: {name: 'Slash'}
      });
      gnr.save(function(error, gnr) {
        assert.ifError(error);
        gnr.guitarist = undefined;
        gnr.save(function(error, gnr) {
          assert.ifError(error);
          assert.ok(!gnr.guitarist);
          done();
        });
      });
    });

    it('setting single embedded docs (gh-3601)', function(done) {
      var personSchema = new Schema({name: String});

      var bandSchema = new Schema({guitarist: personSchema, name: String});
      var Band = db.model('gh3601', bandSchema);

      var gnr = new Band({
        name: 'Guns N\' Roses',
        guitarist: {name: 'Slash'}
      });
      var velvetRevolver = new Band({
        name: 'Velvet Revolver'
      });
      velvetRevolver.guitarist = gnr.guitarist;
      velvetRevolver.save(function(error) {
        assert.ifError(error);
        assert.equal(velvetRevolver.guitarist, gnr.guitarist);
        done();
      });
    });

    it('single embedded docs init obeys strict mode (gh-3642)', function(done) {
      var personSchema = new Schema({name: String});

      var bandSchema = new Schema({guitarist: personSchema, name: String});
      var Band = db.model('gh3642', bandSchema);

      var velvetRevolver = new Band({
        name: 'Velvet Revolver',
        guitarist: {name: 'Slash', realName: 'Saul Hudson'}
      });

      velvetRevolver.save(function(error) {
        assert.ifError(error);
        var query = {name: 'Velvet Revolver'};
        Band.collection.findOne(query, function(error, band) {
          assert.ifError(error);
          assert.ok(!band.guitarist.realName);
          done();
        });
      });
    });

    it('single embedded docs post hooks (gh-3679)', function(done) {
      var postHookCalls = [];
      var personSchema = new Schema({name: String});
      personSchema.post('save', function() {
        postHookCalls.push(this);
      });

      var bandSchema = new Schema({guitarist: personSchema, name: String});
      var Band = db.model('gh3679', bandSchema);
      var obj = {name: 'Guns N\' Roses', guitarist: {name: 'Slash'}};

      Band.create(obj, function(error) {
        assert.ifError(error);
        setTimeout(function() {
          assert.equal(postHookCalls.length, 1);
          assert.equal(postHookCalls[0].name, 'Slash');
          done();
        });
      });
    });

    it('single embedded docs .set() (gh-3686)', function(done) {
      var personSchema = new Schema({name: String, realName: String});

      var bandSchema = new Schema({
        guitarist: personSchema,
        name: String
      });
      var Band = db.model('gh3686', bandSchema);
      var obj = {
        name: 'Guns N\' Roses',
        guitarist: {name: 'Slash', realName: 'Saul Hudson'}
      };

      Band.create(obj, function(error, gnr) {
        gnr.set('guitarist.name', 'Buckethead');
        gnr.save(function(error) {
          assert.ifError(error);
          assert.equal(gnr.guitarist.name, 'Buckethead');
          assert.equal(gnr.guitarist.realName, 'Saul Hudson');
          done();
        });
      });
    });

    it('single embedded docs with arrays pre hooks (gh-3680)', function(done) {
      var childSchema = new Schema({count: Number});

      var preCalls = 0;
      childSchema.pre('save', function(next) {
        ++preCalls;
        next();
      });

      var SingleNestedSchema = new Schema({
        children: [childSchema]
      });

      var ParentSchema = new Schema({
        singleNested: SingleNestedSchema
      });

      var Parent = db.model('gh3680', ParentSchema);
      var obj = {singleNested: {children: [{count: 0}]}};
      Parent.create(obj, function(error) {
        assert.ifError(error);
        assert.equal(preCalls, 1);
        done();
      });
    });

    it('nested single embedded doc validation (gh-3702)', function(done) {
      var childChildSchema = new Schema({count: {type: Number, min: 1}});
      var childSchema = new Schema({child: childChildSchema});
      var parentSchema = new Schema({child: childSchema});

      var Parent = db.model('gh3702', parentSchema);
      var obj = {child: {child: {count: 0}}};
      Parent.create(obj, function(error) {
        assert.ok(error);
        assert.ok(/ValidationError/.test(error.toString()));
        done();
      });
    });

    it('handles virtuals with dots correctly (gh-3618)', function(done) {
      var testSchema = new Schema({nested: {type: Object, default: {}}});
      testSchema.virtual('nested.test').get(function() {
        return true;
      });

      var Test = db.model('gh3618', testSchema);

      var test = new Test();

      var doc = test.toObject({getters: true, virtuals: true});
      delete doc._id;
      delete doc.id;
      assert.deepEqual(doc, {nested: {test: true}});

      doc = test.toObject({getters: false, virtuals: true});
      delete doc._id;
      delete doc.id;
      assert.deepEqual(doc, {nested: {test: true}});
      done();
    });

    it('handles pushing with numeric keys (gh-3623)', function(done) {
      var schema = new Schema({
        array: [{
          1: {
            date: Date
          },
          2: {
            date: Date
          },
          3: {
            date: Date
          }
        }]
      });

      var MyModel = db.model('gh3623', schema);

      var doc = {array: [{2: {}}]};
      MyModel.collection.insertOne(doc, function(error) {
        assert.ifError(error);

        MyModel.findOne({_id: doc._id}, function(error, doc) {
          assert.ifError(error);
          doc.array.push({2: {}});
          doc.save(function(error) {
            assert.ifError(error);
            done();
          });
        });
      });
    });

    it('execPopulate (gh-3753)', function(done) {
      var childSchema = new Schema({
        name: String
      });

      var parentSchema = new Schema({
        name: String,
        children: [{type: ObjectId, ref: 'gh3753'}]
      });

      var Child = db.model('gh3753', childSchema);
      var Parent = db.model('gh3753_0', parentSchema);

      Child.create({name: 'Luke Skywalker'}, function(error, child) {
        assert.ifError(error);
        var doc = {name: 'Darth Vader', children: [child._id]};
        Parent.create(doc, function(error, doc) {
          Parent.findOne({_id: doc._id}, function(error, doc) {
            assert.ifError(error);
            assert.ok(doc);
            doc.populate('children').execPopulate().then(function(doc) {
              assert.equal(doc.children.length, 1);
              assert.equal(doc.children[0].name, 'Luke Skywalker');
              done();
            });
          });
        });
      });
    });

    it('handles 0 for numeric subdoc ids (gh-3776)', function(done) {
      var personSchema = new Schema({
        _id: Number,
        name: String,
        age: Number,
        friends: [{type: Number, ref: 'gh3776'}]
      });

      var Person = db.model('gh3776', personSchema);

      var people = [
        {_id: 0, name: 'Alice'},
        {_id: 1, name: 'Bob'}
      ];

      Person.create(people, function(error, people) {
        assert.ifError(error);
        var alice = people[0];
        alice.friends.push(people[1]);
        alice.save(function(error) {
          assert.ifError(error);
          done();
        });
      });
    });

    it('handles conflicting names (gh-3867)', function(done) {
      var testSchema = new Schema({
        name: {
          type: String,
          required: true
        },
        things: [{
          name: {
            type: String,
            required: true
          }
        }]
      });

      var M = mongoose.model('gh3867', testSchema);

      var doc = M({
        things: [{}]
      });

      var fields = Object.keys(doc.validateSync().errors).sort();
      assert.deepEqual(fields, ['name', 'things.0.name']);
      done();
    });

    it('populate with lean (gh-3873)', function(done) {
      var companySchema = new mongoose.Schema({
        name:  String,
        description:  String,
        userCnt: { type: Number, default: 0, select: false }
      });

      var userSchema = new mongoose.Schema({
        name:  String,
        company: { type: mongoose.Schema.Types.ObjectId, ref: 'gh3873' }
      });

      var Company = db.model('gh3873', companySchema);
      var User = db.model('gh3873_0', userSchema);

      var company = new Company({ name: 'IniTech', userCnt: 1 });
      var user = new User({ name: 'Peter', company: company._id });

      company.save(function(error) {
        assert.ifError(error);
        user.save(function(error) {
          assert.ifError(error);
          next();
        });
      });

      function next() {
        var pop = { path: 'company', select: 'name', options: { lean: true } };
        User.find({}).populate(pop).exec(function(error, docs) {
          assert.ifError(error);
          assert.equal(docs.length, 1);
          assert.strictEqual(docs[0].company.userCnt, undefined);
          done();
        });
      }
    });

    it('init single nested subdoc with select (gh-3880)', function(done) {
      var childSchema = new mongoose.Schema({
        name: { type: String },
        friends: [{ type: String }]
      });

      var parentSchema = new mongoose.Schema({
        name: { type: String },
        child: childSchema
      });

      var Parent = db.model('gh3880', parentSchema);
      var p = new Parent({
        name: 'Mufasa',
        child: {
          name: 'Simba',
          friends: ['Pumbaa', 'Timon', 'Nala']
        }
      });

      p.save(function(error) {
        assert.ifError(error);
        var fields = 'name child.name';
        Parent.findById(p._id).select(fields).exec(function(error, doc) {
          assert.ifError(error);
          assert.strictEqual(doc.child.friends, void 0);
          done();
        });
      });
    });

    it('single nested subdoc isModified() (gh-3910)', function(done) {
      var called = 0;

      var ChildSchema = new Schema({
        name: String
      });

      ChildSchema.pre('save', function(next) {
        assert.ok(this.isModified('name'));
        ++called;
        next();
      });

      var ParentSchema = new Schema({
        name: String,
        child: ChildSchema
      });

      var Parent = db.model('gh3910', ParentSchema);

      var p = new Parent({
        name: 'Darth Vader',
        child: {
          name: 'Luke Skywalker'
        }
      });

      p.save(function(error) {
        assert.ifError(error);
        assert.strictEqual(called, 1);
        done();
      });
    });

    it('pre and post as schema keys (gh-3902)', function(done) {
      var schema = new mongoose.Schema({
        pre: String,
        post: String
      }, { versionKey: false });
      var MyModel = db.model('gh3902', schema);

      MyModel.create({ pre: 'test', post: 'test' }, function(error, doc) {
        assert.ifError(error);
        assert.deepEqual(_.omit(doc.toObject(), '_id'),
          { pre: 'test', post: 'test' });
        done();
      });
    });

    it('manual population and isNew (gh-3982)', function(done) {
      var NestedModelSchema = new mongoose.Schema({
        field: String
      });

      var NestedModel = db.model('gh3982', NestedModelSchema);

      var ModelSchema = new mongoose.Schema({
        field: String,
        array: [{
          type: mongoose.Schema.ObjectId,
          ref: 'gh3982',
          required: true
        }]
      });

      var Model = db.model('gh3982_0', ModelSchema);

      var nestedModel = new NestedModel({
        'field': 'nestedModel'
      });

      nestedModel.save(function(error, nestedModel) {
        assert.ifError(error);
        Model.create({ array: [nestedModel._id] }, function(error, doc) {
          assert.ifError(error);
          Model.findById(doc._id).populate('array').exec(function(error, doc) {
            assert.ifError(error);
            doc.array.push(nestedModel);
            assert.strictEqual(doc.isNew, false);
            assert.strictEqual(doc.array[0].isNew, false);
            assert.strictEqual(doc.array[1].isNew, false);
            assert.strictEqual(nestedModel.isNew, false);
            done();
          });
        });
      });
    });

    it('doesnt skipId for single nested subdocs (gh-4008)', function(done) {
      var childSchema = new Schema({
        name: String
      });

      var parentSchema = new Schema({
        child: childSchema
      });

      var Parent = db.model('gh4008', parentSchema);

      Parent.create({ child: { name: 'My child' } }, function(error, doc) {
        assert.ifError(error);
        Parent.collection.findOne({ _id: doc._id }, function(error, doc) {
          assert.ifError(error);
          assert.ok(doc.child._id);
          done();
        });
      });
    });

    it('single embedded docs with $near (gh-4014)', function(done) {
      var schema = new mongoose.Schema({
        placeName: String
      });

      var geoSchema = new mongoose.Schema({
        type: {
          type: String,
          enum: 'Point',
          default: 'Point'
        },
        coordinates: {
          type: [Number],
          default: [0, 0]
        }
      });

      schema.add({ geo: geoSchema });
      schema.index({ geo: '2dsphere' });

      var MyModel = db.model('gh4014', schema);

      MyModel.
        where('geo').near({ center: [50, 50] }).
        exec(function(error) {
          assert.ifError(error);
          done();
        });
    });

    it('skip validation if required returns false (gh-4094)', function(done) {
      var schema = new Schema({
        div: {
          type: Number,
          required: function() { return false; },
          validate: function(v) { return !!v; }
        }
      });
      var Model = db.model('gh4094', schema);
      var m = new Model();
      assert.ifError(m.validateSync());
      done();
    });

    it('ability to overwrite array default (gh-4109)', function(done) {
      var schema = new Schema({
        names: {
          type: [String],
          default: void 0
        }
      });

      var Model = db.model('gh4109', schema);
      var m = new Model();
      assert.ok(!m.names);
      m.save(function(error, m) {
        assert.ifError(error);
        Model.collection.findOne({ _id: m._id }, function(error, doc) {
          assert.ifError(error);
          assert.ok(!('names' in doc));
          done();
        });
      });
    });

    it('validation works when setting array index (gh-3816)', function(done) {
      var mySchema = new mongoose.Schema({
        items: [
          { month: Number, date: Date }
        ]
      });

      var Test = db.model('test', mySchema);

      var a = [
        { month: 0, date: new Date() },
        { month: 1, date: new Date() }
      ];
      Test.create({ items: a }, function(error, doc) {
        assert.ifError(error);
        Test.findById(doc._id).exec(function(error, doc) {
          assert.ifError(error);
          assert.ok(doc);
          doc.items[0] = {
            month: 5,
            date : new Date()
          };
          doc.markModified('items');
          doc.save(function(error) {
            assert.ifError(error);
            done();
          });
        });
      });
    });

    it('single embedded with defaults have $parent (gh-4115)', function(done) {
      var ChildSchema = new Schema({
        name: {
          type: String,
          'default': 'child'
        }
      });

      var ParentSchema = new Schema({
        child: {
          type: ChildSchema,
          'default': {}
        }
      });

      var Parent = db.model('gh4115', ParentSchema);

      var p = new Parent();
      assert.equal(p.child.$parent, p);
      done();
    });

    it('removing parent doc calls remove hooks on subdocs (gh-2348) (gh-4566)', function(done) {
      var ChildSchema = new Schema({
        name: String
      });

      var called = {};
      ChildSchema.pre('remove', function(next) {
        called[this.name] = true;
        next();
      });

      var ParentSchema = new Schema({
        children: [ChildSchema],
        child: ChildSchema
      });

      var Parent = db.model('gh2348', ParentSchema);

      var doc = {
        children: [{ name: 'Jacen' }, { name: 'Jaina' }],
        child: { name: 'Anakin' }
      };
      Parent.create(doc, function(error, doc) {
        assert.ifError(error);
        doc.remove(function(error, doc) {
          assert.ifError(error);
          assert.deepEqual(called, {
            Jacen: true,
            Jaina: true,
            Anakin: true
          });
          var arr = doc.children.toObject().map(function(v) { return v.name; });
          assert.deepEqual(arr, ['Jacen', 'Jaina']);
          assert.equal(doc.child.name, 'Anakin');
          done();
        });
      });
    });

    it('strings of length 12 are valid oids (gh-3365)', function(done) {
      var schema = new Schema({ myId: mongoose.Schema.Types.ObjectId });
      var M = db.model('gh3365', schema);
      var doc = new M({ myId: 'blablablabla' });
      doc.validate(function(error) {
        assert.ifError(error);
        done();
      });
    });

    it('set() empty obj unmodifies subpaths (gh-4182)', function(done) {
      var omeletteSchema = new Schema({
        topping: {
          meat: {
            type: String,
            enum: ['bacon', 'sausage']
          },
          cheese: Boolean
        }
      });
      var Omelette = db.model('gh4182', omeletteSchema);
      var doc = new Omelette({
        topping: {
          meat: 'bacon',
          cheese: true
        }
      });
      doc.topping = {};
      doc.save(function(error) {
        assert.ifError(error);
        assert.strictEqual(doc.topping.meat, void 0);
        done();
      });
    });

    it('emits cb errors on model for save (gh-3499)', function(done) {
      var testSchema = new Schema({ name: String });

      var Test = db.model('gh3499', testSchema);

      Test.on('error', function(error) {
        assert.equal(error.message, 'fail!');
        done();
      });

      new Test({}).save(function() {
        throw new Error('fail!');
      });
    });

    it('emits cb errors on model for save with hooks (gh-3499)', function(done) {
      var testSchema = new Schema({ name: String });

      testSchema.pre('save', function(next) {
        next();
      });

      testSchema.post('save', function(doc, next) {
        next();
      });

      var Test = db.model('gh3499_0', testSchema);

      Test.on('error', function(error) {
        assert.equal(error.message, 'fail!');
        done();
      });

      new Test({}).save(function() {
        throw new Error('fail!');
      });
    });

    it('emits cb errors on model for find() (gh-3499)', function(done) {
      var testSchema = new Schema({ name: String });

      var Test = db.model('gh3499_1', testSchema);

      Test.on('error', function(error) {
        assert.equal(error.message, 'fail!');
        done();
      });

      Test.find({}, function() {
        throw new Error('fail!');
      });
    });

    it('emits cb errors on model for find() + hooks (gh-3499)', function(done) {
      var testSchema = new Schema({ name: String });

      testSchema.post('find', function(results, next) {
        assert.equal(results.length, 0);
        next();
      });

      var Test = db.model('gh3499_2', testSchema);

      Test.on('error', function(error) {
        assert.equal(error.message, 'fail!');
        done();
      });

      Test.find({}, function() {
        throw new Error('fail!');
      });
    });

    it('clears subpaths when removing single nested (gh-4216)', function(done) {
      var RecurrenceSchema = new Schema({
        frequency: Number,
        interval: {
          type: String,
          enum: ['days', 'weeks', 'months', 'years']
        }
      }, { _id: false });

      var EventSchema = new Schema({
        name: {
          type: String,
          trim: true
        },
        recurrence: RecurrenceSchema
      });

      var Event = db.model('gh4216', EventSchema);
      var ev = new Event({
        name: 'test',
        recurrence: { frequency: 2, interval: 'days' }
      });
      ev.recurrence = null;
      ev.save(function(error) {
        assert.ifError(error);
        done();
      });
    });

    it('using validator.isEmail as a validator (gh-4064) (gh-4084)', function(done) {
      var schema = new Schema({
        email: { type: String, validate: validator.isEmail }
      });

      var MyModel = db.model('gh4064', schema);

      MyModel.create({ email: 'invalid' }, function(error) {
        assert.ok(error);
        assert.ok(error.errors['email']);
        done();
      });
    });

    it('setting path to empty object works (gh-4218)', function(done) {
      var schema = new Schema({
        object: {
          nested: {
            field1: { type: Number, default: 1 }
          }
        }
      });

      var MyModel = db.model('gh4218', schema);

      MyModel.create({}, function(error, doc) {
        doc.object.nested = {};
        doc.save(function(error, doc) {
          assert.ifError(error);
          MyModel.collection.findOne({ _id: doc._id }, function(error, doc) {
            assert.ifError(error);
            assert.deepEqual(doc.object.nested, {});
            done();
          });
        });
      });
    });

    it('minimize + empty object (gh-4337)', function(done) {
      var SomeModel;
      var SomeModelSchema;

      SomeModelSchema = new mongoose.Schema({}, {
        minimize: false
      });

      SomeModel = mongoose.model('somemodel', SomeModelSchema);

      try {
        new SomeModel({});
      } catch (error) {
        assert.ifError(error);
      }
      done();
    });

    it('doesnt markModified child paths if parent is modified (gh-4224)', function(done) {
      var childSchema = new Schema({
        name: String
      });
      var parentSchema = new Schema({
        child: childSchema
      });

      var Parent = db.model('gh4224', parentSchema);
      Parent.create({ child: { name: 'Jacen' } }, function(error, doc) {
        assert.ifError(error);
        doc.child = { name: 'Jaina' };
        doc.child.name = 'Anakin';
        assert.deepEqual(doc.modifiedPaths(), ['child']);
        assert.ok(doc.isModified('child.name'));
        done();
      });
    });

    it('single nested isNew (gh-4369)', function(done) {
      var childSchema = new Schema({
        name: String
      });
      var parentSchema = new Schema({
        child: childSchema
      });

      var Parent = db.model('gh4369', parentSchema);
      var remaining = 2;

      var doc = new Parent({ child: { name: 'Jacen' } });
      doc.child.on('isNew', function(val) {
        assert.ok(!val);
        assert.ok(!doc.child.isNew);
        --remaining || done();
      });

      doc.save(function(error, doc) {
        assert.ifError(error);
        assert.ok(!doc.child.isNew);
        --remaining || done();
      });
    });

    it('deep default array values (gh-4540)', function(done) {
      var schema = new Schema({
        arr: [{
          test: {
            type: Array,
            default: ['test']
          }
        }]
      });
      assert.doesNotThrow(function() {
        db.model('gh4540', schema);
      });
      done();
    });

    it('default values with subdoc array (gh-4390)', function(done) {
      var childSchema = new Schema({
        name: String
      });
      var parentSchema = new Schema({
        child: [childSchema]
      });

      parentSchema.path('child').default([{ name: 'test' }]);

      var Parent = db.model('gh4390', parentSchema);

      Parent.create({}, function(error, doc) {
        assert.ifError(error);
        var arr = doc.toObject().child.map(function(doc) {
          assert.ok(doc._id);
          delete doc._id;
          return doc;
        });
        assert.deepEqual(arr, [{ name: 'test' }]);
        done();
      });
    });

    it('handles invalid dates (gh-4404)', function(done) {
      var testSchema = new Schema({
        date: Date
      });

      var Test = db.model('gh4404', testSchema);

      Test.create({ date: new Date('invalid date') }, function(error) {
        assert.ok(error);
        assert.equal(error.errors['date'].name, 'CastError');
        done();
      });
    });

    it('setting array subpath (gh-4472)', function(done) {
      var ChildSchema = new mongoose.Schema({
        name: String,
        age: Number
      }, { _id: false });

      var ParentSchema = new mongoose.Schema({
        data: {
          children: [ChildSchema]
        }
      });

      var Parent = db.model('gh4472', ParentSchema);

      var p = new Parent();
      p.set('data.children.0', {
        name: 'Bob',
        age: 900
      });

      assert.deepEqual(p.toObject().data.children, [{ name: 'Bob', age: 900 }]);
      done();
    });

    it('ignore paths (gh-4480)', function(done) {
      var TestSchema = new Schema({
        name: { type: String, required: true }
      });

      var Test = db.model('gh4480', TestSchema);

      Test.create({ name: 'val' }, function(error) {
        assert.ifError(error);
        Test.findOne(function(error, doc) {
          assert.ifError(error);
          doc.name = null;
          doc.$ignore('name');
          doc.save(function(error) {
            assert.ifError(error);
            Test.findById(doc._id, function(error, doc) {
              assert.ifError(error);
              assert.equal(doc.name, 'val');
              done();
            });
          });
        });
      });
    });

    it('composite _ids (gh-4542)', function(done) {
      var schema = new Schema({
        _id: {
          key1: String,
          key2: String
        },
        content: String
      }, { retainKeyOrder: true });

      var Model = db.model('gh4542', schema);

      var object = new Model();
      object._id = {key1: 'foo', key2: 'bar'};
      object.save().
        then(function(obj) {
          obj.content = 'Hello';
          return obj.save();
        }).
        then(function(obj) {
          return Model.findOne({ _id: obj._id });
        }).
        then(function(obj) {
          assert.equal(obj.content, 'Hello');
          done();
        }).
        catch(done);
    });

    it('validateSync with undefined and conditional required (gh-4607)', function(done) {
      var schema = new mongoose.Schema({
        type: mongoose.SchemaTypes.Number,
        conditional: {
          type: mongoose.SchemaTypes.String,
          required: function() {
            return this.type === 1;
          },
          maxlength: 128
        }
      });

      var Model = db.model('gh4607', schema);

      assert.doesNotThrow(function() {
        new Model({
          type: 2,
          conditional: void 0
        }).validateSync();
      });

      done();
    });

    it('conditional required on single nested (gh-4663)', function(done) {
      var called = 0;
      var childSchema = new Schema({
        name: String
      });
      var schema = new Schema({
        child: {
          type: childSchema,
          required: function() {
            assert.equal(this.child.name, 'test');
            ++called;
          }
        }
      });

      var M = db.model('gh4663', schema);

      new M({ child: { name: 'test' } }).validateSync();
      done();
    });

    it('setting full path under single nested schema works (gh-4578) (gh-4528)', function(done) {
      var ChildSchema = new mongoose.Schema({
        age: Number
      });

      var ParentSchema = new mongoose.Schema({
        age: Number,
        family: {
          child: ChildSchema
        }
      });

      var M = db.model('gh4578', ParentSchema);

      M.create({ age: 45 }, function(error, doc) {
        assert.ifError(error);
        assert.ok(!doc.family.child);
        doc.set('family.child.age', 15);
        assert.ok(doc.family.child.schema);
        assert.ok(doc.isModified('family.child'));
        assert.ok(doc.isModified('family.child.age'));
        assert.equal(doc.family.child.toObject().age, 15);
        done();
      });
    });

    it('setting a nested path retains nested modified paths (gh-5206)', function(done) {
      var testSchema = new mongoose.Schema({
        name: String,
        surnames: {
          docarray: [{ name: String }]
        }
      });

      var Cat = db.model('gh5206', testSchema);

      var kitty = new Cat({
        name: 'Test',
        surnames: {
          docarray: [{ name: 'test1' }, { name: 'test2' }]
        }
      });

      kitty.save(function(error) {
        assert.ifError(error);

        kitty.surnames = {
          docarray: [{ name: 'test1' }, { name: 'test2' }, { name: 'test3' }]
        };

        assert.deepEqual(kitty.modifiedPaths(),
          ['surnames', 'surnames.docarray']);
        done();
      });
    });

    it('toObject() does not depopulate top level (gh-3057)', function(done) {
      var Cat = db.model('gh3057', { name: String });
      var Human = db.model('gh3057_0', {
        name: String,
        petCat: { type: mongoose.Schema.Types.ObjectId, ref: 'gh3057' }
      });

      var kitty = new Cat({ name: 'Zildjian' });
      var person = new Human({ name: 'Val', petCat: kitty });

      assert.equal(kitty.toObject({ depopulate: true }).name, 'Zildjian');
      assert.ok(!person.toObject({ depopulate: true }).petCat.name);
      done();
    });

    it('single nested doc conditional required (gh-4654)', function(done) {
      var ProfileSchema = new Schema({
        firstName: String,
        lastName: String
      });

      function validator() {
        assert.equal(this.email, 'test');
        return true;
      }

      var UserSchema = new Schema({
        email: String,
        profile: {
          type: ProfileSchema,
          required: [validator, 'profile required']
        }
      });

      var User = db.model('gh4654', UserSchema);
      User.create({ email: 'test' }, function(error) {
        assert.equal(error.errors['profile'].message, 'profile required');
        done();
      });
    });

    it('handles setting single nested schema to equal value (gh-4676)', function(done) {
      var companySchema = new mongoose.Schema({
        _id: false,
        name: String,
        description: String
      });

      var userSchema = new mongoose.Schema({
        name:  String,
        company: companySchema
      });

      var User = db.model('gh4676', userSchema);

      var user = new User({ company: { name: 'Test' } });
      user.save(function(error) {
        assert.ifError(error);
        user.company.description = 'test';
        assert.ok(user.isModified('company'));
        user.company = user.company;
        assert.ok(user.isModified('company'));
        done();
      });
    });

    it('handles setting single nested doc to null after setting (gh-4766)', function(done) {
      var EntitySchema = new Schema({
        company: {
          type: String,
          required: true
        },
        name: {
          type: String,
          required: false
        },
        email: {
          type: String,
          required: false
        }
      }, { _id: false, id: false });

      var ShipmentSchema = new Schema({
        entity: {
          shipper: {
            type: EntitySchema,
            required: false
          },
          manufacturer: {
            type: EntitySchema,
            required: false
          }
        }
      });

      var Shipment = db.model('gh4766', ShipmentSchema);
      var doc = new Shipment({
        entity: {
          shipper: null,
          manufacturer: {
            company: 'test',
            name: 'test',
            email: 'test@email'
          }
        }
      });

      doc.save().
        then(function() { return Shipment.findById(doc._id); }).
        then(function(shipment) {
          shipment.entity = shipment.entity;
          shipment.entity.manufacturer = null;
          return shipment.save();
        }).
        then(function() {
          done();
        }).
        catch(done);
    });

    it('buffers with subtypes as ids (gh-4506)', function(done) {
      var uuid = require('uuid');

      var UserSchema = new mongoose.Schema({
        _id: {
          type: Buffer,
          default: function() {
            return mongoose.Types.Buffer(uuid.parse(uuid.v4())).toObject(4);
          },
          unique: true,
          required: true
        },
        email: {
          type: String,
          unique: true,
          lowercase: true,
          required: true
        },
        name: String
      });

      var User = db.model('gh4506', UserSchema);

      var user = new User({
        email: 'me@email.com',
        name: 'My name'
      });

      user.save().
        then(function() {
          return User.findOne({ email: 'me@email.com' });
        }).
        then(function(user) {
          user.name = 'other';
          return user.save();
        }).
        then(function() {
          return User.findOne({ email: 'me@email.com' });
        }).
        then(function(doc) {
          assert.equal(doc.name, 'other');
          done();
        }).
        catch(done);
    });

    it('embedded docs dont mark parent as invalid (gh-4681)', function(done) {
      var NestedSchema = new mongoose.Schema({
        nestedName: { type: String, required: true },
        createdAt: { type: Date, required: true }
      });
      var RootSchema = new mongoose.Schema({
        rootName:  String,
        nested: { type: [ NestedSchema ] }
      });

      var Root = db.model('gh4681', RootSchema);
      var root = new Root({ rootName: 'root', nested: [ { } ] });
      root.save(function(error) {
        assert.ok(error);
        assert.deepEqual(Object.keys(error.errors).sort(),
          ['nested.0.createdAt', 'nested.0.nestedName']);
        done();
      });
    });

    it('should depopulate the shard key when saving (gh-4658)', function(done) {
      var ChildSchema = new mongoose.Schema({
        name: String
      });

      var ChildModel = db.model('gh4658', ChildSchema);

      var ParentSchema = new mongoose.Schema({
        name: String,
        child: { type: Schema.Types.ObjectId, ref: 'gh4658' }
      }, {shardKey: {child: 1, _id: 1}});

      var ParentModel = db.model('gh4658_0', ParentSchema);

      ChildModel.create({ name: 'Luke' }).
        then(function(child) {
          var p = new ParentModel({ name: 'Vader' });
          p.child = child;
          return p.save();
        }).
        then(function(p) {
          p.name = 'Anakin';
          return p.save();
        }).
        then(function(p) {
          return ParentModel.findById(p);
        }).
        then(function(doc) {
          assert.equal(doc.name, 'Anakin');
          done();
        }).
        catch(done);
    });

    it('handles setting virtual subpaths (gh-4716)', function(done) {
      var childSchema = new Schema({
        name: { type: String, default: 'John' },
        favorites: {
          color: {
            type: String,
            default: 'Blue'
          }
        }
      });

      var parentSchema = new Schema({
        name: { type: String },
        children: {
          type: [childSchema],
          default: [{}]
        }
      });

      parentSchema.virtual('favorites').set(function(v) {
        return this.children[0].set('favorites', v);
      }).get(function() {
        return this.children[0].get('favorites');
      });

      var Parent = db.model('gh4716', parentSchema);
      var p = new Parent({ name: 'Anakin' });
      p.set('children.0.name', 'Leah');
      p.set('favorites.color', 'Red');
      assert.equal(p.children[0].favorites.color, 'Red');
      done();
    });

    it('handles selected nested elements with defaults (gh-4739)', function(done) {
      var userSchema = new Schema({
        preferences: {
          sleep: { type: Boolean, default: false },
          test: { type: Boolean, default: true }
        },
        name: String
      });

      var User = db.model('User', userSchema);

      var user = { name: 'test' };
      User.collection.insertOne(user, function(error) {
        assert.ifError(error);
        User.findById(user, { 'preferences.sleep': 1, name: 1 }, function(error, user) {
          assert.ifError(error);
          assert.strictEqual(user.preferences.sleep, false);
          assert.ok(!user.preferences.test);
          done();
        });
      });
    });

    it('handles mark valid in subdocs correctly (gh-4778)', function(done) {
      var SubSchema = new mongoose.Schema({
        field: {
          nestedField: {
            type: mongoose.Schema.ObjectId,
            required: false
          }
        }
      }, { _id: false, id: false });

      var Model2Schema = new mongoose.Schema({
        sub: {
          type: SubSchema,
          required: false
        }
      });
      var Model2 = db.model('gh4778', Model2Schema);

      var doc = new Model2({
        sub: {}
      });

      doc.sub.field.nestedField = { };
      doc.sub.field.nestedField = '574b69d0d9daf106aaa62974';
      assert.ok(!doc.validateSync());
      done();
    });

    it('timestamps with nested paths (gh-5051)', function(done) {
      var schema = new Schema({ props: Object }, {
        timestamps: {
          createdAt: 'props.createdAt',
          updatedAt: 'props.updatedAt'
        }
      });

      var M = db.model('gh5051', schema);
      var now = Date.now();
      M.create({}, function(error, doc) {
        assert.ok(doc.props.createdAt);
        assert.ok(doc.props.createdAt instanceof Date);
        assert.ok(doc.props.createdAt.valueOf() >= now);
        assert.ok(doc.props.updatedAt);
        assert.ok(doc.props.updatedAt instanceof Date);
        assert.ok(doc.props.updatedAt.valueOf() >= now);
        done();
      });
    });

    it('supports $where in pre save hook (gh-4004)', function(done) {
      var Promise = global.Promise;

      var schema = new Schema({
        name: String
      }, { timestamps: true, versionKey: null, saveErrorIfNotFound: true });

      schema.pre('save', function(next) {
        this.$where = { updatedAt: this.updatedAt };
        next();
      });

      schema.post('save', function(error, res, next) {
        if (error instanceof MongooseError.DocumentNotFoundError) {
          error = new Error('Somebody else updated the document!');
        }
        next(error);
      });

      var MyModel = db.model('gh4004', schema);

      MyModel.create({ name: 'test' }).
        then(function() {
          return Promise.all([
            MyModel.findOne(),
            MyModel.findOne()
          ]);
        }).
        then(function(docs) {
          docs[0].name = 'test2';
          return Promise.all([
            docs[0].save(),
            Promise.resolve(docs[1])
          ]);
        }).
        then(function(docs) {
          docs[1].name = 'test3';
          return docs[1].save();
        }).
        then(function() {
          done(new Error('Should not get here'));
        }).
        catch(function(error) {
          assert.equal(error.message, 'Somebody else updated the document!');
          done();
        });
    });

    it('toObject() with buffer and minimize (gh-4800)', function(done) {
      var TestSchema = new mongoose.Schema({ buf: Buffer }, {
        toObject: {
          virtuals: true,
          getters: true
        }
      });

      var Test = db.model('gh4800', TestSchema);

      Test.create({ buf: new Buffer('abcd') }).
        then(function(doc) {
          return Test.findById(doc._id);
        }).
        then(function(doc) {
          // Should not throw
          require('util').inspect(doc);
          done();
        }).
        catch(done);
    });

    it('runs validate hooks on single nested subdocs if not directly modified (gh-3884)', function(done) {
      var childSchema = new Schema({
        name: { type: String },
        friends: [{ type: String }]
      });
      var count = 0;

      childSchema.pre('validate', function(next) {
        ++count;
        next();
      });

      var parentSchema = new Schema({
        name: { type: String },
        child: childSchema
      });

      var Parent = db.model('gh3884', parentSchema);

      var p = new Parent({
        name: 'Mufasa',
        child: {
          name: 'Simba',
          friends: ['Pumbaa', 'Timon', 'Nala']
        }
      });

      p.save().
        then(function(p) {
          assert.equal(count, 1);
          p.child.friends.push('Rafiki');
          return p.save();
        }).
        then(function() {
          assert.equal(count, 2);
          done();
        }).
        catch(done);
    });

    it('does not overwrite when setting nested (gh-4793)', function(done) {
      var grandchildSchema = new mongoose.Schema();
      grandchildSchema.method({
        foo: function() { return 'bar'; }
      });
      var Grandchild = db.model('gh4793_0', grandchildSchema);

      var childSchema = new mongoose.Schema({
        grandchild: grandchildSchema
      });
      var Child = mongoose.model('gh4793_1', childSchema);

      var parentSchema = new mongoose.Schema({
        children: [childSchema]
      });
      var Parent = mongoose.model('gh4793_2', parentSchema);

      var grandchild = new Grandchild();
      var child = new Child({grandchild: grandchild});

      assert.equal(child.grandchild.foo(), 'bar');

      var p = new Parent({children: [child]});

      assert.equal(child.grandchild.foo(), 'bar');
      assert.equal(p.children[0].grandchild.foo(), 'bar');
      done();
    });

    it('setting to discriminator (gh-4935)', function(done) {
      var Buyer = db.model('gh4935_0', new Schema({
        name: String,
        vehicle: { type: Schema.Types.ObjectId, ref: 'gh4935' }
      }));
      var Vehicle = db.model('gh4935', new Schema({ name: String }));
      var Car = Vehicle.discriminator('gh4935_1', new Schema({
        model: String
      }));

      var eleanor = new Car({ name: 'Eleanor', model: 'Shelby Mustang GT' });
      var nick = new Buyer({ name: 'Nicolas', vehicle: eleanor });

      assert.ok(!!nick.vehicle);
      assert.ok(nick.vehicle === eleanor);
      assert.ok(nick.vehicle instanceof Car);
      assert.equal(nick.vehicle.name, 'Eleanor');

      done();
    });

    it('handles errors in sync validators (gh-2185)', function(done) {
      var schema = new Schema({
        name: {
          type: String,
          validate: function() {
            throw new Error('woops!');
          }
        }
      });

      var M = db.model('gh2185', schema);

      var error = (new M({ name: 'test' })).validateSync();
      assert.ok(error);
      assert.equal(error.errors['name'].reason.message, 'woops!');

      new M({ name: 'test'}).validate(function(error) {
        assert.ok(error);
        assert.equal(error.errors['name'].reason.message, 'woops!');
        done();
      });
    });

    it('allows hook as a schema key (gh-5047)', function(done) {
      var schema = new mongoose.Schema({
        name: String,
        hook: { type: String }
      });

      var Model = db.model('Model', schema);

      Model.create({ hook: 'test '}, function(error) {
        assert.ifError(error);
        done();
      });
    });

    it('save errors with callback and promise work (gh-5216)', function(done) {
      var schema = new mongoose.Schema({});

      var Model = db.model('gh5216', schema);

      var _id = new mongoose.Types.ObjectId();
      var doc1 = new Model({ _id: _id });
      var doc2 = new Model({ _id: _id });

      Model.on('error', function(error) {
        done(error);
      });

      doc1.save().
        then(function() { return doc2.save(function() {}); }).
        catch(function(error) {
          assert.ok(error);
          done();
        });
    });

    it('post hooks on child subdocs run after save (gh-5085)', function(done) {
      var ChildModelSchema = new mongoose.Schema({
        text: {
          type: String
        }
      });
      ChildModelSchema.post('save', function(doc) {
        doc.text = 'bar';
      });
      var ParentModelSchema = new mongoose.Schema({
        children: [ChildModelSchema]
      });

      var Model = db.model('gh5085', ParentModelSchema);

      Model.create({ children: [{ text: 'test' }] }, function(error) {
        assert.ifError(error);
        Model.findOne({}, function(error, doc) {
          assert.ifError(error);
          assert.equal(doc.children.length, 1);
          assert.equal(doc.children[0].text, 'test');
          done();
        });
      });
    });

    it('nested docs toObject() clones (gh-5008)', function(done) {
      var schema = new mongoose.Schema({
        sub: {
          height: Number
        }
      });

      var Model = db.model('gh5008', schema);

      var doc = new Model({
        sub: {
          height: 3
        }
      });

      assert.equal(doc.sub.height, 3);

      var leanDoc = doc.sub.toObject();
      assert.equal(leanDoc.height, 3);

      doc.sub.height = 55;
      assert.equal(doc.sub.height, 55);
      assert.equal(leanDoc.height, 3);

      done();
    });

    it('toObject() with null (gh-5143)', function(done) {
      var schema = new mongoose.Schema({
        customer: {
          name: { type: String, required: false }
        }
      });

      var Model = db.model('gh5143', schema);

      var model = new Model();
      model.customer = null;
      assert.strictEqual(model.toObject().customer, null);
      assert.strictEqual(model.toObject({ getters: true }).customer, null);

      done();
    });

    it('handles array subdocs with single nested subdoc default (gh-5162)', function(done) {
      var RatingsItemSchema = new mongoose.Schema({
        value: Number
      }, { versionKey: false, _id: false });

      var RatingsSchema = new mongoose.Schema({
        ratings: {
          type: RatingsItemSchema,
          default: { id: 1, value: 0 }
        },
        _id: false
      });

      var RestaurantSchema = new mongoose.Schema({
        menu: {
          type: [RatingsSchema]
        }
      });

      var Restaurant = db.model('gh5162', RestaurantSchema);

      // Should not throw
      var r = new Restaurant();
      assert.deepEqual(r.toObject().menu, []);
      done();
    });

    it('iterating through nested doc keys (gh-5078)', function(done) {
      var schema = new Schema({
        nested: {
          test1: String,
          test2: String
        }
      }, { retainKeyOrder: true });

      schema.virtual('tests').get(function() {
        return _.map(this.nested, function(v) {
          return v;
        });
      });

      var M = db.model('gh5078', schema);

      var doc = new M({ nested: { test1: 'a', test2: 'b' } });

      assert.deepEqual(doc.toObject({ virtuals: true }).tests, ['a', 'b']);

      // Should not throw
      require('util').inspect(doc);
      JSON.stringify(doc);

      done();
    });

    it('deeply nested virtual paths (gh-5250)', function(done) {
      var TestSchema = new Schema({});
      TestSchema.
        virtual('a.b.c').
        get(function() {
          return this.v;
        }).
        set(function(value) {
          this.v = value;
        });

      var TestModel = db.model('gh5250', TestSchema);
      var t = new TestModel({'a.b.c': 5});
      assert.equal(t.a.b.c, 5);

      done();
    });

    it('JSON.stringify nested errors (gh-5208)', function(done) {
      var AdditionalContactSchema = new Schema({
        contactName: {
          type: String,
          required: true
        },
        contactValue: {
          type: String,
          required: true
        }
      });

      var ContactSchema = new Schema({
        name: {
          type: String,
          required: true
        },
        email: {
          type: String,
          required: true
        },
        additionalContacts: [AdditionalContactSchema]
      });

      var EmergencyContactSchema = new Schema({
        contactName: {
          type: String,
          required: true
        },
        contact: ContactSchema
      });

      var EmergencyContact =
        db.model('EmergencyContact', EmergencyContactSchema);

      var contact = new EmergencyContact({
        contactName: 'Electrical Service',
        contact: {
          name: 'John Smith',
          email: 'john@gmail.com',
          additionalContacts: [
            {
              contactName: 'skype'
              // Forgotten value
            }
          ]
        }
      });
      contact.validate(function(error) {
        assert.ok(error);
        assert.ok(error.errors['contact']);
        assert.ok(error.errors['contact.additionalContacts.0.contactValue']);

        // This `JSON.stringify()` should not throw
        assert.ok(JSON.stringify(error).indexOf('contactValue') !== -1);
        done();
      });
    });

    it('handles errors in subdoc pre validate (gh-5215)', function(done) {
      var childSchema = new mongoose.Schema({});

      childSchema.pre('validate', function(next) {
        next(new Error('child pre validate'));
      });

      var parentSchema = new mongoose.Schema({
        child: childSchema
      });

      var Parent = db.model('gh5215', parentSchema);

      Parent.create({ child: {} }, function(error) {
        assert.ok(error);
        assert.ok(error.errors['child']);
        assert.equal(error.errors['child'].message, 'child pre validate');
        done();
      });
    });

    it('saving a doc with nested string array (gh-5282)', function(done) {
      var testSchema = new mongoose.Schema({
        strs: [[String]]
      });

      var Test = db.model('gh5282', testSchema);

      var t = new Test({
        strs: [['a', 'b']]
      });

      t.save(function(error, t) {
        assert.ifError(error);
        assert.deepEqual(t.toObject().strs, [['a', 'b']]);
        done();
      });
    });

    it('null _id (gh-5236)', function(done) {
      var childSchema = new mongoose.Schema({});

      var M = db.model('gh5236', childSchema);

      var m = new M({ _id: null });
      assert.ok(m._id);
      done();
    });

    it('setting populated path with typeKey (gh-5313)', function(done) {
      var personSchema = Schema({
        name: {$type: String},
        favorite: { $type: Schema.Types.ObjectId, ref: 'gh5313' },
        books: [{ $type: Schema.Types.ObjectId, ref: 'gh5313' }]
      }, { typeKey: '$type' });

      var bookSchema = Schema({
        title: String
      });

      var Book = mongoose.model('gh5313', bookSchema);
      var Person = mongoose.model('gh5313_0', personSchema);

      var book1 = new Book({ title: 'The Jungle Book' });
      var book2 = new Book({ title: '1984' });

      var person = new Person({
        name: 'Bob',
        favorite: book1,
        books: [book1, book2]
      });

      assert.equal(person.books[0].title, 'The Jungle Book');
      assert.equal(person.books[1].title, '1984');

      done();
    });

    it('save twice with write concern (gh-5294)', function(done) {
      var schema = new mongoose.Schema({
        name: String
      }, {
        safe: {
          w: 'majority',
          wtimeout: 1e4
        }
      });

      var M = db.model('gh5294', schema);

      M.create({ name: 'Test' }, function(error, doc) {
        assert.ifError(error);
        doc.name = 'test2';
        doc.save(function(error) {
          assert.ifError(error);
          done();
        });
      });
    });

    it('undefined field with conditional required (gh-5296)', function(done) {
      var schema = Schema({
        name: {
          type: String,
          maxlength: 63,
          required: function() {
            return false;
          }
        }
      });

      var Model = db.model('gh5296', schema);

      Model.create({ name: undefined }, function(error) {
        assert.ifError(error);
        done();
      });
    });

    it('modify multiple subdoc paths (gh-4405)', function(done) {
      var ChildObjectSchema = new Schema({
        childProperty1: String,
        childProperty2: String,
        childProperty3: String
      });

      var ParentObjectSchema = new Schema({
        parentProperty1: String,
        parentProperty2: String,
        child: ChildObjectSchema
      });

      var Parent = db.model('gh4405', ParentObjectSchema);

      var p = new Parent({
        parentProperty1: 'abc',
        parentProperty2: '123',
        child: {
          childProperty1: 'a',
          childProperty2: 'b',
          childProperty3: 'c'
        }
      });
      p.save(function(error) {
        assert.ifError(error);
        Parent.findById(p._id, function(error, p) {
          assert.ifError(error);
          p.parentProperty1 = 'foo';
          p.parentProperty2 = 'bar';
          p.child.childProperty1 = 'ping';
          p.child.childProperty2 = 'pong';
          p.child.childProperty3 = 'weee';
          p.save(function(error) {
            assert.ifError(error);
            Parent.findById(p._id, function(error, p) {
              assert.ifError(error);
              assert.equal(p.child.childProperty1, 'ping');
              assert.equal(p.child.childProperty2, 'pong');
              assert.equal(p.child.childProperty3, 'weee');
              done();
            });
          });
        });
      });
    });
  });
});
