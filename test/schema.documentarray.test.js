'use strict';

/**
 * Module dependencies.
 */

const start = require('./common');

const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

/**
 * Test.
 */

describe('schema.documentarray', function() {
  it('defaults should be preserved', function(done) {
    const child = new Schema({ title: String });

    const schema1 = new Schema({ x: { type: [child], default: [{ title: 'Prometheus' }] } });
    const schema2 = new Schema({ x: { type: [child], default: { title: 'Prometheus' } } });
    const schema3 = new Schema({
      x: {
        type: [child], default: function() {
          return [{ title: 'Prometheus' }];
        }
      }
    });

    const M = mongoose.model('DefaultDocArrays1', schema1);
    const N = mongoose.model('DefaultDocArrays2', schema2);
    const O = mongoose.model('DefaultDocArrays3', schema3);

    [M, N, O].forEach(function(M) {
      const m = new M();
      assert.ok(Array.isArray(m.x));
      assert.equal(m.x.length, 1);
      assert.equal(m.x[0].title, 'Prometheus');
    });
    done();
  });

  it('only sets if document has same schema (gh-3701)', function(done) {
    const schema1 = new Schema({
      arr: [new Schema({ a: Number, b: Number }, { _id: false })]
    });
    const schema2 = new Schema({
      arr: [new Schema({ a: Number }, { _id: false })]
    });

    const Model1 = mongoose.model('gh3701_0', schema1);
    const Model2 = mongoose.model('gh3701_1', schema2);

    const source = new Model1({ arr: [{ a: 1, b: 1 }, { a: 2, b: 2 }] });
    const dest = new Model2({ arr: source.arr });

    assert.deepEqual(dest.toObject().arr, [{ a: 1 }, { a: 2 }]);
    done();
  });

  it('sets $implicitlyCreated if created by interpretAsType (gh-4271)', function(done) {
    const schema1 = new Schema({
      arr: [{ name: String }]
    });
    const schema2 = new Schema({
      arr: [new Schema({ name: String })]
    });

    assert.equal(schema1.childSchemas.length, 1);
    assert.equal(schema2.childSchemas.length, 1);
    assert.ok(schema1.childSchemas[0].schema.$implicitlyCreated);
    assert.ok(!schema2.childSchemas[0].schema.$implicitlyCreated);
    done();
  });

  it('propagates strictQuery to implicitly created schemas (gh-12796)', function() {
    const schema = new Schema({
      arr: [{ name: String }]
    }, { strictQuery: 'throw' });

    assert.equal(schema.childSchemas.length, 1);
    assert.equal(schema.childSchemas[0].schema.options.strictQuery, 'throw');
  });

  it('supports set with array of document arrays (gh-7799)', function() {
    const subSchema = new Schema({
      title: String
    });

    const nestedSchema = new Schema({
      nested: [[subSchema]]
    });

    const Nested = mongoose.model('gh7799', nestedSchema);

    const doc = new Nested({ nested: [[{ title: 'cool' }, { title: 'not cool' }]] });
    assert.equal(doc.nested[0].length, 2);
    assert.equal(doc.nested[0][0].title, 'cool');

    doc.set({ nested: [[{ title: 'new' }]] });
    assert.equal(doc.nested[0].length, 1);
    assert.equal(doc.nested[0][0].title, 'new');

    doc.nested = [[{ title: 'first' }, { title: 'second' }, { title: 'third' }]];
    assert.equal(doc.nested[0].length, 3);
    assert.equal(doc.nested[0][1].title, 'second');
  });

  it('supports `set()` (gh-8883)', function() {
    mongoose.deleteModel(/Test/);
    mongoose.Schema.Types.DocumentArray.set('_id', false);

    const Model = mongoose.model('Test', mongoose.Schema({
      arr: { type: [{ name: String }] }
    }));

    const doc = new Model({ arr: [{ name: 'test' }] });

    assert.equal(doc.arr.length, 1);
    assert.ok(!doc.arr[0]._id);

    mongoose.Schema.Types.DocumentArray.defaultOptions = {};
  });

  it('handles default function that returns null (gh-11058)', async function() {
    const testSchema = new Schema({
      comments: {
        type: [{ prop: String }],
        default: () => null
      }
    });

    const value = testSchema.path('comments').getDefault();
    assert.strictEqual(value, null);
  });

  it('doValidate() validates entire subdocument (gh-11770)', async function() {
    mongoose.deleteModel(/Test/);

    const testSchema = new Schema({
      comments: [{
        text: {
          type: String,
          required: true
        }
      }]
    });
    const TestModel = mongoose.model('Test', testSchema);
    const testDoc = new TestModel();

    const err = await new Promise((resolve, reject) => {
      testSchema.path('comments').$embeddedSchemaType.doValidate({}, err => {
        if (err != null) {
          return reject(err);
        }
        resolve();
      }, testDoc.comments, { index: 1 });
    }).then(() => null, err => err);
    assert.equal(err.name, 'ValidationError');
    assert.equal(err.message, 'Validation failed: text: Path `text` is required.');
  });
});
