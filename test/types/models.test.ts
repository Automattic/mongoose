import mongoose, {
  AggregateOptions,
  CallbackError,
  DeleteResult,
  Document,
  HydratedDocument,
  HydratedDocumentFromSchema,
  InferSchemaType,
  InsertManyResult,
  Model,
  ModifyResult,
  Query,
  Schema,
  Types,
  UpdateQuery,
  UpdateWriteOpResult,
  WithLevel1NestedPaths,
  connection,
  model,
  UpdateOneModel,
  UpdateManyModel
} from 'mongoose';
import { AutoTypedSchemaType, autoTypedSchema } from './schema.test';
import { UpdateOneModel as MongoUpdateOneModel, ChangeStreamInsertDocument, ObjectId } from 'mongodb';
import { expect } from 'tstyche';

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

  expect(Test).type.toBe<Model<ITest, {}, ITestMethods, {}>>();

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
  expect(res.insertedIds[0]).type.toBe<Types.ObjectId>();

  const res2 = await Test.insertMany([{ foo: 'bar' }], { ordered: false, rawResult: true });
  expect(res2.mongoose.results[0]).type.toBe<Error | Object | ReturnType<(typeof Test)['hydrate']>>();
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
    expect(doc.firstName).type.toBe<string>();
    expect(doc.lastName).type.toBe<string>();
    expect(doc._id).type.toBe<Types.ObjectId>();
    expect(doc.groupId).type.toBe<string>();
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

async function gh15532() {
  const userSchema = new Schema({
    name: { type: String, required: true }
  });

  const BaseUserModel = model('User', userSchema);
  class UserModel extends BaseUserModel {
    updateName(name: string) {
      this.name = name;
      return this.save();
    }

    static findByName(name: string) {
      return this.findOne({ name });
    }
  }

  const foundDoc = await UserModel.findOne({ name: 'test' }).orFail();
  expect(foundDoc.updateName('foo')).type.toBe<Promise<UserModel>>();

  type ExplicitUserDoc = HydratedDocument<{ name: string }>;
  const foundExplicitDoc = await UserModel.findOne<ExplicitUserDoc>({ name: 'test' }).orFail();
  expect(foundExplicitDoc).type.toBe<ExplicitUserDoc>();
  const foundExplicitDocById = await UserModel.findById<ExplicitUserDoc>('0'.repeat(24)).orFail();
  expect(foundExplicitDocById).type.toBe<ExplicitUserDoc>();

  const foundDocFromStatic = await UserModel.findByName('test').orFail();
  expect(foundDocFromStatic.updateName('foo')).type.toBe<Promise<UserModel>>();

  const foundDocsAfterUpdate = await UserModel.updateOne({ name: 'test' }, { name: 'foo' }).find({ name: 'foo' });
  expect(foundDocsAfterUpdate[0].updateName('bar')).type.toBe<Promise<UserModel>>();

  const foundDocsAfterDistinct = await UserModel.distinct('name').find({ name: 'foo' });
  expect(foundDocsAfterDistinct[0].updateName('baz')).type.toBe<Promise<UserModel>>();
}

Project.createCollection({ expires: '5 seconds' });
Project.createCollection({ expireAfterSeconds: 5 });
expect(Project.createCollection).type.not.toBeCallableWith({ expireAfterSeconds: '5 seconds' });

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
  interface BaseModelClassDoc {
    firstname: string;
  }

  const baseModelClassSchema = new Schema({
    firstname: String
  });

  const BaseModel = model<BaseModelClassDoc>('test', baseModelClassSchema);

  expect(BaseModel.bulkWrite<{ testy: string }>).type.not.toBeCallableWith([
    {
      insertOne: {
        document: {
          test: 'hello'
        }
      }
    }
  ]);

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
    const randomObject = await AutoTypedModel.create({ unExistKey: 'unExistKey', description: 'st' } as Partial<InferSchemaType<typeof AutoTypedSchema>>);
    expect(randomObject.userName).type.toBe<AutoTypedSchemaType['schema']['userName']>();

    const testDoc1 = await AutoTypedModel.create({ userName: 'M0_0a' });
    expect(testDoc1.userName).type.toBe<AutoTypedSchemaType['schema']['userName']>();
    expect(testDoc1.description).type.toBe<AutoTypedSchemaType['schema']['description']>();

    const testDoc2 = await AutoTypedModel.insertMany([{ userName: 'M0_0a' }]);
    expect(testDoc2[0].userName).type.toBe<AutoTypedSchemaType['schema']['userName']>();
    expect(testDoc2[0].description).type.toBe<AutoTypedSchemaType['schema']['description'] | undefined>();

    const testDoc3 = await AutoTypedModel.findOne({ userName: 'M0_0a' });
    expect(testDoc3?.userName).type.toBe<AutoTypedSchemaType['schema']['userName'] | undefined>();
    expect(testDoc3?.description).type.toBe<AutoTypedSchemaType['schema']['description'] | undefined>();

    // Model-statics-functions-test
    expect(AutoTypedModel.staticFn()).type.toBe<ReturnType<AutoTypedSchemaType['statics']['staticFn']>>();

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
  expect({
    filter: {},
    update: changes
  }).type.toBeAssignableTo<MongoUpdateOneModel>();
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

  Model.syncIndexes({ continueOnError: true, sparse: true });
  Model.syncIndexes({ continueOnError: false, sparse: true });
}

