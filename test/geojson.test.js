'use strict';

/**
 * Module dependencies.
 */

const start = require('./common');

const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('geojson', function() {
  let db;
  let pointSchema;

  before(function() {
    db = start();

    pointSchema = new mongoose.Schema({
      type: {
        type: String,
        enum: ['Point'],
        required: true
      },
      coordinates: {
        type: [Number],
        required: true
      }
    });
  });

  after(async function() {
    await db.close();
  });

  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => require('./util').clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  it('driver query', function() {
    const City = db.model('City', new Schema({
      name: String,
      location: pointSchema
    }));

    const colorado = {
      type: 'Polygon',
      coordinates: [[
        [-109, 41],
        [-102, 41],
        [-102, 37],
        [-109, 37],
        [-109, 41]
      ]]
    };
    const denver = { type: 'Point', coordinates: [-104.9903, 39.7392] };
    return City.create({ name: 'Denver', location: denver }).
      then(() => City.findOne({
        location: {
          $geoWithin: {
            $geometry: colorado
          }
        }
      })).
      then(doc => assert.equal(doc.name, 'Denver'));
  });

  it('within helper', function() {
    const denver = { type: 'Point', coordinates: [-104.9903, 39.7392] };
    // acquit:ignore:start
    const City = db.model('City', new Schema({
      name: String,
      location: pointSchema
    }));

    const colorado = {
      type: 'Polygon',
      coordinates: [[
        [-109, 41],
        [-102, 41],
        [-102, 37],
        [-109, 37],
        [-109, 41]
      ]]
    };
    // acquit:ignore:end
    return City.create({ name: 'Denver', location: denver }).
      then(() => City.findOne().where('location').within(colorado)).
      then(doc => assert.equal(doc.name, 'Denver'));
  });

  it('index', function() {
    const denver = { type: 'Point', coordinates: [-104.9903, 39.7392] };
    const City = db.model('City', new Schema({
      name: String,
      location: {
        type: pointSchema,
        index: '2dsphere' // Create a special 2dsphere index on `City.location`
      }
    }));
    // acquit:ignore:start
    const colorado = {
      type: 'Polygon',
      coordinates: [[
        [-109, 41],
        [-102, 41],
        [-102, 37],
        [-109, 37],
        [-109, 41]
      ]]
    };
    // acquit:ignore:end

    return City.create({ name: 'Denver', location: denver }).
      then(() => City.findOne().where('location').within(colorado)).
      then(doc => assert.equal(doc.name, 'Denver'));
  });

  it('near', function() {
    const denver = { type: 'Point', coordinates: [-104.9903, 39.7392] };
    const City = db.model('City', new Schema({
      name: String,
      location: {
        type: pointSchema,
        index: '2dsphere' // Create a special 2dsphere index on `City.location`
      }
    }));

    // "Garden of the Gods" in Colorado
    const $geometry = { type: 'Point', coordinates: [-104.8719443, 38.8783536] };

    return City.create({ name: 'Denver', location: denver }).
      // acquit:ignore:start
      then(() => City.init()).
      // acquit:ignore:end
      // Without a 2dsphere index, this will error out with:
      // 'unable to find index for $geoNear query"
      then(() => City.findOne({ location: { $near: { $geometry } } })).
      then(doc => assert.equal(doc.name, 'Denver'));
  });
});
