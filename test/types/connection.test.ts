import { createConnection, Schema, Collection, Connection, ConnectionStates, ConnectionSyncIndexesResult, InferSchemaType, Model, connection, HydratedDocument, Query } from 'mongoose';
import * as mongodb from 'mongodb';
import { AutoTypedSchemaType, autoTypedSchema } from './schema.test';
import { expect, pick } from 'tstyche';

expect(createConnection()).type.toBe<Connection>();
expect(createConnection('mongodb://127.0.0.1:27017/test')).type.toBe<Connection>();
expect(createConnection('mongodb://127.0.0.1:27017/test', { appName: 'mongoose' })).type.toBe<Connection>();

const conn = createConnection();

expect(conn.model('Test', new Schema<{ name: string }>({ name: { type: String } }))).type.toBeAssignableTo<Model<{ name: string }, any, any, any>>();
expect(conn.model<{ name: string }>('Test', new Schema({ name: { type: String } }))).type.toBe<Model<{ name: string }>>();

expect(conn.openUri('mongodb://127.0.0.1:27017/test')).type.toBe<Promise<Connection>>();
expect(conn.openUri('mongodb://127.0.0.1:27017/test', { bufferCommands: true })).type.toBe<Promise<Connection>>();

conn.readyState === 0;
conn.readyState === 99;

expect(pick(conn, 'readyState')).type.toBe<{ readonly readyState: ConnectionStates }>();

expect(conn.createCollections()).type.toBe<Promise<Record<string, Error | mongodb.Collection<any>>>>();

expect(new Connection()).type.toBe<Connection>();
expect(new Connection().asPromise()).type.toBe<Promise<Connection>>();

expect(conn.createCollection('some')).type.toBe<Promise<mongodb.Collection<{ [key: string]: any }>>>();

expect(conn.dropCollection('some')).type.toBe<Promise<void>>();

expect(conn.deleteModel).type.not.toBeCallableWith();
expect(conn.deleteModel('something')).type.toBe<Connection>();
expect(conn.deleteModel(/.+/)).type.toBe<Connection>();

expect(conn.modelNames()).type.toBe<Array<string>>();

expect(createConnection('mongodb://127.0.0.1:27017/test').close()).type.toBe<Promise<void>>();
expect(createConnection('mongodb://127.0.0.1:27017/test').close(true)).type.toBe<Promise<void>>();

expect(conn.db).type.toBe<mongodb.Db | undefined>();

expect(conn.getClient()).type.toBe<mongodb.MongoClient>();
expect(conn.setClient(new mongodb.MongoClient('mongodb://127.0.0.1:27017/test'))).type.toBe<Connection>();

expect(conn.transaction(async(res) => {
  expect(res).type.toBe<mongodb.ClientSession>();
  return 'a';
})).type.toBe<Promise<string>>();
expect(conn.transaction(async(res) => {
  expect(res).type.toBe<mongodb.ClientSession>();
  return 'a';
}, { readConcern: 'majority' })).type.toBe<Promise<string>>();

expect(conn.withSession(async(res) => {
  expect(res).type.toBe<mongodb.ClientSession>();
  return 'a';
})).type.toBe<Promise<string>>();

expect(pick(conn, 'user')).type.toBe<{ readonly user: string }>();
expect(pick(conn, 'pass')).type.toBe<{ readonly pass: string }>();
expect(pick(conn, 'host')).type.toBe<{ readonly host: string }>();
expect(pick(conn, 'port')).type.toBe<{ readonly port: number }>();

expect(conn.collection('test')).type.toBe<Collection>();
expect(conn.db?.collection('test')).type.toBe<mongodb.Collection | undefined>();

expect(conn.startSession()).type.toBe<Promise<mongodb.ClientSession>>();
expect(conn.startSession({ causalConsistency: true })).type.toBe<Promise<mongodb.ClientSession>>();

expect(conn.syncIndexes()).type.toBe<Promise<ConnectionSyncIndexesResult>>();
expect(conn.syncIndexes({ continueOnError: true })).type.toBe<Promise<ConnectionSyncIndexesResult>>();

expect(conn.useDb('test')).type.toBe<Connection>();
expect(conn.useDb('test', {})).type.toBe<Connection>();
expect(conn.useDb('test', { useCache: true })).type.toBe<Connection>();

