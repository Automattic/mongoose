import { Schema, model, Document, Types } from 'mongoose';

const schema: Schema = new Schema({ name: { type: 'String' } });

interface ITest extends Document {
  _id?: Types.ObjectId,
  name?: string;
}

const Test = model<ITest>('Test', schema);

void async function main() {
  const doc: ITest = await Test.findOne();

  const pojo = doc.toObject();
  await pojo.save();

  const _doc = await Test.findOne().lean();
  await _doc.save();

  const hydrated = Test.hydrate(_doc);
  await hydrated.save();
}();