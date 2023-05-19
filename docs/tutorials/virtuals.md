# Mongoose Virtuals

In Mongoose, a virtual is a property that is **not** stored in MongoDB. 
Virtuals are typically used for computed properties on documents.

* [Your First Virtual](#your-first-virtual)
* [Virtual Setters](#virtual-setters)
* [Virtuals in JSON](#virtuals-in-json)
* [Virtuals with Lean](#virtuals-with-lean)
* [Limitations](#limitations)
* [Populate](#populate)
* [Virtuals via schema options](#virtuals-via-schema-options)
* [Further Reading](#further-reading)

## Your First Virtual

Suppose you have a `User` model. Every user has an `email`, but you also
want the email's domain. For example, the domain portion of 
'test@gmail.com' is 'gmail.com'.

Below is one way to implement the `domain` property using a virtual.
You define virtuals on a schema using the [`Schema#virtual()` function](../api/schema.html#schema_Schema-virtual).

```acquit
[require:Virtuals.*basic]
```

The `Schema#virtual()` function returns a [`VirtualType` object](../api/virtualtype.html). Unlike normal document properties,
virtuals do not have any underlying value and Mongoose does not do
any type coercion on virtuals. However, virtuals do have
[getters and setters](getters-setters.html), which make
them ideal for computed properties, like the `domain` example above.

## Virtual Setters

You can also use virtuals to set multiple properties at once as an
alternative to [custom setters on normal properties](getters-setters.html#setters). For example, suppose
you have two string properties: `firstName` and `lastName`. You can
create a virtual property `fullName` that lets you set both of
these properties at once. The key detail is that, in virtual getters and
setters, `this` refers to the document the virtual is attached to.

```acquit
[require:Virtuals.*fullName]
```

## Virtuals in JSON

By default, Mongoose does not include virtuals when you convert a document to JSON.
For example, if you pass a document to [Express'  `res.json()` function](http://expressjs.com/en/4x/api.html#res.json), virtuals will **not** be included by default.

To include virtuals in `res.json()`, you need to set the
[`toJSON` schema option](../guide.html#toJSON) to `{ virtuals: true }`.

```acquit
[require:Virtuals.*toJSON]
```

## Virtuals in `console.log()`

By default, Mongoose does **not** include virtuals in `console.log()` output.
To include virtuals in `console.log()`, you need to set the [`toObject` schema option](../guide.html#toObject) to `{ virtuals: true }`, or use `toObject()` before printing the object.

```javascript
console.log(doc.toObject({ virtuals: true }));
```

## Virtuals with Lean

Virtuals are properties on Mongoose documents. If you use the
[lean option](lean.html), that means your queries return POJOs
rather than full Mongoose documents. That means no virtuals if you use
[`lean()`](../api/query.html#query_Query-lean).

```acquit
[require:Virtuals.*lean]
```

If you use `lean()` for performance, but still need virtuals, Mongoose
has an
[officially supported `mongoose-lean-virtuals` plugin](https://plugins.mongoosejs.io/plugins/lean-virtuals)
that decorates lean documents with virtuals.

## Limitations

Mongoose virtuals are **not** stored in MongoDB, which means you can't query
based on Mongoose virtuals.

```acquit
[require:Virtuals.*in query]
```

If you want to query by a computed property, you should set the property using
a [custom setter](getters-setters.html) or [pre save middleware](../middleware.html).

## Populate

Mongoose also supports [populating virtuals](../populate.html). A populated
virtual contains documents from another collection. To define a populated
virtual, you need to specify:

- The `ref` option, which tells Mongoose which model to populate documents from.
- The `localField` and `foreignField` options. Mongoose will populate documents from the model in `ref` whose `foreignField` matches this document's `localField`.

```acquit
[require:Virtuals.*populate]
```

## Virtuals via schema options

Virtuals can also be defined in the schema-options directly without having to use [`.virtual`](../api/schema.html#Schema.prototype.virtual):

```acquit
[require:Virtuals.*schema-options fullName]
```

The same also goes for virtual options, like virtual populate:

```acquit
[require:Virtuals.*schema-options populate]
```

## Further Reading

* [Virtuals in Mongoose Schemas](../guide.html#virtuals)
* [Populate Virtuals](../populate.html#populate-virtuals)
* [Mongoose Lean Virtuals plugin](https://plugins.mongoosejs.io/plugins/lean-virtuals)
* [Getting Started With Mongoose Virtuals](https://masteringjs.io/tutorials/mongoose/virtuals)
* [Understanding Virtuals in Mongoose](https://futurestud.io/tutorials/understanding-virtuals-in-mongoose)
