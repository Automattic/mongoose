import { Schema, model, Model, Types } from 'mongoose';
import { expectType } from 'tsd';

const schema = new Schema({ name: { type: 'String' } });

const Test = model('Test', schema);

type ITest = ReturnType<(typeof Test)['hydrate']>;

Test.find().cursor().
  eachAsync(async(doc: ITest) => {
    expectType<Types.ObjectId>(doc._id);
    expectType<string | undefined | null>(doc.name);
  }).
  then(() => console.log('Done!'));

Test.find().cursor().
  eachAsync(async(doc: ITest, i) => {
    expectType<Types.ObjectId>(doc._id);
    expectType<number>(i);
  }).
  then(() => console.log('Done!'));

Test.find().cursor().next().then((doc) => expectType<ITest | null>(doc));

async function gh14374() {
  // `Parent` represents the object as it is stored in MongoDB
  interface Parent {
    child?: Types.ObjectId
    name?: string
  }
  const ParentModel = model<Parent>(
    'Parent',
    new Schema({
      child: { type: Schema.Types.ObjectId, ref: 'Child' },
      name: String
    })
  );

  interface Child {
    name: string
  }
  const childSchema: Schema = new Schema({ name: String });

  const cursor = ParentModel.find({}).populate<{ child: Child }>('child').cursor();
  for await (const doc of cursor) {
    expectType<Child>(doc.child);
  }

}
