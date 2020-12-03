import { Schema, model, Document } from 'mongoose';

const schema: Schema = new Schema({
  name: { type: 'String' },
  tags: [String]
}, { collection: 'mytest', versionKey: '_version' });

interface ITest extends Document {
  name?: string;
  tags?: string[];
}

const Test = model<ITest>('Test', schema);

const doc: ITest = new Test({ name: 'foo' });
console.log(doc._id);
doc.name = 'bar';

doc.save().then((doc: ITest) => console.log(doc.name));