'use strict';

const assert = require('assert');
const mongoose = require('../');

const Schema = mongoose.Schema;

describe('set() dotted paths through document arrays (gh-16698)', function() {
  function model(name, schema) {
    const base = new mongoose.Mongoose();
    return base.model(name, schema);
  }

  function hydrateItems(Test, items) {
    return Test.hydrate({
      _id: new mongoose.Types.ObjectId(),
      items: items
    });
  }

  it('updates nested paths underneath a document array element (gh-16698)', function() {
    const itemSchema = new Schema({ name: String, a: { b: { c: { d: Number } } } });
    const Test = model('Test', new Schema({ items: [itemSchema] }));
    const hydrated = () => hydrateItems(Test, [{
      _id: new mongoose.Types.ObjectId(),
      name: 'x',
      a: { b: { c: { d: 1 } } }
    }]);

    const leaf = hydrated();
    leaf.set('items.0.a.b.c.d', 2);
    assert.ok(leaf.isModified('items.0.a.b.c.d'));
    assert.strictEqual(leaf.get('items.0.a.b.c.d'), 2);
    assert.deepStrictEqual(leaf.toObject().items[0].a, { b: { c: { d: 2 } } });
    assert.strictEqual(leaf.toObject().items[0].name, 'x');

    const nested = hydrated();
    nested.set('items.0.a.b.c', { d: 2 });
    assert.ok(nested.isModified('items.0.a.b.c'));
    assert.deepStrictEqual(nested.get('items.0.a.b.c'), { d: 2 });
    assert.deepStrictEqual(nested.toObject().items[0].a, { b: { c: { d: 2 } } });

    const viaObject = hydrated();
    viaObject.set({ 'items.0.a.b.c.d': 2 });
    assert.strictEqual(viaObject.get('items.0.a.b.c.d'), 2);
    assert.deepStrictEqual(viaObject.toObject().items[0].a, { b: { c: { d: 2 } } });

    const direct = hydrated();
    direct.items[0].set('a.b.c.d', 2);
    assert.deepStrictEqual(direct.toObject().items[0].a, { b: { c: { d: 2 } } });
  });

  it('updates nested paths through nested document arrays and maps of subdocs', function() {
    const nestedArrays = model('NestedArrays', new Schema({
      a: [{ b: [{ c: { d: Number, e: Number } }] }]
    }));
    const arrays = nestedArrays.hydrate({
      a: [{ b: [{ c: { d: 1, e: 9 } }] }]
    });
    arrays.set('a.0.b.0.c.d', 2);
    assert.strictEqual(arrays.get('a.0.b.0.c.d'), 2);
    assert.strictEqual(arrays.toObject().a[0].b[0].c.d, 2);
    assert.strictEqual(arrays.toObject().a[0].b[0].c.e, 9);
    arrays.set('a.0.b.0.c', { d: 3 });
    assert.deepStrictEqual(arrays.toObject().a[0].b[0].c, { d: 3 });

    const itemSchema = new Schema({ name: String, a: { b: { c: { d: Number } } } });
    const maps = model('MapOfSubdocs', new Schema({
      items: { type: Map, of: itemSchema }
    }));
    const mapped = maps.hydrate({
      items: { foo: { name: 'x', a: { b: { c: { d: 1 } } } } }
    });
    mapped.set('items.foo.a.b.c.d', 2);
    assert.strictEqual(mapped.get('items.foo.a.b.c.d'), 2);
    assert.ok(mapped.isModified('items.foo.a.b.c.d'));
    assert.strictEqual(mapped.toObject({ flattenMaps: true }).items.foo.a.b.c.d, 2);
    mapped.set('items.foo.a.b.c', { d: 4 });
    assert.deepStrictEqual(mapped.toObject({ flattenMaps: true }).items.foo.a, { b: { c: { d: 4 } } });
  });

  it('sets nested objects inside a single nested subdoc of a document array element', function() {
    const nested = new Schema({ b: { c: { d: Number, e: Number } } }, { _id: false });
    const itemSchema = new Schema({ name: String, a: nested });
    const parent = new Schema({ items: [itemSchema] });
    assert.strictEqual(itemSchema.pathType('a.b'), 'nested');
    assert.strictEqual(itemSchema.pathType('a.b.c'), 'nested');
    assert.strictEqual(itemSchema.pathType('a.b.c.d'), 'real');
    assert.strictEqual(parent.pathType('items.0.a.b.c'), 'nested');
    assert.strictEqual(parent.pathType('items.0.a.b.c'), 'nested');
    assert.strictEqual(parent.pathType('items.0.a.b.c.d'), 'real');

    const Test = model('SingleNested', parent);
    const hydrated = () => hydrateItems(Test, [{
      name: 'x',
      a: { b: { c: { d: 1, e: 9 } } }
    }]);

    const leaf = hydrated();
    leaf.set('items.0.a.b.c.d', 2);
    assert.strictEqual(leaf.get('items.0.a.b.c.d'), 2);
    assert.strictEqual(leaf.toObject().items[0].a.b.c.e, 9);

    const nestedObject = hydrated();
    nestedObject.set('items.0.a.b.c', { d: 2 });
    assert.ok(nestedObject.isModified('items.0.a.b.c'));
    assert.deepStrictEqual(nestedObject.get('items.0.a.b.c'), { d: 2 });
    assert.deepStrictEqual(nestedObject.toObject().items[0].a, { b: { c: { d: 2 } } });
    assert.strictEqual(nestedObject.toObject().items[0].name, 'x');

    const parentNested = hydrated();
    parentNested.set('items.0.a.b', { c: { d: 3 } });
    assert.deepStrictEqual(parentNested.toObject().items[0].a, { b: { c: { d: 3 } } });

    const viaObject = hydrated();
    viaObject.set({ 'items.0.a.b.c.d': 5 });
    assert.strictEqual(viaObject.get('items.0.a.b.c.d'), 5);
    assert.strictEqual(viaObject.toObject().items[0].a.b.c.e, 9);

    const Top = model('TopSingleNested', new Schema({ a: nested }));
    const top = Top.hydrate({ a: { b: { c: { d: 1, e: 9 } } } });
    top.set('a.b.c', { d: 2 });
    assert.deepStrictEqual(top.toObject().a, { b: { c: { d: 2 } } });
    top.set('a.b.c.d', 6);
    assert.strictEqual(top.get('a.b.c.d'), 6);
  });

  it('does not let a positional pathType lookup bypass strict mode', function() {
    const itemSchema = new Schema({ name: String });
    const parent = new Schema({ items: [itemSchema] });
    assert.strictEqual(parent.pathType('items.0.notReal'), 'adhocOrUndefined');
    assert.strictEqual(parent.pathType('items.0.notReal'), 'adhocOrUndefined');
    assert.strictEqual(parent.pathType('items.0.toString'), 'adhocOrUndefined');

    const Test = model('Strict', parent);
    const doc = hydrateItems(Test, [{ name: 'x' }]);
    doc.set('items.0.notReal', 'pwn');
    assert.deepStrictEqual(doc.modifiedPaths(), []);
    assert.strictEqual(doc.get('items.0.notReal'), undefined);
    assert.strictEqual(doc.toObject().items[0].notReal, undefined);
    assert.strictEqual(doc.toObject().items[0].name, 'x');
  });

  it('does not walk inherited properties through document array subdocuments', function() {
    const itemSchema = new Schema({
      name: String,
      a: { b: { c: { d: Number } } }
    }, { strict: false });
    const Test = model('Loose', new Schema({
      items: [itemSchema]
    }, { strict: false }));
    const doc = hydrateItems(Test, [{
      name: 'x',
      a: { b: { c: { d: 1 } } }
    }]);

    try {
      doc.set('items.0.toString.polluted', 'yes');
      doc.set('items.0.valueOf.polluted', 'yes');
      doc.set('items.0.constructor.prototype.polluted', 'yes');
      doc.set('items.0.__proto__.polluted', 'yes');
      doc.set('items.0.a.toString.polluted', 'yes');
      doc.set('items.0.a.constructor.polluted', 'yes');
      doc.set('items.0.a.b.toObject.polluted', 'yes');
      doc.set('items.0.a.b.$__schema.polluted', 'yes');
      doc.set('items.0.a.b.c.constructor.polluted', 'yes');

      assert.strictEqual(Object.prototype.polluted, undefined);
      assert.strictEqual(Object.prototype.toString.polluted, undefined);
      assert.strictEqual(Object.prototype.valueOf.polluted, undefined);
      assert.strictEqual(Array.prototype.polluted, undefined);
      assert.strictEqual(Function.prototype.polluted, undefined);
      assert.strictEqual(mongoose.Document.prototype.polluted, undefined);
      assert.strictEqual(mongoose.Document.prototype.toObject.polluted, undefined);
      assert.strictEqual(itemSchema.polluted, undefined);
      assert.strictEqual(itemSchema.options.polluted, undefined);
      assert.ok(!Object.hasOwn(doc.items[0]._doc, 'toString'));
      assert.ok(!Object.hasOwn(doc.items[0]._doc, 'constructor'));
      assert.deepStrictEqual(doc.toObject().items[0].a, { b: { c: { d: 1 } } });
      assert.strictEqual(typeof doc.items[0].toObject, 'function');
      assert.strictEqual(typeof doc.items[0].a.toString, 'function');
    } finally {
      delete Object.prototype.polluted;
      delete Object.prototype.toString.polluted;
      delete Object.prototype.valueOf.polluted;
      delete Array.prototype.polluted;
      delete Function.prototype.polluted;
      delete mongoose.Document.prototype.polluted;
      delete mongoose.Document.prototype.toObject.polluted;
      delete itemSchema.polluted;
      delete itemSchema.options.polluted;
    }
  });
});
