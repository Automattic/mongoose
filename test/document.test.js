'use strict';

/**
 * Module dependencies.
 */

const start = require('./common');

const Document = require('../lib/document');
const EventEmitter = require('events').EventEmitter;
const ArraySubdocument = require('../lib/types/ArraySubdocument');
const Query = require('../lib/query');
const assert = require('assert');
const idGetter = require('../lib/helpers/schema/idGetter');
const util = require('./util');
const utils = require('../lib/utils');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;
const DocumentObjectId = mongoose.Types.ObjectId;
const SchemaType = mongoose.SchemaType;
const ValidatorError = SchemaType.ValidatorError;
const ValidationError = mongoose.Document.ValidationError;
const VersionError = mongoose.Error.VersionError;
const MongooseError = mongoose.Error;
const DocumentNotFoundError = mongoose.Error.DocumentNotFoundError;

/**
 * Test Document constructor.
 */

function TestDocument() {
  Document.apply(this, arguments);
}

/**
 * Inherits from Document.
 */

Object.setPrototypeOf(TestDocument.prototype, Document.prototype);

for (const i in EventEmitter.prototype) {
  TestDocument[i] = EventEmitter.prototype[i];
}

/**
 * Set a dummy schema to simulate compilation.
 */

const em = new Schema({ title: String, body: String });
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
    deep: { x: String },
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

TestDocument.prototype.$__setSchema(idGetter(schema));

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

