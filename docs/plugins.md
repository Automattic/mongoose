Plugins
====================

`Schema`s are pluggable, that is, they allow for applying pre-packaged
capabilities to extend their functionality.

Suppose that we have several collections in our database and want
to add last-modified functionality to each one. With plugins this
is easy. Just create a plugin once and apply it to each `Schema`:

    // lastMod.js
    module.exports = exports = function lastModifiedPlugin (schema, options) {
      schema.add({ lastMod: Date })

      schema.pre('save', function (next) {
        this.lastMod = new Date
        next()
      })

      if (options && options.index) {
        schema.path('lastMod').index(options.index)
      }
    }

    // in your schema files
    var lastMod = require('./lastMod');

    var Game = new Schema({ ... });

    Game.plugin(lastMod);

    var Player = new Schema({ ... });

    Player.plugin(lastMod, { index: true });

In the example above we added last-modified functionality to both the Game
and Player schemas. We also took advantage of options passing supported by
the `plugin()` method to dynamically define an index on the Player.
