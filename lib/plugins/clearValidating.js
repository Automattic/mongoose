'use strict';

/*!
 * ignore
 */

module.exports = function(schema) {
  // `this.$__.validating` tracks whether there are multiple validations running
  // in parallel. We need to clear `this.$__.validating` before post hooks for gh-8597
  const unshift = true;
  schema.s.hooks.post('validate', false, function() {
    if (this.$__.isSubDocument) {
      return;
    }

    this.$__.validating = null;
  }, unshift);

  schema.s.hooks.post('validate', false, function(error, res, next) {
    if (this.$__.isSubDocument) {
      next();
      return;
    }

    this.$__.validating = null;
    next();
  }, unshift);
};
