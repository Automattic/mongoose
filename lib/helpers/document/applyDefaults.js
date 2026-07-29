'use strict';

const isNestedProjection = require('../projection/isNestedProjection');

module.exports = function applyDefaults(doc, fields, exclude, hasIncludedChildren, isBeforeSetters, pathsToSkip, options) {
  const schemaPaths = doc.$__schema.paths;
  const skipParentChangeTracking = options?.skipParentChangeTracking;
  const skipId = doc.$__.skipId;
  // Whether any path has a function default that must run **after** setters,
  // so callers doing a before-setters pass can skip the after-setters pass
  // entirely when this comes back `false`.
  let hasPostSetterDefaults = false;

  for (const p in schemaPaths) {
    let def;
    let curPath = '';

    if (p === '_id' && skipId) {
      continue;
    }

    const type = schemaPaths[p];
    // `getDefault()` returns undefined when `defaultValue` is undefined, in which
    // case this loop never modifies the doc, so skip traversing the path entirely.
    if (type.defaultValue === undefined) {
      continue;
    }
    if (typeof type.defaultValue === 'function' && !type.defaultValue.$runBeforeSetters) {
      hasPostSetterDefaults = true;
    }
    const path = type.splitPath();
    const len = path.length;
    if (path[len - 1] === '$*') {
      continue;
    }

    let included = false;
    let doc_ = doc._doc;

    if (len === 1) {
      if (exclude === true) {
        if (p in fields) {
          continue;
        }
      } else if (exclude === false && fields) {
        const hasSubpaths = type.$isSingleNested || type.$isMongooseDocumentArray;
        if ((p in fields && !isNestedProjection(fields[p])) || (hasSubpaths && hasIncludedChildren != null && hasIncludedChildren[p])) {
          included = true;
        } else if (hasIncludedChildren != null && !hasIncludedChildren[p]) {
          continue;
        }
      }

      if (doc_[p] !== void 0) {
        continue;
      }

      if (isBeforeSetters != null) {
        if (typeof type.defaultValue === 'function') {
          if (!type.defaultValue.$runBeforeSetters && isBeforeSetters) {
            continue;
          }
          if (type.defaultValue.$runBeforeSetters && !isBeforeSetters) {
            continue;
          }
        } else if (!isBeforeSetters) {
          // Non-function defaults should always run **before** setters
          continue;
        }
      }

      if (pathsToSkip && pathsToSkip[p]) {
        continue;
      }

      if (fields && exclude !== null && !(exclude === true || included)) {
        continue;
      }

      try {
        def = type.getDefault(doc, false);
      } catch (err) {
        doc.invalidate(p, err);
        continue;
      }

      if (typeof def !== 'undefined') {
        doc_[p] = def;
        applyChangeTracking(doc, p, skipParentChangeTracking);
      }
      continue;
    }

    for (let j = 0; j < len; ++j) {
      if (doc_ == null) {
        break;
      }

      const piece = path[j];
      curPath = curPath.length ? curPath + '.' + piece : piece;

      if (exclude === true) {
        if (curPath in fields) {
          break;
        }
      } else if (exclude === false && fields && !included) {
        const hasSubpaths = type.$isSingleNested || type.$isMongooseDocumentArray;
        if ((curPath in fields && !isNestedProjection(fields[curPath])) || (j === len - 1 && hasSubpaths && hasIncludedChildren != null && hasIncludedChildren[curPath])) {
          included = true;
        } else if (hasIncludedChildren != null && !hasIncludedChildren[curPath]) {
          break;
        }
      }

      if (j === len - 1) {
        if (doc_[piece] !== void 0) {
          break;
        }

        if (isBeforeSetters != null) {
          if (typeof type.defaultValue === 'function') {
            if (!type.defaultValue.$runBeforeSetters && isBeforeSetters) {
              break;
            }
            if (type.defaultValue.$runBeforeSetters && !isBeforeSetters) {
              break;
            }
          } else if (!isBeforeSetters) {
            // Non-function defaults should always run **before** setters
            continue;
          }
        }

        if (pathsToSkip && pathsToSkip[curPath]) {
          break;
        }

        if (fields && exclude !== null) {
          if (exclude === true) {
            // apply defaults to all non-excluded fields
            if (p in fields) {
              continue;
            }

            try {
              def = type.getDefault(doc, false);
            } catch (err) {
              doc.invalidate(p, err);
              break;
            }

            if (typeof def !== 'undefined') {
              doc_[piece] = def;
              applyChangeTracking(doc, p, skipParentChangeTracking);
            }
          } else if (included) {
            // selected field
            try {
              def = type.getDefault(doc, false);
            } catch (err) {
              doc.invalidate(p, err);
              break;
            }

            if (typeof def !== 'undefined') {
              doc_[piece] = def;
              applyChangeTracking(doc, p, skipParentChangeTracking);
            }
          }
        } else {
          try {
            def = type.getDefault(doc, false);
          } catch (err) {
            doc.invalidate(p, err);
            break;
          }

          if (typeof def !== 'undefined') {
            doc_[piece] = def;
            applyChangeTracking(doc, p, skipParentChangeTracking);
          }
        }
      } else {
        doc_ = doc_[piece];
      }
    }
  }

  return hasPostSetterDefaults;
};

/*!
 * ignore
 */

function applyChangeTracking(doc, fullPath, skipParentChangeTracking) {
  doc.$__.activePaths.default(fullPath);
  if (!skipParentChangeTracking && doc.$isSubdocument && doc.$isSingleNested && doc.$parent() != null) {
    doc.$parent().$__.activePaths.default(doc.$__pathRelativeToParent(fullPath));
  }
}
