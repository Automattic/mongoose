import { createConnection, Schema, Collection, Connection, ConnectionSyncIndexesResult, InferSchemaType, Model, connection, HydratedDocument, Query } from 'mongoose';
import * as mongodb from 'mongodb';
import { expectAssignable, expectType } from 'tsd';
import { AutoTypedSchemaType, autoTypedSchema } from './schema.test';
import { Expect, Equal } from './helpers';

Expect<Equal<ReturnType<typeof createConnection>, Connection>>();
const createConnectionWithUri = () => createConnection('mongodb://127.0.0.1:27017/test');
Expect<Equal<ReturnType<typeof createConnectionWithUri>, Connection>>();
const createConnectionWithUriAndOptions = () => createConnection('mongodb://127.0.0.1:27017/test', { appName: 'mongoose' });
Expect<Equal<ReturnType<typeof createConnectionWithUriAndOptions>, Connection>>();

const conn = createConnection();

expectAssignable<Model<{ name: string }, any, any, any>>(conn.model('Test', new Schema<{ name: string }>({ name: { type: String } })));
const modelWithRawDocType = conn.model<{ name: string }>('Test', new Schema({ name: { type: String } }));
Expect<Equal<typeof modelWithRawDocType, Model<{ name: string }>>>();

const openUriWithUri = () => conn.openUri('mongodb://127.0.0.1:27017/test');
Expect<Equal<ReturnType<typeof openUriWithUri>, Promise<Connection>>>();
const openUriWithUriAndOptions = () => conn.openUri('mongodb://127.0.0.1:27017/test', { appName: 'mongoose' });
Expect<Equal<ReturnType<typeof openUriWithUriAndOptions>, Promise<Connection>>>();

conn.readyState === 0;
conn.readyState === 99;

// @ts-expect-error
conn.readyState = 0;

const collections = conn.createCollections();
Expect<Equal<typeof collections, Promise<Record<string, Error | mongodb.Collection<any>>>>>();

Expect<Equal<ReturnType<(typeof conn)['asPromise']>, Promise<Connection>>>();

const createCollectionResult = conn.createCollection('some');
Expect<Equal<typeof createCollectionResult, Promise<mongodb.Collection<{ [key: string]: any }>>>>();

const dropCollectionResult = conn.dropCollection('some');
Expect<Equal<typeof dropCollectionResult, Promise<void>>>();

// @ts-expect-error
conn.deleteModel();
const deleteModelWithString = () => conn.deleteModel('something');
Expect<Equal<ReturnType<typeof deleteModelWithString>, Connection>>();
const deleteModelWithRegexp = () => conn.deleteModel(/.+/);
Expect<Equal<ReturnType<typeof deleteModelWithRegexp>, Connection>>();

const modelNames = conn.modelNames();
Expect<Equal<typeof modelNames, string[]>>();

const close = () => createConnection('mongodb://127.0.0.1:27017/test').close();
Expect<Equal<ReturnType<typeof close>, Promise<void>>>();
const closeWithForce = () => createConnection('mongodb://127.0.0.1:27017/test').close(true);
Expect<Equal<ReturnType<typeof closeWithForce>, Promise<void>>>();

Expect<Equal<typeof conn.db, mongodb.Db | undefined>>();

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

// @ts-expect-error
conn.user = 'invalid';
// @ts-expect-error
conn.pass = 'invalid';
// @ts-expect-error
conn.host = 'invalid';
// @ts-expect-error
conn.port = 'invalid';

expectType<Collection>(conn.collection('test'));
expectType<mongodb.Collection | undefined>(conn.db?.collection('test'));

expectType<Promise<mongodb.ClientSession>>(conn.startSession());
expectType<Promise<mongodb.ClientSession>>(conn.startSession({ causalConsistency: true }));

expectType<Promise<ConnectionSyncIndexesResult>>(conn.syncIndexes());
expectType<Promise<ConnectionSyncIndexesResult>>(conn.syncIndexes({ continueOnError: true }));

expectType<Connection>(conn.useDb('test'));
expectType<Connection>(conn.useDb('test', {}));
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
    const randomObject = await AutoTypedModel.create({ unExistKey: 'unExistKey', description: 'st' } as Partial<InferSchemaType<typeof AutoTypedSchema>>);
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
  // @ts-expect-error
  res.mongoose.validationErrors;

  const res2 = await conn.bulkWrite([{ model: 'Test', name: 'insertOne', document: { name: 'test2' } }], { ordered: false });
  expectType<number>(res2.insertedCount);
  expectType<Error[] | undefined>(res2.mongoose?.validationErrors);

  const res3 = await conn.bulkWrite([
    { model: 'Test', name: 'updateOne', filter: { name: 'test5' }, update: { $set: { num: 42 } } },
    { model: 'Test', name: 'updateOne', filter: { name: 'test4' }, update: { $set: { num: 'not a number' } } }
  ], { ordered: false });
  expectType<number>(res3.insertedCount);

  // @ts-expect-error
  res3.mongoose.validationErrors;
  expectType<Error[] | undefined>(res3.mongoose?.validationErrors);
}
