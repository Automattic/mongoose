import mongodb = require('mongodb');

declare module 'mongoose' {

  /** The node-mongodb-native driver Mongoose uses. */
  export const mongo: typeof mongodb;

  export type MongoDBMongoClient = mongodb.MongoClient;
  export type MongoDBMongoClientOptions = mongodb.MongoClientOptions;

  export type MongoDBChangeStream<TSchema extends mongodb.Document = mongodb.Document> = mongodb.ChangeStream<TSchema>;
  export type MongoDBChangeStreamOptions = mongodb.ChangeStreamOptions;

  export type MongoDBClientSession = mongodb.ClientSession;
  export type MongoDBClientSessionOptions = mongodb.ClientSessionOptions;

  export type MongoDBDb = mongodb.Db;

  export type MongoDBObjectId = mongodb.ObjectId;
  export const MongoDBObjectId: typeof mongodb.ObjectId;
  export type MongoDBBinary = mongodb.Binary;
  export type MongoDBDecimal128 = mongodb.Decimal128;
  export const MongoDBDecimal128: typeof mongodb.Decimal128;
  export type MongoDBDouble = mongodb.Double;
  export type MongoDBInt32 = mongodb.Int32;
  export type MongoDBLong = mongodb.Long;

  export type MongoDBCollection<TSchema extends mongodb.Document = mongodb.Document> = mongodb.Collection<TSchema>;
  export type MongoDBCreateCollectionOptions = mongodb.CreateCollectionOptions;

  export type MongoDBCreateIndexesOptions = mongodb.CreateIndexesOptions;

  export type MongoDBAggregateOptions = mongodb.AggregateOptions;

  export type MongoDBBulkWriteOptions = mongodb.BulkWriteOptions;
  export type MongoDBBulkWriteResult = mongodb.BulkWriteResult;

  export type MongoDBMongoServerError = mongodb.MongoServerError;

  export type MongoDBCollationOptions = mongodb.CollationOptions;
  export type MongoDBTimeSeriesCollectionOptions = mongodb.TimeSeriesCollectionOptions;

  export type MongoDBInsertManyResult<TSchema = mongodb.Document> = mongodb.InsertManyResult<TSchema>;
  export type MongoDBUpdateResult = mongodb.UpdateResult;
  export type MongoDBDeleteResult = mongodb.DeleteResult;

  export type MongoDBReadPreferenceMode = mongodb.ReadPreferenceMode;
}
