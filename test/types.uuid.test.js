'use strict';

const { UUID } = require('bson');
/**
 * Module dependencies.
 */

const start = require('./common');

const assert = require('assert');
const mongoose = require('./common').mongoose;

const Schema = mongoose.Schema;

// Dont put indexed models on the default connection, it
// breaks index.test.js tests on a "pure" default conn.
// mongoose.model('UserBuffer', UserBuffer);

/**
 * Test.
 */

describe('types.uuid', function() {
  let UserUUID;
  let db;

  before(function() {
    db = start();

    UserUUID = new Schema({
      name: {
        type: String,
        required: true
      },
      uuid: Schema.Types.UUID
    });
  });

  after(async function() {
    await db.close();
  });

  it('UUID type field can be set from UUID', async function() {
    const User = db.model('Test', UserUUID);
    const uuid = new UUID();
    const user = await User.create({ name: 'user', uuid });

    assert.equal(user.uuid, uuid);
  });

  it('UUID type field can be null', async function() {
    const User = db.model('Test', UserUUID);
    const user = await User.create({ name: 'user' });

    assert.equal(user.uuid, null);
  });
});
