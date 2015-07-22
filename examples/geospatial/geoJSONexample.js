
// import async to make control flow simplier
var async = require('async');

// import the rest of the normal stuff
var mongoose = require('../../lib');

require('./geoJSONSchema.js')();

var Location = mongoose.model('Location');

// define some dummy data
// note: the type can be Point, LineString, or Polygon
var data = [
  { loc: { type: 'Point', coordinates: [-20.0, 5.0] }},
  { loc: { type: 'Point', coordinates: [6.0, 10.0] }},
  { loc: { type: 'Point', coordinates: [34.0, -50.0] }},
  { loc: { type: 'Point', coordinates: [-100.0, 70.0] }},
  { loc: { type: 'Point', coordinates: [38.0, 38.0] }}
];


mongoose.connect('mongodb://localhost/locations', function (err) {
  if (err) throw err;
  
  Location.on('index', function(err) {
    if (err) throw err;
    // create all of the dummy locations
    async.each(data, function (item, cb) {
      Location.create(item, cb);
    }, function (err) {
      if (err) throw err;
      // create the location we want to search for
      var coords = { type : 'Point', coordinates : [-5, 5] };
      // search for it
      Location.find({ loc : { $near : coords }}).limit(1).exec(function(err, res) {
        if (err) throw err;
        console.log("Closest to %s is %s", JSON.stringify(coords), res);
        cleanup();
      });
    });
  });
});

function cleanup() {
  Location.remove(function() {
    mongoose.disconnect();
  });
}
