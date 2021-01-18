'use strict';

if (parseInt(process.versions.node.split('.')[0], 10) >= 10) {
  require('./es-next/asyncIterator.test.es6.js');
}

if (parseInt(process.versions.node.split('.')[0], 10) >= 8) {
  require('./es-next/lean.test.es6.js');
  require('./es-next/cast.test.es6.js');
  require('./es-next/findoneandupdate.test.es6.js');
  require('./es-next/getters-setters.test.es6.js');
  require('./es-next/promises.test.es6.js');
  require('./es-next/virtuals.test.es6.js');
  require('./es-next/transactions.test.es6.js');
}
