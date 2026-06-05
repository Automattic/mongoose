# Error

- [`Error()`](#Error())
- [`Error.CastError`](#Error.CastError)
- [`Error.DivergentArrayError`](#Error.DivergentArrayError)
- [`Error.DocumentNotFoundError`](#Error.DocumentNotFoundError)
- [`Error.MissingSchemaError`](#Error.MissingSchemaError)
- [`Error.MongooseBulkSaveIncompleteError`](#Error.MongooseBulkSaveIncompleteError)
- [`Error.MongooseServerSelectionError`](#Error.MongooseServerSelectionError)
- [`Error.OverwriteModelError`](#Error.OverwriteModelError)
- [`Error.ParallelSaveError`](#Error.ParallelSaveError)
- [`Error.StrictModeError`](#Error.StrictModeError)
- [`Error.StrictPopulateError`](#Error.StrictPopulateError)
- [`Error.ValidationError`](#Error.ValidationError)
- [`Error.ValidatorError`](#Error.ValidatorError)
- [`Error.VersionError`](#Error.VersionError)
- [`Error.messages`](#Error.messages)
- [`Error.prototype.name`](#Error.prototype.name)

## `Error()`

### Parameters

- `msg` \<string\> Error message

### Type

- \<constructor\>

### Inherits

- [Error](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error)

MongooseError constructor. MongooseError is the base class for all
Mongoose-specific errors.

#### Example:

    const Model = mongoose.model('Test', new mongoose.Schema({ answer: Number }));
    const doc = new Model({ answer: 'not a number' });
    const err = doc.validateSync();

    err instanceof mongoose.Error.ValidationError; // true

## `Error.CastError`

### Type

- \<property\>

An instance of this error class will be thrown when mongoose failed to
cast a value.

## `Error.DivergentArrayError`

### Type

- \<property\>

An instance of this error will be thrown if you used an array projection
and then modified the array in an unsafe way.

## `Error.DocumentNotFoundError`

### Type

- \<property\>

An instance of this error class will be thrown when `save()` fails
because the underlying
document was not found. The constructor takes one parameter, the
conditions that mongoose passed to `updateOne()` when trying to update
the document.

## `Error.MissingSchemaError`

### Type

- \<property\>

Thrown when you try to access a model that has not been registered yet

## `Error.MongooseBulkSaveIncompleteError`

### Type

- \<property\>

Thrown when some documents failed to save when calling `bulkSave()`

## `Error.MongooseServerSelectionError`

### Type

- \<property\>

Thrown when the MongoDB Node driver can't connect to a valid server
to send an operation to.

## `Error.OverwriteModelError`

### Type

- \<property\>

Thrown when a model with the given name was already registered on the connection.
See [the FAQ about `OverwriteModelError`](https://mongoosejs.com/docs/faq.html#overwrite-model-error).

## `Error.ParallelSaveError`

### Type

- \<property\>

An instance of this error class will be thrown when you call `save()` multiple
times on the same document in parallel. See the [FAQ](https://mongoosejs.com/docs/faq.html) for more
information.

## `Error.StrictModeError`

### Type

- \<property\>

Thrown when your try to pass values to model constructor that
were not specified in schema or change immutable properties when
`strict` mode is `"throw"`

## `Error.StrictPopulateError`

### Type

- \<property\>

An instance of this error class will be returned when mongoose failed to
populate with a path that is not existing.

## `Error.ValidationError`

### Type

- \<property\>

An instance of this error class will be thrown when [validation](https://mongoosejs.com/docs/validation.html) failed.
The `errors` property contains an object whose keys are the paths that failed and whose values are
instances of CastError or ValidationError.

## `Error.ValidatorError`

### Type

- \<property\>

A `ValidationError` has a hash of `errors` that contain individual
`ValidatorError` instances.

#### Example:

    const schema = Schema({ name: { type: String, required: true } });
    const Model = mongoose.model('Test', schema);
    const doc = new Model({});

    // Top-level error is a ValidationError, **not** a ValidatorError
    const err = doc.validateSync();
    err instanceof mongoose.Error.ValidationError; // true

    // A ValidationError `err` has 0 or more ValidatorErrors keyed by the
    // path in the `err.errors` property.
    err.errors['name'] instanceof mongoose.Error.ValidatorError;

    err.errors['name'].kind; // 'required'
    err.errors['name'].path; // 'name'
    err.errors['name'].value; // undefined

Instances of `ValidatorError` have the following properties:

- `kind`: The validator's `type`, like `'required'` or `'regexp'`
- `path`: The path that failed validation
- `value`: The value that failed validation

## `Error.VersionError`

### Type

- \<property\>

An instance of this error class will be thrown when you call `save()` after
the document in the database was changed in a potentially unsafe way. See
the [`versionKey` option](https://mongoosejs.com/docs/guide.html#versionKey) for more information.

## `Error.messages`

### Type

- \<property\>

### See

- [Error.messages](https://mongoosejs.com/docs/api/error.md#Error.messages)

The default built-in validator error messages.

## `Error.prototype.name`

### Type

- \<string\>

The name of the error. The name uniquely identifies this Mongoose error. The
possible values are:

- `MongooseError`: general Mongoose error
- `CastError`: Mongoose could not convert a value to the type defined in the schema path. May be in a `ValidationError` class' `errors` property.
- `DivergentArrayError`: You attempted to `save()` an array that was modified after you loaded it with a `$elemMatch` or similar projection
- `MissingSchemaError`: You tried to access a model with [`mongoose.model()`](https://mongoosejs.com/docs/api/mongoose.md#Mongoose.model()) that was not defined
- `DocumentNotFoundError`: The document you tried to [`save()`](https://mongoosejs.com/docs/api/document.md#Document.prototype.save()) was not found
- `ValidatorError`: error from an individual schema path's validator
- `ValidationError`: error returned from [`validate()`](https://mongoosejs.com/docs/api/document.md#Document.prototype.validate()) or [`validateSync()`](https://mongoosejs.com/docs/api/document.md#Document.prototype.validateSync()). Contains zero or more `ValidatorError` instances in `.errors` property.
- `MissingSchemaError`: You called `mongoose.Document()` without a schema
- `ObjectExpectedError`: Thrown when you set a nested path to a non-object value with [strict mode set](https://mongoosejs.com/docs/guide.html#strict).
- `ObjectParameterError`: Thrown when you pass a non-object value to a function which expects an object as a parameter
- `OverwriteModelError`: Thrown when you call [`mongoose.model()`](https://mongoosejs.com/docs/api/mongoose.md#Mongoose.model()) to re-define a model that was already defined.
- `ParallelSaveError`: Thrown when you call [`save()`](https://mongoosejs.com/docs/api/model.md#Model.prototype.save()) on a document when the same document instance is already saving.
- `StrictModeError`: Thrown when you set a path that isn't the schema and [strict mode](https://mongoosejs.com/docs/guide.html#strict) is set to `throw`.
- `VersionError`: Thrown when the [document is out of sync](https://mongoosejs.com/docs/guide.html#versionKey)
