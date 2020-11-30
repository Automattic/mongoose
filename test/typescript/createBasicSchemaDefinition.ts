import { Schema, model, Document } from 'mongoose';

const schema: Schema = new Schema({ name: { type: 'String' } });

interface ITest extends Document {
  name?: string;
}

const Test = model<ITest>('Test', schema);

const doc: ITest = new Test({ name: 'foo' });
doc.name = 'bar';

doc.save().then((doc: ITest) => console.log(doc.name));