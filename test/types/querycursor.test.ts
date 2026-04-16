import { Schema, model, Model, Types } from 'mongoose';
import { expect } from 'tstyche';

const schema = new Schema({ name: { type: 'String' } });

const Test = model('Test', schema);

type ITest = ReturnType<(typeof Test)['hydrate']>;

Test.find().cursor().
  eachAsync(async(doc: ITest) => {
    expect(doc._id).type.toBe<Types.ObjectId>();
    expect(doc.name).type.toBe<string | undefined | null>();
  }).
  then(() => console.log('Done!'));

Test.find().cursor().
  eachAsync(async(doc: ITest, i) => {
    expect(doc._id).type.toBe<Types.ObjectId>();
    expect(i).type.toBe<number>();
  }).
  then(() => console.log('Done!'));

Test.find().cursor().next().then((doc) => expect(doc).type.toBe<ITest | null>());

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
    expect(doc.child).type.toBe<Child>();
  }
}
