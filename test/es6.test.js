'use strict';

if (parseInt(process.versions.node.split('.')[0], 10) >= 4) {
  require('./es6/all.test.es6.js');
}
