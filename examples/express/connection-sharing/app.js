
var express = require('express')
var mongoose = require('../../../lib')

var uri = 'mongodb://localhost/mongoose-shared-connection';
global.db = mongoose.createConnection(uri);

var routes = require('./routes')

var app = express();
app.get('/', routes.home);
app.get('/insert', routes.insert);
app.get('/name', routes.modelName);

app.listen(8000, function () {
  console.log('listening on http://localhost:8000');
})

