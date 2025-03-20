# Migrating from 8.x to 9.x

<style>
  ul > li {
    padding: 4px 0px;
  }
</style>

There are several backwards-breaking changes you should be aware of when migrating from Mongoose 8.x to Mongoose 9.x.

If you're still on Mongoose 7.x or earlier, please read the [Mongoose 7.x to 8.x migration guide](migrating_to_8.html) and upgrade to Mongoose 8.x first before upgrading to Mongoose 9.

## `Schema.prototype.doValidate()` now returns a promise

`Schema.prototype.doValidate()` now returns a promise that rejects with a validation error if one occurred.
In Mongoose 8.x, `doValidate()` took a callback and did not return a promise.

```javascript
// Mongoose 8.x function signature
function doValidate(value, cb, scope, options) {}

// Mongoose 8.x example usage
schema.doValidate(value, function(error) {
  if (error) {
    // Handle validation error
  }
}, scope, options);

// Mongoose 9.x function signature
async function doValidate(value, scope, options) {}

// Mongoose 9.x example usage
try {
  await schema.doValidate(value, scope, options);
} catch (error) {
  // Handle validation error
}
```

## Errors in middleware functions take priority over `next()` calls

In Mongoose 8.x, if a middleware function threw an error after calling `next()`, that error would be ignored.

```javascript
schema.pre('save', function(next) {
  next();
  // In Mongoose 8, this error will not get reported, because you already called next()
  throw new Error('woops!');
});
```

In Mongoose 9, errors in the middleware function take priority, so the above `save()` would throw an error.
