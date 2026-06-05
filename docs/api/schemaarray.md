# SchemaArray

- [`SchemaArray()`](#SchemaArray())
- [`SchemaArray.checkRequired()`](#SchemaArray.checkRequired())
- [`SchemaArray.get()`](#SchemaArray.get())
- [`SchemaArray.options`](#SchemaArray.options)
- [`SchemaArray.prototype.$conditionalHandlers`](#SchemaArray.prototype.$conditionalHandlers)
- [`SchemaArray.prototype.checkRequired()`](#SchemaArray.prototype.checkRequired())
- [`SchemaArray.prototype.enum()`](#SchemaArray.prototype.enum())
- [`SchemaArray.prototype.toJSONSchema()`](#SchemaArray.prototype.toJSONSchema())
- [`SchemaArray.schemaName`](#SchemaArray.schemaName)
- [`SchemaArray.set()`](#SchemaArray.set())

## `SchemaArray()`

### Parameters

- `key` \<string\>
- `cast` \<SchemaType\>
- `options` \<object\>
- `schemaOptions` \<object\>
- `parentSchema` \<Schema\>

### Inherits

- [SchemaType](schematype.md)

Array SchemaType constructor

## `SchemaArray.checkRequired()`

### Parameters

- `fn` \<Function\>

### Returns

- \<Function\>

Override the function the required validator uses to check whether an array
passes the `required` check.

#### Example:

    // Require non-empty array to pass `required` check
    mongoose.Schema.Types.Array.checkRequired(v => Array.isArray(v) && v.length);

    const M = mongoose.model({ arr: { type: Array, required: true } });
    new M({ arr: [] }).validateSync(); // `null`, validation fails!

## `SchemaArray.get()`

### Parameters

- `getter` \<Function\>

### Returns

- \<this\>

### Type

- \<property\>

Attaches a getter for all Array instances

## `SchemaArray.options`

### Type

- \<property\>

Options for all arrays.

- `castNonArrays`: `true` by default. If `false`, Mongoose will throw a CastError when a value isn't an array. If `true`, Mongoose will wrap the provided value in an array before casting.

## `SchemaArray.prototype.$conditionalHandlers`

### Type

- \<property\>

Contains the handlers for different query operators for this schema type.
For example, `$conditionalHandlers.$all` is the function Mongoose calls to cast `$all` filter operators.

## `SchemaArray.prototype.checkRequired()`

### Parameters

- `value` \<any\>
- `doc` \<Document\>

### Returns

- \<boolean\>

Check if the given value satisfies the `required` validator.

## `SchemaArray.prototype.enum()`

### Parameters

- `[...args]` \<string|object\> enumeration values

### Returns

- \<SchemaArray\> this

Adds an enum validator if this is an array of strings or numbers. Equivalent to
`SchemaString.prototype.enum()` or `SchemaNumber.prototype.enum()`

## `SchemaArray.prototype.toJSONSchema()`

### Parameters

- `[options]` \<object\>
- `[options.useBsonType=false]` \<boolean\> If true, return a representation with `bsonType` for use with MongoDB's `$jsonSchema`.

Returns this schema type's representation in a JSON schema.

## `SchemaArray.schemaName`

### Type

- \<property\>

This schema type's name, to defend against minifiers that mangle
function names.

## `SchemaArray.set()`

### Parameters

- `option` \<string\> The option you'd like to set the value for
- `value` \<any\> value for option

### Returns

- \<undefined,void\>

Sets a default option for all Array instances.

#### Example:

    // Make all Array instances have `required` of true by default.
    mongoose.Schema.Types.Array.set('required', true);

    const User = mongoose.model('User', new Schema({ test: Array }));
    new User({ }).validateSync().errors.test.message; // Path `test` is required.
