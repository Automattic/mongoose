import { Schema, Model, model } from 'mongoose';
  
interface User {
   name: string;
   email: string;
   avatar?: string;
}

interface UserModel extends Model<User> {
   fetchUser(name: string): Promise<User>;
}

const schema = new Schema<User>({
   name: { type: String, required: true },
   email: { type: String, required: true },
   avatar: String,
});

const User = model<User, UserModel>("User", schema);

async () => {
  const user = await User.findOne();
};