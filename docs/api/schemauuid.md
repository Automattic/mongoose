# SchemaUuid

- [`SchemaUUID()`](#SchemaUUID())
- [`SchemaUUID.checkRequired()`](#SchemaUUID.checkRequired())
- [`SchemaUUID.get()`](#SchemaUUID.get())
- [`SchemaUUID.get()`](#SchemaUUID.get())
- [`SchemaUUID.prototype.$conditionalHandlers`](#SchemaUUID.prototype.$conditionalHandlers)
- [`SchemaUUID.prototype.checkRequired()`](#SchemaUUID.prototype.checkRequired())
- [`SchemaUUID.prototype.toJSONSchema()`](#SchemaUUID.prototype.toJSONSchema())
- [`SchemaUUID.schemaName`](#SchemaUUID.schemaName)
- [`SchemaUUID.set()`](#SchemaUUID.set())

## `SchemaUUID()`

### Parameters

- `key` \<string\>
- `options` \<object\>
- `_schemaOptions` \<object\>
- `parentSchema` \<Schema\>

### Inherits

- [SchemaType](schematype.md)

UUIDv1 SchemaType constructor.

## `SchemaUUID.checkRequired()`

### Parameters

- `fn` \<Function\>

### Returns

- \<Function\>

### Type

- \<property\>

Override the function the required validator uses to check whether a string
passes the `required` check.

## `SchemaUUID.get()`

### Parameters

- `getter` \<Function\>

### Returns

- \<this\>

### Type

- \<property\>

Attaches a getter for all UUID instances.

#### Example:

    // Note that `v` is a string by default
    mongoose.Schema.UUID.get(v => v.toUpperCase());

    const Model = mongoose.model('Test', new Schema({ test: 'UUID' }));
    new Model({ test: uuid.v4() }).test; // UUID with all uppercase

## `SchemaUUID.get()`

### Parameters

- `[caster]` \<Function\>

### Returns

- \<Function\>

### Type

- \<property\>

Get/set the function used to cast arbitrary values to UUIDs.

#### Example:

    // Make Mongoose refuse to cast UUIDs with 0 length
    const original = mongoose.Schema.Types.UUID.cast();
    mongoose.UUID.cast(v => {
      assert.ok(typeof v === "string" && v.length > 0);
      return original(v);
    });

    // Or disable casting entirely
    mongoose.UUID.cast(false);

## `SchemaUUID.prototype.$conditionalHandlers`

### Type

- \<property\>

Contains the handlers for different query operators for this schema type.
For example, `$conditionalHandlers.$exists` is the function Mongoose calls to cast `$exists` filter operators.

## `SchemaUUID.prototype.checkRequired()`

### Parameters

- `value` \<any\>

### Returns

- \<boolean\>

Check if the given value satisfies a required validator.

## `SchemaUUID.prototype.toJSONSchema()`

### Parameters

- `[options]` \<object\>
- `[options.useBsonType=false]` \<boolean\> If true, return a representation with `bsonType` for use with MongoDB's `$jsonSchema`.

Returns this schema type's representation in a JSON schema.

## `SchemaUUID.schemaName`

### Type

- \<property\>

This schema type's name, to defend against minifiers that mangle
function names.

## `SchemaUUID.set()`

### Parameters

- `option` \<string\> The option you'd like to set the value for
- `value` \<any\> value for option

### Returns

- \<undefined,void\>

### Type

- \<property\>

Sets a default option for all UUID instances.

#### Example:

    // Make all UUIDs have `required` of true by default.
    mongoose.Schema.UUID.set('required', true);

    const User = mongoose.model('User', new Schema({ test: mongoose.UUID }));
    new User({ }).validateSync().errors.test.message; // Path `test` is required.
