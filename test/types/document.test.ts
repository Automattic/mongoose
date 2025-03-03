import {
  Schema,
  model,
  Model,
  Query,
  Types,
  HydratedDocument,
  HydratedArraySubdocument,
  HydratedSingleSubdocument,
  DefaultSchemaOptions
} from 'mongoose';
import { DeleteResult } from 'mongodb';
import { expectAssignable, expectError, expectNotAssignable, expectType } from 'tsd';
import { autoTypedModel } from './models.test';
import { autoTypedModelConnection } from './connection.test';
import { AutoTypedSchemaType } from './schema.test';

const Drink = model('Drink', new Schema({
  name: String
}));

const schema: Schema = new Schema({
  name: { type: 'String', required: true },
  address: new Schema({ city: { type: String, required: true } }),
  favoritDrink: {
    type: Schema.Types.ObjectId,
    ref: Drink
  }
});

interface ITestBase {
  name?: string;
}

type ITest = ITestBase;
type TestDocument = ReturnType<Model<{ name?: string }>['hydrate']>;

const Test = model<ITest>('Test', schema);

void async function main() {
  const doc = await Test.findOne().orFail();

  expectType<DeleteResult>(await doc.deleteOne());
  expectType<TestDocument | null>(await doc.deleteOne().findOne());
  expectAssignable<{ _id: Types.ObjectId, name?: string } | null>(await doc.deleteOne().findOne().lean());
  expectNotAssignable<TestDocument | null>(await doc.deleteOne().findOne().lean());
}();


void async function run() {
  const user = new Test({ name: {}, address: {} });
  const error = user.validateSync();
  if (error != null) {
    const _error = error.errors.address;
  }
}();

(function() {
  const test = new Test();
  test.validate({ pathsToSkip: ['hello'] });
  test.validate({ pathsToSkip: 'name age' });
  test.validateSync({ pathsToSkip: ['name', 'age'] });
  test.validateSync({ pathsToSkip: 'name age' });
  test.validateSync({ pathsToSkip: 'name age', blub: 1 });
  const x = test.save();
  expectAssignable<Promise<ITest & { _id: any; }>>(test.save());
  expectAssignable<Promise<ITest & { _id: any; }>>(test.save({}));
})();

function gh10526<U extends ITest>(arg1: Model<U>) {
  const t = new arg1({ name: 'hello' });
}

function testMethods(): void {
  interface IUser {
    first: string;
    last: string;
  }

  interface IUserMethods {
    fullName(): string;
  }

  type User = Model<IUser, {}, IUserMethods>;

  const schema = new Schema<IUser, User>({ first: String, last: String });
  schema.methods.fullName = function(): string {
    return this.first + ' ' + this.last;
  };
  const UserModel = model<IUser, User>('User', schema);

  const doc = new UserModel({ first: 'test', last: 'test' });
  expectType<string>(doc.fullName());
}

function testRequiredId(): void {
  // gh-10657
  interface IFoo {
    _id: string;
    label: string;
  }

  const FooSchema = new Schema<IFoo, Model<IFoo>, IFoo>({
    _id: String,
    label: { type: String }
  });

  const Foo: Model<IFoo> = model<IFoo>('Foo', FooSchema);

  type FooInput = {
    label: string;
  };

  type FooOutput = {
    _id: string;
    label: string;
  };

  const createFoo = async(foo: FooInput): Promise<FooOutput> => {
    return await Foo.create(foo);
  };
}

async function gh11117(): Promise<void> {
  interface Foo {
    someDate: Date;
    someId: Types.ObjectId;
    someNumber: number;
    someString: string;
  }
  const fooSchema = new Schema<Foo, Model<Foo>>({
    someDate: { required: true, type: Date },
    someId: { required: true, type: Schema.Types.ObjectId },
    someNumber: { required: true, type: Number },
    someString: { required: true, type: String }
  });

  const fooModel = model('foos', fooSchema);

  const items = await fooModel.create<Foo>([
    {
      someId: new Types.ObjectId(),
      someDate: new Date(),
      someNumber: 5,
      someString: 'test'
    }
  ]);
  const json = items[0].toJSON();
  expectType<Date>(json.someDate);
}

