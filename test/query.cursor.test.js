/**
 * Module dependencies.
 */

var assert = require('assert');
var start = require('./common');

var mongoose = start.mongoose;
var Schema = mongoose.Schema;

describe('QueryCursor', function() {
  var db;
  var Model;

  before(function(done) {
    db = start();

    var schema = new Schema({ name: String });
    schema.virtual('test').get(function() { return 'test'; });

    Model = db.model('gh1907_0', schema);

    Model.create({ name: 'Axl' }, { name: 'Slash' }, function(error) {
      assert.ifError(error);
      done();
    });
  });

  after(function(done) {
    db.close(done);
  });

  it('#next()', function(done) {
    var cursor = Model.find().sort({ name: 1 }).cursor();
    cursor.next(function(error, doc) {
      assert.ifError(error);
      assert.equal(doc.name, 'Axl');
      assert.equal(doc.test, 'test');
      cursor.next(function(error, doc) {
        assert.ifError(error);
        assert.equal(doc.name, 'Slash');
        assert.equal(doc.test, 'test');
        done();
      });
    });
  });

  it('as readable stream', function(done) {
    var cursor = Model.find().sort({ name: 1 }).cursor();

    var expectedNames = ['Axl', 'Slash'];
    var cur = 0;
    cursor.on('data', function(doc) {
      assert.equal(doc.name, expectedNames[cur++]);
      assert.equal(doc.test, 'test');
    });

    cursor.on('error', function(error) {
      done(error);
    });

    cursor.on('end', function() {
      assert.equal(cur, 2);
      done();
    });
  });
});
