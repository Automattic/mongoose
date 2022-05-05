import { Schema, model, Document, PopulatedDoc, Types, HydratedDocument } from 'mongoose';
// Use the mongodb ObjectId to make instanceof calls possible
import { ObjectId } from 'mongodb';
import { expectAssignable, expectError, expectType } from 'tsd';

interface Child {
  name: string;
}

const childSchema: Schema = new Schema({ name: String });
const ChildModel = model<Child>('Child', childSchema);

interface Parent {
  child?: PopulatedDoc<Child & Document<ObjectId>>,
  name?: string
}

const ParentModel = model<Parent>('Parent', new Schema({
  child: { type: 'ObjectId', ref: 'Child' },
  name: String
}));

ParentModel.findOne({}).populate('child').orFail().then((doc: Parent & Document<ObjectId, {}, Parent>) => {
  const child = doc.child;
  if (child == null || child instanceof ObjectId) {
    throw new Error('should be populated');
  } else {
    useChildDoc(child);
  }
  const lean = doc.toObject();
  const leanChild = lean.child;
  if (leanChild == null || leanChild instanceof ObjectId) {
    throw new Error('should be populated');
  } else {
    const name = leanChild.name;
    expectError(leanChild.save());
  }
});

function useChildDoc(child: Child): void {
  console.log(child.name.trim());
}

interface IPerson {
  name?: string;
  stories?: PopulatedDoc<IStory>[];
}

interface IStory {
  title?: string;
  author?: PopulatedDoc<IPerson>;
  fans?: PopulatedDoc<IPerson>[];
}

const personSchema = new Schema<IPerson>({
  name: String,
  stories: [{ type: Schema.Types.ObjectId, ref: 'Story' }]
});

const storySchema = new Schema<IStory>({
  title: String,
  author: { type: Schema.Types.ObjectId, ref: 'Person' },
  fans: [{ type: Schema.Types.ObjectId, ref: 'Person' }]
});

const Person = model<IPerson>('Person', personSchema);

const Story = model<IStory>('Story', storySchema);

(async() => {
  const story = await Story.findOne().orFail();

  await story.populate('author');
  await story.populate({ path: 'fans' });
  await story.populate(['author']);
  await story.populate([{ path: 'fans' }]);
  await story.populate(['author', { path: 'fans' }]);

  await Story.findOne().populate(['author']);
})();

async function documentDepopulate() {
  const story = await Story.findOne().populate('author').orFail();

  story.depopulate('author');
  story.depopulate(['author']);
  story.depopulate();
}

async function testPathsParam() {
  const story = await Story.findOne().populate<{ author: IPerson }>('author').orFail();

  if (story.author.name === undefined) {
    return;
  }
  const name: string = story.author.name;
}

function gh11014() {
  interface Parent {
    child?: Types.ObjectId
    name?: string
  }
  interface Child {
    name: string
  }
  interface PopulatedParent {
    child: Child | null
  }
  const ParentModel = model<Parent>(
    'Parent',
    new Schema({
      child: { type: 'ObjectId', ref: 'Child' },
      name: String
    })
  );
  const childSchema: Schema = new Schema({ name: String });
  const ChildModel = model<Child>('Child', childSchema);

  // Populate with `Paths` generic `{ child: Child }` to override `child` path
  ParentModel.find({})
    .populate<{ child: Child }>('child')
    .orFail()
    .then(parents => {
      parents.map(p => p.child.name);
    });
}

function gh11321(): void {
  interface Parent {
    child?: ObjectId,
    name?: string
  }

  const parentSchema: Schema<Parent> = new Schema<Parent>({
    child: { type: 'ObjectId', ref: 'Child' },
    name: String
  });

  parentSchema.virtual('test', {
    localField: (doc: HydratedDocument<Parent, {}>): string => {
      if (typeof doc.name === 'string') {
        return doc.name;
      }
      return 'foo';
    },
    foreignField: (doc: HydratedDocument<Parent, {}>): string => {
      if (typeof doc.name === 'string') {
        return doc.name;
      }
      return 'foo';
    }
  });
}

function gh11503() {
  interface Friend {
    blocked: boolean
  }
  const FriendSchema = new Schema<Friend>({
    blocked: Boolean
  });

  interface IUser {
    friends: Types.ObjectId[];
  }
  const userSchema = new Schema<IUser>({
    friends: [{ type: Schema.Types.ObjectId, ref: 'friends' }]
  });
  const User = model<IUser>('friends', userSchema);

  User.findOne({}).populate('friends').then(user => {
    if (!user) return;
    expectType<Types.ObjectId>(user?.friends[0]);
    expectError(user?.friends[0].blocked);
    expectError(user?.friends.map(friend => friend.blocked));
  });

  User.findOne({}).populate<{ friends: Friend[] }>('friends').then(user => {
    if (!user) return;
    expectAssignable<Friend>(user?.friends[0]);
    expectType<boolean>(user?.friends[0].blocked);
    const firstFriendBlockedValue = user?.friends.map(friend => friend)[0];
    expectType<boolean>(firstFriendBlockedValue?.blocked);
  });
}


function gh11544() {

  interface IUser {
    friends: Types.ObjectId[];
  }
  const userSchema = new Schema<IUser>({
    friends: [{ type: Schema.Types.ObjectId, ref: 'friends' }]
  });
  const User = model<IUser>('friends', userSchema);

  User.findOne({}).populate({ path: 'friends', strictPopulate: false });
  User.findOne({}).populate({ path: 'friends', strictPopulate: true });
  User.findOne({}).populate({ path: 'friends', populate: { path: 'someNestedPath', strictPopulate: false } });
}

async function _11532() {
  interface IParent {
    name: string;
    child: Types.ObjectId;
  }
  interface IChild {
    name: string;
  }

  const parentSchema = new Schema(
    {
      name: { type: String, required: true },
      child: { type: Schema.Types.ObjectId, ref: 'Child', required: true }
    });

  const parent = model<IParent>('Parent', parentSchema);

  const populateQuery = parent.findOne().populate<{ child: IChild }>('child');
  const populateResult = await populateQuery;
  const leanResult = await populateQuery.lean();

  if (!populateResult) return;
  expectType<string>(populateResult.child.name);

  if (!leanResult) return;
  expectType<string>(leanResult.child.name);
  expectType<number>(leanResult?.__v);
}