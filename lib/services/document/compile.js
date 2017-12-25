'use strict';

var Document;
var utils = require('../../utils');

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
  var keys = Object.keys(tree);
  var i = keys.length;
  var len = keys.length;
  var limb;
  var key;

  for (i = 0; i < len; ++i) {
    key = keys[i];
    limb = tree[key];

    defineKey(key,
        ((utils.getFunctionName(limb.constructor) === 'Object'
        && Object.keys(limb).length)
        && (!limb[options.typeKey] || (options.typeKey === 'type' && limb.type.type))
            ? limb
            : null)
        , proto
        , prefix
        , keys
        , options);
  }
}

/*!
 * Defines the accessor named prop on the incoming prototype.
 */

function defineKey(prop, subprops, prototype, prefix, keys, options) {
  Document = Document || require('../../document');
  var path = (prefix ? prefix + '.' : '') + prop;
  prefix = prefix || '';

  if (subprops) {
    Object.defineProperty(prototype, prop, {
      enumerable: true,
      configurable: true,
      get: function() {
        var _this = this;
        if (!this.$__.getters) {
          this.$__.getters = {};
        }

        if (!this.$__.getters[path]) {
          var nested = Object.create(Document.prototype, getOwnPropertyDescriptors(this));

          // save scope for nested getters/setters
          if (!prefix) {
            nested.$__.scope = this;
          }
          nested.$__.nestedPath = path;

          Object.defineProperty(nested, 'schema', {
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
              return utils.clone(_this.get(path));
            }
          });

          Object.defineProperty(nested, 'toJSON', {
            enumerable: false,
            configurable: true,
            writable: false,
            value: function() {
              return _this.get(path);
            }
          });

          Object.defineProperty(nested, '$__isNested', {
            enumerable: false,
            configurable: true,
            writable: false,
            value: true
          });

          compile(subprops, nested, path, options);
          this.$__.getters[path] = nested;
        }

        return this.$__.getters[path];
      },
      set: function(v) {
        if (v instanceof Document) {
          v = v.toObject({ transform: false });
        }
        var doc = this.$__.scope || this;
        return doc.$set(path, v);
      }
    });
  } else {
    Object.defineProperty(prototype, prop, {
      enumerable: true,
      configurable: true,
      get: function() {
        return this.get.call(this.$__.scope || this, path);
      },
      set: function(v) {
        return this.$set.call(this.$__.scope || this, path, v);
      }
    });
  }
}

// gets descriptors for all properties of `object`
// makes all properties non-enumerable to match previous behavior to #2211
function getOwnPropertyDescriptors(object) {
  var result = {};

  Object.getOwnPropertyNames(object).forEach(function(key) {
    result[key] = Object.getOwnPropertyDescriptor(object, key);
    // Assume these are schema paths, ignore them re: #5470
    if (result[key].get) {
      delete result[key];
      return;
    }
    result[key].enumerable = ['isNew', '$__', 'errors', '_doc'].indexOf(key) === -1;
  });

  return result;
}
