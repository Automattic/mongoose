'use strict';

const symbols = require('../../schema/symbols');
const utils = require('../../utils');

/*!
 * ignore
 */

module.exports = applyHooks;

/*!
 * ignore
 */

applyHooks.middlewareFunctions = [
  'save',
  'validate',
  'remove',
  'updateOne',
  'init'
];

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

  const middleware = schema.s.hooks.
    filter(hook => {
      if (hook.name === 'updateOne') {
        return !!hook['document'];
      }
      if (hook.name === 'remove') {
        return hook['document'] == null || !!hook['document'];
      }
      return true;
    }).
    filter(hook => {
      // If user has overwritten the method, don't apply built-in middleware
      if (schema.methods[hook.name]) {
        return !hook.fn[symbols.builtInMiddleware];
      }

      return true;
    });

  model._middleware = middleware;

  objToDecorate.$__save = middleware.
    createWrapper('save', objToDecorate.$__save, null, kareemOptions);
  objToDecorate.$__validate = middleware.
    createWrapper('validate', objToDecorate.$__validate, null, kareemOptions);
  objToDecorate.$__remove = middleware.
    createWrapper('remove', objToDecorate.$__remove, null, kareemOptions);
  objToDecorate.$__init = middleware.
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
    if (!middleware.hasHooks(method)) {
      // Don't wrap if there are no hooks for the custom method to avoid
      // surprises. Also, `createWrapper()` enforces consistent async,
      // so wrapping a sync method would break it.
      continue;
    }
    const originalMethod = objToDecorate[method];
    objToDecorate[method] = function() {
      const args = Array.prototype.slice.call(arguments);
      const cb = utils.last(args);
      const argsWithoutCallback = typeof cb === 'function' ?
        args.slice(0, args.length - 1) : args;
      return utils.promiseOrCallback(cb, callback => {
        return this[`$__${method}`].apply(this,
          argsWithoutCallback.concat([callback]));
      }, model.events);
    };
    objToDecorate[`$__${method}`] = middleware.
      createWrapper(method, originalMethod, null, customMethodOptions);
  }
}
