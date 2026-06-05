# SchemaDocumentArray

- [`SchemaDocumentArray()`](#SchemaDocumentArray())
- [`SchemaDocumentArray.get()`](#SchemaDocumentArray.get())
- [`SchemaDocumentArray.options`](#SchemaDocumentArray.options)
- [`SchemaDocumentArray.prototype.$conditionalHandlers`](#SchemaDocumentArray.prototype.$conditionalHandlers)
- [`SchemaDocumentArray.prototype.discriminator()`](#SchemaDocumentArray.prototype.discriminator())
- [`SchemaDocumentArray.prototype.doValidate()`](#SchemaDocumentArray.prototype.doValidate())
- [`SchemaDocumentArray.prototype.toJSONSchema()`](#SchemaDocumentArray.prototype.toJSONSchema())
- [`SchemaDocumentArray.schemaName`](#SchemaDocumentArray.schemaName)
- [`SchemaDocumentArray.set()`](#SchemaDocumentArray.set())

## `SchemaDocumentArray()`

### Parameters

- `key` \<string\>
- `schema` \<Schema\>
- `options` \<object\>
- `schemaOptions` \<object\>
- `parentSchema` \<Schema\>

### Inherits

- [SchemaArray](schemaarray.md)

SubdocsArray SchemaType constructor

## `SchemaDocumentArray.get()`

### Parameters

- `getter` \<Function\>

### Returns

- \<this\>

### Type

- \<property\>

Attaches a getter for all DocumentArrayPath instances

## `SchemaDocumentArray.options`

### Type

- \<property\>

Options for all document arrays.

- `castNonArrays`: `true` by default. If `false`, Mongoose will throw a CastError when a value isn't an array. If `true`, Mongoose will wrap the provided value in an array before casting.

## `SchemaDocumentArray.prototype.$conditionalHandlers`

### Type

- \<property\>

Contains the handlers for different query operators for this schema type.
For example, `$conditionalHandlers.$size` is the function Mongoose calls to cast `$size` filter operators.

## `SchemaDocumentArray.prototype.discriminator()`

### Parameters

- `name` \<string\>
- `schema` \<Schema\> fields to add to the schema for instances of this sub-class
- `[options]` \<object|string\> If string, same as `options.value`.
- `[options.value]` \<string\> the string stored in the `discriminatorKey` property. If not specified, Mongoose uses the `name` parameter.
- `[options.clone=true]` \<boolean\> By default, `discriminator()` clones the given `schema`. Set to `false` to skip cloning.

### Returns

- \<Function\> the constructor Mongoose will use for creating instances of this discriminator model

### See

- [discriminators](https://mongoosejs.com/docs/discriminators.html)

Adds a discriminator to this document array.

#### Example:

    const shapeSchema = Schema({ name: String }, { discriminatorKey: 'kind' });
    const schema = Schema({ shapes: [shapeSchema] });

    const docArrayPath = parentSchema.path('shapes');
    docArrayPath.discriminator('Circle', Schema({ radius: Number }));

## `SchemaDocumentArray.prototype.doValidate()`

Performs local validations first, then validations on each embedded doc

## `SchemaDocumentArray.prototype.toJSONSchema()`

### Parameters

- `[options]` \<object\>
- `[options.useBsonType=false]` \<boolean\> If true, return a representation with `bsonType` for use with MongoDB's `$jsonSchema`.

Returns this schema type's representation in a JSON schema.

## `SchemaDocumentArray.schemaName`

### Type

- \<property\>

This schema type's name, to defend against minifiers that mangle
function names.

## `SchemaDocumentArray.set()`

### Parameters

- `option` \<string\> The name of the option you'd like to set (e.g. trim, lowercase, etc...)
- `value` \<any\> The value of the option you'd like to set.

### Returns

- \<void,void\>

### Type

- \<property\>

Sets a default option for all DocumentArray instances.

#### Example:

    // Make all document arrays not have `_id` by default.
    mongoose.Schema.Types.DocumentArray.set('_id', false);
