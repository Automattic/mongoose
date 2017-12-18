'use strict';

/*!
 * ignore
 */

module.exports = applyHooks;

/*!
 * Register hooks for this model
 *
 * @param {Model} model
 * @param {Schema} schema
 */

function applyHooks(model, schema, options) {
  options = options || {};

  const kareemOptions = {
    useErrorHandlers: true,
    numCallbackParams: 1,
    nullResultByDefault: true,
    contextParameter: true
  };
  const objToDecorate = options.decorateDoc ? model : model.prototype;

  model.$appliedHooks = true;
  for (let i = 0; i < schema.childSchemas.length; ++i) {
    const childModel = schema.childSchemas[i].model;
    if (childModel.$appliedHooks) {
      continue;
    }
    applyHooks(childModel, schema.childSchemas[i].schema, options);
    if (childModel.discriminators != null) {
      let keys = Object.keys(childModel.discriminators);
      for (let j = 0; j < keys.length; ++j) {
        applyHooks(childModel.discriminators[keys[j]],
          childModel.discriminators[keys[j]].schema, options);
      }
    }
  }

  objToDecorate.$__save = schema.s.hooks.
    createWrapper('save', objToDecorate.$__save, null, kareemOptions);
  objToDecorate.$__validate = schema.s.hooks.
    createWrapper('validate', objToDecorate.$__validate, null, kareemOptions);
  objToDecorate.$__remove = schema.s.hooks.
    createWrapper('remove', objToDecorate.$__remove, null, kareemOptions);
  objToDecorate.$__init = schema.s.hooks.
    createWrapperSync('init', objToDecorate.$__init, null, kareemOptions);
}
