import { Schema, model, Document } from 'mongoose';

const schema: Schema = new Schema({ name: { type: 'String' } });

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