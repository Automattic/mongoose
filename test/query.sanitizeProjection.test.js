'use strict';

const start = require('./common');

const assert = require('assert');
const util = require('./util');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('Query sanitizeProjection', function() {
  let db;
  let User;

  before(function() {
    db = start();
  });

  after(async function() {
    await db.close();
  });

  beforeEach(async function() {
    User = db.model('User', Schema({
      name: String,
      email: String,
      password: { type: String, select: false },
      resetToken: { type: String, select: false },
      profile: { bio: String, ssn: { type: String, select: false } },
      recoveryCodes: { type: [String], select: false },
      tags: [String]
    }));
    await User.create({
      name: 'test',
      email: 'test@example.com',
      password: 'HASH',
      resetToken: 'TOKEN',
      profile: { bio: 'bio', ssn: 'SSN' },
      recoveryCodes: ['CODE1', 'CODE2'],
      tags: ['tag1', 'tag2']
    });
  });

  afterEach(() => db.deleteModel(/.*/));
  afterEach(() => util.clearTestData(db));

  it('does not let an own `__proto__` key in select() drop select: false paths', async function() {
    const q = User.findOne().select(JSON.parse('{"__proto__":{"password":0}}')).lean();
    const doc = await q;

    assert.strictEqual(doc.password, undefined);
    assert.strictEqual(doc.name, 'test');
    assert.strictEqual(Object.getPrototypeOf(q._fields), Object.prototype);
  });

  it('does not let `$` expression objects exfiltrate select: false paths', async function() {
    const doc = await User.findOne().setOptions({ sanitizeProjection: true }).select({ name: { $concat: ['$password', '-', '$resetToken'] } }).lean();

    assert.strictEqual(doc.name, 'test');
  });

  it('does not let array values exfiltrate select: false paths', async function() {
    const doc = await User.findOne().setOptions({ sanitizeProjection: true }).select({ name: ['$password'] }).lean();

    assert.strictEqual(doc.name, 'test');
  });

  it('does not let `$meta: indexKey` or `$meta: sortKey` exfiltrate select: false paths', async function() {
    const indexKey = await User.findOne().setOptions({ sanitizeProjection: true }).select({ name: { $meta: 'indexKey' } }).lean();
    assert.strictEqual(indexKey.name, 'test');

    const sortKey = await User.findOne().setOptions({ sanitizeProjection: true }).sort({ password: 1 }).select({ name: { $meta: 'sortKey' } }).lean();
    assert.strictEqual(sortKey.name, 'test');
  });

  it('does not let `$slice` expressions exfiltrate select: false arrays', async function() {
    const doc = await User.findOne().setOptions({ sanitizeProjection: true }).select({ tags: { $slice: ['$recoveryCodes', 1] } }).lean();

    assert.deepStrictEqual(doc.tags, ['tag1', 'tag2']);
    assert.strictEqual(doc.recoveryCodes, undefined);
  });

  it('sanitizes projections when sanitizeProjection is set globally', async function() {
    const m = new mongoose.Mongoose();
    m.set('sanitizeProjection', true);
    const conn = await m.createConnection(start.uri).asPromise();
    const GlobalUser = conn.model('User', User.schema, User.collection.collectionName);

    const doc = await GlobalUser.findOne().select({ name: { $concat: ['$password'] } }).lean();
    assert.strictEqual(doc.name, 'test');
    await conn.close();
  });

  it('does not let nested string values exfiltrate select: false paths', async function() {
    const doc = await User.findOne().setOptions({ sanitizeProjection: true }).select({ profile: { bio: '$password' } }).lean();

    assert.strictEqual(doc.profile.bio, 'bio');
    assert.strictEqual(doc.password, undefined);
  });

  it('does not let nested `$` keys exfiltrate select: false paths', async function() {
    const doc = await User.findOne().setOptions({ sanitizeProjection: true }).select({ profile: { bio: { $slice: 1 }, ssn: { $toUpper: '$password' } } }).lean();

    assert.notStrictEqual(doc.profile.ssn, 'HASH');
    assert.strictEqual(doc.profile.bio, 'bio');
    assert.strictEqual(doc.password, undefined);
  });

  it('applies select: false exclusions when the projection is a nested exclusion object', async function() {
    const doc = await User.findOne().select({ profile: { bio: 0 } }).lean();

    assert.strictEqual(doc.profile.bio, undefined);
    assert.strictEqual(doc.password, undefined);
    assert.strictEqual(doc.resetToken, undefined);
    assert.strictEqual(doc.profile.ssn, undefined);
  });

  it('treats nested objects with `$` keys as inclusive expressions', async function() {
    const doc = await User.findOne().select({ profile: { $toString: '$name' } }).lean();

    assert.strictEqual(doc.profile, 'test');
    assert.strictEqual(doc.name, undefined);
    assert.strictEqual(doc.password, undefined);
  });

  it('applies select: false exclusions when `$elemMatch` is combined with an exclusion', async function() {
    const doc = await User.findOne().select({ name: 0, tags: { $elemMatch: { $eq: 'tag1' } } }).lean();

    assert.deepStrictEqual(doc.tags, ['tag1']);
    assert.strictEqual(doc.name, undefined);
    assert.strictEqual(doc.email, 'test@example.com');
    assert.strictEqual(doc.password, undefined);
  });

  it('keeps `$elemMatch` on its own inclusive', async function() {
    const doc = await User.findOne().select({ tags: { $elemMatch: { $eq: 'tag1' } } }).lean();

    assert.deepStrictEqual(doc.tags, ['tag1']);
    assert.strictEqual(doc.name, undefined);
  });

  it('throws if casting `$elemMatch` in the projection fails rather than dropping the projection', async function() {
    await assert.rejects(
      User.findOne().select({ name: { x: 1, $elemMatch: { $eq: 'test' } } }),
      /Can't use \$elemMatch with String/
    );
    await assert.rejects(
      User.find().select({ name: { x: 1, $elemMatch: { $eq: 'test' } } }).cursor().next(),
      /Can't use \$elemMatch with String/
    );
  });
});
