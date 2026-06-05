# SchemaNumber

- [`SchemaNumber()`](#SchemaNumber())
- [`SchemaNumber.cast()`](#SchemaNumber.cast())
- [`SchemaNumber.checkRequired()`](#SchemaNumber.checkRequired())
- [`SchemaNumber.get()`](#SchemaNumber.get())
- [`SchemaNumber.prototype.$conditionalHandlers`](#SchemaNumber.prototype.$conditionalHandlers)
- [`SchemaNumber.prototype.checkRequired()`](#SchemaNumber.prototype.checkRequired())
- [`SchemaNumber.prototype.enum()`](#SchemaNumber.prototype.enum())
- [`SchemaNumber.prototype.max()`](#SchemaNumber.prototype.max())
- [`SchemaNumber.prototype.min()`](#SchemaNumber.prototype.min())
- [`SchemaNumber.prototype.toJSONSchema()`](#SchemaNumber.prototype.toJSONSchema())
- [`SchemaNumber.schemaName`](#SchemaNumber.schemaName)
- [`SchemaNumber.set()`](#SchemaNumber.set())

## `SchemaNumber()`

### Parameters

- `key` \<string\>
- `options` \<object\>
- `schemaOptions` \<object\>
- `parentSchema` \<Schema\>

### Inherits

- [SchemaType](schematype.md)

Number SchemaType constructor.

## `SchemaNumber.cast()`

### Parameters

- `caster` \<Function\>

### Returns

- \<Function\>

### Type

- \<property\>

Get/set the function used to cast arbitrary values to numbers.

#### Example:

    // Make Mongoose cast empty strings '' to 0 for paths declared as numbers
    const original = mongoose.Number.cast();
    mongoose.Number.cast(v => {
      if (v === '') { return 0; }
      return original(v);
    });

    // Or disable casting entirely
    mongoose.Number.cast(false);

## `SchemaNumber.checkRequired()`

### Parameters

- `fn` \<Function\>

### Returns

- \<Function\>

### Type

- \<property\>

Override the function the required validator uses to check whether a string
passes the `required` check.

## `SchemaNumber.get()`

### Parameters

- `getter` \<Function\>

### Returns

- \<this\>

### Type

- \<property\>

Attaches a getter for all Number instances.

#### Example:

    // Make all numbers round down
    mongoose.Number.get(function(v) { return Math.floor(v); });

    const Model = mongoose.model('Test', new Schema({ test: Number }));
    new Model({ test: 3.14 }).test; // 3

## `SchemaNumber.prototype.$conditionalHandlers`

### Type

- \<property\>

Contains the handlers for different query operators for this schema type.
For example, `$conditionalHandlers.$gte` is the function Mongoose calls to cast `$gte` filter operators.

## `SchemaNumber.prototype.checkRequired()`

### Parameters

- `value` \<any\>
- `doc` \<Document\>

### Returns

- \<boolean\>

Check if the given value satisfies a required validator.

## `SchemaNumber.prototype.enum()`

### Parameters

- `values` \<Array\> allowed values
- `[message]` \<string\> optional custom error message

### Returns

- \<SchemaType\> this

### See

- [Customized Error Messages](https://mongoosejs.com/docs/api/error.md#Error.messages)

Sets a enum validator

#### Example:

    const s = new Schema({ n: { type: Number, enum: [1, 2, 3] });
    const M = db.model('M', s);

    const m = new M({ n: 4 });
    await m.save(); // throws validation error

    m.n = 3;
    await m.save(); // succeeds

## `SchemaNumber.prototype.max()`

### Parameters

- `maximum` \<number\> number
- `[message]` \<string\> optional custom error message

### Returns

- \<SchemaType\> this

### See

- [Customized Error Messages](https://mongoosejs.com/docs/api/error.md#Error.messages)

Sets a maximum number validator.

#### Example:

    const s = new Schema({ n: { type: Number, max: 10 })
    const M = db.model('M', s)
    const m = new M({ n: 11 })
    m.save(function (err) {
      console.error(err) // validator error
      m.n = 10;
      m.save() // success
    })

    // custom error messages
    // We can also use the special {MAX} token which will be replaced with the invalid value
    const max = [10, 'The value of path `{PATH}` ({VALUE}) exceeds the limit ({MAX}).'];
    const schema = new Schema({ n: { type: Number, max: max })
    const M = mongoose.model('Measurement', schema);
    const s= new M({ n: 4 });
    s.validate(function (err) {
      console.log(String(err)) // ValidationError: The value of path `n` (4) exceeds the limit (10).
    })

## `SchemaNumber.prototype.min()`

### Parameters

- `value` \<number\> minimum number
- `[message]` \<string\> optional custom error message

### Returns

- \<SchemaType\> this

### See

- [Customized Error Messages](https://mongoosejs.com/docs/api/error.md#Error.messages)

Sets a minimum number validator.

#### Example:

    const s = new Schema({ n: { type: Number, min: 10 })
    const M = db.model('M', s)
    const m = new M({ n: 9 })
    m.save(function (err) {
      console.error(err) // validator error
      m.n = 10;
      m.save() // success
    })

    // custom error messages
    // We can also use the special {MIN} token which will be replaced with the invalid value
    const min = [10, 'The value of path `{PATH}` ({VALUE}) is beneath the limit ({MIN}).'];
    const schema = new Schema({ n: { type: Number, min: min })
    const M = mongoose.model('Measurement', schema);
    const s= new M({ n: 4 });
    s.validate(function (err) {
      console.log(String(err)) // ValidationError: The value of path `n` (4) is beneath the limit (10).
    })

## `SchemaNumber.prototype.toJSONSchema()`

### Parameters

- `[options]` \<object\>
- `[options.useBsonType=false]` \<boolean\> If true, return a representation with `bsonType` for use with MongoDB's `$jsonSchema`.

Returns this schema type's representation in a JSON schema.

## `SchemaNumber.schemaName`

### Type

- \<property\>

This schema type's name, to defend against minifiers that mangle
function names.

## `SchemaNumber.set()`

### Parameters

- `option` \<string\> The option you'd like to set the value for
- `value` \<any\> value for option

### Returns

- \<undefined,void\>

### Type

- \<property\>

Sets a default option for all Number instances.

#### Example:

    // Make all numbers have option `min` equal to 0.
    mongoose.Schema.Types.Number.set('min', 0);

    const Order = mongoose.model('Order', new Schema({ amount: Number }));
    new Order({ amount: -10 }).validateSync().errors.amount.message; // Path `amount` must be larger than 0.
