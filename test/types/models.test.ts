import mongoose, {
  Schema,
  Document,
  Model,
  connection,
  model,
  Types,
  UpdateQuery,
  CallbackError,
  HydratedDocument,
  HydratedDocumentFromSchema,
  InsertManyResult,
  Query,
  UpdateWriteOpResult,
  AggregateOptions,
  WithLevel1NestedPaths,
  InferSchemaType,
  DeleteResult
} from 'mongoose';
import { expectAssignable, expectError, expectType } from 'tsd';
import { AutoTypedSchemaType, autoTypedSchema } from './schema.test';
import { ModifyResult, UpdateOneModel, ChangeStreamInsertDocument, ObjectId } from 'mongodb';

function rawDocSyntax(): void {
  interface ITest {
    foo: string;
  }

  interface ITestMethods {
    bar(): number;
  }

  type TestModel = Model<ITest, {}, ITestMethods>;

  const TestSchema = new Schema<ITest, TestModel>({
    foo: { type: String, required: true }
  });

  const Test = connection.model<ITest, TestModel>('Test', TestSchema);

  expectType<Model<ITest, {}, ITestMethods, {}>>(Test);

  const doc = new Test({ foo: '42' });
  console.log(doc.foo);
  console.log(doc.bar());
  doc.save();
}

function tAndDocSyntax(): void {
  interface ITest {
    id: number;
    foo: string;
  }

  const TestSchema = new Schema<ITest & Document>({
    foo: { type: String, required: true }
  });

  const Test = connection.model<ITest & Document>('Test', TestSchema);

  const aggregated: Promise<Document> = Test.aggregate([]).then(res => res[0]);

  const bar = (SomeModel: Model<ITest & Document>) => console.log(SomeModel);
}

async function insertManyTest() {
  interface ITest {
    foo: string;
  }

  const TestSchema = new Schema<ITest>({
    foo: { type: String, required: true }
  });

  const Test = connection.model<ITest>('Test', TestSchema);

  Test.insertMany([{ foo: 'bar' }]).then(async res => {
    res.length;
  });

  const res = await Test.insertMany([{ foo: 'bar' }], { rawResult: true });
  expectType<Types.ObjectId>(res.insertedIds[0]);

  const res2 = await Test.insertMany([{ foo: 'bar' }], { ordered: false, rawResult: true });
  expectAssignable<Error | Object | ReturnType<(typeof Test)['hydrate']>>(res2.mongoose.results[0]);
}

function gh13930() {
  interface ITest {
    foo: string;
  }

  const TestSchema = new Schema<ITest>({
    foo: { type: String, required: true }
  });

  const Test = connection.model<ITest>('Test', TestSchema);

  Test.insertMany<{ foo: string }>([{ foo: 'bar' }], { });
}

function gh10074() {
  interface IDog {
    breed: string;
    name: string;
    age: number;
  }

  type IDogDocument = IDog & Document;

  const DogSchema = new Schema<IDogDocument>(
    {
      breed: { type: String },
      name: { type: String },
      age: { type: Number }
    }
  );

  const Dog = model<IDogDocument, Model<IDogDocument>>('dog', DogSchema);

  const rex = new Dog({
    breed: 'test',
    name: 'rex',
    age: '50'
  });
}

async function gh10359() {
  interface Group {
    groupId: string;
  }

  interface User extends Group {
    firstName: string;
    lastName: string;
  }

  async function foo(model: Model<User, {}, {}, {}>) {
    const doc = await model.findOne({ groupId: 'test' }).orFail().lean().exec();
    expectType<string>(doc.firstName);
    expectType<string>(doc.lastName);
    expectType<Types.ObjectId>(doc._id);
    expectType<string>(doc.groupId);
    return doc;
  }

  const UserModel = model<User>('gh10359', new Schema({ firstName: String, lastName: String, groupId: String }));
  foo(UserModel);
}

const ExpiresSchema = new Schema({
  ttl: {
    type: Date,
    expires: 3600
  }
});

interface IProject {
  name: string;
}

interface IProjectInstanceMethods {
  myMethod(): number;
}

interface ProjectModel extends Model<IProject, {}, IProjectInstanceMethods> {
  myStatic(): number;
}

const projectSchema = new Schema<
IProject,
ProjectModel,
IProjectInstanceMethods
>({ name: String });

projectSchema.pre('save', function() {
  // this => IProject
});

projectSchema.post('save', function() {
  // this => IProject
});

