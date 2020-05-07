'use strict';

/**
 * Test dependencies.
 */

const start = require('./common');

const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('schema options.useMongoTimestamp', function() {
  let conn;

  before(function() {
    conn = start();
  });

  after(function(done) {
    conn.close(done);
  });

  let maxUpdatedAtGenerated;

  beforeEach(function() {
    maxUpdatedAtGenerated = new Date(0);
  });

  function setPreValidateHook(schema) {
    schema.pre('validate', function(next) {
      setTimeout(function() {
        next();
      }, this.preValidateTimeout);
    });
  }

  function setPreSaveHook(schema) {
    schema.pre('save', function(next) {
      setTimeout(function() {
        next();
      }, this.preSaveTimeout);
    });
  }

  function findAndSaveWithParam(_id, model, params) {
    return model
      .findOne({ _id })
      .then(function(doc) {
        Object.assign(doc, params);
        return doc.save()
          .then(() => {
            model.findOne({ _id })
              .then((doc) => {
                if (doc.updatedAt.getTime() > maxUpdatedAtGenerated.getTime()) {
                  maxUpdatedAtGenerated = doc.updatedAt;
                }
                console.log(`${new Date().toISOString()}: saved document with id: ${doc._id} updatedAt value: ${doc.updatedAt.toISOString()}`);
              });
          });
      });
  }

  it('concurrently updated document will write to database with out of order updatedAt timestamp values', function() {
    const schema = Schema({
      name: String,
      preValidateTimeout: Number,
      preSaveTimeout: Number
    }, {
      timestamps: true
    });
    setPreValidateHook(schema);
    setPreSaveHook(schema);
    const Model = conn.model('Test1', schema);

    const doc = new Model();
    doc.name = 'test';
    return doc.save().then(() => {
      const update1 = findAndSaveWithParam(doc._id, Model, { preValidateTimeout: 100 });
      const update2 = findAndSaveWithParam(doc._id, Model, { preSaveTimeout: 150 });

      return Promise.all([update1, update2])
        .then(() => {
          return Model
            .findOne({ _id: doc._id })
            .then(doc => {
              assert.ok(maxUpdatedAtGenerated.getTime() > doc.updatedAt.getTime(), true);
            });
        });
    });
  });

  it('when using useMongoTimestamp option concurrently updated document will write to database with correct order updatedAt timestamp values', function() {
    const schema = Schema({
      name: String,
      preValidateTimeout: Number,
      preSaveTimeout: Number
    }, {
      timestamps: true,
      useMongoTimestamp: true
    });
    setPreValidateHook(schema);
    setPreSaveHook(schema);
    const Model = conn.model('Test2', schema);

    const doc = new Model();
    doc.name = 'test';
    return doc.save().then(() => {
      const update1 = findAndSaveWithParam(doc._id, Model, { preValidateTimeout: 100 });
      const update2 = findAndSaveWithParam(doc._id, Model, { preSaveTimeout: 150 });

      return Promise.all([update1, update2])
        .then(() => {
          return Model
            .findOne({ _id: doc._id })
            .then(doc => {
              assert.ok(maxUpdatedAtGenerated.getTime() === doc.updatedAt.getTime(), true);
            });
        });
    });
  });
});
