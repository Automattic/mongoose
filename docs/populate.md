# Populate

MongoDB has the join-like [$lookup](https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/) aggregation operator in versions >= 3.2. Mongoose has a more powerful alternative called `populate()`, which lets you reference documents in other collections.

Population is the process of automatically replacing the specified paths in the document with document(s) from other collection(s). We may populate a single document, multiple documents, a plain object, multiple plain objects, or all objects returned from a query. Let's look at some examples.

```javascript
const mongoose = require('mongoose');
const { Schema } = mongoose;

const personSchema = Schema({
  _id: Schema.Types.ObjectId,
  name: String,
  age: Number,
  stories: [{ type: Schema.Types.ObjectId, ref: 'Story' }]
});

const storySchema = Schema({
  author: { type: Schema.Types.ObjectId, ref: 'Person' },
  title: String,
  fans: [{ type: Schema.Types.ObjectId, ref: 'Person' }]
});

const Story = mongoose.model('Story', storySchema);
const Person = mongoose.model('Person', personSchema);
```

So far we've created two [Models](models.html). Our `Person` model has
its `stories` field set to an array of `ObjectId`s. The `ref` option is
what tells Mongoose which model to use during population, in our case
the `Story` model. All `_id`s we store here must be document `_id`s from
the `Story` model.

**Note**: `ObjectId`, `Number`, `String`, and `Buffer` are valid for use
as refs. However, you should use `ObjectId` unless you are an advanced
user and have a good reason for doing so.

<ul class="toc">
  <li><a href="#saving-refs">Saving Refs</a></li>
  <li><a href="#population">Population</a></li>
  <li><a href="#checking-populated">Checking Whether a Field is Populated</a></li>
  <li><a href="#setting-populated-fields">Setting Populated Fields</a></li>
  <li><a href="#doc-not-found">What If There's No Foreign Document?</a></li>
  <li><a href="#field-selection">Field Selection</a></li>
  <li><a href="#populating-multiple-paths">Populating Multiple Paths</a></li>
  <li><a href="#query-conditions">Query conditions and other options</a></li>
  <li><a href="#limit-vs-perDocumentLimit"><code>limit</code> vs. <code>perDocumentLimit</code></a></li>
  <li><a href="#refs-to-children">Refs to children</a></li>
  <li><a href="#populate_an_existing_mongoose_document">Populating an existing document</a></li>
  <li><a href="#populate_multiple_documents">Populating multiple existing documents</a></li>
  <li><a href="#deep-populate">Populating across multiple levels</a></li>
  <li><a href="#cross-db-populate">Populating across Databases</a></li>
  <li><a href="#dynamic-ref">Dynamic References via <code>refPath</code></a></li>
  <li><a href="#populate-virtuals">Populate Virtuals</a></li>
  <li><a href="#count">Populate Virtuals: The Count Option</a></li>
  <li><a href="#match">Populate Virtuals: The Match Option</a></li>
  <li><a href="#populating-maps">Populating Maps</a></li>
  <li><a href="#populate-middleware">Populate in Middleware</a></li>
  <li><a href="#populating-multiple-paths-middleware">Populating Multiple Paths in Middleware</a></li>
  <li><a href="#transform-populated-documents">Transform populated documents</a></li>
</ul>

<h2 id="saving-refs"><a href="#saving-refs">Saving refs</a></h2>

Saving refs to other documents works the same way you normally save
properties, just assign the `_id` value:

```javascript
const author = new Person({
  _id: new mongoose.Types.ObjectId(),
  name: 'Ian Fleming',
  age: 50
});

author.save(function(err) {
  if (err) return handleError(err);

  const story1 = new Story({
    title: 'Casino Royale',
    author: author._id // assign the _id from the person
  });

  story1.save(function(err) {
    if (err) return handleError(err);
    // that's it!
  });
});
```

<h2 id="population"><a href="#population">Population</a></h2>

So far we haven't done anything much different. We've merely created a
`Person` and a `Story`. Now let's take a look at populating our story's
`author` using the query builder:

```javascript
const story = await Story.
  findOne({ title: 'Casino Royale' }).
  populate('author').
  exec();
// prints "The author is Ian Fleming"
console.log('The author is %s', story.author.name);
```

Populated paths are no longer set to their original `_id` , their value
is replaced with the mongoose document returned from the database by
performing a separate query before returning the results.