projectSchema.pre('deleteOne', function() {
  this.model;
});

projectSchema.post('deleteOne', function() {
  this.model;
});

projectSchema.methods.myMethod = () => 10;

projectSchema.statics.myStatic = () => 42;

const Project = connection.model<IProject, ProjectModel>('Project', projectSchema);
Project.myStatic();

Project.create({
  name: 'mongoose'
}).then(project => {
  project.myMethod();
});


Project.exists({ name: 'Hello' }).then(result => {
  result?._id;
});

function find() {
  // no args
  Project.find();

  // just filter
  Project.find({});
  Project.find({ name: 'Hello' });

  // just callback; this is no longer supported on .find()
  Project.find((error: CallbackError, result: IProject[]) => console.log(error, result));

  // filter + projection
  Project.find({}, undefined);
  Project.find({}, null);
  Project.find({}, { name: 1 });
  Project.find({}, { name: 0 });

  // filter + callback
  Project.find({}, (error: CallbackError, result: IProject[]) => console.log(error, result));
  Project.find({ name: 'Hello' }, (error: CallbackError, result: IProject[]) => console.log(error, result));

  // filter + projection + options
  Project.find({}, undefined, { limit: 5 });
  Project.find({}, null, { limit: 5 });
  Project.find({}, { name: 1 }, { limit: 5 });
}

function inheritance() {
  class InteractsWithDatabase extends Model {
    async _update(): Promise<void> {
      await this.save();
    }
  }

  const doc = new InteractsWithDatabase();
  doc instanceof Model;

  class SourceProvider extends InteractsWithDatabase {
    static async deleteInstallation(installationId: number): Promise<void> {
      await this.findOneAndDelete({ installationId });
    }
  }
}

Project.createCollection({ expires: '5 seconds' });
Project.createCollection({ expireAfterSeconds: 5 });
expectError(Project.createCollection({ expireAfterSeconds: '5 seconds' }));

function bulkWrite() {

  const schema = new Schema({
    str: { type: String, default: 'test' },
    num: Number
  });

  const M = model('Test', schema);

  const ops = [
    {
      updateOne: {
        filter: { num: 0 },
        update: {
          $inc: { num: 1 }
        },
        upsert: true
      }
    }
  ];
  M.bulkWrite(ops);
}

function bulkWriteAddToSet() {
  const schema = new Schema({
    arr: [String]
  });

  const M = model('Test', schema);

  const ops = [
    {
      updateOne: {
        filter: {
          arr: {
            $nin: ['abc']
          }
        },
        update: {
          $addToSet: {
            arr: 'abc'
          }
        }
      }
    }
  ];

  return M.bulkWrite(ops);
}

async function gh12277() {
  type DocumentType<T> = Document<any, any, T> & T;

  interface BaseModelClassDoc {
    firstname: string;
  }

  const baseModelClassSchema = new Schema({
    firstname: String
  });

  const BaseModel = model<DocumentType<BaseModelClassDoc>>('test', baseModelClassSchema);

  await BaseModel.bulkWrite([
    {
      updateOne: {
        update: {
          firstname: 'test'
        },
        filter: {
          firstname: 'asdsd'
        }
      }
    }
  ]);
}

async function overwriteBulkWriteContents() {
  type DocumentType<T> = Document<any, any, T> & T;

  interface BaseModelClassDoc {
    firstname: string;
  }

  const baseModelClassSchema = new Schema({
    firstname: String
  });

  const BaseModel = model<BaseModelClassDoc>('test', baseModelClassSchema);

  expectError(BaseModel.bulkWrite<{ testy: string }>([
    {
      insertOne: {
        document: {
          test: 'hello'
        }
      }
    }
  ]));

  BaseModel.bulkWrite<{ testy: string }>([
    {
      insertOne: {
        document: {
          testy: 'hello'
        }
      }
    }
  ]);

  BaseModel.bulkWrite([
    {
      insertOne: {
        document: {
          randomPropertyNotInTypes: 'hello'
        }
      }
    }
  ]);
}

