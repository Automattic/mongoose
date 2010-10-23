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

  'setting to an array of new Document instances should allow you to access an array of Document instances AND set the dbref params': function (assert, done) {
    var cuisine = new Cuisine({
      name: 'Thai',
      restaurants: [
        new Restaurant({name: 'Osha Thai'}),
        new Restaurant({name: 'Thai Stick'})
      ]
    });
    var count = 0;
    cuisine.restaurants.forEach( function (diner) {
      assert.ok(diner instanceof Restaurant);
      assert.ok(typeof diner._.doc._id !== "undefined");
      assert.deepEqual(cuisine._.doc.restaurants[count], {'$ref': diner._schema._collection, '$id': diner._.doc._id});
      if (++count === 2) done();
    });
  },

  'saving after setting the dbref array to unpersisted data should automatically save that data to the db': function (assert, done) {
    var count = 0;
    new Cuisine({
      name: 'Burgers',
      restaurants: [
        { name: 'Burger Bar' },
        { name: "Pearl's Burgers" }
      ]
    }).save( function (errors, cuisine) {
      cuisine.restaurants.forEach( function (diner) {
        Restaurant.find({name: diner.name}).first( function (found) {
          assert.ok(diner.id === found.id);
          if (++count === 2) done();
        });
      });
    });
  },

  teardown: function(){
    db.close();
  }
};
