
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

[Sparse](http://www.mongodb.org/display/DOCS/Indexes#Indexes-SparseIndexes) indexes:

    var User = new Schema({
        name: { type: String, sparse: true }
    })

Unique indexes:

    var User = new Schema({
        name: { type: String, unique: true }
    })

    // or

    var User = new Schema({
        name: { type: String, index: { unique: true } }
    })

Unique sparse indexes:

    var User = new Schema({
        name: { type: String, unique: true, sparse: true }
    })

[Geospatial](http://www.mongodb.org/display/DOCS/Geospatial+Indexing) indexes:

    var Point = new Schema({
        location: {type: Array, index: "2d"}
    })
    
Please note, that only the basic 2-dimensional array storage is supported for location data storage.

Compound indexes are defined on the `Schema` itself.

    User.index({ first: 1, last: -1 }, { unique: true })
