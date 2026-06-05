# SchemaTypeOptions

- [`SchemaTypeOptions()`](#SchemaTypeOptions())
- [`SchemaTypeOptions.prototype.allowNull`](#SchemaTypeOptions.prototype.allowNull)
- [`SchemaTypeOptions.prototype.cast`](#SchemaTypeOptions.prototype.cast)
- [`SchemaTypeOptions.prototype.default`](#SchemaTypeOptions.prototype.default)
- [`SchemaTypeOptions.prototype.immutable`](#SchemaTypeOptions.prototype.immutable)
- [`SchemaTypeOptions.prototype.index`](#SchemaTypeOptions.prototype.index)
- [`SchemaTypeOptions.prototype.ref`](#SchemaTypeOptions.prototype.ref)
- [`SchemaTypeOptions.prototype.ref`](#SchemaTypeOptions.prototype.ref)
- [`SchemaTypeOptions.prototype.required`](#SchemaTypeOptions.prototype.required)
- [`SchemaTypeOptions.prototype.select`](#SchemaTypeOptions.prototype.select)
- [`SchemaTypeOptions.prototype.sparse`](#SchemaTypeOptions.prototype.sparse)
- [`SchemaTypeOptions.prototype.text`](#SchemaTypeOptions.prototype.text)
- [`SchemaTypeOptions.prototype.transform`](#SchemaTypeOptions.prototype.transform)
- [`SchemaTypeOptions.prototype.type`](#SchemaTypeOptions.prototype.type)
- [`SchemaTypeOptions.prototype.unique`](#SchemaTypeOptions.prototype.unique)
- [`SchemaTypeOptions.prototype.validate`](#SchemaTypeOptions.prototype.validate)

## `SchemaTypeOptions()`

### Type

- \<constructor\>

The options defined on a schematype.

#### Example:

    const schema = new Schema({ name: String });
    schema.path('name').options instanceof mongoose.SchemaTypeOptions; // true

## `SchemaTypeOptions.prototype.allowNull`

### Type

- \<boolean\>

Controls whether this path may be set to `null`. By default, Mongoose allows
`null` for non-required paths. Set `allowNull: false` to allow `undefined`
but disallow `null`.

## `SchemaTypeOptions.prototype.cast`

### Type

- \<string\>

Allows overriding casting logic for this individual path. If a string, the
given string overwrites Mongoose's default cast error message.

#### Example:

    const schema = new Schema({
      num: {
        type: Number,
        cast: '{VALUE} is not a valid number'
      }
    });

    // Throws 'CastError: "bad" is not a valid number'
    schema.path('num').cast('bad');

    const Model = mongoose.model('Test', schema);
    const doc = new Model({ num: 'fail' });
    const err = doc.validateSync();

    err.errors['num']; // 'CastError: "fail" is not a valid number'

## `SchemaTypeOptions.prototype.default`

### Type

- \<Function|any\>

The default value for this path. If a function, Mongoose executes the function
and uses the return value as the default.

## `SchemaTypeOptions.prototype.immutable`

### Type

- \<Function|boolean\>

If [truthy](https://masteringjs.io/tutorials/fundamentals/truthy), Mongoose will
disallow changes to this path once the document
is saved to the database for the first time. Read more about [immutability in Mongoose here](https://thecodebarbarian.com/whats-new-in-mongoose-5-6-immutable-properties.html).

## `SchemaTypeOptions.prototype.index`

### Type

- \<boolean|number|object\>

If [truthy](https://masteringjs.io/tutorials/fundamentals/truthy), Mongoose will
build an index on this path when the model is compiled.

## `SchemaTypeOptions.prototype.ref`

### Type

- \<Function|string\>

The model that `populate()` should use if populating this path.

## `SchemaTypeOptions.prototype.ref`

### Type

- \<Function|string\>

The path in the document that `populate()` should use to find the model
to use.

## `SchemaTypeOptions.prototype.required`

### Type

- \<Function|boolean\>

If true, attach a required validator to this path, which ensures this path
cannot be set to a nullish value. If a function, Mongoose calls the
function and only checks for nullish values if the function returns a truthy value.

## `SchemaTypeOptions.prototype.select`

### Type

- \<boolean|number\>

Whether to include or exclude this path by default when loading documents
using `find()`, `findOne()`, etc.

## `SchemaTypeOptions.prototype.sparse`

### Type

- \<boolean|number\>

If [truthy](https://masteringjs.io/tutorials/fundamentals/truthy), Mongoose will
build a sparse index on this path.

## `SchemaTypeOptions.prototype.text`

### Type

- \<boolean|number|object\>

If [truthy](https://masteringjs.io/tutorials/fundamentals/truthy), Mongoose
will build a text index on this path.

## `SchemaTypeOptions.prototype.transform`

### Type

- \<Function\>

Define a transform function for this individual schema type.
Only called when calling `toJSON()` or `toObject()`.

#### Example:

    const schema = Schema({
      myDate: {
        type: Date,
        transform: v => v.getFullYear()
      }
    });
    const Model = mongoose.model('Test', schema);

    const doc = new Model({ myDate: new Date('2019/06/01') });
    doc.myDate instanceof Date; // true

    const res = doc.toObject({ transform: true });
    res.myDate; // 2019

## `SchemaTypeOptions.prototype.type`

### Type

- \<Function|string|object\>

The type to cast this path to.

## `SchemaTypeOptions.prototype.unique`

### Type

- \<boolean|number\>

If [truthy](https://masteringjs.io/tutorials/fundamentals/truthy), Mongoose
will build a unique index on this path when the
model is compiled. [The `unique` option is **not** a validator](https://mongoosejs.com/docs/validation.html#the-unique-option-is-not-a-validator).

## `SchemaTypeOptions.prototype.validate`

### Type

- \<Function|object\>

Function or object describing how to validate this schematype.
