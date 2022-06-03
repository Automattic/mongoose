'use strict';

/**
 * Test dependencies.
 */

const start = require('./common');

const assert = require('assert');
const { Types } = require('../lib');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('model.insertMany', function () {
  let db;

  before(function () {
    db = start();

    return db.createCollection('Test').catch(() => { });
  });

  after(async function () {
    await db.close();
  });

  describe('insertMany', function () {
    it('insertMany should not return hydrated Documents if lean is set to true', async function () {
      const eventSchema = new Schema({
        _id: Schema.Types.ObjectId,
        title: String,
      });
      const EventModel = db.model('Test', eventSchema);
      const test = await EventModel.insertMany(
        [{ title: 'Event 2' }],
        { lean: true }
      );

      assert.equal(typeof test[0].isNew, 'undefined');
      assert.ok(test[0]._id instanceof Types.ObjectId);
      assert.ok(test[0].title === 'Event 2');
    });
  });
});
