# SchemaBufferOptions

- [`SchemaBufferOptions()`](#SchemaBufferOptions())
- [`SchemaBufferOptions.prototype.subtype`](#SchemaBufferOptions.prototype.subtype)

## `SchemaBufferOptions()`

### Type

- \<constructor\>

### Inherits

- [SchemaTypeOptions](schematypeoptions.md)

The options defined on a Buffer schematype.

#### Example:

    const schema = new Schema({ bitmap: Buffer });
    schema.path('bitmap').options; // SchemaBufferOptions instance

## `SchemaBufferOptions.prototype.subtype`

### Type

- \<number\>

Set the default subtype for this buffer.
