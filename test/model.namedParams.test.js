'use strict';

const start = require('./common');

const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('Model.findOne named parameters (gh-10367)', function() {
  let db;

  before(() => { db = start(); });
  after(() => db.close());
  beforeEach(() => db.deleteModel(/.*/));

  it('still supports the positional filter style', async function() {
    const { User } = createTestContext();
    await User.create({ name: 'John', email: 'john@example.com', age: 42 });

    const found = await User.findOne({ name: 'John' });

    assert.equal(found.name, 'John');
    assert.equal(found.age, 42);
  });

  it('still supports positional filter + projection + options', async function() {
    const { User } = createTestContext();
    await User.create({ name: 'John', email: 'john@example.com', age: 42 });

    const found = await User.findOne({ name: 'John' }, 'name', { lean: true });

    assert.equal(found.name, 'John');
    assert.strictEqual(found.age, undefined); // projected out
    assert.strictEqual(found instanceof User, false); // lean
  });

  it('supports named parameters with $filter, $projection, $options', async function() {
    const { User } = createTestContext();
    await User.create({ name: 'Jane', email: 'jane@example.com', age: 30 });

    const found = await User.findOne({
      $filter: { name: 'Jane' },
      $projection: 'name age',
      $options: { lean: true }
    });

    assert.equal(found.name, 'Jane');
    assert.equal(found.age, 30);
    assert.strictEqual(found instanceof User, false); // lean applied
  });

  it('supports $filter on its own', async function() {
    const { User } = createTestContext();
    await User.create({ name: 'Sam', email: 'sam@example.com', age: 25 });

    const found = await User.findOne({ $filter: { name: 'Sam' } });

    assert.equal(found.name, 'Sam');
  });

  it('supports $options on its own (no $filter) at runtime', async function() {
    const { User } = createTestContext();
    await User.create({ name: 'Amy', email: 'amy@example.com', age: 50 });

    const found = await User.findOne({ $options: { lean: true } });

    assert.ok(found);
    assert.strictEqual(found instanceof User, false); // lean applied, empty filter
  });

  it('treats a field literally named like a sentinel as a normal positional filter', async function() {
    // `filter` (no $) is a real schema field, must not be confused with named params
    const { Saved } = createTestContext();
    await Saved.create({ filter: 'inbox', name: 'rule-1' });

    const found = await Saved.findOne({ filter: 'inbox' });

    assert.equal(found.name, 'rule-1');
  });

  it('throws when a $-key is mixed with a non-sentinel key', function() {
    const { User } = createTestContext();

    assert.throws(
      () => User.findOne({ $filter: { name: 'John' }, name: 'John' }),
      /invalid named parameter `name`/
    );
  });

  it('throws on an unknown $-prefixed key alongside a sentinel', function() {
    const { User } = createTestContext();

    assert.throws(
      () => User.findOne({ $filter: { name: 'John' }, $bogus: 1 }),
      /invalid named parameter `\$bogus`/
    );
  });

  it('throws when named parameters are passed with a second positional argument', function() {
    const { User } = createTestContext();

    assert.throws(
      () => User.findOne({ $filter: { name: 'John' } }, 'name'),
      /named parameters must be passed as a single argument/
    );
  });

  function createTestContext() {
    const userSchema = new Schema({ name: String, email: String, age: Number });
    const User = db.model('User', userSchema);

    const savedSchema = new Schema({ filter: String, name: String });
    const Saved = db.model('Saved', savedSchema);

    return { User, Saved };
  }
});
