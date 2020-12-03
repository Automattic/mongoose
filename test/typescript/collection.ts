import { Schema, model, Document } from 'mongoose';

const schema: Schema = new Schema({ name: { type: 'String' } });

interface ITest extends Document {
  name?: string;
  age?: number;
}

const Test = model<ITest>('Test', schema);

Test.collection.collectionName;