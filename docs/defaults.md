## Defaults

### Declaring Defaults in Your Schema

Your schemas can define default values for certain paths. If you create
a new document without that path set, the default will kick in.

Note: Mongoose only applies a default if the value of the path is
strictly `undefined`.

```javascript
[require:Declaring defaults in your schema]
```

### Default Functions

You can also set the `default` schema option to a function. Mongoose will
execute that function and use the return value as the default.

```javascript
[require:Default functions]
```

### The `setDefaultsOnInsert` Option

Mongoose also sets defaults on `update()` and `findOneAndUpdate()` when the `upsert` option is set by adding your schema's defaults to a [MongoDB `$setOnInsert` operator](https://docs.mongodb.org/manual/reference/operator/update/setOnInsert/).
You can disable this behavior by setting the `setDefaultsOnInsert` option to `false`.

```javascript
[require:The `setDefaultsOnInsert` option]
```

You can also set `setDefaultsOnInsert` to `false` globally:

```javascript
mongoose.set('setDefaultsOnInsert', false);
```

### Default functions and `this`

Unless it is running on a query with `setDefaultsOnInsert`, a default
function's `this` refers to the document.

```javascript
[require:Default functions and `this`]
```
