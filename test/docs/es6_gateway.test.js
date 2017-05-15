'use strict';

if (parseInt(process.versions.node.split('.')[0], 10) >= 4) {
  require('./schemas.test.es6.js');
}
