import { Schema, model, Document, Types } from 'mongoose';

const schema: Schema = new Schema({ name: { type: 'String' } });

interface ITest extends Document {
  name?: string;
}

const Test = model<ITest>('Test', schema);

Test.find().cursor().eachAsync(async(doc: ITest) => console.log(doc.name)).
  then(() => console.log('Done!'));
