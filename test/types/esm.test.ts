import type * as mongoose from 'mongoose';
import mongooseESM from 'mongoose';
import * as mongooseDefault from 'mongoose';
import { ExpectType } from './helpers';

ExpectType<typeof mongoose>()(mongooseESM);
ExpectType<typeof mongoose>()(mongooseDefault);
