'use strict';

const Query = require('../../lib/query');
const Schema = require('../../lib/schema');
const assert = require('assert');
const castArrayFilters = require('../../lib/helpers/update/castArrayFilters');

describe('castArrayFilters', function() {
  it('works', function(done) {
    const schema = new Schema({ comments: [{ date: Date }] });
    const q = new Query();
    q.schema = schema;

    q.updateOne({}, { $set: { 'comments.$[x].date': '2018-01-01' } }, {
      arrayFilters: [{ 'x.date': { $gte: '2018-01-01' } }]
    });
    castArrayFilters(q);

    assert.ok(q.options.arrayFilters[0]['x.date'].$gte instanceof Date);

    done();
  });

  it('casts multiple', function(done) {
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

    done();
  });

  it('sane error on same filter twice', function(done) {
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

    done();
  });

  it('using $in (gh-7431)', function(done) {
    const schema = new Schema({
      itemsInfo: {
        allUsers: { all: Number },
        individual: [{
          userId: String,
          all: Number,
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

    done();
  });
});
