'use strict';

const documentSchemaSymbol = require('../../helpers/symbols').documentSchemaSymbol;
const get = require('../../helpers/get');
const internalToObjectOptions = require('../../options').internalToObjectOptions;
const utils = require('../../utils');

let Document;
const getSymbol = require('../../helpers/symbols').getSymbol;
const scopeSymbol = require('../../helpers/symbols').scopeSymbol;

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
  const keys = Object.keys(tree);
  const len = keys.length;
  let limb;
  let key;

  for (let i = 0; i < len; ++i) {
    key = keys[i];
    limb = tree[key];

    const hasSubprops = utils.isPOJO(limb) && Object.keys(limb).length &&
      (!limb[options.typeKey] || (options.typeKey === 'type' && limb.type.type));
    const subprops = hasSubprops ? limb : null;

    defineKey(key, subprops, proto, prefix, keys, options);
  }
}

/*!
 * Defines the accessor named prop on the incoming prototype.
 */

function defineKey(prop, subprops, prototype, prefix, keys, options) {
  Document = Document || require('../../document');
  const path = (prefix ? prefix + '.' : '') + prop;
  prefix = prefix || '';

  if (subprops) {
    const nested = Object.create(Document.prototype, {
      $__: { writable: true, enumerable: false, value: void 0 },
      isNew: { writable: true, enumerable: false, value: true },
      errors: { writable: true, enumerable: false, value: void 0 },
      $locals: { writable: true, enumerable: false, value: {} },
      $op: { writable: true, enumerable: false, value: null },
      _doc: { writable: true, enumerable: false, value: void 0 },
      schema: { writable: true, enumerable: false, value: void 0, configurable: true },
      $__schema: { writable: true, enumerable: false, value: void 0 },
      documentSchemaSymbol: { writable: true, enumerable: false, value: void 0 }
    });

    Object.defineProperty(nested, 'toObject', {
      enumerable: false,
      configurable: true,
      writable: false,
      value: function() {
        return utils.clone(this.get(path, null, {
          virtuals: get(this, 'schema.options.toObject.virtuals', null)
        }));
      }
    });

    Object.defineProperty(nested, '$__get', {
      enumerable: false,
      configurable: true,
      writable: false,
      value: function() {
        return this.get(path, null, {
          virtuals: get(this, 'schema.options.toObject.virtuals', null)
        });
      }
    });

    Object.defineProperty(nested, 'toJSON', {
      enumerable: false,
      configurable: true,
      writable: false,
      value: function() {
        return this.get(path, null, {
          virtuals: get(this, 'schema.options.toJSON.virtuals', null)
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
      writable: true,
      value: void 0
    });

    compile(subprops, nested, path, options);
    const _compiledSubprops = Object.keys(subprops);

    Object.defineProperty(prototype, prop, {
      enumerable: true,
      configurable: true,
      get: function() {
        if (!this.$__.getters) {
          this.$__.getters = {};
        }

        if (!this.$__.getters[path]) {
          nested.$__ = this.$__;
          nested.isNew = this.isNew;
          nested.errors = this.errors;
          nested.$locals = this.$locals;
          nested.$op = this.$op;
          nested._doc = this._doc;

          nested.$__schema = nested[documentSchemaSymbol] = prototype.schema;
          if (!subprops.hasOwnProperty('schema')) {
            nested.schema = prototype.schema;
          }
          nested.$__parent = this;
          // save scope for nested getters/setters
          if (!prefix) {
            nested.$__[scopeSymbol] = this;
          }
          nested.$__.nestedPath = path;

          // Added extra subprops between compilation and access? Add them.
          // This allows adding virtuals after compiling the schema (re: #10275)
          if (Object.keys(subprops).length !== _compiledSubprops.length) {
            compile(subprops, nested, path, options);
          }

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
          v = v.toObject(internalToObjectOptions);
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