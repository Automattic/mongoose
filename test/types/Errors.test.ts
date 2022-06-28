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

/**
 * gh-issue #11838
 *
 * @see https://github.com/Automattic/mongoose/issues/11838
 */
function gh11838() {
  const Model = mongoose.model('Test', new mongoose.Schema({ answer: Number }));
  const doc = new Model({ answer: 'not a number' });
  const err = doc.validateSync();

  err instanceof mongoose.Error;
  err instanceof mongoose.MongooseError;
  err instanceof mongoose.Error.ValidationError;
}
