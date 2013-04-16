
var Schema = require('mongoose').Schema;
var mySchema = Schema({ name: String });

// db is global
module.exports = db.model('MyModel', mySchema);
