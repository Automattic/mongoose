# SchemaBoolean

- [`SchemaBoolean()`](#SchemaBoolean())
- [`SchemaBoolean.cast()`](#SchemaBoolean.cast())
- [`SchemaBoolean.checkRequired()`](#SchemaBoolean.checkRequired())
- [`SchemaBoolean.convertToFalse`](#SchemaBoolean.convertToFalse)
- [`SchemaBoolean.convertToTrue`](#SchemaBoolean.convertToTrue)
- [`SchemaBoolean.get()`](#SchemaBoolean.get())
- [`SchemaBoolean.prototype.$conditionalHandlers`](#SchemaBoolean.prototype.$conditionalHandlers)
- [`SchemaBoolean.prototype.checkRequired()`](#SchemaBoolean.prototype.checkRequired())
- [`SchemaBoolean.prototype.toJSONSchema()`](#SchemaBoolean.prototype.toJSONSchema())
- [`SchemaBoolean.schemaName`](#SchemaBoolean.schemaName)
- [`SchemaBoolean.set()`](#SchemaBoolean.set())

## `SchemaBoolean()`

### Parameters

- `path` \<string\>
- `options` \<object\>
- `schemaOptions` \<object\>
- `parentSchema` \<Schema\>

### Inherits

- [SchemaType](schematype.md)

Boolean SchemaType constructor.

## `SchemaBoolean.cast()`

### Parameters

- `caster` \<Function\>

### Returns

- \<Function\>

### Type

- \<property\>

Get/set the function used to cast arbitrary values to booleans.

#### Example:

    // Make Mongoose cast empty string '' to false.
    const original = mongoose.Schema.Types.Boolean.cast();
    mongoose.Schema.Types.Boolean.cast(v => {
      if (v === '') {
        return false;
      }
      return original(v);
    });

    // Or disable casting entirely
    mongoose.Schema.Types.Boolean.cast(false);

## `SchemaBoolean.checkRequired()`

### Parameters

- `fn` \<Function\>

### Returns

- \<Function\>

### Type

- \<property\>

Override the function the required validator uses to check whether a boolean
passes the `required` check.

## `SchemaBoolean.convertToFalse`

### Type

- \<Set\>

Configure which values get casted to `false`.

#### Example:

    const M = mongoose.model('Test', new Schema({ b: Boolean }));
    new M({ b: 'nay' }).b; // undefined
    mongoose.Schema.Types.Boolean.convertToFalse.add('nay');
    new M({ b: 'nay' }).b; // false

## `SchemaBoolean.convertToTrue`

### Type

- \<Set\>

Configure which values get casted to `true`.

#### Example:

    const M = mongoose.model('Test', new Schema({ b: Boolean }));
    new M({ b: 'affirmative' }).b; // undefined
    mongoose.Schema.Types.Boolean.convertToTrue.add('affirmative');
    new M({ b: 'affirmative' }).b; // true

## `SchemaBoolean.get()`

### Parameters

- `getter` \<Function\>

### Returns

- \<this\>

### Type

- \<property\>

Attaches a getter for all Boolean instances

#### Example:

    mongoose.Schema.Types.Boolean.get(v => v === true ? 'yes' : 'no');

    const Order = mongoose.model('Order', new Schema({ isPaid: Boolean }));
    new Order({ isPaid: false }).isPaid; // 'no'

## `SchemaBoolean.prototype.$conditionalHandlers`

### Type

- \<property\>

Contains the handlers for different query operators for this schema type.
For example, `$conditionalHandlers.$in` is the function Mongoose calls to cast `$in` filter operators.

## `SchemaBoolean.prototype.checkRequired()`

### Parameters

- `value` \<any\>

### Returns

- \<boolean\>

Check if the given value satisfies a required validator. For a boolean
to satisfy a required validator, it must be strictly equal to true or to
false.

## `SchemaBoolean.prototype.toJSONSchema()`

### Parameters

- `[options]` \<object\>
- `[options.useBsonType=false]` \<boolean\> If true, return a representation with `bsonType` for use with MongoDB's `$jsonSchema`.

Returns this schema type's representation in a JSON schema.

## `SchemaBoolean.schemaName`

### Type

- \<property\>

This schema type's name, to defend against minifiers that mangle
function names.

## `SchemaBoolean.set()`

### Parameters

- `option` \<string\> The option you'd like to set the value for
- `value` \<any\> value for option

### Returns

- \<undefined,void\>

### Type

- \<property\>

Sets a default option for all Boolean instances.

#### Example:

    // Make all booleans have `default` of false.
    mongoose.Schema.Types.Boolean.set('default', false);

    const Order = mongoose.model('Order', new Schema({ isPaid: Boolean }));
    new Order({ }).isPaid; // false
