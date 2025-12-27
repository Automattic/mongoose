import mongoose, { Schema, model, Types, HydratedDocument } from 'mongoose';
import { ExpectType } from './helpers';

const schema = new Schema({ name: { type: 'String' } });

interface ITest {
  _id?: Types.ObjectId;
  name: string;
}

const Test = model<ITest>('Test', schema);

Test.create({ _id: '000000000000000000000000', name: 'test' }).then(doc => {
  ExpectType<Types.ObjectId>()(doc._id);
  ExpectType<string>()(doc.name);
  ExpectType<boolean>()(doc.isNew);
});

Test.create({ _id: new Types.ObjectId('000000000000000000000000'), name: 'test' }).then((doc) => {
  ExpectType<Types.ObjectId>()(doc._id);
  ExpectType<string>()(doc.name);
  ExpectType<boolean>()(doc.isNew);
});

Test.create([{ name: 'test' }], { validateBeforeSave: false }).then(docs => {
  ExpectType<Types.ObjectId>()(docs[0]._id);
  ExpectType<string>()(docs[0].name);
  ExpectType<boolean>()(docs[0].isNew);
});

Test.create({ name: 'test' }, { name: 'test2' }).then(docs => {
  ExpectType<Types.ObjectId>()(docs[0]._id);
  ExpectType<string>()(docs[0].name);
  ExpectType<Types.ObjectId>()(docs[1]._id);
  ExpectType<string>()(docs[1].name);
});

Test.create([{ name: 'test' }], { validateBeforeSave: true }).then(docs => {
  ExpectType<Types.ObjectId>()(docs[0]._id);
  ExpectType<string>()(docs[0].name);
});

Test.create({}).then(doc => {
  ExpectType<string>()(doc.name);
});

Test.create([{}]).then(docs => {
  ExpectType<string>()(docs[0].name);
});

Test.create({ name: 'test' });
Test.create({ _id: new Types.ObjectId('0'.repeat(24)), name: 'test' });

Test.insertMany({ name: 'test' }, {}).then(docs => {
  ExpectType<Types.ObjectId>()(docs[0]._id);
  ExpectType<string>()(docs[0].name);
  ExpectType<boolean>()(docs[0].isNew);
});

Test.insertMany({ name: 'test' }, { lean: true }).then(docs => {
  ExpectType<Types.ObjectId>()(docs[0]._id);
  ExpectType<string>()(docs[0].name);
  // @ts-expect-error should not be defined on lean doc
  docs[0].isNew;
});

Test.insertMany({ name: 'test' }).then(docs => {
  ExpectType<Types.ObjectId>()(docs[0]._id);
  ExpectType<string>()(docs[0].name);
  ExpectType<boolean>()(docs[0].isNew);
});

Test.insertMany({ name: 'test' }, {}).then(docs => {
  ExpectType<Types.ObjectId>()(docs[0]._id);
  ExpectType<string>()(docs[0].name);
  ExpectType<boolean>()(docs[0].isNew);
});

Test.insertMany([{ name: 'test' }], { rawResult: true }).then(result => {
  ExpectType<boolean>()(result.acknowledged);
  ExpectType<number>()(result.insertedCount);
  ExpectType<{ [key: number]: Types.ObjectId; }>()(result.insertedIds);
});

Test.insertMany([{ name: 'test' }], { rawResult: true }).then(result => {
  ExpectType<boolean>()(result.acknowledged);
  ExpectType<number>()(result.insertedCount);
  ExpectType<{ [key: number]: Types.ObjectId; }>()(result.insertedIds);
});

Test.insertMany([{ name: 'test' }], { lean: true }).then(docs => {
  ExpectType<Types.ObjectId>()(docs[0]._id);
  ExpectType<string>()(docs[0].name);
  // @ts-expect-error should not be defined on lean doc
  docs[0].isNew;
});

Test.insertMany([{ name: 'test' }], { lean: false }).then(docs => {
  ExpectType<Types.ObjectId>()(docs[0]._id);
  ExpectType<string>()(docs[0].name);
  ExpectType<boolean>()(docs[0].isNew);
});

Test.insertMany([{ name: 'test' }], { }).then(docs => {
  ExpectType<Types.ObjectId>()(docs[0]._id);
  ExpectType<string>()(docs[0].name);
  ExpectType<boolean>()(docs[0].isNew);
});

Test.insertMany([{ name: 'test' }]).then(docs => {
  ExpectType<Types.ObjectId>()(docs[0]._id);
  ExpectType<string>()(docs[0].name);
  ExpectType<boolean>()(docs[0].isNew);
});

Test.insertMany({ _id: '000000000000000000000000', name: 'test' }).then(docs => {
  ExpectType<Types.ObjectId>()(docs[0]._id);
  ExpectType<string>()(docs[0].name);
  ExpectType<boolean>()(docs[0].isNew);
});

Test.insertMany({ _id: new Types.ObjectId('000000000000000000000000'), name: 'test' }).then(docs => {
  ExpectType<Types.ObjectId>()(docs[0]._id);
  ExpectType<string>()(docs[0].name);
  ExpectType<boolean>()(docs[0].isNew);
});

(async() => {
  const [t1] = await Test.create([{ name: 'test' }]);
  const [t2, t3, t4] = await Test.create({ name: 'test' }, { name: 'test' }, { name: 'test' });
  (await Test.create([{ name: 'test' }]))[0];
  (await Test.create({ name: 'test' }))._id;
})();

async function createWithAggregateErrors() {
  ExpectType<(HydratedDocument<ITest>)[]>()(await Test.create([{}]));
  ExpectType<(HydratedDocument<ITest> | Error)[]>()(await Test.create([{}], { aggregateErrors: true }));
}

async function createWithSubdoc() {
  const schema = new Schema({ name: String, registeredAt: Date, subdoc: new Schema({ prop: { type: String, required: true } }) });
  const TestModel = model('Test', schema);
  const doc = await TestModel.create({ name: 'test', registeredAt: '2022-06-01', subdoc: { prop: 'value' } });
  ExpectType<string | null | undefined>()(doc.name);
  ExpectType<Date | null | undefined>()(doc.registeredAt);
  ExpectType<string>()(doc.subdoc!.prop);
}

async function createWithDocArray() {
  const schema = new Schema({ name: String, subdocs: [new Schema({ prop: { type: String, required: true } })] });
  const TestModel = model('Test', schema);
  const doc = await TestModel.create({ name: 'test', subdocs: [{ prop: 'value' }] });
  ExpectType<string | null | undefined>()(doc.name);
  ExpectType<string>()(doc.subdocs[0].prop);
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
  ExpectType<string | null | undefined>()(doc.name);
  ExpectType<string>()(doc.subdocMap!.get('taco')!.prop);

  const doc2 = await TestModel.create({ name: 'test', subdocMap: [['taco', { prop: 'beef' }]] });
  ExpectType<string | null | undefined>()(doc2.name);
  ExpectType<string>()(doc2.subdocMap!.get('taco')!.prop);
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
  ExpectType<string | null | undefined>()(doc.name);
  ExpectType<string>()(doc.subdoc!.prop);
  ExpectType<string>()(doc.subdoc!.otherProp);
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
  ExpectType<string>()(doc.name);
  ExpectType<Types.ObjectId>()(doc._id);

  const doc2 = await TestModel.create({ name: 'test', _id: new Types.ObjectId() });
  ExpectType<string>()(doc2.name);
  ExpectType<Types.ObjectId>()(doc2._id);
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
