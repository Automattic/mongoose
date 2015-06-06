/*!
 * Module dependencies.
 */

var mongodb = require('mongodb');
var ReadPref = mongodb.ReadPreference;

/*!
 * Converts arguments to ReadPrefs the driver
 * can understand.
 *
 * @param {String|Array} pref
 * @param {Array} [tags]
 */

module.exports = function readPref (pref, tags) {
  if (Array.isArray(pref)) {
    tags = pref[1];
    pref = pref[0];
  }

  if (pref instanceof ReadPref) {
    return pref;
  }

  switch (pref) {
    case 'p':
      pref = 'primary';
      break;
    case 'pp':
      pref = 'primaryPreferred';
      break;
    case 's':
      pref = 'secondary';
      break;
    case 'sp':
      pref = 'secondaryPreferred';
      break;
    case 'n':
      pref = 'nearest';
      break;
  }

  return new ReadPref(pref, tags);
}
