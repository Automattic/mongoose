
const schemaMerge = require('../schema/merge');
/**
 * Merges `from` into `to` without overwriting existing properties.
 *
 * @param {Object} to
 * @param {Object} from
 * @param {Object} [options]
 * @param {String} [path]
 * @api private
 */

  module.exports = function mergeDiscriminatorSchema(to, from, options, path) {
    options = options || {};
  
    const keys = Object.keys(from);
    let i = 0;
    const len = keys.length;
    let key;
  
    if (from[trustedSymbol]) {
      to[trustedSymbol] = from[trustedSymbol];
    }
  
    path = path || '';
    const omitNested = options.omitNested || {};
  
    while (i < len) {
      key = keys[i++];
      if (options.omit && options.omit[key]) {
        continue;
      }
      if (omitNested[path]) {
        continue;
      }
      if (specialProperties.has(key)) {
        continue;
      }
      if (to[key] == null) {
        to[key] = from[key];
      } else if (exports.isObject(from[key])) {
        if (!exports.isObject(to[key])) {
          to[key] = {};
        }
        if (from[key] != null) {
          // Skip merging schemas if we're creating a discriminator schema and
          // base schema has a given path as a single nested but discriminator schema
          // has the path as a document array, or vice versa (gh-9534)
          if ((from[key].$isSingleNested && to[key].$isMongooseDocumentArray) ||
              (from[key].$isMongooseDocumentArray && to[key].$isSingleNested)) {
            continue;
          } else if (from[key].instanceOfSchema) {
            if (to[key].instanceOfSchema) {
              schemaMerge(to[key], from[key].clone(), true);
            } else {
              to[key] = from[key].clone();
            }
            continue;
          } else if (isBsonType(from[key], 'ObjectID')) {
            to[key] = new ObjectId(from[key]);
            continue;
          }
        }
        mergeDiscriminatorSchema(to[key], from[key], options, path ? path + '.' + key : key);
      } else if (options.overwrite) {
        to[key] = from[key];
      }
    }
  };