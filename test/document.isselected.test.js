/**
 * Module dependencies.
 */

'use strict';

const start = require('./common');

const Document = require('../lib/document');
const EventEmitter = require('events').EventEmitter;
const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;
const DocumentObjectId = mongoose.Types.ObjectId;

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
TestDocument.prototype.$__setSchema(schema);

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

schema.path('date').set(function(v) {
  // should not have been cast to a Date yet
  assert.equal(typeof v, 'string');
  return v;
});

/**
 * Method subject to hooks. Simply fires the callback once the hooks are
 * executed.
 */

TestDocument.prototype.hooksTest = function(fn) {
  fn(null, arguments);
};

/**
 * Test.
 */
describe('document', function() {
  it('isSelected()', function() {
    let doc = new TestDocument();

    doc.init({
      test: 'test',
      numbers: [4, 5, 6, 7],
      nested: {
        age: 5,
        cool: DocumentObjectId.createFromHexString('4c6c2d6240ced95d0e00003c'),
        path: 'my path',
        deep: { x: 'a string' }
      },
      notapath: 'i am not in the schema',
      em: [{ title: 'gocars' }]
    });

    assert.ok(doc.isSelected('_id'));
    assert.ok(doc.isSelected('test'));
    assert.ok(doc.isSelected('numbers'));
    assert.ok(doc.isSelected('oids')); // even if no data
    assert.ok(doc.isSelected('nested'));
    assert.ok(doc.isSelected('nested.age'));
    assert.ok(doc.isSelected('nested.cool'));
    assert.ok(doc.isSelected('nested.path'));
    assert.ok(doc.isSelected('nested.deep'));
    assert.ok(doc.isSelected('nested.nope')); // not a path
    assert.ok(doc.isSelected('nested.deep.x'));
    assert.ok(doc.isSelected('nested.deep.x.no'));
    assert.ok(doc.isSelected('nested.deep.y')); // not a path
    assert.ok(doc.isSelected('noway')); // not a path
    assert.ok(doc.isSelected('notapath')); // not a path but in the _doc
    assert.ok(doc.isSelected('em'));
    assert.ok(doc.isSelected('em.title'));
    assert.ok(doc.isSelected('em.body'));
    assert.ok(doc.isSelected('em.nonpath')); // not a path

    let selection = {
      test: 1,
      numbers: 1,
      'nested.deep': 1,
      oids: 1
    };

    doc = new TestDocument(undefined, selection);

    doc.init({
      test: 'test',
      numbers: [4, 5, 6, 7],
      nested: {
        deep: { x: 'a string' }
      }
    });

    assert.ok(doc.isSelected('_id'));
    assert.ok(doc.isSelected('test'));
    assert.ok(doc.isSelected('numbers'));
    assert.ok(doc.isSelected('oids')); // even if no data
    assert.ok(doc.isSelected('nested'));
    assert.ok(!doc.isSelected('nested.age'));
    assert.ok(!doc.isSelected('nested.cool'));
    assert.ok(!doc.isSelected('nested.path'));
    assert.ok(doc.isSelected('nested.deep'));
    assert.ok(!doc.isSelected('nested.nope'));
    assert.ok(doc.isSelected('nested.deep.x'));
    assert.ok(doc.isSelected('nested.deep.x.no'));
    assert.ok(doc.isSelected('nested.deep.y'));
    assert.ok(!doc.isSelected('noway'));
    assert.ok(!doc.isSelected('notapath'));
    assert.ok(!doc.isSelected('em'));
    assert.ok(!doc.isSelected('em.title'));
    assert.ok(!doc.isSelected('em.body'));
    assert.ok(!doc.isSelected('em.nonpath'));

    assert.ok(doc.isSelected('_id test'));
    assert.ok(doc.isSelected('test nested.nope'));
    assert.ok(!doc.isSelected('nested.path nested.nope'));

    assert.ok(doc.isSelected(['_id', 'test']));
    assert.ok(doc.isSelected(['test', 'nested.nope']));
    assert.ok(!doc.isSelected(['nested.path', 'nested.nope']));

    selection = {
      'em.title': 1
    };

    doc = new TestDocument(undefined, selection);

    doc.init({
      em: [{ title: 'one' }]
    });

    assert.ok(doc.isSelected('_id'));
    assert.ok(!doc.isSelected('test'));
    assert.ok(!doc.isSelected('numbers'));
    assert.ok(!doc.isSelected('oids'));
    assert.ok(!doc.isSelected('nested'));
    assert.ok(!doc.isSelected('nested.age'));
    assert.ok(!doc.isSelected('nested.cool'));
    assert.ok(!doc.isSelected('nested.path'));
    assert.ok(!doc.isSelected('nested.deep'));
    assert.ok(!doc.isSelected('nested.nope'));
    assert.ok(!doc.isSelected('nested.deep.x'));
    assert.ok(!doc.isSelected('nested.deep.x.no'));
    assert.ok(!doc.isSelected('nested.deep.y'));
    assert.ok(!doc.isSelected('noway'));
    assert.ok(!doc.isSelected('notapath'));
    assert.ok(doc.isSelected('em'));
    assert.ok(doc.isSelected('em.title'));
    assert.ok(!doc.isSelected('em.body'));
    assert.ok(!doc.isSelected('em.nonpath'));

    selection = {
      em: 0
    };

    doc = new TestDocument(undefined, selection);
    doc.init({
      test: 'test',
      numbers: [4, 5, 6, 7],
      nested: {
        age: 5,
        cool: DocumentObjectId.createFromHexString('4c6c2d6240ced95d0e00003c'),
        path: 'my path',
        deep: { x: 'a string' }
      },
      notapath: 'i am not in the schema'
    });

    assert.ok(doc.isSelected('_id'));
    assert.ok(doc.isSelected('test'));
    assert.ok(doc.isSelected('numbers'));
    assert.ok(doc.isSelected('oids'));
    assert.ok(doc.isSelected('nested'));
    assert.ok(doc.isSelected('nested.age'));
    assert.ok(doc.isSelected('nested.cool'));
    assert.ok(doc.isSelected('nested.path'));
    assert.ok(doc.isSelected('nested.deep'));
    assert.ok(doc.isSelected('nested.nope'));
    assert.ok(doc.isSelected('nested.deep.x'));
    assert.ok(doc.isSelected('nested.deep.x.no'));
    assert.ok(doc.isSelected('nested.deep.y'));
    assert.ok(doc.isSelected('noway'));
    assert.ok(doc.isSelected('notapath'));
    assert.ok(!doc.isSelected('em'));
    assert.ok(!doc.isSelected('em.title'));
    assert.ok(!doc.isSelected('em.body'));
    assert.ok(!doc.isSelected('em.nonpath'));

    selection = {
      _id: 0
    };

    doc = new TestDocument(undefined, selection);
    doc.init({
      test: 'test',
      numbers: [4, 5, 6, 7],
      nested: {
        age: 5,
        cool: DocumentObjectId.createFromHexString('4c6c2d6240ced95d0e00003c'),
        path: 'my path',
        deep: { x: 'a string' }
      },
      notapath: 'i am not in the schema'
    });

    assert.ok(!doc.isSelected('_id'));
    assert.ok(doc.isSelected('nested.deep.x.no'));

    doc = new TestDocument({ test: 'boom' });
    assert.ok(doc.isSelected('_id'));
    assert.ok(doc.isSelected('test'));
    assert.ok(doc.isSelected('numbers'));
    assert.ok(doc.isSelected('oids'));
    assert.ok(doc.isSelected('nested'));
    assert.ok(doc.isSelected('nested.age'));
    assert.ok(doc.isSelected('nested.cool'));
    assert.ok(doc.isSelected('nested.path'));
    assert.ok(doc.isSelected('nested.deep'));
    assert.ok(doc.isSelected('nested.nope'));
    assert.ok(doc.isSelected('nested.deep.x'));
    assert.ok(doc.isSelected('nested.deep.x.no'));
    assert.ok(doc.isSelected('nested.deep.y'));
    assert.ok(doc.isSelected('noway'));
    assert.ok(doc.isSelected('notapath'));
    assert.ok(doc.isSelected('em'));
    assert.ok(doc.isSelected('em.title'));
    assert.ok(doc.isSelected('em.body'));
    assert.ok(doc.isSelected('em.nonpath'));

    selection = {
      _id: 1
    };

    doc = new TestDocument(undefined, selection);
    doc.init({ _id: 'test' });

    assert.ok(doc.isSelected('_id'));
    assert.ok(!doc.isSelected('test'));

    doc = new TestDocument({ test: 'boom' }, true);
    assert.ok(doc.isSelected('_id'));
    assert.ok(doc.isSelected('test'));
    assert.ok(doc.isSelected('numbers'));
    assert.ok(doc.isSelected('oids'));
    assert.ok(doc.isSelected('nested'));
    assert.ok(doc.isSelected('nested.age'));
    assert.ok(doc.isSelected('nested.cool'));
    assert.ok(doc.isSelected('nested.path'));
    assert.ok(doc.isSelected('nested.deep'));
    assert.ok(doc.isSelected('nested.nope'));
    assert.ok(doc.isSelected('nested.deep.x'));
    assert.ok(doc.isSelected('nested.deep.x.no'));
    assert.ok(doc.isSelected('nested.deep.y'));
    assert.ok(doc.isSelected('noway'));
    assert.ok(doc.isSelected('notapath'));
    assert.ok(doc.isSelected('em'));
    assert.ok(doc.isSelected('em.title'));
    assert.ok(doc.isSelected('em.body'));
    assert.ok(doc.isSelected('em.nonpath'));

    selection = {
      _id: 1,
      n: 1
    };

    doc = new TestDocument(undefined, selection);
    doc.init({
      test: 'test',
      numbers: [4, 5, 6, 7],
      nested: {
        age: 5,
        cool: DocumentObjectId.createFromHexString('4c6c2d6240ced95d0e00003c'),
        path: 'my path',
        deep: { x: 'a string' }
      },
      notapath: 'i am not in the schema'
    });

    assert.ok(doc.isSelected('_id'));
    assert.ok(doc.isSelected('n'));
    assert.ok(!doc.isSelected('nested'));
    assert.ok(!doc.isSelected('nested.age'));
    assert.ok(!doc.isSelected('numbers'));
  });

  it('isSelected() with both a path and a deeper path underneath it explicitly projected', function() {
    // when neither `path` itself nor an ancestor/descendant relationship is
    // unambiguous (here, "nested.deep" is both a descendant of "nested" and
    // an ancestor of "nested.deep.x", which are both explicitly projected),
    // the key that was inserted first into the projection object wins - this
    // pins down that internal ordering so it can't silently change
    let doc = new TestDocument(undefined, { nested: 0, 'nested.deep.x': 0 });
    doc.init({ nested: { age: 5, deep: { x: 'a string' } } });
    assert.ok(!doc.isSelected('nested.deep'));

    doc = new TestDocument(undefined, { 'nested.deep.x': 0, nested: 0 });
    doc.init({ nested: { age: 5, deep: { x: 'a string' } } });
    assert.ok(doc.isSelected('nested.deep'));
  });

  it('does not build the selectedInfo cache from direct doc.isSelected() calls alone (gh-16385)', function() {
    const doc = new TestDocument(undefined, { test: 1, nested: 1 });
    doc.init({
      test: 'test',
      nested: { age: 5, path: 'my path', deep: { x: 'a string' } }
    });

    for (let i = 0; i < 30; ++i) {
      assert.ok(doc.isSelected('test'));
      assert.equal(doc.$__.selectedInfo, null, `selectedInfo should stay unset after direct call ${i + 1}`);
    }

    assert.ok(!doc.isSelected('notselected'));
  });

  it('proactively builds the selectedInfo cache when a caller is about to make many isSelected() calls (gh-16385)', function() {
    const doc = new TestDocument(undefined, { test: 1, nested: 1 });
    doc.init({
      test: 'test',
      nested: { age: 5, path: 'my path', deep: { x: 'a string' } }
    });

    assert.equal(doc.$__.selectedInfo, null);

    // `applyGetters()` (called from `toObject()`) walks every schema path
    // (15 of them for this test schema) and calls `isSelected()` on each -
    // well over the build threshold, so it should build the cache upfront.
    doc.toObject({ getters: true });
    assert.ok(doc.$__.selectedInfo != null, 'selectedInfo should be built proactively by applyGetters()');

    // still correct once the cache is in play
    assert.ok(doc.isSelected('test'));
    assert.ok(doc.isSelected('nested'));
    assert.ok(!doc.isSelected('numbers'));
  });

  it('does not build the selectedInfo cache right at the promotion threshold (gh-16385)', function() {
    // 10 regular fields + `_id` = 11 schema paths, and `_id` doesn't count
    // toward the expected call count (see applyGetters()), so this lands
    // exactly on the threshold (10) - still not worth building the trie for.
    const schemaDef = {};
    for (let i = 0; i < 10; i++) {
      schemaDef[`field${i}`] = String;
    }
    const thresholdSchema = new Schema(schemaDef, { versionKey: false });
    const Model = mongoose.model('gh16385ThresholdBoundaryAt', thresholdSchema);

    const projection = {};
    for (let i = 0; i < 5; i++) projection[`field${i}`] = 1;

    const doc = new Model({}, projection);
    doc.toObject({ getters: true });
    assert.equal(doc.$__.selectedInfo, null, 'selectedInfo should stay unset exactly at the threshold');
  });

  it('builds the selectedInfo cache just past the promotion threshold (gh-16385)', function() {
    // 11 regular fields + `_id` = 12 schema paths, so the `_id`-excluded
    // expected call count is 11 - one past the threshold.
    const schemaDef = {};
    for (let i = 0; i < 11; i++) {
      schemaDef[`field${i}`] = String;
    }
    const thresholdSchema = new Schema(schemaDef, { versionKey: false });
    const Model = mongoose.model('gh16385ThresholdBoundaryPast', thresholdSchema);

    const projection = {};
    for (let i = 0; i < 5; i++) projection[`field${i}`] = 1;

    const doc = new Model({}, projection);
    doc.toObject({ getters: true });
    assert.ok(doc.$__.selectedInfo != null, 'selectedInfo should be built one call past the threshold');
  });

  it('proactively builds the selectedInfo cache when validate() checks enough required paths (gh-16385)', async function() {
    // `field0`..`field14` are required but excluded from the projection
    // below and never given a value, so they stay in the document's
    // 'require' active-path bucket (see `_getPathsToValidate()`) and each
    // goes through the `isSelected()` filter - well over the build
    // threshold, and none of them fail validation since the query legitimately
    // never fetched them (isSelected() returns false, so they're skipped).
    const schemaDef = { other: String };
    for (let i = 0; i < 15; i++) {
      schemaDef[`field${i}`] = { type: String, required: true };
    }
    const validateSchema = new Schema(schemaDef, { versionKey: false });
    const Model = mongoose.model('gh16385ValidateSelectedInfo', validateSchema);

    // constructs a document the same way query hydration does for a
    // projected query result (see `Query.prototype._completeMany`)
    const doc = new Model({ other: 'x' }, { other: 1 });
    assert.equal(doc.$__.selectedInfo, null);

    await doc.validate();
    assert.ok(doc.$__.selectedInfo != null, 'selectedInfo should be built proactively by _getPathsToValidate()');
  });

  it('shares one selectedInfo trie across documents hydrated with the same projection object (gh-16385)', function() {
    const projection = { test: 1, nested: 1 };

    // both documents get the *same* `projection` object reference, mirroring
    // how `Query#_completeMany` hands every document from one query's
    // results the same `fields` object (see lib/queryHelpers.js createModel())
    const doc1 = new TestDocument(undefined, projection);
    doc1.init({ test: 'a', nested: { age: 1, path: 'p1', deep: { x: 'x1' } } });
    const doc2 = new TestDocument(undefined, projection);
    doc2.init({ test: 'b', nested: { age: 2, path: 'p2', deep: { x: 'x2' } } });

    doc1.toObject({ getters: true });
    doc2.toObject({ getters: true });

    assert.ok(doc1.$__.selectedInfo != null);
    assert.ok(doc2.$__.selectedInfo != null);
    assert.strictEqual(doc1.$__.selectedInfo, doc2.$__.selectedInfo,
      'documents sharing the same projection object should share one trie, not build separate copies');
  });

  it('isDirectSelected (gh-5063)', function() {
    const selection = {
      test: 1,
      numbers: 1,
      'nested.deep': 1,
      oids: 1
    };

    const doc = new TestDocument(undefined, selection);

    doc.init({
      test: 'test',
      numbers: [4, 5, 6, 7],
      nested: {
        deep: { x: 'a string' }
      }
    });

    assert.ok(doc.isDirectSelected('nested.deep'));
    assert.ok(!doc.isDirectSelected('nested.cool'));
    assert.ok(!doc.isDirectSelected('nested'));

    assert.ok(doc.isDirectSelected('nested.deep nested'));
    assert.ok(!doc.isDirectSelected('nested.cool nested'));

    assert.ok(doc.isDirectSelected(['nested.deep', 'nested']));
    assert.ok(!doc.isDirectSelected(['nested.cool', 'nested']));
  });
});
