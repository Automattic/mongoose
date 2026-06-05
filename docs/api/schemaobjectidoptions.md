# SchemaObjectIdOptions

- [`SchemaObjectIdOptions()`](#SchemaObjectIdOptions())
- [`SchemaObjectIdOptions.prototype.auto`](#SchemaObjectIdOptions.prototype.auto)
- [`SchemaObjectIdOptions.prototype.populate`](#SchemaObjectIdOptions.prototype.populate)

## `SchemaObjectIdOptions()`

### Type

- \<constructor\>

### Inherits

- [SchemaTypeOptions](schematypeoptions.md)

The options defined on an ObjectId schematype.

#### Example:

    const schema = new Schema({ testId: mongoose.ObjectId });
    schema.path('testId').options; // SchemaObjectIdOptions instance

## `SchemaObjectIdOptions.prototype.auto`

### Type

- \<boolean\>

If truthy, uses Mongoose's default built-in ObjectId path.

## `SchemaObjectIdOptions.prototype.populate`

### Type

- \<object\>

Sets default [populate options](https://mongoosejs.com/docs/populate.html#query-conditions).

#### Example:

    const schema = new Schema({
      child: {
        type: 'ObjectId',
        ref: 'Child',
        populate: { select: 'name' }
      }
    });
    const Parent = mongoose.model('Parent', schema);

    // Automatically adds `.select('name')`
    Parent.findOne().populate('child');
