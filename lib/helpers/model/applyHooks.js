'use strict';

const { buildMiddlewareFilter } = require('../buildMiddlewareFilter');

/*!
 * ignore
 */

module.exports = applyHooks;

/*!
 * ignore
 */

applyHooks.middlewareFunctions = [
  'deleteOne',
  'remove',
  'save',
  'updateOne',
  'validate',
  'init'
];

/*!
 * ignore
 */

const alreadyHookedFunctions = new Set(applyHooks.middlewareFunctions.flatMap(fn => ([fn, `$__${fn}`])));

/**
 * Register hooks for this model
 *
 * @param {Model} model
 * @param {Schema} schema
 * @param {Object} options
 * @api private
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
  for (const key of Object.keys(schema.paths)) {
    let type = schema.paths[key];
    let childModel = null;

    const result = findChildModel(type);
    if (result) {
      childModel = result.childModel;
      type = result.type;
    } else {
      continue;
    }

    if (childModel.$appliedHooks) {
      continue;
    }

    applyHooks(childModel, type.schema, {
      ...options,
      decorateDoc: false,
      isChildSchema: true
    });
    if (childModel.discriminators != null) {
      const keys = Object.keys(childModel.discriminators);
      for (const key of keys) {
        applyHooks(childModel.discriminators[key],
          childModel.discriminators[key].schema, options);
      }
    }
  }

  // Built-in hooks rely on hooking internal functions in order to support
  // promises and make it so that `doc.save.toString()` provides meaningful
  // information.

  const middleware = schema._getDocumentMiddleware();

  model._middleware = middleware;

  objToDecorate.$__init = middleware.
    createWrapperSync('init', objToDecorate.$__init, null, {
      ...kareemOptions,
      getOptions: (args) => {
        const opts = args[1];
        return {
          pre: { filter: buildMiddlewareFilter(opts, 'pre') },
          post: { filter: buildMiddlewareFilter(opts, 'post') }
        };
      }
    });

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
    if (alreadyHookedFunctions.has(method)) {
      continue;
    }
    if (!middleware.hasHooks(method)) {
      // Don't wrap if there are no hooks for the custom method to avoid
      // surprises. Also, `createWrapper()` enforces consistent async,
      // so wrapping a sync method would break it.
      continue;
    }
    const originalMethod = objToDecorate[method];
    objToDecorate[`$__${method}`] = objToDecorate[method];
    objToDecorate[method] = middleware.
      createWrapper(method, originalMethod, null, customMethodOptions);
  }
}

/**
 * Check if there is an embedded schematype in the given schematype. Handles drilling down into primitive
 * arrays and maps in case of array of array of subdocs or map of subdocs.
 *
 * @param {SchemaType} curType
 * @returns {{ childModel: Model | typeof Subdocument, curType: SchemaType } | null}
 */

function findChildModel(curType) {
  if (curType.$isSingleNested || curType.$isMongooseDocumentArray) {
    return { childModel: curType.Constructor, type: curType };
  }
  if (curType.instance === 'Array') {
    const embedded = curType.getEmbeddedSchemaType();
    if (embedded) {
      return findChildModel(embedded);
    }
  }
  if (curType.instance === 'Map') {
    const mapType = curType.getEmbeddedSchemaType();
    if (mapType) {
      return findChildModel(mapType);
    }
  }
  return null;
}
