import { Schema, model, Document, Expression, PipelineStage, Types, Model, Aggregate } from 'mongoose';
import { expect } from 'tstyche';

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

  expect(Test.aggregate<ITest>([{ $match: { name: 'foo' } }]).options.maxTimeMS).type.toBe<number | undefined>();
  expect(Test.aggregate<ITest>([{ $match: { name: 'foo' } }]).options.allowDiskUse).type.toBe<boolean | undefined>();
  expect(Test.aggregate<ITest>([{ $match: { name: 'foo' } }]).option({ maxTimeMS: 222 })).type.toBe<Aggregate<ITest[]>>();

  await Test.aggregate<ITest>([{ $match: { name: 'foo' } }]).cursor().eachAsync(async(res) => {
    console.log(res);
  });

  for await (const obj of Test.aggregate<ITest>()) {
    obj.name;
  }

  function eachAsync(): void {
    Test.aggregate().cursor().eachAsync((doc) => {
      expect(doc).type.toBe<any>();
    });
    Test.aggregate().cursor().eachAsync((docs) => {
      expect(docs).type.toBe<any[]>();
    }, { batchSize: 2 });
    Test.aggregate().cursor<ITest>().eachAsync((doc) => {
      expect(doc).type.toBe<ITest>();
    });
    Test.aggregate().cursor<ITest>().eachAsync((docs) => {
      expect(docs).type.toBe<ITest[]>();
    }, { batchSize: 2 });
  }

  // Aggregate.prototype.sort()
  expect(await Test.aggregate<ITest>().sort('-name')).type.toBe<ITest[]>();
  expect(await Test.aggregate<ITest>().sort({ name: 1 })).type.toBe<ITest[]>();
  expect(await Test.aggregate<ITest>().sort({ name: -1 })).type.toBe<ITest[]>();
  expect(await Test.aggregate<ITest>().sort({ name: 'asc' })).type.toBe<ITest[]>();
  expect(await Test.aggregate<ITest>().sort({ name: 'ascending' })).type.toBe<ITest[]>();
  expect(await Test.aggregate<ITest>().sort({ name: 'desc' })).type.toBe<ITest[]>();
  expect(await Test.aggregate<ITest>().sort({ name: 'descending' })).type.toBe<ITest[]>();
  expect(await Test.aggregate<ITest>().sort({ name: { $meta: 'textScore' } })).type.toBe<ITest[]>();

  // Aggregate.prototype.model()
  expect(Test.aggregate<ITest>().model()).type.toBe<Model<any>>();
  expect(Test.aggregate<ITest>().model(AnotherTest)).type.toBe<Aggregate<ITest[]>>();
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

function gh16033() {
  const schema = new Schema({ text: String, published: Boolean });
  const Item = model('ItemGh16033', schema);

  const basePipeline = Item.aggregate().match({ published: true });

  Item.aggregate()
    .match({ text: 'example' })
    .unionWith({
      coll: 'other_items',
      pipeline: basePipeline.pipelineForUnionWith()
    });

  Item.aggregate()
    .match({ text: 'example' })
    .unionWith({
      coll: 'other_items',
      // @ts-expect-error  Type 'PipelineStage[]' is not assignable to type 'UnionWithPipelineStage[]'.
      pipeline: basePipeline.pipeline()
    });
}
