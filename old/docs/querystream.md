
QueryStreams
=================

_New in 2.4.0_

A QueryStream provides a ReadStream interface for [Queries](/docs/query.html). The Stream interface allows us to simply "plug-in" to other Node streams such as http responses and write streams so everything "just works" out of the box.

    Model.where('created').gte(twoWeeksAgo).stream().pipe(writeStream);

This api provides a more natural node-like api than than what is presently available with the [Query#each](/docs/query.html) method.

    var stream = Model.find().stream();

    stream.on('data', function (doc) {
      if (somethingHappened) {
        this.pause()

        var self = this
        return bakeSomePizza(function () {
          self.resume()
        })
      }

      res.write(doc)
    })

    stream.on('error', function (err) {
      // handle err
    })

    stream.on('close', function () {
      // all done
    })

QueryStreams can be `pause`d and `resume`d like you’d expect which allows us to stop streaming while waiting for other processes to complete for example.

QueryStreams also manage the underlying Cursors better than what we had in `Query#each` such that after the QueryStream has completed, whether due to an error, reaching the end of the cursor, or being manually destroyed, the internal Cursor is properly cleaned up.

# Events

## data

The `data` event emits a Mongoose Document as its only argument.

    stream.on('data', function (doc) { });

## error

Emitted if an error occurs while streaming documents. This event will fire *before* the `close` event.

## close

Emitted when the stream reaches the end of the cursor, or an error occurs, or the stream is manually `destroy`ed. After this event, no more events will be emitted.

# Properties

## QueryStream.readable

Boolean, tells us if the stream is readable or not. `true` by default, `false` after calling `destroy` or an error occurs or the stream is closed.

    var stream = Model.find().stream();
    stream.readable // true

## QueryStream.paused

Boolean, tells us if the stream is currently paused.

    var stream = Model.find().stream()
    stream.paused // false
    stream.pause()
    stream.paused // true

# Methods

## QueryStream#pause

Pauses the stream. `data` events will stop until `resume()` is
called.

    stream.pause();

## QuerySteam#resume

Resumes the QueryStream.

    stream.resume()

## QueryStream#destroy

Destroys the stream. No more events will be emitted after
calling this method.

    stream.destroy([err])

If the optional `err` argument is passed, an `error` event will be emitted with the `err` before `close` is emitted.

## QueryStream#pipe

`pipe`s the QueryStream into another WritableStream. This method is inherited from [Stream](http://nodejs.org/docs/latest/api/streams.html#stream.pipe).

    Model.find().stream().pipe(writeStream [, options]);

This could be particularily useful if you are, for example, setting up an API for a service and want to stream out the docs based on some criteria. We could first pipe the QueryStream into a sort of filter that formats the stream as an array before passing on the document to an http response.

    var format = new ArrayFormatter;
    Events.find().stream().pipe(format).pipe(res);

As long as `ArrayFormat` implements the WriteStream API we can stream large formatted result sets out to the client. See this [gist](https://gist.github.com/1403797) for a hacked example.

