import { Schema, model, Model, Document, Types } from 'mongoose';
import { expectAssignable, expectError, expectType } from 'tsd';
import { autoTypedModel } from './models.test';
import { autoTypedModelConnection } from './connection.test';
import { AutoTypedSchemaType } from './schema.test';

const Drink = model('Drink', new Schema({
  name: String
}));

const schema: Schema = new Schema({
  name: { type: 'String', required: true },
  address: new Schema({ city: { type: String, required: true } }),
  favoritDrink: {
    type: Schema.Types.ObjectId,
    ref: Drink
  }
});

interface ITestBase {
  name?: string;
}

interface ITest extends ITestBase, Document {}

const Test = model<ITest>('Test', schema);

void async function main() {
  const doc: ITest = await Test.findOne().orFail();

  expectType<Promise<ITest>>(doc.remove());
  expectType<void>(doc.remove({}, (err, doc) => {
    expectType<Error | null>(err);
    expectType<any>(doc);
  }));
  expectType<void>(doc.remove((err, doc) => {
    expectType<Error | null>(err);
    expectType<any>(doc);
  }));
}();


void async function run() {
  const user = new Test({ name: {}, address: {} });
  const error = user.validateSync();
  if (error != null) {
    const _error = error.errors.address;
  }
}();

(function() {
  const test = new Test();
  test.validate({ pathsToSkip: ['hello'] });
  test.validate({ pathsToSkip: 'name age' });
  test.validateSync({ pathsToSkip: ['name', 'age'] });
  test.validateSync({ pathsToSkip: 'name age' });
  test.validateSync({ pathsToSkip: 'name age', blub: 1 });
  const x = test.save();
  expectAssignable<Promise<ITest & { _id: any; }>>(test.save());
  expectAssignable<Promise<ITest & { _id: any; }>>(test.save({}));
  expectType<void>(test.save({}, (err, doc) => {
    expectType<Error | null>(err);
    expectAssignable<ITest & { _id: any; }>(doc);
  }));
  expectType<void>(test.save((err, doc) => {
    expectType<Error | null>(err);
    expectAssignable<ITest & { _id: any; }>(doc);
  }));
})();

function gh10526<U extends ITest>(arg1: Model<U>) {
  const t = new arg1({ name: 'hello' });
}

function testMethods(): void {
  interface IUser {
    first: string;
    last: string;
  }

  interface IUserMethods {
    fullName(): string;
  }

  type User = Model<IUser, {}, IUserMethods>;

  const schema = new Schema<IUser, User>({ first: String, last: String });
  schema.methods.fullName = function(): string {
    return this.first + ' ' + this.last;
  };
  const UserModel = model<IUser, User>('User', schema);

  const doc = new UserModel({ first: 'test', last: 'test' });
  expectType<string>(doc.fullName());
}

function testRequiredId(): void {
  // gh-10657
  interface IFoo {
    _id: string;
    label: string;
  }

  const FooSchema = new Schema<IFoo, Model<IFoo>, IFoo>({
    _id: String,
    label: { type: String }
  });

  const Foo: Model<IFoo> = model<IFoo>('Foo', FooSchema);

  type FooInput = {
    label: string;
  };

  type FooOutput = {
    _id: string;
    label: string;
  };

  const createFoo = async(foo: FooInput): Promise<FooOutput> => {
    return await Foo.create(foo);
  };
}

async function gh11117(): Promise<void> {
  interface Foo {
    someDate: Date;
    someId: Types.ObjectId;
    someNumber: number;
    someString: string;
  }
  const fooSchema = new Schema<Foo, Model<Foo>>({
    someDate: { required: true, type: Date },
    someId: { required: true, type: Schema.Types.ObjectId },
    someNumber: { required: true, type: Number },
    someString: { required: true, type: String }
  });

  const fooModel = model('foos', fooSchema);

  const items = await fooModel.create<Foo>([
    {
      someId: new Types.ObjectId(),
      someDate: new Date(),
      someNumber: 5,
      someString: 'test'
    }
  ]);
  const json = items[0].toJSON();
  expectType<Date>(json.someDate);
}

