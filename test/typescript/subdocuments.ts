import { Schema, model, Document } from 'mongoose';

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
  }],
});

interface ITest extends Document {
  child1: { name: String },
  child2: { name: String }
}

const Test = model<ITest>('Test', schema);

const doc: ITest = new Test({});

doc.child1 = { name: 'test1' };
doc.child2 = { name: 'test2' };