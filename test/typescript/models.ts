import { Schema, Document, Model, connection } from 'mongoose';

function conventionalSyntax(): void {
  interface ITest extends Document {
    foo: string;
  }

  const TestSchema = new Schema({
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

  const TestSchema = new Schema({
    foo: { type: String, required: true }
  });

  const Test = connection.model<ITest & Document>('Test', TestSchema);

  const aggregated: Promise<Document> = Test.aggregate([]).then(res => res[0]);

  const bar = (SomeModel: Model<ITest & Document>) => console.log(SomeModel);
}

const ExpiresSchema = new Schema({
  ttl: {
    type: Date,
    expires: 3600
  }
});

interface IProject extends Document {
  name: string;
}

interface ProjectModel extends Model<IProject> {
  myStatic(): number;
}

const projectSchema: Schema = new Schema({ name: String });
projectSchema.statics.myStatic = () => 42;

const Project = connection.model<IProject, ProjectModel>('Project', projectSchema);
Project.myStatic();
