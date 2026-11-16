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

  it('respects updatedAt: false for update pipelines', function() {
    const update = [{ $set: { title: 'mongoose' } }];
    const now = new Date('2016-01-01');
    const res = applyTimestampsToUpdate(now, 'createdAt', 'updatedAt', update, {
      timestamps: { updatedAt: false }
    });

    assert.deepStrictEqual(res, [{ $set: { title: 'mongoose' } }]);
  });

  it('still updates pipeline timestamps when only createdAt is disabled', function() {
    const update = [{ $set: { title: 'mongoose' } }];
    const now = new Date('2016-01-01');
    const res = applyTimestampsToUpdate(now, 'createdAt', 'updatedAt', update, {
      timestamps: { createdAt: false }
    });

    assert.deepStrictEqual(res, [
      { $set: { title: 'mongoose' } },
      { $set: { updatedAt: now } }
    ]);
  });

  it('does not add pipeline timestamps when timestamps are disabled', function() {
    const update = [{ $set: { title: 'mongoose' } }];
    const now = new Date('2016-01-01');
    const res = applyTimestampsToUpdate(now, 'createdAt', 'updatedAt', update, {
      timestamps: false
    });

    assert.deepStrictEqual(res, [{ $set: { title: 'mongoose' } }]);
  });

  it('does not set createdAt unless upsert is enabled', function() {
    const update = { $set: { title: 'mongoose' } };
    const now = new Date('2016-01-01');
    const res = applyTimestampsToUpdate(now, 'created_at', 'updated_at', update, {});

    assert.deepEqual(res, {
      $set: {
        title: 'mongoose',
        updated_at: now
      }
    });
  });
});
