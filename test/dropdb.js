var start = require('./common')
var db = start();
db.once('open', function () {
  db.db.dropDatabase(function () {

    var mongos = process.env.MONGOOSE_MULTI_MONGOS_TEST_URI;
    if (!mongos) return process.exit();

    var db = start({ uri: mongos, mongos: true });
    db.once('open', function () {
      db.db.dropDatabase(process.exit);
    })
  });
});
