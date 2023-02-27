import { Schema, model, Model, Document, Types } from 'mongoose';

const childSchema: Schema = new Schema({ name: String });

const schema: Schema = new Schema({
  child1: childSchema,
  child2: {
    type: childSchema,
    _id: false
  },
  docarr1: [childSchema],
  docarr2: [{
    type: childSchema,
    _id: false
  }]
});

interface ITest extends Document {
  child1: { _id: Types.ObjectId, name: string },
  child2: { name: string }
}

const Test = model<ITest>('Test', schema);

const doc: ITest = new Test({});

doc.child1 = { _id: new Types.ObjectId(), name: 'test1' };
doc.child2 = { name: 'test2' };


async function gh10597(): Promise<void> {
  interface IGameEvent {
    description: string;
  }
  type IGameEventDocument = IGameEvent & Types.Subdocument;

  interface IGameDocument extends Document {
    name: string;
    events: IGameEventDocument[]
  }
  const schema = new Schema<IGameDocument>({ name: String, events: [{ description: String }] });

  const GameModel = model<IGameDocument>('Game', schema);

  const doc = await GameModel.findOne().orFail();
  await doc.updateOne({ events: [{ description: 'test' }] });
}

function gh10674() {
  type Foo = {
    bar: string
    schedule: {
      date: string;
      hours: number;
    }[];
  };

  type FooModel = Model<Foo>;

  const FooSchema = new Schema<Foo, FooModel, Foo>(
    {
      bar: { type: String },
      schedule: {
        type: [
          {
            date: { type: String, required: true },
            hours: { type: Number, required: true }
          }
        ],
        required: true
      }
    }
  );
}

async function gh10947(): Promise<void> {
  await Test.findOneAndUpdate({}, { child1: { name: 'foo' } });
}

function gh13040(): void {
  interface Product {}

  interface User {
    products: Product[];
  }

  // I want my `UserDocument` type to define `products` as a `DocumentArray`; I'll do this using overrides

  interface UserOverrides {
    products: Types.DocumentArray<Product>;
  }

  type UserModel = Model<User, {}, UserOverrides>;

  // Here I determine the type of user documents; I could also manually define a `HydratedDocument` - makes no difference.

  type UserDocument = InstanceType<UserModel>;

  // Assume I have an instance of `UserDocument`

  let user!: UserDocument;

  // This is then fine:

  user.products[0].ownerDocument(); // ok

  user.products.forEach(product => {
    product.ownerDocument();
  });
}
