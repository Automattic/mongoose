'use strict';

/**
 * Module dependencies.
 */

const start = require('./common');

const SchemaMapOptions = require('../lib/options/SchemaMapOptions');
const assert = require('assert');
const co = require('co');

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

  after(function(done) {
    db.close(done);
  });

  it('validation', function() {
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

    return co(function*() {
      const doc = yield Test.create({ v: { x: 1 } });
      assert.deepEqual(nestedValidateCalls, [1]);
      assert.equal(validateCalls.length, 1);
      assert.equal(validateCalls[0].get('x'), 1);

      assert.ok(doc.v instanceof Map);

      let threw = false;

      try {
        yield Test.create({ v: { notA: 'number' } });
      } catch (error) {
        threw = true;
        assert.ok(!error.errors['v']);
        assert.ok(error.errors['v.notA']);
      }
      assert.ok(threw);

      doc.v.set('y', 5);

      threw = false;
      try {
        yield doc.save();
      } catch (error) {
        threw = true;
        assert.ok(!error.errors['v']);
        assert.ok(error.errors['v.y']);
      }
      assert.ok(threw);
    });
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

  it('supports delete() (gh-7743)', function() {
    const Person = db.model('gh7743', new mongoose.Schema({
      name: String,
      fact: {
        type: Map,
        default: {},
        of: Boolean
      }
    }));

    return co(function*() {
      const person = new Person({
        name: 'Arya Stark',
        fact: {
          cool: true,
          girl: true,
          killer: true
        }
      });

      yield person.save();

      assert.strictEqual(person.fact.get('killer'), true);

      person.fact.delete('killer');

      assert.deepStrictEqual(person.$__delta()[1], { '$unset': { 'fact.killer': 1 } });
      assert.deepStrictEqual(Array.from(person.fact.keys()).sort(), ['cool', 'girl']);
      assert.strictEqual(person.fact.get('killer'), undefined);

      yield person.save();

      const queryPerson = yield Person.findOne({ name: 'Arya Stark' });
      assert.strictEqual(queryPerson.fact.get('killer'), undefined);
    });
  });

  it('query casting', function() {
    const TestSchema = new mongoose.Schema({
      v: {
        type: Map,
        of: Number
      }
    });

    const Test = db.model('MapQueryTest', TestSchema);

    return co(function*() {
      const docs = yield Test.create([
        { v: { n: 1 } },
        { v: { n: 2 } }
      ]);

      let res = yield Test.find({ 'v.n': 1 });
      assert.equal(res.length, 1);

      res = yield Test.find({ v: { n: 2 } });
      assert.equal(res.length, 1);

      yield Test.updateOne({ _id: docs[1]._id }, { 'v.n': 3 });

      res = yield Test.find({ v: { n: 3 } });
      assert.equal(res.length, 1);

      let threw = false;
      try {
        yield Test.updateOne({ _id: docs[1]._id }, { 'v.n': 'not a number' });
      } catch (error) {
        threw = true;
        assert.equal(error.name, 'CastError');
      }
      assert.ok(threw);
      res = yield Test.find({ v: { n: 3 } });
      assert.equal(res.length, 1);
    });
  });

  it('defaults', function() {
    const TestSchema = new mongoose.Schema({
      n: Number,
      m: {
        type: Map,
        of: Number,
        default: { bacon: 2, eggs: 6 }
      }
    });

    const Test = db.model('MapDefaultsTest', TestSchema);

    return co(function*() {
      const doc = new Test({});
      assert.ok(doc.m instanceof Map);
      assert.deepEqual(Array.from(doc.toObject().m.keys()), ['bacon', 'eggs']);

      yield Test.updateOne({}, { n: 1 }, { upsert: true, setDefaultsOnInsert: true });

      const saved = yield Test.findOne({ n: 1 });
      assert.ok(saved);
      assert.deepEqual(Array.from(saved.toObject().m.keys()),
        ['bacon', 'eggs']);
    });
  });

  it('validation', function() {
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

    return co(function*() {
      const doc = new Test({ ratings: { github: 11 } });
      assert.ok(doc.ratings instanceof Map);

      let threw = false;
      try {
        yield doc.save();
      } catch (err) {
        threw = true;
        assert.ok(err.errors['ratings.github']);
      }
      assert.ok(threw);

      doc.ratings.set('github', 8);
      // Shouldn't throw
      yield doc.save();

      threw = false;
      try {
        yield Test.updateOne({}, { $set: { 'ratings.github': 11 } }, {
          runValidators: true
        });
      } catch (err) {
        threw = true;
        assert.ok(err.errors['ratings.github']);
      }
      assert.ok(threw);
    });
  });

  it('with single nested subdocs', function() {
    const TestSchema = new mongoose.Schema({
      m: {
        type: Map,
        of: new mongoose.Schema({ n: Number }, { _id: false, id: false })
      }
    });

    const Test = db.model('MapEmbeddedTest', TestSchema);

    return co(function*() {
      let doc = new Test({ m: { bacon: { n: 2 } } });

      yield doc.save();

      assert.ok(doc.m instanceof Map);
      assert.deepEqual(doc.toObject().m.get('bacon').toObject(), { n: 2 });

      doc.m.get('bacon').n = 4;
      yield doc.save();
      assert.deepEqual(doc.toObject().m.get('bacon').toObject(), { n: 4 });

      doc = yield Test.findById(doc._id);

      assert.deepEqual(doc.toObject().m.get('bacon').toObject(), { n: 4 });
    });
  });

  describe('populate', function() {
    it('populate individual path', function() {
      const UserSchema = new mongoose.Schema({
        keys: {
          type: Map,
          of: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MapPopulateTest'
          }
        }
      });

      const KeySchema = new mongoose.Schema({ key: String });

      const User = db.model('MapPopulateTest_0', UserSchema);
      const Key = db.model('MapPopulateTest', KeySchema);

      return co(function*() {
        const key = yield Key.create({ key: 'abc123' });
        const key2 = yield Key.create({ key: 'key' });

        const doc = yield User.create({ keys: { github: key._id } });

        const populated = yield User.findById(doc).populate('keys.github');

        assert.equal(populated.keys.get('github').key, 'abc123');

        populated.keys.set('twitter', key2._id);

        yield populated.save();

        const rawDoc = yield User.collection.findOne({ _id: doc._id });
        assert.deepEqual(rawDoc.keys, { github: key._id, twitter: key2._id });
      });
    });

    it('populate entire map', function() {
      const UserSchema = new mongoose.Schema({
        apiKeys: {
          type: Map,
          of: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MapPopulateWildcardTest'
          }
        }
      });

      const KeySchema = new mongoose.Schema({ key: String });

      const User = db.model('MapPopulateWildcardTest_0', UserSchema);
      const Key = db.model('MapPopulateWildcardTest', KeySchema);

      return co(function*() {
        const key = yield Key.create({ key: 'abc123' });
        const key2 = yield Key.create({ key: 'key' });

        const doc = yield User.create({ apiKeys: { github: key._id, twitter: key2._id } });

        const populated = yield User.findById(doc).populate('apiKeys');

        assert.equal(populated.apiKeys.get('github').key, 'abc123');
        assert.equal(populated.apiKeys.get('twitter').key, 'key');
      });
    });

    it('populate entire map in doc', function() {
      const UserSchema = new mongoose.Schema({
        apiKeys: {
          type: Map,
          of: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MapPopulateMapDocTest'
          }
        }
      });

      const KeySchema = new mongoose.Schema({ key: String });

      const User = db.model('MapPopulateMapDocTest_0', UserSchema);
      const Key = db.model('MapPopulateMapDocTest', KeySchema);

      return co(function*() {
        const key = yield Key.create({ key: 'abc123' });
        const key2 = yield Key.create({ key: 'key' });

        const doc = yield User.create({ apiKeys: { github: key._id, twitter: key2._id } });

        const _doc = yield User.findById(doc);
        yield _doc.populate('apiKeys').execPopulate();

        assert.equal(_doc.apiKeys.get('github').key, 'abc123');
        assert.equal(_doc.apiKeys.get('twitter').key, 'key');
      });
    });

    it('avoid populating as map if populate on obj (gh-6460) (gh-8157)', function() {
      const UserSchema = new mongoose.Schema({
        apiKeys: {}
      });

      const KeySchema = new mongoose.Schema({ key: String });

      const User = db.model('gh6460_User', UserSchema);
      const Key = db.model('gh6460_Key', KeySchema);

      return co(function*() {
        const key = yield Key.create({ key: 'abc123' });
        const key2 = yield Key.create({ key: 'key' });

        const doc = yield User.create({ apiKeys: { github: key._id, twitter: key2._id } });

        const populated = yield User.findById(doc).populate({
          path: 'apiKeys',
          skipInvalidIds: true
        });
        assert.ok(!(populated.apiKeys instanceof Map));
        assert.ok(!Array.isArray(populated.apiKeys));
      });
    });

    it('handles setting populated path to doc and then saving (gh-7745)', function() {
      const Scene = db.model('gh7745_Scene', new mongoose.Schema({
        name: String
      }));

      const Event = db.model('gh7745_Event', new mongoose.Schema({
        scenes: {
          type: Map,
          default: {},
          of: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'gh7745_Scene'
          }
        }
      }));

      return co(function*() {
        const foo = yield Scene.create({ name: 'foo' });
        let event = yield Event.create({ scenes: { foo: foo._id } });

        event = yield Event.findOne().populate('scenes');
        const bar = yield Scene.create({ name: 'bar' });
        event.scenes.set('bar', bar);
        yield event.save();

        event = yield Event.findOne().populate('scenes');
        assert.ok(event.scenes.has('bar'));
        assert.equal(event.scenes.get('bar').name, 'bar');
      });
    });
  });

  it('discriminators', function() {
    const TestSchema = new mongoose.Schema({
      n: Number
    });

    const Test = db.model('MapDiscrimTest', TestSchema);

    const Disc = Test.discriminator('MapDiscrimTest_0', new mongoose.Schema({
      m: {
        type: Map,
        of: Number
      }
    }));

    return co(function*() {
      const doc = new Disc({ m: { test: 1 } });
      assert.ok(doc.m instanceof Map);
      assert.deepEqual(Array.from(doc.toObject().m.keys()), ['test']);
      yield doc.save();

      const fromDb = yield Disc.findOne({ 'm.test': 1 });
      assert.ok(fromDb);
      assert.equal(fromDb._id.toHexString(), doc._id.toHexString());
    });
  });

  it('embedded discriminators', function() {
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

    const Department = db.model('MapEmbeddedDiscrimTest', DepartmentSchema);

    return co(function*() {
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

      yield dept.save();

      let fromDb = yield Department.findOne({ 'employees.apiKeys.github': 'test3' });
      assert.ok(fromDb);

      dept.employees[1].apiKeys.set('github', 'test4');
      yield dept.save();

      fromDb = yield Department.findOne({ 'employees.apiKeys.github': 'test4' });
      assert.ok(fromDb);
    });
  });

  it('toJSON seralizes map paths (gh-6478)', function() {
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

    const Test = db.model('gh6478', schema);
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

    return co(function*() {
      yield test.save();

      const found = yield Test.findOne();
      assert.deepEqual(found.str.toJSON(), { testing: '123' });
      assert.deepEqual(found.num.toJSON(), { testing: 456 });
    });
  });

  it('updating map doesnt crash (gh-6750)', function() {
    return co(function*() {
      const Schema = mongoose.Schema;
      const User = db.model('gh6750_User', {
        maps: { type: Map, of: String, default: {} }
      });

      const Post = db.model('gh6750_Post', {
        user: { type: Schema.Types.ObjectId, ref: 'User' }
      });

      const user = yield User.create({});
      const doc = yield Post.
        findOneAndUpdate({}, { user: user }, { upsert: true, new: true });
      assert.ok(doc);
      assert.equal(doc.user.toHexString(), user._id.toHexString());
    });
  });

  it('works with sub doc hooks (gh-6938)', function() {
    return co(function*() {
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

      const Test = db.model('gh6938', schema);
      const test = new Test({ widgets: { one: { x: 'a' } } });
      test.widgets.set('two', { x: 'b' });
      test.widgets.set('three', { x: 'c', child: { y: 2018 } });
      yield test.save();
      assert.strictEqual(subDocHooksCalledTimes, 3);
      assert.strictEqual(mapChildHooksCalledTimes, 1);
    });
  });

  it('array of mixed maps (gh-6995)', function() {
    const Model = db.model('gh6995', new Schema({ arr: [Map] }));

    return Model.create({ arr: [{ a: 1 }] }).
      then(doc => {
        assert.deepEqual(doc.toObject().arr, [new Map([['a', 1]])]);
      });
  });

  it('only runs setters once on init (gh-7272)', function() {
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

    const Parent = db.model('gh7272', ParentSchema);

    return co(function*() {
      yield Parent.create({ children: { luke: { age: 30 } } });

      setterContext = [];

      yield Parent.findOne({ 'children.luke.age': 30 });

      assert.equal(setterContext.length, 1);
      assert.ok(setterContext[0] instanceof mongoose.Query);
    });
  });

  it('init then set marks correct path as modified (gh-7321)', function() {
    const childSchema = new mongoose.Schema({ name: String });

    const parentSchema = new mongoose.Schema({
      children: {
        type: Map,
        of: childSchema
      }
    });

    const Parent = db.model('gh7321', parentSchema);

    return co(function*() {
      const first = yield Parent.create({
        children: {
          'one': {name: 'foo'}
        }
      });

      let loaded = yield Parent.findById(first.id);
      assert.equal(loaded.get('children.one.name'), 'foo');

      loaded.children.get('one').set('name', 'bar');

      yield loaded.save();

      loaded = yield Parent.findById(first.id);
      assert.equal(loaded.get('children.one.name'), 'bar');
    });
  });

  it('nested maps (gh-7630)', function() {
    const schema = new mongoose.Schema({
      describe: {
        type: Map,
        of: Map,
        default: {}
      }
    });

    const GoodsInfo = db.model('gh7630', schema);

    let goodsInfo = new GoodsInfo();
    goodsInfo.describe = new Map();
    goodsInfo.describe.set('brand', new Map([['en', 'Hermes']]));

    return co(function*() {
      yield goodsInfo.save();

      goodsInfo = yield GoodsInfo.findById(goodsInfo);
      assert.equal(goodsInfo.get('describe.brand.en'), 'Hermes');
    });
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
    const Model = db.model('gh7447', schema);

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
    const Model = db.model('gh7859', schema);

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
    const Model = db.model('gh8357', schema.clone());

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
    const Model = db.model('gh8424', schema);

    const doc = new Model({ myMap: { foo: { name: 'bar' } } });

    assert.equal(doc.myMap.get('foo').name, 'bar');
    assert.ok(!doc.myMap.get('foo')._id);
  });
});
