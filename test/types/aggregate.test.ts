import { Schema, model, Document, Expression, PipelineStage, Types, Model, Aggregate } from 'mongoose';
import { Expect, Equal } from './helpers';

const schema = new Schema({ name: { type: 'String' } });

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

  const agg = Test.aggregate<ITest>([{ $match: { name: 'foo' } }]);
  Expect<Equal<(typeof agg)['options']['maxTimeMS'], number | undefined>>();
  Expect<Equal<(typeof agg)['options']['allowDiskUse'], boolean | undefined>>();
  Test.aggregate<ITest>([{ $match: { name: 'foo' } }]).option({ maxTimeMS: 222 });

  await Test.aggregate<ITest>([{ $match: { name: 'foo' } }]).cursor().eachAsync(async(res) => {
    console.log(res);
  });

  for await (const obj of Test.aggregate<ITest>()) {
    obj.name;
  }

  function eachAsync(): void {
    Test.aggregate().cursor().eachAsync((doc) => {
      Expect<Equal<typeof doc, any>>();
    });
    Test.aggregate().cursor().eachAsync((docs) => {
      Expect<Equal<typeof docs, any[]>>();
    }, { batchSize: 2 });
    Test.aggregate().cursor<ITest>().eachAsync((doc) => {
      Expect<Equal<typeof doc, ITest>>();
    });
    Test.aggregate().cursor<ITest>().eachAsync((docs) => {
      Expect<Equal<typeof docs, ITest[]>>();
    }, { batchSize: 2 });
  }

  // Aggregate.prototype.sort()
  const agg2 = Test.aggregate<ITest>();
  let docs = await Test.aggregate<ITest>().sort('-name');
  Expect<Equal<typeof docs, ITest[]>>();
  docs = await Test.aggregate<ITest>().sort({ name: 1 });
  Expect<Equal<typeof docs, ITest[]>>();
  docs = await Test.aggregate<ITest>().sort({ name: -1 });
  Expect<Equal<typeof docs, ITest[]>>();
  docs = await Test.aggregate<ITest>().sort({ name: 'asc' });
  Expect<Equal<typeof docs, ITest[]>>();
  docs = await Test.aggregate<ITest>().sort({ name: 'ascending' });
  Expect<Equal<typeof docs, ITest[]>>();
  docs = await Test.aggregate<ITest>().sort({ name: 'desc' });
  Expect<Equal<typeof docs, ITest[]>>();
  docs = await Test.aggregate<ITest>().sort({ name: 'descending' });
  Expect<Equal<typeof docs, ITest[]>>();
  docs = await Test.aggregate<ITest>().sort({ name: { $meta: 'textScore' } });
  Expect<Equal<typeof docs, ITest[]>>();

  // Aggregate.prototype.model()
  const model = Test.aggregate<ITest>().model();
  Expect<Equal<typeof model, Model<any>>>();
  const agg3 = Test.aggregate<ITest>().model(AnotherTest);
  Expect<Equal<typeof agg3, Aggregate<ITest[]>>>();
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

function gh13060() {
  const schema = new Schema({ status: String });
  const documentModel = model('Document', schema);

  documentModel.aggregate([{
    $group: {
      _id: '$_id',
      merged: {
        $mergeObjects: {
          status: '$status'
        }
      }
    }
  }]);
}

async function gh15300() {
  const schema = new Schema({ status: String });
  const TestModel = model('Document', schema);

  await TestModel.aggregate().project('a b -_id');
}
