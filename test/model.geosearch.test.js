'use strict';

const start = require('./common');

const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('model', function() {
  let db, schema;
  let Geo;

  before(function() {
    schema = new Schema({
      pos: [Number],
      complex: {},
      type: String
    });
    schema.index({ pos: 'geoHaystack', type: 1 }, { bucketSize: 1 });
    db = start();

    Geo = db.model('Test', schema);
  });

  after(function(done) {
    db.close(done);
  });

  afterEach(() => Geo.deleteMany({}));

  describe('geoSearch', function() {
    this.timeout(process.env.TRAVIS ? 8000 : 4500);

    it('works', function(done) {
      assert.ok(Geo.geoSearch instanceof Function);

      Geo.init(function() {
        const geos = [];
        geos[0] = new Geo({ pos: [10, 10], type: 'place' });
        geos[1] = new Geo({ pos: [15, 5], type: 'place' });
        geos[2] = new Geo({ pos: [20, 15], type: 'house' });
        geos[3] = new Geo({ pos: [1, -1], type: 'house' });
        let count = geos.length;

        for (const geo of geos) {
          geo.save(function(err) {
            assert.ifError(err);
            --count || next();
          });
        }

        function next() {
          Geo.geoSearch({ type: 'place' }, { near: [9, 9], maxDistance: 5 }, function(err, results) {
            assert.ifError(err);
            assert.equal(results.length, 1);

            assert.equal(results[0].type, 'place');
            assert.equal(results[0].pos.length, 2);
            assert.equal(results[0].pos[0], 10);
            assert.equal(results[0].pos[1], 10);
            assert.equal(results[0].id, geos[0].id);
            assert.ok(results[0] instanceof Geo);

            Geo.geoSearch({ type: 'place' }, { near: [40, 40], maxDistance: 5 }, function(err, results) {
              assert.ifError(err);
              assert.equal(results.length, 0);
              done();
            });
          });
        }
      });
    });
    it('works with lean', function(done) {
      assert.ok(Geo.geoSearch instanceof Function);

      Geo.init(function(err) {
        assert.ifError(err);

        const geos = [];
        geos[0] = new Geo({ pos: [10, 10], type: 'place' });
        geos[1] = new Geo({ pos: [15, 5], type: 'place' });
        geos[2] = new Geo({ pos: [20, 15], type: 'house' });
        geos[3] = new Geo({ pos: [1, -1], type: 'house' });
        let count = geos.length;

        for (const geo of geos) {
          geo.save(function(err) {
            assert.ifError(err);
            --count || next();
          });
        }

        function next() {
          Geo.geoSearch({ type: 'place' }, { near: [9, 9], maxDistance: 5, lean: true }, function(err, results) {
            assert.ifError(err);
            assert.equal(results.length, 1);

            assert.equal(results[0].type, 'place');
            assert.equal(results[0].pos.length, 2);
            assert.equal(results[0].pos[0], 10);
            assert.equal(results[0].pos[1], 10);
            assert.equal(results[0]._id, geos[0].id);
            assert.strictEqual(results[0].id, undefined);
            assert.ok(!(results[0] instanceof Geo));
            done();
          });
        }
      });
    });
    it('throws the correct error messages', function(done) {
      assert.ok(Geo.geoSearch instanceof Function);

      Geo.init(function(err) {
        assert.ifError(err);

        const g = new Geo({ pos: [10, 10], type: 'place' });
        g.save(function() {
          Geo.geoSearch([], {}, function(e) {
            assert.ok(e);
            assert.equal(e.message, 'Must pass conditions to geoSearch');

            Geo.geoSearch({ type: 'test' }, {}, function(e) {
              assert.ok(e);
              assert.equal(e.message, 'Must specify the near option in geoSearch');

              Geo.geoSearch({ type: 'test' }, { near: 'hello' }, function(e) {
                assert.ok(e);
                assert.equal(e.message, 'near option must be an array [x, y]');

                Geo.geoSearch({ type: 'test' }, { near: [1, 2] }, function(err) {
                  assert.ok(err);
                  assert.ok(/maxDistance needs a number/.test(err));
                  done();
                });
              });
            });
          });
        });
      });
    });

    it('returns a promise (gh-1614)', function(done) {
      Geo.init(function() {
        const prom = Geo.geoSearch({ type: 'place' }, { near: [9, 9], maxDistance: 5 });
        assert.ok(prom instanceof mongoose.Promise);

        prom.then(() => done(), err => done(err));
      });
    });

    it('allows not passing a callback (gh-1614)', function(done) {
      Geo.init(function(err) {
        assert.ifError(err);
        const g = new Geo({ pos: [10, 10], type: 'place' });
        g.save(function(err) {
          assert.ifError(err);

          let promise;
          assert.doesNotThrow(function() {
            promise = Geo.geoSearch({ type: 'place' }, { near: [9, 9], maxDistance: 5 });
          });
          function validate(ret) {
            assert.equal(ret.length, 1);
            assert.equal(ret[0].pos[0], 10);
            assert.equal(ret[0].pos[1], 10);
          }

          function finish() {
            done();
          }
          promise.then(validate, assert.ifError).then(finish);
        });
      });
    });
  });
});
