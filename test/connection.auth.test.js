var start = require('./common');
var mongoose = start.mongoose;
var assert = require('power-assert');

describe('connection:', function() {
  describe('supports authSource', function() {
    it('in querystring', function(done) {
      var conn = mongoose.createConnection();
      conn._open = function() {
        assert.ok(conn.options);
        assert.ok(conn.options.auth);
        assert.equal('users', conn.options.auth.authSource);
        conn.close(done);
      };
      conn.open(start.uri + '?authSource=users');
    });

    it('passed as an option', function(done) {
      var conn = mongoose.createConnection();
      conn._open = function() {
        assert.ok(conn.options);
        assert.ok(conn.options.auth);
        assert.equal('users', conn.options.auth.authSource);
        conn.close(done);
      };
      conn.open(start.uri, {auth: {authSource: 'users'}});
    });
  });
});
