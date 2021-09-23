import { Schema, model, Document, Types } from 'mongoose';

const childSchema: Schema = new Schema({ name: String });

const schema: Schema = new Schema({
  child1: childSchema,
  child2: {
    type: childSchema,
    _id: false
  },
  docarr1: [childSchema],
  docarr2: [{
    type: childSchema,
    _id: false
  }]
});

interface ITest extends Document {
  child1: { name: string },
  child2: { name: string }
}

const Test = model<ITest>('Test', schema);

const doc: ITest = new Test({});

doc.child1 = { name: 'test1' };
doc.child2 = { name: 'test2' };


async function gh10597(): Promise<void> {
  interface IGameEvent {
    description: string;
  }
  type IGameEventDocument = IGameEvent & Types.Subdocument;

  interface IGameDocument extends Document {
    name: string;
    events: IGameEventDocument[]
  }
  const schema = new Schema<IGameDocument>({ name: String, events: [{ description: String }] });

  const GameModel = model<IGameDocument>('Game', schema);

  const doc = await GameModel.findOne().orFail();
  await doc.update({ events: [{ description: 'test' }] });
}