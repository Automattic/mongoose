import { Schema, model, Document, Types } from 'mongoose';
import { expectError, expectType } from 'tsd';

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

async function _11767() {
  interface Question {
    text: string;
    answers: string[];
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
    questions: Question[];
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
