var assert = require('assert')
  , mongoose = require('mongoose')
  , db = mongoose.connect('mongodb://localhost/mongoose_integration_tests');

mongoose.define('Restaurant')
  .oid('_id')
  .string('name');
var Restaurant = mongoose.Restaurant;

mongoose.define('Cuisine')
  .oid('_id')
  .string('name')
  .dbrefArray('restaurants', Restaurant);
var Cuisine = mongoose.Cuisine;

module.exports = {
  setup: function (done) {
    Restaurant.remove({}, function () {
      Cuisine.remove({}, function () {
        done();
      });
    });
  },

  'setting via JSON input should allow you to access an array of Document instances': function (assert, done) {
    var cuisine = new Cuisine({
      name: 'Thai',
      restaurants: [
        { name: 'Osha Thai' },
        { name: 'Thai Stick' }
      ]
    });
    var count = 0;
    cuisine.restaurants.forEach( function (diner) {
      assert.ok(diner instanceof Restaurant);
      if (++count === 2) done();
    });
  },

  teardown: function(){
    db.close();
  }
};
