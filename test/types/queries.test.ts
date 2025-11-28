import mongoose, {
  HydratedDocument,
  Schema,
  model,
  Document,
  Types,
  Query,
  Model,
  QueryWithHelpers,
  PopulatedDoc,
  UpdateQuery,
  UpdateQueryKnownOnly,
  InferRawDocType,
  InferSchemaType,
  ProjectionFields,
  QueryOptions,
  ProjectionType,
  QueryFilter
} from 'mongoose';
import mongodb from 'mongodb';
import { ModifyResult, ObjectId } from 'mongodb';
import { expectAssignable, expectError, expectNotAssignable, expectType } from 'tsd';
import { autoTypedModel } from './models.test';

interface QueryHelpers {
  _byName(this: QueryWithHelpers<any, ITest, QueryHelpers>, name: string): QueryWithHelpers<Array<ITest>, ITest, QueryHelpers>;
  byName(this: QueryWithHelpers<any, ITest, QueryHelpers>, name: string): QueryWithHelpers<Array<ITest>, ITest, QueryHelpers>;
}

const childSchema = new Schema({ name: String });
const ChildModel = model<Child>('Child', childSchema);

const schema: Schema<ITest, Model<ITest, QueryHelpers>, {}, QueryHelpers> = new Schema({
  name: { type: 'String' },
  tags: [String],
  child: { type: 'ObjectId', ref: 'Child' },
  docs: [{ _id: 'ObjectId', id: Number, tags: [String] }],
  endDate: Date
});

schema.query._byName = function(name: string): QueryWithHelpers<ITest[], ITest, QueryHelpers> {
  return this.find({ name });
};

schema.query.byName = function(name: string): QueryWithHelpers<ITest[], ITest, QueryHelpers> {
  expectError(this.notAQueryHelper());
  return this._byName(name);
};

interface Child {
  name: string;
}
interface ISubdoc {
  myId?: Types.ObjectId;
  id?: number;
  tags?: string[];
  profiles: {
    name?: string
  }
}

interface ITest {
  name?: string;
  age?: number;
  parent?: Types.ObjectId;
  child?: PopulatedDoc<HydratedDocument<Child>>,
  tags?: string[];
  docs?: ISubdoc[];
  endDate?: Date;
}

type X = mongoose.WithLevel1NestedPaths<ITest>;
expectType<number | undefined>({} as X['docs.id']);

const Test = model<ITest, Model<ITest, QueryHelpers>>('Test', schema);

Test.find({}, {}, { populate: { path: 'child', model: ChildModel, match: true } }).exec().then((res: Array<ITest>) => console.log(res));

Test.find().byName('test').byName('test2').orFail().exec().then(console.log);

Test.countDocuments({ name: /Test/ }).exec().then((res: number) => console.log(res));
Test.findOne({ 'docs.id': 42 }).exec().then(console.log);

// ObjectId casting
Test.find({ parent: new Types.ObjectId('0'.repeat(24)) });
Test.find({ parent: '0'.repeat(24) });
Test.find({ parent: { $in: ['0'.repeat(24)] } });

// Operators
Test.find({ name: { $in: ['Test'] } }).exec().then((res: Array<ITest>) => console.log(res));
Test.find({ tags: 'test' }).exec();
Test.find({ tags: { $in: ['test'] } }).exec();
Test.find({ tags: /test/ }).exec();
Test.find({ tags: { $in: [/test/] } }).exec();

// Implicit `$in`
Test.find({ name: ['Test1', 'Test2'] }).exec();

// Implicit `$in` for regex string
Test.find({ name: [/Test1/, /Test2/] });

Test.find({ name: { $gte: 'Test' } }, null, { collation: { locale: 'en-us' } }).exec().
  then((res: Array<ITest>) => console.log(res[0].name));

Test.findOne().orFail(new Error('bar')).then((doc: ITest | null) => console.log('Found! ' + doc));

Test.distinct('name').exec().then((res: Array<any>) => console.log(res[0]));
Test.distinct('name', {}, { collation: { locale: 'en', strength: 2 } }).exec().then((res: Array<any>) => console.log(res[0]));

