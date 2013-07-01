
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

mongoose.model('Geo', schema);

describe('model', function(){
  describe('geoSearch', function () {
    it('works', function (done) {

      var db = start();
      var Geo = db.model('Geo');
      assert.ok(Geo.geoSearch instanceof Function);

      var geos = [];
      geos[0] = new Geo({ pos : [10,10], type : "place"});
      geos[1] = new Geo({ pos : [15,5], type : "place"});
      geos[2] = new Geo({ pos : [20,15], type : "house"});
      geos[3] = new Geo({ pos : [1,-1], type : "house"});
      var count = geos.length;

      for (var i=0; i < geos.length; i++) {
        geos[i].save(function () {
          --count || next();
        });
      }

      function next() {
        Geo.geoSearch({ type : "place" }, { near : [9,9], maxDistance : 5 }, function (err, results, stats) {
          assert.ifError(err);
          assert.equal(1, results.results.length);
          assert.equal(1, results.ok);

          assert.equal(results.results[0].type, 'place');
          assert.equal(results.results[0].pos.length, 2);
          assert.equal(results.results[0].pos[0], 10);
          assert.equal(results.results[0].pos[1], 10);
          assert.equal(results.results[0].id, geos[0].id);
          assert.ok(results.results[0] instanceof Geo);
          Geo.remove(function () {
            db.close();
            done();
          });
        });
      }
    });
    it('works with lean', function (done) {

      var db = start();
      var Geo = db.model('Geo');
      assert.ok(Geo.geoSearch instanceof Function);

      var geos = [];
      geos[0] = new Geo({ pos : [10,10], type : "place"});
      geos[1] = new Geo({ pos : [15,5], type : "place"});
      geos[2] = new Geo({ pos : [20,15], type : "house"});
      geos[3] = new Geo({ pos : [1,-1], type : "house"});
      var count = geos.length;

      for (var i=0; i < geos.length; i++) {
        geos[i].save(function () {
          --count || next();
        });
      }

      function next() {
        Geo.geoSearch({ type : "place" }, { near : [9,9], maxDistance : 5, lean : true }, function (err, results, stats) {
          assert.ifError(err);
          assert.equal(1, results.results.length);
          assert.equal(1, results.ok);

          assert.equal(results.results[0].type, 'place');
          assert.equal(results.results[0].pos.length, 2);
          assert.equal(results.results[0].pos[0], 10);
          assert.equal(results.results[0].pos[1], 10);
          assert.equal(results.results[0]._id, geos[0].id);
          assert.strictEqual(results.results[0].id, undefined);
          assert.ok(!(results.results[0] instanceof Geo));
          Geo.remove(function () {
            db.close();
            done();
          });
        });
      }
    });
    it('throws the correct error messages', function (done) {

      var db = start();
      var Geo = db.model('Geo');
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

              try {
                Geo.geoSearch({ type : "test" }, { near : [1,2] }, []);
              } catch(e) {
                threw = true;
                assert.ok(e);
                assert.equal(e.message, "Must pass a callback to geoSearch");
              }

              assert.ok(threw);
              threw = false;

              try {
                Geo.geoSearch({ type : "test" }, { near : [1,2] });
              } catch(e) {
                threw = true;
                assert.ok(e);
                assert.equal(e.message, "Must pass a callback to geoSearch");
              }

              assert.ok(threw);
              Geo.geoSearch({ type : "test" }, { near : [1,2] }, function (err, res) {
                assert.ifError(err);
                assert.ok(res);

                assert.equal(res.ok, 0);
                assert.equal(res.errmsg, "exception: maxDistance needs a number");
                done();
              });
            });
          });
        });
      });
    });
  });
});
