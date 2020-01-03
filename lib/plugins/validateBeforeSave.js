'use strict';

/*!
 * ignore
 */

module.exports = function(schema) {
  const unshift = true;
  schema.pre('save', false, function validateBeforeSave(next, options) {
    const _this = this;
    // Nested docs have their own presave
    if (this.ownerDocument) {
      return next();
    }

    const hasValidateBeforeSaveOption = options &&
        (typeof options === 'object') &&
        ('validateBeforeSave' in options);

    let shouldValidate;
    if (hasValidateBeforeSaveOption) {
      shouldValidate = !!options.validateBeforeSave;
    } else {
      shouldValidate = this.schema.options.validateBeforeSave;
    }

    // Validate
    if (shouldValidate) {
      const hasValidateModifiedOnlyOption = options &&
          (typeof options === 'object') &&
          ('validateModifiedOnly' in options);
      const validateOptions = hasValidateModifiedOnlyOption ?
        {validateModifiedOnly: options.validateModifiedOnly} :
        null;
      this.validate(validateOptions, function(error) {
        return _this.schema.s.hooks.execPost('save:error', _this, [ _this], { error: error }, function(error) {
          next(error);
        });
      });
    } else {
      next();
    }
  }, null, unshift);
};
