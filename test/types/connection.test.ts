import { createConnection, Schema, Collection, Connection, ConnectionSyncIndexesResult, Model, connection, HydratedDocument, Query } from 'mongoose';
import * as mongodb from 'mongodb';
import { expectAssignable, expectError, expectType } from 'tsd';
import { AutoTypedSchemaType, autoTypedSchema } from './schema.test';

expectType<Connection>(createConnection());
expectType<Connection>(createConnection('mongodb://127.0.0.1:27017/test'));
expectType<Connection>(createConnection('mongodb://127.0.0.1:27017/test', { appName: 'mongoose' }));

const conn = createConnection();

expectAssignable<Model<{ name: string }, any, any, any>>(conn.model('Test', new Schema<{ name: string }>({ name: { type: String } })));
expectType<Model<{ name: string }>>(conn.model<{ name: string }>('Test', new Schema({ name: { type: String } })));

expectType<Promise<Connection>>(conn.openUri('mongodb://127.0.0.1:27017/test'));
expectType<Promise<Connection>>(conn.openUri('mongodb://127.0.0.1:27017/test', { bufferCommands: true }));

conn.readyState === 0;
conn.readyState === 99;

expectError(conn.readyState = 0);

expectType<Promise<Record<string, Error | mongodb.Collection<any>>>>(
  conn.createCollections()
);

expectType<Connection>(new Connection());
expectType<Promise<Connection>>(new Connection().asPromise());

expectType<Promise<mongodb.Collection<{ [key: string]: any }>>>(conn.createCollection('some'));

expectType<Promise<void>>(conn.dropCollection('some'));

expectError(conn.deleteModel());
expectType<Connection>(conn.deleteModel('something'));
expectType<Connection>(conn.deleteModel(/.+/));

expectType<Array<string>>(conn.modelNames());

expectType<Promise<void>>(createConnection('mongodb://127.0.0.1:27017/test').close());
expectType<Promise<void>>(createConnection('mongodb://127.0.0.1:27017/test').close(true));

expectType<mongodb.Db | undefined>(conn.db);

expectType<mongodb.MongoClient>(conn.getClient());
expectType<Connection>(conn.setClient(new mongodb.MongoClient('mongodb://127.0.0.1:27017/test')));

expectType<Promise<string>>(conn.transaction(async(res) => {
  expectType<mongodb.ClientSession>(res);
  return 'a';
}));
expectType<Promise<string>>(conn.transaction(async(res) => {
  expectType<mongodb.ClientSession>(res);
  return 'a';
}, { readConcern: 'majority' }));

expectType<Promise<string>>(conn.withSession(async(res) => {
  expectType<mongodb.ClientSession>(res);
  return 'a';
}));

expectError(conn.user = 'invalid');
expectError(conn.pass = 'invalid');
expectError(conn.host = 'invalid');
expectError(conn.port = 'invalid');

expectType<Collection>(conn.collection('test'));
expectType<mongodb.Collection | undefined>(conn.db?.collection('test'));

expectType<Promise<mongodb.ClientSession>>(conn.startSession());
expectType<Promise<mongodb.ClientSession>>(conn.startSession({ causalConsistency: true }));

expectType<Promise<ConnectionSyncIndexesResult>>(conn.syncIndexes());
expectType<Promise<ConnectionSyncIndexesResult>>(conn.syncIndexes({ continueOnError: true }));
expectType<Promise<ConnectionSyncIndexesResult>>(conn.syncIndexes({ background: true }));

expectType<Connection>(conn.useDb('test'));
expectType<Connection>(conn.useDb('test', {}));
expectType<Connection>(conn.useDb('test', { noListener: true }));
expectType<Connection>(conn.useDb('test', { useCache: true }));

expectType<Promise<string[]>>(
  conn.listCollections().then(collections => collections.map(coll => coll.name))
);

expectType<Promise<string[]>>(
  conn.listDatabases().then(dbs => dbs.databases.map(db => db.name))
);

export function autoTypedModelConnection() {
  const AutoTypedSchema = autoTypedSchema();
  const AutoTypedModel = connection.model('AutoTypeModelConnection', AutoTypedSchema);

  (async() => {
  // Model-functions-test
  // Create should works with arbitrary objects.
    const randomObject = await AutoTypedModel.create({ unExistKey: 'unExistKey', description: 'st' });
    expectType<AutoTypedSchemaType['schema']['userName']>(randomObject.userName);

    const testDoc1 = await AutoTypedModel.create({ userName: 'M0_0a' });
    expectType<AutoTypedSchemaType['schema']['userName']>(testDoc1.userName);
    expectType<AutoTypedSchemaType['schema']['description']>(testDoc1.description);

    const testDoc2 = await AutoTypedModel.insertMany([{ userName: 'M0_0a' }]);
    expectType<AutoTypedSchemaType['schema']['userName']>(testDoc2[0].userName);
    expectType<AutoTypedSchemaType['schema']['description'] | undefined>(testDoc2[0]?.description);

    const testDoc3 = await AutoTypedModel.findOne({ userName: 'M0_0a' });
    expectType<AutoTypedSchemaType['schema']['userName'] | undefined>(testDoc3?.userName);
    expectType<AutoTypedSchemaType['schema']['description'] | undefined>(testDoc3?.description);

    // Model-statics-functions-test
    expectType<ReturnType<AutoTypedSchemaType['statics']['staticFn']>>(AutoTypedModel.staticFn());

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
  expectType<number>(res.insertedCount);
  expectError(res.mongoose.validationErrors);

  const res2 = await conn.bulkWrite([{ model: 'Test', name: 'insertOne', document: { name: 'test2' } }], { ordered: false });
  expectType<number>(res2.insertedCount);
  expectType<Error[] | undefined>(res2.mongoose?.validationErrors);

  const res3 = await conn.bulkWrite([
    { model: 'Test', name: 'updateOne', filter: { name: 'test5' }, update: { $set: { num: 42 } } },
    { model: 'Test', name: 'updateOne', filter: { name: 'test4' }, update: { $set: { num: 'not a number' } } }
  ], { ordered: false });
  expectType<number>(res3.insertedCount);
  expectType<Error[] | undefined>(res3.mongoose?.validationErrors);
}
