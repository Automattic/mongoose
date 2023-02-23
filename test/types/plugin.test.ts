import { connection, HydratedDocument, Model, Query, Schema } from 'mongoose';

function pluginVirtuals(schema: Schema<Test, any, any, any, TestVirtuals>): void {
  schema.virtual('fullName').get(function(this: TestDocument) {
    return `${this.firstName} ${this.lastName}`;
  });
  schema.virtual('notDefined').get(function(this: TestDocument) {
    return 'foobar';
  });
}

function pluginQueryHelpers(schema: Schema<Test, any, any, TestQueryHelpers>): void {
  schema.query.whereSomething = function() {
    return this.where({ name: 'something' });
  };
}

function pluginMethods(schema: Schema<Test, any, TestInstanceMethods>): void {
  schema.methods.doSomething = function() {
    return 'test';
  };
}

function pluginStatics(schema: Schema<Test, TestModel, any, TestQueryHelpers, any, TestStaticMethods>): void {
  schema.statics.findSomething = function() {
    return this.findOne().orFail().exec();
  };
  schema.static({
    findSomething: function() {
      return this.findOne().orFail().exec();
    }
  });
  schema.static('findSomething', function() {
    return this.findOne().orFail().exec();
  });
  schema.static('findSomethingElse', function() {
    return this.findOne();
  });
}

type Test = { firstName: string; lastName: string };
type TestVirtuals = {
  fullName: string;
};
interface TestInstanceMethods {
  doSomething(this: TestDocument): string;
}
interface TestStaticMethods {
  findSomething(this: TestModel): Promise<TestDocument>;
}
type TestDocument = HydratedDocument<Test, TestVirtuals & TestInstanceMethods>;
type TestQuery = Query<any, TestDocument, TestQueryHelpers> & TestQueryHelpers;
interface TestQueryHelpers {
  whereSomething(this: TestQuery): this
}
type TestModel = Model<Test, TestQueryHelpers, TestInstanceMethods, TestVirtuals> & TestStaticMethods;
const testSchema = new Schema<Test, TestModel, TestInstanceMethods, TestQueryHelpers, TestVirtuals, TestStaticMethods>({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true }
});

function pluginGeneric(schema: Schema): void {
  schema.static('test', function() {
    return 0;
  });
}

testSchema.plugin(pluginVirtuals);
testSchema.plugin(pluginQueryHelpers);
testSchema.plugin(pluginMethods);
testSchema.plugin(pluginStatics);
testSchema.plugin(pluginGeneric);

const Foo = connection.model<Test, TestModel, TestQueryHelpers>('Test', testSchema);

async function registerPlugin(): Promise<void> {
  const test = await Foo.findOne().orFail();
  console.log(test.firstName);
  console.log(test.fullName);
  console.log(test.doSomething());

  const test2 = await Foo.findSomething();
  console.log(test2.firstName);
  console.log(test2.fullName);
  console.log(test2.doSomething());

  const test3 = await Foo.findOne().whereSomething().orFail();
  console.log(test3.firstName);
  console.log(test3.fullName);
  console.log(test3.doSomething());
}
