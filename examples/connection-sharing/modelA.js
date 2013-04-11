
var mongoose = require('mongoose')
var Schema = mongoose.Schema;
var mySchema = Schema({ name: String });

module.exports = db.model('MyModel', mySchema);
