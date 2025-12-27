import * as mongoose from 'mongoose';
import { ObjectId } from 'mongodb';
import { ExpectType } from './helpers';

ExpectType<true>()(mongoose.isObjectIdOrHexString(new ObjectId()));
ExpectType<true>()(mongoose.isObjectIdOrHexString(new mongoose.Types.ObjectId()));
ExpectType<boolean>()(mongoose.isObjectIdOrHexString('string'));
ExpectType<false>()(mongoose.isObjectIdOrHexString(new Error()));

ExpectType<true>()(mongoose.isValidObjectId(new ObjectId()));
ExpectType<true>()(mongoose.isValidObjectId(new mongoose.Types.ObjectId()));
ExpectType<boolean>()(mongoose.isValidObjectId('12345'));
// @ts-expect-error cannot be called without arguments
mongoose.isValidObjectId();

ExpectType<Date>()(mongoose.now());
