import { createConnection, Schema, Collection, Connection, ConnectionSyncIndexesResult, InferSchemaType, Model, connection, HydratedDocument, Query } from 'mongoose';
import * as mongodb from 'mongodb';
import { expectAssignable } from 'tsd';
import { AutoTypedSchemaType, autoTypedSchema } from './schema.test';
import { ExpectType } from './helpers';

ExpectType<Connection>()(createConnection());
ExpectType<Connection>()(createConnection('mongodb://127.0.0.1:27017/test'));
ExpectType<Connection>()(createConnection('mongodb://127.0.0.1:27017/test', { appName: 'mongoose' }));

const conn = createConnection();

expectAssignable<Model<{ name: string }, any, any, any>>(conn.model('Test', new Schema<{ name: string }>({ name: { type: String } })));
ExpectType<Model<{ name: string }>>()(conn.model<{ name: string }>('Test', new Schema({ name: { type: String } })));

ExpectType<Promise<Connection>>()(conn.openUri('mongodb://127.0.0.1:27017/test'));
ExpectType<Promise<Connection>>()(conn.openUri('mongodb://127.0.0.1:27017/test', { bufferCommands: true }));

conn.readyState === 0;
conn.readyState === 99;

// @ts-expect-error
conn.readyState = 0;


ExpectType<Promise<Record<string, Error | mongodb.Collection<any>>>>()(
  conn.createCollections()
);

ExpectType<Connection>()(new Connection());
ExpectType<Promise<Connection>>()(new Connection().asPromise());

ExpectType<Promise<mongodb.Collection<{ [key: string]: any }>>>()(conn.createCollection('some'));

ExpectType<Promise<void>>()(conn.dropCollection('some'));

// @ts-expect-error
conn.deleteModel();
ExpectType<Connection>()(conn.deleteModel('something'));
ExpectType<Connection>()(conn.deleteModel(/.+/));

ExpectType<Array<string>>()(conn.modelNames());

ExpectType<Promise<void>>()(createConnection('mongodb://127.0.0.1:27017/test').close());
ExpectType<Promise<void>>()(createConnection('mongodb://127.0.0.1:27017/test').close(true));

ExpectType<mongodb.Db | undefined>()(conn.db);

ExpectType<mongodb.MongoClient>()(conn.getClient());
ExpectType<Connection>()(conn.setClient(new mongodb.MongoClient('mongodb://127.0.0.1:27017/test')));

ExpectType<Promise<string>>()(conn.transaction(async(res) => {
  ExpectType<mongodb.ClientSession>()(res);
  return 'a';
}));
ExpectType<Promise<string>>()(conn.transaction(async(res) => {
  ExpectType<mongodb.ClientSession>()(res);
  return 'a';
}, { readConcern: 'majority' }));

ExpectType<Promise<string>>()(conn.withSession(async(res) => {
  ExpectType<mongodb.ClientSession>()(res);
  return 'a';
}));

// @ts-expect-error
conn.user = 'invalid';
// @ts-expect-error
conn.pass = 'invalid';
// @ts-expect-error
conn.host = 'invalid';
// @ts-expect-error
conn.port = 'invalid';

ExpectType<Collection>()(conn.collection('test'));
ExpectType<mongodb.Collection | undefined>()(conn.db?.collection('test'));

ExpectType<Promise<mongodb.ClientSession>>()(conn.startSession());
ExpectType<Promise<mongodb.ClientSession>>()(conn.startSession({ causalConsistency: true }));

ExpectType<Promise<ConnectionSyncIndexesResult>>()(conn.syncIndexes());
ExpectType<Promise<ConnectionSyncIndexesResult>>()(conn.syncIndexes({ continueOnError: true }));

ExpectType<Connection>()(conn.useDb('test'));
ExpectType<Connection>()(conn.useDb('test', {}));
ExpectType<Connection>()(conn.useDb('test', { useCache: true }));

ExpectType<Promise<string[]>>()(
  conn.listCollections().then(collections => collections.map(coll => coll.name))
);

ExpectType<Promise<string[]>>()(
  conn.listDatabases().then(dbs => dbs.databases.map(db => db.name))
);

export function autoTypedModelConnection() {
  const AutoTypedSchema = autoTypedSchema();
  const AutoTypedModel = connection.model('AutoTypeModelConnection', AutoTypedSchema);

  (async() => {
  // Model-functions-test
  // Create should works with arbitrary objects.
    const randomObject = await AutoTypedModel.create({ unExistKey: 'unExistKey', description: 'st' } as Partial<InferSchemaType<typeof AutoTypedSchema>>);
    ExpectType<AutoTypedSchemaType['schema']['userName']>()(randomObject.userName);

    const testDoc1 = await AutoTypedModel.create({ userName: 'M0_0a' });
    ExpectType<AutoTypedSchemaType['schema']['userName']>()(testDoc1.userName);
    ExpectType<AutoTypedSchemaType['schema']['description']>()(testDoc1.description);

    const testDoc2 = await AutoTypedModel.insertMany([{ userName: 'M0_0a' }]);
    ExpectType<AutoTypedSchemaType['schema']['userName']>()(testDoc2[0].userName);
    ExpectType<AutoTypedSchemaType['schema']['description'] | undefined>()(testDoc2[0]?.description);

    const testDoc3 = await AutoTypedModel.findOne({ userName: 'M0_0a' });
    ExpectType<AutoTypedSchemaType['schema']['userName'] | undefined>()(testDoc3?.userName);
    ExpectType<AutoTypedSchemaType['schema']['description'] | undefined>()(testDoc3?.description);

    // Model-statics-functions-test
    ExpectType<ReturnType<AutoTypedSchemaType['statics']['staticFn']>>()(AutoTypedModel.staticFn());

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
  ExpectType<number>()(res.insertedCount);
  // @ts-expect-error
  res.mongoose.validationErrors;

  const res2 = await conn.bulkWrite([{ model: 'Test', name: 'insertOne', document: { name: 'test2' } }], { ordered: false });
  ExpectType<number>()(res2.insertedCount);
  ExpectType<Error[] | undefined>()(res2.mongoose?.validationErrors);

  const res3 = await conn.bulkWrite([
    { model: 'Test', name: 'updateOne', filter: { name: 'test5' }, update: { $set: { num: 42 } } },
    { model: 'Test', name: 'updateOne', filter: { name: 'test4' }, update: { $set: { num: 'not a number' } } }
  ], { ordered: false });
  ExpectType<number>()(res3.insertedCount);

  // @ts-expect-error
  res3.mongoose.validationErrors;
  ExpectType<Error[] | undefined>()(res3.mongoose?.validationErrors);
}
