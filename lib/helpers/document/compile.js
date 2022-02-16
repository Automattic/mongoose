'use strict';

const documentSchemaSymbol = require('../../helpers/symbols').documentSchemaSymbol;
const internalToObjectOptions = require('../../options').internalToObjectOptions;
const utils = require('../../utils');

let Document;
const getSymbol = require('../../helpers/symbols').getSymbol;
const scopeSymbol = require('../../helpers/symbols').scopeSymbol;

const isPOJO = utils.isPOJO;

/*!
 * exports
 */

exports.compile = compile;
exports.defineKey = defineKey;

/*!
 * Compiles schemas.
 */

function compile(tree, proto, prefix, options) {
  Document = Document || require('../../document');
  const typeKey = options.typeKey;

  for (const key of Object.keys(tree)) {
    const limb = tree[key];

    const hasSubprops = isPOJO(limb) &&
      Object.keys(limb).length > 0 &&
      (!limb[typeKey] || (typeKey === 'type' && isPOJO(limb.type) && limb.type.type));
    const subprops = hasSubprops ? limb : null;

    defineKey({ prop: key, subprops: subprops, prototype: proto, prefix: prefix, options: options });
  }
}

/*!
 * Defines the accessor named prop on the incoming prototype.
 */

function defineKey({ prop, subprops, prototype, prefix, options }) {
  Document = Document || require('../../document');
  const path = (prefix ? prefix + '.' : '') + prop;
  prefix = prefix || '';

  if (subprops) {
    Object.defineProperty(prototype, prop, {
      enumerable: true,
      configurable: true,
      get: function() {
        const _this = this;
        if (!this.$__.getters) {
          this.$__.getters = {};
        }

        if (!this.$__.getters[path]) {
          const nested = Object.create(Document.prototype, getOwnPropertyDescriptors(this));

          // save scope for nested getters/setters
          if (!prefix) {
            nested.$__[scopeSymbol] = this;
          }
          nested.$__.nestedPath = path;

          Object.defineProperty(nested, 'schema', {
            enumerable: false,
            configurable: true,
            writable: false,
            value: prototype.schema
          });

          Object.defineProperty(nested, '$__schema', {
            enumerable: false,
            configurable: true,
            writable: false,
            value: prototype.schema
          });

          Object.defineProperty(nested, documentSchemaSymbol, {
            enumerable: false,
            configurable: true,
            writable: false,
            value: prototype.schema
          });

          Object.defineProperty(nested, 'toObject', {
            enumerable: false,
            configurable: true,
            writable: false,
            value: function() {
              return utils.clone(_this.get(path, null, {
                virtuals: this &&
                  this.schema &&
                  this.schema.options &&
                  this.schema.options.toObject &&
                  this.schema.options.toObject.virtuals || null
              }));
            }
          });

          Object.defineProperty(nested, '$__get', {
            enumerable: false,
            configurable: true,
            writable: false,
            value: function() {
              return _this.get(path, null, {
                virtuals: this && this.schema && this.schema.options && this.schema.options.toObject && this.schema.options.toObject.virtuals || null
              });
            }
          });

          Object.defineProperty(nested, 'toJSON', {
            enumerable: false,
            configurable: true,
            writable: false,
            value: function() {
              return _this.get(path, null, {
                virtuals: this && this.schema && this.schema.options && this.schema.options.toJSON && this.schema.options.toJSON.virtuals || null
              });
            }
          });

          Object.defineProperty(nested, '$__isNested', {
            enumerable: false,
            configurable: true,
            writable: false,
            value: true
          });

          const _isEmptyOptions = Object.freeze({
            minimize: true,
            virtuals: false,
            getters: false,
            transform: false
          });
          Object.defineProperty(nested, '$isEmpty', {
            enumerable: false,
            configurable: true,
            writable: false,
            value: function() {
              return Object.keys(this.get(path, null, _isEmptyOptions) || {}).length === 0;
            }
          });

          Object.defineProperty(nested, '$__parent', {
            enumerable: false,
            configurable: true,
            writable: false,
            value: this
          });

          compile(subprops, nested, path, options);
          this.$__.getters[path] = nested;
        }

        return this.$__.getters[path];
      },
      set: function(v) {
        if (v != null && v.$__isNested) {
          // Convert top-level to POJO, but leave subdocs hydrated so `$set`
          // can handle them. See gh-9293.
          v = v.$__get();
        } else if (v instanceof Document && !v.$__isNested) {
          v = v.$toObject(internalToObjectOptions);
        }
        const doc = this.$__[scopeSymbol] || this;
        doc.$set(path, v);
      }
    });
  } else {
    Object.defineProperty(prototype, prop, {
      enumerable: true,
      configurable: true,
      get: function() {
        return this[getSymbol].call(this.$__[scopeSymbol] || this, path);
      },
      set: function(v) {
        this.$set.call(this.$__[scopeSymbol] || this, path, v);
      }
    });
  }
}

// gets descriptors for all properties of `object`
// makes all properties non-enumerable to match previous behavior to #2211
function getOwnPropertyDescriptors(object) {
  const result = {};

  Object.getOwnPropertyNames(object).forEach(function(key) {
    const skip = [
      'isNew',
      '$__',
      '$errors',
      'errors',
      '_doc',
      '$locals',
      '$op',
      '__parentArray',
      '__index',
      '$isDocumentArrayElement'
    ].indexOf(key) === -1;
    if (skip) {
      return;
    }

    result[key] = Object.getOwnPropertyDescriptor(object, key);
    result[key].enumerable = false;
  });

  return result;
}
