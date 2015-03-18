
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
  pos : [Number],
  complex : {},
  type: String
});
schema.index({ "pos" : "geoHaystack", type : 1},{ bucketSize : 1});

function getModel (db) {
  return db.model('GeoSearch', schema, 'geosearch-'+random());
}

describe('model', function(){
  describe('geoSearch', function () {
    it('works', function (done) {

      var db = start();
      var Geo = getModel(db);
      assert.ok(Geo.geoSearch instanceof Function);

      Geo.on('index', function(err){
        assert.ifError(err);

        var geos = [];
        geos[0] = new Geo({ pos : [10,10], type : "place"});
        geos[1] = new Geo({ pos : [15,5], type : "place"});
        geos[2] = new Geo({ pos : [20,15], type : "house"});
        geos[3] = new Geo({ pos : [1,-1], type : "house"});
        var count = geos.length;

        for (var i=0; i < geos.length; i++) {
          geos[i].save(function (err) {
            assert.ifError(err);
            --count || next();
          });
        }

        function next() {
          Geo.geoSearch({ type : "place" }, { near : [9,9], maxDistance : 5 }, function (err, results, stats) {
            assert.ifError(err);
            assert.equal(1, results.length);

            assert.equal(results[0].type, 'place');
            assert.equal(results[0].pos.length, 2);
            assert.equal(results[0].pos[0], 10);
            assert.equal(results[0].pos[1], 10);
            assert.equal(results[0].id, geos[0].id);
            assert.ok(results[0] instanceof Geo);

            Geo.geoSearch({ type : "place" }, { near : [40,40], maxDistance : 5 }, function (err, results, stats) {
              assert.ifError(err);
              assert.equal(0, results.length);
              db.close(done);
            });
          });
        }
      });
    });
    it('works with lean', function (done) {

      var db = start();
      var Geo = getModel(db);
      assert.ok(Geo.geoSearch instanceof Function);

      Geo.on('index', function(err){
        assert.ifError(err);

        var geos = [];
        geos[0] = new Geo({ pos : [10,10], type : "place"});
        geos[1] = new Geo({ pos : [15,5], type : "place"});
        geos[2] = new Geo({ pos : [20,15], type : "house"});
        geos[3] = new Geo({ pos : [1,-1], type : "house"});
        var count = geos.length;

        for (var i=0; i < geos.length; i++) {
          geos[i].save(function (err) {
            assert.ifError(err);
            --count || next();
          });
        }

        function next() {
          Geo.geoSearch({ type : "place" }, { near : [9,9], maxDistance : 5, lean : true }, function (err, results, stats) {
            assert.ifError(err);
            assert.equal(1, results.length);

            assert.equal(results[0].type, 'place');
            assert.equal(results[0].pos.length, 2);
            assert.equal(results[0].pos[0], 10);
            assert.equal(results[0].pos[1], 10);
            assert.equal(results[0]._id, geos[0].id);
            assert.strictEqual(results[0].id, undefined);
            assert.ok(!(results[0] instanceof Geo));
            db.close(done);
          });
        }
      });
    });
    it('throws the correct error messages', function (done) {

      var db = start();
      var Geo = getModel(db);
      assert.ok(Geo.geoSearch instanceof Function);

      Geo.on('index', function(err){
        assert.ifError(err);

        var g = new Geo({ pos : [10,10], type : "place"});
        g.save(function() {
          var threw = false;
          Geo.geoSearch([], {}, function (e) {
            assert.ok(e);
            assert.equal(e.message, "Must pass conditions to geoSearch");

            Geo.geoSearch({ type : "test"}, {}, function (e) {
              assert.ok(e);
              assert.equal(e.message, "Must specify the near option in geoSearch");

              Geo.geoSearch({ type : "test" }, { near : "hello" }, function (e) {
                assert.ok(e);
                assert.equal(e.message, "near option must be an array [x, y]");

                Geo.geoSearch({ type : "test" }, { near : [1,2] }, function (err, res) {
                  assert.ok(err);
                  assert.ok(/maxDistance needs a number/.test(err));
                  db.close(done);
                });
              });
            });
          });
        });
      });
    });
    it('returns a promise (gh-1614)', function(done){
      var db = start();
      var Geo = getModel(db);

      var prom = Geo.geoSearch({ type : "place" }, { near : [9,9], maxDistance : 5 }, function (err, results, stats) {
      });
      assert.ok(prom instanceof mongoose.Promise);
      db.close();
      done();
    })

    it('allows not passing a callback (gh-1614)', function (done) {
      var db = start();
      var Geo = getModel(db);
      Geo.on('index', function(err){
        assert.ifError(err);
        var g = new Geo({ pos : [10,10], type : "place"});
        g.save(function (err) {
          assert.ifError(err);

          var promise;
          assert.doesNotThrow(function() {
            promise = Geo.geoSearch({ type : "place" }, { near : [9,9], maxDistance : 5 });
          });
          function validate(ret, stat) {
            assert.equal(1, ret.length);
            assert.equal(ret[0].pos[0], 10);
            assert.equal(ret[0].pos[1], 10);
            assert.ok(stat);
          }

          function finish() {
            db.close(done);
          }
          promise.then(validate, assert.ifError).then(finish).end();

        });
      });
    });
  });
});
