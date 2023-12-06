'use strict';

module.exports = applyEmbeddedDiscriminators;

function applyEmbeddedDiscriminators(schema, seen = new WeakSet()) {
  if (seen.has(schema)) {
    return;
  }
  seen.add(schema);
  for (const path of Object.keys(schema.paths)) {
    const schemaType = schema.paths[path];
    if (!schemaType.schema) {
      continue;
    }
    applyEmbeddedDiscriminators(schemaType.schema, seen);
    if (!schemaType.schema._applyDiscriminators) {
      continue;
    }
    for (const disc of schemaType.schema._applyDiscriminators.keys()) {
      schemaType.discriminator(disc, schemaType.schema._applyDiscriminators.get(disc));
    }
  }
}
