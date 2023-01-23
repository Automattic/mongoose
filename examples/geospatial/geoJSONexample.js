// import async to make control flow simplier
'use strict';

const async = require('async');

// import the rest of the normal stuff
const mongoose = require('../../lib');

require('./geoJSONSchema.js')();

const Location = mongoose.model('Location');

// define some dummy data
// note: the type can be Point, LineString, or Polygon
const data = [
  { loc: { type: 'Point', coordinates: [-20.0, 5.0] } },
  { loc: { type: 'Point', coordinates: [6.0, 10.0] } },
  { loc: { type: 'Point', coordinates: [34.0, -50.0] } },
  { loc: { type: 'Point', coordinates: [-100.0, 70.0] } },
  { loc: { type: 'Point', coordinates: [38.0, 38.0] } }
];


mongoose.connect('mongodb://127.0.0.1/locations', function(err) {
  if (err) {
    throw err;
  }

  Location.on('index', function(err) {
    if (err) {
      throw err;
    }
    // create all of the dummy locations
    async.each(data, function(item, cb) {
      Location.create(item, cb);
    }, function(err) {
      if (err) {
        throw err;
      }
      // create the location we want to search for
      const coords = { type: 'Point', coordinates: [-5, 5] };
      // search for it
      Location.find({ loc: { $near: coords } }).limit(1).exec(function(err, res) {
        if (err) {
          throw err;
        }
        console.log('Closest to %s is %s', JSON.stringify(coords), res);
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