(function gh12070() {
  const schema_with_string_id = new Schema({ _id: String, nickname: String });
  const TestModel = model('test', schema_with_string_id);
  const obj = new TestModel();

  expect(obj._id).type.toBe<string | null>();
})();

(async function gh12094() {
  const userSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    avatar: String
  });

  const User = model('User', userSchema);

  const doc = await User.exists({ name: 'Bill' }).orFail();
  expect(doc._id).type.toBe<Types.ObjectId>();
})();


async function modelRemoveOptions() {
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
  expect(user.name).type.toBe<string>();
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
  expect(replaceOneResult).type.toBe<UpdateWriteOpResult>();
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
  const doc = new ProjectModel();
  doc.doSomething();

  type ProjectModelHydratedDoc = HydratedDocumentFromSchema<
    typeof projectSchema
  >;

  expect(await ProjectModel.findOne().orFail()).type.toBe<ProjectModelHydratedDoc>();
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
  expect(doc).type.toBe<any>();
  const { fieldA } = doc;
  expect(fieldA).type.toBe<any>();
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
  expect(test).type.toBe<ITest & { _id: Types.ObjectId, __v: number } | null>();
  if (!test) return;
  expect(test).type.toBe<ITest & { _id: Types.ObjectId, __v: number }>();
}