Test.findOneAndUpdate({ name: 'test' }, { name: 'test2' }).exec().then((res: ITest | null) => console.log(res));
Test.findOneAndUpdate({ name: 'test' }, { name: 'test2' }).then((res: ITest | null) => console.log(res));
Test.findOneAndUpdate({ name: 'test' }, { $set: { name: 'test2' } }).then((res: ITest | null) => console.log(res));
Test.findOneAndUpdate({ name: 'test' }, { $inc: { age: 2 } }).then((res: ITest | null) => console.log(res));
Test.findOneAndUpdate({ name: 'test' }, { name: 'test3' }, { upsert: true, new: true }).then((res: ITest) => {
  res.name = 'test4';
});
Test.findOneAndUpdate({ name: 'test' }, { name: 'test3' }, { upsert: true, returnOriginal: false }).then((res: ITest) => {
  res.name = 'test4';
});
Test.findOneAndUpdate({ name: 'test' }, { name: 'test3' }, { includeResultMetadata: true }).then((res: any) => {
  console.log(res.ok);
});
Test.findOneAndUpdate({ name: 'test' }, { name: 'test3' }, { new: true, upsert: true, includeResultMetadata: true }).then((res: any) => {
  console.log(res.ok);
});

Test.findOneAndReplace({ name: 'test' }, { _id: new Types.ObjectId(), name: 'test2' }).exec().then((res: ITest | null) => console.log(res));

Test.findOneAndUpdate({ name: 'test' }, { $addToSet: { tags: 'each' } });
Test.findOneAndUpdate({ name: 'test' }, { $push: { tags: 'each' } });
Test.findOneAndUpdate({ name: 'test' }, { $pull: { docs: { 'nested.id': 1 } } });

Test.findOneAndUpdate({ name: 'test', 'docs.id': 1 }, { $pull: { 'docs.$.tags': 'foo' } });

const update = Math.random() > 0.5 ? { $unset: { 'docs.0': 1 } } : { age: 55 };
Test.findOneAndUpdate({ name: 'test' }, update);

Test.findOneAndUpdate({ name: 'test' }, { $currentDate: { endDate: true } });
Test.findOneAndUpdate({ name: 'test' }, [{ $set: { endDate: true } }]);

Test.findByIdAndUpdate({ name: 'test' }, { name: 'test2' }, (err: any, doc) => console.log(doc));

Test.findOneAndUpdate({ name: 'test' }, { 'docs.0.myId': '0'.repeat(24) });

// Chaining
Test.findOne().where({ name: 'test' });
Test.where().find({ name: 'test' });

// Projection
const p0: Record<string, number> = Test.find().projection({
  age: true,
  parent: 1,
  'docs.id': 1
});
const p1: Record<string, number> = Test.find().projection('age docs.id');
const p2: Record<string, number> | null = Test.find().projection();
const p3: null = Test.find().projection(null);

