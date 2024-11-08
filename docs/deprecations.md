# Deprecation Warnings

There are several deprecations in the [MongoDB Node.js driver](http://npmjs.com/package/mongodb)
that Mongoose users should be aware of. Mongoose provides options to work
around these deprecation warnings, but you need to test whether these options
cause any problems for your application. Please [report any issues on GitHub](https://github.com/Automattic/mongoose/issues/new).

## Summary {#summary}

To fix all deprecation warnings, follow the below steps:

* Replace `rawResult: true` with `includeResultMetadata: true` in `findOneAndUpdate()`, `findOneAndReplace()`, `findOneAndDelete()` calls.

Read below for more a more detailed description of each deprecation warning.

## `rawResult` {#rawresult}

As of Mongoose 7.4.0, the `rawResult` option to `findOneAndUpdate()` is deprecated.
You should instead use the `includeResultMetadata` option, which the MongoDB Node.js driver's new option that replaces `rawResult`.

```javascript
// Replace this:
const doc = await Test.findOneAndUpdate(
  { name: 'Test' },
  { name: 'Test Testerson' },
  { rawResult: true }
);

// With this:
const doc = await Test.findOneAndUpdate(
  { name: 'Test' },
  { name: 'Test Testerson' },
  { includeResultMetadata: true }
);
```

The `rawResult` option only affects Mongoose; the MongoDB Node.js driver still returns the full result metadata, Mongoose just parses out the raw document.
The `includeResultMetadata` option also tells the MongoDB Node.js driver to only return the document, not the full `ModifyResult` object.
