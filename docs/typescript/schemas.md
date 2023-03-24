# Schemas in TypeScript

Mongoose [schemas](../guide.html) are how you tell Mongoose what your documents look like.
Mongoose schemas are separate from TypeScript interfaces, so you need to either define both a _document interface_ and a _schema_; or rely on Mongoose to automatically infer the type from the schema definition.

## Separate document interface definition

```typescript
import { Schema } from 'mongoose';

// Document interface
interface User {
  name: string;
  email: string;
  avatar?: string;
}

// Schema
const schema = new Schema<User>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  avatar: String
});
```

By default, Mongoose does **not** check if your document interface lines up with your schema.
For example, the above code won't throw an error if `email` is optional in the document interface, but `required` in `schema`.

## Automatic type inference

Mongoose can also automatically infer the document type from your schema definition as follows.

```typescript
import { Schema, InferSchemaType } from 'mongoose';

// Document interface
// No need to define TS interface any more.
// interface User {
//   name: string;
//   email: string;
//   avatar?: string;
// }

// Schema
const schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  avatar: String
});

type User = InferSchemaType<typeof schema>;
// InferSchemaType will determine the type as follows:
// type User = {
//   name: string;
//   email: string;
//   avatar?: string;
// }

// `UserModel` will have `name: string`, etc.
const UserModel = mongoose.model('User', schema);
```

There are a few caveats for using automatic type inference:

1. You need to set `strictNullChecks: true` or `strict: true` in your `tsconfig.json`. Or, if you're setting flags at the command line, `--strictNullChecks` or `--strict`. There are [known issues](https://github.com/Automattic/mongoose/issues/12420) with automatic type inference with strict mode disabled.
2. You need to define your schema in the `new Schema()` call. Don't assign your schema definition to a temporary variable. Doing something like `const schemaDefinition = { name: String }; const schema = new Schema(schemaDefinition);` will not work.
3. Mongoose adds `createdAt` and `updatedAt` to your schema if you specify the `timestamps` option in your schema, _except_ if you also specify `methods`, `virtuals`, or `statics`. There is a [known issue](https://github.com/Automattic/mongoose/issues/12807) with type inference with timestamps and methods/virtuals/statics options. If you use methods, virtuals, and statics, you're responsible for adding `createdAt` and `updatedAt` to your schema definition.

If automatic type inference doesn't work for you, you can always fall back to document interface definitions.

## Generic parameters

The Mongoose `Schema` class in TypeScript has 4 [generic parameters](https://www.typescriptlang.org/docs/handbook/2/generics.html):

- `DocType` - An interface descibing how the data is saved in MongoDB
- `M` - The Mongoose model type. Can be omitted if there are no query helpers or instance methods to be defined.
  - default: `Model<DocType, any, any>`
- `TInstanceMethods` - An interface containing the methods for the schema.
  - default: `{}`
- `TQueryHelpers` - An interface containing query helpers defined on the schema. Defaults to `{}`.

<details>
  <summary>View TypeScript definition</summary>
    
  ```typescript
  class Schema<DocType = any, M = Model<DocType, any, any>, TInstanceMethods = {}, TQueryHelpers = {}> extends events.EventEmitter {
    // ...
  }
  ```
  
</details>

The first generic param, `DocType`, represents the type of documents that Mongoose will store in MongoDB.
Mongoose wraps `DocType` in a Mongoose document for cases like the `this` parameter to document middleware.
For example:

```typescript
schema.pre('save', function(): void {
  console.log(this.name); // TypeScript knows that `this` is a `mongoose.Document & User` by default
});
```

The second generic param, `M`, is the model used with the schema. Mongoose uses the `M` type in model middleware defined in the schema.

The third generic param, `TInstanceMethods` is used to add types for instance methods defined in the schema.

The 4th param, `TQueryHelpers`, is used to add types for [chainable query helpers](query-helpers.html).

## Schema vs Interface fields

Mongoose checks to make sure that every path in your schema is defined in your document interface.

For example, the below code will fail to compile because `email` is a path in the schema, but not in the `DocType` interface.

```typescript
import { Schema, Model } from 'mongoose';

interface User {
  name: string;
  email: string;
  avatar?: string;
}

// Object literal may only specify known properties, but 'emaill' does not exist in type ...
// Did you mean to write 'email'?
const schema = new Schema<User>({
  name: { type: String, required: true },
  emaill: { type: String, required: true },
  avatar: String
});
```

However, Mongoose does **not** check for paths that exist in the document interface, but not in the schema.
For example, the below code compiles.

```typescript
import { Schema, Model } from 'mongoose';

interface User {
  name: string;
  email: string;
  avatar?: string;
  createdAt: number;
}

const schema = new Schema<User, Model<User>>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  avatar: String
});
```

This is because Mongoose has numerous features that add paths to your schema that should be included in the `DocType` interface without you explicitly putting these paths in the `Schema()` constructor. For example, [timestamps](https://masteringjs.io/tutorials/mongoose/timestamps) and [plugins](../plugins.html).

## Arrays

When you define an array in a document interface, we recommend using Mongoose's `Types.Array` type for primitive arrays or `Types.DocumentArray` for arrays of documents.

```typescript
import { Schema, Model, Types } from 'mongoose';

interface BlogPost {
  _id: Types.ObjectId;
  title: string;
}

interface User {
  tags: Types.Array<string>;
  blogPosts: Types.DocumentArray<BlogPost>;
}

const schema = new Schema<User, Model<User>>({
  tags: [String],
  blogPosts: [{ title: String }]
});
```

Using `Types.DocumentArray` is helpful when dealing with defaults.
For example, `BlogPost` has an `_id` property that Mongoose will set by default.
If you use `Types.DocumentArray` in the above case, you'll be able to `push()` a subdocument without an `_id`.

```typescript
const user = new User({ blogPosts: [] });

user.blogPosts.push({ title: 'test' }); // Would not work if you did `blogPosts: BlogPost[]`
```
