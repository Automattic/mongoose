'use strict';

const utils = require('../../utils');

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
      const keys = Object.keys(childModel.discriminators);
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
  const customMethodOptions = Object.assign({}, kareemOptions, {
    // Only use `checkForPromise` for custom methods, because mongoose
    // query thunks are not as consistent as I would like about returning
    // a nullish value rather than the query. If a query thunk returns
    // a query, `checkForPromise` causes infinite recursion
    checkForPromise: true
  });
  for (const method of customMethods) {
    if (!schema.s.hooks.hasHooks(method)) {
      // Don't wrap if there are no hooks for the custom method to avoid
      // surprises. Also, `createWrapper()` enforces consistent async,
      // so wrapping a sync method would break it.
      continue;
    }
    const originalMethod = objToDecorate[method];
    objToDecorate[method] = function() {
      const args = Array.prototype.slice.call(arguments);
      const cb = utils.last(args);
      const argsWithoutCallback = cb == null ? args :
        args.slice(0, args.length - 1);
      return utils.promiseOrCallback(cb, callback => {
        this[`$__${method}`].apply(this,
          argsWithoutCallback.concat([callback]));
      });
    };
    objToDecorate[`$__${method}`] = schema.s.hooks.
      createWrapper(method, originalMethod, null, customMethodOptions);
  }
}
