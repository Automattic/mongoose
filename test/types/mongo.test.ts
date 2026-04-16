import * as mongoose from 'mongoose';
import * as bson from 'bson';
import { expect } from 'tstyche';

function gh12537() {
  const schema = new mongoose.Schema({ test: String });
  const model = mongoose.model('Test', schema);

  const doc = new model({});

  const v = new bson.ObjectId('somehex');
  expect(v._id.toHexString()).type.toBe<string>();

  doc._id = new bson.ObjectId('somehex');
}

gh12537();
