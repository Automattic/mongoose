# Deprecation Warnings

## `Document.prototype.validateSync()`

`Document.prototype.validateSync()` is deprecated and will be removed in Mongoose 10.
Use `Document.prototype.validate()` instead.

`validateSync()` does not run validate middleware, and it skips asynchronous validators.
