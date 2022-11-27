# Using Mongoose with Lodash

For the most part, Mongoose works well with [Lodash](https://lodash.com/).
However, there are a few caveats that you should know about.

* [`cloneDeep()`](#clonedeep)

## `cloneDeep()`

You should not use [Lodash's `cloneDeep()` function](https://lodash.com/docs/4.17.15#cloneDeep) on any Mongoose objects.
This includes [connections](connections.html), [model classes](models.html), and [queries](queries.html), but is _especially_ important for [documents](documents.html).
For example, you may be tempted to do the following:

```javascript
const _ = require('lodash');

const doc = await MyModel.findOne();

const newDoc = _.cloneDeep(doc);
newDoc.myProperty = 'test';
await newDoc.save();
```

However, the above code will throw the following error if `MyModel` has any array properties.

```no-highlight
TypeError: this.__parentArray.$path is not a function
```

This is because Lodash's `cloneDeep()` function doesn't [handle proxies](https://stackoverflow.com/questions/50663784/lodash-clonedeep-remove-proxy-from-object), and [Mongoose arrays are proxies as of Mongoose 6](https://thecodebarbarian.com/introducing-mongoose-6.html#arrays-as-proxies).
You typically don't have to deep clone Mongoose documents, but, if you have to, use the following alternative to `cloneDeep()`:

```javascript
const doc = await MyModel.findOne();

const newDoc = new MyModel().init(doc.toObject());
newDoc.myProperty = 'test';
await newDoc.save();
```