function gh13206() {
  interface ITest {
    name: string;
  }
  const TestSchema = new Schema({ name: String });
  const TestModel = model<ITest>('Test', TestSchema);
  TestModel.watch<ITest, ChangeStreamInsertDocument<ITest>>([], { fullDocument: 'updateLookup' }).on('change', (change) => {
    expect(change).type.toBe<ChangeStreamInsertDocument<ITest>>();
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

  type ExpectedLeanDoc = (mongoose.FlattenMaps<{ name?: string | null }> & { _id: mongoose.Types.ObjectId } & { __v: number });

  const findByIdRes = await TestModel.findById('0'.repeat(24), undefined, { lean: true });
  expect(findByIdRes).type.toBe<ExpectedLeanDoc | null>();

  const findOneRes = await TestModel.findOne({ _id: '0'.repeat(24) }, undefined, { lean: true });
  expect(findOneRes).type.toBe<ExpectedLeanDoc | null>();

  const findRes = await TestModel.find({ _id: '0'.repeat(24) }, undefined, { lean: true });
  expect(findRes).type.toBe<ExpectedLeanDoc[]>();

  const findByIdAndDeleteRes = await TestModel.findByIdAndDelete('0'.repeat(24), { lean: true });
  expect(findByIdAndDeleteRes).type.toBe<ExpectedLeanDoc | null>();

  const findByIdAndUpdateRes = await TestModel.findByIdAndUpdate('0'.repeat(24), {}, { lean: true });
  expect(findByIdAndUpdateRes).type.toBe<ExpectedLeanDoc | null>();

  const findOneAndDeleteRes = await TestModel.findOneAndDelete({ _id: '0'.repeat(24) }, { lean: true });
  expect(findOneAndDeleteRes).type.toBe<ExpectedLeanDoc | null>();

  const findOneAndReplaceRes = await TestModel.findOneAndReplace({ _id: '0'.repeat(24) }, {}, { lean: true });
  expect(findOneAndReplaceRes).type.toBe<ExpectedLeanDoc | null>();

  const findOneAndUpdateRes = await TestModel.findOneAndUpdate({}, {}, { lean: true });
  expect(findOneAndUpdateRes).type.toBe<ExpectedLeanDoc | null>();

  const findOneAndUpdateResWithMetadata = await TestModel.findOneAndUpdate({}, {}, { lean: true, includeResultMetadata: true });
  expect(findOneAndUpdateResWithMetadata).type.toBe<ModifyResult<{ name?: string | null | undefined }>>();
}

async function gh13746() {
  const schema = new Schema({ name: String });
  const TestModel = model('Test', schema);

  type OkType = 0 | 1;

  const findByIdAndUpdateRes = await TestModel.findByIdAndUpdate('0'.repeat(24), {}, { includeResultMetadata: true });
  expect(findByIdAndUpdateRes.lastErrorObject?.updatedExisting).type.toBe<boolean | undefined>();
  expect(findByIdAndUpdateRes.lastErrorObject?.upserted).type.toBe<ObjectId | undefined>();
  expect(findByIdAndUpdateRes.ok).type.toBe<OkType>();

  const findOneAndReplaceRes = await TestModel.findOneAndReplace({ _id: '0'.repeat(24) }, {}, { includeResultMetadata: true });
  expect(findOneAndReplaceRes.lastErrorObject?.updatedExisting).type.toBe<boolean | undefined>();
  expect(findOneAndReplaceRes.lastErrorObject?.upserted).type.toBe<ObjectId | undefined>();
  expect(findOneAndReplaceRes.ok).type.toBe<OkType>();

  const findOneAndUpdateRes = await TestModel.findOneAndUpdate({ _id: '0'.repeat(24) }, {}, { includeResultMetadata: true });
  expect(findOneAndUpdateRes.lastErrorObject?.updatedExisting).type.toBe<boolean | undefined>();
  expect(findOneAndUpdateRes.lastErrorObject?.upserted).type.toBe<ObjectId | undefined>();
  expect(findOneAndUpdateRes.ok).type.toBe<OkType>();

  const findOneAndDeleteRes = await TestModel.findOneAndDelete({ _id: '0'.repeat(24) }, { includeResultMetadata: true });
  expect(findOneAndDeleteRes.lastErrorObject?.updatedExisting).type.toBe<boolean | undefined>();
  expect(findOneAndDeleteRes.lastErrorObject?.upserted).type.toBe<ObjectId | undefined>();
  expect(findOneAndDeleteRes.ok).type.toBe<OkType>();

  const findByIdAndDeleteRes = await TestModel.findByIdAndDelete('0'.repeat(24), { includeResultMetadata: true });
  expect(findByIdAndDeleteRes.lastErrorObject?.updatedExisting).type.toBe<boolean | undefined>();
  expect(findByIdAndDeleteRes.lastErrorObject?.upserted).type.toBe<ObjectId | undefined>();
  expect(findByIdAndDeleteRes.ok).type.toBe<OkType>();
}

function gh13904() {
  const schema = new Schema({ name: String });

  interface ITest {
    name?: string;
  }
  const Test = model<ITest>('Test', schema);

  expect(Test.insertMany(
    [{ name: 'test' }],
    {
      ordered: false,
      rawResult: true
    }
  )).type.toBeAssignableTo<Promise<InsertManyResult<ITest>>>();
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
  expect(repository.insertMany([{ name: 'test' }])).type.toBe<Promise<ITest[]>>();
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
  expect(doc.createdAt).type.toBe<Date>();
  expect(Document<IDocument>).type.not.toBeConstructableWith({ name: 'foo' });
}

async function gh14026() {
  interface Foo {
    bar: string[];
  }

  const FooModel = mongoose.model<Foo>('Foo', new mongoose.Schema<Foo>({ bar: [String] }));

  const distinctBar = await FooModel.distinct('bar');
  expect(distinctBar).type.toBe<string[]>();

  const TestModel = mongoose.model(
    'Test',
    new mongoose.Schema({ bar: [String] })
  );

  expect(await TestModel.distinct('bar')).type.toBe<string[]>();
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

  const doc = await Test.findOneAndDelete({ name: 'foo' });
  expect(doc).type.toBe<ReturnType<(typeof Test)['hydrate']> | null>();
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

  expect(await MyRecord.distinct('foo.one').exec()).type.toBe<(string | null)[]>();
  expect(await MyRecord.find().distinct('foo.one').exec()).type.toBe<(string | null)[]>();
  expect(await MyRecord.distinct('foo.two').exec()).type.toBe<unknown[]>();
  expect(await MyRecord.distinct('arr.0').exec()).type.toBe<unknown[]>();
}

function testWithLevel1NestedPaths() {
  type Test1 = WithLevel1NestedPaths<{
    topLevel: number,
    nested1Level?: {
      l2?: string | null | undefined
    },
    nested2Level: {
      l2: { l3: boolean }
    }
  }>;

  type ExpectedTest1Type = {
    topLevel: number,
    nested1Level: { l2?: string | null | undefined },
    'nested1Level.l2': string | null | undefined,
    nested2Level: { l2: { l3: boolean } },
    'nested2Level.l2': { l3: boolean }
  };
  expect<Test1>().type.toBe<ExpectedTest1Type>();

  const FooSchema = new Schema({
    one: { type: String }
  });

  const schema = new Schema({
    _id: { type: String },
    foo: { type: FooSchema }
  });

  type InferredDocType = InferSchemaType<typeof schema>;

  type Test2 = WithLevel1NestedPaths<InferredDocType>;
  type ExpectedTest2Type = {
    _id: string,
    foo: { one?: string | null | undefined },
    'foo.one': string | null | undefined
  };
  expect<Test2>().type.toBe<ExpectedTest2Type>();
  expect<Test2['_id']>().type.toBe<string>();
  expect<Test2['foo']>().type.toBe<{ one?: string | null | undefined }>();
  expect<Test2['foo.one']>().type.toBe<string | null | undefined>();
  expect<keyof Test2>().type.toBe<'_id' | 'foo' | 'foo.one'>();
}

async function gh14802() {
  const schema = new mongoose.Schema({
    name: String
  });
  const Model = model('Test', schema);

  const conn2 = mongoose.createConnection('mongodb://127.0.0.1:27017/mongoose_test');
  Model.useConnection(conn2);
}

async function gh14843() {
  const schema = new mongoose.Schema({
    name: String
  });
  const Model = model('Test', schema);

  const doc = await Model.insertOne({ name: 'taco' });
  expect(doc).type.toBe<ReturnType<(typeof Model)['hydrate']>>();
}

async function gh15369() {
  const schema = new mongoose.Schema({
    name: String
  });
  const Model = model('Test', schema);

  try {
    await Model.bulkSave([]);
  } catch (error) {
    if (error instanceof mongoose.Error.MongooseBulkSaveIncompleteError) {
      console.log('Bulk save error');
    }
    throw error;
  }
}

async function gh16032() {
  interface IEmail {
    _id: string;
    to: string;
    subject: string;
  }

  type EmailInstance = HydratedDocument<IEmail>;
  type EmailModelType = Model<IEmail, {}, {}, {}, EmailInstance>;

  const emailSchema = new Schema<IEmail, EmailModelType>({
    _id: { type: Schema.Types.String, required: true },
    to: { type: Schema.Types.String, required: true },
    subject: { type: Schema.Types.String, required: true }
  }, { _id: false });

  const Email = model<IEmail, EmailModelType>('Email', emailSchema);
  const emails: EmailInstance[] = [
    new Email({ _id: 'msg-001', to: 'a@example.com', subject: 'Hello' }),
    new Email({ _id: 'msg-002', to: 'b@example.com', subject: 'World' })
  ];

  await Email.bulkSave(emails);
}

async function gh15437() {
  interface Person {
    name: string;
    age: number;
    address: string;
  }

  const schema = new mongoose.Schema({
    name: String,
    age: Number,
    address: String
  });
  const PersonModel = model<Person>('Person', schema);

  const data = { name: 'John Doe', age: 30, address: '123 Main St' };

  // Test hydrating with string projection
  const doc1 = PersonModel.hydrate(data, 'name age');
  expect(doc1.name).type.toBe<string>();
  expect(doc1.age).type.toBe<number>();
  expect(doc1.address).type.toBe<string>();
}

async function customModelInstanceWithStatics() {
  type RawDocType = { name: string };
  type ModelType = mongoose.Model<RawDocType> & { someCustomProp: number };
  const schema = new Schema<RawDocType, ModelType>(
    { name: { type: String, required: true } },
    {
      statics: {
        function() {
          expect(this.someCustomProp).type.toBe<number>();
        }
      }
    }
  );
}

async function gh16526() {
  const schema = new Schema({ name: String });
  const Tank = model('Tank', schema);

  const insertManyResult = await Tank.insertMany([{ name: 'test' }], { lean: true, rawResult: true });
  expect(insertManyResult.insertedCount).type.toBe<number>();
}

async function gh15693() {
  interface IUser {
    name: string;
  }

  interface UserMethods {
    printNamePrefixed(this: IUser, prefix: string): void;
    printName(this: IUser): void;
    getName(): string;
  }

  const schema = new Schema<IUser, Model<IUser>, UserMethods>({ name: { type: String, required: true } });
  schema.method('printNamePrefixed', function printName(this: IUser, prefix: string) {
    expect(this).type.not.toHaveProperty('isModified');
    expect(this).type.not.toHaveProperty('doesNotExist');
    expect(this.name).type.toBe<string>();
    console.log(prefix + this.name);
  });
  schema.method('printName', function printName(this: IUser) {
    expect(this).type.not.toHaveProperty('isModified');
    expect(this).type.not.toHaveProperty('doesNotExist');
    expect(this.name).type.toBe<string>();
    console.log(this.name);
  });
  schema.method('getName', function getName() {
    expect(this.isModified('name')).type.toBe<boolean>();
    return this.name;
  });
  const User = model('user', schema);

  const leanInst = await User.findOne({}).lean().orFail();
  User.schema.methods.printName.apply(leanInst);
  User.schema.methods.printNamePrefixed.call(leanInst, '');
}

async function gh15781() {
  const userSchema = new Schema({
    createdAt: { type: Date, immutable: true },
    name: String
  }, { timestamps: true });

  const User = model('User', userSchema);

  await User.bulkWrite([
    {
      updateOne: {
        filter: { name: 'John' },
        update: { createdAt: new Date() },
        overwriteImmutable: true,
        timestamps: false
      }
    },
    {
      updateMany: {
        filter: { name: 'Jane' },
        update: { createdAt: new Date() },
        overwriteImmutable: true,
        timestamps: false
      }
    }
  ]);

  expect<UpdateOneModel['timestamps']>().type.toBe<boolean | undefined>();
  expect<UpdateOneModel['overwriteImmutable']>().type.toBe<boolean | undefined>();
  expect<UpdateManyModel['timestamps']>().type.toBe<boolean | undefined>();
  expect<UpdateManyModel['overwriteImmutable']>().type.toBe<boolean | undefined>();
}

async function gh15910() {
  interface FooType {
    _id: Types.ObjectId;
    date: Date;
  }
  const fooSchema = new Schema<FooType>({
    date: { type: Date, required: true }
  });

  const FooModel = model<FooType>('foo', fooSchema);

  const query: mongoose.QueryFilter<FooType> = {
    date: { $lte: new Date() }
  };

  const test: mongoose.AnyBulkWriteOperation<FooType>[] = [
    {
      updateOne: {
        filter: query,
        update: {
          $set: {
            date: new Date()
          }
        }
      }
    }
  ];

  await FooModel.bulkWrite(test);
}

async function gh15947() {
  const schema = new Schema({
    name: String,
    subdocument: {
      type: new Schema({
        _id: {
          type: Schema.Types.ObjectId,
          required: true
        },
        field1: {
          type: String,
          required: true,
          trim: true
        },
        field2: {
          type: Number,
          required: false
        }
      }),
      required: true
    },
    docArr: [{ _id: 'ObjectId' }]
  });
  const TestModel = model('Test', schema);
  await TestModel.create({
    name: 'test',
    subdocument: {
      // Should allow strings for ObjectIds
      _id: '6951265a11a2b0976013be20',
      field1: 'test',
      field2: 1
    },
    docArr: [{ _id: '6951265a11a2b0976013be20' }]
  });
}

function hydrateWithStrictOption() {
  const schema = new mongoose.Schema({
    name: String,
    age: Number
  }, { strict: true });

  const TestModel = mongoose.model('Test', schema);

  // Test with strict: false
  const doc1 = TestModel.hydrate({
    _id: new mongoose.Types.ObjectId(),
    name: 'John',
    age: 30,
    extraField: 'value'
  }, undefined, { strict: false });

  expect(doc1).type.toBe<ReturnType<(typeof TestModel)['hydrate']>>();

  // Test with strict: true
  const doc2 = TestModel.hydrate({
    _id: new mongoose.Types.ObjectId(),
    name: 'Jane',
    age: 25
  }, undefined, { strict: true });

  expect(doc2).type.toBe<ReturnType<(typeof TestModel)['hydrate']>>();

  // Test with strict: 'throw'
  const doc3 = TestModel.hydrate({
    _id: new mongoose.Types.ObjectId(),
    name: 'Bob',
    age: 35
  }, undefined, { strict: 'throw' });

  expect(doc3).type.toBe<ReturnType<(typeof TestModel)['hydrate']>>();

  // Test without strict option
  const doc4 = TestModel.hydrate({
    _id: new mongoose.Types.ObjectId(),
    name: 'Alice',
    age: 28
  });

  expect(doc4).type.toBe<ReturnType<(typeof TestModel)['hydrate']>>();
}
