'use strict';
function getDefaultOptionSetter(type) {
  return function setDefaultOption(optionName, value) {
    type.defaultOptions[optionName] = value;
  };
}

module.exports = getDefaultOptionSetter;