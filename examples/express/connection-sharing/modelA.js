var Schema = require('../../../lib').Schema;
var mySchema = Schema({name: String});

/* global db */
module.exports = db.model('MyModel', mySchema);
