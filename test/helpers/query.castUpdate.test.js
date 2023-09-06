'use strict';

const Schema = require('../../lib/schema');
const assert = require('assert');
const castUpdate = require('../../lib/helpers/query/castUpdate');

describe('castUpdate', function() {
  it('avoids adding `$each` if `$addToSet` on mixed array (gh-11284)', function() {
    const schema = new Schema({ test: [] });
    const obj = { $addToSet: { test: [1, 2, 3] } };

    const res = castUpdate(schema, obj);
    assert.deepEqual(res, { $addToSet: { test: [1, 2, 3] } });
  });

  it('casts the update correctly when target discriminator type is missing', function() {
    const shapeSchema = Schema({ name: String }, { discriminatorKey: 'kind' });
    const schema = Schema({ shape: shapeSchema });

    schema
      .path('shape')
      .discriminator(
        'gh8378_Circle',
        Schema({ radius: String, color: String })
      );

    // schema
    //   .path('shape')
    //   .discriminator('gh8378_Square', Schema({ side: Number, color: String }));

    const toBeUpdated = {
      'shape.name': 'aName',
      'shape.kind': 'gh8378_Square',
      'shape.side': 4,
      'shape.color': 'white'
    };

    const res = castUpdate(schema, { $set: toBeUpdated });
    assert.deepEqual(res, { $set: toBeUpdated });
  });
});
