import { Schema, Document, Model, connection, model, mongoose } from 'mongoose';

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

function insertManyTest() {
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
}

function schemaStaticsWithoutGenerics() {
  const UserSchema = new Schema({});
  UserSchema.statics.static1 = function() { return ''; };

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

  type IDogDocument = IDog & Types.Document;

  const DogSchema = new Schema<IDogDocument>(
    {
      breed: { type: String },
      name: { type: String },
      age: { type: Number }
    }
  );

  const Dog = mongoose.model<IDogDocument, Model<IDogDocument>>('dog', DogSchema);

  const rex = new Dog({
    // type inference here
  });
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
