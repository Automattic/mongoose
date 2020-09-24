import { Schema, model, Model, Types } from 'mongoose';

const schema: Schema = new Schema({ name: { type: 'String' } });

interface ITest extends Model<ITest> {
  _id?: Types.ObjectId,
  name?: string;
}

const Test = model<ITest>('Test', schema);

Test.count({ name: /Test/ }).exec().then((res: number) => console.log(res));

Test.find({ name: { $in: ['Test'] } }).exec().then((res: Array<ITest>) => console.log(res));

Test.find({ name: { $gte: 'Test' } }, null, { collation: { locale: 'en-us' } }).exec().
  then((res: Array<ITest>) => console.log(res[0].name));

Test.distinct('name').exec().then((res: Array<any>) => console.log(res[0]));

Test.findOneAndUpdate({ name: 'test' }, { name: 'test2' }).exec().then((res: ITest | null) => console.log(res));

Test.findOneAndReplace({ name: 'test' }, { _id: new Types.ObjectId(), name: 'test2' }).exec().then((res: ITest | null) => console.log(res));