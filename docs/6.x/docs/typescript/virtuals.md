# Virtuals in TypeScript

[Virtuals](../tutorials/virtuals.html) are computed properties: you can access virtuals on hydrated Mongoose documents, but virtuals are **not** stored in MongoDB.
Mongoose supports auto typed virtuals so you don't need to define additional typescript interface anymore but you are still able to do so.

## Automatically Inferred Types:

To make mongoose able to infer virtuals type, You have to define them in schema constructor as following:

```ts
import { Schema, Model, model } from 'mongoose';

const schema = new Schema(
  {
    firstName: String,
    lastName: String
  },
  {
    virtuals: {
      fullName: {
        get() {
          return `${this.firstName} ${this.lastName}`;
        }
        // virtual setter and options can be defined here as well.
      }
    }
  }
);
```

Note that Mongoose does **not** include virtuals in the returned type from `InferSchemaType`.
That is because `InferSchemaType` returns the "raw" document interface, which represents the structure of the data stored in MongoDB.

```ts
type User = InferSchemaType<typeof schema>;

const user: User = {};
// Property 'fullName' does not exist on type '{ firstName?: string | undefined; ... }'.
user.fullName;
```

However, Mongoose **does** add the virtuals to the model type.

```ts
const UserModel = model('User', schema);

const user = new UserModel({ firstName: 'foo' });
// Works
user.fullName;

// Here's how to get the hydrated document type
type UserDocument = ReturnType<(typeof UserModel)['hydrate']>;
```

## Set virtuals type manually:

You shouldn't define virtuals in your TypeScript [document interface](../typescript.html).
Instead, you should define a separate interface for your virtuals, and pass this interface to `Model` and `Schema`.

For example, suppose you have a `UserDoc` interface, and you want to define a `fullName` virtual.
Below is how you can define a separate `UserVirtuals` interface for `fullName`.

```ts
import { Schema, Model, model } from 'mongoose';

interface UserDoc {
  firstName: string;
  lastName: string;
}

interface UserVirtuals {
  fullName: string;
}

type UserModel = Model<UserDoc, {}, UserVirtuals>; // <-- add virtuals here...

const schema = new Schema<UserDoc, UserModel, UserVirtuals>({ // <-- and here
  firstName: String,
  lastName: String
});

schema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});
```

## Override the Type of `this` in Your Virtual

In case the value of `this` in your virtual is incorrect for some reason, you can always override it using the generic parameter in the `virtual()` function.

```ts
interface MyCustomUserDocumentType {
  firstName: string;
  lastName: string;
  myMethod(): string;
}

schema.virtual<MyCustomUserDocumentType>('fullName').get(function() {
  return this.method(); // returns string
});
```
