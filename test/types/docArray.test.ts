import { Schema, model, Document, Types } from 'mongoose';
import { expectError, expectType } from 'tsd';

async function gh10293() {
  interface ITest {
    name: string;
    arrayOfArray: string[][]; // <-- Array of Array
  }

  const testSchema = new Schema<ITest>({
    name: {
      type: String,
      required: true
    },
    arrayOfArray: [[String]]
  });

  const TestModel = model('gh10293TestModel', testSchema);

  testSchema.methods.getArrayOfArray = function(this: InstanceType<typeof TestModel>): string[][] { // <-- function to return Array of Array
    const test = this.toObject();

    expectType<string[][]>(test.arrayOfArray);
    return test.arrayOfArray; // <-- error here if the issue persisted
  };
}
