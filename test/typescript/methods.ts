import { Schema, Document, connection } from 'mongoose';

interface ITest extends Document {
  foo: string;
  someArray: string[];
  getAnswer(): number;
}

const TestSchema = new Schema({
  foo: { type: String, required: true },
  someArray: [String]
});

TestSchema.methods.getAnswer = function(): number {
  for (const str of this.someArray) {
    console.log(str);
  }
  return 42;
};

const Test = connection.model<ITest>('Test', TestSchema);

Test.create({ foo: 'test' });

const doc: ITest = new Test({ foo: 'test' });

Math.floor(doc.getAnswer());
