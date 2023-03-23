# TypeScript Support

Mongoose introduced [officially supported TypeScript bindings in v5.11.0](https://thecodebarbarian.com/working-with-mongoose-in-typescript.html).
Mongoose's `index.d.ts` file supports a wide variety of syntaxes and strives to be compatible with `@types/mongoose` where possible.
This guide describes Mongoose's recommended approach to working with Mongoose in TypeScript.

## Creating Your First Document

To get started with Mongoose in TypeScript, you need to: 

1. Create an interface representing a document in MongoDB.
2. Create a [Schema](guide.html) corresponding to the document interface.
3. Create a Model.
4. [Connect to MongoDB](connections.html).

```typescript
import { Schema, model, connect } from 'mongoose';

// 1. Create an interface representing a document in MongoDB.
interface IUser {
  name: string;
  email: string;
  avatar?: string;
}

// 2. Create a Schema corresponding to the document interface.
const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  avatar: String
});

// 3. Create a Model.
const User = model<IUser>('User', userSchema);

run().catch(err => console.log(err));

async function run() {
  // 4. Connect to MongoDB
  await connect('mongodb://127.0.0.1:27017/test');

  const user = new User({
    name: 'Bill',
    email: 'bill@initech.com',
    avatar: 'https://i.imgur.com/dM7Thhn.png'
  });
  await user.save();

  console.log(user.email); // 'bill@initech.com'
}
```

You as the developer are responsible for ensuring that your document interface lines up with your Mongoose schema.
For example, Mongoose won't report an error if `email` is `required` in your Mongoose schema but optional in your document interface.

The `User()` constructor returns an instance of `HydratedDocument<IUser>`.
`IUser` is a _document interface_, it represents the raw object structure that `IUser` objects look like in MongoDB.
`HydratedDocument<IUser>` represents a hydrated Mongoose document, with methods, virtuals, and other Mongoose-specific features.

```ts
import { HydratedDocument } from 'mongoose';

const user: HydratedDocument<IUser> = new User({
  name: 'Bill',
  email: 'bill@initech.com',
  avatar: 'https://i.imgur.com/dM7Thhn.png'
});
```

## ObjectIds and Other Mongoose Types

To define a property of type `ObjectId`, you should use `Types.ObjectId` in the TypeScript document interface. You should use `'ObjectId'` or `Schema.Types.ObjectId` in your schema definition.

```ts
import { Schema, Types } from 'mongoose';

// 1. Create an interface representing a document in MongoDB.
interface IUser {
  name: string;
  email: string;
  // Use `Types.ObjectId` in document interface...
  organization: Types.ObjectId;
}

// 2. Create a Schema corresponding to the document interface.
const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  // And `Schema.Types.ObjectId` in the schema definition.
  organization: { type: Schema.Types.ObjectId, ref: 'Organization' }
});
```

That's because `Schema.Types.ObjectId` is a [class that inherits from SchemaType](schematypes.html), **not** the class you use to create a new MongoDB ObjectId.

## Using Custom Bindings

If Mongoose's built-in `index.d.ts` file does not work for you, you can remove it in a postinstall script in your `package.json` as shown below.
However, before you do, please [open an issue on Mongoose's GitHub page](https://github.com/Automattic/mongoose/issues/new) and describe the issue you're experiencing.

```
{
  "postinstall": "rm ./node_modules/mongoose/index.d.ts"
}
```

## Next Up

Now that you've seen the basics of how to use Mongoose in TypeScript, let's take a look at [statics in TypeScript](typescript/statics-and-methods.html).
