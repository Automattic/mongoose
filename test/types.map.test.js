'use strict';

/**
 * Module dependencies.
 */

const start = require('./common');

const SchemaMapOptions = require('../lib/options/SchemaMapOptions');
const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

/**
 * Test.
 */

describe('Map', function() {
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

  it('validation', async function() {
    const nestedValidateCalls = [];
    const validateCalls = [];
    const TestSchema = new mongoose.Schema({
      v: {
        type: Map,
        of: {
          type: Number,
          validate: function(v) {
            nestedValidateCalls.push(v);
            return v < 4;
          }
        },
        validate: function(v) {
          validateCalls.push(v);
          return true;
        }
      }
    });

    assert.ok(TestSchema.path('v').options instanceof SchemaMapOptions);

    const Test = db.model('MapTest', TestSchema);

    const doc = await Test.create({ v: { x: 1 } });
    assert.deepEqual(nestedValidateCalls, [1]);
    assert.equal(validateCalls.length, 1);
    assert.equal(validateCalls[0].get('x'), 1);

    assert.ok(doc.v instanceof Map);

    let threw = false;

    try {
      await Test.create({ v: { notA: 'number' } });
    } catch (error) {
      threw = true;
      assert.ok(!error.errors['v']);
      assert.ok(error.errors['v.notA']);
    }
    assert.ok(threw);

    doc.v.set('y', 5);

    threw = false;
    try {
      await doc.save();
    } catch (error) {
      threw = true;
      assert.ok(!error.errors['v']);
      assert.ok(error.errors['v.y']);
    }
    assert.ok(threw);
  });

  it('deep set', function(done) {
    const userSchema = new mongoose.Schema({
      socialMediaHandles: {
        type: Schema.Types.Map,
        of: String
      }
    });

    const User = db.model('MapDeepSet', userSchema);

    const user = new User({ socialMediaHandles: {} });

    user.set('socialMediaHandles.github', 'vkarpov15');

    assert.equal(user.socialMediaHandles.get('github'), 'vkarpov15');
    assert.equal(user.get('socialMediaHandles.github'), 'vkarpov15');

    done();
  });

  it('supports delete() (gh-7743)', async function() {
    const Person = db.model('gh7743', new mongoose.Schema({
      name: String,
      fact: {
        type: Map,
        default: {},
        of: Boolean
      }
    }));

    const person = new Person({
      name: 'Arya Stark',
      fact: {
        cool: true,
        girl: true,
        killer: true
      }
    });

    await person.save();

    assert.strictEqual(person.fact.get('killer'), true);

    person.fact.delete('killer');

    assert.deepStrictEqual(person.$__delta()[1], { $unset: { 'fact.killer': 1 } });
    assert.deepStrictEqual(Array.from(person.fact.keys()).sort(), ['cool', 'girl']);
    assert.strictEqual(person.fact.get('killer'), undefined);

    await person.save();

    const queryPerson = await Person.findOne({ name: 'Arya Stark' });
    assert.strictEqual(queryPerson.fact.get('killer'), undefined);
  });

  it('query casting', async function() {
    const TestSchema = new mongoose.Schema({
      v: {
        type: Map,
        of: Number
      }
    });

    const Test = db.model('MapQueryTest', TestSchema);

    const docs = await Test.create([
      { v: { n: 1 } },
      { v: { n: 2 } }
    ]);

    let res = await Test.find({ 'v.n': 1 });
    assert.equal(res.length, 1);

    res = await Test.find({ v: { n: 2 } });
    assert.equal(res.length, 1);

    await Test.updateOne({ _id: docs[1]._id }, { 'v.n': 3 });

    res = await Test.find({ v: { n: 3 } });
    assert.equal(res.length, 1);

    let threw = false;
    try {
      await Test.updateOne({ _id: docs[1]._id }, { 'v.n': 'not a number' });
    } catch (error) {
      threw = true;
      assert.equal(error.name, 'CastError');
    }
    assert.ok(threw);
    res = await Test.find({ v: { n: 3 } });
    assert.equal(res.length, 1);
  });

  it('defaults', async function() {
    const TestSchema = new mongoose.Schema({
      n: Number,
      m: {
        type: Map,
        of: Number,
        default: { bacon: 2, eggs: 6 }
      }
    });

    const Test = db.model('MapDefaultsTest', TestSchema);

    const doc = new Test({});
    assert.ok(doc.m instanceof Map);
    assert.deepEqual(Array.from(doc.toObject().m.keys()), ['bacon', 'eggs']);

    await Test.updateOne({}, { n: 1 }, { upsert: true });

    const saved = await Test.findOne({ n: 1 });
    assert.ok(saved);
    assert.deepEqual(Array.from(saved.toObject().m.keys()),
      ['bacon', 'eggs']);
  });

  it('validation', async function() {
    const TestSchema = new mongoose.Schema({
      ratings: {
        type: Map,
        of: {
          type: Number,
          min: 1,
          max: 10
        }
      }
    });

    const Test = db.model('MapValidationTest', TestSchema);

    const doc = new Test({ ratings: { github: 11 } });
    assert.ok(doc.ratings instanceof Map);

    let threw = false;
    try {
      await doc.save();
    } catch (err) {
      threw = true;
      assert.ok(err.errors['ratings.github']);
    }
    assert.ok(threw);

    doc.ratings.set('github', 8);
    // Shouldn't throw
    await doc.save();

    threw = false;
    try {
      await Test.updateOne({}, { $set: { 'ratings.github': 11 } }, {
        runValidators: true
      });
    } catch (err) {
      threw = true;
      assert.ok(err.errors['ratings.github']);
    }
    assert.ok(threw);
  });

  it('with single nested subdocs', async function() {
    const TestSchema = new mongoose.Schema({
      m: {
        type: Map,
        of: new mongoose.Schema({ n: Number }, { _id: false, id: false })
      }
    });

    const Test = db.model('MapEmbeddedTest', TestSchema);

    let doc = new Test({ m: { bacon: { n: 2 } } });

    await doc.save();

    assert.ok(doc.m instanceof Map);
    assert.deepEqual(doc.toObject().m.get('bacon').toObject(), { n: 2 });

    doc.m.get('bacon').n = 4;
    await doc.save();
    assert.deepEqual(doc.toObject().m.get('bacon').toObject(), { n: 4 });

    doc = await Test.findById(doc._id);

    assert.deepEqual(doc.toObject().m.get('bacon').toObject(), { n: 4 });
  });

  describe('populate', function() {
    it('populate individual path', async function() {
      const UserSchema = new mongoose.Schema({
        keys: {
          type: Map,
          of: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Test'
          }
        }
      });

      const KeySchema = new mongoose.Schema({ key: String });

      const User = db.model('User', UserSchema);
      const Key = db.model('Test', KeySchema);

      const key = await Key.create({ key: 'abc123' });
      const key2 = await Key.create({ key: 'key' });

      const doc = await User.create({ keys: { github: key._id } });

      const populated = await User.findById(doc).populate('keys.github');

      assert.equal(populated.keys.get('github').key, 'abc123');

      populated.keys.set('twitter', key2._id);

      await populated.save();

      const rawDoc = await User.collection.findOne({ _id: doc._id });
      assert.deepEqual(rawDoc.keys, { github: key._id, twitter: key2._id });
    });

    it('populate entire map', async function() {
      const UserSchema = new mongoose.Schema({
        apiKeys: {
          type: Map,
          of: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Test'
          }
        }
      });

      const KeySchema = new mongoose.Schema({ key: String });

      const User = db.model('User', UserSchema);
      const Key = db.model('Test', KeySchema);

      const key = await Key.create({ key: 'abc123' });
      const key2 = await Key.create({ key: 'key' });

      const doc = await User.create({ apiKeys: { github: key._id, twitter: key2._id } });

      const populated = await User.findById(doc).populate('apiKeys');

      assert.equal(populated.apiKeys.get('github').key, 'abc123');
      assert.equal(populated.apiKeys.get('twitter').key, 'key');
    });

    it('populate entire map in doc', async function() {
      const UserSchema = new mongoose.Schema({
        apiKeys: {
          type: Map,
          of: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Test'
          }
        }
      });

      const KeySchema = new mongoose.Schema({ key: String });

      const User = db.model('User', UserSchema);
      const Key = db.model('Test', KeySchema);

      const key = await Key.create({ key: 'abc123' });
      const key2 = await Key.create({ key: 'key' });

      const doc = await User.create({ apiKeys: { github: key._id, twitter: key2._id } });

      const _doc = await User.findById(doc);
      await _doc.populate('apiKeys');

      assert.equal(_doc.apiKeys.get('github').key, 'abc123');
      assert.equal(_doc.apiKeys.get('twitter').key, 'key');
    });

    it('avoid populating as map if populate on obj (gh-6460) (gh-8157)', async function() {
      const UserSchema = new mongoose.Schema({
        apiKeys: {}
      });

      const KeySchema = new mongoose.Schema({ key: String });

      const User = db.model('User', UserSchema);
      const Key = db.model('Test', KeySchema);

      const key = await Key.create({ key: 'abc123' });
      const key2 = await Key.create({ key: 'key' });

      const doc = await User.create({ apiKeys: { github: key._id, twitter: key2._id } });

      const populated = await User.findById(doc).populate({
        path: 'apiKeys',
        skipInvalidIds: true
      });
      assert.ok(!(populated.apiKeys instanceof Map));
      assert.ok(!Array.isArray(populated.apiKeys));
    });

    it('handles setting populated path to doc and then saving (gh-7745)', async function() {
      const Scene = db.model('Test', new mongoose.Schema({
        name: String
      }));

      const Event = db.model('Event', new mongoose.Schema({
        scenes: {
          type: Map,
          default: {},
          of: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Test'
          }
        }
      }));

      const foo = await Scene.create({ name: 'foo' });
      let event = await Event.create({ scenes: { foo: foo._id } });

      event = await Event.findById(event).populate('scenes.$*');
      const bar = await Scene.create({ name: 'bar' });
      event.scenes.set('bar', bar);
      await event.save();

      event = await Event.findById(event).populate('scenes.$*');
      assert.ok(event.scenes.has('bar'));
      assert.equal(event.scenes.get('bar').name, 'bar');
    });

    it('handles populating path of subdoc (gh-9359)', async function() {
      const bookSchema = Schema({
        author: {
          type: 'ObjectId',
          ref: 'Person'
        },
        title: String
      }, { _id: false });

      const schema = Schema({
        books: {
          type: Map,
          of: bookSchema
        }
      });

      const Person = db.model('Person', Schema({ name: String }));
      const Test = db.model('Test', schema);

      const person = await Person.create({ name: 'Ian Fleming' });
      await Test.create({
        books: {
          key1: {
            title: 'Casino Royale',
            author: person._id
          }
        }
      });

      let doc = await Test.findOne().populate('books.$*.author');

      assert.equal(doc.books.get('key1').author.name, 'Ian Fleming');

      doc.books.set('key2', { title: 'Live and Let Die', author: person._id });
      await doc.save();

      doc = await Test.findOne().populate('books.$*.author');

      assert.equal(doc.books.get('key2').author.name, 'Ian Fleming');
    });
  });

  it('discriminators', async function() {
    const TestSchema = new mongoose.Schema({
      n: Number
    });

    const Test = db.model('Test', TestSchema);

    const Disc = Test.discriminator('D', new mongoose.Schema({
      m: {
        type: Map,
        of: Number
      }
    }));

    const doc = new Disc({ m: { test: 1 } });
    assert.ok(doc.m instanceof Map);
    assert.deepEqual(Array.from(doc.toObject().m.keys()), ['test']);
    await doc.save();

    const fromDb = await Disc.findOne({ 'm.test': 1 });
    assert.ok(fromDb);
    assert.equal(fromDb._id.toHexString(), doc._id.toHexString());
  });

  it('embedded discriminators', async function() {
    const EmployeeSchema = new mongoose.Schema({
      name: String
    }, { _id: false, id: false });

    const DepartmentSchema = new mongoose.Schema({
      employees: [EmployeeSchema]
    });

    DepartmentSchema.path('employees').discriminator('Sales', new mongoose.Schema({
      clients: [String]
    }, { _id: false, id: false }));

    DepartmentSchema.path('employees').discriminator('Engineering', new mongoose.Schema({
      apiKeys: {
        type: Map,
        of: String
      }
    }, { _id: false, id: false }));

    const Department = db.model('Test', DepartmentSchema);

    const dept = new Department({
      employees: [
        { __t: 'Sales', name: 'E1', clients: ['test1', 'test2'] },
        { __t: 'Engineering', name: 'E2', apiKeys: { github: 'test3' } }
      ]
    });

    assert.deepEqual(dept.toObject().employees[0],
      { __t: 'Sales', name: 'E1', clients: ['test1', 'test2'] });

    assert.deepEqual(Array.from(dept.toObject().employees[1].apiKeys.values()),
      ['test3']);

    await dept.save();

    let fromDb = await Department.findOne({ 'employees.apiKeys.github': 'test3' });
    assert.ok(fromDb);

    dept.employees[1].apiKeys.set('github', 'test4');
    await dept.save();

    fromDb = await Department.findOne({ 'employees.apiKeys.github': 'test4' });
    assert.ok(fromDb);
  });

  it('toJSON seralizes map paths (gh-6478)', async function() {
    const schema = new mongoose.Schema({
      str: {
        type: Map,
        of: String
      },
      num: {
        type: Map,
        of: Number
      }
    });

    const Test = db.model('Test', schema);
    const test = new Test({
      str: {
        testing: '123'
      },
      num: {
        testing: 456
      }
    });

    assert.deepEqual(test.str.toJSON(), { testing: '123' });
    assert.deepEqual(test.num.toJSON(), { testing: 456 });

    await test.save();

    const found = await Test.findOne();
    assert.deepEqual(found.str.toJSON(), { testing: '123' });
    assert.deepEqual(found.num.toJSON(), { testing: 456 });
  });

  it('updating map doesnt crash (gh-6750)', async function() {
    const Schema = mongoose.Schema;
    const User = db.model('User', {
      maps: { type: Map, of: String, default: {} }
    });

    const Post = db.model('BlogPost', {
      user: { type: Schema.Types.ObjectId, ref: 'User' }
    });

    const user = await User.create({});
    const doc = await Post.
      findOneAndUpdate({}, { user: user }, { upsert: true, new: true });
    assert.ok(doc);
    assert.equal(doc.user.toHexString(), user._id.toHexString());
  });

  it('works with sub doc hooks (gh-6938)', async function() {
    const Schema = mongoose.Schema;
    let subDocHooksCalledTimes = 0;
    let mapChildHooksCalledTimes = 0;
    const mapChildSchema = new Schema({
      y: Number
    });
    mapChildSchema.pre('save', function() {
      mapChildHooksCalledTimes++;
    });
    const mapSchema = new Schema({
      x: String,
      child: mapChildSchema
    });
    mapSchema.pre('save', function() {
      subDocHooksCalledTimes++;
    });
    const schema = new Schema({
      widgets: {
        type: Map,
        of: mapSchema
      }
    });

    const Test = db.model('Test', schema);
    const test = new Test({ widgets: { one: { x: 'a' } } });
    test.widgets.set('two', { x: 'b' });
    test.widgets.set('three', { x: 'c', child: { y: 2018 } });
    await test.save();
    assert.strictEqual(subDocHooksCalledTimes, 3);
    assert.strictEqual(mapChildHooksCalledTimes, 1);
  });

  it('array of mixed maps (gh-6995)', function() {
    const Model = db.model('Test', new Schema({ arr: [Map] }));

    return Model.create({ arr: [{ a: 1 }] }).
      then(doc => {
        assert.deepEqual(doc.toObject().arr, [new Map([['a', 1]])]);
      });
  });

  it('only runs setters once on init (gh-7272)', async function() {
    let setterContext = [];
    function set(v) {
      setterContext.push(this);
      return v;
    }

    const ChildSchema = new mongoose.Schema({
      age: {
        type: Number,
        set: set
      }
    });

    const ParentSchema = new mongoose.Schema({
      name: String,
      children: {
        type: Map,
        of: ChildSchema
      }
    });

    const Parent = db.model('Parent', ParentSchema);

    await Parent.create({ children: { luke: { age: 30 } } });

    setterContext = [];

    await Parent.findOne({ 'children.luke.age': 30 });

    assert.equal(setterContext.length, 1);
    assert.ok(setterContext[0] instanceof mongoose.Query);
  });

  it('init then set marks correct path as modified (gh-7321)', async function() {
    const childSchema = new mongoose.Schema({ name: String });

    const parentSchema = new mongoose.Schema({
      children: {
        type: Map,
        of: childSchema
      }
    });

    const Parent = db.model('Parent', parentSchema);

    const first = await Parent.create({
      children: {
        one: { name: 'foo' }
      }
    });

    let loaded = await Parent.findById(first.id);
    assert.equal(loaded.get('children.one.name'), 'foo');

    loaded.children.get('one').set('name', 'bar');

    await loaded.save();

    loaded = await Parent.findById(first.id);
    assert.equal(loaded.get('children.one.name'), 'bar');
  });

  it('nested maps (gh-7630)', async function() {
    const schema = new mongoose.Schema({
      describe: {
        type: Map,
        of: Map,
        default: {}
      }
    });

    const GoodsInfo = db.model('Test', schema);

    let goodsInfo = new GoodsInfo();
    goodsInfo.describe = new Map();
    goodsInfo.describe.set('brand', new Map([['en', 'Hermes']]));

    await goodsInfo.save();

    goodsInfo = await GoodsInfo.findById(goodsInfo);
    assert.equal(goodsInfo.get('describe.brand.en'), 'Hermes');
  });

  it('get full path in validator with `propsParameter` (gh-7447)', function() {
    const calls = [];
    const schema = new mongoose.Schema({
      myMap: {
        type: Map,
        of: {
          type: String,
          validate: {
            validator: (v, props) => {
              calls.push(props.path);
              return v === 'bar';
            },
            propsParameter: true
          }
        }
      }
    });
    const Model = db.model('Test', schema);

    const doc = new Model({ myMap: { foo: 'bar' } });
    assert.equal(calls.length, 0);

    assert.ifError(doc.validateSync());
    assert.deepEqual(calls, ['myMap.foo']);

    return doc.validate().
      then(() => {
        assert.deepEqual(calls, ['myMap.foo', 'myMap.foo']);
      });
  });

  it('treats `of` as a schema if typeKey is not set (gh-7859)', function() {
    const schema = new mongoose.Schema({
      myMap: {
        type: Map,
        of: {
          test: { type: String, required: true }
        }
      }
    });
    const Model = db.model('Test', schema);

    const doc = new Model({ myMap: { foo: {} } });

    const err = doc.validateSync();
    assert.ok(err);
    assert.ok(err.errors['myMap.foo.test'].message.indexOf('required') !== -1,
      err.errors['myMap.foo.test'].message);
  });

  it('works with clone() (gh-8357)', function() {
    const childSchema = mongoose.Schema({ name: String });
    const schema = mongoose.Schema({
      myMap: {
        type: Map,
        of: childSchema
      }
    });
    const Model = db.model('Test', schema.clone());

    const doc = new Model({ myMap: { foo: { name: 'bar' } } });

    const err = doc.validateSync();
    assert.ifError(err);
  });

  it('maps of single nested docs with inline _id (gh-8424)', function() {
    const childSchema = mongoose.Schema({ name: String });
    const schema = mongoose.Schema({
      myMap: {
        type: Map,
        of: {
          type: childSchema,
          _id: false
        }
      }
    });
    const Model = db.model('Test', schema);

    const doc = new Model({ myMap: { foo: { name: 'bar' } } });

    assert.equal(doc.myMap.get('foo').name, 'bar');
    assert.ok(!doc.myMap.get('foo')._id);
  });

  it('avoids marking path as modified if setting to same value (gh-8652)', async function() {
    const childSchema = mongoose.Schema({ name: String }, { _id: false });
    const schema = mongoose.Schema({
      numMap: {
        type: Map,
        of: Number
      },
      docMap: {
        type: Map,
        of: childSchema
      }
    });
    const Model = db.model('Test', schema);

    await Model.create({
      numMap: {
        answer: 42,
        powerLevel: 9001
      },
      docMap: {
        captain: { name: 'Jean-Luc Picard' },
        firstOfficer: { name: 'Will Riker' }
      }
    });
    const doc = await Model.findOne();

    doc.numMap.set('answer', 42);
    doc.numMap.set('powerLevel', 9001);
    doc.docMap.set('captain', { name: 'Jean-Luc Picard' });
    doc.docMap.set('firstOfficer', { name: 'Will Riker' });

    assert.deepEqual(doc.modifiedPaths(), []);
  });

  it('handles setting map value to spread document (gh-8652)', async function() {
    const childSchema = mongoose.Schema({ name: String }, { _id: false });
    const schema = mongoose.Schema({
      docMap: {
        type: Map,
        of: childSchema
      }
    });
    const Model = db.model('Test', schema);

    await Model.create({
      docMap: {
        captain: { name: 'Jean-Luc Picard' },
        firstOfficer: { name: 'Will Riker' }
      }
    });
    const doc = await Model.findOne();

    doc.docMap.set('captain', Object.assign({}, doc.docMap.get('firstOfficer')));
    await doc.save();

    const fromDb = await Model.findOne();
    assert.equal(fromDb.docMap.get('firstOfficer').name, 'Will Riker');
  });

  it('runs getters on map values (gh-8730)', function() {
    const schema = mongoose.Schema({
      name: String,
      books: {
        type: Map,
        of: {
          type: String,
          get: function(v) { return `${v}, by ${this.name}`; }
        }
      }
    });
    const Model = db.model('Test', schema);

    const doc = new Model({
      name: 'Ian Fleming',
      books: {
        'casino-royale': 'Casino Royale'
      }
    });

    assert.equal(doc.books.get('casino-royale'), 'Casino Royale, by Ian Fleming');
    assert.equal(doc.get('books.casino-royale'), 'Casino Royale, by Ian Fleming');
  });

  it('handles validation of document array with maps and nested paths (gh-8767)', function() {
    const subSchema = Schema({
      _id: Number,
      level2: {
        type: Map,
        of: Schema({
          _id: Number,
          level3: {
            type: Map,
            of: Number,
            required: true
          }
        })
      },
      otherProps: { test: Number }
    });
    const mainSchema = Schema({ _id: Number, level1: [subSchema] });
    const Test = db.model('Test', mainSchema);

    const doc = new Test({
      _id: 1,
      level1: [
        { _id: 10, level2: { answer: { _id: 101, level3: { value: 42 } } } },
        { _id: 20, level2: { powerLevel: { _id: 201, level3: { value: 9001 } } } }
      ]
    });
    return doc.validate();
  });

  it('persists `.clear()` (gh-9493)', async function() {
    const BoardSchema = new Schema({
      _id: { type: String },
      elements: { type: Map, default: new Map() }
    });

    const BoardModel = db.model('Test', BoardSchema);

    let board = new BoardModel({ _id: 'test' });
    board.elements.set('a', 1);
    await board.save();

    board = await BoardModel.findById('test').exec();
    board.elements.clear();
    await board.save();

    board = await BoardModel.findById('test').exec();
    assert.equal(board.elements.size, 0);
  });

  it('supports `null` in map of subdocuments (gh-9628)', async function() {
    const testSchema = new Schema({
      messages: { type: Map, of: new Schema({ _id: false, text: String }) }
    });

    const Test = db.model('Test', testSchema);

    let doc = await Test.create({
      messages: { prop1: { text: 'test' }, prop2: null }
    });

    doc = await Test.findById(doc);

    assert.deepEqual(doc.messages.get('prop1').toObject(), { text: 'test' });
    assert.strictEqual(doc.messages.get('prop2'), null);
    assert.ifError(doc.validateSync());
  });

  it('tracks changes correctly (gh-9811)', async function() {
    const SubSchema = Schema({
      myValue: {
        type: String
      }
    }, { _id: false });
    const schema = Schema({
      myMap: {
        type: Map,
        of: {
          type: SubSchema
        }
        // required: true
      }
    }, { minimize: false, collection: 'test' });
    const Model = db.model('Test', schema);
    const doc = await Model.create({
      myMap: new Map()
    });
    doc.myMap.set('abc', { myValue: 'some value' });
    const changes = doc.getChanges();

    assert.ok(!changes.$unset);
    assert.deepEqual(changes, { $set: { 'myMap.abc': { myValue: 'some value' } } });
  });

  it('handles map of arrays (gh-9813)', async function() {
    const BudgetSchema = new mongoose.Schema({
      budgeted: {
        type: Map,
        of: [Number]
      }
    });

    const Budget = db.model('Test', BudgetSchema);

    const _id = await Budget.create({
      budgeted: new Map([['2020', [100, 200, 300]]])
    }).then(doc => doc._id);

    const doc = await Budget.findById(_id);
    doc.budgeted.get('2020').set(2, 10);
    assert.deepEqual(doc.getChanges(), { $set: { 'budgeted.2020.2': 10 } });
    await doc.save();

    const res = await Budget.findOne();
    assert.deepEqual(res.toObject().budgeted.get('2020'), [100, 200, 10]);
  });

  it('can populate map of subdocs with doc array using ref function (gh-10584)', async function() {
    const Person = db.model('Person', Schema({ name: String }));
    const Book = db.model('Book', Schema({ title: String }));

    const schema = new Schema({
      myMap: {
        type: Map,
        of: {
          modelId: String,
          data: [{
            _id: {
              type: mongoose.ObjectId,
              ref: doc => doc.$parent().modelId
            }
          }]
        }
      }
    });
    const Test = db.model('Test', schema);

    const people = await Person.create({ name: 'John' });
    const book = await Book.create({ title: 'Intro to CS' });

    await Test.create({
      myMap: {
        key1: { modelId: 'Person', data: [{ _id: people._id }] },
        key2: { modelId: 'Book', data: [{ _id: book._id }] }
      }
    });

    const res = await Test.findOne().populate('myMap.$*.data._id');
    assert.equal(res.myMap.get('key1').data.length, 1);
    assert.equal(res.myMap.get('key1').data[0]._id.name, 'John');
    assert.equal(res.myMap.get('key2').data.length, 1);
    assert.equal(res.myMap.get('key2').data[0]._id.title, 'Intro to CS');
  });

  it('propagates `flattenMaps` to nested maps (gh-10653)', function() {
    const NestedChildSchema = Schema({ value: String }, { _id: false });
    const L2Schema = Schema({
      l2: {
        type: Map,
        of: NestedChildSchema
      }
    }, { _id: false });

    const schema = Schema({
      l1: {
        type: Map,
        of: L2Schema
      }
    }, { minimize: false });

    const Test = db.model('Test', schema);

    const nestedChild = { value: 'abc' };
    const child = {
      l2: new Map().set('l2key', nestedChild)
    };
    const parent = {
      l1: new Map().set('l1key', child)
    };
    const doc = new Test(parent);

    const res = doc.toObject({ flattenMaps: true });
    assert.equal(res.l1.l1key.l2.l2key.value, 'abc');
  });

  it('handles populating map of arrays (gh-12494)', async function() {
    const User = new mongoose.Schema({
      name: String,
      addresses: {
        type: Map,
        of: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Address'
        }],
        default: {}
      }
    });

    const Address = new mongoose.Schema({
      city: String
    });

    const UserModel = db.model('User', User);
    const AddressModel = db.model('Address', Address);

    const address = await AddressModel.create({ city: 'London' });

    const { _id } = await UserModel.create({
      name: 'Name',
      addresses: {
        home: [address._id]
      }
    });

    // Using `.$*`
    let query = UserModel.findById(_id);
    query.populate({
      path: 'addresses.$*'
    });

    let doc = await query.exec();
    assert.ok(Array.isArray(doc.addresses.get('home')));
    assert.equal(doc.addresses.get('home').length, 1);
    assert.equal(doc.addresses.get('home')[0].city, 'London');

    // Populating just one path in the map
    query = UserModel.findById(_id);
    query.populate({
      path: 'addresses.home'
    });

    doc = await query.exec();
    assert.ok(Array.isArray(doc.addresses.get('home')));
    assert.equal(doc.addresses.get('home').length, 1);
    assert.equal(doc.addresses.get('home')[0].city, 'London');
  });
});
