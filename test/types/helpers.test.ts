import * as mongoose from 'mongoose';
import { ObjectId } from 'mongodb';
import { expect } from 'tstyche';

expect(mongoose.isObjectIdOrHexString(new ObjectId())).type.toBe<true>();
expect(mongoose.isObjectIdOrHexString(new mongoose.Types.ObjectId())).type.toBe<true>();
expect(mongoose.isObjectIdOrHexString('string')).type.toBe<boolean>();
expect(mongoose.isObjectIdOrHexString(new Error())).type.toBe<false>();

expect(mongoose.isValidObjectId(new ObjectId())).type.toBe<true>();
expect(mongoose.isValidObjectId(new mongoose.Types.ObjectId())).type.toBe<true>();
expect(mongoose.isValidObjectId('12345')).type.toBe<boolean>();
expect(mongoose.isValidObjectId).type.not.toBeCallableWith();

expect(mongoose.now()).type.toBe<Date>();
