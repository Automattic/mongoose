import { AggregateOptions } from 'mongoose/mongodb-driver';
import { expectType } from 'tsd';


const options: AggregateOptions = { };
expectType<boolean | undefined>(options.allowDiskUse);
expectType<string | undefined>(options.dbName);