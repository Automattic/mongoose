import * as mongoose from 'mongoose';
import { ExpectType } from './helpers';

Object.values(mongoose.models).forEach(model => {
  model.modelName;
  model.findOne();
});

mongoose.pluralize(null);

mongoose.overwriteMiddlewareResult('foo');
const schema = new mongoose.Schema({ name: String });
schema.pre('save', function() {
  return mongoose.skipMiddlewareFunction('foobar');
});
schema.post('save', function() {
  return mongoose.overwriteMiddlewareResult('foobar');
});

function gh10746() {
  type A = string extends Function ? never : string;

  let testVar: A;
  testVar = 'A string';
  testVar = 'B string';
  ExpectType<string>(testVar);
}

function gh10957() {
  type TestType = { name: string };
  const obj: TestType = { name: 'foo' };

  ExpectType<TestType>(mongoose.trusted(obj));
}

function connectionStates() {
  const m: mongoose.Mongoose = new mongoose.Mongoose();

  m.STATES.connected;
  m.ConnectionStates.connected;

  m.connect('mongodb://127.0.0.1:27017/test').then(() => {
    console.log('Connected!');
  });

  m.syncIndexes().then(() => console.log('Synced indexes!'));

  m.Promise = Promise;
}
function gh11478() {
  mongoose.set('allowDiskUse', false);
  mongoose.set('allowDiskUse', true);
}

function gh10139() {
  mongoose.set('timestamps.createdAt.immutable', false);
}

function gh15756() {
  mongoose.set('updatePipeline', false);
  mongoose.set('updatePipeline', true);
}

function gh12100() {
  mongoose.syncIndexes({ continueOnError: true, sparse: true });
  mongoose.syncIndexes({ continueOnError: false, sparse: true });
}

function setAsObject() {
  mongoose.set({
    debug: true,
    autoIndex: false,
    updatePipeline: true
  });

  // @ts-expect-error should error out if an invalid option is provided
  mongoose.set({ invalid: true });
}

const x: { name: string } = mongoose.omitUndefined({ name: 'foo' });

function baseConnectionAndCollection() {
  const conn: mongoose.BaseConnection = mongoose.createConnection();
  const coll: mongoose.BaseCollection<any> = conn.collection('test1');
}
