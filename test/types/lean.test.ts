import { Schema, model, Document, LeanDocument, Types, BaseDocumentType, DocTypeFromUnion, DocTypeFromGeneric } from 'mongoose';
import { expectError, expectNotType, expectType } from 'tsd';

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
  const doc = await Test.findOne().orFail();

  doc.subdoc = new Subdoc({ name: 'test' });
  doc.id = 'Hello';

  doc.testMethod();

  // Because ITest extends Document there is no good way for toObject
  // to infer the type which doesn't add a high probability of a circular
  // reference, so it must be specified here or else ITest above could be changed
  // to `extends Document<number, {}, ITestBase>`
  const pojo = doc.toObject<ITestBase>();
  expectError(await pojo.save());

  const _doc = await Test.findOne().orFail().lean();
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

async function getBaseDocumentType(): Promise<void> {
  interface User {
    name: string;
    email: string;
    avatar?: string;
  }

  type UserDocUnion = User & Document<Types.ObjectId>;
  type UserDocGeneric = Document<Types.ObjectId, {}, User>;

  // DocTypeFromUnion should correctly infer the User type from our unioned type
  type fromUnion1 = DocTypeFromUnion<UserDocUnion>;
  expectType<User>({} as fromUnion1);
  // DocTypeFromUnion should give a "false" type if it isn't a unioned type
  type fromUnion2 = DocTypeFromUnion<UserDocGeneric>;
  expectType<false>({} as fromUnion2);
  // DocTypeFromUnion should give a "false" type of it's an any
  expectType<false>({} as DocTypeFromUnion<any>);

  // DocTypeFromGeneric should correctly infer the User type from our Generic constructed type
  type fromGeneric1 = DocTypeFromGeneric<UserDocGeneric>;
  expectType<User>({} as fromGeneric1);
  // DocTypeFromGeneric should give a "false" type if it's not a type made with Document<?, ?, DocType>
  type fromGeneric2 = DocTypeFromGeneric<UserDocUnion>;
  expectType<false>({} as fromGeneric2);
  // DocTypeFromGeneric should give a "false" type of it's an any
  expectType<false>({} as DocTypeFromGeneric<any>);

  type baseDocFromUnion = BaseDocumentType<UserDocUnion>;
  expectType<User>({} as baseDocFromUnion);

  type baseDocFromGeneric = BaseDocumentType<UserDocGeneric>;
  expectType<User>({} as baseDocFromGeneric);
}

async function getBaseDocumentTypeFromModel(): Promise<void> {
  interface User {
    name: string;
    email: string;
    avatar?: string;
  }
  const schema = new Schema<User>({});
  const Model = model('UserBaseDocTypeFromModel', schema);
  type UserDocType = InstanceType<typeof Model>;

  type baseFromUserDocType = BaseDocumentType<UserDocType>;

  expectType<User & { _id: Types.ObjectId }>({} as baseFromUserDocType);

  const a: UserDocType = {} as any;

  const b = a.toJSON();
}
