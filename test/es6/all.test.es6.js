'use strict';

/**
 * Module dependencies.
 */

const assert = require('assert');
const start = require('../common');

const mongoose = start.mongoose;

describe('bug fixes', function() {
  let db;

  before(function() {
    db = start();
  });

  it('discriminators with classes modifies class in place (gh-5175)', function(done) {
    class Vehicle extends mongoose.Model { }
    var V = mongoose.model(Vehicle, new mongoose.Schema());
    assert.ok(V === Vehicle);
    class Car extends Vehicle { }
    var C = Vehicle.discriminator(Car, new mongoose.Schema());
    assert.ok(C === Car);
    done();
  });
});
