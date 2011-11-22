var start = require('./common')
var db = start();
db.db.dropDatabase(function () {
  process.exit();
});
