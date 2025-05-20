import { Schema, Model, connection, HydratedDocumentFromSchema } from 'mongoose';

function withInference() {
  const TestSchema = Schema.fromDefinition(
    { foo: { type: String, required: true } },
    {
      methods: {
        getAnswer() {
          console.log(this.foo.trim());
          const num: number = (this as HydratedDocumentFromSchema<typeof TestSchema>).getAnswer();
          return 42;
        }
      }
    }
  );

  const Test = connection.model('Test', TestSchema);

  Test.create({ foo: 'test' });

  const doc = new Test({ foo: 'test' });

  Math.floor(doc.getAnswer());
}

function withGenerics() {
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
    const num: number = this.getAnswer();
    return 42;
  };

  const Test = connection.model<ITest, ITestModel>('Test', TestSchema);

  Test.create({ foo: 'test' });

  const doc = new Test({ foo: 'test' });

  Math.floor(doc.getAnswer());
}
