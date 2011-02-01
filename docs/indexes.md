
Indexes
=======

Indexes are defined through `ensureIndex` every time a model is compiled for a
certain connection / database. This means that indexes will only be ensured
once during the lifetime of your app.

## Definition

Regular indexes:

    var User = new Schema({
        name: { type: String, index: true }
    })

Unique indexes:

    var User = new Schema({
        name: { type: String, unique: true }
    })

    // or 

    var User = new Schema({
        name: { type: String, index: { unique: true } }
    })

Compound indexes are defined on the `Schema`

    User.index({ first: 1, last: -1 })
