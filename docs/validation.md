
Validation in models
====================

Before we get into the specifics of validation syntax, please keep the
following rules in mind:

- Validation is defined in the `Schema`

- Validation occurs when a document attempts to be saved, after defaults have
been applied.

- Mongoose doesn't care about complex error message construction. Errors have
type identifiers. For example, `"min"` is the identifier for the error
triggered when a number doesn't meet the minimum value. The path and value
that triggered the error can be accessed in the `ValidationError` object.

- Validation is an internal piece of middleware

- Validation is asynchronously recursive: when you call `Model#save`, embedded
  documents validation is executed. If an error happens, your `Model#save`
  callback receives it.

## Simple validation

Simple validation is declared by passing a function to `validate` and an error
type to your `SchemaType` \(please read the chapter on [model definition](/docs/model-definition.html) to learn
more about schemas).

    function validator (v) {
      return v.length > 5;
    };

    new Schema({
        name: { type: String, validate: [validator, 'my error type'] }
    })

If you find this syntax too clumsy, you can also define the type

    var schema = new Schema({
        name: String
    })

and then your validator

    schema.path('name').validate(function (v) {
      return v.length > 5;
    }, 'my error type'); 

## Regular expressions

If you want to test a certain value against a regular expression:

    var schema = new Schema({
        name: { type: String, validate: /[a-z]/ }
    });

## Asynchronous validation

If you define a validator function with two parameters, like:

    schema.path('name').validate(function (v, fn) {
      // my logic
    }, 'my error type'); 

Then the function `fn` has to be called with `true` or `false`, depending on
whether the validator passed. This allows for calling other models and querying
data asynchronously from your validator.

## Built in validators

Strings:

  - `enum`: takes a list of allowed values. Example:

        var Post = new Schema({
            type: { type: String, enum: ['page', 'post', 'link'] }
        })

Numbers:

  - `min`: minimum value

        var Person = new Schema({
            age: { type: Number, min: 5 }
        })

  - `max`: maxmimum value

        var Person = new Schema({
            age: { type: Number, max: 100 }
        })
