'use strict';

const Query = require('../../lib/query');
const Schema = require('../../lib/schema');
const Types = require('../../lib/types');
const assert = require('assert');
const castArrayFilters = require('../../lib/helpers/update/castArrayFilters');

describe('castArrayFilters', function() {
  it('works', function() {
    const schema = new Schema({ comments: [{ date: Date }] });
    const q = new Query();
    q.schema = schema;

    q.updateOne({}, { $set: { 'comments.$[x].date': '2018-01-01' } }, {
      arrayFilters: [{ 'x.date': { $gte: '2018-01-01' } }]
    });
    castArrayFilters(q);

    assert.ok(q.options.arrayFilters[0]['x.date'].$gte instanceof Date);
  });

  it('casts multiple', function() {
    const schema = new Schema({
      comments: [{
        text: String,
        replies: [{ date: Date }]
      }]
    });
    const q = new Query();
    q.schema = schema;

    q.updateOne({}, { $set: { 'comments.$[x].replies.$[y].date': '2018-01-01' } }, {
      arrayFilters: [{ 'x.text': 123 }, { 'y.date': { $gte: '2018-01-01' } }]
    });
    castArrayFilters(q);
    assert.strictEqual(q.options.arrayFilters[0]['x.text'], '123');
    assert.ok(q.options.arrayFilters[1]['y.date'].$gte instanceof Date);
  });

  it('casts on multiple fields', function() {
    const schema = new Schema({
      comments: [{
        text: String,
        replies: [{
          beginAt: Date,
          endAt: Date
        }]
      }]
    });
    const q = new Query();
    q.schema = schema;

    q.updateOne({}, { $set: { 'comments.$[x].replies.$[y].endAt': '2019-01-01' } }, {
      arrayFilters: [{ 'x.text': 123 }, { 'y.beginAt': { $gte: '2018-01-01' }, 'y.endAt': { $lt: '2020-01-01' } }]
    });
    castArrayFilters(q);

    assert.strictEqual(q.options.arrayFilters[0]['x.text'], '123');
    assert.ok(q.options.arrayFilters[1]['y.beginAt'].$gte instanceof Date);
    assert.ok(q.options.arrayFilters[1]['y.endAt'].$lt instanceof Date);
  });

  it('sane error on same filter twice', function() {
    const schema = new Schema({
      comments: [{
        text: String,
        replies: [{ date: Date }]
      }]
    });
    const q = new Query();
    q.schema = schema;

    q.updateOne({}, { $set: { 'comments.$[x].replies.$[x].date': '2018-01-01' } }, {
      arrayFilters: [{ 'x.text': 123 }]
    });

    assert.throws(() => {
      castArrayFilters(q);
    }, /same array filter/);
  });

  it('using $in (gh-7431)', function() {
    const schema = new Schema({
      itemsInfo: {
        allUsers: { all: Number },
        individual: [{
          userId: String,
          all: Number
        }]
      }
    });
    const q = new Query();
    q.schema = schema;

    q.updateOne({}, {
      $inc: {
        'itemsInfo.allUsers.all': 1,
        'itemsInfo.individual.$[element].all': 1
      }
    },
    { arrayFilters: [{ 'element.userId': { $in: ['1', '2', '3'] } }] });
    castArrayFilters(q);

    assert.deepEqual(q.options.arrayFilters[0]['element.userId'].$in, ['1', '2', '3']);
  });

  it('all positional operator works (gh-7540)', function() {
    const schema = new Schema({
      doctorsAppointment: {
        queries: [{
          suggestedAppointment: [{ key: String, isDeleted: Boolean }]
        }]
      }
    });
    const q = new Query();
    q.schema = schema;

    const path = 'doctorsAppointment.queries.$[].suggestedAppointment.$[u].isDeleted';
    const update = { $set: { [path]: true } };
    q.updateOne({}, update, { arrayFilters: [{ 'u.key': 123 }] });

    castArrayFilters(q);

    assert.strictEqual(q.options.arrayFilters[0]['u.key'], '123');
  });

  it('handles deeply nested arrays (gh-7603)', function() {
    const schema = new Schema({
      arr: [{
        id: Number,
        nestedArr: [{ nestedId: Number, code: Boolean }]
      }]
    });
    const q = new Query();
    q.schema = schema;

    const p = { 'arr.$[arr].nestedArr.$[nArr].code': true };
    const opts = {
      arrayFilters: [
        { 'arr.nestedArr.nestedId': '2' },
        { 'nArr.nestedId': '2' }
      ]
    };

    q.updateOne({}, p, opts);

    castArrayFilters(q);

    assert.strictEqual(q.options.arrayFilters[0]['arr.nestedArr.nestedId'], 2);
    assert.strictEqual(q.options.arrayFilters[1]['nArr.nestedId'], 2);
  });

  it('respects `strictQuery` option (gh-7728)', function() {
    const schema = new Schema({
      arr: [{
        id: Number
      }]
    });
    const q = new Query();
    q.schema = schema;

    const p = { 'arr.$[arr].id': 42 };
    const opts = {
      arrayFilters: [
        { 'arr.notInSchema': '42' }
      ]
    };

    q.updateOne({}, p, opts);

    q.schema._userProvidedOptions.strictQuery = true;
    assert.throws(function() {
      castArrayFilters(q);
    }, /Could not find path.*in schema/);

    q.schema._userProvidedOptions.strictQuery = false;
    castArrayFilters(q);
    assert.strictEqual(q.options.arrayFilters[0]['arr.notInSchema'], '42');
  });

  it('respects `strict` override (gh-11062)', function() {
    const schema = new Schema({
      arr: [{
        id: Number
      }]
    });
    const q = new Query();
    q.schema = schema;

    const p = { 'arr.$[arr].id': 42 };
    const opts = {
      strict: false,
      arrayFilters: [
        { 'arr.notInSchema': '42' }
      ]
    };

    q.updateOne({}, p, opts);

    castArrayFilters(q);
    assert.strictEqual(q.options.arrayFilters[0]['arr.notInSchema'], '42');
  });

  it('respects `$or` option (gh-10696)', function() {
    const schema = new Schema({
      arr: [{
        id: Number
      }]
    });
    const q = new Query();
    q.schema = schema;

    const p = { 'arr.$[arr].id': 42 };
    const opts = {
      arrayFilters: [
        { $or: [{ 'arr.id': '12' }] }
      ]
    };

    q.updateOne({}, p, opts);
    castArrayFilters(q);

    assert.strictEqual(q.options.arrayFilters[0].$or[0]['arr.id'], 12);
  });

  it('respects global strictQuery option (gh-11836)', function() {
    const schema = new Schema({
      arr: [{
        id: Number
      }]
    });
    let q = new Query();
    q.schema = schema;
    q.model = { base: { Types, options: { strictQuery: false } } };

    let p = { 'arr.$[arr].id': 42 };
    let opts = {
      arrayFilters: [
        { $or: [{ 'arr.notInSchema': '12' }] }
      ]
    };

    q.updateOne({}, p, opts);
    castArrayFilters(q);

    assert.strictEqual(q.options.arrayFilters[0].$or[0]['arr.notInSchema'], '12');

    q = new Query();
    q.schema = schema;
    q.model = { base: { Types, options: { strictQuery: true } } };

    p = { 'arr.$[arr].id': 42 };
    opts = {
      arrayFilters: [
        { $or: [{ 'arr.notInSchema': '12' }] }
      ]
    };

    q.updateOne({}, p, opts);
    assert.throws(() => {
      castArrayFilters(q);
    }, /Could not find path "arr\.0\.notInSchema" in schema/);
  });

  it('handles embedded discriminators (gh-12565)', function() {
    const elementSchema = new Schema(
      { elementType: String },
      { discriminatorKey: 'elementType' }
    );
    const versionSchema = new Schema(
      { version: Number, elements: [elementSchema] },
      { strictQuery: 'throw' }
    );
    versionSchema.path('elements').discriminator(
      'Graph',
      new Schema({
        number: Number,
        curves: [{ line: { label: String, type: String, number: String, latLong: [Number], controller: String } }]
      })
    );

    const testSchema = new Schema({ versions: [versionSchema] });

    const q = new Query();
    q.schema = testSchema;

    const p = {
      $push: {
        'versions.$[version].elements.$[element].curves': {
          line: {
            label: 'CC110_Ligne 02',
            type: 'numerique',
            number: '30',
            latLong: [44, 8],
            controller: 'CC110'
          }
        }
      }
    };
    const opts = {
      arrayFilters: [
        {
          'element.elementType': 'Graph',
          'element.number': '1'
        }
      ]
    };
    q.updateOne({}, p, opts);
    castArrayFilters(q);

    assert.strictEqual(q.options.arrayFilters[0]['element.number'], 1);
  });

  it('correctly casts array of strings underneath doc array (gh-12565)', function() {
    const userSchema = new Schema({
      groups: [{
        document: 'ObjectId',
        tags: [String]
      }]
    });

    const q = new Query();
    q.schema = userSchema;

    const groupId = new Types.ObjectId();
    const filter = {
      groups: {
        $elemMatch: {
          document: groupId,
          tags: 'tag-to-update'
        }
      }
    };
    const update = {
      $set: {
        'groups.$[group].tags.$[tag]': 42
      }
    };
    const opts = {
      arrayFilters: [
        { 'group.document': groupId },
        { tag: { $eq: 'tag-to-update' } }
      ]
    };
    q.updateOne(filter, update, opts);
    castArrayFilters(q);
    q._update = q._castUpdate(q._update, false);

    assert.strictEqual(q.getUpdate().$set['groups.$[group].tags.$[tag]'], '42');
  });

  it('casts paths underneath embedded discriminators (gh-15386)', async function() {
    const eventSchema = new Schema({ message: String }, { discriminatorKey: 'kind', _id: false });
    const batchSchema = new Schema({ events: [eventSchema] });

    const docArray = batchSchema.path('events');
    docArray.discriminator('Clicked', new Schema({ element: { type: String, required: true } }, { _id: false }));

    const productSchema = new Schema({
      name: String,
      price: Number
    });

    docArray.discriminator(
      'Purchased',
      new Schema({
        products: {
          type: [productSchema],
          required: true
        }
      })
    );

    const q = new Query();
    q.schema = batchSchema;

    const filter = {};
    const update = {
      $set: {
        'events.$[event].products.$[product].price': '20'
      }
    };
    const purchasedId = new Types.ObjectId();
    const productId = new Types.ObjectId();
    const opts = {
      arrayFilters: [
        { 'event._id': purchasedId, 'event.kind': 'Purchased' },
        { 'product._id': productId.toString() }
      ]
    };

    q.updateOne(filter, update, opts);
    castArrayFilters(q);
    q._update = q._castUpdate(q._update, false);

    assert.strictEqual(q.getOptions().arrayFilters[1]['product._id'].toHexString(), productId.toHexString());
    assert.strictEqual(q.getUpdate().$set['events.$[event].products.$[product].price'], 20);
  });
});
