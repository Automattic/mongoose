import { Schema, model, Document, Types } from 'mongoose';

const schema: Schema = new Schema({ name: { type: 'String' } });

interface ITest extends Document {
  _id?: Types.ObjectId,
  name?: string;
  mixed?: any;
  testMethod: () => number;
}

schema.method('testMethod', () => 42);

const Test = model<ITest>('Test', schema);

void async function main() {
  const doc: ITest = await Test.findOne();

  doc.testMethod();

  const pojo = doc.toObject();
  await pojo.save();

  const _doc = await Test.findOne().lean();
  await _doc.save();

  _doc.testMethod();
  _doc.name = 'test';
  _doc.mixed = 42;

  const hydrated = Test.hydrate(_doc);
  await hydrated.save();
}();