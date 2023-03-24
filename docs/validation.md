# Validation

Before we get into the specifics of validation syntax, please keep the following rules in mind:

- Validation is defined in the [SchemaType](schematypes.html)
- Validation is [middleware](middleware.html). Mongoose registers validation as a `pre('save')` hook on every schema by default.
- Validation always runs as the **first** `pre('save')` hook. This means that validation doesn't run on any changes you make in `pre('save')` hooks.
- You can disable automatic validation before save by setting the [validateBeforeSave](guide.html#validateBeforeSave) option
- You can manually run validation using `doc.validate()` or `doc.validateSync()`
- You can manually mark a field as invalid (causing validation to fail) by using [`doc.invalidate(...)`](api/document.html#document_Document-invalidate)
- Validators are not run on undefined values. The only exception is the [`required` validator](api/schematype.html#schematype_SchemaType-required).
- When you call [Model#save](api/model.html#model_Model-save), Mongoose also runs subdocument validation. If an error occurs, your [Model#save](api/model.html#model_Model-save) promise rejects
- Validation is customizable

```acquit
[require:Validation$]
```

- [Built-in Validators](#built-in-validators)
- [Custom Error Messages](#custom-error-messages)
- [The `unique` Option is Not a Validator](#the-unique-option-is-not-a-validator)
- [Custom Validators](#custom-validators)
- [Async Custom Validators](#async-custom-validators)
- [Validation Errors](#validation-errors)
- [Cast Errors](#cast-errors)
- [Global SchemaType Validation](#global-schematype-validation)
- [Required Validators On Nested Objects](#required-validators-on-nested-objects)
- [Update Validators](#update-validators)
- [Update Validators and `this`](#update-validators-and-this)
- [Update Validators Only Run On Updated Paths](#update-validators-only-run-on-updated-paths)
- [Update Validators Only Run For Some Operations](#update-validators-only-run-for-some-operations)

## Built-in Validators

Mongoose has several built-in validators.

- All [SchemaTypes](schematypes.html) have the built-in [required](api/schematype.html#schematype_SchemaType-required) validator. The required validator uses the [SchemaType's `checkRequired()` function](api/schematype.html#schematype_SchemaType-checkRequired) to determine if the value satisfies the required validator.
- [Numbers](schematypes.html#numbers) have [`min` and `max`](schematypes.html#number-validators) validators.
- [Strings](schematypes.html#strings) have [`enum`, `match`, `minLength`, and `maxLength`](schematypes.html#string-validators) validators.

Each of the validator links above provide more information about how to enable them and customize their error messages.

```acquit
[require:Built-in Validators]
```

## Custom Error Messages

You can configure the error message for individual validators in your schema. There are two equivalent
ways to set the validator error message:

- Array syntax: `min: [6, 'Must be at least 6, got {VALUE}']`
- Object syntax: `enum: { values: ['Coffee', 'Tea'], message: '{VALUE} is not supported' }`

Mongoose also supports rudimentary templating for error messages.
Mongoose replaces `{VALUE}` with the value being validated.

```acquit
[require:Custom Error Messages]
```

## The `unique` Option is Not a Validator

A common gotcha for beginners is that the `unique` option for schemas
is *not* a validator. It's a convenient helper for building [MongoDB unique indexes](https://www.mongodb.com/docs/manual/core/index-unique/).
See the [FAQ](faq.html) for more information.

```acquit
[require:The `unique` Option is Not a Validator]
```

## Custom Validators

If the built-in validators aren't enough, you can define custom validators
to suit your needs.

Custom validation is declared by passing a validation function.
You can find detailed instructions on how to do this in the
[`SchemaType#validate()` API docs](api/schematype.html#schematype_SchemaType-validate).

```acquit
[require:Custom Validators]
```

## Async Custom Validators

Custom validators can also be asynchronous. If your validator function
returns a promise (like an `async` function), mongoose will wait for that
promise to settle. If the returned promise rejects, or fulfills with
the value `false`, Mongoose will consider that a validation error.

```acquit
[require:Async Custom Validators]
```

## Validation Errors

Errors returned after failed validation contain an `errors` object
whose values are `ValidatorError` objects. Each
[ValidatorError](api/error.html#error_Error-ValidatorError) has `kind`, `path`,
`value`, and `message` properties.
A ValidatorError also may have a `reason` property. If an error was
thrown in the validator, this property will contain the error that was
thrown.

```acquit
[require:Validation Errors]
```

## Cast Errors

Before running validators, Mongoose attempts to coerce values to the
correct type. This process is called _casting_ the document. If
casting fails for a given path, the `error.errors` object will contain
a `CastError` object.

Casting runs before validation, and validation does not run if casting
fails. That means your custom validators may assume `v` is `null`,
`undefined`, or an instance of the type specified in your schema.

```acquit
[require:Cast Errors]
```

## Global SchemaType Validation

In addition to defining custom validators on individual schema paths, you can also configure a custom validator to run on every instance of a given `SchemaType`.
For example, the following code demonstrates how to make empty string `''` an invalid value for _all_ string paths.

```acquit
[require:Global SchemaType Validation]
```

## Required Validators On Nested Objects

Defining validators on nested objects in mongoose is tricky, because
nested objects are not fully fledged paths.

```acquit
[require:Required Validators On Nested Objects]
```

## Update Validators

In the above examples, you learned about document validation. Mongoose also
supports validation for [`update()`](api/query.html#query_Query-update),
[`updateOne()`](api/query.html#query_Query-updateOne),
[`updateMany()`](api/query.html#query_Query-updateMany),
and [`findOneAndUpdate()`](api/query.html#query_Query-findOneAndUpdate) operations.
Update validators are off by default - you need to specify
the `runValidators` option.

To turn on update validators, set the `runValidators` option for
`update()`, `updateOne()`, `updateMany()`, or `findOneAndUpdate()`.
Be careful: update validators are off by default because they have several
caveats.

```acquit
[require:Update Validators$]
```

## Update Validators and `this`

There are a couple of key differences between update validators and
document validators. In the color validation function below, `this` refers
to the document being validated when using document validation.
However, when running update validators, `this` refers to the query object instead of the document.
Because queries have a neat `.get()` function, you can get the updated value of the property you want.

```acquit
[require:Update Validators and `this`]
```

## Update Validators Only Run On Updated Paths

The other key difference is that update validators only run on the paths
specified in the update. For instance, in the below example, because
'name' is not specified in the update operation, update validation will
succeed.

When using update validators, `required` validators **only** fail when
you try to explicitly `$unset` the key.

```acquit
[require:Update Validators Only Run On Updated Paths]
```

## Update Validators Only Run For Some Operations

One final detail worth noting: update validators **only** run on the
following update operators:

- `$set`
- `$unset`
- `$push`
- `$addToSet`
- `$pull`
- `$pullAll`

For instance, the below update will succeed, regardless of the value of
`number`, because update validators ignore `$inc`.

Also, `$push`, `$addToSet`, `$pull`, and `$pullAll` validation does
**not** run any validation on the array itself, only individual elements
of the array.

```acquit
[require:Update Validators Only Run For Some Operations]
```

## Next Up

Now that we've covered `Validation`, let's take a look at [Middleware](middleware.html).