function gh11085(): void {
  interface User {
    username: string;
    email: string;
  }

  const userSchema = new Schema<User>({
    username: String,
    email: String
  });

  const UserModel = model('User', userSchema);

  const newUser = new UserModel();

  let _id: number;
  expectError(_id = newUser._id);
  const _id2: Types.ObjectId = newUser._id;
}

function gh11435() {
  interface Item {
    name: string;
  }
  const ItemSchema = new Schema<Item>({ name: String });

  ItemSchema.pre('validate', function preValidate() {
    expectType<Model<unknown>>(this.$model('Item1'));
  });
}

async function gh11598() {
  const doc = await Test.findOne().orFail();
  doc.populate('favoritDrink', undefined, model('temp', new Schema()));
}

function autoTypedDocument() {
  const AutoTypedModel = autoTypedModel();
  const AutoTypeModelInstance = new AutoTypedModel({ unExistProperty: 1, description: 2 });

  expectType<AutoTypedSchemaType['schema']['userName']>(AutoTypeModelInstance.userName);
  expectType<AutoTypedSchemaType['schema']['favoritDrink']>(AutoTypeModelInstance.favoritDrink);
  expectType<AutoTypedSchemaType['schema']['favoritColorMode']>(AutoTypeModelInstance.favoritColorMode);

  // Document-Methods-tests
  expectType<ReturnType<AutoTypedSchemaType['methods']['instanceFn']>>(new AutoTypedModel().instanceFn());

}

function autoTypedDocumentConnection() {
  const AutoTypedModel = autoTypedModelConnection();
  const AutoTypeModelInstance = new AutoTypedModel({ unExistProperty: 1, description: 2 });

  expectType<AutoTypedSchemaType['schema']['userName']>(AutoTypeModelInstance.userName);
  expectType<AutoTypedSchemaType['schema']['favoritDrink']>(AutoTypeModelInstance.favoritDrink);
  expectType<AutoTypedSchemaType['schema']['favoritColorMode']>(AutoTypeModelInstance.favoritColorMode);

  // Document-Methods-tests
  expectType<ReturnType<AutoTypedSchemaType['methods']['instanceFn']>>(new AutoTypedModel().instanceFn());

}

async function gh11960() {
  interface Nested {
    dummy?: string;
  }

  interface Parent {
    username?: string;
    map?: Map<string, string>;
    nested?: Nested;
    nestedArray?: Nested[];
  }

  type ParentDocument = HydratedDocument<Parent, {
    nested: HydratedSingleSubdocument<Nested>,
    nestedArray: HydratedArraySubdocument<Nested>[]
  }>;

  const NestedSchema = new Schema({
    dummy: { type: String }
  });

  type ParentModelType = Model<Parent, {}, {}, {}, ParentDocument>;

  const ParentSchema = new Schema<
  Parent,
  ParentModelType,
  {},
  {},
  {},
  {},
  DefaultSchemaOptions,
  Parent,
  ParentDocument
  >({
    username: { type: String },
    map: { type: Map, of: String },
    nested: { type: NestedSchema },
    nestedArray: [{ type: NestedSchema }]
  });

  const ParentModel = model<Parent, ParentModelType>('Parent', ParentSchema);

  {
    const doc = new ParentModel({
      username: 'user1',
      map: { key1: 'value1', key2: 'value2' },
      nested: { dummy: 'hello' },
      nestedArray: [{ dummy: 'hello again' }]
    });

    expectType<ParentDocument>(doc);
    expectType<Map<string, string> | undefined>(doc.map);
    doc.nested!.parent();
    doc.nestedArray?.[0].parentArray();
  }

  {
    const doc = await ParentModel.create({
      username: 'user1',
      map: { key1: 'value1', key2: 'value2' },
      nested: { dummy: 'hello' },
      nestedArray: [{ dummy: 'hello again' }]
    });

    expectType<ParentDocument>(doc);
    expectType<Map<string, string> | undefined>(doc.map);
    doc.nested!.parent();
    doc.nestedArray?.[0].parentArray();
  }
}

