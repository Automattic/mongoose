# Using GeoJSON

[GeoJSON](http://geojson.org/) is a format for storing geographic points and
polygons. [MongoDB has excellent support for geospatial queries](http://thecodebarbarian.com/80-20-guide-to-mongodb-geospatial-queries)
on GeoJSON objects. Let's take a look at how you can use Mongoose to store
and query GeoJSON objects.

<h2 id="points">Point Schema</h2>

The most simple structure in GeoJSON is a point. Below is an example point
representing the approximate location of [San Francisco](https://www.google.com/maps/@37.7,-122.5,9z).
Note that longitude comes first in a GeoJSON coordinate array, **not** latitude.

```
{
  "type" : "Point",
  "coordinates" : [
    -122.5,
    37.7
  ]
}
```

Below is an example of a Mongoose schema where `location` is a point.

```javascript
const citySchema = new mongoose.Schema({
  name: String,
  location: {
    type: {
      type: String, // Don't do `{ location: { type: String } }`
      enum: ['Point'], // 'location.type' must be 'Point'
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    }
  }
});
```

Using [subdocuments](subdocs.html), you can define a common `pointSchema` and reuse it everywhere you want to store a GeoJSON point.

```javascript
const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    required: true
  },
  coordinates: {
    type: [Number],
    required: true
  }
});

const citySchema = new mongoose.Schema({
  name: String,
  location: {
    type: pointSchema,
    required: true
  }
});
```

<h2 id="polygons">Polygon Schema</h2>

GeoJSON polygons let you define an arbitrary shape on a map. For example,
the below polygon is a GeoJSON rectangle that approximates the border
of the state of Colorado.

```
{
  "type": "Polygon",
  "coordinates": [[
    [-109, 41],
    [-102, 41],
    [-102, 37],
    [-109, 37],
    [-109, 41]
  ]]
}
```

Polygons are tricky because they use triple nested arrays. Below is
how you create a Mongoose schema where `coordinates` is a triple nested
array of numbers.

```javascript
const polygonSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Polygon'],
    required: true
  },
  coordinates: {
    type: [[[Number]]], // Array of arrays of arrays of numbers
    required: true
  }
});

const citySchema = new mongoose.Schema({
  name: String,
  location: polygonSchema
});
```

<h2 id="querying">Geospatial Queries with Mongoose</h2>

Mongoose queries support the same [geospatial query operators](http://thecodebarbarian.com/80-20-guide-to-mongodb-geospatial-queries)
that the MongoDB driver does. For example, the below script saves a
`city` document those `location` property is a GeoJSON point representing
the city of Denver, Colorado. It then queries for all documents within
a polygon representing the state of Colorado using
[the MongoDB `$geoWithin` operator](https://www.mongodb.com/docs/manual/reference/operator/query/geoWithin/).

<img src="https://i.imgur.com/i32pWnC.png">

```acquit
[require:geojson.*driver query]
```

Mongoose also has a [`within()` helper](api/query.html#query_Query-within)
that's a shorthand for `$geoWithin`.

```acquit
[require:geojson.*within helper]
```

<h2 id="geospatial-indexes">Geospatial Indexes</h2>

MongoDB supports [2dsphere indexes](https://www.mongodb.com/docs/manual/core/2dsphere/)
for speeding up geospatial queries. Here's how you can define
a 2dsphere index on a GeoJSON point:

```acquit
[require:geojson.*index$]
```

You can also define a geospatial index using the [`Schema#index()` function](api/schema.html#schema_Schema-index)
as shown below.

```javascript
citySchema.index({ location: '2dsphere' });
```

MongoDB's [`$near` query operator](https://www.mongodb.com/docs/manual/reference/operator/query/near/)
and [`$geoNear` aggregation stage](https://www.mongodb.com/docs/manual/reference/operator/aggregation/geoNear/#pipe._S_geoNear)
_require_ a 2dsphere index. 
