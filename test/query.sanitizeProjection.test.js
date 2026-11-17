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
      secrets: { type: Map, of: String, select: false },
      recoveryCodes: { type: [String], select: false },
      tags: [String],
      comments: [{ text: String, secret: { type: String, select: false } }]
    }));
    await User.create({
      name: 'test',
      email: 'test@example.com',
      password: 'HASH',
      resetToken: 'TOKEN',
      profile: { bio: 'bio', ssn: 'SSN' },
      secrets: { apiKey: 'APIKEY' },
      recoveryCodes: ['CODE1', 'CODE2'],
      tags: ['tag1', 'tag2'],
      comments: [{ text: 'comment', secret: 'COMMENTSECRET' }]
    });
  });

  afterEach(() => db.deleteModel(/.*/));
  afterEach(() => util.clearTestData(db));

  it('does not let +path override select: false when the projection is exclusive', async function() {
    const q = User.findOne().sanitizeProjection(true).select('-name +password').lean();
    const doc = await q;

    assert.strictEqual(doc.password, undefined);
    assert.strictEqual(doc.name, undefined);
    assert.strictEqual(doc.email, 'test@example.com');
    assert.strictEqual(q._fields.password, 0);
  });

  it('does not leak other select: false paths when rewriting `path: 1` to `path: 0`', async function() {
    const doc = await User.findOne().sanitizeProjection(true).select('password').lean();

    assert.strictEqual(doc.password, undefined);
    assert.strictEqual(doc.resetToken, undefined);
    assert.strictEqual(doc.profile.ssn, undefined);
    assert.strictEqual(doc.secrets, undefined);
  });

  it('does not let `$` expression objects exfiltrate select: false paths', async function() {
    const doc = await User.findOne().sanitizeProjection(true).select({ name: { $concat: ['$password', '-', '$resetToken'] } }).lean();

    assert.strictEqual(doc.name, 'test');
  });

  it('does not let array values exfiltrate select: false paths', async function() {
    const doc = await User.findOne().sanitizeProjection(true).select({ name: ['$password'] }).lean();

    assert.strictEqual(doc.name, 'test');
  });

  it('does not let nested sub-projections include select: false paths', async function() {
    const doc = await User.findOne().sanitizeProjection(true).select({ profile: { ssn: 1 } }).lean();

    assert.strictEqual(doc.profile?.ssn, undefined);
  });

  it('does not let +mapPath override select: false on map paths', async function() {
    const q = User.findOne().sanitizeProjection(true).select('+secrets').lean();
    const doc = await q;

    assert.strictEqual(doc.secrets, undefined);
    assert.strictEqual(q._fields.secrets, 0);
  });

  it('applies select: false exclusions when the projection is a nested exclusion object', async function() {
    const doc = await User.findOne().select({ profile: { bio: 0 } }).lean();

    assert.strictEqual(doc.profile.bio, undefined);
    assert.strictEqual(doc.password, undefined);
    assert.strictEqual(doc.resetToken, undefined);
    assert.strictEqual(doc.profile.ssn, undefined);
    assert.strictEqual(doc.secrets, undefined);
  });

  it('applies select: false exclusions to nested exclusion objects with sanitizeProjection', async function() {
    const doc = await User.findOne().sanitizeProjection(true).select({ profile: { bio: 0 } }).lean();

    assert.strictEqual(doc.password, undefined);
    assert.strictEqual(doc.resetToken, undefined);
  });

  it('does not let `$meta: indexKey` or `$meta: sortKey` exfiltrate select: false paths', async function() {
    const indexKey = await User.findOne().sanitizeProjection(true).select({ name: { $meta: 'indexKey' } }).lean();
    assert.strictEqual(indexKey.name, 'test');

    const sortKey = await User.findOne().sanitizeProjection(true).sort({ password: 1 }).select({ name: { $meta: 'sortKey' } }).lean();
    assert.strictEqual(sortKey.name, 'test');
  });

  it('does not let `$slice` expressions exfiltrate select: false arrays', async function() {
    const doc = await User.findOne().sanitizeProjection(true).select({ tags: { $slice: ['$recoveryCodes', 1] } }).lean();

    assert.deepStrictEqual(doc.tags, ['tag1', 'tag2']);
    assert.strictEqual(doc.recoveryCodes, undefined);
  });

  it('sanitizes string values set before calling sanitizeProjection()', async function() {
    const doc = await User.findOne().select({ name: '$password' }).sanitizeProjection(true).lean();

    assert.strictEqual(doc.name, 'test');
  });

  it('waits until the query executes to apply sanitizeProjection', async function() {
    const q = User.findOne().select({ name: '$email' }).sanitizeProjection(true).sanitizeProjection(false).lean();
    assert.deepStrictEqual(q._fields, { name: '$email' });
    const doc = await q;

    assert.strictEqual(doc.name, 'test@example.com');
  });

  it('does not let nested string values exfiltrate select: false paths', async function() {
    const doc = await User.findOne().sanitizeProjection(true).select({ profile: { bio: '$password' } }).lean();

    assert.strictEqual(doc.profile.bio, 'bio');
    assert.strictEqual(doc.password, undefined);
  });

  it('does not let nested `$` keys exfiltrate select: false paths', async function() {
    const doc = await User.findOne().sanitizeProjection(true).select({ profile: { bio: { $slice: 1 }, ssn: { $toUpper: '$password' } } }).lean();

    assert.strictEqual(doc.profile.ssn, undefined);
    assert.strictEqual(doc.profile.bio, 'bio');
    assert.strictEqual(doc.password, undefined);
  });

  it('does not let nested unknown `$` keys cause errors with sanitizeProjection', async function() {
    const doc = await User.findOne().sanitizeProjection(true).select({ profile: { bio: { $foo: 1 } } }).lean();

    assert.strictEqual(doc.profile.bio, 'bio');
    assert.strictEqual(doc.profile.ssn, undefined);
    assert.strictEqual(doc.password, undefined);
  });

  it('treats nested objects with `$` keys as inclusive expressions', async function() {
    const doc = await User.findOne().select({ profile: { $toString: '$name' } }).lean();

    assert.strictEqual(doc.profile, 'test');
    assert.strictEqual(doc.name, undefined);
    assert.strictEqual(doc.password, undefined);
  });

  it('does not let selecting a parent path include select: false children', async function() {
    const doc = await User.findOne().sanitizeProjection(true).select('profile').lean();

    assert.strictEqual(doc.profile?.ssn, undefined);
  });

  it('applies select: false exclusions when `$elemMatch` is combined with an exclusion', async function() {
    const doc = await User.findOne().sanitizeProjection(true).select({ tags: { $elemMatch: { $eq: 'tag1' } }, name: 0 }).lean();

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

  it('does not let `-+path` override select: false', async function() {
    const doc = await User.findOne().sanitizeProjection(true).select('-+password').lean();

    assert.strictEqual(doc.name, 'test');
    assert.strictEqual(doc.password, undefined);
  });

  it('does not let positional projections include select: false paths', async function() {
    const doc = await User.findOne({ 'comments.text': 'comment' }).sanitizeProjection(true).select({ 'comments.$': 1 }).lean();

    assert.strictEqual(doc.comments[0].text, 'comment');
    assert.strictEqual(doc.comments[0].secret, undefined);
  });

  it('applies discriminator select: false when the filter has the discriminator key', async function() {
    const Admin = User.discriminator('Admin', Schema({ adminKey: { type: String, select: false } }));
    await Admin.create({ name: 'admin', adminKey: 'ADMINKEY' });

    const doc = await User.findOne({ __t: 'Admin' }).lean();
    assert.strictEqual(doc.name, 'admin');
    assert.strictEqual(doc.adminKey, undefined);

    const sanitized = await User.findOne({ __t: 'Admin' }).sanitizeProjection(true).select('+adminKey').lean();
    assert.strictEqual(sanitized.name, 'admin');
    assert.strictEqual(sanitized.adminKey, undefined);
  });

  it('strips expressions with sanitizeProjection when schemaLevelProjections is disabled', async function() {
    const doc = await User.findOne().sanitizeProjection(true).schemaLevelProjections(false).select({ name: { $concat: ['$password'] } }).lean();

    assert.strictEqual(doc.name, 'test');
  });

  it('throws if casting `$elemMatch` in the projection fails rather than dropping the projection', async function() {
    await assert.rejects(
      User.findOne().sanitizeProjection(true).select({ name: { x: 1, $elemMatch: { $eq: 'test' } } }),
      /Can't use x with String/
    );
    await assert.rejects(
      User.find().select({ name: { x: 1, $elemMatch: { $eq: 'test' } } }).cursor().next(),
      /Can't use x with String/
    );
  });
});
