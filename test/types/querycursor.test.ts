import { Schema, model, Model, Types } from 'mongoose';
import { expectType } from 'tsd';

const schema = new Schema({ name: { type: 'String' } });

const Test = model('Test', schema);

type ITest = ReturnType<(typeof Test)['hydrate']>;

Test.find().cursor().
  eachAsync(async(doc: ITest) => {
    expectType<Types.ObjectId>(doc._id);
    expectType<string | undefined>(doc.name);
  }).
  then(() => console.log('Done!'));

Test.find().cursor().
  eachAsync(async(doc: ITest, i) => {
    expectType<Types.ObjectId>(doc._id);
    expectType<number>(i);
  }).
  then(() => console.log('Done!'));
