# DocumentArray

- [`MongooseDocumentArray.prototype.create()`](#MongooseDocumentArray.prototype.create())
- [`MongooseDocumentArray.prototype.id()`](#MongooseDocumentArray.prototype.id())
- [`MongooseDocumentArray.prototype.inspect()`](#MongooseDocumentArray.prototype.inspect())
- [`MongooseDocumentArray.prototype.pull()`](#MongooseDocumentArray.prototype.pull())
- [`MongooseDocumentArray.prototype.push()`](#MongooseDocumentArray.prototype.push())
- [`MongooseDocumentArray.prototype.toObject()`](#MongooseDocumentArray.prototype.toObject())

## `MongooseDocumentArray.prototype.create()`

### Parameters

- `obj` \<object\> the value to cast to this arrays SubDocument schema

Creates a subdocument casted to this schema.

This is the same subdocument constructor used for casting.

## `MongooseDocumentArray.prototype.id()`

### Parameters

- `id` \<ObjectId|string|number|Buffer\>

### Returns

- \<EmbeddedDocument,null\> the subdocument or null if not found.

Searches array items for the first document with a matching _id.

#### Example:

    const embeddedDoc = m.array.id(some_id);

## `MongooseDocumentArray.prototype.inspect()`

Helper for console.log

## `MongooseDocumentArray.prototype.pull()`

### Parameters

- `[...args]` \<object\>

Pulls items from the array atomically.

## `MongooseDocumentArray.prototype.push()`

### Parameters

- `[...args]` \<object\>

Wraps [`Array#push`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/push) with proper change tracking.

## `MongooseDocumentArray.prototype.toObject()`

### Parameters

- `[options]` \<object\> optional options to pass to each documents `toObject` method call during conversion

### Returns

- \<Array\>

Returns a native js Array of plain js objects

#### Note:

_Each sub-document is converted to a plain object by calling its `#toObject` method._
