
Middleware
==========

Middleware are defined at the Schema level and are applied when the methods
`init` (when a document is initialized with data from MongoDB), `save`, and
`remove` are called on a document instance.

There's two types of middleware, determined by the signature of the function
you define (ie: the parameters your function accepts):

- Serial
  Serial middleware are defined like:

        schema.pre(methodName, function (next) {
          // ...
        })

  They're executed one after the other, when each middleware calls `next`.

- Parallel
  Parallel middleware offer more fine-grained flow control, and are defined
  like

        schema.pre(methodName, function (next, done) {
          // ...
        })

  Parallel middleware can `next()` immediately, but the final argument will be
  called when all the parallel middleware have called `done()`.

## Use cases

Middleware are useful for:

- Complex validation
- Removing dependent documents when a certain document is removed (eg:
removing a user removes all his blogposts)
- Asynchronous defaults
- Asynchronous tasks that a certain action triggers. For example:
  - Triggering custom events
  - Creating notifications
  - Emails

and many other things. They're specially useful for atomizing model logic
and avoiding nested blocks of async code.

## Error handling

If any middleware calls `next` or `done` with an `Error` instance, the flow is
interrupted, and the error is passed to the function passed as an argument.

For example:

    schema.pre('save', function (next) {
        // something goes wrong
        next(new Error('something went wrong'));
    });

    // later...

    myModel.save(function (err) {
      // err can come from a middleware
    });
