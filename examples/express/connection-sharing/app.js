
'use strict';
const express = require('express');
const mongoose = require('../../../lib');

const uri = 'mongodb://localhost/mongoose-shared-connection';
global.db = mongoose.createConnection(uri);

const routes = require('./routes');

const app = express();
app.get('/', routes.home);
app.get('/insert', routes.insert);
app.get('/name', routes.modelName);

app.listen(8000, function() {
  console.log('listening on http://localhost:8000');
});