expect(
  conn.listCollections().then(collections => collections.map(coll => coll.name))
).type.toBe<Promise<string[]>>();

expect(
  conn.listDatabases().then(dbs => dbs.databases.map(db => db.name))
).type.toBe<Promise<string[]>>();

export function autoTypedModelConnection() {
  const AutoTypedSchema = autoTypedSchema();
  const AutoTypedModel = connection.model('AutoTypeModelConnection', AutoTypedSchema);

  (async() => {
  // Model-functions-test
  // Create should works with arbitrary objects.
    const randomObject = await AutoTypedModel.create({ unExistKey: 'unExistKey', description: 'st' } as Partial<InferSchemaType<typeof AutoTypedSchema>>);
    expect(randomObject.userName).type.toBe<AutoTypedSchemaType['schema']['userName']>();

    const testDoc1 = await AutoTypedModel.create({ userName: 'M0_0a' });
    expect(testDoc1.userName).type.toBe<AutoTypedSchemaType['schema']['userName']>();
    expect(testDoc1.description).type.toBe<AutoTypedSchemaType['schema']['description']>();

    const testDoc2 = await AutoTypedModel.insertMany([{ userName: 'M0_0a' }]);
    expect(testDoc2[0].userName).type.toBe<AutoTypedSchemaType['schema']['userName']>();
    expect(testDoc2[0]?.description).type.toBe<AutoTypedSchemaType['schema']['description'] | undefined>();

    const testDoc3 = await AutoTypedModel.findOne({ userName: 'M0_0a' });
    expect(testDoc3?.userName).type.toBe<AutoTypedSchemaType['schema']['userName'] | undefined>();
    expect(testDoc3?.description).type.toBe<AutoTypedSchemaType['schema']['description'] | undefined>();

    // Model-statics-functions-test
    expect(AutoTypedModel.staticFn()).type.toBe<ReturnType<AutoTypedSchemaType['statics']['staticFn']>>();

  })();
  return AutoTypedModel;
}

function schemaInstanceMethodsAndQueryHelpersOnConnection() {
  type UserModelQuery = Query<any, HydratedDocument<User>, UserQueryHelpers> & UserQueryHelpers;
  interface UserQueryHelpers {
    byName(this: UserModelQuery, name: string): this
  }
  interface User {
    name: string;
  }
  interface UserInstanceMethods {
    doSomething(this: HydratedDocument<User>): string;
  }
  interface UserStaticMethods {
    findByName(name: string): Promise<HydratedDocument<User>>;
  }
  type UserModel = Model<User, UserQueryHelpers, UserInstanceMethods> & UserStaticMethods;

  const userSchema = new Schema<User, UserModel, UserInstanceMethods, UserQueryHelpers, any, UserStaticMethods>({
    name: String
  }, {
    statics: {
      findByName(name: string) {
        return connection.model('User').findOne({ name }).orFail();
      }
    },
    methods: {
      doSomething() {
        return 'test';
      }
    },
    query: {
      byName(this: UserModelQuery, name: string) {
        return this.where({ name });
      }
    }
  });

  const TestModel = connection.model<User, UserModel, UserQueryHelpers>('User', userSchema);
}

async function gh15359() {
  const res = await conn.bulkWrite([{ model: 'Test', name: 'insertOne', document: { name: 'test1' } }]);
  expect(res.insertedCount).type.toBe<number>();
  expect(res).type.not.toHaveProperty('mongoose');

  const res2 = await conn.bulkWrite([{ model: 'Test', name: 'insertOne', document: { name: 'test2' } }], { ordered: false });
  expect(res2.insertedCount).type.toBe<number>();
  expect(res2.mongoose?.validationErrors).type.toBe<Error[] | undefined>();

  const res3 = await conn.bulkWrite([
    { model: 'Test', name: 'updateOne', filter: { name: 'test5' }, update: { $set: { num: 42 } } },
    { model: 'Test', name: 'updateOne', filter: { name: 'test4' }, update: { $set: { num: 'not a number' } } }
  ], { ordered: false });
  expect(res3.insertedCount).type.toBe<number>();


  expect(pick(res3, 'mongoose')).type.toBe<{
    mongoose?: { validationErrors: Error[]; results: Array<Error | mongodb.WriteError | null> }
  }>();
  expect(res3.mongoose?.validationErrors).type.toBe<Error[] | undefined>();
}
