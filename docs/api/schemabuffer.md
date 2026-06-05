# SchemaBuffer

- [`SchemaBuffer()`](#SchemaBuffer())
- [`SchemaBuffer.checkRequired()`](#SchemaBuffer.checkRequired())
- [`SchemaBuffer.get()`](#SchemaBuffer.get())
- [`SchemaBuffer.prototype.$conditionalHandlers`](#SchemaBuffer.prototype.$conditionalHandlers)
- [`SchemaBuffer.prototype.checkRequired()`](#SchemaBuffer.prototype.checkRequired())
- [`SchemaBuffer.prototype.subtype()`](#SchemaBuffer.prototype.subtype())
- [`SchemaBuffer.prototype.toJSONSchema()`](#SchemaBuffer.prototype.toJSONSchema())
- [`SchemaBuffer.schemaName`](#SchemaBuffer.schemaName)
- [`SchemaBuffer.set()`](#SchemaBuffer.set())

## `SchemaBuffer()`

### Parameters

- `key` \<string\>
- `options` \<object\>
- `schemaOptions` \<object\>
- `parentSchema` \<Schema\>

### Inherits

- [SchemaType](schematype.md)

Buffer SchemaType constructor

## `SchemaBuffer.checkRequired()`

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

    const M = mongoose.model({ buf: { type: Buffer, required: true } });
    new M({ buf: Buffer.from('') }).validateSync(); // validation passes!

## `SchemaBuffer.get()`

### Parameters

- `getter` \<Function\>

### Returns

- \<this\>

### Type

- \<property\>

Attaches a getter for all Buffer instances

#### Example:

    // Always convert to string when getting an ObjectId
    mongoose.Schema.Types.Buffer.get(v => v.toString('hex'));

    const Model = mongoose.model('Test', new Schema({ buf: Buffer } }));
    typeof (new Model({ buf: Buffer.fromString('hello') }).buf); // 'string'

## `SchemaBuffer.prototype.$conditionalHandlers`

### Type

- \<property\>

Contains the handlers for different query operators for this schema type.
For example, `$conditionalHandlers.$exists` is the function Mongoose calls to cast `$exists` filter operators.

## `SchemaBuffer.prototype.checkRequired()`

### Parameters

- `value` \<any\>
- `doc` \<Document\>

### Returns

- \<boolean\>

Check if the given value satisfies a required validator. To satisfy a
required validator, a buffer must not be null or undefined and have
non-zero length.

## `SchemaBuffer.prototype.subtype()`

### Parameters

- `subtype` \<number\> the default subtype

### Returns

- \<SchemaType\> this

Sets the default [subtype](https://studio3t.com/whats-new/best-practices-uuid-mongodb/)
for this buffer. You can find a [list of allowed subtypes here](https://www.mongodb.com/docs/manual/reference/bson-types/#binary-data).

#### Example:

    const s = new Schema({ uuid: { type: Buffer, subtype: 4 });
    const M = db.model('M', s);
    const m = new M({ uuid: 'test string' });
    m.uuid._subtype; // 4

## `SchemaBuffer.prototype.toJSONSchema()`

### Parameters

- `[options]` \<object\>
- `[options.useBsonType=false]` \<boolean\> If true, return a representation with `bsonType` for use with MongoDB's `$jsonSchema`.

Returns this schema type's representation in a JSON schema.

## `SchemaBuffer.schemaName`

### Type

- \<property\>

This schema type's name, to defend against minifiers that mangle
function names.

## `SchemaBuffer.set()`

### Parameters

- `option` \<string\> The option you'd like to set the value for
- `value` \<any\> value for option

### Returns

- \<undefined,void\>

### Type

- \<property\>

Sets a default option for all Buffer instances.

#### Example:

    // Make all buffers have `required` of true by default.
    mongoose.Schema.Types.Buffer.set('required', true);

    const User = mongoose.model('User', new Schema({ test: Buffer }));
    new User({ }).validateSync().errors.test.message; // Path `test` is required.
