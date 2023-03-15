# Plugins

Schemas are pluggable, that is, they allow for applying pre-packaged capabilities to extend their functionality. This is a very powerful feature.

<ul class="toc">
  <li><a href="#example">Example</a></li>
  <li><a href="#global">Global Plugins</a></li>
  <li><a href="#apply-plugins-before-compiling-models">Apply Plugins Before Compiling Models</a></li>
  <li><a href="#official">Officially Supported Plugins</a></li>
</ul>

<h2 id="example"><a href="#example">Example</a></h2>

Plugins are a tool for reusing logic in multiple schemas. Suppose you have
several models in your database and want to add a `loadedAt` property
to each one. Just create a plugin once and apply it to each `Schema`:

```javascript
// loadedAt.js
module.exports = function loadedAtPlugin(schema, options) {
  schema.virtual('loadedAt').
    get(function() { return this._loadedAt; }).
    set(function(v) { this._loadedAt = v; });

  schema.post(['find', 'findOne'], function(docs) {
    if (!Array.isArray(docs)) {
      docs = [docs];
    }
    const now = new Date();
    for (const doc of docs) {
      doc.loadedAt = now;
    }
  });
};

// game-schema.js
const loadedAtPlugin = require('./loadedAt');
const gameSchema = new Schema({ /* ... */ });
gameSchema.plugin(loadedAtPlugin);

// player-schema.js
const loadedAtPlugin = require('./loadedAt');
const playerSchema = new Schema({ /* ... */ });
playerSchema.plugin(loadedAtPlugin);
```

We just added last-modified behavior to both our `Game` and `Player` schemas and declared an index on the `lastMod` path of our Games to boot. Not bad for a few lines of code.

<h2 id="global"><a href="#global">Global Plugins</a></h2>

Want to register a plugin for all schemas? The mongoose singleton has a
`.plugin()` function that registers a plugin for every schema. For
example:

```javascript
const mongoose = require('mongoose');
mongoose.plugin(require('./loadedAt'));

const gameSchema = new Schema({ /* ... */ });
const playerSchema = new Schema({ /* ... */ });
// `loadedAtPlugin` gets attached to both schemas
const Game = mongoose.model('Game', gameSchema);
const Player = mongoose.model('Player', playerSchema);
```

<h2 id="apply-plugins-before-compiling-models"><a href="#apply-plugins-before-compiling-models">Apply Plugins Before Compiling Models</a></h2>

Because many plugins rely on [middleware](middleware.html), you should make sure to apply plugins **before**
you call `mongoose.model()` or `conn.model()`. Otherwise, [any middleware the plugin registers won't get applied](middleware.html#defining).

```javascript
// loadedAt.js
module.exports = function loadedAtPlugin(schema, options) {
  schema.virtual('loadedAt').
    get(function() { return this._loadedAt; }).
    set(function(v) { this._loadedAt = v; });

  schema.post(['find', 'findOne'], function(docs) {
    if (!Array.isArray(docs)) {
      docs = [docs];
    }
    const now = new Date();
    for (const doc of docs) {
      doc.loadedAt = now;
    }
  });
};

// game-schema.js
const loadedAtPlugin = require('./loadedAt');
const gameSchema = new Schema({ /* ... */ });
const Game = mongoose.model('Game', gameSchema);

// `find()` and `findOne()` hooks from `loadedAtPlugin()` won't get applied
// because `mongoose.model()` was already called!
gameSchema.plugin(loadedAtPlugin);
```

<h2 id="official"><a href="#official">Officially Supported Plugins</a></h2>

The Mongoose team maintains several plugins that add cool new features to
Mongoose. Here's a couple:

* [mongoose-autopopulate](http://plugins.mongoosejs.io/plugins/autopopulate): Always [`populate()`](populate.html) certain fields in your Mongoose schemas.
* [mongoose-lean-virtuals](http://plugins.mongoosejs.io/plugins/lean-virtuals): Attach virtuals to the results of Mongoose queries when using [`.lean()`](api/query.html#query_Query-lean).
* [mongoose-cast-aggregation](https://www.npmjs.com/package/mongoose-cast-aggregation)

You can find a full list of officially supported plugins on [Mongoose's plugins search site](https://plugins.mongoosejs.io/).

## Community!

Not only can you re-use schema functionality in your own projects, but you
also reap the benefits of the Mongoose community as well. Any plugin
published to [npm](https://npmjs.org/) and with
'mongoose' as an [npm keyword](https://docs.npmjs.com/files/package.json#keywords)
will show up on our [search results](http://plugins.mongoosejs.io) page.