expectError(Test.find({ }, { name: 'ss' })); // Only 0 and 1 are allowed
Test.find({}, { name: 3 });
Test.find({}, { name: true, age: false, endDate: true, tags: 1 });
Test.find({}, { name: true, age: false, endDate: true });
Test.find({}, { name: false, age: false, tags: false, child: { name: false }, docs: { myId: false, id: true } });
expectError(Test.find({ }, { tags: { something: 1 } })); // array of strings or numbers should only be allowed to be a boolean or 1 and 0
Test.find({}, { name: true, age: true, endDate: true, tags: 1, child: { name: true }, docs: { myId: true, id: true } }); // This should be allowed
Test.find({}, { name: 1, age: 1, endDate: 1, tags: 1, child: { name: 1 }, docs: { myId: 1, id: 1 } }); // This should be allowed
Test.find({}, { _id: 0, name: 1, age: 1, endDate: 1, tags: 1, child: 1, docs: 1 }); // _id is an exception and should be allowed to be excluded
Test.find({}, { name: 0, age: 0, endDate: 0, tags: 0, child: 0, docs: 0 }); // This should be allowed
Test.find({}, { name: 0, age: 0, endDate: 0, tags: 0, child: { name: 0 }, docs: { myId: 0, id: 0 } }); // This should be allowed
Test.find({}, { name: 1, age: 1, _id: 0 }); // This should be allowed since _id is an exception
Test.find({}, { someOtherField: 1 }); // This should be allowed since it's not a field in the schema
expectError(Test.find({}, { name: { $slice: 1 } })); // $slice should only be allowed on arrays
Test.find({}, { tags: { $slice: 1 } }); // $slice should be allowed on arrays
Test.find({}, { tags: { $slice: [1, 2] } }); // $slice with the format of [ <number to skip>, <number to return> ] should also be allowed on arrays
expectError(Test.find({}, { age: { $elemMatch: {} } })); // $elemMatch should not be allowed on non arrays
Test.find({}, { docs: { $elemMatch: { id: 'aa' } } }); // $elemMatch should be allowed on arrays
expectError(Test.find({}, { tags: { $slice: 1, $elemMatch: {} } })); // $elemMatch and $slice should not be allowed together
Test.find({}, { age: 1, tags: { $slice: 5 } }); // $slice should be allowed in inclusion projection
Test.find({}, { age: 0, tags: { $slice: 5 } }); // $slice should be allowed in exclusion projection
Test.find({}, { age: 1, tags: { $elemMatch: {} } }); // $elemMatch should be allowed in inclusion projection
Test.find({}, { age: 0, tags: { $elemMatch: {} } }); // $elemMatch should be allowed in exclusion projection
expectError(Test.find({}, { 'docs.id': 'taco' })); // Dot notation should be allowed and does not accept any
expectError(Test.find({}, { docs: { id: '1' } })); // Dot notation should be able to use a combination with objects
Test.find({}, { docs: { id: false } }); // Dot notation should be allowed with valid values - should correctly handle arrays
Test.find({}, { docs: { id: true } }); // Dot notation should be allowed with valid values - should correctly handle arrays
Test.find({ docs: { $elemMatch: { id: 1 } } }, { 'docs.$': 1 }); // $ projection should be allowed
Test.find({}, { child: 1 }); // Dot notation should be able to use a combination with objects
// Test.find({}, { 'docs.profiles': { name: 1 } }); // 3 levels deep not supported
expectError(Test.find({}, { 'docs.profiles': { name: 'aa' } })); // should support a combination of dot notation and objects
expectError(Test.find({}, { endDate: { toString: 1 } }));
expectError(Test.find({}, { tags: { trim: 1 } }));
expectError(Test.find({}, { child: { toJSON: 1 } }));
Test.find({}, { age: 1, _id: 0 });
Test.find({}, { name: 0, age: 0, _id: 1 });

// Manual Casting using ProjectionType
Test.find({}, { docs: { unknownParams: 1 } } as ProjectionType<ITest>);
// Sorting
Test.find().sort();
Test.find().sort('-name');
Test.find().sort({ name: -1 });
Test.find().sort({ name: 'ascending' });
Test.find().sort(undefined);
Test.find().sort(null);
Test.find().sort([['key', 'ascending']]);
Test.find().sort([['key1', 'ascending'], ['key2', 'descending']]);
expectError(Test.find().sort({ name: 2 }));
expectError(Test.find().sort({ name: 'invalidSortOrder' }));
expectError(Test.find().sort([['key', 'invalid']]));
expectError(Test.find().sort([['key', false]]));
expectError(Test.find().sort(['invalid']));

// Super generic query
function testGenericQuery(): void {
  interface CommonInterface<T> {
    something: string;
    content: T;
  }

  async function findSomething<T>(model: Model<CommonInterface<T>>): Promise<CommonInterface<T>> {
    return model.findOne({ something: 'test' } as mongoose.QueryFilter<CommonInterface<T>>).orFail().exec();
  }
}

function eachAsync(): void {
  Test.find().cursor().eachAsync((doc) => {
    expectType<HydratedDocument<ITest, {}, QueryHelpers>>(doc);
  });
  Test.find().cursor().eachAsync((docs) => {
    expectType<HydratedDocument<ITest, {}, QueryHelpers>[]>(docs);
  }, { batchSize: 2 });
}

async function gh10617(): Promise<void> {
  interface IDBModel extends Document {
    date: Date; // date created
    _tags: any[];
  }

  const schema = new Schema({
    date: { type: Date, default: Date.now }, // date created
    _tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }]
  });

  const DBModel: Model<IDBModel> = model<IDBModel>('Meep', schema);
  await DBModel.findOne({});
}

function gh10757() {
  enum MyEnum {
    VALUE1,
    VALUE2,
    VALUE3
  }

  interface MyClass {
    status: MyEnum;
  }

  type MyClassDocument = MyClass & Document;

  const test: QueryFilter<MyClass> = { status: { $in: [MyEnum.VALUE1, MyEnum.VALUE2] } };
}

