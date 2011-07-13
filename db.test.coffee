mongoose = require 'mongoose'
step = require 'step'

step(
  ->
    console.log "Trying basic validator"
    db = mongoose.createConnection 'mongodb://localhost/blog'
    next = @

    FooSchema = new mongoose.Schema
      bar: { type: String, required: true }

    mongoose.model 'Foo', FooSchema

    Foo = db.model 'Foo'

    foo = new Foo

    console.log "Saving foo"
    foo.save (err) ->
      console.log "Error:", err
      console.log "foo.errors:", foo.errors
      foo.set bar: 'baz'
      console.log "Saving foo again"
      foo.save (err) ->
        console.log "Error:", err
        console.log "Foo.errors:", foo.errors
        db.close()
        do next
    return
  ->
    console.log ""
    console.log "Trying custom validator"
    db = mongoose.createConnection 'mongodb://localhost/blog'
    next = @

    BarSchema = new mongoose.Schema
      baz: { type: String }

    BarSchema.pre 'validate', (next) ->
      console.log 'Doing custom validation'
      (@invalidate 'baz', 'bad') if (@get 'baz') is 'bad'
      next()

    mongoose.model 'Bar', BarSchema

    Bar = db.model 'Bar'

    bar = new Bar
    bar.set baz: 'bad'
    console.log "Saving bar"
    bar.save (err) ->
      console.log "Error:", err
      bar.set baz: 'good'
      bar.save (err) ->
        console.log "Error:", err
        db.close()
        do next
    return

  ->
    console.log ""
    console.log "Trying custom validator"
    db = mongoose.createConnection 'mongodb://localhost/blog'
    next = @
    executed = false

    validator = (v, fn) ->
      setTimeout (->
        executed = true
        fn (v isnt '')
      ), 50
      return

    Subdocs = new mongoose.Schema
      required: { type: String, validate: [validator, 'async in subdocs'] }

    mongoose.model 'TestSubdocumentsAsyncValidation', new mongoose.Schema
      items: [Subdocs]

    Test = db.model 'TestSubdocumentsAsyncValidation'

    post = new Test()

    (post.get 'items').push required: ''

    console.log "Saving"
    post.save (err) ->
      console.log "Executed:", executed
      console.log "Error:", err
      executed = false
      console.log "Saving again"

      (post.get 'items')[0].set required: 'here'
      post.save (err) ->
        console.log "Executed:", executed
        console.log "Error:", err
        db.close()
        do next

    return
)
