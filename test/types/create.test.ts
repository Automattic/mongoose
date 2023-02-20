import { Schema, model, Types, CallbackError } from 'mongoose';
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
