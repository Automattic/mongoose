'use strict';

const Schema = require('../../lib/schema');
const assert = require('assert');
const castUpdate = require('../../lib/helpers/query/castUpdate');

describe('castUpdate', function() {
  it('avoids adding `$each` if `$addToSet` on mixed array', function() {
    const schema = new Schema({ test: [] });
    const obj = { $addToSet: { test: [1, 2, 3] } };

    const res = castUpdate(schema, obj);
    assert.deepEqual(res, { $addToSet: { test: [1, 2, 3] } });
  });
});
