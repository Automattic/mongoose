
/**
 * Module dependencies.
 */

var Query = require('mongoose/query').Query;

/**
 * Test.
 */

module.exports = {

  'test Query#skip': function () {
    var query = new Query();

    query.skip(50);
    query.options.skip.should.eql(50);
  },

  'test Query#limit': function () {
    var query = new Query();

    query.limit(3);
    query.options.limit.should.eql(3);
  },

  'test Query#timeout': function () {
    var query = new Query();

    query.timeout(1000);
    query.options.timeout.should.eql(1000);
  },

  'test Query#sort': function () {
    var query = new Query();

    query.sort('test', 1, 'nope', -1);
    query.options.sort.should.eql([['test', 1], ['nope', -1]]);
  }

};
