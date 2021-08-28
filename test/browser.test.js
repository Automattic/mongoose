'use strict';

/**
 * Module dependencies.
 */

const Document = require('../lib/browserDocument');
const Schema = require('../lib/schema');
const assert = require('assert');
const exec = require('child_process').exec;

/**
 * Test.
 */
describe('browser', function() {
  it('require() works with no other require calls (gh-5842)', function(done) {
    exec('node --eval "require(\'./lib/browser\')"', done);
  });

  it('using schema (gh-7170)', function(done) {
    exec('node --eval "const mongoose = require(\'./lib/browser\'); new mongoose.Schema();"', done);
  });

  it('document works (gh-4987)', function() {
    const schema = new Schema({
      name: { type: String, required: true },
      quest: { type: String, match: /Holy Grail/i, required: true },
      favoriteColor: { type: String, enum: ['Red', 'Blue'], required: true }
    });

    assert.doesNotThrow(function() {
      new Document({}, schema);
    });
  });

  it('document validation with arrays (gh-6175)', async function() {
    const Point = new Schema({
      latitude: {
        type: Number,
        required: true,
        min: -90,
        max: 90
      },
      longitude: {
        type: Number,
        required: true,
        min: -180,
        max: 180
      }
    });

    const schema = new Schema({
      name: {
        type: String,
        required: true
      },
      vertices: {
        type: [Point],
        required: true
      }
    });

    let test = new Document({
      name: 'Test Polygon',
      vertices: [
        {
          latitude: -37.81902680201739,
          longitude: 144.9821037054062
        }
      ]
    }, schema);

    // Should not throw
    await test.validate();

    test = new Document({
      name: 'Test Polygon',
      vertices: [
        {
          latitude: -37.81902680201739
        }
      ]
    }, schema);

    const error = await test.validate().then(() => null, err => err);
    assert.ok(error.errors['vertices.0.longitude']);
  });
});
