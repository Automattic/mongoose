
/**
 * Module dependencies.
 */

var start = require('./common')
  , should = require('should')
  , mongoose = start.mongoose
  , Schema = mongoose.Schema

/**
 * Test.
 */

module.exports = {

  'test closing a connection that\'s already closed': function (beforeExit) {
    var db = mongoose.createConnection()
      , called = false;

    db.readyState.should.eql(0);
    db.close(function (err) {
      should.strictEqual(err, null);
      called = true;
    });

    beforeExit(function () {
      called.should.be.true;
    });
  },

  'test connection args': function (beforeExit) {
    var db = mongoose.createConnection('mongodb://localhost/fake');
    db.options.should.be.a('object');
    db.options.server.should.be.a('object');
    db.options.server.auto_reconnect.should.be.true;
    db.options.db.should.be.a('object');
    db.options.db.forceServerObjectId.should.be.false;
    should.strictEqual(undefined, db.pass);
    should.strictEqual(undefined, db.user);
    db.name.should.equal('fake');
    db.host.should.equal('localhost');
    db.port.should.equal(27017);
    db.close();

    db = mongoose.createConnection('mongodb://localhost:27000/fake');
    db.options.should.be.a('object');
    db.options.server.should.be.a('object');
    db.options.server.auto_reconnect.should.be.true;
    db.options.db.should.be.a('object');
    db.options.db.forceServerObjectId.should.be.false;
    should.strictEqual(undefined, db.pass);
    should.strictEqual(undefined, db.user);
    db.name.should.equal('fake');
    db.host.should.equal('localhost');
    db.port.should.equal('27000');
    db.close();

    db = mongoose.createConnection('mongodb://aaron:psw@localhost:27000/fake');
    db.options.should.be.a('object');
    db.options.server.should.be.a('object');
    db.options.server.auto_reconnect.should.be.true;
    db.options.db.should.be.a('object');
    db.options.db.forceServerObjectId.should.be.false;
    should.strictEqual('psw', db.pass);
    should.strictEqual('aaron', db.user);
    db.name.should.equal('fake');
    db.host.should.equal('localhost');
    db.port.should.equal('27000');
    db.close();

    db = mongoose.createConnection('mongodb://aaron:psw@localhost:27000/fake', { db: { forceServerObjectId: true }});
    db.options.should.be.a('object');
    db.options.server.should.be.a('object');
    db.options.server.auto_reconnect.should.be.true;
    db.options.db.should.be.a('object');
    db.options.db.forceServerObjectId.should.be.false;
    db.close();

    db = mongoose.createConnection('mongodb://aaron:psw@localhost:27000/fake', { server: { auto_reconnect: false }});
    db.options.should.be.a('object');
    db.options.server.should.be.a('object');
    db.options.server.auto_reconnect.should.be.false;
    db.options.db.should.be.a('object');
    db.options.db.forceServerObjectId.should.be.false;
    db.close();

    var called1 = false;
    db = mongoose.createConnection('mongodb://aaron:psw@localhost:27000/fake', { server: { auto_reconnect: true }}, function () {
       called1 = true;
    });
    beforeExit(function () {
      called1.should.be.true;
    });
    db.options.should.be.a('object');
    db.options.server.should.be.a('object');
    db.options.server.auto_reconnect.should.be.true;
    db.options.db.should.be.a('object');
    db.options.db.forceServerObjectId.should.be.false;
    db.close();

    var called2 = false;
    db = mongoose.createConnection('mongodb://localhost/fake', function () {
      called2 = true;
    });
    beforeExit(function () {
      called2.should.be.true;
    });
    db.options.should.be.a('object');
    db.options.server.should.be.a('object');
    db.options.server.auto_reconnect.should.be.true;
    db.options.db.should.be.a('object');
    db.options.db.forceServerObjectId.should.be.false;
    db.name.should.equal('fake');
    db.host.should.equal('localhost');
    db.port.should.equal(27017);
    db.close();

    db = mongoose.createConnection('mongodb:///fake', function (err) {
      err.message.should.equal('Missing connection hostname.');
    });
    db.options.should.be.a('object');
    db.options.server.should.be.a('object');
    db.options.server.auto_reconnect.should.be.true;
    db.options.db.should.be.a('object');
    db.options.db.forceServerObjectId.should.be.false;
    should.strictEqual(undefined, db.name);
    should.strictEqual(undefined, db.host);
    should.strictEqual(undefined, db.port);
    db.close();

    db = mongoose.createConnection('mongodb://localhost', function (err) {
      err.message.should.equal('Missing connection database.');
    });
    db.options.should.be.a('object');
    db.options.server.should.be.a('object');
    db.options.server.auto_reconnect.should.be.true;
    db.options.db.should.be.a('object');
    db.options.db.forceServerObjectId.should.be.false;
    should.strictEqual(undefined, db.name);
    should.strictEqual(undefined, db.host);
    should.strictEqual(undefined, db.port);
    db.close();

    var called3 = false;
    db = mongoose.createConnection('127.0.0.1', 'faker', 28000, { server: { auto_reconnect: false }}, function () {
       called3 = true;
    });
    beforeExit(function () {
      called3.should.be.true;
    });
    db.options.should.be.a('object');
    db.options.server.should.be.a('object');
    db.options.server.auto_reconnect.should.be.false;
    db.options.db.should.be.a('object');
    db.options.db.forceServerObjectId.should.be.false;
    db.name.should.equal('faker');
    db.host.should.equal('127.0.0.1');
    db.port.should.equal(28000);
    db.close();

    var called4 = false;
    db = mongoose.createConnection('127.0.0.1', 'faker', 28000, function () {
       called4 = true;
    });
    beforeExit(function () {
      called4.should.be.true;
    });
    db.options.should.be.a('object');
    db.options.server.should.be.a('object');
    db.options.server.auto_reconnect.should.be.true;
    db.options.db.should.be.a('object');
    db.options.db.forceServerObjectId.should.be.false;
    db.name.should.equal('faker');
    db.host.should.equal('127.0.0.1');
    db.port.should.equal(28000);
    db.close();

    db = mongoose.createConnection('127.0.0.1', 'faker', 28000, { server: { auto_reconnect: true }});
    db.options.should.be.a('object');
    db.options.server.should.be.a('object');
    db.options.server.auto_reconnect.should.be.true;
    db.options.db.should.be.a('object');
    db.options.db.forceServerObjectId.should.be.false;
    db.name.should.equal('faker');
    db.host.should.equal('127.0.0.1');
    db.port.should.equal(28000);
    db.close();

    db = mongoose.createConnection('127.0.0.1', 'faker', 28001);
    db.options.should.be.a('object');
    db.options.server.should.be.a('object');
    db.options.server.auto_reconnect.should.be.true;
    db.options.db.should.be.a('object');
    db.options.db.forceServerObjectId.should.be.false;
    db.name.should.equal('faker');
    db.host.should.equal('127.0.0.1');
    db.port.should.equal(28001);
    db.close();

    db = mongoose.createConnection('127.0.0.1', 'faker', { blah: 1 });
    db.options.should.be.a('object');
    db.options.server.should.be.a('object');
    db.options.server.auto_reconnect.should.be.true;
    db.options.db.should.be.a('object');
    db.options.db.forceServerObjectId.should.be.false;
    db.options.blah.should.equal(1);
    db.name.should.equal('faker');
    db.host.should.equal('127.0.0.1');
    db.port.should.equal(27017);
    db.close();

    var called5 = false
    db = mongoose.createConnection('127.0.0.1', 'faker', function () {
      called5 = true;
    });
    beforeExit(function () {
      called5.should.be.true;
    });
    db.options.should.be.a('object');
    db.options.server.should.be.a('object');
    db.options.server.auto_reconnect.should.be.true;
    db.options.db.should.be.a('object');
    db.options.db.forceServerObjectId.should.be.false;
    db.name.should.equal('faker');
    db.host.should.equal('127.0.0.1');
    db.port.should.equal(27017);
    db.close();

    db = mongoose.createConnection('127.0.0.1', 'faker');
    db.options.should.be.a('object');
    db.options.server.should.be.a('object');
    db.options.server.auto_reconnect.should.be.true;
    db.options.db.should.be.a('object');
    db.options.db.forceServerObjectId.should.be.false;
    db.name.should.equal('faker');
    db.host.should.equal('127.0.0.1');
    db.port.should.equal(27017);
    db.close();

    // Test connecting using user/pass in hostname
    db = mongoose.createConnection('aaron:psw@localhost', 'fake', 27000);
    db.options.should.be.a('object');
    db.options.server.should.be.a('object');
    db.options.server.auto_reconnect.should.be.true;
    db.options.db.should.be.a('object');
    db.options.db.forceServerObjectId.should.be.false;
    should.strictEqual('psw', db.pass);
    should.strictEqual('aaron', db.user);
    db.name.should.equal('fake');
    db.host.should.equal('localhost');
    db.port.should.equal(27000);
    db.close();

    // Test connecting using user/pass options
    db = mongoose.createConnection('localhost', 'fake', 27000, {user: 'aaron', pass: 'psw'});
    db.options.should.be.a('object');
    db.options.server.should.be.a('object');
    db.options.server.auto_reconnect.should.be.true;
    db.options.db.should.be.a('object');
    db.options.db.forceServerObjectId.should.be.false;
    should.strictEqual('psw', db.pass);
    should.strictEqual('aaron', db.user);
    db.name.should.equal('fake');
    db.host.should.equal('localhost');
    db.port.should.equal(27000);
    db.close();

    // Test connecting using only user option - which shouldn't work
    db = mongoose.createConnection('localhost', 'fake', 27000, {user: 'no_pass'});
    db.options.should.be.a('object');
    db.options.server.should.be.a('object');
    db.options.server.auto_reconnect.should.be.true;
    db.options.db.should.be.a('object');
    db.options.db.forceServerObjectId.should.be.false;
    should.strictEqual(undefined, db.pass);
    should.strictEqual(undefined, db.user);
    db.name.should.equal('fake');
    db.host.should.equal('localhost');
    db.port.should.equal(27000);
    db.close();
  },

  'connection.model allows passing a schema': function () {
    var db = start();
    var MyModel = db.model('MyModelasdf', new Schema({
        name: String
    }));

    MyModel.schema.should.be.an.instanceof(Schema);
    MyModel.prototype.schema.should.be.an.instanceof(Schema);

    var m = new MyModel({name:'aaron'});
    m.name.should.eql('aaron');
    db.close();
  },

  'connection error event fires with one listener': function (exit) {
    var db= start({ uri: 'mongodb://localasdfads/fakeeee'})
      , called = false;
    db.on('error', function () {
      // this callback has no params which triggered the bug #759
      called = true;
    });
    exit(function () {
      called.should.be.true;
    });
  }

};
