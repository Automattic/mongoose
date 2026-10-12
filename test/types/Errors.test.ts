import * as mongoose from 'mongoose';

/**
 * gh-issue #11367
 *
 * @see https://github.com/Automattic/mongoose/issues/11367
 */
function handleValidationError(err: mongoose.Error.ValidationError): Array<string> {
  const errorTypes = Object.keys(err.errors).map((field: string) => err.errors[field].kind);
  return errorTypes;
}
