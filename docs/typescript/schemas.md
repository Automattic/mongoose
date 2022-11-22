# Schemas in TypeScript

Mongoose [schemas](../guide.html) are how you tell Mongoose what your documents look like.
Mongoose schemas are separate from TypeScript interfaces, so you need to define both a _document interface_ and a _schema_ until V6.3.1.
Mongoose supports auto typed schemas so you don't need to define additional typescript interface anymore but you are still able to do so.
Mongoose provides a `InferSchemaType`, which infers the type of the auto typed schema document when needed.

`Until mongoose V6.3.1:`

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

`another approach:`

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


```

By default, Mongoose does **not** check if your document interface lines up with your schema.
For example, the above code won't throw an error if `email` is optional in the document interface, but `required` in `schema`.

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
schema.pre('save', function (): void {
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
  avatar: String,
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
  blogPosts: [{ title: String }],
});
```

Using `Types.DocumentArray` is helpful when dealing with defaults.
For example, `BlogPost` has an `_id` property that Mongoose will set by default.
If you use `Types.DocumentArray` in the above case, you'll be able to `push()` a subdocument without an `_id`.

```typescript
const user = new User({ blogPosts: [] });

user.blogPosts.push({ title: 'test' }); // Would not work if you did `blogPosts: BlogPost[]`
```
