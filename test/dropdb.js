var start = require('./common')
var db = start();
db.on('open', function () {
  db.db.dropDatabase(function () {
    process.exit();
  });
});
