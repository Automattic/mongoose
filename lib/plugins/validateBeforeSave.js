'use strict';

/*!
 * ignore
 */

module.exports = function(schema) {
  schema.callQueue.unshift(['pre', ['save', function(next, options) {
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
      // HACK: use $__original_validate to avoid promises so bluebird doesn't
      // complain
      if (this.$__original_validate) {
        this.$__original_validate({__noPromise: true}, function(error) {
          return _this.schema.s.hooks.execPost('save:error', _this, [_this], { error: error }, function(error) {
            next(error);
          });
        });
      } else {
        this.validate({__noPromise: true}, function(error) {
          return _this.schema.s.hooks.execPost('save:error', _this, [ _this], { error: error }, function(error) {
            next(error);
          });
        });
      }
    } else {
      next();
    }
  }]]);
};
