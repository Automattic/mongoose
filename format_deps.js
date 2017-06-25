var p = require('./package.json');
var _ = require('lodash');

var result = _.map(p.browserDependencies, function(v, k) {
  return k + '@' + v;
});

console.log(result.join(' '));
