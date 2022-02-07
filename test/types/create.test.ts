import { Schema, model, Document, Types } from 'mongoose';

const schema: Schema = new Schema({ name: { type: 'String' } });

interface ITest extends Document {
  _id?: Types.ObjectId;
  name?: string;
}

const Test = model<ITest>('Test', schema);

Test.create({ _id: '0'.repeat(24), name: 'test' }).then((doc: ITest) => console.log(doc.name));

Test.create([{ name: 'test' }], { validateBeforeSave: false }).then((docs: ITest[]) => console.log(docs[0].name));

Test.create({ name: 'test' }, { name: 'test2' }).then((docs: ITest[]) => console.log(docs[0].name));

Test.insertMany({ name: 'test' }).then((docs: ITest[]) => console.log(docs[0].name));

Test.create([{ name: 'test' }], { validateBeforeSave: true }).then((docs: ITest[]) => console.log(docs[0].name));

(async() => {
  const [t1] = await Test.create([{ name: 'test' }]);
  const [t2, t3, t4] = await Test.create({ name: 'test' }, { name: 'test' }, { name: 'test' });
  (await Test.create([{ name: 'test' }]))[0];
  (await Test.create({ name: 'test' }))._id;
})();
