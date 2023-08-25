import * as mongoose from 'mongoose';
import { expectType } from 'tsd';
import * as bson from 'bson';

function gh12537() {
  const schema = new mongoose.Schema({ test: String });
  const model = mongoose.model('Test', schema);

  const doc = new model({});

  const v = new bson.ObjectId('somehex');
  expectType<string>(v._id.toHexString());

  doc._id = new bson.ObjectId('somehex');
}

gh12537();
