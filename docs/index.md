# Getting Started

<style>
  hr {
    display: block;
    margin-top: 40px;
    margin-bottom: 40px;
    border: 0px;
    height: 1px;
    background-color: #232323;
    width: 100%;
  }
</style>

_First be sure you have [MongoDB](http://www.mongodb.org/downloads) and [Node.js](http://nodejs.org/) installed._

Next install Mongoose from the command line using `npm`:

```
$ npm install mongoose --save
```

Now say we like fuzzy kittens and want to record every kitten we ever meet
in MongoDB.
The first thing we need to do is include mongoose in our project and open a
connection to the `test` database on our locally running instance of MongoDB.

```javascript
// getting-started.js
const mongoose = require('mongoose');

main().catch(err => console.log(err));

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/test');

  // use `await mongoose.connect('mongodb://user:password@127.0.0.1:27017/test');` if your database has auth enabled
}
```

For brevity, let's assume that all following code is within the `main()` function.

With Mongoose, everything is derived from a [Schema](guide.html).
Let's get a reference to it and define our kittens.

```javascript
const kittySchema = new mongoose.Schema({
  name: String
});
```

So far so good. We've got a schema with one property, `name`, which will be a  `String`. The next step is compiling our schema into a [Model](models.html).

```javascript
const Kitten = mongoose.model('Kitten', kittySchema);
```

A model is a class with which we construct documents.
In this case, each document will be a kitten with properties and behaviors as declared in our schema.
Let's create a kitten document representing the little guy we just met on the sidewalk outside:

```javascript
const silence = new Kitten({ name: 'Silence' });
console.log(silence.name); // 'Silence'
```

Kittens can meow, so let's take a look at how to add "speak" functionality
to our documents:

```javascript
// NOTE: methods must be added to the schema before compiling it with mongoose.model()
kittySchema.methods.speak = function speak() {
  const greeting = this.name
    ? 'Meow name is ' + this.name
    : 'I don\'t have a name';
  console.log(greeting);
};

const Kitten = mongoose.model('Kitten', kittySchema);
```

Functions added to the `methods` property of a schema get compiled into
the `Model` prototype and exposed on each document instance:

```javascript
const fluffy = new Kitten({ name: 'fluffy' });
fluffy.speak(); // "Meow name is fluffy"
```

We have talking kittens! But we still haven't saved anything to MongoDB.
Each document can be saved to the database by calling its [save](api/model.html#model_Model-save) method. The first argument to the callback will be an error if any occurred.

```javascript
await fluffy.save();
fluffy.speak();
```

Say time goes by and we want to display all the kittens we've seen.
We can access all of the kitten documents through our Kitten [model](models.html).

```javascript
const kittens = await Kitten.find();
console.log(kittens);
```

We just logged all of the kittens in our db to the console.
If we want to filter our kittens by name, Mongoose supports MongoDBs rich [querying](queries.html) syntax.

```javascript
await Kitten.find({ name: /^fluff/ });
```

This performs a search for all documents with a name property that begins
with "fluff" and returns the result as an array of kittens to the callback.

## Congratulations

That's the end of our quick start. We created a schema, added a custom document method, saved and queried kittens in MongoDB using Mongoose. Head over to the [guide](guide.html), or [API docs](api/mongoose.html) for more.
