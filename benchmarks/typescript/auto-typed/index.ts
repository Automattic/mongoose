import { Schema, Model, model } from 'mongoose';

const schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  avatar: String
});

const UserModel = model('User', schema);