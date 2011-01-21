
/**
 * Module dependencies.
 */

require('./common');

var utils = require('mongoose/utils')
  , StateMachine = utils.StateMachine;

/**
 * Setup.
 */

var ActiveRoster = StateMachine.ctor('require', 'init', 'modify');

/**
 * Test.
 */

module.exports = {

  'test array erasing util': function(){
    function fn(){};
    var arr = [fn, 'test', 1]
      , arr2 = [fn, 'a', 'b', fn, 'c'];

    utils.erase(arr, fn);
    arr.should.have.length(2);
    arr.should.eql(['test', 1]);

    utils.erase(arr2, fn);
    arr2.should.have.length(3);
    arr2.should.eql(['a', 'b', 'c']);
  },

  'should detect a path as required if it has been required': function () {
    var ar = new ActiveRoster();
    ar.require('hello');
    ar.stateOf('hello').should.equal('require');
  },

  'should detect a path as inited if it has been inited': function () {
    var ar = new ActiveRoster();
    ar.init('hello');
    ar.stateOf('hello').should.equal('init');
  },
  
  'should detect a path as modified': function () {
    var ar = new ActiveRoster();
    ar.modify('hello');
    ar.stateOf('hello').should.equal('modify');
  },

  'should remove a path from an old state upon a state change': function () {
    var ar = new ActiveRoster();
    ar.init('hello');
    ar.modify('hello');
    ar.states.init.should.not.have.property('hello');
    ar.states.modify.should.have.property('hello');
  },


  'forEach should be able to iterate through the paths belonging to one state': function () {
    var ar = new ActiveRoster();
    ar.init('hello');
    ar.init('goodbye');
    ar.modify('world');
    ar.require('foo');
    ar.forEach('init', function (path) {
      ['hello', 'goodbye'].should.contain(path);
    });
  },

  'forEach should be able to iterate through the paths in the union of two or more states': function () {
    var ar = new ActiveRoster();
    ar.init('hello');
    ar.init('goodbye');
    ar.modify('world');
    ar.require('foo');
    ar.forEach('modify', 'require', function (path) {
      ['world', 'foo'].should.contain(path);
    });
  },

  'forEach should iterate through all paths that have any state if given no state arguments': function () {
    var ar = new ActiveRoster();
    ar.init('hello');
    ar.init('goodbye');
    ar.modify('world');
    ar.require('foo');
    ar.forEach(function (path) {
      ['hello', 'goodbye', 'world', 'foo'].should.contain(path);
    });
  },

  'should be able to detect if at least one path exists in a set of states': function () {
    var ar = new ActiveRoster();
    ar.init('hello');
    ar.modify('world');
    ar.some('init').should.be.true;
    ar.some('modify').should.be.true;
    ar.some('require').should.be.false;
    ar.some('init', 'modify').should.be.true;
    ar.some('init', 'require').should.be.true;
    ar.some('modify', 'require').should.be.true;
  },

  'should be able to `map` over the set of paths in a given state': function () {
    var ar = new ActiveRoster();
    ar.init('hello');
    ar.modify('world');
    ar.require('iAmTheWalrus');
    var suffixedPaths = ar.map('init', 'modify', function (path) {
      return path + '-suffix';
    });
    suffixedPaths.should.eql(['hello-suffix', 'world-suffix']);
  },

  "should `map` over all states' paths if no states are specified in a `map` invocation": function () {
    var ar = new ActiveRoster();
    ar.init('hello');
    ar.modify('world');
    ar.require('iAmTheWalrus');
    var suffixedPaths = ar.map(function (path) {
      return path + '-suffix';
    });
    suffixedPaths.should.eql(['iAmTheWalrus-suffix', 'hello-suffix', 'world-suffix']);
  }

};
