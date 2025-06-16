import { Schema, Model, connection, ObtainSchemaGeneric } from 'mongoose';
import { expectType } from 'tsd';

interface ITest {
  foo: string;
}

interface ITestMethods {
  getAnswer(): number;
}

type ITestModel = Model<ITest, {}, ITestMethods>;

const TestSchema = new Schema<any, ITest, ITestModel, ITestMethods>({
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

function autoInferred() {
  const TestSchema = new Schema({
    foo: { type: String, required: true }
  }, {
    methods: {
      getAnswer() {
        console.log(this.foo.trim());
        return 42;
      }
    }
  });

  const Test = connection.model<typeof TestSchema>('Test', TestSchema);
  type Methods = ObtainSchemaGeneric<typeof TestSchema, 'TInstanceMethods'>;
  type Hydrated = ObtainSchemaGeneric<typeof TestSchema, 'THydratedDocumentType'>;

  Test.create({ foo: 'test' });

  const doc = new Test({ foo: 'test' });

  Math.floor(doc.getAnswer());
}
