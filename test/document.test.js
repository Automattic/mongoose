'use strict';

/**
 * Module dependencies.
 */

const start = require('./common');

const Document = require('../lib/document');
const EventEmitter = require('events').EventEmitter;
const EmbeddedDocument = require('../lib/types/embedded');
const Query = require('../lib/query');
const assert = require('assert');
const co = require('co');
const random = require('../lib/utils').random;
const utils = require('../lib/utils');
const validator = require('validator');
const Buffer = require('safe-buffer').Buffer;

const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;
const DocumentObjectId = mongoose.Types.ObjectId;
const SchemaType = mongoose.SchemaType;
const ValidatorError = SchemaType.ValidatorError;
const ValidationError = mongoose.Document.ValidationError;
const MongooseError = mongoose.Error;

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

for (const i in EventEmitter.prototype) {
  TestDocument[i] = EventEmitter.prototype[i];
}

/**
 * Set a dummy schema to simulate compilation.
 */

const em = new Schema({title: String, body: String});
em.virtual('works').get(function() {
  return 'em virtual works';
});
const schema = new Schema({
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

let dateSetterCalled = false;
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

const childSchema = new Schema({counter: Number});

const parentSchema = new Schema({
  name: String,
  children: [childSchema]
});

/**
 * Test.
 */

describe('document', function() {
  let db;

  before(function() {
    db = start();
  });

  after(function(done) {
    db.close(done);
  });

  describe('constructor', function() {
    it('supports passing in schema directly (gh-8237)', function() {
      const myUserDoc = new Document({}, { name: String });
      assert.ok(!myUserDoc.name);
      myUserDoc.name = 123;
      assert.strictEqual(myUserDoc.name, '123');

      assert.ifError(myUserDoc.validateSync());
    });
  });

  describe('delete', function() {
    it('deletes the document', function() {
      const schema = new Schema({ x: String });
      const Test = db.model('gh6940', schema);
      return co(function* () {
        const test = new Test({ x: 'test' });
        const doc = yield test.save();
        yield doc.delete();
        const found = yield Test.findOne({ _id: doc._id });
        assert.strictEqual(found, null);
      });
    });
  });

  describe('updateOne', function() {
    let Test;

    before(function() {
      const schema = new Schema({ x: String, y: String });
      Test = db.model('gh6940_2', schema);
    });

    it('updates the document', function() {
      return co(function* () {
        const test = new Test({ x: 'test' });
        const doc = yield test.save();
        yield doc.updateOne({ y: 'test' });
        const found = yield Test.findOne({ _id: doc._id });
        assert.strictEqual(found.y, 'test');
      });
    });

    it('returns a query', function() {
      const doc = new Test({ x: 'test' });
      assert.ok(doc.updateOne() instanceof Test.Query);
    });
  });

  describe('replaceOne', function() {
    it('replaces the document', function() {
      const schema = new Schema({ x: String });
      const Test = db.model('gh6940_3', schema);
      return co(function* () {
        const test = new Test({ x: 'test' });
        const doc = yield test.save();
        yield doc.replaceOne({ x: 'updated' });
        const found = yield Test.findOne({ _id: doc._id });
        assert.strictEqual(found.x, 'updated');
      });
    });
  });

  describe('shortcut getters', function() {
    it('return undefined for properties with a null/undefined parent object (gh-1326)', function(done) {
      const doc = new TestDocument;
      doc.init({nested: null});
      assert.strictEqual(undefined, doc.nested.age);
      done();
    });

    it('work', function(done) {
      const doc = new TestDocument();
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
      assert.equal(doc.$__getValue('nested.setr'), 'set it setter');

      const doc2 = new TestDocument();
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
    const doc = new TestDocument();

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
    const doc = new TestDocument();
    assert.ok(doc._id instanceof DocumentObjectId);
    done();
  });

  it('test shortcut of id hexString', function(done) {
    const doc = new TestDocument();
    assert.equal(typeof doc.id, 'string');
    done();
  });

  it('toObject options', function(done) {
    const doc = new TestDocument();

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

    let clone = doc.toObject({getters: true, virtuals: false});

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
    const out = {myid: doc._id.toString()};
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
    const schema = new Schema({
      name: String,
      places: [{type: ObjectId, ref: 'toObject-transform-places'}]
    });

    const schemaPlaces = new Schema({
      identity: String
    });

    schemaPlaces.set('toObject', {
      transform: function(doc, ret) {
        // here should be only toObject-transform-places documents
        assert.equal(doc.constructor.modelName, 'toObject-transform-places');
        return ret;
      }
    });

    const Test = db.model('toObject-transform', schema);
    const Places = db.model('toObject-transform-places', schemaPlaces);

    Places.create({identity: 'a'}, {identity: 'b'}, {identity: 'c'}, function(err, a, b, c) {
      Test.create({name: 'chetverikov', places: [a, b, c]}, function(err) {
        assert.ifError(err);
        Test.findOne({}).populate('places').exec(function(err, docs) {
          assert.ifError(err);

          docs.toObject({transform: true});

          done();
        });
      });
    });
  });

  it('disabling aliases in toObject options (gh-7548)', function() {
    const schema = new mongoose.Schema({
      name: {
        type: String,
        alias: 'nameAlias'
      },
      age: Number
    });
    schema.virtual('answer').get(() => 42);

    const Model = db.model('gh7548', schema);

    const doc = new Model({ name: 'Jean-Luc Picard', age: 59 });

    let obj = doc.toObject({ virtuals: true });
    assert.equal(obj.nameAlias, 'Jean-Luc Picard');
    assert.equal(obj.answer, 42);

    obj = doc.toObject({ virtuals: true, aliases: false });
    assert.ok(!obj.nameAlias);
    assert.equal(obj.answer, 42);
  });

  it('saves even if `_id` is null (gh-6406)', function() {
    const schema = new Schema({ _id: Number, val: String });
    const Model = db.model('gh6406', schema);

    return co(function*() {
      yield Model.updateOne({ _id: null }, { val: 'test' }, { upsert: true });

      let doc = yield Model.findOne();

      doc.val = 'test2';

      // Should not throw
      yield doc.save();

      doc = yield Model.findOne();
      assert.strictEqual(doc._id, null);
      assert.equal(doc.val, 'test2');
    });
  });

  it('allows you to skip validation on save (gh-2981)', function() {
    const schema = new Schema({ name: { type: String, required: true } });
    const MyModel = db.model('gh2981', schema);

    const doc = new MyModel();
    return doc.save({ validateBeforeSave: false });
  });

  it('doesnt use custom toObject options on save', function(done) {
    const schema = new Schema({
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
    const Test = db.model('TestToObject', schema);

    Test.create({name: 'chetverikov', iWillNotBeDelete: true, 'nested.iWillNotBeDeleteToo': true}, function(err) {
      assert.ifError(err);
      Test.findOne({}, function(err, doc) {
        assert.ifError(err);

        assert.equal(doc._doc.iWillNotBeDelete, true);
        assert.equal(doc._doc.nested.iWillNotBeDeleteToo, true);

        done();
      });
    });
  });

  describe('toObject', function() {
    it('does not apply toObject functions of subdocuments to root document', function(done) {
      const subdocSchema = new Schema({
        test: String,
        wow: String
      });

      subdocSchema.options.toObject = {};
      subdocSchema.options.toObject.transform = function(doc, ret) {
        delete ret.wow;
      };

      const docSchema = new Schema({
        foo: String,
        wow: Boolean,
        sub: [subdocSchema]
      });

      const Doc = db.model('Doc', docSchema);

      Doc.create({
        foo: 'someString',
        wow: true,
        sub: [{
          test: 'someOtherString',
          wow: 'thisIsAString'
        }]
      }, function(err, doc) {
        const obj = doc.toObject({
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
      const userSchema = new Schema({
        name: String,
        email: String
      });
      const topicSchema = new Schema({
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

      const Topic = db.model('gh2691', topicSchema, 'gh2691');

      const topic = new Topic({
        title: 'Favorite Foods',
        email: 'a@b.co',
        followers: [{name: 'Val', email: 'val@test.co'}]
      });

      const output = topic.toObject({transform: true});
      assert.equal(output.title, 'favorite foods');
      assert.equal(output.email, 'a@b.co');
      assert.equal(output.followers[0].name, 'Val');
      assert.equal(output.followers[0].email, undefined);
      done();
    });

    it('doesnt clobber child schema options when called with no params (gh-2035)', function(done) {
      const userSchema = new Schema({
        firstName: String,
        lastName: String,
        password: String
      });

      userSchema.virtual('fullName').get(function() {
        return this.firstName + ' ' + this.lastName;
      });

      userSchema.set('toObject', {virtuals: false});

      const postSchema = new Schema({
        owner: {type: Schema.Types.ObjectId, ref: 'gh-2035-user'},
        content: String
      });

      postSchema.virtual('capContent').get(function() {
        return this.content.toUpperCase();
      });

      postSchema.set('toObject', {virtuals: true});
      const User = db.model('gh-2035-user', userSchema, 'gh-2035-user');
      const Post = db.model('gh-2035-post', postSchema, 'gh-2035-post');

      const user = new User({firstName: 'Joe', lastName: 'Smith', password: 'password'});

      user.save(function(err, savedUser) {
        assert.ifError(err);
        const post = new Post({owner: savedUser._id, content: 'lorem ipsum'});
        post.save(function(err, savedPost) {
          assert.ifError(err);
          Post.findById(savedPost._id).populate('owner').exec(function(err, newPost) {
            assert.ifError(err);
            const obj = newPost.toObject();
            assert.equal(obj.owner.fullName, undefined);
            done();
          });
        });
      });
    });
  });

  describe('toJSON', function() {
    it('toJSON options', function(done) {
      const doc = new TestDocument();

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
      const path = TestDocument.prototype.schema.path('em');
      path.casterConstructor.prototype.toJSON = function() {
        return {};
      };

      doc.schema.options.toJSON = {virtuals: true};
      let clone = doc.toJSON();
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
      const arr = [doc];
      let err = false;
      let str;
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
      const out = {myid: doc._id.toString()};
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
      const doc = new TestDocument({test: 'woot'});
      const oidString = doc._id.toString();
      // convert to json string
      const json = JSON.stringify(doc);
      // parse again
      const obj = JSON.parse(json);

      assert.equal(obj.test, 'woot');
      assert.equal(obj._id, oidString);
      done();
    });

    it('jsonifying an object\'s populated items works (gh-1376)', function(done) {
      const userSchema = new Schema({name: String});
      // includes virtual path when 'toJSON'
      userSchema.set('toJSON', {getters: true});
      userSchema.virtual('hello').get(function() {
        return 'Hello, ' + this.name;
      });
      const User = db.model('gh1376_User', userSchema);

      const groupSchema = new Schema({
        name: String,
        _users: [{type: Schema.ObjectId, ref: 'gh1376_User'}]
      });

      const Group = db.model('gh1376_Group', groupSchema);

      User.create({name: 'Alice'}, {name: 'Bob'}, function(err, alice, bob) {
        assert.ifError(err);

        Group.create({name: 'mongoose', _users: [alice, bob]}, function(err, group) {
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
    it('inspect inherits schema options (gh-4001)', function(done) {
      const opts = {
        toObject: { virtuals: true },
        toJSON: { virtuals: true }
      };
      const taskSchema = mongoose.Schema({
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

      const Task = db.model('gh4001', taskSchema);

      const doc = { name: 'task1', title: 'task999' };
      Task.collection.insertOne(doc, function(error) {
        assert.ifError(error);
        Task.findById(doc._id, function(error, doc) {
          assert.ifError(error);
          assert.equal(doc.inspect().title, 'task1');
          done();
        });
      });
    });

    it('does not apply transform to populated docs (gh-4213)', function(done) {
      const UserSchema = new Schema({
        name: String
      });

      const PostSchema = new Schema({
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

      const User = db.model('gh4213', UserSchema);
      const Post = db.model('gh4213_0', PostSchema);

      const val = new User({ name: 'Val' });
      const post = new Post({ title: 'Test', postedBy: val._id });

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

    it('populate on nested path (gh-5703)', function() {
      const toySchema = new mongoose.Schema({ color: String });
      const Toy = db.model('gh5703', toySchema);

      const childSchema = new mongoose.Schema({
        name: String,
        values: {
          toy: { type: mongoose.Schema.Types.ObjectId, ref: 'gh5703' }
        }
      });
      const Child = db.model('gh5703_0', childSchema);

      return Toy.create({ color: 'blue' }).
        then(function(toy) {
          return Child.create({ values: { toy: toy._id } });
        }).
        then(function(child) {
          return Child.findById(child._id);
        }).
        then(function(child) {
          return child.values.populate('toy').execPopulate().then(function() {
            return child;
          });
        }).
        then(function(child) {
          assert.equal(child.values.toy.color, 'blue');
        });
    });
  });

  describe.skip('#update', function() {
    it('returns a Query', function(done) {
      const mg = new mongoose.Mongoose;
      const M = mg.model('doc#update', {s: String});
      const doc = new M;
      assert.ok(doc.update() instanceof Query);
      done();
    });
    it('calling update on document should relay to its model (gh-794)', function(done) {
      const Docs = new Schema({text: String});
      const docs = db.model('docRelayUpdate', Docs);
      const d = new docs({text: 'A doc'});
      let called = false;
      d.save(function() {
        const oldUpdate = docs.update;
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
          done();
        });
      });
    });
  });

  it('toObject should not set undefined values to null', function(done) {
    const doc = new TestDocument();
    const obj = doc.toObject();

    delete obj._id;
    assert.deepEqual(obj, {numbers: [], oids: [], em: []});
    done();
  });

  describe('Errors', function() {
    it('MongooseErrors should be instances of Error (gh-209)', function(done) {
      const MongooseError = require('../lib/error');
      const err = new MongooseError('Some message');
      assert.ok(err instanceof Error);
      done();
    });
    it('ValidationErrors should be instances of Error', function(done) {
      const ValidationError = Document.ValidationError;
      const err = new ValidationError(new TestDocument);
      assert.ok(err instanceof Error);
      done();
    });
  });

  it('methods on embedded docs should work', function(done) {
    const ESchema = new Schema({name: String});

    ESchema.methods.test = function() {
      return this.name + ' butter';
    };
    ESchema.statics.ten = function() {
      return 10;
    };

    const E = db.model('EmbeddedMethodsAndStaticsE', ESchema);
    const PSchema = new Schema({embed: [ESchema]});
    const P = db.model('EmbeddedMethodsAndStaticsP', PSchema);

    let p = new P({embed: [{name: 'peanut'}]});
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
    const doc = new TestDocument;
    doc.init({numbers: [1, 3]});
    assert.equal(doc.numbers[0], 1);
    assert.equal(doc.numbers[1], 3);
    doc.set('numbers.1', 2);
    assert.equal(doc.numbers[0], 1);
    assert.equal(doc.numbers[1], 2);
    done();
  });

  it('no maxListeners warning should occur', function(done) {
    let traced = false;
    const trace = console.trace;

    console.trace = function() {
      traced = true;
      console.trace = trace;
    };

    const schema = new Schema({
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

    const S = db.model('noMaxListeners', schema);

    new S({title: 'test'});
    assert.equal(traced, false);
    done();
  });

  it('unselected required fields should pass validation', function(done) {
    const Tschema = new Schema({
      name: String,
      req: {type: String, required: true}
    });
    const T = db.model('unselectedRequiredFieldValidation', Tschema);

    const t = new T({name: 'teeee', req: 'i am required'});
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
              const invalid = /Path `req` is required./.test(err);
              assert.ok(invalid);
              t.req = 'it works again';
              t.save(function(err) {
                assert.ifError(err);

                T.findById(t).select('_id').exec(function(err, t) {
                  assert.ifError(err);
                  t.save(function(err) {
                    assert.ifError(err);
                    done();
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
    const collection = 'validateschema_' + random();

    it('works (gh-891)', function(done) {
      let schema = null;
      let called = false;

      const validate = [function() {
        called = true;
        return true;
      }, 'BAM'];

      schema = new Schema({
        prop: {type: String, required: true, validate: validate},
        nick: {type: String, required: true}
      });

      const M = db.model('validateSchema', schema, collection);
      const m = new M({prop: 'gh891', nick: 'validation test'});
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
            done();
          });
        });
      });
    });

    it('can return a promise', function(done) {
      let schema = null;

      const validate = [function() {
        return true;
      }, 'BAM'];

      schema = new Schema({
        prop: {type: String, required: true, validate: validate},
        nick: {type: String, required: true}
      });

      const M = db.model('validateSchemaPromise', schema, collection);
      const m = new M({prop: 'gh891', nick: 'validation test'});
      const mBad = new M({prop: 'other'});

      const promise = m.validate();
      promise.then(function() {
        const promise2 = mBad.validate();
        promise2.catch(function(err) {
          assert.ok(!!err);
          clearTimeout(timeout);
          done();
        });
      });

      const timeout = setTimeout(function() {
        db.close();
        throw new Error('Promise not fulfilled!');
      }, 500);
    });

    it('doesnt have stale cast errors (gh-2766)', function(done) {
      const testSchema = new Schema({name: String});
      const M = db.model('gh2766', testSchema);

      const m = new M({_id: 'this is not a valid _id'});
      assert.ok(!m.$isValid('_id'));
      assert.ok(m.validateSync().errors['_id'].name, 'CastError');

      m._id = '000000000000000000000001';
      assert.ok(m.$isValid('_id'));
      assert.ifError(m.validateSync());
      m.validate(function(error) {
        assert.ifError(error);
        done();
      });
    });

    it('cast errors persist across validate() calls (gh-2766)', function(done) {
      const db = start();
      const testSchema = new Schema({name: String});
      const M = db.model('gh2766', testSchema);

      const m = new M({_id: 'this is not a valid _id'});
      assert.ok(!m.$isValid('_id'));
      m.validate(function(error) {
        assert.ok(error);
        assert.equal(error.errors['_id'].name, 'CastError');
        m.validate(function(error) {
          assert.ok(error);
          assert.equal(error.errors['_id'].name, 'CastError');

          const err1 = m.validateSync();
          const err2 = m.validateSync();
          assert.equal(err1.errors['_id'].name, 'CastError');
          assert.equal(err2.errors['_id'].name, 'CastError');
          db.close(done);
        });
      });
    });

    it('returns a promise when there are no validators', function(done) {
      let schema = null;

      schema = new Schema({_id: String});

      const M = db.model('validateSchemaPromise2', schema, collection);
      const m = new M();

      const promise = m.validate();
      promise.then(function() {
        clearTimeout(timeout);
        done();
      });

      const timeout = setTimeout(function() {
        db.close();
        throw new Error('Promise not fulfilled!');
      }, 500);
    });

    describe('works on arrays', function() {
      it('with required', function(done) {
        const schema = new Schema({
          name: String,
          arr: {type: [], required: true}
        });
        const M = db.model('validateSchema-array1', schema, collection);
        const m = new M({name: 'gh1109-1', arr: null});
        m.save(function(err) {
          assert.ok(/Path `arr` is required/.test(err));
          m.arr = null;
          m.save(function(err) {
            assert.ok(/Path `arr` is required/.test(err));
            m.arr = [];
            m.arr.push('works');
            m.save(function(err) {
              assert.ifError(err);
              done();
            });
          });
        });
      });

      it('with custom validator', function(done) {
        let called = false;

        function validator(val) {
          called = true;
          return val && val.length > 1;
        }

        const validate = [validator, 'BAM'];

        const schema = new Schema({
          arr: {type: [], validate: validate}
        });

        const M = db.model('validateSchema-array2', schema, collection);
        const m = new M({name: 'gh1109-2', arr: [1]});
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

        const validate = [validator, 'BAM'];

        const schema = new Schema({
          arr: {type: [], required: true, validate: validate}
        });

        const M = db.model('validateSchema-array3', schema, collection);
        const m = new M({name: 'gh1109-3', arr: null});
        m.save(function(err) {
          assert.equal(err.errors.arr.message, 'Path `arr` is required.');
          m.arr = [{nice: true}];
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
      let count = 0;

      const Control = new Schema({
        test: {
          type: String,
          validate: function(value, done) {
            count++;
            return done(true);
          }
        }
      });
      const PostSchema = new Schema({
        controls: [Control]
      });

      const Post = db.model('post', PostSchema);

      const post = new Post({
        controls: [{
          test: 'xx'
        }]
      });

      post.save(function() {
        assert.equal(count, 1);
        done();
      });
    });

    it('validator should run only once per sub-doc gh-1743', function(done) {
      this.timeout(process.env.TRAVIS ? 8000 : 4500);

      let count = 0;
      const db = start();

      const Control = new Schema({
        test: {
          type: String,
          validate: function(value, done) {
            count++;
            return done(true);
          }
        }
      });
      const PostSchema = new Schema({
        controls: [Control]
      });

      const Post = db.model('post', PostSchema);

      const post = new Post({
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
      let count = 0;
      let startTime, endTime;

      const SchemaWithValidator = new Schema({
        preference: {
          type: String,
          required: true,
          validate: {
            validator: function validator(value, done) {
              count++;
              if (count === 1) startTime = Date.now();
              else if (count === 4) endTime = Date.now();
              setTimeout(done.bind(null, true), 150);
            },
            isAsync: true
          }
        }
      });

      const MWSV = db.model('mwv', new Schema({subs: [SchemaWithValidator]}));
      const m = new MWSV({
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
        assert(endTime - startTime < 150 * 4); // serial >= 150 * 4, parallel < 150 * 4
        done();
      });
    });
  });

  it('#invalidate', function(done) {
    let InvalidateSchema = null;
    let Post = null;
    let post = null;

    InvalidateSchema = new Schema({prop: {type: String}},
      {strict: false});

    mongoose.model('InvalidateSchema', InvalidateSchema);

    Post = db.model('InvalidateSchema');
    post = new Post();
    post.set({baz: 'val'});
    const _err = post.invalidate('baz', 'validation failed for path {PATH}',
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
        assert.strictEqual(err, null);
        done();
      });
    });
  });

  describe('#equals', function() {
    describe('should work', function() {
      let S;
      let N;
      let O;
      let B;
      let M;

      before(function() {
        S = db.model('equals-S', new Schema({_id: String}));
        N = db.model('equals-N', new Schema({_id: Number}));
        O = db.model('equals-O', new Schema({_id: Schema.ObjectId}));
        B = db.model('equals-B', new Schema({_id: Buffer}));
        M = db.model('equals-I', new Schema({name: String}, {_id: false}));
      });

      it('with string _ids', function(done) {
        const s1 = new S({_id: 'one'});
        const s2 = new S({_id: 'one'});
        assert.ok(s1.equals(s2));
        done();
      });
      it('with number _ids', function(done) {
        const n1 = new N({_id: 0});
        const n2 = new N({_id: 0});
        assert.ok(n1.equals(n2));
        done();
      });
      it('with ObjectId _ids', function(done) {
        let id = new mongoose.Types.ObjectId;
        let o1 = new O({_id: id});
        let o2 = new O({_id: id});
        assert.ok(o1.equals(o2));

        id = String(new mongoose.Types.ObjectId);
        o1 = new O({_id: id});
        o2 = new O({_id: id});
        assert.ok(o1.equals(o2));
        done();
      });
      it('with Buffer _ids', function(done) {
        const n1 = new B({_id: 0});
        const n2 = new B({_id: 0});
        assert.ok(n1.equals(n2));
        done();
      });
      it('with _id disabled (gh-1687)', function(done) {
        const m1 = new M;
        const m2 = new M;
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
        const date = 'Thu Aug 16 2012 09:45:59 GMT-0700';
        const d = new TestDocument();
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
      const d = new TestDocument();
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
          let doc = new TestDocument();

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
          doc.set('nested', {path: 'did not overwrite the nested object'}, {
            merge: true
          });
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

        it('allows positional syntax on mixed nested paths (gh-6738)', function() {
          const schema = new Schema({ nested: {} });
          const M = mongoose.model('gh6738', schema);
          const doc = new M({
            'nested.x': 'foo',
            'nested.y': 42,
            'nested.a.b.c': { d: { e: { f: 'g' } } }
          });
          assert.strictEqual(doc.nested.x, 'foo');
          assert.strictEqual(doc.nested.y, 42);
          assert.strictEqual(doc.nested.a.b.c.d.e.f, 'g');
        });

        it('gh-1954', function(done) {
          const schema = new Schema({
            schedule: [new Schema({open: Number, close: Number})]
          });

          const M = mongoose.model('Blog', schema);

          const doc = new M({
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
          const doc = new TestDocument({nested: {age: 35}});
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
      let val;
      let M;

      before(function(done) {
        const schema = new mongoose.Schema({v: Number});
        schema.virtual('thang').set(function(v) {
          val = v;
        });

        M = db.model('gh-1154', schema);
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

    it('passes doc as third param for arrow functions (gh-4143)', function() {
      const schema = new mongoose.Schema({
        name: {
          first: String,
          last: String
        }
      });
      schema.virtual('fullname').
        get((v, virtual, doc) => `${doc.name.first} ${doc.name.last}`).
        set((v, virtual, doc) => {
          const parts = v.split(' ');
          doc.name.first = parts.slice(0, parts.length - 1).join(' ');
          doc.name.last = parts[parts.length - 1];
        });
      const Model = db.model('gh4143', schema);

      const doc = new Model({ name: { first: 'Jean-Luc', last: 'Picard' } });
      assert.equal(doc.fullname, 'Jean-Luc Picard');

      doc.fullname = 'Will Riker';
      assert.equal(doc.name.first, 'Will');
      assert.equal(doc.name.last, 'Riker');
    });
  });

  describe('gh-2082', function() {
    it('works', function(done) {
      const Parent = db.model('gh2082', parentSchema, 'gh2082');

      const parent = new Parent({name: 'Hello'});
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
                done();
              });
            });
          });
        });
      });
    });
  });

  describe('gh-1933', function() {
    it('works', function(done) {
      const M = db.model('gh1933', new Schema({id: String, field: Number}), 'gh1933');

      M.create({}, function(error) {
        assert.ifError(error);
        M.findOne({}, function(error, doc) {
          assert.ifError(error);
          doc.__v = 123;
          doc.field = 5; // .push({ _id: '123', type: '456' });
          doc.save(function(error) {
            assert.ifError(error);
            done();
          });
        });
      });
    });
  });

  describe('gh-1638', function() {
    it('works', function(done) {
      const ItemChildSchema = new mongoose.Schema({
        name: {type: String, required: true, default: 'hello'}
      });

      const ItemParentSchema = new mongoose.Schema({
        children: [ItemChildSchema]
      });

      const ItemParent = db.model('gh-1638-1', ItemParentSchema, 'gh-1638-1');
      const ItemChild = db.model('gh-1638-2', ItemChildSchema, 'gh-1638-2');

      const c1 = new ItemChild({name: 'first child'});
      const c2 = new ItemChild({name: 'second child'});

      const p = new ItemParent({
        children: [c1, c2]
      });

      p.save(function(error) {
        assert.ifError(error);

        c2.name = 'updated 2';
        p.children = [c2];
        p.save(function(error, doc) {
          assert.ifError(error);
          assert.equal(doc.children.length, 1);
          done();
        });
      });
    });
  });

  describe('gh-2434', function() {
    it('will save the new value', function(done) {
      const ItemSchema = new mongoose.Schema({
        st: Number,
        s: []
      });

      const Item = db.model('gh-2434', ItemSchema, 'gh-2434');

      const item = new Item({st: 1});

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
            done();
          });
        });
      });
    });
  });

  it('properly calls queue functions (gh-2856)', function(done) {
    const personSchema = new mongoose.Schema({
      name: String
    });

    let calledName;
    personSchema.methods.fn = function() {
      calledName = this.name;
    };
    personSchema.queue('fn');

    const Person = db.model('gh2856', personSchema, 'gh2856');
    new Person({name: 'Val'});
    assert.equal(calledName, 'Val');
    done();
  });

  describe('bug fixes', function() {
    it('applies toJSON transform correctly for populated docs (gh-2910) (gh-2990)', function(done) {
      const parentSchema = mongoose.Schema({
        c: {type: mongoose.Schema.Types.ObjectId, ref: 'gh-2910-1'}
      });

      let called = [];
      parentSchema.options.toJSON = {
        transform: function(doc, ret) {
          called.push(ret);
          return ret;
        }
      };

      const childSchema = mongoose.Schema({
        name: String
      });

      let childCalled = [];
      childSchema.options.toJSON = {
        transform: function(doc, ret) {
          childCalled.push(ret);
          return ret;
        }
      };

      const Child = db.model('gh-2910-1', childSchema);
      const Parent = db.model('gh-2910-0', parentSchema);

      Child.create({name: 'test'}, function(error, c) {
        Parent.create({c: c._id}, function(error, p) {
          Parent.findOne({_id: p._id}).populate('c').exec(function(error, p) {
            let doc = p.toJSON();
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

    it('single nested schema transform with save() (gh-5807)', function() {
      const embeddedSchema = new Schema({
        test: String
      });

      let called = false;
      embeddedSchema.options.toObject = {
        transform: function(doc, ret) {
          called = true;
          delete ret.test;
          return ret;
        }
      };
      const topLevelSchema = new Schema({
        embedded: embeddedSchema
      });
      const MyModel = db.model('gh5807', topLevelSchema);

      return MyModel.create({}).
        then(function(doc) {
          doc.embedded = { test: '123' };
          return doc.save();
        }).
        then(function(doc) {
          return MyModel.findById(doc._id);
        }).
        then(function(doc) {
          assert.equal(doc.embedded.test, '123');
          assert.ok(!called);
        });
    });

    it('setters firing with objects on real paths (gh-2943)', function(done) {
      const M = mongoose.model('gh2943', {
        myStr: {
          type: String, set: function(v) {
            return v.value;
          }
        },
        otherStr: String
      });

      const t = new M({myStr: {value: 'test'}});
      assert.equal(t.myStr, 'test');

      new M({otherStr: {value: 'test'}});
      assert.ok(!t.otherStr);

      done();
    });

    describe('gh-2782', function() {
      it('should set data from a sub doc', function(done) {
        const schema1 = new mongoose.Schema({
          data: {
            email: String
          }
        });
        const schema2 = new mongoose.Schema({
          email: String
        });
        const Model1 = mongoose.model('gh-2782-1', schema1);
        const Model2 = mongoose.model('gh-2782-2', schema2);

        const doc1 = new Model1({'data.email': 'some@example.com'});
        assert.equal(doc1.data.email, 'some@example.com');
        const doc2 = new Model2();
        doc2.set(doc1.data);
        assert.equal(doc2.email, 'some@example.com');
        done();
      });
    });

    it('set data from subdoc keys (gh-3346)', function(done) {
      const schema1 = new mongoose.Schema({
        data: {
          email: String
        }
      });
      const Model1 = mongoose.model('gh3346', schema1);

      const doc1 = new Model1({'data.email': 'some@example.com'});
      assert.equal(doc1.data.email, 'some@example.com');
      const doc2 = new Model1({data: doc1.data});
      assert.equal(doc2.data.email, 'some@example.com');
      done();
    });

    it('doesnt attempt to cast generic objects as strings (gh-3030)', function(done) {
      const M = mongoose.model('gh3030', {
        myStr: {
          type: String
        }
      });

      const t = new M({myStr: {thisIs: 'anObject'}});
      assert.ok(!t.myStr);
      t.validate(function(error) {
        assert.ok(error);
        done();
      });
    });

    it('single embedded schemas 1 (gh-2689)', function(done) {
      const userSchema = new mongoose.Schema({
        name: String,
        email: String
      }, {_id: false, id: false});

      let userHookCount = 0;
      userSchema.pre('save', function(next) {
        ++userHookCount;
        next();
      });

      const eventSchema = new mongoose.Schema({
        user: userSchema,
        name: String
      });

      let eventHookCount = 0;
      eventSchema.pre('save', function(next) {
        ++eventHookCount;
        next();
      });

      const Event = db.model('gh2689', eventSchema);

      const e = new Event({name: 'test', user: {name: 123, email: 'val'}});
      e.save(function(error) {
        assert.ifError(error);
        assert.strictEqual(e.user.name, '123');
        assert.equal(eventHookCount, 1);
        assert.equal(userHookCount, 1);

        Event.findOne({user: {name: '123', email: 'val'}}, function(err, doc) {
          assert.ifError(err);
          assert.ok(doc);

          Event.findOne({user: {$in: [{name: '123', email: 'val'}]}}, function(err, doc) {
            assert.ifError(err);
            assert.ok(doc);
            done();
          });
        });
      });
    });

    it('single embedded schemas with validation (gh-2689)', function(done) {
      const userSchema = new mongoose.Schema({
        name: String,
        email: {type: String, required: true, match: /.+@.+/}
      }, {_id: false, id: false});

      const eventSchema = new mongoose.Schema({
        user: userSchema,
        name: String
      });

      const Event = db.model('gh2689_1', eventSchema);

      const e = new Event({name: 'test', user: {}});
      let error = e.validateSync();
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
      const userSchema = new mongoose.Schema({
        name: String,
        email: {type: String, required: true, match: /.+@.+/}
      }, {_id: false, id: false});

      const eventSchema = new mongoose.Schema({
        user: userSchema,
        name: String
      });

      const Event = db.model('gh5134', eventSchema);

      const e = new Event({name: 'test', user: {}});
      assert.strictEqual(e.user.parent(), e.user.ownerDocument());

      done();
    });

    it('single embedded schemas with markmodified (gh-2689)', function(done) {
      const userSchema = new mongoose.Schema({
        name: String,
        email: {type: String, required: true, match: /.+@.+/}
      }, {_id: false, id: false});

      const eventSchema = new mongoose.Schema({
        user: userSchema,
        name: String
      });

      const Event = db.model('gh2689_2', eventSchema);

      const e = new Event({name: 'test', user: {email: 'a@b'}});
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

        const delta = doc.$__delta()[1];
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
      const userSchema = new mongoose.Schema({
        name: {type: String, default: 'Val'},
        email: {type: String, required: true, match: /.+@.+/}
      }, {_id: false, id: false});

      const eventSchema = new mongoose.Schema({
        user: userSchema,
        name: String
      });

      const Event = db.model('gh2689_3', eventSchema);

      const badUpdate = {$set: {'user.email': 'a'}};
      const options = {runValidators: true};
      Event.updateOne({}, badUpdate, options, function(error) {
        assert.ok(error);
        assert.equal(error.errors['user.email'].kind, 'regexp');

        const nestedUpdate = {name: 'test'};
        const options = {upsert: true, setDefaultsOnInsert: true};
        Event.updateOne({}, nestedUpdate, options, function(error) {
          assert.ifError(error);
          Event.findOne({name: 'test'}, function(error, ev) {
            assert.ifError(error);
            assert.equal(ev.user.name, 'Val');
            done();
          });
        });
      });
    });

    it('single embedded schema update validators ignore _id (gh-6269)', function() {
      return co(function*() {
        const subDocSchema = new mongoose.Schema({ name: String });

        const schema = new mongoose.Schema({
          subDoc: subDocSchema,
          test: String
        });

        const Model = db.model('gh6269', schema);

        const fakeDoc = new Model({});
        yield Model.create({});

        // toggle to false to see correct behavior
        // where subdoc is not created
        const setDefaultsFlag = true;

        const res = yield Model.findOneAndUpdate({ _id: fakeDoc._id }, {
          test: 'test'
        }, { setDefaultsOnInsert: setDefaultsFlag, upsert: true, new: true });

        assert.equal(res.test, 'test');
        assert.ok(!res.subDoc);
      });
    });
  });

  describe('error processing (gh-2284)', function() {
    it('save errors', function(done) {
      const schema = new Schema({
        name: { type: String, required: true }
      });

      schema.post('save', function(error, doc, next) {
        assert.ok(doc instanceof Model);
        next(new Error('Catch all'));
      });

      schema.post('save', function(error, doc, next) {
        assert.ok(doc instanceof Model);
        next(new Error('Catch all #2'));
      });

      const Model = mongoose.model('gh2284', schema);

      Model.create({}, function(error) {
        assert.ok(error);
        assert.equal(error.message, 'Catch all #2');
        done();
      });
    });

    it('validate errors (gh-4885)', function(done) {
      const testSchema = new Schema({ title: { type: String, required: true } });

      let called = 0;
      testSchema.post('validate', function(error, doc, next) {
        ++called;
        next(error);
      });

      const Test = db.model('gh4885', testSchema);

      Test.create({}, function(error) {
        assert.ok(error);
        assert.equal(called, 1);
        done();
      });
    });

    it('does not filter validation on unmodified paths when validateModifiedOnly not set (gh-7421)', function(done) {
      const testSchema = new Schema({ title: { type: String, required: true }, other: String });

      const Test = db.model('gh7421_1', testSchema);

      Test.create([{}], {validateBeforeSave: false}, function(createError, docs) {
        assert.equal(createError, null);
        const doc = docs[0];
        doc.other = 'something';
        assert.ok(doc.validateSync().errors);
        doc.save(function(error) {
          assert.ok(error.errors);
          done();
        });
      });
    });

    it('filters out validation on unmodified paths when validateModifiedOnly set (gh-7421)', function(done) {
      const testSchema = new Schema({ title: { type: String, required: true }, other: String });

      const Test = db.model('gh7421_2', testSchema);

      Test.create([{}], {validateBeforeSave: false}, function(createError, docs) {
        assert.equal(createError, null);
        const doc = docs[0];
        doc.other = 'something';
        assert.equal(doc.validateSync(undefined, {validateModifiedOnly: true}), null);
        doc.save({validateModifiedOnly: true}, function(error) {
          assert.equal(error, null);
          done();
        });
      });
    });

    it('does not filter validation on modified paths when validateModifiedOnly set (gh-7421)', function(done) {
      const testSchema = new Schema({ title: { type: String, required: true }, other: String });

      const Test = db.model('gh7421_3', testSchema);

      Test.create([{title: 'title'}], {validateBeforeSave: false}, function(createError, docs) {
        assert.equal(createError, null);
        const doc = docs[0];
        doc.title = '';
        assert.ok(doc.validateSync(undefined, {validateModifiedOnly: true}).errors);
        doc.save({validateModifiedOnly: true}, function(error) {
          assert.ok(error.errors);
          done();
        });
      });
    });

    it('validateModifiedOnly with pre existing validation error (gh-8091)', function() {
      const schema = mongoose.Schema({
        title: String,
        coverId: Number
      }, { validateModifiedOnly: true });

      const Model = db.model('gh8091', schema);

      return co(function*() {
        yield Model.collection.insertOne({ title: 'foo', coverId: parseFloat('not a number') });

        const doc = yield Model.findOne();
        doc.title = 'bar';
        // Should not throw
        yield doc.save();
      });
    });

    it('handles non-errors', function(done) {
      const schema = new Schema({
        name: { type: String, required: true }
      });

      schema.post('save', function(error, doc, next) {
        next(new Error('Catch all'));
      });

      schema.post('save', function(error, doc, next) {
        next(new Error('Catch all #2'));
      });

      const Model = db.model('gh2284_1', schema);

      Model.create({ name: 'test' }, function(error) {
        assert.ifError(error);
        done();
      });
    });
  });

  describe('bug fixes', function() {
    let db;

    before(function() {
      db = start();
    });

    after(function(done) {
      db.close(done);
    });

    it('single embedded schemas with populate (gh-3501)', function(done) {
      const PopulateMeSchema = new Schema({});

      const Child = db.model('gh3501', PopulateMeSchema);

      const SingleNestedSchema = new Schema({
        populateMeArray: [{
          type: Schema.Types.ObjectId,
          ref: 'gh3501'
        }]
      });

      const parentSchema = new Schema({
        singleNested: SingleNestedSchema
      });

      const P = db.model('gh3501_1', parentSchema);

      Child.create([{}, {}], function(error, docs) {
        assert.ifError(error);
        const obj = {
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
      const personSchema = new Schema({name: String});
      personSchema.methods.firstName = function() {
        return this.name.substr(0, this.name.indexOf(' '));
      };

      const bandSchema = new Schema({leadSinger: personSchema});
      const Band = db.model('gh3534', bandSchema);

      const gnr = new Band({leadSinger: {name: 'Axl Rose'}});
      assert.equal(gnr.leadSinger.firstName(), 'Axl');
      done();
    });

    it('single embedded schemas with models (gh-3535)', function(done) {
      const personSchema = new Schema({name: String});
      const Person = db.model('gh3535_0', personSchema);

      const bandSchema = new Schema({leadSinger: personSchema});
      const Band = db.model('gh3535', bandSchema);

      const axl = new Person({name: 'Axl Rose'});
      const gnr = new Band({leadSinger: axl});

      gnr.save(function(error) {
        assert.ifError(error);
        assert.equal(gnr.leadSinger.name, 'Axl Rose');
        done();
      });
    });

    it('single embedded schemas with indexes (gh-3594)', function(done) {
      const personSchema = new Schema({name: {type: String, unique: true}});

      const bandSchema = new Schema({leadSinger: personSchema});

      assert.equal(bandSchema.indexes().length, 1);
      const index = bandSchema.indexes()[0];
      assert.deepEqual(index[0], {'leadSinger.name': 1});
      assert.ok(index[1].unique);
      done();
    });

    it('removing single embedded docs (gh-3596)', function(done) {
      const personSchema = new Schema({name: String});

      const bandSchema = new Schema({guitarist: personSchema, name: String});
      const Band = db.model('gh3596', bandSchema);

      const gnr = new Band({
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
      const personSchema = new Schema({name: String});

      const bandSchema = new Schema({guitarist: personSchema, name: String});
      const Band = db.model('gh3601', bandSchema);

      const gnr = new Band({
        name: 'Guns N\' Roses',
        guitarist: {name: 'Slash'}
      });
      const velvetRevolver = new Band({
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
      const personSchema = new Schema({name: String});

      const bandSchema = new Schema({guitarist: personSchema, name: String});
      const Band = db.model('gh3642', bandSchema);

      const velvetRevolver = new Band({
        name: 'Velvet Revolver',
        guitarist: {name: 'Slash', realName: 'Saul Hudson'}
      });

      velvetRevolver.save(function(error) {
        assert.ifError(error);
        const query = {name: 'Velvet Revolver'};
        Band.collection.findOne(query, function(error, band) {
          assert.ifError(error);
          assert.ok(!band.guitarist.realName);
          done();
        });
      });
    });

    it('single embedded docs post hooks (gh-3679)', function(done) {
      const postHookCalls = [];
      const personSchema = new Schema({name: String});
      personSchema.post('save', function() {
        postHookCalls.push(this);
      });

      const bandSchema = new Schema({guitarist: personSchema, name: String});
      const Band = db.model('gh3679', bandSchema);
      const obj = {name: 'Guns N\' Roses', guitarist: {name: 'Slash'}};

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
      const personSchema = new Schema({name: String, realName: String});

      const bandSchema = new Schema({
        guitarist: personSchema,
        name: String
      });
      const Band = db.model('gh3686', bandSchema);
      const obj = {
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
      const childSchema = new Schema({count: Number});

      let preCalls = 0;
      childSchema.pre('save', function(next) {
        ++preCalls;
        next();
      });

      const SingleNestedSchema = new Schema({
        children: [childSchema]
      });

      const ParentSchema = new Schema({
        singleNested: SingleNestedSchema
      });

      const Parent = db.model('gh3680', ParentSchema);
      const obj = {singleNested: {children: [{count: 0}]}};
      Parent.create(obj, function(error) {
        assert.ifError(error);
        assert.equal(preCalls, 1);
        done();
      });
    });

    it('nested single embedded doc validation (gh-3702)', function(done) {
      const childChildSchema = new Schema({count: {type: Number, min: 1}});
      const childSchema = new Schema({child: childChildSchema});
      const parentSchema = new Schema({child: childSchema});

      const Parent = db.model('gh3702', parentSchema);
      const obj = {child: {child: {count: 0}}};
      Parent.create(obj, function(error) {
        assert.ok(error);
        assert.ok(/ValidationError/.test(error.toString()));
        done();
      });
    });

    it('handles virtuals with dots correctly (gh-3618)', function(done) {
      const testSchema = new Schema({nested: {type: Object, default: {}}});
      testSchema.virtual('nested.test').get(function() {
        return true;
      });

      const Test = db.model('gh3618', testSchema);

      const test = new Test();

      let doc = test.toObject({getters: true, virtuals: true});
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
      const schema = new Schema({
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

      const MyModel = db.model('gh3623', schema);

      const doc = {array: [{2: {}}]};
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
      const childSchema = new Schema({
        name: String
      });

      const parentSchema = new Schema({
        name: String,
        children: [{type: ObjectId, ref: 'gh3753'}]
      });

      const Child = db.model('gh3753', childSchema);
      const Parent = db.model('gh3753_0', parentSchema);

      Child.create({name: 'Luke Skywalker'}, function(error, child) {
        assert.ifError(error);
        const doc = {name: 'Darth Vader', children: [child._id]};
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
      const personSchema = new Schema({
        _id: Number,
        name: String,
        age: Number,
        friends: [{type: Number, ref: 'gh3776'}]
      });

      const Person = db.model('gh3776', personSchema);

      const people = [
        {_id: 0, name: 'Alice'},
        {_id: 1, name: 'Bob'}
      ];

      Person.create(people, function(error, people) {
        assert.ifError(error);
        const alice = people[0];
        alice.friends.push(people[1]);
        alice.save(function(error) {
          assert.ifError(error);
          done();
        });
      });
    });

    it('handles conflicting names (gh-3867)', function(done) {
      const testSchema = new Schema({
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

      const M = mongoose.model('gh3867', testSchema);

      const doc = M({
        things: [{}]
      });

      const fields = Object.keys(doc.validateSync().errors).sort();
      assert.deepEqual(fields, ['name', 'things.0.name']);
      done();
    });

    it('populate with lean (gh-3873)', function(done) {
      const companySchema = new mongoose.Schema({
        name:  String,
        description:  String,
        userCnt: { type: Number, default: 0, select: false }
      });

      const userSchema = new mongoose.Schema({
        name:  String,
        company: { type: mongoose.Schema.Types.ObjectId, ref: 'gh3873' }
      });

      const Company = db.model('gh3873', companySchema);
      const User = db.model('gh3873_0', userSchema);

      const company = new Company({ name: 'IniTech', userCnt: 1 });
      const user = new User({ name: 'Peter', company: company._id });

      company.save(function(error) {
        assert.ifError(error);
        user.save(function(error) {
          assert.ifError(error);
          next();
        });
      });

      function next() {
        const pop = { path: 'company', select: 'name', options: { lean: true } };
        User.find({}).populate(pop).exec(function(error, docs) {
          assert.ifError(error);
          assert.equal(docs.length, 1);
          assert.strictEqual(docs[0].company.userCnt, undefined);
          done();
        });
      }
    });

    it('init single nested subdoc with select (gh-3880)', function(done) {
      const childSchema = new mongoose.Schema({
        name: { type: String },
        friends: [{ type: String }]
      });

      const parentSchema = new mongoose.Schema({
        name: { type: String },
        child: childSchema
      });

      const Parent = db.model('gh3880', parentSchema);
      const p = new Parent({
        name: 'Mufasa',
        child: {
          name: 'Simba',
          friends: ['Pumbaa', 'Timon', 'Nala']
        }
      });

      p.save(function(error) {
        assert.ifError(error);
        const fields = 'name child.name';
        Parent.findById(p._id).select(fields).exec(function(error, doc) {
          assert.ifError(error);
          assert.strictEqual(doc.child.friends, void 0);
          done();
        });
      });
    });

    it('single nested subdoc isModified() (gh-3910)', function(done) {
      let called = 0;

      const ChildSchema = new Schema({
        name: String
      });

      ChildSchema.pre('save', function(next) {
        assert.ok(this.isModified('name'));
        ++called;
        next();
      });

      const ParentSchema = new Schema({
        name: String,
        child: ChildSchema
      });

      const Parent = db.model('gh3910', ParentSchema);

      const p = new Parent({
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
      const schema = new mongoose.Schema({
        pre: String,
        post: String
      }, { versionKey: false });
      const MyModel = db.model('gh3902', schema);

      MyModel.create({ pre: 'test', post: 'test' }, function(error, doc) {
        assert.ifError(error);
        assert.deepEqual(utils.omit(doc.toObject(), '_id'),
          { pre: 'test', post: 'test' });
        done();
      });
    });

    it('manual population and isNew (gh-3982)', function(done) {
      const NestedModelSchema = new mongoose.Schema({
        field: String
      });

      const NestedModel = db.model('gh3982', NestedModelSchema);

      const ModelSchema = new mongoose.Schema({
        field: String,
        array: [{
          type: mongoose.Schema.ObjectId,
          ref: 'gh3982',
          required: true
        }]
      });

      const Model = db.model('gh3982_0', ModelSchema);

      const nestedModel = new NestedModel({
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

    it('manual population with refPath (gh-7070)', function() {
      const ChildModelSchema = new mongoose.Schema({
        name: String
      });

      const ChildModel = db.model('gh7070_Child', ChildModelSchema);

      const ParentModelSchema = new mongoose.Schema({
        model: String,
        childId: { type: mongoose.ObjectId, refPath: 'model' },
        otherId: mongoose.ObjectId
      });

      const ParentModel = db.model('gh7070', ParentModelSchema);

      return co(function*() {
        const child = yield ChildModel.create({ name: 'test' });

        let parent = yield ParentModel.create({
          model: 'gh7070_Child',
          childId: child._id
        });

        parent = yield ParentModel.findOne();

        parent.childId = child;
        parent.otherId = child;

        assert.equal(parent.childId.name, 'test');
        assert.ok(parent.otherId instanceof mongoose.Types.ObjectId);
      });
    });

    it('doesnt skipId for single nested subdocs (gh-4008)', function(done) {
      const childSchema = new Schema({
        name: String
      });

      const parentSchema = new Schema({
        child: childSchema
      });

      const Parent = db.model('gh4008', parentSchema);

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
      const schema = new mongoose.Schema({
        placeName: String
      });

      const geoSchema = new mongoose.Schema({
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

      const MyModel = db.model('gh4014', schema);

      MyModel.on('index', function(err) {
        assert.ifError(err);

        MyModel.
          where('geo').near({ center: [50, 50], spherical: true }).
          exec(function(err) {
            assert.ifError(err);
            done();
          });
      });
    });

    it('skip validation if required returns false (gh-4094)', function(done) {
      const schema = new Schema({
        div: {
          type: Number,
          required: function() { return false; },
          validate: function(v) { return !!v; }
        }
      });
      const Model = db.model('gh4094', schema);
      const m = new Model();
      assert.ifError(m.validateSync());
      done();
    });

    it('ability to overwrite array default (gh-4109)', function(done) {
      const schema = new Schema({
        names: {
          type: [String],
          default: void 0
        }
      });

      const Model = db.model('gh4109', schema);
      const m = new Model();
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
      const mySchema = new mongoose.Schema({
        items: [
          { month: Number, date: Date }
        ]
      });

      const Test = db.model('test', mySchema);

      const a = [
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

    it('validateSync works when setting array index nested (gh-5389)', function(done) {
      const childSchema = new mongoose.Schema({
        _id: false,
        name: String,
        age: Number
      });

      const schema = new mongoose.Schema({
        name: String,
        children: [childSchema]
      });

      const Model = db.model('gh5389', schema);

      Model.
        create({
          name: 'test',
          children: [
            { name: 'test-child', age: 24 }
          ]
        }).
        then(function(doc) {
          return Model.findById(doc._id);
        }).
        then(function(doc) {
          doc.children[0] = { name: 'updated-child', age: 53 };
          const errors = doc.validateSync();
          assert.ok(!errors);
          done();
        }).
        catch(done);
    });

    it('single embedded with defaults have $parent (gh-4115)', function(done) {
      const ChildSchema = new Schema({
        name: {
          type: String,
          'default': 'child'
        }
      });

      const ParentSchema = new Schema({
        child: {
          type: ChildSchema,
          'default': {}
        }
      });

      const Parent = db.model('gh4115', ParentSchema);

      const p = new Parent();
      assert.equal(p.child.$parent, p);
      done();
    });

    it('removing parent doc calls remove hooks on subdocs (gh-2348) (gh-4566)', function(done) {
      const ChildSchema = new Schema({
        name: String
      });

      const called = {};
      ChildSchema.pre('remove', function(next) {
        called[this.name] = true;
        next();
      });

      const ParentSchema = new Schema({
        children: [ChildSchema],
        child: ChildSchema
      });

      const Parent = db.model('gh2348', ParentSchema);

      const doc = {
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
          const arr = doc.children.toObject().map(function(v) { return v.name; });
          assert.deepEqual(arr, ['Jacen', 'Jaina']);
          assert.equal(doc.child.name, 'Anakin');
          done();
        });
      });
    });

    it('strings of length 12 are valid oids (gh-3365)', function(done) {
      const schema = new Schema({ myId: mongoose.Schema.Types.ObjectId });
      const M = db.model('gh3365', schema);
      const doc = new M({ myId: 'blablablabla' });
      doc.validate(function(error) {
        assert.ifError(error);
        done();
      });
    });

    it('set() empty obj unmodifies subpaths (gh-4182)', function(done) {
      const omeletteSchema = new Schema({
        topping: {
          meat: {
            type: String,
            enum: ['bacon', 'sausage']
          },
          cheese: Boolean
        }
      });
      const Omelette = db.model('gh4182', omeletteSchema);
      const doc = new Omelette({
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
      const testSchema = new Schema({ name: String });

      const Test = db.model('gh3499', testSchema);

      Test.on('error', function(error) {
        assert.equal(error.message, 'fail!');
        done();
      });

      new Test({}).save(function() {
        throw new Error('fail!');
      });
    });

    it('emits cb errors on model for save with hooks (gh-3499)', function(done) {
      const testSchema = new Schema({ name: String });

      testSchema.pre('save', function(next) {
        next();
      });

      testSchema.post('save', function(doc, next) {
        next();
      });

      const Test = db.model('gh3499_0', testSchema);

      Test.on('error', function(error) {
        assert.equal(error.message, 'fail!');
        done();
      });

      new Test({}).save(function() {
        throw new Error('fail!');
      });
    });

    it('emits cb errors on model for find() (gh-3499)', function(done) {
      const testSchema = new Schema({ name: String });

      const Test = db.model('gh3499_1', testSchema);

      Test.on('error', function(error) {
        assert.equal(error.message, 'fail!');
        done();
      });

      Test.find({}, function() {
        throw new Error('fail!');
      });
    });

    it('emits cb errors on model for find() + hooks (gh-3499)', function(done) {
      const testSchema = new Schema({ name: String });

      testSchema.post('find', function(results, next) {
        assert.equal(results.length, 0);
        next();
      });

      const Test = db.model('gh3499_2', testSchema);

      Test.on('error', function(error) {
        assert.equal(error.message, 'fail!');
        done();
      });

      Test.find({}, function() {
        throw new Error('fail!');
      });
    });

    it('clears subpaths when removing single nested (gh-4216)', function(done) {
      const RecurrenceSchema = new Schema({
        frequency: Number,
        interval: {
          type: String,
          enum: ['days', 'weeks', 'months', 'years']
        }
      }, { _id: false });

      const EventSchema = new Schema({
        name: {
          type: String,
          trim: true
        },
        recurrence: RecurrenceSchema
      });

      const Event = db.model('gh4216', EventSchema);
      const ev = new Event({
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
      const schema = new Schema({
        email: { type: String, validate: validator.isEmail }
      });

      const MyModel = db.model('gh4064', schema);

      MyModel.create({ email: 'invalid' }, function(error) {
        assert.ok(error);
        assert.ok(error.errors['email']);
        done();
      });
    });

    it('setting path to empty object works (gh-4218)', function() {
      const schema = new Schema({
        object: {
          nested: {
            field1: { type: Number, default: 1 }
          }
        }
      });

      const MyModel = db.model('gh4218', schema);

      return co(function*() {
        let doc = yield MyModel.create({});
        doc.object.nested = {};
        yield doc.save();
        doc = yield MyModel.collection.findOne({ _id: doc._id });
        assert.deepEqual(doc.object.nested, {});
      });
    });

    it('setting path to object with strict and no paths in the schema (gh-6436) (gh-4218)', function() {
      const schema = new Schema({
        object: {
          nested: {
            field1: { type: Number, default: 1 }
          }
        }
      });

      const MyModel = db.model('gh6436', schema);

      return co(function*() {
        let doc = yield MyModel.create({});
        doc.object.nested = { field2: 'foo' }; // `field2` not in the schema
        yield doc.save();
        doc = yield MyModel.collection.findOne({ _id: doc._id });
        assert.deepEqual(doc.object.nested, {});
      });
    });

    it('minimize + empty object (gh-4337)', function(done) {
      const SomeModelSchema = new mongoose.Schema({}, {
        minimize: false
      });

      const SomeModel = mongoose.model('somemodel', SomeModelSchema);

      try {
        new SomeModel({});
      } catch (error) {
        assert.ifError(error);
      }
      done();
    });

    it('directModifiedPaths() (gh-7373)', function() {
      const schema = new Schema({ foo: String, nested: { bar: String } });
      const Model = db.model('gh7373', schema);

      return co(function*() {
        yield Model.create({ foo: 'original', nested: { bar: 'original' } });

        const doc = yield Model.findOne();
        doc.nested.bar = 'modified';

        assert.deepEqual(doc.directModifiedPaths(), ['nested.bar']);
        assert.deepEqual(doc.modifiedPaths().sort(), ['nested', 'nested.bar']);
      });
    });

    describe('modifiedPaths', function() {
      it('doesnt markModified child paths if parent is modified (gh-4224)', function(done) {
        const childSchema = new Schema({
          name: String
        });
        const parentSchema = new Schema({
          child: childSchema
        });

        const Parent = db.model('gh4224', parentSchema);
        Parent.create({ child: { name: 'Jacen' } }, function(error, doc) {
          assert.ifError(error);
          doc.child = { name: 'Jaina' };
          doc.child.name = 'Anakin';
          assert.deepEqual(doc.modifiedPaths(), ['child']);
          assert.ok(doc.isModified('child.name'));
          done();
        });
      });

      it('includeChildren option (gh-6134)', function(done) {
        const personSchema = new mongoose.Schema({
          name: { type: String },
          colors: {
            primary: {
              type: String,
              default: 'white',
              enum: ['blue', 'green', 'red', 'purple', 'yellow']
            }
          }
        });

        const Person = db.model('Person', personSchema);

        const luke = new Person({
          name: 'Luke',
          colors: {
            primary: 'blue'
          }
        });
        assert.deepEqual(luke.modifiedPaths(), ['name', 'colors', 'colors.primary']);

        const obiwan = new Person({ name: 'Obi-Wan' });
        obiwan.colors.primary = 'blue';
        assert.deepEqual(obiwan.modifiedPaths(), ['name', 'colors', 'colors.primary']);

        const anakin = new Person({ name: 'Anakin' });
        anakin.colors = { primary: 'blue' };
        assert.deepEqual(anakin.modifiedPaths({ includeChildren: true }), ['name', 'colors', 'colors.primary']);

        done();
      });

      it('includeChildren option with arrays (gh-5904)', function(done) {
        const teamSchema = new mongoose.Schema({
          name: String,
          colors: {
            primary: {
              type: String,
              enum: ['blue', 'green', 'red', 'purple', 'yellow', 'white', 'black']
            }
          },
          members: [{
            name: String,
          }]
        });

        const Team = db.model('gh5904', teamSchema);

        const jedis = new Team({
          name: 'Jedis',
          colors: {
            primary: 'blue'
          },
          members: [{ name: 'luke' }]
        });

        const paths = jedis.modifiedPaths({ includeChildren: true });
        assert.deepEqual(paths, [
          'name',
          'colors',
          'colors.primary',
          'members',
          'members.0',
          'members.0.name'
        ]);

        done();
      });

      it('1 level down nested paths get marked modified on initial set (gh-7313) (gh-6944)', function() {
        const testSchema = new Schema({
          name: {
            first: String,
            last: String,
          },
          relatives: {
            aunt: {
              name: String,
            },
            uncle: {
              name: String,
            },
          },
        });
        const M = db.model('gh7313', testSchema);

        const doc = new M({
          name: { first: 'A', last: 'B' },
          relatives: {
            aunt: { name: 'foo' },
            uncle: { name: 'bar' }
          }
        });

        assert.ok(doc.modifiedPaths().indexOf('name.first') !== -1);
        assert.ok(doc.modifiedPaths().indexOf('name.last') !== -1);
        assert.ok(doc.modifiedPaths().indexOf('relatives.aunt') !== -1);
        assert.ok(doc.modifiedPaths().indexOf('relatives.uncle') !== -1);

        return Promise.resolve();
      });
    });

    it('single nested isNew (gh-4369)', function(done) {
      const childSchema = new Schema({
        name: String
      });
      const parentSchema = new Schema({
        child: childSchema
      });

      const Parent = db.model('gh4369', parentSchema);
      let remaining = 2;

      const doc = new Parent({ child: { name: 'Jacen' } });
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
      const schema = new Schema({
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
      const childSchema = new Schema({
        name: String
      });
      const parentSchema = new Schema({
        child: [childSchema]
      });

      parentSchema.path('child').default([{ name: 'test' }]);

      const Parent = db.model('gh4390', parentSchema);

      Parent.create({}, function(error, doc) {
        assert.ifError(error);
        const arr = doc.toObject().child.map(function(doc) {
          assert.ok(doc._id);
          delete doc._id;
          return doc;
        });
        assert.deepEqual(arr, [{ name: 'test' }]);
        done();
      });
    });

    it('handles invalid dates (gh-4404)', function(done) {
      const testSchema = new Schema({
        date: Date
      });

      const Test = db.model('gh4404', testSchema);

      Test.create({ date: new Date('invalid date') }, function(error) {
        assert.ok(error);
        assert.equal(error.errors['date'].name, 'CastError');
        done();
      });
    });

    it('setting array subpath (gh-4472)', function(done) {
      const ChildSchema = new mongoose.Schema({
        name: String,
        age: Number
      }, { _id: false });

      const ParentSchema = new mongoose.Schema({
        data: {
          children: [ChildSchema]
        }
      });

      const Parent = db.model('gh4472', ParentSchema);

      const p = new Parent();
      p.set('data.children.0', {
        name: 'Bob',
        age: 900
      });

      assert.deepEqual(p.toObject().data.children, [{ name: 'Bob', age: 900 }]);
      done();
    });

    it('ignore paths (gh-4480)', function() {
      const TestSchema = new Schema({
        name: { type: String, required: true }
      });

      const Test = db.model('gh4480', TestSchema);

      return co(function*() {
        yield Test.create({ name: 'val' });

        let doc = yield Test.findOne();

        doc.name = null;
        doc.$ignore('name');

        yield doc.save();

        doc = yield Test.findById(doc._id);

        assert.equal(doc.name, 'val');
      });
    });

    it('ignore subdocs paths (gh-4480) (gh-6152)', function() {
      const childSchema = new Schema({
        name: { type: String, required: true }
      });
      const testSchema = new Schema({
        child: childSchema,
        children: [childSchema]
      });

      const Test = db.model('gh6152', testSchema);

      return co(function*() {
        yield Test.create({
          child: { name: 'testSingle' },
          children: [{ name: 'testArr' }]
        });

        let doc = yield Test.findOne();
        doc.child.name = null;
        doc.child.$ignore('name');

        yield doc.save();

        doc = yield Test.findById(doc._id);

        assert.equal(doc.child.name, 'testSingle');

        doc.children[0].name = null;
        doc.children[0].$ignore('name');

        yield doc.save();

        doc = yield Test.findById(doc._id);

        assert.equal(doc.children[0].name, 'testArr');
      });
    });

    it('composite _ids (gh-4542)', function(done) {
      const schema = new Schema({
        _id: {
          key1: String,
          key2: String
        },
        content: String
      });

      const Model = db.model('gh4542', schema);

      const object = new Model();
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
      const schema = new mongoose.Schema({
        type: mongoose.SchemaTypes.Number,
        conditional: {
          type: mongoose.SchemaTypes.String,
          required: function() {
            return this.type === 1;
          },
          maxlength: 128
        }
      });

      const Model = db.model('gh4607', schema);

      assert.doesNotThrow(function() {
        new Model({
          type: 2,
          conditional: void 0
        }).validateSync();
      });

      done();
    });

    it('conditional required on single nested (gh-4663)', function(done) {
      const childSchema = new Schema({
        name: String
      });
      const schema = new Schema({
        child: {
          type: childSchema,
          required: function() {
            assert.equal(this.child.name, 'test');
          }
        }
      });

      const M = db.model('gh4663', schema);

      new M({ child: { name: 'test' } }).validateSync();
      done();
    });

    it('setting full path under single nested schema works (gh-4578) (gh-4528)', function(done) {
      const ChildSchema = new mongoose.Schema({
        age: Number
      });

      const ParentSchema = new mongoose.Schema({
        age: Number,
        family: {
          child: ChildSchema
        }
      });

      const M = db.model('gh4578', ParentSchema);

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
      const testSchema = new mongoose.Schema({
        name: String,
        surnames: {
          docarray: [{ name: String }]
        }
      });

      const Cat = db.model('gh5206', testSchema);

      const kitty = new Cat({
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
      const Cat = db.model('gh3057', { name: String });
      const Human = db.model('gh3057_0', {
        name: String,
        petCat: { type: mongoose.Schema.Types.ObjectId, ref: 'gh3057' }
      });

      const kitty = new Cat({ name: 'Zildjian' });
      const person = new Human({ name: 'Val', petCat: kitty });

      assert.equal(kitty.toObject({ depopulate: true }).name, 'Zildjian');
      assert.ok(!person.toObject({ depopulate: true }).petCat.name);
      done();
    });

    it('toObject() respects schema-level depopulate (gh-6313)', function(done) {
      const personSchema = Schema({
        name: String,
        car: {
          type: Schema.Types.ObjectId,
          ref: 'gh6313_Car'
        }
      });

      personSchema.set('toObject', {
        depopulate: true
      });

      const carSchema = Schema({
        name: String
      });

      const Car = db.model('gh6313_Car', carSchema);
      const Person = db.model('gh6313_Person', personSchema);

      const car = new Car({
        name: 'Ford'
      });

      const person = new Person({
        name: 'John',
        car: car
      });

      assert.equal(person.toObject().car.toHexString(), car._id.toHexString());
      done();
    });

    it('single nested doc conditional required (gh-4654)', function(done) {
      const ProfileSchema = new Schema({
        firstName: String,
        lastName: String
      });

      function validator() {
        assert.equal(this.email, 'test');
        return true;
      }

      const UserSchema = new Schema({
        email: String,
        profile: {
          type: ProfileSchema,
          required: [validator, 'profile required']
        }
      });

      const User = db.model('gh4654', UserSchema);
      User.create({ email: 'test' }, function(error) {
        assert.equal(error.errors['profile'].message, 'profile required');
        done();
      });
    });

    it('handles setting single nested schema to equal value (gh-4676)', function(done) {
      const companySchema = new mongoose.Schema({
        _id: false,
        name: String,
        description: String
      });

      const userSchema = new mongoose.Schema({
        name:  String,
        company: companySchema
      });

      const User = db.model('gh4676', userSchema);

      const user = new User({ company: { name: 'Test' } });
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
      const EntitySchema = new Schema({
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

      const ShipmentSchema = new Schema({
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

      const Shipment = db.model('gh4766', ShipmentSchema);
      const doc = new Shipment({
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
      const uuid = require('uuid');

      const UserSchema = new mongoose.Schema({
        _id: {
          type: Buffer,
          default: function() {
            return mongoose.Types.Buffer(uuid.parse(uuid.v4())).toObject(4);
          },
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

      const User = db.model('gh4506', UserSchema);

      const user = new User({
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
      const NestedSchema = new mongoose.Schema({
        nestedName: { type: String, required: true },
        createdAt: { type: Date, required: true }
      });
      const RootSchema = new mongoose.Schema({
        rootName:  String,
        nested: { type: [ NestedSchema ] }
      });

      const Root = db.model('gh4681', RootSchema);
      const root = new Root({ rootName: 'root', nested: [ { } ] });
      root.save(function(error) {
        assert.ok(error);
        assert.deepEqual(Object.keys(error.errors).sort(),
          ['nested.0.createdAt', 'nested.0.nestedName']);
        done();
      });
    });

    it('should depopulate the shard key when saving (gh-4658)', function(done) {
      const ChildSchema = new mongoose.Schema({
        name: String
      });

      const ChildModel = db.model('gh4658', ChildSchema);

      const ParentSchema = new mongoose.Schema({
        name: String,
        child: { type: Schema.Types.ObjectId, ref: 'gh4658' }
      }, {shardKey: {child: 1, _id: 1}});

      const ParentModel = db.model('gh4658_0', ParentSchema);

      ChildModel.create({ name: 'Luke' }).
        then(function(child) {
          const p = new ParentModel({ name: 'Vader' });
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
      const childSchema = new Schema({
        name: { type: String, default: 'John' },
        favorites: {
          color: {
            type: String,
            default: 'Blue'
          }
        }
      });

      const parentSchema = new Schema({
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

      const Parent = db.model('gh4716', parentSchema);
      const p = new Parent({ name: 'Anakin' });
      p.set('children.0.name', 'Leah');
      p.set('favorites.color', 'Red');
      assert.equal(p.children[0].favorites.color, 'Red');
      done();
    });

    it('handles selected nested elements with defaults (gh-4739)', function(done) {
      const userSchema = new Schema({
        preferences: {
          sleep: { type: Boolean, default: false },
          test: { type: Boolean, default: true }
        },
        name: String
      });

      const User = db.model('User', userSchema);

      const user = { name: 'test' };
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
      const SubSchema = new mongoose.Schema({
        field: {
          nestedField: {
            type: mongoose.Schema.ObjectId,
            required: false
          }
        }
      }, { _id: false, id: false });

      const Model2Schema = new mongoose.Schema({
        sub: {
          type: SubSchema,
          required: false
        }
      });
      const Model2 = db.model('gh4778', Model2Schema);

      const doc = new Model2({
        sub: {}
      });

      doc.sub.field.nestedField = { };
      doc.sub.field.nestedField = '574b69d0d9daf106aaa62974';
      assert.ok(!doc.validateSync());
      done();
    });

    it('timestamps set to false works (gh-7074)', function() {
      const schema = new Schema({ name: String }, { timestamps: false });
      const Test = db.model('gh7074', schema);
      return co(function*() {
        const doc = yield Test.create({ name: 'test' });
        assert.strictEqual(doc.updatedAt, undefined);
        assert.strictEqual(doc.createdAt, undefined);
      });
    });

    it('timestamps with nested paths (gh-5051)', function(done) {
      const schema = new Schema({ props: {} }, {
        timestamps: {
          createdAt: 'props.createdAt',
          updatedAt: 'props.updatedAt'
        }
      });

      const M = db.model('gh5051', schema);
      const now = Date.now();
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

    it('Declaring defaults in your schema with timestamps defined (gh-6024)', function(done) {
      const schemaDefinition = {
        name: String,
        misc: {
          hometown: String,
          isAlive: { type: Boolean, default: true }
        }
      };

      const schemaWithTimestamps = new Schema(schemaDefinition, {timestamps: {createdAt: 'misc.createdAt'}});
      const PersonWithTimestamps = db.model('Person_timestamps', schemaWithTimestamps);
      const dude = new PersonWithTimestamps({ name: 'Keanu', misc: {hometown: 'Beirut'} });
      assert.equal(dude.misc.isAlive, true);

      done();
    });

    it('supports $where in pre save hook (gh-4004)', function(done) {
      const Promise = global.Promise;

      const schema = new Schema({
        name: String
      }, { timestamps: true, versionKey: null });

      schema.pre('save', function(next) {
        this.$where = { updatedAt: this.updatedAt };
        next();
      });

      schema.post('save', function(error, res, next) {
        assert.ok(error instanceof MongooseError.DocumentNotFoundError);
        assert.ok(error.message.indexOf('gh4004') !== -1, error.message);

        error = new Error('Somebody else updated the document!');
        next(error);
      });

      const MyModel = db.model('gh4004', schema);

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
      const TestSchema = new mongoose.Schema({ buf: Buffer }, {
        toObject: {
          virtuals: true,
          getters: true
        }
      });

      const Test = db.model('gh4800', TestSchema);

      Test.create({ buf: Buffer.from('abcd') }).
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

    it('buffer subtype prop (gh-5530)', function(done) {
      const TestSchema = new mongoose.Schema({
        uuid: {
          type: Buffer,
          subtype: 4
        }
      });

      const Test = db.model('gh5530', TestSchema);

      const doc = new Test({ uuid: 'test1' });
      assert.equal(doc.uuid._subtype, 4);
      done();
    });

    it('runs validate hooks on single nested subdocs if not directly modified (gh-3884)', function(done) {
      const childSchema = new Schema({
        name: { type: String },
        friends: [{ type: String }]
      });
      let count = 0;

      childSchema.pre('validate', function(next) {
        ++count;
        next();
      });

      const parentSchema = new Schema({
        name: { type: String },
        child: childSchema
      });

      const Parent = db.model('gh3884', parentSchema);

      const p = new Parent({
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

    it('runs validate hooks on arrays subdocs if not directly modified (gh-5861)', function(done) {
      const childSchema = new Schema({
        name: { type: String },
        friends: [{ type: String }]
      });
      let count = 0;

      childSchema.pre('validate', function(next) {
        ++count;
        next();
      });

      const parentSchema = new Schema({
        name: { type: String },
        children: [childSchema]
      });

      const Parent = db.model('gh5861', parentSchema);

      const p = new Parent({
        name: 'Mufasa',
        children: [{
          name: 'Simba',
          friends: ['Pumbaa', 'Timon', 'Nala']
        }]
      });

      p.save().
        then(function(p) {
          assert.equal(count, 1);
          p.children[0].friends.push('Rafiki');
          return p.save();
        }).
        then(function() {
          assert.equal(count, 2);
          done();
        }).
        catch(done);
    });

    it('does not run schema type validator on single nested if not direct modified (gh-5885)', function() {
      let childValidateCalls = 0;
      const childSchema = new Schema({
        name: String,
        otherProp: {
          type: String,
          validate: () => {
            ++childValidateCalls;
            return true;
          }
        }
      });

      let validateCalls = 0;
      const parentSchema = new Schema({
        child: {
          type: childSchema,
          validate: () => {
            ++validateCalls;
            return true;
          }
        }
      });

      return co(function*() {
        const Parent = db.model('gh5885', parentSchema);

        const doc = yield Parent.create({
          child: {
            name: 'test',
            otherProp: 'test'
          }
        });

        assert.equal(childValidateCalls, 1);
        assert.equal(validateCalls, 1);
        childValidateCalls = 0;
        validateCalls = 0;

        doc.set('child.name', 'test2');
        yield doc.validate();

        assert.equal(childValidateCalls, 0);
        assert.equal(validateCalls, 0);
      });
    });

    it('runs schema type validator on single nested if parent has default (gh-7493)', function() {
      const childSchema = new Schema({
        test: String
      });
      const parentSchema = new Schema({
        child: {
          type: childSchema,
          default: {},
          validate: () => false
        }
      });
      const Parent = mongoose.model('Test', parentSchema);

      const parentDoc = new Parent({});

      parentDoc.child.test = 'foo';

      const err = parentDoc.validateSync();
      assert.ok(err);
      assert.ok(err.errors['child']);
      return Promise.resolve();
    });

    it('does not overwrite when setting nested (gh-4793)', function(done) {
      const grandchildSchema = new mongoose.Schema();
      grandchildSchema.method({
        foo: function() { return 'bar'; }
      });
      const Grandchild = db.model('gh4793_0', grandchildSchema);

      const childSchema = new mongoose.Schema({
        grandchild: grandchildSchema
      });
      const Child = mongoose.model('gh4793_1', childSchema);

      const parentSchema = new mongoose.Schema({
        children: [childSchema]
      });
      const Parent = mongoose.model('gh4793_2', parentSchema);

      const grandchild = new Grandchild();
      const child = new Child({grandchild: grandchild});

      assert.equal(child.grandchild.foo(), 'bar');

      const p = new Parent({children: [child]});

      assert.equal(child.grandchild.foo(), 'bar');
      assert.equal(p.children[0].grandchild.foo(), 'bar');
      done();
    });

    it('hooks/middleware for custom methods (gh-6385) (gh-7456)', function() {
      const mySchema = new Schema({
        name: String
      });

      mySchema.methods.foo = function(cb) {
        return cb(null, this.name);
      };
      mySchema.methods.bar = function() {
        return this.name;
      };
      mySchema.methods.baz = function(arg) {
        return Promise.resolve(arg);
      };

      let preFoo = 0;
      let postFoo = 0;
      mySchema.pre('foo', function() {
        ++preFoo;
      });
      mySchema.post('foo', function() {
        ++postFoo;
      });

      let preBaz = 0;
      let postBaz = 0;
      mySchema.pre('baz', function() {
        ++preBaz;
      });
      mySchema.post('baz', function() {
        ++postBaz;
      });

      const MyModel = db.model('gh6385', mySchema);

      return co(function*() {
        const doc = new MyModel({ name: 'test' });

        assert.equal(doc.bar(), 'test');

        assert.equal(preFoo, 0);
        assert.equal(postFoo, 0);

        assert.equal(yield cb => doc.foo(cb), 'test');
        assert.equal(preFoo, 1);
        assert.equal(postFoo, 1);

        assert.equal(preBaz, 0);
        assert.equal(postBaz, 0);

        assert.equal(yield doc.baz('foobar'), 'foobar');
        assert.equal(preBaz, 1);
        assert.equal(preBaz, 1);
      });
    });

    it('custom methods with promises (gh-6385)', function() {
      const mySchema = new Schema({
        name: String
      });

      mySchema.methods.foo = function() {
        return Promise.resolve(this.name + ' foo');
      };
      mySchema.methods.bar = function() {
        return this.name + ' bar';
      };

      let preFoo = 0;
      let preBar = 0;
      mySchema.pre('foo', function() {
        ++preFoo;
      });
      mySchema.pre('bar', function() {
        ++preBar;
      });

      const MyModel = db.model('gh6385_1', mySchema);

      return co(function*() {
        const doc = new MyModel({ name: 'test' });

        assert.equal(preFoo, 0);
        assert.equal(preBar, 0);

        let foo = doc.foo();
        let bar = doc.bar();
        assert.ok(foo instanceof Promise);
        assert.ok(bar instanceof Promise);

        foo = yield foo;
        bar = yield bar;

        assert.equal(preFoo, 1);
        assert.equal(preBar, 1);
        assert.equal(foo, 'test foo');
        assert.equal(bar, 'test bar');
      });
    });

    it('toString() as custom method (gh-6538)', function(done) {
      const commentSchema = new Schema({ title: String });
      commentSchema.methods.toString = function() {
        return `${this.constructor.modelName}(${this.title})`;
      };
      const Comment = db.model('gh6538_Comment', commentSchema);
      const c = new Comment({ title: 'test' });
      assert.strictEqual('gh6538_Comment(test)', `${c}`);
      done();
    });

    it('setting to discriminator (gh-4935)', function(done) {
      const Buyer = db.model('gh4935_0', new Schema({
        name: String,
        vehicle: { type: Schema.Types.ObjectId, ref: 'gh4935' }
      }));
      const Vehicle = db.model('gh4935', new Schema({ name: String }));
      const Car = Vehicle.discriminator('gh4935_1', new Schema({
        model: String
      }));

      const eleanor = new Car({ name: 'Eleanor', model: 'Shelby Mustang GT' });
      const nick = new Buyer({ name: 'Nicolas', vehicle: eleanor });

      assert.ok(!!nick.vehicle);
      assert.ok(nick.vehicle === eleanor);
      assert.ok(nick.vehicle instanceof Car);
      assert.equal(nick.vehicle.name, 'Eleanor');

      done();
    });

    it('handles errors in sync validators (gh-2185)', function(done) {
      const schema = new Schema({
        name: {
          type: String,
          validate: function() {
            throw new Error('woops!');
          }
        }
      });

      const M = db.model('gh2185', schema);

      const error = (new M({ name: 'test' })).validateSync();
      assert.ok(error);
      assert.equal(error.errors['name'].reason.message, 'woops!');

      new M({ name: 'test'}).validate(function(error) {
        assert.ok(error);
        assert.equal(error.errors['name'].reason.message, 'woops!');
        done();
      });
    });

    it('allows hook as a schema key (gh-5047)', function(done) {
      const schema = new mongoose.Schema({
        name: String,
        hook: { type: String }
      });

      const Model = db.model('Model', schema);

      Model.create({ hook: 'test '}, function(error) {
        assert.ifError(error);
        done();
      });
    });

    it('save errors with callback and promise work (gh-5216)', function(done) {
      const schema = new mongoose.Schema({});

      const Model = db.model('gh5216', schema);

      const _id = new mongoose.Types.ObjectId();
      const doc1 = new Model({ _id: _id });
      const doc2 = new Model({ _id: _id });

      let remaining = 2;
      Model.on('error', function(error) {
        assert.ok(error);
        --remaining || done();
      });

      doc1.save().
        then(function() { return doc2.save(); }).
        catch(function(error) {
          assert.ok(error);
          --remaining || done();
        });
    });

    it('post hooks on child subdocs run after save (gh-5085)', function(done) {
      const ChildModelSchema = new mongoose.Schema({
        text: {
          type: String
        }
      });
      ChildModelSchema.post('save', function(doc) {
        doc.text = 'bar';
      });
      const ParentModelSchema = new mongoose.Schema({
        children: [ChildModelSchema]
      });

      const Model = db.model('gh5085', ParentModelSchema);

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

    it('post hooks on array child subdocs run after save (gh-5085) (gh-6926)', function() {
      const subSchema = new Schema({
        val: String
      });

      subSchema.post('save', function() {
        return Promise.reject(new Error('Oops'));
      });

      const schema = new Schema({
        sub: subSchema
      });

      const Test = db.model('gh6926', schema);

      const test = new Test({ sub: { val: 'test' } });

      return test.save().
        then(() => assert.ok(false), err => assert.equal(err.message, 'Oops')).
        then(() => Test.findOne()).
        then(doc => assert.equal(doc.sub.val, 'test'));
    });

    it('nested docs toObject() clones (gh-5008)', function(done) {
      const schema = new mongoose.Schema({
        sub: {
          height: Number
        }
      });

      const Model = db.model('gh5008', schema);

      const doc = new Model({
        sub: {
          height: 3
        }
      });

      assert.equal(doc.sub.height, 3);

      const leanDoc = doc.sub.toObject();
      assert.equal(leanDoc.height, 3);

      doc.sub.height = 55;
      assert.equal(doc.sub.height, 55);
      assert.equal(leanDoc.height, 3);

      done();
    });

    it('toObject() with null (gh-5143)', function(done) {
      const schema = new mongoose.Schema({
        customer: {
          name: { type: String, required: false }
        }
      });

      const Model = db.model('gh5143', schema);

      const model = new Model();
      model.customer = null;
      assert.strictEqual(model.toObject().customer, null);
      assert.strictEqual(model.toObject({ getters: true }).customer, null);

      done();
    });

    it('handles array subdocs with single nested subdoc default (gh-5162)', function(done) {
      const RatingsItemSchema = new mongoose.Schema({
        value: Number
      }, { versionKey: false, _id: false });

      const RatingsSchema = new mongoose.Schema({
        ratings: {
          type: RatingsItemSchema,
          default: { id: 1, value: 0 }
        },
        _id: false
      });

      const RestaurantSchema = new mongoose.Schema({
        menu: {
          type: [RatingsSchema]
        }
      });

      const Restaurant = db.model('gh5162', RestaurantSchema);

      // Should not throw
      const r = new Restaurant();
      assert.deepEqual(r.toObject().menu, []);
      done();
    });

    it('iterating through nested doc keys (gh-5078)', function(done) {
      const schema = new Schema({
        nested: {
          test1: String,
          test2: String
        }
      });

      schema.virtual('tests').get(function() {
        return Object.keys(this.nested).map(key => this.nested[key]);
      });

      const M = db.model('gh5078', schema);

      const doc = new M({ nested: { test1: 'a', test2: 'b' } });

      assert.deepEqual(doc.toObject({ virtuals: true }).tests, ['a', 'b']);

      // Should not throw
      require('util').inspect(doc);
      JSON.stringify(doc);

      done();
    });

    it('deeply nested virtual paths (gh-5250)', function(done) {
      const TestSchema = new Schema({});
      TestSchema.
        virtual('a.b.c').
        get(function() {
          return this.v;
        }).
        set(function(value) {
          this.v = value;
        });

      const TestModel = db.model('gh5250', TestSchema);
      const t = new TestModel({'a.b.c': 5});
      assert.equal(t.a.b.c, 5);

      done();
    });

    it('nested virtual when populating with parent projected out (gh-7491)', function() {
      const childSchema = Schema({
        _id: Number,
        nested: { childPath: String },
        otherPath: String
      }, { toObject: { virtuals: true } });

      childSchema.virtual('nested.childVirtual').get(() => true);

      const parentSchema = Schema({
        child: { type: Number, ref: 'gh7491_Child' }
      }, { toObject: { virtuals: true } });

      parentSchema.virtual('_nested').get(function() {
        return this.child.nested;
      });

      const Child = db.model('gh7491_Child', childSchema);
      const Parent = db.model('gh7491_Parent', parentSchema);

      return co(function*() {
        yield Child.create({
          _id: 1,
          nested: { childPath: 'foo' },
          otherPath: 'bar'
        });
        yield Parent.create({ child: 1 });

        const doc = yield Parent.findOne().populate('child', 'otherPath').
          then(doc => doc.toObject());

        assert.ok(!doc.child.nested.childPath);
      });
    });

    it('JSON.stringify nested errors (gh-5208)', function(done) {
      const AdditionalContactSchema = new Schema({
        contactName: {
          type: String,
          required: true
        },
        contactValue: {
          type: String,
          required: true
        }
      });

      const ContactSchema = new Schema({
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

      const EmergencyContactSchema = new Schema({
        contactName: {
          type: String,
          required: true
        },
        contact: ContactSchema
      });

      const EmergencyContact =
        db.model('EmergencyContact', EmergencyContactSchema);

      const contact = new EmergencyContact({
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
      const childSchema = new mongoose.Schema({});

      childSchema.pre('validate', function(next) {
        next(new Error('child pre validate'));
      });

      const parentSchema = new mongoose.Schema({
        child: childSchema
      });

      const Parent = db.model('gh5215', parentSchema);

      Parent.create({ child: {} }, function(error) {
        assert.ok(error);
        assert.ok(error.errors['child']);
        assert.equal(error.errors['child'].message, 'child pre validate');
        done();
      });
    });

    it('custom error types (gh-4009)', function(done) {
      const CustomError = function() {};

      const testSchema = new mongoose.Schema({
        num: {
          type: Number,
          required: {
            ErrorConstructor: CustomError
          },
          min: 5
        }
      });

      const Test = db.model('gh4009', testSchema);

      Test.create({}, function(error) {
        assert.ok(error);
        assert.ok(error.errors['num']);
        assert.ok(error.errors['num'] instanceof CustomError);
        Test.create({ num: 1 }, function(error) {
          assert.ok(error);
          assert.ok(error.errors['num']);
          assert.ok(error.errors['num'].constructor.name, 'ValidatorError');
          assert.ok(!(error.errors['num'] instanceof CustomError));
          done();
        });
      });
    });

    it('saving a doc with nested string array (gh-5282)', function(done) {
      const testSchema = new mongoose.Schema({
        strs: [[String]]
      });

      const Test = db.model('gh5282', testSchema);

      const t = new Test({
        strs: [['a', 'b']]
      });

      t.save(function(error, t) {
        assert.ifError(error);
        assert.deepEqual(t.toObject().strs, [['a', 'b']]);
        done();
      });
    });

    it('push() onto a nested doc array (gh-6398)', function() {
      const schema = new mongoose.Schema({
        name: String,
        array: [[{key: String, value: Number}]]
      });

      const Model = db.model('gh6398', schema);

      return co(function*() {
        yield Model.create({
          name: 'small',
          array: [[{ key: 'answer', value: 42 }]]
        });

        let doc = yield Model.findOne();

        assert.ok(doc);
        doc.array[0].push({ key: 'lucky', value: 7 });

        yield doc.save();

        doc = yield Model.findOne();
        assert.equal(doc.array.length, 1);
        assert.equal(doc.array[0].length, 2);
        assert.equal(doc.array[0][1].key, 'lucky');
      });
    });

    it('push() onto a triple nested doc array (gh-6602) (gh-6398)', function() {
      const schema = new mongoose.Schema({
        array: [[[{key: String, value: Number}]]]
      });

      const Model = db.model('gh6602', schema);

      return co(function*() {
        yield Model.create({
          array: [[[{ key: 'answer', value: 42 }]]]
        });

        let doc = yield Model.findOne();

        assert.ok(doc);
        doc.array[0][0].push({ key: 'lucky', value: 7 });

        yield doc.save();

        doc = yield Model.findOne();
        assert.equal(doc.array.length, 1);
        assert.equal(doc.array[0].length, 1);
        assert.equal(doc.array[0][0].length, 2);
        assert.equal(doc.array[0][0][1].key, 'lucky');
      });
    });

    it('null _id (gh-5236)', function(done) {
      const childSchema = new mongoose.Schema({});

      const M = db.model('gh5236', childSchema);

      const m = new M({ _id: null });
      m.save(function(error, doc) {
        assert.equal(doc._id, null);
        done();
      });
    });

    it('setting populated path with typeKey (gh-5313)', function(done) {
      const personSchema = Schema({
        name: {$type: String},
        favorite: { $type: Schema.Types.ObjectId, ref: 'gh5313' },
        books: [{ $type: Schema.Types.ObjectId, ref: 'gh5313' }]
      }, { typeKey: '$type' });

      const bookSchema = Schema({
        title: String
      });

      const Book = mongoose.model('gh5313', bookSchema);
      const Person = mongoose.model('gh5313_0', personSchema);

      const book1 = new Book({ title: 'The Jungle Book' });
      const book2 = new Book({ title: '1984' });

      const person = new Person({
        name: 'Bob',
        favorite: book1,
        books: [book1, book2]
      });

      assert.equal(person.books[0].title, 'The Jungle Book');
      assert.equal(person.books[1].title, '1984');

      done();
    });

    it('save twice with write concern (gh-5294)', function(done) {
      const schema = new mongoose.Schema({
        name: String
      }, {
        safe: {
          w: 'majority',
          wtimeout: 1e4
        }
      });

      const M = db.model('gh5294', schema);

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
      const schema = Schema({
        name: {
          type: String,
          maxlength: 63,
          required: function() {
            return false;
          }
        }
      });

      const Model = db.model('gh5296', schema);

      Model.create({ name: undefined }, function(error) {
        assert.ifError(error);
        done();
      });
    });

    it('dotted virtuals in toObject (gh-5473)', function(done) {
      const schema = new mongoose.Schema({}, {
        toObject: { virtuals: true },
        toJSON: { virtuals: true }
      });
      schema.virtual('test.a').get(function() {
        return 1;
      });
      schema.virtual('test.b').get(function() {
        return 2;
      });

      const Model = mongoose.model('gh5473', schema);

      const m = new Model({});
      assert.deepEqual(m.toJSON().test, {
        a: 1,
        b: 2
      });
      assert.deepEqual(m.toObject().test, {
        a: 1,
        b: 2
      });
      assert.equal(m.toObject({ virtuals: false }).test, void 0);
      done();
    });

    it('dotted virtuals in toObject (gh-5506)', function(done) {
      const childSchema = new Schema({
        name: String,
        _id: false
      });
      const parentSchema = new Schema({
        child: {
          type: childSchema,
          default: {}
        }
      });

      const Parent = db.model('gh5506', parentSchema);

      const p = new Parent({ child: { name: 'myName' } });

      p.save().
        then(function() {
          return Parent.findOne();
        }).
        then(function(doc) {
          doc.child = {};
          return doc.save();
        }).
        then(function() {
          return Parent.findOne();
        }).
        then(function(doc) {
          assert.deepEqual(doc.toObject().child, {});
          done();
        }).
        catch(done);
    });

    it('parent props not in child (gh-5470)', function(done) {
      const employeeSchema = new mongoose.Schema({
        name: {
          first: String,
          last: String
        },
        department: String
      });
      const Employee = mongoose.model('gh5470', employeeSchema);

      const employee = new Employee({
        name: {
          first: 'Ron',
          last: 'Swanson'
        },
        department: 'Parks and Recreation'
      });
      const ownPropertyNames = Object.getOwnPropertyNames(employee.name);

      assert.ok(ownPropertyNames.indexOf('department') === -1, ownPropertyNames.join(','));
      assert.ok(ownPropertyNames.indexOf('first') !== -1, ownPropertyNames.join(','));
      assert.ok(ownPropertyNames.indexOf('last') !== -1, ownPropertyNames.join(','));
      done();
    });

    it('modifying array with existing ids (gh-5523)', function(done) {
      const friendSchema = new mongoose.Schema(
        {
          _id: String,
          name: String,
          age: Number,
          dob: Date
        },
        { _id: false });

      const socialSchema = new mongoose.Schema(
        {
          friends: [friendSchema]
        },
        { _id: false });

      const userSchema = new mongoose.Schema({
        social: {
          type: socialSchema,
          required: true
        }
      });

      const User = db.model('gh5523', userSchema);

      const user = new User({
        social: {
          friends: [
            { _id: 'val', age: 28 }
          ]
        }
      });

      user.social.friends = [{ _id: 'val', name: 'Val' }];

      assert.deepEqual(user.toObject().social.friends[0], {
        _id: 'val',
        name: 'Val'
      });

      user.save(function(error) {
        assert.ifError(error);
        User.findOne({ _id: user._id }, function(error, doc) {
          assert.ifError(error);
          assert.deepEqual(doc.toObject().social.friends[0], {
            _id: 'val',
            name: 'Val'
          });
          done();
        });
      });
    });

    it('consistent setter context for single nested (gh-5363)', function(done) {
      const contentSchema = new Schema({
        blocks: [{ type: String }],
        summary: { type: String }
      });

      // Subdocument setter
      const contexts = [];
      contentSchema.path('blocks').set(function(srcBlocks) {
        if (!this.ownerDocument().isNew) {
          contexts.push(this.toObject());
        }

        return srcBlocks;
      });

      const noteSchema = new Schema({
        title: { type: String, required: true },
        body: contentSchema
      });

      const Note = db.model('gh5363', noteSchema);

      const note = new Note({
        title: 'Lorem Ipsum Dolor',
        body: {
          summary: 'Summary Test',
          blocks: ['html']
        }
      });

      note.save().
        then(function(note) {
          assert.equal(contexts.length, 0);
          note.set('body', {
            summary: 'New Summary',
            blocks: ['gallery', 'html']
          });
          return note.save();
        }).
        then(function() {
          assert.equal(contexts.length, 1);
          assert.deepEqual(contexts[0].blocks, ['html']);
          done();
        }).
        catch(done);
    });

    it('deeply nested subdocs and markModified (gh-5406)', function(done) {
      const nestedValueSchema = new mongoose.Schema({
        _id: false,
        value: Number
      });
      const nestedPropertySchema = new mongoose.Schema({
        _id: false,
        active: Boolean,
        nestedValue: nestedValueSchema
      });
      const nestedSchema = new mongoose.Schema({
        _id: false,
        nestedProperty: nestedPropertySchema,
        nestedTwoProperty: nestedPropertySchema
      });
      const optionsSchema = new mongoose.Schema({
        _id: false,
        nestedField: nestedSchema
      });
      const TestSchema = new mongoose.Schema({
        fieldOne: String,
        options: optionsSchema
      });

      const Test = db.model('gh5406', TestSchema);

      const doc = new Test({
        fieldOne: 'Test One',
        options: {
          nestedField: {
            nestedProperty: {
              active: true,
              nestedValue: {
                value: 42
              }
            }
          }
        }
      });

      doc.
        save().
        then(function(doc) {
          doc.options.nestedField.nestedTwoProperty = {
            active: true,
            nestedValue: {
              value: 1337
            }
          };

          assert.ok(doc.isModified('options'));

          return doc.save();
        }).
        then(function(doc) {
          return Test.findById(doc._id);
        }).
        then(function(doc) {
          assert.equal(doc.options.nestedField.nestedTwoProperty.nestedValue.value,
            1337);
          done();
        }).
        catch(done);
    });

    it('single nested subdoc post remove hooks (gh-5388)', function(done) {
      const contentSchema = new Schema({
        blocks: [{ type: String }],
        summary: { type: String }
      });

      let called = 0;

      contentSchema.post('remove', function() {
        ++called;
      });

      const noteSchema = new Schema({
        body: { type: contentSchema }
      });

      const Note = db.model('gh5388', noteSchema);

      const note = new Note({
        title: 'Lorem Ipsum Dolor',
        body: {
          summary: 'Summary Test',
          blocks: ['html']
        }
      });

      note.save(function(error) {
        assert.ifError(error);
        note.remove(function(error) {
          assert.ifError(error);
          setTimeout(function() {
            assert.equal(called, 1);
            done();
          }, 50);
        });
      });
    });

    it('push populated doc onto empty array triggers manual population (gh-5504)', function(done) {
      const ReferringSchema = new Schema({
        reference: [{
          type: Schema.Types.ObjectId,
          ref: 'gh5504'
        }]
      });

      const Referrer = db.model('gh5504', ReferringSchema);

      const referenceA = new Referrer();
      const referenceB = new Referrer();

      const referrerA = new Referrer({reference: [referenceA]});
      const referrerB = new Referrer();
      const referrerC = new Referrer();
      const referrerD = new Referrer();
      const referrerE = new Referrer();

      referrerA.reference.push(referenceB);
      assert.ok(referrerA.reference[0] instanceof Referrer);
      assert.ok(referrerA.reference[1] instanceof Referrer);

      referrerB.reference.push(referenceB);
      assert.ok(referrerB.reference[0] instanceof Referrer);

      referrerC.reference.unshift(referenceB);
      assert.ok(referrerC.reference[0] instanceof Referrer);

      referrerD.reference.splice(0, 0, referenceB);
      assert.ok(referrerD.reference[0] instanceof Referrer);

      referrerE.reference.addToSet(referenceB);
      assert.ok(referrerE.reference[0] instanceof Referrer);

      done();
    });

    it('single nested conditional required scope (gh-5569)', function(done) {
      const scopes = [];

      const ThingSchema = new mongoose.Schema({
        undefinedDisallowed: {
          type: String,
          required: function() {
            scopes.push(this);
            return this.undefinedDisallowed === undefined;
          },
          default: null
        }
      });

      const SuperDocumentSchema = new mongoose.Schema({
        thing: {
          type: ThingSchema,
          default: function() { return {}; }
        }
      });

      const SuperDocument = db.model('gh5569', SuperDocumentSchema);

      let doc = new SuperDocument();
      doc.thing.undefinedDisallowed = null;

      doc.save(function(error) {
        assert.ifError(error);
        doc = new SuperDocument();
        doc.thing.undefinedDisallowed = undefined;
        doc.save(function(error) {
          assert.ok(error);
          assert.ok(error.errors['thing.undefinedDisallowed']);
          done();
        });
      });
    });

    it('single nested setters only get called once (gh-5601)', function(done) {
      const vals = [];
      const ChildSchema = new mongoose.Schema({
        number: {
          type: String,
          set: function(v) {
            vals.push(v);
            return v;
          }
        },
        _id: false
      });
      ChildSchema.set('toObject', { getters: true, minimize: false });

      const ParentSchema = new mongoose.Schema({
        child: {
          type: ChildSchema,
          default: {}
        }
      });

      const Parent = db.model('gh5601', ParentSchema);
      const p = new Parent();
      p.child = { number: '555.555.0123' };
      assert.equal(vals.length, 1);
      assert.equal(vals[0], '555.555.0123');
      done();
    });

    it('single getters only get called once (gh-7442)', function() {
      let called = 0;

      const childSchema = new Schema({
        value: {
          type: String,
          get: function(v) {
            ++called;
            return v;
          }
        }
      });

      const schema = new Schema({
        name: childSchema
      });
      const Model = db.model('gh7442', schema);

      const doc = new Model({ 'name.value': 'test' });

      called = 0;

      doc.toObject({ getters: true });
      assert.equal(called, 1);

      doc.toObject({ getters: false });
      assert.equal(called, 1);

      return Promise.resolve();
    });

    it('setting doc array to array of top-level docs works (gh-5632)', function(done) {
      const MainSchema = new Schema({
        name: { type: String },
        children: [{
          name: { type: String }
        }]
      });
      const RelatedSchema = new Schema({ name: { type: String } });
      const Model = db.model('gh5632', MainSchema);
      const RelatedModel = db.model('gh5632_0', RelatedSchema);

      RelatedModel.create({ name: 'test' }, function(error, doc) {
        assert.ifError(error);
        Model.create({ name: 'test1', children: [doc] }, function(error, m) {
          assert.ifError(error);
          m.children = [doc];
          m.save(function(error) {
            assert.ifError(error);
            assert.equal(m.children.length, 1);
            assert.equal(m.children[0].name, 'test');
            done();
          });
        });
      });
    });

    it('Using set as a schema path (gh-1939)', function(done) {
      const testSchema = new Schema({ set: String });

      const Test = db.model('gh1939', testSchema);

      const t = new Test({ set: 'test 1' });
      assert.equal(t.set, 'test 1');
      t.save(function(error) {
        assert.ifError(error);
        t.set = 'test 2';
        t.save(function(error) {
          assert.ifError(error);
          assert.equal(t.set, 'test 2');
          done();
        });
      });
    });

    it('handles array defaults correctly (gh-5780)', function(done) {
      const testSchema = new Schema({
        nestedArr: {
          type: [[Number]],
          default: [[0, 1]]
        }
      });

      const Test = db.model('gh5780', testSchema);

      const t = new Test({});
      assert.deepEqual(t.toObject().nestedArr, [[0, 1]]);

      t.nestedArr.push([1, 2]);
      const t2 = new Test({});
      assert.deepEqual(t2.toObject().nestedArr, [[0, 1]]);

      done();
    });

    it('sets path to the empty string on save after query (gh-6477)', function() {
      const schema = new Schema({
        name: String,
        s: {
          type: String,
          default: ''
        }
      });

      const Test = db.model('gh6477_2', schema);

      const test = new Test;
      assert.strictEqual(test.s, '');

      return co(function* () {
        // use native driver directly to insert an empty doc
        yield Test.collection.insertOne({});

        // udate the doc with the expectation that default booleans will be saved.
        const found = yield Test.findOne({});
        found.name = 'Max';
        yield found.save();

        // use native driver directly to check doc for saved string
        const final = yield Test.collection.findOne({});
        assert.strictEqual(final.name, 'Max');
        assert.strictEqual(final.s, '');
      });
    });

    it('sets path to the default boolean on save after query (gh-6477)', function() {
      const schema = new Schema({
        name: String,
        f: {
          type: Boolean,
          default: false
        },
        t: {
          type: Boolean,
          default: true
        }
      });

      const Test = db.model('gh6477', schema);

      return co(function* () {
        // use native driver directly to kill the fields
        yield Test.collection.insertOne({});

        // udate the doc with the expectation that default booleans will be saved.
        const found = yield Test.findOne({});
        found.name = 'Britney';
        yield found.save();

        // use native driver directly to check doc for saved string
        const final = yield Test.collection.findOne({});
        assert.strictEqual(final.name, 'Britney');
        assert.strictEqual(final.t, true);
        assert.strictEqual(final.f, false);
      });
    });

    it('virtuals with no getters return undefined (gh-6223)', function(done) {
      const personSchema = new mongoose.Schema({
        name: { type: String },
        children: [{
          name: { type: String }
        }]
      }, {
        toObject: { getters: true, virtuals: true },
        toJSON: { getters: true, virtuals: true },
        id: false
      });

      personSchema.virtual('favoriteChild').set(function(v) {
        return this.set('children.0', v);
      });

      personSchema.virtual('heir').get(function() {
        return this.get('children.0');
      });

      const Person = db.model('gh6223', personSchema);

      const person = new Person({
        name: 'Anakin'
      });

      assert.strictEqual(person.favoriteChild, void 0);
      assert.ok(!('favoriteChild' in person.toJSON()));
      assert.ok(!('favoriteChild' in person.toObject()));

      done();
    });

    it('add default getter/setter (gh-6262)', function(done) {
      const testSchema = new mongoose.Schema({});

      testSchema.virtual('totalValue');

      const Test = db.model('gh6262', testSchema);

      assert.equal(Test.schema.virtuals.totalValue.getters.length, 1);
      assert.equal(Test.schema.virtuals.totalValue.setters.length, 1);

      const doc = new Test();
      doc.totalValue = 5;
      assert.equal(doc.totalValue, 5);

      done();
    });

    it('nested virtuals + nested toJSON (gh-6294)', function() {
      const schema = mongoose.Schema({
        nested: {
          prop: String
        }
      }, { _id: false, id: false });

      schema.virtual('nested.virtual').get(() => 'test 2');

      schema.set('toJSON', {
        virtuals: true
      });

      const MyModel = db.model('gh6294', schema);

      const doc = new MyModel({ nested: { prop: 'test 1' } });

      assert.deepEqual(doc.toJSON(), {
        nested: { prop: 'test 1', virtual: 'test 2' }
      });
      assert.deepEqual(doc.nested.toJSON(), {
        prop: 'test 1', virtual: 'test 2'
      });
    });

    it('Disallows writing to __proto__ and other special properties', function(done) {
      const schema = new mongoose.Schema({
        name: String
      }, { strict: false });

      const Model = db.model('prototest', schema);
      const doc = new Model({ '__proto__.x': 'foo' });

      assert.strictEqual(Model.x, void 0);
      doc.set('__proto__.y', 'bar');

      assert.strictEqual(Model.y, void 0);

      doc.set('constructor.prototype.z', 'baz');

      assert.strictEqual(Model.z, void 0);

      done();
    });

    it('save() depopulates pushed arrays (gh-6048)', function() {
      const blogPostSchema = new Schema({
        comments: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'gh6048_0'
        }]
      });

      const BlogPost = db.model('gh6048', blogPostSchema);

      const commentSchema = new Schema({
        text: String
      });

      const Comment = db.model('gh6048_0', commentSchema);

      return co(function*() {
        let blogPost = yield BlogPost.create({});
        const comment = yield Comment.create({ text: 'Hello' });

        blogPost = yield BlogPost.findById(blogPost);
        blogPost.comments.push(comment);
        yield blogPost.save();

        const savedBlogPost = yield BlogPost.collection.
          findOne({ _id: blogPost._id });
        assert.equal(savedBlogPost.comments.length, 1);
        assert.equal(savedBlogPost.comments[0].constructor.name, 'ObjectID');
        assert.equal(savedBlogPost.comments[0].toString(),
          blogPost.comments[0]._id.toString());
      });
    });

    it('Handles setting populated path set via `Document#populate()` (gh-7302)', function() {
      const authorSchema = new Schema({ name: String });
      const bookSchema = new Schema({
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'gh7302_Author' }
      });

      const Author = db.model('gh7302_Author', authorSchema);
      const Book = db.model('gh7302_Book', bookSchema);

      return Author.create({ name: 'Victor Hugo' }).
        then(function(author) { return Book.create({ author: author._id }); }).
        then(function() { return Book.findOne(); }).
        then(function(doc) { return doc.populate('author').execPopulate(); }).
        then(function(doc) {
          doc.author = {};
          assert.ok(!doc.author.name);
          assert.ifError(doc.validateSync());
        });
    });

    it('Single nested subdocs using discriminator can be modified (gh-5693)', function(done) {
      const eventSchema = new Schema({ message: String }, {
        discriminatorKey: 'kind',
        _id: false
      });

      const trackSchema = new Schema({ event: eventSchema });

      trackSchema.path('event').discriminator('Clicked', new Schema({
        element: String
      }, { _id: false }));

      trackSchema.path('event').discriminator('Purchased', new Schema({
        product: String
      }, { _id: false }));

      const MyModel = db.model('gh5693', trackSchema);

      const doc = new MyModel({
        event: {
          message: 'Test',
          kind: 'Clicked',
          element: 'Amazon Link'
        }
      });

      doc.save(function(error) {
        assert.ifError(error);
        assert.equal(doc.event.message, 'Test');
        assert.equal(doc.event.kind, 'Clicked');
        assert.equal(doc.event.element, 'Amazon Link');

        doc.set('event', {
          kind: 'Purchased',
          product: 'Professional AngularJS'
        });

        doc.save(function(error) {
          assert.ifError(error);
          assert.equal(doc.event.kind, 'Purchased');
          assert.equal(doc.event.product, 'Professional AngularJS');
          assert.ok(!doc.event.element);
          assert.ok(!doc.event.message);
          done();
        });
      });
    });

    it('required function only gets called once (gh-6801)', function() {
      let reqCount = 0;
      const childSchema = new Schema({
        name: {
          type: String,
          required: function() {
            reqCount++;
            return true;
          }
        }
      });
      const Child = mongoose.model('gh6801_Child', childSchema);

      const parentSchema = new Schema({
        name: String,
        child: childSchema
      });
      const Parent = mongoose.model('gh6801_Parent', parentSchema);

      const child = new Child(/* name is required */);
      const parent = new Parent({ child: child });

      return parent.validate().then(
        () => assert.ok(false),
        error => {
          assert.equal(reqCount, 1);
          assert.ok(error.errors['child.name']);
        }
      );
    });

    it('required function called again after save() (gh-6892)', function() {
      const schema = new mongoose.Schema({
        field: {
          type: String,
          default: null,
          required: function() { return this && this.field === undefined; }
        }
      });
      const Model = db.model('gh6892', schema);

      return co(function*() {
        yield Model.create({});
        const doc1 = yield Model.findOne({}).select({_id: 1});
        yield doc1.save();

        // Should not throw
        yield Model.create({});
      });
    });

    it('doc array: set then remove (gh-3511)', function(done) {
      const ItemChildSchema = new mongoose.Schema({
        name: {
          type: String,
          required: true
        }
      });

      const ItemParentSchema = new mongoose.Schema({
        children: [ItemChildSchema]
      });

      const ItemParent = db.model('gh3511', ItemParentSchema);

      const p = new ItemParent({
        children: [{ name: 'test1' }, { name: 'test2' }]
      });

      p.save(function(error) {
        assert.ifError(error);
        ItemParent.findById(p._id, function(error, doc) {
          assert.ifError(error);
          assert.ok(doc);
          assert.equal(doc.children.length, 2);

          doc.children[1].name = 'test3';
          doc.children.remove(doc.children[0]);

          doc.save(function(error) {
            assert.ifError(error);
            ItemParent.findById(doc._id, function(error, doc) {
              assert.ifError(error);
              assert.equal(doc.children.length, 1);
              assert.equal(doc.children[0].name, 'test3');
              done();
            });
          });
        });
      });
    });

    it('doc array: modify then sort (gh-7556)', function() {
      const assetSchema = new Schema({
        name: { type: String, required: true },
        namePlural: { type: String, required: true }
      });
      assetSchema.pre('validate', function() {
        if (this.isNew) {
          this.namePlural = this.name + 's';
        }
      });
      const personSchema = new Schema({
        name: String,
        assets: [assetSchema]
      });

      const Person = db.model('gh7556', personSchema);

      return co(function*() {
        yield Person.create({
          name: 'test',
          assets: [{ name: 'Cash', namePlural: 'Cash' }]
        });
        const p = yield Person.findOne();

        p.assets.push({ name: 'Home' });
        p.assets.id(p.assets[0].id).set('name', 'Cash');
        p.assets.id(p.assets[0].id).set('namePlural', 'Cash');

        p.assets.sort((doc1, doc2) => doc1.name > doc2.name ? -1 : 1);

        yield p.save();
      });
    });

    it('modifying unselected nested object (gh-5800)', function() {
      const MainSchema = new mongoose.Schema({
        a: {
          b: {type: String, default: 'some default'},
          c: {type: Number, default: 0},
          d: {type: String}
        },
        e: {type: String}
      });

      MainSchema.pre('save', function(next) {
        if (this.isModified()) {
          this.set('a.c', 100, Number);
        }
        next();
      });

      const Main = db.model('gh5800', MainSchema);

      const doc = { a: { b: 'not the default', d: 'some value' }, e: 'e' };
      return Main.create(doc).
        then(function(doc) {
          assert.equal(doc.a.b, 'not the default');
          assert.equal(doc.a.d, 'some value');
          return Main.findOne().select('e');
        }).
        then(function(doc) {
          doc.e = 'e modified';
          return doc.save();
        }).
        then(function() {
          return Main.findOne();
        }).
        then(function(doc) {
          assert.equal(doc.a.b, 'not the default');
          assert.equal(doc.a.d, 'some value');
        });
    });

    it('set() underneath embedded discriminator (gh-6482)', function() {
      const mediaSchema = new Schema({ file: String },
        { discriminatorKey: 'kind', _id: false });

      const photoSchema = new Schema({ position: String });
      const pageSchema = new Schema({ media: mediaSchema });

      pageSchema.path('media').discriminator('photo', photoSchema);

      const Page = db.model('gh6482_Page', pageSchema);

      return co(function*() {
        let doc = yield Page.create({
          media: { kind: 'photo', file: 'cover.jpg', position: 'left' }
        });

        // Using positional args syntax
        doc.set('media.position', 'right');
        assert.equal(doc.media.position, 'right');

        yield doc.save();

        doc = yield Page.findById(doc._id);
        assert.equal(doc.media.position, 'right');

        // Using object syntax
        doc.set({ 'media.position': 'left' });
        assert.equal(doc.media.position, 'left');

        yield doc.save();

        doc = yield Page.findById(doc._id);
        assert.equal(doc.media.position, 'left');
      });
    });

    it('set() underneath array embedded discriminator (gh-6526)', function() {
      const mediaSchema = new Schema({ file: String },
        { discriminatorKey: 'kind', _id: false });

      const photoSchema = new Schema({ position: String });
      const pageSchema = new Schema({ media: [mediaSchema] });

      pageSchema.path('media').discriminator('photo', photoSchema);

      const Page = db.model('gh6526_Page', pageSchema);

      return co(function*() {
        let doc = yield Page.create({
          media: [{ kind: 'photo', file: 'cover.jpg', position: 'left' }]
        });

        // Using positional args syntax
        doc.set('media.0.position', 'right');
        assert.equal(doc.media[0].position, 'right');

        yield doc.save();

        doc = yield Page.findById(doc._id);
        assert.equal(doc.media[0].position, 'right');
      });
    });

    it('consistent context for nested docs (gh-5347)', function(done) {
      const contexts = [];
      const childSchema = new mongoose.Schema({
        phoneNumber: {
          type: String,
          required: function() {
            contexts.push(this);
            return this.notifications.isEnabled;
          }
        },
        notifications: {
          isEnabled: { type: Boolean, required: true }
        }
      });

      const parentSchema = new mongoose.Schema({
        name: String,
        children: [childSchema]
      });

      const Parent = db.model('gh5347', parentSchema);

      Parent.create({
        name: 'test',
        children: [
          {
            phoneNumber: '123',
            notifications: {
              isEnabled: true
            }
          }
        ]
      }, function(error, doc) {
        assert.ifError(error);
        const child = doc.children.id(doc.children[0]._id);
        child.phoneNumber = '345';
        assert.equal(contexts.length, 1);
        doc.save(function(error) {
          assert.ifError(error);
          assert.equal(contexts.length, 2);
          assert.ok(contexts[0].toObject().notifications.isEnabled);
          assert.ok(contexts[1].toObject().notifications.isEnabled);
          done();
        });
      });
    });

    it('accessing arrays in setters on initial document creation (gh-6155)', function(done) {
      const artistSchema = new mongoose.Schema({
        name: {
          type: String,
          set: function(v) {
            const sp = v.split(' ');
            for (let i = 0; i < sp.length; ++i) {
              this.keywords.push(sp[i]);
            }
            return v;
          }
        },
        keywords: [String]
      });

      const Artist = db.model('gh6155', artistSchema);

      const artist = new Artist({ name: 'Motley Crue' });
      assert.deepEqual(artist.toObject().keywords, ['Motley', 'Crue']);

      done();
    });

    it('handles 2nd level nested field with null child (gh-6187)', function(done) {
      const NestedSchema = new Schema({
        parent: new Schema({
          name: String,
          child: {
            name: String
          }
        }, { strict: false })
      });
      const NestedModel = db.model('Nested', NestedSchema);
      const n = new NestedModel({
        parent: {
          name: 'foo',
          child: null // does not fail if undefined
        }
      });

      assert.equal(n.parent.name, 'foo');

      done();
    });

    it('does not call default function on init if value set (gh-6410)', function() {
      let called = 0;

      function generateRandomID() {
        called++;
        return called;
      }

      const TestDefaultsWithFunction = db.model('gh6410', new Schema({
        randomID: {type: Number, default: generateRandomID}
      }));

      const post = new TestDefaultsWithFunction;
      assert.equal(post.get('randomID'), 1);
      assert.equal(called, 1);

      return co(function*() {
        yield post.save();

        yield TestDefaultsWithFunction.findById(post._id);

        assert.equal(called, 1);
      });
    });

    it('convertToFalse and convertToTrue (gh-6758)', function() {
      const TestSchema = new Schema({ b: Boolean });
      const Test = db.model('gh6758', TestSchema);

      mongoose.Schema.Types.Boolean.convertToTrue.add('aye');
      mongoose.Schema.Types.Boolean.convertToFalse.add('nay');

      const doc1 = new Test({ b: 'aye' });
      const doc2 = new Test({ b: 'nay' });

      assert.strictEqual(doc1.b, true);
      assert.strictEqual(doc2.b, false);

      return doc1.save().
        then(() => Test.findOne({ b: { $exists: 'aye' } })).
        then(doc => assert.ok(doc)).
        then(() => {
          mongoose.Schema.Types.Boolean.convertToTrue.delete('aye');
          mongoose.Schema.Types.Boolean.convertToFalse.delete('nay');
        });
    });

    it('doesnt double-call getters when using get() (gh-6779)', function() {
      const schema = new Schema({
        nested: {
          arr: [{ key: String }]
        }
      });

      schema.path('nested.arr.0.key').get(v => {
        return 'foobar' + v;
      });

      const M = db.model('gh6779', schema);
      const test = new M();

      test.nested.arr.push({ key: 'value' });
      test.nested.arr.push({ key: 'value2' });

      assert.equal(test.get('nested.arr.0.key'), 'foobarvalue');
      assert.equal(test.get('nested.arr.1.key'), 'foobarvalue2');

      return Promise.resolve();
    });

    it('returns doubly nested field in inline sub schema when using get() (gh-6925)', function() {
      const child = new Schema({
        nested: {
          key: String
        }
      });
      const parent = new Schema({
        child: child
      });

      const M = db.model('gh6925', parent);
      const test = new M({
        child: {
          nested: {
            key: 'foobarvalue'
          }
        }
      });

      assert.equal(test.get('child.nested.key'), 'foobarvalue');

      return Promise.resolve();
    });

    it('defaults should see correct isNew (gh-3793)', function() {
      let isNew = [];
      const TestSchema = new mongoose.Schema({
        test: {
          type: Date,
          default: function() {
            isNew.push(this.isNew);
            if (this.isNew) {
              return Date.now();
            }
            return void 0;
          }
        }
      });

      const TestModel = db.model('gh3793', TestSchema);

      return co(function*() {
        yield Promise.resolve(db);

        yield TestModel.collection.insertOne({});

        let doc = yield TestModel.findOne({});
        assert.strictEqual(doc.test, void 0);
        assert.deepEqual(isNew, [false]);

        isNew = [];

        doc = yield TestModel.create({});
        assert.ok(doc.test instanceof Date);
        assert.deepEqual(isNew, [true]);
      });
    });

    it('modify multiple subdoc paths (gh-4405)', function(done) {
      const ChildObjectSchema = new Schema({
        childProperty1: String,
        childProperty2: String,
        childProperty3: String
      });

      const ParentObjectSchema = new Schema({
        parentProperty1: String,
        parentProperty2: String,
        child: ChildObjectSchema
      });

      const Parent = db.model('gh4405', ParentObjectSchema);

      const p = new Parent({
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

    it('doesnt try to cast populated embedded docs (gh-6390)', function() {
      const otherSchema = new Schema({
        name: String
      });

      const subSchema = new Schema({
        my: String,
        other: {
          type: Schema.Types.ObjectId,
          refPath: 'sub.my'
        }
      });

      const schema = new Schema({
        name: String,
        sub: subSchema
      });

      const Other = db.model('gh6390', otherSchema);
      const Test = db.model('6h6390_2', schema);

      const other = new Other({ name: 'Nicole' });

      const test = new Test({
        name: 'abc',
        sub: {
          my: 'gh6390',
          other: other._id
        }
      });
      return co(function* () {
        yield other.save();
        yield test.save();
        const doc = yield Test.findOne({}).populate('sub.other');
        assert.strictEqual('Nicole', doc.sub.other.name);
      });
    });
  });

  describe('clobbered Array.prototype', function() {
    afterEach(function() {
      delete Array.prototype.remove;
    });

    it('handles clobbered Array.prototype.remove (gh-6431)', function(done) {
      Object.defineProperty(Array.prototype, 'remove', {
        value: 42,
        configurable: true,
        writable: false
      });

      const schema = new Schema({ arr: [{ name: String }] });
      const MyModel = db.model('gh6431', schema);

      const doc = new MyModel();
      assert.deepEqual(doc.toObject().arr, []);
      done();
    });

    it('calls array validators again after save (gh-6818)', function() {
      const schema = new Schema({
        roles: {
          type: [{
            name: String,
            folders: {
              type: [{ folderId: String }],
              validate: v => assert.ok(v.length === new Set(v.map(el => el.folderId)).size, 'Duplicate')
            }
          }]
        }
      });
      const Model = db.model('gh6818', schema);

      return co(function*() {
        yield Model.create({
          roles: [
            { name: 'admin' },
            { name: 'mod', folders: [{ folderId: 'foo' }] }
          ]
        });

        const doc = yield Model.findOne();

        doc.roles[1].folders.push({ folderId: 'bar' });

        yield doc.save();

        doc.roles[1].folders[1].folderId = 'foo';
        let threw = false;
        try {
          yield doc.save();
        } catch (error) {
          threw = true;
          assert.equal(error.errors['roles.1.folders'].reason.message, 'Duplicate');
        }
        assert.ok(threw);
      });
    });

    it('set single nested to num throws ObjectExpectedError (gh-6710) (gh-6753)', function() {
      const schema = new Schema({
        nested: new Schema({
          num: Number
        })
      });

      const Test = mongoose.model('gh6710', schema);

      const doc = new Test({ nested: { num: 123 } });
      doc.nested = 123;

      return doc.validate().
        then(() => { throw new Error('Should have errored'); }).
        catch(err => {
          assert.ok(err.message.indexOf('Cast to Embedded') !== -1, err.message);
          assert.equal(err.errors['nested'].reason.name, 'ObjectExpectedError');

          const doc = new Test({ nested: { num: 123 } });
          doc.nested = [];
          return doc.validate();
        }).
        then(() => { throw new Error('Should have errored'); }).
        catch(err => {
          assert.ok(err.message.indexOf('Cast to Embedded') !== -1, err.message);
          assert.equal(err.errors['nested'].reason.name, 'ObjectExpectedError');
        });
    });

    it('set array to false throws ObjectExpectedError (gh-7242)', function() {
      const Child = new mongoose.Schema({});
      const Parent = new mongoose.Schema({
        children: [Child]
      });
      const ParentModel = db.model('gh7242', Parent);
      const doc = new ParentModel({ children: false });

      return doc.save().then(
        () => assert.ok(false),
        err => {
          assert.ok(err.errors['children']);
          assert.equal(err.errors['children'].name, 'ObjectParameterError');
        }
      );
    });
  });

  it('does not save duplicate items after two saves (gh-6900)', function() {
    const M = db.model('gh6900', {items: [{name: String}]});
    const doc = new M();
    doc.items.push({ name: '1' });

    return co(function*() {
      yield doc.save();
      doc.items.push({ name: '2' });
      yield doc.save();

      const found = yield M.findById(doc.id);
      assert.equal(found.items.length, 2);
    });
  });

  it('validateSync() on embedded doc (gh-6931)', function() {
    const innerSchema = new mongoose.Schema({
      innerField: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      }
    });

    const schema = new mongoose.Schema({
      field: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      },
      inner: [innerSchema]
    });

    const Model = db.model('gh6931', schema);

    return co(function*() {
      const doc2 = new Model();
      doc2.field = mongoose.Types.ObjectId();
      doc2.inner.push({
        innerField: mongoose.Types.ObjectId()
      });
      doc2.inner[0].innerField = '';

      let err = doc2.inner[0].validateSync();
      assert.ok(err);
      assert.ok(err.errors['innerField']);

      err = yield doc2.inner[0].validate().then(() => assert.ok(false), err => err);
      assert.ok(err);
      assert.ok(err.errors['innerField']);
    });
  });

  it('retains user-defined key order with nested docs (gh-6944)', function() {
    const schema = new Schema({
      _id: String,
      foo: String,
      bar: {
        a: String
      }
    });

    const Model = db.model('gh6944', schema);

    const doc = new Model({ _id: 'test', foo: 'hello', bar: { a: 'world' } });

    // Same order as in the initial set above
    assert.deepEqual(Object.keys(doc._doc), ['_id', 'foo', 'bar']);

    return Promise.resolve();
  });

  it('does not mark modified if setting nested subdoc to same value (gh-7048)', function() {
    const BarSchema = new Schema({ bar: String }, { _id: false });
    const FooNestedSchema = new Schema({ foo: BarSchema });

    const Model = db.model('gh7048', FooNestedSchema);

    return co(function*() {
      const doc = yield Model.create({ foo: { bar: 'test' } });
      doc.set({ foo: { bar: 'test' } });

      assert.deepEqual(doc.modifiedPaths(), []);

      doc.set('foo.bar', 'test');

      assert.deepEqual(doc.modifiedPaths(), []);
    });
  });

  it('allow saving validation error in db (gh-7127)', function() {
    return co(function*() {
      const schema = new Schema({
        error: mongoose.Schema.Types.Mixed,
        name: { type: String, required: true }
      });
      const Model = db.model('gh7127', schema);

      const doc = new Model();

      const error = yield doc.validate().catch(error => error);

      doc.name = 'foo';
      doc.error = error;

      yield doc.save();

      const fromDb = yield Model.findOne();
      assert.ok(fromDb.error.errors.name);
    });
  });

  it('storeSubdocValidationError (gh-6802)', function() {
    return co(function*() {
      const GrandchildSchema = new Schema({
        name: {
          type: String,
          required: true
        }
      }, { storeSubdocValidationError: false });

      const ChildSchema = new Schema({
        name: String,
        child: GrandchildSchema
      }, { storeSubdocValidationError: false });

      const ParentSchema = new Schema({
        name: String,
        child: ChildSchema
      });
      const Parent = db.model('gh6802', ParentSchema);

      const parent = new Parent({ child: { child: {} } });

      let err = yield parent.validate().then(() => null, err => err);
      assert.ok(err);
      assert.ok(err.errors['child.child.name']);
      assert.ok(!err.errors['child']);
      assert.ok(!err.errors['child.child']);

      err = parent.validateSync();
      assert.ok(err);
      assert.ok(err.errors['child.child.name']);
      assert.ok(!err.errors['child']);
      assert.ok(!err.errors['child.child']);
    });
  });

  it('handles mixed arrays with all syntaxes (gh-7109)', function() {
    const schema = new Schema({
      arr1: [Schema.Types.Mixed],
      arr2: [{}],
      arr3: [Object]
    });

    const Test = db.model('gh7109', schema);

    const test = new Test({
      arr1: ['test1', { two: 'three' }, [4, 'five', 6]],
      arr2: ['test2', { three: 'four' }, [5, 'six', 7]],
      arr3: ['test3', { four: 'five' }, [6, 'seven', 8]]
    });

    assert.ok(test.validateSync() == null, test.validateSync());

    return Promise.resolve();
  });

  it('supports validator.isUUID as a custom validator (gh-7145)', function() {
    const schema = new Schema({
      name: {
        type: String,
        validate: [validator.isUUID, 'invalid name']
      }
    });

    const Test = db.model('gh7145', schema);

    const doc = new Test({ name: 'not-a-uuid' });
    const error = doc.validateSync();
    assert.ok(error instanceof Error);
    assert.ok(/invalid name/.test(error.message));

    return co(function*() {
      const error = yield doc.validate().then(() => null, err => err);

      assert.ok(error instanceof Error);
      assert.ok(/invalid name/.test(error.message));
    });
  });

  it('propsParameter option (gh-7145)', function() {
    const schema = new Schema({
      name: {
        type: String,
        validate: {
          validator: (v, props) => props.validator != null,
          propsParameter: true
        }
      }
    });

    const Test = db.model('gh7145_0', schema);

    const doc = new Test({ name: 'foo' });
    const error = doc.validateSync();
    assert.ok(error == null, error);

    return co(function*() {
      const error = yield doc.validate().then(() => null, err => err);

      assert.ok(error == null, error);
    });
  });

  it('surfaces errors in subdoc pre validate (gh-7187)', function() {
    const InnerSchema = new Schema({ name: String });

    InnerSchema.pre('validate', function() {
      throw new Error('Oops!');
    });

    const TestSchema = new Schema({ subdocs: [InnerSchema] });

    const Test = db.model('gh7187', TestSchema);

    return Test.create({ subdocs: [{ name: 'foo' }] }).then(
      () => { throw new Error('Fail'); },
      err => { assert.ok(err.message.indexOf('Oops!') !== -1, err.message); }
    );
  });

  it('runs setter only once when doing .set() underneath single nested (gh-7196)', function() {
    let called = [];
    const InnerSchema = new Schema({
      name: String,
      withSetter: {
        type: String,
        set: function(v) {
          called.push(this);
          return v;
        }
      }
    });

    const TestSchema = new Schema({ nested: InnerSchema });

    const Model = db.model('gh7196', TestSchema);

    const doc = new Model({ nested: { name: 'foo' } });

    // Make sure setter only gets called once
    called = [];
    doc.set('nested.withSetter', 'bar');

    assert.equal(called.length, 1);
    assert.equal(called[0].name, 'foo');

    return Promise.resolve();
  });

  it('should enable key with dot(.) on mixed types with checkKeys (gh-7144)', function() {
    const s = new Schema({ raw: { type: Schema.Types.Mixed } });
    const M = db.model('gh7144', s);

    const raw = { 'foo.bar': 'baz' };

    return co(function*() {
      let doc = yield M.create([{ raw: raw }], { checkKeys: false }).
        then(res => res[0]);
      assert.deepEqual(doc.raw, raw);

      doc = yield M.findOneAndUpdate({}, { raw: { 'a.b': 2 } }, { new: true });
      assert.deepEqual(doc.raw, { 'a.b': 2 });
    });
  });

  it('doesnt mark array as modified on init if embedded schema has default (gh-7227)', function() {
    const subSchema = new mongoose.Schema({
      users: {
        type: [{ name: { type: String } }],
        // This test ensures the whole array won't be modified on init because
        // of this default
        default: [{ name: 'test' }]
      }
    });

    const schema = new mongoose.Schema({
      sub: [subSchema]
    });
    const Model = db.model('gh7227', schema);

    return co(function*() {
      let doc = new Model({ name: 'test', sub: [{}] });
      yield doc.save();

      assert.ok(!doc.isModified());

      doc = yield Model.findOne();
      assert.ok(!doc.isModified());
    });
  });

  it('casts defaults for doc arrays (gh-7337)', function() {
    const accountSchema = new mongoose.Schema({
      roles: {
        type: [{
          otherProperties: {
            example: Boolean,
          },
          name: String,
        }],
        default: function() {
          return [
            { otherProperties: { example: true }, name: 'First' },
            { otherProperties: { example: false }, name: 'Second' }
          ];
        }
      }
    });

    const Account = db.model('gh7337', accountSchema);

    return co(function*() {
      yield Account.create({});

      const doc = yield Account.findOne();

      assert.ok(doc.roles[0]._id);
      assert.ok(doc.roles[1]._id);
    });
  });

  it('updateOne() hooks (gh-7133) (gh-7423)', function() {
    const schema = new mongoose.Schema({ name: String });

    let queryCount = 0;
    let docCount = 0;
    let docPostCount = 0;

    let docRegexCount = 0;
    let docPostRegexCount = 0;

    schema.pre('updateOne', () => ++queryCount);
    schema.pre('updateOne', { document: true, query: false }, () => ++docCount);
    schema.post('updateOne', { document: true, query: false }, () => ++docPostCount);

    schema.pre(/^updateOne$/, { document: true, query: false }, () => ++docRegexCount);
    schema.post(/^updateOne$/, { document: true, query: false }, () => ++docPostRegexCount);

    let removeCount1 = 0;
    let removeCount2 = 0;
    schema.pre('remove', () => ++removeCount1);
    schema.pre('remove', { document: true, query: false }, () => ++removeCount2);

    const Model = db.model('gh7133', schema);

    return co(function*() {
      const doc = new Model({ name: 'test' });
      yield doc.save();

      assert.equal(queryCount, 0);
      assert.equal(docCount, 0);
      assert.equal(docPostCount, 0);
      assert.equal(docRegexCount, 0);
      assert.equal(docPostRegexCount, 0);

      yield doc.updateOne({ name: 'test2' });

      assert.equal(queryCount, 1);
      assert.equal(docCount, 1);
      assert.equal(docPostCount, 1);
      assert.equal(docRegexCount, 1);
      assert.equal(docPostRegexCount, 1);

      assert.equal(removeCount1, 0);
      assert.equal(removeCount2, 0);

      yield doc.remove();

      assert.equal(removeCount1, 1);
      assert.equal(removeCount2, 1);
    });
  });

  it('doesnt mark single nested doc date as modified if setting with string (gh-7264)', function() {
    const subSchema = new mongoose.Schema({
      date2: Date
    });

    const schema = new mongoose.Schema({
      date1: Date,
      sub: subSchema
    });

    const Model = db.model('gh7264', schema);

    return co(function*() {
      const date = '2018-11-22T09:00:00.000Z';

      const doc = yield Model.create({
        date1: date,
        sub: { date2: date }
      });

      assert.deepEqual(doc.modifiedPaths(), []);

      doc.set('date1', date);
      doc.set('sub.date2', date);

      assert.deepEqual(doc.modifiedPaths(), []);
    });
  });

  it('handles null `fields` param to constructor (gh-7271)', function() {
    const ActivityBareSchema = new Schema({
      _id: {
        type: Schema.Types.ObjectId,
        ref: 'Activity',
      },
      name: String
    });

    const EventSchema = new Schema({
      activity: ActivityBareSchema,
      name: String
    });

    const data = {
      name: 'Test',
      activity: {
        _id: '5bf606f6471b6056b3f2bfc9',
        name: 'Activity name'
      },
    };

    const Event = db.model('gh7271', EventSchema);
    const event = new Event(data, null);

    assert.equal(event.activity.name, 'Activity name');

    return event.validate();
  });

  it('flattenMaps option for toObject() (gh-7274)', function() {
    let schema = new Schema({
      test: {
        type: Map,
        of: String,
        default: new Map()
      }
    }, { versionKey: false });

    let Test = db.model('gh7274', schema);

    let mapTest = new Test({});
    mapTest.test.set('key1', 'value1');
    assert.equal(mapTest.toObject({ flattenMaps: true }).test.key1, 'value1');

    schema = new Schema({
      test: {
        type: Map,
        of: String,
        default: new Map()
      }
    }, { versionKey: false });
    schema.set('toObject', { flattenMaps: true });

    db.deleteModel('gh7274');
    Test = db.model('gh7274', schema);

    mapTest = new Test({});
    mapTest.test.set('key1', 'value1');
    assert.equal(mapTest.toObject({}).test.key1, 'value1');

    return Promise.resolve();
  });

  it('`collection` property with strict: false (gh-7276)', function() {
    const schema = new Schema({}, { strict: false, versionKey: false });
    const Model = db.model('gh7276', schema);

    return co(function*() {
      let doc = new Model({ test: 'foo', collection: 'bar' });

      yield doc.save();

      assert.equal(doc.collection, 'bar');

      doc = yield Model.findOne();
      assert.equal(doc.toObject().collection, 'bar');
    });
  });

  it('should validateSync() all elements in doc array (gh-6746)', function() {
    const Model = db.model('gh6746', new Schema({
      colors: [{
        name: { type: String, required: true },
        hex: { type: String, required: true }
      }]
    }));

    const model = new Model({
      colors: [
        { name: 'steelblue' },
        { hex: '#4682B4' }
      ]
    });

    const errors = model.validateSync().errors;
    const keys = Object.keys(errors).sort();
    assert.deepEqual(keys, ['colors.0.hex', 'colors.1.name']);
  });

  it('handles fake constructor (gh-7290)', function() {
    const TestSchema = new Schema({ test: String });

    const TestModel = db.model('gh7290', TestSchema);

    const badQuery = {
      test: {
        length: 1e10,
        constructor: {
          name: 'Array'
        }
      }
    };

    return co(function*() {
      let err = yield TestModel.findOne(badQuery).then(() => null, e => e);
      assert.equal(err.name, 'CastError', err.stack);

      err = yield TestModel.updateOne(badQuery, { name: 'foo' }).
        then(() => null, err => err);
      assert.equal(err.name, 'CastError', err.stack);

      err = yield TestModel.updateOne({}, badQuery).then(() => null, e => e);
      assert.equal(err.name, 'CastError', err.stack);

      err = yield TestModel.deleteOne(badQuery).then(() => null, e => e);
      assert.equal(err.name, 'CastError', err.stack);
    });
  });

  it('handles fake __proto__ (gh-7290)', function() {
    const TestSchema = new Schema({ test: String, name: String });

    const TestModel = db.model('gh7290_proto', TestSchema);

    const badQuery = JSON.parse('{"test":{"length":1000000000,"__proto__":[]}}');

    return co(function*() {
      let err = yield TestModel.findOne(badQuery).then(() => null, e => e);
      assert.equal(err.name, 'CastError', err.stack);

      err = yield TestModel.updateOne(badQuery, { name: 'foo' }).
        then(() => null, err => err);
      assert.equal(err.name, 'CastError', err.stack);

      err = yield TestModel.updateOne({}, badQuery).then(() => null, e => e);
      assert.equal(err.name, 'CastError', err.stack);

      err = yield TestModel.deleteOne(badQuery).then(() => null, e => e);
      assert.equal(err.name, 'CastError', err.stack);
    });
  });

  it('cast error with string path set to array in db (gh-7619)', function() {
    const TestSchema = new Schema({ name: String });

    const TestModel = db.model('gh7619', TestSchema);

    return co(function*() {
      yield TestModel.findOne();

      yield TestModel.collection.insertOne({ name: ['foo', 'bar'] });

      const doc = yield TestModel.findOne();
      assert.ok(!doc.name);
      const err = doc.validateSync();
      assert.ok(err);
      assert.ok(err.errors['name']);
    });
  });

  it('doesnt crash if nested path with `get()` (gh-7316)', function() {
    const schema = new mongoose.Schema({ http: { get: Number } });
    const Model = db.model('gh7316', schema);

    return Model.create({ http: { get: 400 } }); // Should succeed
  });

  it('copies atomics from existing document array when setting doc array (gh-7472)', function() {
    const Dog = db.model('gh7472', new mongoose.Schema({
      name: String,
      toys: [{
        name: String
      }]
    }));

    return co(function*() {
      const dog = new Dog({ name: 'Dash' });

      dog.toys.push({ name: '1' });
      dog.toys.push({ name: '2' });
      dog.toys.push({ name: '3' });

      yield dog.save();

      for (const toy of ['4', '5', '6']) {
        dog.toys = dog.toys || [];
        dog.toys.push({ name: toy, count: 1 });
      }

      yield dog.save();

      const fromDb = yield Dog.findOne();
      assert.deepEqual(fromDb.toys.map(t => t.name), ['1', '2', '3', '4', '5', '6']);
    });
  });

  it('doesnt fail with custom update function (gh-7342)', function() {
    const catalogSchema = new mongoose.Schema({
      name: String,
      sub: new Schema({ name: String })
    }, { runSettersOnQuery: true });

    catalogSchema.methods.update = function(data) {
      for (const key in data) {
        this[key] = data[key];
      }
      return this.save();
    };

    const Catalog = db.model('gh7342', catalogSchema);

    return co(function*() {
      let doc = yield Catalog.create({ name: 'test', sub: { name: 'foo' } });
      doc = yield doc.update({ name: 'test2' });
      assert.equal(doc.name, 'test2');
    });
  });

  it('setters that modify `this` should work on single nested when overwriting (gh-7585)', function() {
    const NameSchema = new Schema({
      full: {
        type: String,
        set: function(v) {
          this.first = 'foo';
          this.last = 'bar';
          return v + ' baz';
        }
      },
      first: String,
      last: String
    }, { _id: false });

    const User = db.model('gh7585', new Schema({
      name: {
        type: NameSchema,
        default: {}
      }
    }));

    const s = new User();
    s.name = { full: 'test' };
    assert.equal(s.name.first, 'foo');
    assert.equal(s.name.last, 'bar');
    assert.equal(s.name.full, 'test baz');

    return Promise.resolve();
  });

  it('handles setting embedded doc to Object.assign() from another doc (gh-7645)', function() {
    const profileSchema = new Schema({ name: String, email: String });
    const companyUserSchema = new Schema({
      profile: {
        type: profileSchema,
        default: {}
      }
    });

    const CompanyUser = db.model('gh7645', companyUserSchema);

    const cu = new CompanyUser({ profile: { name: 'foo', email: 'bar' } });
    cu.profile = Object.assign({}, cu.profile);

    assert.equal(cu.profile.name, 'foo');
    assert.equal(cu.profile.email, 'bar');
    cu.toObject(); // shouldn't throw
  });

  it('setting single nested subdoc with custom date types and getters/setters (gh-7601)', function() {
    const moment = require('moment');

    const schema = new Schema({
      start: { type: Date, get: get, set: set, required: true },
      end: { type: Date, get: get, set: set, required: true }
    }, { toObject: { getters: true } });
    function get(v) {
      return moment(v);
    }
    function set(v) {
      return v.toDate();
    }
    const parentSchema = new Schema({
      nested: schema
    });
    const Model = db.model('gh7601', parentSchema);

    return co(function*() {
      const doc = yield Model.create({
        nested: { start: moment('2019-01-01'), end: moment('2019-01-02') }
      });

      doc.nested = { start: moment('2019-03-01'), end: moment('2019-04-01') };
      yield doc.save();

      const _doc = yield Model.collection.findOne();
      assert.ok(_doc.nested.start instanceof Date);
      assert.ok(_doc.nested.end instanceof Date);
    });
  });

  it('get() and set() underneath alias (gh-7592)', function() {
    const photoSchema = new Schema({
      foo: String
    });

    const pageSchema = new Schema({
      p: { type: [photoSchema], alias: 'photos' }
    });
    const Page = db.model('gh7592', pageSchema);

    return co(function*() {
      const doc = yield Page.create({ p: [{ foo: 'test' }] });

      assert.equal(doc.p[0].foo, 'test');
      assert.equal(doc.get('photos.0.foo'), 'test');

      doc.set('photos.0.foo', 'bar');
      assert.equal(doc.p[0].foo, 'bar');
      assert.equal(doc.get('photos.0.foo'), 'bar');
    });
  });

  it('get() with getters: false (gh-7233)', function() {
    const testSchema = new Schema({
      foo: { type: String, get: v => v.toLowerCase() }
    });
    const Test = db.model('gh7233', testSchema);

    const doc = new Test({ foo: 'Bar' });
    assert.equal(doc.foo, 'bar');
    assert.equal(doc._doc.foo, 'Bar');

    assert.equal(doc.get('foo'), 'bar');
    assert.equal(doc.get('foo', null, { getters: false }), 'Bar');

    return Promise.resolve();
  });

  it('overwriting single nested (gh-7660)', function() {
    const childSchema = new mongoose.Schema({
      foo: String,
      bar: Number
    }, { _id: false, id: false });

    const parentSchema = new mongoose.Schema({
      child: childSchema
    });
    const Test = db.model('gh7660', parentSchema);

    const test = new Test({
      child: {
        foo: 'test',
        bar: 42
      }
    });

    test.set({
      child: {
        foo: 'modified',
        bar: 43
      }
    });

    assert.deepEqual(test.toObject().child, {
      foo: 'modified',
      bar: 43
    });

    return Promise.resolve();
  });

  it('setting path to non-POJO object (gh-7639)', function() {
    class Nested {
      constructor(prop) {
        this.prop = prop;
      }
    }

    const schema = new Schema({ nested: { prop: String } });
    const Model = db.model('gh7639', schema);

    const doc = new Model({ nested: { prop: '1' } });

    doc.set('nested', new Nested('2'));
    assert.equal(doc.nested.prop, '2');

    doc.set({ nested: new Nested('3') });
    assert.equal(doc.nested.prop, '3');
  });

  it('supports setting date properties with strict: false (gh-7907)', function() {
    const schema = Schema({}, { strict: false });
    const SettingsModel = db.model('gh7907', schema);

    const date = new Date();
    const obj = new SettingsModel({
      timestamp: date,
      subDoc: {
        timestamp: date
      }
    });

    assert.strictEqual(obj.timestamp, date);
    assert.strictEqual(obj.subDoc.timestamp, date);
  });

  it('handles .set() on doc array within embedded discriminator (gh-7656)', function() {
    const pageElementSchema = new Schema({
      type: { type: String, required: true }
    }, { discriminatorKey: 'type' });

    const textElementSchema = new Schema({
      body: { type: String }
    });

    const blockElementSchema = new Schema({
      elements: [pageElementSchema]
    });

    blockElementSchema.path('elements').discriminator('block', blockElementSchema);
    blockElementSchema.path('elements').discriminator('text', textElementSchema);

    const pageSchema = new Schema({ elements: [pageElementSchema] });

    pageSchema.path('elements').discriminator('block', blockElementSchema);
    pageSchema.path('elements').discriminator('text', textElementSchema);

    const Page = db.model('gh7656', pageSchema);
    const page = new Page({
      elements: [
        { type: 'text', body: 'Page Title' },
        { type: 'block', elements: [{ type: 'text', body: 'Page Content' }] }
      ]
    });

    page.set('elements.0.body', 'Page Heading');
    assert.equal(page.elements[0].body, 'Page Heading');
    assert.equal(page.get('elements.0.body'), 'Page Heading');

    page.set('elements.1.elements.0.body', 'Page Body');
    assert.equal(page.elements[1].elements[0].body, 'Page Body');
    assert.equal(page.get('elements.1.elements.0.body'), 'Page Body');

    page.elements[1].elements[0].body = 'Page Body';
    assert.equal(page.elements[1].elements[0].body, 'Page Body');
    assert.equal(page.get('elements.1.elements.0.body'), 'Page Body');
  });

  it('$isEmpty() (gh-5369)', function() {
    const schema = new Schema({
      nested: { foo: String },
      subdoc: new Schema({ bar: String }, { _id: false }),
      docArr: [new Schema({ baz: String }, { _id: false })],
      mixed: {}
    });

    const Model = db.model('gh5369', schema);
    const doc = new Model({ subdoc: {}, docArr: [{}] });

    assert.ok(doc.nested.$isEmpty());
    assert.ok(doc.subdoc.$isEmpty());
    assert.ok(doc.docArr[0].$isEmpty());
    assert.ok(doc.$isEmpty('nested'));
    assert.ok(doc.$isEmpty('subdoc'));
    assert.ok(doc.$isEmpty('docArr.0'));
    assert.ok(doc.$isEmpty('mixed'));

    doc.nested.foo = 'test';
    assert.ok(!doc.nested.$isEmpty());
    assert.ok(doc.subdoc.$isEmpty());
    assert.ok(doc.docArr[0].$isEmpty());
    assert.ok(!doc.$isEmpty('nested'));
    assert.ok(doc.$isEmpty('subdoc'));
    assert.ok(doc.$isEmpty('docArr.0'));
    assert.ok(doc.$isEmpty('mixed'));

    doc.subdoc.bar = 'test';
    assert.ok(!doc.nested.$isEmpty());
    assert.ok(!doc.subdoc.$isEmpty());
    assert.ok(doc.docArr[0].$isEmpty());
    assert.ok(!doc.$isEmpty('nested'));
    assert.ok(!doc.$isEmpty('subdoc'));
    assert.ok(doc.$isEmpty('docArr.0'));
    assert.ok(doc.$isEmpty('mixed'));

    doc.docArr[0].baz = 'test';
    assert.ok(!doc.nested.$isEmpty());
    assert.ok(!doc.subdoc.$isEmpty());
    assert.ok(!doc.docArr[0].$isEmpty());
    assert.ok(!doc.$isEmpty('nested'));
    assert.ok(!doc.$isEmpty('subdoc'));
    assert.ok(!doc.$isEmpty('docArr.0'));
    assert.ok(doc.$isEmpty('mixed'));

    doc.mixed = {};
    assert.ok(doc.$isEmpty('mixed'));

    doc.mixed.test = 1;
    assert.ok(!doc.$isEmpty('mixed'));

    return Promise.resolve();
  });

  it('push() onto discriminator doc array (gh-7704)', function() {
    const opts = {
      minimize: false, // So empty objects are returned
      strict: true,
      typeKey: '$type', // So that we can use fields named `type`
      discriminatorKey: 'type',
    };

    const IssueSchema = new mongoose.Schema({
      _id: String,
      text: String,
      type: String,
    }, opts);

    const IssueModel = mongoose.model('gh7704', IssueSchema);

    const SubIssueSchema = new mongoose.Schema({
      checklist: [{
        completed: {$type: Boolean, default: false},
      }]
    }, opts);
    IssueModel.discriminator('gh7704_sub', SubIssueSchema);

    const doc = new IssueModel({ _id: 'foo', text: 'text', type: 'gh7704_sub' });
    doc.checklist.push({ completed: true });

    assert.ifError(doc.validateSync());

    return Promise.resolve();
  });

  it('doesnt call getter when saving (gh-7719)', function() {
    let called = 0;
    const kittySchema = new mongoose.Schema({
      name: {
        type: String,
        get: function(v) {
          ++called;
          return v;
        }
      }
    });
    const Kitten = db.model('gh7719', kittySchema);

    const k = new Kitten({ name: 'Mr Sprinkles' });
    return k.save().then(() => assert.equal(called, 0));
  });

  it('skips malformed validators property (gh-7720)', function() {
    const NewSchema = new Schema({
      object: {
        type: 'string',
        validators: ['string'] // This caused the issue
      }
    });

    const TestModel = db.model('gh7720', NewSchema);
    const instance = new TestModel();
    instance.object = 'value';

    assert.ifError(instance.validateSync());

    return instance.validate();
  });

  it('nested set on subdocs works (gh-7748)', function() {
    const geojsonSchema = new Schema({
      type: { type: String, default: 'Feature' },
      geometry: {
        type: {
          type: String,
          required: true
        },
        coordinates: { type: [] }
      },
      properties: { type: Object }
    });

    const userSchema = new Schema({
      position: geojsonSchema
    });

    const GeoJson = db.model('gh7748_0', geojsonSchema);
    const User = db.model('gh7748', userSchema);

    return co(function*() {
      const position = new GeoJson({
        geometry: {
          type: 'Point',
          coordinates: [1.11111, 2.22222]
        },
        properties: {
          a: 'b'
        }
      });

      const newUser = new User({
        position: position
      });
      yield newUser.save();

      const editUser = yield User.findById(newUser._id);
      editUser.position = position;

      yield editUser.validate();
      yield editUser.save();

      const fromDb = yield User.findById(newUser._id);
      assert.equal(fromDb.position.properties.a, 'b');
      assert.equal(fromDb.position.geometry.coordinates[0], 1.11111);
    });
  });

  it('does not convert array to object with strict: false (gh-7733)', function() {
    const ProductSchema = new mongoose.Schema({}, { strict: false });
    const Product = db.model('gh7733', ProductSchema);

    return co(function*() {
      yield Product.create({ arr: [{ test: 1 }, { test: 2 }] });

      const doc = yield Product.collection.findOne();
      assert.ok(Array.isArray(doc.arr));
      assert.deepEqual(doc.arr, [{ test: 1 }, { test: 2 }]);
    });
  });

  it('does not crash with array property named "undefined" (gh-7756)', function() {
    const schema = new Schema({ 'undefined': [String] });
    const Model = db.model('gh7756_undefined', schema);

    return co(function*() {
      const doc = yield Model.create({ 'undefined': ['foo'] });

      doc['undefined'].push('bar');
      yield doc.save();

      const _doc = yield Model.collection.findOne();
      assert.equal(_doc['undefined'][0], 'foo');
    });
  });

  it('fires pre save hooks on nested child schemas (gh-7792)', function() {
    const childSchema1 = new mongoose.Schema({ name: String });
    let called1 = 0;
    childSchema1.pre('save', function() {
      ++called1;
    });

    const childSchema2 = new mongoose.Schema({ name: String });
    let called2 = 0;
    childSchema2.pre('save', function() {
      ++called2;
    });

    const parentSchema = new mongoose.Schema({
      nested: {
        child: childSchema1,
        arr: [childSchema2]
      }
    });

    const Parent = db.model('gh7792', parentSchema);

    const obj = { nested: { child: { name: 'foo' }, arr: [{ name: 'bar' }] } };
    return Parent.create(obj).then(() => {
      assert.equal(called1, 1);
      assert.equal(called2, 1);
    });
  });

  it('takes message from async custom validator promise rejection (gh-4913)', function() {
    const schema = new Schema({
      name: {
        type: String,
        validate: function() {
          return co(function*() {
            yield cb => setImmediate(cb);
            throw new Error('Oops!');
          });
        }
      }
    });
    const Model = db.model('gh4913', schema);

    return Model.create({ name: 'foo' }).then(() => assert.ok(false), err => {
      assert.equal(err.errors['name'].message, 'Oops!');
      assert.ok(err.message.indexOf('Oops!') !== -1, err.message);
    });
  });

  it('handles nested properties named `schema` (gh-7831)', function() {
    const schema = new mongoose.Schema({ nested: { schema: String } });
    const Model = db.model('gh7831', schema);

    return co(function*() {
      yield Model.collection.insertOne({ nested: { schema: 'test' } });

      const doc = yield Model.findOne();
      assert.strictEqual(doc.nested.schema, 'test');
    });
  });

  describe('overwrite() (gh-7830)', function() {
    let Model;

    before(function() {
      const schema = new Schema({
        _id: Number,
        name: String,
        nested: {
          prop: String
        },
        arr: [Number],
        immutable: {
          type: String,
          immutable: true
        }
      });
      Model = db.model('gh7830', schema);
    });

    it('works', function() {
      return co(function*() {
        const doc = yield Model.create({
          _id: 1,
          name: 'test',
          nested: { prop: 'foo' },
          immutable: 'bar'
        });
        doc.overwrite({ name: 'test2' });

        assert.deepEqual(doc.toObject(), {
          _id: 1,
          __v: 0,
          name: 'test2',
          immutable: 'bar'
        });
      });
    });

    it('skips version key', function() {
      return co(function*() {
        yield Model.collection.insertOne({
          _id: 2,
          __v: 5,
          name: 'test',
          nested: { prop: 'foo' },
          immutable: 'bar'
        });
        const doc = yield Model.findOne({ _id: 2 });
        doc.overwrite({ _id: 2, name: 'test2' });

        assert.deepEqual(doc.toObject(), {
          _id: 2,
          __v: 5,
          name: 'test2',
          immutable: 'bar'
        });
      });
    });
  });

  it('copies virtuals from array subdocs when casting array of docs with same schema (gh-7898)', function() {
    const ChildSchema = new Schema({ name: String },
      { _id: false, id: false });

    ChildSchema.virtual('foo').
      set(function(foo) { this.__foo = foo; }).
      get(function() { return this.__foo || 0; });

    const ParentSchema = new Schema({
      name: String,
      children: [ChildSchema]
    }, { _id: false, id: false });

    const WrapperSchema = new Schema({
      name: String,
      parents: [ParentSchema]
    }, { _id: false, id: false });

    const Parent = db.model('gh7898_Parent', ParentSchema);
    const Wrapper = db.model('gh7898_Wrapper', WrapperSchema);

    const data = { name: 'P1', children: [{ name: 'C1' }, { name: 'C2' }] };
    const parent = new Parent(data);
    parent.children[0].foo = 123;

    const wrapper = new Wrapper({ name: 'test', parents: [parent] });
    assert.equal(wrapper.parents[0].children[0].foo, 123);
  });

  describe('immutable properties (gh-7671)', function() {
    let Model;

    before(function() {
      const schema = new Schema({
        createdAt: {
          type: Date,
          immutable: true,
          default: new Date('6/1/2019')
        },
        name: String
      });
      Model = db.model('gh7671', schema);
    });

    it('SchemaType#immutable()', function() {
      const schema = new Schema({
        createdAt: {
          type: Date,
          default: new Date('6/1/2019')
        },
        name: String
      });

      assert.ok(!schema.path('createdAt').$immutable);

      schema.path('createdAt').immutable(true);
      assert.ok(schema.path('createdAt').$immutable);
      assert.equal(schema.path('createdAt').setters.length, 1);

      schema.path('createdAt').immutable(false);
      assert.ok(!schema.path('createdAt').$immutable);
      assert.equal(schema.path('createdAt').setters.length, 0);
    });

    it('with save()', function() {
      let doc = new Model({ name: 'Foo' });
      return co(function*() {
        assert.equal(doc.createdAt.toLocaleDateString('en-us'), '6/1/2019');
        yield doc.save();

        doc = yield Model.findOne({ createdAt: new Date('6/1/2019') });
        doc.createdAt = new Date('6/1/2017');
        assert.equal(doc.createdAt.toLocaleDateString('en-us'), '6/1/2019');

        doc.set({ createdAt: new Date('6/1/2021') });
        assert.equal(doc.createdAt.toLocaleDateString('en-us'), '6/1/2019');

        yield doc.save();

        doc = yield Model.findOne({ createdAt: new Date('6/1/2019') });
        assert.ok(doc);
      });
    });

    it('with update', function() {
      let doc = new Model({ name: 'Foo' });
      return co(function*() {
        assert.equal(doc.createdAt.toLocaleDateString('en-us'), '6/1/2019');
        yield doc.save();

        const update = { createdAt: new Date('6/1/2020') };

        yield Model.updateOne({}, update);

        doc = yield Model.findOne();
        assert.equal(doc.createdAt.toLocaleDateString('en-us'), '6/1/2019');

        const err = yield Model.updateOne({}, update, { strict: 'throw' }).
          then(() => null, err => err);
        assert.equal(err.name, 'StrictModeError');
        assert.ok(err.message.indexOf('createdAt') !== -1, err.message);
      });
    });

    it('conditional immutable (gh-8001)', function() {
      const schema = new Schema({
        name: String,
        test: {
          type: String,
          immutable: doc => doc.name === 'foo'
        }
      });
      const Model = db.model('gh8001', schema);

      return co(function*() {
        const doc1 = yield Model.create({ name: 'foo', test: 'before' });
        const doc2 = yield Model.create({ name: 'bar', test: 'before' });

        doc1.set({ test: 'after' });
        doc2.set({ test: 'after' });
        yield doc1.save();
        yield doc2.save();

        const fromDb1 = yield Model.collection.findOne({ name: 'foo' });
        const fromDb2 = yield Model.collection.findOne({ name: 'bar' });
        assert.equal(fromDb1.test, 'before');
        assert.equal(fromDb2.test, 'after');
      });
    });

    it('immutable with strict mode (gh-8149)', function() {
      return co(function*() {
        const schema = new mongoose.Schema({
          name: String,
          yearOfBirth: { type: Number, immutable: true }
        }, { strict: 'throw' });
        const Person = db.model('gh8149', schema);
        const joe = yield Person.create({ name: 'Joe', yearOfBirth: 2001 });

        joe.set({ yearOfBirth: 2002 });
        const err = yield joe.save().then(() => null, err => err);
        assert.ok(err);
        assert.equal(err.errors['yearOfBirth'].name, 'StrictModeError');
      });
    });
  });

  it('consistent post order traversal for array subdocs (gh-7929)', function() {
    const Grandchild = Schema({ value: Number });
    const Child = Schema({ children: [Grandchild] });
    const Parent = Schema({ children: [Child] });

    const calls = [];
    Grandchild.pre('save', () => calls.push(1));
    Child.pre('save', () => calls.push(2));
    Parent.pre('save', () => calls.push(3));

    const Model = db.model('gh7929', Parent);

    return Model.create({ children: [{ children: [{ value: 3 }] }] }).then(() => {
      assert.deepEqual(calls, [1, 2, 3]);
    });
  });

  it('respects projection for getters (gh-7940)', function() {
    const schema = new Schema({
      foo: String,
      bar: {
        type: String,
        get: () => {
          return 'getter value';
        }
      }
    }, { toObject : { getters: true } });

    const Model = db.model('gh7940', schema);

    return co(function*() {
      yield Model.create({ foo: 'test', bar: 'baz' });

      const doc = yield Model.findOne({ foo: 'test' }, 'foo');

      assert.ok(!doc.toObject().bar);
    });
  });

  it('loads doc with a `once` property successfully (gh-7958)', function() {
    const eventSchema = Schema({ once: { prop: String } });
    const Event = db.model('gh7958', eventSchema);

    return co(function*() {
      yield Event.create({ once: { prop: 'test' } });

      const doc = yield Event.findOne();
      assert.equal(doc.once.prop, 'test');
    });
  });

  it('caster that converts to Number class works (gh-8150)', function() {
    return co(function*() {
      const mySchema = new Schema({
        id: {
          type: Number,
          set: value => new Number(value.valueOf())
        }
      });

      const MyModel = db.model('gh8150', mySchema);

      yield MyModel.create({ id: 12345 });

      const doc = yield MyModel.findOne({ id: 12345 });
      assert.ok(doc);
    });
  });

  it('handles objectids and decimals with strict: false (gh-7973)', function() {
    const testSchema = Schema({}, { strict: false });
    const Test = db.model('gh7973', testSchema);

    let doc = new Test({
      testId: new mongoose.Types.ObjectId(),
      testDecimal: new mongoose.Types.Decimal128('1.23')
    });

    assert.ok(doc.testId instanceof mongoose.Types.ObjectId);
    assert.ok(doc.testDecimal instanceof mongoose.Types.Decimal128);

    return co(function*() {
      yield doc.save();

      doc = yield Test.collection.findOne();
      assert.ok(doc.testId instanceof mongoose.Types.ObjectId);
      assert.ok(doc.testDecimal instanceof mongoose.Types.Decimal128);
    });
  });

  it('allows enum on array of array of strings (gh-7926)', function() {
    const schema = new Schema({
      test: {
        type: [[String]],
        enum: ['bar']
      }
    });

    const Model = db.model('gh7926', schema);

    return Model.create({ test: [['foo']] }).then(() => assert.ok(false), err => {
      assert.ok(err);
      assert.ok(err.errors['test.0.0']);
      assert.ok(err.errors['test.0.0'].message.indexOf('foo') !== -1,
        err.errors['test.0.0'].message);
    });
  });

  it('allows saving an unchanged document if required populated path is null (gh-8018)', function() {
    const schema = Schema({ test: String });
    const schema2 = Schema({
      keyToPopulate: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'gh8018_child',
        required: true
      }
    });

    const Child = db.model('gh8018_child', schema);
    const Parent = db.model('gh8018_parent', schema2);

    return co(function*() {
      const child = yield Child.create({ test: 'test' });
      yield Parent.create({ keyToPopulate: child._id });

      yield child.deleteOne();

      const doc = yield Parent.findOne().populate('keyToPopulate');

      // Should not throw
      yield doc.save();
    });
  });

  it('only calls validator once on mixed validator (gh-8067)', function() {
    let called = 0;
    function validator() {
      ++called;
      return true;
    }

    const itemArray = new Schema({
      timer: {
        time: {
          type: {},
          validate: {
            validator: validator
          }
        }
      }
    });

    const schema = new Schema({
      items: [itemArray]
    });
    const Model = db.model('gh8067', schema);

    const obj = new Model({
      items: [
        { timer: { time: { type: { hours: 24, allowed: true } } } }
      ]
    });

    obj.validateSync();
    assert.equal(called, 1);
  });

  it('only calls validator once on nested mixed validator (gh-8117)', function() {
    const called = [];
    const Model = db.model('gh8117', Schema({
      name: { type: String },
      level1: {
        level2: {
          type: Object,
          validate: {
            validator: v => {
              called.push(v);
              return true;
            }
          }
        }
      }
    }));

    const doc = new Model({ name: 'bob' });
    doc.level1 = { level2: { a: 'one', b: 'two', c: 'three' } };
    return doc.validate().then(() => {
      assert.equal(called.length, 1);
      assert.deepEqual(called[0], { a: 'one', b: 'two', c: 'three' });
    });
  });

  it('handles populate() with custom type that does not cast to doc (gh-8062)', function() {
    class Gh8062 extends mongoose.SchemaType {
      cast(val) {
        if (typeof val === 'string') {
          return val;
        }
        throw new Error('Failed!');
      }
    }

    mongoose.Schema.Types.Gh8062 = Gh8062;

    const schema = new Schema({ arr: [{ type: Gh8062, ref: 'gh8062_child' }] });
    const Model = db.model('gh8062', schema);
    const Child = db.model('gh8062_child', Schema({ _id: Gh8062 }));

    return co(function*() {
      yield Child.create({ _id: 'test' });
      yield Model.create({ arr: ['test'] });

      const doc = yield Model.findOne().populate('arr');
      assert.ok(doc.populated('arr'));
      assert.equal(doc.arr[0]._id, 'test');
      assert.ok(doc.arr[0].$__ != null);
    });
  });

  it('can inspect() on a document array (gh-8037)', function() {
    const subdocSchema = mongoose.Schema({ a: String });
    const schema = mongoose.Schema({ subdocs: { type: [subdocSchema] } });
    const Model = db.model('gh8037', schema);
    const data = { _id: new mongoose.Types.ObjectId(), subdocs: [{a: 'a'}] };
    const doc = new Model();
    doc.init(data);
    require('util').inspect(doc.subdocs);
  });

  it('set() merge option with single nested (gh-8201)', function() {
    const AddressSchema = Schema({
      street: { type: String, required: true },
      city: { type: String, required: true }
    });
    const PersonSchema = Schema({
      name: { type: String, required: true },
      address: { type: AddressSchema, required: true }
    });
    const Person = db.model('gh8201', PersonSchema);

    return co(function*() {
      yield Person.create({
        name: 'John Smith',
        address: {
          street: 'Real Street',
          city: 'Somewhere'
        }
      });

      const person = yield Person.findOne();
      const obj = {
        name: 'John Smythe',
        address: { street: 'Fake Street' }
      };
      person.set(obj, undefined, { merge: true });

      assert.equal(person.address.city, 'Somewhere');
      yield person.save();
    });
  });

  it('setting single nested subdoc with timestamps (gh-8251)', function() {
    const ActivitySchema = Schema({ description: String }, { timestamps: true });
    const RequestSchema = Schema({ activity: ActivitySchema });
    const Request = db.model('gh8251', RequestSchema);

    return co(function*() {
      const doc = yield Request.create({
        activity: { description: 'before' }
      });
      doc.activity.set({ description: 'after' });
      yield doc.save();

      const fromDb = yield Request.findOne().lean();
      assert.equal(fromDb.activity.description, 'after');
    });
  });

  it('passing an object with toBSON() into `save()` (gh-8299)', function() {
    const ActivitySchema = Schema({ description: String });
    const RequestSchema = Schema({ activity: ActivitySchema });
    const Request = db.model('gh8299', RequestSchema);

    return co(function*() {
      const doc = yield Request.create({
        activity: { description: 'before' }
      });
      doc.activity.set({ description: 'after' });
      yield doc.save();

      const fromDb = yield Request.findOne().lean();
      assert.equal(fromDb.activity.description, 'after');
    });
  });

  it('handles getter setting virtual on manually populated doc when calling toJSON (gh-8295)', function() {
    const childSchema = Schema({}, { toJSON: { getters: true } });
    childSchema.virtual('field').
      get(function() { return this._field; }).
      set(function(v) { return this._field = v; });
    const Child = db.model('gh8295_Child', childSchema);

    const parentSchema = Schema({
      child: { type: mongoose.ObjectId, ref: 'gh8295_Child', get: get }
    }, { toJSON: { getters: true } });
    const Parent = db.model('gh8295_Parent', parentSchema);

    function get(child) {
      child.field = true;
      return child;
    }

    let p = new Parent({ child: new Child({}) });
    assert.strictEqual(p.toJSON().child.field, true);

    p = new Parent({ child: new Child({}) });
    assert.strictEqual(p.child.toJSON().field, true);
  });
});
