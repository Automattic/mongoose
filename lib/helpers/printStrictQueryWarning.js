'use strict';

const util = require('util');

module.exports = util.deprecate(
  function() { },
  'Mongoose: the `strictQuery` option will be switched back to `false` by default ' +
    'in Mongoose 7. Use `mongoose.set(\'strictQuery\', false);` if you want to prepare ' +
    'for this change. Or use `mongoose.set(\'strictQuery\', true);` to suppress this warning.',
  'MONGOOSE'
);
