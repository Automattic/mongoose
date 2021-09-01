import { Schema, model, Document, Types, Query, Model, QueryWithHelpers, PopulatedDoc } from 'mongoose';
import { ObjectId } from 'mongodb';

interface QueryHelpers {
  _byName(this: QueryWithHelpers<any, ITest, QueryHelpers>, name: string): QueryWithHelpers<Array<ITest>, ITest, QueryHelpers>;
  byName(name: string): QueryWithHelpers<Array<ITest>, ITest, QueryHelpers>;
}

const childSchema: Schema = new Schema({ name: String });
const ChildModel = model<Child>('Child', childSchema);

const schema: Schema<ITest, Model<ITest, QueryHelpers>> = new Schema({
  name: { type: 'String' },
  tags: [String],
  child: { type: 'ObjectId', ref: 'Child' },
  docs: [{ _id: 'ObjectId', id: Number, tags: [String] }],
  endDate: Date
});

schema.query._byName = function(name: string): QueryWithHelpers<any, ITest> {
  return this.find({ name });
};

schema.query.byName = function(name: string): QueryWithHelpers<any, ITest> {
  this.notAQueryHelper();
  return this._byName(name);
};

interface Child {
  name: string;
}
interface ISubdoc extends Document {
  myId?: Types.ObjectId;
  id?: number;
  tags?: string[];
}

interface ITest extends Document {
  name?: string;
  age?: number;
  parent?: Types.ObjectId;
  child?: PopulatedDoc<Child & Document<ObjectId>>,
  tags?: string[];
  docs?: ISubdoc[];
  endDate?: Date;
}

const Test = model<ITest, Model<ITest, QueryHelpers>>('Test', schema);

Test.find({}, {}, { populate: { path: 'child', model: ChildModel, match: true } }).exec().then((res: Array<ITest>) => console.log(res));

Test.find().byName('test').byName('test2').orFail().exec().then(console.log);

Test.count({ name: /Test/ }).exec().then((res: number) => console.log(res));
Test.findOne({ 'docs.id': 42 }).exec().then(console.log);

// ObjectId casting
Test.find({ parent: new Types.ObjectId('0'.repeat(24)) });
Test.find({ parent: '0'.repeat(24) });

// Operators
Test.find({ name: { $in: ['Test'] } }).exec().then((res: Array<ITest>) => console.log(res));
Test.find({ tags: 'test' }).exec();

Test.find({ name: 'test' }, (err: Error, docs: ITest[]) => {
  console.log(!!err, docs[0].age);
});

Test.findOne({ name: 'test' }, (err: Error, doc: ITest) => {
  console.log(!!err, doc.age);
});

Test.find({ name: { $gte: 'Test' } }, null, { collation: { locale: 'en-us' } }).exec().
  then((res: Array<ITest>) => console.log(res[0].name));

Test.findOne().orFail(new Error('bar')).then((doc: ITest | null) => console.log('Found! ' + doc));

Test.distinct('name').exec().then((res: Array<any>) => console.log(res[0]));

Test.findOneAndUpdate({ name: 'test' }, { name: 'test2' }).exec().then((res: ITest | null) => console.log(res));
Test.findOneAndUpdate({ name: 'test' }, { name: 'test2' }).then((res: ITest | null) => console.log(res));
Test.findOneAndUpdate({ name: 'test' }, { $set: { name: 'test2' } }).then((res: ITest | null) => console.log(res));
Test.findOneAndUpdate({ name: 'test' }, { $inc: { age: 2 } }).then((res: ITest | null) => console.log(res));
Test.findOneAndUpdate({ name: 'test' }, { name: 'test3' }, { upsert: true, new: true }).then((res: ITest) => { res.name = 'test4'; });
Test.findOneAndUpdate({ name: 'test' }, { name: 'test3' }, { upsert: true, returnOriginal: false }).then((res: ITest) => { res.name = 'test4'; });
Test.findOneAndUpdate({ name: 'test' }, { name: 'test3' }, { rawResult: true }).then((res: any) => { console.log(res.ok); });
Test.findOneAndUpdate({ name: 'test' }, { name: 'test3' }, { new: true, upsert: true, rawResult: true }).then((res: any) => { console.log(res.ok); });

Test.findOneAndReplace({ name: 'test' }, { _id: new Types.ObjectId(), name: 'test2' }).exec().then((res: ITest | null) => console.log(res));

Test.findOneAndUpdate({ name: 'test' }, { $addToSet: { tags: 'each' } });
Test.findOneAndUpdate({ name: 'test' }, { $push: { tags: 'each' } });
Test.findOneAndUpdate({ name: 'test' }, { $pull: { docs: { 'nested.id': 1 } } });

Test.findOneAndUpdate({ name: 'test', 'docs.id': 1 }, { $pull: { 'docs.$.tags': 'foo' } });

const update = Math.random() > 0.5 ? { $unset: { 'docs.0': 1 } } : { age: 55 };
Test.findOneAndUpdate({ name: 'test' }, update);

Test.findOneAndUpdate({ name: 'test' }, { $currentDate: { endDate: true } });
Test.findOneAndUpdate({ name: 'test' }, [{ $set: { endDate: true } }]);

Test.findByIdAndUpdate({ name: 'test' }, { name: 'test2' }, (err: any, doc) => console.log(doc));

Test.findOneAndUpdate({ name: 'test' }, { 'docs.0.myId': '0'.repeat(24) });

const query: Query<ITest | null, ITest> = Test.findOne();
query instanceof Query;

// Chaining
Test.findOne().where({ name: 'test' });
Test.where().find({ name: 'test' });

// Super generic query
function testGenericQuery(): void {
  interface CommonInterface<T> extends Document {
    something: string;
    content: T;
  }

  async function findSomething<T>(model: Model<CommonInterface<T>>): Promise<CommonInterface<T>> {
    return model.findOne({ something: 'test' }).orFail().exec();
  }
}

function eachAsync(): void {
  Test.find().cursor().eachAsync((doc: ITest) => console.log(doc.name));

  Test.find().cursor().eachAsync((docs: ITest[]) => console.log(docs[0].name), { batchSize: 2 });
}

async function gh10617(): Promise<void> {
  interface IDBModel extends Document {
    date: Date; // date created
    _tags: any[];
  }

  const schema = new Schema({
    date: { type: Date, default: Date.now }, // date created
    _tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }]
  });

  const DBModel: Model<IDBModel> = model<IDBModel>('Meep', schema);
  await DBModel.findOne({});
}