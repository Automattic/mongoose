import { Schema, model, Document, Types } from 'mongoose';

const schema: Schema = new Schema({ name: { type: 'String' } });

interface ITest extends Document {
  _id?: Types.ObjectId,
  name?: string;
}

const Test = model<ITest>('Test', schema);

Test.aggregate([{ $match: { name: 'foo' } }]).exec().then((res: any) => console.log(res));

Test.aggregate<ITest>([{ $match: { name: 'foo' } }]).exec().then((res: Array<ITest>) => console.log(res[0].name));

Test.aggregate<ITest>([{ $match: { name: 'foo' } }]).then((res: Array<ITest>) => console.log(res[0].name));

run().catch((err: Error) => console.log(err.stack));

async function run() {
  let res: Array<ITest> = await Test.aggregate<ITest>([{ $match: { name: 'foo' } }]).exec();
  console.log(res[0].name);

  let res2: Array<ITest> = await Test.aggregate<ITest>([{ $match: { name: 'foo' } }]);
  console.log(res2[0].name);

  await Test.aggregate<ITest>([{ $match: { name: 'foo' } }]).cursor().exec().eachAsync(async (res) => {
    console.log(res);
  });
}