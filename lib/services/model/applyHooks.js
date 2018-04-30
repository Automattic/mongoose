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

  // Built-in hooks rely on hooking internal functions in order to support
  // promises and make it so that `doc.save.toString()` provides meaningful
  // information.
  objToDecorate.$__save = schema.s.hooks.
    createWrapper('save', objToDecorate.$__save, null, kareemOptions);
  objToDecorate.$__validate = schema.s.hooks.
    createWrapper('validate', objToDecorate.$__validate, null, kareemOptions);
  objToDecorate.$__remove = schema.s.hooks.
    createWrapper('remove', objToDecorate.$__remove, null, kareemOptions);
  objToDecorate.$__init = schema.s.hooks.
    createWrapperSync('init', objToDecorate.$__init, null, kareemOptions);

  // Support hooks for custom methods
  const customMethods = Object.keys(schema.methods);
  for (const method of customMethods) {
    if (!schema.s.hooks.hasHooks(method)) {
      // Don't wrap if there are no hooks for the custom method to avoid
      // surprises. Also, `createWrapper()` enforces consistent async,
      // so wrapping a sync method would break it.
      continue;
    }
    objToDecorate[method] = schema.s.hooks.
      createWrapper(method, objToDecorate[method], null, kareemOptions);
  }
}
