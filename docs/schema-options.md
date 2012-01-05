
Schema options
==============

The schema constructor takes a second options argument. There are currently two available options:

1. safe
2. strict

### safe

This option is passed to mongodb with all operations and let's us specify if errors should be returned to our callbacks as well as tune write behavior.

    var safe = true;
    new Schema({ .. }, { safe: safe })

By default this is set to `true` for all schemas which guarentees that any error that occurs will get reported back to our method callback.

By setting `safe` to something else like `{ j: 1, w: 2, wtimeout: 10000 }` we can guarantee the write was committed to the journal _(j: 1)_, at least 2 replicas _(w: 2)_, and that the write will timeout if it takes longer than 10 seconds _(wtimeout: 10000)_. Errors will still be reported back to our callback.

There are other options like `{ w: "majority" }` too. See the [MongoDB docs](http://www.mongodb.org/display/DOCS/Verifying+Propagation+of+Writes+with+getLastError) for more detail.

    var safe = { w: "majority", wtimeout: 10000 };
    new Schema({ .. }, { safe: safe })

### strict

The strict option makes it possible to ensure that values added to our model instance that were not specified in our schema do not get saved to the db.

    var thing = new Thing({ iAmNotInTheSchema: true });
    thing.save() // iAmNotInTheSchema was saved to the db @#$%^!!

By default this is `false` for backward compatibility. Set it to true and sleep peacefully.

    new Schema({ .. }, { strict: true })

This value can also be overridden at the model instance level by passing a second boolean argument:

    var Thing = db.model('Thing');
    var thing = new Thing(doc, true);  // enables strict mode
    var thing = new Thing(doc, false); // disables strict mode