export function autoTypedModel() {
  const AutoTypedSchema = autoTypedSchema();
  const AutoTypedModel = model('AutoTypeModel', AutoTypedSchema);

  (async() => {
  // Model-functions-test
  // Create should works with arbitrary objects.
    const randomObject = await AutoTypedModel.create({ unExistKey: 'unExistKey', description: 'st' });
    expectType<AutoTypedSchemaType['schema']['userName']>(randomObject.userName);

    const testDoc1 = await AutoTypedModel.create({ userName: 'M0_0a' });
    expectType<AutoTypedSchemaType['schema']['userName']>(testDoc1.userName);
    expectType<AutoTypedSchemaType['schema']['description']>(testDoc1.description);

    const testDoc2 = await AutoTypedModel.insertMany([{ userName: 'M0_0a' }]);
    expectType<AutoTypedSchemaType['schema']['userName']>(testDoc2[0].userName);
    expectType<AutoTypedSchemaType['schema']['description'] | undefined>(testDoc2[0]?.description);

    const testDoc3 = await AutoTypedModel.findOne({ userName: 'M0_0a' });
    expectType<AutoTypedSchemaType['schema']['userName'] | undefined>(testDoc3?.userName);
    expectType<AutoTypedSchemaType['schema']['description'] | undefined>(testDoc3?.description);

    // Model-statics-functions-test
    expectType<ReturnType<AutoTypedSchemaType['statics']['staticFn']>>(AutoTypedModel.staticFn());

  })();
  return AutoTypedModel;
}

function gh11911() {
  interface IAnimal {
    name?: string;
  }

  const animalSchema = new Schema<IAnimal>({
    name: { type: String }
  });

  const Animal = model<IAnimal>('Animal', animalSchema);

  const changes: UpdateQuery<IAnimal> = {};
  expectAssignable<UpdateOneModel>({
    filter: {},
    update: changes
  });
}


function gh12059() {
  interface IAnimal {
    name?: string;
  }

  const animalSchema = new Schema<IAnimal>({
    name: { type: String }
  });

  const Animal = model<IAnimal>('Animal', animalSchema);
  const animal = new Animal();

  Animal.bulkSave([animal], { timestamps: false });
  Animal.bulkSave([animal], { timestamps: true });
  Animal.bulkSave([animal], {});
}

function schemaInstanceMethodsAndQueryHelpers() {
  type UserModelQuery = Query<any, HydratedDocument<User>, UserQueryHelpers> & UserQueryHelpers;
  interface UserQueryHelpers {
    byName(this: UserModelQuery, name: string): this
  }
  interface User {
    name: string;
  }
  interface UserInstanceMethods {
    doSomething(this: HydratedDocument<User>): string;
  }
  interface UserStaticMethods {
    findByName(name: string): Promise<HydratedDocument<User>>;
  }
  type UserModel = Model<User, UserQueryHelpers, UserInstanceMethods> & UserStaticMethods;

  const userSchema = new Schema<User, UserModel, UserInstanceMethods, UserQueryHelpers, any, UserStaticMethods>({
    name: String
  }, {
    statics: {
      findByName(name: string) {
        return model('User').findOne({ name }).orFail();
      }
    },
    methods: {
      doSomething() {
        return 'test';
      }
    },
    query: {
      byName(this: UserModelQuery, name: string) {
        return this.where({ name });
      }
    }
  });

  const TestModel = model<User, UserModel, UserQueryHelpers>('User', userSchema);
}

function gh12100() {
  const schema = new Schema();

  const Model = model('Model', schema);

  Model.syncIndexes({ continueOnError: true, noResponse: true });
  Model.syncIndexes({ continueOnError: false, noResponse: true });
}

(function gh12070() {
  const schema_with_string_id = new Schema({ _id: String, nickname: String });
  const TestModel = model('test', schema_with_string_id);
  const obj = new TestModel();

  expectType<string | null>(obj._id);
})();

(async function gh12094() {
  const userSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    avatar: String
  });

  const User = model('User', userSchema);

  const doc = await User.exists({ name: 'Bill' }).orFail();
  expectType<Types.ObjectId>(doc._id);
})();


function modelRemoveOptions() {
  const cmodel = model('Test', new Schema());

  const res: DeleteResult = await cmodel.deleteOne({}, {});
}

async function gh12286() {
  interface IUser{
    name: string;
  }
  const schema = new Schema<IUser>({
    name: { type: String, required: true }
  });

  const User = model<IUser>('User', schema);

  const user = await User.findById('0'.repeat(24), { name: 1 }).lean();
  if (user == null) {
    return;
  }
  expectType<string>(user.name);
}


function gh12332() {
  interface IUser{
    age: number
  }
  const schema = new Schema<IUser>({ age: Number });

  const User = model<IUser>('User', schema);

  User.castObject({ age: '19' });
  User.castObject({ age: '19' }, { ignoreCastErrors: true });
}

