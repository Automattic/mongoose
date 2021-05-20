import { Schema, Document, SchemaDefinition, Model, DocumentDefinition } from 'mongoose';

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
  actors?: Actor[]
}

const movieSchema = new Schema<Document<Movie>, Model<Document<Movie>>, Movie>({
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
  actors: {
    type: [actorSchema],
    default: undefined
  }
});

// Using `SchemaDefinition`
interface IProfile { age: number; }
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

  const schemaDefinition: UserSchemaDefinition = {
    name: { type: String },
    active: { type: Boolean },
    points: Number
  };

  const schema = new Schema<UserDocument, UserModel, User>(schemaDefinition);
}

function gh10261() {
  interface ValuesEntity {
    values: string[];
  }

  const type: ReadonlyArray<typeof String> = [String];
  const colorEntitySchemaDefinition: SchemaDefinition<DocumentDefinition<ValuesEntity>> = {
    values: {
      type: type,
      required: true
    }
  };
}
