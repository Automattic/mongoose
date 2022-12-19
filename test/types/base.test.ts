import * as mongoose from 'mongoose';
import { expectError, expectType } from 'tsd';

Object.values(mongoose.models).forEach(model => {
  model.modelName;
  model.findOne();
});

mongoose.pluralize(null);

function gh10746() {
  type A = string extends Function ? never : string;

  let testVar: A;
  testVar = 'A string';
  testVar = 'B string';
  expectType<string>(testVar);
}

function gh10957() {
  type TestType = { name: string };
  const obj: TestType = { name: 'foo' };

  expectType<TestType>(mongoose.trusted(obj));
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

function gh12100() {
  mongoose.syncIndexes({ continueOnError: true, noResponse: true });
  mongoose.syncIndexes({ continueOnError: false, noResponse: true });
}

function setAsObject() {
  mongoose.set({
    debug: true,
    autoIndex: false
  });

  expectError(mongoose.set({ invalid: true }));
}
