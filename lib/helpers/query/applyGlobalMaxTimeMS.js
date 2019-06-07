'use strict';

const utils = require('../../utils');

module.exports = function applyGlobalMaxTimeMS(options, model) {
  if (utils.hasUserDefinedProperty(options, 'maxTimeMS')) {
    return;
  }

  if (utils.hasUserDefinedProperty(model.db.options, 'maxTimeMS')) {
    options.maxTimeMS = model.db.options.maxTimeMS;
  } else if (utils.hasUserDefinedProperty(model.base.options, 'maxTimeMS')) {
    options.maxTimeMS = model.base.options.maxTimeMS;
  }
};