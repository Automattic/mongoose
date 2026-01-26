'use strict';

const symbols = require('../schema/symbols');

/*!
 * ignore
 */

module.exports = function validateBeforeSave(schema) {
  const unshift = true;
  schema.pre('save', false, validateBeforeSavePreSave, null, unshift);
};

async function validateBeforeSavePreSave(options) {
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
}

validateBeforeSavePreSave[symbols.builtInMiddleware] = true;
