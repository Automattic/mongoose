import { Schema, Document, connection } from 'mongoose';

interface ITest extends Document {
  foo: string;
  getAnswer(): number;
}

const TestSchema = new Schema<ITest>({
  foo: { type: String, required: true }
});

TestSchema.methods.getAnswer = function(): number {
  console.log(this.foo.trim());
  return 42;
};

const Test = connection.model<ITest>('Test', TestSchema);

Test.create({ foo: 'test' });

const doc: ITest = new Test({ foo: 'test' });

Math.floor(doc.getAnswer());
