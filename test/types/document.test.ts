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
import { ExpectAssignable, ExpectType } from './util/assertions';

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

  ExpectType<DeleteResult>(await doc.deleteOne());
  ExpectType<TestDocument | null>(await doc.deleteOne().findOne());
  ExpectAssignable<{ _id: Types.ObjectId, name?: string } | null>()(await doc.deleteOne().findOne().lean());
  // @ts-expect-error invalid assignment
  const v: TestDocument | null = await doc.deleteOne().findOne().lean();
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
  ExpectAssignable<Promise<ITest & { _id: any; }>>()(test.save());
  ExpectAssignable<Promise<ITest & { _id: any; }>>()(test.save({}));
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
  ExpectType<string>(doc.fullName());
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

  const items = await fooModel.create([
    {
      someId: new Types.ObjectId(),
      someDate: new Date(),
      someNumber: 5,
      someString: 'test'
    }
  ]);
  const json = items[0].toJSON();
  ExpectType<Date>(json.someDate);
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
    ExpectType<Model<unknown>>(this.$model('Item1'));
  });
}

async function gh11598() {
  const doc = await Test.findOne().orFail();
  doc.populate('favoritDrink', undefined, model('temp', new Schema()));
}

function autoTypedDocument() {
  const AutoTypedModel = autoTypedModel();
  const AutoTypeModelInstance = new AutoTypedModel({ unExistProperty: 1, description: 2 });

  ExpectType<AutoTypedSchemaType['schema']['userName']>(AutoTypeModelInstance.userName);
  ExpectType<AutoTypedSchemaType['schema']['favoritDrink']>(AutoTypeModelInstance.favoritDrink);
  ExpectType<AutoTypedSchemaType['schema']['favoritColorMode']>(AutoTypeModelInstance.favoritColorMode);

  // Document-Methods-tests
  ExpectType<ReturnType<AutoTypedSchemaType['methods']['instanceFn']>>(new AutoTypedModel().instanceFn());

}

function autoTypedDocumentConnection() {
  const AutoTypedModel = autoTypedModelConnection();
  const AutoTypeModelInstance = new AutoTypedModel({ unExistProperty: 1, description: 2 });

  ExpectType<AutoTypedSchemaType['schema']['userName']>(AutoTypeModelInstance.userName);
  ExpectType<AutoTypedSchemaType['schema']['favoritDrink']>(AutoTypeModelInstance.favoritDrink);
  ExpectType<AutoTypedSchemaType['schema']['favoritColorMode']>(AutoTypeModelInstance.favoritColorMode);

  // Document-Methods-tests
  ExpectType<ReturnType<AutoTypedSchemaType['methods']['instanceFn']>>(new AutoTypedModel().instanceFn());

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

    ExpectType<ParentDocument>(doc);
    ExpectType<Map<string, string> | undefined>(doc.map);
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

    ExpectType<ParentDocument>(doc);
    ExpectType<Map<string, string> | undefined>(doc.map);
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
  ExpectType<typeof User>(user.$model());
  ExpectType<typeof User>(user.model());
}

function gh13094() {
  type UserDocumentNever = HydratedDocument<{ name: string }, Record<string, never>>;

  const doc: UserDocumentNever = null as any;
  ExpectType<string>(doc.name);
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

  ExpectType<number>(person.get('age'));
  ExpectType<Date>(person.get('dob'));
  ExpectType<{ theme: string; alerts: { sms: boolean } }>(person.get('settings'));
}

async function gh12959() {
  const subdocSchema = new Schema({ foo: { type: 'string', required: true } });

  const schema = new Schema({
    subdocArray: { type: [subdocSchema], required: true }
  });

  const Model = model('test', schema);

  const doc = await Model.findById('id').orFail();
  ExpectType<Types.ObjectId>(doc._id);
  ExpectType<number>(doc.__v);

  // @ts-expect-error version key shouldn't be defined on subdocs
  doc.subdocArray[0].__v;
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

  ExpectType<UserObjectInterface>(populatedCar.owner);
  ExpectType<Types.ObjectId>(depopulatedCar.owner);
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

  ExpectType<string>(doc.toJSON({ virtuals: true }).upper);
  ExpectType<string>(doc.toObject({ virtuals: true }).upper);
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

  ExpectType<string>(obj.id);
  ExpectType<string | null | undefined>(obj.a?.foo);
  ExpectType<string | null | undefined>(obj.b.foo);
  ExpectType<string | null | undefined>(obj.c);
  ExpectType<string>(obj.d);
  ExpectType<string>(obj.hello);
  ExpectType<Date>(obj.createdAt);
  ExpectType<Date>(obj.updatedAt);
}

