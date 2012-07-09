Middleware
==========

Middleware are defined at the Schema level and are applied on the following methods:

- `init` (when a document is initialized with data from MongoDB),
- `validate` (automatically called by default pre-save middleware)
- `save`
- `remove`

There are two types of middleware: `pre` middleware (executed before an action), and `post` middleware.

`validate` is by default called by a built-in `pre` handler on `save`, so pre
and post middleware attached to it will run before any user-defined pre-save middleware.

There are two types of `pre` middleware: serial and parallel.

Serial middleware are defined like:

    schema.pre('save', function (next) {
      // ...
    });

They're executed one after the other, when each middleware calls `next`.

Parallel middleware offer more fine-grained flow control, and are defined
like

    schema.pre('remove', true, function (next, done) {
      // ...
    });

Parallel middleware can `next()` immediately, but the final argument will be
called when all the parallel middleware have called `done()`.

## Post middleware

Post middleware operates in a similar fashion to pre middleware, but does not support
the parallel option at this time.

Post middleware is defined like:

    schema.post('save', function(next) {
        // ...
    });

Post middleware will intercept the callback of the function you attach it to.  This
means that the flow proceeds as follows:

- Pre handlers
- `save`, `init`, `validate`, or `remove`
- Post handlers
- Callback

For example, an asynchronous virtual can be defined as follows:

    UserSchema.post('init', function(next){
        var user = this;
        Comment.findOne({user_id: user._id}, function(err, comment){
            if(err) next(err);
            user.set('comment', comment); // This will be sent down the pipe
            next();
        });
    });


## Use cases

Middleware are useful for:

- Complex validation
- Removing dependent documents when a certain document is removed (eg:
removing a user removes all his blogposts)
- Asynchronous defaults
- Asynchronous virtuals
- Asynchronous tasks that a certain action triggers. For example:
  - Triggering custom events
  - Creating notifications
  - Emails

and many other things. They're specially useful for atomizing model logic
and avoiding nested blocks of async code.

## Error handling

If any middleware calls `next` or `done` with an `Error` instance, the flow is
interrupted, and the error is passed to the callback.

For example:

    schema.pre('save', function (next) {
        // something goes wrong
        next(new Error('something went wrong'));
    });

    // later...

    myModel.save(function (err) {
      // err can come from a middleware
    });