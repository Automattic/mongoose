# Mongoose

Mongoose is a [MongoDB](https://www.mongodb.org/) object modeling tool designed to work in an asynchronous environment. Mongoose supports [Node.js](https://nodejs.org/en/) and [Deno](https://deno.land/) (alpha).

[![Build Status](https://github.com/Automattic/mongoose/workflows/Test/badge.svg)](https://github.com/Automattic/mongoose)
[![NPM version](https://badge.fury.io/js/mongoose.svg)](http://badge.fury.io/js/mongoose)
[![Deno version](https://deno.land/badge/mongoose/version)](https://deno.land/x/mongoose)
[![Deno popularity](https://deno.land/badge/mongoose/popularity)](https://deno.land/x/mongoose)

[![npm](https://nodei.co/npm/mongoose.png)](https://www.npmjs.com/package/mongoose)

## Documentation

The official documentation website is [mongoosejs.com](https://mongoosejs.com/).

Mongoose 9.0.0 was released on November 21, 2025. You can find more details on [backwards breaking changes in 9.0.0 on our docs site](https://mongoosejs.com/docs/migrating_to_9.html).

## Support

* [Stack Overflow](http://stackoverflow.com/questions/tagged/mongoose)
* [Bug Reports](https://github.com/Automattic/mongoose/issues/)
* [Mongoose Slack Channel](http://slack.mongoosejs.io/)
* [Help Forum](http://groups.google.com/group/mongoose-orm)
* [MongoDB Support](https://www.mongodb.com/docs/manual/support/)

## Plugins

Check out the [plugins search site](https://plugins.mongoosejs.io/) to see hundreds of related modules from the community. Next, learn how to write your own plugin from the [docs](https://mongoosejs.com/docs/plugins.html) or [this blog post](http://thecodebarbarian.com/2015/03/06/guide-to-mongoose-plugins).

## Contributors

Pull requests are always welcome! Please base pull requests against the `master`
branch and follow the [contributing guide](https://github.com/Automattic/mongoose/blob/master/CONTRIBUTING.md).

If your pull request makes documentation changes, please do **not**
modify any `.html` files. The `.html` files are compiled code, so please make
your changes in `docs/*.pug`, `lib/*.js`, or `test/docs/*.js`.

View all 400+ [contributors](https://github.com/Automattic/mongoose/graphs/contributors).

## Installation

First install [Node.js](https://nodejs.org/) and [MongoDB](https://www.mongodb.org/downloads), then install the `mongoose` package using your preferred package manager:

### Using npm

```sh
npm install mongoose
```

### Using pnpm

```sh
pnpm add mongoose
```

### Using Yarn

```sh
yarn add mongoose
```

### Using Bun

```sh
bun add mongoose
```

Mongoose 6.8.0 also includes alpha support for [Deno](https://deno.land/).

## Importing

```javascript
// Using Node.js `require()`
const mongoose = require('mongoose');

// Using ES6 imports
import mongoose from 'mongoose';
```

Or, using [Deno's `createRequire()` for CommonJS support](https://deno.land/std@0.113.0/node/README.md?source=#commonjs-modules-loading) as follows.

```javascript
import { createRequire } from 'https://deno.land/std@0.177.0/node/module.ts';
const require = createRequire(import.meta.url);

const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/test')
  .then(() => console.log('Connected!'));
```

You can then run the above script using the following.

```sh
deno run --allow-net --allow-read --allow-sys --allow-env mongoose-test.js
```

## Mongoose Studio

[Mongoose Studio](https://mongoosestudio.app?utm_source=mongoose&utm_medium=referral&utm_campaign=readme) is a free, fully open-source, browser-based MongoDB GUI built by the Mongoose team for apps that already use Mongoose. Install `@mongoosejs/studio` from npm and run it alongside your app as Express middleware, or deploy it on Vercel or Netlify, to browse and edit documents, query with your existing models and schemas with autocomplete, build dashboards, visualize and edit GeoJSON, and use AI-assisted MongoDB workflows without moving data into a hosted third-party workspace or sharing raw MongoDB connection strings.

## Mongoose for Enterprise

Available as part of the Tidelift Subscription

The maintainers of mongoose and thousands of other packages are working with Tidelift to deliver commercial support and maintenance for the open source dependencies you use to build your applications. Save time, reduce risk, and improve code health, while paying the maintainers of the exact dependencies you use. [Learn more.](https://tidelift.com/subscription/pkg/npm-mongoose?utm_source=npm-mongoose&utm_medium=referral&utm_campaign=enterprise&utm_term=repo)

## Overview

### Connecting to MongoDB

First, we need to define a connection. If your app uses only one database, you should use `mongoose.connect`. If you need to create additional connections, use `mongoose.createConnection`.

Both `connect` and `createConnection` take a `mongodb://` URI, or the parameters `host, database, port, options`.

```js
await mongoose.connect('mongodb://127.0.0.1/my_database');
```

Once connected, the `open` event is fired on the `Connection` instance. If you're using `mongoose.connect`, the `Connection` is `mongoose.connection`. Otherwise, `mongoose.createConnection` return value is a `Connection`.

**Note:** *If the local connection fails then try using 127.0.0.1 instead of localhost. Sometimes issues may arise when the local hostname has been changed.*

**Important!** Mongoose buffers all the commands until it's connected to the database. This means that you don't have to wait until it connects to MongoDB in order to define models, run queries, etc.

### Defining a Model

Models are defined through the `Schema` interface.

```js
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const BlogPost = new Schema({
  author: ObjectId,
  title: String,
  body: String,
  date: Date
});
```

Aside from defining the structure of your documents and the types of data you're storing, a Schema handles the definition of:

* [Validators](https://mongoosejs.com/docs/validation.html) (async and sync)
* [Defaults](https://mongoosejs.com/docs/api/schematype.html#schematype_SchemaType-default)
* [Getters](https://mongoosejs.com/docs/api/schematype.html#schematype_SchemaType-get)
* [Setters](https://mongoosejs.com/docs/api/schematype.html#schematype_SchemaType-set)
* [Indexes](https://mongoosejs.com/docs/guide.html#indexes)
* [Middleware](https://mongoosejs.com/docs/middleware.html)
* [Methods](https://mongoosejs.com/docs/guide.html#methods) definition
* [Statics](https://mongoosejs.com/docs/guide.html#statics) definition
* [Plugins](https://mongoosejs.com/docs/plugins.html)
* [pseudo-JOINs](https://mongoosejs.com/docs/populate.html)

The following example shows some of these features:

```js
const Comment = new Schema({
  name: { type: String, default: 'hahaha' },
  age: { type: Number, min: 18, index: true },
  bio: { type: String, match: /[a-z]/ },
  date: { type: Date, default: Date.now },
  buff: Buffer
});

// a setter
Comment.path('name').set(function(v) {
  return capitalize(v);
});

// middleware
Comment.pre('save', function(next) {
  notify(this.get('email'));
  next();
});
```

### Accessing a Model

Once we define a model through `mongoose.model('ModelName', mySchema)`, we can access it through the same function

```js
const MyModel = mongoose.model('ModelName');
```

Or just do it all at once

```js
const MyModel = mongoose.model('ModelName', mySchema);
```

The first argument is the *singular* name of the collection your model is for. **Mongoose automatically looks for the *plural* version of your model name.** For example, if you use

```js
const MyModel = mongoose.model('Ticket', mySchema);
```

Then `MyModel` will use the **tickets** collection, not the **ticket** collection. For more details read the [model docs](https://mongoosejs.com/docs/api/mongoose.html#mongoose_Mongoose-model).

Once we have our model, we can then instantiate it, and save it:

```js
const instance = new MyModel();
instance.my.key = 'hello';
await instance.save();
```

Or we can find documents from the same collection

```js
await MyModel.find({});
```

You can also `findOne`, `findById`, `update`, etc.

```js
const instance = await MyModel.findOne({ /* ... */ });
console.log(instance.my.key); // 'hello'
```

For more details check out [the docs](https://mongoosejs.com/docs/queries.html).

**Important!** If you opened a separate connection using `mongoose.createConnection()` but attempt to access the model through `mongoose.model('ModelName')` it will not work as expected since it is not hooked up to an active db connection. In this case access your model through the connection you created:

```js
const conn = mongoose.createConnection('your connection string');
const MyModel = conn.model('ModelName', schema);
const m = new MyModel();
await m.save(); // works
```

vs

```js
const conn = mongoose.createConnection('your connection string');
const MyModel = mongoose.model('ModelName', schema);
const m = new MyModel();
await m.save(); // does not work b/c the default connection object was never connected
```

### Embedded Documents

In the first example snippet, we defined a key in the Schema that looks like:

```txt
comments: [Comment]
```

Where `Comment` is a `Schema` we created. This means that creating embedded documents is as simple as:

```js
// retrieve my model
const BlogPost = mongoose.model('BlogPost');

// create a blog post
const post = new BlogPost();

// create a comment
post.comments.push({ title: 'My comment' });

await post.save();
```

The same goes for removing them:

```js
const post = await BlogPost.findById(myId);
post.comments[0].deleteOne();
await post.save();
```

Embedded documents enjoy all the same features as your models. Defaults, validators, middleware.

### Middleware

See the [docs](https://mongoosejs.com/docs/middleware.html) page.

#### Intercepting and mutating method arguments

You can intercept method arguments via middleware.

For example, this would allow you to broadcast changes about your Documents every time someone `set`s a path in your Document to a new value:

```js
schema.pre('set', function(next, path, val, typel) {
  // `this` is the current Document
  this.emit('set', path, val);

  // Pass control to the next pre
  next();
});
```

Moreover, you can mutate the incoming `method` arguments so that subsequent middleware see different values for those arguments. To do so, just pass the new values to `next`:

```js
schema.pre(method, function firstPre(next, methodArg1, methodArg2) {
  // Mutate methodArg1
  next('altered-' + methodArg1.toString(), methodArg2);
});

// pre declaration is chainable
schema.pre(method, function secondPre(next, methodArg1, methodArg2) {
  console.log(methodArg1);
  // => 'altered-originalValOfMethodArg1'

  console.log(methodArg2);
  // => 'originalValOfMethodArg2'

  // Passing no arguments to `next` automatically passes along the current argument values
  // i.e., the following `next()` is equivalent to `next(methodArg1, methodArg2)`
  // and also equivalent to, with the example method arg
  // values, `next('altered-originalValOfMethodArg1', 'originalValOfMethodArg2')`
  next();
});
```

#### Schema gotcha

`type`, when used in a schema has special meaning within Mongoose. If your schema requires using `type` as a nested property you must use object notation:

```js
new Schema({
  broken: { type: Boolean },
  asset: {
    name: String,
    type: String // uh oh, it broke. asset will be interpreted as String
  }
});

new Schema({
  works: { type: Boolean },
  asset: {
    name: String,
    type: { type: String } // works. asset is an object with a type property
  }
});
```

### Driver Access

Mongoose is built on top of the [official MongoDB Node.js driver](https://github.com/mongodb/node-mongodb-native). Each mongoose model keeps a reference to a [native MongoDB driver collection](https://mongodb.github.io/node-mongodb-native/7.5/classes/Collection.html). The collection object can be accessed using `YourModel.collection`. However, using the collection object directly bypasses all mongoose features, including hooks, validation, etc. The one
notable exception is that `YourModel.collection` still buffers
commands. As such, `YourModel.collection.find()` will **not**
return a cursor.

## API Docs

[Mongoose API documentation](https://mongoosejs.com/docs/api/mongoose.html), generated using [dox](https://github.com/tj/dox)
and [acquit](https://github.com/vkarpov15/acquit).

## Related Projects

### MongoDB Runners

* [run-rs](https://www.npmjs.com/package/run-rs)
* [mongodb-memory-server](https://www.npmjs.com/package/mongodb-memory-server)
* [mongodb-topology-manager](https://www.npmjs.com/package/mongodb-topology-manager)

### Unofficial CLIs

* [mongoosejs-cli](https://www.npmjs.com/package/mongoosejs-cli)

### Data Seeding

* [dookie](https://www.npmjs.com/package/dookie)
* [seedgoose](https://www.npmjs.com/package/seedgoose)
* [mongoose-data-seed](https://www.npmjs.com/package/mongoose-data-seed)

### Express Session Stores

* [connect-mongodb-session](https://www.npmjs.com/package/connect-mongodb-session)
* [connect-mongo](https://www.npmjs.com/package/connect-mongo)

## License

Copyright (c) 2010 LearnBoost &lt;dev@learnboost.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


## 🌐 Web Resources & Interactive Index
- [BFFS SPRING BREAK FASHIONISTA](https://studyquests.github.io/bffs-spring-break-fashionista.html)
- [MAHJONG CONNECT COOKWARE](https://learnquesters.pages.dev/mahjong-connect-cookware.html)
- [DIRTY MONEY THE RICH GET RICH](https://thequizzone.pages.dev/dirty-money-the-rich-get-rich.html)
- [CATEGORY CONTROLLER](https://studyquests.github.io/category-controller.html)
- [BRAINROT WORLD HOLEIO](https://studyquests.github.io/brainrot-world-holeio.html)
- [BUBBLE SHOOTER FREE 3](https://themindplay.pages.dev/bubble-shooter-free-3.html)
- [ARCHERY MASTER](https://learnquesters.pages.dev/archery-master.html)
- [BFF EASTER PHOTOBOOTH PARTY](https://quizverses.pages.dev/bff-easter-photobooth-party.html)
- [BONNIE FITNESS FRENZY](https://quizverses.pages.dev/bonnie-fitness-frenzy.html)
- [MR RACER CAR RACING](https://learnquesters.pages.dev/mr-racer-car-racing.html)
- [INDEX36](https://thequizzone.pages.dev/index36.html)
- [WATERMELON MERGE](https://studyquests.github.io/watermelon-merge.html)
- [INDEX4](https://quizverses.pages.dev/index4.html)
- [CATEGORY FPS175](https://studyquests.github.io/category-fps175.html)
- [WEAPONS AND RAGDOLLS](https://studyquests.github.io/weapons-and-ragdolls.html)
- [REAL CAR PARKING AND STUNT](https://thelearnquesters.pages.dev/real-car-parking-and-stunt.html)
- [SNEAKER ART](https://studyquests.github.io/sneaker-art.html)
- [CATEGORY BUILDING179](https://thequizzone.pages.dev/category-building179.html)
- [THROUGH THE WALL](https://quizverses-9d2f2.web.app/through-the-wall.html)
- [CATEGORY ADVENTURE 4](https://thelearnquesters.pages.dev/category-adventure-4.html)
- [CATEGORY BUBBLE SHOOTER](https://studyquests.github.io/category-bubble-shooter.html)
- [CATEGORY STICKMAN](https://learnquesters.pages.dev/category-stickman.html)
- [CATEGORY GUN241](https://studyquests.github.io/category-gun241.html)
- [CATEGORY CUTE](https://learnquesters.pages.dev/category-cute.html)
- [CHINESE FOOD CHEF DUDU](https://thelearnquesters.pages.dev/chinese-food-chef-dudu.html)
- [CATEGORY COOKING46](https://quizverses.pages.dev/category-cooking46.html)
- [TERMS](https://thequizzone.pages.dev/terms.html)
- [BUS DRIVER SIMULATOR 3D](https://quizverses.pages.dev/bus-driver-simulator-3d.html)
- [INDEX12](https://thequizzone.pages.dev/index12.html)
- [CATEGORY 2D1 175](https://thelearnquesters.pages.dev/category-2d1-175.html)
- [CATEGORY AIRPLANE29](https://thelearnquesters.pages.dev/category-airplane29.html)
- [LITTLE BUGS](https://learnquester.pages.dev/little-bugs.html)
- [COLLECT EM ALL](https://quizverses-9d2f2.web.app/collect-em-all.html)
- [CATEGORY ADVENTURE 3](https://thelearnquesters.pages.dev/category-adventure-3.html)
- [CATEGORY BOARDGAMES](https://thequizzone.pages.dev/category-boardgames.html)
- [CATEGORY BUILDING](https://thequizzone.pages.dev/category-building.html)
- [MERGE MUSCLE](https://studyquests.github.io/merge-muscle.html)
- [INDEX22](https://thequizzone.pages.dev/index22.html)
- [SUDOKU VAULT](https://thelearnquesters.pages.dev/sudoku-vault.html)
- [CATEGORY ARENA254](https://thelearnquesters.pages.dev/category-arena254.html)
- [INDEX15](https://learnquesters.pages.dev/index15.html)
- [DRAW TO KILL](https://quizverses-9d2f2.web.app/draw-to-kill.html)
- [MEME WARS](https://learnquester.pages.dev/meme-wars.html)
- [BUBBLE SHOOTER FREE 3](https://thelearnquesters.pages.dev/bubble-shooter-free-3.html)
- [GRANNY GTA VEGAS](https://studyquests.github.io/granny-gta-vegas.html)
- [CATEGORY IO](https://thelearnquesters.pages.dev/category-io.html)
- [MERGE ARCHER DEFENSE](https://thelearnquesters.pages.dev/merge-archer-defense.html)
- [CATEGORY BIKE 2](https://quizverses.github.io/category-bike-2.html)
- [SQUAD ASSEMBLER](https://thelearnquesters.pages.dev/squad-assembler.html)
- [SIBERIAN ASSAULT](https://quizverses.github.io/siberian-assault.html)
- [HEXA TAP AWAY](https://quizverses.github.io/hexa-tap-away.html)
- [MY DOGY VIRTUAL PET](https://thelearnquester.web.app/my-dogy-virtual-pet.html)
- [TIKTOK TRENDS COLORED DENIM](https://thelearnquester.web.app/tiktok-trends-colored-denim.html)
- [WENDY SOFT GIRL MAKEUP](https://learnquesters.pages.dev/wendy-soft-girl-makeup.html)
- [LIMOUSINE CAR GAME SIMULATOR](https://thelearnquester.web.app/limousine-car-game-simulator.html)
- [BACKWOODS](https://learnquester.pages.dev/backwoods.html)
- [CATEGORY MINECRAFT](https://quizverses.pages.dev/category-minecraft.html)
- [CATEGORY BUSINESS137](https://thequizzone.pages.dev/category-business137.html)
- [HERO TOWER WAR](https://thelearnquester.web.app/hero-tower-war.html)
- [FIERCE BATTLE BREAKOUT](https://thelearnquester.web.app/fierce-battle-breakout.html)
- [SQUID GAME MEMORY CARD MATCH](https://quizverses-9d2f2.web.app/squid-game-memory-card-match.html)
- [CATEGORY ADVENTURE](https://thequizzone.pages.dev/category-adventure.html)
- [CUTE RABBITS CHALLENGING ADVENTURE](https://learnquesters.pages.dev/cute-rabbits-challenging-adventure.html)
- [PING PONG AIR](https://thelearnquesters.pages.dev/ping-pong-air.html)
- [LEXY](https://learnquester.github.io/lexy.html)
- [CATEGORY GROW GAMES](https://quizverses.github.io/category-grow-games.html)
- [BULLET SUPERHERO](https://thelearnquesters.pages.dev/bullet-superhero.html)
- [4 HEXA](https://quizverses.github.io/4-hexa.html)
- [LIGHT BULB PUZZLE](https://learnquester.pages.dev/light-bulb-puzzle.html)
- [GEOMETRY WAVE HERO](https://quizverses-9d2f2.web.app/geometry-wave-hero.html)
- [CATEGORY TOWER DEFENSE 2](https://quizverses.github.io/category-tower-defense-2.html)
- [HALLOWEEN CHALLENGE](https://learnquester.github.io/halloween-challenge.html)
- [CATEGORY MISSION206](https://quizverses.github.io/category-mission206.html)
- [CATEGORY 204828](https://thequizzone.pages.dev/category-204828.html)
- [RAGDOLL BOUNCE](https://quizverses.github.io/ragdoll-bounce.html)
- [CARGO SKATES](https://thelearnquesters.pages.dev/cargo-skates.html)
- [MONSTER VS ZOMBIE](https://quizverses.github.io/monster-vs-zombie.html)
- [INDEX18](https://learnquester.pages.dev/index18.html)
- [CATEGORY BLOCK94](https://studyquests.github.io/category-block94.html)
- [THE BODYGUARD](https://quizverses.pages.dev/the-bodyguard.html)
- [MAGNET TRUCK](https://quizverses.github.io/magnet-truck.html)
- [SHINY JEWELS](https://thelearnquesters.pages.dev/shiny-jewels.html)
- [GOO SLIME JUMP](https://thelearnquesters.pages.dev/goo-slime-jump.html)
- [OBBY GYM SIMULATOR ESCAPE](https://thelearnquester.web.app/obby-gym-simulator-escape.html)
- [CATEGORY SIMULATION 3](https://thelearnquesters.pages.dev/category-simulation-3.html)
- [HOOP WORLD 3D](https://thelearnquester.web.app/hoop-world-3d.html)
- [CATEGORY FOOD](https://quizverses.pages.dev/category-food.html)
- [CATEGORY BATTLE 2](https://studyquests.github.io/category-battle-2.html)
- [CATEGORY HERO](https://quizverses.github.io/category-hero.html)
- [SUPER STAR ANIMAL SALON](https://thelearnquester.web.app/super-star-animal-salon.html)
- [COLOR BLOCK JAM 2](https://thelearnquesters.pages.dev/color-block-jam-2.html)
- [THE HARDEST PUZZLE EVER](https://learnquester.github.io/the-hardest-puzzle-ever.html)
- [CHICKEN BANANA RUN](https://thelearnquesters.pages.dev/chicken-banana-run.html)
- [HIDDEN HORRORS](https://studyquests.github.io/hidden-horrors.html)
- [IDLE HOTEL EMPIRE](https://quizverses.github.io/idle-hotel-empire.html)
- [GOLD MINER TOWER DEFENSE](https://thelearnquester.web.app/gold-miner-tower-defense.html)
- [CATEGORY RUNNING107](https://thelearnquester.web.app/category-running107.html)
- [WENDY SOFT GIRL MAKEUP](https://quizverses.github.io/wendy-soft-girl-makeup.html)
- [MR DRIFTER CAR CHASE SIMULATOR](https://learnquester.github.io/mr-drifter-car-chase-simulator.html)
- [CATEGORY MOBILE2 095](https://quizverses.github.io/category-mobile2-095.html)
- [INDEX16](https://quizverses.github.io/index16.html)
- [CATEGORY CASUAL 8](https://quizverses.github.io/category-casual-8.html)
- [CATEGORY PREMIUM PERKS71](https://quizverses.github.io/category-premium-perks71.html)
- [ZOMBIE MISSION SURVIVOR](https://thelearnquesters.pages.dev/zombie-mission-survivor.html)
- [RESCUE RIFT](https://quizverses.pages.dev/rescue-rift.html)
- [CRAZY VAN](https://thelearnquester.web.app/crazy-van.html)
- [CATEGORY AVOID295](https://quizverses.github.io/category-avoid295.html)
- [CATEGORY CASUAL 2](https://thelearnquester.web.app/category-casual-2.html)
- [BLOONS SURVIVALIO](https://quizverses-9d2f2.web.app/bloons-survivalio.html)
- [LAST DAY ON EARTH SURVIVAL](https://thelearnquester.web.app/last-day-on-earth-survival.html)
- [STICKMAN FIGHT PRO](https://learnquester.github.io/stickman-fight-pro.html)
- [CLOWNFISH PIN OUT](https://quizverses-9d2f2.web.app/clownfish-pin-out.html)
- [CATEGORY CAN T STOP PLAYING212](https://quizverses.pages.dev/category-can-t-stop-playing212.html)
- [WORDS WITH OWL](https://learnquester.github.io/words-with-owl.html)
- [CATEGORY HORROR](https://learnquesters.pages.dev/category-horror.html)
- [CATEGORY SPORTS](https://quizverses.pages.dev/category-sports.html)
- [CATEGORY MINECRAFT 2](https://thelearnquester.web.app/category-minecraft-2.html)
- [GOLF MINI](https://quizverses.github.io/golf-mini.html)
- [CATEGORY PROXY LIST](https://thelearnquester.web.app/category-proxy-list.html)
- [SITEMAP](https://quizverses.github.io/sitemap.html)
- [FISHING CATCH THE SECRET BRAINROT](https://thelearnquesters.pages.dev/fishing-catch-the-secret-brainrot.html)
- [SURVIVE THE NIGHT](https://quizverses.pages.dev/survive-the-night.html)
- [CATEGORY ADVENTURE 2](https://quizverses.pages.dev/category-adventure-2.html)
- [CATEGORY ANIMAL216](https://quizverses.github.io/category-animal216.html)
- [CATEGORY ADVENTURE 2](https://thequizzone.pages.dev/category-adventure-2.html)
- [SAMURAI MADNESS](https://learnquester.github.io/samurai-madness.html)
- [CATEGORY CAR](https://learnquester.pages.dev/category-car.html)
- [CLASSIC LABYRINTH 3D MAZE](https://learnquester.github.io/classic-labyrinth-3d-maze.html)
- [ICE FISHING 3D](https://thelearnquester.web.app/ice-fishing-3d.html)
- [SINGLE STROKE LINE DRAW](https://quizverses-9d2f2.web.app/single-stroke-line-draw.html)