function gh11085(): void {
  interface User {
    username: string;
    email: string;
  }

  const userSchema = new Schema<User>({
    username: String,
    email: String
  });

  const UserModel = model('User', userSchema);

  const newUser = new UserModel();

  let _id: number;
  expectError(_id = newUser._id);
  const _id2: Types.ObjectId = newUser._id;
}

function gh11435() {
  interface Item {
    name: string;
  }
  const ItemSchema = new Schema<Item>({ name: String });

  ItemSchema.pre('validate', function preValidate() {
    expectType<Model<unknown>>(this.$model('Item1'));
  });
}

async function gh11598() {
  const doc = await Test.findOne().orFail();
  doc.populate('favoritDrink', undefined, model('temp', new Schema()));
}

function autoTypedDocument() {
  const AutoTypedModel = autoTypedModel();
  const AutoTypeModelInstance = new AutoTypedModel({ unExistProperty: 1, description: 2 });

  expectType<AutoTypedSchemaType['schema']['userName']>(AutoTypeModelInstance.userName);
  expectType<AutoTypedSchemaType['schema']['favoritDrink']>(AutoTypeModelInstance.favoritDrink);
  expectType<AutoTypedSchemaType['schema']['favoritColorMode']>(AutoTypeModelInstance.favoritColorMode);

  // Document-Methods-tests
  expectType<ReturnType<AutoTypedSchemaType['methods']['instanceFn']>>(new AutoTypedModel().instanceFn());

}

function autoTypedDocumentConnection() {
  const AutoTypedModel = autoTypedModelConnection();
  const AutoTypeModelInstance = new AutoTypedModel({ unExistProperty: 1, description: 2 });

  expectType<AutoTypedSchemaType['schema']['userName']>(AutoTypeModelInstance.userName);
  expectType<AutoTypedSchemaType['schema']['favoritDrink']>(AutoTypeModelInstance.favoritDrink);
  expectType<AutoTypedSchemaType['schema']['favoritColorMode']>(AutoTypeModelInstance.favoritColorMode);

  // Document-Methods-tests
  expectType<ReturnType<AutoTypedSchemaType['methods']['instanceFn']>>(new AutoTypedModel().instanceFn());

}

async function gh11960() {
  type DocumentType<T> = Document<any> & T;
  type SubDocumentType<T> = DocumentType<T> & Types.Subdocument;
  type ArraySubDocumentType<T> = DocumentType<T> & Types.ArraySubdocument;

  interface Nested {
    dummy?: string;
  }

  interface Parent {
    username?: string;
    map?: Map<string, string>;
    nested?: SubDocumentType<Nested>;
    nestedArray?: ArraySubDocumentType<Nested>[];
  }

  const NestedSchema = new Schema({
    dummy: { type: String }
  });

  const ParentSchema = new Schema({
    username: { type: String },
    map: { type: Map, of: String },
    nested: { type: NestedSchema },
    nestedArray: [{ type: NestedSchema }]
  });

  const ParentModel = model<DocumentType<Parent>>('Parent', ParentSchema);

  {
    const doc = new ParentModel({
      username: 'user1',
      map: { key1: 'value1', key2: 'value2' },
      nested: { dummy: 'hello' },
      nestedArray: [{ dummy: 'hello again' }]
    });

    expectType<Document<any, any, any> & Parent & { _id: Types.ObjectId }>(doc);
    expectType<Map<string, string> | undefined>(doc.map);
    doc.nested!.parent();
    doc.nestedArray?.[0].parentArray();
  }

  {
    const doc = await ParentModel.create({
      username: 'user1',
      map: { key1: 'value1', key2: 'value2' },
      nested: { dummy: 'hello' },
      nestedArray: [{ dummy: 'hello again' }]
    });

    expectType<Document<any, any, any> & Parent & { _id: Types.ObjectId }>(doc);
    expectType<Map<string, string> | undefined>(doc.map);
    doc.nested!.parent();
    doc.nestedArray?.[0].parentArray();
  }
}

function gh12290() {
  interface IUser{
    name: string;
    age: number;
  }
  const schema = new Schema<IUser>({
    name: String,
    age: Number
  });
  const User = model<IUser>('User', schema);
  const user = new User({ name: 'John', age: 30 });
  user.isDirectModified(['name', 'age']);
  user.isDirectModified('name age');
  user.isDirectModified('name');
}