async function gh12347() {
  interface IUser{
    name: string;
  }
  const schema = new Schema<IUser>({
    name: { type: String, required: true }
  });

  const User = model<IUser>('User', schema);

  const replaceOneResult = await User.replaceOne({}, {});
  expectType<UpdateWriteOpResult>(replaceOneResult);
}

async function gh12319() {
  const projectSchema = new Schema(
    {
      name: {
        type: String,
        required: true
      }
    },
    {
      methods: {
        async doSomething() {
        }
      }
    }
  );

  const ProjectModel = model('Project', projectSchema);

  type ProjectModelHydratedDoc = HydratedDocumentFromSchema<
    typeof projectSchema
  >;

  expectType<ProjectModelHydratedDoc>(await ProjectModel.findOne().orFail());
}

function findWithId() {
  const id = new Types.ObjectId();
  const TestModel = model('test', new Schema({}));
  TestModel.find(id);
  TestModel.findOne(id);
}

function gh12573ModelAny() {
  const TestModel = model<any>('Test', new Schema({}));
  const doc = new TestModel();
  expectType<any>(doc);
  const { fieldA } = doc;
  expectType<any>(fieldA);
}

function aggregateOptionsTest() {
  const TestModel = model('test', new Schema({}));
  const options: AggregateOptions = {};
  TestModel.aggregate(undefined, options);
}

async function gh13151() {
  interface ITest {
    title: string;
  }

  const TestSchema = new Schema(
    {
      title: {
        type: String,
        required: true
      }
    }
  );

  const TestModel = model<ITest>('Test', TestSchema);
  const test = await TestModel.findOne().lean();
  expectType<ITest & { _id: Types.ObjectId } | null>(test);
  if (!test) return;
  expectType<ITest & { _id: Types.ObjectId }>(test);
}

function gh13206() {
  interface ITest {
    name: string;
  }
  const TestSchema = new Schema({ name: String });
  const TestModel = model<ITest>('Test', TestSchema);
  TestModel.watch<ITest, ChangeStreamInsertDocument<ITest>>([], { fullDocument: 'updateLookup' }).on('change', (change) => {
    expectType<ChangeStreamInsertDocument<ITest>>(change);
  });
}

function gh13529() {
  interface ResourceDoc {
    foo: string;
  }

  type ResourceIdT<ResourceIdField extends string> = {
    [key in ResourceIdField]: string;
  };
  type ResourceDocWithId<ResourceIdField extends string> = ResourceDoc & ResourceIdT<ResourceIdField>;

  function test<
    ResourceType extends string,
    DocT extends ResourceDocWithId<`${ResourceType}Id`>>(dbModel: Model<DocT>) {
    const resourceDoc = new dbModel();
    resourceDoc.foo = 'bar';
  }
}

async function gh13705() {
  const schema = new Schema({ name: String });
  const TestModel = model('Test', schema);

  type ExpectedLeanDoc = (mongoose.FlattenMaps<{ name?: string | null }> & { _id: mongoose.Types.ObjectId });

  const findByIdRes = await TestModel.findById('0'.repeat(24), undefined, { lean: true });
  expectType<ExpectedLeanDoc | null>(findByIdRes);

  const findOneRes = await TestModel.findOne({ _id: '0'.repeat(24) }, undefined, { lean: true });
  expectType<ExpectedLeanDoc | null>(findOneRes);

  const findRes = await TestModel.find({ _id: '0'.repeat(24) }, undefined, { lean: true });
  expectType<ExpectedLeanDoc[]>(findRes);

  const findByIdAndDeleteRes = await TestModel.findByIdAndDelete('0'.repeat(24), { lean: true });
  expectType<ExpectedLeanDoc | null>(findByIdAndDeleteRes);

  const findByIdAndUpdateRes = await TestModel.findByIdAndUpdate('0'.repeat(24), {}, { lean: true });
  expectType<ExpectedLeanDoc | null>(findByIdAndUpdateRes);

  const findOneAndDeleteRes = await TestModel.findOneAndDelete({ _id: '0'.repeat(24) }, { lean: true });
  expectType<ExpectedLeanDoc | null>(findOneAndDeleteRes);

  const findOneAndReplaceRes = await TestModel.findOneAndReplace({ _id: '0'.repeat(24) }, {}, { lean: true });
  expectType<ExpectedLeanDoc | null>(findOneAndReplaceRes);

  const findOneAndUpdateRes = await TestModel.findOneAndUpdate({}, {}, { lean: true });
  expectType<ExpectedLeanDoc | null>(findOneAndUpdateRes);

  const findOneAndUpdateResWithMetadata = await TestModel.findOneAndUpdate({}, {}, { lean: true, includeResultMetadata: true });
  expectAssignable<ModifyResult<ExpectedLeanDoc>>(findOneAndUpdateResWithMetadata);
}

