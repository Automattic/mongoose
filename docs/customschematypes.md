# Custom Schema Types

## Creating a Basic Custom Schema Type

_New in Mongoose 4.4.0:_ Mongoose supports custom types. Before you
reach for a custom type, however, know that a custom type is overkill
for most use cases. You can do most basic tasks with
[custom getters/setters](http://mongoosejs.com/docs/2.7.x/docs/getters-setters.html),
[virtuals](http://mongoosejs.com/docs/guide.html#virtuals), and
[single embedded docs](http://mongoosejs.com/docs/subdocs.html#single-embedded).

Let's take a look at an example of a basic schema type: a 1-byte integer.
To create a new schema type, you need to inherit from `mongoose.SchemaType`
and add the corresponding property to `mongoose.Schema.Types`. The one
method you need to implement is the `cast()` method.

```acquit
[require:Creating a Basic Custom Schema Type]
```
