import { Schema } from 'mongoose';

const schema: Schema = new Schema({
  name: String,
  enumWithNull: {
    type: String,
    enum: ['Test', null],
    default: null
  }
});
