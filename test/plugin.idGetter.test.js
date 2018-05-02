'use strict';

/**
 * Module dependencies.
 */

const assert = require('assert');
const start = require('./common');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('id virtual getter', function() {
  var db;

  before(function() {
    db = start();
  });

  after(function(done) {
    db.close(done);
  });

  it('should work as expected with an ObjectId', function(done) {
    var schema = new Schema({});

    var S = db.model('Basic', schema);
    S.create({}, function(err, s) {
      assert.ifError(err);

      // Comparing with virtual getter
      assert.equal(s._id.toString(), s.id);
      done();
    });
  });

  it('should be turned off when `id` option is set to false', function(done) {
    var schema = new Schema({}, {id: false});

    var S = db.model('NoIdGetter', schema);
    S.create({}, function(err, s) {
      assert.ifError(err);

      // Comparing with virtual getter
      assert.equal(s.id, undefined);
      done();
    });
  });


  it('should be turned off when the schema has a set `id` path', function(done) {
    var schema = new Schema({
      id: String
    });

    var S = db.model('SchemaHasId', schema);
    S.create({ id: 'test'}, function(err, s) {
      assert.ifError(err);

      // Comparing with expected value
      assert.equal(s.id, 'test');
      done();
    });
  });
});
