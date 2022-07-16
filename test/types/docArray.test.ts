import { Schema, model, Document, Types, LeanDocument } from 'mongoose';
import { expectError, expectType } from 'tsd';

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

// https://github.com/Automattic/mongoose/issues/10293
async function gh10293() {
  interface ITest {
    name: string;
    arrayOfArray: Types.Array<string[]>; // <-- Array of Array
  }

  const testSchema = new Schema<ITest>({
    name: {
      type: String,
      required: true
    },
    arrayOfArray: [[String]]
  });

  const TestModel = model('gh10293TestModel', testSchema);

  testSchema.methods.getArrayOfArray = function(this: InstanceType<typeof TestModel>): string[][] { // <-- function to return Array of Array
    const test = this.toObject();

    expectType<string[][]>(test.arrayOfArray);
    return test.arrayOfArray; // <-- error here if the issue persisted
  };
}
