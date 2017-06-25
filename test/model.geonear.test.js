
var start = require('./common'),
    assert = require('power-assert'),
    mongoose = start.mongoose,
    random = require('../lib/utils').random,
    Schema = mongoose.Schema;

/**
 * Setup
 */

var testLocations = {
  MONGODB_NYC_OFFICE: [-73.987732, 40.757471],
  BRYANT_PART_NY: [-73.983677, 40.753628],
  EAST_HARLEM_SHOP: [-73.93831, 40.794963],
  CENTRAL_PARK_ZOO: [-73.972299, 40.767732],
  PORT_AUTHORITY_STATION: [-73.990147, 40.757253]
};

// convert meters to radians for use as legacy coordinates
function metersToRadians(m) {
  return m / (6371 * 1000);
}

describe('model', function() {
  var schema;

  function getModel(db) {
    return db.model('GeoNear', schema, 'geonear' + random());
  }

  before(function() {
    schema = new Schema({
      coordinates: {type: [Number], index: '2dsphere'},
      type: String
    });
  });

  var mongo24_or_greater = false;
  before(function(done) {
    start.mongodVersion(function(err, version) {
      if (err) throw err;
      mongo24_or_greater = version[0] > 2 || (version[0] === 2 && version[1] >= 4);
      if (!mongo24_or_greater) console.log('not testing mongodb 2.4 features');
      done();
    });
  });
  describe('geoNear', function() {
    it('works with legacy coordinate points', function(done) {
      if (!mongo24_or_greater) return done();
      var db = start();
      var Geo = getModel(db);
      assert.ok(Geo.geoNear instanceof Function);

      Geo.on('index', function(err) {
        assert.ifError(err);

        var geos = [];
        geos[0] = new Geo({
          coordinates: testLocations.MONGODB_NYC_OFFICE,
          type: 'Point'
        });
        geos[1] = new Geo({
          coordinates: testLocations.BRYANT_PARK_NY,
          type: 'Point'
        });
        geos[2] = new Geo({
          coordinates: testLocations.EAST_HARLEM_SHOP,
          type: 'Point'
        });
        geos[3] = new Geo({
          coordinates: testLocations.CENTRAL_PARK_ZOO,
          type: 'Point'
        });
        var count = geos.length;

        for (var i = 0; i < geos.length; i++) {
          geos[i].save(function(err) {
            assert.ifError(err);
            --count || next();
          });
        }

        function next() {
          // using legacy coordinates -- maxDistance units in radians
          var options = {spherical: true, maxDistance: metersToRadians(300)};
          Geo.geoNear(testLocations.PORT_AUTHORITY_STATION, options).then(function(results) {
            assert.equal(1, results.length);

            assert.equal(results[0].obj.type, 'Point');
            assert.equal(results[0].obj.coordinates.length, 2);
            assert.equal(results[0].obj.coordinates[0], testLocations.MONGODB_NYC_OFFICE[0]);
            assert.equal(results[0].obj.coordinates[1], testLocations.MONGODB_NYC_OFFICE[1]);
            assert.equal(results[0].obj.id, geos[0].id);
            assert.ok(results[0].obj instanceof Geo);
            db.close(done);
          });
        }
      });
    });

    it('works with GeoJSON coordinate points', function(done) {
      if (!mongo24_or_greater) return done();
      var db = start();
      var Geo = getModel(db);
      assert.ok(Geo.geoNear instanceof Function);

      Geo.on('index', function(err) {
        assert.ifError(err);

        var geos = [];
        geos[0] = new Geo({
          coordinates: testLocations.MONGODB_NYC_OFFICE,
          type: 'Point'
        });
        geos[1] = new Geo({
          coordinates: testLocations.BRANT_PARK_NY,
          type: 'Point'
        });
        geos[2] = new Geo({
          coordinates: testLocations.EAST_HARLEM_SHOP,
          type: 'Point'
        });
        geos[3] = new Geo({
          coordinates: testLocations.CENTRAL_PARK_ZOO,
          type: 'Point'
        });
        var count = geos.length;

        for (var i = 0; i < geos.length; i++) {
          geos[i].save(function() {
            --count || next();
          });
        }

        function next() {
          var pnt = {type: 'Point', coordinates: testLocations.PORT_AUTHORITY_STATION};
          Geo.geoNear(pnt, {spherical: true, maxDistance: 300}, function(err, results) {
            assert.ifError(err);

            assert.equal(results.length, 1);

            assert.equal(results[0].obj.type, 'Point');
            assert.equal(results[0].obj.coordinates.length, 2);
            assert.equal(results[0].obj.coordinates[0], testLocations.MONGODB_NYC_OFFICE[0]);
            assert.equal(results[0].obj.coordinates[1], testLocations.MONGODB_NYC_OFFICE[1]);
            assert.equal(results[0].obj.id, geos[0].id);
            assert.ok(results[0].obj instanceof Geo);
            db.close(done);
          });
        }
      });
    });

    it('works with lean', function(done) {
      if (!mongo24_or_greater) return done();
      var db = start();
      var Geo = getModel(db);
      assert.ok(Geo.geoNear instanceof Function);

      Geo.on('index', function(err) {
        assert.ifError(err);

        var geos = [];
        geos[0] = new Geo({
          coordinates: testLocations.MONGODB_NYC_OFFICE,
          type: 'Point'
        });
        geos[1] = new Geo({
          coordinates: testLocations.BRANT_PARK_NY,
          type: 'Point'
        });
        geos[2] = new Geo({
          coordinates: testLocations.EAST_HARLEM_SHOP,
          type: 'Point'
        });
        geos[3] = new Geo({
          coordinates: testLocations.CENTRAL_PARK_ZOO,
          type: 'Point'
        });
        var count = geos.length;

        for (var i = 0; i < geos.length; i++) {
          geos[i].save(function() {
            --count || next();
          });
        }

        function next() {
          var pnt = {type: 'Point', coordinates: testLocations.PORT_AUTHORITY_STATION};
          Geo.geoNear(pnt, {spherical: true, maxDistance: 300, lean: true}, function(err, results) {
            assert.ifError(err);

            assert.equal(results.length, 1);

            assert.equal(results[0].obj.type, 'Point');
            assert.equal(results[0].obj.coordinates.length, 2);
            assert.equal(results[0].obj.coordinates[0], testLocations.MONGODB_NYC_OFFICE[0]);
            assert.equal(results[0].obj.coordinates[1], testLocations.MONGODB_NYC_OFFICE[1]);
            assert.equal(results[0].obj._id, geos[0].id);
            assert.ok(!(results[0].obj instanceof Geo));
            db.close(done);
          });
        }
      });
    });

    it('throws the correct error messages', function(done) {
      if (!mongo24_or_greater) return done();

      var db = start();
      var Geo = getModel(db);

      Geo.on('index', function(err) {
        assert.ifError(err);

        var g = new Geo({coordinates: [10, 10], type: 'place'});
        g.save(function() {
          Geo.geoNear('1,2', {}, function(e) {
            assert.ok(e);
            assert.equal(e.message, 'Must pass either a legacy coordinate array or GeoJSON Point to geoNear');

            Geo.geoNear([1], {}, function(e) {
              assert.ok(e);
              assert.equal(e.message, 'If using legacy coordinates, must be an array of size 2 for geoNear');

              Geo.geoNear({type: 'Square'}, {}, function(e) {
                assert.ok(e);
                assert.equal(e.message, 'Must pass either a legacy coordinate array or GeoJSON Point to geoNear');

                Geo.geoNear({type: 'Point', coordinates: '1,2'}, {}, function(e) {
                  assert.ok(e);
                  assert.equal(e.message, 'Must pass either a legacy coordinate array or GeoJSON Point to geoNear');

                  db.close(done);
                });
              });
            });
          });
        });
      });
    });
    it('returns a promise (gh-1614)', function(done) {
      if (!mongo24_or_greater) return done();
      var db = start();
      var Geo = getModel(db);

      var pnt = {type: 'Point', coordinates: testLocations.PORT_AUTHORITY_STATION};
      // using GeoJSON point
      var prom = Geo.geoNear(pnt, {spherical: true, maxDistance: 300}, function() {});
      assert.ok(prom instanceof mongoose.Promise);
      db.close();
      done();
    });

    it('allows not passing a callback (gh-1614)', function(done) {
      if (!mongo24_or_greater) return done();
      var db = start();
      var Geo = getModel(db);
      Geo.on('index', function(err) {
        assert.ifError(err);
        var g = new Geo({coordinates: testLocations.MONGODB_NYC_OFFICE, type: 'Point'});
        g.save(function(err) {
          assert.ifError(err);

          var pnt = {type: 'Point', coordinates: testLocations.PORT_AUTHORITY_STATION};
          var promise;
          assert.doesNotThrow(function() {
            promise = Geo.geoNear(pnt, {spherical: true, maxDistance: 300});
          });

          function validate(ret, stat) {
            assert.equal(ret.length, 1);
            assert.equal(ret[0].obj.coordinates[0], testLocations.MONGODB_NYC_OFFICE[0]);
            assert.equal(ret[0].obj.coordinates[1], testLocations.MONGODB_NYC_OFFICE[1]);
            assert.ok(stat);
          }

          function finish() {
            db.close(done);
          }

          promise.then(validate, assert.ifError).then(finish).end();
        });
      });
    });
    it('promise fulfill even when no results returned', function(done) {
      if (!mongo24_or_greater) return done();
      var db = start();
      var Geo = getModel(db);
      Geo.on('index', function(err) {
        assert.ifError(err);
        var g = new Geo({coordinates: [1, 1], type: 'Point'});
        g.save(function(err) {
          assert.ifError(err);

          var pnt = {type: 'Point', coordinates: [90, 45]};
          var promise;
          assert.doesNotThrow(function() {
            promise = Geo.geoNear(pnt, {spherical: true, maxDistance: 1000});
          });

          function finish() {
            db.close(done);
          }

          promise.then(finish).end();
        });
      });
    });
  });
});
