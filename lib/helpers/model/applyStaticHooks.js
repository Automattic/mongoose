'use strict';

const promiseOrCallback = require('../promiseOrCallback');
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
  const kareemOptions = {
    useErrorHandlers: true,
    numCallbackParams: 1
  };

  model.$__insertMany = hooks.createWrapper('insertMany',
    model.$__insertMany, model, kareemOptions);

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

      model[key] = function() {
        const numArgs = arguments.length;
        const lastArg = numArgs > 0 ? arguments[numArgs - 1] : null;
        const cb = typeof lastArg === 'function' ? lastArg : null;
        const args = Array.prototype.slice.
          call(arguments, 0, cb == null ? numArgs : numArgs - 1);
        return promiseOrCallback(cb, callback => {
          hooks.execPre(key, model, args).then(() => onPreComplete(null), err => onPreComplete(err));

          function onPreComplete(err) {
            if (err != null) {
              return callback(err);
            }

            let postCalled = 0;
            const ret = original.apply(model, args.concat(post));
            if (ret != null && typeof ret.then === 'function') {
              ret.then(res => post(null, res), err => post(err));
            }

            function post(error, res) {
              if (postCalled++ > 0) {
                return;
              }

              if (error != null) {
                return callback(error);
              }

              hooks.execPost(key, model, [res]).then(() => callback(null, res), err => callback(err));
            }
          }
        }, model.events);
      };
    }
  }
};
