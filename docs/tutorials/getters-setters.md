# Getters/Setters in Mongoose

Mongoose getters and setters allow you to execute custom logic when getting or setting a property on a [Mongoose document](../documents.html). Getters let you transform data in MongoDB into a more user friendly form, and setters let you transform user data before it gets to MongoDB.

## Getters

Suppose you have a `User` collection and you want to obfuscate user emails to protect your users' privacy. Below is a basic `userSchema` that obfuscates the user's email address.

```javascript acquit:getters/setters.*getters.*basic example
const userSchema = new Schema({
  email: {
    type: String,
    get: obfuscate
  }
});

// Mongoose passes the raw value in MongoDB `email` to the getter
function obfuscate(email) {
  const separatorIndex = email.indexOf('@');
  if (separatorIndex < 3) {
    // 'ab@gmail.com' -> '**@gmail.com'
    return email.slice(0, separatorIndex).replace(/./g, '*') +
      email.slice(separatorIndex);
  }
  // 'test42@gmail.com' -> 'te****@gmail.com'
  return email.slice(0, 2) +
    email.slice(2, separatorIndex).replace(/./g, '*') +
    email.slice(separatorIndex);
}

const User = mongoose.model('User', userSchema);
const user = new User({ email: 'ab@gmail.com' });
user.email; // **@gmail.com
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

```javascript acquit:getters/setters.*getters.*skip
user.get('email', null, { getters: false }); // 'ab@gmail.com'
```

## Setters

Suppose you want to make sure all user emails in your database are lowercased to
make it easy to search without worrying about case. Below is an example
`userSchema` that ensures emails are lowercased.

```javascript acquit:getters/setters.*setters.*basic
const userSchema = new Schema({
  email: {
    type: String,
    set: v => v.toLowerCase()
  }
});

const User = mongoose.model('User', userSchema);

const user = new User({ email: 'TEST@gmail.com' });
user.email; // 'test@gmail.com'

// The raw value of `email` is lowercased
user.get('email', null, { getters: false }); // 'test@gmail.com'

user.set({ email: 'NEW@gmail.com' });
user.email; // 'new@gmail.com'
```

Mongoose also runs setters on update operations, like [`updateOne()`](../api/query.html#query_Query-updateOne). Mongoose will
[upsert a document](https://masteringjs.io/tutorials/mongoose/upsert) with a
lowercased `email` in the below example.

```javascript acquit:getters/setters.*setters.*updates
await User.updateOne({}, { email: 'TEST@gmail.com' }, { upsert: true });

const doc = await User.findOne();
doc.email; // 'test@gmail.com'
```

In a setter function, `this` can be either the document being set or the query
being run. If you don't want your setter to run when you call `updateOne()`,
you add an if statement that checks if `this` is a Mongoose document as shown
below.

```javascript acquit:getters/setters.*setters.*update skip
const userSchema = new Schema({
  email: {
    type: String,
    set: toLower
  }
});

function toLower(email) {
  // Don't transform `email` if using `updateOne()` or `updateMany()`
  if (!(this instanceof mongoose.Document)) {
    return email;
  }
  return email.toLowerCase();
}

const User = mongoose.model('User', userSchema);
await User.updateOne({}, { email: 'TEST@gmail.com' }, { upsert: true });

const doc = await User.findOne();
doc.email; // 'TEST@gmail.com'
```

## Passing Parameters using `$locals`

You can't pass parameters to your getter and setter functions like you do to normal function calls.
To configure or pass additional properties to your getters and setters, you can use the document's `$locals` property.

The `$locals` property is the preferred place to store any program-defined data on your document without conflicting with schema-defined properties.
In your getter and setter functions, `this` is the document being accessed, so you set properties on `$locals` and then access those properties in your getters examples.
For example, the following shows how you can use `$locals` to configure the language for a custom getter that returns a string in different languages.

```javascript acquit:getters/setters.*localization.*locale
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
assert.equal(recipes[0].ingredients[0].name, 'Huevos'); // 'Huevos'
```

## Differences vs ES6 Getters/Setters

Mongoose setters are different from [ES6 setters](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/set) because they allow you to transform the value being set. With ES6 setters, you
would need to store an internal `_email` property to use a setter. With Mongoose,
you do **not** need to define an internal `_email` property or define a
corresponding getter for `email`.

```javascript acquit:getters/setters.*setters.*vs ES6
class User {
  // This won't convert the email to lowercase! That's because `email`
  // is just a setter, the actual `email` property doesn't store any data.
  // also eslint will warn about using "return" on a setter
  set email(v) {
    // eslint-disable-next-line no-setter-return
    return v.toLowerCase();
  }
}

const user = new User();
user.email = 'TEST@gmail.com';

user.email; // undefined
```
