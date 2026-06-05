# SchemaNumberOptions

- [`SchemaNumberOptions()`](#SchemaNumberOptions())
- [`SchemaNumberOptions.prototype.enum`](#SchemaNumberOptions.prototype.enum)
- [`SchemaNumberOptions.prototype.max`](#SchemaNumberOptions.prototype.max)
- [`SchemaNumberOptions.prototype.min`](#SchemaNumberOptions.prototype.min)
- [`SchemaNumberOptions.prototype.populate`](#SchemaNumberOptions.prototype.populate)

## `SchemaNumberOptions()`

### Type

- \<constructor\>

### Inherits

- [SchemaTypeOptions](schematypeoptions.md)

The options defined on a Number schematype.

#### Example:

    const schema = new Schema({ count: Number });
    schema.path('count').options; // SchemaNumberOptions instance

## `SchemaNumberOptions.prototype.enum`

### Type

- \<Array\>

If set, Mongoose adds a validator that checks that this path is strictly
equal to one of the given values.

#### Example:

    const schema = new Schema({
      favoritePrime: {
        type: Number,
        enum: [3, 5, 7]
      }
    });
    schema.path('favoritePrime').options.enum; // [3, 5, 7]

## `SchemaNumberOptions.prototype.max`

### Type

- \<number\>

If set, Mongoose adds a validator that checks that this path is less than the
given `max`.

## `SchemaNumberOptions.prototype.min`

### Type

- \<number\>

If set, Mongoose adds a validator that checks that this path is at least the
given `min`.

## `SchemaNumberOptions.prototype.populate`

### Type

- \<object\>

Sets default [populate options](https://mongoosejs.com/docs/populate.html#query-conditions).

#### Example:

    const schema = new Schema({
      child: {
        type: Number,
        ref: 'Child',
        populate: { select: 'name' }
      }
    });
    const Parent = mongoose.model('Parent', schema);

    // Automatically adds `.select('name')`
    Parent.findOne().populate('child');
