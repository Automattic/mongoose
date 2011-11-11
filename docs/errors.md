
Error handling
==============

Errors returned after failed validation contain an `errors` object
holding the actual ValidatorErrors. Each ValidatorError has a `type` and `path` property
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

