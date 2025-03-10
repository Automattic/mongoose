# Migrating from 8.x to 9.x

<style>
  ul > li {
    padding: 4px 0px;
  }
</style>

There are several backwards-breaking changes you should be aware of when migrating from Mongoose 8.x to Mongoose 9.x.

If you're still on Mongoose 7.x or earlier, please read the [Mongoose 7.x to 8.x migration guide](migrating_to_8.html) and upgrade to Mongoose 8.x first before upgrading to Mongoose 9.

## `Schema.prototype.doValidate()` now returns a promise
