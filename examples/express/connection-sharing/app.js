'use strict';
const express = require('express');
const mongoose = require('../../../lib');

const uri = 'mongodb://127.0.0.1/mongoose-shared-connection';
global.db = mongoose.createConnection(uri);

const routes = require('./routes');

const app = express();
app.get('/', routes.home);
app.get('/insert', routes.insert);
app.get('/name', routes.modelName);

app.listen(8000, () => console.log('listening on http://127.0.0.1:8000'));
