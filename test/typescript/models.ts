import { Schema, Document, Model, connection } from 'mongoose';

interface ITest extends Document {
  foo: string;
}

const TestSchema = new Schema({
  foo: { type: String, required: true },
});

const Test = connection.model<ITest>('Test', TestSchema);

const bar = (SomeModel: Model<ITest>) => // <<<< error here
  console.log(SomeModel);

bar(Test);

const ExpiresSchema = new Schema({
  ttl: {
    type: Date,
    expires: 3600,
  },
});
