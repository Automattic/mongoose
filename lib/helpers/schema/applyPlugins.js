'use strict';

module.exports = function applyPlugins(schema, plugins, options, cacheKey) {
  if (schema[cacheKey]) {
    return;
  }
  schema[cacheKey] = true;

  if (!options || !options.skipTopLevel) {
    for (const plugin of plugins) {
      schema.plugin(plugin[0], plugin[1]);
    }
  }

  options = Object.assign({}, options);
  delete options.skipTopLevel;

  if (options.applyPluginsToChildSchemas !== false) {
    for (const path of Object.keys(schema.paths)) {
      const type = schema.paths[path];
      if (type.schema != null) {
        applyPlugins(type.schema, plugins, options, cacheKey);

        // Recompile schema because plugins may have changed it, see gh-7572
        type.caster.prototype.$__setSchema(type.schema);
      }
    }
  }

  const discriminators = schema.discriminators;
  if (discriminators == null) {
    return;
  }

  const applyPluginsToDiscriminators = options.applyPluginsToDiscriminators;

  const keys = Object.keys(discriminators);
  for (const discriminatorKey of keys) {
    const discriminatorSchema = discriminators[discriminatorKey];

    applyPlugins(discriminatorSchema, plugins,
      { skipTopLevel: !applyPluginsToDiscriminators }, cacheKey);
  }
};