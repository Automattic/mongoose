import { Schema, model, Document, LeanDocument, Types } from 'mongoose';
import { expectError } from 'tsd';

const schema: Schema = new Schema({ name: { type: 'String' } });

class Subdoc extends Document {
  name: string;
}

interface ITestBase {
  _id?: number;
  name?: string;
  mixed?: any;
}

interface ITest extends ITestBase, Document<number> {
  subdoc?: Subdoc;
  testMethod: () => number;
  id: string;
}

schema.method('testMethod', () => 42);

const Test = model<ITest>('Test', schema);

void async function main() {
  const doc: ITest = await Test.findOne().orFail();

  doc.subdoc = new Subdoc({ name: 'test' });
  doc.id = 'Hello';

  doc.testMethod();

  const pojo = doc.toObject();
  expectError(await pojo.save());

  const _doc: ITestBase = await Test.findOne().orFail().lean();
  expectError(await _doc.save());

  expectError(_doc.testMethod());
  _doc.name = 'test';
  _doc.mixed = 42;
  console.log(_doc._id);

  const hydrated = Test.hydrate(_doc);
  await hydrated.save();

  const _docs: LeanDocument<ITest>[] = await Test.find().lean();
  _docs[0].mixed = 42;

  const _doc2: ITestBase = await Test.findOne().lean<ITestBase>();
}();

function gh10345() {
  (function() {
    interface User {
      name: string;
      id: number;
    }

    const UserModel = model<User>('User', new Schema({ name: String, id: Number }));

    const doc = new UserModel({ name: 'test', id: 42 });

    const leanDoc = doc.toObject();
    leanDoc.id = 43;
  })();

  (async function() {
    interface User {
      name: string;
    }

    const UserModel = model<User>('User', new Schema({ name: String }));

    const doc = new UserModel({ name: 'test' });

    const leanDoc = doc.toObject<User>();
    expectError(leanDoc.id = 43);

    const doc2 = await UserModel.findOne().orFail().lean();
    expectError(doc2.id = 43);
  })();
}

async function gh11118(): Promise<void> {
  interface User {
    name: string;
    email: string;
    avatar?: string;
  }

  const schema = new Schema<User>({
    name: { type: String, required: true },
    email: { type: String, required: true },
    avatar: String
  });

  const UserModel = model<User>('User', schema);

  const docs = await UserModel.find().lean().exec();

  for (const doc of docs) {
    const _id: Types.ObjectId = doc._id;
  }
}