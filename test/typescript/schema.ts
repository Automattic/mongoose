import { Schema } from 'mongoose';

const schema: Schema = new Schema({
  name: String,
  enumWithNull: {
    type: String,
    enum: ['Test', null],
    default: null
  },
  numberWithMax: {
    type: Number,
    required: [true, 'Required'],
    min: [0, 'MinValue'],
    max: [24, 'MaxValue']
  }
});
