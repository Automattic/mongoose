'use strict';

/*!
 * Register methods for this model
 *
 * @param {Model} model
 * @param {Schema} schema
 */

module.exports = function applyMethods(model, schema) {
  function apply(method, schema) {
    Object.defineProperty(model.prototype, method, {
      get: function() {
        var h = {};
        for (var k in schema.methods[method]) {
          h[k] = schema.methods[method][k].bind(this);
        }
        return h;
      },
      configurable: true
    });
  }
  for (var method in schema.methods) {
    if (schema.tree.hasOwnProperty(method)) {
      throw new Error('You have a method and a property in your schema both ' +
        'named "' + method + '"');
    }
    if (typeof schema.methods[method] === 'function') {
      model.prototype[method] = schema.methods[method];
    } else {
      apply(method, schema);
    }
  }
};
