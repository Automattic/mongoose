import type * as mongoose from 'mongoose';
import mongooseESM from 'mongoose';
import * as mongooseDefault from 'mongoose';
import { expectType } from 'tsd';

expectType<typeof mongoose>(mongooseESM);
expectType<typeof mongoose>(mongooseDefault);
