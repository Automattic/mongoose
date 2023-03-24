import { Schema, model, Document, Expression, PipelineStage, Types, Model, Aggregate } from 'mongoose';
import { expectType } from 'tsd';

const schema: Schema = new Schema({ name: { type: 'String' } });

interface ITest {
  name?: string;
}

const Test = model('Test', schema);
const AnotherTest = model('AnotherTest', schema);

Test.aggregate([{ $match: { name: 'foo' } }]).exec().then((res: any) => console.log(res));

Test.aggregate<ITest>([{ $match: { name: 'foo' } }]).exec().then((res: Array<ITest>) => console.log(res[0].name));

Test.aggregate<ITest>([{ $match: { name: 'foo' } }]).then((res: Array<ITest>) => console.log(res[0].name));

run().catch((err: Error) => console.log(err.stack));

async function run() {
  const res: Array<ITest> = await Test.aggregate<ITest>([{ $match: { name: 'foo' } }]).exec();
  console.log(res[0].name);

  const res2: Array<ITest> = await Test.aggregate<ITest>([{ $match: { name: 'foo' } }]);
  console.log(res2[0].name);

  expectType<number | undefined>(Test.aggregate<ITest>([{ $match: { name: 'foo' } }]).options.maxTimeMS);
  expectType<boolean | undefined>(Test.aggregate<ITest>([{ $match: { name: 'foo' } }]).options.allowDiskUse);
  Test.aggregate<ITest>([{ $match: { name: 'foo' } }]).option({ maxTimeMS: 222 });

  await Test.aggregate<ITest>([{ $match: { name: 'foo' } }]).cursor().eachAsync(async(res) => {
    console.log(res);
  });

  for await (const obj of Test.aggregate<ITest>()) {
    obj.name;
  }

  function eachAsync(): void {
    Test.aggregate().cursor().eachAsync((doc) => {
      expectType<any>(doc);
    });
    Test.aggregate().cursor().eachAsync((docs) => {
      expectType<any[]>(docs);
    }, { batchSize: 2 });
    Test.aggregate().cursor<ITest>().eachAsync((doc) => {
      expectType<ITest>(doc);
    });
    Test.aggregate().cursor<ITest>().eachAsync((docs) => {
      expectType<ITest[]>(docs);
    }, { batchSize: 2 });
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

  // Aggregate.prototype.model()
  expectType<Model<any>>(Test.aggregate<ITest>().model());
  expectType<Aggregate<ITest[]>>(Test.aggregate<ITest>().model(AnotherTest));
}

function gh12017_1() {
  const a: Expression = { $subtract: [
    { $dayOfWeek: new Date() } as Expression.DayOfWeek, // errors
    2
  ] };
}

function gh12017_2() {
  const a: Expression.Reduce = {
    $reduce: {
      input: '$values',
      initialValue: { depth: -1 }, // errors
      in: {
        depth: '$$this.depth' // errors
      }
    }
  };

  const b: Expression.Reduce = {
    $reduce: {
      input: '$values',
      initialValue: 0,
      in: { $add: ['$$value', '$$this'] }
    }
  };

  const c: PipelineStage.Set = {
    $set: {
      child: {
        foo: 'bar' // errors
      },
      friend: new Types.ObjectId()
    }
  };

  const d: Expression.ToInt = { $toInt: 2.5 };
}


function gh12311() {
  const densifyWithDates: PipelineStage.Densify = {
    $densify: {
      field: 'timestamp',
      range: {
        step: 1,
        unit: 'hour',
        bounds: [new Date('2022-01-01'), new Date('2022-12-31')]
      }
    }
  };
  const densifyWithNumbers: PipelineStage.Densify = {
    $densify: {
      field: 'age',
      range: {
        step: 1,
        bounds: [30, 90]
      }
    }
  };
  const densifyWithFullBounds: PipelineStage.Densify = {
    $densify: {
      field: 'age',
      range: {
        step: 1,
        bounds: 'full'
      }
    }
  };
}
