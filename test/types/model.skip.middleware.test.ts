import {
  Schema,
  model,
  SkipMiddlewareOptions,
  QueryOptions,
  SaveOptions,
  InsertManyOptions,
  MongooseBulkWriteOptions,
  MongooseBulkSaveOptions,
  AggregateOptions,
  AggregateCursorOptions,
  AggregateCursorMiddlewareOptions
} from 'mongoose';
import { expect } from 'tstyche';

async function gh8768() {
  const addressSchema = new Schema({ city: String });
  const schema = new Schema({ name: String, address: addressSchema });
  const User = model('User', schema);

  // SkipMiddlewareOptions type
  expect<SkipMiddlewareOptions>().type.toBeAssignableFrom({});
  expect<SkipMiddlewareOptions>().type.toBeAssignableFrom({ pre: false });
  expect<SkipMiddlewareOptions>().type.toBeAssignableFrom({ post: false });
  expect<SkipMiddlewareOptions>().type.toBeAssignableFrom({ pre: false, post: true });
  expect<SkipMiddlewareOptions>().type.toBeAssignableFrom({ pre: true, post: false });
  expect<SkipMiddlewareOptions['pre']>().type.toBe<boolean | undefined>();
  expect<SkipMiddlewareOptions['post']>().type.toBe<boolean | undefined>();
  expect<AggregateCursorMiddlewareOptions>().type.toBeAssignableFrom({ pre: false });
  expect<AggregateCursorMiddlewareOptions>().type.not.toBeAssignableFrom({ post: false });

  // Verify middleware option types are strictly boolean | SkipMiddlewareOptions | undefined
  expect<QueryOptions['middleware']>().type.toBe<boolean | SkipMiddlewareOptions | undefined>();
  expect<SaveOptions['middleware']>().type.toBe<boolean | SkipMiddlewareOptions | undefined>();
  expect<InsertManyOptions['middleware']>().type.toBe<boolean | SkipMiddlewareOptions | undefined>();
  expect<MongooseBulkWriteOptions['middleware']>().type.toBe<boolean | SkipMiddlewareOptions | undefined>();
  expect<MongooseBulkSaveOptions['middleware']>().type.toBe<boolean | SkipMiddlewareOptions | undefined>();
  expect<AggregateOptions['middleware']>().type.toBe<boolean | SkipMiddlewareOptions | undefined>();
  expect<AggregateCursorOptions>().type.toBeAssignableFrom({ batchSize: 100 });
  expect<AggregateCursorOptions>().type.toBeAssignableFrom({ comment: 'test cursor' });
  expect<AggregateCursorOptions>().type.toBeAssignableFrom({ maxTimeMS: 1000 });
  expect<AggregateCursorOptions>().type.toBeAssignableFrom({ signal: new AbortController().signal });
  expect<AggregateCursorOptions>().type.toBeAssignableFrom({ useMongooseAggCursor: true });
  expect<AggregateCursorOptions>().type.toBeAssignableFrom({ middleware: false });
  expect<AggregateCursorOptions>().type.toBeAssignableFrom({ middleware: { pre: false } });
  expect<AggregateCursorOptions['maxTimeMS']>().type.toBe<number | undefined>();
  expect<AggregateCursorOptions['signal']>().type.toBe<AbortSignal | undefined>();
  expect<AggregateCursorOptions>().type.not.toBeAssignableFrom({ maxTimeMS: '1000' });
  expect<AggregateCursorOptions>().type.not.toBeAssignableFrom({ middleware: { post: false } });

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

  user.validateSync({ pathsToSkip: ['name'] });

  // validateSync() does not run middleware, so it does not support middleware options
  expect(user.validateSync).type.not.toBeCallableWith({ middleware: false });
  expect(user.validateSync).type.not.toBeCallableWith({ middleware: { pre: false } });
  expect(user.validateSync).type.not.toBeCallableWith({ middleware: { post: false } });
  expect(user.validateSync).type.not.toBeCallableWith({ middleware: false, pathsToSkip: ['name'] });

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

  // Query.prototype.cursor() accepts middleware options
  User.find().cursor({ middleware: false });
  User.find().cursor({ middleware: { pre: false } });
  User.find().cursor({ middleware: { post: false } });

  // Aggregate.prototype.option() chain method
  User.aggregate().option({ middleware: false });
  User.aggregate().option({ middleware: { pre: false } });
  User.aggregate().option({ middleware: { post: false } });

  // Aggregate.prototype.cursor() accepts pre aggregate middleware options
  User.aggregate().option({ middleware: false }).cursor();
  User.aggregate().option({ middleware: { pre: false } }).cursor();
  User.aggregate().cursor({ middleware: false });
  User.aggregate().cursor({ middleware: { pre: false } });
  expect(User.aggregate().cursor).type.not.toBeCallableWith({ middleware: { post: false } });

  // Document instance operations - user.updateOne(), user.deleteOne()
  await user.updateOne({}, { middleware: false });
  await user.updateOne({}, { middleware: { pre: false } });
  await user.updateOne({}, { middleware: { post: false } });
  await user.deleteOne({ middleware: false });
  await user.deleteOne({ middleware: { pre: false } });
  await user.deleteOne({ middleware: { post: false } });

  // Custom statics and methods opt in to the middleware option by setting
  // `supportsMiddlewareOption` on the function itself
  const emailSchema = new Schema({ to: String });
  emailSchema.statics.queueEmail = function(to: string, options = {}) {
    return Promise.resolve(to);
  };
  emailSchema.statics.queueEmail.supportsMiddlewareOption = true;
  expect<(typeof emailSchema.statics)[string]['supportsMiddlewareOption']>().type.toBe<boolean | undefined>();
  emailSchema.methods.markSent = function(options = {}) {
    return this;
  };
  emailSchema.methods.markSent.supportsMiddlewareOption = true;
}
