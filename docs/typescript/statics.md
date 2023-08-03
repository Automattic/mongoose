# Statics in TypeScript

To use Mongoose's automatic type inference to define types for your [statics](guide.html#statics) and [methods](guide.html#methods), you should define your methods and statics using the `methods` and `statics` schema options as follows.
Do **not** use `Schema.prototype.method()` and `Schema.prototype.static()`.

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
Mongoose [models](../models.html) do **not** have an explicit generic parameter for [statics](guide.html#statics).
If your model has statics, we recommend creating an interface that [extends](https://www.typescriptlang.org/docs/handbook/interfaces.html) Mongoose's `Model` interface as shown below.

```typescript
import { Model, Schema, model } from 'mongoose';

interface IUser {
  name: string;
}

interface UserModel extends Model<IUser> {
  myStaticMethod(): number;
}

const schema = new Schema<IUser, UserModel>({ name: String });
schema.static('myStaticMethod', function myStaticMethod() {
  return 42;
});

const User = model<IUser, UserModel>('User', schema);

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
