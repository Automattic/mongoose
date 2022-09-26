'use strict';

/*!
 * ignore
 */

module.exports = function clearValidating(schema) {
  // `this.$__.validating` tracks whether there are multiple validations running
  // in parallel. We need to clear `this.$__.validating` before post hooks for gh-8597
  const unshift = true;
  schema.s.hooks.post('validate', false, function clearValidatingPostValidate() {
    if (this.$isSubdocument) {
      return;
    }

    this.$__.validating = null;
  }, unshift);

  schema.s.hooks.post('validate', false, function clearValidatingPostValidateError(error, res, next) {
    if (this.$isSubdocument) {
      next();
      return;
    }

    this.$__.validating = null;
    next();
  }, unshift);
};
