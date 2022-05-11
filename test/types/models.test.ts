import { Schema, Document, Model, Types, connection, model } from 'mongoose';
import { expectError } from 'tsd';

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

  const bar = (SomeModel: Model<any, any, any>) => console.log(SomeModel);

  bar(Test);

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
  const ids: Types.ObjectId[] = Object.values(res.insertedIds);
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

  async function foo<T extends Group>(model: Model<any>): Promise<T | null> {
    const doc: T | null = await model.findOne({ groupId: 'test' }).lean().exec();
    return doc;
  }

  const UserModel = model<User>('gh10359', new Schema({ firstName: String, lastName: String, groupId: String }));
  const u: User | null = await foo<User>(UserModel);
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