'use strict';

/**
 * Precomputed information about which paths in a schema have defaults, so
 * applying defaults doesn't need to iterate over every path in the schema for
 * every document.
 *
 * - `paths` and `schemaTypes` are parallel arrays of every path in the schema
 *   that has a default, in `schema.paths` order, excluding map values like `map.$*`.
 * - `nested` maps each nested path (e.g. `'a.b'`) to the subset of those paths
 *   underneath that nested path, plus `depth`, the number of pieces in the nested path.
 *
 * #### Example:
 *
 *     const s = new Schema({
 *       name: { type: String, default: 'test' },
 *       nested: { a: { type: Number, default: 1 }, b: String }
 *     });
 *     const cache = s._getDefaultsCache();
 *     cache.paths; // [ 'name', 'nested.a', '_id' ]
 *     cache.nested.get('nested'); // { paths: ['nested.a'], schemaTypes: [...], depth: 1 }
 *
 * @api private
 */

class SchemaDefaultsCache {
  constructor(schema) {
    this.paths = [];
    this.schemaTypes = [];
    this.nested = new Map();

    for (const path of Object.keys(schema.paths)) {
      const schemaType = schema.paths[path];
      if (schemaType.defaultValue === undefined) {
        continue;
      }
      const pieces = schemaType.splitPath();
      if (pieces[pieces.length - 1] === '$*') {
        continue;
      }
      this.paths.push(path);
      this.schemaTypes.push(schemaType);

      let nestedPath = '';
      for (let i = 0; i < pieces.length - 1; ++i) {
        nestedPath = i === 0 ? pieces[0] : nestedPath + '.' + pieces[i];
        if (schema.nested[nestedPath] !== true) {
          continue;
        }
        let entry = this.nested.get(nestedPath);
        if (entry == null) {
          entry = { paths: [], schemaTypes: [], depth: i + 1 };
          this.nested.set(nestedPath, entry);
        }
        entry.paths.push(path);
        entry.schemaTypes.push(schemaType);
      }
    }
  }
}

module.exports = SchemaDefaultsCache;
