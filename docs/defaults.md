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

By default, mongoose only applies defaults when you create a new document.
It will **not** set defaults if you use `update()` and
`findOneAndUpdate()`. However, mongoose 4.x lets you opt-in to this
behavior using the `setDefaultsOnInsert` option.

#### Important

The `setDefaultsOnInsert` option relies on the
[MongoDB `$setOnInsert` operator](https://docs.mongodb.org/manual/reference/operator/update/setOnInsert/).
The `$setOnInsert` operator was introduced in MongoDB 2.4. If you're
using MongoDB server < 2.4.0, do **not** use `setDefaultsOnInsert`.

```javascript
[require:The `setDefaultsOnInsert` option]
```

### Default functions and `this`

Unless it is running on a query with `setDefaultsOnInsert`, a default
function's `this` refers to the document.

```javascript
[require:Default functions and `this`]
```