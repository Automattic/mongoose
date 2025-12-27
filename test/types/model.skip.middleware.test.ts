import { Schema, model, SkipMiddlewareOptions, QueryOptions, SaveOptions, InsertManyOptions, MongooseBulkWriteOptions, AggregateOptions } from 'mongoose';
import { expectAssignable, expectType } from 'tsd';

async function gh8768() {
  const schema = new Schema({ name: String });
  const Test = model('Test', schema);

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
  expectType<boolean | SkipMiddlewareOptions | undefined>({} as AggregateOptions['middleware']);

  // QueryOptions
  Test.find({}, null, { middleware: false });
  Test.find({}, null, { middleware: { pre: false } });
  Test.find({}, null, { middleware: { post: false } });
  Test.find({}, null, { middleware: { pre: false, post: true } });
  Test.findOne({}, null, { middleware: false });
  Test.findOne({}, null, { middleware: { pre: false } });
  Test.findOne({}, null, { middleware: { post: false } });
  Test.findOneAndUpdate({}, {}, { middleware: false });
  Test.findOneAndUpdate({}, {}, { middleware: { pre: false } });
  Test.findOneAndUpdate({}, {}, { middleware: { post: false } });
  Test.findOneAndDelete({}, { middleware: false });
  Test.findOneAndDelete({}, { middleware: { pre: false } });
  Test.findOneAndDelete({}, { middleware: { post: false } });
  Test.findOneAndReplace({}, {}, { middleware: false });
  Test.findOneAndReplace({}, {}, { middleware: { pre: false } });
  Test.findOneAndReplace({}, {}, { middleware: { post: false } });
  Test.updateOne({}, {}, { middleware: false });
  Test.updateOne({}, {}, { middleware: { pre: false } });
  Test.updateOne({}, {}, { middleware: { post: false } });
  Test.updateMany({}, {}, { middleware: false });
  Test.updateMany({}, {}, { middleware: { pre: false } });
  Test.updateMany({}, {}, { middleware: { post: false } });
  Test.deleteOne({}, { middleware: false });
  Test.deleteOne({}, { middleware: { pre: false } });
  Test.deleteOne({}, { middleware: { post: false } });
  Test.deleteMany({}, { middleware: false });
  Test.deleteMany({}, { middleware: { pre: false } });
  Test.deleteMany({}, { middleware: { post: false } });
  Test.countDocuments({}, { middleware: false });
  Test.countDocuments({}, { middleware: { pre: false } });
  Test.countDocuments({}, { middleware: { post: false } });
  Test.replaceOne({}, {}, { middleware: false });
  Test.replaceOne({}, {}, { middleware: { pre: false } });
  Test.replaceOne({}, {}, { middleware: { post: false } });

  // InsertManyOptions
  await Test.insertMany([{}], { middleware: false });
  await Test.insertMany([{}], { middleware: { pre: false } });
  await Test.insertMany([{}], { middleware: { post: false } });

  // MongooseBulkWriteOptions
  await Test.bulkWrite([], { middleware: false });
  await Test.bulkWrite([], { middleware: { pre: false } });
  await Test.bulkWrite([], { middleware: { post: false } });

  // SaveOptions
  const doc = new Test({ name: 'test' });
  await doc.save({ middleware: false });
  await doc.save({ middleware: { pre: false } });
  await doc.save({ middleware: { post: false } });

  // AggregateOptions
  const agg = Test.aggregate([]);
  agg.options.middleware = false;
  agg.options.middleware = { pre: false };
  agg.options.middleware = { post: false };
  agg.options.middleware = { pre: false, post: true };
}
