# SchemaArrayOptions

- [`SchemaArrayOptions()`](#SchemaArrayOptions())
- [`SchemaArrayOptions.prototype.castNonArrays`](#SchemaArrayOptions.prototype.castNonArrays)
- [`SchemaArrayOptions.prototype.enum`](#SchemaArrayOptions.prototype.enum)
- [`SchemaArrayOptions.prototype.of`](#SchemaArrayOptions.prototype.of)

## `SchemaArrayOptions()`

### Type

- \<constructor\>

### Inherits

- [SchemaTypeOptions](schematypeoptions.md)

The options defined on an Array schematype.

#### Example:

    const schema = new Schema({ tags: [String] });
    schema.path('tags').options; // SchemaArrayOptions instance

## `SchemaArrayOptions.prototype.castNonArrays`

### Type

- \<boolean\>

If set to `false`, will always deactivate casting non-array values to arrays.
If set to `true`, will cast non-array values to arrays if `init` and `SchemaArray.options.castNonArrays` are also `true`

#### Example:

    const Model = db.model('Test', new Schema({ x1: { castNonArrays: false, type: [String] } }));
    const doc = new Model({ x1: "some non-array value" });
    await doc.validate(); // Errors with "CastError"

## `SchemaArrayOptions.prototype.enum`

### Type

- \<Array\>

If this is an array of strings, an array of allowed values for this path.
Throws an error if this array isn't an array of strings.

## `SchemaArrayOptions.prototype.of`

### Type

- \<Function|string\>

If set, specifies the type of this array's values. Equivalent to setting
`type` to an array whose first element is `of`.

#### Example:

    // `arr` is an array of numbers.
    new Schema({ arr: [Number] });
    // Equivalent way to define `arr` as an array of numbers
    new Schema({ arr: { type: Array, of: Number } });
