'use strict';

/*!
 * ignore
 */

module.exports = function validateBeforeSave(schema) {
  const unshift = true;
  schema.pre('save', false, async function validateBeforeSave(options) {
    // Nested docs have their own presave
    if (this.$isSubdocument) {
      return;
    }

    const hasValidateBeforeSaveOption = options &&
        (typeof options === 'object') &&
        ('validateBeforeSave' in options);

    let shouldValidate;
    if (hasValidateBeforeSaveOption) {
      shouldValidate = !!options.validateBeforeSave;
    } else {
      shouldValidate = this.$__schema.options.validateBeforeSave;
    }

    // Validate
    if (shouldValidate) {
      const hasValidateModifiedOnlyOption = options &&
          (typeof options === 'object') &&
          ('validateModifiedOnly' in options);
      const validateOptions = hasValidateModifiedOnlyOption ?
        { validateModifiedOnly: options.validateModifiedOnly } :
        null;
      await this.$validate(validateOptions).then(
        () => {
          this.$op = 'save';
        }
      );
    }
  }, null, unshift);
};
