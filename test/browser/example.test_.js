/**
 *  As of v3.9.3, Mongoose schema declarations are isomorphic, that is,
 *  you can use mongoose's browser component to validate objects against
 *  your mongoose schemas in the browser.
 *
 *  To include mongoose in your browser code, you can use
 *  `require('mongoose')` if you are using [Browserify](https://www.npmjs.com/package/browserify)
 *  or you can include mongoose in a `script` tag. The below example
 *  utilizes mongoose's Amazon [CloudFront](http://aws.amazon.com/cloudfront/)
 *  CDN.
 *
 *  If you are using webpack to bundle your client-side code, you need to add the following plugin to webpack's `plugins` array
 *  so that webpack does not attempt to resolve mongoose's server-side dependencies:
 *
 *  new webpack.DefinePlugin({
 *    'typeof window': '\"object\"'
 *  })
 *  ```
 *  <script type="text/javascript" src="//d1l4stvdmqmdzl.cloudfront.net/4.0.2/mongoose.js">
 *  </script>
 *  ```
 */
describe('Mongoose in the browser', function() {
  /**
   *  When you include the `mongoose.js` file in a script tag, mongoose will
   *  attach a `mongoose` object to the global `window`. This object includes
   *  a Schema constructor that you can use to define schemas much like
   *  in NodeJS.
   *
   *  Note: Mongoose's browser component requires an ECMAScript 5 compliant
   *  browser. In particular, it will *not* work in Internet Explorer 8
   *  or Safari 5.
   */
  describe('Declaring schemas in the browser', function() {
    it('allows you to use mongoose types', function() {
      var foodSchema = new mongoose.Schema({name: String});
      var breakfastSchema = new mongoose.Schema({
        foods: [foodSchema],
        date: {type: Date, default: Date.now}
      });

      assert.ok(foodSchema.path('name') instanceof mongoose.Schema.Types.String);
      assert.ok(breakfastSchema.path('foods') instanceof mongoose.Schema.Types.DocumentArray);
      assert.ok(breakfastSchema.path('date') instanceof mongoose.Schema.Types.Date);
    });
  });

  /**
   *  The primary goal of mongoose's browser component is to validate documents
   *  against a given schema. Because the mongoose browser component doesn't
   *  currently support any sort of querying, you're responsible for creating
   *  your own documents.
   */
  describe('Validating documents in the browser', function() {
    it('allows you to create a schema and use it to validate documents', function(done) {
      var schema = new mongoose.Schema({
        name: {type: String, required: true},
        quest: {type: String, match: /Holy Grail/i, required: true},
        favoriteColor: {type: String, enum: ['Red', 'Blue'], required: true}
      });

      /* `mongoose.Document` is different in the browser than in NodeJS.
       * the constructor takes an initial state and a schema. You can
       * then modify the document and call `validate()` to make sure it
       * passes validation rules. */
      var doc = new mongoose.Document({}, schema);
      doc.validate(function(error) {
        assert.ok(error);
        assert.equal('Path `name` is required.', error.errors['name'].message);
        assert.equal('Path `quest` is required.', error.errors['quest'].message);
        assert.equal('Path `favoriteColor` is required.',
          error.errors['favoriteColor'].message);

        doc.name = 'Sir Lancelot of Camelot';
        doc.quest = 'To seek the holy grail';
        doc.favoriteColor = 'Blue';
        doc.validate(function(error) {
          assert.ifError(error);

          doc.name = 'Sir Galahad of Camelot';
          doc.quest = 'I seek the grail'; // Invalid, must contain 'holy grail'
          doc.favoriteColor = 'Yellow'; // Invalid, not 'Red' or 'Blue'
          doc.validate(function(error) {
            assert.ok(error);
            assert.ok(!error.errors['name']);
            assert.equal('Path `quest` is invalid (I seek the grail).',
              error.errors['quest'].message);
            assert.equal('`Yellow` is not a valid enum value for path `favoriteColor`.',
              error.errors['favoriteColor'].message);
            done();
          });
        });
      });
    });
  });
});
