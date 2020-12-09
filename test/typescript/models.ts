import { Schema, Document, Model, connection } from 'mongoose';

interface ITest extends Document {
  foo: string;
}

const TestSchema = new Schema({
  foo: { type: String, required: true },
});

const Test = connection.model<ITest>('Test', TestSchema);

const bar = (SomeModel: Model<ITest>) => // <<<< error here
  console.log(SomeModel);

bar(Test);

const ExpiresSchema = new Schema({
  ttl: {
    type: Date,
    expires: 3600,
  },
});

const aggregated: Promise<Document> = Test.aggregate([]).then(res => res[0]);

interface IProject extends Document {
  name: String;
}

interface ProjectModel extends Model<IProject> {
  myStatic(): number;
}

const projectSchema: Schema = new Schema({ name: String });
projectSchema.statics.myStatic = () => 42;

const Project = connection.model<IProject, ProjectModel>('Project', projectSchema);
Project.myStatic();