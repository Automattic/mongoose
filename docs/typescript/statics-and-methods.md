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

Mongoose supports applying ES6 classes to a schema using `schema.loadClass()`.
When using TypeScript, there are a few important typing details to understand.

```ts
import { Schema, Model, model, Document } from 'mongoose';
```

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

type MyCombined = MySchema & MyClass;

type MyCombinedModel = Model<MyCombined> & typeof MyClass;
type MyCombinedDocument = Document & MyCombined;

const MyModel = model<MyCombinedDocument, MyCombinedModel>(
  'MyClass',
  schema as any
);
```

```ts
MyModel.myStatic();    // static
const doc = new MyModel();
doc.myMethod();        // instance
doc.myVirtual;         // getter
doc.property1;         // schema prop
```

---

## Typing `this` Inside Methods

You can annotate `this` in methods to enable full safety.

```ts
class MyClass {
  myMethod(this: MyCombinedDocument) {
    return this.property1;
  }

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
See: [https://github.com/microsoft/TypeScript/issues/52923](https://github.com/microsoft/TypeScript/issues/52923)

---

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

---

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

---

## Recommended Pattern

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

---

## When Should I Use `loadClass()`?

`loadClass()` is useful when organizing logic in ES6 classes.

However:
✅ works fine
⚠ requires manual TS merging
⚠ methods lost in `toObject()` / `toJSON()` / `lean()`

If you want better type inference, `methods` & `statics` on schema are recommended.

---

