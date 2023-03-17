import { Schema, model, Types, InferSchemaType } from 'mongoose';
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

function gh13087() {
  interface Book {
    author: {
      name: string;
    };
  }

  expectError(new Types.DocumentArray<Book>([1, 2, 3]));

  const locationSchema = new Schema(
    {
      type: {
        required: true,
        type: String,
        enum: ['Point']
      },
      coordinates: {
        required: true,
        type: [Number] // [longitude, latitude]
      }
    },
    { _id: false }
  );

  const pointSchema = new Schema({
    name: { required: true, type: String },
    location: { required: true, type: locationSchema }
  });

  const routeSchema = new Schema({
    points: { type: [pointSchema] }
  });

  type Route = InferSchemaType<typeof routeSchema>;

  function getTestRouteData(): Route {
    return {
      points: new Types.DocumentArray([
        { name: 'Test', location: { type: 'Point', coordinates: [1, 2] } }
      ])
    };
  }

  const { points } = getTestRouteData();
  expectType<Types.DocumentArray<{
    name: string;
    location: {
      type: 'Point';
      coordinates: number[];
    };
  }>>(points);
}
