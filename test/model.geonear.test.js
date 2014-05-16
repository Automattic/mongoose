
var start = require('./common')
  , assert = require('assert')
  , mongoose = start.mongoose
  , random = require('../lib/utils').random
  , Schema = mongoose.Schema
  , DocumentObjectId = mongoose.Types.ObjectId

/**
 * Setup
 */

var schema = new Schema({
  coordinates : { type: [Number], index: '2dsphere' },
  type: String
});

function getModel (db) {
  return db.model('GeoNear', schema, 'geonear'+random());
}

describe('model', function(){
  var mongo24_or_greater = false;
  before(function(done){
    start.mongodVersion(function (err, version) {
      if (err) throw err;
      mongo24_or_greater = 2 < version[0] || (2 == version[0] && 4 <= version[1]);
      if (!mongo24_or_greater) console.log('not testing mongodb 2.4 features');
      done();
    })
  })
  describe('geoNear', function () {

    it('works with legacy coordinate points', function (done) {
      if (!mongo24_or_greater) return done();
      var db = start();
      var Geo = getModel(db);
      assert.ok(Geo.geoNear instanceof Function);

      Geo.on('index', function(err){
        assert.ifError(err);

        var geos = [];
        geos[0] = new Geo({ coordinates : [10,10], type : "Point"});
        geos[1] = new Geo({ coordinates : [15,5], type : "Point"});
        geos[2] = new Geo({ coordinates : [20,15], type : "Point"});
        geos[3] = new Geo({ coordinates : [1,-1], type : "Point"});
        var count = geos.length;

        for (var i=0; i < geos.length; i++) {
          geos[i].save(function (err) {
            assert.ifError(err);
            --count || next();
          });
        }

        function next() {
          Geo.geoNear([9,9], { spherical : true, maxDistance : .1 }, function (err, results, stats) {
            assert.ifError(err);

            assert.equal(1, results.length);

            assert.equal(results[0].obj.type, 'Point');
            assert.equal(results[0].obj.coordinates.length, 2);
            assert.equal(results[0].obj.coordinates[0], 10);
            assert.equal(results[0].obj.coordinates[1], 10);
            assert.equal(results[0].obj.id, geos[0].id);
            assert.ok(results[0].obj instanceof Geo);
            done();
          });
        }
      });
    });

    it('works with GeoJSON coordinate points', function (done) {
      if (!mongo24_or_greater) return done();
      var db = start();
      var Geo = getModel(db);
      assert.ok(Geo.geoNear instanceof Function);

      Geo.on('index', function(err){
        assert.ifError(err);

        var geos = [];
        geos[0] = new Geo({ coordinates : [10,10], type : "Point"});
        geos[1] = new Geo({ coordinates : [15,5], type : "Point"});
        geos[2] = new Geo({ coordinates : [20,15], type : "Point"});
        geos[3] = new Geo({ coordinates : [1,-1], type : "Point"});
        var count = geos.length;

        for (var i=0; i < geos.length; i++) {
          geos[i].save(function () {
            --count || next();
          });
        }

        function next() {
          var pnt = { type : "Point", coordinates : [9,9] };
          Geo.geoNear(pnt, { spherical : true, maxDistance : .1 }, function (err, results, stats) {
            assert.ifError(err);

            assert.equal(1, results.length);

            assert.equal(results[0].obj.type, 'Point');
            assert.equal(results[0].obj.coordinates.length, 2);
            assert.equal(results[0].obj.coordinates[0], 10);
            assert.equal(results[0].obj.coordinates[1], 10);
            assert.equal(results[0].obj.id, geos[0].id);
            assert.ok(results[0].obj instanceof Geo);
            done();
          });
        }
      });
    });

    it('works with lean', function (done) {
      if (!mongo24_or_greater) return done();
      var db = start();
      var Geo = getModel(db);
      assert.ok(Geo.geoNear instanceof Function);

      Geo.on('index', function(err){
        assert.ifError(err);

        var geos = [];
        geos[0] = new Geo({ coordinates : [10,10], type : "Point"});
        geos[1] = new Geo({ coordinates : [15,5], type : "Point"});
        geos[2] = new Geo({ coordinates : [20,15], type : "Point"});
        geos[3] = new Geo({ coordinates : [1,-1], type : "Point"});
        var count = geos.length;

        for (var i=0; i < geos.length; i++) {
          geos[i].save(function () {
            --count || next();
          });
        }

        function next() {
          var pnt = { type : "Point", coordinates : [9,9] };
          Geo.geoNear(pnt, { spherical : true, maxDistance : .1, lean : true }, function (err, results, stats) {
            assert.ifError(err);

            assert.equal(1, results.length);

            assert.equal(results[0].obj.type, 'Point');
            assert.equal(results[0].obj.coordinates.length, 2);
            assert.equal(results[0].obj.coordinates[0], 10);
            assert.equal(results[0].obj.coordinates[1], 10);
            assert.equal(results[0].obj._id, geos[0].id);
            assert.ok(!(results[0].obj instanceof Geo));
            done();
          });
        }
      });
    });

    it('throws the correct error messages', function (done) {
      if (!mongo24_or_greater) return done();

      var db = start();
      var Geo = getModel(db);

      Geo.on('index', function(err){
        assert.ifError(err);

        var g = new Geo({ coordinates : [10,10], type : "place"});
        g.save(function() {
          var threw = false;
          Geo.geoNear("1,2", {}, function (e) {
            assert.ok(e);
            assert.equal(e.message, "Must pass either a legacy coordinate array or GeoJSON Point to geoNear");

            Geo.geoNear([1], {}, function (e) {
              assert.ok(e);
              assert.equal(e.message, "If using legacy coordinates, must be an array of size 2 for geoNear");

              Geo.geoNear({ type : "Square" }, {}, function (e) {
                assert.ok(e);
                assert.equal(e.message, "Must pass either a legacy coordinate array or GeoJSON Point to geoNear");

                Geo.geoNear({ type : "Point", coordinates : "1,2" }, {}, function (e) {
                  assert.ok(e);
                  assert.equal(e.message, "Must pass either a legacy coordinate array or GeoJSON Point to geoNear");

                  done();
                });
              });
            });
          });
        });
      });
    });
    it('returns a promise (gh-1614)', function(done){
      if (!mongo24_or_greater) return done();
      var db = start();
      var Geo = getModel(db);

      var pnt = { type : "Point", coordinates : [9,9] };
      var prom = Geo.geoNear(pnt, { spherical : true, maxDistance : .1 }, function (err, results, stats) {
      });
      assert.ok(prom instanceof mongoose.Promise);
      db.close();
      done();
    })

    it('allows not passing a callback (gh-1614)', function (done) {
      if (!mongo24_or_greater) return done();
      var db = start();
      var Geo = getModel(db);
      Geo.on('index', function(err) {
        assert.ifError(err);
        var g = new Geo({ coordinates : [10,10], type : "Point"});
        g.save(function (err) {
          assert.ifError(err);

          var pnt = { type : "Point", coordinates : [9,9] };
          var promise;
          assert.doesNotThrow(function() {
            promise = Geo.geoNear(pnt, { spherical : true, maxDistance : 100000 });
          });

          function validate(ret, stat) {
            assert.equal(1, ret.length);
            assert.equal(ret[0].obj.coordinates[0], 10);
            assert.equal(ret[0].obj.coordinates[1], 10);
            assert.ok(stat);
          }

          function finish() {
            db.close(done);
          }

          promise.then(validate, assert.ifError).then(finish).end();

        });
      });
    });
    it('promise fulfill even when no results returned', function(done){
      if (!mongo24_or_greater) return done();
      var db = start();
      var Geo = getModel(db);
      Geo.on('index', function(err) {
        assert.ifError(err);
        var g = new Geo({ coordinates : [1,1], type : "Point"});
        g.save(function (err) {
          assert.ifError(err);

          var pnt = { type : "Point", coordinates : [90, 45] };
          var promise;
          assert.doesNotThrow(function() {
            promise = Geo.geoNear(pnt, { spherical : true, maxDistance : 0.1 });
          });

          function finish() {
            db.close(done);
          }

          promise.then(finish).end();

        });
      });
    })
  });
});
