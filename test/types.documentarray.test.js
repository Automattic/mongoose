'use strict';

/**
 * Module dependencies.
 */

const start = require('./common');

const DocumentArray = require('../lib/types/DocumentArray');
const ArraySubdocument = require('../lib/types/ArraySubdocument');
const assert = require('assert');
const idGetter = require('../lib/helpers/schema/idGetter');
const setValue = require('../lib/utils').setValue;

const mongoose = require('./common').mongoose;
const Schema = mongoose.Schema;
const MongooseDocumentArray = mongoose.Types.DocumentArray;

/**
 * Setup.
 */

function TestDoc(schema) {
  const Subdocument = function() {
    ArraySubdocument.call(this, {}, new DocumentArray());
  };

  /**
   * Inherits from ArraySubdocument.
   */

  Object.setPrototypeOf(Subdocument.prototype, ArraySubdocument.prototype);

  /**
   * Set schema.
   */

  const SubSchema = new Schema({
    title: { type: String }
  });

  Subdocument.prototype.$__setSchema(idGetter(schema || SubSchema));

  return Subdocument;
}

/**
 * Test.
 */

describe('types.documentarray', function() {
  let db;

  before(function() {
    db = start();
  });

  after(async function() {
    await db.close();
  });

  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => require('./util').clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  it('behaves and quacks like an array', function() {
    const a = new MongooseDocumentArray();

    assert.ok(a instanceof Array);
    assert.ok(a.isMongooseArray);
    assert.ok(a.isMongooseDocumentArray);
    assert.ok(Array.isArray(a));

    assert.deepEqual(a.$atomics().constructor, Object);


  });

  it('#id', function() {
    let Subdocument = TestDoc();

    let sub1 = new Subdocument();
    sub1.title = 'Hello again to all my friends';
    let id = sub1.id;

    let a = new MongooseDocumentArray([sub1]);
    assert.equal(a.id(id).title, 'Hello again to all my friends');
    assert.equal(a.id(sub1._id).title, 'Hello again to all my friends');

    // test with custom string _id
    let Custom = new Schema({
      title: { type: String },
      _id: { type: String, required: true }
    });

    Subdocument = TestDoc(Custom);

    let sub2 = new Subdocument();
    sub2.title = 'together we can play some rock-n-roll';
    sub2._id = 'a25';
    const id2 = sub2.id;

    a = new MongooseDocumentArray([sub2]);
    assert.equal(a.id(id2).title, 'together we can play some rock-n-roll');
    assert.equal(a.id(sub2._id).title, 'together we can play some rock-n-roll');

    // test with custom number _id
    const CustNumber = new Schema({
      title: { type: String },
      _id: { type: Number, required: true }
    });

    Subdocument = TestDoc(CustNumber);

    const sub3 = new Subdocument();
    sub3.title = 'rock-n-roll';
    sub3._id = 1995;
    const id3 = sub3.id;

    a = new MongooseDocumentArray([sub3]);
    assert.equal(a.id(id3).title, 'rock-n-roll');
    assert.equal(a.id(sub3._id).title, 'rock-n-roll');

    // test with object as _id
    Custom = new Schema({
      title: { type: String },
      _id: { one: { type: String }, two: { type: String } }
    });

    Subdocument = TestDoc(Custom);

    sub1 = new Subdocument();
    sub1._id = { one: 'rolling', two: 'rock' };
    sub1.title = 'to be a rock and not to roll';

    sub2 = new Subdocument();
    sub2._id = { one: 'rock', two: 'roll' };
    sub2.title = 'rock-n-roll';

    a = new MongooseDocumentArray([sub1, sub2]);
    assert.notEqual(a.id({ one: 'rolling', two: 'rock' }).title, 'rock-n-roll');
    assert.equal(a.id({ one: 'rock', two: 'roll' }).title, 'rock-n-roll');

    let sub4 = new Subdocument();
    sub4.title = 'rock-n-roll';

    a = new MongooseDocumentArray([sub4]);
    let threw = false;
    try {
      a.id('i better not throw');
    } catch (err) {
      threw = err;
    }
    assert.equal(threw, false);

    sub4 = new Subdocument();
    sub4.title = 'rock-n-roll';

    a = new MongooseDocumentArray([sub4]);
    threw = false;
    try {
      a.id('i better not throw');
    } catch (err) {
      threw = err;
    }
    assert.equal(threw, false);
    // undefined and null should not match a nonexistent _id
    assert.strictEqual(null, a.id(undefined));
    assert.strictEqual(null, a.id(null));

    // test when _id is a populated document
    Custom = new Schema({
      title: { type: String }
    });

    const Custom1 = new Schema({}, { id: false });

    Subdocument = TestDoc(Custom);
    const Subdocument1 = TestDoc(Custom1);

    const sub = new Subdocument1();
    sub1 = new Subdocument1();
    sub.title = 'Hello again to all my friends';
    id = sub1._id.toString();
    setValue('_id', sub1, sub);

    a = new MongooseDocumentArray([sub]);
    assert.equal(a.id(id).title, 'Hello again to all my friends');


  });

  describe('inspect', function() {
    it('works with bad data', function() {
      let threw = false;
      const a = new MongooseDocumentArray([null]);
      try {
        a.inspect();
      } catch (err) {
        threw = true;
        console.error(err.stack);
      }
      assert.ok(!threw);

    });
  });

  describe('toObject', function() {
    it('works with bad data', function() {
      let threw = false;
      const a = new MongooseDocumentArray([null]);
      try {
        a.toObject();
      } catch (err) {
        threw = true;
        console.error(err.stack);
      }
      assert.ok(!threw);

    });
    it('passes options to its documents (gh-1415) (gh-4455)', function() {
      const subSchema = new Schema({
        title: { type: String }
      });

      subSchema.set('toObject', {
        transform: function(doc, ret) {
          // this should not be called because custom options are
          // passed during MongooseArray#toObject() calls
          ret.changed = 123;
          return ret;
        }
      });

      const db = mongoose.createConnection();
      const M = db.model('Test', { docs: [subSchema] });
      const m = new M();
      m.docs.push({ docs: [{ title: 'hello' }] });
      const delta = m.$__delta()[1];
      assert.equal(delta.$push.docs.$each[0].changed, undefined);


    });
    it('uses the correct transform (gh-1412)', function() {
      const SecondSchema = new Schema({});

      SecondSchema.set('toObject', {
        transform: function second(doc, ret) {
          ret.secondToObject = true;
          return ret;
        }
      });

      const FirstSchema = new Schema({
        second: [SecondSchema]
      });

      FirstSchema.set('toObject', {
        transform: function first(doc, ret) {
          ret.firstToObject = true;
          return ret;
        }
      });

      const First = db.model('Test', FirstSchema);
      const Second = db.model('Test1', SecondSchema);

      const first = new First({});

      first.second.push(new Second());
      first.second.push(new Second());
      const obj = first.toObject();

      assert.ok(obj.firstToObject);
      assert.ok(obj.second[0].secondToObject);
      assert.ok(obj.second[1].secondToObject);
      assert.ok(!obj.second[0].firstToObject);
      assert.ok(!obj.second[1].firstToObject);

    });
  });

  describe('create()', function() {
    it('works', function() {
      const a = new MongooseDocumentArray([]);
      assert.equal(typeof a.create, 'function');

      const schema = new Schema({ docs: [new Schema({ name: 'string' })] });
      mongoose.deleteModel(/Test/);
      const T = mongoose.model('Test', schema);
      const t = new T;
      assert.equal(typeof t.docs.create, 'function');
      const subdoc = t.docs.create({ name: 100 });
      assert.ok(subdoc._id);
      assert.equal(subdoc.name, '100');
      assert.ok(subdoc instanceof ArraySubdocument);

    });
  });

  describe('push()', function() {
    it('does not re-cast instances of its embedded doc', async function() {
      const child = new Schema({ name: String, date: Date });
      child.pre('save', function(next) {
        this.date = new Date();
        next();
      });
      const schema = new Schema({ children: [child] });
      const M = db.model('Test', schema);
      const m = new M();
      await m.save();
      let doc = await M.findById(m._id);
      const c = doc.children.create({ name: 'first' });
      assert.equal(c.date, undefined);
      doc.children.push(c);
      assert.equal(c.date, undefined);
      await doc.save();
      assert.ok(doc.children[doc.children.length - 1].date);
      assert.equal(c.date, doc.children[doc.children.length - 1].date);

      doc.children.push(c);
      doc.children.push(c);

      await doc.save();
      doc = await M.findById(m._id);
      assert.equal(doc.children.length, 3);
      doc.children.forEach(function(child) {
        assert.equal(doc.children[0].id, child.id);
      });
    });

    it('corrects #ownerDocument() and index if value was created with array.create() (gh-1385)', function() {
      const mg = new mongoose.Mongoose();
      const M = mg.model('Test', { docs: [{ name: String }] });
      const m = new M();
      const doc = m.docs.create({ name: 'test 1385' });
      assert.equal(String(doc.ownerDocument()._id), String(m._id));
      m.docs.push(doc);
      assert.equal(doc.ownerDocument()._id, String(m._id));
      assert.strictEqual(doc.__index, 0);

    });

    it('corrects #ownerDocument() if value was created with array.create() and set() (gh-7504)', function() {
      const M = db.model('Test', {
        docs: [{ name: { type: String, validate: () => false } }]
      });
      const m = new M({});
      const doc = m.docs.create({ name: 'test' });
      m.set('docs', [doc]);
      assert.equal(doc.ownerDocument()._id.toString(), String(m._id));
      assert.strictEqual(doc.__index, 0);

      assert.ok(m.validateSync().errors['docs.0.name']);

    });

    it('reports validation errors with correct index path (gh-7724)', function() {
      const parentSchema = new Schema({
        name: String,
        children: [{
          name: { type: String, required: true },
          gender: { type: String, required: true }
        }]
      });

      mongoose.deleteModel(/Test/);
      const Parent = mongoose.model('Test', parentSchema);

      const p = new Parent({
        name: 'Eddard Stark',
        children: [{ name: 'Arya Stark', gender: 'F' }]
      });

      p.children.push({ name: 'Sansa Stark' });
      p.children.push({ gender: 'M' });
      p.children.push({ name: 'Bran Stark', gender: 'M' });
      p.children.push({ name: 'Jon Snow' });

      const error = p.validateSync();
      assert.ok(error);
      assert.ok(error.errors);
      assert.deepStrictEqual(
        Object.keys(error.errors), ['children.1.gender', 'children.2.name', 'children.4.gender']);
    });
  });

  it('#push should work on ArraySubdocument more than 2 levels deep', async function() {
    const Comments = new Schema();
    Comments.add({
      title: String,
      comments: [Comments]
    });
    const BlogPost = new Schema({
      title: String,
      comments: [Comments]
    });

    const Post = db.model('BlogPost', BlogPost);

    let p = new Post({ title: 'comment nesting' });
    const c1 = p.comments.create({ title: 'c1' });
    const c2 = c1.comments.create({ title: 'c2' });
    const c3 = c2.comments.create({ title: 'c3' });

    p.comments.push(c1);
    c1.comments.push(c2);
    c2.comments.push(c3);

    await p.save();
    p = await Post.findById(p._id);

    p.comments[0].comments[0].comments[0].comments.push({ title: 'c4' });
    await p.save();
    p = await Post.findById(p._id);
    assert.equal(p.comments[0].comments[0].comments[0].comments[0].title, 'c4');
  });

  describe('required (gh-6364)', function() {
    it('on top level', function() {
      const calls = [];
      const schema = new Schema({
        docs: {
          type: [{ name: 'string' }],
          required: function() {
            calls.push(this);
            return true;
          }
        }
      });

      mongoose.deleteModel(/Test/);
      const T = mongoose.model('Test', schema);
      const t = new T({});
      t.docs.push({ name: 'test1' });
      t.docs.push({ name: 'test2' });

      t.validateSync();
      assert.equal(calls.length, 1);

    });

    it('in arr', function() {
      const calls = [];
      const schema = new Schema({
        docs: [{
          type: new Schema({ name: 'string' }),
          required: function() {
            calls.push(this);
            return true;
          }
        }]
      });

      mongoose.deleteModel(/Test/);
      const T = mongoose.model('Test', schema);
      const t = new T({});
      t.docs.push(null);
      t.docs.push({ name: 'test2' });

      const err = t.validateSync();
      assert.equal(calls.length, 2);
      assert.ok(err);
      assert.ok(err.errors['docs.0']);

    });
  });

  describe('invalidate()', function() {
    it('works', async function() {
      const schema = new Schema({ docs: [{ name: 'string' }] });
      schema.pre('validate', function(next) {
        const subdoc = this.docs[this.docs.length - 1];
        subdoc.invalidate('name', 'boo boo', '%');
        next();
      });
      mongoose.deleteModel(/Test/);
      const T = mongoose.model('Test', schema);
      const t = new T();
      t.docs.push({ name: 100 });

      const subdoc = t.docs.create({ name: 'yep' });
      assert.throws(function() {
        // has no parent array
        subdoc.invalidate('name', 'junk', 47);
      });
      await t.validate().catch(() => {});
      const e = t.errors['docs.0.name'];
      assert.ok(e);
      assert.equal(e.path, 'docs.0.name');
      assert.equal(e.kind, 'user defined');
      assert.equal(e.message, 'boo boo');
      assert.equal(e.value, '%');
    });

    it('handles validation failures', async function() {
      const nested = new Schema({ v: { type: Number, max: 30 } });
      const schema = new Schema({
        docs: [nested]
      });
      const M = db.model('Test', schema);
      const m = new M({ docs: [{ v: 900 }] });
      const err = await m.save().then(() => null, err => err);
      assert.equal(err.errors['docs.0.v'].value, 900);
    });

    it('clears listeners on cast error (gh-6723)', function() {
      const nested = new Schema({ v: Number });
      const schema = new Schema({
        docs: [nested]
      });
      const M = db.model('Test', schema);

      const m = new M({});
      m.docs = [50];
      m.docs = [];
      m.docs.push({ v: 50 });

      return m.save();
    });

    it('slice() copies parent and path (gh-8317)', function() {
      const nested = new Schema({ v: Number });
      const schema = new Schema({
        docs: [nested]
      });
      const M = db.model('Test', schema);

      const doc = M.hydrate({ docs: [{ v: 1 }, { v: 2 }] });
      let arr = doc.docs;
      arr = arr.slice();
      arr.splice(0, 1);

      assert.equal(arr.length, 1);
      assert.equal(doc.docs.length, 2);
    });

    it('map() works (gh-8317)', function() {
      const personSchema = new Schema({ friends: [{ name: { type: String } }] });
      mongoose.deleteModel(/Test/);
      const Person = mongoose.model('Test', personSchema);

      const person = new Person({ friends: [{ name: 'Hafez' }] });

      const friendsNames = person.friends.map(friend => friend.name);
      friendsNames.push('Sam');

      assert.equal(friendsNames.length, 2);
      assert.equal(friendsNames[1], 'Sam');
    });

    it('slice() after map() works (gh-8399)', function() {
      const MyModel = db.model('Test', Schema({
        myArray: [{ name: String }]
      }));

      const doc = new MyModel({
        myArray: [{ name: 'a' }, { name: 'b' }]
      });
      let myArray = doc.myArray;

      myArray = myArray.map(val => ({ name: `${val.name} mapped` }));

      myArray.splice(1, 1, { name: 'c' });
      myArray.splice(2, 0, { name: 'd' });

      assert.deepEqual(myArray.map(v => v.name), [
        'a mapped',
        'c',
        'd'
      ]);
    });

    it('unshift() after map() works (gh-9012)', function() {
      const MyModel = db.model('Test', Schema({
        myArray: [{ name: String }]
      }));

      const doc = new MyModel({
        myArray: [{ name: 'b' }, { name: 'c' }]
      });
      let myArray = doc.myArray;

      myArray = myArray.map(val => ({ name: `${val.name} mapped` }));

      myArray.unshift({ name: 'a inserted' });

      assert.deepEqual(myArray.map(v => v.name), [
        'a inserted',
        'b mapped',
        'c mapped'
      ]);
    });
  });

  it('cleans modified subpaths on splice() (gh-7249)', async function() {
    const childSchema = mongoose.Schema({
      name: { type: String, required: true }
    }, { _id: false });

    const parentSchema = new mongoose.Schema({
      children: [childSchema]
    });

    const Parent = db.model('Test', parentSchema);


    let parent = await Parent.create({
      children: [{ name: '1' }, { name: '2' }]
    });

    parent = await Parent.findOne();

    parent.children[1].name = '3';
    parent.children.splice(0, 1);

    await parent.save();

    parent = await Parent.findOne();

    assert.deepEqual(parent.toObject().children, [{ name: '3' }]);
  });

  it('modifies ownerDocument() on set (gh-8479)', function() {
    const nestedArraySchema = Schema({
      name: String,
      subDocArray: [{ name: String }]
    });

    const Model = db.model('Test', nestedArraySchema);

    const doc1 = new Model({
      name: 'doc1',
      subDocArray: [{
        name: 'subDoc'
      }]
    });
    const doc2 = new Model({
      name: 'doc2',
      subDocArray: [{
        name: 'subDoc'
      }]
    });

    doc1.subDocArray = doc2.subDocArray;

    assert.equal(doc2.subDocArray[0].ownerDocument().name, 'doc2');
    assert.equal(doc1.subDocArray[0].ownerDocument().name, 'doc1');
  });

  it('modifying subdoc path after `slice()` (gh-8356)', function() {
    mongoose.deleteModel(/Test/);
    const nestedArraySchema = Schema({
      name: String,
      subDocArray: [{ name: String }]
    });

    const Model = db.model('Test', nestedArraySchema);
    const doc = new Model().init({
      name: 'test',
      subDocArray: [{ name: 'foo' }, { name: 'bar' }]
    });

    doc.subDocArray.slice(1, 2)[0].name = 'baz';
    assert.ok(doc.isModified('subDocArray.1.name'));
  });

  it('supports setting to newly constructed array with no path or parent (gh-8108)', function() {
    const nestedArraySchema = Schema({
      name: String,
      subDocArray: [{ _id: false, name: String }]
    });

    const Model = db.model('Test', nestedArraySchema);

    const doc = new Model({ name: 'doc1' });
    doc.subDocArray = new DocumentArray([]);

    doc.subDocArray.push({ name: 'foo' });

    return doc.save().
      then(() => Model.findById(doc)).
      then(doc => assert.deepEqual(doc.toObject().subDocArray, [{ name: 'foo' }]));
  });

  it('keeps atomics after setting (gh-10272)', function() {
    const MyChildSchema = new Schema({
      name: String
    });

    const MyModelSchema = new Schema({
      children: [MyChildSchema]
    });

    const Test = db.model('Test', MyModelSchema);

    const doc = new Test();
    doc.init({
      children: [{ name: 'John' }, { name: 'Jane' }]
    });

    doc.children = [{ name: 'John' }];
    doc.children = doc.children.concat([]);
    doc.children.push({ name: 'Mary' });

    assert.ok(doc.children.$atomics().$set);
    assert.deepEqual(doc.children.$atomics().$set.map(v => v.name), ['John', 'Mary']);
  });

  it('handles `DocumentArray#create()` with populated paths (gh-10749)', async function() {
    const schema = new Schema({ subdoc: { ref: 'Test2', type: 'ObjectId' }, arr: [{ num: Number }] });
    const Test = mongoose.model('Test', schema);
    const Test2 = mongoose.model('Test2', Schema({ name: String }));

    const doc2 = new Test2({ name: 'test' });
    const doc = new Test({ subdoc: doc2, arr: [] });

    const subdoc = doc.arr.create({ num: '42' });
    await subdoc.validate();
    assert.strictEqual(subdoc.num, 42);

    doc.arr.push(subdoc);
    await doc.validate();
  });

  it('applies _id default (gh-12264)', function() {
    mongoose.deleteModel(/Test/);
    const nestedArraySchema = Schema({
      subDocArray: [{ name: String }]
    });

    const Model = db.model('Test', nestedArraySchema);
    const doc = new Model().init({
      subDocArray: [{ name: 'foo' }]
    });

    assert.ok(doc.subDocArray[0]._id instanceof mongoose.Types.ObjectId);
  });

  it('gets correct path when underneath map (gh-12997)', function() {
    const mapArraySchema = Schema({
      myMap: {
        type: Map,
        of: [Schema({ name: String })]
      }
    });

    const Model = db.model('Test', mapArraySchema);
    const doc = new Model({
      myMap: {
        foo: [{ name: 'bar' }]
      }
    });

    assert.equal(doc.myMap.get('foo').$path(), 'myMap.foo');
  });
});
