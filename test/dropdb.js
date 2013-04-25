var start = require('./common')
var db = start();
db.once('open', function () {
  db.db.dropDatabase(process.exit);
});
