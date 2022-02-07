import { Schema, model, Document, Types, LeanDocument } from 'mongoose';
import { expectError } from 'tsd';

const schema: Schema = new Schema({ tags: [new Schema({ name: String })] });

interface Subdoc extends Document {
  name: string
}

interface ITest extends Document {
  tags: Types.DocumentArray<Subdoc>
}

const Test = model<ITest>('Test', schema);

void async function main() {
  const doc: ITest = await Test.findOne().orFail();

  doc.tags = new Types.DocumentArray<Subdoc>([]);
  doc.set('tags', []);

  const record: Subdoc = doc.tags.create({ name: 'test' });
  doc.tags.push(record);

  doc.tags.push({ name: 'test' });

  await doc.save();

  const _doc: LeanDocument<ITest> = await Test.findOne().orFail().lean();
  _doc.tags[0].name.substring(1);
  expectError(_doc.tags.create({ name: 'fail' }));
}();