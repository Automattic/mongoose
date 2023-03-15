# Statics in TypeScript

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

Mongoose does support auto typed static functions that it are supplied in schema options.
Static functions can be defined by:

```typescript
import { Schema, model } from 'mongoose';

const schema = new Schema(
  { name: String },
  {
    statics: {
      myStaticMethod() {
        return 42;
      }
    }
  }
);

const User = model('User', schema);

const answer = User.myStaticMethod(); // 42
```
