# Statics and Methods in TypeScript

You can define instance methods and static functions on Mongoose models.
With a little extra configuration, you can also register methods and statics in TypeScript.

## Methods

To define an [instance method](../guide.html#methods) in TypeScript, create a new interface representing your instance methods.
You need to pass that interface as the 3rd generic parameter to the `Schema` constructor **and** as the 3rd generic parameter to `Model` as shown below.

```typescript
import { Model, Schema, model } from 'mongoose';

interface IUser {
  firstName: string;
  lastName: string;
}

// Put all user instance methods in this interface:
interface IUserMethods {
  fullName(): string;
}

// Create a new Model type that knows about IUserMethods...
type UserModel = Model<IUser, {}, IUserMethods>;

// And a schema that knows about IUserMethods
const schema = new Schema<IUser, UserModel, IUserMethods>({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true }
});
schema.method('fullName', function fullName() {
  return this.firstName + ' ' + this.lastName;
});

const User = model<IUser, UserModel>('User', schema);

const user = new User({ firstName: 'Jean-Luc', lastName: 'Picard' });
const fullName: string = user.fullName(); // 'Jean-Luc Picard'
```

## Statics

Mongoose [models](../models.html) do **not** have an explicit generic parameter for [statics](../guide.html#statics).
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

Mongoose does support auto typed static functions now that it is supplied in schema options.
Statics functions can be defined as following:

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

## Both Methods and Statics

Below is how you can define a model that has both methods and statics.

```typescript
import { Model, Schema, HydratedDocument, model } from 'mongoose';

interface IUser {
  firstName: string;
  lastName: string;
}

interface IUserMethods {
  fullName(): string;
}

interface UserModel extends Model<IUser, {}, IUserMethods> {
  createWithFullName(name: string): Promise<HydratedDocument<IUser, IUserMethods>>;
}

const schema = new Schema<IUser, UserModel, IUserMethods>({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true }
});
schema.static('createWithFullName', function createWithFullName(name: string) {
  const [firstName, lastName] = name.split(' ');
  return this.create({ firstName, lastName });
});
schema.method('fullName', function fullName(): string {
  return this.firstName + ' ' + this.lastName;
});

const User = model<IUser, UserModel>('User', schema);

User.createWithFullName('Jean-Luc Picard').then(doc => {
  console.log(doc.firstName); // 'Jean-Luc'
  doc.fullName(); // 'Jean-Luc Picard'
});
```
