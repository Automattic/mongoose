import { Schema, model, Document, LeanDocument } from 'mongoose';

const schema: Schema = new Schema({ name: { type: 'String' } });

class Subdoc extends Document {
  name: string;
}

interface ITestBase {
  name?: string;
  mixed?: any;
}

interface ITest extends ITestBase, Document {
  subdoc?: Subdoc;
  testMethod: () => number;
  id: string;
}

schema.method('testMethod', () => 42);

const Test = model<ITest>('Test', schema);

void async function main() {
  const doc: ITest = await Test.findOne().orFail();

  doc.subdoc = new Subdoc({ name: 'test' });
  doc.id = 'Hello';

  doc.testMethod();

  const pojo = doc.toObject();
  await pojo.save();

  const _doc: LeanDocument<ITest> = await Test.findOne().orFail().lean();
  await _doc.save();

  _doc.testMethod();
  _doc.name = 'test';
  _doc.mixed = 42;
  _doc.id = 'test2';
  console.log(_doc._id);

  const hydrated = Test.hydrate(_doc);
  await hydrated.save();

  const _docs: LeanDocument<ITest>[] = await Test.find().lean();
  _docs[0].mixed = 42;

  const _doc2: ITestBase = await Test.findOne().lean<ITestBase>();
}();