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

  after(function(done) {
    db.close(done);
  });

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
    const City = db.model('City2', new Schema({
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
});
