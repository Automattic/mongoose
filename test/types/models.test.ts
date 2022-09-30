import { ObjectId } from 'bson';
import {
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
  LeanDocument,
  Query,
  UpdateWriteOpResult
} from 'mongoose';
import { expectAssignable, expectError, expectType } from 'tsd';
import { AutoTypedSchemaType, autoTypedSchema } from './schema.test';
import { UpdateOneModel } from 'mongodb';

function conventionalSyntax(): void {
  interface ITest extends Document {
    foo: string;
  }

  const TestSchema = new Schema<ITest>({
    foo: { type: String, required: true }
  });

  const Test = connection.model<ITest>('Test', TestSchema);

  const bar = (SomeModel: Model<ITest>) => console.log(SomeModel);

  bar(Test);

  const doc = new Test({ foo: '42' });
  console.log(doc.foo);
  doc.save();

  expectError(new Test<{ foo: string }>({}));
}

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

  const TestSchema = new Schema<ITest & Document>({
    foo: { type: String, required: true }
  });

  const Test = connection.model<ITest & Document>('Test', TestSchema);

  Test.insertMany([{ foo: 'bar' }]).then(async res => {
    res.length;
  });

  const res = await Test.insertMany([{ foo: 'bar' }], { rawResult: true });
  expectType<ObjectId>(res.insertedIds[0]);
}

function schemaStaticsWithoutGenerics() {
  const UserSchema = new Schema({});
  UserSchema.statics.static1 = function() {
    return '';
  };

  interface IUserDocument extends Document {
    instanceField: string;
  }
  interface IUserModel extends Model<IUserDocument> {
    static1: () => string;
  }

  const UserModel: IUserModel = model<IUserDocument, IUserModel>('User', UserSchema);
  UserModel.static1();
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
    const doc = await model.findOne({ groupId: 'test' }).lean().exec();
    expectType<string | undefined>(doc?.firstName);
    expectType<string | undefined>(doc?.lastName);
    expectType<Types.ObjectId | undefined>(doc?._id);
    expectType<string | undefined>(doc?.groupId);
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

interface IProject extends Document {
  name: string;
  myMethod(): number;
}

interface ProjectModel extends Model<IProject> {
  myStatic(): number;
}

const projectSchema = new Schema<IProject, ProjectModel>({ name: String });

projectSchema.pre('save', function() {
  // this => IProject
});

projectSchema.post('save', function() {
  // this => IProject
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
Project.exists({ name: 'Hello' }, (err, result) => {
  result?._id;
});

function find() {
  // no args
  Project.find();

  // just filter
  Project.find({});
  Project.find({ name: 'Hello' });

  // just callback
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

  // filter + projection + options + callback
  Project.find({}, undefined, { limit: 5 }, (error: CallbackError, result: IProject[]) => console.log(error, result));
  Project.find({}, null, { limit: 5 }, (error: CallbackError, result: IProject[]) => console.log(error, result));
  Project.find({}, { name: 1 }, { limit: 5 }, (error: CallbackError, result: IProject[]) => console.log(error, result));
}

function inheritance() {
  class InteractsWithDatabase extends Model {
    async _update(): Promise<void> {
      await this.save();
    }
  }

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

  expectType<string>(obj._id);
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

  cmodel.remove({}, {});
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
  expectType<string | undefined>(user?.name);
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
