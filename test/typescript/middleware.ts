import { Schema, model, Model, Document, Types, Query, Aggregate } from 'mongoose';

const schema: Schema = new Schema({ name: { type: 'String' } });

schema.pre<Query<any, any>>('find', async function() {
  console.log('Find', this.getFilter());
});

schema.pre<Query<any, any>>('find', async function() {
  console.log('Find', this.notAFunction());
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

interface ITest extends Document {
  name?: string;
}

schema.pre<ITest>('save', function(next) {
  console.log(this.name);
});

schema.post<ITest>('save', function() {
  console.log(this.name);
});

// eslint-disable-next-line @typescript-eslint/ban-types
schema.post<ITest>('save', function(err: Error, res: ITest, next: Function) {
  console.log(this.name, err.stack);
});

const Test = model<ITest>('Test', schema);
