import { Schema, model, InferSchemaType, InferRawDocType, Types } from 'mongoose';
import { expect } from 'tstyche';

function inferredSetPaths() {
  const schema = new Schema({
    tags: { type: Set, of: String },
    ids: { type: 'Set', of: Schema.Types.ObjectId },
    nums: { type: Schema.Types.Set, of: Number, required: true }
  });

  type Doc = InferSchemaType<typeof schema>;
  expect<Doc['tags']>().type.toBe<Set<string> | null | undefined>();
  expect<Doc['ids']>().type.toBe<Set<Types.ObjectId> | null | undefined>();
  expect<Doc['nums']>().type.toBe<Set<number>>();

  const TestModel = model('Test', schema);
  const doc = new TestModel();
  expect(doc.nums).type.toBe<Set<number>>();
  doc.nums.add(42);
}

function rawSetPaths() {
  const schemaDefinition = {
    tags: { type: Set, of: String, required: true }
  } as const;

  expect<InferRawDocType<typeof schemaDefinition>['tags']>().type.toBe<string[]>();
}

function explicitSetPaths() {
  interface ITest {
    tags: Set<string>;
  }

  const schema = new Schema<ITest>({ tags: { type: Set, of: String } });
  const TestModel = model<ITest>('Test', schema);
  const doc = new TestModel({ tags: new Set(['a']) });
  doc.tags.add('b');
}

function mongooseSet() {
  const set = new Types.Set<string>();
  expect(set.toObject()).type.toBe<string[]>();
  expect(set.toJSON()).type.toBe<string[]>();
  expect(set.$isMongooseSet).type.toBe<true>();
}

async function leanSetPaths() {
  const schema = new Schema({ tags: { type: Set, of: String, required: true } });
  const TestModel = model('Test', schema);

  const doc = await TestModel.findOne().orFail().lean();
  expect(doc.tags).type.toBe<string[]>();
}
