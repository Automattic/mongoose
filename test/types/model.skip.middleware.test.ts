import {
  Schema,
  model,
  SkipMiddlewareOptions,
  QueryOptions,
  SaveOptions,
  InsertManyOptions,
  MongooseBulkWriteOptions,
  MongooseBulkSaveOptions,
  AggregateOptions
} from 'mongoose';
import { expectAssignable, expectType } from 'tsd';

async function gh8768() {
  const addressSchema = new Schema({ city: String });
  const schema = new Schema({ name: String, address: addressSchema });
  const User = model('User', schema);

  // SkipMiddlewareOptions type
  expectAssignable<SkipMiddlewareOptions>({});
  expectAssignable<SkipMiddlewareOptions>({ pre: false });
  expectAssignable<SkipMiddlewareOptions>({ post: false });
  expectAssignable<SkipMiddlewareOptions>({ pre: false, post: true });
  expectAssignable<SkipMiddlewareOptions>({ pre: true, post: false });
  expectType<boolean | undefined>({} as SkipMiddlewareOptions['pre']);
  expectType<boolean | undefined>({} as SkipMiddlewareOptions['post']);

  // Verify middleware option types are strictly boolean | SkipMiddlewareOptions | undefined
  expectType<boolean | SkipMiddlewareOptions | undefined>({} as QueryOptions['middleware']);
  expectType<boolean | SkipMiddlewareOptions | undefined>({} as SaveOptions['middleware']);
  expectType<boolean | SkipMiddlewareOptions | undefined>({} as InsertManyOptions['middleware']);
  expectType<boolean | SkipMiddlewareOptions | undefined>({} as MongooseBulkWriteOptions['middleware']);
  expectType<boolean | SkipMiddlewareOptions | undefined>({} as MongooseBulkSaveOptions['middleware']);
  expectType<boolean | SkipMiddlewareOptions | undefined>({} as AggregateOptions['middleware']);

  // QueryOptions - Query operations
  User.find({}, null, { middleware: false });
  User.find({}, null, { middleware: { pre: false } });
  User.find({}, null, { middleware: { post: false } });
  User.find({}, null, { middleware: { pre: false, post: true } });
  User.findOne({}, null, { middleware: false });
  User.findOne({}, null, { middleware: { pre: false } });
  User.findOne({}, null, { middleware: { post: false } });
  User.findOneAndUpdate({}, {}, { middleware: false });
  User.findOneAndUpdate({}, {}, { middleware: { pre: false } });
  User.findOneAndUpdate({}, {}, { middleware: { post: false } });
  User.findOneAndDelete({}, { middleware: false });
  User.findOneAndDelete({}, { middleware: { pre: false } });
  User.findOneAndDelete({}, { middleware: { post: false } });
  User.findOneAndReplace({}, {}, { middleware: false });
  User.findOneAndReplace({}, {}, { middleware: { pre: false } });
  User.findOneAndReplace({}, {}, { middleware: { post: false } });
  User.updateOne({}, {}, { middleware: false });
  User.updateOne({}, {}, { middleware: { pre: false } });
  User.updateOne({}, {}, { middleware: { post: false } });
  User.updateMany({}, {}, { middleware: false });
  User.updateMany({}, {}, { middleware: { pre: false } });
  User.updateMany({}, {}, { middleware: { post: false } });
  User.deleteOne({}, { middleware: false });
  User.deleteOne({}, { middleware: { pre: false } });
  User.deleteOne({}, { middleware: { post: false } });
  User.deleteMany({}, { middleware: false });
  User.deleteMany({}, { middleware: { pre: false } });
  User.deleteMany({}, { middleware: { post: false } });
  User.countDocuments({}, { middleware: false });
  User.countDocuments({}, { middleware: { pre: false } });
  User.countDocuments({}, { middleware: { post: false } });
  User.replaceOne({}, {}, { middleware: false });
  User.replaceOne({}, {}, { middleware: { pre: false } });
  User.replaceOne({}, {}, { middleware: { post: false } });
  User.distinct('name', {}, { middleware: false });
  User.distinct('name', {}, { middleware: { pre: false } });
  User.distinct('name', {}, { middleware: { post: false } });
  User.estimatedDocumentCount({ middleware: false });
  User.estimatedDocumentCount({ middleware: { pre: false } });
  User.estimatedDocumentCount({ middleware: { post: false } });

  // InsertManyOptions
  await User.insertMany([{}], { middleware: false });
  await User.insertMany([{}], { middleware: { pre: false } });
  await User.insertMany([{}], { middleware: { post: false } });

  // MongooseBulkWriteOptions
  await User.bulkWrite([], { middleware: false });
  await User.bulkWrite([], { middleware: { pre: false } });
  await User.bulkWrite([], { middleware: { post: false } });

  // CreateCollectionOptions
  await User.createCollection({ middleware: false });
  await User.createCollection({ middleware: { pre: false } });
  await User.createCollection({ middleware: { post: false } });

  // SaveOptions - doc.save()
  const user = new User({ name: 'test' });
  await user.save({ middleware: false });
  await user.save({ middleware: { pre: false } });
  await user.save({ middleware: { post: false } });

  // ValidateOptions - doc.validate()
  await user.validate({ middleware: false });
  await user.validate({ middleware: { pre: false } });
  await user.validate({ middleware: { post: false } });

  // ValidateOptions - doc.validateSync()
  user.validateSync({ middleware: false });
  user.validateSync({ middleware: { pre: false } });
  user.validateSync({ middleware: { post: false } });
  user.validateSync({ middleware: false, pathsToSkip: ['name'] });

  // MongooseBulkSaveOptions
  await User.bulkSave([user], { middleware: false });
  await User.bulkSave([user], { middleware: { pre: false } });
  await User.bulkSave([user], { middleware: { post: false } });

  // AggregateOptions
  User.aggregate([], { middleware: false });
  User.aggregate([], { middleware: { pre: false } });
  User.aggregate([], { middleware: { post: false } });

  // Query.prototype.setOptions() chain method
  User.find().setOptions({ middleware: false });
  User.find().setOptions({ middleware: { pre: false } });
  User.find().setOptions({ middleware: { post: false } });

  // Aggregate.prototype.option() chain method
  User.aggregate().option({ middleware: false });
  User.aggregate().option({ middleware: { pre: false } });
  User.aggregate().option({ middleware: { post: false } });

  // Document instance operations - user.updateOne(), user.deleteOne()
  await user.updateOne({}, { middleware: false });
  await user.updateOne({}, { middleware: { pre: false } });
  await user.updateOne({}, { middleware: { post: false } });
  await user.deleteOne({ middleware: false });
  await user.deleteOne({ middleware: { pre: false } });
  await user.deleteOne({ middleware: { post: false } });
}
