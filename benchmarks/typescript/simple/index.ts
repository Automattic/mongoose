import { Schema, Model, model } from 'mongoose';

interface User {
  name: string;
  email: string;
  avatar?: string;
}

interface UserModelInterface extends Model<User> {
  fetchUser(name: string): Promise<User>;
}

const schema = new Schema<User>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  avatar: String
});

const UserModel = model<User, UserModelInterface>('User', schema);
