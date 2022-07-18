'use strict';

const utils = require('../../utils');

function applyGlobalMaxTimeMS(options, model) {
  applyGlobalOption(options, model, 'maxTimeMS');
}

function applyGlobalDiskUse(options, model) {
  applyGlobalOption(options, model, 'allowDiskUse');
}

module.exports = {
  applyGlobalMaxTimeMS,
  applyGlobalDiskUse
};


function applyGlobalOption(options, model, optionName) {
  if (utils.hasUserDefinedProperty(options, optionName)) {
    return;
  }

  if (utils.hasUserDefinedProperty(model.db.options, optionName)) {
    options[optionName] = model.db.options[optionName];
  } else if (utils.hasUserDefinedProperty(model.base.options, optionName)) {
    options[optionName] = model.base.options[optionName];
  }
}
