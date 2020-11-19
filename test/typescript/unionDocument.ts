import { Document, Types, model, Schema } from 'mongoose';

interface ITestBase {
  _id?: Types.ObjectId,
  name?: string;
}
type ITest = Document & ITestBase;

const Test = model<ITest>('Test', new Schema({ name: String }));

const doc = new Test();
doc.name = 'Test';
doc.save().then((doc: ITest) => console.log(doc.name));