# SchemaString

- [`SchemaString()`](#SchemaString())
- [`SchemaString.cast()`](#SchemaString.cast())
- [`SchemaString.checkRequired()`](#SchemaString.checkRequired())
- [`SchemaString.get()`](#SchemaString.get())
- [`SchemaString.prototype.$conditionalHandlers`](#SchemaString.prototype.$conditionalHandlers)
- [`SchemaString.prototype.checkRequired()`](#SchemaString.prototype.checkRequired())
- [`SchemaString.prototype.enum()`](#SchemaString.prototype.enum())
- [`SchemaString.prototype.lowercase()`](#SchemaString.prototype.lowercase())
- [`SchemaString.prototype.match()`](#SchemaString.prototype.match())
- [`SchemaString.prototype.maxlength()`](#SchemaString.prototype.maxlength())
- [`SchemaString.prototype.minlength()`](#SchemaString.prototype.minlength())
- [`SchemaString.prototype.toJSONSchema()`](#SchemaString.prototype.toJSONSchema())
- [`SchemaString.prototype.trim()`](#SchemaString.prototype.trim())
- [`SchemaString.prototype.uppercase()`](#SchemaString.prototype.uppercase())
- [`SchemaString.schemaName`](#SchemaString.schemaName)
- [`SchemaString.set()`](#SchemaString.set())

## `SchemaString()`

### Parameters

- `key` \<string\>
- `options` \<object\>
- `schemaOptions` \<object\>
- `parentSchema` \<Schema\>

### Inherits

- [SchemaType](schematype.md)

String SchemaType constructor.

## `SchemaString.cast()`

### Parameters

- `caster` \<Function\>

### Returns

- \<Function\>

### Type

- \<property\>

Get/set the function used to cast arbitrary values to strings.

#### Example:

    // Throw an error if you pass in an object. Normally, Mongoose allows
    // objects with custom `toString()` functions.
    const original = mongoose.Schema.Types.String.cast();
    mongoose.Schema.Types.String.cast(v => {
      assert.ok(v == null || typeof v !== 'object');
      return original(v);
    });

    // Or disable casting entirely
    mongoose.Schema.Types.String.cast(false);

## `SchemaString.checkRequired()`

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

## `SchemaString.get()`

### Parameters

- `getter` \<Function\>

### Returns

- \<this\>

### Type

- \<property\>

Attaches a getter for all String instances.

#### Example:

    // Make all numbers round down
    mongoose.Schema.Types.String.get(v => v.toLowerCase());

    const Model = mongoose.model('Test', new Schema({ test: String }));
    new Model({ test: 'FOO' }).test; // 'foo'

## `SchemaString.prototype.$conditionalHandlers`

### Type

- \<property\>

Contains the handlers for different query operators for this schema type.
For example, `$conditionalHandlers.$exists` is the function Mongoose calls to cast `$exists` filter operators.

## `SchemaString.prototype.checkRequired()`

### Parameters

- `value` \<any\>
- `doc` \<Document\>

### Returns

- \<boolean\>

Check if the given value satisfies the `required` validator. The value is
considered valid if it is a string (that is, not `null` or `undefined`) and
has positive length. The `required` validator **will** fail for empty
strings.

## `SchemaString.prototype.enum()`

### Parameters

- `[...args]` \<string|object\> enumeration values

### Returns

- \<SchemaType\> this

### See

- [Customized Error Messages](https://mongoosejs.com/docs/api/error.md#Error.messages)
- [Enums in JavaScript](https://masteringjs.io/tutorials/fundamentals/enum)

Adds an enum validator

#### Example:

    const states = ['opening', 'open', 'closing', 'closed']
    const s = new Schema({ state: { type: String, enum: states }})
    const M = db.model('M', s)
    const m = new M({ state: 'invalid' })
    await m.save()
      .catch((err) => console.error(err)); // ValidationError: `invalid` is not a valid enum value for path `state`.
    m.state = 'open';
    await m.save();
    // success

    // or with custom error messages
    const enum = {
      values: ['opening', 'open', 'closing', 'closed'],
      message: 'enum validator failed for path `{PATH}` with value `{VALUE}`'
    }
    const s = new Schema({ state: { type: String, enum: enum })
    const M = db.model('M', s)
    const m = new M({ state: 'invalid' })
    await m.save()
      .catch((err) => console.error(err)); // ValidationError: enum validator failed for path `state` with value `invalid`
    m.state = 'open';
    await m.save();
    // success

## `SchemaString.prototype.lowercase()`

### Returns

- \<SchemaType\> this

Adds a lowercase [setter](https://mongoosejs.com/docs/api/schematype.md#SchemaType.prototype.set()).

#### Example:

    const s = new Schema({ email: { type: String, lowercase: true }})
    const M = db.model('M', s);
    const m = new M({ email: 'SomeEmail@example.COM' });
    console.log(m.email) // someemail@example.com
    M.find({ email: 'SomeEmail@example.com' }); // Queries by 'someemail@example.com'

Note that `lowercase` does **not** affect regular expression queries:

#### Example:

    // Still queries for documents whose `email` matches the regular
    // expression /SomeEmail/. Mongoose does **not** convert the RegExp
    // to lowercase.
    M.find({ email: /SomeEmail/ });

## `SchemaString.prototype.match()`

### Parameters

- `regExp` \<RegExp\> regular expression to test against
- `[message]` \<string\> optional custom error message

### Returns

- \<SchemaType\> this

### See

- [Customized Error Messages](https://mongoosejs.com/docs/api/error.md#Error.messages)

Sets a regexp validator.

Any value that does not pass `regExp`.test(val) will fail validation.

#### Example:

    const s = new Schema({ name: { type: String, match: /^a/ }})
    const M = db.model('M', s)
    const m = new M({ name: 'I am invalid' })
    m.validate(function (err) {
      console.error(String(err)) // "ValidationError: Path `name` is invalid (I am invalid)."
      m.name = 'apples'
      m.validate(function (err) {
        assert.ok(err) // success
      })
    })

    // using a custom error message
    const match = [ /\.html$/, "That file doesn't end in .html ({VALUE})" ];
    const s = new Schema({ file: { type: String, match: match }})
    const M = db.model('M', s);
    const m = new M({ file: 'invalid' });
    m.validate(function (err) {
      console.log(String(err)) // "ValidationError: That file doesn't end in .html (invalid)"
    })

Empty strings, `undefined`, and `null` values always pass the match validator. If you require these values, enable the `required` validator also.

    const s = new Schema({ name: { type: String, match: /^a/, required: true }})

## `SchemaString.prototype.maxlength()`

### Parameters

- `value` \<number\> maximum string length
- `[message]` \<string\> optional custom error message

### Returns

- \<SchemaType\> this

### See

- [Customized Error Messages](https://mongoosejs.com/docs/api/error.md#Error.messages)

Sets a maximum length validator.

#### Example:

    const schema = new Schema({ postalCode: { type: String, maxlength: 9 })
    const Address = db.model('Address', schema)
    const address = new Address({ postalCode: '9512512345' })
    address.save(function (err) {
      console.error(err) // validator error
      address.postalCode = '95125';
      address.save() // success
    })

    // custom error messages
    // We can also use the special {MAXLENGTH} token which will be replaced with the maximum allowed length
    const maxlength = [9, 'The value of path `{PATH}` (`{VALUE}`) exceeds the maximum allowed length ({MAXLENGTH}).'];
    const schema = new Schema({ postalCode: { type: String, maxlength: maxlength })
    const Address = mongoose.model('Address', schema);
    const address = new Address({ postalCode: '9512512345' });
    address.validate(function (err) {
      console.log(String(err)) // ValidationError: The value of path `postalCode` (`9512512345`) exceeds the maximum allowed length (9).
    })

## `SchemaString.prototype.minlength()`

### Parameters

- `value` \<number\> minimum string length
- `[message]` \<string\> optional custom error message

### Returns

- \<SchemaType\> this

### See

- [Customized Error Messages](https://mongoosejs.com/docs/api/error.md#Error.messages)

Sets a minimum length validator.

#### Example:

    const schema = new Schema({ postalCode: { type: String, minLength: 5 })
    const Address = db.model('Address', schema)
    const address = new Address({ postalCode: '9512' })
    address.save(function (err) {
      console.error(err) // validator error
      address.postalCode = '95125';
      address.save() // success
    })

    // custom error messages
    // We can also use the special {MINLENGTH} token which will be replaced with the minimum allowed length
    const minLength = [5, 'The value of path `{PATH}` (`{VALUE}`) is shorter than the minimum allowed length ({MINLENGTH}).'];
    const schema = new Schema({ postalCode: { type: String, minLength: minLength })
    const Address = mongoose.model('Address', schema);
    const address = new Address({ postalCode: '9512' });
    address.validate(function (err) {
      console.log(String(err)) // ValidationError: The value of path `postalCode` (`9512`) is shorter than the minimum length (5).
    })

## `SchemaString.prototype.toJSONSchema()`

### Parameters

- `[options]` \<object\>
- `[options.useBsonType=false]` \<boolean\> If true, return a representation with `bsonType` for use with MongoDB's `$jsonSchema`.

Returns this schema type's representation in a JSON schema.

## `SchemaString.prototype.trim()`

### Returns

- \<SchemaType\> this

Adds a trim [setter](https://mongoosejs.com/docs/api/schematype.md#SchemaType.prototype.set()).

The string value will be [trimmed](https://masteringjs.io/tutorials/fundamentals/trim-string) when set.

#### Example:

    const s = new Schema({ name: { type: String, trim: true }});
    const M = db.model('M', s);
    const string = ' some name ';
    console.log(string.length); // 11
    const m = new M({ name: string });
    console.log(m.name.length); // 9

    // Equivalent to `findOne({ name: string.trim() })`
    M.findOne({ name: string });

Note that `trim` does **not** affect regular expression queries:

#### Example:

    // Mongoose does **not** trim whitespace from the RegExp.
    M.find({ name: / some name / });

## `SchemaString.prototype.uppercase()`

### Returns

- \<SchemaType\> this

Adds an uppercase [setter](https://mongoosejs.com/docs/api/schematype.md#SchemaType.prototype.set()).

#### Example:

    const s = new Schema({ caps: { type: String, uppercase: true }})
    const M = db.model('M', s);
    const m = new M({ caps: 'an example' });
    console.log(m.caps) // AN EXAMPLE
    M.find({ caps: 'an example' }) // Matches documents where caps = 'AN EXAMPLE'

Note that `uppercase` does **not** affect regular expression queries:

#### Example:

    // Mongoose does **not** convert the RegExp to uppercase.
    M.find({ email: /an example/ });

## `SchemaString.schemaName`

### Type

- \<property\>

This schema type's name, to defend against minifiers that mangle
function names.

## `SchemaString.set()`

### Parameters

- `option` \<string\> The option you'd like to set the value for
- `value` \<any\> value for option

### Returns

- \<undefined,void\>

### Type

- \<property\>

Sets a default option for all String instances.

#### Example:

    // Make all strings have option `trim` equal to true.
    mongoose.Schema.Types.String.set('trim', true);

    const User = mongoose.model('User', new Schema({ name: String }));
    new User({ name: '   John Doe   ' }).name; // 'John Doe'
