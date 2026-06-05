# Buffer

- [`MongooseBuffer.mixin.copy()`](#MongooseBuffer.mixin.copy())
- [`MongooseBuffer.mixin.equals()`](#MongooseBuffer.mixin.equals())
- [`MongooseBuffer.mixin.subtype()`](#MongooseBuffer.mixin.subtype())
- [`MongooseBuffer.mixin.toBSON()`](#MongooseBuffer.mixin.toBSON())
- [`MongooseBuffer.mixin.toObject()`](#MongooseBuffer.mixin.toObject())
- [`MongooseBuffer.mixin.toUUID()`](#MongooseBuffer.mixin.toUUID())
- [`MongooseBuffer.mixin.write()`](#MongooseBuffer.mixin.write())

## `MongooseBuffer.mixin.copy()`

### Parameters

- `target` \<Buffer\>

### Returns

- \<number\> The number of bytes copied.

### Type

- \<property\>

Copies the buffer.

#### Note:

`Buffer#copy` does not mark `target` as modified so you must copy from a `MongooseBuffer` for it to work as expected. This is a work around since `copy` modifies the target, not this.

## `MongooseBuffer.mixin.equals()`

### Parameters

- `other` \<Buffer\>

### Returns

- \<boolean\>

Determines if this buffer is equals to `other` buffer

## `MongooseBuffer.mixin.subtype()`

### Parameters

- `subtype` \<Hex\>

### See

- [bsonspec](https://bsonspec.org/#/specification)

Sets the subtype option and marks the buffer modified.

#### SubTypes:

    const bson = require('bson')
    bson.BSON_BINARY_SUBTYPE_DEFAULT
    bson.BSON_BINARY_SUBTYPE_FUNCTION
    bson.BSON_BINARY_SUBTYPE_BYTE_ARRAY
    bson.BSON_BINARY_SUBTYPE_UUID
    bson.BSON_BINARY_SUBTYPE_MD5
    bson.BSON_BINARY_SUBTYPE_USER_DEFINED

    doc.buffer.subtype(bson.BSON_BINARY_SUBTYPE_UUID);

## `MongooseBuffer.mixin.toBSON()`

### Returns

- \<Binary\>

Converts this buffer for storage in MongoDB, including subtype

## `MongooseBuffer.mixin.toObject()`

### Parameters

- `[subtype]` \<Hex\>

### Returns

- \<Binary\>

### See

- [bsonspec](https://bsonspec.org/#/specification)

Converts this buffer to its Binary type representation.

#### SubTypes:

    const mongodb = require('mongodb')
    mongodb.BSON.BSON_BINARY_SUBTYPE_DEFAULT
    mongodb.BSON.BSON_BINARY_SUBTYPE_FUNCTION
    mongodb.BSON.BSON_BINARY_SUBTYPE_BYTE_ARRAY
    mongodb.BSON.BSON_BINARY_SUBTYPE_UUID
    mongodb.BSON.BSON_BINARY_SUBTYPE_MD5
    mongodb.BSON.BSON_BINARY_SUBTYPE_USER_DEFINED
    doc.buffer.toObject(mongodb.BSON.BSON_BINARY_SUBTYPE_USER_DEFINED);

## `MongooseBuffer.mixin.toUUID()`

### Returns

- \<UUID\>

Converts this buffer to a UUID. Throws an error if subtype is not 4.

## `MongooseBuffer.mixin.write()`

### Type

- \<property\>

Writes the buffer.
