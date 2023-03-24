# Query Casting

The first parameter to [`Model.find()`](../api/model.html#model_Model-find), [`Query#find()`](../api/query.html#query_Query-find), [`Model.findOne()`](../api/model.html#model_Model-findOne), etc. is called `filter`.
In older content this parameter is sometimes called `query` or `conditions`. For example:

```acquit
[require:Cast Tutorial.*get and set]
```

When you execute the query using [`Query#exec()`](../api/query.html#query_Query-exec) or [`Query#then()`](../api/query.html#query_Query-then), Mongoose _casts_ the filter to match your schema.

```acquit
[require:Cast Tutorial.*cast values]
```

If Mongoose fails to cast the filter to your schema, your query will throw a `CastError`.

```acquit
[require:Cast Tutorial.*cast error]
```

## The `strictQuery` Option

By default, Mongoose does **not** cast filter properties that aren't in your schema.

```acquit
[require:Cast Tutorial.*not in schema]
```

You can configure this behavior using the [`strictQuery` option for schemas](../guide.html#strictQuery). This option is analogous to the [`strict` option](../guide.html#strict). Setting `strictQuery` to `true` removes non-schema properties from the filter:

```acquit
[require:Cast Tutorial.*strictQuery true]
```

To make Mongoose throw an error if your `filter` has a property that isn't in the schema, set `strictQuery` to `'throw'`:

```acquit
[require:Cast Tutorial.*strictQuery throw]
```

## Implicit `$in`

Because of schemas, Mongoose knows what types fields should be, so it can provide some neat syntactic sugar. For example, if you forget to put [`$in`](https://www.mongodb.com/docs/manual/reference/operator/query/in/) on a non-array field, Mongoose will add `$in` for you.

```acquit
[require:Cast Tutorial.*implicit in]
```
