import * as mongoose from 'mongoose';
import { ObjectId } from 'mongodb';
import { expectType } from 'tsd';

expectType<true>(mongoose.isObjectIdOrHexString(new ObjectId()));
expectType<true>(mongoose.isObjectIdOrHexString(new mongoose.Types.ObjectId()));
expectType<boolean>(mongoose.isObjectIdOrHexString('string'));
expectType<false>(mongoose.isObjectIdOrHexString(new Error()));

expectType<true>(mongoose.isValidObjectId(new ObjectId()));
expectType<true>(mongoose.isValidObjectId(new mongoose.Types.ObjectId()));
expectType<boolean>(mongoose.isValidObjectId('12345'));
// @ts-expect-error
mongoose.isValidObjectId();

expectType<Date>(mongoose.now());
