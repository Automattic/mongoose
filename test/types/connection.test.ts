import { createConnection, Schema, Collection, Connection, ConnectionSyncIndexesResult, Model } from 'mongoose';
import * as mongodb from 'mongodb';
import { expectError, expectType } from 'tsd';

expectType<Connection>(createConnection());
expectType<Connection>(createConnection('mongodb://localhost:27017/test'));
expectType<Connection>(createConnection('mongodb://localhost:27017/test', { appName: 'mongoose' }));
expectType<void>(createConnection('mongodb://localhost:27017/test', { appName: 'mongoose' }, (err, res) => (expectType<Connection>(res))));

const conn = createConnection();

expectType<Model<{ name: string }, any, any, any>>(conn.model('Test', new Schema<{ name: string }>({ name: { type: String } })));
expectType<Model<{ name: string }>>(conn.model<{ name: string }>('Test', new Schema({ name: { type: String } })));

expectType<Promise<Connection>>(conn.openUri('mongodb://localhost:27017/test'));
expectType<Promise<Connection>>(conn.openUri('mongodb://localhost:27017/test', { bufferCommands: true }));
expectType<Connection>(conn.openUri('mongodb://localhost:27017/test', { bufferCommands: true }, (err, value) => {
  expectType<Connection>(value);
}));

conn.readyState === 0;
conn.readyState === 99;

expectError(conn.readyState = 0);

expectType<Connection>(new Connection());
expectType<Promise<Connection>>(new Connection().asPromise());

expectType<Promise<mongodb.Collection<{ [key: string]: any }>>>(conn.createCollection('some'));
expectType<void>(conn.createCollection('some', (err, res) => {
  expectType<mongodb.Collection<{ [key: string]: any }>>(res);
}));

expectType<Promise<void>>(conn.dropCollection('some'));
expectType<void>(conn.dropCollection('some', () => {
  // do nothing
}));

expectError(conn.deleteModel());
expectType<Connection>(conn.deleteModel('something'));

expectType<Array<string>>(conn.modelNames());

expectType<Promise<void>>(createConnection('mongodb://localhost:27017/test').close());
expectType<Promise<void>>(createConnection('mongodb://localhost:27017/test').close(true));
expectType<void>(createConnection('mongodb://localhost:27017/test').close(() => {
  // do nothing.
}));
expectType<void>(createConnection('mongodb://localhost:27017/test').close(true, () => {
  // do nothing.
}));
expectType<void>(createConnection('mongodb://localhost:27017/test').close(false, () => {
  // do nothing.
}));

expectType<mongodb.Db>(conn.db);

expectType<mongodb.MongoClient>(conn.getClient());
expectType<Connection>(conn.setClient(new mongodb.MongoClient('mongodb://localhost:27017/test')));

expectType<Promise<void>>(conn.transaction(async(res) => {
  expectType<mongodb.ClientSession>(res);
  return 'a';
}));

expectError(conn.user = 'invalid');
expectError(conn.pass = 'invalid');
expectError(conn.host = 'invalid');
expectError(conn.port = 'invalid');

expectType<Collection>(conn.collection('test'));
expectType<mongodb.Collection>(conn.db.collection('test'));

expectType<Promise<mongodb.ClientSession>>(conn.startSession());
expectType<Promise<mongodb.ClientSession>>(conn.startSession({ causalConsistency: true }));
expectType<void>(conn.startSession((err, res) => {
  expectType<mongodb.ClientSession>(res);
}));
expectType<void>(conn.startSession(undefined, (err, res) => {
  expectType<mongodb.ClientSession>(res);
}));
expectType<void>(conn.startSession(null, (err, res) => {
  expectType<mongodb.ClientSession>(res);
}));
expectType<void>(conn.startSession({}, (err, res) => {
  expectType<mongodb.ClientSession>(res);
}));

expectType<Promise<ConnectionSyncIndexesResult>>(conn.syncIndexes());
expectType<Promise<ConnectionSyncIndexesResult>>(conn.syncIndexes({ continueOnError: true }));
expectType<Promise<ConnectionSyncIndexesResult>>(conn.syncIndexes({ background: true }));

expectType<void>(conn.syncIndexes(undefined, (err, value) => {
  expectType<ConnectionSyncIndexesResult>(value);
}));
expectType<void>(conn.syncIndexes(null, (err, value) => {
  expectType<ConnectionSyncIndexesResult>(value);
}));
expectType<void>(conn.syncIndexes({ continueOnError: true }, (err, value) => {
  expectType<ConnectionSyncIndexesResult>(value);
}));
expectType<void>(conn.syncIndexes({ background: true }, (err, value) => {
  expectType<ConnectionSyncIndexesResult>(value);
}));

expectType<Connection>(conn.useDb('test'));
expectType<Connection>(conn.useDb('test', {}));
expectType<Connection>(conn.useDb('test', { noListener: true }));
expectType<Connection>(conn.useDb('test', { useCache: true }));
