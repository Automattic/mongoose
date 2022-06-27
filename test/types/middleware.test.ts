import { Schema, model, Model, Document, SaveOptions, Query, Aggregate, HydratedDocument, PreSaveMiddlewareFunction } from 'mongoose';
import { expectError, expectType, expectNotType } from 'tsd';

interface ITest extends Document {
  name?: string;
}

const preMiddlewareFn: PreSaveMiddlewareFunction<Document> = function(next, opts) {
  this.$markValid('name');
  if (opts.session) {
    next();
  } else {
    next(new Error('Operation must be in Session.'));
  }
};

const schema: Schema<ITest> = new Schema<ITest>({ name: { type: 'String' } });

schema.pre<Query<any, any>>('find', async function() {
  console.log('Find', this.getFilter());
});

schema.pre<Query<any, any>>('find', async function() {
  expectError(this.notAFunction());
});

schema.pre<Aggregate<any>>('aggregate', async function() {
  console.log('Pipeline', this.pipeline());
});

schema.post<Aggregate<any>>('aggregate', async function(res: Array<any>) {
  console.log('Pipeline', this.pipeline(), res[0]);
});

schema.post<Aggregate<ITest>>('aggregate', function(res, next) {
  expectType<ITest[]>(res);
  next();
});

schema.post<Query<ITest, ITest>>('save', function(res, next) {
  expectType<Query<ITest, ITest>>(res);
  next();
});

schema.pre(['save', 'validate'], { query: false, document: true }, async function applyChanges() {
  await Test.findOne({});
});

schema.pre('save', function(next, opts: SaveOptions) {
  console.log(opts.session);
  next();
});

schema.pre('save', function(next) {
  console.log(this.name);
});

schema.post<ITest>('save', function(res, next) {
  expectType<ITest>(res);
  next();
});

schema.post<ITest>('save', function() {
  console.log(this.name);
});

schema.post<ITest>('save', function(err: Error, res: ITest, next: Function) {
  console.log(this.name, err.stack);
});

schema.pre<Model<ITest>>('insertMany', function() {
  const name: string = this.name;
  return Promise.resolve();
});

schema.pre<Model<ITest>>('insertMany', { document: false, query: false }, function() {
  console.log(this.name);
});

schema.pre<Model<ITest>>('insertMany', function(next) {
  console.log(this.name);
  next();
});

schema.pre<Model<ITest>>('insertMany', function(next, doc: ITest) {
  console.log(this.name, doc);
  next();
});

schema.pre<Model<ITest>>('insertMany', function(next, docs: Array<ITest>) {
  console.log(this.name, docs);
  next();
});

schema.post<Query<ITest, ITest>>('findOneAndDelete', function(res, next) {
  expectType<ITest>(res);
  next();
});

const Test = model<ITest>('Test', schema);

function gh11257(): void {
  schema.pre('save', { document: true }, function() {
    expectType<HydratedDocument<ITest>>(this);
  });
}

function gh11480(): void {
  type IUserSchema = {
    name: string;
  };

  const UserSchema = new Schema<IUserSchema>({ name: { type: String } });

  UserSchema.pre('save', function(next) {
    expectNotType<any>(this);
    next();
  });
}
