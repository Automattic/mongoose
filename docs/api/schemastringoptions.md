# SchemaStringOptions

- [`SchemaStringOptions()`](#SchemaStringOptions())
- [`SchemaStringOptions.prototype.enum`](#SchemaStringOptions.prototype.enum)
- [`SchemaStringOptions.prototype.lowercase`](#SchemaStringOptions.prototype.lowercase)
- [`SchemaStringOptions.prototype.match`](#SchemaStringOptions.prototype.match)
- [`SchemaStringOptions.prototype.maxLength`](#SchemaStringOptions.prototype.maxLength)
- [`SchemaStringOptions.prototype.minLength`](#SchemaStringOptions.prototype.minLength)
- [`SchemaStringOptions.prototype.populate`](#SchemaStringOptions.prototype.populate)
- [`SchemaStringOptions.prototype.trim`](#SchemaStringOptions.prototype.trim)
- [`SchemaStringOptions.prototype.uppercase`](#SchemaStringOptions.prototype.uppercase)

## `SchemaStringOptions()`

### Type

- \<constructor\>

### Inherits

- [SchemaTypeOptions](schematypeoptions.md)

The options defined on a string schematype.

#### Example:

    const schema = new Schema({ name: String });
    schema.path('name').options; // SchemaStringOptions instance

## `SchemaStringOptions.prototype.enum`

### Type

- \<Array\>

Array of allowed values for this path

## `SchemaStringOptions.prototype.lowercase`

### Type

- \<boolean\>

If truthy, Mongoose will add a [custom setter](https://mongoosejs.com/docs/api/schematype.md#SchemaType.prototype.set()) that lowercases this string
using JavaScript's built-in `String#toLowerCase()`.

## `SchemaStringOptions.prototype.match`

### Type

- \<RegExp\>

Attach a validator that succeeds if the data string matches the given regular
expression, and fails otherwise.

## `SchemaStringOptions.prototype.maxLength`

### Type

- \<number\>

If set, Mongoose will add a custom validator that ensures the given
string's `length` is at most the given number.

Mongoose supports two different spellings for this option: `maxLength` and `maxlength`.
`maxLength` is the recommended way to specify this option, but Mongoose also supports
`maxlength` (lowercase "l").

## `SchemaStringOptions.prototype.minLength`

### Type

- \<number\>

If set, Mongoose will add a custom validator that ensures the given
string's `length` is at least the given number.

Mongoose supports two different spellings for this option: `minLength` and `minlength`.
`minLength` is the recommended way to specify this option, but Mongoose also supports
`minlength` (lowercase "l").

## `SchemaStringOptions.prototype.populate`

### Type

- \<object\>

Sets default [populate options](https://mongoosejs.com/docs/populate.html#query-conditions).

## `SchemaStringOptions.prototype.trim`

### Type

- \<boolean\>

If truthy, Mongoose will add a [custom setter](https://mongoosejs.com/docs/api/schematype.md#SchemaType.prototype.set()) that removes leading and trailing
whitespace using [JavaScript's built-in `String#trim()`](https://masteringjs.io/tutorials/fundamentals/trim-string).

## `SchemaStringOptions.prototype.uppercase`

### Type

- \<boolean\>

If truthy, Mongoose will add a custom setter that uppercases this string
using JavaScript's built-in [`String#toUpperCase()`](https://masteringjs.io/tutorials/fundamentals/uppercase).
