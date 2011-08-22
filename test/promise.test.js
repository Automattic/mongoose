
/**
 * Module dependencies.
 */

var should = require('should')
  , Promise = require('../lib/promise');

/**
 * Test.
 */

module.exports = {

  'test that events fire right away after complete()ing': function (beforeExit) {
    var promise = new Promise()
      , called = 0;

    promise.on('complete', function (a, b) {
      a.should.eql('1');
      b.should.eql('2');
      called++;
    });

    promise.complete('1', '2');

    promise.on('complete', function (a, b) {
      a.should.eql('1');
      b.should.eql('2');
      called++;
    });

    beforeExit(function () {
      called.should.eql(2);
    });
  },

  'test that events fire right away after error()ing': function (beforeExit) {
    var promise = new Promise()
      , called = 0;

    promise.on('err', function (err) {
      err.should.be.an.instanceof(Error);
      called++;
    });

    promise.error(new Error('booyah'));

    promise.on('err', function (err) {
      err.should.be.an.instanceof(Error);
      called++;
    });

    beforeExit(function () {
      called.should.eql(2);
    });
  },

  'test errback+callback from constructor': function (beforeExit) {
    var promise = new Promise(function (err) {
          err.should.be.an.instanceof(Error);
          called++;
        })
      , called = 0;

    promise.error(new Error('dawg'));

    beforeExit(function () {
      called.should.eql(1);
    });
  },

  'test errback+callback after complete()ing': function (beforeExit) {
    var promise = new Promise()
      , called = 0;

    promise.complete('woot');

    promise.addBack(function (err, data){
      data.should.eql('woot');
      called++;
    });

    promise.addBack(function (err, data){
      should.strictEqual(err, null);
      called++;
    });

    beforeExit(function () {
      called.should.eql(2);
    });
  },

  'test errback+callback after error()ing': function (beforeExit) {
    var promise = new Promise()
      , called = 0;

    promise.error(new Error('woot'));

    promise.addBack(function (err){
      err.should.be.an.instanceof(Error);
      called++;
    });

    promise.addBack(function (err){
      err.should.be.an.instanceof(Error);
      called++;
    });

    beforeExit(function () {
      called.should.eql(2);
    });
  },

  'test addCallback shortcut': function (beforeExit) {
    var promise = new Promise()
      , called = 0;

    promise.addCallback(function (woot) {
      should.strictEqual(woot, undefined);
      called++;
    });

    promise.complete();

    beforeExit(function () {
      called.should.eql(1);
    });
  },

  'test addErrback shortcut': function (beforeExit) {
    var promise = new Promise()
      , called = 0;

    promise.addErrback(function (err) {
      err.should.be.an.instanceof(Error);
      called++;
    });

    promise.error(new Error);

    beforeExit(function () {
      called.should.eql(1);
    });
  },

  'test return value of #on()': function () {
    var promise = new Promise()
    promise.on('jump', function(){}).should.be.an.instanceof(Promise);
  },

  'test return value of #addCallback()': function () {
    var promise = new Promise()
    promise.addCallback(function(){}).should.be.an.instanceof(Promise);
  },

  'test return value of #addErrback()': function () {
    var promise = new Promise()
    promise.addErrback(function(){}).should.be.an.instanceof(Promise);
  },

  'test return value of #addBack()': function () {
    var promise = new Promise()
    promise.addBack(function(){}).should.be.an.instanceof(Promise);
  }

};
