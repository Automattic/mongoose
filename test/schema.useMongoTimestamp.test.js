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
            return model.findOne({ _id })
              .then((doc) => {
                console.log(`${new Date().toISOString()}: saved document with id: ${doc._id} updatedAt value: ${doc.updatedAt.toISOString()}`);
                return doc;
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
      const update1 = findAndSaveWithParam(doc._id, Model, { preValidateTimeout: 1000 });
      const update2 = findAndSaveWithParam(doc._id, Model, { preSaveTimeout: 1500 });

      return Promise.all([update1, update2])
        .then(([doc1, doc2]) => {
          const maxUpdatedAtGenerated = Math.max(doc1.updatedAt, doc2.updatedAt);
          return Model
            .findOne({ _id: doc._id })
            .then(doc => {
              assert.ok(maxUpdatedAtGenerated > doc.updatedAt.getTime(), true);
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
      const update1 = findAndSaveWithParam(doc._id, Model, { preValidateTimeout: 1000 });
      const update2 = findAndSaveWithParam(doc._id, Model, { preSaveTimeout: 1500 });

      return Promise.all([update1, update2])
        .then(([doc1, doc2]) => {
          const maxUpdatedAtGenerated = Math.max(doc1.updatedAt, doc2.updatedAt);
          return Model
            .findOne({ _id: doc._id })
            .then(doc => {
              assert.ok(maxUpdatedAtGenerated === doc.updatedAt.getTime(), true);
            });
        });
    });
  });
});