const childSchema = new Schema({ counter: Number });

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

  after(async function() {
    await db.close();
  });

  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => util.clearTestData(db));
  afterEach(() => util.stopRemainingOps(db));

  describe('constructor', function() {
    it('supports passing in schema directly (gh-8237)', function() {
      const myUserDoc = new Document({}, { name: String });
      assert.ok(!myUserDoc.name);
      myUserDoc.name = 123;
      assert.strictEqual(myUserDoc.name, '123');

      assert.ifError(myUserDoc.validateSync());
    });
  });

  describe('deleteOne', function() {
    it('deletes the document', async function() {
      const schema = new Schema({ x: String });
      const Test = db.model('Test', schema);

      const test = new Test({ x: 'test' });
      const doc = await test.save();
      await doc.deleteOne();
      const found = await Test.findOne({ _id: doc._id });
      assert.strictEqual(found, null);

    });
  });

  describe('updateOne', function() {
    let Test;

    before(function() {
      const schema = new Schema({ x: String, y: String });
      db.deleteModel(/^Test$/);
      Test = db.model('Test', schema);
    });

    it('updates the document', async function() {
      const test = new Test({ x: 'test' });
      const doc = await test.save();
      await doc.updateOne({ y: 'test' });
      const found = await Test.findOne({ _id: doc._id });
      assert.strictEqual(found.y, 'test');
    });

    it('returns a query', function() {
      const doc = new Test({ x: 'test' });
      assert.ok(doc.updateOne() instanceof Test.Query);
    });

    it('middleware (gh-8262)', async function() {
      const schema = new Schema({ x: String, y: String });
      const docs = [];
      schema.post('updateOne', { document: true, query: false }, function(doc, next) {
        docs.push(doc);
        next();
      });
      const Model = db.model('Test', schema);


      const doc = await Model.create({ x: 2, y: 4 });

      await doc.updateOne({ x: 4 });
      assert.equal(docs.length, 1);
      assert.equal(docs[0], doc);
    });
  });

  describe('replaceOne', function() {
    it('replaces the document', async function() {
      const schema = new Schema({ x: String });
      const Test = db.model('Test', schema);

      const test = new Test({ x: 'test' });
      const doc = await test.save();
      await doc.replaceOne({ x: 'updated' });
      const found = await Test.findOne({ _id: doc._id });
      assert.strictEqual(found.x, 'updated');

    });
  });

  describe('shortcut getters', function() {
    it('return undefined for properties with a null/undefined parent object (gh-1326)', function() {
      const doc = new TestDocument();
      doc.init({ nested: null });
      assert.strictEqual(undefined, doc.nested.age);
    });

    it('work', function() {
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
          deep: { x: 'yay' }
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
    });
  });

  it('test shortcut setters', function() {
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

    doc.nested = { path: 'overwrite the entire nested object' };
    assert.equal(doc.nested.age, undefined);
    assert.equal(Object.keys(doc._doc.nested).length, 1);
    assert.equal(doc.nested.path, 'overwrite the entire nested object');
    assert.ok(doc.isModified('nested'));
  });

  it('test accessor of id', function() {
    const doc = new TestDocument();
    assert.ok(doc._id instanceof DocumentObjectId);
  });

  it('test shortcut of id hexString', function() {
    const doc = new TestDocument();
    assert.equal(typeof doc.id, 'string');
  });

  it('toObject options', function() {
    const doc = new TestDocument();

    doc.init({
      test: 'test',
      oids: [],
      em: [{ title: 'asdf' }],
      nested: {
        age: 5,
        cool: DocumentObjectId.createFromHexString('4c6c2d6240ced95d0e00003c'),
        path: 'my path'
      },
      nested2: {},
      date: new Date()
    });

    let clone = doc.toObject({ getters: true, virtuals: false });

    assert.equal(clone.test, 'test');
    assert.ok(clone.oids instanceof Array);
    assert.equal(clone.nested.age, 5);
    assert.equal(clone.nested.cool.toString(), '4c6c2d6240ced95d0e00003c');
    assert.equal(clone.nested.path, '5my path');
    assert.equal(clone.nested.agePlus2, undefined);
    assert.equal(clone.em[0].works, undefined);
    assert.ok(clone.date instanceof Date);

    clone = doc.toObject({ virtuals: true });

    assert.equal(clone.test, 'test');
    assert.ok(clone.oids instanceof Array);
    assert.equal(clone.nested.age, 5);
    assert.equal(clone.nested.cool.toString(), '4c6c2d6240ced95d0e00003c');
    assert.equal(clone.nested.path, 'my path');
    assert.equal(clone.nested.agePlus2, 7);
    assert.equal(clone.em[0].works, 'em virtual works');

    clone = doc.toObject({ getters: true });

    assert.equal(clone.test, 'test');
    assert.ok(clone.oids instanceof Array);
    assert.equal(clone.nested.age, 5);
    assert.equal(clone.nested.cool.toString(), '4c6c2d6240ced95d0e00003c');
    assert.equal(clone.nested.path, '5my path');
    assert.equal(clone.nested.agePlus2, 7);
    assert.equal(clone.em[0].works, 'em virtual works');

    // test toObject options
    doc.schema.options.toObject = { virtuals: true };
    clone = doc.toObject({ transform: false, virtuals: true });
    assert.equal(clone.test, 'test');
    assert.ok(clone.oids instanceof Array);
    assert.equal(clone.nested.age, 5);
    assert.equal(clone.nested.cool.toString(), '4c6c2d6240ced95d0e00003c');

    assert.equal(clone.nested.path, 'my path');
    assert.equal(clone.nested.agePlus2, 7);
    assert.equal(clone.em[0].title, 'asdf');
    delete doc.schema.options.toObject;

    // minimize
    clone = doc.toObject({ minimize: true });
    assert.equal(clone.nested2, undefined);
    clone = doc.toObject({ minimize: true, getters: true });
    assert.equal(clone.nested2, undefined);
    clone = doc.toObject({ minimize: false });
    assert.equal(clone.nested2.constructor.name, 'Object');
    assert.equal(Object.keys(clone.nested2).length, 1);
    clone = doc.toObject('2');
    assert.equal(clone.nested2, undefined);

    doc.schema.options.toObject = { minimize: false };
    clone = doc.toObject({ transform: false, minimize: false });
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
      if (doc.$isSubdocument) {
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
    const out = { myid: doc._id.toString() };
    doc.schema.options.toObject.transform = function(doc, ret) {
      // ignore embedded docs
      if (doc.$isSubdocument) {
        return;
      }

      return { myid: ret._id.toString() };
    };

    clone = doc.toObject();
    assert.deepEqual(out, clone);

    // ignored transform with inline options
    clone = doc.toObject({ x: 1, transform: false });
    assert.ok(!('myid' in clone));
    assert.equal(clone.test, 'test');
    assert.ok(clone.oids instanceof Array);
    assert.equal(clone.nested.age, 5);
    assert.equal(clone.nested.cool.toString(), '4c6c2d6240ced95d0e00003c');
    assert.equal(clone.nested.path, 'my path');
    assert.equal(clone.em[0].constructor.name, 'Object');

    // applied transform when inline transform is true
    clone = doc.toObject({ x: 1 });
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
  });

  it('toObject transform', async function() {
    const schema = new Schema({
      name: String,
      places: [{ type: ObjectId, ref: 'Place' }]
    });

    const schemaPlaces = new Schema({
      identity: String
    });

    schemaPlaces.set('toObject', {
      transform: function(doc, ret) {
        assert.equal(doc.constructor.modelName, 'Place');
        return ret;
      }
    });

    const Test = db.model('Test', schema);
    const Places = db.model('Place', schemaPlaces);

    const [a, b, c] = await Places.create({ identity: 'a' }, { identity: 'b' }, { identity: 'c' });

    await Test.create({ name: 'chetverikov', places: [a, b, c] });

    const docs = await Test.findOne({}).populate('places').exec();

    docs.toObject({ transform: true });
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

    const Model = db.model('Person', schema);

    const doc = new Model({ name: 'Jean-Luc Picard', age: 59 });

    let obj = doc.toObject({ virtuals: true });
    assert.equal(obj.nameAlias, 'Jean-Luc Picard');
    assert.equal(obj.answer, 42);

    obj = doc.toObject({ virtuals: true, aliases: false });
    assert.ok(!obj.nameAlias);
    assert.equal(obj.answer, 42);
  });

  it('can save multiple times with changes to complex subdocuments (gh-8531)', () => {
    const clipSchema = Schema({
      height: Number,
      rows: Number,
      width: Number
    }, { _id: false, id: false });
    const questionSchema = Schema({
      type: String,
      age: Number,
      clip: {
        type: clipSchema
      }
    }, { _id: false, id: false });
    const keySchema = Schema({ ql: [questionSchema] }, { _id: false, id: false });
    const Model = db.model('Test', Schema({
      name: String,
      keys: [keySchema]
    }));
    const doc = new Model({
      name: 'test',
      keys: [
        { ql: [
          { type: 'mc', clip: { width: 1 } },
          { type: 'mc', clip: { height: 1, rows: 1 } },
          { type: 'mc', clip: { height: 2, rows: 1 } },
          { type: 'mc', clip: { height: 3, rows: 1 } }
        ] }
      ]
    });
    return doc.save().then(() => {
      // The following was failing before fixing gh-8531 because
      // the validation was called for the "clip" document twice in the
      // same stack, causing a "can't validate() the same doc multiple times in
      // parallel" warning
      doc.keys[0].ql[0].clip = { width: 4.3, rows: 3 };
      doc.keys[0].ql[0].age = 42;

      return doc.save();
    }); // passes
  });

  it('saves even if `_id` is null (gh-6406)', async function() {
    const schema = new Schema({ _id: Number, val: String });
    const Model = db.model('Test', schema);


    await Model.updateOne({ _id: null }, { val: 'test' }, { upsert: true });

    let doc = await Model.findOne();

    doc.val = 'test2';

    // Should not throw
    await doc.save();

    doc = await Model.findOne();
    assert.strictEqual(doc._id, null);
    assert.equal(doc.val, 'test2');
  });

  it('allows you to skip validation on save (gh-2981)', function() {
    const schema = new Schema({ name: { type: String, required: true } });
    const MyModel = db.model('Test', schema);

    const doc = new MyModel();
    return doc.save({ validateBeforeSave: false });
  });

  it('doesnt use custom toObject options on save', async function() {
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
    const Test = db.model('Test', schema);

    await Test.create({ name: 'chetverikov', iWillNotBeDelete: true, 'nested.iWillNotBeDeleteToo': true });

    const doc = await Test.findOne({});


    assert.equal(doc._doc.iWillNotBeDelete, true);
    assert.equal(doc._doc.nested.iWillNotBeDeleteToo, true);
  });

  describe('toObject', function() {
    it('does not apply toObject functions of subdocuments to root document', async function() {
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

      const Doc = db.model('Test', docSchema);

      const doc = await Doc.create({
        foo: 'someString',
        wow: true,
        sub: [{
          test: 'someOtherString',
          wow: 'thisIsAString'
        }]
      });

      const obj = doc.toObject({
        transform: function(doc, ret) {
          ret.phew = 'new';
        }
      });

      assert.equal(obj.phew, 'new');
      assert.ok(!doc.sub.wow);
    });

    it('handles child schema transforms', function() {
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

      const Topic = db.model('Test', topicSchema);

      const topic = new Topic({
        title: 'Favorite Foods',
        email: 'a@b.co',
        followers: [{ name: 'Val', email: 'val@test.co' }]
      });

      const output = topic.toObject({ transform: true });
      assert.equal(output.title, 'favorite foods');
      assert.equal(output.email, 'a@b.co');
      assert.equal(output.followers[0].name, 'Val');
      assert.equal(output.followers[0].email, undefined);
    });

    it('doesnt clobber child schema options when called with no params (gh-2035)', async function() {
      const userSchema = new Schema({
        firstName: String,
        lastName: String,
        password: String
      });

      userSchema.virtual('fullName').get(function() {
        return this.firstName + ' ' + this.lastName;
      });

      userSchema.set('toObject', { virtuals: false });

      const postSchema = new Schema({
        owner: { type: Schema.Types.ObjectId, ref: 'User' },
        content: String
      });

      postSchema.virtual('capContent').get(function() {
        return this.content.toUpperCase();
      });

      postSchema.set('toObject', { virtuals: true });
      const User = db.model('User', userSchema);
      const Post = db.model('BlogPost', postSchema);

      const user = new User({ firstName: 'Joe', lastName: 'Smith', password: 'password' });

      const savedUser = await user.save();

      const post = await Post.create({ owner: savedUser._id, content: 'lorem ipsum' });

      const newPost = await Post.findById(post._id).populate('owner').exec();

      const obj = newPost.toObject();
      assert.equal(obj.owner.fullName, undefined);
    });

    it('respects child schemas minimize (gh-9405)', function() {
      const postSchema = new Schema({
        owner: { type: Schema.Types.ObjectId, ref: 'User' },
        props: { type: Object, default: {} }
      });
      const userSchema = new Schema({
        firstName: String,
        props: { type: Object, default: {} }
      }, { minimize: false });

      const User = db.model('User', userSchema);
      const Post = db.model('BlogPost', postSchema);

      const user = new User({ firstName: 'test' });
      const post = new Post({ owner: user });

      let obj = post.toObject();
      assert.strictEqual(obj.props, void 0);
      assert.deepEqual(obj.owner.props, {});

      obj = post.toObject({ minimize: false });
      assert.deepEqual(obj.props, {});
      assert.deepEqual(obj.owner.props, {});

      obj = post.toObject({ minimize: true });
      assert.strictEqual(obj.props, void 0);
      assert.strictEqual(obj.owner.props, void 0);
    });

    it('minimizes single nested subdocs (gh-11247)', async function() {
      const nestedSchema = Schema({ bar: String }, { _id: false });
      const schema = Schema({ foo: nestedSchema });

      const MyModel = db.model('Test', schema);

      const myModel = await MyModel.create({ foo: {} });

      assert.strictEqual(myModel.toObject().foo, void 0);
    });

    it('should propogate toObject to implicitly created schemas gh-13325', async function() {
      const userSchema = Schema({
        firstName: String,
        company: {
          type: { companyId: { type: Schema.Types.ObjectId }, companyName: String }
        }
      }, {
        toObject: { virtuals: true }
      });

      userSchema.virtual('company.details').get(() => 42);

      const User = db.model('User', userSchema);
      const user = new User({ firstName: 'test', company: { companyName: 'foo' } });
      const obj = user.toObject();
      assert.strictEqual(obj.company.details, 42);
    });
  });

  describe('toJSON', function() {
    it('toJSON options', function() {
      const doc = new TestDocument();

      doc.init({
        test: 'test',
        oids: [],
        em: [{ title: 'asdf' }],
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

      doc.schema.options.toJSON = { virtuals: true };
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

      doc.schema.options.toJSON = { minimize: false };
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
        if (doc.$isSubdocument) {
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
      const out = { myid: doc._id.toString() };
      doc.schema.options.toJSON.transform = function(doc, ret) {
        // ignore embedded docs
        if (doc.$isSubdocument) {
          return;
        }

        return { myid: ret._id.toString() };
      };

      clone = doc.toJSON();
      assert.deepEqual(out, clone);

      // ignored transform with inline options
      clone = doc.toJSON({ x: 1, transform: false });
      assert.ok(!('myid' in clone));
      assert.equal(clone.test, 'test');
      assert.ok(clone.oids instanceof Array);
      assert.equal(clone.nested.age, 5);
      assert.equal(clone.nested.cool.toString(), '4c6c2d6240ced95d0e00003c');
      assert.equal(clone.nested.path, 'my path');
      assert.equal(clone.em[0].constructor.name, 'Object');

      // applied transform when inline transform is true
      clone = doc.toJSON({ x: 1 });
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
    });

    it('jsonifying an object', function() {
      const doc = new TestDocument({ test: 'woot' });
      const oidString = doc._id.toString();
      // convert to json string
      const json = JSON.stringify(doc);
      // parse again
      const obj = JSON.parse(json);

      assert.equal(obj.test, 'woot');
      assert.equal(obj._id, oidString);
    });

    it('jsonifying an object\'s populated items works (gh-1376)', async function() {
      const userSchema = new Schema({ name: String });
      // includes virtual path when 'toJSON'
      userSchema.set('toJSON', { getters: true });
      userSchema.virtual('hello').get(function() {
        return 'Hello, ' + this.name;
      });
      const User = db.model('User', userSchema);

      const groupSchema = new Schema({
        name: String,
        _users: [{ type: Schema.ObjectId, ref: 'User' }]
      });

      const Group = db.model('Group', groupSchema);

      const [alice, bob] = await User.create({ name: 'Alice' }, { name: 'Bob' });


      const group = await Group.create({ name: 'mongoose', _users: [alice, bob] });
      const foundGroup = await Group.findById(group).populate('_users').exec();

      assert.ok(foundGroup.toJSON()._users[0].hello);
    });

    it('jsonifying with undefined path (gh-11922)', async function() {
      const userSchema = new Schema({
        name: String,
        friends: [{
          type: String,
          transform(friendName) {
            return `Hi, ${friendName}`;
          }
        }]
      });
      const User = db.model('User', userSchema);
      const alice = await User.create({ name: 'Alic', friends: ['Bob', 'Jack'] });
      const foundAlice = await User.findById(alice._id, { name: true });
      assert.equal(foundAlice.friends, undefined);
      const foundAlicJson = foundAlice.toJSON();
      assert.equal(foundAlicJson.friends, undefined);
      assert.equal(foundAlicJson.name, 'Alic');
    });
    it('should propogate toJSON to implicitly created schemas gh-13325', async function() {
      const userSchema = Schema({
        firstName: String,
        company: {
          type: { companyId: { type: Schema.Types.ObjectId }, companyName: String }
        }
      }, {
        id: false,
        toJSON: { virtuals: true }
      });

      userSchema.virtual('company.details').get(() => 'foo');

      const User = db.model('User', userSchema);
      const doc = new User({
        firstName: 'test',
        company: { companyName: 'Acme Inc' }
      });
      const obj = doc.toJSON();
      assert.strictEqual(obj.company.details, 'foo');
    });
  });

  describe('inspect', function() {
    it('inspect inherits schema options (gh-4001)', async function() {
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

      const Task = db.model('Test', taskSchema);

      const doc = { name: 'task1', title: 'task999' };
      await Task.collection.insertOne(doc);

      const foundDoc = await Task.findById(doc._id);

      assert.equal(foundDoc.inspect().title, 'task1');
    });

    it('does not apply transform to populated docs (gh-4213)', async function() {
      const UserSchema = new Schema({
        name: String
      });

      const PostSchema = new Schema({
        title: String,
        postedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      },
      {
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

      const User = db.model('User', UserSchema);
      const Post = db.model('BlogPost', PostSchema);

      const val = new User({ name: 'Val' });
      const post = new Post({ title: 'Test', postedBy: val._id });

      await Post.create(post);

      await User.create(val);

      const posts = await Post.find({}).
        populate('postedBy').
        exec();

      assert.equal(posts.length, 1);
      assert.ok(posts[0].postedBy._id);
    });

    it('handles infinite recursion (gh-11756)', function() {
      const User = db.model('User', Schema({
        name: { type: String, required: true },
        posts: [{ type: mongoose.Types.ObjectId, ref: 'Post' }]
      }));

      const Post = db.model('Post', Schema({
        creator: { type: Schema.Types.ObjectId, ref: 'User' }
      }));

      const user = new User({ name: 'Test', posts: [] });
      const post = new Post({ creator: user });
      user.posts.push(post);

      const inspected = post.inspect();
      assert.ok(inspected);
      assert.equal(inspected.creator.posts[0].creator.name, 'Test');
    });

    it('populate on nested path (gh-5703)', function() {
      const toySchema = new mongoose.Schema({ color: String });
      const Toy = db.model('Cat', toySchema);

      const childSchema = new mongoose.Schema({
        name: String,
        values: {
          toy: { type: mongoose.Schema.Types.ObjectId, ref: 'Cat' }
        }
      });
      const Child = db.model('Child', childSchema);

      return Toy.create({ color: 'brown' }).
        then(function(toy) {
          return Child.create({ values: { toy: toy._id } });
        }).
        then(function(child) {
          return Child.findById(child._id);
        }).
        then(function(child) {
          return child.values.populate('toy').then(function() {
            return child;
          });
        }).
        then(function(child) {
          assert.equal(child.values.toy.color, 'brown');
        });
    });
  });

  describe.skip('#update', function() {
    it('returns a Query', function() {
      const mg = new mongoose.Mongoose();
      const M = mg.model('Test', { s: String });
      const doc = new M();
      assert.ok(doc.update() instanceof Query);
    });
    it('calling update on document should relay to its model (gh-794)', async function() {
      const Docs = new Schema({ text: String });
      const docs = db.model('Test', Docs);
      const d = new docs({ text: 'A doc' });
      let called = false;
      await d.save();

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

      await d.update({ $set: { text: 'A changed doc' } });

      assert.equal(called, true);
    });
  });

  it('toObject should not set undefined values to null', function() {
    const doc = new TestDocument();
    const obj = doc.toObject();

    delete obj._id;
    assert.deepEqual(obj, { numbers: [], oids: [], em: [] });
  });

  describe('Errors', function() {
    it('MongooseErrors should be instances of Error (gh-209)', function() {
      const MongooseError = require('../lib/error');
      const err = new MongooseError('Some message');
      assert.ok(err instanceof Error);
    });
    it('ValidationErrors should be instances of Error', function() {
      const ValidationError = Document.ValidationError;
      const err = new ValidationError(new TestDocument());
      assert.ok(err instanceof Error);
    });
  });

  it('methods on embedded docs should work', function() {
    const ESchema = new Schema({ name: String });

    ESchema.methods.test = function() {
      return this.name + ' butter';
    };
    ESchema.statics.ten = function() {
      return 10;
    };

    const E = db.model('Test', ESchema);
    const PSchema = new Schema({ embed: [ESchema] });
    const P = db.model('Test2', PSchema);

    let p = new P({ embed: [{ name: 'peanut' }] });
    assert.equal(typeof p.embed[0].test, 'function');
    assert.equal(typeof E.ten, 'function');
    assert.equal(p.embed[0].test(), 'peanut butter');
    assert.equal(E.ten(), 10);

    // test push casting
    p = new P();
    p.embed.push({ name: 'apple' });
    assert.equal(typeof p.embed[0].test, 'function');
    assert.equal(typeof E.ten, 'function');
    assert.equal(p.embed[0].test(), 'apple butter');
  });

  it('setting a positional path does not cast value to array', function() {
    const doc = new TestDocument();
    doc.init({ numbers: [1, 3] });
    assert.equal(doc.numbers[0], 1);
    assert.equal(doc.numbers[1], 3);
    doc.set('numbers.1', 2);
    assert.equal(doc.numbers[0], 1);
    assert.equal(doc.numbers[1], 2);
  });

  it('no maxListeners warning should occur', function() {
    let traced = false;
    const trace = console.trace;

    console.trace = function() {
      traced = true;
      console.trace = trace;
    };

    const schema = new Schema({
      title: String,
      embed1: [new Schema({ name: String })],
      embed2: [new Schema({ name: String })],
      embed3: [new Schema({ name: String })],
      embed4: [new Schema({ name: String })],
      embed5: [new Schema({ name: String })],
      embed6: [new Schema({ name: String })],
      embed7: [new Schema({ name: String })],
      embed8: [new Schema({ name: String })],
      embed9: [new Schema({ name: String })],
      embed10: [new Schema({ name: String })],
      embed11: [new Schema({ name: String })]
    });

    const S = db.model('Test', schema);

    new S({ title: 'test' });
    assert.equal(traced, false);
  });

  it('unselected required fields should pass validation', async function() {
    const userSchema = new Schema({
      name: String,
      req: { type: String, required: true }
    });
    const User = db.model('Test', userSchema);

    const user = await User.create({ name: 'teeee', req: 'i am required' });

    const user1 = await User.findById(user).select('name').exec();
    assert.equal(user1.req, void 0);

    user1.name = 'wooo';
    await user1.save();
    const user2 = await User.findById(user1).select('name').exec();

    user2.req = undefined;
    let err = await user2.save().then(() => null, err => err);
    err = String(err);

    const invalid = /Path `req` is required./.test(err);
    assert.ok(invalid);

    user2.req = 'it works again';
    await user2.save();

    const user3 = await User.findById(user2).select('_id').exec();
    await user3.save();
  });

  describe('#validate', function() {
    it('works (gh-891)', async function() {
      let schema = null;
      let called = false;

      const validate = [function() {
        called = true;
        return true;
      }, 'BAM'];

      schema = new Schema({
        prop: { type: String, required: true, validate: validate },
        nick: { type: String, required: true }
      });

      const M = db.model('Test', schema);
      const m = new M({ prop: 'gh891', nick: 'validation test' });
      await m.save();

      assert.equal(called, true);
      called = false;

      const m2 = await M.findById(m, 'nick');
      assert.equal(called, false);

      m2.nick = 'gh-891';
      await m2.save();

      assert.equal(called, false);
    });

    it('can return a promise', async function() {
      let schema = null;

      const validate = [function() {
        return true;
      }, 'BAM'];

      schema = new Schema({
        prop: { type: String, required: true, validate: validate },
        nick: { type: String, required: true }
      });

      const M = db.model('Test', schema);
      const m = new M({ prop: 'gh891', nick: 'validation test' });
      const mBad = new M({ prop: 'other' });

      await m.validate().then(res => res);

      const err = await mBad.validate().then(() => null, err => err);
      assert.ok(err);
    });

    it('doesnt have stale cast errors (gh-2766)', async function() {
      const testSchema = new Schema({ name: String });
      const M = db.model('Test', testSchema);

      const m = new M({ _id: 'this is not a valid _id' });
      assert.ok(!m.$isValid('_id'));
      assert.ok(m.validateSync().errors['_id'].name, 'CastError');

      m._id = '000000000000000000000001';
      assert.ok(m.$isValid('_id'));
      assert.ifError(m.validateSync());
      await m.validate();
    });

    it('cast errors persist across validate() calls (gh-2766)', async function() {
      const db = start();
      const testSchema = new Schema({ name: String });
      const M = db.model('Test', testSchema);

      const m = new M({ _id: 'this is not a valid _id' });
      assert.ok(!m.$isValid('_id'));
      const error = await m.validate().then(() => null, err => err);

      assert.ok(error);
      assert.equal(error.errors['_id'].name, 'CastError');
      const error2 = await m.validate().then(() => null, err => err);

      assert.ok(error2);
      assert.equal(error2.errors['_id'].name, 'CastError');

      const err1 = m.validateSync();
      const err2 = m.validateSync();
      assert.equal(err1.errors['_id'].name, 'CastError');
      assert.equal(err2.errors['_id'].name, 'CastError');
      await db.close();
    });

    it('returns a promise when there are no validators', function(done) {
      let schema = null;

      schema = new Schema({ _id: String });

      const M = db.model('Test', schema);
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
      it('with required', async function() {
        const schema = new Schema({
          name: String,
          arr: { type: [], required: true }
        });
        const M = db.model('Test', schema);
        const m = new M({ name: 'gh1109-1', arr: null });
        try {
          await m.save();

          assert.ok(false);
        } catch (error) {
          assert.ok(/Path `arr` is required/.test(error));
        }

        m.arr = null;
        try {
          await m.save();

          assert.ok(false);
        } catch (error) {
          assert.ok(/Path `arr` is required/.test(error));
        }

        m.arr = [];
        m.arr.push('works');
        await m.save();
      });

      it('with custom validator', async function() {
        let called = false;

        function validator(val) {
          called = true;
          return val && val.length > 1;
        }

        const validate = [validator, 'BAM'];

        const schema = new Schema({
          arr: { type: [], validate: validate }
        });

        const M = db.model('Test', schema);
        const m = new M({ name: 'gh1109-2', arr: [1] });
        assert.equal(called, false);
        try {
          await m.save();
          throw new Error('Should not have succeeded');
        } catch (err) {
          assert.equal(String(err), 'ValidationError: arr: BAM');
          assert.equal(called, true);
          m.arr.push(2);
          called = false;
          await m.save();
          assert.equal(called, true);
        }
      });

      it('with both required + custom validator', async function() {
        function validator(val) {
          return val && val.length > 1;
        }

        const validate = [validator, 'BAM'];

        const schema = new Schema({
          arr: { type: [], required: true, validate: validate }
        });

        const M = db.model('Test', schema);
        const m = new M({ name: 'gh1109-3', arr: null });
        try {
          await m.save();
          throw new Error('Should not get here');
        } catch (err) {
          assert.equal(err.errors.arr.message, 'Path `arr` is required.');
        }

        m.arr = [{ nice: true }];
        try {
          await m.save();
          throw new Error('Should not get here');
        } catch (err) {
          assert.equal(String(err), 'ValidationError: arr: BAM');
        }

        m.arr.push(95);
        await m.save();
      });
    });

    it('validator should run only once gh-1743', async function() {
      let count = 0;

      const Control = new Schema({
        test: {
          type: String,
          validate: function() {
            count++;
            return true;
          }
        }
      });
      const PostSchema = new Schema({
        controls: [Control]
      });

      const Post = db.model('BlogPost', PostSchema);

      const post = new Post({
        controls: [{
          test: 'xx'
        }]
      });

      await post.save();

      assert.equal(count, 1);
    });

    it('validator should run only once per sub-doc gh-1743', async function() {
      this.timeout(4500);

      let count = 0;
      const db = start();

      const Control = new Schema({
        test: {
          type: String,
          validate: function() {
            count++;
          }
        }
      });
      const PostSchema = new Schema({
        controls: [Control]
      });

      const Post = db.model('BlogPost', PostSchema);

      const post = new Post({
        controls: [
          { test: 'xx' },
          { test: 'yy' }
        ]
      });

      await post.save();

      assert.equal(count, post.controls.length);
      await db.close();
    });
  });

  it('#invalidate', async function() {
    let InvalidateSchema = null;
    let Post = null;
    let post = null;

    InvalidateSchema = new Schema({ prop: { type: String } },
      { strict: false });

    Post = db.model('Test', InvalidateSchema);
    post = new Post();
    post.set({ baz: 'val' });
    const _err = post.invalidate('baz', 'validation failed for path {PATH}',
      'val', 'custom error');
    assert.ok(_err instanceof ValidationError);

    try {
      await post.save();
      assert.ok(false);
    } catch (err) {
      assert.ok(err instanceof MongooseError);
      assert.ok(err instanceof ValidationError);
      assert.ok(err.errors.baz instanceof ValidatorError);
      assert.equal(err.errors.baz.message, 'validation failed for path baz');
      assert.equal(err.errors.baz.path, 'baz');
      assert.equal(err.errors.baz.value, 'val');
      assert.equal(err.errors.baz.kind, 'custom error');
    }

    await post.save();
  });

  describe('#equals', function() {
    describe('should work', function() {
      let S;
      let N;
      let O;
      let B;
      let M;

      before(function() {
        db.deleteModel(/^Test/);
        S = db.model('Test', new Schema({ _id: String }));
        N = db.model('Test2', new Schema({ _id: Number }));
        O = db.model('Test3', new Schema({ _id: Schema.ObjectId }));
        B = db.model('Test4', new Schema({ _id: Buffer }));
        M = db.model('Test5', new Schema({ name: String }, { _id: false }));
      });

      it('with string _ids', function() {
        const s1 = new S({ _id: 'one' });
        const s2 = new S({ _id: 'one' });
        assert.ok(s1.equals(s2));
      });
      it('with number _ids', function() {
        const n1 = new N({ _id: 0 });
        const n2 = new N({ _id: 0 });
        assert.ok(n1.equals(n2));
      });
      it('with ObjectId _ids', function() {
        let id = new mongoose.Types.ObjectId();
        let o1 = new O({ _id: id });
        let o2 = new O({ _id: id });
        assert.ok(o1.equals(o2));

        id = String(new mongoose.Types.ObjectId());
        o1 = new O({ _id: id });
        o2 = new O({ _id: id });
        assert.ok(o1.equals(o2));
      });
      it('with Buffer _ids', function() {
        const n1 = new B({ _id: 0 });
        const n2 = new B({ _id: 0 });
        assert.ok(n1.equals(n2));
      });
      it('with _id disabled (gh-1687)', function() {
        const m1 = new M();
        const m2 = new M();
        assert.doesNotThrow(function() {
          m1.equals(m2);
        });
      });
    });
  });

  describe('setter', function() {
    describe('order', function() {
      it('is applied correctly', function() {
        const date = 'Thu Aug 16 2012 09:45:59 GMT-0700';
        const d = new TestDocument();
        dateSetterCalled = false;
        d.date = date;
        assert.ok(dateSetterCalled);
        dateSetterCalled = false;
        assert.ok(d._doc.date instanceof Date);
        assert.ok(d.date instanceof Date);
        assert.equal(+d.date, +new Date(date));
      });
    });

    it('works with undefined (gh-1892)', async function() {
      const d = new TestDocument();
      d.nested.setr = undefined;
      assert.equal(d.nested.setr, 'undefined setter');
      dateSetterCalled = false;
      d.date = undefined;
      await d.validate();
      assert.ok(dateSetterCalled);
    });

    it('passes priorVal (gh-8629)', function() {
      const names = [];
      const profiles = [];
      const Model = db.model('Test', Schema({
        name: {
          type: String,
          set: (v, priorVal) => {
            names.push(priorVal);
            return v;
          }
        },
        profile: {
          type: Schema({ age: Number }, { _id: false }),
          set: (v, priorVal) => {
            profiles.push(priorVal == null ? priorVal : priorVal.toObject());
            return v;
          }
        }
      }));
      const doc = new Model({ name: 'test', profile: { age: 29 } });
      assert.deepEqual(names, [null]);
      assert.deepEqual(profiles, [null]);

      doc.name = 'test2';
      doc.profile = { age: 30 };
      assert.deepEqual(names, [null, 'test']);
      assert.deepEqual(profiles, [null, { age: 29 }]);
    });

    describe('on nested paths', function() {
      describe('using set(path, object)', function() {
        it('overwrites the entire object', function() {
          const doc = new TestDocument();

          doc.init({
            test: 'Test',
            nested: {
              age: 5
            }
          });

          doc.set('nested', { path: 'overwrite the entire nested object' });
          assert.equal(doc.nested.age, undefined);
          assert.equal(Object.keys(doc._doc.nested).length, 1);
          assert.equal(doc.nested.path, 'overwrite the entire nested object');
          assert.ok(doc.isModified('nested'));
        });

        it('allows positional syntax on mixed nested paths (gh-6738)', function() {
          const schema = new Schema({ nested: {} });
          const M = db.model('Test', schema);
          const doc = new M({
            'nested.x': 'foo',
            'nested.y': 42,
            'nested.a.b.c': { d: { e: { f: 'g' } } }
          });
          assert.strictEqual(doc.nested.x, 'foo');
          assert.strictEqual(doc.nested.y, 42);
          assert.strictEqual(doc.nested.a.b.c.d.e.f, 'g');
        });

        it('gh-1954', function() {
          const schema = new Schema({
            schedule: [new Schema({ open: Number, close: Number })]
          });

          const M = db.model('BlogPost', schema);

          const doc = new M({
            schedule: [{
              open: 1000,
              close: 1900
            }]
          });

          assert.ok(doc.schedule[0] instanceof ArraySubdocument);
          doc.set('schedule.0.open', 1100);
          assert.ok(doc.schedule);
          assert.ok(doc.schedule.isMongooseDocumentArray);
          assert.ok(doc.schedule[0] instanceof ArraySubdocument);
          assert.equal(doc.schedule[0].open, 1100);
          assert.equal(doc.schedule[0].close, 1900);
        });
      });

      describe('when overwriting with a document instance', function() {
        it('does not cause StackOverflows (gh-1234)', function() {
          const doc = new TestDocument({ nested: { age: 35 } });
          doc.nested = doc.nested;
          assert.doesNotThrow(function() {
            doc.nested.age;
          });
        });
      });
    });
  });

  describe('virtual', function() {
    describe('setter', function() {
      let val;
      let M;

      beforeEach(function() {
        const schema = new mongoose.Schema({ v: Number });
        schema.virtual('thang').set(function(v) {
          val = v;
        });

        db.deleteModel(/Test/);
        M = db.model('Test', schema);
      });

      it('works with objects', function() {
        new M({ thang: {} });
        assert.deepEqual({}, val);
      });
      it('works with arrays', function() {
        new M({ thang: [] });
        assert.deepEqual([], val);
      });
      it('works with numbers', function() {
        new M({ thang: 4 });
        assert.deepEqual(4, val);
      });
      it('works with strings', function() {
        new M({ thang: '3' });
        assert.deepEqual('3', val);
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
          doc.name.last = parts[parts.length - 1];
          doc.name.first = parts.slice(0, parts.length - 1).join(' ');
        });
      const Model = db.model('Person', schema);

      const doc = new Model({ name: { first: 'Jean-Luc', last: 'Picard' } });
      assert.equal(doc.fullname, 'Jean-Luc Picard');

      doc.fullname = 'Will Riker';
      assert.equal(doc.name.first, 'Will');
      assert.equal(doc.name.last, 'Riker');
    });
  });

  describe('gh-2082', function() {
    it('works', async function() {
      const Parent = db.model('Test', parentSchema);

      const parent = new Parent({ name: 'Hello' });
      await parent.save();

      parent.children.push({ counter: 0 });
      await parent.save();

      parent.children[0].counter += 1;
      await parent.save();

      parent.children[0].counter += 1;
      await parent.save();

      await Parent.findOne({});

      assert.equal(parent.children[0].counter, 2);
    });
  });

  describe('gh-1933', function() {
    it('works', async function() {
      const M = db.model('Test', new Schema({ id: String, field: Number }));

      const doc = await M.create({});

      doc.__v = 123;
      doc.field = 5;

      // Does not throw
      await doc.save();
    });
  });

  describe('gh-1638', function() {
    it('works', async function() {
      const ItemChildSchema = new mongoose.Schema({
        name: { type: String, required: true, default: 'hello' }
      });

      const ItemParentSchema = new mongoose.Schema({
        children: [ItemChildSchema]
      });

      const ItemParent = db.model('Parent', ItemParentSchema);
      const ItemChild = db.model('Child', ItemChildSchema);

      const c1 = new ItemChild({ name: 'first child' });
      const c2 = new ItemChild({ name: 'second child' });

      const p = new ItemParent({
        children: [c1, c2]
      });

      await p.save();

      c2.name = 'updated 2';
      p.children = [c2];
      await p.save();

      assert.equal(p.children.length, 1);
    });
  });

  describe('gh-2434', function() {
    it('will save the new value', async function() {
      const ItemSchema = new mongoose.Schema({
        st: Number,
        s: []
      });

      const Item = db.model('Test', ItemSchema);

      const item = new Item({ st: 1 });

      await item.save();

      item.st = 3;
      item.s = [];
      await item.save();

      // item.st is 3 but may not be saved to DB
      const doc = await Item.findById(item._id);
      assert.equal(doc.st, 3);
    });
  });

  describe('gh-8371', function() {
    beforeEach(async() => {
      const Person = db.model('Person', Schema({ name: String }));

      await Person.deleteMany({});

      db.deleteModel('Person');
    });

    it('setting isNew to true makes save tries to insert a new document (gh-8371)', async function() {
      const personSchema = new Schema({ name: String });
      const Person = db.model('Person', personSchema);

      const createdPerson = await Person.create({ name: 'Hafez' });
      const removedPerson = await Person.findOneAndRemove({ _id: createdPerson._id });

      removedPerson.isNew = true;

      await removedPerson.save();

      const foundPerson = await Person.findOne({ _id: removedPerson._id });
      assert.ok(foundPerson);
    });

    it('setting isNew to true throws an error when a document already exists (gh-8371)', async function() {

      const personSchema = new Schema({ name: String });
      const Person = db.model('Person', personSchema);

      const createdPerson = await Person.create({ name: 'Hafez' });

      createdPerson.isNew = true;

      let threw = false;
      try {
        await createdPerson.save();
      } catch (err) {
        threw = true;
        assert.equal(err.code, 11000);
      }

      assert.equal(threw, true);
    });

    it('saving a document with no changes, throws an error when document is not found', async function() {
      const personSchema = new Schema({ name: String });
      const Person = db.model('Person', personSchema);

      const person = await Person.create({ name: 'Hafez' });

      await Person.deleteOne({ _id: person._id });

      const err = await person.save().then(() => null, err => err);
      assert.equal(err instanceof DocumentNotFoundError, true);
      assert.equal(err.message, `No document found for query "{ _id: new ObjectId("${person._id}") }" on model "Person"`);
    });

    it('saving a document when version bump required, throws a VersionError when document is not found (gh-10974)', async function() {
      const personSchema = new Schema({ tags: [String] });
      const Person = db.model('Person', personSchema);

      const person = await Person.create({ tags: ['tag1', 'tag2'] });

      await Person.deleteOne({ _id: person._id });

      person.tags.splice(0, 1);

      const err = await person.save().then(() => null, err => err);
      assert.ok(err instanceof VersionError);
      assert.equal(err.message, `No matching document found for id "${person._id}" version 0 modifiedPaths "tags"`);
    });

    it('saving a document with changes, throws an error when document is not found', async function() {

      const personSchema = new Schema({ name: String });
      const Person = db.model('Person', personSchema);

      const person = await Person.create({ name: 'Hafez' });

      await Person.deleteOne({ _id: person._id });

      person.name = 'Different Name';

      let threw = false;
      try {
        await person.save();
      }
      catch (err) {
        assert.equal(err instanceof DocumentNotFoundError, true);
        assert.equal(err.message, `No document found for query "{ _id: new ObjectId("${person._id}") }" on model "Person"`);
        threw = true;
      }

      assert.equal(threw, true);
    });
  });

  it('properly calls queue functions (gh-2856)', function() {
    const personSchema = new mongoose.Schema({
      name: String
    });

    let calledName;
    personSchema.methods.fn = function() {
      calledName = this.name;
    };
    personSchema.queue('fn');

    const Person = db.model('Person', personSchema);
    new Person({ name: 'Val' });
    assert.equal(calledName, 'Val');
  });

  describe('bug fixes', function() {
    it('applies toJSON transform correctly for populated docs (gh-2910) (gh-2990)', async function() {
      const parentSchema = mongoose.Schema({
        c: { type: mongoose.Schema.Types.ObjectId, ref: 'Child' }
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

      const Child = db.model('Child', childSchema);
      const Parent = db.model('Parent', parentSchema);

      const c = await Child.create({ name: 'test' });

      const createdParent = await Parent.create({ c: c._id });

      const p = await Parent.findOne({ _id: createdParent._id }).populate('c').exec();

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
      doc = JSON.parse(JSON.stringify({ parent: p })).parent;
      assert.equal(called.length, 1);
      assert.equal(called[0]._id.toString(), p._id.toString());
      assert.equal(doc._id.toString(), p._id.toString());
      assert.equal(childCalled.length, 1);
      assert.equal(childCalled[0]._id.toString(), c._id.toString());
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
      const MyModel = db.model('Test', topLevelSchema);

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

    it('setters firing with objects on real paths (gh-2943)', function() {
      const M = db.model('Test', {
        myStr: {
          type: String, set: function(v) {
            return v.value;
          }
        },
        otherStr: String
      });

      const t = new M({ myStr: { value: 'test' } });
      assert.equal(t.myStr, 'test');

      new M({ otherStr: { value: 'test' } });
      assert.ok(!t.otherStr);
    });

    describe('gh-2782', function() {
      it('should set data from a sub doc', function() {
        const schema1 = new mongoose.Schema({
          data: {
            email: String
          }
        });
        const schema2 = new mongoose.Schema({
          email: String
        });
        const Model1 = db.model('Test', schema1);
        const Model2 = db.model('Test1', schema2);

        const doc1 = new Model1({ 'data.email': 'some@example.com' });
        assert.equal(doc1.data.email, 'some@example.com');
        const doc2 = new Model2();
        doc2.set(doc1.data);
        assert.equal(doc2.email, 'some@example.com');
      });
    });

    it('set data from subdoc keys (gh-3346)', function() {
      const schema1 = new mongoose.Schema({
        data: {
          email: String
        }
      });
      const Model1 = db.model('Test', schema1);

      const doc1 = new Model1({ 'data.email': 'some@example.com' });
      assert.equal(doc1.data.email, 'some@example.com');
      const doc2 = new Model1({ data: doc1.data });
      assert.equal(doc2.data.email, 'some@example.com');
    });

    it('doesnt attempt to cast generic objects as strings (gh-3030)', async function() {
      const M = db.model('Test', {
        myStr: {
          type: String
        }
      });

      const t = new M({ myStr: { thisIs: 'anObject' } });
      assert.ok(!t.myStr);
      await assert.rejects(t.validate());
    });

    it('single embedded schemas 1 (gh-2689)', async function() {
      const userSchema = new mongoose.Schema({
        name: String,
        email: String
      }, { _id: false, id: false });

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

      const Event = db.model('Event', eventSchema);

      const e = new Event({ name: 'test', user: { name: 123, email: 'val' } });
      await e.save();
      assert.strictEqual(e.user.name, '123');
      assert.equal(eventHookCount, 1);
      assert.equal(userHookCount, 1);

      const doc = await Event.findOne({ user: { name: '123', email: 'val' } });
      assert.ok(doc);

      const doc2 = await Event.findOne({ user: { $in: [{ name: '123', email: 'val' }] } });
      assert.ok(doc2);
    });

    it('single embedded schemas with validation (gh-2689)', function() {
      const userSchema = new mongoose.Schema({
        name: String,
        email: { type: String, required: true, match: /.+@.+/ }
      }, { _id: false, id: false });

      const eventSchema = new mongoose.Schema({
        user: userSchema,
        name: String
      });

      const Event = db.model('Event', eventSchema);

      const e = new Event({ name: 'test', user: {} });
      let error = e.validateSync();
      assert.ok(error);
      assert.ok(error.errors['user.email']);
      assert.equal(error.errors['user.email'].kind, 'required');

      e.user.email = 'val';
      error = e.validateSync();

      assert.ok(error);
      assert.ok(error.errors['user.email']);
      assert.equal(error.errors['user.email'].kind, 'regexp');
    });

    it('single embedded parent() (gh-5134)', function() {
      const userSchema = new mongoose.Schema({
        name: String,
        email: { type: String, required: true, match: /.+@.+/ }
      }, { _id: false, id: false });

      const eventSchema = new mongoose.Schema({
        user: userSchema,
        name: String
      });

      const Event = db.model('Event', eventSchema);

      const e = new Event({ name: 'test', user: {} });
      assert.strictEqual(e.user.parent(), e.user.ownerDocument());
    });

    it('single embedded schemas with markmodified (gh-2689)', async function() {
      const userSchema = new mongoose.Schema({
        name: String,
        email: { type: String, required: true, match: /.+@.+/ }
      }, { _id: false, id: false });

      const eventSchema = new mongoose.Schema({
        user: userSchema,
        name: String
      });

      const Event = db.model('Event', eventSchema);

      const e = new Event({ name: 'test', user: { email: 'a@b' } });
      const doc = await e.save();

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
        $set: { 'user.name': 'Val' }
      });

      await doc.save();

      const event = await Event.findOne({ _id: doc._id });

      assert.deepEqual(event.user.toObject(), { email: 'a@b', name: 'Val' });
    });

    it('single embedded schemas + update validators (gh-2689)', async function() {
      const userSchema = new mongoose.Schema({
        name: { type: String, default: 'Val' },
        email: { type: String, required: true, match: /.+@.+/ }
      }, { _id: false, id: false });

      const eventSchema = new mongoose.Schema({
        user: userSchema,
        name: String
      });

      const Event = db.model('Event', eventSchema);

      const badUpdate = { $set: { 'user.email': 'a' } };
      const options = { runValidators: true };

      const error = await Event.updateOne({}, badUpdate, options).then(() => null, err => err);

      assert.ok(error);
      assert.equal(error.errors['user.email'].kind, 'regexp');

      const nestedUpdate = { name: 'test', user: {} };

      // Does not throw
      await Event.updateOne({}, nestedUpdate, { upsert: true });

      const ev = await Event.findOne({ name: 'test' });

      assert.equal(ev.user.name, 'Val');
    });

    it('single embedded schema update validators ignore _id (gh-6269)', async function() {

      const subDocSchema = new mongoose.Schema({ name: String });

      const schema = new mongoose.Schema({
        subDoc: subDocSchema,
        test: String
      });

      const Model = db.model('Test', schema);

      const fakeDoc = new Model({});
      await Model.create({});

      const res = await Model.findOneAndUpdate(
        { _id: fakeDoc._id },
        { test: 'test' },
        { upsert: true, new: true }
      );

      assert.equal(res.test, 'test');
      assert.ok(!res.subDoc);
    });
  });

  describe('error processing (gh-2284)', async function() {
    it('save errors', async function() {
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

      const Model = db.model('Test', schema);

      const error = await Model.create({}).then(() => null, err => err);

      assert.ok(error);
      assert.equal(error.message, 'Catch all #2');
    });

    it('validate errors (gh-4885)', async function() {
      const testSchema = new Schema({ title: { type: String, required: true } });

      let called = 0;
      testSchema.post('validate', function(error, doc, next) {
        ++called;
        next(error);
      });

      const Test = db.model('Test', testSchema);

      const error = await Test.create({}).then(() => null, err => err);

      assert.ok(error);
      assert.equal(called, 1);
    });

    it('does not filter validation on unmodified paths when validateModifiedOnly not set (gh-7421)', async function() {
      const testSchema = new Schema({ title: { type: String, required: true }, other: String });

      const Test = db.model('Test', testSchema);

      const docs = await Test.create([{}], { validateBeforeSave: false });

      const doc = docs[0];
      doc.other = 'something';
      assert.ok(doc.validateSync().errors);
      const error = await doc.save().then(() => null, err => err);
      assert.ok(error.errors);
    });

    it('filters out validation on unmodified paths when validateModifiedOnly set (gh-7421) (gh-9963)', async function() {
      const testSchema = new Schema({
        title: { type: String, required: true },
        other: String,
        subdocs: [{ name: { type: String, required: true } }]
      });

      const Test = db.model('Test', testSchema);

      const docs = await Test.create(
        [{ subdocs: [{ name: null }, { name: 'test' }] }],
        { validateBeforeSave: false }
      );

      const doc = docs[0];
      doc.other = 'something';
      doc.subdocs[1].name = 'test2';
      assert.equal(doc.validateSync({ validateModifiedOnly: true }), null);
      assert.equal(doc.validateSync('other'), null);
      assert.ok(doc.validateSync('other title').errors['title']);

      // Does not throw
      await doc.save({ validateModifiedOnly: true });
    });

    it('does not filter validation on modified paths when validateModifiedOnly set (gh-7421)', async function() {
      const testSchema = new Schema({ title: { type: String, required: true }, other: String });

      const Test = db.model('Test', testSchema);

      const docs = await Test.create([{ title: 'title' }], { validateBeforeSave: false });

      const doc = docs[0];
      doc.title = '';
      assert.ok(doc.validateSync({ validateModifiedOnly: true }).errors);
      const error = await doc.save({ validateModifiedOnly: true }).then(() => null, err => err);

      assert.ok(error.errors);
    });

    it('validateModifiedOnly with pre existing validation error (gh-8091)', async function() {
      const schema = mongoose.Schema({
        title: String,
        coverId: Number
      }, { validateModifiedOnly: true });

      const Model = db.model('Test', schema);


      await Model.collection.insertOne({ title: 'foo', coverId: parseFloat('not a number') });

      const doc = await Model.findOne();
      doc.title = 'bar';
      // Should not throw
      await doc.save();
    });

    it('handles non-errors', async function() {
      const schema = new Schema({
        name: { type: String, required: true }
      });

      schema.post('save', function(error, doc, next) {
        next(new Error('Catch all'));
      });

      schema.post('save', function(error, doc, next) {
        next(new Error('Catch all #2'));
      });

      const Model = db.model('Test', schema);

      // Does not throw
      await Model.create({ name: 'test' });
    });
  });

  describe('bug fixes', function() {
    beforeEach(() => db.deleteModel(/.*/));

    it('single embedded schemas with populate (gh-3501)', async function() {
      const PopulateMeSchema = new Schema({});

      const Child = db.model('Child', PopulateMeSchema);

      const SingleNestedSchema = new Schema({
        populateMeArray: [{
          type: Schema.Types.ObjectId,
          ref: 'Child'
        }]
      });

      const parentSchema = new Schema({
        singleNested: SingleNestedSchema
      });

      const P = db.model('Parent', parentSchema);

      const docs = await Child.create([{}, {}]);

      const obj = {
        singleNested: { populateMeArray: [docs[0]._id, docs[1]._id] }
      };
      const doc = await P.create(obj);

      const foundDoc = await P.
        findById(doc._id).
        populate('singleNested.populateMeArray').
        exec();

      assert.ok(foundDoc.singleNested.populateMeArray[0]._id);
    });

    it('single embedded schemas with methods (gh-3534)', function() {
      const personSchema = new Schema({ name: String });
      personSchema.methods.firstName = function() {
        return this.name.substring(0, this.name.indexOf(' '));
      };

      const bandSchema = new Schema({ leadSinger: personSchema });
      const Band = db.model('Band', bandSchema);

      const gnr = new Band({ leadSinger: { name: 'Axl Rose' } });
      assert.equal(gnr.leadSinger.firstName(), 'Axl');
    });

    it('single embedded schemas with models (gh-3535)', async function() {
      const personSchema = new Schema({ name: String });
      const Person = db.model('Person', personSchema);

      const bandSchema = new Schema({ leadSinger: personSchema });
      const Band = db.model('Band', bandSchema);

      const axl = new Person({ name: 'Axl Rose' });
      const gnr = new Band({ leadSinger: axl });

      await gnr.save();
      assert.equal(gnr.leadSinger.name, 'Axl Rose');
    });

    it('single embedded schemas with indexes (gh-3594)', function() {
      const personSchema = new Schema({ name: { type: String, unique: true } });

      const bandSchema = new Schema({ leadSinger: personSchema });

      assert.equal(bandSchema.indexes().length, 1);
      const index = bandSchema.indexes()[0];
      assert.deepEqual(index[0], { 'leadSinger.name': 1 });
      assert.ok(index[1].unique);
    });

    it('removing single embedded docs (gh-3596)', async function() {
      const personSchema = new Schema({ name: String });

      const bandSchema = new Schema({ guitarist: personSchema, name: String });
      const Band = db.model('Band', bandSchema);

      const gnr = new Band({
        name: 'Guns N\' Roses',
        guitarist: { name: 'Slash' }
      });

      await gnr.save();

      gnr.guitarist = undefined;
      await gnr.save();

      assert.ok(!gnr.guitarist);
    });

    it('setting single embedded docs (gh-3601)', async function() {
      const personSchema = new Schema({ name: String });

      const bandSchema = new Schema({ guitarist: personSchema, name: String });
      const Band = db.model('Band', bandSchema);

      const gnr = new Band({
        name: 'Guns N\' Roses',
        guitarist: { name: 'Slash' }
      });
      const velvetRevolver = new Band({
        name: 'Velvet Revolver'
      });
      velvetRevolver.guitarist = gnr.guitarist;
      await velvetRevolver.save();

      assert.equal(velvetRevolver.guitarist.name, 'Slash');
    });

    it('single embedded docs init obeys strict mode (gh-3642)', async function() {
      const personSchema = new Schema({ name: String });

      const bandSchema = new Schema({ guitarist: personSchema, name: String });
      const Band = db.model('Band', bandSchema);

      const velvetRevolver = new Band({
        name: 'Velvet Revolver',
        guitarist: { name: 'Slash', realName: 'Saul Hudson' }
      });

      await velvetRevolver.save();

      const query = { name: 'Velvet Revolver' };
      const band = await Band.collection.findOne(query);

      assert.ok(!band.guitarist.realName);
    });

    it('single embedded docs post hooks (gh-3679)', async function() {
      const postHookCalls = [];
      const personSchema = new Schema({ name: String });
      personSchema.post('save', function() {
        postHookCalls.push(this);
      });

      const bandSchema = new Schema({ guitarist: personSchema, name: String });
      const Band = db.model('Band', bandSchema);
      const obj = { name: 'Guns N\' Roses', guitarist: { name: 'Slash' } };

      await Band.create(obj);
      await new Promise((resolve) => {
        setTimeout(function() {
          assert.equal(postHookCalls.length, 1);
          assert.equal(postHookCalls[0].name, 'Slash');
          resolve();
        });
      });

    });

    it('single embedded docs .set() (gh-3686)', async function() {
      const personSchema = new Schema({ name: String, realName: String });

      const bandSchema = new Schema({
        guitarist: personSchema,
        name: String
      });
      const Band = db.model('Band', bandSchema);
      const obj = {
        name: 'Guns N\' Roses',
        guitarist: { name: 'Slash', realName: 'Saul Hudson' }
      };

      const gnr = await Band.create(obj);

      gnr.set('guitarist.name', 'Buckethead');
      await gnr.save();

      assert.equal(gnr.guitarist.name, 'Buckethead');
      assert.equal(gnr.guitarist.realName, 'Saul Hudson');
    });

    it('single embedded docs with arrays pre hooks (gh-3680)', async function() {
      const childSchema = new Schema({ count: Number });

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

      const Parent = db.model('Parent', ParentSchema);
      const obj = { singleNested: { children: [{ count: 0 }] } };
      await Parent.create(obj);

      assert.equal(preCalls, 1);
    });

    it('nested single embedded doc validation (gh-3702)', async() => {
      const childChildSchema = new Schema({ count: { type: Number, min: 1 } });
      const childSchema = new Schema({ child: childChildSchema });
      const parentSchema = new Schema({ child: childSchema });

      const Parent = db.model('Parent', parentSchema);
      const obj = { child: { child: { count: 0 } } };

      try {
        await Parent.create(obj);

        assert.ok(false);
      } catch (error) {
        assert.ok(error);
        assert.ok(/ValidationError/.test(error.toString()));
      }
    });

    it('handles virtuals with dots correctly (gh-3618)', function() {
      const testSchema = new Schema({ nested: { type: Object, default: {} } });
      testSchema.virtual('nested.test').get(function() {
        return true;
      });

      const Test = db.model('Test', testSchema);

      const test = new Test();

      let doc = test.toObject({ getters: true, virtuals: true });
      delete doc._id;
      delete doc.id;
      assert.deepEqual(doc, { nested: { test: true } });

      doc = test.toObject({ getters: false, virtuals: true });
      delete doc._id;
      delete doc.id;
      assert.deepEqual(doc, { nested: { test: true } });
    });

    it('handles pushing with numeric keys (gh-3623)', async function() {
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

      const MyModel = db.model('Test', schema);

      const doc = { array: [{ 2: {} }] };
      await MyModel.collection.insertOne(doc);

      const foundDoc = await MyModel.findOne({ _id: doc._id });

      foundDoc.array.push({ 2: {} });
      await foundDoc.save();
    });

    it('handles 0 for numeric subdoc ids (gh-3776)', async function() {
      const personSchema = new Schema({
        _id: Number,
        name: String,
        age: Number,
        friends: [{ type: Number, ref: 'Person' }]
      });

      const Person = db.model('Person', personSchema);


      const people = await Person.create([
        { _id: 0, name: 'Alice' },
        { _id: 1, name: 'Bob' }
      ]);

      const alice = people[0];
      alice.friends.push(people[1]);

      // Should not throw
      await alice.save();
    });

    it('handles conflicting names (gh-3867)', function() {
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

      const M = db.model('Test', testSchema);

      const doc = M({
        things: [{}]
      });

      const fields = Object.keys(doc.validateSync().errors).sort();
      assert.deepEqual(fields, ['name', 'things.0.name']);
    });

    it('populate with lean (gh-3873)', async function() {
      const companySchema = new mongoose.Schema({
        name: String,
        description: String,
        userCnt: { type: Number, default: 0, select: false }
      });

      const userSchema = new mongoose.Schema({
        name: String,
        company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' }
      });

      const Company = db.model('Company', companySchema);
      const User = db.model('User', userSchema);

      const company = new Company({ name: 'IniTech', userCnt: 1 });
      const user = new User({ name: 'Peter', company: company._id });

      await company.save();

      await user.save();

      const pop = { path: 'company', select: 'name', options: { lean: true } };
      const docs = await User.find({}).populate(pop).exec();

      assert.equal(docs.length, 1);
      assert.strictEqual(docs[0].company.userCnt, undefined);
    });

    it('init single nested subdoc with select (gh-3880)', async function() {
      const childSchema = new mongoose.Schema({
        name: { type: String },
        friends: [{ type: String }]
      });

      const parentSchema = new mongoose.Schema({
        name: { type: String },
        child: childSchema
      });

      const Parent = db.model('Parent', parentSchema);
      const p = new Parent({
        name: 'Mufasa',
        child: {
          name: 'Simba',
          friends: ['Pumbaa', 'Timon', 'Nala']
        }
      });

      await p.save();

      const fields = 'name child.name';
      const doc = await Parent.findById(p._id).select(fields).exec();

      assert.strictEqual(doc.child.friends, void 0);
    });

    it('single nested subdoc isModified() (gh-3910)', async function() {
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

      const Parent = db.model('Parent', ParentSchema);

      const p = new Parent({
        name: 'Darth Vader',
        child: {
          name: 'Luke Skywalker'
        }
      });

      await p.save();

      assert.strictEqual(called, 1);
    });

    it('pre and post as schema keys (gh-3902)', async function() {
      const schema = new mongoose.Schema({
        pre: String,
        post: String
      }, { versionKey: false });

      const MyModel = db.model('Test', schema);

      const doc = await MyModel.create({ pre: 'test', post: 'test' });

      assert.deepEqual(
        utils.omit(doc.toObject(), '_id'),
        { pre: 'test', post: 'test' }
      );
    });

    it('manual population and isNew (gh-3982)', async function() {
      const NestedModelSchema = new mongoose.Schema({
        field: String
      });

      const NestedModel = db.model('Test', NestedModelSchema);

      const ModelSchema = new mongoose.Schema({
        field: String,
        array: [{
          type: mongoose.Schema.ObjectId,
          ref: 'Test',
          required: true
        }]
      });

      const Model = db.model('Test1', ModelSchema);

      const nestedModel = new NestedModel({
        field: 'nestedModel'
      });

      await nestedModel.save();

      const doc = await Model.create({ array: [nestedModel._id] });

      const foundDoc = await Model.findById(doc._id).populate('array').exec();

      foundDoc.array.push(nestedModel);
      assert.strictEqual(foundDoc.isNew, false);
      assert.strictEqual(foundDoc.array[0].isNew, false);
      assert.strictEqual(foundDoc.array[1].isNew, false);
      assert.strictEqual(nestedModel.isNew, false);
    });

    it('manual population with refPath (gh-7070)', async function() {
      const ChildModelSchema = new mongoose.Schema({
        name: String
      });

      const ChildModel = db.model('Child', ChildModelSchema);

      const ParentModelSchema = new mongoose.Schema({
        model: String,
        childId: { type: mongoose.ObjectId, refPath: 'model' },
        otherId: mongoose.ObjectId
      });

      const ParentModel = db.model('Parent', ParentModelSchema);


      const child = await ChildModel.create({ name: 'test' });

      let parent = await ParentModel.create({
        model: 'Child',
        childId: child._id
      });

      parent = await ParentModel.findOne();

      parent.childId = child;
      parent.otherId = child;

      assert.equal(parent.childId.name, 'test');
      assert.ok(parent.otherId instanceof mongoose.Types.ObjectId);
    });

    it('doesnt skipId for single nested subdocs (gh-4008)', async function() {
      const childSchema = new Schema({
        name: String
      });

      const parentSchema = new Schema({
        child: childSchema
      });

      const Parent = db.model('Parent', parentSchema);

      const doc = await Parent.create({ child: { name: 'My child' } });

      const foundDoc = await Parent.collection.findOne({ _id: doc._id });
      assert.ok(foundDoc.child._id);
    });

    it('single embedded docs with $near (gh-4014)', async function() {
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

      const MyModel = db.model('Test', schema);
      await MyModel.init();

      await MyModel.
        where('geo').near({ center: [50, 50], spherical: true }).
        exec();
    });

    it('skip validation if required returns false (gh-4094)', function() {
      const schema = new Schema({
        div: {
          type: Number,
          required: function() { return false; },
          validate: function(v) { return !!v; }
        }
      });
      const Model = db.model('Test', schema);
      const m = new Model();
      assert.ifError(m.validateSync());
    });

    it('ability to overwrite array default (gh-4109)', async function() {
      const schema = new Schema({
        names: {
          type: [String],
          default: void 0
        }
      });

      const Model = db.model('Test', schema);
      const m = new Model();
      assert.ok(!m.names);
      await m.save();

      const doc = await Model.collection.findOne({ _id: m._id });

      assert.ok(!('names' in doc));
    });

    it('validation works when setting array index (gh-3816)', async function() {
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
      const doc = await Test.create({ items: a });

      const foundDoc = await Test.findById(doc._id).exec();

      assert.ok(foundDoc);
      foundDoc.items[0] = {
        month: 5,
        date: new Date()
      };
      foundDoc.markModified('items');

      // Should not throw
      await foundDoc.save();
    });

    it('validateSync works when setting array index nested (gh-5389)', async function() {
      const childSchema = new mongoose.Schema({
        _id: false,
        name: String,
        age: Number
      });

      const schema = new mongoose.Schema({
        name: String,
        children: [childSchema]
      });

      const Model = db.model('Test', schema);

      const doc = await Model.create({
        name: 'test',
        children: [
          { name: 'test-child', age: 24 }
        ]
      });

      const foundDoc = await Model.findById(doc._id);

      foundDoc.children[0] = { name: 'updated-child', age: 53 };
      const errors = foundDoc.validateSync();
      assert.ok(!errors);
    });

    it('single embedded with defaults have $parent (gh-4115)', function() {
      const ChildSchema = new Schema({
        name: {
          type: String,
          default: 'child'
        }
      });

      const ParentSchema = new Schema({
        child: {
          type: ChildSchema,
          default: {}
        }
      });

      const Parent = db.model('Parent', ParentSchema);

      const p = new Parent();
      assert.equal(p.child.$parent(), p);
    });

    it('removing parent doc calls deleteOne hooks on subdocs (gh-2348) (gh-4566)', async function() {
      const ChildSchema = new Schema({
        name: String
      });

      const called = {};
      ChildSchema.pre('deleteOne', { document: true, query: false }, function(next) {
        called[this.name] = true;
        next();
      });

      const ParentSchema = new Schema({
        children: [ChildSchema],
        child: ChildSchema
      });

      const Parent = db.model('Parent', ParentSchema);

      const doc = await Parent.create({
        children: [{ name: 'Jacen' }, { name: 'Jaina' }],
        child: { name: 'Anakin' }
      });

      await doc.deleteOne();

      assert.deepEqual(called, {
        Jacen: true,
        Jaina: true,
        Anakin: true
      });

      const arr = doc.children.toObject().map(function(v) { return v.name; });
      assert.deepEqual(arr, ['Jacen', 'Jaina']);
      assert.equal(doc.child.name, 'Anakin');
    });

    it('strings of length 12 are valid oids (gh-3365)', async function() {
      const schema = new Schema({ myId: mongoose.Schema.Types.ObjectId });
      const M = db.model('Test', schema);
      const doc = new M({ myId: 'blablablabla' });
      await doc.validate();
    });

    it('set() empty obj unmodifies subpaths (gh-4182)', async function() {
      const omeletteSchema = new Schema({
        topping: {
          meat: {
            type: String,
            enum: ['bacon', 'sausage']
          },
          cheese: Boolean
        }
      });
      const Omelette = db.model('Test', omeletteSchema);
      const doc = new Omelette({
        topping: {
          meat: 'bacon',
          cheese: true
        }
      });
      doc.topping = {};
      await doc.save();
      assert.strictEqual(doc.topping.meat, void 0);
    });

    it('clears subpaths when removing single nested (gh-4216)', async function() {
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

      const Event = db.model('Test', EventSchema);
      const ev = new Event({
        name: 'test',
        recurrence: { frequency: 2, interval: 'days' }
      });
      ev.recurrence = null;
      await ev.save();
    });

    it('setting path to empty object works (gh-4218)', async function() {
      const schema = new Schema({
        object: {
          nested: {
            field1: { type: Number, default: 1 }
          }
        }
      });

      const MyModel = db.model('Test', schema);


      let doc = await MyModel.create({});
      doc.object.nested = {};
      await doc.save();
      doc = await MyModel.collection.findOne({ _id: doc._id });
      assert.deepEqual(doc.object.nested, {});
    });

    it('setting path to object with strict and no paths in the schema (gh-6436) (gh-4218)', async function() {
      const schema = new Schema({
        object: {
          nested: {
            field1: { type: Number, default: 1 }
          }
        }
      });

      const MyModel = db.model('Test', schema);


      let doc = await MyModel.create({});
      doc.object.nested = { field2: 'foo' }; // `field2` not in the schema
      await doc.save();
      doc = await MyModel.collection.findOne({ _id: doc._id });
      assert.deepEqual(doc.object.nested, {});
    });

    it('minimize + empty object (gh-4337)', function() {
      const SomeModelSchema = new mongoose.Schema(
        {},
        { minimize: false }
      );

      const SomeModel = db.model('Test', SomeModelSchema);

      assert.doesNotThrow(function() {
        new SomeModel({});
      });
    });

    it('directModifiedPaths() (gh-7373)', async function() {
      const schema = new Schema({ foo: String, nested: { bar: String } });
      const Model = db.model('Test', schema);


      await Model.create({ foo: 'original', nested: { bar: 'original' } });

      const doc = await Model.findOne();
      doc.nested.bar = 'modified';

      assert.deepEqual(doc.directModifiedPaths(), ['nested.bar']);
      assert.deepEqual(doc.modifiedPaths().sort(), ['nested', 'nested.bar']);
    });

    describe('modifiedPaths', function() {
      it('doesnt markModified child paths if parent is modified (gh-4224)', async function() {
        const childSchema = new Schema({
          name: String
        });
        const parentSchema = new Schema({
          child: childSchema
        });

        const Parent = db.model('Test', parentSchema);
        const doc = await Parent.create({ child: { name: 'Jacen' } });

        doc.child = { name: 'Jaina' };
        doc.child.name = 'Anakin';
        assert.deepEqual(doc.modifiedPaths(), ['child']);
        assert.ok(doc.isModified('child.name'));
      });

      it('includeChildren option (gh-6134)', function() {
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
        assert.deepEqual(luke.modifiedPaths(), ['name', 'colors']);

        const obiwan = new Person({ name: 'Obi-Wan' });
        obiwan.colors.primary = 'blue';
        assert.deepEqual(obiwan.modifiedPaths(), ['name', 'colors', 'colors.primary']);

        const anakin = new Person({ name: 'Anakin' });
        anakin.colors = { primary: 'blue' };
        assert.deepEqual(anakin.modifiedPaths({ includeChildren: true }), ['name', 'colors', 'colors.primary']);
      });

      it('includeChildren option with arrays (gh-5904)', function() {
        const teamSchema = new mongoose.Schema({
          name: String,
          colors: {
            primary: {
              type: String,
              enum: ['blue', 'green', 'red', 'purple', 'yellow', 'white', 'black']
            }
          },
          members: [{
            name: String
          }]
        });

        const Team = db.model('Team', teamSchema);

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
      });

      it('1 level down nested paths get marked modified on initial set (gh-7313) (gh-6944)', function() {
        const testSchema = new Schema({
          name: {
            first: String,
            last: String
          },
          relatives: {
            aunt: {
              name: String
            },
            uncle: {
              name: String
            }
          }
        });
        const M = db.model('Test', testSchema);

        const doc = new M({
          name: { first: 'A', last: 'B' },
          relatives: {
            aunt: { name: 'foo' },
            uncle: { name: 'bar' }
          }
        });

        assert.ok(doc.modifiedPaths().indexOf('name') !== -1);
        assert.ok(doc.modifiedPaths().indexOf('relatives') !== -1);
        assert.ok(doc.modifiedPaths({ includeChildren: true }).indexOf('name.first') !== -1);
        assert.ok(doc.modifiedPaths({ includeChildren: true }).indexOf('name.last') !== -1);
        assert.ok(doc.modifiedPaths({ includeChildren: true }).indexOf('relatives.aunt') !== -1);
        assert.ok(doc.modifiedPaths({ includeChildren: true }).indexOf('relatives.uncle') !== -1);

        return Promise.resolve();
      });
    });

    it('single nested isNew (gh-4369)', async function() {
      const childSchema = new Schema({
        name: String
      });
      const parentSchema = new Schema({
        child: childSchema
      });

      const Parent = db.model('Test', parentSchema);
      let called = 0;

      const doc = new Parent({ child: { name: 'Jacen' } });
      doc.child.on('isNew', function(val) {
        assert.ok(!val);
        assert.ok(!doc.child.isNew);
        ++called;
      });

      const savedDoc = await doc.save();
      assert.ok(!savedDoc.child.isNew);
      assert.equal(called, 1);
    });

    it('deep default array values (gh-4540)', function() {
      const schema = new Schema({
        arr: [{
          test: {
            type: Array,
            default: ['test']
          }
        }]
      });
      assert.doesNotThrow(function() {
        db.model('Test', schema);
      });
    });

    it('default values with subdoc array (gh-4390)', async function() {
      const childSchema = new Schema({
        name: String
      });
      const parentSchema = new Schema({
        child: [childSchema]
      });

      parentSchema.path('child').default([{ name: 'test' }]);

      const Parent = db.model('Parent', parentSchema);

      const doc = await Parent.create({});
      const arr = doc.toObject().child.map(function(doc) {
        assert.ok(doc._id);
        delete doc._id;
        return doc;
      });
      assert.deepEqual(arr, [{ name: 'test' }]);
    });

    it('handles invalid dates (gh-4404)', async function() {
      const testSchema = new Schema({
        date: Date
      });

      const Test = db.model('Test', testSchema);

      try {
        await Test.create({ date: new Date('invalid date') });

        assert.ok(false);
      } catch (error) {
        assert.ok(error);
        assert.equal(error.errors['date'].name, 'CastError');
      }
    });

    it('setting array subpath (gh-4472)', function() {
      const ChildSchema = new mongoose.Schema({
        name: String,
        age: Number
      }, { _id: false });

      const ParentSchema = new mongoose.Schema({
        data: {
          children: [ChildSchema]
        }
      });

      const Parent = db.model('Parent', ParentSchema);

      const p = new Parent();
      p.set('data.children.0', {
        name: 'Bob',
        age: 900
      });

      assert.deepEqual(p.toObject().data.children, [{ name: 'Bob', age: 900 }]);
    });

    it('ignore paths (gh-4480)', async function() {
      const TestSchema = new Schema({
        name: { type: String, required: true }
      });

      const Test = db.model('Parent', TestSchema);


      await Test.create({ name: 'val' });

      let doc = await Test.findOne();

      doc.name = null;
      doc.$ignore('name');

      await doc.save();

      doc = await Test.findById(doc._id);

      assert.equal(doc.name, 'val');
    });

    it('ignore subdocs paths (gh-4480) (gh-6152)', async function() {
      const childSchema = new Schema({
        name: { type: String, required: true }
      });
      const testSchema = new Schema({
        child: childSchema,
        children: [childSchema]
      });

      const Test = db.model('Test', testSchema);


      await Test.create({
        child: { name: 'testSingle' },
        children: [{ name: 'testArr' }]
      });

      let doc = await Test.findOne();
      doc.child.name = null;
      doc.child.$ignore('name');

      await doc.save();

      doc = await Test.findById(doc._id);

      assert.equal(doc.child.name, 'testSingle');

      doc.children[0].name = null;
      doc.children[0].$ignore('name');

      await doc.save();

      doc = await Test.findById(doc._id);

      assert.equal(doc.children[0].name, 'testArr');
    });

    it('composite _ids (gh-4542)', function(done) {
      const schema = new Schema({
        _id: {
          key1: String,
          key2: String
        },
        content: String
      });

      const Model = db.model('Test', schema);

      const object = new Model();
      object._id = { key1: 'foo', key2: 'bar' };
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

    it('validateSync with undefined and conditional required (gh-4607)', function() {
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

      const Model = db.model('Test', schema);

      assert.doesNotThrow(function() {
        new Model({
          type: 2,
          conditional: void 0
        }).validateSync();
      });
    });

    it('conditional required on single nested (gh-4663)', function() {
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

      const M = db.model('Test', schema);

      const err = new M({ child: { name: 'test' } }).validateSync();
      assert.ifError(err);
    });

    it('setting full path under single nested schema works (gh-4578) (gh-4528)', async function() {
      const ChildSchema = new mongoose.Schema({
        age: Number
      });

      const ParentSchema = new mongoose.Schema({
        age: Number,
        family: {
          child: ChildSchema
        }
      });

      const M = db.model('Test', ParentSchema);

      const doc = await M.create({ age: 45 });
      assert.ok(!doc.family.child);
      doc.set('family.child.age', 15);
      assert.ok(doc.family.child.schema);
      assert.ok(doc.isModified('family.child'));
      assert.ok(doc.isModified('family.child.age'));
      assert.equal(doc.family.child.toObject().age, 15);
    });

    it('setting a nested path retains nested modified paths (gh-5206)', async function() {
      const testSchema = new mongoose.Schema({
        name: String,
        surnames: {
          docarray: [{ name: String }]
        }
      });

      const Cat = db.model('Cat', testSchema);

      const kitty = new Cat({
        name: 'Test',
        surnames: {
          docarray: [{ name: 'test1' }, { name: 'test2' }]
        }
      });

      await kitty.save();

      kitty.surnames = {
        docarray: [{ name: 'test1' }, { name: 'test2' }, { name: 'test3' }]
      };

      assert.deepEqual(
        kitty.modifiedPaths(),
        ['surnames', 'surnames.docarray']
      );
    });

    it('toObject() does not depopulate top level (gh-3057)', function() {
      const Cat = db.model('Cat', { name: String });
      const Human = db.model('Person', {
        name: String,
        petCat: { type: mongoose.Schema.Types.ObjectId, ref: 'Cat' }
      });

      const kitty = new Cat({ name: 'Zildjian' });
      const person = new Human({ name: 'Val', petCat: kitty });

      assert.equal(kitty.toObject({ depopulate: true }).name, 'Zildjian');
      assert.ok(!person.toObject({ depopulate: true }).petCat.name);
    });

    it('toObject() respects schema-level depopulate (gh-6313)', function() {
      const personSchema = Schema({
        name: String,
        car: {
          type: Schema.Types.ObjectId,
          ref: 'Car'
        }
      });

      personSchema.set('toObject', {
        depopulate: true
      });

      const carSchema = Schema({
        name: String
      });

      const Car = db.model('Car', carSchema);
      const Person = db.model('Person', personSchema);

      const car = new Car({
        name: 'Ford'
      });

      const person = new Person({
        name: 'John',
        car: car
      });

      assert.equal(person.toObject().car.toHexString(), car._id.toHexString());
    });

    it('single nested doc conditional required (gh-4654)', async function() {
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

      const User = db.model('User', UserSchema);
      try {
        await User.create({ email: 'test' });

        assert.ok(false);
      } catch (error) {
        assert.equal(error.errors['profile'].message, 'profile required');
      }
    });

    it('handles setting single nested schema to equal value (gh-4676)', async function() {
      const companySchema = new mongoose.Schema({
        _id: false,
        name: String,
        description: String
      });

      const userSchema = new mongoose.Schema({
        name: String,
        company: companySchema
      });

      const User = db.model('User', userSchema);

      const user = new User({ company: { name: 'Test' } });
      await user.save();
      user.company.description = 'test';
      assert.ok(user.isModified('company'));
      user.company = user.company;
      assert.ok(user.isModified('company'));
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

      const Shipment = db.model('Test', ShipmentSchema);
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
          lowercase: true,
          required: true
        },
        name: String
      });

      const User = db.model('User', UserSchema);

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

    it('embedded docs dont mark parent as invalid (gh-4681)', async() => {
      const NestedSchema = new mongoose.Schema({
        nestedName: { type: String, required: true },
        createdAt: { type: Date, required: true }
      });
      const RootSchema = new mongoose.Schema({
        rootName: String,
        nested: { type: [NestedSchema] }
      });

      const Root = db.model('Test', RootSchema);
      const root = new Root({ rootName: 'root', nested: [{ }] });
      try {
        await root.save();

        assert.ok(false);
      } catch (error) {
        assert.ok(error);
        assert.deepEqual(Object.keys(error.errors).sort(),
          ['nested.0.createdAt', 'nested.0.nestedName']);
      }
    });

    it('should depopulate the shard key when saving (gh-4658)', function(done) {
      const ChildSchema = new mongoose.Schema({
        name: String
      });

      const ChildModel = db.model('Child', ChildSchema);

      const ParentSchema = new mongoose.Schema({
        name: String,
        child: { type: Schema.Types.ObjectId, ref: 'Child' }
      }, { shardKey: { child: 1, _id: 1 } });

      const ParentModel = db.model('Parent', ParentSchema);

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

    it('handles setting virtual subpaths (gh-4716)', function() {
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

      const Parent = db.model('Parent', parentSchema);
      const p = new Parent({ name: 'Anakin' });
      p.set('children.0.name', 'Leah');
      p.set('favorites.color', 'Red');
      assert.equal(p.children[0].favorites.color, 'Red');
    });

    it('handles selected nested elements with defaults (gh-4739) (gh-11376)', async function() {
      const userSchema = new Schema({
        preferences: {
          sleep: { type: Boolean, default: false },
          test: { type: Boolean, default: true }
        },
        arr: [{ test: Number, test2: Number }],
        name: String
      });

      const User = db.model('User', userSchema);

      let user = { name: 'test' };
      await User.collection.insertOne(user);
      user = await User.findById(user, { 'preferences.sleep': 1, name: 1 });
      assert.strictEqual(user.preferences.sleep, false);
      assert.ok(!user.preferences.test);

      user = await User.findById(user, { 'arr.test': 1 });
      assert.strictEqual(user.name, undefined);
      assert.strictEqual(user.toObject().preferences, undefined);
      assert.deepEqual(user.toObject().arr, []);
    });

    it('handles mark valid in subdocs correctly (gh-4778)', function() {
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
      const Model2 = db.model('Test', Model2Schema);

      const doc = new Model2({
        sub: {}
      });

      doc.sub.field.nestedField = { };
      doc.sub.field.nestedField = '574b69d0d9daf106aaa62974';
      assert.ok(!doc.validateSync());
    });

    it('timestamps set to false works (gh-7074)', async function() {
      const schema = new Schema({ name: String }, { timestamps: false });
      const Test = db.model('Test', schema);

      const doc = await Test.create({ name: 'test' });
      assert.strictEqual(doc.updatedAt, undefined);
      assert.strictEqual(doc.createdAt, undefined);
    });

    it('timestamps with nested paths (gh-5051)', async function() {
      const schema = new Schema({ props: {} }, {
        timestamps: {
          createdAt: 'props.createdAt',
          updatedAt: 'props.updatedAt'
        }
      });

      const M = db.model('Test', schema);
      const now = Date.now();
      const doc = await M.create({});
      assert.ok(doc.props.createdAt);
      assert.ok(doc.props.createdAt instanceof Date);
      assert.ok(doc.props.createdAt.valueOf() >= now);
      assert.ok(doc.props.updatedAt);
      assert.ok(doc.props.updatedAt instanceof Date);
      assert.ok(doc.props.updatedAt.valueOf() >= now);
    });

    it('Declaring defaults in your schema with timestamps defined (gh-6024)', function() {
      const schemaDefinition = {
        name: String,
        misc: {
          hometown: String,
          isAlive: { type: Boolean, default: true }
        }
      };

      const schemaWithTimestamps = new Schema(schemaDefinition, { timestamps: { createdAt: 'misc.createdAt' } });
      const PersonWithTimestamps = db.model('Person', schemaWithTimestamps);
      const dude = new PersonWithTimestamps({ name: 'Keanu', misc: { hometown: 'Beirut' } });
      assert.equal(dude.misc.isAlive, true);
    });

    it('supports $where in pre save hook (gh-4004)', function(done) {
      const schema = new Schema({
        name: String
      }, { timestamps: true, versionKey: null });

      schema.pre('save', function(next) {
        this.$where = { updatedAt: this.updatedAt };
        next();
      });

      schema.post('save', function(error, res, next) {
        assert.ok(error instanceof MongooseError.DocumentNotFoundError);
        assert.ok(error.message.indexOf('Test') !== -1, error.message);

        error = new Error('Somebody else updated the document!');
        next(error);
      });

      const MyModel = db.model('Test', schema);

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

      const Test = db.model('Test', TestSchema);

      Test.create({ buf: Buffer.from('abcd') }).
        then(function(doc) {
          return Test.findById(doc._id);
        }).
        then(function(doc) {
          assert.doesNotThrow(function() {
            require('util').inspect(doc);
          });
          done();
        }).
        catch(done);
    });

    it('buffer subtype prop (gh-5530)', function() {
      const TestSchema = new mongoose.Schema({
        uuid: {
          type: Buffer,
          subtype: 4
        }
      });

      const Test = db.model('Test', TestSchema);

      const doc = new Test({ uuid: 'test1' });
      assert.equal(doc.uuid._subtype, 4);
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

      const Parent = db.model('Parent', parentSchema);

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

      const Parent = db.model('Parent', parentSchema);

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

    it('does not run schema type validator on single nested if not direct modified (gh-5885)', async function() {
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


      const Parent = db.model('Parent', parentSchema);

      const doc = await Parent.create({
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
      await doc.validate();

      assert.equal(childValidateCalls, 0);
      assert.equal(validateCalls, 0);
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
      const Parent = db.model('Test', parentSchema);

      const parentDoc = new Parent({});

      parentDoc.child.test = 'foo';

      const err = parentDoc.validateSync();
      assert.ok(err);
      assert.ok(err.errors['child']);
      return Promise.resolve();
    });

    it('does not overwrite when setting nested (gh-4793)', function() {
      const grandchildSchema = new mongoose.Schema();
      grandchildSchema.method({
        foo: function() { return 'bar'; }
      });
      const Grandchild = db.model('Test', grandchildSchema);

      const childSchema = new mongoose.Schema({
        grandchild: grandchildSchema
      });
      const Child = db.model('Child', childSchema);

      const parentSchema = new mongoose.Schema({
        children: [childSchema]
      });
      const Parent = db.model('Parent', parentSchema);

      const grandchild = new Grandchild();
      const child = new Child({ grandchild: grandchild });

      assert.equal(child.grandchild.foo(), 'bar');

      const p = new Parent({ children: [child] });

      assert.equal(child.grandchild.foo(), 'bar');
      assert.equal(p.children[0].grandchild.foo(), 'bar');
    });

    it('hooks/middleware for custom methods (gh-6385) (gh-7456)', async function() {
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

      const MyModel = db.model('Test', mySchema);


      const doc = new MyModel({ name: 'test' });

      assert.equal(doc.bar(), 'test');

      assert.equal(preFoo, 0);
      assert.equal(postFoo, 0);

      const fooResult = await doc.foo();
      assert.equal(fooResult, 'test');
      assert.equal(preFoo, 1);
      assert.equal(postFoo, 1);

      assert.equal(preBaz, 0);
      assert.equal(postBaz, 0);

      assert.equal(await doc.baz('foobar'), 'foobar');
      assert.equal(preBaz, 1);
      assert.equal(preBaz, 1);
    });

    it('custom methods with promises (gh-6385)', async function() {
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

      const MyModel = db.model('Test', mySchema);


      const doc = new MyModel({ name: 'test' });

      assert.equal(preFoo, 0);
      assert.equal(preBar, 0);

      let foo = doc.foo();
      let bar = doc.bar();
      assert.ok(foo instanceof Promise);
      assert.ok(bar instanceof Promise);

      foo = await foo;
      bar = await bar;

      assert.equal(preFoo, 1);
      assert.equal(preBar, 1);
      assert.equal(foo, 'test foo');
      assert.equal(bar, 'test bar');
    });

    it('toString() as custom method (gh-6538)', function() {
      const commentSchema = new Schema({ title: String });
      commentSchema.methods.toString = function() {
        return `${this.constructor.modelName}(${this.title})`;
      };
      const Comment = db.model('Comment', commentSchema);
      const c = new Comment({ title: 'test' });
      assert.strictEqual('Comment(test)', `${c}`);
    });

    it('setting to discriminator (gh-4935)', function() {
      const Buyer = db.model('Test1', new Schema({
        name: String,
        vehicle: { type: Schema.Types.ObjectId, ref: 'Test' }
      }));
      const Vehicle = db.model('Test', new Schema({ name: String }));
      const Car = Vehicle.discriminator('gh4935_1', new Schema({
        model: String
      }));

      const eleanor = new Car({ name: 'Eleanor', model: 'Shelby Mustang GT' });
      const nick = new Buyer({ name: 'Nicolas', vehicle: eleanor });

      assert.ok(!!nick.vehicle);
      assert.ok(nick.vehicle === eleanor);
      assert.ok(nick.vehicle instanceof Car);
      assert.equal(nick.vehicle.name, 'Eleanor');
    });

    it('handles errors in sync validators (gh-2185)', async function() {
      const schema = new Schema({
        name: {
          type: String,
          validate: function() {
            throw new Error('woops!');
          }
        }
      });

      const M = db.model('Test', schema);

      const error = (new M({ name: 'test' })).validateSync();
      assert.ok(error);
      assert.equal(error.errors['name'].reason.message, 'woops!');

      try {
        await new M({ name: 'test' }).validate();
        assert.ok(false);
      } catch (error) {
        assert.ok(error);
        assert.equal(error.errors['name'].reason.message, 'woops!');
      }
    });

    it('allows hook as a schema key (gh-5047)', async function() {
      const schema = new mongoose.Schema({
        name: String,
        hook: { type: String }
      });

      const Model = db.model('Test', schema);

      await Model.create({ hook: 'test ' });
    });

    it('save errors with callback and promise work (gh-5216)', function(done) {
      const schema = new mongoose.Schema({});

      const Model = db.model('Test', schema);

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

    it('post hooks on child subdocs run after save (gh-5085)', async function() {
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

      const Model = db.model('Parent', ParentModelSchema);

      await Model.create({ children: [{ text: 'test' }] });
      const doc = await Model.findOne({});
      assert.equal(doc.children.length, 1);
      assert.equal(doc.children[0].text, 'test');
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

      const Test = db.model('Test', schema);

      const test = new Test({ sub: { val: 'test' } });

      return test.save().
        then(() => assert.ok(false), err => assert.equal(err.message, 'Oops')).
        then(() => Test.findOne()).
        then(doc => assert.equal(doc.sub.val, 'test'));
    });

    it('nested docs toObject() clones (gh-5008)', function() {
      const schema = new mongoose.Schema({
        sub: {
          height: Number
        }
      });

      const Model = db.model('Test', schema);

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
    });

    it('toObject() with null (gh-5143)', function() {
      const schema = new mongoose.Schema({
        customer: {
          name: { type: String, required: false }
        }
      });

      const Model = db.model('Test', schema);

      const model = new Model();
      model.customer = null;
      assert.strictEqual(model.toObject().customer, null);
      assert.strictEqual(model.toObject({ getters: true }).customer, null);
    });

    it('handles array subdocs with single nested subdoc default (gh-5162)', function() {
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

      const Restaurant = db.model('Test', RestaurantSchema);

      // Should not throw
      const r = new Restaurant();
      assert.deepEqual(r.toObject().menu, []);
    });

    it('iterating through nested doc keys (gh-5078)', function() {
      const schema = new Schema({
        nested: {
          test1: String,
          test2: String
        }
      });

      schema.virtual('tests').get(function() {
        return Object.values(this.nested);
      });

      const M = db.model('Test', schema);

      const doc = new M({ nested: { test1: 'a', test2: 'b' } });

      assert.deepEqual(doc.toObject({ virtuals: true }).tests, ['a', 'b']);

      assert.doesNotThrow(function() {
        require('util').inspect(doc);
      });
      JSON.stringify(doc);
    });

    it('deeply nested virtual paths (gh-5250)', function() {
      const TestSchema = new Schema({});
      TestSchema.
        virtual('a.b.c').
        get(function() {
          return this.v;
        }).
        set(function(value) {
          this.v = value;
        });

      const TestModel = db.model('Test', TestSchema);
      const t = new TestModel({ 'a.b.c': 5 });
      assert.equal(t.a.b.c, 5);
    });

    it('nested virtual when populating with parent projected out (gh-7491)', async function() {
      const childSchema = Schema({
        _id: Number,
        nested: { childPath: String },
        otherPath: String
      }, { toObject: { virtuals: true } });

      childSchema.virtual('nested.childVirtual').get(() => true);

      const parentSchema = Schema({
        child: { type: Number, ref: 'Child' }
      }, { toObject: { virtuals: true } });

      parentSchema.virtual('_nested').get(function() {
        return this.child.nested;
      });

      const Child = db.model('Child', childSchema);
      const Parent = db.model('Parent', parentSchema);


      await Child.create({
        _id: 1,
        nested: { childPath: 'foo' },
        otherPath: 'bar'
      });
      await Parent.create({ child: 1 });

      const doc = await Parent.findOne().populate('child', 'otherPath').
        then(doc => doc.toObject());

      assert.ok(!doc.child.nested.childPath);
    });

    it('JSON.stringify nested errors (gh-5208)', async function() {
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

      const EmergencyContact = db.model('Test', EmergencyContactSchema);

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
      const error = await contact.validate().then(() => null, err => err);
      assert.ok(error.errors['contact.additionalContacts.0.contactValue']);

      // This `JSON.stringify()` should not throw
      assert.ok(JSON.stringify(error).indexOf('contactValue') !== -1);

    });

    it('handles errors in subdoc pre validate (gh-5215)', async function() {
      const childSchema = new mongoose.Schema({});

      childSchema.pre('validate', function(next) {
        next(new Error('child pre validate'));
      });

      const parentSchema = new mongoose.Schema({
        child: childSchema
      });

      const Parent = db.model('Parent', parentSchema);

      const error = await Parent.create({ child: {} }).catch(error => error);
      assert.ok(error);
      assert.ok(error.errors['child']);
      assert.equal(error.errors['child'].message, 'child pre validate');
    });

    it('custom error types (gh-4009)', async function() {
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

      const Test = db.model('Test', testSchema);

      try {
        await Test.create({});
        assert.ok(false);
      } catch (error) {
        assert.ok(error);
        assert.ok(error.errors['num']);
        assert.ok(error.errors['num'] instanceof CustomError);
      }

      try {
        await Test.create({ num: 1 });
        assert.ok(false);
      } catch (error) {
        assert.ok(error);
        assert.ok(error.errors['num']);
        assert.ok(error.errors['num'].constructor.name, 'ValidatorError');
        assert.ok(!(error.errors['num'] instanceof CustomError));
      }
    });

    it('saving a doc with nested string array (gh-5282)', async function() {
      const testSchema = new mongoose.Schema({
        strs: [[String]]
      });

      const Test = db.model('Test', testSchema);

      const t = new Test({
        strs: [['a', 'b']]
      });

      await t.save();
      assert.deepEqual(t.toObject().strs, [['a', 'b']]);
    });

    it('push() onto a nested doc array (gh-6398)', async function() {
      const schema = new mongoose.Schema({
        name: String,
        array: [[{ key: String, value: Number }]]
      });

      const Model = db.model('Test', schema);


      await Model.create({
        name: 'small',
        array: [[{ key: 'answer', value: 42 }]]
      });

      let doc = await Model.findOne();

      assert.ok(doc);
      doc.array[0].push({ key: 'lucky', value: 7 });

      await doc.save();

      doc = await Model.findOne();
      assert.equal(doc.array.length, 1);
      assert.equal(doc.array[0].length, 2);
      assert.equal(doc.array[0][1].key, 'lucky');
    });

    it('push() onto a triple nested doc array (gh-6602) (gh-6398)', async function() {
      const schema = new mongoose.Schema({
        array: [[[{ key: String, value: Number }]]]
      });

      const Model = db.model('Test', schema);


      await Model.create({
        array: [[[{ key: 'answer', value: 42 }]]]
      });

      let doc = await Model.findOne();

      assert.ok(doc);
      doc.array[0][0].push({ key: 'lucky', value: 7 });

      await doc.save();

      doc = await Model.findOne();
      assert.equal(doc.array.length, 1);
      assert.equal(doc.array[0].length, 1);
      assert.equal(doc.array[0][0].length, 2);
      assert.equal(doc.array[0][0][1].key, 'lucky');
    });

    it('null _id (gh-5236)', async function() {
      const childSchema = new mongoose.Schema({});

      const M = db.model('Test', childSchema);

      const m = new M({ _id: null });
      const doc = await m.save();
      assert.equal(doc._id, null);
    });

    it('setting populated path with typeKey (gh-5313)', function() {
      const personSchema = Schema({
        name: { $type: String },
        favorite: { $type: Schema.Types.ObjectId, ref: 'Book' },
        books: [{ $type: Schema.Types.ObjectId, ref: 'Book' }]
      }, { typeKey: '$type' });

      const bookSchema = Schema({
        title: String
      });

      const Book = db.model('Book', bookSchema);
      const Person = db.model('Person', personSchema);

      const book1 = new Book({ title: 'The Jungle Book' });
      const book2 = new Book({ title: '1984' });

      const person = new Person({
        name: 'Bob',
        favorite: book1,
        books: [book1, book2]
      });

      assert.equal(person.books[0].title, 'The Jungle Book');
      assert.equal(person.books[1].title, '1984');
    });

    it('save twice with write concern (gh-5294)', async function() {
      const schema = new mongoose.Schema({
        name: String
      }, {
        w: 'majority',
        wtimeout: 1e4
      });

      const M = db.model('Test', schema);

      const doc = await M.create({ name: 'Test' });
      doc.name = 'test2';
      await doc.save();
    });

    it('undefined field with conditional required (gh-5296)', async function() {
      const schema = Schema({
        name: {
          type: String,
          maxlength: 63,
          required: function() {
            return false;
          }
        }
      });

      const Model = db.model('Test', schema);

      await Model.create({ name: undefined });
    });

    it('dotted virtuals in toObject (gh-5473)', function() {
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

      const Model = db.model('Test', schema);

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

      const Parent = db.model('Parent', parentSchema);

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
          assert.deepEqual(doc.toObject({ minimize: false }).child, {});
          done();
        }).
        catch(done);
    });

    it('parent props not in child (gh-5470)', function() {
      const employeeSchema = new mongoose.Schema({
        name: {
          first: String,
          last: String
        },
        department: String
      });
      const Employee = db.model('Test', employeeSchema);

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
    });

    it('modifying array with existing ids (gh-5523)', async function() {
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

      const User = db.model('User', userSchema);

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

      await user.save();

      const doc = await User.findOne({ _id: user._id });

      assert.deepEqual(doc.toObject().social.friends[0], {
        _id: 'val',
        name: 'Val'
      });
    });

    it('consistent setter context for single nested (gh-5363)', function(done) {
      const contentSchema = new Schema({
        blocks: [{ type: String }],
        previous: [{ type: String }]
      });

      // Subdocument setter
      const oldVals = [];
      contentSchema.path('blocks').set(function(newVal, oldVal) {
        if (!this.ownerDocument().isNew && oldVal != null) {
          oldVals.push(oldVal.toObject());
          this.set('previous', [].concat(oldVal.toObject()));
        }

        return newVal;
      });

      const noteSchema = new Schema({
        title: { type: String, required: true },
        body: contentSchema
      });

      const Note = db.model('Test', noteSchema);

      const note = new Note({
        title: 'Lorem Ipsum Dolor',
        body: {
          summary: 'Summary Test',
          blocks: ['html']
        }
      });

      note.save().
        then(function(note) {
          assert.equal(oldVals.length, 0);
          note.set('body', {
            blocks: ['gallery', 'html']
          });
          return note.save();
        }).
        then(function() {
          assert.equal(oldVals.length, 1);
          assert.deepEqual(oldVals[0], ['html']);
          assert.deepEqual(note.body.previous, ['html']);
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

      const Test = db.model('Test', TestSchema);

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

    it('single nested subdoc post deleteOne hooks (gh-5388)', async function() {
      const contentSchema = new Schema({
        blocks: [{ type: String }],
        summary: { type: String }
      });

      let called = 0;

      contentSchema.post('deleteOne', { document: true, query: false }, function() {
        ++called;
      });

      const noteSchema = new Schema({
        body: { type: contentSchema }
      });

      const Note = db.model('Test', noteSchema);

      const note = new Note({
        title: 'Lorem Ipsum Dolor',
        body: {
          summary: 'Summary Test',
          blocks: ['html']
        }
      });

      await note.save();
      await note.deleteOne();
      assert.equal(called, 1);
    });

    it('push populated doc onto empty array triggers manual population (gh-5504)', function() {
      const ReferringSchema = new Schema({
        reference: [{
          type: Schema.Types.ObjectId,
          ref: 'Test'
        }]
      });

      const Referrer = db.model('Test', ReferringSchema);

      const referenceA = new Referrer();
      const referenceB = new Referrer();

      const referrerA = new Referrer({ reference: [referenceA] });
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
    });

    it('single nested conditional required scope (gh-5569)', async function() {
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

      const SuperDocument = db.model('Test', SuperDocumentSchema);

      let doc = new SuperDocument();
      doc.thing.undefinedDisallowed = null;

      await doc.save();

      doc = new SuperDocument();
      doc.thing.undefinedDisallowed = undefined;

      try {
        await doc.save();
      } catch (error) {
        assert.ok(error);
        assert.ok(error.errors['thing.undefinedDisallowed']);
      }
    });

    it('single nested setters only get called once (gh-5601)', function() {
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

      const Parent = db.model('Parent', ParentSchema);
      const p = new Parent();
      p.child = { number: '555.555.0123' };
      assert.equal(vals.length, 1);
      assert.equal(vals[0], '555.555.0123');
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
      const Model = db.model('Test', schema);

      const doc = new Model({ 'name.value': 'test' });

      called = 0;

      doc.toObject({ getters: true });
      assert.equal(called, 1);

      doc.toObject({ getters: false });
      assert.equal(called, 1);
    });

    it('calls subdocument getters if child schema has getters: true (gh-12105)', function() {
      let called = 0;

      const childSchema = new Schema({
        _id: false,
        value: {
          type: String,
          get: function(v) {
            ++called;
            return v.toUpperCase();
          }
        }
      }, { toJSON: { getters: true } });
      const schema = new Schema({ name: childSchema });
      const Test = db.model('Test', schema);

      const doc = new Test({ name: { value: 'John Smith' } });

      const res = doc.toJSON();
      assert.equal(called, 1);
      assert.deepStrictEqual(res.name, { value: 'JOHN SMITH' });
    });

    it('setting doc array to array of top-level docs works (gh-5632)', async function() {
      const MainSchema = new Schema({
        name: { type: String },
        children: [{
          name: { type: String }
        }]
      });
      const RelatedSchema = new Schema({ name: { type: String } });
      const Model = db.model('Test', MainSchema);
      const RelatedModel = db.model('Test1', RelatedSchema);

      const doc = await RelatedModel.create({ name: 'test' });
      const m = await Model.create({ name: 'test1', children: [doc] });
      m.children = [doc];
      await m.save();
      assert.equal(m.children.length, 1);
      assert.equal(m.children[0].name, 'test');
    });

    it('Using set as a schema path (gh-1939)', async function() {
      const testSchema = new Schema({ set: String });

      const Test = db.model('Test', testSchema);

      const t = new Test({ set: 'test 1' });
      assert.equal(t.set, 'test 1');
      await t.save();
      t.set = 'test 2';
      await t.save();
      assert.equal(t.set, 'test 2');
    });

    it('handles array defaults correctly (gh-5780)', function() {
      const testSchema = new Schema({
        nestedArr: {
          type: [[Number]],
          default: [[0, 1]]
        }
      });

      const Test = db.model('Test', testSchema);

      const t = new Test({});
      assert.deepEqual(t.toObject().nestedArr, [[0, 1]]);

      t.nestedArr.push([1, 2]);
      const t2 = new Test({});
      assert.deepEqual(t2.toObject().nestedArr, [[0, 1]]);
    });

    it('sets path to the empty string on save after query (gh-6477)', async function() {
      const schema = new Schema({
        name: String,
        s: {
          type: String,
          default: ''
        }
      });

      const Test = db.model('Test', schema);

      const test = new Test();
      assert.strictEqual(test.s, '');

      // use native driver directly to insert an empty doc
      await Test.collection.insertOne({});

      // udate the doc with the expectation that default booleans will be saved.
      const found = await Test.findOne({});
      found.name = 'Max';
      await found.save();

      // use native driver directly to check doc for saved string
      const final = await Test.collection.findOne({});
      assert.strictEqual(final.name, 'Max');
      assert.strictEqual(final.s, '');
    });

    it('sets path to the default boolean on save after query (gh-6477)', async function() {
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

      const Test = db.model('Test', schema);

      // use native driver directly to kill the fields
      await Test.collection.insertOne({});

      // udate the doc with the expectation that default booleans will be saved.
      const found = await Test.findOne({});
      found.name = 'Britney';
      await found.save();

      // use native driver directly to check doc for saved string
      const final = await Test.collection.findOne({});
      assert.strictEqual(final.name, 'Britney');
      assert.strictEqual(final.t, true);
      assert.strictEqual(final.f, false);
    });

    it('virtuals with no getters return undefined (gh-6223)', function() {
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

      const Person = db.model('Person', personSchema);

      const person = new Person({
        name: 'Anakin'
      });

      assert.strictEqual(person.favoriteChild, void 0);
      assert.ok(!('favoriteChild' in person.toJSON()));
      assert.ok(!('favoriteChild' in person.toObject()));
    });

    it('add default getter/setter (gh-6262)', function() {
      const testSchema = new mongoose.Schema({});

      testSchema.virtual('totalValue');

      const Test = db.model('Test', testSchema);

      assert.equal(Test.schema.virtuals.totalValue.getters.length, 1);
      assert.equal(Test.schema.virtuals.totalValue.setters.length, 1);

      const doc = new Test();
      doc.totalValue = 5;
      assert.equal(doc.totalValue, 5);
    });

    it('calls array getters (gh-9889)', function() {
      let called = 0;
      const testSchema = new mongoose.Schema({
        arr: [{
          type: 'ObjectId',
          ref: 'Doesnt Matter',
          get: () => {
            ++called;
            return 42;
          }
        }]
      });

      const Test = db.model('Test', testSchema);

      const doc = new Test({ arr: [new mongoose.Types.ObjectId()] });
      assert.deepEqual(doc.toObject({ getters: true }).arr, [42]);
      assert.equal(called, 1);
    });

    it('doesnt call setters when init-ing an array (gh-9889)', async function() {
      let called = 0;
      const testSchema = new mongoose.Schema({
        arr: [{
          type: 'ObjectId',
          set: v => {
            ++called;
            return v;
          }
        }]
      });

      const Test = db.model('Test', testSchema);


      let doc = await Test.create({ arr: [new mongoose.Types.ObjectId()] });
      assert.equal(called, 1);

      called = 0;
      doc = await Test.findById(doc._id);
      assert.ok(doc);
      assert.equal(called, 0);
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

      const MyModel = db.model('Test', schema);

      const doc = new MyModel({ nested: { prop: 'test 1' } });

      assert.deepEqual(doc.toJSON(), {
        nested: { prop: 'test 1', virtual: 'test 2' }
      });
      assert.deepEqual(doc.nested.toJSON(), {
        prop: 'test 1', virtual: 'test 2'
      });
    });

    it('Disallows writing to __proto__ and other special properties', function() {
      const schema = new mongoose.Schema({
        name: String
      }, { strict: false });

      const Model = db.model('Test', schema);
      const doc = new Model({ '__proto__.x': 'foo' });

      assert.strictEqual(Model.x, void 0);
      doc.set('__proto__.y', 'bar');

      assert.strictEqual(Model.y, void 0);

      doc.set('constructor.prototype.z', 'baz');

      assert.strictEqual(Model.z, void 0);
    });

    it('save() depopulates pushed arrays (gh-6048)', async function() {
      const blogPostSchema = new Schema({
        comments: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Comment'
        }]
      });

      const BlogPost = db.model('BlogPost', blogPostSchema);

      const commentSchema = new Schema({
        text: String
      });

      const Comment = db.model('Comment', commentSchema);


      let blogPost = await BlogPost.create({});
      const comment = await Comment.create({ text: 'Hello' });

      blogPost = await BlogPost.findById(blogPost);
      blogPost.comments.push(comment);
      await blogPost.save();

      const savedBlogPost = await BlogPost.collection.
        findOne({ _id: blogPost._id });
      assert.equal(savedBlogPost.comments.length, 1);
      assert.equal(savedBlogPost.comments[0].constructor.name, 'ObjectId');
      assert.equal(savedBlogPost.comments[0].toString(),
        blogPost.comments[0]._id.toString());
    });

    it('Handles setting populated path set via `Document#populate()` (gh-7302)', function() {
      const authorSchema = new Schema({ name: String });
      const bookSchema = new Schema({
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'Author' }
      });

      const Author = db.model('Author', authorSchema);
      const Book = db.model('Book', bookSchema);

      return Author.create({ name: 'Victor Hugo' }).
        then(function(author) { return Book.create({ author: author._id }); }).
        then(function() { return Book.findOne(); }).
        then(function(doc) { return doc.populate('author'); }).
        then(function(doc) {
          doc.author = {};
          assert.ok(!doc.author.name);
          assert.ifError(doc.validateSync());
        });
    });

    it('Single nested subdocs using discriminator can be modified (gh-5693)', async() => {
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

      const MyModel = db.model('Test', trackSchema);

      const doc = new MyModel({
        event: {
          message: 'Test',
          kind: 'Clicked',
          element: 'Amazon Link'
        }
      });

      await doc.save();
      assert.equal(doc.event.message, 'Test');
      assert.equal(doc.event.kind, 'Clicked');
      assert.equal(doc.event.element, 'Amazon Link');

      doc.set('event', {
        kind: 'Purchased',
        product: 'Professional AngularJS'
      });

      await doc.save();
      assert.equal(doc.event.kind, 'Purchased');
      assert.equal(doc.event.product, 'Professional AngularJS');
      assert.ok(!doc.event.element);
      assert.ok(!doc.event.message);
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
      const Child = db.model('Child', childSchema);

      const parentSchema = new Schema({
        name: String,
        child: childSchema
      });
      const Parent = db.model('Parent', parentSchema);

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

    it('required function called again after save() (gh-6892)', async function() {
      const schema = new mongoose.Schema({
        field: {
          type: String,
          default: null,
          required: function() { return this && this.field === undefined; }
        }
      });
      const Model = db.model('Test', schema);


      await Model.create({});
      const doc1 = await Model.findOne({}).select({ _id: 1 });
      await doc1.save();

      // Should not throw
      await Model.create({});
    });

    it('doc array: set then remove (gh-3511)', async function() {
      const ItemChildSchema = new mongoose.Schema({
        name: {
          type: String,
          required: true
        }
      });

      const ItemParentSchema = new mongoose.Schema({
        children: [ItemChildSchema]
      });

      const ItemParent = db.model('Parent', ItemParentSchema);

      const p = new ItemParent({
        children: [{ name: 'test1' }, { name: 'test2' }]
      });

      await p.save();

      const doc = await ItemParent.findById(p._id);

      assert.ok(doc);
      assert.equal(doc.children.length, 2);

      doc.children[1].name = 'test3';
      doc.children.remove(doc.children[0]);

      await doc.save();

      const doc2 = await ItemParent.findById(doc._id);

      assert.equal(doc2.children.length, 1);
      assert.equal(doc2.children[0].name, 'test3');
    });

    it('doc array: modify then sort (gh-7556)', async function() {
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

      const Person = db.model('Person', personSchema);

      await Person.create({
        name: 'test',
        assets: [{ name: 'Cash', namePlural: 'Cash' }]
      });
      const p = await Person.findOne();

      p.assets.push({ name: 'Home' });
      p.assets.id(p.assets[0].id).set('name', 'Cash');
      p.assets.id(p.assets[0].id).set('namePlural', 'Cash');

      p.assets.sort((doc1, doc2) => doc1.name > doc2.name ? -1 : 1);

      await p.save();
    });

    it('modifying unselected nested object (gh-5800)', function() {
      const MainSchema = new mongoose.Schema({
        a: {
          b: { type: String, default: 'some default' },
          c: { type: Number, default: 0 },
          d: { type: String }
        },
        e: { type: String }
      });

      MainSchema.pre('save', function(next) {
        if (this.isModified()) {
          this.set('a.c', 100, Number);
        }
        next();
      });

      const Main = db.model('Test', MainSchema);

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

    it('set() underneath embedded discriminator (gh-6482)', async function() {
      const mediaSchema = new Schema({ file: String },
        { discriminatorKey: 'kind', _id: false });

      const photoSchema = new Schema({ position: String });
      const pageSchema = new Schema({ media: mediaSchema });

      pageSchema.path('media').discriminator('photo', photoSchema);

      const Page = db.model('Test', pageSchema);


      let doc = await Page.create({
        media: { kind: 'photo', file: 'cover.jpg', position: 'left' }
      });

      // Using positional args syntax
      doc.set('media.position', 'right');
      assert.equal(doc.media.position, 'right');

      await doc.save();

      doc = await Page.findById(doc._id);
      assert.equal(doc.media.position, 'right');

      // Using object syntax
      doc.set({ 'media.position': 'left' });
      assert.equal(doc.media.position, 'left');

      await doc.save();

      doc = await Page.findById(doc._id);
      assert.equal(doc.media.position, 'left');
    });

    it('set() underneath array embedded discriminator (gh-6526)', async function() {
      const mediaSchema = new Schema({ file: String },
        { discriminatorKey: 'kind', _id: false });

      const photoSchema = new Schema({ position: String });
      const pageSchema = new Schema({ media: [mediaSchema] });

      pageSchema.path('media').discriminator('photo', photoSchema);

      const Page = db.model('Test', pageSchema);


      let doc = await Page.create({
        media: [{ kind: 'photo', file: 'cover.jpg', position: 'left' }]
      });

      // Using positional args syntax
      doc.set('media.0.position', 'right');
      assert.equal(doc.media[0].position, 'right');

      await doc.save();

      doc = await Page.findById(doc._id);
      assert.equal(doc.media[0].position, 'right');
    });

    it('consistent context for nested docs (gh-5347)', async function() {
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

      const Parent = db.model('Parent', parentSchema);

      const doc = await Parent.create({
        name: 'test',
        children: [
          {
            phoneNumber: '123',
            notifications: {
              isEnabled: true
            }
          }
        ]
      });

      const child = doc.children.id(doc.children[0]._id);
      child.phoneNumber = '345';

      assert.equal(contexts.length, 1);

      await doc.save();

      assert.equal(contexts.length, 2);

      assert.ok(contexts[0].toObject().notifications.isEnabled);

      assert.ok(contexts[1].toObject().notifications.isEnabled);
    });

    it('accessing arrays in setters on initial document creation (gh-6155)', function() {
      const artistSchema = new mongoose.Schema({
        name: {
          type: String,
          set: function(v) {
            const splitStrings = v.split(' ');
            for (const keyword of splitStrings) {
              this.keywords.push(keyword);
            }
            return v;
          }
        },
        keywords: [String]
      });

      const Artist = db.model('Test', artistSchema);

      const artist = new Artist({ name: 'Motley Crue' });
      assert.deepEqual(artist.toObject().keywords, ['Motley', 'Crue']);
    });

    it('handles 2nd level nested field with null child (gh-6187)', function() {
      const NestedSchema = new Schema({
        parent: new Schema({
          name: String,
          child: {
            name: String
          }
        }, { strict: false })
      });
      const NestedModel = db.model('Test', NestedSchema);
      const n = new NestedModel({
        parent: {
          name: 'foo',
          child: null // does not fail if undefined
        }
      });

      assert.equal(n.parent.name, 'foo');
    });

    it('does not call default function on init if value set (gh-6410)', async function() {
      let called = 0;

      function generateRandomID() {
        called++;
        return called;
      }

      const TestDefaultsWithFunction = db.model('Test', new Schema({
        randomID: { type: Number, default: generateRandomID }
      }));

      const post = new TestDefaultsWithFunction();
      assert.equal(post.get('randomID'), 1);
      assert.equal(called, 1);


      await post.save();

      await TestDefaultsWithFunction.findById(post._id);

      assert.equal(called, 1);
    });

    describe('convertToFalse and convertToTrue (gh-6758)', function() {
      let convertToFalse = null;
      let convertToTrue = null;

      beforeEach(function() {
        convertToFalse = new Set(mongoose.Schema.Types.Boolean.convertToFalse);
        convertToTrue = new Set(mongoose.Schema.Types.Boolean.convertToTrue);
      });

      afterEach(function() {
        mongoose.Schema.Types.Boolean.convertToFalse = convertToFalse;
        mongoose.Schema.Types.Boolean.convertToTrue = convertToTrue;
      });

      it('lets you add custom strings that get converted to true/false', function() {
        const TestSchema = new Schema({ b: Boolean });
        const Test = db.model('Test', TestSchema);

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

      it('allows adding `null` to list of values that convert to false (gh-9223)', function() {
        const TestSchema = new Schema({ b: Boolean });
        const Test = db.model('Test', TestSchema);

        mongoose.Schema.Types.Boolean.convertToFalse.add(null);

        const doc1 = new Test({ b: null });
        const doc2 = new Test();
        doc2.init({ b: null });

        assert.strictEqual(doc1.b, false);
        assert.strictEqual(doc2.b, false);
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

      const M = db.model('Test', schema);
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

      const M = db.model('Test', parent);
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

    it('defaults should see correct isNew (gh-3793)', async function() {
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

      const TestModel = db.model('Test', TestSchema);


      await Promise.resolve(db);

      await TestModel.collection.insertOne({});

      let doc = await TestModel.findOne({});
      assert.strictEqual(doc.test, void 0);
      assert.deepEqual(isNew, [false]);

      isNew = [];

      doc = await TestModel.create({});
      assert.ok(doc.test instanceof Date);
      assert.deepEqual(isNew, [true]);
    });

    it('modify multiple subdoc paths (gh-4405)', async() => {
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

      const Parent = db.model('Parent', ParentObjectSchema);

      const p = new Parent({
        parentProperty1: 'abc',
        parentProperty2: '123',
        child: {
          childProperty1: 'a',
          childProperty2: 'b',
          childProperty3: 'c'
        }
      });

      await p.save();

      const p1 = await Parent.findById(p._id);

      p1.parentProperty1 = 'foo';
      p1.parentProperty2 = 'bar';
      p1.child.childProperty1 = 'ping';
      p1.child.childProperty2 = 'pong';
      p1.child.childProperty3 = 'weee';

      await p1.save();

      const p2 = await Parent.findById(p._id);

      assert.equal(p2.child.childProperty1, 'ping');
      assert.equal(p2.child.childProperty2, 'pong');
      assert.equal(p2.child.childProperty3, 'weee');
    });

    it('doesnt try to cast populated embedded docs (gh-6390)', async function() {
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

      const Other = db.model('Test1', otherSchema);
      const Test = db.model('Test', schema);

      const other = new Other({ name: 'Nicole' });

      const test = new Test({
        name: 'abc',
        sub: {
          my: 'Test1',
          other: other._id
        }
      });

      await other.save();
      await test.save();
      const doc = await Test.findOne({}).populate('sub.other');
      assert.strictEqual('Nicole', doc.sub.other.name);

    });
  });

  describe('clobbered Array.prototype', function() {
    beforeEach(() => db.deleteModel(/.*/));

    afterEach(function() {
      delete Array.prototype.remove;
    });

    it('handles clobbered Array.prototype.remove (gh-6431)', function() {
      Object.defineProperty(Array.prototype, 'remove', {
        value: 42,
        configurable: true,
        writable: false
      });

      const schema = new Schema({ arr: [{ name: String }] });
      const MyModel = db.model('Test', schema);

      const doc = new MyModel();
      assert.deepEqual(doc.toObject().arr, []);
    });

    it('calls array validators again after save (gh-6818)', async function() {
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
      const Model = db.model('Test', schema);

      await Model.create({
        roles: [
          { name: 'admin' },
          { name: 'mod', folders: [{ folderId: 'foo' }] }
        ]
      });

      const doc = await Model.findOne();

      doc.roles[1].folders.push({ folderId: 'bar' });

      await doc.save();

      doc.roles[1].folders[1].folderId = 'foo';
      let threw = false;
      try {
        await doc.save();
      } catch (error) {
        threw = true;
        assert.equal(error.errors['roles.1.folders'].reason.message, 'Duplicate');
      }
      assert.ok(threw);
    });

    it('set single nested to num throws ObjectExpectedError (gh-6710) (gh-6753)', function() {
      const schema = new Schema({
        nested: new Schema({
          num: Number
        })
      });

      const Test = db.model('Test', schema);

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
      const ParentModel = db.model('Parent', Parent);
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

  it('does not save duplicate items after two saves (gh-6900)', async function() {
    const M = db.model('Test', { items: [{ name: String }] });
    const doc = new M();
    doc.items.push({ name: '1' });


    await doc.save();
    doc.items.push({ name: '2' });
    await doc.save();

    const found = await M.findById(doc.id);
    assert.equal(found.items.length, 2);
  });

  it('validateSync() on embedded doc (gh-6931)', async function() {
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

    const Model = db.model('Test', schema);


    const doc2 = new Model();
    doc2.field = new mongoose.Types.ObjectId();
    doc2.inner.push({
      innerField: new mongoose.Types.ObjectId()
    });
    doc2.inner[0].innerField = '';

    let err = doc2.inner[0].validateSync();
    assert.ok(err);
    assert.ok(err.errors['innerField']);

    err = await doc2.inner[0].validate().then(() => assert.ok(false), err => err);
    assert.ok(err);
    assert.ok(err.errors['innerField']);
  });

  it('retains user-defined key order with nested docs (gh-6944)', function() {
    const schema = new Schema({
      _id: String,
      foo: String,
      bar: {
        a: String
      }
    });

    const Model = db.model('Test', schema);

    const doc = new Model({ _id: 'test', foo: 'hello', bar: { a: 'world' } });

    // Same order as in the initial set above
    assert.deepEqual(Object.keys(doc._doc), ['_id', 'foo', 'bar']);

    return Promise.resolve();
  });

  it('does not mark modified if setting nested subdoc to same value (gh-7048)', async function() {
    const BarSchema = new Schema({ bar: String }, { _id: false });
    const FooNestedSchema = new Schema({ foo: BarSchema });

    const Model = db.model('Test', FooNestedSchema);


    const doc = await Model.create({ foo: { bar: 'test' } });
    doc.set({ foo: { bar: 'test' } });

    assert.deepEqual(doc.modifiedPaths(), []);

    doc.set('foo.bar', 'test');

    assert.deepEqual(doc.modifiedPaths(), []);
  });

  it('allow saving validation error in db (gh-7127)', async function() {

    const schema = new Schema({
      error: mongoose.Schema.Types.Mixed,
      name: { type: String, required: true }
    });
    const Model = db.model('Test', schema);

    const doc = new Model();

    const error = await doc.validate().catch(error => error);

    doc.name = 'foo';
    doc.error = error;

    await doc.save();

    const fromDb = await Model.findOne();
    assert.ok(fromDb.error.errors.name);
  });

  it('handles mixed arrays with all syntaxes (gh-7109)', function() {
    const schema = new Schema({
      arr1: [Schema.Types.Mixed],
      arr2: [{}],
      arr3: [Object]
    });

    const Test = db.model('Test', schema);

    const test = new Test({
      arr1: ['test1', { two: 'three' }, [4, 'five', 6]],
      arr2: ['test2', { three: 'four' }, [5, 'six', 7]],
      arr3: ['test3', { four: 'five' }, [6, 'seven', 8]]
    });

    assert.ok(test.validateSync() == null, test.validateSync());

    return Promise.resolve();
  });

  it('propsParameter option (gh-7145)', async function() {
    const schema = new Schema({
      name: {
        type: String,
        validate: {
          validator: (v, props) => props.validator != null,
          propsParameter: true
        }
      }
    });

    const Test = db.model('Test', schema);

    const doc = new Test({ name: 'foo' });
    const syncValidationError = doc.validateSync();
    assert.ok(syncValidationError == null, syncValidationError);


    const asyncValidationError = await doc.validate().then(() => null, err => err);

    assert.ok(asyncValidationError == null, asyncValidationError);
  });

  it('surfaces errors in subdoc pre validate (gh-7187)', function() {
    const InnerSchema = new Schema({ name: String });

    InnerSchema.pre('validate', function() {
      throw new Error('Oops!');
    });

    const TestSchema = new Schema({ subdocs: [InnerSchema] });

    const Test = db.model('Test', TestSchema);

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

    const Model = db.model('Test', TestSchema);

    const doc = new Model({ nested: { name: 'foo' } });

    // Make sure setter only gets called once
    called = [];
    doc.set('nested.withSetter', 'bar');

    assert.equal(called.length, 1);
    assert.equal(called[0].name, 'foo');

    return Promise.resolve();
  });

  it('should enable key with dot(.) on mixed types with checkKeys (gh-7144)', async function() {
    const s = new Schema({ raw: { type: Schema.Types.Mixed } });
    const M = db.model('Test', s);

    const raw = { 'foo.bar': 'baz' };


    let doc = await M.create([{ raw: raw }], { checkKeys: false }).
      then(res => res[0]);
    assert.deepEqual(doc.raw, raw);

    doc = await M.findOneAndUpdate({}, { raw: { 'a.b': 2 } }, { new: true });
    assert.deepEqual(doc.raw, { 'a.b': 2 });
  });

  it('doesnt mark array as modified on init if embedded schema has default (gh-7227)', async function() {
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
    const Model = db.model('Test', schema);


    let doc = new Model({ name: 'test', sub: [{}] });
    await doc.save();

    assert.ok(!doc.isModified());

    doc = await Model.findOne();
    assert.ok(!doc.isModified());
  });

  it('casts defaults for doc arrays (gh-7337)', async function() {
    const accountSchema = new mongoose.Schema({
      roles: {
        type: [{
          otherProperties: {
            example: Boolean
          },
          name: String
        }],
        default: function() {
          return [
            { otherProperties: { example: true }, name: 'First' },
            { otherProperties: { example: false }, name: 'Second' }
          ];
        }
      }
    });

    const Account = db.model('Test', accountSchema);


    await Account.create({});

    const doc = await Account.findOne();

    assert.ok(doc.roles[0]._id);
    assert.ok(doc.roles[1]._id);
  });

  it('updateOne() hooks (gh-7133) (gh-7423)', async function() {
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
    schema.pre('deleteOne', { document: true }, () => ++removeCount1);
    schema.pre('deleteOne', { document: true, query: false }, () => ++removeCount2);

    const Model = db.model('Test', schema);


    const doc = new Model({ name: 'test' });
    await doc.save();

    assert.equal(queryCount, 0);
    assert.equal(docCount, 0);
    assert.equal(docPostCount, 0);
    assert.equal(docRegexCount, 0);
    assert.equal(docPostRegexCount, 0);

    await doc.updateOne({ name: 'test2' });

    assert.equal(queryCount, 1);
    assert.equal(docCount, 1);
    assert.equal(docPostCount, 1);
    assert.equal(docRegexCount, 1);
    assert.equal(docPostRegexCount, 1);

    assert.equal(removeCount1, 0);
    assert.equal(removeCount2, 0);

    await doc.deleteOne();

    assert.equal(removeCount1, 1);
    assert.equal(removeCount2, 1);
  });

  it('doesnt mark single nested doc date as modified if setting with string (gh-7264)', async function() {
    const subSchema = new mongoose.Schema({
      date2: Date
    });

    const schema = new mongoose.Schema({
      date1: Date,
      sub: subSchema
    });

    const Model = db.model('Test', schema);


    const date = '2018-11-22T09:00:00.000Z';

    const doc = await Model.create({
      date1: date,
      sub: { date2: date }
    });

    assert.deepEqual(doc.modifiedPaths(), []);

    doc.set('date1', date);
    doc.set('sub.date2', date);

    assert.deepEqual(doc.modifiedPaths(), []);
  });

  it('handles null `fields` param to constructor (gh-7271)', function() {
    const ActivityBareSchema = new Schema({
      _id: {
        type: Schema.Types.ObjectId,
        ref: 'Activity'
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
      }
    };

    const Event = db.model('Test', EventSchema);
    const event = new Event(data, null);

    assert.equal(event.activity.name, 'Activity name');

    return event.validate();
  });

  it('flattenMaps option for toObject() (gh-10872) (gh-7274) (gh-10486)', function() {
    const subSchema = new Schema({ name: String });

    let schema = new Schema({
      test: {
        type: Map,
        of: subSchema,
        default: new Map()
      }
    }, { versionKey: false });

    let Test = db.model('Test', schema);

    let mapTest = new Test({});
    mapTest.test.set('key1', { name: 'value1' });
    // getters: true for gh-10486
    assert.equal(mapTest.toObject({ getters: true, flattenMaps: true }).test.key1.name, 'value1');

    assert.equal(mapTest.toJSON({ getters: true, flattenMaps: true }).test.key1.name, 'value1');
    assert.equal(mapTest.toJSON({ getters: true, flattenMaps: false }).test.get('key1').name, 'value1');

    schema = new Schema({
      test: {
        type: Map,
        of: subSchema,
        default: new Map()
      }
    }, { versionKey: false });
    schema.set('toObject', { flattenMaps: true });

    db.deleteModel('Test');
    Test = db.model('Test', schema);

    mapTest = new Test({});
    mapTest.test.set('key1', { name: 'value1' });
    assert.equal(mapTest.toObject({}).test.key1.name, 'value1');
  });

  it('flattenObjectIds option for toObject() (gh-13341) (gh-2790)', function() {
    const schema = new Schema({
      _id: 'ObjectId',
      nested: {
        id: 'ObjectId'
      },
      subdocument: new Schema({}),
      documentArray: [new Schema({})]
    }, { versionKey: false });

    const Test = db.model('Test', schema);

    const doc = new Test({
      _id: new mongoose.Types.ObjectId('0'.repeat(24)),
      nested: {
        id: new mongoose.Types.ObjectId('1'.repeat(24))
      },
      subdocument: {
        _id: new mongoose.Types.ObjectId('2'.repeat(24))
      },
      documentArray: [{ _id: new mongoose.Types.ObjectId('3'.repeat(24)) }]
    });
    assert.deepStrictEqual(doc.toObject({ flattenObjectIds: true }), {
      _id: '0'.repeat(24),
      nested: {
        id: '1'.repeat(24)
      },
      subdocument: {
        _id: '2'.repeat(24)
      },
      documentArray: [{ _id: '3'.repeat(24) }]
    });
  });

  it('`collection` property with strict: false (gh-7276)', async function() {
    const schema = new Schema({}, { strict: false, versionKey: false });
    const Model = db.model('Test', schema);

    let doc = new Model({ test: 'foo', collection: 'bar' });

    await doc.save();

    assert.equal(doc.collection, 'bar');

    doc = await Model.findOne();
    assert.equal(doc.toObject().collection, 'bar');
  });

  it('should validateSync() all elements in doc array (gh-6746)', function() {
    const Model = db.model('Test', new Schema({
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

  it('handles fake constructor (gh-7290)', async function() {
    const TestSchema = new Schema({ test: String });

    const TestModel = db.model('Test', TestSchema);

    const badQuery = {
      test: {
        length: 1e10,
        constructor: {
          name: 'Array'
        }
      }
    };


    let err = await TestModel.findOne(badQuery).then(() => null, e => e);
    assert.equal(err.name, 'CastError', err.stack);

    err = await TestModel.updateOne(badQuery, { name: 'foo' }).
      then(() => null, err => err);
    assert.equal(err.name, 'CastError', err.stack);

    err = await TestModel.updateOne({}, badQuery).then(() => null, e => e);
    assert.equal(err.name, 'CastError', err.stack);

    err = await TestModel.deleteOne(badQuery).then(() => null, e => e);
    assert.equal(err.name, 'CastError', err.stack);
  });

  it('handles fake __proto__ (gh-7290)', async function() {
    const TestSchema = new Schema({ test: String, name: String });

    const TestModel = db.model('Test', TestSchema);

    const badQuery = JSON.parse('{"test":{"length":1000000000,"__proto__":[]}}');


    let err = await TestModel.findOne(badQuery).then(() => null, e => e);
    assert.equal(err.name, 'CastError', err.stack);

    err = await TestModel.updateOne(badQuery, { name: 'foo' }).
      then(() => null, err => err);
    assert.equal(err.name, 'CastError', err.stack);

    err = await TestModel.updateOne({}, badQuery).then(() => null, e => e);
    assert.equal(err.name, 'CastError', err.stack);

    err = await TestModel.deleteOne(badQuery).then(() => null, e => e);
    assert.equal(err.name, 'CastError', err.stack);
  });

  it('cast error with string path set to array in db (gh-7619)', async function() {
    const TestSchema = new Schema({ name: String });

    const TestModel = db.model('Test', TestSchema);


    await TestModel.findOne();

    await TestModel.collection.insertOne({ name: ['foo', 'bar'] });

    const doc = await TestModel.findOne();
    assert.ok(!doc.name);
    const err = doc.validateSync();
    assert.ok(err);
    assert.ok(err.errors['name']);
  });

  it('doesnt crash if nested path with `get()` (gh-7316)', function() {
    const schema = new mongoose.Schema({ http: { get: Number } });
    const Model = db.model('Test', schema);

    return Model.create({ http: { get: 400 } }); // Should succeed
  });

  it('copies atomics from existing document array when setting doc array (gh-7472)', async function() {
    const Dog = db.model('Test', new mongoose.Schema({
      name: String,
      toys: [{
        name: String
      }]
    }));


    const dog = new Dog({ name: 'Dash' });

    dog.toys.push({ name: '1' });
    dog.toys.push({ name: '2' });
    dog.toys.push({ name: '3' });

    await dog.save();

    for (const toy of ['4', '5', '6']) {
      dog.toys = dog.toys || [];
      dog.toys.push({ name: toy, count: 1 });
    }

    await dog.save();

    const fromDb = await Dog.findOne();
    assert.deepEqual(fromDb.toys.map(t => t.name), ['1', '2', '3', '4', '5', '6']);
  });

  it('doesnt fail with custom update function (gh-7342)', async function() {
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

    const Catalog = db.model('Test', catalogSchema);


    let doc = await Catalog.create({ name: 'test', sub: { name: 'foo' } });
    doc = await doc.update({ name: 'test2' });
    assert.equal(doc.name, 'test2');
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

    const User = db.model('User', new Schema({
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

    const CompanyUser = db.model('User', companyUserSchema);

    const cu = new CompanyUser({ profile: { name: 'foo', email: 'bar' } });
    cu.profile = Object.assign({}, cu.profile);

    assert.equal(cu.profile.name, 'foo');
    assert.equal(cu.profile.email, 'bar');
    assert.doesNotThrow(function() {
      cu.toObject();
    });
  });

  it('setting single nested subdoc with custom date types and getters/setters (gh-7601)', async function() {
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
    const Model = db.model('Parent', parentSchema);


    const doc = await Model.create({
      nested: { start: moment('2019-01-01'), end: moment('2019-01-02') }
    });

    doc.nested = { start: moment('2019-03-01'), end: moment('2019-04-01') };
    await doc.save();

    const _doc = await Model.collection.findOne();
    assert.ok(_doc.nested.start instanceof Date);
    assert.ok(_doc.nested.end instanceof Date);
  });

  it('get() and set() underneath alias (gh-7592)', async function() {
    const photoSchema = new Schema({
      foo: String
    });

    const pageSchema = new Schema({
      p: { type: [photoSchema], alias: 'photos' }
    });
    const Page = db.model('Test', pageSchema);


    const doc = await Page.create({ p: [{ foo: 'test' }] });

    assert.equal(doc.p[0].foo, 'test');
    assert.equal(doc.get('photos.0.foo'), 'test');

    doc.set('photos.0.foo', 'bar');
    assert.equal(doc.p[0].foo, 'bar');
    assert.equal(doc.get('photos.0.foo'), 'bar');
  });

  it('get() with getters: false (gh-7233)', function() {
    const testSchema = new Schema({
      foo: { type: String, get: v => v.toLowerCase() }
    });
    const Test = db.model('Test', testSchema);

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
    const Test = db.model('Test', parentSchema);

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
    const Model = db.model('Test', schema);

    const doc = new Model({ nested: { prop: '1' } });

    doc.set('nested', new Nested('2'));
    assert.equal(doc.nested.prop, '2');

    doc.set({ nested: new Nested('3') });
    assert.equal(doc.nested.prop, '3');
  });

  it('supports setting date properties with strict: false (gh-7907)', function() {
    const schema = Schema({}, { strict: false });
    const SettingsModel = db.model('Test', schema);

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

    const Page = db.model('Test', pageSchema);
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

    const Model = db.model('Test', schema);
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
      discriminatorKey: 'type'
    };

    const IssueSchema = new mongoose.Schema({
      _id: String,
      text: String,
      type: String
    }, opts);

    const IssueModel = db.model('Test', IssueSchema);

    const SubIssueSchema = new mongoose.Schema({
      checklist: [{
        completed: { $type: Boolean, default: false }
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
    const Kitten = db.model('Test', kittySchema);

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

    const TestModel = db.model('Test', NewSchema);
    const instance = new TestModel();
    instance.object = 'value';

    assert.ifError(instance.validateSync());

    return instance.validate();
  });

  it('nested set on subdocs works (gh-7748)', async function() {
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

    const User = db.model('User', userSchema);

    const position = {
      geometry: {
        type: 'Point',
        coordinates: [1.11111, 2.22222]
      },
      properties: {
        a: 'b'
      }
    };

    const newUser = new User({
      position: position
    });

    await newUser.save();

    const editUser = await User.findById(newUser._id);
    editUser.position = position;

    await editUser.validate();
    await editUser.save();

    const fromDb = await User.findById(newUser._id);
    assert.equal(fromDb.position.properties.a, 'b');
    assert.equal(fromDb.position.geometry.coordinates[0], 1.11111);
  });

  it('does not convert array to object with strict: false (gh-7733)', async function() {
    const ProductSchema = new mongoose.Schema({}, { strict: false });
    const Product = db.model('Test', ProductSchema);


    await Product.create({ arr: [{ test: 1 }, { test: 2 }] });

    const doc = await Product.collection.findOne();
    assert.ok(Array.isArray(doc.arr));
    assert.deepEqual(doc.arr, [{ test: 1 }, { test: 2 }]);
  });

  it('does not crash with array property named "undefined" (gh-7756)', async function() {
    const schema = new Schema({ undefined: [String] });
    const Model = db.model('Test', schema);


    const doc = await Model.create({ undefined: ['foo'] });

    doc['undefined'].push('bar');
    await doc.save();

    const _doc = await Model.collection.findOne();
    assert.equal(_doc['undefined'][0], 'foo');
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

    const Parent = db.model('Parent', parentSchema);

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
        validate: async function() {
          await Promise.resolve((resolve) => setImmediate(resolve));
          throw new Error('Oops!');
        }
      }
    });
    const Model = db.model('Test', schema);

    return Model.create({ name: 'foo' }).then(() => assert.ok(false), err => {
      assert.equal(err.errors['name'].message, 'Oops!');
      assert.ok(err.message.indexOf('Oops!') !== -1, err.message);
    });
  });

  it('handles nested properties named `schema` (gh-7831)', async function() {
    const schema = new mongoose.Schema({ nested: { schema: String } });
    const Model = db.model('Test', schema);

    await Model.collection.insertOne({ nested: { schema: 'test' } });

    const doc = await Model.findOne();
    assert.strictEqual(doc.nested.schema, 'test');
  });

  it('handles nested properties named `on` (gh-11656)', async function() {
    const schema = new mongoose.Schema({ on: String }, { suppressReservedKeysWarning: true });
    const Model = db.model('Test', schema);

    await Model.create({ on: 'test string' });

    const doc = await Model.findOne();
    assert.strictEqual(doc.on, 'test string');
  });

  describe('overwrite() (gh-7830)', function() {
    let Model;

    beforeEach(function() {
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
      Model = db.model('Test', schema);
    });

    it('works', async function() {

      const doc = await Model.create({
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

    it('skips version key', async function() {

      await Model.collection.insertOne({
        _id: 2,
        __v: 5,
        name: 'test',
        nested: { prop: 'foo' },
        immutable: 'bar'
      });
      const doc = await Model.findOne({ _id: 2 });
      doc.overwrite({ _id: 2, name: 'test2' });

      assert.deepEqual(doc.toObject(), {
        _id: 2,
        __v: 5,
        name: 'test2',
        immutable: 'bar'
      });
    });

    it('skips discriminator key', async function() {

      const D = Model.discriminator('D', Schema({ other: String }));
      await Model.collection.insertOne({
        _id: 2,
        __v: 5,
        __t: 'D',
        name: 'test',
        nested: { prop: 'foo' },
        immutable: 'bar',
        other: 'baz'
      });
      const doc = await D.findOne({ _id: 2 });
      doc.overwrite({ _id: 2, name: 'test2' });

      assert.deepEqual(doc.toObject(), {
        _id: 2,
        __v: 5,
        __t: 'D',
        name: 'test2',
        immutable: 'bar'
      });
      return doc.validate();
    });

    it('overwrites maps (gh-9549)', async function() {
      const schema = new Schema({
        name: String,
        myMap: { type: Map, of: String }
      });
      db.deleteModel(/Test/);
      const Test = db.model('Test', schema);

      let doc = new Test({ name: 'test', myMap: { a: 1, b: 2 } });


      await doc.save();

      doc = await Test.findById(doc);
      doc.overwrite({ name: 'test2', myMap: { b: 2, c: 3 } });
      await doc.save();

      doc = await Test.findById(doc);
      assert.deepEqual(Array.from(doc.toObject().myMap.values()), [2, 3]);
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

    const Parent = db.model('Parent', ParentSchema);
    const Wrapper = db.model('Test', WrapperSchema);

    const data = { name: 'P1', children: [{ name: 'C1' }, { name: 'C2' }] };
    const parent = new Parent(data);
    parent.children[0].foo = 123;

    const wrapper = new Wrapper({ name: 'test', parents: [parent] });
    assert.equal(wrapper.parents[0].children[0].foo, 123);
  });

  describe('immutable properties (gh-7671)', function() {
    let Model;

    beforeEach(function() {
      const schema = new Schema({
        createdAt: {
          type: Date,
          immutable: true,
          default: new Date('6/1/2019')
        },
        name: String
      });
      Model = db.model('Test', schema);
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

    it('with save()', async function() {
      let doc = new Model({ name: 'Foo' });

      assert.equal(doc.createdAt.toLocaleDateString('en-us'), '6/1/2019');
      await doc.save();

      doc = await Model.findOne({ createdAt: new Date('6/1/2019') });
      doc.createdAt = new Date('6/1/2017');
      assert.equal(doc.createdAt.toLocaleDateString('en-us'), '6/1/2019');

      doc.set({ createdAt: new Date('6/1/2021') });
      assert.equal(doc.createdAt.toLocaleDateString('en-us'), '6/1/2019');

      await doc.save();

      doc = await Model.findOne({ createdAt: new Date('6/1/2019') });
      assert.ok(doc);
    });

    it('with update', async function() {
      let doc = new Model({ name: 'Foo' });

      assert.equal(doc.createdAt.toLocaleDateString('en-us'), '6/1/2019');
      await doc.save();

      const update = { createdAt: new Date('6/1/2020') };

      await Model.updateOne({}, update);

      doc = await Model.findOne();
      assert.equal(doc.createdAt.toLocaleDateString('en-us'), '6/1/2019');

      const err = await Model.updateOne({}, update, { strict: 'throw' }).
        then(() => null, err => err);
      assert.equal(err.name, 'StrictModeError');
      assert.ok(err.message.indexOf('createdAt') !== -1, err.message);
    });

    it('conditional immutable (gh-8001)', async function() {
      const schema = new Schema({
        name: String,
        test: {
          type: String,
          immutable: doc => doc.name === 'foo'
        }
      });
      const Model = db.model('Test1', schema);


      const doc1 = await Model.create({ name: 'foo', test: 'before' });
      const doc2 = await Model.create({ name: 'bar', test: 'before' });

      doc1.set({ test: 'after' });
      doc2.set({ test: 'after' });
      await doc1.save();
      await doc2.save();

      const fromDb1 = await Model.collection.findOne({ name: 'foo' });
      const fromDb2 = await Model.collection.findOne({ name: 'bar' });
      assert.equal(fromDb1.test, 'before');
      assert.equal(fromDb2.test, 'after');
    });

    it('immutable with strict mode (gh-8149)', async function() {

      const schema = new mongoose.Schema({
        name: String,
        yearOfBirth: { type: Number, immutable: true }
      }, { strict: 'throw' });
      const Person = db.model('Person', schema);
      const joe = await Person.create({ name: 'Joe', yearOfBirth: 2001 });

      joe.set({ yearOfBirth: 2002 });
      const err = await joe.save().then(() => null, err => err);
      assert.ok(err);
      assert.equal(err.errors['yearOfBirth'].name, 'StrictModeError');
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

    const Model = db.model('Parent', Parent);

    return Model.create({ children: [{ children: [{ value: 3 }] }] }).then(() => {
      assert.deepEqual(calls, [1, 2, 3]);
    });
  });

  it('respects projection for getters (gh-7940)', async function() {
    const schema = new Schema({
      foo: String,
      bar: {
        type: String,
        get: () => {
          return 'getter value';
        }
      }
    }, { toObject: { getters: true } });

    const Model = db.model('Test', schema);


    await Model.create({ foo: 'test', bar: 'baz' });

    const doc = await Model.findOne({ foo: 'test' }, 'foo');

    assert.ok(!doc.toObject().bar);
  });

  it('loads doc with a `once` property successfully (gh-7958)', async function() {
    const eventSchema = Schema({ once: { prop: String } });
    const Event = db.model('Test', eventSchema);


    await Event.create({ once: { prop: 'test' } });

    const doc = await Event.findOne();
    assert.equal(doc.once.prop, 'test');
  });

  it('caster that converts to Number class works (gh-8150)', async function() {

    const mySchema = new Schema({
      id: {
        type: Number,
        set: value => new Number(value.valueOf())
      }
    });

    const MyModel = db.model('Test', mySchema);

    await MyModel.create({ id: 12345 });

    const doc = await MyModel.findOne({ id: 12345 });
    assert.ok(doc);
  });

  it('handles objectids and decimals with strict: false (gh-7973)', async function() {
    const testSchema = Schema({}, { strict: false });
    const Test = db.model('Test', testSchema);

    let doc = new Test({
      testId: new mongoose.Types.ObjectId(),
      testDecimal: new mongoose.Types.Decimal128('1.23')
    });

    assert.ok(doc.testId instanceof mongoose.Types.ObjectId);
    assert.ok(doc.testDecimal instanceof mongoose.Types.Decimal128);


    await doc.save();

    doc = await Test.collection.findOne();
    assert.ok(doc.testId instanceof mongoose.Types.ObjectId);
    assert.ok(doc.testDecimal instanceof mongoose.Types.Decimal128);
  });

  it('allows enum on array of array of strings (gh-7926)', function() {
    const schema = new Schema({
      test: {
        type: [[String]],
        enum: ['bar']
      }
    });

    const Model = db.model('Test', schema);

    return Model.create({ test: [['foo']] }).then(() => assert.ok(false), err => {
      assert.ok(err);
      assert.ok(err.errors['test.0.0']);
      assert.ok(err.errors['test.0.0'].message.indexOf('foo') !== -1,
        err.errors['test.0.0'].message);
    });
  });

  it('allows saving an unchanged document if required populated path is null (gh-8018)', async function() {
    const schema = Schema({ test: String });
    const schema2 = Schema({
      keyToPopulate: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Child',
        required: true
      }
    });

    const Child = db.model('Child', schema);
    const Parent = db.model('Parent', schema2);


    const child = await Child.create({ test: 'test' });
    await Parent.create({ keyToPopulate: child._id });

    await child.deleteOne();

    const doc = await Parent.findOne().populate('keyToPopulate');

    // Should not throw
    await doc.save();
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
    const Model = db.model('Test', schema);

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
    const Model = db.model('Test', Schema({
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

  it('handles populate() with custom type that does not cast to doc (gh-8062)', async function() {
    class Gh8062 extends mongoose.SchemaType {
      cast(val) {
        if (typeof val === 'string') {
          return val;
        }
        throw new Error('Failed!');
      }
    }

    mongoose.Schema.Types.Gh8062 = Gh8062;

    const schema = new Schema({ arr: [{ type: Gh8062, ref: 'Child' }] });
    const Model = db.model('Test', schema);
    const Child = db.model('Child', Schema({ _id: Gh8062 }));


    await Child.create({ _id: 'test' });
    await Model.create({ arr: ['test'] });

    const doc = await Model.findOne().populate('arr');
    assert.ok(doc.populated('arr'));
    assert.equal(doc.arr[0]._id, 'test');
    assert.ok(doc.arr[0].$__ != null);
  });

  it('can inspect() on a document array (gh-8037)', function() {
    const subdocSchema = mongoose.Schema({ a: String });
    const schema = mongoose.Schema({ subdocs: { type: [subdocSchema] } });
    const Model = db.model('Test', schema);
    const data = { _id: new mongoose.Types.ObjectId(), subdocs: [{ a: 'a' }] };
    const doc = new Model();
    doc.init(data);
    require('util').inspect(doc.subdocs);
  });

  it('always passes unpopulated paths to validators (gh-8042)', async function() {
    const schema = Schema({ test: String });

    const calledWith = [];
    function validate(v) {
      calledWith.push(v);
      return true;
    }
    const schema2 = Schema({
      keyToPopulate: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'gh8018_child',
        required: true,
        validate: validate
      },
      array: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'gh8018_child',
        required: true,
        validate: validate
      }],
      subdoc: Schema({
        keyToPopulate: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'gh8018_child',
          required: true,
          validate: validate
        }
      })
    });

    const Child = db.model('gh8018_child', schema);
    const Parent = db.model('gh8018_parent', schema2);


    const child = await Child.create({ test: 'test' });
    await Parent.create({ keyToPopulate: child, array: [child], subdoc: { keyToPopulate: child } });

    assert.equal(calledWith.length, 3);

    assert.ok(calledWith[0] instanceof mongoose.Types.ObjectId);
    assert.ok(calledWith[1] instanceof mongoose.Types.ObjectId);
    assert.ok(calledWith[2] instanceof mongoose.Types.ObjectId);

    await child.deleteOne();

    const doc = await Parent.findOne().populate(['keyToPopulate', 'array', 'subdoc']);
    assert.equal(doc.keyToPopulate, null);

    // Should not throw
    await doc.save();
  });

  it('set() merge option with single nested (gh-8201)', async function() {
    const AddressSchema = Schema({
      street: { type: String, required: true },
      city: { type: String, required: true }
    });
    const PersonSchema = Schema({
      name: { type: String, required: true },
      address: { type: AddressSchema, required: true }
    });
    const Person = db.model('Person', PersonSchema);


    await Person.create({
      name: 'John Smith',
      address: {
        street: 'Real Street',
        city: 'Somewhere'
      }
    });

    const person = await Person.findOne();
    const obj = {
      name: 'John Smythe',
      address: { street: 'Fake Street' }
    };
    person.set(obj, undefined, { merge: true });

    assert.equal(person.address.city, 'Somewhere');
    await person.save();
  });

  it('setting single nested subdoc with timestamps (gh-8251)', async function() {
    const ActivitySchema = Schema({ description: String }, { timestamps: true });
    const RequestSchema = Schema({ activity: ActivitySchema });
    const Request = db.model('Test', RequestSchema);


    const doc = await Request.create({
      activity: { description: 'before' }
    });
    doc.activity.set({ description: 'after' });
    await doc.save();

    const fromDb = await Request.findOne().lean();
    assert.equal(fromDb.activity.description, 'after');
  });

  it('passing an object with toBSON() into `save()` (gh-8299)', async function() {
    const ActivitySchema = Schema({ description: String });
    const RequestSchema = Schema({ activity: ActivitySchema });
    const Request = db.model('Test', RequestSchema);


    const doc = await Request.create({
      activity: { description: 'before' }
    });
    doc.activity.set({ description: 'after' });
    await doc.save();

    const fromDb = await Request.findOne().lean();
    assert.equal(fromDb.activity.description, 'after');
  });

  it('handles getter setting virtual on manually populated doc when calling toJSON (gh-8295)', function() {
    const childSchema = Schema({}, { toJSON: { getters: true } });
    childSchema.virtual('field').
      get(function() { return this._field; }).
      set(function(v) { return this._field = v; });
    const Child = db.model('Child', childSchema);

    const parentSchema = Schema({
      child: { type: mongoose.ObjectId, ref: 'Child', get: get }
    }, { toJSON: { getters: true } });
    const Parent = db.model('Parent', parentSchema);

    function get(child) {
      child.field = true;
      return child;
    }

    let p = new Parent({ child: new Child({}) });
    assert.strictEqual(p.toJSON().child.field, true);

    p = new Parent({ child: new Child({}) });
    assert.strictEqual(p.child.toJSON().field, true);
  });

  it('enum validator for number (gh-8139)', function() {
    const schema = Schema({
      num: {
        type: Number,
        enum: [1, 2, 3]
      }
    });
    const Model = db.model('Test', schema);

    let doc = new Model({});
    let err = doc.validateSync();
    assert.ifError(err);

    doc = new Model({ num: 4 });
    err = doc.validateSync();
    assert.ok(err);
    assert.equal(err.errors['num'].name, 'ValidatorError');

    doc = new Model({ num: 2 });
    err = doc.validateSync();
    assert.ifError(err);
  });

  it('enum object syntax for number (gh-10648) (gh-8139)', function() {
    const schema = Schema({
      num: {
        type: Number,
        enum: {
          values: [1, 2, 3],
          message: 'Invalid number'
        }
      }
    });
    const Model = db.model('Test', schema);

    let doc = new Model({});
    let err = doc.validateSync();
    assert.ifError(err);

    doc = new Model({ num: 4 });
    err = doc.validateSync();
    assert.ok(err);
    assert.equal(err.errors['num'].name, 'ValidatorError');
    assert.equal(err.errors['num'].message, 'Invalid number');

    doc = new Model({ num: 2 });
    err = doc.validateSync();
    assert.ifError(err);
  });

  it('support `pathsToValidate()` option for `validate()` (gh-7587)', async function() {
    const schema = Schema({
      name: {
        type: String,
        required: true
      },
      age: {
        type: Number,
        required: true
      },
      rank: String
    });
    const Model = db.model('Test', schema);


    const doc = new Model({});

    let err = await doc.validate(['name', 'rank']).catch(err => err);
    assert.deepEqual(Object.keys(err.errors), ['name']);

    err = await doc.validate(['age', 'rank']).catch(err => err);
    assert.deepEqual(Object.keys(err.errors), ['age']);
  });

  it('array push with $position (gh-4322)', async function() {
    const schema = Schema({
      nums: [Number]
    });
    const Model = db.model('Test', schema);


    const doc = await Model.create({ nums: [3, 4] });

    doc.nums.push({
      $each: [1, 2],
      $position: 0
    });
    assert.deepEqual(doc.toObject().nums, [1, 2, 3, 4]);

    await doc.save();

    const fromDb = await Model.findOne({ _id: doc._id });
    assert.deepEqual(fromDb.toObject().nums, [1, 2, 3, 4]);

    doc.nums.push({
      $each: [0],
      $position: 0
    });
    assert.throws(() => {
      doc.nums.push({ $each: [5] });
    }, /Cannot call.*multiple times/);
    assert.throws(() => {
      doc.nums.push(5);
    }, /Cannot call.*multiple times/);
  });

  it('setting a path to a single nested document should update the single nested doc parent (gh-8400)', function() {
    const schema = Schema({
      name: String,
      subdoc: new Schema({
        name: String
      })
    });
    const Model = db.model('Test', schema);

    const doc1 = new Model({ name: 'doc1', subdoc: { name: 'subdoc1' } });
    const doc2 = new Model({ name: 'doc2', subdoc: { name: 'subdoc2' } });

    doc1.subdoc = doc2.subdoc;
    assert.equal(doc1.subdoc.name, 'subdoc2');
    assert.equal(doc2.subdoc.name, 'subdoc2');
    assert.strictEqual(doc1.subdoc.ownerDocument(), doc1);
    assert.strictEqual(doc2.subdoc.ownerDocument(), doc2);
  });

  it('setting an array to an array with some populated documents depopulates the whole array (gh-8443)', async function() {
    const A = db.model('Test1', Schema({
      name: String,
      rel: [{ type: mongoose.ObjectId, ref: 'Test' }]
    }));

    const B = db.model('Test', Schema({ name: String }));


    const b = await B.create({ name: 'testb' });
    await A.create({ name: 'testa', rel: [b._id] });

    const a = await A.findOne().populate('rel');

    const b2 = await B.create({ name: 'testb2' });
    a.rel = [a.rel[0], b2._id];
    await a.save();

    assert.ok(!a.populated('rel'));
    assert.ok(a.rel[0] instanceof mongoose.Types.ObjectId);
    assert.ok(a.rel[1] instanceof mongoose.Types.ObjectId);
  });

  it('handles errors with name set to "ValidationError" (gh-8466)', () => {
    const childSchema = Schema({ name: String });

    childSchema.pre('validate', function() {
      if (this.name === 'Invalid') {
        const error = new Error('invalid name');
        error.name = 'ValidationError';
        throw error;
      }
    });

    const fatherSchema = Schema({ children: [childSchema] });
    const Father = db.model('Test', fatherSchema);

    const doc = new Father({
      children: [{ name: 'Valid' }, { name: 'Invalid' }]
    });

    return doc.validate().then(() => assert.ok(false), err => {
      assert.ok(err);
      assert.ok(err.errors['children']);
      assert.equal(err.errors['children'].message, 'invalid name');
    });
  });

  it('throws an error if running validate() multiple times in parallel (gh-8468)', () => {
    const Model = db.model('Test', Schema({ name: String }));

    const doc = new Model({ name: 'test' });

    doc.validate();

    return doc.save().then(() => assert.ok(false), err => {
      assert.equal(err.name, 'ParallelValidateError');
    });
  });

  it('avoids parallel validate error when validating nested path with double nested subdocs (gh-8486)', async function() {
    const testSchema = new Schema({
      foo: {
        bar: Schema({
          baz: Schema({
            num: Number
          })
        })
      }
    });
    const Test = db.model('Test', testSchema);


    const doc = await Test.create({});

    doc.foo = {
      bar: {
        baz: {
          num: 1
        }
      }
    };

    // Should not throw
    await doc.save();

    const raw = await Test.collection.findOne();
    assert.equal(raw.foo.bar.baz.num, 1);
  });

  it('supports function for date min/max validator error (gh-8512)', function() {
    const schema = Schema({
      startDate: {
        type: Date,
        required: true,
        min: [new Date('2020-01-01'), () => 'test']
      }
    });

    db.deleteModel(/Test/);
    const Model = db.model('Test', schema);
    const doc = new Model({ startDate: new Date('2019-06-01') });

    const err = doc.validateSync();
    assert.ok(err.errors['startDate']);
    assert.equal(err.errors['startDate'].message, 'test');
  });

  it('sets parent and ownerDocument correctly with document array default (gh-8509)', async function() {
    const locationSchema = Schema({
      name: String,
      city: String
    });
    const owners = [];

    // Middleware to set a default location name derived from the parent organization doc
    locationSchema.pre('validate', function(next) {
      const owner = this.ownerDocument();
      owners.push(owner);
      if (this.isNew && !this.get('name') && owner.get('name')) {
        this.set('name', `${owner.get('name')} Office`);
      }
      next();
    });

    const organizationSchema = Schema({
      name: String,
      // Having a default doc this way causes issues
      locations: { type: [locationSchema], default: [{}] }
    });
    const Organization = db.model('Test', organizationSchema);

    const org = new Organization();
    org.set('name', 'MongoDB');

    await org.save();

    assert.equal(owners.length, 1);
    assert.ok(owners[0] === org);

    assert.equal(org.locations[0].name, 'MongoDB Office');
  });

  it('doesnt add `null` if property is undefined with minimize false (gh-8504)', async function() {
    const minimize = false;
    const schema = Schema({
      num: Number,
      beta: { type: String }
    },
    {
      toObject: { virtuals: true, minimize: minimize },
      toJSON: { virtuals: true, minimize: minimize }
    }
    );
    const Test = db.model('Test', schema);

    const dummy1 = new Test({ num: 1, beta: null });
    const dummy2 = new Test({ num: 2, beta: void 0 });


    await dummy1.save();
    await dummy2.save();

    const res = await Test.find().lean().sort({ num: 1 });

    assert.strictEqual(res[0].beta, null);
    assert.ok(!res[1].hasOwnProperty('beta'));
  });

  it('creates document array defaults in forward order, not reverse (gh-8514)', function() {
    let num = 0;
    const schema = Schema({
      arr: [{ val: { type: Number, default: () => ++num } }]
    });
    const Model = db.model('Test', schema);

    const doc = new Model({ arr: [{}, {}, {}] });
    assert.deepEqual(doc.toObject().arr.map(v => v.val), [1, 2, 3]);
  });

  it('can call subdocument validate multiple times in parallel (gh-8539)', async function() {
    const schema = Schema({
      arr: [{ val: String }],
      single: Schema({ val: String })
    });
    const Model = db.model('Test', schema);


    const doc = new Model({ arr: [{ val: 'test' }], single: { val: 'test' } });

    await Promise.all([doc.arr[0].validate(), doc.arr[0].validate()]);
    await Promise.all([doc.single.validate(), doc.single.validate()]);
  });

  it('sets `Document#op` when calling `validate()` (gh-8439)', function() {
    const schema = Schema({ name: String });
    const ops = [];
    schema.pre('validate', function() {
      ops.push(this.$op);
    });
    schema.post('validate', function() {
      ops.push(this.$op);
    });

    const Model = db.model('Test', schema);
    const doc = new Model({ name: 'test' });

    const promise = doc.validate();
    assert.equal(doc.$op, 'validate');

    return promise.then(() => assert.deepEqual(ops, ['validate', 'validate']));
  });

  it('schema-level transform (gh-8403)', function() {
    const schema = Schema({
      myDate: {
        type: Date,
        transform: v => v.getFullYear()
      },
      dates: [{
        type: Date,
        transform: v => v.getFullYear()
      }],
      arr: [{
        myDate: {
          type: Date,
          transform: v => v.getFullYear()
        }
      }]
    });
    const Model = db.model('Test', schema);

    const doc = new Model({
      myDate: new Date('2015/06/01'),
      dates: [new Date('2016/06/01')],
      arr: [{ myDate: new Date('2017/06/01') }]
    });
    assert.equal(doc.toObject({ transform: true }).myDate, '2015');
    assert.equal(doc.toObject({ transform: true }).dates[0], '2016');
    assert.equal(doc.toObject({ transform: true }).arr[0].myDate, '2017');
  });

  it('transforms nested paths (gh-9543)', function() {
    const schema = Schema({
      nested: {
        date: {
          type: Date,
          transform: v => v.getFullYear()
        }
      }
    });
    const Model = db.model('Test', schema);

    const doc = new Model({
      nested: {
        date: new Date('2020-06-01')
      }
    });
    assert.equal(doc.toObject({ transform: true }).nested.date, '2020');
  });

  it('handles setting numeric paths with single nested subdocs (gh-8583)', async function() {
    const placedItemSchema = Schema({ image: String }, { _id: false });

    const subdocumentSchema = Schema({
      placedItems: {
        1: placedItemSchema,
        first: placedItemSchema
      }
    });
    const Model = db.model('Test', subdocumentSchema);


    const doc = await Model.create({
      placedItems: { 1: { image: 'original' }, first: { image: 'original' } }
    });

    doc.set({
      'placedItems.1.image': 'updated',
      'placedItems.first.image': 'updated'
    });

    await doc.save();

    assert.equal(doc.placedItems['1'].image, 'updated');

    const fromDb = await Model.findById(doc);
    assert.equal(fromDb.placedItems['1'].image, 'updated');
  });

  it('setting nested array path to non-nested array wraps values top-down (gh-8544)', function() {
    const positionSchema = mongoose.Schema({
      coordinates: {
        type: [[Number]],
        required: true
      },
      lines: {
        type: [[[Number]]],
        required: true
      }
    });

    const Position = db.model('Test', positionSchema);
    const position = new Position();

    position.coordinates = [1, 2];
    position.lines = [3, 4];

    const obj = position.toObject();
    assert.deepEqual(obj.coordinates, [[1, 2]]);
    assert.deepEqual(obj.lines, [[[3, 4]]]);
  });

  it('doesnt wrap empty nested array with insufficient depth', function() {
    const weekSchema = mongoose.Schema({
      days: {
        type: [[[Number]]],
        required: true
      }
    });

    const Week = db.model('Test', weekSchema);
    const emptyWeek = new Week();

    emptyWeek.days = [[], [], [], [], [], [], []];
    const obj = emptyWeek.toObject();
    assert.deepEqual(obj.days, [[], [], [], [], [], [], []]);
  });

  it('doesnt wipe out nested keys when setting nested key to empty object with minimize (gh-8565)', function() {
    const opts = { autoIndex: false, autoCreate: false };
    const schema1 = Schema({ plaid: { nestedKey: String } }, opts);
    const schema2 = Schema({ plaid: { nestedKey: String } }, opts);
    const schema3 = Schema({ plaid: { nestedKey: String } }, opts);

    const Test1 = db.model('Test1', schema1);
    const Test2 = db.model('Test2', schema2);
    const Test3 = db.model('Test3', schema3);

    const doc1 = new Test1({});
    assert.deepEqual(doc1.toObject({ minimize: false }).plaid, {});

    const doc2 = new Test2({ plaid: doc1.plaid });
    assert.deepEqual(doc2.toObject({ minimize: false }).plaid, {});

    const doc3 = new Test3({});
    doc3.set({ plaid: doc2.plaid });
    assert.deepEqual(doc3.toObject({ minimize: false }).plaid, {});
  });

  it('allows calling `validate()` in post validate hook without causing parallel validation error (gh-8597)', async function() {
    const EmployeeSchema = Schema({
      name: String,
      employeeNumber: {
        type: String,
        validate: v => v.length > 5
      }
    });
    let called = 0;

    EmployeeSchema.post('validate', function() {
      ++called;
      if (!this.employeeNumber && !this._employeeNumberRetrieved) {
        this.employeeNumber = '123456';
        this._employeeNumberRetrieved = true;
        return this.validate();
      }
    });

    const Employee = db.model('Test', EmployeeSchema);


    const e = await Employee.create({ name: 'foo' });
    assert.equal(e.employeeNumber, '123456');
    assert.ok(e._employeeNumberRetrieved);
    assert.equal(called, 2);
  });

  it('sets defaults when setting single nested subdoc (gh-8603)', async function() {
    const nestedSchema = Schema({
      name: String,
      status: { type: String, default: 'Pending' }
    });

    const Test = db.model('Test', {
      nested: nestedSchema
    });


    let doc = await Test.create({ nested: { name: 'foo' } });
    assert.equal(doc.nested.status, 'Pending');

    doc = await Test.findById(doc);
    assert.equal(doc.nested.status, 'Pending');

    Object.assign(doc, { nested: { name: 'bar' } });
    assert.equal(doc.nested.status, 'Pending');
    await doc.save();

    doc = await Test.findById(doc);
    assert.equal(doc.nested.status, 'Pending');
  });

  it('handles validating single nested paths when specified in `pathsToValidate` (gh-8626)', function() {
    const nestedSchema = Schema({
      name: { type: String, validate: v => v.length > 2 },
      age: { type: Number, validate: v => v < 200 }
    });
    const schema = Schema({ nested: nestedSchema });

    mongoose.deleteModel(/Test/);
    const Model = mongoose.model('Test', schema);

    const doc = new Model({ nested: { name: 'a', age: 9001 } });
    return doc.validate(['nested.name']).then(() => assert.ok(false), err => {
      assert.ok(err.errors['nested.name']);
      assert.ok(!err.errors['nested.age']);
    });
  });

  it('copies immutable fields when constructing new doc from old doc (gh-8642)', function() {
    const schema = Schema({ name: { type: String, immutable: true } });
    const Model = db.model('Test', schema);

    const doc = new Model({ name: 'test' });
    doc.isNew = false;

    const newDoc = new Model(doc);
    assert.equal(newDoc.name, 'test');
  });

  it('can save nested array after setting (gh-8689)', async function() {
    const schema = new mongoose.Schema({
      name: String,
      array: [[{
        label: String,
        value: String
      }]]
    });
    const MyModel = db.model('Test', schema);


    const doc = await MyModel.create({ name: 'foo' });

    doc.set({
      'array.0': [{
        label: 'hello',
        value: 'world'
      }]
    });
    await doc.save();

    const updatedDoc = await MyModel.findOne({ _id: doc._id });
    assert.equal(updatedDoc.array[0][0].label, 'hello');
    assert.equal(updatedDoc.array[0][0].value, 'world');
  });

  it('handles validator errors on subdoc paths (gh-5226)', function() {
    const schema = Schema({
      child: {
        type: Schema({ name: String }),
        validate: () => false
      },
      children: {
        type: [{ name: String }],
        validate: () => false
      }
    });
    const Model = db.model('Test', schema);

    const doc = new Model({ child: {}, children: [] });
    return doc.validate().then(() => assert.ok(false), err => {
      assert.ok(err);
      assert.ok(err.errors);
      assert.ok(err.errors.child);
      assert.ok(err.errors.children);
    });
  });

  it('reports array cast error with index (gh-8888)', function() {
    const schema = Schema({ test: [Number] },
      { autoIndex: false, autoCreate: false });
    const Test = db.model('test', schema);

    const t = new Test({ test: [1, 'world'] });
    const err = t.validateSync();
    assert.ok(err);
    assert.ok(err.errors);
    assert.ok(err.errors['test.1']);
  });

  it('sets defaults if setting nested path to empty object with minimize false (gh-8829)', function() {
    const cartSchema = Schema({
      _id: 'String',
      item: {
        name: { type: 'String', default: 'Default Name' }
      }
    },
    { minimize: false });
    const Test = db.model('Test', cartSchema);

    const doc = new Test({ _id: 'foobar', item: {} });

    return doc.save().
      then(() => Test.collection.findOne()).
      then(doc => assert.equal(doc.item.name, 'Default Name'));
  });

  it('clears cast errors when setting an array subpath (gh-9080)', function() {
    const userSchema = new Schema({ tags: [Schema.ObjectId] });
    const User = db.model('User', userSchema);

    const user = new User({ tags: ['hey'] });
    user.tags = [];

    const err = user.validateSync();
    assert.ifError(err);
  });

  it('saves successfully if you splice() a sliced array (gh-9011)', async function() {
    const childSchema = Schema({ values: [Number] });
    const parentSchema = Schema({ children: [childSchema] });

    const Parent = db.model('Parent', parentSchema);


    await Parent.create({
      children: [
        { values: [1, 2, 3] },
        { values: [4, 5, 6] }
      ]
    });

    const parent = await Parent.findOne();
    const copy = parent.children[0].values.slice();
    copy.splice(1);

    await parent.save();
    const _parent = await Parent.findOne();
    assert.deepEqual(_parent.toObject().children[0].values, [1, 2, 3]);
  });

  it('handles modifying a subpath of a nested array of documents (gh-8926)', async function() {
    const bookSchema = new Schema({ title: String });
    const aisleSchema = new Schema({
      shelves: [[bookSchema]]
    });
    const librarySchema = new Schema({ aisles: [aisleSchema] });

    const Library = db.model('Test', librarySchema);


    await Library.create({
      aisles: [{ shelves: [[{ title: 'Clean Code' }]] }]
    });

    const library = await Library.findOne();
    library.aisles[0].shelves[0][0].title = 'Refactoring';
    await library.save();

    const foundLibrary = await Library.findOne().lean();
    assert.equal(foundLibrary.aisles[0].shelves[0][0].title, 'Refactoring');
  });

  it('Document#save accepts `timestamps` option (gh-8947) for update', async function() {

    // Arrange
    const userSchema = new Schema({ name: String }, { timestamps: true });
    const User = db.model('User', userSchema);

    const createdUser = await User.create({ name: 'Hafez' });

    const user = await User.findOne({ _id: createdUser._id });

    // Act
    user.name = 'John';
    await user.save({ timestamps: false });

    // Assert
    assert.deepEqual(createdUser.updatedAt, user.updatedAt);
  });

  it('Document#save accepts `timestamps` option (gh-8947) on inserting a new document', async function() {

    // Arrange
    const userSchema = new Schema({ name: String }, { timestamps: true });
    const User = db.model('User', userSchema);

    const user = new User({ name: 'Hafez' });

    // Act
    await user.save({ timestamps: false });

    // Assert
    assert.ok(!user.createdAt);
    assert.ok(!user.updatedAt);
  });

  it('Sets default when passing undefined as value for a key in a nested subdoc (gh-12102) (gh-9039)', async function() {
    const Test = db.model('Test', {
      nested: {
        prop: {
          type: String,
          default: 'some default value'
        }
      }
    });

    const obj = { nested: { prop: undefined } };
    const doc = await Test.create(obj);
    assert.equal(doc.nested.prop, 'some default value');

    assert.deepStrictEqual(obj, { nested: { prop: undefined } });
  });

  it('allows accessing $locals when initializing (gh-9098)', function() {
    const personSchema = new mongoose.Schema({
      name: {
        first: String,
        last: String
      }
    });

    personSchema.virtual('fullName').
      get(function() { return this.$locals.fullName; }).
      set(function(newFullName) { this.$locals.fullName = newFullName; });

    const Person = db.model('Person', personSchema);

    const axl = new Person({ fullName: 'Axl Rose' });
    assert.equal(axl.fullName, 'Axl Rose');
  });

  describe('Document#getChanges(...) (gh-9096)', function() {
    it('returns an empty object when there are no changes', async function() {

      const User = db.model('User', { name: String, age: Number, country: String });
      const user = await User.create({ name: 'Hafez', age: 25, country: 'Egypt' });

      const changes = user.getChanges();
      assert.deepEqual(changes, {});
    });

    it('returns only the changed paths', async function() {

      const User = db.model('User', { name: String, age: Number, country: String });
      const user = await User.create({ name: 'Hafez', age: 25, country: 'Egypt' });

      user.country = undefined;
      user.age = 26;

      const changes = user.getChanges();
      assert.deepEqual(changes, { $set: { age: 26 }, $unset: { country: 1 } });
    });
  });

  it('supports skipping defaults on a document (gh-8271)', function() {
    const testSchema = new mongoose.Schema({
      testTopLevel: { type: String, default: 'foo' },
      testNested: {
        prop: { type: String, default: 'bar' }
      },
      testArray: [{ prop: { type: String, default: 'baz' } }],
      testSingleNested: new Schema({
        prop: { type: String, default: 'qux' }
      })
    });
    const Test = db.model('Test', testSchema);

    const doc = new Test({ testArray: [{}], testSingleNested: {} }, null,
      { defaults: false });
    assert.ok(!doc.testTopLevel);
    assert.ok(!doc.testNested.prop);
    assert.ok(!doc.testArray[0].prop);
    assert.ok(!doc.testSingleNested.prop);
  });

  it('throws an error when `transform` returns a promise (gh-9163)', function() {
    const userSchema = new Schema({
      name: {
        type: String,
        transform: function() {
          return new Promise(() => {});
        }
      }
    });

    const User = db.model('User', userSchema);

    const user = new User({ name: 'Hafez' });
    assert.throws(function() {
      user.toJSON();
    }, /must be synchronous/);

    assert.throws(function() {
      user.toObject();
    }, /must be synchronous/);
  });

  it('uses strict equality when checking mixed paths for modifications (gh-9165)', function() {
    const schema = Schema({ obj: {} });
    const Model = db.model('gh9165', schema);

    return Model.create({ obj: { key: '2' } }).
      then(doc => {
        doc.obj = { key: 2 };
        assert.ok(doc.modifiedPaths().indexOf('obj') !== -1);
        return doc.save();
      }).
      then(doc => Model.findById(doc)).
      then(doc => assert.strictEqual(doc.obj.key, 2));
  });

  it('supports `useProjection` option for `toObject()` (gh-9118)', function() {
    const authorSchema = new mongoose.Schema({
      name: String,
      hiddenField: { type: String, select: false }
    });

    const Author = db.model('Author', authorSchema);

    const example = new Author({ name: 'John', hiddenField: 'A secret' });
    assert.strictEqual(example.toJSON({ useProjection: true }).hiddenField, void 0);
  });

  it('clears out priorDoc after overwriting single nested subdoc (gh-9208)', async function() {
    const TestModel = db.model('Test', Schema({
      nested: Schema({
        myBool: Boolean,
        myString: String
      })
    }));


    const test = new TestModel();

    test.nested = { myBool: true };
    await test.save();

    test.nested = { myString: 'asdf' };
    await test.save();

    test.nested.myBool = true;
    await test.save();

    const doc = await TestModel.findById(test);
    assert.strictEqual(doc.nested.myBool, true);
  });

  it('handles immutable properties underneath single nested subdocs when overwriting (gh-9281)', async function() {
    const SubSchema = Schema({
      nestedProp: {
        type: String,
        immutable: true
      }
    }, { strict: 'throw' });

    const TestSchema = Schema({ object: SubSchema }, { strict: 'throw' });
    const Test = db.model('Test', TestSchema);


    await Test.create({ object: { nestedProp: 'A' } });
    const doc = await Test.findOne();

    doc.object = {};
    const err = await doc.save().then(() => null, err => err);

    assert.ok(err);
    assert.ok(err.errors['object']);
    assert.ok(err.message.includes('Path `nestedProp` is immutable'), err.message);

    // Setting to the same value as the previous doc is ok.
    doc.object = { nestedProp: 'A' };
    await doc.save();
  });

  it('allows removing boolean key by setting it to `undefined` (gh-9275)', async function() {
    const Test = db.model('Test', Schema({ a: Boolean }));


    const doc = await Test.create({ a: true });
    doc.a = undefined;
    await doc.save();

    const fromDb = await Test.findOne().lean();
    assert.ok(!('a' in fromDb));
  });

  it('keeps manually populated paths when setting a nested path to itself (gh-9293)', async function() {
    const StepSchema = Schema({
      ride: { type: ObjectId, ref: 'Ride' },
      status: Number
    });

    const RideSchema = Schema({
      status: Number,
      steps: {
        taxi: [{ type: ObjectId, ref: 'Step' }],
        rent: [{ type: ObjectId, ref: 'Step' }],
        vehicle: [{ type: ObjectId, ref: 'Step' }]
      }
    });

    const Step = db.model('Step', StepSchema);
    const Ride = db.model('Ride', RideSchema);


    let ride = await Ride.create({ status: 0 });
    const steps = await Step.create([
      { ride: ride, status: 0 },
      { ride: ride, status: 1 },
      { ride: ride, status: 2 }
    ]);

    ride.steps = { taxi: [steps[0]], rent: [steps[1]], vehicle: [steps[2]] };
    await ride.save();

    ride = await Ride.findOne({}).populate('steps.taxi steps.vehicle steps.rent');

    assert.equal(ride.steps.taxi[0].status, 0);
    assert.equal(ride.steps.rent[0].status, 1);
    assert.equal(ride.steps.vehicle[0].status, 2);

    ride.steps = ride.steps;
    assert.equal(ride.steps.taxi[0].status, 0);
    assert.equal(ride.steps.rent[0].status, 1);
    assert.equal(ride.steps.vehicle[0].status, 2);
  });

  it('doesnt wipe out nested paths when setting a nested path to itself (gh-9313)', async function() {
    const schema = new Schema({
      nested: {
        prop1: { type: Number, default: 50 },
        prop2: {
          type: String,
          enum: ['val1', 'val2'],
          default: 'val1',
          required: true
        },
        prop3: {
          prop4: { type: Number, default: 0 }
        }
      }
    });

    const Model = db.model('Test', schema);


    let doc = await Model.create({});

    doc = await Model.findById(doc);

    doc.nested = doc.nested;

    assert.equal(doc.nested.prop2, 'val1');
    await doc.save();

    const fromDb = await Model.collection.findOne({ _id: doc._id });
    assert.equal(fromDb.nested.prop2, 'val1');
  });

  it('allows saving after setting document array to itself (gh-9266)', async function() {
    const Model = db.model('Test', Schema({ keys: [{ _id: false, name: String }] }));


    const document = new Model({});

    document.keys[0] = { name: 'test' };
    document.keys = document.keys;

    await document.save();

    const fromDb = await Model.findOne();
    assert.deepEqual(fromDb.toObject().keys, [{ name: 'test' }]);
  });

  it('allows accessing document values from function default on array (gh-9351) (gh-6155)', function() {
    const schema = Schema({
      publisher: String,
      authors: {
        type: [String],
        default: function() {
          return [this.publisher];
        }
      }
    });
    const Test = db.model('Test', schema);

    const doc = new Test({ publisher: 'Mastering JS' });
    assert.deepEqual(doc.toObject().authors, ['Mastering JS']);
  });

  it('handles pulling array subdocs when _id is an alias (gh-9319)', async function() {
    const childSchema = Schema({
      field: {
        type: String,
        alias: '_id'
      }
    }, { _id: false });

    const parentSchema = Schema({ children: [childSchema] });
    const Parent = db.model('Parent', parentSchema);


    await Parent.create({ children: [{ field: '1' }] });
    const p = await Parent.findOne();

    p.children.pull('1');
    await p.save();

    assert.equal(p.children.length, 0);

    const fromDb = await Parent.findOne();
    assert.equal(fromDb.children.length, 0);
  });

  it('allows setting nested path to instance of model (gh-9392)', function() {
    const def = { test: String };
    const Child = db.model('Child', def);

    const Parent = db.model('Parent', { nested: def });

    const c = new Child({ test: 'new' });

    const p = new Parent({ nested: { test: 'old' } });
    p.nested = c;

    assert.equal(p.nested.test, 'new');
  });

  it('unmarks modified if setting a value to the same value as it was previously (gh-9396)', async function() {
    const schema = new Schema({
      bar: String
    });

    const Test = db.model('Test', schema);

    const foo = new Test({ bar: 'bar' });
    await foo.save();
    assert.ok(!foo.isModified('bar'));

    foo.bar = 'baz';
    assert.ok(foo.isModified('bar'));

    foo.bar = 'bar';
    assert.ok(!foo.isModified('bar'));
  });

  it('unmarks modified if setting a value to the same subdoc as it was previously (gh-9396)', async function() {
    const schema = new Schema({
      nested: { bar: String },
      subdoc: new Schema({ bar: String }, { _id: false })
    });
    const Test = db.model('Test', schema);


    const foo = new Test({ nested: { bar: 'bar' }, subdoc: { bar: 'bar' } });
    await foo.save();
    assert.ok(!foo.isModified('nested'));
    assert.ok(!foo.isModified('subdoc'));

    foo.nested = { bar: 'baz' };
    foo.subdoc = { bar: 'baz' };
    assert.ok(foo.isModified('nested'));
    assert.ok(foo.isModified('subdoc'));

    foo.nested = { bar: 'bar' };
    foo.subdoc = { bar: 'bar' };
    assert.ok(!foo.isModified('nested'));
    assert.ok(!foo.isModified('subdoc'));
    assert.ok(!foo.isModified('subdoc.bar'));

    foo.nested = { bar: 'baz' };
    foo.subdoc = { bar: 'baz' };
    assert.ok(foo.isModified('nested'));
    assert.ok(foo.isModified('subdoc'));
    await foo.save();

    foo.nested = { bar: 'bar' };
    foo.subdoc = { bar: 'bar' };
    assert.ok(foo.isModified('nested'));
    assert.ok(foo.isModified('subdoc'));
    assert.ok(foo.isModified('subdoc.bar'));
  });

  it('correctly tracks saved state for deeply nested objects (gh-10773) (gh-9396)', async function() {
    const PaymentSchema = Schema({ status: String }, { _id: false });
    const OrderSchema = new Schema({
      status: String,
      payments: {
        payout: PaymentSchema
      }
    });

    const Order = db.model('Order', OrderSchema);

    const order = new Order({
      status: 'unpaid',
      payments: {
        payout: {
          status: 'unpaid'
        }
      }
    });

    await order.save();

    const newPaymentsStatus = Object.assign({}, order.payments);

    newPaymentsStatus.payout.status = 'paid';

    order.payments = newPaymentsStatus;
    assert.ok(order.isModified('payments'));

    await order.save();

    const fromDb = await Order.findById(order._id).lean();
    assert.equal(fromDb.payments.payout.status, 'paid');
  });

  it('marks path as errored if default function throws (gh-9408)', function() {
    const jobSchema = new Schema({
      deliveryAt: Date,
      subJob: [{
        deliveryAt: Date,
        shippingAt: {
          type: Date,
          default: () => { throw new Error('Oops!'); }
        },
        prop: { type: String, default: 'default' }
      }]
    });

    const Job = db.model('Test', jobSchema);

    const doc = new Job({ subJob: [{ deliveryAt: new Date() }] });
    assert.equal(doc.subJob[0].prop, 'default');
  });

  it('passes subdoc with initial values set to default function when init-ing (gh-9408)', function() {
    const jobSchema = new Schema({
      deliveryAt: Date,
      subJob: [{
        deliveryAt: Date,
        shippingAt: {
          type: Date,
          default: function() {
            return this.deliveryAt;
          }
        }
      }]
    });

    const Job = db.model('Test', jobSchema);

    const date = new Date();
    const doc = new Job({ subJob: [{ deliveryAt: date }] });

    assert.equal(doc.subJob[0].shippingAt.valueOf(), date.valueOf());
  });

  it('passes document as an argument for `required` function in schema definition (gh-9433)', function() {
    let docFromValidation;

    const userSchema = new Schema({
      name: {
        type: String,
        required: (doc) => {
          docFromValidation = doc;
          return doc.age > 18;
        }
      },
      age: Number
    });

    const User = db.model('User', userSchema);
    const user = new User({ age: 26 });
    const err = user.validateSync();
    assert.ok(err);

    assert.ok(docFromValidation === user);
  });

  it('works with path named isSelected (gh-9438)', function() {
    const categorySchema = new Schema({
      name: String,
      categoryUrl: { type: String, required: true }, // Makes test fail
      isSelected: Boolean
    });

    const siteSchema = new Schema({ categoryUrls: [categorySchema] });

    const Test = db.model('Test', siteSchema);
    const test = new Test({
      categoryUrls: [
        { name: 'A', categoryUrl: 'B', isSelected: false, isModified: false }
      ]
    });
    const err = test.validateSync();
    assert.ifError(err);
  });

  it('init tracks cast error reason (gh-9448)', function() {
    const Test = db.model('Test', Schema({
      num: Number
    }));

    const doc = new Test();
    doc.init({ num: 'not a number' });

    const err = doc.validateSync();
    assert.ok(err.errors['num'].reason);
  });

  it('correctly handles setting nested path underneath single nested subdocs (gh-9459)', function() {
    const preferencesSchema = mongoose.Schema({
      notifications: {
        email: Boolean,
        push: Boolean
      },
      keepSession: Boolean
    }, { _id: false });

    const User = db.model('User', Schema({
      email: String,
      username: String,
      preferences: preferencesSchema
    }));

    const userFixture = {
      email: 'foo@bar.com',
      username: 'foobars',
      preferences: {
        keepSession: true,
        notifications: {
          email: false,
          push: false
        }
      }
    };

    let userWithEmailNotifications = Object.assign({}, userFixture, {
      'preferences.notifications': { email: true }
    });
    let testUser = new User(userWithEmailNotifications);

    assert.deepEqual(testUser.toObject().preferences.notifications, { email: true });

    userWithEmailNotifications = Object.assign({}, userFixture, {
      'preferences.notifications.email': true
    });
    testUser = new User(userWithEmailNotifications);

    assert.deepEqual(testUser.toObject().preferences.notifications, { email: true, push: false });
  });

  it('$isValid() with space-delimited and array syntax (gh-9474)', function() {
    const Test = db.model('Test', Schema({
      name: String,
      email: String,
      age: Number,
      answer: Number
    }));

    const doc = new Test({ name: 'test', email: 'test@gmail.com', age: 'bad', answer: 'bad' });

    assert.ok(doc.$isValid('name'));
    assert.ok(doc.$isValid('email'));
    assert.ok(!doc.$isValid('age'));
    assert.ok(!doc.$isValid('answer'));

    assert.ok(doc.$isValid('name email'));
    assert.ok(doc.$isValid('name age'));
    assert.ok(!doc.$isValid('age answer'));

    assert.ok(doc.$isValid(['name', 'email']));
    assert.ok(doc.$isValid(['name', 'age']));
    assert.ok(!doc.$isValid(['age', 'answer']));
  });

  it('avoids overwriting array subdocument when setting dotted path that is not selected (gh-9427)', async function() {
    const Test = db.model('Test', Schema({
      arr: [{ _id: false, val: Number }],
      name: String,
      age: Number
    }));


    let doc = await Test.create({
      name: 'Test',
      arr: [{ val: 1 }, { val: 2 }],
      age: 30
    });

    doc = await Test.findById(doc._id).select('name');
    doc.set('arr.0.val', 2);
    await doc.save();

    const fromDb = await Test.findById(doc._id);
    assert.deepEqual(fromDb.toObject().arr, [{ val: 2 }, { val: 2 }]);
  });

  it('ignore getters when diffing objects for change tracking (gh-9501)', async function() {
    const schema = new Schema({
      title: {
        type: String,
        required: true
      },
      price: {
        type: Number,
        min: 0
      },
      taxPercent: {
        type: Number,
        required: function() {
          return this.price != null;
        },
        min: 0,
        max: 100,
        get: value => value || 10
      }
    });

    const Test = db.model('Test', schema);


    const doc = await Test.create({
      title: 'original'
    });

    doc.set({
      title: 'updated',
      price: 10,
      taxPercent: 10
    });

    assert.ok(doc.modifiedPaths().indexOf('taxPercent') !== -1);

    await doc.save();

    const fromDb = await Test.findById(doc).lean();
    assert.equal(fromDb.taxPercent, 10);
  });

  it('allows defining middleware for all document hooks using regexp (gh-9190)', async function() {
    const schema = Schema({ name: String });

    let called = 0;
    schema.pre(/.*/, { document: true, query: false }, function() {
      ++called;
    });
    const Model = db.model('Test', schema);


    await Model.find();
    assert.equal(called, 0);

    await Model.findOne();
    assert.equal(called, 0);

    await Model.countDocuments();
    assert.equal(called, 0);

    const docs = await Model.create([{ name: 'test' }], { validateBeforeSave: false });
    assert.equal(called, 1);

    await docs[0].validate();
    assert.equal(called, 2);

    await docs[0].updateOne({ name: 'test2' });
    assert.equal(called, 3);

    await Model.aggregate([{ $match: { name: 'test' } }]);
    assert.equal(called, 3);
  });

  it('correctly handles setting nested props to other nested props (gh-9519)', async function() {
    const schemaA = Schema({
      propX: {
        nested1: { prop: Number },
        nested2: { prop: Number },
        nested3: { prop: Number }
      },
      propY: {
        nested1: { prop: Number },
        nested2: { prop: Number },
        nested3: { prop: Number }
      }
    });

    const schemaB = Schema({ prop: { prop: Number } });

    const ModelA = db.model('Test1', schemaA);
    const ModelB = db.model('Test2', schemaB);


    const saved = await ModelA.create({
      propX: {
        nested1: { prop: 1 },
        nested2: { prop: 1 },
        nested3: { prop: 1 }
      },
      propY: {
        nested1: { prop: 2 },
        nested2: { prop: 2 },
        nested3: { prop: 2 }
      }
    });

    const objA = await ModelA.findById(saved._id);
    const objB = new ModelB();

    objB.prop = objA.propX.nested1;

    assert.strictEqual(objB.prop.prop, 1);
  });

  it('sets fields after an undefined field (gh-9585)', function() {
    const personSchema = new Schema({
      items: { type: Array },
      email: { type: String }
    });

    const Person = db.model('Person', personSchema);


    const person = new Person({ items: undefined, email: 'test@gmail.com' });
    assert.equal(person.email, 'test@gmail.com');
  });

  it('passes document to `default` functions (gh-9633)', function() {
    let documentFromDefault;
    const userSchema = new Schema({
      name: { type: String },
      age: {
        type: Number,
        default: function(doc) {
          documentFromDefault = doc;
        }
      }

    });

    const User = db.model('User', userSchema);

    const user = new User({ name: 'Hafez' });

    assert.ok(documentFromDefault === user);
    assert.equal(documentFromDefault.name, 'Hafez');
  });

  it('handles pre hook throwing a sync error (gh-9659)', async function() {
    const TestSchema = new Schema({ name: String });

    TestSchema.pre('save', function() {
      throw new Error('test err');
    });
    const TestModel = db.model('Test', TestSchema);


    const testObject = new TestModel({ name: 't' });

    const err = await testObject.save().then(() => null, err => err);
    assert.ok(err);
    assert.equal(err.message, 'test err');
  });

  it('returns undefined rather than entire object when calling `get()` with empty string (gh-9681)', function() {
    const TestSchema = new Schema({ name: String });
    const TestModel = db.model('Test', TestSchema);

    const testObject = new TestModel({ name: 't' });

    assert.strictEqual(testObject.get(''), void 0);
  });

  it('keeps atomics when assigning array to filtered array (gh-9651)', async function() {
    const Model = db.model('Test', { arr: [{ abc: String }] });


    const m1 = new Model({ arr: [{ abc: 'old' }] });
    await m1.save();

    const m2 = await Model.findOne({ _id: m1._id });

    m2.arr = [];
    m2.arr = m2.arr.filter(() => true);
    m2.arr.push({ abc: 'ghi' });
    await m2.save();

    const fromDb = await Model.findById(m1._id);
    assert.equal(fromDb.arr.length, 1);
    assert.equal(fromDb.arr[0].abc, 'ghi');
  });

  it('does not pass doc to ObjectId or Date.now (gh-9633) (gh-9636)', function() {
    const userSchema = new Schema({
      parentId: { type: Schema.ObjectId, ref: 'User', default: () => new mongoose.Types.ObjectId() },
      createdAt: { type: Date, default: Date.now }
    });

    const User = db.model('User', userSchema);

    const user = new User();

    assert.ok(user.parentId instanceof mongoose.Types.ObjectId);
    assert.ok(user.createdAt instanceof Date);
  });

  it('supports getting a list of populated docs (gh-9702)', async function() {
    const Child = db.model('Child', Schema({ name: String }));
    const Parent = db.model('Parent', {
      children: [{ type: ObjectId, ref: 'Child' }],
      child: { type: ObjectId, ref: 'Child' }
    });


    const c = await Child.create({ name: 'test' });
    await Parent.create({
      children: [c._id],
      child: c._id
    });

    const p = await Parent.findOne();
    await p.populate('children');
    await p.populate('child');

    p.children; // [{ _id: '...', name: 'test' }]

    assert.equal(p.$getPopulatedDocs().length, 2);
    assert.equal(p.$getPopulatedDocs()[0], p.children[0]);
    assert.equal(p.$getPopulatedDocs()[0].name, 'test');
    assert.equal(p.$getPopulatedDocs()[1], p.child);
    assert.equal(p.$getPopulatedDocs()[1].name, 'test');
  });

  it('with virtual populate (gh-10148)', async function() {
    const childSchema = Schema({ name: String, parentId: 'ObjectId' });
    childSchema.virtual('parent', {
      ref: 'Parent',
      localField: 'parentId',
      foreignField: '_id',
      justOne: true
    });
    const Child = db.model('Child', childSchema);

    const Parent = db.model('Parent', Schema({ name: String }));


    const p = await Parent.create({ name: 'Anakin' });
    await Child.create({ name: 'Luke', parentId: p._id });

    const res = await Child.findOne().populate('parent');
    assert.equal(res.parent.name, 'Anakin');
    const docs = res.$getPopulatedDocs();
    assert.equal(docs.length, 1);
    assert.equal(docs[0].name, 'Anakin');
  });

  it('handles paths named `db` (gh-9798)', async function() {
    const schema = new Schema({
      db: String
    });
    const Test = db.model('Test', schema);


    const doc = await Test.create({ db: 'foo' });
    doc.db = 'bar';
    await doc.save();
    await doc.deleteOne();

    const _doc = await Test.findOne({ db: 'bar' });
    assert.ok(!_doc);
  });

  it('handles paths named `schema` gh-8798', async function() {
    const schema = new Schema({
      schema: String,
      name: String
    });
    const Test = db.model('Test', schema);


    const doc = await Test.create({ schema: 'test', name: 'test' });
    await doc.save();
    assert.ok(doc);
    assert.equal(doc.schema, 'test');
    assert.equal(doc.name, 'test');

    const fromDb = await Test.findById(doc);
    assert.equal(fromDb.schema, 'test');
    assert.equal(fromDb.name, 'test');

    doc.schema = 'test2';
    await doc.save();

    await fromDb.deleteOne();
    doc.name = 'test3';
    const err = await doc.save().then(() => null, err => err);
    assert.ok(err);
    assert.equal(err.name, 'DocumentNotFoundError');
  });

  it('handles nested paths named `schema` gh-8798', async function() {
    const schema = new Schema({
      nested: {
        schema: String
      },
      name: String
    });
    const Test = db.model('Test', schema);


    const doc = await Test.create({ nested: { schema: 'test' }, name: 'test' });
    await doc.save();
    assert.ok(doc);
    assert.equal(doc.nested.schema, 'test');
    assert.equal(doc.name, 'test');

    const fromDb = await Test.findById(doc);
    assert.equal(fromDb.nested.schema, 'test');
    assert.equal(fromDb.name, 'test');

    doc.nested.schema = 'test2';
    await doc.save();
  });

  it('object setters will be applied for each object in array after populate (gh-9838)', async function() {
    const updatedElID = '123456789012345678901234';

    const ElementSchema = new Schema({
      name: 'string',
      nested: [{ type: Schema.Types.ObjectId, ref: 'Nested' }]
    });

    const NestedSchema = new Schema({});

    const Element = db.model('Test', ElementSchema);
    const NestedElement = db.model('Nested', NestedSchema);


    const nes = new NestedElement({});
    await nes.save();
    const ele = new Element({ nested: [nes.id], name: 'test' });
    await ele.save();

    const ss = await Element.findById(ele._id).populate({ path: 'nested', model: NestedElement });
    ss.nested = [updatedElID];
    await ss.save();

    assert.ok(typeof ss.nested[0] !== 'string');
    assert.equal(ss.nested[0].toHexString(), updatedElID);
  });
  it('gh9884', async function() {


    const obi = new Schema({
      eType: {
        type: String,
        required: true,
        uppercase: true
      },
      eOrigin: {
        type: String,
        required: true
      },
      eIds: [
        {
          type: String
        }
      ]
    }, { _id: false });

    const schema = new Schema({
      name: String,
      description: String,
      isSelected: {
        type: Boolean,
        default: false
      },
      wan: {
        type: [obi],
        default: undefined,
        required: true
      }
    });

    const newDoc = {
      name: 'name',
      description: 'new desc',
      isSelected: true,
      wan: [
        {
          eType: 'X',
          eOrigin: 'Y',
          eIds: ['Y', 'Z']
        }
      ]
    };

    const Model = db.model('Test', schema);
    await Model.create(newDoc);
    const doc = await Model.findOne();
    assert.ok(doc);
  });

  it('Makes sure pre remove hook is executed gh-9885', async function() {
    const SubSchema = new Schema({
      myValue: {
        type: String
      }
    }, {});
    let count = 0;
    SubSchema.pre('deleteOne', { document: true, query: false }, function(next) {
      count++;
      next();
    });
    const thisSchema = new Schema({
      foo: {
        type: String,
        required: true
      },
      mySubdoc: {
        type: [SubSchema],
        required: true
      }
    }, { minimize: false, collection: 'test' });

    const Model = db.model('TestModel', thisSchema);

    await Model.deleteMany({}); // remove all existing documents
    const newModel = {
      foo: 'bar',
      mySubdoc: [{ myValue: 'some value' }]
    };
    const document = await Model.create(newModel);
    document.mySubdoc[0].deleteOne();
    await document.save().catch((error) => {
      console.error(error);
    });
    assert.equal(count, 1);
  });

  it('gh9880', async function() {
    const testSchema = new Schema({
      prop: String,
      nestedProp: {
        prop: String
      }
    });
    const Test = db.model('Test', testSchema);

    const doc = await new Test({
      prop: 'Test',
      nestedProp: null
    }).save();

    doc.id;
    doc.nestedProp;

    new Test({
      prop: 'Test 2',
      nestedProp: doc.nestedProp
    });

    await Test.updateOne({
      _id: doc._id
    }, {
      nestedProp: null
    });

    const updatedDoc = await Test.findOne({
      _id: doc._id
    });

    new Test({
      prop: 'Test 3',
      nestedProp: updatedDoc.nestedProp
    });
  });

  it('handles directly setting embedded document array element with projection (gh-9909)', async function() {
    const schema = Schema({
      elements: [{
        text: String,
        subelements: [{
          text: String
        }]
      }]
    });

    const Test = db.model('Test', schema);


    let doc = await Test.create({ elements: [{ text: 'hello' }] });
    doc = await Test.findById(doc).select('elements');

    doc.elements[0].subelements[0] = { text: 'my text' };
    await doc.save();

    const fromDb = await Test.findById(doc).lean();
    assert.equal(fromDb.elements.length, 1);
    assert.equal(fromDb.elements[0].subelements.length, 1);
    assert.equal(fromDb.elements[0].subelements[0].text, 'my text');
  });

  it('toObject() uses child schema `flattenMaps` option by default (gh-9995)', async function() {
    const MapSchema = new Schema({
      value: { type: Number }
    }, { _id: false });

    const ChildSchema = new Schema({
      map: { type: Map, of: MapSchema }
    });
    ChildSchema.set('toObject', { flattenMaps: true });

    const ParentSchema = new Schema({
      child: { type: Schema.ObjectId, ref: 'Child' }
    });

    const ChildModel = db.model('Child', ChildSchema);
    const ParentModel = db.model('Parent', ParentSchema);


    const childDocument = new ChildModel({
      map: { first: { value: 1 }, second: { value: 2 } }
    });
    await childDocument.save();

    const parentDocument = new ParentModel({ child: childDocument });
    await parentDocument.save();

    const resultDocument = await ParentModel.findOne().populate('child').exec();

    let resultObject = resultDocument.toObject();
    assert.ok(resultObject.child.map);
    assert.ok(!(resultObject.child.map instanceof Map));

    resultObject = resultDocument.toObject({ flattenMaps: false });
    assert.ok(resultObject.child.map instanceof Map);
  });

  it('does not double validate paths under mixed objects (gh-10141)', async function() {
    let validatorCallCount = 0;
    const Test = db.model('Test', Schema({
      name: String,
      object: {
        type: Object,
        validate: () => {
          validatorCallCount++;
          return true;
        }
      }
    }));


    const doc = await Test.create({ name: 'test', object: { answer: 42 } });

    validatorCallCount = 0;
    doc.set('object.question', 'secret');
    doc.set('object.answer', 0);
    await doc.validate();
    assert.equal(validatorCallCount, 0);
  });

  it('clears child document modified when setting map path underneath single nested (gh-10295)', async function() {
    const SecondMapSchema = new mongoose.Schema({
      data: { type: Map, of: Number, default: {}, _id: false }
    });

    const FirstMapSchema = new mongoose.Schema({
      data: { type: Map, of: SecondMapSchema, default: {}, _id: false }
    });

    const NestedSchema = new mongoose.Schema({
      data: { type: Map, of: SecondMapSchema, default: {}, _id: false }
    });

    const TestSchema = new mongoose.Schema({
      _id: Number,
      firstMap: { type: Map, of: FirstMapSchema, default: {}, _id: false },
      nested: { type: NestedSchema, default: {}, _id: false }
    });

    const Test = db.model('Test', TestSchema);


    const doc = await Test.create({ _id: Date.now() });

    doc.nested.data.set('second', {});
    assert.ok(doc.modifiedPaths().indexOf('nested.data.second') !== -1, doc.modifiedPaths());
    await doc.save();

    doc.nested.data.get('second').data.set('final', 3);
    assert.ok(doc.modifiedPaths().indexOf('nested.data.second.data.final') !== -1, doc.modifiedPaths());
    await doc.save();

    const fromDb = await Test.findById(doc).lean();
    assert.equal(fromDb.nested.data.second.data.final, 3);
  });

  it('avoids infinite recursion when setting single nested subdoc to array (gh-10351)', async function() {
    const userInfoSchema = new mongoose.Schema({ _id: String }, { _id: false });
    const observerSchema = new mongoose.Schema({ user: {} }, { _id: false });

    const entrySchema = new mongoose.Schema({
      creator: userInfoSchema,
      observers: [observerSchema]
    });

    entrySchema.pre('save', function(next) {
      this.observers = [{ user: this.creator }];

      next();
    });

    const Test = db.model('Test', entrySchema);


    const entry = new Test({
      creator: { _id: 'u1' }
    });

    await entry.save();

    const fromDb = await Test.findById(entry);
    assert.equal(fromDb.observers.length, 1);
  });

  describe('reserved keywords can be used optionally (gh-9010)', () => {
    describe('Document#validate(...)', () => {
      it('is available as `$validate`', async() => {
        const userSchema = new Schema({
          name: String
        });

        const User = db.model('User', userSchema);
        const user = new User({ name: 'Sam' });
        const err = await user.$validate();
        assert.ok(err == null);
        assert.equal(user.$validate, user.validate);
      });
      it('can be used as a property in documents', () => {
        const userSchema = new Schema({
          name: String,
          validate: Boolean
        });

        const User = db.model('User', userSchema);
        const user = new User({ name: 'Sam', validate: true });
        assert.equal(user.validate, true);
      });
    });
    describe('Document#save(...)', () => {
      it('is available as `$save`', async() => {
        const userSchema = new Schema({
          name: String
        });

        const User = db.model('User', userSchema);
        const user = new User({ name: 'Sam' });
        const userFromSave = await user.$save();
        assert.ok(userFromSave === user);
        assert.equal(user.$save, user.save);
      });
      it('can be used as a property in documents', () => {
        const userSchema = new Schema({
          name: String,
          save: Boolean
        });

        const User = db.model('User', userSchema);
        const user = new User({ name: 'Sam', save: true });
        assert.equal(user.save, true);
      });
    });
    describe('Document#isModified(...)', () => {
      it('is available as `$isModified`', async() => {
        const userSchema = new Schema({
          name: String
        });

        const User = db.model('User', userSchema);
        const user = new User({ name: 'Sam' });
        await user.save();

        assert.ok(user.$isModified() === false);

        user.name = 'John';
        assert.ok(user.$isModified() === true);
      });
      it('can be used as a property in documents', () => {
        const userSchema = new Schema({
          name: String,
          isModified: String
        });

        const User = db.model('User', userSchema);
        const user = new User({ name: 'Sam', isModified: 'nope' });
        assert.equal(user.isModified, 'nope');
      });
    });
    describe('Document#isNew', () => {
      it('is available as `$isNew`', async() => {
        const userSchema = new Schema({
          name: String
        });

        const User = db.model('User', userSchema);
        const user = new User({ name: 'Sam' });

        assert.ok(user.$isNew === true);
        await user.save();
        assert.ok(user.$isNew === false);
      });
      it('can be used as a property in documents', () => {
        const userSchema = new Schema({
          name: String,
          isNew: String
        });

        const User = db.model('User', userSchema);
        const user = new User({ name: 'Sam', isNew: 'yep' });
        assert.equal(user.isNew, 'yep');
      });
    });
    describe('Document#populated(...)', () => {
      it('is available as `$populated`', async() => {
        const userSchema = new Schema({ name: String });
        const User = db.model('User', userSchema);

        const postSchema = new Schema({
          title: String,
          userId: { type: Schema.ObjectId, ref: 'User' }
        });
        const Post = db.model('Post', postSchema);

        const user = await User.create({ name: 'Sam' });

        const postFromCreate = await Post.create({ title: 'I am a title', userId: user._id });

        const post = await Post.findOne({ _id: postFromCreate }).populate({ path: 'userId' });

        assert.ok(post.$populated('userId'));
        post.depopulate('userId');
        assert.ok(!post.$populated('userId'));
      });
      it('can be used as a property in documents', () => {
        const userSchema = new Schema({
          name: String,
          populated: String
        });

        const User = db.model('User', userSchema);
        const user = new User({ name: 'Sam', populated: 'yep' });
        assert.equal(user.populated, 'yep');
      });
    });
    describe('Document#toObject(...)', () => {
      it('is available as `$toObject`', async() => {
        const userSchema = new Schema({ name: String });
        const User = db.model('User', userSchema);

        const user = await User.create({ name: 'Sam' });

        assert.deepEqual(user.$toObject(), user.toObject());
      });
      it('can be used as a property in documents', () => {
        const userSchema = new Schema({
          name: String,
          toObject: String
        });

        const User = db.model('User', userSchema);
        const user = new User({ name: 'Sam', toObject: 'yep' });
        assert.equal(user.toObject, 'yep');
      });
    });
    describe('Document#init(...)', () => {
      it('is available as `$init`', async() => {
        const userSchema = new Schema({ name: String });
        const User = db.model('User', userSchema);

        const user = new User();
        const sam = new User({ name: 'Sam' });

        assert.equal(user.$init(sam).name, 'Sam');
      });
      it('can be used as a property in documents', () => {
        const userSchema = new Schema({
          name: String,
          init: Number
        });

        const User = db.model('User', userSchema);
        const user = new User({ name: 'Sam', init: 12 });
        assert.equal(user.init, 12);
      });
    });
    xdescribe('Document#collection', () => {
      it('is available as `$collection`', async() => {
        const userSchema = new Schema({ name: String });
        const User = db.model('User', userSchema);

        const user = await User.create({ name: 'Hafez' });
        const userFromCollection = await user.$collection.findOne({ _id: user._id });
        assert.ok(userFromCollection);
      });
      it('can be used as a property in documents', () => {
        const userSchema = new Schema({
          collection: Number
        });

        const User = db.model('User', userSchema);
        const user = new User({ collection: 12 });
        assert.equal(user.collection, 12);
        assert.ok(user.$collection !== user.collection);
        assert.ok(user.$collection);
      });
    });
    describe('Document#errors', () => {
      it('is available as `$errors`', async() => {
        const userSchema = new Schema({ name: { type: String, required: true } });
        const User = db.model('User', userSchema);

        const user = new User();
        user.validateSync();

        assert.ok(user.$errors.name.kind === 'required');
      });
      it('can be used as a property in documents', () => {
        const userSchema = new Schema({
          name: { type: String, required: true },
          errors: Number
        });

        const User = db.model('User', userSchema);
        const user = new User({ errors: 12 });
        user.validateSync();

        assert.equal(user.errors, 12);

        assert.ok(user.$errors.name.kind === 'required');
      });
    });
    describe('Document#removeListener', () => {
      it('is available as `$removeListener`', async() => {
        const userSchema = new Schema({ name: String });
        const User = db.model('User', userSchema);

        const user = new User({ name: 'Hafez' });

        assert.ok(user.$removeListener('save', () => {}));
        assert.ok(user.$removeListener === user.removeListener);
      });
      it('can be used as a property in documents', () => {
        const userSchema = new Schema({
          name: { type: String, required: true },
          removeListener: Number
        });

        const User = db.model('User', userSchema);
        const user = new User({ removeListener: 12 });

        assert.equal(user.removeListener, 12);
      });
    });
    describe('Document#listeners', () => {
      it('is available as `$listeners`', async() => {
        const userSchema = new Schema({ name: String });
        const User = db.model('User', userSchema);

        const user = new User({ name: 'Hafez' });

        assert.ok(user.$listeners === user.listeners);
      });
      it('can be used as a property in documents', () => {
        const userSchema = new Schema({
          name: { type: String, required: true },
          listeners: Number
        });

        const User = db.model('User', userSchema);
        const user = new User({ listeners: 12 });

        assert.equal(user.listeners, 12);
      });
    });
    describe('Document#on', () => {
      it('is available as `$on`', async() => {
        const userSchema = new Schema({ name: String });
        const User = db.model('User', userSchema);

        const user = new User({ name: 'Hafez' });

        assert.ok(user.$on === user.on);
      });
      it('can be used as a property in documents', () => {
        const userSchema = new Schema({
          name: { type: String, required: true },
          on: Number
        });

        const User = db.model('User', userSchema);
        const user = new User({ on: 12 });

        assert.equal(user.on, 12);
      });
    });
    describe('Document#emit', () => {
      it('is available as `$emit`', async() => {
        const userSchema = new Schema({ name: String });
        const User = db.model('User', userSchema);

        const user = new User({ name: 'Hafez' });

        assert.ok(user.$emit === user.emit);
      });
      it('can be used as a property in documents', () => {
        const userSchema = new Schema({
          name: { type: String, required: true },
          emit: Number
        });

        const User = db.model('User', userSchema);
        const user = new User({ emit: 12 });

        assert.equal(user.emit, 12);
      });
    });
    describe('Document#get', () => {
      it('is available as `$get`', async() => {
        const userSchema = new Schema({ name: String });
        const User = db.model('User', userSchema);

        const user = new User({ name: 'Hafez' });

        assert.ok(user.$get === user.get);
      });
      it('can be used as a property in documents', () => {
        const userSchema = new Schema({
          name: { type: String, required: true },
          get: Number
        });

        const User = db.model('User', userSchema);
        const user = new User({ get: 12 });

        assert.equal(user.get, 12);
      });
    });
  });

  describe('virtuals `pathsToSkip` (gh-10120)', () => {
    it('adds support for `pathsToSkip` for virtuals feat-10120', function() {
      const schema = new mongoose.Schema({
        name: String,
        age: Number,
        nested: {
          test: String
        }
      });
      schema.virtual('nameUpper').get(function() { return this.name.toUpperCase(); });
      schema.virtual('answer').get(() => 42);
      schema.virtual('nested.hello').get(() => 'world');

      const Model = db.model('Person', schema);
      const doc = new Model({ name: 'Jean-Luc Picard', age: 59, nested: { test: 'hello' } });
      let obj = doc.toObject({ virtuals: { pathsToSkip: ['answer'] } });
      assert.ok(obj.nameUpper);
      assert.equal(obj.answer, null);
      assert.equal(obj.nested.hello, 'world');
      obj = doc.toObject({ virtuals: { pathsToSkip: ['nested.hello'] } });
      assert.equal(obj.nameUpper, 'JEAN-LUC PICARD');
      assert.equal(obj.answer, 42);
      assert.equal(obj.nested.hello, null);
    });

    it('supports passing a list of virtuals to `toObject()` (gh-10120)', function() {
      const schema = new mongoose.Schema({
        name: String,
        age: Number,
        nested: {
          test: String
        }
      });
      schema.virtual('nameUpper').get(function() { return this.name.toUpperCase(); });
      schema.virtual('answer').get(() => 42);
      schema.virtual('nested.hello').get(() => 'world');

      const Model = db.model('Person', schema);

      const doc = new Model({ name: 'Jean-Luc Picard', age: 59, nested: { test: 'hello' } });

      let obj = doc.toObject({ virtuals: true });
      assert.equal(obj.nameUpper, 'JEAN-LUC PICARD');
      assert.equal(obj.answer, 42);
      assert.equal(obj.nested.hello, 'world');

      obj = doc.toObject({ virtuals: ['answer'] });
      assert.ok(!obj.nameUpper);
      assert.equal(obj.answer, 42);
      assert.equal(obj.nested.hello, null);

      obj = doc.toObject({ virtuals: ['nameUpper'] });
      assert.equal(obj.nameUpper, 'JEAN-LUC PICARD');
      assert.equal(obj.answer, null);
      assert.equal(obj.nested.hello, null);

      obj = doc.toObject({ virtuals: ['nested.hello'] });
      assert.equal(obj.nameUpper, null);
      assert.equal(obj.answer, null);
      assert.equal(obj.nested.hello, 'world');
    });
  });
  describe('validation `pathsToSkip` (gh-10230)', () => {
    it('support `pathsToSkip` option for `Document#validate()`', async function() {

      const User = getUserModel();
      const user = new User();

      const err1 = await user.validate({ pathsToSkip: ['age'] }).then(() => null, err => err);
      assert.deepEqual(Object.keys(err1.errors), ['name']);

      const err2 = await user.validate({ pathsToSkip: ['name'] }).then(() => null, err => err);
      assert.deepEqual(Object.keys(err2.errors), ['age']);
    });

    it('support `pathsToSkip` option for `Document#validate()`', async function() {

      const User = getUserModel();
      const user = new User();

      const err1 = await user.validate({ pathsToSkip: ['age'] }).then(() => null, err => err);
      assert.deepEqual(Object.keys(err1.errors), ['name']);

      const err2 = await user.validate({ pathsToSkip: ['name'] }).then(() => null, err => err);
      assert.deepEqual(Object.keys(err2.errors), ['age']);
    });

    it('support `pathsToSkip` option for `Document#validateSync()`', () => {
      const User = getUserModel();

      const user = new User();

      const err1 = user.validateSync({ pathsToSkip: ['age'] });
      assert.deepEqual(Object.keys(err1.errors), ['name']);

      const err2 = user.validateSync({ pathsToSkip: ['name'] });
      assert.deepEqual(Object.keys(err2.errors), ['age']);
    });

    // skip until gh-10367 is implemented
    xit('support `pathsToSkip` option for `Model.validate()`', async() => {

      const User = getUserModel();
      const err1 = await User.validate({}, { pathsToSkip: ['age'] });
      assert.deepEqual(Object.keys(err1.errors), ['name']);

      const err2 = await User.validate({}, { pathsToSkip: ['name'] });
      assert.deepEqual(Object.keys(err2.errors), ['age']);
    });

    it('`pathsToSkip` accepts space separated paths', async() => {
      const userSchema = Schema({
        name: { type: String, required: true },
        age: { type: Number, required: true },
        country: { type: String, required: true },
        rank: { type: String, required: true }
      });

      const User = db.model('User', userSchema);

      const user = new User({ name: 'Sam', age: 26 });

      const err1 = user.validateSync({ pathsToSkip: 'country rank' });
      assert.ok(err1 == null);

      const err2 = await user.validate({ pathsToSkip: 'country rank' }).then(() => null, err => err);
      assert.ok(err2 == null);
    });


    function getUserModel() {
      const userSchema = Schema({
        name: { type: String, required: true },
        age: { type: Number, required: true },
        rank: String
      });

      const User = db.model('User', userSchema);
      return User;
    }
  });

  it('skips recursive merging (gh-9121)', function() {
    // Subdocument
    const subdocumentSchema = new mongoose.Schema({
      child: new mongoose.Schema({ name: String, age: Number }, { _id: false })
    });
    const Subdoc = mongoose.model('Subdoc', subdocumentSchema);

    // Nested path
    const nestedSchema = new mongoose.Schema({
      child: { name: String, age: Number }
    });
    const Nested = mongoose.model('Nested', nestedSchema);

    const doc1 = new Subdoc({ child: { name: 'Luke', age: 19 } });
    doc1.set({ child: { age: 21 } });
    assert.deepEqual(doc1.toObject().child, { age: 21 });

    const doc2 = new Nested({ child: { name: 'Luke', age: 19 } });
    doc2.set({ child: { age: 21 } });
    assert.deepEqual(doc2.toObject().child, { age: 21 });
  });

  it('does not pull non-schema paths from parent documents into nested paths (gh-10449)', function() {
    const schema = new Schema({
      name: String,
      nested: {
        data: String
      }
    });
    const Test = db.model('Test', schema);

    const doc = new Test({});
    doc.otherProp = 'test';

    assert.ok(!doc.nested.otherProp);
  });

  it('sets properties in the order they are defined in the schema (gh-4665)', async function() {
    const schema = new Schema({
      test: String,
      internal: {
        status: String,
        createdAt: Date
      },
      profile: {
        name: {
          first: String,
          last: String
        }
      }
    });
    const Test = db.model('Test', schema);


    const doc = new Test({
      profile: { name: { last: 'Musashi', first: 'Miyamoto' } },
      internal: { createdAt: new Date('1603-06-01'), status: 'approved' },
      test: 'test'
    });

    assert.deepEqual(Object.keys(doc.toObject()), ['test', 'internal', 'profile', '_id']);
    assert.deepEqual(Object.keys(doc.toObject().profile.name), ['first', 'last']);
    assert.deepEqual(Object.keys(doc.toObject().internal), ['status', 'createdAt']);

    await doc.save();
    const res = await Test.findOne({ _id: doc._id, 'profile.name': { first: 'Miyamoto', last: 'Musashi' } });
    assert.ok(res);
  });

  it('depopulate all should depopulate nested array population (gh-10592)', async function() {
    const Person = db.model('Person', {
      name: String
    });

    const Band = db.model('Band', {
      name: String,
      members: [{ type: Schema.Types.ObjectId, ref: 'Person' }],
      lead: { type: Schema.Types.ObjectId, ref: 'Person' },
      embeddedMembers: [{
        active: Boolean,
        member: {
          type: Schema.Types.ObjectId, ref: 'Person'
        }
      }]
    });

    const people = [{ name: 'Axl Rose' }, { name: 'Slash' }];

    const docs = await Person.create(people);
    let band = {
      name: 'Guns N\' Roses',
      members: [docs[0]._id, docs[1]],
      lead: docs[0]._id,
      embeddedMembers: [{ active: true, member: docs[0]._id }, { active: false, member: docs[1]._id }]
    };

    band = await Band.create(band);
    await band.populate('members lead embeddedMembers.member');
    assert.ok(band.populated('members'));
    assert.ok(band.populated('lead'));
    assert.ok(band.populated('embeddedMembers.member'));
    assert.equal(band.members[0].name, 'Axl Rose');
    assert.equal(band.embeddedMembers[0].member.name, 'Axl Rose');
    band.depopulate();

    assert.ok(!band.populated('members'));
    assert.ok(!band.populated('lead'));
    assert.ok(!band.populated('embeddedMembers.member'));
    assert.ok(!band.embeddedMembers[0].member.name);
  });

  it('should allow dashes in the path name (gh-10677)', async function() {
    const schema = new mongoose.Schema({
      values: {
        type: Map,
        of: { entries: String },
        default: {}
      }
    });

    const Model = db.model('test', schema, 'test');

    const saved = new Model({});
    await saved.save();
    const document = await Model.findById({ _id: saved._id });
    document.values.set('abc', { entries: 'a' });
    document.values.set('abc-d', { entries: 'b' });
    await document.save();
  });

  it('inits non-schema values if strict is false (gh-10828)', function() {
    const FooSchema = new Schema({}, {
      id: false,
      _id: false,
      strict: false
    });
    const BarSchema = new Schema({
      name: String,
      foo: FooSchema
    });

    const Test = db.model('Test', BarSchema);

    const doc = new Test();
    doc.init({
      name: 'Test',
      foo: {
        something: 'A',
        other: 2
      }
    });

    assert.strictEqual(doc.foo.something, 'A');
    assert.strictEqual(doc.foo.other, 2);
  });

  it('avoids depopulating when setting array of subdocs from different doc (gh-10819)', function() {
    const Model1 = db.model('Test', Schema({ someField: String }));
    const Model2 = db.model('Test2', Schema({
      subDocuments: [{
        subDocument: {
          type: 'ObjectId',
          ref: 'Test'
        }
      }]
    }));

    const doc1 = new Model1({ someField: '111' });
    const doc2 = new Model2({
      subDocuments: {
        subDocument: doc1
      }
    });

    const doc3 = new Model2(doc2);
    assert.ok(doc3.populated('subDocuments.subDocument'));
    assert.equal(doc3.subDocuments[0].subDocument.someField, '111');

    const doc4 = new Model2();
    doc4.subDocuments = doc2.subDocuments;
    assert.ok(doc4.populated('subDocuments.subDocument'));
    assert.equal(doc4.subDocuments[0].subDocument.someField, '111');
  });

  it('allows validating doc again if pre validate errors out (gh-10830)', async function() {
    const BookSchema = Schema({
      name: String,
      price: Number,
      quantity: Number
    });

    BookSchema.pre('validate', disallownumflows);

    const Book = db.model('Test', BookSchema);

    function disallownumflows(next) {
      const self = this;
      if (self.isNew) return next();

      if (self.quantity === 27) {
        return next(new Error('Wrong Quantity'));
      }

      next();
    }

    const { _id } = await Book.create({ name: 'Hello', price: 50, quantity: 25 });

    const doc = await Book.findById(_id);

    doc.quantity = 27;
    const err = await doc.save().then(() => null, err => err);
    assert.ok(err);

    doc.quantity = 26;
    await doc.save();
  });

  it('ensures that doc.ownerDocument() and doc.parent() by default return this on the root document (gh-10884)', async function() {
    const userSchema = new mongoose.Schema({
      name: String,
      email: String
    });

    const Event = db.model('Rainbow', userSchema);

    const e = new Event({ name: 'test' });
    assert.strictEqual(e, e.parent());
    assert.strictEqual(e, e.ownerDocument());
  });

  it('catches errors in `required` functions (gh-10968)', async function() {
    const TestSchema = new Schema({
      url: {
        type: String,
        required: function() {
          throw new Error('oops!');
        }
      }
    });
    const Test = db.model('Test', TestSchema);

    const err = await Test.create({}).then(() => null, err => err);
    assert.ok(err);
    assert.equal(err.errors['url'].message, 'oops!');
  });

  it('does not allow overwriting schema methods with strict: false (gh-11001)', async function() {
    const TestSchema = new Schema({
      text: { type: String, default: 'text' }
    }, { strict: false });
    TestSchema.methods.someFn = () => 'good';
    const Test = db.model('Test', TestSchema);

    const unTrusted = { someFn: () => 'bad' };

    let x = await Test.create(unTrusted);
    await x.save();
    assert.equal(x.someFn(), 'good');

    x = new Test(unTrusted);
    await x.save();
    assert.equal(x.someFn(), 'good');

    x = await Test.create({});
    await x.set(unTrusted);
    assert.equal(x.someFn(), 'good');
  });

  it('allows setting nested to instance of document (gh-11011)', async function() {
    const TransactionSchema = new Schema({
      payments: [
        {
          id: { type: String },
          terminal: {
            _id: { type: Schema.Types.ObjectId },
            name: { type: String }
          }
        }
      ]
    });

    const TerminalSchema = new Schema({
      name: { type: String },
      apiKey: { type: String }
    });

    const Transaction = db.model('Test1', TransactionSchema);
    const Terminal = db.model('Test2', TerminalSchema);

    const transaction = new Transaction();
    const terminal = new Terminal({
      name: 'Front desk',
      apiKey: 'somesecret'
    });
    transaction.payments.push({
      id: 'testPayment',
      terminal: terminal
    });
    assert.equal(transaction.payments[0].terminal.name, 'Front desk');
  });

  it('cleans modified paths on deeply nested subdocuments (gh-11060)', async function() {
    const childSchema = new Schema({ status: String });

    const deploymentsSchema = new Schema({
      before: { type: childSchema, required: false },
      after: { type: childSchema, required: false }
    }, { _id: false });

    const testSchema = new Schema({
      name: String,
      deployments: { type: deploymentsSchema }
    });
    const Test = db.model('Test', testSchema);

    await Test.create({
      name: 'hello',
      deployments: {
        before: { status: 'foo' }
      }
    });

    const entry = await Test.findOne({ name: 'hello' });
    const deployment = entry.deployments.before;
    deployment.status = 'bar';
    entry.deployments.before = null;
    entry.deployments.after = deployment;

    assert.ok(!entry.isDirectModified('deployments.before.status'));
    await entry.save();
  });

  it('can manually populate subdocument refs (gh-10856)', async function() {
    // Bar model, has a name property and some other properties that we are interested in
    const BarSchema = new Schema({
      name: String,
      more: String,
      another: Number
    });
    const Bar = db.model('Bar', BarSchema);

    // Denormalised Bar schema with just the name, for use on the Foo model
    const BarNameSchema = new Schema({
      _id: {
        type: Schema.Types.ObjectId,
        ref: 'Bar'
      },
      name: String
    });

    // Foo model, which contains denormalized bar data (just the name)
    const FooSchema = new Schema({
      something: String,
      other: Number,
      bar: {
        type: BarNameSchema,
        ref: 'Bar'
      }
    });
    const Foo = db.model('Foo', FooSchema);

    const bar2 = await Bar.create({
      name: 'I am another Bar',
      more: 'With even more data',
      another: 3
    });
    const foo2 = await Foo.create({
      something: 'I am another Foo',
      other: 4
    });

    foo2.bar = bar2;
    assert.ok(foo2.bar instanceof Bar);
    assert.equal(foo2.bar.another, 3);
    assert.equal(foo2.get('bar.another'), 3);

    const obj = foo2.toObject({ depopulate: true });
    assert.equal(obj.bar.name, 'I am another Bar');
    assert.strictEqual(obj.bar.another, undefined);

    await foo2.save();
    const fromDb = await Foo.findById(foo2).lean();
    assert.strictEqual(fromDb.bar.name, 'I am another Bar');
    assert.strictEqual(fromDb.bar.another, undefined);
  });

  it('can manually populate subdocument refs in `create()` (gh-10856)', async function() {
    // Bar model, has a name property and some other properties that we are interested in
    const BarSchema = new Schema({
      name: String,
      more: String,
      another: Number
    });
    const Bar = db.model('Bar', BarSchema);

    // Denormalised Bar schema with just the name, for use on the Foo model
    const BarNameSchema = new Schema({
      _id: {
        type: Schema.Types.ObjectId,
        ref: 'Bar'
      },
      name: String
    });

    // Foo model, which contains denormalized bar data (just the name)
    const FooSchema = new Schema({
      something: String,
      other: Number,
      bar: {
        type: BarNameSchema,
        ref: 'Bar'
      }
    });
    const Foo = db.model('Foo', FooSchema);

    const bar = await Bar.create({
      name: 'I am Bar',
      more: 'With more data',
      another: 2
    });
    const foo = await Foo.create({
      something: 'I am Foo',
      other: 1,
      bar
    });

    assert.ok(foo.bar instanceof Bar);
    assert.equal(foo.bar.another, 2);
    assert.equal(foo.get('bar.another'), 2);
  });

  it('populating subdocument refs underneath maps throws (gh-12494) (gh-10856)', async function() {
    // Bar model, has a name property and some other properties that we are interested in
    const BarSchema = new Schema({
      name: String,
      more: String,
      another: Number
    });
    const Bar = db.model('Bar', BarSchema);

    // Denormalised Bar schema with just the name, for use on the Foo model
    const BarNameSchema = new Schema({
      _id: {
        type: Schema.Types.ObjectId,
        ref: 'Bar'
      },
      name: String
    });

    // Foo model, which contains denormalized bar data (just the name)
    const FooSchema = new Schema({
      something: String,
      other: Number,
      map: {
        type: Map,
        of: {
          type: BarNameSchema,
          ref: 'Bar'
        }
      }
    });
    const Foo = db.model('Foo', FooSchema);

    const bar = await Bar.create({
      name: 'I am Bar',
      more: 'With more data',
      another: 2
    });
    const { _id } = await Foo.create({
      something: 'I am Foo',
      other: 1,
      map: { test: bar }
    });

    const err = await Foo.findById(_id).populate('map').then(() => null, err => err);
    assert.ok(err);
    assert.ok(err.message.includes('Cannot manually populate single nested subdoc underneath Map'), err.message);
  });

  it('handles save with undefined nested doc under subdoc (gh-11110)', async function() {
    const testSchema = new Schema({
      level_1_array: [new Schema({
        level_1: {
          level_2: new Schema({
            level_3: {
              name_3: String,
              level_4: {
                name_4: String
              }
            }
          })
        }
      })]
    });

    const Test = db.model('Test', testSchema);

    const doc = {
      level_1_array: [{
        level_1: {
          level_2: {
            level_3: {
              name_3: 'test',
              level_4: undefined
            }
          }
        }
      }]
    };

    await new Test(doc).save();
  });

  it('correctly handles modifying array subdoc after setting array subdoc to same value (gh-11172)', async function() {
    const Order = db.model('Order', new Schema({
      cumulativeConsumption: [{
        _id: false,
        unit: String,
        value: Number
      }]
    }));

    await Order.create({
      cumulativeConsumption: [{ unit: 'foo', value: 123 }, { unit: 'bar', value: 42 }]
    });

    const doc = await Order.findOne();
    doc.cumulativeConsumption = doc.toObject().cumulativeConsumption;

    const match = doc.cumulativeConsumption.find(o => o.unit === 'bar');
    match.value = 43;
    match.unit = 'baz';

    assert.ok(doc.isModified());
    assert.ok(doc.isModified('cumulativeConsumption.1'));
  });

  it('handles `String` with `type` (gh-11199)', function() {
    String.type = String;
    const schema = new mongoose.Schema({
      something: String,
      somethingElse: { type: String, trim: true }
    });

    const Test = db.model('Test', schema);
    const doc = new Test({ something: 'test', somethingElse: 'test 2' });
    assert.equal(typeof doc.something, 'string');
    assert.equal(typeof doc.somethingElse, 'string');
    delete String.type;
  });

  it('applies subdocument defaults when projecting dotted subdocument fields', async function() {
    const version = await start.mongodVersion();
    if (version[0] < 5) {
      return this.skip();
    }

    const grandChildSchema = new mongoose.Schema({
      name: {
        type: mongoose.Schema.Types.String,
        default: () => 'grandchild'
      }
    });

    const childSchema = new mongoose.Schema({
      name: {
        type: mongoose.Schema.Types.String,
        default: () => 'child'
      },
      grandChild: {
        type: grandChildSchema,
        default: () => ({})
      }
    });

    const parentSchema = new mongoose.Schema({
      name: mongoose.Schema.Types.String,
      child: {
        type: childSchema,
        default: () => ({})
      }
    });

    const ParentModel = db.model('Parent', parentSchema);
    // insert an object without mongoose adding missing defaults
    const result = await db.collection('Parent').insertOne({ name: 'parent' });

    // ensure that the defaults are populated when no projections are used
    const doc = await ParentModel.findById(result.insertedId).exec();
    assert.equal(doc.name, 'parent');
    assert.equal(doc.child.name, 'child');
    assert.equal(doc.child.grandChild.name, 'grandchild');

    // ensure that defaults are populated when using an object projection
    const projectedDoc = await ParentModel.findById(result.insertedId, {
      name: 1,
      child: {
        name: 1,
        grandChild: {
          name: 1
        }
      }
    }).exec();
    assert.equal(projectedDoc.name, 'parent');
    assert.equal(projectedDoc.child.name, 'child');
    assert.equal(projectedDoc.child.grandChild.name, 'grandchild');

    // ensure that defaults are populated when using dotted path projections
    const dottedProjectedDoc = await ParentModel.findById(result.insertedId, {
      name: 1,
      'child.name': 1,
      'child.grandChild.name': 1
    }).exec();
    assert.equal(dottedProjectedDoc.name, 'parent');
    assert.equal(dottedProjectedDoc.child.name, 'child');
    assert.equal(dottedProjectedDoc.child.grandChild.name, 'grandchild');
  });

  it('handles initing nested properties in non-strict documents (gh-11309)', async function() {
    const NestedSchema = new Schema({}, {
      id: false,
      _id: false,
      strict: false
    });

    const ItemSchema = new Schema({
      name: {
        type: String
      },
      nested: NestedSchema
    });

    const Test = db.model('Test', ItemSchema);

    const item = await Test.create({
      nested: {
        foo: {
          bar: 55
        }
      }
    });

    // Modify nested data
    item.nested.foo.bar = 66;
    item.markModified('nested.foo.bar');
    await item.save();

    const reloaded = await Test.findOne({ _id: item._id });

    assert.deepEqual(reloaded.nested.foo, { bar: 66 });
    assert.ok(!reloaded.nested.foo.$__isNested);
    assert.strictEqual(reloaded.nested.foo.bar, 66);
  });

  it('saves changes when setting a nested path to itself (gh-11395)', async function() {
    const Test = db.model('Test', new Schema({
      co: { value: Number }
    }));

    await Test.create({});

    const doc = await Test.findOne();
    doc.co.value = 123;
    doc.co = doc.co;
    await doc.save();

    const res = await Test.findById(doc._id);
    assert.strictEqual(res.co.value, 123);
  });

  it('avoids setting nested properties on top-level document when init-ing with strict: false (gh-11526) (gh-11309)', async function() {
    const testSchema = Schema({ name: String }, { strict: false, strictQuery: false });
    const Test = db.model('Test', testSchema);

    const doc = new Test();
    doc.init({
      details: {
        person: {
          name: 'Baz'
        }
      }
    });

    assert.strictEqual(doc.name, void 0);
  });

  it('handles deeply nested subdocuments when getting paths to validate (gh-11501)', async function() {
    const schema = Schema({
      parameters: {
        test: {
          type: new Schema({
            value: 'Mixed'
          })
        }
      },
      nested: Schema({
        parameters: {
          type: Map,
          of: Schema({
            value: 'Mixed'
          })
        }
      })
    });
    const Test = db.model('Test', schema);

    await Test.create({
      nested: {
        parameters: new Map([['test', { answer: 42 }]])
      }
    });
  });

  it('handles casting array of spread documents (gh-11522)', async function() {
    const Test = db.model('Test', new Schema({
      arr: [{ _id: false, prop1: String, prop2: String }]
    }));

    const doc = new Test({ arr: [{ prop1: 'test' }] });

    doc.arr = doc.arr.map(member => ({
      ...member,
      prop2: 'foo'
    }));

    assert.deepStrictEqual(doc.toObject().arr, [{ prop1: 'test', prop2: 'foo' }]);

    await doc.validate();
  });

  it('avoids setting modified on subdocument defaults (gh-11528)', async function() {
    const textSchema = new Schema({
      text: { type: String }
    }, { _id: false });

    const messageSchema = new Schema({
      body: { type: textSchema, default: { text: 'hello' } },
      date: { type: Date, default: Date.now }
    });


    const Message = db.model('Test', messageSchema);

    const entry = await Message.create({});

    const failure = await Message.findById({ _id: entry._id });

    assert.deepEqual(failure.modifiedPaths(), []);
  });

  it('works when passing dot notation to mixed property (gh-1946)', async function() {
    const schema = Schema({
      name: String,
      mix: { type: Schema.Types.Mixed },
      nested: { prop: String }
    });
    const M = db.model('Test', schema);
    const m1 = new M({ name: 'test', 'mix.val': 'foo', 'nested.prop': 'bar' });
    assert.equal(m1.name, 'test');
    assert.equal(m1.mix.val, 'foo');
    assert.equal(m1.nested.prop, 'bar');
    await m1.save();
    assert.equal(m1.name, 'test');
    assert.equal(m1.mix.val, 'foo');

    const doc = await M.findById(m1);
    assert.equal(doc.name, 'test');
    assert.equal(doc.mix.val, 'foo');
  });

  it('correctly validates deeply nested document arrays (gh-11564)', async function() {
    const testSchemaSub3 = new mongoose.Schema({
      name: {
        type: String,
        required: true
      }
    });

    const testSchemaSub2 = new mongoose.Schema({
      name: {
        type: String,
        required: true
      },
      list: [testSchemaSub3]
    });

    const testSchemaSub1 = new mongoose.Schema({
      name: {
        type: String,
        required: true
      },
      list: [testSchemaSub2]
    });

    const testSchema = new mongoose.Schema({
      name: String,
      list: [testSchemaSub1]
    });

    const testModel = db.model('Test', testSchema);

    await testModel.create({
      name: 'lvl1',
      list: [{
        name: 'lvl2',
        list: [{
          name: 'lvl3'
        }]
      }]
    });
  });

  it('reruns validation when modifying a document array path under a nested path after save (gh-11672)', async function() {
    const ChildSchema = new Schema({
      price: {
        type: Number,
        validate: function(val) {
          return val > 0;
        }
      }
    });

    const ParentSchema = new Schema({
      rootField: { nestedSubdocArray: [ChildSchema] }
    });
    const Test = db.model('Test', ParentSchema);

    const parentDoc = new Test({
      rootField: {
        nestedSubdocArray: [
          {
            price: 1
          }
        ]
      }
    });

    await parentDoc.save();

    // Now we try editing to an invalid value which should throw
    parentDoc.rootField.nestedSubdocArray[0].price = -1;
    const err = await parentDoc.save().then(() => null, err => err);

    assert.ok(err);
    assert.equal(err.name, 'ValidationError');
    assert.ok(err.message.includes('failed for path'), err.message);
    assert.ok(err.message.includes('value `-1`'), err.message);
  });

  it('avoids setting nested paths to null when they are set to `undefined` (gh-11723)', async function() {
    const nestedSchema = new mongoose.Schema({
      count: Number
    }, { _id: false });

    const mySchema = new mongoose.Schema({
      name: String,
      nested: { count: Number },
      nestedSchema: nestedSchema
    }, { minimize: false });

    const Test = db.model('Test', mySchema);

    const instance1 = new Test({ name: 'test1', nested: { count: 1 }, nestedSchema: { count: 1 } });
    await instance1.save();

    const update = { nested: { count: undefined }, nestedSchema: { count: undefined } };
    instance1.set(update);
    await instance1.save();

    const doc = await Test.findById(instance1);
    assert.strictEqual(doc.nested.count, undefined);
    assert.strictEqual(doc.nestedSchema.count, undefined);
  });

  it('cleans modified subpaths when setting nested path under array to null when subpaths are modified (gh-11764)', async function() {
    const Test = db.model('Test', new Schema({
      list: [{
        quantity: {
          value: Number,
          unit: String
        }
      }]
    }));

    let doc = await Test.create({ list: [{ quantity: { value: 1, unit: 'case' } }] });

    doc = await Test.findById(doc);
    doc.list[0].quantity.value = null;
    doc.list[0].quantity.unit = null;
    doc.list[0].quantity = null;

    await doc.save();

    doc = await Test.findById(doc);
    assert.strictEqual(doc.list[0].toObject().quantity, null);
  });

  it('avoids manually populating document that is manually populated in another doc with different unpopulatedValue (gh-11442) (gh-11008)', async function() {
    const BarSchema = new Schema({
      name: String,
      more: String
    });
    const Bar = db.model('Bar', BarSchema);

    // Denormalised Bar schema with just the name, for use on the Foo model
    const BarNameSchema = new Schema({
      _id: {
        type: Schema.Types.ObjectId,
        ref: 'Bar'
      },
      name: String
    });

    // Foo model, which contains denormalized bar data (just the name)
    const FooSchema = new Schema({
      something: String,
      other: Number,
      bar: {
        type: BarNameSchema,
        ref: 'Bar'
      }
    });
    const Foo = db.model('Foo', FooSchema);

    const Baz = db.model('Baz', new Schema({ bar: { type: 'ObjectId', ref: 'Bar' } }));

    const bar = await Bar.create({
      name: 'I am another Bar',
      more: 'With even more data'
    });
    const foo = await Foo.create({
      something: 'I am another Foo',
      other: 4
    });
    foo.bar = bar;
    const baz = await Baz.create({});
    baz.bar = bar;

    assert.ok(foo.populated('bar'));
    assert.ok(!baz.populated('bar'));

    let res = foo.toObject({ depopulate: true });
    assert.strictEqual(res.bar._id.toString(), bar._id.toString());
    assert.strictEqual(res.bar.name, 'I am another Bar');

    res = baz.toObject({ depopulate: true });
    assert.strictEqual(res.bar.toString(), bar._id.toString());

    const bar2 = await Bar.create({
      name: 'test2'
    });
    baz.bar = bar2;
    assert.ok(baz.populated('bar'));

    const baz2 = await Baz.create({});
    baz2.bar = bar2;
    assert.ok(baz.populated('bar'));
  });

  it('$getAllSubdocs gets document arrays underneath a nested path (gh-11917)', function() {
    const nestedSettingsSchema = new Schema({
      value: String,
      active: Boolean
    });

    const userSettingsSchema = new Schema({
      nestedSettings: {
        settingsProps: [nestedSettingsSchema]
      }
    });

    const userSchema = new Schema({
      first_name: String,
      last_name: String,
      settings: userSettingsSchema
    });

    const User = db.model('User', userSchema);

    const doc = new User({
      settings: {
        nestedSettings: {
          settingsProps: [{ value: 'test', active: true }]
        }
      }
    });

    const subdocs = doc.$getAllSubdocs();
    assert.equal(subdocs.length, 2);
    assert.equal(subdocs[0].value, 'test');
    assert.ok(subdocs[1].nestedSettings);
  });

  it('handles validation errors on deeply nested subdocuments underneath a nested path (gh-12021)', async function() {
    const SubSubSchema = new mongoose.Schema(
      {
        from: {
          type: mongoose.Schema.Types.String,
          required: true
        }
      },
      { _id: false }
    );

    const SubSchema = new mongoose.Schema(
      {
        nested: {
          type: SubSubSchema,
          required: false // <-- important
        }
      },
      { _id: false }
    );

    const TestLeafSchema = new mongoose.Schema({
      testProp: {
        testSubProp: {
          type: SubSchema,
          required: true
        }
      }
    });

    const TestLeafModel = mongoose.model('test-leaf-model', TestLeafSchema);

    const testModelInstance = new TestLeafModel({
      testProp: {
        testSubProp: {
          nested: { from: null }
        }
      }
    });

    const err = await testModelInstance.validate().then(() => null, err => err);
    assert.ok(err);
    assert.ok(err.errors['testProp.testSubProp.nested.from']);
  });

  describe('$inc (gh-11915)', function() {
    describe('top-level path', function() {
      let Test;

      beforeEach(function() {
        const schema = new Schema({
          counter: Number
        });
        Test = db.model('Test', schema);
      });

      it('sends a $inc command for a given path', async function() {
        await Test.create({ counter: 0 });
        const doc = await Test.findOne();
        assert.strictEqual(doc.counter, 0);
        const doc2 = await Test.findOne();

        doc2.counter = 1;
        await doc2.save();

        doc.$inc('counter', 1);
        await doc.save();

        const res = await Test.findById(doc);
        assert.equal(res.counter, 2);
      });

      it('calls setters on the value passed to `$inc()` (gh-13158)', async function() {
        const called = [];
        const Test2 = db.model('Test2', Schema({
          counter: {
            type: Number,
            set: v => { called.push(v); return v.toFixed(2); }
          }
        }));
        const doc = await Test2.create({ counter: 2 });
        assert.deepEqual(called, [2]);

        doc.$inc('counter', 1.14159);
        assert.deepEqual(called, [2, 3.14159]);
        assert.equal(doc.counter, 3.14);
        await doc.save();

        const res = await Test2.findById(doc);
        assert.equal(res.counter, 3.14);
      });

      it('avoids updating value if setter fails (gh-13158)', async function() {
        const called = [];
        const Test2 = db.model('Test2', Schema({
          counter: {
            type: Number,
            set: v => {
              called.push(v);
              if (v > 3) {
                throw new Error('Oops!');
              }
              return v;
            }
          }
        }));
        const doc = await Test2.create({ counter: 2 });
        assert.deepEqual(called, [2]);

        doc.$inc('counter', 3);
        assert.deepEqual(called, [2, 5]);
        assert.equal(doc.counter, 2);
        const err = await doc.save().then(() => null, err => err);
        assert.ok(err);
        assert.ok(err.errors['counter']);
      });

      it('works as a $set if the document is new', async function() {
        const doc = new Test({ counter: 0 });
        doc.$inc('counter', 2);
        assert.equal(doc.counter, 2);

        await doc.save();

        const res = await Test.findById(doc);
        assert.equal(res.counter, 2);
      });

      it('treats as a $set if set after $inc', async function() {
        await Test.create({ counter: 0 });
        const doc = await Test.findOne();

        doc.$inc('counter', 2);
        doc.counter = 5;
        assert.deepStrictEqual(doc.getChanges(), { $set: { counter: 5 } });
        await doc.save();

        const res = await Test.findOne();
        assert.equal(res.counter, 5);
      });

      it('tries to cast to number', async function() {
        await Test.create({ counter: 0 });
        const doc = await Test.findOne();

        doc.$inc('counter', '2');
        assert.deepStrictEqual(doc.getChanges(), { $inc: { counter: 2 } });
        await doc.save();

        const res = await Test.findOne();
        assert.equal(res.counter, 2);
      });

      it('stores CastError if can\'t convert to number', async function() {
        await Test.create({ counter: 0 });
        const doc = await Test.findOne();

        doc.$inc('counter', 'foobar');
        const err = await doc.save().then(() => null, err => err);
        assert.ok(err);
        assert.equal(err.errors['counter'].name, 'CastError');
      });
    });

    describe('nested paths', function() {
      let Test;

      beforeEach(function() {
        const schema = new Schema({
          nested: {
            counter: Number
          }
        });
        Test = db.model('Test', schema);
      });

      it('handles nested paths', async function() {
        await Test.create({ nested: { counter: 0 } });
        const doc = await Test.findOne();

        doc.$inc('nested.counter', 2);
        await doc.save();

        const res = await Test.findById(doc);
        assert.equal(res.nested.counter, 2);
      });

      it('treats as $set if overwriting nested path', async function() {
        await Test.create({ nested: { counter: 0 } });
        const doc = await Test.findOne();

        doc.$inc('nested.counter', 2);
        doc.nested.counter += 3;
        await doc.save();

        const res = await Test.findById(doc);
        assert.equal(res.nested.counter, 5);
      });
    });

    describe('subdocuments', function() {
      let Test;

      beforeEach(function() {
        const schema = new Schema({
          subdoc: new Schema({
            counter: Number
          })
        });
        Test = db.model('Test', schema);
      });

      it('handles paths underneath subdocuments', async function() {
        await Test.create({ subdoc: { counter: 0 } });
        const doc = await Test.findOne();

        doc.$inc('subdoc.counter', 2);
        await doc.save();

        const res = await Test.findById(doc);
        assert.equal(res.subdoc.counter, 2);
      });

      it('treats as a $set if setting subdocument after $inc', async function() {
        await Test.create({ subdoc: { counter: 0 } });
        const doc = await Test.findOne();

        doc.$inc('subdoc.counter', 2);
        doc.subdoc = { counter: 5 };
        await doc.save();

        const res = await Test.findById(doc);
        assert.equal(res.subdoc.counter, 5);
      });
    });

    describe('document array', function() {
      let Test;

      beforeEach(function() {
        const schema = new Schema({
          docArr: [{ counter: Number }]
        });
        Test = db.model('Test', schema);
      });

      it('handles paths underneath subdocuments', async function() {
        await Test.create({ docArr: [{ counter: 0 }] });
        const doc = await Test.findOne();

        doc.docArr[0].$inc('counter');
        await doc.save();

        const res = await Test.findById(doc);
        assert.equal(res.docArr[0].counter, 1);
      });

      it('works on pushed subdocs', async function() {
        await Test.create({ docArr: [] });
        const doc = await Test.findOne();

        doc.docArr.push({ counter: 0 });
        doc.docArr[0].$inc('counter');
        await doc.save();

        const res = await Test.findById(doc);
        assert.equal(res.docArr[0].counter, 1);
      });
      it('Splice call registers path modification', async function() {
        await Test.create({ docArr: [{ counter: 0 }, { counter: 2 }, { counter: 3 }, { counter: 4 }] });
        const doc = await Test.findOne();
        doc.docArr.splice(1, 0, { counter: 1 });
        assert.equal(doc.isModified('docArr'), true);
      });
    });

    it('stores CastError if trying to $inc a non-numeric path', async function() {
      const schema = new Schema({
        prop: String
      });
      const Test = db.model('Test', schema);

      await Test.create({ prop: '' });
      const doc = await Test.findOne();

      doc.$inc('prop', 2);
      const err = await doc.save().then(() => null, err => err);
      assert.ok(err);
      assert.equal(err.errors['prop'].name, 'CastError');
    });
    it('should correctly increment even if the document has not saved after each increment gh-13274', async function() {
      const schema = new Schema({
        coins: Number
      });
      const Test = db.model('gh13274', schema);
      await Test.create({ coins: 0 });
      const doc = await Test.findOne();
      doc.$inc('coins', 1000);
      doc.$inc('coins', 2000);
      await doc.save();
      const check = await Test.findOne();
      assert.equal(check.coins, 3000);
    });
  });

  it('supports virtuals named `isValid` (gh-12124) (gh-6262)', async function() {
    const Schema = new mongoose.Schema({
      test: String,
      data: { sub: String }
    });

    Schema.virtual('isValid');

    const Test = db.model('Test', Schema);
    let doc = new Test();

    assert.ok(doc.$isValid('test'));
    await doc.save();

    doc = await Test.findOne();

    doc.set('isValid', true);
    assert.ok(doc.$isValid('test'));

    doc.set({ test: 'test' });
    await doc.save();
    assert.equal(doc.test, 'test');

    doc.set({ data: { sub: 'sub' } });
    await doc.save();
    assert.equal(doc.data.sub, 'sub');
  });

  it('handles maps when applying defaults to nested paths (gh-12220)', async function() {
    const nestedSchema = new mongoose.Schema({
      1: {
        type: Number,
        default: 0
      }
    });

    const topSchema = new mongoose.Schema({
      nestedPath1: {
        mapOfSchema: {
          type: Map,
          of: nestedSchema
        }
      }
    });

    const Test = db.model('Test', topSchema);

    const data = {
      nestedPath1: {
        mapOfSchema: {}
      }
    };
    const doc = await Test.create(data);

    assert.ok(doc.nestedPath1.mapOfSchema);
  });

  it('correct context for default functions in subdocuments with init (gh-12328)', async function() {
    let called = 0;

    const subSchema = new mongoose.Schema({
      propertyA: { type: String },
      propertyB: {
        type: String,
        default: function() {
          ++called;
          return this.propertyA;
        }
      }
    });

    const testSchema = new mongoose.Schema(
      {
        name: String,
        sub: { type: subSchema, default: () => ({}) }
      }
    );

    const Test = db.model('Test', testSchema);

    await Test.collection.insertOne({ name: 'test', sub: { propertyA: 'foo' } });
    assert.strictEqual(called, 0);

    const doc = await Test.findOne({ name: 'test' });
    assert.strictEqual(doc.sub.propertyB, 'foo');
    assert.strictEqual(called, 1);
  });

  it('applies defaults to pushed subdocs after initing document (gh-12515)', async function() {
    const animalSchema = new Schema({ title: String });
    const animalsSchema = new Schema({
      species: [animalSchema],
      totalAnimals: Number
    });
    const Userschema = new Schema({
      animals: animalsSchema
    });
    const UserModel = db.model('User', Userschema);

    const doc = new UserModel();
    doc.animals = { totalAnimals: 1 };
    doc.animals.species = [{ title: 'Lion' }];
    await doc.save();
    // once created we fetch it again
    let user = await UserModel.findById(doc._id);

    // add new animal
    user.animals.species.push({ title: 'Elephant' });
    await user.save();
    assert.ok(user.animals.species[0]._id);
    assert.ok(user.animals.species[1]._id);
    user = await UserModel.collection.findOne({ _id: user._id });

    assert.ok(user.animals.species[0]._id);
    assert.ok(user.animals.species[1]._id);
  });

  it('If the field does not exist, $inc should create it and set is value to the specified one (gh-12435)', async function() {
    const schema = new mongoose.Schema({
      name: String,
      count: Number
    });
    const Model = db.model('IncTest', schema);
    const doc = new Model({ name: 'Test' });
    await doc.save();
    doc.$inc('count', 1);
    await doc.save();

    assert.strictEqual(doc.count, 1);

    const addedDoc = await Model.findOne({ name: 'Test' });
    assert.strictEqual(addedDoc.count, 1);
  });

  it('avoids overwriting array if saving with no changes with array deselected (gh-12414)', async function() {
    const schema = new mongoose.Schema({
      name: String,
      tags: [String]
    });
    const Test = db.model('Test', schema);

    const { _id } = await Test.create({ name: 'Mongoose', tags: ['mongodb'] });

    const doc = await Test.findById(_id).select('name');
    assert.deepStrictEqual(doc.getChanges(), {});
    await doc.save();

    const rawDoc = await Test.collection.findOne({ _id });
    assert.ok(rawDoc);
    assert.deepStrictEqual(rawDoc.tags, ['mongodb']);
  });

  it('$clone() (gh-11849)', async function() {
    const schema = new mongoose.Schema({
      name: {
        type: String,
        validate: {
          validator: (v) => v !== 'Invalid'
        }
      }
    });
    const Test = db.model('Test', schema);

    const item = await Test.create({ name: 'Test' });

    const doc = await Test.findById(item._id);
    const clonedDoc = doc.$clone();

    assert.deepEqual(clonedDoc, doc);
    assert.deepEqual(clonedDoc._doc, doc._doc);
    assert.deepEqual(clonedDoc.$__, doc.$__);

    // Editing a field in the cloned doc does not effect
    // the original doc
    clonedDoc.name = 'Test 2';
    assert.equal(doc.name, 'Test');
    assert.equal(clonedDoc.name, 'Test 2');
    assert.ok(!doc.$isModified('name'));
    assert.ok(clonedDoc.$isModified('name'));

    // Saving the cloned doc does not effect `modifiedPaths`
    // in the original doc
    const modifiedPaths = [...doc.modifiedPaths()];
    await clonedDoc.save();
    assert.deepEqual(doc.modifiedPaths(), modifiedPaths);

    // Cloning a doc with invalid field preserve the
    // invalid field value
    doc.name = 'Invalid';
    await assert.rejects(async() => {
      await doc.validate();
    });

    await clonedDoc.validate();

    const invalidClonedDoc = doc.$clone();
    doc.name = 'Test';
    await doc.validate();
    await assert.rejects(async() => {
      await invalidClonedDoc.validate();
    });

    // Setting a session on the cloned doc does not
    // affect the session in the original doc
    const session = await Test.startSession();
    clonedDoc.$session(session);
    assert.strictEqual(doc.$session(), null);
    assert.strictEqual(clonedDoc.$session(), session);
  });

  it('can create document with document array and top-level key named `schema` (gh-12480)', async function() {
    const AuthorSchema = new Schema({
      fullName: { type: 'String', required: true }
    });

    const BookSchema = new Schema({
      schema: { type: 'String', required: true },
      title: { type: 'String', required: true },
      authors: [AuthorSchema]
    }, { suppressReservedKeysWarning: true });

    const Book = db.model('Book', BookSchema);

    await Book.create({
      schema: 'design',
      authors: [{ fullName: 'Sourabh Bagrecha' }],
      title: 'The power of JavaScript'
    });
  });

  it('handles setting array to itself after saving and pushing a new value (gh-12656)', async function() {
    const Test = db.model('Test', new Schema({
      list: [{
        a: Number
      }]
    }));
    await Test.create({ list: [{ a: 1, b: 11 }] });

    let doc = await Test.findOne();
    doc.list.push({ a: 2 });
    doc.list = [...doc.list];
    await doc.save();

    doc.list.push({ a: 3 });
    doc.list = [...doc.list];
    await doc.save();

    doc = await Test.findOne();
    assert.equal(doc.list.length, 3);
    assert.deepStrictEqual(doc.list.map(el => el.a), [1, 2, 3]);
  });

  it('should not trigger isModified when setting a nested boolean to the same value as previously  (gh-12992)', async function() {
    const Test = db.model('Test', new Schema({
      result: new Schema(
        {
          score: Number,
          passed: Boolean
        },
        { _id: false }
      )
    }));
    const newTest = await Test.create({
      result: {
        score: 40,
        passed: false
      }
    });

    const existingTest = await Test.findById(newTest._id);
    existingTest.result = {
      score: 40,
      passed: false
    };

    assert.equal(existingTest.isModified(), false);
    assert.equal(existingTest.modifiedPaths().length, 0);

    existingTest.result = {
      score: 40,
      passed: true
    };

    assert.equal(existingTest.isModified(), true);
    assert.equal(existingTest.modifiedPaths().length, 1);
  });

  it('saves single nested subdoc defaults (gh-12905)', async function() {
    const nestedSchema = new mongoose.Schema({
      refOriginal: String,
      refAnother: {
        type: String,
        default: () => 'goodbye'
      }
    });
    const testSchema = new mongoose.Schema({
      original: String,
      another: {
        type: String,
        default: 'hello'
      },
      referenced: {
        type: nestedSchema,
        default: () => ({})
      }
    });
    const Test = db.model('Test', testSchema);

    const _id = new mongoose.Types.ObjectId();
    await Test.collection.insertOne({
      _id,
      original: 'foo',
      referenced: { refOriginal: 'hello' }
    });

    const doc = await Test.findById(_id);
    assert.equal(doc.referenced.refOriginal, 'hello');
    assert.equal(doc.referenced.refAnother, 'goodbye');

    await doc.save();
    const rawDoc = await Test.findById(_id).lean();
    assert.equal(rawDoc.referenced.refOriginal, 'hello');
    assert.equal(rawDoc.referenced.refAnother, 'goodbye');
  });

  it('$shift() triggers $pop', function() {
    const Test = db.model('Test', mongoose.Schema({
      arr: [String]
    }, { autoCreate: false, autoIndex: false }));

    const doc = Test.hydrate({ arr: ['a', 'b', 'c'] });
    doc.arr.$shift();

    assert.deepStrictEqual(
      doc.getChanges(),
      { $pop: { arr: -1 }, $inc: { __v: 1 } }
    );
  });

  it('avoids setting array default if document array projected out by sibling projection (gh-13003)', async function() {
    const schema = new mongoose.Schema({
      name: String,
      arr: [String],
      properties: {
        foo: String,
        bar: [{ baz: String, qux: Boolean }],
        baz: String
      }
    });
    const Test = db.model('Test', schema);

    const doc = new Test({}, { 'properties.foo': 1 });
    doc.init({ properties: { foo: 'foo' } });
    assert.strictEqual(doc.properties.bar, undefined);
  });

  it('avoids overwriting array with sibling projection (gh-13043)', async function() {
    const testSchema = new mongoose.Schema({
      str: 'string',
      obj: {
        subObj: {
          str: 'string'
        },
        subArr: [{
          str: 'string'
        }]
      },
      arr: [{
        str: 'string'
      }]
    });
    const Test = db.model('Test', testSchema);
    // Create one test document : obj.subArr[0].str === 'subArr.test1'
    await Test.create({
      str: 'test1',
      obj: {
        subObj: {
          str: 'subObj.test1'
        },
        subArr: [{
          str: 'subArr.test1'
        }]
      },
      arr: [{ str: 'arr.test1' }]
    });

    const test = await Test.findOne({ str: 'test1' }, 'str obj.subObj');

    // Update one property
    test.str = test.str + ' - updated';
    await test.save();

    const fromDb = await Test.findById(test);
    assert.equal(fromDb.obj.subArr.length, 1);
    assert.equal(fromDb.obj.subArr[0].str, 'subArr.test1');
  });

  it('can set() from top-level on nested schema with strict: false (gh-13327)', async function() {
    const testSchema = new Schema({
      d: new Schema({}, { strict: false, _id: false })
    });
    const Test = db.model('Test', testSchema);

    const x = new Test();
    x.set('d.x.y', 1);
    assert.strictEqual(x.get('d.x.y'), 1);
    await x.save();

    const fromDb = await Test.findById(x._id).lean();
    assert.equal(fromDb.d.x.y, 1);
  });

  it('can set() from top-level on path underneath map of mixed (gh-13327)', async function() {
    const testSchema = new Schema({
      c: {
        type: Map,
        of: 'Mixed'
      }
    });
    const Test = db.model('Test', testSchema);

    const x = new Test();
    x.set('c.x.y', 1);
    assert.strictEqual(x.get('c.x.y'), 1);
    await x.save();

    const fromDb = await Test.findById(x._id).lean();
    assert.equal(fromDb.c.x.y, 1);
  });
});

describe('Check if instance function that is supplied in schema option is availabe', function() {
  it('should give an instance function back rather than undefined', function ModelJS() {
    const testSchema = new mongoose.Schema({}, { methods: { instanceFn() { return 'Returned from DocumentInstanceFn'; } } });
    const TestModel = mongoose.model('TestModel', testSchema);
    const TestDocument = new TestModel({});
    assert.equal(TestDocument.instanceFn(), 'Returned from DocumentInstanceFn');
  });
});
