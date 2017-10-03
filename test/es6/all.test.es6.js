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

  it('supports adding properties (gh-5104) (gh-5635)', function(done) {
    class Shape extends mongoose.Model { };
    class Circle extends Shape { };

    const ShapeModel = mongoose.model(Shape, new mongoose.Schema({
      color: String
    }));

    const CircleModel = ShapeModel.discriminator(Circle, new mongoose.Schema({
      radius: Number
    }));

    const circle = new Circle({ color: 'blue', radius: 3 });
    assert.equal(circle.color, 'blue');
    assert.equal(circle.radius, 3);

    done();
  });
});