function gh12290() {
  interface IUser{
    name: string;
    age: number;
  }
  const schema = new Schema<IUser>({
    name: String,
    age: Number
  });
  const User = model<IUser>('User', schema);
  const user = new User({ name: 'John', age: 30 });
  user.isDirectModified(['name', 'age']);
  user.isDirectModified('name age');
  user.isDirectModified('name');
}

function gh13878() {
  const schema = new Schema({
    name: String,
    age: Number
  });
  const User = model('User', schema);
  const user = new User({ name: 'John', age: 30 });
  expectType<typeof User>(user.$model());
  expectType<typeof User>(user.model());
}

function gh13094() {
  type UserDocumentNever = HydratedDocument<{ name: string }, Record<string, never>>;

  const doc: UserDocumentNever = null as any;
  expectType<string>(doc.name);

  // The following currently fails.
  /* type UserDocumentUnknown = HydratedDocument<{ name: string }, Record<string, unknown>>;

  const doc2: UserDocumentUnknown = null as any;
  expectType<string>(doc2.name); */

  // The following currently fails.
  /* type UserDocumentAny = HydratedDocument<{ name: string }, Record<string, any>>;

  const doc3: UserDocumentAny = null as any;
  expectType<string>(doc3.name); */
}

function gh13738() {
  interface IPerson {
    age: number;
    dob: Date;
    settings: {
      theme: string;
      alerts: {
        sms: boolean;
      }
    }
  }

  const schema = new Schema<IPerson>({
    age: Number,
    dob: Date,
    settings: {
      theme: String,
      alerts: {
        sms: Boolean
      }
    }
  });

  const Person = model<IPerson>('Person', schema);

  const person = new Person({ name: 'person', dob: new Date(), settings: { alerts: { sms: true }, theme: 'light' } });

  expectType<number>(person.get('age'));
  expectType<Date>(person.get('dob'));
  expectType<{ theme: string; alerts: { sms: boolean } }>(person.get('settings'));
}

async function gh12959() {
  const subdocSchema = new Schema({ foo: { type: 'string', required: true } });

  const schema = new Schema({
    subdocArray: { type: [subdocSchema], required: true }
  });

  const Model = model('test', schema);

  const doc = await Model.findById('id').orFail();
  expectType<Types.ObjectId>(doc._id);
  expectType<number>(doc.__v);

  expectError(doc.subdocArray[0].__v);
}

async function gh14876() {
  type CarObjectInterface = {
    make: string;
    model: string;
    year: number;
    owner: Types.ObjectId;
  };
  const carSchema = new Schema<CarObjectInterface>({
    make: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User' }
  });

  type UserObjectInterface = {
    name: string;
    age: number;
  };
  const userSchema = new Schema<UserObjectInterface>({
    name: String,
    age: Number
  });

  const Car = model<CarObjectInterface>('Car', carSchema);
  const User = model<UserObjectInterface>('User', userSchema);

  const user = await User.create({ name: 'John', age: 25 });
  const car = await Car.create({
    make: 'Toyota',
    model: 'Camry',
    year: 2020,
    owner: user._id
  });

  const populatedCar = await Car.findById(car._id)
    .populate<{ owner: UserObjectInterface }>('owner')
    .exec();

  if (!populatedCar) return;

  console.log(populatedCar.owner.name); // outputs John

  const depopulatedCar = populatedCar.depopulate<{ owner: Types.ObjectId }>('owner');

  expectType<UserObjectInterface>(populatedCar.owner);
  expectType<Types.ObjectId>(depopulatedCar.owner);
}

async function gh15077() {
  type Foo = {
    state: 'on' | 'off';
  };

  const fooSchema = new Schema<Foo>(
    {
      state: {
        type: String,
        enum: ['on', 'off']
      }
    },
    { timestamps: true }
  );

  const fooModel = model('foo', fooSchema);

  let foundFoo = await fooModel
    .findOne({
      state: 'on'
    })
    .lean()
    .exec();

  if (!foundFoo) {
    const newFoo = {
      state: 'on'
      // extra props but irrelevant
    };

    const createdFoo = await fooModel.create(newFoo);

    foundFoo = createdFoo.toObject();
  }
}
