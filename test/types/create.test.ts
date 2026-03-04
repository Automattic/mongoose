import mongoose, { Schema, model, Types, HydratedDocument } from 'mongoose';
import { expect } from 'tstyche';

const schema = new Schema({ name: { type: 'String' } });

interface ITest {
  _id?: Types.ObjectId;
  name: string;
}

const Test = model<ITest>('Test', schema);

Test.create({ _id: '000000000000000000000000', name: 'test' }).then(doc => {
  expect(doc._id).type.toBe<Types.ObjectId>();
  expect(doc.name).type.toBe<string>();
  expect(doc.isNew).type.toBe<boolean>();
});

Test.create({ _id: new Types.ObjectId('000000000000000000000000'), name: 'test' }).then((doc) => {
  expect(doc._id).type.toBe<Types.ObjectId>();
  expect(doc.name).type.toBe<string>();
  expect(doc.isNew).type.toBe<boolean>();
});

Test.create([{ name: 'test' }], { validateBeforeSave: false }).then(docs => {
  expect(docs[0]._id).type.toBe<Types.ObjectId>();
  expect(docs[0].name).type.toBe<string>();
  expect(docs[0].isNew).type.toBe<boolean>();
});

Test.create({ name: 'test' }, { name: 'test2' }).then(docs => {
  expect(docs[0]._id).type.toBe<Types.ObjectId>();
  expect(docs[0].name).type.toBe<string>();
  expect(docs[1]._id).type.toBe<Types.ObjectId>();
  expect(docs[1].name).type.toBe<string>();
});

Test.create([{ name: 'test' }], { validateBeforeSave: true }).then(docs => {
  expect(docs[0]._id).type.toBe<Types.ObjectId>();
  expect(docs[0].name).type.toBe<string>();
});

Test.create({}).then(doc => {
  expect(doc.name).type.toBe<string>();
});

Test.create([{}]).then(docs => {
  expect(docs[0].name).type.toBe<string>();
});

Test.create({ name: 'test' });
Test.create({ _id: new Types.ObjectId('0'.repeat(24)), name: 'test' });

Test.insertMany({ name: 'test' }, {}).then(docs => {
  expect(docs[0]._id).type.toBe<Types.ObjectId>();
  expect(docs[0].name).type.toBe<string>();
  expect(docs[0].isNew).type.toBe<boolean>();
});

Test.insertMany({ name: 'test' }, { lean: true }).then(docs => {
  expect(docs[0]._id).type.toBe<Types.ObjectId>();
  expect(docs[0].name).type.toBe<string>();
  expect(docs[0]).type.not.toHaveProperty("isNew");
});

Test.insertMany({ name: 'test' }).then(docs => {
  expect(docs[0]._id).type.toBe<Types.ObjectId>();
  expect(docs[0].name).type.toBe<string>();
  expect(docs[0].isNew).type.toBe<boolean>();
});

Test.insertMany({ name: 'test' }, {}).then(docs => {
  expect(docs[0]._id).type.toBe<Types.ObjectId>();
  expect(docs[0].name).type.toBe<string>();
  expect(docs[0].isNew).type.toBe<boolean>();
});

Test.insertMany([{ name: 'test' }], { rawResult: true }).then(result => {
  expect(result.acknowledged).type.toBe<boolean>();
  expect(result.insertedCount).type.toBe<number>();
  expect(result.insertedIds).type.toBe<{ [key: number]: Types.ObjectId; }>();
});

Test.insertMany([{ name: 'test' }], { rawResult: true }).then(result => {
  expect(result.acknowledged).type.toBe<boolean>();
  expect(result.insertedCount).type.toBe<number>();
  expect(result.insertedIds).type.toBe<{ [key: number]: Types.ObjectId; }>();
});

Test.insertMany([{ name: 'test' }], { lean: true }).then(docs => {
  expect(docs[0]._id).type.toBe<Types.ObjectId>();
  expect(docs[0].name).type.toBe<string>();
  expect(docs[0]).type.not.toHaveProperty("isNew");
});

Test.insertMany([{ name: 'test' }], { lean: false }).then(docs => {
  expect(docs[0]._id).type.toBe<Types.ObjectId>();
  expect(docs[0].name).type.toBe<string>();
  expect(docs[0].isNew).type.toBe<boolean>();
});

Test.insertMany([{ name: 'test' }], { }).then(docs => {
  expect(docs[0]._id).type.toBe<Types.ObjectId>();
  expect(docs[0].name).type.toBe<string>();
  expect(docs[0].isNew).type.toBe<boolean>();
});

Test.insertMany([{ name: 'test' }]).then(docs => {
  expect(docs[0]._id).type.toBe<Types.ObjectId>();
  expect(docs[0].name).type.toBe<string>();
  expect(docs[0].isNew).type.toBe<boolean>();
});

Test.insertMany({ _id: '000000000000000000000000', name: 'test' }).then(docs => {
  expect(docs[0]._id).type.toBe<Types.ObjectId>();
  expect(docs[0].name).type.toBe<string>();
  expect(docs[0].isNew).type.toBe<boolean>();
});

Test.insertMany({ _id: new Types.ObjectId('000000000000000000000000'), name: 'test' }).then(docs => {
  expect(docs[0]._id).type.toBe<Types.ObjectId>();
  expect(docs[0].name).type.toBe<string>();
  expect(docs[0].isNew).type.toBe<boolean>();
});

