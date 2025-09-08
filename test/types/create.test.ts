import { Schema, model, Types, HydratedDocument } from 'mongoose';
import { expectError, expectType } from 'tsd';

const schema = new Schema({ name: { type: 'String' } });

interface ITest {
  _id?: Types.ObjectId;
  name: string;
}

const Test = model<ITest>('Test', schema);

Test.create({ _id: '000000000000000000000000', name: 'test' }).then(doc => {
  expectType<Types.ObjectId>(doc._id);
  expectType<string>(doc.name);
  expectType<boolean>(doc.isNew);
});

Test.create({ _id: new Types.ObjectId('000000000000000000000000'), name: 'test' }).then((doc) => {
  expectType<Types.ObjectId>(doc._id);
  expectType<string>(doc.name);
  expectType<boolean>(doc.isNew);
});

Test.create([{ name: 'test' }], { validateBeforeSave: false }).then(docs => {
  expectType<Types.ObjectId>(docs[0]._id);
  expectType<string>(docs[0].name);
  expectType<boolean>(docs[0].isNew);
});

Test.create({ name: 'test' }, { name: 'test2' }).then(docs => {
  expectType<Types.ObjectId>(docs[0]._id);
  expectType<string>(docs[0].name);
  expectType<Types.ObjectId>(docs[1]._id);
  expectType<string>(docs[1].name);
});

Test.create([{ name: 'test' }], { validateBeforeSave: true }).then(docs => {
  expectType<Types.ObjectId>(docs[0]._id);
  expectType<string>(docs[0].name);
});

Test.create({}).then(doc => {
  expectType<string>(doc.name);
});

Test.create([{}]).then(docs => {
  expectType<string>(docs[0].name);
});

Test.create({ name: 'test' });
Test.create({ _id: new Types.ObjectId('0'.repeat(24)), name: 'test' });

Test.insertMany({ name: 'test' }, {}).then(docs => {
  expectType<Types.ObjectId>(docs[0]._id);
  expectType<string>(docs[0].name);
  expectType<boolean>(docs[0].isNew);
});

Test.insertMany({ name: 'test' }, { lean: true }).then(docs => {
  expectType<Types.ObjectId>(docs[0]._id);
  expectType<string>(docs[0].name);
  expectError(docs[0].isNew);
});

Test.insertMany({ name: 'test' }).then(docs => {
  expectType<Types.ObjectId>(docs[0]._id);
  expectType<string>(docs[0].name);
  expectType<boolean>(docs[0].isNew);
});

Test.insertMany({ name: 'test' }, {}).then(docs => {
  expectType<Types.ObjectId>(docs[0]._id);
  expectType<string>(docs[0].name);
  expectType<boolean>(docs[0].isNew);
});

Test.insertMany([{ name: 'test' }], { rawResult: true }).then(result => {
  expectType<boolean>(result.acknowledged);
  expectType<number>(result.insertedCount);
  expectType<{ [key: number]: Types.ObjectId; }>(result.insertedIds);
});

Test.insertMany([{ name: 'test' }], { rawResult: true }).then(result => {
  expectType<boolean>(result.acknowledged);
  expectType<number>(result.insertedCount);
  expectType<{ [key: number]: Types.ObjectId; }>(result.insertedIds);
});

Test.insertMany([{ name: 'test' }], { lean: true }).then(docs => {
  expectType<Types.ObjectId>(docs[0]._id);
  expectType<string>(docs[0].name);
  expectError(docs[0].isNew);
});

Test.insertMany([{ name: 'test' }], { lean: false }).then(docs => {
  expectType<Types.ObjectId>(docs[0]._id);
  expectType<string>(docs[0].name);
  expectType<boolean>(docs[0].isNew);
});

Test.insertMany([{ name: 'test' }], { }).then(docs => {
  expectType<Types.ObjectId>(docs[0]._id);
  expectType<string>(docs[0].name);
  expectType<boolean>(docs[0].isNew);
});

Test.insertMany([{ name: 'test' }]).then(docs => {
  expectType<Types.ObjectId>(docs[0]._id);
  expectType<string>(docs[0].name);
  expectType<boolean>(docs[0].isNew);
});

Test.insertMany({ _id: '000000000000000000000000', name: 'test' }).then(docs => {
  expectType<Types.ObjectId>(docs[0]._id);
  expectType<string>(docs[0].name);
  expectType<boolean>(docs[0].isNew);
});

Test.insertMany({ _id: new Types.ObjectId('000000000000000000000000'), name: 'test' }).then(docs => {
  expectType<Types.ObjectId>(docs[0]._id);
  expectType<string>(docs[0].name);
  expectType<boolean>(docs[0].isNew);
});

(async() => {
  const [t1] = await Test.create([{ name: 'test' }]);
  const [t2, t3, t4] = await Test.create({ name: 'test' }, { name: 'test' }, { name: 'test' });
  (await Test.create([{ name: 'test' }]))[0];
  (await Test.create({ name: 'test' }))._id;
})();

async function createWithAggregateErrors() {
  expectType<(HydratedDocument<ITest>)[]>(await Test.create([{}]));
  expectType<(HydratedDocument<ITest> | Error)[]>(await Test.create([{}], { aggregateErrors: true }));
}

async function createWithSubdoc() {
  const schema = new Schema({ name: String, registeredAt: Date, subdoc: new Schema({ prop: { type: String, required: true } }) });
  const TestModel = model('Test', schema);
  const doc = await TestModel.create({ name: 'test', registeredAt: '2022-06-01', subdoc: { prop: 'value' } });
  expectType<string | null | undefined>(doc.name);
  expectType<Date | null | undefined>(doc.registeredAt);
  expectType<string>(doc.subdoc!.prop);
}

async function createWithDocArray() {
  const schema = new Schema({ name: String, subdocs: [new Schema({ prop: { type: String, required: true } })] });
  const TestModel = model('Test', schema);
  const doc = await TestModel.create({ name: 'test', subdocs: [{ prop: 'value' }] });
  expectType<string | null | undefined>(doc.name);
  expectType<string>(doc.subdocs[0].prop);
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
  expectType<string | null | undefined>(doc.name);
  expectType<string>(doc.subdocMap!.get('taco')!.prop);

  const doc2 = await TestModel.create({ name: 'test', subdocMap: [['taco', { prop: 'beef' }]] });
  expectType<string | null | undefined>(doc2.name);
  expectType<string>(doc2.subdocMap!.get('taco')!.prop);
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
  expectType<string | null | undefined>(doc.name);
  expectType<string>(doc.subdoc!.prop);
  expectType<string>(doc.subdoc!.otherProp);
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
  expectType<string>(doc.name);
  expectType<Types.ObjectId>(doc._id);

  const doc2 = await TestModel.create({ name: 'test', _id: new Types.ObjectId() });
  expectType<string>(doc2.name);
  expectType<Types.ObjectId>(doc2._id);
}

createWithAggregateErrors();
