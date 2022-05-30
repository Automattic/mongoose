import { Schema, Document, SchemaDefinition, Model, Types } from 'mongoose';
import { expectType, expectNotType, expectError } from 'tsd';

enum Genre {
  Action,
  Adventure,
  Comedy
}

interface Actor {
  name: string,
  age: number
}
const actorSchema =
  new Schema<Actor & Document, Model<Actor & Document>, Actor>({ name: { type: String }, age: { type: Number } });

interface Movie {
  title?: string,
  featuredIn?: string,
  rating?: number,
  genre?: string,
  actionIntensity?: number,
  status?: string,
  actors: Actor[]
}

const movieSchema = new Schema<Document & Movie, Model<Document & Movie>>({
  title: {
    type: String,
    index: 'text'
  },
  featuredIn: {
    type: String,
    enum: ['Favorites', null],
    default: null
  },
  rating: {
    type: Number,
    required: [true, 'Required'],
    min: [0, 'MinValue'],
    max: [5, 'MaxValue']
  },
  genre: {
    type: String,
    enum: Genre,
    required: true
  },
  actionIntensity: {
    type: Number,
    required: [
      function(this: { genre: Genre }) {
        return this.genre === Genre.Action;
      },
      'Action intensity required for action genre'
    ]
  },
  status: {
    type: String,
    enum: {
      values: ['Announced', 'Released'],
      message: 'Invalid value for `status`'
    }
  },
  actors: {
    type: [actorSchema],
    default: undefined
  }
});

movieSchema.index({ status: 1, 'actors.name': 1 });
movieSchema.index({ title: 'text' }, {
  weights: { title: 10 }
});
movieSchema.index({ rating: -1 });
movieSchema.index({ title: 1 }, { unique: true });

// Using `SchemaDefinition`
interface IProfile {
  age: number;
}
interface ProfileDoc extends Document, IProfile {}
const ProfileSchemaDef: SchemaDefinition<IProfile> = { age: Number };
export const ProfileSchema = new Schema<ProfileDoc, Model<ProfileDoc>, ProfileDoc>(ProfileSchemaDef);

interface IUser {
  email: string;
  profile: ProfileDoc;
}

interface UserDoc extends Document, IUser {}

const ProfileSchemaDef2: SchemaDefinition<IProfile> = {
  age: Schema.Types.Number
};

const ProfileSchema2: Schema<ProfileDoc, Model<ProfileDoc>> = new Schema<ProfileDoc>(ProfileSchemaDef2);

const UserSchemaDef: SchemaDefinition<IUser> = {
  email: String,
  profile: ProfileSchema2
};

async function gh9857() {
  interface User {
    name: number;
    active: boolean;
    points: number;
  }

  type UserDocument = Document<User>;
  type UserSchemaDefinition = SchemaDefinition<User>;
  type UserModel = Model<UserDocument>;

  let u: UserSchemaDefinition;
  expectError(u = {
    name: { type: String },
    active: { type: Boolean },
    points: Number
  });
}

function gh10261() {
  interface ValuesEntity {
    values: string[];
  }

  const type: ReadonlyArray<typeof String> = [String];
  const colorEntitySchemaDefinition: SchemaDefinition<ValuesEntity> = {
    values: {
      type: type,
      required: true
    }
  };
}

function gh10287() {
  interface SubSchema {
    testProp: string;
  }

  const subSchema = new Schema<Document & SubSchema, Model<Document & SubSchema>, SubSchema>({
    testProp: Schema.Types.String
  });

  interface MainSchema {
    subProp: SubSchema
  }

  const mainSchema1 = new Schema<Document & MainSchema, Model<Document & MainSchema>, MainSchema>({
    subProp: subSchema
  });

  const mainSchema2 = new Schema<Document & MainSchema, Model<Document & MainSchema>, MainSchema>({
    subProp: {
      type: subSchema
    }
  });
}

function gh10370() {
  const movieSchema = new Schema<Document & Movie, Model<Document & Movie>, Movie>({
    actors: {
      type: [actorSchema]
    }
  });
}

function gh10409() {
  interface Something {
    field: Date;
  }
  const someSchema = new Schema<Something, Model<Something>, Something>({
    field: { type: Date }
  });
}

function gh10605() {
  interface ITest {
    arrayField?: string[];
    object: {
      value: number
    };
  }
  const schema = new Schema<ITest>({
    arrayField: [String],
    object: {
      type: {
        value: {
          type: Number
        }
      }
    }
  });
}

function gh10605_2() {
  interface ITestSchema extends Document {
    someObject: Array<{ id: string }>
  }

  const testSchema = new Schema<ITestSchema>({
    someObject: { type: [{ id: String }] }
  });
}

function gh10731() {
  interface IProduct {
    keywords: string[];
  }

  const productSchema = new Schema<IProduct>({
    keywords: {
      type: [
        {
          type: String,
          trim: true,
          lowercase: true,
          required: true
        }
      ],
      required: true
    }
  });
}

function gh10789() {
  interface IAddress {
    city: string;
    state: string;
    country: string;
  }

  interface IUser {
    name: string;
    addresses: IAddress[];
  }

  const addressSchema = new Schema<IAddress>({
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true
    }
  });

  const userSchema = new Schema<IUser>({
    name: {
      type: String,
      required: true
    },
    addresses: {
      type: [
        {
          type: addressSchema,
          required: true
        }
      ],
      required: true
    }
  });
}

function gh11439() {
  type Book = {
    collection: string
  };

  const bookSchema = new Schema<Book>({
    collection: String
  }, {
    supressReservedKeysWarning: true
  });
}

function gh11448() {
  interface IUser {
    name: string;
    age: number;
  }

  const userSchema = new Schema<IUser>({ name: String, age: Number });

  userSchema.pick<Pick<IUser, 'age'>>(['age']);
}

function gh11435(): void {
  interface User {
    ids: Types.Array<Types.ObjectId>;
  }

  const schema = new Schema<User>({
    ids: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Something' }],
      default: []
    }
  });
}

// timeSeries
new Schema({}, { expires: '5 seconds' });
expectError(new Schema({}, { expireAfterSeconds: '5 seconds' }));
new Schema({}, { expireAfterSeconds: 5 });

function gh10900(): void {
  type TMenuStatus = Record<string, 'EXPANDED' | 'COLLAPSED'>[];

  interface IUserProp {
    menuStatus: TMenuStatus;
  }

  const patientSchema = new Schema<IUserProp>({
    menuStatus: { type: Schema.Types.Mixed, default: {} }
  });
}