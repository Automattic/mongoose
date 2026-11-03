'use strict';

const start = require('./common');
const assert = require('assert');
const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('schema defaultSort option', function() {
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

  async function createModel(defaultSort = { value: -1 }) {
    const Test = db.model('Test', new Schema({ name: String, value: Number }, { defaultSort }));
    await Test.insertMany([
      { name: 'a', value: 1 },
      { name: 'b', value: 3 },
      { name: 'c', value: 2 }
    ]);
    return Test;
  }

  it('applies to find(), findOne(), and cursors', async function() {
    const Test = await createModel();

    const docs = await Test.find();
    assert.deepStrictEqual(docs.map(doc => doc.value), [3, 2, 1]);

    const doc = await Test.findOne();
    assert.strictEqual(doc.value, 3);

    const fromCursor = await Test.find().cursor().toArray();
    assert.deepStrictEqual(fromCursor.map(doc => doc.value), [3, 2, 1]);
  });

  it('applies to findOneAndUpdate(), findOneAndReplace(), and findOneAndDelete()', async function() {
    const Test = await createModel();

    const updated = await Test.findOneAndUpdate({}, { name: 'updated' });
    assert.strictEqual(updated.value, 3);

    const replaced = await Test.findOneAndReplace({ value: { $lt: 3 } }, { name: 'replaced', value: 2 });
    assert.strictEqual(replaced.value, 2);

    const deleted = await Test.findOneAndDelete({ value: { $lt: 2 } });
    assert.strictEqual(deleted.value, 1);
  });

  it('applies to updateOne() and replaceOne() (requires MongoDB 8.0)', async function() {
    const [major] = await start.mongodVersion();
    if (major < 8) {
      return this.skip();
    }
    const Test = await createModel();

    await Test.updateOne({}, { name: 'updated' });
    assert.strictEqual((await Test.findOne({ name: 'updated' })).value, 3);

    await Test.replaceOne({ value: { $lt: 3 } }, { name: 'replaced', value: 2 });
    assert.strictEqual(await Test.countDocuments({ name: 'replaced', value: 2 }), 1);
    assert.strictEqual(await Test.countDocuments({ name: 'c' }), 0);
  });

  it('does not apply to operations that do not support sort', async function() {
    const Test = await createModel();

    assert.strictEqual(Test.countDocuments()._optionsForExec().sort, undefined);
    assert.strictEqual(Test.distinct('name')._optionsForExec().sort, undefined);
    assert.strictEqual(Test.deleteOne()._optionsForExec().sort, undefined);
    assert.strictEqual(Test.updateMany({}, { name: 'x' })._optionsForExec().sort, undefined);
  });

  it('supports all the syntaxes that `sort()` supports', async function() {
    assert.deepStrictEqual(
      (await createModel('-value name')).find()._optionsForExec().sort,
      { value: -1, name: 1 }
    );

    db.deleteModel(/Test/);
    assert.deepStrictEqual(
      (await createModel([['value', 'desc']])).find()._optionsForExec().sort,
      { value: -1 }
    );
  });

  it('is replaced entirely by an explicit sort', async function() {
    const Test = await createModel({ value: -1, _id: -1 });

    const docs = await Test.find().sort({ name: 1 });
    assert.deepStrictEqual(docs.map(doc => doc.name), ['a', 'b', 'c']);

    const query = Test.find({}, null, { sort: { name: -1 } });
    assert.deepStrictEqual(query._optionsForExec().sort, { name: -1 });
  });

  it('is replaced by an explicit sort after cloning an executed query', async function() {
    const Test = await createModel();

    const query = Test.find();
    await query.exec();

    const docs = await query.clone().sort({ name: 1 });
    assert.deepStrictEqual(docs.map(doc => doc.name), ['a', 'b', 'c']);
  });

  it('yields to a sort set in pre middleware', async function() {
    const schema = new Schema({ name: String, value: Number }, { defaultSort: { value: -1 } });
    schema.pre('find', function() {
      this.sort({ name: 1 });
    });
    const Test = db.model('Test', schema);
    await Test.create([{ name: 'a', value: 1 }, { name: 'b', value: 2 }]);

    const docs = await Test.find();
    assert.deepStrictEqual(docs.map(doc => doc.name), ['a', 'b']);

    const fromCursor = await Test.find().cursor().toArray();
    assert.deepStrictEqual(fromCursor.map(doc => doc.name), ['a', 'b']);
  });

  it('is skipped with `sort(null)` and `sort({})`', async function() {
    const Test = await createModel();

    let docs = await Test.find().sort(null);
    assert.deepStrictEqual(docs.map(doc => doc.value), [1, 3, 2]);

    docs = await Test.find().sort({});
    assert.deepStrictEqual(docs.map(doc => doc.value), [1, 3, 2]);

    docs = await Test.find({}, null, { sort: null });
    assert.deepStrictEqual(docs.map(doc => doc.value), [1, 3, 2]);

    docs = await Test.find().sort(null).clone();
    assert.deepStrictEqual(docs.map(doc => doc.value), [1, 3, 2]);
  });

  it('lets `updateOne()` and `replaceOne()` skip the default on any MongoDB version', async function() {
    const Test = await createModel();

    await Test.updateOne({}, { name: 'updated' }).sort(null);
    assert.strictEqual((await Test.findOne({ name: 'updated' })).value, 1);

    await Test.replaceOne({ value: 3 }, { name: 'replaced', value: 3 }, { sort: null });
    assert.strictEqual(await Test.countDocuments({ name: 'replaced' }), 1);
  });

  it('is not skipped with `sort(undefined)`', async function() {
    const Test = await createModel();

    let docs = await Test.find().sort(undefined);
    assert.deepStrictEqual(docs.map(doc => doc.value), [3, 2, 1]);

    docs = await Test.find({}, null, { sort: undefined });
    assert.deepStrictEqual(docs.map(doc => doc.value), [3, 2, 1]);
  });

  it('skips sorting tailable cursors, which MongoDB does not allow', async function() {
    const Test = await createModel();

    assert.strictEqual(Test.find().tailable()._optionsForExec().sort, undefined);
  });

  it('skips sorting in `Model.exists()` unless the sort is explicit', async function() {
    const Test = await createModel();

    assert.strictEqual(Test.exists({ name: 'a' })._optionsForExec().sort, undefined);
    assert.deepStrictEqual(
      Test.exists({ name: 'a' }, { sort: { name: 1 } })._optionsForExec().sort,
      { name: 1 }
    );
    assert.ok(await Test.exists({ name: 'a' }));
  });

  it('inherits and overrides with discriminators', async function() {
    const Base = db.model('Base', new Schema({ value: Number }, { defaultSort: { value: -1 } }));
    const Inherited = Base.discriminator('Inherited', new Schema({ a: String }));
    const Override = Base.discriminator('Override', new Schema({ b: String }, { defaultSort: { value: 1 } }));
    const Disabled = Base.discriminator('Disabled', new Schema({ c: String }, { defaultSort: false }));

    assert.deepStrictEqual(Base.find()._optionsForExec().sort, { value: -1 });
    assert.deepStrictEqual(Inherited.find()._optionsForExec().sort, { value: -1 });
    assert.deepStrictEqual(Override.find()._optionsForExec().sort, { value: 1 });
    assert.strictEqual(Disabled.find()._optionsForExec().sort, undefined);
  });

  it('applies to populate virtuals, is skipped with `sort: null`', async function() {
    const childSchema = new Schema({ parent: 'ObjectId', value: Number }, { defaultSort: { value: -1 } });
    const parentSchema = new Schema({ name: String });
    parentSchema.virtual('children', { ref: 'Child', localField: '_id', foreignField: 'parent' });
    const Child = db.model('Child', childSchema);
    const Parent = db.model('Parent', parentSchema);

    const parent = await Parent.create({ name: 'p' });
    await Child.insertMany([{ parent, value: 1 }, { parent, value: 3 }, { parent, value: 2 }]);

    const doc = await Parent.findOne().populate('children');
    assert.deepStrictEqual(doc.children.map(child => child.value), [3, 2, 1]);

    const unsorted = await Parent.findOne().populate({ path: 'children', options: { sort: null } });
    assert.deepStrictEqual(unsorted.children.map(child => child.value), [1, 3, 2]);
  });

  describe('findAndCount()', function() {
    it('satisfies the sort requirement for Query.prototype.findAndCount()', async function() {
      const Test = await createModel();

      const [docs, total] = await Test.find().skip(1).limit(1).findAndCount();
      assert.deepStrictEqual(docs.map(doc => doc.value), [2]);
      assert.strictEqual(total, 3);
    });

    it('satisfies the sort requirement for Model.findAndCount()', async function() {
      const Test = await createModel();

      const [docs, total] = await Test.findAndCount({}, null, { skip: 1, limit: 1 });
      assert.deepStrictEqual(docs.map(doc => doc.value), [2]);
      assert.strictEqual(total, 3);
    });

    it('replaces the default with an explicit sort, preserving key order', async function() {
      const Test = await createModel({ value: -1, _id: 1 });

      const sorts = [];
      const find = Test.collection.find;
      Test.collection.find = function(filter, options) {
        sorts.push(options.sort);
        return find.apply(this, arguments);
      };
      await Test.find().sort({ name: 1, value: 1 }).limit(1).findAndCount();
      await Test.findAndCount({}, null, { sort: { name: 1, value: 1 }, limit: 1 });
      delete Test.collection.find;

      assert.deepStrictEqual(sorts.map(sort => Object.keys(sort)), [['name', 'value'], ['name', 'value']]);
    });

    it('runs with no sort after `sort(null)`', async function() {
      const Test = await createModel();

      let [docs] = await Test.find().sort(null).limit(1).findAndCount();
      assert.deepStrictEqual(docs.map(doc => doc.value), [1]);

      [docs] = await Test.findAndCount({}, null, { sort: null, limit: 1 });
      assert.deepStrictEqual(docs.map(doc => doc.value), [1]);
    });

    it('still requires limit', async function() {
      const Test = await createModel();

      await assert.rejects(Test.find().findAndCount(), /requires limit/);
      await assert.rejects(Test.findAndCount({}, null, {}), /requires `options\.limit`/);
    });
  });
});