function gh13079() {
  const schema = new Schema({
    name: { type: String, required: true }
  });
  const TestModel = model('Test', schema);

  const doc = new TestModel({ name: 'taco' });
  ExpectType<string>(doc.id);

  const schema2 = new Schema({
    id: { type: Number, required: true },
    name: { type: String, required: true }
  });
  const TestModel2 = model('Test', schema2);

  const doc2 = new TestModel2({ name: 'taco' });
  ExpectType<number>(doc2.id);

  const schema3 = new Schema<{ name: string }>({
    name: { type: String, required: true }
  });
  const TestModel3 = model('Test', schema3);

  const doc3 = new TestModel3({ name: 'taco' });
  ExpectType<string>(doc3.id);

  const schema4 = new Schema<{ name: string, id: number }>({
    id: { type: Number, required: true },
    name: { type: String, required: true }
  });
  const TestModel4 = model('Test', schema4);

  const doc4 = new TestModel4({ name: 'taco' });
  ExpectType<number>(doc4.id);

  const schema5 = new Schema({
    name: { type: String, required: true }
  }, { id: false });
  const TestModel5 = model('Test', schema5);

  const doc5 = new TestModel5({ name: 'taco' });
  // @ts-expect-error should not be defined because id option is set to false
  doc5.id;
}