function gh10857() {
  type MyUnion = 'VALUE1' | 'VALUE2';
  interface MyClass {
    status: MyUnion;
  }
  type MyClassDocument = MyClass & Document;
  const test: QueryFilter<MyClass> = { status: { $in: ['VALUE1', 'VALUE2'] } };
}

function gh10786() {
  interface User {
    phone?: string;
    name?: string
  }

  const updateQuery: UpdateQuery<User> = { name: 'John' };
  if (true) {
    updateQuery.phone = 'XXXX';
  }
}

async function gh11156(): Promise<void> {
  interface IUser {
    name: string;
    age: number;
  }

  const schema = new Schema<IUser>({
    name: String,
    age: Number
  });

  const User: Model<IUser> = model<IUser>('User', schema);

  expectType<{ name: string }>(await User.findOne<Pick<IUser, 'name'>>({}).orFail());
}

async function gh11041(): Promise<void> {
  interface User {
    name: string;
    email: string;
    avatar?: string;
  }

  // 2. Create a Schema corresponding to the document interface.
  const schema = new Schema<User>({
    name: { type: String, required: true },
    email: { type: String, required: true },
    avatar: String
  });

  // 3. Create a Model.
  const MyModel = model<User>('User', schema);

  expectType<HydratedDocument<User> | null>(await MyModel.findOne({}).populate('someField').exec());
}

async function gh11306(): Promise<void> {
  interface User {
    name: string;
    email: string;
    avatar?: string;
  }

  // 2. Create a Schema corresponding to the document interface.
  const schema = new Schema<User>({
    name: { type: String, required: true },
    email: { type: String, required: true },
    avatar: String
  });

  // 3. Create a Model.
  const MyModel = model<User>('User', schema);

  expectType<unknown[]>(await MyModel.distinct('notThereInSchema'));
  expectType<string[]>(await MyModel.distinct('name'));
}

function autoTypedQuery() {
  const AutoTypedModel = autoTypedModel();
  const query = AutoTypedModel.find();
  expectType<typeof query>(AutoTypedModel.find().byUserName(''));
}

function gh11964() {
  class Repository<T extends { id: string }> {
    find(id: string) {
      const idCondition: mongodb.Condition<T['id']> = id as mongodb.Condition<T['id']>;

      // `as` is necessary because `T` can be `{ id: never }`,
      // so we need to explicitly coerce
      const filter: QueryFilter<T> = { id } as QueryFilter<T>;
    }
  }
}

function gh14397() {
  type Condition<T> = mongodb.Condition<T>; // redefined here because it's not exported by mongoose

  type WithId<T extends object> = T & { id: string };

  type TestUser = {
    name: string;
    age: number;
  };

  const id = 'Test Id';

  let idCondition: Condition<WithId<TestUser>['id']>;
  let filter: QueryFilter<WithId<TestUser>>;

  expectAssignable<typeof idCondition>(id);
  expectAssignable<typeof filter>({ id });
}

function gh12091() {
  interface IUser{
    friendsNames: string[];
  }
  const userSchema = new Schema<IUser>({
    friendsNames: [String]
  });

  const update: UpdateQuery<IUser> = { $addToSet: { friendsNames: 'John Doe' } };
  if (!update?.$addToSet) {
    return;
  }
  update.$addToSet.friendsNames = 'Jane Doe';
}

function gh12142() {
  const schema = new Schema({ name: String, comments: [{ text: String }] });

  const Test = model('Test', schema);

  Test.updateOne(
    { _id: new Types.ObjectId() },
    {
      $pull: { comments: new Types.ObjectId() }
    }
  );
}

async function gh12342_manual() {
  interface Project {
    name?: string, stars?: number
  }

  interface ProjectQueryHelpers {
    byName(name: string): QueryWithHelpers<
    HydratedDocument<Project>[],
    HydratedDocument<Project>,
    ProjectQueryHelpers
    >
  }

  type ProjectModelType = Model<Project, ProjectQueryHelpers>;

  const ProjectSchema = new Schema<
  Project,
  Model<Project, ProjectQueryHelpers>,
  {},
  ProjectQueryHelpers
  >({
    name: String,
    stars: Number
  });

  ProjectSchema.query.byName = function byName(
    this: QueryWithHelpers<any, HydratedDocument<Project>, ProjectQueryHelpers>,
    name: string
  ) {
    return this.find({ name: name });
  };

  // 2nd param to `model()` is the Model class to return.
  const ProjectModel = model<Project, ProjectModelType>('Project', schema);

  expectType<HydratedDocument<Project>[]>(
    await ProjectModel.findOne().where('stars').gt(1000).byName('mongoose')
  );
}

