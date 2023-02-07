import { Schema, Model, connection } from 'mongoose';

interface ITest {
  foo: string;
}

interface ITestMethods {
  getAnswer(): number;
}

type ITestModel = Model<ITest, {}, ITestMethods>;

const TestSchema = new Schema<ITest, ITestModel, ITestMethods>({
  foo: { type: String, required: true }
});

TestSchema.methods.getAnswer = function(): number {
  console.log(this.foo.trim());
  return 42;
};

const Test = connection.model<ITest, ITestModel>('Test', TestSchema);

Test.create({ foo: 'test' });

const doc = new Test({ foo: 'test' });

Math.floor(doc.getAnswer());
