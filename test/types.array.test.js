/**
 * Module dependencies.
 */

'use strict';

const start = require('./common');

const assert = require('assert');
const mongodb = require('mongodb');
const mongoose = require('./common').mongoose;

const MongooseArray = mongoose.Types.Array;
const Schema = mongoose.Schema;

/**
 * Test.
 */

describe('types array', function() {
  let UserSchema;
  let PetSchema;
  let db;

  before(function() {
    UserSchema = new Schema({
      name: String,
      pets: [Schema.ObjectId]
    });

    PetSchema = new Schema({
      name: String
    });
    db = start();
  });

  after(async function() {
    await db.close();
  });

  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => require('./util').clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  it('behaves and quacks like an Array', function(done) {
    const a = new MongooseArray([]);

    assert.ok(a instanceof Array);
    assert.ok(a.isMongooseArray);
    assert.equal(Array.isArray(a), true);

    assert.deepEqual(a.$atomics().constructor, Object);
    done();
  });

  it('is `deepEqual()` another array (gh-7700)', function(done) {
    const Test = db.model('Test', new Schema({ arr: [String] }));
    const doc = new Test({ arr: ['test'] });

    assert.deepEqual(doc.arr, new MongooseArray(['test']));
    assert.deepEqual(doc.arr, ['test']);

    done();
  });

  describe('hasAtomics', function() {
    it('does not throw', function(done) {
      const b = new MongooseArray([12, 3, 4, 5]).filter(Boolean);
      let threw = false;

      try {
        b.hasAtomics;
      } catch (_) {
        threw = true;
      }

      assert.ok(!threw);

      const a = new MongooseArray([67, 8]).filter(Boolean);
      try {
        a.push(3, 4);
      } catch (_) {
        console.error(_);
        threw = true;
      }

      assert.ok(!threw);
      done();
    });
  });

  describe('indexOf()', function() {
    it('works', async function() {
      const User = db.model('User', UserSchema);
      const Pet = db.model('Pet', PetSchema);

      const tj = new User({ name: 'tj' });
      const tobi = new Pet({ name: 'tobi' });
      const loki = new Pet({ name: 'loki' });
      const jane = new Pet({ name: 'jane' });

      tj.pets.push(tobi);
      tj.pets.push(loki);
      tj.pets.push(jane);

      await Pet.create([tobi, loki, jane]);
      await tj.save();
      const user = await User.findOne({ name: 'tj' });
      assert.equal(user.pets.length, 3);
      assert.equal(user.pets.indexOf(tobi.id), 0);
      assert.equal(user.pets.indexOf(loki.id), 1);
      assert.equal(user.pets.indexOf(jane.id), 2);
      assert.equal(user.pets.indexOf(tobi._id), 0);
      assert.equal(user.pets.indexOf(loki._id), 1);
      assert.equal(user.pets.indexOf(jane._id), 2);
    });
  });

  describe('includes()', function() {
    it('works', async function() {
      const User = db.model('User', UserSchema);
      const Pet = db.model('Pet', PetSchema);

      const tj = new User({ name: 'tj' });
      const tobi = new Pet({ name: 'tobi' });
      const loki = new Pet({ name: 'loki' });
      const jane = new Pet({ name: 'jane' });

      tj.pets.push(tobi);
      tj.pets.push(loki);
      tj.pets.push(jane);

      await Pet.create([tobi, loki, jane]);
      await tj.save();
      const user = await User.findOne({ name: 'tj' });
      assert.equal(user.pets.length, 3);
      assert.equal(user.pets.includes(tobi.id), true);
      assert.equal(user.pets.includes(loki.id), true);
      assert.equal(user.pets.includes(jane.id), true);
      assert.equal(user.pets.includes(tobi.id, 1), false);
      assert.equal(user.pets.includes(loki.id, 1), true);
    });
  });

  describe('push()', function() {
    async function save(doc) {
      await doc.save();
      return doc.constructor.findById(doc._id);
    }

    it('works with numbers', async function() {
      const N = db.model('Test', Schema({ arr: [Number] }));
      const m = new N({ arr: [3, 4, 5, 6] });
      let doc = await save(m);
      assert.equal(doc.arr.length, 4);
      doc.arr.push(8);
      assert.strictEqual(8, doc.arr[doc.arr.length - 1]);
      assert.strictEqual(8, doc.arr[4]);

      doc = await save(doc);
      assert.equal(doc.arr.length, 5);
      assert.strictEqual(3, doc.arr[0]);
      assert.strictEqual(4, doc.arr[1]);
      assert.strictEqual(5, doc.arr[2]);
      assert.strictEqual(6, doc.arr[3]);
      assert.strictEqual(8, doc.arr[4]);
    });

    it('works with strings', async function() {
      const S = db.model('Test', Schema({ arr: [String] }));
      const m = new S({ arr: [3, 4, 5, 6] });
      let doc = await save(m);
      assert.equal(doc.arr.length, 4);
      doc.arr.push(8);
      assert.strictEqual('8', doc.arr[doc.arr.length - 1]);
      assert.strictEqual('8', doc.arr[4]);

      doc = await save(doc);
      assert.equal(doc.arr.length, 5);
      assert.strictEqual('3', doc.arr[0]);
      assert.strictEqual('4', doc.arr[1]);
      assert.strictEqual('5', doc.arr[2]);
      assert.strictEqual('6', doc.arr[3]);
      assert.strictEqual('8', doc.arr[4]);


    });

    it('works with buffers', async function() {
      const B = db.model('Test', Schema({ arr: [Buffer] }));
      const m = new B({ arr: [[0], Buffer.alloc(1)] });
      let doc = await save(m);
      assert.equal(doc.arr.length, 2);
      assert.ok(doc.arr[0].isMongooseBuffer);
      assert.ok(doc.arr[1].isMongooseBuffer);
      doc.arr.push('nice');
      assert.equal(doc.arr.length, 3);
      assert.ok(doc.arr[2].isMongooseBuffer);
      assert.strictEqual('nice', doc.arr[2].toString('utf8'));

      doc = await save(doc);
      assert.equal(doc.arr.length, 3);
      assert.ok(doc.arr[0].isMongooseBuffer);
      assert.ok(doc.arr[1].isMongooseBuffer);
      assert.ok(doc.arr[2].isMongooseBuffer);
      assert.strictEqual('\u0000', doc.arr[0].toString());
      assert.strictEqual('nice', doc.arr[2].toString());

    });

    it('works with mixed', async function() {
      const M = db.model('Test', Schema({ arr: [] }));

      const m = new M({ arr: [3, { x: 1 }, 'yes', [5]] });
      let doc = await save(m);
      assert.equal(doc.arr.length, 4);
      doc.arr.push(null);
      assert.equal(doc.arr.length, 5);
      assert.strictEqual(null, doc.arr[4]);

      doc = await save(doc);

      assert.equal(doc.arr.length, 5);
      assert.strictEqual(3, doc.arr[0]);
      assert.strictEqual(1, doc.arr[1].x);
      assert.strictEqual('yes', doc.arr[2]);
      assert.ok(Array.isArray(doc.arr[3]));
      assert.strictEqual(5, doc.arr[3][0]);
      assert.strictEqual(null, doc.arr[4]);

      doc.arr.push(Infinity);
      assert.equal(doc.arr.length, 6);
      assert.strictEqual(Infinity, doc.arr[5]);

      doc.arr.push(Buffer.alloc(0));
      assert.equal(doc.arr.length, 7);
      assert.strictEqual('', doc.arr[6].toString());

      doc = await save(doc);
    });

    it('works with sub-docs', async function() {
      const D = db.model('Test', Schema({ arr: [{ name: String }] }));

      const m = new D({ arr: [{ name: 'aaron' }, { name: 'moombahton ' }] });
      let doc = await save(m);
      assert.equal(doc.arr.length, 2);
      doc.arr.push({ name: 'Restrepo' });
      assert.equal(doc.arr.length, 3);
      assert.equal(doc.arr[2].name, 'Restrepo');

      doc = await save(doc);

      // validate
      assert.equal(doc.arr.length, 3);
      assert.equal(doc.arr[0].name, 'aaron');
      assert.equal(doc.arr[1].name, 'moombahton ');
      assert.equal(doc.arr[2].name, 'Restrepo');

    });

    it('applies setters (gh-3032)', async function() {
      const ST = db.model('Test', Schema({
        arr: [{
          type: String,
          lowercase: true
        }]
      }));

      const m = new ST({ arr: ['ONE', 'TWO'] });
      let doc = await save(m);
      assert.equal(doc.arr.length, 2);
      doc.arr.push('THREE');
      assert.strictEqual('one', doc.arr[0]);
      assert.strictEqual('two', doc.arr[1]);
      assert.strictEqual('three', doc.arr[2]);

      doc = await save(doc);
      assert.equal(doc.arr.length, 3);
      assert.strictEqual('one', doc.arr[0]);
      assert.strictEqual('two', doc.arr[1]);
      assert.strictEqual('three', doc.arr[2]);

    });
  });

  describe('splice()', function() {
    it('works', async function() {
      const schema = new Schema({ numbers: [Number] });
      const A = db.model('Test', schema);

      const a = new A({ numbers: [4, 5, 6, 7] });
      await a.save();
      let doc = await A.findById(a._id);
      const removed = doc.numbers.splice(1, 1, '10');
      assert.deepEqual(removed, [5]);
      assert.equal(typeof doc.numbers[1], 'number');
      assert.deepStrictEqual(doc.numbers.toObject(), [4, 10, 6, 7]);
      await doc.save();
      doc = await A.findById(a._id);
      assert.deepStrictEqual(doc.numbers.toObject(), [4, 10, 6, 7]);
    });

    it('on embedded docs', async function() {
      const schema = new Schema({ types: [new Schema({ type: String })] });
      const A = db.model('Test', schema);

      const a = new A({ types: [{ type: 'bird' }, { type: 'boy' }, { type: 'frog' }, { type: 'cloud' }] });
      await a.save();
      let doc = await A.findById(a._id);

      doc.types.$pop();

      const removed = doc.types.splice(1, 1);
      assert.equal(removed.length, 1);
      assert.equal(removed[0].type, 'boy');

      let obj = doc.types.toObject();
      assert.equal(obj[0].type, 'bird');
      assert.equal(obj[1].type, 'frog');

      await doc.save();
      doc = await A.findById(a._id);

      obj = doc.types.toObject();
      assert.equal(obj[0].type, 'bird');
      assert.equal(obj[1].type, 'frog');
    });
  });

  describe('unshift()', function() {
    it('works', async function() {
      const schema = new Schema({
        types: [new Schema({ type: String })],
        nums: [Number],
        strs: [String]
      });
      const A = db.model('Test', schema);

      const a = new A({
        types: [{ type: 'bird' }, { type: 'boy' }, { type: 'frog' }, { type: 'cloud' }],
        nums: [1, 2, 3],
        strs: 'one two three'.split(' ')
      });

      await a.save();
      let doc = await A.findById(a._id);

      const tlen = doc.types.unshift({ type: 'tree' });
      const nlen = doc.nums.unshift(0);
      const slen = doc.strs.unshift('zero');

      assert.equal(tlen, 5);
      assert.equal(nlen, 4);
      assert.equal(slen, 4);

      doc.types.push({ type: 'worm' });
      let obj = doc.types.toObject();
      assert.equal(obj[0].type, 'tree');
      assert.equal(obj[1].type, 'bird');
      assert.equal(obj[2].type, 'boy');
      assert.equal(obj[3].type, 'frog');
      assert.equal(obj[4].type, 'cloud');
      assert.equal(obj[5].type, 'worm');

      obj = doc.nums.toObject();
      assert.equal(obj[0].valueOf(), 0);
      assert.equal(obj[1].valueOf(), 1);
      assert.equal(obj[2].valueOf(), 2);
      assert.equal(obj[3].valueOf(), 3);

      obj = doc.strs.toObject();
      assert.equal(obj[0], 'zero');
      assert.equal(obj[1], 'one');
      assert.equal(obj[2], 'two');
      assert.equal(obj[3], 'three');

      await doc.save();
      doc = await A.findById(a._id);

      obj = doc.types.toObject();
      assert.equal(obj[0].type, 'tree');
      assert.equal(obj[1].type, 'bird');
      assert.equal(obj[2].type, 'boy');
      assert.equal(obj[3].type, 'frog');
      assert.equal(obj[4].type, 'cloud');
      assert.equal(obj[5].type, 'worm');

      obj = doc.nums.toObject();
      assert.equal(obj[0].valueOf(), 0);
      assert.equal(obj[1].valueOf(), 1);
      assert.equal(obj[2].valueOf(), 2);
      assert.equal(obj[3].valueOf(), 3);

      obj = doc.strs.toObject();
      assert.equal(obj[0], 'zero');
      assert.equal(obj[1], 'one');
      assert.equal(obj[2], 'two');
      assert.equal(obj[3], 'three');

    });

    it('applies setters (gh-3032)', async function() {
      const ST = db.model('Test', Schema({
        arr: [{
          type: String,
          lowercase: true
        }]
      }));
      const m = new ST({ arr: ['ONE', 'TWO'] });
      const doc = await m.save();
      assert.equal(doc.arr.length, 2);
      doc.arr.unshift('THREE');
      assert.strictEqual('three', doc.arr[0]);
      assert.strictEqual('one', doc.arr[1]);
      assert.strictEqual('two', doc.arr[2]);

      await doc.save();
      assert.equal(doc.arr.length, 3);
      assert.strictEqual('three', doc.arr[0]);
      assert.strictEqual('one', doc.arr[1]);
      assert.strictEqual('two', doc.arr[2]);


    });
  });

  describe('shift()', function() {
    it('works', async function() {
      const schema = new Schema({
        types: [new Schema({ type: String })],
        nums: [Number],
        strs: [String]
      });

      const A = db.model('Test', schema);

      const a = new A({
        types: [{ type: 'bird' }, { type: 'boy' }, { type: 'frog' }, { type: 'cloud' }],
        nums: [1, 2, 3],
        strs: 'one two three'.split(' ')
      });

      await a.save();
      let doc = await A.findById(a._id);

      const t = doc.types.shift();
      const n = doc.nums.shift();
      const s = doc.strs.shift();

      assert.equal(t.type, 'bird');
      assert.equal(n, 1);
      assert.equal(s, 'one');

      let obj = doc.types.toObject();
      assert.equal(obj[0].type, 'boy');
      assert.equal(obj[1].type, 'frog');
      assert.equal(obj[2].type, 'cloud');

      doc.nums.push(4);
      obj = doc.nums.toObject();
      assert.equal(obj[0].valueOf(), 2);
      assert.equal(obj[1].valueOf(), 3);
      assert.equal(obj[2].valueOf(), 4);

      obj = doc.strs.toObject();
      assert.equal(obj[0], 'two');
      assert.equal(obj[1], 'three');

      await doc.save();
      doc = await A.findById(a._id);

      obj = doc.types.toObject();
      assert.equal(obj[0].type, 'boy');
      assert.equal(obj[1].type, 'frog');
      assert.equal(obj[2].type, 'cloud');

      obj = doc.nums.toObject();
      assert.equal(obj[0].valueOf(), 2);
      assert.equal(obj[1].valueOf(), 3);
      assert.equal(obj[2].valueOf(), 4);

      obj = doc.strs.toObject();
      assert.equal(obj[0], 'two');
      assert.equal(obj[1], 'three');

    });
  });

  describe('$shift', function() {
    it('works', async function() {
      // atomic shift uses $pop -1
      const painting = new Schema({ colors: [] });
      const Painting = db.model('Test', painting);
      const p = new Painting({ colors: ['blue', 'green', 'yellow'] });
      await p.save();

      let doc = await Painting.findById(p);
      assert.equal(doc.colors.length, 3);
      let color = doc.colors.$shift();
      assert.equal(doc.colors.length, 2);
      assert.equal(color, 'blue');
      // MongoDB pop command can only be called once per save, each
      // time only removing one element.
      color = doc.colors.$shift();
      assert.equal(color, undefined);
      assert.equal(doc.colors.length, 2);
      await doc.save();
      color = doc.colors.$shift();
      assert.equal(doc.colors.length, 1);
      assert.equal(color, 'green');
      await doc.save();
      doc = await Painting.findById(doc);
      assert.equal(doc.colors.length, 1);
      assert.equal(doc.colors[0], 'yellow');
    });
  });

  describe('pop()', function() {
    it('works', async function() {
      const schema = new Schema({
        types: [new Schema({ type: String })],
        nums: [Number],
        strs: [String]
      });

      const A = db.model('Test', schema);

      const a = new A({
        types: [{ type: 'bird' }, { type: 'boy' }, { type: 'frog' }, { type: 'cloud' }],
        nums: [1, 2, 3],
        strs: 'one two three'.split(' ')
      });

      await a.save();
      let doc = await A.findById(a._id);

      const t = doc.types.pop();
      const n = doc.nums.pop();
      const s = doc.strs.pop();

      assert.equal(t.type, 'cloud');
      assert.equal(n, 3);
      assert.equal(s, 'three');

      let obj = doc.types.toObject();
      assert.equal(obj[0].type, 'bird');
      assert.equal(obj[1].type, 'boy');
      assert.equal(obj[2].type, 'frog');

      doc.nums.push(4);
      obj = doc.nums.toObject();
      assert.equal(obj[0].valueOf(), 1);
      assert.equal(obj[1].valueOf(), 2);
      assert.equal(obj[2].valueOf(), 4);

      obj = doc.strs.toObject();
      assert.equal(obj[0], 'one');
      assert.equal(obj[1], 'two');

      await doc.save();
      doc = await A.findById(a._id);

      obj = doc.types.toObject();
      assert.equal(obj[0].type, 'bird');
      assert.equal(obj[1].type, 'boy');
      assert.equal(obj[2].type, 'frog');

      obj = doc.nums.toObject();
      assert.equal(obj[0].valueOf(), 1);
      assert.equal(obj[1].valueOf(), 2);
      assert.equal(obj[2].valueOf(), 4);

      obj = doc.strs.toObject();
      assert.equal(obj[0], 'one');
      assert.equal(obj[1], 'two');

    });
  });

  describe('pull()', function() {
    it('works', async function() {
      const catschema = new Schema({ name: String });
      const Cat = db.model('Cat', catschema);
      const schema = new Schema({
        a: [{ type: Schema.ObjectId, ref: 'Cat' }]
      });
      const A = db.model('Test', schema);
      const cat = new Cat({ name: 'peanut' });
      await cat.save();

      const a = new A({ a: [cat._id] });
      await a.save();

      const doc = await A.findById(a);
      assert.equal(doc.a.length, 1);
      doc.a.pull(cat.id);
      assert.equal(doc.a.length, 0);

    });

    it('handles pulling with no _id (gh-3341)', async function() {
      const personSchema = new Schema({
        name: String,
        role: String
      }, { _id: false });
      const bandSchema = new Schema({
        name: String,
        members: [personSchema]
      });

      const Band = db.model('Test', bandSchema);

      let gnr = new Band({
        name: 'Guns N\' Roses',
        members: [
          { name: 'Axl', role: 'Lead Singer' },
          { name: 'Slash', role: 'Guitar' },
          { name: 'Izzy', role: 'Guitar' },
          { name: 'Duff', role: 'Bass' },
          { name: 'Adler', role: 'Drums' }
        ]
      });

      await gnr.save();
      gnr.members.pull({ name: 'Slash', role: 'Guitar' });
      await gnr.save();
      assert.equal(gnr.members.length, 4);
      assert.equal(gnr.members[0].name, 'Axl');
      assert.equal(gnr.members[1].name, 'Izzy');
      assert.equal(gnr.members[2].name, 'Duff');
      assert.equal(gnr.members[3].name, 'Adler');
      gnr = await Band.findById(gnr._id);
      assert.equal(gnr.members.length, 4);
      assert.equal(gnr.members[0].name, 'Axl');
      assert.equal(gnr.members[1].name, 'Izzy');
      assert.equal(gnr.members[2].name, 'Duff');
      assert.equal(gnr.members[3].name, 'Adler');

    });

    it('properly works with undefined', async function() {
      const catschema = new Schema({ name: String, colors: [{ hex: String }] });
      const Cat = db.model('Test', catschema);

      const cat = new Cat({ name: 'peanut', colors: [
        { hex: '#FFF' }, { hex: '#000' }, null
      ] });

      await cat.save();

      cat.colors.pull(undefined); // converted to null (as mongodb does)
      assert.equal(cat.colors.length, 2);
      assert.equal(cat.colors[0].hex, '#FFF');
      assert.equal(cat.colors[1].hex, '#000');

      await cat.save();

      const doc = await Cat.findById(cat._id);
      assert.equal(doc.colors.length, 2);
      assert.equal(doc.colors[0].hex, '#FFF');
      assert.equal(doc.colors[1].hex, '#000');
    });

    it('avoids adding default paths to query filter (gh-12294)', async function() {
      const catschema = new Schema({
        name: String,
        colors: [{
          _id: false,
          hex: { type: String, default: '#ffffff' },
          properties: {
            hue: { type: Number, default: 0 }
          },
          name: String
        }]
      });
      const Cat = db.model('Test', catschema);

      const cat = new Cat({});
      cat.init({
        name: 'Garfield',
        colors: [{ name: 'Orange' }]
      });

      cat.colors.pull({ name: 'Orange' });
      assert.deepStrictEqual(cat.colors.$__getAtomics(), [[
        '$pull',
        { $or: [{ name: 'Orange' }] }
      ]]);
    });

    it('avoids adding default paths to query filter with _id (gh-12294)', async function() {
      const catschema = new Schema({
        name: String,
        colors: [{
          hex: { type: String, default: '#ffffff' },
          name: String
        }]
      });
      const Cat = db.model('Test', catschema);

      const cat = new Cat({});
      cat.init({
        name: 'Garfield',
        colors: [{ name: 'Orange' }]
      });

      cat.colors.pull({ name: 'Orange' });
      assert.deepStrictEqual(cat.colors.$__getAtomics(), [[
        '$pull',
        { $or: [{ name: 'Orange' }] }
      ]]);
    });
  });

  describe('$pop()', function() {
    it('works', async function() {
      const painting = new Schema({ colors: [] });
      const Painting = db.model('Test', painting);
      const p = new Painting({ colors: ['blue', 'green', 'yellow'] });
      await p.save();
      let doc = await Painting.findById(p);
      assert.equal(doc.colors.length, 3);
      let color = doc.colors.$pop();
      assert.equal(doc.colors.length, 2);
      assert.equal(color, 'yellow');
      // MongoDB pop command can only be called once per save, each
      // time only removing one element.
      color = doc.colors.$pop();
      assert.equal(color, undefined);
      assert.equal(doc.colors.length, 2);
      assert.ok(!('$set' in doc.colors.$atomics()), 'invalid $atomic op used');
      await doc.save();
      color = doc.colors.$pop();
      assert.equal(doc.colors.length, 1);
      assert.equal(color, 'green');
      await doc.save();
      doc = await Painting.findById(doc);
      assert.equal(doc.colors.length, 1);
      assert.equal(doc.colors[0], 'blue');
    });
  });

  describe('addToSet()', function() {
    it('works', async function() {
      const e = new Schema({ name: String, arr: [] });
      const schema = new Schema({
        num: [Number],
        str: [String],
        doc: [e],
        date: [Date],
        id: [Schema.ObjectId]
      });

      const M = db.model('Test', schema);
      let m = new M();

      m.num.push(1, 2, 3);
      m.str.push('one', 'two', 'tres');
      m.doc.push({ name: 'Dubstep', arr: [1] }, { name: 'Polka', arr: [{ x: 3 }] });

      const d1 = new Date();
      const d2 = new Date(+d1 + 60000);
      const d3 = new Date(+d1 + 30000);
      const d4 = new Date(+d1 + 20000);
      const d5 = new Date(+d1 + 90000);
      const d6 = new Date(+d1 + 10000);
      m.date.push(d1, d2);

      const id1 = new mongoose.Types.ObjectId();
      const id2 = new mongoose.Types.ObjectId();
      const id3 = new mongoose.Types.ObjectId();
      const id4 = new mongoose.Types.ObjectId();
      const id5 = new mongoose.Types.ObjectId();
      const id6 = new mongoose.Types.ObjectId();

      m.id.push(id1, id2);

      m.num.addToSet(3, 4, 5);
      assert.equal(m.num.length, 5);
      m.str.addToSet('four', 'five', 'two');
      assert.equal(m.str.length, 5);
      m.id.addToSet(id2, id3);
      assert.equal(m.id.length, 3);
      m.doc.addToSet(m.doc[0]);
      assert.equal(m.doc.length, 2);
      m.doc.addToSet({ name: 'Waltz', arr: [1] }, m.doc[0]);
      assert.equal(m.doc.length, 3);
      assert.equal(m.date.length, 2);
      m.date.addToSet(d1);
      assert.equal(m.date.length, 2);
      m.date.addToSet(d3);
      assert.equal(m.date.length, 3);

      await m.save();
      m = await M.findById(m);

      assert.equal(m.num.length, 5);
      assert.ok(~m.num.indexOf(1));
      assert.ok(~m.num.indexOf(2));
      assert.ok(~m.num.indexOf(3));
      assert.ok(~m.num.indexOf(4));
      assert.ok(~m.num.indexOf(5));

      assert.equal(m.str.length, 5);
      assert.ok(~m.str.indexOf('one'));
      assert.ok(~m.str.indexOf('two'));
      assert.ok(~m.str.indexOf('tres'));
      assert.ok(~m.str.indexOf('four'));
      assert.ok(~m.str.indexOf('five'));

      assert.equal(m.id.length, 3);
      assert.ok(m.id.find(id => id.toString() === id1.toString()));
      assert.ok(m.id.find(id => id.toString() === id2.toString()));
      assert.ok(m.id.find(id => id.toString() === id3.toString()));

      assert.equal(m.date.length, 3);
      assert.ok(~m.date.indexOf(d1.toString()));
      assert.ok(~m.date.indexOf(d2.toString()));
      assert.ok(~m.date.indexOf(d3.toString()));

      assert.equal(m.doc.length, 3);
      assert.ok(m.doc.some(function(v) {
        return v.name === 'Waltz';
      }));
      assert.ok(m.doc.some(function(v) {
        return v.name === 'Dubstep';
      }));
      assert.ok(m.doc.some(function(v) {
        return v.name === 'Polka';
      }));

      // test single $addToSet
      m.num.addToSet(3, 4, 5, 6);
      assert.equal(m.num.length, 6);
      m.str.addToSet('four', 'five', 'two', 'six');
      assert.equal(m.str.length, 6);
      m.id.addToSet(id2, id3, id4);
      assert.equal(m.id.length, 4);

      m.date.addToSet(d1, d3, d4);
      assert.equal(m.date.length, 4);

      m.doc.addToSet(m.doc[0], { name: '8bit' });
      assert.equal(m.doc.length, 4);

      await m.save();

      m = await M.findById(m);

      assert.equal(m.num.length, 6);
      assert.ok(~m.num.indexOf(1));
      assert.ok(~m.num.indexOf(2));
      assert.ok(~m.num.indexOf(3));
      assert.ok(~m.num.indexOf(4));
      assert.ok(~m.num.indexOf(5));
      assert.ok(~m.num.indexOf(6));

      assert.equal(m.str.length, 6);
      assert.ok(~m.str.indexOf('one'));
      assert.ok(~m.str.indexOf('two'));
      assert.ok(~m.str.indexOf('tres'));
      assert.ok(~m.str.indexOf('four'));
      assert.ok(~m.str.indexOf('five'));
      assert.ok(~m.str.indexOf('six'));

      assert.equal(m.id.length, 4);
      assert.ok(m.id.find(id => id.toString() === id1.toString()));
      assert.ok(m.id.find(id => id.toString() === id2.toString()));
      assert.ok(m.id.find(id => id.toString() === id3.toString()));
      assert.ok(m.id.find(id => id.toString() === id4.toString()));

      assert.equal(m.date.length, 4);
      assert.ok(~m.date.indexOf(d1.toString()));
      assert.ok(~m.date.indexOf(d2.toString()));
      assert.ok(~m.date.indexOf(d3.toString()));
      assert.ok(~m.date.indexOf(d4.toString()));

      assert.equal(m.doc.length, 4);
      assert.ok(m.doc.some(function(v) {
        return v.name === 'Waltz';
      }));
      assert.ok(m.doc.some(function(v) {
        return v.name === 'Dubstep';
      }));
      assert.ok(m.doc.some(function(v) {
        return v.name === 'Polka';
      }));
      assert.ok(m.doc.some(function(v) {
        return v.name === '8bit';
      }));

      // test multiple $addToSet
      m.num.addToSet(7, 8);
      assert.equal(m.num.length, 8);
      m.str.addToSet('seven', 'eight');
      assert.equal(m.str.length, 8);
      m.id.addToSet(id5, id6);
      assert.equal(m.id.length, 6);

      m.date.addToSet(d5, d6);
      assert.equal(m.date.length, 6);

      m.doc.addToSet(m.doc[1], { name: 'BigBeat' }, { name: 'Funk' });
      assert.equal(m.doc.length, 6);

      await m.save();

      m = await M.findById(m);

      assert.equal(m.num.length, 8);
      assert.ok(~m.num.indexOf(1));
      assert.ok(~m.num.indexOf(2));
      assert.ok(~m.num.indexOf(3));
      assert.ok(~m.num.indexOf(4));
      assert.ok(~m.num.indexOf(5));
      assert.ok(~m.num.indexOf(6));
      assert.ok(~m.num.indexOf(7));
      assert.ok(~m.num.indexOf(8));

      assert.equal(m.str.length, 8);
      assert.ok(~m.str.indexOf('one'));
      assert.ok(~m.str.indexOf('two'));
      assert.ok(~m.str.indexOf('tres'));
      assert.ok(~m.str.indexOf('four'));
      assert.ok(~m.str.indexOf('five'));
      assert.ok(~m.str.indexOf('six'));
      assert.ok(~m.str.indexOf('seven'));
      assert.ok(~m.str.indexOf('eight'));

      assert.equal(m.id.length, 6);
      assert.ok(~m.id.indexOf(id1));
      assert.ok(~m.id.indexOf(id2));
      assert.ok(~m.id.indexOf(id3));
      assert.ok(~m.id.indexOf(id4));
      assert.ok(~m.id.indexOf(id5));
      assert.ok(~m.id.indexOf(id6));

      assert.equal(m.date.length, 6);
      assert.ok(~m.date.indexOf(d1.toString()));
      assert.ok(~m.date.indexOf(d2.toString()));
      assert.ok(~m.date.indexOf(d3.toString()));
      assert.ok(~m.date.indexOf(d4.toString()));
      assert.ok(~m.date.indexOf(d5.toString()));
      assert.ok(~m.date.indexOf(d6.toString()));

      assert.equal(m.doc.length, 6);
      assert.ok(m.doc.some(function(v) {
        return v.name === 'Waltz';
      }));
      assert.ok(m.doc.some(function(v) {
        return v.name === 'Dubstep';
      }));
      assert.ok(m.doc.some(function(v) {
        return v.name === 'Polka';
      }));
      assert.ok(m.doc.some(function(v) {
        return v.name === '8bit';
      }));
      assert.ok(m.doc.some(function(v) {
        return v.name === 'BigBeat';
      }));
      assert.ok(m.doc.some(function(v) {
        return v.name === 'Funk';
      }));
    });

    it('handles sub-documents that do not have an _id gh-1973', async function() {
      const e = new Schema({ name: String, arr: [] }, { _id: false });
      const schema = new Schema({
        doc: [e]
      });

      const M = db.model('Test', schema);
      const m = new M();

      m.doc.addToSet({ name: 'Rap' });
      await m.save();
      assert.equal(m.doc.length, 1);
      assert.equal(m.doc[0].name, 'Rap');
      m.doc.addToSet({ name: 'House' });
      assert.equal(m.doc.length, 2);
      await m.save();
      assert.equal(m.doc.length, 2);
      assert.ok(m.doc.some(function(v) {
        return v.name === 'Rap';
      }));
      assert.ok(m.doc.some(function(v) {
        return v.name === 'House';
      }));
    });

    it('applies setters (gh-3032)', async function() {
      const ST = db.model('Test', Schema({
        arr: [{
          type: String,
          lowercase: true
        }]
      }));
      const m = new ST({ arr: ['ONE', 'TWO'] });
      const doc = await m.save();
      assert.equal(doc.arr.length, 2);
      doc.arr.addToSet('THREE');
      assert.strictEqual('one', doc.arr[0]);
      assert.strictEqual('two', doc.arr[1]);
      assert.strictEqual('three', doc.arr[2]);

      await doc.save();
      assert.equal(doc.arr.length, 3);
      assert.strictEqual('one', doc.arr[0]);
      assert.strictEqual('two', doc.arr[1]);
      assert.strictEqual('three', doc.arr[2]);
    });
  });

  describe('options', function() {
    let arrOptions;
    let docArrOptions;

    beforeEach(function() {
      arrOptions = Object.assign({}, mongoose.Schema.Types.Array.options);
      docArrOptions = Object.assign({}, mongoose.Schema.Types.DocumentArray.options);

      mongoose.Schema.Types.Array.options.castNonArrays = false;
      mongoose.Schema.Types.DocumentArray.options.castNonArrays = false;
    });

    afterEach(function() {
      mongoose.Schema.Types.Array.options = arrOptions;
      mongoose.Schema.Types.DocumentArray.options = docArrOptions;
    });

    it('castNonArrays (gh-7371) (gh-7479)', function() {
      const schema = new Schema({ arr: [String], docArr: [{ name: String }] });
      const Model = db.model('Test', schema);

      let doc = new Model({ arr: 'fail', docArr: { name: 'fail' } });
      assert.ok(doc.validateSync().errors);
      assert.equal(doc.validateSync().errors['arr'].name, 'CastError');
      assert.equal(doc.validateSync().errors['docArr'].name, 'CastError');

      doc = new Model({ arr: ['good'] });
      assert.ifError(doc.validateSync());
      doc.arr.push('foo');
      assert.ifError(doc.validateSync());
      assert.deepEqual(doc.arr.toObject(), ['good', 'foo']);

      // test also having the property option set

      // the following should work because "castNonArrays" (property option) overwrites global
      const bothSchema = new Schema({ arr: { castNonArrays: true, type: [String] }, docArr: { castNonArrays: true, type: [{ name: String }] } });
      const bothModel = db.model('Test2', bothSchema);
      let bothdoc = new bothModel({ arr: 'fail', docArr: { name: 'fail' } });
      assert.ifError(doc.validateSync());

      bothdoc = new bothModel({ arr: ['good'] });
      assert.ifError(bothdoc.validateSync());
      bothdoc.arr.push('foo');
      assert.ifError(bothdoc.validateSync());
      assert.deepEqual(bothdoc.arr.toObject(), ['good', 'foo']);

      return Promise.resolve();
    });

    it('works with $addToSet and $push (gh-7479)', async function() {
      const schema = new Schema({
        arr: [mongoose.Schema.Types.ObjectId]
      });
      const Model = db.model('Test', schema);
      await Model.create({ arr: [] });

      const oid = new mongoose.Types.ObjectId();
      await Model.updateMany({}, {
        $addToSet: { arr: oid }
      });
      let raw = await Model.collection.findOne();
      assert.equal(raw.arr[0].toHexString(), oid.toHexString());

      await Model.updateMany({}, {
        $push: { arr: oid }
      });
      raw = await Model.collection.findOne();
      assert.equal(raw.arr[1].toHexString(), oid.toHexString());
    });
  });

  describe('nonAtomicPush()', function() {
    it('works', async function() {
      const U = db.model('User', UserSchema);
      const ID = mongoose.Types.ObjectId;

      const u = new U({ name: 'banana', pets: [new ID()] });
      assert.equal(u.pets.length, 1);
      u.pets.nonAtomicPush(new ID());
      assert.equal(u.pets.length, 2);
      await u.save();
      await U.findById(u._id);
      assert.equal(u.pets.length, 2);
      const id0 = u.pets[0];
      const id1 = u.pets[1];
      const id2 = new ID();
      u.pets.pull(id0);
      u.pets.nonAtomicPush(id2);
      assert.equal(u.pets.length, 2);
      assert.equal(u.pets[0].toString(), id1.toString());
      assert.equal(u.pets[1].toString(), id2.toString());
      await u.save();
      await U.findById(u._id);
      assert.equal(u.pets.length, 2);
      assert.equal(u.pets[0].toString(), id1.toString());
      assert.equal(u.pets[1].toString(), id2.toString());

    });
  });

  describe('sort()', function() {
    it('order should be saved', async function() {
      const M = db.model('Test', new Schema({ x: [Number] }));
      let m = new M({ x: [1, 4, 3, 2] });
      await m.save();
      m = await M.findById(m);

      assert.equal(m.x[0], 1);
      assert.equal(m.x[1], 4);
      assert.equal(m.x[2], 3);
      assert.equal(m.x[3], 2);

      m.x.sort();

      await m.save();
      m = await M.findById(m);

      assert.equal(m.x[0], 1);
      assert.equal(m.x[1], 2);
      assert.equal(m.x[2], 3);
      assert.equal(m.x[3], 4);

      m.x.sort(function(a, b) {
        return b - a;
      });

      await m.save();
      m = await M.findById(m);

      assert.equal(m.x[0], 4);
      assert.equal(m.x[1], 3);
      assert.equal(m.x[2], 2);
      assert.equal(m.x[3], 1);

    });
  });

  describe('set()', function() {
    async function save(doc) {
      await doc.save();
      return doc.constructor.findById(doc._id);
    }

    it('works combined with other ops', async function() {
      const N = db.model('Test', Schema({ arr: [Number] }));

      const m = new N({ arr: [3, 4, 5, 6] });
      let doc = await save(m);

      assert.equal(doc.arr.length, 4);
      doc.arr.push(20);
      doc.arr.set(2, 10);
      assert.equal(doc.arr.length, 5);
      assert.equal(doc.arr[2], 10);
      assert.equal(doc.arr[4], 20);

      doc = await save(doc);
      assert.equal(doc.arr.length, 5);
      assert.equal(doc.arr[0], 3);
      assert.equal(doc.arr[1], 4);
      assert.equal(doc.arr[2], 10);
      assert.equal(doc.arr[3], 6);
      assert.equal(doc.arr[4], 20);

      doc.arr.$pop();
      assert.equal(doc.arr.length, 4);
      doc.arr.set(4, 99);
      assert.equal(doc.arr.length, 5);
      assert.equal(doc.arr[4], 99);
      doc.arr.remove(10);
      assert.equal(doc.arr.length, 4);
      assert.equal(doc.arr[0], 3);
      assert.equal(doc.arr[1], 4);
      assert.equal(doc.arr[2], 6);
      assert.equal(doc.arr[3], 99);

      doc = await save(doc);
      assert.equal(doc.arr.length, 4);
      assert.equal(doc.arr[0], 3);
      assert.equal(doc.arr[1], 4);
      assert.equal(doc.arr[2], 6);
      assert.equal(doc.arr[3], 99);

    });

    it('works with numbers', async function() {
      const N = db.model('Test', Schema({ arr: [Number] }));

      const m = new N({ arr: [3, 4, 5, 6] });
      let doc = await save(m);
      assert.equal(doc.arr.length, 4);
      doc.arr.set(2, 10);
      assert.equal(doc.arr.length, 4);
      assert.equal(doc.arr[2], 10);
      doc.arr.set(doc.arr.length, 11);
      assert.equal(doc.arr.length, 5);
      assert.equal(doc.arr[4], 11);

      doc = await save(doc);
      assert.equal(doc.arr.length, 5);
      assert.equal(doc.arr[0], 3);
      assert.equal(doc.arr[1], 4);
      assert.equal(doc.arr[2], 10);
      assert.equal(doc.arr[3], 6);
      assert.equal(doc.arr[4], 11);

      // casting + setting beyond current array length
      doc.arr.set(8, '1');
      assert.equal(doc.arr.length, 9);
      assert.strictEqual(1, doc.arr[8]);
      assert.equal(doc.arr[7], undefined);

      doc = await save(doc);

      assert.equal(doc.arr.length, 9);
      assert.equal(doc.arr[0], 3);
      assert.equal(doc.arr[1], 4);
      assert.equal(doc.arr[2], 10);
      assert.equal(doc.arr[3], 6);
      assert.equal(doc.arr[4], 11);
      assert.equal(doc.arr[5], null);
      assert.equal(doc.arr[6], null);
      assert.equal(doc.arr[7], null);
      assert.strictEqual(1, doc.arr[8]);

    });

    it('works with strings', async function() {
      const S = db.model('Test', Schema({ arr: [String] }));

      const m = new S({ arr: [3, 4, 5, 6] });
      let doc = await save(m);
      assert.equal(doc.arr.length, '4');
      doc.arr[2] = 10;
      assert.equal(doc.arr.length, 4);
      assert.equal(doc.arr[2], '10');
      doc.arr.set(doc.arr.length, '11');
      assert.equal(doc.arr.length, 5);
      assert.equal(doc.arr[4], '11');

      doc = await save(doc);
      assert.equal(doc.arr.length, 5);
      assert.equal(doc.arr[0], '3');
      assert.equal(doc.arr[1], '4');
      assert.equal(doc.arr[2], '10');
      assert.equal(doc.arr[3], '6');
      assert.equal(doc.arr[4], '11');

      // casting + setting beyond current array length
      doc.arr.set(8, 'yo');
      assert.equal(doc.arr.length, 9);
      assert.strictEqual('yo', doc.arr[8]);
      assert.equal(doc.arr[7], undefined);

      doc = await save(doc);

      assert.equal(doc.arr.length, '9');
      assert.equal(doc.arr[0], '3');
      assert.equal(doc.arr[1], '4');
      assert.equal(doc.arr[2], '10');
      assert.equal(doc.arr[3], '6');
      assert.equal(doc.arr[4], '11');
      assert.equal(doc.arr[5], null);
      assert.equal(doc.arr[6], null);
      assert.equal(doc.arr[7], null);
      assert.strictEqual('yo', doc.arr[8]);

    });

    it('works with buffers', async function() {
      const B = db.model('Test', Schema({ arr: [Buffer] }));

      const m = new B({ arr: [[0], Buffer.alloc(1)] });
      let doc = await save(m);
      assert.equal(doc.arr.length, 2);
      assert.ok(doc.arr[0].isMongooseBuffer);
      assert.ok(doc.arr[1].isMongooseBuffer);
      doc.arr.set(1, 'nice');
      assert.equal(doc.arr.length, 2);
      assert.ok(doc.arr[1].isMongooseBuffer);
      assert.equal(doc.arr[1].toString('utf8'), 'nice');
      doc.arr.set(doc.arr.length, [11]);
      assert.equal(doc.arr.length, 3);
      assert.equal(doc.arr[2][0], 11);

      doc = await save(doc);
      assert.equal(doc.arr.length, 3);
      assert.ok(doc.arr[0].isMongooseBuffer);
      assert.ok(doc.arr[1].isMongooseBuffer);
      assert.ok(doc.arr[2].isMongooseBuffer);
      assert.equal(doc.arr[0].toString(), '\u0000');
      assert.equal(doc.arr[1].toString(), 'nice');
      assert.equal(doc.arr[2][0], 11);

    });

    it('works with mixed', async function() {
      const M = db.model('Test', Schema({ arr: [] }));

      const m = new M({ arr: [3, { x: 1 }, 'yes', [5]] });
      let doc = await save(m);
      assert.equal(doc.arr.length, 4);
      doc.arr.set(2, null);
      assert.equal(doc.arr.length, 4);
      assert.equal(doc.arr[2], null);
      doc.arr.set(doc.arr.length, 'last');
      assert.equal(doc.arr.length, 5);
      assert.equal(doc.arr[4], 'last');

      doc = await save(doc);

      assert.equal(doc.arr.length, 5);
      assert.equal(doc.arr[0], 3);
      assert.strictEqual(1, doc.arr[1].x);
      assert.equal(doc.arr[2], null);
      assert.ok(Array.isArray(doc.arr[3]));
      assert.equal(doc.arr[3][0], 5);
      assert.equal(doc.arr[4], 'last');

      doc.arr.set(8, Infinity);
      assert.equal(doc.arr.length, 9);
      assert.strictEqual(Infinity, doc.arr[8]);
      assert.equal(doc.arr[7], undefined);

      doc.arr.push(Buffer.alloc(0));
      assert.equal(doc.arr[9].toString(), '');
      assert.equal(doc.arr.length, 10);

      doc = await save(doc);
      assert.equal(doc.arr.length, 10);
      assert.equal(doc.arr[0], 3);
      assert.strictEqual(1, doc.arr[1].x);
      assert.equal(doc.arr[2], null);
      assert.ok(Array.isArray(doc.arr[3]));
      assert.equal(doc.arr[3][0], 5);
      assert.equal(doc.arr[4], 'last');
      assert.strictEqual(null, doc.arr[5]);
      assert.strictEqual(null, doc.arr[6]);
      assert.strictEqual(null, doc.arr[7]);
      assert.strictEqual(Infinity, doc.arr[8]);
      // arr[9] is actually a mongodb Binary since mixed won't cast to buffer
      assert.equal(doc.arr[9].toString(), '');


    });

    it('works with sub-docs', async function() {
      const D = db.model('Test', Schema({ arr: [{ name: String }] }));

      const m = new D({ arr: [{ name: 'aaron' }, { name: 'moombahton ' }] });
      let doc = await save(m);
      assert.equal(doc.arr.length, 2);
      doc.arr[0] = { name: 'vdrums' };
      assert.equal(doc.arr.length, 2);
      assert.equal(doc.arr[0].name, 'vdrums');
      doc.arr.set(doc.arr.length, { name: 'Restrepo' });
      assert.equal(doc.arr.length, 3);
      assert.equal(doc.arr[2].name, 'Restrepo');

      doc = await save(doc);

      // validate
      assert.equal(doc.arr.length, 3);
      assert.equal(doc.arr[0].name, 'vdrums');
      assert.equal(doc.arr[1].name, 'moombahton ');
      assert.equal(doc.arr[2].name, 'Restrepo');

      doc.arr.set(10, { name: 'temple of doom' });
      assert.equal(doc.arr.length, 11);
      assert.equal(doc.arr[10].name, 'temple of doom');
      assert.equal(doc.arr[9], null);

      doc = await save(doc);

      // validate
      assert.equal(doc.arr.length, 11);
      assert.equal(doc.arr[0].name, 'vdrums');
      assert.equal(doc.arr[1].name, 'moombahton ');
      assert.equal(doc.arr[2].name, 'Restrepo');
      assert.equal(doc.arr[3], null);
      assert.equal(doc.arr[9], null);
      assert.equal(doc.arr[10].name, 'temple of doom');

      doc.arr.remove(doc.arr[0]);
      doc.arr.set(7, { name: 7 });
      assert.strictEqual('7', doc.arr[7].name);
      assert.equal(doc.arr.length, 10);

      doc = await save(doc);

      assert.equal(doc.arr.length, 10);
      assert.equal(doc.arr[0].name, 'moombahton ');
      assert.equal(doc.arr[1].name, 'Restrepo');
      assert.equal(doc.arr[2], null);
      assert.ok(doc.arr[7]);
      assert.strictEqual('7', doc.arr[7].name);
      assert.equal(doc.arr[8], null);
      assert.equal(doc.arr[9].name, 'temple of doom');


    });

    it('applies setters (gh-3032)', async function() {
      const ST = db.model('Test', Schema({
        arr: [{
          type: String,
          lowercase: true
        }]
      }));

      const m = new ST({ arr: ['ONE', 'TWO'] });
      let doc = await save(m);
      assert.equal(doc.arr.length, 2);
      doc.arr.set(0, 'THREE');
      assert.strictEqual('three', doc.arr[0]);
      assert.strictEqual('two', doc.arr[1]);
      doc.arr[doc.arr.length] = 'FOUR';
      assert.strictEqual('three', doc.arr[0]);
      assert.strictEqual('two', doc.arr[1]);
      assert.strictEqual('four', doc.arr[2]);

      doc = await save(doc);
      assert.equal(doc.arr.length, 3);
      assert.strictEqual('three', doc.arr[0]);
      assert.strictEqual('two', doc.arr[1]);
      assert.strictEqual('four', doc.arr[2]);
    });
  });

  describe('slice', function() {
    it('copies schema correctly (gh-8482)', function() {
      const M = db.model('Test', Schema({ arr: [Number] }));

      const doc = new M({ arr: [1, 2, 3] });

      const arr = doc.arr.slice(2);

      arr.splice(1, 0, 5, 7, 11);

      assert.deepEqual(arr, [3, 5, 7, 11]);
    });

    it('with unshift (gh-8482)', function() {
      const M = db.model('Test', Schema({ arr: [Number] }));

      const doc = new M({ arr: [1, 2, 3] });

      const arr = doc.arr.slice(2);

      arr.unshift(10);

      assert.deepEqual(arr, [10, 3]);
    });

    it('with push (gh-8655)', function() {
      const userSchema = new Schema({ names: [String] });
      const User = mongoose.model('User', userSchema);

      const user = new User({ names: ['test1', 'test2', 'test3'] });

      const slicedNames = user.names.slice(1, 2);
      slicedNames.push('test4');
      assert.ok(slicedNames.indexOf('test2') !== -1 && slicedNames.indexOf('test4') !== -1);
    });
  });

  describe('setting a doc array', function() {
    it('should adjust path positions', async function() {
      const D = db.model('Test', new Schema({
        em1: [new Schema({ name: String })]
      }));

      let d = new D({
        em1: [
          { name: 'pos0' },
          { name: 'pos1' },
          { name: 'pos2' }
        ]
      });

      await d.save();
      d = await D.findById(d);

      const n = d.em1.slice();
      n[2].name = 'position two';
      let x = [];
      x[1] = n[2];
      x[2] = n[1];
      x = x.filter(Boolean);
      d.em1 = x;

      await d.save();
      d = await D.findById(d);
      assert.equal(d.em1[0].name, 'position two');
      assert.equal(d.em1[1].name, 'pos1');

    });
  });

  describe('paths with similar names', function() {
    it('should be saved', async function() {
      const D = db.model('Test', new Schema({
        account: {
          role: String,
          roles: [String]
        },
        em: [new Schema({ name: String })]
      }));

      let d = new D({
        account: { role: 'teacher', roles: ['teacher', 'admin'] },
        em: [{ name: 'bob' }]
      });

      await d.save();
      d = await D.findById(d);

      d.account.role = 'president';
      d.account.roles = ['president', 'janitor'];
      d.em[0].name = 'memorable';
      d.em = [{ name: 'frida' }];

      await d.save();
      d = await D.findById(d);
      assert.equal(d.account.role, 'president');
      assert.equal(d.account.roles.length, 2);
      assert.equal(d.account.roles[0], 'president');
      assert.equal(d.account.roles[1], 'janitor');
      assert.equal(d.em.length, 1);
      assert.equal(d.em[0].name, 'frida');

    });
  });

  describe('of number', function() {
    it('allows null and undefined', async function() {
      const schema = new Schema({ x: [Number] });
      const M = db.model('Test', schema);
      let m;

      m = new M({ x: [1, null, 3] });
      await m.save();

      m = new M({ x: [1, undefined, 3] });
      await m.save();
      m.x = [1,, 3]; // eslint-disable-line no-sparse-arrays
      await m.save();
      assert.strictEqual(m.x[1], void 0);
      m.x.set(1, 2);
      await m.save();
      assert.deepEqual(m.toObject().x, [1, 2, 3]);

    });
  });

  describe('bug fixes', function() {
    it('modifying subdoc props and manipulating the array works (gh-842)', async function() {
      const schema = new Schema({ em: [new Schema({ username: String })] });
      const M = db.model('Test', schema);
      let m = new M({ em: [{ username: 'Arrietty' }] });

      await m.save();
      m = await M.findById(m);
      assert.equal(m.em[0].username, 'Arrietty');

      m.em[0].username = 'Shawn';
      m.em.push({ username: 'Homily' });
      await m.save();
      m = await M.findById(m);
      assert.equal(m.em.length, 2);
      assert.equal(m.em[0].username, 'Shawn');
      assert.equal(m.em[1].username, 'Homily');

      m.em[0].username = 'Arrietty';
      m.em[1].deleteOne();
      await m.save();
      m = await M.findById(m);
      assert.equal(m.em.length, 1);
      assert.equal(m.em[0].username, 'Arrietty');
    });

    it('toObject returns a vanilla JavaScript array (gh-9540)', function() {
      const schema = new Schema({ arr: [Number] });
      const M = db.model('Test', schema);

      const doc = new M({ arr: [1, 2, 3] });

      let arr = doc.arr.toObject();
      assert.ok(Array.isArray(arr));
      assert.equal(arr.constructor, Array);
      assert.deepStrictEqual(arr, [1, 2, 3]);

      arr = doc.arr.toObject({ depopulate: true });
      assert.ok(Array.isArray(arr));
      assert.equal(arr.constructor, Array);
      assert.deepStrictEqual(arr, [1, 2, 3]);
    });

    it('pushing top level arrays and subarrays works (gh-1073)', async function() {
      const schema = new Schema({ em: [new Schema({ sub: [String] })] });
      const M = db.model('Test', schema);
      let m = new M({ em: [{ sub: [] }] });
      await m.save();
      m = await M.findById(m);

      m.em[m.em.length - 1].sub.push('a');
      m.em.push({ sub: [] });

      assert.equal(m.em.length, 2);
      assert.equal(m.em[0].sub.length, 1);

      await m.save();

      m = await M.findById(m);
      assert.equal(m.em.length, 2);
      assert.equal(m.em[0].sub.length, 1);
      assert.equal(m.em[0].sub[0], 'a');
    });

    it('finding ids by string (gh-4011)', function(done) {
      const sub = new Schema({
        _id: String,
        other: String
      });

      const main = new Schema({
        subs: [sub]
      });

      const Model = db.model('Test', main);

      const doc = new Model({ subs: [{ _id: '57067021ee0870440c76f489' }] });

      assert.ok(doc.subs.id('57067021ee0870440c76f489'));
      assert.ok(doc.subs.id(new mongodb.ObjectId('57067021ee0870440c76f489')));
      done();
    });
  });

  describe('default type', function() {
    it('casts to Mixed', function(done) {
      const DefaultArraySchema = new Schema({
        num1: Array,
        num2: []
      });

      const DefaultArray = db.model('Test', DefaultArraySchema);
      const arr = new DefaultArray();

      assert.equal(arr.get('num1').length, 0);
      assert.equal(arr.get('num2').length, 0);

      let threw1 = false,
          threw2 = false;

      try {
        arr.num1.push({ x: 1 });
        arr.num1.push(9);
        arr.num1.push('woah');
      } catch (err) {
        threw1 = true;
      }

      assert.equal(threw1, false);

      try {
        arr.num2.push({ x: 1 });
        arr.num2.push(9);
        arr.num2.push('woah');
      } catch (err) {
        threw2 = true;
      }

      assert.equal(threw2, false);
      done();
    });
  });

  describe('removing from an array atomically using MongooseArray#remove', function() {
    let B;

    before(function() {
      const schema = new Schema({
        numbers: ['number'],
        numberIds: [{ _id: 'number', name: 'string' }],
        stringIds: [{ _id: 'string', name: 'string' }],
        bufferIds: [{ _id: 'buffer', name: 'string' }],
        oidIds: [{ name: 'string' }]
      });

      B = db.model('BlogPost', schema);
    });

    it('works', async function() {
      const post = new B();
      post.numbers.push(1, 2, 3);

      await post.save();
      let doc = await B.findById(post._id);

      doc.numbers.remove('1');
      await doc.save();

      doc = await B.findById(post.get('_id'));

      assert.equal(doc.numbers.length, 2);
      doc.numbers.remove('2', '3');

      await doc.save();

      doc = await B.findById(post._id);
      assert.equal(doc.numbers.length, 0);

    });

    describe('with subdocs', function() {
      function docs(arr) {
        return arr.map(function(val) {
          return { _id: val };
        });
      }

      it('supports passing strings', async function() {
        let post = new B({ stringIds: docs('a b c d'.split(' ')) });
        await post.save();
        post = await B.findById(post);
        post.stringIds.remove('b');
        await post.save();
        post = await B.findById(post);
        assert.equal(post.stringIds.length, 3);
        assert.ok(!post.stringIds.id('b'));

      });
      it('supports passing numbers', async function() {
        let post = new B({ numberIds: docs([1, 2, 3, 4]) });
        await post.save();
        post = await B.findById(post);
        post.numberIds.remove(2, 4);
        await post.save();
        post = await B.findById(post);
        assert.equal(post.numberIds.length, 2);
        assert.ok(!post.numberIds.id(2));
        assert.ok(!post.numberIds.id(4));

      });
      it('supports passing objectids', async function() {
        const OID = mongoose.Types.ObjectId;
        const a = new OID();
        const b = new OID();
        const c = new OID();
        let post = new B({ oidIds: docs([a, b, c]) });
        await post.save();
        post = await B.findById(post);
        post.oidIds.remove(a, c);
        await post.save();
        post = await B.findById(post);
        assert.equal(post.oidIds.length, 1);
        assert.ok(!post.oidIds.id(a));
        assert.ok(!post.oidIds.id(c));

      });
      it('supports passing buffers', async function() {
        let post = new B({ bufferIds: docs(['a', 'b', 'c', 'd']) });
        await post.save();
        post = await B.findById(post);
        post.bufferIds.remove(Buffer.from('a'));
        await post.save();
        post = await B.findById(post);
        assert.equal(post.bufferIds.length, 3);
        assert.ok(!post.bufferIds.id(Buffer.from('a')));

      });
    });
  });

  describe('built-in array methods that modify element structure return vanilla arrays (gh-8356)', function() {
    beforeEach(function() {
      mongoose.deleteModel(/Test/);
    });

    it('filter', function() {
      const Model = mongoose.model('Test', Schema({ arr: [String] }));
      const doc = new Model({ arr: ['foo', 'bar', 'baz'] });

      const arr = doc.arr.filter(str => str.startsWith('b'));
      assert.deepEqual(arr, ['bar', 'baz']);
      assert.ok(!arr.isMongooseArray);
    });

    it('flat', function() {
      if (Array.prototype.flat == null) {
        return this.skip();
      }

      const Model = mongoose.model('Test', Schema({ arr: [[String]] }));
      const doc = new Model({ arr: [['foo']] });

      const arr = doc.arr.flat();
      assert.deepEqual(arr, ['foo']);
      assert.ok(!arr.isMongooseArray);
    });

    it('flatMap', function() {
      if (Array.prototype.flatMap == null) {
        return this.skip();
      }

      const Model = mongoose.model('Test', Schema({ arr: [Number] }));
      const doc = new Model({ arr: [1, 3, 5, 7] });

      const arr = doc.arr.flatMap(v => [v, v + 1]);
      assert.deepEqual(arr, [1, 2, 3, 4, 5, 6, 7, 8]);
      assert.ok(!arr.isMongooseArray);
    });

    it('map', function() {
      const Model = mongoose.model('Test', Schema({ arr: [Number] }));
      const doc = new Model({ arr: [2, 4, 6, 8] });

      const arr = doc.arr.map(v => v / 2);
      assert.deepEqual(arr, [1, 2, 3, 4]);
      assert.ok(!arr.isMongooseArray);
    });

    it('slice', function() {
      const Model = mongoose.model('Test', Schema({ arr: [Number] }));
      const doc = new Model({ arr: [2, 4, 6, 8] });

      const arr = doc.arr.slice(1, 3);
      assert.deepEqual(arr, [4, 6]);
      assert.ok(!arr.isMongooseArray);
    });
  });

  it('does not mutate passed-in array (gh-10766)', function() {
    const Test = db.model('Test', new Schema({ arr: [String] }));

    const arr = [42];
    const doc = new Test({ arr });

    assert.strictEqual(doc.arr[0], '42');
    assert.strictEqual(arr[0], 42);
  });

  it('test "castNonArrays" property option', function() {
    const Model = db.model('Test', new Schema({ x1: { castNonArrays: false, type: [String] }, x2: { castNonArrays: true, type: [String] }, x3: { type: [String] } }));

    const string = 'hello';

    // error testing
    let doc = new Model({ x1: string });
    const validateErrors = doc.validateSync().errors;
    assert.ok(validateErrors);
    assert.equal(validateErrors['x1'].name, 'CastError');

    // good testing
    doc = new Model({ x2: string });
    assert.ifError(doc.validateSync());
    doc.x2.push('foo');
    assert.ifError(doc.validateSync());
    assert.deepEqual(doc.x2.toObject(), ['hello', 'foo']);

    // without option (default)
    doc = new Model({ x3: string });
    assert.ifError(doc.validateSync());
    doc.x3.push('foo');
    assert.ifError(doc.validateSync());
    assert.deepEqual(doc.x3.toObject(), ['hello', 'foo']);
  });

  it('`castNonArrays` on specific paths takes precedence over global option', function() {
    // Arrange
    const m = new mongoose.Mongoose();
    m.Schema.Types.Array.options.castNonArrays = false;

    const userSchema = new Schema({ friendsNames: { type: [String], castNonArrays: true } });
    const User = m.model('User', userSchema);

    // Act
    const user = new User({ friendsNames: 'Sam' });

    // Assert
    assert.ifError(user.validateSync());

    m.Schema.Types.Array.options.castNonArrays = true;
  });

  it('supports setting nested arrays directly (gh-13372)', function() {
    const Test = db.model('Test', new Schema({ intArr: [[Number]] }));

    const intArr = [[1, 2], [3, 4]];
    const doc = Test.hydrate({ intArr });

    doc.intArr[0][0] = 2;
    doc.intArr[1][1] = 5;
    assert.deepStrictEqual(doc.getChanges(), {
      $set: {
        'intArr.0.0': 2,
        'intArr.1.1': 5
      }
    });
  });
});
