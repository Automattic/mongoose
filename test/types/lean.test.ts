import { Schema, model, Document, LeanDocument, Types } from 'mongoose';
import { expectError, expectType } from 'tsd';

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

async function gh11761() {
  const thingSchema = new Schema<{ name: string }>({
    name: Schema.Types.String
  });

  const ThingModel = model('Thing', thingSchema);

  {
    // make sure _id has been added to the type
    const { _id, ...thing1 } = (await ThingModel.create({ name: 'thing1' })).toObject();
    expectType<Types.ObjectId>(_id);

    console.log({ _id, thing1 });
  }
  // stretch goal, make sure lean works as well

  const foundDoc = await ThingModel.findOne().lean().limit(1).exec();
  {
    if (!foundDoc) {
      return; // Tell TS that it isn't null
    }
    const { _id, ...thing2 } = foundDoc;
    expectType<Types.ObjectId>(foundDoc._id);
  }
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

  // Helpers to simplify checks
  type IfAny<IFTYPE, THENTYPE> = 0 extends (1 & IFTYPE) ? THENTYPE : IFTYPE;
  type IfUnknown<IFTYPE, THENTYPE> = unknown extends IFTYPE ? THENTYPE : IFTYPE;

// tests for these two types are located in test/types/lean.test.ts
export type DocTypeFromUnion<T> = T extends (Document<infer T1, infer T2, infer T3> & infer U) ?
  [U] extends [Document<T1, T2, T3> & infer U] ? IfUnknown<IfAny<U, false>, false> : false : false;

export type DocTypeFromGeneric<T> = T extends Document<infer IdType, infer TQueryHelpers, infer DocType> ?
  IfUnknown<IfAny<DocType, false>, false> : false;

/**
   * Helper to choose the best option between two type helpers
   */
export type _pickObject<T1, T2, Fallback> = T1 extends false ? T2 extends false ? Fallback : T2 : T1;

/**
   * There may be a better way to do this, but the goal is to return the DocType if it can be infered
   * and if not to return a type which is easily identified as "not valid" so we fall back to
   * "strip out known things added by extending Document"
   * There are three basic ways to mix in Document -- "Document & T", "Document<ObjId, mixins, T>",
   * and "T extends Document". In the last case there is no type without Document mixins, so we can only
   * strip things out. In the other two cases we can infer the type, so we should
   */
export type BaseDocumentType<T> = _pickObject<DocTypeFromUnion<T>, DocTypeFromGeneric<T>, false>;

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


async function _11767() {
  interface Question {
    text: string;
    answers: Types.Array<string>;
    correct: number;
  }
  const QuestionSchema = new Schema<Question>({
    text: String,
    answers: [String],
    correct: Number
  });
  interface Exam {
    element: string;
    dateTaken: Date;
    questions: Types.DocumentArray<Question>;
  }
  const ExamSchema = new Schema<Exam>({
    element: String,
    dateTaken: Date,
    questions: [QuestionSchema]
  });

  const ExamModel = model<Exam>('Exam', ExamSchema);

  const examFound = await ExamModel.findOne().lean().exec();
  if (!examFound) return;

  // Had to comment some of these active checks out

  // $pop shouldn't be there, because questions should no longer be a mongoose array
  // expectError<Function>(examFound.questions.$pop);
  // popoulated shouldn't be on the question doc because it shouldn't
  // be a mongoose subdocument anymore
  // expectError(examFound.questions[0]!.populated);
  expectType<string[]>(examFound.questions[0].answers);

  const examFound2 = await ExamModel.findOne().exec();
  if (!examFound2) return;
  const examFound2Obj = examFound2.toObject();

  // expectError(examFound2Obj.questions.$pop);
  // expectError(examFound2Obj.questions[0].populated);
  expectType<string[]>(examFound2Obj.questions[0].answers);
}

async function _11761() {
  const thingSchema = new Schema<{ name: string }>({
    name: Schema.Types.String
  });

  const ThingModel = model('Thing', thingSchema);

  const { _id, name, __v } = (await ThingModel.create({ name: 'Thing 1' })).toObject();
  expectType<string>(name);
  expectType<Types.ObjectId>(_id);
  expectType<number>(__v);
}
