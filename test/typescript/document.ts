import { Schema, model, Document, Error } from 'mongoose';

const schema: Schema = new Schema({ name: { type: 'String', required: true }, address: new Schema({ city: { type: String, required: true } }) });

interface ITestBase {
  name?: string;
}

interface ITest extends ITestBase, Document {}

const Test = model<ITest>('Test', schema);

void async function main() {
  const doc: ITest = await Test.findOne().orFail();

  const p: Promise<ITest> = doc.remove();
  await p;
}();


void async function run() {
  const user = new Test({ name: {}, address: {} });
  const error = user.validateSync();
  if (error != null) {
    const _error: Error.ValidationError = error.errors.address as Error.ValidationError;
  }
}();

(function() {
  const test = new Test();
  test.validate({ pathsToSkip: ['hello'] });
  test.validate({ pathsToSkip: 'name age' });
  test.validateSync({ pathsToSkip: ['name', 'age'] });
  test.validateSync({ pathsToSkip: 'name age' });
})();