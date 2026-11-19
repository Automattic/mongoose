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

  describe('flat projections (gh-16373)', function() {
    it('inclusive projection with no nested keys', function() {
      const doc = new TestDocument(undefined, { test: 1, numbers: 1 });

      assert.ok(doc.isSelected('test'));
      assert.ok(doc.isSelected('numbers'));
      assert.ok(doc.isSelected('_id'));
      // `nested` is not projected, so neither it nor its children are selected
      assert.ok(!doc.isSelected('nested'));
      assert.ok(!doc.isSelected('nested.age'));
      assert.ok(!doc.isSelected('nested.deep.x'));
      assert.ok(!doc.isSelected('date'));
    });

    it('exclusive projection with no nested keys', function() {
      const doc = new TestDocument(undefined, { nested: 0 });

      assert.ok(doc.isSelected('test'));
      assert.ok(doc.isSelected('date'));
      // `nested` is excluded, so its children are excluded too
      assert.ok(!doc.isSelected('nested'));
      assert.ok(!doc.isSelected('nested.age'));
      assert.ok(!doc.isSelected('nested.deep.x'));
    });

    it('projecting a parent selects its children', function() {
      const doc = new TestDocument(undefined, { nested: 1 });

      assert.ok(doc.isSelected('nested'));
      assert.ok(doc.isSelected('nested.age'));
      assert.ok(doc.isSelected('nested.deep.x'));
      assert.ok(!doc.isSelected('test'));
    });

    it('agrees with nested projections that select the same paths', function() {
      // A flat projection takes the optimized path, a projection containing a
      // nested key takes the general path. Both must agree on shared paths.
      const flat = new TestDocument(undefined, { nested: 1 });
      const nested = new TestDocument(undefined, { nested: 1, 'nested2.yup': 1 });

      for (const path of ['nested', 'nested.age', 'nested.deep.x', 'test', 'date']) {
        assert.equal(
          flat.isSelected(path),
          nested.isSelected(path),
          `disagreement on ${path}`
        );
      }
    });
  });

  describe('nested projections (gh-16373)', function() {
    it('distinguishes path prefixes from ancestors and descendants', function() {
      const doc = new TestDocument(undefined, { 'nested.deep': 1, 'nested2.yup.nested': 1 });

      for (const path of ['nested', 'nested.deep', 'nested.deep.x', 'nested2', 'nested2.yup']) {
        assert.strictEqual(doc.isSelected(path), true, path);
      }
      for (const path of ['nest', 'nested.dee', 'nested.deeply', 'nested.age', 'nested2.yup.other']) {
        assert.strictEqual(doc.isSelected(path), false, path);
      }
      assert.strictEqual(doc.isDirectSelected('nested'), false);
      assert.strictEqual(doc.isDirectSelected('nested.deep'), true);
    });

    it('keeps parents and siblings selected when nested leaves are excluded', function() {
      const doc = new TestDocument(undefined, { 'nested.deep.x': 0, 'nested2.yup.nested': 0 });

      for (const path of ['nested', 'nested.deep', 'nested.deep.y', 'nested2', 'nested2.yup', 'test']) {
        assert.strictEqual(doc.isSelected(path), true, path);
      }
      for (const path of ['nested.deep.x', 'nested.deep.x.child', 'nested2.yup.nested']) {
        assert.strictEqual(doc.isSelected(path), false, path);
      }
    });

    it('preserves projection order when both an ancestor and a descendant match', function() {
      const ancestorFirst = new TestDocument(undefined, { a: 0, 'a.b.c': 0 });
      const descendantFirst = new TestDocument(undefined, { 'a.b.c': 0, a: 0 });

      assert.strictEqual(ancestorFirst.isSelected('a.b'), false);
      assert.strictEqual(descendantFirst.isSelected('a.b'), true);
      assert.strictEqual(ancestorFirst.isSelected('a.b.c.d'), false);
      assert.strictEqual(descendantFirst.isSelected('a.b.c.d'), false);
    });

    it('preserves selection of paths containing empty segments', function() {
      const doc = new TestDocument(undefined, { 'a.b.': 0, 'a..c': 0 });

      assert.strictEqual(doc.isSelected('a'), true);
      assert.strictEqual(doc.isSelected('a.b'), false);
      assert.strictEqual(doc.isSelected('a.b.child'), true);
      assert.strictEqual(doc.isSelected('a.b..child'), false);
      assert.strictEqual(doc.isSelected('a.'), true);
      assert.strictEqual(doc.isSelected('a..c.child'), false);
    });

    it('keeps _id handling separate from nested path selection', function() {
      const doc = new TestDocument(undefined, { _id: 0, 'nested.deep': 1 });

      assert.strictEqual(doc.isSelected('_id'), false);
      assert.strictEqual(doc.isSelected('_id.child'), false);
      assert.strictEqual(doc.isSelected('nested.deep.x'), true);
      assert.strictEqual(doc.isSelected(['test', 'nested.deep.x']), true);
      assert.strictEqual(doc.isSelected('test nested.age'), false);
    });

    it('applies getters only to selected nested fields on hydrated documents', function() {
      const getterCalls = [];
      const schema = new Schema({
        nested: {
          selected: {
            type: String,
            get: value => {
              getterCalls.push('selected');
              return value.toUpperCase();
            }
          },
          excluded: {
            type: String,
            get: () => {
              getterCalls.push('excluded');
              return 'unexpected';
            }
          }
        },
        other: {
          type: String,
          get: () => {
            getterCalls.push('other');
            return 'unexpected';
          }
        }
      });
      const Model = mongoose.model('NestedProjectionGetters', schema);
      try {
        const doc = Model.hydrate({ nested: { selected: 'value' } }, { 'nested.selected': 1 });

        assert.deepStrictEqual(doc.toObject({ getters: true, virtuals: false }), { nested: { selected: 'VALUE' } });
        assert.deepStrictEqual(getterCalls, ['selected']);
      } finally {
        mongoose.deleteModel('NestedProjectionGetters');
      }
    });
  });
});