Arrays of refs work the same way. Just call the
[populate](api/query.html#query_Query-populate) method on the query and an
array of documents will be returned _in place_ of the original `_id`s.

<h2 id="setting-populated-fields"><a href="#setting-populated-fields">Setting Populated Fields</a></h2>

You can manually populate a property by setting it to a document. The document
must be an instance of the model your `ref` property refers to.

```javascript
const story = await Story.findOne({ title: 'Casino Royale' });
story.author = author;
console.log(story.author.name); // prints "Ian Fleming"
```

<h2 id="checking-populated"><a href="#checking-populated">Checking Whether a Field is Populated</a></h2>

You can call the `populated()` function to check whether a field is populated.
If `populated()` returns a [truthy value](https://masteringjs.io/tutorials/fundamentals/truthy),
you can assume the field is populated.

```javascript
story.populated('author'); // truthy

story.depopulate('author'); // Make `author` not populated anymore
story.populated('author'); // undefined
```

A common reason for checking whether a path is populated is getting the `author`
id. However, for your convenience, Mongoose adds a [`_id` getter to ObjectId instances](api/mongoose.html#mongoose_Mongoose-set)
so you can use `story.author._id` regardless of whether `author` is populated.

```javascript
story.populated('author'); // truthy
story.author._id; // ObjectId

story.depopulate('author'); // Make `author` not populated anymore
story.populated('author'); // undefined

story.author instanceof ObjectId; // true
story.author._id; // ObjectId, because Mongoose adds a special getter
```

<h2 id="doc-not-found"><a href="#doc-not-found">What If There's No Foreign Document?</a></h2>

Mongoose populate doesn't behave like conventional
[SQL joins](https://www.w3schools.com/sql/sql_join.asp). When there's no
document, `story.author` will be `null`. This is analogous to a
[left join](https://www.w3schools.com/sql/sql_join_left.asp) in SQL.

```javascript
await Person.deleteMany({ name: 'Ian Fleming' });

const story = await Story.findOne({ title: 'Casino Royale' }).populate('author');
story.author; // `null`
```

If you have an array of `authors` in your `storySchema`, `populate()` will
give you an empty array instead.

```javascript
const storySchema = Schema({
  authors: [{ type: Schema.Types.ObjectId, ref: 'Person' }],
  title: String
});

// Later

const story = await Story.findOne({ title: 'Casino Royale' }).populate('authors');
story.authors; // `[]`
```

<h2 id="field-selection"><a href="#field-selection">Field Selection</a></h2>

What if we only want a few specific fields returned for the populated
documents? This can be accomplished by passing the usual
[field name syntax](api/query.html#query_Query-select) as the second argument
to the populate method:

```javascript
const story = await Story.
  findOne({ title: /casino royale/i }).
  populate('author', 'name').
  exec(); // only return the Persons name
// prints "The author is Ian Fleming"
console.log('The author is %s', story.author.name);
// prints "The authors age is null"
console.log('The authors age is %s', story.author.age);
```

<h2 id="populating-multiple-paths"><a href="#populating-multiple-paths">Populating Multiple Paths</a></h2>

What if we wanted to populate multiple paths at the same time?

```javascript
await Story.
  find({ /* ... */ }).
  populate('fans').
  populate('author').
  exec();
```

If you call `populate()` multiple times with the same path, only the last
one will take effect.

```javascript
// The 2nd `populate()` call below overwrites the first because they
// both populate 'fans'.
await Story.
  find().
  populate({ path: 'fans', select: 'name' }).
  populate({ path: 'fans', select: 'email' });
// The above is equivalent to:
await Story.find().populate({ path: 'fans', select: 'email' });
```

<h2 id="query-conditions"><a href="#query-conditions">Query conditions and other options</a></h2>

What if we wanted to populate our fans array based on their age and
select just their names?

```javascript
await Story.
  find().
  populate({
    path: 'fans',
    match: { age: { $gte: 21 } },
    // Explicitly exclude `_id`, see http://bit.ly/2aEfTdB
    select: 'name -_id'
  }).
  exec();
```

The `match` option doesn't filter out `Story` documents. If there are no documents that satisfy `match`,
you'll get a `Story` document with an empty `fans` array.

For example, suppose you `populate()` a story's `author` and the `author` doesn't satisfy `match`. Then
the story's `author` will be `null`.

```javascript
const story = await Story.
  findOne({ title: 'Casino Royale' }).
  populate({ path: 'author', name: { $ne: 'Ian Fleming' } }).
  exec();
story.author; // `null`
```

In general, there is no way to make `populate()` filter stories based on properties of the story's `author`.
For example, the below query won't return any results, even though `author` is populated.

```javascript
const story = await Story.
  findOne({ 'author.name': 'Ian Fleming' }).
  populate('author').
  exec();
story; // null
```

If you want to filter stories by their author's name, you should use [denormalization](https://www.mongodb.com/blog/post/6-rules-of-thumb-for-mongodb-schema-design-part-3).

<h2 id="limit-vs-perDocumentLimit"><a href="#limit-vs-perDocumentLimit"><code>limit</code> vs. <code>perDocumentLimit</code></a></h2>

Populate does support a `limit` option, however, it currently
does **not** limit on a per-document basis for backwards compatibility. For example,
suppose you have 2 stories:

```javascript
await Story.create([
  { title: 'Casino Royale', fans: [1, 2, 3, 4, 5, 6, 7, 8] },
  { title: 'Live and Let Die', fans: [9, 10] }
]);
```

If you were to `populate()` using the `limit` option, you
would find that the 2nd story has 0 fans:

```javascript
const stories = await Story.find().populate({
  path: 'fans',
  options: { limit: 2 }
});

stories[0].name; // 'Casino Royale'
stories[0].fans.length; // 2

// 2nd story has 0 fans!
stories[1].name; // 'Live and Let Die'
stories[1].fans.length; // 0
```

That's because, in order to avoid executing a separate query
for each document, Mongoose instead queries for fans using
`numDocuments * limit` as the limit. If you need the correct
`limit`, you should use the `perDocumentLimit` option (new in Mongoose 5.9.0).
Just keep in mind that `populate()` will execute a separate query
for each story, which may cause `populate()` to be slower.

```javascript
const stories = await Story.find().populate({
  path: 'fans',
  // Special option that tells Mongoose to execute a separate query
  // for each `story` to make sure we get 2 fans for each story.
  perDocumentLimit: 2
});

stories[0].name; // 'Casino Royale'
stories[0].fans.length; // 2

stories[1].name; // 'Live and Let Die'
stories[1].fans.length; // 2
```

<h2 id="refs-to-children"><a href="#refs-to-children">Refs to children</a></h2>

We may find however, if we use the `author` object, we are unable to get a
list of the stories. This is because no `story` objects were ever 'pushed'
onto `author.stories`.

There are two perspectives here. First, you may want the `author` to know
which stories are theirs. Usually, your schema should resolve
one-to-many relationships by having a parent pointer in the 'many' side.
But, if you have a good reason to want an array of child pointers, you
can `push()` documents onto the array as shown below.

```javascript
await story1.save();

author.stories.push(story1);
await author.save();
```

This allows us to perform a `find` and `populate` combo:

```javascript
const person = await Person.
  findOne({ name: 'Ian Fleming' }).
  populate('stories').
  exec(); // only works if we pushed refs to children
console.log(person);
```

It is debatable that we really want two sets of pointers as they may get
out of sync. Instead we could skip populating and directly `find()` the
stories we are interested in.

```javascript
const stories = await Story.
  find({ author: author._id }).
  exec();
console.log('The stories are an array: ', stories);
```

The documents returned from
[query population](api/query.html#query_Query-populate) become fully
functional, `remove`able, `save`able documents unless the
[lean](api/query.html#query_Query-lean) option is specified. Do not confuse
them with [sub docs](subdocs.html). Take caution when calling its
remove method because you'll be removing it from the database, not just
the array.

<h2 id="populate_an_existing_mongoose_document"><a href="#populate_an_existing_mongoose_document">Populating an existing document</a></h2>

If you have an existing mongoose document and want to populate some of its
paths, you can use the
[Document#populate()](api/document.html#document_Document-populate) method.

```javascript
const person = await Person.findOne({ name: 'Ian Fleming' });

person.populated('stories'); // null

// Call the `populate()` method on a document to populate a path.
await person.populate('stories');

person.populated('stories'); // Array of ObjectIds
person.stories[0].name; // 'Casino Royale'
```

The `Document#populate()` method does not support chaining.
You need to call `populate()` multiple times, or with an array of paths, to populate multiple paths

```javascript
await person.populate(['stories', 'fans']);
person.populated('fans'); // Array of ObjectIds
```

<h2 id="populate_multiple_documents"><a href="#populate_multiple_documents">Populating multiple existing documents</a></h2>

If we have one or many mongoose documents or even plain objects
(_like [mapReduce](api/model.html#model_Model-mapReduce) output_), we may
populate them using the [Model.populate()](api/model.html#model_Model-populate)
method. This is what `Document#populate()`
and `Query#populate()` use to populate documents.

<h2 id="deep-populate"><a href="#deep-populate">Populating across multiple levels</a></h2>

Say you have a user schema which keeps track of the user's friends.

```javascript
const userSchema = new Schema({
  name: String,
  friends: [{ type: ObjectId, ref: 'User' }]
});
```

Populate lets you get a list of a user's friends, but what if you also
wanted a user's friends of friends? Specify the `populate` option to tell
mongoose to populate the `friends` array of all the user's friends:

```javascript
await User.
  findOne({ name: 'Val' }).
  populate({
    path: 'friends',
    // Get friends of friends - populate the 'friends' array for every friend
    populate: { path: 'friends' }
  });
```

<h2 id="cross-db-populate"><a href="#cross-db-populate">Cross Database Populate</a></h2>

Let's say you have a schema representing events, and a schema representing
conversations. Each event has a corresponding conversation thread.

```javascript
const db1 = mongoose.createConnection('mongodb://127.0.0.1:27000/db1');
const db2 = mongoose.createConnection('mongodb://127.0.0.1:27001/db2');

const conversationSchema = new Schema({ numMessages: Number });
const Conversation = db2.model('Conversation', conversationSchema);

const eventSchema = new Schema({
  name: String,
  conversation: {
    type: ObjectId,
    ref: Conversation // `ref` is a **Model class**, not a string
  }
});
const Event = db1.model('Event', eventSchema);
```

In the above example, events and conversations are stored in separate MongoDB
databases. String `ref` will not work in this situation, because Mongoose
assumes a string `ref` refers to a model name on the same connection. In
the above example, the conversation model is registered on `db2`, not `db1`.

```javascript
// Works
const events = await Event.
  find().
  populate('conversation');
```

This is known as a "cross-database populate," because it enables you to
populate across MongoDB databases and even across MongoDB instances.

If you don't have access to the model instance when defining your `eventSchema`,
you can also pass [the model instance as an option to `populate()`](api/model.html#model_Model-populate).

```javascript
const events = await Event.
  find().
  // The `model` option specifies the model to use for populating.
  populate({ path: 'conversation', model: Conversation });
```

<h2 id="dynamic-ref"><a href="#dynamic-ref">Dynamic References via <code>refPath</code></a></h2>
<code>
of a property in the document. Let's say you're building a schema for
storing comments. A user may comment on either a blog post or a product.

```javascript
const commentSchema = new Schema({
  body: { type: String, required: true },
  doc: {
    type: Schema.Types.ObjectId,
    required: true,
    // Instead of a hardcoded model name in `ref`, `refPath` means Mongoose
    // will look at the `docModel` property to find the right model.
    refPath: 'docModel'
  },
  docModel: {
    type: String,
    required: true,
    enum: ['BlogPost', 'Product']
  }
});

const Product = mongoose.model('Product', new Schema({ name: String }));
const BlogPost = mongoose.model('BlogPost', new Schema({ title: String }));
const Comment = mongoose.model('Comment', commentSchema);
```

The `refPath` option is a more sophisticated alternative to `ref`.
If `ref` is a string, Mongoose will always query the same model to find the populated subdocs.
With `refPath`, you can configure what model Mongoose uses for each document.

```javascript
const book = await Product.create({ name: 'The Count of Monte Cristo' });
const post = await BlogPost.create({ title: 'Top 10 French Novels' });

const commentOnBook = await Comment.create({
  body: 'Great read',
  doc: book._id,
  docModel: 'Product'
});

const commentOnPost = await Comment.create({
  body: 'Very informative',
  doc: post._id,
  docModel: 'BlogPost'
});

// The below `populate()` works even though one comment references the
// 'Product' collection and the other references the 'BlogPost' collection.
const comments = await Comment.find().populate('doc').sort({ body: 1 });
comments[0].doc.name; // "The Count of Monte Cristo"
comments[1].doc.title; // "Top 10 French Novels"
```

An alternative approach is to define separate `blogPost` and `product` properties on `commentSchema`, and then `populate()` on both properties.

```javascript
const commentSchema = new Schema({
  body: { type: String, required: true },
  product: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Product'
  },
  blogPost: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'BlogPost'
  }
});

// ...

// The below `populate()` is equivalent to the `refPath` approach, you
// just need to make sure you `populate()` both `product` and `blogPost`.
const comments = await Comment.find().
  populate('product').
  populate('blogPost').
  sort({ body: 1 });
comments[0].product.name; // "The Count of Monte Cristo"
comments[1].blogPost.title; // "Top 10 French Novels"
```

Defining separate `blogPost` and `product` properties works for this simple
example. But, if you decide to allow users to also comment on articles or
other comments, you'll need to add more properties to your schema. You'll
also need an extra `populate()` call for every property, unless you use
[mongoose-autopopulate](https://www.npmjs.com/package/mongoose-autopopulate).
Using `refPath` means you only need 2 schema paths and one `populate()` call
regardless of how many models your `commentSchema` can point to.

<h2 id="populate-virtuals"><a href="#populate-virtuals">Populate Virtuals</a></h2>

So far you've only populated based on the `_id` field.
However, that's sometimes not the right choice.
For example, suppose you have 2 models: `Author` and `BlogPost`.

```javascript
const AuthorSchema = new Schema({
  name: String,
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BlogPost' }]
});

const BlogPostSchema = new Schema({
  title: String,
  comments: [{
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'Author' },
    content: String
  }]
});

const Author = mongoose.model('Author', AuthorSchema, 'Author');
const BlogPost = mongoose.model('BlogPost', BlogPostSchema, 'BlogPost');
```

The above is an example of **bad schema design**. Why?
Suppose you have an extremely prolific author that writes over 10k blog posts.
That `author` document will be huge, over 12kb, and large documents lead to performance issues on both server and client.
The [Principle of Least Cardinality](https://dev.to/swyx/4-things-i-learned-from-mastering-mongoose-js-25e#4-principle-of-least-cardinality) states that one-to-many relationships, like author to blog post, should be stored on the "many" side.
In other words, blog posts should store their `author`, authors should **not** store all their `posts`.

```javascript
const AuthorSchema = new Schema({
  name: String
});

const BlogPostSchema = new Schema({
  title: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'Author' },
  comments: [{
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'Author' },
    content: String
  }]
});
```

Unfortunately, these two schemas, as written, don't support populating an author's list of blog posts.
That's where _virtual populate_ comes in.
Virtual populate means calling `populate()` on a virtual property that has a `ref` option as shown below.

```javascript
// Specifying a virtual with a `ref` property is how you enable virtual
// population
AuthorSchema.virtual('posts', {
  ref: 'BlogPost',
  localField: '_id',
  foreignField: 'author'
});

const Author = mongoose.model('Author', AuthorSchema, 'Author');
const BlogPost = mongoose.model('BlogPost', BlogPostSchema, 'BlogPost');
```

You can then `populate()` the author's `posts` as shown below.

```javascript
const author = await Author.findOne().populate('posts');

author.posts[0].title; // Title of the first blog post
```

Keep in mind that virtuals are _not_ included in `toJSON()` and `toObject()` output by default.
If you want populate virtuals to show up when using functions like Express' [`res.json()` function](https://masteringjs.io/tutorials/express/json) or `console.log()`, set the `virtuals: true` option on your schema's `toJSON` and `toObject()` options.

```javascript
const authorSchema = new Schema({ name: String }, {
  toJSON: { virtuals: true }, // So `res.json()` and other `JSON.stringify()` functions include virtuals
  toObject: { virtuals: true } // So `console.log()` and other functions that use `toObject()` include virtuals
});
```

If you're using populate projections, make sure `foreignField` is included
in the projection.

```javascript
let authors = await Author.
  find({}).
  // Won't work because the foreign field `author` is not selected
  populate({ path: 'posts', select: 'title' }).
  exec();

authors = await Author.
  find({}).
  // Works, foreign field `author` is selected
  populate({ path: 'posts', select: 'title author' }).
  exec();
```

<h2 id="count"><a href="#count">Populate Virtuals: The Count Option</a></h2>

Populate virtuals also support counting the number of documents with
matching `foreignField` as opposed to the documents themselves. Set the
`count` option on your virtual:

```javascript
const PersonSchema = new Schema({
  name: String,
  band: String
});

const BandSchema = new Schema({
  name: String
});
BandSchema.virtual('numMembers', {
  ref: 'Person', // The model to use
  localField: 'name', // Find people where `localField`
  foreignField: 'band', // is equal to `foreignField`
  count: true // And only get the number of docs
});

// Later
const doc = await Band.findOne({ name: 'Motley Crue' }).
  populate('numMembers');
doc.numMembers; // 2
```

<h2 id="match"><a href="#match">Populate Virtuals: The Match Option</a></h2>

Another option for Populate virtuals is `match`.
This option adds an extra filter condition to the query Mongoose uses to `populate()`:

```javascript
// Same example as 'Populate Virtuals' section
AuthorSchema.virtual('posts', {
  ref: 'BlogPost',
  localField: '_id',
  foreignField: 'author',
  match: { archived: false } // match option with basic query selector
});

const Author = mongoose.model('Author', AuthorSchema, 'Author');
const BlogPost = mongoose.model('BlogPost', BlogPostSchema, 'BlogPost');

// After population
const author = await Author.findOne().populate('posts');

author.posts; // Array of not `archived` posts
```

You can also set the `match` option to a function.
That allows configuring the `match` based on the document being populated.
For example, suppose you only want to populate blog posts whose `tags` contain one of the author's `favoriteTags`.

```javascript
AuthorSchema.virtual('posts', {
  ref: 'BlogPost',
  localField: '_id',
  foreignField: 'author',
  // Add an additional filter `{ tags: author.favoriteTags }` to the populate query
  // Mongoose calls the `match` function with the document being populated as the
  // first argument.
  match: author => ({ tags: author.favoriteTags })
});
```

<h2 id="populating-maps"><a href="#populating-maps">Populating Maps</a></h2>

[Maps](schematypes.html#maps) are a type that represents an object with arbitrary
string keys. For example, in the below schema, `members` is a map from strings to ObjectIds.

```javascript
const BandSchema = new Schema({
  name: String,
  members: {
    type: Map,
    of: {
      type: 'ObjectId',
      ref: 'Person'
    }
  }
});
const Band = mongoose.model('Band', bandSchema);
```

This map has a `ref`, which means you can use `populate()` to populate all the ObjectIds
in the map. Suppose you have the below `band` document:

```javascript
const person1 = new Person({ name: 'Vince Neil' });
const person2 = new Person({ name: 'Mick Mars' });

const band = new Band({
  name: 'Motley Crue',
  members: {
    singer: person1._id,
    guitarist: person2._id
  }
});
```

You can `populate()` every element in the map by populating the special path `members.$*`.
`$*` is a special syntax that tells Mongoose to look at every key in the map.

```javascript
const band = await Band.findOne({ name: 'Motley Crue' }).populate('members.$*');

band.members.get('singer'); // { _id: ..., name: 'Vince Neil' }
```

You can also populate paths in maps of subdocuments using `$*`. For example, suppose you
have the below `librarySchema`:

```javascript
const librarySchema = new Schema({
  name: String,
  books: {
    type: Map,
    of: new Schema({
      title: String,
      author: {
        type: 'ObjectId',
        ref: 'Person'
      }
    })
  }
});
const Library = mongoose.model('Library', librarySchema);
```

You can `populate()` every book's author by populating `books.$*.author`:

```javascript
const libraries = await Library.find().populate('books.$*.author');
```

<h2 id="populate-middleware"><a href="#populate-middleware">Populate in Middleware</a></h2>

You can populate in either pre or post [hooks](http://mongoosejs.com/docs/middleware.html). If you want to
always populate a certain field, check out the [mongoose-autopopulate plugin](http://npmjs.com/package/mongoose-autopopulate).

```javascript
// Always attach `populate()` to `find()` calls
MySchema.pre('find', function() {
  this.populate('user');
});
```

```javascript
// Always `populate()` after `find()` calls. Useful if you want to selectively populate
// based on the docs found.
MySchema.post('find', async function(docs) {
  for (const doc of docs) {
    if (doc.isPublic) {
      await doc.populate('user');
    }
  }
});
```

```javascript
// `populate()` after saving. Useful for sending populated data back to the client in an
// update API endpoint
MySchema.post('save', function(doc, next) {
  doc.populate('user').then(function() {
    next();
  });
});
```

<h2 id="populating-multiple-paths-middleware"><a href="#populating-multiple-paths-middleware">Populating Multiple Paths in Middleware</a></h2>

Populating multiple paths in middleware can be helpful when you always want to populate some fields. But, the implementation is just a tiny bit trickier than what you may think. Here's how you may expect it to work:

```javascript
const userSchema = new Schema({
  email: String,
  password: String,
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

userSchema.pre('find', function(next) {
  this.populate('followers following');
  next();
});

const User = mongoose.model('User', userSchema);
```

However, this will not work. By default, passing multiple paths to `populate()` in the middleware will trigger an infinite recursion, which means that it will basically trigger the same middleware for all of the paths provided to the `populate()` method - For example, `this.populate('followers following')` will trigger the same middleware for both `followers` and `following` fields and the request will just be left hanging in an infinite loop.

To avoid this, we have to add the `_recursed` option, so that our middleware will avoid populating recursively. The example below will make it work as expected.

```javascript
userSchema.pre('find', function(next) {
  if (this.options._recursed) {
    return next();
  }
  this.populate({ path: 'followers following', options: { _recursed: true } });
  next();
});
```
Alternatively, you can check out the [mongoose-autopopulate plugin](http://npmjs.com/package/mongoose-autopopulate).

<h2 id="transform-populated-documents"><a href="#transform-populated-documents">Transform populated documents</a></h2>

You can manipulate populated documents using the `transform` option.
If you specify a `transform` function, Mongoose will call this function on every populated document in the result with two arguments: the populated document, and the original id used to populate the document.
This gives you more control over the result of the `populate()` execution.
It is especially useful when you're populating multiple documents.

The [original motivation](https://github.com/Automattic/mongoose/issues/3775) for the `transform` option was to give the ability to leave the unpopulated `_id` if no document was found, instead of setting the value to `null`:

```javascript
// With `transform`
doc = await Parent.findById(doc).populate([
  {
    path: 'child',
    // If `doc` is null, use the original id instead
    transform: (doc, id) => doc == null ? id : doc
  }
]);

doc.child; // 634d1a5744efe65ae09142f9
doc.children; // [ 634d1a67ac15090a0ca6c0ea, { _id: 634d1a4ddb804d17d95d1c7f, name: 'Luke', __v: 0 } ]
```

You can return any value from `transform()`.
For example, you can use `transform()` to "flatten" populated documents as follows.

```javascript
let doc = await Parent.create({ children: [{ name: 'Luke' }, { name: 'Leia' }] });

doc = await Parent.findById(doc).populate([{
  path: 'children',
  transform: doc => doc == null ? null : doc.name
}]);

doc.children; // ['Luke', 'Leia']
```

Another use case for `transform()` is setting `$locals` values on populated documents to pass parameters to getters and virtuals.
For example, suppose you want to set a language code on your document for internationalization purposes as follows.

```javascript
const internationalizedStringSchema = new Schema({
  en: String,
  es: String
});

const ingredientSchema = new Schema({
  // Instead of setting `name` to just a string, set `name` to a map
  // of language codes to strings.
  name: {
    type: internationalizedStringSchema,
    // When you access `name`, pull the document's locale
    get: function(value) {
      return value[this.$locals.language || 'en'];
    }
  }
});

const recipeSchema = new Schema({
  ingredients: [{ type: mongoose.ObjectId, ref: 'Ingredient' }]
});

const Ingredient = mongoose.model('Ingredient', ingredientSchema);
const Recipe = mongoose.model('Recipe', recipeSchema);
```

You can set the language code on all populated exercises as follows:

```javascript
// Create some sample data
const { _id } = await Ingredient.create({
  name: {
    en: 'Eggs',
    es: 'Huevos'
  }
});
await Recipe.create({ ingredients: [_id] });

// Populate with setting `$locals.language` for internationalization
const language = 'es';
const recipes = await Recipe.find().populate({
  path: 'ingredients',
  transform: function(doc) {
    doc.$locals.language = language;
    return doc;
  }
});

// Gets the ingredient's name in Spanish `name.es`
recipes[0].ingredients[0].name; // 'Huevos'
```
