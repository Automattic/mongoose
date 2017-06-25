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

  it('allows overwriting base class methods (gh-5227)', function(done) {
    class BaseModel extends mongoose.Model {
      getString() {
        return 'parent';
      }
    }

    class GH5227 extends BaseModel {
      getString() {
        return 'child';
      }
    }

    const UserModel = mongoose.model(GH5227, new mongoose.Schema({}));

    const u = new UserModel({});

    assert.equal(u.getString(), 'child');

    done();
  });
});
