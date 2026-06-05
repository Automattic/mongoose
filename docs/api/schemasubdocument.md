# SchemaSubdocument

- [`SchemaSubdocument()`](#SchemaSubdocument())
- [`SchemaSubdocument.get()`](#SchemaSubdocument.get())
- [`SchemaSubdocument.prototype.$conditionalHandlers`](#SchemaSubdocument.prototype.$conditionalHandlers)
- [`SchemaSubdocument.prototype.discriminator()`](#SchemaSubdocument.prototype.discriminator())
- [`SchemaSubdocument.prototype.doValidate()`](#SchemaSubdocument.prototype.doValidate())
- [`SchemaSubdocument.prototype.toJSONSchema()`](#SchemaSubdocument.prototype.toJSONSchema())
- [`SchemaSubdocument.set()`](#SchemaSubdocument.set())

## `SchemaSubdocument()`

### Parameters

- `schema` \<Schema\>
- `path` \<string\>
- `options` \<object\>
- `parentSchema` \<Schema\>

### Inherits

- [SchemaType](schematype.md)

Single nested subdocument SchemaType constructor.

## `SchemaSubdocument.get()`

### Parameters

- `getter` \<Function\>

### Returns

- \<this\>

### Type

- \<property\>

Attaches a getter for all Subdocument instances

## `SchemaSubdocument.prototype.$conditionalHandlers`

### Type

- \<property\>

Contains the handlers for different query operators for this schema type.
For example, `$conditionalHandlers.$exists` is the function Mongoose calls to cast `$exists` filter operators.

## `SchemaSubdocument.prototype.discriminator()`

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

Adds a discriminator to this single nested subdocument.

#### Example:

    const shapeSchema = Schema({ name: String }, { discriminatorKey: 'kind' });
    const schema = Schema({ shape: shapeSchema });

    const singleNestedPath = parentSchema.path('shape');
    singleNestedPath.discriminator('Circle', Schema({ radius: Number }));

## `SchemaSubdocument.prototype.doValidate()`

Async validation on this single nested doc.

## `SchemaSubdocument.prototype.toJSONSchema()`

### Parameters

- `[options]` \<object\>
- `[options.useBsonType=false]` \<boolean\> If true, return a representation with `bsonType` for use with MongoDB's `$jsonSchema`.

Returns this schema type's representation in a JSON schema.

## `SchemaSubdocument.set()`

### Parameters

- `option` \<string\> The option you'd like to set the value for
- `value` \<any\> value for option

### Returns

- \<void,void\>

### Type

- \<property\>

Sets a default option for all Subdocument instances.

#### Example:

    // Make all subdocuments required by default.
    mongoose.Schema.Types.Subdocument.set('required', true);
