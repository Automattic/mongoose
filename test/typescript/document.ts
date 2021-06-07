import { Schema, model, Document } from 'mongoose';

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
  user.validateSync();
}();