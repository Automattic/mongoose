import {
  Schema,
  model,
  Model,
  Query,
  Types,
  HydratedDocument,
  HydratedArraySubdocument,
  HydratedSingleSubdocument,
  DefaultSchemaOptions,
  ObtainSchemaGeneric,
  ResolveSchemaOptions
} from 'mongoose';
import { DeleteResult } from 'mongodb';
import { autoTypedModel } from './models.test';
import { autoTypedModelConnection } from './connection.test';
import { AutoTypedSchemaType } from './schema.test';
import { expect } from 'tstyche';

const Drink = model('Drink', new Schema({
  name: String
}));

const schema = new Schema({
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

  expect(await doc.deleteOne()).type.toBe<DeleteResult>();
  expect(await doc.deleteOne().findOne()).type.toBe<TestDocument | null>();
  expect(await doc.deleteOne().findOne().lean()).type.toBeAssignableTo<{ _id: Types.ObjectId, name?: string } | null>();
  expect(await doc.deleteOne().findOne().lean()).type.not.toBeAssignableTo<TestDocument | null>();
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
  expect(test.save()).type.toBeAssignableTo<Promise<ITest & { _id: any; }>>();
  expect(test.save({})).type.toBeAssignableTo<Promise<ITest & { _id: any; }>>();
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
  expect(doc.fullName()).type.toBe<string>();
}

function gh10657(): void {
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

  const items = await fooModel.create([
    {
      someId: new Types.ObjectId(),
      someDate: new Date(),
      someNumber: 5,
      someString: 'test'
    }
  ]);
  const json = items[0].toJSON();
  expect(json.someDate).type.toBe<Date>();
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

  const _id2: Types.ObjectId = newUser._id;
}

function gh11435() {
  interface Item {
    name: string;
  }
  const ItemSchema = new Schema<Item>({ name: String });

  ItemSchema.pre('validate', function preValidate() {
    expect(this.$model('Item1')).type.toBe<Model<unknown>>();
    expect(this.model('Item1')).type.toBe<Model<unknown>>();
  });
}

async function gh11598() {
  const doc = await Test.findOne().orFail();
  doc.populate('favoritDrink', undefined, model('temp', new Schema()));
}

function autoTypedDocument() {
  const AutoTypedModel = autoTypedModel();
  const AutoTypeModelInstance = new AutoTypedModel({ unExistProperty: 1, description: 2 });

  expect(AutoTypeModelInstance.userName).type.toBe<AutoTypedSchemaType['schema']['userName']>();
  expect(AutoTypeModelInstance.favoritDrink).type.toBe<AutoTypedSchemaType['schema']['favoritDrink']>();
  expect(AutoTypeModelInstance.favoritColorMode).type.toBe<AutoTypedSchemaType['schema']['favoritColorMode']>();

  // Document-Methods-tests
  expect(new AutoTypedModel().instanceFn()).type.toBe<ReturnType<AutoTypedSchemaType['methods']['instanceFn']>>();

}

function autoTypedDocumentConnection() {
  const AutoTypedModel = autoTypedModelConnection();
  const AutoTypeModelInstance = new AutoTypedModel({ unExistProperty: 1, description: 2 });

  expect(AutoTypeModelInstance.userName).type.toBe<AutoTypedSchemaType['schema']['userName']>();
  expect(AutoTypeModelInstance.favoritDrink).type.toBe<AutoTypedSchemaType['schema']['favoritDrink']>();
  expect(AutoTypeModelInstance.favoritColorMode).type.toBe<AutoTypedSchemaType['schema']['favoritColorMode']>();

  // Document-Methods-tests
  expect(new AutoTypedModel().instanceFn()).type.toBe<ReturnType<AutoTypedSchemaType['methods']['instanceFn']>>();

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

    expect(doc).type.toBe<ParentDocument>();
    expect(doc.map).type.toBe<Map<string, string> | undefined>();
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

    expect(doc).type.toBe<ParentDocument>();
    expect(doc.map).type.toBe<Map<string, string> | undefined>();
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
  expect(user.$model()).type.toBeAssignableTo(User);
  expect(user.model()).type.toBeAssignableTo(User);
}

function gh13094() {
  type UserDocumentNever = HydratedDocument<{ name: string }, Record<string, never>>;

  const doc: UserDocumentNever = null as any;
  expect(doc.name).type.toBe<string>();
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

  expect(person.get('age')).type.toBe<number>();
  expect(person.get('dob')).type.toBe<Date>();
  expect(person.get('settings')).type.toBe<{ theme: string; alerts: { sms: boolean } }>();
}

async function gh12959() {
  const subdocSchema = new Schema({ foo: { type: 'string', required: true } });

  const schema = new Schema({
    subdocArray: { type: [subdocSchema], required: true }
  });

  const Model = model('test', schema);

  const doc = await Model.findById('id').orFail();
  expect(doc._id).type.toBe<Types.ObjectId>();
  expect(doc.__v).type.toBe<number>();
  expect(doc.subdocArray[0]).type.not.toHaveProperty('__v');
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

  expect(populatedCar.owner).type.toBe<UserObjectInterface>();
  expect(depopulatedCar.owner).type.toBe<Types.ObjectId>();
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

async function gh15316() {
  const schema = new Schema({
    name: { type: String, required: true }
  }, {
    virtuals: {
      upper: { get() { return this.name.toUpperCase(); } }
    }
  });
  const TestModel = model('Test', schema);

  const doc = new TestModel({ name: 'taco' });

  expect(doc.toJSON({ virtuals: true }).upper).type.toBe<string>();
  expect(doc.toObject({ virtuals: true }).upper).type.toBe<string>();
}

function gh15965() {
  const FooSchema = new Schema({
    foo: { type: String }
  });

  const PodcastSchema = new Schema({
    a: { type: FooSchema },
    b: { type: FooSchema, required: true },
    c: { type: String },
    d: { type: String, required: true }
  }, {
    timestamps: true,
    virtuals: {
      hello: { get() { return 'hello world'; } }
    }
  });
  const RootModel = model('Root', PodcastSchema);
  const root = new RootModel({ b: { foo: 'b' }, d: 'd' });
  const obj = root.toObject({
    flattenMaps: true,
    flattenObjectIds: true,
    versionKey: true,
    virtuals: true
  });

  expect(obj.id).type.toBe<string>();
  expect(obj.a?.foo).type.toBe<string | null | undefined>();
  expect(obj.b.foo).type.toBe<string | null | undefined>();
  expect(obj.c).type.toBe<string | null | undefined>();
  expect(obj.d).type.toBe<string>();
  expect(obj.hello).type.toBe<string>();
  expect(obj.createdAt).type.toBe<Date>();
  expect(obj.updatedAt).type.toBe<Date>();
}

function gh15965SubdocToObject() {
  const documentSchema = new Schema({
    title: { type: String, required: true },
    text: { type: String, required: true }
  });

  const podcastSchema = new Schema({
    documents: [documentSchema]
  }, {
    timestamps: true,
    virtuals: { hello: { get() { return 'world'; } } }
  });

  const Podcast = model('Podcast', podcastSchema);
  const podcast = new Podcast({ documents: [{ title: 'test', text: 'body' }] });
  const subdoc = podcast.documents[0];

  const obj = subdoc.toObject({ flattenObjectIds: true, versionKey: false, virtuals: true });

  expect(obj.title).type.toBe<string>();
  expect(obj.text).type.toBe<string>();
  expect(obj).type.not.toHaveProperty('doesNotExist');
}

function gh13079() {
  const schema = new Schema({
    name: { type: String, required: true }
  });
  const TestModel = model('Test', schema);

  const doc = new TestModel({ name: 'taco' });
  expect(doc.id).type.toBe<string>();

  const schema2 = new Schema({
    id: { type: Number, required: true },
    name: { type: String, required: true }
  });
  const TestModel2 = model('Test', schema2);

  const doc2 = new TestModel2({ name: 'taco' });
  expect(doc2.id).type.toBe<number>();

  const schema3 = new Schema<{ name: string }>({
    name: { type: String, required: true }
  });
  const TestModel3 = model('Test', schema3);

  const doc3 = new TestModel3({ name: 'taco' });
  expect(doc3.id).type.toBe<string>();

  const schema4 = new Schema<{ name: string, id: number }>({
    id: { type: Number, required: true },
    name: { type: String, required: true }
  });
  const TestModel4 = model('Test', schema4);

  const doc4 = new TestModel4({ name: 'taco' });
  expect(doc4.id).type.toBe<number>();

  const schema5 = new Schema({
    name: { type: String, required: true }
  }, { id: false });
  const TestModel5 = model('Test', schema5);

  const doc5 = new TestModel5({ name: 'taco' });
  expect(doc5).type.not.toHaveProperty('id');
}

async function toBSON() {
  const schema = new Schema({
    name: String
  });

  const Model = model('test', schema);

  const doc = new Model({ name: 'test' });
  expect(doc.toBSON()).type.toBe<{ name?: string | null } & { _id: Types.ObjectId }>();
}

async function gh15578() {
  function withDocType() {
    interface RawDocType {
      _id: Types.ObjectId;
      testProperty: number;
    }

    const ASchema = new Schema<RawDocType>({
      testProperty: Number
    });

    const AModel = model<RawDocType>('YourModel', ASchema);

    const a = new AModel({ testProperty: 8 });
    const toObjectFlattened: Omit<RawDocType, '_id'> & { _id: string } = a.toObject({ flattenObjectIds: true });
    const toObjectWithVirtuals: Omit<RawDocType, '_id'> & { _id: string } = a.toObject({ virtuals: true, flattenObjectIds: true });
    const toObjectWithoutVirtuals: Omit<RawDocType, '_id'> & { _id: string } = a.toObject({ virtuals: false, flattenObjectIds: true });
    const toJSONFlattened: Omit<RawDocType, '_id'> & { _id: string } = a.toJSON({ flattenObjectIds: true });
    const toJSONWithVirtuals: Omit<RawDocType, '_id'> & { _id: string } = a.toJSON({ virtuals: true, flattenObjectIds: true });
    const toJSONWithoutVirtuals: Omit<RawDocType, '_id'> & { _id: string } = a.toJSON({ virtuals: false, flattenObjectIds: true });

    const objWithoutVersionKey = a.toObject({ versionKey: false });
    const jsonWithoutVersionKey = a.toJSON({ versionKey: false });
    expect(objWithoutVersionKey).type.not.toHaveProperty('__v');
    expect(jsonWithoutVersionKey).type.not.toHaveProperty('__v');

    const objWithVersionKey = a.toObject();
    const jsonWithVersionKey = a.toJSON();
    expect(objWithVersionKey.__v).type.toBe<number>();
    expect(jsonWithVersionKey.__v).type.toBe<number>();
  }

  function withDocTypeAndVersionKey() {
    interface RawDocType {
      _id: Types.ObjectId;
      testProperty: number;
    }

    const schemaOptions = { versionKey: 'taco' } as const;

    type ModelType = Model<RawDocType, {}, {}, {}, HydratedDocument<RawDocType, {}, {}, {}, RawDocType, typeof schemaOptions>>;

    const ASchema = new Schema<RawDocType, ModelType, {}, {}, {}, {}, typeof schemaOptions>({
      testProperty: Number
    }, schemaOptions);

    const AModel = model<RawDocType, ModelType>('YourModel', ASchema);

    const a = new AModel({ testProperty: 8 });
    const toObjectFlattened: Omit<RawDocType, '_id'> & { _id: string } = a.toObject({ flattenObjectIds: true });
    const toObjectWithVirtuals: Omit<RawDocType, '_id'> & { _id: string } = a.toObject({ virtuals: true, flattenObjectIds: true });
    const toObjectWithoutVirtuals: Omit<RawDocType, '_id'> & { _id: string } = a.toObject({ virtuals: false, flattenObjectIds: true });
    const toJSONFlattened: Omit<RawDocType, '_id'> & { _id: string } = a.toJSON({ flattenObjectIds: true });
    const toJSONWithVirtuals: Omit<RawDocType, '_id'> & { _id: string } = a.toJSON({ virtuals: true, flattenObjectIds: true });
    const toJSONWithoutVirtuals: Omit<RawDocType, '_id'> & { _id: string } = a.toJSON({ virtuals: false, flattenObjectIds: true });

    const objWithoutVersionKey = a.toObject({ versionKey: false });
    const jsonWithoutVersionKey = a.toJSON({ versionKey: false });
    expect(objWithoutVersionKey).type.not.toHaveProperty('__v');
    expect(jsonWithoutVersionKey).type.not.toHaveProperty('__v');

    const objWithVersionKey = a.toObject();
    const jsonWithVersionKey = a.toJSON();
    expect(objWithVersionKey.taco).type.toBe<number>();
    expect(jsonWithVersionKey.taco).type.toBe<number>();
  }

  function autoInferred() {
    interface RawDocType {
      _id: Types.ObjectId;
      testProperty?: number | null;
    }

    const ASchema = new Schema({
      testProperty: Number
    });

    const AModel = model('YourModel', ASchema);

    const a = new AModel({ testProperty: 8 });
    const toObjectFlattened: Omit<RawDocType, '_id'> & { _id: string } = a.toObject({ flattenObjectIds: true });
    const toObjectWithVirtuals: Omit<RawDocType, '_id'> & { _id: string } = a.toObject({ virtuals: true, flattenObjectIds: true });
    const toObjectWithoutVirtuals: Omit<RawDocType, '_id'> & { _id: string } = a.toObject({ virtuals: false, flattenObjectIds: true });
    const toJSONFlattened: Omit<RawDocType, '_id'> & { _id: string } = a.toJSON({ flattenObjectIds: true });
    const toJSONWithVirtuals: Omit<RawDocType, '_id'> & { _id: string } = a.toJSON({ virtuals: true, flattenObjectIds: true });
    const toJSONWithoutVirtuals: Omit<RawDocType, '_id'> & { _id: string } = a.toJSON({ virtuals: false, flattenObjectIds: true });

    // When passing options, __v should still be present
    expect(a.toObject({ flattenObjectIds: true }).__v).type.toBe<number>();
    expect(a.toJSON({ flattenObjectIds: true }).__v).type.toBe<number>();

    const objWithoutVersionKey = a.toObject({ versionKey: false });
    const jsonWithoutVersionKey = a.toJSON({ versionKey: false });
    expect(objWithoutVersionKey).type.not.toHaveProperty('__v');
    expect(jsonWithoutVersionKey).type.not.toHaveProperty('__v');

    const objWithVersionKey = a.toObject();
    const jsonWithVersionKey = a.toJSON();
    expect(objWithVersionKey.__v).type.toBe<number>();
    expect(jsonWithVersionKey.__v).type.toBe<number>();
  }

  function autoInferredWithCustomVersionKey() {
    interface RawDocType {
      _id: Types.ObjectId;
      testProperty?: number | null;
    }

    const ASchema = new Schema({
      testProperty: Number
    }, { versionKey: 'taco' });

    const AModel = model('YourModel', ASchema);

    type TSchemaOptions = ResolveSchemaOptions<ObtainSchemaGeneric<typeof ASchema, 'TSchemaOptions'>>;

    const a = new AModel({ testProperty: 8 });
    const toObjectFlattened: Omit<RawDocType, '_id'> & { _id: string } = a.toObject({ flattenObjectIds: true });
    const toObjectWithVirtuals: Omit<RawDocType, '_id'> & { _id: string } = a.toObject({ virtuals: true, flattenObjectIds: true });
    const toObjectWithoutVirtuals: Omit<RawDocType, '_id'> & { _id: string } = a.toObject({ virtuals: false, flattenObjectIds: true });
    const toJSONFlattened: Omit<RawDocType, '_id'> & { _id: string } = a.toJSON({ flattenObjectIds: true });
    const toJSONWithVirtuals: Omit<RawDocType, '_id'> & { _id: string } = a.toJSON({ virtuals: true, flattenObjectIds: true });
    const toJSONWithoutVirtuals: Omit<RawDocType, '_id'> & { _id: string } = a.toJSON({ virtuals: false, flattenObjectIds: true });

    // When passing options, custom version key should still be present
    expect(a.toObject({ flattenObjectIds: true }).taco).type.toBe<number>();
    expect(a.toJSON({ flattenObjectIds: true }).taco).type.toBe<number>();

    const objWithoutVersionKey = a.toObject({ versionKey: false });
    const jsonWithoutVersionKey = a.toJSON({ versionKey: false });
    expect(objWithoutVersionKey).type.not.toHaveProperty('__v');
    expect(jsonWithoutVersionKey).type.not.toHaveProperty('__v');

    const objWithVersionKey = a.toObject();
    const jsonWithVersionKey = a.toJSON();
    expect(objWithVersionKey.taco).type.toBe<number>();
    expect(jsonWithVersionKey.taco).type.toBe<number>();
  }
}

function testFlattenUUIDs() {
  interface RawDocType {
    _id: Types.UUID;
    uuid: Types.UUID;
  }

  const ASchema = new Schema<RawDocType>({
    _id: Schema.Types.UUID,
    uuid: Schema.Types.UUID
  });

  const AModel = model<RawDocType>('UUIDModel', ASchema);

  const a = new AModel({
    uuid: new Types.UUID()
  });

  // Test flattenUUIDs: true converts UUIDs to strings
  const toObjectFlattened = a.toObject({ flattenUUIDs: true });
  const toJSONFlattened = a.toJSON({ flattenUUIDs: true });

  expect(toObjectFlattened._id).type.toBe<string>();
  expect(toObjectFlattened.uuid).type.toBe<string>();
  expect(toJSONFlattened._id).type.toBe<string>();
  expect(toJSONFlattened.uuid).type.toBe<string>();

  // Test with virtuals
  const toObjectWithVirtuals = a.toObject({ flattenUUIDs: true, virtuals: true });
  const toJSONWithVirtuals = a.toJSON({ flattenUUIDs: true, virtuals: true });

  expect(toObjectWithVirtuals._id).type.toBe<string>();
  expect(toObjectWithVirtuals.uuid).type.toBe<string>();
  expect(toJSONWithVirtuals._id).type.toBe<string>();
  expect(toJSONWithVirtuals.uuid).type.toBe<string>();

  // Test flattenUUIDs: false (default behavior - should remain UUID)
  const toObjectNotFlattened = a.toObject({ flattenUUIDs: false });
  const toJSONNotFlattened = a.toJSON({ flattenUUIDs: false });
  expect(toObjectNotFlattened._id).type.toBe<Types.UUID>();
  expect(toObjectNotFlattened.uuid).type.toBe<Types.UUID>();
  expect(toJSONNotFlattened._id).type.toBe<Types.UUID>();
  expect(toJSONNotFlattened.uuid).type.toBe<Types.UUID>();

  // Test default (no flattenUUIDs option - should remain UUID)
  const toObjectDefault = a.toObject();
  const toJSONDefault = a.toJSON();
  expect(toObjectDefault._id).type.toBe<Types.UUID>();
  expect(toObjectDefault.uuid).type.toBe<Types.UUID>();
  expect(toJSONDefault._id).type.toBe<Types.UUID>();
  expect(toJSONDefault.uuid).type.toBe<Types.UUID>();
}

function testCombinedFlattenOptions() {
  interface RawDocType {
    _id: Types.ObjectId;
    uuid: Types.UUID;
    name: string;
    tags: Map<string, string>;
  }

  interface Virtuals {
    displayName: string;
  }

  const ASchema = new Schema<RawDocType, Model<RawDocType, {}, {}, Virtuals>, {}, {}, Virtuals>({
    uuid: Schema.Types.UUID,
    name: String,
    tags: { type: Map, of: String }
  });

  ASchema.virtual('displayName').get(function() {
    return this.name.toUpperCase();
  });

  const AModel = model<RawDocType, Model<RawDocType, {}, {}, Virtuals>>('CombinedModel', ASchema);

  const a = new AModel({
    uuid: new Types.UUID(),
    name: 'Test',
    tags: new Map([['key', 'value']])
  });

  // Test flattenUUIDs + flattenObjectIds
  const uuidAndObjectId = a.toObject({ flattenUUIDs: true, flattenObjectIds: true });
  expect(uuidAndObjectId._id).type.toBe<string>();
  expect(uuidAndObjectId.uuid).type.toBe<string>();

  // Test flattenUUIDs + flattenMaps
  const uuidAndMaps = a.toObject({ flattenUUIDs: true, flattenMaps: true });
  expect(uuidAndMaps.uuid).type.toBe<string>();
  expect(uuidAndMaps.tags).type.toBe<Record<string, string>>();

  // Test flattenUUIDs + virtuals
  const uuidAndVirtuals = a.toObject({ flattenUUIDs: true, virtuals: true });
  expect(uuidAndVirtuals.uuid).type.toBe<string>();
  expect(uuidAndVirtuals.displayName).type.toBe<string>();

  // Test flattenObjectIds + flattenMaps
  const objectIdAndMaps = a.toObject({ flattenObjectIds: true, flattenMaps: true });
  expect(objectIdAndMaps._id).type.toBe<string>();
  expect(objectIdAndMaps.tags).type.toBe<Record<string, string>>();

  // Test flattenObjectIds + virtuals
  const objectIdAndVirtuals = a.toObject({ flattenObjectIds: true, virtuals: true });
  expect(objectIdAndVirtuals._id).type.toBe<string>();
  expect(objectIdAndVirtuals.displayName).type.toBe<string>();

  // Test flattenMaps + virtuals
  const mapsAndVirtuals = a.toObject({ flattenMaps: true, virtuals: true });
  expect(mapsAndVirtuals.tags).type.toBe<Record<string, string>>();
  expect(mapsAndVirtuals.displayName).type.toBe<string>();

  // Test triple combinations
  const uuidObjectIdMaps = a.toObject({ flattenUUIDs: true, flattenObjectIds: true, flattenMaps: true });
  expect(uuidObjectIdMaps._id).type.toBe<string>();
  expect(uuidObjectIdMaps.uuid).type.toBe<string>();
  expect(uuidObjectIdMaps.tags).type.toBe<Record<string, string>>();

  const uuidObjectIdVirtuals = a.toObject({ flattenUUIDs: true, flattenObjectIds: true, virtuals: true });
  expect(uuidObjectIdVirtuals._id).type.toBe<string>();
  expect(uuidObjectIdVirtuals.uuid).type.toBe<string>();
  expect(uuidObjectIdVirtuals.displayName).type.toBe<string>();

  // Test all four options
  const allFour = a.toObject({ flattenUUIDs: true, flattenObjectIds: true, flattenMaps: true, virtuals: true });
  expect(allFour._id).type.toBe<string>();
  expect(allFour.uuid).type.toBe<string>();
  expect(allFour.tags).type.toBe<Record<string, string>>();
  expect(allFour.displayName).type.toBe<string>();

  // Same tests for toJSON
  const allFourJSON = a.toJSON({ flattenUUIDs: true, flattenObjectIds: true, flattenMaps: true, virtuals: true });
  expect(allFourJSON._id).type.toBe<string>();
  expect(allFourJSON.uuid).type.toBe<string>();
  expect(allFourJSON.tags).type.toBe<Record<string, string>>();
  expect(allFourJSON.displayName).type.toBe<string>();
}

function testObjectIdsInsideMaps() {
  // Test that ObjectIds/UUIDs nested inside Map values are correctly converted
  interface DocWithMapOfObjectIds {
    _id: Types.ObjectId;
    userRefs: Map<string, { orderId: Types.ObjectId }>;
    uuidRefs: Map<string, { refId: Types.UUID }>;
  }

  const schema = new Schema<DocWithMapOfObjectIds>({
    userRefs: { type: Map, of: { orderId: Schema.Types.ObjectId } },
    uuidRefs: { type: Map, of: { refId: Schema.Types.UUID } }
  });

  const Model = model<DocWithMapOfObjectIds>('MapOfObjectIds', schema);
  const doc = new Model({});

  // When using flattenMaps + flattenObjectIds, ObjectIds inside Map values should be converted
  const flattened = doc.toObject({ flattenMaps: true, flattenObjectIds: true });
  expect(flattened.userRefs).type.toBe<Record<string, { orderId: string }>>();

  // When using flattenMaps + flattenUUIDs, UUIDs inside Map values should be converted
  const flattenedUUIDs = doc.toObject({ flattenMaps: true, flattenUUIDs: true });
  expect(flattenedUUIDs.uuidRefs).type.toBe<Record<string, { refId: string }>>();

  // All three together
  const allThree = doc.toObject({ flattenMaps: true, flattenObjectIds: true, flattenUUIDs: true });
  expect(allThree.userRefs).type.toBe<Record<string, { orderId: string }>>();
  expect(allThree.uuidRefs).type.toBe<Record<string, { refId: string }>>();
  expect(allThree._id).type.toBe<string>();
}

async function gh15900() {
  // Test that id virtual is available when using model<T>() with explicit generic
  interface IUser {
    name: string;
    email: string;
  }

  const userSchema = new Schema<IUser>({
    name: { type: String, required: true },
    email: { type: String, required: true }
  });

  const User = model<IUser>('User', userSchema);

  const user = new User({
    name: 'Bill',
    email: 'bill@initech.com'
  });

  // id virtual should be available
  expect(user.id).type.toBe<string>();

  // Test that id virtual is NOT added when doc type already has id
  interface IUserWithId {
    id: number;
    name: string;
  }

  const userWithIdSchema = new Schema<IUserWithId>({
    id: { type: Number, required: true },
    name: { type: String, required: true }
  });

  const UserWithId = model<IUserWithId>('UserWithId', userWithIdSchema);

  const userWithId = new UserWithId({
    id: 123,
    name: 'Jane'
  });

  // id should be number, not string virtual
  expect(userWithId.id).type.toBe<number>();
}
