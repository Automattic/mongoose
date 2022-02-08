import { Schema, model, Model, Document, SaveOptions, Query, Aggregate } from 'mongoose';
import { expectError } from 'tsd';

const schema: Schema = new Schema({ name: { type: 'String' } });

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

schema.pre(['save', 'validate'], { query: false, document: true }, async function applyChanges() {
  await Test.findOne({});
});

schema.pre('save', function(next, opts: SaveOptions) {
  console.log(opts.session);
  next();
});

interface ITest extends Document {
  name?: string;
}

schema.pre('save', function(next) {
  console.log(this.name);
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

const Test = model<ITest>('Test', schema);
