import { Schema, model, Document, Types } from 'mongoose';
import { expectType } from 'tsd';

const schema: Schema = new Schema({ name: { type: 'String' } });

interface ITest extends Document {
  name?: string;
}

const Test = model<ITest>('Test', schema);

Test.aggregate([{ $match: { name: 'foo' } }]).exec().then((res: any) => console.log(res));

Test.aggregate<ITest>([{ $match: { name: 'foo' } }]).exec().then((res: Array<ITest>) => console.log(res[0].name));

Test.aggregate<ITest>([{ $match: { name: 'foo' } }]).then((res: Array<ITest>) => console.log(res[0].name));

run().catch((err: Error) => console.log(err.stack));

async function run() {
  const res: Array<ITest> = await Test.aggregate<ITest>([{ $match: { name: 'foo' } }]).exec();
  console.log(res[0].name);

  const res2: Array<ITest> = await Test.aggregate<ITest>([{ $match: { name: 'foo' } }]);
  console.log(res2[0].name);

  await Test.aggregate<ITest>([{ $match: { name: 'foo' } }]).cursor().eachAsync(async(res) => {
    console.log(res);
  });

  for await (const obj of Test.aggregate<ITest>()) {
    obj.name;
  }

  function eachAsync(): void {
    Test.aggregate().cursor().eachAsync((doc) => {expectType<any>(doc);});
    Test.aggregate().cursor().eachAsync((docs) => {expectType<any[]>(docs);}, { batchSize: 2 });
    Test.aggregate().cursor<ITest>().eachAsync((doc) => {expectType<ITest>(doc);});
    Test.aggregate().cursor<ITest>().eachAsync((docs) => {expectType<ITest[]>(docs);}, { batchSize: 2 });
  }

  // Aggregate.prototype.sort()
  expectType<ITest[]>(await Test.aggregate<ITest>().sort('-name'));
  expectType<ITest[]>(await Test.aggregate<ITest>().sort({ name: 1 }));
  expectType<ITest[]>(await Test.aggregate<ITest>().sort({ name: -1 }));
  expectType<ITest[]>(await Test.aggregate<ITest>().sort({ name: 'asc' }));
  expectType<ITest[]>(await Test.aggregate<ITest>().sort({ name: 'ascending' }));
  expectType<ITest[]>(await Test.aggregate<ITest>().sort({ name: 'desc' }));
  expectType<ITest[]>(await Test.aggregate<ITest>().sort({ name: 'descending' }));
  expectType<ITest[]>(await Test.aggregate<ITest>().sort({ name: { $meta: 'textScore' } }));
}
