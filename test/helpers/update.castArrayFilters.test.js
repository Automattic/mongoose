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
});
