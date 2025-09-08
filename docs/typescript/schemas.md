# Schemas in TypeScript

Mongoose [schemas](../guide.html) are how you tell Mongoose what your documents look like.
Mongoose schemas are separate from TypeScript interfaces, so you need to either define both a *raw document interface* and a *schema*; or rely on Mongoose to automatically infer the type from the schema definition.

## Automatic type inference

Mongoose can automatically infer the document type from your schema definition as follows.
We recommend relying on automatic type inference when defining schemas and models.

```typescript
import { Schema, model } from 'mongoose';
// Schema
const schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  avatar: String
});

// `UserModel` will have `name: string`, etc.
const UserModel = mongoose.model('User', schema);

const doc = new UserModel({ name: 'test', email: 'test' });
doc.name; // string
doc.email; // string
doc.avatar; // string | undefined | null
```

There are a few caveats for using automatic type inference:

1. You need to set `strictNullChecks: true` or `strict: true` in your `tsconfig.json`. Or, if you're setting flags at the command line, `--strictNullChecks` or `--strict`. There are [known issues](https://github.com/Automattic/mongoose/issues/12420) with automatic type inference with strict mode disabled.
2. You need to define your schema in the `new Schema()` call. Don't assign your schema definition to a temporary variable. Doing something like `const schemaDefinition = { name: String }; const schema = new Schema(schemaDefinition);` will not work.
3. Mongoose adds `createdAt` and `updatedAt` to your schema if you specify the `timestamps` option in your schema.

If you must define your schema separately, use [as const](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html#const-assertions) (`const schemaDefinition = { ... } as const;`) to prevent *type widening*. TypeScript will automatically widen types like `required: false` to `required: boolean`, which will cause Mongoose to assume the field is required. Using `as const` forces TypeScript to retain these types.

If you need to explicitly get the raw document type (the value returned from `doc.toObject()`, `await Model.findOne().lean()`, etc.) from your schema definition, you can use Mongoose's `inferRawDocType` helper as follows:

```ts
import { Schema, InferRawDocType, model } from 'mongoose';

const schemaDefinition = {
  name: { type: String, required: true },
  email: { type: String, required: true },
  avatar: String
} as const;
const schema = new Schema(schemaDefinition);

const UserModel = model('User', schema);
const doc = new UserModel({ name: 'test', email: 'test' });

type RawUserDocument = InferRawDocType<typeof schemaDefinition>;

useRawDoc(doc.toObject());

function useRawDoc(doc: RawUserDocument) {
  // ...
}

```

If automatic type inference doesn't work for you, you can always fall back to document interface definitions.

## Separate document interface definition

If automatic type inference doesn't work for you, you can define a separate raw document interface as follows.

```typescript
import { Schema } from 'mongoose';

// Raw document interface. Contains the data type as it will be stored
// in MongoDB. So you can ObjectId, Buffer, and other custom primitive data types.
// But no Mongoose document arrays or subdocuments.
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

By default, Mongoose does **not** check if your raw document interface lines up with your schema.
For example, the above code won't throw an error if `email` is optional in the document interface, but `required` in `schema`.

## Generic parameters

The Mongoose `Schema` class in TypeScript has 9 [generic parameters](https://www.typescriptlang.org/docs/handbook/2/generics.html):

* `RawDocType` - An interface describing how the data is saved in MongoDB
* `TModelType` - The Mongoose model type. Can be omitted if there are no query helpers or instance methods to be defined.
  * default: `Model<DocType, any, any>`
* `TInstanceMethods` - An interface containing the methods for the schema.
  * default: `{}`
* `TQueryHelpers` - An interface containing query helpers defined on the schema. Defaults to `{}`.
* `TVirtuals` - An interface containing virtuals defined on the schema. Defaults to `{}`
* `TStaticMethods` - An interface containing methods on a model. Defaults to `{}`
* `TSchemaOptions` - The type passed as the 2nd option to `Schema()` constructor. Defaults to `DefaultSchemaOptions`.
* `DocType` - The inferred document type from the schema.
* `THydratedDocumentType` - The hydrated document type. This is the default return type for `await Model.findOne()`, `Model.hydrate()`, etc.

<details>
  <summary>View TypeScript definition</summary>

  ```typescript
  export class Schema<
    RawDocType = any,
    TModelType = Model<RawDocType, any, any, any>,
    TInstanceMethods = {},
    TQueryHelpers = {},
    TVirtuals = {},
    TStaticMethods = {},
    TSchemaOptions = DefaultSchemaOptions,
    DocType = ...,
    THydratedDocumentType = HydratedDocument<FlatRecord<DocType>, TVirtuals & TInstanceMethods>
  >
    extends events.EventEmitter {
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

When you define an array in a document interface, we recommend using vanilla JavaScript arrays, **not** Mongoose's `Types.Array` type or `Types.DocumentArray` type.
Instead, use the `THydratedDocumentType` generic for models and schemas to define that the hydrated document type has paths of type `Types.Array` and `Types.DocumentArray`.

```typescript
import mongoose from 'mongoose'
const { Schema } = mongoose;

interface IOrder {
  tags: Array<{ name: string }>
}

// Define a HydratedDocumentType that describes what type Mongoose should use
// for fully hydrated docs returned from `findOne()`, etc.
type OrderHydratedDocument = mongoose.HydratedDocument<
  IOrder,
  { tags: mongoose.HydratedArraySubdocument<{ name: string }> }
>;
type OrderModelType = mongoose.Model<
  IOrder,
  {},
  {},
  {},
  OrderHydratedDocument // THydratedDocumentType
>;

const orderSchema = new mongoose.Schema<
  IOrder,
  OrderModelType,
  {}, // methods
  {}, // query helpers
  {}, // virtuals
  {}, // statics
  mongoose.DefaultSchemaOptions, // schema options
  IOrder, // doctype
  OrderHydratedDocument // THydratedDocumentType
>({
  tags: [{ name: { type: String, required: true } }]
});
const OrderModel = mongoose.model<IOrder, OrderModelType>('Order', orderSchema);

// Demonstrating return types from OrderModel
const doc = new OrderModel({ tags: [{ name: 'test' }] });

doc.tags; // mongoose.Types.DocumentArray<{ name: string }>
doc.toObject().tags; // Array<{ name: string }>

async function run() {
  const docFromDb = await OrderModel.findOne().orFail();
  docFromDb.tags; // mongoose.Types.DocumentArray<{ name: string }>

  const leanDoc = await OrderModel.findOne().orFail().lean();
  leanDoc.tags; // Array<{ name: string }>
};
```

Use `HydratedArraySubdocument<RawDocType>` for the type of array subdocuments, and `HydratedSingleSubdocument<RawDocType>` for single subdocuments.

If you are not using [schema methods](../guide.html#methods), middleware, or [virtuals](../tutorials/virtuals.html), you can omit the last 7 generic parameters to `Schema()` and just define your schema using  `new mongoose.Schema<IOrder, OrderModelType>(...)`.
The THydratedDocumentType parameter for schemas is primarily for setting the value of `this` on methods and virtuals.
