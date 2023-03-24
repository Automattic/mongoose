'use strict';

const assert = require('assert');
const start = require('../common');

const mongoose = new start.mongoose.Mongoose();
const Schema = mongoose.Schema;

// This file is in `es-next` because it uses async/await for convenience

describe('getters/setters', function() {
  before(async function() {
    await mongoose.connect(start.uri);
  });

  beforeEach(function() {
    mongoose.deleteModel(/.*/);
  });

  after(async() => {
    await mongoose.disconnect();
  });

  describe('getters', function() {
    it('basic example', async function() {
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
      // acquit:ignore:start
      assert.equal(user.email, '**@gmail.com');
      assert.equal(user.toJSON().email, 'ab@gmail.com');

      user.email = 'test42@gmail.com';
      assert.equal(user.email, 'te****@gmail.com');
      // acquit:ignore:end
    });

    it('skip', function() {
      // acquit:ignore:start
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
      assert.equal(user.get('email', null, { getters: false }), 'ab@gmail.com');
      // acquit:ignore:end
      user.get('email', null, { getters: false }); // 'ab@gmail.com'
    });
  });

  describe('setters', function() {
    it('basic', function() {
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
      // acquit:ignore:start
      assert.equal(user.email, 'test@gmail.com');
      assert.equal(user.get('email', null, { getters: false }), 'test@gmail.com');
      // acquit:ignore:end

      user.set({ email: 'NEW@gmail.com' });
      user.email; // 'new@gmail.com'
      // acquit:ignore:start
      assert.equal(user.email, 'new@gmail.com');
      // acquit:ignore:end
    });

    it('updates', async function() {
      // acquit:ignore:start
      const userSchema = new Schema({
        email: {
          type: String,
          set: v => v.toLowerCase()
        }
      });

      const User = mongoose.model('User', userSchema);
      // acquit:ignore:end
      await User.updateOne({}, { email: 'TEST@gmail.com' }, { upsert: true });

      const doc = await User.findOne();
      doc.email; // 'test@gmail.com'
      // acquit:ignore:start
      assert.equal(doc.email, 'test@gmail.com');
      // acquit:ignore:end
    });

    it('update skip', async function() {
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
      // acquit:ignore:start
      assert.equal(doc.email, 'TEST@gmail.com');
      // acquit:ignore:end
    });

    it('vs ES6', function() {
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
      // acquit:ignore:start
      assert.strictEqual(user.email, undefined);
      // acquit:ignore:end
    });
  });
  describe('localization', function() {
    it('locale', async function() {
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
    });
  });
});
