# Schemas in TypeScript

Mongoose [schemas](/docs/guide.html) are how you tell Mongoose what your documents look like.
Mongoose schemas are separate from TypeScript interfaces, so you need to define both a _document interface_ and a _schema_.

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

## Defining Middleware

The Mongoose `Schema` class in TypeScript has 3 generic parameters:

```typescript
class Schema<DocType = Document, M extends Model<DocType, any, any> = Model<any, any, any>, SchemaDefinitionType = undefined> extends events.EventEmitter {
  // ...
}
```

The first generic param, `DocType`, represents the type that Mongoose uses as `this` for document middleware.
For example:

```typescript
schema.pre('save', function(): void {
  console.log(this.name); // TypeScript knows that `this` is a `User` by default
});
```

## Checking Field Names

The 3rd generic param, `SchemaDefinitionType`, checks to make sure that every path in your schema is defined in your document interface.
For example, the below code will fail to compile because `emaill` is a path in the schema, but not in the `SchemaDefinitionType`.

```typescript
import { Schema, Model } from 'mongoose';

interface User {
  name: string;
  email: string;
  avatar?: string;
}

// Object literal may only specify known properties, but 'emaill' does not exist in type ...
// Did you mean to write 'email'?
const schema = new Schema<User, Model<User>, User>({
  name: { type: String, required: true },
  emaill: { type: String, required: true },
  avatar: String
});
```

However, Mongoose does **not ** check for paths that are in the document interface, but not in the schema.
For example, the below code compiles.

```typescript
import { Schema, Model } from 'mongoose';

interface User {
  name: string;
  email: string;
  avatar?: string;
  createdAt: number;
}

const schema = new Schema<User, Model<User>, User>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  avatar: String
});
```

This is because Mongoose has numerous features that add paths to your schema, like [timestamps](https://masteringjs.io/tutorials/mongoose/timestamps), [plugins](/docs/plugins.html), etc. without you explicitly putting these paths in the `Schema()` constructor.