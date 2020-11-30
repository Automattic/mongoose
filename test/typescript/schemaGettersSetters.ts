import { Schema } from 'mongoose';

const schema: Schema = new Schema({
  name: {
    type: 'String',
    get: (v: string) => v.toUpperCase(),
    set: (v: string) => v.toUpperCase(),
    cast: 'Invalid name',
    enum: ['hello']
  },
  buffer: {
    type: Buffer,
    subtype: 4
  }
});

const schema2: Schema = new Schema({
  name: {
    type: 'String',
    get: { incorrect: 42 }
  }
});