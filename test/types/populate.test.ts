import mongoose, { Schema, model, Document, PopulatedDoc, Types, HydratedDocument, SchemaTypeOptions, Model } from 'mongoose';
// Use the mongodb ObjectId to make instanceof calls possible
import { ObjectId } from 'mongodb';
import { expect } from 'tstyche';

interface Child {
  name: string;
}

const childSchema = new Schema({ name: String });
const ChildModel = model<Child>('Child', childSchema);

interface Parent {
  child: PopulatedDoc<Child>,
  name?: string
}

const ParentModel = model<Parent>('Parent', new Schema({
  child: { type: 'ObjectId', ref: 'Child' },
  name: String
}));

ParentModel.
  findOne({}).
  populate<{ child: Document<ObjectId> & Child }>('child').
  orFail().
  then((doc) => {
    const child = doc.child;
    if (child == null || child instanceof ObjectId) {
      throw new Error('should be populated');
    } else {
      useChildDoc(child);
    }
    const lean = doc.toObject<mongoose.MergeType<Parent, { Child: Child }>>();
    const leanChild = lean.child;
    if (leanChild == null || leanChild instanceof ObjectId) {
      throw new Error('should be populated');
    } else {
      const name = leanChild.name;
      expect(leanChild).type.not.toHaveProperty('save');
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
  await story.populate({ path: 'fans', model: Person });
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
  const childSchema = new Schema({ name: String });
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
    localField: (doc: HydratedDocument<Parent>): string => {
      if (typeof doc.name === 'string') {
        return doc.name;
      }
      return 'foo';
    },
    foreignField: (doc: HydratedDocument<Parent>): string => {
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
    expect(user?.friends[0]).type.toBe<Types.ObjectId>();
    expect(user?.friends[0]).type.not.toHaveProperty('blocked');
    user?.friends.map(friend => {
      expect(friend).type.not.toHaveProperty('blocked');
    });
  });

  User.findOne({}).populate<{ friends: Friend[] }>('friends').then(user => {
    if (!user) return;
    expect(user?.friends[0]).type.toBe<Friend>();
    expect(user?.friends[0].blocked).type.toBe<boolean>();
    const firstFriendBlockedValue = user?.friends.map(friend => friend)[0];
    expect(firstFriendBlockedValue?.blocked).type.toBe<boolean>();
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

function gh11862() {
  interface IUser {
    userType: string;
    friend: Types.ObjectId;
  }

  const t: SchemaTypeOptions<mongoose.Types.ObjectId> = { type: 'ObjectId', refPath: 'userType' };

  const userSchema = new Schema<IUser>({
    userType: String,
    friend: { type: 'ObjectId', refPath: 'userType' }
  });
  const User = model<IUser>('friends', userSchema);

  User.findOne({}).populate('friend');
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
  expect(populateResult.child.name).type.toBe<string>();

  if (!leanResult) return;
  expect(leanResult.child.name).type.toBe<string>();
}

async function gh11710() {

  // `Parent` represents the object as it is stored in MongoDB
  interface Parent {
    child?: Types.ObjectId,
    name?: string
  }
  interface Child {
    name: string;
  }
  interface PopulatedParent {
    child: Child | null;
  }
  const ParentModel = model<Parent>('Parent', new Schema({
    child: { type: Schema.Types.ObjectId, ref: 'Child' },
    name: String
  }));
  const childSchema = new Schema({ name: String });
  const ChildModel = model<Child>('Child', childSchema);

  // Populate with `Paths` generic `{ child: Child }` to override `child` path
  const doc = await ParentModel.findOne({}).populate<Pick<PopulatedParent, 'child'>>('child').orFail();
  expect(doc.child).type.toBe<Child | null>();
}

async function gh11758() {
  interface NestedChild {
    name: string
    _id: Types.ObjectId
  }
  const nestedChildSchema = new Schema({ name: String });

  interface Parent {
    nestedChild: Types.ObjectId
    name?: string
  }

  const ParentModel = model<Parent>('Parent', new Schema({
    nestedChild: { type: Schema.Types.ObjectId, ref: 'NestedChild' },
    name: String
  }));

  const NestedChildModel = model<NestedChild>('NestedChild', nestedChildSchema);

  const parent = new ParentModel({
    nestedChild: new NestedChildModel({ name: 'test' }),
    name: 'Parent'
  }).$assertPopulated<{ nestedChild: NestedChild }>('nestedChild');

  expect(parent.nestedChild.name).type.toBe<string>();

  await parent.save();
}

async function gh11955() {
  // `Parent` represents the object as it is stored in MongoDB
  interface Parent {
    children?: Types.ObjectId[],
    name?: string
  }

  const ParentModel = model<Parent>('Parent', new Schema({
    children: [{ type: Schema.Types.ObjectId, ref: 'Child' }],
    name: String
  }));

  interface Child {
    name: string;
  }
  const childSchema = new Schema({ name: String });
  model<Child>('Child', childSchema);

  const parent = await ParentModel.findOne({}).exec();

  const populatedParent = await parent!.populate<{ children: Child[] }>('child');

  populatedParent.children.find(({ name }) => console.log(name));
}

function gh12136() {
  type ChildDocument = Child & Document;
  type ParentDocument = Parent & Document;

  class Child {
    parent: PopulatedDoc<ParentDocument>;
  }

  class Parent {
    child: PopulatedDoc<ChildDocument>;
  }

}

async function gh13070() {
  interface IParent {
    name: string;
    child: Types.ObjectId;
  }
  interface IChild {
    name: string;
    parent: Types.ObjectId;
  }

  const parentSchema = new Schema(
    {
      name: { type: String, required: true },
      child: { type: Schema.Types.ObjectId, ref: 'Child', required: true }
    });

  const childSchema = new Schema(
    {
      name: { type: String, required: true },
      parent: { type: Schema.Types.ObjectId, ref: 'Parent', required: true }
    });

  const Parent = model<IParent>('Parent', parentSchema);
  const Child = model<IChild>('Child', childSchema);

  const doc = await Parent.findOne().orFail();
  const doc2 = await Child.populate<{ child: IChild }>(doc, 'child');
  const name: string = doc2.child.name;
}

function gh14441() {
  interface Parent {
    child?: Types.ObjectId;
    name?: string;
  }
  const ParentModel = model<Parent>(
    'Parent',
    new Schema({
      child: { type: Schema.Types.ObjectId, ref: 'Child' },
      name: String
    })
  );

  interface Child {
    name: string;
  }
  const childSchema = new Schema({ name: String });
  model<Child>('Child', childSchema);

  ParentModel.findOne({})
    .populate<{ child: Child }>('child')
    .orFail()
    .then(doc => {
      expect(doc.child.name).type.toBe<string>();
      const docObject = doc.toObject();
      expect(docObject.child.name).type.toBe<string>();
    });

  ParentModel.findOne({})
    .populate<{ child: Child }>('child')
    .lean()
    .orFail()
    .then(doc => {
      expect(doc.child.name).type.toBe<string>();
    });

  ParentModel.find({})
    .populate<{ child: Child }>('child')
    .orFail()
    .then(docs => {
      expect(docs[0]!.child.name).type.toBe<string>();
      const docObject = docs[0]!.toObject();
      expect(docObject.child.name).type.toBe<string>();
    });
}

async function gh14574() {
  // Document definition
  interface User {
    firstName: string;
    lastName: string;
    friend?: Types.ObjectId;
  }

  interface UserMethods {
    fullName(): string;
  }

  type UserModelType = mongoose.Model<User, {}, UserMethods>;

  const userSchema = new Schema<User, UserModelType, UserMethods>(
    {
      firstName: String,
      lastName: String,
      friend: { type: Schema.Types.ObjectId, ref: 'User' }
    },
    {
      methods: {
        fullName() {
          return `${this.firstName} ${this.lastName}`;
        }
      }
    }
  );
  const userModel = model<User, UserModelType>('User', userSchema);

  const UserModel = () => userModel;

  const user = await UserModel()
    .findOne({ firstName: 'b' })
    .populate<{ friend: HydratedDocument<User, UserMethods> }>('friend')
    .orFail()
    .exec();
  expect(user.fullName()).type.toBe<string>();
  expect(user.friend.fullName()).type.toBe<string>();
}

async function gh15111() {
  interface IChild {
    _id: Types.ObjectId;
    name: string;
  }

  type ChildDocumentOverrides = {};

  interface IChildVirtuals {
    id: string;
  }

  type ChildInstance = HydratedDocument<
    IChild,
    ChildDocumentOverrides & IChildVirtuals
  >;

  type ChildModelType = Model<
    IChild,
    {},
    ChildDocumentOverrides,
    IChildVirtuals,
    ChildInstance
  >;
  const childSchema = new Schema<IChild, ChildModelType>(
    {
      name: {
        type: 'String',
        required: true,
        trim: true
      }
    }
  );
  const ChildModel = mongoose.model<IChild, ChildModelType>('Child', childSchema);

  interface IParent {
    _id: Types.ObjectId;
    name: string;
    surname: string;
    child: PopulatedDoc<Document<Types.ObjectId> & IChild>;
  }

  type ParentDocumentOverrides = {};

  interface IParentVirtuals {
    id: string;
    fullName: string;
  }

  type ParentInstance = HydratedDocument<
    IParent,
    ParentDocumentOverrides & IParentVirtuals
  >;

  type ParentModelType = Model<
    IParent,
    {},
    ParentDocumentOverrides,
    IParentVirtuals,
    ParentInstance
  >;
  const parentSchema = new Schema<IParent, ParentModelType>(
    {
      name: {
        type: 'String',
        required: true,
        trim: true
      },
      surname: {
        type: 'String',
        required: true,
        trim: true
      },
      child: {
        type: 'ObjectId',
        ref: 'Child',
        required: true
      }
    }
  );

  parentSchema.virtual('fullName').get(function() {
    return `${this.name} ${this.surname}`;
  });

  const ParentModel = mongoose.model<IParent, ParentModelType>('Parent', parentSchema);

  const parents = await ParentModel.find().populate<{ child: ChildInstance }>(
    'child'
  );
  expect(parents[0].fullName).type.toBe<string>();
}

async function gh16101() {
  interface IOwner {
    _id: Types.ObjectId;
    name: string;
  }

  type OwnerInstance = HydratedDocument<IOwner>;

  interface IBaseAnimal {
    _id: Types.ObjectId;
    name: string;
    owner: PopulatedDoc<Document<Types.ObjectId> & IOwner>;
  }

  interface IDog extends IBaseAnimal {
    kind: 'Dog';
    breed: string;
  }

  interface ICat extends IBaseAnimal {
    kind: 'Cat';
    indoor: boolean;
  }

  type IAnimal = IDog | ICat;
  type AnimalInstance = HydratedDocument<IDog> | HydratedDocument<ICat>;
  type AnimalModelType = Model<IAnimal, {}, {}, {}, AnimalInstance>;

  const ownerSchema = new Schema<IOwner>({ name: String });
  const animalSchema = new Schema<IAnimal, AnimalModelType>(
    {
      name: { type: Schema.Types.String, required: true },
      owner: { type: Schema.Types.ObjectId, ref: 'Owner-gh16101', required: true }
    },
    { discriminatorKey: 'kind' }
  );

  model<IOwner>('Owner-gh16101', ownerSchema);
  const Animal = model<IAnimal, AnimalModelType>('Animal-gh16101', animalSchema);
  Animal.discriminator<IDog>('Dog', new Schema<IDog>({ breed: { type: Schema.Types.String, required: true } }));
  Animal.discriminator<ICat>('Cat', new Schema<ICat>({ indoor: { type: Schema.Types.Boolean, required: true } }));

  const doc = await Animal.findById('test')
    .populate<{ owner: OwnerInstance }>('owner')
    .orFail();

  if (doc.kind === 'Dog') {
    expect(doc.breed).type.toBe<string>();
    expect(doc.owner.name).type.toBe<string>();
  } else {
    expect(doc.indoor).type.toBe<boolean>();
    expect(doc.owner.name).type.toBe<string>();
  }
}
