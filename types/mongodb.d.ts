import mongodb = require('mongodb');

declare module 'mongoose' {
  export type MongoDBClientSession = mongodb.ClientSession;
  export type MongoDBClientSessionOptions = mongodb.ClientSessionOptions;
}
