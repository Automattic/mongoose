'use strict';

/**
 * Module dependencies.
 */

const start = require('./common');

const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('id virtual getter', function() {
  let db;

  before(function() {
    db = start();
  });

  after(function(done) {
    db.close(done);
  });

  it('should work as expected with an ObjectId', function(done) {
    const schema = new Schema({});

    const S = db.model('Basic', schema);
    S.create({}, function(err, s) {
      assert.ifError(err);

      // Comparing with virtual getter
      assert.equal(s._id.toString(), s.id);
      done();
    });
  });

  it('should be turned off when `id` option is set to false', function(done) {
    const schema = new Schema({}, {id: false});

    const S = db.model('NoIdGetter', schema);
    S.create({}, function(err, s) {
      assert.ifError(err);

      // Comparing with virtual getter
      assert.equal(s.id, undefined);
      done();
    });
  });


  it('should be turned off when the schema has a set `id` path', function(done) {
    const schema = new Schema({
      id: String
    });

    const S = db.model('SchemaHasId', schema);
    S.create({ id: 'test'}, function(err, s) {
      assert.ifError(err);

      // Comparing with expected value
      assert.equal(s.id, 'test');
      done();
    });
  });
});