(async() => {
  const [t1] = await Test.create([{ name: 'test' }]);
  const [t2, t3, t4] = await Test.create({ name: 'test' }, { name: 'test' }, { name: 'test' });
  (await Test.create([{ name: 'test' }]))[0];
  (await Test.create({ name: 'test' }))._id;
})();

async function createWithAggregateErrors() {
  expect(await Test.create([{}])).type.toBe<(HydratedDocument<ITest>)[]>();
  expect(await Test.create([{}], { aggregateErrors: true })).type.toBe<(HydratedDocument<ITest> | Error)[]>();
}

async function createWithSubdoc() {
  const schema = new Schema({ name: String, registeredAt: Date, subdoc: new Schema({ prop: { type: String, required: true } }) });
  const TestModel = model('Test', schema);
  const doc = await TestModel.create({ name: 'test', registeredAt: '2022-06-01', subdoc: { prop: 'value' } });
  expect(doc.name).type.toBe<string | null | undefined>();
  expect(doc.registeredAt).type.toBe<Date | null | undefined>();
  expect(doc.subdoc!.prop).type.toBe<string>();
}

async function createWithDocArray() {
  const schema = new Schema({ name: String, subdocs: [new Schema({ prop: { type: String, required: true } })] });
  const TestModel = model('Test', schema);
  const doc = await TestModel.create({ name: 'test', subdocs: [{ prop: 'value' }] });
  expect(doc.name).type.toBe<string | null | undefined>();
  expect(doc.subdocs[0].prop).type.toBe<string>();
}

async function createWithMapOfSubdocs() {
  const schema = new Schema({
    name: String,
    subdocMap: {
      type: Map,
      of: new Schema({ prop: { type: String, required: true } })
    }
  });
  const TestModel = model('Test', schema);

  const doc = await TestModel.create({ name: 'test', subdocMap: { taco: { prop: 'beef' } } });
  expect(doc.name).type.toBe<string | null | undefined>();
  expect(doc.subdocMap!.get('taco')!.prop).type.toBe<string>();

  const doc2 = await TestModel.create({ name: 'test', subdocMap: [['taco', { prop: 'beef' }]] });
  expect(doc2.name).type.toBe<string | null | undefined>();
  expect(doc2.subdocMap!.get('taco')!.prop).type.toBe<string>();
}

async function createWithSubdocs() {
  const schema = new Schema({
    name: String,
    subdoc: new Schema({
      prop: { type: String, required: true },
      otherProp: { type: String, required: true }
    })
  });
  const TestModel = model('Test', schema);

  const doc = await TestModel.create({ name: 'test', subdoc: { prop: 'test 1' } });
  expect(doc.name).type.toBe<string | null | undefined>();
  expect(doc.subdoc!.prop).type.toBe<string>();
  expect(doc.subdoc!.otherProp).type.toBe<string>();
}

async function createWithRawDocTypeNo_id() {
  interface RawDocType {
    name: string;
    registeredAt: Date;
  }

  const schema = new Schema<RawDocType>({
    name: String,
    registeredAt: Date
  });
  const TestModel = model<RawDocType>('Test', schema);

  const doc = await TestModel.create({ _id: '0'.repeat(24), name: 'test' });
  expect(doc.name).type.toBe<string>();
  expect(doc._id).type.toBe<Types.ObjectId>();

  const doc2 = await TestModel.create({ name: 'test', _id: new Types.ObjectId() });
  expect(doc2.name).type.toBe<string>();
  expect(doc2._id).type.toBe<Types.ObjectId>();
}

createWithAggregateErrors();

async function gh15902() {
  class ProviderMongoDbMongooseImpl<K extends Record<string, unknown>> {
    public constructor(
      private readonly model: mongoose.Model<K>
    ) {}

    public async createOne(resource: K): Promise<K> {
      const doc = await this.model.create(resource);
      return doc.toObject() as K;
    }
  }
}

function gh16012() {
  interface IDecimal {
    base: number;
    exponent: number;
  }

  interface IDecimalVirtuals {
    value: number;
  }

  type DecimalInstance = mongoose.HydratedSingleSubdocument<IDecimal, IDecimalVirtuals>;
  type DecimalModelType = mongoose.Model<IDecimal, {}, {}, IDecimalVirtuals, DecimalInstance>;
  type DecimalSchemaOptions = mongoose.SchemaOptions<
    IDecimal,
    {},
    {},
    {},
    IDecimalVirtuals,
    DecimalInstance,
    DecimalModelType
  >;

  const decimalSchema = new mongoose.Schema<
    IDecimal,
    DecimalModelType,
    {},
    {},
    IDecimalVirtuals,
    {},
    DecimalSchemaOptions,
    IDecimal,
    DecimalInstance
  >({
    base: Number,
    exponent: Number
  }, {
    _id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  });

  decimalSchema.virtual('value').set((value: number, _virtual, doc) => doc.set({ base: value, exponent: 1 }));

  const ParentModel = mongoose.model('Gh16012', new mongoose.Schema({
    quantity: decimalSchema
  }));

  // Any type ok for unknown fields - strict mode strips them out unless virtual
  ParentModel.create({ quantity: { value: 10 } });
  ParentModel.create({ quantity: { value: '10' } });

  // type must match for known fields
  ParentModel.create({ quantity: { exponent: 10 } });
  ParentModel.create({ quantity: { base: 10 } });
  expect(ParentModel.create).type.not.toBeCallableWith({ quantity: { exponent: '10' } });
  expect(ParentModel.create).type.not.toBeCallableWith({ quantity: { base: '10' } });
}
