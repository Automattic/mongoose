import * as mongoose from 'mongoose';
import * as mongodb from 'mongodb';
import { expect } from 'tstyche';

function gh12537() {
  const schema = new mongoose.Schema({ test: String });
  const model = mongoose.model('Test', schema);

  const doc = new model({});

  const v = new mongodb.ObjectId('somehex');
  expect(v._id.toHexString()).type.toBe<string>();

  doc._id = new mongodb.ObjectId('somehex');
}

function gh16710() {
  expect(mongoose.mongo).type.toBe<typeof mongodb>();
  const m = new mongoose.Mongoose();
  expect(m.mongo).type.toBe<typeof mongodb>();
}

gh12537();
gh16710();