async function gh12342_auto() {
  interface Project {
    name?: string | null,
    stars?: number | null
  }

  const ProjectSchema = new Schema({
    name: String,
    stars: Number
  }, {
    query: {
      byName(name: string) {
        return this.find({ name });
      }
    }
  });

  const ProjectModel = model('Project', ProjectSchema);

  expectAssignable<HydratedDocument<Project>[]>(
    await ProjectModel.findOne().where('stars').gt(1000).byName('mongoose')
  );
}

async function gh11602(): Promise<void> {
  const query = Test.findOne();
  query instanceof Query;

  const ModelType = model<ITest>('foo', schema);

  const updateResult = await ModelType.findOneAndUpdate(query, { $inc: { occurence: 1 } }, {
    upsert: true,
    returnDocument: 'after',
    includeResultMetadata: true
  });

  expectError(updateResult.lastErrorObject?.modifiedCount);
  expectType<boolean | undefined>(updateResult.lastErrorObject?.updatedExisting);
  expectType<ObjectId | undefined>(updateResult.lastErrorObject?.upserted);

  ModelType.findOneAndUpdate({}, {}, { returnDocument: 'before' });
  ModelType.findOneAndUpdate({}, {}, { returnDocument: 'after' });
  ModelType.findOneAndUpdate({}, {}, { returnDocument: undefined });
  ModelType.findOneAndUpdate({}, {}, {});
  expectError(ModelType.findOneAndUpdate({}, {}, {
    returnDocument: 'not-before-or-after'
  }));
}

async function gh13142() {
  const BlogSchema = new Schema({ title: String });

  type Blog = InferSchemaType<typeof BlogSchema>;

  const BlogModel = model<Blog>('Blog', BlogSchema);
  class BlogRepository {
    private readonly blogModel: Model<Blog>;

    constructor() {
      this.blogModel = BlogModel;
    }

    findOne<
      Projection extends ProjectionFields<Blog>,
      Options extends QueryOptions<Blog>
    >(
      filter: QueryFilter<mongoose.WithLevel1NestedPaths<Blog>>,
      projection: Projection,
      options: Options
    ): Promise<
        Options['lean'] extends true
          ? Pick<Blog, Extract<keyof Projection, keyof Blog>> | null
          : HydratedDocument<Pick<Blog, Extract<keyof Projection, keyof Blog>>> | null
    > {
      return this.blogModel.findOne(filter, projection, options);
    }
  }

  const blogRepository = new BlogRepository();
  const blog = await blogRepository.findOne(
    { title: 'test' },
    { content: 1 },
    { lean: true }
  );
  if (!blog) return;
  expectType<Pick<Blog, Extract<keyof { content: 1 }, keyof Blog>>>(blog);
}

async function gh13224() {
  const userSchema = new Schema({ name: String, age: Number });
  const UserModel = model('User', userSchema);

  const u1 = await UserModel.findOne().select(['name']).orFail();
  expectType<string | undefined | null>(u1.name);
  expectType<number | undefined | null>(u1.age);
  expectAssignable<Function>(u1.toObject);

  const u2 = await UserModel.findOne().select<{ name?: string }>(['name']).orFail();
  expectType<string | undefined>(u2.name);
  expectError(u2.age);
  expectAssignable<Function>(u2.toObject);

  const users = await UserModel.find().select<{ name?: string }>(['name']);
  const u3 = users[0];
  expectType<string | undefined>(u3!.name);
  expectError(u3!.age);
  expectAssignable<Function>(u3.toObject);

  expectError(UserModel.findOne().select<{ notInSchema: string }>(['name']).orFail());
}

function gh13630() {
  interface User {
    phone?: string;
    name?: string;
    nested?: {
      test?: string;
    }
  }

  expectAssignable<UpdateQueryKnownOnly<User>>({ $set: { name: 'John' } });
  expectAssignable<UpdateQueryKnownOnly<User>>({ $unset: { phone: 'test' } });
  expectAssignable<UpdateQueryKnownOnly<User>>({ $set: { nested: { test: 'foo' } } });
  expectNotAssignable<UpdateQueryKnownOnly<User>>({ $set: { namee: 'foo' } });
  expectNotAssignable<UpdateQueryKnownOnly<User>>({ $set: { 'nested.test': 'foo' } });

  const x: UpdateQueryKnownOnly<User> = { $set: { name: 'John' } };
  expectAssignable<UpdateQuery<User>>(x);
}

