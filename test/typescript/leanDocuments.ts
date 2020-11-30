import { Schema, model, Document, Types } from 'mongoose';

const schema: Schema = new Schema({ name: { type: 'String' } });

class Subdoc extends Document {
  name: string;
}

interface ITest extends Document {
  _id?: Types.ObjectId,
  name?: string;
  mixed?: any;
  subdoc?: Subdoc;
  testMethod: () => number;
}

schema.method('testMethod', () => 42);

const Test = model<ITest>('Test', schema);

void async function main() {
  const doc: ITest = await Test.findOne();

  doc.subdoc = new Subdoc({ name: 'test' });
  doc.id = 'Hello';

  doc.testMethod();

  const pojo = doc.toObject();
  await pojo.save();

  const _doc = await Test.findOne().lean();
  await _doc.save();

  _doc.testMethod();
  _doc.subdoc.toObject();
  _doc.name = 'test';
  _doc.mixed = 42;

  const hydrated = Test.hydrate(_doc);
  await hydrated.save();
}();