async function gh13746() {
  const schema = new Schema({ name: String });
  const TestModel = model('Test', schema);

  type OkType = 0 | 1;

  const findByIdAndUpdateRes = await TestModel.findByIdAndUpdate('0'.repeat(24), {}, { includeResultMetadata: true });
  expectType<boolean | undefined>(findByIdAndUpdateRes.lastErrorObject?.updatedExisting);
  expectType<ObjectId | undefined>(findByIdAndUpdateRes.lastErrorObject?.upserted);
  expectType<OkType>(findByIdAndUpdateRes.ok);

  const findOneAndReplaceRes = await TestModel.findOneAndReplace({ _id: '0'.repeat(24) }, {}, { includeResultMetadata: true });
  expectType<boolean | undefined>(findOneAndReplaceRes.lastErrorObject?.updatedExisting);
  expectType<ObjectId | undefined>(findOneAndReplaceRes.lastErrorObject?.upserted);
  expectType<OkType>(findOneAndReplaceRes.ok);

  const findOneAndUpdateRes = await TestModel.findOneAndUpdate({ _id: '0'.repeat(24) }, {}, { includeResultMetadata: true });
  expectType<boolean | undefined>(findOneAndUpdateRes.lastErrorObject?.updatedExisting);
  expectType<ObjectId | undefined>(findOneAndUpdateRes.lastErrorObject?.upserted);
  expectType<OkType>(findOneAndUpdateRes.ok);

  const findOneAndDeleteRes = await TestModel.findOneAndDelete({ _id: '0'.repeat(24) }, { includeResultMetadata: true });
  expectType<boolean | undefined>(findOneAndDeleteRes.lastErrorObject?.updatedExisting);
  expectType<ObjectId | undefined>(findOneAndDeleteRes.lastErrorObject?.upserted);
  expectType<OkType>(findOneAndDeleteRes.ok);

  const findByIdAndDeleteRes = await TestModel.findByIdAndDelete('0'.repeat(24), { includeResultMetadata: true });
  expectType<boolean | undefined>(findByIdAndDeleteRes.lastErrorObject?.updatedExisting);
  expectType<ObjectId | undefined>(findByIdAndDeleteRes.lastErrorObject?.upserted);
  expectType<OkType>(findByIdAndDeleteRes.ok);
}

function gh13904() {
  const schema = new Schema({ name: String });

  interface ITest {
    name?: string;
  }
  const Test = model<ITest>('Test', schema);

  expectAssignable<Promise<InsertManyResult<ITest>>>(Test.insertMany(
    [{ name: 'test' }],
    {
      ordered: false,
      rawResult: true
    }
  ));
}

function gh13957() {
  class RepositoryBase<T> {
    protected model: mongoose.Model<T>;

    constructor(schemaModel: mongoose.Model<T>) {
      this.model = schemaModel;
    }

    // Testing that the following compiles successfully
    async insertMany(elems: T[]): Promise<T[]> {
      elems = await this.model.insertMany(elems);
      return elems;
    }
  }

  interface ITest {
    name: string
  }
  const schema = new Schema({ name: { type: String, required: true } });
  const TestModel = model('Test', schema);
  const repository = new RepositoryBase<ITest>(TestModel);
  expectType<Promise<ITest[]>>(repository.insertMany([{ name: 'test' }]));
}

function gh13897() {
  interface IDocument {
    name: string;
    createdAt: Date;
    updatedAt: Date;
  }

  const documentSchema = new Schema<IDocument>({
    name: { type: String, required: true }
  },
  {
    timestamps: true
  });

  const Document = model<IDocument>('Document', documentSchema);
  const doc = new Document({ name: 'foo' });
  expectType<Date>(doc.createdAt);
  expectError(new Document<IDocument>({ name: 'foo' }));
}

async function gh14026() {
  interface Foo {
    bar: string[];
  }

  const FooModel = mongoose.model<Foo>('Foo', new mongoose.Schema<Foo>({ bar: [String] }));

  const distinctBar = await FooModel.distinct('bar');
  expectType<string[]>(distinctBar);

  const TestModel = mongoose.model(
    'Test',
    new mongoose.Schema({ bar: [String] })
  );

  expectType<string[]>(await TestModel.distinct('bar'));
}

