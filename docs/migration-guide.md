
Migrating from v1.x to 2.x
==========================

Migrating from __v1.x__ to __2.x__ brings with it a few changes to be aware of.

## Auto-reconnect

Previously the `auto_reconnect` option of the node-mongodb-driver
defaulted to false. It now defaults to true so if your connection drops
while your app is running the driver will continue retrying until it
can connect again.

## Private props

Several internal instance props have had name changes so its more obvious that
they are not intended for public use. Namely `instance.doc` has changed
to `instance._doc` since it contains the structure Mongoose relies on
to operate properly and should only be manipulated with caution.

Here are the relavent changes:

    var thing = new Thing;

    thing.doc             -> thing._doc
    thing.activePaths     -> thing._activePaths
    thing.saveError       -> thing._saveError
    thing.validationError -> thing._validationError

## Circular refs in getters

Previously Mongoose exibited very odd behavior with getters:

    toy.color.color.color.color ... // actually worked!

Obviously this was wrong and has now been fixed.

    toy.color.color // undefined

## Getter / Setter scope

Nested getter/setter scopes were set incorrectly since version 1.7 or so.
This has been fixed. In your getter/setter, `this` now properly refers
to the instance.

    var SongSchema = new Schema({
        title: String
      , detail: {
            format: String
        }
    });

    SongSchema.path('detail.format').get(function () {
      console.log(this !== this.detail) // true, used to be false
    });

You may not have noticed this bug since the circular getters previously
masked (_mostly_) this bad behavior.

## Setters application

Setters are no longer applied when the doc returns from the db (bug). It
caused problems for folks trying to use setters for passwords / salts
resulting in doubly hashed passwords after queries.

    UserSchema.path('password').set(function (val) {
      // now only runs when you change `user.password`
      // not when the doc returns from the db
    });

## Query#bind

If you were using the `Query` object directly and calling its `bind`
method, the v1.x behavior cloned the query and returned the
new one. This is no longer the case. The query is now simply
bound and returns itself.

## Multiple collection support removed

In 1.x Mongoose had support for multiple collection names per model. This
was an edge case and support for it has been removed.

## Compat.js removed

Backward compatibility with verions 0.x has been removed.

    require('mongoose').compat = true // no longer does anything

## Utils.erase removed

We removed utils.erase since it was unused in the project. If you were
using it you'll need to copy it from the 1.x branch into your own.

## Error handling

Previously, the error returned after failed validation contained an `errors`
object which was a hash of path keys to error message values.
Now the Error returned is more helpful. Instead of the `errors`
object containing string values it holds the actual
ValidatorError. Each ValidatorError has a `type` and `path` property
providing us with a little more error handling flexibility.

    var ToySchema = new Schema({
        color: String
      , name: String
    });

    var Toy = db.model('Toy', ToySchema);

    Toy.schema.path('name').validate(function (value) {
      return /blue|green|white|red|orange|periwinkel/i.test(value);
    }, 'Invalid color');

    var toy = new Toy({ color: 'grease'});

    toy.save(function (err) {
      // previous behavior (v1x):

      console.log(err.errors.color)
      // prints 'Validator "Invalid color" failed for path color'

      // new v2x behavior - err.errors.color is a ValidatorError object

      console.log(err.errors.color.message)
      // prints 'Validator "Invalid color" failed for path color'

      // you can get v1 behavior back by casting error.color toString

      console.log(String(err.errors.color))
      // prints 'Validator "Invalid color" failed for path color'

      console.log(err.errors.color.type);
      // prints "Invalid color"

      console.log(err.errors.color.path)
      // prints "color"

      console.log(err.name)
      // prints "ValidationError"

      console.log(err.message)
      // prints "Validation failed"
    });

BTW, the `err.errors` object is also available on the model instance.

    toy.errors.color.message === err.errors.color.message

