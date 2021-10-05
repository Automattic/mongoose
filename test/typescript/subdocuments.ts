import { Schema, model, Model, Document } from 'mongoose';

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

function gh10674() {
  type Foo = {
    bar: string
    schedule: {
      date: string;
      hours: number;
    }[];
  };

  type FooModel = Model<Foo>;

  const FooSchema = new Schema<Foo, FooModel, Foo>(
    {
      bar: { type: String },
      schedule: {
        type: [
          {
            date: { type: String, required: true },
            hours: { type: Number, required: true }
          }
        ],
        required: true
      }
    }
  );
}
