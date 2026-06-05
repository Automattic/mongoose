# SchemaObjectId

- [`SchemaObjectId()`](#SchemaObjectId())
- [`SchemaObjectId.cast()`](#SchemaObjectId.cast())
- [`SchemaObjectId.checkRequired()`](#SchemaObjectId.checkRequired())
- [`SchemaObjectId.get()`](#SchemaObjectId.get())
- [`SchemaObjectId.prototype.$conditionalHandlers`](#SchemaObjectId.prototype.$conditionalHandlers)
- [`SchemaObjectId.prototype.auto()`](#SchemaObjectId.prototype.auto())
- [`SchemaObjectId.prototype.checkRequired()`](#SchemaObjectId.prototype.checkRequired())
- [`SchemaObjectId.prototype.toJSONSchema()`](#SchemaObjectId.prototype.toJSONSchema())
- [`SchemaObjectId.schemaName`](#SchemaObjectId.schemaName)
- [`SchemaObjectId.set()`](#SchemaObjectId.set())

## `SchemaObjectId()`

### Parameters

- `key` \<string\>
- `options` \<object\>
- `schemaOptions` \<object\>
- `parentSchema` \<Schema\>

### Inherits

- [SchemaType](schematype.md)

ObjectId SchemaType constructor.

## `SchemaObjectId.cast()`

### Parameters

- `caster` \<Function\>

### Returns

- \<Function\>

### Type

- \<property\>

Get/set the function used to cast arbitrary values to objectids.

#### Example:

    // Make Mongoose only try to cast length 24 strings. By default, any 12
    // char string is a valid ObjectId.
    const original = mongoose.ObjectId.cast();
    mongoose.ObjectId.cast(v => {
      assert.ok(typeof v !== 'string' || v.length === 24);
      return original(v);
    });

    // Or disable casting entirely
    mongoose.ObjectId.cast(false);

## `SchemaObjectId.checkRequired()`

### Parameters

- `fn` \<Function\>

### Returns

- \<Function\>

### Type

- \<property\>

Override the function the required validator uses to check whether a string
passes the `required` check.

#### Example:

    // Allow empty strings to pass `required` check
    mongoose.Schema.Types.String.checkRequired(v => v != null);

    const M = mongoose.model({ str: { type: String, required: true } });
    new M({ str: '' }).validateSync(); // `null`, validation passes!

## `SchemaObjectId.get()`

### Parameters

- `getter` \<Function\>

### Returns

- \<this\>

### Type

- \<property\>

Attaches a getter for all ObjectId instances

#### Example:

    // Always convert to string when getting an ObjectId
    mongoose.ObjectId.get(v => v.toString());

    const Model = mongoose.model('Test', new Schema({}));
    typeof (new Model({})._id); // 'string'

## `SchemaObjectId.prototype.$conditionalHandlers`

### Type

- \<property\>

Contains the handlers for different query operators for this schema type.
For example, `$conditionalHandlers.$in` is the function Mongoose calls to cast `$in` filter operators.

## `SchemaObjectId.prototype.auto()`

### Parameters

- `turnOn` \<boolean\> auto generated ObjectId defaults

### Returns

- \<SchemaType\> this

Adds an auto-generated ObjectId default if turnOn is true.

## `SchemaObjectId.prototype.checkRequired()`

### Parameters

- `value` \<any\>
- `doc` \<Document\>

### Returns

- \<boolean\>

Check if the given value satisfies a required validator.

## `SchemaObjectId.prototype.toJSONSchema()`

### Parameters

- `[options]` \<object\>
- `[options.useBsonType=false]` \<boolean\> If true, return a representation with `bsonType` for use with MongoDB's `$jsonSchema`.

Returns this schema type's representation in a JSON schema.

## `SchemaObjectId.schemaName`

### Type

- \<property\>

This schema type's name, to defend against minifiers that mangle
function names.

## `SchemaObjectId.set()`

### Parameters

- `option` \<string\> The option you'd like to set the value for
- `value` \<any\> value for option

### Returns

- \<undefined,void\>

### Type

- \<property\>

Sets a default option for all ObjectId instances.

#### Example:

    // Make all object ids have option `required` equal to true.
    mongoose.Schema.Types.ObjectId.set('required', true);

    const Order = mongoose.model('Order', new Schema({ userId: ObjectId }));
    new Order({ }).validateSync().errors.userId.message; // Path `userId` is required.
