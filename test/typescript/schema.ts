import { Schema, Document, SchemaDefinition, SchemaDefinitionProperty, Model } from 'mongoose';

enum Genre {
  Action,
  Adventure,
  Comedy
}

const movieSchema: Schema = new Schema({
  title: String,
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
    active: Boolean,
    points: Number
  };

  const schema = new Schema<UserDocument, UserModel, User>(schemaDefinition);
}
