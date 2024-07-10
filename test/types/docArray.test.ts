import { Schema, model, Model, Types, InferSchemaType } from 'mongoose';
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

async function gh13424() {
  const subDoc = {
    name: { type: String, required: true },
    controls: { type: String, required: true }
  };

  const testSchema = new Schema({
    question: { type: String, required: true },
    subDocArray: { type: [subDoc], required: true }
  });
  const TestModel = model('Test', testSchema);

  const doc = new TestModel();
  expectType<Types.ObjectId>(doc.subDocArray[0]._id);
}

async function gh14367() {
  const UserSchema = new Schema(
    {
      reminders: {
        type: [
          {
            type: { type: Schema.Types.String },
            date: { type: Schema.Types.Date },
            toggle: { type: Schema.Types.Boolean },
            notified: { type: Schema.Types.Boolean }
          }
        ],
        default: [
          { type: 'vote', date: new Date(), toggle: false, notified: false },
          { type: 'daily', date: new Date(), toggle: false, notified: false },
          { type: 'drop', date: new Date(), toggle: false, notified: false },
          { type: 'claim', date: new Date(), toggle: false, notified: false },
          { type: 'work', date: new Date(), toggle: false, notified: false }
        ]
      },
      avatar: {
        type: Schema.Types.String
      }
    },
    { timestamps: true }
  );

  type IUser = InferSchemaType<typeof UserSchema>;
  expectType<string | null | undefined>({} as IUser['reminders'][0]['type']);
  expectType<Date | null | undefined>({} as IUser['reminders'][0]['date']);
  expectType<boolean | null | undefined>({} as IUser['reminders'][0]['toggle']);
  expectType<string | null | undefined>({} as IUser['avatar']);
}

function gh14469() {
  interface Names {
    _id: Types.ObjectId;
    firstName: string;
  }
  // Document definition
  interface User {
    names: Names[];
  }

  // TMethodsAndOverrides
  type UserDocumentProps = {
    names: Types.DocumentArray<Names>;
  };
  type UserModelType = Model<User, {}, UserDocumentProps>;

  const userSchema = new Schema<User, UserModelType>(
    {
      names: [new Schema<Names>({ firstName: String })]
    },
    { timestamps: true }
  );

  // Create model
  const UserModel = model<User, UserModelType>('User', userSchema);

  const doc = new UserModel({ names: [{ firstName: 'John' }] });

  const jsonDoc = doc?.toJSON();
  expectType<string>(jsonDoc?.names[0]?.firstName);

  const jsonNames = doc?.names[0]?.toJSON();
  expectType<string>(jsonNames?.firstName);
}
