'use strict';

const isPOJO = require('./isPOJO');
const symbols = require('../schema/symbols');

/**
 * Filter predicate that returns true for built-in middleware (marked with `builtInMiddleware` symbol).
 */
const isBuiltInMiddleware = hook => hook.fn[symbols.builtInMiddleware];

/**
 * Builds a filter for kareem's execPre/execPost based on middleware options.
 *
 * @param {object} options - Options object that may contain `middleware` setting
 * @param {string} phase - Either 'pre' or 'post'
 * @returns {Function|null} - null runs all middleware, isBuiltInMiddleware skips user middleware
 */
function buildMiddlewareFilter(options, phase) {
  const shouldSkip = options?.middleware === false || options?.middleware?.[phase] === false;
  return shouldSkip ? isBuiltInMiddleware : null;
}

/**
 * kareem `getOptions` implementation for custom statics and methods: reads the
 * `middleware` option from the call's last argument if it is a plain object.
 *
 * @param {Array} args - Arguments the custom static or method was called with
 * @returns {object} - Per-call kareem options with pre/post filters
 */
function middlewareFiltersFromLastArg(args) {
  const lastArg = args[args.length - 1];
  const options = isPOJO(lastArg) ? lastArg : null;
  return {
    pre: { filter: buildMiddlewareFilter(options, 'pre') },
    post: { filter: buildMiddlewareFilter(options, 'post') }
  };
}

/**
 * Capture operation options for internal post hooks without changing user hook arguments.
 */
function bindPostMiddlewareOptions(hooks, name, options) {
  const posts = hooks._posts.get(name);
  if (!posts?.some(post => post.fn[symbols.middlewareOptions])) {
    return hooks;
  }

  const boundHooks = hooks.clone();
  boundHooks._posts.set(name, posts.map(post => {
    if (!post.fn[symbols.middlewareOptions]) {
      return post;
    }
    const fn = function() {
      return post.fn.call(this, options);
    };
    fn[symbols.builtInMiddleware] = post.fn[symbols.builtInMiddleware];
    return { ...post, fn };
  }));
  return boundHooks;
}

module.exports = {
  bindPostMiddlewareOptions,
  buildMiddlewareFilter,
  middlewareFiltersFromLastArg
};
