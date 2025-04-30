# Queries in TypeScript

Mongoose's [Query class](../api/query.html) is a chainable query builder that represents a MongoDB query.
When you call `find()`, `findOne()`, `updateOne()`, `findOneAndUpdate()`, etc. on a model, Mongoose will return a Query instance.
Queries have a `.then()` function that returns a Promise, so you can use them with `await`.

In TypeScript, the Query class takes the following generic parameters:

```ts
class Query<
  ResultType, // The type of the result of the query, like `DocType[]`
  DocType, // The hydrated document type of the query's associated model
  THelpers = {}, // Query helpers
  RawDocType = unknown, // The "lean" document type of the query's associated model
  QueryOp = 'find', // The operation that will be executed, like 'find', 'findOne', 'updateOne', etc.
  TDocOverrides = Record<string, never> // Methods and virtuals on the hydrated document
>
```

## Using `lean()` in TypeScript

The [`lean()` method](../tutorials/lean.html) tells Mongoose to skip [hydrating](../api/model.html#model_Model-hydrate) the result documents, making queries faster and more memory efficient.
`lean()` comes with some caveats in TypeScript when working with the query `transform()` function.
In general, we recommend calling `lean()` before using the `transform()` function to ensure accurate types.

```ts
// Put `lean()` **before** `transform()` in TypeScript because `transform` modifies the query ResultType into a shape
// that `lean()` does not know how to handle.
const result = await ProjectModel
  .find()
  .lean()
  .transform((docs) => new Map(docs.map((doc) => [doc._id.toString(), doc])));

// Do **not** do the following
const result = await ProjectModel
  .find()
  .transform((docs) => new Map(docs.map((doc) => [doc._id.toString(), doc])))
  .lean();
```

In general, if you're having trouble with `lean()` inferring the correct type, you can try moving `lean()` earlier in the query chain.
