'use strict';

var utils = require('../utils');

/*!
 * ignore
 */

module.exports = function shardingPlugin(schema) {
  schema.post('init', function() {
    storeShard.call(this);
    return this;
  });
  schema.pre('save', function(next) {
    applyWhere.call(this);
    next();
  });
  schema.post('save', function() {
    storeShard.call(this);
  });
};

/*!
 * ignore
 */

function applyWhere() {
  var paths;
  var len;

  if (this.$__.shardval) {
    paths = Object.keys(this.$__.shardval);
    len = paths.length;

    this.$where = this.$where || {};
    for (var i = 0; i < len; ++i) {
      this.$where[paths[i]] = this.$__.shardval[paths[i]];
    }
  }
}

/*!
 * ignore
 */

module.exports.storeShard = storeShard;

/*!
 * ignore
 */

function storeShard() {
  // backwards compat
  var key = this.schema.options.shardKey || this.schema.options.shardkey;
  if (!(key && utils.getFunctionName(key.constructor) === 'Object')) {
    return;
  }

  var orig = this.$__.shardval = {},
      paths = Object.keys(key),
      len = paths.length,
      val;

  for (var i = 0; i < len; ++i) {
    val = this.getValue(paths[i]);
    if (utils.isMongooseObject(val)) {
      orig[paths[i]] = val.toObject({depopulate: true, _isNested: true});
    } else if (val !== null && val !== undefined && val.valueOf &&
          // Explicitly don't take value of dates
        (!val.constructor || utils.getFunctionName(val.constructor) !== 'Date')) {
      orig[paths[i]] = val.valueOf();
    } else {
      orig[paths[i]] = val;
    }
  }
}
