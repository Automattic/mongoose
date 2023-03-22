# Getters/Setters in Mongoose

Mongoose getters and setters allow you to execute custom logic when getting or setting a property on a [Mongoose document](../documents.html). Getters let you transform data in MongoDB into a more user friendly form, and setters let you transform user data before it gets to MongoDB.

## Getters

Suppose you have a `User` collection and you want to obfuscate user emails to protect your users' privacy. Below is a basic `userSchema` that obfuscates the user's email address.

```acquit
[require:getters/setters.*getters.*basic example]
```

Keep in mind that getters do **not** impact the underlying data stored in
MongoDB. If you save `user`, the `email` property will be 'ab@gmail.com' in
the database.

By default, Mongoose does **not** execute getters when converting a document to JSON, including [Express' `res.json()` function](http://expressjs.com/en/4x/api.html#res.json).

```javascript
app.get(function(req, res) {
  return User.findOne().
    // The `email` getter will NOT run here
    then(doc => res.json(doc)).
    catch(err => res.status(500).json({ message: err.message }));
});
```

To run getters when converting a document to JSON, set the [`toJSON.getters` option to `true` in your schema](../guide.html#toJSON) as shown below.

```javascript
const userSchema = new Schema({
  email: {
    type: String,
    get: obfuscate
  }
}, { toJSON: { getters: true } });

// Or, globally
mongoose.set('toJSON', { getters: true });

// Or, on a one-off basis
app.get(function(req, res) {
  return User.findOne().
    // The `email` getter will run here
    then(doc => res.json(doc.toJSON({ getters: true }))).
    catch(err => res.status(500).json({ message: err.message }));
});
```

To skip getters on a one-off basis, use [`user.get()` with the `getters` option set to `false`](../api/document.html#document_Document-get) as shown below.

```acquit
[require:getters/setters.*getters.*skip]
```

## Setters

Suppose you want to make sure all user emails in your database are lowercased to 
make it easy to search without worrying about case. Below is an example
`userSchema` that ensures emails are lowercased.

```acquit
[require:getters/setters.*setters.*basic]
```

Mongoose also runs setters on update operations, like [`updateOne()`](../api/query.html#query_Query-updateOne). Mongoose will
[upsert a document](https://masteringjs.io/tutorials/mongoose/upsert) with a
lowercased `email` in the below example.

```acquit
[require:getters/setters.*setters.*updates]
```

In a setter function, `this` can be either the document being set or the query
being run. If you don't want your setter to run when you call `updateOne()`,
you add an if statement that checks if `this` is a Mongoose document as shown
below.

```acquit
[require:getters/setters.*setters.*update skip]
```

## Passing Parameters using `$locals`

You can't pass parameters to your getter and setter functions like you do to normal function calls.
To configure or pass additional properties to your getters and setters, you can use the document's `$locals` property.

The `$locals` property is the preferred place to store any program-defined data on your document without conflicting with schema-defined properties.
In your getter and setter functions, `this` is the document being accessed, so you set properties on `$locals` and then access those properties in your getters examples.
For example, the following shows how you can use `$locals` to configure the language for a custom getter that returns a string in different languages.

```acquit
[require:getters/setters.*localization.*locale]
```

## Differences vs ES6 Getters/Setters

Mongoose setters are different from [ES6 setters](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/set) because they allow you to transform the value being set. With ES6 setters, you
would need to store an internal `_email` property to use a setter. With Mongoose,
you do **not** need to define an internal `_email` property or define a 
corresponding getter for `email`.

```acquit
[require:getters/setters.*setters.*vs ES6]
```
