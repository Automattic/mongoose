'use strict';

const Schema = require('../../lib/schema');
const applyTimestampsToChildren = require('../../lib/helpers/update/applyTimestampsToChildren');
const assert = require('assert');

describe('applyTimestampsToChildren', function() {
  it('applies timestamps to nested subdocs within a $push (gh-11775)', function() {
    const update = {
      $push: {
        l1: {
          l2: {
            prop: 'test'
          }
        }
      }
    };
    const now = new Date('2016-01-01');
    const schema = new Schema({
      l1: [new Schema({ l2: new Schema({ prop: String }, { timestamps: true }) }, { timestamps: true })]
    });
    applyTimestampsToChildren(now, update, schema);

    assert.equal(update.$push.l1.l2.createdAt.valueOf(), now.valueOf());
    assert.equal(update.$push.l1.l2.updatedAt.valueOf(), now.valueOf());
  });
});
