import {
  Schema,
  Model,
  HydratedDocument,
  SchemaOptions,
  model,
  SkipMiddlewareOptions,
  QueryOptions,
  SaveOptions,
  InsertManyOptions,
  MongooseBulkWriteOptions,
  MongooseBulkSaveOptions,
  MongooseBulkWriteResult,
  HydrateOptions,
  AggregateOptions,
  AggregateCursorOptions,
  AggregateCursorMiddlewareOptions,
  SupportsMiddlewareOption
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
  expect<SupportsMiddlewareOption>().type.toBeAssignableFrom({});
  expect<SupportsMiddlewareOption>().type.toBeAssignableFrom({ supportsMiddlewareOption: true });
  expect<SupportsMiddlewareOption['supportsMiddlewareOption']>().type.toBe<boolean | undefined>();

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

async function bulkSaveValidationOptions() {
  // Arrange
  const { User, user } = createTestContext();
  const options: MongooseBulkSaveOptions = {
    validateModifiedOnly: true,
    skipValidation: false,
    middleware: { pre: false }
  };

  // Act
  const result = await User.bulkSave([user], options);
  await User.bulkSave([user], { validateModifiedOnly: false, middleware: false });
  await User.bulkSave([user], { skipValidation: true, middleware: { post: false } });
  await User.bulkSave([user], { validateModifiedOnly: true, validateBeforeSave: true, timestamps: false, ordered: false });

  // Assert
  expect<typeof result>().type.toBe<MongooseBulkWriteResult>();
  expect<MongooseBulkSaveOptions['validateModifiedOnly']>().type.toBe<boolean | undefined>();
  expect<MongooseBulkSaveOptions['skipValidation']>().type.toBe<boolean | undefined>();
  expect(User.bulkSave).type.not.toBeCallableWith([user], { validateModifiedOnly: 'true' });
  expect(User.bulkSave).type.not.toBeCallableWith([user], { skipValidation: 'false' });
}

function hydrationMiddlewareOptions() {
  // Arrange
  const { User, user } = createTestContext();
  const options: HydrateOptions = { hydratedPopulatedDocs: true, middleware: false };

  // Act
  const hydrated = User.hydrate({ name: 'Alice' }, null, options);
  User.hydrate({ name: 'Alice' }, null, { middleware: true });
  User.hydrate({ name: 'Alice' }, null, { middleware: { pre: false } });
  User.hydrate({ name: 'Alice' }, null, { middleware: { post: false } });
  User.hydrate({ name: 'Alice', extra: 'value' }, null, { strict: false, middleware: false });

  // Assert
  expect<typeof hydrated>().type.toBe<typeof user>();
  expect<HydrateOptions['middleware']>().type.toBe<boolean | SkipMiddlewareOptions | undefined>();
  expect(User.hydrate).type.not.toBeCallableWith({ name: 'Alice' }, null, { middleware: 'false' });
  expect(User.hydrate).type.not.toBeCallableWith({ name: 'Alice' }, null, { middleware: { pre: 'false' } });
  expect(User.hydrate).type.not.toBeCallableWith({ name: 'Alice' }, null, { middleware: { post: 'false' } });
}

function constructionMiddlewareTypes() {
  // Arrange
  const { schema } = createConstructionTestContext();

  // Act
  const result = schema.pre('createModel', function() {
    // Construction receives uncast input, or undefined during query hydration.
    expect(this).type.toBe<unknown>();
  });
  schema.pre<{ name?: string } | undefined>('createModel', function() {
    expect(this).type.toBe<{ name?: string } | undefined>();
  });

  // Assert
  expect<typeof result>().type.toBe<typeof schema>();
  expect(schema.pre).type.not.toBeCallableWith('createModel', (doc: { name: string }) => {});
  expect(schema.post).type.not.toBeCallableWith('createModel', function() {});
}

function createTestContext() {
  const User = model('MiddlewareOptionUser', new Schema({ name: String }));
  const user = new User({ name: 'Alice' });
  return { User, user };
}

function createConstructionTestContext() {
  return { schema: new Schema({ name: String }) };
}

function explicitCustomFunctionMiddlewareOptions() {
  // Arrange
  const { schema } = createTypedFunctionContext();

  // Act
  schema.methods.runTask = async function(value, attempts) {
    expect(this).type.toBe<HydratedDocument<TaskData, TaskMethods>>();
    expect(value).type.toBe<string>();
    expect(attempts).type.toBe<number | undefined>();
    return this.name + value;
  };
  schema.statics.findTask = async function(value) {
    expect(value).type.toBe<string>();
    return value;
  };
  schema.methods.runTask.supportsMiddlewareOption = true;
  schema.statics.findTask.supportsMiddlewareOption = true;
  schema.methods.runTask.supportsMiddlewareOption = false;
  delete schema.statics.findTask.supportsMiddlewareOption;

  // Assert
  expect<(typeof schema.methods.runTask)['supportsMiddlewareOption']>().type.toBe<boolean | undefined>();
  expect<(typeof schema.statics.findTask)['supportsMiddlewareOption']>().type.toBe<boolean | undefined>();
  expect<Parameters<typeof schema.methods.runTask>>().type.toBe<[value: string, attempts?: number]>();
  expect<ReturnType<typeof schema.methods.runTask>>().type.toBe<Promise<string>>();
  expect<ThisParameterType<typeof schema.methods.runTask>>().type.toBe<HydratedDocument<TaskData, TaskMethods>>();
  expect<Parameters<typeof schema.statics.findTask>>().type.toBe<[value: string]>();
  expect<ReturnType<typeof schema.statics.findTask>>().type.toBe<Promise<string>>();
  expect<ThisParameterType<typeof schema.statics.findTask>>().type.toBe<unknown>();
  expect(schema.statics.findTask).type.not.toBeCallableWith(123);
  // @ts-expect-error is not assignable to type
  schema.methods.runTask.supportsMiddlewareOption = 'true';
  // @ts-expect-error is not assignable to type
  schema.statics.findTask.supportsMiddlewareOption = 1;
  // @ts-expect-error is not assignable to type
  schema.methods.runTask = async(value: number) => String(value);
  // @ts-expect-error is not assignable to type
  schema.statics.findTask = (value: string) => value;
}

function callerDeclaredCustomFunctionProperties() {
  // Arrange
  const { schema } = createDeclaredFunctionContext();

  // Act
  schema.methods.runTask = Object.assign(async(value: string) => value, { tag: 'task' as const });
  schema.statics.findTask = Object.assign(async(value: string) => value, { tag: 'task' as const });
  schema.methods.runTask.supportsMiddlewareOption = true;
  schema.statics.findTask.supportsMiddlewareOption = true;

  // Assert
  expect<(typeof schema.methods.runTask)['supportsMiddlewareOption']>().type.toBe<true | undefined>();
  expect<(typeof schema.statics.findTask)['supportsMiddlewareOption']>().type.toBe<true | undefined>();
  expect<typeof schema.methods.runTask.tag>().type.toBe<'task'>();
  expect<typeof schema.statics.findTask.tag>().type.toBe<'task'>();
  expect<ThisParameterType<typeof schema.methods.runTask>>().type.toBe<HydratedDocument<TaskData, DeclaredTaskMethods>>();
  expect<Parameters<typeof schema.methods.runTask>>().type.toBe<[value: string]>();
  expect<ReturnType<typeof schema.methods.runTask>>().type.toBe<Promise<string>>();
  // @ts-expect-error is not assignable to type
  schema.methods.runTask.supportsMiddlewareOption = false;
  // @ts-expect-error is not assignable to type
  schema.methods.runTask.tag = 'other';
}

function explicitCustomFunctionReceivers() {
  // Arrange
  const { schema } = createReceiverFunctionContext();

  // Act
  schema.methods.runTask = async function(value) {
    expect(this).type.toBe<TaskReceiver>();
    return this.prefix + value;
  };
  schema.statics.findTask = async function(value) {
    expect(this).type.toBe<TaskReceiver>();
    return this.prefix + value;
  };
  schema.methods.runTask.supportsMiddlewareOption = true;
  schema.statics.findTask.supportsMiddlewareOption = true;

  // Assert
  expect<ThisParameterType<typeof schema.methods.runTask>>().type.toBe<TaskReceiver>();
  expect<ThisParameterType<typeof schema.statics.findTask>>().type.toBe<TaskReceiver>();
  expect<Parameters<typeof schema.methods.runTask>>().type.toBe<[value: string]>();
  expect<ReturnType<typeof schema.statics.findTask>>().type.toBe<Promise<string>>();
  // @ts-expect-error is not assignable to
  schema.methods.runTask.call({ prefix: 123 }, 'Alice');
  // @ts-expect-error is not assignable to
  schema.statics.findTask.call({}, 'Alice');
}

function receiverTransformationPreservesProperties() {
  // Arrange
  const { options } = createMethodOptionsContext();

  // Act
  const method = options.methods!.runTask;

  // Assert
  expect<typeof method.tag>().type.toBe<'task'>();
  expect<typeof method.supportsMiddlewareOption>().type.toBe<true | undefined>();
  expect<Parameters<typeof method>>().type.toBe<[value: string]>();
  expect<ReturnType<typeof method>>().type.toBe<Promise<string>>();
  expect<ThisParameterType<typeof method>>().type.toBe<HydratedDocument<TaskData, DeclaredTaskMethods>>();
}

interface TaskData {
  name: string;
}
interface TaskMethods {
  runTask(value: string, attempts?: number): Promise<string>;
}
interface TaskStatics {
  findTask(value: string): Promise<string>;
}
interface DeclaredTaskFunction {
  (value: string): Promise<string>;
  supportsMiddlewareOption?: true;
  tag: 'task';
}
interface DeclaredTaskMethods {
  runTask: DeclaredTaskFunction;
}
interface DeclaredTaskStatics {
  findTask: DeclaredTaskFunction;
}
interface TaskReceiver {
  prefix: string;
}
interface ReceiverTaskMethods {
  runTask(this: TaskReceiver, value: string): Promise<string>;
}
interface ReceiverTaskStatics {
  findTask(this: TaskReceiver, value: string): Promise<string>;
}

function createTypedFunctionContext() {
  type TaskModel = Model<TaskData, {}, TaskMethods> & TaskStatics;
  const schema = new Schema<TaskData, TaskModel, TaskMethods, {}, {}, TaskStatics>({ name: String });
  return { schema };
}

function createDeclaredFunctionContext() {
  type TaskModel = Model<TaskData, {}, DeclaredTaskMethods> & DeclaredTaskStatics;
  const schema = new Schema<TaskData, TaskModel, DeclaredTaskMethods, {}, {}, DeclaredTaskStatics>({ name: String });
  return { schema };
}

function createReceiverFunctionContext() {
  type TaskModel = Model<TaskData, {}, ReceiverTaskMethods> & ReceiverTaskStatics;
  const schema = new Schema<TaskData, TaskModel, ReceiverTaskMethods, {}, {}, ReceiverTaskStatics>({ name: String });
  return { schema };
}

function createMethodOptionsContext() {
  const options: SchemaOptions<TaskData, DeclaredTaskMethods, {}, {}, {}, HydratedDocument<TaskData, DeclaredTaskMethods>> = {
    methods: { runTask: Object.assign(async(value: string) => value, { tag: 'task' as const }) }
  };
  return { options };
}

async function staticValidationAndWatchMiddleware() {
  // Arrange
  const { User } = createTestContext();

  // Act
  const validated = await User.validate({ name: 'Ann' }, { middleware: false });
  await User.validate({ name: 'Ann' }, { middleware: true, pathsToSkip: ['name'] });
  await User.validate({ name: 'Ann' }, { middleware: { pre: false } });
  await User.validate({ name: 'Ann' }, { middleware: { post: false }, pathsToSkip: 'name' });
  const stream = User.watch<{ name: string }, import('mongodb').ChangeStreamDocument<{ name: string }>>([], { hydrate: true, fullDocument: 'updateLookup', middleware: false });
  User.watch([], { middleware: true });
  User.watch([], { hydrate: false, middleware: { pre: false } });
  User.watch([], { middleware: { post: false } });
  User.watch([], { middleware: {} });
  User.watch([], { middleware: { pre: true, post: false }, batchSize: 10 });
  const hydrated = User.hydrate({ name: 'Ann' }, undefined, { middleware: false });
  User.hydrate({ name: 'Ann' }, null, { middleware: true });
  User.hydrate({ name: 'Ann' }, null, { middleware: { pre: false }, hydratedPopulatedDocs: true });
  User.hydrate({ name: 'Ann' }, null, { middleware: { post: false }, setters: true });

  // Assert
  expect(validated).type.toBe<{ name: string }>();
  expect(hydrated).type.toBe<HydratedDocument<{ name: string }>>();
  expect(stream).type.toBe<import('mongodb').ChangeStream<{ name: string }, import('mongodb').ChangeStreamDocument<{ name: string }>>>();
  expect(User.watch).type.not.toBeCallableWith([], { middleware: 'false' });
  expect(User.watch).type.not.toBeCallableWith([], { middleware: { pre: 0 } });
  expect(User.watch).type.not.toBeCallableWith([], { middleware: { post: 'false' } });
  expect(User.watch).type.not.toBeCallableWith([], { hydrate: 'true', middleware: false });
  expect(User.hydrate).type.not.toBeCallableWith({}, undefined, { middleware: 'false' });
  expect(User.hydrate).type.not.toBeCallableWith({}, undefined, { middleware: { pre: 0 } });
  expect(User.hydrate).type.not.toBeCallableWith({}, undefined, { middleware: { post: 'false' } });
  expect(User.validate).type.not.toBeCallableWith({}, { middleware: 'false' });
  expect(User.validate).type.not.toBeCallableWith({}, { middleware: { pre: 0 } });
  expect(User.validate).type.not.toBeCallableWith({}, { middleware: { post: 'false' } });

  function createTestContext() {
    const schema = new Schema<{ name: string }>({ name: { type: String, required: true } });
    return { User: model('MiddlewareOptionsUser', schema) };
  }
}
