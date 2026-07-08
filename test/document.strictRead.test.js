'use strict';

/**
 * Tests for the `strictRead` schema option.
 * Closes: https://github.com/Automattic/mongoose/issues/4279
 *
 * `strictRead` controls what happens when a document hydrated from MongoDB
 * contains fields not defined in the schema:
 *   - false (default): fields are stored in _doc (existing behavior)
 *   - true: unknown fields are silently stripped during init
 *   - 'throw': a StrictModeError is thrown during init
 */

const start = require('./common');
const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('document: strictRead option:', function() {
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

  describe('strictRead: false (default)', function() {
    it('stores unknown fields in _doc when reading from DB (existing behavior)', async function() {
      // Use strict: false on write so extra field gets persisted
      const writeSchema = new Schema({ name: String }, { strict: false });
      const WriteModel = db.model('StrictReadFalseWrite', writeSchema);
      await WriteModel.create({ name: 'test', extraField: 'extra' });

      // Read with a schema that has strictRead: false (default)
      const readSchema = new Schema({ name: String }, { strictRead: false });
      const ReadModel = db.model('StrictReadFalseRead', readSchema, WriteModel.collection.name);
      const doc = await ReadModel.findOne({ name: 'test' });

      assert.equal(doc.name, 'test');
      assert.equal(doc._doc.extraField, 'extra');
    });
  });

  describe('strictRead: true', function() {
    it('strips unknown fields when hydrating documents from DB', async function() {
      // Write with no strict enforcement so the extra field gets into DB
      const writeSchema = new Schema({ name: String }, { strict: false });
      const WriteModel = db.model('StrictReadTrueWrite', writeSchema);
      await WriteModel.create({ name: 'test', extraField: 'should be stripped' });

      // Read with strictRead: true
      const readSchema = new Schema({ name: String }, { strictRead: true });
      const ReadModel = db.model('StrictReadTrueRead', readSchema, WriteModel.collection.name);
      const doc = await ReadModel.findOne({ name: 'test' });

      assert.equal(doc.name, 'test');
      assert.equal(doc._doc.extraField, undefined, 'extraField should be stripped from _doc');
      assert.equal(doc.extraField, undefined, 'extraField should not be accessible on the doc');
    });

    it('does not strip schema fields', async function() {
      const schema = new Schema({ name: String, age: Number }, { strictRead: true });
      const Model = db.model('StrictReadTrueFields', schema);
      await Model.create({ name: 'Alice', age: 30 });

      const doc = await Model.findOne({ name: 'Alice' });
      assert.equal(doc.name, 'Alice');
      assert.equal(doc.age, 30);
    });

    it('does not affect new document creation', function() {
      const schema = new Schema({ name: String }, { strictRead: true });
      const Model = db.model('StrictReadTrueNew', schema);

      // Creating a new doc — strictRead should not affect constructor behavior
      // (strict mode on write is still governed by the `strict` option)
      const doc = new Model({ name: 'Bob' });
      assert.equal(doc.name, 'Bob');
    });
  });

  describe('strictRead: \'throw\'', function() {
    it('throws a StrictModeError when an unknown field is encountered on init', async function() {
      const writeSchema = new Schema({ name: String }, { strict: false });
      const WriteModel = db.model('StrictReadThrowWrite', writeSchema);
      await WriteModel.create({ name: 'test', badField: 'whoops' });

      const readSchema = new Schema({ name: String }, { strictRead: 'throw' });
      const ReadModel = db.model('StrictReadThrowRead', readSchema, WriteModel.collection.name);

      await assert.rejects(
        () => ReadModel.findOne({ name: 'test' }),
        (err) => {
          assert.equal(err.name, 'StrictModeError');
          assert.ok(err.message.includes('badField') || err.path === 'badField', 'error should reference the offending field');
          return true;
        }
      );
    });

    it('does not throw when all fields are in the schema', async function() {
      const schema = new Schema({ name: String, score: Number }, { strictRead: 'throw' });
      const Model = db.model('StrictReadThrowOk', schema);
      await Model.create({ name: 'valid', score: 99 });

      const doc = await Model.findOne({ name: 'valid' });
      assert.equal(doc.name, 'valid');
      assert.equal(doc.score, 99);
    });
  });

  describe('strictRead with nested objects', function() {
    it('strips top-level unknown fields with strictRead: true', async function() {
      const writeSchema = new Schema({ meta: { known: String } }, { strict: false });
      const WriteModel = db.model('StrictReadNestedWrite', writeSchema);
      await WriteModel.create({ meta: { known: 'yes' }, topLevel: 'extra' });

      const readSchema = new Schema({ meta: { known: String } }, { strictRead: true });
      const ReadModel = db.model('StrictReadNestedRead', readSchema, WriteModel.collection.name);
      const doc = await ReadModel.findOne({});

      assert.equal(doc.meta.known, 'yes');
      assert.equal(doc._doc.topLevel, undefined, 'top-level extra field should be stripped');
    });

    it('strips unknown nested objects entirely with strictRead: true', async function() {
      const writeSchema = new Schema({ meta: { known: String } }, { strict: false });
      const WriteModel = db.model('StrictReadNestedObjWrite', writeSchema);
      await WriteModel.create({ meta: { known: 'yes' }, extraObj: { a: 'x' } });

      const readSchema = new Schema({ meta: { known: String } }, { strictRead: true });
      const ReadModel = db.model('StrictReadNestedObjRead', readSchema, WriteModel.collection.name);
      const doc = await ReadModel.findOne({});

      assert.equal(doc.meta.known, 'yes');
      assert.equal(doc._doc.extraObj, undefined, 'unknown object should be stripped, not left as an empty object');
    });
  });

  describe('strictRead with subdocuments and document arrays', function() {
    it('strips unknown fields inside subdocuments with strictRead: true', async function() {
      const childWriteSchema = new Schema({ heading: String }, { strict: false, _id: false });
      const writeSchema = new Schema({ child: childWriteSchema }, { strict: false });
      const WriteModel = db.model('StrictReadSubdocWrite', writeSchema);
      await WriteModel.create({ child: { heading: 'intro', extra: 'nestedExtra' } });

      const childReadSchema = new Schema({ heading: String }, { strictRead: true, _id: false });
      const readSchema = new Schema({ child: childReadSchema }, { strictRead: true });
      const ReadModel = db.model('StrictReadSubdocRead', readSchema, WriteModel.collection.name);
      const doc = await ReadModel.findOne({});

      assert.equal(doc.child.heading, 'intro');
      assert.equal(doc.child._doc.extra, undefined, 'nested unknown field should be stripped from subdoc');
    });

    it('strips unknown fields inside document arrays with strictRead: true', async function() {
      const itemWriteSchema = new Schema({ name: String }, { strict: false, _id: false });
      const writeSchema = new Schema({ items: [itemWriteSchema] }, { strict: false });
      const WriteModel = db.model('StrictReadDocArrayWrite', writeSchema);
      await WriteModel.create({ items: [{ name: 'item1', extra: 'arrayExtra' }] });

      const itemReadSchema = new Schema({ name: String }, { strictRead: true, _id: false });
      const readSchema = new Schema({ items: [itemReadSchema] }, { strictRead: true });
      const ReadModel = db.model('StrictReadDocArrayRead', readSchema, WriteModel.collection.name);
      const doc = await ReadModel.findOne({});

      assert.equal(doc.items[0].name, 'item1');
      assert.equal(doc.items[0]._doc.extra, undefined, 'unknown field in array element should be stripped');
    });
  });

  describe('global strictRead setting', function() {
    it('respects mongoose.set("strictRead")', async function() {
      const originalStrictRead = mongoose.get('strictRead');
      try {
        mongoose.set('strictRead', true);

        const writeSchema = new Schema({ name: String }, { strict: false });
        const WriteModel = db.model('GlobalStrictReadWrite', writeSchema);
        await WriteModel.create({ name: 'test', extraField: 'should be stripped' });

        const readSchema = new Schema({ name: String });
        const ReadModel = db.model('GlobalStrictReadRead', readSchema, WriteModel.collection.name);
        const doc = await ReadModel.findOne({ name: 'test' });

        assert.equal(doc.name, 'test');
        assert.equal(doc._doc.extraField, undefined, 'extraField should be stripped via global strictRead settings');
      } finally {
        mongoose.set('strictRead', originalStrictRead);
      }
    });
  });
});
