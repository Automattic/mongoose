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

  it('casts a schema path whose name is also an update modifier', function() {
    // Arrange
    const accountSchema = new Schema({ $each: Number });
    const update = { $set: { $each: '42' } };

    // Act
    const castedUpdate = castUpdate(accountSchema, update);

    // Assert
    assert.deepEqual(castedUpdate, { $set: { $each: 42 } });
  });

  it('casts a nested schema path whose root name is also an update modifier', function() {
    // Arrange
    const accountSchema = new Schema({ $each: { count: Number } });
    const update = { $set: { $each: { count: '42' } } };

    // Act
    const castedUpdate = castUpdate(accountSchema, update);

    // Assert
    assert.deepEqual(castedUpdate, { $set: { $each: { count: 42 } } });
  });

  it('preserves scalar update operators on a nested modifier-named path', function() {
    // Arrange
    const accountSchema = new Schema({ $each: { count: Number } });
    const updates = [
      { $unset: { $each: 1 } },
      { $set: { $each: null } },
      { $rename: { $each: 'archived' } }
    ];

    // Act
    const castedUpdates = updates.map(update => castUpdate(accountSchema, structuredClone(update)));

    // Assert
    assert.deepEqual(castedUpdates, updates);
  });

  it('casts a modifier-named schema path nested under another path', function() {
    // Arrange
    const accountSchema = new Schema({ preferences: { $each: Number } });
    const update = { $set: { preferences: { $each: '42' } } };

    // Act
    const castedUpdate = castUpdate(accountSchema, update);

    // Assert
    assert.deepEqual(castedUpdate, { $set: { preferences: { $each: 42 } } });
  });

  it('casts an array schema path whose name is also an update modifier', function() {
    // Arrange
    const accountSchema = new Schema({ $each: [Number] });
    const update = { $push: { $each: '42' } };

    // Act
    const castedUpdate = castUpdate(accountSchema, update);

    // Assert
    assert.deepEqual(castedUpdate, { $push: { $each: 42 } });
  });

  it('preserves a mixed schema path whose name is also an update modifier', function() {
    // Arrange
    const accountSchema = new Schema({ $in: Schema.Types.Mixed });
    const update = { $set: { $in: { count: '42' } } };

    // Act
    const castedUpdate = castUpdate(accountSchema, update);

    // Assert
    assert.deepEqual(castedUpdate, { $set: { $in: { count: '42' } } });
  });

  it('aggregates cast errors from $rename', function() {
    const schema = new Schema({ name: String, email: String });
    const update = { $rename: { name: null, email: null } };
    const context = { options: { multipleCastError: true } };

    assert.throws(
      () => castUpdate(schema, update, {}, context),
      error => error.name === 'ValidationError' &&
        error.errors.name?.name === 'CastError' &&
        error.errors.email?.name === 'CastError'
    );
  });

  it('aggregates cast errors from $pull', function() {
    const schema = new Schema({
      items: [{
        count: {
          type: Number,
          cast: '{VALUE} is not a valid count for model {MODEL}'
        }
      }],
      otherItems: [{
        count: {
          type: Number,
          cast: '{VALUE} is not a valid count for model {MODEL}'
        }
      }]
    });
    const update = {
      $pull: {
        items: { count: 'not a number' },
        otherItems: { count: 'also not a number' }
      }
    };
    const context = {
      model: { modelName: 'PullModel' },
      options: { multipleCastError: true }
    };

    assert.throws(
      () => castUpdate(schema, update, {}, context),
      error => error.name === 'ValidationError' &&
        error.errors.items?.message ===
          '"not a number" is not a valid count for model PullModel' &&
        error.errors.otherItems?.message ===
          '"also not a number" is not a valid count for model PullModel'
    );
  });
});