async function gh14072() {
  type Test = {
    _id: mongoose.Types.ObjectId;
    num: number;
    created_at: number;
    updated_at: number;
  };

  const schema = new mongoose.Schema<Test>(
    {
      num: { type: Number },
      created_at: { type: Number },
      updated_at: { type: Number }
    },
    {
      timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        currentTime: () => new Date().valueOf() / 1000
      }
    }
  );

  const M = mongoose.model<Test>('Test', schema);
  await M.bulkWrite([
    {
      insertOne: {
        document: { num: 3 }
      }
    },
    {
      updateOne: {
        filter: { num: 6 },
        update: { num: 8 },
        timestamps: false
      }
    },
    {
      updateMany: {
        filter: { num: 5 },
        update: { num: 10 },
        timestamps: false
      }
    }
  ]);
}

async function gh14003() {
  const schema = new Schema({ name: String });
  const TestModel = model('Test', schema);

  await TestModel.validate({ name: 'foo' }, ['name']);
  await TestModel.validate({ name: 'foo' }, { pathsToSkip: ['name'] });
}

async function gh14114() {
  const schema = new mongoose.Schema({ name: String });
  const Test = mongoose.model('Test', schema);

  expectType<ReturnType<(typeof Test)['hydrate']> | null>(
    await Test.findOneAndDelete({ name: 'foo' })
  );
}

async function gh13999() {
  class RepositoryBase<T> {
    protected model: mongoose.Model<T>;

    constructor(schemaModel: mongoose.Model<T>) {
      this.model = schemaModel;
    }

    async insertMany(elems: T[]): Promise<T[]> {
      elems = await this.model.insertMany(elems, { session: null });
      return elems;
    }
  }
}

function gh4727() {
  const userSchema = new mongoose.Schema({
    name: String
  });
  const companySchema = new mongoose.Schema({
    name: String,
    users: [{ ref: 'User', type: mongoose.Schema.Types.ObjectId }]
  });

  mongoose.model('UserTestHydrate', userSchema);
  const Company = mongoose.model('CompanyTestHyrdrate', companySchema);

  const users = [{ _id: new mongoose.Types.ObjectId(), name: 'Val' }];
  const company = { _id: new mongoose.Types.ObjectId(), name: 'Booster', users: [users[0]] };

  return Company.hydrate(company, {}, { hydratedPopulatedDocs: true });
}

async function gh14440() {
  const testSchema = new Schema({
    dateProperty: { type: Date }
  });

  const TestModel = model('Test', testSchema);

  const doc = new TestModel();
  await TestModel.bulkWrite([
    {
      updateOne: {
        filter: { _id: doc._id },
        update: { dateProperty: (new Date('2023-06-01')).toISOString() }
      }
    }
  ]);
}

async function gh12064() {
  const FooSchema = new Schema({
    one: { type: String }
  });

  const MyRecordSchema = new Schema({
    _id: { type: String },
    foo: { type: FooSchema },
    arr: [Number]
  });

  const MyRecord = model('MyRecord', MyRecordSchema);

  expectType<(string | null)[]>(
    await MyRecord.distinct('foo.one').exec()
  );
  expectType<(string | null)[]>(
    await MyRecord.find().distinct('foo.one').exec()
  );
  expectType<unknown[]>(await MyRecord.distinct('foo.two').exec());
  expectType<unknown[]>(await MyRecord.distinct('arr.0').exec());
}

function testWithLevel1NestedPaths() {
  type Test1 = WithLevel1NestedPaths<{
    topLevel: number,
    nested1Level: {
      l2: string
    },
    nested2Level: {
      l2: { l3: boolean }
    }
  }>;

  expectType<{
    topLevel: number,
    nested1Level: { l2: string },
    'nested1Level.l2': string,
    nested2Level: { l2: { l3: boolean } },
    'nested2Level.l2': { l3: boolean }
  }>({} as Test1);

  const FooSchema = new Schema({
    one: { type: String }
  });

  const schema = new Schema({
    _id: { type: String },
    foo: { type: FooSchema }
  });

  type InferredDocType = InferSchemaType<typeof schema>;

  type Test2 = WithLevel1NestedPaths<InferredDocType>;
  expectAssignable<{
    _id: string | null | undefined,
    foo?: { one?: string | null | undefined } | null | undefined,
    'foo.one': string | null | undefined
  }>({} as Test2);
}
