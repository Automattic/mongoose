# Statics in TypeScript

To use Mongoose's automatic type inference to define types for your [statics](../guide.html#statics) and [methods](../guide.html#methods), you should define your methods and statics using the `methods` and `statics` schema options as follows.
Do **not** use the `Schema.prototype.method()` and `Schema.prototype.static()` functions, because Mongoose's automatic type inference system cannot detect methods and statics defined using those functions.

```typescript
const userSchema = new mongoose.Schema(
  { name: { type: String, required: true } },
  {
    methods: {
      updateName(name: string) {
        this.name = name;
        return this.save();
      }
    },
    statics: {
      createWithName(name: string) {
        return this.create({ name });
      }
    }
  }
);
const UserModel = mongoose.model('User', userSchema);

const doc = new UserModel({ name: 'test' });
// Compiles correctly
doc.updateName('foo');
// Compiles correctly
UserModel.createWithName('bar');
```

## With Generics

We recommend using Mongoose's automatic type inference where possible, but you can use `Schema` and `Model` generics to set up type inference for your statics and methods.
Mongoose [models](../models.html) do **not** have an explicit generic parameter for [statics](../guide.html#statics).
If your model has statics, we recommend creating an interface that [extends](https://www.typescriptlang.org/docs/handbook/interfaces.html) Mongoose's `Model` interface as shown below.

```typescript
import { Model, Schema, model } from 'mongoose';

interface IUser {
  name: string;
}

interface UserModelType extends Model<IUser> {
  myStaticMethod(): number;
}

const schema = new Schema<IUser, UserModelType>({ name: String });
schema.static('myStaticMethod', function myStaticMethod() {
  return 42;
});

const User = model<IUser, UserModelType>('User', schema);

const answer: number = User.myStaticMethod(); // 42
```

You should pass methods as the 3rd generic param to the `Schema` constructor as follows.

```typescript
import { Model, Schema, model } from 'mongoose';

interface IUser {
  name: string;
}

interface UserMethods {
  updateName(name: string): Promise<any>;
}

const schema = new Schema<IUser, Model<IUser>, UserMethods>({ name: String });
schema.method('updateName', function updateName(name) {
  this.name = name;
  return this.save();
});

const User = model('User', schema);
const doc = new User({ name: 'test' });
// Compiles correctly
doc.updateName('foo');
```

## Using `loadClass()` with TypeScript

Mongoose supports applying ES6 classes to a schema using [`schema.loadClass()`](../api/schema.html#Schema.prototype.loadClass()) as an alternative to defining statics and methods in your schema.
When using TypeScript, there are a few important typing details to understand.

### Basic Usage

`loadClass()` copies static methods, instance methods, and ES getters/setters from the class onto the schema.

```ts
class MyClass {
  myMethod() {
    return 42;
  }

  static myStatic() {
    return 42;
  }

  get myVirtual() {
    return 42;
  }
}

const schema = new Schema({ property1: String });
schema.loadClass(MyClass);
```

Mongoose does not automatically update TypeScript types for class members. To get full type support, you must manually define types using Mongoose's [Model](../api/model.html) and [HydratedDocument](../typescript.html) generics.

```ts
// 1. Define an interface for the raw document data
interface RawDocType {
  property1: string;
}

// 2. Define the Model type
// This includes the raw data, query helpers, instance methods, virtuals, and statics.
type MyCombinedModel = Model<
  RawDocType, 
  {}, 
  Pick<MyClass, 'myMethod'>, 
  Pick<MyClass, 'myVirtual'> 
> & Pick<typeof MyClass, 'myStatic'>; 

// 3. Define the Document type
type MyCombinedDocument = HydratedDocument<
  RawDocType,
  Pick<MyClass, 'myMethod'>, 
  {}, 
  Pick<MyClass, 'myVirtual'> 
>;

// 4. Create the Mongoose model
const MyModel = model<RawDocType, MyCombinedModel>(
  'MyClass',
  schema
);

MyModel.myStatic();
const doc = new MyModel();
doc.myMethod();
doc.myVirtual;
doc.property1;     
```

### Typing `this` Inside Methods

You can annotate `this` in methods to enable full safety, using the [Model](../api/model.html) and [HydratedDocument](../typescript.html) types you defined.
Note that this must be done for **each method individually**; it is not possible to set a `this` type for the entire class at once.

```ts
class MyClass {
  // Instance method typed with correct `this` type
  myMethod(this: MyCombinedDocument) {
    return this.property1;
  }

  // Static method typed with correct `this` type
  static myStatic(this: MyCombinedModel) {
    return 42;
  }
}
```

### Getters / Setters Limitation

TypeScript currently does **not** allow `this` parameters on getters/setters:

```ts
class MyClass {
  // error TS2784: 'this' parameters are not allowed in getters
  get myVirtual(this: MyCombinedDocument) {
    return this.property1;
  }
}
```

This is a TypeScript limitation. See: [TypeScript issue #52923](https://github.com/microsoft/TypeScript/issues/52923)

As a workaround, you can cast `this` to the document type inside your getter:

```ts
get myVirtual() {
  // Workaround: cast 'this' to your document type
  const self = this as MyCombinedDocument;
  return `Name: ${self.property1}`;
}
```

### Full Example Code

```ts
import { Model, Schema, model, HydratedDocument } from 'mongoose';

interface RawDocType {
  property1: string;
}

class MyClass {
  myMethod(this: MyCombinedDocument) {
    return this.property1;
  }

  static myStatic(this: MyCombinedModel) {
    return 42;
  }

  get myVirtual() {
    const self = this as MyCombinedDocument;
    return `Hello ${self.property1}`;
  }
}

const schema = new Schema<RawDocType>({ property1: String });
schema.loadClass(MyClass);

type MyCombinedModel = Model<
  RawDocType,
  {},
  Pick<MyClass, 'myMethod'>,
  Pick<MyClass, 'myVirtual'>
> & Pick<typeof MyClass, 'myStatic'>;

type MyCombinedDocument = HydratedDocument<
  RawDocType,
  Pick<MyClass, 'myMethod'>,
  {},
  Pick<MyClass, 'myVirtual'>
>;

const MyModel = model<RawDocType, MyCombinedModel>(
  'MyClass',
  schema
);

const doc = new MyModel({ property1: 'world' });
doc.myMethod(); 
MyModel.myStatic(); 
console.log(doc.myVirtual); 
```

### When Should I Use `loadClass()`?

`loadClass()` is useful for defining methods and statics in classes.
If you have a strong preference for classes, you can use `loadClass()`; however, we recommend defining `statics` and `methods` in schema options as described in the first section.

The major downside of `loadClass()` in TypeScript is that it requires manual TypeScript types.
If you want better type inference, you can use schema options [`methods`](../guide.html#methods) and [`statics`](../guide.html#statics).
