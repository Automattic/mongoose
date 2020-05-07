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

  function findAndSaveWithParam(_id, model, params, updatedAtKey) {
    return model
      .findOne({ _id })
      .then(function(doc) {
        Object.assign(doc, params);
        return doc.save()
          .then(() => {
            // Note that when useMongoTimestamp option is used, the in
            // memory document won't have the generated updatedAt
            // value. It must be fetched from database.
            return model.findOne({ _id }, updatedAtKey);
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
      const update1 = findAndSaveWithParam(doc._id, Model, { preValidateTimeout: 100 }, 'updatedAt');
      const update2 = findAndSaveWithParam(doc._id, Model, { preSaveTimeout: 150 }, 'updatedAt');

      return Promise.all([update1, update2])
        .then((docs) => {
          const maxUpdatedAtGenerated = Math.max(docs[0].updatedAt, docs[1].updatedAt);
          return Model
            .findOne({ _id: doc._id })
            .then(doc => {
              assert.ok(maxUpdatedAtGenerated > doc.updatedAt.getTime());
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
      const update1 = findAndSaveWithParam(doc._id, Model, { preValidateTimeout: 100 }, 'updatedAt');
      const update2 = findAndSaveWithParam(doc._id, Model, { preSaveTimeout: 150 }, 'updatedAt');

      return Promise.all([update1, update2])
        .then((docs) => {
          const maxUpdatedAtGenerated = Math.max(docs[0].updatedAt, docs[1].updatedAt);
          return Model
            .findOne({ _id: doc._id })
            .then(doc => {
              assert.ok(maxUpdatedAtGenerated === doc.updatedAt.getTime());
            });
        });
    });
  });

  it('works correctly with custom updatedAt key', function() {
    const schema = Schema({
      name: String
    }, {
      timestamps: { updatedAt: 'lastModified', createdAt: 'createdAt' },
      useMongoTimestamp: true
    });
    const Model = conn.model('Test3', schema);

    const doc = new Model();
    doc.name = 'test';
    return doc.save().then(doc => {
      return Model
        .findOne({ _id: doc._id })
        .then(doc => {
          const prevLastModified = doc.lastModified;
          return findAndSaveWithParam(doc._id, Model, { name: 'some change' }, 'lastModified')
            .then(doc => {
              assert.ok(doc.lastModified.getTime() > prevLastModified.getTime());
            });
        });
    });
  });
});
