import { Schema, model, Document, Types } from 'mongoose';

const schema: Schema = new Schema({ tags: [new Schema({ name: String })] });

interface Subdoc extends Document {
  name: string
}

interface ITest extends Document {
  tags: Types.DocumentArray<Subdoc>
}

const Test = model<ITest>('Test', schema);

void async function main() {
  const doc: ITest = await Test.findOne();

  doc.tags = new Types.DocumentArray<Subdoc>([]);
  doc.set('tags', []);

  const record: Subdoc = doc.tags.create({ name: 'test' });
  doc.tags.push(record);

  await doc.save();
}();