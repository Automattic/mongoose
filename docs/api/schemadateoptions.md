# SchemaDateOptions

- [`SchemaDateOptions()`](#SchemaDateOptions())
- [`SchemaDateOptions.prototype.expires`](#SchemaDateOptions.prototype.expires)
- [`SchemaDateOptions.prototype.max`](#SchemaDateOptions.prototype.max)
- [`SchemaDateOptions.prototype.min`](#SchemaDateOptions.prototype.min)

## `SchemaDateOptions()`

### Type

- \<constructor\>

### Inherits

- [SchemaTypeOptions](schematypeoptions.md)

The options defined on a Date schematype.

#### Example:

    const schema = new Schema({ startedAt: Date });
    schema.path('startedAt').options; // SchemaDateOptions instance

## `SchemaDateOptions.prototype.expires`

### Type

- \<Date\>

If set, Mongoose creates a TTL index on this path.

mongo TTL index `expireAfterSeconds` value will take 'expires' value expressed in seconds.

#### Example:

    const schema = new Schema({ "expireAt": { type: Date,  expires: 11 } });
    // if 'expireAt' is set, then document expires at expireAt + 11 seconds

## `SchemaDateOptions.prototype.max`

### Type

- \<Date\>

If set, Mongoose adds a validator that checks that this path is before the
given `max`.

## `SchemaDateOptions.prototype.min`

### Type

- \<Date\>

If set, Mongoose adds a validator that checks that this path is after the
given `min`.
