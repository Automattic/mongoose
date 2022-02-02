import * as mongoose from 'mongoose';
import { expectError, expectType } from 'tsd';

const testObjectId = new mongoose.Types.ObjectId();

expectType<true>(mongoose.isValidObjectId(testObjectId));
expectType<boolean>(mongoose.isValidObjectId('12345'));
expectError(mongoose.isValidObjectId());
