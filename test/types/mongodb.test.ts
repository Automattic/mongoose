import * as mongoose from 'mongoose';
import * as mongodb from 'mongodb';
import { expectType } from 'tsd';

expectType<mongodb.ClientSession>({} as mongoose.MongoDBClientSession);
expectType<mongodb.ClientSessionOptions>({} as mongoose.MongoDBClientSessionOptions);
