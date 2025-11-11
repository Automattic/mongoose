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

# Using `loadClass()` with TypeScript

Mongoose supports applying ES6 classes to a schema using [`schema.loadClass()`](../api/schema.html#Schema.prototype.loadClass()).
When using TypeScript, there are a few important typing details to understand.

## Basic Usage

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

Mongoose does **not** automatically update TypeScript types for class members.
To get full type support, you must manually merge types.

```ts
interface MySchema {
  property1: string;
}

// `loadClass()` does NOT update TS types automatically.
// So we must manually combine schema fields + class members.
type MyCombined = MySchema & MyClass;

// The model type must include statics from the class
type MyCombinedModel = Model<MyCombined> & typeof MyClass;

// A document must combine Mongoose Document + class + schema
type MyCombinedDocument = Document & MyCombined;

// Cast schema to satisfy TypeScript
const MyModel = model<MyCombinedDocument, MyCombinedModel>(
  'MyClass',
  schema as any
);

MyModel.myStatic();    
const doc = new MyModel();
doc.myMethod();        
doc.myVirtual;         
doc.property1;         
```

## Typing `this` Inside Methods

You can annotate `this` in methods to enable full safety.
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
  // error TS2784
  get myVirtual(this: MyCombinedDocument) {
    return this.property1;
  }
}
```

This is a TypeScript limitation.
See: [TypeScript issue #52923](https://github.com/microsoft/TypeScript/issues/52923)

As a workaround, you can cast `this` to the document type inside your getter:

```ts
get myVirtual() {
  // Workaround: cast 'this' to your document type
  const self = this as MyCombinedDocument;
  return `Name: ${self.property1}`;
}
```

## `toObject()` / `toJSON()` Caveat

`loadClass()` attaches methods at runtime.
However, `toObject()` and `toJSON()` return **plain JavaScript objects** without these methods.

```ts
const doc = new MyModel({ property1: 'test' });
const pojo = doc.toObject();
```

Runtime:

```ts
pojo.myMethod(); // runtime error
```

TypeScript:

```ts
pojo.myMethod; // compiles (unsafe)
```

This is a known limitation:
TS cannot detect when class methods are dropped.

## Limitations

| Behavior                                       | Supported |
| ---------------------------------------------- | --------- |
| Copy instance / static methods                 | ✅         |
| Copy getters/setters                           | ✅         |
| Automatic TS merging                           | ❌         |
| `this` typing in methods                       | ✅         |
| `this` typing in getters/setters               | ❌         |
| Methods preserved in `toObject()` / `toJSON()` | ❌         |
| Methods preserved with `.lean()`               | ❌         |

## Full Example Code

```ts
interface MySchema {
  property1: string;
}

class MyClass {
  myMethod(this: MyCombinedDocument) {
    return this.property1;
  }
  static myStatic(this: MyCombinedModel) {
    return 42;
  }
}

const schema = new Schema<MySchema>({ property1: String });
schema.loadClass(MyClass);

type MyCombined = MySchema & MyClass;
type MyCombinedModel = Model<MyCombined> & typeof MyClass;
type MyCombinedDocument = Document & MyCombined;

const MyModel = model<MyCombinedDocument, MyCombinedModel>(
  'MyClass',
  schema as any
);
```

## When Should I Use `loadClass()`?

`loadClass()` is useful when organizing logic in ES6 classes.

However:
✅ works fine
⚠ requires manual TS merging
⚠ methods lost in `toObject()` / `toJSON()` / `lean()`

If you want better type inference, [`methods`](../guide.html#methods) & [`statics`](../guide.html#statics) on schema are recommended.

---
