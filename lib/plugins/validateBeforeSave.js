'use strict';

/*!
 * ignore
 */

module.exports = function(schema) {
  const unshift = true;
  schema.pre('save', false, function(next, options) {
    var _this = this;
    // Nested docs have their own presave
    if (this.ownerDocument) {
      return next();
    }

    var hasValidateBeforeSaveOption = options &&
        (typeof options === 'object') &&
        ('validateBeforeSave' in options);

    var shouldValidate;
    if (hasValidateBeforeSaveOption) {
      shouldValidate = !!options.validateBeforeSave;
    } else {
      shouldValidate = this.schema.options.validateBeforeSave;
    }

    // Validate
    if (shouldValidate) {
      this.validate(function(error) {
        return _this.schema.s.hooks.execPost('save:error', _this, [ _this], { error: error }, function(error) {
          next(error);
        });
      });
    } else {
      next();
    }
  }, null, unshift);
};