function gh14190() {
  const userSchema = new Schema({ name: String, age: Number });
  const UserModel = model('User', userSchema);

  const doc = await UserModel.findByIdAndDelete('0'.repeat(24));
  expectType<ReturnType<(typeof UserModel)['hydrate']> | null>(doc);

  const res = await UserModel.findByIdAndDelete(
    '0'.repeat(24),
    { includeResultMetadata: true }
  );
  expectAssignable<
    ModifyResult<ReturnType<(typeof UserModel)['hydrate']>>
      >(res);

  const res2 = await UserModel.find().findByIdAndDelete(
    '0'.repeat(24),
    { includeResultMetadata: true }
  );
  expectAssignable<
    ModifyResult<ReturnType<(typeof UserModel)['hydrate']>>
      >(res2);
}

function mongooseQueryOptions() {
  const userSchema = new Schema({ name: String, age: Number });
  const UserModel = model('User', userSchema);

  UserModel.updateOne(
    { name: 'bar' },
    { name: 'baz' },
    {
      context: 'query',
      multipleCastError: true,
      overwriteDiscriminatorKey: true,
      runValidators: true,
      sanitizeProjection: true,
      sanitizeFilter: true,
      setDefaultsOnInsert: true,
      strict: true,
      strictQuery: 'throw',
      timestamps: false,
      translateAliases: false
    }
  );

  UserModel.findOne({}, null, {
    lean: true,
    populate: 'test'
  });
}

function gh14473() {
  class AbstractSchema {
    _id: any;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date;

    constructor() {
      this._id = 4;
      this.createdAt = new Date();
      this.updatedAt = new Date();
      this.deletedAt = new Date();
    }
  }

  const generateExists = <D extends AbstractSchema = AbstractSchema>() => {
    const query: QueryFilter<D> = { deletedAt: { $ne: null } };
    const query2: QueryFilter<D> = { deletedAt: { $lt: new Date() } } as QueryFilter<D>;
  };
}

async function gh14525() {
  type BeAnObject = Record<string, any>;

  interface SomeDoc {
    something: string;
    func(this: TestDoc): string;
  }

  interface PluginExtras {
    pfunc(): number;
  }

  type TestDoc = Document<unknown, BeAnObject, SomeDoc> & PluginExtras;

  type ModelType = Model<SomeDoc, BeAnObject, PluginExtras, BeAnObject>;

  const doc = await ({} as ModelType).findOne({}).populate('test').orFail().exec();

  doc.func();

  let doc2 = await ({} as ModelType).create({});
  doc2 = await ({} as ModelType).findOne({}).populate('test').orFail().exec();
}

async function gh14545() {
  type Test = {
    _id: Types.ObjectId;

    prop: string;
    another: string;

    createdAt: number;
    updatedAt: number;
  };

  const schema = new Schema<Test>({
    prop: { type: String },
    another: { type: String },
    createdAt: { type: Number },
    updatedAt: { type: Number }
  });

  type TestDocument = HydratedDocument<Test>;
  type TestModel = Model<Test, {}, {}, {}, TestDocument>;

  type SlimTest = Pick<Test, '_id' | 'prop'>;
  type SlimTestDocument = HydratedDocument<SlimTest>;

  const M = model<Test, TestModel>('Test', schema);

  const myDocs = await M.find({}).exec();
  const myDoc = await M.findOne({}).exec();

  const myProjections = await M.find({}).select<SlimTest>({ prop: 1 }).exec();
  expectType<SlimTestDocument[]>(myProjections);
  const myProjection = await M.findOne({}).select<SlimTest>({ prop: 1 }).exec();
  expectType<SlimTestDocument | null>(myProjection);
}

function gh14841() {
  const filter: QueryFilter<{ owners: string[] }> = {
    $expr: { $lt: [{ $size: '$owners' }, 10] }
  };
}

function gh14510() {
  // From https://stackoverflow.com/questions/56505560/how-to-fix-ts2322-could-be-instantiated-with-a-different-subtype-of-constraint:
  // "Never assign a concrete type to a generic type parameter, consider it as read-only!"
  // This function is generally something you shouldn't do in TypeScript, can work around it with `as` though.
  function findById<ModelType extends {_id: Types.ObjectId | string}>(model: Model<ModelType>, _id: Types.ObjectId | string) {
    return model.find({ _id: _id } as QueryFilter<ModelType>);
  }
}

