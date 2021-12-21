## Validation

Before we get into the specifics of validation syntax, please keep the following rules in mind:

- Validation is defined in the [SchemaType](./schematypes.html)
- Validation is [middleware](./middleware.html). Mongoose registers validation as a `pre('save')` hook on every schema by default.
- You can disable automatic validation before save by setting the [validateBeforeSave](./guide.html#validateBeforeSave) option
- You can manually run validation using `doc.validate(callback)` or `doc.validateSync()`
- You can manually mark a field as invalid (causing validation to fail) by using [`doc.invalidate(...)`](./api.html#document_Document-invalidate)
- Validators are not run on undefined values. The only exception is the [`required` validator](./api.html#schematype_SchemaType-required).
- Validation is asynchronously recursive; when you call [Model#save](./api.html#model_Model-save), sub-document validation is executed as well. If an error occurs, your [Model#save](./api.html#model_Model-save) callback receives it
- Validation is customizable

```javascript
[require:Validation$]
```

### Built-in Validators

Mongoose has several built-in validators.

- All [SchemaTypes](./schematypes.html) have the built-in [required](./api.html#schematype_SchemaType-required) validator. The required validator uses the [SchemaType's `checkRequired()` function](./api.html#schematype_SchemaType-checkRequired) to determine if the value satisfies the required validator.
- [Numbers](./api.html#schema-number-js) have [`min` and `max`](./schematypes.html#number-validators) validators.
- [Strings](./api.html#schema-string-js) have [`enum`, `match`, `minLength`, and `maxLength`](./schematypes.html#string-validators) validators.

Each of the validator links above provide more information about how to enable them and customize their error messages.

```javascript
[require:Built-in Validators]
```

### Custom Error Messages

You can configure the error message for individual validators in your schema. There are two equivalent
ways to set the validator error message:

- Array syntax: `min: [6, 'Must be at least 6, got {VALUE}']`
- Object syntax: `enum: { values: ['Coffee', 'Tea'], message: '{VALUE} is not supported' }`

Mongoose also supports rudimentary templating for error messages.
Mongoose replaces `{VALUE}` with the value being validated.

```javascript
[require:Custom Error Messages]
```

### The `unique` Option is Not a Validator

A common gotcha for beginners is that the `unique` option for schemas
is *not* a validator. It's a convenient helper for building [MongoDB unique indexes](https://docs.mongodb.com/manual/core/index-unique/).
See the [FAQ](/docs/faq.html) for more information.

```javascript
[require:The `unique` Option is Not a Validator]
```

### Custom Validators

If the built-in validators aren't enough, you can define custom validators
to suit your needs.

Custom validation is declared by passing a validation function.
You can find detailed instructions on how to do this in the
[`SchemaType#validate()` API docs](./api.html#schematype_SchemaType-validate).

```javascript
[require:Custom Validators]
```

### Async Custom Validators

Custom validators can also be asynchronous. If your validator function
returns a promise (like an `async` function), mongoose will wait for that
promise to settle. If the returned promise rejects, or fulfills with
the value `false`, Mongoose will consider that a validation error.

```javascript
[require:Async Custom Validators]
```

### Validation Errors

Errors returned after failed validation contain an `errors` object
whose values are `ValidatorError` objects. Each
[ValidatorError](./api.html#error-validation-js) has `kind`, `path`,
`value`, and `message` properties.
A ValidatorError also may have a `reason` property. If an error was
thrown in the validator, this property will contain the error that was
thrown.

```javascript
[require:Validation Errors]
```

### Cast Errors

Before running validators, Mongoose attempts to coerce values to the
correct type. This process is called _casting_ the document. If
casting fails for a given path, the `error.errors` object will contain
a `CastError` object.

Casting runs before validation, and validation does not run if casting
fails. That means your custom validators may assume `v` is `null`,
`undefined`, or an instance of the type specified in your schema.

```javascript
[require:Cast Errors]
```

### Required Validators On Nested Objects

Defining validators on nested objects in mongoose is tricky, because
nested objects are not fully fledged paths.

```javascript
[require:Required Validators On Nested Objects]
```

### Update Validators

In the above examples, you learned about document validation. Mongoose also
supports validation for [`update()`](/docs/api.html#query_Query-update),
[`updateOne()`](/docs/api.html#query_Query-updateOne),
[`updateMany()`](/docs/api.html#query_Query-updateMany),
and [`findOneAndUpdate()`](/docs/api.html#query_Query-findOneAndUpdate) operations.
Update validators are off by default - you need to specify
the `runValidators` option.

To turn on update validators, set the `runValidators` option for
`update()`, `updateOne()`, `updateMany()`, or `findOneAndUpdate()`.
Be careful: update validators are off by default because they have several
caveats.

```javascript
[require:Update Validators$]
```

### Update Validators and `this`

There are a couple of key differences between update validators and
document validators. In the color validation function below, `this` refers
to the document being validated when using document validation.
However, when running update validators, the document being updated
may not be in the server's memory, so by default the value of `this` is
not defined.

```javascript
[require:Update Validators and `this`]
```

### The `context` option

The `context` option lets you set the value of `this` in update validators
to the underlying query.

```javascript
[require:The `context` option]
```

### Update Validators Only Run On Updated Paths

The other key difference is that update validators only run on the paths
specified in the update. For instance, in the below example, because
'name' is not specified in the update operation, update validation will
succeed.

When using update validators, `required` validators **only** fail when
you try to explicitly `$unset` the key.

```javascript
[require:Update Validators Only Run On Updated Paths]
```

### Update Validators Only Run For Some Operations

One final detail worth noting: update validators **only** run on the
following update operators:

- `$set`
- `$unset`
- `$push` (>= 4.8.0)
- `$addToSet` (>= 4.8.0)
- `$pull` (>= 4.12.0)
- `$pullAll` (>= 4.12.0)

For instance, the below update will succeed, regardless of the value of
`number`, because update validators ignore `$inc`.

Also, `$push`, `$addToSet`, `$pull`, and `$pullAll` validation does
**not** run any validation on the array itself, only individual elements
of the array.

```javascript
[require:Update Validators Only Run For Some Operations]
```
