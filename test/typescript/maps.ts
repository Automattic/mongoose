import { Schema, model, Document } from 'mongoose';

const schema: Schema = new Schema({
  map1: {
    type: Map,
    of: Number
  },
  map2: {
    type: Map,
    of: { type: String, enum: ['hello, world'] }
  },
  map3: {
    type: Map,
    of: {
      type: Number,
      max: 44
    }
  }
});

interface ITest extends Document {
  map1: Map<string, number>,
  map2: Map<string, string>,
  map3: Map<string, number>
}

const Test = model<ITest>('Test', schema);

const doc: ITest = new Test({});

doc.map1.set('answer', 42);
doc.map1.get('answer');