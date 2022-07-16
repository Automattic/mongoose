'use strict';

const applyTimestampsToUpdate = require('../../lib/helpers/update/applyTimestampsToUpdate');
const assert = require('assert');

describe('applyTimestampsToUpdate', function() {
  it('handles update pipelines (gh-11151)', function() {
    const update = [{ $set: { title: 'mongoose-with-aggregate-set' } }];
    const now = new Date('2016-01-01');
    const res = applyTimestampsToUpdate(now, 'created_at', 'updated_at', update, {});

    assert.equal(res.length, 2);
    assert.equal(res[1].$set.updated_at.valueOf(), now.valueOf());
  });
});
