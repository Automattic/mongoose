
/**
 * Module dependencies.
 */

var utils = require('../lib/mongoose/utils');

require('./common');

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
  }

};
