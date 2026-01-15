import { Schema, model, Model, Types } from 'mongoose';
import { ExpectType } from './helpers';

const schema = new Schema({ name: { type: 'String' } });

const Test = model('Test', schema);

type ITest = ReturnType<(typeof Test)['hydrate']>;

Test.find().cursor().
  eachAsync(async(doc: ITest) => {
    ExpectType<Types.ObjectId>(doc._id);
    ExpectType<string | undefined | null>(doc.name);
  }).
  then(() => console.log('Done!'));

Test.find().cursor().
  eachAsync(async(doc: ITest, i) => {
    ExpectType<Types.ObjectId>(doc._id);
    ExpectType<number>(i);
  }).
  then(() => console.log('Done!'));

Test.find().cursor().next().then((doc) => ExpectType<ITest | null>(doc));

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
  const childSchema = new Schema({ name: String });

  const cursor = ParentModel.find({}).populate<{ child: Child }>('child').cursor();
  for await (const doc of cursor) {
    ExpectType<Child>(doc.child);
  }
}
