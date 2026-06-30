'use strict';

const { buildMiddlewareFilter } = require('../buildMiddlewareFilter');
const isPOJO = require('../isPOJO');
const { queryMiddlewareFunctions, aggregateMiddlewareFunctions, modelMiddlewareFunctions, documentMiddlewareFunctions } = require('../../constants');

const middlewareFunctions = Array.from(
  new Set([
    ...queryMiddlewareFunctions,
    ...aggregateMiddlewareFunctions,
    ...modelMiddlewareFunctions,
    ...documentMiddlewareFunctions
  ])
);

module.exports = function applyStaticHooks(model, hooks, statics) {
  hooks = hooks.filter(hook => {
    // If the custom static overwrites an existing middleware, don't apply
    // middleware to it by default. This avoids a potential backwards breaking
    // change with plugins like `mongoose-delete` that use statics to overwrite
    // built-in Mongoose functions.
    if (middlewareFunctions.indexOf(hook.name) !== -1) {
      return !!hook.model;
    }
    return hook.model !== false;
  });

  for (const key of Object.keys(statics)) {
    if (hooks.hasHooks(key)) {
      const original = model[key];

      model[key] = hooks.createWrapper(key, original, null, {
        getOptions: args => {
          const lastArg = args[args.length - 1];
          const options = isPOJO(lastArg) ? lastArg : null;
          return {
            pre: { filter: buildMiddlewareFilter(options, 'pre') },
            post: { filter: buildMiddlewareFilter(options, 'post') }
          };
        }
      });
    }
  }
};
