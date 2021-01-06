import { Schema, model, Document } from 'mongoose';

const schema: Schema = new Schema({
  name: { type: 'String' },
  tags: [String],
  author: { name: String },
  email: {
    type: String,
    validate: {
      validator: v => v.includes('@')
    },
    otherProperty: 42
  },
  followers: [{ name: String }]
}, { collection: 'mytest', versionKey: '_version' });

interface ITest extends Document {
  name?: string;
  id?: number;
  tags?: string[];
  author?: { name: string };
  followers?: { name: string }[];
}

const Test = model<ITest>('Test', schema);

const doc: ITest = new Test({ name: 'foo' });
console.log(doc._id);
console.log(doc.__v);
doc.name = 'bar';

doc.save().then((doc: ITest) => console.log(doc.name));