async function toBSON() {
  const schema = new Schema({
    name: String
  });

  const Model = model('test', schema);

  const doc = new Model({ name: 'test' });
  ExpectType<{ name?: string | null } & { _id: Types.ObjectId }>(doc.toBSON());
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
    // @ts-expect-error should not be defined because versionKey is set to false
    objWithoutVersionKey.__v;
    // @ts-expect-error should not be defined because versionKey is set to false
    jsonWithoutVersionKey.__v;

    const objWithVersionKey = a.toObject();
    const jsonWithVersionKey = a.toJSON();
    ExpectType<number>(objWithVersionKey.__v);
    ExpectType<number>(jsonWithVersionKey.__v);
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
    // @ts-expect-error should not be defined because versionKey is set to false
    objWithoutVersionKey.__v;
    // @ts-expect-error should not be defined because versionKey is set to false
    jsonWithoutVersionKey.__v;

    const objWithVersionKey = a.toObject();
    const jsonWithVersionKey = a.toJSON();
    ExpectType<number>(objWithVersionKey.taco);
    ExpectType<number>(jsonWithVersionKey.taco);
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
    ExpectType<number>(a.toObject({ flattenObjectIds: true }).__v);
    ExpectType<number>(a.toJSON({ flattenObjectIds: true }).__v);

    const objWithoutVersionKey = a.toObject({ versionKey: false });
    const jsonWithoutVersionKey = a.toJSON({ versionKey: false });
    // @ts-expect-error should not be defined because versionKey is set to false
    objWithoutVersionKey.__v;
    // @ts-expect-error should not be defined because versionKey is set to false
    jsonWithoutVersionKey.__v;

    const objWithVersionKey = a.toObject();
    const jsonWithVersionKey = a.toJSON();
    ExpectType<number>(objWithVersionKey.__v);
    ExpectType<number>(jsonWithVersionKey.__v);
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
    ExpectType<number>(a.toObject({ flattenObjectIds: true }).taco);
    ExpectType<number>(a.toJSON({ flattenObjectIds: true }).taco);

    const objWithoutVersionKey = a.toObject({ versionKey: false });
    const jsonWithoutVersionKey = a.toJSON({ versionKey: false });
    // @ts-expect-error should not be defined because versionKey is set to false
    objWithoutVersionKey.__v;
    // @ts-expect-error should not be defined because versionKey is set to false
    jsonWithoutVersionKey.__v;

    const objWithVersionKey = a.toObject();
    const jsonWithVersionKey = a.toJSON();
    ExpectType<number>(objWithVersionKey.taco);
    ExpectType<number>(jsonWithVersionKey.taco);
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

  ExpectType<string>(toObjectFlattened._id);
  ExpectType<string>(toObjectFlattened.uuid);
  ExpectType<string>(toJSONFlattened._id);
  ExpectType<string>(toJSONFlattened.uuid);

  // Test with virtuals
  const toObjectWithVirtuals = a.toObject({ flattenUUIDs: true, virtuals: true });
  const toJSONWithVirtuals = a.toJSON({ flattenUUIDs: true, virtuals: true });

  ExpectType<string>(toObjectWithVirtuals._id);
  ExpectType<string>(toObjectWithVirtuals.uuid);
  ExpectType<string>(toJSONWithVirtuals._id);
  ExpectType<string>(toJSONWithVirtuals.uuid);

  // Test flattenUUIDs: false (default behavior - should remain UUID)
  const toObjectNotFlattened = a.toObject({ flattenUUIDs: false });
  const toJSONNotFlattened = a.toJSON({ flattenUUIDs: false });
  ExpectType<Types.UUID>(toObjectNotFlattened._id);
  ExpectType<Types.UUID>(toObjectNotFlattened.uuid);
  ExpectType<Types.UUID>(toJSONNotFlattened._id);
  ExpectType<Types.UUID>(toJSONNotFlattened.uuid);

  // Test default (no flattenUUIDs option - should remain UUID)
  const toObjectDefault = a.toObject();
  const toJSONDefault = a.toJSON();
  ExpectType<Types.UUID>(toObjectDefault._id);
  ExpectType<Types.UUID>(toObjectDefault.uuid);
  ExpectType<Types.UUID>(toJSONDefault._id);
  ExpectType<Types.UUID>(toJSONDefault.uuid);
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
  ExpectType<string>(uuidAndObjectId._id);
  ExpectType<string>(uuidAndObjectId.uuid);

  // Test flattenUUIDs + flattenMaps
  const uuidAndMaps = a.toObject({ flattenUUIDs: true, flattenMaps: true });
  ExpectType<string>(uuidAndMaps.uuid);
  ExpectType<Record<string, string>>(uuidAndMaps.tags);

  // Test flattenUUIDs + virtuals
  const uuidAndVirtuals = a.toObject({ flattenUUIDs: true, virtuals: true });
  ExpectType<string>(uuidAndVirtuals.uuid);
  ExpectType<string>(uuidAndVirtuals.displayName);

  // Test flattenObjectIds + flattenMaps
  const objectIdAndMaps = a.toObject({ flattenObjectIds: true, flattenMaps: true });
  ExpectType<string>(objectIdAndMaps._id);
  ExpectType<Record<string, string>>(objectIdAndMaps.tags);

  // Test flattenObjectIds + virtuals
  const objectIdAndVirtuals = a.toObject({ flattenObjectIds: true, virtuals: true });
  ExpectType<string>(objectIdAndVirtuals._id);
  ExpectType<string>(objectIdAndVirtuals.displayName);

  // Test flattenMaps + virtuals
  const mapsAndVirtuals = a.toObject({ flattenMaps: true, virtuals: true });
  ExpectType<Record<string, string>>(mapsAndVirtuals.tags);
  ExpectType<string>(mapsAndVirtuals.displayName);

  // Test triple combinations
  const uuidObjectIdMaps = a.toObject({ flattenUUIDs: true, flattenObjectIds: true, flattenMaps: true });
  ExpectType<string>(uuidObjectIdMaps._id);
  ExpectType<string>(uuidObjectIdMaps.uuid);
  ExpectType<Record<string, string>>(uuidObjectIdMaps.tags);

  const uuidObjectIdVirtuals = a.toObject({ flattenUUIDs: true, flattenObjectIds: true, virtuals: true });
  ExpectType<string>(uuidObjectIdVirtuals._id);
  ExpectType<string>(uuidObjectIdVirtuals.uuid);
  ExpectType<string>(uuidObjectIdVirtuals.displayName);

  // Test all four options
  const allFour = a.toObject({ flattenUUIDs: true, flattenObjectIds: true, flattenMaps: true, virtuals: true });
  ExpectType<string>(allFour._id);
  ExpectType<string>(allFour.uuid);
  ExpectType<Record<string, string>>(allFour.tags);
  ExpectType<string>(allFour.displayName);

  // Same tests for toJSON
  const allFourJSON = a.toJSON({ flattenUUIDs: true, flattenObjectIds: true, flattenMaps: true, virtuals: true });
  ExpectType<string>(allFourJSON._id);
  ExpectType<string>(allFourJSON.uuid);
  ExpectType<Record<string, string>>(allFourJSON.tags);
  ExpectType<string>(allFourJSON.displayName);
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
  ExpectType<Record<string, { orderId: string }>>(flattened.userRefs);

  // When using flattenMaps + flattenUUIDs, UUIDs inside Map values should be converted
  const flattenedUUIDs = doc.toObject({ flattenMaps: true, flattenUUIDs: true });
  ExpectType<Record<string, { refId: string }>>(flattenedUUIDs.uuidRefs);

  // All three together
  const allThree = doc.toObject({ flattenMaps: true, flattenObjectIds: true, flattenUUIDs: true });
  ExpectType<Record<string, { orderId: string }>>(allThree.userRefs);
  ExpectType<Record<string, { refId: string }>>(allThree.uuidRefs);
  ExpectType<string>(allThree._id);
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
  ExpectType<string>(user.id);

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
  ExpectType<number>(userWithId.id);
}
