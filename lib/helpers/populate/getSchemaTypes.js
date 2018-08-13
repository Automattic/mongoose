'use strict';

/*!
 * ignore
 */

const Mixed = require('../../schema/mixed');
const get = require('lodash.get');
const mpath = require('mpath');

/*!
 * @param {Schema} schema
 * @param {Object} doc POJO
 * @param {string} path
 */

module.exports = function getSchemaTypes(schema, doc, path) {
  const pathschema = schema.path(path);

  if (pathschema) {
    return pathschema;
  }

  function search(parts, schema, subdoc) {
    let p = parts.length + 1;
    let foundschema;
    let trypath;

    while (p--) {
      trypath = parts.slice(0, p).join('.');
      foundschema = schema.path(trypath);

      if (foundschema == null) {
        continue;
      }

      if (foundschema.caster) {
        // array of Mixed?
        if (foundschema.caster instanceof Mixed) {
          return foundschema.caster;
        }

        let schemas = null;
        if (doc != null && foundschema.schema != null && foundschema.schema.discriminators != null) {
          const discriminators = foundschema.schema.discriminators;
          const discriminatorKeyPath = trypath + '.' +
            foundschema.schema.options.discriminatorKey;
          const keys = subdoc ? mpath.get(discriminatorKeyPath, subdoc) || [] : [];
          schemas = Object.keys(discriminators).
            reduce(function(cur, discriminator) {
              if (keys.indexOf(discriminator) !== -1) {
                cur.push(discriminators[discriminator]);
              }
              return cur;
            }, []);
        }

        // Now that we found the array, we need to check if there
        // are remaining document paths to look up for casting.
        // Also we need to handle array.$.path since schema.path
        // doesn't work for that.
        // If there is no foundschema.schema we are dealing with
        // a path like array.$
        if (p !== parts.length && foundschema.schema) {
          let ret;
          if (parts[p] === '$') {
            if (p + 1 === parts.length) {
              // comments.$
              return foundschema;
            }
            // comments.$.comments.$.title
            ret = search(parts.slice(p + 1), schema, subdoc ? mpath.get(trypath, subdoc) : null);
            if (ret) {
              ret.$isUnderneathDocArray = ret.$isUnderneathDocArray ||
                !foundschema.schema.$isSingleNested;
            }
            return ret;
          }

          if (schemas != null && schemas.length > 0) {
            ret = [];
            for (var i = 0; i < schemas.length; ++i) {
              let _ret = search(parts.slice(p), schemas[i], subdoc ? mpath.get(trypath, subdoc) : null);
              if (_ret != null) {
                _ret.$isUnderneathDocArray = _ret.$isUnderneathDocArray ||
                  !foundschema.schema.$isSingleNested;
                if (_ret.$isUnderneathDocArray) {
                  ret.$isUnderneathDocArray = true;
                }
                ret.push(_ret);
              }
            }
            return ret;
          } else {
            ret = search(parts.slice(p), foundschema.schema, subdoc ? mpath.get(trypath, subdoc) : null);

            if (ret) {
              ret.$isUnderneathDocArray = ret.$isUnderneathDocArray ||
                !foundschema.schema.$isSingleNested;
            }

            return ret;
          }
        }
      }

      if (doc.$__ && doc.populated(trypath)) {
        const schema = get(doc.$__.populated[trypath], 'options.model.schema');
        if (schema != null) {
          const ret = search(parts.slice(p), schema, subdoc ? mpath.get(trypath, subdoc) : null);

          if (ret) {
            ret.$isUnderneathDocArray = ret.$isUnderneathDocArray ||
              !schema.$isSingleNested;
          }

          return ret;
        }
      }

      return foundschema;
    }
  }

  // look for arrays
  const parts = path.split('.');
  for (let i = 0; i < parts.length; ++i) {
    if (parts[i] === '$') {
      // Re: gh-5628, because `schema.path()` doesn't take $ into account.
      parts[i] = '0';
    }
  }
  return search(parts, schema, doc);
};
