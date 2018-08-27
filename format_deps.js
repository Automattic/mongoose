'use strict';
const p = require('./package.json');
const _ = require('lodash');

const result = _.map(p.browserDependencies, function(v, k) {
  return k + '@' + v;
});

console.log(result.join(' '));