async function gh15526() {
  const userSchemaDefinition = { name: String, age: Number } as const;
  const UserModel = model('User', new Schema(userSchemaDefinition));
  type UserType = InferRawDocType<typeof userSchemaDefinition>;

  const selection = ['name'] as const satisfies readonly (keyof UserType)[];

  type SelectType = Pick<UserType, (typeof selection)[number]>;
  const u1 = await UserModel.findOne()
    .select<SelectType>(selection)
    .orFail();
  expectType<string | undefined | null>(u1.name);
  expectError(u1.age);
}

async function gh14173() {
  const userSchema = new Schema({
    name: String,
    account: {
      amount: Number,
      owner: { type: String, default: () => 'OWNER' },
      taxIds: [Number]
    }
  });
  const User = model('User', userSchema);

  const { _id } = await User.create({
    name: 'test',
    account: {
      amount: 25,
      owner: 'test',
      taxIds: [42]
    }
  });

  const doc = await User
    .findOne({ _id }, { name: 1, account: { amount: 1 } })
    .orFail();
}

async function gh3230() {
  const Test = model(
    'Test',
    new Schema({ name: String, arr: [{ testRef: { type: 'ObjectId', ref: 'Test2' } }] })
  );

  const schema = new Schema({ name: String });
  const Test2 = model('Test2', schema);
  const D = Test2.discriminator('D', new Schema({ prop: String }));


  await Test.deleteMany({});
  await Test2.deleteMany({});
  const { _id } = await D.create({ name: 'foo', prop: 'bar' });
  const test = await Test.create({ name: 'test', arr: [{ testRef: _id }] });

  console.log(await Test.findById(test._id).populate('arr.testRef', { name: 1, prop: 1, _id: 0, __t: 0 }));
}

async function gh12064() {
  const schema = new Schema({
    subdoc: new Schema({
      subdocProp: Number
    }),
    nested: {
      nestedProp: String
    },
    documentArray: [{ documentArrayProp: Boolean }]
  });
  const TestModel = model('Model', schema);

  await TestModel.findOne({ 'subdoc.subdocProp': { $gt: 0 }, 'nested.nestedProp': { $in: ['foo', 'bar'] }, 'documentArray.documentArrayProp': { $ne: true } });
  expectError(TestModel.findOne({ 'subdoc.subdocProp': 'taco tuesday' }));
  expectError(TestModel.findOne({ 'nested.nestedProp': true }));
  expectError(TestModel.findOne({ 'documentArray.documentArrayProp': 'taco' }));
}

function gh15671() {
  interface DefaultQuery {
    search?: string;
  }

  type QueryFeaturesProps = {
    params: Partial<DefaultQuery>;
  };

  const queryFeatures = async <T, R, TQueryOp>(
    query: mongoose.Query<R, T, object, T, TQueryOp>,
    { params }: QueryFeaturesProps
  ): Promise<{ content: mongoose.GetLeanResultType<T, R, TQueryOp>; result?: number }> => {
    if (params.search) {
      query.find({
        $text: {
          $search: params.search
        }
      });
    }

    const content = await query.lean().orFail().exec();
    return {
      content
    };
  };
}

async function gh15779() {
  type Entity = {
    id: string;
    age: number;
    name: string;
  };

  function getV8FilterQuery(filter: QueryFilter<Entity>): QueryFilter<Entity> {
    return { ...filter, deletedAt: null };
  }

  const v8Filter = getV8FilterQuery({ age: { $gt: 18 } });

  v8Filter.name = 'test';

  expectAssignable<typeof v8Filter.age>(42);
  expectNotAssignable<typeof v8Filter.age>('taco');

  const TestModel = model('Test', new Schema({ age: Number, name: String }));
  const query = TestModel.find({ age: { $gt: 18 } });
  TestModel.find(query); // Should compile without errors
  TestModel.findOne(query);
  TestModel.deleteMany(query);
}

async function gh15786() {
  interface IDoc {
    nmae: string;
  }

  interface DocStatics {
    m1(): void;
    m2(): void;
  }

  const schema = new Schema<IDoc, Model<IDoc>, {}, {}, {}, DocStatics>({});
  schema.static({ m1() {} } as DocStatics);
}
