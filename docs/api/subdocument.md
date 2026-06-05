# Subdocument

- [`Subdocument.prototype.$parent()`](#Subdocument.prototype.$parent())
- [`Subdocument.prototype.$toObject()`](#Subdocument.prototype.$toObject())
- [`Subdocument.prototype.deleteOne()`](#Subdocument.prototype.deleteOne())
- [`Subdocument.prototype.inspect()`](#Subdocument.prototype.inspect())
- [`Subdocument.prototype.ownerDocument()`](#Subdocument.prototype.ownerDocument())
- [`Subdocument.prototype.parent()`](#Subdocument.prototype.parent())

## `Subdocument.prototype.$parent()`

Returns this sub-documents parent document.

## `Subdocument.prototype.$toObject()`

Override `$toObject()` to handle minimizing the whole path. Should not minimize if schematype-level minimize
is set to false re: gh-11247, gh-14058, gh-14151

## `Subdocument.prototype.deleteOne()`

### Parameters

- `[options]` \<object\>

Null-out this subdoc

## `Subdocument.prototype.inspect()`

Helper for console.log

## `Subdocument.prototype.ownerDocument()`

### Returns

- \<Document\>

Returns the top level document of this sub-document.

## `Subdocument.prototype.parent()`

Returns this sub-documents parent document.
