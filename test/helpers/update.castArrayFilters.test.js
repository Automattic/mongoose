'use strict';

const Query = require('../../lib/query');
const Schema = require('../../lib/schema');
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
});
