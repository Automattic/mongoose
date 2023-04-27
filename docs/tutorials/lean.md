# Faster Mongoose Queries With Lean

The [lean option](../api/query.html#query_Query-lean) tells Mongoose to skip
[hydrating](../api/model.html#model_Model-hydrate) the result documents. This
makes queries faster and less memory intensive, but the result documents are
plain old JavaScript objects (POJOs), **not** [Mongoose documents](../documents.html).
In this tutorial, you'll learn more about the tradeoffs of using `lean()`.

* [Using Lean](#using-lean)
* [Lean and Populate](#lean-and-populate)
* [When to Use Lean](#when-to-use-lean)
* [Plugins](#plugins)
* [BigInts](#bigints)

<h2 id="using-lean"><a href="#using-lean">Using Lean</a></h2>

By default, Mongoose queries return an instance of the
[Mongoose `Document` class](../api/document.html#Document). Documents are much
heavier than vanilla JavaScript objects, because they have a lot of internal
state for change tracking. Enabling the `lean` option tells Mongoose to skip
instantiating a full Mongoose document and just give you the POJO.

```javascript
const leanDoc = await MyModel.findOne().lean();
```

How much smaller are lean documents? Here's a comparison.

```acquit
[require:Lean Tutorial.*compare sizes]
```

Under the hood, after executing a query, Mongoose converts the query results
from POJOs to Mongoose documents. If you turn on the `lean` option, Mongoose
skips this step.

```acquit
[require:Lean Tutorial.*compare types]
```

The downside of enabling `lean` is that lean docs don't have:

* Change tracking
* Casting and validation
* Getters and setters
* Virtuals
* `save()`

For example, the following code sample shows that the `Person` model's getters
and virtuals don't run if you enable `lean`.

```acquit
[require:Lean Tutorial.*getters and virtuals]
```

<h2 id="lean-and-populate"><a href="#lean-and-populate">Lean and Populate</a></h2>

[Populate](../populate.html) works with `lean()`. If you
use both `populate()` and `lean()`, the `lean` option propagates to the
populated documents as well. In the below example, both the top-level
'Group' documents and the populated 'Person' documents will be lean.

```acquit
[require:Lean Tutorial.*conventional populate]
```

[Virtual populate](../populate.html#populate-virtuals) also works with lean.

```acquit
[require:Lean Tutorial.*virtual populate]
```

<h2 id="when-to-use-lean"><a href="#when-to-use-lean">When to Use Lean</a></h2>

If you're executing a query and sending the results without modification to,
say, an [Express response](http://expressjs.com/en/4x/api.html#res), you should
use lean. In general, if you do not modify the query results and do not use
[custom getters](../api/schematype.html#schematype_SchemaType-get), you should use
`lean()`. If you modify the query results or rely on features like getters
or [transforms](../api/document.html#document_Document-toObject), you should not
use `lean()`.

Below is an example of an [Express route](http://expressjs.com/en/guide/routing.html)
that is a good candidate for `lean()`. This route does not modify the `person`
doc and doesn't rely on any Mongoose-specific functionality.

```javascript
// As long as you don't need any of the Person model's virtuals or getters,
// you can use `lean()`.
app.get('/person/:id', function(req, res) {
  Person.findOne({ _id: req.params.id }).lean().
    then(person => res.json({ person })).
    catch(error => res.json({ error: error.message }));
});
```

Below is an example of an Express route that should **not** use `lean()`. As
a general rule of thumb, `GET` routes are good candidates for `lean()` in a
[RESTful API](https://en.wikipedia.org/wiki/Representational_state_transfer).
On the other hand, `PUT`, `POST`, etc. routes generally should not use `lean()`.

```javascript
// This route should **not** use `lean()`, because lean means no `save()`.
app.put('/person/:id', function(req, res) {
  Person.findOne({ _id: req.params.id }).
    then(person => {
      assert.ok(person);
      Object.assign(person, req.body);
      return person.save();
    }).
    then(person => res.json({ person })).
    catch(error => res.json({ error: error.message }));
});
```

Remember that virtuals do **not** end up in `lean()` query results. Use the
[mongoose-lean-virtuals plugin](http://plugins.mongoosejs.io/plugins/lean-virtuals)
to add virtuals to your lean query results.

## Plugins

Using `lean()` bypasses all Mongoose features, including [virtuals](virtuals.html), [getters/setters](getters-setters.html),
and [defaults](../api/schematype.html#schematype_SchemaType-default). If you want to
use these features with `lean()`, you need to use the corresponding plugin:

- [mongoose-lean-virtuals](https://plugins.mongoosejs.io/plugins/lean-virtuals)
- [mongoose-lean-getters](https://plugins.mongoosejs.io/plugins/lean-getters)
- [mongoose-lean-defaults](https://www.npmjs.com/package/mongoose-lean-defaults)

However, you need to keep in mind that Mongoose does not hydrate lean documents,
so `this` will be a POJO in virtuals, getters, and default functions.

```javascript
const schema = new Schema({ name: String });
schema.plugin(require('mongoose-lean-virtuals'));

schema.virtual('lowercase', function() {
  this instanceof mongoose.Document; // false

  this.name; // Works
  this.get('name'); // Crashes because `this` is not a Mongoose document.
});
```

## BigInts

By default, the MongoDB Node driver converts longs stored in MongoDB into JavaScript numbers, **not** [BigInts](https://thecodebarbarian.com/an-overview-of-bigint-in-node-js.html).
Set the `useBigInt64` option on your `lean()` queries to inflate longs into BigInts.

```acquit
[require:Lean Tutorial.*bigint]
```